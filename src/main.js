// ---------------------------------------------------------------------------
// Frontier Water Lab — main loop + UI + interaction.
// One global domain (240 m). Per frame:
//   boat/input -> splats -> solver (1 of 3) -> unified OUTPUT grid
//   -> foam grid advection -> GPU splash/foam particles -> water render.
// ---------------------------------------------------------------------------
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { WORLD, HALF, terrainHeight, gerstnerHeight, updateGerstner } from './config.js';
import { WaterSim } from './sim.js';
import { GPUParticles, MAX_PARTICLES } from './particles.js';
import { Boat } from './boat.js';
import { buildWorld } from './world.js';

// ---- renderer / scene / camera ----
const app = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 2200);
camera.position.set(62, 34, 78);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(-4, 0, 6);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.maxPolarAngle = 1.49;
controls.minDistance = 7;
controls.maxDistance = 320;

// ---- world, sim, particles, boat ----
const world = buildWorld(scene);
let envPreset = world.setEnvironment('midday');

const sim = new WaterSim(renderer, { terrainTex: world.terrainTex, noiseTex: world.noiseTex, res: 256 });
renderer.setClearColor(0x0a1a28, 1);
const particles = new GPUParticles(renderer, { noiseTex: world.noiseTex, terrainTex: world.terrainTex });
particles.addTo(scene);
const boat = new Boat(scene);
boat.blob.renderOrder = 6;

// boulder prop
const boulder = new THREE.Mesh(
  new THREE.DodecahedronGeometry(1.15, 0),
  new THREE.MeshStandardMaterial({ color: 0x777d84, roughness: 0.9, flatShading: true }),
);
boulder.castShadow = true;
boulder.visible = false;
scene.add(boulder);
const boulderState = { active: false, vel: 0, x: 0, z: 0, spin: 1 };

// ---- parameters (bound to the UI) ----
const params = {
  mode: 0,
  persistence: 0.62, timeScale: 1,
  ripples: true, waves: true, foamGrid: true, foam3d: true, splash: true,
  particles: true, shoreFoam: true, wake: true, caustics: true,
  rain: false, demoDrops: true, rockSplash: true, simReadback: true, vignette: true,
  waveHeight: 0.55, swell: 1.25, chop: 0.65, windSpeed: 6, windDir: 35,
  detail: 0.55, clarity: 0.55,
  foamAmount: 1, foamPersist: 0.6, splashStrength: 1, dropletSize: 0.16, fleckSize: 0.85,
  exposure: 1,
  brush: false, followCam: false, autoOrbit: false,
  debug: 0,
};
const SOLVERS = [
  {
    name: 'Wave Equation', chip: 'Solver 1 · Wave Equation (2.5D)',
    desc: '<b>Heightfield wave equation</b> — the Fluid-Ninja style 2.5D solver. Ripples from every splat, the boat, rain and boulders propagate & interfere across the whole grid. Fastest and most “splashy”.',
  },
  {
    name: 'Shallow Water', chip: 'Solver 2 · Shallow Water Equations',
    desc: '<b>Shallow Water Equations</b> — solves water <i>depth + momentum</i> with continuity. Waves slosh, reflect off the beach, run up the shore and pile up in shallows. The most physical shoreline of the three.',
  },
  {
    name: 'Spectral Ocean', chip: 'Solver 3 · Spectral Ocean (AAA)',
    desc: '<b>Spectral ocean</b> — a 24-wave Phillips-like spectrum baked into the grid every frame, layered with the heightfield interaction ripples (the classic AAA FFT-stack recipe). Best open-ocean swell + crest foam.',
  },
];

// ---- helpers ----
const $ = (id) => document.getElementById(id);
const windDirVec = () => {
  const a = THREE.MathUtils.degToRad(params.windDir);
  return new THREE.Vector2(Math.cos(a), Math.sin(a));
};
function applyExposure() { renderer.toneMappingExposure = envPreset.exposure * params.exposure; }
applyExposure();

let simTime = 0;
function sampleSurface(x, z) {
  let h = 0;
  if (params.ripples) h += sim.sampleHeightCached(x, z);
  if (params.waves) {
    const take = params.mode === 2 ? 0.18 : 1;
    h += gerstnerHeight(x, z, simTime, params.waveHeight) * take;
  }
  return h;
}
const fx = {
  splat: (x, z, r, s) => sim.addSplat(x, z, r, s),
  burst: (x, z, s, r) => particles.burst(x, z, s, r),
};
function bigSplash(x, z, scale = 1) {
  const s = 0.5 * params.splashStrength * scale;
  sim.addSplat(x, z, 2.6 * scale, s);
  pending.push({ at: simTime + 0.16, fn: () => sim.addSplat(x, z, 3.6 * scale, -s * 0.45) });
  particles.burst(x, z, 2.6 * params.splashStrength * scale, 1.8 * scale);
}
const pending = [];   // timed events {at, fn}

// ---- UI binding ----
const rangeEls = [...document.querySelectorAll('[data-bind]')];
const toggleEls = [...document.querySelectorAll('[data-toggle]')];
function fmtRange(el, v) {
  const out = el.closest('.ctl')?.querySelector('output');
  if (!out) return;
  const step = parseFloat(el.step || '1');
  const dec = step >= 1 ? 0 : (String(step).split('.')[1] || '').length;
  out.textContent = Number(v).toFixed(dec);
}
function refreshBindings() {
  for (const el of rangeEls) { el.value = params[el.dataset.bind]; fmtRange(el, params[el.dataset.bind]); }
  for (const el of toggleEls) el.checked = !!params[el.dataset.toggle];
  onToggleSideEffects();
}
for (const el of rangeEls) {
  el.addEventListener('input', () => {
    params[el.dataset.bind] = parseFloat(el.value);
    fmtRange(el, el.value);
    if (el.dataset.bind === 'windDir' || el.dataset.bind === 'windSpeed') updateGerstner(params.windDir, params.windSpeed);
    if (el.dataset.bind === 'exposure') applyExposure();
    if (el.dataset.bind === 'dropletSize' || el.dataset.bind === 'fleckSize') particles.setSizes(params.dropletSize, params.fleckSize);
  });
  fmtRange(el, el.value);
}
function onToggleSideEffects() {
  controls.enabled = !params.brush;
  controls.autoRotate = params.autoOrbit && !params.followCam;
  controls.autoRotateSpeed = 0.55;
  $('vignette').classList.toggle('off', !params.vignette);
}
for (const el of toggleEls) {
  el.addEventListener('change', () => { params[el.dataset.toggle] = el.checked; onToggleSideEffects(); });
}
function setToggle(key, val) {
  params[key] = val;
  const el = toggleEls.find((e) => e.dataset.toggle === key);
  if (el) el.checked = val;
  onToggleSideEffects();
}

function setMode(m, silentSplash = false) {
  params.mode = m;
  sim.setMode(m);
  document.querySelectorAll('#solverSeg button').forEach((b) => b.classList.toggle('active', +b.dataset.mode === m));
  $('simDesc').innerHTML = SOLVERS[m].desc;
  $('modeChip').textContent = SOLVERS[m].chip;
  if (!silentSplash) bigSplash(boat.pos.x + 6, boat.pos.z - 4, 0.9);
}
document.querySelectorAll('#solverSeg button').forEach((b) =>
  b.addEventListener('click', () => setMode(+b.dataset.mode)));

$('simRes').addEventListener('change', (e) => {
  sim.setResolution(parseInt(e.target.value, 10));
  $('simResOut').textContent = `${e.target.value}² (global)`;
});
$('particleCount').addEventListener('change', (e) => {
  const n = parseInt(e.target.value, 10);
  particles.setCounts(n, n);
  $('particleChip').textContent = `GPU particles ${(n / 1024).toFixed(0)}k + ${(n / 1024).toFixed(0)}k`;
});
$('debugView').addEventListener('change', (e) => { params.debug = parseInt(e.target.value, 10); });

function setEnv(name) {
  envPreset = world.setEnvironment(name);
  applyExposure();
  document.querySelectorAll('#envRow button').forEach((b) => b.classList.toggle('active', b.dataset.env === name));
}
document.querySelectorAll('#envRow button').forEach((b) => b.addEventListener('click', () => setEnv(b.dataset.env)));

$('panelToggle').addEventListener('click', () => $('panel').classList.toggle('hidden'));
if (innerWidth < 760) $('panel').classList.add('hidden');

// actions
$('btnBigSplash').addEventListener('click', () => bigSplash(boat.pos.x + 5, boat.pos.z + 3, 1.4));
$('btnResetWater').addEventListener('click', () => sim.reset());
$('btnResetBoat').addEventListener('click', () => boat.reset());
$('btnBoulder').addEventListener('click', dropBoulder);
$('btnTsunami').addEventListener('click', startTsunami);
$('btnCalm').addEventListener('click', () => {
  Object.assign(params, { waveHeight: 0.32, swell: 0.8, windSpeed: 3.5, rain: false, chop: 0.5 });
  setEnv('golden'); updateGerstner(params.windDir, params.windSpeed); refreshBindings();
});
$('btnStorm').addEventListener('click', () => {
  Object.assign(params, { waveHeight: 1.35, swell: 2.3, windSpeed: 13, rain: true, chop: 1.1, foamAmount: 1.25 });
  setEnv('storm'); updateGerstner(params.windDir, params.windSpeed); refreshBindings();
  if (params.mode !== 2) setMode(2, true);
});

function dropBoulder() {
  // drop it near the boat / camera focus, in open water
  let x = boat.pos.x + 9, z = boat.pos.z - 7;
  if (terrainHeight(x, z) > -1.2) { x = boat.pos.x - 10; z = boat.pos.z + 9; }
  Object.assign(boulderState, { active: true, vel: 3, x, z, spin: (Math.random() - 0.5) * 3 });
  boulder.position.set(x, 21, z);
  boulder.visible = true;
}
let tsunami = null;
function startTsunami() { tsunami = { t: 0 }; }

// ---- input: keyboard ----
const keys = {};
addEventListener('keydown', (e) => {
  if (e.repeat) { keys[e.code] = true; return; }
  keys[e.code] = true;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  if (e.code === 'Digit1') setMode(0);
  if (e.code === 'Digit2') setMode(1);
  if (e.code === 'Digit3') setMode(2);
  if (e.code === 'KeyF') setToggle('foamGrid', !params.foamGrid);
  if (e.code === 'KeyP') setToggle('particles', !params.particles);
  if (e.code === 'KeyR') setToggle('rain', !params.rain);
  if (e.code === 'KeyC') setToggle('followCam', !params.followCam);
  if (e.code === 'KeyB') setToggle('brush', !params.brush);
  if (e.code === 'KeyX') bigSplash(boat.pos.x + 5, boat.pos.z + 3, 1.4);
  if (e.code === 'KeyG') dropBoulder();
  if (e.code === 'KeyT') startTsunami();
});
addEventListener('keyup', (e) => { keys[e.code] = false; });

// ---- input: pointer splashes ----
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
let pointerDown = false, lastDownAt = 0, lastDownXY = [0, 0], lastBrushAt = 0;
function pointerWaterPoint(e) {
  const rect = renderer.domElement.getBoundingClientRect();
  ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -(((e.clientY - rect.top) / rect.height) * 2 - 1));
  raycaster.setFromCamera(ndc, camera);
  const o = raycaster.ray.origin, d = raycaster.ray.direction;
  if (d.y > -0.001) return null;
  const t = -o.y / d.y;
  if (t < 0) return null;
  return [o.x + d.x * t, o.z + d.z * t];
}
function brushSplash(e, strength) {
  const p = pointerWaterPoint(e);
  if (!p) return;
  const [x, z] = p;
  if (Math.abs(x) > HALF - 3 || Math.abs(z) > HALF - 3) return;
  if (terrainHeight(x, z) > 0.9) return;
  sim.addSplat(x, z, 2.0, 0.16 * params.splashStrength * strength);
  if (performance.now() - lastBrushAt > 90) {
    lastBrushAt = performance.now();
    particles.burst(x, z, 0.9 * params.splashStrength * strength, 1.1);
  }
}
renderer.domElement.addEventListener('pointerdown', (e) => {
  pointerDown = true;
  const now = performance.now();
  const dbl = now - lastDownAt < 330 && Math.hypot(e.clientX - lastDownXY[0], e.clientY - lastDownXY[1]) < 14;
  lastDownAt = now; lastDownXY = [e.clientX, e.clientY];
  if (params.brush || e.shiftKey) brushSplash(e, 1.4);
  else if (dbl) {
    const p = pointerWaterPoint(e);
    if (p && terrainHeight(p[0], p[1]) < 0.9) bigSplash(p[0], p[1], 1.25);
  }
});
renderer.domElement.addEventListener('pointermove', (e) => {
  if (pointerDown && (params.brush || e.shiftKey)) brushSplash(e, 1);
});
addEventListener('pointerup', () => { pointerDown = false; });

// ---- resize ----
function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  particles.setViewport(renderer.domElement.height, camera.fov);
}
addEventListener('resize', onResize);
onResize();

// opening moments so the first thing you see is alive
pending.push({ at: 0.5, fn: () => bigSplash(boat.pos.x - 7, boat.pos.z - 5, 1.2) });
pending.push({ at: 1.4, fn: () => bigSplash(8, 2, 1) });
updateGerstner(params.windDir, params.windSpeed);
particles.setSizes(params.dropletSize, params.fleckSize);
setMode(0, true);
refreshBindings();

// ---- ambient processes ----
let rainAcc = 0, demoAcc = 0;
const rockTimers = world.shoreRocks.map((r) => ({ ...r, next: 2 + Math.random() * 5 }));
function ambient(dt) {
  // process timed events
  for (let i = pending.length - 1; i >= 0; i--) {
    if (simTime >= pending[i].at) { pending[i].fn(); pending.splice(i, 1); }
  }
  const cx = controls.target.x, cz = controls.target.z;
  if (params.rain) {
    rainAcc += dt * 26;
    while (rainAcc > 1) {
      rainAcc -= 1;
      const x = cx + (Math.random() - 0.5) * 110, z = cz + (Math.random() - 0.5) * 110;
      if (Math.abs(x) < HALF - 4 && Math.abs(z) < HALF - 4 && terrainHeight(x, z) < 0.4) {
        sim.addSplat(x, z, 0.55, 0.06 * params.splashStrength);
        if (Math.random() < 0.16) particles.burst(x, z, 0.35, 0.5);
      }
    }
  } else if (params.demoDrops) {
    demoAcc += dt;
    if (demoAcc > 0.55) {
      demoAcc = 0;
      const x = cx + (Math.random() - 0.5) * 80, z = cz + (Math.random() - 0.5) * 80;
      if (Math.abs(x) < HALF - 4 && Math.abs(z) < HALF - 4 && terrainHeight(x, z) < 0.3) {
        sim.addSplat(x, z, 0.8, 0.09 * params.splashStrength);
        particles.burst(x, z, 0.45, 0.7);
      }
    }
  }
  // waves breaking on shoreline rocks
  if (params.rockSplash) {
    for (const r of rockTimers) {
      r.next -= dt;
      if (r.next <= 0) {
        r.next = 2.2 + Math.random() * 4.5;
        const energy = 0.25 + params.waveHeight * 0.6 + params.swell * 0.15;
        sim.addSplat(r.x, r.z, 1.5, 0.10 * energy);
        particles.burst(r.x, r.z, 0.8 * energy, 1.3);
      }
    }
  }
  // tsunami: a wall of splats marching in from the west edge
  if (tsunami) {
    tsunami.t += dt;
    const frontX = -HALF + 8 + tsunami.t * 22;
    for (let i = 0; i < 5; i++) {
      const z = -60 + i * 30 + Math.sin(simTime * 3 + i) * 4;
      sim.addSplat(frontX, z, 8.5, 0.34);
    }
    if (Math.random() < 0.5) particles.burst(frontX, (Math.random() - 0.5) * 90, 1.6, 3);
    if (tsunami.t > 2.6) tsunami = null;
  }
  // boulder physics
  if (boulderState.active) {
    boulderState.vel += 27 * dt;
    boulder.position.y -= boulderState.vel * dt;
    boulder.rotation.x += boulderState.spin * dt;
    boulder.rotation.z += boulderState.spin * 0.7 * dt;
    const surf = sampleSurface(boulderState.x, boulderState.z);
    if (boulder.position.y <= surf + 0.4) {
      bigSplash(boulderState.x, boulderState.z, 1.9);
      boulderState.active = false;
      pending.push({ at: simTime + 0.5, fn: () => { boulder.visible = false; } });
    }
  }
}

// ---- per-frame uniform sync ----
const wu = world.waterUniforms;
function syncWaterUniforms() {
  wu.uSim.value = sim.outputTexture;
  wu.uFoamTex.value = sim.foamTexture;
  wu.uTexel.value = 1 / sim.res;
  wu.uTexelW.value = WORLD / sim.res;
  wu.uSimBlend.value = params.ripples ? 1 : 0;
  wu.uMode.value = params.mode;
  wu.uWavesOn.value = params.waves ? 1 : 0;
  wu.uWaveAmp.value = params.waveHeight;
  wu.uChop.value = params.chop;
  wu.uFoamGridOn.value = params.foamGrid ? 1 : 0;
  wu.uFoamAmount.value = params.foamAmount;
  wu.uDetailStrength.value = params.detail;
  wu.uClarity.value = params.clarity;
  wu.uWindXZ.value.copy(windDirVec());
  wu.uDebug.value = params.debug;
  world.causticUniforms.uCausticsOn.value = params.caustics ? 1 : 0;
}

// ---- main loop ----
const clock = new THREE.Clock();
let frame = 0, fpsAcc = 0, fpsN = 0, fpsTimer = 0;
const followPos = new THREE.Vector3(), followTarget = new THREE.Vector3();

function animate() {
  requestAnimationFrame(animate);
  const rawDt = Math.min(clock.getDelta(), 0.05);
  const dt = rawDt * params.timeScale;
  simTime += dt;
  frame++;

  // boat input
  const input = {
    throttle: (keys.KeyW || keys.ArrowUp ? 1 : 0) + (keys.KeyS || keys.ArrowDown ? -0.6 : 0),
    steer: (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0),
    brake: !!keys.Space,
  };
  const boatInfo = boat.update(dt, input, sampleSurface, terrainHeight, fx, params.wake && params.ripples, simTime);
  particles.setBoat(boatInfo);

  ambient(rawDt);

  // run the fluid + foam grids
  const windVec = windDirVec().multiplyScalar(params.windSpeed);
  sim.update(rawDt, simTime, {
    damping: THREE.MathUtils.lerp(0.985, 0.9992, params.persistence),
    waveSpeed: 1.9,
    spectralAmp: params.swell,
    chop: params.chop,
    windDirRad: THREE.MathUtils.degToRad(params.windDir),
    windSpeed: params.windSpeed,
    windVector: windVec,
    foamGain: params.foamAmount,
    foamDecay: THREE.MathUtils.lerp(0.90, 0.994, params.foamPersist),
    shoreFoam: params.shoreFoam,
    runFoam: params.foamGrid,
    timeScale: params.timeScale,
  });
  if (params.simReadback && frame % 5 === 0) sim.refreshHeightCache();
  if (!params.simReadback) sim.cacheValid = false;

  syncWaterUniforms();

  particles.update(rawDt, {
    simTex: sim.outputTexture,
    foamTex: sim.foamTexture,
    time: simTime,
    windVector: windVec,
    waveAmp: params.waveHeight,
    wavesOn: params.waves,
    mode: params.mode,
    splashOn: params.particles && params.splash,
    foamOn: params.particles && params.foam3d && params.foamGrid,
    spawnRate: THREE.MathUtils.clamp(0.22 + params.splashStrength * 0.3, 0, 1),
    sunColor: world.env.uSunColor.value,
    night: world.env.uNight.value,
  });

  world.update(rawDt, simTime, sampleSurface);

  // follow camera
  if (params.followCam) {
    const fwd = boat.forward;
    followPos.set(boat.pos.x - fwd.x * 14, boat.pos.y + 6.5, boat.pos.z - fwd.y * 14);
    camera.position.lerp(followPos, 1 - Math.exp(-rawDt * 2.2));
    followTarget.set(boat.pos.x + fwd.x * 6, boat.pos.y + 1, boat.pos.z + fwd.y * 6);
    controls.target.lerp(followTarget, 1 - Math.exp(-rawDt * 3.5));
  }
  controls.update();
  renderer.render(scene, camera);

  // fps chip
  fpsAcc += rawDt; fpsN++; fpsTimer += rawDt;
  if (fpsTimer > 0.6) {
    $('fpsChip').textContent = `${Math.round(fpsN / Math.max(fpsAcc, 1e-4))} fps · grid ${sim.res}²`;
    fpsAcc = 0; fpsN = 0; fpsTimer = 0;
  }
}
animate();

// debug / automation hooks (handy in devtools)
window.__frontier = { scene, camera, controls, renderer, sim, particles, boat, world, params, setMode, setEnv, bigSplash, dropBoulder, startTsunami };

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GPU } from './core/gpu.js';
import { Terrain } from './world/terrain.js';
import { SkySystem } from './world/sky.js';
import { Waves } from './water/waves.js';
import { OceanFFT } from './water/fft.js';
import { createFoamTexture } from './water/foamTexture.js';
import { RippleSim } from './water/ripples.js';
import { WaterSurface } from './water/surface.js';
import { ParticleSystem, SIM_MODES } from './fluid/particles.js';
import { FluidRenderer } from './fluid/fluidRenderer.js';
import { Boat } from './boat/boat.js';
import { Effects } from './fx/effects.js';
import { Pipeline } from './render/pipeline.js';
import { buildGUI } from './ui/gui.js';

function fail(msg) {
  const el = document.getElementById('error');
  el.style.display = 'block';
  el.innerHTML = msg;
  document.getElementById('loading').style.display = 'none';
}

async function start() {
  const canvas = document.getElementById('view');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', alpha: false, stencil: false });
  } catch (e) {
    fail('<b>WebGL2 is required.</b><br>Your browser/GPU could not create a WebGL2 context.<br><br>' + e.message);
    return;
  }
  renderer.autoClear = false;
  renderer.toneMapping = THREE.NoToneMapping;
  const gpu = new GPU(renderer);
  if (!gpu.colorBufferFloat) {
    fail('<b>EXT_color_buffer_float is not available.</b><br>The GPU simulation needs floating point render targets (any desktop GPU from the last decade).');
    return;
  }

  // Let the loading screen paint before the CPU-heavy island generation
  await new Promise((r) => setTimeout(r, 30));

  const settings = { follow: true, resolution: Math.min(window.devicePixelRatio, 1.25), showGrid: false };

  // ---------- World ----------
  const terrain = new Terrain();
  const waves = new Waves(terrain);
  const fft = new OceanFFT(gpu, waves); // adds the FFT cascade uniforms to waves.uniforms
  const foamTex = createFoamTexture(renderer);
  const sky = new SkySystem(renderer);
  sky.apply();
  terrain.bakeShadows(sky.sunDir);

  const shared = {
    terrain: terrain.uniforms,
    waves: waves.uniforms,
    light: {
      uSunDir: { value: sky.sunDir },
      uSunColor: { value: sky.sunColor },
      uSkyCube: { value: sky.cubeRT.texture },
    },
    water: {
      uAbsorb: { value: new THREE.Vector3(0.42, 0.075, 0.055) },
      uDeepColor: { value: new THREE.Vector3(0.003, 0.03, 0.045) },
      uSSSColor: { value: new THREE.Vector3(0.04, 0.32, 0.27) },
    },
    fog: { uFogDensity: { value: 0.00022 } },
    foamTex: { value: foamTex },
    caustics: { uCaustics: { value: 1.0 } },
  };
  const ripple = new RippleSim(gpu, shared, terrain.uniforms);
  shared.ripple = ripple.uniforms;
  terrain.buildMesh({ ...shared.light, ...shared.waves, ...shared.caustics, uFogDensity: shared.fog.uFogDensity });

  const water = new WaterSurface(shared);
  const particles = new ParticleSystem(gpu, shared);
  const fluid = new FluidRenderer(gpu, particles, shared);
  const pipeline = new Pipeline(renderer, gpu);

  const BOAT_START = new THREE.Vector3(18, 0, 172);
  const BOAT_YAW = -Math.PI / 2 - 0.15;
  const boat = new Boat(waves, terrain, BOAT_START, BOAT_YAW);

  // ---------- Scenes ----------
  const opaqueScene = new THREE.Scene();
  opaqueScene.add(terrain.mesh, boat.mesh, sky.light);
  const waterScene = new THREE.Scene();
  waterScene.add(water.group);
  const overlay = new THREE.Scene();
  overlay.visible = settings.showGrid;

  const effects = new Effects({ scene: opaqueScene, particles, ripple, waves, terrain });
  effects.crestThreshold = water.params.crestThreshold;
  const emitter = effects.emitter();

  // ---------- Camera ----------
  const camera = new THREE.PerspectiveCamera(55, 1, 0.2, 9000);
  camera.position.set(BOAT_START.x - 4, 6.5, BOAT_START.z + 15);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 4;
  controls.maxDistance = 600;
  controls.maxPolarAngle = Math.PI * 0.495;
  controls.target.copy(boat.position);
  const lastFollow = boat.position.clone();

  // ---------- Overlays (simulation grid bounds) ----------
  const gridBox = new THREE.Box3Helper(new THREE.Box3(), 0x3fd0ff);
  const rippleBox = new THREE.Box3Helper(new THREE.Box3(), 0xffc23f);
  overlay.add(gridBox, rippleBox);
  const updateOverlay = () => {
    const o = particles.gridOrigin;
    gridBox.box.min.copy(o);
    gridBox.box.max.copy(o).add(particles.extent);
    const r = ripple.uniforms.uRippleXf.value;
    rippleBox.box.min.set(r.x, -0.05, r.y);
    rippleBox.box.max.set(r.x + r.z, 0.05, r.y + r.z);
  };

  // ---------- Sizing ----------
  const size = new THREE.Vector2();
  const resize = () => {
    renderer.setPixelRatio(settings.resolution);
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.getDrawingBufferSize(size);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    pipeline.resize(size.x, size.y);
    fluid.resize(size.x, size.y);
  };
  window.addEventListener('resize', resize);
  resize();

  // ---------- App object (GUI hooks) ----------
  const modeEl = document.getElementById('mode');
  const app = {
    particles, fluid, ripple, water, waves, fft, sky, pipeline, effects, boat, terrain, shared, settings, overlay,
    resize, updateOverlay,
    onModeChange() { modeEl.textContent = '3D splash solver: ' + particles.params.mode; },
    /** Move the boat and keep the camera at the same relative offset. */
    teleportBoat(pos, yaw, camOffset) {
      const off = camOffset ? camOffset.clone() : camera.position.clone().sub(controls.target);
      boat.reset(pos, yaw);
      controls.target.copy(boat.position);
      camera.position.copy(boat.position).add(off);
      lastFollow.copy(boat.position);
    },
    resetBoat() { app.teleportBoat(BOAT_START, BOAT_YAW); },
    jumpToShore() {
      settings.follow = true;
      app.teleportBoat(new THREE.Vector3(6, 0, 134), -Math.PI / 2 + 0.25, new THREE.Vector3(7, 3.2, 15));
      gui.controllersRecursive().forEach((c) => c.updateDisplay());
    },
  };
  const gui = buildGUI(app);
  app.onModeChange();
  // Handy for debugging / automation from the devtools console
  window.frontier = { app, camera, controls, gui, THREE, renderer };

  // ---------- Input ----------
  const modes = Object.keys(SIM_MODES);
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    const k = e.key.toLowerCase();
    if (k === '1' || k === '2' || k === '3') {
      particles.params.mode = modes[Number(k) - 1];
      app.onModeChange();
      gui.controllersRecursive().forEach((c) => c.updateDisplay());
    } else if (k === 'r') effects.dropRock(boat.position);
    else if (k === 'f') { particles.params.foamParticles = !particles.params.foamParticles; gui.controllersRecursive().forEach((c) => c.updateDisplay()); }
    else if (k === 'h') { const h = document.getElementById('hud'); h.style.display = h.style.display === 'none' ? '' : 'none'; }
    else if (k === 'backspace') { app.resetBoat(); e.preventDefault(); }
  });

  // Click (not drag) on the water spawns a splash
  const ray = new THREE.Raycaster();
  let downPos = null;
  canvas.addEventListener('pointerdown', (e) => { if (e.button === 0) downPos = [e.clientX, e.clientY]; });
  canvas.addEventListener('pointerup', (e) => {
    if (!downPos || e.button !== 0) return;
    const moved = Math.hypot(e.clientX - downPos[0], e.clientY - downPos[1]);
    downPos = null;
    if (moved > 5 || !effects.params.clickSplash) return;
    const ndc = new THREE.Vector2((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    let h = 0;
    const hit = new THREE.Vector3();
    for (let i = 0; i < 4; i++) {
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -h);
      if (!ray.ray.intersectPlane(plane, hit)) return;
      h = waves.heightAt(hit.x, hit.z);
    }
    if (terrain.sample(hit.x, hit.z).h > h) return;
    effects.splash(hit.x, hit.z, 1);
  });

  document.getElementById('loading').style.display = 'none';

  // ---------- Loop ----------
  const timer = new THREE.Timer();
  timer.connect(document);
  const statsEl = document.getElementById('stats');
  let time = 0, fpsAcc = 0, fpsFrames = 0, fps = 0;
  const wind = new THREE.Vector2();

  function frame(ts) {
    timer.update(ts);
    const dt = Math.min(timer.getDelta(), 1 / 20);
    time += dt;
    waves.setTime(time);
    fft.update(time);
    wind.copy(waves.windVector);

    boat.update(dt, emitter);
    if (settings.follow) {
      const d = boat.position.clone().sub(lastFollow);
      d.y *= 0.5;
      camera.position.add(d);
      controls.target.add(d);
    }
    lastFollow.copy(boat.position);
    controls.update();
    const camH = waves.heightAt(camera.position.x, camera.position.z);
    if (camera.position.y < camH + 0.8) camera.position.y = camH + 0.8;
    camera.updateMatrixWorld();

    const focus = settings.follow ? boat.position : controls.target;
    ripple.setFocus(focus.x, focus.z);
    particles.setFocus(focus.x, focus.z);
    effects.update(dt, focus);
    particles.setBoat(boat);

    ripple.beginImpacts();
    particles.update(dt, { wind, windSpeed: 3 + waves.params.height * 2, onSubstep: (ps) => ripple.splatImpacts(ps) });
    ripple.update(dt, time, boat, wind);

    sky.update(time, (env) => { opaqueScene.environment = env; });
    water.params.gridFoam = ripple.params.foamGrid;
    ripple.foamMat.uniforms.uCrestThresh.value = water.params.crestThreshold;
    ripple.foamMat.uniforms.uCrestFoam.value = water.params.crestFoam;
    water.update(camera, waves, size);
    if (overlay.visible) updateOverlay();

    pipeline.render({ camera, skyScene: sky.scene, opaqueScene, waterScene, overlayScene: overlay, water, terrain, fluid });

    fpsAcc += dt; fpsFrames++;
    if (fpsAcc > 0.5) {
      fps = fpsFrames / fpsAcc; fpsAcc = 0; fpsFrames = 0;
      statsEl.textContent = `${fps.toFixed(0)} fps · ${size.x}×${size.y} · particles ${particles.params.budget} · grid ${particles.params.grid} (${particles.gridQ.dim.join('×')} @ ${particles.gridQ.h} m) · boat ${(boat.speed * 1.944).toFixed(1)} kn`;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

start().catch((e) => { console.error(e); fail('<b>Startup error</b><br><pre>' + (e.stack || e) + '</pre>'); });

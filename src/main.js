// =============================================================================
//  Sugarplum Hollow — app shell: camera, day/night cycle, UI.
// =============================================================================
import { buildWorld } from './world.js';
import { createRenderer } from './renderer.js';
import { perspective, lookAt, invert, mul, normalize3, clamp } from './math.js';
import { computeSky } from './sky.js';

const canvas = document.getElementById('scene');
const ui = document.getElementById('ui');
const loading = document.getElementById('loading');
const loadingText = document.getElementById('loadingText');
const errorBox = document.getElementById('error');
const errorText = document.getElementById('errorText');
const errorDetail = document.getElementById('errorDetail');
const statsEl = document.getElementById('stats');
const hintEl = document.getElementById('hint');

// ------------------------------------------------------------------- state
const state = {
  hour: 16.6,
  snow: 0.5,
  quality: 1,
  bloom: 1,
  autoRotate: true,
  time: 0,
};

const VIEWS = {
  village: { theta: 0.40, phi: 1.32, radius: 41, target: [0, 5.5, -6] },
  plaza: { theta: 0.16, phi: 1.40, radius: 19, target: [0, 3.2, -6.5] },
  forest: { theta: -0.95, phi: 1.24, radius: 58, target: [0, 5, -10] },
  river: { theta: 0.18, phi: 1.24, radius: 30, target: [-4, 1.6, -42] },
};

const cam = {
  theta: VIEWS.village.theta,
  phi: VIEWS.village.phi,
  radius: VIEWS.village.radius,
  target: [...VIEWS.village.target],
  tTheta: VIEWS.village.theta,
  tPhi: VIEWS.village.phi,
  tRadius: VIEWS.village.radius,
  tTarget: [...VIEWS.village.target],
};

function setView(name, instant = false) {
  const v = VIEWS[name] || VIEWS.village;
  cam.tTheta = v.theta;
  cam.tPhi = v.phi;
  cam.tRadius = v.radius;
  cam.tTarget = [...v.target];
  if (instant) {
    cam.theta = v.theta;
    cam.phi = v.phi;
    cam.radius = v.radius;
    cam.target = [...v.target];
  }
  for (const b of document.querySelectorAll('[data-view]')) {
    b.classList.toggle('active', b.dataset.view === name);
  }
}

// ------------------------------------------------------------------- camera
const pointers = new Map();
let lastPinch = 0;
let interacted = false;

const clampPhi = (p) => clamp(p, 0.16, 1.50);

function eyePosition() {
  const sp = Math.sin(cam.phi);
  return [
    cam.target[0] + cam.radius * sp * Math.sin(cam.theta),
    cam.target[1] + cam.radius * Math.cos(cam.phi),
    cam.target[2] + cam.radius * sp * Math.cos(cam.theta),
  ];
}

canvas.addEventListener('pointerdown', (e) => {
  canvas.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, button: e.button, shift: e.shiftKey });
  interacted = true;
  hintEl.classList.add('fade');
});
canvas.addEventListener('pointermove', (e) => {
  const prev = pointers.get(e.pointerId);
  if (!prev) return;
  const dx = e.clientX - prev.x;
  const dy = e.clientY - prev.y;
  prev.x = e.clientX;
  prev.y = e.clientY;

  if (pointers.size >= 2) {
    // pinch zoom
    const pts = [...pointers.values()];
    const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    if (lastPinch > 0) {
      cam.tRadius = clamp(cam.tRadius * (lastPinch / Math.max(d, 1)), 8, 150);
    }
    lastPinch = d;
    return;
  }

  if (prev.button === 2 || e.shiftKey || prev.shift) {
    // pan across the view plane
    const eye = eyePosition();
    const fwd = normalize3([cam.target[0] - eye[0], cam.target[1] - eye[1], cam.target[2] - eye[2]]);
    const right = normalize3([fwd[2], 0, -fwd[0]]);
    const up = [right[1] * fwd[2] - right[2] * fwd[1], right[2] * fwd[0] - right[0] * fwd[2], right[0] * fwd[1] - right[1] * fwd[0]];
    const k = cam.radius * 0.0016;
    for (let i = 0; i < 3; i++) {
      cam.tTarget[i] += (-right[i] * dx + up[i] * dy) * k;
    }
  } else {
    cam.tTheta -= dx * 0.0055;
    cam.tPhi = clampPhi(cam.tPhi - dy * 0.0045);
  }
});
const endPointer = (e) => {
  pointers.delete(e.pointerId);
  if (pointers.size < 2) lastPinch = 0;
};
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  cam.tRadius = clamp(cam.tRadius * Math.exp(e.deltaY * 0.0011), 8, 150);
  interacted = true;
  hintEl.classList.add('fade');
}, { passive: false });

// ----------------------------------------------------------------------- UI
const els = {
  hour: document.getElementById('hour'),
  hourOut: document.getElementById('hourOut'),
  snow: document.getElementById('snow'),
  snowOut: document.getElementById('snowOut'),
  quality: document.getElementById('quality'),
  qualityOut: document.getElementById('qualityOut'),
  bloom: document.getElementById('bloom'),
  bloomOut: document.getElementById('bloomOut'),
  rotate: document.getElementById('rotate'),
  reset: document.getElementById('reset'),
};

function fmtHour(h) {
  const hh = Math.floor(h) % 24;
  const mm = Math.floor((h % 1) * 60);
  const ap = hh >= 12 ? 'PM' : 'AM';
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}:${String(mm).padStart(2, '0')} ${ap}`;
}

function syncUI() {
  els.hourOut.textContent = fmtHour(state.hour);
  els.snowOut.textContent = `${Math.round(state.snow * 100)}%`;
  els.qualityOut.textContent = `${state.quality.toFixed(2).replace(/0$/, '')}×`;
  els.bloomOut.textContent = `${Math.round(state.bloom * 100)}%`;
  els.rotate.classList.toggle('on', state.autoRotate);
}

els.hour.addEventListener('input', () => { state.hour = parseFloat(els.hour.value); syncUI(); });
els.snow.addEventListener('input', () => { state.snow = parseFloat(els.snow.value); syncUI(); });
els.bloom.addEventListener('input', () => { state.bloom = parseFloat(els.bloom.value); syncUI(); });
els.quality.addEventListener('input', () => {
  state.quality = parseFloat(els.quality.value);
  syncUI();
  resizeCanvas();
});
els.rotate.addEventListener('click', () => { state.autoRotate = !state.autoRotate; syncUI(); });
els.reset.addEventListener('click', () => setView('village'));
for (const b of document.querySelectorAll('[data-view]')) {
  b.addEventListener('click', () => setView(b.dataset.view));
}

window.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement) return;
  if (e.key === 'h' || e.key === 'H') ui.classList.toggle('hidden');
  if (e.key === 'r' || e.key === 'R') setView('village');
  if (e.key === ' ') { state.autoRotate = !state.autoRotate; syncUI(); e.preventDefault(); }
  if (e.key === '1') setView('village');
  if (e.key === '2') setView('plaza');
  if (e.key === '3') setView('forest');
  if (e.key === '4') setView('river');
});

// ------------------------------------------------------------------ resizing
function resizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 1.75) * state.quality;
  const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
  const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
}
window.addEventListener('resize', resizeCanvas);

// --------------------------------------------------------------------- boot
function showError(title, detail) {
  errorBox.hidden = false;
  errorText.textContent = title;
  errorDetail.textContent = detail || '';
  loading.classList.add('done');
}

async function boot() {
  syncUI();
  resizeCanvas();

  if (!navigator.gpu) {
    showError(
      'This browser does not expose WebGPU.',
      'navigator.gpu is undefined. Try Chrome or Edge 113+, or enable WebGPU in your browser flags.',
    );
    return;
  }

  loadingText.textContent = 'Baking gingerbread…';
  // Let the loading screen paint before the (synchronous) world build.
  await new Promise((r) => requestAnimationFrame(() => r()));

  const world = buildWorld();
  loadingText.textContent = 'Piping the icing…';
  await new Promise((r) => requestAnimationFrame(() => r()));

  let renderer;
  let framesRendered = 0;
  try {
    renderer = await createRenderer({
      canvas,
      world,
      onError: (msg) => {
        console.error('[sugarplum]', msg);
        if (framesRendered === 0) {
          // Before the first frame a GPU error is fatal — the scene would be blank.
          showError('The GPU rejected the scene.', msg);
        } else {
          statsEl.dataset.warn = '1';
          statsEl.innerHTML = `<b style="color:#ff9ab5">GPU warning</b> — see console`;
        }
      },
    });
  } catch (err) {
    showError('Could not start the renderer.', String(err && (err.stack || err.message || err)));
    return;
  }

  let last = performance.now();
  let fpsAccum = 0, fpsFrames = 0, fps = 60, statTimer = 0;
  let firstFrame = true;

  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    state.time += dt;

    // smooth camera toward its targets
    const k = 1 - Math.exp(-dt * 7);
    if (state.autoRotate && !pointers.size) cam.tTheta += dt * 0.035;
    cam.theta += (cam.tTheta - cam.theta) * k;
    cam.phi += (cam.tPhi - cam.phi) * k;
    cam.radius += (cam.tRadius - cam.radius) * k;
    for (let i = 0; i < 3; i++) cam.target[i] += (cam.tTarget[i] - cam.target[i]) * k;

    resizeCanvas();

    const eye = eyePosition();
    const view = lookAt(eye, cam.target, [0, 1, 0]);
    const aspect = Math.max(canvas.clientWidth, 1) / Math.max(canvas.clientHeight, 1);
    const proj = perspective((54 * Math.PI) / 180, aspect, 0.4, 620);
    const viewProj = mul(proj, view);
    const invViewProj = invert(viewProj);

    const fwd = normalize3([cam.target[0] - eye[0], cam.target[1] - eye[1], cam.target[2] - eye[2]]);
    const right = normalize3([fwd[2], 0, -fwd[0]]);
    const up = [
      right[1] * fwd[2] - right[2] * fwd[1],
      right[2] * fwd[0] - right[0] * fwd[2],
      right[0] * fwd[1] - right[1] * fwd[0],
    ];

    const sky = computeSky(state.hour);
    const night = sky.night;

    renderer.render({
      viewProj,
      invViewProj,
      lightVP: new Float32Array(16),
      eye,
      right,
      up,
      fwd,
      sunDir: sky.sunDir,
      sunColor: sky.sunColor,
      sunIntensity: sky.sunIntensity,
      skyTop: sky.skyTop,
      skyHorizon: sky.skyHorizon,
      skyGround: sky.skyGround,
      night,
      time: state.time,
      fog: 0.0028 + night * 0.0016,
      snow: state.snow,
      exposure: 1.12 + night * 0.72,
      bloomThreshold: 1.05,
      bloomStrength: 0.62 * state.bloom,
      vignette: 0.34,
      grain: 0.012,
    });

    framesRendered++;
    if (firstFrame) {
      firstFrame = false;
      setTimeout(() => loading.classList.add('done'), 120);
    }

    fpsAccum += dt;
    fpsFrames++;
    statTimer += dt;
    if (statTimer > 0.5) {
      fps = fpsFrames / fpsAccum;
      fpsAccum = 0;
      fpsFrames = 0;
      statTimer = 0;
      const s = renderer.stats;
      const tris = (s.triangles + s.instances * 140).toLocaleString();
      statsEl.innerHTML =
        `<b>${fps.toFixed(0)}</b> fps · <b>${(tris)}</b> tris<br>` +
        `${s.draws} draws · ${s.instances.toLocaleString()} candy pieces<br>` +
        `${s.vertices.toLocaleString()} verts · ${s.snow} snowflakes · shadowmap ${2048}²`;
    }

    requestAnimationFrame(frame);
  }

  renderer.device.lost.then((info) => {
    if (info.reason !== 'destroyed') {
      showError('The GPU device was lost.', info.message || String(info.reason));
    }
  });

  requestAnimationFrame(frame);

  // Expose for debugging in the console.
  window.__hollow = { renderer, world, state, cam, setView };
}

boot().catch((err) => {
  showError('Something went wrong while baking.', String(err && (err.stack || err.message || err)));
});

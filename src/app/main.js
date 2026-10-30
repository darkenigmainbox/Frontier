import { EROSION_LANDSCAPES } from '../erosion/erosion-presets.js';
import { GpuErosionEngine } from '../erosion/gpu-erosion-engine.js';
import { FORMATION_PRESETS, LITHOLOGY_PALETTES, resolveParams } from '../geology/presets.js';
import { exportFormationToGLB } from '../io/glb-exporter.js';
import { exportFormationToOBJ } from '../io/obj-exporter.js';
import { RockStudioViewport } from './viewport.js';
import { ArchCurveGizmoOverlay } from './arch-curve-gizmo.js';
import { DEFAULT_CUSTOM_ARCH_CURVES } from '../geology/custom-arch-spline.js';

// ============================================================================
// SCHEMA DEFINITIONS: 3D ROCK STUDIO & GPU PARTICLE EROSION LAB
// ============================================================================

const SLIDER_SCHEMA = {
  tectonics: [
    { key: 'dipAngle',       label: 'Bedding / Foliation Dip', min: 0,   max: 78,  step: 1,    fmt: (v) => `${v}°` },
    { key: 'strikeAngle',    label: 'Strike Azimuth',          min: -90, max: 90,  step: 1,    fmt: (v) => `${v}°` },
    { key: 'jointDensity',   label: 'Joint Set Density',       min: 0.2, max: 1.0, step: 0.02, fmt: (v) => `${Math.round(v * 100)}%` },
    { key: 'jointAperture',  label: 'Joint Notch Aperture',    min: 0.0, max: 1.0, step: 0.02, fmt: (v) => `${Math.round(v * 100)}%` },
    { key: 'faultIntensity', label: 'Fault Slip & Gullies',    min: 0.0, max: 1.0, step: 0.02, fmt: (v) => `${Math.round(v * 100)}%` },
  ],
  macro: [
    { key: 'scale',            label: 'Real-World Scale',       min: 2.5, max: 28,  step: 0.5,  fmt: (v) => `${Number(v).toFixed(1)}m` },
    { key: 'overhangStrength', label: 'Overhangs & Competency', min: 0.0, max: 1.0, step: 0.02, fmt: (v) => `${Math.round(v * 100)}%` },
    { key: 'pluckingAmount',   label: 'Block Plucking',         min: 0.0, max: 1.0, step: 0.02, fmt: (v) => `${Math.round(v * 100)}%` },
    { key: 'talusAmount',      label: 'Talus & Fallen Slabs',   min: 0.0, max: 1.0, step: 0.02, fmt: (v) => `${Math.round(v * 100)}%` },
  ],
  detail: [
    { key: 'cleavageSharpness', label: 'Cleavage Planarity',    min: 0.15, max: 1.0, step: 0.02, fmt: (v) => `${Math.round(v * 100)}%` },
    { key: 'facetAmplitude',    label: 'Stepped Scarplet Depth',min: 0.0,  max: 1.0, step: 0.02, fmt: (v) => `${Math.round(v * 100)}%` },
    { key: 'edgeWear',          label: 'Chisel Chamfer & Wear', min: 0.0,  max: 1.0, step: 0.02, fmt: (v) => `${Math.round(v * 100)}%` },
    { key: 'creaseAngle',       label: 'Crease Split Angle',    min: 22,   max: 85,  step: 1,    fmt: (v) => `${v}°` },
  ],
};

const EROSION_SLIDER_SCHEMA = {
  particles: [
    { key: 'particleCount',    label: 'Active GPU Particles',     min: 2048, max: 32768, step: 1024, fmt: (v) => Number(v).toLocaleString() },
    { key: 'substepsPerFrame', label: 'GPU Substeps / Frame',     min: 1,    max: 8,     step: 1,    fmt: (v) => `${v}×` },
    { key: 'rainIntensity',    label: 'Sky Drop Water Mass',      min: 0.15, max: 1.50,  step: 0.05, fmt: (v) => `${Math.round(v * 100)}%` },
    { key: 'particleInertia',  label: 'Flow Momentum & Meander',  min: 0.04, max: 0.85,  step: 0.02, fmt: (v) => `${Math.round(v * 100)}%` },
    { key: 'evaporation',      label: 'Runoff Evaporation',       min: 0.02, max: 0.80,  step: 0.02, fmt: (v) => `${Math.round(v * 100)}%` },
  ],
  hardness: [
    { key: 'rockHardness',     label: 'Base Bedrock Hardness',    min: 0.06, max: 0.96,  step: 0.02, fmt: (v) => `${Math.round(v * 100)}%` },
    { key: 'strataStrength',   label: 'Hard/Soft Strata Contrast',min: 0.0,  max: 1.0,   step: 0.02, fmt: (v) => `${Math.round(v * 100)}%` },
    { key: 'strataFreq',       label: 'Stratigraphic Layers',     min: 2.0,  max: 18.0,  step: 0.5,  fmt: (v) => `${Number(v).toFixed(1)}` },
    { key: 'strataDip',        label: 'Bedding Dip Angle',        min: 0,    max: 42,    step: 1,    fmt: (v) => `${v}°` },
    { key: 'faultWeakness',    label: 'Fault Zone Erodibility',   min: 0.0,  max: 1.0,   step: 0.02, fmt: (v) => `${Math.round(v * 100)}%` },
  ],
  climate: [
    { key: 'snowline',        label: 'Snowline Elevation',        min: 0.15, max: 1.0,  step: 0.01, fmt: (v) => `${Math.round(v * 100)}%` },
    { key: 'snowfallRate',    label: 'Snowfall / Blizzard Rate',  min: 0.0,  max: 1.4,  step: 0.02, fmt: (v) => `${Math.round(v * 100)}%` },
    { key: 'glacierStrength', label: 'Glacier Ice Flow & Pluck',  min: 0.0,  max: 1.0,  step: 0.02, fmt: (v) => `${Math.round(v * 100)}%` },
    { key: 'windSpeed',       label: 'Aeolian Wind & Drift',      min: 0.0,  max: 1.0,  step: 0.02, fmt: (v) => `${Math.round(v * 100)}%` },
    { key: 'windAzimuth',     label: 'Prevailing Wind Azimuth',   min: -180, max: 180,  step: 1,    fmt: (v) => `${v}°` },
    { key: 'rockfallRate',    label: 'Cliff Rockfall Intensity',  min: 0.0,  max: 1.0,  step: 0.02, fmt: (v) => `${Math.round(v * 100)}%` },
  ],
  hydraulics: [
    { key: 'erosionStrength',  label: 'Hydraulic Cutting Power',  min: 0.10, max: 1.40,  step: 0.02, fmt: (v) => `${Math.round(v * 100)}%` },
    { key: 'sedimentCapacity', label: 'Sediment Carry Capacity',  min: 0.10, max: 1.50,  step: 0.02, fmt: (v) => `${Math.round(v * 100)}%` },
    { key: 'depositionRate',   label: 'Alluvial Deposition Rate', min: 0.08, max: 1.20,  step: 0.02, fmt: (v) => `${Math.round(v * 100)}%` },
    { key: 'talusAngle',       label: 'Cliff Spall & Talus Angle',min: 0.10, max: 1.0,   step: 0.02, fmt: (v) => `${Math.round(24 + v * 16)}°` },
    { key: 'pipeFlowBlend',    label: 'River Channel Convergence',min: 0.0,  max: 1.0,   step: 0.02, fmt: (v) => `${Math.round(v * 100)}%` },
  ],
};

const CATEGORIES = ['All', 'Arch', 'Sedimentary', 'Desert', 'Cliff', 'Outcrop', 'Boulder', 'Fracture Demo'];
const QUICK_SEEDS = [4029, 7714, 1984, 9301, 5518, 2607];

const state = {
  studioMode: window.location.hash === '#rock' ? 'rock' : 'erosion',
  params: resolveParams({ archetype: 'desert-arch', seed: 4029, quality: 'medium', decimation: 1.0 }),
  categoryFilter: 'All',
  latestResult: null,
  autoFrameNext: true,
  rockInitializedOnce: false,
  curveMode: false,
  customCurveActive: false,
};

// ============================================================================
// VIEWPORTS & WORKER INITIALIZATION
// ============================================================================

const viewportEl = document.getElementById('viewport-canvas');
const viewport = new RockStudioViewport(viewportEl);
viewport.setActive(false);

const stageEl = document.querySelector('.viewport-stage');

let curveOverlay = null;
try {
  curveOverlay = new ArchCurveGizmoOverlay(stageEl, {
    getCameraAdapter: () => (state.studioMode === 'rock' ? viewport.getCameraAdapter() : null),
    onCurveChanged: () => updateCurveReadout(),
    onCurveCommitted: (curves) => {
      state.customCurveActive = true;
      updateCurveReadout();
      // Rebuild the boulder arch along the exact user-drawn spline
      state.params.customArchCurves = curves;
      requestSynthesis(false);
    },
  });
} catch (err) {
  console.warn('Curve gizmo unavailable:', err);
}

const erosionCanvas = document.getElementById('erosion-canvas');
let erosionEngine = null;

const progressBar = document.getElementById('progress-bar');
const progressFill = document.getElementById('progress-fill');
const statusToast = document.getElementById('status-toast');

function updateErosionHud(tel) {
  document.getElementById('er-stat-parts').textContent = tel.particles.toLocaleString();
  document.getElementById('er-stat-steps').textContent = tel.steps.toLocaleString();
  document.getElementById('er-stat-cut').textContent = `${tel.erodedVolumeM3.toLocaleString()} m³`;
  const totalSed = tel.coarseSedM3 + tel.fineSedM3;
  document.getElementById('er-stat-sed').textContent = `${totalSed.toLocaleString()} m³`;
  document.getElementById('er-stat-fps').textContent = `${tel.fps}`;
}

try {
  erosionEngine = new GpuErosionEngine(erosionCanvas, updateErosionHud);
  erosionEngine.params.substepsPerFrame = 3;
} catch (err) {
  console.error('GPU Erosion initialization error:', err);
  statusToast.classList.remove('hidden');
  statusToast.textContent = `GPU Erosion Error: ${err.message}`;
}

const worker = new Worker(new URL('../worker/gen-worker.js', import.meta.url), { type: 'module' });
let reqCounter = 0;
let busy = false;
let pendingRequest = null;

function requestSynthesis(autoFrame = false) {
  if (autoFrame) state.autoFrameNext = true;
  const payload = { params: { ...state.params } };
  if (busy) {
    pendingRequest = payload;
    return;
  }
  dispatchToWorker(payload);
}

function dispatchToWorker(payload) {
  busy = true;
  const id = ++reqCounter;
  if (state.studioMode === 'rock') {
    progressBar.classList.remove('hidden');
    progressFill.style.width = '5%';
    statusToast.classList.remove('hidden');
    statusToast.textContent = 'Synthesizing 3D geology...';
  }
  worker.postMessage({ id, params: payload.params });
}

worker.onmessage = (e) => {
  const msg = e.data;
  if (msg.type === 'progress') {
    if (state.studioMode === 'rock') {
      progressFill.style.width = `${Math.round(msg.progress * 100)}%`;
      statusToast.textContent = msg.stage;
    }
    return;
  }

  busy = false;
  if (msg.type === 'done') {
    if (curveOverlay && state.customCurveActive) {
      curveOverlay.setCurves(state.params.customArchCurves || DEFAULT_CUSTOM_ARCH_CURVES, false);
      updateCurveReadout();
    }

    state.latestResult = {
      params: msg.params,
      lithology: msg.lithology,
      stats: msg.stats,
      mesh: msg.mesh,
    };

    const selectLith = document.getElementById('select-lithology');
    if (selectLith && msg.lithology) selectLith.value = msg.lithology;

    viewport.setFormationMesh(
      msg.mesh,
      msg.lithology,
      msg.stats.dimensions,
      state.autoFrameNext
    );
    state.autoFrameNext = false;
    updateRockHud(msg.stats);
  } else if (msg.type === 'error') {
    console.error('Geology worker error:', msg.message);
    statusToast.classList.remove('hidden');
    statusToast.textContent = `Error: ${msg.message}`;
  }

  if (pendingRequest) {
    const next = pendingRequest;
    pendingRequest = null;
    dispatchToWorker(next);
  } else {
    progressBar.classList.add('hidden');
    statusToast.classList.add('hidden');
  }
};

function updateRockHud(stats) {
  const [dx, dy, dz] = stats.dimensions;
  document.getElementById('stat-dims').textContent = `${dx} × ${dy} × ${dz}m`;
  document.getElementById('stat-tris').textContent = stats.triangles.toLocaleString();
  document.getElementById('stat-verts').textContent = stats.vertices.toLocaleString();
  document.getElementById('stat-blocks').textContent = `${stats.blockCount} (${stats.faultCount}F)`;
  document.getElementById('stat-time').textContent = `${stats.elapsedMs} ms`;
}

// ============================================================================
// STUDIO MODE SWITCHING (GPU PARTICLE EROSION <-> 3D ROCK & CLIFF STUDIO)
// ============================================================================

function setStudioMode(mode) {
  state.studioMode = mode === 'rock' ? 'rock' : 'erosion';
  const isErosion = state.studioMode === 'erosion';

  document.getElementById('mode-btn-erosion').classList.toggle('active', isErosion);
  document.getElementById('mode-btn-rock').classList.toggle('active', !isErosion);

  document.getElementById('left-erosion-panels').classList.toggle('hidden-panel', !isErosion);
  document.getElementById('right-erosion-panels').classList.toggle('hidden-panel', !isErosion);
  document.getElementById('hud-erosion').classList.toggle('hidden-panel', !isErosion);
  document.getElementById('erosion-canvas').classList.toggle('hidden-panel', !isErosion);
  document.getElementById('erosion-transport-bar').classList.toggle('hidden-panel', !isErosion);

  document.getElementById('left-rock-panels').classList.toggle('hidden-panel', isErosion);
  document.getElementById('right-rock-panels').classList.toggle('hidden-panel', isErosion);
  document.getElementById('hud-rock').classList.toggle('hidden-panel', isErosion);
  document.getElementById('viewport-canvas').classList.toggle('hidden-panel', isErosion);
  document.getElementById('rock-camera-bar').classList.toggle('hidden-panel', isErosion);

  document.getElementById('brand-subtitle').textContent = isErosion
    ? 'GPU Particle Erosion & Sedimentation'
    : '3D Structural Rock & Cliff Studio';
  document.getElementById('brand-badge-pill').textContent = isErosion
    ? 'WebGL2 GPGPU'
    : '19 Presets';

  if (isErosion) {
    progressBar.classList.add('hidden');
    statusToast.classList.add('hidden');
    if (curveOverlay && state.curveMode) setCurveMode(false);
    viewport.setActive(false);
    if (erosionEngine) {
      erosionEngine.resizeIfNeeded();
      erosionEngine.start();
    }
    window.history.replaceState(null, '', '#erosion');
  } else {
    if (erosionEngine) erosionEngine.stop();
    viewport.setActive(true);
    if (!state.rockInitializedOnce) {
      state.rockInitializedOnce = true;
      requestSynthesis(true);
    } else if (state.latestResult) {
      viewport.frameCamera('hero');
    }
    window.history.replaceState(null, '', '#rock');
  }
}

document.getElementById('mode-btn-erosion').addEventListener('click', () => setStudioMode('erosion'));
document.getElementById('mode-btn-rock').addEventListener('click', () => setStudioMode('rock'));

// ============================================================================
// GPU PARTICLE EROSION & SEDIMENTATION UI WIRING
// ============================================================================

const erosionSliderRefs = new Map();

function buildErosionLandscapeCards() {
  const mount = document.getElementById('erosion-landscape-list');
  mount.innerHTML = '';
  if (!erosionEngine) return;

  for (const preset of Object.values(EROSION_LANDSCAPES)) {
    const btn = document.createElement('button');
    btn.className = `arch-card ${preset.id === erosionEngine.params.landscape ? 'active' : ''}`;
    btn.dataset.id = preset.id;
    btn.innerHTML = `
      <div class="arch-card-top">
        <span class="arch-title">${preset.name}</span>
        <span class="arch-cat">500m</span>
      </div>
      <span class="arch-sub">${preset.subtitle}</span>
    `;
    btn.addEventListener('click', () => {
      erosionEngine.applyLandscapePreset(preset.id);
      mount.querySelectorAll('.arch-card').forEach((el) => {
        el.classList.toggle('active', el.dataset.id === preset.id);
      });
      syncErosionSliders();
      const palette = document.getElementById('select-erosion-material');
      if (palette) palette.value = String(erosionEngine.params.materialTheme);
    });
    mount.appendChild(btn);
  }
}

function buildErosionSliders(groupKey, mountId) {
  const mount = document.getElementById(mountId);
  mount.innerHTML = '';
  if (!erosionEngine) return;

  for (const spec of EROSION_SLIDER_SCHEMA[groupKey]) {
    const wrap = document.createElement('div');
    wrap.className = 'slider-group';
    const val = erosionEngine.params[spec.key];
    wrap.innerHTML = `
      <div class="slider-label">
        <span>${spec.label}</span>
        <output>${spec.fmt(val)}</output>
      </div>
      <input type="range" min="${spec.min}" max="${spec.max}" step="${spec.step}" value="${val}" />
    `;
    const input = wrap.querySelector('input');
    const out = wrap.querySelector('output');

    input.addEventListener('input', () => {
      const num = Number(input.value);
      erosionEngine.params[spec.key] = num;
      out.textContent = spec.fmt(num);
      if (spec.key === 'particleCount') {
        document.getElementById('er-stat-parts').textContent = num.toLocaleString();
      }
    });

    erosionSliderRefs.set(spec.key, { input, out, spec });
    mount.appendChild(wrap);
  }
}

function syncErosionSliders() {
  if (!erosionEngine) return;
  for (const [key, ref] of erosionSliderRefs.entries()) {
    const val = erosionEngine.params[key];
    ref.input.value = val;
    ref.out.textContent = ref.spec.fmt(val);
  }
  document.getElementById('er-stat-parts').textContent = erosionEngine.params.particleCount.toLocaleString();
}

// ============================================================================
// CUSTOM CURVE-DRAWN ARCH TOOL (GIZMO UI WIRING)
// ============================================================================

function updateCurveReadout() {
  const readout = document.getElementById('curve-point-readout');
  const pill = document.getElementById('curve-mode-pill');
  const radSlider = document.getElementById('slider-curve-radius');
  const radOut = document.getElementById('out-curve-radius');
  if (!curveOverlay) return;

  const pt = curveOverlay.getSelectedPoint();
  if (pill) {
    pill.textContent = !state.curveMode ? 'Off' : curveOverlay.placeMode ? 'Placing Points' : 'Gizmo Active';
    pill.classList.toggle('accent', state.curveMode);
  }
  if (!readout) return;
  if (!pt) {
    const total = curveOverlay.getCurves().reduce((n, c) => n + c.length, 0);
    readout.textContent = `${total} control points · click the viewport to place a point`;
    return;
  }
  readout.textContent =
    `P${curveOverlay.selectedPointIdx + 1} · x ${pt.x.toFixed(2)} · y ${pt.y.toFixed(2)} · z ${pt.z.toFixed(2)} · r ${(pt.r ?? 1).toFixed(2)}×`;
  if (radSlider) radSlider.value = String(pt.r ?? 1.0);
  if (radOut) radOut.textContent = `${(pt.r ?? 1.0).toFixed(2)}×`;
}

function setCurveMode(flag) {
  state.curveMode = Boolean(flag);
  if (!curveOverlay) return;
  curveOverlay.setEnabled(state.curveMode);
  curveOverlay.setPlaceMode(state.curveMode);
  updateCurveReadout();
}

function initCurveTool() {
  if (!curveOverlay) return;

  document.getElementById('btn-curve-draw').addEventListener('click', () => {
    if (state.studioMode !== 'rock') setStudioMode('rock');
    state.curveMode = !state.curveMode;
    if (state.curveMode) {
      // Start a fresh multi-segment arch: click to place piers and a hanging crown
      curveOverlay.clearForClickDraw(0);
      state.params.customArchCurves = curveOverlay.getCurves();
      setCurveMode(true);
    } else {
      setCurveMode(false);
    }
  });

  document.getElementById('btn-curve-reset').addEventListener('click', () => {
    curveOverlay.setCurves(DEFAULT_CUSTOM_ARCH_CURVES);
    state.params.customArchCurves = curveOverlay.getCurves();
    state.customCurveActive = true;
    setCurveMode(true);
    requestSynthesis(true);
  });

  document.getElementById('btn-curve-branch').addEventListener('click', () => {
    curveOverlay.addBranchArch([0, 0, 3.4], 0.86);
    state.params.customArchCurves = curveOverlay.getCurves();
    state.customCurveActive = true;
    setCurveMode(true);
    requestSynthesis(true);
  });

  document.getElementById('btn-curve-delete').addEventListener('click', () => {
    curveOverlay.deleteSelectedPoint();
    state.params.customArchCurves = curveOverlay.getCurves();
    requestSynthesis(false);
  });

  const radSlider = document.getElementById('slider-curve-radius');
  radSlider.addEventListener('input', () => {
    curveOverlay.setSelectedPointRadius(Number(radSlider.value), false);
    document.getElementById('out-curve-radius').textContent = `${Number(radSlider.value).toFixed(2)}×`;
  });
  radSlider.addEventListener('change', () => {
    curveOverlay.setSelectedPointRadius(Number(radSlider.value), true);
  });

  // Clicking a formation card (or the seed row) clears the custom curve override so presets rule
  document.getElementById('archetype-list').addEventListener('pointerdown', () => {
    if (state.customCurveActive) {
      state.customCurveActive = false;
      delete state.params.customArchCurves;
      setCurveMode(false);
    }
  }, true);

  updateCurveReadout();
}

function initErosionControls() {
  if (!erosionEngine) return;

  buildErosionLandscapeCards();
  buildErosionSliders('particles', 'er-sliders-particles');
  buildErosionSliders('hardness', 'er-sliders-hardness');
  buildErosionSliders('hydraulics', 'er-sliders-hydraulics');
  buildErosionSliders('climate', 'er-sliders-climate');

  document.getElementById('select-emitter-mode').addEventListener('change', (e) => {
    erosionEngine.params.emitterMode = e.target.value;
  });

  document.querySelectorAll('#erosion-brush-buttons button').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#erosion-brush-buttons button').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      erosionEngine.params.brushMode = btn.dataset.brush;
    });
  });

  const radSlider = document.getElementById('slider-brush-radius');
  const radOut = document.getElementById('out-brush-radius');
  radSlider.addEventListener('input', () => {
    const r = Number(radSlider.value);
    erosionEngine.params.brushRadius = r;
    radOut.textContent = `${r}m`;
  });

  const applyErosionSeed = (s) => {
    erosionEngine.params.seed = Math.max(1, Math.floor(Number(s) || 1));
    document.getElementById('input-erosion-seed').value = erosionEngine.params.seed;
    erosionEngine.resetSimulation();
  };

  document.getElementById('btn-erosion-random-seed').addEventListener('click', () => {
    applyErosionSeed(Math.floor(1000 + Math.random() * 9000));
  });
  document.getElementById('btn-erosion-apply-seed').addEventListener('click', () => {
    applyErosionSeed(document.getElementById('input-erosion-seed').value);
  });
  document.getElementById('input-erosion-seed').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') applyErosionSeed(e.target.value);
  });

  document.getElementById('select-erosion-view').addEventListener('change', (e) => {
    erosionEngine.params.viewMode = e.target.value;
  });

  const materialSelect = document.getElementById('select-erosion-material');
  if (materialSelect) {
    materialSelect.value = String(erosionEngine.params.materialTheme ?? 0);
    materialSelect.addEventListener('change', (e) => {
      erosionEngine.params.materialTheme = Number(e.target.value) || 0;
    });
  }

  const erAz = document.getElementById('slider-erosion-sun-az');
  const erEl = document.getElementById('slider-erosion-sun-el');
  erAz.addEventListener('input', () => {
    erosionEngine.params.sunAzimuth = Number(erAz.value);
    document.getElementById('out-erosion-sun-az').textContent = `${erAz.value}°`;
  });
  erEl.addEventListener('input', () => {
    erosionEngine.params.sunElevation = Number(erEl.value);
    document.getElementById('out-erosion-sun-el').textContent = `${erEl.value}°`;
  });

  document.getElementById('chk-erosion-particles').addEventListener('change', (e) => {
    erosionEngine.params.showParticles = e.target.checked;
  });
  document.getElementById('chk-erosion-water').addEventListener('change', (e) => {
    erosionEngine.params.showWater = e.target.checked;
  });

  // Transport Bar Buttons
  const playBtn = document.getElementById('btn-er-play');
  const syncPlayBtn = () => {
    playBtn.textContent = erosionEngine.playing ? '⏸ Pause [Space]' : '▶ Resume [Space]';
    playBtn.classList.toggle('active-play', erosionEngine.playing);
  };

  playBtn.addEventListener('click', () => {
    erosionEngine.playing = !erosionEngine.playing;
    syncPlayBtn();
  });

  document.getElementById('btn-er-burst100').addEventListener('click', () => {
    erosionEngine.stepSimulation(100);
    erosionEngine._sampleTelemetry();
    erosionEngine.renderFrame();
  });

  document.getElementById('btn-er-burst400').addEventListener('click', () => {
    erosionEngine.stepSimulation(400);
    erosionEngine._sampleTelemetry();
    erosionEngine.renderFrame();
  });

  document.getElementById('btn-er-reset').addEventListener('click', () => {
    erosionEngine.resetSimulation();
    erosionEngine.renderFrame();
  });

  document.getElementById('btn-er-frame').addEventListener('click', () => {
    erosionEngine.resetCamera();
  });

  document.getElementById('btn-erosion-reset-params').addEventListener('click', () => {
    erosionEngine.applyLandscapePreset(erosionEngine.params.landscape);
    syncErosionSliders();
  });

  // Export Eroded Terrain Mesh (.GLB / .OBJ)
  document.getElementById('btn-er-export-glb').addEventListener('click', () => {
    const mesh = erosionEngine.extractMeshForExport(2);
    const glb = exportFormationToGLB({
      mesh,
      lithology: 'canyonSand',
      params: { archetype: erosionEngine.params.landscape, seed: erosionEngine.params.seed },
    });
    downloadBlob(
      new Blob([glb], { type: 'model/gltf-binary' }),
      `frontier_eroded_${erosionEngine.params.landscape}_${erosionEngine.stepCount}steps.glb`
    );
  });

  document.getElementById('btn-er-export-obj').addEventListener('click', () => {
    const mesh = erosionEngine.extractMeshForExport(2);
    const objText = exportFormationToOBJ({
      mesh,
      params: { archetype: erosionEngine.params.landscape, seed: erosionEngine.params.seed },
    });
    downloadBlob(
      new Blob([objText], { type: 'text/plain' }),
      `frontier_eroded_${erosionEngine.params.landscape}_${erosionEngine.stepCount}steps.obj`
    );
  });
}

// ============================================================================
// 3D ROCK & CLIFF STUDIO UI WIRING
// ============================================================================

const sliderRefs = new Map();

function buildCategoryFilterBar() {
  const bar = document.getElementById('cat-filter-bar');
  bar.innerHTML = '';
  for (const cat of CATEGORIES) {
    const btn = document.createElement('button');
    btn.className = `cat-pill ${state.categoryFilter === cat ? 'active' : ''}`;
    btn.textContent = cat === 'Fracture Demo' ? 'Cracks' : cat;
    btn.addEventListener('click', () => {
      state.categoryFilter = cat;
      bar.querySelectorAll('.cat-pill').forEach((el) => {
        el.classList.toggle('active', el === btn);
      });
      buildArchetypeCards();
    });
    bar.appendChild(btn);
  }
}

function buildArchetypeCards() {
  const container = document.getElementById('archetype-list');
  container.innerHTML = '';
  for (const preset of Object.values(FORMATION_PRESETS)) {
    if (state.categoryFilter !== 'All' && preset.category !== state.categoryFilter) continue;
    const btn = document.createElement('button');
    btn.className = `arch-card ${preset.id === state.params.archetype ? 'active' : ''}`;
    btn.dataset.id = preset.id;
    btn.innerHTML = `
      <div class="arch-card-top">
        <span class="arch-title">${preset.name}</span>
        <span class="arch-cat">${preset.category}</span>
      </div>
      <span class="arch-sub">${preset.subtitle}</span>
    `;
    btn.addEventListener('click', () => selectArchetype(preset.id));
    container.appendChild(btn);
  }
}

function selectArchetype(archId) {
  const preset = FORMATION_PRESETS[archId];
  if (!preset) return;
  state.params = resolveParams({
    archetype: archId,
    seed: state.params.seed,
    quality: state.params.quality,
    decimation: state.params.decimation,
  });

  document.getElementById('active-category').textContent = preset.category;
  document.querySelectorAll('#archetype-list .arch-card').forEach((el) => {
    el.classList.toggle('active', el.dataset.id === archId);
  });

  syncSlidersFromState();
  requestSynthesis(true);
}

function buildSliders(groupKey, mountId) {
  const mount = document.getElementById(mountId);
  mount.innerHTML = '';
  for (const spec of SLIDER_SCHEMA[groupKey]) {
    const wrap = document.createElement('div');
    wrap.className = 'slider-group';
    const val = state.params[spec.key];
    wrap.innerHTML = `
      <div class="slider-label">
        <span>${spec.label}</span>
        <output>${spec.fmt(val)}</output>
      </div>
      <input type="range" min="${spec.min}" max="${spec.max}" step="${spec.step}" value="${val}" />
    `;
    const input = wrap.querySelector('input');
    const out = wrap.querySelector('output');

    input.addEventListener('input', () => {
      const num = Number(input.value);
      state.params[spec.key] = num;
      out.textContent = spec.fmt(num);
      requestSynthesis(false);
    });

    sliderRefs.set(spec.key, { input, out, spec });
    mount.appendChild(wrap);
  }
}

function syncSlidersFromState() {
  for (const [key, ref] of sliderRefs.entries()) {
    const val = state.params[key];
    ref.input.value = val;
    ref.out.textContent = ref.spec.fmt(val);
  }
}

function buildSeedStrip() {
  const strip = document.getElementById('seed-strip');
  strip.innerHTML = '';
  for (const s of QUICK_SEEDS) {
    const b = document.createElement('button');
    b.className = `seed-chip ${Number(state.params.seed) === s ? 'active' : ''}`;
    b.textContent = `#${s}`;
    b.addEventListener('click', () => setSeed(s));
    strip.appendChild(b);
  }
}

function setSeed(newSeed) {
  state.params.seed = Number(newSeed) || 1;
  document.getElementById('input-seed').value = state.params.seed;
  document.querySelectorAll('.seed-chip').forEach((chip) => {
    chip.classList.toggle('active', chip.textContent === `#${state.params.seed}`);
  });
  requestSynthesis(false);
}

function randomizeSeed() {
  const next = Math.floor(1000 + Math.random() * 9000);
  setSeed(next);
}

function initShadingControls() {
  const lithSelect = document.getElementById('select-lithology');
  for (const [key, pal] of Object.entries(LITHOLOGY_PALETTES)) {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = pal.name;
    lithSelect.appendChild(opt);
  }
  lithSelect.value = 'navajoRed';

  const shadingSelect = document.getElementById('select-shading');
  const rowLith = document.getElementById('row-lithology');
  rowLith.style.display = shadingSelect.value === 'lithology' ? 'flex' : 'none';

  shadingSelect.addEventListener('change', () => {
    const mode = shadingSelect.value;
    rowLith.style.display = mode === 'lithology' ? 'flex' : 'none';
    viewport.setShadingMode(mode);
  });

  lithSelect.addEventListener('change', () => {
    viewport.setLithologyOverride(lithSelect.value);
  });

  const sunAz = document.getElementById('slider-sun-az');
  const sunEl = document.getElementById('slider-sun-el');
  const outAz = document.getElementById('out-sun-az');
  const outEl = document.getElementById('out-sun-el');

  const updateSun = () => {
    const az = Number(sunAz.value);
    const el = Number(sunEl.value);
    outAz.textContent = `${az}°`;
    outEl.textContent = `${el}°`;
    viewport.setSunAngles(az, el);
  };
  sunAz.addEventListener('input', updateSun);
  sunEl.addEventListener('input', updateSun);

  document.getElementById('chk-human').addEventListener('change', (e) => {
    viewport.setScaleHumanVisible(e.target.checked);
  });
  document.getElementById('chk-wireframe').addEventListener('change', (e) => {
    viewport.setWireframe(e.target.checked);
  });
  document.getElementById('chk-turntable').addEventListener('change', (e) => {
    viewport.setTurntable(e.target.checked);
  });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function initActionButtons() {
  document.getElementById('btn-random-seed').addEventListener('click', randomizeSeed);
  document.getElementById('btn-apply-seed').addEventListener('click', () => {
    setSeed(Number(document.getElementById('input-seed').value));
  });
  document.getElementById('input-seed').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') setSeed(Number(e.target.value));
  });

  document.querySelectorAll('#quality-buttons button').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#quality-buttons button').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.params.quality = btn.dataset.q;
      requestSynthesis(false);
    });
  });

  document.getElementById('select-decimation').addEventListener('change', (e) => {
    state.params.decimation = Number(e.target.value);
    requestSynthesis(false);
  });

  document.getElementById('btn-reset-params').addEventListener('click', () => {
    selectArchetype(state.params.archetype);
  });

  document.querySelectorAll('#rock-camera-bar .cam-btn').forEach((btn) => {
    btn.addEventListener('click', () => viewport.frameCamera(btn.dataset.cam));
  });

  document.getElementById('btn-export-glb').addEventListener('click', () => {
    if (!state.latestResult) return;
    const glb = exportFormationToGLB(state.latestResult);
    const fname = `frontier_${state.params.archetype}_${state.params.seed}.glb`;
    downloadBlob(new Blob([glb], { type: 'model/gltf-binary' }), fname);
  });

  document.getElementById('btn-export-obj').addEventListener('click', () => {
    if (!state.latestResult) return;
    const objText = exportFormationToOBJ(state.latestResult);
    const fname = `frontier_${state.params.archetype}_${state.params.seed}.obj`;
    downloadBlob(new Blob([objText], { type: 'text/plain' }), fname);
  });

  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

    if (state.studioMode === 'erosion' && erosionEngine) {
      if (e.key === 'r' || e.key === 'R') {
        erosionEngine.params.seed = Math.floor(1000 + Math.random() * 9000);
        document.getElementById('input-erosion-seed').value = erosionEngine.params.seed;
        erosionEngine.resetSimulation();
      } else if (e.key === 'f' || e.key === 'F') {
        erosionEngine.resetCamera();
      } else if (e.code === 'Space') {
        e.preventDefault();
        document.getElementById('btn-er-play').click();
      }
      return;
    }

    if (e.key === 'r' || e.key === 'R') {
      randomizeSeed();
    } else if (e.key === 'w' || e.key === 'W') {
      const chk = document.getElementById('chk-wireframe');
      chk.checked = !chk.checked;
      viewport.setWireframe(chk.checked);
    } else if (e.key === 'f' || e.key === 'F') {
      viewport.frameCamera('hero');
    } else if (e.code === 'Space') {
      e.preventDefault();
      const chk = document.getElementById('chk-turntable');
      chk.checked = !chk.checked;
      viewport.setTurntable(chk.checked);
    }
  });
}

// Boot both UIs cleanly and activate initial studio mode!
initErosionControls();
buildCategoryFilterBar();
buildArchetypeCards();
buildSliders('tectonics', 'sliders-tectonics');
buildSliders('macro', 'sliders-macro');
buildSliders('detail', 'sliders-detail');
buildSeedStrip();
initShadingControls();
initCurveTool();
initActionButtons();

// Pre-warm initial Rock Studio mesh in background worker so switching tabs is instantaneous!
state.rockInitializedOnce = true;
requestSynthesis(true);

setStudioMode(state.studioMode);

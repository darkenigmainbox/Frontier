/* ============================================================
 * Frontier · SDF Terrain Lab — Main Application & Pipeline
 *
 *   MULTIFRACTAL MOUNTAIN  →  3D SDF SCULPTING  →  HYDRAULIC EROSION  →  SPLATMAPS & EXPORT
 * ============================================================ */

import { buildMountain } from './mountain.js';
import {
  EROSION_PASSES, EROSION_PASS_ORDER, detectWaterBodies,
} from './erosion.js';
import { computeChannels, computeSplatWeights, previewField } from './splats.js';
import { bakeAllTextures } from './textures.js';
import { MATERIALS, getMaterial } from './materials.js';
import { TerrainView } from './terrain.js';
import {
  mkSection, mkSlider, mkSelect, mkCheck, mkSeed, mkReadout, mkStat,
} from './ui.js';
import { SCULPT_TOOLS, applySculptDab, applySculptStroke } from './sculpt.js';
import {
  exportFrontierBinary, exportObjMesh, exportHeightmapPNG, exportHeightmapRaw16, downloadBlob
} from './export.js';

// ---------------------------------------------------------------- params
const P = {
  // mountain
  N: 320, seed: 1337, frequency: 2.4, octaves: 5, gain: 0.48, ridge: 0.38,
  peakHeight: 50, peakRadius: 28, peakSharp: 1.5, warp: 0.55, tilt: 0.42, seaLevel: -7,
  strata: 0.20,

  // sculpt
  tool: 'view', // 'view' | 'ridge' | 'dent' | 'smooth' | 'flatten' | 'chisel' | 'talus'
  brushRadius: 6.0,
  brushStrength: 0.35,
  brushFalloff: 'smooth',

  // hydraulic erosion
  erodeSeed: 42, iterations: 64, diffusion: 0.04, mExp: 0.45, nExp: 1.2,
  erodibility: 0.55, cutFrac: 0.18, sedimentOn: true, microDetail: 0.65,
  particleCount: 25000, antiTunneling: true, strataAmp: 0.35, strataFreq: 0.55,
  passes: {
    fluvial: true,
    particles: true,
    debris: true,
    micro: true,
    strata: true,
    hydraulic: false,
    rivers: false,
    braid: false,
    diffuse: false,
  },

  // splats & materials
  preview: 'blended', snowLine: 28, material: 'alpine',

  // view
  waterOn: true, wireframe: false, autoOrbit: false,
};

const WORLD = 100; // 100 m × 100 m world size

// Presets collection for quick inspiration
const PRESETS = {
  alpine: {
    name: 'Alpine Peak',
    seed: 1337, frequency: 2.4, peakHeight: 52, peakRadius: 28, peakSharp: 1.5,
    ridge: 0.38, warp: 0.55, tilt: 0.42, material: 'alpine', strata: 0.15,
    passes: { fluvial: true, particles: true, debris: true, micro: true, strata: false, hydraulic: false, rivers: false, braid: false, diffuse: false },
  },
  canyon: {
    name: 'Rocky Canyon',
    seed: 8941, frequency: 2.8, peakHeight: 44, peakRadius: 32, peakSharp: 1.3,
    ridge: 0.62, warp: 0.65, tilt: 0.30, material: 'canyon', strata: 0.40,
    passes: { fluvial: true, particles: true, hydraulic: true, strata: true, micro: true, debris: false, rivers: false, braid: false, diffuse: false },
  },
  badlands: {
    name: 'Badlands Terraces',
    seed: 5521, frequency: 3.2, peakHeight: 38, peakRadius: 30, peakSharp: 1.2,
    ridge: 0.45, warp: 0.50, tilt: 0.25, material: 'badlands', strata: 0.55,
    passes: { fluvial: true, strata: true, particles: true, micro: true, debris: true, hydraulic: false, rivers: false, braid: false, diffuse: false },
  },
  volcanic: {
    name: 'Volcanic Caldera',
    seed: 3141, frequency: 2.1, peakHeight: 65, peakRadius: 24, peakSharp: 2.2,
    ridge: 0.25, warp: 0.40, tilt: 0.15, material: 'volcanic', strata: 0.10,
    passes: { fluvial: true, debris: true, particles: true, micro: false, strata: false, hydraulic: false, rivers: false, braid: false, diffuse: false },
  },
};

// ---------------------------------------------------------------- state
const S = {
  baseH: null,      // fresh mountain (pre-erosion / pre-sculpt), Float32Array
  h: null,          // live field (mutated by sculpt / erosion)
  valley: null,     // drainage-valley attractor mask from mountain
  N: 0, voxel: 0,
  channels: null,
  erodeStats: null,
  maps: null,       // shared splat maps: erosion, deposit, points, channels
  lastFlow: null, lastFlowMax: 1,
  lastErosionMap: null, lastDepositMap: null, lastPointsMap: null,
  lastWater: null, waterInfo: null,
  genMs: 0, erodeMs: 0,
  busy: false,
  // Undo/Redo history stack for sculpting & erosion
  undoStack: [],
  redoStack: [],
};

// ---------------------------------------------------------------- DOM
const $ = (id) => document.getElementById(id);
const viewport = $('viewport');
const els = {
  fps: $('fps'), busy: $('busy'), clock: $('clock'), probe: $('probe'),
};

const view = new TerrainView(viewport, {
  onProbe: (p) => {
    els.probe.textContent = p
      ? `x ${p.x.toFixed(1)} m · z ${p.z.toFixed(1)} m · elev ${p.elev.toFixed(2)} m · slope ${p.slope.toFixed(1)}°`
      : 'probe: hover terrain';
  },
  onFps: (f) => { els.fps.textContent = f.toFixed(0) + ' fps'; },
});

// ---------------------------------------------------------------- UI build
const left = $('leftPanel');
const right = $('rightPanel');
const C = {}; // control registry

// ---- Quick Presets Bar ----
{
  const pSec = mkSection(left, 'PRESETS', 'Quick archetypes');
  const pWrap = document.createElement('div');
  pWrap.className = 'preset-bar';
  for (const [key, pre] of Object.entries(PRESETS)) {
    const btn = document.createElement('button');
    btn.className = 'preset-btn';
    btn.textContent = pre.name;
    btn.title = `Load ${pre.name} parameters and pipeline`;
    btn.addEventListener('click', () => loadPreset(key));
    pWrap.appendChild(btn);
  }
  pSec.appendChild(pWrap);
}

// ---- 3D SDF Sculpting Section ----
{
  const b = mkSection(left, '3D SDF SCULPTING', 'Interactive volumetric brushes on terrain');

  // Tool selector grid
  const toolGrid = document.createElement('div');
  toolGrid.className = 'sculpt-grid';

  C.toolBtns = {};

  // View / Orbit button
  const viewBtn = document.createElement('button');
  viewBtn.className = 'sculpt-tool on';
  viewBtn.innerHTML = `
    <span class="tool-name">
      <span class="tool-dot" style="background:#94a3b8"></span>
      Orbit / View
    </span>
    <kbd>1</kbd>
  `;
  viewBtn.title = 'Camera Orbit mode (1)';
  viewBtn.addEventListener('click', () => setTool('view'));
  toolGrid.appendChild(viewBtn);
  C.toolBtns['view'] = viewBtn;

  // Sculpt tools
  for (const [id, tool] of Object.entries(SCULPT_TOOLS)) {
    const btn = document.createElement('button');
    btn.className = 'sculpt-tool';
    btn.innerHTML = `
      <span class="tool-name">
        <span class="tool-dot" style="background:${tool.color}"></span>
        ${tool.name}
      </span>
      <kbd>${tool.key}</kbd>
    `;
    btn.title = `${tool.desc} (${tool.key})`;
    btn.addEventListener('click', () => setTool(id));
    toolGrid.appendChild(btn);
    C.toolBtns[id] = btn;
  }
  b.appendChild(toolGrid);

  // Brush controls
  C.brushRadius = mkSlider(b, {
    id: 'brushRadius', label: 'Brush radius', min: 1.5, max: 24, step: 0.5,
    value: P.brushRadius, unit: ' m'
  });
  C.brushStrength = mkSlider(b, {
    id: 'brushStrength', label: 'Brush strength', min: 0.05, max: 1.0, step: 0.05,
    value: P.brushStrength
  });
  C.brushFalloff = mkSelect(b, {
    id: 'brushFalloff', label: 'Brush falloff', value: P.brushFalloff,
    options: [
      ['smooth', 'Smooth Hermite (cos²)'],
      ['sharp', 'Sharp Linear (cone)'],
      ['flat', 'Flat Top (steep wall)'],
    ],
  });

  // Sculpt action buttons (Undo / Redo / Reset)
  const actWrap = document.createElement('div');
  actWrap.className = 'sculpt-actions';

  const btnUndo = document.createElement('button');
  btnUndo.className = 'sculpt-action-btn';
  btnUndo.innerHTML = '↶ Undo <kbd class="small">^Z</kbd>';
  btnUndo.disabled = true;
  btnUndo.addEventListener('click', undoSculpt);
  actWrap.appendChild(btnUndo);
  C.btnUndo = btnUndo;

  const btnRedo = document.createElement('button');
  btnRedo.className = 'sculpt-action-btn';
  btnRedo.innerHTML = '↷ Redo <kbd class="small">^Y</kbd>';
  btnRedo.disabled = true;
  btnRedo.addEventListener('click', redoSculpt);
  actWrap.appendChild(btnRedo);
  C.btnRedo = btnRedo;

  const btnReset = document.createElement('button');
  btnReset.className = 'sculpt-action-btn';
  btnReset.textContent = '↺ Reset Edits';
  btnReset.title = 'Revert all sculpt edits to the pre-sculpted state';
  btnReset.addEventListener('click', resetSculpt);
  actWrap.appendChild(btnReset);

  b.appendChild(actWrap);
}

// ---- Mountain section ----
{
  const b = mkSection(left, 'MOUNTAIN · MULTIFRACTAL', 'fBm gradient noise + peak gradient');
  C.seed = mkSeed(b, { id: 'seed', label: 'Seed', value: P.seed });
  C.N = mkSelect(b, {
    id: 'N', label: 'Grid (100 m × 100 m)', value: P.N,
    options: [[160, '160 × 160'], [224, '224 × 224'], [320, '320 × 320'], [384, '384 × 384'], [448, '448 × 448'], [512, '512 × 512 (fine)']],
  });
  C.voxelRo = mkReadout(b, 'Voxel size');
  C.frequency = mkSlider(b, { id: 'frequency', label: 'Feature frequency', min: 1, max: 8, step: 0.1, value: P.frequency });
  C.octaves = mkSlider(b, { id: 'octaves', label: 'Octaves', min: 2, max: 8, step: 1, value: P.octaves });
  C.gain = mkSlider(b, { id: 'gain', label: 'Multifractal gain', min: 0.3, max: 0.65, step: 0.01, value: P.gain });
  C.ridge = mkSlider(b, { id: 'ridge', label: 'Ridged blend', min: 0, max: 1, step: 0.05, value: P.ridge });
  C.peakHeight = mkSlider(b, { id: 'peakHeight', label: 'Peak height', min: 15, max: 90, step: 1, value: P.peakHeight, unit: ' m' });
  C.peakRadius = mkSlider(b, { id: 'peakRadius', label: 'Peak radius', min: 14, max: 40, step: 1, value: P.peakRadius, unit: ' m' });
  C.peakSharp = mkSlider(b, { id: 'peakSharp', label: 'Peak gradient', min: 0.9, max: 2.6, step: 0.05, value: P.peakSharp });
  C.strata = mkSlider(b, { id: 'strata', label: 'Rock strata / ledges', min: 0, max: 0.8, step: 0.05, value: P.strata });
  C.warp = mkSlider(b, { id: 'warp', label: 'Domain warp', min: 0, max: 1, step: 0.05, value: P.warp });
  C.tilt = mkSlider(b, { id: 'tilt', label: 'Flank tilt', min: 0, max: 1, step: 0.05, value: P.tilt });
  C.seaLevel = mkSlider(b, { id: 'seaLevel', label: 'Sea level', min: -14, max: 0, step: 0.5, value: P.seaLevel, unit: ' m' });
}

// ---- Splatmaps section ----
{
  const b = mkSection(left, 'SPLATMAPS', 'Gaea-style channels → 5 layers');
  C.preview = mkSelect(b, {
    id: 'preview', label: 'Channel preview', value: P.preview,
    options: [
      ['blended', 'Blended albedo'], ['height', 'Height'], ['slope', 'Slope'],
      ['curvature', 'Curvature'], ['flow', 'Flow'], ['erosion', 'Erosion'],
      ['sediment', 'Sediment'], ['channels', 'Fine channels'], ['peaks', 'Peaks'], ['points', 'Points'],
      ['water', 'Water bodies'],
    ],
  });
  C.snowLine = mkSlider(b, { id: 'snowLine', label: 'Snow line', min: 15, max: 60, step: 1, value: P.snowLine, unit: ' m' });
}

// ---- Material library section (splatmap presets) ----
{
  const b = mkSection(left, 'MATERIAL LIBRARY', 'pick a look — re-bakes albedo + splats');
  const wrap = document.createElement('div');
  wrap.className = 'matgrid';
  MATERIALS.forEach((m) => {
    const btn = document.createElement('button');
    btn.className = 'mat' + (m.id === P.material ? ' on' : '');
    btn.dataset.id = m.id;
    btn.title = m.desc;
    const sw = document.createElement('span');
    sw.className = 'sw';
    sw.style.background = `linear-gradient(135deg,
      rgb(${m.palette.grass[1]}) 0 30%, rgb(${m.palette.dirt[1]}) 30% 55%,
      rgb(${m.palette.rock[1]}) 55% 80%, rgb(${m.palette.snow[1]}) 80% 100%)`;
    const nm = document.createElement('span');
    nm.className = 'nm';
    nm.textContent = m.name;
    btn.appendChild(sw);
    btn.appendChild(nm);
    btn.addEventListener('click', () => applyMaterial(m.id, btn));
    wrap.appendChild(btn);
  });
  b.appendChild(wrap);
}

// ---- Hydraulic Erosion section ----
{
  const b = mkSection(left, 'HYDRAULIC EROSION', 'SDF-domain · particles + stream power + strata');
  C.erodeSeed = mkSeed(b, { id: 'erodeSeed', label: 'Erosion seed', value: P.erodeSeed });
  C.iterations = mkSlider(b, { id: 'iterations', label: 'Stream power passes', min: 8, max: 128, step: 4, value: P.iterations, fmt: (v) => v + '×' });
  C.diffusion = mkSlider(b, { id: 'diffusion', label: 'Selective diffusion', min: 0.01, max: 0.20, step: 0.01, value: P.diffusion, fmt: (v) => v.toFixed(2), hint: 'edge-preserving: keeps cliffs sharp' });
  C.erodibility = mkSlider(b, { id: 'erodibility', label: 'Erodibility', min: 0.1, max: 1, step: 0.05, value: P.erodibility });
  C.cutFrac = mkSlider(b, { id: 'cutFrac', label: 'Max cut / step', min: 0.05, max: 0.45, step: 0.01, value: P.cutFrac, fmt: (v) => (v * 100).toFixed(0) + '% vox' });
  C.cutRo = mkReadout(b, 'Cut ↔ voxel match');

  // Particle hydraulic erosion specific controls
  C.particleCount = mkSlider(b, { id: 'particleCount', label: 'Particle droplets', min: 5000, max: 75000, step: 5000, value: P.particleCount, fmt: (v) => (v / 1000).toFixed(0) + 'k drops' });
  C.antiTunneling = mkCheck(b, { id: 'antiTunneling', label: 'Anti-tunneling physics', value: P.antiTunneling, hint: 'depth resistance + pit filling' });
  C.sedimentOn = mkCheck(b, { id: 'sedimentOn', label: 'Sedimentation', value: P.sedimentOn, hint: 'capacity routing + alluvial fans' });
  C.microDetail = mkSlider(b, { id: 'microDetail', label: 'Micro channels', min: 0, max: 1, step: 0.05, value: P.microDetail, fmt: (v) => Math.round(v * 100) + '%', unit: '' });

  // Pass stack (Gaea-style)
  const ph = document.createElement('div');
  ph.className = 'passhead';
  ph.innerHTML = '<span>EROSION PASSES</span><span class="sub">tick = in pipeline · ▶ simulate on terrain</span>';
  b.appendChild(ph);

  C.passBtns = {};
  for (const id of EROSION_PASS_ORDER) {
    const p = EROSION_PASSES[id];
    const row = document.createElement('div');
    row.className = 'passrow';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'passcb';
    cb.checked = P.passes[id] ?? false;
    cb.title = 'Include in the Run Erosion pipeline';
    cb.addEventListener('change', () => { P.passes[id] = cb.checked; });
    const btn = document.createElement('button');
    btn.className = 'passbtn';
    btn.textContent = 'Simulate';
    btn.title = p.desc + ' — runs on the CURRENT terrain (no reset).';
    btn.addEventListener('click', () => simulatePass(id));
    const nm = document.createElement('span');
    nm.className = 'passname';
    nm.textContent = p.name;
    nm.title = p.desc;
    row.appendChild(cb);
    row.appendChild(btn);
    row.appendChild(nm);
    b.appendChild(row);
    C.passBtns[id] = { cb, btn };
  }
}

// ---- View section ----
{
  const b = mkSection(left, 'VIEW');
  C.waterOn = mkCheck(b, { id: 'waterOn', label: 'Water plane', value: P.waterOn });
  C.wireframe = mkCheck(b, { id: 'wireframe', label: 'Wireframe (voxels)', value: P.wireframe });
  C.autoOrbit = mkCheck(b, { id: 'autoOrbit', label: 'Auto orbit', value: P.autoOrbit });
}

// ---- right panel: stats & exports ----
const stats = {};
{
  const t = mkSection(right, 'TERRAIN', '100 m × 100 m');
  stats.grid = mkStat(t, 'Grid');
  stats.voxel = mkStat(t, 'Voxel');
  stats.verts = mkStat(t, 'Vertices');
  stats.tris = mkStat(t, 'Triangles');
  stats.minH = mkStat(t, 'Min elev');
  stats.maxH = mkStat(t, 'Max elev');
  stats.meanH = mkStat(t, 'Mean elev');

  const e = mkSection(right, 'EROSION STATS');
  stats.carved = mkStat(e, 'Carved');
  stats.deposited = mkStat(e, 'Deposited');
  stats.iters = mkStat(e, 'Passes run');
  stats.flowMax = mkStat(e, 'Max flow (cells)');
  stats.water = mkStat(e, 'Water bodies');
  stats.genMs = mkStat(e, 'Mountain time');
  stats.erodeMs = mkStat(e, 'Erosion time');

  const h = mkSection(right, 'ELEVATION HISTOGRAM');
  const cv = document.createElement('canvas');
  cv.id = 'histCanvas';
  cv.width = 232; cv.height = 88;
  h.appendChild(cv);

  // Engine Export Section
  const expSec = mkSection(right, 'ENGINE EXPORT', 'Signed Distance Field & Assets');
  const expGrid = document.createElement('div');
  expGrid.className = 'export-grid';

  const btnFrontier = document.createElement('button');
  btnFrontier.className = 'export-btn';
  btnFrontier.innerHTML = '<span>.frontier Volume</span><span class="tag">3D SDF</span>';
  btnFrontier.title = 'Export binary 3D signed distance volume for game engine';
  btnFrontier.addEventListener('click', handleExportFrontier);
  expGrid.appendChild(btnFrontier);

  const btnObj = document.createElement('button');
  btnObj.className = 'export-btn';
  btnObj.innerHTML = '<span>Wavefront OBJ</span><span class="tag">MESH</span>';
  btnObj.title = 'Export 3D triangle mesh with normals and UV coordinates';
  btnObj.addEventListener('click', handleExportObj);
  expGrid.appendChild(btnObj);

  const btnPng = document.createElement('button');
  btnPng.className = 'export-btn';
  btnPng.innerHTML = '<span>Heightmap PNG</span><span class="tag">16-BIT</span>';
  btnPng.title = 'Export grayscale heightfield image';
  btnPng.addEventListener('click', handleExportPNG);
  expGrid.appendChild(btnPng);

  const btnJson = document.createElement('button');
  btnJson.className = 'export-btn';
  btnJson.innerHTML = '<span>Document Preset</span><span class="tag">JSON</span>';
  btnJson.title = 'Export configuration and seed for reproducible bake';
  btnJson.addEventListener('click', handleExportJSON);
  expGrid.appendChild(btnJson);

  expSec.appendChild(expGrid);
}

// ---------------------------------------------------------------- helpers
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

function setBusy(txt) {
  S.busy = true;
  els.busy.textContent = txt || 'working…';
  els.busy.classList.add('on');
  document.body.classList.add('working');
}
function clearBusy() {
  S.busy = false;
  els.busy.textContent = '';
  els.busy.classList.remove('on');
  document.body.classList.remove('working');
}

function updateVoxelReadouts() {
  const voxel = WORLD / (P.N - 1);
  C.voxelRo.set((voxel * 100).toFixed(2) + ' cm');
  const cut = voxel * P.cutFrac;
  C.cutRo.set(`${(cut * 100).toFixed(1)} cm = ${(P.cutFrac * 100).toFixed(0)}% of voxel`);
}

function baseChannels() {
  const size = S.N * S.N;
  return {
    h: S.h,
    slope: new Float32Array(size),
    slopeRef: 1.0,
    curv: new Float32Array(size),
    flowN: new Float32Array(size),
    erosionN: new Float32Array(size),
    sedimentN: new Float32Array(size),
    channelsN: new Float32Array(size),
    peaks: new Float32Array(size),
    pointsN: new Float32Array(size),
  };
}

function freshMaps() {
  const size = S.N * S.N;
  return {
    erosionMap: new Float32Array(size),
    depositMap: new Float32Array(size),
    pointsMap: new Float32Array(size),
    channelsMap: new Float32Array(size),
  };
}

function passCfg(extra = {}) {
  return {
    h: S.h,
    baseH: S.baseH,
    N: S.N,
    voxel: S.voxel,
    seed: P.erodeSeed,
    seaLevel: P.seaLevel,
    valley: S.valley,
    iterations: P.iterations,
    diffusion: P.diffusion,
    mExp: P.mExp,
    nExp: P.nExp,
    erodibility: P.erodibility,
    cutFraction: P.cutFrac,
    sedimentOn: P.sedimentOn,
    detail: P.microDetail,
    particles: P.particleCount,
    antiTunneling: P.antiTunneling,
    strataAmp: P.strataAmp,
    strataFreq: P.strataFreq,
    maps: S.maps,
    ...extra,
  };
}

// Refresh water bodies + splat channels + mesh after erosion work.
function postErosion() {
  const wb = detectWaterBodies(S.h, S.N, S.lastFlow, P.seaLevel, { voxel: S.voxel });
  S.lastWater = wb.water;
  S.waterInfo = { lakes: wb.lakeCount, rivers: wb.riverCount };
  S.channels = computeChannels({
    h: S.h, N: S.N, voxel: S.voxel,
    flow: S.lastFlow, flowMax: S.lastFlowMax, pits: null,
    erosionMap: S.maps.erosionMap, depositMap: S.maps.depositMap,
    pointsMap: S.maps.pointsMap, channelsMap: S.maps.channelsMap,
  });
  rebuildMesh();
  updateErosionStats();
}

function rebuildMesh() {
  if (!S.h) return;
  let pf = null;
  if (P.preview !== 'blended') {
    pf = P.preview === 'water' ? S.lastWater : previewField(P.preview, S.channels);
  }
  view.rebuild({
    h: S.h, N: S.N, voxel: S.voxel,
    weights: computeSplatWeights({
      channels: S.channels, h: S.h, N: S.N, seaLevel: P.seaLevel, snowLine: P.snowLine,
      mat: getMaterial(P.material)
    }),
    channels: S.channels,
    previewField: pf,
    seaLevel: P.seaLevel,
    water: S.lastWater,
  });
  drawHistogram();
  updateTerrainStats();
}

function updateTerrainStats() {
  if (!S.h) return;
  let min = Infinity, max = -Infinity, sum = 0;
  for (let i = 0; i < S.h.length; i++) {
    const v = S.h[i];
    if (v < min) min = v;
    if (v > max) max = v;
    sum += v;
  }
  stats.grid.set(`${S.N} × ${S.N}`);
  stats.voxel.set((S.voxel * 100).toFixed(2) + ' cm');
  stats.verts.set((S.N * S.N).toLocaleString());
  stats.tris.set(((S.N - 1) * (S.N - 1) * 2).toLocaleString());
  stats.minH.set(min.toFixed(2) + ' m');
  stats.maxH.set(max.toFixed(2) + ' m');
  stats.meanH.set((sum / S.h.length).toFixed(2) + ' m');
}

function updateErosionStats() {
  const s = S.erodeStats;
  stats.carved.set(s ? s.carvedM3.toLocaleString(undefined, { maximumFractionDigits: 0 }) + ' m³' : '—');
  stats.deposited.set(s ? s.depositedM3.toLocaleString(undefined, { maximumFractionDigits: 0 }) + ' m³' : '—');
  stats.iters.set(s && s.passes ? s.passes + (s.passes === 1 ? ' pass' : ' passes') : '—');
  stats.flowMax.set(s && s.flowMax ? s.flowMax.toLocaleString() : '—');
  const wi = S.waterInfo;
  stats.water.set(wi ? `${wi.lakes} lakes · ${wi.rivers} rivers` : '—');
  stats.genMs.set(S.genMs ? S.genMs.toFixed(0) + ' ms' : '—');
  stats.erodeMs.set(S.erodeMs ? S.erodeMs.toFixed(0) + ' ms' : '—');
}

function drawHistogram() {
  const cv = document.getElementById('histCanvas');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  ctx.clearRect(0, 0, W, H);
  if (!S.h) return;
  let min = Infinity, max = -Infinity;
  for (let i = 0; i < S.h.length; i++) {
    const v = S.h[i];
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const span = Math.max(max - min, 1e-6);
  const B = 96;
  const bins = new Float32Array(B);
  for (let i = 0; i < S.h.length; i++) {
    const k = Math.min(B - 1, ((S.h[i] - min) / span * B) | 0);
    bins[k]++;
  }
  let bmax = 0;
  for (let k = 0; k < B; k++) if (bins[k] > bmax) bmax = bins[k];
  const barW = W / B;
  for (let k = 0; k < B; k++) {
    const v = bins[k] / bmax;
    const hgt = v * (H - 14);
    const hue = 195 - (k / B) * 150;
    ctx.fillStyle = `hsl(${hue} 45% ${30 + v * 35}%)`;
    ctx.fillRect(k * barW, H - 8 - hgt, Math.max(1, barW - 1), hgt);
  }
  // sea level marker
  const seaY = H - 8 - ((0 - min) / span) * (H - 14);
  if (seaY > 0 && seaY < H - 8) {
    ctx.strokeStyle = 'rgba(120, 190, 255, 0.8)';
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(0, seaY); ctx.lineTo(W, seaY); ctx.stroke();
    ctx.setLineDash([]);
  }
  // snow line marker
  const snowY = H - 8 - ((P.snowLine - min) / span) * (H - 14);
  if (snowY > 0 && snowY < H - 8) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.setLineDash([2, 4]);
    ctx.beginPath(); ctx.moveTo(0, snowY); ctx.lineTo(W, snowY); ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.fillStyle = 'rgba(200, 214, 228, 0.75)';
  ctx.font = '9px monospace';
  ctx.fillText(min.toFixed(0) + ' m', 2, 9);
  ctx.textAlign = 'right';
  ctx.fillText(max.toFixed(0) + ' m', W - 2, 9);
  ctx.textAlign = 'left';
}

// ---------------------------------------------------------------- sculpt tool integration
function setTool(toolId) {
  P.tool = toolId;
  const toolInfo = SCULPT_TOOLS[toolId];
  const color = toolInfo ? toolInfo.color : '#94a3b8';

  Object.entries(C.toolBtns).forEach(([k, btn]) => {
    btn.classList.toggle('on', k === toolId);
  });

  view.setActiveTool(toolId, color);
}

function updateUndoRedoButtons() {
  C.btnUndo.disabled = S.undoStack.length === 0;
  C.btnRedo.disabled = S.redoStack.length === 0;
}

function pushUndoSnapshot() {
  if (!S.h) return;
  S.undoStack.push(S.h.slice());
  if (S.undoStack.length > 25) S.undoStack.shift();
  S.redoStack = [];
  updateUndoRedoButtons();
}

function undoSculpt() {
  if (S.undoStack.length === 0) return;
  S.redoStack.push(S.h.slice());
  const prev = S.undoStack.pop();
  S.h.set(prev);
  updateUndoRedoButtons();
  liveRebuild();
}

function redoSculpt() {
  if (S.redoStack.length === 0) return;
  S.undoStack.push(S.h.slice());
  const next = S.redoStack.pop();
  S.h.set(next);
  updateUndoRedoButtons();
  liveRebuild();
}

function resetSculpt() {
  if (!S.baseH) return;
  pushUndoSnapshot();
  S.h.set(S.baseH);
  liveRebuild();
}

// Set up 3D view sculpt callbacks
let preStrokeSnapshot = null;

view.setSculptCallbacks({
  onStart: (point, targetElevation) => {
    if (!S.h || P.tool === 'view') return;
    preStrokeSnapshot = S.h.slice();

    applySculptDab({
      h: S.h,
      baseH: S.baseH,
      N: S.N,
      voxel: S.voxel,
      cx: point.x,
      cz: point.z,
      tool: P.tool,
      radius: P.brushRadius,
      strength: P.brushStrength,
      falloff: P.brushFalloff,
      targetH: targetElevation,
      seed: P.seed,
      erosionMap: S.maps ? S.maps.erosionMap : null,
      depositMap: S.maps ? S.maps.depositMap : null,
    });
    view.updateHeights(S.h);
  },
  onStroke: (p0, p1, targetElevation) => {
    if (!S.h || P.tool === 'view') return;

    applySculptStroke({
      h: S.h,
      baseH: S.baseH,
      N: S.N,
      voxel: S.voxel,
      p0,
      p1,
      tool: P.tool,
      radius: P.brushRadius,
      strength: P.brushStrength,
      falloff: P.brushFalloff,
      targetH: targetElevation,
      seed: P.seed,
      erosionMap: S.maps ? S.maps.erosionMap : null,
      depositMap: S.maps ? S.maps.depositMap : null,
    });
    view.updateHeights(S.h);
  },
  onEnd: () => {
    if (preStrokeSnapshot) {
      S.undoStack.push(preStrokeSnapshot);
      if (S.undoStack.length > 25) S.undoStack.shift();
      S.redoStack = [];
      preStrokeSnapshot = null;
      updateUndoRedoButtons();
    }
    // Update splats and normals after stroke finish
    liveRebuild();
  },
});

// ---------------------------------------------------------------- pipeline execution
async function generateMountain() {
  setBusy('building mountain…');
  await nextFrame();
  const t0 = performance.now();
  const m = buildMountain({
    N: P.N, worldSize: WORLD, seed: P.seed,
    frequency: P.frequency, octaves: P.octaves, gain: P.gain, ridge: P.ridge,
    peakHeight: P.peakHeight, peakRadius: P.peakRadius, peakSharp: P.peakSharp,
    strata: P.strata, warp: P.warp, tilt: P.tilt, seaLevel: P.seaLevel,
  });
  S.baseH = m.h.slice();
  S.h = m.h;
  S.valley = m.valley;
  S.N = m.N;
  S.voxel = m.voxel;
  S.genMs = performance.now() - t0;
  S.erodeStats = null;
  S.lastFlow = null; S.lastFlowMax = 1;
  S.lastErosionMap = null; S.lastDepositMap = null; S.lastPointsMap = null;
  S.lastWater = null; S.waterInfo = null;
  S.maps = freshMaps();
  S.undoStack = [];
  S.redoStack = [];
  updateUndoRedoButtons();

  setBusy('computing splat channels…');
  await nextFrame();
  S.channels = baseChannels();
  updateVoxelReadouts();
  rebuildMesh();
  updateErosionStats();
  clearBusy();
}

async function runErosionPipeline() {
  if (!S.h || S.busy) return;
  const ids = EROSION_PASS_ORDER.filter((id) => P.passes[id]);
  if (!ids.length) { setBusy('no passes enabled'); await nextFrame(); clearBusy(); return; }

  pushUndoSnapshot();

  // Reset to fresh base mountain for reproducible pipeline run
  S.h = S.baseH.slice();
  S.maps = freshMaps();

  const t0 = performance.now();
  let carved = 0, deposited = 0;
  for (let pi = 0; pi < ids.length; pi++) {
    const id = ids[pi];
    const p = EROSION_PASSES[id];
    setBusy(`${p.name}: simulating… (${pi + 1}/${ids.length})`);
    await nextFrame();
    const r = await p.fn(passCfg({
      yieldControl: (i, n) => { setBusy(`${p.name}: ${i}/${n}…`); return nextFrame(); },
    }));
    carved += r.carvedM3;
    deposited += r.depositedM3;
    S.lastFlow = r.flow; S.lastFlowMax = r.flowMax;
  }
  S.erodeMs = performance.now() - t0;
  S.erodeStats = {
    carvedM3: carved, depositedM3: deposited,
    flowMax: S.lastFlowMax, passes: ids.length,
  };
  S.lastErosionMap = S.maps.erosionMap; S.lastDepositMap = S.maps.depositMap; S.lastPointsMap = S.maps.pointsMap;

  setBusy('computing splat channels…');
  await nextFrame();
  postErosion();
  clearBusy();
}

// Simulate ONE pass on the CURRENT terrain (no reset, maps keep accumulating)
async function simulatePass(id) {
  if (!S.h || S.busy) return;
  const p = EROSION_PASSES[id];
  if (!S.maps) S.maps = freshMaps();

  pushUndoSnapshot();

  setBusy(`${p.name}: simulating…`);
  await nextFrame();
  const t0 = performance.now();
  const r = await p.fn(passCfg({
    yieldControl: (i, n) => { setBusy(`${p.name}: ${i}/${n}…`); return nextFrame(); },
  }));
  const dt = performance.now() - t0;
  S.lastFlow = r.flow; S.lastFlowMax = r.flowMax;
  S.lastErosionMap = S.maps.erosionMap; S.lastDepositMap = S.maps.depositMap; S.lastPointsMap = S.maps.pointsMap;
  S.erodeStats = (S.erodeStats || { passes: 0 });
  S.erodeStats.carvedM3 = (S.erodeStats.carvedM3 || 0) + r.carvedM3;
  S.erodeStats.depositedM3 = (S.erodeStats.depositedM3 || 0) + r.depositedM3;
  S.erodeStats.passes = (S.erodeStats.passes || 0) + 1;
  S.erodeMs = (S.erodeMs || 0) + dt;
  setBusy(`${p.name} done — rebuilding…`);
  await nextFrame();
  postErosion();
  clearBusy();
  console.log(`[Frontier] pass "${p.name}" simulated in ${dt.toFixed(0)} ms`);
}

async function applyMaterial(id, btn) {
  if (S.busy) return;
  const mat = getMaterial(id);
  P.material = id;
  document.querySelectorAll('.mat').forEach((b) => b.classList.toggle('on', b === btn));
  setBusy(`baking ${mat.name} textures…`);
  await nextFrame();
  const t0 = performance.now();
  const textures = bakeAllTextures(P.seed, mat.palette, (name, p) => {
    els.busy.textContent = `baking ${mat.name} — ${name} ${(p * 100) | 0}%`;
  });
  view.setTextures(textures);
  view.setMaterialShader(mat);
  console.log(`[Frontier] material "${mat.name}" baked in ${(performance.now() - t0).toFixed(0)} ms`);
  if (S.h) liveRebuild();
  clearBusy();
}

async function loadPreset(key) {
  if (S.busy || !PRESETS[key]) return;
  const pre = PRESETS[key];
  setBusy(`loading preset: ${pre.name}…`);
  await nextFrame();

  P.seed = pre.seed; C.seed.set(pre.seed);
  P.frequency = pre.frequency; C.frequency.set(pre.frequency);
  P.peakHeight = pre.peakHeight; C.peakHeight.set(pre.peakHeight);
  P.peakRadius = pre.peakRadius; C.peakRadius.set(pre.peakRadius);
  P.peakSharp = pre.peakSharp; C.peakSharp.set(pre.peakSharp);
  P.ridge = pre.ridge; C.ridge.set(pre.ridge);
  P.warp = pre.warp; C.warp.set(pre.warp);
  P.tilt = pre.tilt; C.tilt.set(pre.tilt);
  P.strata = pre.strata; C.strata.set(pre.strata);

  // Update pass stack checkboxes
  for (const id of EROSION_PASS_ORDER) {
    const on = pre.passes[id] ?? false;
    P.passes[id] = on;
    if (C.passBtns[id]) C.passBtns[id].cb.checked = on;
  }

  // Set material
  const matBtn = document.querySelector(`.mat[data-id="${pre.material}"]`);
  await applyMaterial(pre.material, matBtn);

  // Run full pipeline
  await fullPipeline();
  clearBusy();
}

async function fullPipeline() {
  if (S.busy) return;
  const t0 = performance.now();
  await generateMountain();
  await runErosionPipeline();
  els.clock.textContent = ((performance.now() - t0) / 1000).toFixed(2) + ' s pipeline';
}

// ---------------------------------------------------------------- exporters
async function handleExportFrontier() {
  if (!S.h) return;
  setBusy('packing .frontier binary SDF volume…');
  await nextFrame();
  const minH = parseFloat(stats.minH.get()) || -10;
  const maxH = parseFloat(stats.maxH.get()) || 40;
  const blob = exportFrontierBinary({
    h: S.h, N: S.N, voxel: S.voxel, worldSize: WORLD, seaLevel: P.seaLevel,
    minH, maxH, flow: S.lastFlow, depositMap: S.maps ? S.maps.depositMap : null,
    settings: {
      seed: P.seed,
      material: P.material,
      peakHeight: P.peakHeight,
      erodibility: P.erodibility,
    },
  });
  downloadBlob(blob, `terrain_${P.material}_${S.N}.frontier`);
  clearBusy();
}

async function handleExportObj() {
  if (!S.h) return;
  setBusy('generating Wavefront OBJ mesh…');
  await nextFrame();
  const blob = exportObjMesh({
    h: S.h, N: S.N, voxel: S.voxel, worldSize: WORLD, step: S.N > 320 ? 2 : 1
  });
  downloadBlob(blob, `terrain_${P.material}_${S.N}.obj`);
  clearBusy();
}

async function handleExportPNG() {
  if (!S.h) return;
  setBusy('rendering 16-bit heightmap PNG…');
  await nextFrame();
  let min = Infinity, max = -Infinity;
  for (let v of S.h) { if (v < min) min = v; if (v > max) max = v; }
  const blob = await exportHeightmapPNG({ h: S.h, N: S.N, minH: min, maxH: max });
  downloadBlob(blob, `heightmap_${S.N}.png`);
  clearBusy();
}

function handleExportJSON() {
  const doc = {
    generator: 'Frontier SDF Terrain Studio',
    version: '3.0',
    date: new Date().toISOString(),
    parameters: P,
    stats: S.erodeStats,
  };
  const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `terrain_settings_${P.seed}.json`);
}

// ---------------------------------------------------------------- wiring
function bindChange(id, fn) {
  const el = C[id].row;
  el.addEventListener('ui:change', (e) => {
    P[id] = e.detail.value;
    fn && fn(e.detail.value);
  });
}

// Rebuild channels without discarding the last erosion's flow/erosion fields.
const liveRebuild = () => {
  if (!S.h) return;
  S.channels = computeChannels({
    h: S.h, N: S.N, voxel: S.voxel,
    flow: S.lastFlow, flowMax: S.lastFlowMax,
    erosionMap: S.lastErosionMap, depositMap: S.lastDepositMap, pointsMap: S.lastPointsMap,
    channelsMap: S.maps ? S.maps.channelsMap : null,
  });
  rebuildMesh();
};

bindChange('seed');
bindChange('N', () => updateVoxelReadouts());
bindChange('frequency');
bindChange('octaves');
bindChange('gain');
bindChange('ridge');
bindChange('peakHeight');
bindChange('peakRadius');
bindChange('peakSharp');
bindChange('strata');
bindChange('warp');
bindChange('tilt');
bindChange('seaLevel', () => { view.setWaterVisible(P.waterOn); if (S.h) rebuildMesh(); });

// Sculpt controls
bindChange('brushRadius', (v) => view.setBrushRadius(v));
bindChange('brushStrength', (v) => view.setBrushStrength(v));
bindChange('brushFalloff', (v) => view.setBrushFalloff(v));

// Erosion controls
bindChange('erodeSeed');
bindChange('iterations');
bindChange('diffusion');
bindChange('particleCount');
bindChange('antiTunneling');
bindChange('erodibility');
bindChange('microDetail');
bindChange('cutFrac', () => updateVoxelReadouts());
bindChange('sedimentOn');

bindChange('preview', () => { if (S.h) rebuildMesh(); });
bindChange('snowLine', liveRebuild);
bindChange('waterOn', (v) => view.setWaterVisible(v));
bindChange('wireframe', (v) => view.setWireframe(v));
bindChange('autoOrbit', (v) => view.setAutoOrbit(v));

$('btnGenerate').addEventListener('click', generateMountain);
$('btnErode').addEventListener('click', runErosionPipeline);
$('btnFull').addEventListener('click', fullPipeline);
$('btnCamera').addEventListener('click', () => view.resetCamera());

window.addEventListener('keydown', (e) => {
  if (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;

  // Shortcuts with Ctrl / Cmd
  if (e.ctrlKey || e.metaKey) {
    if (e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) redoSculpt();
      else undoSculpt();
      return;
    } else if (e.key.toLowerCase() === 'y') {
      e.preventDefault();
      redoSculpt();
      return;
    }
  }

  const k = e.key.toLowerCase();
  if (k === '1') setTool('view');
  else if (k === '2') setTool('ridge');
  else if (k === '3') setTool('dent');
  else if (k === '4') setTool('smooth');
  else if (k === '5') setTool('flatten');
  else if (k === '6') setTool('chisel');
  else if (k === '7') setTool('talus');
  else if (k === 'g') generateMountain();
  else if (k === 'e') runErosionPipeline();
  else if (k === 'p') fullPipeline();
  else if (k === 'r') view.resetCamera();
  else if (k === 'w') { P.wireframe = !P.wireframe; C.wireframe.set(P.wireframe); view.setWireframe(P.wireframe); }
  else if (k === ' ') { e.preventDefault(); fullPipeline(); }
});

// ---------------------------------------------------------------- boot
(async function boot() {
  const t0 = performance.now();
  const bootMat = getMaterial(P.material);
  setBusy(`baking ${bootMat.name} textures…`);
  await nextFrame();
  const textures = bakeAllTextures(P.seed, bootMat.palette, (name, p) => {
    els.busy.textContent = `baking ${bootMat.name} — ${name} ${(p * 100) | 0}%`;
  });
  view.setTextures(textures);
  view.setMaterialShader(bootMat);
  console.log(`[Frontier] textures baked in ${(performance.now() - t0).toFixed(0)} ms`);
  await fullPipeline();
})();

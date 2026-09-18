/* ============================================================
 * Frontier · SDF terrain generator — application shell
 *
 * Wires the terrain pipeline (gen/) and the GPU viewport (gl/) to the
 * control panels. The important structural decision: the *only* mutable
 * terrain state is the SdfVolume plus its erosion grid, so every
 * action — generate, erode, sculpt, undo — is a well-defined edit of
 * those two objects, and the viewport is a pure function of them.
 * ============================================================ */

import { defaultParams, mergeParams, RESOLUTIONS, seedOf } from '../gen/params.js';
import {
  createVolume, buildBase, erode, analyse, terrainStats, dimsFor,
} from '../gen/pipeline.js';
import { rasterizeSurface, extractTopSurface, heightfieldForVolume, copyMaterialMaps } from '../gen/base-terrain.js';
import { meshVolume } from '../gen/mesh-assemble.js';
import { bakeAllLayers, packAtlas } from '../gen/textures.js';
import { applyStroke, finishStroke } from '../sculpt/brushes.js';
import { redistance, gradientQuality } from '../core/eikonal.js';
import { Viewport } from '../gl/viewport.js';
import {
  encodeSdfVolume, encodeOBJ, encodeMTL, encodeSTL, encodeHeightPNG,
  encodeChannelPNG, encodeSplatPNG, encodeSplatExtraPNG, encodeColorPNG, encodeRecipe,
} from '../io/exporters.js';
import { MATERIAL_PRESETS, MATERIAL_ORDER, CHANNEL_NAMES } from '../gen/materials.js';

/* ------------------------------------------------------------------ */
/* state                                                               */
/* ------------------------------------------------------------------ */

const P = mergeParams(defaultParams, readParamsFromURL());
let volume = null;
let hf = null;
let analysis = null;
let mesh = null;
let dirtySinceMesh = true;
let busy = false;
let undoStack = [];
let redoStack = [];
let texSize = 512;
let layerPack = null;

const brushes = {
  active: 'raise',
  radius: 3.0,
  strength: 0.55,
  falloff: 0.45,
  depth: 0.8,
  stamp: 'rock',
  windDir: 0.6,
  terraceStep: 0.6,
};

const passes = { fluvial: true, particles: true, detail: true };

/* ------------------------------------------------------------------ */
/* DOM helpers                                                         */
/* ------------------------------------------------------------------ */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const canvas = $('#gl');
const stageEl = $('#stage');

function toast(msg, kind = '') {
  const el = $('#toast');
  el.textContent = msg;
  el.className = 'show ' + kind;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { el.className = kind; }, 2600);
}

const waitFrame = () => new Promise((r) => requestAnimationFrame(() => r()));

const progress = (() => {
  const bar = $('#progress .bar');
  const label = $('#progress span');
  let visible = false;
  return {
    show(text) {
      visible = true;
      $('#progress').style.opacity = '1';
      label.textContent = text || '';
      bar.style.width = '2%';
    },
    set(value, text) {
      bar.style.width = `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
      if (text) label.textContent = text;
    },
    hide() {
      if (!visible) return;
      bar.style.width = '0%';
      $('#progress').style.opacity = '0.35';
      label.textContent = '';
    },
  };
})();

/* ------------------------------------------------------------------ */
/* parameter binding                                                   */
/* ------------------------------------------------------------------ */

function readParamsFromURL() {
  const p = new URLSearchParams(location.search);
  const patch = {};
  if (p.has('seed')) patch.seed = Number(p.get('seed'));
  if (p.has('shape')) patch.shape = p.get('shape');
  if (p.has('res')) patch.resolution = p.get('res');
  if (p.has('material')) patch.material = p.get('material');
  return patch;
}

function getPath(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}
function setPath(obj, path, value) {
  const keys = path.split('.');
  const last = keys.pop();
  const target = keys.reduce((o, k) => (o[k] = o[k] || {}), obj);
  target[last] = value;
}

function bindControls() {
  $$('[data-param]').forEach((el) => {
    const path = el.dataset.param;
    const value = getPath(P, path);
    if (el.type === 'checkbox') el.checked = Boolean(value);
    else if (el.type === 'number' || el.type === 'range' || el.tagName === 'SELECT') {
      el.value = value;
    }
    const out = el.parentElement?.querySelector('output');
    if (out) out.textContent = formatValue(value);
    el.addEventListener('input', () => {
      let v = el.type === 'checkbox' ? el.checked : el.value;
      if (el.type === 'range' || el.type === 'number') v = Number(v);
      setPath(P, path, v);
      if (out) out.textContent = formatValue(v);
      onParamChange(path);
    });
  });
  $$('[data-brush]').forEach((el) => {
    const key = el.dataset.brush;
    el.value = brushes[key];
    const out = el.parentElement?.querySelector('output');
    if (out) out.textContent = formatValue(brushes[key]);
    el.addEventListener('input', () => {
      brushes[key] = el.type === 'range' ? Number(el.value) : el.value;
      if (out) out.textContent = formatValue(brushes[key]);
      if (key === 'stamp') $('#stampkind').style.display = '';
    });
  });
  $('#stampkind').style.display = brushes.active === 'stamp' ? '' : 'none';
}

function formatValue(v) {
  if (typeof v === 'number') {
    if (Number.isInteger(v)) return String(v);
    return Math.abs(v) < 1 ? v.toFixed(3) : v.toFixed(2);
  }
  return String(v);
}

/** Which parameter changes need what kind of rebuild. */
function onParamChange(path) {
  if (path.startsWith('erosion.')) return;                        // needs a re-run
  if (path === 'snowLine' || path === 'fog' || path === 'sunAzimuth' ||
      path === 'water' || path === 'showFlow' || path === 'channelPreview') {
    applyVisuals();
    return;
  }
  if (path === 'material') { applyVisuals(); refreshStats(); return; }
  if (path === 'seaLevel') { applyVisuals(); return; }
  if (path === 'wireframe') { toggleWireframe(); return; }
  scheduleGenerate();
}

let generateTimer = null;
function scheduleGenerate() {
  clearTimeout(generateTimer);
  generateTimer = setTimeout(() => { generate(); }, 220);
}

/* ------------------------------------------------------------------ */
/* pipeline                                                            */
/* ------------------------------------------------------------------ */

async function generate() {
  if (busy) return;
  busy = true;
  setStage('building base landform…');
  progress.show('base landform');
  await waitFrame();

  const t0 = performance.now();
  const built = buildBase(P);
  volume = built.volume;
  hf = built.hf;

  progress.set(0.25, 'erosion: fluvial evolution');
  await waitFrame();
  await runErosion({ fresh: true });

  await finishBuild(t0);
}

async function runErosion({ fresh = false } = {}) {
  const list = Object.keys(passes).filter((k) => passes[k]);
  const t0 = performance.now();
  const stats = await erode(hf, P, {
    passes: list,
    onStage: async (s) => {
      if (s.done && s.stats) {
        toast(`${s.id}: cut ${Math.round(s.stats.carvedM3 || 0)} m³, filled ${Math.round(s.stats.depositedM3 || 0)} m³`);
      }
      await waitFrame();
    },
    onProgress: (label, f) => progress.set(0.25 + f * 0.6, label),
  });
  await waitFrame();
  progress.set(0.9, 'rasterising the eroded surface into the SDF volume');
  rasterizeSurface(volume, hf, { band: 8 });
  hf.h0.set(hf.h);
  analysis = analyse(hf, P);
  viewport.setTerrain({ volume, heightfield: hf, channels: analysis.channels, splats: analysis.splats });
  viewport.buildWaterMesh(P.waterLevel ?? P.seaLevel);
  dirtySinceMesh = true;
  return { stats, ms: performance.now() - t0, fresh };
}

async function finishBuild(t0) {
  applyVisuals();
  refreshStats();
  refreshPasses();
  progress.set(1, 'done');
  setTimeout(() => progress.hide(), 400);
  setStage('ready');
  toast(`terrain ready in ${((performance.now() - t0) / 1000).toFixed(2)} s · ` +
    `${hf.nx}×${hf.nz} erosion grid · ${volume.nx}×${volume.ny}×${volume.nz} SDF`);
  busy = false;
}

async function fullPipeline() {
  await generate();
  await erode();
}

/** Re-run selected passes on the *current* terrain (the pass-stack model). */
async function erodeOnly(list = null) {
  if (busy || !hf) return;
  busy = true;
  const t = performance.now();
  await runErosion({ fresh: false, passes: list });
  refreshStats();
  progress.hide();
  setStage('ready');
  toast(`erosion pass complete in ${((performance.now() - t) / 1000).toFixed(2)} s`);
  busy = false;
}

function setStage(text) {
  $('#chip-stage').textContent = text;
}

/** Unit vector — the shader wants the sun direction normalised. */
function normalize3(v) {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}

/* ------------------------------------------------------------------ */
/* visuals                                                             */
/* ------------------------------------------------------------------ */

function applyVisuals() {
  const az = ((P.sunAzimuth ?? 135) * Math.PI) / 180;
  const sun = normalize3([Math.cos(az) * 0.75, 0.72, Math.sin(az) * 0.75]);
  const fog = P.fog ?? 0.5;
  window.viewportVisuals = {
    sunDir: sun,
    sunColor: [1.0, 0.94, 0.84],
    skyTop: [0.24, 0.42, 0.70],
    skyHorizon: [0.74, 0.82, 0.88],
    fogColor: [0.70, 0.77, 0.84],
    fogDensity: 0.2 + fog * 1.4,
    waterLevel: P.waterLevel ?? P.seaLevel ?? 0,
    waterOn: P.water !== false,
    snowLine: snowLineNormalised(),
    exposure: 1.15,
    channelPreview: channelIndex(P.channelPreview),
    showFlow: Boolean(P.showFlow),
  };
  viewport.visuals = window.viewportVisuals;
  viewport.needsRender = true;
  updateMaterials();
}

function snowLineNormalised() {
  let min = Infinity, max = -Infinity;
  if (hf) {
    for (let i = 0; i < hf.h.length; i++) {
      if (!hf.valid[i]) continue;
      if (hf.h[i] < min) min = hf.h[i];
      if (hf.h[i] > max) max = hf.h[i];
    }
  }
  if (!isFinite(min)) return 0.7;
  const span = Math.max(max - min, 1e-3);
  return Math.max(0, Math.min(1, ((P.snowLine ?? 9.5) - min) / span));
}

function channelIndex(name) {
  const i = CHANNEL_NAMES.indexOf(name);
  return name === 'none' || i < 0 ? 0 : i + 1;
}

/* ------------------------------------------------------------------ */
/* stats / histogram                                                   */
/* ------------------------------------------------------------------ */

function refreshStats() {
  if (!hf) return;
  const s = terrainStats(hf, volume, P);
  const rows = [
    ['SDF grid', `${s.grid[0]} × ${s.grid[1]} × ${s.grid[2]}`],
    ['voxel size', `${s.voxel[0].toFixed(3)} m`],
    ['erosion grid', `${hf.nx} × ${hf.nz}`],
    ['elevation', `${s.min.toFixed(2)} … ${s.max.toFixed(2)} m`],
    ['mean elevation', `${s.mean.toFixed(2)} m`],
    ['mean slope', s.meanSlope.toFixed(3)],
    ['material cut', `${Math.round(s.carvedM3)} m³`],
    ['material filled', `${Math.round(s.depositedM3)} m³`],
    ['lakes', String(analysis?.rivers?.lakeCount ?? 0)],
    ['river cells', String(analysis?.rivers?.riverCells ?? 0)],
    ['mesh', mesh ? `${(mesh.indexCount / 3).toLocaleString()} tris` : 'not built'],
  ];
  $('#stats-table').innerHTML = rows.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('');
  $('#chip-grid').innerHTML = `<b>${volume.nx}³</b> SDF · <b>${hf.nx}²</b> grid`;
  drawHistogram();
}

function drawHistogram() {
  const c = $('#histogram');
  const ctx = c.getContext('2d');
  const w = c.width, h = c.height;
  ctx.clearRect(0, 0, w, h);
  if (!hf) return;
  let min = Infinity, max = -Infinity;
  for (let i = 0; i < hf.h.length; i++) { if (hf.h[i] < min) min = hf.h[i]; if (hf.h[i] > max) max = hf.h[i]; }
  const bins = new Int32Array(w);
  const span = Math.max(max - min, 1e-3);
  for (let i = 0; i < hf.h.length; i++) {
    const b = Math.min(w - 1, Math.max(0, Math.floor(((hf.h[i] - min) / span) * w)));
    bins[b]++;
  }
  const peak = Math.max(1, ...bins);
  ctx.fillStyle = '#2a6f66';
  for (let x = 0; x < w; x++) {
    const bh = (bins[x] / peak) * (h - 12);
    ctx.fillRect(x, h - 12 - bh, 1, bh);
  }
  const mark = (value, color, label) => {
    const x = Math.round(((value - min) / span) * w);
    ctx.fillStyle = color;
    ctx.fillRect(x, 0, 1, h - 12);
    ctx.fillStyle = color;
    ctx.font = '9px monospace';
    ctx.fillText(label, Math.min(x + 3, w - 26), 10);
  };
  if (P.seaLevel > min && P.seaLevel < max) mark(P.seaLevel, '#4aa3d8', 'sea');
  if (P.snowLine > min && P.snowLine < max) mark(P.snowLine, '#d8e6f2', 'snow');
  ctx.fillStyle = '#5f6873';
  ctx.font = '9px monospace';
  ctx.fillText(`${min.toFixed(1)} m`, 3, h - 2);
  ctx.fillText(`${max.toFixed(1)} m`, w - 34, h - 2);
}

/* ------------------------------------------------------------------ */
/* materials                                                           */
/* ------------------------------------------------------------------ */

function buildMaterialGrid() {
  const host = $('#materials');
  host.innerHTML = '';
  MATERIAL_ORDER.forEach((key) => {
    const m = MATERIAL_PRESETS[key];
    const el = document.createElement('div');
    el.className = 'mat' + (key === P.material ? ' active' : '');
    el.dataset.material = key;
    el.innerHTML = `<div class="sw" style="background:${rgbCss(m.palette)}"></div><div>${m.name}</div>`;
    el.addEventListener('click', () => {
      P.material = key;
      bindActiveMaterial();
      applyVisuals();
      if (analysis) analysis = analyse(hf, P);
      refreshStats();
    });
    host.appendChild(el);
  });
}

function rgbCss(palette) {
  const parts = Object.values(palette).map((c) => `rgb(${c.map((v) => Math.round(v * 255)).join(',')})`);
  return `linear-gradient(90deg, ${parts.join(',')})`;
}

function bindActiveMaterial() {
  $$('.mat').forEach((el) => el.classList.toggle('active', el.dataset.material === P.material));
}

function updateMaterials() { /* swatches are built in buildMaterialGrid() */ }

/* ------------------------------------------------------------------ */
/* passes panel                                                        */
/* ------------------------------------------------------------------ */

const PASS_DEFS = [
  { id: 'fluvial', name: 'Fluvial · stream power', hint: 'Macro incision + anisotropic diffusion + sediment routing. Run first.' },
  { id: 'particles', name: 'Particles · channels', hint: 'Guarded droplets: carve channels, build fans and deltas.' },
  { id: 'detail', name: 'Detail · rills + sharpen', hint: 'Fine rill network, ridge crispening, scree, surface grain.' },
];

function refreshPasses() {
  const host = $('#passes');
  if (!host.childElementCount) {
    PASS_DEFS.forEach((d) => {
      const row = document.createElement('div');
      row.className = 'pass';
      row.innerHTML = `
        <label><input type="checkbox" ${passes[d.id] ? 'checked' : ''} /><span>${d.name}</span></label>
        <button data-sim="${d.id}">Simulate</button>
        <span></span>
        <div class="hint">${d.hint}</div>`;
      row.querySelector('input').addEventListener('change', (e) => { passes[d.id] = e.target.checked; });
      row.querySelector('button').addEventListener('click', () => erodeOnly([d.id]));
      host.appendChild(row);
    });
  }
}

/* ------------------------------------------------------------------ */
/* sculpting                                                           */
/* ------------------------------------------------------------------ */

class SculptTool {
  constructor(vp) {
    this.vp = vp;
    this.active = false;
    this.samples = [];
    this.snapshot = null;   // pre-stroke voxel copy for undo
    this.box = null;        // world-space bounds of the stroke so far
    this.lastPoint = null;
    this.pendingPixels = 0;
    this.moved = 0;
  }

  start(px, py) {
    if (!volume || busy || brushes.active === 'orbit') return false;
    const hit = this.vp.pick(px, py);
    if (!hit) return false;
    this.active = true;
    this.samples = [];
    this.lastPoint = null;
    this.box = null;
    this.pixelsSinceRedistance = 0;
    volume.markAllDirty();
    this.snapshot = null;
    this.moved = 0;
    this.pushSample(hit);
    return true;
  }

  pushSample(hit) {
    const p = hit.point;
    let dt = 1;
    if (this.lastPoint) {
      dt = Math.max(0.2, Math.hypot(p[0] - this.lastPoint[0], p[1] - this.lastPoint[1], p[2] - this.lastPoint[2]) /
        Math.max(brushes.radius * 0.25, 0.15));
    }
    this.lastPoint = p;
    const sample = { point: p.slice(), normal: hit.normal.slice(), dt: Math.min(2.5, dt) };
    // remember the untouched box so undo can restore exactly this stroke
    const r = brushes.radius * (brushes.active === 'stamp' ? 2.4 : 1.6) + 1;
    const boxMin = [p[0] - r, p[1] - r, p[2] - r];
    const boxMax = [p[0] + r, p[1] + r, p[2] + r];
    if (!this.box) this.box = [boxMin.slice(), boxMax.slice()];
    else {
      for (let i = 0; i < 3; i++) {
        this.box[0][i] = Math.min(this.box[0][i], boxMin[i]);
        this.box[1][i] = Math.max(this.box[1][i], boxMax[i]);
      }
    }
    this.samples.push(sample);
    this.applyBatch(false);
  }

  applyBatch(final) {
    if (!this.samples.length) return;
    const opts = {
      radius: brushes.radius,
      strength: brushes.strength,
      falloff: brushes.falloff,
      depth: brushes.depth,
      texture: 0,
      windDir: brushes.windDir,
      terraceStep: brushes.terraceStep,
      align: true,
    };
    // Snapshot the untouched box *before* the first edit so undo is exact.
    // A stroke wanders, so the region can grow between batches: extendSnapshot
    // fills the new part from the current volume, which is still pristine
    // there (earlier batches could only have touched voxels inside the old
    // region).
    this.snapshot = extendSnapshot(this.snapshot, this.snapshotBox());
    const res = applyStroke(volume, {
      brush: brushes.active,
      samples: this.samples,
      opts,
      hardness: hf,
      stamp: brushes.stamp,
      seed: seedOf(P),
    });
    this.samples.length = 0;
    this.moved = (this.moved || 0) + res.moved;
    volume.refreshChunkStats(Array.from(volume.meshDirty));
    // keep the field metric: strokes deform it, so re-solve occasionally
    if (final || ++this.pixelsSinceRedistance >= 6) {
      this.pixelsSinceRedistance = 0;
      const box = this.snapshotBox();
      finishStroke(volume, box, { band: 6, sweeps: 2 });
    }
    this.vp.uploadVolume();
    dirtySinceMesh = true;
    updateProbe(this.lastPoint, null);
    this.vp.needsRender = true;
  }

  snapshotBox() {
    const b = this.box || [[0, 0, 0], [0, 0, 0]];
    const pad = 2.5 * Math.max(...volume.cell);
    return [
      [b[0][0] - pad, b[0][1] - pad, b[0][2] - pad],
      [b[1][0] + pad, b[1][1] + pad, b[1][2] + pad],
    ];
  }

  move(px, py) {
    if (!this.active) return;
    if (this.vp._framePending) return;
    // throttle to one sample per frame: the volume edits are the expensive part
    this.vp._framePending = true;
    requestAnimationFrame(() => {
      this.vp._framePending = false;
      if (!this.active) return;
      const hit = this.vp.pick(px, py);
      if (hit) this.pushSample(hit);
    });
  }

  end() {
    if (!this.active) return;
    this.applyBatch(true);
    this.active = false;
    const box = this.box ? this.snapshotBox() : null;
    // push a boxed undo entry (the box is world space; the snapshot is voxels)
    if (box && this.snapshot) {
      undoStack.push({ type: 'volume', box, before: this.snapshot, label: `sculpt · ${brushes.active}` });
      if (undoStack.length > 60) undoStack.shift();
      redoStack.length = 0;
    }
    this.snapshot = null;
    if (hf && box) {
      // The volume is the source of truth after a stroke, so read the height
      // grid back out of it (never the other way round — that would erase
      // the sculpt). Only the stroke's columns are touched.
      syncSurfaceFromVolume(box);
      analysis = analyse(hf, P);
      this.vp.setTerrain({ volume, heightfield: hf, channels: analysis.channels, splats: analysis.splats });
      this.vp.buildWaterMesh(P.waterLevel ?? P.seaLevel);
      refreshStats();
    }
    toast(`sculpted ${Math.abs(this.moved || 0).toFixed(2)} m³ of rock`);
    this.moved = 0;
  }
}

/* ------------------------------------------------------------------ */
/* viewport                                                            */
/* ------------------------------------------------------------------ */

const viewport = new Viewport(canvas, {});
viewport.visuals = {};
const sculpt = new SculptTool(viewport);

viewport.onStrokeStart = (px, py, e) => {
  if (brushes.active === 'orbit') return false;
  return sculpt.start(px, py);
};
viewport.onStrokeMove = (px, py) => sculpt.move(px, py);
viewport.onStrokeEnd = () => sculpt.end();

let hoverThrottle = 0;
viewport.onHover = (px, py) => {
  const now = performance.now();
  if (now - hoverThrottle < 60) return;
  hoverThrottle = now;
  const hit = viewport.pick(px, py);
  updateProbe(hit?.point ?? null, hit?.normal ?? null);
  if (hit && brushes.active !== 'orbit') {
    viewport.beginLines();
    viewport.addCircle(hit.point, hit.normal, brushes.radius, [0.45, 0.95, 0.85], 40);
    viewport.endLines();
  } else if (!hit) {
    viewport.beginLines();
    drawGridLines();
    viewport.endLines();
  }
};

function updateProbe(point, normal) {
  const el = $('#chip-probe');
  if (!point) { el.textContent = 'hover the terrain'; return; }
  const slope = hf ? hf.slopeAt(point[0], point[2]) : 0;
  el.innerHTML = `x <b>${point[0].toFixed(1)}</b> z <b>${point[2].toFixed(1)}</b> ` +
    `y <b>${point[1].toFixed(2)}</b> slope <b>${(slope * 100).toFixed(0)}%</b>` +
    (normal ? ` n<sub>y</sub> <b>${normal[1].toFixed(2)}</b>` : '');
}

function drawGridLines() {
  const y = P.seaLevel - 0.02;
  const step = 4;
  for (let x = -20; x <= 20; x += step) {
    viewport.addLine([x, y, -20], [x, y, 20], [0.22, 0.30, 0.36]);
  }
  for (let z = -20; z <= 20; z += step) {
    viewport.addLine([-20, y, z], [20, y, z], [0.22, 0.30, 0.36]);
  }
}

/* ------------------------------------------------------------------ */
/* history                                                             */
/* ------------------------------------------------------------------ */

/**
 * Re-read hf (height + slope + h0) from the volume over a world-space box.
 * Used after sculpting, where the volume moved and the erosion grid has to
 * follow it. Columns outside the box are left exactly as they were.
 */
function syncSurfaceFromVolume(box) {
  if (!hf || !volume) return;
  const r = regionOf(box, volume);
  extractTopSurface(volume, hf, { box: [r.x0, r.z0, r.x1, r.z1] });
  const nx = hf.nx;
  for (let j = r.z0; j <= r.z1; j++)
    for (let i = r.x0; i <= r.x1; i++) {
      const k = j * nx + i;
      if (k >= 0 && k < hf.h0.length) hf.h0[k] = hf.h[k];
    }
}

/** Clamped voxel region covered by a world-space box. */
function regionOf(box, v) {
  return {
    x0: Math.max(0, Math.floor((box[0][0] - v.min[0]) / v.cell[0])),
    y0: Math.max(0, Math.floor((box[0][1] - v.min[1]) / v.cell[1])),
    z0: Math.max(0, Math.floor((box[0][2] - v.min[2]) / v.cell[2])),
    x1: Math.min(v.nx - 1, Math.ceil((box[1][0] - v.min[0]) / v.cell[0])),
    y1: Math.min(v.ny - 1, Math.ceil((box[1][1] - v.min[1]) / v.cell[1])),
    z1: Math.min(v.nz - 1, Math.ceil((box[1][2] - v.min[2]) / v.cell[2])),
  };
}

/**
 * Grow a pre-stroke snapshot to cover `box`. Voxels that were outside the
 * previous region have not been touched yet, so they are copied from the
 * live volume; voxels already inside keep their original values.
 */
function extendSnapshot(snap, box) {
  const v = volume;
  const r = regionOf(box, v);
  if (snap) {
    const [sx, sy, sz] = snap.origin;
    const [dx, dy, dz] = snap.dims;
    if (sx <= r.x0 && sy <= r.y0 && sz <= r.z0 && sx + dx > r.x1 && sy + dy > r.y1 && sz + dz > r.z1) return snap;
  }
  const x0 = snap ? Math.min(snap.origin[0], r.x0) : r.x0;
  const y0 = snap ? Math.min(snap.origin[1], r.y0) : r.y0;
  const z0 = snap ? Math.min(snap.origin[2], r.z0) : r.z0;
  const x1 = snap ? Math.max(snap.origin[0] + snap.dims[0] - 1, r.x1) : r.x1;
  const y1 = snap ? Math.max(snap.origin[1] + snap.dims[1] - 1, r.y1) : r.y1;
  const z1 = snap ? Math.max(snap.origin[2] + snap.dims[2] - 1, r.z1) : r.z1;
  const dx = x1 - x0 + 1, dy = y1 - y0 + 1, dz = z1 - z0 + 1;
  const data = new Float32Array(dx * dy * dz);
  let o = 0;
  for (let z = z0; z <= z1; z++)
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++, o++) {
        if (snap && x >= snap.origin[0] && y >= snap.origin[1] && z >= snap.origin[2] &&
            x < snap.origin[0] + snap.dims[0] && y < snap.origin[1] + snap.dims[1] && z < snap.origin[2] + snap.dims[2]) {
          const so = ((z - snap.origin[2]) * snap.dims[1] + (y - snap.origin[1])) * snap.dims[0] + (x - snap.origin[0]);
          data[o] = snap.data[so];
        } else {
          data[o] = v.data[v.index(x, y, z)];
        }
      }
  return { data, dims: [dx, dy, dz], origin: [x0, y0, z0] };
}

function snapshotVolumeBox(box) {
  const v = volume;
  const { x0, y0, z0, x1, y1, z1 } = regionOf(box, v);
  const dx = x1 - x0 + 1, dy = y1 - y0 + 1, dz = z1 - z0 + 1;
  const data = new Float32Array(dx * dy * dz);
  let o = 0;
  for (let z = z0; z <= z1; z++)
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) data[o++] = v.data[v.index(x, y, z)];
  return { data, dims: [dx, dy, dz], origin: [x0, y0, z0] };
}

function restoreVolumeBox(snap) {
  const v = volume;
  const [x0, y0, z0] = snap.origin;
  const [dx, dy, dz] = snap.dims;
  let o = 0;
  for (let z = 0; z < dz; z++)
    for (let y = 0; y < dy; y++)
      for (let x = 0; x < dx; x++) {
        const gx = x0 + x, gy = y0 + y, gz = z0 + z;
        if (v.inBounds(gx, gy, gz)) v.data[v.index(gx, gy, gz)] = snap.data[o];
        o++;
      }
  v.refreshChunkStats();
  v.markAllDirty();
}

function undo() {
  const entry = undoStack.pop();
  if (!entry) { toast('nothing to undo'); return; }
  if (entry.type === 'volume') {
    const after = snapshotVolumeBox(entry.box);
    restoreVolumeBox(entry.before);
    entry.after = after;
    entry.before = null;
    redoStack.push(entry);
    if (hf) { syncSurfaceFromVolume(entry.box); analysis = analyse(hf, P); }
    viewport.setTerrain({ volume, heightfield: hf, channels: analysis.channels, splats: analysis.splats });
    viewport.buildWaterMesh(P.waterLevel ?? P.seaLevel);
    refreshStats();
    toast('undo');
  }
}

function redo() {
  const entry = redoStack.pop();
  if (!entry) { toast('nothing to redo'); return; }
  if (entry.type === 'volume') {
    const before = snapshotVolumeBox(entry.box);
    restoreVolumeBox(entry.after);
    entry.before = before;
    entry.after = null;
    undoStack.push(entry);
    if (hf) { syncSurfaceFromVolume(entry.box); analysis = analyse(hf, P); }
    viewport.setTerrain({ volume, heightfield: hf, channels: analysis.channels, splats: analysis.splats });
    viewport.buildWaterMesh(P.waterLevel ?? P.seaLevel);
    refreshStats();
    toast('redo');
  }
}

/* ------------------------------------------------------------------ */
/* mesh / wireframe                                                    */
/* ------------------------------------------------------------------ */

function ensureMesh() {
  if (mesh && !dirtySinceMesh) return mesh;
  mesh = meshVolume(volume, { hf, channels: analysis?.channels });
  dirtySinceMesh = false;
  return mesh;
}

function toggleWireframe() {
  if (!P.wireframe) {
    viewport._linesOn = true;
    viewport.beginLines();
    viewport.endLines();
    return;
  }
  setStage('extracting mesh…');
  requestAnimationFrame(() => {
    const m = ensureMesh();
    viewport.beginLines();
    const { positions, indices } = m;
    const stride = Math.max(3, Math.floor(m.indexCount / 3 / 60000) * 3);
    for (let t = 0; t < indices.length; t += stride) {
      const a = indices[t] * 3, b = indices[t + 1] * 3, c = indices[t + 2] * 3;
      viewport.addLine([positions[a], positions[a + 1], positions[a + 2]],
        [positions[b], positions[b + 1], positions[b + 2]], [0.20, 0.55, 0.50]);
      viewport.addLine([positions[b], positions[b + 1], positions[b + 2]],
        [positions[c], positions[c + 1], positions[c + 2]], [0.20, 0.55, 0.50]);
    }
    viewport.endLines();
    refreshStats();
    setStage('ready');
  });
}

/* ------------------------------------------------------------------ */
/* export                                                              */
/* ------------------------------------------------------------------ */

function download(bytes, filename, type = 'application/octet-stream') {
  const blob = new Blob([bytes], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  toast(`saved ${filename}`);
}

const baseName = () => `frontier_${P.shape}_${P.seed}`;

async function exportSdfVolume() {
  setStage('packing SDF volume…');
  await waitFrame();
  const moist = new Float32Array(volume.length);
  const dep = new Float32Array(volume.length);
  for (let z = 0; z < volume.nz; z++)
    for (let x = 0; x < volume.nx; x++) {
      const k = z * hf.nx + x;
      for (let y = 0; y < volume.ny; y++) {
        const i = (z * volume.ny + y) * volume.nx + x;
        moist[i] = hf.wet[k];
        dep[i] = hf.deposit[k];
      }
    }
  const bytes = encodeSdfVolume(volume, {
    params: P, stats: terrainStats(hf, volume, P), camera: cameraState(), moisture: moist, depositedSediment: dep,
  });
  download(bytes, `${baseName()}.frontier`);
  setStage('ready');
}

async function exportMesh(kind) {
  setStage('extracting mesh…');
  await waitFrame();
  const m = ensureMesh();
  const { splitByChunk } = await import('../gen/mesh-assemble.js');
  const chunks = splitByChunk(volume, m, hf, analysis?.splats);
  if (kind === 'obj') {
    download(encodeOBJ(chunks, { name: baseName() }), `${baseName()}.obj`, 'text/plain');
    download(encodeMTL(baseName()), `${baseName()}.mtl`, 'text/plain');
  } else {
    download(encodeSTL(chunks, { name: baseName() }), `${baseName()}.stl`, 'model/stl');
  }
  refreshStats();
  setStage('ready');
}

async function exportHeight() {
  setStage('writing heightmap…');
  await waitFrame();
  download(encodeHeightPNG(hf), `${baseName()}_height16.png`, 'image/png');
  setStage('ready');
}

async function exportSplats() {
  setStage('writing splatmaps…');
  await waitFrame();
  const { nx, nz } = hf;
  download(encodeSplatPNG(analysis.splats.weights, nx, nz), `${baseName()}_splatRGB.png`, 'image/png');
  download(encodeSplatExtraPNG(analysis.splats.weights, nx, nz), `${baseName()}_splatSandSnow.png`, 'image/png');
  download(encodeColorPNG(analysis.splats.colors, nx, nz), `${baseName()}_albedo.png`, 'image/png');
  for (const name of ['slope', 'flow', 'erosion', 'deposit', 'wet']) {
    download(encodeChannelPNG(analysis.channels[name], nx, nz), `${baseName()}_${name}.png`, 'image/png');
  }
  setStage('ready');
}

function exportRecipe() {
  download(encodeRecipe(P, hf ? terrainStats(hf, volume, P) : null), `${baseName()}.recipe.json`, 'application/json');
}

function importRecipe() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const patch = parsed.params || parsed;
      Object.assign(P, mergeParams(P, patch));
      bindControls();
      await generate();
      toast('recipe loaded');
    } catch (err) {
      toast(`could not read recipe: ${err.message}`, 'bad');
    }
  });
  input.click();
}

function saveViewportPNG() {
  viewport.render(performance.now());
  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${baseName()}_viewport.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }, 'image/png');
  toast('viewport saved');
}

function cameraState() {
  return { target: viewport.target.slice(), azimuth: viewport.azimuth, elevation: viewport.elevation, distance: viewport.distance };
}

/* ------------------------------------------------------------------ */
/* events                                                             */
/* ------------------------------------------------------------------ */

function bindActions() {
  $$('[data-action]').forEach((el) => {
    el.addEventListener('click', () => {
      const a = el.dataset.action;
      if (a === 'generate') generate();
      else if (a === 'erode') erodeOnly();
      else if (a === 'full') fullPipeline();
      else if (a === 'reroll') { P.seed = Math.floor(Math.random() * 100000); bindControls(); generate(); }
      else if (a === 'undo') undo();
      else if (a === 'redo') redo();
      else if (a === 'export-sdf') exportSdfVolume();
      else if (a === 'export-obj') exportMesh('obj');
      else if (a === 'export-stl') exportMesh('stl');
      else if (a === 'export-height') exportHeight();
      else if (a === 'export-splat') exportSplats();
      else if (a === 'export-recipe') exportRecipe();
      else if (a === 'import-recipe') importRecipe();
      else if (a === 'shot') saveViewportPNG();
    });
  });

  $$('#toolgroup [data-tool], [data-brushes] [data-tool]').forEach((el) => {
    el.addEventListener('click', () => {
      brushes.active = el.dataset.tool;
      $$('[data-tool]').forEach((o) => o.classList.toggle('active', o === el));
      $('#stampkind').style.display = brushes.active === 'stamp' ? '' : 'none';
      canvas.classList.toggle('tool', brushes.active !== 'orbit');
      viewport._linesOn = brushes.active === 'orbit';
      if (brushes.active === 'orbit') {
        viewport.beginLines();
        drawGridLines();
        viewport.endLines();
      }
      toast(`${el.textContent} tool`);
    });
  });

  $('#preview-legend').innerHTML = '';

  window.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
    const k = e.key.toLowerCase();
    if (k === 'g') generate();
    else if (k === 'e') erodeOnly();
    else if (k === 'p' || e.key === ' ') { e.preventDefault(); fullPipeline(); }
    else if (k === 'r') { P.seed = Math.floor(Math.random() * 100000); bindControls(); generate(); }
    else if (k === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) { e.preventDefault(); undo(); }
    else if ((k === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey) || (k === 'y' && (e.ctrlKey || e.metaKey))) { e.preventDefault(); redo(); }
    else if (k === 'w') { P.water = !P.water; bindControls(); applyVisuals(); }
    else if (k >= '1' && k <= '9') {
      const idx = Number(k) - 1;
      const tools = $$('[data-brushes] [data-tool]');
      if (tools[idx]) tools[idx].click();
    }
  });

  const ro = new ResizeObserver(() => viewport.setSize());
  ro.observe(stageEl);
  window.addEventListener('resize', () => viewport.setSize());
}

/* ------------------------------------------------------------------ */
/* boot                                                                */
/* ------------------------------------------------------------------ */

async function boot() {
  bindControls();
  bindActions();
  buildMaterialGrid();
  refreshPasses();
  applyVisuals();

  viewport.beginLines();
  drawGridLines();
  viewport.endLines();
  viewport.needsRender = true;

  const loop = (t) => {
    viewport.render(t);
    const s = viewport.stats;
    s.fps = s.fps ? s.fps * 0.9 + (1000 / Math.max(s.frameMs, 0.1)) * 0.1 : 1000 / Math.max(s.frameMs, 0.1);
    $('#chip-fps').innerHTML = `<b>${s.fps.toFixed(0)}</b> fps · ${s.frameMs.toFixed(1)} ms`;
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  // bake the material layers (chunked so the UI stays responsive)
  progress.show('baking material textures');
  const start = performance.now();
  const layers = bakeAllLayers(texSize, seedOf(P) ^ 0x5eed);
  progress.set(0.5, 'packing material atlas');
  await waitFrame();
  layerPack = packAtlas(layers);
  progress.hide();
  setStage('ready');
  console.log(`[frontier] materials baked in ${(performance.now() - start).toFixed(0)} ms`);

  await generate();
  console.log(`[frontier] SDF field quality |∇d| = ${gradientQuality(volume, 4).toFixed(3)} (1.0 is ideal)`);
  viewport.setTerrain({ volume, heightfield: hf, channels: analysis.channels, splats: analysis.splats, textures: layerPack });
  viewport.uploadVolume();
}

boot().catch((err) => {
  console.error(err);
  toast(`startup failed: ${err.message}`, 'bad');
  progress.hide();
});

/* expose for debugging / automation */
window.frontier = {
  get params() { return P; },
  get volume() { return volume; },
  get hf() { return hf; },
  get analysis() { return analysis; },
  get viewport() { return viewport; },
  generate, erodeOnly, fullPipeline, ensureMesh, undo, redo, sculpt, brushes, redistance,
  setParam(path, value) { setPath(P, path, value); bindControls(); },
  seed: seedOf,
  dimsFor,
  heightfieldForVolume,
  RESOLUTIONS,
};

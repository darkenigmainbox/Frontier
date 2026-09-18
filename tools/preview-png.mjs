#!/usr/bin/env node
/* ============================================================
 * Frontier · SDF terrain — headless visual QA
 *
 * Renders the generated terrain to a PNG mosaic so the pipeline can
 * be checked (and tuned) without a browser:
 *
 *   [0] shaded relief + materials    [1] erosion  (red cut / blue fill)
 *   [2] drainage network (log flow)  [3] slope
 *
 * Usage:
 *   node tools/preview-png.mjs --preset alpine --seed 4821 --out shots/a.png
 * ============================================================ */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { defaultParams, mergeParams } from '../src/gen/params.js';
import { generateTerrain } from '../src/gen/pipeline.js';
import { encodePNG } from './png.mjs';

const args = parseArgs(process.argv.slice(2));
const params = mergeParams(defaultParams, args.params || {});
if (args.seed) params.seed = Number(args.seed);
if (args.res) params.resolution = args.res;
if (args.shape) params.shape = args.shape;
if (args.material) params.material = args.material;
if (args.iterations) params.erosion.iterations = Number(args.iterations);
if (args.particles === 'off') params.erosion.particles = false;
if (args.fluvial === 'off') params.erosion.iterations = 0;

const t0 = Date.now();
const result = await generateTerrain(params, {
  onStage: (s) => {
    if (s.stage) process.stdout.write(`  ${s.stage}${s.done ? ' done' : ''}\r`);
  },
});
console.log(`generated in ${((Date.now() - t0) / 1000).toFixed(2)} s`);
console.log('stats', JSON.stringify({
  min: +result.stats.min.toFixed(2),
  max: +result.stats.max.toFixed(2),
  mean: +result.stats.mean.toFixed(2),
  meanSlope: +result.stats.meanSlope.toFixed(3),
  carved: Math.round(result.stats.carvedM3),
  deposited: Math.round(result.stats.depositedM3),
  lakes: result.rivers?.lakeCount ?? 0,
  water: Math.round((result.rivers?.riverCells ?? 0)),
}, null, 0));

const { hf, channels, splats, rivers } = result;
const nx = hf.nx, nz = hf.nz;
const gap = 4;
const W = nx * 2 + gap;
const H = nz * 2 + gap;
const img = new Uint8Array(W * H * 3).fill(28);

const put = (px, py, r, g, b) => {
  const i = (py * W + px) * 3;
  img[i] = clamp255(r); img[i + 1] = clamp255(g); img[i + 2] = clamp255(b);
};

const sea = params.seaLevel;
const lightAz = (params.sunAzimuth ?? 135) * Math.PI / 180;
const lx = Math.cos(lightAz) * 0.7, lz = Math.sin(lightAz) * 0.7, lz2 = 0.68;

const preset = splats;
for (let j = 0; j < nz; j++) {
  for (let i = 0; i < nx; i++) {
    const k = j * nx + i;
    // ---------- shaded relief ----------
    const hx = (hf.sampleGrid(hf.h, i + 1, j) - hf.sampleGrid(hf.h, i - 1, j)) / (2 * hf.cellX);
    const hz = (hf.sampleGrid(hf.h, i, j + 1) - hf.sampleGrid(hf.h, i, j - 1)) / (2 * hf.cellZ);
    const nlen = Math.hypot(hx, 1, hz);
    const nxv = -hx / nlen, nyv = 1 / nlen, nzv = -hz / nlen;
    let lam = Math.max(0, nxv * lx + nyv * lz2 + nzv * lz);
    lam = 0.25 + 0.85 * lam;
    const c = k * 3;
    let r = preset.colors[c] * lam * 300;
    let g = preset.colors[c + 1] * lam * 300;
    let b = preset.colors[c + 2] * lam * 300;
    let under = sea;
    if (hf.lake[k] > 0) under = hf.lake[k];
    if (hf.h[k] < under) { r = 38 * lam; g = 82 * lam; b = 118 * lam; }
    put(i, j, r, g, b);

    // ---------- erosion map ----------
    const e = clamp01(hf.erosion[k] / 2.2), d = clamp01(hf.deposit[k] / 1.4);
    put(nx + gap + i, j, 20 + e * 225, 20 + d * 180, 30 + (1 - e - d) * 20);

    // ---------- drainage ----------
    const f = Math.log(1 + hf.flow[k]) / Math.log(1 + 900);
    let fr = clamp01(f) * 300;
    if (rivers && rivers.rivers[k]) { fr = 90; }
    put(i, nz + gap + j, f > 0.25 ? fr * 0.5 : 10, f > 0.25 ? fr * 0.85 : 14, f > 0.25 ? fr : 18);

    // ---------- slope / channels ----------
    const sl = hf.slope[k];
    put(nx + gap + i, nz + gap + j, sl * 200, clamp01(channels.curvature[k]) * 180, clamp01(channels.height[k]) * 160);
  }
}

mkdirSync(dirname(args.out || 'shots/terrain.png'), { recursive: true });
const outPath = args.out || 'shots/terrain.png';
writeFileSync(outPath, encodePNG(W, H, img, 3));
console.log('wrote', outPath, `${W}×${H}`);

function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
function clamp255(v) { return v < 0 ? 0 : v > 255 ? 255 : v | 0; }

function parseArgs(list) {
  const o = {};
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = list[i + 1];
    if (next && !next.startsWith('--')) { o[key] = next; i++; }
    else o[key] = true;
  }
  return o;
}

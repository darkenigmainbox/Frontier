#!/usr/bin/env node
/* Parameter sweep harness: renders one hillshade per variant into a mosaic,
 * printing per-stage mass balance so runaway erosion is obvious.
 *
 *   node tools/dev/sweep.mjs name='{"relief":7,"erosion":{"K":0.005}}' ...
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { defaultParams, mergeParams } from '../../src/gen/params.js';
import { buildBase, erode, analyse, terrainStats } from '../../src/gen/pipeline.js';
import { encodePNG } from '../png.mjs';

const outPath = process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : 'shots/sweep.png';
const variants = process.argv.slice(2).filter((s) => s.includes('=') && !s.startsWith('--') && s !== outPath).map((s) => {
  const i = s.indexOf('=');
  return { name: s.slice(0, i), patch: JSON.parse(s.slice(i + 1)) };
});
if (!variants.length) variants.push({ name: 'default', patch: {} });

const GRID = Math.ceil(Math.sqrt(variants.length));
const PANEL = 300;
const W = GRID * PANEL, H = GRID * PANEL;
const img = new Uint8Array(W * H * 3).fill(24);

for (let vi = 0; vi < variants.length; vi++) {
  const v = variants[vi];
  const p = mergeParams(defaultParams, v.patch);
  const px0 = (vi % GRID) * PANEL, py0 = ((vi / GRID) | 0) * PANEL;
  const t0 = Date.now();
  const b = buildBase(p);
  const hf = b.hf;
  const mass = (label) => {
    let c = 0, d = 0;
    for (let k = 0; k < hf.erosion.length; k++) { c += hf.erosion[k]; d += hf.deposit[k]; }
    return `${label} cut=${(c * hf.cellArea).toFixed(0)} dep=${(d * hf.cellArea).toFixed(0)}`;
  };
  const r = await erode(hf, p, { passes: ['fluvial'] });
  const mF = mass('flu');
  const r2 = await erode(hf, p, { passes: ['particles'] });
  const mP = mass('par');
  const r3 = await erode(hf, p, { passes: ['detail'] });
  const mD = mass('det');
  const a = analyse(hf, p);
  const st = terrainStats(hf, b.volume, p);
  console.log(`${v.name.padEnd(14)} ${(Date.now() - t0) / 1000}s  slope=${st.meanSlope.toFixed(3)} max=${st.max.toFixed(1)}  ${mF} | ${mP} | ${mD}`);
  console.log(`   fluvial=${JSON.stringify(r.fluvial)}`);
  console.log(`   particles=${JSON.stringify(r2.particles)}`);
  draw(hf, a, p, px0, py0);
}
mkdirSync('shots', { recursive: true });
const out = outPath;
writeFileSync(out, encodePNG(W, H, img, 3));
console.log('wrote', out);

function draw(hf, a, p, px0, py0) {
  const { nx, nz, h } = hf;
  const scale = (PANEL - 8) / Math.max(nx, nz);
  const az = ((p.sunAzimuth ?? 135) * Math.PI) / 180;
  const lx = Math.cos(az) * 0.72, lz = Math.sin(az) * 0.72, ly = 0.62;
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const k = j * nx + i;
      const sx = px0 + 4 + Math.min(PANEL - 9, Math.round(i * scale));
      const sy = py0 + 4 + Math.min(PANEL - 9, Math.round(j * scale));
      const hx = (hf.sampleGrid(h, i + 1, j) - hf.sampleGrid(h, i - 1, j)) / (2 * hf.cellX);
      const hz = (hf.sampleGrid(h, i, j + 1) - hf.sampleGrid(h, i, j - 1)) / (2 * hf.cellZ);
      const nl = Math.hypot(hx, 1, hz);
      let lam = Math.max(0, (-hx / nl) * lx + (1 / nl) * ly + (-hz / nl) * lz);
      lam = 0.2 + 0.9 * lam;
      const c = k * 3;
      let r = a.splats.colors[c] * lam * 470;
      let g = a.splats.colors[c + 1] * lam * 470;
      let bl = a.splats.colors[c + 2] * lam * 470;
      let under = p.seaLevel;
      if (hf.lake[k] > 0) under = hf.lake[k];
      if (h[k] < under) { r = 34 * lam; g = 74 * lam; bl = 108 * lam; }
      const o = (sy * W + sx) * 3;
      img[o] = r < 0 ? 0 : r > 255 ? 255 : r | 0;
      img[o + 1] = g < 0 ? 0 : g > 255 ? 255 : g | 0;
      img[o + 2] = bl < 0 ? 0 : bl > 255 ? 255 : bl | 0;
    }
  }
}

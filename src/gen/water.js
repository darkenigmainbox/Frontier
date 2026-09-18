/* ============================================================
 * Frontier · SDF terrain — water bodies and drainage rendering
 *
 * Lakes come straight out of the priority-flood fill (a lake is a
 * connected region where the fill surface stands above the ground).
 * Rivers are the top of the drainage-area distribution, thickened to
 * ~2 cells so they read at distance and faded out at the waterline so
 * the coastline stays straight.
 *
 * The terrain is *not* flattened to the water level: the basin below
 * the surface stays in the SDF (so you can sculpt a lake bed, dive
 * into it, or drain it by cutting the sill), and the water surface is
 * rendered as its own mesh at the lake's spill level.
 * ============================================================ */

import { fillDepressions } from './flow.js';

const minAreaCells = (m2, hf) => Math.max(4, m2 / hf.cellArea);

/**
 * @param {import('./heightfield.js').HeightField} hf
 * @param {{seaLevel?:number, minLakeAreaM2?:number, riverAreaM2?:number, keepSea?:boolean}} opt
 * @returns {{lakes:Array, rivers:Uint8Array, wet:Float32Array, lakeLevel:Float32Array, riverCells:number, lakeCount:number}}
 */
export function detectWater(hf, {
  seaLevel = 0, minLakeAreaM2 = 14, riverAreaM2 = 55, keepSea = true,
} = {}) {
  const { nx, nz, h } = hf;
  const size = nx * nz;
  const { fill, depth, lakes } = fillDepressions(hf, { seaLevel });

  const wet = new Float32Array(size);
  const lakeLevel = new Float32Array(size);
  const minCells = minAreaCells(minLakeAreaM2, hf);
  const seen = new Uint8Array(size);
  const stack = new Int32Array(size);
  const out = [];

  for (let s = 0; s < size; s++) {
    if (!lakes[s] || seen[s]) continue;
    let sp = 0;
    stack[sp++] = s;
    seen[s] = 1;
    const cells = [];
    let level = -Infinity;
    while (sp > 0) {
      const c = stack[--sp];
      cells.push(c);
      if (fill[c] > level) level = fill[c];
      const i = c % nx, j = (c / nx) | 0;
      for (let n = 0; n < 4; n++) {
        const x2 = i + (n === 0 ? 1 : n === 1 ? -1 : 0);
        const y2 = j + (n === 2 ? 1 : n === 3 ? -1 : 0);
        if (x2 < 0 || y2 < 0 || x2 >= nx || y2 >= nz) continue;
        const c2 = y2 * nx + x2;
        if (!lakes[c2] || seen[c2]) continue;
        seen[c2] = 1;
        stack[sp++] = c2;
      }
    }
    if (cells.length < minCells) continue;
    if (level < seaLevel + 0.1) continue;      // that's the sea, not a lake
    for (const c of cells) {
      lakeLevel[c] = level;
      wet[c] = 1;
    }
    out.push({ level, cells, areaM2: cells.length * hf.cellArea });
  }

  // ---- sea: everything under the waterline is "wet" for the shader ----
  if (keepSea) {
    for (let k = 0; k < size; k++) if (h[k] < seaLevel) wet[k] = Math.max(wet[k], 1);
  }

  // ---- rivers -------------------------------------------------------
  const areaCells = riverAreaM2 / hf.cellArea;
  const river = new Uint8Array(size);
  let riverCells = 0;
  for (let k = 0; k < size; k++) {
    if (hf.flow[k] < areaCells) continue;
    if (h[k] <= seaLevel + 0.05) continue;
    river[k] = 1;
    riverCells++;
  }
  // thicken to ~2 cells
  const dil = new Uint8Array(size);
  for (let j = 1; j < nz - 1; j++) {
    for (let i = 1; i < nx - 1; i++) {
      const k = j * nx + i;
      if (!river[k]) continue;
      dil[k] = 1;
      const f = Math.min(1, hf.flow[k] / (areaCells * 6));
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
        dil[k + dy * nx + dx] = 1;
        void f;
      }
    }
  }
  for (let k = 0; k < size; k++) {
    if (dil[k] && h[k] > seaLevel + 0.05) {
      hf.river[k] = 1;
      wet[k] = Math.max(wet[k], 0.75);
    }
  }
  hf.wet.set(wet);
  return { lakes: out, rivers: dil, wet, lakeLevel, riverCells, lakeCount: out.length, fill, depth };
}

/** Total water volume (m³) for stats: lakes + the sea above the block floor. */
export function waterVolume(hf, seaLevel = 0) {
  let v = 0;
  for (let k = 0; k < hf.h.length; k++) {
    if (hf.lake[k] > 0 && hf.h[k] < hf.lake[k]) v += (hf.lake[k] - hf.h[k]) * hf.cellArea;
    if (hf.h[k] < seaLevel) v += (seaLevel - hf.h[k]) * hf.cellArea;
  }
  return v;
}

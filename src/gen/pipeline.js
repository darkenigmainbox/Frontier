/* ============================================================
 * Frontier · SDF terrain — the generation pipeline
 *
 * The one entry point used by the app, by the headless CLI
 * (tools/generate.mjs) and by the tests. Runs:
 *
 *   base landform (fractal height field)
 *     → rasterise into the SDF volume
 *     → extract the top surface (the erosion grid)
 *     → macro fluvial evolution      (stream power + anisotropic
 *                                     diffusion + sediment routing)
 *     → guarded particle erosion     (channels, fans, deltas)
 *     → detail stage                 (rills, sharpen, scree, grain)
 *     → rasterise the eroded surface back into the volume (CSG +
 *       Eikonal re-solve)
 *     → hydrology / water bodies / channels / material weights
 *
 * Every stage is separately callable, which is what the UI's pass
 * stack does: re-run one pass on the *current* terrain instead of the
 * whole pipeline.
 * ============================================================ */

import { SdfVolume } from '../core/sdf-volume.js';
import { BOUNDS, RESOLUTIONS, seedOf } from './params.js';
import {
  buildBaseHeightfield, rasterizeBaseIntoVolume, extractTopSurface,
  heightfieldForVolume, copyMaterialMaps, recomputeSlopes,
} from './base-terrain.js';
import { erodeFluvial } from './erosion-fluvial.js';
import { erodeParticles } from './erosion-particles.js';
import { erodeDetail } from './erosion-detail.js';
import { hydrology } from './flow.js';
import { detectWater } from './water.js';
import { computeChannels, computeSplatWeights } from './materials.js';

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

export function dimsFor(params) {
  return (RESOLUTIONS[params.resolution] || RESOLUTIONS.standard).slice();
}

export function createVolume(params) {
  return new SdfVolume({
    dims: dimsFor(params),
    min: BOUNDS.min,
    max: BOUNDS.max,
    chunk: params.chunk ?? 16,
  });
}

/** Stage 1+2: landform → SDF volume → erosion grid. */
export function buildBase(params, { vol = null, onStage = null } = {}) {
  const t0 = now();
  const volume = vol || createVolume(params);
  const hf = heightfieldForVolume(volume);
  const grid = { nx: hf.nx, nz: hf.nz, minX: hf.minX, minZ: hf.minZ, cellX: hf.cellX, cellZ: hf.cellZ };
  const base = buildBaseHeightfield(params, grid);
  const band = 8;
  rasterizeBaseIntoVolume(volume, base, { band });
  copyMaterialMaps(base, hf);
  extractTopSurface(volume, hf);
  hf.h0.set(hf.h);
  const t = now() - t0;
  onStage?.({ stage: 'base', ms: t, heightfield: hf, volume });
  return { volume, hf, base, ms: t };
}

/**
 * Run the full erosion stack on an existing erosion grid.
 * @param {import('./heightfield.js').HeightField} hf
 * @param {object} params
 * @param {object} [opt] { passes?:string[], onStage }
 */
export async function erode(hf, params, { passes = null, onStage = null, onProgress = null, seaLevel = null } = {}) {
  const e = params.erosion;
  const sea = seaLevel ?? params.seaLevel ?? 0;
  const active = (id) => !passes || passes.includes(id);
  const out = { stages: [], ms: 0 };

  // start every erosion run from the pre-erosion budget reference
  hf.h0.set(hf.h);

  const label = { fluvial: 'fluvial evolution', particles: 'particle channels', detail: 'detail pass' };
  const yieldFor = (id) => async (i, n) => {
    if (onProgress) onProgress(label[id] || id, i / Math.max(1, n));
    // hand the frame back to the browser so the viewport keeps painting
    await new Promise((r) => (typeof requestAnimationFrame === 'function'
      ? requestAnimationFrame(() => r())
      : setTimeout(r, 0)));
  };

  if (e.enabled && active('fluvial')) {
    const r = await erodeFluvial(hf, e, { seaLevel: sea, seed: seedOf(params), yield: yieldFor('fluvial') });
    out.fluvial = r;
    out.stages.push({ id: 'fluvial', ...r });
    onStage?.({ stage: 'fluvial', done: true, stats: r, id: 'fluvial' });
  }
  if (e.enabled && active('particles')) {
    const r = await erodeParticles(hf, e, {
      seed: seedOf(params), seaLevel: sea, floorY: BOUNDS.min[1],
      yield: yieldFor('particles'),
    });
    out.particles = r;
    out.stages.push({ id: 'particles', ...r });
    onStage?.({ stage: 'particles', done: true, stats: r, id: 'particles' });
  }
  if (e.enabled && active('detail')) {
    const r = erodeDetail(hf, e, { seed: seedOf(params), seaLevel: sea });
    out.detail = r;
    out.stages.push({ id: 'detail', ...r });
    onStage?.({ stage: 'detail', done: true, stats: r, id: 'detail' });
  }
  out.ms = out.stages.reduce((a, s) => a + (s.ms || 0), 0);
  return out;
}

/** Hydrology + water bodies + channels + materials on the current grid. */
export function analyse(hf, params, { water = true } = {}) {
  const sea = params.seaLevel ?? 0;
  const hyp = hydrology(hf, { exponent: params.erosion.flowExponent ?? 1.35, seaLevel: sea, meander: params.erosion.meander ?? 0.45, seed: seedOf(params) });
  const rivers = water ? detectWater(hf, {
    seaLevel: sea,
    riverAreaM2: params.riverAreaM2 ?? 55,
    minLakeAreaM2: params.minLakeAreaM2 ?? 14,
  }) : null;
  recomputeSlopes(hf);
  const channels = computeChannels(hf, { seaLevel: sea });
  const splats = computeSplatWeights(channels, {
    preset: params.material ?? 'alpine',
    snowLine: (params.snowLine ?? 9.5) / Math.max(6, params.relief ?? 13),
  });
  return { hyp, rivers, channels, splats };
}

export function terrainStats(hf, vol, params) {
  const sea = params.seaLevel ?? 0;
  let min = Infinity, max = -Infinity, sum = 0, n = 0;
  let carved = 0, deposited = 0;
  for (let k = 0; k < hf.h.length; k++) {
    const h = hf.h[k];
    if (!hf.valid[k]) continue;
    if (h < min) min = h;
    if (h > max) max = h;
    sum += h; n++;
    carved += hf.erosion[k];
    deposited += hf.deposit[k];
  }
  const area = hf.nx * hf.nz * hf.cellArea;
  return {
    grid: [vol.nx, vol.ny, vol.nz],
    voxel: vol.cell.slice(),
    min, max, mean: n ? sum / n : 0,
    seaLevel: sea,
    carvedM3: carved * hf.cellArea,
    depositedM3: deposited * hf.cellArea,
    meanSlope: hf.roughness(),
    volume: vol.stats(),
    area,
  };
}

/**
 * Full pipeline: everything, in order, with progress callbacks.
 * @param {object} params
 * @param {{onStage?:Function, vol?:SdfVolume, skipBase?:boolean, hf?:object}} [opt]
 */
export async function generateTerrain(params, { onStage = null, vol = null, skipBase = false, hf = null } = {}) {
  const t0 = now();
  let volume = vol, field = hf;
  if (!skipBase || !field) {
    const b = buildBase(params, { vol: volume, onStage });
    volume = b.volume;
    field = b.hf;
    var baseInfo = b;
  }
  const ero = await erode(field, params, { onStage });
  onStage?.({ stage: 'rasterise', started: true });
  const tR = now();
  const { rasterizeSurface } = await import('./base-terrain.js');
  rasterizeSurface(volume, field, { band: 8 });
  field.h0.set(field.h);
  onStage?.({ stage: 'rasterise', done: true, ms: now() - tR });
  const analysis = analyse(field, params);
  const stats = terrainStats(field, volume, params);
  return {
    volume, hf: field, base: typeof baseInfo !== 'undefined' ? baseInfo : null,
    ...analysis, stats, erosion: ero,
    ms: now() - t0,
  };
}

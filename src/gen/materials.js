/* ============================================================
 * Frontier · SDF terrain — surface channels and material layers
 *
 * The eroded field is turned into channels (height, slope, curvature,
 * flow, erosion, deposition, wetness, exposure) which are then blended
 * into five layers — grass / dirt / rock / sand / snow — by a preset's
 * placement rules. Presets are pure data, so adding a biome is adding
 * an object, and the exporters can dump the channel stack as separate
 * PNGs for use in another engine.
 * ============================================================ */

import { recomputeSlopes } from './base-terrain.js';

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const sstep = (a, b, x) => {
  const t = clamp01((x - a) / (b - a || 1e-9));
  return t * t * (3 - 2 * t);
};

export const CHANNEL_NAMES = [
  'height', 'slope', 'curvature', 'flow', 'erosion', 'deposit', 'wet', 'exposure',
];

/** All channels, normalised to 0..1 over the current terrain. */
export function computeChannels(hf, { seaLevel = 0 } = {}) {
  const { nx, nz, h } = hf;
  const size = nx * nz;
  let maxE = 1e-6, maxD = 1e-6, maxF = 1e-6;
  for (let k = 0; k < size; k++) {
    if (hf.erosion[k] > maxE) maxE = hf.erosion[k];
    if (hf.deposit[k] > maxD) maxD = hf.deposit[k];
    if (hf.flow[k] > maxF) maxF = hf.flow[k];
  }
  let minH = Infinity, maxH = -Infinity;
  for (let k = 0; k < size; k++) {
    if (!hf.valid[k]) continue;
    if (h[k] < minH) minH = h[k];
    if (h[k] > maxH) maxH = h[k];
  }
  if (!isFinite(minH)) { minH = seaLevel; maxH = seaLevel + 1; }
  const spanH = Math.max(maxH - minH, 1e-3);
  const logF = Math.log(1 + maxF);

  recomputeSlopes(hf);
  const ch = {
    height: new Float32Array(size),
    slope: new Float32Array(size),
    curvature: new Float32Array(size),
    flow: new Float32Array(size),
    erosion: new Float32Array(size),
    deposit: new Float32Array(size),
    wet: new Float32Array(size),
    exposure: new Float32Array(size),
  };
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const k = j * nx + i;
      ch.height[k] = clamp01((h[k] - minH) / spanH);
      ch.slope[k] = clamp01(hf.slope[k] / 2.2);
      // curvature: Laplacian of the elevation, signed then remapped
      const lap = (hf.sampleGrid(h, i + 1, j) + hf.sampleGrid(h, i - 1, j) +
        hf.sampleGrid(h, i, j + 1) + hf.sampleGrid(h, i, j - 1)) * 0.25 - h[k];
      ch.curvature[k] = clamp01(0.5 - lap / Math.max(hf.cellX * 1.2, 1e-3));
      ch.flow[k] = clamp01(Math.log(1 + hf.flow[k]) / logF);
      ch.erosion[k] = clamp01(hf.erosion[k] / maxE);
      ch.deposit[k] = clamp01(hf.deposit[k] / maxD);
      ch.wet[k] = clamp01(hf.wet[k]);
      // exposure: bare rock where the cover has been stripped
      ch.exposure[k] = clamp01(hf.erosion[k] * 2.2 + hf.trail[k] * 0.004);
    }
  }
  return ch;
}

/** Presets: palette + placement rules. All values are 0..1 knobs. */
export const MATERIAL_PRESETS = {
  alpine: {
    name: 'Alpine Meadow',
    palette: { grass: [0.35, 0.44, 0.24], dirt: [0.42, 0.35, 0.26], rock: [0.46, 0.46, 0.49], sand: [0.76, 0.71, 0.55], snow: [0.93, 0.95, 0.98] },
    rules: { snowStart: 0.62, snowEnd: 0.86, snowSlopeMax: 0.75, rockSlope: 0.52, dirtSlope: 0.30, sandHeight: 0.055, wetDark: 0.35 },
  },
  highAlpine: {
    name: 'High Alpine',
    palette: { grass: [0.30, 0.36, 0.22], dirt: [0.36, 0.31, 0.25], rock: [0.40, 0.40, 0.44], sand: [0.66, 0.63, 0.54], snow: [0.97, 0.98, 1.0] },
    rules: { snowStart: 0.45, snowEnd: 0.72, snowSlopeMax: 0.8, rockSlope: 0.40, dirtSlope: 0.24, sandHeight: 0.04, wetDark: 0.3 },
  },
  canyon: {
    name: 'Arid Canyon',
    palette: { grass: [0.48, 0.44, 0.28], dirt: [0.60, 0.36, 0.22], rock: [0.66, 0.44, 0.30], sand: [0.82, 0.70, 0.47], snow: [0.94, 0.94, 0.92] },
    rules: { snowStart: 1.2, snowEnd: 1.4, snowSlopeMax: 0.6, rockSlope: 0.62, dirtSlope: 0.22, sandHeight: 0.22, wetDark: 0.4 },
  },
  badlands: {
    name: 'Badlands',
    palette: { grass: [0.44, 0.43, 0.30], dirt: [0.66, 0.52, 0.34], rock: [0.72, 0.60, 0.44], sand: [0.78, 0.68, 0.50], snow: [0.9, 0.9, 0.9] },
    rules: { snowStart: 1.3, snowEnd: 1.5, snowSlopeMax: 0.5, rockSlope: 0.35, dirtSlope: 0.16, sandHeight: 0.15, wetDark: 0.45 },
  },
  tundra: {
    name: 'Tundra',
    palette: { grass: [0.38, 0.40, 0.30], dirt: [0.40, 0.36, 0.30], rock: [0.45, 0.45, 0.46], sand: [0.62, 0.60, 0.55], snow: [0.90, 0.93, 0.96] },
    rules: { snowStart: 0.35, snowEnd: 0.6, snowSlopeMax: 0.85, rockSlope: 0.5, dirtSlope: 0.25, sandHeight: 0.06, wetDark: 0.28 },
  },
  volcanic: {
    name: 'Volcanic',
    palette: { grass: [0.24, 0.26, 0.20], dirt: [0.20, 0.17, 0.16], rock: [0.16, 0.15, 0.16], sand: [0.35, 0.31, 0.29], snow: [0.85, 0.86, 0.9] },
    rules: { snowStart: 0.85, snowEnd: 1.05, snowSlopeMax: 0.7, rockSlope: 0.3, dirtSlope: 0.14, sandHeight: 0.05, wetDark: 0.5 },
  },
  desert: {
    name: 'Desert Dunes',
    palette: { grass: [0.55, 0.50, 0.33], dirt: [0.72, 0.58, 0.36], rock: [0.60, 0.49, 0.36], sand: [0.88, 0.78, 0.55], snow: [0.95, 0.95, 0.95] },
    rules: { snowStart: 1.4, snowEnd: 1.6, snowSlopeMax: 0.5, rockSlope: 0.55, dirtSlope: 0.2, sandHeight: 0.45, wetDark: 0.35 },
  },
  temperate: {
    name: 'Temperate Forest',
    palette: { grass: [0.26, 0.36, 0.20], dirt: [0.35, 0.29, 0.21], rock: [0.42, 0.42, 0.42], sand: [0.70, 0.66, 0.52], snow: [0.90, 0.93, 0.96] },
    rules: { snowStart: 0.82, snowEnd: 1.0, snowSlopeMax: 0.7, rockSlope: 0.58, dirtSlope: 0.34, sandHeight: 0.05, wetDark: 0.4 },
  },
  glacial: {
    name: 'Glacial Till',
    palette: { grass: [0.36, 0.42, 0.30], dirt: [0.47, 0.43, 0.36], rock: [0.50, 0.50, 0.52], sand: [0.68, 0.66, 0.62], snow: [0.95, 0.97, 1.0] },
    rules: { snowStart: 0.42, snowEnd: 0.66, snowSlopeMax: 0.9, rockSlope: 0.42, dirtSlope: 0.2, sandHeight: 0.08, wetDark: 0.3 },
  },
};

export const MATERIAL_ORDER = Object.keys(MATERIAL_PRESETS);

/**
 * Blend the channels into layer weights.
 * @returns {{weights:Float32Array, colors:Float32Array}} weights: 5 per cell
 */
export function computeSplatWeights(channels, { preset = 'alpine', snowLine = 0.7, seaLevelNorm = 0 } = {}) {
  const mat = MATERIAL_PRESETS[preset] || MATERIAL_PRESETS.alpine;
  const r = mat.rules;
  const size = channels.height.length;
  const weights = new Float32Array(size * 5);
  const colors = new Float32Array(size * 3);
  const pal = mat.palette;
  for (let k = 0; k < size; k++) {
    const height = channels.height[k];
    const slope = clamp01(channels.slope[k]);
    const curv = channels.curvature[k];
    const flow = channels.flow[k];
    const erosion = channels.erosion[k];
    const deposit = channels.deposit[k];
    const wet = channels.wet[k];
    const exposure = channels.exposure[k];

    // placement rules ---------------------------------------------------
    const snow = sstep(r.snowStart * snowLine, r.snowEnd * snowLine, height) *
      (1 - sstep(r.snowSlopeMax * 0.7, r.snowSlopeMax * 1.15, slope));
    const rockSlopeW = sstep(r.rockSlope * 0.7, r.rockSlope * 1.25, slope) *
      (1 - sstep(1.4, 2.0, slope));
    const rock = clamp01(Math.max(rockSlopeW, exposure * 0.9) + erosion * 0.35 * (1 - deposit)) *
      (1 - snow);
    const beach = (1 - sstep(r.sandHeight * 0.5, r.sandHeight * 2.4, Math.abs(height - seaLevelNorm)));
    const sand = clamp01(Math.max(
      (1 - sstep(0.02, 0.10, slope)) * beach,
      deposit * 0.9 * (1 - sstep(0.05, 0.30, slope)) * 0.8,
      (1 - sstep(0.4, 0.9, slope)) * deposit * 0.5,
    )) * (1 - snow);
    const dirt = clamp01(
      sstep(r.dirtSlope * 0.4, r.dirtSlope * 1.3, slope) * 0.9 +
      flow * 0.45 + erosion * 0.3 + flow * wet * 0.2,
    ) * (1 - snow) * (1 - rock * 0.7);
    let grass = clamp01(1 - snow - rock - sand - dirt);

    // wet channels darken and gloss (carried as a separate weight)
    const wetLit = wet * (1 - sstep(0.2, 0.8, slope)) * 0.9 + (1 - clamp01(curv)) * 0.2 * wet;
    const sum = (grass + dirt + rock + sand + snow) || 1;
    grass /= sum;
    const dirtN = dirt / sum, rockN = rock / sum, sandN = sand / sum, snowN = snow / sum;
    const b = k * 5;
    weights[b] = grass;
    weights[b + 1] = dirtN;
    weights[b + 2] = rockN;
    weights[b + 3] = sandN;
    weights[b + 4] = snowN;

    const c = k * 3;
    for (let ch = 0; ch < 3; ch++) {
      let v = grass * pal.grass[ch] + dirtN * pal.dirt[ch] + rockN * pal.rock[ch] +
        sandN * pal.sand[ch] + snowN * pal.snow[ch];
      v *= 1 - r.wetDark * wetLit * 0.5;
      colors[c + ch] = v;
    }
  }
  return { weights, colors };
}

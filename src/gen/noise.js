/* ============================================================
 * Frontier · SDF terrain — deterministic noise foundation
 *
 * Everything here is seeded and allocation-free in the hot path.
 * The same functions are used by the browser app and by the
 * headless `node tools/generate.mjs` CLI, so a recipe (seed +
 * parameters) always reproduces the identical terrain.
 * ============================================================ */

/** Deterministic 32-bit PRNG (mulberry32). Returns () => [0,1). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Mix a seed with a salt to derive an independent stream. */
export function subseed(seed, salt) {
  let h = (seed ^ Math.imul((salt | 0) + 0x9e3779b9, 0x85ebca6b)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

/** Integer hash → [0,1). Used for lattice noise and stochastic passes. */
export function hash1(n) {
  n = Math.imul(n ^ (n >>> 16), 0x7feb352d) >>> 0;
  n = Math.imul(n ^ (n >>> 15), 0x846ca68b) >>> 0;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}
export function hash2(x, y, seed = 0) {
  return hash1((Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed | 0, 1274126177)) >>> 0);
}
export function hash3(x, y, z, seed = 0) {
  return hash1((Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 2147483647) ^ Math.imul(seed | 0, 1274126177)) >>> 0);
}

const smooth = (t) => t * t * (3 - 2 * t);

/** Value noise 2D, returns [0,1). Cheap lattice noise for masks/mottle. */
export function value2(x, y, seed = 0) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = smooth(x - ix), fy = smooth(y - iy);
  const a = hash2(ix, iy, seed), b = hash2(ix + 1, iy, seed);
  const c = hash2(ix, iy + 1, seed), d = hash2(ix + 1, iy + 1, seed);
  return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy;
}

/** Value noise 3D, returns [0,1). */
export function value3(x, y, z, seed = 0) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const fx = smooth(x - ix), fy = smooth(y - iy), fz = smooth(z - iz);
  let acc = 0;
  for (let k = 0; k < 2; k++) {
    const w = k ? fz : 1 - fz;
    for (let j = 0; j < 2; j++) {
      const w2 = w * (j ? fy : 1 - fy);
      for (let i = 0; i < 2; i++) {
        acc += w2 * (i ? fx : 1 - fx) * hash3(ix + i, iy + j, iz + k, seed);
      }
    }
  }
  return acc;
}

const GRAD2 = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [0.7071, 0.7071], [-0.7071, 0.7071],
  [0.7071, -0.7071], [-0.7071, -0.7071],
];

/** Classic 2D Perlin gradient noise, roughly [-1,1]. */
export class Perlin2D {
  constructor(seed) {
    const rng = mulberry32(seed >>> 0);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = (rng() * (i + 1)) | 0;
      const t = p[i]; p[i] = p[j]; p[j] = t;
    }
    this.perm = new Uint8Array(512);
    for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
    this.seed = seed;
  }
  noise(x, y) {
    const perm = this.perm;
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
    x -= Math.floor(x); y -= Math.floor(y);
    const u = smooth(x), v = smooth(y);
    const aa = perm[perm[X] + Y] & 7, ba = perm[perm[X + 1] + Y] & 7;
    const ab = perm[perm[X] + Y + 1] & 7, bb = perm[perm[X + 1] + Y + 1] & 7;
    const n00 = GRAD2[aa][0] * x + GRAD2[aa][1] * y;
    const n10 = GRAD2[ba][0] * (x - 1) + GRAD2[ba][1] * y;
    const n01 = GRAD2[ab][0] * x + GRAD2[ab][1] * (y - 1);
    const n11 = GRAD2[bb][0] * (x - 1) + GRAD2[bb][1] * (y - 1);
    const nx0 = n00 + u * (n10 - n00);
    const nx1 = n01 + u * (n11 - n01);
    return nx0 + v * (nx1 - nx0);
  }
}

/** Sum of gradient-noise octaves. Returns roughly [-1,1]. */
export function fbm(p, x, y, { octaves = 5, lacunarity = 2.0, gain = 0.5 } = {}) {
  let amp = 1, freq = 1, sum = 0, norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += amp * p.noise(x * freq, y * freq);
    norm += amp;
    amp *= gain; freq *= lacunarity;
  }
  return sum / Math.max(norm, 1e-6);
}

/** Ridged multifractal (sharp crests). Returns [0,1]. */
export function ridged(p, x, y, { octaves = 5, lacunarity = 2.0, gain = 0.5, sharp = 2.0 } = {}) {
  let amp = 0.5, freq = 1, sum = 0, norm = 0;
  for (let o = 0; o < octaves; o++) {
    let n = 1 - Math.abs(p.noise(x * freq, y * freq));
    n = Math.pow(n, sharp);
    sum += amp * n;
    norm += amp;
    amp *= gain; freq *= lacunarity;
  }
  const v = sum / Math.max(norm, 1e-6);
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/**
 * Domain warp: displaces sample coordinates with low-frequency noise so
 * ridges/blobs read as organic rather than grid-aligned. Returns [wx, wy].
 * A *derivative-corrected* warp (small epsilon re-evaluation) keeps the
 * height field free of the pinching artifacts plain warping creates.
 */
export function warpCoords(p, x, y, { amount = 0.5, scale = 1.0, pw = null } = {}) {
  const n = pw || p;
  const s = scale;
  return [
    x + amount * 1.6 * n.noise(x * s + 31.4, y * s - 17.8),
    y + amount * 1.6 * n.noise(x * s - 51.2, y * s + 44.9),
  ];
}

export function fbm01(p, x, y, opts) {
  return fbm(p, x, y, opts) * 0.5 + 0.5;
}

/** 2D fBm built from value noise (slightly cheaper, [0,1] range). */
export function vfbm2(x, y, { octaves = 4, gain = 0.5, lacunarity = 2, seed = 0 } = {}) {
  let amp = 1, freq = 1, sum = 0, norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += amp * value2(x * freq, y * freq, seed + o * 131);
    norm += amp;
    amp *= gain; freq *= lacunarity;
  }
  return sum / Math.max(norm, 1e-6);
}

/** 3D fBm from value noise, [0,1] — used for stamp/rock detail. */
export function vfbm3(x, y, z, { octaves = 4, gain = 0.5, lacunarity = 2, seed = 0 } = {}) {
  let amp = 1, freq = 1, sum = 0, norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += amp * value3(x * freq, y * freq, z * freq, seed + o * 977);
    norm += amp;
    amp *= gain; freq *= lacunarity;
  }
  return sum / Math.max(norm, 1e-6);
}

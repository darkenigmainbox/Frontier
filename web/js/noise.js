// Frontier — seeded 3D noise suite (DOM-free, deterministic).
// Value-noise lattice + fBm / ridged / multifractal / mountain / domain warp.
// All functions take an explicit `seed` so graphs are reproducible.

export function mulberry32(seed) {
  let a = (seed >>> 0) || 1;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Integer lattice hash -> [-1, 1], seeded. Fast, no tables.
export function hash3(x, y, z, seed) {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647 + seed * 974634211) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return ((h >>> 0) / 2147483648) - 1.0;
}

const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const lerp = (a, b, t) => a + (b - a) * t;

// Trilinear value noise in [-1, 1].
export function vnoise(x, y, z, seed) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = fade(xf), v = fade(yf), w = fade(zf);
  const c000 = hash3(xi, yi, zi, seed),     c100 = hash3(xi + 1, yi, zi, seed);
  const c010 = hash3(xi, yi + 1, zi, seed), c110 = hash3(xi + 1, yi + 1, zi, seed);
  const c001 = hash3(xi, yi, zi + 1, seed),     c101 = hash3(xi + 1, yi, zi + 1, seed);
  const c011 = hash3(xi, yi + 1, zi + 1, seed), c111 = hash3(xi + 1, yi + 1, zi + 1, seed);
  return lerp(
    lerp(lerp(c000, c100, u), lerp(c010, c110, u), v),
    lerp(lerp(c001, c101, u), lerp(c011, c111, u), v), w);
}

// Fractal Brownian motion, roughly [-1, 1].
export function fbm(x, y, z, { octaves = 5, lacunarity = 2.02, gain = 0.5, seed = 0 } = {}) {
  let amp = 0.5, f = 1, sum = 0, norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * vnoise(x * f, y * f, z * f, seed + i * 101);
    norm += amp;
    amp *= gain; f *= lacunarity;
  }
  return sum / (norm || 1);
}

// Ridged (billow^2) noise in [0, 1]-ish. Sharp crests -> mountain ridges.
export function ridged(x, y, z, { octaves = 5, lacunarity = 2.1, gain = 0.55, offset = 0.9, seed = 0 } = {}) {
  let amp = 0.55, f = 1, sum = 0, norm = 0;
  for (let i = 0; i < octaves; i++) {
    let n = 1 - Math.abs(vnoise(x * f, y * f, z * f, seed + i * 131));
    n = n * n;
    // Ridged weighting: higher octaves contribute mostly near crests.
    sum += n * amp;
    norm += amp;
    amp *= gain * (0.35 + 0.65 * n);
    f *= lacunarity;
  }
  void offset;
  return sum / (norm || 1);
}

// Multifractal mountain noise (Voss-style per-octave signal weighting).
export function multifractal(x, y, z, { octaves = 6, lacunarity = 2.0, gain = 0.7, offset = 0.75, seed = 0 } = {}) {
  let f = 1, sum = 0, weight = 1, a0 = 0.5;
  for (let i = 0; i < octaves; i++) {
    let s = vnoise(x * f, y * f, z * f, seed + i * 173) * 0.5 + 0.5;
    s = Math.pow(Math.max(0, s), 1.2);
    const signal = s * weight;
    sum += signal * a0;
    weight = Math.min(1, Math.max(0, signal * gain + offset * 0.25));
    a0 *= 0.55; f *= lacunarity;
  }
  return Math.min(1.4, sum) / 1.0 - 0.35; // ~[-0.35, 1]
}

// Domain warp vector (3 decorrelated fbm samples).
export function warpVec(x, y, z, { scale = 1, amp = 1, octaves = 3, seed = 0 } = {}) {
  return [
    amp * fbm(x * scale, y * scale, z * scale, { octaves, seed }),
    amp * fbm(x * scale + 5.2, y * scale + 1.3, z * scale + 2.8, { octaves, seed: seed + 911 }),
    amp * fbm(x * scale + 9.1, y * scale + 3.7, z * scale + 7.5, { octaves, seed: seed + 1823 }),
  ];
}

// Hero "mountain" macro: domain-warped ridged + strata warp + base lift.
// Returns ~[0, 1.2] mountain mass.
export function mountain(x, y, z, o = {}) {
  const {
    freq = 1, warp = 0.35, ridgeAmp = 1.0, baseAmp = 0.35,
    strataWarp = 0.0, seed = 0, octaves = 5,
  } = o;
  let px = x * freq, py = y * freq, pz = z * freq;
  if (warp > 0) {
    const w = warpVec(px, py, pz, { scale: 1.0, amp: warp, octaves: 3, seed });
    px += w[0]; py += w[1] * 0.6; pz += w[2];
  }
  const r = ridged(px, py, pz, { octaves, seed });
  const b = fbm(px * 0.5 + 3.1, py * 0.5, pz * 0.5, { octaves: 4, seed: seed + 57 }) * 0.5 + 0.5;
  let m = ridgeAmp * r + baseAmp * b;
  if (strataWarp > 0) {
    // Horizontal band perturbation -> sedimentary layering feel in the mass.
    m += strataWarp * 0.12 * Math.sin(py * 9.0 + 3.0 * b + seed * 0.13);
  }
  return m;
}

// Terrace quantizer with smoothing (benches). v in [0,1]-ish, levels>=2.
export function terrace(v, levels, sharpness = 0.6) {
  if (levels < 2) return v;
  const t = Math.min(0.9999, Math.max(0, v));
  const seg = t * levels;
  const i = Math.floor(seg), f = seg - i;
  const s = smoothstep(0.5 - sharpness * 0.5, 0.5 + sharpness * 0.5, f);
  return (i + s) / levels;
}

export function smoothstep(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
export function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }

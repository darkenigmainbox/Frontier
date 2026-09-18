// Frontier — seeded noise toolkit (CPU). Mirrors hash/noise in GLSL where needed.

export function hash(x, y, z, seed) {
  let n = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 2147483647) ^ Math.imul(seed, 1274126177);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

export function smooth(t) { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); }
export function lerp(a, b, t) { return a + (b - a) * t; }

export function noise3(x, y, z, seed = 0) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const fx = x - ix, fy = y - iy, fz = z - iz;
  const u = smooth(fx), v = smooth(fy), w = smooth(fz);
  const h000 = hash(ix, iy, iz, seed), h100 = hash(ix + 1, iy, iz, seed);
  const h010 = hash(ix, iy + 1, iz, seed), h110 = hash(ix + 1, iy + 1, iz, seed);
  const h001 = hash(ix, iy, iz + 1, seed), h101 = hash(ix + 1, iy, iz + 1, seed);
  const h011 = hash(ix, iy + 1, iz + 1, seed), h111 = hash(ix + 1, iy + 1, iz + 1, seed);
  const x00 = lerp(h000, h100, u), x10 = lerp(h010, h110, u);
  const x01 = lerp(h001, h101, u), x11 = lerp(h011, h111, u);
  const y0 = lerp(x00, x10, v), y1 = lerp(x01, x11, v);
  return lerp(y0, y1, w);
}

export function fbm(x, y, z, seed, octaves = 4, lac = 2, gain = 0.5) {
  let v = 0, amp = 1, freq = 1, sum = 0;
  for (let i = 0; i < octaves; i++) {
    v += noise3(x * freq, y * freq, z * freq, seed + i * 19) * amp;
    sum += amp; freq *= lac; amp *= gain;
  }
  return v / sum;
}

// Deterministic 32-bit PRNG (mulberry32) for particle sims
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

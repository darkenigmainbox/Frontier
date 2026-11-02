import * as THREE from 'three';

/**
 * Procedural, tileable sea-foam texture (generated once on the CPU).
 *
 *  R, G : two independent "lace" fields built from multi-scale periodic Worley noise:
 *         bubble walls (cell borders) are high, big open holes are low, tiny bubble pores punch
 *         small holes into dense regions. Each channel is histogram-equalised so a coverage
 *         threshold t reveals exactly (1 - t) of the area: thin foam = the web of walls,
 *         heavy foam = a solid mat with pores.
 *  B    : soft patch noise (equalised) used for under-water foam and coverage variation.
 */
export function createFoamTexture(renderer, size = 512) {
  const hash = (x, y, s) => {
    let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
  const mod = (a, n) => ((a % n) + n) % n;

  // Periodic Worley: returns [F1, F2] in cell units
  const worley = (u, v, cells, seed, jitter = 0.9) => {
    const x = u * cells, y = v * cells;
    const ix = Math.floor(x), iy = Math.floor(y);
    let f1 = 9, f2 = 9;
    for (let j = -1; j <= 1; j++) {
      for (let i = -1; i <= 1; i++) {
        const cx = ix + i, cy = iy + j;
        const hx = mod(cx, cells), hy = mod(cy, cells);
        const px = cx + 0.5 + (hash(hx, hy, seed) - 0.5) * jitter;
        const py = cy + 0.5 + (hash(hx, hy, seed + 101) - 0.5) * jitter;
        const d = Math.hypot(px - x, py - y);
        if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) f2 = d;
      }
    }
    return [f1, f2];
  };
  // Periodic value-noise fbm in [0, 1]
  const vnoise = (u, v, period, seed) => {
    const x = u * period, y = v * period;
    const ix = Math.floor(x), iy = Math.floor(y);
    const fx = x - ix, fy = y - iy;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const h = (a, b) => hash(mod(a, period), mod(b, period), seed);
    const a = h(ix, iy), b = h(ix + 1, iy), c = h(ix, iy + 1), d = h(ix + 1, iy + 1);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };
  const fbm = (u, v, base, seed) => {
    let s = 0, a = 0.5, n = 0;
    for (let o = 0; o < 4; o++) { s += a * vnoise(u, v, base << o, seed + o * 7); n += a; a *= 0.5; }
    return s / n;
  };
  const ss = (e0, e1, x) => { const t = Math.min(Math.max((x - e0) / (e1 - e0), 0), 1); return t * t * (3 - 2 * t); };

  const lace = (u, v, seed, scale) => {
    // domain warp so cells are irregular, stretched bubbles rather than a clean Voronoi diagram
    const wu = u + (fbm(u, v, 3, seed + 50) - 0.5) * 0.16;
    const wv = v + (fbm(u, v, 3, seed + 60) - 0.5) * 0.16;
    const [b1, b2] = worley(wu, wv, 6 * scale, seed);
    const [m1, m2] = worley(wu, wv, 15 * scale, seed + 11);
    const [s1, s2] = worley(wu, wv, 37 * scale, seed + 23);
    const [p1] = worley(u, v, 90 * scale, seed + 37, 1.0);
    const big = 1 - ss(0.0, 0.42, b2 - b1);
    const mid = 1 - ss(0.0, 0.2, m2 - m1);
    const small = 1 - ss(0.0, 0.14, s2 - s1);
    const pores = 1 - ss(0.12, 0.3, p1);
    const n = fbm(u, v, 8, seed + 3);
    return 0.4 * big + 0.3 * mid * (0.35 + big) + 0.22 * small + 0.42 * n - 0.16 * pores;
  };

  const N = size * size;
  const ch = [new Float32Array(N), new Float32Array(N), new Float32Array(N)];
  for (let y = 0; y < size; y++) {
    const v = (y + 0.5) / size;
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5) / size;
      const i = y * size + x;
      ch[0][i] = lace(u, v, 1, 1);
      ch[1][i] = lace(u, v, 77, 2);
      ch[2][i] = fbm(u, v, 3, 199) * 0.7 + fbm(u, v, 9, 211) * 0.3;
    }
  }
  // Histogram equalisation -> uniform distribution per channel
  const data = new Uint8Array(N * 4);
  const BINS = 2048;
  ch.forEach((a, c) => {
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < N; i++) { if (a[i] < lo) lo = a[i]; if (a[i] > hi) hi = a[i]; }
    const hist = new Uint32Array(BINS);
    const k = (BINS - 1) / Math.max(hi - lo, 1e-6);
    for (let i = 0; i < N; i++) hist[Math.floor((a[i] - lo) * k)]++;
    const cdf = new Float32Array(BINS);
    let acc = 0;
    for (let b = 0; b < BINS; b++) { acc += hist[b]; cdf[b] = acc / N; }
    for (let i = 0; i < N; i++) data[i * 4 + c] = Math.round(cdf[Math.floor((a[i] - lo) * k)] * 255);
  });
  for (let i = 0; i < N; i++) data[i * 4 + 3] = 255;

  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = Math.min(8, renderer ? renderer.capabilities.getMaxAnisotropy() : 1);
  tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}

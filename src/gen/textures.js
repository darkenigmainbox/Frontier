/* ============================================================
 * Frontier · SDF terrain — procedural albedo / normal / roughness
 *
 * Five layers (grass, dirt, rock, sand, snow) baked from noise into
 * seamless tileable textures. The terrain shader blends them by the
 * splat weights, so the surface keeps its material identity at every
 * zoom level without shipping a single image file.
 *
 * Each layer is produced by two bands: a low-frequency pattern (patches,
 * strata, dune ripples) and a high-frequency grain, plus a normal map
 * derived from the albedo's gradient so the fine detail responds to the
 * sun even though the mesh is coarse.
 * ============================================================ */

import { fbm, Perlin2D, value2, value3, subseed, vfbm2 } from './noise.js';

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a, b, t) => a + (b - a) * t;

const hex = (r, g, b) => [r / 255, g / 255, b / 255];

export const LAYER_DEFS = {
  grass: {
    label: 'Grass',
    base: hex(96, 122, 62),
    alt: hex(64, 88, 44),
    accent: hex(140, 150, 80),
    rough: 0.92,
    pattern: 'tufts',
  },
  dirt: {
    label: 'Dirt',
    base: hex(112, 92, 68),
    alt: hex(86, 70, 52),
    accent: hex(134, 112, 84),
    rough: 0.88,
    pattern: 'grain',
  },
  rock: {
    label: 'Rock',
    base: hex(122, 120, 124),
    alt: hex(88, 86, 92),
    accent: hex(150, 146, 142),
    rough: 0.78,
    pattern: 'strata',
  },
  sand: {
    label: 'Sand',
    base: hex(196, 180, 140),
    alt: hex(172, 156, 118),
    accent: hex(214, 200, 164),
    rough: 0.95,
    pattern: 'ripple',
  },
  snow: {
    label: 'Snow',
    base: hex(238, 242, 248),
    alt: hex(210, 220, 236),
    accent: hex(252, 254, 255),
    rough: 0.55,
    pattern: 'drift',
  },
};

export const LAYER_ORDER = ['grass', 'dirt', 'rock', 'sand', 'snow'];

/**
 * Bake one layer.
 * @param {string} key
 * @param {number} size   texture resolution (power of two)
 * @param {number} seed
 * @returns {{key:string, size:number, albedo:Uint8Array, normal:Uint8Array, rough:Uint8Array}}
 */
export function bakeLayer(key, size = 512, seed = 1) {
  const def = LAYER_DEFS[key] || LAYER_DEFS.rock;
  const albedo = new Uint8Array(size * size * 3);
  const rough = new Uint8Array(size * size);
  const height = new Float32Array(size * size);
  const p = new Perlin2D(subseed(seed, hashKey(key)));
  const p2 = new Perlin2D(subseed(seed ^ 0x9e37, hashKey(key) + 7));
  const s = seed ^ hashKey(key);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // tileable: sample noise on a torus so the texture repeats seamlessly
      const u = x / size, v = y / size;
      const ang = u * Math.PI * 2, ang2 = v * Math.PI * 2;
      const r = 3.0, rr = 1.6;
      const nx = Math.cos(ang) * r, ny = Math.sin(ang) * r;
      const nz = Math.cos(ang2) * rr, nw = Math.sin(ang2) * rr;

      let m;
      switch (def.pattern) {
        case 'tufts': {
          const clump = fbm(p, nx * 1.2 + nz * 0.7, ny * 1.2 + nw * 0.7, { octaves: 5, gain: 0.55 });
          const blades = fbm(p2, nx * 9 + nz * 2, ny * 9 + nw * 2, { octaves: 3, gain: 0.5 });
          m = 0.5 + 0.5 * clump * 0.85 + 0.15 * blades;
          break;
        }
        case 'strata': {
          const band = Math.sin((ny * 1.6 + nw * 0.6) * 2.2 + 1.4 * fbm(p, nx * 2, nz * 2, { octaves: 3 }));
          const cracks = fbm(p2, nx * 7, nz * 7, { octaves: 4, gain: 0.6 });
          m = 0.5 + 0.35 * band + 0.25 * cracks;
          break;
        }
        case 'ripple': {
          const ripple = Math.sin((nx * 6 + nz * 2.4) * 1.6 + 2.0 * fbm(p, nx * 3, nz * 3, { octaves: 2 }));
          m = 0.5 + 0.3 * ripple + 0.2 * fbm(p2, nx * 12, nz * 12, { octaves: 3 });
          break;
        }
        case 'drift': {
          const drift = fbm(p, nx * 1.6, nz * 1.6, { octaves: 4, gain: 0.5 });
          const crunch = fbm(p2, nx * 14, nz * 14, { octaves: 2 });
          m = 0.5 + 0.4 * drift + 0.1 * crunch;
          break;
        }
        default: {
          const grain = fbm(p, nx * 4, nz * 4, { octaves: 4, gain: 0.6 });
          const speck = fbm(p2, nx * 16, nz * 16, { octaves: 2 });
          m = 0.5 + 0.45 * grain + 0.15 * speck;
        }
      }
      m = clamp01(m);
      // gentle grit at pixel scale so the surface never looks plastic
      const grit = (value2(x * 0.7, y * 0.7, s) - 0.5) * 0.09;
      const mi = clamp01(m + grit);
      height[y * size + x] = mi;

      const c = key === 'snow' || key === 'sand'
        ? lerp3(def.alt, def.base, mi)
        : lerp3(def.alt, def.base, mi * 0.85 + 0.1);
      const accent = clamp01((mi - 0.72) * 3.0);
      const col = lerp3(c, def.accent, accent * 0.55);
      const i3 = (y * size + x) * 3;
      albedo[i3] = clamp255(col[0] * 255);
      albedo[i3 + 1] = clamp255(col[1] * 255);
      albedo[i3 + 2] = clamp255(col[2] * 255);
      rough[y * size + x] = clamp255((def.rough + grit * 2) * 255);
    }
  }

  // normal map from the height field (Sobel, tileable wraparound)
  const normal = new Uint8Array(size * size * 4);
  const strength = key === 'rock' ? 3.2 : key === 'snow' ? 1.6 : 2.4;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const xm = (x - 1 + size) % size, xp = (x + 1) % size;
      const ym = (y - 1 + size) % size, yp = (y + 1) % size;
      const dx = (height[y * size + xp] - height[y * size + xm]) * strength;
      const dy = (height[yp * size + x] - height[ym * size + x]) * strength;
      let nx = -dx, ny = -dy, nz = 1;
      const len = Math.hypot(nx, ny, nz);
      nx /= len; ny /= len; nz /= len;
      const i4 = (y * size + x) * 4;
      normal[i4] = clamp255((nx * 0.5 + 0.5) * 255);
      normal[i4 + 1] = clamp255((ny * 0.5 + 0.5) * 255);
      normal[i4 + 2] = clamp255((nz * 0.5 + 0.5) * 255);
      normal[i4 + 3] = 255;
    }
  }
  return { key, size, albedo, normal, rough };
}

/** Bake the full set (grass, dirt, rock, sand, snow). */
export function bakeAllLayers(size = 512, seed = 1, keys = LAYER_ORDER) {
  const out = {};
  for (const k of keys) out[k] = bakeLayer(k, size, seed);
  return out;
}

/**
 * Pack the five baked layers into a single atlas texture (rows = layers,
 * columns = tiles) so the shader needs one sampler per map type.
 */
export function packAtlas(layers, keys = LAYER_ORDER) {
  const size = layers[keys[0]].size;
  const w = size, h = size * keys.length;
  const albedo = new Uint8Array(w * h * 3);
  const normal = new Uint8Array(w * h * 4);
  const rough = new Uint8Array(w * h);
  keys.forEach((k, li) => {
    const L = layers[k];
    albedo.set(L.albedo, li * size * w * 3);
    normal.set(L.normal, li * size * w * 4);
    rough.set(L.rough, li * size * w);
  });
  return { width: w, height: h, layers: keys, albedo, normal, rough };
}

/* ------------------------------ height brush ---------------------------- */

/**
 * Per-voxel brush texture: a small 3D field used by the sculpting
 * brushes so a stroke reads as rock rather than as a melted blob.
 */
export function brushTexture3D(size = 32, seed = 1, kind = 'rock') {
  const out = new Float32Array(size * size * size);
  for (let z = 0; z < size; z++)
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const s = 1 / size;
        let v;
        if (kind === 'checker') v = ((x >> 2) + (y >> 2) + (z >> 2)) & 1 ? 1 : 0.35;
        else if (kind === 'strata') v = 0.5 + 0.5 * Math.sin(y * s * Math.PI * 6 + value3(x * s * 3, 0, z * s * 3, seed) * 2);
        else v = vfbm2v(x * s, y * s, z * s, seed);
        out[(z * size + y) * size + x] = clamp01(v);
      }
  return { size, data: out };
}

function vfbm2v(x, y, z, seed) {
  let amp = 1, freq = 1, sum = 0, norm = 0;
  for (let o = 0; o < 3; o++) {
    sum += amp * value3(x * freq, y * freq, z * freq, seed + o * 977);
    norm += amp;
    amp *= 0.55; freq *= 2.2;
  }
  return sum / Math.max(norm, 1e-6);
}

/* -------------------------------- helpers ------------------------------- */

function hashKey(k) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < k.length; i++) { h ^= k.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h & 0xffff;
}
const clamp255 = (v) => (v < 0 ? 0 : v > 255 ? 255 : v | 0);
const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

void vfbm2;

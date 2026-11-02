import * as THREE from 'three';
import { rawMaterial } from '../core/gpu.js';
import { waterShaders } from '../shaders/water.js';

// ---- small deterministic noise toolkit (CPU) ----
function hash2(ix, iz) {
  let h = (ix * 374761393 + iz * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function vnoise(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z);
  const fx = x - ix, fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx), uz = fz * fz * (3 - 2 * fz);
  const a = hash2(ix, iz), b = hash2(ix + 1, iz), c = hash2(ix, iz + 1), d = hash2(ix + 1, iz + 1);
  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
}
function fbm(x, z, oct = 5) {
  let s = 0, a = 0.5, f = 1;
  for (let i = 0; i < oct; i++) { s += a * vnoise(x * f, z * f); f *= 2.03; a *= 0.5; }
  return s;
}
const smooth = (e0, e1, v) => { const t = Math.min(Math.max((v - e0) / (e1 - e0), 0), 1); return t * t * (3 - 2 * t); };

// Radial profile of the island: [normalised radius, height]
const PROFILE = [[0, 19], [0.35, 12], [0.62, 4.5], [0.8, 1.8], [0.9, 0.9], [1.0, -0.4], [1.12, -1.6], [1.3, -4.2], [1.65, -11], [2.2, -24], [3.4, -40], [6, -46]];
function profile(t) {
  if (t <= PROFILE[0][0]) return PROFILE[0][1];
  for (let i = 1; i < PROFILE.length; i++) {
    const [t1, h1] = PROFILE[i];
    const [t0, h0] = PROFILE[i - 1];
    if (t <= t1) { const u = (t - t0) / (t1 - t0); const s = u * u * (3 - 2 * u); return h0 + (h1 - h0) * s; }
  }
  return PROFILE[PROFILE.length - 1][1];
}

// 1D squared Euclidean distance transform (Felzenszwalb & Huttenlocher)
function edt1d(f, n, d, v, z) {
  let k = 0; v[0] = 0; z[0] = -Infinity; z[1] = Infinity;
  for (let q = 1; q < n; q++) {
    let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) { k--; s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
    k++; v[k] = q; z[k] = s; z[k + 1] = Infinity;
  }
  k = 0;
  for (let q = 0; q < n; q++) { while (z[k + 1] < q) k++; d[q] = (q - v[k]) * (q - v[k]) + f[v[k]]; }
}
function edt2d(mask, n) {
  const INF = 1e20;
  const grid = new Float64Array(n * n);
  for (let i = 0; i < n * n; i++) grid[i] = mask[i] ? 0 : INF;
  const f = new Float64Array(n), d = new Float64Array(n), v = new Int32Array(n), z = new Float64Array(n + 1);
  for (let x = 0; x < n; x++) {
    for (let y = 0; y < n; y++) f[y] = grid[y * n + x];
    edt1d(f, n, d, v, z);
    for (let y = 0; y < n; y++) grid[y * n + x] = d[y];
  }
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) f[x] = grid[y * n + x];
    edt1d(f, n, d, v, z);
    for (let x = 0; x < n; x++) grid[y * n + x] = Math.sqrt(d[x]);
  }
  return grid;
}

export class Terrain {
  constructor(shared) {
    this.size = 1400;
    this.res = 512;
    this.origin = new THREE.Vector2(-this.size / 2, -this.size / 2);
    this.texel = this.size / (this.res - 1);
    this.generate();
    this.computeShoreDistance();
    this.computeAO();
    this.shadow = new Float32Array(this.res * this.res).fill(1);
    this.data = new Uint16Array(this.res * this.res * 4);
    this.texture = new THREE.DataTexture(this.data, this.res, this.res, THREE.RGBAFormat, THREE.HalfFloatType);
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.wrapS = this.texture.wrapT = THREE.ClampToEdgeWrapping;
    this.uniforms = {
      uTerrain: { value: this.texture },
      uTerrainXf: { value: new THREE.Vector4(this.origin.x, this.origin.y, this.size, 1 / (this.res - 1)) },
    };
    this.upload();
    if (shared) this.buildMesh(shared);
  }

  heightFn(x, z) {
    // Main island with a noisy coastline
    const r = Math.hypot(x, z);
    const R = 118 * (0.78 + 0.45 * fbm(x * 0.0065 + 3.1, z * 0.0065 - 7.7, 4));
    const t = r / R;
    let h = profile(t);
    h += (fbm(x * 0.018, z * 0.018, 5) - 0.5) * 14 * (1 - smooth(0.25, 0.8, t));
    h += (fbm(x * 0.05 + 11, z * 0.05, 3) - 0.5) * 1.6 * smooth(0.9, 1.3, t);
    // Rocky islet
    const ix = x + 235, iz = z - 165;
    const ri = Math.hypot(ix, iz) / (34 * (0.8 + 0.4 * fbm(ix * 0.03, iz * 0.03, 3)));
    const hi = profile(ri * 0.95) * 0.55 + (fbm(ix * 0.08, iz * 0.08, 4) - 0.5) * 7 * (1 - smooth(0.3, 1.1, ri));
    h = Math.max(h, hi - (ri > 1.4 ? 12 : 0));
    // Boulders scattered around the shoreline (great for wave/foam interaction)
    for (const b of this.boulders) {
      const dx = x - b.x, dz = z - b.z;
      const q = (dx * dx + dz * dz) / (b.r * b.r);
      if (q < 4) h = Math.max(h, b.base + b.h * Math.exp(-q * 1.6) * (0.8 + 0.4 * vnoise(x * 0.4, z * 0.4)));
    }
    // Sea floor detail
    h += (fbm(x * 0.012 - 5, z * 0.012 + 2, 4) - 0.5) * 3 * smooth(1.2, 2.0, t);
    // Deep ocean towards the edges of the map
    const edge = Math.max(Math.abs(x), Math.abs(z)) / (this.size / 2);
    h = h * (1 - smooth(0.82, 0.98, edge)) + -48 * smooth(0.82, 0.98, edge);
    return h;
  }

  generate() {
    const n = this.res;
    this.boulders = [];
    let s = 9;
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let i = 0; i < 16; i++) {
      const a = rnd() * Math.PI * 2;
      const rr = 105 + rnd() * 55;
      this.boulders.push({ x: Math.cos(a) * rr, z: Math.sin(a) * rr, r: 3 + rnd() * 5, h: 3 + rnd() * 5, base: -4 });
    }
    this.height = new Float32Array(n * n);
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const x = this.origin.x + i * this.texel;
        const z = this.origin.y + j * this.texel;
        this.height[j * n + i] = this.heightFn(x, z);
      }
    }
  }

  computeShoreDistance() {
    const n = this.res;
    const land = new Uint8Array(n * n), water = new Uint8Array(n * n);
    for (let i = 0; i < n * n; i++) { land[i] = this.height[i] > 0 ? 1 : 0; water[i] = land[i] ? 0 : 1; }
    const dToLand = edt2d(land, n);
    const dToWater = edt2d(water, n);
    this.shoreDist = new Float32Array(n * n);
    for (let i = 0; i < n * n; i++) {
      const d = land[i] ? -(dToWater[i] - 0.5) : dToLand[i] - 0.5;
      this.shoreDist[i] = Math.max(-1500, Math.min(1500, d * this.texel));
    }
  }

  computeAO() {
    const n = this.res;
    this.ao = new Float32Array(n * n);
    const dirs = 8, steps = 10;
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const h0 = this.height[j * n + i];
        let occ = 0;
        for (let d = 0; d < dirs; d++) {
          const a = (d / dirs) * Math.PI * 2;
          const dx = Math.cos(a), dz = Math.sin(a);
          let maxSlope = 0;
          for (let s = 1; s <= steps; s++) {
            const dist = s * s * 0.6 + s;
            const x = Math.round(i + dx * dist), z = Math.round(j + dz * dist);
            if (x < 0 || z < 0 || x >= n || z >= n) break;
            const slope = (this.height[z * n + x] - h0) / (dist * this.texel);
            if (slope > maxSlope) maxSlope = slope;
          }
          occ += Math.sin(Math.atan(maxSlope));
        }
        this.ao[j * n + i] = Math.max(0.25, 1 - occ / dirs * 1.2);
      }
    }
  }

  bakeShadows(sunDir) {
    const n = this.res;
    const len = Math.hypot(sunDir.x, sunDir.z);
    if (sunDir.y <= 0.01) { this.shadow.fill(0.0); this.upload(); return; }
    const dx = sunDir.x / len, dz = sunDir.z / len;
    const rise = (sunDir.y / len) * this.texel; // metres of height per texel stepped
    const maxSteps = 140;
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const h0 = this.height[j * n + i] + 0.3;
        let lit = 1;
        for (let s = 1; s < maxSteps; s += 1 + (s >> 4)) {
          const x = i + dx * s, z = j + dz * s;
          if (x < 0 || z < 0 || x >= n - 1 || z >= n - 1) break;
          const ray = h0 + rise * s;
          if (ray > 40) break;
          const th = this.height[Math.round(z) * n + Math.round(x)];
          const diff = ray - th;
          if (diff < 0) { lit = 0; break; }
          lit = Math.min(lit, diff / (s * this.texel * 0.04));
        }
        this.shadow[j * n + i] = Math.max(0, Math.min(1, lit));
      }
    }
    this.upload();
  }

  upload() {
    const n = this.res, out = this.data, toHalf = THREE.DataUtils.toHalfFloat;
    for (let i = 0; i < n * n; i++) {
      out[i * 4 + 0] = toHalf(this.height[i]);
      out[i * 4 + 1] = toHalf(this.shoreDist[i]);
      out[i * 4 + 2] = toHalf(this.shadow ? this.shadow[i] : 1);
      out[i * 4 + 3] = toHalf(this.ao[i]);
    }
    this.texture.needsUpdate = true;
  }

  /** Bilinear CPU sample: { h: height, d: signed shoreline distance } */
  sample(x, z) {
    const n = this.res;
    const fx = (x - this.origin.x) / this.texel, fz = (z - this.origin.y) / this.texel;
    if (fx < 0 || fz < 0 || fx >= n - 1 || fz >= n - 1) return { h: -48, d: 400 };
    const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j;
    const k = j * n + i;
    const lerp2 = (a) => (a[k] * (1 - u) + a[k + 1] * u) * (1 - v) + (a[k + n] * (1 - u) + a[k + n + 1] * u) * v;
    return { h: lerp2(this.height), d: lerp2(this.shoreDist) };
  }

  buildMesh(shared) {
    const seg = 512;
    const pos = new Float32Array((seg + 1) * (seg + 1) * 3);
    let p = 0;
    for (let j = 0; j <= seg; j++) {
      for (let i = 0; i <= seg; i++) {
        pos[p++] = this.origin.x + (i / seg) * this.size;
        pos[p++] = 0;
        pos[p++] = this.origin.y + (j / seg) * this.size;
      }
    }
    const idx = new Uint32Array(seg * seg * 6);
    let q = 0;
    for (let j = 0; j < seg; j++) {
      for (let i = 0; i < seg; i++) {
        const a = j * (seg + 1) + i, b = a + 1, c = a + seg + 1, d = c + 1;
        idx[q++] = a; idx[q++] = c; idx[q++] = b;
        idx[q++] = b; idx[q++] = c; idx[q++] = d;
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), this.size);
    this.material = rawMaterial(waterShaders.terrain, {
      ...this.uniforms,
      ...shared,
      uClipBelow: { value: 0 },
    }, { depthTest: true, depthWrite: true });
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.frustumCulled = false;
  }
}

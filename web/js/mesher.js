// Frontier — Surface Nets mesher + per-vertex SDF mask baking. DOM-free.

import { clamp } from './noise.js';

// 12 edges of a cube over corner ids (dx + 2*dy + 4*dz).
const EDGES = [
  [0, 1], [2, 3], [4, 5], [6, 7],
  [0, 2], [1, 3], [4, 6], [5, 7],
  [0, 4], [1, 5], [2, 6], [3, 7],
];
const COFF = [
  [0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0],
  [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1],
];

export function meshSurfaceNets(vol, opts = {}) {
  const t0 = performance.now ? performance.now() : Date.now();
  const { nx, ny, nz, dist } = vol;
  const nxy = nx * ny;
  const at = (i, j, k) => dist[k * nxy + j * nx + i];

  const cellVert = new Int32Array((nx - 1) * (ny - 1) * (nz - 1)).fill(-1);
  const cidx = (i, j, k) => (k * (ny - 1) + j) * (nx - 1) + i;
  const pos = [];
  const p = [0, 0, 0];

  // Pass 1: one vertex per sign-changing cell, averaged edge crossings.
  for (let k = 0; k < nz - 1; k++) {
    for (let j = 0; j < ny - 1; j++) {
      for (let i = 0; i < nx - 1; i++) {
        let mask = 0;
        const vals = new Array(8);
        for (let c = 0; c < 8; c++) {
          const v = at(i + COFF[c][0], j + COFF[c][1], k + COFF[c][2]);
          vals[c] = v;
          if (v < 0) mask |= (1 << c);
        }
        if (mask === 0 || mask === 255) continue;
        let sx = 0, sy = 0, sz = 0, cnt = 0;
        for (const [a, b] of EDGES) {
          const va = vals[a], vb = vals[b];
          if ((va < 0) === (vb < 0)) continue;
          const t = va / (va - vb);
          const A = COFF[a], B = COFF[b];
          sx += i + A[0] + (B[0] - A[0]) * t;
          sy += j + A[1] + (B[1] - A[1]) * t;
          sz += k + A[2] + (B[2] - A[2]) * t;
          cnt++;
        }
        if (cnt === 0) continue;
        sx /= cnt; sy /= cnt; sz /= cnt;
        const vi = pos.length / 3;
        cellVert[cidx(i, j, k)] = vi;
        pos.push(
          vol.minX + (sx / (nx - 1)) * vol.sizeX,
          vol.minY + (sy / (ny - 1)) * vol.sizeY,
          vol.minZ + (sz / (nz - 1)) * vol.sizeZ
        );
      }
    }
  }

  // Pass 2: quads around sign-changing lattice edges (winding derived in docs).
  const idx = [];
  const quad = (a, b, c, dd, flip) => {
    if (a < 0 || b < 0 || c < 0 || dd < 0) return;
    if (!flip) idx.push(a, b, c, a, c, dd);
    else idx.push(a, dd, c, a, c, b);
  };
  // X-edges.
  for (let k = 1; k < nz - 1; k++)
    for (let j = 1; j < ny - 1; j++)
      for (let i = 0; i < nx - 1; i++) {
        const a = at(i, j, k), b = at(i + 1, j, k);
        if ((a < 0) === (b < 0)) continue;
        quad(cidx(i, j, k), cidx(i, j - 1, k), cidx(i, j - 1, k - 1), cidx(i, j, k - 1), a > 0);
      }
  // Y-edges.
  for (let k = 1; k < nz - 1; k++)
    for (let j = 0; j < ny - 1; j++)
      for (let i = 1; i < nx - 1; i++) {
        const a = at(i, j, k), b = at(i, j + 1, k);
        if ((a < 0) === (b < 0)) continue;
        // CCW-from-+y order is D0,D3,D2,D1 -> quad(a=D0,b=D3,c=D2,d=D1).
        quad(cidx(i, j, k), cidx(i, j, k - 1), cidx(i - 1, j, k - 1), cidx(i - 1, j, k), a > 0);
      }
  // Z-edges.
  for (let k = 0; k < nz - 1; k++)
    for (let j = 1; j < ny - 1; j++)
      for (let i = 1; i < nx - 1; i++) {
        const a = at(i, j, k), b = at(i, j, k + 1);
        if ((a < 0) === (b < 0)) continue;
        // CCW-from-+z order is E1,E2,E3,E0.
        quad(cidx(i - 1, j, k), cidx(i - 1, j - 1, k), cidx(i, j - 1, k), cidx(i, j, k), a > 0);
      }

  const nv = pos.length / 3;
  const normals = new Float32Array(nv * 3);
  const ao = new Float32Array(nv);
  const curv = new Float32Array(nv);
  const cav = new Float32Array(nv);
  const sed = new Float32Array(nv);
  const moist = new Float32Array(nv);
  const flow = new Float32Array(nv);
  const erode = new Float32Array(nv);
  const hard = new Float32Array(nv);
  const strata = new Float32Array(nv);

  // Pass 3: bake masks from the live SDF.
  const n = [0, 0, 0], cc = {};
  const aoR = opts.aoRadiusVox || 9, aoTaps = opts.aoTaps || 5;
  let flowMax = 1e-6, erodeMax = 1e-6, sedMax = 1e-6;
  for (let v = 0; v < nv; v++) {
    const x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2];
    vol.gradient(x, y, z, n);
    normals[v * 3] = n[0]; normals[v * 3 + 1] = n[1]; normals[v * 3 + 2] = n[2];
    const ox = x + n[0] * vol.voxel * 0.5, oy = y + n[1] * vol.voxel * 0.5, oz = z + n[2] * vol.voxel * 0.5;
    ao[v] = vol.occlusion(ox, oy, oz, n[0], n[1], n[2], aoR, aoTaps);
    vol.curvature(x, y, z, cc);
    curv[v] = cc.H; cav[v] = cc.K;
    const s = vol.sampleField(vol.sed, x, y, z);
    const f = vol.sampleField(vol.flow, x, y, z);
    const e = vol.sampleField(vol.emask, x, y, z);
    sed[v] = s; flow[v] = f; erode[v] = e;
    if (f > flowMax) flowMax = f;
    if (e > erodeMax) erodeMax = e;
    if (s > sedMax) sedMax = s;
    moist[v] = clamp(vol.sampleField(vol.moist, x, y, z), 0, 1.5);
    hard[v] = clamp(vol.sampleField(vol.hard, x, y, z), 0, 1);
    strata[v] = vol.sampleField(vol.strata, x, y, z);
  }
  // Normalize heavy-tailed fields.
  const lf = Math.log(1 + flowMax), le = Math.log(1 + erodeMax), ls = Math.log(1 + sedMax);
  for (let v = 0; v < nv; v++) {
    flow[v] = Math.log(1 + flow[v]) / lf;
    erode[v] = Math.log(1 + erode[v]) / le;
    sed[v] = Math.log(1 + sed[v]) / ls;
    moist[v] = clamp(moist[v], 0, 1);
  }
  // Curvature scale: normalize by robust percentile-ish scale.
  let hs = 0;
  for (let v = 0; v < nv; v += 7) hs += Math.abs(curv[v]);
  hs = hs / Math.max(1, Math.floor(nv / 7)) || 1e-6;
  const curvScale = 1 / (hs * 3 + 1e-9);
  for (let v = 0; v < nv; v++) curv[v] = clamp(curv[v] * curvScale, -1, 1);

  const t1 = performance.now ? performance.now() : Date.now();
  return {
    positions: new Float32Array(pos),
    normals, ao, curv, cav, sed, moist, flow, erode, hard, strata,
    indices: idx.length > 65500 ? new Uint32Array(idx) : new Uint16Array(idx),
    verts: nv, tris: idx.length / 3, ms: t1 - t0,
    flowMax, erodeMax, sedMax,
  };
}

// High-frequency surface energy (roughness) for the anti-smoothing test:
// mean |H| over sampled surface points + variance of normals.
export function surfaceRoughness(vol, samples = 4000, seed = 42) {
  let s = seed >>> 0;
  const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  const cc = {};
  let sumH = 0, n = 0;
  for (let t = 0; t < samples; t++) {
    const i = 2 + Math.floor(rnd() * (vol.nx - 4));
    const k = 2 + Math.floor(rnd() * (vol.nz - 4));
    // scan column for surface
    const base = k * vol.ny * vol.nx;
    for (let j = vol.ny - 1; j > 0; j--) {
      const a = vol.dist[base + j * vol.nx + i];
      const b = vol.dist[base + (j - 1) * vol.nx + i];
      if (a > 0 && b <= 0) {
        const x = vol.minX + (i / (vol.nx - 1)) * vol.sizeX;
        const y = vol.minY + (j / (vol.ny - 1)) * vol.sizeY;
        const z = vol.minZ + (k / (vol.nz - 1)) * vol.sizeZ;
        vol.curvature(x, y, z, cc);
        if (isFinite(cc.H)) { sumH += Math.abs(cc.H); n++; }
        break;
      }
    }
  }
  return n ? sumH / n : 0;
}

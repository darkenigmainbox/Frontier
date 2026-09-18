// Frontier — SDF volume container + procedural terrain generation.
// Volume layout (RGBA per voxel):
//   R = signed distance [m]  (negative = rock)
//   G = moisture / flow accumulation
//   B = loose sediment volume [m³]
//   A = solid fraction in [0,1], exact inside the band: d = BAND*(1-2A)
// Material atlas (separate RGBA per voxel, mirrors GPU 'materials' texture):
//   RGB = loose sediment species fractions (sand/silt/coarse), A = armor/wear in [0,1]

import { SIZE, MIN, MAX, CELL, BAND, defaults } from "./constants.js";
import { fbm, noise3 } from "./noise.js";
import { sampleStampSDF } from "./stamps.js";

export class Volume {
  constructor(dims = SIZE, min = MIN, max = MAX) {
    this.dims = dims.slice();
    this.min = min.slice();
    this.max = max.slice();
    this.cell = [
      (max[0] - min[0]) / dims[0],
      (max[1] - min[1]) / dims[1],
      (max[2] - min[2]) / dims[2],
    ];
    this.voxelVolume = this.cell[0] * this.cell[1] * this.cell[2];
    const n = dims[0] * dims[1] * dims[2];
    this.data = new Float32Array(n * 4);       // terrain (RGBA)
    this.material = new Float32Array(n * 4);   // species RGB + armor A
    this.stamps = [];
  }
  index(x, y, z) { return ((z * this.dims[1] + y) * this.dims[0] + x) * 4; }
  worldAt(x, y, z, out = [0, 0, 0]) {
    out[0] = this.min[0] + (x + 0.5) * this.cell[0];
    out[1] = this.min[1] + (y + 0.5) * this.cell[1];
    out[2] = this.min[2] + (z + 0.5) * this.cell[2];
    return out;
  }
  // Trilinear SDF sample (adds outside-boundary distance like the GPU version)
  sampleSDF(wx, wy, wz) {
    const [nx, ny, nz] = this.dims;
    const q = [
      Math.max(0, Math.min(nx - 1.001, (wx - this.min[0]) / this.cell[0] - 0.5)),
      Math.max(0, Math.min(ny - 1.001, (wy - this.min[1]) / this.cell[1] - 0.5)),
      Math.max(0, Math.min(nz - 1.001, (wz - this.min[2]) / this.cell[2] - 0.5)),
    ];
    const lo = q.map(Math.floor), f = q.map((v, k) => v - lo[k]);
    const d = this.data;
    let v = 0;
    for (let dz = 0; dz < 2; dz++) for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
      const i = this.index(Math.min(nx - 1, lo[0] + dx), Math.min(ny - 1, lo[1] + dy), Math.min(nz - 1, lo[2] + dz));
      v += d[i] * (dx ? f[0] : 1 - f[0]) * (dy ? f[1] : 1 - f[1]) * (dz ? f[2] : 1 - f[2]);
    }
    const outside = Math.hypot(
      Math.max(this.min[0] - wx, wx - this.max[0], 0),
      Math.max(this.min[1] - wy, wy - this.max[1], 0),
      Math.max(this.min[2] - wz, wz - this.max[2], 0)
    );
    return v + outside;
  }
  sampleSDF3(p) { return this.sampleSDF(p[0], p[1], p[2]); }
  normal(wx, wy, wz, out = [0, 0, 0], eps = 0.18) {
    out[0] = this.sampleSDF(wx + eps, wy, wz) - this.sampleSDF(wx - eps, wy, wz);
    out[1] = this.sampleSDF(wx, wy + eps, wz) - this.sampleSDF(wx, wy - eps, wz);
    out[2] = this.sampleSDF(wx, wy, wz + eps) - this.sampleSDF(wx, wy, wz - eps);
    const l = Math.hypot(out[0], out[1], out[2]);
    if (l > 1e-6) { out[0] /= l; out[1] /= l; out[2] /= l; return out; }
    out[0] = 0; out[1] = 1; out[2] = 0;
    return out;
  }
  sampleMaterial(wx, wy, wz, out = [0, 0, 0, 0]) {
    const [nx, ny, nz] = this.dims;
    const gx = Math.max(0, Math.min(nx - 1, Math.round((wx - this.min[0]) / this.cell[0] - 0.5)));
    const gy = Math.max(0, Math.min(ny - 1, Math.round((wy - this.min[1]) / this.cell[1] - 0.5)));
    const gz = Math.max(0, Math.min(nz - 1, Math.round((wz - this.min[2]) / this.cell[2] - 0.5)));
    const i = this.index(gx, gy, gz);
    out[0] = this.material[i]; out[1] = this.material[i + 1];
    out[2] = this.material[i + 2]; out[3] = this.material[i + 3];
    return out;
  }
  // Moisture / flow-accumulation channel (data G) at a world point — the gully
  // feedback reads this to reinforce incision along wet flow paths.
  sampleWet(wx, wy, wz) {
    const [nx, ny, nz] = this.dims;
    const gx = Math.max(0, Math.min(nx - 1, Math.round((wx - this.min[0]) / this.cell[0] - 0.5)));
    const gy = Math.max(0, Math.min(ny - 1, Math.round((wy - this.min[1]) / this.cell[1] - 0.5)));
    const gz = Math.max(0, Math.min(nz - 1, Math.round((wz - this.min[2]) / this.cell[2] - 0.5)));
    return this.data[this.index(gx, gy, gz) + 1];
  }
  solidMass() {
    let s = 0;
    for (let i = 3; i < this.data.length; i += 4) s += this.data[i];
    return s * this.voxelVolume;
  }
}

// --- Procedural formations --------------------------------------------------

function boxSDF(px, py, pz, bx, by, bz, r = 0) {
  const qx = Math.abs(px) - bx, qy = Math.abs(py) - by, qz = Math.abs(pz) - bz;
  const ax = Math.max(qx, 0), ay = Math.max(qy, 0), az = Math.max(qz, 0);
  return Math.hypot(ax, ay, az) + Math.min(Math.max(qx, qy, qz), 0) - r;
}

function canyonCenter(z, p) {
  return p.canyonMeander * (2.5 * Math.sin(z * 0.15) + Math.sin(z * 0.36 + 1)) + (p.riverOffset || 0);
}

// Analytic base SDF for the four formations (inherited from the particle branch,
// kept nearly verbatim — it produced the looks the user liked).
export function baseSDF(x, y, z, params = defaults) {
  const p = params;
  const s = p.seed | 0;
  const n1 = fbm(x * 0.18, y * 0.09, z * 0.18, s, 4, 2, 0.5);
  const n2 = fbm(x * 0.55, y * 0.32, z * 0.55, s + 31, 3, 2, 0.5);
  const n3 = fbm(x * 0.85, y * 0.07, z * 0.85, s + 45, 2, 2, 0.6);

  if (p.preset === 3) {
    const top = p.plotHeight ?? 2.5;
    const bottom = Math.min(p.plotBase ?? -2, top - 0.8);
    const wx = 19, wz = 17;
    let d = boxSDF(x, y - (top + bottom) * 0.5, z, wx - 0.3, (top - bottom) * 0.5 - 0.3, wz - 0.3, 0.3);
    d -= (p.plotNoiseAmount || 0.12) * fbm(x * 0.25, y * 0.25, z * 0.25, s, 3, 2, 0.5);
    return Math.max(d, Math.abs(x) - 21, Math.abs(z) - 19, Math.abs(y - 8) - 12);
  }

  if (p.preset === 2) {
    let d = boxSDF(x, y + 2, z, 18, 3, 16, 1.2);
    const towers = [
      [-9, -4, 3.8, 3.6, 0.95], [7, 1, 4.0, 3.9, 1.0], [-3, 8, 3.0, 3.5, 0.78],
      [10, -9, 2.6, 2.8, 0.82], [-12, 8, 2.0, 2.2, 0.62], [0, -10, 2.2, 2.4, 0.55],
    ];
    for (const [cx, cz, bx, bz, h] of towers) {
      const top = p.relief * h;
      const taper = Math.max(0, y) * 0.08;
      const tower = boxSDF(x - cx, y - top * 0.5, z - cz, bx - taper, top * 0.5 - 0.6, bz - taper, 0.7)
        + (n1 - 0.5) * p.roughness * 2.2 + (n2 - 0.5) * 0.6
        + p.strata * (0.12 * Math.sin(y * 3.5 + n1 * 0.8));
      d = Math.min(d, tower);
    }
    const hoodooNoise = fbm(x * 0.6, 0, z * 0.6, s + 9, 2, 2, 0.5);
    if (hoodooNoise > 0.72) {
      const hx = Math.round(x), hz = Math.round(z);
      const hd = Math.hypot(x - hx, y - (p.relief * 0.3), z - hz) - 1.2 + (n1 - 0.5) * 0.5;
      d = Math.min(d, hd);
    }
    return d;
  }

  if (p.preset === 1) {
    const ridge = 2.2 * Math.abs(Math.sin(x * 0.22 + z * 0.18)) + 1.6 * Math.abs(Math.sin(z * 0.26 - x * 0.11));
    const top = 2.5 + p.relief * (0.3 + 0.5 * fbm(x * 0.14, 0, z * 0.14, s, 3, 2, 0.5)) - ridge;
    let d = Math.max(boxSDF(x, y - 2, z, 17, 7, 14, 1.2), y - top);
    d += p.roughness * ((n1 - 0.5) * 3.2 + (n2 - 0.5) * 1.0 + (n3 - 0.5) * 1.2);
    d += p.strata * (0.14 * Math.sin(y * 3.5) + 0.22 * Math.sin(y * 1.7));
    const hollow = Math.hypot((x + 6) * 0.7, (y - 2.2) * 1.5, (z - 1) * 0.9) - 2.4;
    return Math.max(d, -hollow);
  }

  // Desert canyon (default)
  let ground = boxSDF(x, y - 5, z, 15.5 - Math.max(y, 0) * 0.1, 10, 12.9 - Math.max(y, 0) * 0.055, 2.0);
  ground += (n1 - 0.5) * 1.8;

  const center = canyonCenter(z, p);
  const halfW = p.canyonWidth + y * p.canyonFlare * 2.2 + fbm(0, y * 0.4, z * 0.5, s, 2, 2, 0.5) * 0.9;
  const distToCenter = Math.abs(x - center);
  let top = p.relief + 3.0 * fbm(x * 0.21, 0, z * 0.21, s + 10, 3, 2, 0.5) + 0.9 * fbm(x * 0.65, 0, z * 0.65, s, 2, 2, 0.5);
  const canyonFactor = 1 - Math.min(1, Math.max(0, distToCenter / Math.max(0.5, halfW)));
  const smoothFactor = canyonFactor * canyonFactor * (3 - 2 * canyonFactor);
  top -= smoothFactor * (9 + 2.5 * Math.sin(z * 0.5) + 1.5 * fbm(x * 0.3, 0, z * 0.6, s + 7, 2, 2, 0.5));

  let d = Math.max(ground, y - top);
  d += p.strata * (0.16 * Math.sin(y * 3.5 + 0.35 * n1) + 0.22 * Math.sin(y * 1.7) + 0.1 * Math.sin(y * 8));
  d += p.roughness * ((n1 - 0.5) * 3.5 + (n2 - 0.5) * 1.1 + (n3 - 0.5) * 1.4);

  const cave = Math.hypot((x + 5.8) * 0.7, (y - 3.2) * 1.2, (z - 7) * 0.6) - 2.8;
  d = Math.max(d, -cave);
  const alcove = Math.hypot((x - 5) * 0.8, (y - 5) * 1.4, (z + 5) * 0.65) - 2.0;
  d = Math.max(d, -alcove);

  const bed = boxSDF(x, y + 0.9, z, 18.5, 0.45, 16.5, 1.0) + 0.14 * fbm(x * 0.8, 0, z * 0.8, s, 2, 2, 0.5);
  return Math.min(d, bed);
}

// Generate the full RGBA volume for params into `vol`.
export function generateVolume(vol, params = defaults) {
  const [nx, ny, nz] = vol.dims;
  const w = [0, 0, 0];
  for (let z = 0; z < nz; z++) {
    for (let y = 0; y < ny; y++) {
      for (let x = 0; x < nx; x++) {
        vol.worldAt(x, y, z, w);
        let d = baseSDF(w[0], w[1], w[2], params);
        // Interactive CSG stamps (union/subtract) get baked into the base field
        for (const st of vol.stamps) {
          const lx = (w[0] - st.position[0]) / st.scale[0];
          const ly = (w[1] - st.position[1]) / st.scale[1];
          const lz = (w[2] - st.position[2]) / st.scale[2];
          const sd = sampleStampSDF(st.type, [lx, ly, lz], st.params) * Math.min(...st.scale);
          if (st.mode === "union") d = Math.min(d, sd);
          else if (st.mode === "subtract") d = Math.max(d, -sd);
          else if (st.mode === "smooth_union") d = smin(d, sd, st.params.k ?? 0.6);
          else if (st.mode === "smooth_subtract") d = smax(d, -sd, st.params.k ?? 0.6);
        }
        const i = vol.index(x, y, z);
        vol.data[i] = d;
        vol.data[i + 1] = 0;
        vol.data[i + 2] = 0;
        vol.data[i + 3] = Math.max(0, Math.min(1, 0.5 - d / (2 * BAND)));
        vol.material[i] = 0; vol.material[i + 1] = 0; vol.material[i + 2] = 0; vol.material[i + 3] = 0;
      }
    }
  }
  return vol;
}

export function smin(a, b, k) {
  const h = Math.max(0, Math.min(1, 0.5 + 0.5 * (b - a) / k));
  return b * (1 - h) + a * h - k * h * (1 - h);
}
export function smax(a, b, k) {
  const h = Math.max(0, Math.min(1, 0.5 - 0.5 * (b - a) / k));
  return b * (1 - h) + a * h + k * h * (1 - h);
}

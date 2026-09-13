// Frontier — SDFVolume: dense SDF brick + co-registered fields + CSG stamps.
// Convention: d < 0 inside solid, d > 0 in air. DOM-free.

import { clamp } from './noise.js';

// Polynomial smooth min/max (CSG with fillet radius k).
export function sminP(a, b, k) {
  if (k <= 0) return Math.min(a, b);
  const h = clamp(0.5 + 0.5 * (b - a) / k, 0, 1);
  return (b * h + a * (1 - h)) - k * h * (1 - h);
}
export function smaxP(a, b, k) {
  if (k <= 0) return Math.max(a, b);
  return -sminP(-a, -b, k);
}

let _tmpG = [0, 0, 0];

export class SDFVolume {
  constructor(nx, ny, nz, minX, minY, minZ, sizeX, sizeY, sizeZ) {
    this.nx = nx; this.ny = ny; this.nz = nz;
    this.minX = minX; this.minY = minY; this.minZ = minZ;
    this.sizeX = sizeX; this.sizeY = sizeY; this.sizeZ = sizeZ;
    this.hx = sizeX / (nx - 1); this.hy = sizeY / (ny - 1); this.hz = sizeZ / (nz - 1);
    this.voxel = Math.cbrt(this.hx * this.hy * this.hz);
    const n = nx * ny * nz;
    this.dist = new Float32Array(n);
    this.hard = new Float32Array(n).fill(0.5);
    this.sed = new Float32Array(n);
    this.moist = new Float32Array(n);
    this.flow = new Float32Array(n);
    this.emask = new Float32Array(n);
    this.strata = new Float32Array(n);
    // 2D paint masks over world XZ.
    this.paintRain = new Float32Array(nx * nz);
    this.paintHard = new Float32Array(nx * nz).fill(0.5); // 0.5 = neutral
    this.paintMoist = new Float32Array(nx * nz);
    this.carvedVol = 0; this.depositedVol = 0;
    this.version = 0; // bumped on any edit (mesher dirty-check)
  }

  get n() { return this.nx * this.ny * this.nz; }
  idx(i, j, k) { return (k * this.ny + j) * this.nx + i; }
  idx2(i, k) { return k * this.nx + i; }

  gridToWorld(i, j, k, out) {
    out = out || [0, 0, 0];
    out[0] = this.minX + (i / (this.nx - 1)) * this.sizeX;
    out[1] = this.minY + (j / (this.ny - 1)) * this.sizeY;
    out[2] = this.minZ + (k / (this.nz - 1)) * this.sizeZ;
    return out;
  }

  worldToGrid(x, y, z, out) {
    out = out || [0, 0, 0];
    out[0] = ((x - this.minX) / this.sizeX) * (this.nx - 1);
    out[1] = ((y - this.minY) / this.sizeY) * (this.ny - 1);
    out[2] = ((z - this.minZ) / this.sizeZ) * (this.nz - 1);
    return out;
  }

  inside(x, y, z) {
    return x >= this.minX && x <= this.minX + this.sizeX &&
           y >= this.minY && y <= this.minY + this.sizeY &&
           z >= this.minZ && z <= this.minZ + this.sizeZ;
  }

  // Trilinear sample of dist (clamped at borders).
  sample(x, y, z) {
    let gx = ((x - this.minX) / this.sizeX) * (this.nx - 1);
    let gy = ((y - this.minY) / this.sizeY) * (this.ny - 1);
    let gz = ((z - this.minZ) / this.sizeZ) * (this.nz - 1);
    gx = clamp(gx, 0, this.nx - 1.001); gy = clamp(gy, 0, this.ny - 1.001); gz = clamp(gz, 0, this.nz - 1.001);
    const i = gx | 0, j = gy | 0, k = gz | 0;
    const fx = gx - i, fy = gy - j, fz = gz - k;
    const d = this.dist, nx = this.nx, nxy = this.nx * this.ny;
    const i000 = k * nxy + j * nx + i;
    const c00 = d[i000] + (d[i000 + 1] - d[i000]) * fx;
    const c10 = d[i000 + nx] + (d[i000 + nx + 1] - d[i000 + nx]) * fx;
    const c01 = d[i000 + nxy] + (d[i000 + nxy + 1] - d[i000 + nxy]) * fx;
    const c11 = d[i000 + nxy + nx] + (d[i000 + nxy + nx + 1] - d[i000 + nxy + nx]) * fx;
    return (c00 + (c10 - c00) * fy) + ((c01 + (c11 - c01) * fy) - (c00 + (c10 - c00) * fy)) * fz;
  }

  // Trilinear sample of any field array.
  sampleField(arr, x, y, z) {
    let gx = ((x - this.minX) / this.sizeX) * (this.nx - 1);
    let gy = ((y - this.minY) / this.sizeY) * (this.ny - 1);
    let gz = ((z - this.minZ) / this.sizeZ) * (this.nz - 1);
    gx = clamp(gx, 0, this.nx - 1.001); gy = clamp(gy, 0, this.ny - 1.001); gz = clamp(gz, 0, this.nz - 1.001);
    const i = gx | 0, j = gy | 0, k = gz | 0;
    const fx = gx - i, fy = gy - j, fz = gz - k;
    const nx = this.nx, nxy = this.nx * this.ny;
    const i000 = k * nxy + j * nx + i;
    const c00 = arr[i000] + (arr[i000 + 1] - arr[i000]) * fx;
    const c10 = arr[i000 + nx] + (arr[i000 + nx + 1] - arr[i000 + nx]) * fx;
    const c01 = arr[i000 + nxy] + (arr[i000 + nxy + 1] - arr[i000 + nxy]) * fx;
    const c11 = arr[i000 + nxy + nx] + (arr[i000 + nxy + nx + 1] - arr[i000 + nxy + nx]) * fx;
    return (c00 + (c10 - c00) * fy) + ((c01 + (c11 - c01) * fy) - (c00 + (c10 - c00) * fy)) * fz;
  }

  hardnessAt(x, y, z) {
    // 3D hardness modulated by 2D hardness paint (0.5 neutral).
    const h = this.sampleField(this.hard, x, y, z);
    const p = this.samplePaint(this.paintHard, x, z);
    return clamp(h + (p - 0.5) * 1.2, 0.02, 1);
  }

  samplePaint(arr2, x, z) {
    let gx = ((x - this.minX) / this.sizeX) * (this.nx - 1);
    let gz = ((z - this.minZ) / this.sizeZ) * (this.nz - 1);
    gx = clamp(gx, 0, this.nx - 1.001); gz = clamp(gz, 0, this.nz - 1.001);
    const i = gx | 0, k = gz | 0, fx = gx - i, fz = gz - k, nx = this.nx;
    const i00 = k * nx + i;
    const c0 = arr2[i00] + (arr2[i00 + 1] - arr2[i00]) * fx;
    const c1 = arr2[i00 + nx] + (arr2[i00 + nx + 1] - arr2[i00 + nx]) * fx;
    return c0 + (c1 - c0) * fz;
  }

  // Outward normal via central differences (normalized). out=[x,y,z].
  gradient(x, y, z, out) {
    out = out || _tmpG;
    const e = this.voxel * 0.6;
    const dx = this.sample(x + e, y, z) - this.sample(x - e, y, z);
    const dy = this.sample(x, y + e, z) - this.sample(x, y - e, z);
    const dz = this.sample(x, y, z + e) - this.sample(x, y, z - e);
    const inv = 1 / Math.max(1e-9, Math.hypot(dx, dy, dz));
    out[0] = dx * inv; out[1] = dy * inv; out[2] = dz * inv;
    return out;
  }

  // Mean curvature H (convex ridge > 0) + Gaussian K. out={H,K}.
  curvature(x, y, z, out) {
    out = out || {};
    const e = this.voxel * 0.9;
    const d0 = this.sample(x, y, z);
    const dxx = this.sample(x + e, y, z) - 2 * d0 + this.sample(x - e, y, z);
    const dyy = this.sample(x, y + e, z) - 2 * d0 + this.sample(x, y - e, z);
    const dzz = this.sample(x, y, z + e) - 2 * d0 + this.sample(x, y, z - e);
    const q = 1 / (e * e);
    const Hxx = dxx * q, Hyy = dyy * q, Hzz = dzz * q;
    const dxy = (this.sample(x + e, y + e, z) - this.sample(x + e, y - e, z) - this.sample(x - e, y + e, z) + this.sample(x - e, y - e, z)) / (4 * e * e);
    const dxz = (this.sample(x + e, y, z + e) - this.sample(x + e, y, z - e) - this.sample(x - e, y, z + e) + this.sample(x - e, y, z - e)) / (4 * e * e);
    const dyz = (this.sample(x, y + e, z + e) - this.sample(x, y + e, z - e) - this.sample(x, y - e, z + e) + this.sample(x, y - e, z - e)) / (4 * e * e);
    // Gradient (reuse central diff, unnormalized for the formula).
    const gx = (this.sample(x + e, y, z) - this.sample(x - e, y, z)) / (2 * e);
    const gy = (this.sample(x, y + e, z) - this.sample(x, y - e, z)) / (2 * e);
    const gz = (this.sample(x, y, z + e) - this.sample(x, y, z - e)) / (2 * e);
    const g2 = gx * gx + gy * gy + gz * gz;
    const gnorm = Math.max(1e-6, Math.sqrt(g2));
    const tr = Hxx + Hyy + Hzz;
    const gHg = gx * (Hxx * gx + dxy * gy + dxz * gz) + gy * (dxy * gx + Hyy * gy + dyz * gz) + gz * (dxz * gx + dyz * gy + Hzz * gz);
    // H_out: convex-outward positive.
    out.H = (g2 * tr - gHg) / (2 * gnorm * gnorm * gnorm);
    // Gaussian via adjugate: K = g^T adj(H) g / |g|^4.
    const axx = Hyy * Hzz - dyz * dyz, axy = dxz * dyz - dxy * Hzz, axz = dxy * dyz - dxz * Hyy;
    const ayy = Hxx * Hzz - dxz * dxz, ayz = dxy * dxz - Hxx * dyz;
    const azz = Hxx * Hyy - dxy * dxy;
    const gAg = gx * (axx * gx + axy * gy + axz * gz) + gy * (axy * gx + ayy * gy + ayz * gz) + gz * (axz * gx + ayz * gy + azz * gz);
    out.K = gAg / (g2 * g2);
    return out;
  }

  // SDF cone-march occlusion along normal. Returns 0 (occluded) .. 1 (open).
  occlusion(x, y, z, nx, ny, nz, radiusVox = 10, taps = 6) {
    const step = (radiusVox * this.voxel) / taps;
    let res = 0, sca = 1;
    for (let i = 1; i <= taps; i++) {
      const t = step * i;
      const h = this.sample(x + nx * t, y + ny * t, z + nz * t);
      res += (t - Math.max(h, -t)) * sca / Math.max(t, 1e-6);
      sca *= 0.72;
    }
    return clamp(1 - 0.55 * res, 0, 1);
  }

  // Sphere-trace from the sky down a column; returns surface y or null.
  surfaceY(x, z, topY) {
    let y = topY !== undefined ? topY : this.minY + this.sizeY;
    let d = this.sample(x, y, z);
    for (let i = 0; i < 64; i++) {
      if (d <= this.voxel * 0.25) {
        // Bisect refine.
        let lo = y, hi = y + this.voxel * 2;
        for (let b = 0; b < 6; b++) {
          const mid = (lo + hi) / 2;
          if (this.sample(x, mid, z) <= 0) hi = mid; else lo = mid;
        }
        return (lo + hi) / 2;
      }
      y -= Math.max(d * 0.85, this.voxel * 0.5);
      if (y < this.minY) return null;
      d = this.sample(x, y, z);
    }
    return null;
  }

  // ---- CSG stamps (the ONLY writers of `dist` outside generation) ----
  _stampBBox(cx, cy, cz, r, out) {
    const gx = this.worldToGrid(cx, cy, cz, out.g);
    const rx = Math.ceil(r / this.hx) + 2, ry = Math.ceil(r / this.hy) + 2, rz = Math.ceil(r / this.hz) + 2;
    out.i0 = Math.max(0, Math.floor(gx[0] - rx)); out.i1 = Math.min(this.nx - 1, Math.ceil(gx[0] + rx));
    out.j0 = Math.max(0, Math.floor(gx[1] - ry)); out.j1 = Math.min(this.ny - 1, Math.ceil(gx[1] + ry));
    out.k0 = Math.max(0, Math.floor(gx[2] - rz)); out.k1 = Math.min(this.nz - 1, Math.ceil(gx[2] + rz));
    return out;
  }

  // Subtract a sphere: crater/pit. Center c (world), radius r (m), fillet k.
  // Returns carved volume estimate (m^3).
  carveSphere(cx, cy, cz, r, k = 0, emaskDepth = 0) {
    if (r <= 0) return 0;
    const bb = this._stampBBox(cx, cy, cz, r + k * 2, { g: [0, 0, 0] });
    const kk = k > 0 ? k : r * 0.3;
    let carved = 0;
    const cellVol = this.hx * this.hy * this.hz;
    const p = [0, 0, 0];
    for (let k2 = bb.k0; k2 <= bb.k1; k2++) {
      for (let j = bb.j0; j <= bb.j1; j++) {
        for (let i = bb.i0; i <= bb.i1; i++) {
          const id = this.idx(i, j, k2);
          const old = this.dist[id];
          if (old > r * 1.5) continue; // far in air: untouched
          this.gridToWorld(i, j, k2, p);
          const dx = p[0] - cx, dy = p[1] - cy, dz = p[2] - cz;
          const s = Math.sqrt(dx * dx + dy * dy + dz * dz) - r; // sphere SDF
          const nv = smaxP(old, -s, kk);
          if (nv > old) {
            this.dist[id] = nv;
            if (emaskDepth > 0) this.emask[id] += emaskDepth;
            if (old < 0 && nv >= 0) carved += cellVol;
          }
        }
      }
    }
    this.carvedVol += carved;
    this.version++;
    return carved;
  }

  // Subtract a capsule a->b radius r: channel incision for flowing droplets.
  carveCapsule(ax, ay, az, bx, by, bz, r, emaskDepth = 0) {
    if (r <= 0) return 0;
    const cx = (ax + bx) / 2, cy = (ay + by) / 2, cz = (az + bz) / 2;
    const half = Math.hypot(bx - ax, by - ay, bz - az) / 2 + r;
    const bb = this._stampBBox(cx, cy, cz, half + r, { g: [0, 0, 0] });
    const kk = r * 0.35;
    const abx = bx - ax, aby = by - ay, abz = bz - az;
    const ab2 = Math.max(1e-9, abx * abx + aby * aby + abz * abz);
    let carved = 0;
    const cellVol = this.hx * this.hy * this.hz;
    const p = [0, 0, 0];
    for (let k2 = bb.k0; k2 <= bb.k1; k2++) {
      for (let j = bb.j0; j <= bb.j1; j++) {
        for (let i = bb.i0; i <= bb.i1; i++) {
          const id = this.idx(i, j, k2);
          const old = this.dist[id];
          if (old > r * 2) continue;
          this.gridToWorld(i, j, k2, p);
          const t = clamp(((p[0] - ax) * abx + (p[1] - ay) * aby + (p[2] - az) * abz) / ab2, 0, 1);
          const qx = p[0] - (ax + abx * t), qy = p[1] - (ay + aby * t), qz = p[2] - (az + abz * t);
          const s = Math.sqrt(qx * qx + qy * qy + qz * qz) - r;
          const nv = smaxP(old, -s, kk);
          if (nv > old) {
            this.dist[id] = nv;
            if (emaskDepth > 0) this.emask[id] += emaskDepth;
            if (old < 0 && nv >= 0) carved += cellVol;
          }
        }
      }
    }
    this.carvedVol += carved;
    this.version++;
    return carved;
  }

  // Union an oblate blob (rx horizontal, ry vertical radii): deposition mounds.
  depositBlob(cx, cy, cz, rx, ry, sedAmt = 0) {
    if (rx <= 0 || ry <= 0) return 0;
    const bb = this._stampBBox(cx, cy, cz, Math.max(rx, ry) * 1.6, { g: [0, 0, 0] });
    const kk = Math.min(rx, ry) * 0.4;
    let dep = 0;
    const cellVol = this.hx * this.hy * this.hz;
    const p = [0, 0, 0];
    for (let k2 = bb.k0; k2 <= bb.k1; k2++) {
      for (let j = bb.j0; j <= bb.j1; j++) {
        for (let i = bb.i0; i <= bb.i1; i++) {
          const id = this.idx(i, j, k2);
          const old = this.dist[id];
          if (old < -Math.max(rx, ry) * 1.5) continue; // deep solid: untouched
          this.gridToWorld(i, j, k2, p);
          const dx = (p[0] - cx) / rx, dy = (p[1] - cy) / ry, dz = (p[2] - cz) / rx;
          const k0 = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (k0 > 1.6) continue;
          // Approx ellipsoid SDF.
          const ex = (p[0] - cx) / (rx * rx), ey = (p[1] - cy) / (ry * ry), ez = (p[2] - cz) / (rx * rx);
          const k1 = Math.max(1e-9, Math.sqrt(ex * ex + ey * ey + ez * ez));
          const s = (k0 * (k0 - 1)) / k1;
          const nv = sminP(old, s, kk);
          if (nv < old) {
            this.dist[id] = nv;
            if (sedAmt > 0) this.sed[id] += sedAmt;
            if (old >= 0 && nv < 0) dep += cellVol;
          }
        }
      }
    }
    this.depositedVol += dep;
    this.version++;
    return dep;
  }

  // Add value into a field with trilinear splat.
  splat(arr, x, y, z, val, radiusVox = 1) {
    const g = this.worldToGrid(x, y, z, [0, 0, 0]);
    const r = Math.max(1, Math.round(radiusVox));
    const i0 = Math.max(0, Math.floor(g[0] - r)), i1 = Math.min(this.nx - 1, Math.ceil(g[0] + r));
    const j0 = Math.max(0, Math.floor(g[1] - r)), j1 = Math.min(this.ny - 1, Math.ceil(g[1] + r));
    const k0 = Math.max(0, Math.floor(g[2] - r)), k1 = Math.min(this.nz - 1, Math.ceil(g[2] + r));
    for (let k = k0; k <= k1; k++)
      for (let j = j0; j <= j1; j++)
        for (let i = i0; i <= i1; i++) {
          const dd = Math.hypot(i - g[0], j - g[1], k - g[2]) / r;
          if (dd > 1) continue;
          arr[this.idx(i, j, k)] += val * (1 - dd * dd);
        }
  }

  // Paint a 2D mask with a soft round brush (world XZ, radius m).
  paint2D(arr2, x, z, radius, value, mode = 'add') {
    const gx = ((x - this.minX) / this.sizeX) * (this.nx - 1);
    const gz = ((z - this.minZ) / this.sizeZ) * (this.nz - 1);
    const r = Math.max(1, radius / this.hx);
    const i0 = Math.max(0, Math.floor(gx - r * 2)), i1 = Math.min(this.nx - 1, Math.ceil(gx + r * 2));
    const k0 = Math.max(0, Math.floor(gz - r * 2)), k1 = Math.min(this.nz - 1, Math.ceil(gz + r * 2));
    for (let k = k0; k <= k1; k++)
      for (let i = i0; i <= i1; i++) {
        const dd = Math.hypot(i - gx, k - gz) / r;
        if (dd > 2) continue;
        const fall = Math.exp(-dd * dd * 1.5);
        const id = this.idx2(i, k);
        if (mode === 'add') arr2[id] = clamp(arr2[id] + value * fall, 0, 1);
        else if (mode === 'sub') arr2[id] = clamp(arr2[id] - value * fall, 0, 1);
        else arr2[id] = clamp(value * fall + arr2[id] * (1 - fall), 0, 1);
      }
  }
}

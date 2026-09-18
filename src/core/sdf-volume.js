/* ============================================================
 * Frontier · SDF terrain — the signed-distance volume
 *
 * One bounded, isotropic-ish 3D grid of float32 distances:
 *     d < 0  solid (rock)
 *     d = 0  the surface
 *     d > 0  air
 *
 * It is the single source of truth for the whole application:
 * generation writes it, erosion reads/writes it, the sculpting
 * brushes mutate it with real CSG operations, marching cubes only
 * *visualises* it, and every exporter reads it. Nothing else in the
 * project stores terrain geometry.
 *
 * Implementation notes
 * --------------------
 *  · Storage is a flat Float32Array in XYZ order ((z*ny + y)*nx + x),
 *    which is byte-compatible with the Frontier `.frontier` volume
 *    format (see src/io/export.js).
 *  · The grid is partitioned into cubic *chunks*; every chunk keeps
 *    a min/max distance so the raycaster can skip whole regions of
 *    empty space, and so the mesher can re-tessellate only what a
 *    brush stroke actually touched.
 *  · Sampling outside the volume is guarded (`length(max(lo-p,p-hi,0))`)
 *    so the field remains a valid SDF for rays that leave the box.
 * ============================================================ */

export const DEFAULT_MIN = [-22, -4, -20];
export const DEFAULT_MAX = [22, 22, 20];

/**
 * Band half-width of the *truncated* SDF this volume stores, in voxels.
 * Outside the band the field is clamped to ±band; that keeps the field
 * conservative ( |d| ≤ true distance, so a sphere-trace can never step
 * past a surface ) and it is what makes a bounded volume a valid SDF
 * even for rays that leave the box.
 *
 * The invariant every writer must respect:
 *     |data[i]| ≤ distance from voxel i to the real surface
 * so "empty" must always be initialised to a value that is *smaller*
 * than any surface can be — never to a huge number, or rays overshoot.
 */
export const BAND_VOXELS = 8;

export class SdfVolume {
  /**
   * @param {object} o
   * @param {number[]} o.dims  [nx, ny, nz]
   * @param {number[]} o.min   world-space minimum corner
   * @param {number[]} o.max   world-space maximum corner
   * @param {number}  [o.chunk] chunk edge in voxels (meshing / dirty granularity)
   */
  constructor({ dims, min = DEFAULT_MIN, max = DEFAULT_MAX, chunk = 16 }) {
    this.dims = dims.slice();
    [this.nx, this.ny, this.nz] = this.dims;
    this.min = min.slice();
    this.max = max.slice();
    this.size = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
    this.cell = [this.size[0] / this.nx, this.size[1] / this.ny, this.size[2] / this.nz];
    this.chunk = chunk;
    this.nc = [
      Math.ceil(this.nx / chunk),
      Math.ceil(this.ny / chunk),
      Math.ceil(this.nz / chunk),
    ];
    this.chunkCount = this.nc[0] * this.nc[1] * this.nc[2];
    this.length = this.nx * this.ny * this.nz;
    this.band = BAND_VOXELS * Math.min(...this.cell);
    this.data = new Float32Array(this.length);
    this.data.fill(this.band); // start empty — and *conservatively* empty

    // per-chunk min/max distance + "has surface" cache
    this.chunkMin = new Float32Array(this.chunkCount);
    this.chunkMax = new Float32Array(this.chunkCount);
    this.dirty = new Set();
    this.meshDirty = new Set();
    this.refreshChunkStats();
    this.markAllDirty();
  }

  /* ------------------------------------------------------------------ */
  /* indexing                                                            */
  /* ------------------------------------------------------------------ */

  index(x, y, z) { return (z * this.ny + y) * this.nx + x; }

  inBounds(x, y, z) {
    return x >= 0 && y >= 0 && z >= 0 && x < this.nx && y < this.ny && z < this.nz;
  }

  /** Nearest-voxel read, grid coordinates. Outside → conservative sentinel. */
  get(x, y, z) {
    if (!this.inBounds(x, y, z)) return this.band;
    return this.data[this.index(x, y, z)];
  }

  set(x, y, z, v) {
    if (!this.inBounds(x, y, z)) return;
    this.data[this.index(x, y, z)] = v;
  }

  /** World position of voxel centre. */
  voxelToWorld(x, y, z, out = [0, 0, 0]) {
    out[0] = this.min[0] + (x + 0.5) * this.cell[0];
    out[1] = this.min[1] + (y + 0.5) * this.cell[1];
    out[2] = this.min[2] + (z + 0.5) * this.cell[2];
    return out;
  }

  worldToVoxel(px, py, pz, out = [0, 0, 0]) {
    out[0] = (px - this.min[0]) / this.cell[0] - 0.5;
    out[1] = (py - this.min[1]) / this.cell[1] - 0.5;
    out[2] = (pz - this.min[2]) / this.cell[2] - 0.5;
    return out;
  }

  /* ------------------------------------------------------------------ */
  /* sampling                                                            */
  /* ------------------------------------------------------------------ */

  /** Distance to the volume box (0 inside) — keeps the field valid outside. */
  outsideDistance(px, py, pz) {
    const dx = Math.max(this.min[0] - px, px - this.max[0], 0);
    const dy = Math.max(this.min[1] - py, py - this.max[1], 0);
    const dz = Math.max(this.min[2] - pz, pz - this.max[2], 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /** Trilinear sample in grid coordinates (no outside guard). */
  sampleGrid(fx, fy, fz) {
    const { nx, ny, nz, cell, data } = this;
    const cx = fx < 0 ? 0 : fx > nx - 1.001 ? nx - 1.001 : fx;
    const cy = fy < 0 ? 0 : fy > ny - 1.001 ? ny - 1.001 : fy;
    const cz = fz < 0 ? 0 : fz > nz - 1.001 ? nz - 1.001 : fz;
    const x0 = cx | 0, y0 = cy | 0, z0 = cz | 0;
    const fx1 = cx - x0, fy1 = cy - y0, fz1 = cz - z0;
    const x1 = x0 + 1, y1 = y0 + 1, z1 = z0 + 1;
    const strideY = nx, strideZ = nx * ny;
    const base = z0 * strideZ + y0 * strideY;
    const c000 = data[base + x0], c100 = data[base + x1];
    const c010 = data[base + strideY + x0], c110 = data[base + strideY + x1];
    const b1 = base + strideZ;
    const c001 = data[b1 + x0], c101 = data[b1 + x1];
    const c011 = data[b1 + strideY + x0], c111 = data[b1 + strideY + x1];
    const e = (c000 + (c100 - c000) * fx1) * (1 - fy1) + (c010 + (c110 - c010) * fx1) * fy1;
    const f = (c001 + (c101 - c001) * fx1) * (1 - fy1) + (c011 + (c111 - c011) * fx1) * fy1;
    void cell;
    return e + (f - e) * fz1;
  }

  /** Trilinear sample in world space, with the box guard. */
  sampleWorld(px, py, pz) {
    const fx = (px - this.min[0]) / this.cell[0] - 0.5;
    const fy = (py - this.min[1]) / this.cell[1] - 0.5;
    const fz = (pz - this.min[2]) / this.cell[2] - 0.5;
    return this.sampleGrid(fx, fy, fz) + this.outsideDistance(px, py, pz);
  }

  distance(p) { return this.sampleWorld(p[0], p[1], p[2]); }

  /** Central-difference gradient of the field, world space (per metre). */
  gradient(px, py, pz, out = [0, 0, 0]) {
    const hx = this.cell[0] * 0.5, hy = this.cell[1] * 0.5, hz = this.cell[2] * 0.5;
    out[0] = (this.sampleWorld(px + hx, py, pz) - this.sampleWorld(px - hx, py, pz)) / (2 * hx);
    out[1] = (this.sampleWorld(px, py + hy, pz) - this.sampleWorld(px, py - hy, pz)) / (2 * hy);
    out[2] = (this.sampleWorld(px, py, pz + hz) - this.sampleWorld(px, py, pz - hz)) / (2 * hz);
    return out;
  }

  /** Unit surface normal at (or near) the surface. */
  normal(px, py, pz, out = [0, 1, 0]) {
    const g = this.gradient(px, py, pz, out);
    const len = Math.hypot(g[0], g[1], g[2]) || 1;
    g[0] /= len; g[1] /= len; g[2] /= len;
    return g;
  }

  /* ------------------------------------------------------------------ */
  /* raycasting (sphere tracing + chunk skipping)                        */
  /* ------------------------------------------------------------------ */

  /**
   * Sphere-trace the field.
   * @returns {{t:number, point:number[], normal:number[]}|null}
   */
  raycast(ox, oy, oz, dx, dy, dz, { maxDist = 200, minStep = null, surfaceEps = null, chunkSkip = true } = {}) {
    const eps = surfaceEps ?? Math.min(...this.cell) * 0.4;
    const minS = minStep ?? Math.min(...this.cell) * 0.35;
    const inv = 1 / (Math.hypot(dx, dy, dz) || 1);
    dx *= inv; dy *= inv; dz *= inv;
    let t = 0;
    let px = ox, py = oy, pz = oz;
    for (let i = 0; i < 4096 && t < maxDist; i++) {
      const d = this.sampleWorld(px, py, pz);
      if (d < eps) {
        // Refine: stopping at |d| < eps leaves the hit up to eps short of the
        // surface, which is visible when a brush places its first sample.
        // Stepping by the (valid) distance lands on the crossing.
        let dd = d;
        for (let k = 0; k < 3 && dd > eps * 0.02; k++) {
          const step = Math.max(dd, 0);
          t += step; px += dx * step; py += dy * step; pz += dz * step;
          dd = this.sampleWorld(px, py, pz);
        }
        return { t, point: [px, py, pz], normal: this.normal(px, py, pz) };
      }
      // outside the box: jump straight to the box (the guard distance is exact)
      if (px < this.min[0] || px > this.max[0] || py < this.min[1] ||
          py > this.max[1] || pz < this.min[2] || pz > this.max[2]) {
        const step = Math.max(d, minS);
        t += step; px += dx * step; py += dy * step; pz += dz * step;
        continue;
      }
      if (chunkSkip) {
        const ci = this.chunkIndexAt(px, py, pz);
        if (ci >= 0 && this.chunkMin[ci] > 0) {
          // The chunk holds only air, so its minimum distance is a valid step —
          // but only *inside that chunk*. The surface may sit immediately in
          // the next one, so the jump is cut short at the chunk's core border
          // (one voxel inside, where chunkMin is still a true lower bound and
          // the trilinear stencil never reaches into a neighbour).
          const core = this.chunkCore(ci, CHUNK_TMP);
          const tExit = rayBoxExit(px, py, pz, dx, dy, dz, core.min, core.max);
          const step = Math.max(Math.min(this.chunkMin[ci] * 0.9, tExit + 1e-3), minS);
          t += step; px += dx * step; py += dy * step; pz += dz * step;
          continue;
        }
      }
      const step = Math.max(d * 0.9, minS);
      t += step; px += dx * step; py += dy * step; pz += dz * step;
    }
    return null;
  }

  /** First surface hit going straight down a column (used by the eroder). */
  heightAtWorld(px, pz, { top = null, floor = this.min[1] - 1 } = {}) {
    const y0 = top ?? this.max[1];
    let py = y0;
    let prevY = y0;
    let prevD = this.sampleWorld(px, py, pz);
    if (prevD < 0) return py; // already solid at the top
    const step = this.cell[1] * 0.75;
    for (let y = y0; y > floor; y -= step) {
      const d = this.sampleWorld(px, y, pz);
      if (d <= 0) {
        const t = prevD / Math.max(prevD - d, 1e-9);
        return prevY + (y - prevY) * t;
      }
      prevY = y; prevD = d;
    }
    return floor;
  }

  /* ------------------------------------------------------------------ */
  /* chunk bookkeeping                                                   */
  /* ------------------------------------------------------------------ */

  chunkCoord(ci) {
    const cxy = this.nc[0] * this.nc[1];
    const cz = (ci / cxy) | 0;
    const rem = ci - cz * cxy;
    const cy = (rem / this.nc[0]) | 0;
    const cx = rem - cy * this.nc[0];
    return [cx, cy, cz];
  }

  chunkIndex(cx, cy, cz) {
    if (cx < 0 || cy < 0 || cz < 0 || cx >= this.nc[0] || cy >= this.nc[1] || cz >= this.nc[2]) return -1;
    return (cz * this.nc[1] + cy) * this.nc[0] + cx;
  }

  chunkIndexAt(px, py, pz) {
    const cx = Math.floor((px - this.min[0]) / (this.cell[0] * this.chunk));
    const cy = Math.floor((py - this.min[1]) / (this.cell[1] * this.chunk));
    const cz = Math.floor((pz - this.min[2]) / (this.cell[2] * this.chunk));
    return this.chunkIndex(cx, cy, cz);
  }

  /** Voxel ranges [x0,y0,z0,x1,y1,z1) covered by a chunk. */
  chunkRange(ci) {
    const [cx, cy, cz] = this.chunkCoord(ci);
    const c = this.chunk;
    return [
      cx * c, cy * c, cz * c,
      Math.min((cx + 1) * c, this.nx),
      Math.min((cy + 1) * c, this.ny),
      Math.min((cz + 1) * c, this.nz),
    ];
  }

  markAllDirty() {
    for (let i = 0; i < this.chunkCount; i++) { this.dirty.add(i); this.meshDirty.add(i); }
  }

  markDirty() { for (let i = 0; i < this.chunkCount; i++) this.dirty.add(i); }
  markMeshDirty() { for (let i = 0; i < this.chunkCount; i++) this.meshDirty.add(i); }
  markChunkMeshDirty(ci) { if (ci >= 0) this.meshDirty.add(ci); }

  /** Mark every chunk overlapping the world-space box as needing remesh. */
  markDirtyBox(minP, maxP, { mesh = true } = {}) {
    const c = this.chunk;
    const x0 = Math.max(0, Math.floor((minP[0] - this.min[0]) / this.cell[0] / c));
    const y0 = Math.max(0, Math.floor((minP[1] - this.min[1]) / this.cell[1] / c));
    const z0 = Math.max(0, Math.floor((minP[2] - this.min[2]) / this.cell[2] / c));
    const x1 = Math.min(this.nc[0] - 1, Math.floor((maxP[0] - this.min[0]) / this.cell[0] / c));
    const y1 = Math.min(this.nc[1] - 1, Math.floor((maxP[1] - this.min[1]) / this.cell[1] / c));
    const z1 = Math.min(this.nc[2] - 1, Math.floor((maxP[2] - this.min[2]) / this.cell[2] / c));
    for (let z = z0; z <= z1; z++)
      for (let y = y0; y <= y1; y++)
        for (let x = x0; x <= x1; x++) {
          const ci = this.chunkIndex(x, y, z);
          if (ci < 0) continue;
          this.dirty.add(ci);
          if (mesh) this.meshDirty.add(ci);
        }
  }

  /**
   * Enforce the truncated-SDF invariant |d| ≤ band over a voxel box
   * `[x0,y0,z0,x1,y1,z1]` (inclusive) or the whole grid. Writers call this
   * after a large raw write (a rasterised surface, an advected region) so
   * the field can never over-promise how far away the surface is.
   */
  clampBand(box = null) {
    const band = this.band;
    const [x0, y0, z0, x1, y1, z1] = box
      ? [Math.max(0, box[0] | 0), Math.max(0, box[1] | 0), Math.max(0, box[2] | 0),
         Math.min(this.nx - 1, box[3] | 0), Math.min(this.ny - 1, box[4] | 0), Math.min(this.nz - 1, box[5] | 0)]
      : [0, 0, 0, this.nx - 1, this.ny - 1, this.nz - 1];
    let clamped = 0;
    for (let z = z0; z <= z1; z++)
      for (let y = y0; y <= y1; y++) {
        const base = (z * this.ny + y) * this.nx;
        for (let x = x0; x <= x1; x++) {
          const v = this.data[base + x];
          if (v > band) { this.data[base + x] = band; clamped++; }
          else if (v < -band) { this.data[base + x] = -band; clamped++; }
        }
      }
    return clamped;
  }

  /** Recompute per-chunk min/max distance over the given chunks (or all). */
  refreshChunkStats(chunks = null) {
    const list = chunks || rangeArray(this.chunkCount);
    for (const ci of list) {
      if (ci < 0 || ci >= this.chunkCount) continue;
      const [x0, y0, z0, x1, y1, z1] = this.chunkRange(ci);
      let mn = Infinity, mx = -Infinity;
      for (let z = z0; z < z1; z++) {
        const zs = z * this.nx * this.ny;
        for (let y = y0; y < y1; y++) {
          const ys = zs + y * this.nx;
          for (let x = x0; x < x1; x++) {
            const v = this.data[ys + x];
            if (v < mn) mn = v;
            if (v > mx) mx = v;
          }
        }
      }
      this.chunkMin[ci] = mn;
      this.chunkMax[ci] = mx;
    }
  }

  /**
   * The part of a chunk where its cached min/max distance is a *true* bound:
   * the chunk AABB shrunk by one voxel on every side (a trilinear sample near
   * the border blends in neighbours, so it must not be trusted there).
   */
  chunkCore(ci, out = { min: [0, 0, 0], max: [0, 0, 0] }) {
    const b = this.chunkWorldBounds(ci, out);
    for (let a = 0; a < 3; a++) { b.min[a] += this.cell[a]; b.max[a] -= this.cell[a]; }
    return b;
  }

  /** World-space AABB of a chunk (for frustum culling / mesh bounds). */
  chunkWorldBounds(ci, out = { min: [0, 0, 0], max: [0, 0, 0] }) {
    const [x0, y0, z0, x1, y1, z1] = this.chunkRange(ci);
    out.min[0] = this.min[0] + x0 * this.cell[0];
    out.min[1] = this.min[1] + y0 * this.cell[1];
    out.min[2] = this.min[2] + z0 * this.cell[2];
    out.max[0] = this.min[0] + x1 * this.cell[0];
    out.max[1] = this.min[1] + y1 * this.cell[1];
    out.max[2] = this.min[2] + z1 * this.cell[2];
    return out;
  }

  /* ------------------------------------------------------------------ */
  /* bulk helpers                                                        */
  /* ------------------------------------------------------------------ */

  /** Iterate voxels of a world-space AABB expanded by `margin` metres. */
  forEachVoxelInBox(minP, maxP, margin, fn) {
    const m = margin || 0;
    const x0 = Math.max(0, Math.floor((minP[0] - m - this.min[0]) / this.cell[0]));
    const y0 = Math.max(0, Math.floor((minP[1] - m - this.min[1]) / this.cell[1]));
    const z0 = Math.max(0, Math.floor((minP[2] - m - this.min[2]) / this.cell[2]));
    const x1 = Math.min(this.nx - 1, Math.ceil((maxP[0] + m - this.min[0]) / this.cell[0]));
    const y1 = Math.min(this.ny - 1, Math.ceil((maxP[1] + m - this.min[1]) / this.cell[1]));
    const z1 = Math.min(this.nz - 1, Math.ceil((maxP[2] + m - this.min[2]) / this.cell[2]));
    for (let z = z0; z <= z1; z++)
      for (let y = y0; y <= y1; y++)
        for (let x = x0; x <= x1; x++) fn(x, y, z, this.index(x, y, z));
  }

  copyFrom(other) {
    if (other.length !== this.length) throw new Error('volume size mismatch');
    this.data.set(other.data);
    this.chunkMin.set(other.chunkMin);
    this.chunkMax.set(other.chunkMax);
    this.markAllDirty();
  }

  clone() {
    const v = new SdfVolume({ dims: this.dims, min: this.min, max: this.max, chunk: this.chunk });
    v.copyFrom(this);
    return v;
  }

  /** Extract a voxel sub-box (inclusive voxel coords) as a flat Float32Array. */
  readBox(x0, y0, z0, x1, y1, z1) {
    const dx = x1 - x0 + 1, dy = y1 - y0 + 1, dz = z1 - z0 + 1;
    const out = new Float32Array(dx * dy * dz);
    let o = 0;
    for (let z = z0; z <= z1; z++)
      for (let y = y0; y <= y1; y++)
        for (let x = x0; x <= x1; x++) out[o++] = this.data[this.index(x, y, z)];
    return { data: out, dims: [dx, dy, dz], origin: [x0, y0, z0] };
  }

  writeBox(box) {
    const [x0, y0, z0] = box.origin;
    const [dx, dy, dz] = box.dims;
    let o = 0;
    for (let z = 0; z < dz; z++)
      for (let y = 0; y < dy; y++)
        for (let x = 0; x < dx; x++) {
          const gx = x0 + x, gy = y0 + y, gz = z0 + z;
          if (this.inBounds(gx, gy, gz)) this.data[this.index(gx, gy, gz)] = box.data[o];
          o++;
        }
  }

  /** Sign statistics used by the exporters/stats readout. */
  stats() {
    let mn = Infinity, mx = -Infinity, solid = 0, surface = 0;
    const voxelVol = this.cell[0] * this.cell[1] * this.cell[2];
    for (let i = 0; i < this.length; i++) {
      const v = this.data[i];
      if (v < mn) mn = v;
      if (v > mx) mx = v;
      if (v <= 0) solid++;
      if (Math.abs(v) < Math.max(...this.cell) * 0.5) surface++;
    }
    return {
      min: mn, max: mx,
      solidFraction: solid / this.length,
      surfaceVoxels: surface,
      solidVolumeM3: solid * voxelVol,
      surfaceAreaM2: surface * voxelVol / Math.max(...this.cell),
    };
  }
}

const CHUNK_TMP = { min: [0, 0, 0], max: [0, 0, 0] };

/** Distance along a unit ray to the point where it leaves an AABB (0 if already out). */
export function rayBoxExit(px, py, pz, dx, dy, dz, lo, hi) {
  let tExit = Infinity;
  for (let a = 0; a < 3; a++) {
    const o = a === 0 ? px : a === 1 ? py : pz;
    const d = a === 0 ? dx : a === 1 ? dy : dz;
    const l = lo[a], h = hi[a];
    if (o < l || o > h) return 0;                 // already outside the core
    if (Math.abs(d) < 1e-12) continue;
    const t = d > 0 ? (h - o) / d : (l - o) / d;
    if (t < tExit) tExit = t;
  }
  return Number.isFinite(tExit) ? tExit : 0;
}

export function rangeArray(n) {
  const a = new Array(n);
  for (let i = 0; i < n; i++) a[i] = i;
  return a;
}

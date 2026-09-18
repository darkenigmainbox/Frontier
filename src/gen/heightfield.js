/* ============================================================
 * Frontier · SDF terrain — the erosion height field
 *
 * The 3D SDF is the truth, but landscape evolution *is* 2.5D: water
 * flows downhill over the top surface. Running the fluvial + particle
 * solvers on a 2D grid of top-surface elevations sampled from the SDF
 * is exactly what b2's engine did with its scalar field, and it is
 * ~1000× cheaper than solving in 3D.
 *
 * So: extract the top surface from the volume once, erode it, then
 * rasterise the result back into the volume as a CSG carve/fill and
 * re-solve the Eikonal band. Caves, undercuts and everything that
 * isn't the top surface are preserved untouched (the rasteriser only
 * ever writes above / just below the new surface).
 *
 * HeightField also carries the per-cell *material* maps the erosion
 * needs: rock hardness (incl. strata), soft-soil depth and the
 * channel/sediment/wetness ledgers that the material system and the
 * exporters consume.
 * ============================================================ */

export class HeightField {
  constructor(nx, nz, { minX, minZ, cellX, cellZ }) {
    this.nx = nx; this.nz = nz;
    this.minX = minX; this.minZ = minZ;
    this.cellX = cellX; this.cellZ = cellZ;
    this.maxX = minX + (nx - 1) * cellX;
    this.maxZ = minZ + (nz - 1) * cellZ;
    const n = nx * nz;
    this.h = new Float32Array(n);        // top-surface elevation (m)
    this.h0 = new Float32Array(n);       // elevation before erosion
    this.hardness = new Float32Array(n); // 0 soft .. 1 hard
    this.strata = new Float32Array(n);   // 0..1 hardness of the exposed bed
    this.soil = new Float32Array(n);     // metres of loose cover
    this.flow = new Float32Array(n);     // drainage area, cells
    this.flowW = new Float32Array(n);    // drainage area weighted by upstream rain
    this.erosion = new Float32Array(n);  // metres removed
    this.deposit = new Float32Array(n);  // metres deposited
    this.wet = new Float32Array(n);      // 0..1 water occupancy (rivers/lakes)
    this.trail = new Float32Array(n);    // particle passage count
    this.wetParticle = new Float32Array(n); // water carried by passing particles
    this.slope = new Float32Array(n);
    this.lake = new Float32Array(n);     // lake surface elevation (0 = none)
    this.river = new Float32Array(n);
    this.attractor = new Float32Array(n); // guided-canyon / structural weakness mask
    this.rain = new Float32Array(n);      // rainfall multiplier (orographic)
    this.valid = new Uint8Array(n);      // 1 where the column has solid rock
    this.rain.fill(1);
    this.soil.fill(1);
  }

  idx(i, j) { return j * this.nx + i; }
  xOf(i) { return this.minX + i * this.cellX; }
  zOf(j) { return this.minZ + j * this.cellZ; }
  iOf(x) { return (x - this.minX) / this.cellX; }
  jOf(z) { return (z - this.minZ) / this.cellZ; }
  get cellArea() { return this.cellX * this.cellZ; }

  /** Bilinear elevation sample in world coordinates (clamped at the rim). */
  sample(x, z) {
    return this.sampleArray(this.h, x, z);
  }

  sampleArray(arr, x, z) {
    const fx = (x - this.minX) / this.cellX;
    const fz = (z - this.minZ) / this.cellZ;
    let i0 = Math.floor(fx), j0 = Math.floor(fz);
    if (i0 < 0) i0 = 0; else if (i0 > this.nx - 2) i0 = this.nx - 2;
    if (j0 < 0) j0 = 0; else if (j0 > this.nz - 2) j0 = this.nz - 2;
    const tx = Math.min(Math.max(fx - i0, 0), 1);
    const tz = Math.min(Math.max(fz - j0, 0), 1);
    const a = arr[j0 * this.nx + i0], b = arr[j0 * this.nx + i0 + 1];
    const c = arr[(j0 + 1) * this.nx + i0], d = arr[(j0 + 1) * this.nx + i0 + 1];
    return (a + (b - a) * tx) * (1 - tz) + (c + (d - c) * tx) * tz;
  }

  /** Bilinear sample using grid coordinates (the erosion hot path). */
  sampleGrid(arr, fi, fj) {
    const { nx, nz } = this;
    let i0 = Math.floor(fi), j0 = Math.floor(fj);
    if (i0 < 0) i0 = 0; else if (i0 > nx - 2) i0 = nx - 2;
    if (j0 < 0) j0 = 0; else if (j0 > nz - 2) j0 = nz - 2;
    const tx = Math.min(Math.max(fi - i0, 0), 1);
    const tz = Math.min(Math.max(fj - j0, 0), 1);
    const a = arr[j0 * nx + i0], b = arr[j0 * nx + i0 + 1];
    const c = arr[(j0 + 1) * nx + i0], d = arr[(j0 + 1) * nx + i0 + 1];
    return (a + (b - a) * tx) * (1 - tz) + (c + (d - c) * tx) * tz;
  }

  /** Gradient of the height field, world space (rise per metre). */
  gradient(x, z, out = [0, 0]) {
    const e = 0.5;
    out[0] = (this.sample(x + e, z) - this.sample(x - e, z)) / (2 * e);
    out[1] = (this.sample(x, z + e) - this.sample(x, z - e)) / (2 * e);
    return out;
  }

  slopeAt(x, z) {
    const g = this.gradient(x, z, TMP_G);
    return Math.hypot(g[0], g[1]);
  }

  /** Splat a value into the grid with bilinear weights (used by particles). */
  splat(arr, x, z, value) {
    const fx = (x - this.minX) / this.cellX;
    const fz = (z - this.minZ) / this.cellZ;
    const i0 = Math.floor(fx), j0 = Math.floor(fz);
    if (i0 < 0 || j0 < 0 || i0 >= this.nx - 1 || j0 >= this.nz - 1) return;
    const tx = fx - i0, tz = fz - j0;
    const w00 = (1 - tx) * (1 - tz), w10 = tx * (1 - tz);
    const w01 = (1 - tx) * tz, w11 = tx * tz;
    const b = j0 * this.nx + i0;
    arr[b] += value * w00;
    arr[b + 1] += value * w10;
    arr[b + this.nx] += value * w01;
    arr[b + this.nx + 1] += value * w11;
  }

  /** Hardness of the rock at a given position (strata included). */
  hardnessAt(x, y, z) {
    const i = Math.round(this.iOf(x)), j = Math.round(this.jOf(z));
    if (i < 0 || j < 0 || i >= this.nx || j >= this.nz) return 1;
    const k = j * this.nx + i;
    const base = this.hardness[k];
    const s = this.strata[k];
    // hardness rises below the original surface as the cover is stripped
    const exposure = Math.max(0, this.h0[k] - y) / Math.max(this.soil[k], 0.25);
    return Math.min(1, base + s * Math.min(exposure, 2) * 0.5);
  }

  maxHeight() {
    let m = -Infinity;
    for (let i = 0; i < this.h.length; i++) if (this.valid[i] && this.h[i] > m) m = this.h[i];
    return isFinite(m) ? m : 0;
  }

  /** Roughness RMS of the elevation field (used by tests / stats). */
  roughness() {
    const { nx, nz, h } = this;
    let sum = 0, n = 0;
    for (let j = 1; j < nz - 1; j++)
      for (let i = 1; i < nx - 1; i++) {
        const c = h[j * nx + i];
        const gx = (h[j * nx + i + 1] - h[j * nx + i - 1]) * 0.5 / this.cellX;
        const gz = (h[(j + 1) * nx + i] - h[(j - 1) * nx + i]) * 0.5 / this.cellZ;
        sum += Math.hypot(gx, gz);
        n++;
      }
    return n ? sum / n : 0;
  }
}

const TMP_G = [0, 0];

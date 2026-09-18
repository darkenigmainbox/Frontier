/* ============================================================
 * Frontier · SDF terrain — field repair (re-distancing)
 *
 * CSG operations (min / max / smooth-min of primitives) and any
 * "plane carve" write produce a *correct sign* but a *wrong
 * gradient*: |∇d| drifts away from 1, so sphere tracing starts
 * over- or under-stepping and normals get bent.
 *
 * redistance() re-solves the Eikonal equation
 *      |∇d| = 1 ,  sign(d) = sign(d₀)
 * with first-order Godunov upwind finite differences and alternating
 * Gauss-Seidel sweeps (the fast sweeping method). It runs over a
 * narrow band around the zero level set; outside the band the field
 * is *clamped* to ±band, making this a **truncated SDF** — which is
 * all the mesher, the raycaster and the sculpt brush need, and is
 * what lets a bounded volume behave like an unbounded one.
 *
 * Two properties the solver has to have, and which the fast sweeping
 * method only has if it is set up the right way:
 *
 *  1. **The initial guess must be a supersolution** ( larger than the
 *     distance ), because the relaxation takes a running minimum.
 *     So we do not trust the stored magnitudes: every voxel is reset
 *     to +band and only the *interface* voxels — the ones that
 *     straddle the zero crossing — are seeded, with the sub-voxel
 *     distance obtained by linear interpolation across the crossing.
 *     This is what repairs a field whose values were squashed or
 *     otherwise wrong-scaled; a decrease-only scheme could never
 *     recover from an under-estimate.
 *
 *  2. **Sub-voxel accuracy across anisotropic cells.** Grids here are
 *     not cubic (a terrain volume is e.g. 112×72×112 over a
 *     44×26×40 m box), so the upwind solve uses the real per-axis
 *     spacing rather than a hard-coded h = 1.
 *
 * Cost: one pass over the band per sweep — a few tens of ms at
 * 112×72×112, and only over the stroke box while sculpting.
 * ============================================================ */

/**
 * @param {import('./sdf-volume.js').SdfVolume} vol
 * @param {object} [opts]
 * @param {number} [opts.bandVoxels=6]   narrow band half-width, in voxels
 * @param {number} [opts.sweeps=2]       alternating sweep passes (8 directions each)
 * @param {number[]} [opts.box]          optional voxel box [x0,y0,z0,x1,y1,z1] to limit updates
 * @returns {{updated:number, ms:number, box:number[]|null}}
 */
export function redistance(vol, { bandVoxels = 6, sweeps = 2, box = null } = {}) {
  const t0 = now();
  const { nx, ny, nz, data } = vol;
  const strideY = nx, strideZ = nx * ny;
  const hx = vol.cell[0], hy = vol.cell[1], hz = vol.cell[2];
  const band = bandVoxels * Math.min(hx, hy, hz);   // metres — the whole point

  // Solve region: the requested box *grown by one band*, so the solution is
  // coherent where the caller's box ends and reads of the untouched field
  // cannot leak into it.
  const grow = bandVoxels;
  const rx0 = box ? Math.max(0, (box[0] | 0) - grow) : 0;
  const ry0 = box ? Math.max(0, (box[1] | 0) - grow) : 0;
  const rz0 = box ? Math.max(0, (box[2] | 0) - grow) : 0;
  const rx1 = box ? Math.min(nx - 1, (box[3] | 0) + grow) : nx - 1;
  const ry1 = box ? Math.min(ny - 1, (box[4] | 0) + grow) : ny - 1;
  const rz1 = box ? Math.min(nz - 1, (box[5] | 0) + grow) : nz - 1;

  // Write-back box: the region we actually improved.
  const wx0 = box ? Math.max(0, box[0] | 0) : 0;
  const wy0 = box ? Math.max(0, box[1] | 0) : 0;
  const wz0 = box ? Math.max(0, box[2] | 0) : 0;
  const wx1 = box ? Math.min(nx - 1, box[3] | 0) : nx - 1;
  const wy1 = box ? Math.min(ny - 1, box[4] | 0) : ny - 1;
  const wz1 = box ? Math.min(nz - 1, box[5] | 0) : nz - 1;
  const wBox = [wx0, wy0, wz0, wx1, wy1, wz1];

  const phi = new Float32Array(data.length);
  // (a) everywhere: a supersolution — the stored value if it is a *safe*
  //     (small) one, otherwise the band cap.
  for (let i = 0; i < data.length; i++) {
    const v = data[i];
    phi[i] = v > band ? band : v < -band ? -band : v;
  }

  // (b) inside the solve region: discard the magnitudes entirely and keep
  //     only the sign, so the values cannot poison the result.
  const sign = new Int8Array(data.length);
  for (let z = rz0; z <= rz1; z++)
    for (let y = ry0; y <= ry1; y++) {
      const base = (z * ny + y) * nx;
      for (let x = rx0; x <= rx1; x++) {
        const i = base + x;
        const s = data[i] < 0 ? -1 : 1;
        sign[i] = s;
        phi[i] = s * band;
      }
    }

  // (c) seed the interface voxels with the interpolated crossing distance.
  let seeds = 0;
  const hOf = [hx, hy, hz];
  for (let z = rz0; z <= rz1; z++)
    for (let y = ry0; y <= ry1; y++) {
      const base = (z * ny + y) * nx;
      for (let x = rx0; x <= rx1; x++) {
        const i = base + x;
        const d = data[i];
        let best = Infinity;
        // ±x
        if (x > 0 && sign[i - 1] !== sign[i]) {
          const t = Math.abs(d) / (Math.abs(d) + Math.abs(data[i - 1]) || 1e-9) * hx;
          if (t < best) best = t;
        }
        if (x < nx - 1 && sign[i + 1] !== sign[i]) {
          const t = Math.abs(d) / (Math.abs(d) + Math.abs(data[i + 1]) || 1e-9) * hx;
          if (t < best) best = t;
        }
        if (y > 0 && sign[i - strideY] !== sign[i]) {
          const t = Math.abs(d) / (Math.abs(d) + Math.abs(data[i - strideY]) || 1e-9) * hy;
          if (t < best) best = t;
        }
        if (y < ny - 1 && sign[i + strideY] !== sign[i]) {
          const t = Math.abs(d) / (Math.abs(d) + Math.abs(data[i + strideY]) || 1e-9) * hy;
          if (t < best) best = t;
        }
        if (z > 0 && sign[i - strideZ] !== sign[i]) {
          const t = Math.abs(d) / (Math.abs(d) + Math.abs(data[i - strideZ]) || 1e-9) * hz;
          if (t < best) best = t;
        }
        if (z < nz - 1 && sign[i + strideZ] !== sign[i]) {
          const t = Math.abs(d) / (Math.abs(d) + Math.abs(data[i + strideZ]) || 1e-9) * hz;
          if (t < best) best = t;
        }
        if (best < Infinity) { phi[i] = sign[i] * best; seeds++; }
      }
    }
  void hOf;

  // Nothing to propagate from: the box holds no surface. Leave it alone
  // rather than flooding it with the placeholder value.
  if (seeds === 0) return { updated: 0, ms: now() - t0, box: box ? wBox : null };

  // Godunov upwind update. `t[k]` are the smallest same-sign neighbour
  // magnitudes per axis; solve  quadratic in u:
  //     Σ ((u - t_k)/h_k)² = 1
  const spac = [hx, hy, hz];
  const updateCell = (i, x, y, z) => {
    const s = sign[i];
    // smallest same-sign neighbour magnitude on each axis
    const tv = [Infinity, Infinity, Infinity];
    const read = (j, axis) => {
      const v = phi[j];
      if (s * v < 0 || Math.abs(v) > band) return;   // opposite side, or far field
      const m = Math.abs(v);
      if (m < tv[axis]) tv[axis] = m;
    };
    if (x > 0) read(i - 1, 0);
    if (x < nx - 1) read(i + 1, 0);
    if (y > 0) read(i - strideY, 1);
    if (y < ny - 1) read(i + strideY, 1);
    if (z > 0) read(i - strideZ, 2);
    if (z < nz - 1) read(i + strideZ, 2);

    // order the axes by value: vl[0] ≤ vl[1] ≤ vl[2]
    const vl = [tv[0], tv[1], tv[2]];
    const ax = [0, 1, 2];
    for (let p = 0; p < 2; p++)
      for (let q = p + 1; q < 3; q++)
        if (vl[q] < vl[p]) {
          let tmp = vl[p]; vl[p] = vl[q]; vl[q] = tmp;
          tmp = ax[p]; ax[p] = ax[q]; ax[q] = tmp;
        }
    if (!isFinite(vl[0])) return 0;

    const solve = (n) => {
      // quadratic with the n nearest axes active, real per-axis spacing:
      //     Σ ((u - vl[k]) / h_k)² = 1   ⇒   A·u² − 2B·u + C = 0
      let A = 0, B = 0, C = -1;
      for (let j = 0; j < n; j++) {
        const inv = 1 / (spac[ax[j]] * spac[ax[j]]);
        A += inv;
        B += vl[j] * inv;
        C += vl[j] * vl[j] * inv;
      }
      if (A <= 0) return Infinity;
      return (B + Math.sqrt(Math.max(0, B * B - A * C))) / A;
    };

    let next = solve(1);
    if (next > vl[1]) next = solve(2);
    if (next > vl[2]) next = solve(3);
    if (!isFinite(next)) return 0;
    if (next > band) next = band;
    if (next < Math.abs(phi[i])) {
      phi[i] = s * next;
      return 1;
    }
    return 0;
  };

  let updated = 0;
  for (let pass = 0; pass < sweeps; pass++) {
    // 8 alternating sweep directions (x, y, z each ascending / descending)
    for (let dir = 0; dir < 8; dir++) {
      const xRev = (dir & 1) !== 0, yRev = (dir & 2) !== 0, zRev = (dir & 4) !== 0;
      for (let zi = 0; zi <= rz1 - rz0; zi++) {
        const z = zRev ? rz1 - zi : rz0 + zi;
        const zs = z * strideZ;
        for (let yi = 0; yi <= ry1 - ry0; yi++) {
          const y = yRev ? ry1 - yi : ry0 + yi;
          const ys = zs + y * strideY;
          for (let xi = 0; xi <= rx1 - rx0; xi++) {
            const x = xRev ? rx1 - xi : rx0 + xi;
            updated += updateCell(ys + x, x, y, z);
          }
        }
      }
    }
  }

  // write back only the caller's box; the growing ring was only scaffolding
  for (let z = wz0; z <= wz1; z++)
    for (let y = wy0; y <= wy1; y++) {
      const base = (z * ny + y) * nx;
      for (let x = wx0; x <= wx1; x++) data[base + x] = phi[base + x];
    }

  return { updated, ms: now() - t0, box: box ? wBox : null };
}

/**
 * Rebuild the whole field from a sign-only field: used after a large
 * "plane carve" (erosion rasterisation), where the vertical distance is
 * a poor approximation of the true distance near cliffs.
 */
export function rebuildField(vol, opts = {}) {
  return redistance(vol, { bandVoxels: opts.bandVoxels ?? 8, sweeps: opts.sweeps ?? 2 });
}

/** Transform a raw "vertical distance" column write into a usable SDF band. */
export function planeWriteFixup(vol, box, bandVoxels = 8) {
  // First clamp the (possibly very large) values into the band, then re-solve
  // them properly: the clamp alone is what makes the field conservative, the
  // Eikonal solve is what makes it accurate.
  vol.clampBand(box);
  return redistance(vol, { bandVoxels, sweeps: 2, box });
}

/** Mean |∇d| inside the band — 1.0 means the field is a proper SDF. */
export function gradientQuality(vol, bandVoxels = 4) {
  const { nx, ny, nz } = vol;
  let sum = 0, n = 0, worst = 0, bad = 0;
  const h = [vol.cell[0], vol.cell[1], vol.cell[2]];
  const band = bandVoxels * Math.min(h[0], h[1], h[2]);
  for (let z = 1; z < nz - 1; z += 2)
    for (let y = 1; y < ny - 1; y += 2)
      for (let x = 1; x < nx - 1; x += 2) {
        const d = vol.data[vol.index(x, y, z)];
        if (Math.abs(d) > band) continue;
        const gx = (vol.data[vol.index(x + 1, y, z)] - vol.data[vol.index(x - 1, y, z)]) / (2 * h[0]);
        const gy = (vol.data[vol.index(x, y + 1, z)] - vol.data[vol.index(x, y - 1, z)]) / (2 * h[1]);
        const gz = (vol.data[vol.index(x, y, z + 1)] - vol.data[vol.index(x, y, z - 1)]) / (2 * h[2]);
        const g = Math.hypot(gx, gy, gz);
        sum += g;
        n++;
        const err = Math.abs(g - 1);
        if (err > worst) worst = err;
        if (err > 0.25) bad++;
      }
  return n ? sum / n : 1;
}

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

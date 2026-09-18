// Frontier — sculpting operators (CPU mirror of the GPU sculpt pass).
// Proper SDF sculpting: CSG stamps with smooth falloff, Laplacian smoothing,
// tangent-plane flatten, hardness paint — always followed by redistancing so
// the volume stays a valid SDF (|∇d| ≈ 1) for raymarching and erosion.

import { BAND } from "./constants.js";

// Final redistancing step: Lipschitz clamp — no adjacent-voxel jump may exceed
// the band-crossing bound 2·BAND + h. Guarantees the volume stays a valid,
// raymarchable SDF even after sub-voxel sculpt faces.
export function lipschitzClamp(vol, sweeps = 2) {
  const [nx, ny, nz] = vol.dims;
  const h = Math.max(vol.cell[0], vol.cell[1], vol.cell[2]);
  const L = 2 * 0.32 + h;
  for (let s = 0; s < sweeps; s++) {
    let touch = false;
    for (let z = 0; z < nz; z++) for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
      const i = vol.index(x, y, z);
      for (const [X, Y, Z] of [[x + 1, y, z], [x, y + 1, z], [x, y, z + 1]]) {
        if (X >= nx || Y >= ny || Z >= nz) continue;
        const j = vol.index(X, Y, Z);
        const di = vol.data[i], dj = vol.data[j];
        const diff = di - dj;
        if (Math.abs(diff) > L) {
          const excess = (Math.abs(diff) - L) * 0.5 * Math.sign(diff);
          vol.data[i] = di - excess;
          vol.data[j] = dj + excess;
          touch = true;
        }
      }
    }
    if (!touch) break;
  }
}

import { smin, smax } from "./field.js";
import { STAMP_TYPES, sampleStampSDF } from "./stamps.js";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// One brush dab at `point`. tool: 1 carve | 2 build | 3 smooth | 4 flatten | 5 stamp | 6 paint
// stampType only used when tool===5. mode: union/carve handled by sign.
export function sculptDab(vol, point, radius, tool, strength = 0.5, stampType = 0, stampMode = "union") {
  const [nx, ny, nz] = vol.dims;
  const r = radius;
  const gx = (point[0] - vol.min[0]) / vol.cell[0] - 0.5;
  const gy = (point[1] - vol.min[1]) / vol.cell[1] - 0.5;
  const gz = (point[2] - vol.min[2]) / vol.cell[2] - 0.5;
  // stamps extend beyond the brush radius — widen the loop for them
  const radVox = (tool === 5 ? 2.6 : 1.05) * r / Math.min(...vol.cell);
  const i0 = [Math.max(0, Math.floor(gx - radVox)), Math.max(0, Math.floor(gy - radVox)), Math.max(0, Math.floor(gz - radVox))];
  const i1 = [Math.min(nx - 1, Math.ceil(gx + radVox)), Math.min(ny - 1, Math.ceil(gy + radVox)), Math.min(nz - 1, Math.ceil(gz + radVox))];

  // tangent plane at the hit (for flatten): recover from central differences
  const n = [0, 0, 0];
  vol.normal(point[0], point[1], point[2], n, radius * 0.35);
  const planeD = n[0] * point[0] + n[1] * point[1] + n[2] * point[2];

  for (let z = i0[2]; z <= i1[2]; z++) for (let y = i0[1]; y <= i1[1]; y++) for (let x = i0[0]; x <= i1[0]; x++) {
    const w = vol.worldAt(x, y, z, [0, 0, 0]);
    const dist = Math.hypot(w[0] - point[0], w[1] - point[1], w[2] - point[2]);
    if (dist > r && tool !== 5) continue;
    if (tool === 5 && dist > r * 2.6) continue;
    const i = vol.index(x, y, z);
    const fall = Math.pow(1 - Math.min(1, dist / r), 2); // smooth falloff
    const d = vol.data[i];

    if (tool === 1) { // carve: smooth-subtract sphere, blended by falloff so the
      // edit fades at the rim (no artificial shell at the brush boundary)
      const k = Math.min(0.35 * r, Math.max(0.12, strength * r));
      const carved = smax(d, r - dist, k);
      vol.data[i] = d + (carved - d) * Math.min(1, fall * (0.35 + strength));
    } else if (tool === 2) { // build: smooth-union sphere, falloff-blended
      const k = Math.min(0.35 * r, Math.max(0.12, strength * r));
      const built = smin(d, dist - r, k);
      vol.data[i] = d + (built - d) * Math.min(1, fall * (0.35 + strength));
    } else if (tool === 3) { // smooth: Laplacian blend inside brush
      const avg = (
        vol.data[vol.index(clamp(x - 1, 0, nx - 1), y, z)] + vol.data[vol.index(clamp(x + 1, 0, nx - 1), y, z)] +
        vol.data[vol.index(x, clamp(y - 1, 0, ny - 1), z)] + vol.data[vol.index(x, clamp(y + 1, 0, ny - 1), z)] +
        vol.data[vol.index(x, y, clamp(z - 1, 0, nz - 1))] + vol.data[vol.index(x, y, clamp(z + 1, 0, nz - 1))]
      ) / 6;
      vol.data[i] = d + (avg - d) * Math.min(1, 0.85 * strength) * fall;
    } else if (tool === 4) { // flatten: pull toward the tangent half-space
      const plane = n[0] * w[0] + n[1] * w[1] + n[2] * w[2] - planeD;
      vol.data[i] = d + (plane - d) * Math.min(1, 0.8 * strength) * fall;
    } else if (tool === 5) { // library stamp (CSG)
      const lx = (w[0] - point[0]) / r, ly = (w[1] - point[1]) / r, lz = (w[2] - point[2]) / r;
      const sd = sampleStampSDF(stampType, [lx, ly, lz], { radius: 0.7 }) * r;
      const k = Math.max(0.1, 0.3 * r);
      if (stampMode === "union") vol.data[i] = smin(d, sd, k);
      else if (stampMode === "subtract") vol.data[i] = smax(d, -sd, k);
      else if (stampMode === "smooth_union") vol.data[i] = smin(d, sd, k * 2.2);
      else if (stampMode === "smooth_subtract") vol.data[i] = smax(d, -sd, k * 2.2);
    } else if (tool === 6) { // paint hardness: darken species → harder strata read
      vol.material[i] = vol.material[i] * (1 - fall * 0.4);
    }
    vol.data[i] = clamp(vol.data[i], -BAND * 24, BAND * 24);
    vol.data[i + 3] = clamp(0.5 - vol.data[i] / (2 * BAND), 0, 1);
  }
}

// Run a whole stroke (list of dabs) then redistance — the "properly" part.
export function sculptStroke(vol, dabs, redist) {
  for (const dab of dabs) sculptDab(vol, dab.point, dab.radius, dab.tool, dab.strength, dab.stampType, dab.stampMode);
  if (redist) redistanceVolume(vol, 6);
}

// Volume redistancing — identical algorithm to solver.redistance, exposed free
// for sculpt use.
export function redistanceVolume(vol, iterations = 3) {
  // (defined below) runs Eikonal sweeps, then a Lipschitz clamp
  const [nx, ny, nz] = vol.dims;
  const hmin = Math.min(vol.cell[0], vol.cell[1], vol.cell[2]);
  for (let it = 0; it < iterations; it++) {
    const fwd = it % 2 === 0;
    for (let zi = 0; zi < nz; zi++) {
      const z = fwd ? zi : nz - 1 - zi;
      for (let yi = 0; yi < ny; yi++) {
        const y = fwd ? yi : ny - 1 - yi;
        for (let xi = 0; xi < nx; xi++) {
          const x = fwd ? xi : nx - 1 - xi;
          const i = vol.index(x, y, z);
          const a = vol.data[i + 3];
          if (a > 0.0001 && a < 0.9999) { vol.data[i] = BAND * (1 - 2 * a); continue; }
          const sign = a >= 0.5 ? -1 : 1;
          const xm = x > 0 ? Math.abs(vol.data[vol.index(x - 1, y, z)]) : 1e9;
          const xp = x < nx - 1 ? Math.abs(vol.data[vol.index(x + 1, y, z)]) : 1e9;
          const ym = y > 0 ? Math.abs(vol.data[vol.index(x, y - 1, z)]) : 1e9;
          const yp = y < ny - 1 ? Math.abs(vol.data[vol.index(x, y + 1, z)]) : 1e9;
          const zm = z > 0 ? Math.abs(vol.data[vol.index(x, y, z - 1)]) : 1e9;
          const zp = z < nz - 1 ? Math.abs(vol.data[vol.index(x, y, z + 1)]) : 1e9;
          let a1 = Math.min(xm, xp), a2 = Math.min(ym, yp), a3 = Math.min(zm, zp);
          if (a1 > a2) { const t = a1; a1 = a2; a2 = t; }
          if (a2 > a3) { const t = a2; a2 = t; a3 = t; }
          if (a1 > a2) { const t = a1; a1 = a2; a2 = t; }
          let t = a1 + hmin;
          if (t > a2) t = (a1 + a2 + Math.sqrt(Math.max(0, 2 * hmin * hmin - (a1 - a2) * (a1 - a2)))) * 0.5;
          if (t > a3) {
            const sum = a1 + a2 + a3;
            t = (sum + Math.sqrt(Math.max(0, sum * sum - 3 * (a1 * a1 + a2 * a2 + a3 * a3 - hmin * hmin)))) / 3;
          }
          const cand = sign * Math.max(BAND, t);
          if (it === 0 || Math.abs(cand) < Math.abs(vol.data[i])) vol.data[i] = cand;
        }
      }
    }
  }
  lipschitzClamp(vol, 2);
}

export { STAMP_TYPES };

// Frontier — quality metrics + ancestor algorithm reproductions for A/B tests.
// These let the headless suite *prove* the merged solver beats the two
// ancestors: no runaway holes (vs particle branch) and no blur (vs algorithm branch).

import { carveRadius, BAND } from "./constants.js";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// Mean |∇d| across surface-band voxels — the crispness metric.
// Higher = sharper features. The ancestor's wide-kernel deltas smear this out.
export function sharpness(vol) {
  const [nx, ny, nz] = vol.dims;
  let sum = 0, count = 0;
  for (let z = 1; z < nz - 1; z++) for (let y = 1; y < ny - 1; y++) for (let x = 1; x < nx - 1; x++) {
    const i = vol.index(x, y, z);
    if (Math.abs(vol.data[i]) > BAND * 1.6) continue;
    const gx = (vol.data[vol.index(x + 1, y, z)] - vol.data[vol.index(x - 1, y, z)]) / (2 * vol.cell[0]);
    const gy = (vol.data[vol.index(x, y + 1, z)] - vol.data[vol.index(x, y - 1, z)]) / (2 * vol.cell[1]);
    const gz = (vol.data[vol.index(x, y, z + 1)] - vol.data[vol.index(x, y, z - 1)]) / (2 * vol.cell[2]);
    sum += Math.hypot(gx, gy, gz);
    count++;
  }
  return count ? sum / count : 0;
}

// Surface roughness: std-dev of |∇d| — blurred fields have low std-dev.
export function roughnessStd(vol) {
  const [nx, ny, nz] = vol.dims;
  const gs = [];
  for (let z = 1; z < nz - 1; z++) for (let y = 1; y < ny - 1; y++) for (let x = 1; x < nx - 1; x++) {
    const i = vol.index(x, y, z);
    if (Math.abs(vol.data[i]) > BAND * 1.6) continue;
    const gx = (vol.data[vol.index(x + 1, y, z)] - vol.data[vol.index(x - 1, y, z)]) / (2 * vol.cell[0]);
    const gy = (vol.data[vol.index(x, y + 1, z)] - vol.data[vol.index(x, y - 1, z)]) / (2 * vol.cell[1]);
    const gz = (vol.data[vol.index(x, y, z + 1)] - vol.data[vol.index(x, y, z - 1)]) / (2 * vol.cell[2]);
    gs.push(Math.hypot(gx, gy, gz));
  }
  if (!gs.length) return 0;
  const mean = gs.reduce((a, b) => a + b, 0) / gs.length;
  return Math.sqrt(gs.reduce((a, b) => a + (b - mean) * (b - mean), 0) / gs.length);
}

// Max incision depth: deepest local depression below the *initial* surface
// along sampled verticals. Marginal columns (the thin floating bed sheet near
// the map border) are excluded — they are not gameplay terrain.
export function maxIncision(vol, initialHeights, minH0 = 1.5, edgeMargin = 2.2) {
  const [nx, , nz] = vol.dims;
  let worst = 0;
  for (let z = 0; z < nz; z++) for (let x = 0; x < nx; x++) {
    const h0 = initialHeights[z * nx + x];
    if (h0 === undefined || h0 < minH0) continue;
    const wx = vol.min[0] + (x + 0.5) * vol.cell[0];
    const wz = vol.min[2] + (z + 0.5) * vol.cell[2];
    if (Math.max(Math.abs(wx), Math.abs(wz)) > Math.min(Math.abs(vol.max[0]), Math.abs(vol.max[2])) - edgeMargin) continue;
    // find current top surface height at (x,z)
    let top = -1e9;
    for (let y = vol.dims[1] - 1; y >= 0; y--) {
      const i = vol.index(x, y, z);
      if (vol.data[i + 3] >= 0.5) { top = vol.min[1] + (y + 0.5) * vol.cell[1]; break; }
    }
    if (top < -1e8) continue; // column fully removed (also bad — check separately)
    worst = Math.max(worst, h0 - top);
  }
  return worst;
}

// Interior columns that lost ALL their solid below the initial surface →
// drilled-through holes. Marginal/floating-sheet columns excluded.
export function drilledColumns(vol, initialHeights, minH0 = 1.5, edgeMargin = 2.2) {
  const [nx, ny, nz] = vol.dims;
  let holes = 0;
  for (let z = 0; z < nz; z++) for (let x = 0; x < nx; x++) {
    const h0 = initialHeights[z * nx + x];
    if (h0 === undefined || h0 < minH0) continue;
    const wx = vol.min[0] + (x + 0.5) * vol.cell[0];
    const wz = vol.min[2] + (z + 0.5) * vol.cell[2];
    if (Math.max(Math.abs(wx), Math.abs(wz)) > Math.min(Math.abs(vol.max[0]), Math.abs(vol.max[2])) - edgeMargin) continue;
    const y0 = Math.floor((h0 - vol.min[1]) / vol.cell[1]);
    let anySolid = false;
    for (let y = 0; y < Math.min(ny, y0); y++) {
      if (vol.data[vol.index(x, y, z) + 3] >= 0.5) { anySolid = true; break; }
    }
    if (!anySolid && y0 > 2) holes++;
  }
  return holes;
}

// Height field snapshot (top solid voxel per column) for incision comparisons.
export function heightField(vol) {
  const [nx, ny, nz] = vol.dims;
  const h = new Float32Array(nx * nz).fill(-1e9);
  for (let z = 0; z < nz; z++) for (let x = 0; x < nx; x++) {
    for (let y = ny - 1; y >= 0; y--) {
      if (vol.data[vol.index(x, y, z) + 3] >= 0.5) { h[z * nx + x] = vol.min[1] + (y + 0.5) * vol.cell[1]; break; }
    }
  }
  return h;
}

// Channel connectivity: of the columns incised deeper than `threshold`, the
// fraction that has at least one 4-neighbor incised past the same threshold.
// Swept (capsule) carving produces continuous channel runs (high fraction);
// point-contact carving leaves isolated pits (low fraction).
export function channelConnectivity(vol, initialHeights, threshold = 1.0, minH0 = 1.5, edgeMargin = 2.2) {
  const [nx, , nz] = vol.dims;
  const inc = new Float32Array(nx * nz);
  for (let z = 0; z < nz; z++) for (let x = 0; x < nx; x++) {
    const h0 = initialHeights[z * nx + x];
    if (h0 === undefined || h0 < minH0) continue;
    const wx = vol.min[0] + (x + 0.5) * vol.cell[0];
    const wz = vol.min[2] + (z + 0.5) * vol.cell[2];
    if (Math.max(Math.abs(wx), Math.abs(wz)) > Math.min(Math.abs(vol.max[0]), Math.abs(vol.max[2])) - edgeMargin) continue;
    let top = -1e9;
    for (let y = vol.dims[1] - 1; y >= 0; y--) {
      if (vol.data[vol.index(x, y, z) + 3] >= 0.5) { top = vol.min[1] + (y + 0.5) * vol.cell[1]; break; }
    }
    if (top < -1e8) continue;
    inc[z * nx + x] = h0 - top;
  }
  let incised = 0, connected = 0;
  for (let z = 0; z < nz; z++) for (let x = 0; x < nx; x++) {
    if (inc[z * nx + x] < threshold) continue;
    incised++;
    const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const [dx, dz] of nb) {
      const X = x + dx, Z = z + dz;
      if (X < 0 || X >= nx || Z < 0 || Z >= nz) continue;
      if (inc[Z * nx + X] >= threshold) { connected++; break; }
    }
  }
  return { frac: incised ? connected / incised : 0, incised };
}

// ---------------------------------------------------------------------
// ANCESTOR A (particle branch) demand model — reproduced for the A/B test:
// unconditional minimum demand + speed-unbounded capacity + fat area cap.
export function legacyDemandmA3(speed, radius) {
  const stress = Math.sqrt(speed / Math.max(0.18, radius * 0.5));
  const critical = 0.06;
  const hemisphere = 2.094 * Math.pow(radius, 3);
  let detach = 1.0 * Math.max(0, stress - critical) * hemisphere * 1.8 * 0.04 * (0.6 + 1) * (0.6 + 0.5);
  if (detach > 0.0005) detach = Math.max(detach, 0.012); // ← the runaway floor
  return detach; // m³
}

// ANCESTOR B (algorithm branch) carve — reproduced for the A/B test:
// wide spherical kernel (r=1.8 m), linear falloff, added straight to the
// distance values. This is the low-pass filter that produced the blur.
export function legacyAlterSDFVolume(vol, wx, wy, wz, radius, deltaDist) {
  const [nx, ny, nz] = vol.dims;
  const gx = (wx - vol.min[0]) / vol.cell[0];
  const gy = (wy - vol.min[1]) / vol.cell[1];
  const gz = (wz - vol.min[2]) / vol.cell[2];
  const rx = radius / vol.cell[0], ry = radius / vol.cell[1], rz = radius / vol.cell[2];
  const i0 = [Math.max(0, Math.floor(gx - rx)), Math.max(0, Math.floor(gy - ry)), Math.max(0, Math.floor(gz - rz))];
  const i1 = [Math.min(nx - 1, Math.ceil(gx + rx)), Math.min(ny - 1, Math.ceil(gy + ry)), Math.min(nz - 1, Math.ceil(gz + rz))];
  for (let z = i0[2]; z <= i1[2]; z++) for (let y = i0[1]; y <= i1[1]; y++) for (let x = i0[0]; x <= i1[0]; x++) {
    const px = vol.min[0] + x * vol.cell[0], py = vol.min[1] + y * vol.cell[1], pz = vol.min[2] + z * vol.cell[2];
    const dist = Math.hypot(px - wx, py - wy, pz - wz);
    if (dist < radius) {
      const weight = 1.0 - dist / radius;
      const i = vol.index(x, y, z);
      vol.data[i] += deltaDist * weight;
      vol.data[i + 3] = clamp(0.5 - vol.data[i] / (2 * BAND), 0, 1);
    }
  }
}

export { carveRadius };

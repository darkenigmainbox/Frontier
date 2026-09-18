/* ============================================================
 * Frontier · SDF Terrain Lab — Particle Droplet Hydraulic Erosion
 *
 * Physically-based 3D particle droplet simulation with
 * ANTI-TUNNELING bedload resistance and depression filling:
 *
 *   1. Droplets spawn with biased distribution on catchments/slopes.
 *   2. Advect along -∇h with momentum/inertia, gravity, and drag.
 *   3. Sub-voxel bilinear sampling of continuous height & gradient.
 *   4. Stream transport capacity C ∝ speed · water · max(slope, minSlope).
 *   5. ANTI-TUNNELING MECHANISMS:
 *      - Depression filling: uphill/sink moves drop sediment to fill pits
 *        rather than drilling deeper.
 *      - Dynamic bedrock resistance: deeper cuts hit harder rock layers,
 *        naturally arresting vertical trenching.
 *      - Angle-of-repose talus collapse: steep cuts widen into V-gullies
 *        instead of leaving vertical needle holes.
 *      - CFL per-step carve bound + per-droplet lifetime budget.
 *   6. Smooth 3x3 Gaussian carve & 5x5 fan deposition footprints.
 * ============================================================ */

import { mulberry32 } from './noise.js';

// Precomputed 3×3 normalized Gaussian carve filter (sum = 1.0)
const GAUSS_3X3 = [
  [-1, -1, 0.0625], [0, -1, 0.1250], [1, -1, 0.0625],
  [-1,  0, 0.1250], [0,  0, 0.2500], [1,  0, 0.1250],
  [-1,  1, 0.0625], [0,  1, 0.1250], [1,  1, 0.0625],
];

// Precomputed 5×5 normalized fan deposition filter (sum = 1.0)
const GAUSS_5X5 = [
  [-2, -2, 0.01], [-1, -2, 0.02], [0, -2, 0.04], [1, -2, 0.02], [2, -2, 0.01],
  [-2, -1, 0.02], [-1, -1, 0.08], [0, -1, 0.12], [1, -1, 0.08], [2, -1, 0.02],
  [-2,  0, 0.04], [-1,  0, 0.12], [0,  0, 0.16], [1,  0, 0.12], [2,  0, 0.04],
  [-2,  1, 0.02], [-1,  1, 0.08], [0,  1, 0.12], [1,  1, 0.08], [2,  1, 0.02],
  [-2,  2, 0.01], [-1,  2, 0.02], [0,  2, 0.04], [1,  2, 0.02], [2,  2, 0.01],
];

/**
 * Bilinear height and analytical gradient evaluation on grid h[].
 */
export function sampleFieldWithGrad(h, N, gx, gy) {
  let x0 = Math.floor(gx), y0 = Math.floor(gy);
  if (x0 < 0) x0 = 0; else if (x0 > N - 2) x0 = N - 2;
  if (y0 < 0) y0 = 0; else if (y0 > N - 2) y0 = N - 2;

  const u = gx - x0;
  const v = gy - y0;

  const idx00 = y0 * N + x0;
  const idx10 = idx00 + 1;
  const idx01 = idx00 + N;
  const idx11 = idx01 + 1;

  const h00 = h[idx00], h10 = h[idx10];
  const h01 = h[idx01], h11 = h[idx11];

  const height = (1 - u) * (1 - v) * h00 + u * (1 - v) * h10 + (1 - u) * v * h01 + u * v * h11;
  const gradX = (1 - v) * (h10 - h00) + v * (h11 - h01);
  const gradY = (1 - u) * (h01 - h00) + u * (h11 - h10);

  return { height, gradX, gradY };
}

/**
 * Carve into terrain using Gaussian 3x3 footprint with anti-tunneling bedrock clamping.
 */
function carveGaussian(h, N, gx, gy, amount, bedrock, erosionMap, channelsMap) {
  const cx = Math.round(gx);
  const cy = Math.round(gy);

  for (let k = 0; k < GAUSS_3X3.length; k++) {
    const nx = cx + GAUSS_3X3[k][0];
    const ny = cy + GAUSS_3X3[k][1];
    if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
    const idx = ny * N + nx;
    const weight = GAUSS_3X3[k][2];
    const cut = Math.min(amount * weight, Math.max(0, h[idx] - bedrock));
    if (cut > 1e-9) {
      h[idx] -= cut;
      if (erosionMap) erosionMap[idx] += cut;
      if (channelsMap) channelsMap[idx] += cut * 1.5;
    }
  }
}

/**
 * Deposit into terrain using Gaussian 5x5 footprint.
 */
function depositGaussian(h, N, gx, gy, amount, depositMap) {
  const cx = Math.round(gx);
  const cy = Math.round(gy);

  for (let k = 0; k < GAUSS_5X5.length; k++) {
    const nx = cx + GAUSS_5X5[k][0];
    const ny = cy + GAUSS_5X5[k][1];
    if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
    const idx = ny * N + nx;
    const weight = GAUSS_5X5[k][2];
    const dep = amount * weight;
    if (dep > 1e-9) {
      h[idx] += dep;
      if (depositMap) depositMap[idx] += dep;
    }
  }
}

/**
 * Angle-of-repose talus collapse around a carved cell (widens vertical cuts into V-profiles).
 */
function relaxTalus(h, N, voxel, cx, cy, critSlope = 1.15) {
  const maxDrop = critSlope * voxel;
  const idx = cy * N + cx;
  const cur = h[idx];

  const neighbors = [
    [cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1],
    [cx + 1, cy + 1], [cx - 1, cy - 1], [cx + 1, cy - 1], [cx - 1, cy + 1]
  ];

  for (let i = 0; i < neighbors.length; i++) {
    const nx = neighbors[i][0], ny = neighbors[i][1];
    if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
    const nidx = ny * N + nx;
    const nH = h[nidx];
    const isDiag = i >= 4;
    const thresh = isDiag ? maxDrop * 1.414 : maxDrop;
    const diff = nH - cur;
    if (diff > thresh) {
      const slump = (diff - thresh) * 0.25;
      h[nidx] -= slump;
      h[idx] += slump;
    }
  }
}

/**
 * Particle Droplet Erosion on SDF heightfield with anti-tunneling physics.
 *
 * @param {object} cfg
 * @returns {Promise<{carvedM3: number, depositedM3: number}>}
 */
export async function particleErode({
  h,
  baseH = null,
  N,
  voxel,
  seed = 42,
  particles = 25000,
  maxSteps = 48,
  inertia = 0.18,
  erodibility = 0.55,
  cutFraction = 0.18,
  depositRate = 0.35,
  gravity = 9.8,
  evaporation = 0.02,
  minSlope = 0.015,
  bedrock = -40,
  seaLevel = -7,
  antiTunneling = true,
  talusRelax = true,
  maps = null,
  yieldControl = null,
}) {
  const size = N * N;
  const cellArea = voxel * voxel;
  const rng = mulberry32((seed ^ 0x9a8f11) >>> 0);

  const erosionMap = maps ? maps.erosionMap : null;
  const depositMap = maps ? maps.depositMap : null;
  const pointsMap = maps ? maps.pointsMap : null;
  const channelsMap = maps ? maps.channelsMap : null;

  // Maximum carve depth per step in world metres: prevents digging endless pits
  const maxCarvePerStep = voxel * cutFraction * 0.35;
  // Maximum cumulative carve per droplet: ensures a rogue particle cannot burrow a hole
  const maxDropBudget = maxCarvePerStep * 6.5;

  let carvedTotal = 0;
  let depositedTotal = 0;

  // Sub-batch size for yielding UI updates
  const batchSize = Math.max(1000, Math.floor(particles / 12));

  for (let p = 0; p < particles; p++) {
    // Biased particle spawn: prefer steeper, elevated flank areas where rainfall accumulates
    let gx = 1 + rng() * (N - 2);
    let gy = 1 + rng() * (N - 2);

    for (let tryCount = 0; tryCount < 3; tryCount++) {
      const idx = Math.floor(gy) * N + Math.floor(gx);
      if (h[idx] > seaLevel + 3.0) break;
      gx = 1 + rng() * (N - 2);
      gy = 1 + rng() * (N - 2);
    }

    let dirX = 0, dirY = 0;
    let speed = 1.0;
    let water = 1.0;
    let sediment = 0;
    let dropCarved = 0;

    for (let step = 0; step < maxSteps; step++) {
      const { height, gradX, gradY } = sampleFieldWithGrad(h, N, gx, gy);

      // Gradient in world units (m/m)
      const worldSlopeX = gradX / voxel;
      const worldSlopeY = gradY / voxel;
      const slope = Math.hypot(worldSlopeX, worldSlopeY);

      // Accelerate along steepest descent (-∇h)
      const invSlope = slope > 1e-6 ? 1 / slope : 0;
      const downX = -worldSlopeX * invSlope;
      const downY = -worldSlopeY * invSlope;

      dirX = dirX * inertia + downX * (1 - inertia);
      dirY = dirY * inertia + downY * (1 - inertia);
      const dirLen = Math.hypot(dirX, dirY);
      if (dirLen > 1e-6) {
        dirX /= dirLen;
        dirY /= dirLen;
      }

      // Move particle forward in grid units
      const stepDist = Math.max(0.35, Math.min(1.15, speed * 0.35));
      const nextGx = gx + dirX * stepDist;
      const nextGy = gy + dirY * stepDist;

      // Bounds check: if leaving terrain domain, deposit remaining sediment and terminate
      if (nextGx < 1 || nextGy < 1 || nextGx >= N - 2 || nextGy >= N - 2) {
        if (sediment > 1e-6) {
          depositGaussian(h, N, gx, gy, sediment, depositMap);
          depositedTotal += sediment * cellArea;
        }
        break;
      }

      const nextH = sampleFieldWithGrad(h, N, nextGx, nextGy).height;
      const dh = nextH - height;

      // ANTI-TUNNELING 1: SINK / BASIN PROTECTION
      // If moving uphill (local depression or pit floor), water CANNOT carve!
      // In nature, depressions fill with water & sediment.
      if (dh >= 0) {
        if (antiTunneling) {
          const depositAmount = Math.min(sediment, dh + 0.08 * voxel);
          depositGaussian(h, N, gx, gy, depositAmount, depositMap);
          depositedTotal += depositAmount * cellArea;
          sediment -= depositAmount;
          if (pointsMap) {
            const pi = Math.floor(gy) * N + Math.floor(gx);
            pointsMap[pi] += 0.15;
          }
        }
        break; // terminate particle trapped in depression floor
      }

      // ANTI-TUNNELING 2: DYNAMIC BEDROCK RESISTANCE
      // Calculate how deep this channel has already cut below the base surface.
      // Erodibility drops off sharply as incision approaches resistant bedrock strata.
      let bedrockFactor = 1.0;
      if (antiTunneling && baseH) {
        const cellIdx = Math.floor(gy) * N + Math.floor(gx);
        const depth = Math.max(0, baseH[cellIdx] - height);
        // Hardness increases exponentially with depth below initial terrain
        bedrockFactor = 1.0 + Math.pow(depth / (voxel * 1.5), 2.0) * 1.8;
      }
      const localErodibility = erodibility / bedrockFactor;

      // Slope-dependent transport capacity: C = K · water · speed · max(slope, minSlope)
      const effSlope = Math.max(minSlope, -dh / (stepDist * voxel));
      const capacity = Math.max(0, -dh) * speed * water * localErodibility * 1.7;

      if (sediment > capacity) {
        // Overloaded: deposit excess sediment
        const depositAmount = Math.min(
          (sediment - capacity) * depositRate,
          maxCarvePerStep * 2.5
        );
        depositGaussian(h, N, gx, gy, depositAmount, depositMap);
        depositedTotal += depositAmount * cellArea;
        sediment -= depositAmount;
      } else {
        // Under capacity: erode rock surface
        // ANTI-TUNNELING 3: STRICT CARVE CEILINGS
        const wantErode = (capacity - sediment) * 0.40;
        const availableBudget = Math.max(0, maxDropBudget - dropCarved);
        const carveAmount = Math.min(
          wantErode,
          maxCarvePerStep,
          availableBudget,
          Math.max(0, height - bedrock)
        );

        if (carveAmount > 1e-9) {
          carveGaussian(h, N, gx, gy, carveAmount, bedrock, erosionMap, channelsMap);
          carvedTotal += carveAmount * cellArea;
          sediment += carveAmount;
          dropCarved += carveAmount;

          // ANTI-TUNNELING 4: ANGLE-OF-REPOSE TALUS COLLAPSE
          // If the cut exceeds critical repose angle, collapse side banks into V-valley
          if (talusRelax) {
            relaxTalus(h, N, voxel, Math.round(gx), Math.round(gy), 1.15);
          }
        }
      }

      // Kinematics update
      speed = Math.sqrt(Math.max(0.01, speed * speed * 0.95 + (-dh) * gravity * 0.22));
      speed = Math.min(speed, 5.0); // terminal velocity clamp
      water *= (1 - evaporation);

      gx = nextGx;
      gy = nextGy;

      if (water < 0.05) break;
    }

    if (yieldControl && (p % batchSize === 0 || p === particles - 1)) {
      await yieldControl(p + 1, particles);
    }
  }

  return { carvedM3: carvedTotal, depositedM3: depositedTotal };
}

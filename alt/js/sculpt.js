/* ============================================================
 * Frontier · SDF Terrain Lab — Interactive 3D SDF Sculpting
 *
 * Professional volumetric sculpting on the signed-distance
 * surface h[j * N + i]:
 *
 *   1. RIDGE / RAISE  — Builds ridges and peaks along the stroke
 *   2. DENT / CARVE   — Carves valleys and canyons with cushioned bedrock floor
 *   3. SMOOTH         — Local Laplacian relaxation (removes spikes / softens)
 *   4. FLATTEN        — Plateau / mesa tool (levels toward initial stroke height)
 *   5. ROCK CHISEL    — Displaces SDF with 3D fractal rock noise / crevices
 *   6. TALUS COLLAPSE — Relaxes over-steep local slopes to angle of repose
 *
 * Features:
 *   · Stroke spacing & sub-voxel interpolation: smoothly connects dragged dabs
 *   · Volumetric feel: Hermite cubic, sharp linear, or flat round falloffs
 *   · Soft bedrock floor clamping: prevents punching holes into infinity
 *   · Real-time accumulation into erosion & deposition splat maps
 * ============================================================ */

import { Perlin2D, subseed, fbm01 } from './noise.js';

export const SCULPT_TOOLS = {
  ridge:   { id: 'ridge',   name: 'Ridge / Raise',  desc: 'Build ridges and mountain massifs along stroke', key: '2', color: '#4ade80' },
  dent:    { id: 'dent',    name: 'Dent / Carve',   desc: 'Carve valleys, canyons and gullies into the SDF', key: '3', color: '#f87171' },
  smooth:  { id: 'smooth',  name: 'Smooth',         desc: 'Smooth out local roughness and sharp rills',     key: '4', color: '#38bdf8' },
  flatten: { id: 'flatten', name: 'Flatten / Mesa', desc: 'Flatten terrain toward the initial stroke height',key: '5', color: '#fbbf24' },
  chisel:  { id: 'chisel',  name: 'Rock Chisel',    desc: 'Stamp organic rocky micro-facets and crevices',  key: '6', color: '#c084fc' },
  talus:   { id: 'talus',   name: 'Talus Collapse', desc: 'Relax over-steep slopes toward angle of repose', key: '7', color: '#f59e0b' },
};

/**
 * Calculates radial falloff weight at distance `dist` within radius `radius`.
 * @param {number} dist
 * @param {number} radius
 * @param {string|number} falloffType 'smooth' | 'sharp' | 'flat'
 */
export function calcBrushWeight(dist, radius, falloffType = 'smooth') {
  if (dist >= radius) return 0;
  const r = dist / radius;
  if (falloffType === 'sharp') {
    // Linear cone falloff: (1 - r)
    return Math.max(0, 1 - r);
  } else if (falloffType === 'flat') {
    // Flat top with steep edge: (1 - r^4)
    const r2 = r * r;
    return Math.max(0, 1 - r2 * r2);
  }
  // Smooth cubic Hermite falloff (default): (1 - r^2)^2
  const w = Math.max(0, 1 - r * r);
  return w * w;
}

/**
 * Applies a single sculpt brush dab at world coordinates (cx, cz).
 *
 * @param {object} cfg
 * @returns {number} Count of modified vertices
 */
export function applySculptDab({
  h,
  baseH = null,
  N,
  voxel,
  cx,
  cz,
  tool = 'ridge',
  radius = 6.0,
  strength = 0.35,
  falloff = 'smooth',
  targetH = 0,
  seed = 42,
  bedrock = -40,
  erosionMap = null,
  depositMap = null,
}) {
  const c2 = (N - 1) / 2;
  const gx = cx / voxel + c2;
  const gz = cz / voxel + c2;

  const gridRadius = Math.max(1.5, radius / voxel);
  const minI = Math.max(0, Math.floor(gx - gridRadius));
  const maxI = Math.min(N - 1, Math.ceil(gx + gridRadius));
  const minJ = Math.max(0, Math.floor(gz - gridRadius));
  const maxJ = Math.min(N - 1, Math.ceil(gz + gridRadius));

  const maxDepthCarve = voxel * 1.6;

  let noiseGen = null;
  if (tool === 'chisel') {
    noiseGen = new Perlin2D(subseed((seed ^ 0x7a31) >>> 0, 19));
  }

  // Pre-copy local region for smooth or talus tools
  let localCopy = null;
  const pitch = maxI - minI + 3;
  if (tool === 'smooth' || tool === 'talus') {
    localCopy = new Float32Array((maxJ - minJ + 3) * pitch);
    for (let j = Math.max(0, minJ - 1); j <= Math.min(N - 1, maxJ + 1); j++) {
      for (let i = Math.max(0, minI - 1); i <= Math.min(N - 1, maxI + 1); i++) {
        const localIdx = (j - minJ + 1) * pitch + (i - minI + 1);
        localCopy[localIdx] = h[j * N + i];
      }
    }
  }

  let modifiedCount = 0;

  for (let j = minJ; j <= maxJ; j++) {
    const dz = (j - gz) * voxel;
    for (let i = minI; i <= maxI; i++) {
      const dx = (i - gx) * voxel;
      const dist = Math.hypot(dx, dz);
      if (dist >= radius) continue;

      const idx = j * N + i;
      const curH = h[idx];
      const weight = calcBrushWeight(dist, radius, falloff);
      if (weight <= 1e-6) continue;

      let delta = 0;

      if (tool === 'ridge') {
        // Raise SDF: smooth natural dome / spur buildup
        const raiseMax = radius * 0.45 * strength;
        delta = raiseMax * weight * 0.32;
      } else if (tool === 'dent') {
        // Carve SDF: controlled trench carving with soft bedrock cushion
        const carveMax = Math.min(maxDepthCarve, radius * 0.40 * strength);
        const cushion = Math.max(0, curH - (bedrock + 1.0));
        delta = -Math.min(carveMax * weight * 0.32, cushion);
      } else if (tool === 'smooth') {
        // Local Laplacian relaxation
        const li = i - minI + 1;
        const lj = j - minJ + 1;
        const cVal = localCopy[lj * pitch + li];
        const nN = localCopy[(lj - 1) * pitch + li];
        const nS = localCopy[(lj + 1) * pitch + li];
        const nW = localCopy[lj * pitch + (li - 1)];
        const nE = localCopy[lj * pitch + (li + 1)];
        const lap = (nN + nS + nW + nE - 4 * cVal) * 0.25;
        delta = lap * strength * weight * 0.85;
      } else if (tool === 'flatten') {
        // Drive towards clicked target elevation
        const diff = targetH - curH;
        delta = diff * strength * weight * 0.40;
      } else if (tool === 'chisel') {
        // Organic rocky displacement with high-frequency micro details
        const wx = (i - c2) * voxel;
        const wz = (j - c2) * voxel;
        const n1 = fbm01(noiseGen, wx * 0.4 + 11.2, wz * 0.4 - 7.8, { octaves: 3, lacunarity: 2.2, gain: 0.5 }) - 0.5;
        const n2 = fbm01(noiseGen, wx * 0.9 - 19.4, wz * 0.9 + 23.1, { octaves: 2, lacunarity: 2.4, gain: 0.55 }) - 0.5;
        const disp = (n1 * 1.8 + n2 * 0.9) * radius * 0.22 * strength;
        delta = disp * weight;
      } else if (tool === 'talus') {
        // Angle-of-repose relaxation inside brush
        const li = i - minI + 1;
        const lj = j - minJ + 1;
        const cVal = localCopy[lj * pitch + li];
        const maxDrop = 1.15 * voxel;
        let sumSlump = 0;
        const nbs = [
          [li + 1, lj, 1], [li - 1, lj, 1], [li, lj + 1, 1], [li, lj - 1, 1],
          [li + 1, lj + 1, 1.414], [li - 1, lj - 1, 1.414], [li + 1, lj - 1, 1.414], [li - 1, lj + 1, 1.414]
        ];
        for (let k = 0; k < nbs.length; k++) {
          const ni = nbs[k][0], nj = nbs[k][1], distM = nbs[k][2];
          const nH = localCopy[nj * pitch + ni];
          const diff = nH - cVal;
          const thresh = maxDrop * distM;
          if (diff > thresh) {
            sumSlump += (diff - thresh) * 0.25;
          }
        }
        delta = sumSlump * strength * weight;
      }

      if (Math.abs(delta) > 1e-7) {
        h[idx] = curH + delta;
        modifiedCount++;

        if (delta > 0 && depositMap) {
          depositMap[idx] += delta * 0.28;
        } else if (delta < 0 && erosionMap) {
          erosionMap[idx] += -delta * 0.28;
        }
      }
    }
  }

  return modifiedCount;
}

/**
 * Interpolates a stroke line between two points and stamps overlapping dabs.
 */
export function applySculptStroke({
  h,
  baseH,
  N,
  voxel,
  p0,
  p1,
  tool,
  radius,
  strength,
  falloff,
  targetH,
  seed,
  bedrock,
  erosionMap,
  depositMap,
}) {
  const dist = Math.hypot(p1.x - p0.x, p1.z - p0.z);
  const step = Math.max(voxel * 0.45, radius * 0.22);
  const steps = Math.max(1, Math.ceil(dist / step));

  let totalModified = 0;
  for (let s = 1; s <= steps; s++) {
    const t = s / steps;
    const cx = p0.x + (p1.x - p0.x) * t;
    const cz = p0.z + (p1.z - p0.z) * t;
    totalModified += applySculptDab({
      h, baseH, N, voxel, cx, cz, tool, radius, strength, falloff, targetH, seed,
      bedrock, erosionMap, depositMap,
    });
  }
  return totalModified;
}

// Frontier terrain — heightfield with city flat, countryside, hills, river + lake carves, brush edits.
import { clamp, lerp, fbm, pointToSegment } from './geometry.js';

export const WORLD_SIZE = 1200; // meters, centered at origin
export const WATER_LEVEL_DEFAULT = 1.25;

// Lake definitions (base terrain bowls)
export const LAKES = [
  { x: 285, z: 430, r: 105, depth: 4.5 },   // Lake Serene (SE)
  { x: -470, z: -420, r: 55, depth: 3.2 },  // tarn NW countryside
];

function baseHeightRaw(x, z) {
  // Rolling base
  let h = 4.2 + (fbm(x * 0.004 + 7.3, z * 0.004 + 2.1, 4) - 0.5) * 7.0;
  h += (fbm(x * 0.016, z * 0.016, 3) - 0.5) * 1.6;
  // East offroad hills rise
  const eastT = clamp((x - 380) / 220, 0, 1);
  h += eastT * eastT * 26 * (0.65 + 0.7 * fbm(x * 0.006, z * 0.006, 3));
  // North ridge gentle
  const northT = clamp((-z - 380) / 220, 0, 1);
  h += northT * northT * 12;
  // West countryside flatten toward farmland
  const westT = clamp((-x - 250) / 350, 0, 1);
  h = lerp(h, 3.6 + (fbm(x * 0.01, z * 0.01, 2) - 0.5) * 1.2, westT * 0.85);
  // City pad flatten (downtown + inner suburbs)
  const cityD = Math.max(Math.abs(x), Math.abs(z)); // square pad
  if (cityD < 300) {
    const t = 1 - clamp((cityD - 180) / 120, 0, 1);
    const pad = 3.4 + (fbm(x * 0.02, z * 0.02, 2) - 0.5) * 0.5;
    h = lerp(h, pad, t * t * 0.96);
  }
  // South suburb gentle
  if (z > 240 && z < 560 && Math.abs(x) < 320) {
    h = lerp(h, 3.8, 0.7);
  }
  return h;
}

function lakeCarve(x, z) {
  let cut = 0;
  for (const L of LAKES) {
    const d = Math.hypot(x - L.x, z - L.z);
    if (d < L.r * 1.25) {
      const t = clamp(1 - d / (L.r * 1.25), 0, 1);
      const s = t * t * (3 - 2 * t);
      cut = Math.max(cut, s * (L.depth + 4.0));
    }
  }
  return cut;
}

// River polyline distance carve. Rivers stored in project.rivers [{points,width,depth}]
export function riverCarveAt(project, x, z) {
  let cut = 0, minD = 1e9;
  const rivers = project?.rivers || [];
  for (const r of rivers) {
    const pts = r.points || [];
    for (let i = 0; i < pts.length - 1; i++) {
      const q = pointToSegment(x, z, pts[i].x, pts[i].z, pts[i + 1].x, pts[i + 1].z);
      minD = Math.min(minD, q.d);
      const w = (r.width || 16) / 2;
      if (q.d < w * 2.2) {
        const t = clamp(1 - q.d / (w * 2.2), 0, 1);
        const s = t * t * (3 - 2 * t);
        cut = Math.max(cut, s * ((r.depth || 3.2) + 3.4));
      }
    }
  }
  return { cut, dist: minD };
}

export function brushCarveAt(project, x, z) {
  let delta = 0;
  const edits = project?.terrainEdits || [];
  for (const e of edits) {
    const d = Math.hypot(x - e.x, z - e.z);
    if (d < e.radius) {
      const t = 1 - d / e.radius;
      const s = t * t * (3 - 2 * t);
      if (e.type === 'water') {
        // carve down toward below water
        delta += -s * (e.strength || 6);
      } else {
        delta += s * (e.delta || 0);
      }
    }
  }
  return delta;
}

// Raw terrain (no roads) — used for road heights + base mesh
export function rawTerrainHeight(project, x, z) {
  let h = baseHeightRaw(x, z);
  h -= lakeCarve(x, z);
  h -= riverCarveAt(project, x, z).cut;
  h += brushCarveAt(project, x, z);
  return h;
}

export function waterLevel(project) {
  return project?.settings?.waterLevel ?? WATER_LEVEL_DEFAULT;
}

// Road corridor stamping: flatten terrain toward road height near ground roads.
// roadSamples: [{x,z,y,hw}] dense samples with target height + half width
export function stampRoadsToGrid(project, grid, N, roadSamples) {
  const S = WORLD_SIZE, half = S / 2;
  const cell = S / (N - 1);
  // For each sample, stamp a disc
  for (const s of roadSamples) {
    if (s.bridge) continue; // bridges don't touch terrain
    const gx = (s.x + half) / cell, gz = (s.z + half) / cell;
    const radiusM = (s.hw || 6) + 3.5;
    const radiusC = radiusM / cell;
    const r = Math.ceil(radiusC);
    const cx = Math.round(gx), cz = Math.round(gz);
    for (let j = cz - r; j <= cz + r; j++) {
      if (j < 0 || j >= N) continue;
      for (let i = cx - r; i <= cx + r; i++) {
        if (i < 0 || i >= N) continue;
        const wx = -half + i * cell, wz = -half + j * cell;
        const d = Math.hypot(wx - s.x, wz - s.z);
        if (d > radiusM) continue;
        const idx = j * N + i;
        const inner = (s.hw || 6) + 0.6;
        let target;
        let t;
        if (d <= inner) { target = s.y - 0.12; t = 1; }
        else {
          const k = 1 - (d - inner) / Math.max(0.001, radiusM - inner);
          const sm = k * k * (3 - 2 * k);
          target = lerp(grid[idx], s.y - 0.12, sm * 0.9);
          t = sm;
        }
        if (t >= 0.999) grid[idx] = target;
        else grid[idx] = lerp(grid[idx], target, t);
      }
    }
  }
}

export function buildHeightGrid(project, N, roadSamples = []) {
  const S = WORLD_SIZE, half = S / 2;
  const grid = new Float32Array(N * N);
  for (let j = 0; j < N; j++) {
    const z = -half + (j / (N - 1)) * S;
    for (let i = 0; i < N; i++) {
      const x = -half + (i / (N - 1)) * S;
      grid[j * N + i] = rawTerrainHeight(project, x, z);
    }
  }
  if (roadSamples.length && project?.settings?.followTerrain !== false) {
    stampRoadsToGrid(project, grid, N, roadSamples);
  }
  return grid;
}

export function sampleGridBilinear(grid, N, x, z) {
  const S = WORLD_SIZE, half = S / 2;
  const fx = clamp((x + half) / S * (N - 1), 0, N - 1.001);
  const fz = clamp((z + half) / S * (N - 1), 0, N - 1.001);
  const ix = Math.floor(fx), iz = Math.floor(fz);
  const tx = fx - ix, tz = fz - iz;
  const a = grid[iz * N + ix];
  const b = grid[iz * N + Math.min(N - 1, ix + 1)];
  const c = grid[Math.min(N - 1, iz + 1) * N + ix];
  const d = grid[Math.min(N - 1, iz + 1) * N + Math.min(N - 1, ix + 1)];
  return lerp(lerp(a, b, tx), lerp(c, d, tx), tz);
}

// Terrain color ramp for 2D + 3D vertex colors
export function terrainColor(h, wl, slope = 0, x = 0, z = 0) {
  // returns [r,g,b] 0..1
  if (h < wl - 0.9) return [0.16, 0.32, 0.42]; // lakebed
  if (h < wl + 0.25) return [0.76, 0.72, 0.55]; // sand
  const cityD = Math.max(Math.abs(x), Math.abs(z));
  if (cityD < 265 && h > wl) {
    // urban ground — warm gray with subtle variation
    const v = 0.52 + (fbm(x * 0.05, z * 0.05, 2) - 0.5) * 0.06;
    return [v, v * 0.99, v * 0.94];
  }
  if (slope > 0.55) return [0.45, 0.42, 0.38]; // rock
  if (h > 16) {
    const t = clamp((h - 16) / 14, 0, 1);
    return [lerp(0.36, 0.55, t), lerp(0.5, 0.53, t), lerp(0.3, 0.5, t)];
  }
  // grass with patchiness
  const n = fbm(x * 0.02 + 3, z * 0.02, 3);
  const g = 0.42 + n * 0.22;
  // farmland stripes west
  if (x < -300 && Math.abs(z) < 520) {
    const stripe = Math.floor((z + 600) / 46) % 2;
    if (stripe === 0) return [0.5, 0.55, 0.3];
    return [0.42, 0.5, 0.28];
  }
  return [0.3 + n * 0.12, g, 0.26 + n * 0.08];
}

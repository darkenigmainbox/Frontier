// Frontier procedural dressing — block buildings + low-poly trees, kept clear of roads/water.
import { hashNoise, pointToSegment } from './geometry.js';
import { rawTerrainHeight, waterLevel, WORLD_SIZE } from './terrain.js';
import { roadPoints } from './topology.js';
import { asphaltHalfWidth, getPreset } from './presets.js';

// Collect road polylines for clearance tests
function roadSegs(project) {
  const segs = [];
  for (const r of project.roads) {
    const p = getPreset(r.presetId);
    const hw = asphaltHalfWidth(p) + 3;
    const pts = roadPoints(project, r);
    for (let i = 0; i < pts.length - 1; i++) segs.push({ a: pts[i], b: pts[i + 1], hw });
  }
  for (const r of project.rails) {
    const pts = r.nodeIds.map((id) => project.nodes[id]).filter(Boolean);
    const hw = r.kind === 'monorail' ? 4 : 7;
    for (let i = 0; i < pts.length - 1; i++) segs.push({ a: pts[i], b: pts[i + 1], hw });
  }
  for (const rb of project.roundabouts || []) {
    segs.push({ circle: rb, hw: rb.radius + 3 });
  }
  return segs;
}

function clearOfRoads(segs, x, z, margin = 2) {
  for (const s of segs) {
    if (s.circle) {
      if (Math.hypot(x - s.circle.x, z - s.circle.z) < s.hw + margin) return false;
    } else {
      const q = pointToSegment(x, z, s.a.x, s.a.z, s.b.x, s.b.z);
      if (q.d < s.hw + margin) return false;
    }
  }
  return true;
}

const PALETTES = {
  downtown: ['#8b93a1', '#a8b0bd', '#7d8ca3', '#b9c2cf', '#93a3b8', '#6f7d95'],
  residential: ['#c9b18a', '#b7c0c9', '#d0c7b4', '#b98d6e', '#a8b5a0', '#c4a49a'],
  farm: ['#a8442f', '#c9c2b4', '#8a6b45', '#7a7f85'],
  lake: ['#9fb6c4', '#c2b49a', '#8fa39b'],
};

function pick(arr, n) { return arr[Math.floor(n * arr.length) % arr.length]; }

export function generateDressing(project, opts = {}) {
  const seed = opts.seed ?? 7;
  const wl = waterLevel(project);
  const segs = roadSegs(project);
  const buildings = [];
  const trees = [];
  const rand = (i, k = 0) => hashNoise(i * 12.9898 + seed * 78.233 + k * 37.7, k * 11.3 + seed * 3.1);

  // --- downtown towers: blocks inside grid ---
  let bi = 0;
  const gridStep = 70;
  for (let gx = -2; gx <= 2; gx++) {
    for (let gz = -2; gz <= 2; gz++) {
      if (gx === 0 && gz === 0) continue; // central park
      const bx = gx * gridStep, bz = gz * gridStep;
      const lots = 1 + Math.floor(rand(bi, 1) * 3);
      for (let l = 0; l < lots; l++) {
        const ox = (rand(bi, 10 + l) - 0.5) * 34, oz = (rand(bi, 20 + l) - 0.5) * 34;
        const x = bx + ox, z = bz + oz;
        if (!clearOfRoads(segs, x, z, 4)) continue;
        const h = rawTerrainHeight(project, x, z);
        if (h < wl + 0.4) continue;
        const distC = Math.hypot(gx, gz);
        const tall = distC < 1.6;
        const w = tall ? 14 + rand(bi, 30) * 10 : 9 + rand(bi, 31) * 8;
        const d = tall ? 14 + rand(bi, 32) * 10 : 9 + rand(bi, 33) * 8;
        const bh = tall ? 30 + rand(bi, 34) * 55 : 8 + rand(bi, 35) * 14;
        buildings.push({ x, z, w, d, h: bh, rot: (rand(bi, 36) > 0.7 ? Math.PI / 4 : 0) + (Math.abs(ox) > 2 ? 0 : 0), color: pick(PALETTES.downtown, rand(bi, 37)), type: tall ? 'tower' : 'block', windows: true });
        bi++;
      }
    }
  }
  // --- residential houses south ---
  for (let i = 0; i < 220; i++) {
    const x = -300 + rand(i, 101) * 520;
    const z = 265 + rand(i, 102) * 260;
    if (!clearOfRoads(segs, x, z, 5)) continue;
    const h = rawTerrainHeight(project, x, z);
    if (h < wl + 0.4) continue;
    buildings.push({ x, z, w: 7 + rand(i, 103) * 5, d: 6 + rand(i, 104) * 5, h: 3.5 + rand(i, 105) * 3.5, rot: Math.floor(rand(i, 106) * 4) * Math.PI / 2 + (rand(i, 107) - 0.5) * 0.2, color: pick(PALETTES.residential, rand(i, 108)), type: 'house', windows: true });
  }
  // --- countryside farms west ---
  const farmSpots = [[-460, -180], [-520, 60], [-420, 260], [-500, -380], [-360, -320], [-380, 120]];
  for (let f = 0; f < farmSpots.length; f++) {
    const [fx, fz] = farmSpots[f];
    for (let k = 0; k < 4; k++) {
      const x = fx + (rand(f * 10 + k, 120) - 0.5) * 60, z = fz + (rand(f * 10 + k, 121) - 0.5) * 60;
      if (!clearOfRoads(segs, x, z, 6)) continue;
      const h = rawTerrainHeight(project, x, z);
      if (h < wl + 0.4) continue;
      buildings.push({ x, z, w: 10 + rand(k, 122 + f) * 10, d: 8 + rand(k, 123 + f) * 8, h: 5 + rand(k, 124) * 4, rot: rand(k, 125) * Math.PI, color: pick(PALETTES.farm, rand(k, 126 + f)), type: 'barn', windows: false });
    }
  }
  // --- lakeside cabins ---
  for (let i = 0; i < 26; i++) {
    const a = rand(i, 140) * Math.PI * 2;
    const r = 125 + rand(i, 141) * 55;
    const x = 285 + Math.cos(a) * r, z = 430 + Math.sin(a) * r * 0.9;
    if (!clearOfRoads(segs, x, z, 4)) continue;
    const h = rawTerrainHeight(project, x, z);
    if (h < wl + 0.5 || h > wl + 9) continue;
    buildings.push({ x, z, w: 6 + rand(i, 142) * 4, d: 5 + rand(i, 143) * 4, h: 3.2 + rand(i, 144) * 2.4, rot: rand(i, 145) * Math.PI, color: pick(PALETTES.lake, rand(i, 146)), type: 'cabin', windows: true });
  }
  // manual buildings
  for (const b of project.buildingsManual || []) buildings.push(b);

  // --- trees ---
  // central park grove
  for (let i = 0; i < 90; i++) {
    const x = (rand(i, 200) - 0.5) * 56, z = (rand(i, 201) - 0.5) * 56;
    if (!clearOfRoads(segs, x, z, 2)) continue;
    trees.push({ x, z, s: 0.8 + rand(i, 202) * 0.7, park: true });
  }
  // roadside rows along arterials (sample roads, offset)
  let ti = 1000;
  for (const r of project.roads) {
    const p = getPreset(r.presetId);
    if (!(p.sidewalkL || p.cat === 'urban')) continue;
    const pts = roadPoints(project, r);
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const len = Math.hypot(b.x - a.x, b.z - a.z);
      const steps = Math.floor(len / 14);
      for (let k = 1; k < steps; k++) {
        const t = k / steps;
        const x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
        const dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz) || 1;
        for (const side of [1, -1]) {
          if (rand(ti, 1) < 0.35) { ti++; continue; }
          const hw = asphaltHalfWidth(p) + 4.5 + rand(ti, 2) * 2;
          const tx = x + (-dz / l) * side * hw, tz = z + (dx / l) * side * hw;
          const h = rawTerrainHeight(project, tx, tz);
          if (h < wl + 0.4) { ti++; continue; }
          if (!clearOfRoads(segs, tx, tz, 0.5)) { ti++; continue; }
          trees.push({ x: tx, z: tz, s: 0.75 + rand(ti, 3) * 0.5 });
          ti++;
        }
      }
    }
  }
  // forests: west + east hills + north
  for (let i = 0; i < 2600; i++) {
    const zone = rand(i, 300);
    let x, z;
    if (zone < 0.4) { x = -600 + rand(i, 301) * 260; z = -560 + rand(i, 302) * 1120; } // west
    else if (zone < 0.75) { x = 400 + rand(i, 303) * 200; z = -560 + rand(i, 304) * 1120; } // east hills
    else { x = -300 + rand(i, 305) * 700; z = -600 + rand(i, 306) * 180; } // north
    const h = rawTerrainHeight(project, x, z);
    if (h < wl + 0.5) continue;
    if (!clearOfRoads(segs, x, z, 1.5)) continue;
    // density noise
    if (hashNoise(x * 0.02, z * 0.02 + seed) < 0.35) continue;
    trees.push({ x, z, s: 0.9 + rand(i, 307) * 1.1 });
    if (trees.length > 3200) break;
  }
  return { buildings, trees };
}

export function hexToArr(hex) {
  const h = hex.replace('#', '');
  const v = parseInt(h, 16);
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
}

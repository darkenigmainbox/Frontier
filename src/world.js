// Frontier world orchestrator — builds every mesh bucket from the project model.
// Shared by the 3D viewport, the 2D preview cache, and the OBJ exporter.
import {
  buckets, bucketStats, sampleRoadWithHeights, splitSpans, buildRoadSpan, buildJunction,
  buildRoundabout, sampleRailWithHeights, buildHeavyRail, buildMonorail, buildCrossings,
  buildTerrainMesh, hexRgb, shade,
} from './meshBuilder.js';
import { getJunctions } from './topology.js';
import { findRailRoadCrossings } from './topology.js';
import { getPreset, asphaltHalfWidth } from './presets.js';
import { buildHeightGrid, rawTerrainHeight, waterLevel } from './terrain.js';
import { generateDressing, hexToArr } from './buildings.js';
import { hashNoise } from './geometry.js';

export function buildWorld(project, opts = {}) {
  const B = buckets();
  const junctions = getJunctions(project);

  // ---- roads ----
  const roadData = [];
  for (const road of project.roads) {
    const preset = getPreset(road.presetId);
    const samples = sampleRoadWithHeights(project, road, opts.roadStep ?? 2.2);
    if (samples.length < 2) continue;
    const spans = splitSpans(samples, junctions, road.id);
    for (const span of spans) buildRoadSpan(B, project, road, preset, span, junctions);
    roadData.push({ road, preset, samples, spans });
  }
  const samplesByRoad = new Map();
  for (const rd of roadData) samplesByRoad.set(rd.road.id, rd.samples);
  for (const j of junctions) buildJunction(B, project, j, samplesByRoad);
  for (const rb of project.roundabouts || []) buildRoundabout(B, project, rb);

  // ---- rails ----
  const railData = [];
  for (const rail of project.rails || []) {
    const samples = sampleRailWithHeights(project, rail, 2.5);
    if (samples.length < 2) continue;
    if (rail.kind === 'monorail') buildMonorail(B, project, rail, samples);
    else buildHeavyRail(B, project, rail, samples);
    railData.push({ rail, samples });
  }
  const crossings = findRailRoadCrossings(project);
  buildCrossings(B, project, crossings);

  // ---- terrain (roads carve / embank) ----
  const N = opts.terrainN ?? 140;
  const stamps = [];
  for (const { preset, samples } of roadData) {
    const hw = asphaltHalfWidth(preset);
    for (let i = 0; i < samples.length; i += 2) {
      const s = samples[i];
      stamps.push({ x: s.x, z: s.z, y: s.y, hw, bridge: s.bridge });
    }
  }
  for (const { rail, samples } of railData) {
    if (rail.kind !== 'rail') continue;
    const hw = (getPreset(rail.presetId).ballastWidth || 8) / 2;
    for (let i = 0; i < samples.length; i += 3) {
      const s = samples[i];
      stamps.push({ x: s.x, z: s.z, y: s.y - 0.3, hw, bridge: s.bridge });
    }
  }
  const grid = buildHeightGrid(project, N, stamps);
  buildTerrainMesh(B, project, grid, N);

  // ---- dressing ----
  const dressing = generateDressing(project);
  buildDressingMeshes(B, project, dressing);

  const stats = bucketStats(B);
  return { buckets: B, roadData, railData, junctions, crossings, grid, terrainN: N, dressing, stats };
}

function buildDressingMeshes(B, project, dressing) {
  const wl = waterLevel(project);
  let i = 0;
  for (const b of dressing.buildings) {
    const g = rawTerrainHeight(project, b.x, b.z);
    if (g < wl + 0.2) continue;
    const base = Math.min(g, g) - 0.4;
    const c = hexToArr(b.color || '#9aa0a8');
    const yaw = b.rot || 0;
    B.building.addBox(b.x, base, b.z, b.w, b.h, b.d, c, yaw);
    // roof
    if (b.type === 'house' || b.type === 'cabin' || b.type === 'barn') {
      B.building.addBox(b.x, base + b.h, b.z, b.w * 0.72, b.h * 0.32, b.d * 0.72, shade(c, 0.55), yaw);
      B.building.addBox(b.x, base + b.h + b.h * 0.32, b.z, b.w * 0.4, b.h * 0.2, b.d * 0.4, shade(c, 0.45), yaw);
      if (b.type === 'barn') B.building.addBox(b.x + b.w * 0.2, base + b.h * 0.4, b.z, 0.3, b.h * 0.6, 2.2, [0.9, 0.9, 0.9], yaw);
    } else {
      // flat roof slab + parapet
      B.building.addBox(b.x, base + b.h, b.z, b.w * 1.02, 0.5, b.d * 1.02, shade(c, 0.5), yaw);
      if (b.h > 18) B.building.addBox(b.x, base + b.h + 0.5, b.z, b.w * 0.3, 2.6, b.d * 0.3, shade(c, 0.65), yaw);
    }
    // window bands (towers/blocks)
    if (b.windows && b.h > 6) {
      const floors = Math.floor((b.h - 2) / 3.2);
      const winC = [0.75, 0.85, 0.92];
      for (let f = 0; f < floors; f++) {
        const wy = base + 2.2 + f * 3.2;
        B.building.addBox(b.x, wy, b.z, b.w + 0.12, 0.95, b.d + 0.12, winC, yaw);
      }
    } else if (b.windows) {
      B.building.addBox(b.x, base + 1.6, b.z, b.w + 0.1, 0.8, b.d + 0.1, [0.78, 0.86, 0.9], yaw);
    }
    i++;
    if (i > 900) break;
  }
  let t = 0;
  for (const tr of dressing.trees) {
    const g = rawTerrainHeight(project, tr.x, tr.z);
    if (g < wl + 0.25) continue;
    const s = tr.s || 1;
    const v = hashNoise(tr.x * 0.5, tr.z * 0.5);
    const leaf = [0.22 + v * 0.12, 0.42 + v * 0.14, 0.2 + v * 0.08];
    B.trunk.addBox(tr.x, g - 0.2, tr.z, 0.4 * s, 1.7 * s, 0.4 * s, [0.4, 0.3, 0.2]);
    B.leaf.addBox(tr.x, g + 1.1 * s, tr.z, 2.1 * s, 1.5 * s, 2.1 * s, leaf, v * 0.6);
    B.leaf.addBox(tr.x, g + 2.2 * s, tr.z, 1.3 * s, 1.0 * s, 1.3 * s, shade(leaf, 1.08), v);
    t++;
    if (t > 2600) break;
  }
}

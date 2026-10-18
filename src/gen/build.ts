// ─── World build pipeline: terrain → water carving → roads → rails → city ────

import { type Pt } from '../core/math.ts';
import { roadWidth } from '../core/presets.ts';
import type { Building, Lake, Project, RailStroke, RiverStroke, RoadStroke, Tree } from '../core/types.ts';
import { MeshBuilder } from './mesh.ts';
import { HeightField } from './terrain.ts';
import {
  buildRoadNetwork, planStroke, type RiverInfo, type RoadBuildCtx, type RoadBuildResult, type StrokePlan,
} from './roads.ts';
import { buildRails, carveRailCorridors, type RailBuildResult, type RailPlan } from './rails.ts';
import { buildWater } from './water.ts';
import { buildBuildings, buildTrees } from './city.ts';

export interface WorldBuild {
  terrain: HeightField;
  roads: RoadBuildResult;
  rails: RailBuildResult;
  water: MeshBuilder;
  buildings: MeshBuilder;
  treeTrunks: MeshBuilder;
  treeLeaves: MeshBuilder;
  rivers: RiverInfo[];
  elapsedMs: number;
}

export function buildWorld(project: Project): WorldBuild {
  const t0 = performance.now();
  const terrain = new HeightField(project.terrain);
  const waterLevel = project.water.level;

  const lakes: Lake[] = project.water.lakes;
  const rivers: RiverInfo[] = [];
  for (const s of project.strokes) {
    if (s.kind === 'river') {
      const r = s as RiverStroke;
      rivers.push({ pts: r.points.map((p) => ({ x: p.x, y: p.z })), width: r.width });
    }
  }

  // 1. carve water bodies into terrain
  for (const lake of lakes) terrain.carveLake(lake, waterLevel, 7);
  for (const r of rivers) terrain.carveRiver(r.pts, r.width, waterLevel, 3.2);

  const ctx: RoadBuildCtx = {
    terrain,
    lakes,
    rivers,
    waterLevel,
    autoBridge: project.settings.autoBridge,
  };

  // 2. plan road deck heights, carve corridors, then emit meshes
  const roadStrokes = project.strokes.filter((s): s is RoadStroke => s.kind === 'road');
  const railStrokes = project.strokes.filter((s): s is RailStroke => s.kind === 'rail');
  const roadPlans = new Map<string, StrokePlan>();
  for (const st of roadStrokes) roadPlans.set(st.id, planStroke(st, ctx));

  for (const plan of roadPlans.values()) {
    const preset = plan.preset;
    const half = roadWidth(preset) / 2 + (preset.pavement?.width ?? 0) + 1.2;
    terrain.carveCorridor(plan.pts, half, 14, (t) => {
      const i = Math.max(0, Math.min(plan.y.length - 1, Math.round(t * (plan.y.length - 1))));
      // bridge spans leave the ground/water untouched so piers and water read correctly
      if (plan.bridge[i] === 1) return null;
      return plan.y[i] - 0.12;
    });
  }

  const roads = buildRoadNetwork(roadStrokes, ctx, roadPlans);

  // 3. rails (monorail can rise above roads) + rail bed carving
  const railPlans = new Map<string, RailPlan>();
  // buildRails plans internally; carve afterwards via carveRailCorridors
  const rails = buildRails(railStrokes, ctx, roads.plans, railPlans);
  carveRailCorridors(rails.plans, terrain);

  terrain.autoPaint(waterLevel);

  // 4. water surfaces, buildings, trees
  const water = buildWater(lakes, rivers, waterLevel);
  const buildings = buildBuildings(project.buildings as Building[], terrain);
  const { trunks, leaves } = buildTrees(project.trees as Tree[], terrain);

  return {
    terrain,
    roads,
    rails,
    water,
    buildings,
    treeTrunks: trunks,
    treeLeaves: leaves,
    rivers,
    elapsedMs: performance.now() - t0,
  };
}

export type { Pt };

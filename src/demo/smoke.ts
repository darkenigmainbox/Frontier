// ─── Headless smoke test for the geometry pipeline (node --experimental-strip-types) ─
declare const process: { exitCode?: number };
import { createDemoProject } from './demo.ts';
import { buildWorld } from '../gen/build.ts';
import { roadWidth, totalHalfWidth, getRoadPreset } from '../core/presets.ts';

function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error('✗ FAIL:', msg);
    process.exitCode = 1;
  } else {
    console.log('✓', msg);
  }
}

const p = createDemoProject();
console.log(`Project: ${p.name}`);
console.log(`  strokes=${p.strokes.length} buildings=${p.buildings.length} trees=${p.trees.length} lakes=${p.water.lakes.length} edits=${p.terrain.edits.length}`);

const t0 = Date.now();
const world = buildWorld(p);
const ms = Date.now() - t0;
console.log(`Built in ${ms} ms`);
console.log(`  road surface verts=${world.roads.surface.vertexCount}`);
console.log(`  markings verts=${world.roads.markings.vertexCount}`);
console.log(`  pavement verts=${world.roads.pavement.vertexCount}`);
console.log(`  curb verts=${world.roads.curb.vertexCount}`);
console.log(`  bridge verts=${world.roads.bridge.vertexCount}`);
console.log(`  junctions=${world.roads.junctions.length}`);
console.log(`  rail ballast verts=${world.rails.ballast.vertexCount} monorail=${world.rails.monorail.vertexCount}`);
console.log(`  level crossings=${world.rails.crossings.length}`);
console.log(`  water verts=${world.water.vertexCount} buildings=${world.buildings.vertexCount} trees=${world.treeTrunks.vertexCount + world.treeLeaves.vertexCount}`);

assert(world.roads.surface.vertexCount > 5000, 'road surface has geometry');
assert(world.roads.markings.vertexCount > 2000, 'lane markings generated');
assert(world.roads.pavement.vertexCount > 2000, 'pavements generated');
assert(world.roads.curb.vertexCount > 800, 'kerbs / ramps generated');
assert(world.roads.bridge.vertexCount > 500, 'bridge furniture generated (river/lake crossings)');
assert(world.roads.junctions.length >= 15, `junction merging found intersections (got ${world.roads.junctions.length})`);
assert(world.rails.ballast.vertexCount > 1000, 'train track generated');
assert(world.rails.monorail.vertexCount > 1000, 'monorail generated');
assert(world.rails.crossings.length >= 2, `level crossings detected (got ${world.rails.crossings.length})`);
assert(world.water.vertexCount > 300, 'water surfaces generated');
assert(world.buildings.vertexCount > 5000, 'buildings generated');
assert(world.treeTrunks.vertexCount > 500, 'trees generated');

// junctions with mixed road types must have arms with differing widths
const mixed = world.roads.junctions.filter((j) => new Set(j.arms.map((a) => a.typeId)).size > 1);
console.log(`  mixed-type junctions=${mixed.length}`);
assert(mixed.length >= 5, 'different road types merge into shared junctions');

// multi-arm junctions
const big = world.roads.junctions.filter((j) => j.arms.length >= 4);
console.log(`  junctions with 4+ arms=${big.length}`);
assert(big.length >= 4, 'crossroads junction patches exist');
const armDist = new Map<number, number>();
for (const j of world.roads.junctions) armDist.set(j.arms.length, (armDist.get(j.arms.length) ?? 0) + 1);
console.log(`  arm-count distribution: ${[...armDist.entries()].sort().map(([k, v]) => `${k}arms×${v}`).join(' ')}`);
const maxArms = Math.max(...world.roads.junctions.map((j) => j.arms.length));
assert(maxArms <= 8, `no junction blob merged too many arms (max ${maxArms})`);
assert((armDist.get(3) ?? 0) >= 3, 'T-junctions (3 arms) exist');
// no two arms at a junction may point in nearly the same direction (would signal
// a duplicated/inverted arm)
let dupArms = 0;
for (const j of world.roads.junctions) {
  for (let a = 0; a < j.arms.length; a++) {
    for (let b = a + 1; b < j.arms.length; b++) {
      const dot = j.arms[a].dirX * j.arms[b].dirX + j.arms[a].dirZ * j.arms[b].dirZ;
      if (dot > 0.97) dupArms++;
    }
  }
}
console.log(`  duplicate-direction arm pairs=${dupArms}`);
assert(dupArms === 0, 'junction arms all point in distinct directions');

// every junction ring is closed & star-shaped-ish
for (const j of world.roads.junctions) {
  if (j.ring.length !== j.arms.length * 2) {
    assert(false, `junction at ${j.x},${j.z} ring size mismatch`);
    break;
  }
}

// sample heights: roads above terrain in water crossings
const lake = p.water.lakes[0];
const riverPlan = [...world.roads.plans.values()].find((s) => s.stroke.id === 'hwy_a1');
assert(!!riverPlan, 'highway planned');
let overWaterCount = 0;
if (riverPlan) {
  for (let i = 0; i < riverPlan.pts.length; i++) {
    if (riverPlan.bridge[i] === 1) overWaterCount++;
  }
}
console.log(`  highway bridge-deck samples=${overWaterCount}`);
assert(overWaterCount > 10, 'highway uses a bridge deck where terrain/water demands it');

// every road that touches the lake must be bridged there
for (const plan of world.roads.plans.values()) {
  for (let i = 0; i < plan.pts.length; i++) {
    const dx = plan.pts[i].x - lake.x, dz = plan.pts[i].y - lake.z;
    if (dx * dx + dz * dz < (lake.radius * 0.85) ** 2 && plan.bridge[i] !== 1) {
      assert(false, `stroke ${plan.stroke.id} runs over the lake without a bridge at sample ${i}`);
      break;
    }
  }
}

// terrain sanity: lake bed below water level
const hCenter = world.terrain.sample(lake.x, lake.z);
console.log(`  lake bed height=${hCenter.toFixed(2)} (water level ${p.water.level})`);
assert(hCenter < p.water.level, 'lake basin is carved below water level');

// lane width helper consistency
const hp = p.strokes.find((s) => s.id === 'hwy_a1')!;
assert(!!hp && hp.kind === 'road' && roadWidth(getRoadPreset(hp.typeId)) > 10, 'preset helpers ok');
void totalHalfWidth;

console.log(process.exitCode ? 'SMOKE FAILED' : 'SMOKE OK');

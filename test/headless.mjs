// Frontier headless verification: node --test or `node test/headless.mjs`.
// Builds a small island, runs all SDF eroders, meshes, and asserts the
// anti-smoothing contract + determinism + curvature sign conventions.

import { Graph, makeNode, buildDefaultGraph } from '../web/js/nodes.js';
import { SDFVolume } from '../web/js/sdf.js';
import { surfaceRoughness } from '../web/js/mesher.js';

let failures = 0;
function check(name, cond, detail = '') {
  console.log((cond ? '  PASS ' : '  FAIL ') + name + (detail ? ' — ' + detail : ''));
  if (!cond) failures++;
}

function testGraph() {
  const g = new Graph();
  const base = makeNode('IslandBase', 0, 0);
  base.params.relief = 380;
  const mtn = makeNode('Mountain', 0, 0);
  const strata = makeNode('Strata', 0, 0);
  const rain = makeNode('RainSDF', 0, 0);
  rain.params.targetDrops = 6000;
  rain.params.rainRate = 12000;
  const wind = makeNode('WindSDF', 0, 0);
  wind.params.targetDrops = 3000;
  const therm = makeNode('ThermalSDF', 0, 0);
  therm.params.itersPerTick = 800;
  const chem = makeNode('ChemicalSDF', 0, 0);
  chem.params.itersPerTick = 500;
  const bake = makeNode('MaskBake', 0, 0);
  for (const n of [base, mtn, strata, rain, wind, therm, chem, bake]) g.addNode(n);
  g.link(mtn.id, 'sdf', base.id);
  g.link(strata.id, 'sdf', mtn.id);
  g.link(rain.id, 'sdf', strata.id);
  g.link(wind.id, 'sdf', rain.id);
  g.link(therm.id, 'sdf', wind.id);
  g.link(chem.id, 'sdf', therm.id);
  g.link(bake.id, 'sdf', chem.id);
  return g;
}

const WORLD = { nx: 72, ny: 20, nz: 72, minY: -140, sizeY: 640 };

async function main() {
  console.log('Frontier headless test — world ' + WORLD.nx + 'x' + WORLD.ny + 'x' + WORLD.nz);

  // 0. default graph sanity (topo order, no cycles)
  const dg = buildDefaultGraph();
  const order = dg.topoSort().map((n) => n.type);
  check('default graph topo-sorts all nodes', order.length === dg.nodes.size, order.length + ' nodes');

  // 1. curvature sign convention on an analytic solid sphere (d=|p|-R inside<0)
  {
    const v = new SDFVolume(48, 48, 48, -60, -60, -60, 120, 120, 120);
    const p = [0, 0, 0];
    for (let k = 0; k < 48; k++) for (let j = 0; j < 48; j++) for (let i = 0; i < 48; i++) {
      v.gridToWorld(i, j, k, p);
      v.dist[v.idx(i, j, k)] = Math.hypot(p[0], p[1], p[2]) - 30;
    }
    const c = v.curvature(30, 0, 0, {});
    check('sphere: convex H > 0', c.H > 0, 'H=' + c.H.toFixed(4) + ' (expect ~+1/30)');
    check('sphere: Gaussian K > 0', c.K > 0, 'K=' + c.K.toFixed(6) + ' (expect ~+1/900)');
    const n = v.gradient(30, 0, 0, [0, 0, 0]);
    check('sphere: outward normal', n[0] > 0.9, 'n=' + n.map((x) => x.toFixed(2)).join(','));
  }

  // 2. generation (twice: determinism)
  const g = testGraph();
  const t0 = Date.now();
  await g.evaluate(WORLD, () => {});
  const genMs = Date.now() - t0;
  const vol = g.ctx.vol;
  let nan = 0, hasNeg = false, hasPos = false;
  for (let i = 0; i < vol.dist.length; i++) {
    const d = vol.dist[i];
    if (!isFinite(d)) nan++;
    else { if (d < 0) hasNeg = true; if (d > 0) hasPos = true; }
  }
  check('generated SDF finite', nan === 0, nan + ' non-finite');
  check('SDF has solid + air', hasNeg && hasPos);
  let hsum = 0;
  for (let i = 0; i < vol.n; i += 97) hsum = (hsum * 31 + (vol.dist[i] * 1000) | 0) | 0;
  const g2 = testGraph();
  await g2.evaluate(WORLD, () => {});
  let hsum2 = 0;
  for (let i = 0; i < g2.ctx.vol.n; i += 97) hsum2 = (hsum2 * 31 + (g2.ctx.vol.dist[i] * 1000) | 0) | 0;
  check('deterministic generation', hsum === hsum2, 'hash ' + hsum);
  console.log(`  INFO gen time ${genMs} ms for ${vol.n.toLocaleString()} voxels`);

  // 3. paint mask plumbing
  vol.paint2D(vol.paintRain, 0, 0, 120, 0.8, 'add');
  check('paint writes rain mask', vol.samplePaint(vol.paintRain, 0, 0) > 0.3);

  // 4. baseline roughness + mesh
  const R0 = surfaceRoughness(vol, 2500, 42);
  g.remesh();
  const m0 = g.ctx.mesh;
  check('baseline mesh non-empty', m0.verts > 200 && m0.tris > 200, `${m0.verts}v ${m0.tris}t`);
  let aoBad = 0;
  for (let i = 0; i < m0.ao.length; i += 13) if (!(m0.ao[i] >= 0 && m0.ao[i] <= 1)) aoBad++;
  check('AO attribute in [0,1]', aoBad === 0);
  console.log(`  INFO roughness R0=${R0.toFixed(5)} meshMs=${m0.ms.toFixed(0)}`);

  // 5. run all eroders to completion (bounded ticks)
  const t1 = Date.now();
  let ticks = 0;
  for (; ticks < 300; ticks++) {
    const active = g.simulateTick(120);
    if (!active) break;
  }
  const simMs = Date.now() - t1;
  let carved = 0, dep = 0;
  for (const n of g.eroderChain()) {
    if (n.sim) { carved += n.sim.carved || 0; dep += n.sim.deposited || 0; }
  }
  const rainNode = g.eroderChain().find((n) => n.type === 'RainSDF');
  check('rain retired its target', rainNode.sim.retired >= 6000, rainNode.sim.retired + ' drops in ' + ticks + ' ticks');
  check('erosion carved volume', carved > 0, carved.toFixed(1) + ' m³');
  check('erosion deposited volume', dep > 0, dep.toFixed(1) + ' m³');
  console.log(`  INFO sim ${simMs} ms, carved=${carved.toFixed(0)} deposited=${dep.toFixed(0)}`);

  // 6. anti-smoothing: high-frequency energy preserved + drainage formed
  const R1 = surfaceRoughness(vol, 2500, 42);
  check('roughness preserved (>=0.5x)', R1 >= 0.5 * R0, `R0=${R0.toFixed(5)} R1=${R1.toFixed(5)}`);
  let flowSum = 0, flowN = 0, sedSum = 0;
  for (let i = 0; i < vol.n; i += 11) { flowSum += vol.flow[i]; sedSum += vol.sed[i]; flowN++; }
  check('flow accumulation recorded', flowSum > 0, 'mean=' + (flowSum / flowN).toFixed(4));
  check('sediment field written', sedSum > 0, 'mean=' + (sedSum / flowN).toFixed(4));

  // 7. final mesh + finite attributes
  g.remesh();
  const m1 = g.ctx.mesh;
  let bad = 0;
  const arrs = [m1.positions, m1.normals, m1.ao, m1.curv, m1.sed, m1.moist, m1.flow, m1.erode];
  for (const a of arrs) for (let i = 0; i < a.length; i += 7) if (!isFinite(a[i])) bad++;
  check('final mesh attributes finite', bad === 0 && m1.verts > 200, `${m1.verts}v ${m1.tris}t`);

  console.log(failures ? `\n${failures} FAILURES` : '\nALL TESTS PASSED');
  process.exit(failures ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });

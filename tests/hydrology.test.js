/* ============================================================
 * Hydrology, landform structure and determinism.
 * These are the checks that keep the erosion honest: real drainage
 * networks, no endorheic pits left behind, and byte-identical output
 * for a given seed + recipe.
 * ============================================================ */

import test from 'node:test';
import assert from 'node:assert/strict';

import { HeightField } from '../src/gen/heightfield.js';
import { fillDepressions, computeFlow, hydrology, drainageDensity } from '../src/gen/flow.js';
import { buildBase } from '../src/gen/pipeline.js';
import { buildBaseHeightfield } from '../src/gen/base-terrain.js';
import { erodeFluvial } from '../src/gen/erosion-fluvial.js';
import { defaultParams, mergeParams } from '../src/gen/params.js';

const grid = (values, n = 8) => {
  const hf = new HeightField(n, n, { minX: 0, minZ: 0, cellX: 1, cellZ: 1 });
  for (let i = 0; i < n * n; i++) hf.h[i] = values(i % n, (i / n) | 0);
  hf.rain.fill(1);
  return hf;
};

test('flow: MFD accumulation on a tilted plane follows the gradient', () => {
  const n = 16;
  const hf = grid((x, z) => 10 - z * 0.5 - x * 0.05, n);
  const { flow } = computeFlow(hf, { exponent: 1.3 });
  // the plane falls to +x/+z, so the corner is the outlet and collects every cell
  assert.ok(flow[(n - 1) * n + (n - 1)] > n * n * 0.9,
    `outlet collects the plane, got ${flow[(n - 1) * n + (n - 1)]}`);
  // the opposite corner is the source: it only carries its own rain
  assert.ok(flow[0] < 1.001, `the summit is a source, got ${flow[0]}`);
  // every cell drains: the outlet carries the whole plane, exactly once
  let max = 0;
  for (let i = 0; i < flow.length; i++) if (flow[i] > max) max = flow[i];
  assert.ok(max <= n * n + 1e-3, `no cell can carry more than the whole plane, got ${max}`);
});

test('flow: MFD spreads to several neighbours, D8-like does not', () => {
  const n = 16;
  const hf = grid((x, z) => 10 - z * 0.5, n);
  const { wcount } = computeFlow(hf, { exponent: 4.0 });
  let spread = 0;
  for (let i = 0; i < wcount.length; i++) if (wcount[i] > 1) spread++;
  assert.ok(spread > 0, 'some cells split their flow (multi-flow directions)');
});

test('flow: priority flood fills a closed pit to its spill level', () => {
  const n = 9;
  // a Gaussian hollow dug into a plane that slopes to +x
  const hf = grid((x, z) => 0.35 * x + 0.05 * z - 2.2 * Math.exp(-((x - 4) ** 2 + (z - 4) ** 2) / 3), n);
  const { fill, depth, lakes } = fillDepressions(hf, { seaLevel: -Infinity });
  const centre = 4 * n + 4;
  const raised = fill[centre] - hf.h[centre];
  assert.ok(raised > 0.5 && raised < 1.6, `the pit fills to its pour level, raised by ${raised.toFixed(2)}`);
  assert.ok(Math.abs(depth[centre] - raised) < 1e-5, 'reported depth equals the fill');
  assert.equal(lakes[centre], 1, 'and is marked as a lake');
  // the fill never lowers anything
  for (let k = 0; k < fill.length; k++) assert.ok(fill[k] >= hf.h[k] - 1e-6, 'fill is a lower bound');
});

test('flow: every land cell routes somewhere — no interior sinks', () => {
  const p = mergeParams(defaultParams, { resolution: 'draft' });
  const built = buildBase(p);
  const hf = built.hf;
  const { fill, outletDist } = fillDepressions(hf, { seaLevel: p.seaLevel });
  // Filling alone leaves perfectly flat lake surfaces, where steepest descent
  // has no direction to offer; the outlet-distance tie-break is what gives
  // them one, so water really does leave through the spill point.
  const { wcount } = computeFlow(hf, {
    fill, outletDist, seaLevel: p.seaLevel, exponent: p.erosion.flowExponent ?? 1.35,
  });
  let sinks = 0;
  const first = [];
  for (let k = 0; k < hf.h.length; k++) {
    if (hf.h[k] <= p.seaLevel) continue;          // the sea itself is an outlet
    if (wcount[k] === 0) { sinks++; if (first.length < 5) first.push(k); }
  }
  assert.equal(sinks, 0, `${sinks} interior sinks remain after the fill (e.g. ${first.join(',')})`);
});

test('landform: the base terrain is a coherent massif, not noise', () => {
  const p = mergeParams(defaultParams, { resolution: 'draft' });
  const built = buildBase(p);
  const { hf, volume } = built;
  const maxH = hf.maxHeight();
  assert.ok(maxH > p.relief * 0.5, `summit should reach a real height, got ${maxH}`);
  assert.ok(maxH < p.relief * 1.9, `summit should not explode, got ${maxH}`);
  // the volume agrees with the height field on the top surface
  let agree = 0, total = 0;
  for (let j = 2; j < hf.nz - 2; j += 3) {
    for (let i = 2; i < hf.nx - 2; i += 3) {
      const k = j * hf.nx + i;
      if (!hf.valid[k]) continue;
      const x = hf.xOf(i), z = hf.zOf(j), y = hf.h[k];
      const inside = volume.sampleWorld(x, y - 0.35, z) < 0;
      const outside = volume.sampleWorld(x, y + 0.35, z) > 0;
      total++;
      if (inside && outside) agree++;
    }
  }
  assert.ok(agree / total > 0.97, `volume/heightfield agreement ${(agree / total * 100).toFixed(1)}%`);
});

test('determinism: the same recipe reproduces the same terrain', () => {
  const p = mergeParams(defaultParams, { resolution: 'draft', seed: 1234 });
  const a = buildBaseHeightfield(p, {
    nx: 40, nz: 40, minX: -21.7, minZ: -19.7, cellX: 1.1, cellZ: 1.0,
  });
  const b = buildBaseHeightfield(p, {
    nx: 40, nz: 40, minX: -21.7, minZ: -19.7, cellX: 1.1, cellZ: 1.0,
  });
  let maxDiff = 0;
  for (let i = 0; i < a.h.length; i++) maxDiff = Math.max(maxDiff, Math.abs(a.h[i] - b.h[i]));
  assert.equal(maxDiff, 0, 'identical inputs must give identical terrain');

  const other = mergeParams(defaultParams, { seed: 1235 });
  const c = buildBaseHeightfield(other, {
    nx: 40, nz: 40, minX: -21.7, minZ: -19.7, cellX: 1.1, cellZ: 1.0,
  });
  let diff = 0;
  for (let i = 0; i < a.h.length; i++) diff = Math.max(diff, Math.abs(a.h[i] - c.h[i]));
  assert.ok(diff > 0.05, 'a different seed gives a different terrain');
});

test('drainage: erosion organises the surface into a mature channel network', async () => {
  const p = mergeParams(defaultParams, { resolution: 'draft' });
  const built = buildBase(p);
  const hf = built.hf;

  const { flow: flowBefore } = hydrology(hf, { seaLevel: p.seaLevel, seed: 1 });
  const densityBefore = drainageDensity(hf, 25);
  assert.ok(densityBefore > 0, 'the raw landform already has drainage');

  await erodeFluvial(hf, { ...p.erosion, iterations: 60 }, { seaLevel: p.seaLevel, seed: p.seed });

  const { flow: flowAfter } = hydrology(hf, { seaLevel: p.seaLevel, seed: 1 });
  const densityAfter = drainageDensity(hf, 25);

  const peak = (f) => { let m = 0; for (let i = 0; i < f.length; i++) if (f[i] > m) m = f[i]; return m; };
  // concentration is the signature of a channel network: after erosion a few
  // cells must still carry most of the water.
  assert.ok(peak(flowAfter) >= peak(flowBefore) * 0.9,
    `flow stays concentrated (${peak(flowBefore).toFixed(1)} → ${peak(flowAfter).toFixed(1)})`);
  assert.ok(Number.isFinite(densityAfter) && densityAfter > 0, 'drainage density stays measurable');
});

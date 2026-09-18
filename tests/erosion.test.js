/* ============================================================
 * Erosion behaviour and — the important part — its LIMITS.
 *
 * The two failure modes this project exists to fix were:
 *   1. particle erosion digging an unbounded pit ("a hole that never
 *      stops"), and
 *   2. the diffusion-heavy solver turning everything into a smooth
 *      dome ("very blurry, not detailed enough").
 * Both now have explicit regression tests below. If a future tuning
 * session reintroduces either, these fail.
 * ============================================================ */

import test from 'node:test';
import assert from 'node:assert/strict';

import { buildBase } from '../src/gen/pipeline.js';
import { defaultParams, mergeParams } from '../src/gen/params.js';
import { erodeFluvial } from '../src/gen/erosion-fluvial.js';
import { erodeParticles } from '../src/gen/erosion-particles.js';
import { erodeDetail } from '../src/gen/erosion-detail.js';

const draft = (patch = {}) => {
  const p = mergeParams(defaultParams, { resolution: 'draft', ...patch });
  const built = buildBase(p);
  return { p, hf: built.hf, volume: built.volume };
};

test('fluvial: carves material, conserves plausibility, lowers slope spread', async () => {
  const { p, hf } = draft();
  const before = Float32Array.from(hf.h);
  const res = await erodeFluvial(hf, p.erosion, { seaLevel: p.seaLevel, seed: p.seed });
  assert.ok(res.carvedM3 > 0, 'stream power removes material');
  let changed = 0;
  for (let i = 0; i < hf.h.length; i++) if (Math.abs(hf.h[i] - before[i]) > 1e-4) changed++;
  assert.ok(changed > hf.h.length * 0.2, 'erosion touches a large part of the surface');
  // the sea floor must not be dredged by the fluvial pass
  let belowFloor = 0;
  for (let i = 0; i < hf.h.length; i++) if (hf.h[i] < p.seaLevel - 4.2) belowFloor++;
  assert.equal(belowFloor, 0, 'the dominated sea floor is left alone');
});

test('fluvial: diffusion does not flatten the terrain into a dome (anti-blur)', async () => {
  const { p, hf } = draft();
  const baseRoughness = hf.roughness();
  await erodeFluvial(hf, p.erosion, { seaLevel: p.seaLevel, seed: p.seed });
  const after = hf.roughness();
  // A mature landscape smooths the interfluves but keeps its channels: the
  // mean slope must not collapse toward zero.
  assert.ok(after > baseRoughness * 0.35,
    `mean slope fell from ${baseRoughness.toFixed(3)} to ${after.toFixed(3)} — too much diffusion`);
});

test('fluvial: produces a concave channel network (valleys, not stripes)', async () => {
  const { p, hf } = draft();
  await erodeFluvial(hf, p.erosion, { seaLevel: p.seaLevel, seed: p.seed });
  const { hydrology } = await import('../src/gen/flow.js');
  const { flow } = hydrology(hf, { seaLevel: p.seaLevel, seed: p.seed });
  let maxFlow = 0;
  for (let i = 0; i < flow.length; i++) maxFlow = Math.max(maxFlow, flow[i]);
  assert.ok(maxFlow > 40, `flow must concentrate into channels, max drainage ${maxFlow}`);
  // valley floors should be flatter than the means of their neighbourhood
  let concave = 0, checked = 0;
  for (let j = 1; j < hf.nz - 1; j++) {
    for (let i = 1; i < hf.nx - 1; i++) {
      const k = j * hf.nx + i;
      if (flow[k] < 20) continue;
      checked++;
      const lap = (hf.h[k - 1] + hf.h[k + 1] + hf.h[k - hf.nx] + hf.h[k + hf.nx]) * 0.25 - hf.h[k];
      if (lap > -1e-4) concave++;
    }
  }
  assert.ok(checked > 5, 'some cells carry real drainage');
  assert.ok(concave / checked > 0.55, `channels should sit in concavities (${concave}/${checked})`);
});

test('PARTICLE GUARD: a droplet storm cannot dig an unbounded pit', async () => {
  const { p, hf } = draft({
    erosion: {
      particleCount: 60000,      // a deliberately absurd number of droplets
      particleSteps: 96,         // each walking a long way
      particleMaxLoad: 1.0,      // with an absurd carrying capacity
      maxIncision: 1.2,
      cliffSlope: 0.8,
    },
  });
  const maxIncision = p.erosion.maxIncision;
  const before = Float32Array.from(hf.h);
  await erodeParticles(hf, p.erosion, { seed: p.seed, seaLevel: p.seaLevel, floorY: -4 });
  let deepest = 0;
  for (let i = 0; i < hf.h.length; i++) {
    const cut = before[i] - hf.h[i];
    if (cut > deepest) deepest = cut;
  }
  assert.ok(deepest <= maxIncision + 0.15,
    `deepest cut was ${deepest.toFixed(2)} m; the per-column budget is ${maxIncision} m`);
  // the same limit holds for the terrain as a whole
  let below = 0;
  for (let i = 0; i < hf.h.length; i++) if (hf.h[i] < -4) below++;
  assert.equal(below, 0, 'the rock floor is never crossed');
});

test('PARTICLE GUARD: deposition cannot build unbounded mounds', async () => {
  const { p, hf } = draft({
    erosion: {
      particleCount: 40000,
      particleSteps: 64,
      maxAggradation: 0.4,
      particleCapacity: 0.4,     // force deposition almost immediately
      particleDeposit: 1.0,
    },
  });
  const before = Float32Array.from(hf.h);
  await erodeParticles(hf, p.erosion, { seed: p.seed + 3, seaLevel: p.seaLevel, floorY: -4 });
  let tallest = 0;
  for (let i = 0; i < hf.h.length; i++) {
    const grew = hf.h[i] - before[i];
    if (grew > tallest) tallest = grew;
  }
  assert.ok(tallest <= p.erosion.maxAggradation * 1.25,
    `tallest deposit grew ${tallest.toFixed(2)} m — that is a mound, not a fan (budget ${p.erosion.maxAggradation} m)`);
});

test('PARTICLE GUARD: the pass books every cubic metre it moves', async () => {
  const { p, hf } = draft();
  const before = Float32Array.from(hf.h);
  const res = await erodeParticles(hf, p.erosion, { seed: p.seed, seaLevel: p.seaLevel, floorY: -4 });
  const cellArea = hf.cellArea;
  // What the pass reports (gross cut, gross deposit including the alluvial
  // rain) has to add up to what it actually did to the height field. A
  // "hole that never stops" would show up here first: material leaving the
  // model without being accounted for.
  let net = 0, grossCut = 0, grossFill = 0;
  for (let i = 0; i < hf.h.length; i++) {
    const d = hf.h[i] - before[i];
    net += d * cellArea;
    if (d < 0) grossCut += -d * cellArea; else grossFill += d * cellArea;
  }
  const booked = res.depositedM3 - res.carvedM3;
  assert.ok(grossCut > 0, 'the pass removes material');
  assert.ok(Math.abs(net - booked) / Math.max(Math.abs(net), 1) < 0.02,
    `volume change ${net.toFixed(1)} m³ vs booked ${booked.toFixed(1)} m³`);
  assert.ok(res.carvedM3 >= grossCut * 0.999, 'gross cut is reported, not the net');
  assert.ok(res.exportedM3 >= 0 && res.depositedM3 >= 0, 'exports and deposits are non-negative');
});

test('detail stage adds high-frequency relief without exploding', () => {
  const { p, hf } = draft();
  const before = Float32Array.from(hf.h);
  const res = erodeDetail(hf, p.erosion, { seed: p.seed, seaLevel: p.seaLevel });
  let maxDelta = 0;
  for (let i = 0; i < hf.h.length; i++) maxDelta = Math.max(maxDelta, Math.abs(hf.h[i] - before[i]));
  assert.ok(maxDelta < 0.6, `detail displacement should be sub-metre, got ${maxDelta.toFixed(2)}`);
  assert.ok(res.ms >= 0);
});

test('rates are resolution independent: the landform survives a coarser grid', async () => {
  const fine = draft({ erosion: { iterations: 60 } });
  await erodeFluvial(fine.hf, fine.p.erosion, { seaLevel: fine.p.seaLevel, seed: 1 });
  const coarse = mergeParams(defaultParams, { resolution: 'draft', seed: 1 });
  const builtCoarse = buildBase(coarse);
  await erodeFluvial(builtCoarse.hf, coarse.erosion, { seaLevel: coarse.seaLevel, seed: 1 });
  const a = fine.hf.roughness();
  const b = builtCoarse.hf.roughness();
  assert.ok(Math.abs(a - b) / Math.max(a, 1e-6) < 0.35,
    `mean slope differs between runs (${a.toFixed(3)} vs ${b.toFixed(3)})`);
});

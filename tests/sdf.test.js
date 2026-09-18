/* ============================================================
 * Core SDF behaviour: sign convention, metric quality, raycasting,
 * CSG, the Eikonal repair, and the RLE codec used by the exporters.
 * ============================================================ */

import test from 'node:test';
import assert from 'node:assert/strict';

import { SdfVolume } from '../src/core/sdf-volume.js';
import { redistance, gradientQuality } from '../src/core/eikonal.js';
import { applyShape, sdSphere, smin, smax } from '../src/core/sdf-ops.js';
import { encodeSdfVolume, decodeSdfVolume } from '../src/io/exporters.js';

const smallVolume = () => new SdfVolume({ dims: [48, 32, 48], min: [-12, -6, -12], max: [12, 10, 12], chunk: 8 });

test('volume: sign convention is negative inside, positive outside', () => {
  const v = smallVolume();
  assert.equal(v.length, 48 * 32 * 48);
  const d = v.sampleWorld(0, 0, 0);
  assert.ok(d > 0, 'an untouched volume is empty (positive distance)');
});

test('volume: sphere CSG produces a correct SDF band', () => {
  const v = smallVolume();
  applyShape(v, [[-8, -6, -8], [8, 6, 8]], 'union', (x, y, z) => sdSphere(x, y, z, 0, 1, 0, 4));
  v.refreshChunkStats();
  // inside the sphere: negative; outside: positive
  assert.ok(v.sampleWorld(0, 1, 0) < -3.5, 'centre is deep inside');
  assert.ok(v.sampleWorld(0, 1, 0) > -4.5, 'and close to -radius');
  assert.ok(v.sampleWorld(0, 6, 0) > 0, 'above the sphere is air');
  assert.ok(v.sampleWorld(4.05, 1, 0) > 0 && v.sampleWorld(3.95, 1, 0) < 0, 'the surface sits at r=4');
  const q = gradientQuality(v, 4);
  assert.ok(Math.abs(q - 1) < 0.06, `|grad| should be ~1, got ${q}`);
});

test('volume: raycast finds the sphere and reports an agreeing normal', () => {
  const v = smallVolume();
  applyShape(v, [[-8, -6, -8], [8, 6, 8]], 'union', (x, y, z) => sdSphere(x, y, z, 0, 1, 0, 4));
  v.refreshChunkStats();
  const hit = v.raycast(0, 20, 0, 0, -1, 0);
  assert.ok(hit, 'the ray hits');
  assert.ok(Math.abs(hit.point[1] - 5) < 0.08, `hit at y=5, got ${hit.point[1]}`);
  assert.ok(hit.normal[1] > 0.95, 'normal points up out of the rock');
  assert.equal(v.raycast(30, 20, 30, 0, -1, 0), null, 'a ray outside the volume misses');
});

test('volume: subtract cuts a hole that the field still describes correctly', () => {
  const v = smallVolume();
  applyShape(v, [[-8, -6, -8], [8, 6, 8]], 'union', (x, y, z) => sdSphere(x, y, z, 0, 0, 0, 5));
  applyShape(v, [[-8, -6, -8], [8, 6, 8]], 'subtract', (x, y, z) => sdSphere(x, y, z, 0, 0, 0, 2));
  v.refreshChunkStats();
  assert.ok(v.sampleWorld(0, 0, 0) > 0, 'the core is now empty — a cave, not a hole in the sign field');
  assert.ok(v.sampleWorld(0, -3.5, 0) < 0, 'the shell is still solid');
  const q = gradientQuality(v, 4);
  assert.ok(Math.abs(q - 1) < 0.12, `after CSG the metric should be repaired, got ${q}`);
});

test('eikonal: redistance repairs a deliberately broken field', () => {
  const v = smallVolume();
  applyShape(v, [[-8, -6, -8], [8, 6, 8]], 'union', (x, y, z) => sdSphere(x, y, z, 0, 0, 0, 3));
  // crush the gradient: scale every value down
  for (let i = 0; i < v.data.length; i++) v.data[i] *= 0.25;
  const broken = gradientQuality(v, 4);
  assert.ok(broken < 0.4, `expected a broken metric, got ${broken}`);
  redistance(v, { bandVoxels: 6, sweeps: 3 });
  const fixed = gradientQuality(v, 4);
  assert.ok(Math.abs(fixed - 1) < 0.1, `expected |grad| ~ 1 after repair, got ${fixed}`);
});

test('sdf ops: smooth union is between the inputs and stays a distance field', () => {
  const a = sdSphere(0, 0, 0, 0, 0, 0, 2);
  const b = sdSphere(3, 0, 0, 0, 0, 0, 2);
  const hard = Math.min(a, b);
  const soft = smin(a, b, 1.5);
  assert.ok(soft <= hard + 1e-9, 'smooth min blends material in');
  assert.ok(soft >= hard - 1e-9 - 1e-9);
  const inter = smax(a, b, 0);
  assert.ok(inter >= Math.max(a, b) - 1e-9);
});

test('exporter: .frontier container round-trips', () => {
  const v = smallVolume();
  applyShape(v, [[-8, -6, -8], [8, 6, 8]], 'union', (x, y, z) => sdSphere(x, y, z, 0, 0, 0, 3));
  const bytes = encodeSdfVolume(v, { params: { seed: 7 }, iterations: 42 });
  const { header, floats, nx, ny, nz } = decodeSdfVolume(bytes);
  assert.equal(header.format, 'frontier-sdf');
  assert.equal(header.version, 2);
  assert.deepEqual([nx, ny, nz], [48, 32, 48]);
  assert.equal(header.settings.seed, 7);
  assert.equal(header.iterations, 42);
  for (let i = 0; i < 500; i++) {
    const idx = i * 97 % v.length;
    assert.ok(Math.abs(floats[idx * 4] - v.data[idx]) < 1e-5, 'distance channel round-trips');
  }
});

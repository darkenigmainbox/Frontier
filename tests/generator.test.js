import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { generateRock, generateRockAsync } from '../src/generator/rockGeometry.js';
import { DEFAULT_SETTINGS, normalizeSettings } from '../src/generator/presets.js';
import { createRandom, deriveSeed } from '../src/generator/random.js';

function fingerprint(mesh) {
  const hash = createHash('sha256');
  for (const attribute of [mesh.positions, mesh.normals, mesh.tangents, mesh.colors, mesh.uvs, mesh.indices]) {
    hash.update(Buffer.from(attribute.buffer, attribute.byteOffset, attribute.byteLength));
  }
  return hash.digest('hex');
}

const baseSettings = { ...DEFAULT_SETTINGS, kind: 'boulder', seed: 10, detail: 0 };
const base = generateRock(baseSettings);

test('settings are clamped and invalid values receive safe defaults', () => {
  const settings = normalizeSettings({ kind: 'unknown', seed: 9000000000, width: -3, height: 9, fracture: -10, joints: 150, weathering: 500, detail: Infinity });
  assert.equal(settings.kind, 'outcrop');
  assert.equal(settings.seed, 4294967295);
  assert.equal(settings.width, 0.6);
  assert.equal(settings.height, 1.6);
  assert.equal(settings.fracture, 0);
  assert.equal(settings.joints, 100);
  assert.equal(settings.weathering, 100);
  assert.equal(settings.detail, DEFAULT_SETTINGS.detail);
  assert.equal(normalizeSettings({ seed: null, width: '' }).seed, DEFAULT_SETTINGS.seed);
  assert.equal(normalizeSettings({ seed: null, width: '' }).width, DEFAULT_SETTINGS.width);
});

test('random streams are repeatable and independent', () => {
  const a = createRandom(deriveSeed(1, 2));
  const b = createRandom(deriveSeed(1, 2));
  const c = createRandom(deriveSeed(1, 3));
  const values = Array.from({ length: 8 }, () => a());
  assert.deepEqual(values, Array.from({ length: 8 }, () => b()));
  assert.notDeepEqual(values, Array.from({ length: 8 }, () => c()));
  assert.ok(values.every((value) => value >= 0 && value < 1));
});

test('the same seed and settings reproduce every mesh attribute', () => {
  const again = generateRock(baseSettings);
  assert.equal(fingerprint(base), fingerprint(again));
  assert.deepEqual(base.stats, again.stats);
  const otherSeed = generateRock({ ...baseSettings, seed: 11 });
  assert.notEqual(fingerprint(base), fingerprint(otherSeed));
});

test('formation styles create different geometry, not fixed meshes', () => {
  const outcrop = generateRock({ ...baseSettings, kind: 'outcrop' });
  const cliff = generateRock({ ...baseSettings, kind: 'cliff' });
  assert.notEqual(fingerprint(outcrop), fingerprint(base));
  assert.notEqual(fingerprint(cliff), fingerprint(outcrop));
  assert.ok(cliff.stats.dimensions[1] > base.stats.dimensions[1]);
  assert.ok(cliff.stats.dimensions[0] > base.stats.dimensions[0]);
});

test('fractures, weathering and surface detail alter real geometry', () => {
  const unfractured = generateRock({ ...baseSettings, fracture: 0, weathering: 0 });
  const fractured = generateRock({ ...baseSettings, fracture: 90, weathering: 0 });
  const weathered = generateRock({ ...baseSettings, fracture: 90, weathering: 80 });
  const verticalJoints = generateRock({ ...baseSettings, joints: 100 });
  const detailed = generateRock({ ...baseSettings, detail: 100 });
  assert.ok(fractured.stats.fragments > unfractured.stats.fragments);
  assert.notEqual(fingerprint(fractured), fingerprint(weathered));
  assert.notEqual(fingerprint(base), fingerprint(verticalJoints));
  assert.ok(detailed.stats.triangles > base.stats.triangles);
});

test('width and height affect physical dimensions independently', () => {
  const wide = generateRock({ ...baseSettings, width: 1.5 });
  const tall = generateRock({ ...baseSettings, height: 1.5 });
  assert.ok(wide.stats.dimensions[0] > base.stats.dimensions[0] * 1.3);
  assert.ok(tall.stats.dimensions[1] > base.stats.dimensions[1] * 1.3);
});

test('mesh buffers are finite, indexed correctly, normalized and grounded in meters', () => {
  assert.equal(base.positions.length, base.normals.length);
  assert.equal(base.positions.length, base.colors.length);
  assert.equal(base.uvs.length, base.stats.vertices * 2);
  assert.equal(base.tangents.length, base.stats.vertices * 4);
  assert.equal(base.indices.length, base.stats.triangles * 3);
  assert.ok(base.stats.vertices > 0);
  assert.equal(base.stats.bounds.min[1], 0);
  for (const attribute of [base.positions, base.normals, base.tangents, base.colors, base.uvs]) {
    for (const value of attribute) assert.ok(Number.isFinite(value));
  }
  for (const index of base.indices) assert.ok(index < base.stats.vertices);
  for (let i = 0; i < base.positions.length; i += 3) {
    assert.ok(base.positions[i + 1] >= 0);
    assert.ok(Math.abs(Math.hypot(base.normals[i], base.normals[i + 1], base.normals[i + 2]) - 1) < 0.001);
    const t = (i / 3) * 4;
    assert.ok(Math.abs(Math.hypot(base.tangents[t], base.tangents[t + 1], base.tangents[t + 2]) - 1) < 0.001);
    assert.ok(Math.abs(base.normals[i] * base.tangents[t] + base.normals[i + 1] * base.tangents[t + 1] + base.normals[i + 2] * base.tangents[t + 2]) < 0.001);
    assert.ok(base.tangents[t + 3] === -1 || base.tangents[t + 3] === 1);
  }
});

test('fragment surfaces remain closed across split face vertices', () => {
  // Faces deliberately duplicate vertices for UVs and hard edges. Weld only for
  // this topology check; each geometric edge should belong to two triangles.
  const vertexIds = new Map();
  const welded = [];
  for (let i = 0; i < base.positions.length; i += 3) {
    const key = [base.positions[i], base.positions[i + 1], base.positions[i + 2]].map((v) => Math.round(v * 1e5)).join(',');
    if (!vertexIds.has(key)) vertexIds.set(key, vertexIds.size);
    welded.push(vertexIds.get(key));
  }
  const edges = new Map();
  for (let i = 0; i < base.indices.length; i += 3) {
    const triangle = [welded[base.indices[i]], welded[base.indices[i + 1]], welded[base.indices[i + 2]]];
    assert.equal(new Set(triangle).size, 3, 'triangle should not collapse after welding');
    for (let edge = 0; edge < 3; edge++) {
      const [a, b] = [triangle[edge], triangle[(edge + 1) % 3]].sort((x, y) => x - y);
      const key = `${a}:${b}`;
      edges.set(key, (edges.get(key) || 0) + 1);
    }
  }
  for (const count of edges.values()) assert.equal(count, 2);
});


test('time-sliced compatibility generation produces identical geometry', async () => {
  let yields = 0;
  const fallback = await generateRockAsync(baseSettings, {
    budgetMs: 0,
    yieldControl: async () => { yields++; },
  });
  assert.ok(yields > 0);
  assert.equal(fingerprint(fallback), fingerprint(base));
  assert.deepEqual(fallback.stats, base.stats);
});

test('time-sliced compatibility generation can be cancelled', async () => {
  const controller = new AbortController();
  await assert.rejects(generateRockAsync(baseSettings, {
    signal: controller.signal,
    budgetMs: 0,
    yieldControl: async () => controller.abort(),
  }), { name: 'AbortError' });
});

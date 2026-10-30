import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createRockfallGeometry,
  createRockfallInstances,
  MAX_SETTLED_BOULDERS,
} from '../src/erosion/rockfall.js';

test('Settled rockfall meshes are deterministic flat-shaded rock forms with valid outward normals', () => {
  const a = createRockfallGeometry(4029);
  const b = createRockfallGeometry(4029);
  const other = createRockfallGeometry(4030);
  assert.deepEqual(a.positions, b.positions);
  assert.deepEqual(a.normals, b.normals);
  assert.notDeepEqual(a.positions, other.positions);
  assert.equal(a.positions.length, a.normals.length);
  assert.equal(a.positions.length % 9, 0, 'Every face is three expanded vertices');
  assert.ok(a.positions.length / 9 >= 80, 'Low-poly chunks need enough facets to read as angular rock');

  for (let i = 0; i < a.positions.length; i += 9) {
    const cx = (a.positions[i] + a.positions[i + 3] + a.positions[i + 6]) / 3;
    const cy = (a.positions[i + 1] + a.positions[i + 4] + a.positions[i + 7]) / 3;
    const cz = (a.positions[i + 2] + a.positions[i + 5] + a.positions[i + 8]) / 3;
    const nx = a.normals[i], ny = a.normals[i + 1], nz = a.normals[i + 2];
    assert.ok(Number.isFinite(cx) && Number.isFinite(cy) && Number.isFinite(cz));
    assert.ok(Math.abs(Math.hypot(nx, ny, nz) - 1) < 1e-5);
    assert.ok(nx * cx + ny * cy + nz * cz > 0, 'Facet normals must face away from the rock center');
  }
});

test('Rockfall field deterministically stratifies angular boulders across the whole terrain footprint', () => {
  const a = createRockfallInstances(4029, 500);
  const b = createRockfallInstances(4029, 500);
  const other = createRockfallInstances(4030, 500);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, other);
  assert.equal(a.length, MAX_SETTLED_BOULDERS * 8);

  const xs = [];
  const zs = [];
  let hasSmall = false;
  let hasLarge = false;
  for (let i = 0; i < a.length; i += 8) {
    const [x, z, rx, ry, rz, yaw, threshold, tint] = a.slice(i, i + 8);
    assert.ok(Math.abs(x) <= 500 * 0.47 && Math.abs(z) <= 500 * 0.47);
    assert.ok(rx > 1 && ry > 0.5 && rz > 1);
    assert.ok(yaw >= 0 && yaw <= Math.PI * 2);
    assert.ok(threshold >= 0 && threshold <= 1);
    assert.ok(Math.abs(tint) <= 0.16);
    xs.push(x);
    zs.push(z);
    hasSmall ||= rx < 5;
    hasLarge ||= rx > 9;
  }
  assert.ok(hasSmall && hasLarge, 'Rockfall should mix small blocks with rare large calved slabs');
  assert.ok(Math.max(...xs) - Math.min(...xs) > 400);
  assert.ok(Math.max(...zs) - Math.min(...zs) > 400);
});

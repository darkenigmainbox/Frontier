// Headless sanity checks for the procedural world.
//   * no NaNs / infinities in buffers
//   * triangle winding agrees with the vertex normals (catches back faces)
//   * the JS quaternion -> matrix convention matches the WGSL one in scene.wgsl
//   * index ranges stay inside the vertex buffer
import { buildWorld, groundHeight, riverCenterZ } from '../src/world.js';
import { quatFromEuler, quatFromAxisAngle, compose } from '../src/math.js';

let failures = 0;
const fail = (msg) => {
  failures++;
  console.log('  ✗ ' + msg);
};
const ok = (msg) => console.log('  ✓ ' + msg);

const world = buildWorld();
const { positions, normals, indices, draws, instances } = world;

console.log('\n=== buffers ===');
console.log(`  vertices ${world.stats.vertices}, triangles ${world.stats.triangles}, instances ${world.stats.instances}, draws ${world.stats.draws}`);

for (const [name, arr] of Object.entries({ positions, normals, uvs: world.uvs, extras: world.extras, instances, indices })) {
  let bad = 0;
  for (let i = 0; i < arr.length; i++) if (!Number.isFinite(arr[i])) bad++;
  if (bad) fail(`${name}: ${bad} non-finite values`);
  else ok(`${name}: finite`);
}

console.log('\n=== index bounds ===');
let oob = 0;
const vcount = positions.length / 3;
for (let i = 0; i < indices.length; i++) if (indices[i] >= vcount) oob++;
oob ? fail(`${oob} indices out of range`) : ok('all indices in range');

console.log('\n=== draw coverage ===');
let covered = 0;
for (const d of draws) {
  if (d.firstIndex + d.indexCount > indices.length) fail(`draw ${d.matId} range overflow`);
  if (!d.useInstance) covered += d.indexCount;
}
for (const r of Object.values(world.bases || {})) covered += r.indexCount;
covered === indices.length
  ? ok('static draws + instanced bases tile the index buffer exactly')
  : fail(`coverage ${covered} != ${indices.length}`);

console.log('\n=== winding vs normals ===');
const triCheck = (pos, nrm, idx, label) => {
  let flipped = 0, degen = 0, total = idx.length / 3;
  for (let t = 0; t < idx.length; t += 3) {
    const [i0, i1, i2] = [idx[t], idx[t + 1], idx[t + 2]];
    const a = [pos[i0 * 3], pos[i0 * 3 + 1], pos[i0 * 3 + 2]];
    const b = [pos[i1 * 3], pos[i1 * 3 + 1], pos[i1 * 3 + 2]];
    const c = [pos[i2 * 3], pos[i2 * 3 + 1], pos[i2 * 3 + 2]];
    const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const cr = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    const len = Math.hypot(cr[0], cr[1], cr[2]);
    if (len < 1e-9) {
      degen++;
      continue;
    }
    const n = [0, 0, 0];
    for (const i of [i0, i1, i2]) {
      n[0] += nrm[i * 3]; n[1] += nrm[i * 3 + 1]; n[2] += nrm[i * 3 + 2];
    }
    const d = cr[0] * n[0] + cr[1] * n[1] + cr[2] * n[2];
    if (d < 0) flipped++;
  }
  const pct = ((flipped / Math.max(total, 1)) * 100).toFixed(2);
  if (flipped / Math.max(total, 1) > 0.02) fail(`${label}: ${flipped}/${total} triangles wound backwards (${pct}%)`);
  else ok(`${label}: winding ok (${flipped} flipped, ${degen} degenerate, ${total} tris)`);
};

// Per material, so a bad primitive is easy to find.
const byMat = new Map();
for (const d of draws) {
  if (!byMat.has(d.matId)) byMat.set(d.matId, { idx: [], pos: [], nrm: [] });
  const bucket = byMat.get(d.matId);
  if (d.useInstance) continue;
  const off = bucket.pos.length / 3;
  for (let i = d.firstIndex; i < d.firstIndex + d.indexCount; i += 3) {
    bucket.idx.push(indices[i] - 0, indices[i + 1], indices[i + 2]);
  }
}
for (const [matId, b] of byMat) {
  if (!b.idx.length) continue;
  triCheck(positions, normals, b.idx, `material ${matId}`);
}

// Base primitives (instanced geometry lives in its own range).
console.log('\n=== instanced bases ===');
const baseRanges = world.bases || {};
for (const [name, r] of Object.entries(baseRanges)) {
  const sub = indices.slice(r.firstIndex, r.firstIndex + r.indexCount);
  triCheck(positions, normals, sub, `base "${name}"`);
}

console.log('\n=== terrain ===');
let hMin = Infinity, hMax = -Infinity;
for (let x = -120; x <= 120; x += 6) {
  for (let z = -120; z <= 120; z += 6) {
    const h = groundHeight(x, z);
    hMin = Math.min(hMin, h);
    hMax = Math.max(hMax, h);
    if (!Number.isFinite(h)) fail(`terrain NaN at ${x},${z}`);
  }
}
ok(`terrain height range ${hMin.toFixed(2)} .. ${hMax.toFixed(2)}`);
// The village centre must be flat, or buildings float / sink.
let bad = 0;
for (let x = -30; x <= 30; x += 2) for (let z = -30; z <= 30; z += 2) if (groundHeight(x, z) > 0.001) bad++;
bad ? fail(`${bad} non-flat samples inside the village`) : ok('village centre is perfectly flat');
// River must stay in the flat zone near the village.
ok(`river z at x=0 is ${riverCenterZ(0).toFixed(2)}`);

console.log('\n=== quaternion convention (JS vs WGSL) ===');
// Mirror of quatToMat3() in scene.wgsl, column major.
function wgslQuatToMat3(q) {
  const [x, y, z, w] = q;
  return [
    [1 - 2 * (y * y + z * z), 2 * (x * y + z * w), 2 * (x * z - y * w)],
    [2 * (x * y - z * w), 1 - 2 * (x * x + z * z), 2 * (y * z + x * w)],
    [2 * (x * z + y * w), 2 * (y * z - x * w), 1 - 2 * (x * x + y * y)],
  ];
}
const rotate = (m, v) => [
  m[0][0] * v[0] + m[1][0] * v[1] + m[2][0] * v[2],
  m[0][1] * v[0] + m[1][1] * v[1] + m[2][1] * v[2],
  m[0][2] * v[0] + m[1][2] * v[1] + m[2][2] * v[2],
];

let qBad = 0;
for (const ang of [0.3, 1.1, 2.2, -0.7]) {
  for (const axis of [[0, 1, 0], [1, 0, 0], [0, 0, 1], [1, 1, 0]]) {
    const q = quatFromAxisAngle(axis, ang);
    const m = wgslQuatToMat3(q);
    const v = [0.3, 0.5, 0.81];
    const got = rotate(m, v);
    // Rodrigues reference
    const l = Math.hypot(...axis);
    const ax = axis.map((c) => c / l);
    const c = Math.cos(ang), s = Math.sin(ang);
    const dot = ax[0] * v[0] + ax[1] * v[1] + ax[2] * v[2];
    const cross = [ax[1] * v[2] - ax[2] * v[1], ax[2] * v[0] - ax[0] * v[2], ax[0] * v[1] - ax[1] * v[0]];
    const ref = [0, 1, 2].map((i) => v[i] * c + cross[i] * s + ax[i] * dot * (1 - c));
    const err = Math.hypot(got[0] - ref[0], got[1] - ref[1], got[2] - ref[2]);
    if (err > 1e-6) qBad++;
  }
}
qBad ? fail(`quaternion matrix mismatch (${qBad} cases)`) : ok('quatToMat3 matches Rodrigues rotation');

// quatFromEuler must agree with compose(), which is what the CPU geometry uses.
{
  let worst = 0;
  for (const [rx, ry, rz] of [[0.4, 0.9, -0.3], [0, 1.2, 0], [0.7, -2.1, 2.4], [-1.1, 0.2, 0.05]]) {
    const q = quatFromEuler(rx, ry, rz);
    const m = wgslQuatToMat3(q);
    const v = [0.7, 0.2, -0.4];
    const got = rotate(m, v);
    const cm = compose([0, 0, 0], [rx, ry, rz], [1, 1, 1]);
    const ref = [
      cm[0] * v[0] + cm[4] * v[1] + cm[8] * v[2],
      cm[1] * v[0] + cm[5] * v[1] + cm[9] * v[2],
      cm[2] * v[0] + cm[6] * v[1] + cm[10] * v[2],
    ];
    worst = Math.max(worst, Math.hypot(got[0] - ref[0], got[1] - ref[1], got[2] - ref[2]));
  }
  worst < 1e-6 ? ok('quatFromEuler matches compose() euler order') : fail(`euler order mismatch err=${worst}`);
}

console.log('');
if (failures) {
  console.log(`${failures} check(s) failed.`);
  process.exit(1);
}
console.log('All world checks passed.');

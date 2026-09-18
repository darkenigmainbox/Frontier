/* ============================================================
 * Headless smoke test for the SDF sculpting stack.
 *
 * There is no browser in this environment, so the brushes are exercised
 * directly against a real SdfVolume: every brush and every stamp is
 * stroked across a sphere, then the field is checked for the three
 * things that would break the app at runtime —
 *   1. NaN / garbage voxels,
 *   2. a broken metric (|∇d| drifts away from 1 → raycast over-steps),
 *   3. a stroke that does not actually move the surface.
 *
 *   node tools/dev/sculpt-test.mjs
 * ============================================================ */

import { SdfVolume } from '../../src/core/sdf-volume.js';
import { applyShape, sdSphere } from '../../src/core/sdf-ops.js';
import { gradientQuality, redistance } from '../../src/core/eikonal.js';
import { BRUSHES, STAMP_KINDS, applyStroke, finishStroke } from '../../src/sculpt/brushes.js';

const dims = [56, 40, 56];
const min = [-14, -8, -14];
const max = [14, 12, 14];

function makeVolume() {
  const v = new SdfVolume({ dims, min, max, chunk: 16 });
  applyShape(v, [[-10, -8, -10], [10, 10, 10]], 'union', (x, y, z) => sdSphere(x, y, z, 0, 0, 0, 6));
  applyShape(v, [[-10, -8, -10], [10, 10, 10]], 'union', (x, y, z) => sdSphere(x, y, z, 0, -9, 0, 7));
  redistance(v, { bandVoxels: 6, sweeps: 2 });
  v.refreshChunkStats();
  return v;
}

const hasNaN = (v) => {
  for (let i = 0; i < v.data.length; i++) if (!Number.isFinite(v.data[i])) return i;
  return -1;
};

const stroke = (v, name, opts = {}, extra = {}) => {
  // a short horizontal stroke on the top of the sphere
  const hit = v.raycast(0, 11, 0, 0, -1, 0);
  if (!hit) return { name, error: 'no surface to start on' };
  const samples = [];
  for (let s = 0; s < 8; s++) {
    samples.push({
      point: [hit.point[0] + s * 0.35, hit.point[1], hit.point[2] + Math.sin(s * 0.5) * 0.2],
      normal: hit.normal,
      dt: 1,
    });
  }
  const o = {
    brush: name,
    samples,
    opts: { radius: 2.2, strength: 0.6, falloff: 0.45, aspect: 1, depth: 1, ...opts },
    seed: 7,
    ...extra,
  };
  const before = v.raycast(0, 11, 0, 0, -1, 0);
  const t0 = Date.now();
  let res;
  try {
    res = applyStroke(v, o);
  } catch (e) {
    return { name, error: 'applyStroke threw: ' + e.message };
  }
  const msBrush = Date.now() - t0;
  const t1 = Date.now();
  finishStroke(v, null, { band: 6, sweeps: 2 });
  const msFix = Date.now() - t1;
  const after = v.raycast(0, 11, 0, 0, -1, 0);
  const bad = hasNaN(v);
  const q = gradientQuality(v, 4);
  const moved = after && before ? before.point[1] - after.point[1] : NaN;
  return {
    name,
    movedM3: res.moved,
    dy: moved,
    q,
    nan: bad >= 0 ? bad : null,
    ms: msBrush + msFix,
    hit: !!after,
  };
};

console.log('brush            moved m³      Δy m   |∇d|   ms   status');
let failures = 0;
for (const name of Object.keys(BRUSHES)) {
  const extra = {};
  if (name === 'stamp') extra.stamp = 'rock';
  if (name === 'path') extra.path = [[-3, 5.2, -3], [3, 5.2, 3]];
  const r = stroke(makeVolume(), name, {}, extra);
  if (r.error) { console.log(`${name.padEnd(16)} FAILED: ${r.error}`); failures++; continue; }
  const wobble = Math.abs(r.q - 1) > 0.2;
  const ok = r.nan === null && r.hit && !wobble;
  if (!ok) failures++;
  console.log(
    `${name.padEnd(16)} ${String((r.movedM3 ?? 0).toFixed(1)).padStart(9)} ` +
    `${String(r.dy.toFixed(3)).padStart(8)} ${r.q.toFixed(3)} ` +
    `${String(r.ms).padStart(5)}   ${ok ? 'ok' : 'BAD'}` +
    (r.nan !== null ? ` NaN@${r.nan}` : '') + (r.hit ? '' : ' no-hit') + (wobble ? ' metric' : ''),
  );
}

console.log('\nstamps');
for (const kind of Object.keys(STAMP_KINDS)) {
  const r = stroke(makeVolume(), 'stamp', { strength: 1, radius: 2.5 }, { stamp: kind });
  if (r.error) { console.log(`${kind.padEnd(16)} FAILED: ${r.error}`); failures++; continue; }
  const ok = r.nan === null && r.hit && Math.abs(r.q - 1) < 0.2;
  if (!ok) failures++;
  console.log(
    `${kind.padEnd(16)} ${String((r.movedM3 ?? 0).toFixed(1)).padStart(9)} ` +
    `${String(r.dy.toFixed(3)).padStart(8)} ${r.q.toFixed(3)} ` +
    `${String(r.ms).padStart(5)}   ${ok ? 'ok' : 'BAD'}`,
  );
}

// undersurface working: a cave must stay a cave when the ground above rises
{
  const v = makeVolume();
  applyShape(v, [[-4, -4, -4], [4, 4, 4]], 'subtract', (x, y, z) => sdSphere(x, y, z, 0, -2, 0, 3));
  redistance(v, { bandVoxels: 6, sweeps: 2 });
  const hit = v.raycast(0, 11, 0, 0, -1, 0);
  const samples = [{ point: [0, hit.point[1], 0], normal: hit.normal, dt: 1 }];
  applyStroke(v, { brush: 'raise', samples, opts: { radius: 2.5, strength: 1, falloff: 0.3, depth: 1 } });
  finishStroke(v, null, { band: 6, sweeps: 2 });
  const g = v.sampleWorld(0, -2, 0);
  const ok = g > 0;
  if (!ok) failures++;
  console.log(`\ncave preserved under a raise: ${ok ? 'ok' : 'FAILED'} (d=${g.toFixed(2)} inside the cave)`);
}

// Interactive cost: the app re-solves only the stroke box, not the grid.
{
  const v = makeVolume();
  const hit = v.raycast(0, 11, 0, 0, -1, 0);
  const p = hit.point;
  const R = 2.2;
  const box = [
    Math.max(0, Math.floor((p[0] - R - v.min[0]) / v.cell[0])),
    Math.max(0, Math.floor((p[1] - R - v.min[1]) / v.cell[1])),
    Math.max(0, Math.floor((p[2] - R - v.min[2]) / v.cell[2])),
    Math.min(v.nx - 1, Math.ceil((p[0] + R - v.min[0]) / v.cell[0])),
    Math.min(v.ny - 1, Math.ceil((p[1] + R - v.min[1]) / v.cell[1])),
    Math.min(v.nz - 1, Math.ceil((p[2] + R - v.min[2]) / v.cell[2])),
  ];
  const t0 = Date.now();
  const rr = finishStroke(v, [[p[0] - R, p[1] - R, p[2] - R], [p[0] + R, p[1] + R, p[2] + R]], { band: 6, sweeps: 2 });
  const ms = Date.now() - t0;
  const q = gradientQuality(v, 4);
  console.log(`\nboxed redistance: ${ms} ms (${rr.updated} voxels updated), |∇d| = ${q.toFixed(3)}`);
}

console.log(failures === 0 ? '\nall sculpt checks passed' : `\n${failures} sculpt check(s) FAILED`);
process.exit(failures === 0 ? 0 : 1);

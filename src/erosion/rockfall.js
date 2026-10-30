/**
 * Deterministic, low-poly settled rockfall field for the GPU terrain viewport.
 *
 * The static instances are only the persistent, landed mass. The moving rock fragments,
 * abrasion and talus transfer remain in the WebGL2 particle solver. Instance transforms are
 * evaluated against the live heightfield so erosion can lower or bury their contact points.
 */
import { createRng } from '../core/prng.js';

export const MAX_SETTLED_BOULDERS = 448;

function normalize(v) {
  const length = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / length, v[1] / length, v[2] / length];
}

function midpoint(a, b) {
  return normalize([(a[0] + b[0]) * 0.5, (a[1] + b[1]) * 0.5, (a[2] + b[2]) * 0.5]);
}

/** Build one irregular, flat-shaded icosphere; instancing supplies each chunk's unique shape. */
export function createRockfallGeometry(seed = 4029) {
  const t = (1 + Math.sqrt(5)) / 2;
  const base = [
    [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
    [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
    [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
  ].map(normalize);
  const faces = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
    [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
    [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
  ];

  const midpointCache = new Map();
  const edgeMid = (a, b) => {
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    const key = `${lo}:${hi}`;
    if (!midpointCache.has(key)) {
      midpointCache.set(key, base.push(midpoint(base[lo], base[hi])) - 1);
    }
    return midpointCache.get(key);
  };

  const subdivided = [];
  for (const [a, b, c] of faces) {
    const ab = edgeMid(a, b);
    const bc = edgeMid(b, c);
    const ca = edgeMid(c, a);
    subdivided.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
  }

  const rng = createRng(`${seed}:rock-mesh`);
  const deformed = base.map((v) => {
    const radial = 0.86 + rng.range(0, 0.24);
    return [v[0] * radial, v[1] * radial, v[2] * radial];
  });
  const positions = [];
  const normals = [];

  for (const face of subdivided) {
    let [ia, ib, ic] = face;
    let a = deformed[ia];
    let b = deformed[ib];
    let c = deformed[ic];
    const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    let normal = normalize([
      ab[1] * ac[2] - ab[2] * ac[1],
      ab[2] * ac[0] - ab[0] * ac[2],
      ab[0] * ac[1] - ab[1] * ac[0],
    ]);
    const center = [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3];
    if (normal[0] * center[0] + normal[1] * center[1] + normal[2] * center[2] < 0) {
      [ib, ic] = [ic, ib];
      b = deformed[ib];
      c = deformed[ic];
      normal = [-normal[0], -normal[1], -normal[2]];
    }
    for (const p of [a, b, c]) {
      positions.push(p[0], p[1], p[2]);
      normals.push(normal[0], normal[1], normal[2]);
    }
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
  };
}

/**
 * Stratified deterministic scatter. Large angular blocks are rare; the shader chooses exposed
 * slope/cliff sites and rolls them a short distance downhill before settling them on the terrain.
 * Each record is [x, z, rx, ry, rz, yaw, siteThreshold, albedoVariation].
 */
export function createRockfallInstances(seed, worldSpan, count = MAX_SETTLED_BOULDERS) {
  const total = Math.max(0, Math.min(MAX_SETTLED_BOULDERS, Math.floor(count)));
  const rng = createRng(`${seed}:settled-rocks`);
  const columns = Math.ceil(Math.sqrt(MAX_SETTLED_BOULDERS));
  const rows = Math.ceil(MAX_SETTLED_BOULDERS / columns);
  const cells = Array.from({ length: MAX_SETTLED_BOULDERS }, (_, i) => i);
  for (let i = cells.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }

  const records = new Float32Array(total * 8);
  const span = Math.max(1, Number(worldSpan) || 1);
  for (let i = 0; i < total; i++) {
    const cell = cells[i];
    const col = cell % columns;
    const row = Math.floor(cell / columns);
    const x = ((col + rng.range(0.08, 0.92)) / columns - 0.5) * span * 0.94;
    const z = ((row + rng.range(0.08, 0.92)) / rows - 0.5) * span * 0.94;

    const sizeClass = rng.float();
    const radius = sizeClass > 0.965
      ? rng.range(8.0, 13.0)
      : (sizeClass > 0.70 ? rng.range(4.1, 7.4) : rng.range(1.8, 4.5));
    const rx = radius * rng.range(0.78, 1.38);
    const ry = radius * rng.range(0.48, 0.88);
    const rz = radius * rng.range(0.72, 1.34);
    const yaw = rng.float() * Math.PI * 2;
    const threshold = rng.range(0.05, 0.92);
    const albedoVariation = rng.signed() * 0.16;
    const offset = i * 8;
    records[offset] = x;
    records[offset + 1] = z;
    records[offset + 2] = rx;
    records[offset + 3] = ry;
    records[offset + 4] = rz;
    records[offset + 5] = yaw;
    records[offset + 6] = threshold;
    records[offset + 7] = albedoVariation;
  }
  return records;
}

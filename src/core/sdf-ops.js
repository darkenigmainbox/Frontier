/* ============================================================
 * Frontier · SDF terrain — primitives, CSG and field operators
 *
 * Every sculpting tool, every stamp and the base-terrain builder go
 * through these operators, so there is exactly one place where the
 * SDF algebra lives. All of them mutate an SdfVolume *in place* over
 * a bounded box (never the whole grid), and skip voxels that cannot
 * be affected, which is what keeps brush strokes interactive.
 * ============================================================ */

/* ---------------------------- primitives ---------------------------- */

export const sdSphere = (x, y, z, cx, cy, cz, r) =>
  Math.hypot(x - cx, y - cy, z - cz) - r;

export const sdBox = (x, y, z, cx, cy, cz, bx, by, bz) => {
  const qx = Math.abs(x - cx) - bx, qy = Math.abs(y - cy) - by, qz = Math.abs(z - cz) - bz;
  const ox = Math.max(qx, 0), oy = Math.max(qy, 0), oz = Math.max(qz, 0);
  return Math.hypot(ox, oy, oz) + Math.min(Math.max(qx, qy, qz), 0);
};

/** Rounded box with per-axis half extents `b*` and rounding radius `r`. */
export const sdRoundBox = (x, y, z, cx, cy, cz, bx, by, bz, r) =>
  sdBox(x, y, z, cx, cy, cz, bx - r, by - r, bz - r) - r;

export const sdCapsule = (x, y, z, ax, ay, az, bx, by, bz, r) => {
  const pax = x - ax, pay = y - ay, paz = z - az;
  const bax = bx - ax, bay = by - ay, baz = bz - az;
  const denom = bax * bax + bay * bay + baz * baz || 1e-9;
  let h = (pax * bax + pay * bay + paz * baz) / denom;
  h = h < 0 ? 0 : h > 1 ? 1 : h;
  return Math.hypot(pax - bax * h, pay - bay * h, paz - baz * h) - r;
};

export const sdPlaneY = (x, y, z, planeY) => y - planeY;

/** Infinite vertical cylinder (soft-edged cone) around the Y axis. */
export const sdCylinderY = (x, y, z, cx, cz, r) => Math.hypot(x - cx, z - cz) - r;

export const sdConeY = (x, y, z, cx, cy, cz, r, halfH) => {
  const qx = x - cx, qz = z - cz;
  const q = Math.hypot(qx, qz);
  const w = Math.abs(y - cy) - halfH;
  return Math.max(q - r * (1 - Math.abs(y - cy) / Math.max(halfH, 1e-6)) * 0.5, w);
};

export const sdTorusY = (x, y, z, cx, cy, cz, R, r) =>
  Math.hypot(Math.hypot(x - cx, z - cz) - R, y - cy) - r;

/* ------------------------------- CSG -------------------------------- */

export const smin = (a, b, k) => {
  if (k <= 0) return Math.min(a, b);
  const h = Math.min(Math.max(0.5 + 0.5 * (b - a) / k, 0), 1);
  return b + (a - b) * h - k * h * (1 - h);
};

export const smax = (a, b, k) => {
  if (k <= 0) return Math.max(a, b);
  const h = Math.min(Math.max(0.5 - 0.5 * (b - a) / k, 0), 1);
  return b + (a - b) * h + k * h * (1 - h);
};

/* --------------------------- field helpers -------------------------- */

/** World-space AABB of a sphere, padded. */
export const sphereBox = (c, r, pad = 0) => [
  [c[0] - r - pad, c[1] - r - pad, c[2] - r - pad],
  [c[0] + r + pad, c[1] + r + pad, c[2] + r + pad],
];

export const unionBox = (a, b) => [
  [Math.min(a[0][0], b[0][0]), Math.min(a[0][1], b[0][1]), Math.min(a[0][2], b[0][2])],
  [Math.max(a[1][0], b[1][0]), Math.max(a[1][1], b[1][1]), Math.max(a[1][2], b[1][2])],
];

/**
 * Apply an SDF operator to the volume over a world-space box.
 *
 * @param {import('./sdf-volume.js').SdfVolume} vol
 * @param {number[][]} box  [[minX,minY,minZ],[maxX,maxY,maxZ]]
 * @param {'union'|'subtract'|'intersect'|'replace'} op
 * @param {(x:number,y:number,z:number)=>number} shape  world-space SDF of the tool
 * @param {object} [opt]
 * @param {number} [opt.k=0]        smooth-blend radius (metres)
 * @param {number} [opt.strength=1] blend weight 0..1 (soft brush strokes)
 * @param {(x:number,y:number,z:number,d:number)=>number} [opt.mask]
 *        per-voxel weight multiplier (slope/height/noise masking)
 * @param {boolean} [opt.absoluteY=false] mask receives the raw distance
 */
export function applyShape(vol, box, op, shape, opt = {}) {
  const k = opt.k ?? 0;
  const strength = opt.strength ?? 1;
  const mask = opt.mask || null;
  // Two radii on purpose:
  //  · `margin` widens the *evaluation* box: every voxel whose stored value
  //    the new geometry could invalidate has to be visited. It is at least
  //    one band wide, otherwise a voxel just outside the tool box would keep
  //    a placeholder distance that now over-promises.
  //  · `cull` is how far the smooth blend reaches — it decides whether the
  //    new value can differ from the old one at all.
  const cull = k + 2 * Math.max(...vol.cell);
  const margin = Math.max(cull, vol.band);
  const bnd = vol.band;
  let touched = 0;
  vol.forEachVoxelInBox(box[0], box[1], margin, (x, y, z, i) => {
    const [wx, wy, wz] = vol.voxelToWorld(x, y, z, TMP_P);
    const s = shape(wx, wy, wz);
    const cur = vol.data[i];
    // Cheap cull: the operator cannot move this voxel, so leave it alone.
    // (union keeps the smaller of the two values, subtract the larger; any
    //  voxel the operator *would* change fails the test and gets written.)
    if (op === 'union' && s > cur + cull) return;
    if (op === 'subtract' && -s < cur - cull) return;
    if (op === 'intersect' && s < cur - cull) return;
    let w = strength;
    if (mask) {
      w *= mask(wx, wy, wz, cur);
      if (w <= 1e-4) return;
    }
    let v;
    if (op === 'union') v = w >= 1 ? smin(cur, s, k) : lerp(cur, smin(cur, s, k), w);
    else if (op === 'subtract') v = w >= 1 ? smax(cur, -s, k) : lerp(cur, smax(cur, -s, k), w);
    else if (op === 'intersect') v = w >= 1 ? smax(cur, s, k) : lerp(cur, smax(cur, s, k), w);
    else v = lerp(cur, s, w);
    // keep the truncated-SDF invariant (see BAND_VOXELS in sdf-volume.js)
    vol.data[i] = v > bnd ? bnd : v < -bnd ? -bnd : v;
    touched++;
  });
  vol.markDirtyBox(box[0], box[1]);
  return touched;
}

const TMP_P = [0, 0, 0];
const lerp = (a, b, t) => a + (b - a) * t;

/**
 * Displace the surface along its own normal by a noise field. This is
 * what gives stamps (rocks, dunes, craters) their fractal detail without
 * ever leaving SDF space: only the *values* change, never the topology.
 */
export function displaceShape(vol, box, fn, strength = 1) {
  const bnd = vol.band;
  vol.forEachVoxelInBox(box[0], box[1], 0, (x, y, z, i) => {
    const [wx, wy, wz] = vol.voxelToWorld(x, y, z, TMP_P);
    const v = vol.data[i] + strength * fn(wx, wy, wz);
    vol.data[i] = v > bnd ? bnd : v < -bnd ? -bnd : v;
  });
  vol.markDirtyBox(box[0], box[1]);
}

/**
 * Extrude material *along the surface normal* over a region: the base of
 * every "raise/pinch/inflate" brush. Works from the gradient, so it never
 * punches through thin walls the way a pure plane offset would.
 */
export function normalOffset(vol, box, amount, mask = null) {
  vol.forEachVoxelInBox(box[0], box[1], 0, (x, y, z, i) => {
    const [wx, wy, wz] = vol.voxelToWorld(x, y, z, TMP_P);
    let a = amount;
    if (mask) {
      a *= mask(wx, wy, wz, vol.data[i]);
      if (Math.abs(a) < 1e-5) return;
    }
    const n = vol.normal(wx, wy, wz, TMP_N);
    // moving the iso-surface along n by `a` == subtracting a·n from the field
    let v = vol.data[i] - a * (n[0] * n[0] + n[1] * n[1] + n[2] * n[2]); // |∇d|≈1 ⇒ n·∇d ≈ 1
    const bnd = vol.band;
    if (v > bnd) v = bnd; else if (v < -bnd) v = -bnd;
    vol.data[i] = v;
  });
  vol.markDirtyBox(box[0], box[1]);
}

const TMP_N = [0, 1, 0];

/**
 * Advect the field by a vector: the whole region shifts (used by the
 * "smooth warp" brush and by the wind-drift sand tool).
 */
export function translateRegion(vol, box, dx, dy, dz) {
  const src = vol.clone();
  const bnd = vol.band;
  vol.forEachVoxelInBox(box[0], box[1], 0, (x, y, z, i) => {
    const [wx, wy, wz] = vol.voxelToWorld(x, y, z, TMP_P);
    let v = src.sampleWorld(wx - dx, wy - dy, wz - dz);
    if (v > bnd) v = bnd; else if (v < -bnd) v = -bnd;
    vol.data[i] = v;
  });
  vol.markDirtyBox(box[0], box[1]);
}

/* ------------------------------ strokes ----------------------------- */

/** Distance from a point to a polyline (a brush stroke path). */
export function distanceToPath(px, py, pz, path) {
  let best = Infinity;
  for (let i = 0; i + 1 < path.length; i++) {
    const a = path[i], b = path[i + 1];
    const bax = b[0] - a[0], bay = b[1] - a[1], baz = b[2] - a[2];
    const denom = bax * bax + bay * bay + baz * baz || 1e-9;
    let h = ((px - a[0]) * bax + (py - a[1]) * bay + (pz - a[2]) * baz) / denom;
    h = h < 0 ? 0 : h > 1 ? 1 : h;
    const d = Math.hypot(px - (a[0] + bax * h), py - (a[1] + bay * h), pz - (a[2] + baz * h));
    if (d < best) best = d;
  }
  return best;
}

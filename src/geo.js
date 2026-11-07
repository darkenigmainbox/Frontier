// Procedural geometry primitives + a mesh builder that bakes everything into
// one big vertex/index buffer with per-material draw ranges.
import { m4, mul, transformPoint, transformDir, normalize3 } from './math.js';

const V = {
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  scale: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ],
  len: (a) => Math.hypot(a[0], a[1], a[2]),
  norm: (a) => {
    const l = Math.hypot(a[0], a[1], a[2]) || 1;
    return [a[0] / l, a[1] / l, a[2] / l];
  },
  lerp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
};

export function blank() {
  return { pos: [], nrm: [], uv: [], idx: [] };
}

function pushVert(g, p, n, u, v) {
  g.pos.push(p[0], p[1], p[2]);
  g.nrm.push(n[0], n[1], n[2]);
  g.uv.push(u, v);
  return g.pos.length / 3 - 1;
}

/** Quad from 4 corners in CCW order (viewed from the front). */
function quad(g, a, b, c, d, n, uvs) {
  const i0 = pushVert(g, a, n, uvs[0], uvs[1]);
  const i1 = pushVert(g, b, n, uvs[2], uvs[3]);
  const i2 = pushVert(g, c, n, uvs[4], uvs[5]);
  const i3 = pushVert(g, d, n, uvs[6], uvs[7]);
  g.idx.push(i0, i1, i2, i0, i2, i3);
}

/**
 * Axis aligned box centred at the origin.
 * UVs are in world units so tiling stays consistent between differently sized boxes.
 */
export function box(w = 1, h = 1, d = 1) {
  const g = blank();
  const hw = w / 2, hh = h / 2, hd = d / 2;
  // normal, u axis (-> +x of the face), v axis (-> +y of the face), half extents
  const faces = [
    { n: [1, 0, 0], u: [0, 0, -1], v: [0, 1, 0], su: hd, sv: hh, c: [hw, 0, 0] },
    { n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0], su: hd, sv: hh, c: [-hw, 0, 0] },
    { n: [0, 1, 0], u: [1, 0, 0], v: [0, 0, -1], su: hw, sv: hd, c: [0, hh, 0] },
    { n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1], su: hw, sv: hd, c: [0, -hh, 0] },
    { n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0], su: hw, sv: hh, c: [0, 0, hd] },
    { n: [0, 0, -1], u: [-1, 0, 0], v: [0, 1, 0], su: hw, sv: hh, c: [0, 0, -hd] },
  ];

  for (const f of faces) {
    const corner = (su, sv) => V.add(f.c, V.add(V.scale(f.u, su * f.su), V.scale(f.v, sv * f.sv)));
    const a = corner(-1, -1), b = corner(1, -1), c = corner(1, 1), d = corner(-1, 1);
    const uw = f.su * 2, vh = f.sv * 2;
    // Offset the UV origin so the pattern doesn't mirror between faces.
    const uo = V.dot(f.c, f.n) * 0.5;
    quad(g, a, b, c, d, f.n, [uo, 0, uo + uw, 0, uo + uw, vh, uo, vh]);
  }
  return g;
}

/** Cylinder / cone along +Y, base at y = 0. u = around (0..1), v = height in world units. */
export function cylinder(rBottom = 1, rTop = 1, h = 1, sides = 16, opts = {}) {
  const g = blank();
  const { capBottom = true, capTop = true, uvScale = 1 } = opts;
  const slope = (rBottom - rTop) / (h || 1);

  for (let i = 0; i <= sides; i++) {
    const a = (i / sides) * Math.PI * 2;
    const sx = Math.sin(a), cz = Math.cos(a);
    const n = V.norm([sx, slope, cz]);
    pushVert(g, [sx * rBottom, 0, cz * rBottom], n, (i / sides) * uvScale, 0);
    pushVert(g, [sx * rTop, h, cz * rTop], n, (i / sides) * uvScale, h);
  }
  for (let i = 0; i < sides; i++) {
    const a = i * 2, b = a + 2;
    g.idx.push(a, b, b + 1, a, b + 1, a + 1);
  }

  if (capTop && rTop > 1e-5) {
    const base = g.pos.length / 3;
    pushVert(g, [0, h, 0], [0, 1, 0], 0.5, 0.5);
    for (let i = 0; i <= sides; i++) {
      const a = (i / sides) * Math.PI * 2;
      pushVert(g, [Math.sin(a) * rTop, h, Math.cos(a) * rTop], [0, 1, 0], 0.5 + Math.sin(a) * 0.5, 0.5 + Math.cos(a) * 0.5);
    }
    for (let i = 0; i < sides; i++) g.idx.push(base, base + 1 + i, base + 2 + i);
  }
  if (capBottom && rBottom > 1e-5) {
    const base = g.pos.length / 3;
    pushVert(g, [0, 0, 0], [0, -1, 0], 0.5, 0.5);
    for (let i = 0; i <= sides; i++) {
      const a = (i / sides) * Math.PI * 2;
      pushVert(g, [Math.sin(a) * rBottom, 0, Math.cos(a) * rBottom], [0, -1, 0], 0.5 + Math.sin(a) * 0.5, 0.5 + Math.cos(a) * 0.5);
    }
    for (let i = 0; i < sides; i++) g.idx.push(base, base + 2 + i, base + 1 + i);
  }
  return g;
}

/** UV sphere radius r centred on the origin. */
export function sphere(r = 1, segU = 16, segV = 12) {
  const g = blank();
  for (let j = 0; j <= segV; j++) {
    const theta = (j / segV) * Math.PI;
    const y = Math.cos(theta), rad = Math.sin(theta);
    for (let i = 0; i <= segU; i++) {
      const phi = (i / segU) * Math.PI * 2;
      const p = [Math.sin(phi) * rad * r, y * r, Math.cos(phi) * rad * r];
      pushVert(g, p, V.norm(p), i / segU, j / segV);
    }
  }
  for (let j = 0; j < segV; j++) {
    for (let i = 0; i < segU; i++) {
      const a = j * (segU + 1) + i;
      const b = a + segU + 1;
      g.idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  return g;
}

/**
 * Sweep a circle along a polyline using parallel transport frames.
 * radius may be a number or fn(t) for a tapered sweep.
 * u = around the tube, v = distance along the tube (world units).
 */
export function tube(points, radius = 0.2, sides = 10, opts = {}) {
  const g = blank();
  const { capStart = true, capEnd = true } = opts;
  const n = points.length;
  if (n < 2) return g;

  const tangents = [];
  for (let i = 0; i < n; i++) {
    const a = points[Math.max(0, i - 1)];
    const b = points[Math.min(n - 1, i + 1)];
    tangents.push(V.norm(V.sub(b, a)));
  }

  let ref = Math.abs(tangents[0][1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
  let nrmA = V.norm(V.cross(ref, tangents[0]));
  const frames = [];
  for (let i = 0; i < n; i++) {
    if (i > 0) {
      const t = tangents[i];
      nrmA = V.norm(V.sub(nrmA, V.scale(t, V.dot(nrmA, t))));
    }
    frames.push([nrmA, V.cross(tangents[i], nrmA)]);
  }

  let dist = 0;
  const ringStart = [];
  for (let i = 0; i < n; i++) {
    if (i > 0) dist += V.len(V.sub(points[i], points[i - 1]));
    const t = i / (n - 1);
    const rr = typeof radius === 'function' ? radius(t) : radius;
    ringStart.push(g.pos.length / 3);
    for (let s = 0; s <= sides; s++) {
      const a = (s / sides) * Math.PI * 2;
      const dir = V.add(V.scale(frames[i][0], Math.cos(a)), V.scale(frames[i][1], Math.sin(a)));
      pushVert(g, V.add(points[i], V.scale(dir, rr)), dir, s / sides, dist);
    }
  }

  for (let i = 0; i < n - 1; i++) {
    for (let s = 0; s < sides; s++) {
      const a = ringStart[i] + s;
      const b = ringStart[i + 1] + s;
      g.idx.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }

  if (capStart) {
    const c = g.pos.length / 3;
    const t = V.scale(tangents[0], -1);
    pushVert(g, points[0], t, 0.5, 0);
    const base = g.pos.length / 3;
    for (let s = 0; s <= sides; s++) {
      const i = ringStart[0] + s;
      pushVert(g, [g.pos[i * 3], g.pos[i * 3 + 1], g.pos[i * 3 + 2]], t, s / sides, 0);
    }
    for (let s = 0; s < sides; s++) g.idx.push(c, base + s + 1, base + s);
  }
  if (capEnd) {
    const last = n - 1;
    const t = tangents[last];
    const c = g.pos.length / 3;
    pushVert(g, points[last], t, 0.5, 0);
    const base = g.pos.length / 3;
    for (let s = 0; s <= sides; s++) {
      const i = ringStart[last] + s;
      pushVert(g, [g.pos[i * 3], g.pos[i * 3 + 1], g.pos[i * 3 + 2]], t, s / sides, 0);
    }
    for (let s = 0; s < sides; s++) g.idx.push(c, base + s, base + s + 1);
  }
  return g;
}

/**
 * Flat disc / coin lying in XZ, centred on origin, top face at y = +t/2.
 * uv carries normalised planar coordinates (-1..1) so the shader can draw
 * concentric candy swirls.
 */
export function disc(r = 1, sides = 48, thickness = 0.1) {
  const g = blank();
  const y0 = -thickness / 2, y1 = thickness / 2;
  // top
  let base = g.pos.length / 3;
  pushVert(g, [0, y1, 0], [0, 1, 0], 0, 0);
  for (let i = 0; i <= sides; i++) {
    const a = (i / sides) * Math.PI * 2;
    const x = Math.sin(a) * r, z = Math.cos(a) * r;
    pushVert(g, [x, y1, z], [0, 1, 0], x / r, z / r);
  }
  for (let i = 0; i < sides; i++) g.idx.push(base, base + 1 + i, base + 2 + i);
  // bottom
  base = g.pos.length / 3;
  pushVert(g, [0, y0, 0], [0, -1, 0], 0, 0);
  for (let i = 0; i <= sides; i++) {
    const a = (i / sides) * Math.PI * 2;
    const x = Math.sin(a) * r, z = Math.cos(a) * r;
    pushVert(g, [x, y0, z], [0, -1, 0], x / r, z / r);
  }
  for (let i = 0; i < sides; i++) g.idx.push(base, base + 2 + i, base + 1 + i);
  // rim
  for (let i = 0; i <= sides; i++) {
    const a = (i / sides) * Math.PI * 2;
    const sx = Math.sin(a), cz = Math.cos(a);
    pushVert(g, [sx * r, y1, cz * r], [sx, 0, cz], sx, cz);
    pushVert(g, [sx * r, y0, cz * r], [sx, 0, cz], sx, cz);
  }
  const rim = g.pos.length / 3 - (sides + 1) * 2;
  for (let i = 0; i < sides; i++) {
    const a = rim + i * 2;
    g.idx.push(a, a + 1, a + 2, a + 2, a + 1, a + 3);
  }
  return g;
}

/** Triangular prism: ridge along X at y = h, base spanning z in [-d/2, d/2]. */
export function triPrism(w = 1, h = 1, d = 1) {
  const g = blank();
  const hw = w / 2, hd = d / 2;
  const nSlope = V.norm([0, hd, -h]);
  const nSlope2 = V.norm([0, hd, h]);

  // -Z slope
  quad(g, [-hw, 0, -hd], [-hw, h, 0], [hw, h, 0], [hw, 0, -hd], nSlope, [0, 0, 0, 1, w, 1, w, 0]);
  // +Z slope
  quad(g, [-hw, 0, hd], [hw, 0, hd], [hw, h, 0], [-hw, h, 0], nSlope2, [0, 0, w, 0, w, 1, 0, 1]);
  // bottom
  quad(g, [-hw, 0, -hd], [hw, 0, -hd], [hw, 0, hd], [-hw, 0, hd], [0, -1, 0], [0, 0, w, 0, w, d, 0, d]);
  // end caps (corners ordered so the winding faces outward)
  quad(g, [hw, 0, -hd], [hw, h, 0], [hw, 0, hd], [hw, 0, hd], [1, 0, 0], [0, 0, h, 0, d, 0, d, 0]);
  quad(g, [-hw, 0, hd], [-hw, h, 0], [-hw, 0, -hd], [-hw, 0, -hd], [-1, 0, 0], [0, 0, h, 0, d, 0, d, 0]);
  return g;
}

/** Flat strip swept along a path, facing up. side = constant lateral direction. */
export function ribbon(points, side, width) {
  const g = blank();
  const n = points.length;
  const hw = width / 2;
  for (let i = 0; i < n; i++) {
    const p = points[i][1];
    const l = V.add(p, V.scale(side, -hw));
    const r = V.add(p, V.scale(side, hw));
    pushVert(g, l, [0, 1, 0], 0, points[i][0]);
    pushVert(g, r, [0, 1, 0], width, points[i][0]);
  }
  // Flip winding if (path x side) points down, so the strip always faces up.
  const pathDir = V.sub(points[Math.min(1, n - 1)][1], points[0][1]);
  const upward = V.dot(V.cross(pathDir, side), [0, 1, 0]) < 0;
  for (let i = 0; i < n - 1; i++) {
    const a = i * 2;
    if (upward) g.idx.push(a, a + 1, a + 2, a + 2, a + 1, a + 3);
    else g.idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  return g;
}

/**
 * Regular grid on XZ. heightFn(x, z) -> y. Normals from finite differences.
 */
export function grid(size = 100, segs = 64, heightFn = () => 0) {
  const g = blank();
  const half = size / 2;
  const step = size / segs;
  const e = 0.35;
  for (let j = 0; j <= segs; j++) {
    for (let i = 0; i <= segs; i++) {
      const x = -half + i * step;
      const z = -half + j * step;
      const y = heightFn(x, z);
      const hx = heightFn(x + e, z) - heightFn(x - e, z);
      const hz = heightFn(x, z + e) - heightFn(x, z - e);
      pushVert(g, [x, y, z], V.norm([-hx, 2 * e, -hz]), x, z);
    }
  }
  for (let j = 0; j < segs; j++) {
    for (let i = 0; i < segs; i++) {
      const a = j * (segs + 1) + i;
      const b = a + segs + 1;
      g.idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  return g;
}

// ---------------------------------------------------------------------------
// Builder: bakes primitives into flat arrays, merging draw calls by material.
// ---------------------------------------------------------------------------

const matKey = (mat) =>
  `${mat.id}|${mat.rough}|${mat.emissive}|${mat.color1.join(',')}|${mat.color2.join(',')}|${mat.p.join(',')}`;

export class Builder {
  constructor() {
    this.pos = [];
    this.nrm = [];
    this.uv = [];
    this.ext = [];
    this.idx = [];
    this.draws = [];
    this.bases = {};
    this.M = m4();
    this.stack = [];
    this.triangles = 0;
  }

  push(matrix) {
    this.stack.push(this.M);
    this.M = mul(this.M, matrix);
    return this;
  }

  pop() {
    this.M = this.stack.pop() || m4();
    return this;
  }

  /** Register a reusable primitive (for instanced draws) without creating a draw. */
  base(name, geo) {
    const range = this.#append(geo, m4(), 1, 0);
    this.bases[name] = range;
    return range;
  }

  /**
   * Append a primitive. opts: { m (local matrix), ao, variant }
   */
  add(geo, mat, opts = {}) {
    const local = opts.m ? mul(this.M, opts.m) : this.M;
    const range = this.#append(geo, local, opts.ao ?? 1, opts.variant ?? 0);

    const key = matKey(mat);
    const last = this.draws[this.draws.length - 1];
    if (last && last.key === key && !last.useInstance && last.firstIndex + last.indexCount === range.firstIndex) {
      last.indexCount += range.indexCount;
      last.triangles += range.indexCount / 3;
    } else {
      this.draws.push({
        key,
        firstIndex: range.firstIndex,
        indexCount: range.indexCount,
        triangles: range.indexCount / 3,
        matId: mat.id,
        rough: mat.rough,
        emissive: mat.emissive,
        color1: mat.color1,
        color2: mat.color2,
        p: mat.p,
        useInstance: 0,
        instanceOffset: 0,
        instanceCount: 1,
        castShadow: mat.castShadow !== false,
      });
    }
    return range;
  }

  /** A draw reusing a registered base primitive, driven by per-instance transforms. */
  addInstanced(baseName, mat, instanceOffset, instanceCount) {
    if (instanceCount <= 0) return;
    const range = this.bases[baseName];
    if (!range) throw new Error(`Unknown base primitive: ${baseName}`);
    this.draws.push({
      key: `${matKey(mat)}|inst${instanceOffset}`,
      firstIndex: range.firstIndex,
      indexCount: range.indexCount,
      triangles: (range.indexCount / 3) * instanceCount,
      matId: mat.id,
      rough: mat.rough,
      emissive: mat.emissive,
      color1: mat.color1,
      color2: mat.color2,
      p: mat.p,
      useInstance: 1,
      instanceOffset,
      instanceCount,
      castShadow: mat.castShadow !== false,
    });
  }

  #append(geo, matrix, ao, variant) {
    const firstIndex = this.idx.length;
    const vbase = this.pos.length / 3;
    const count = geo.pos.length / 3;

    for (let i = 0; i < count; i++) {
      const p = transformPoint(matrix, [geo.pos[i * 3], geo.pos[i * 3 + 1], geo.pos[i * 3 + 2]]);
      const nn = normalize3(transformDir(matrix, [geo.nrm[i * 3], geo.nrm[i * 3 + 1], geo.nrm[i * 3 + 2]]));
      this.pos.push(p[0], p[1], p[2]);
      this.nrm.push(nn[0], nn[1], nn[2]);
      this.uv.push(geo.uv[i * 2], geo.uv[i * 2 + 1]);
      this.ext.push(ao, variant);
    }
    for (let i = 0; i < geo.idx.length; i++) this.idx.push(geo.idx[i] + vbase);

    this.triangles += geo.idx.length / 3;
    return { firstIndex, indexCount: geo.idx.length };
  }

  build() {
    return {
      positions: new Float32Array(this.pos),
      normals: new Float32Array(this.nrm),
      uvs: new Float32Array(this.uv),
      extras: new Float32Array(this.ext),
      indices: new Uint32Array(this.idx),
      draws: this.draws,
      vertexCount: this.pos.length / 3,
      triangleCount: this.triangles,
      bases: this.bases,
    };
  }
}

export const vec = V;

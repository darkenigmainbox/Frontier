// Frontier geometry utilities — polylines, Catmull-Rom sampling, intersections.
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;

export function dist2D(ax, az, bx, bz) {
  return Math.hypot(bx - ax, bz - az);
}

// Distance from point P to segment AB, returns {d, t, x, z}
export function pointToSegment(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const len2 = dx * dx + dz * dz;
  let t = 0;
  if (len2 > 1e-9) t = ((px - ax) * dx + (pz - az) * dz) / len2;
  t = clamp(t, 0, 1);
  const x = ax + dx * t, z = az + dz * t;
  return { d: Math.hypot(px - x, pz - z), t, x, z };
}

// Segment-segment intersection. Returns {x, z, t, u} or null.
export function segmentsIntersect(ax, az, bx, bz, cx, cz, dx, dz) {
  const rX = bx - ax, rZ = bz - az;
  const sX = dx - cx, sZ = dz - cz;
  const denom = rX * sZ - rZ * sX;
  if (Math.abs(denom) < 1e-9) return null;
  const t = ((cx - ax) * sZ - (cz - az) * sX) / denom;
  const u = ((cx - ax) * rZ - (cz - az) * rX) / denom;
  if (t >= -1e-6 && t <= 1 + 1e-6 && u >= -1e-6 && u <= 1 + 1e-6) {
    return { x: ax + rX * t, z: az + rZ * t, t: clamp(t, 0, 1), u: clamp(u, 0, 1) };
  }
  return null;
}

function catmullPoint(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  return {
    x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    z: 0.5 * (2 * p1.z + (-p0.z + p2.z) * t + (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 + (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t3),
  };
}

// Sample a polyline with optional Catmull-Rom smoothing.
// points: [{x,z}], returns samples [{x,z,dirx,dirz,dist,seg}]
export function samplePolyline(points, { closed = false, smooth = true, step = 2.0 } = {}) {
  if (!points || points.length < 2) return [];
  const pts = points.map((p) => ({ x: p.x, z: p.z }));
  if (closed && pts.length > 2) {
    // ensure closure handled in sampling
  }
  let dense = [];
  const useSmooth = smooth && pts.length > 2;
  if (!useSmooth) {
    // straight, but subdivide to step
    for (let i = 0; i < pts.length - (closed ? 0 : 1); i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      const len = dist2D(a.x, a.z, b.x, b.z);
      const n = Math.max(1, Math.ceil(len / step));
      for (let k = 0; k < n; k++) {
        const t = k / n;
        dense.push({ x: lerp(a.x, b.x, t), z: lerp(a.z, b.z, t), seg: i });
      }
    }
    dense.push({ ...pts[closed ? 0 : pts.length - 1], seg: pts.length - 1 });
  } else {
    const n = pts.length;
    const count = closed ? n : n - 1;
    for (let i = 0; i < count; i++) {
      const p0 = pts[closed ? (i - 1 + n) % n : Math.max(0, i - 1)];
      const p1 = pts[closed ? i % n : i];
      const p2 = pts[closed ? (i + 1) % n : i + 1];
      const p3 = pts[closed ? (i + 2) % n : Math.min(n - 1, i + 2)];
      const approxLen = dist2D(p1.x, p1.z, p2.x, p2.z);
      const m = Math.max(2, Math.ceil(approxLen / step));
      for (let k = 0; k < m; k++) {
        const t = k / m;
        const p = catmullPoint(p0, p1, p2, p3, t);
        dense.push({ x: p.x, z: p.z, seg: i });
      }
    }
    dense.push({ ...pts[closed ? 0 : n - 1], seg: count - 1 });
  }
  // compute distance + direction
  let dist = 0;
  for (let i = 0; i < dense.length; i++) {
    if (i > 0) dist += dist2D(dense[i - 1].x, dense[i - 1].z, dense[i].x, dense[i].z);
    dense[i].dist = dist;
  }
  for (let i = 0; i < dense.length; i++) {
    const a = dense[Math.max(0, i - 1)], b = dense[Math.min(dense.length - 1, i + 1)];
    const dx = b.x - a.x, dz = b.z - a.z;
    const l = Math.hypot(dx, dz) || 1;
    dense[i].dirx = dx / l; dense[i].dirz = dz / l;
  }
  return dense;
}

// Angle of vector
export function angleOf(dx, dz) { return Math.atan2(dz, dx); }

export function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// Deterministic hash noise
export function hashNoise(x, z) {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

export function smoothNoise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z);
  const xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hashNoise(xi, zi), b = hashNoise(xi + 1, zi);
  const c = hashNoise(xi, zi + 1), d = hashNoise(xi + 1, zi + 1);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}

export function fbm(x, z, oct = 4) {
  let v = 0, amp = 0.5, f = 1;
  for (let i = 0; i < oct; i++) {
    v += amp * smoothNoise(x * f, z * f);
    amp *= 0.5; f *= 2.03;
  }
  return v;
}

let _uid = 1;
export function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}${(_uid++).toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
}

export function deepClone(o) { return JSON.parse(JSON.stringify(o)); }

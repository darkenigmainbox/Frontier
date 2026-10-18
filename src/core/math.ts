// ─── Geometry & noise helpers (pure, DOM-free) ───────────────────────────────

export interface V2 { x: number; y: number }

export const TAU = Math.PI * 2;

export function clamp(v: number, a: number, b: number): number {
  return v < a ? a : v > b ? b : v;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function dist2(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx, dy = ay - by;
  return dx * dx + dy * dy;
}

export function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.sqrt(dist2(ax, ay, bx, by));
}

/** Deterministic hash-based value noise in [0,1]. */
export function hash2(x: number, y: number, seed: number): number {
  let h = x * 374761393 + y * 668265263 + seed * 2147483647;
  h = (h ^ (h >> 13)) * 1274126177;
  h = h ^ (h >> 16);
  return (h & 0x7fffffff) / 0x7fffffff;
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

export function valueNoise(x: number, y: number, seed: number): number {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = smooth(xf), v = smooth(yf);
  const a = hash2(xi, yi, seed), b = hash2(xi + 1, yi, seed);
  const c = hash2(xi, yi + 1, seed), d = hash2(xi + 1, yi + 1, seed);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}

export function fbm(x: number, y: number, seed: number, octaves = 5, lac = 2.02, gain = 0.5): number {
  let amp = 1, freq = 1, sum = 0, norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * valueNoise(x * freq, y * freq, seed + i * 131);
    norm += amp;
    amp *= gain;
    freq *= lac;
  }
  return sum / norm;
}

// ─── Polyline utilities ──────────────────────────────────────────────────────

export interface Pt { x: number; y: number }

export function polylineLength(pts: Pt[]): number {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += dist(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y);
  return L;
}

/** Cumulative arc-length table for a polyline. */
export function arcLengths(pts: Pt[]): number[] {
  const s = [0];
  for (let i = 1; i < pts.length; i++) s.push(s[i - 1] + dist(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y));
  return s;
}

/** Resample a polyline at roughly uniform spacing (keeps first/last points). */
export function resample(pts: Pt[], spacing: number): Pt[] {
  if (pts.length < 2) return pts.slice();
  const out: Pt[] = [{ ...pts[0] }];
  const s = arcLengths(pts);
  const total = s[s.length - 1];
  if (total < 1e-6) return out;
  const n = Math.max(2, Math.ceil(total / spacing));
  const step = total / n;
  let seg = 1;
  for (let i = 1; i < n; i++) {
    const t = i * step;
    while (seg < pts.length - 1 && s[seg] < t) seg++;
    const s0 = s[seg - 1], s1 = s[seg];
    const f = s1 - s0 > 1e-9 ? (t - s0) / (s1 - s0) : 0;
    out.push({
      x: lerp(pts[seg - 1].x, pts[seg].x, f),
      y: lerp(pts[seg - 1].y, pts[seg].y, f),
    });
  }
  out.push({ ...pts[pts.length - 1] });
  return out;
}

export interface Frames {
  /** Resampled points. */
  pts: Pt[];
  /** Unit tangents per point. */
  tx: Float64Array;
  ty: Float64Array;
  /** Unit left normals per point. */
  nx: Float64Array;
  ny: Float64Array;
  /** Arc length per point. */
  s: Float64Array;
  length: number;
}

/** Compute stable per-vertex frames for a polyline (tangent = averaged segment dirs). */
export function frames(pts: Pt[]): Frames {
  const n = pts.length;
  const tx = new Float64Array(n), ty = new Float64Array(n);
  const nx = new Float64Array(n), ny = new Float64Array(n);
  const s = new Float64Array(n);
  if (n === 0) return { pts, tx, ty, nx, ny, s, length: 0 };
  for (let i = 0; i < n; i++) {
    let dx = 0, dy = 0;
    if (i > 0) { dx += pts[i].x - pts[i - 1].x; dy += pts[i].y - pts[i - 1].y; }
    if (i < n - 1) { dx += pts[i + 1].x - pts[i].x; dy += pts[i + 1].y - pts[i + 1 - 1].y; }
    if (i === 0) { dx = pts[1].x - pts[0].x; dy = pts[1].y - pts[0].y; }
    if (i === n - 1) { dx = pts[n - 1].x - pts[n - 2].x; dy = pts[n - 1].y - pts[n - 2].y; }
    const l = Math.hypot(dx, dy) || 1;
    tx[i] = dx / l; ty[i] = dy / l;
    nx[i] = -ty[i]; ny[i] = tx[i];
    if (i > 0) s[i] = s[i - 1] + dist(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y);
  }
  return { pts, tx, ty, nx, ny, s, length: s[n - 1] };
}

/** Point on polyline at arc-length distance t (clamped). */
export function sampleAt(f: Frames, t: number): { x: number; y: number; tx: number; ty: number; nx: number; ny: number } {
  const n = f.pts.length;
  if (n === 0) return { x: 0, y: 0, tx: 1, ty: 0, nx: 0, ny: 1 };
  t = clamp(t, 0, f.length);
  let i = 1;
  while (i < n - 1 && f.s[i] < t) i++;
  const s0 = f.s[i - 1], s1 = f.s[i];
  const u = s1 - s0 > 1e-9 ? (t - s0) / (s1 - s0) : 0;
  return {
    x: lerp(f.pts[i - 1].x, f.pts[i].x, u),
    y: lerp(f.pts[i - 1].y, f.pts[i].y, u),
    tx: lerp(f.tx[i - 1], f.tx[i], u) || f.tx[i],
    ty: lerp(f.ty[i - 1], f.ty[i], u) || f.ty[i],
    nx: lerp(f.nx[i - 1], f.nx[i], u) || f.nx[i],
    ny: lerp(f.ny[i - 1], f.ny[i], u) || f.ny[i],
  };
}

/** Distance from point to segment + closest point. */
export function pointSeg(px: number, py: number, ax: number, ay: number, bx: number, by: number): { d: number; t: number; cx: number; cy: number } {
  const abx = bx - ax, aby = by - ay;
  const l2 = abx * abx + aby * aby;
  let t = l2 > 1e-12 ? ((px - ax) * abx + (py - ay) * aby) / l2 : 0;
  t = clamp(t, 0, 1);
  const cx = ax + abx * t, cy = ay + aby * t;
  return { d: dist(px, py, cx, cy), t, cx, cy };
}

/** Distance from point to polyline; returns {d, segIndex, t, cx, cy}. */
export function pointPolyline(px: number, py: number, pts: Pt[]): { d: number; seg: number; t: number; cx: number; cy: number } {
  let best = { d: Infinity, seg: 0, t: 0, cx: 0, cy: 0 };
  for (let i = 1; i < pts.length; i++) {
    const r = pointSeg(px, py, pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y);
    if (r.d < best.d) best = { d: r.d, seg: i - 1, t: r.t, cx: r.cx, cy: r.cy };
  }
  return best;
}

/** Segment/segment intersection (proper or touching). Returns null if parallel. */
export function segIntersect(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, dx: number, dy: number): { x: number; y: number; t: number; u: number } | null {
  const r0x = bx - ax, r0y = by - ay;
  const r1x = dx - cx, r1y = dy - cy;
  const den = r0x * r1y - r0y * r1x;
  if (Math.abs(den) < 1e-9) return null;
  const t = ((cx - ax) * r1y - (cy - ay) * r1x) / den;
  const u = ((cx - ax) * r0y - (cy - ay) * r0x) / den;
  if (t < -1e-6 || t > 1 + 1e-6 || u < -1e-6 || u > 1 + 1e-6) return null;
  return { x: ax + r0x * t, y: ay + r0y * t, t, u };
}

/** Chaikin corner-cutting smoothing (open polyline). */
export function chaikin(pts: Pt[], iterations = 1): Pt[] {
  let cur = pts;
  for (let it = 0; it < iterations; it++) {
    if (cur.length < 3) return cur;
    const out: Pt[] = [cur[0]];
    for (let i = 0; i < cur.length - 1; i++) {
      const a = cur[i], b = cur[i + 1];
      out.push({ x: a.x * 0.75 + b.x * 0.25, y: a.y * 0.75 + b.y * 0.25 });
      out.push({ x: a.x * 0.25 + b.x * 0.75, y: a.y * 0.25 + b.y * 0.75 });
    }
    out.push(cur[cur.length - 1]);
    cur = out;
  }
  return cur;
}

/** Catmull-Rom spline through waypoints, densified. */
export function spline(pts: Pt[], samplesPerSeg = 8): Pt[] {
  if (pts.length < 3) return pts.slice();
  const out: Pt[] = [pts[0]];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let j = 1; j <= samplesPerSeg; j++) {
      const t = j / samplesPerSeg, t2 = t * t, t3 = t2 * t;
      out.push({
        x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y: 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
      });
    }
  }
  return out;
}

/** Moving-average smoothing of a numeric array (window w). */
export function smoothArray(arr: Float64Array | number[], w: number): Float64Array {
  const n = arr.length;
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let sum = 0, cnt = 0;
    for (let j = Math.max(0, i - w); j <= Math.min(n - 1, i + w); j++) { sum += arr[j]; cnt++; }
    out[i] = sum / cnt;
  }
  return out;
}

export function polygonArea(pts: Pt[]): number {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    a += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
  }
  return a / 2;
}

export function pointInPolygon(px: number, py: number, pts: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i].x, yi = pts[i].y, xj = pts[j].x, yj = pts[j].y;
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Signed distance-ish: is world point near any stroke polyline within r? */
export function nearPolyline(px: number, py: number, pts: Pt[], r: number): boolean {
  return pointPolyline(px, py, pts).d < r;
}

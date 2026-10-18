// Frontier meshBuilder — clean quad-flow geometry for roads, junctions, bridges, rails.
import { samplePolyline, clamp, lerp, angleOf } from './geometry.js';
import { getPreset, asphaltHalfWidth, laneBoundaries } from './presets.js';
import { rawTerrainHeight, waterLevel, buildHeightGrid, sampleGridBilinear, terrainColor, WORLD_SIZE } from './terrain.js';
import { buildJunctionGraph, getJunctions, roadPoints } from './topology.js';

export function hexRgb(hex) {
  const h = hex.replace('#', '');
  const v = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
}

export class Bucket {
  constructor() { this.pos = []; this.col = []; this.uv = []; this.quad = []; this.tri = []; this.n = 0; }
  vert(p, c, u = 0, v = 0) { this.pos.push(p[0], p[1], p[2]); this.col.push(c[0], c[1], c[2]); this.uv.push(u, v); return this.n++; }
  addQuad(p1, p2, p3, p4, c, uv = null) {
    const uvs = uv || [[0, 0], [0, 1], [1, 1], [1, 0]];
    const a = this.vert(p1, c, uvs[0][0], uvs[0][1]);
    const b = this.vert(p2, c, uvs[1][0], uvs[1][1]);
    const d = this.vert(p3, c, uvs[2][0], uvs[2][1]);
    const e = this.vert(p4, c, uvs[3][0], uvs[3][1]);
    this.quad.push(a, b, d, e);
  }
  addTri(p1, p2, p3, c) {
    const a = this.vert(p1, c), b = this.vert(p2, c), d = this.vert(p3, c);
    this.tri.push(a, b, d);
  }
  // axis-aligned-ish box from center/dx/dz + y0/y1 + optional yaw (radians)
  addBox(cx, y0, cz, w, h, d, c, yaw = 0) {
    const hw = w / 2, hd = d / 2, y1 = y0 + h;
    const cs = Math.cos(yaw), sn = Math.sin(yaw);
    const corner = (sx, sz, y) => [cx + sx * hw * cs - sz * hd * sn, y, cz + sx * hw * sn + sz * hd * cs];
    const t0 = corner(-1, -1, y1), t1 = corner(1, -1, y1), t2 = corner(1, 1, y1), t3 = corner(-1, 1, y1);
    const b0 = corner(-1, -1, y0), b1 = corner(1, -1, y0), b2 = corner(1, 1, y0), b3 = corner(-1, -1, y0);
    this.addQuad(t0, t3, t2, t1, c); // top (+y)
    this.addQuad(b0, b1, b2, b3, c); // bottom
    this.addQuad(t0, t1, b1, b0, shade(c, 0.86)); // sides
    this.addQuad(t1, t2, b2, b1, shade(c, 0.78));
    this.addQuad(t2, t3, b3, b2, shade(c, 0.86));
    this.addQuad(t3, t0, b0, b3, shade(c, 0.78));
  }
  quadCount() { return this.quad.length / 4; }
  triCount() { return this.tri.length / 3 + this.quadCount() * 2; }
  vertCount() { return this.n; }
}

export function shade(c, f) { return [c[0] * f, c[1] * f, c[2] * f]; }

export function buckets() {
  return {
    asphalt: new Bucket(), junction: new Bucket(), marking: new Bucket(),
    sidewalk: new Bucket(), curb: new Bucket(), grassMed: new Bucket(),
    bridge: new Bucket(), ballast: new Bucket(), sleeper: new Bucket(),
    steel: new Bucket(), beam: new Bucket(), pillar: new Bucket(),
    terrain: new Bucket(), water: new Bucket(), building: new Bucket(),
    trunk: new Bucket(), leaf: new Bucket(), wood: new Bucket(),
  };
}

// ---- road sampling with heights ----
// Profile: y = max(terrain + lift, deckEnds + bump + lift); bridge ends always meet the ground.
export function sampleRoadWithHeights(project, road, step = 2.0) {
  const pts = roadPoints(project, road);
  if (pts.length < 2) return [];
  const samples = samplePolyline(pts, { closed: !!road.closed, smooth: road.smooth !== false, step });
  // node cumulative distances (straight approx) for lift interpolation
  const cum = [0];
  const nSeg = road.closed ? pts.length : pts.length - 1;
  for (let i = 0; i < nSeg; i++) {
    const a = pts[i % pts.length], b = pts[(i + 1) % pts.length];
    cum.push(cum[i] + Math.hypot(b.x - a.x, b.z - a.z));
  }
  const totalStraight = cum[cum.length - 1] || 1;
  const liftAt = (dist) => {
    const d = clamp(dist, 0, totalStraight);
    let i = 0;
    while (i < cum.length - 2 && cum[i + 1] < d) i++;
    const span = Math.max(1e-6, cum[i + 1] - cum[i]);
    const t = clamp((d - cum[i]) / span, 0, 1);
    const ha = pts[i % pts.length].h || 0, hb = pts[(i + 1) % pts.length].h || 0;
    return ha + (hb - ha) * t;
  };
  const isBridge = !!road.bridge?.enabled;
  const bh = road.bridge?.height ?? 6;
  const y0 = rawTerrainHeight(project, samples[0].x, samples[0].z) + 0.22;
  const y1 = rawTerrainHeight(project, samples[samples.length - 1].x, samples[samples.length - 1].z) + 0.22;
  const total = samples[samples.length - 1].dist || 1;
  const archExtra = road.bridge?.type === 'arch' ? 1.8 : 0;
  for (const s of samples) {
    const lift = liftAt(s.dist);
    const base = rawTerrainHeight(project, s.x, s.z) + 0.22 + lift;
    if (!isBridge) { s.y = base; s.bridge = false; continue; }
    const t = clamp(s.dist / total, 0, 1);
    let deck;
    if (road.closed) deck = base + bh;
    else {
      const bump = bh * Math.pow(Math.sin(Math.PI * t), 0.75) + archExtra * Math.sin(Math.PI * t);
      deck = y0 + (y1 - y0) * t + bump + lift;
    }
    s.y = Math.max(base, deck);
    s.bridge = deck > base + 0.35;
  }
  return samples;
}

function nearestJunctionDist(junctions, x, z) {
  let best = null, bd = 1e9;
  for (const j of junctions) {
    const d = Math.hypot(x - j.x, z - j.z);
    if (d < bd) { bd = d; best = j; }
  }
  return { j: best, d: bd };
}

// Split samples into spans outside junction circles
export function splitSpans(samples, junctions, roadId) {
  if (!samples.length) return [];
  // mark inside
  const inside = samples.map((s) => {
    for (const j of junctions) {
      // only clip if this road participates in the junction (else overpass keeps ribbon)
      const participates = j.stubs.some((st) => st.roadId === roadId);
      if (!participates) continue;
      if (Math.hypot(s.x - j.x, s.z - j.z) < j.radius - 0.4) return j;
    }
    return null;
  });
  const spans = [];
  let cur = [];
  for (let i = 0; i < samples.length; i++) {
    if (!inside[i]) { cur.push(samples[i]); }
    else {
      if (cur.length >= 2) spans.push(cur);
      cur = [];
    }
  }
  if (cur.length >= 2) spans.push(cur);
  // extend span ends to junction boundary for clean stitching
  for (const span of spans) {
    const first = span[0], last = span[span.length - 1];
    const nj0 = nearestJunctionDist(junctions, first.x - first.dirx * 3, first.z - first.dirz * 3);
    if (nj0.j && nj0.d < nj0.j.radius + 6) {
      const j = nj0.j;
      const dx = first.x - j.x, dz = first.z - j.z;
      const l = Math.hypot(dx, dz) || 1;
      const bx = j.x + dx / l * (j.radius - 0.15), bz = j.z + dz / l * (j.radius - 0.15);
      span.unshift({ x: bx, z: bz, dirx: first.dirx, dirz: first.dirz, dist: first.dist - 2, y: first.y, bridge: first.bridge });
    }
    const nj1 = nearestJunctionDist(junctions, last.x + last.dirx * 3, last.z + last.dirz * 3);
    if (nj1.j && nj1.d < nj1.j.radius + 6) {
      const j = nj1.j;
      const dx = last.x - j.x, dz = last.z - j.z;
      const l = Math.hypot(dx, dz) || 1;
      const bx = j.x + dx / l * (j.radius - 0.15), bz = j.z + dz / l * (j.radius - 0.15);
      span.push({ x: bx, z: bz, dirx: last.dirx, dirz: last.dirz, dist: last.dist + 2, y: last.y, bridge: last.bridge });
    }
  }
  return spans;
}

function leftVec(s) { return [-s.dirz, s.dirx]; }

function sidewalkLift(project, preset, s, dist, junctions) {
  let lift = 0.15;
  // curb ramps near junctions
  const { j, d } = nearestJunctionDist(junctions, s.x, s.z);
  if (j) {
    const t = clamp(1 - (d - j.radius) / 4.5, 0, 1);
    if (t > 0) lift = lerp(lift, 0.03, t * t * (3 - 2 * t));
  }
  // driveway dips
  if (preset.driveways) {
    const phase = ((dist % 30) + 30) % 30;
    if (phase < 5.5) {
      const k = Math.sin((phase / 5.5) * Math.PI);
      lift = lerp(lift, 0.03, k * 0.95);
    }
  }
  // dead-end cap ramp
  return lift;
}

const WHITE = [0.92, 0.93, 0.94], YELLOW = [0.95, 0.72, 0.2];

function dashOn(dist, dash = 3, gap = 4.5) { return (dist % (dash + gap)) < dash; }

function stripQuad(bucket, s0, s1, offA, offB, y0, y1, color) {
  // horizontal strip between offsets offA..offB (left+), up-facing: L0,L1,R1,R0 with L=offB? keep generic
  const [lx0, lz0] = leftVec(s0), [lx1, lz1] = leftVec(s1);
  const hi = Math.max(offA, offB), lo = Math.min(offA, offB);
  const L0 = [s0.x + lx0 * hi, y0, s0.z + lz0 * hi];
  const L1 = [s1.x + lx1 * hi, y1, s1.z + lz1 * hi];
  const R1 = [s1.x + lx1 * lo, y1, s1.z + lz1 * lo];
  const R0 = [s0.x + lx0 * lo, y0, s0.z + lz0 * lo];
  bucket.addQuad(L0, L1, R1, R0, color);
}

export function buildRoadSpan(B, project, road, preset, span, junctions) {
  const hw = asphaltHalfWidth(preset);
  const isBridge = !!road.bridge?.enabled;
  const asphaltC = hexRgb(preset.asphalt || '#3a3d43');
  const swW = preset.sidewalkWidth || 0;
  const hasSWL = preset.sidewalkL && swW > 0;
  const hasSWR = preset.sidewalkR && swW > 0;
  const isRail = preset.kind === 'rail' || preset.kind === 'monorail';

  for (let i = 0; i < span.length - 1; i++) {
    const s0 = span[i], s1 = span[i + 1];
    const y0 = s0.y, y1 = s1.y;
    // --- asphalt base (single quad per segment = clean flow) ---
    stripQuad(isBridge ? B.asphalt : B.asphalt, s0, s1, -hw, hw, y0, y1, asphaltC);

    if (isRail) continue;
    // --- median ---
    const med = preset.medianWidth || 0;
    if (med > 0.2) {
      if (preset.medianType === 'grass') {
        stripQuad(B.grassMed, s0, s1, -med / 2, med / 2, y0 + 0.09, y1 + 0.09, [0.3, 0.52, 0.28]);
      } else if (preset.medianType === 'barrier') {
        const bw = Math.min(0.5, med / 3);
        stripQuad(B.bridge, s0, s1, -bw, bw, y0 + 0.55, y1 + 0.55, [0.75, 0.76, 0.78]);
        // barrier sides
        barrierWall(B.bridge, s0, s1, 0, y0, y1, [0.7, 0.71, 0.73]);
      } else if (preset.medianType === 'paint' || preset.medianType === 'paver') {
        stripQuad(B.marking, s0, s1, -med / 2, med / 2, y0 + 0.02, y1 + 0.02,
          preset.medianType === 'paver' ? [0.62, 0.6, 0.52] : YELLOW.map((v) => v * 0.55));
      }
    }
    // --- center + lane markings ---
    const my0 = y0 + 0.028, my1 = y1 + 0.028;
    const c = preset.center;
    if (c === 'doubleYellow') {
      stripQuad(B.marking, s0, s1, 0.08, 0.22, my0, my1, YELLOW);
      stripQuad(B.marking, s0, s1, -0.22, -0.08, my0, my1, YELLOW);
    } else if (c === 'dashedYellow' || c === 'dashedWhite') {
      if (dashOn(s0.dist) && dashOn(s1.dist - 0.01)) stripQuad(B.marking, s0, s1, -0.09, 0.09, my0, my1, c === 'dashedYellow' ? YELLOW : WHITE);
    } else if (c === 'solidWhite') {
      stripQuad(B.marking, s0, s1, -0.09, 0.09, my0, my1, WHITE);
    } else if (c === 'turnLane') {
      stripQuad(B.marking, s0, s1, med / 2 - 0.15, med / 2 + 0.0, my0, my1, YELLOW);
      stripQuad(B.marking, s0, s1, -med / 2, -med / 2 + 0.15, my0, my1, YELLOW);
    }
    if (preset.laneMark === 'dashedWhite') {
      for (const bOff of laneBoundaries(preset)) {
        if (dashOn(s0.dist) && dashOn(s1.dist - 0.01)) stripQuad(B.marking, s0, s1, bOff - 0.08, bOff + 0.08, my0, my1, WHITE);
      }
    }
    if (preset.edgeMark) {
      stripQuad(B.marking, s0, s1, hw - 0.42, hw - 0.26, my0, my1, WHITE);
      stripQuad(B.marking, s0, s1, -(hw - 0.26), -(hw - 0.42), my0, my1, WHITE);
    }
    // parking ticks
    if (preset.parking) {
      if (Math.floor(s0.dist / 6) !== Math.floor(s1.dist / 6)) {
        const px = (hw - (preset.shoulder || 2)) ;
        stripQuad(B.marking, s0, s1, px - 0.08, px + 0.08, my0, my1, WHITE.map((v) => v * 0.8));
        stripQuad(B.marking, s0, s1, -px - 0.08, -px + 0.08, my0, my1, WHITE.map((v) => v * 0.8));
      }
    }
    // --- sidewalks + curbs (with ramps) ---
    const lift0 = sidewalkLift(project, preset, s0, s0.dist, junctions);
    const lift1 = sidewalkLift(project, preset, s1, s1.dist, junctions);
    if (hasSWL) sidewalkSide(B, s0, s1, hw, swW, y0, y1, lift0, lift1, +1, isBridge, project);
    if (hasSWR) sidewalkSide(B, s0, s1, hw, swW, y0, y1, lift0, lift1, -1, isBridge, project);
  }

  // --- bridge furniture: railings + piers ---
  if (isBridge) {
    buildBridgeFurniture(B, project, road, preset, span, hw);
  }
}

function sidewalkSide(B, s0, s1, hw, swW, y0, y1, lift0, lift1, side, isBridge, project) {
  const inOff = side * (hw + 0.12);
  const outOff = side * (hw + 0.12 + swW);
  const t0 = y0 + lift0, t1 = y1 + lift1;
  const conc = [0.62, 0.63, 0.65];
  stripQuad(B.sidewalk, s0, s1, inOff, outOff, t0, t1, conc);
  // curb face (vertical, outward normal-ish)
  const [lx0, lz0] = leftVec(s0), [lx1, lz1] = leftVec(s1);
  const sgn = Math.sign(side);
  const c0i = [s0.x + lx0 * inOff, y0, s0.z + lz0 * inOff];
  const c0t = [s0.x + lx0 * inOff, t0, s0.z + lz0 * inOff];
  const c1i = [s1.x + lx1 * inOff, y1, s1.z + lz1 * inOff];
  const c1t = [s1.x + lx1 * inOff, t1, s1.z + lz1 * inOff];
  if (sgn > 0) B.curb.addQuad(c0i, c1i, c1t, c0t, shade(conc, 0.8));
  else B.curb.addQuad(c0t, c1t, c1i, c0i, shade(conc, 0.8));
  // outer skirt down to terrain (ground roads only)
  if (!isBridge) {
    const g0 = rawTerrainHeight(project, s0.x + lx0 * outOff, s0.z + lz0 * outOff) - 0.15;
    const g1 = rawTerrainHeight(project, s1.x + lx1 * outOff, s1.z + lz1 * outOff) - 0.15;
    const o0t = [s0.x + lx0 * outOff, t0, s0.z + lz0 * outOff];
    const o1t = [s1.x + lx1 * outOff, t1, s1.z + lz1 * outOff];
    const o0g = [s0.x + lx0 * outOff, Math.min(g0, t0 - 0.02), s0.z + lz0 * outOff];
    const o1g = [s1.x + lx1 * outOff, Math.min(g1, t1 - 0.02), s1.z + lz1 * outOff];
    if (sgn > 0) B.curb.addQuad(o0t, o1t, o1g, o0g, shade(conc, 0.7));
    else B.curb.addQuad(o0g, o1g, o1t, o0t, shade(conc, 0.7));
  }
}

function barrierWall(bucket, s0, s1, off, y0, y1, color) {
  const [lx0, lz0] = leftVec(s0), [lx1, lz1] = leftVec(s1);
  const w = 0.28, h = 0.55;
  const a0 = [s0.x + lx0 * (off - w), y0, s0.z + lz0 * (off - w)];
  const b0 = [s0.x + lx0 * (off + w), y0, s0.z + lz0 * (off + w)];
  const a1 = [s1.x + lx1 * (off - w), y1, s1.z + lz1 * (off - w)];
  const b1 = [s1.x + lx1 * (off + w), y1, s1.z + lz1 * (off + w)];
  const a0t = [a0[0], y0 + h, a0[2]], b0t = [b0[0], y0 + h, b0[2]];
  const a1t = [a1[0], y1 + h, a1[2]], b1t = [b1[0], y1 + h, b1[2]];
  bucket.addQuad(a0, a1, a1t, a0t, shade(color, 0.85));
  bucket.addQuad(b0t, b1t, b1, b0, shade(color, 0.85));
}

function buildBridgeFurniture(B, project, road, preset, span, hw) {
  const railC = [0.55, 0.58, 0.62];
  const total = span[span.length - 1].dist - span[0].dist;
  // side railings continuous
  for (let i = 0; i < span.length - 1; i++) {
    const s0 = span[i], s1 = span[i + 1];
    for (const side of [1, -1]) {
      const off = side * (hw + 0.35);
      const [lx0, lz0] = leftVec(s0), [lx1, lz1] = leftVec(s1);
      const p0 = [s0.x + lx0 * off, s0.y + 1.05, s0.z + lz0 * off];
      const p1 = [s1.x + lx1 * off, s1.y + 1.05, s1.z + lz1 * off];
      const q0 = [s0.x + lx0 * (off + side * 0.18), s0.y + 1.05, s0.z + lz0 * (off + side * 0.18)];
      const q1 = [s1.x + lx1 * (off + side * 0.18), s1.y + 1.05, s1.z + lz1 * (off + side * 0.18)];
      B.bridge.addQuad(p0, p1, q1, q0, railC);
      // lower rail
      const r0 = [p0[0], p0[1] - 0.55, p0[2]], r1 = [p1[0], p1[1] - 0.55, p1[2]];
      const s0b = [q0[0], q0[1] - 0.55, q0[2]], s1b = [q1[0], q1[1] - 0.55, q1[2]];
      B.bridge.addQuad(r0, r1, s1b, s0b, shade(railC, 0.85));
    }
  }
  // posts every 4m
  const n = span.length;
  for (let i = 0; i < n; i += 2) {
    const s = span[i];
    for (const side of [1, -1]) {
      const off = side * (hw + 0.4);
      const [lx, lz] = leftVec(s);
      B.bridge.addBox(s.x + lx * off, s.y, s.z + lz * off, 0.16, 1.05, 0.16, shade(railC, 0.9));
    }
  }
  // deck edge beams
  for (let i = 0; i < span.length - 1; i++) {
    const s0 = span[i], s1 = span[i + 1];
    for (const side of [1, -1]) {
      const off = side * (hw + 0.12);
      const [lx0, lz0] = leftVec(s0), [lx1, lz1] = leftVec(s1);
      const t0 = [s0.x + lx0 * off, s0.y - 0.02, s0.z + lz0 * off];
      const t1 = [s1.x + lx1 * off, s1.y - 0.02, s1.z + lz1 * off];
      const b0 = [t0[0], t0[1] - 0.9, t0[2]], b1 = [t1[0], t1[1] - 0.9, t1[2]];
      if (side > 0) B.bridge.addQuad(t0, t1, b1, b0, [0.5, 0.52, 0.55]);
      else B.bridge.addQuad(b0, b1, t1, t0, [0.5, 0.52, 0.55]);
    }
  }
  // piers every ~14m
  const wl = waterLevel(project);
  let acc = 0;
  for (let i = 1; i < span.length - 1; i++) {
    acc += span[i].dist - span[i - 1].dist;
    if (acc < 14) continue;
    acc = 0;
    const s = span[i];
    const g = Math.min(rawTerrainHeight(project, s.x, s.z), wl - 0.4) - 0.6;
    const deckY = s.y - 0.9;
    if (deckY - g < 1.2) continue;
    // twin columns + cap
    const [lx, lz] = leftVec(s);
    const yaw = Math.atan2(s.dirx, s.dirz);
    for (const side of [1, -1]) {
      const off = side * Math.min(hw * 0.55, 5);
      B.bridge.addBox(s.x + lx * off, g, s.z + lz * off, 1.3, deckY - g, 1.3, [0.6, 0.6, 0.61], yaw);
    }
    B.bridge.addBox(s.x, deckY - 0.7, s.z, Math.min(hw * 1.3, 12), 0.7, 1.8, [0.62, 0.62, 0.63], yaw);
  }
  // abutments at span ends
  for (const s of [span[0], span[span.length - 1]]) {
    const g = rawTerrainHeight(project, s.x, s.z) - 0.4;
    if (s.y - g > 1.5) {
      const yaw = Math.atan2(s.dirx, s.dirz);
      B.bridge.addBox(s.x, g, s.z, hw * 2 + 1.6, Math.min(s.y - g, 8), 2.2, [0.58, 0.58, 0.59], yaw);
    }
  }
}

// ---- junctions: all-quad fan subdivision ----
export function buildJunction(B, project, junction, samplesByRoad = null) {
  const { x: cx, z: cz, stubs, radius } = junction;
  // Mouth heights come from the actual road ribbons (handles lifts/bridges exactly).
  const mouthY = (road, mx, mz) => {
    const samples = samplesByRoad?.get(road.id);
    if (samples?.length) {
      let best = samples[0], bd = 1e18;
      for (let i = 0; i < samples.length; i += 2) {
        const s = samples[i];
        const d = (s.x - mx) * (s.x - mx) + (s.z - mz) * (s.z - mz);
        if (d < bd) { bd = d; best = s; }
      }
      return best.y;
    }
    return rawTerrainHeight(project, mx, mz) + 0.22;
  };
  // mouth points per stub
  const ring = [];
  for (const st of stubs) {
    const preset = getPreset(st.road.presetId);
    const hw = asphaltHalfWidth(preset);
    const mx = cx + st.dirx * radius, mz = cz + st.dirz * radius;
    const px = -st.dirz, pz = st.dirx;
    const yM = mouthY(st.road, mx, mz);
    const L = { x: mx + px * hw, z: mz + pz * hw, y: yM, stub: st, hw, side: 1 };
    const R = { x: mx - px * hw, z: mz - pz * hw, y: yM, stub: st, hw, side: -1 };
    ring.push(L, R);
  }
  // sort ring by angle
  ring.sort((a, b) => Math.atan2(a.z - cz, a.x - cx) - Math.atan2(b.z - cz, b.x - cx));
  const cy = ring.reduce((s, p) => s + p.y, 0) / Math.max(1, ring.length);
  const C = { x: cx, z: cz, y: cy + 0.005 };
  // cap tint follows the widest incident road (dirt junctions stay dirt)
  let widePreset = getPreset(stubs[0].road.presetId), wideHW = -1;
  for (const st of stubs) {
    const pr = getPreset(st.road.presetId);
    const hw = asphaltHalfWidth(pr);
    if (hw > wideHW) { wideHW = hw; widePreset = pr; }
  }
  const asphaltC = hexRgb(widePreset.asphalt || '#3a3d43').map((v) => v * 0.62);
  const n = ring.length;
  const mid = (a, b) => ({ x: (a.x + b.x) / 2, z: (a.z + b.z) / 2, y: (a.y + b.y) / 2 });
  for (let i = 0; i < n; i++) {
    const P = ring[i], Q = ring[(i + 1) % n];
    const G = { x: (C.x + P.x + Q.x) / 3, z: (C.z + P.z + Q.z) / 3, y: (C.y + P.y + Q.y) / 3 };
    const mCP = mid(C, P), mPQ = mid(P, Q), mQC = mid(Q, C);
    const vC = [C.x, C.y, C.z], vP = [P.x, P.y, P.z], vQ = [Q.x, Q.y, Q.z];
    const vG = [G.x, G.y, G.z];
    const v0 = [mCP.x, mCP.y, mCP.z], v1 = [mPQ.x, mPQ.y, mPQ.z], v2 = [mQC.x, mQC.y, mQC.z];
    // 3 quads per triangle (pure quad flow)
    B.junction.addQuad(vC, v0, vG, v2, asphaltC);
    B.junction.addQuad(vP, v1, vG, v0, asphaltC);
    B.junction.addQuad(vQ, v2, vG, v1, asphaltC);
  }
  // crosswalks + stop lines + sidewalk corners per stub
  const seenRoads = new Set();
  for (const st of stubs) {
    const preset = getPreset(st.road.presetId);
    const hw = asphaltHalfWidth(preset);
    const key = st.roadId + ':' + Math.round(angleOf(st.dirx, st.dirz) * 10);
    if (seenRoads.has(key)) continue;
    seenRoads.add(key);
    const px = -st.dirz, pz = st.dirx;
    const yM = mouthY(st.road, cx + st.dirx * (radius + 2), cz + st.dirz * (radius + 2));
    // zebra stripes just outside mouth
    if (preset.crosswalk && !preset.pedestrian) {
      const w0 = radius + 1.4;
      const stripeLen = 2.8;
      const avail = hw * 2 - 1.2;
      const count = Math.max(2, Math.floor(avail / 1.15));
      for (let k = 0; k < count; k++) {
        const off = -avail / 2 + (k + 0.5) * (avail / count);
        const bx = cx + st.dirx * w0 + px * off, bz = cz + st.dirz * w0 + pz * off;
        const ex = cx + st.dirx * (w0 + stripeLen) + px * off, ez = cz + st.dirz * (w0 + stripeLen) + pz * off;
        const wdt = (avail / count) * 0.55;
        const yawA = Math.atan2(st.dirx, st.dirz);
        // build as small quad (axis along dir)
        const ax = bx + px * wdt / 2, az = bz + pz * wdt / 2;
        const bx2 = bx - px * wdt / 2, bz2 = bz - pz * wdt / 2;
        const cx2 = ex - px * wdt / 2, cz2 = ez - pz * wdt / 2;
        const dx2 = ex + px * wdt / 2, dz2 = ez + pz * wdt / 2;
        B.marking.addQuad([ax, yM + 0.028, az], [dx2, yM + 0.028, dz2], [cx2, yM + 0.028, cz2], [bx2, yM + 0.028, bz2], WHITE);
      }
      // stop line
      const s0 = radius + 5.2;
      const sx0 = cx + st.dirx * s0 + px * hw * 0.95, sz0 = cz + st.dirz * s0 + pz * hw * 0.95;
      const sx1 = cx + st.dirx * s0 - px * hw * 0.95, sz1 = cz + st.dirz * s0 - pz * hw * 0.95;
      const ex0 = cx + st.dirx * (s0 + 0.45) + px * hw * 0.95, ez0 = cz + st.dirz * (s0 + 0.45) + pz * hw * 0.95;
      const ex1 = cx + st.dirx * (s0 + 0.45) - px * hw * 0.95, ez1 = cz + st.dirz * (s0 + 0.45) - pz * hw * 0.95;
      B.marking.addQuad([sx0, yM + 0.028, sz0], [ex0, yM + 0.028, ez0], [ex1, yM + 0.028, ez1], [sx1, yM + 0.028, sz1], WHITE);
    }
  }
  // sidewalk corner islands in gaps
  for (let i = 0; i < n; i++) {
    const P = ring[i], Q = ring[(i + 1) % n];
    if (P.stub === Q.stub) continue; // same mouth, no gap
    const mx = (P.x + Q.x) / 2, mz = (P.z + Q.z) / 2;
    const ox = mx - cx, oz = mz - cz;
    const l = Math.hypot(ox, oz) || 1;
    const push = 3.2;
    const P2 = { x: P.x + ox / l * push, z: P.z + oz / l * push };
    const Q2 = { x: Q.x + ox / l * push, z: Q.z + oz / l * push };
    const yIn = (P.y + Q.y) / 2 + 0.03, yOut = (P.y + Q.y) / 2 + 0.15;
    const conc = [0.6, 0.61, 0.63];
    B.sidewalk.addQuad([P.x, yIn, P.z], [Q.x, yIn, Q.z], [Q2.x, yOut, Q2.z], [P2.x, yOut, P2.z], conc);
  }
}

// ---- rails ----
export function sampleRailWithHeights(project, rail, step = 2.5) {
  const pts = rail.nodeIds.map((id) => project.nodes[id]).filter(Boolean);
  if (pts.length < 2) return [];
  const samples = samplePolyline(pts, { closed: !!rail.closed, smooth: true, step });
  if (rail.kind === 'monorail') {
    // smooth terrain + elevation
    const raws = samples.map((s) => rawTerrainHeight(project, s.x, s.z));
    const sm = raws.map((_, i) => {
      let a = 0, c = 0;
      for (let k = -6; k <= 6; k++) { const j = clamp(i + k, 0, raws.length - 1); a += raws[j]; c++; }
      return a / c;
    });
    const preset = getPreset(rail.presetId);
    const elev = preset.elevation ?? 6.8;
    samples.forEach((s, i) => { s.y = sm[i] + elev; s.bridge = true; });
  } else {
    // node lift interpolation (cuttings / overpasses)
    const cum = [0];
    const nSeg = rail.closed ? pts.length : pts.length - 1;
    for (let i = 0; i < nSeg; i++) {
      const a = pts[i % pts.length], b = pts[(i + 1) % pts.length];
      cum.push(cum[i] + Math.hypot(b.x - a.x, b.z - a.z));
    }
    const totalStraight = cum[cum.length - 1] || 1;
    const liftAt = (dist) => {
      const d = clamp(dist, 0, totalStraight);
      let i = 0;
      while (i < cum.length - 2 && cum[i + 1] < d) i++;
      const span = Math.max(1e-6, cum[i + 1] - cum[i]);
      const t = clamp((d - cum[i]) / span, 0, 1);
      const ha = pts[i % pts.length].h || 0, hb = pts[(i + 1) % pts.length].h || 0;
      return ha + (hb - ha) * t;
    };
    const isBridge = !!rail.bridge?.enabled;
    const bh = rail.bridge?.height ?? 4;
    const y0 = rawTerrainHeight(project, samples[0].x, samples[0].z) + 0.42;
    const y1 = rawTerrainHeight(project, samples[samples.length - 1].x, samples[samples.length - 1].z) + 0.42;
    const total = samples[samples.length - 1].dist || 1;
    for (const s of samples) {
      const lift = liftAt(s.dist);
      const base = rawTerrainHeight(project, s.x, s.z) + 0.42 + lift;
      if (!isBridge) { s.y = base; s.bridge = false; continue; }
      const t = clamp(s.dist / total, 0, 1);
      const deck = y0 + (y1 - y0) * t + bh * Math.pow(Math.sin(Math.PI * t), 0.75) + lift;
      s.y = Math.max(base, deck);
      s.bridge = deck > base + 0.35;
    }
  }
  return samples;
}

export function buildHeavyRail(B, project, rail, samples) {
  const preset = getPreset(rail.presetId);
  const tracks = preset.tracks || 1;
  const spacing = preset.trackSpacing || 0;
  const ballastHW = (preset.ballastWidth || 8) / 2;
  const ballastC = [0.32, 0.28, 0.25];
  for (let i = 0; i < samples.length - 1; i++) {
    const s0 = samples[i], s1 = samples[i + 1];
    stripQuad(B.ballast, s0, s1, -ballastHW, ballastHW, s0.y, s1.y, ballastC);
    // side skirts
    for (const side of [1, -1]) {
      const [lx0, lz0] = leftVec(s0), [lx1, lz1] = leftVec(s1);
      const t0 = [s0.x + lx0 * side * ballastHW, s0.y, s0.z + lz0 * side * ballastHW];
      const t1 = [s1.x + lx1 * side * ballastHW, s1.y, s1.z + lz1 * side * ballastHW];
      const b0 = [t0[0] + lx0 * side * 1.1, s0.y - 0.55, t0[2] + lz0 * side * 1.1];
      const b1 = [t1[0] + lx1 * side * 1.1, s1.y - 0.55, t1[2] + lz1 * side * 1.1];
      if (side > 0) B.ballast.addQuad(t0, t1, b1, b0, shade(ballastC, 0.85));
      else B.ballast.addQuad(b0, b1, t1, t0, shade(ballastC, 0.85));
    }
  }
  // sleepers + rails per track
  for (let t = 0; t < tracks; t++) {
    const off = tracks === 1 ? 0 : (t - (tracks - 1) / 2) * spacing;
    // sleepers
    let acc = 0;
    for (let i = 0; i < samples.length; i++) {
      if (i > 0) acc += samples[i].dist - samples[i - 1].dist;
      if (acc < 0.95 && i !== 0) continue;
      acc = 0;
      const s = samples[i];
      const [lx, lz] = leftVec(s);
      const yaw = Math.atan2(s.dirx, s.dirz);
      B.sleeper.addBox(s.x + lx * off, s.y + 0.02, s.z + lz * off, 2.5, 0.13, 0.26, [0.36, 0.28, 0.19], yaw);
    }
    // steel rails
    for (let i = 0; i < samples.length - 1; i++) {
      const s0 = samples[i], s1 = samples[i + 1];
      for (const g of [-0.72, 0.72]) {
        const c = off + g;
        stripQuad(B.steel, s0, s1, c - 0.05, c + 0.05, s0.y + 0.22, s1.y + 0.22, [0.78, 0.8, 0.83]);
      }
    }
  }
  // trestle piers wherever the line runs elevated (viaducts / overpasses)
  const wl = waterLevel(project);
  let acc = 0;
  for (let i = 1; i < samples.length - 1; i++) {
    acc += samples[i].dist - samples[i - 1].dist;
    if (acc < 12) continue;
    acc = 0;
    const s = samples[i];
    const g = Math.min(rawTerrainHeight(project, s.x, s.z), wl - 0.4) - 0.6;
    if (s.y - 0.5 - g < 1.6) continue;
    const yaw = Math.atan2(s.dirx, s.dirz);
    B.bridge.addBox(s.x, g, s.z, ballastHW * 1.1, s.y - 0.5 - g, 1.6, [0.55, 0.53, 0.5], yaw);
  }
}

// Level crossings: timber deck + edge markings where heavy rail meets roads at grade
export function buildCrossings(B, project, crossings) {
  for (const c of crossings) {
    const preset = getPreset(c.road.presetId);
    const hw = asphaltHalfWidth(preset);
    const [rdx, rdz] = c.railDir;
    const yaw = Math.atan2(rdx, rdz);
    const deckLen = (getPreset(c.rail.presetId).ballastWidth || 8) + 1.5;
    const deckW = hw * 2 + 1.2;
    B.wood.addBox(c.x, c.y + 0.02, c.z, deckW, 0.09, deckLen, [0.42, 0.33, 0.22], Math.atan2(c.roadDir[0], c.roadDir[1]));
    // white edge triangles (X hint) — two diagonal strips
    const px = -rdz, pz = rdx; // across rail
    const L = deckLen / 2 - 0.4, W = deckW / 2 - 0.4;
    const y = c.y + 0.12;
    const corners = [
      [c.x - rdx * L + px * W, c.z - rdz * L + pz * W],
      [c.x + rdx * L + px * W, c.z + rdz * L + pz * W],
      [c.x + rdx * L - px * W, c.z + rdz * L - pz * W],
      [c.x - rdx * L - px * W, c.z - rdz * L - pz * W],
    ];
    B.marking.addQuad([corners[0][0], y, corners[0][1]], [corners[1][0], y, corners[1][1]],
      [corners[1][0] - px * 0.5, y, corners[1][1] - pz * 0.5], [corners[0][0] - px * 0.5, y, corners[0][1] - pz * 0.5], WHITE);
    // signal posts
    for (const side of [1, -1]) {
      const sx = c.x + px * side * (W + 1.2), sz = c.z + pz * side * (W + 1.2);
      const g = rawTerrainHeight(project, sx, sz);
      B.steel.addBox(sx, g, sz, 0.18, 3.4, 0.18, [0.7, 0.7, 0.72]);
      B.steel.addBox(sx, g + 3.0, sz, 1.1, 0.28, 0.12, [0.85, 0.85, 0.86], yaw);
    }
  }
}

export function buildMonorail(B, project, rail, samples) {
  const preset = getPreset(rail.presetId);
  const bw = (preset.beamWidth || 0.9) / 2;
  const bh = preset.beamHeight || 1.4;
  const beamC = [0.66, 0.69, 0.72];
  for (let i = 0; i < samples.length - 1; i++) {
    const s0 = samples[i], s1 = samples[i + 1];
    stripQuad(B.beam, s0, s1, -bw, bw, s0.y, s1.y, beamC);
    for (const side of [1, -1]) {
      const [lx0, lz0] = leftVec(s0), [lx1, lz1] = leftVec(s1);
      const t0 = [s0.x + lx0 * side * bw, s0.y, s0.z + lz0 * side * bw];
      const t1 = [s1.x + lx1 * side * bw, s1.y, s1.z + lz1 * side * bw];
      const b0 = [t0[0], s0.y - bh, t0[2]], b1 = [t1[0], s1.y - bh, t1[2]];
      if (side > 0) B.beam.addQuad(t0, t1, b1, b0, shade(beamC, 0.88));
      else B.beam.addQuad(b0, b1, t1, t0, shade(beamC, 0.88));
    }
  }
  // pillars
  const every = preset.pillarEvery || 20;
  let acc = every;
  for (let i = 0; i < samples.length; i++) {
    if (i > 0) acc += samples[i].dist - samples[i - 1].dist;
    if (acc < every && i !== 0) continue;
    acc = 0;
    const s = samples[i];
    const g = rawTerrainHeight(project, s.x, s.z) - 0.3;
    const yb = s.y - bh;
    if (yb - g < 1) continue;
    const yaw = Math.atan2(s.dirx, s.dirz);
    B.pillar.addBox(s.x, g, s.z, 1.5, yb - g, 1.5, [0.58, 0.59, 0.6], yaw);
    B.pillar.addBox(s.x, yb - 0.5, s.z, 2.6, 0.5, 2.0, [0.62, 0.63, 0.64], yaw);
  }
  // stations at ends (+ midpoint if long)
  const spots = [samples[0], samples[samples.length - 1]];
  if (samples[samples.length - 1].dist > 400) spots.push(samples[Math.floor(samples.length / 2)]);
  for (const s of spots) {
    const yaw = Math.atan2(s.dirx, s.dirz);
    const [lx, lz] = leftVec(s);
    const px = s.x, pz = s.z, py = s.y;
    for (const side of [1, -1]) {
      B.pillar.addBox(px + lx * side * 2.4, py - 0.4, pz + lz * side * 2.4, 2.6, 0.5, 16, [0.55, 0.56, 0.58], yaw);
      // canopy
      B.pillar.addBox(px + lx * side * 2.4, py + 2.6, pz + lz * side * 2.4, 3.4, 0.18, 14, [0.3, 0.5, 0.62], yaw);
      for (const e of [-6, 6]) {
        B.pillar.addBox(px + lx * side * 3.4 + s.dirx * e, py + 0.1, pz + lz * side * 3.4 + s.dirz * e, 0.18, 2.5, 0.18, [0.4, 0.42, 0.44], yaw);
      }
    }
  }
}

// ---- roundabouts ----
export function buildRoundabout(B, project, rb) {
  const R = rb.radius || 15;
  const laneW = 7.5;
  const rOut = R, rIn = R - laneW;
  const segs = 56;
  const yC = rawTerrainHeight(project, rb.x, rb.z) + 0.22;
  const asphaltC = [0.23, 0.24, 0.26];
  let prev = null;
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    const c = Math.cos(a), s = Math.sin(a);
    const ox = rb.x + c * rOut, oz = rb.z + s * rOut;
    const ix = rb.x + c * rIn, iz = rb.z + s * rIn;
    const yo = rawTerrainHeight(project, ox, oz) + 0.22;
    const yi = rawTerrainHeight(project, ix, iz) + 0.22;
    const cur = { ox, oz, ix, iz, yo, yi };
    if (prev) {
      B.asphalt.addQuad([prev.ix, prev.yi, prev.iz], [cur.ix, cur.yi, cur.iz], [cur.ox, cur.yo, cur.oz], [prev.ox, prev.yo, prev.oz], asphaltC);
      // lane divider dashes
      if (i % 2 === 0) {
        const rM = (rOut + rIn) / 2;
        const mx0 = rb.x + Math.cos(((i - 1) / segs) * Math.PI * 2) * rM, mz0 = rb.z + Math.sin(((i - 1) / segs) * Math.PI * 2) * rM;
        const mx1 = rb.x + Math.cos((i / segs) * Math.PI * 2) * rM, mz1 = rb.z + Math.sin((i / segs) * Math.PI * 2) * rM;
        const y0 = rawTerrainHeight(project, mx0, mz0) + 0.25, y1 = rawTerrainHeight(project, mx1, mz1) + 0.25;
        // approx tangent width
        const tx = -(mz1 - mz0), tz = (mx1 - mx0);
        const l = Math.hypot(tx, tz) || 1;
        const wdt = 0.09;
        B.marking.addQuad(
          [mx0 + tx / l * wdt, y0, mz0 + tz / l * wdt], [mx1 + tx / l * wdt, y1, mz1 + tz / l * wdt],
          [mx1 - tx / l * wdt, y1, mz1 - tz / l * wdt], [mx0 - tx / l * wdt, y0, mz0 - tz / l * wdt], WHITE);
      }
    }
    prev = cur;
  }
  // center island (grass + curb ring) — fan subdivided to quads
  const grassC = [0.32, 0.52, 0.3];
  const islandR = rIn - 0.4;
  const C = [rb.x, yC + 0.16, rb.z];
  for (let i = 0; i < segs; i += 2) {
    const a0 = (i / segs) * Math.PI * 2, a1 = ((i + 2) / segs) * Math.PI * 2, am = ((i + 1) / segs) * Math.PI * 2;
    const P0 = [rb.x + Math.cos(a0) * islandR, yC + 0.16, rb.z + Math.sin(a0) * islandR];
    const P1 = [rb.x + Math.cos(a1) * islandR, yC + 0.16, rb.z + Math.sin(a1) * islandR];
    const M = [rb.x + Math.cos(am) * islandR * 0.55, yC + 0.16, rb.z + Math.sin(am) * islandR * 0.55];
    B.grassMed.addQuad(C, P0, M, P1, grassC);
  }
  // island curb
  prev = null;
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    const c = Math.cos(a), s = Math.sin(a);
    const x = rb.x + c * islandR, z = rb.z + s * islandR;
    const cur = { x, z };
    if (prev) {
      B.curb.addQuad([prev.x, yC - 0.02, prev.z], [cur.x, yC - 0.02, cur.z], [cur.x, yC + 0.16, cur.z], [prev.x, yC + 0.16, prev.z], [0.6, 0.6, 0.62]);
    }
    prev = cur;
  }
}

// ---- terrain + water ----
export function buildTerrainMesh(B, project, grid, N) {
  const S = WORLD_SIZE, half = S / 2;
  const wl = waterLevel(project);
  const cell = S / (N - 1);
  for (let j = 0; j < N - 1; j++) {
    for (let i = 0; i < N - 1; i++) {
      const x0 = -half + i * cell, x1 = x0 + cell;
      const z0 = -half + j * cell, z1 = z0 + cell;
      const h00 = grid[j * N + i], h10 = grid[j * N + i + 1];
      const h01 = grid[(j + 1) * N + i], h11 = grid[(j + 1) * N + i + 1];
      const slope = (Math.abs(h10 - h00) + Math.abs(h01 - h00)) / Math.max(0.001, cell);
      const c00 = terrainColor(h00, wl, slope, x0, z0);
      const c10 = terrainColor(h10, wl, slope, x1, z0);
      const c01 = terrainColor(h01, wl, slope, x0, z1);
      const c11 = terrainColor(h11, wl, slope, x1, z1);
      // two tris would break quad purity for stats; use single quad with averaged color + vertex colors
      const a = B.terrain.vert([x0, h00, z0], c00, i / N * 60, j / N * 60);
      const b = B.terrain.vert([x0, h01, z1], c01, i / N * 60, (j + 1) / N * 60);
      const c = B.terrain.vert([x1, h11, z1], c11, (i + 1) / N * 60, (j + 1) / N * 60);
      const d = B.terrain.vert([x1, h10, z0], c10, (i + 1) / N * 60, j / N * 60);
      B.terrain.quad.push(a, b, c, d);
    }
  }
  // water plane (single big quad grid 8x8 for gentle normals)
  const M = 8;
  const wc = [0.2, 0.45, 0.62];
  for (let j = 0; j < M; j++) {
    for (let i = 0; i < M; i++) {
      const x0 = -half + (i / M) * S, x1 = -half + ((i + 1) / M) * S;
      const z0 = -half + (j / M) * S, z1 = -half + ((j + 1) / M) * S;
      B.water.addQuad([x0, wl, z0], [x0, wl, z1], [x1, wl, z1], [x1, wl, z0], wc);
    }
  }
}

export function bucketStats(B) {
  const stats = {};
  let quads = 0, tris = 0, verts = 0;
  for (const [k, b] of Object.entries(B)) {
    const q = b.quadCount(), t = b.triCount(), v = b.vertCount();
    stats[k] = { quads: q, tris: t, verts: v };
    quads += q; tris += t; verts += v;
  }
  stats._total = { quads, tris, verts };
  return stats;
}

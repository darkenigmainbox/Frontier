// ─── Road network: topology resolution + clean quad-flow geometry ────────────
// Pipeline: plan deck heights → resolve junction topology (endpoint merging +
// crossing splits) → emit quad strips (links), quad-ring junction patches,
// lane markings, pavements, kerb ramps, bridge furniture.

import {
  arcLengths, clamp, dist, dist2, frames, lerp, pointInPolygon, pointPolyline,
  resample, sampleAt, segIntersect, smoothArray, type Frames, type Pt,
} from '../core/math.ts';
import {
  getRoadPreset, laneEdges, roadWidth, type LaneSpec, type RoadPreset,
} from '../core/presets.ts';
import type { Lake, RoadStroke, StrokePoint } from '../core/types.ts';
import { MeshBuilder, hexToRgb, rgbMix, type RGB, type V3 } from './mesh.ts';
import { HeightField, pointInLake, nearRiver } from './terrain.ts';

// ─── Public types ────────────────────────────────────────────────────────────

export interface RiverInfo { pts: Pt[]; width: number }

export interface RoadBuildCtx {
  terrain: HeightField;
  lakes: Lake[];
  rivers: RiverInfo[];
  waterLevel: number;
  autoBridge: boolean;
}

export interface StrokePlan {
  stroke: RoadStroke;
  preset: RoadPreset;
  pts: Pt[];              // dense sample points (spacing ≈ 5 m)
  y: Float64Array;        // deck height per sample
  bridge: Uint8Array;     // 1 where deck is elevated over ground/water
  s: number[];            // arc length per sample
  length: number;
}

export interface JunctionArm {
  strokeId: string;
  typeId: string;
  dirX: number;
  dirZ: number;
  half: number;
  pavW: number;
  y: number;
  trimDist: number;
  crosswalk: boolean;
  ramps: boolean;
  /** Position of the trim line centre. */
  tx: number;
  tz: number;
  left: Pt;
  right: Pt;
}

export interface JunctionInfo {
  x: number;
  z: number;
  y: number;
  r: number;
  arms: JunctionArm[];
  ring: Pt[];
}

export interface RoadBuildResult {
  surface: MeshBuilder;
  markings: MeshBuilder;
  pavement: MeshBuilder;
  curb: MeshBuilder;
  bridge: MeshBuilder;
  junctions: JunctionInfo[];
  plans: Map<string, StrokePlan>;
  /** 2D helpers: per-stroke dense centre lines. */
  outlines: Map<string, { pts: Pt[]; half: number }>;
}

// ─── Height planning ─────────────────────────────────────────────────────────

interface CrossingEvent {
  a: number; b: number;            // stroke indices
  x: number; z: number;
  sa: number; sb: number;          // arc positions on each stroke
}

const DENSE_SPACING = 5;

function strokeToPts(stroke: RoadStroke): Pt[] {
  return stroke.points.map((p) => ({ x: p.x, y: p.z }));
}

function authoredY(stroke: RoadStroke, pts: Pt[]): Float64Array | null {
  const src = stroke.points;
  if (!src.some((p) => p.y !== undefined)) return null;
  const out = new Float64Array(pts.length);
  const sSrc = arcLengths(src.map((p) => ({ x: p.x, y: p.z })));
  const sDst = arcLengths(pts);
  let j = 0;
  for (let i = 0; i < pts.length; i++) {
    const t = sDst[i];
    while (j < sSrc.length - 2 && sSrc[j + 1] < t) j++;
    const f = sSrc[j + 1] - sSrc[j] > 1e-9 ? (t - sSrc[j]) / (sSrc[j + 1] - sSrc[j]) : 0;
    const y0 = src[j].y ?? 0, y1 = src[j + 1].y ?? y0;
    out[i] = lerp(y0, y1, clamp(f, 0, 1));
  }
  return out;
}

export function planStroke(stroke: RoadStroke, ctx: RoadBuildCtx, maxGrade = 0.09): StrokePlan {
  const preset = getRoadPreset(stroke.typeId);
  const raw = strokeToPts(stroke);
  const pts = raw.length >= 2 ? resample(raw, DENSE_SPACING) : raw;
  const n = pts.length;
  const y = new Float64Array(n);
  const bridge = new Uint8Array(n);
  const s = arcLengths(pts);

  const authored = authoredY(stroke, pts);
  const terrainY = new Float64Array(n);
  for (let i = 0; i < n; i++) terrainY[i] = ctx.terrain.sample(pts[i].x, pts[i].y);
  const smoothT = smoothArray(terrainY, 3);

  const overWater = new Uint8Array(n);
  const isRail = false;
  for (let i = 0; i < n; i++) {
    const x = pts[i].x, z = pts[i].y;
    let water = false;
    for (const l of ctx.lakes) if (pointInLake(x, z, l, 3)) { water = true; break; }
    if (!water) for (const r of ctx.rivers) if (nearRiver(x, z, r.pts, r.width, 3)) { water = true; break; }
    overWater[i] = water ? 1 : 0;

    let base = authored ? authored[i] : smoothT[i];
    let minClear = -Infinity;
    if (overWater[i]) minClear = ctx.waterLevel + 2.7;
    if (stroke.bridge) minClear = Math.max(minClear, smoothT[i] + 4.6);
    if (minClear > base) base = minClear;
    y[i] = base;
  }

  // Gentle grade limiting, then re-clamp hard minima
  const spacing = DENSE_SPACING;
  for (let i = 1; i < n; i++) y[i] = clamp(y[i], y[i - 1] - maxGrade * spacing, y[i - 1] + maxGrade * spacing);
  for (let i = n - 2; i >= 0; i--) y[i] = clamp(y[i], y[i + 1] - maxGrade * spacing, y[i + 1] + maxGrade * spacing);
  const smY = smoothArray(y, 1);
  for (let i = 0; i < n; i++) {
    let minY = smoothT[i] - 1.2;
    if (overWater[i]) minY = Math.max(minY, ctx.waterLevel + 2.7 - 0.4);
    if (stroke.bridge) minY = Math.max(minY, smoothT[i] + 4.2);
    y[i] = Math.max(smY[i], minY) + (stroke.elevOffset ?? 0);
  }

  for (let i = 0; i < n; i++) {
    const above = y[i] - terrainY[i];
    const overSurf = overWater[i] === 1 && y[i] > ctx.waterLevel + 0.8;
    bridge[i] = above > 2.0 || overSurf ? 1 : 0;
  }
  if (stroke.bridge) bridge.fill(1);
  void isRail;

  return { stroke, preset, pts, y, bridge, s, length: s[n - 1] ?? 0 };
}

// ─── Topology ────────────────────────────────────────────────────────────────

interface Seed { x: number; z: number; group: number }

interface Piece {
  strokeIdx: number;
  pts: Pt[];
  y: Float64Array;
  s0: number;              // arc start in source stroke
  startGroup: number;      // -1 free end
  endGroup: number;
  plan: StrokePlan;
}

interface Junction {
  x: number; z: number; y: number;
  arms: (JunctionArm & { pieceIdx: number; atStart: boolean })[];
  r: number;
}

export interface Topology {
  pieces: Piece[];
  junctions: Junction[];
  pieceJunction: Map<number, { start: Junction | null; end: Junction | null }>;
}

function collectCrossings(plans: StrokePlan[]): CrossingEvent[] {
  const out: CrossingEvent[] = [];
  for (let a = 0; a < plans.length; a++) {
    for (let b = a + 1; b < plans.length; b++) {
      const A = plans[a], B = plans[b];
      if (A.stroke.noMerge || B.stroke.noMerge) continue;
      // quick reject
      const bbA = bbox(A.pts), bbB = bbox(B.pts);
      if (bbA.maxx < bbB.minx || bbB.maxx < bbA.minx || bbA.maxy < bbB.miny || bbB.maxy < bbA.miny) continue;
      for (let i = 1; i < A.pts.length; i++) {
        for (let j = 1; j < B.pts.length; j++) {
          const hit = segIntersect(
            A.pts[i - 1].x, A.pts[i - 1].y, A.pts[i].x, A.pts[i].y,
            B.pts[j - 1].x, B.pts[j - 1].y, B.pts[j].x, B.pts[j].y,
          );
          if (!hit) continue;
          // Near-endpoint hits become endpoint-touching junctions: record the
          // crossing anyway — seed clustering merges it with the endpoint seed,
          // and split-snapting (below) kills degenerate slivers.
          const sa = A.s[i - 1] + hit.t * (A.s[i] - A.s[i - 1]);
          const sb = B.s[j - 1] + hit.u * (B.s[j] - B.s[j - 1]);
          out.push({ a, b, x: hit.x, z: hit.y, sa, sb });
        }
      }
    }
  }
  return out;
}

function bbox(pts: Pt[]) {
  let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
  for (const p of pts) {
    if (p.x < minx) minx = p.x; if (p.x > maxx) maxx = p.x;
    if (p.y < miny) miny = p.y; if (p.y > maxy) maxy = p.y;
  }
  return { minx, miny, maxx, maxy };
}

export function resolveTopology(plans: StrokePlan[]): Topology {
  // 1. seeds: endpoints + grade crossings
  const seeds: Seed[] = [];
  const push = (x: number, z: number) => { seeds.push({ x, z, group: -1 }); return seeds.length - 1; };

  const endSeed: number[][] = plans.map(() => []);
  plans.forEach((p, pi) => {
    endSeed[pi][0] = push(p.pts[0].x, p.pts[0].y);
    endSeed[pi][1] = push(p.pts[p.pts.length - 1].x, p.pts[p.pts.length - 1].y);
  });

  const crossings = collectCrossings(plans);
  const splitAt: { s: number; seedIdx: number }[][] = plans.map(() => []);
  for (const c of crossings) {
    const ya = samplePlanY(plans[c.a], c.sa), yb = samplePlanY(plans[c.b], c.sb);
    if (Math.abs(ya - yb) > 3.4) continue; // grade separated, no junction
    const idx = push(c.x, c.z);
    splitAt[c.a].push({ s: c.sa, seedIdx: idx });
    splitAt[c.b].push({ s: c.sb, seedIdx: idx });
  }

  // 2. cluster seeds (greedy union within 12 m)
  const parent = seeds.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const uni = (i: number, j: number) => { const a = find(i), b = find(j); if (a !== b) parent[b] = a; };
  for (let i = 0; i < seeds.length; i++) {
    for (let j = i + 1; j < seeds.length; j++) {
      if (dist2(seeds[i].x, seeds[i].z, seeds[j].x, seeds[j].z) < 12 * 12) uni(i, j);
    }
  }
  const groupOf = seeds.map((_, i) => -1);
  const groupCenter: { x: number; z: number; n: number }[] = [];
  for (let i = 0; i < seeds.length; i++) {
    const r = find(i);
    if (groupOf[r] === -1) {
      groupOf[r] = groupCenter.length;
      groupCenter.push({ x: 0, z: 0, n: 0 });
    }
    groupOf[i] = groupOf[r];
    const gc = groupCenter[groupOf[i]];
    gc.x += seeds[i].x; gc.z += seeds[i].z; gc.n++;
  }
  for (const g of groupCenter) { g.x /= g.n; g.z /= g.n; }

  // 3. split pieces
  const pieces: Piece[] = [];
  plans.forEach((plan, pi) => {
    // Snap near-endpoint crossings onto the endpoint so we never emit slivers.
    for (const c of splitAt[pi]) {
      if (c.s < 11) c.s = 0;
      else if (c.s > plan.length - 11) c.s = plan.length;
    }
    const cuts = splitAt[pi].slice().sort((a, b) => a.s - b.s);
    // dedupe close cuts
    const used: typeof cuts = [];
    for (const c of cuts) {
      if (used.length && Math.abs(used[used.length - 1].s - c.s) < 6) continue;
      if (Math.abs(c.s) < 1e-6 || Math.abs(c.s - plan.length) < 1e-6) {
        // endpoint cuts are added explicitly below; keep only one at each end
        if (used.some((u) => u.s === c.s)) continue;
      }
      used.push(c);
    }
    let cursorS = 0;
    const startGroup = groupOf[endSeed[pi][0]];
    const midCuts = used.filter((c) => c.s > 0.5 && c.s < plan.length - 0.5);
    const totalCuts = [{ s: 0, seedIdx: endSeed[pi][0] }, ...midCuts, { s: plan.length, seedIdx: endSeed[pi][1] }];
    for (let k = 1; k < totalCuts.length; k++) {
      const sA = totalCuts[k - 1], sB = totalCuts[k];
      if (sB.s - sA.s < 0.5) continue;
      const sub = slicePlan(plan, sA.s, sB.s);
      if (sub.pts.length >= 2) {
        pieces.push({
          strokeIdx: pi,
          pts: sub.pts,
          y: sub.y,
          s0: sA.s,
          startGroup: k === 1 ? startGroup : groupOf[sA.seedIdx],
          endGroup: groupOf[sB.seedIdx],
          plan,
        });
      }
      cursorS = sB.s;
      void cursorS;
    }
  });

  // 4. junctions: groups with ≥ 3 piece ends
  const endsByGroup = new Map<number, { pieceIdx: number; atStart: boolean }[]>();
  pieces.forEach((p, i) => {
    for (const [g, atStart] of [[p.startGroup, true], [p.endGroup, false]] as const) {
      if (g < 0) continue;
      if (!endsByGroup.has(g)) endsByGroup.set(g, []);
      endsByGroup.get(g)!.push({ pieceIdx: i, atStart });
    }
  });

  const junctions: Junction[] = [];
  const pieceJunction = new Map<number, { start: Junction | null; end: Junction | null }>();
  pieces.forEach((_, i) => pieceJunction.set(i, { start: null, end: null }));

  for (const [g, ends] of endsByGroup) {
    if (ends.length < 3) continue;
    const c = groupCenter[g];
    let maxY = -Infinity;
    for (const e of ends) {
      const p = pieces[e.pieceIdx];
      maxY = Math.max(maxY, e.atStart ? p.y[0] : p.y[p.y.length - 1]);
    }
    const junction: Junction = { x: c.x, z: c.z, y: maxY, arms: [], r: 12 };
    let maxHalf = 0;
    for (const e of ends) {
      const p = pieces[e.pieceIdx];
      const preset = p.plan.preset;
      const half = roadWidth(preset) / 2;
      maxHalf = Math.max(maxHalf, half);
      // direction pointing away from junction
      let dx: number, dz: number;
      if (e.atStart) {
        dx = p.pts[1].x - p.pts[0].x; dz = p.pts[1].y - p.pts[0].y;
      } else {
        const n = p.pts.length;
        dx = p.pts[n - 2].x - p.pts[n - 1].x; dz = p.pts[n - 2].y - p.pts[n - 1].y;
      }
      const l = Math.hypot(dx, dz) || 1;
      dx /= l; dz /= l;
      const armY = e.atStart ? p.y[0] : p.y[p.y.length - 1];
      junction.arms.push({
        strokeId: p.plan.stroke.id,
        typeId: p.plan.stroke.typeId,
        dirX: dx, dirZ: dz,
        half,
        pavW: preset.pavement?.width ?? 0,
        y: armY,
        trimDist: 0, // filled below
        crosswalk: preset.markings.crosswalk,
        ramps: !!preset.pavement?.ramps,
        tx: c.x + dx * 10, tz: c.z + dz * 10,
        left: { x: 0, y: 0 }, right: { x: 0, y: 0 },
        pieceIdx: e.pieceIdx, atStart: e.atStart,
      });
    }
    junction.r = clamp(maxHalf * 1.25 + 3.5, 9, 26);
    for (const arm of junction.arms) {
      arm.trimDist = junction.r;
      const nx = -arm.dirZ, nz = arm.dirX;
      arm.tx = junction.x + arm.dirX * arm.trimDist;
      arm.tz = junction.z + arm.dirZ * arm.trimDist;
      arm.left = { x: arm.tx + nx * arm.half, y: arm.tz + nz * arm.half };
      arm.right = { x: arm.tx - nx * arm.half, y: arm.tz - nz * arm.half };
    }
    // sort arms CCW by bearing
    junction.arms.sort((a, b) => Math.atan2(a.dirZ, a.dirX) - Math.atan2(b.dirZ, b.dirX));
    junctions.push(junction);
    for (const e of ends) {
      const pj = pieceJunction.get(e.pieceIdx)!;
      if (e.atStart) pj.start = junction; else pj.end = junction;
    }
  }

  return { pieces, junctions, pieceJunction };
}

function samplePlanY(plan: StrokePlan, s: number): number {
  let i = 1;
  while (i < plan.s.length - 1 && plan.s[i] < s) i++;
  const s0 = plan.s[i - 1], s1 = plan.s[i];
  const f = s1 - s0 > 1e-9 ? (s - s0) / (s1 - s0) : 0;
  return lerp(plan.y[i - 1], plan.y[i], clamp(f, 0, 1));
}

function slicePlan(plan: StrokePlan, sA: number, sB: number): { pts: Pt[]; y: Float64Array } {
  const pts: Pt[] = [];
  const ys: number[] = [];
  const P = plan.pts;
  const S = plan.s;
  for (let i = 0; i < P.length; i++) {
    if (S[i] > sA && S[i] < sB) { pts.push(P[i]); ys.push(plan.y[i]); }
  }
  const head = samplePointAt(plan, sA), tail = samplePointAt(plan, sB);
  const outPts = [head.pt, ...pts, tail.pt];
  const outY = new Float64Array(outPts.length);
  outY[0] = head.y;
  for (let i = 0; i < ys.length; i++) outY[i + 1] = ys[i];
  outY[outY.length - 1] = tail.y;
  return { pts: outPts, y: outY };
}

function samplePointAt(plan: StrokePlan, s: number): { pt: Pt; y: number } {
  let i = 1;
  while (i < plan.s.length - 1 && plan.s[i] < s) i++;
  const s0 = plan.s[i - 1], s1 = plan.s[i];
  const f = s1 - s0 > 1e-9 ? (s - s0) / (s1 - s0) : 0;
  return {
    pt: { x: lerp(plan.pts[i - 1].x, plan.pts[i].x, f), y: lerp(plan.pts[i - 1].y, plan.pts[i].y, f) },
    y: lerp(plan.y[i - 1], plan.y[i], f),
  };
}

// ─── Geometry emission ───────────────────────────────────────────────────────

interface Frame3 {
  x: number; z: number; y: number;
  nx: number; nz: number;
  s: number;
}

function pieceFrames(pts: Pt[], ys: Float64Array): Frame3[] {
  const f = frames(pts);
  const out: Frame3[] = [];
  for (let i = 0; i < pts.length; i++) {
    out.push({ x: pts[i].x, z: pts[i].y, y: ys[i], nx: f.nx[i], nz: f.ny[i], s: f.s[i] });
  }
  return out;
}

function v3(fr: Frame3, lat: number, h: number): V3 {
  return { x: fr.x + fr.nx * lat, y: fr.y + h, z: fr.z + fr.nz * lat };
}

function shade(base: RGB, k: number): RGB {
  return { r: base.r * k, g: base.g * k, b: base.b * k };
}

/** Per-lane tint so lanes read clearly in 3D without textures. */
function laneTint(surface: RGB, kind: LaneSpec['kind']): RGB {
  switch (kind) {
    case 'parking': return rgbMix(surface, hexToRgb('#5a5b62'), 0.35);
    case 'bike': return rgbMix(surface, hexToRgb('#2e4d3a'), 0.5);
    case 'bus': return rgbMix(surface, hexToRgb('#5a3030'), 0.45);
    case 'median': return rgbMix(surface, hexToRgb('#4c5a3a'), 0.75);
    case 'verge': return rgbMix(surface, hexToRgb('#6c7c4c'), 0.6);
    default: return surface;
  }
}

export function buildRoadNetwork(strokes: RoadStroke[], ctx: RoadBuildCtx, prePlans?: Map<string, StrokePlan>): RoadBuildResult {
  const surface = new MeshBuilder();
  const markings = new MeshBuilder();
  const pavement = new MeshBuilder();
  const curb = new MeshBuilder();
  const bridge = new MeshBuilder();

  const plans = new Map<string, StrokePlan>();
  const planList: StrokePlan[] = [];
  for (const st of strokes) {
    const p = prePlans?.get(st.id) ?? planStroke(st, ctx);
    plans.set(st.id, p);
    planList.push(p);
  }

  // Local overpass bumps: where two roads cross without merging but are too close
  const top = resolveTopology(planList);
  void top;

  const outlines = new Map<string, { pts: Pt[]; half: number }>();

  for (const plan of planList) {
    const preset = plan.preset;
    const w = roadWidth(preset);
    const half = w / 2;
    const pavW = preset.pavement?.width ?? 0;
    const pavH = preset.pavement?.height ?? 0;
    outlines.set(plan.stroke.id, { pts: plan.pts, half });
    void laneEdges;
  }

  // Rebuild topology (already done above) — emit per piece with trims
  const topo = top;
  for (const piece of topo.pieces) {
    emitPieceGeometry(piece, topo, ctx, surface, markings, pavement, curb, bridge);
  }
  for (const j of topo.junctions) {
    emitJunction(j, surface, pavement, curb);
  }
  for (const plan of planList) {
    emitBridgeFurniture(plan, ctx, bridge, surface);
  }

  const junctions: JunctionInfo[] = topo.junctions.map((j) => ({
    x: j.x, z: j.z, y: j.y, r: j.r,
    ring: buildJunctionRing(j),
    arms: j.arms.map((a) => ({
      strokeId: a.strokeId, typeId: a.typeId,
      dirX: a.dirX, dirZ: a.dirZ, half: a.half, pavW: a.pavW,
      y: a.y, trimDist: a.trimDist, crosswalk: a.crosswalk, ramps: a.ramps,
      tx: a.tx, tz: a.tz, left: a.left, right: a.right,
    })),
  }));

  return { surface, markings, pavement, curb, bridge, junctions, plans, outlines };
}

function buildJunctionRing(j: Junction): Pt[] {
  const ring: Pt[] = [];
  const m = j.arms.length;
  for (let i = 0; i < m; i++) {
    ring.push({ x: j.arms[i].right.x, y: j.arms[i].right.y });
    ring.push({ x: j.arms[i].left.x, y: j.arms[i].left.y });
  }
  return ring;
}

function emitPieceGeometry(
  piece: Piece,
  topo: Topology,
  ctx: RoadBuildCtx,
  surface: MeshBuilder,
  markings: MeshBuilder,
  pavement: MeshBuilder,
  curb: MeshBuilder,
  bridge: MeshBuilder,
): void {
  const plan = piece.plan;
  const preset = plan.preset;
  const w = roadWidth(preset);
  const half = w / 2;
  const pavW = preset.pavement?.width ?? 0;
  const pavH = preset.pavement?.height ?? 0;
  const surf = hexToRgb(preset.color);
  const pavCol = hexToRgb(preset.pavementColor);
  const curbCol = hexToRgb(preset.curbColor);
  const markCol = hexToRgb(preset.markingColor);

  const idx = topo.pieces.indexOf(piece);
  const jStart = topo.pieceJunction.get(idx)?.start ?? null;
  const jEnd = topo.pieceJunction.get(idx)?.end ?? null;

  const frAll = pieceFrames(piece.pts, piece.y);
  const len = frAll[frAll.length - 1]?.s ?? 0;
  const s0 = jStart ? jStart.r * 0.92 : 0;
  const s1 = jEnd ? len - jEnd.r * 0.92 : len;
  if (s1 <= s0 + 0.5) return;

  // Clip frames to [s0, s1]
  const fr = clipFrames(frAll, s0, s1);
  if (fr.length < 2) return;

  // ── carriageway: quad strip per lane band (clean quads, per-lane tint) ──
  const edges = laneEdges(preset);
  const laneBands: { a: number; b: number; spec: LaneSpec | null }[] = [];
  // edges includes shoulder edges at both ends; lane k spans edges[k+1]..edges[k+2] shifted by shoulder
  // Reconstruct: first edge = -half, then shoulder, then lanes, then shoulder, then +half
  {
    let x = -half;
    let ei = 0;
    const spans: { a: number; b: number; spec: LaneSpec | null }[] = [];
    if (preset.shoulder > 0) {
      spans.push({ a: x, b: x + preset.shoulder, spec: null });
      x += preset.shoulder;
    }
    for (const l of preset.lanes) {
      spans.push({ a: x, b: x + l.width, spec: l });
      x += l.width;
    }
    if (preset.shoulder > 0) {
      spans.push({ a: x, b: x + preset.shoulder, spec: null });
      x += preset.shoulder;
    }
    laneBands.push(...spans);
    void ei;
    void edges;
  }

  for (const band of laneBands) {
    const tint = band.spec ? laneTint(surf, band.spec.kind) : rgbMix(surf, hexToRgb('#6c6c66'), 0.28);
    for (let i = 1; i < fr.length; i++) {
      const f0 = fr[i - 1], f1 = fr[i];
      surface.quad(
        v3(f0, band.a, 0.0), v3(f0, band.b, 0.0),
        v3(f1, band.b, 0.0), v3(f1, band.a, 0.0),
        tint,
      );
    }
  }

  // ── markings ────────────────────────────────────────────────────────────
  if (ctx) {
    const inset0 = jStart && preset.markings.crosswalk ? jStart.r + 5.2 : 1;
    const inset1 = jEnd && preset.markings.crosswalk ? len - jEnd.r - 5.2 : len - 1;
    const dash = { on: 3, off: 4.5, width: 0.14 };

    // lane divider dashes at interior edges
    let runStart = -half + preset.shoulder;
    const dividers: number[] = [];
    for (const l of preset.lanes) {
      runStart += l.width;
      dividers.push(runStart);
    }
    // remove outermost (road edges) — they are edge lines
    const innerDivs = dividers.slice(0, -1);

    const boundaryKind = (offset: number): 'center' | 'lane' => {
      // boundary sits between last negative lane and first positive lane?
      const mid = (edges[edges.length - 1] - edges[0]) / 2 + edges[0];
      return Math.abs(offset - 0) < 0.01 || Math.abs(offset - mid) < 0.3 ? 'center' : 'lane';
    };
    void boundaryKind;

    // Center line: boundary between the two directions (first +1 lane edge)
    let acc = -half + preset.shoulder;
    let centerOff = 0;
    let seenNeg = false;
    for (const l of preset.lanes) {
      if (l.dir === -1) seenNeg = true;
      if (seenNeg && l.dir === 1) { centerOff = acc; break; }
      acc += l.width;
    }

    const markOffset = (f: Frame3, off: number, width: number, h = 0.022): [V3, V3] =>
      [v3(f, off - width / 2, h), v3(f, off + width / 2, h)];

    if (preset.markings.center === 'single' || preset.markings.center === 'dashed') {
      drawDashedLine(markings, fr, centerOff, dash.width, inset0, inset1,
        preset.markings.center === 'dashed' ? dash : { on: 1e6, off: 0, width: dash.width }, markCol);
    } else if (preset.markings.center === 'double' || preset.markings.center === 'double-yellow') {
      const col = preset.markings.center === 'double-yellow' ? hexToRgb('#d8b13a') : markCol;
      drawDashedLine(markings, fr, centerOff - 0.18, 0.13, inset0, inset1, { on: 1e6, off: 0, width: 0.13 }, col);
      drawDashedLine(markings, fr, centerOff + 0.18, 0.13, inset0, inset1, { on: 1e6, off: 0, width: 0.13 }, col);
    }

    if (preset.markings.lane === 'dashed' || preset.markings.lane === 'solid') {
      for (const off of innerDivs) {
        if (Math.abs(off - centerOff) < 0.25) continue;
        drawDashedLine(markings, fr, off, dash.width, inset0, inset1,
          preset.markings.lane === 'dashed' ? dash : { on: 1e6, off: 0, width: dash.width }, markCol);
      }
    }

    if (preset.markings.edge) {
      drawDashedLine(markings, fr, -half + 0.32, 0.16, inset0, inset1, { on: 1e6, off: 0, width: 0.16 }, markCol);
      drawDashedLine(markings, fr, half - 0.32, 0.16, inset0, inset1, { on: 1e6, off: 0, width: 0.16 }, markCol);
    }

    // ── crosswalk + stop line at junction entries ─────────────────────────
    if (jStart && jStart.arms.some((a) => a.crosswalk)) {
      emitCrosswalk(markings, fr, 0, jStart, preset, markCol);
    }
    if (jEnd && jEnd.arms.some((a) => a.crosswalk)) {
      emitCrosswalk(markings, fr, len, jEnd, preset, markCol);
    }
  }

  // ── pavements + kerbs + ramps ───────────────────────────────────────────
  if (pavW > 0) {
    for (const side of [-1, 1] as const) {
      const lat0 = side * half;
      const lat1 = side * (half + pavW);
      // top strip
      for (let i = 1; i < fr.length; i++) {
        const f0 = fr[i - 1], f1 = fr[i];
        const a0 = v3(f0, lat0, pavH), a1 = v3(f0, lat1, pavH);
        const b0 = v3(f1, lat0, pavH), b1 = v3(f1, lat1, pavH);
        if (side > 0) pavement.quad(a1, a0, b0, b1, pavCol);
        else pavement.quad(a0, a1, b1, b0, pavCol);
      }
      // kerb face (vertical) — replaced by ramps at entries
      const rampStartS = jStart && preset.pavement?.ramps && preset.markings.crosswalk ? jStart.r + 0.5 : -1;
      const rampEndS = jStart && preset.pavement?.ramps && preset.markings.crosswalk ? jStart.r + 3.2 : -1;
      const rampStartE = jEnd && preset.pavement?.ramps && preset.markings.crosswalk ? len - jEnd.r - 3.2 : -1;
      const rampEndE = jEnd && preset.pavement?.ramps && preset.markings.crosswalk ? len - jEnd.r - 0.5 : -1;

      for (let i = 1; i < fr.length; i++) {
        const f0 = fr[i - 1], f1 = fr[i];
        const midS = (f0.s + f1.s) / 2;
        const inRamp = (midS > rampStartS && midS < rampEndS) || (midS > rampStartE && midS < rampEndE);
        if (inRamp) continue;
        const q0 = v3(f0, lat0, 0.02), q1 = v3(f1, lat0, 0.02);
        const t0 = v3(f0, lat0, pavH), t1 = v3(f1, lat0, pavH);
        if (side > 0) curb.quad(q1, q0, t0, t1, curbCol);
        else curb.quad(q0, q1, t1, t0, curbCol);
      }

      // ramp patches
      const emitRamp = (fromS: number, toS: number) => {
        if (fromS < 0 || toS < 0 || toS <= fromS) return;
        const rf = clipFrames(fr, fromS, toS);
        if (rf.length < 2) return;
        for (let i = 1; i < rf.length; i++) {
          const f0 = rf[i - 1], f1 = rf[i];
          const u0 = clamp((f0.s - fromS) / (toS - fromS), 0, 1);
          const u1 = clamp((f1.s - fromS) / (toS - fromS), 0, 1);
          // height falls from pavH (deep end) to 0.03 (kerb edge end)
          const h0 = lerp(0.03, pavH, u0), h1 = lerp(0.03, pavH, u1);
          const in0 = v3(f0, lat0, 0.02), in1 = v3(f1, lat0, 0.02);
          const out0 = v3(f0, lat1, h0), out1 = v3(f1, lat1, h1);
          if (side > 0) pavement.quad(in1, in0, out0, out1, rgbMix(pavCol, hexToRgb('#b9b2a0'), 0.3));
          else pavement.quad(in0, in1, out1, out0, rgbMix(pavCol, hexToRgb('#b9b2a0'), 0.3));
        }
        // tactile pad near the top of the ramp
        const mid = (fromS + toS) / 2 + (toS - fromS) * 0.22;
        const fmid = clipFrames(fr, mid - 0.4, mid + 0.4)[0];
        if (fmid) {
          const pad = v3(fmid, (lat0 + lat1) / 2, pavH + 0.012);
          pavement.box(pad.x, pad.y, pad.z, pavW * 0.85, 0.025, 1.6, Math.atan2(fmid.nx, -fmid.nz), '#d8b14a');
        }
      };
      emitRamp(rampStartS, rampEndS);
      emitRamp(rampStartE, rampEndE);
    }
  }
}

function clipFrames(fr: Frame3[], s0: number, s1: number): Frame3[] {
  const out: Frame3[] = [];
  for (const f of fr) {
    if (f.s >= s0 && f.s <= s1) out.push(f);
  }
  // interpolate boundary frames
  if (out.length < 2) return out;
  const first = out[0], last = out[out.length - 1];
  if (first.s > s0 + 0.01) {
    const prev = fr[fr.indexOf(first) - 1] ?? first;
    const t = (s0 - prev.s) / Math.max(1e-6, first.s - prev.s);
    out.unshift(lerpFrame(prev, first, t));
  }
  if (last.s < s1 - 0.01) {
    const next = fr[fr.indexOf(last) + 1] ?? last;
    const t = (s1 - last.s) / Math.max(1e-6, next.s - last.s);
    out.push(lerpFrame(last, next, t));
  }
  return out;
}

function lerpFrame(a: Frame3, b: Frame3, t: number): Frame3 {
  return {
    x: lerp(a.x, b.x, t), z: lerp(a.z, b.z, t), y: lerp(a.y, b.y, t),
    nx: lerp(a.nx, b.nx, t), nz: lerp(a.nz, b.nz, t), s: lerp(a.s, b.s, t),
  };
}

function drawDashedLine(
  mb: MeshBuilder,
  fr: Frame3[],
  offset: number,
  width: number,
  s0: number,
  s1: number,
  dash: { on: number; off: number; width: number },
  color: RGB,
): void {
  const h = 0.022;
  const period = dash.on + dash.off;
  if (period <= 0) return;
  const solid = dash.on > 1e5;
  for (let i = 1; i < fr.length; i++) {
    const f0 = fr[i - 1], f1 = fr[i];
    const a0 = f0.s, a1 = f1.s;
    if (a1 <= a0) continue;
    const t0 = Math.max(a0, s0), t1 = Math.min(a1, s1);
    if (t1 <= t0) continue;
    const emit = (os: number, oe: number) => {
      const u0 = (os - a0) / (a1 - a0), u1 = (oe - a0) / (a1 - a0);
      const g0 = lerpFrame(f0, f1, u0), g1 = lerpFrame(f0, f1, u1);
      if (g1.s - g0.s < 0.12) return;
      const a = v3(g0, offset - width / 2, h), b = v3(g0, offset + width / 2, h);
      const c = v3(g1, offset + width / 2, h), d = v3(g1, offset - width / 2, h);
      mb.quad(a, b, c, d, color);
    };
    if (solid) {
      emit(t0, t1);
    } else {
      let k = Math.floor(t0 / period);
      while (k * period < t1) {
        const ds = k * period, de = ds + dash.on;
        const os = Math.max(t0, ds), oe = Math.min(t1, de);
        if (oe > os) emit(os, oe);
        k++;
      }
    }
  }
}

function emitCrosswalk(
  mb: MeshBuilder,
  fr: Frame3[],
  atS: number,
  junction: Junction,
  preset: RoadPreset,
  color: RGB,
): void {
  const half = roadWidth(preset) / 2;
  const fromS = atS === 0 ? junction.r + 0.5 : atS - junction.r - 4.2;
  const toS = atS === 0 ? junction.r + 4.2 : atS - junction.r - 0.5;
  const cf = clipFrames(fr, fromS, toS);
  if (cf.length < 2) return;
  // zebra stripes across the carriageway
  const stripeW = 0.55, gap = 0.75;
  let lat = -half + 0.7;
  while (lat < half - 1.0) {
    for (let i = 1; i < cf.length; i++) {
      const f0 = cf[i - 1], f1 = cf[i];
      const a = v3(f0, lat, 0.026), b = v3(f0, lat + stripeW, 0.026);
      const c = v3(f1, lat + stripeW, 0.026), d = v3(f1, lat, 0.026);
      mb.quad(a, b, c, d, color);
    }
    lat += stripeW + gap;
  }
  // stop line
  const slS = atS === 0 ? junction.r + 5.0 : atS - junction.r - 5.0;
  const sf = clipFrames(fr, slS - 0.35, slS + 0.35);
  if (sf.length >= 1) {
    const f = sf[0];
    const a = v3(f, -half + 0.55, 0.026), b = v3(f, half - 0.55, 0.026);
    const dirx = -f.nz, dirz = f.nx;
    const c = { x: b.x + dirx * 0.45, y: 0.026 + b.y, z: b.z + dirz * 0.45 };
    const d = { x: a.x + dirx * 0.45, y: 0.026 + a.y, z: a.z + dirz * 0.45 };
    mb.quad(a, b, c, d, color);
  }
}

function emitJunction(j: Junction, surface: MeshBuilder, pavement: MeshBuilder, curb: MeshBuilder): void {
  const m = j.arms.length;
  if (m < 3) return;
  const ring: { x: number; z: number; y: number }[] = [];
  // CCW ring: R_i, L_i per arm (arms pre-sorted CCW)
  for (const arm of j.arms) {
    ring.push({ x: arm.right.x, z: arm.right.y, y: arm.y });
    ring.push({ x: arm.left.x, z: arm.left.y, y: arm.y });
  }
  const n = ring.length;
  const inner = ring.map((p) => ({
    x: j.x + (p.x - j.x) * 0.42,
    z: j.z + (p.z - j.z) * 0.42,
    y: p.y,
  }));
  const cy = ring.reduce((s, p) => s + p.y, 0) / n;

  // quad ring
  for (let i = 0; i < n; i++) {
    const k = (i + 1) % n;
    const a = { x: ring[i].x, y: ring[i].y + 0.012, z: ring[i].z };
    const b = { x: ring[k].x, y: ring[k].y + 0.012, z: ring[k].z };
    const c = { x: inner[k].x, y: inner[k].y + 0.012, z: inner[k].z };
    const d = { x: inner[i].x, y: inner[i].y + 0.012, z: inner[i].z };
    surface.quad(a, b, c, d, hexToRgb('#33343a'));
  }
  // centre fan
  const center: V3 = { x: j.x, y: cy + 0.012, z: j.z };
  for (let i = 0; i < n; i++) {
    const k = (i + 1) % n;
    surface.tri(
      center,
      { x: inner[i].x, y: inner[i].y + 0.012, z: inner[i].z },
      { x: inner[k].x, y: inner[k].y + 0.012, z: inner[k].z },
      hexToRgb('#33343a'),
    );
  }

  // ── corner pavement patches between adjacent arms ──────────────────────
  for (let i = 0; i < m; i++) {
    const armA = j.arms[i];
    const armB = j.arms[(i + 1) % m];
    const pavA = armA.pavW, pavB = armB.pavW;
    if (pavA <= 0 && pavB <= 0) continue;
    const nAx = -armA.dirZ, nAz = armA.dirX;
    const nBx = -armB.dirZ, nBz = armB.dirX;
    // outer corners (pavement outer edge at trim line)
    // left of armA faces the corner; right of armB faces the corner
    const pA = { x: armA.left.x + nAx * pavA, z: armA.left.y + nAz * pavA };
    const pB = { x: armB.right.x - nBx * pavB, z: armB.right.y - nBz * pavB };
    const hA = armA.y + (j.arms[i].ramps ? 0.15 : 0.15);
    const hB = armB.y + 0.15;
    const h = Math.max(hA, hB);

    // outer arc from pA to pB around junction centre
    const angA = Math.atan2(pA.z - j.z, pA.x - j.x);
    let angB = Math.atan2(pB.z - j.z, pB.x - j.x);
    while (angB < angA) angB += Math.PI * 2;
    const rA = dist(pA.x, pA.z, j.x, j.z), rB = dist(pB.x, pB.z, j.x, j.z);
    const steps = 5;
    const outer: { x: number; z: number }[] = [];
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const ang = lerp(angA, angB, t);
      const r = lerp(rA, rB, t);
      outer.push({ x: j.x + Math.cos(ang) * r, z: j.z + Math.sin(ang) * r });
    }
    // inner chain: along the junction ring edge armA.left → armB.right
    const innerChain: { x: number; z: number }[] = [];
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      innerChain.push({
        x: lerp(armA.left.x, armB.right.x, t),
        z: lerp(armA.left.y, armB.right.y, t),
      });
    }
    for (let s = 0; s < steps; s++) {
      const o0 = outer[s], o1 = outer[s + 1], i0 = innerChain[s], i1 = innerChain[s + 1];
      pavement.quad(
        { x: o0.x, y: h, z: o0.z }, { x: i0.x, y: h, z: i0.z },
        { x: i1.x, y: h, z: i1.z }, { x: o1.x, y: h, z: o1.z },
        hexToRgb('#9a9aa0'),
      );
      // kerb face along the inner chain
      curb.quad(
        { x: i0.x, y: armA.y + 0.01, z: i0.z }, { x: i1.x, y: armA.y + 0.01, z: i1.z },
        { x: i1.x, y: h, z: i1.z }, { x: i0.x, y: h, z: i0.z },
        hexToRgb('#7c7c82'),
      );
      // outer skirt
      curb.quad(
        { x: i0.x, y: h, z: i0.z }, { x: o0.x, y: h, z: o0.z },
        { x: o1.x, y: h - 0.1, z: o1.z }, { x: i1.x, y: h - 0.1, z: i1.z },
        hexToRgb('#74747a'),
      );
    }
  }
}

function emitBridgeFurniture(plan: StrokePlan, ctx: RoadBuildCtx, mb: MeshBuilder, surface: MeshBuilder): void {
  const preset = plan.preset;
  const half = roadWidth(preset) / 2;
  const girder = hexToRgb('#5c5f66');
  const railCol = hexToRgb('#8d9198');

  // contiguous elevated runs
  let i = 0;
  const n = plan.pts.length;
  while (i < n) {
    if (!plan.bridge[i]) { i++; continue; }
    let j = i;
    while (j < n && plan.bridge[j]) j++;
    const sStart = plan.s[i], sEnd = plan.s[j - 1];
    if (sEnd - sStart > 14) {
      const fr = frames(plan.pts.slice(i, j)).pts.length >= 2
        ? pieceFrames(plan.pts.slice(i, j), plan.y.slice(i, j))
        : [];
      if (fr.length >= 2) {
        // girders: thick edge beams under the deck
        for (const side of [-1, 1] as const) {
          for (let k = 1; k < fr.length; k++) {
            const f0 = fr[k - 1], f1 = fr[k];
            const lat = side * (half - 0.15);
            const top0 = v3(f0, lat, -0.06), top1 = v3(f1, lat, -0.06);
            const bot0 = v3(f0, lat, -1.15), bot1 = v3(f1, lat, -1.15);
            const in0 = v3(f0, lat - side * 0.45, -1.15), in1 = v3(f1, lat - side * 0.45, -1.15);
            mb.quad(top0, top1, bot1, bot0, girder);
            mb.quad(bot0, bot1, in1, in0, shade(girder, 0.85));
            mb.quad(in0, in1, v3(f1, lat - side * 0.45, -0.06), v3(f0, lat - side * 0.45, -0.06), shade(girder, 0.95));
          }
        }
        // deck underside
        for (let k = 1; k < fr.length; k++) {
          const f0 = fr[k - 1], f1 = fr[k];
          mb.quad(
            v3(f0, -half + 0.3, -1.15), v3(f0, half - 0.3, -1.15),
            v3(f1, half - 0.3, -1.15), v3(f1, -half + 0.3, -1.15),
            shade(girder, 0.55),
          );
        }
        // railings
        if (preset.bridgeRails) {
          for (const side of [-1, 1] as const) {
            for (let k = 0; k < fr.length; k += 3) {
              const f = fr[k];
              const p = v3(f, side * (half - 0.35), 0.55);
              mb.box(p.x, p.y, p.z, 0.1, 1.15, 0.1, 0, railCol);
            }
            for (let k = 1; k < fr.length; k++) {
              const f0 = fr[k - 1], f1 = fr[k];
              for (const hgt of [0.55, 1.08]) {
                const a = v3(f0, side * (half - 0.35), hgt), b = v3(f1, side * (half - 0.35), hgt);
                const c = { x: b.x, y: b.y + 0.09, z: b.z }, d = { x: a.x, y: a.y + 0.09, z: a.z };
                mb.quad(a, b, c, d, railCol);
              }
            }
          }
        }
        // piers
        let sincePier = 0;
        for (let k = 1; k < fr.length; k++) {
          const f0 = fr[k - 1], f1 = fr[k];
          const segLen = dist(f0.x, f0.z, f1.x, f1.z);
          sincePier += segLen;
          if (sincePier >= 24 || k === 1) {
            sincePier = 0;
            const g = ctx.terrain.sample(f1.x, f1.z);
            const h = f1.y - 1.3 - g;
            if (h > 1.2) {
              mb.boxOn(f1.x, g, f1.z, 1.7, h, 1.35, Math.atan2(f1.nx, -f1.nz), hexToRgb('#8a8d92'));
              // pier cap
              mb.boxOn(f1.x, f1.y - 1.35, f1.z, half * 1.2, 0.5, 1.6, Math.atan2(f1.nx, -f1.nz), hexToRgb('#9a9da2'));
            }
          }
        }
      }
    }
    i = j;
  }
  void surface;
}

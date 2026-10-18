// ─── Rail geometry: heavy rail (ballast, sleepers, level crossings) + monorail ─

import { arcLengths, clamp, dist, dist2, frames, lerp, resample, smoothArray, type Pt } from '../core/math.ts';
import { getRailPreset, type RailPreset } from '../core/presets.ts';
import type { RailStroke, RoadStroke } from '../core/types.ts';
import { MeshBuilder, hexToRgb, rgbMix, type V3 } from './mesh.ts';
import { HeightField, nearRiver, pointInLake } from './terrain.ts';
import type { RiverInfo, RoadBuildCtx, StrokePlan } from './roads.ts';

export interface RailPlan {
  stroke: RailStroke;
  preset: RailPreset;
  pts: Pt[];
  y: Float64Array;
  bridge: Uint8Array;
  s: number[];
  length: number;
}

export interface RailBuildResult {
  ballast: MeshBuilder;
  rails: MeshBuilder;
  furniture: MeshBuilder;
  monorail: MeshBuilder;
  plans: Map<string, RailPlan>;
  crossings: { x: number; z: number; rot: number; roadY: number }[];
}

export function planRailStroke(stroke: RailStroke, ctx: RoadBuildCtx): RailPlan {
  const preset = getRailPreset(stroke.typeId);
  const raw = stroke.points.map((p) => ({ x: p.x, y: p.z }));
  const pts = raw.length >= 2 ? resample(raw, 5) : raw;
  const n = pts.length;
  const y = new Float64Array(n);
  const bridge = new Uint8Array(n);
  const s = arcLengths(pts);

  const terrainY = new Float64Array(n);
  for (let i = 0; i < n; i++) terrainY[i] = ctx.terrain.sample(pts[i].x, pts[i].y);
  const smoothT = smoothArray(terrainY, 3);
  const overWater = new Uint8Array(n);

  const maxGrade = preset.elevated ? 0.045 : 0.035;
  for (let i = 0; i < n; i++) {
    const x = pts[i].x, z = pts[i].y;
    let water = false;
    for (const l of ctx.lakes) if (pointInLake(x, z, l, 3)) { water = true; break; }
    if (!water) for (const r of ctx.rivers) if (nearRiver(x, z, r.pts, r.width, 3)) { water = true; break; }
    overWater[i] = water ? 1 : 0;

    let base = smoothT[i];
    if (preset.elevated) {
      base = Math.max(smoothT[i] + preset.pylonHeight, ctx.waterLevel + preset.pylonHeight * 0.75);
    } else if (overWater[i]) {
      base = Math.max(base, ctx.waterLevel + 3.4);
    }
    if (stroke.elevated) base = Math.max(base, smoothT[i] + 6);
    y[i] = base;
  }

  const spacing = 5;
  for (let i = 1; i < n; i++) y[i] = clamp(y[i], y[i - 1] - maxGrade * spacing, y[i - 1] + maxGrade * spacing);
  for (let i = n - 2; i >= 0; i--) y[i] = clamp(y[i], y[i + 1] - maxGrade * spacing, y[i + 1] + maxGrade * spacing);

  for (let i = 0; i < n; i++) {
    const above = y[i] - terrainY[i];
    const overSurf = overWater[i] === 1 && y[i] > ctx.waterLevel + 0.8;
    bridge[i] = above > 2.0 || overSurf ? 1 : 0;
  }
  return { stroke, preset, pts, y, bridge, s, length: s[n - 1] ?? 0 };
}

interface F3 { x: number; z: number; y: number; nx: number; nz: number; s: number }

function toF3(pts: Pt[], ys: Float64Array): F3[] {
  const f = frames(pts);
  return pts.map((p, i) => ({ x: p.x, z: p.y, y: ys[i], nx: f.nx[i], nz: f.ny[i], s: f.s[i] }));
}

function V(f: F3, lat: number, h: number): V3 {
  return { x: f.x + f.nx * lat, y: f.y + h, z: f.z + f.nz * lat };
}

export function buildRails(
  strokes: RailStroke[],
  ctx: RoadBuildCtx,
  roadPlans?: Map<string, StrokePlan>,
  outPlans?: Map<string, RailPlan>,
): RailBuildResult {
  const ballast = new MeshBuilder();
  const rails = new MeshBuilder();
  const furniture = new MeshBuilder();
  const monorail = new MeshBuilder();
  const plans = outPlans ?? new Map<string, RailPlan>();
  const crossings: RailBuildResult['crossings'] = [];

  for (const st of strokes) {
    const plan = planRailStroke(st, ctx);
    plans.set(st.id, plan);
  }

  // Monorail clearance over roads: raise beams above crossing roads
  if (roadPlans) {
    for (const plan of plans.values()) {
      if (plan.preset.id !== 'monorail') continue;
      for (let i = 0; i < plan.pts.length; i++) {
        let need = -Infinity;
        for (const rp of roadPlans.values()) {
          for (let j = 0; j < rp.pts.length; j++) {
            const d2 = dist2(plan.pts[i].x, plan.pts[i].y, rp.pts[j].x, rp.pts[j].y);
            if (d2 < 22 * 22) need = Math.max(need, rp.y[j] + 8.5);
          }
        }
        if (need > plan.y[i]) plan.y[i] = need;
      }
      const sm = smoothArray(plan.y, 2);
      plan.y.set(sm);
    }
  }

  for (const plan of plans.values()) {
    const f3 = toF3(plan.pts, plan.y);
    const P = plan.preset;

    if (P.id === 'monorail') {
      emitMonorail(plan, f3, ctx, monorail, furniture);
      continue;
    }

    // ── ballast prism ───────────────────────────────────────────────────
    const bw = P.beamWidth / 2;
    for (let i = 1; i < f3.length; i++) {
      const a = f3[i - 1], b = f3[i];
      const col = hexToRgb(P.color);
      const dark = rgbMix(col, hexToRgb('#3a352c'), 0.35);
      // trapezoid cross-section: top at +0.35, bottom at 0
      const t0a = V(a, -bw, 0.35), t0b = V(a, bw, 0.35), t1a = V(b, -bw, 0.35), t1b = V(b, bw, 0.35);
      const b0a = V(a, -bw - 0.8, 0), b0b = V(a, bw + 0.8, 0), b1a = V(b, -bw - 0.8, 0), b1b = V(b, bw + 0.8, 0);
      ballast.quad(t0a, t0b, t1b, t1a, col);
      ballast.quad(b0a, t0a, t1a, b1a, dark);
      ballast.quad(t0b, b0b, b1b, t1b, dark);
    }

    // ── sleepers + rails ────────────────────────────────────────────────
    const gauge = P.gauge / 2;
    const sleeperCol = hexToRgb('#4c4237');
    const railCol = hexToRgb(P.railColor);
    let acc = 0;
    for (let i = 1; i < f3.length; i++) {
      const a = f3[i - 1], b = f3[i];
      const segLen = dist(a.x, a.z, b.x, b.z);
      // rails as continuous strips
      for (const side of [-1, 1] as const) {
        const w = 0.09;
        const r0a = V(a, side * gauge - w, 0.35 + 0.16), r0b = V(a, side * gauge + w, 0.35 + 0.16);
        const r1a = V(b, side * gauge - w, 0.35 + 0.16), r1b = V(b, side * gauge + w, 0.35 + 0.16);
        rails.quad(r0a, r0b, r1b, r1a, railCol);
        // rail web sides
        rails.quad(r0a, r1a, V(b, side * gauge - w, 0.35 + 0.02), V(a, side * gauge - w, 0.35 + 0.02), rgbMix(railCol, hexToRgb('#333'), 0.3));
        rails.quad(r0b, V(a, side * gauge + w, 0.35 + 0.02), V(b, side * gauge + w, 0.35 + 0.02), r1b, rgbMix(railCol, hexToRgb('#333'), 0.3));
      }
      // sleepers at spacing
      acc += segLen;
      while (acc >= P.sleeperSpacing) {
        acc -= P.sleeperSpacing;
        const t = 1 - acc / Math.max(0.001, segLen);
        const x = lerp(a.x, b.x, clamp(t, 0, 1));
        const z = lerp(a.z, b.z, clamp(t, 0, 1));
        const y = lerp(a.y, b.y, clamp(t, 0, 1));
        const rot = Math.atan2(a.nx, -a.nz);
        furniture.box(x, y + 0.35 + 0.08, z, 2.6, 0.16, 0.28, rot, sleeperCol);
      }
    }

    // ── level crossings where roads cross at grade ──────────────────────
    if (roadPlans) {
      for (const rp of roadPlans.values()) {
        const road = rp.stroke as RoadStroke;
        void road;
        for (let i = 1; i < rp.pts.length; i++) {
          for (let j = 1; j < plan.pts.length; j++) {
            const hit = segX(
              rp.pts[i - 1].x, rp.pts[i - 1].y, rp.pts[i].x, rp.pts[i].y,
              plan.pts[j - 1].x, plan.pts[j - 1].y, plan.pts[j].x, plan.pts[j].y,
            );
            if (!hit) continue;
            const roadY = lerp(rp.y[i - 1], rp.y[i], hit.t);
            const railY = lerp(plan.y[j - 1], plan.y[j], hit.u);
            if (Math.abs(roadY - railY) > 2.2) continue; // overpass, not a crossing
            if (rp.bridge[i] === 1 || plan.bridge[j] === 1) continue;
            // only once per crossing
            if (crossings.some((c) => dist2(c.x, c.z, hit.x, hit.y) < 10 * 10)) continue;
            const rot = Math.atan2(plan.pts[j].y - plan.pts[j - 1].y, plan.pts[j].x - plan.pts[j - 1].x);
            crossings.push({ x: hit.x, z: hit.y, rot, roadY: Math.max(roadY, railY) });

            // crossing panels: dark apron across the track
            const panelCol = hexToRgb('#26262a');
            furniture.box(hit.x, railY + 0.36, hit.y, 8.5, 0.07, 5.4, rot, panelCol);
            // crossbucks
            for (const side of [-1, 1] as const) {
              const ox = hit.x + Math.cos(rot) * side * 4.6 + Math.sin(rot) * 3.4;
              const oz = hit.y + Math.sin(rot) * side * 4.6 - Math.cos(rot) * 3.4;
              furniture.boxOn(ox, railY + 0.4, oz, 0.18, 2.6, 0.18, 0, hexToRgb('#c8c8c8'));
              furniture.box(ox, railY + 2.7, oz, 1.7, 0.22, 0.12, 0, hexToRgb('#d8d8d8'));
              furniture.box(ox, railY + 2.7, oz, 1.7, 0.22, 0.12, Math.PI / 2, hexToRgb('#d8d8d8'));
            }
          }
        }
      }
    }
  }

  return { ballast, rails, furniture, monorail, plans, crossings };
}

function emitMonorail(plan: RailPlan, f3: F3[], ctx: RoadBuildCtx, mb: MeshBuilder, furniture: MeshBuilder): void {
  const P = plan.preset;
  const bw = P.beamWidth / 2;
  const beamCol = hexToRgb(P.color);
  const sideCol = rgbMix(beamCol, hexToRgb('#8b93a0'), 0.35);
  const dark = rgbMix(beamCol, hexToRgb('#4a505a'), 0.5);

  for (let i = 1; i < f3.length; i++) {
    const a = f3[i - 1], b = f3[i];
    const bh = 1.9;
    // beam box sides + top + bottom
    mb.quad(V(a, -bw, bh), V(a, bw, bh), V(b, bw, bh), V(b, -bw, bh), beamCol);            // top
    mb.quad(V(a, -bw, 0), V(a, -bw, bh), V(b, -bw, bh), V(b, -bw, 0), sideCol);            // left side
    mb.quad(V(a, bw, bh), V(a, bw, 0), V(b, bw, 0), V(b, bw, bh), sideCol);                // right side
    mb.quad(V(a, -bw, 0), V(b, -bw, 0), V(b, bw, 0), V(a, bw, 0), dark);                   // bottom
    // guide stripe on top
    mb.quad(V(a, -0.35, bh + 0.012), V(a, 0.35, bh + 0.012), V(b, 0.35, bh + 0.012), V(b, -0.35, bh + 0.012), dark);
  }

  // pylons
  let acc = 0;
  for (let i = 1; i < f3.length; i++) {
    const a = f3[i - 1], b = f3[i];
    acc += dist(a.x, a.z, b.x, b.z);
    if (acc >= P.pylonSpacing || i === 1) {
      acc = 0;
      const g = ctx.terrain.sample(b.x, b.z);
      const h = b.y - g;
      if (h > 2) {
        furniture.boxOn(b.x, g, b.z, 1.9, h, 1.25, Math.atan2(b.nx, -b.nz), hexToRgb('#aab0b8'));
        furniture.box(b.x, b.y - 0.35, b.z, 3.2, 0.7, 1.5, Math.atan2(b.nx, -b.nz), hexToRgb('#c7ccd4'));
      }
    }
  }

  // stations every ~420 m
  let sAcc = 0;
  for (let i = 1; i < f3.length; i++) {
    const a = f3[i - 1], b = f3[i];
    const segLen = dist(a.x, a.z, b.x, b.z);
    const prevAcc = sAcc;
    sAcc += segLen;
    const period = 420;
    if (Math.floor(prevAcc / period) !== Math.floor(sAcc / period) && sAcc > 80) {
      // platform box beside the beam
      const side = 3.4;
      const px = b.x + b.nx * side, pz = b.z + b.nz * side;
      furniture.box(px, b.y - 0.15, pz, 3.6, 0.35, 14, Math.atan2(b.nx, -b.nz), hexToRgb('#d8dde3'));
      furniture.box(px + b.nx * 1.2, b.y + 1.4, pz + b.nz * 1.2, 0.35, 3.1, 13, Math.atan2(b.nx, -b.nz), hexToRgb('#9aa3ad'));
      furniture.box(px - b.nx * 1.4, b.y + 2.6, pz - b.nz * 1.4, 3.8, 0.25, 13.5, Math.atan2(b.nx, -b.nz), hexToRgb('#b8c0c8'));
    }
  }
}

function segX(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, dx: number, dy: number): { x: number; y: number; t: number; u: number } | null {
  const r0x = bx - ax, r0y = by - ay;
  const r1x = dx - cx, r1y = dy - cy;
  const den = r0x * r1y - r0y * r1x;
  if (Math.abs(den) < 1e-9) return null;
  const t = ((cx - ax) * r1y - (cy - ay) * r1x) / den;
  const u = ((cx - ax) * r0y - (cy - ay) * r0x) / den;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return { x: ax + r0x * t, y: ay + r0y * t, t, u };
}

/** Carve flat corridors for rail beds after planning. */
export function carveRailCorridors(plans: Map<string, RailPlan>, terrain: HeightField): void {
  for (const plan of plans.values()) {
    const half = plan.preset.beamWidth / 2 + 1.6;
    terrain.carveCorridor(plan.pts, half, 6, (t) => {
      const i = clamp(Math.round(t * (plan.y.length - 1)), 0, plan.y.length - 1);
      if (plan.bridge[i] === 1) return null;
      return plan.y[i] - (plan.preset.id === 'monorail' ? 0 : 0.1);
    });
  }
}

export type { RiverInfo };

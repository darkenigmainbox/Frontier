// ─── City objects: blocky buildings + low-poly trees ─────────────────────────

import { dist2, hash2, type Pt } from '../core/math.ts';
import type { Building, Lake, Stroke, Tree, TreeType } from '../core/types.ts';
import { hexToRgb, rgbMix, MeshBuilder, type RGB } from './mesh.ts';
import { HeightField, nearRiver, pointInLake } from './terrain.ts';
import type { RiverInfo } from './roads.ts';

const TREE_COLORS: Record<TreeType, { leaf: string; leaf2: string; trunk: string }> = {
  pine: { leaf: '#2e5c33', leaf2: '#3d7040', trunk: '#5a4632' },
  oak: { leaf: '#4e7c37', leaf2: '#628f42', trunk: '#6b5138' },
  palm: { leaf: '#5c8f42', leaf2: '#76a84e', trunk: '#8a6f4a' },
  dead: { leaf: '#6e5f4a', leaf2: '#7d6c54', trunk: '#4f4234' },
};

export function buildBuildings(buildings: Building[], terrain: HeightField): MeshBuilder {
  const mb = new MeshBuilder();
  for (const b of buildings) {
    const g = terrain.sample(b.x, b.z);
    const base = hexToRgb(b.color);
    const dark = rgbMix(base, hexToRgb('#000000'), 0.22);
    const light = rgbMix(base, hexToRgb('#ffffff'), 0.18);

    // body
    mb.boxOn(b.x, g - 0.6, b.z, b.w, b.h + 0.6, b.d, b.rot, base);
    // roof band
    const roofY = g + b.h;
    if (b.roof === 'flat') {
      mb.box(b.x, roofY + 0.25, b.z, b.w * 0.98, 0.5, b.d * 0.98, b.rot, dark);
      // rooftop box
      if (b.h > 10) mb.boxOn(b.x, roofY + 0.5, b.z, b.w * 0.3, 1.2, b.d * 0.3, b.rot, light);
    } else if (b.roof === 'gable') {
      // simple prism: ridge along the longer axis
      const alongW = b.w >= b.d;
      const hx = (alongW ? b.w : b.d) / 2 + 0.35;
      const hz = (alongW ? b.d : b.w) / 2 + 0.35;
      const rh = Math.min(b.w, b.d) * 0.22;
      const cos = Math.cos(b.rot), sin = Math.sin(b.rot);
      const P = (x: number, y: number, z: number) => ({
        x: b.x + x * cos + z * sin,
        y: roofY + y,
        z: b.z - x * sin + z * cos,
      });
      const ridgeA = P(alongW ? hx : 0, rh, alongW ? 0 : hx);
      const ridgeB = P(alongW ? -hx : 0, rh, alongW ? 0 : -hx);
      const e1 = P(hx, 0, hz), e2 = P(-hx, 0, hz), e3 = P(-hx, 0, -hz), e4 = P(hx, 0, -hz);
      mb.tri(e1, e4, ridgeA, dark);
      mb.tri(e3, e2, ridgeB, dark);
      mb.quad(e1, ridgeA, ridgeB, e2, light);
      mb.quad(e4, e3, ridgeB, ridgeA, dark);
    } else {
      // hip-ish stepped top
      mb.box(b.x, roofY + 0.7, b.z, b.w * 0.72, 1.4, b.d * 0.72, b.rot, dark);
      mb.box(b.x, roofY + 1.9, b.z, b.w * 0.45, 1.1, b.d * 0.45, b.rot, light);
    }
  }
  return mb;
}

export function buildTrees(trees: Tree[], terrain: HeightField): { trunks: MeshBuilder; leaves: MeshBuilder } {
  const trunks = new MeshBuilder();
  const leaves = new MeshBuilder();
  for (const t of trees) {
    const g = terrain.sample(t.x, t.z);
    const c = TREE_COLORS[t.type] ?? TREE_COLORS.oak;
    const trunk = hexToRgb(c.trunk);
    const leaf = hexToRgb(c.leaf);
    const leaf2 = hexToRgb(c.leaf2);
    const s = t.s;

    if (t.type === 'pine') {
      trunks.boxOn(t.x, g - 0.3, t.z, 0.5 * s, 3.2 * s, 0.5 * s, t.rot, trunk);
      // stacked cones (5-sided boxes tapering via octahedra-ish pyramids)
      for (let i = 0; i < 3; i++) {
        const y = g + (2.2 + i * 1.7) * s;
        const r = (2.6 - i * 0.72) * s;
        pyramid(leaves, t.x, y, t.z, r, 2.6 * s, i % 2 === 0 ? leaf : leaf2, t.rot + i * 0.5);
      }
    } else if (t.type === 'oak') {
      trunks.boxOn(t.x, g - 0.3, t.z, 0.62 * s, 2.6 * s, 0.62 * s, t.rot, trunk);
      blob(leaves, t.x, g + 3.6 * s, t.z, 2.5 * s, 2.2 * s, leaf, t.rot);
      blob(leaves, t.x + 1.1 * s, g + 3.0 * s, t.z + 0.7 * s, 1.5 * s, 1.5 * s, leaf2, t.rot + 1);
      blob(leaves, t.x - 1.0 * s, g + 3.1 * s, t.z - 0.8 * s, 1.4 * s, 1.4 * s, leaf2, t.rot + 2);
    } else if (t.type === 'palm') {
      trunks.boxOn(t.x, g - 0.3, t.z, 0.42 * s, 5.2 * s, 0.42 * s, t.rot, trunk);
      for (let i = 0; i < 5; i++) {
        const a = t.rot + (i / 5) * Math.PI * 2;
        const tipX = t.x + Math.cos(a) * 2.6 * s;
        const tipZ = t.z + Math.sin(a) * 2.6 * s;
        leaves.quad(
          { x: t.x, y: g + 5.2 * s, z: t.z },
          { x: t.x + Math.cos(a + 0.35) * 1.1 * s, y: g + 5.6 * s, z: t.z + Math.sin(a + 0.35) * 1.1 * s },
          { x: tipX, y: g + 4.4 * s, z: tipZ },
          { x: t.x + Math.cos(a - 0.35) * 1.1 * s, y: g + 5.6 * s, z: t.z + Math.sin(a - 0.35) * 1.1 * s },
          i % 2 === 0 ? leaf : leaf2,
        );
      }
    } else {
      // dead tree: bare trunk + a couple of branches
      trunks.boxOn(t.x, g - 0.3, t.z, 0.5 * s, 3.4 * s, 0.5 * s, t.rot, trunk);
      trunks.box(t.x + 0.6 * s, g + 3.2 * s, t.z, 1.6 * s, 0.28 * s, 0.28 * s, t.rot + 0.6, trunk);
      trunks.box(t.x - 0.5 * s, g + 3.9 * s, t.z + 0.3 * s, 1.3 * s, 0.24 * s, 0.24 * s, t.rot - 0.8, trunk);
    }
  }
  return { trunks, leaves };
}

function pyramid(mb: MeshBuilder, x: number, y: number, z: number, r: number, h: number, col: RGB, rot: number): void {
  const base: { x: number; z: number }[] = [];
  for (let i = 0; i < 5; i++) {
    const a = rot + (i / 5) * Math.PI * 2;
    base.push({ x: x + Math.cos(a) * r, z: z + Math.sin(a) * r });
  }
  const apex = { x, y: y + h, z };
  for (let i = 0; i < 5; i++) {
    const j = (i + 1) % 5;
    mb.tri({ x: base[i].x, y, z: base[i].z }, { x: base[j].x, y, z: base[j].z }, apex, col);
    mb.tri({ x: base[j].x, y, z: base[j].z }, { x: base[i].x, y, z: base[i].z }, { x, y: y - 0.15, z }, col);
  }
}

function blob(mb: MeshBuilder, x: number, y: number, z: number, r: number, h: number, col: RGB, rot: number): void {
  // squashed icosahedron-ish blob: two pyramids
  pyramid(mb, x, y - h * 0.15, z, r, h * 0.9, col, rot);
  // inverted underside
  const base: { x: number; z: number }[] = [];
  for (let i = 0; i < 5; i++) {
    const a = rot + (i / 5) * Math.PI * 2;
    base.push({ x: x + Math.cos(a) * r, z: z + Math.sin(a) * r });
  }
  const nadir = { x, y: y - h * 0.55, z };
  for (let i = 0; i < 5; i++) {
    const j = (i + 1) % 5;
    mb.tri({ x: base[j].x, y: y - h * 0.15, z: base[j].z }, { x: base[i].x, y: y - h * 0.15, z: base[i].z }, nadir, col);
  }
}

// ─── Procedural placement helpers (used by the demo project) ────────────────

export interface ScatterCtx {
  terrain: HeightField;
  lakes: Lake[];
  rivers: RiverInfo[];
  strokes: Stroke[];
  waterLevel: number;
}

export function scatterTrees(
  ctx: ScatterCtx,
  count: number,
  bounds: { x0: number; z0: number; x1: number; z1: number },
  typeFor: (x: number, z: number, g: number, slope: number) => TreeType | null,
  seed = 1,
  minRoadDist = 14,
): Tree[] {
  const out: Tree[] = [];
  let attempts = 0;
  while (out.length < count && attempts < count * 30) {
    attempts++;
    const hx = hash2(attempts, seed * 13, seed);
    const hz = hash2(seed * 7, attempts * 3, seed + 5);
    const x = bounds.x0 + hx * (bounds.x1 - bounds.x0);
    const z = bounds.z0 + hz * (bounds.z1 - bounds.z0);
    const g = ctx.terrain.sample(x, z);
    if (g < ctx.waterLevel + 1.0) continue;
    const slope = ctx.terrain.slope(x, z);
    if (slope > 0.85) continue;
    let blocked = false;
    for (const l of ctx.lakes) if (pointInLake(x, z, l, 6)) { blocked = true; break; }
    if (blocked) continue;
    for (const r of ctx.rivers) if (nearRiver(x, z, r.pts, r.width, 6)) { blocked = true; break; }
    if (blocked) continue;
    const mr2 = minRoadDist * minRoadDist;
    for (const st of ctx.strokes) {
      const pts = st.points;
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i];
        const abx = b.x - a.x, aby = b.z - a.z;
        const l2 = abx * abx + aby * aby;
        let t = l2 > 1e-9 ? ((x - a.x) * abx + (z - a.z) * aby) / l2 : 0;
        t = Math.max(0, Math.min(1, t));
        const cx = a.x + abx * t, cy = a.z + aby * t;
        if (dist2(x, z, cx, cy) < mr2) { blocked = true; break; }
      }
      if (blocked) break;
    }
    if (blocked) continue;
    const type = typeFor(x, z, g, slope);
    if (!type) continue;
    out.push({
      id: `tree_${out.length}`,
      x, z,
      s: 0.75 + hash2(Math.round(x), Math.round(z), seed) * 0.7,
      rot: hash2(Math.round(x * 3), Math.round(z * 3), seed) * Math.PI * 2,
      type,
    });
  }
  return out;
}

export function buildingColorFor(kind: Building['type'], h: number, r: number): string {
  switch (kind) {
    case 'tower': return r > 0.5 ? '#8d98a8' : '#7c8794';
    case 'house': return r > 0.5 ? '#c8b8a0' : '#b8a894';
    case 'barn': return r > 0.5 ? '#9c5f48' : '#8a5540';
    case 'shop': return r > 0.5 ? '#a89078' : '#96806c';
    default:
      if (h > 32) return r > 0.5 ? '#8a94a2' : '#7e8894';
      return r > 0.5 ? '#a2907c' : '#948270';
  }
}

export function hash01(x: number, y: number, seed: number): number {
  return hash2(x, y, seed);
}

export type { Pt };

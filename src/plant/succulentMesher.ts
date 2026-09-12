/**
 * Xeric detailing layered onto Frontier's welded stem mesh.
 *
 * Cactus bodies remain true quad surfaces produced by the same junction-aware
 * tree mesher as the woody species.  A rib is a controlled radial deformation
 * of that surface (not a second object pasted on top), so silhouette, normals,
 * wind attributes and export topology remain coherent.  Agave, aloe and
 * prickly pear organs use the existing five-vertex leaf-card contract: their
 * cards are deliberately grown from one crown point, with curved centre lines,
 * a tapered profile and per-organ wind data rather than billboard sprites.
 */

import { Random } from '../core/random';
import { QuadMesh, LeafMesh } from '../tree/mesh';
import type { TreeParams } from '../tree/params';
import type { SucculentParams } from './succulentParams';

export type SucculentMaterial = 'cactus' | 'waxy';

export function decorateSucculentMesh(mesh: QuadMesh, params: SucculentParams): void {
  if (params.form !== 'barrel' && params.form !== 'saguaro') return;
  const ribs = Math.max(4, Math.round(params.ribCount));
  const depth = Math.max(0, Math.min(0.12, params.ribDepth));
  const softness = Math.max(0.04, Math.min(0.9, params.ribSoftness));
  if (depth <= 0) return;

  // The barrel is aligned to world Y, as is the body of the saguaro.  Roots
  // and buried geometry are left untouched.  A broad smoothstep envelope keeps
  // the shoulder and crown round instead of ending the ribs abruptly.
  let maxY = 0;
  for (let i = 0; i < mesh.positions.length; i += 3) maxY = Math.max(maxY, mesh.positions[i + 1]);
  const h = Math.max(0.01, maxY);
  for (let i = 0; i < mesh.positions.length; i += 3) {
    const x = mesh.positions[i];
    const y = mesh.positions[i + 1];
    const z = mesh.positions[i + 2];
    if (y < -0.02) continue;
    const r = Math.hypot(x, z);
    if (r < 0.006) continue;
    const lower = smoothstep(0, Math.min(0.22, h * 0.16), y);
    const upper = smoothstep(0, Math.min(0.28, h * 0.2), h - y);
    const envelope = lower * upper;
    const a = Math.atan2(z, x);
    const wave = Math.cos(a * ribs);
    // Raising the ridge and easing the valley gives a manufactured-but-organic
    // rib: the softness controls how much the negative half is lifted.
    const relief = depth * (wave >= 0 ? wave : wave * softness) * envelope;
    const scale = 1 + relief;
    mesh.positions[i] = x * scale;
    mesh.positions[i + 2] = z * scale;
  }
}

/** Build fleshy rosette leaves or cladodes.  The returned mesh is leaf-card data by design. */
export function buildSucculentOrgans(params: TreeParams, s: SucculentParams): LeafMesh {
  const out = new LeafMesh();
  const count = Math.max(0, Math.round(s.rosetteCount));
  const rng = new Random((params.seed * 104729 + 811) >>> 0);
  if ((s.form === 'saguaro' || s.form === 'barrel') && s.spineCount > 0) {
    for (let i = 0; i < Math.round(s.spineCount); i++) addSpine(out, params, s, rng, i);
  }
  if (s.form === 'prickly-pear') {
    for (let i = 0; i < count; i++) addPad(out, s, rng, i, count);
  } else {
    for (let i = 0; i < count; i++) addRosetteLeaf(out, s, rng, i, count);
  }
  return out;
}

export function mergeLeafMeshes(target: LeafMesh, extra: LeafMesh): void {
  if (extra.positions.length === 0) return;
  const base = target.positions.length / 3;
  target.positions.push(...extra.positions);
  target.normals.push(...extra.normals);
  target.uvs.push(...extra.uvs);
  target.wind.push(...extra.wind);
  target.pivots.push(...extra.pivots);
  for (const i of extra.indices) target.indices.push(i + base);
}

function addSpine(out: LeafMesh, params: TreeParams, s: SucculentParams, rng: Random, i: number): void {
  const a = i * 2.399963229728653 + rng.range(-0.08, 0.08);
  const y = s.form === 'barrel'
    ? rng.range(0.08, Math.max(0.1, params.botany.scale * 0.9))
    : rng.range(0.3, Math.max(0.35, params.botany.scale * 0.88));
  const bodyRadius = Math.max(0.04, params.botany.scale * params.botany.ratio * (1 + params.botany.flare * 0.35));
  const n = { x: Math.cos(a), z: Math.sin(a) };
  const t = { x: -n.z, z: n.x };
  const len = s.spineLength * rng.range(0.72, 1.24);
  const width = Math.min(0.009, len * 0.14);
  const base = { x: n.x * bodyRadius, y, z: n.z * bodyRadius };
  const tip = { x: n.x * (bodyRadius + len), y: y + rng.range(-0.012, 0.022), z: n.z * (bodyRadius + len) };
  const mid = {
    x: (base.x + tip.x) * 0.55,
    y: (base.y + tip.y) * 0.55,
    z: (base.z + tip.z) * 0.55,
  };
  addCard(out, [base, offset(mid, t, -width), tip, offset(mid, t, width), offset(base, t, width * 0.3)], base, t, 0.15, 0.12, 0.95);
}

function addRosetteLeaf(out: LeafMesh, s: SucculentParams, rng: Random, i: number, count: number): void {
  const a = (i / count) * Math.PI * 2 + rng.range(-0.055, 0.055);
  const radial = { x: Math.cos(a), z: Math.sin(a) };
  const tangent = { x: -radial.z, z: radial.x };
  const variation = 1 + rng.range(-s.rosetteVariation, s.rosetteVariation);
  const length = Math.max(0.06, s.rosetteLength * variation);
  const width = Math.max(0.012, s.rosetteWidth * variation);
  const lean = (s.rosetteLean * Math.PI) / 180 * rng.range(0.82, 1.18);
  const droop = (s.rosetteDroop * Math.PI) / 180 * rng.range(0.8, 1.2);
  const twist = rng.range(-0.1, 0.1);
  const baseY = s.form === 'aloe' ? 0.035 : 0.055;
  const centre = (t: number): { x: number; y: number; z: number } => {
    const outward = Math.sin(lean) * length * (0.22 * t + 0.78 * t * t);
    const lift = Math.cos(lean) * length * (0.92 * t - 0.2 * t * t);
    const sag = droop * length * Math.max(0, t - 0.58) ** 2 * 1.8;
    const wobble = Math.sin(t * 5.2 + twist) * length * 0.014;
    return {
      x: radial.x * outward + tangent.x * wobble,
      y: baseY + lift - sag,
      z: radial.z * outward + tangent.z * wobble,
    };
  };
  const p0 = centre(0);
  const p1 = centre(0.28);
  const p2 = centre(0.63);
  const p3 = centre(1);
  const vertices = [
    p0,
    offset(p1, tangent, -width * 0.58),
    offset(p2, tangent, -width * 0.5),
    p3,
    offset(p2, tangent, width * 0.5),
  ];
  addCard(out, vertices, p0, tangent, 1, 0.32, 0.82);
}

function addPad(out: LeafMesh, s: SucculentParams, rng: Random, i: number, count: number): void {
  const a = (i / count) * Math.PI * 2 + rng.range(-0.16, 0.16);
  const n = { x: Math.cos(a), z: Math.sin(a) };
  const t = { x: -n.z, z: n.x };
  const level = Math.floor(i / Math.max(1, Math.ceil(count / 3)));
  const scale = (1 + rng.range(-s.rosetteVariation, s.rosetteVariation)) * (1 - level * 0.1);
  const h = Math.max(0.16, s.rosetteLength * scale);
  const w = Math.max(0.1, s.rosetteWidth * scale);
  const centre = {
    x: n.x * (0.12 + level * 0.08),
    y: 0.22 + level * h * 0.52,
    z: n.z * (0.12 + level * 0.08),
  };
  const bottom = { x: centre.x - n.x * w * 0.12, y: centre.y - h * 0.5, z: centre.z - n.z * w * 0.12 };
  const left = { x: centre.x + t.x * w * 0.52, y: centre.y - h * 0.08, z: centre.z + t.z * w * 0.52 };
  const tip = { x: centre.x + n.x * s.padBulge, y: centre.y + h * 0.5, z: centre.z + n.z * s.padBulge };
  const right = { x: centre.x - t.x * w * 0.52, y: centre.y - h * 0.08, z: centre.z - t.z * w * 0.52 };
  addCard(out, [centre, bottom, left, tip, right], centre, n, 1, 0.25, 0.7);
}

function addCard(
  out: LeafMesh,
  vertices: { x: number; y: number; z: number }[],
  pivot: { x: number; y: number; z: number },
  side: { x: number; z?: number },
  detail: number,
  baseWind: number,
  topWind: number,
): void {
  const tangent = { x: vertices[3].x - vertices[0].x, y: vertices[3].y - vertices[0].y, z: vertices[3].z - vertices[0].z };
  const sx = side.x;
  const sz = side.z ?? 0;
  // All cards are double-sided in the viewer. Keep a stable outward normal for
  // shadows and export, using the long axis crossed with the card width axis.
  let nx = tangent.y * sz - tangent.z * 0;
  let ny = tangent.z * sx - tangent.x * sz;
  let nz = tangent.x * 0 - tangent.y * sx;
  const nl = Math.hypot(nx, ny, nz) || 1;
  nx /= nl;
  ny /= nl;
  nz /= nl;
  const base = out.positions.length / 3;
  for (let i = 0; i < vertices.length; i++) {
    const p = vertices[i];
    const t = i === 0 ? 0 : i === 3 ? 1 : 0.58;
    out.positions.push(p.x, p.y, p.z);
    out.normals.push(nx, ny, nz);
    out.uvs.push(i === 0 ? 0.5 : i === 3 ? 0.5 : i === 1 ? 0 : 1, t);
    out.wind.push(Math.max(0, Math.min(1, p.y / Math.max(0.1, topWind))), detail, baseWind + t * (1 - baseWind), 0.55);
    out.pivots.push(pivot.x, pivot.y, pivot.z);
  }
  // Three triangles retain the same kite contract as the tree leaf generator.
  out.indices.push(base, base + 1, base + 2, base, base + 2, base + 3, base, base + 3, base + 4);
}

function offset(p: { x: number; y: number; z: number }, side: { x: number; z: number }, amount: number): { x: number; y: number; z: number } {
  return { x: p.x + side.x * amount, y: p.y, z: p.z + side.z * amount };
}

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - a) / Math.max(1e-6, b - a)));
  return t * t * (3 - 2 * t);
}

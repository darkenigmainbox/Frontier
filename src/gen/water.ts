// ─── Water surfaces: lakes (wobbly discs) and rivers (polyline strips) ───────

import { fbm, type Pt } from '../core/math.ts';
import type { Lake } from '../core/types.ts';
import { MeshBuilder, hexToRgb } from './mesh.ts';
import type { RiverInfo } from './roads.ts';

const WATER_COLOR = '#2e6fae';
const WATER_DEEP = '#245a92';

export function buildWater(lakes: Lake[], rivers: RiverInfo[], level: number): MeshBuilder {
  const mb = new MeshBuilder();
  const col = hexToRgb(WATER_COLOR);
  const deep = hexToRgb(WATER_DEEP);

  for (const lake of lakes) {
    const segs = 48;
    const ring: { x: number; z: number; r: number }[] = [];
    for (let i = 0; i < segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      const wob = (fbm(Math.cos(a) * 1.4 + lake.seed, Math.sin(a) * 1.4 - lake.seed, lake.seed * 17, 2) - 0.5) * lake.wobble;
      const r = lake.radius * (1 + wob);
      ring.push({ x: lake.x + Math.cos(a) * r, z: lake.z + Math.sin(a) * r, r });
    }
    // centre + ring fan with slight colour depth gradient
    for (let i = 0; i < segs; i++) {
      const j = (i + 1) % segs;
      mb.tri(
        { x: lake.x, y: level, z: lake.z },
        { x: ring[i].x, y: level, z: ring[i].z },
        { x: ring[j].x, y: level, z: ring[j].z },
        deep, col, col,
      );
    }
  }

  for (const river of rivers) {
    const pts = river.pts;
    if (pts.length < 2) continue;
    const w = river.width / 2;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      const dx = b.x - a.x, dz = b.y - a.y;
      const l = Math.hypot(dx, dz) || 1;
      const nx = -dz / l, nz = dx / l;
      const a0 = { x: a.x + nx * w, y: level, z: a.y + nz * w };
      const a1 = { x: a.x - nx * w, y: level, z: a.y - nz * w };
      const b0 = { x: b.x + nx * w, y: level, z: b.y + nz * w };
      const b1 = { x: b.x - nx * w, y: level, z: b.y - nz * w };
      mb.quad(a0, a1, b1, b0, col);
    }
  }

  return mb;
}

export { WATER_COLOR, WATER_DEEP };

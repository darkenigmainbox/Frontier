// ─── Terrain heightfield: procedural base + editable brush stack ─────────────
// Pure module (no DOM) so it can be smoke-tested in node.

import { clamp, dist2, fbm, hash2, lerp, smoothArray, type Pt } from '../core/math.ts';
import type { Lake, TerrainData, TerrainEdit } from '../core/types.ts';

export class HeightField {
  readonly res: number;
  readonly size: number;
  readonly cell: number;
  /** Heights row-major: index = z * res + x, world x/z in [-size/2, size/2]. */
  heights: Float32Array;
  /** Painted surface id per vertex: 0 grass 1 rock 2 sand 3 dirt. */
  paint: Uint8Array;
  /** Raw base (procedural only) used by the smooth/flatten reference. */
  base: Float32Array;

  constructor(terrain: TerrainData) {
    this.res = terrain.res;
    this.size = terrain.size;
    this.cell = terrain.size / (terrain.res - 1);
    const n = this.res * this.res;
    this.heights = new Float32Array(n);
    this.paint = new Uint8Array(n);
    this.base = new Float32Array(n);
    this.generateBase(terrain);
    for (const e of terrain.edits) this.applyEdit(e);
  }

  // ── base generation ────────────────────────────────────────────────────────
  private generateBase(t: TerrainData): void {
    const { res, size, seed, amplitude } = t;
    const half = size / 2;
    for (let j = 0; j < res; j++) {
      const z = -half + j * this.cell;
      for (let i = 0; i < res; i++) {
        const x = -half + i * this.cell;
        // Large rolling relief + medium detail + fine grain
        const nx = x / 620, nz = z / 620;
        let h = 0;
        h += fbm(nx, nz, seed, 4) * amplitude;
        h += fbm(nx * 3.1 + 11, nz * 3.1 - 7, seed + 91, 3) * amplitude * 0.35;
        h += fbm(nx * 9 + 3, nz * 9 + 5, seed + 55, 2) * amplitude * 0.12;
        // Gentle regional tilt so water has somewhere to drain
        h += (z / size) * 8;
        const idx = j * res + i;
        this.base[idx] = h;
        this.heights[idx] = h;
        // Default paint by slope-ish proxy
        this.paint[idx] = 0;
      }
    }
  }

  // ── sampling ───────────────────────────────────────────────────────────────
  worldToGrid(x: number, z: number): { gx: number; gz: number } {
    return {
      gx: clamp((x + this.size / 2) / this.cell, 0, this.res - 1),
      gz: clamp((z + this.size / 2) / this.cell, 0, this.res - 1),
    };
  }

  /** Bilinear height sample at world (x, z). */
  sample(x: number, z: number): number {
    const { gx, gz } = this.worldToGrid(x, z);
    const x0 = Math.floor(gx), z0 = Math.floor(gz);
    const x1 = Math.min(this.res - 1, x0 + 1), z1 = Math.min(this.res - 1, z0 + 1);
    const fx = gx - x0, fz = gz - z0;
    const h00 = this.heights[z0 * this.res + x0], h10 = this.heights[z0 * this.res + x1];
    const h01 = this.heights[z1 * this.res + x0], h11 = this.heights[z1 * this.res + x1];
    return lerp(lerp(h00, h10, fx), lerp(h01, h11, fx), fz);
  }

  sampleBase(x: number, z: number): number {
    const { gx, gz } = this.worldToGrid(x, z);
    const x0 = Math.floor(gx), z0 = Math.floor(gz);
    const x1 = Math.min(this.res - 1, x0 + 1), z1 = Math.min(this.res - 1, z0 + 1);
    const fx = gx - x0, fz = gz - z0;
    const h00 = this.base[z0 * this.res + x0], h10 = this.base[z0 * this.res + x1];
    const h01 = this.base[z1 * this.res + x0], h11 = this.base[z1 * this.res + x1];
    return lerp(lerp(h00, h10, fx), lerp(h01, h11, fx), fz);
  }

  /** Gradient (dh/dx, dh/dz) via central differences. */
  gradient(x: number, z: number): { dx: number; dz: number } {
    const e = this.cell;
    const dx = (this.sample(x + e, z) - this.sample(x - e, z)) / (2 * e);
    const dz = (this.sample(x, z + e) - this.sample(x, z - e)) / (2 * e);
    return { dx, dz };
  }

  slope(x: number, z: number): number {
    const g = this.gradient(x, z);
    return Math.hypot(g.dx, g.dz);
  }

  // ── brush edits ────────────────────────────────────────────────────────────
  applyEdit(e: TerrainEdit): void {
    const { res } = this;
    const half = this.size / 2;
    const r2 = e.r * e.r;
    const g0x = clamp(Math.floor((e.x - e.r + half) / this.cell), 0, res - 1);
    const g1x = clamp(Math.ceil((e.x + e.r + half) / this.cell), 0, res - 1);
    const g0z = clamp(Math.floor((e.z - e.r + half) / this.cell), 0, res - 1);
    const g1z = clamp(Math.ceil((e.z + e.r + half) / this.cell), 0, res - 1);
    for (let j = g0z; j <= g1z; j++) {
      const wz = -half + j * this.cell;
      for (let i = g0x; i <= g1x; i++) {
        const wx = -half + i * this.cell;
        const d2 = dist2(wx, wz, e.x, e.z);
        if (d2 > r2) continue;
        const falloff = 1 - Math.sqrt(d2) / e.r;
        const w = falloff * falloff * (3 - 2 * falloff); // smoothstep falloff
        const idx = j * res + i;
        switch (e.mode) {
          case 'raise':
            this.heights[idx] += e.d * w;
            break;
          case 'lower':
            this.heights[idx] -= e.d * w;
            break;
          case 'flatten':
            this.heights[idx] = lerp(this.heights[idx], e.t ?? 0, w * clamp(e.d, 0, 1));
            break;
          case 'smooth': {
            const b = this.sampleBase(wx, wz);
            this.heights[idx] = lerp(this.heights[idx], this.heights[idx] * 0.5 + b * 0.5, w * clamp(e.d, 0, 1));
            break;
          }
          case 'paint':
            if (w > 0.35) this.paint[idx] = e.p ?? 0;
            break;
        }
      }
    }
  }

  /** Live brush preview used by the editor tool while dragging. */
  applyBrush(x: number, z: number, r: number, mode: TerrainEdit['mode'], amount: number, target?: number, paint = 0): void {
    this.applyEdit({ x, z, r, d: amount, mode, t: target, p: paint });
  }

  // ── corridor operations (roads flatten terrain; terrain raises roads) ──────

  /**
   * Flatten a corridor along a polyline toward a height function.
   * Each grid cell takes its height from the NEAREST point of the polyline
   * (a single application — chained lerps from many segments would drift).
   * `heightAt` may return null to leave terrain untouched (bridge spans).
   */
  carveCorridor(pts: Pt[], halfWidth: number, blend: number, heightAt: (t: number) => number | null): void {
    const { res, cell } = this;
    const half = this.size / 2;
    const reach = halfWidth + blend;
    const pending = new Map<number, { d: number; target: number }>();
    for (let pi = 1; pi < pts.length; pi++) {
      const a = pts[pi - 1], b = pts[pi];
      const minX = Math.min(a.x, b.x) - reach, maxX = Math.max(a.x, b.x) + reach;
      const minZ = Math.min(a.y, b.y) - reach, maxZ = Math.max(a.y, b.y) + reach;
      const g0x = clamp(Math.floor((minX + half) / cell), 0, res - 1);
      const g1x = clamp(Math.ceil((maxX + half) / cell), 0, res - 1);
      const g0z = clamp(Math.floor((minZ + half) / cell), 0, res - 1);
      const g1z = clamp(Math.ceil((maxZ + half) / cell), 0, res - 1);
      const abx = b.x - a.x, aby = b.y - a.y;
      const l2 = abx * abx + aby * aby;
      for (let j = g0z; j <= g1z; j++) {
        const wz = -half + j * cell;
        for (let i = g0x; i <= g1x; i++) {
          const wx = -half + i * cell;
          let t = l2 > 1e-9 ? ((wx - a.x) * abx + (wz - a.y) * aby) / l2 : 0;
          t = clamp(t, 0, 1);
          const cx = a.x + abx * t, cy = a.y + aby * t;
          const d = Math.sqrt(dist2(wx, wz, cx, cy));
          if (d > reach) continue;
          const targetH = heightAt((pi - 1 + t) / (pts.length - 1));
          if (targetH === null) continue;
          const idx = j * res + i;
          const prev = pending.get(idx);
          if (!prev || d < prev.d) pending.set(idx, { d, target: targetH });
        }
      }
    }
    for (const [idx, { d, target }] of pending) {
      let w: number;
      if (d <= halfWidth) w = 1;
      else {
        const u = clamp((d - halfWidth) / blend, 0, 1);
        w = 1 - (u * u * (3 - 2 * u));
      }
      this.heights[idx] = lerp(this.heights[idx], target, w);
      // Roads wear the ground: paint dirt under the corridor
      if (w > 0.4) this.paint[idx] = 3;
    }
  }

  /** Dig a riverbed along a polyline down to `depth` below the water level. */
  carveRiver(pts: Pt[], width: number, waterLevel: number, bedDepth: number): void {
    const { res, cell } = this;
    const half = this.size / 2;
    const reach = width * 1.9;
    const pending = new Map<number, { d: number }>();
    for (let pi = 1; pi < pts.length; pi++) {
      const a = pts[pi - 1], b = pts[pi];
      const g0x = clamp(Math.floor((Math.min(a.x, b.x) - reach + half) / cell), 0, res - 1);
      const g1x = clamp(Math.ceil((Math.max(a.x, b.x) + reach + half) / cell), 0, res - 1);
      const g0z = clamp(Math.floor((Math.min(a.y, b.y) - reach + half) / cell), 0, res - 1);
      const g1z = clamp(Math.ceil((Math.max(a.y, b.y) + reach + half) / cell), 0, res - 1);
      const abx = b.x - a.x, aby = b.y - a.y;
      const l2 = abx * abx + aby * aby;
      for (let j = g0z; j <= g1z; j++) {
        const wz = -half + j * cell;
        for (let i = g0x; i <= g1x; i++) {
          const wx = -half + i * cell;
          let t = l2 > 1e-9 ? ((wx - a.x) * abx + (wz - a.y) * aby) / l2 : 0;
          t = clamp(t, 0, 1);
          const cx = a.x + abx * t, cy = a.y + aby * t;
          const d = Math.sqrt(dist2(wx, wz, cx, cy));
          if (d > reach) continue;
          const idx = j * res + i;
          const prev = pending.get(idx);
          if (!prev || d < prev.d) pending.set(idx, { d });
        }
      }
    }
    for (const [idx, { d }] of pending) {
      const u = clamp(d / reach, 0, 1);
      const w = 1 - u * u * (3 - 2 * u);
      const target = waterLevel - bedDepth * (1 - u * 0.6);
      this.heights[idx] = lerp(this.heights[idx], Math.min(this.heights[idx], target), w);
      if (w > 0.3) this.paint[idx] = 2; // sand banks
    }
  }

  /** Dig a lake basin: everything inside the radius sinks below water level. */
  carveLake(lake: Lake, waterLevel: number, bedDepth: number): void {
    const { res, cell } = this;
    const half = this.size / 2;
    const reach = lake.radius * 1.35;
    const g0x = clamp(Math.floor((lake.x - reach + half) / cell), 0, res - 1);
    const g1x = clamp(Math.ceil((lake.x + reach + half) / cell), 0, res - 1);
    const g0z = clamp(Math.floor((lake.z - reach + half) / cell), 0, res - 1);
    const g1z = clamp(Math.ceil((lake.z + reach + half) / cell), 0, res - 1);
    for (let j = g0z; j <= g1z; j++) {
      const wz = -half + j * cell;
      for (let i = g0x; i <= g1x; i++) {
        const wx = -half + i * cell;
        const d = Math.sqrt(dist2(wx, wz, lake.x, lake.z));
        const wob = (fbm(wx / 90 + lake.seed, wz / 90 - lake.seed, lake.seed * 17, 2) - 0.5) * lake.wobble;
        const rr = lake.radius * (1 + wob);
        if (d > rr * 1.35) continue;
        const u = clamp(d / (rr * 1.35), 0, 1);
        const w = 1 - u * u * (3 - 2 * u);
        const idx = j * res + i;
        const target = waterLevel - bedDepth * (1 - u * 0.5) + (hash2(i, j, lake.seed) - 0.5) * 0.7;
        this.heights[idx] = lerp(this.heights[idx], Math.min(this.heights[idx], target), w);
        if (w > 0.35 && d > rr * 0.75) this.paint[idx] = 2;
      }
    }
  }

  /** Recompute paint defaults from slope/height when not manually painted. */
  autoPaint(waterLevel: number): void {
    const { res, cell } = this;
    const half = this.size / 2;
    for (let j = 0; j < res; j++) {
      for (let i = 0; i < res; i++) {
        const idx = j * res + i;
        // Only auto-set grass/rock where it was left as default grass and untouched by roads
        const wx = -half + i * cell, wz = -half + j * cell;
        const s = this.slope(wx, wz);
        const h = this.heights[idx];
        if (this.paint[idx] === 0) {
          if (s > 0.55) this.paint[idx] = 1;
          else if (h < waterLevel + 1.6) this.paint[idx] = 2;
        }
      }
    }
  }

  /** Average height along a polyline (for deck planning). */
  profileAt(pts: Pt[]): Float64Array {
    const out = new Float64Array(pts.length);
    for (let i = 0; i < pts.length; i++) out[i] = this.sample(pts[i].x, pts[i].y);
    return out;
  }
}

/** Water tests shared with road/bridge planning. */
export function pointInLake(x: number, z: number, lake: Lake, pad = 0): boolean {
  const wob = (fbm(x / 90 + lake.seed, z / 90 - lake.seed, lake.seed * 17, 2) - 0.5) * lake.wobble;
  const rr = lake.radius * (1 + wob) + pad;
  return dist2(x, z, lake.x, lake.z) < rr * rr;
}

export function nearRiver(x: number, z: number, riverPts: Pt[], width: number, pad = 0): boolean {
  const r = width / 2 + pad;
  const r2 = r * r;
  for (let i = 1; i < riverPts.length; i++) {
    const a = riverPts[i - 1], b = riverPts[i];
    const abx = b.x - a.x, aby = b.y - a.y;
    const l2 = abx * abx + aby * aby;
    let t = l2 > 1e-9 ? ((x - a.x) * abx + (z - a.y) * aby) / l2 : 0;
    t = clamp(t, 0, 1);
    const cx = a.x + abx * t, cy = a.y + aby * t;
    if (dist2(x, z, cx, cy) < r2) return true;
  }
  return false;
}

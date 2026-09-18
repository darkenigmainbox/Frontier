/* ============================================================
 * Frontier · SDF terrain — sculpting brushes
 *
 * All of these edit the *signed-distance volume*, not a height map, so
 * they behave like real terrain tools: a cave stays a cave when you
 * raise the ground above it, an undercut stays an undercut when you
 * carve around it, and nothing is ever snapped to a vertical column.
 *
 * Conventions
 * -----------
 *  · A stroke is a list of world-space samples plus the parameters the
 *    user had set at that moment; `apply` is idempotent per sample.
 *  · `falloff` (0..1) is the brush pressure profile: 0 = hard disc,
 *    1 = very soft.
 *  · Every brush reports how much material it moved so the stats and
 *    the mass ledger stay honest.
 *  · Volume = a soft ellipsoid (radius, aspect, depth) which can be
 *    rotated to the surface normal — that is what makes a stroke follow
 *    a cliff face instead of cutting vertically into it.
 * ============================================================ */

import { applyShape, distanceToPath, smin } from '../core/sdf-ops.js';
import { redistance } from '../core/eikonal.js';
import { fbm, Perlin2D, subseed, vfbm3 } from '../gen/noise.js';

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a, b, t) => a + (b - a) * t;

/**
 * Write a voxel, clamped to the field's band. Every brush has to go through
 * this: the raycaster relies on |d| ≤ the true distance everywhere, and a
 * brush that keeps pushing the field past the band silently breaks picking
 * and sphere tracing (see BAND_VOXELS in core/sdf-volume.js).
 */
const put = (vol, i, v) => {
  const b = vol.band;
  vol.data[i] = v > b ? b : v < -b ? -b : v;
};

/* ------------------------------------------------------------------ */
/* brush kernel                                                        */
/* ------------------------------------------------------------------ */

/** Falloff weight at distance d from the brush centre (metres). */
export function falloffWeight(d, radius, amount) {
  const t = clamp01(d / Math.max(radius, 1e-4));
  if (amount <= 0) return 1 - t;
  // smoothstep^-1 style: full strength in the core, soft rim
  return clamp01(1 - smoothPow(t, amount));
}

const smoothPow = (t, k) => {
  if (k <= 1e-3) return t > 0.999 ? 1 : 0;
  const s = Math.pow(t, Math.max(0.35, 1 / Math.max(k, 0.05)));
  return s * s * (3 - 2 * s);
};

/* ------------------------------------------------------------------ */
/* brush definitions                                                   */
/* ------------------------------------------------------------------ */

/**
 * @typedef {object} BrushCtx
 * @property {import('../core/sdf-volume.js').SdfVolume} vol
 * @property {number[]} point    world position of the sample
 * @property {number[]} normal   surface normal at the sample (may be null)
 * @property {object} opts       { radius, strength, falloff, aspect, depth, texture, flip }
 * @property {number} dt         spacing-scaled step (metres of travel since last sample)
 * @property {number} seed
 */

export const BRUSHES = {
  /* ---------------------------- raise / add ------------------------- */
  raise: {
    id: 'raise',
    name: 'Raise',
    hint: 'Adds rock along the surface normal (sculpts up without pinching)',
    apply(ctx) {
      const { vol, point, normal, opts } = ctx;
      const r = opts.radius;
      const amount = opts.strength * r * 0.35 * ctx.dt;
      const n = normal || [0, 1, 0];
      const box = boxOf(point, r * (1 + opts.aspect));
      let moved = 0;
      vol.forEachVoxelInBox(box[0], box[1], 0, (x, y, z, i) => {
        const [wx, wy, wz] = vol.voxelToWorld(x, y, z, TMP);
        const dx = wx - point[0], dy = wy - point[1], dz = wz - point[2];
        const along = dx * n[0] + dy * n[1] + dz * n[2];
        const across = Math.hypot(dx - along * n[0], dy - along * n[1], dz - along * n[2]);
        const d = Math.hypot(across, along / Math.max(opts.depth, 0.15));
        if (d > r * 1.35) return;
        const w = falloffWeight(d, r, opts.falloff) * brushTexture(ctx, wx, wy, wz) * amount;
        if (w === 0) return;
        // moving the surface up by `w` along n is subtracting w from the field
        const before = vol.data[i];
        put(vol, i, before - w);
        moved += Math.max(0, before - vol.data[i]);
      });
      vol.markDirtyBox(box[0], box[1]);
      return { moved: moved * voxelVolume(vol) };
    },
  },

  /* ------------------------------ carve ----------------------------- */
  carve: {
    id: 'carve',
    name: 'Carve',
    hint: 'Cuts rock along the normal — the all-purpose subtract brush',
    apply(ctx) {
      const { vol, point, normal, opts } = ctx;
      const r = opts.radius;
      const amount = opts.strength * r * 0.35 * ctx.dt;
      const n = normal || [0, 1, 0];
      const box = boxOf(point, r * (1 + opts.aspect));
      let moved = 0;
      vol.forEachVoxelInBox(box[0], box[1], 0, (x, y, z, i) => {
        const [wx, wy, wz] = vol.voxelToWorld(x, y, z, TMP);
        const dx = wx - point[0], dy = wy - point[1], dz = wz - point[2];
        const along = dx * n[0] + dy * n[1] + dz * n[2];
        const across = Math.hypot(dx - along * n[0], dy - along * n[1], dz - along * n[2]);
        const d = Math.hypot(across, along / Math.max(opts.depth, 0.15));
        if (d > r * 1.35) return;
        const w = falloffWeight(d, r, opts.falloff) * brushTexture(ctx, wx, wy, wz) * amount;
        if (w === 0) return;
        const before = vol.data[i];
        put(vol, i, before + w);
        moved += Math.max(0, vol.data[i] - before);
      });
      vol.markDirtyBox(box[0], box[1]);
      return { moved: moved * voxelVolume(vol) };
    },
  },

  /* ------------------------------ smooth ---------------------------- */
  smooth: {
    id: 'smooth',
    name: 'Smooth',
    hint: 'Relaxes the field toward its neighbourhood (removes voxel stair-steps)',
    apply(ctx) {
      const { vol, point, opts } = ctx;
      const r = opts.radius;
      const box = boxOf(point, r);
      const src = vol.clone();
      let changed = 0;
      const { nx, ny, nz } = vol;
      const slice = nx * ny;
      vol.forEachVoxelInBox(box[0], box[1], 0, (x, y, z, i) => {
        const [wx, wy, wz] = vol.voxelToWorld(x, y, z, TMP);
        const d = Math.hypot(wx - point[0], wy - point[1], wz - point[2]);
        if (d > r) return;
        const w = falloffWeight(d, r, opts.falloff) * clamp01(opts.strength) * ctx.dt;
        if (w <= 0) return;
        // mirror at the borders instead of reading out of bounds
        const avg = (
          src.data[x > 0 ? i - 1 : i] + src.data[x < nx - 1 ? i + 1 : i] +
          src.data[y > 0 ? i - nx : i] + src.data[y < ny - 1 ? i + nx : i] +
          src.data[z > 0 ? i - slice : i] + src.data[z < nz - 1 ? i + slice : i]
        ) / 6;
        const before = vol.data[i];
        put(vol, i, lerp(before, avg, Math.min(0.85, w)));
        changed += Math.abs(vol.data[i] - before);
      });
      vol.markDirtyBox(box[0], box[1]);
      return { moved: changed * voxelVolume(vol) };
    },
  },

  /* ------------------------------ flatten --------------------------- */
  flatten: {
    id: 'flatten',
    name: 'Flatten',
    hint: 'Pulls the surface to the plane clicked (drag to set the level)',
    apply(ctx) {
      const { vol, point, normal, opts } = ctx;
      const r = opts.radius;
      const planeY = ctx.planeY ?? point[1];
      const box = boxOf(point, r * (1 + opts.aspect));
      let moved = 0;
      vol.forEachVoxelInBox(box[0], box[1], 0, (x, y, z, i) => {
        const [wx, wy, wz] = vol.voxelToWorld(x, y, z, TMP);
        const across = Math.hypot(wx - point[0], wz - point[2]);
        if (across > r) return;
        const w = falloffWeight(across, r, opts.falloff) * clamp01(opts.strength) * 0.5;
        if (w <= 0) return;
        // Plane subtraction blended by the falloff:  d = lerp(d, y - planeY, w)
        const target = wy - planeY;
        const before = vol.data[i];
        put(vol, i, lerp(before, Math.max(before, target), w));
        moved += Math.abs(vol.data[i] - before);
      });
      void normal;
      vol.markDirtyBox(box[0], box[1]);
      return { moved: moved * voxelVolume(vol) };
    },
  },

  /* ------------------------------ pinch ----------------------------- */
  pinch: {
    id: 'pinch',
    name: 'Pinch',
    hint: 'Pulls the surface toward the brush axis — sharp ridges and aretes',
    apply(ctx) {
      const { vol, point, normal, opts } = ctx;
      const r = opts.radius;
      const n = normal || [0, 1, 0];
      const box = boxOf(point, r);
      let moved = 0;
      const src = vol.clone();
      vol.forEachVoxelInBox(box[0], box[1], 0, (x, y, z, i) => {
        const [wx, wy, wz] = vol.voxelToWorld(x, y, z, TMP);
        const d = Math.hypot(wx - point[0], wy - point[1], wz - point[2]);
        if (d > r || d < 1e-5) return;
        const w = falloffWeight(d, r, opts.falloff) * clamp01(opts.strength) * ctx.dt * 0.6;
        // sample the field slightly toward the centre: the surface shrinks
        const k = 1 - w;
        const sx = point[0] + (wx - point[0]) * k;
        const sy = point[1] + (wy - point[1]) * k;
        const sz = point[2] + (wz - point[2]) * k;
        const before = vol.data[i];
        put(vol, i, src.sampleWorld(sx, sy, sz));
        moved += Math.abs(vol.data[i] - before);
      });
      void n;
      vol.markDirtyBox(box[0], box[1]);
      return { moved: moved * voxelVolume(vol) };
    },
  },

  /* ----------------------------- inflate ---------------------------- */
  inflate: {
    id: 'inflate',
    name: 'Inflate',
    hint: 'Pushes the surface out along its own normals (mushroom caps, blobs)',
    apply(ctx) {
      const { vol, point, opts } = ctx;
      const r = opts.radius;
      const amount = opts.strength * r * 0.25 * ctx.dt;
      const box = boxOf(point, r);
      let moved = 0;
      const src = vol.clone();
      vol.forEachVoxelInBox(box[0], box[1], 0, (x, y, z, i) => {
        const [wx, wy, wz] = vol.voxelToWorld(x, y, z, TMP);
        const d = Math.hypot(wx - point[0], wy - point[1], wz - point[2]);
        if (d > r) return;
        const w = falloffWeight(d, r, opts.falloff) * amount;
        if (w === 0) return;
        const nrm = src.normal(wx, wy, wz, TMP_N);
        const before = vol.data[i];
        put(vol, i, before - w * (nrm[1] * 0.35 + 0.65));
        moved += Math.abs(vol.data[i] - before);
      });
      vol.markDirtyBox(box[0], box[1]);
      return { moved: moved * voxelVolume(vol) };
    },
  },

  /* ----------------------------- erode ------------------------------ */
  erode: {
    id: 'erode',
    name: 'Erode',
    hint: 'Weathers the surface: soft rock breaks down, hard rock resists',
    apply(ctx) {
      const { vol, point, opts } = ctx;
      const r = opts.radius;
      const box = boxOf(point, r);
      const src = vol.clone();
      let moved = 0;
      vol.forEachVoxelInBox(box[0], box[1], 0, (x, y, z, i) => {
        const [wx, wy, wz] = vol.voxelToWorld(x, y, z, TMP);
        const d = Math.hypot(wx - point[0], wy - point[1], wz - point[2]);
        if (d > r) return;
        const w = falloffWeight(d, r, opts.falloff) * clamp01(opts.strength) * ctx.dt * 0.4;
        if (w <= 0) return;
        const hrd = hardnessAt(ctx, wx, wy, wz);
        // weather bites the up-facing rock hardest: use the real normal
        const nrm = src.normal(wx, wy, wz, TMP_N);
        const up = clamp01(nrm[1] * 0.5 + 0.5);
        const bite = w * (1 - 0.75 * hrd) * (0.4 + 0.6 * up);
        const before = vol.data[i];
        put(vol, i, before + bite);
        moved += Math.abs(vol.data[i] - before);
      });
      vol.markDirtyBox(box[0], box[1]);
      return { moved: moved * voxelVolume(vol) };
    },
  },

  /* ----------------------------- deposit ---------------------------- */
  deposit: {
    id: 'deposit',
    name: 'Deposit',
    hint: 'Drops sediment (scree, talus, sand) onto low ground',
    apply(ctx) {
      const { vol, point, opts } = ctx;
      const r = opts.radius;
      const box = boxOf(point, r);
      let moved = 0;
      const src = vol.clone();
      vol.forEachVoxelInBox(box[0], box[1], 0, (x, y, z, i) => {
        const [wx, wy, wz] = vol.voxelToWorld(x, y, z, TMP);
        const d = Math.hypot(wx - point[0], wy - point[1], wz - point[2]);
        if (d > r) return;
        const w = falloffWeight(d, r, opts.falloff) * opts.strength * ctx.dt * 0.35;
        const nrm = src.normal(wx, wy, wz, TMP_N);
        // accumulates on upward-facing, low-slope ground only
        const flat = clamp01(1 - Math.max(0, 1 - nrm[1]) * 2.5);
        const before = vol.data[i];
        put(vol, i, before - w * flat);
        moved += Math.abs(vol.data[i] - before);
      });
      vol.markDirtyBox(box[0], box[1]);
      return { moved: moved * voxelVolume(vol) };
    },
  },

  /* ------------------------------ stamp ----------------------------- */
  stamp: {
    id: 'stamp',
    name: 'Stamp',
    hint: 'Stamps a fractal rock / crater / dune primitive, rotated to the surface',
    apply(ctx) {
      const { vol, point, normal, opts, stamp } = ctx;
      const r = opts.radius;
      const n = normal || [0, 1, 0];
      const rotate = opts.align !== false;
      const kinds = STAMP_KINDS;
      const kind = kinds[stamp || 'rock'] || kinds.rock;
      const strength = opts.strength;
      const box = boxOf(point, r * 2.2);
      const shape = (x, y, z) => {
        let dx = x - point[0], dy = y - point[1], dz = z - point[2];
        if (rotate) {
          // rotate into the brush frame: n becomes +Y
          const ax = n[2], az = -n[0];
          const len = Math.hypot(ax, az);
          if (len > 1e-4) {
            const c = n[1], s = len;
            const ux = ax / s, uz = az / s;
            // rotate about the axis (ux,0,uz) by acos(c)
            const [rx, ry, rz] = rotateAxis(dx, dy, dz, ux, 0, uz, c, s);
            dx = rx; dy = ry; dz = rz;
          }
        }
        return kind.sdf(dx, dy, dz, r, ctx);
      };
      const mask = (x, y, z, dist) => {
        const d = Math.hypot(x - point[0], y - point[1], z - point[2]);
        const align = rotate ? 1 : clamp01(0.5 - 0.5 * (vol.normal(x, y, z, TMP_N)[1] - 0.85) * 4);
        return falloffWeight(d, r * 1.15, opts.falloff) * align * strength;
      };
      const touched = applyShape(vol, box, kind.op, shape, { k: r * (kind.blend ?? 0.25), mask, strength: 1 });
      return { moved: touched * 0.001, vertices: touched };
    },
  },

  /* ------------------------------ path ------------------------------ */
  path: {
    id: 'path',
    name: 'Path / road',
    hint: 'Carves a graded ribbon along a spline (roads, trails, river beds)',
    apply(ctx) {
      const { vol, path, opts } = ctx;
      if (!path || path.length < 2) return { moved: 0 };
      const r = opts.radius;
      const box = boundsOfPath(path, r);
      const flatPath = path.map((q) => [q[0], 0, q[2]]);   // built once, not per voxel
      let moved = 0;
      vol.forEachVoxelInBox(box[0], box[1], 0, (x, y, z, i) => {
        const [wx, wy, wz] = vol.voxelToWorld(x, y, z, TMP);
        const d = distanceToPath(wx, 0, wz, flatPath);
        if (d > r) return;
        const w = falloffWeight(d, r, opts.falloff) * clamp01(opts.strength) * 0.5;
        if (w <= 0) return;
        // nearest path point gives the target elevation (graded road)
        let bestY = wy, bestD = Infinity;
        for (const p of path) {
          const dd = Math.hypot(wx - p[0], wz - p[2]);
          if (dd < bestD) { bestD = dd; bestY = p[1]; }
        }
        const before = vol.data[i];
        put(vol, i, lerp(before, Math.max(before, wy - bestY), w));
        moved += Math.abs(vol.data[i] - before);
      });
      vol.markDirtyBox(box[0], box[1]);
      return { moved: moved * voxelVolume(vol) };
    },
  },

  /* ------------------------------ wind ------------------------------ */
  wind: {
    id: 'wind',
    name: 'Wind drift',
    hint: 'Advects loose surface material downwind (dunes, drifts)',
    apply(ctx) {
      const { vol, point, opts } = ctx;
      const r = opts.radius;
      const a = (opts.windDir ?? 0.6);
      const dx = Math.cos(a) * r * opts.strength * 0.25 * ctx.dt;
      const dz = Math.sin(a) * r * opts.strength * 0.25 * ctx.dt;
      const box = boxOf(point, r * 1.5);
      const src = vol.clone();
      let moved = 0;
      vol.forEachVoxelInBox(box[0], box[1], 0, (x, y, z, i) => {
        const [wx, wy, wz] = vol.voxelToWorld(x, y, z, TMP);
        const d = Math.hypot(wx - point[0], wy - point[1], wz - point[2]);
        if (d > r) return;
        const w = falloffWeight(d, r, opts.falloff) * 0.35;
        const nrm = src.normal(wx, wy, wz, TMP_N);
        // only up-facing, loose surface moves
        const loose = clamp01(nrm[1]) * (1 - clamp01(hardnessAt(ctx, wx, wy, wz)));
        const before = vol.data[i];
        const shifted = src.sampleWorld(wx - dx * w * loose, wy, wz - dz * w * loose);
        put(vol, i, lerp(before, shifted, w));
        moved += Math.abs(vol.data[i] - before);
      });
      vol.markDirtyBox(box[0], box[1]);
      return { moved: moved * voxelVolume(vol) };
    },
  },

  /* ------------------------------ noise ----------------------------- */
  noise: {
    id: 'noise',
    name: 'Rock detail',
    hint: 'Displaces the surface with fractal noise (breaks up flat faces)',
    apply(ctx) {
      const { vol, point, opts } = ctx;
      const r = opts.radius;
      const amp = opts.strength * r * 0.28 * ctx.dt;
      const scale = 1 / Math.max(0.2, r * 0.45);
      const box = boxOf(point, r);
      let moved = 0;
      vol.forEachVoxelInBox(box[0], box[1], 0, (x, y, z, i) => {
        const [wx, wy, wz] = vol.voxelToWorld(x, y, z, TMP);
        const d = Math.hypot(wx - point[0], wy - point[1], wz - point[2]);
        if (d > r) return;
        const w = falloffWeight(d, r, opts.falloff);
        if (w <= 0) return;
        const n = fbm(ctx.perlin, wx * scale, wz * scale, { octaves: 4, gain: 0.55 }) * 0.7 +
          (vfbm3(wx * scale * 2.7, wy * scale * 2.7, wz * scale * 2.7, { octaves: 2 }) - 0.5) * 0.6;
        const before = vol.data[i];
        put(vol, i, before + amp * w * n);
        moved += Math.abs(vol.data[i] - before);
      });
      vol.markDirtyBox(box[0], box[1]);
      return { moved: moved * voxelVolume(vol) };
    },
  },

  /* ------------------------------ terrace --------------------------- */
  terrace: {
    id: 'terrace',
    name: 'Terrace',
    hint: 'Snaps the surface toward horizontal benches (stratified rock, fields)',
    apply(ctx) {
      const { vol, point, opts } = ctx;
      const r = opts.radius;
      const step = Math.max(0.15, opts.terraceStep ?? 0.6);
      const phase = opts.terracePhase ?? 0;
      const strength = clamp01(opts.strength) * ctx.dt;
      const { nx, ny, nz, cell, min } = vol;
      const slice = nx * ny;
      // Band around the surface that the displacement is allowed to touch:
      // enough to move the zero crossing, not enough to shear a cave below.
      const band = Math.min(3, Math.max(1.5 * step, 2 * cell[1]));
      const i0 = Math.max(0, Math.floor((point[0] - r - min[0]) / cell[0]));
      const i1 = Math.min(nx - 1, Math.ceil((point[0] + r - min[0]) / cell[0]));
      const j0 = Math.max(0, Math.floor((point[2] - r - min[2]) / cell[2]));
      const j1 = Math.min(nz - 1, Math.ceil((point[2] + r - min[2]) / cell[2]));
      let moved = 0;
      // Terracing is a per-COLUMN operation: find where the surface is in this
      // column, decide which bench it should sit on, and shift the band around
      // it by that amount. (A per-voxel version of this just paints stripes.)
      for (let j = j0; j <= j1; j++) {
        for (let i = i0; i <= i1; i++) {
          const [wx, , wz] = vol.voxelToWorld(i, 0, j, TMP);
          const dRad = Math.hypot(wx - point[0], wz - point[2]);
          if (dRad > r) continue;
          const w = falloffWeight(dRad, r, opts.falloff) * strength;
          if (w <= 1e-4) continue;
          const col = j * nx + i;
          let ySurf = null;
          for (let y = ny - 1; y >= 0; y--) {
            const d = vol.data[col + y * slice];
            if (d <= 0) { ySurf = min[1] + (y + 0.5) * cell[1]; break; }
          }
          if (ySurf === null) continue;
          const target = Math.round((ySurf - phase) / step) * step + phase;
          const delta = (target - ySurf) * w;
          if (Math.abs(delta) < 1e-5) continue;
          for (let y = 0; y < ny; y++) {
            const idx = col + y * slice;
            const d = vol.data[idx];
            const t = Math.abs(d) / band;
            if (t >= 1) continue;                    // outside the influence band
            const fade = 1 - t * t * (3 - 2 * t);    // smooth taper to the band edge
            const before = d;
            put(vol, idx, d - delta * fade);
            moved += Math.abs(vol.data[idx] - before);
          }
        }
      }
      vol.markDirtyBox(boxOf(point, r)[0], boxOf(point, r)[1]);
      return { moved: moved * voxelVolume(vol) };
    },
  },
};

/* ------------------------------------------------------------------ */
/* stamps                                                              */
/* ------------------------------------------------------------------ */

export const STAMP_KINDS = {
  rock: {
    label: 'Rock',
    op: 'union',
    blend: 0.3,
    sdf: (dx, dy, dz, r, ctx) => {
      const q = Math.hypot(dx, dy * 1.35, dz);
      const jag = fbm(ctx.perlin, dx * 1.3, dz * 1.3, { octaves: 3, gain: 0.6 }) * r * 0.35 +
        (vfbm3(dx * 2.2, dy * 2.2, dz * 2.2, { octaves: 3 }) - 0.5) * r * 0.4;
      return q - r + jag;
    },
  },
  boulder: {
    label: 'Boulder',
    op: 'union',
    blend: 0.15,
    sdf: (dx, dy, dz, r, ctx) => {
      const s = Math.hypot(dx, dy * 1.15, dz) - r * 0.75;
      const jag = (vfbm3(dx * 3.1, dy * 3.1, dz * 3.1, { octaves: 3, seed: ctx.seed }) - 0.5) * r * 0.3;
      return s + jag;
    },
  },
  crater: {
    label: 'Crater',
    op: 'subtract',
    blend: 0.25,
    sdf: (dx, dy, dz, r, ctx) => {
      const bowl = Math.hypot(dx, dy * 0.75, dz) - r;
      const rim = Math.hypot(Math.hypot(dx, dz) - r * 0.85, (dy + r * 0.45) * 1.6) - r * 0.32;
      const jag = (vfbm3(dx * 2.6, dy * 2.6, dz * 2.6, { octaves: 2 }) - 0.5) * r * 0.25;
      return smin(bowl, rim, r * 0.2) + jag;
    },
  },
  dune: {
    label: 'Dune',
    op: 'union',
    blend: 0.6,
    sdf: (dx, dy, dz, r, ctx) => {
      const a = Math.cos(dx / Math.max(r, 0.2));
      const s = dy - r * 0.35 * (1 + a) * 0.5;
      return Math.max(s, Math.hypot(dx / (r * 1.8), dz / r) - 1) * 0.6;
    },
  },
  mesa: {
    label: 'Mesa',
    op: 'union',
    blend: 0.2,
    sdf: (dx, dy, dz, r) => {
      const bx = Math.max(Math.abs(dx) - r, 0), bz = Math.max(Math.abs(dz) - r * 1.2, 0);
      const side = Math.hypot(bx, bz) - r * 0.15;
      const top = dy + r * 0.35;
      const jag = (Math.sin(dx * 4.1) + Math.sin(dz * 3.4)) * r * 0.04;
      return Math.max(side, top) + jag;
    },
  },
  arch: {
    label: 'Arch',
    op: 'union',
    blend: 0.35,
    sdf: (dx, dy, dz, r) => {
      const t = Math.hypot(Math.hypot(dx, dz) - r * 0.9, dy) - r * 0.4;
      const legs = Math.abs(dz) - r * 1.5;
      return smin(Math.max(t, -Math.abs(dx) + r * 0.1), Math.max(t, legs), r * 0.3) +
        Math.sin(dy * 5) * r * 0.02;
    },
  },
};

/* ------------------------------------------------------------------ */
/* stroke driver                                                       */
/* ------------------------------------------------------------------ */

/**
 * Applies a stroke (a list of samples) to the volume. This is the entry
 * point the UI calls: it owns the brush state, the spacing, and the
 * re-distancing policy.
 *
 * @param {import('../core/sdf-volume.js').SdfVolume} vol
 * @param {object} o
 * @param {string} o.brush        key of BRUSHES
 * @param {Array<number[]>} o.samples  [{point:[x,y,z], normal:[x,y,z]|null, dt}]
 * @param {object} o.opts         brush options (radius, strength, falloff, ...)
 * @param {object} [o.hardness]   optional hardness source (e.g. hf)
 * @param {string} [o.stamp]
 * @param {number[][]} [o.path]
 * @returns {{moved:number, reSamples:number}}
 */
/**
 * Every option a brush may read, with defaults. Callers (the app, the tests,
 * an engine integration) only pass what they care about — a missing key used
 * to turn a brush's bounding box into NaN and silently edit nothing.
 */
export const DEFAULT_OPTS = {
  radius: 2.0,
  strength: 0.5,
  falloff: 0.4,
  depth: 1.0,        // along-normal squash (1 = sphere)
  aspect: 0.0,       // extra box padding as a fraction of the radius
  texture: 0.0,
  windDir: 0.0,
  terraceStep: 0.6,
  terracePhase: 0.0,
  align: true,
};

export function applyStroke(vol, o) {
  const {
    brush, opts: rawOpts, hardness = null, stamp = 'rock', path = null,
    perlin = new Perlin2D(subseed(o.seed ?? 1, 0x9c1)),
    seed = 1,
  } = o;
  const def = BRUSHES[brush] || BRUSHES.carve;
  const opts = { ...DEFAULT_OPTS, ...(rawOpts || {}) };
  const samples = o.samples;
  if (!samples || !samples.length) return { moved: 0, reSamples: 0 };
  let moved = 0;
  for (const s of samples) {
    const ctx = {
      vol,
      point: s.point,
      normal: s.normal,
      opts,
      dt: Math.max(0.15, s.dt ?? 1),
      hardness,
      perlin,
      seed,
      stamp,
      path,
      planeY: o.planeY,
      hardnessAt,
    };
    const r = def.apply(ctx);
    moved += r.moved || 0;
  }
  return { moved, reSamples: samples.length };
}

/** Re-solve |∇d| = 1 in the band after a stroke (keeps the raycaster honest). */
export function finishStroke(vol, dirtyBox = null, { band = 6, sweeps = 2 } = {}) {
  const box = dirtyBox
    ? [
      Math.max(0, Math.floor((dirtyBox[0][0] - vol.min[0]) / vol.cell[0])),
      Math.max(0, Math.floor((dirtyBox[0][1] - vol.min[1]) / vol.cell[1])),
      Math.max(0, Math.floor((dirtyBox[0][2] - vol.min[2]) / vol.cell[2])),
      Math.min(vol.nx - 1, Math.ceil((dirtyBox[1][0] - vol.min[0]) / vol.cell[0])),
      Math.min(vol.ny - 1, Math.ceil((dirtyBox[1][1] - vol.min[1]) / vol.cell[1])),
      Math.min(vol.nz - 1, Math.ceil((dirtyBox[1][2] - vol.min[2]) / vol.cell[2])),
    ]
    : null;
  const res = redistance(vol, { bandVoxels: band, sweeps, box });
  vol.refreshChunkStats();
  return res;
}

/* ------------------------------ helpers ---------------------------- */

const TMP = [0, 0, 0];
const TMP_N = [0, 1, 0];
const voxelVolume = (vol) => vol.cell[0] * vol.cell[1] * vol.cell[2];

function boxOf(p, r) {
  return [
    [p[0] - r, p[1] - r, p[2] - r],
    [p[0] + r, p[1] + r, p[2] + r],
  ];
}

function boundsOfPath(path, r) {
  let mnx = Infinity, mny = Infinity, mnz = Infinity;
  let mxx = -Infinity, mxy = -Infinity, mxz = -Infinity;
  for (const p of path) {
    mnx = Math.min(mnx, p[0] - r); mny = Math.min(mny, p[1] - r); mnz = Math.min(mnz, p[2] - r);
    mxx = Math.max(mxx, p[0] + r); mxy = Math.max(mxy, p[1] + r); mxz = Math.max(mxz, p[2] + r);
  }
  return [[mnx, mny, mnz], [mxx, mxy, mxz]];
}

function rotateAxis(x, y, z, ux, uy, uz, cosA, sinA) {
  const dot = x * ux + y * uy + z * uz;
  const cx = uy * z - uz * y, cy = uz * x - ux * z, cz = ux * y - uy * x;
  return [
    x * cosA + cx * sinA + ux * dot * (1 - cosA),
    y * cosA + cy * sinA + uy * dot * (1 - cosA),
    z * cosA + cz * sinA + uz * dot * (1 - cosA),
  ];
}

/** Per-voxel texture mask (checker / noise / strata brush styles). */
function brushTexture(ctx, x, y, z) {
  const t = ctx.opts.texture ?? 0;
  if (!t) return 1;
  if (t === 1) return 0.55 + 0.45 * (vfbm3(x * 1.4, y * 1.4, z * 1.4, { octaves: 3, seed: ctx.seed }));
  if (t === 2) {
    const s = Math.sin(y * 3.1) * 0.5 + 0.5;
    return 0.45 + 0.55 * s;
  }
  if (t === 3) return 0.6 + 0.4 * (Math.abs(Math.sin(y * 8.2 + Math.cos(x * 2.1))) > 0.5 ? 1 : 0);
  return 1;
}

/** Hardness lookup aware of the geological maps carried by the field. */
function hardnessAt(ctx, x, y, z) {
  const hf = ctx.hardness;
  if (!hf) return 0.4;
  return hf.hardnessAt(x, y, z);
}


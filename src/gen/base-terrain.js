/* ============================================================
 * Frontier · SDF terrain — base landforms + SDF rasterisation
 *
 * Builds the *initial* signed-distance volume: a height field of
 * fractal landforms (multifractal fBm blended with ridged noise,
 * domain warp, radial peak gradient, guided canyon, strata) which is
 * then rasterised into the voxel grid as the intersection of a
 * half-space with the volume box:
 *
 *     d = max(y - h(x,z), sdBox(volume))
 *
 * and repaired with the Eikonal solver so it is a real SDF band.
 *
 * The same height field is what the erosion stages operate on, and
 * the rasteriser below is reused after every erosion pass to push the
 * eroded surface back into the volume — one shared code path, so the
 * visual mesh and the erosion grid can never disagree.
 * ============================================================ */

import { HeightField } from './heightfield.js';
import { Perlin2D, fbm, ridged, value2, subseed, hash2, mulberry32, vfbm2 } from './noise.js';
import { planeWriteFixup } from '../core/eikonal.js';
import { BOUNDS, seedOf } from './params.js';

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
/** smooth max of two heights (metres) — blends landforms without seams */
const smaxY = (a, b, k) => {
  const hh = Math.min(Math.max(0.5 + 0.5 * (a - b) / k, 0), 1);
  return b + (a - b) * hh + k * hh * (1 - hh);
};
const sstep = (a, b, x) => {
  const t = clamp01((x - a) / (b - a || 1e-9));
  return t * t * (3 - 2 * t);
};
const lerp = (a, b, t) => a + (b - a) * t;

/**
 * Height field of the untouched landform. Pure function of the params.
 * @returns {HeightField}
 */
export function buildBaseHeightfield(p, { nx, nz, minX, minZ, cellX, cellZ } = {}) {
  const seed = seedOf(p);
  const hf = new HeightField(nx, nz, { minX, minZ, cellX, cellZ });
  const pk = new Perlin2D(subseed(seed, 11));
  const pr = new Perlin2D(subseed(seed, 29));
  const pw = new Perlin2D(subseed(seed, 47));
  const ph = new Perlin2D(subseed(seed, 61));
  const pm = new Perlin2D(subseed(seed, 83));

  const sea = p.seaLevel ?? 0;
  const relief = p.relief ?? 13;
  const R = Math.max(2, p.radius ?? 15);
  const cx0 = p.peakX ?? 0, cz0 = p.peakZ ?? 0;
  const plateau = clamp01(p.summitPlateau ?? 0.25);
  const sharp = clamp01(p.peakSharp ?? 0.55);
  const tiltAz = (p.tiltAzimuth ?? -0.6);
  const tilt = p.tilt ?? 0;
  const shape = p.shape ?? 'island';
  const canyonOn = (p.canyon ?? 0) > 0.01;

  // meandering canyon centreline (b1's guided river, as a landform this time)
  const meander = p.canyonMeander ?? 0.45;
  const canyonX = (z) =>
    cx0 + meander * (2.5 * Math.sin(0.15 * z) + Math.sin(0.36 * z + 1.0)) + (p.canyonOffset ?? 0);

  for (let j = 0; j < nz; j++) {
    const z = hf.zOf(j);
    for (let i = 0; i < nx; i++) {
      const x = hf.xOf(i);
      const k = hf.idx(i, j);

      // ---- domain warp (organic ridges instead of grid-aligned blobs) ----
      const wx = x + p.warp * 8 * pw.noise(x * p.warpScale + 31.4, z * p.warpScale - 17.8);
      const wz = z + p.warp * 8 * pw.noise(x * p.warpScale - 51.2, z * p.warpScale + 44.9);

      // Two noise bands, used the way a DEM is built rather than the way a
      // texture is: a LOW-frequency band that displaces whole ridges and
      // valleys, and a HIGH-frequency band that only roughens the surface.
      // Adding both at full amplitude is what makes procedurally generated
      // terrain read as "static" instead of as land.
      const f = p.freq;
      const fbmV = fbm(pk, wx * f * 0.62, wz * f * 0.62, { octaves: p.octaves, gain: p.gain, lacunarity: p.lacunarity });
      const ridV = ridged(pr, wx * f * 0.8 + 11.3, wz * f * 0.8 - 7.1,
        { octaves: Math.max(3, p.octaves - 1), gain: p.gain, lacunarity: p.lacunarity, sharp: 2.4 });
      const macroNoise = lerp(fbmV, ridV * 2 - 1, clamp01(p.ridged ?? 0.5));
      const microNoise = fbm(pk, wx * f * 3.4 + 91.7, wz * f * 3.4 - 63.2,
        { octaves: 4, gain: 0.55, lacunarity: 2.2 });

      // ---- macro landform ----
      const ddx = x - cx0, ddz = z - cz0;
      const dist = Math.hypot(ddx, ddz);
      let macro = 0;
      let edge = 0;
      // A massif is never radially symmetric. Two structural terms break the
      // "volcano" look: the effective radius is modulated by low-frequency
      // angular noise (elongated ridge lines) and a handful of seeded
      // sub-peaks are blended in with a smooth max (real summits, real
      // drainage divides between them).
      const theta = Math.atan2(ddz, ddx);
      const rEff = R * (1 + 0.30 * fbm(pk, Math.cos(theta) * 2.1 + 40.5, Math.sin(theta) * 2.1 - 12.2, { octaves: 3, gain: 0.55 }));

      if (shape === 'island' || shape === 'basin' || shape === 'mesa') {
        const t = dist / rEff;
        const u = Math.min(1, Math.max(0, (t - plateau) / Math.max(1e-3, 1 - plateau)));
        // CONCAVE flank profile: steep in the upper third, relaxing toward
        // the base. A convex (smoothstep) profile is what makes procedural
        // mountains read as cones; concave flanks are what real massifs
        // have, and they are also where the erosion can organize valleys.
        const prof = Math.pow(1 - u, 0.95 + sharp * 1.5);
        // RIDGE / VALLEY modulation: the relief above the base plane is
        // multiplied by a ridged field, so the flank is already divided
        // into spurs and hollows for the hydrology to pick up.
        const ridgeMod = 0.72 + 0.62 * ridV;
        const skirt = Math.pow(Math.max(0, 1 - t / 1.4), 1.7) * 0.26;
        macro = prof * ridgeMod * relief + skirt * relief;
        if (shape === 'basin') {
          macro = (1 - prof) * relief * 0.6 - relief * 0.25 + ridgeMod * relief * 0.18;
        }
        if (shape === 'mesa') {
          const cap = 1 - sstep(plateau + 0.34, plateau + 0.46, t);
          const wall = 1 - sstep(plateau + 0.34, 0.72, t);
          macro = relief * (cap * 0.55 + wall * 0.45) * ridgeMod * 0.85;
        }
        edge = sstep(0.86 * R, 1.22 * R, dist);
      } else if (shape === 'plateau') {
        const sx = Math.abs(ddx) / (R * 1.25), sz = Math.abs(ddz) / (R * 1.1);
        const sq = Math.pow(Math.pow(sx, 4) + Math.pow(sz, 4), 0.25);
        const flat = 1 - sstep(plateau + 0.5, 1.0, sq);
        macro = relief * flat * (0.55 + 0.45 * ridV);
        edge = sstep(0.95, 1.35, sq) * 0.4;
      } else if (shape === 'ridges') {
        const az = (p.ridgeAzimuth ?? 0.6);
        const along = (x * Math.cos(az) + z * Math.sin(az)) * 0.16;
        const fold = 1 - Math.abs(Math.sin(along * 3.1 + 1.7 * pm.noise(x * 0.04, z * 0.04)));
        macro = relief * (0.25 + 0.75 * Math.pow(fold, 1.4)) * (0.7 + 0.5 * ridV);
        edge = sstep(0.9 * R, 1.3 * R, dist) * 0.5;
      } else if (shape === 'dunes') {
        const az = (p.duneAzimuth ?? 0.9);
        const across = x * Math.cos(az) + z * Math.sin(az);
        const wav = Math.sin(across * 0.55 + 1.5 * pm.noise(x * 0.05, z * 0.05));
        macro = relief * 0.30 + relief * 0.18 * (wav * 0.5 + 0.5);
        edge = sstep(0.88 * R, 1.25 * R, dist);
      }

      // ---- flank tilt: a long valley side / asymmetric massif ----
      macro += tilt * (ddx * Math.cos(tiltAz) + ddz * Math.sin(tiltAz)) * 0.25;

      // ---- fractal relief ----
      // The macro band displaces the landform (ridges and incipient valleys)
      // and the micro band roughens it, both scaled by how high we already
      // are, so the coast stays calm and the summit stays craggy.
      const reliefW = 0.3 + 0.7 * clamp01(macro / Math.max(relief, 1e-3));
      let h = sea + macro * (1 + macroNoise * p.rough * 1.15) +
        microNoise * relief * p.rough * 0.22 * reliefW;

      // ---- sub-peaks: secondary summits and their dividing ridges ----
      if ((shape === 'island' || shape === 'mesa' || shape === 'plateau') && (p.subPeaks ?? 3) > 0) {
        const n = p.subPeaks | 0;
        for (let sp = 0; sp < n; sp++) {
          const a = (sp / n) * Math.PI * 2 + fbm(pk, sp * 7.3, 1.1, { octaves: 2 }) * 1.5;
          const rr = R * (0.30 + 0.55 * vfbm2(sp * 3.1, 2.7, { octaves: 2, seed: seed ^ 0x33 }));
          const sx = cx0 + Math.cos(a) * rr, sz = cz0 + Math.sin(a) * rr;
          const rad = R * (0.28 + 0.22 * vfbm2(sp * 5.7, 9.1, { octaves: 2, seed: seed ^ 0x44 }));
          const amp = relief * (0.55 + 0.45 * vfbm2(sp * 2.3, 4.4, { octaves: 2, seed: seed ^ 0x66 }));
          const d2 = ((x - sx) * (x - sx) + (z - sz) * (z - sz)) / (rad * rad);
          const bump = amp * Math.exp(-d2);
          // smooth max keeps the saddle between the peaks instead of a seam
          h = smaxY(h, sea + bump, relief * 0.22);
        }
      }

      // ---- guided canyon (structural weakness, later boosted by the eroder) ----
      let attractor = 0;
      if (canyonOn && (shape === 'plateau' || shape === 'island' || shape === 'mesa')) {
        const ccx = canyonX(z);
        const wdt = (p.canyonWidth ?? 3) * (1 + 0.12 * ph.noise(z * 0.3, 5.5));
        const across = Math.abs(x - ccx);
        const prof = Math.exp(-(across * across) / (2 * wdt * wdt));
        const depth = relief * 0.85 * clamp01(p.canyon ?? 0);
        const floorY = sea + relief * 0.12;
        const cut = Math.max(0, h - floorY);
        const amount = Math.min(cut, depth * prof);
        h -= amount;
        attractor = prof * clamp01(p.canyon ?? 0);
      }

      // ---- coast / rim: sink to a sea floor so the block reads as a place ----
      if (edge > 0) {
        const seaFloor = sea - 3.0 - 1.6 * vfbm2(x * 0.12, z * 0.12, { octaves: 3, seed: seed ^ 0x55 });
        h = lerp(h, Math.min(h, seaFloor), edge);
      }

      hf.h[k] = h;
      hf.h0[k] = h;
      hf.attractor[k] = attractor;

      // ---- rock hardness: geological bands + regional variation ----
      const band = 0.5 + 0.5 * Math.sin((h - sea) * (p.strataFreq ?? 1.6) * Math.PI * 2 + 2.2 * ph.noise(x * 0.07, z * 0.07));
      const regional = vfbm2(x * 0.045, z * 0.045, { octaves: 3, seed: seed ^ 0xa17 });
      hf.hardness[k] = clamp01(p.hardness + (regional - 0.5) * 0.35);
      hf.strata[k] = clamp01((p.strata ?? 0.5) * band * (0.5 + 0.5 * regional));
      hf.soil[k] = Math.max(0.1, p.soilDepth ?? 1.2);
      // orographic rainfall: wetter on the windward side and at altitude
      hf.rain[k] = 0.65 + 0.7 * clamp01((h - sea) / Math.max(relief, 1e-3)) * (0.7 + 0.6 * value2(x * 0.05, z * 0.05, seed ^ 0x99));
    }
  }

  for (let k = 0; k < hf.h.length; k++) {
    hf.valid[k] = hf.h[k] > sea - 12 ? 1 : 1;
    hf.slope[k] = hf.slopeAt(hf.xOf(k % nx), hf.zOf((k / nx) | 0));
  }
  return hf;
}

/**
 * Write a height field into an SDF volume as `d = max(y - h, box)`.
 * Only a narrow band around the surface is given a correct distance;
 * planeWriteFixup() then clamps + Eikonal-solves the band.
 */
export function rasterizeBaseIntoVolume(vol, hf, { band = 8 } = {}) {
  const { nx, ny, nz, cell, min } = vol;
  const bandM = band * cell[1];
  for (let j = 0; j < Math.min(nz, hf.nz); j++) {
    for (let i = 0; i < Math.min(nx, hf.nx); i++) {
      const h = hf.h[hf.idx(i, j)];
      const yTop = Math.min(ny - 1, Math.floor((h + bandM - min[1]) / cell[1]));
      const yBot = Math.max(0, Math.floor((h - bandM - min[1]) / cell[1]));
      for (let y = yBot; y <= yTop; y++) {
        const wy = min[1] + (y + 0.5) * cell[1];
        const idx = vol.index(i, y, j);
        const plane = wy - h;
        // clamp into the band: outside it the value only has to keep its sign
        vol.data[idx] = plane > bandM ? bandM : plane < -bandM ? -bandM : plane;
      }
      // below the band: solid; above the band: air (keeps the Eikonal seeding sane)
      for (let y = 0; y < yBot; y++) vol.data[vol.index(i, y, j)] = -bandM;
      for (let y = Math.max(yTop + 1, 0); y < ny; y++) vol.data[vol.index(i, y, j)] = bandM;
    }
  }
  // the block's vertical sides are solid rock so the terrain has walls
  const boxPad = 0; // the volume IS the block: cells outside the landform are air
  void boxPad;
  planeWriteFixup(vol, [0, 0, 0, nx - 1, ny - 1, nz - 1], band);
  vol.refreshChunkStats();
  vol.markAllDirty();
  return hf;
}

/**
 * Extract the top surface from the volume (the highest solid voxel per
 * column, linearly interpolated to the zero crossing). Everything the
 * erosion solvers need lives on this grid.
 */
export function extractTopSurface(vol, hf, { box = null } = {}) {
  const { nx, ny, nz, cell, min } = vol;
  const seaFloor = min[1];
  // `box` = [i0, j0, i1, j1] in grid indices, for incremental re-extraction
  // after a sculpt stroke; the y search still starts at the top of the volume
  // because a brush may have raised the surface above the old one.
  const i0 = box ? Math.max(0, box[0]) : 0;
  const j0 = box ? Math.max(0, box[1]) : 0;
  const i1 = box ? Math.min(nz === nx ? nx - 1 : nx - 1, box[2]) : nx - 1;
  const j1 = box ? Math.min(nz - 1, box[3]) : nz - 1;
  for (let j = j0; j <= j1; j++) {
    for (let i = i0; i <= i1; i++) {
      let ySurf = seaFloor;
      let found = false;
      for (let y = ny - 1; y >= 0; y--) {
        const d = vol.data[vol.index(i, y, j)];
        if (d <= 0) {
          const dNext = y < ny - 1 ? vol.data[vol.index(i, y + 1, j)] : d;
          // fraction of the cell between this (solid) voxel and the one above:
          // d + t·(dNext − d) = 0  ⇒  t = −d / (dNext − d)
          const t = dNext > 0 ? -d / Math.max(dNext - d, 1e-6) : 0;
          ySurf = min[1] + (y + 0.5 + t) * cell[1];
          found = true;
          break;
        }
      }
      const k = hf.idx(i, j);
      hf.h[k] = found ? ySurf : seaFloor;
      hf.valid[k] = found ? 1 : 0;
    }
  }
  recomputeSlopes(hf);
  return hf;
}

/**
 * Push an eroded height field back into the volume.
 *
 * Carve (h below the old surface): `d = max(d, y - h)` — a CSG
 * half-space subtraction. Only cells above the *new* surface change,
 * so caves and undercuts below it survive.
 *
 * Fill (h above the old surface): `d = min(d, y - h)` within a band
 * around the new surface, so deposited fans weld onto the rock
 * instead of replacing caves deeper down.
 *
 * Both are followed by clamping to the band and an Eikonal re-solve,
 * which is what keeps the field a usable SDF for the raycaster, the
 * sculpt brushes and the mesher.
 */
export function rasterizeSurface(vol, hf, { band = 8 } = {}) {
  const { nx, ny, nz, cell, min } = vol;
  const bandM = band * cell[1];
  const t0 = performanceNow();
  const yOf = (y) => min[1] + (y + 0.5) * cell[1];
  const iyOf = (h) => (h - min[1]) / cell[1] - 0.5;
  for (let j = 0; j < Math.min(nz, hf.nz); j++) {
    for (let i = 0; i < Math.min(nx, hf.nx); i++) {
      const k = hf.idx(i, j);
      const h = hf.h[k];
      const hRef = hf.h0[k];            // surface as it currently is in the volume
      const carve = h < hRef - 1e-4;
      const fill = h > hRef + 1e-4;
      if (!carve && !fill) continue;
      // only the band between the old and the new surface is touched
      const yLo = Math.max(0, Math.floor(iyOf(Math.min(h, hRef) - bandM)));
      const yHi = Math.min(ny - 1, Math.ceil(iyOf(Math.max(h, hRef) + bandM)));
      if (carve) {
        for (let y = yLo; y <= yHi; y++) {
          const plane = yOf(y) - h;
          const idx = vol.index(i, y, j);
          if (plane > vol.data[idx]) vol.data[idx] = plane;
        }
      } else {
        for (let y = yLo; y <= yHi; y++) {
          const plane = yOf(y) - h;
          const idx = vol.index(i, y, j);
          if (plane < vol.data[idx]) vol.data[idx] = plane;
        }
      }
    }
  }
  planeWriteFixup(vol, [0, 0, 0, nx - 1, ny - 1, nz - 1], band);
  vol.refreshChunkStats();
  vol.markAllDirty();
  hf.h0.set(hf.h);
  return { ms: performanceNow() - t0 };
}

/** Recompute hf.slope from hf.h. */
export function recomputeSlopes(hf) {
  const { nx, nz, h, slope, cellX, cellZ } = hf;
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const k = j * nx + i;
      const hx = (h[j * nx + Math.min(nx - 1, i + 1)] - h[j * nx + Math.max(0, i - 1)]) /
        (cellX * (Math.min(nx - 1, i + 1) - Math.max(0, i - 1) || 1));
      const hz = (h[Math.min(nz - 1, j + 1) * nx + i] - h[Math.max(0, j - 1) * nx + i]) /
        (cellZ * (Math.min(nz - 1, j + 1) - Math.max(0, j - 1) || 1));
      slope[k] = Math.hypot(hx, hz);
    }
  }
}

/** Fresh HeightField sized to a volume (voxel-centred columns). */
export function heightfieldForVolume(vol) {
  return new HeightField(vol.nx, vol.nz, {
    minX: vol.min[0] + 0.5 * vol.cell[0],
    minZ: vol.min[2] + 0.5 * vol.cell[2],
    cellX: vol.cell[0],
    cellZ: vol.cell[2],
  });
}

/** Copy the static material maps from a base field onto a working field. */
export function copyMaterialMaps(src, dst) {
  dst.hardness.set(src.hardness);
  dst.strata.set(src.strata);
  dst.soil.set(src.soil);
  dst.attractor.set(src.attractor);
  dst.rain.set(src.rain);
}

export function performanceNow() {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

void hash2; void mulberry32; void BOUNDS;

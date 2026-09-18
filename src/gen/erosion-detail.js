/* ============================================================
 * Frontier · SDF terrain — detail stage (the anti-blur pass)
 *
 * The macro solver produces correct, mature landforms — and, if you
 * stop there, a smooth surface. Everything below adds the high
 * frequency that a real landscape has, *guided by what the erosion
 * actually did*, so it never looks like noise sprayed on top:
 *
 *   · RILLS       — a fine tributary mesh carved along the drainage
 *                   network, depth limited by slope and carried by the
 *                   particle trail map where droplets ran.
 *   · SHARPEN     — unsharp masking of the elevation field, applied
 *                   only where the slope is in the "rock wall" band:
 *                   ridges and cliff edges get crisp, valley floors
 *                   and alluvial fans stay soft.
 *   · STRATA LEDGES — hardness bands are pulled out as small benches
 *                   (the look of layered sedimentary rock).
 *   · ALLUVIUM    — deposited cells relax toward their neighbourhood
 *                   (smooth fans, braid bars, sand flats).
 *   · GRAIN       — a small fractal displacement whose amplitude
 *                   follows erosion intensity, so bare rock is rough
 *                   and grass-covered floors are quiet.
 *   · SCREE       — a second, finer talus pass for debris cones.
 *
 * All of it is bounded (each term has a metre cap) and mass-aware:
 * every metre of elevation removed is recorded in hf.erosion, so the
 * material system and the stats stay consistent.
 * ============================================================ */

import { Perlin2D, fbm, value2, subseed } from './noise.js';
import { recomputeSlopes } from './base-terrain.js';

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const sstep = (a, b, x) => {
  const t = clamp01((x - a) / (b - a || 1e-9));
  return t * t * (3 - 2 * t);
};

/** Separable 3-tap blur (×2 passes ≈ binomial 5-tap). */
function blurField(src, nx, nz, out) {
  const tmp = out._tmp || (out._tmp = new Float32Array(src.length));
  for (let j = 0; j < nz; j++) {
    const r = j * nx;
    for (let i = 0; i < nx; i++) {
      const a = src[r + Math.max(0, i - 1)], b = src[r + i], c = src[r + Math.min(nx - 1, i + 1)];
      tmp[r + i] = (a + 2 * b + c) * 0.25;
    }
  }
  for (let j = 0; j < nz; j++) {
    const r = j * nx;
    for (let i = 0; i < nx; i++) {
      const a = tmp[Math.max(0, j - 1) * nx + i], b = tmp[r + i], c = tmp[Math.min(nz - 1, j + 1) * nx + i];
      out[r + i] = (a + 2 * b + c) * 0.25;
    }
  }
  return out;
}

/**
 * @param {import('./heightfield.js').HeightField} hf
 * @param {object} e params.erosion
 * @param {{seed?:number, seaLevel?:number}} [opt]
 */
export function erodeDetail(hf, e, { seed = 1, seaLevel = 0 } = {}) {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const { nx, nz, h, cellX, cellZ } = hf;
  const size = nx * nz;
  const pn = new Perlin2D(subseed(seed, 0x2f11));
  const pv = subseed(seed, 0x77a3);
  const cellArea = hf.cellArea;

  let carvedV = 0, addedV = 0;

  /* ---------------------------------------------------------------- */
  /* 1. rills — a fine drainage mesh, slope- and trail-weighted        */
  /* ---------------------------------------------------------------- */
  const rills = e.rills ?? 0.5;
  if (rills > 0) {
    const maxRill = Math.min(0.35, cellX * 0.5);
    for (let j = 2; j < nz - 2; j++) {
      for (let i = 2; i < nx - 2; i++) {
        const k = j * nx + i;
        const hk = h[k];
        if (hk <= seaLevel + 0.15) continue;
        const A = hf.flow[k] * cellArea;
        // only the drainage network rills, and only where it is steep
        const chan = sstep(2.5, 40, A);
        if (chan <= 0.01) continue;
        const slope = hf.slope[k];
        const steep = sstep(0.04, 0.35, slope);
        if (steep <= 0.01) continue;
        // fractal modulation along the channel: rills, not a knife slit
        const n = fbm(pn, hf.xOf(i) * (e.rillScale ?? 0.9), hf.zOf(j) * (e.rillScale ?? 0.9),
          { octaves: 3, gain: 0.55, lacunarity: 2.1 });
        const trail = clamp01(hf.trail[k] * 0.02);
        const depth = maxRill * rills * chan * steep * (0.45 + 0.55 * (0.5 + 0.5 * n)) * (0.6 + 0.4 * trail);
        h[k] -= depth;
        hf.erosion[k] += depth;
        carvedV += depth * cellArea;
      }
    }
  }

  /* ---------------------------------------------------------------- */
  /* 2. sharpen — crisp ridges / cliff lips, soft floors               */
  /* ---------------------------------------------------------------- */
  const sharp = e.sharpen ?? 0.35;
  if (sharp > 0) {
    const blurred = blurField(h, nx, nz, new Float32Array(size));
    for (let j = 1; j < nz - 1; j++) {
      for (let i = 1; i < nx - 1; i++) {
        const k = j * nx + i;
        const hk = h[k];
        if (hk <= seaLevel + 0.05) continue;
        const slope = hf.slope[k];
        // only the rock-wall band: below it we want soft everything
        const band = sstep(0.25, 0.7, slope) * (1 - sstep(1.6, 3.0, slope));
        if (band <= 0.01) continue;
        const detail = hk - blurred[k];
        const boost = Math.max(-cellX * 0.6, Math.min(cellX * 0.6, detail * sharp * band * 2.5));
        h[k] += boost;
        if (boost < 0) hf.erosion[k] -= boost; else hf.deposit[k] += boost;
      }
    }
  }

  /* ---------------------------------------------------------------- */
  /* 3. strata ledges — pull hardness bands out as benches             */
  /* ---------------------------------------------------------------- */
  {
    const ledge = (e.ledge ?? 0.35);
    if (ledge > 0) {
      for (let j = 1; j < nz - 1; j++) {
        for (let i = 1; i < nx - 1; i++) {
          const k = j * nx + i;
          const hk = h[k];
          if (hk <= seaLevel + 0.2) continue;
          const slope = hf.slope[k];
          const steep = sstep(0.45, 1.1, slope);
          if (steep <= 0.01) continue;
          const band = hf.strata[k];
          const bench = (band - 0.5) * cellX * 0.55 * ledge * steep;
          if (Math.abs(bench) < 1e-6) continue;
          h[k] += bench;
          if (bench < 0) hf.erosion[k] -= bench; else hf.deposit[k] += bench;
        }
      }
    }
  }

  /* ---------------------------------------------------------------- */
  /* 4. alluvium — deposits relax into smooth fans and bars            */
  /* ---------------------------------------------------------------- */
  {
    const sand = e.sand ?? 0.35;
    if (sand > 0) {
      for (let j = 1; j < nz - 1; j++) {
        for (let i = 1; i < nx - 1; i++) {
          const k = j * nx + i;
          if (hf.deposit[k] < 1e-3) continue;
          const w = Math.min(1, hf.deposit[k] * 8) * sand;
          const lap = (h[k - 1] + h[k + 1] + h[k - nx] + h[k + nx]) * 0.25 - h[k];
          h[k] += lap * 0.35 * w;
        }
      }
    }
  }

  /* ---------------------------------------------------------------- */
  /* 5. scree — a finer, jittered talus pass                           */
  /* ---------------------------------------------------------------- */
  {
    const amt = (e.talusDetail ?? 0.4) * (e.talusRate ?? 0.5) * 0.5;
    if (amt > 0) {
      const repose = Math.max(0.15, (e.talus ?? 0.85) * 1.08);
      for (let j = 1; j < nz - 1; j++) {
        for (let i = 1; i < nx - 1; i++) {
          const k = j * nx + i;
          const hk = h[k];
          if (hk <= seaLevel + 0.1) continue;
          let move = 0, tgt = -1;
          for (let n = 0; n < 8; n++) {
            const dx = [1, -1, 0, 0, 1, -1, 1, -1][n];
            const dy = [0, 0, 1, -1, 1, -1, -1, 1][n];
            const dist = (dx && dy) ? Math.SQRT2 : 1;
            const k2 = (j + dy) * nx + (i + dx);
            const diff = (hk - h[k2]) / (cellX * dist);
            // jitter the repose angle so scree cones are not uniform
            const jitter = 1 + 0.12 * (value2(i * 0.3, j * 0.3, pv) - 0.5);
            const excess = diff - repose * jitter;
            if (excess > 0) { move += excess * dist * cellX * amt * 0.5; tgt = k2; }
          }
          if (tgt >= 0 && move > 0) {
            const m = Math.min(move, (hk - seaLevel) * 0.5);
            h[k] -= m;
            h[tgt] += m;
            hf.erosion[k] += m * 0.5;
            hf.deposit[tgt] += m * 0.5;
          }
        }
      }
    }
  }

  /* ---------------------------------------------------------------- */
  /* 6. grain — fractal surface roughness, erosion-driven              */
  /* ---------------------------------------------------------------- */
  {
    const grain = e.grain ?? 0.06;
    if (grain > 0) {
      const s = e.grainScale ?? 3.5;
      for (let j = 0; j < nz; j++) {
        for (let i = 0; i < nx; i++) {
          const k = j * nx + i;
          const hk = h[k];
          const x = hf.xOf(i), z = hf.zOf(j);
          const eroded = clamp01((hf.erosion[k] * 4 + hf.trail[k] * 0.01));
          const under = clamp01(1 - (hk - seaLevel) / 6);
          const w = (0.25 + 0.75 * eroded) * under;
          if (w <= 0.01) continue;
          const n = fbm(pn, x * s, z * s, { octaves: 4, gain: 0.5, lacunarity: 2.3 });
          const n2 = (value2(x * s * 3.1, z * s * 3.1, pv) - 0.5) * 0.6;
          const d = grain * w * (n * 0.7 + n2);
          h[k] += d;
          if (d < 0) hf.erosion[k] -= d; else hf.deposit[k] += d;
          carvedV += d < 0 ? -d * cellArea : 0;
          addedV += d > 0 ? d * cellArea : 0;
        }
      }
    }
  }

  recomputeSlopes(hf);
  const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  return { ms: t1 - t0, carvedM3: carvedV, depositedM3: addedV };
}

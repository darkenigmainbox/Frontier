/* ============================================================
 * Frontier · SDF terrain — macro fluvial evolution (the "mature"
 * half of the pipeline, taken from the erosion-algorithm project and
 * rebuilt so it stops blurring)
 *
 *     dh/dt = −K·Aᵐ·Sⁿ      stream-power incision
 *             + ∇·(D ∇h)     hillslope diffusion
 *             + sediment routing / deposition
 *
 * Four things were changed relative to the version that produced
 * blurry terrain:
 *
 *  A. ANISOTROPIC DIFFUSION. Diffusion is applied as two separate 1-D
 *     Laplacians, one *across* the slope and one *along* it, with
 *     D_across ≫ D_along. Cross-slope smoothing is what rounds
 *     interfluves into convex hillslopes (which is why the naive
 *     version looked smooth and pleasant); along-slope smoothing is
 *     what was erasing the channel profiles, so it is now weak.
 *
 *  B. CHANNEL PROTECTION. Cells whose drainage area exceeds
 *     `channelProtectA` lose up to 90 % of their diffusion, so the
 *     dendritic network survives thousands of iterations instead of
 *     being smeared into a smooth dome.
 *
 *  C. SLOPE-LIMITED DIFFUSION + TALUS. Diffusion fades out where the
 *     slope exceeds `diffusionSlopeLimit`; those faces are handled by
 *     an angle-of-repose (talus) pass instead, which produces sharp
 *     cliff faces with scree at the base rather than blurred walls.
 *
 *  D. RESOLUTION-INDEPENDENT RATES. Incision and diffusion are
 *     specified in *metres per iteration* (never in voxels), so the
 *     same recipe on a draft 80³ grid and an ultra 224³ grid yields
 *     the same landform. `maxCut` is a depth cap in metres.
 *
 * Hydrology (priority-flood + MFD) is described in flow.js.
 * ============================================================ */

import { hydrology } from './flow.js';
import { recomputeSlopes, performanceNow } from './base-terrain.js';

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const sstep = (a, b, x) => {
  const t = clamp01((x - a) / (b - a || 1e-9));
  return t * t * (3 - 2 * t);
};
const lerp = (a, b, t) => a + (b - a) * t;

/**
 * Run the macro erosion.
 *
 * @param {import('./heightfield.js').HeightField} hf
 * @param {object} e   params.erosion
 * @param {object} [opt]
 * @param {(i:number,n:number)=>Promise<void>|void} [opt.yield] progress hook
 * @returns {Promise<object>} statistics
 */
export async function erodeFluvial(hf, e, { yield: yieldFn = null, seaLevel = 0, seed = 1 } = {}) {
  const t0 = performanceNow();
  const { nx, nz, h, hardness, strata, attractor, rain } = hf;
  const size = nx * nz;
  const cellArea = hf.cellArea;
  const iterations = Math.max(1, e.iterations | 0);
  const maxCut = Math.max(0.02, e.maxCut ?? 0.2);

  const load = e.sediment ? new Float32Array(size) : null;
  const tmp = new Float32Array(size);
  const carvedMap = new Float32Array(size);
  const depMap = new Float32Array(size);

  let hyp = hydrology(hf, { exponent: e.flowExponent ?? 1.35, seaLevel, meander: e.meander ?? 0.45, seed });
  let carved = 0, deposited = 0;
  let flowMax = 1;

  const Dacross = Math.max(0, e.diffusionAcross ?? 0.16);
  const Dalong = Math.max(0, e.diffusionAlong ?? 0.035);
  const slopeLimit = Math.max(0.05, e.diffusionSlopeLimit ?? 0.85);
  const chanA = Math.max(1, e.channelProtectA ?? 25);
  const order = hyp.order;
  const m = e.m ?? 0.45, n = e.n ?? 1.05, K = e.K ?? 0.02;
  const canyonBoost = e.canyonBoost ?? 0.8;

  hf.slopeOut = hyp.slopeOut;

  const doIncision = () => {
    if (load) load.fill(0);
    const { flow, weights, receivers, wcount, slopeOut } = hyp;
    for (let o = size - 1; o >= 0; o--) {
      const k = order[o];                 // descending elevation
      const hk = h[k];
      if (hk <= seaLevel + 0.05) continue; // the sea floor is not cut
      const base = k * 8;
      const S = slopeOut[k];
      const A = flow[k] * cellArea;
      let carried = load ? load[k] : 0;
      const i = k % nx, j = (k / nx) | 0;

      if (S > 1e-5 && wcount[k] > 0) {
        // ---- stream power incision -------------------------------------
        let depth = K * Math.pow(A, m) * Math.pow(S, n);
        const hard = clamp01(hardness[k] * 0.75 + strata[k] * 0.45);
        depth *= 1 - 0.8 * hard;
        if (attractor[k] > 0.02) depth *= 1 + canyonBoost * attractor[k];
        // taper to zero at the waterline so coastlines stay clean
        depth *= sstep(seaLevel - 1.5, seaLevel + 2.5, hk);
        if (depth > maxCut) depth = maxCut;
        const avail = hk - seaLevel - 0.05;
        if (depth > avail) depth = avail;

        // ---- sediment: yield-limited bedload ---------------------------
        if (load) {
          const yield_ = depth * 0.4;
          const cap = 0.06 * Math.pow(A, 0.6) * (0.2 + S) * (1 - 0.5 * hard);
          let incoming = carried + yield_;
          let deposit = 0;
          if (incoming > cap && cap > 0) {
            deposit = Math.min(incoming - cap, maxCut * 1.5) * (e.deposition ?? 0.65);
            h[k] += deposit;
            depMap[k] += deposit;
            deposited += deposit * cellArea;
            incoming -= deposit;
          }
          // deltas: entering the sea/river drops most of its load
          if (hk < seaLevel + 0.6) {
            const dd = Math.min(incoming * 0.25, maxCut);
            h[k] += dd; depMap[k] += dd; deposited += dd * cellArea;
            incoming -= dd;
          }
          for (let q = 0; q < wcount[k]; q++) {
            const nb = NEI_DIRS[receivers[base + q]];
            const x2 = i + nb[0], y2 = j + nb[1];
            if (x2 < 0 || y2 < 0 || x2 >= nx || y2 >= nz) continue;
            load[y2 * nx + x2] += incoming * weights[base + q];
          }
          carried = incoming;
        }

        if (depth > 1e-9) {
          h[k] -= depth;
          hf.erosion[k] += depth;
          carvedMap[k] += depth;
          carved += depth * cellArea;
          // V-profile banks: shave the two cells perpendicular to the
          // flow so channels read as gullies with real walls, and so a
          // breached sill becomes a notch rather than a slot
          const w = clamp01(depth * 4);
          const down = hyp.downIdx[k];
          const sdx = down >= 0 ? (down % nx) - i : 0;
          const sdy = down >= 0 ? ((down / nx) | 0) - j : 0;
          for (let s = 0; s < 2; s++) {
            const px = s === 0 ? -sdy : sdy, py = s === 0 ? sdx : -sdx;
            const x2 = i + px, y2 = j + py;
            if (x2 < 1 || y2 < 1 || x2 >= nx - 1 || y2 >= nz - 1) continue;
            const k2 = y2 * nx + x2;
            const cut = depth * 0.35 * w;
            h[k2] -= cut;
            hf.erosion[k2] += cut;
            carvedMap[k2] += cut;
            carved += cut * cellArea;
          }
        }
      }
    }
  };

  /** Hillslope diffusion, anisotropic, channel-protected, slope-limited. */
  const doDiffusion = () => {
    // start from the current field: cells we skip (sea floor, rims) must keep
    // their elevation rather than being overwritten by the scratch buffer
    tmp.set(h);
    for (let j = 1; j < nz - 1; j++) {
      for (let i = 1; i < nx - 1; i++) {
        const k = j * nx + i;
        const hk = h[k];
        if (hk <= seaLevel + 0.02) continue;
        const gx = (h[k + 1] - h[k - 1]) * 0.5 / hf.cellX;
        const gz = (h[k + nx] - h[k - nx]) * 0.5 / hf.cellZ;
        const g = Math.hypot(gx, gz);
        let dAcross = Dacross, dAlong = Dalong;
        if (g > 1e-5) {
          const ux = gx / g, uz = gz / g;
          // cross-slope: perpendicular to the gradient
          const vx = -uz, vz = ux;
          const hU1 = hf.sampleGrid(h, i + ux, j + uz), hU2 = hf.sampleGrid(h, i - ux, j - uz);
          const hV1 = hf.sampleGrid(h, i + vx, j + vz), hV2 = hf.sampleGrid(h, i - vx, j - vz);
          const lapAlong = (hU1 + hU2 - 2 * hk) * 0.5;
          const lapAcross = (hV1 + hV2 - 2 * hk) * 0.5;
          // channel protection: the network is not smoothed away
          const A = hf.flow[k] * cellArea;
          const protect = sstep(chanA * 0.4, chanA * 2.5, A);
          const slopeFade = 1 - 0.9 * sstep(slopeLimit * 0.75, slopeLimit * 1.25, g);
          // ROCK PRESERVATION. Soft, deeply weathered ground diffuses and
          // rounds; hard exposed rock keeps its edges. Without this the
          // upper massif slowly melts into a dome no matter how the
          // diffusion is tuned, because every iteration takes a little off
          // the ridge and puts it in the hollow.
          const rockGuard = 1 - 0.8 * clamp01(hardness[k] * 0.6 + strata[k] * 0.5);
          const w0 = (0.25 + 0.75 * sstep(0.1, 1.6, hk - seaLevel)) * rockGuard;
          dAcross *= (1 - 0.9 * protect) * slopeFade * w0;
          dAlong *= (1 - 0.95 * protect) * slopeFade * w0 * 1.6;
          tmp[k] = hk + dAcross * lapAcross + dAlong * lapAlong;
        }
      }
    }
    // copy interior back (rim untouched → the block keeps clean edges)
    for (let j = 1; j < nz - 1; j++) {
      const row = j * nx;
      for (let i = 1; i < nx - 1; i++) h[row + i] = tmp[row + i];
    }
  };

  /** Angle-of-repose talus: over-steep faces relax into scree. */
  const doTalus = (rate) => {
    const repose = Math.max(0.15, e.talus ?? 0.85);
    const amount = (e.talusRate ?? 0.5) * rate;
    for (let j = 1; j < nz - 1; j++) {
      for (let i = 1; i < nx - 1; i++) {
        const k = j * nx + i;
        const hk = h[k];
        let move = 0, tgt = -1, worst = 0;
        for (let n = 0; n < 8; n++) {
          const [dx, dy, dist] = NEI_DIRS_8[n];
          const k2 = (j + dy) * nx + (i + dx);
          const diff = (hk - h[k2]) / (hf.cellX * dist);
          const excess = diff - repose;
          if (excess > worst) { worst = excess; tgt = k2; move = excess * dist * hf.cellX * amount; }
        }
        if (tgt >= 0 && move > 0) {
          h[k] -= move;
          h[tgt] += move;
          hf.erosion[k] += move * 0.5;
          hf.deposit[tgt] += move * 0.5;
        }
      }
    }
  };

  /** Fans and bars: relax deposited cells toward their neighbourhood. */
  const doFanSmooth = () => {
    const amt = e.deposition ?? 0.65;
    if (amt <= 0) return;
    for (let j = 1; j < nz - 1; j++) {
      for (let i = 1; i < nx - 1; i++) {
        const k = j * nx + i;
        if (depMap[k] < 1e-3) continue;
        const w = Math.min(1, depMap[k] * 6);
        const lap = (h[k - 1] + h[k + 1] + h[k - nx] + h[k + nx]) * 0.25 - h[k];
        h[k] += lap * 0.25 * w * amt;
      }
    }
  };

  const every = Math.max(1, e.flowEvery ?? 4);
  for (let it = 0; it < iterations; it++) {
    doIncision();
    doDiffusion();
    doTalus(0.35);
    if ((it & 7) === 7) doFanSmooth();
    if ((it + 1) % every === 0 || it === iterations - 1) {
      hyp = hydrology(hf, { exponent: e.flowExponent ?? 1.35, seaLevel, meander: e.meander ?? 0.45, seed });
      flowMax = 1;
      for (let k = 0; k < size; k++) if (hyp.flow[k] > flowMax) flowMax = hyp.flow[k];
      hf.slopeOut = hyp.slopeOut;
      if (yieldFn) await yieldFn(it + 1, iterations);
    }
  }

  recomputeSlopes(hf);
  hf.erosionMap = carvedMap;
  return {
    carvedM3: carved,
    depositedM3: deposited,
    iterations,
    flowMax,
    lakeCount: hyp.lakeCount,
    ms: performanceNow() - t0,
    meanSlope: hf.roughness(),
  };
}

/* ----------------------------- helpers ----------------------------- */

const NEI_DIRS = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [-1, -1], [1, -1], [-1, 1],
];
const NEI_DIRS_8 = [
  [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
  [1, 1, Math.SQRT2], [-1, -1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2],
];

void lerp;

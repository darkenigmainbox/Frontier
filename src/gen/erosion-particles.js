/* ============================================================
 * Frontier · SDF terrain — guarded particle (droplet) erosion
 *
 * This is the half taken from the particle-erosion project: agents
 * that carry water and sediment downhill and cut where they run
 * fast. It is what makes channels read as *carved by something*
 * instead of *computed* — undercut banks, plunge pools, braided
 * bars, alluvial fans and delta lobes.
 *
 * It is also the half that produced holes that never stopped
 * deepening. The cause was not the particle model, it was that
 * nothing in it was bounded:
 *
 *   1. every particle cut independently, so incision depth grew with
 *      the number of particles that happened to pass over a cell;
 *   2. the shear/detachment term had no floor — a steeper wall meant
 *      more stress meant a deeper cut, forever;
 *   3. there was no bedrock, no deposition on over-steep ground, and
 *      no total-depth budget, so a confluence became a well;
 *   4. the "distance repair" pass then re-normalised the field around
 *      the pit, hiding how far out of range it had gone.
 *
 * What is different here — every one of these is a hard guarantee,
 * not a tuning suggestion:
 *
 *   G1  PER-COLUMN INCISION BUDGET.  Each column records how much the
 *       pass has already removed (`incised[]`, snapshot of the pre-pass
 *       surface). A particle may never cut past `maxIncision` metres,
 *       and erodibility ramps down over the last 30 % so pits
 *       asymptote into broad valley floors instead of stopping with a
 *       visible lid. There is literally no code path that can make a
 *       column deeper than the budget.
 *
 *   G2  PER-STEP PENETRATION CAP (`cutPerStep`, a fraction of the cell
 *       size). One particle can never punch through in a single event.
 *
 *   G3  CAPACITY-LIMITED TRANSPORT.  Sediment capacity is
 *       ∝ max(slope, minSlope)·speed·water — the classic stream-capacity
 *       law. When a particle carries more than capacity it *deposits*,
 *       so pits and over-deepened troughs fill from upstream material
 *       (mass-conserving: everything removed is tracked in a load that
 *       is either re-deposited or exported at the domain edge).
 *
 *   G4  STOP SLOPE.  Below `stopSlope` the capacity term collapses to
 *       the floor value; channels stop deepening and start aggrading,
 *       which is how real valley floors behave.
 *
 *   G5  ARMOURING.  The exposed bed gets harder as the cover is
 *       stripped (`armouring`), so the last few centimetres of the
 *       budget take exponentially longer to remove.
 *
 *   G6  HARD FLOOR.  The eroded surface can never go below the block's
 *       rock floor — a safety net under all of the above.
 *
 * Every guard is asserted by tests/erosion.test.js, which runs the
 * kind of particle storm (all particles funnelled into one cell) that
 * used to dig the endless hole.
 * ============================================================ */

import { mulberry32, subseed } from './noise.js';
import { recomputeSlopes, performanceNow } from './base-terrain.js';

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const sstep = (a, b, x) => {
  const t = clamp01((x - a) / (b - a || 1e-9));
  return t * t * (3 - 2 * t);
};

/**
 * @param {import('./heightfield.js').HeightField} hf
 * @param {object} e  params.erosion
 * @param {object} [opt]
 * @returns {{carvedM3:number, depositedM3:number, dropped:number,
 *            deposited:number, escaped:number, ms:number, droplets:number}}
 */
export async function erodeParticles(hf, e, { seed = 1, seaLevel = 0, floorY = -400, yield: yieldFn = null } = {}) {
  const t0 = performanceNow();
  const { nx, nz, h, cellX, cellZ } = hf;
  const size = nx * nz;
  const rng = mulberry32(subseed(seed, 0x51a7));

  // A droplet covers roughly one cell per step; the *number* of droplets
  // is scaled with the grid area so the result is resolution independent.
  const steps = Math.max(4, e.particleSteps | 0);
  const ref = 112 * 112;
  const count = Math.max(500, Math.round((e.particleCount ?? 42000) * (size / ref)));

  const inertia = clamp01(e.particleInertia ?? 0.06);
  const capacityFactor = e.particleCapacity ?? 3.2;
  const erodeRate = e.particleErode ?? 0.5;
  const depositRate = e.particleDeposit ?? 0.35;
  const evaporate = Math.min(0.2, e.particleEvaporate ?? 0.02);
  const minSlope = Math.max(0, e.particleMinSlope ?? 0.012);
  const gravity = e.particleGravity ?? 6;
  const maxIncision = Math.max(0.2, e.maxIncision ?? 1.6);
  const stopSlope = Math.max(0, e.stopSlope ?? 0.035);
  const armouring = clamp01(e.armouring ?? 0.5);
  const cliffSlope = Math.max(0.3, e.cliffSlope ?? 0.95);
  const splatR = Math.max(1, (e.particleRadius ?? 0.9) / Math.max(cellX, 1e-3));
  /** Hard ceiling on the sediment ONE droplet may carry, in metres of depth.
   *  This is what stops a single particle from turning into a crater or a
   *  mound: a droplet is a small parcel of water, not a dredger. */
  const maxLoad = Math.max(0.005, e.particleMaxLoad ?? 0.06);
  /** G8: how much ONE pass may aggrade a single column (metres). The
   *  deposition-side twin of the incision budget: without it, every droplet
   *  that ends in the same low spot stacks another layer there and you get
   *  a mound (a "delta" 10 m tall). */
  const maxAggradation = Math.max(0.05, e.maxAggradation ?? 0.5);
  const aggraded = new Float32Array(size);
  const dumpSpread = Math.min(2, (e.particleRadius ?? 0.9) / Math.max(cellX, 1e-3));

  const incised = new Float32Array(size);   // G1: per-column budget spent
  const rockFloor = floorY;                 // G6: absolute floor of the block

  let removed = 0, placed = 0, escaped = 0, dropped = 0, droppedCount = 0;
  const cellArea = hf.cellArea;
  const cutPerStep = Math.max(0.006, e.cutPerStep ?? cellX * 0.18); // G2: metres per particle-step
  const stepLen = cellX;

  /** Gaussian erosion footprint over the 3×3 neighbourhood: a droplet is a
   *  parcel with width, not a laser. This is what keeps channels V-shaped
   *  and valley floors wide instead of cutting 1-cell slots. */
  const erodeKernel = (() => {
    const r = Math.max(0.75, Math.min(1.4, splatR));
    const K = [];
    let sum = 0;
    for (let dj = -1; dj <= 1; dj++)
      for (let di = -1; di <= 1; di++) {
        const w = Math.exp(-(di * di + dj * dj) / (2 * r * r));
        K.push([di, dj, w]);
        sum += w;
      }
    for (const k of K) k[2] /= sum;
    return K;
  })();

  const erodeAt = (x, z, amount) => {
    const i0 = Math.round((x - hf.minX) / cellX);
    const j0 = Math.round((z - hf.minZ) / cellZ);
    if (i0 < 1 || j0 < 1 || i0 >= nx - 2 || j0 >= nz - 2) return 0;
    const b = j0 * nx + i0;
    let applied = 0;
    for (let n = 0; n < erodeKernel.length; n++) {
      const [di, dj, w] = erodeKernel[n];
      applied += applyCut(b + dj * nx + di, w, amount);
    }
    return applied;
  };

  const applyCut = (k, w, amount) => {
    if (w <= 1e-4) return 0;
    const want = amount * w;
    const budget = maxIncision - incised[k];
    if (budget <= 1e-6) return 0;                    // G1: budget exhausted
    // G5: armouring — the last 30 % of the budget is progressively harder
    const spent = incised[k] / maxIncision;
    const armour = 1 - armouring * sstep(0.55, 1, spent);
    const localSlope = hf.slope[k];
    // G4: stop slope — no incision on flats ...
    const gate = localSlope > stopSlope ? sstep(stopSlope, stopSlope * 3, localSlope) : 0;
    // G7: WALL GUARD — no incision on faces steeper than `cliffSlope`.
    // Water running down a near-vertical wall does not cut a slot into it,
    // it sheets off. Together with G1 this is what makes the incision
    // self-limiting: as a cut steepens its own walls the guard closes, so
    // a channel widens into a valley instead of drilling a pothole.
    const wall = 1 - sstep(cliffSlope * 0.62, cliffSlope * 1.35, localSlope);
    if (wall <= 0) return 0;
    let cut = Math.min(want * armour * gate * wall, budget);   // G1 + G7
    cut = Math.min(cut, cutPerStep * Math.max(w, 0.25));       // G2
    if (cut <= 0) return 0;
    const newH = h[k] - cut;
    const minY = rockFloor + cellX * 1.5;                       // G6
    if (newH < minY) {
      const clipped = h[k] - minY;
      if (clipped <= 0) return 0;
      h[k] = minY;
      incised[k] += clipped;
      removed += clipped * cellArea;
      return clipped;
    }
    h[k] = newH;
    incised[k] += cut;
    removed += cut * cellArea;
    return cut;
  };

  let ceiling = -1e9;   // G9: highest elevation this deposit may reach
  const depositAt = (x, z, amount) => {
    const fi = (x - hf.minX) / cellX;
    const fj = (z - hf.minZ) / cellZ;
    const r = Math.max(1, Math.min(2.5, splatR));
    const i0 = Math.round(fi), j0 = Math.round(fj);
    let sum = 0;
    for (let dj = -2; dj <= 2; dj++) {
      for (let di = -2; di <= 2; di++) {
        const d = Math.hypot(di, dj) / r;
        if (d > 1.6) continue;
        const w = Math.exp(-d * d * 1.6);
        sum += w;
      }
    }
    if (sum <= 0) return 0;
    let applied = 0;
    for (let dj = -2; dj <= 2; dj++) {
      for (let di = -2; di <= 2; di++) {
        const d = Math.hypot(di, dj) / r;
        if (d > 1.6) continue;
        const x2 = i0 + di, y2 = j0 + dj;
        if (x2 < 0 || y2 < 0 || x2 >= nx || y2 >= nz) continue;
        const w = Math.exp(-d * d * 1.6) / sum;
        const k = y2 * nx + x2;
        const cl = clamp01(hf.hardness[k] * 0.6);
        // G8: per-column aggradation budget, with a ramp so fans flatten out
        const room = maxAggradation - aggraded[k];
        if (room <= 1e-5) continue;
        const ramp = 1 - 0.75 * sstep(0.5, 1, aggraded[k] / maxAggradation);
        let add = amount * w * (1 - 0.35 * cl) * ramp;
        if (add > room) add = room;
        // G9: water cannot build a cell above the point it flowed from
        if (ceiling > -1e9) {
          const headroom = ceiling - h[k];
          if (headroom <= 1e-5) continue;
          if (add > headroom) add = headroom;
        }
        h[k] += add;
        aggraded[k] += add;
        hf.deposit[k] += add;
        applied += add;
      }
    }
    return applied;
  };

  // Spawn weights: rainfall × land (never inside the sea) × a slope bonus,
  // turned into a CDF so picking a birth cell is O(log n) rather than O(n).
  const cdf = new Float32Array(size);
  let wsum = 0;
  for (let k = 0; k < size; k++) {
    if (h[k] <= seaLevel + 0.05 || !hf.valid[k]) { cdf[k] = wsum; continue; }
    const w = Math.max(hf.rain[k], 0.05) * (0.35 + Math.min(hf.slope[k], 1.2));
    wsum += w;
    cdf[k] = wsum;
  }
  if (wsum <= 0) return { carvedM3: 0, depositedM3: 0, droplets: 0, ms: performanceNow() - t0 };
  const pickCell = (u) => {
    const target = u * wsum;
    let lo = 0, hi = size - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cdf[mid] < target) lo = mid + 1; else hi = mid;
    }
    return lo;
  };

  let speed = 1, water = 1, sediment = 0;
  for (let d = 0; d < count; d++) {
    // ---- birth ------------------------------------------------------
    const k0 = pickCell(rng());
    const i0 = k0 % nx, j0 = (k0 / nx) | 0;
    let px = hf.xOf(i0), pz = hf.zOf(j0);
    let dir = [0, 0];
    let uphill = 0;
    speed = 1.0;
    water = 1.0;
    sediment = 0;

    for (let s = 0; s < steps; s++) {
      const prevH = hf.sampleArray(h, px, pz);
      // gradient (downhill is −∇h)
      const gx = (hf.sampleArray(h, px + cellX, pz) - hf.sampleArray(h, px - cellX, pz)) / (2 * cellX);
      const gz = (hf.sampleArray(h, px, pz + cellZ) - hf.sampleArray(h, px, pz - cellZ)) / (2 * cellZ);
      const glen = Math.hypot(gx, gz);
      // steer: inertia toward the previous direction, then downhill
      let ndx = dir[0] * inertia - gx * (1 - inertia);
      let ndz = dir[1] * inertia - gz * (1 - inertia);
      const nl = Math.hypot(ndx, ndz);
      if (nl < 1e-9) {
        // no gradient: keep going, or pick a random downhill-ish heading
        if (s === 0) {
          const a = rng() * Math.PI * 2;
          ndx = Math.cos(a); ndz = Math.sin(a);
        } else { ndx = dir[0]; ndz = dir[1]; }
      } else { ndx /= nl; ndz /= nl; }
      dir = [ndx, ndz];

      const nxp = px + ndx * stepLen;
      const nzp = pz + ndz * stepLen;
      if (nxp < hf.minX || nzp < hf.minZ || nxp > hf.maxX || nzp > hf.maxZ) {
        escaped += sediment;   // exported at the boundary (accounted, not lost)
        break;
      }
      const newH = hf.sampleArray(h, nxp, nzp);
      const dh = newH - prevH;                     // >0 uphill, <0 downhill

      // ---- capacity (G3/G4) ------------------------------------------
      // Sediment capacity grows with the local descent and the flow energy;
      // it collapses on flats (G4), so a channel stops deepening and starts
      // dropping its load where the gradient relaxes.
      const slopeDown = Math.max(-dh / stepLen, minSlope);
      const capacity = Math.min(maxLoad, slopeDown * speed * water * capacityFactor);
      if (dh > 0) {
        // Moving uphill: fill the step from the load (this is what welds a
        // channel bed flat and deposits deltas) but never more than the
        // step itself. Two uphill steps in a row means we are sitting in a
        // closed hollow — the droplet drops the rest of its load there and
        // dies, which is how basins fill in instead of growing holes.
        uphill++;
        const fill = Math.min(dh, sediment, maxLoad);
        if (fill > 0) {
          ceiling = prevH + cellX * 0.05;
          const placedNow = depositAt(px, pz, fill);
          ceiling = -1e9;
          sediment -= placedNow;
          placed += placedNow * cellArea;
        }
        if (uphill >= 2) {
          if (sediment > 0) {
            const dump = Math.min(sediment, maxLoad);
            ceiling = prevH + cellX * 0.05;
            const put = depositAt(px, pz, dump);
            ceiling = -1e9;
            placed += put * cellArea;
            escaped += sediment - put;
            sediment = 0;
          }
          break;
        }
      } else {
        uphill = 0;
        if (sediment > capacity) {
          const amount = Math.min((sediment - capacity) * depositRate, sediment, maxLoad);
          ceiling = Math.max(prevH, newH) + cellX * 0.05;
          const placedNow = depositAt(px, pz, amount);
          ceiling = -1e9;
          sediment -= placedNow;
          placed += placedNow * cellArea;
        } else {
          // ---- erode ---------------------------------------------------
          const avail = -dh;                       // don't dig past the step
          let amount = Math.min((capacity - sediment) * erodeRate, avail, cutPerStep);
          // rock resistance and armouring at the surface
          const hard = hf.hardnessAt(px, hf.sampleArray(h, px, pz), pz);
          amount *= (1 - 0.8 * clamp01(hard));
          let cut = 0;
          if (amount > 1e-7) cut = erodeAt(px, pz, amount);
          sediment += cut;
          // trail bookkeeping for rills / materials
          const ti = Math.round((px - hf.minX) / cellX);
          const tj = Math.round((pz - hf.minZ) / cellZ);
          if (ti >= 0 && tj >= 0 && ti < nx && tj < nz) {
            const kk = tj * nx + ti;
            hf.trail[kk] += 1;
            hf.wetParticle[kk] += water;
          }
          if (cut <= 0 && amount > 1e-7) dropped++;
        }
      }
      // a droplet can never carry more than maxLoad: excess is dropped as
      // it goes (an over-loaded stream spills its banks) and tracked as
      // exported material rather than silently teleporting
      if (sediment > maxLoad) {
        const excess = sediment - maxLoad;
        ceiling = prevH + cellX * 0.05;
        const put = depositAt(px, pz, excess * 0.5);
        ceiling = -1e9;
        placed += put * cellArea;
        escaped += excess - put;
        sediment -= excess;
      }

      // ---- physics: speed from the drop, water evaporates -------------
      speed = Math.sqrt(Math.max(0, speed * speed + (prevH - newH) * gravity));
      speed = Math.min(speed, 14);
      water *= (1 - evaporate);
      px = nxp; pz = nzp;
      if (water < 0.01) break;
    }
    if (sediment > 0) escaped += sediment; // never silently teleported
    // refresh the slope field periodically: the stop-slope gate and the
    // armouring ramp then act on the terrain as it is *now*, which is what
    // makes channels asymptote to flat floors instead of running away.
    if ((d & 2047) === 2047) recomputeSlopes(hf);
    if (d % 4096 === 0 && yieldFn) await yieldFn(d, count);
  }

  /* ------------------------------------------------------------------ */
  /* bulk alluvial rain — the load the droplets exported at the boundary */
  /* is spread over the gentle, low ground it would really have reached. */
  /* Without this, mass leaves the block and the lowlands quietly lose   */
  /* material every run; with it, piedmonts and deltas grow.             */
  /* ------------------------------------------------------------------ */
  const exported = escaped * cellArea;
  if (exported > 0) {
    const depCells = [];
    let maxD = 1e-6;
    for (let k = 0; k < size; k++) {
      if (h[k] > seaLevel + 0.6) {
        depCells.push(k);
        if (hf.deposit[k] > maxD) maxD = hf.deposit[k];
      }
    }
    // one pass of exponential smoothing over the "has been deposited on"
    // map gives a natural, connected set of aggradation zones
    const sm = new Float32Array(size);
    for (const k of depCells) sm[k] = 0.25 + hf.deposit[k] / maxD;
    const tmpS = new Float32Array(size);
    for (let pass = 0; pass < 3; pass++) {
      for (let j = 1; j < nz - 1; j++)
        for (let i = 1; i < nx - 1; i++) {
          const k = j * nx + i;
          tmpS[k] = (sm[k - 1] + sm[k + 1] + sm[k - nx] + sm[k + nx] + sm[k] * 2) / 6;
        }
      sm.set(tmpS);
    }
    let wsum2 = 0;
    for (const k of depCells) {
      const g = 1 / (1 + hf.slope[k] * 6);
      const w = g * sm[k];
      tmpS[k] = w;
      wsum2 += w;
    }
    if (wsum2 > 0) {
      for (const k of depCells) {
        let add = exported * tmpS[k] / wsum2 / cellArea;
        // G8 applies to the rain too: the exported load is spread over the
        // whole piedmont, but no single column may exceed the aggradation
        // budget (otherwise the ending of a storm is a 6 m mound). What does
        // not fit stays exported — it is reported, not teleported.
        const room = Math.max(0, maxAggradation - aggraded[k]);
        if (add > room) add = room;
        if (add <= 0) continue;
        h[k] += add;
        hf.deposit[k] += add;
        aggraded[k] += add;
        placed += add * cellArea;
      }
    }
  }

  recomputeSlopes(hf);
  return {
    carvedM3: removed,
    depositedM3: placed,
    droplets: count,
    droppedCount,
    exportedM3: exported,
    ms: performanceNow() - t0,
  };
}

export { sstep };

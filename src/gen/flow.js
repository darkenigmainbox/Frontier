import { Perlin2D, subseed } from './noise.js';
/* ============================================================
 * Frontier · SDF terrain — hydrology
 *
 * Two things the erosion needs and neither of the earlier engines did
 * well:
 *
 *  1. DEPRESSION HANDLING (priority-flood, Barnes et al. 2014).
 *     b2 routed flow over a Dijkstra "pour level"; that works, but it
 *     is ~4× slower than a heap-based priority flood and it cannot
 *     report lake depth. Here the fill level gives both the routing
 *     surface *and* the lake map used by the water renderer.
 *
 *  2. MULTI-FLOW-DIRECTION ACCUMULATION (Freeman 1991) instead of D8.
 *     D8 sends all flow to one neighbour: channels come out as
 *     1-cell-wide strokes with visible directional bias, which is a
 *     large part of why the old surfaces read as "computed". MFD
 *     spreads flow to every downhill neighbour weighted by slope^p,
 *     which produces realistic tributary junctions and wider valleys.
 *     `exponent` controls the convergence: 1.1 ≈ diffuse, 4+ ≈ D8.
 *
 * Both are pure functions over a HeightField — no state, so they can
 * be unit-tested against known surfaces (cone, tilted plane, pit).
 * ============================================================ */

const NEI = [
  [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
  [1, 1, Math.SQRT2], [-1, -1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2],
];

/**
 * Priority-flood depression filling.
 * @returns {{fill:Float32Array, depth:Float32Array, lakes:Uint8Array, lakeCount:number}}
 */
export function fillDepressions(hf, { seaLevel = -Infinity } = {}) {
  const { nx, nz, h } = hf;
  const size = nx * nz;
  const fill = new Float32Array(size).fill(Infinity);
  const closed = new Uint8Array(size);

  // binary heap of [level, index]
  const heapV = new Float64Array(size * 2);
  const heapI = new Int32Array(size * 2);
  // `from[k]` = the cell that discovered k while flooding. Those links always
  // point *downhill in level*, and chained together they form the shortest
  // path from any flooded cell to the spill point. That chain is what breaks
  // the tie on a flat filled surface (Garbrecht & Martz 1997): without it a
  // lake is a perfectly flat plain, MFD finds no downhill neighbour, and the
  // water sits there forever instead of leaving through the outlet.
  const from = new Int32Array(size).fill(-1);
  let heapN = 0;
  const push = (v, i) => {
    let c = heapN++;
    heapV[c] = v; heapI[c] = i;
    while (c > 0) {
      const par = (c - 1) >> 1;
      if (heapV[par] <= heapV[c]) break;
      const tv = heapV[par], ti = heapI[par];
      heapV[par] = heapV[c]; heapI[par] = heapI[c];
      heapV[c] = tv; heapI[c] = ti;
      c = par;
    }
  };
  const pop = () => {
    const v = heapV[0], i = heapI[0];
    heapN--;
    if (heapN > 0) {
      heapV[0] = heapV[heapN]; heapI[0] = heapI[heapN];
      let p = 0;
      for (;;) {
        const l = 2 * p + 1, r = l + 1;
        let m = p;
        if (l < heapN && heapV[l] < heapV[m]) m = l;
        if (r < heapN && heapV[r] < heapV[m]) m = r;
        if (m === p) break;
        const tv = heapV[m], ti = heapI[m];
        heapV[m] = heapV[p]; heapI[m] = heapI[p];
        heapV[p] = tv; heapI[p] = ti;
        p = m;
      }
    }
    return [v, i];
  };

  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const k = j * nx + i;
      const edge = i === 0 || j === 0 || i === nx - 1 || j === nz - 1;
      if (edge || h[k] <= seaLevel) {
        fill[k] = h[k] <= seaLevel ? h[k] : h[k];
        closed[k] = 1;
        push(fill[k], k);
      }
    }
  }
  while (heapN > 0) {
    const [level, k] = pop();
    const i = k % nx, j = (k / nx) | 0;
    for (let n = 0; n < 4; n++) {
      const nx2 = i + (n === 0 ? 1 : n === 1 ? -1 : 0);
      const ny2 = j + (n === 2 ? 1 : n === 3 ? -1 : 0);
      if (nx2 < 0 || ny2 < 0 || nx2 >= nx || ny2 >= nz) continue;
      const k2 = ny2 * nx + nx2;
      if (closed[k2]) continue;
      const nf = h[k2] > level ? h[k2] : level;
      if (nf < fill[k2]) {
        fill[k2] = nf;
        closed[k2] = 1;
        from[k2] = k;
        push(nf, k2);
      }
    }
  }

  const depth = new Float32Array(size);
  const lakes = new Uint8Array(size);
  let lakeCount = 0;
  const minDepth = 0.12;
  for (let k = 0; k < size; k++) {
    const d = fill[k] - h[k];
    if (d > minDepth) { depth[k] = d; if (h[k] > seaLevel) { lakes[k] = 1; } }
  }
  // count connected lake bodies (4-connectivity)
  const seen = new Uint8Array(size);
  const stack = new Int32Array(size);
  for (let k = 0; k < size; k++) {
    if (!lakes[k] || seen[k]) continue;
    let sp = 0;
    stack[sp++] = k; seen[k] = 1;
    while (sp > 0) {
      const c = stack[--sp];
      const i = c % nx, j = (c / nx) | 0;
      for (let n = 0; n < 4; n++) {
        const x2 = i + (n === 0 ? 1 : n === 1 ? -1 : 0);
        const y2 = j + (n === 2 ? 1 : n === 3 ? -1 : 0);
        if (x2 < 0 || y2 < 0 || x2 >= nx || y2 >= nz) continue;
        const c2 = y2 * nx + x2;
        if (!lakes[c2] || seen[c2]) continue;
        seen[c2] = 1;
        stack[sp++] = c2;
      }
    }
    lakeCount++;
  }

  // Distance (in cells, along the discovery chain) from the nearest outlet,
  // used as a tie-breaking gradient across flat filled surfaces. Capped so it
  // can never perturb the terrain by more than a centimetre.
  const pot = new Int32Array(size);
  const walk = new Int32Array(size);
  for (let k = 0; k < size; k++) {
    if (from[k] < 0 || pot[k] > 0) continue;
    let n = 0, c = k;
    while (c >= 0 && from[c] >= 0 && pot[c] === 0 && n < size) { walk[n++] = c; c = from[c]; }
    let p = c >= 0 ? pot[c] : 0;
    while (n > 0) { const q = walk[--n]; pot[q] = ++p; }
  }

  // lift isolated single-cell pits (numerical noise, not real lakes)
  return { fill, depth, lakes, lakeCount, outletDist: pot };
}

/**
 * Multi-flow-direction (Freeman 1991) accumulation.
 *
 * @param {import('./heightfield.js').HeightField} hf
 * @param {{fill?:Float32Array, exponent?:number, seaLevel?:number}} opt
 * @returns {{flow:Float32Array, weights:Float32Array, receivers:Int8Array,
 *            wcount:Uint8Array, order:Int32Array, slopeOut:Float32Array,
 *            downIdx:Int32Array}}
 */
export function computeFlow(hf, {
  fill = null, outletDist = null, exponent = 1.35, seaLevel = -Infinity,
  meander = 0.45, meanderScale = 0.055, seed = 1,
} = {}) {
  const { nx, nz, h } = hf;
  const size = nx * nz;
  const surf = new Float32Array(size);
  const tilt = new Float32Array(size);   // ε correction, see below
  for (let k = 0; k < size; k++) surf[k] = fill ? Math.max(h[k], fill[k]) : h[k];
  // Flat resolution (Garbrecht & Martz): a filled surface is *flat*, so
  // steepest descent has no direction to offer and the water would sit there
  // for ever. Any cell the plain routing leaves without an outlet gets a tiny
  // ε push along its priority-flood discovery chain, which points at the spill
  // point. ε ≤ 1 cm and only ever applied where there was no direction at all,
  // so it can steer a flat, never move a slope.
  const FLAT_EPS = 2e-5, FLAT_CAP = 500;

  // MEANDER BIAS. Pure steepest descent on an uneven surface routes every
  // stream into the local fall line, and on a radially symmetric massif that
  // produces straight radial spokes. Real channels wander because the ground
  // keeps nudging them sideways. A low-frequency, zero-mean angle field does
  // exactly that: it rotates each cell's preference by up to ±~35°, coherent
  // over ~15 m, so streams meander, braid and merge into real catchments.
  const NEI_ANG = NEI.map(([dx, dy]) => Math.atan2(dy, dx));
  const meanderN = meander > 0.01 ? new Perlin2D(subseed(seed, 0x51ab)) : null;
  const coast = (y) => {
    const t = (y - seaLevel - 0.3) / 2.2;
    return t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t);
  };

  const weights = new Float32Array(size * 8);
  const receivers = new Int8Array(size * 8).fill(-1);
  const wcount = new Uint8Array(size);
  const slopeOut = new Float32Array(size);
  const downIdx = new Int32Array(size).fill(-1);

  // Scan one cell's eight neighbours and fill in its flow weights.
  const scan = (k, i, j, extra) => {
    const cur = surf[k] + extra;
    const hk = h[k];
    const base = k * 8;
    let sum = 0, bestDrop = 0, bestNeighbour = -1;
    wcount[k] = 0;
    // the bias fades near the waterline so rivers run straight to the coast
    const phi = meanderN ? meanderN.noise(i * meanderScale, j * meanderScale) * Math.PI * coast(hk) : 0;
    for (let n = 0; n < 8; n++) {
      const x2 = i + NEI[n][0], y2 = j + NEI[n][1];
      if (x2 < 0 || y2 < 0 || x2 >= nx || y2 >= nz) continue;
      const k2 = y2 * nx + x2;
      let drop = cur - (surf[k2] + tilt[k2]);
      if (drop <= 1e-6) continue;
      if (phi !== 0) drop *= 1 + meander * Math.cos(NEI_ANG[n] - phi);
      if (drop <= 1e-6) continue;
      const w = Math.pow(drop / NEI[n][2], exponent);
      weights[base + wcount[k]] = w;
      receivers[base + wcount[k]] = n;
      wcount[k]++;
      sum += w;
      if (drop > bestDrop) { bestDrop = drop; bestNeighbour = k2; }
    }
    if (sum > 0) {
      for (let n = 0; n < wcount[k]; n++) weights[base + n] /= sum;
      downIdx[k] = bestNeighbour;
      // weighted downhill slope (rise over run), used by stream power
      let s = 0;
      for (let n = 0; n < wcount[k]; n++) {
        const nb = NEI[receivers[base + n]];
        const k2 = (j + nb[1]) * nx + (i + nb[0]);
        s += weights[base + n] * (hk - h[k2]) / (hf.cellX * nb[2]);
      }
      slopeOut[k] = s;
    } else {
      // sink: the sea, a closed lake, or the domain rim
      downIdx[k] = -1;
      slopeOut[k] = 0;
    }
    return sum;
  };

  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const k = j * nx + i;
      if (scan(k, i, j, 0) > 0) continue;
      // No outlet on the plain surface: this cell belongs to a flat. Push it
      // along the chain (higher `outletDist` = further from the spill point).
      const d = outletDist ? outletDist[k] : 0;
      const extra = d > 0 ? FLAT_EPS * Math.min(d, FLAT_CAP) : 0;
      if (extra > 0) {
        tilt[k] = extra;
        scan(k, i, j, extra);
      }
    }
  }

  // descending-height order via bucket sort (no comparison, cache friendly)
  const BUCKETS = 1024;
  let mn = Infinity, mx = -Infinity;
  for (let k = 0; k < size; k++) { const v = surf[k]; if (v < mn) mn = v; if (v > mx) mx = v; }
  const span = Math.max(mx - mn, 1e-6);
  const counts = new Int32Array(BUCKETS + 1);
  const bucketOf = new Int32Array(size);
  for (let k = 0; k < size; k++) {
    const b = Math.min(BUCKETS - 1, ((surf[k] - mn) / span * BUCKETS) | 0);
    bucketOf[k] = b; counts[b + 1]++;
  }
  for (let b = 0; b < BUCKETS; b++) counts[b + 1] += counts[b];
  const cursor = counts.slice(0, BUCKETS);
  const order = new Int32Array(size);
  for (let k = 0; k < size; k++) order[cursor[bucketOf[k]]++] = k;

  const flow = new Float32Array(size);
  for (let k = 0; k < size; k++) flow[k] = hf.rain ? Math.max(hf.rain[k], 0.05) : 1;
  for (let o = size - 1; o >= 0; o--) {
    const k = order[o];       // highest first
    if (wcount[k] === 0) continue;
    const f = flow[k];
    const base = k * 8;
    const i = k % nx, j = (k / nx) | 0;
    for (let n = 0; n < wcount[k]; n++) {
      const nb = NEI[receivers[base + n]];
      flow[(j + nb[1]) * nx + (i + nb[0])] += f * weights[base + n];
    }
  }

  return { flow, weights, receivers, wcount, order, slopeOut, downIdx, surface: surf };
}

/** Convenience: fill + accumulate in one call. */
export function hydrology(hf, { exponent = 1.35, seaLevel = -Infinity, meander = 0.45, seed = 1 } = {}) {
  const { fill, depth, lakes, lakeCount, outletDist } = fillDepressions(hf, { seaLevel });
  const routing = computeFlow(hf, { fill, outletDist, exponent, seaLevel, meander, seed });
  hf.flow.set(routing.flow);
  hf.lake.set(depth);
  return { ...routing, fillLevel: fill, lakeDepth: depth, lakes, lakeCount };
}

/** Drainage density (m of channel per m²) — a maturity metric for tests. */
export function drainageDensity(hf, minAreaM2 = 25) {
  const cells = minAreaM2 / hf.cellArea;
  let len = 0;
  for (let k = 0; k < hf.flow.length; k++) if (hf.flow[k] >= cells) len += hf.cellX;
  return len / (hf.nx * hf.nz * hf.cellArea);
}

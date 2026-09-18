// Frontier headless verification — `node test/headless.mjs`
//
// Proves the merged solver against the two ancestors:
//   ✓ no runaway holes     (ancestor A: unconditional demand floor + no pit fill)
//   ✓ no blur              (ancestor B: wide smooth deltas into the distance field)
//   ✓ sediment mass balance, determinism, valid SDF after sculpting, stamps.

import { Volume, generateVolume } from "../src/core/field.js";
import { Solver } from "../src/core/solver.js";
import { sculptStroke, redistanceVolume } from "../src/core/sculpt.js";
import { sharpness, roughnessStd, maxIncision, drilledColumns, heightField, legacyAlterSDFVolume } from "../src/core/metrics.js";
import { STAMP_TYPES } from "../src/core/stamps.js";
import { defaults } from "../src/core/constants.js";

let failures = 0;
function check(name, cond, detail = "") {
  console.log(`  ${cond ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
  if (!cond) failures++;
}

// Reduced world for CPU speed (same equations, coarser voxels)
const DIMS = [72, 44, 72];
const MIN = [-18, -4, -18], MAX = [18, 19, 18];
const BASE = { ...defaults, preset: 0, particleCount: 192, speed: 1, rainfall: 0.65, thermal: 0.35 };

function freshVolume() {
  const vol = new Volume(DIMS, MIN, MAX);
  generateVolume(vol, BASE);
  return vol;
}

console.log(`Frontier headless — world ${DIMS.join("x")} (${(DIMS[0]*DIMS[1]*DIMS[2]/1e6).toFixed(2)}M vox)`);

// 1. terrain generation sanity
{
  const vol = freshVolume();
  const mass = vol.solidMass();
  check("terrain generates solid mass", mass > 1000, `${mass.toFixed(0)} m³`);
  const world = vol.dims[0] * vol.dims[1] * vol.dims[2] * vol.voxelVolume;
  check("solid fraction plausible", mass / world > 0.25 && mass / world < 0.95, `${(mass / world * 100).toFixed(1)}%`);
  const hf = heightField(vol);
  let tops = 0;
  for (const h of hf) if (h > -1e8) tops++;
  check("height field has surfaces", tops > hf.length * 0.8, `${tops}/${hf.length} columns`);
}

// 2. determinism
{
  const a = freshVolume(), b = freshVolume();
  const sa = new Solver(a, BASE), sb = new Solver(b, BASE);
  for (let i = 0; i < 12; i++) { sa.step(); sb.step(); }
  let same = true;
  for (let i = 0; i < a.data.length; i++) if (a.data[i] !== b.data[i]) { same = false; break; }
  check("solver deterministic (same seed → identical volume)", same);
}

// 3. THE HOLE TEST — merged solver vs ancestor-A behavior
{
  const run = (params, ticks) => {
    const vol = freshVolume();
    const s = new Solver(vol, params);
    let snap30 = null;
    for (let i = 0; i < ticks; i++) { s.step(); if (i === 29) snap30 = heightField(vol); }
    return { vol, s, snap30 };
  };
  const good = run({ ...BASE, stability: 0.65 }, 90);
  const bad = run({ ...BASE, legacy: true }, 90);
  const good30 = run({ ...BASE, stability: 0.65 }, 30);
  const bad30 = run({ ...BASE, legacy: true }, 30);

  const hf0 = heightField(freshVolume());
  const inc = (v) => maxIncision(v, hf0);
  const incGood = inc(good.vol), incBad = inc(bad.vol);
  const holesGood = drilledColumns(good.vol, hf0);
  const holesBad = drilledColumns(bad.vol, hf0);
  const incGood30 = inc(good30.vol), incBad30 = inc(bad30.vol);

  check("merged: interior columns never drilled through", holesGood === 0, `${holesGood} gutted columns`);
  check("merged: incision growth decelerates (controller converges)",
    incGood - incGood30 < Math.max(1.5, incGood30 * 0.6),
    `incision ${incGood30.toFixed(1)} m @30 → ${incGood.toFixed(1)} m @90`);

  // sediment ledger: eroded ≈ deposited + carried + retired
  const L = good.s.ledger;
  const carried = [...good.s.cargo].filter((_, i) => i % 4 === 0).reduce((a, b) => a + b, 0) * good.vol.voxelVolume;
  const rhs = L.deposited + carried + L.retired;
  const err = Math.abs(L.eroded - rhs) / Math.max(L.eroded, 1e-6);
  check("sediment mass balance (eroded = deposited + carried + retired)", err < 0.12,
    `eroded ${L.eroded.toFixed(1)} m³, deposited ${L.deposited.toFixed(1)}, carried ${carried.toFixed(2)}, retired ${L.retired.toFixed(2)}, err ${(err * 100).toFixed(1)}%`);
  const dm = good.vol.solidMass() - freshVolume().solidMass();
  check("rock loss bounded (<6% of terrain per 90 ticks)", dm < 0 && -dm < good.vol.solidMass() * 0.06, `Δ solid ${dm.toFixed(1)} m³`);
}

// 3b. THE PIT-STALL TEST — the user's exact complaint: particles trapped in a
// depression digging it "deep without stopping". A closed bowl is carved, the
// whole particle pool is dropped into it, and the bowl floor depth is tracked.
// Merged: controller converges (stall → deposit, armor). Legacy: keeps digging.
{
  const mk = () => {
    const vol = new Volume([56, 36, 56], [-14, -3, -14], [14, 15, 14]);
    generateVolume(vol, { ...BASE, preset: 3, plotNoiseAmount: 0.02, plotHeight: 2.5 });
    return vol;
  };
  const bowlAt = [-2, 2.5, -2]; // on the flat plot
  const setup = (vol) => {
    sculptStroke(vol, [{ point: bowlAt, radius: 2.2, tool: 1, strength: 1 }], true); // bowl
    // reference heights, then drop all particles into the bowl
    const hf0 = heightField(vol);
    const s = new Solver(vol, { ...BASE, particleCount: 48, rainfall: 0, sourceMode: 0, thermal: 0, riverEnabled: false, waterEnabled: false, seed: 99 });
    const floor = [bowlAt[0], bowlAt[1] - 1.2, bowlAt[2]];
    for (let i = 0; i < s.N; i++) {
      s.pos[i*4] = floor[0] + (s.rng() - 0.5) * 1.6;
      s.pos[i*4+1] = floor[1] + 0.6 + s.rng() * 0.8;
      s.pos[i*4+2] = floor[2] + (s.rng() - 0.5) * 1.6;
      s.pos[i*4+3] = s.rng() * 2;
      s.vel[i*4] = 0; s.vel[i*4+1] = -1; s.vel[i*4+2] = 0; s.vel[i*4+3] = 1;
      s.meta[i*4] = 0; s.meta[i*4+1] = BASE.footprint; s.meta[i*4+2] = 250; s.meta[i*4+3] = 0.05;
      s.cargo[i*4] = 0; s.cargo[i*4+1] = 0; s.cargo[i*4+2] = 0;
      s.species[i] = 0.35;
    }
    return { s, hf0, vol };
  };
  const depthAt = (vol, hf0) => {
    const cx = Math.floor((bowlAt[0] - vol.min[0]) / vol.cell[0]);
    const cz = Math.floor((bowlAt[2] - vol.min[2]) / vol.cell[2]);
    let top = -1e9;
    for (let y = vol.dims[1] - 1; y >= 0; y--) if (vol.data[vol.index(cx, y, cz) + 3] >= 0.5) { top = vol.min[1] + (y + 0.5) * vol.cell[1]; break; }
    return hf0[cz * vol.dims[0] + cx] - top;
  };
  const mg = setup(mk()), lg = setup(mk());
  lg.s.legacy = true;
  for (let i = 0; i < 80; i++) { mg.s.step(); lg.s.step(); }
  const depthM = depthAt(mg.vol, mg.hf0);
  const depthL = depthAt(lg.vol, lg.hf0);
  check("pit-stall: merged bowl converges (no runaway)", depthM < 3.2, `bowl deepened to ${depthM.toFixed(2)} m`);
  check("pit-stall: ancestor-A keeps drilling the same bowl (runaway reproduced)",
    depthL > depthM * 1.8 + 0.3, `legacy bowl ${depthL.toFixed(2)} m vs merged ${depthM.toFixed(2)} m`);
}

// 4. THE BLUR TEST — equal removed volume: compact shell carving vs ancestor-B
// wide smooth deltas. The compact carve must concentrate depth (small pit
// footprint at half depth) and carry more high-frequency texture.
{
  const mkSlab = () => {
    const vol = new Volume([64, 28, 64], [-8, -3.5, -8], [8, 3.5, 8]);
    const [nx, ny, nz] = vol.dims;
    for (let z = 0; z < nz; z++) for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
      const w = vol.worldAt(x, y, z, [0, 0, 0]);
      const i = vol.index(x, y, z);
      vol.data[i] = w[1];               // slab top at y = 0
      vol.data[i + 3] = Math.max(0, Math.min(1, 0.5 - vol.data[i] / (2 * 0.32)));
    }
    return vol;
  };

  const a = mkSlab(), b = mkSlab();

  // merged-style: 500 compact shell events (same equations as GPU splat)
  const s = new Solver(a, { ...BASE, particleCount: 64 });
  for (let k = 0; k < 1300; k++) {
    const yy = 0.02 - 0.55 * (k % 3); // the agent follows the pit floor down
    s.applyRequest([0.5, yy, 0.5], [0, 1, 0], 0.66, 0, 0.1, 0);
    s.apply();
  }
  redistanceVolume(a, 2);

  // ancestor-B: wide (r=1.8 m) linear-falloff deltas added to the distance field
  for (let k = 0; k < 6; k++) legacyAlterSDFVolume(b, 0.5, 0.02, 0.5, 1.8, 0.038);

  const vNew = mkSlab().solidMass() - a.solidMass();
  const vOld = mkSlab().solidMass() - b.solidMass();
  const fair = Math.min(vNew, vOld) / Math.max(vNew, vOld);
  check("A/B fairness: similar removed volume", fair > 0.45, `merged ${vNew.toFixed(2)} m³ vs legacy ${vOld.toFixed(2)} m³`);

  // depth profile: pit depth at center + footprint area at half depth
  const profile = (vol) => {
    const [nx, , nz] = vol.dims;
    const cx = Math.floor((0.5 - vol.min[0]) / vol.cell[0]), cz = Math.floor((0.5 - vol.min[2]) / vol.cell[2]);
    const topAt = (x, z) => {
      for (let y = vol.dims[1] - 1; y >= 0; y--) if (vol.data[vol.index(x, y, z) + 3] >= 0.5) return vol.min[1] + (y + 0.5) * vol.cell[1];
      return vol.min[1];
    };
    const dc = 0 - topAt(cx, cz);
    let halfArea = 0;
    const cellA = vol.cell[0] * vol.cell[2];
    for (let z = 0; z < nz; z++) for (let x = 0; x < nx; x++) {
      const w = vol.worldAt(x, 0, z, [0, 0, 0]);
      if (Math.hypot(w[0] - 0.5, w[2] - 0.5) > 4) continue;
      if (0 - topAt(x, z) >= dc * 0.5 && dc > 0.01) halfArea += cellA;
    }
    return { dc, halfArea };
  };
  const pNew = profile(a), pOld = profile(b);
  check("merged carve concentrates depth (deeper center at equal volume)", pNew.dc > pOld.dc * 1.15,
    `center depth ${pNew.dc.toFixed(2)} m vs ${pOld.dc.toFixed(2)} m`);
  check("merged carve keeps a tight pit footprint (no smear)",
    pNew.halfArea < pOld.halfArea * 1.15,
    `half-depth area ${pNew.halfArea.toFixed(1)} m² vs ${pOld.halfArea.toFixed(1)} m²`);
  const roughNew = roughnessStd(a), roughOld = roughnessStd(b);
  check("merged carve has more texture (roughness std)", roughNew > roughOld * 1.1,
    `std ${roughNew.toFixed(4)} vs ${roughOld.toFixed(4)}`);
}

// 5. sculpting keeps the SDF valid (the "sculpt properly" contract)
{
  const vol = freshVolume();
  const rng = () => 0.5;
  const pts = [];
  for (let i = 0; i < 14; i++) {
    pts.push({ point: [-8 + 16 * rng(), 6, -8 + 16 * rng()], radius: 2.2, tool: (i % 4) + 1, strength: 0.6, stampType: i % 2 ? STAMP_TYPES.SPHERE : STAMP_TYPES.CRATER, stampMode: i % 2 ? "union" : "subtract" });
  }
  sculptStroke(vol, pts, true);
  // Validity metric for a thin-band SDF: adjacent-voxel jumps may not exceed
  // the band crossing bound 2·BAND + h (resolution independent).
  let worstJump = 0;
  const [nx, ny, nz] = vol.dims;
  const jumpBound = 2 * 0.32 * 1.05 + Math.max(...vol.cell) * 1.05;
  for (let z = 0; z < nz; z++) for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
    const i = vol.index(x, y, z);
    if (x < nx - 1) worstJump = Math.max(worstJump, Math.abs(vol.data[i] - vol.data[vol.index(x + 1, y, z)]));
    if (y < ny - 1) worstJump = Math.max(worstJump, Math.abs(vol.data[i] - vol.data[vol.index(x, y + 1, z)]));
    if (z < nz - 1) worstJump = Math.max(worstJump, Math.abs(vol.data[i] - vol.data[vol.index(x, y, z + 1)]));
  }
  check("sculpt + redistance keeps adjacent jumps within the band bound (valid SDF)", worstJump <= jumpBound,
    `max jump ${worstJump.toFixed(2)} ≤ bound ${jumpBound.toFixed(2)}`);
  // sign consistency: solid fraction agrees with distance sign
  let consistent = true;
  for (let i = 0; i < vol.data.length; i += 4) {
    const solid = vol.data[i + 3] >= 0.5;
    if (solid !== (vol.data[i] <= 0) && Math.abs(vol.data[i]) > 0.32 * 1.02) { consistent = false; break; }
  }
  check("SDF sign agrees with solid fraction after sculpt", consistent);
}

// 6. library stamps
{
  const vol = freshVolume();
  const m0 = vol.solidMass();
  sculptStroke(vol, [{ point: [0, 7, 0], radius: 4, tool: 5, strength: 1, stampType: STAMP_TYPES.ARCH, stampMode: "union" }], true);
  const m1 = vol.solidMass();
  check("arch stamp adds rock", m1 > m0 + 5, `+${(m1 - m0).toFixed(1)} m³`);
  sculptStroke(vol, [{ point: [0, 7, 0], radius: 4, tool: 5, strength: 1, stampType: STAMP_TYPES.CAVE, stampMode: "subtract" }], true);
  const m2 = vol.solidMass();
  check("cavern stamp removes rock", m2 < m1 - 2, `${(m2 - m1).toFixed(1)} m³`);
  // redistance validity after stamps (band-jump bound)
  let bad = 0;
  const [nx2, ny2, nz2] = vol.dims;
  const jb = 2 * 0.32 * 1.05 + Math.max(...vol.cell) * 1.05;
  for (let z = 0; z < nz2; z++) for (let y = 0; y < ny2; y++) for (let x = 0; x < nx2; x++) {
    const i = vol.index(x, y, z);
    if (x < nx2 - 1 && Math.abs(vol.data[i] - vol.data[vol.index(x + 1, y, z)]) > jb) bad++;
    if (y < ny2 - 1 && Math.abs(vol.data[i] - vol.data[vol.index(x, y + 1, z)]) > jb) bad++;
    if (z < nz2 - 1 && Math.abs(vol.data[i] - vol.data[vol.index(x, y, z + 1)]) > jb) bad++;
  }
  check("stamps leave a valid SDF", bad === 0, `${bad} jumps exceed bound ${jb.toFixed(2)}`);
}

// 7. erosion after sculpt doesn't destabilize (sculpted ground erodes sanely)
{
  const vol = freshVolume();
  sculptStroke(vol, [{ point: [0, 9, 0], radius: 3.5, tool: 2, strength: 0.9 }], true); // big mound
  const hf0 = heightField(vol);
  const s = new Solver(vol, { ...BASE, stability: 0.6 });
  for (let i = 0; i < 50; i++) s.step();
  const inc = maxIncision(vol, hf0);
  check("sculpted terrain erodes stably", inc < 5.5, `max incision ${inc.toFixed(1)} m`);
}

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);

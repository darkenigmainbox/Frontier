// Frontier headless visual proof — `node test/render-headless.mjs [outdir]`
//
// Renders, on the CPU (no GPU needed):
//   1. terrain-formed.png        fresh canyon formation
//   2. terrain-eroded-storm.png  after a monsoon storm (channels, fans, pits filled)
//   3. incision-map.png          top-view cut/fill map of the storm result
//   4. sculpt-demo.png           stamps + brushes with redistancing
//   5. A/B panels                hybrid vs each ancestor failure mode
// Pure Node (PNG encoded by hand, no deps).

import { Volume, generateVolume } from "../src/core/field.js";
import { Solver } from "../src/core/solver.js";
import { sculptStroke, redistanceVolume, sculptDab } from "../src/core/sculpt.js";
import { heightField, maxIncision, legacyAlterSDFVolume } from "../src/core/metrics.js";
import { defaults, scenarios, setTier, SIZE, MIN, MAX } from "../src/core/constants.js";
import { STAMP_TYPES } from "../src/core/stamps.js";
import { renderScene, renderIncisionMap, incisionMapDims, writePNG } from "./softwarerender.mjs";
import { mkdirSync } from "node:fs";
import path from "node:path";

const OUT = process.argv[2] || "renders";
mkdirSync(OUT, { recursive: true });
const save = (name, w, h, rgba) => { writePNG(path.join(OUT, name), w, h, rgba); console.log("  wrote", name); };

// Draft tier for CPU speed (same world extent, coarser voxels — the physics is
// resolution-independent; the interactive app defaults to Standard).
setTier("draft");
console.log(`render-headless — world ${SIZE.join("x")} at [${MIN}, ${MAX}]`);

const storm = scenarios.find(s => s.id === "storm");
const BASE = { ...defaults, tier: "draft", preset: 0, particleCount: 320 };

function fresh(params = BASE) {
  const vol = new Volume(SIZE, MIN, MAX);
  generateVolume(vol, params);
  return vol;
}

// ---- 1. formation -----------------------------------------------------------
{
  const vol = fresh();
  save("terrain-formed.png", 880, 550, renderScene(vol, {
    eye: [-19, 11, -21], target: [3, 3.5, 4], sunDeg: 128, waterLevel: 0.7,
  }));
}

// ---- 2. storm erosion + 3. incision map --------------------------------------
{
  const vol = fresh();
  const hf0 = heightField(vol);
  const s = new Solver(vol, { ...BASE, ...storm, particleCount: 320, gully: 1.5 });
  for (let i = 0; i < 140; i++) s.step();
  console.log(`  storm: eroded ${s.ledger.eroded.toFixed(1)} m³, deposited ${s.ledger.deposited.toFixed(1)} m³, max incision ${maxIncision(vol, hf0).toFixed(2)} m`);
  save("terrain-eroded-storm.png", 880, 550, renderScene(vol, {
    eye: [-19, 11, -21], target: [3, 3.5, 4], sunDeg: 128, waterLevel: 0.7, wetGain: 0.55,
  }));
  const map = renderIncisionMap(vol, hf0, 620);
  const [mw, mh] = incisionMapDims(vol, 620);
  save("incision-map.png", mw, mh, map);
}

// ---- 4. sculpting demo --------------------------------------------------------
{
  const vol = fresh();
  sculptStroke(vol, [
    { point: [-6, 8, -3], radius: 3.4, tool: 5, strength: 1, stampType: STAMP_TYPES.ARCH, stampMode: "union" },
    { point: [7.5, 7, 4], radius: 2.6, tool: 5, strength: 1, stampType: STAMP_TYPES.SPIRE, stampMode: "union" },
    { point: [12, 6, -7], radius: 3.0, tool: 5, strength: 1, stampType: STAMP_TYPES.BUTTE, stampMode: "smooth_union" },
    { point: [1, 3, 6], radius: 2.4, tool: 1, strength: 0.9 },
  ], true);
  // a few build dabs for a ridgeline
  for (let i = 0; i < 6; i++) {
    sculptDab(vol, [-2 + i * 1.2, 6.2 + Math.sin(i * 0.9) * 0.8, -8], 1.1, 2, 0.7);
  }
  redistanceVolume(vol, 6);
  const s = new Solver(vol, { ...BASE, particleCount: 192, rainfall: 0.5 });
  for (let i = 0; i < 40; i++) s.step(); // sculpted ground keeps eroding sanely
  save("sculpt-demo.png", 880, 550, renderScene(vol, {
    eye: [24, 12.5, 22], target: [-2, 4.5, -1], sunDeg: 128, waterLevel: 0.7, wetGain: 0.5,
  }));
}

// ---- 5. A/B: runaway bowl (hybrid vs ancestor A) -------------------------------
{
  const mk = () => {
    const vol = new Volume([64, 40, 64], [-16, -3, -16], [16, 17, 16]);
    generateVolume(vol, { ...BASE, preset: 3, plotNoiseAmount: 0.02, plotHeight: 2.5 });
    return vol;
  };
  const bowl = [-2, 2.5, -2];
  const setup = () => {
    const vol = mk();
    sculptStroke(vol, [{ point: bowl, radius: 2.4, tool: 1, strength: 1 }], true);
    const hf0 = heightField(vol);
    const s = new Solver(vol, { ...BASE, particleCount: 48, rainfall: 0, sourceMode: 0, thermal: 0, riverEnabled: false, waterEnabled: false, seed: 99 });
    for (let i = 0; i < s.N; i++) {
      s.pos[i * 4] = bowl[0] + (s.rng() - 0.5) * 1.8;
      s.pos[i * 4 + 1] = bowl[1] + 0.5 + s.rng() * 0.8;
      s.pos[i * 4 + 2] = bowl[2] + (s.rng() - 0.5) * 1.8;
      s.pos[i * 4 + 3] = s.rng() * 2;
      s.vel[i * 4] = 0; s.vel[i * 4 + 1] = -1; s.vel[i * 4 + 2] = 0; s.vel[i * 4 + 3] = 1;
      s.meta[i * 4] = 0; s.meta[i * 4 + 1] = BASE.footprint; s.meta[i * 4 + 2] = 250; s.meta[i * 4 + 3] = 0.05;
      s.species[i] = 0.35;
    }
    return { vol, s, hf0 };
  };
  const depthAt = (vol, hf0) => {
    const cx = Math.floor((bowl[0] - vol.min[0]) / vol.cell[0]);
    const cz = Math.floor((bowl[2] - vol.min[2]) / vol.cell[2]);
    let top = -1e9;
    for (let y = vol.dims[1] - 1; y >= 0; y--) if (vol.data[vol.index(cx, y, cz) + 3] >= 0.5) { top = vol.min[1] + (y + 0.5) * vol.cell[1]; break; }
    return hf0[cz * vol.dims[0] + cx] - top;
  };
  const mg = setup(), lg = setup();
  lg.s.legacy = true;
  for (let i = 0; i < 90; i++) { mg.s.step(); lg.s.step(); }
  const dM = depthAt(mg.vol, mg.hf0), dL = depthAt(lg.vol, lg.hf0);
  console.log(`  runaway A/B: hybrid bowl Δ${dM.toFixed(2)} m vs legacy Δ${dL.toFixed(2)} m`);
  // side-by-side close-ups (perspective, zoomed on the bowl)
  const eye = [bowl[0] + 4.2, bowl[1] + 3.2, bowl[2] + 5];
  const panel = (vol) => renderScene(vol, { eye, target: bowl, width: 460, height: 340, water: false, wetGain: 0 });
  {
    const L = panel(lg.vol), R = panel(mg.vol);
    const w = 460, h = 340;
    const both = Buffer.alloc((w * 2 + 8) * h * 4);
    for (let y = 0; y < h; y++) {
      L.copy(both, (y * (w * 2 + 8)) * 4, y * w * 4, (y * w + w) * 4);
      R.copy(both, (y * (w * 2 + 8) + (w + 8)) * 4, y * w * 4, (y * w + w) * 4);
    }
    save("ab-runaway-left-legacy-right-hybrid.png", w * 2 + 8, h, both);
  }
}

// ---- 6. A/B: carve sharpness (hybrid vs ancestor B) ----------------------------
{
  const mkSlab = () => {
    const vol = new Volume([72, 30, 72], [-9, -3.5, -9], [9, 3.5, 9]);
    const [nx, ny, nz] = vol.dims;
    for (let z = 0; z < nz; z++) for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
      const w = vol.worldAt(x, y, z, [0, 0, 0]);
      const i = vol.index(x, y, z);
      vol.data[i] = w[1];
      vol.data[i + 3] = Math.max(0, Math.min(1, 0.5 - vol.data[i] / (2 * 0.32)));
    }
    return vol;
  };
  const a = mkSlab(), b = mkSlab();
  const s = new Solver(a, { ...BASE, particleCount: 64 });
  for (let k = 0; k < 1300; k++) {
    const yy = 0.02 - 0.55 * (k % 3);
    s.applyRequest([0.5, yy, 0.5], [0, 1, 0], 0.66, 0, 0.1, 0);
    s.apply();
  }
  redistanceVolume(a, 2);
  for (let k = 0; k < 6; k++) legacyAlterSDFVolume(b, 0.5, 0.02, 0.5, 1.8, 0.038);
  const eye = [3.4, 2.6, 4.0], tgt = [0.5, -0.7, 0.5];
  const panel = (vol) => renderScene(vol, { eye, target: tgt, width: 460, height: 340, water: false });
  {
    const L = panel(a), R = panel(b);
    const w = 460, h = 340;
    const both = Buffer.alloc((w * 2 + 8) * h * 4);
    for (let y = 0; y < h; y++) {
      L.copy(both, (y * (w * 2 + 8)) * 4, y * w * 4, (y * w + w) * 4);
      R.copy(both, (y * (w * 2 + 8) + (w + 8)) * 4, y * w * 4, (y * w + w) * 4);
    }
    save("ab-blur-left-hybrid-right-legacyB.png", w * 2 + 8, h, both);
  }
}

console.log("done.");

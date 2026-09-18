// Headless visual proof — renders the two discriminating A/B scenarios as
// zoomed shaded-relief crops (hybrid vs each ancestor's failure mode), plus
// full-terrain overviews. Pure Node (PNG encoded by hand, no deps).
//   node test/render-headless.mjs [outdir]

import { Volume, generateVolume } from "../src/core/field.js";
import { Solver } from "../src/core/solver.js";
import { sculptStroke, redistanceVolume } from "../src/core/sculpt.js";
import { heightField, legacyAlterSDFVolume } from "../src/core/metrics.js";
import { defaults } from "../src/core/constants.js";
import { writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";

const OUT = process.argv[2] || "renders";
mkdirSync(OUT, { recursive: true });

const BASE = { ...defaults, preset: 0, particleCount: 192, speed: 1, rainfall: 0.65, thermal: 0.35 };

// ---- tiny PNG writer (RGBA8) -----------------------------------------------
const crcTable = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; }
  return t;
})();
function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = (c >>> 8) ^ crcTable[(c ^ buf[i]) & 0xff];
  return (~c) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function writePNG(path, w, h, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  writeFileSync(path, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw, { level: 6 })), chunk("IEND", Buffer.alloc(0))]));
}

// ---- top-surface sampler ----------------------------------------------------
function topAt(vol, hf, x, z) {
  const [nx, nz] = [vol.dims[0], vol.dims[2]];
  if (x < 0 || z < 0 || x >= nx || z >= nz) return -1e9;
  return hf[z * nx + x];
}

// Shaded-relief crop centered on voxel (cx, cz), (2*rad+1)² voxels scaled up.
// Incision below the reference field is tinted cyan→blue by depth; deposition
// above it is tinted warm. This makes holes and fill directly readable.
function renderCrop(vol, hf0, cx, cz, rad, pxPerVox, sunDeg = 130) {
  const [nx, nz] = [vol.dims[0], vol.dims[2]];
  const side = (2 * rad + 1) * pxPerVox;
  const img = Buffer.alloc(side * side * 4);
  const hf = heightField(vol);
  const at = (x, z) => topAt(vol, hf, x, z);
  const ref = (x, z) => topAt(vol, hf0, x, z);
  const sun = [Math.cos(sunDeg * Math.PI / 180), 0.75, Math.sin(sunDeg * Math.PI / 180)];
  const sl = Math.hypot(...sun); sun[0] /= sl; sun[1] /= sl; sun[2] /= sl;
  for (let py = 0; py < side; py++) for (let px = 0; px < side; px++) {
    const x = cx - rad + Math.floor(px / pxPerVox), z = cz - rad + Math.floor(py / pxPerVox);
    const h = at(x, z);
    const o = (py * side + px) * 4;
    if (h <= -1e8) { img[o] = 58; img[o + 1] = 78; img[o + 2] = 92; img[o + 3] = 255; continue; }
    const sx = (at(x + 1, z) - at(x - 1, z)) / (2 * vol.cell[0]);
    const sz = (at(x, z + 1) - at(x, z - 1)) / (2 * vol.cell[2]);
    const n = [-sx, 1, -sz], nl = Math.hypot(...n);
    const diff = Math.max(0, (n[0] * sun[0] + n[1] * sun[1] + n[2] * sun[2]) / nl);
    const d = ref(x, z) > -1e8 ? ref(x, z) - h : 0;      // + = incised
    const dep = -d;                                       // + = deposited
    let r = 0.60, g = 0.40, b = 0.24;                     // base sandstone
    if (d > 0.02) {                                       // incision tint
      const t = Math.min(1, d / 3.5);
      r = 0.45 - 0.30 * t; g = 0.62 - 0.10 * t; b = 0.70 + 0.25 * t;
    } else if (dep > 0.02) {                              // deposition tint
      const t = Math.min(1, dep / 1.2);
      r = 0.78 + 0.20 * t; g = 0.52 + 0.10 * t; b = 0.20;
    }
    const shade = 0.45 + 0.62 * diff;
    img[o] = Math.min(255, r * shade * 255);
    img[o + 1] = Math.min(255, g * shade * 255);
    img[o + 2] = Math.min(255, b * shade * 255);
    img[o + 3] = 255;
  }
  return { img, W: side, H: side };
}

function sideBySide(a, b, gap = 6) {
  const W = a.W * 2 + gap, H = a.H;
  const img = Buffer.alloc(W * H * 4);
  img.fill(12);
  for (let y = 0; y < H; y++) {
    a.img.copy(img, (y * W) * 4, y * a.W * 4, (y + 1) * a.W * 4);
    b.img.copy(img, (y * W + a.W + gap) * 4, y * b.W * 4, (y + 1) * b.W * 4);
  }
  return { img, W, H };
}

// full-terrain shaded relief (context shot)
function renderOverview(vol, W = 560, H = 400, sunDeg = 135) {
  const img = Buffer.alloc(W * H * 4);
  const [nx, , nz] = vol.dims;
  const hf = heightField(vol);
  const at = (x, z) => topAt(vol, hf, x, z);
  const sun = [Math.cos(sunDeg * Math.PI / 180), 0.7, Math.sin(sunDeg * Math.PI / 180)];
  const sl = Math.hypot(...sun); sun[0] /= sl; sun[1] /= sl; sun[2] /= sl;
  let hMin = 1e9, hMax = -1e9;
  for (const h of hf) if (h > -1e8) { hMin = Math.min(hMin, h); hMax = Math.max(hMax, h); }
  for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
    const x = Math.max(0, Math.min(nx - 1, Math.round((px / W) * nx - 0.5)));
    const z = Math.max(0, Math.min(nz - 1, Math.round((py / H) * nz - 0.5)));
    const h = hf[z * nx + x], o = (py * W + px) * 4;
    if (h <= -1e8) { img[o] = 70; img[o + 1] = 96; img[o + 2] = 108; img[o + 3] = 255; continue; }
    const sx = (at(x + 1, z) - at(x - 1, z)) / (2 * vol.cell[0]);
    const sz = (at(x, z + 1) - at(x, z - 1)) / (2 * vol.cell[2]);
    const n = [-sx, 2.2, -sz], nl = Math.hypot(...n);
    const diff = Math.max(0, (n[0] * sun[0] + n[1] * sun[1] + n[2] * sun[2]) / nl);
    const t = (h - hMin) / Math.max(0.001, hMax - hMin);
    const band = 0.5 + 0.5 * Math.sin(h * 3.5);
    let r = 0.62 + 0.16 * t, g = 0.36 + 0.08 * t, b = 0.16 + 0.05 * t;
    r *= 0.82 + 0.10 * band; g *= 0.82 + 0.10 * band; b *= 0.82 + 0.10 * band;
    const shade = 0.30 + 0.78 * diff;
    img[o] = Math.min(255, r * shade * 255);
    img[o + 1] = Math.min(255, g * shade * 255);
    img[o + 2] = Math.min(255, b * shade * 255);
    img[o + 3] = 255;
  }
  return { img, W, H };
}

// ============================================================================
// A. THE HOLE TEST — trapped particle pool in a carved bowl (ancestor A vs hybrid)
// ============================================================================
{
  const mk = () => {
    const vol = new Volume([56, 36, 56], [-14, -3, -14], [14, 15, 14]);
    generateVolume(vol, { ...BASE, preset: 3, plotNoiseAmount: 0.02, plotHeight: 2.5 });
    return vol;
  };
  const bowlAt = [-2, 2.5, -2];
  const setup = (vol) => {
    sculptStroke(vol, [{ point: bowlAt, radius: 2.2, tool: 1, strength: 1 }], true);
    const hf0 = heightField(vol);
    const s = new Solver(vol, { ...BASE, particleCount: 48, rainfall: 0, sourceMode: 0, thermal: 0, riverEnabled: false, waterEnabled: false, seed: 99 });
    const floor = [bowlAt[0], bowlAt[1] - 1.2, bowlAt[2]];
    for (let i = 0; i < s.N; i++) {
      s.pos[i * 4] = floor[0] + (s.rng() - 0.5) * 1.6;
      s.pos[i * 4 + 1] = floor[1] + 0.6 + s.rng() * 0.8;
      s.pos[i * 4 + 2] = floor[2] + (s.rng() - 0.5) * 1.6;
      s.pos[i * 4 + 3] = s.rng() * 2;
      s.vel[i * 4] = 0; s.vel[i * 4 + 1] = -1; s.vel[i * 4 + 2] = 0; s.vel[i * 4 + 3] = 1;
      s.meta[i * 4] = 0; s.meta[i * 4 + 1] = BASE.footprint; s.meta[i * 4 + 2] = 250; s.meta[i * 4 + 3] = 0.05;
      s.cargo[i * 4] = 0; s.cargo[i * 4 + 1] = 0; s.cargo[i * 4 + 2] = 0;
      s.species[i] = 0.35;
    }
    return { s, hf0, vol };
  };
  const mg = setup(mk()), lg = setup(mk());
  lg.s.legacy = true;
  for (let i = 0; i < 80; i++) { mg.s.step(); lg.s.step(); }

  const bcx = Math.round((bowlAt[0] - mg.vol.min[0]) / mg.vol.cell[0]);
  const bcz = Math.round((bowlAt[2] - mg.vol.min[2]) / mg.vol.cell[2]);
  const good = renderCrop(mg.vol, mg.hf0, bcx, bcz, 7, 28);
  const bad = renderCrop(lg.vol, lg.hf0, bcx, bcz, 7, 28);
  const panel = sideBySide(good, bad);
  writePNG(`${OUT}/ab-runaway-left-hybrid-right-legacyA.png`, panel.W, panel.H, panel.img);

  const depth = (v, hf0) => {
    let top = -1e9;
    for (let y = v.dims[1] - 1; y >= 0; y--) if (v.data[v.index(bcx, y, bcz) + 3] >= 0.5) { top = v.min[1] + (y + 0.5) * v.cell[1]; break; }
    return hf0[bcz * v.dims[0] + bcx] - top;
  };
  console.log(`A) pit-stall 80 ticks: hybrid bowl +${depth(mg.vol, mg.hf0).toFixed(2)} m  |  legacy-A bowl +${depth(lg.vol, lg.hf0).toFixed(2)} m`);
}

// ============================================================================
// B. THE BLUR TEST — equal removed volume: compact shell carve vs ancestor-B
//    wide smooth deltas (r = 1.8 m) written straight into the distance field
// ============================================================================
{
  const mkSlab = () => {
    const vol = new Volume([64, 28, 64], [-8, -3.5, -8], [8, 3.5, 8]);
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

  const ccx = Math.round((0.5 - a.min[0]) / a.cell[0]);
  const ccz = Math.round((0.5 - a.min[2]) / a.cell[2]);
  const hf0 = heightField(mkSlab());
  const good = renderCrop(a, hf0, ccx, ccz, 5, 40, 120);
  const bad = renderCrop(b, hf0, ccx, ccz, 5, 40, 120);
  const panel = sideBySide(good, bad);
  writePNG(`${OUT}/ab-blur-left-hybrid-right-legacyB.png`, panel.W, panel.H, panel.img);

  const prof = (vol) => {
    let top = -1e9;
    for (let y = vol.dims[1] - 1; y >= 0; y--) if (vol.data[vol.index(ccx, y, ccz) + 3] >= 0.5) { top = vol.min[1] + (y + 0.5) * vol.cell[1]; break; }
    return 0 - top;
  };
  console.log(`B) equal-volume carve: hybrid center depth ${prof(a).toFixed(2)} m  |  legacy-B ${prof(b).toFixed(2)} m`);
}

// ============================================================================
// C. full-terrain overviews (formation reference)
// ============================================================================
{
  const DIMS = [96, 56, 96], MIN = [-22, -4, -22], MAX = [22, 22, 22];
  const vol = new Volume(DIMS, MIN, MAX);
  generateVolume(vol, BASE);
  let r = renderOverview(vol); writePNG(`${OUT}/terrain-t000.png`, r.W, r.H, r.img);
  const s = new Solver(vol, BASE);
  for (let i = 0; i < 180; i++) s.step();
  r = renderOverview(vol); writePNG(`${OUT}/terrain-t180-hybrid.png`, r.W, r.H, r.img);
  console.log("C) overviews written (terrain-t000, terrain-t180-hybrid)");
}

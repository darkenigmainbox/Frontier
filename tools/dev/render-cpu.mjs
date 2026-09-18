#!/usr/bin/env node
/* ============================================================
 * Frontier · SDF terrain — CPU reference renderer
 *
 * Sphere-traces the *actual SDF volume* with a shadow ray, the same
 * material weights the app uses, and draws the water surface. This is
 * the ground truth for visual QA: if the terrain looks wrong here, it
 * looks wrong in the app, and it exercises the same raycast path
 * (src/gl/sdf-raycast.js is a GLSL port of this loop).
 *
 *   node tools/dev/render-cpu.mjs --out shots/look.png --w 360 --h 260
 * ============================================================ */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { defaultParams, mergeParams } from '../../src/gen/params.js';
import { buildBase, erode, analyse } from '../../src/gen/pipeline.js';
import { rasterizeSurface } from '../../src/gen/base-terrain.js';
import { encodePNG } from '../png.mjs';

const args = parseArgs(process.argv.slice(2));
const params = mergeParams(defaultParams, args.params ? JSON.parse(args.params) : {});
if (args.res) params.resolution = args.res;
if (args.seed) params.seed = Number(args.seed);
const W = Number(args.w || 320), H = Number(args.h || 240);
const SUP = Number(args.ss || 2);
const CLAY = args.clay === true || args.clay === 'true';
// QA switches: separating geometry problems from shading problems.
//  --noshadow  skip the shadow ray (shadow acne shows up as blocky stairs)
//  --noutline  ignore the attribute/strata modulation
const NOSHADOW = args.noshadow === true || args.noshadow === 'true';
const GRID = args.grid === true || args.grid === 'true';

const t0 = Date.now();
const PANELS = args.panels
  ? args.panels.split(',').map((spec) => {
      const [name, list] = spec.split(':');
      return { name, passes: list ? list.split('+') : [] };
    })
  : [{ name: 'all', passes: null }];
const PN = PANELS.length;
const PW = W, PH = H;

const panels = [];
{
  const b = buildBase(params);
  let hf = b.hf;
  let first = true;
  for (const spec of PANELS) {
    if (!first) {
      // rebuild the pristine terrain for each panel so panels are comparable
      const bb = buildBase(params);
      hf.h.set(bb.hf.h);
      hf.h0.set(bb.hf.h);
      hf.erosion.fill(0); hf.deposit.fill(0); hf.trail.fill(0); hf.wetParticle.fill(0);
      hf.wet.fill(0); hf.river.fill(0); hf.lake.fill(0);
    }
    first = false;
    if (spec.passes === null) await erode(hf, params, {});
    else if (spec.passes.length) await erode(hf, params, { passes: spec.passes });
    rasterizeSurface(b.volume, hf, { band: 8 });
    const a = analyse(hf, params);
    panels.push({ spec, hf, a, vol: b.volume.clone() });
  }
  console.log(`built ${PN} panel(s) in ${((Date.now() - t0) / 1000).toFixed(2)}s  grid ${b.volume.nx}x${b.volume.ny}x${b.volume.nz}`);
}
let vol = panels[0].vol;
let a = panels[0].a;
let hf = panels[0].hf;

const sea = params.seaLevel;
const az = ((params.sunAzimuth ?? 135) * Math.PI) / 180;
const sun = norm([Math.cos(az) * 0.72, 0.74, Math.sin(az) * 0.72]);
const sky = [0.42, 0.55, 0.72];
const fogColor = [0.62, 0.70, 0.78];

// orbit camera
const targetY = (panels[PN - 1].hf.maxHeight() + sea) * 0.45;
const camR = Number(args.dist || 46), camY = Number(args.elev || 24), camAz = Number(args.az || 2.35);
const eye = [camR * Math.cos(camAz), camY, camR * Math.sin(camAz)];
const target = [0, targetY, 0];
const fwd = norm(sub(target, eye));
const right = norm(cross(fwd, [0, 1, 0]));
const up = cross(right, fwd);
const fov = 42 * Math.PI / 180;
const aspect = W / H;

const TW = W * PN;
const img = new Uint8Array(TW * H * 3).fill(20);
for (let panel = 0; panel < PN; panel++) {
  hf = panels[panel].hf; a = panels[panel].a; vol = panels[panel].vol;
  const OX = panel * W;
  renderPanel(OX);
}
function renderPanel(OX) {
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    let r = 0, g = 0, bl = 0;
    for (let sy = 0; sy < SUP; sy++) {
      for (let sx = 0; sx < SUP; sx++) {
        const px = ((x + (sx + 0.5) / SUP) / W) * 2 - 1;
        const py = 1 - ((y + (sy + 0.5) / SUP) / H) * 2;
        const dir = norm(add3(fwd, add3(scale(right, px * Math.tan(fov / 2) * aspect), scale(up, py * Math.tan(fov / 2)))));
        const c = shade(eye, dir);
        r += c[0]; g += c[1]; bl += c[2];
      }
    }
    const n = SUP * SUP;
    const i = (y * TW + OX + x) * 3;
    img[i] = clamp255(tone(r / n) * 255);
    img[i + 1] = clamp255(tone(g / n) * 255);
    img[i + 2] = clamp255(tone(bl / n) * 255);
  }
}
}

function shade(o, d) {
  const hit = vol.raycast(o[0], o[1], o[2], d[0], d[1], d[2], { maxDist: 160 });
  // water plane: if the ray crosses the sea/lake plane before the terrain
  const tPlane = (sea - o[1]) / d[1];
  const waterFirst = params.water && d[1] < 0 && tPlane > 0 && (!hit || tPlane < hit.t);

  if (!hit && !waterFirst) {
    const t = Math.max(0, d[1]);
    return lerp3([0.80, 0.86, 0.93], [0.36, 0.55, 0.78], Math.pow(t, 0.5));
  }
  if (waterFirst) {
    const p = add3(o, scale(d, tPlane));
    if (Math.abs(p[0]) > 22 || Math.abs(p[2]) > 20) {
      const t = Math.max(0, d[1]);
      return lerp3([0.80, 0.86, 0.93], [0.36, 0.55, 0.78], Math.pow(t, 0.5));
    }
    const bottom = vol.raycast(p[0] + d[0] * 0.01, p[1] - 0.01, p[2] + d[2] * 0.01, d[0], d[1], d[2], { maxDist: 60 });
    const depth = bottom ? Math.min(1, bottom.t / 6) : 1;
    const deep = [0.06, 0.20, 0.28], shallow = [0.22, 0.46, 0.50];
    let col = lerp3(shallow, deep, depth);
    // specular + ripple
    const nrm = norm([Math.sin(p[0] * 3.1) * 0.03, 1, Math.cos(p[2] * 2.7) * 0.03]);
    const spec = Math.pow(Math.max(0, dot(nrm, norm(add3(d, sun)))), 90);
    col = add3(col, scale([1, 1, 0.95], spec * 0.7));
    const fres = Math.pow(1 - Math.max(0, -d[1]), 3);
    return lerp3(col, [0.72, 0.80, 0.88], fres * 0.55);
  }

  const p = hit.point, n = hit.normal;
  const albedo = materialAt(p);
  const ndl = Math.max(0, dot(n, sun));
  let shadow = 1;
  if (ndl > 0.01 && !NOSHADOW) {
    const sh = vol.raycast(p[0] + n[0] * 0.06, p[1] + n[1] * 0.06, p[2] + n[2] * 0.06,
      sun[0], sun[1], sun[2], { maxDist: 60, surfaceEps: 0.005 });
    if (sh) shadow = 0.35;
  }
  const amb = 0.35 + 0.25 * (n[1] * 0.5 + 0.5);
  let col = scale(albedo, ndl * shadow * 1.15 + amb * 0.55);
  const spec = Math.pow(Math.max(0, dot(n, norm(add3(d, sun)))), 40) * 0.12;
  col = add3(col, [spec, spec, spec]);
  // water reflection tint near the shoreline
  if (p[1] < sea + 0.35) col = lerp3(col, [0.5, 0.6, 0.65], 0.15);
  const dist = Math.hypot(p[0] - eye[0], p[2] - eye[2]);
  const fog = Math.min(1, Math.max(0, (dist - 55) / 90)) * 0.55;
  return lerp3(col, fogColor, fog);
}

function materialAt(p) {
  if (CLAY) {
    const i = Math.max(0, Math.min(hf.nx - 1, Math.round((p[0] - hf.minX) / hf.cellX)));
    const j = Math.max(0, Math.min(hf.nz - 1, Math.round((p[2] - hf.minZ) / hf.cellZ)));
    const k = j * hf.nx + i;
    // no per-cell dither here: a QA render should show the terrain, not the
    // voxel grid (--grid puts it back if you actually want to see the cells)
    const g = 0.66 + (GRID ? 0.09 * ((i * 37 + j * 91) % 5) / 5 : 0);
    const wet = hf.wet[k];
    return [g * (1 - 0.25 * wet), g * (1 - 0.2 * wet), g * (1 - 0.15 * wet)];
  }
  const i = Math.max(0, Math.min(hf.nx - 1, Math.round((p[0] - hf.minX) / hf.cellX)));
  const j = Math.max(0, Math.min(hf.nz - 1, Math.round((p[2] - hf.minZ) / hf.cellZ)));
  const k = j * hf.nx + i;
  // cheaper than the splat map and enough for QA: slope/height/exposure mix
  const c = k * 3;
  let base = [a.splats.colors[c], a.splats.colors[c + 1], a.splats.colors[c + 2]];
  const slope = hf.slope[k];
  const rockW = Math.min(1, Math.max(0, (slope - 0.55) / 0.6));
  const grain = 1 + (GRID ? 0.14 * ((i * 37 + j * 91) % 7) / 7 - 0.07 : 0);
  base = lerp3(base, [0.44, 0.43, 0.42], rockW * 0.45);
  const wet = hf.wet[k];
  base = scale(base, grain * (1 - 0.35 * wet));
  return base;
}

/* ---------------------------- helpers ---------------------------- */
function tone(v) { return v / (1 + v) * 1.35; }
function clamp255(v) { return v < 0 ? 0 : v > 255 ? 255 : v | 0; }
function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function add3(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
function scale(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; }
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function norm(a) { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
function lerp3(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }

function parseArgs(list) {
  const o = {};
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = list[i + 1];
    if (next && !next.startsWith('--')) { o[key] = next; i++; } else o[key] = true;
  }
  return o;
}

const out = args.out || 'shots/look.png';
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, encodePNG(TW, H, img, 3));
console.log('wrote', out, `${TW}x${H}`, `in ${((Date.now() - t0) / 1000).toFixed(2)}s`);

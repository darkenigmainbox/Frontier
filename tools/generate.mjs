#!/usr/bin/env node
/* ============================================================
 * Frontier · SDF terrain — headless baker
 *
 * The offline entry point. Runs the *same* JS pipeline the browser app runs
 * (there is no second implementation to drift), then writes every artefact
 * a game engine can consume into one directory:
 *
 *   terrain.frontier   the SDF volume itself — the source of truth
 *   terrain.obj/.mtl   visual mesh, split per material + per chunk group
 *   terrain.stl        3D-print / DCC interchange
 *   heightmap16.png    16-bit height field (engine terrain importers)
 *   splat0.png         per-layer material weights (RGBA, 2 sheets)
 *   albedo.png         baked preview colour
 *   texture-atlas.png  the 5-layer material atlas
 *   recipe.json        exact parameters + stats, for reproducibility
 *   preview.png        shaded-relief QA mosaic
 *
 * Usage:
 *   node tools/generate.mjs --seed 4821 --res draft --out terrain/volcano
 *   node tools/generate.mjs --res fine --material alpine --atlas 512
 *   node tools/generate.mjs --particles off --fluvial off     # base landform only
 * ============================================================ */

import { mkdirSync, writeFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';

import { defaultParams, mergeParams, RESOLUTIONS, seedOf, BOUNDS } from '../src/gen/params.js';
import { generateTerrain, dimsFor, createVolume } from '../src/gen/pipeline.js';
import { meshVolume, splitByChunk, triangleCount, meshBounds } from '../src/gen/mesh-assemble.js';
import { computeChannels, computeSplatWeights, MATERIAL_PRESETS, CHANNEL_NAMES } from '../src/gen/materials.js';
import { bakeAllLayers, packAtlas } from '../src/gen/textures.js';
import {
  encodeSdfVolume, encodeOBJ, encodeMTL, encodeSTL, encodeHeightPNG,
  encodeChannelPNG, encodeSplatPNG, encodeSplatExtraPNG, encodeColorPNG, encodeRecipe,
} from '../src/io/exporters.js';
import { encodePNG } from '../src/io/png-lite.js';

const argv = parseArgs(process.argv.slice(2));
if (argv.help || argv.h) {
  console.log(`Frontier · headless terrain baker

  --out <dir>        output directory            (default terrain)
  --res <name>       ${Object.keys(RESOLUTIONS).join(' | ')} (default draft)
  --seed <n>         integer seed, or any string
  --shape <name>     island|basin|mesa|plateau|ridges|dunes
  --material <name>  ${Object.keys(MATERIAL_PRESETS).join('|')}
  --size <n>         volume voxels on X (overrides --res)
  --fluvial <n>      eroder iterations, "off" to skip
  --particles <n>    droplet count, "off" to skip
  --atlas <px>       material texture size     (default 256, 0 = skip)
  --no-mesh          skip OBJ/STL export (volume + maps only)
  --quiet            only print the summary

  Everything the tool writes is described by recipe.json.
`);
  process.exit(0);
}

const outDir = resolveOut(argv.out);
const t0 = Date.now();

/* ------------------------------------------------------------------ */
/* parameters                                                          */
/* ------------------------------------------------------------------ */

const over = {};
for (const k of ['seaLevel', 'relief', 'radius']) {
  if (argv[k] !== undefined) over[k] = numeric(argv[k]);
}
if (argv.shape !== undefined) over.shape = argv.shape;
if (argv.material !== undefined) over.material = argv.material;
if (argv.res !== undefined && !RESOLUTIONS[argv.res]) die(`unknown --res ${argv.res}`);
if (argv.res !== undefined) over.resolution = argv.res;
if (argv.seed !== undefined) over.seed = /^-?\d+$/.test(argv.seed) ? Number(argv.seed) : argv.seed;

const erosion = {};
if (argv.fluvial !== undefined) {
  const v = argv.fluvial;
  if (v === 'off' || v === '0' || v === 'false') erosion.iterations = 0;
  else erosion.iterations = Math.round(Number(v));
}
if (argv.particles !== undefined) {
  const v = argv.particles;
  if (v === 'off' || v === '0' || v === 'false') erosion.particles = false;
  else erosion.particleCount = Math.round(Number(v));
}
if (Object.keys(erosion).length) over.erosion = erosion;

const params = mergeParams(defaultParams, over);
const res = dimsFor(params);
const log = argv.quiet ? () => {} : (...a) => console.log(...a);

mkdirSync(outDir, { recursive: true });

log(`Frontier terrain`);
log(`  seed      ${params.seed}   resolution ${params.resolution}`);
log(`  landform  ${params.shape} · material ${params.material}`);
log(`  volume    ${res.join('×')} voxels   bounds ${BOUNDS.min.map((v) => v.toFixed(1))} → ${BOUNDS.max.map((v) => v.toFixed(1))} m`);
log('');

/* ------------------------------------------------------------------ */
/* generate                                                            */
/* ------------------------------------------------------------------ */

const result = await generateTerrain(params, {
  onStage: (s) => {
    if (!s.stage) return;
    if (s.done) {
      const ms = s.ms ?? null;
      log(`  ✓ ${s.stage.padEnd(12)} ${ms === null ? '' : `${ms.toFixed(0)} ms`}`);
    } else if (s.started) {
      log(`  · ${s.stage}…`);
    }
  },
});

const { volume, hf, stats, rivers } = result;
log('');

/* ------------------------------------------------------------------ */
/* analysis + materials                                                */
/* ------------------------------------------------------------------ */

const channels = result.channels ?? computeChannels(hf, { seaLevel: params.seaLevel });
const splatPreset = params.material ?? 'alpine';
const splats = result.splats ?? computeSplatWeights(channels, {
  preset: splatPreset,
  snowLine: params.snowLine,
  seaLevelNorm: 0,
});

/* ------------------------------------------------------------------ */
/* mesh                                                                */
/* ------------------------------------------------------------------ */

const wantMesh = argv.mesh !== false;
let mesh = null, meshMs = 0, parts = null;
if (wantMesh) {
  const tM = Date.now();
  mesh = meshVolume(volume, { hf, channels, splats });
  meshMs = Date.now() - tM;
  parts = splitByChunk(volume, mesh, hf, splats);
}

/* ------------------------------------------------------------------ */
/* textures                                                            */
/* ------------------------------------------------------------------ */

const atlasSize = argv.atlas !== undefined ? Math.max(0, Math.round(Number(argv.atlas))) : 256;
let atlas = null, layers = null;
if (atlasSize > 0) {
  const tT = Date.now();
  layers = bakeAllLayers(atlasSize, seedOf(params));
  atlas = packAtlas(layers);
  log(`  baked ${Object.keys(layers).length} material layers @${atlasSize}² in ${Date.now() - tT} ms`);
}

/* ------------------------------------------------------------------ */
/* write                                                               */
/* ------------------------------------------------------------------ */

const written = [];
const put = (name, bytes) => {
  writeFileSync(join(outDir, name), bytes);
  written.push([name, bytes.length]);
};

put('terrain.frontier', encodeSdfVolume(volume, {
  meta: {
    generator: 'frontier-terrain',
    seed: params.seed,
    shape: params.shape,
    material: splatPreset,
    resolution: params.resolution,
    seaLevel: params.seaLevel,
    cell: volume.cell,
    channels: CHANNEL_NAMES,
  },
}));
put('recipe.json', encodeRecipe(stripRuntime(params), describeStats(stats, rivers)));

if (wantMesh) {
  put('terrain.obj', encodeOBJ(parts, { name: 'terrain', splats: true }));
  put('terrain.mtl', encodeMTL('terrain'));
  put('terrain.stl', encodeSTL(parts, { name: 'terrain' }));
}

put('heightmap16.png', encodeHeightPNG(hf, { min: stats.min, max: stats.max }));
put('splat0.png', encodeSplatPNG(splats, hf.nx, hf.nz));
put('splat1.png', encodeSplatExtraPNG(splats, hf.nx, hf.nz));
put('channels.png', encodeChannelPNG(channels.height, hf.nx, hf.nz));
put('albedo.png', encodeColorPNG(splats.colors, hf.nx, hf.nz));
if (atlas) {
  // one texture-array sheet per map type: rows = layers, columns = tiles
  put('texture-atlas.png', encodePNG(atlas.width, atlas.height, atlas.albedo, 3));
  put('texture-atlas-normal.png', encodePNG(atlas.width, atlas.height, atlas.normal, 4));
  put('texture-atlas-rough.png', encodePNG(atlas.width, atlas.height, atlas.rough, 1));
}
put('preview.png', renderPreview(result, params));

/* ------------------------------------------------------------------ */
/* report                                                              */
/* ------------------------------------------------------------------ */

const fmt = (b) => b > 1024 * 1024 ? `${(b / 1048576).toFixed(2)} MiB` : `${(b / 1024).toFixed(1)} KiB`;
log(`\n${outDir}`);
for (const [name, size] of written) log(`  ${name.padEnd(24)} ${fmt(size).padStart(10)}`);

const secs = (Date.now() - t0) / 1000;
console.log(`\n${volume.nx}×${volume.ny}×${volume.nz} SDF · cell ${volume.cell.map((c) => c.toFixed(3)).join('×')} m`);
if (mesh) {
  console.log(`${triangleCount(mesh).toLocaleString()} triangles · ${mesh.positions.length / 3 | 0} vertices · ${parts.length} chunks`
    + `  (meshed in ${meshMs} ms)`);
  const b = meshBounds(mesh);
  console.log(`bounds ${b.min.map((v) => v.toFixed(1)).join(', ')} → ${b.max.map((v) => v.toFixed(1)).join(', ')}`);
}
console.log(`height ${stats.min.toFixed(2)} … ${stats.max.toFixed(2)} m · mean slope ${stats.meanSlope.toFixed(3)}`
  + ` · carved ${Math.round(stats.carvedM3).toLocaleString()} m³ · deposited ${Math.round(stats.depositedM3).toLocaleString()} m³`);
console.log(`${rivers?.lakeCount ?? 0} lakes · ${Math.round(hf.wet.reduce((a, v) => a + (v > 0 ? 1 : 0), 0)).toLocaleString()} wet cells`
  + ` · done in ${secs.toFixed(2)} s`);

/* ------------------------------------------------------------------ */

function clamp255(v) { return v < 0 ? 0 : v > 255 ? 255 : v | 0; }

function resolveOut(v) {
  if (!v || v === true) return 'terrain';
  return v;
}

/** Shaded-relief mock-up so the bake can be eyeballed without an engine. */
function renderPreview(r, p) {
  const { hf: f, channels: ch, splats: sp } = r;
  const { nx, nz } = f;
  const W = nx, H = nz;
  const img = new Uint8Array(W * H * 3);
  const az = (p.sunAzimuth ?? 135) * Math.PI / 180;
  const lx = Math.cos(az) * 0.7, lz = Math.sin(az) * 0.7, ly = 0.68;
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const k = j * nx + i;
      const dx = (f.sampleGrid(f.h, i + 1, j) - f.sampleGrid(f.h, i - 1, j)) / (2 * f.cellX);
      const dz = (f.sampleGrid(f.h, i, j + 1) - f.sampleGrid(f.h, i, j - 1)) / (2 * f.cellZ);
      const L = Math.hypot(dx, 1, dz);
      let lam = Math.max(0, -dx / L * lx + ly / L + -dz / L * lz);
      lam = 0.22 + 0.9 * lam;
      const c = k * 3, o = k * 3;
      const wet = f.wet[k] > 0 || (f.lake[k] > 0 && f.h[k] < f.lake[k]);
      let rr = sp.colors[c] * lam * 320, gg = sp.colors[c + 1] * lam * 320, bb = sp.colors[c + 2] * lam * 320;
      if (wet) { rr = 34 * lam; gg = 78 * lam; bb = 116 * lam; }
      // gentle fog with height so the silhouette reads
      const fog = 0.10 * Math.max(0, 1 - (ch.height[k] ?? 0) * 0.35);
      img[o] = clamp255(rr + fog * 70);
      img[o + 1] = clamp255(gg + fog * 80);
      img[o + 2] = clamp255(bb + fog * 95);
    }
  }
  return encodePNG(W, H, img, 3);
}

function describeStats(s, rivers2 = null) {
  return {
    min: round(s.min), max: round(s.max), mean: round(s.mean), relief: round(s.max - s.min),
    meanSlope: round(s.meanSlope, 3), carvedM3: Math.round(s.carvedM3), depositedM3: Math.round(s.depositedM3),
    lakes: rivers2?.lakeCount ?? 0,
  };
}

/** Parameters without the runtime-only helpers (keep the file JSON-clean). */
function stripRuntime(p) {
  const out = {};
  for (const [k, v] of Object.entries(p)) {
    if (typeof v === 'function') continue;
    out[k] = v && typeof v === 'object' && !Array.isArray(v) ? stripRuntime(v) : v;
  }
  return out;
}

function round(v, d = 2) {
  const m = 10 ** d;
  return Math.round(v * m) / m;
}

function numeric(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : v;
}

function die(msg) {
  console.error(`error: ${msg}`);
  process.exit(1);
}

function parseArgs(list) {
  const o = {};
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = list[i + 1];
    if (next && !next.startsWith('--')) { o[key] = next; i++; }
    else o[key] = true;
  }
  return o;
}

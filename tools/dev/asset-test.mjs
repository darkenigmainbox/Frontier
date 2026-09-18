/* ============================================================
 * Headless smoke test for everything that leaves the generator:
 * the mesh assembler, the exporters and the texture baker.
 *
 * Nothing here renders, so it runs in plain node — it checks the
 * artefacts are *structurally* correct (magic bytes, counts, parseable
 * OBJ, matching .frontier round-trip) and writes them to /tmp so they
 * can be inspected with an external viewer.
 *
 *   node tools/dev/asset-test.mjs [--out /tmp/frontier-assets]
 * ============================================================ */

import { mkdirSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { buildBase } from '../../src/gen/pipeline.js';
import { defaultParams, mergeParams } from '../../src/gen/params.js';
import { erodeFluvial } from '../../src/gen/erosion-fluvial.js';
import { erodeParticles } from '../../src/gen/erosion-particles.js';
import { rasterizeSurface } from '../../src/gen/base-terrain.js';
import { hydrology } from '../../src/gen/flow.js';
import { computeChannels, computeSplatWeights, MATERIAL_PRESETS, CHANNEL_NAMES } from '../../src/gen/materials.js';
import { meshVolume, splitByChunk, triangleCount, meshBounds } from '../../src/gen/mesh-assemble.js';
import {
  encodeSdfVolume, decodeSdfVolume, encodeOBJ, encodeMTL, encodeSTL,
  encodeHeightPNG, encodeChannelPNG, encodeSplatPNG, encodeRecipe,
} from '../../src/io/exporters.js';
import { bakeLayer, bakeAllLayers, packAtlas, LAYER_DEFS, LAYER_ORDER } from '../../src/gen/textures.js';
import { encodePNG } from '../../src/io/png-lite.js';

const outDir = (() => {
  const i = process.argv.indexOf('--out');
  return i >= 0 ? process.argv[i + 1] : '/tmp/frontier-assets';
})();
mkdirSync(outDir, { recursive: true });

let failures = 0;
const check = (label, ok, detail = '') => {
  if (!ok) failures++;
  console.log(`${ok ? ' ok ' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
};

/* ------------------------------------------------------------------ */
/* 1. build a small eroded terrain                                     */
/* ------------------------------------------------------------------ */
const p = mergeParams(defaultParams, { resolution: 'draft', erosion: { particleCount: 4000 } });
const t0 = Date.now();
const built = buildBase(p);
const hf = built.hf;
const vol = built.volume;
hf.h0.set(hf.h);
await erodeFluvial(hf, { ...p.erosion, iterations: 40 }, { seaLevel: p.seaLevel, seed: 11 });
await erodeParticles(hf, p.erosion, { seed: 11, seaLevel: p.seaLevel, floorY: -4 });
rasterizeSurface(vol, hf, { band: 8 });
const analysis = hydrology(hf, { seaLevel: p.seaLevel, seed: 11 });
console.log('materials: presets', Object.keys(MATERIAL_PRESETS).join('|'), 'channels', CHANNEL_NAMES.join('|'));
const channels = computeChannels(hf, { seaLevel: p.seaLevel });
const splats = computeSplatWeights(channels, { preset: p.materialPreset ?? 'alpine', snowLine: p.snowLine ?? 0.7, seaLevelNorm: 0 });
console.log(`built + eroded in ${Date.now() - t0} ms (${vol.nx}×${vol.ny}×${vol.nz}, ${vol.chunkCount} chunks)`);

/* ------------------------------------------------------------------ */
/* 2. mesh                                                             */
/* ------------------------------------------------------------------ */
const tMesh = Date.now();
const mesh = meshVolume(vol, { hf, channels });
console.log(`mesh: ${mesh.vertexCount} verts / ${triangleCount(mesh)} tris in ${Date.now() - tMesh} ms`);
check('mesh has geometry', mesh.vertexCount > 500 && triangleCount(mesh) > 500,
  `${mesh.vertexCount} verts, ${triangleCount(mesh)} tris`);
check('mesh has no NaN', !mesh.positions.some((v) => !Number.isFinite(v)),
  'positions finite');
check('mesh attributes are normalised', (() => {
  for (let i = 0; i < mesh.attrs.length; i++) {
    const a = mesh.attrs[i];
    if (!Number.isFinite(a) || a < -0.001 || a > 1.001) return false;
  }
  return true;
})(), 'attr range 0..1');
const bounds = meshBounds(mesh);
check('mesh bounds match the volume', bounds.min[0] >= vol.min[0] - 0.5 && bounds.max[0] <= vol.max[0] + 0.5,
  `x ${bounds.min[0].toFixed(2)}..${bounds.max[0].toFixed(2)}`);

/* ------------------------------------------------------------------ */
/* 3. exporters                                                        */
/* ------------------------------------------------------------------ */
const volumeBytes = encodeSdfVolume(vol, { params: p, iterations: p.erosion.iterations });
writeFileSync(join(outDir, 'terrain.frontier'), volumeBytes);
const back = decodeSdfVolume(volumeBytes);
check('.frontier magic + header round-trips',
  back.header.format === 'frontier-sdf' && back.nx === vol.nx && back.ny === vol.ny && back.nz === vol.nz,
  `${volumeBytes.byteLength} bytes`);
let maxDiff = 0;
for (let i = 0; i < vol.length; i++) maxDiff = Math.max(maxDiff, Math.abs(back.floats[i * 4] - vol.data[i]));
check('.frontier distance channel is bit-exact', maxDiff === 0, `max diff ${maxDiff}`);
check('.frontier header carries the recipe', !!back.header.settings && back.header.settings.seed === p.seed);

const chunks = splitByChunk(vol, mesh, hf, splats);
const objBytes = encodeOBJ(chunks, { name: 'frontier' });
writeFileSync(join(outDir, 'terrain.obj'), objBytes);
const mtlBytes = encodeMTL('frontier');
writeFileSync(join(outDir, 'terrain.mtl'), mtlBytes);
const obj = new TextDecoder().decode(objBytes);
const mtl = new TextDecoder().decode(mtlBytes);
check('MTL declares 5 layers', (mtl.match(/^newmtl /gm) || []).length === 5);
const vLines = (obj.match(/^v /gm) || []).length;
const fLines = (obj.match(/^f /gm) || []).length;
const mtlLines = (obj.match(/^usemtl /gm) || []).length;
check('OBJ vertex/face counts agree with the mesh',
  vLines >= mesh.vertexCount * 0.95 && fLines === triangleCount(mesh),
  `${vLines} v, ${fLines} f, ${mtlLines} usemtl, ${chunks.length} groups`);
check('OBJ faces reference valid vertices', (() => {
  const re = /^f (\d+)\/(\d+)\/(\d+) (\d+)\/(\d+)\/(\d+) (\d+)\/(\d+)\/(\d+)$/gm;
  let m, n = 0;
  while ((m = re.exec(obj))) {
    n++;
    for (const g of [1, 4, 7]) if (+m[g] < 1 || +m[g] > vLines) return false;
  }
  return n === triangleCount(mesh);
})(), 'all indices in range');

const stl = encodeSTL(chunks, { name: 'frontier' });
writeFileSync(join(outDir, 'terrain.stl'), stl);
const dv = new DataView(stl.buffer, stl.byteOffset, stl.byteLength);
const stlTris = dv.getUint32(80, true);
check('binary STL triangle count and length',
  stlTris === triangleCount(mesh) && stl.byteLength === 84 + stlTris * 50,
  `${stlTris} tris, ${stl.byteLength} bytes`);

const heightPNG = encodeHeightPNG(hf);
writeFileSync(join(outDir, 'heightmap16.png'), heightPNG);
check('16-bit heightmap PNG header', (() => {
  const dv2 = new DataView(heightPNG.buffer, heightPNG.byteOffset, heightPNG.byteLength);
  return dv2.getUint32(0, false) === 0x89504e47 && heightPNG[24] === 16 && heightPNG[25] === 0;
})(), `${(heightPNG.byteLength / 1024).toFixed(0)} KiB, ${hf.nx}×${hf.nz}`);

writeFileSync(join(outDir, 'splat0.png'), encodeSplatPNG(splats, hf.nx, hf.nz));
writeFileSync(join(outDir, 'slope.png'), encodeChannelPNG(hf.slope, hf.nx, hf.nz));
writeFileSync(join(outDir, 'flow.png'), encodeChannelPNG(hf.flow, hf.nx, hf.nz));
writeFileSync(join(outDir, 'erosion.png'), encodeChannelPNG(hf.erosion, hf.nx, hf.nz));
writeFileSync(join(outDir, 'recipe.json'), encodeRecipe(p, { vertices: mesh.vertexCount }));
writeFileSync(join(outDir, 'water.json'), JSON.stringify({ lakeCount: analysis.lakeCount }, null, 1));

/* ------------------------------------------------------------------ */
/* 4. textures                                                         */
/* ------------------------------------------------------------------ */
const TEX = 128;
const tTex = Date.now();
let firstLayer = null;
for (const name of LAYER_ORDER) {
  const layer = bakeLayer(name, TEX, 3);
  if (!firstLayer) firstLayer = layer;
  const shapes = layer.albedo.length === TEX * TEX * 3 &&
    layer.normal.length === TEX * TEX * 4 && layer.rough.length === TEX * TEX;
  let minA = 255, maxA = 0, sumB = 0, nB = 0;
  for (let i = 0; i < layer.albedo.length; i += 3) {
    if (layer.albedo[i] < minA) minA = layer.albedo[i];
    if (layer.albedo[i] > maxA) maxA = layer.albedo[i];
  }
  for (let i = 0; i < layer.normal.length; i += 4) { sumB += layer.normal[i + 2]; nB++; }
  const blue = sumB / nB;
  check(`texture "${name}": albedo varies, normals point outward`,
    shapes && maxA - minA > 6 && blue > 128 && blue < 255,
    `${TEX}², albedo ${minA}..${maxA}, normal.b ${blue.toFixed(0)}, ${layer.rough.length} rough px`);
}
console.log(`textures baked in ${Date.now() - tTex} ms`);
writeFileSync(join(outDir, 'tex-grass.png'), encodePNG(TEX, TEX, firstLayer.albedo, 3));
writeFileSync(join(outDir, 'tex-rock-normal.png'), encodePNG(TEX, TEX, firstLayer.normal, 4));
{
  const atlas = packAtlas(bakeAllLayers(64, 5, ['grass', 'rock']), ['grass', 'rock']);
  check('atlas packs the layers into one stack', atlas.height === 128 && atlas.albedo.length === 64 * 64 * 2 * 3,
    `${atlas.width}×${atlas.height}`);
}

/* ------------------------------------------------------------------ */
console.log(failures === 0 ? '\nall asset checks passed' : `\n${failures} asset check(s) FAILED`);
process.exit(failures === 0 ? 0 : 1);

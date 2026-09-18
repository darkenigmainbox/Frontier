import assert from 'node:assert';
import { buildMountain } from '../js/mountain.js';
import {
  passFluvial, passParticles, passDebris, passMicro, passStrata,
  passHydraulic, passRivers, passBraid, passDiffuse, runErosion,
  EROSION_PASSES, EROSION_PASS_ORDER
} from '../js/erosion.js';
import { particleErode, sampleFieldWithGrad } from '../js/particle-erosion.js';
import {
  SCULPT_TOOLS, applySculptDab, applySculptStroke, calcBrushWeight
} from '../js/sculpt.js';
import {
  exportFrontierBinary, exportObjMesh, exportHeightmapRaw16
} from '../js/export.js';

console.log('=== RUNNING UNIFIED SDF TERRAIN ENGINE TEST SUITE ===\n');

// ----------------------------------------------------
// TEST 1: Base Mountain SDF Generation
// ----------------------------------------------------
console.log('Test 1: Base Mountain Generation...');
const N = 64;
const worldSize = 100;
const voxel = worldSize / (N - 1);
const mountain = buildMountain({
  N, worldSize, seed: 1337, frequency: 2.4, octaves: 5, gain: 0.48, ridge: 0.38,
  peakHeight: 50, peakRadius: 28, peakSharp: 1.5, warp: 0.55, tilt: 0.42, seaLevel: -7,
  strata: 0.25
});

assert.strictEqual(mountain.h.length, N * N, 'Heightfield size should match N*N');
assert(mountain.minH < 0, 'Min elevation should be below sea level (sea shelf)');
assert(mountain.maxH > 25, 'Max elevation should reach mountain summit');
assert(!mountain.h.some(isNaN), 'No NaNs allowed in base mountain');
assert(!mountain.h.some(v => !isFinite(v)), 'All elevations must be finite');
console.log(`  ✓ Mountain generated cleanly: min=${mountain.minH.toFixed(2)}m, max=${mountain.maxH.toFixed(2)}m`);

// ----------------------------------------------------
// TEST 2: Interactive 3D SDF Sculpting Engine
// ----------------------------------------------------
console.log('Test 2: Interactive SDF Sculpting Engine...');
const sculptH = mountain.h.slice();
const centerIdx = ((N / 2) | 0) * N + ((N / 2) | 0);
const preH = sculptH[centerIdx];

// Tool: Ridge (raise)
const ridgeCount = applySculptDab({
  h: sculptH, N, voxel, cx: 0, cz: 0, tool: 'ridge', radius: 8, strength: 0.5
});
assert(ridgeCount > 0, 'Ridge dab should modify vertices');
assert(sculptH[centerIdx] > preH, 'Ridge dab should raise elevation');
console.log(`  ✓ Ridge tool raised elevation by ${(sculptH[centerIdx] - preH).toFixed(2)}m (${ridgeCount} verts)`);

// Tool: Dent (carve with bedrock cushion)
const hBeforeDent = sculptH[centerIdx];
const dentCount = applySculptDab({
  h: sculptH, N, voxel, cx: 0, cz: 0, tool: 'dent', radius: 8, strength: 0.8
});
assert(dentCount > 0, 'Dent dab should modify vertices');
assert(sculptH[centerIdx] < hBeforeDent, 'Dent dab should carve elevation');
assert(sculptH[centerIdx] >= -40, 'Dent must respect bedrock floor cushion');
console.log(`  ✓ Dent tool carved elevation by ${(hBeforeDent - sculptH[centerIdx]).toFixed(2)}m without punching holes`);

// Tool: Flatten (mesa/plateau)
const targetPlateauH = 15.0;
applySculptDab({
  h: sculptH, N, voxel, cx: 10, cz: 10, tool: 'flatten', radius: 10, strength: 0.9, targetH: targetPlateauH
});
const platIdx = Math.floor(10 / voxel + (N - 1) / 2) * N + Math.floor(10 / voxel + (N - 1) / 2);
assert(Math.abs(sculptH[platIdx] - targetPlateauH) < Math.abs(mountain.h[platIdx] - targetPlateauH), 'Flatten should pull towards target height');
console.log(`  ✓ Flatten tool drove plateau towards ${targetPlateauH}m`);

// Tool: Stroke interpolation
const strokeMod = applySculptStroke({
  h: sculptH, N, voxel,
  p0: { x: -15, z: -15 }, p1: { x: 15, z: -15 },
  tool: 'ridge', radius: 5, strength: 0.4
});
assert(strokeMod > 100, 'Stroke interpolation should modify continuous path');
console.log(`  ✓ Stroke interpolation applied ${strokeMod} vertex updates along path`);

// ----------------------------------------------------
// TEST 3: Particle Droplet Hydraulic Erosion & Anti-Tunneling
// ----------------------------------------------------
console.log('Test 3: Particle Droplet Erosion & Anti-Tunneling Verification...');
const testH = mountain.h.slice();
const baseH = mountain.h.slice();
const maps = {
  erosionMap: new Float32Array(N * N),
  depositMap: new Float32Array(N * N),
  pointsMap: new Float32Array(N * N),
  channelsMap: new Float32Array(N * N),
};

// Run heavy particle stress test (30,000 particles)
const pRes = await particleErode({
  h: testH, baseH, N, voxel, seed: 99,
  particles: 30000,
  maxSteps: 48,
  antiTunneling: true,
  talusRelax: true,
  maps,
});

assert(pRes.carvedM3 > 0, 'Particles must carve rock');
assert(pRes.depositedM3 > 0, 'Particles must deposit sediment');
assert(!testH.some(isNaN), 'No NaNs allowed in particle erosion');

// Anti-Tunneling Verification: ensure no infinite holes or runaway vertical borehole drilling
let minAfterParticles = Infinity;
for (let v of testH) if (v < minAfterParticles) minAfterParticles = v;

// The base minimum was around -10.17m. Particles should NOT have drilled deep holes (e.g. -50m or -100m)
assert(minAfterParticles >= mountain.minH - 3.0, `Anti-tunneling check failed: min elevation dropped to ${minAfterParticles}`);
console.log(`  ✓ Anti-tunneling verified: 30,000 droplets carved ${pRes.carvedM3.toFixed(0)}m³, deposited ${pRes.depositedM3.toFixed(0)}m³`);
console.log(`  ✓ Min elevation remained bounded at ${minAfterParticles.toFixed(2)}m (base min was ${mountain.minH.toFixed(2)}m)`);

// ----------------------------------------------------
// TEST 4: Full Multi-Pass Erosion Pipeline
// ----------------------------------------------------
console.log('Test 4: Full Multi-Pass Erosion Pipeline (Fluvial, Particles, Debris, Micro, Strata)...');
const pipelineH = mountain.h.slice();
const pipeRes = await runErosion({
  h: pipelineH,
  baseH: mountain.h.slice(),
  N, voxel, seed: 42,
  iterations: 16, cutFraction: 0.18, erodibility: 0.55, diffusion: 0.04,
  mExp: 0.45, nExp: 1.2, sedimentOn: true, seaLevel: -7, valley: mountain.valley,
  stack: ['fluvial', 'particles', 'debris', 'micro', 'strata']
});

assert(pipeRes.stats.carvedM3 > 0, 'Pipeline must carve rock');
assert(pipeRes.stats.depositedM3 > 0, 'Pipeline must deposit sediment');
assert(pipeRes.water.length === N * N, 'Water map generated');
assert(!pipelineH.some(isNaN), 'No NaNs in pipeline output');
console.log(`  ✓ Full pipeline executed 5 passes in sequence:`);
console.log(`    Total carved: ${pipeRes.stats.carvedM3.toFixed(0)} m³, deposited: ${pipeRes.stats.depositedM3.toFixed(0)} m³`);

// ----------------------------------------------------
// TEST 5: Game Engine Exporters
// ----------------------------------------------------
console.log('Test 5: Game Engine Exporters (.frontier binary, OBJ mesh, 16-bit raw)...');

// .frontier binary test
const frontierBlob = exportFrontierBinary({
  h: pipelineH, N, voxel, worldSize, seaLevel: -7,
  minH: mountain.minH, maxH: mountain.maxH, nz: 32
});

const arrayBuf = await frontierBlob.arrayBuffer();
const dataView = new DataView(arrayBuf);
const magic = dataView.getUint32(0, true);
assert.strictEqual(magic, 0x46534446, '.frontier file magic must be 0x46534446 ("FSDF")');

const headerLen = dataView.getUint32(4, true);
assert(headerLen > 0, 'Header length must be > 0');
const headerText = new TextDecoder().decode(new Uint8Array(arrayBuf, 8, headerLen));
const header = JSON.parse(headerText);
assert.strictEqual(header.version, 2, '.frontier version must be 2');
assert.strictEqual(header.dimensions[0], N, 'Dimension X matches');
assert.strictEqual(header.dimensions[1], 32, 'Dimension Y matches nz');
assert.strictEqual(header.dimensions[2], N, 'Dimension Z matches');
console.log(`  ✓ .frontier binary valid: magic=0x46534446, version=${header.version}, size=${arrayBuf.byteLength} bytes`);

// OBJ mesh test
const objBlob = exportObjMesh({ h: pipelineH, N, voxel, worldSize, step: 2 });
const objText = await objBlob.text();
assert(objText.startsWith('# Frontier SDF Terrain Lab OBJ Export'), 'OBJ header comment present');
assert(objText.includes('v '), 'OBJ vertices present');
assert(objText.includes('vt '), 'OBJ UVs present');
assert(objText.includes('f '), 'OBJ faces present');
console.log(`  ✓ OBJ 3D mesh exported: ${objText.split('\n').length} lines`);

// 16-bit raw heightmap test
const rawBlob = exportHeightmapRaw16({ h: pipelineH, N, minH: mountain.minH, maxH: mountain.maxH });
assert.strictEqual(rawBlob.size, N * N * 2, 'Raw 16-bit heightmap byte size must match N*N*2');
console.log(`  ✓ 16-bit raw heightmap exported: ${rawBlob.size} bytes`);

console.log('\n====================================================');
console.log(' ALL 5 TESTS PASSED SUCCESSFULLY! ZERO ERRORS!');
console.log('====================================================');

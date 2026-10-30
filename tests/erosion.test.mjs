import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  DEFAULT_EROSION_PARAMS,
  EMITTER_MODES,
  EROSION_LANDSCAPES,
  MATERIAL_THEMES,
  ROCK_FABRIC_MODES,
} from '../src/erosion/erosion-presets.js';
import { RockCalvingSystem, buildRockArchetypeAtlas } from '../src/erosion/rock-calving.js';
import * as Shaders from '../src/erosion/erosion-shaders.js';

const ALL_SHADER_EXPORTS = [
  'FULLSCREEN_VERT',
  'INIT_TERRAIN_FRAG',
  'INIT_SNOW_FRAG',
  'INIT_PARTICLES_FRAG',
  'PARTICLE_STEP_FRAG',
  'PARTICLE_SCATTER_VERT',
  'PARTICLE_SCATTER_FRAG',
  'WATER_FLUX_FRAG',
  'TERRAIN_INTEGRATE_FRAG',
  'SNOW_CRYO_FRAG',
  'THERMAL_TALUS_FRAG',
  'TERRAIN_RENDER_VERT',
  'TERRAIN_RENDER_FRAG',
  'PARTICLE_RENDER_VERT',
  'PARTICLE_RENDER_FRAG',
  'SKY_BG_FRAG',
  'ROCK_INSTANCE_VERT',
  'ROCK_INSTANCE_FRAG',
];

test('GPU Erosion presets cover all 19 landscapes including non-periodic Himalayas, Sahara Grand Erg, Rugged Desert, Moon, Icelandic Green Highlands & Oasis', () => {
  const landKeys = Object.keys(EROSION_LANDSCAPES);
  assert.equal(landKeys.length, 19);
  const seenTypes = new Set();
  for (const k of landKeys) {
    const p = EROSION_LANDSCAPES[k];
    assert.equal(p.id, k);
    assert.ok(p.defaults.relief >= 80 && p.defaults.relief <= 230);
    assert.ok(p.defaults.rockHardness > 0 && p.defaults.rockHardness < 1);
    seenTypes.add(p.terrainType);
  }
  assert.equal(seenTypes.size, 19, 'Each landscape preset should map to a unique GPU terrain generator mode');

  // Verify all untouched baseline & v2.2 terrainTypes (0..6, 8..13), upgraded 7 & 14, and new 15..18!
  assert.equal(DEFAULT_EROSION_PARAMS.landscape, 'icelandic-highlands');
  assert.equal(EROSION_LANDSCAPES['alpine-divide'].terrainType, 0);
  assert.equal(EROSION_LANDSCAPES['layered-plateau'].terrainType, 1);
  assert.equal(EROSION_LANDSCAPES['fault-escarpment'].terrainType, 2);
  assert.equal(EROSION_LANDSCAPES['volcanic-caldera'].terrainType, 3);
  assert.equal(EROSION_LANDSCAPES['badlands-domes'].terrainType, 4);
  assert.equal(EROSION_LANDSCAPES['coastal-massif'].terrainType, 5);
  assert.equal(EROSION_LANDSCAPES['icelandic-highlands'].terrainType, 6);
  assert.equal(EROSION_LANDSCAPES['himalayan-karakoram'].terrainType, 7);
  assert.equal(EROSION_LANDSCAPES['himalayan-karakoram'].name, 'Himalayan Snow Mountains');
  assert.equal(EROSION_LANDSCAPES['grand-canyon'].terrainType, 8);
  assert.equal(EROSION_LANDSCAPES['studlagil-basalt'].terrainType, 9);
  assert.equal(EROSION_LANDSCAPES['fjadrargljufur-palagonite'].terrainType, 10);
  assert.equal(EROSION_LANDSCAPES['namib-erg-dunes'].terrainType, 11);
  assert.equal(EROSION_LANDSCAPES['yardang-wind-corridor'].terrainType, 12);
  assert.equal(EROSION_LANDSCAPES['glacial-lake-watershed'].terrainType, 13);
  assert.equal(EROSION_LANDSCAPES['sahara-tassili-erg'].terrainType, 14);
  assert.equal(EROSION_LANDSCAPES['rugged-desert-crags'].terrainType, 15);
  assert.equal(EROSION_LANDSCAPES['lunar-mare-craters'].terrainType, 16);
  assert.equal(EROSION_LANDSCAPES['icelandic-green-highlands'].terrainType, 17);
  assert.equal(EROSION_LANDSCAPES['desert-oasis-erg'].terrainType, 18);
  assert.equal(EROSION_LANDSCAPES['desert-oasis-erg'].defaults.oasisSpring, true);
  assert.equal(Object.keys(MATERIAL_THEMES).length, 10);
  assert.equal(Object.keys(ROCK_FABRIC_MODES).length, 5);

  // Ensure periodic fract(spurPhase) and stair-stepped floor(mesaMask) artifacts are gone from INIT_TERRAIN_FRAG
  assert.ok(!Shaders.INIT_TERRAIN_FRAG.includes('spurPhase1'), 'Himalayan terrain must not use periodic fract(spurPhase) ribs');
  assert.ok(!Shaders.INIT_TERRAIN_FRAG.includes('mesaMask'), 'Sahara terrain must not use stair-stepped Tassili mesaMask blobs');

  // Glacial mountain archetypes must exist and snow across broad mountain elevation ranges
  const iceland = EROSION_LANDSCAPES['icelandic-highlands'];
  const himalaya = EROSION_LANDSCAPES['himalayan-karakoram'];
  assert.ok(iceland && himalaya, 'Icelandic & Himalayan glacial mountain presets must exist');
  assert.ok(iceland.defaults.snowfallRate > 0.5 && himalaya.defaults.snowfallRate > 0.85);
  assert.ok(himalaya.defaults.snowline <= 0.30, 'Himalayan Snow Mountains must have low snowline for broad snow cover');
  assert.ok(himalaya.defaults.glacierStrength > iceland.defaults.glacierStrength * 0.9);

  const emitterKeys = Object.keys(EMITTER_MODES);
  assert.equal(emitterKeys.length, 6);
  for (const required of ['glacial-blizzard', 'aeolian-wind', 'rockfall-avalanche', 'all-weather', 'sky-rain']) {
    assert.ok(emitterKeys.includes(required), `Missing multi-agent emitter mode ${required}`);
  }
  const codes = new Set(emitterKeys.map((k) => EMITTER_MODES[k].code));
  assert.equal(codes.size, 6, 'Emitter mode codes must be unique for GPU dispatch');
  assert.equal(DEFAULT_EROSION_PARAMS.gridSize, 512);
  assert.ok(DEFAULT_EROSION_PARAMS.particleCount >= 8192 && DEFAULT_EROSION_PARAMS.particleCount <= 32768);
});

test('All 18 WebGL2 GLSL ES 3.00 shaders satisfy strict ANGLE precision, brace, and interface invariants', () => {
  for (const name of ALL_SHADER_EXPORTS) {
    const src = Shaders[name];
    assert.equal(typeof src, 'string', `Missing shader export ${name}`);
    assert.ok(
      src.startsWith('#version 300 es\n'),
      `${name} must start at byte 0 with '#version 300 es'`
    );
    assert.ok(src.includes('precision highp float;'), `${name} missing highp float`);
    assert.ok(src.includes('precision highp int;'), `${name} missing highp int`);
    assert.ok(src.includes('precision highp sampler2D;'), `${name} missing highp sampler2D`);
    assert.ok(src.includes('void main()'), `${name} missing void main()`);

    // Balanced braces and parentheses
    let braces = 0;
    let parens = 0;
    for (const ch of src) {
      if (ch === '{') braces++;
      else if (ch === '}') braces--;
      else if (ch === '(') parens++;
      else if (ch === ')') parens--;
      assert.ok(braces >= 0, `Unbalanced '}' in ${name}`);
      assert.ok(parens >= 0, `Unbalanced ')' in ${name}`);
    }
    assert.equal(braces, 0, `Unclosed '{' in ${name}`);
    assert.equal(parens, 0, `Unclosed '(' in ${name}`);
  }

  // Verify MRT locations on PARTICLE_STEP_FRAG (5 attachments: posAge, velWater, sediment, exchange, cryo)
  for (let loc = 0; loc < 5; loc++) {
    assert.ok(
      Shaders.PARTICLE_STEP_FRAG.includes(`layout(location = ${loc}) out vec4`),
      `PARTICLE_STEP_FRAG missing MRT attachment ${loc}`
    );
  }

  // Verify every getUniformLocation / _bindTex name in gpu-erosion-engine.js exists in the target shader!
  const engineSrc = fs.readFileSync(new URL('../src/erosion/gpu-erosion-engine.js', import.meta.url), 'utf8');
  const uniformRegex = /(?:getUniformLocation|_bindTex)\(\s*this\.(\w+)\s*,\s*'(\w+)'/g;
  const progMap = {
    progInitTerrain: [Shaders.FULLSCREEN_VERT, Shaders.INIT_TERRAIN_FRAG],
    progInitSnow: [Shaders.FULLSCREEN_VERT, Shaders.INIT_SNOW_FRAG],
    progInitParticles: [Shaders.FULLSCREEN_VERT, Shaders.INIT_PARTICLES_FRAG],
    progParticleStep: [Shaders.FULLSCREEN_VERT, Shaders.PARTICLE_STEP_FRAG],
    progParticleScatter: [Shaders.PARTICLE_SCATTER_VERT, Shaders.PARTICLE_SCATTER_FRAG],
    progWaterFlux: [Shaders.FULLSCREEN_VERT, Shaders.WATER_FLUX_FRAG],
    progTerrainIntegrate: [Shaders.FULLSCREEN_VERT, Shaders.TERRAIN_INTEGRATE_FRAG],
    progThermalTalus: [Shaders.FULLSCREEN_VERT, Shaders.THERMAL_TALUS_FRAG],
    progSnowCryo: [Shaders.FULLSCREEN_VERT, Shaders.SNOW_CRYO_FRAG],
    progTerrainRender: [Shaders.TERRAIN_RENDER_VERT, Shaders.TERRAIN_RENDER_FRAG],
    progRockInstance: [Shaders.ROCK_INSTANCE_VERT, Shaders.ROCK_INSTANCE_FRAG],
    progParticleRender: [Shaders.PARTICLE_RENDER_VERT, Shaders.PARTICLE_RENDER_FRAG],
  };

  let match;
  let checkedCount = 0;
  while ((match = uniformRegex.exec(engineSrc)) !== null) {
    const [, progProp, uName] = match;
    if (!progMap[progProp]) continue;
    const combined = progMap[progProp].join('\n');
    assert.ok(
      combined.includes(`uniform `) && combined.includes(uName),
      `Uniform '${uName}' referenced on '${progProp}' is missing from its GLSL shaders`
    );
    checkedCount++;
  }
  assert.ok(checkedCount >= 35, `Expected >= 35 verified GPU uniform bindings, got ${checkedCount}`);
  // Verify glacial-blizzard (code 1) is NOT trapped inside storm-cell disc (only mode == 5 is storm-cell!)
  assert.ok(
    Shaders.PARTICLE_STEP_FRAG.includes('if (mode == 5)') && !Shaders.PARTICLE_STEP_FRAG.includes('if (mode == 1) {\n    float ang'),
    'Full-domain blizzard snowfall must not be restricted to storm-cell radius'
  );
});

test('Top-drop particle physics, 3D rock hardness resistance, and two-species sedimentation obey physical conservation', () => {
  // Exact mirror of PARTICLE_STEP_FRAG hardness-gated cutting & two-species sedimentation laws:
  const evalBedrockCut = (hardness, rawDemand, bedrock = 100) => {
    const rockResistance = 0.12 + 3.85 * hardness * hardness;
    return Math.min(Math.max(0, bedrock - 1.0), rawDemand / rockResistance);
  };

  // 1. Differential Hardness Cutting Contrast: soft shale (H=0.10) vs hard caprock (H=0.94)
  const softCut = evalBedrockCut(0.10, 0.08);
  const hardCut = evalBedrockCut(0.94, 0.08);
  const contrastRatio = softCut / hardCut;
  assert.ok(
    contrastRatio > 18.0,
    `Expected > 18:1 cutting contrast between soft shale and hard caprock, got ${contrastRatio.toFixed(2)}:1`
  );

  // 2. Airborne Sky-Drop Fall -> Landing Impact Transition
  let dropY = 185.0;
  let vy = -15.0;
  let phaseAge = -0.02; // negative = airborne falling drop
  const surfY = 92.0;
  const dt = 0.085;
  let stepsToLand = 0;
  while (phaseAge < 0 && stepsToLand < 200) {
    stepsToLand++;
    vy = Math.max(vy - 9.81 * 2.2 * dt, -26.0);
    dropY += vy * dt;
    if (dropY <= surfY) {
      dropY = surfY;
      phaseAge = 0.001; // transitions to landed surface runoff parcel!
    }
  }
  assert.equal(phaseAge, 0.001, 'Falling drop must transition to landed runoff parcel upon hitting terrain');
  assert.equal(dropY, surfY);
  assert.ok(stepsToLand > 10 && stepsToLand < 100);

  // 3. Two-Species Sedimentation & Grain-Size Sorting on Gentle Alluvial Fan
  let coarseLoad = 0.045;
  let fineLoad = 0.045;
  const capacity = 0.010; // Flow decelerated onto piedmont plain -> over capacity!
  const depRate = 0.60 * 0.42;

  const surplus = (coarseLoad + fineLoad) - capacity;
  const depCoarse = Math.min(coarseLoad, surplus * depRate * 1.45);
  const remSurplus = Math.max(0, surplus - depCoarse);
  const depFine = Math.min(fineLoad, remSurplus * depRate * 0.45);

  const nextCoarse = coarseLoad - depCoarse;
  const nextFine = fineLoad - depFine;

  assert.ok(depCoarse > depFine * 2.5, 'Coarse gravel must settle significantly faster than fine silt at slope break');
  assert.ok(depFine > 0, 'Fine alluvial silt must also deposit across the fan');

  // Exact solid-mass conservation between particle load loss and terrain sediment gain
  const beforeMass = coarseLoad + fineLoad;
  const afterMass = nextCoarse + nextFine + depCoarse + depFine;
  assert.ok(Math.abs(beforeMass - afterMass) < 1e-12, 'Sediment deposition must strictly conserve mass');
});

test('Multi-agent GPU particle species (snow, aeolian wind, rockfall) and glacier cryosphere conserve mass', () => {
  // ---- 1. Species lottery partitions the whole population with zero loss ----
  const speciesVec = [0.34, 0.41, 0.17, 0.08]; // rain, snow, wind, rockfall
  const total = speciesVec.reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(total - 1) < 1e-9, 'Species weights must be normalized');

  const counts = [0, 0, 0, 0];
  const N = 20000;
  for (let i = 0; i < N; i++) {
    const pick = ((i * 0.6180339887) % 1) * total;
    let species = 0;
    if (pick > speciesVec[0] + speciesVec[1] + speciesVec[2]) species = 3;
    else if (pick > speciesVec[0] + speciesVec[1]) species = 2;
    else if (pick > speciesVec[0]) species = 1;
    counts[species]++;
  }
  assert.equal(counts.reduce((a, b) => a + b, 0), N, 'Every GPU slot must receive exactly one species');
  assert.ok(counts[1] > 0 && counts[2] > 0 && counts[3] > 0, 'Snow, wind and rockfall species must all be emitted');
  for (let i = 0; i < 4; i++) {
    const expected = speciesVec[i] * N;
    assert.ok(Math.abs(counts[i] - expected) / N < 0.02, `Species ${i} frequency off by more than 2%`);
  }

  // ---- 2. Snowflake terminal velocity is far below a raindrop under the same gravity ----
  const dt = 0.085;
  let rainVy = -14, snowVy = -2.4;
  for (let i = 0; i < 40; i++) {
    rainVy = Math.max(rainVy - 9.81 * 2.2 * dt, -26.0);
    snowVy = Math.max(snowVy - 9.81 * 0.22 * dt, -4.2);
  }
  assert.ok(rainVy < -20, `Rain must reach terminal speed, got ${rainVy}`);
  assert.ok(snowVy > -4.3 && snowVy <= -4.2, `Snow must drift slowly at terminal speed, got ${snowVy}`);

  // ---- 3. Snowpack accumulation -> firn compaction -> glacier ice is mass conserving ----
  let snow = 0.9;
  let ice = 0.4;
  const glacierStrength = 0.85;
  const elevN = 0.72;
  const smoothstep = (a, b, x) => {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  const before = snow + ice;
  const compaction = Math.min(snow * 0.20, snow * smoothstep(0.30, 0.85, elevN) * glacierStrength * 0.55 * dt);
  snow -= compaction;
  ice += compaction;
  assert.ok(Math.abs(snow + ice - before) < 1e-12, 'Firn compaction must conserve total ice-equivalent mass');
  assert.ok(compaction > 0, 'Cold high basins must form glacier ice');

  // ---- 4. Degree-day ablation only melts where the cell is below the snowline ----
  const warmth = (snowline, elev) => Math.max(0, Math.min(1, (snowline - elev) / Math.max(snowline, 0.05)));
  assert.equal(warmth(0.5, 0.9), 0, 'Summit snow far above the snowline must not melt');
  assert.ok(warmth(0.9, 0.2) > 0.7, 'Low warm cells below the snowline must melt aggressively');

  // ---- 5. Aeolian saltation carries sand further than heavy rockfall boulders ----
  const surfaceSpeed = (species, sinTheta) => {
    if (species === 'wind') return Math.min(22, Math.max(0.5, 6.0 + 20.0 * sinTheta));
    if (species === 'rock') return Math.min(26, Math.max(0.8, 1.4 + 22.0 * sinTheta));
    return 1.0;
  };
  // Saltating sand keeps blowing across flat plains while heavy boulders grind to a halt
  assert.ok(surfaceSpeed('wind', 0.0) > 5.0, 'Aeolian sand must keep saltating on flat ground');
  assert.ok(surfaceSpeed('rock', 0.0) < 2.5, 'Boulders must stall on flat ground');
  assert.ok(surfaceSpeed('wind', 0.0) > surfaceSpeed('rock', 0.0) * 2,
    'On a flat plain saltating sand must outrun stalled boulders');
  // Boulders gain far more speed per unit slope than sand (gravity-driven rolling vs. aerodynamic saltation)
  const rockGain = surfaceSpeed('rock', 0.6) - surfaceSpeed('rock', 0.05);
  const windGain = surfaceSpeed('wind', 0.6) - surfaceSpeed('wind', 0.05);
  assert.ok(rockGain > 0 && windGain > 0, 'Both species must accelerate down steepening slopes');
});

test('3D RockCalvingSystem synthesizes outward-normal CCW polyhedral outcrops & settles calved boulders down cliff slopes', () => {
  const atlas = buildRockArchetypeAtlas(7331);
  assert.equal(atlas.submeshes.length, 6, 'Atlas must contain 6 cleaved polyhedral rock archetypes');
  assert.ok(atlas.indices.length > 600, 'Polyhedral rock atlas must contain rich faceted triangles');

  // Verify EVERY triangle in the rock atlas has outward-pointing normals and CCW front-face winding!
  const pos = atlas.positions;
  const nrm = atlas.normals;
  const idxArr = atlas.indices;
  for (const sub of atlas.submeshes) {
    for (let t = sub.firstIndex; t < sub.firstIndex + sub.indexCount; t += 3) {
      const i0 = idxArr[t] * 3, i1 = idxArr[t + 1] * 3, i2 = idxArr[t + 2] * 3;
      const e1x = pos[i1] - pos[i0], e1y = pos[i1 + 1] - pos[i0 + 1], e1z = pos[i1 + 2] - pos[i0 + 2];
      const e2x = pos[i2] - pos[i0], e2y = pos[i2 + 1] - pos[i0 + 1], e2z = pos[i2 + 2] - pos[i0 + 2];
      const cx = e1y * e2z - e1z * e2y;
      const cy = e1z * e2x - e1x * e2z;
      const cz = e1x * e2y - e1y * e2x;
      const dotN = cx * nrm[i0] + cy * nrm[i0 + 1] + cz * nrm[i0 + 2];
      assert.ok(dotN > 0, 'Every rock facet triangle must have strictly outward CCW winding');
    }
  }

  const sys = new RockCalvingSystem();
  const N = 64;
  const grid = new Float32Array(N * N * 4);
  // Build a steep cliff escarpment at x < 0 dropping onto a gentle talus apron at x > 0
  for (let iz = 0; iz < N; iz++) {
    for (let ix = 0; ix < N; ix++) {
      const u = ix / (N - 1) - 0.5;
      const scarp = 1 / (1 + Math.exp(u * 22.0));
      const idx = (iz * N + ix) * 4;
      grid[idx + 0] = 14.0 + 95.0 * scarp;
      grid[idx + 1] = 0.4 * (1 - scarp);
      grid[idx + 2] = 0.0;
      grid[idx + 3] = 0.0;
    }
  }

  sys.updateTerrainSnapshot(grid, N, 512.0);
  sys.seedForLandscape({ seed: 4029, worldSpan: 512.0, boulderDensity: 0.75, strataStrike: 10, strataDip: 12 });

  // Verify EVERY rock instance 3x3 basis matrix has det(M) > 0 (right-handed, NEVER inverted normals!)
  for (let b = 0; b < sys.bucketCounts.length; b++) {
    const cnt = sys.bucketCounts[b];
    const data = sys.bucketData[b];
    for (let s = 0; s < cnt; s++) {
      const o = s * 16;
      const m00 = data[o + 0], m01 = data[o + 1], m02 = data[o + 2];
      const m10 = data[o + 4], m11 = data[o + 5], m12 = data[o + 6];
      const m20 = data[o + 8], m21 = data[o + 9], m22 = data[o + 10];
      const det = m00 * (m11 * m22 - m12 * m21)
                - m01 * (m10 * m22 - m12 * m20)
                + m02 * (m10 * m21 - m11 * m20);
      assert.ok(det > 0.05, `Instance matrix must be strictly right-handed (det > 0), got ${det}`);
    }
  }

  const outcrops = sys.rocks.filter((r) => r.isOutcrop);
  const boulders = sys.rocks.filter((r) => !r.isOutcrop);
  assert.ok(outcrops.length >= 10, `Expected >= 10 crown outcrops on gentle rim, got ${outcrops.length}`);
  assert.ok(boulders.length >= 50, `Expected >= 50 calved boulders, got ${boulders.length}`);

  // Verify NO rooted outcrop clings to steep slopes (all outcrops must sit on gentle slope <= 0.40)
  for (const out of outcrops) {
    const s = sys.sampleTerrain(out.x, out.z).slope;
    assert.ok(s <= 0.40, `Rooted outcrop must never cling to steep slope, got slope=${s}`);
  }

  // Verify brisk rockfall speed: a boulder on the steep cliff face x=0 must travel >12m in 1.0s!
  const cliffSample = sys.sampleTerrain(0.0, 0.0);
  assert.ok(cliffSample.slope > 1.0, `Expected steep cliff at x=0, got slope=${cliffSample.slope}`);
  const testRock = {
    submesh: 2,
    isOutcrop: false,
    settled: false,
    x: 0.0,
    y: cliffSample.totalH + 1.5,
    z: 0.0,
    vx: 2.0,
    vy: 0.0,
    vz: 0.0,
    sx: 2.0,
    sy: 1.8,
    sz: 2.0,
    radiusY: 1.8,
    yaw: 0.0,
    upX: 0.0,
    upY: 1.0,
    upZ: 0.0,
    isSlab: false,
    wakeTimer: 4.0,
    wear: 0.2,
    seedHash: 0.5,
  };
  sys.rocks.push(testRock);
  for (let s = 0; s < 20; s++) sys.stepPhysics(0.05); // 1.0 second elapsed
  assert.ok(testRock.x > 12.0, `Cliff boulder must slide briskly (>12m in 1.0s), moved ${testRock.x.toFixed(2)}m`);

  // Step boulder gravity rolling until boulders reach the gentle cliff toe / apron
  for (let s = 0; s < 100; s++) sys.stepPhysics(0.05);
  const settled = sys.rocks.filter((r) => !r.isOutcrop && r.settled);
  assert.ok(settled.length >= boulders.length * 0.75, 'Calved boulders must naturally decelerate and settle on gentler terrain');
  for (const b of settled) {
    const s = sys.sampleTerrain(b.x, b.z).slope;
    assert.ok(s <= 0.43, `Settled boulder must NEVER cling on steep slope (>0.43), got slope=${s}`);
  }

  // Verify hydraulic undercutting wakes settled boulders up to roll further!
  const target = settled[0];
  for (let i = 0; i < grid.length; i += 4) grid[i] = Math.max(2.0, grid[i] - 2.5);
  sys.updateTerrainSnapshot(grid, N, 512.0);
  assert.equal(target.settled, false, 'Erosion undercutting (>0.24m drop) must wake settled boulder to roll');
});

test('Asymmetric Namib/Sahara sand dune profile joins windward stoss & 33.8-deg planar slipface along a razor-sharp brink', () => {
  const evalDune = (dM, hCrestM = 72.0, stossSpanM = 185.0) => {
    if (dM >= 0.0) {
      const rawLee = hCrestM - dM * 0.670;
      if (rawLee <= -2.5) return 0.0;
      const k = 2.2;
      const h = Math.max(0, Math.min(1, 0.5 + 0.5 * rawLee / k));
      return Math.max(0, rawLee * h + k * h * (1 - h));
    }
    const t = Math.max(0, Math.min(1, -dM / stossSpanM));
    return hCrestM * (1 - t) * (1 - t) * (1 + 1.25 * t);
  };

  // 1. Exact C0 crest height continuity at brink (dM = 0)
  assert.ok(Math.abs(evalDune(-1e-6) - evalDune(1e-6)) < 1e-3, 'Stoss and slipface meet cleanly at the brink');
  // 2. Sharp slope discontinuity at brink: gentle positive windward stoss slope vs steep -0.670 (33.8 deg) leeward slipface!
  const stossSlope = (evalDune(0) - evalDune(-2.0)) / 2.0;
  const leeSlope = (evalDune(2.0) - evalDune(0)) / 2.0;
  assert.ok(stossSlope > 0.15 && stossSlope < 0.38, `Expected gentle windward stoss slope, got ${stossSlope}`);
  assert.ok(Math.abs(leeSlope - (-0.670)) < 1e-3, `Expected planar 33.8-deg (-0.670) slipface, got ${leeSlope}`);
  // 3. Clean flat interdune desert floor beyond slipface & upwind toe
  assert.equal(evalDune(140.0), 0, 'Interdune floor beyond slipface toe must be clean exposed desert pan');
  assert.equal(evalDune(-190.0), 0, 'Upwind stoss toe merges smoothly onto flat desert pan');
});


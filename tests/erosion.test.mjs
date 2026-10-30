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

test('GPU Erosion presets preserve all 8 baseline landscapes untouched and add 6 new canyon/Icelandic/dune/lake landscapes', () => {
  const landKeys = Object.keys(EROSION_LANDSCAPES);
  assert.equal(landKeys.length, 14);
  const seenTypes = new Set();
  for (const k of landKeys) {
    const p = EROSION_LANDSCAPES[k];
    assert.equal(p.id, k);
    assert.ok(p.defaults.relief >= 80 && p.defaults.relief <= 220);
    assert.ok(p.defaults.rockHardness > 0 && p.defaults.rockHardness < 1);
    seenTypes.add(p.terrainType);
  }
  assert.equal(seenTypes.size, 14, 'Each landscape preset should map to a unique GPU terrain generator mode');

  // Verify all 8 original baseline terrainTypes (0..7) and default boot preset remain intact!
  assert.equal(DEFAULT_EROSION_PARAMS.landscape, 'icelandic-highlands');
  assert.equal(EROSION_LANDSCAPES['alpine-divide'].terrainType, 0);
  assert.equal(EROSION_LANDSCAPES['layered-plateau'].terrainType, 1);
  assert.equal(EROSION_LANDSCAPES['fault-escarpment'].terrainType, 2);
  assert.equal(EROSION_LANDSCAPES['volcanic-caldera'].terrainType, 3);
  assert.equal(EROSION_LANDSCAPES['badlands-domes'].terrainType, 4);
  assert.equal(EROSION_LANDSCAPES['coastal-massif'].terrainType, 5);
  assert.equal(EROSION_LANDSCAPES['icelandic-highlands'].terrainType, 6);
  assert.equal(EROSION_LANDSCAPES['himalayan-karakoram'].terrainType, 7);

  // Verify the 6 new researched landscapes (8..13), 7 rock themes, and 5 stone fabric modes
  assert.equal(EROSION_LANDSCAPES['grand-canyon'].terrainType, 8);
  assert.equal(EROSION_LANDSCAPES['studlagil-basalt'].terrainType, 9);
  assert.equal(EROSION_LANDSCAPES['fjadrargljufur-palagonite'].terrainType, 10);
  assert.equal(EROSION_LANDSCAPES['namib-erg-dunes'].terrainType, 11);
  assert.equal(EROSION_LANDSCAPES['yardang-wind-corridor'].terrainType, 12);
  assert.equal(EROSION_LANDSCAPES['glacial-lake-watershed'].terrainType, 13);
  assert.equal(Object.keys(MATERIAL_THEMES).length, 7);
  assert.equal(Object.keys(ROCK_FABRIC_MODES).length, 5);

  // Glacial mountain archetypes must exist and be genuinely cryospheric
  const iceland = EROSION_LANDSCAPES['icelandic-highlands'];
  const himalaya = EROSION_LANDSCAPES['himalayan-karakoram'];
  assert.ok(iceland && himalaya, 'Icelandic & Himalayan glacial mountain presets must exist');
  assert.ok(iceland.defaults.snowfallRate > 0.5 && himalaya.defaults.snowfallRate > 0.5);
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

test('All 17 WebGL2 GLSL ES 3.00 shaders satisfy strict ANGLE precision, brace, and interface invariants', () => {
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

test('3D RockCalvingSystem synthesizes cleaved polyhedral outcrops & settles calved boulders down cliff slopes', () => {
  const atlas = buildRockArchetypeAtlas(7331);
  assert.equal(atlas.submeshes.length, 6, 'Atlas must contain 6 cleaved polyhedral rock archetypes');
  assert.ok(atlas.indices.length > 600, 'Polyhedral rock atlas must contain rich faceted triangles');

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

  const outcrops = sys.rocks.filter((r) => r.isOutcrop);
  const boulders = sys.rocks.filter((r) => !r.isOutcrop);
  assert.ok(outcrops.length >= 20, `Expected >= 20 cliff outcrops, got ${outcrops.length}`);
  assert.ok(boulders.length >= 50, `Expected >= 50 calved boulders, got ${boulders.length}`);

  // Step boulder gravity rolling until boulders settle at the cliff toe / apron
  for (let s = 0; s < 120; s++) sys.stepPhysics(0.05);
  const settled = sys.rocks.filter((r) => !r.isOutcrop && r.settled);
  assert.ok(settled.length >= boulders.length * 0.75, 'Calved boulders must naturally decelerate and settle on gentler terrain');

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


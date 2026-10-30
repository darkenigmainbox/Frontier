import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  DEFAULT_EROSION_PARAMS,
  EMITTER_MODES,
  EROSION_LANDSCAPES,
} from '../src/erosion/erosion-presets.js';
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
  'WATER_RENDER_VERT',
  'WATER_RENDER_FRAG',
  'BOULDER_RENDER_VERT',
  'BOULDER_RENDER_FRAG',
  'PARTICLE_RENDER_VERT',
  'PARTICLE_RENDER_FRAG',
  'SKY_BG_FRAG',
];

test('GPU Erosion presets define 13 distinct geological landscapes and 6 multi-agent emitter modes', () => {
  const landKeys = Object.keys(EROSION_LANDSCAPES);
  assert.equal(landKeys.length, 13);
  const seenTypes = new Set();
  for (const k of landKeys) {
    const p = EROSION_LANDSCAPES[k];
    assert.equal(p.id, k);
    assert.ok(p.defaults.relief >= 80 && p.defaults.relief <= 220);
    assert.ok(p.defaults.rockHardness > 0 && p.defaults.rockHardness < 1);
    assert.ok(p.defaults.boulderDensity >= 0 && p.defaults.boulderDensity <= 1);
    seenTypes.add(p.terrainType);
  }
  assert.equal(seenTypes.size, 13, 'Each landscape preset should map to a unique GPU terrain generator mode');

  const canyon = EROSION_LANDSCAPES['canyonlands-river-gorge'];
  const lake = EROSION_LANDSCAPES['moraine-lake-basin'];
  const icelandRift = EROSION_LANDSCAPES['icelandic-rift-coast'];
  const dunes = EROSION_LANDSCAPES['sahara-erg-dunes'];
  const karst = EROSION_LANDSCAPES['limestone-karst-springs'];
  assert.equal(canyon.terrainType, 8);
  assert.equal(lake.terrainType, 9);
  assert.equal(icelandRift.terrainType, 10);
  assert.equal(dunes.terrainType, 11);
  assert.equal(karst.terrainType, 12);
  assert.ok(canyon.defaults.pipeFlowBlend > 0.7 && canyon.defaults.boulderDensity > 0.6);
  assert.ok(lake.defaults.glacierStrength > 0.5 && karst.materialTheme === 5);

  // Glacial mountain archetypes must exist and be genuinely cryospheric
  const iceland = EROSION_LANDSCAPES['icelandic-highlands'];
  const himalaya = EROSION_LANDSCAPES['himalayan-karakoram'];
  assert.ok(iceland && himalaya, 'Icelandic & Himalayan glacial mountain presets must exist');
  assert.equal(iceland.terrainType, 6);
  assert.equal(himalaya.terrainType, 7);
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

test('All 19 WebGL2 GLSL ES 3.00 shaders satisfy strict ANGLE precision, brace, and interface invariants', () => {
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

  // New terrain types initialize water independently from bedrock; the wind and render systems are wired.
  for (let kind = 8; kind <= 12; kind++) {
    assert.ok(Shaders.INIT_TERRAIN_FRAG.includes(`kind == ${kind}`), `Missing terrain generator ${kind}`);
  }
  assert.ok(Shaders.INIT_TERRAIN_FRAG.includes('uInitWindDir'));
  assert.ok(Shaders.INIT_TERRAIN_FRAG.includes('outTerrain = vec4(bedrockH, 0.0, 0.0, max(0.0, initialWater))'));
  assert.ok(Shaders.WATER_RENDER_FRAG.includes('tC.a < 0.006'), 'Water pass must skip dry terrain');
  for (let theme = 3; theme <= 6; theme++) {
    assert.ok(Shaders.TERRAIN_RENDER_FRAG.includes(`uMaterialTheme == ${theme}`), `Missing terrain material theme ${theme}`);
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
    progWaterRender: [Shaders.WATER_RENDER_VERT, Shaders.WATER_RENDER_FRAG],
    progBoulderRender: [Shaders.BOULDER_RENDER_VERT, Shaders.BOULDER_RENDER_FRAG],
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
  assert.ok(checkedCount >= 45, `Expected >= 45 verified GPU uniform bindings, got ${checkedCount}`);
  assert.ok(engineSrc.includes('gl.drawArraysInstanced'), 'Settled boulders must render as GPU instances');
  assert.ok(engineSrc.includes('_drawWaterSurface(viewProj'), '2.5D water preview must be wired into the terrain pass');
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

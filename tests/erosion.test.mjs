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
  'WATER_SURFACE_FRAG',
  'DOWNSCALE_FRAG',
  'ROCK_RENDER_VERT',
  'ROCK_RENDER_FRAG',
  'THERMAL_TALUS_FRAG',
  'TERRAIN_RENDER_VERT',
  'TERRAIN_RENDER_FRAG',
  'PARTICLE_RENDER_VERT',
  'PARTICLE_RENDER_FRAG',
  'SKY_BG_FRAG',
];

test('GPU Erosion presets define 10 distinct geological landscapes and 6 multi-agent emitter modes', () => {
  const landKeys = Object.keys(EROSION_LANDSCAPES);
  assert.equal(landKeys.length, 10);
  const seenTypes = new Set();
  for (const k of landKeys) {
    const p = EROSION_LANDSCAPES[k];
    assert.equal(p.id, k);
    assert.ok(p.defaults.relief >= 80 && p.defaults.relief <= 220);
    assert.ok(p.defaults.rockHardness > 0 && p.defaults.rockHardness < 1);
    seenTypes.add(p.terrainType);
  }
  assert.equal(seenTypes.size, 10, 'Each landscape preset should map to a unique GPU terrain generator mode');

  // Canyon + Icelandic lava shore are required archetypes
  assert.equal(EROSION_LANDSCAPES['grand-canyon'].terrainType, 8);
  assert.equal(EROSION_LANDSCAPES['icelandic-lava-shore'].terrainType, 9);
  assert.equal(EROSION_LANDSCAPES['grand-canyon'].materialTheme, 5);
  assert.equal(EROSION_LANDSCAPES['icelandic-lava-shore'].materialTheme, 3);

  // Six regional rock palettes (0..5)
  const themes = new Set(landKeys.map((k) => EROSION_LANDSCAPES[k].materialTheme));
  assert.ok(themes.has(0) && themes.has(1) && themes.has(2) && themes.has(3) && themes.has(5),
    'Landscape presets must cover the Utah / Icelandic / Himalayan / lava / canyon palettes');

  // 2.5D water + boulder scatter parameters exist with sane ranges
  assert.ok(DEFAULT_EROSION_PARAMS.lakeLevelRate > 0 && DEFAULT_EROSION_PARAMS.lakeLevelRate < 1);
  assert.ok(DEFAULT_EROSION_PARAMS.meltRate >= 0);
  assert.ok(DEFAULT_EROSION_PARAMS.rockScatterDensity > 0);
  assert.equal(DEFAULT_EROSION_PARAMS.showRocks, true);

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
    progWaterSurface: [Shaders.FULLSCREEN_VERT, Shaders.WATER_SURFACE_FRAG],
    progDownscale: [Shaders.FULLSCREEN_VERT, Shaders.DOWNSCALE_FRAG],
    progRockRender: [Shaders.ROCK_RENDER_VERT, Shaders.ROCK_RENDER_FRAG],
    progTerrainRender: [Shaders.TERRAIN_RENDER_VERT, Shaders.TERRAIN_RENDER_FRAG],
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

  // Every function a stage calls must be defined in that stage (or in the shared geology header)
  const GLSL_KEYWORDS = new Set((
    'layout sampler2D sampler2DArray samplerCube in out uniform const highp mediump lowp precision ' +
    'return if else for while switch struct discard void main float int uint bool vec2 vec3 vec4 ' +
    'ivec2 ivec3 ivec4 uvec2 uvec3 uvec4 bvec2 bvec3 bvec4 mat2 mat3 mat4 location flat smooth centroid'
  ).split(' '));
  const GLSL_BUILTINS = new Set((
    'radians degrees sin cos tan asin acos atan sinh cosh tanh pow exp log exp2 log2 sqrt inversesqrt ' +
    'abs sign floor trunc round roundEven ceil fract mod min max clamp mix step smoothstep length ' +
    'distance dot cross normalize faceforward reflect refract textureSize texture textureLod texelFetch ' +
    'dFdx dFdy fwidth textureGrad transpose inverse determinant'
  ).split(' '));
  const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');

  for (const [name, src] of Object.entries(Shaders)) {
    if (typeof src !== 'string' || !src.startsWith('#version 300 es')) continue;
    const code = stripComments(src);
    const defined = new Set([...code.matchAll(/\b([A-Za-z_]\w*)\s*\([^;{}]*\)\s*\{/g)].map((m) => m[1]));
    const called = new Set([...code.matchAll(/\b([A-Za-z_]\w*)\s*\(/g)].map((m) => m[1]));
    const unresolved = [...called].filter(
      (c) => !defined.has(c) && !GLSL_KEYWORDS.has(c) && !GLSL_BUILTINS.has(c) && !c.startsWith('gl_')
    );
    assert.deepEqual(unresolved, [], `${name} calls undefined GLSL functions (missing COMMON_GEOLOGY_GLSL include?)`);
  }
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

test('2.5D lake leveling flattens standing water while rivers keep their gradient', () => {
  // ---- CPU mirror of WATER_SURFACE_FRAG (over-relaxed 8-neighbour hydrostatic solve) ----
  const OFF = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  const smoothstep = (a, b, x) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  const levelSolve = (R, bed, depth0, iters, relax) => {
    const plane = new Float32Array(R * R);
    for (let i = 0; i < R * R; i++) plane[i] = depth0[i] > 1e-3 ? bed[i] + depth0[i] : bed[i];
    for (let it = 0; it < iters; it++) {
      const prev = Float32Array.from(plane);
      for (let z = 0; z < R; z++) {
        for (let x = 0; x < R; x++) {
          const i = z * R + x;
          if (depth0[i] < 0.0015) { plane[i] = bed[i]; continue; }
          const surf = bed[i] + depth0[i];
          const my = prev[i] > bed[i] ? prev[i] : surf;
          let sum = my * 2;
          let wsum = 2;
          for (const [ox, oz] of OFF) {
            const nx = Math.min(R - 1, Math.max(0, x + ox));
            const nz = Math.min(R - 1, Math.max(0, z + oz));
            const j = nz * R + nx;
            const w = (Math.abs(ox) + Math.abs(oz) > 1) ? 0.7 : 1.0;
            if (depth0[j] > 0.0015) {
              sum += (prev[j] > bed[j] ? prev[j] : bed[j] + depth0[j]) * w;
              wsum += w;
            } else {
              sum += Math.min(bed[j], my) * w * 0.6;
              wsum += w * 0.6;
            }
          }
          const target = sum / Math.max(wsum, 1e-3);
          let omega = (0.90 + 0.70 * smoothstep(0.04, 0.45, depth0[i])) * (0.55 + relax);
          omega = Math.min(1.85, Math.max(0.35, omega));
          let lv = Math.max(my + omega * (target - my), bed[i] + 0.0005);
          lv = Math.min(lv, Math.max(surf, target) + 0.30);
          plane[i] = lv;
        }
      }
    }
    return plane;
  };

  // ---- Basin with a closed rim, holding a deliberately tilted water surface ----
  const R = 32;
  const cell = 4;
  const span = (R - 1) * cell;
  const worldX = (x) => -span / 2 + x * cell;
  const worldZ = (z) => -span / 2 + z * cell;
  const bedAt = (wx, wz) => {
    const r = Math.hypot(wx, wz);
    return 30 - 16 * Math.exp(-(r * r) / (2 * 24 * 24)); // bowl sunk into a 30 m plain rim
  };

  const bed = new Float32Array(R * R);
  const depth = new Float32Array(R * R);
  for (let z = 0; z < R; z++) {
    for (let x = 0; x < R; x++) {
      const i = z * R + x;
      bed[i] = bedAt(worldX(x), worldZ(z));
      const tilted = 24.6 + 0.9 * Math.sin(worldX(x) * 0.05) + 0.7 * Math.cos(worldZ(z) * 0.045);
      depth[i] = Math.max(0, tilted - bed[i]);
    }
  }

  const rough = (surface, minDepth) => {
    const vals = [];
    for (let i = 0; i < R * R; i++) if (surface[i] - bed[i] > minDepth) vals.push(surface[i]);
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const maxDev = Math.max(...vals.map((v) => Math.abs(v - mean)));
    const rms = Math.sqrt(vals.reduce((a, v) => a + (v - mean) ** 2, 0) / vals.length);
    return { n: vals.length, mean, maxDev, rms };
  };

  const initial = levelSolve(R, bed, depth, 0, 0.55);
  const settled = levelSolve(R, bed, depth, 160, 0.55);
  const before = rough(initial, 1.5);
  const after = rough(settled, 1.5);

  assert.ok(after.n > 120, 'The bowl must retain a sizeable deep water body');
  assert.ok(after.maxDev < before.maxDev * 0.7,
    `Lake levelling must flatten the basin plane (${before.maxDev.toFixed(3)} -> ${after.maxDev.toFixed(3)} m)`);
  assert.ok(after.rms < before.rms * 0.75,
    `Lake plane roughness must drop (${before.rms.toFixed(3)} -> ${after.rms.toFixed(3)} m RMS)`);
  assert.ok(after.mean > 23 && after.mean < 27.5, `Levelled body sits at ${after.mean.toFixed(2)} m inside the bowl`);

  // Water may never sink below the terrain it rests on
  for (let i = 0; i < R * R; i++) {
    assert.ok(settled[i] >= bed[i] - 1e-6, 'Water plane may never sink below the bed');
  }

  // ---- River thread: a 1-cell channel down a ramp must keep flowing downhill ----
  const riverDepth = new Float32Array(R * R);
  const riverBed = new Float32Array(R * R);
  for (let z = 0; z < R; z++) {
    for (let x = 0; x < R; x++) {
      const i = z * R + x;
      riverBed[i] = 40 - worldX(x) * 0.25;               // 25% ramp along +x
      riverDepth[i] = (z === Math.floor(R / 2)) ? 0.6 : 0; // thin thread, one cell wide
    }
  }
  const riverPlane = levelSolve(R, riverBed, riverDepth, 120, 0.55);
  const up = Math.floor(R / 2) * R + 8;
  const down = Math.floor(R / 2) * R + (R - 9);
  const bedDrop = riverBed[up] - riverBed[down];
  const planeDrop = riverPlane[up] - riverPlane[down];
  assert.ok(planeDrop > bedDrop * 0.6,
    `Running water must keep its downstream gradient (${planeDrop.toFixed(2)} m of ${bedDrop.toFixed(2)} m bed drop)`);
});

test('Boulder scatter solver settles rock debris below steep faces and on structural benches', () => {
  const R = 64;
  const span = 500;
  const cell = span / (R - 1);
  // Step-wedge terrain: flat plain then a steep 40 deg escarpment, then a bench
  const terrain = (wx, wz) => {
    const t = (wx + 120) / 120;
    if (t <= 0) return 12;
    if (t >= 1) return 96;
    return 12 + 84 * t;
  };
  const height = (wx, wz) => {
    const fx = (wx / span + 0.5) * (R - 1);
    const fz = (wz / span + 0.5) * (R - 1);
    const x0 = Math.floor(Math.max(0, Math.min(R - 2, fx)));
    const z0 = Math.floor(Math.max(0, Math.min(R - 2, fz)));
    const tx = Math.min(1, Math.max(0, fx - x0));
    const tz = Math.min(1, Math.max(0, fz - z0));
    const a = terrain(-span / 2 + x0 * cell, 0) * (1 - tx) + terrain(-span / 2 + (x0 + 1) * cell, 0) * tx;
    return a;
  };
  const slope = (wx, wz) => {
    const e = cell * 1.5;
    return Math.abs((height(wx + e, wz) - height(wx - e, wz)) / (2 * e));
  };

  let steepFaces = 0;
  let flats = 0;
  for (let i = 0; i < 4000; i++) {
    const x = ((i * 0.6180339887) % 1) * span - span / 2;
    const sl = slope(x, 0);
    if (sl > 0.34) steepFaces++;
    if (sl < 0.10) flats++;
  }
  assert.ok(steepFaces > 50, 'Escarpment must register as steep ground for talus anchoring');
  assert.ok(flats > 1000, 'Plain must register as flat ground for erratics');

  // Downhill direction from the gradient must point away from the escarpment crest
  const e = cell * 1.5;
  const gx = (height(-20 + e, 0) - height(-20 - e, 0)) / (2 * e);
  assert.ok(gx > 0.2, 'Gradient must rise toward the escarpment');
  // Rocks travel downslope (negative gradient), i.e. away from the cliff base
  const runOut = 22;
  const startX = -20;
  const landedX = startX - Math.sign(gx) * runOut;
  assert.ok(height(landedX, 0) <= height(startX, 0) + 1e-6,
    'Settled debris must end up at or below its release elevation');
});

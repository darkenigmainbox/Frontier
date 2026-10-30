/**
 * WebGL2 GLSL ES 3.00 Shaders for the Hybrid GPU Particle + Shallow-Water + 3D Stratigraphic Hardness
 * & Multi-Species Sedimentation Engine.
 *
 * Strict ANGLE / D3D11 / Metal / Vulkan WebGL2 compliance:
 * - Explicit `precision highp float; precision highp int; precision highp sampler2D;` in every stage
 * - Zero `pow(negative, ...)` or unguarded `normalize(0)` so NaN propagation is impossible
 * - Zero `OES_texture_float_linear` requirement (uses exact `texelFetch` bilinear interpolation)
 */

const GLSL_PRECISION_HEADER = `precision highp float;
precision highp int;
precision highp sampler2D;`;

export const FULLSCREEN_VERT = `#version 300 es
${GLSL_PRECISION_HEADER}
out vec2 vUv;
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}
`;

export const COMMON_GEOLOGY_GLSL = `
float sq(float v) { return v * v; }

vec2 safeNorm2(vec2 v, vec2 fallback) {
  float l2 = dot(v, v);
  return l2 > 1e-8 ? v * inversesqrt(l2) : fallback;
}

vec3 safeNorm3(vec3 v, vec3 fallback) {
  float l2 = dot(v, v);
  return l2 > 1e-8 ? v * inversesqrt(l2) : fallback;
}

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec3 hash32(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yxz + 33.33);
  return fract((p3.xxy + p3.yzz) * p3.zyx);
}

float noise2D(vec2 x) {
  vec2 i = floor(x);
  vec2 f = fract(x);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash12(i);
  float b = hash12(i + vec2(1.0, 0.0));
  float c = hash12(i + vec2(0.0, 1.0));
  float d = hash12(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, b - b + d, u.x), u.y);
}

float fbm2D(vec2 p, int octaves, float roughness) {
  float sum = 0.0;
  float amp = 0.5;
  float norm = 0.0;
  mat2 rot = mat2(0.80, -0.60, 0.60, 0.80);
  for (int i = 0; i < 8; i++) {
    if (i >= octaves) break;
    sum += amp * noise2D(p);
    norm += amp;
    p = rot * p * 2.03 + vec2(17.1, 31.7);
    amp *= clamp(roughness, 0.35, 0.72);
  }
  return sum / max(norm, 1e-4);
}

float ridgedFbm2D(vec2 p, int octaves, float roughness) {
  float sum = 0.0;
  float amp = 0.5;
  float weight = 1.0;
  float norm = 0.0;
  mat2 rot = mat2(0.80, -0.60, 0.60, 0.80);
  for (int i = 0; i < 8; i++) {
    if (i >= octaves) break;
    float n = 1.0 - abs(noise2D(p) * 2.0 - 1.0);
    n = n * n * weight;
    weight = clamp(n * 1.8, 0.15, 1.0);
    sum += n * amp;
    norm += amp;
    p = rot * p * 2.07 + vec2(11.3, 23.9);
    amp *= clamp(roughness, 0.35, 0.68);
  }
  return sum / max(norm, 1e-4);
}

// Exact texelFetch bilinear sampler (works on 100% of WebGL2 GPUs without OES_texture_float_linear!)
vec4 sampleGridBilinear(sampler2D tex, vec2 uv, float res) {
  vec2 st = clamp(uv, vec2(0.5 / res), vec2(1.0 - 0.5 / res)) * res - 0.5;
  ivec2 i0 = ivec2(floor(st));
  vec2 f = fract(st);
  int maxI = int(res) - 1;
  ivec2 p00 = clamp(i0, ivec2(0), ivec2(maxI));
  ivec2 p10 = clamp(i0 + ivec2(1, 0), ivec2(0), ivec2(maxI));
  ivec2 p01 = clamp(i0 + ivec2(0, 1), ivec2(0), ivec2(maxI));
  ivec2 p11 = clamp(i0 + ivec2(1, 1), ivec2(0), ivec2(maxI));
  vec4 c00 = texelFetch(tex, p00, 0);
  vec4 c10 = texelFetch(tex, p10, 0);
  vec4 c01 = texelFetch(tex, p01, 0);
  vec4 c11 = texelFetch(tex, p11, 0);
  return mix(mix(c00, c10, f.x), mix(c01, c11, f.x), f.y);
}

/**
 * Evaluates 3D Geological Bedrock Hardness in [0.04, 0.99] at world position (wx, wy, wz).
 * uHardnessParams = (baseHardness, strataStrength, strataFreq, faultWeakness)
 * uStrataOrient   = (sinStrike, cosStrike, tanDip, reliefScale)
 */
float evalRockHardness3D(vec3 worldPos, vec4 uHardnessParams, vec4 uStrataOrient, float seedOff) {
  float baseH = uHardnessParams.x;
  float strataStr = uHardnessParams.y;
  float strataFreq = uHardnessParams.z;
  float faultWeak = uHardnessParams.w;

  vec2 sHoriz = worldPos.xz / max(uStrataOrient.w, 1.0);
  float acrossStrike = worldPos.x * uStrataOrient.x + worldPos.z * uStrataOrient.y;
  float warp = (fbm2D(sHoriz * 2.2 + seedOff, 3, 0.55) - 0.5) * 14.0;
  float stratY = worldPos.y + acrossStrike * uStrataOrient.z + warp;

  float phase1 = (stratY / max(uStrataOrient.w, 1.0)) * strataFreq * 6.2831853;
  float phase2 = phase1 * 2.7 + 1.3;
  float squareLedge = smoothstep(-0.28, 0.28, sin(phase1));
  float minorRib = 0.5 + 0.5 * sin(phase2);
  float stratHard = mix(0.10, 0.96, 0.72 * squareLedge + 0.28 * minorRib);

  float h = mix(baseH, mix(baseH * 0.35 + 0.05, min(0.98, baseH * 0.55 + 0.46), stratHard), strataStr);

  if (faultWeak > 0.01) {
    vec2 fp = worldPos.xz * 0.011 + vec2(seedOff * 0.37, -seedOff * 0.23);
    vec2 warpF = vec2(noise2D(fp * 1.9), noise2D(fp * 1.9 + 19.3)) * 0.55;
    float fLine1 = abs(sin((fp.x * 0.86 + fp.y * 0.51 + warpF.x) * 3.14159));
    float fLine2 = abs(sin((fp.x * -0.48 + fp.y * 0.88 + warpF.y) * 2.65));
    float faultGroove1 = 1.0 - smoothstep(0.0, 0.11, fLine1);
    float faultGroove2 = 1.0 - smoothstep(0.0, 0.09, fLine2);
    float faultMask = clamp(max(faultGroove1, faultGroove2 * 0.85), 0.0, 1.0);
    h *= (1.0 - 0.78 * faultWeak * faultMask);
  }

  return clamp(h, 0.04, 0.99);
}
`;

export const INIT_TERRAIN_FRAG = `#version 300 es
${GLSL_PRECISION_HEADER}
in vec2 vUv;
layout(location = 0) out vec4 outTerrain;

uniform vec4 uInitParams; // (relief, roughness, terrainType, seed)
uniform float uWorldSpan;
uniform vec2 uInitWindDir; // normalized prevailing wind for wind-oriented dune fields

${COMMON_GEOLOGY_GLSL}

void main() {
  float relief = uInitParams.x;
  float rough = uInitParams.y;
  int kind = int(uInitParams.z + 0.5);
  float seed = uInitParams.w;

  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  vec2 seedVec = vec2(fract(seed * 0.0137) * 53.0, fract(seed * 0.0293) * 71.0);

  vec2 warp = vec2(
    fbm2D(p * 1.6 + seedVec, 4, 0.55) - 0.5,
    fbm2D(p * 1.6 + seedVec + vec2(13.7, 29.1), 4, 0.55) - 0.5
  ) * 0.45;
  vec2 wp = p + warp;

  float baseElev = 0.0;
  float initialWater = 0.0;

  if (kind == 1) {
    // 1. Stratified Canyon Plateau & Piedmont Basin:
    // High dissected cuesta plateau on the upper two-thirds with sharp ridged drainage divides,
    // dropping across stepped canyon rims onto a broad low-gradient piedmont basin where braided alluvial fans spread!
    float cuestaRamp = smoothstep(-0.62, 0.28, -wp.y + 0.16 * sin(wp.x * 2.8));
    float rimIndent = ridgedFbm2D(wp * 2.3 + seedVec, 6, rough);
    float canyonTrunk = exp(-sq((wp.x - 0.18 * sin(wp.y * 3.1)) * 3.2)) * smoothstep(-0.75, 0.55, -wp.y);
    float highMesa = cuestaRamp * (0.58 + 0.44 * rimIndent) * (1.0 - 0.36 * canyonTrunk);
    float lowBasin = (1.0 - cuestaRamp) * (0.04 + 0.07 * fbm2D(wp * 3.4 + seedVec, 4, 0.5));
    baseElev = 0.04 + highMesa + lowBasin;
  } else if (kind == 2) {
    // 2. Tilted Fault Escarpment
    float faultTrace = wp.y + 0.14 * sin(wp.x * 3.5) + 0.08;
    float upBlock = smoothstep(-0.18, 0.24, -faultTrace);
    float ridgeDetail = ridgedFbm2D(wp * 2.4 + seedVec, 6, rough);
    baseElev = 0.06 + upBlock * (0.58 + 0.42 * ridgeDetail) + (1.0 - upBlock) * 0.10 * fbm2D(wp * 3.0 + seedVec, 4, 0.5);
  } else if (kind == 3) {
    // 3. Volcanic Stratocone & Breached Caldera Rim
    float radWarp = length(p + warp * 0.35);
    float cone = exp(-radWarp * radWarp * 2.35) * 1.18;
    float crater = exp(-radWarp * radWarp * 24.0) * 0.52;
    float breach = exp(-sq((p.x - 0.12) * 5.0)) * step(0.0, p.y) * exp(-sq((radWarp - 0.24) * 5.5)) * 0.28;
    float gullies = ridgedFbm2D(wp * 3.1 + seedVec, 6, rough) * 0.24 * smoothstep(0.05, 0.65, radWarp);
    baseElev = max(0.05, 0.06 + cone - crater - breach + gullies);
  } else if (kind == 4) {
    // 4. Soft-Shale Badlands & Caprock Domes
    float domes = ridgedFbm2D(wp * 2.8 + seedVec, 6, rough) * 0.62 + fbm2D(wp * 1.7 + seedVec, 5, rough) * 0.42;
    float basin = 1.0 - smoothstep(0.55, 1.02, r);
    baseElev = 0.08 + domes * mix(0.28, 1.0, basin);
  } else if (kind == 5) {
    // 5. Twin Basin Island Massif
    float peakA = exp(-dot(wp - vec2(-0.28, -0.16), wp - vec2(-0.28, -0.16)) * 4.2);
    float peakB = exp(-dot(wp - vec2( 0.26,  0.18), wp - vec2( 0.26,  0.18)) * 4.8) * 0.86;
    float saddle = exp(-dot(wp, wp) * 2.6) * 0.42;
    float crags = ridgedFbm2D(wp * 3.0 + seedVec, 6, rough);
    float coast = 1.0 - smoothstep(0.62, 0.98, r);
    baseElev = max(0.03, (0.05 + (peakA + peakB + saddle) * (0.55 + 0.55 * crags)) * coast);
  } else if (kind == 6) {
    // 6. ICELANDIC GLACIAL HIGHLANDS:
    // A broad high basaltic plateau ringed by flat-topped table mountains (tuyas) and rhyolite ridges,
    // deeply scoured by broad U-shaped glacial troughs that open onto a low black-sand sandur outwash plain!
    vec2 q = wp * 1.06;
    float plateau = smoothstep(0.62, -0.34, length(q * vec2(0.92, 1.0)) + 0.10 * sin(q.x * 3.1));
    float tuyaA = exp(-dot(q - vec2(-0.52, 0.24), q - vec2(-0.52, 0.24)) * 5.2);
    float tuyaB = exp(-dot(q - vec2(0.46, 0.38), q - vec2(0.46, 0.38)) * 4.4) * 0.92;
    float tuyaC = exp(-dot(q - vec2(0.12, -0.46), q - vec2(0.12, -0.46)) * 6.0) * 0.78;
    // Flat-topped tuya summits with steep columnar flanks (smoothstep clamp, not a cone apex!)
    float tuya = clamp(tuyaA + tuyaB + tuyaC, 0.0, 1.0);
    float tuyaTop = smoothstep(0.12, 0.62, tuya) * (0.52 + 0.20 * fbm2D(q * 5.5 + seedVec, 3, 0.5));
    // Rhyolite ridge swarm cross-cutting the plateau
    float rhyoliteRidge = ridgedFbm2D(q * vec2(2.1, 1.3) + seedVec + vec2(7.3, 19.1), 4, 0.46);
    float ridgeSwarm = smoothstep(0.40, 0.84, rhyoliteRidge) * 0.22 * plateau;
    // Broad glacial troughs (U-shaped, flat floors) radiating out from the ice cap centre
    float ang = atan(q.y, q.x);
    float trough = pow(max(0.0, cos(ang * 3.0 + 1.1)), 6.0);
    float troughMask = trough * smoothstep(0.18, 1.15, length(q));
    float troughFloor = 0.15 * smoothstep(0.05, 0.72, length(q));
    // Level outwash sandur radial plain draining southward
    float sandur = smoothstep(0.05, -0.72, q.y) * (0.035 + 0.022 * fbm2D(q * 6.0 + seedVec, 4, 0.5));
    float highland = plateau * (0.40 + 0.30 * fbm2D(q * 2.4 + seedVec, 5, 0.55)) + tuyaTop + ridgeSwarm;
    baseElev = 0.045 + mix(highland, troughFloor, troughMask * 0.82) + sandur * (1.0 - plateau);
  } else if (kind == 7) {
    // 7. HIMALAYAN HORN & GLACIER TRUNK MASSIF:
    // Three dominant pyramidal ice-scoured horns linked by knife-edge aretes, plunging cirque
    // headwalls, and a broad U-shaped trunk glacier valley running out to the outwash plain.
    vec2 h = wp * 1.02;

    // Ice-scoured pyramidal horns. The radius of each summit is warped by ridged noise so the
    // silhouette breaks into radiating aretes and couloirs instead of reading as a smooth cone.
    float angWarp = (ridgedFbm2D(h * 3.6 + seedVec, 4, 0.50) - 0.5) * 0.15;
    float dA = length((h - vec2(-0.46, 0.14)) * vec2(1.00, 1.18)) + angWarp;
    float dB = length((h - vec2(-0.02, -0.08)) * vec2(0.94, 1.06)) + angWarp * 1.15;
    float dC = length((h - vec2( 0.50, 0.18)) * vec2(1.08, 1.26)) + angWarp * 0.85;
    float hornA = max(0.0, 1.0 - smoothstep(0.015, 0.33, dA)) * 1.06;
    float hornB = max(0.0, 1.0 - smoothstep(0.015, 0.37, dB)) * 1.20;
    float hornC = max(0.0, 1.0 - smoothstep(0.015, 0.30, dC)) * 0.96;
    float horns = max(max(hornA, hornB), hornC);
    // Flared scree skirt welds each horn into the massif so bases never look like standing cones
    float skirt = max(0.0, 1.0 - smoothstep(0.10, 0.95, min(dA, min(dB, dC)))) * 0.30;

    // Knife-edge aretes connecting the horns along a gently crooked crest line
    float crestLine = 0.14 * sin(h.x * 2.1) - 0.03;
    float areteDist = abs(h.y - crestLine + 0.06 * (h.x + 0.2));
    float arete = exp(-areteDist * areteDist * 22.0) * smoothstep(0.72, 0.10, abs(h.x + 0.02));
    float crestDetail = ridgedFbm2D(h * 2.2 + seedVec, 4, 0.44);
    arete *= 0.34 + 0.34 * crestDetail;

    // Broad U-shaped trunk glacier valley draining south, with hanging side valleys
    float trunkDist = abs(h.x - 0.03 + 0.16 * sin(h.y * 1.7));
    float trunk = smoothstep(0.30, 0.04, trunkDist) * smoothstep(0.55, -0.85, h.y);
    float hanging = smoothstep(0.22, 0.02, abs(h.x + 0.40 + 0.22 * sin(h.y * 2.4))) * smoothstep(0.25, -0.55, h.y);

    // Mid-scale rocky shoulders & benches (wide, not spiky)
    float shoulders = (fbm2D(h * 2.6 + seedVec + vec2(41.3, 17.9), 4, 0.52) - 0.5) * 0.30;

    // Fine rock texture: high frequency, deliberately small amplitude
    float fineRock = (ridgedFbm2D(h * 7.5 + seedVec, 3, 0.45) - 0.45) * 0.055;

    // Sharp gendarme ribs & couloirs only on the upper third of each horn: breaks the smooth cone
    // silhouette into true alpine aretes and rock steps without adding noise to the skirts
    float upperBand = smoothstep(0.30, 0.82, max(horns, arete));
    float gendarmes = (ridgedFbm2D(h * vec2(5.4, 2.3) + seedVec, 4, 0.52) - 0.48) * 0.13 * upperBand;
    float couloirs = (ridgedFbm2D(h * vec2(2.1, 6.2) + seedVec + vec2(23.7, 9.1), 3, 0.5) - 0.48) * 0.07 * upperBand;

    float massif = max(max(horns, arete), skirt) + shoulders * (0.30 + 0.70 * max(horns, arete)) + gendarmes + couloirs;
    float valleyFloor = 0.075 + 0.030 * fbm2D(h * 4.0 + seedVec, 3, 0.5);
    baseElev = 0.05 + massif * (1.0 - 0.90 * max(trunk, hanging * 0.6))
             + valleyFloor * max(trunk, hanging * 0.6)
             + fineRock * (0.35 + 0.65 * clamp(massif, 0.0, 1.0));
  } else if (kind == 8) {
    // 8. CANYONLANDS RIVER GORGE:
    // A high sedimentary plateau is cut by a sinuous trunk canyon, stair-step benches,
    // resistant rim shelves and two small tributary slots. A shallow starter river lets the
    // separate 2.5D water solver visibly evolve the channel immediately.
    float meanderX = 0.13 * sin(wp.y * 2.55 + seedVec.x * 0.06)
                   + 0.052 * sin(wp.y * 6.1 + seedVec.y * 0.05);
    float riverDist = abs(wp.x - meanderX);
    float canyonExtent = 1.0 - smoothstep(0.66, 0.98, abs(wp.y));
    float innerSlot = 1.0 - smoothstep(0.016, 0.105, riverDist);
    float middleBench = 1.0 - smoothstep(0.105, 0.285, riverDist);
    float outerShelf = 1.0 - smoothstep(0.285, 0.52, riverDist);
    float plateauNoise = ridgedFbm2D(wp * 2.0 + seedVec, 6, rough);
    float plateau = 0.49 + 0.12 * plateauNoise + 0.045 * fbm2D(wp * 4.1 + seedVec, 4, 0.52);

    float tribA = abs(wp.y - (0.42 * (wp.x + 0.55) + 0.10 * sin(wp.x * 5.0)));
    float tribB = abs(wp.y - (-0.52 * (wp.x - 0.44) + 0.08 * sin(wp.x * 4.2 + 1.3)));
    float tributaries = (1.0 - smoothstep(0.012, 0.042, tribA)) * (1.0 - smoothstep(0.10, 0.46, abs(wp.x + 0.28)))
                      + (1.0 - smoothstep(0.012, 0.038, tribB)) * (1.0 - smoothstep(0.10, 0.42, abs(wp.x - 0.22)));
    float canyonCut = canyonExtent * (0.20 * innerSlot + 0.20 * middleBench + 0.13 * outerShelf);
    baseElev = 0.075 + plateau - canyonCut - tributaries * 0.065;
    baseElev += (fbm2D(wp * 10.0 + seedVec, 3, 0.48) - 0.5) * 0.018;
    float riverMask = 1.0 - smoothstep(0.009, 0.030, riverDist);
    initialWater = riverMask * (1.35 + 0.22 * fbm2D(wp * 14.0 + seedVec, 3, 0.5));
  } else if (kind == 9) {
    // 9. MORAINE-DAMMED ALPINE LAKE:
    // An ice-scoured U-valley ends in a closed basin behind a terminal moraine. The lake is
    // initialized at a level surface; subsequent pipe flux, melt and runoff alter its stage.
    vec2 basinP = wp - vec2(-0.045, 0.075);
    float basinR = length(basinP * vec2(0.92, 1.10));
    float floorNoise = fbm2D(wp * 4.4 + seedVec, 4, 0.52);
    float bowl = 0.105 + 0.115 * smoothstep(0.02, 0.48, basinR) + 0.018 * floorNoise;
    float moraineRim = exp(-sq((basinR - 0.49) * 8.5)) * (0.28 + 0.05 * ridgedFbm2D(basinP * 5.0 + seedVec, 3, 0.5));
    float headwall = smoothstep(0.36, 0.92, basinR) * (0.14 + 0.18 * ridgedFbm2D(wp * 2.8 + seedVec, 5, rough));
    float hangingValley = (1.0 - smoothstep(0.035, 0.105, abs(wp.x + 0.34 + 0.13 * sin(wp.y * 3.0))))
                        * (1.0 - smoothstep(0.10, 0.72, abs(wp.y - 0.04)));
    float outlet = (1.0 - smoothstep(0.012, 0.038, abs(wp.x - 0.16 - 0.08 * sin(wp.y * 4.0))))
                 * (1.0 - smoothstep(0.14, 0.92, abs(wp.y + 0.72)));
    baseElev = bowl + moraineRim + headwall * (1.0 - smoothstep(0.10, 0.48, basinR))
             + 0.17 * hangingValley - 0.075 * outlet;
    float lakeMask = 1.0 - smoothstep(0.38, 0.52, basinR);
    float lakeStage = relief * 0.245;
    initialWater = max(0.0, lakeStage - baseElev * relief) * lakeMask;
    initialWater += outlet * (0.48 + 0.12 * floorNoise);
  } else if (kind == 10) {
    // 10. ICELANDIC RIFT, GLACIAL OUTWASH & BLACK-SAND COAST:
    // Shield volcanoes and fissure ridges frame a braided south-draining sandur; asymmetric
    // lava terraces, young basalt mesas and small meltwater threads break up the broad plain.
    float shieldA = exp(-dot(wp - vec2(-0.34, 0.18), wp - vec2(-0.34, 0.18)) * 4.4) * 0.78;
    float shieldB = exp(-dot(wp - vec2(0.30, 0.36), wp - vec2(0.30, 0.36)) * 5.1) * 0.68;
    float riftTrace = abs(wp.x + 0.10 * sin(wp.y * 4.4 + seedVec.x));
    float fissureRidge = (1.0 - smoothstep(0.025, 0.11, riftTrace)) * (0.18 + 0.10 * ridgedFbm2D(wp * 5.0 + seedVec, 4, 0.48));
    float plateau = 0.10 + 0.13 * ridgedFbm2D(wp * 2.4 + seedVec, 6, rough);
    float sandur = 1.0 - smoothstep(-0.78, 0.32, wp.y);
    float glacierTrough = 1.0 - smoothstep(0.08, 0.26, abs(wp.x - 0.12 * sin(wp.y * 2.5)));
    baseElev = 0.055 + plateau + shieldA + shieldB + fissureRidge
             - 0.075 * glacierTrough + sandur * (0.025 + 0.02 * fbm2D(wp * 7.0 + seedVec, 4, 0.5));
    float meltRiver = (1.0 - smoothstep(0.008, 0.026, abs(wp.x - 0.12 * sin(wp.y * 2.5)))) * sandur;
    initialWater = meltRiver * 0.85;
  } else if (kind == 11) {
    // 11. SAHARA ERG:
    // Wind-aligned transverse and crescent dune trains with sheltered interdune corridors and
    // scattered exposed rock. Dune crests follow the user-selected prevailing wind azimuth.
    vec2 windDir = normalize(uInitWindDir);
    vec2 windCross = vec2(-windDir.y, windDir.x);
    float along = dot(wp, windDir);
    float across = dot(wp, windCross);
    float duneWarp = fbm2D(wp * 2.3 + seedVec, 5, 0.54) - 0.5;
    float dunePhase = across * 10.5 + 1.15 * sin(along * 2.2 + seedVec.x * 0.08) + duneWarp * 2.1;
    float crest = 0.5 + 0.5 * cos(dunePhase);
    float sharpCrest = pow(max(0.0, crest), 3.3);
    float duneField = 1.0 - smoothstep(0.72, 1.02, length(wp * vec2(0.92, 1.08)));
    float bedrockIslands = ridgedFbm2D(wp * 2.7 + seedVec + vec2(9.1, 18.3), 5, 0.50);
    baseElev = 0.052 + 0.27 * sharpCrest * duneField + 0.10 * duneWarp
             + 0.12 * smoothstep(0.76, 0.94, bedrockIslands);
    baseElev += 0.018 * (fbm2D(vec2(along * 3.0, across * 22.0) + seedVec, 3, 0.5) - 0.5);
  } else if (kind == 12) {
    // 12. LIMESTONE KARST & SPRINGS:
    // A weathered carbonate plateau with irregular dolines, sinking valleys, pale pavements and
    // clear spring pools occupying the lowest closed depressions.
    float dolineA = length((wp - vec2(-0.31, 0.10)) * vec2(1.12, 0.90));
    float dolineB = length((wp - vec2(0.29, -0.24)) * vec2(0.86, 1.14));
    float dolineC = length((wp - vec2(0.02, 0.42)) * vec2(1.20, 0.82));
    float karstRough = ridgedFbm2D(wp * 3.4 + seedVec, 6, rough);
    float upland = 0.28 + 0.17 * karstRough + 0.045 * fbm2D(wp * 7.2 + seedVec, 4, 0.5);
    float sinkholes = 0.20 * exp(-dolineA * dolineA * 34.0)
                    + 0.17 * exp(-dolineB * dolineB * 28.0)
                    + 0.15 * exp(-dolineC * dolineC * 38.0);
    float springA = 1.0 - smoothstep(0.035, 0.105, dolineA);
    float springB = 1.0 - smoothstep(0.030, 0.092, dolineB);
    float springC = 1.0 - smoothstep(0.028, 0.088, dolineC);
    float sinkingStream = 1.0 - smoothstep(0.012, 0.036, abs(wp.y + 0.15 + 0.12 * sin(wp.x * 4.0)));
    baseElev = upland - sinkholes - 0.035 * sinkingStream;
    initialWater = max(max(springA, springB), springC) * 1.05 + sinkingStream * 0.38;
  } else {
    // 0. Tectonic Mountain Divide
    float spineDist = abs(wp.y * 0.85 + wp.x * 0.28 + 0.15 * sin(wp.x * 3.4));
    float rangeEnv = exp(-spineDist * spineDist * 2.8) * (1.0 - smoothstep(0.68, 1.02, abs(p.x)));
    float spurs = ridgedFbm2D(wp * 2.5 + seedVec, 7, rough);
    float foothills = fbm2D(wp * 3.6 + seedVec, 5, 0.55) * 0.22;
    baseElev = 0.07 + rangeEnv * (0.42 + 0.68 * spurs) + foothills * (1.0 - 0.5 * smoothstep(0.6, 1.0, r));
  }

  float bedrockH = max(2.0, baseElev * relief);
  outTerrain = vec4(bedrockH, 0.0, 0.0, max(0.0, initialWater));
}
`;

export const INIT_PARTICLES_FRAG = `#version 300 es
${GLSL_PRECISION_HEADER}
in vec2 vUv;
layout(location = 0) out vec4 outPosAge;
layout(location = 1) out vec4 outVelWater;
layout(location = 2) out vec4 outSediment;

uniform vec4 uSpawnBox; // (worldSpan, cloudHeight, seed, emitterMode)

${COMMON_GEOLOGY_GLSL}

void main() {
  vec2 idSeed = gl_FragCoord.xy + vec2(uSpawnBox.z * 0.173, uSpawnBox.z * 0.319);
  vec3 rnd = hash32(idSeed);
  float halfSpan = uSpawnBox.x * 0.485;

  vec2 xz = (rnd.xy * 2.0 - 1.0) * halfSpan;
  float dropY = mix(25.0, uSpawnBox.y * 1.25, hash12(idSeed + 19.7));

  // Seed the population with a mixed species draw so the very first frames already contain
  // raindrops, snowflakes, saltating sand and rockfall debris (species 0..3 in sed.w).
  float speciesPick = floor(clamp(rnd.z * 4.0, 0.0, 3.0));
  outPosAge = vec4(xz.x, dropY, xz.y, -0.02 - 0.95 * rnd.z);
  outVelWater = vec4(0.0, -7.5 - 2.5 * rnd.z, 0.0, 0.55);
  outSediment = vec4(0.0, 0.0, 0.0, speciesPick);
}
`;

export const PARTICLE_STEP_FRAG = `#version 300 es
${GLSL_PRECISION_HEADER}
in vec2 vUv;

layout(location = 0) out vec4 outPosAge;
layout(location = 1) out vec4 outVelWater;
layout(location = 2) out vec4 outSediment;
layout(location = 3) out vec4 outExchange;
layout(location = 4) out vec4 outExchange2;

uniform sampler2D uTerrainTex;
uniform sampler2D uPosAgeTex;
uniform sampler2D uVelWaterTex;
uniform sampler2D uSedimentTex;
uniform sampler2D uVelocityFieldTex;
uniform sampler2D uSnowTex;

uniform vec4 uDomain;         // (worldSpan, gridRes, dt, stepIndex)
uniform vec4 uRainEmitter;    // (cloudHeight, rainIntensity, emitterMode, activeCount)
uniform vec4 uStormTarget;    // (targetX, targetZ, stormRadius, windDriftX)
uniform vec4 uHydraulics;     // (erosionStrength, sedimentCapacity, depositionRate, inertia)
uniform vec4 uLifeEvap;       // (evaporation, gravity, maxRunoffAge, pipeFlowBlend)
uniform vec4 uHardnessParams; // (rockHardness, strataStrength, strataFreq, faultWeakness)
uniform vec4 uStrataOrient;   // (sinStrike, cosStrike, tanDip, reliefScale)
uniform vec4 uSpeciesMix;     // (rainFrac, snowFrac, windFrac, rockfallFrac)
uniform vec4 uSnowParams;     // (snowlineNorm, snowfallRate, glacierStrength, meltRate)
uniform vec4 uWindParams;     // (windX, windZ, saltationPower, duneRate)
uniform float uSeed;

${COMMON_GEOLOGY_GLSL}

// Particle species codes:
// 0 = raindrop (hydraulic runoff)   1 = snowflake (snowpack / glacier feed)
// 2 = aeolian sand grain (saltation) 3 = rockfall boulder fragment
const int SP_RAIN = 0;
const int SP_SNOW = 1;
const int SP_WIND = 2;
const int SP_ROCK = 3;

vec2 worldToUv(vec2 xz, float span) {
  return xz / span + 0.5;
}

void spawnNewDrop(
  ivec2 coord,
  float stepIdx,
  out vec4 posAge,
  out vec4 velWater,
  out vec4 sed
) {
  vec2 rSeed = vec2(coord) * 1.37 + vec2(stepIdx * 0.713, stepIdx * 1.193 + uSeed * 0.031);
  vec3 r1 = hash32(rSeed);
  vec3 r2 = hash32(rSeed + vec2(41.3, 89.7));

  float span = uDomain.x;
  float res = uDomain.y;
  float halfSpan = span * 0.482;
  int mode = int(uRainEmitter.z + 0.5);

  // ---- Species lottery: weighted multi-agent population (rain / snow / wind / rockfall) ----
  float wR = max(0.0, uSpeciesMix.x);
  float wS = max(0.0, uSpeciesMix.y);
  float wW = max(0.0, uSpeciesMix.z);
  float totalW = max(1e-4, wR + wS + wW + max(0.0, uSpeciesMix.w));
  float pick = r1.z * totalW;
  int species = SP_RAIN;
  if (pick > wR + wS + wW) species = SP_ROCK;
  else if (pick > wR + wS) species = SP_WIND;
  else if (pick > wR) species = SP_SNOW;

  // Emission footprints: rock chunks choose steep source faces, blizzards/storms use a cell,
  // wind enters upwind, and rainfall may seek a high ridge for drainage cutting.
  vec2 xz;
  vec2 rockLaunchDir = safeNorm2(r1.xy * 2.0 - 1.0, vec2(1.0, 0.0));
  float baseCloudY = uRainEmitter.x;

  if (species == SP_ROCK) {
    vec2 bestXZ = (r1.xy * 2.0 - 1.0) * halfSpan * 0.82;
    float bestSlope = -1.0;
    for (int k = 0; k < 4; k++) {
      vec3 rk = hash32(rSeed + float(k + 1) * 27.9);
      vec2 cand = (rk.xy * 2.0 - 1.0) * halfSpan * 0.82;
      vec2 uv = worldToUv(cand, span);
      vec4 tc = sampleGridBilinear(uTerrainTex, uv, res);
      vec4 tr = sampleGridBilinear(uTerrainTex, uv + vec2(1.0 / res, 0.0), res);
      vec4 tl = sampleGridBilinear(uTerrainTex, uv - vec2(1.0 / res, 0.0), res);
      vec4 tu = sampleGridBilinear(uTerrainTex, uv + vec2(0.0, 1.0 / res), res);
      vec4 td = sampleGridBilinear(uTerrainTex, uv - vec2(0.0, 1.0 / res), res);
      float hR = tr.r + tr.g + tr.b;
      float hL = tl.r + tl.g + tl.b;
      float hU = tu.r + tu.g + tu.b;
      float hD = td.r + td.g + td.b;
      float slopeScore = length(vec2(hR - hL, hU - hD));
      if (slopeScore > bestSlope) {
        bestSlope = slopeScore;
        bestXZ = cand;
        rockLaunchDir = safeNorm2(vec2(hL - hR, hD - hU), rockLaunchDir);
      }
    }
    xz = bestXZ;
  } else if (mode == 1) {
    float ang = r1.x * 6.2831853;
    float rad = sqrt(max(0.0, r1.y)) * uStormTarget.z * 1.45;
    xz = clamp(uStormTarget.xy + vec2(cos(ang), sin(ang)) * rad, vec2(-halfSpan), vec2(halfSpan));
  } else if (mode == 2) {
    vec2 bestXZ = (r1.xy * 2.0 - 1.0) * halfSpan * 0.82;
    float bestH = sampleGridBilinear(uTerrainTex, worldToUv(bestXZ, span), res).r;
    for (int k = 0; k < 2; k++) {
      vec3 rk = hash32(rSeed + float(k + 1) * 27.9);
      vec2 cand = (rk.xy * 2.0 - 1.0) * halfSpan * 0.82;
      float ch = sampleGridBilinear(uTerrainTex, worldToUv(cand, span), res).r;
      if (ch > bestH) { bestH = ch; bestXZ = cand; }
    }
    xz = bestXZ;
  } else {
    xz = (r1.xy * 2.0 - 1.0) * halfSpan;
  }

  if (species == SP_WIND) {
    // Saltating sand enters from the upwind boundary of the domain
    vec2 windDir = safeNorm2(uWindParams.xy, vec2(1.0, 0.0));
    xz = -windDir * halfSpan * 0.99 + vec2(-windDir.y, windDir.x) * (r1.x * 2.0 - 1.0) * halfSpan;
    xz = clamp(xz, vec2(-halfSpan), vec2(halfSpan));
  }

  vec4 terrSpawn = sampleGridBilinear(uTerrainTex, worldToUv(xz, span), res);
  float surfSpawn = terrSpawn.r + terrSpawn.g + terrSpawn.b;

  float startY;
  if (species == SP_SNOW || species == SP_RAIN) {
    startY = baseCloudY * (0.82 + 0.42 * r1.z);
  } else if (species == SP_WIND) {
    startY = surfSpawn + 1.2 + 14.0 * r2.z;
  } else {
    startY = surfSpawn + 0.6 + 2.5 * r2.z;
  }

  // Source water / material payload
  float rainPayload = (0.35 + 0.85 * uRainEmitter.y) * ((mode == 1 || mode == 2) ? 1.45 : 1.0);
  float payload = rainPayload;
  if (species == SP_SNOW) payload = 0.06 + 0.09 * uSnowParams.y;
  else if (species == SP_WIND) payload = 0.035 + 0.05 * uWindParams.z;
  else if (species == SP_ROCK) payload = 0.34 + 0.48 * uWindParams.z;

  vec3 initVel = vec3(uStormTarget.w * 1.8, -14.0 - 5.0 * r2.x, (r2.y - 0.5) * 1.2);
  if (species == SP_SNOW) {
    // Snowflakes have huge aerodynamic drag: slow terminal fall + strong lateral wind advection
    initVel = vec3(uWindParams.x * 5.4 + (r2.y - 0.5) * 2.2, -2.4 - 1.6 * r1.z, uWindParams.y * 5.4 + (r2.x - 0.5) * 2.2);
  } else if (species == SP_WIND) {
    initVel = vec3(uWindParams.x * (11.0 + 9.0 * r2.x), -1.2 - 1.6 * r2.y, uWindParams.y * (11.0 + 9.0 * r2.x));
  } else if (species == SP_ROCK) {
    float rollSpeed = 3.5 + 5.5 * r2.x + 1.2 * clamp(length(rockLaunchDir), 0.0, 1.0);
    initVel = vec3(
      rockLaunchDir.x * rollSpeed + (r2.x - 0.5) * 0.9,
      -2.2 - 3.4 * r2.y,
      rockLaunchDir.y * rollSpeed + (r2.y - 0.5) * 0.9
    );
  }

  posAge = vec4(xz.x, startY, xz.y, -0.02);
  velWater = vec4(initVel, payload);
  sed = vec4(0.0, 0.0, 0.0, float(species));
}

void main() {
  ivec2 coord = ivec2(gl_FragCoord.xy);
  int slotId = coord.y * 256 + coord.x;

  vec4 posAge = texelFetch(uPosAgeTex, coord, 0);
  vec4 velWater = texelFetch(uVelWaterTex, coord, 0);
  vec4 sed = texelFetch(uSedimentTex, coord, 0);
  outExchange = vec4(0.0);
  outExchange2 = vec4(0.0);

  if (float(slotId) >= uRainEmitter.w) {
    outPosAge = posAge;
    outVelWater = velWater;
    outSediment = sed;
    return;
  }

  float span = uDomain.x;
  float res = uDomain.y;
  float dt = uDomain.z;
  float cellSize = span / res;
  float halfSpan = span * 0.492;

  int species = int(sed.w + 0.5);

  bool outOfBounds = abs(posAge.x) > halfSpan || abs(posAge.z) > halfSpan;
  if (outOfBounds || (posAge.w >= 0.0 && (velWater.w < 0.015 || posAge.w > uLifeEvap.z))) {
    if (!outOfBounds && (sed.x + sed.y) > 1e-5) {
      if (species == SP_SNOW) outExchange2 = vec4(sed.x, 0.0, 0.0, 0.0);
      else outExchange = vec4(0.0, sed.x, sed.y, 0.0);
    }
    spawnNewDrop(coord, uDomain.w, outPosAge, outVelWater, outSediment);
    return;
  }

  // PHASE A: Airborne descent (raindrops, snowflakes, wind-blown sand and detaching rockfall chunks)
  if (posAge.w < 0.0) {
    vec3 airVel = velWater.xyz;
    if (species == SP_SNOW) {
      // Blizzard aerodynamics: strong lateral advection + slow terminal velocity + turbulent flutter
      vec2 flutter = (hash32(vec2(coord) + uDomain.w * 0.37).xy * 2.0 - 1.0) * 2.4;
      airVel.x = uWindParams.x * 6.2 + flutter.x;
      airVel.z = uWindParams.y * 6.2 + flutter.y;
      airVel.y = max(airVel.y - uLifeEvap.y * 0.22 * dt, -4.2);
    } else if (species == SP_WIND) {
      airVel.x = uWindParams.x * (13.0 + 8.0 * hash12(vec2(coord) * 1.7));
      airVel.z = uWindParams.y * (13.0 + 8.0 * hash12(vec2(coord) * 2.1 + 7.3));
      airVel.y = max(airVel.y - uLifeEvap.y * 0.55 * dt, -7.0);
    } else if (species == SP_ROCK) {
      airVel.y = max(airVel.y - uLifeEvap.y * 2.4 * dt, -30.0);
    } else {
      airVel.y = max(airVel.y - uLifeEvap.y * 2.2 * dt, -26.0);
    }

    vec3 nextPos = posAge.xyz + airVel * dt;
    vec2 uvNext = worldToUv(nextPos.xz, span);
    vec4 terr = sampleGridBilinear(uTerrainTex, uvNext, res);
    float surfY = terr.r + terr.g + terr.b;

    if (nextPos.y <= surfY) {
      nextPos.y = surfY;
      float hardness = evalRockHardness3D(vec3(nextPos.x, terr.r, nextPos.z), uHardnessParams, uStrataOrient, uSeed);
      float impactSpeed = max(0.4, -airVel.y);

      if (species == SP_SNOW) {
        // Snowfall bonds onto the snowpack rather than detaching rock
        outPosAge = vec4(nextPos, 0.001);
        outVelWater = vec4(airVel.x * 0.10, 0.0, airVel.z * 0.10, velWater.w);
        outSediment = vec4(velWater.w * 0.55, 0.0, 0.0, sed.w);
        outExchange2 = vec4(velWater.w * 0.22, 0.0, 0.0, 0.0);
        return;
      }

      if (species == SP_ROCK) {
        // Boulder impact shatters and throws coarse debris into the talus apron
        float shatter = 0.0016 * impactSpeed * uWindParams.z / (0.35 + 1.6 * hardness);
        outPosAge = vec4(nextPos, 0.001);
        outVelWater = vec4(airVel.x * 0.45, 0.0, airVel.z * 0.45, 0.30);
        outSediment = vec4(sed.x + shatter * 1.6, 0.0, 0.0, sed.w);
        outExchange = vec4(-shatter * 0.5, 0.0, -shatter * 0.5, 0.0);
        return;
      }

      if (species == SP_WIND) {
        // Saltating sand grain rebounds; abrasive impact scours the windward rock face
        float scour = 0.0009 * uWindParams.z * impactSpeed / (0.30 + 1.8 * hardness);
        outPosAge = vec4(nextPos, 0.001);
        outVelWater = vec4(airVel.x * 0.55, 0.0, airVel.z * 0.55, 0.09);
        outSediment = vec4(sed.x + scour * 0.8, 0.0, 0.0, sed.w);
        outExchange = vec4(-scour * 0.25, 0.0, -scour * 0.75, 0.0);
        return;
      }

      // Raindrop splash: cushioned by any standing water film, hardness resists detachment
      float waterCushion = exp(-terr.a * 3.5);
      float splashPower = 0.0035 * uHydraulics.x * velWater.w * waterCushion / (0.20 + 2.8 * hardness * hardness);
      float splashLoose = min(terr.b, splashPower * 1.4);
      float splashBed = min(max(0.0, terr.r - 1.0), max(0.0, splashPower - splashLoose * 0.6));

      outPosAge = vec4(nextPos, 0.001);
      outVelWater = vec4(velWater.x * 0.25, 0.0, velWater.z * 0.25, velWater.w);
      outSediment = vec4(
        sed.x + splashBed * 0.35,
        sed.y + splashLoose + splashBed * 0.65,
        sed.z + splashBed,
        sed.w
      );
      outExchange = vec4(-splashBed, 0.0, -splashLoose, velWater.w * 0.032);
      return;
    }

    outPosAge = vec4(nextPos, posAge.w - dt);
    outVelWater = vec4(airVel, velWater.w);
    outSediment = sed;
    return;
  }

  // PHASE B: Surface interaction (hydraulic runoff, snow creep, sand saltation, boulder rolling)
  vec2 uv = worldToUv(posAge.xz, span);
  float eps = 1.0 / res;

  vec4 tC = sampleGridBilinear(uTerrainTex, uv, res);
  vec4 tR = sampleGridBilinear(uTerrainTex, uv + vec2(eps, 0.0), res);
  vec4 tL = sampleGridBilinear(uTerrainTex, uv - vec2(eps, 0.0), res);
  vec4 tU = sampleGridBilinear(uTerrainTex, uv + vec2(0.0, eps), res);
  vec4 tD = sampleGridBilinear(uTerrainTex, uv - vec2(0.0, eps), res);

  float hC = tC.r + tC.g + tC.b;
  float headR = tR.r + tR.g + tR.b + tR.a * 0.45;
  float headL = tL.r + tL.g + tL.b + tL.a * 0.45;
  float headU = tU.r + tU.g + tU.b + tU.a * 0.45;
  float headD = tD.r + tD.g + tD.b + tD.a * 0.45;

  vec2 grad = vec2(headR - headL, headU - headD) / (2.0 * cellSize);
  float gradMag = length(grad);
  float sinTheta = gradMag * inversesqrt(1.0 + gradMag * gradMag);

  vec2 jitterDir = safeNorm2(hash32(vec2(coord) + uDomain.w * 0.13).xy * 2.0 - 1.0, vec2(1.0, 0.0));
  vec2 downDir = gradMag > 1e-4 ? (-grad / gradMag) : jitterDir;

  vec4 snowCell = sampleGridBilinear(uSnowTex, uv, res);
  float elevFrac = clamp(tC.r / max(uStrataOrient.w, 1.0), 0.0, 1.25);
  // Thermal + wind exposure control how much snow can actually stick at this cell
  float snowStickCapacity = smoothstep(uSnowParams.x - 0.10, uSnowParams.x + 0.12, elevFrac)
                            * (1.0 - smoothstep(0.52, 0.86, sinTheta))
                            * (1.0 - smoothstep(0.55, 1.10, snowCell.g * 0.6));

  vec2 windDir = safeNorm2(uWindParams.xy, vec2(1.0, 0.0));

  // Species-dependent surface steering & locomotion laws
  vec2 steerDir;
  float speed;
  float water = velWater.w;

  if (species == SP_SNOW) {
    bool avalanche = sinTheta > 0.42 && snowCell.r > 0.22;
    vec2 snowSteer = safeNorm2(downDir * (avalanche ? 1.0 : 0.45) + windDir * 0.28 + jitterDir * 0.10, downDir);
    steerDir = snowSteer;
    float creep = avalanche ? (2.4 + 9.0 * (sinTheta - 0.36)) : (0.25 + 1.9 * sinTheta);
    speed = clamp(mix(length(velWater.xz), creep, 0.35), 0.06, 9.0);
  } else if (species == SP_WIND) {
    vec2 saltSteer = safeNorm2(windDir * 0.72 + downDir * 0.36 + jitterDir * 0.05, windDir);
    steerDir = saltSteer;
    speed = clamp(mix(length(velWater.xz), 6.0 + 20.0 * sinTheta, 0.22), 0.5, 22.0);
  } else if (species == SP_ROCK) {
    vec2 rollSteer = safeNorm2(downDir * 0.90 + jitterDir * 0.06, downDir);
    steerDir = rollSteer;
    speed = clamp(max(length(velWater.xz) * 0.94, 1.4 + 22.0 * sinTheta), 0.8, 26.0);
  } else {
    vec2 eulerVel = sampleGridBilinear(uVelocityFieldTex, uv, res).xy;
    float inertia = clamp(uHydraulics.w, 0.02, 0.92);
    vec2 oldDir = safeNorm2(velWater.xz, downDir);
    steerDir = safeNorm2(mix(downDir, oldDir, inertia) + eulerVel * (0.12 * uLifeEvap.w) + jitterDir * 0.035, downDir);
    speed = clamp(length(velWater.xz) * 0.88 + uLifeEvap.y * max(sinTheta, 0.018) * dt * 2.8, 0.35, 11.5);
  }

  float stepDist = min(speed * dt, cellSize * 0.95);
  vec2 nextXZ = posAge.xz + steerDir * stepDist;
  vec2 uvNext = worldToUv(nextXZ, span);
  vec4 tNext = sampleGridBilinear(uTerrainTex, uvNext, res);
  float hNext = tNext.r + tNext.g + tNext.b;

  float dh = hNext - hC;
  float hardness = evalRockHardness3D(vec3(posAge.x, tC.r, posAge.z), uHardnessParams, uStrataOrient, uSeed);

  float coarseLoad = sed.x;
  float fineLoad = sed.y;
  float totalLoad = coarseLoad + fineLoad;

  float rawSlope = max(0.0, -dh) / max(stepDist, 0.15 * cellSize);
  float slopePower = rawSlope * sqrt(max(0.02, rawSlope));
  float streamBoost = 0.65 + clamp(sqrt(max(0.0, tC.a)) * 6.5, 0.0, 5.2);

  float dBedrock = 0.0;
  float dCoarse = 0.0;
  float dFine = 0.0;
  float dSnow = 0.0;
  float dIce = 0.0;

  if (species == SP_SNOW) {
    // ---------------- SNOWPACK ACCUMULATION, AVALANCHE & GLACIER ICE FORMATION ----------------
    float deposit = velWater.w * uSnowParams.y * 0.16 * (0.25 + snowStickCapacity);
    if (dh > 0.006) {
      // Snow fences into hollows & lee slopes: preferential drift accumulation
      deposit *= 1.35;
      speed *= 0.42;
    }
    float drift = min(coarseLoad, deposit * 0.85);
    coarseLoad -= drift;
    dSnow += drift + deposit * 0.55;

    // High cold cells compact deep snowpack into flowing glacier ice
    float iceFormation = snowCell.r * smoothstep(0.30, 0.80, snowStickCapacity) * uSnowParams.z * 0.020 * dt;
    if (tC.a > 0.01) {
      // Snowmelt feeds meltwater runoff which then behaves like rain
      dIce += min(snowCell.r * 0.02, tC.a * 0.004);
      outExchange = vec4(0.0, 0.0, 0.0, min(0.004, tC.a * 0.002 + snowCell.r * 0.0016));
    }
    dIce += iceFormation;
  } else if (species == SP_WIND) {
    // ---------------- AEOLIAN SALTATION, WINDWARD ABRASION & LEE-SLOPE DUNE BUILD ----------------
    float windAligned = clamp(-dot(downDir, windDir) * 0.5 + 0.5, 0.0, 1.0);
    float capacity = uWindParams.z * 0.055 * (0.35 + 0.65 * speed / 12.0) * (1.0 + 1.4 * max(0.0, rawSlope));
    if (totalLoad > capacity) {
      float surplus = totalLoad - capacity;
      dFine += surplus * (0.55 + 0.45 * uWindParams.w);
      fineLoad = max(0.0, fineLoad - surplus);
      speed *= 0.80;
    } else {
      // Sandblasting plucks fine dust from windward faces (hardness resists)
      float abrasion = min(max(0.0, tC.r - 1.0),
        uWindParams.z * 0.006 * windAligned * (1.0 + 2.2 * max(0.0, rawSlope)) / (0.30 + 2.2 * hardness) * dt * 24.0);
      float loose = min(tC.b, abrasion * 1.6 + tC.b * 0.012);
      dBedrock -= abrasion;
      dFine -= loose;
      fineLoad += abrasion + loose;
      // Sand grains themselves slowly comminute into ever finer dust
      fineLoad += coarseLoad * 0.02;
      coarseLoad *= 0.98;
    }
    outExchange = vec4(dBedrock, dCoarse, dFine, 0.0);
    outExchange2 = vec4(0.0);
    outPosAge = vec4(nextXZ.x, hNext, nextXZ.y, posAge.w + dt);
    outVelWater = vec4(steerDir.x * speed, (hNext - hC) / max(dt, 1e-3), steerDir.y * speed, max(0.02, water * 0.995));
    outSediment = vec4(coarseLoad, fineLoad, sed.z - dBedrock, sed.w);
    return;
  } else if (species == SP_ROCK) {
    // ---------------- BOULDER ROLL, IMPACT SHATTER, COULOMB FRICTION & TALUS PILE-UP ----------------
    float kinetic = speed * speed;
    float frictionLoss = (0.35 + 1.6 * sinTheta) * 0.05;
    speed = max(1.2, speed * (1.0 - 0.22 * dt) - frictionLoss);
    float shatterChance = clamp((kinetic - 60.0) / 220.0, 0.0, 1.0) * (1.0 - 0.6 * hardness);
    if (shatterChance > 0.01) {
      float pulverize = min(max(0.0, tC.r - 1.0),
        shatterChance * 0.010 * dt * 26.0 / (0.30 + 2.4 * hardness));
      float dust = min(tC.b, shatterChance * 0.004 * dt * 26.0);
      dBedrock -= pulverize;
      dFine -= dust * 0.35;
      coarseLoad += pulverize * 0.72 + dust * 0.35;
      fineLoad += pulverize * 0.28;
      dCoarse -= min(tC.g, pulverize * 0.30);
    }
    // Pile up when the boulder runs out of momentum in hollows / at the base of the cliff face
    if (dh > 0.008 || speed < 2.4) {
      float dump = min(coarseLoad, (0.05 + max(0.0, dh) * 1.1) * dt * 26.0);
      coarseLoad -= dump;
      dCoarse += dump;
      speed *= 0.72;
    }
    outExchange = vec4(dBedrock, dCoarse, 0.0, 0.0);
    outExchange2 = vec4(0.0);
    outPosAge = vec4(nextXZ.x, hNext, nextXZ.y, posAge.w + dt);
    outVelWater = vec4(steerDir.x * speed, (hNext - hC) / max(dt, 1e-3), steerDir.y * speed, 0.30);
    outSediment = vec4(coarseLoad, fineLoad, sed.z - dBedrock, sed.w);
    return;
  } else {
    // ---------------- HYDRAULIC RUNOFF, HARDNESS-CONTROLLED CUTTING & TWO-SPECIES SEDIMENTATION ----------------
    float capacity = uHydraulics.y * 0.72 * water * (0.30 + 0.70 * (speed / 6.0)) * max(slopePower, 0.004) * streamBoost;

    if (dh > 0.002) {
      float fillNeed = min(totalLoad, dh * 0.85);
      if (totalLoad > 1e-6) {
        float coarseShare = clamp(coarseLoad / totalLoad * 1.25, 0.0, 1.0);
        float depC = min(coarseLoad, fillNeed * coarseShare);
        float depF = min(fineLoad, max(0.0, fillNeed - depC));
        coarseLoad -= depC;
        fineLoad -= depF;
        dCoarse += depC;
        dFine += depF;
      }
      speed *= 0.55;
    } else if (totalLoad > capacity) {
      float surplus = totalLoad - capacity;
      float depRate = clamp(uHydraulics.z * 0.44, 0.03, 0.88);

      // Coarse gravel drops out rapidly at canyon mouths (apex cones), fine silt travels far across alluvial fans!
      float depC = min(coarseLoad, surplus * depRate * 1.55);
      float remSurplus = max(0.0, surplus - depC);
      float depF = min(fineLoad, remSurplus * depRate * 0.36);

      coarseLoad -= depC;
      fineLoad -= depF;
      dCoarse += depC;
      dFine += depF;
    } else {
      float spareCap = capacity - totalLoad;
      float maxCutJump = min(max(0.0, -dh) * 0.92 + 0.015, 0.28);
      float rawDemand = min(spareCap * uHydraulics.x * 0.95, maxCutJump);

      float takeFine = min(tC.b * 0.55, rawDemand * 0.90);
      float remDemand = max(0.0, rawDemand - takeFine);

      float takeCoarse = min(tC.g * 0.42, remDemand * 0.72);
      remDemand = max(0.0, remDemand - takeCoarse * 1.15);

      float rockResistance = 0.12 + 3.85 * hardness * hardness;
      float bedCut = min(max(0.0, tC.r - 1.0), remDemand / rockResistance);

      // Meltwater pulses off warm snowpack super-charge erosive power on glaciated massifs
      float meltBoost = 1.0 + 1.8 * smoothstep(0.05, 0.55, snowCell.r) * uSnowParams.w;
      bedCut *= meltBoost;

      float coarseFrac = mix(0.24, 0.72, hardness);
      coarseLoad += takeCoarse + bedCut * coarseFrac;
      fineLoad += takeFine + bedCut * (1.0 - coarseFrac);

      dBedrock -= bedCut;
      dCoarse -= takeCoarse;
      dFine -= takeFine;
    }
  }

  float channelShelter = 1.0 / (1.0 + tC.a * 4.0);
  float nextWater = (species == SP_SNOW)
    ? velWater.w
    : water * (1.0 - uLifeEvap.x * 0.045 * channelShelter * dt);

  outPosAge = vec4(nextXZ.x, hNext, nextXZ.y, posAge.w + dt);
  outVelWater = vec4(steerDir.x * speed, (hNext - hC) / max(dt, 1e-3), steerDir.y * speed, nextWater);
  outSediment = vec4(coarseLoad, fineLoad, sed.z - dBedrock, sed.w);

  if (species == SP_SNOW) {
    outExchange = vec4(0.0, 0.0, 0.0, 0.0);
    outExchange2 = vec4(dSnow, dIce, 0.0, 0.0);
  } else {
    outExchange = vec4(dBedrock, dCoarse, dFine, 0.0);
    outExchange2 = vec4(0.0);
  }
}
`;

export const PARTICLE_SCATTER_VERT = `#version 300 es
${GLSL_PRECISION_HEADER}

uniform sampler2D uPrevPosAgeTex;
uniform sampler2D uNextPosAgeTex;
uniform sampler2D uExchangeTex;
uniform sampler2D uExchange2Tex;
uniform vec2 uDomainAndRes; // (worldSpan, gridRes)

out vec4 vExchange;
out vec4 vExchange2;

void main() {
  ivec2 coord = ivec2(gl_VertexID % 256, gl_VertexID / 256);
  vec4 prevPA = texelFetch(uPrevPosAgeTex, coord, 0);
  vec4 nextPA = texelFetch(uNextPosAgeTex, coord, 0);
  vec4 exch = texelFetch(uExchangeTex, coord, 0);
  vec4 exch2 = texelFetch(uExchange2Tex, coord, 0);

  bool justLanded = (prevPA.w < 0.0) && (nextPA.w >= 0.0);
  bool wasSurface = (prevPA.w >= 0.0);

  float magnitude = dot(abs(exch), vec4(1.0)) + dot(abs(exch2), vec4(1.0));
  if ((!justLanded && !wasSurface) || magnitude < 1e-7) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    gl_PointSize = 0.0;
    vExchange = vec4(0.0);
    vExchange2 = vec4(0.0);
    return;
  }

  vec2 contactXZ = justLanded ? nextPA.xz : prevPA.xz;
  vec2 uv = contactXZ / uDomainAndRes.x + 0.5;
  gl_Position = vec4(uv * 2.0 - 1.0, 0.0, 1.0);
  gl_PointSize = 3.0;
  vExchange = exch;
  vExchange2 = exch2;
}
`;

export const PARTICLE_SCATTER_FRAG = `#version 300 es
${GLSL_PRECISION_HEADER}

in vec4 vExchange;
in vec4 vExchange2;
layout(location = 0) out vec4 outDelta;
layout(location = 1) out vec4 outSnowDelta;

void main() {
  vec2 d = (gl_PointCoord - 0.5) * 3.0;
  float w = exp(-0.85 * dot(d, d)) * 0.242;
  outDelta = vExchange * w;
  outSnowDelta = vExchange2 * w;
}
`;

export const WATER_FLUX_FRAG = `#version 300 es
${GLSL_PRECISION_HEADER}
in vec2 vUv;
layout(location = 0) out vec4 outFlux;

uniform sampler2D uTerrainTex;
uniform sampler2D uFluxTex;
uniform vec4 uPipeParams; // (gridRes, cellSize, dt, gravity)

void main() {
  ivec2 c = ivec2(gl_FragCoord.xy);
  int maxI = int(uPipeParams.x) - 1;

  vec4 tC = texelFetch(uTerrainTex, c, 0);
  vec4 fOld = texelFetch(uFluxTex, c, 0);

  float water = tC.a;
  if (water <= 1e-5) {
    outFlux = vec4(0.0);
    return;
  }

  float hTotalC = tC.r + tC.g + tC.b + water;

  vec4 tR = texelFetch(uTerrainTex, ivec2(min(maxI, c.x + 1), c.y), 0);
  vec4 tL = texelFetch(uTerrainTex, ivec2(max(0, c.x - 1), c.y), 0);
  vec4 tU = texelFetch(uTerrainTex, ivec2(c.x, min(maxI, c.y + 1)), 0);
  vec4 tD = texelFetch(uTerrainTex, ivec2(c.x, max(0, c.y - 1)), 0);

  vec4 dh = vec4(
    hTotalC - (tR.r + tR.g + tR.b + tR.a),
    hTotalC - (tL.r + tL.g + tL.b + tL.a),
    hTotalC - (tU.r + tU.g + tU.b + tU.a),
    hTotalC - (tD.r + tD.g + tD.b + tD.a)
  );

  float dt = uPipeParams.z;
  float accel = dt * uPipeParams.w / uPipeParams.y;
  vec4 flux = max(vec4(0.0), fOld * 0.96 + dh * accel);

  if (c.x == maxI) flux.x = water * uPipeParams.y * 0.35;
  if (c.x == 0)    flux.y = water * uPipeParams.y * 0.35;
  if (c.y == maxI) flux.z = water * uPipeParams.y * 0.35;
  if (c.y == 0)    flux.w = water * uPipeParams.y * 0.35;

  float sumFlux = flux.x + flux.y + flux.z + flux.w;
  float maxOut = (water * uPipeParams.y * uPipeParams.y) / max(dt, 1e-4);
  if (sumFlux > maxOut && sumFlux > 1e-7) {
    flux *= maxOut / sumFlux;
  }

  outFlux = flux;
}
`;

export const TERRAIN_INTEGRATE_FRAG = `#version 300 es
${GLSL_PRECISION_HEADER}
in vec2 vUv;

layout(location = 0) out vec4 outTerrain;
layout(location = 1) out vec4 outVelocity;

uniform sampler2D uTerrainTex;
uniform sampler2D uDeltaTex;
uniform sampler2D uFluxTex;
uniform sampler2D uSnowTex;

uniform vec4 uIntParams;      // (gridRes, cellSize, dt, evaporation)
uniform vec4 uPipeErode;      // (pipeFlowBlend, erosionStrength, rockHardness, worldSpan)
uniform vec4 uHardnessParams; // (rockHardness, strataStrength, strataFreq, faultWeakness)
uniform vec4 uStrataOrient;   // (sinStrike, cosStrike, tanDip, reliefScale)
uniform vec4 uBrush;          // (brushX, brushZ, brushRadius, brushMode)
uniform vec4 uClimate;        // (snowlineNorm, snowfallRate, glacierStrength, meltRate)
uniform float uBrushStrength;
uniform float uSeed;

${COMMON_GEOLOGY_GLSL}

void main() {
  ivec2 c = ivec2(gl_FragCoord.xy);
  int maxI = int(uIntParams.x) - 1;
  float cellSize = uIntParams.y;
  float dt = uIntParams.z;

  vec4 terr = texelFetch(uTerrainTex, c, 0);
  vec4 delta = texelFetch(uDeltaTex, c, 0);
  vec4 fC = texelFetch(uFluxTex, c, 0);

  float inFromL = c.x > 0    ? texelFetch(uFluxTex, ivec2(c.x - 1, c.y), 0).x : 0.0;
  float inFromR = c.x < maxI ? texelFetch(uFluxTex, ivec2(c.x + 1, c.y), 0).y : 0.0;
  float inFromD = c.y > 0    ? texelFetch(uFluxTex, ivec2(c.x, c.y - 1), 0).z : 0.0;
  float inFromU = c.y < maxI ? texelFetch(uFluxTex, ivec2(c.x, c.y + 1), 0).w : 0.0;

  float totalIn = inFromL + inFromR + inFromD + inFromU;
  float totalOut = fC.x + fC.y + fC.z + fC.w;
  float dWaterPipe = dt * (totalIn - totalOut) / (cellSize * cellSize);

  float qX = 0.5 * ((inFromL - fC.y) + (fC.x - inFromR)) / cellSize;
  float qZ = 0.5 * ((inFromD - fC.w) + (fC.z - inFromU)) / cellSize;
  float avgW = max(0.025, terr.a + 0.5 * dWaterPipe);
  vec2 flowVel = clamp(vec2(qX, qZ) / avgW, vec2(-12.0), vec2(12.0));
  float flowSpeed = length(flowVel);
  float discharge = length(vec2(qX, qZ));

  float dBed = clamp(delta.r, -0.22, 0.05);
  float dCoarse = clamp(delta.g, -0.25, 0.25);
  float dFine = clamp(delta.b, -0.25, 0.25);

  float bedrock = max(1.0, terr.r + dBed);
  float coarse = max(0.0, terr.g + dCoarse);
  float fine = max(0.0, terr.b + dFine);
  float water = max(0.0, terr.a + dWaterPipe + max(0.0, delta.a));

  vec2 worldXZ = (vUv - 0.5) * uPipeErode.w;
  if (uPipeErode.x > 0.01 && water > 0.004) {
    vec4 tR = texelFetch(uTerrainTex, ivec2(min(maxI, c.x + 1), c.y), 0);
    vec4 tL = texelFetch(uTerrainTex, ivec2(max(0, c.x - 1), c.y), 0);
    vec4 tU = texelFetch(uTerrainTex, ivec2(c.x, min(maxI, c.y + 1)), 0);
    vec4 tD = texelFetch(uTerrainTex, ivec2(c.x, max(0, c.y - 1)), 0);
    vec2 sGrad = vec2(
      (tR.r + tR.g + tR.b) - (tL.r + tL.g + tL.b),
      (tU.r + tU.g + tU.b) - (tD.r + tD.g + tD.b)
    ) / (2.0 * cellSize);
    float slope = length(sGrad);
    float hardness = evalRockHardness3D(vec3(worldXZ.x, bedrock, worldXZ.y), uHardnessParams, uStrataOrient, uSeed);

    float shear = discharge * (0.15 + slope) * 2.2;
    float critShear = 0.04 + 0.55 * hardness * hardness;
    if (shear > critShear && slope > 0.06) {
      float streamCut = min(0.035, (shear - critShear) * uPipeErode.y * uPipeErode.x * 0.018 * dt / (0.15 + 2.5 * hardness));
      bedrock = max(1.0, bedrock - streamCut);
      fine += streamCut * 0.18;
    } else if (flowSpeed < 0.85 && water > 0.012 && slope < 0.09) {
      fine += min(0.008, water * 0.012 * uPipeErode.x * dt);
    }
  }

  int bMode = int(abs(uBrush.w) + 0.5);
  if (bMode > 0 && uBrush.z > 0.5) {
    float dist = length(worldXZ - uBrush.xy);
    if (dist < uBrush.z) {
      float falloff = sq(max(0.0, 1.0 - dist / uBrush.z));
      if (bMode == 1) {
        water += falloff * uBrushStrength * 0.45 * dt * 8.0;
      } else if (bMode == 2) {
        bedrock += falloff * uBrushStrength * 28.0 * dt;
      } else if (bMode == 3) {
        float carveAmt = falloff * uBrushStrength * 28.0 * dt;
        float rmFine = min(fine, carveAmt);
        fine -= rmFine;
        float rmCoarse = min(coarse, carveAmt - rmFine);
        coarse -= rmCoarse;
        bedrock = max(1.0, bedrock - max(0.0, carveAmt - rmFine - rmCoarse));
      }
    }
  }

  // ==========================================================================
  // CRYOSPHERE COUPLING: GLACIER ABRASION, PLUCKING & SNOWMELT FEEDING THE RUNOFF
  // ==========================================================================
  vec4 snowC = texelFetch(uSnowTex, c, 0);
  float snowDepth = max(0.0, snowC.r);
  float iceDepth = max(0.0, snowC.g);

  float reliefScale = max(1.0, uStrataOrient.w);
  float elevN = (bedrock + coarse + fine) / reliefScale;
  float snowlineY = clamp(uClimate.x, 0.02, 1.05) * reliefScale;

  // Degree-day snowmelt & ice ablation recharge the surface runoff field (glacial rivers!)
  float meltPotential = clamp((snowlineY - (bedrock + coarse + fine)) / reliefScale, 0.0, 1.0);
  float meltWater = (snowDepth * 0.075 + iceDepth * 0.045) * uClimate.w * meltPotential * dt;
  water += meltWater;

  // Glacier ice grinds bedrock into U-shaped troughs (Glen nonlinear flow + plucking)
  if (iceDepth > 0.02 && c.x > 0 && c.x < maxI && c.y > 0 && c.y < maxI) {
    vec4 gR = texelFetch(uTerrainTex, ivec2(c.x + 1, c.y), 0);
    vec4 gL = texelFetch(uTerrainTex, ivec2(c.x - 1, c.y), 0);
    vec4 gU = texelFetch(uTerrainTex, ivec2(c.x, c.y + 1), 0);
    vec4 gD = texelFetch(uTerrainTex, ivec2(c.x, c.y - 1), 0);
    vec2 gSurf = vec2(
      (gR.r + gR.g + gR.b) - (gL.r + gL.g + gL.b),
      (gU.r + gU.g + gU.b) - (gD.r + gD.g + gD.b)
    ) / (2.0 * cellSize);
    float iceSlope = length(gSurf);
    float iceHardness = evalRockHardness3D(vec3(worldXZ.x, bedrock, worldXZ.y), uHardnessParams, uStrataOrient, uSeed);
    float grind = clamp(iceDepth * iceSlope * iceSlope * 0.55, 0.0, 0.055) * uClimate.z * dt;
    float pluck = min(max(0.0, bedrock - 1.0), grind / (0.25 + 2.2 * iceHardness));
    bedrock = max(1.0, bedrock - pluck);
    fine += pluck * 0.55;
    coarse += pluck * 0.45;
  }

  if (c.x == 0 || c.x == maxI || c.y == 0 || c.y == maxI) {
    water *= 0.65;
  } else {
    water = max(0.0, water * (1.0 - uIntParams.w * 0.035 * dt) - 0.00015 * dt);
  }

  outTerrain = vec4(bedrock, coarse, fine, water);
  outVelocity = vec4(flowVel.x, flowVel.y, flowSpeed * avgW, discharge);
}
`;

export const SNOW_CRYO_FRAG = `#version 300 es
${GLSL_PRECISION_HEADER}
in vec2 vUv;
layout(location = 0) out vec4 outSnow;

uniform sampler2D uTerrainTex;
uniform sampler2D uSnowTex;
uniform sampler2D uSnowDeltaTex;
uniform vec4 uCryoParams;     // (gridRes, cellSize, dt, worldSpan)
uniform vec4 uClimate;        // (snowlineNorm, snowfallRate, glacierStrength, meltRate)
uniform vec4 uStrataOrient;   // (sinStrike, cosStrike, tanDip, reliefScale)
uniform float uSeed;

${COMMON_GEOLOGY_GLSL}

void main() {
  ivec2 c = ivec2(gl_FragCoord.xy);
  int maxI = int(uCryoParams.x) - 1;
  float cellSize = uCryoParams.y;
  float dt = uCryoParams.z;

  vec4 snowC = texelFetch(uSnowTex, c, 0);
  vec4 snowDelta = texelFetch(uSnowDeltaTex, c, 0);
  vec4 terr = texelFetch(uTerrainTex, c, 0);

  float snowDepth = max(0.0, snowC.r + snowDelta.r);
  float iceDepth = max(0.0, snowC.g + snowDelta.g);

  float reliefScale = max(1.0, uStrataOrient.w);
  float elevN = (terr.r + terr.g + terr.b) / reliefScale;

  if (c.x > 0 && c.x < maxI && c.y > 0 && c.y < maxI) {
    vec4 tR = texelFetch(uTerrainTex, ivec2(c.x + 1, c.y), 0);
    vec4 tL = texelFetch(uTerrainTex, ivec2(c.x - 1, c.y), 0);
    vec4 tU = texelFetch(uTerrainTex, ivec2(c.x, c.y + 1), 0);
    vec4 tD = texelFetch(uTerrainTex, ivec2(c.x, c.y - 1), 0);
    float hR = tR.r + tR.g + tR.b;
    float hL = tL.r + tL.g + tL.b;
    float hU = tU.r + tU.g + tU.b;
    float hD = tD.r + tD.g + tD.b;
    vec2 g = vec2(hR - hL, hU - hD) / (2.0 * cellSize);
    float slope = length(g);

    // Wind-scoured convex crests lose their snow cover to the katabatic gale
    float convexity = (hR + hL + hU + hD) * 0.25 - (terr.r + terr.g + terr.b);
    if (convexity < -0.04 && snowDepth > 0.02) {
      snowDepth = max(0.0, snowDepth - min(snowDepth * 0.04, 0.009) * uClimate.y * 26.0);
    }

    // Snow cannot cling to over-steep faces: it avalanches off and joins the runout below
    if (slope > 0.75 && snowDepth > 0.03) {
      float shed = min(snowDepth * 0.22, (slope - 0.75) * 0.45);
      snowDepth -= shed;
    }
  }

  // Firn compaction into flowing glacier ice in high cold accumulation basins
  float compaction = min(snowDepth * 0.20, snowDepth * smoothstep(0.30, 0.85, elevN) * uClimate.z * 0.55 * dt);
  snowDepth -= compaction;
  iceDepth += compaction;

  // Degree-day ablation turns low-altitude snow & ice into meltwater runoff
  float snowlineNorm = clamp(uClimate.x, 0.02, 1.05);
  float warmth = clamp((snowlineNorm - elevN) / max(snowlineNorm, 0.05), 0.0, 1.0);
  float melt = min(snowDepth, snowDepth * 0.09 * uClimate.w * warmth * dt * 26.0);
  snowDepth -= melt;
  float iceMelt = min(iceDepth, iceDepth * 0.05 * uClimate.w * warmth * dt * 26.0);
  iceDepth -= iceMelt;

  if (c.x == 0 || c.x == maxI || c.y == 0 || c.y == maxI) {
    snowDepth *= 0.90;
    iceDepth *= 0.94;
  }

  outSnow = vec4(min(snowDepth, 9.0), min(iceDepth, 22.0), melt, iceMelt);
}
`;

export const THERMAL_TALUS_FRAG = `#version 300 es
${GLSL_PRECISION_HEADER}
in vec2 vUv;
layout(location = 0) out vec4 outTerrain;

uniform sampler2D uTerrainTex;
uniform vec4 uTalusParams;    // (gridRes, cellSize, talusControl, worldSpan)
uniform vec4 uHardnessParams; // (rockHardness, strataStrength, strataFreq, faultWeakness)
uniform vec4 uStrataOrient;   // (sinStrike, cosStrike, tanDip, reliefScale)
uniform float uSeed;

${COMMON_GEOLOGY_GLSL}

void main() {
  ivec2 c = ivec2(gl_FragCoord.xy);
  int maxI = int(uTalusParams.x) - 1;
  float cellSize = uTalusParams.y;

  vec4 tC = texelFetch(uTerrainTex, c, 0);
  if (c.x <= 0 || c.x >= maxI || c.y <= 0 || c.y >= maxI) {
    outTerrain = tC;
    return;
  }

  float hC = tC.r + tC.g + tC.b;
  vec2 worldXZ = (vUv - 0.5) * uTalusParams.w;
  float hardC = evalRockHardness3D(vec3(worldXZ.x, tC.r, worldXZ.y), uHardnessParams, uStrataOrient, uSeed);

  float talusTan = 0.48 + 0.34 * uTalusParams.z;
  float fineTan  = 0.24 + 0.18 * uTalusParams.z;
  float cliffTan = 0.78 + 2.45 * hardC * hardC;

  float netCoarse = 0.0;
  float netFine = 0.0;
  float bedCalveLoss = 0.0;

  const ivec2 offs[8] = ivec2[8](
    ivec2( 1,  0), ivec2(-1,  0), ivec2( 0,  1), ivec2( 0, -1),
    ivec2( 1,  1), ivec2(-1, -1), ivec2( 1, -1), ivec2(-1,  1)
  );

  for (int i = 0; i < 8; i++) {
    ivec2 nb = c + offs[i];
    float dist = (i < 4 ? 1.0 : 1.41421356) * cellSize;
    vec4 tN = texelFetch(uTerrainTex, nb, 0);
    float hN = tN.r + tN.g + tN.b;
    float diff = hC - hN;

    float maxDiffFine = fineTan * dist;
    if (diff > maxDiffFine && tC.b > 1e-5) {
      netFine -= min(tC.b * 0.11, (diff - maxDiffFine) * 0.085);
    } else if (-diff > maxDiffFine && tN.b > 1e-5) {
      netFine += min(tN.b * 0.11, (-diff - maxDiffFine) * 0.085);
    }

    float maxDiffCoarse = talusTan * dist;
    if (diff > maxDiffCoarse && tC.g > 1e-5) {
      netCoarse -= min(tC.g * 0.10, (diff - maxDiffCoarse) * 0.075);
    } else if (-diff > maxDiffCoarse && tN.g > 1e-5) {
      netCoarse += min(tN.g * 0.10, (-diff - maxDiffCoarse) * 0.075);
    }

    float maxDiffCliff = cliffTan * dist;
    if (diff > maxDiffCliff && tC.g < 0.05) {
      float calve = min(max(0.0, tC.r - 1.0) * 0.04, (diff - maxDiffCliff) * 0.032);
      bedCalveLoss += calve;
    } else if (-diff > 0.78 * dist) {
      vec2 nbXZ = ((vec2(nb) + 0.5) / uTalusParams.x - 0.5) * uTalusParams.w;
      float hardN = evalRockHardness3D(vec3(nbXZ.x, tN.r, nbXZ.y), uHardnessParams, uStrataOrient, uSeed);
      float nbCliffMax = (0.78 + 2.45 * hardN * hardN) * dist;
      if (-diff > nbCliffMax && tN.g < 0.05) {
        netCoarse += min(max(0.0, tN.r - 1.0) * 0.04, (-diff - nbCliffMax) * 0.032);
      }
    }
  }

  outTerrain = vec4(
    max(1.0, tC.r - bedCalveLoss),
    max(0.0, tC.g + netCoarse),
    max(0.0, tC.b + netFine),
    tC.a
  );
}
`;

export const TERRAIN_RENDER_VERT = `#version 300 es
${GLSL_PRECISION_HEADER}

layout(location = 0) in vec2 aGridUv;

uniform sampler2D uTerrainTex;
uniform sampler2D uSnowTex;
uniform mat4 uViewProj;
uniform vec4 uRenderDomain; // (worldSpan, gridRes, reserved, reserved)

out vec2 vUv;
out vec3 vWorldPos;
out vec4 vLayers;

void main() {
  vec2 clampedUv = clamp(aGridUv, vec2(0.0), vec2(1.0));
  ivec2 tc = clamp(ivec2(clampedUv * (uRenderDomain.y - 1.0) + 0.5), ivec2(0), ivec2(int(uRenderDomain.y) - 1));
  vec4 terr = texelFetch(uTerrainTex, tc, 0);
  vec4 cryo = texelFetch(uSnowTex, tc, 0);

  // Water is rendered as its own displaced 2.5D surface pass over the bedrock heightfield.
  // Snowpack & glacier ice physically raise the visible terrain (capped so drifts never balloon).
  float cryoLift = min(3.4, cryo.r * 0.85 + cryo.g * 0.62);
  float hSurf = terr.r + terr.g + terr.b + cryoLift;

  vec2 xz = (clampedUv - 0.5) * uRenderDomain.x;
  bool isSkirt = aGridUv.x < -0.0001 || aGridUv.x > 1.0001 || aGridUv.y < -0.0001 || aGridUv.y > 1.0001;
  float y = isSkirt ? 0.0 : hSurf;

  vec3 wp = vec3(xz.x, y, xz.y);
  vUv = clampedUv;
  vWorldPos = wp;
  vLayers = isSkirt ? vec4(wp.y, 0.0, 0.0, 0.0) : terr;
  gl_Position = uViewProj * vec4(wp, 1.0);
}
`;

export const TERRAIN_RENDER_FRAG = `#version 300 es
${GLSL_PRECISION_HEADER}

in vec2 vUv;
in vec3 vWorldPos;
in vec4 vLayers;

layout(location = 0) out vec4 outColor;

uniform sampler2D uTerrainTex;
uniform sampler2D uInitialTex;
uniform sampler2D uVelocityFieldTex;

uniform sampler2D uSnowTex;

uniform vec3 uCameraPos;
uniform vec3 uSunDir;
uniform vec4 uRenderDomain;   // (worldSpan, gridRes, reserved, reserved)
uniform vec4 uHardnessParams; // (rockHardness, strataStrength, strataFreq, faultWeakness)
uniform vec4 uStrataOrient;   // (sinStrike, cosStrike, tanDip, reliefScale)
uniform vec4 uBrush;          // (brushX, brushZ, brushRadius, brushMode)
uniform vec4 uClimate;        // (snowlineNorm, snowfallRate, glacierStrength, meltRate)
uniform int uViewMode;
uniform int uMaterialTheme;   // 0 Utah, 1 Iceland, 2 Himalaya, 3 Canyonlands, 4 Erg, 5 Karst, 6 Fjord
uniform float uSeed;

${COMMON_GEOLOGY_GLSL}

float sampleTerrainShadow(vec2 startUv, float startH, vec3 sunDir, float span, float res) {
  float stepLenWorld = length(sunDir.xz);
  if (stepLenWorld < 1e-4) return 1.0;

  float shadow = 1.0;
  float t = (span / res) * 1.4;
  vec2 marchDir = sunDir.xz / stepLenWorld;
  for (int i = 0; i < 18; i++) {
    vec2 suv = startUv + marchDir * (t / span);
    if (suv.x <= 0.0 || suv.x >= 1.0 || suv.y <= 0.0 || suv.y >= 1.0) break;
    vec4 st = sampleGridBilinear(uTerrainTex, suv, res);
    float sh = st.r + st.g + st.b;
    float rayH = startH + (sunDir.y / stepLenWorld) * t;
    float diff = rayH - sh;
    if (diff < 0.0) return 0.14;
    shadow = min(shadow, clamp(3.2 * diff / max(t * 0.18, 0.5), 0.14, 1.0));
    t *= 1.24;
  }
  return shadow;
}

void main() {
  float span = uRenderDomain.x;
  float res = uRenderDomain.y;
  float cellSize = span / res;
  float eps = 1.0 / res;

  vec4 tC = sampleGridBilinear(uTerrainTex, vUv, res);
  vec4 tR = sampleGridBilinear(uTerrainTex, vUv + vec2(eps, 0.0), res);
  vec4 tL = sampleGridBilinear(uTerrainTex, vUv - vec2(eps, 0.0), res);
  vec4 tU = sampleGridBilinear(uTerrainTex, vUv + vec2(0.0, eps), res);
  vec4 tD = sampleGridBilinear(uTerrainTex, vUv - vec2(0.0, eps), res);

  float hC = tC.r + tC.g + tC.b;
  float hR = tR.r + tR.g + tR.b;
  float hL = tL.r + tL.g + tL.b;
  float hU = tU.r + tU.g + tU.b;
  float hD = tD.r + tD.g + tD.b;

  bool isSideSkirt = vWorldPos.y < hC - 0.6;
  vec3 bedNormal;
  if (isSideSkirt) {
    vec2 edgeD = vUv - 0.5;
    bedNormal = abs(edgeD.x) > abs(edgeD.y)
      ? vec3(sign(edgeD.x), 0.05, 0.0)
      : vec3(0.0, 0.05, sign(edgeD.y));
    bedNormal = safeNorm3(bedNormal, vec3(0.0, 1.0, 0.0));
  } else {
    bedNormal = safeNorm3(vec3(hL - hR, 2.0 * cellSize, hD - hU), vec3(0.0, 1.0, 0.0));
  }

  float lap1 = (hR + hL + hU + hD) * 0.25 - hC;
  float eps3 = 3.5 / res;
  float lap2 = (
    sampleGridBilinear(uTerrainTex, vUv + vec2(eps3, 0.0), res).r +
    sampleGridBilinear(uTerrainTex, vUv - vec2(eps3, 0.0), res).r +
    sampleGridBilinear(uTerrainTex, vUv + vec2(0.0, eps3), res).r +
    sampleGridBilinear(uTerrainTex, vUv - vec2(0.0, eps3), res).r
  ) * 0.25 - tC.r;
  float ao = isSideSkirt ? 0.72 : clamp(1.0 - clamp(lap1 * 0.22 + lap2 * 0.055, -0.25, 0.68), 0.30, 1.08);
  float ridgeConvex = clamp(-lap1 * 0.32, 0.0, 1.0);

  float rockY = isSideSkirt ? vWorldPos.y : tC.r;
  float hardness = evalRockHardness3D(vec3(vWorldPos.x, rockY, vWorldPos.z), uHardnessParams, uStrataOrient, uSeed);

  float grain = noise2D(vWorldPos.xz * 0.55 + rockY * 0.35) - 0.5;
  float patchN = fbm2D(vWorldPos.xz * 0.045, 3, 0.55) - 0.5;

  // ==========================================================================
  // REGIONAL LITHOLOGY PALETTES (Utah Desert / Icelandic Volcanic / Himalayan Gneiss)
  // ==========================================================================
  vec3 softRockCol;
  vec3 midRockCol;
  vec3 hardRockCol;
  vec3 summitCol;
  vec3 basinFloorCol;
  vec3 coarseGravelCol;
  vec3 fineAlluvialCol;
  vec3 mossCol = vec3(0.0);

  if (uMaterialTheme == 1) {
    // ICELANDIC VOLCANIC: black basalt, oxidised rhyolite, subarctic moss and black sand
    softRockCol    = vec3(0.048, 0.047, 0.050);
    midRockCol     = vec3(0.120, 0.064, 0.044);
    hardRockCol    = vec3(0.198, 0.122, 0.082);
    summitCol      = vec3(0.270, 0.272, 0.288);
    basinFloorCol  = vec3(0.034, 0.034, 0.037);
    coarseGravelCol = vec3(0.092, 0.090, 0.094);
    fineAlluvialCol = vec3(0.062, 0.058, 0.056);
    mossCol         = vec3(0.098, 0.140, 0.052);
  } else if (uMaterialTheme == 2) {
    // HIMALAYAN GNEISS: banded biotite gneiss, leucogranite sills and moraine till
    softRockCol    = vec3(0.098, 0.094, 0.100);
    midRockCol     = vec3(0.188, 0.180, 0.180);
    hardRockCol    = vec3(0.330, 0.300, 0.290);
    summitCol      = vec3(0.385, 0.380, 0.390);
    basinFloorCol  = vec3(0.112, 0.104, 0.098);
    coarseGravelCol = vec3(0.232, 0.212, 0.190);
    fineAlluvialCol = vec3(0.300, 0.262, 0.208);
  } else if (uMaterialTheme == 3) {
    // CANYONLANDS LAYER CAKE: dark Moenkopi shale, russet sandstone, cream caprock and talus
    softRockCol    = vec3(0.115, 0.060, 0.045);
    midRockCol     = vec3(0.285, 0.125, 0.070);
    hardRockCol    = vec3(0.490, 0.325, 0.190);
    summitCol      = vec3(0.585, 0.455, 0.315);
    basinFloorCol  = vec3(0.085, 0.063, 0.047);
    coarseGravelCol = vec3(0.300, 0.205, 0.135);
    fineAlluvialCol = vec3(0.455, 0.285, 0.145);
  } else if (uMaterialTheme == 4) {
    // SAHARA ERG: warm quartz sand, sun-bleached dune crests, iron-rich exposed ribs
    softRockCol    = vec3(0.235, 0.135, 0.055);
    midRockCol     = vec3(0.425, 0.275, 0.125);
    hardRockCol    = vec3(0.620, 0.435, 0.230);
    summitCol      = vec3(0.720, 0.580, 0.360);
    basinFloorCol  = vec3(0.155, 0.102, 0.050);
    coarseGravelCol = vec3(0.500, 0.345, 0.180);
    fineAlluvialCol = vec3(0.665, 0.485, 0.270);
  } else if (uMaterialTheme == 5) {
    // KARST CARBONATE: cool grey limestone, ivory dolomite, moss-darkened spring sink basins
    softRockCol    = vec3(0.205, 0.208, 0.195);
    midRockCol     = vec3(0.355, 0.360, 0.335);
    hardRockCol    = vec3(0.535, 0.520, 0.470);
    summitCol      = vec3(0.625, 0.610, 0.550);
    basinFloorCol  = vec3(0.100, 0.135, 0.120);
    coarseGravelCol = vec3(0.360, 0.345, 0.305);
    fineAlluvialCol = vec3(0.505, 0.485, 0.425);
  } else if (uMaterialTheme == 6) {
    // NORTH ATLANTIC FJORD: blue-grey gneiss, wet granite, glacial moraine
    softRockCol    = vec3(0.105, 0.125, 0.145);
    midRockCol     = vec3(0.205, 0.230, 0.250);
    hardRockCol    = vec3(0.365, 0.385, 0.390);
    summitCol      = vec3(0.490, 0.505, 0.510);
    basinFloorCol  = vec3(0.070, 0.090, 0.105);
    coarseGravelCol = vec3(0.230, 0.250, 0.260);
    fineAlluvialCol = vec3(0.340, 0.360, 0.360);
  } else {
    // UTAH DESERT: Moenkopi shale, Wingate sandstone, Navajo caprock, ochre alluvial fans
    softRockCol    = vec3(0.115, 0.068, 0.062);
    midRockCol     = vec3(0.285, 0.148, 0.088);
    hardRockCol    = vec3(0.395, 0.305, 0.215);
    summitCol      = vec3(0.225, 0.218, 0.212);
    basinFloorCol  = vec3(0.095, 0.088, 0.082);
    coarseGravelCol = vec3(0.235, 0.215, 0.192);
    fineAlluvialCol = vec3(0.455, 0.335, 0.185);
  }

  vec3 rockAlbedo = hardness < 0.5
    ? mix(softRockCol, midRockCol, hardness * 2.0)
    : mix(midRockCol, hardRockCol, (hardness - 0.5) * 2.0);

  float elevFrac = clamp(rockY / max(uStrataOrient.w, 1.0), 0.0, 1.2);
  rockAlbedo = mix(rockAlbedo, summitCol, smoothstep(0.76, 1.08, elevFrac) * 0.48);
  rockAlbedo = mix(basinFloorCol, rockAlbedo, smoothstep(0.03, 0.20, elevFrac));
  rockAlbedo *= (1.0 + 0.12 * grain + 0.10 * patchN + 0.12 * ridgeConvex);

  // Multi-frequency procedural surface families: warped bedding, dune grain and karst pitting.
  float acrossStrike = vWorldPos.x * uStrataOrient.x + vWorldPos.z * uStrataOrient.y;
  float stratCoord = vWorldPos.y + acrossStrike * uStrataOrient.z;
  float bedPhase = stratCoord * (0.045 * max(2.0, uHardnessParams.z)) + patchN * 0.75;
  float bedWave = 0.5 + 0.5 * sin(bedPhase);
  float bedLamina = pow(max(0.0, bedWave), 9.0);
  float bedStrength = (uMaterialTheme == 0 || uMaterialTheme == 3 || uMaterialTheme == 5)
    ? 0.15 * uHardnessParams.y : 0.07 * uHardnessParams.y;
  rockAlbedo = mix(rockAlbedo * (0.92 + 0.16 * bedWave), hardRockCol * (0.92 + 0.12 * grain), bedLamina * bedStrength);

  if (uMaterialTheme == 4) {
    float windGrain = 0.5 + 0.5 * sin(dot(vWorldPos.xz, vec2(0.83, 0.56)) * 2.2 + patchN * 4.0);
    rockAlbedo *= 0.94 + 0.12 * windGrain;
  } else if (uMaterialTheme == 5) {
    float solutionPits = ridgedFbm2D(vWorldPos.xz * 0.18 + patchN * 3.2, 4, 0.52);
    rockAlbedo *= 0.91 + 0.15 * solutionPits;
  }

  // Icelandic subarctic vegetation belt: moss & lichen colonise gentle low & mid slopes
  if (uMaterialTheme == 1) {
    float mossFlora = smoothstep(0.42, 0.90, bedNormal.y)
      * (1.0 - smoothstep(0.34, 0.68, elevFrac))
      * smoothstep(0.05, 0.42, fbm2D(vWorldPos.xz * 0.030 + 11.7, 3, 0.55));
    mossCol *= (0.85 + 0.30 * patchN + 0.20 * grain);
    rockAlbedo = mix(rockAlbedo, mossCol, mossFlora * 0.80);
  }

  // ==========================================================================
  // CRYOSPHERE: SNOWPACK, WIND-DRIFTED SNOW COVER, CREVASSED GLACIER ICE & FIRN
  // ==========================================================================
  vec4 snowCell = isSideSkirt ? vec4(0.0) : sampleGridBilinear(uSnowTex, vUv, res);
  float snowDepth = snowCell.r;
  float iceDepth = snowCell.g;
  float snowlineY = clamp(uClimate.x, 0.02, 1.05) * max(uStrataOrient.w, 1.0);

  // Snow bridges ledges & rime coats steep faces; only sheer overhangs stay bare rock
  float slopeHold = 1.0 - smoothstep(0.74, 0.96, 1.0 - bedNormal.y);
  // Wind-sculpted snow cover: patchy ribs of bare rock stay visible on windward faces so the
  // underlying strata never disappear under a flat white blanket
  float snowPatch = 0.55 + 0.45 * ridgedFbm2D(vWorldPos.xz * 0.055 + 5.3, 3, 0.5);
  float snowCover = isSideSkirt ? 0.0
    : smoothstep(0.05, 0.55, snowDepth) * slopeHold
      * (0.40 + 0.60 * smoothstep(snowlineY * 0.55, snowlineY * 1.05, rockY))
      * clamp(snowPatch, 0.35, 1.0);
  float iceCover = isSideSkirt ? 0.0 : smoothstep(0.08, 0.85, iceDepth) * slopeHold;

  // Fresh snow is high-albedo; shaded snow picks up the cold blue sky bounce
  vec3 snowAlbedo = mix(vec3(0.52, 0.58, 0.67), vec3(0.85, 0.89, 0.94), clamp(bedNormal.y, 0.0, 1.0));
  snowAlbedo *= (1.0 + 0.05 * grain - 0.05 * patchN);
  // Glacier ice: dense blue crevassed ice with wind-scoured firn bands
  float crevasse = smoothstep(0.55, 0.95, ridgedFbm2D(vWorldPos.xz * 0.085 + vWorldPos.y * 0.02, 4, 0.55));
  vec3 iceAlbedo = mix(vec3(0.255, 0.470, 0.610), vec3(0.520, 0.760, 0.860), 1.0 - crevasse * 0.55);
  iceAlbedo = mix(iceAlbedo, vec3(0.845, 0.900, 0.940), smoothstep(0.34, 0.90, elevFrac) * 0.42);

  vec3 surfaceAlbedo = rockAlbedo;
  surfaceAlbedo = mix(surfaceAlbedo, coarseGravelCol * (1.0 + 0.15 * grain), (isSideSkirt ? 0.0 : smoothstep(0.012, 0.24, tC.g)) * 0.88);
  surfaceAlbedo = mix(surfaceAlbedo, fineAlluvialCol * (1.0 + 0.10 * patchN + 0.08 * grain), (isSideSkirt ? 0.0 : smoothstep(0.008, 0.18, tC.b)) * 0.92);
  surfaceAlbedo = mix(surfaceAlbedo, iceAlbedo, iceCover * 0.94);
  surfaceAlbedo = mix(surfaceAlbedo, snowAlbedo, snowCover * 0.97);

  float coarseMask = isSideSkirt ? 0.0 : smoothstep(0.012, 0.24, tC.g);
  float fineMask   = isSideSkirt ? 0.0 : smoothstep(0.008, 0.18, tC.b);

  float wetness = isSideSkirt ? 0.0 : smoothstep(0.001, 0.025, tC.a);
  surfaceAlbedo *= mix(1.0, 0.68, wetness * 0.55 * (1.0 - snowCover));

  if (uViewMode == 1) {
    float initB = sampleGridBilinear(uInitialTex, vUv, res).r;
    float cutDepth = max(0.0, initB - tC.r);
    float sedDepth = tC.g + tC.b;
    vec3 baseNeutral = vec3(0.16, 0.165, 0.175);
    vec3 cutCol = mix(vec3(0.55, 0.16, 0.08), vec3(0.88, 0.38, 0.12), clamp(cutDepth / 8.0, 0.0, 1.0));
    vec3 sedCol = mix(vec3(0.12, 0.48, 0.42), vec3(0.82, 0.62, 0.16), tC.b / max(sedDepth, 1e-4));
    surfaceAlbedo = baseNeutral;
    surfaceAlbedo = mix(surfaceAlbedo, cutCol, smoothstep(0.04, 2.2, cutDepth));
    surfaceAlbedo = mix(surfaceAlbedo, sedCol, smoothstep(0.02, 0.65, sedDepth));
  } else if (uViewMode == 2) {
    surfaceAlbedo = mix(vec3(0.07, 0.22, 0.36), vec3(0.72, 0.44, 0.12), hardness);
  } else if (uViewMode == 3) {
    vec4 velData = sampleGridBilinear(uVelocityFieldTex, vUv, res);
    float qNorm = clamp(velData.w * 2.4 + tC.a * 3.0, 0.0, 1.0);
    surfaceAlbedo = mix(vec3(0.12, 0.13, 0.15), mix(vec3(0.06, 0.42, 0.72), vec3(0.85, 0.92, 0.98), qNorm), smoothstep(0.01, 0.65, qNorm));
  } else if (uViewMode == 4) {
    surfaceAlbedo = vec3(0.28, 0.27, 0.26);
  } else if (uViewMode == 5) {
    // Cryosphere diagnostic: snowpack (white), glacier ice (cyan), exposed bedrock (charcoal)
    surfaceAlbedo = mix(vec3(0.10, 0.105, 0.115), vec3(0.88, 0.92, 0.985), smoothstep(0.01, 0.30, snowDepth));
    surfaceAlbedo = mix(surfaceAlbedo, vec3(0.12, 0.62, 0.90), smoothstep(0.02, 0.70, iceDepth) * 0.92);
  } else if (uViewMode == 6) {
    // Water inspection mode keeps dry terrain neutral so the independent 2.5D water surface reads clearly.
    surfaceAlbedo = vec3(0.16, 0.18, 0.20) * (0.86 + 0.18 * ridgeConvex);
  }

  vec3 L = safeNorm3(uSunDir, vec3(0.4, 0.8, 0.4));
  vec3 V = safeNorm3(uCameraPos - vWorldPos, vec3(0.0, 1.0, 0.0));
  float shadow = isSideSkirt ? 0.65 : sampleTerrainShadow(vUv, hC + 0.18, L, span, res);
  float ndotl = max(0.0, dot(bedNormal, L));

  vec3 sunRadiance = vec3(2.35, 2.20, 1.98) * ndotl * shadow;
  float skyHemi = 0.5 + 0.5 * bedNormal.y;
  vec3 groundBounce = (uMaterialTheme == 1 || uMaterialTheme == 2 || uMaterialTheme == 6)
    ? vec3(0.100, 0.125, 0.160)
    : (uMaterialTheme == 5 ? vec3(0.16, 0.17, 0.16) : vec3(0.18, 0.15, 0.13));
  vec3 ambient = mix(groundBounce, vec3(0.36, 0.44, 0.56), skyHemi) * ao;
  // Snow & ice scatter light: they pick up stronger, cooler skylight than bare rock
  ambient = mix(ambient, vec3(0.42, 0.52, 0.68) * ao, max(snowCover * 0.72, iceCover * 0.55));

  vec3 litColor = surfaceAlbedo * (sunRadiance + ambient);

  // Glossy specular sheen off glacier ice & wet snow surfaces
  if (iceCover > 0.02 || snowCover > 0.02) {
    vec3 Hs = safeNorm3(L + V, vec3(0.0, 1.0, 0.0));
    float specCryo = pow(max(1e-5, dot(bedNormal, Hs)), 42.0) * shadow;
    litColor += vec3(0.42, 0.58, 0.72) * specCryo * (iceCover * 0.55 + snowCover * 0.16);
  }

  if (!isSideSkirt && uBrush.z > 0.5 && abs(uBrush.w) > 0.1) {
    float bDist = length(vWorldPos.xz - uBrush.xy);
    float ring = 1.0 - smoothstep(0.0, cellSize * 1.8, abs(bDist - uBrush.z));
    vec3 ringCol = abs(uBrush.w) < 1.5 ? vec3(0.25, 0.72, 1.0) : vec3(1.0, 0.62, 0.20);
    litColor = mix(litColor, ringCol, ring * 0.75);
  }

  float camDist = length(uCameraPos - vWorldPos);
  float fog = 1.0 - exp(-max(0.0, camDist - span * 0.55) * 0.0009);
  litColor = mix(litColor, vec3(0.045, 0.055, 0.070), clamp(fog, 0.0, 0.45));

  vec3 x = max(vec3(0.0), litColor);
  vec3 mapped = (x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14);
  outColor = vec4(pow(max(vec3(1e-6), clamp(mapped, 0.0, 1.0)), vec3(1.0 / 2.2)), 1.0);
}
`;

export const WATER_RENDER_VERT = `#version 300 es
${GLSL_PRECISION_HEADER}
layout(location = 0) in vec2 aGridUv;

uniform sampler2D uTerrainTex;
uniform mat4 uViewProj;
uniform vec4 uRenderDomain; // (worldSpan, gridRes, enabled, timeSec)

out vec2 vUv;
out vec3 vWorldPos;

void main() {
  vec2 clampedUv = clamp(aGridUv, vec2(0.0), vec2(1.0));
  ivec2 tc = clamp(ivec2(clampedUv * (uRenderDomain.y - 1.0) + 0.5), ivec2(0), ivec2(int(uRenderDomain.y) - 1));
  vec4 terr = texelFetch(uTerrainTex, tc, 0);
  vec2 xz = (clampedUv - 0.5) * uRenderDomain.x;
  vUv = aGridUv;
  vWorldPos = vec3(xz.x, terr.r + terr.g + terr.b + terr.a, xz.y);
  gl_Position = uViewProj * vec4(vWorldPos, 1.0);
}
`;

export const WATER_RENDER_FRAG = `#version 300 es
${GLSL_PRECISION_HEADER}
in vec2 vUv;
in vec3 vWorldPos;
layout(location = 0) out vec4 outColor;

uniform sampler2D uTerrainTex;
uniform sampler2D uVelocityFieldTex;
uniform vec3 uCameraPos;
uniform vec3 uSunDir;
uniform vec4 uRenderDomain; // (worldSpan, gridRes, enabled, timeSec)
uniform vec4 uWaterStyle;   // (materialTheme, waterInspectionMode, reserved, reserved)

${COMMON_GEOLOGY_GLSL}

void main() {
  if (any(lessThan(vUv, vec2(0.0))) || any(greaterThan(vUv, vec2(1.0))) || uRenderDomain.z < 0.5) discard;
  float span = uRenderDomain.x;
  float res = uRenderDomain.y;
  float cellSize = span / res;
  int maxI = int(res) - 1;
  ivec2 tc = clamp(ivec2(vUv * (res - 1.0) + 0.5), ivec2(0), ivec2(maxI));
  vec4 tC = texelFetch(uTerrainTex, tc, 0);
  if (tC.a < 0.006) discard;

  vec4 tR = texelFetch(uTerrainTex, ivec2(min(maxI, tc.x + 1), tc.y), 0);
  vec4 tL = texelFetch(uTerrainTex, ivec2(max(0, tc.x - 1), tc.y), 0);
  vec4 tU = texelFetch(uTerrainTex, ivec2(tc.x, min(maxI, tc.y + 1)), 0);
  vec4 tD = texelFetch(uTerrainTex, ivec2(tc.x, max(0, tc.y - 1)), 0);
  float hR = tR.r + tR.g + tR.b + tR.a;
  float hL = tL.r + tL.g + tL.b + tL.a;
  float hU = tU.r + tU.g + tU.b + tU.a;
  float hD = tD.r + tD.g + tD.b + tD.a;

  vec4 flow = texelFetch(uVelocityFieldTex, tc, 0);
  float timeSec = uRenderDomain.w;
  vec2 flowUv = vWorldPos.xz * 0.075 - flow.xy * timeSec * 0.045;
  float rippleA = sin(flowUv.x * 3.1 + sin(flowUv.y * 1.7 + timeSec * 0.6));
  float rippleB = sin(flowUv.y * 2.4 - timeSec * 0.85 + flowUv.x * 0.8);
  float waveAmp = 0.018 + 0.030 * clamp(flow.z, 0.0, 3.0);
  vec3 N = safeNorm3(vec3(
    hL - hR + (rippleA - rippleB) * waveAmp,
    2.0 * cellSize,
    hD - hU + (rippleB + rippleA) * waveAmp
  ), vec3(0.0, 1.0, 0.0));
  vec3 L = safeNorm3(uSunDir, vec3(0.3, 0.85, 0.4));
  vec3 V = safeNorm3(uCameraPos - vWorldPos, vec3(0.0, 1.0, 0.0));
  vec3 H = safeNorm3(L + V, vec3(0.0, 1.0, 0.0));

  int theme = int(uWaterStyle.x + 0.5);
  vec3 deepWater = vec3(0.018, 0.105, 0.155);
  vec3 shallowWater = vec3(0.055, 0.34, 0.39);
  if (theme == 1) {
    deepWater = vec3(0.020, 0.115, 0.17);
    shallowWater = vec3(0.075, 0.36, 0.42);
  } else if (theme == 2 || theme == 6) {
    deepWater = vec3(0.018, 0.11, 0.19);
    shallowWater = vec3(0.10, 0.40, 0.47);
  } else if (theme == 3) {
    deepWater = vec3(0.020, 0.12, 0.16);
    shallowWater = vec3(0.08, 0.39, 0.39);
  } else if (theme == 4) {
    deepWater = vec3(0.035, 0.15, 0.19);
    shallowWater = vec3(0.22, 0.49, 0.45);
  } else if (theme == 5) {
    deepWater = vec3(0.025, 0.14, 0.18);
    shallowWater = vec3(0.12, 0.46, 0.46);
  }

  float depth = tC.a;
  float turbidity = clamp(flow.z * 0.22 + tC.b * 0.72, 0.0, 1.0);
  vec3 waterTint = mix(deepWater, shallowWater, clamp(1.0 - exp(-depth * 0.32), 0.0, 1.0));
  waterTint = mix(waterTint, vec3(0.24, 0.23, 0.18), turbidity * 0.55);

  float ndv = clamp(dot(N, V), 0.0, 1.0);
  float fresnel = 0.035 + 0.78 * pow(1.0 - ndv, 5.0);
  vec3 sky = mix(vec3(0.20, 0.28, 0.38), vec3(0.55, 0.68, 0.82), clamp(N.y, 0.0, 1.0));
  float spec = pow(max(1e-5, dot(N, H)), 72.0) * (0.25 + 1.35 * max(0.0, dot(N, L)));
  float foamNoise = 0.55 + 0.45 * noise2D(flowUv * 5.2 + vec2(timeSec * 0.28, -timeSec * 0.16));
  float shorelineFoam = 1.0 - smoothstep(0.018, 0.42, depth);
  float fastWaterFoam = smoothstep(1.4, 5.8, flow.z) * foamNoise;
  float foam = clamp(max(shorelineFoam * 0.40, fastWaterFoam * 0.68), 0.0, 0.82);

  vec3 color = mix(waterTint, sky, fresnel * 0.72);
  color += vec3(0.75, 0.84, 0.92) * spec;
  color = mix(color, vec3(0.76, 0.84, 0.84), foam * 0.70);
  float inspection = uWaterStyle.y;
  if (inspection > 0.5) {
    float flowBand = clamp(flow.z * 0.20 + depth * 0.04, 0.0, 1.0);
    color = mix(vec3(0.025, 0.12, 0.24), vec3(0.14, 0.78, 0.92), flowBand);
    color += vec3(0.2, 0.55, 0.60) * foam * 0.4;
  }

  float alpha = mix(0.68, 0.91, smoothstep(0.08, 4.5, depth));
  if (inspection > 0.5) alpha = 0.94;
  vec3 x = max(vec3(0.0), color);
  vec3 mapped = (x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14);
  outColor = vec4(pow(max(vec3(1e-6), clamp(mapped, 0.0, 1.0)), vec3(1.0 / 2.2)), alpha);
}
`;

export const BOULDER_RENDER_VERT = `#version 300 es
${GLSL_PRECISION_HEADER}
layout(location = 0) in vec3 aRockPosition;
layout(location = 1) in vec3 aRockNormal;
layout(location = 2) in vec4 aInstanceA; // (x, z, radiusX, radiusY)
layout(location = 3) in vec4 aInstanceB; // (radiusZ, yaw, siteThreshold, albedoVariation)

uniform sampler2D uTerrainTex;
uniform mat4 uViewProj;
uniform vec4 uBoulderDomain; // (worldSpan, gridRes, materialTheme, reserved)

out vec3 vWorldPos;
out vec3 vWorldNormal;
out float vSiteVisibility;
out float vRockTint;

${COMMON_GEOLOGY_GLSL}

void main() {
  float span = uBoulderDomain.x;
  float res = uBoulderDomain.y;
  float cellSize = span / res;
  vec2 anchor = vec2(aInstanceA.x, aInstanceA.y);
  vec2 anchorUv = anchor / span + 0.5;
  vec4 terrain = sampleGridBilinear(uTerrainTex, anchorUv, res);
  float hC = terrain.r + terrain.g + terrain.b;
  vec4 terrR = sampleGridBilinear(uTerrainTex, anchorUv + vec2(1.0 / res, 0.0), res);
  vec4 terrL = sampleGridBilinear(uTerrainTex, anchorUv - vec2(1.0 / res, 0.0), res);
  vec4 terrU = sampleGridBilinear(uTerrainTex, anchorUv + vec2(0.0, 1.0 / res), res);
  vec4 terrD = sampleGridBilinear(uTerrainTex, anchorUv - vec2(0.0, 1.0 / res), res);
  float hR = terrR.r + terrR.g + terrR.b;
  float hL = terrL.r + terrL.g + terrL.b;
  float hU = terrU.r + terrU.g + terrU.b;
  float hD = terrD.r + terrD.g + terrD.b;
  vec3 surfaceNormal = safeNorm3(vec3(hL - hR, 2.0 * cellSize, hD - hU), vec3(0.0, 1.0, 0.0));
  float slope = clamp(1.0 - surfaceNormal.y, 0.0, 1.0);
  float exposedSlope = smoothstep(0.055, 0.30, slope);
  float erraticAllowance = aInstanceB.z < 0.14 ? 0.18 : 0.0;
  float siteScore = max(exposedSlope, erraticAllowance);
  vSiteVisibility = smoothstep(aInstanceB.z - 0.09, aInstanceB.z + 0.10, siteScore);

  // A short gravity-biased roll from the source slope, then support the chunk on the live surface.
  vec2 downSlope = safeNorm2(vec2(hL - hR, hD - hU), vec2(0.0, 0.0));
  float roll = min(max(aInstanceA.z, aInstanceB.x) * 0.34, 5.5) * smoothstep(0.035, 0.24, slope);
  vec2 settledXZ = anchor + downSlope * roll;
  vec2 settledUv = settledXZ / span + 0.5;
  vec4 settledTerrain = sampleGridBilinear(uTerrainTex, settledUv, res);
  float settledHeight = settledTerrain.r + settledTerrain.g + settledTerrain.b;
  float rx = aInstanceA.z;
  float ry = aInstanceA.w;
  float rz = aInstanceB.x;
  vec3 center = vec3(settledXZ.x, settledHeight, settledXZ.y) + surfaceNormal * (ry * 1.04);

  vec3 reference = abs(surfaceNormal.y) < 0.92 ? vec3(0.0, 1.0, 0.0) : vec3(0.0, 0.0, 1.0);
  vec3 tangent = safeNorm3(cross(reference, surfaceNormal), vec3(1.0, 0.0, 0.0));
  vec3 bitangent = safeNorm3(cross(surfaceNormal, tangent), vec3(0.0, 0.0, 1.0));
  float c = cos(aInstanceB.y);
  float s = sin(aInstanceB.y);
  vec3 axisX = tangent * c + bitangent * s;
  vec3 axisZ = bitangent * c - tangent * s;

  vec3 scale = vec3(rx, ry, rz);
  vec3 local = aRockPosition * scale;
  vec3 world = center + axisX * local.x + surfaceNormal * local.y + axisZ * local.z;
  vec3 localNormal = aRockNormal / max(scale, vec3(1e-3));
  vWorldNormal = safeNorm3(axisX * localNormal.x + surfaceNormal * localNormal.y + axisZ * localNormal.z, surfaceNormal);
  vWorldPos = world;
  vRockTint = aInstanceB.w;
  gl_Position = uViewProj * vec4(world, 1.0);
}
`;

export const BOULDER_RENDER_FRAG = `#version 300 es
${GLSL_PRECISION_HEADER}
in vec3 vWorldPos;
in vec3 vWorldNormal;
in float vSiteVisibility;
in float vRockTint;
layout(location = 0) out vec4 outColor;

uniform vec3 uSunDir;
uniform vec3 uCameraPos;
uniform vec4 uBoulderDomain; // (worldSpan, gridRes, materialTheme, reserved)

${COMMON_GEOLOGY_GLSL}

void main() {
  if (vSiteVisibility < 0.16) discard;
  vec3 N = safeNorm3(vWorldNormal, vec3(0.0, 1.0, 0.0));
  vec3 L = safeNorm3(uSunDir, vec3(0.4, 0.8, 0.4));
  vec3 V = safeNorm3(uCameraPos - vWorldPos, vec3(0.0, 1.0, 0.0));
  vec3 H = safeNorm3(L + V, vec3(0.0, 1.0, 0.0));
  int theme = int(uBoulderDomain.z + 0.5);
  vec3 base = vec3(0.29, 0.20, 0.15);
  if (theme == 1) base = vec3(0.075, 0.080, 0.084);
  else if (theme == 2 || theme == 6) base = vec3(0.20, 0.20, 0.21);
  else if (theme == 3) base = vec3(0.36, 0.19, 0.12);
  else if (theme == 4) base = vec3(0.47, 0.32, 0.16);
  else if (theme == 5) base = vec3(0.36, 0.36, 0.33);

  float grain = noise2D(vWorldPos.xz * 0.44 + vWorldPos.y * 0.17) - 0.5;
  float mineral = ridgedFbm2D(vWorldPos.xz * 0.12 + vWorldPos.y * 0.08, 3, 0.5);
  vec3 albedo = base * (1.0 + grain * 0.22 + vRockTint) + vec3(mineral * 0.045);
  float ndotl = max(0.0, dot(N, L));
  float skyFill = 0.28 + 0.32 * clamp(N.y * 0.5 + 0.5, 0.0, 1.0);
  float shadowlessLambert = 0.32 + 0.82 * ndotl;
  float spec = pow(max(1e-5, dot(N, H)), 22.0) * 0.045;
  vec3 color = albedo * (shadowlessLambert + skyFill) + vec3(spec);
  vec3 mapped = (color * (2.51 * color + 0.03)) / (color * (2.43 * color + 0.59) + 0.14);
  outColor = vec4(pow(max(vec3(1e-6), clamp(mapped, 0.0, 1.0)), vec3(1.0 / 2.2)), 1.0);
}
`;

export const PARTICLE_RENDER_VERT = `#version 300 es
${GLSL_PRECISION_HEADER}

uniform sampler2D uPosAgeTex;
uniform sampler2D uVelWaterTex;
uniform sampler2D uSedimentTex;
uniform sampler2D uTerrainTex;

uniform mat4 uViewProj;
uniform vec3 uCameraPos;
uniform vec4 uPartVis; // (worldSpan, gridRes, opacity, activeCount)

out vec2 vQuadUv;
out vec4 vColor;

void main() {
  int slotId = gl_InstanceID;
  if (float(slotId) >= uPartVis.w) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    vColor = vec4(0.0);
    vQuadUv = vec2(0.0);
    return;
  }

  const vec2 corners[6] = vec2[6](
    vec2(-1.0, -1.0), vec2( 1.0, -1.0), vec2( 1.0,  1.0),
    vec2(-1.0, -1.0), vec2( 1.0,  1.0), vec2(-1.0,  1.0)
  );
  vec2 corner = corners[gl_VertexID % 6];
  vQuadUv = corner;

  ivec2 coord = ivec2(slotId % 256, slotId / 256);
  vec4 posAge = texelFetch(uPosAgeTex, coord, 0);
  vec4 velW = texelFetch(uVelWaterTex, coord, 0);
  vec4 sed = texelFetch(uSedimentTex, coord, 0);

  vec3 pos = posAge.xyz;
  bool isAirborne = posAge.w < 0.0;

  // 0 = rain, 1 = snow, 2 = aeolian sand, 3 = rockfall boulder
  int species = int(sed.w + 0.5);

  if (!isAirborne) {
    vec2 uv = pos.xz / uPartVis.x + 0.5;
    ivec2 tc = clamp(ivec2(uv * (uPartVis.y - 1.0) + 0.5), ivec2(0), ivec2(int(uPartVis.y) - 1));
    vec4 terr = texelFetch(uTerrainTex, tc, 0);
    pos.y = terr.r + terr.g + terr.b + terr.a + (species == 1 ? 0.22 : 0.55);
  }

  vec3 diffCam = uCameraPos - pos;
  float dc2 = dot(diffCam, diffCam);
  vec3 toCam = dc2 > 1e-6 ? diffCam * inversesqrt(dc2) : vec3(0.0, 1.0, 0.0);

  float vl2 = dot(velW.xyz, velW.xyz);
  vec3 velDir = vl2 > 0.0025 ? velW.xyz * inversesqrt(vl2) : vec3(0.0, -1.0, 0.0);

  vec3 sideRaw = cross(toCam, velDir);
  float sl2 = dot(sideRaw, sideRaw);
  vec3 side = sl2 > 1e-6 ? sideRaw * inversesqrt(sl2) : vec3(1.0, 0.0, 0.0);

  vec3 upRaw = cross(side, toCam);
  float ul2 = dot(upRaw, upRaw);
  vec3 upAlong = ul2 > 1e-6 ? upRaw * inversesqrt(ul2) : vec3(0.0, 1.0, 0.0);

  float width;
  float lengthStretch;
  if (species == 1) {
    // Snowflakes: soft, near-spherical, slightly larger than raindrops, no velocity streaks
    width = isAirborne ? 0.58 : 0.40;
    lengthStretch = isAirborne ? 0.62 : 0.55;
  } else if (species == 2) {
    width = 0.26;
    lengthStretch = isAirborne ? 1.4 : 0.9;
  } else if (species == 3) {
    width = 0.72;
    lengthStretch = 0.85;
  } else {
    width = isAirborne ? 0.34 : (0.55 + 0.45 * clamp(velW.w, 0.0, 1.5));
    lengthStretch = isAirborne ? 3.4 : (0.85 + 0.22 * clamp(length(velW.xz), 0.0, 10.0));
  }

  vec3 worldVert = pos + side * (corner.x * width) + upAlong * (corner.y * lengthStretch);
  gl_Position = uViewProj * vec4(worldVert, 1.0);

  if (isAirborne) {
    vec3 airTint;
    float airAlpha;
    if (species == 1) {
      airTint = vec3(0.90, 0.95, 1.0);
      airAlpha = uPartVis.z * 0.72;
    } else if (species == 2) {
      airTint = vec3(0.72, 0.62, 0.48);
      airAlpha = uPartVis.z * 0.34;
    } else if (species == 3) {
      airTint = vec3(0.62, 0.60, 0.56);
      airAlpha = uPartVis.z * 0.66;
    } else {
      airTint = vec3(0.62, 0.84, 1.0);
      airAlpha = uPartVis.z * 0.52;
    }
    vColor = vec4(airTint, airAlpha);
  } else {
    vec3 c;
    float alpha;
    if (species == 1) {
      c = vec3(0.93, 0.96, 1.0);
      alpha = uPartVis.z * 0.62 * clamp(sed.x * 2.2 + 0.25, 0.25, 1.0);
    } else if (species == 2) {
      c = vec3(0.80, 0.68, 0.46);
      alpha = uPartVis.z * 0.42 * clamp(sed.x * 3.0 + 0.25, 0.2, 1.0);
    } else if (species == 3) {
      c = vec3(0.66, 0.62, 0.56);
      alpha = uPartVis.z * 0.80 * clamp(sed.x * 2.0 + 0.35, 0.3, 1.0);
    } else {
      float totalLoad = sed.x + sed.y;
      float sedRatio = clamp(totalLoad * 8.5, 0.0, 1.0);
      float fineShare = sed.y / max(totalLoad, 1e-5);
      vec3 sedTint = mix(vec3(0.86, 0.68, 0.38), vec3(0.95, 0.56, 0.22), fineShare);
      c = mix(vec3(0.24, 0.78, 1.0), sedTint, sedRatio);
      alpha = uPartVis.z * 0.78 * clamp(velW.w * 1.4, 0.15, 1.0);
    }
    vColor = vec4(c, alpha);
  }
}
`;

export const PARTICLE_RENDER_FRAG = `#version 300 es
${GLSL_PRECISION_HEADER}

in vec2 vQuadUv;
in vec4 vColor;
layout(location = 0) out vec4 outColor;

void main() {
  float r2 = dot(vQuadUv, vQuadUv);
  if (r2 > 1.0) discard;
  float soft = pow(max(1e-5, 1.0 - r2), 1.4);
  outColor = vec4(vColor.rgb, vColor.a * soft);
}
`;

export const SKY_BG_FRAG = `#version 300 es
${GLSL_PRECISION_HEADER}
in vec2 vUv;
layout(location = 0) out vec4 outColor;

void main() {
  vec3 topCol = vec3(0.065, 0.082, 0.108);
  vec3 horCol = vec3(0.125, 0.145, 0.175);
  vec3 c = mix(horCol, topCol, pow(max(1e-5, clamp(vUv.y, 0.0, 1.0)), 0.75));
  outColor = vec4(c, 1.0);
}
`;

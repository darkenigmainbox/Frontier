/**
 * WebGL2 GLSL ES 3.00 Shaders for the Non-Destructive Bottom-to-Top Terrain Pipeline.
 *
 * Shared Working Terrain Data passed upward from bottom layer to top layer:
 *   - State Texture (RGBA32F):   .r = bedrock height (m), .g = water depth (m),
 *                                .b = coarse talus/scree (m), .a = fine sediment/sand (m)
 *   - Geology Texture (RGBA32F): .r = rock hardness [0..1], .g = drainage flow discharge,
 *                                .b = strata phase [0..1], .a = snow/glacier ice thickness (m)
 *   - VecDisp Texture (RGBA32F): .rgb = 3D vector overhang displacement (dx, dy, dz) in meters,
 *                                .a = cliff push-pull mask
 *   - Baked Texture (RGBA32F):   .r = horizon AO [0..1], .g = protrusion [-1..1],
 *                                .b = active layer B&W mask [0..1], .a = slope magnitude
 */

const GLSL_NOISE_AND_MASK = `
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash12(i);
  float b = hash12(i + vec2(1.0, 0.0));
  float c = hash12(i + vec2(0.0, 1.0));
  float d = hash12(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p, int oct) {
  float v = 0.0;
  float a = 0.5;
  mat2 rot = mat2(0.80, -0.60, 0.60, 0.80);
  for (int i = 0; i < 7; i++) {
    if (i >= oct) break;
    v += a * vnoise(p);
    p = rot * p * 2.03 + vec2(17.1, 31.7);
    a *= 0.5;
  }
  return v;
}

float ridgedFbm(vec2 p, int oct, float sharp) {
  float sum = 0.0;
  float amp = 0.52;
  float weight = 1.0;
  mat2 rot = mat2(0.80, -0.60, 0.60, 0.80);
  for (int i = 0; i < 7; i++) {
    if (i >= oct) break;
    float n = 1.0 - abs(vnoise(p) * 2.0 - 1.0);
    n = pow(clamp(n, 0.0, 1.0), mix(1.15, 2.55, sharp));
    n *= weight;
    weight = clamp(n * 1.75, 0.15, 1.0);
    sum += n * amp;
    p = rot * p * 2.07 + vec2(13.7, 29.3);
    amp *= 0.49;
  }
  return sum;
}

// Evaluates composable Black & White Layer Mask [0..1]:
// uMaskCfg1 = (enabled, mode, minVal, maxVal)
// uMaskCfg2 = (feather, invert, scale, seed)
// modes: 0=height, 1=slope, 2=flow, 3=concavity, 4=radial, 5=noise
float evalLayerMask(
  vec2 worldXZ,
  float worldSpan,
  float totalH,
  float maxRelief,
  float slope,
  float flow,
  float laplacian,
  vec4 uMaskCfg1,
  vec4 uMaskCfg2
) {
  if (uMaskCfg1.x < 0.5) return 1.0;
  int mode = int(uMaskCfg1.y + 0.5);
  float val = 0.5;
  if (mode == 0) {
    val = clamp(totalH / max(20.0, maxRelief), 0.0, 1.0);
  } else if (mode == 1) {
    val = clamp(atan(slope) / 1.25, 0.0, 1.0);
  } else if (mode == 2) {
    val = clamp(log2(1.0 + flow * 18.0) * 0.25, 0.0, 1.0);
  } else if (mode == 3) {
    val = clamp(0.5 - laplacian * 0.18, 0.0, 1.0);
  } else if (mode == 4) {
    val = clamp(length(worldXZ) / (worldSpan * 0.48), 0.0, 1.0);
  } else {
    vec2 sOff = vec2(fract(uMaskCfg2.w * 0.0173), fract(uMaskCfg2.w * 0.0291)) * 70.0;
    val = clamp(fbm((worldXZ / worldSpan) * max(0.5, uMaskCfg2.z) * 3.2 + sOff, 5), 0.0, 1.0);
  }
  float f = max(0.02, uMaskCfg2.x);
  float mLow = smoothstep(uMaskCfg1.z - f, uMaskCfg1.z + f, val);
  float mHigh = 1.0 - smoothstep(uMaskCfg1.w - f, uMaskCfg1.w + f, val);
  float m = clamp(mLow * mHigh, 0.0, 1.0);
  return uMaskCfg2.y > 0.5 ? (1.0 - m) : m;
}
`;

/**
 * Pass 1: Composable Landform, Stratigraphy, Rock Stacks, Cliff Push-Pull, Sculpt & Spline Pass.
 * Evaluates ONE layer at its exact position in the bottom-to-top stack!
 */
export const STACK_LANDFORM_FRAG = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;

in vec2 vUv;
layout(location = 0) out vec4 oState;
layout(location = 1) out vec4 oGeo;
layout(location = 2) out vec4 oVecDisp;

uniform sampler2D uStateTex;
uniform sampler2D uGeoTex;
uniform sampler2D uVecDispTex;
uniform sampler2D uSculptTex;

uniform vec4 uDomain;   // (worldSpan, gridRes, maxRelief, opKind)
uniform vec4 uParam0;   // operation-specific params 0
uniform vec4 uParam1;   // operation-specific params 1
uniform vec4 uParam2;   // operation-specific params 2
uniform vec4 uMaskCfg1; // (enabled, mode, min, max)
uniform vec4 uMaskCfg2; // (feather, invert, scale, seed)
uniform vec4 uSplinePts[4]; // up to 8 2D points packed in 4 vec4s (xy, zw)
uniform int uSplineCount;

${GLSL_NOISE_AND_MASK}

vec2 getSplinePt(int idx) {
  int v = idx / 2;
  int rem = idx - v * 2;
  vec4 pack = v == 0 ? uSplinePts[0] : (v == 1 ? uSplinePts[1] : (v == 2 ? uSplinePts[2] : uSplinePts[3]));
  return rem == 0 ? pack.xy : pack.zw;
}

void main() {
  float span = uDomain.x;
  float R = uDomain.y;
  float maxRelief = uDomain.z;
  int opKind = int(uDomain.w + 0.5);
  float cell = span / R;

  ivec2 ij = ivec2(gl_FragCoord.xy);
  ivec2 maxIJ = ivec2(int(R) - 1);
  vec2 worldXZ = (vUv - 0.5) * span;

  vec4 st = texelFetch(uStateTex, ij, 0);
  vec4 geo = texelFetch(uGeoTex, ij, 0);
  vec4 vdisp = texelFetch(uVecDispTex, ij, 0);

  // Neighbor heights for slope & concavity/protrusion
  float hL = texelFetch(uStateTex, clamp(ij + ivec2(-1, 0), ivec2(0), maxIJ), 0).r;
  float hR = texelFetch(uStateTex, clamp(ij + ivec2( 1, 0), ivec2(0), maxIJ), 0).r;
  float hD = texelFetch(uStateTex, clamp(ij + ivec2(0, -1), ivec2(0), maxIJ), 0).r;
  float hU = texelFetch(uStateTex, clamp(ij + ivec2(0,  1), ivec2(0), maxIJ), 0).r;
  float dhdx = (hR - hL) / (2.0 * cell);
  float dhdz = (hU - hD) / (2.0 * cell);
  float slope = length(vec2(dhdx, dhdz));
  float lap = (hL + hR + hD + hU - 4.0 * st.r) / cell;
  float totalH = st.r + st.b + st.a;

  float maskW = evalLayerMask(worldXZ, span, totalH, maxRelief, slope, geo.g, lap, uMaskCfg1, uMaskCfg2);

  // -------------------------------------------------------------------------
  // opKind 0: Base Landform (builds foundational terrain & base rock hardness)
  // uParam0 = (archetype, relief, scale, roughness)
  // uParam1 = (ridgeSharpness, warpStrength, valleyFloor, baseHardness)
  // uParam2 = (seed, 0, 0, 0)
  // -------------------------------------------------------------------------
  if (opKind == 0) {
    int arch = int(uParam0.x + 0.5);
    float relief = uParam0.y;
    float sc = uParam0.z;
    float rough = uParam0.w;
    float sharp = uParam1.x;
    float warpAmt = uParam1.y;
    float valley = uParam1.z;
    float baseHard = uParam1.w;
    float seed = uParam2.x;

    vec2 sOff = vec2(fract(seed * 0.0137), fract(seed * 0.0293)) * 90.0;
    vec2 p = (worldXZ / span) * sc * 2.6 + sOff;
    vec2 warp = vec2(fbm(p * 0.85 + 7.3, 4), fbm(p * 0.85 - 13.9, 4)) - 0.5;
    vec2 pw = p + warp * warpAmt * 1.45;

    float hNorm = 0.0;
    if (arch == 0) {
      // Alpine Mountain Divide: branching arête spine + glacial cirque basins
      float mainSpine = ridgedFbm(pw * 0.95, 6, sharp);
      float spurs = ridgedFbm(pw * 2.15 + vec2(9.2, -4.7), 5, sharp * 0.85);
      float massifEnv = smoothstep(0.62, 0.08, length((worldXZ / span) * vec2(0.95, 1.05)));
      hNorm = (mainSpine * 0.72 + spurs * 0.28 * rough) * (0.45 + 0.65 * massifEnv);
      hNorm = pow(clamp(hNorm, 0.0, 1.2), mix(1.35, 0.85, 1.0 - valley));
    } else if (arch == 1) {
      // Tectonic Fault Escarpment: uplifted tilted block + steep fault wall + piedmont apron
      float strikeX = (worldXZ.x * 0.84 + worldXZ.y * 0.54) / span;
      float faultWobble = (fbm(pw * 1.6, 5) - 0.5) * 0.22;
      float scarp = smoothstep(-0.14, 0.12, strikeX + faultWobble);
      float highland = 0.58 + 0.36 * ridgedFbm(pw * 1.35, 5, sharp) - max(0.0, strikeX) * 0.32;
      float piedmont = 0.08 + 0.16 * fbm(pw * 1.9, 4);
      hNorm = mix(piedmont, highland, scarp);
    } else if (arch == 2) {
      // Dissected Canyon Plateau: broad flat-crowned plateau with rim undulations
      float basePlat = 0.66 + 0.22 * fbm(pw * 0.9, 4);
      float rimCut = smoothstep(0.32, 0.64, fbm(pw * 1.45 + 5.1, 5));
      hNorm = mix(0.18 + 0.12 * fbm(pw * 2.4, 4), basePlat, rimCut);
      hNorm += 0.08 * rough * (fbm(pw * 3.6, 4) - 0.5);
    } else if (arch == 3) {
      // Arid Erg & Basin Floor: gentle deflation basin + underlying asymmetric sand swells
      float basin = 0.14 + 0.24 * fbm(pw * 0.8, 4);
      float dCoord = (worldXZ.x * 0.88 + worldXZ.y * 0.47) / span * sc * 3.8 + fbm(pw * 1.2, 4) * 1.4;
      float ph = fract(dCoord);
      float dune = ph < 0.72 ? pow(ph / 0.72, 1.35) : max(0.0, 1.0 - (ph - 0.72) / 0.28);
      hNorm = basin + dune * 0.34;
    } else if (arch == 4) {
      // Volcanic Caldera & Rim
      float r = length(worldXZ / span) * 2.15 + (fbm(pw * 1.8, 4) - 0.5) * 0.28;
      float cone = exp(-r * r * 0.95) * 1.08;
      float collapse = exp(-r * r * 5.6) * 0.72;
      float radialGullies = ridgedFbm(pw * 2.4, 5, sharp) * 0.22 * rough;
      hNorm = max(0.05, cone - collapse + radialGullies);
    } else if (arch == 5) {
      // Coastal Headland Massif
      float coastAxis = worldXZ.y / span + (fbm(pw * 1.5, 5) - 0.5) * 0.30;
      float landMask = smoothstep(-0.22, 0.16, coastAxis);
      float headland = 0.26 + 0.72 * ridgedFbm(pw * 1.25, 6, sharp);
      hNorm = mix(0.02, headland, landMask);
    } else {
      // Pediment & Inselberg Plain (ideal basement for Rock Stacks / Desert Mesas)
      float ped = 0.10 + 0.18 * fbm(pw * 0.95, 4);
      float dome = pow(clamp(fbm(pw * 1.7 + 4.2, 5), 0.0, 1.0), 2.6) * 0.52;
      hNorm = ped + dome * rough;
    }

    float hMeters = max(2.0, 6.0 + hNorm * relief);
    float fineSand = arch == 3 ? max(0.0, (hNorm - 0.18) * relief * 0.45) : 0.0;
    float baseWater = arch == 5 ? max(0.0, 12.5 - hMeters) : 0.0;
    float hBedrock = max(1.5, hMeters - fineSand);
    float hard = clamp(baseHard + (fbm(pw * 2.8 + 19.0, 4) - 0.5) * 0.22, 0.08, 0.96);

    oState = vec4(hBedrock, baseWater, 0.0, fineSand);
    oGeo = vec4(hard, 0.0, fract(hBedrock * 0.05), 0.0);
    oVecDisp = vec4(0.0);
    return;
  }

  // -------------------------------------------------------------------------
  // opKind 1: Procedural Landform Layer (Ridges, Plateau, Escarpment, Dunes, Craters)
  // uParam0 = (generator, combineMode, amplitude, scale)
  // uParam1 = (sharpness, azimuthDeg, opacity, hardnessDelta)
  // uParam2 = (seed, 0, 0, 0)
  // -------------------------------------------------------------------------
  if (opKind == 1) {
    int gen = int(uParam0.x + 0.5);
    int comb = int(uParam0.y + 0.5);
    float amp = uParam0.z;
    float sc = uParam0.w;
    float sharp = uParam1.x;
    float ang = radians(uParam1.y);
    float opac = uParam1.z * maskW;
    float hardDelta = uParam1.w;
    float seed = uParam2.x;

    vec2 dir = vec2(cos(ang), sin(ang));
    vec2 perp = vec2(-dir.y, dir.x);
    vec2 rotXZ = vec2(dot(worldXZ, dir), dot(worldXZ, perp));
    vec2 sOff = vec2(fract(seed * 0.0171), fract(seed * 0.0313)) * 80.0;
    vec2 p = (rotXZ / span) * sc * 2.5 + sOff;
    vec2 warp = vec2(fbm(p * 0.9 + 5.2, 4), fbm(p * 0.9 - 9.4, 4)) - 0.5;
    vec2 pw = p + warp * 0.55;

    float deltaH = 0.0;
    float addSand = 0.0;
    if (gen == 0) {
      // Sharp Arête Ridges & Horns
      deltaH = ridgedFbm(pw, 6, sharp) * amp;
    } else if (gen == 1) {
      // Flat-Topped Mesa / Plateau
      float raw = fbm(pw * 0.85, 5);
      float top = smoothstep(0.38, mix(0.68, 0.44, sharp), raw);
      deltaH = top * amp;
    } else if (gen == 2) {
      // Fault Escarpment Step
      float faultCoord = rotXZ.x / span + (fbm(pw * 1.4, 4) - 0.5) * 0.20;
      float stepUp = smoothstep(-0.10, mix(0.18, 0.03, sharp), faultCoord);
      deltaH = stepUp * amp * (0.78 + 0.22 * fbm(pw * 2.2, 4));
    } else if (gen == 3) {
      // Asymmetric Aeolian Sand Dunes (sharp 33.8-deg leeward slipface!)
      float phase = fract(pw.x * 1.45 + (fbm(pw * 0.8, 3) - 0.5) * 0.95);
      float stoss = pow(clamp(phase / 0.74, 0.0, 1.0), 1.35);
      float lee = clamp(1.0 - (phase - 0.74) / 0.26, 0.0, 1.0);
      float dune = (phase < 0.74 ? stoss : lee) * (0.65 + 0.35 * fbm(pw * 0.7, 3));
      addSand = dune * amp * opac;
    } else {
      // Multi-Scale Impact Craters (bowl excavation + raised ejecta rim!)
      vec2 cellUV = p * 1.35;
      vec2 cid = floor(cellUV);
      vec2 cf = fract(cellUV) - 0.5;
      vec2 jitter = (vec2(hash12(cid + seed * 0.01), hash12(cid + 19.7 + seed * 0.01)) - 0.5) * 0.48;
      float r = length(cf - jitter) * 2.35;
      float rad = 0.55 + 0.35 * hash12(cid + 41.3);
      float rn = r / rad;
      float bowl = rn < 1.0 ? -(1.0 - rn * rn) * 0.82 : 0.0;
      float rim = exp(-pow((rn - 1.03) * 4.5, 2.0)) * 0.34 * sharp;
      deltaH = (bowl + rim) * amp;
    }

    float curH = st.r;
    float targetH = curH + deltaH;
    if (comb == 1) targetH = curH - deltaH;
    else if (comb == 2) targetH = max(curH, deltaH + 12.0);
    else if (comb == 3) targetH = min(curH, deltaH + 40.0);
    else if (comb == 4) targetH = deltaH + 14.0;

    st.r = max(1.5, mix(curH, targetH, opac));
    st.a += addSand;
    geo.r = clamp(geo.r + hardDelta * opac * clamp(deltaH / max(10.0, amp), -1.0, 1.0), 0.06, 0.97);
    oState = st;
    oGeo = geo;
    oVecDisp = vdisp;
    return;
  }

  // -------------------------------------------------------------------------
  // opKind 2: Stratigraphic Bed Packages (REAL Ledge Geometry + 3D Rock Hardness + Ledge Overhang!)
  // uParam0 = (bedCount, terraceStrength, hardSoftContrast, dipDeg)
  // uParam1 = (strikeDeg, bedFoldWarp, ledgeOverhang, opacity)
  // uParam2 = (seed, 0, 0, 0)
  // -------------------------------------------------------------------------
  if (opKind == 2) {
    float bedCount = max(2.0, uParam0.x);
    float terrStr = uParam0.y;
    float contrast = uParam0.z;
    float dipRad = radians(uParam0.w);
    float strikeRad = radians(uParam1.x);
    float foldWarp = uParam1.y;
    float ledgeOver = uParam1.z;
    float opac = uParam1.w * maskW;
    float seed = uParam2.x;

    vec2 dipDir = vec2(cos(strikeRad), sin(strikeRad));
    float dipOffset = dot(worldXZ, dipDir) * tan(dipRad);
    float fold = (fbm((worldXZ / span) * 2.1 + seed * 0.013, 4) - 0.5) * 34.0 * foldWarp;

    float bedSpacingM = max(7.0, maxRelief / bedCount);
    float strataCoord = (st.r + dipOffset + fold) / bedSpacingM;
    float bedIdx = floor(strataCoord);
    float bedFrac = fract(strataCoord);

    // Pseudo-random per-bed thickness & hardness variation so beds look geological, not uniform stairs!
    float bedRand = hash12(vec2(bedIdx, seed * 0.07));
    float hardCapMask = smoothstep(0.52, 0.78, bedFrac) * (1.0 - smoothstep(0.92, 1.0, bedFrac) * 0.35);
    float steppedFrac = mix(bedFrac, pow(bedFrac, mix(1.0, 0.34, 0.55 + 0.45 * bedRand)), terrStr);
    float newBedrockH = (bedIdx + steppedFrac) * bedSpacingM - dipOffset - fold;

    // Apply stronger terrace benches on moderate-to-steep slopes while keeping flat valley floors clean
    float slopeGate = smoothstep(0.08, 0.48, slope);
    st.r = max(1.5, mix(st.r, newBedrockH, opac * (0.38 + 0.62 * slopeGate)));

    // Write true 3D stratigraphic rock competency into oGeo.r for downstream erosion!
    float bedCompetency = mix(0.14, 0.94, 0.25 + 0.75 * hardCapMask * (0.6 + 0.4 * bedRand));
    geo.r = clamp(mix(geo.r, mix(geo.r, bedCompetency, contrast), opac), 0.06, 0.98);
    geo.b = bedFrac;

    // Push resistant caprock ledges outward over softer shale beds below (real 3D overhang!)
    vec2 downSlope = slope > 1e-4 ? -vec2(dhdx, dhdz) / slope : vec2(0.0);
    float overhangPush = hardCapMask * smoothstep(0.45, 1.35, slope) * ledgeOver * 4.6 * opac;
    vdisp.xz += downSlope * overhangPush;
    vdisp.y += hardCapMask * smoothstep(0.55, 1.4, slope) * ledgeOver * 1.1 * opac;

    oState = st;
    oGeo = geo;
    oVecDisp = vdisp;
    return;
  }

  // -------------------------------------------------------------------------
  // opKind 3: Rock Stacks, Hoodoos & Boulder Tors (Slate-style tiered leaning columns!)
  // uParam0 = (stackHeight, spacingM, radiusM, taper)
  // uParam1 = (tiers, lean, leanAzimuthDeg, caprockOverhang)
  // uParam2 = (opacity, seed, 0, 0)
  // -------------------------------------------------------------------------
  if (opKind == 3) {
    float stackH = uParam0.x;
    float spacing = max(24.0, uParam0.y);
    float baseRad = max(5.0, uParam0.z);
    float taper = uParam0.w;
    float tiers = max(2.0, uParam1.x);
    float lean = uParam1.y;
    float leanAng = radians(uParam1.z);
    float capOver = uParam1.w;
    float opac = uParam2.x * maskW;
    float seed = uParam2.y;

    vec2 cellGrid = worldXZ / spacing;
    vec2 baseCell = floor(cellGrid);

    float bestStackH = 0.0;
    vec3 bestDisp = vec3(0.0);
    float bestHard = geo.r;

    for (int j = -1; j <= 1; j++) {
      for (int i = -1; i <= 1; i++) {
        vec2 cid = baseCell + vec2(float(i), float(j));
        float spawnProb = hash12(cid + seed * 0.031);
        if (spawnProb < 0.34) continue;

        vec2 jit = (vec2(hash12(cid + 7.1), hash12(cid + 23.9)) - 0.5) * 0.62;
        vec2 centerXZ = (cid + 0.5 + jit) * spacing;

        // Angular facetedrock-stack cross section
        vec2 rel = worldXZ - centerXZ;
        float theta = atan(rel.y, rel.x);
        float facet = 0.84 + 0.16 * cos(theta * 5.0 + spawnProb * 6.28) + 0.10 * (vnoise(worldXZ * 0.12 + cid) - 0.5);
        float localRad = baseRad * (0.68 + 0.58 * hash12(cid + 51.2)) * facet;
        float dNorm = length(rel) / localRad;
        if (dNorm >= 1.18) continue;

        // Steep-sided stack profile with tiered horizontal bedding notches & caprock!
        float colMask = smoothstep(1.08, mix(0.28, 0.72, 1.0 - taper), dNorm);
        float localMaxH = stackH * (0.58 + 0.55 * hash12(cid + 89.4));
        float rawH = pow(colMask, 0.58) * localMaxH;

        float tierCoord = (rawH / max(8.0, localMaxH)) * tiers;
        float tierStep = (floor(tierCoord) + smoothstep(0.08, 0.78, fract(tierCoord))) / tiers;
        float tieredH = mix(rawH, tierStep * localMaxH, 0.52);

        if (tieredH > bestStackH) {
          bestStackH = tieredH;
          float hRatio = clamp(tieredH / max(6.0, localMaxH), 0.0, 1.0);
          vec2 leanDir = vec2(cos(leanAng), sin(leanAng));
          // Caprock flares outward near top tier (true 3D mushroom/hoodoo overhang!)
          float capFlare = smoothstep(0.68, 0.94, hRatio) * capOver * 5.5;
          vec2 radOut = length(rel) > 1e-3 ? normalize(rel) : vec2(1.0, 0.0);
          bestDisp = vec3(leanDir * (hRatio * lean * 9.5) + radOut * capFlare, capFlare * 0.25).xzy;
          bestDisp = vec3(leanDir.x * hRatio * lean * 9.5 + radOut.x * capFlare, capFlare * 0.35, leanDir.y * hRatio * lean * 9.5 + radOut.y * capFlare);
          bestHard = mix(0.76, 0.96, hRatio);
        }
      }
    }

    st.r += bestStackH * opac;
    vdisp.xyz += bestDisp * opac;
    geo.r = mix(geo.r, max(geo.r, bestHard), opac * step(1.5, bestStackH));

    oState = st;
    oGeo = geo;
    oVecDisp = vdisp;
    return;
  }

  // -------------------------------------------------------------------------
  // opKind 4: Rugged Cliff Push-Pull Displacement (True 3D Crag Buttresses & Overhangs!)
  // uParam0 = (displacementM, featureScale, slopeThresholdDeg, ledgeStrength)
  // uParam1 = (overhangBias, verticalCrease, opacity, seed)
  // -------------------------------------------------------------------------
  if (opKind == 4) {
    float dispAmt = uParam0.x;
    float featSc = uParam0.y;
    float slopeMinTan = tan(radians(uParam0.z));
    float ledgeStr = uParam0.w;
    float overBias = uParam1.x;
    float crease = uParam1.y;
    float opac = uParam1.z * maskW;
    float seed = uParam1.w;

    float steepMask = smoothstep(slopeMinTan * 0.72, slopeMinTan * 1.45, slope);
    if (steepMask > 0.005) {
      vec2 outDir = slope > 1e-4 ? -vec2(dhdx, dhdz) / slope : vec2(0.0);
      vec2 alongCliff = vec2(-outDir.y, outDir.x);

      // Tri-planar cliff coordinates: along cliff strike + vertical elevation!
      vec2 cliffUV = vec2(dot(worldXZ, alongCliff) * 0.032 * featSc, st.r * 0.045 * featSc) + seed * 0.019;
      float buttress = ridgedFbm(cliffUV * vec2(1.0, 0.42), 5, 0.55 + 0.4 * crease) - 0.42;
      float ledges = sin(st.r * 0.24 * featSc + fbm(cliffUV * 1.7, 3) * 3.2) * ledgeStr;
      float pushPull = (buttress * 1.15 + ledges * 0.48 + overBias * 0.28) * dispAmt * steepMask * opac;

      // Displace BOTH height AND 3D lateral overhang vector!
      st.r = max(1.5, st.r + pushPull * 0.52);
      vdisp.xz += outDir * pushPull * 0.78;
      vdisp.y += max(0.0, pushPull) * 0.24;
      vdisp.w = max(vdisp.w, steepMask * opac);
    }

    oState = st;
    oGeo = geo;
    oVecDisp = vdisp;
    return;
  }

  // -------------------------------------------------------------------------
  // opKind 5: Non-Destructive SDF Sculpt Layer (applies stored GPU brush edits!)
  // uParam0 = (opacity, 0, 0, 0)
  // -------------------------------------------------------------------------
  if (opKind == 5) {
    float opac = uParam0.x * maskW;
    vec4 sc = texelFetch(uSculptTex, ij, 0);
    // sc.r = additive/subtractive height delta (m), sc.g = smoothing weight [0..1]
    float avgH = 0.25 * (hL + hR + hD + hU);
    float smoothed = mix(st.r, avgH, clamp(sc.g, 0.0, 0.92));
    st.r = max(1.0, mix(st.r, smoothed + sc.r, opac));
    oState = st;
    oGeo = geo;
    oVecDisp = vdisp;
    return;
  }

  // -------------------------------------------------------------------------
  // opKind 6: Spatial Spline Feature (Canyon Cut / Graded Mountain Road / Lake Basin!)
  // uParam0 = (mode, widthM, depthM, wallSteepness)
  // uParam1 = (meanderAmp, waterFill, bankFalloff, opacity)
  // -------------------------------------------------------------------------
  if (opKind == 6 && uSplineCount >= 2) {
    int mode = int(uParam0.x + 0.5);
    float halfW = max(4.0, uParam0.y * 0.5);
    float depth = uParam0.z;
    float steep = uParam0.w;
    float meander = uParam1.x;
    float waterFill = uParam1.y;
    float bankFall = uParam1.z;
    float opac = uParam1.w * maskW;

    // Natural geological wall warp so spline cuts never look artificial or ruler-straight!
    vec2 wWarp = (vec2(fbm(worldXZ * 0.018, 4), fbm(worldXZ * 0.018 + 31.4, 4)) - 0.5) * halfW * 1.45 * meander;
    vec2 q = worldXZ + wWarp;

    float minDist = 1e6;
    float bestT = 0.0;
    for (int s = 0; s < 7; s++) {
      if (s >= uSplineCount - 1) break;
      vec2 a = getSplinePt(s);
      vec2 b = getSplinePt(s + 1);
      vec2 ab = b - a;
      float t = clamp(dot(q - a, ab) / max(1e-4, dot(ab, ab)), 0.0, 1.0);
      float d = length(q - (a + ab * t));
      if (d < minDist) {
        minDist = d;
        bestT = (float(s) + t) / float(max(1, uSplineCount - 1));
      }
    }

    if (mode == 0) {
      // Canyon Gorge Cut: steep terraced rim -> flat river floor!
      float outerW = halfW * (1.35 + bankFall);
      if (minDist < outerW) {
        float u = clamp(minDist / outerW, 0.0, 1.0);
        float wallProf = 1.0 - pow(u, mix(1.4, 4.2, steep));
        float cutM = wallProf * depth * opac;
        st.r = max(2.0, st.r - cutM);
        if (minDist < halfW * 0.62 && waterFill > 0.01) {
          st.g = max(st.g, (1.0 - minDist / (halfW * 0.62)) * waterFill * 8.5 * opac);
        }
      }
    } else if (mode == 1) {
      // Graded Mountain Road / Switchback Bench: cut-and-fill flat roadbed!
      float embankmentW = halfW * (1.8 + bankFall * 1.6);
      if (minDist < embankmentW) {
        vec2 pStart = getSplinePt(0);
        vec2 pEnd = getSplinePt(uSplineCount - 1);
        vec2 uv0 = clamp(pStart / span + 0.5, 0.02, 0.98);
        vec2 uv1 = clamp(pEnd / span + 0.5, 0.02, 0.98);
        float h0 = texture(uStateTex, uv0).r;
        float h1 = texture(uStateTex, uv1).r;
        float gradeH = mix(h0, h1, smoothstep(0.0, 1.0, bestT)) - depth * 0.15;
        float blend = 1.0 - smoothstep(halfW * 0.85, embankmentW, minDist);
        st.r = mix(st.r, gradeH, blend * opac);
        st.b *= (1.0 - blend * 0.85);
        st.a *= (1.0 - blend * 0.85);
        geo.r = mix(geo.r, 0.88, smoothstep(halfW, halfW * 0.6, minDist) * opac);
      }
    } else {
      // Hydrostatic Lake Basin Boundary
      float basinR = halfW * 1.85;
      if (minDist < basinR) {
        float bowl = 1.0 - smoothstep(0.0, basinR, minDist);
        float bowlShaped = pow(bowl, mix(0.75, 1.8, 1.0 - steep));
        float newFloor = st.r - bowlShaped * depth * opac;
        float waterSurface = st.r - depth * (1.0 - waterFill) * 0.55;
        st.r = max(2.0, newFloor);
        if (waterFill > 0.02) {
          st.g = max(st.g, max(0.0, waterSurface - st.r) * opac);
        }
      }
    }
  }

  oState = st;
  oGeo = geo;
  oVecDisp = vdisp;
}
`;

/**
 * Interactive Non-Destructive Sculpt Layer Brush Stamp Shader.
 */
export const SCULPT_STAMP_FRAG = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;

in vec2 vUv;
out vec4 oSculpt;

uniform sampler2D uSculptTex;
uniform vec4 uBrushPosRad; // (worldX, worldZ, radiusM, worldSpan)
uniform vec4 uBrushOpStr;  // (opCode: 0=add, 1=remove, 2=smooth, strength, 0, 0)

void main() {
  ivec2 ij = ivec2(gl_FragCoord.xy);
  vec4 cur = texelFetch(uSculptTex, ij, 0);
  vec2 worldXZ = (vUv - 0.5) * uBrushPosRad.w;
  float d = length(worldXZ - uBrushPosRad.xy);
  float r = max(2.0, uBrushPosRad.z);
  if (d < r) {
    float falloff = pow(1.0 - d / r, 2.0);
    int op = int(uBrushOpStr.x + 0.5);
    float str = uBrushOpStr.y;
    if (op == 0) {
      cur.r += falloff * str * 2.4;
    } else if (op == 1) {
      cur.r -= falloff * str * 2.4;
    } else if (op == 2) {
      cur.r = mix(cur.r, 0.0, falloff * str * 0.18);
      cur.g = clamp(cur.g + falloff * str * 0.25, 0.0, 0.95);
    }
  }
  oSculpt = cur;
}
`;

/**
 * Pass 2A: Simulation Layer — River Incision & Drainage Network.
 */
export const STACK_RIVER_INCISION_FRAG = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;

in vec2 vUv;
layout(location = 0) out vec4 oState;
layout(location = 1) out vec4 oGeo;

uniform sampler2D uStateTex;
uniform sampler2D uGeoTex;
uniform vec4 uSimParams; // (gridRes, worldSpan, incisionStrength, headwaterRain)
uniform vec4 uSimExtra;  // (basinPooling, hardnessRespect, channelWidth, iterIndex)

void main() {
  int R = int(uSimParams.x);
  float cell = uSimParams.y / uSimParams.x;
  ivec2 ij = ivec2(gl_FragCoord.xy);
  ivec2 maxIJ = ivec2(R - 1);

  vec4 st = texelFetch(uStateTex, ij, 0);
  vec4 geo = texelFetch(uGeoTex, ij, 0);

  float hC = st.r + st.b + st.a + st.g;
  float inflow = uSimParams.w * 0.035;
  float minNeighSurf = hC;
  float maxDrop = 0.0;

  // 8-neighbor D8 drainage gathering + steepest-descent channel cutting!
  const ivec2 offs[8] = ivec2[8](
    ivec2(-1, 0), ivec2(1, 0), ivec2(0, -1), ivec2(0, 1),
    ivec2(-1, -1), ivec2(1, -1), ivec2(-1, 1), ivec2(1, 1)
  );

  for (int k = 0; k < 8; k++) {
    ivec2 nij = clamp(ij + offs[k], ivec2(0), maxIJ);
    vec4 nSt = texelFetch(uStateTex, nij, 0);
    vec4 nGeo = texelFetch(uGeoTex, nij, 0);
    float dist = k < 4 ? cell : cell * 1.4142;
    float nSurf = nSt.r + nSt.b + nSt.a + nSt.g;
    if (nSurf > hC) {
      // Neighbor drains toward us proportionally to slope!
      float upDrop = (nSurf - hC) / dist;
      inflow += nGeo.g * clamp(upDrop * 0.55, 0.0, 0.28);
    } else {
      minNeighSurf = min(minNeighSurf, nSurf);
      maxDrop = max(maxDrop, (hC - nSurf) / dist);
    }
  }

  float newFlow = clamp(mix(geo.g, inflow, 0.62), 0.0, 14.0);
  // Stream-power law I = K * A^m * S^n / rockResistance!
  float rockRes = mix(1.0, 0.30 + 2.8 * geo.r * geo.r, uSimExtra.y);
  float streamPower = pow(max(0.0, newFlow - 0.04), 0.65) * maxDrop;
  float cut = min(st.r - 1.5, (streamPower * uSimParams.z * 0.34) / rockRes);
  cut = max(0.0, cut);

  st.r -= cut;
  st.a += cut * 0.18; // deposit fine overbank silt

  // Pool water in closed basins & active river channels
  if (maxDrop < 0.015 && newFlow > 0.12) {
    st.g = clamp(st.g + newFlow * 0.045 * uSimExtra.x, 0.0, 18.0);
  } else {
    st.g = clamp(mix(st.g, pow(newFlow, 0.75) * 0.38 * uSimExtra.x, 0.35), 0.0, 14.0);
  }

  // Drain domain boundary cleanly
  if (ij.x <= 1 || ij.y <= 1 || ij.x >= R - 2 || ij.y >= R - 2) {
    st.g *= 0.4;
  }

  geo.g = newFlow;
  oState = st;
  oGeo = geo;
}
`;

/**
 * Pass 2B: Simulation Layer — Hydraulic Erosion, Sediment Transport & Alluvial Deposition.
 */
export const STACK_HYDRAULIC_FRAG = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;

in vec2 vUv;
layout(location = 0) out vec4 oState;
layout(location = 1) out vec4 oGeo;

uniform sampler2D uStateTex;
uniform sampler2D uGeoTex;
uniform vec4 uHydParams; // (gridRes, worldSpan, erosionStrength, sedimentCapacity)
uniform vec4 uHydExtra;  // (depositionRate, rainRate, evaporation, iterIdx)

void main() {
  int R = int(uHydParams.x);
  float cell = uHydParams.y / uHydParams.x;
  ivec2 ij = ivec2(gl_FragCoord.xy);
  ivec2 maxIJ = ivec2(R - 1);

  vec4 st = texelFetch(uStateTex, ij, 0);
  vec4 geo = texelFetch(uGeoTex, ij, 0);

  vec4 stL = texelFetch(uStateTex, clamp(ij + ivec2(-1, 0), ivec2(0), maxIJ), 0);
  vec4 stR = texelFetch(uStateTex, clamp(ij + ivec2( 1, 0), ivec2(0), maxIJ), 0);
  vec4 stD = texelFetch(uStateTex, clamp(ij + ivec2(0, -1), ivec2(0), maxIJ), 0);
  vec4 stU = texelFetch(uStateTex, clamp(ij + ivec2(0,  1), ivec2(0), maxIJ), 0);

  float surfC = st.r + st.b + st.a + st.g;
  float surfL = stL.r + stL.b + stL.a + stL.g;
  float surfR = stR.r + stR.b + stR.a + stR.g;
  float surfD = stD.r + stD.b + stD.a + stD.g;
  float surfU = stU.r + stU.b + stU.a + stU.g;

  vec2 grad = vec2(surfR - surfL, surfU - surfD) / (2.0 * cell);
  float slope = length(grad);

  // Gather upstream water & suspended fine sediment advected from higher neighbors!
  float waterIn = st.g + uHydExtra.y * 0.018;
  float sedIn = st.a;
  float outSum = max(0.0, surfC - surfL) + max(0.0, surfC - surfR) + max(0.0, surfC - surfD) + max(0.0, surfC - surfU);
  float keepFrac = outSum > 1e-4 ? exp(-outSum * 0.42) : 1.0;

  waterIn = st.g * mix(0.65, 1.0, keepFrac) + uHydExtra.y * 0.022;
  waterIn += max(0.0, surfL - surfC) * 0.14 * min(1.5, stL.g + 0.15);
  waterIn += max(0.0, surfR - surfC) * 0.14 * min(1.5, stR.g + 0.15);
  waterIn += max(0.0, surfD - surfC) * 0.14 * min(1.5, stD.g + 0.15);
  waterIn += max(0.0, surfU - surfC) * 0.14 * min(1.5, stU.g + 0.15);

  // Advect fine sediment downslope from higher cells
  float advSed = 0.0;
  if (surfL > surfC) advSed += stL.a * clamp((surfL - surfC) * 0.08, 0.0, 0.18);
  if (surfR > surfC) advSed += stR.a * clamp((surfR - surfC) * 0.08, 0.0, 0.18);
  if (surfD > surfC) advSed += stD.a * clamp((surfD - surfC) * 0.08, 0.0, 0.18);
  if (surfU > surfC) advSed += stU.a * clamp((surfU - surfC) * 0.08, 0.0, 0.18);
  float lostSed = st.a * clamp(outSum * 0.075, 0.0, 0.36);
  st.a = max(0.0, st.a - lostSed + advSed);

  float discharge = waterIn * (0.25 + slope * 2.4);
  float capacity = uHydParams.w * discharge * slope * 1.65;

  if (capacity > st.a) {
    // Under capacity -> erode soft sediment first, then cut bedrock weighted by 3D rock hardness!
    float demand = (capacity - st.a) * uHydParams.z * 0.22;
    float takeCoarse = min(st.b, demand * 0.55);
    st.b -= takeCoarse;
    float rem = demand - takeCoarse;
    float rockRes = 0.22 + 3.4 * geo.r * geo.r;
    float cutBed = min(max(0.0, st.r - 1.5), rem / rockRes);
    st.r -= cutBed;
    st.a += takeCoarse + cutBed;
  } else {
    // Over capacity on gentler piedmont slopes -> deposit sorted alluvial fan!
    float surplus = (st.a - capacity) * uHydExtra.x * 0.24;
    // Gently smooth/spread alluvial fan onto low-lying ground
    st.a = max(0.0, st.a - surplus * 0.15);
    st.r += surplus * 0.15;
  }

  st.g = clamp(waterIn * (1.0 - uHydExtra.z * 0.18), 0.0, 12.0);
  if (ij.x <= 1 || ij.y <= 1 || ij.x >= R - 2 || ij.y >= R - 2) st.g *= 0.35;
  geo.g = mix(geo.g, discharge, 0.45);

  oState = st;
  oGeo = geo;
}
`;

/**
 * Pass 2C: Simulation Layer — Thermal Weathering & Talus Scree Repose.
 */
export const STACK_THERMAL_TALUS_FRAG = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;

in vec2 vUv;
layout(location = 0) out vec4 oState;
layout(location = 1) out vec4 oGeo;

uniform sampler2D uStateTex;
uniform sampler2D uGeoTex;
uniform vec4 uTalusCfg; // (gridRes, worldSpan, reposeAngleDeg, spallingRate)
uniform vec4 uTalusExt; // (talusSpread, hardnessShield, iterIdx, 0)

void main() {
  int R = int(uTalusCfg.x);
  float cell = uTalusCfg.y / uTalusCfg.x;
  ivec2 ij = ivec2(gl_FragCoord.xy);
  ivec2 maxIJ = ivec2(R - 1);

  vec4 st = texelFetch(uStateTex, ij, 0);
  vec4 geo = texelFetch(uGeoTex, ij, 0);

  float critTan = tan(radians(clamp(uTalusCfg.z, 18.0, 52.0)));
  float maxDropBed = critTan * cell * (1.05 + 0.65 * geo.r * uTalusExt.y);
  float maxDropScree = critTan * cell * 0.88;

  float totalC = st.r + st.b + st.a;
  float spallOut = 0.0;
  float screeIn = 0.0;

  const ivec2 offs[8] = ivec2[8](
    ivec2(-1, 0), ivec2(1, 0), ivec2(0, -1), ivec2(0, 1),
    ivec2(-1, -1), ivec2(1, -1), ivec2(-1, 1), ivec2(1, 1)
  );

  for (int k = 0; k < 8; k++) {
    ivec2 nij = clamp(ij + offs[k], ivec2(0), maxIJ);
    vec4 nSt = texelFetch(uStateTex, nij, 0);
    vec4 nGeo = texelFetch(uGeoTex, nij, 0);
    float distScale = k < 4 ? 1.0 : 1.4142;
    float nTot = nSt.r + nSt.b + nSt.a;

    float excessOut = (totalC - nTot) - maxDropScree * distScale;
    if (excessOut > 0.0) {
      spallOut += excessOut * 0.085 * uTalusCfg.w;
    }

    float nMaxDrop = critTan * cell * distScale * 0.88;
    float excessIn = (nTot - totalC) - nMaxDrop;
    if (excessIn > 0.0) {
      float nShield = 1.0 - 0.55 * nGeo.r * uTalusExt.y;
      screeIn += excessIn * 0.085 * uTalusCfg.w * nShield;
    }
  }

  float shield = 1.0 - 0.55 * geo.r * uTalusExt.y;
  float totalOut = spallOut * shield;
  // Loose scree slides first; exposed over-steepened cliff bedrock spalls next!
  float loseScree = min(st.b, totalOut * 1.15);
  st.b -= loseScree;
  float loseBed = min(max(0.0, st.r - 1.5), (totalOut - loseScree * 0.85) * 0.65);
  st.r -= loseBed;

  st.b += screeIn * (0.85 + 0.25 * uTalusExt.x);

  oState = st;
  oGeo = geo;
}
`;

/**
 * Pass 2D: Simulation Layer — Glacial Cryosphere OR Aeolian Wind Saltation.
 */
export const STACK_AEOLIAN_GLACIAL_FRAG = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;

in vec2 vUv;
layout(location = 0) out vec4 oState;
layout(location = 1) out vec4 oGeo;

uniform sampler2D uStateTex;
uniform sampler2D uGeoTex;
uniform vec4 uProcCfg; // (gridRes, worldSpan, processMode, intensity)
uniform vec4 uProcExt; // (snowline, glacierCarve, azimuthDeg, maxRelief)

void main() {
  int R = int(uProcCfg.x);
  float cell = uProcCfg.y / uProcCfg.x;
  ivec2 ij = ivec2(gl_FragCoord.xy);
  ivec2 maxIJ = ivec2(R - 1);

  vec4 st = texelFetch(uStateTex, ij, 0);
  vec4 geo = texelFetch(uGeoTex, ij, 0);

  vec4 stL = texelFetch(uStateTex, clamp(ij + ivec2(-1, 0), ivec2(0), maxIJ), 0);
  vec4 stR = texelFetch(uStateTex, clamp(ij + ivec2( 1, 0), ivec2(0), maxIJ), 0);
  vec4 stD = texelFetch(uStateTex, clamp(ij + ivec2(0, -1), ivec2(0), maxIJ), 0);
  vec4 stU = texelFetch(uStateTex, clamp(ij + ivec2(0,  1), ivec2(0), maxIJ), 0);

  float hC = st.r + st.b + st.a;
  float hL = stL.r + stL.b + stL.a;
  float hR = stR.r + stR.b + stR.a;
  float hD = stD.r + stD.b + stD.a;
  float hU = stU.r + stU.b + stU.a;
  vec2 grad = vec2(hR - hL, hU - hD) / (2.0 * cell);
  float slope = length(grad);
  float lap = (hL + hR + hD + hU - 4.0 * hC) / cell;

  int mode = int(uProcCfg.z + 0.5);
  float inten = uProcCfg.w;

  if (mode == 0) {
    // Alpine Snowpack Accumulation & Cirque Glacier Ice Abrasion!
    float elevNorm = clamp(hC / max(30.0, uProcExt.w), 0.0, 1.2);
    float cold = smoothstep(uProcExt.x - 0.14, uProcExt.x + 0.20, elevNorm);
    float reposeHold = 1.0 - smoothstep(0.65, 1.45, slope);
    float cirqueCatch = clamp(0.5 + lap * 0.22, 0.15, 1.35);

    float snowTarget = cold * reposeHold * cirqueCatch * inten * 9.5;
    geo.a = mix(geo.a, snowTarget, 0.24);

    // Thick glacier ice in concave valleys plucks & widens U-shaped troughs!
    if (geo.a > 1.8) {
      float pluck = (geo.a - 1.8) * 0.022 * uProcExt.y / (0.35 + geo.r);
      st.r = max(1.5, st.r - pluck);
      st.b += pluck * 0.55; // glacial moraine gravel
    }
  } else {
    // Aeolian Wind Sand Saltation: erodes windward stoss sand & deposits on leeward slipfaces!
    float ang = radians(uProcExt.z);
    vec2 windDir = vec2(cos(ang), sin(ang));
    ivec2 upWind = clamp(ij - ivec2(round(windDir * 1.4)), ivec2(0), maxIJ);
    vec4 upSt = texelFetch(uStateTex, upWind, 0);

    float windExposure = dot(grad, windDir); // > 0 on windward stoss, < 0 on leeward shadow!
    float saltateOut = clamp(0.06 + windExposure * 0.22, 0.0, 0.24) * inten * min(st.a, 0.45);
    float upGrad = (hC - (upSt.r + upSt.b + upSt.a)) / cell;
    float saltateIn = clamp(0.06 + upGrad * 0.22, 0.0, 0.24) * inten * min(upSt.a, 0.45);

    st.a = max(0.0, st.a - saltateOut + saltateIn);
    // Gentle wind abrasion of exposed soft rock ribs
    if (st.a < 0.15 && windExposure > 0.25) {
      st.r = max(1.5, st.r - windExposure * 0.015 * inten * (1.0 - geo.r * 0.75));
    }
  }

  oState = st;
  oGeo = geo;
}
`;

/**
 * Pass 3: Surface-Data Baking Pass — Horizon Ambient Occlusion, Protrusion Curvature & Live Mask Preview!
 */
export const STACK_SURFACE_BAKE_FRAG = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;

in vec2 vUv;
out vec4 oBaked;

uniform sampler2D uStateTex;
uniform sampler2D uGeoTex;
uniform vec4 uBakeDomain; // (worldSpan, gridRes, maxRelief, 0)
uniform vec4 uMaskCfg1;   // active selected layer's mask for live B&W inspection
uniform vec4 uMaskCfg2;

${GLSL_NOISE_AND_MASK}

float totalSurfAt(ivec2 p, ivec2 maxIJ) {
  vec4 s = texelFetch(uStateTex, clamp(p, ivec2(0), maxIJ), 0);
  vec4 g = texelFetch(uGeoTex, clamp(p, ivec2(0), maxIJ), 0);
  return s.r + s.b + s.a + g.a * 0.72;
}

void main() {
  float span = uBakeDomain.x;
  int R = int(uBakeDomain.y);
  float maxRelief = uBakeDomain.z;
  float cell = span / uBakeDomain.y;
  ivec2 ij = ivec2(gl_FragCoord.xy);
  ivec2 maxIJ = ivec2(R - 1);

  float hC = totalSurfAt(ij, maxIJ);
  float hL = totalSurfAt(ij + ivec2(-1, 0), maxIJ);
  float hR = totalSurfAt(ij + ivec2( 1, 0), maxIJ);
  float hD = totalSurfAt(ij + ivec2(0, -1), maxIJ);
  float hU = totalSurfAt(ij + ivec2(0,  1), maxIJ);

  float dhdx = (hR - hL) / (2.0 * cell);
  float dhdz = (hU - hD) / (2.0 * cell);
  float slope = length(vec2(dhdx, dhdz));

  // Multi-scale ridge protrusion (> 0 on convex ridges/spurs, < 0 in gullies/crevices)
  float avg1 = 0.25 * (hL + hR + hD + hU);
  float avg4 = 0.25 * (
    totalSurfAt(ij + ivec2(-4, 0), maxIJ) +
    totalSurfAt(ij + ivec2( 4, 0), maxIJ) +
    totalSurfAt(ij + ivec2(0, -4), maxIJ) +
    totalSurfAt(ij + ivec2(0,  4), maxIJ)
  );
  float protrusion = clamp((hC - avg1) * 0.55 + (hC - avg4) * 0.14, -1.0, 1.0);

  // 8-direction multi-step Horizon Ambient Occlusion!
  const vec2 dirs[8] = vec2[8](
    vec2(1.0, 0.0), vec2(-1.0, 0.0), vec2(0.0, 1.0), vec2(0.0, -1.0),
    vec2(0.7071, 0.7071), vec2(-0.7071, 0.7071), vec2(0.7071, -0.7071), vec2(-0.7071, -0.7071)
  );
  float occ = 0.0;
  for (int d = 0; d < 8; d++) {
    float maxTan = 0.0;
    for (int s = 1; s <= 4; s++) {
      float stepCells = float(s * s) * 1.35;
      ivec2 pij = ij + ivec2(round(dirs[d] * stepCells));
      float hS = totalSurfAt(pij, maxIJ);
      float distM = stepCells * cell;
      maxTan = max(maxTan, (hS - hC) / max(0.5, distM));
    }
    occ += maxTan / sqrt(1.0 + maxTan * maxTan);
  }
  float ao = clamp(1.0 - (occ / 8.0) * 0.92, 0.12, 1.0);

  vec4 geo = texelFetch(uGeoTex, ij, 0);
  float lap = (hL + hR + hD + hU - 4.0 * hC) / cell;
  vec2 worldXZ = (vUv - 0.5) * span;
  float maskPrev = evalLayerMask(worldXZ, span, hC, maxRelief, slope, geo.g, lap, uMaskCfg1, uMaskCfg2);

  oBaked = vec4(ao, protrusion, maskPrev, clamp(slope, 0.0, 6.0));
}
`;

/**
 * Pass 4A: 3D Vector-Displaced Terrain Vertex Shader (supports true 3D Overhangs & Leaning Stacks!).
 */
export const PIPELINE_TERRAIN_VERT = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;

layout(location = 0) in vec2 aGridUv;

uniform sampler2D uStateTex;
uniform sampler2D uGeoTex;
uniform sampler2D uVecDispTex;
uniform mat4 uViewProj;
uniform vec4 uRenderDomain; // (worldSpan, gridRes, showWater, timeSec)

out vec2 vUv;
out vec3 vWorldPos;
out vec3 vNormal;
out vec4 vState;
out vec4 vGeo;

vec3 evalDisplacedPos(ivec2 ij, ivec2 maxIJ, float span, float R) {
  ivec2 cij = clamp(ij, ivec2(0), maxIJ);
  vec2 uv = vec2(cij) / (R - 1.0);
  vec2 baseXZ = (uv - 0.5) * span;
  vec4 st = texelFetch(uStateTex, cij, 0);
  vec4 geo = texelFetch(uGeoTex, cij, 0);
  vec4 vd = texelFetch(uVecDispTex, cij, 0);
  float waterLift = uRenderDomain.z > 0.5 ? st.g : 0.0;
  float y = st.r + st.b + st.a + geo.a * 0.72 + waterLift + vd.y;
  return vec3(baseXZ.x + vd.x, y, baseXZ.y + vd.z);
}

void main() {
  float span = uRenderDomain.x;
  float R = uRenderDomain.y;
  ivec2 maxIJ = ivec2(int(R) - 1);
  ivec2 ij = clamp(ivec2(round(aGridUv * (R - 1.0))), ivec2(0), maxIJ);

  vUv = aGridUv;
  vState = texelFetch(uStateTex, ij, 0);
  vGeo = texelFetch(uGeoTex, ij, 0);

  vec3 P = evalDisplacedPos(ij, maxIJ, span, R);
  vec3 PL = evalDisplacedPos(ij + ivec2(-1, 0), maxIJ, span, R);
  vec3 PR = evalDisplacedPos(ij + ivec2( 1, 0), maxIJ, span, R);
  vec3 PD = evalDisplacedPos(ij + ivec2(0, -1), maxIJ, span, R);
  vec3 PU = evalDisplacedPos(ij + ivec2(0,  1), maxIJ, span, R);

  // True 3D Jacobian surface normal (handles lateral cliff overhangs & leaning stacks accurately!)
  vec3 dX = PR - PL;
  vec3 dZ = PU - PD;
  vec3 N = cross(dZ, dX);
  float nl = length(N);
  vNormal = nl > 1e-5 ? N / nl : vec3(0.0, 1.0, 0.0);
  vWorldPos = P;

  gl_Position = uViewProj * vec4(P, 1.0);
}
`;

const DERIVED_SURFACE_SHADING_FN = `
// Clean, physically derived surface shading from AO, protrusions, height, rock hardness,
// coarse talus, fine sediment, drainage flow, and snow — ZERO noisy fake colour textures!
vec3 shadeDerivedGeology(
  int paletteId,
  int shadingMode,
  vec3 worldPos,
  vec3 N,
  vec3 V,
  vec3 sunDir,
  float ao,
  float protrusion,
  float maskPreview,
  float hardness,
  float strataPhase,
  float flow,
  float waterDepth,
  float coarseTalus,
  float fineSed,
  float snowDepth,
  float maxRelief
) {
  float elevNorm = clamp(worldPos.y / max(30.0, maxRelief), 0.0, 1.15);
  float steep = 1.0 - clamp(N.y, 0.0, 1.0);

  // Diagnostic Shading Modes
  if (shadingMode == 1) {
    // AO & Protrusions inspection
    vec3 pCol = protrusion >= 0.0
      ? mix(vec3(0.46), vec3(0.95, 0.84, 0.66), clamp(protrusion * 1.4, 0.0, 1.0))
      : mix(vec3(0.46), vec3(0.18, 0.26, 0.36), clamp(-protrusion * 1.4, 0.0, 1.0));
    return pCol * ao;
  }
  if (shadingMode == 2) {
    // 3D Rock Hardness & Strata Competency
    return mix(vec3(0.24, 0.30, 0.38), vec3(0.92, 0.64, 0.34), hardness) * (0.45 + 0.55 * ao);
  }
  if (shadingMode == 3) {
    // Drainage Flow & Water Depth
    float f = clamp(log2(1.0 + flow * 16.0) * 0.26, 0.0, 1.0);
    vec3 base = vec3(0.20, 0.21, 0.22) * ao;
    vec3 wet = mix(vec3(0.16, 0.52, 0.76), vec3(0.55, 0.90, 0.98), clamp(waterDepth * 0.25 + f * 0.5, 0.0, 1.0));
    return mix(base, wet, clamp(f + step(0.05, waterDepth) * 0.65, 0.0, 1.0));
  }
  if (shadingMode == 4) {
    // Sedimentation (Coarse Talus vs Fine Alluvial Deposit)
    vec3 clay = vec3(0.26, 0.26, 0.27) * ao;
    clay = mix(clay, vec3(0.84, 0.54, 0.24), clamp(coarseTalus * 0.32, 0.0, 1.0));
    clay = mix(clay, vec3(0.92, 0.84, 0.52), clamp(fineSed * 0.28, 0.0, 1.0));
    return clay;
  }
  if (shadingMode == 5) {
    // Active Layer Black-and-White Mask Preview!
    float lit = 0.65 + 0.35 * max(dot(N, sunDir), 0.0);
    return vec3(clamp(maskPreview, 0.0, 1.0)) * lit;
  }
  if (shadingMode == 6) {
    // Pure Sculptor Clay (geometry + AO + protrusions only)
    vec3 clay = vec3(0.58, 0.56, 0.53) * (0.88 + 0.16 * protrusion);
    float ndl = max(dot(N, sunDir), 0.0);
    return clay * (0.28 * ao + 0.78 * ndl);
  }

  // Palette Base Tones (Soft Recessive Rock, Hard Resistant Bedrock, Coarse Talus, Fine Alluvial Sediment)
  vec3 softRock = vec3(0.30, 0.29, 0.28);
  vec3 hardRock = vec3(0.46, 0.45, 0.43);
  vec3 talusCol = vec3(0.38, 0.36, 0.33);
  vec3 fineCol  = vec3(0.60, 0.55, 0.45);

  if (paletteId == 1) {
    // Colorado Redrock Strata
    softRock = vec3(0.48, 0.24, 0.17);
    hardRock = vec3(0.74, 0.42, 0.27);
    talusCol = vec3(0.56, 0.31, 0.21);
    fineCol  = vec3(0.78, 0.58, 0.40);
  } else if (paletteId == 2) {
    // Icelandic Basalt & Rhyolite
    softRock = vec3(0.18, 0.19, 0.21);
    hardRock = vec3(0.29, 0.31, 0.34);
    talusCol = vec3(0.22, 0.23, 0.25);
    fineCol  = vec3(0.34, 0.34, 0.31);
  } else if (paletteId == 3) {
    // Arid Sandstone & Erg
    softRock = vec3(0.54, 0.39, 0.27);
    hardRock = vec3(0.70, 0.53, 0.37);
    talusCol = vec3(0.60, 0.45, 0.32);
    fineCol  = vec3(0.84, 0.68, 0.46);
  } else if (paletteId == 4) {
    // Limestone Karst & Highland
    softRock = vec3(0.36, 0.35, 0.32);
    hardRock = vec3(0.62, 0.60, 0.55);
    talusCol = vec3(0.46, 0.45, 0.41);
    fineCol  = vec3(0.55, 0.52, 0.43);
  } else if (paletteId == 5) {
    // Lunar Regolith & Basalt
    softRock = vec3(0.26, 0.26, 0.27);
    hardRock = vec3(0.48, 0.48, 0.49);
    talusCol = vec3(0.38, 0.38, 0.39);
    fineCol  = vec3(0.56, 0.56, 0.57);
  }

  // 1. Bedrock explained by hardness & subtle strata bedding phase
  float strataTone = 0.92 + 0.14 * sin(strataPhase * 6.28318);
  vec3 albedo = mix(softRock, hardRock, hardness) * strataTone;

  // 2. Protrusion ridge highlighting vs gully crevice darkening (purely geometric!)
  albedo *= (1.0 + protrusion * 0.22);

  // 3. Coarse talus scree & fine alluvial sediment blankets
  float talusMask = clamp(coarseTalus * 0.42, 0.0, 1.0) * (1.0 - smoothstep(0.65, 0.92, steep) * 0.5);
  float fineMask = clamp(fineSed * 0.36, 0.0, 1.0) * (1.0 - smoothstep(0.45, 0.80, steep) * 0.75);
  albedo = mix(albedo, talusCol, talusMask);
  albedo = mix(albedo, fineCol, fineMask);

  // 4. Wet rock darkening along active drainage flow channels
  float damp = clamp(flow * 0.45, 0.0, 0.65);
  albedo *= mix(1.0, 0.62, damp);

  // 5. Cryosphere snow / glacier ice blanket where present
  float snowMask = clamp(snowDepth * 0.32, 0.0, 1.0) * (1.0 - smoothstep(0.62, 0.90, steep) * 0.80);
  albedo = mix(albedo, vec3(0.90, 0.93, 0.97), snowMask);

  // 6. Physically-based sun + sky hemisphere + horizon AO lighting
  float ndl = max(dot(N, sunDir), 0.0);
  vec3 skyCol = paletteId == 5 ? vec3(0.04) : vec3(0.42, 0.52, 0.66);
  vec3 sunCol = paletteId == 5 ? vec3(1.28, 1.26, 1.24) : vec3(1.18, 1.08, 0.95);
  vec3 hemi = skyCol * (0.35 + 0.65 * clamp(N.y * 0.5 + 0.5, 0.0, 1.0)) * ao;
  vec3 bounce = albedo * vec3(0.22, 0.20, 0.17) * (1.0 - ao) * 0.55;
  vec3 lit = albedo * (hemi * 0.68 + sunCol * ndl * (0.35 + 0.65 * ao)) + bounce;

  // Specular glint on wet channels & snow
  vec3 H = normalize(sunDir + V);
  float spec = pow(max(dot(N, H), 0.0), 42.0) * (damp * 0.22 + snowMask * 0.18);
  lit += sunCol * spec;

  // 7. Shallow-to-deep 2.5D river & lake water transmission + Fresnel sky reflection
  if (waterDepth > 0.03) {
    float wAlpha = clamp(waterDepth * 0.38, 0.0, 0.92);
    vec3 shallowCol = vec3(0.14, 0.38, 0.42);
    vec3 deepCol = vec3(0.04, 0.14, 0.22);
    vec3 waterBody = mix(shallowCol, deepCol, clamp(waterDepth * 0.14, 0.0, 1.0));
    vec3 wN = normalize(mix(N, vec3(0.0, 1.0, 0.0), 0.88));
    float fres = 0.04 + 0.96 * pow(1.0 - max(dot(wN, V), 0.0), 4.2);
    float wSpec = pow(max(dot(wN, H), 0.0), 140.0) * 0.95;
    vec3 wLit = mix(lit * vec3(0.72, 0.86, 0.90), waterBody * (0.4 + 0.7 * max(dot(wN, sunDir), 0.0)), wAlpha);
    lit = mix(wLit, skyCol * 1.15, fres * 0.55 * wAlpha) + sunCol * wSpec * step(0.06, waterDepth);
  }

  return lit;
}
`;

export const PIPELINE_TERRAIN_FRAG = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;

in vec2 vUv;
in vec3 vWorldPos;
in vec3 vNormal;
in vec4 vState;
in vec4 vGeo;

out vec4 oColor;

uniform sampler2D uBakedTex;
uniform sampler2D uCavePortalTex;
uniform vec3 uCameraPos;
uniform vec3 uSunDir;
uniform vec4 uRenderDomain; // (worldSpan, gridRes, showWater, maxRelief)
uniform ivec2 uShadeConfig; // (paletteId, shadingMode)
uniform vec4 uBrushCursor;  // (worldX, worldZ, radiusM, activeCode)

vec4 sampleBilinearFloat(sampler2D tex, vec2 uv, float res) {
  vec2 st = clamp(uv, 0.0, 1.0) * (res - 1.0);
  ivec2 i0 = ivec2(floor(st));
  ivec2 i1 = min(i0 + ivec2(1), ivec2(int(res) - 1));
  vec2 f = st - vec2(i0);
  vec4 v00 = texelFetch(tex, i0, 0);
  vec4 v10 = texelFetch(tex, ivec2(i1.x, i0.y), 0);
  vec4 v01 = texelFetch(tex, ivec2(i0.x, i1.y), 0);
  vec4 v11 = texelFetch(tex, i1, 0);
  return mix(mix(v00, v10, f.x), mix(v01, v11, f.x), f.y);
}

${DERIVED_SURFACE_SHADING_FN}

void main() {
  // Cut smooth organic portal opening into the heightfield skin wherever 3D SDF Caves breach the cliff face!
  vec4 portal = sampleBilinearFloat(uCavePortalTex, vUv, 128.0);
  if (portal.r > 0.46 && vState.g < 0.15) {
    discard;
  }

  vec3 N = normalize(vNormal);
  vec3 V = normalize(uCameraPos - vWorldPos);
  vec3 sunDir = normalize(uSunDir);
  vec4 baked = sampleBilinearFloat(uBakedTex, vUv, uRenderDomain.y);

  // Darken lip immediately surrounding a 3D SDF cave opening for seamless contact occlusion
  float portalRimAO = 1.0 - smoothstep(0.08, 0.46, portal.r) * 0.52;
  float ao = baked.r * portalRimAO;

  vec3 col = shadeDerivedGeology(
    uShadeConfig.x,
    uShadeConfig.y,
    vWorldPos,
    N,
    V,
    sunDir,
    ao,
    baked.g,
    baked.b,
    vGeo.r,
    vGeo.b,
    vGeo.g,
    uRenderDomain.z > 0.5 ? vState.g : 0.0,
    vState.b,
    vState.a,
    vGeo.a,
    uRenderDomain.w
  );

  // Aerial perspective haze
  float dist = length(uCameraPos - vWorldPos);
  float fog = uShadeConfig.x == 5 ? 0.0 : clamp(1.0 - exp(-dist * 0.00048), 0.0, 0.45);
  col = mix(col, vec3(0.56, 0.63, 0.72), fog);

  // Sculpt / Cave / Storm Brush Ring Gizmo
  if (uBrushCursor.w > 0.5) {
    float bd = abs(length(vWorldPos.xz - uBrushCursor.xy) - uBrushCursor.z);
    float ring = 1.0 - smoothstep(0.5, 2.2, bd);
    vec3 ringCol = uBrushCursor.w > 2.5 ? vec3(0.95, 0.58, 0.32) : vec3(0.86, 0.84, 0.76);
    col = mix(col, ringCol, ring * 0.80);
  }

  // ACES filmic tone map + sRGB
  col = (col * (2.51 * col + 0.03)) / (col * (2.43 * col + 0.59) + 0.14);
  col = pow(clamp(col, 0.0, 1.0), vec3(1.0 / 2.2));
  oColor = vec4(col, 1.0);
}
`;

/**
 * Pass 4B: Real 3D Volumetric SDF Cave & Cliff-Undercut Interior Shader.
 */
export const SDF_CAVE_VERT = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;

layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aNormal;
layout(location = 2) in vec4 aAttrib; // (caveAO, hardness, heightNorm, caveDepth)

uniform mat4 uViewProj;

out vec3 vWorldPos;
out vec3 vNormal;
out vec4 vAttrib;

void main() {
  vWorldPos = aPos;
  vNormal = aNormal;
  vAttrib = aAttrib;
  gl_Position = uViewProj * vec4(aPos, 1.0);
}
`;

export const SDF_CAVE_FRAG = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;

in vec3 vWorldPos;
in vec3 vNormal;
in vec4 vAttrib;

out vec4 oColor;

uniform vec3 uCameraPos;
uniform vec3 uSunDir;
uniform vec4 uRenderDomain; // (worldSpan, gridRes, showWater, maxRelief)
uniform ivec2 uShadeConfig; // (paletteId, shadingMode)

${DERIVED_SURFACE_SHADING_FN}

void main() {
  vec3 N = normalize(gl_FrontFacing ? vNormal : -vNormal);
  vec3 V = normalize(uCameraPos - vWorldPos);
  vec3 sunDir = normalize(uSunDir);

  float caveAO = vAttrib.x;
  float hardness = vAttrib.y;
  float strataPhase = fract(vWorldPos.y * 0.065);
  float protrusion = clamp(-vAttrib.w * 0.08, -0.8, 0.2);

  vec3 col = shadeDerivedGeology(
    uShadeConfig.x,
    uShadeConfig.y,
    vWorldPos,
    N,
    V,
    sunDir,
    caveAO,
    protrusion,
    1.0,
    hardness,
    strataPhase,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    uRenderDomain.w
  );

  float dist = length(uCameraPos - vWorldPos);
  float fog = uShadeConfig.x == 5 ? 0.0 : clamp(1.0 - exp(-dist * 0.00048), 0.0, 0.45);
  col = mix(col, vec3(0.56, 0.63, 0.72), fog);

  col = (col * (2.51 * col + 0.03)) / (col * (2.43 * col + 0.59) + 0.14);
  col = pow(clamp(col, 0.0, 1.0), vec3(1.0 / 2.2));
  oColor = vec4(col, 1.0);
}
`;

/**
 * Syncs Pipeline State (bedrock, water, coarse, fine) + Geo (.a snow) into
 * Engine Terrain (bedrock, coarse, fine, water) + Engine Snow (.r snow) for
 * 3D Rock Placement, 3D Grass Instancing, and .GLB / .OBJ Export.
 */
export const STACK_SYNC_EXPORT_FRAG = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;

in vec2 vUv;
layout(location = 0) out vec4 oEngineTerrain;
layout(location = 1) out vec4 oEngineSnow;

uniform sampler2D uStateTex;
uniform sampler2D uGeoTex;

void main() {
  ivec2 ij = ivec2(gl_FragCoord.xy);
  vec4 st = texelFetch(uStateTex, ij, 0);
  vec4 geo = texelFetch(uGeoTex, ij, 0);
  oEngineTerrain = vec4(st.r, st.b, st.a, st.g);
  oEngineSnow = vec4(geo.a * 0.72, 0.0, 0.0, 0.0);
}
`;

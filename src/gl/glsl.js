/* ============================================================
 * Frontier · SDF terrain — GLSL (WebGL2, GLSL ES 3.00)
 *
 * The terrain is NOT rendered as a mesh. The preview sphere-traces the
 * live signed-distance volume and shades the hit, which means:
 *   · you see the terrain the engine will see, before meshing;
 *   · caves, arches and undercuts are visible while sculpting them;
 *   · a sculpt stroke appears immediately (only the texture changes),
 *     with no re-tessellation pause.
 * The extracted mesh is still produced (exports, engine hand-off), it
 * is just not what the viewport draws.
 *
 * Data uploaded per frame:
 *   · uSdfTex   RGBA32F 3D texture, R = signed distance, G = wetness,
 *               B = accumulated erosion, A = accumulated deposition
 *   · uSurfA/B  surface channels on the erosion grid (height, slope,
 *               curvature, flow, erosion, deposit, hardness, exposure)
 *   · uSplatA/B five material weights + wetness
 *   · uMatAlb/uMatNrm  2D texture arrays, 5 layers each (baked albedo
 *               and normal), sampled triplanar so cliffs keep their grain
 * ============================================================ */

export const FULLSCREEN_VS = `#version 300 es
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

export const SDF_RAYCAST_FS = `#version 300 es
precision highp float;
precision highp sampler3D;

uniform sampler3D uSdfTex;
uniform sampler2D uSurfA, uSurfB, uSplatA, uSplatB;
uniform sampler2D uMatAlb, uMatNrm;
uniform ivec3 uDims;
uniform vec3 uVolMin, uVolMax, uCell, uGridOrigin, uGridSize;
uniform vec2 uGrid;               // nx, nz of the surface map
uniform vec3 uCamPos;
uniform mat3 uCamBasis;           // right, up, forward
uniform vec2 uResolution;
uniform float uFovTan, uMaxDist;
uniform vec3 uSunDir, uSunColor, uSkyTop, uSkyHorizon, uFogColor;
uniform float uWaterLevel, uFogDensity, uSnowLine, uDetailFade;
uniform float uChannelPreview;    // 0 = materials, >0 = debug channel index
uniform float uShowFlow;

out vec4 fragColor;

#define LAYER_COUNT 5

/* ------------------------- volume access ------------------------- */
vec4 volFetch(ivec3 c) {
  return texelFetch(uSdfTex, clamp(c, ivec3(0), uDims - 1), 0);
}

struct Field { float d; vec3 grad; vec4 tex; };

/* One trilinear fetch: distance, gradient AND the auxiliary channels
 * (wetness / erosion / deposition). The gradient falls out of the
 * interpolant analytically, which is both cheaper and smoother than
 * finite differences of an already-interpolated field. */
Field fieldAt(vec3 p) {
  Field f;
  vec3 g = (p - uVolMin) / (uVolMax - uVolMin) * vec3(uDims) - 0.5;
  ivec3 i0 = ivec3(floor(g));
  vec3 fr = g - vec3(i0);
  ivec3 c = clamp(i0, ivec3(0), uDims - 1);
  vec4 v000 = volFetch(ivec3(c.x,   c.y,   c.z));
  vec4 v100 = volFetch(ivec3(c.x+1, c.y,   c.z));
  vec4 v010 = volFetch(ivec3(c.x,   c.y+1, c.z));
  vec4 v110 = volFetch(ivec3(c.x+1, c.y+1, c.z));
  vec4 v001 = volFetch(ivec3(c.x,   c.y,   c.z+1));
  vec4 v101 = volFetch(ivec3(c.x+1, c.y,   c.z+1));
  vec4 v011 = volFetch(ivec3(c.x,   c.y+1, c.z+1));
  vec4 v111 = volFetch(ivec3(c.x+1, c.y+1, c.z+1));

  vec4 a0 = mix(v000, v100, fr.x);
  vec4 a1 = mix(v010, v110, fr.x);
  vec4 b0 = mix(v001, v101, fr.x);
  vec4 b1 = mix(v011, v111, fr.x);
  vec4 c0 = mix(a0, a1, fr.y);
  vec4 c1 = mix(b0, b1, fr.y);
  vec4 val = mix(c0, c1, fr.z);

  vec4 dx4 = mix(mix(v100 - v000, v110 - v010, fr.y), mix(v101 - v001, v111 - v011, fr.y), fr.z);
  vec4 dy4 = mix(a1 - a0, b1 - b0, fr.z);
  vec4 dz4 = c1 - c0;
  vec3 inv = 1.0 / max(uCell, vec3(1e-5));
  f.grad = vec3(dx4.r * inv.x, dy4.r * inv.y, dz4.r * inv.z);
  f.d = val.r;
  f.tex = val;
  return f;
}

float boxDist(vec3 p) {
  vec3 q = max(max(uVolMin - p, p - uVolMax), vec3(0.0));
  return length(q);
}

/* Distance only (used by AO / shadow marches): skips the gradient work. */
float sdfOnly(vec3 p) {
  vec3 g = (p - uVolMin) / (uVolMax - uVolMin) * vec3(uDims) - 0.5;
  ivec3 i0 = ivec3(floor(g));
  vec3 fr = g - vec3(i0);
  ivec3 c = clamp(i0, ivec3(0), uDims - 1);
  float x00 = mix(volFetch(ivec3(c.x, c.y, c.z)).r,     volFetch(ivec3(c.x+1, c.y, c.z)).r, fr.x);
  float x10 = mix(volFetch(ivec3(c.x, c.y+1, c.z)).r,   volFetch(ivec3(c.x+1, c.y+1, c.z)).r, fr.x);
  float x01 = mix(volFetch(ivec3(c.x, c.y, c.z+1)).r,   volFetch(ivec3(c.x+1, c.y, c.z+1)).r, fr.x);
  float x11 = mix(volFetch(ivec3(c.x, c.y+1, c.z+1)).r, volFetch(ivec3(c.x+1, c.y+1, c.z+1)).r, fr.x);
  return mix(mix(x00, x10, fr.y), mix(x01, x11, fr.y), fr.z) + boxDist(p);
}

/* ------------------------------ tracing ------------------------------ */
struct Hit { bool ok; float t; vec3 p; vec3 n; vec4 tex; };

Hit trace(vec3 ro, vec3 rd, float maxT) {
  Hit h;
  h.ok = false; h.t = 0.0; h.p = ro; h.n = vec3(0.0, 1.0, 0.0); h.tex = vec4(0.0);
  float t = 0.0;
  float minStep = min(min(uCell.x, uCell.y), uCell.z) * 0.3;
  for (int i = 0; i < 300; i++) {
    vec3 p = ro + rd * t;
    Field f = fieldAt(p);
    float d = f.d + boxDist(p);
    if (d < max(0.002, t * 0.0013)) {
      h.ok = true;
      h.t = t;
      h.p = p;
      h.n = length(f.grad) > 1e-6 ? normalize(f.grad) : vec3(0.0, 1.0, 0.0);
      // remember the auxiliary channels at the surface
      h.tex = vec4(f.tex.g, f.tex.b, f.tex.a, 1.0);
      return h;
    }
    t += max(d * 0.9, minStep);
    if (t > maxT) break;
  }
  return h;
}

/* ---------------------------- ambient / shadow ---------------------------- */
float ambientOcclusion(vec3 p, vec3 n) {
  float occ = 0.0, sca = 1.0;
  for (int i = 1; i <= 5; i++) {
    float h = 0.08 * float(i) + 0.045 * float(i) * float(i);
    float d = sdfOnly(p + n * h);
    occ += (h - d) * sca;
    sca *= 0.75;
  }
  return clamp(1.0 - 1.0 * occ, 0.0, 1.0);
}

float softShadow(vec3 p, vec3 n, vec3 ld) {
  float res = 1.0;
  float t = 0.10;
  for (int i = 0; i < 32; i++) {
    float d = sdfOnly(p + n * 0.07 + ld * t);
    res = min(res, 20.0 * d / t);
    t += clamp(d, 0.06, 1.5);
    if (res < 0.02 || t > 70.0) break;
  }
  return clamp(res, 0.0, 1.0);
}

/* ------------------------------ surface maps ------------------------------ */
vec4 surfaceA(vec2 uv) { return texture(uSurfA, uv); }
vec4 surfaceB(vec2 uv) { return texture(uSurfB, uv); }

vec2 worldToGrid(vec3 p) {
  return (p.xz - uGridOrigin.xz) / uGridSize.xz;
}

/* Procedural micro detail added on top of the baked textures: at voxel
 * resolution the baked maps alone look flat, and the mesh the engine gets
 * is coarser than the texture, so the fine scale has to come from noise. */
float hash(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float vnoise(vec3 x) {
  vec3 i = floor(x), f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
                 mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                 mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm3(vec3 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { s += a * vnoise(p); p *= 2.03; a *= 0.5; }
  return s;
}

vec3 triplanar(sampler2D tex, vec3 p, vec3 n, float scale, float layer, float detailOn) {
  vec3 w = abs(n);
  w = pow(w, vec3(3.0));
  w /= (w.x + w.y + w.z + 1e-5);
  vec3 px = texture(tex, vec3(p.zy * scale, layer)).rgb;
  vec3 py = texture(tex, vec3(p.xz * scale, layer)).rgb;
  vec3 pz = texture(tex, vec3(p.xy * scale, layer)).rgb;
  vec3 c = px * w.x + py * w.y + pz * w.z;
  if (detailOn > 0.5) {
    float d = fbm3(p * scale * 6.0) ;
    c *= 0.88 + 0.24 * d;
  }
  return c;
}

/* ------------------------------- materials ------------------------------- */
void main() {
  vec2 ndc = (gl_FragCoord.xy / uResolution) * 2.0 - 1.0;
  vec3 rd = normalize(uCamBasis * vec3(ndc.x * uFovTan * (uResolution.x / uResolution.y),
                                       ndc.y * uFovTan, 1.0));
  vec3 ro = uCamPos;

  Hit h = trace(ro, rd, uMaxDist);
  vec3 sky;
  {
    float horizon = smoothstep(-0.25, 0.35, rd.y);
    sky = mix(uSkyHorizon, uSkyTop, pow(horizon, 0.75));
    float sun = max(dot(rd, uSunDir), 0.0);
    sky += uSunColor * (pow(sun, 900.0) * 3.0 + pow(sun, 12.0) * 0.10);
  }

  if (!h.ok) {
    float depth = uMaxDist;
    vec2 ndc2 = (gl_FragCoord.xy / uResolution) * 2.0 - 1.0;
    vec3 fwd = normalize(uCamBasis * vec3(0.0, 0.0, 1.0));
    fragColor = vec4(sky, depth);
    return;
  }

  float t = h.t;
  vec3 p = h.p;
  vec3 n = normalize(h.n);

  // -------- surface channels from the erosion grid --------
  vec2 uv = worldToGrid(p);
  vec4 sA = surfaceA(uv);       // height, slope, curvature, flow
  vec4 sB = surfaceB(uv);       // erosion, deposit, hardness, exposure
  float wet = clamp(h.tex.x, 0.0, 1.0);   // wetness carried by the volume

  float slope = clamp(max(sA.g, 1.0 - n.y) * 1.35, 0.0, 1.0);
  float height = sA.r;
  float flow = sA.b;
  float curv = sA.a;
  float erosion = sB.r;
  float deposit = sB.g;
  float hardness = sB.b;
  float exposure = sB.a;

  // -------- material weights (same rules as the exporter splatmaps) --------
  float snow = smoothstep(uSnowLine, uSnowLine + 0.22, height) * (1.0 - smoothstep(0.55, 0.85, slope));
  float rock = clamp(max(smoothstep(0.42, 0.78, slope), exposure * 1.1) + erosion * 0.3 * (1.0 - deposit), 0.0, 1.0);
  float sandBand = 1.0 - smoothstep(0.01, 0.06, abs(p.y - uWaterLevel));
  float sand = clamp(max(sandBand * (1.0 - smoothstep(0.03, 0.16, slope)), deposit * 0.85 * (1.0 - smoothstep(0.1, 0.5, slope))), 0.0, 1.0);
  float dirt = clamp(smoothstep(0.16, 0.42, slope) * 0.8 + flow * 0.5 + erosion * 0.35, 0.0, 1.0) * (1.0 - rock * 0.6);
  float grass = clamp(1.0 - snow - rock - sand - dirt, 0.0, 1.0);
  float sum = grass + dirt + rock + sand + snow + 1e-4;
  grass /= sum; dirt /= sum; rock /= sum; sand /= sum; snow /= sum;

  vec3 albedo = vec3(0.0);
  float texScale = 1.0 / 9.0;
  float detailOn = step(0.0, uDetailFade - clamp(t / 90.0, 0.0, 1.0));
  albedo += grass * triplanar(uMatAlb, p, n, texScale, 0.1, detailOn);
  albedo += dirt  * triplanar(uMatAlb, p, n, texScale, 1.1, detailOn);
  albedo += rock  * triplanar(uMatAlb, p, n, texScale, 2.1, detailOn);
  albedo += sand  * triplanar(uMatAlb, p, n, texScale, 3.1, detailOn);
  albedo += snow  * triplanar(uMatAlb, p, n, texScale, 4.1, detailOn);

  // rock strata bands on steep faces
  float band = 0.5 + 0.5 * sin(p.y * 2.1 + fbm3(p * 0.35) * 3.0);
  albedo *= 1.0 - rock * 0.16 * (1.0 - band);

  // -------- lighting --------
  float ao = ambientOcclusion(p, n);
  float sha = softShadow(p, n, uSunDir);
  float ndl = max(dot(n, uSunDir), 0.0);
  vec3 sunLit = uSunColor * ndl * sha;
  vec3 skyLit = mix(uSkyHorizon, uSkyTop, 1.0 - ao * 0.5) * (0.35 + 0.65 * ao) * 0.55;

  vec3 col = albedo * (sunLit * 1.25 + skyLit);
  // specular sheen on wet ground and snow
  float gloss = mix(mix(0.02, 0.25, snow), 0.35, clamp(wet * 1.2, 0.0, 1.0));
  vec3 hvec = normalize(uSunDir - rd);
  col += uSunColor * pow(max(dot(n, hvec), 0.0), 40.0) * gloss * sha;

  // wet channels darken
  col *= 1.0 - 0.42 * wet * (1.0 - snow);
  // snow fills crevices: brighten concave areas
  col *= 1.0 + 0.12 * snow * (1.0 - curv);

  // -------- water surface / shore --------
  if (p.y < uWaterLevel + 0.02) {
    float depth = uWaterLevel - p.y;
    float shallow = 1.0 - smoothstep(0.02, 1.1, depth);
    col = mix(col, mix(col * 0.55 + vec3(0.02, 0.09, 0.13), vec3(0.10, 0.26, 0.30), shallow), 0.55 + 0.35 * (1.0 - shallow));
    col += vec3(0.35, 0.42, 0.4) * shallow * 0.25;  // foam / wet sand line
  }

  // -------- fog --------
  float fog = 1.0 - exp(-uFogDensity * t * 0.001);
  col = mix(col, uFogColor, clamp(fog, 0.0, 0.85));

  // -------- debug channel preview --------
  if (uChannelPreview > 0.5) {
    vec3 dbg = vec3(sA.r);
    if (uChannelPreview < 1.5) dbg = vec3(sA.g);
    else if (uChannelPreview < 2.5) dbg = vec3(sA.a);
    else if (uChannelPreview < 3.5) dbg = vec3(sA.b);
    else if (uChannelPreview < 4.5) dbg = vec3(sB.r);
    else if (uChannelPreview < 5.5) dbg = vec3(sB.g);
    else if (uChannelPreview < 6.5) dbg = vec3(sB.c);
    else if (uChannelPreview < 7.5) dbg = vec3(sB.a);
    col = dbg * (0.55 + 0.45 * ndl);
  }

  fragColor = vec4(col, t);
}
`;

export const WATER_VS = `#version 300 es
precision highp float;
in vec2 aXZ;
in float aLevel;
uniform mat4 uViewProj;
uniform vec3 uCamPos;
uniform float uTime;
out vec3 vWorld;
out float vLevel;
void main() {
  vec3 p = vec3(aXZ.x, aLevel, aXZ.y);
  vWorld = p;
  vLevel = aLevel;
  gl_Position = uViewProj * vec4(p, 1.0);
}`;

export const WATER_FS = `#version 300 es
precision highp float;
precision highp sampler3D;
in vec3 vWorld;
in float vLevel;
uniform sampler2D uSceneColor;    // rgb = colour, a = linear depth
uniform sampler2D uSurfA;
uniform sampler2D uSurfB;
uniform vec2 uResolution;
uniform vec3 uCamPos, uSunDir, uSunColor, uSkyTop, uSkyHorizon, uFogColor;
uniform vec3 uGridOrigin, uGridSize;
uniform float uWaterLevel, uTime, uFogDensity;
out vec4 fragColor;

float vnoise(vec2 x) {
  vec2 i = floor(x), f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  float a = fract(sin(dot(i, vec2(12.9898, 78.233))) * 43758.5453);
  float b = fract(sin(dot(i + vec2(1, 0), vec2(12.9898, 78.233))) * 43758.5453);
  float c = fract(sin(dot(i + vec2(0, 1), vec2(12.9898, 78.233))) * 43758.5453);
  float d = fract(sin(dot(i + vec2(1, 1), vec2(12.9898, 78.233))) * 43758.5453);
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  vec4 scene = texture(uSceneColor, uv);
  float sceneDepth = scene.a;

  vec3 view = normalize(uCamPos - vWorld);
  float dist = length(uCamPos - vWorld);
  if (dist > sceneDepth + 0.05) discard;   // land occludes the water plane

  // ripples
  vec2 q = vWorld.xz * 1.6;
  float n1 = vnoise(q + vec2(uTime * 0.06, uTime * 0.04));
  float n2 = vnoise(q * 2.7 - vec2(uTime * 0.05, uTime * 0.03));
  float ripple = (n1 - 0.5) * 0.6 + (n2 - 0.5) * 0.3;
  vec3 normal = normalize(vec3(ripple * 0.22, 1.0, ripple * 0.22));

  // The quad is rasterised at the camera ray's intersection with the water
  // plane, so dist and the terrain's linear depth are measured along the
  // same camera ray: their difference is the water column under this pixel.
  float waterDepth = clamp(sceneDepth - dist, 0.0, 8.0);

  vec3 shallow = vec3(0.30, 0.55, 0.52);
  vec3 deep = vec3(0.03, 0.14, 0.22);
  vec3 col = mix(shallow, deep, clamp(waterDepth / 3.0, 0.0, 1.0));

  float fres = pow(1.0 - max(dot(normal, view), 0.0), 3.0);
  col = mix(col, mix(uSkyHorizon, uSkyTop, 0.7), fres * 0.6);

  vec3 hv = normalize(uSunDir + view);
  float spec = pow(max(dot(normal, hv), 0.0), 180.0);
  col += uSunColor * spec * 1.1 * (1.0 - fres);

  // shore foam where the water is shallow
  float foam = smoothstep(0.35, 0.02, waterDepth) * (0.6 + 0.4 * n1);
  col = mix(col, vec3(0.85, 0.90, 0.92), clamp(foam, 0.0, 1.0) * 0.7);

  // flow streaks where the drainage network is strongest
  vec2 guv = (vWorld.xz - uGridOrigin.xz) / uGridSize.xz;
  vec4 sA = texture(uSurfA, guv);
  float flow = sA.b;
  col += vec3(0.05, 0.08, 0.09) * smoothstep(0.55, 1.0, flow) * (0.5 + 0.5 * n2);

  float fog = 1.0 - exp(-uFogDensity * dist * 0.001);
  col = mix(col, uFogColor, clamp(fog, 0.0, 0.9));

  fragColor = vec4(col, 0.86);
}`;

export const COMPOSITE_FS = `#version 300 es
precision highp float;
uniform sampler2D uScene;
uniform sampler2D uWater;
uniform vec2 uResolution;
uniform float uExposure, uWaterOn, uVignette;
out vec4 fragColor;

vec3 aces(vec3 x) {
  const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  vec3 col = texture(uScene, uv).rgb;
  if (uWaterOn > 0.5) {
    vec4 w = texture(uWater, uv);
    col = mix(col, w.rgb, w.a);
  }
  col *= uExposure;
  col = aces(col);
  col = pow(col, vec3(1.0 / 2.2));
  float v = smoothstep(1.35, 0.35, length(uv - 0.5) * 1.6);
  col *= mix(1.0, v, uVignette);
  fragColor = vec4(col, 1.0);
}`;

/** Simple unlit/attribute line shader used by the gizmos (grid, paths, brush rings). */
export const LINE_VS = `#version 300 es
in vec3 aPos;
in vec3 aColor;
uniform mat4 uViewProj;
out vec3 vColor;
void main() {
  vColor = aColor;
  gl_Position = uViewProj * vec4(aPos, 1.0);
}`;

export const LINE_FS = `#version 300 es
precision highp float;
in vec3 vColor;
uniform float uOpacity;
out vec4 fragColor;
void main() { fragColor = vec4(vColor, uOpacity); }`;

export const PICK_FS = `#version 300 es
precision highp float;
precision highp sampler3D;
/* 1×1 pass that reads the linear depth already produced by the terrain
   raycast, so picking costs a readPixels of one texel. */
uniform sampler2D uScene;
uniform vec2 uPick;
out vec4 fragColor;
void main() { fragColor = texture(uScene, uPick); }`;

export const SHADER_SOURCES = {
  FULLSCREEN_VS, SDF_RAYCAST_FS, WATER_VS, WATER_FS, COMPOSITE_FS, LINE_VS, LINE_FS, PICK_FS,
};

// Shared GLSL ES 3.0 chunks. Every custom shader in the project is a
// RawShaderMaterial (GLSL3) so the full source is known up-front and can be
// validated offline with `npm run validate:shaders`.

export const HEADER = /* glsl */ `
precision highp float;
precision highp int;
precision highp sampler2D;
precision highp samplerCube;
`;

export const NOISE = /* glsl */ `
float hash11(float p){ p = fract(p * 0.1031); p *= p + 33.33; p *= p + p; return fract(p); }
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2 hash22(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
float vnoise(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash12(i);
  float b = hash12(i + vec2(1.0, 0.0));
  float c = hash12(i + vec2(0.0, 1.0));
  float d = hash12(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm3(vec2 p){
  float s = 0.0; float a = 0.5;
  for (int i = 0; i < 3; i++){ s += a * vnoise(p); p = p * 2.03 + vec2(17.1, 9.3); a *= 0.5; }
  return s;
}
uint pcg(uint v){
  uint state = v * 747796405u + 2891336453u;
  uint word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
  return (word >> 22u) ^ word;
}
float rnd(inout uint s){ s = pcg(s); return float(s) * (1.0 / 4294967296.0); }
vec3 rndBall(inout uint s){
  float z = rnd(s) * 2.0 - 1.0;
  float a = rnd(s) * 6.2831853;
  float r = sqrt(max(0.0, 1.0 - z * z));
  float m = pow(rnd(s), 0.3333333);
  return vec3(r * cos(a), z, r * sin(a)) * m;
}
`;

// World-space terrain data: R = height (m), G = signed distance to the
// shoreline (m, + in water), B = baked sun shadow, A = baked ambient occlusion.
export const TERRAIN = /* glsl */ `
uniform sampler2D uTerrain;
uniform vec4 uTerrainXf; // originX, originZ, size, 1/res
vec4 terrainAt(vec2 xz){
  vec2 uv = (xz - uTerrainXf.xy) / uTerrainXf.z;
  vec4 t = textureLod(uTerrain, uv, 0.0);
  vec2 o = max(-uv, uv - 1.0);
  float outside = max(o.x, o.y);
  if (outside > 0.0) t = vec4(-48.0, 300.0 + outside * uTerrainXf.z, 1.0, 1.0);
  return t;
}
vec3 terrainNormal(vec2 xz){
  float e = uTerrainXf.z * uTerrainXf.w;
  float hl = terrainAt(xz - vec2(e, 0.0)).x;
  float hr = terrainAt(xz + vec2(e, 0.0)).x;
  float hd = terrainAt(xz - vec2(0.0, e)).x;
  float hu = terrainAt(xz + vec2(0.0, e)).x;
  return normalize(vec3(hl - hr, 2.0 * e, hd - hu));
}
vec2 shoreGrad(vec2 xz){
  float e = uTerrainXf.z * uTerrainXf.w;
  float dl = terrainAt(xz - vec2(e, 0.0)).y;
  float dr = terrainAt(xz + vec2(e, 0.0)).y;
  float dd = terrainAt(xz - vec2(0.0, e)).y;
  float du = terrainAt(xz + vec2(0.0, e)).y;
  return vec2(dr - dl, du - dd) / (2.0 * e);
}
// Waves lose energy as they reach shallow water (keeps them from cutting through the beach)
float waveAtten(float groundH){ return mix(0.1, 1.0, smoothstep(0.0, 16.0, -groundH)); }
`;

// Global analytic ocean: a directional Gerstner spectrum + shoaling shore
// breakers driven by the shoreline distance field. Mirrored on the CPU in
// src/water/waves.js (used for boat buoyancy and spray triggers).
export const WAVES = /* glsl */ `
#define NUM_WAVES 12
uniform vec4 uWaveA[NUM_WAVES]; // dir.x, dir.z, k, amplitude
uniform vec4 uWaveB[NUM_WAVES]; // omega, phase, Q (choppiness), 0
uniform vec4 uShore;            // amplitude, k, omega, enabled
uniform float uTime;

vec3 gerstnerDisp(vec2 p, float minLambda){
  vec3 d = vec3(0.0);
  float m = max(minLambda, 0.001);
  for (int i = 0; i < NUM_WAVES; i++){
    vec4 a = uWaveA[i]; vec4 b = uWaveB[i];
    float lam = 6.2831853 / a.z;
    float A = a.w * smoothstep(m, m * 2.0, lam);
    float th = a.z * dot(a.xy, p) - b.x * uTime + b.y;
    float c = cos(th); float s = sin(th);
    d.xz += b.z * A * a.xy * c;
    d.y += A * s;
  }
  return d;
}

void gerstnerFull(vec2 p, float att, float minLambda, out vec3 disp, out vec3 nrm, out float jac){
  vec3 d = vec3(0.0);
  float nx = 0.0; float nz = 0.0; float ny = 0.0;
  float jxx = 0.0; float jzz = 0.0; float jxz = 0.0;
  float m = max(minLambda, 0.001);
  for (int i = 0; i < NUM_WAVES; i++){
    vec4 a = uWaveA[i]; vec4 b = uWaveB[i];
    float lam = 6.2831853 / a.z;
    float A = a.w * att * smoothstep(m, m * 2.0, lam);
    float kA = a.z * A;
    float th = a.z * dot(a.xy, p) - b.x * uTime + b.y;
    float c = cos(th); float s = sin(th);
    d.xz += b.z * A * a.xy * c;
    d.y += A * s;
    nx += a.x * kA * c;
    nz += a.y * kA * c;
    ny += b.z * kA * s;
    jxx += b.z * kA * a.x * a.x * s;
    jzz += b.z * kA * a.y * a.y * s;
    jxz += b.z * kA * a.x * a.y * s;
  }
  disp = d;
  nrm = vec3(-nx, 1.0 - ny, -nz);
  jac = (1.0 - jxx) * (1.0 - jzz) - jxz * jxz;
}

vec2 gerstnerBase(vec2 xz, float att){
  vec2 b = xz;
  for (int i = 0; i < 3; i++) b = xz - gerstnerDisp(b, 0.0).xz * att;
  return b;
}

// Shore breakers: crests travel down the distance field towards the beach.
float shoreWave(vec2 xz, float d, out float crest, out float dHdd){
  float env = smoothstep(60.0, 14.0, d) * smoothstep(-1.5, 6.0, d);
  float vari = 0.7 + 0.3 * sin(dot(xz, vec2(0.021, 0.013)) + uTime * 0.11);
  float ph = uShore.y * d + uShore.z * uTime;
  float s = 0.5 + 0.5 * sin(ph);
  float prof = s * s * s;
  float A = uShore.x * uShore.w * env * vari;
  crest = prof * env * uShore.w;
  dHdd = A * 1.5 * s * s * cos(ph) * uShore.y;
  return A * prof;
}
`;

// 2.5D interactive simulation grid (ripples + foam), world-anchored and
// scrolling with the player so it behaves like one global field.
export const RIPPLE = /* glsl */ `
uniform sampler2D uRipple;
uniform sampler2D uFoamGrid;
uniform vec4 uRippleXf; // originX, originZ, size, enabled
float rippleFade(vec2 uv){ vec2 e = min(uv, 1.0 - uv); return smoothstep(0.0, 0.1, min(e.x, e.y)); }
vec2 rippleUV(vec2 xz){ return (xz - uRippleXf.xy) / uRippleXf.z; }
bool rippleInside(vec2 uv){ return uv.x > 0.0 && uv.y > 0.0 && uv.x < 1.0 && uv.y < 1.0; }
float rippleHeight(vec2 xz){
  if (uRippleXf.w < 0.5) return 0.0;
  vec2 uv = rippleUV(xz);
  if (!rippleInside(uv)) return 0.0;
  return textureLod(uRipple, uv, 0.0).r * rippleFade(uv);
}
vec2 rippleSlope(vec2 xz){
  if (uRippleXf.w < 0.5) return vec2(0.0);
  vec2 uv = rippleUV(xz);
  if (!rippleInside(uv)) return vec2(0.0);
  float t = 1.0 / float(textureSize(uRipple, 0).x);
  float hl = textureLod(uRipple, uv - vec2(t, 0.0), 0.0).r;
  float hr = textureLod(uRipple, uv + vec2(t, 0.0), 0.0).r;
  float hd = textureLod(uRipple, uv - vec2(0.0, t), 0.0).r;
  float hu = textureLod(uRipple, uv + vec2(0.0, t), 0.0).r;
  return vec2(hr - hl, hu - hd) / (2.0 * t * uRippleXf.z) * rippleFade(uv);
}
vec4 foamGridAt(vec2 xz){
  vec2 uv = rippleUV(xz);
  if (!rippleInside(uv)) return vec4(0.0);
  return textureLod(uFoamGrid, uv, 0.0) * rippleFade(uv);
}
vec2 foamGridGrad(vec2 xz){
  vec2 uv = rippleUV(xz);
  if (!rippleInside(uv)) return vec2(0.0);
  float t = 2.0 / float(textureSize(uFoamGrid, 0).x);
  float fl = textureLod(uFoamGrid, uv - vec2(t, 0.0), 0.0).r;
  float fr = textureLod(uFoamGrid, uv + vec2(t, 0.0), 0.0).r;
  float fd = textureLod(uFoamGrid, uv - vec2(0.0, t), 0.0).r;
  float fu = textureLod(uFoamGrid, uv + vec2(0.0, t), 0.0).r;
  return vec2(fr - fl, fu - fd) / (2.0 * t * uRippleXf.z);
}
`;

// Full water surface height (Gerstner + shore + ripples) at a world position.
export const SURFACE = /* glsl */ `
float waterSurfaceAt(vec2 xz, out vec2 base){
  vec4 terr = terrainAt(xz);
  float att = waveAtten(terr.x);
  base = gerstnerBase(xz, att);
  float h = gerstnerDisp(base, 0.0).y * att;
  float cr; float dh;
  h += shoreWave(xz, terr.y, cr, dh);
  h += rippleHeight(base);
  return h;
}
`;

// Global 3D simulation grid stored as Y-slices tiled into a 2D texture.
export const GRID = /* glsl */ `
uniform vec3 uGridOrigin;
uniform float uGridH;
uniform vec3 uGridDim;
uniform vec2 uGridTiles;
ivec3 gDim(){ return ivec3(uGridDim + 0.5); }
bool cellIn(ivec3 c){ ivec3 d = gDim(); return all(greaterThanEqual(c, ivec3(0))) && all(lessThan(c, d)); }
ivec2 cellTexel(ivec3 c){
  ivec3 d = gDim(); int tx = int(uGridTiles.x + 0.5);
  return ivec2((c.y % tx) * d.x + c.x, (c.y / tx) * d.z + c.z);
}
ivec3 texelCell(ivec2 t){
  ivec3 d = gDim(); int tx = int(uGridTiles.x + 0.5);
  int col = t.x / d.x; int row = t.y / d.z;
  return ivec3(t.x - col * d.x, row * tx + col, t.y - row * d.z);
}
vec4 gFetch(sampler2D t, ivec3 c){ return cellIn(c) ? texelFetch(t, cellTexel(c), 0) : vec4(0.0); }
`;

export const BOAT = /* glsl */ `
uniform vec3 uBoatPos;
uniform mat3 uBoatInv;   // world -> boat local rotation
uniform vec3 uBoatHalf;  // local half extents of the collision box
uniform vec3 uBoatVel;
bool insideBoat(vec3 p){ vec3 l = uBoatInv * (p - uBoatPos); return all(lessThan(abs(l), uBoatHalf)); }
`;

export const FULLSCREEN_VS = /* glsl */ `
in vec3 position;
out vec2 vUv;
void main(){ vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

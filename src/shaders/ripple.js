import { HEADER, NOISE, TERRAIN, WAVES, RIPPLE, FULLSCREEN_VS } from './chunks.js';

// Approximate boat hull footprint (pointed bow, square transom) in the XZ plane.
const HULL = /* glsl */ `
float hullFootprint(vec2 xz, vec2 pos, vec2 dir, vec3 shape){
  vec2 d = xz - pos;
  vec2 l = vec2(dot(d, dir), dot(d, vec2(-dir.y, dir.x)));
  float t = clamp(l.x / shape.x, -1.0, 1.0);
  float bow = clamp((t - 0.25) / 0.75, 0.0, 1.0);
  float w = shape.y * sqrt(max(0.0, 1.0 - bow * bow));
  float along = 1.0 - smoothstep(0.88, 1.06, abs(l.x) / shape.x);
  float across = 1.0 - smoothstep(w * 0.55, w * 1.05 + 0.05, abs(l.y));
  return along * across;
}
`;

const BOAT_WAKE_UNIFORMS = /* glsl */ `
uniform vec2 uBoatXZ;
uniform vec2 uBoatPrevXZ;
uniform vec2 uBoatDir;
uniform vec2 uBoatPrevDir;
uniform vec3 uBoatShape; // half length, half beam, draft
uniform float uBoatStrength;
uniform float uBoatSpeed;
#define MAX_DROPS 8
uniform vec4 uDrops[MAX_DROPS]; // x, z, radius, strength
uniform int uDropCount;
`;

// --- Interactive height field ------------------------------------------------
// Solver 0: iWave (Tessendorf) - linear deep-water dispersion via a fitted
//           13x13 vertical-derivative kernel. Produces correct Kelvin wakes.
// Solver 1: classic damped wave equation (non-dispersive, FluidNinja-like).
export const rippleStepFS = HEADER + NOISE + TERRAIN + RIPPLE + HULL + BOAT_WAKE_UNIFORMS + /* glsl */ `
uniform sampler2D uState;   // r = h(t), g = h(t - dt)
uniform sampler2D uImpulse; // r = height impulse, g = foam
uniform float uKernel[49];
uniform float uDt;
uniform float uGdt2;
uniform float uAlpha;
uniform float uC2;
uniform float uDamp;
uniform int uSolver;
uniform float uUseImpulse;
in vec2 vUv;
out vec4 fragColor;

float hAt(ivec2 c, ivec2 sz){
  if (any(lessThan(c, ivec2(0))) || any(greaterThanEqual(c, sz))) return 0.0;
  return texelFetch(uState, c, 0).r;
}

void main(){
  ivec2 c = ivec2(gl_FragCoord.xy);
  ivec2 sz = textureSize(uState, 0);
  vec2 S = texelFetch(uState, c, 0).rg;
  float h = S.r;
  float hp = S.g;
  float hn;
  if (uSolver == 0){
    float vd = 0.0;
    for (int j = -6; j <= 6; j++){
      for (int i = -6; i <= 6; i++){
        vd += uKernel[abs(i) * 7 + abs(j)] * hAt(c + ivec2(i, j), sz);
      }
    }
    float ad = uAlpha * uDt;
    hn = (h * (2.0 - ad) - hp - uGdt2 * vd) / (1.0 + ad);
  } else {
    float lap = hAt(c + ivec2(1, 0), sz) + hAt(c - ivec2(1, 0), sz) + hAt(c + ivec2(0, 1), sz) + hAt(c - ivec2(0, 1), sz) - 4.0 * h;
    hn = h + (h - hp) * (1.0 - uDamp) + uC2 * lap;
  }

  vec2 uv = (vec2(c) + 0.5) / vec2(sz);
  vec2 xz = uRippleXf.xy + uv * uRippleXf.z;

  // Sources: particle impacts, moving hull (volume displacement), user drops
  hn += texelFetch(uImpulse, c, 0).r * uUseImpulse;
  float occ = hullFootprint(xz, uBoatXZ, uBoatDir, uBoatShape);
  // Moving pressure patch: the hull holds the surface under it at a shallow depression and the
  // dispersive solver radiates the Kelvin wake (divergent + transverse waves) from it. Relaxing towards
  // a target (instead of integrating a volume-displacement source) keeps the wake bounded at any speed.
  float target = -0.28 * uBoatShape.z * uBoatStrength * occ;
  hn = mix(hn, target, 0.45 * occ);
  for (int i = 0; i < MAX_DROPS; i++){
    if (i >= uDropCount) break;
    vec4 D = uDrops[i];
    vec2 dd = xz - D.xy;
    hn -= D.w * exp(-dot(dd, dd) / (D.z * D.z));
  }

  // Obstacles: land reflects waves; shallow water damps them
  vec4 terr = terrainAt(xz);
  float wet = smoothstep(0.25, -0.35, terr.x);
  float shallow = mix(0.985, 1.0, smoothstep(0.0, 1.5, -terr.x));
  hn *= wet * shallow;
  h *= wet;

  // Sponge layer so waves leave the moving window instead of reflecting
  vec2 e = min(uv, 1.0 - uv);
  hn *= mix(0.92, 1.0, smoothstep(0.0, 0.07, min(e.x, e.y)));
  hn = clamp(hn, -1.5, 1.5);
  fragColor = vec4(hn, h, 0.0, 1.0);
}
`;

// Scroll a world-anchored grid by whole texels when its origin moves.
export const gridShiftFS = HEADER + /* glsl */ `
uniform sampler2D uSrc;
uniform vec2 uShift;
in vec2 vUv;
out vec4 fragColor;
void main(){
  ivec2 c = ivec2(gl_FragCoord.xy) + ivec2(uShift);
  ivec2 sz = textureSize(uSrc, 0);
  if (any(lessThan(c, ivec2(0))) || any(greaterThanEqual(c, sz))) fragColor = vec4(0.0);
  else fragColor = texelFetch(uSrc, c, 0);
}
`;

// --- Foam grid -----------------------------------------------------------------
// r = foam density (long lived, lacy), g = fresh/aerated foam (short lived, bright)
export const foamStepFS = HEADER + NOISE + TERRAIN + WAVES + RIPPLE + HULL + BOAT_WAKE_UNIFORMS + /* glsl */ `
uniform sampler2D uFoamPrev;
uniform float uCrestThresh;
uniform float uCrestFoam;
uniform sampler2D uState;
uniform sampler2D uImpulse;
uniform float uDt;
uniform float uDecay;
uniform float uSteepFoam;
uniform float uSteepThresh;
uniform vec2 uWindDrift;
uniform float uRippleFlow;
uniform float uBoatFoam;
uniform float uUseImpulse;
uniform float uFoamTime;
in vec2 vUv;
out vec4 fragColor;
void main(){
  ivec2 sz = textureSize(uFoamPrev, 0);
  vec2 t = 1.0 / vec2(sz);
  vec2 xz = uRippleXf.xy + vUv * uRippleXf.z;

  float hl = texture(uState, vUv - vec2(t.x, 0.0)).r;
  float hr = texture(uState, vUv + vec2(t.x, 0.0)).r;
  float hd = texture(uState, vUv - vec2(0.0, t.y)).r;
  float hu = texture(uState, vUv + vec2(0.0, t.y)).r;
  vec2 slope = vec2(hr - hl, hu - hd) / (2.0 * t.x * uRippleXf.z);

  // Semi-Lagrangian advection: wind drift + flow induced by the ripple field
  vec2 flow = uWindDrift - slope * uRippleFlow;
  vec2 back = vUv - flow * uDt / uRippleXf.z;
  vec4 f = texture(uFoamPrev, back);
  vec4 nb = (texture(uFoamPrev, back + vec2(t.x, 0.0)) + texture(uFoamPrev, back - vec2(t.x, 0.0)) +
             texture(uFoamPrev, back + vec2(0.0, t.y)) + texture(uFoamPrev, back - vec2(0.0, t.y))) * 0.25;
  f = mix(f, nb, 0.04);
  f.r *= exp(-uDt / uDecay);
  f.g *= exp(-uDt / (uDecay * 0.22));

  float add = 0.0;
  add += texture(uImpulse, vUv).g * uUseImpulse;
  float s = length(slope);
  add += smoothstep(uSteepThresh, uSteepThresh * 2.5, s) * uSteepFoam * uDt;

  // Hull contact + stern wash
  float occ = hullFootprint(xz, uBoatXZ, uBoatDir, uBoatShape);
  float edge = clamp(occ * (1.0 - occ) * 4.0, 0.0, 1.0);
  vec2 d = xz - uBoatXZ;
  vec2 l = vec2(dot(d, uBoatDir), dot(d, vec2(-uBoatDir.y, uBoatDir.x)));
  float stern = smoothstep(-uBoatShape.x - 3.0, -uBoatShape.x - 0.3, l.x) * (1.0 - smoothstep(-uBoatShape.x - 0.3, -uBoatShape.x + 0.6, l.x));
  stern *= 1.0 - smoothstep(uBoatShape.y * 0.3, uBoatShape.y * 0.9, abs(l.y));
  float spd = smoothstep(0.5, 6.0, uBoatSpeed);
  float n = vnoise(xz * 3.0 + vec2(uFoamTime * 1.7, 0.0));
  add += (edge * 0.9 + stern * 1.6 * (0.3 + n)) * spd * uBoatFoam * uDt;

  for (int i = 0; i < MAX_DROPS; i++){
    if (i >= uDropCount) break;
    vec4 D = uDrops[i];
    vec2 dd = xz - D.xy;
    add += D.w * 3.0 * exp(-dot(dd, dd) / (D.z * D.z * 2.5));
  }

  vec4 terr = terrainAt(xz);
  // Whitecaps: the same Jacobian as the rendered surface, accumulated here so foam persists and trails
  float attW = waveAtten(terr.x);
  vec3 gd; vec3 gn; vec3 gjp;
  gerstnerParts(xz, attW, 0.3, gd, gn, gjp);
  vec3 fd; vec2 fsl; vec3 fjp;
  fftFull(xz, attW, fd, fsl, fjp);
  float jxx = 1.0 + gjp.x + fjp.x, jzz = 1.0 + gjp.y + fjp.y, jxz = gjp.z + fjp.z;
  float J = jxx * jzz - jxz * jxz;
  add += smoothstep(uCrestThresh + 0.12, uCrestThresh - 0.3, J) * uCrestFoam * 2.2 * uDt;

  float wet = smoothstep(0.2, -0.2, terr.x);
  f.r = min(f.r + add, 1.6) * wet;
  f.g = min(f.g + add, 1.6) * wet;
  fragColor = vec4(f.r, f.g, 0.0, 1.0);
}
`;

// Particle -> 2.5D coupling: impacting particles push the height field down and seed foam.
export const impulseSplatVS = HEADER + RIPPLE + /* glsl */ `
uniform sampler2D uPos;
uniform sampler2D uVel;
uniform vec2 uPTex;
uniform float uImpulseScale;
uniform float uFoamPerHit;
out vec2 vVal;
void main(){
  int id = gl_VertexID;
  int w = int(uPTex.x);
  ivec2 tc = ivec2(id % w, id / w);
  vec4 P = texelFetch(uPos, tc, 0);
  vec4 V = texelFetch(uVel, tc, 0);
  gl_PointSize = 2.0;
  vVal = vec2(0.0);
  float flag = fract(V.w + 0.001);
  vec2 uv = rippleUV(P.xz);
  // live 3D foam particles keep depositing into the 2.5D foam grid (rendered with the lace texture)
  bool foamP = flag < 0.25 && abs(floor(V.w + 0.01) - 2.0) < 0.1 && P.w > 0.0;
  if ((flag < 0.25 && !foamP) || !rippleInside(uv)){ gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  vVal = foamP ? vec2(0.0, uFoamPerHit * 0.1) : vec2(-V.y * uImpulseScale, uFoamPerHit);
  gl_Position = vec4(uv * 2.0 - 1.0, 0.0, 1.0);
}
`;

export const impulseSplatFS = HEADER + /* glsl */ `
in vec2 vVal;
out vec4 fragColor;
void main(){
  vec2 q = gl_PointCoord * 2.0 - 1.0;
  float w = max(0.0, 1.0 - dot(q, q));
  fragColor = vec4(vVal * w, 0.0, 0.0);
}
`;

export const rippleShaders = {
  rippleStep: [FULLSCREEN_VS, rippleStepFS],
  gridShift: [FULLSCREEN_VS, gridShiftFS],
  foamStep: [FULLSCREEN_VS, foamStepFS],
  impulseSplat: [impulseSplatVS, impulseSplatFS],
};

import { HEADER, NOISE, TERRAIN, WAVES, RIPPLE, SURFACE, GRID, BOAT, FULLSCREEN_VS } from './chunks.js';

// Particle state lives in two RGBA32F textures (one texel per particle):
//   pos = xyz, w = remaining life (s)
//   vel = xyz, w = type (+0.5 = "hit the water this frame" flag)
// types: 0 dead, 1 spray / fluid, 2 surface foam (xz = undisplaced ocean coords), 3 bubble
// For foam and for impact records, vel.y stores the impact speed for one frame.

const PARTICLE_IO = /* glsl */ `
uniform sampler2D uPos;
uniform sampler2D uVel;
uniform vec2 uPTex;
ivec2 pCoord(int id){ int w = int(uPTex.x); return ivec2(id % w, id / w); }
`;

// --------------------------------------------------------------------------------------
// Advection / integration (one fullscreen pass over the particle textures, MRT output)
// --------------------------------------------------------------------------------------
export const advectFS = HEADER + NOISE + TERRAIN + WAVES + RIPPLE + SURFACE + GRID + BOAT + PARTICLE_IO + /* glsl */ `
#define MAX_EMIT 16
uniform sampler2D uGridVel; // xyz = solved velocity, w = cell type (0 air, 1 fluid, 2 solid)
uniform sampler2D uGridOld; // xyz = P2G velocity, w = particle mass
uniform int uMode;          // 0 FLIP, 1 SPH, 2 Whitewater
uniform float uDt;
uniform float uFrame;
uniform float uFlip;
uniform float uXsph;
uniform float uAirDrag;
uniform float uTurb;
uniform float uFoamChance;
uniform float uBubbleChance;
uniform float uFoamLife;
uniform float uFoamEnabled;
uniform vec2 uWind;
uniform float uCohesion;
uniform float uRippleFlow;
uniform int uCount;
uniform int uEmitCount;
uniform vec4 uEmitA[MAX_EMIT]; // pos.xyz, position spread
uniform vec4 uEmitB[MAX_EMIT]; // vel.xyz, velocity spread
uniform vec4 uEmitC[MAX_EMIT]; // ring start, count, type, life
uniform vec4 uEmitD[MAX_EMIT]; // kind (0 burst, 1 crown), crown radius, radial speed, 0
layout(location = 0) out vec4 oPos;
layout(location = 1) out vec4 oVel;

void sampleGrid(vec3 p, out vec3 vNew, out vec3 vOld, out float wsum, out float dens){
  vec3 g = (p - uGridOrigin) / uGridH - 0.5;
  ivec3 b = ivec3(floor(g));
  vec3 f = g - vec3(b);
  vNew = vec3(0.0); vOld = vec3(0.0); wsum = 0.0; dens = 0.0;
  for (int i = 0; i < 8; i++){
    ivec3 o = ivec3(i & 1, (i >> 1) & 1, (i >> 2) & 1);
    ivec3 c = b + o;
    if (!cellIn(c)) continue;
    vec3 wv = mix(1.0 - f, f, vec3(o));
    float w = wv.x * wv.y * wv.z;
    ivec2 t = cellTexel(c);
    vec4 old = texelFetch(uGridOld, t, 0);
    vec4 nw = texelFetch(uGridVel, t, 0);
    dens += w * old.w;
    if (old.w > 0.02 && nw.w < 1.5){ vNew += w * nw.xyz; vOld += w * old.xyz; wsum += w; }
  }
  if (wsum > 1e-4){ vNew /= wsum; vOld /= wsum; }
}

void kill(){ oPos = vec4(0.0, -1000.0, 0.0, 0.0); oVel = vec4(0.0); }

void main(){
  ivec2 tc = ivec2(gl_FragCoord.xy);
  int id = tc.y * int(uPTex.x) + tc.x;
  vec4 P = texelFetch(uPos, tc, 0);
  vec4 V = texelFetch(uVel, tc, 0);
  uint seed = pcg(uint(id) * 7919u + uint(uFrame) * 104729u + 17u);

  // ---- Emission (ring buffer ranges assigned on the CPU) ----
  for (int e = 0; e < MAX_EMIT; e++){
    if (e >= uEmitCount) break;
    int start = int(uEmitC[e].x + 0.5);
    int cnt = int(uEmitC[e].y + 0.5);
    int rel = id - start;
    if (rel < 0) rel += uCount;
    if (rel < cnt){
      vec4 A = uEmitA[e]; vec4 B = uEmitB[e]; vec4 C = uEmitC[e]; vec4 D = uEmitD[e];
      vec3 pos; vec3 vel;
      if (D.x < 0.5){
        pos = A.xyz + rndBall(seed) * A.w;
        vel = B.xyz + rndBall(seed) * B.w;
      } else {
        float ang = 6.2831853 * rnd(seed);
        vec2 dir = vec2(cos(ang), sin(ang));
        float rad = D.y * (0.8 + 0.4 * rnd(seed));
        pos = A.xyz + vec3(dir.x * rad, 0.0, dir.y * rad) + rndBall(seed) * A.w;
        float up = B.y * (0.45 + 0.85 * rnd(seed));
        vel = vec3(dir.x, 0.0, dir.y) * D.z * (0.55 + 0.7 * rnd(seed)) + vec3(B.x, up, B.z) + rndBall(seed) * B.w;
      }
      float life = C.w * (0.6 + 0.8 * rnd(seed));
      float ptype = C.z;
      if (ptype > 1.5 && ptype < 2.5){
        vec4 terr = terrainAt(pos.xz);
        vec2 bxz = gerstnerBase(pos.xz, waveAtten(terr.x));
        pos = vec3(bxz.x, 0.0, bxz.y);
        vel = vec3(vel.x * 0.3, 0.0, vel.z * 0.3);
      }
      oPos = vec4(pos, life);
      oVel = vec4(vel, ptype);
      return;
    }
  }

  float type = floor(V.w + 0.01);
  if (type < 0.5){ kill(); return; }
  P.w -= uDt;
  if (P.w <= 0.0){ kill(); return; }

  vec3 p = P.xyz;
  vec3 v = V.xyz;

  if (type < 1.5){
    // ---------------- spray / fluid particle ----------------
    vec3 vNew; vec3 vOld; float wsum; float dens;
    sampleGrid(p, vNew, vOld, wsum, dens);
    bool inFluid = wsum > 0.3;
    if (uMode == 0){
      // PIC/FLIP: blend the grid's pressure-projected velocity with the particle's own momentum
      if (inFluid){ vec3 vflip = v + (vNew - vOld); v = mix(vNew, vflip, uFlip); }
      else v.y -= 9.81 * uDt;
    } else if (uMode == 1){
      // Weakly compressible SPH (equation of state on the grid) + XSPH viscosity
      if (inFluid){ v += vNew - vOld; v = mix(v, vNew, uXsph); }
      else v.y -= 9.81 * uDt;
    } else {
      // Whitewater spray: ballistic with turbulent air, drag reduced inside dense clumps
      v.y -= 9.81 * uDt;
      vec3 q = p * 0.85;
      float t = uTime;
      vec3 turb = vec3(sin(q.y * 2.1 + t * 1.3 + q.z), sin(q.z * 1.7 - t * 1.1 + q.x * 1.3), sin(q.x * 1.9 + t * 0.9 + q.y));
      v += turb * uTurb * uDt;
    }
    float drag = uAirDrag / (1.0 + dens * 0.35);
    v.xz += (uWind - v.xz) * (1.0 - exp(-uDt * drag * 0.6));
    v *= exp(-drag * 0.25 * uDt);
    float sp = length(v);
    if (sp > 28.0) v *= 28.0 / sp; // safety net against any solver blow-up
    p += v * uDt;

    // Collide with terrain
    vec4 terr = terrainAt(p.xz);
    if (p.y < terr.x){
      vec3 n = terrainNormal(p.xz);
      p.y = terr.x + 0.01;
      float vn = dot(v, n);
      if (vn < 0.0) v -= 1.3 * vn * n;
      v *= 0.6;
    }
    // Collide with the boat: box tapered to a pointed bow (same plan shape as the 2.5D hull footprint).
    // Particles are only ever pushed out sideways or onto the deck - never down through the bottom.
    vec3 lp = uBoatInv * (p - uBoatPos);
    float tb = clamp(lp.x / uBoatHalf.x, -1.0, 1.0);
    float bowT = clamp((tb - 0.25) / 0.75, 0.0, 1.0);
    float hw = uBoatHalf.z * sqrt(max(0.0, 1.0 - bowT * bowT));
    if (abs(lp.x) < uBoatHalf.x && abs(lp.y) < uBoatHalf.y && abs(lp.z) < hw){
      vec3 ln;
      float sz = lp.z >= 0.0 ? 1.0 : -1.0;
      float dz = hw - abs(lp.z), dTop = uBoatHalf.y - lp.y;
      if (dTop < dz && dTop < 0.3){ ln = vec3(0.0, 1.0, 0.0); lp.y = uBoatHalf.y + 0.01; }
      else { ln = vec3(0.0, 0.0, sz); lp.z = sz * (hw + 0.01); }
      mat3 toWorld = transpose(uBoatInv);
      p = uBoatPos + toWorld * lp;
      vec3 n = toWorld * ln;
      vec3 rel = v - uBoatVel;
      float vn = dot(rel, n);
      if (vn < 0.0) rel -= 1.2 * vn * n;
      v = uBoatVel + rel * 0.85;
    }
    // Hit the ocean: become foam / bubbles (or vanish) and record the impact for the 2.5D sim
    vec2 bxz;
    float H = waterSurfaceAt(p.xz, bxz);
    if (p.y < H){
      float impact = clamp(-v.y, 0.0, 14.0);
      float r = rnd(seed);
      float bubble = uMode == 2 ? uBubbleChance : 0.0;
      if (r < bubble){
        oPos = vec4(p.x, H - 0.15 - rnd(seed) * 0.5 * min(impact * 0.2, 1.0), p.z, 1.0 + 2.0 * rnd(seed));
        oVel = vec4(v * 0.12, 3.0);
        return;
      }
      if (r < bubble + uFoamChance * uFoamEnabled){
        oPos = vec4(bxz.x, 0.0, bxz.y, uFoamLife * (0.4 + 0.9 * rnd(seed)));
        oVel = vec4(v.x * 0.25, impact, v.z * 0.25, 2.5);
        return;
      }
      oPos = vec4(bxz.x, 0.0, bxz.y, 0.0);
      oVel = vec4(0.0, impact, 0.0, 0.5);
      return;
    }
    oPos = vec4(p, P.w);
    oVel = vec4(v, 1.0);
    return;
  }

  if (type < 2.5){
    // ---------------- 3D surface foam (rides the analytic waves at render time) ----------------
    if (uFoamEnabled < 0.5){ kill(); return; }
    vec2 b = p.xz;
    vec2 flow = uWind * 0.05 - rippleSlope(b) * uRippleFlow + foamGridGrad(b) * uCohesion;
    v.xz = mix(v.xz, flow, 1.0 - exp(-uDt * 1.5));
    vec2 jit = vec2(rnd(seed), rnd(seed)) - 0.5;
    b += v.xz * uDt + jit * 0.02 * uDt * 10.0;
    vec4 terr = terrainAt(b);
    if (terr.x > 0.2){ kill(); return; }
    oPos = vec4(b.x, 0.0, b.y, P.w);
    oVel = vec4(v.x, 0.0, v.z, 2.0);
    return;
  }

  // ---------------- bubbles (whitewater) ----------------
  v.y += 7.0 * uDt;
  v *= exp(-3.5 * uDt);
  p += v * uDt;
  vec2 bxz;
  float H = waterSurfaceAt(p.xz, bxz);
  if (p.y > H - 0.04){
    if (uFoamEnabled < 0.5){ kill(); return; }
    oPos = vec4(bxz.x, 0.0, bxz.y, uFoamLife * (0.3 + 0.7 * rnd(seed)));
    oVel = vec4(v.x * 0.2, 0.0, v.z * 0.2, 2.0);
    return;
  }
  oPos = vec4(p, P.w);
  oVel = vec4(v, 3.0);
}
`;

// --------------------------------------------------------------------------------------
// Particle -> grid transfer (8 trilinear corner splats per particle, additive blending)
// --------------------------------------------------------------------------------------
export const p2gVS = HEADER + GRID + PARTICLE_IO + /* glsl */ `
uniform vec2 uGridTex;
out vec4 vVal;
void main(){
  int vid = gl_VertexID;
  int pid = vid / 8;
  int corner = vid - pid * 8;
  ivec2 tc = pCoord(pid);
  vec4 P = texelFetch(uPos, tc, 0);
  vec4 V = texelFetch(uVel, tc, 0);
  gl_PointSize = 1.0;
  vVal = vec4(0.0);
  if (abs(floor(V.w + 0.01) - 1.0) > 0.1){ gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  vec3 g = (P.xyz - uGridOrigin) / uGridH - 0.5;
  ivec3 b = ivec3(floor(g));
  vec3 f = g - vec3(b);
  ivec3 o = ivec3(corner & 1, (corner >> 1) & 1, (corner >> 2) & 1);
  ivec3 c = b + o;
  if (!cellIn(c)){ gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  vec3 wv = mix(1.0 - f, f, vec3(o));
  float w = wv.x * wv.y * wv.z;
  vVal = vec4(V.xyz * w, w);
  vec2 t = vec2(cellTexel(c)) + 0.5;
  gl_Position = vec4(t / uGridTex * 2.0 - 1.0, 0.0, 1.0);
}
`;
export const p2gFS = HEADER + /* glsl */ `
in vec4 vVal;
out vec4 fragColor;
void main(){ fragColor = vVal; }
`;

// Normalize splats, classify cells (air / fluid / solid), apply gravity.
export const gridNormalizeFS = HEADER + TERRAIN + GRID + BOAT + /* glsl */ `
uniform sampler2D uSplat;
uniform float uDt;
uniform float uGravityOn;
uniform float uFluidMass;
layout(location = 0) out vec4 oVelNew;
layout(location = 1) out vec4 oVelOld;
void main(){
  ivec2 t = ivec2(gl_FragCoord.xy);
  ivec3 c = texelCell(t);
  if (!cellIn(c)){ oVelNew = vec4(0.0); oVelOld = vec4(0.0); return; }
  vec4 s = texelFetch(uSplat, t, 0);
  vec3 v = s.w > 1e-5 ? s.xyz / s.w : vec3(0.0);
  vec3 wp = uGridOrigin + (vec3(c) + 0.5) * uGridH;
  float type = s.w > uFluidMass ? 1.0 : 0.0;
  if (wp.y < terrainAt(wp.xz).x){ type = 2.0; v = vec3(0.0); }
  // Hull cells are static solids for the pressure solve. With the full hull velocity the solve sucks
  // the wake along behind the transom at boat speed and piles it into a wall; the particle collider
  // already handles the hull pushing water aside.
  if (insideBoat(wp)){ type = 2.0; v = vec3(0.0, uBoatVel.y, 0.0); }
  vec3 vn = v;
  if (type == 1.0) vn.y -= 9.81 * uDt * uGravityOn;
  oVelNew = vec4(vn, type);
  oVelOld = vec4(v, s.w);
}
`;

const NEIGHBORS = /* glsl */ `
const ivec3 NB[6] = ivec3[6](ivec3(1,0,0), ivec3(-1,0,0), ivec3(0,1,0), ivec3(0,-1,0), ivec3(0,0,1), ivec3(0,0,-1));
`;

// FLIP: divergence with density correction (prevents volume gain / clustering)
export const divergenceFS = HEADER + GRID + NEIGHBORS + /* glsl */ `
uniform sampler2D uGridVel;
uniform sampler2D uGridOld;
uniform float uRest;
uniform float uDensK;
uniform float uDt;
out vec4 fragColor;
void main(){
  ivec2 t = ivec2(gl_FragCoord.xy);
  ivec3 c = texelCell(t);
  if (!cellIn(c)){ fragColor = vec4(0.0); return; }
  vec4 C = texelFetch(uGridVel, t, 0);
  if (abs(C.w - 1.0) > 0.1){ fragColor = vec4(0.0, C.w, 0.0, 0.0); return; }
  vec3 vp[6];
  for (int i = 0; i < 6; i++){
    ivec3 n = c + NB[i];
    vec4 N = gFetch(uGridVel, n);
    vp[i] = (!cellIn(n) || N.w < 0.5) ? C.xyz : N.xyz; // air: extrapolate, solid: its velocity
  }
  float div = ((vp[0].x - vp[1].x) + (vp[2].y - vp[3].y) + (vp[4].z - vp[5].z)) / (2.0 * uGridH);
  float mass = texelFetch(uGridOld, t, 0).w;
  div -= uDensK * max(mass / uRest - 1.0, 0.0) / uDt;
  fragColor = vec4(div, 1.0, 0.0, 0.0);
}
`;

export const jacobiFS = HEADER + GRID + NEIGHBORS + /* glsl */ `
uniform sampler2D uP;
uniform sampler2D uDiv; // r = divergence, g = cell type
out vec4 fragColor;
void main(){
  ivec2 t = ivec2(gl_FragCoord.xy);
  ivec3 c = texelCell(t);
  if (!cellIn(c)){ fragColor = vec4(0.0); return; }
  vec2 D = texelFetch(uDiv, t, 0).rg;
  if (abs(D.g - 1.0) > 0.1){ fragColor = vec4(0.0); return; }
  float pc = texelFetch(uP, t, 0).r;
  float sum = 0.0;
  for (int i = 0; i < 6; i++){
    ivec3 n = c + NB[i];
    if (!cellIn(n)) continue;           // open boundary: p = 0
    ivec2 nt = cellTexel(n);
    float nty = texelFetch(uDiv, nt, 0).g;
    if (nty > 1.5) sum += pc;           // solid: Neumann
    else if (nty > 0.5) sum += texelFetch(uP, nt, 0).r;
  }
  fragColor = vec4((sum - uGridH * uGridH * D.r) / 6.0, 0.0, 0.0, 0.0);
}
`;

export const projectFS = HEADER + GRID + NEIGHBORS + /* glsl */ `
uniform sampler2D uGridVel;
uniform sampler2D uP;
uniform sampler2D uDiv;
out vec4 fragColor;
float pAt(ivec3 n, float pc){
  if (!cellIn(n)) return 0.0;
  ivec2 nt = cellTexel(n);
  float nty = texelFetch(uDiv, nt, 0).g;
  if (nty > 1.5) return pc;
  if (nty > 0.5) return texelFetch(uP, nt, 0).r;
  return 0.0;
}
void main(){
  ivec2 t = ivec2(gl_FragCoord.xy);
  ivec3 c = texelCell(t);
  vec4 C = texelFetch(uGridVel, t, 0);
  if (!cellIn(c) || abs(C.w - 1.0) > 0.1){ fragColor = C; return; }
  float pc = texelFetch(uP, t, 0).r;
  vec3 g = vec3(pAt(c + NB[0], pc) - pAt(c + NB[1], pc),
                pAt(c + NB[2], pc) - pAt(c + NB[3], pc),
                pAt(c + NB[4], pc) - pAt(c + NB[5], pc)) / (2.0 * uGridH);
  fragColor = vec4(C.xyz - g, 1.0);
}
`;

// SPH (weakly compressible): Tait-like equation of state on the grid density
export const sphForceFS = HEADER + GRID + NEIGHBORS + /* glsl */ `
uniform sampler2D uGridVel;
uniform sampler2D uGridOld;
uniform float uRest;
uniform float uStiff;
uniform float uVisc;
uniform float uDt;
out vec4 fragColor;
// Tait-style EOS with a clamped density ratio: emitters can pack particles far above rest density,
// and an unclamped r^3 term explodes the splash.
float pressure(float m){ float r = min(m / uRest, 1.5); return uStiff * max(r * r * r - 1.0, 0.0) / 3.0; }
void main(){
  ivec2 t = ivec2(gl_FragCoord.xy);
  ivec3 c = texelCell(t);
  vec4 C = texelFetch(uGridVel, t, 0);
  vec4 O = texelFetch(uGridOld, t, 0);
  if (!cellIn(c) || abs(C.w - 1.0) > 0.1){ fragColor = C; return; }
  float pc = pressure(O.w);
  float pn[6];
  vec3 avg = vec3(0.0); float an = 0.0;
  for (int i = 0; i < 6; i++){
    ivec3 n = c + NB[i];
    vec4 N = gFetch(uGridOld, n);
    vec4 NT = gFetch(uGridVel, n);
    // solids: Neumann (no gradient); air: half the cell pressure so a dense free-surface blob expands
    // gently instead of levitating against gravity
    if (!cellIn(n) || NT.w > 1.5) pn[i] = pc; else if (NT.w < 0.5) pn[i] = pc * 0.5; else pn[i] = pressure(N.w);
    if (cellIn(n) && NT.w > 0.5 && NT.w < 1.5){ avg += N.xyz; an += 1.0; }
  }
  vec3 grad = vec3(pn[0] - pn[1], pn[2] - pn[3], pn[4] - pn[5]) / (2.0 * uGridH);
  float rho = max(O.w / uRest, 0.5);
  vec3 acc = -grad / rho;
  float am = length(acc);
  if (am > 60.0) acc *= 60.0 / am; // CFL-style limiter on the pressure acceleration
  vec3 v = O.xyz + uDt * (vec3(0.0, -9.81, 0.0) + acc);
  if (an > 0.0) v = mix(v, avg / an, clamp(uVisc, 0.0, 1.0));
  fragColor = vec4(v, 1.0);
}
`;

export const clearFS = HEADER + /* glsl */ `
uniform vec4 uValue;
out vec4 fragColor;
void main(){ fragColor = uValue; }
`;

export const particleSimShaders = {
  advect: [FULLSCREEN_VS, advectFS],
  p2g: [p2gVS, p2gFS],
  gridNormalize: [FULLSCREEN_VS, gridNormalizeFS],
  divergence: [FULLSCREEN_VS, divergenceFS],
  jacobi: [FULLSCREEN_VS, jacobiFS],
  project: [FULLSCREEN_VS, projectFS],
  sphForce: [FULLSCREEN_VS, sphForceFS],
  clear: [FULLSCREEN_VS, clearFS],
};

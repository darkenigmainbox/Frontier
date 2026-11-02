// All GLSL. Sim passes are fullscreen-triangle fragment shaders writing to
// half-float render targets (WebGL2). Texture channel layouts:
//
//  wave-state    : R height, G vertical velocity, B curvature, A unused
//  swe-state     : R water depth, G vel.x, B vel.z, A surface height
//  spectral      : R height, G vel.x, B vel.z, A crest-foam source
//  OUTPUT (unified, every consumer reads this):
//                  R surface height (world Y), G vel.x, B vel.z, A foam source
//  foam-grid     : R crest/wake foam, G shoreline foam, B unused, A = 1
// ---------------------------------------------------------------------------

export const FS_VERT = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const COMMON = /* glsl */ `
uniform float uWorld;      // world size (m)
uniform float uTexel;      // 1 / sim resolution
uniform sampler2D uTerrain;
vec2 uvToWorldXZ(vec2 uv){ return vec2((uv.x - 0.5) * uWorld, (0.5 - uv.y) * uWorld); }
vec2 worldToUvXZ(vec2 xz){ return vec2(xz.x / uWorld + 0.5, 0.5 - xz.y / uWorld); }
float terrainH(vec2 uv){ return texture2D(uTerrain, uv).r; }
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
`;

const SPLATS = /* glsl */ `
uniform vec4 uSplats[16];  // xy = uv centre, z = radius (uv), w = strength
uniform int uSplatCount;
float splatField(vec2 uv, out vec2 radial){
  float acc = 0.0; radial = vec2(0.0);
  for(int i = 0; i < 16; i++){
    if(i >= uSplatCount) break;
    vec4 s = uSplats[i];
    vec2 d = uv - s.xy;
    float g = exp(-dot(d, d) / max(s.z * s.z, 1e-6));
    acc += s.w * g;
    radial += normalize(d + vec2(1e-5)) * s.w * g;
  }
  return acc;
}
`;

// ---- 1) Heightfield wave equation (Fluid-Ninja style) ---------------------
export const WAVE_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uState;
uniform float uDamping;    // ~0.996
uniform float uWaveSpeed;  // propagation gain per substep
${COMMON}
${SPLATS}
void main(){
  vec2 uv = vUv;
  float t = uTexel;
  vec4 c  = texture2D(uState, uv);
  float hL = texture2D(uState, uv - vec2(t, 0.0)).r;
  float hR = texture2D(uState, uv + vec2(t, 0.0)).r;
  float hD = texture2D(uState, uv - vec2(0.0, t)).r;
  float hU = texture2D(uState, uv + vec2(0.0, t)).r;
  float avg = 0.25 * (hL + hR + hD + hU);

  float h = c.r;
  float v = c.g;
  v += (avg - h) * uWaveSpeed;
  v *= uDamping;
  h += v;

  // interactive impulses (mouse / boat / rain / boulder)
  vec2 radial;
  float s = splatField(uv, radial);
  h += s;
  v += s * 0.35;

  // kill ripples on land, slight reflection right at the beach
  float th = terrainH(uv);
  float land = smoothstep(0.05, 0.7, th);
  h *= mix(1.0, 0.82, land);
  v *= mix(1.0, 0.80, land);

  // absorb at domain border so waves leave instead of wrapping
  vec2 b = smoothstep(vec2(0.0), vec2(0.035), uv) * smoothstep(vec2(1.0), vec2(0.965), uv);
  float border = b.x * b.y;
  h *= mix(0.94, 1.0, border);
  v *= mix(0.94, 1.0, border);

  float curvature = avg - h;
  gl_FragColor = vec4(h, v, curvature, 1.0);
}
`;

// ---- 2) Shallow Water Equations -------------------------------------------
export const SWE_INIT_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
${COMMON}
void main(){
  float th = terrainH(vUv);
  float depth = max(0.0 - th, 0.0);
  gl_FragColor = vec4(depth, 0.0, 0.0, th + depth);
}
`;

export const SWE_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uState;
uniform float uDt;
uniform float uGravity;
uniform float uVelDamp;
uniform vec2  uWindXZ;      // wind stress on the surface
${COMMON}
${SPLATS}
float surfH(vec2 uv){ vec4 s = texture2D(uState, uv); return terrainH(uv) + s.r; }
void main(){
  vec2 uv = vUv;
  float t = uTexel;
  float cell = uWorld * t;
  vec4 c  = texture2D(uState, uv);
  vec4 sR = texture2D(uState, uv + vec2(t, 0.0));   // +x
  vec4 sL = texture2D(uState, uv - vec2(t, 0.0));   // -x
  vec4 sZp = texture2D(uState, uv - vec2(0.0, t));  // +z  (v decreases toward +z)
  vec4 sZn = texture2D(uState, uv + vec2(0.0, t));  // -z

  float d = c.r;
  vec2 vel = c.gb;
  float th = terrainH(uv);
  float H  = th + d;
  float HR = terrainH(uv + vec2(t, 0.0)) + sR.r;
  float HL = terrainH(uv - vec2(t, 0.0)) + sL.r;
  float HZp = terrainH(uv - vec2(0.0, t)) + sZp.r;
  float HZn = terrainH(uv + vec2(0.0, t)) + sZn.r;

  // momentum: accelerate downhill of the total surface
  vec2 gradH = vec2(HR - HL, HZp - HZn) / (2.0 * cell);
  vel += -uGravity * gradH * uDt;

  // viscosity (blend toward neighbour average) + wind stress on deep enough water
  vec2 avgVel = 0.25 * (sR.gb + sL.gb + sZp.gb + sZn.gb);
  vel = mix(vel, avgVel, 0.06);
  vel += uWindXZ * uDt * smoothstep(0.05, 0.6, d) * 0.12;
  vel *= uVelDamp;
  float sp = length(vel);
  if(sp > 9.0) vel *= 9.0 / sp;

  // continuity: depth changes with divergence of (depth * velocity)
  float div = (sR.g - sL.g) / (2.0 * cell) + (sZp.b - sZn.b) / (2.0 * cell);
  vec2 gradD = vec2(sR.r - sL.r, sZp.r - sZn.r) / (2.0 * cell);
  d -= uDt * (d * div + dot(vel, gradD));

  // impulses raise the surface AND push water radially outward
  vec2 radialUV;
  float s = splatField(uv, radialUV);
  d += s * 0.6;
  vel += vec2(radialUV.x, -radialUV.y) * 2.2;   // uv y axis is -z

  // relax slowly toward still sea-level so added volume drains away
  float d0 = max(0.0 - th, 0.0);
  d = mix(d, d0, 0.0022);
  d = max(d, 0.0);

  // wet/dry shore: thin water loses momentum (beach run-up & swash)
  if(d < 0.03) vel *= 0.72;

  // open boundary
  vec2 b = smoothstep(vec2(0.0), vec2(0.03), uv) * smoothstep(vec2(1.0), vec2(0.97), uv);
  vel *= mix(0.9, 1.0, b.x * b.y);

  gl_FragColor = vec4(d, vel.x, vel.y, th + d);
}
`;

// ---- 3) Spectral (Gerstner-spectrum) ocean, baked to the grid -------------
// 24 directional waves, wavelengths log-spaced 90 m -> 5 m, amplitudes from a
// Phillips-like falloff. Written into the grid every frame so foam, particles,
// boat readback and debug views all see exactly the same surface.
export const SPECTRAL_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uTime;
uniform float uAmp;          // swell height scale
uniform float uWindDir;      // radians
uniform float uWindSpeed;
uniform float uChop;         // steepness -> foam sensitivity
${COMMON}
void main(){
  vec2 xz = uvToWorldXZ(vUv);
  float h = 0.0;
  float dhdt = 0.0;
  float steep = 0.0;
  vec2 vel = vec2(0.0);
  for(int i = 0; i < 24; i++){
    float fi = float(i);
    float r1 = hash12(vec2(fi * 1.71, 3.7));
    float r2 = hash12(vec2(9.1, fi * 2.33));
    float f = fi / 23.0;
    float len = mix(96.0, 4.6, pow(f, 1.55));
    float k = 6.2831853 / len;
    float ang = uWindDir + (r1 - 0.5) * (0.35 + f * 1.5);
    vec2 dir = vec2(cos(ang), sin(ang));
    float amp = uAmp * 0.16 * pow(len / 96.0, 0.85) * (0.7 + 0.6 * r2);
    float omega = sqrt(9.81 * k) * (0.6 + uWindSpeed * 0.04);
    float phase = k * dot(dir, xz) - omega * uTime + r1 * 6.2831;
    float s = sin(phase);
    float c = cos(phase);
    // sharpen crests (trochoidal feel) for the big components
    h += amp * (s + 0.22 * (1.0 - f) * s * abs(s));
    dhdt += -amp * omega * c;
    steep += k * amp * abs(c) * (0.30 + 0.70 * f);   // short waves foam, long swell only lifts (avoids foam banding)
    vel += dir * (amp * omega * c) * 0.35;
  }
  // fade swell where it meets land (no giant waves climbing the beach)
  float depthFade = smoothstep(-0.4, 2.2, 0.0 - terrainH(vUv));
  h *= mix(0.15, 1.0, depthFade);
  vel *= mix(0.2, 1.0, depthFade);

  float foamSrc = smoothstep(1.0, 1.95, steep * (0.55 + uChop)) * depthFade;
  foamSrc += smoothstep(1.6, 2.9, dhdt) * 0.35 * depthFade;
  gl_FragColor = vec4(h, vel.x, vel.y, clamp(foamSrc, 0.0, 1.4));
}
`;

// ---- unify active solver -> OUTPUT texture --------------------------------
export const OUTPUT_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uState;     // active solver state
uniform sampler2D uState2;    // interaction ripples (spectral mode only)
uniform int uMode;            // 0 wave-eq, 1 SWE, 2 spectral
uniform float uFoamGain;
${COMMON}
void main(){
  vec2 uv = vUv;
  float t = uTexel;
  float cell = uWorld * t;
  float height = 0.0;
  vec2 vel = vec2(0.0);
  float foam = 0.0;

  if(uMode == 0){
    vec4 c = texture2D(uState, uv);
    float hR = texture2D(uState, uv + vec2(t, 0.0)).r;
    float hL = texture2D(uState, uv - vec2(t, 0.0)).r;
    float hZp = texture2D(uState, uv - vec2(0.0, t)).r;
    float hZn = texture2D(uState, uv + vec2(0.0, t)).r;
    height = c.r;
    vel = -vec2(hR - hL, hZp - hZn) / (2.0 * cell) * 2.4;   // flow downhill
    foam = clamp(abs(c.g) * 2.2 + abs(c.b) * 9.0 - 0.22, 0.0, 1.2);
  } else if(uMode == 1){
    vec4 c = texture2D(uState, uv);
    float th = terrainH(uv);
    height = th + c.r;
    vel = c.gb;
    float speed = length(vel);
    float shallow = smoothstep(2.2, 0.15, c.r);
    foam = clamp(speed * 0.22 * (0.4 + shallow * 1.6) + shallow * speed * speed * 0.12 - 0.10, 0.0, 1.3);
    // on dry land report "sea level" so the mesh tucks under the beach
    if(c.r < 0.005 && th > 0.0) height = min(height, 0.0 - 0.02);
  } else {
    vec4 spec = texture2D(uState, uv);
    vec4 rip  = texture2D(uState2, uv);
    height = spec.r + rip.r;
    float rR = texture2D(uState2, uv + vec2(t, 0.0)).r;
    float rL = texture2D(uState2, uv - vec2(t, 0.0)).r;
    float rZp = texture2D(uState2, uv - vec2(0.0, t)).r;
    float rZn = texture2D(uState2, uv + vec2(0.0, t)).r;
    vec2 ripVel = -vec2(rR - rL, rZp - rZn) / (2.0 * cell) * 2.4;
    vel = spec.gb + ripVel;
    foam = spec.a + clamp(abs(rip.g) * 2.0 + abs(rip.b) * 8.0 - 0.22, 0.0, 1.0);
  }

  // extra breaking foam where water shallows over the sandbar/beach
  float depth = height - terrainH(uv);
  foam += smoothstep(1.1, 0.05, depth) * clamp(length(vel) * 0.20, 0.0, 0.38);

  gl_FragColor = vec4(height, vel.x, vel.y, clamp(foam * uFoamGain, 0.0, 1.6));
}
`;

// ---- foam grid: advect + decay + inject (crest, wake splats, shoreline) ---
export const FOAM_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uPrevFoam;
uniform sampler2D uSim;       // unified OUTPUT
uniform sampler2D uNoise;
uniform float uTime;
uniform float uDt;
uniform float uDecay;         // crest foam survival per frame ~0.97
uniform float uShoreFoamOn;   // 0/1
uniform vec2 uWindXZ;
${COMMON}
${SPLATS}
void main(){
  vec2 uv = vUv;
  vec4 sim = texture2D(uSim, uv);
  vec2 velXZ = sim.gb + uWindXZ * 0.18;
  // semi-Lagrangian back-trace (note: dv = -vz / world)
  vec2 backUV = uv - vec2(velXZ.x, -velXZ.y) * uDt / uWorld;
  vec2 foam = texture2D(uPrevFoam, clamp(backUV, 0.001, 0.999)).rg;

  // gentle diffusion so foam patches spread like real bubble rafts
  float t = uTexel;
  vec2 avg = 0.25 * (
    texture2D(uPrevFoam, backUV + vec2(t, 0.0)).rg + texture2D(uPrevFoam, backUV - vec2(t, 0.0)).rg +
    texture2D(uPrevFoam, backUV + vec2(0.0, t)).rg + texture2D(uPrevFoam, backUV - vec2(0.0, t)).rg);
  foam = mix(foam, avg, 0.10);

  // decay: crest foam fast, wake/shore foam slow
  foam.r *= uDecay;
  foam.g *= 0.987;

  float th = terrainH(uv);
  float depth = sim.r - th;

  // inject: breaking crests / solver foam source
  foam.r = clamp(foam.r + sim.a * 0.34, 0.0, 1.5);

  // inject: splats (boat wake, splashes) feed the long-lived channel
  vec2 radial;
  float s = splatField(uv, radial);
  foam.g = clamp(foam.g + abs(s) * 0.6, 0.0, 1.5);
  foam.r = clamp(foam.r + abs(s) * 0.4, 0.0, 1.5);

  // shoreline: animated lacy bands rolling up the beach
  if(uShoreFoamOn > 0.5){
    float n = texture2D(uNoise, uv * 9.0 + vec2(uTime * 0.008, 0.0)).b;
    float band = 0.5 + 0.5 * sin(depth * 11.0 - uTime * 1.7 + n * 5.0);
    float shore = smoothstep(1.35, 0.02, depth) * (0.35 + 0.65 * band);
    foam.g = clamp(foam.g + shore * 0.16, 0.0, 1.5);
  }

  // foam belongs on the water (allow a kiss up the wet sand)
  float waterMask = smoothstep(-0.35, 0.05, depth);
  foam *= mix(0.25, 1.0, waterMask);

  gl_FragColor = vec4(foam.r, foam.g, 0.0, 1.0);
}
`;

// ---- shared sky function (dome + water reflections sample the same sky) ---
export const SKY_GLSL = /* glsl */ `
uniform vec3 uSunDir;
uniform vec3 uSkyZenith;
uniform vec3 uSkyHorizon;
uniform vec3 uSunColor;
uniform float uNight;       // 0 day -> 1 night (stars)
vec3 skyColor(vec3 dir){
  float y = clamp(dir.y, -1.0, 1.0);
  float t = pow(clamp(y * 0.5 + 0.5, 0.0, 1.0), 0.62);
  vec3 col = mix(uSkyHorizon, uSkyZenith, t);
  float sunAmt = max(dot(dir, uSunDir), 0.0);
  col += uSunColor * pow(sunAmt, 350.0) * 3.2;                    // disc
  col += uSunColor * pow(sunAmt, 18.0) * 0.28;                    // glow
  col += uSunColor * pow(sunAmt, 3.0) * 0.10 * (1.0 - abs(y));    // horizon warmth
  // stars
  if(uNight > 0.02){
    vec2 sp = dir.xz / max(dir.y + 0.4, 0.15);
    float st = step(0.9985, hash12(floor(sp * 90.0))) * uNight * smoothstep(0.02, 0.3, y);
    col += vec3(st) * (0.6 + 0.4 * sin(uTimeSky * 2.0 + hash12(floor(sp * 90.0)) * 40.0));
  }
  return col;
}
`;

export const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main(){
  vDir = normalize(position);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_Position.z = gl_Position.w; // pin to far plane
}
`;

export const SKY_FRAG = /* glsl */ `
precision highp float;
varying vec3 vDir;
uniform sampler2D uNoise;
uniform float uTimeSky;
uniform float uCloudiness;
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
${SKY_GLSL}
void main(){
  vec3 dir = normalize(vDir);
  vec3 col = skyColor(dir);
  // soft procedural clouds projected on a sky plane
  if(dir.y > 0.015){
    vec2 cuv = dir.xz / (dir.y + 0.18);
    float n1 = texture2D(uNoise, cuv * 0.055 + vec2(uTimeSky * 0.0035, 0.0)).b;
    float n2 = texture2D(uNoise, cuv * 0.16 - vec2(uTimeSky * 0.006, 0.013)).b;
    float coverage = n1 * 0.68 + n2 * 0.46;
    float thresh = mix(0.80, 0.28, uCloudiness);
    float cl = smoothstep(thresh, thresh + 0.24, coverage);
    cl *= smoothstep(0.015, 0.16, dir.y);
    vec3 cloudCol = mix(uSkyHorizon * 0.92, vec3(1.05), 0.55) + uSunColor * 0.18 * pow(max(dot(dir, uSunDir), 0.0), 3.0);
    cloudCol = mix(cloudCol, cloudCol * 0.35, uNight);
    col = mix(col, cloudCol, cl * 0.85);
  }
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

// ---- the AAA water surface -------------------------------------------------
export const WATER_VERT = /* glsl */ `
uniform sampler2D uSim;       // unified OUTPUT grid
uniform float uTexelW;        // world-space texel size
uniform float uTexel;         // 1/res
uniform float uTime;
uniform float uSimBlend;      // 0..1 toggle for the 2.5D grid displacement
uniform int uMode;
uniform float uWavesOn;       // analytic Gerstner overlay
uniform float uWaveAmp;       // Gerstner height scale
uniform float uChop;          // Gerstner horizontal displacement
uniform vec4 uWavesA[6];      // dx,dz,k,omega
uniform vec4 uWavesB[6];      // amp,steep,phase,-
varying vec3 vWorld;
varying vec3 vNormalG;        // grid normal
varying vec2 vUvW;
varying vec4 vSim;
varying float vCrest;

vec3 gerstner(vec2 xz, inout vec3 tang, inout vec3 binorm){
  vec3 disp = vec3(0.0);
  for(int i = 0; i < 6; i++){
    vec2 dir = uWavesA[i].xy;
    float k = uWavesA[i].z;
    float w = uWavesA[i].w;
    float amp = uWavesB[i].x * uWaveAmp;
    float steep = uWavesB[i].y;
    float ph = uWavesB[i].z;
    float f = k * dot(dir, xz) - w * uTime + ph;
    float s = sin(f), c = cos(f);
    float q = steep * uChop / max(k * amp * 6.0, 0.001);
    q = clamp(q, 0.0, 1.4);
    disp += vec3(dir.x * q * amp * c, amp * s, dir.y * q * amp * c);
    // analytic partial derivatives for normals
    float wa = k * amp;
    tang += vec3(-dir.x * dir.x * steep * uChop * 0.16 * s, dir.x * wa * c, -dir.x * dir.y * steep * uChop * 0.16 * s);
    binorm += vec3(-dir.x * dir.y * steep * uChop * 0.16 * s, dir.y * wa * c, -dir.y * dir.y * steep * uChop * 0.16 * s);
    vCrest += wa * c;
  }
  return disp;
}

void main(){
  vUvW = uv;
  vec3 p = position;                       // plane already in XZ, centred origin
  vec4 simC = texture2D(uSim, uv);
  vSim = simC;

  float hC = simC.r;
  float hR = texture2D(uSim, uv + vec2(uTexel, 0.0)).r;
  float hL = texture2D(uSim, uv - vec2(uTexel, 0.0)).r;
  float hZp = texture2D(uSim, uv - vec2(0.0, uTexel)).r;  // +z
  float hZn = texture2D(uSim, uv + vec2(0.0, uTexel)).r;  // -z

  float restY = 0.0;
  float simY = mix(restY, hC, uSimBlend);
  float sx = mix(0.0, (hR - hL), uSimBlend) / (2.0 * uTexelW);
  float sz = mix(0.0, (hZp - hZn), uSimBlend) / (2.0 * uTexelW);
  vNormalG = normalize(vec3(-sx, 1.0, -sz));
  vCrest = 0.0;

  p.y = simY;
  if(uWavesOn > 0.5){
    vec3 tang = vec3(1.0, 0.0, 0.0);
    vec3 binorm = vec3(0.0, 0.0, 1.0);
    vec3 g = gerstner(p.xz, tang, binorm);
    // spectral mode already has its swell in the grid -> only take the chop
    float yTake = (uMode == 2) ? 0.18 : 1.0;
    // calm the overlay where terrain rises (beach), so waves die on shore
    p.x += g.x; p.z += g.z;
    p.y += g.y * yTake;
    vec3 gn = normalize(cross(binorm, tang));
    vNormalG = normalize(vNormalG + (gn - vec3(0.0, 1.0, 0.0)) * yTake);
  }

  vec4 wp = modelMatrix * vec4(p, 1.0);
  vWorld = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

export const WATER_FRAG = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vNormalG;
varying vec2 vUvW;
varying vec4 vSim;
varying float vCrest;

uniform sampler2D uFoamTex;
uniform sampler2D uNoise;
uniform sampler2D uTerrain;
uniform float uTime;
uniform float uTimeSky;
uniform float uWorld;
uniform vec3 uDeepColor;
uniform vec3 uShallowColor;
uniform vec3 uSSSColor;
uniform float uClarity;        // absorption inverse
uniform float uFoamGridOn;
uniform float uFoamAmount;
uniform float uDetailStrength;
uniform vec2 uWindXZ;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
uniform int uDebug;            // 0 final, 1 height, 2 foam, 3 velocity, 4 normals
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
${SKY_GLSL}

vec3 detailNormal(vec2 xz, vec2 flow){
  // two scrolling gradient-noise layers + one micro layer
  vec2 uv1 = xz * 0.045 + flow * uTime * 0.030 + vSim.gb * 0.012;
  vec2 uv2 = xz * 0.13  - flow * uTime * 0.021 + vec2(0.37, 0.73);
  vec2 uv3 = xz * 0.42  + vec2(uTime * 0.055, -uTime * 0.041);
  vec2 g1 = texture2D(uNoise, uv1).rg * 2.0 - 1.0;
  vec2 g2 = texture2D(uNoise, uv2).rg * 2.0 - 1.0;
  vec2 g3 = texture2D(uNoise, uv3).rg * 2.0 - 1.0;
  float distFade = clamp(90.0 / max(distance(cameraPosition, vWorld), 1.0), 0.25, 1.0);
  vec2 g = (g1 * 0.55 + g2 * 0.35 + g3 * 0.18) * uDetailStrength * distFade;
  return normalize(vec3(-g.x, 1.0, -g.y));
}

float foamPattern(vec2 xz, float foamAmt){
  float n1 = texture2D(uNoise, xz * 0.16 + uWindXZ * uTime * 0.004).b;
  float n2 = texture2D(uNoise, xz * 0.55 - uTime * 0.015).b;
  float n3 = texture2D(uNoise, xz * 1.4 + vec2(0.0, uTime * 0.03)).a;
  // lacy breakup that keeps holes even when the foam grid saturates
  float p = n1 * 0.50 + n2 * 0.34 + n3 * 0.32;
  float f = clamp(foamAmt, 0.0, 1.35);
  float cov = f * (0.28 + 0.95 * p);
  float mask = smoothstep(0.40, 0.64, cov);
  mask *= 0.82 + 0.18 * smoothstep(0.25, 0.8, n3 + n2 * 0.4);
  return mask * clamp(f * 1.7, 0.0, 1.0);
}

void main(){
  // ---------- debug views ----------
  if(uDebug == 1){
    float h = vSim.r;
    vec3 c = mix(vec3(0.02, 0.15, 0.65), vec3(0.1, 0.9, 0.9), clamp(h * 0.5 + 0.5, 0.0, 1.0));
    c = mix(c, vec3(1.0, 0.35, 0.1), clamp(h - 0.6, 0.0, 1.0));
    gl_FragColor = vec4(c, 1.0); return;
  }
  if(uDebug == 2){
    vec2 f = texture2D(uFoamTex, vUvW).rg;
    gl_FragColor = vec4(vec3(f.r, f.g, vSim.a), 1.0); return;
  }
  if(uDebug == 3){
    gl_FragColor = vec4(vec3(vSim.g * 0.25 + 0.5, vSim.b * 0.25 + 0.5, length(vSim.gb) * 0.2), 1.0); return;
  }
  if(uDebug == 4){
    gl_FragColor = vec4(normalize(vNormalG) * 0.5 + 0.5, 1.0); return;
  }

  vec3 V = normalize(cameraPosition - vWorld);
  float terrain = texture2D(uTerrain, vUvW).r;
  float depth = max(vWorld.y - terrain, 0.0);

  // ---------- normal: grid + detail ----------
  vec3 n = normalize(vNormalG);
  vec3 dn = detailNormal(vWorld.xz, uWindXZ);
  // blend detail in tangent space-ish (whiteout blend)
  n = normalize(vec3(n.x + dn.x, n.y, n.z + dn.z));

  // soften detail inside foam (foam is matte)
  vec2 foamG = texture2D(uFoamTex, vUvW).rg * uFoamGridOn;
  float foamAmt = clamp((foamG.r + foamG.g) * uFoamAmount, 0.0, 1.6);
  foamAmt += smoothstep(0.55, 1.15, vCrest) * 0.35 * uFoamAmount * uFoamGridOn;
  float foamMask = foamPattern(vWorld.xz, foamAmt);
  n = normalize(mix(n, vec3(0.0, 1.0, 0.0), foamMask * 0.35));

  // ---------- Fresnel + analytic sky reflection ----------
  float fres = 0.02 + 0.98 * pow(1.0 - max(dot(n, V), 0.0), 5.0);
  vec3 R = reflect(-V, n);
  R.y = abs(R.y);
  vec3 refl = skyColor(R);

  // ---------- body colour: Beer-Lambert absorption over depth ----------
  vec3 absorb = mix(vec3(0.55, 0.22, 0.12), vec3(0.10, 0.05, 0.03), uClarity);
  vec3 transmit = exp(-absorb * depth * 1.6);
  vec3 body = mix(uDeepColor, uShallowColor, clamp(transmit.g, 0.0, 1.0));
  // shallow sand glow
  body += uShallowColor * exp(-depth * 1.4) * 0.12;

  // ---------- subsurface scattering (sun through wave crests) ----------
  vec3 H = normalize(V + uSunDir);
  float sss = pow(clamp(dot(V, -uSunDir) * 0.5 + 0.5, 0.0, 1.0), 3.0)
            * clamp(vWorld.y * 0.6 + 0.55, 0.0, 1.2)
            * exp(-depth * 0.35);
  body += uSSSColor * sss * (0.35 + 0.65 * uSunColor.g);

  vec3 col = mix(body, refl, clamp(fres * 1.15, 0.0, 1.0));

  // ---------- sun specular: GGX-ish dual lobe glints ----------
  float ndh = max(dot(n, H), 0.0);
  float specTight = pow(ndh, 720.0) * 3.4;
  float specBroad = pow(ndh, 90.0) * 0.28;
  float glint = texture2D(uNoise, vWorld.xz * 1.9 + uTime * 0.06).a;
  specTight *= 0.7 + glint * 0.9;
  col += uSunColor * (specTight + specBroad) * (1.0 - foamMask * 0.85);

  // ---------- foam shading ----------
  float foamShade = 0.75 + 0.25 * max(dot(vec3(0.0, 1.0, 0.0), uSunDir), 0.0);
  vec3 foamCol = mix(vec3(0.82, 0.88, 0.90), vec3(1.02), foamShade * 0.5);
  foamCol *= 0.85 + texture2D(uNoise, vWorld.xz * 2.6).a * 0.3;
  foamCol = mix(foamCol, foamCol * vec3(0.35, 0.4, 0.55), uNight * 0.7);
  col = mix(col, foamCol, clamp(foamMask, 0.0, 1.0) * 0.92);

  // shoreline soft edge: fade alpha where depth -> 0
  float alpha = mix(0.62, 0.97, clamp(fres + depth * 0.55, 0.0, 1.0));
  alpha *= smoothstep(-0.06, 0.22, depth);
  alpha = max(alpha, foamMask * smoothstep(-0.12, 0.05, depth));

  // ---------- fog to horizon ----------
  float dist = distance(cameraPosition, vWorld);
  float fogF = smoothstep(uFogNear, uFogFar, dist);
  col = mix(col, uFogColor, fogF);

  gl_FragColor = vec4(col, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

// far ocean disc out to the horizon
export const FAR_FRAG = /* glsl */ `
precision highp float;
varying vec3 vWorld;
uniform float uTime;
uniform float uTimeSky;
uniform vec3 uDeepColor;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
uniform sampler2D uNoise;
uniform float uWorldHalf;   // cut a square hole so the seabed stays visible
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
${SKY_GLSL}
void main(){
  if(abs(vWorld.x) < uWorldHalf && abs(vWorld.z) < uWorldHalf) discard;
  vec3 V = normalize(cameraPosition - vWorld);
  vec2 g = texture2D(uNoise, vWorld.xz * 0.02 + vec2(uTime * 0.008, 0.0)).rg * 2.0 - 1.0;
  vec3 n = normalize(vec3(g.x * 0.18, 1.0, g.y * 0.18));
  float fres = 0.02 + 0.98 * pow(1.0 - max(dot(n, V), 0.0), 5.0);
  vec3 R = reflect(-V, n); R.y = abs(R.y);
  vec3 col = mix(uDeepColor, skyColor(R), clamp(fres * 0.95, 0.0, 1.0));
  vec3 H = normalize(V + uSunDir);
  col += uSunColor * pow(max(dot(n, H), 0.0), 240.0) * 1.4;
  float dist = distance(cameraPosition, vWorld);
  col = mix(col, uFogColor, smoothstep(uFogNear, uFogFar, dist));
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export const WORLD_VERT = /* glsl */ `
varying vec3 vWorld;
void main(){
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

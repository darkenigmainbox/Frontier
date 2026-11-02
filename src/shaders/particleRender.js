import { HEADER, NOISE, TERRAIN, WAVES, RIPPLE, FULLSCREEN_VS } from './chunks.js';

const IO = /* glsl */ `
uniform sampler2D uPos;
uniform sampler2D uVel;
uniform vec2 uPTex;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform vec3 cameraPosition;
ivec2 pCoord(int id){ int w = int(uPTex.x); return ivec2(id % w, id / w); }
bool isType(vec4 V, float t){ return abs(floor(V.w + 0.01) - t) < 0.1; }
`;

const LIGHT = /* glsl */ `
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform samplerCube uSkyCube;
`;

// ---------------- 3D particle foam: small discs lying on the animated surface ----------------
export const foamQuadVS = HEADER + NOISE + TERRAIN + WAVES + RIPPLE + IO + /* glsl */ `
in vec3 position;
uniform float uFoamSize;
out vec2 vUv;
out float vAlpha;
out vec3 vN;
out float vSeed;
void main(){
  int id = gl_InstanceID;
  ivec2 tc = pCoord(id);
  vec4 P = texelFetch(uPos, tc, 0);
  vec4 V = texelFetch(uVel, tc, 0);
  vUv = position.xy; vAlpha = 0.0; vN = vec3(0.0, 1.0, 0.0); vSeed = 0.0;
  if (!isType(V, 2.0)){ gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  vec2 b = P.xz;
  float dist = length(cameraPosition.xz - b) + abs(cameraPosition.y);
  if (dist > 220.0){ gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  vec4 terr = terrainAt(b);
  float att = waveAtten(terr.x);
  vec3 d; vec3 n; float J;
  gerstnerFull(b, att, dist * 0.012, d, n, J);
  vec3 wp = vec3(b.x + d.x, d.y, b.y + d.z);
  float cr; float dh;
  wp.y += shoreWave(b, terr.y, cr, dh) + rippleHeight(b);
  vec2 slope = vec2(-n.x, -n.z) / max(n.y, 0.2) + rippleSlope(b);
  vec3 N = normalize(vec3(-slope.x, 1.0, -slope.y));
  float seed = hash11(float(id) * 0.6180339 + 0.1);
  float lifeK = clamp(P.w / 2.5, 0.0, 1.0);
  float size = uFoamSize * (0.45 + 1.1 * seed) * (0.35 + 0.65 * lifeK);
  float ang = seed * 6.2831853;
  vec2 cs = vec2(cos(ang), sin(ang));
  vec2 corner = vec2(position.x * cs.x - position.y * cs.y, position.x * cs.y + position.y * cs.x);
  vec3 T = normalize(cross(N, vec3(0.0, 0.0, 1.0)));
  vec3 B = cross(T, N);
  wp += (T * corner.x + B * corner.y) * size + N * 0.04;
  vAlpha = lifeK * (1.0 - smoothstep(120.0, 220.0, dist));
  vN = N;
  vSeed = seed;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}
`;

export const foamQuadFS = HEADER + NOISE + LIGHT + /* glsl */ `
uniform float uFoamOpacity;
in vec2 vUv;
in float vAlpha;
in vec3 vN;
in float vSeed;
out vec4 fragColor;
void main(){
  float r = length(vUv);
  float n = vnoise(vUv * 2.7 + vSeed * 37.0);
  float m = 1.0 - smoothstep(0.3, 1.0, r + (n - 0.5) * 0.7);
  float a = m * vAlpha * uFoamOpacity;
  if (a < 0.01) discard;
  vec3 amb = textureLod(uSkyCube, vN, 6.0).rgb;
  float ndl = max(dot(vN, uSunDir), 0.0);
  vec3 col = vec3(0.9) * (uSunColor * (ndl * 0.7 + 0.3) * 0.85 + amb * 1.25);
  fragColor = vec4(col * (0.85 + 0.15 * n), a);
}
`;

// ---------------- Spray sprites (velocity-stretched, used when SSF is off) ----------------
export const sprayVS = HEADER + NOISE + IO + /* glsl */ `
in vec3 position;
uniform float uSpraySize;
uniform float uStreak;
out vec2 vUv;
out float vAlpha;
out vec3 vNormalHint;
void main(){
  int id = gl_InstanceID;
  ivec2 tc = pCoord(id);
  vec4 P = texelFetch(uPos, tc, 0);
  vec4 V = texelFetch(uVel, tc, 0);
  vUv = position.xy; vAlpha = 0.0; vNormalHint = vec3(0.0, 1.0, 0.0);
  if (!isType(V, 1.0)){ gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  vec3 p = P.xyz;
  vec3 toCam = normalize(cameraPosition - p);
  vec3 vel = V.xyz - toCam * dot(V.xyz, toCam);
  float sp = length(vel);
  vec3 axis = sp > 1e-3 ? vel / sp : normalize(cross(toCam, vec3(0.0, 1.0, 0.0)));
  vec3 side = normalize(cross(axis, toCam));
  float seed = hash11(float(id) * 0.37 + 0.2);
  float size = uSpraySize * (0.6 + 0.8 * seed);
  float len = size + sp * uStreak;
  vec3 wp = p + axis * position.y * len + side * position.x * size;
  vAlpha = clamp(P.w * 2.0, 0.0, 1.0) * sqrt(size / len);
  vNormalHint = toCam;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}
`;

export const sprayFS = HEADER + LIGHT + /* glsl */ `
in vec2 vUv;
in float vAlpha;
in vec3 vNormalHint;
out vec4 fragColor;
void main(){
  float r = length(vUv);
  float a = (1.0 - smoothstep(0.2, 1.0, r)) * vAlpha * 0.75;
  if (a < 0.01) discard;
  vec3 amb = textureLod(uSkyCube, vec3(0.0, 1.0, 0.0), 6.0).rgb;
  float back = pow(max(dot(-vNormalHint, uSunDir), 0.0), 3.0);
  vec3 col = vec3(0.92) * (uSunColor * (0.55 + back * 1.5) * 0.7 + amb * 1.3);
  fragColor = vec4(col, a);
}
`;

// ---------------- Screen-space fluid rendering ----------------
export const ssfPointVS = HEADER + IO + /* glsl */ `
uniform float uRadius;
uniform float uProjScale;
out vec3 vViewPos;
void main(){
  int id = gl_VertexID;
  ivec2 tc = pCoord(id);
  vec4 P = texelFetch(uPos, tc, 0);
  vec4 V = texelFetch(uVel, tc, 0);
  vViewPos = vec3(0.0);
  if (!isType(V, 1.0)){ gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; return; }
  vec4 vp = viewMatrix * vec4(P.xyz, 1.0);
  vViewPos = vp.xyz;
  gl_Position = projectionMatrix * vp;
  gl_PointSize = clamp(2.0 * uRadius * uProjScale / max(-vp.z, 0.05), 1.0, 56.0);
}
`;

export const ssfDepthFS = HEADER + /* glsl */ `
uniform mat4 projectionMatrix;
uniform float uRadius;
in vec3 vViewPos;
out vec4 fragColor;
void main(){
  vec2 q = gl_PointCoord * 2.0 - 1.0;
  q.y = -q.y;
  float r2 = dot(q, q);
  if (r2 > 1.0) discard;
  float nz = sqrt(1.0 - r2);
  vec3 pos = vViewPos + vec3(q * uRadius, nz * uRadius);
  vec4 clip = projectionMatrix * vec4(pos, 1.0);
  gl_FragDepth = clip.z / clip.w * 0.5 + 0.5;
  fragColor = vec4(-pos.z, 0.0, 0.0, 1.0);
}
`;

export const ssfThickFS = HEADER + /* glsl */ `
uniform float uRadius;
in vec3 vViewPos;
out vec4 fragColor;
void main(){
  vec2 q = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(q, q);
  if (r2 > 1.0) discard;
  fragColor = vec4(sqrt(1.0 - r2) * uRadius * 2.0, 0.0, 0.0, 1.0);
}
`;

// Separable bilateral filter (narrow-range) to smooth the particle depth into a surface
export const ssfBlurFS = HEADER + /* glsl */ `
uniform sampler2D uDepth;
uniform vec2 uDir;
uniform float uProjScale;
uniform float uBlurRadius;
uniform float uFalloff;
in vec2 vUv;
out vec4 fragColor;
void main(){
  float d = texture(uDepth, vUv).r;
  if (d <= 0.0){ fragColor = vec4(0.0); return; }
  float radPx = clamp(uBlurRadius * uProjScale / d, 1.0, 16.0);
  float sigma = max(radPx * 0.5, 0.5);
  float sum = 0.0; float wsum = 0.0;
  for (int i = -16; i <= 16; i++){
    float fi = float(i);
    if (abs(fi) > radPx) continue;
    float s = texture(uDepth, vUv + uDir * fi).r;
    if (s <= 0.0) continue;
    float ws = exp(-fi * fi / (2.0 * sigma * sigma));
    float dr = (s - d) / uFalloff;
    float w = ws * exp(-dr * dr);
    sum += s * w; wsum += w;
  }
  fragColor = vec4(sum / max(wsum, 1e-5), 0.0, 0.0, 0.0);
}
`;

export const ssfCompositeFS = HEADER + LIGHT + /* glsl */ `
uniform sampler2D uDepth;
uniform sampler2D uThick;
uniform sampler2D uScene;
uniform mat4 uProj;
uniform mat4 uViewInv;
uniform vec3 uCamPos;
uniform vec2 uInvRes;
uniform vec3 uAbsorb;
uniform vec3 uDeepColor;
uniform float uWhiteness;
in vec2 vUv;
out vec4 fragColor;
vec3 viewPos(vec2 uv, float d){
  vec2 ndc = uv * 2.0 - 1.0;
  return vec3(ndc.x / uProj[0][0] * d, ndc.y / uProj[1][1] * d, -d);
}
void main(){
  float d = texture(uDepth, vUv).r;
  if (d <= 0.0) discard;
  vec3 P = viewPos(vUv, d);
  vec2 ex = vec2(uInvRes.x, 0.0); vec2 ey = vec2(0.0, uInvRes.y);
  float dr = texture(uDepth, vUv + ex).r; float dl = texture(uDepth, vUv - ex).r;
  float du = texture(uDepth, vUv + ey).r; float dd = texture(uDepth, vUv - ey).r;
  vec3 ddx = dr > 0.0 ? viewPos(vUv + ex, dr) - P : vec3(0.0);
  vec3 ddx2 = dl > 0.0 ? P - viewPos(vUv - ex, dl) : vec3(0.0);
  if (dr <= 0.0 || (dl > 0.0 && abs(ddx2.z) < abs(ddx.z))) ddx = ddx2;
  vec3 ddy = du > 0.0 ? viewPos(vUv + ey, du) - P : vec3(0.0);
  vec3 ddy2 = dd > 0.0 ? P - viewPos(vUv - ey, dd) : vec3(0.0);
  if (du <= 0.0 || (dd > 0.0 && abs(ddy2.z) < abs(ddy.z))) ddy = ddy2;
  vec3 nV = cross(ddx, ddy);
  nV = dot(nV, nV) > 1e-12 ? normalize(nV) : vec3(0.0, 0.0, 1.0);
  vec3 N = normalize(mat3(uViewInv) * nV);
  vec3 Pw = (uViewInv * vec4(P, 1.0)).xyz;
  vec3 V = normalize(uCamPos - Pw);
  float thick = texture(uThick, vUv).r;
  float NdV = max(dot(N, V), 0.0);
  float F = 0.02 + 0.98 * pow(1.0 - NdV, 5.0);
  vec3 R = reflect(-V, N); R.y = abs(R.y);
  vec3 refl = textureLod(uSkyCube, R, 0.0).rgb;
  vec2 ruv = vUv + nV.xy * min(thick, 1.0) * 0.035;
  vec3 bg = texture(uScene, ruv).rgb;
  vec3 T = exp(-uAbsorb * thick * 2.0);
  vec3 amb = textureLod(uSkyCube, N, 6.0).rgb;
  vec3 lightIn = uSunColor * max(uSunDir.y, 0.0) * 0.25 + textureLod(uSkyCube, vec3(0.0, 1.0, 0.0), 6.0).rgb;
  // Splash water is churned and full of air: in-scattering keeps thick sheets bright and teal instead of
  // the deep-ocean body colour, and thin sheets/droplets turn white (aerated)
  vec3 scat = (uDeepColor * 6.0 + vec3(0.22, 0.38, 0.42)) * lightIn;
  vec3 body = bg * T + scat * (1.0 - T);
  float ndl = max(dot(N, uSunDir), 0.0);
  float thin = 1.0 - smoothstep(0.03, 0.6, thick);
  float aer = clamp(mix(0.4, 1.0, thin) * uWhiteness, 0.0, 1.0);
  float fwd = pow(max(dot(-V, uSunDir), 0.0), 6.0); // backlit spray glows (Mie forward scattering)
  vec3 white = vec3(0.9) * (uSunColor * (ndl * 0.6 + 0.4 + fwd * (0.6 + thin)) * 0.8 + amb * 1.3);
  vec3 col = mix(body, white, aer * 0.85);
  col = mix(col, refl, F * (1.0 - aer * 0.7));
  vec3 H = normalize(V + uSunDir);
  float spec = pow(max(dot(N, H), 0.0), 900.0) * 60.0;
  col += uSunColor * spec * (0.2 + F);
  float alpha = smoothstep(0.0, 0.04, thick);
  vec4 clip = uProj * vec4(P, 1.0);
  gl_FragDepth = clip.z / clip.w * 0.5 + 0.5;
  fragColor = vec4(col, alpha);
}
`;

export const particleRenderShaders = {
  foamQuad: [foamQuadVS, foamQuadFS],
  spray: [sprayVS, sprayFS],
  ssfDepth: [ssfPointVS, ssfDepthFS],
  ssfThick: [ssfPointVS, ssfThickFS],
  ssfBlur: [FULLSCREEN_VS, ssfBlurFS],
  ssfComposite: [FULLSCREEN_VS, ssfCompositeFS],
};

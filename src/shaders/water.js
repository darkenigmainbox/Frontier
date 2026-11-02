import { HEADER, NOISE, TERRAIN, WAVES, RIPPLE } from './chunks.js';

// ---------------------------------------------------------------------------
// Ocean surface. Geometry: camera-centred nested LOD rings (world-snapped so
// vertices never swim). Displacement = Gerstner spectrum + shore breakers +
// the interactive 2.5D ripple field.
// ---------------------------------------------------------------------------
export const waterVS = HEADER + NOISE + TERRAIN + WAVES + RIPPLE + /* glsl */ `
in vec3 position;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform vec3 cameraPosition;
uniform vec2 uLevelOffset;
uniform float uLodScale;
out vec3 vWorld;
out vec2 vBase;
out float vViewZ;
void main(){
  vec2 base = position.xz + uLevelOffset;
  vec4 terr = terrainAt(base);
  float att = waveAtten(terr.x);
  float dist = length(cameraPosition - vec3(base.x, 0.0, base.y));
  vec3 d = (gerstnerDisp(base, dist * 0.012) + fftDisp(base, max(dist * 0.012, 0.03))) * att;
  float cr; float dh;
  float hs = shoreWave(base, terr.y, cr, dh);
  float rip = rippleHeight(base);
  vec3 wp = vec3(base.x + d.x, d.y + hs + rip, base.y + d.z);
  vWorld = wp;
  vBase = base;
  vec4 vp = viewMatrix * vec4(wp, 1.0);
  vViewZ = -vp.z;
  vp.xyz *= uLodScale; // nudge coarser rings back so finer rings win where they overlap
  gl_Position = projectionMatrix * vp;
}
`;

export const waterFS = HEADER + NOISE + TERRAIN + WAVES + RIPPLE + /* glsl */ `
uniform vec3 cameraPosition;
uniform sampler2D uRefr;      // rgb = opaque scene, a = linear view depth
uniform sampler2D uReflect;   // planar reflection of geometry (a = coverage)
uniform samplerCube uSkyCube;
uniform mat4 uReflMatrix;
uniform vec2 uResolution;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uAbsorb;
uniform vec3 uDeepColor;
uniform vec3 uSSSColor;
uniform vec4 uToggles;      // planar reflections, refraction, SSS, detail normals
uniform vec4 uFoamParams;   // crest foam, grid foam, shore foam, pattern scale
uniform float uCrestThresh;
uniform float uWaveHeight;
uniform float uWindAngle;
uniform float uFogDensity;
uniform float uRoughness;
uniform float uDetailStrength;
uniform sampler2D uFoamTex;
in vec3 vWorld;
in vec2 vBase;
in float vViewZ;
out vec4 fragColor;

void main(){
  vec3 V = cameraPosition - vWorld;
  float dist = length(V);
  V /= dist;
  vec4 terr = terrainAt(vBase);
  float att = waveAtten(terr.x);
  // Pixel footprint on the water plane (stretched at grazing angles) -> band-limit all detail
  float pix = dist * 0.0021 / max(abs(V.y), 0.07);

  // ---- Normal: Gerstner (per pixel) + shore breakers + ripples + capillary detail ----
  vec3 disp; vec3 gn; vec3 gjp;
  gerstnerParts(vBase, att, pix * 2.5, disp, gn, gjp);
  vec2 slope = vec2(-gn.x, -gn.z) / max(gn.y, 0.15);
  // FFT wind sea: slopes of the displaced surface (divide by the horizontal stretch)
  vec3 fd; vec2 fs; vec3 fjp;
  fftFull(vBase, att, fd, fs, fjp);
  float jxx = 1.0 + gjp.x + fjp.x, jzz = 1.0 + gjp.y + fjp.y, jxz = gjp.z + fjp.z;
  float J = jxx * jzz - jxz * jxz;
  if (uToggles.w > 0.5) slope += fs / max(vec2(1.0 + fjp.x, 1.0 + fjp.y), vec2(0.3)) * uDetailStrength;
  float cr; float dHdd;
  shoreWave(vBase, terr.y, cr, dHdd);
  if (uShore.w > 0.5 && terr.y < 70.0) slope += dHdd * shoreGrad(vBase);
  slope += rippleSlope(vBase);
  vec3 N = normalize(vec3(-slope.x, 1.0, -slope.y));
  N = normalize(mix(N, vec3(0.0, 1.0, 0.0), smoothstep(0.5, 6.0, pix) * 0.6));
  float NdV = dot(N, V);
  if (NdV < 0.02){ N = normalize(N + V * (0.02 - NdV)); NdV = max(dot(N, V), 0.02); }

  vec3 L = uSunDir;
  float F = 0.02 + 0.98 * pow(1.0 - NdV, 5.0);
  float rough = uRoughness + min(pix * 0.08, 0.3);

  // ---- Reflection: sky cubemap + planar reflection of the island / boat ----
  vec3 R = reflect(-V, N);
  R.y = abs(R.y);
  vec3 refl = min(textureLod(uSkyCube, R, clamp(rough * 10.0, 0.0, 5.0)).rgb, vec3(6.0));
  if (uToggles.x > 0.5){
    vec4 tc = uReflMatrix * vec4(vWorld.x, 0.0, vWorld.z, 1.0);
    vec2 ruv = tc.xy / tc.w + N.xz * 0.045;
    vec4 pr = texture(uReflect, clamp(ruv, vec2(0.001), vec2(0.999)));
    refl = mix(refl, pr.rgb, pr.a);
  }

  // ---- Refraction with Beer-Lambert absorption + in-scattering ----
  vec2 suv = gl_FragCoord.xy / uResolution;
  vec3 skyAmb = textureLod(uSkyCube, vec3(0.0, 1.0, 0.0), 6.0).rgb;
  vec3 lightIn = uSunColor * max(L.y, 0.0) * 0.25 + skyAmb;
  vec3 scatter = uDeepColor * lightIn;
  vec3 refr = scatter;
  float thick = max(vWorld.y - terr.x, 0.0) * 1.5;
  if (uToggles.y > 0.5){
    vec2 off = N.xz * 0.06 / (1.0 + vViewZ * 0.04);
    vec4 o = texture(uRefr, suv + off);
    if (o.a < vViewZ) o = texture(uRefr, suv);
    thick = max(o.a - vViewZ, 0.0) * dist / max(vViewZ, 1e-3);
    vec3 T = exp(-uAbsorb * thick);
    refr = o.rgb * T + scatter * (1.0 - T);
  }

  // ---- Subsurface scattering through backlit crests ----
  float crestH = clamp((vWorld.y + uWaveHeight * 0.15) / max(uWaveHeight, 0.05), 0.0, 1.0);
  float sssV = pow(clamp(dot(V, -normalize(L + N * 0.55)), 0.0, 1.0), 4.0);
  float sss = uToggles.z * (sssV * 1.6 + 0.2) * crestH * crestH;
  refr += uSSSColor * uSunColor * sss * smoothstep(-0.05, 0.15, L.y);

  vec3 col = mix(refr, refl, F);

  // ---- Sun specular (GGX) ----
  vec3 H = normalize(V + L);
  float NdH = max(dot(N, H), 0.0);
  float NdL = max(dot(N, L), 0.0);
  float a = max(rough, 0.03);
  float a2 = a * a;
  float dd = NdH * NdH * (a2 - 1.0) + 1.0;
  float D = a2 / (3.14159265 * dd * dd);
  float k = a * 0.5;
  float G = NdL / (NdL * (1.0 - k) + k) * NdV / (NdV * (1.0 - k) + k);
  float Fs = 0.02 + 0.98 * pow(1.0 - max(dot(H, V), 0.0), 5.0);
  col += uSunColor * D * G * Fs / (4.0 * NdV * max(NdL, 1e-3) + 1e-4) * NdL;

  // ---- Foam ----
  // Whitecaps where the surface folds (Jacobian). Near the player the world-anchored 2.5D foam grid
  // owns the foam (it accumulates the same whitecaps, so foam lingers and trails behind crests);
  // outside the grid we fall back to the instantaneous crest foam.
  float wc = uFoamParams.x * smoothstep(uCrestThresh + 0.12, uCrestThresh - 0.3, J);
  vec2 guv = rippleUV(vBase);
  float gridW = (uFoamParams.y > 0.5 && rippleInside(guv)) ? rippleFade(guv) : 0.0;
  vec4 fg = foamGridAt(vBase);
  float foam = mix(wc, fg.r * 0.75 + fg.g * 0.55 + wc * 0.3, gridW);
  if (uFoamParams.z > 0.0){
    float shoreBreak = cr * smoothstep(24.0, 5.0, terr.y) * 1.2;
    float depthHere = vWorld.y - terr.x;
    float edgeW = 1.0 - smoothstep(0.0, 0.7, min(depthHere, thick));
    float wash = edgeW * (0.45 + 0.4 * sin(terr.y * 1.3 - uTime * 1.1 + vnoise(vBase * 0.3) * 4.0));
    foam += uFoamParams.z * (shoreBreak + wash);
  }
  // Lace: two layers of the bubble texture (different scale + rotation), riding on the wave slope
  vec2 fuv = vBase * (0.085 * uFoamParams.w) + slope * 0.012;
  vec4 ft1 = texture(uFoamTex, fuv);
  vec4 ft2 = texture(uFoamTex, mat2(0.8, -0.6, 0.6, 0.8) * fuv * 2.31 + vec2(0.31, 0.73) + vec2(uTime * 0.004, 0.0));
  float lace = ft1.r * 0.6 + ft2.g * 0.4;
  // never 100% coverage: real foam always keeps pores/holes
  float amt = 0.9 * (1.0 - exp(-1.6 * max(foam, 0.0)));
  float fw = 0.05 + min(pix * 0.25, 0.35);
  float cover = smoothstep(1.0 - amt - fw, 1.0 - amt + fw, lace);
  float dens = smoothstep(0.0, 0.3, lace - (1.0 - amt));
  // Bubbles just below the surface: a soft turquoise glow under and around the foam
  float sub = clamp(foam * 1.1, 0.0, 1.0) * (0.35 + 0.65 * texture(uFoamTex, fuv * 0.55 + 0.37, 2.0).b);
  col += (uSSSColor * 1.4 + vec3(0.015, 0.06, 0.06)) * lightIn * sub * 0.8 * (1.0 - cover);
  // Foam is a diffuse scatterer: light it with a neutral sky irradiance (the low cube mip mixes the warm
  // sun glow with blue sky into a lavender tint otherwise); thin foam shows the water through it
  vec3 amb = mix(skyAmb, textureLod(uSkyCube, N, 6.0).rgb, 0.4);
  amb = mix(vec3(dot(amb, vec3(0.3, 0.5, 0.2))), amb, 0.45);
  vec3 foamAlb = mix(vec3(0.5, 0.74, 0.76), vec3(0.88, 0.9, 0.91), dens) * (0.75 + 0.25 * dens);
  vec3 foamCol = foamAlb * (uSunColor * (NdL * 0.75 + 0.25) * 0.85 + amb);
  col = mix(col, foamCol, cover * (0.5 + 0.45 * dens));

  // ---- Aerial perspective ----
  vec3 horizon = textureLod(uSkyCube, normalize(vec3(-V.x, 0.03, -V.z)), 3.0).rgb;
  col = mix(col, horizon, 1.0 - exp(-dist * uFogDensity));
  fragColor = vec4(col, 1.0);
}
`;

// ---------------------------------------------------------------------------
// Island terrain: height-field mesh, sand/grass/rock, wet sand, underwater
// caustics, baked sun shadows + AO.
// ---------------------------------------------------------------------------
export const terrainVS = HEADER + TERRAIN + /* glsl */ `
in vec3 position;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
out vec3 vWorld;
void main(){
  vec2 xz = position.xz;
  float h = terrainAt(xz).x;
  vWorld = vec3(xz.x, h, xz.y);
  gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.0);
}
`;

export const terrainFS = HEADER + NOISE + TERRAIN + WAVES + /* glsl */ `
uniform vec3 cameraPosition;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform samplerCube uSkyCube;
uniform float uClipBelow;
uniform float uCaustics;
uniform float uFogDensity;
in vec3 vWorld;
out vec4 fragColor;

float caustic(vec2 uv, float t){
  vec2 p = mod(uv * 6.2831853, 6.2831853) - 250.0;
  vec2 i = p;
  float c = 1.0;
  float inten = 0.005;
  for (int n = 0; n < 4; n++){
    float tt = t * (1.0 - (3.5 / float(n + 1)));
    i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
    c += 1.0 / length(vec2(p.x / (sin(i.x + tt) / inten), p.y / (cos(i.y + tt) / inten)));
  }
  c /= 4.0;
  c = 1.17 - pow(c, 1.4);
  return pow(abs(c), 8.0);
}

void main(){
  if (uClipBelow > 0.5 && vWorld.y < 0.0) discard;
  vec2 xz = vWorld.xz;
  vec4 t = terrainAt(xz);
  vec3 n = terrainNormal(xz);
  float h = vWorld.y;
  float slope = 1.0 - n.y;
  float nz = fbm3(xz * 0.35);
  float nz2 = vnoise(xz * 2.5);

  vec3 sand = mix(vec3(0.62, 0.52, 0.36), vec3(0.72, 0.62, 0.45), nz);
  vec3 seabed = mix(vec3(0.42, 0.38, 0.28), vec3(0.3, 0.32, 0.26), nz);
  vec3 grass = mix(vec3(0.10, 0.17, 0.05), vec3(0.17, 0.22, 0.08), nz);
  vec3 rock = mix(vec3(0.27, 0.25, 0.23), vec3(0.38, 0.35, 0.31), nz2);
  vec3 alb = sand;
  alb = mix(alb, seabed, smoothstep(-1.0, -6.0, h));
  alb = mix(alb, grass, smoothstep(2.2, 3.4, h + nz * 1.5) * (1.0 - smoothstep(0.25, 0.45, slope)));
  alb = mix(alb, rock, smoothstep(0.32, 0.55, slope + nz2 * 0.1));
  alb *= 0.85 + 0.3 * nz2;

  // wet sand band around the waterline (rises with the shore swash)
  float cr; float dh;
  float swash = shoreWave(xz, t.y, cr, dh);
  float wet = 1.0 - smoothstep(0.1 + swash, 0.9 + swash * 1.6, h);
  alb *= mix(1.0, 0.55, wet);

  float sh = t.z;
  float ao = t.w;
  float ndl = max(dot(n, uSunDir), 0.0);
  vec3 amb = textureLod(uSkyCube, n, 6.0).rgb;
  vec3 light = uSunColor * ndl * sh + amb * ao * 1.2;

  // caustics on the sea floor
  float depth = -h;
  if (depth > 0.0 && uCaustics > 0.0){
    float c = caustic(xz * 0.11 + vec2(0.0, uTime * 0.01), uTime * 0.6);
    c += caustic(xz * 0.07 - vec2(uTime * 0.008, 0.0), uTime * 0.45) * 0.6;
    float fade = smoothstep(0.0, 0.6, depth) * exp(-depth * 0.09);
    light += uSunColor * ndl * sh * c * fade * uCaustics * 1.6;
  }

  vec3 col = alb * light;
  vec3 V = cameraPosition - vWorld;
  float dist = length(V);
  if (h > 0.0 || uClipBelow > 0.5){
    vec3 horizon = textureLod(uSkyCube, normalize(vec3(-V.x / dist, 0.03, -V.z / dist)), 3.0).rgb;
    col = mix(col, horizon, 1.0 - exp(-dist * uFogDensity));
  }
  fragColor = vec4(col, 1.0);
}
`;

export const waterShaders = {
  water: [waterVS, waterFS],
  terrain: [terrainVS, terrainFS],
};

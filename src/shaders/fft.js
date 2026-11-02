import { HEADER, FULLSCREEN_VS } from './chunks.js';

// ---------------------------------------------------------------------------------------------
// Tessendorf FFT ocean on the GPU.
// Each cascade: spectrum time evolution -> 2 x log2(N) Stockham inverse-FFT passes -> finalize
// into mip-mapped half-float textures (displacement + slopes / displacement derivatives).
// Eight real fields are packed into four complex IFFTs (A + iB trick, valid because every
// field's spectrum is Hermitian), carried as two RGBA32F MRT attachments.
// ---------------------------------------------------------------------------------------------

const CMUL = /* glsl */ `
vec2 cmul(vec2 a, vec2 b){ return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x); }
// spectrum of (A + iB) given spectra of real fields A and B
vec2 pack2(vec2 a, vec2 b){ return vec2(a.x - b.y, a.y + b.x); }
`;

export const fftSpectrumFS = HEADER + CMUL + /* glsl */ `
uniform sampler2D uH0;   // xy = h0(k), zw = conj(h0(-k))
uniform float uTime;
uniform float uL;
uniform float uChop;
layout(location = 0) out vec4 o0;
layout(location = 1) out vec4 o1;
void main(){
  ivec2 c = ivec2(gl_FragCoord.xy);
  int N = textureSize(uH0, 0).x;
  vec2 n = vec2(c.x < N / 2 ? c.x : c.x - N, c.y < N / 2 ? c.y : c.y - N);
  vec2 k = 6.2831853 * n / uL;
  float kl = length(k);
  vec4 s = texelFetch(uH0, c, 0);
  float w = sqrt(9.81 * kl);
  float ph = w * uTime;
  vec2 e = vec2(cos(ph), sin(ph));
  vec2 h = cmul(s.xy, e) + cmul(s.zw, vec2(e.x, -e.y));
  vec2 ih = vec2(-h.y, h.x);
  float ik = kl > 1e-6 ? 1.0 / kl : 0.0;
  // horizontal displacement D = i k/|k| h  (points move towards crests -> sharp crests, flat troughs)
  vec2 Dx = ih * (k.x * ik) * uChop;
  vec2 Dz = ih * (k.y * ik) * uChop;
  vec2 hx = ih * k.x;
  vec2 hz = ih * k.y;
  vec2 Dxx = -h * (k.x * k.x * ik) * uChop;
  vec2 Dzz = -h * (k.y * k.y * ik) * uChop;
  vec2 Dxz = -h * (k.x * k.y * ik) * uChop;
  o0 = vec4(pack2(h, Dx), pack2(Dz, hx));
  o1 = vec4(pack2(hz, Dxx), pack2(Dzz, Dxz));
}
`;

// One radix-2 Stockham stage of the inverse FFT (natural order in and out).
export const fftPassFS = HEADER + CMUL + /* glsl */ `
uniform sampler2D uSrc0;
uniform sampler2D uSrc1;
uniform float uSub;      // sub-transform size: 2, 4, ..., N
uniform int uHoriz;
layout(location = 0) out vec4 o0;
layout(location = 1) out vec4 o1;
void main(){
  ivec2 c = ivec2(gl_FragCoord.xy);
  float N = float(textureSize(uSrc0, 0).x);
  float index = float(uHoriz == 1 ? c.x : c.y);
  float half_ = uSub * 0.5;
  float evenI = floor(index / uSub) * half_ + mod(index, half_);
  float oddI = evenI + N * 0.5;
  ivec2 ce = uHoriz == 1 ? ivec2(int(evenI), c.y) : ivec2(c.x, int(evenI));
  ivec2 co = uHoriz == 1 ? ivec2(int(oddI), c.y) : ivec2(c.x, int(oddI));
  float ang = 6.2831853 * index / uSub;
  vec2 tw = vec2(cos(ang), sin(ang));
  vec4 e0 = texelFetch(uSrc0, ce, 0), d0 = texelFetch(uSrc0, co, 0);
  vec4 e1 = texelFetch(uSrc1, ce, 0), d1 = texelFetch(uSrc1, co, 0);
  o0 = vec4(e0.xy + cmul(tw, d0.xy), e0.zw + cmul(tw, d0.zw));
  o1 = vec4(e1.xy + cmul(tw, d1.xy), e1.zw + cmul(tw, d1.zw));
}
`;

// Unpack into filterable, mip-mapped textures used by every surface shader.
export const fftFinalizeFS = HEADER + /* glsl */ `
uniform sampler2D uSrc0;
uniform sampler2D uSrc1;
layout(location = 0) out vec4 oDisp;   // Dx, h, Dz, Dxz
layout(location = 1) out vec4 oSlope;  // dh/dx, dh/dz, dDx/dx, dDz/dz
void main(){
  ivec2 c = ivec2(gl_FragCoord.xy);
  vec4 a = texelFetch(uSrc0, c, 0);
  vec4 b = texelFetch(uSrc1, c, 0);
  oDisp = vec4(a.y, a.x, a.z, b.w);
  oSlope = vec4(a.w, b.x, b.y, b.z);
}
`;

export const fftShaders = {
  spectrum: [FULLSCREEN_VS, fftSpectrumFS],
  pass: [FULLSCREEN_VS, fftPassFS],
  finalize: [FULLSCREEN_VS, fftFinalizeFS],
};

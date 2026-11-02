import { HEADER, FULLSCREEN_VS } from './chunks.js';

// Opaque colour + linearised depth into one texture (refraction source, soft depth)
export const blitDepthFS = HEADER + /* glsl */ `
uniform sampler2D uColor;
uniform sampler2D uDepth;
uniform float uNear;
uniform float uFar;
in vec2 vUv;
out vec4 fragColor;
void main(){
  vec3 c = texture(uColor, vUv).rgb;
  float d = texture(uDepth, vUv).r;
  float z = d * 2.0 - 1.0;
  float lin = 2.0 * uNear * uFar / (uFar + uNear - z * (uFar - uNear));
  if (d >= 0.999999) lin = 60000.0;
  fragColor = vec4(c, min(lin, 60000.0));
}
`;

export const brightFS = HEADER + /* glsl */ `
uniform sampler2D uSrc;
uniform vec2 uTexel;
uniform float uThreshold;
in vec2 vUv;
out vec4 fragColor;
void main(){
  vec3 c = texture(uSrc, vUv + uTexel * vec2(-1.0, -1.0)).rgb + texture(uSrc, vUv + uTexel * vec2(1.0, -1.0)).rgb +
           texture(uSrc, vUv + uTexel * vec2(-1.0, 1.0)).rgb + texture(uSrc, vUv + uTexel * vec2(1.0, 1.0)).rgb;
  c *= 0.25;
  c = min(c, vec3(60.0));
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  fragColor = vec4(c * smoothstep(uThreshold, uThreshold * 2.0, l), 1.0);
}
`;

export const blurFS = HEADER + /* glsl */ `
uniform sampler2D uSrc;
uniform vec2 uDir;
in vec2 vUv;
out vec4 fragColor;
void main(){
  vec3 c = texture(uSrc, vUv).rgb * 0.2270270;
  c += texture(uSrc, vUv + uDir * 1.3846154).rgb * 0.3162162;
  c += texture(uSrc, vUv - uDir * 1.3846154).rgb * 0.3162162;
  c += texture(uSrc, vUv + uDir * 3.2307692).rgb * 0.0702703;
  c += texture(uSrc, vUv - uDir * 3.2307692).rgb * 0.0702703;
  fragColor = vec4(c, 1.0);
}
`;

export const tonemapFS = HEADER + /* glsl */ `
uniform sampler2D uSrc;
uniform sampler2D uBloom;
uniform float uBloomStrength;
uniform float uExposure;
in vec2 vUv;
out vec4 fragColor;
const mat3 ACESIn = mat3(0.59719, 0.07600, 0.02840, 0.35458, 0.90834, 0.13383, 0.04823, 0.01566, 0.83777);
const mat3 ACESOut = mat3(1.60475, -0.10208, -0.00327, -0.53108, 1.10813, -0.07276, -0.07367, -0.00605, 1.07602);
vec3 rrt(vec3 v){ vec3 a = v * (v + 0.0245786) - 0.000090537; vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081; return a / b; }
vec3 toSRGB(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
void main(){
  vec3 c = texture(uSrc, vUv).rgb + texture(uBloom, vUv).rgb * uBloomStrength;
  c *= uExposure;
  c = clamp(ACESOut * rrt(ACESIn * c), 0.0, 1.0);
  vec2 q = vUv - 0.5;
  c *= 1.0 - dot(q, q) * 0.35;
  c = toSRGB(c);
  float dither = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) / 255.0;
  fragColor = vec4(c + dither, dot(c, vec3(0.299, 0.587, 0.114)));
}
`;

export const fxaaFS = HEADER + /* glsl */ `
uniform sampler2D uSrc;
uniform vec2 uTexel;
in vec2 vUv;
out vec4 fragColor;
void main(){
  vec3 luma = vec3(0.299, 0.587, 0.114);
  vec3 rgbNW = texture(uSrc, vUv + vec2(-1.0, -1.0) * uTexel).rgb;
  vec3 rgbNE = texture(uSrc, vUv + vec2(1.0, -1.0) * uTexel).rgb;
  vec3 rgbSW = texture(uSrc, vUv + vec2(-1.0, 1.0) * uTexel).rgb;
  vec3 rgbSE = texture(uSrc, vUv + vec2(1.0, 1.0) * uTexel).rgb;
  vec3 rgbM = texture(uSrc, vUv).rgb;
  float lNW = dot(rgbNW, luma); float lNE = dot(rgbNE, luma);
  float lSW = dot(rgbSW, luma); float lSE = dot(rgbSE, luma);
  float lM = dot(rgbM, luma);
  float lMin = min(lM, min(min(lNW, lNE), min(lSW, lSE)));
  float lMax = max(lM, max(max(lNW, lNE), max(lSW, lSE)));
  vec2 dir = vec2(-((lNW + lNE) - (lSW + lSE)), ((lNW + lSW) - (lNE + lSE)));
  float dirReduce = max((lNW + lNE + lSW + lSE) * (0.25 / 8.0), 1.0 / 128.0);
  float rcpDirMin = 1.0 / (min(abs(dir.x), abs(dir.y)) + dirReduce);
  dir = clamp(dir * rcpDirMin, vec2(-8.0), vec2(8.0)) * uTexel;
  vec3 rgbA = 0.5 * (texture(uSrc, vUv + dir * (1.0 / 3.0 - 0.5)).rgb + texture(uSrc, vUv + dir * (2.0 / 3.0 - 0.5)).rgb);
  vec3 rgbB = rgbA * 0.5 + 0.25 * (texture(uSrc, vUv + dir * -0.5).rgb + texture(uSrc, vUv + dir * 0.5).rgb);
  float lB = dot(rgbB, luma);
  fragColor = vec4((lB < lMin || lB > lMax) ? rgbA : rgbB, 1.0);
}
`;

export const copyFS = HEADER + /* glsl */ `
uniform sampler2D uSrc;
in vec2 vUv;
out vec4 fragColor;
void main(){ fragColor = texture(uSrc, vUv); }
`;

export const postShaders = {
  blitDepth: [FULLSCREEN_VS, blitDepthFS],
  bright: [FULLSCREEN_VS, brightFS],
  blur: [FULLSCREEN_VS, blurFS],
  tonemap: [FULLSCREEN_VS, tonemapFS],
  fxaa: [FULLSCREEN_VS, fxaaFS],
  copy: [FULLSCREEN_VS, copyFS],
};

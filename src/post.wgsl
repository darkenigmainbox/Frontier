// Post-processing: bright pass -> separable gaussian bloom -> ACES tonemap.
// Everything the eye sees is generated at runtime; no image files anywhere.

struct PostU {
  p0 : vec4f,  // threshold, knee, blur dir x, blur dir y
  p1 : vec4f,  // exposure, bloom strength, vignette, grain
  p2 : vec4f,  // texel size x, texel size y, time, unused
};

@group(0) @binding(0) var srcTex : texture_2d<f32>;
@group(0) @binding(1) var bloomTex : texture_2d<f32>;
@group(0) @binding(2) var samp : sampler;
@group(0) @binding(3) var<uniform> P : PostU;

struct VSOut {
  @builtin(position) pos : vec4f,
  @location(0) uv : vec2f,
};

@vertex
fn vsQuad(@builtin(vertex_index) vi : u32) -> VSOut {
  var out : VSOut;
  let x = f32((vi << 1u) & 2u) * 2.0 - 1.0;
  let y = f32(vi & 2u) * 2.0 - 1.0;
  out.pos = vec4f(x, y, 0.0, 1.0);
  out.uv = vec2f(x * 0.5 + 0.5, 0.5 - y * 0.5);
  return out;
}

fn luminance(c : vec3f) -> f32 {
  return dot(c, vec3f(0.2126, 0.7152, 0.0722));
}

@fragment
fn fsBright(in : VSOut) -> @location(0) vec4f {
  let uv = in.uv;
  let t = P.p2.xy;
  var c = textureSample(srcTex, samp, uv).rgb * 0.5;
  c = c + textureSample(srcTex, samp, uv + vec2f(t.x, 0.0)).rgb * 0.125;
  c = c + textureSample(srcTex, samp, uv - vec2f(t.x, 0.0)).rgb * 0.125;
  c = c + textureSample(srcTex, samp, uv + vec2f(0.0, t.y)).rgb * 0.125;
  c = c + textureSample(srcTex, samp, uv - vec2f(0.0, t.y)).rgb * 0.125;

  let lum = luminance(c);
  let thresh = P.p0.x;
  let knee = max(P.p0.y, 0.0001);
  let soft = clamp(lum - thresh + knee, 0.0, 2.0 * knee);
  let softC = soft * soft / (4.0 * knee);
  let contrib = max(softC, lum - thresh) / max(lum, 0.0001);
  return vec4f(max(c * contrib, vec3f(0.0)), 1.0);
}

@fragment
fn fsBlur(in : VSOut) -> @location(0) vec4f {
  let uv = in.uv;
  let dir = P.p0.zw * P.p2.xy;
  var w = array<f32, 5>(0.2270270, 0.1945946, 0.1216216, 0.0540540, 0.0162160);
  var o = array<f32, 5>(0.0, 1.3846154, 3.2307692, 5.0769231, 6.9230769);
  var sum = textureSample(srcTex, samp, uv).rgb * w[0];
  for (var i = 1; i < 5; i = i + 1) {
    let off = dir * o[i];
    sum = sum + textureSample(srcTex, samp, uv + off).rgb * w[i];
    sum = sum + textureSample(srcTex, samp, uv - off).rgb * w[i];
  }
  return vec4f(sum, 1.0);
}

fn acesFilm(x : vec3f) -> vec3f {
  let a = 2.51;
  let b = 0.03;
  let c = 2.43;
  let d = 0.59;
  let e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), vec3f(0.0), vec3f(1.0));
}

fn hash21(p : vec2f) -> f32 {
  var q = fract(p * vec2f(0.1031, 0.1030));
  q = q + dot(q, q.yx + 33.33);
  return fract((q.x + q.y) * q.x);
}

@fragment
fn fsComposite(in : VSOut) -> @location(0) vec4f {
  let uv = in.uv;
  var col = textureSample(srcTex, samp, uv).rgb;
  let bloom = textureSample(bloomTex, samp, uv).rgb;

  col = col + bloom * P.p1.y;
  col = col * P.p1.x;
  col = acesFilm(col);

  // Grade: cool the shadows a touch, warm the highlights.
  let l = luminance(col);
  col = mix(col, col * vec3f(0.92, 0.94, 1.10), (1.0 - l) * 0.35);
  col = mix(col, col * vec3f(1.06, 1.0, 0.94), l * 0.30);

  // Vignette.
  let d = length(uv - vec2f(0.5, 0.5));
  col = col * mix(1.0, 1.0 - P.p1.z, clamp(d * d * 1.9, 0.0, 1.0));

  // Film grain / dither to keep the sky gradient smooth.
  let g = hash21(uv * P.p2.zw + P.p2.z * 13.0) - 0.5;
  col = col + vec3f(g * (P.p1.w + 0.004));

  // Linear -> sRGB.
  col = pow(max(col, vec3f(0.0)), vec3f(1.0 / 2.2));
  return vec4f(col, 1.0);
}

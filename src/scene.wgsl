// =============================================================================
//  Sugarplum Hollow — scene shader
//  Every material in this file is 100% procedural (no textures at all):
//  gingerbread crumb, piped royal icing, tempered chocolate, candy-cane helix
//  stripes, swirled lollipops, gumdrop sugar coating, jellybean jelly, puffed
//  marshmallow, peppermint pucks, sugar-snow and a flowing chocolate river.
// =============================================================================

// ---------------------------------------------------------------- uniforms --
struct Globals {
  viewProj    : mat4x4f,
  lightVP     : mat4x4f,
  invViewProj : mat4x4f,
  camPos      : vec4f,
  camRight    : vec4f,
  camUp       : vec4f,
  sunDir      : vec4f,  // xyz = dir toward the sun, w = intensity
  sunColor    : vec4f,
  skyTop      : vec4f,
  skyHorizon  : vec4f,
  skyGround   : vec4f,
  p0          : vec4f,  // x time, y night, z fog density, w snow amount
  p1          : vec4f,  // x exposure, y shadow texel, z unused, w unused
};

struct ObjU {
  model : mat4x4f,
  m0    : vec4f,  // x matId, y roughness scale, z emissive, w useInstance
  color1: vec4f,
  color2: vec4f,
  p     : vec4f,  // x uvScale, y ao strength, z, w
};

@group(0) @binding(0) var<uniform> G : Globals;
@group(0) @binding(1) var shadowMap : texture_depth_2d;
@group(0) @binding(2) var shadowSamp : sampler_comparison;
@group(0) @binding(3) var<storage, read> insts : array<vec4f>;

@group(1) @binding(0) var<uniform> O : ObjU;

// ------------------------------------------------------------------ helpers --
fn sat(x: f32) -> f32 { return clamp(x, 0.0, 1.0); }
fn sat3(x: vec3f) -> vec3f { return clamp(x, vec3f(0.0), vec3f(1.0)); }

fn hash11(x: f32) -> f32 {
  var h = fract(x * 0.1031);
  h = h * (h + 33.33);
  return fract(h * (h + h));
}

fn hash13(p3: vec3f) -> f32 {
  var p = fract(p3 * 0.1031);
  p = p + dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}

fn hash33(p3: vec3f) -> vec3f {
  var p = fract(p3 * vec3f(0.1031, 0.1030, 0.0973));
  p = p + dot(p, p.yxz + 33.33);
  return fract((p.xxy + p.yxx) * p.zyx);
}

// Trilinear value noise.
fn vnoise(p: vec3f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);
  let c000 = hash13(i + vec3f(0.0, 0.0, 0.0));
  let c100 = hash13(i + vec3f(1.0, 0.0, 0.0));
  let c010 = hash13(i + vec3f(0.0, 1.0, 0.0));
  let c110 = hash13(i + vec3f(1.0, 1.0, 0.0));
  let c001 = hash13(i + vec3f(0.0, 0.0, 1.0));
  let c101 = hash13(i + vec3f(1.0, 0.0, 1.0));
  let c011 = hash13(i + vec3f(0.0, 1.0, 1.0));
  let c111 = hash13(i + vec3f(1.0, 1.0, 1.0));
  let x00 = mix(c000, c100, u.x);
  let x10 = mix(c010, c110, u.x);
  let x01 = mix(c001, c101, u.x);
  let x11 = mix(c011, c111, u.x);
  return mix(mix(x00, x10, u.y), mix(x01, x11, u.y), u.z);
}

fn fbm3(pIn: vec3f, octaves: i32) -> f32 {
  var p = pIn;
  var amp = 0.5;
  var sum = 0.0;
  var norm = 0.0;
  for (var i = 0; i < octaves; i = i + 1) {
    sum = sum + amp * vnoise(p);
    norm = norm + amp;
    p = p * 2.03 + vec3f(17.3, 9.1, 5.7);
    amp = amp * 0.5;
  }
  return sum / max(norm, 0.0001);
}

fn fbmRidge(pIn: vec3f, octaves: i32) -> f32 {
  var p = pIn;
  var amp = 0.5;
  var sum = 0.0;
  var norm = 0.0;
  for (var i = 0; i < octaves; i = i + 1) {
    let n = abs(vnoise(p) * 2.0 - 1.0);
    sum = sum + amp * (1.0 - n);
    norm = norm + amp;
    p = p * 2.07 + vec3f(3.1, 27.7, 11.3);
    amp = amp * 0.5;
  }
  return sum / max(norm, 0.0001);
}

// Cheap 8-tap worley: returns (distance to nearest cell point, cell hash).
fn cellF1(p: vec3f) -> vec2f {
  let ip = floor(p);
  let fp = fract(p);
  var d1 = 4.0;
  var id = 0.0;
  for (var i = 0u; i < 8u; i = i + 1u) {
    let o = vec3f(f32(i & 1u), f32((i >> 1u) & 1u), f32((i >> 2u) & 1u));
    let r = hash33(ip + o);
    let d = length(o + r - fp);
    if (d < d1) {
      d1 = d;
      id = r.x;
    }
  }
  return vec2f(d1, id);
}

fn quatToMat3(q: vec4f) -> mat3x3f {
  let x = q.x;
  let y = q.y;
  let z = q.z;
  let w = q.w;
  return mat3x3f(
    vec3f(1.0 - 2.0 * (y * y + z * z), 2.0 * (x * y + z * w), 2.0 * (x * z - y * w)),
    vec3f(2.0 * (x * y - z * w), 1.0 - 2.0 * (x * x + z * z), 2.0 * (y * z + x * w)),
    vec3f(2.0 * (x * z + y * w), 2.0 * (y * z - x * w), 1.0 - 2.0 * (x * x + y * y)),
  );
}

// --------------------------------------------------------------------- sky --
fn skyColor(dirIn: vec3f) -> vec3f {
  let dir = normalize(dirIn);
  let up = sat(dir.y);
  var col = mix(G.skyHorizon.rgb, G.skyTop.rgb, pow(up, 0.42));
  col = mix(col, G.skyGround.rgb, sat(-dir.y * 3.0));

  let sunI = G.sunDir.w;
  let sd = sat(dot(dir, normalize(G.sunDir.xyz)));
  col = col + G.sunColor.rgb * pow(sd, 6.0) * 0.14 * sunI;
  col = col + G.sunColor.rgb * pow(sd, 700.0) * 2.2 * sunI;
  col = col + G.sunColor.rgb * pow(sd, 6000.0) * 26.0 * sunI;

  let t = G.p0.x;
  let night = G.p0.y;

  // Cotton-candy cloud bank, projected onto a virtual dome.
  if (dir.y > 0.02) {
    let pp = dir.xz / (dir.y + 0.18) * 0.5;
    let n1 = fbm3(vec3f(pp.x * 1.15 + t * 0.010, pp.y * 1.15, pp.x * 0.35), 4);
    let n2 = fbm3(vec3f(pp.x * 2.6 - t * 0.016, pp.y * 2.6, 3.7), 3);
    let band = sat((n1 * 0.75 + n2 * 0.35 - 0.42) * 2.4);
    var cloudCol = mix(vec3f(0.90, 0.62, 0.80), vec3f(1.0, 0.94, 0.88), sat(n1 * 1.5));
    let lit = 0.22 + 0.78 * sat(sunI / 2.6);
    cloudCol = cloudCol * lit;
    cloudCol = cloudCol + G.sunColor.rgb * pow(sd, 3.0) * 0.30 * sat(sunI / 2.6);
    cloudCol = mix(cloudCol, vec3f(0.16, 0.14, 0.30), night * 0.75);
    col = mix(col, cloudCol, band * sat(dir.y * 1.7) * 0.72);
  }

  // Stars + a whisper of aurora at night.
  if (night > 0.02) {
    let g = floor(dir * 210.0);
    let h = hash33(g);
    let twinkle = 0.55 + 0.45 * sin(t * 2.3 + h.y * 42.0);
    let star = step(0.9982, h.x) * twinkle;
    col = col + vec3f(star) * night * sat(dir.y * 2.5) * 2.2;
    let aur = fbmRidge(vec3f(dir.x * 2.2, dir.y * 5.0 + t * 0.02, dir.z * 2.2), 3);
    let aurBand = sat((aur - 0.55) * 2.2) * sat(dir.y * 1.5) * sat(1.0 - abs(dir.y - 0.55) * 2.4);
    col = col + mix(vec3f(0.10, 0.62, 0.45), vec3f(0.55, 0.25, 0.75), sat(dir.x * 0.5 + 0.5)) * aurBand * night * 0.35;
  }

  return max(col, vec3f(0.0));
}

// Cheap version of skyColor for fog: no clouds / no sun disc (saves ~8 noise taps).
fn skyFog(dirIn: vec3f) -> vec3f {
  let dir = normalize(dirIn);
  let up = sat(dir.y);
  var col = mix(G.skyHorizon.rgb, G.skyTop.rgb, pow(up, 0.42));
  col = mix(col, G.skyGround.rgb, sat(-dir.y * 3.0));
  let sd = sat(dot(dir, normalize(G.sunDir.xyz)));
  col = col + G.sunColor.rgb * pow(sd, 6.0) * 0.14 * G.sunDir.w;
  return col;
}

// -------------------------------------------------------------- materials --
struct Surf {
  albedo  : vec3f,
  rough   : f32,
  sss     : f32,
  coat    : f32,
  sparkle : f32,
  emis    : vec3f,
  bump    : f32,
  bfreq   : f32,
};

fn material(wp: vec3f, n: vec3f, uv: vec2f, ext: vec2f, tint: vec4f, hue: f32) -> Surf {
  var s: Surf;
  s.albedo = vec3f(0.8, 0.8, 0.8);
  s.rough = 0.5;
  s.sss = 0.0;
  s.coat = 0.0;
  s.sparkle = 0.0;
  s.emis = vec3f(0.0);
  s.bump = 0.0;
  s.bfreq = 10.0;

  let id = u32(O.m0.x + 0.5);
  let baseA = O.color1.rgb * tint.rgb;
  let baseB = O.color2.rgb;
  let t = G.p0.x;
  let night = G.p0.y;
  let ao = ext.x;

  if (id == 0u) {
    // ---- sugar snow / peppermint dust -------------------------------------
    let q = wp * 0.55;
    let d1 = fbm3(q, 2);
    let d2 = fbm3(q * 3.7 + vec3f(4.2, 1.1, 8.8), 2);
    let grain = cellF1(wp * 20.0);
    var c = mix(vec3f(0.80, 0.86, 0.97), vec3f(1.0, 0.98, 0.99), d1);
    c = mix(c, vec3f(1.0, 0.84, 0.92), 0.38 * sat((d2 - 0.58) * 2.2));
    c = mix(c, vec3f(0.84, 0.98, 0.94), 0.30 * sat((0.34 - d2) * 3.0));
    c = c * (0.93 + 0.10 * grain.y);
    s.albedo = c * ao;
    s.rough = 0.55 - 0.12 * grain.y;
    s.sparkle = 1.0;
    s.bump = 1.1;
    s.bfreq = 15.0;
  } else if (id == 1u) {
    // ---- gingerbread ------------------------------------------------------
    let q = wp * 1.55;
    let warpv = fbm3(q * 0.5, 2);
    let crumb = fbm3(q + vec3f(warpv * 2.2, warpv * 1.3, warpv * 1.8), 3);
    var c = mix(baseA, baseB, sat(crumb * 1.35 - 0.15));
    // baked crumb pores
    let pore = cellF1(wp * 33.0);
    let pores = sat((0.30 - pore.x) * 4.5);
    c = c * (1.0 - pores * 0.42);
    // fine crumb speckle
    c = c * (0.92 + 0.16 * cellF1(wp * 80.0).y);
    // icing-sugar dusting on upward faces
    let dust = sat((n.y - 0.2) * 1.7) * (0.5 + 0.5 * fbm3(wp * 6.5, 2));
    c = mix(c, vec3f(1.0, 0.955, 0.92), dust * 0.32);
    // oven-baked darkening where it curves away
    c = c * (0.88 + 0.12 * sat(n.y * 0.5 + 0.62));
    s.albedo = c * ao;
    s.rough = 0.66 - 0.18 * dust;
    s.sss = 0.22;
    s.sparkle = 0.2 + dust * 0.5;
    s.bump = 1.5;
    s.bfreq = 30.0;
  } else if (id == 2u) {
    // ---- royal icing (piped) ---------------------------------------------
    let veins = fbm3(wp * 2.4, 3);
    var c = mix(vec3f(0.995, 0.985, 0.975), baseA, 0.30 + 0.30 * veins);
    let ridge = 0.5 + 0.5 * sin(uv.y * 30.0 + fbm3(wp * 2.6, 2) * 7.0);
    c = c * (0.93 + 0.09 * ridge);
    c = c * (0.97 + 0.05 * cellF1(wp * 55.0).y);
    s.albedo = c * ao;
    s.rough = 0.15;
    s.sss = 0.8;
    s.coat = 1.0;
    s.sparkle = 0.4;
    s.bump = 0.7;
    s.bfreq = 24.0;
  } else if (id == 3u) {
    // ---- tempered chocolate ----------------------------------------------
    let q = wp * 2.1;
    let warp = fbm3(q * 0.6, 2);
    let swirl = fbm3(q + vec3f(warp * 2.0, warp * 1.4, warp * 0.8), 3);
    var c = mix(baseA, baseB, sat(swirl * 1.45 - 0.2));
    c = c * (0.94 + 0.12 * cellF1(wp * 60.0).y);
    c = c * (0.9 + 0.1 * cellF1(wp * 14.0).y);
    s.albedo = c * ao;
    s.rough = 0.24 - 0.08 * swirl;
    s.coat = 0.95;
    s.sss = 0.08;
    s.bump = 0.4;
    s.bfreq = 20.0;
  } else if (id == 4u) {
    // ---- candy cane (helix stripes) --------------------------------------
    // uv.x = around the stick, uv.y = distance along it
    let f = fract(uv.y * 1.35 + uv.x * 2.0 + hue * 0.37);
    let stripe = sat(smoothstep(0.42, 0.50, f) - smoothstep(0.86, 0.94, f));
    var c = mix(vec3f(0.975, 0.965, 0.955), baseA, stripe);
    c = c * (0.94 + 0.14 * cellF1(wp * 48.0).y);
    s.albedo = c * ao;
    s.rough = 0.10 + 0.10 * cellF1(wp * 26.0).y;
    s.coat = 1.0;
    s.sss = 0.35;
    s.sparkle = 1.0;
    s.bump = 0.5;
    s.bfreq = 42.0;
  } else if (id == 5u) {
    // ---- lollipop / hard candy swirl --------------------------------------
    let p = uv;
    let r = length(p);
    let ang = atan2(p.y, p.x);
    let sw = sin(ang * 3.0 + r * 17.0 - 1.4 + hue * 2.0);
    let band = sat(sw * 0.5 + 0.5);
    var c = mix(vec3f(1.0, 0.985, 0.975), baseA, smoothstep(0.34, 0.66, band));
    c = mix(c, baseB, sat(smoothstep(0.62, 1.0, r)) * 0.6);
    c = c * (0.97 + 0.05 * cellF1(wp * 70.0).y);
    s.albedo = c * ao;
    s.rough = 0.055;
    s.coat = 1.0;
    s.sss = 0.55;
    s.sparkle = 0.75;
    s.bump = 0.18;
    s.bfreq = 40.0;
  } else if (id == 6u) {
    // ---- jellybean jelly --------------------------------------------------
    let sp = cellF1(wp * 85.0);
    let body = fbm3(wp * 3.2, 2);
    var c = mix(baseA, vec3f(1.0), 0.10 + 0.10 * body);
    c = c * (0.92 + 0.16 * sp.y);
    c = c * (0.86 + 0.14 * sat(n.y * 0.5 + 0.6));
    s.albedo = c * ao;
    s.rough = 0.085;
    s.coat = 1.0;
    s.sss = 1.0;
    s.sparkle = 0.55;
    s.bump = 0.3;
    s.bfreq = 60.0;
  } else if (id == 7u) {
    // ---- marshmallow ------------------------------------------------------
    let poreN = fbm3(wp * 4.2, 3);
    var c = mix(vec3f(0.995, 0.985, 0.965), vec3f(1.0, 0.94, 0.91), 0.45 + 0.55 * poreN);
    c = c * (0.95 + 0.06 * cellF1(wp * 24.0).y);
    let icingDust = sat(fbm3(wp * 9.0, 2) - 0.55) * 1.6;
    c = mix(c, vec3f(1.0), icingDust * 0.5);
    s.albedo = c * ao;
    s.rough = 0.60 - 0.1 * icingDust;
    s.sss = 1.0;
    s.sparkle = 0.45 + icingDust * 0.5;
    s.bump = 1.6;
    s.bfreq = 20.0;
  } else if (id == 8u) {
    // ---- gumdrop (sugar coated) -------------------------------------------
    let sp = cellF1(wp * 30.0);
    let sp2 = cellF1(wp * 90.0);
    var c = baseA * (0.82 + 0.32 * sp.y);
    c = mix(c, vec3f(1.0, 0.99, 0.98), sat((0.16 - sp2.x) * 5.0) * 0.55);
    s.albedo = c * ao;
    s.rough = 0.20 + 0.08 * sp2.y;
    s.coat = 1.0;
    s.sss = 0.6;
    s.sparkle = 1.0;
    s.bump = 0.8;
    s.bfreq = 34.0;
  } else if (id == 9u) {
    // ---- peppermint swirl -------------------------------------------------
    let p = uv;
    let r = length(p);
    let ang = atan2(p.y, p.x);
    let sw = sin(ang * 5.0 - r * 21.0);
    var c = mix(vec3f(1.0, 0.985, 0.985), baseA, smoothstep(-0.12, 0.12, sw));
    c = mix(c, vec3f(1.0), sat(smoothstep(0.87, 0.93, r)) * 0.9);
    c = mix(c, baseB, sat(smoothstep(0.55, 0.87, r)) * 0.25 * smoothstep(-0.1, 0.1, sw));
    c = c * (0.96 + 0.06 * cellF1(wp * 60.0).y);
    s.albedo = c * ao;
    s.rough = 0.09;
    s.coat = 1.0;
    s.sss = 0.25;
    s.sparkle = 0.7;
    s.bump = 0.25;
    s.bfreq = 45.0;
  } else if (id == 10u) {
    // ---- sugar glass (windows + lamp glass) -------------------------------
    var c = mix(vec3f(0.62, 0.84, 1.0), baseA, 0.55);
    c = c * (0.75 + 0.25 * fbm3(wp * 3.0, 2));
    s.albedo = c * ao * 0.34;
    s.rough = 0.04;
    s.coat = 1.0;
    s.sss = 0.5;
    s.sparkle = 0.25;
    let flick = 0.86 + 0.14 * sin(t * 2.6 + wp.x * 4.1 + wp.z * 2.7) * sin(t * 1.1 + wp.y * 2.0);
    s.emis = vec3f(1.0, 0.58, 0.24) * O.m0.z * (0.05 + night * 1.45) * flick;
  } else if (id == 11u) {
    // ---- licorice ---------------------------------------------------------
    var c = baseA * (0.85 + 0.30 * fbm3(wp * 9.0, 2));
    s.albedo = c * ao;
    s.rough = 0.28;
    s.coat = 0.75;
    s.sparkle = 0.2;
    s.bump = 0.7;
    s.bfreq = 40.0;
  } else if (id == 12u) {
    // ---- sprinkles --------------------------------------------------------
    var c = baseA * (0.9 + 0.2 * cellF1(wp * 90.0).y);
    let band = 0.5 + 0.5 * sin(uv.y * 26.0 + hue * 6.28);
    c = mix(c, vec3f(1.0), sat((band - 0.7) * 3.0) * 0.65);
    s.albedo = c * ao;
    s.rough = 0.17;
    s.coat = 1.0;
    s.sparkle = 0.8;
  } else if (id == 13u) {
    // ---- flowing chocolate river -----------------------------------------
    let flow = vec3f(wp.x * 0.62 - t * 0.55, wp.y * 3.0, wp.z * 1.5 + t * 0.12);
    let n1 = fbm3(flow, 3);
    let n2 = fbm3(flow * 2.4 + vec3f(7.0, 3.0, 1.0), 2);
    var c = mix(baseA, baseB, sat(n1 * 1.5 - 0.12));
    c = mix(c, vec3f(0.90, 0.72, 0.56), sat((n2 - 0.58) * 2.6) * 0.65);
    c = mix(c, vec3f(0.26, 0.13, 0.08), sat((0.40 - n1) * 2.4) * 0.5);
    s.albedo = c * ao;
    s.rough = 0.055;
    s.coat = 1.0;
    s.sss = 0.10;
    s.sparkle = 0.18;
    s.bump = 1.3;
    s.bfreq = 5.0;
  } else {
    // ---- chocolate-chip / default ----------------------------------------
    s.albedo = baseA * ao;
    s.rough = O.m0.y;
    s.sss = 0.2;
  }

  // Emissive boost (lamp glass, windows) — dim by day, warm by night.
  if (O.m0.z > 0.0 && id != 10u) {
    let flick = 0.9 + 0.1 * sin(t * 3.1 + wp.x * 2.3 + wp.z * 1.7);
    s.emis = s.emis + s.albedo * O.m0.z * (0.12 + night * 1.55) * flick;
  }
  return s;
}

// Micro surface bump from the gradient of a noise field (no tangents needed).
fn perturbNormal(n: vec3f, wp: vec3f, freq: f32, amp: f32) -> vec3f {
  let p = wp * freq;
  let h0 = vnoise(p);
  let hx = vnoise(p + vec3f(1.0, 0.0, 0.0));
  let hy = vnoise(p + vec3f(0.0, 1.0, 0.0));
  let hz = vnoise(p + vec3f(0.0, 0.0, 1.0));
  var g = vec3f(hx - h0, hy - h0, hz - h0);
  g = g - n * dot(g, n);
  return normalize(n - g * amp * 2.2);
}

// ----------------------------------------------------------------- shadows --
fn shadowAt(wp: vec3f, n: vec3f) -> f32 {
  let lp = G.lightVP * vec4f(wp + n * 0.05, 1.0);
  let ndc = lp.xyz / max(lp.w, 0.0001);
  let uv = vec2f(ndc.x * 0.5 + 0.5, 0.5 - ndc.y * 0.5);
  if (uv.x < 0.002 || uv.x > 0.998 || uv.y < 0.002 || uv.y > 0.998 || ndc.z > 0.999) {
    return 1.0;
  }
  let texel = G.p1.y;
  var sum = 0.0;
  for (var y = -1; y <= 1; y = y + 1) {
    for (var x = -1; x <= 1; x = x + 1) {
      let o = vec2f(f32(x), f32(y)) * texel;
      sum = sum + textureSampleCompareLevel(shadowMap, shadowSamp, uv + o, ndc.z - 0.0016);
    }
  }
  return sum / 9.0;
}

// ----------------------------------------------------------------- lighting --
fn lightSurface(s: Surf, nIn: vec3f, wp: vec3f, shadow: f32) -> vec3f {
  let n = normalize(nIn);
  let V = normalize(G.camPos.xyz - wp);
  let L = normalize(G.sunDir.xyz);
  let H = normalize(L + V);
  let sunI = G.sunDir.w;
  let t = G.p0.x;

  let NdL = dot(n, L);
  let wrap = sat((NdL + s.sss * 0.65) / (1.0 + s.sss * 0.65));
  let NdV = sat(dot(n, V));
  let NdH = sat(dot(n, H));
  let fres = pow(1.0 - NdV, 5.0);

  // Sun diffuse.
  var col = s.albedo * G.sunColor.rgb * sunI * wrap * shadow;

  // Sun specular — shiny candy.
  let shin = mix(8.0, 380.0, 1.0 - s.rough);
  let specD = pow(NdH, shin) * (shin + 8.0) * 0.013;
  col = col + G.sunColor.rgb * sunI * specD * (0.35 + 0.65 * s.coat) * shadow;
  // Hard clearcoat highlight.
  col = col + G.sunColor.rgb * sunI * pow(NdH, 1400.0) * s.coat * 5.0 * shadow;

  // Sky ambient with a hemispheric gradient.
  let skyAmb = mix(G.skyGround.rgb, G.skyTop.rgb, sat(n.y * 0.5 + 0.5));
  col = col + s.albedo * skyAmb * (0.75 + 0.55 * sat(n.y)) * 0.55;
  // Ambient sheen for wet / glossy surfaces.
  col = col + skyAmb * fres * (0.10 + 0.30 * s.coat);

  // Cheap environment reflection: glossy candy picks up the sky.
  if (s.coat > 0.05 || s.rough < 0.35) {
    let Rv = reflect(-V, n);
    let env = skyFog(Rv);
    let envAmt = (1.0 - s.rough) * (0.18 + 0.82 * s.coat) * (0.16 + 0.84 * fres);
    col = col + env * envAmt * 0.16;
  }

  // Cheap translucency: light bleeding through jelly & icing.
  let back = sat(dot(V, -L) * 0.5 + 0.5);
  col = col + s.albedo * G.sunColor.rgb * sunI * s.sss * pow(back, 3.0) * 0.30;

  // Twinkling sugar crystals.
  if (s.sparkle > 0.001) {
    let cell = cellF1(wp * 52.0);
    let tw = pow(sat(sin(t * 2.1 + cell.y * 47.0 + wp.y * 3.0)), 16.0);
    let glint = tw * (pow(NdH, 90.0) * 2.6 + 0.05) + tw * fres * 0.35;
    col = col + s.sparkle * glint * (G.sunColor.rgb * sunI * shadow + skyAmb * 0.6) * 2.4;
  }

  return col + s.emis;
}

// ============================================================ main pipeline ==
struct VSOut {
  @builtin(position) clip : vec4f,
  @location(0) wp   : vec3f,
  @location(1) nrm  : vec3f,
  @location(2) uv   : vec2f,
  @location(3) ext  : vec2f,
  @location(4) tint : vec4f,
  @location(5) hue  : f32,
};

@vertex
fn vsMain(
  @location(0) pos : vec3f,
  @location(1) nrm : vec3f,
  @location(2) uv  : vec2f,
  @location(3) ext : vec2f,
  @builtin(instance_index) iid : u32,
) -> VSOut {
  var out: VSOut;
  var wpos = pos;
  var wnrm = nrm;
  var tint = vec4f(1.0, 1.0, 1.0, 1.0);
  var hue = 0.0;

  if (O.m0.w > 0.5) {
    let b = iid * 4u;
    let A = insts[b + 0u];  // xyz position
    let B = insts[b + 1u];  // xyz scale, w hue
    let C = insts[b + 2u];  // quaternion
    let D = insts[b + 3u];  // rgba tint
    let R = quatToMat3(C);
    wpos = A.xyz + R * (pos * B.xyz);
    // Correct normal for non-uniform scale: n' = R * (n / s)
    wnrm = normalize(R * (nrm / max(B.xyz, vec3f(0.0001))));
    tint = D;
    hue = B.w;
  } else {
    let m = O.model;
    wpos = (m * vec4f(pos, 1.0)).xyz;
    wnrm = normalize((m * vec4f(nrm, 0.0)).xyz);
  }

  out.clip = G.viewProj * vec4f(wpos, 1.0);
  out.wp = wpos;
  out.nrm = wnrm;
  out.uv = uv;
  out.ext = ext;
  out.tint = tint;
  out.hue = hue;
  return out;
}

@fragment
fn fsMain(in: VSOut) -> @location(0) vec4f {
  let id = u32(O.m0.x + 0.5);
  var n = normalize(in.nrm);
  let V = normalize(G.camPos.xyz - in.wp);
  if (dot(n, V) < 0.0) {
    n = -n; // two sided lighting for thin candy shapes
  }

  let s = material(in.wp, n, in.uv, in.ext, in.tint, in.hue);
  let nb = perturbNormal(n, in.wp, s.bfreq, s.bump);
  let shadow = shadowAt(in.wp, n);
  var col = lightSurface(s, nb, in.wp, shadow);

  // Soft contact occlusion so objects sit on the ground.
  if (id != 0u && id != 13u && id != 9u) {
    let contact = mix(0.62, 1.0, smoothstep(-0.3, 2.2, in.wp.y));
    col = col * contact;
  }

  // Aerial perspective toward the sky.
  let toFrag = in.wp - G.camPos.xyz;
  let dist = length(toFrag);
  let fogAmt = sat(1.0 - exp(-dist * G.p0.z));
  let fogCol = skyFog(toFrag / max(dist, 0.001));
  col = mix(col, fogCol, fogAmt * 0.92);

  return vec4f(col, 1.0);
}

// ------------------------------------------------------------ shadow pass --
@vertex
fn vsShadow(
  @location(0) pos : vec3f,
  @builtin(instance_index) iid : u32,
) -> @builtin(position) vec4f {
  var wpos = pos;
  if (O.m0.w > 0.5) {
    let b = iid * 4u;
    let A = insts[b + 0u];
    let B = insts[b + 1u];
    let C = insts[b + 2u];
    let R = quatToMat3(C);
    wpos = A.xyz + R * (pos * B.xyz);
  } else {
    wpos = (O.model * vec4f(pos, 1.0)).xyz;
  }
  return G.lightVP * vec4f(wpos, 1.0);
}

// ---------------------------------------------------------------- sky pass --
struct SkyOut {
  @builtin(position) pos : vec4f,
  @location(0) uv : vec2f,
};

@vertex
fn vsSky(@builtin(vertex_index) vi : u32) -> SkyOut {
  var out: SkyOut;
  let x = f32((vi << 1u) & 2u) * 2.0 - 1.0;
  let y = f32(vi & 2u) * 2.0 - 1.0;
  out.pos = vec4f(x, y, 0.0, 1.0);
  out.uv = vec2f(x * 0.5 + 0.5, 0.5 - y * 0.5);
  return out;
}

@fragment
fn fsSky(in: SkyOut) -> @location(0) vec4f {
  let ndc = vec2f(in.uv.x * 2.0 - 1.0, 1.0 - in.uv.y * 2.0);
  let nearP = G.invViewProj * vec4f(ndc, 0.0, 1.0);
  let farP = G.invViewProj * vec4f(ndc, 1.0, 1.0);
  let dir = normalize(farP.xyz / farP.w - nearP.xyz / nearP.w);
  return vec4f(skyColor(dir), 1.0);
}

// --------------------------------------------------------------- snow pass --
struct SnowOut {
  @builtin(position) pos : vec4f,
  @location(0) uv : vec2f,
  @location(1) shade : f32,
};

@vertex
fn vsSnow(@builtin(vertex_index) vi : u32, @builtin(instance_index) ii : u32) -> SnowOut {
  var out: SnowOut;
  var corners = array<vec2f, 6>(
    vec2f(0.0, 0.0), vec2f(1.0, 0.0), vec2f(1.0, 1.0),
    vec2f(0.0, 0.0), vec2f(1.0, 1.0), vec2f(0.0, 1.0),
  );
  let c = corners[vi];

  let fi = f32(ii);
  let h1 = hash33(vec3f(fi * 0.7317, fi * 1.3371 + 7.0, 3.0));
  let h2 = hash33(vec3f(fi * 2.1179 + 3.0, fi * 0.5231, 11.0));

  let span = 74.0;
  let height = 30.0;
  let speed = 0.55 + h2.x * 1.35;
  let swayX = sin(G.p0.x * (0.5 + h1.y) + h2.z * 6.28) * 1.4;
  let swayZ = cos(G.p0.x * (0.4 + h1.x) + h1.z * 6.28) * 1.1;

  let x = (h1.x - 0.5) * span + swayX;
  let z = (h1.z - 0.5) * span + swayZ + 4.0;
  let y = height - fract((h2.y * height + G.p0.x * speed * 2.2) / height) * height;

  let size = 0.055 + h2.y * 0.075;
  let base = vec3f(x, y, z);
  let world = base + (G.camRight.xyz * (c.x - 0.5) + G.camUp.xyz * (c.y - 0.5)) * size;

  let clip = G.viewProj * vec4f(world, 1.0);
  out.pos = clip;
  out.uv = c;
  // fade out near the ground and far from the camera
  let distFade = sat(1.0 - (length(base - G.camPos.xyz) - 40.0) / 55.0);
  out.shade = sat(y / 3.0) * distFade;
  return out;
}

@fragment
fn fsSnow(in: SnowOut) -> @location(0) vec4f {
  let d = length(in.uv - vec2f(0.5, 0.5)) * 2.0;
  let alpha = sat(1.0 - d) * sat(1.0 - d) * G.p0.w * in.shade;
  if (alpha < 0.004) {
    discard;
  }
  let lit = 0.55 + 0.45 * sat(dot(normalize(G.sunDir.xyz), vec3f(0.0, 1.0, 0.0)));
  let col = mix(vec3f(0.82, 0.88, 1.0), vec3f(1.0), 0.5) * (0.55 + 0.75 * G.sunDir.w) * lit;
  return vec4f(col, alpha * 0.85);
}

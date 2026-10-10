// ReliefSolver — the heightfield compute graph.
//
// Fields live in storage buffers of f32 rather than storage textures: every format question
// disappears, read-write in a single dispatch is legal, and WebGPU inserts the barriers between
// dispatches inside one compute pass, so a whole erosion iteration encodes as four dispatches with
// no manual synchronisation.
//
// Units. Height is normalised 0..1 across the buffer. Inside the erosion kernels everything is
// converted to CELL units — one grid cell is one unit in x and z — so a gradient of 1.0 is a 45°
// slope and the published pipe-model constants apply unchanged. `Vert` carries that conversion.

import { LayerStride, PackTerrainLayer, TerrainKinds } from "./HeightSpecification.js";

export const MaxLayers = 32;

// Ordinals must match Object.keys(TerrainKinds). CheckSpecification.mjs asserts it.
const Kernel = /* wgsl */ `
struct FrameUniform {
  Size        : u32,
  Flags       : u32,
  Pad0        : u32,
  Pad1        : u32,
  WorldSize   : f32,
  HeightScale : f32,
  Time        : f32,
  Delta       : f32,
};

struct LayerUniform {
  Kind      : u32,
  Blend     : u32,
  Seed      : u32,
  Flags     : u32,
  Opacity   : f32,
  MaskLow   : f32,
  MaskHigh  : f32,
  MaskFall  : f32,
  WorldSize : f32,
  Vertical  : f32,
  Extent    : f32,
  Reserved  : f32,
  P         : array<vec4f, 6>,
};

@group(0) @binding(0) var<uniform> Frame : FrameUniform;
@group(0) @binding(1) var<storage, read_write> Height   : array<f32>;
@group(0) @binding(2) var<storage, read_write> Scratch  : array<f32>;
@group(0) @binding(3) var<storage, read_write> Water    : array<f32>;
@group(0) @binding(4) var<storage, read_write> Sediment : array<f32>;
@group(0) @binding(5) var<storage, read_write> Flux     : array<vec4f>;
@group(0) @binding(6) var<storage, read_write> Velocity : array<vec2f>;
@group(0) @binding(7) var<storage, read_write> Accum    : array<vec4f>;
@group(0) @binding(8) var<storage, read_write> Relay    : array<f32>;

@group(1) @binding(0) var<uniform> Layer : LayerUniform;

const KindNoise     : u32 = 0u;
const KindMountain  : u32 = 1u;
const KindCellular  : u32 = 2u;
const KindDunes     : u32 = 3u;
const KindCrater    : u32 = 4u;
const KindTilt      : u32 = 5u;
const KindHydraulic : u32 = 6u;
const KindThermal   : u32 = 7u;
const KindTerrace   : u32 = 8u;
const KindWarp      : u32 = 9u;
const KindBlur      : u32 = 10u;
const KindCurve     : u32 = 11u;

const Tau : f32 = 6.28318530717958647;

fn Par(I : u32) -> f32 { return Layer.P[I / 4u][I % 4u]; }

fn Span() -> i32 { return i32(Frame.Size); }

fn Spot(X : i32, Y : i32) -> u32 {
  let S = Span();
  return u32(clamp(Y, 0, S - 1) * S + clamp(X, 0, S - 1));
}

fn Raised(X : i32, Y : i32) -> f32 { return Height[Spot(X, Y)]; }

fn Sampled(P : vec2f) -> f32 {
  let B = floor(P);
  let F = P - B;
  let X = i32(B.x);
  let Y = i32(B.y);
  let A0 = mix(Raised(X, Y), Raised(X + 1, Y), F.x);
  let A1 = mix(Raised(X, Y + 1), Raised(X + 1, Y + 1), F.x);
  return mix(A0, A1, F.y);
}

fn Neighbour(K : i32) -> vec2i {
  switch (K) {
    case 0:  { return vec2i( 1,  0); }
    case 1:  { return vec2i(-1,  0); }
    case 2:  { return vec2i( 0,  1); }
    case 3:  { return vec2i( 0, -1); }
    case 4:  { return vec2i( 1,  1); }
    case 5:  { return vec2i(-1,  1); }
    case 6:  { return vec2i( 1, -1); }
    default: { return vec2i(-1, -1); }
  }
}

// ── Hashing and gradient noise ────────────────────────────────────────────────────────────────────

fn Churn(A : u32) -> u32 {
  var X = A;
  X = X ^ (X >> 16u);
  X = X * 0x7feb352du;
  X = X ^ (X >> 15u);
  X = X * 0x846ca68bu;
  X = X ^ (X >> 16u);
  return X;
}

fn Churn2(P : vec2i, Seed : u32) -> u32 {
  return Churn(u32(P.x) * 73856093u ^ u32(P.y) * 19349663u ^ (Seed * 83492791u + 2654435761u));
}

fn Unit(A : u32) -> f32 { return f32(A & 0x00ffffffu) / 16777216.0; }

fn Slope2(P : vec2i, Seed : u32) -> vec2f {
  let A = Unit(Churn2(P, Seed)) * Tau;
  return vec2f(cos(A), sin(A));
}

// Gradient noise returning value and analytic derivative, after Quilez. The derivative is what the
// generators use to damp detail on ground that is already steep, which is the difference between
// fractal noise and something that looks like rock.
fn Grain(Pos : vec2f, Seed : u32) -> vec3f {
  let I  = floor(Pos);
  let F  = Pos - I;
  let U  = F * F * F * (F * (F * 6.0 - 15.0) + 10.0);
  let Du = 30.0 * F * F * (F * (F - 2.0) + 1.0);
  let Ii = vec2i(I);

  let Ga = Slope2(Ii + vec2i(0, 0), Seed);
  let Gb = Slope2(Ii + vec2i(1, 0), Seed);
  let Gc = Slope2(Ii + vec2i(0, 1), Seed);
  let Gd = Slope2(Ii + vec2i(1, 1), Seed);

  let Va = dot(Ga, F - vec2f(0.0, 0.0));
  let Vb = dot(Gb, F - vec2f(1.0, 0.0));
  let Vc = dot(Gc, F - vec2f(0.0, 1.0));
  let Vd = dot(Gd, F - vec2f(1.0, 1.0));

  let K0 = Va;
  let K1 = Vb - Va;
  let K2 = Vc - Va;
  let K3 = Va - Vb - Vc + Vd;

  let Value = K0 + K1 * U.x + K2 * U.y + K3 * U.x * U.y;
  let Deriv = Ga + U.x * (Gb - Ga) + U.y * (Gc - Ga) + U.x * U.y * (Ga - Gb - Gc + Gd)
            + Du * vec2f(K1 + K3 * U.y, K2 + K3 * U.x);
  return vec3f(Value, Deriv.x, Deriv.y);
}

fn Turn(A : f32) -> mat2x2f {
  let C = cos(A);
  let S = sin(A);
  return mat2x2f(C, S, -S, C);
}

// Style: 0 smooth, 1 ridged, 2 billow, 3 hybrid multifractal.
fn Fractal(Pos : vec2f, Octaves : i32, Lacunarity : f32, Gain : f32,
           Style : i32, Damping : f32, Rotation : f32, Seed : u32) -> f32 {
  let M = Turn(Rotation);
  var P = Pos;
  var Amplitude = 1.0;
  var Total = 0.0;
  var Scale = 0.0;
  var Slope = vec2f(0.0);
  var Weight = 1.0;

  for (var O = 0; O < Octaves; O = O + 1) {
    let N = Grain(P, Seed + u32(O) * 131u);
    var V = N.x;
    if (Style == 1) {
      V = 1.0 - abs(V);
      V = V * V;
    } else if (Style == 2) {
      V = abs(V) * 2.0 - 1.0;
    } else if (Style == 3) {
      let R = 1.0 - abs(V);
      V = R * R * Weight;
      Weight = clamp(R * R * 1.9, 0.0, 1.0);
    }
    Slope = Slope + N.yz * Amplitude;
    let Settle = 1.0 / (1.0 + Damping * dot(Slope, Slope));
    Total = Total + Amplitude * V * Settle;
    Scale = Scale + Amplitude;
    Amplitude = Amplitude * Gain;
    P = M * P * Lacunarity;
  }

  var Out = Total / max(Scale, 1e-5);
  if (Style == 0 || Style == 2) { Out = Out * 0.5 + 0.5; }
  return clamp(Out, 0.0, 1.0);
}

// F1, F2 and a per-cell hash.
fn Cells(Pos : vec2f, Jitter : f32, Seed : u32) -> vec3f {
  let I = floor(Pos);
  var First  = 8.0;
  var Second = 8.0;
  var Tag    = 0.0;
  for (var Y = -1; Y <= 1; Y = Y + 1) {
    for (var X = -1; X <= 1; X = X + 1) {
      let G = vec2i(I) + vec2i(X, Y);
      let H = Churn2(G, Seed);
      let O = vec2f(Unit(H), Unit(Churn(H + 1u))) - 0.5;
      let C = vec2f(G) + 0.5 + O * Jitter;
      let D = distance(Pos, C);
      if (D < First) {
        Second = First;
        First  = D;
        Tag    = Unit(Churn(H + 7u));
      } else if (D < Second) {
        Second = D;
      }
    }
  }
  return vec3f(First, Second, Tag);
}

fn WarpOffset(Pos : vec2f, Amount : f32, Seed : u32) -> vec2f {
  if (Amount <= 0.0) { return Pos; }
  let A = Grain(Pos * 0.5 + vec2f(13.1, 7.7), Seed + 991u).x;
  let B = Grain(Pos * 0.5 + vec2f(-5.3, 2.9), Seed + 4231u).x;
  return Pos + vec2f(A, B) * Amount;
}

// ── Generators ────────────────────────────────────────────────────────────────────────────────────
// Co-ordinates arrive in metres so that feature sizes in the inspector mean what they say.

fn FieldNoise(World : vec2f, Seed : u32) -> f32 {
  let Scale  = max(1.0, Par(0u));                              // slot 0  Scale
  let Count  = i32(round(Par(1u)));                            // slot 1  Octaves
  let Lac    = Par(2u);                                        // slot 2  Lacunarity
  let Gain   = Par(3u);                                        // slot 3  Gain
  let Style  = i32(round(Par(4u)));                            // slot 4  Style
  let Warp   = Par(5u);                                        // slot 5  Warp
  let WScale = max(0.05, Par(6u));                             // slot 6  WarpScale
  let Damp   = Par(7u);                                        // slot 7  Erosive
  let Amp    = Par(8u);                                        // slot 8  Height
  let Off    = vec2f(Par(9u), Par(10u));                       // slots 9,10 OffsetX/Y
  let Spin   = radians(Par(11u));                              // slot 11 Rotation

  var P = (World + Off) / Scale;
  P = WarpOffset(P / WScale, Warp, Seed) * WScale;
  return Fractal(P, Count, Lac, Gain, Style, Damp, Spin, Seed) * Amp;
}

fn FieldMountain(World : vec2f, Seed : u32) -> f32 {
  let Scale  = max(1.0, Par(0u));                              // slot 0  Scale
  let Count  = i32(round(Par(1u)));                            // slot 1  Peaks
  let Sharp  = Par(2u);                                        // slot 2  Sharpness
  let Rough  = Par(3u);                                        // slot 3  Roughness
  let Amp    = Par(4u);                                        // slot 4  Height
  let Warp   = Par(5u);                                        // slot 5  Warp
  let Strata = Par(6u);                                        // slot 6  Stratify
  let Damp   = Par(7u);                                        // slot 7  SlopeDamp
  let Off    = vec2f(Par(8u), Par(9u));                        // slots 8,9 OffsetX/Y

  var P = (World + Off) / Scale;
  P = WarpOffset(P, Warp, Seed + 17u);

  // Ridged multifractal with weight feedback: an octave only contributes where the one above it
  // was already high, which is what joins peaks into ranges instead of scattering them.
  let M = Turn(0.517);
  var Amplitude = 1.0;
  var Total = 0.0;
  var Scaling = 0.0;
  var Weight = 1.0;
  var Slope = vec2f(0.0);
  var Q = P;
  for (var O = 0; O < Count; O = O + 1) {
    let N = Grain(Q, Seed + u32(O) * 311u);
    var R = 1.0 - abs(N.x);
    R = pow(clamp(R, 0.0, 1.0), max(0.2, Sharp));
    R = R * Weight;
    Weight = clamp(R * 2.0, 0.0, 1.0);
    Slope = Slope + N.yz * Amplitude;
    let Settle = 1.0 / (1.0 + Damp * dot(Slope, Slope));
    Total = Total + Amplitude * R * Settle;
    Scaling = Scaling + Amplitude;
    Amplitude = Amplitude * Rough;
    Q = M * Q * 2.07;
  }
  var H = clamp(Total / max(Scaling, 1e-5), 0.0, 1.0);

  if (Strata > 0.0) {
    let Beds = 11.0;
    let Step = fract(H * Beds);
    H = H + (Step * Step * (3.0 - 2.0 * Step) - Step) * Strata / Beds;
  }
  return clamp(H, 0.0, 1.0) * Amp;
}

fn FieldCellular(World : vec2f, Seed : u32) -> f32 {
  let Scale = max(1.0, Par(0u));                               // slot 0  Scale
  let Jit   = Par(1u);                                         // slot 1  Jitter
  let Style = i32(round(Par(2u)));                             // slot 2  Style
  let Amp   = Par(3u);                                         // slot 3  Height
  let Steps = max(1.0, round(Par(4u)));                        // slot 4  Steps
  let Warp  = Par(5u);                                         // slot 5  Warp
  let Off   = vec2f(Par(6u), Par(7u));                         // slots 6,7 OffsetX/Y

  var P = (World + Off) / Scale;
  P = WarpOffset(P, Warp, Seed + 53u);
  let C = Cells(P, Jit, Seed);

  var V = 0.0;
  if (Style == 0) {
    V = clamp(C.x, 0.0, 1.0);
  } else if (Style == 1) {
    V = clamp(1.0 - (C.y - C.x) * 1.6, 0.0, 1.0);
  } else if (Style == 2) {
    V = floor(C.z * Steps) / max(1.0, Steps - 1.0);
    V = V - clamp(1.0 - (C.y - C.x) * 2.4, 0.0, 1.0) * 0.12;
  } else {
    V = clamp(pow(C.y - C.x, 0.45), 0.0, 1.0);
  }
  return clamp(V, 0.0, 1.0) * Amp;
}

fn FieldDunes(World : vec2f, Seed : u32) -> f32 {
  let Wave  = max(5.0, Par(0u));                               // slot 0  Wavelength
  let Dir   = radians(Par(1u));                                // slot 1  Direction
  let Sharp = Par(2u);                                         // slot 2  Sharpness
  let Amp   = Par(3u);                                         // slot 3  Height
  let Drift = Par(4u);                                         // slot 4  Drift
  let Vary  = Par(5u);                                         // slot 5  Variation

  let Along = vec2f(cos(Dir), sin(Dir));
  let Cross = vec2f(-Along.y, Along.x);
  let Wander = Grain(World / (Wave * 9.0), Seed + 77u).x * Drift * Wave * 3.0
             + Grain(World / (Wave * 31.0), Seed + 78u).x * Drift * Wave * 9.0;
  let Phase = (dot(World, Along) + Wander) / Wave;

  // Asymmetric crest: a gentle windward ramp, then a short steep slip face.
  let T = fract(Phase);
  let Lee = clamp(Sharp, 0.0, 0.95);
  let Break = 1.0 - Lee * 0.72;
  var Profile = 0.0;
  if (T < Break) {
    let U = T / Break;
    Profile = U * U * (3.0 - 2.0 * U);
  } else {
    let U = (T - Break) / max(1e-4, 1.0 - Break);
    Profile = 1.0 - U * U;
  }
  let Ribbon = 0.65 + 0.35 * Grain(vec2f(dot(World, Cross) / (Wave * 6.0), 0.37), Seed + 9u).x;
  let Patch = mix(1.0, clamp(Grain(World / (Wave * 17.0), Seed + 12u).x * 1.4 + 0.6, 0.0, 1.0), Vary);
  return clamp(Profile * Ribbon * Patch, 0.0, 1.0) * Amp;
}

fn FieldCrater(World : vec2f, Seed : u32) -> f32 {
  let Space = max(10.0, Par(0u));                              // slot 0  Spacing
  let Rad   = Par(1u);                                         // slot 1  Radius
  let Deep  = Par(2u);                                         // slot 2  Depth
  let Rim   = Par(3u);                                         // slot 3  Rim
  let Amp   = Par(4u);                                         // slot 4  Height
  let Dense = Par(5u);                                         // slot 5  Density

  let P = World / Space;
  let I = vec2i(floor(P));
  var Sum = 0.0;
  for (var Y = -1; Y <= 1; Y = Y + 1) {
    for (var X = -1; X <= 1; X = X + 1) {
      let G = I + vec2i(X, Y);
      let H = Churn2(G, Seed + 404u);
      if (Unit(H) > Dense) { continue; }
      let O = vec2f(Unit(Churn(H + 3u)), Unit(Churn(H + 5u)));
      let Centre = vec2f(G) + O;
      let Size = Rad * (0.55 + 0.9 * Unit(Churn(H + 11u)));
      let D = distance(P, Centre) / max(1e-4, Size);
      if (D > 2.2) { continue; }
      // Bowl, rim, ejecta blanket.
      let Bowl = -Deep * (1.0 - smoothstep(0.0, 1.0, D)) * (1.0 - D * D * 0.25);
      let Ridge = Rim * exp(-pow((D - 1.0) * 3.4, 2.0));
      let Skirt = Rim * 0.35 * exp(-pow((D - 1.35) * 1.3, 2.0)) * (0.6 + 0.4 * Grain(P * 7.0, Seed).x);
      Sum = Sum + Bowl + Ridge + Skirt;
    }
  }
  return Sum * Amp;
}

fn FieldTilt(World : vec2f) -> f32 {
  let Dir    = radians(Par(0u));                               // slot 0  Direction
  let Rise   = Par(1u);                                        // slot 1  Rise
  let Curve  = max(0.05, Par(2u));                             // slot 2  Curve
  let Centre = Par(3u);                                        // slot 3  Centre

  let Along = vec2f(cos(Dir), sin(Dir));
  let Extent = max(1.0, Layer.WorldSize);
  let T = clamp(dot(World, Along) / Extent + 0.5, 0.0, 1.0);
  let Shifted = clamp((T - Centre) / max(1e-3, 1.0 - Centre) * 0.5 + 0.5, 0.0, 1.0);
  return pow(Shifted, Curve) * Rise;
}

// ── Masks ─────────────────────────────────────────────────────────────────────────────────────────

fn Steepness(X : i32, Y : i32) -> f32 {
  let Cell = Layer.WorldSize / max(1.0, Layer.Extent);
  let Dx = (Raised(X + 1, Y) - Raised(X - 1, Y)) * Layer.Vertical / (2.0 * Cell);
  let Dy = (Raised(X, Y + 1) - Raised(X, Y - 1)) * Layer.Vertical / (2.0 * Cell);
  return clamp(length(vec2f(Dx, Dy)) / 3.0, 0.0, 1.0);
}

fn Bulge(X : i32, Y : i32) -> f32 {
  let C = Raised(X, Y);
  let L = (Raised(X - 1, Y) + Raised(X + 1, Y) + Raised(X, Y - 1) + Raised(X, Y + 1)) * 0.25;
  return clamp((C - L) * 220.0, -1.0, 1.0);
}

fn Coverage(I : u32, X : i32, Y : i32) -> f32 {
  let Source = (Layer.Flags >> 1u) & 7u;
  if (Source == 0u) { return 1.0; }
  var V = 0.0;
  if (Source == 1u)      { V = Height[I]; }
  else if (Source == 2u) { V = Steepness(X, Y); }
  else if (Source == 3u) { V = Accum[I].x; }
  else if (Source == 4u) { V = Accum[I].y; }
  else                   { V = Bulge(X, Y) * 0.5 + 0.5; }

  let F = max(1e-4, Layer.MaskFall);
  var W = smoothstep(Layer.MaskLow - F, Layer.MaskLow + F, V)
        * (1.0 - smoothstep(Layer.MaskHigh - F, Layer.MaskHigh + F, V));
  if ((Layer.Flags & 1u) != 0u) { W = 1.0 - W; }
  return clamp(W, 0.0, 1.0);
}

fn Mixed(Under : f32, Over : f32, Mode : u32) -> f32 {
  switch (Mode) {
    case 0u:  { return Over; }
    case 1u:  { return Under + Over; }
    case 2u:  { return Under - Over; }
    case 3u:  { return Under * Over; }
    case 4u:  { return 1.0 - (1.0 - Under) * (1.0 - Over); }
    case 5u:  {
      if (Under < 0.5) { return 2.0 * Under * Over; }
      return 1.0 - 2.0 * (1.0 - Under) * (1.0 - Over);
    }
    case 6u:  { return max(Under, Over); }
    case 7u:  { return min(Under, Over); }
    default:  { return abs(Under - Over); }
  }
}

// ── Entry points ──────────────────────────────────────────────────────────────────────────────────

@compute @workgroup_size(8, 8)
fn ClearMain(@builtin(global_invocation_id) G : vec3u) {
  let S = u32(Span());
  if (G.x >= S || G.y >= S) { return; }
  let I = G.y * S + G.x;
  Height[I]   = 0.0;
  Scratch[I]  = 0.0;
  Relay[I]    = 0.0;
  Water[I]    = 0.0;
  Sediment[I] = 0.0;
  Flux[I]     = vec4f(0.0);
  Velocity[I] = vec2f(0.0);
  Accum[I]    = vec4f(0.0);
}

@compute @workgroup_size(8, 8)
fn GenerateMain(@builtin(global_invocation_id) G : vec3u) {
  let S = u32(Span());
  if (G.x >= S || G.y >= S) { return; }
  let I = G.y * S + G.x;

  let Cell = Layer.WorldSize / Layer.Extent;
  let World = (vec2f(f32(G.x), f32(G.y)) - Layer.Extent * 0.5) * Cell;

  var V = 0.0;
  switch (Layer.Kind) {
    case KindNoise:    { V = FieldNoise(World, Layer.Seed); }
    case KindMountain: { V = FieldMountain(World, Layer.Seed); }
    case KindCellular: { V = FieldCellular(World, Layer.Seed); }
    case KindDunes:    { V = FieldDunes(World, Layer.Seed); }
    case KindCrater:   { V = FieldCrater(World, Layer.Seed); }
    case KindTilt:     { V = FieldTilt(World); }
    default:           { V = 0.0; }
  }
  Scratch[I] = V;
}

@compute @workgroup_size(8, 8)
fn CompositeMain(@builtin(global_invocation_id) G : vec3u) {
  let S = u32(Span());
  if (G.x >= S || G.y >= S) { return; }
  let I = G.y * S + G.x;
  let W = Coverage(I, i32(G.x), i32(G.y)) * Layer.Opacity;
  let Under = Height[I];
  Height[I] = clamp(mix(Under, Mixed(Under, Scratch[I], Layer.Blend), W), 0.0, 1.0);
}

// Non-iterative modifiers read Height and write Scratch; CompositeMain is not used for them because
// they must blend against the original by the mask rather than by a blend mode.
@compute @workgroup_size(8, 8)
fn ModifyMain(@builtin(global_invocation_id) G : vec3u) {
  let S = u32(Span());
  if (G.x >= S || G.y >= S) { return; }
  let I = G.y * S + G.x;
  let H = Height[I];
  var V = H;

  if (Layer.Kind == KindTerrace) {
    let Steps = max(2.0, round(Par(0u)));                      // slot 0  Steps
    let Sharp = clamp(Par(1u), 0.0, 1.0);                      // slot 1  Sharpness
    let Tilt  = clamp(Par(2u), 0.0, 1.0);                      // slot 2  Tilt
    let Vary  = clamp(Par(3u), 0.0, 1.0);                      // slot 3  Variation

    let Cell = Layer.WorldSize / Layer.Extent;
    let World = (vec2f(f32(G.x), f32(G.y)) - Layer.Extent * 0.5) * Cell;
    let Jitter = Grain(World / (Layer.WorldSize * 0.11), Layer.Seed + 61u).x * Vary * 0.5;
    let Scaled = H * Steps + Jitter;
    let Base = floor(Scaled);
    let T = Scaled - Base;
    let Edge = mix(T, smoothstep(0.0, 1.0, pow(T, mix(1.0, 7.0, Sharp))), 0.92);
    V = (Base + mix(Edge, T, Tilt)) / Steps;
  } else if (Layer.Kind == KindCurve) {
    let Contrast = Par(0u);                                    // slot 0  Contrast
    let Gamma    = max(0.05, Par(1u));                         // slot 1  Gamma
    let InLow    = Par(2u);                                    // slot 2  InLow
    let InHigh   = Par(3u);                                    // slot 3  InHigh
    let OutLow   = Par(4u);                                    // slot 4  OutLow
    let OutHigh  = Par(5u);                                    // slot 5  OutHigh
    var T = clamp((H - InLow) / max(1e-4, InHigh - InLow), 0.0, 1.0);
    T = pow(T, Gamma);
    let K = clamp(Contrast, -0.98, 0.98);
    if (K > 0.0) {
      T = mix(T, smoothstep(0.0, 1.0, T), K);
    } else {
      T = mix(T, 0.5 + (T - 0.5) * 0.35, -K);
    }
    V = mix(OutLow, OutHigh, clamp(T, 0.0, 1.0));
  }
  Scratch[I] = clamp(V, 0.0, 1.0);
}

@compute @workgroup_size(8, 8)
fn ResolveModifier(@builtin(global_invocation_id) G : vec3u) {
  let S = u32(Span());
  if (G.x >= S || G.y >= S) { return; }
  let I = G.y * S + G.x;
  let W = Coverage(I, i32(G.x), i32(G.y)) * Layer.Opacity;
  Height[I] = clamp(mix(Height[I], Scratch[I], W), 0.0, 1.0);
}

// Warp — sample the field through a noise offset.
@compute @workgroup_size(8, 8)
fn WarpMain(@builtin(global_invocation_id) G : vec3u) {
  let S = u32(Span());
  if (G.x >= S || G.y >= S) { return; }
  let I = G.y * S + G.x;

  let Amount  = Par(0u);                                       // slot 0  Amount
  let Size    = max(1.0, Par(1u));                             // slot 1  Scale
  let Octaves = i32(round(Par(2u)));                           // slot 2  Octaves

  let Cell = Layer.WorldSize / Layer.Extent;
  let World = (vec2f(f32(G.x), f32(G.y)) - Layer.Extent * 0.5) * Cell;

  var Shift = vec2f(0.0);
  var Amp = 1.0;
  var Freq = 1.0;
  for (var O = 0; O < Octaves; O = O + 1) {
    Shift = Shift + Amp * vec2f(
      Grain(World / Size * Freq + vec2f(3.1, 9.2), Layer.Seed + u32(O) * 97u).x,
      Grain(World / Size * Freq + vec2f(-7.4, 1.5), Layer.Seed + u32(O) * 97u + 13u).x);
    Amp = Amp * 0.5;
    Freq = Freq * 2.0;
  }
  let Pixels = Shift * Amount / Cell;
  Scratch[I] = Sampled(vec2f(f32(G.x), f32(G.y)) + Pixels);
}

// Separable Gaussian. Height -> Water -> Scratch, because those two buffers are idle outside the
// erosion kernels and a third temporary would cost another 4 MB at 1024².
@compute @workgroup_size(8, 8)
fn BlurAcross(@builtin(global_invocation_id) G : vec3u) {
  let S = u32(Span());
  if (G.x >= S || G.y >= S) { return; }
  let R = clamp(Par(0u), 0.5, 24.0);                           // slot 0  Radius
  let Taps = i32(ceil(R * 2.0));
  var Sum = 0.0;
  var Mass = 0.0;
  let Sigma = max(0.35, R * 0.5);
  for (var K = -Taps; K <= Taps; K = K + 1) {
    let W = exp(-f32(K * K) / (2.0 * Sigma * Sigma));
    Sum = Sum + Raised(i32(G.x) + K, i32(G.y)) * W;
    Mass = Mass + W;
  }
  Water[G.y * S + G.x] = Sum / max(Mass, 1e-5);
}

@compute @workgroup_size(8, 8)
fn BlurDown(@builtin(global_invocation_id) G : vec3u) {
  let S = u32(Span());
  if (G.x >= S || G.y >= S) { return; }
  let R = clamp(Par(0u), 0.5, 24.0);                           // slot 0  Radius
  let Strength = clamp(Par(1u), 0.0, 1.0);                     // slot 1  Strength
  let Taps = i32(ceil(R * 2.0));
  var Sum = 0.0;
  var Mass = 0.0;
  let Sigma = max(0.35, R * 0.5);
  let Sp = Span();
  for (var K = -Taps; K <= Taps; K = K + 1) {
    let Y = clamp(i32(G.y) + K, 0, Sp - 1);
    let W = exp(-f32(K * K) / (2.0 * Sigma * Sigma));
    Sum = Sum + Water[u32(Y * Sp + i32(G.x))] * W;
    Mass = Mass + W;
  }
  let I = G.y * S + G.x;
  Scratch[I] = mix(Height[I], Sum / max(Mass, 1e-5), Strength);
}

// ── Thermal erosion ───────────────────────────────────────────────────────────────────────────────
// Material above the angle of repose is handed to the lower neighbours, weighted by how far each
// one is below. Two passes so no cell both gives and receives inside one step.

// The slumping kernels run twice over: once for a Thermal layer, and once every fourth hydraulic
// step to collapse the banks the water has undercut. In the second case the uniform belongs to the
// Hydraulic layer, whose slots mean entirely different things, so bit 9 picks the right reading.
fn Coupled() -> bool { return (Layer.Flags & 512u) != 0u; }

fn TalusAngle() -> f32 {
  if (Coupled()) { return mix(58.0, 26.0, clamp(Par(6u), 0.0, 1.0)); }   // slot 6  Talus
  return clamp(Par(1u), 1.0, 70.0);                                      // slot 1  Talus
}

fn TalusRate() -> f32 {
  if (Coupled()) { return clamp(Par(6u), 0.0, 1.0) * 0.55; }
  return clamp(Par(2u), 0.0, 1.0);                                       // slot 2  Rate
}

fn TalusScree() -> f32 {
  if (Coupled()) { return 0.3; }
  return clamp(Par(3u), 0.0, 1.0);                                       // slot 3  Scree
}

@compute @workgroup_size(8, 8)
fn ThermalGather(@builtin(global_invocation_id) G : vec3u) {
  let S = u32(Span());
  if (G.x >= S || G.y >= S) { return; }
  let I = G.y * S + G.x;

  let Talus = tan(radians(TalusAngle()));
  let Rate  = TalusRate();
  let Scree = TalusScree();

  let X = i32(G.x);
  let Y = i32(G.y);
  let Centre = Height[I] * Layer.Vertical;                      // cell units
  let Limit = Talus * mix(1.0, 1.45, Scree);

  var Total = 0.0;
  var Deepest = 0.0;
  for (var K = 0; K < 8; K = K + 1) {
    let O = Neighbour(K);
    let D = Centre - Raised(X + O.x, Y + O.y) * Layer.Vertical;
    let Reach = select(1.0, 1.4142136, (O.x != 0 && O.y != 0));
    let Over = D / Reach - Limit;
    if (Over > 0.0) {
      Total = Total + Over;
      Deepest = max(Deepest, Over);
    }
  }
  // Half of the excess moves per step; the rest waits, which keeps the slope from ringing.
  Scratch[I] = min(Deepest * 0.5, Total * 0.5) * Rate / max(Layer.Vertical, 1e-6);
}

@compute @workgroup_size(8, 8)
fn ThermalSettle(@builtin(global_invocation_id) G : vec3u) {
  let S = u32(Span());
  if (G.x >= S || G.y >= S) { return; }
  let I = G.y * S + G.x;
  let X = i32(G.x);
  let Y = i32(G.y);

  let Talus = tan(radians(TalusAngle()));
  let Scree = TalusScree();
  let Limit = Talus * mix(1.0, 1.45, Scree);
  let Weight = Coverage(I, X, Y) * Layer.Opacity;

  var Gained = 0.0;
  for (var K = 0; K < 8; K = K + 1) {
    let O = Neighbour(K);
    let Nx = X + O.x;
    let Ny = Y + O.y;
    let Give = Scratch[Spot(Nx, Ny)];
    if (Give <= 0.0) { continue; }
    // Share that donor's parcel out in proportion to how far each of ITS lower neighbours sits.
    let Source = Raised(Nx, Ny) * Layer.Vertical;
    var Mass = 0.0;
    var Mine = 0.0;
    for (var J = 0; J < 8; J = J + 1) {
      let Q = Neighbour(J);
      let D = Source - Raised(Nx + Q.x, Ny + Q.y) * Layer.Vertical;
      let Reach = select(1.0, 1.4142136, (Q.x != 0 && Q.y != 0));
      let Over = D / Reach - Limit;
      if (Over > 0.0) {
        Mass = Mass + Over;
        if (Nx + Q.x == X && Ny + Q.y == Y) { Mine = Over; }
      }
    }
    if (Mass > 0.0) { Gained = Gained + Give * Mine / Mass; }
  }
  let Lost = Scratch[I];
  let Delta = (Gained - Lost) * Weight;
  Relay[I] = clamp(Height[I] + Delta, 0.0, 1.0);
  Accum[I] = vec4f(Accum[I].x,
                   clamp(Accum[I].y * 0.9995 + max(0.0, Delta) * 1.8, 0.0, 1.0),
                   clamp(Accum[I].z * 0.9995 + max(0.0, -Delta) * 1.8, 0.0, 1.0),
                   Accum[I].w);
}

// ── Hydraulic erosion — virtual pipes ─────────────────────────────────────────────────────────────

const Gravity : f32 = 9.81;
const Tick    : f32 = 0.06;

fn Softness(X : i32, Y : i32, Seed : u32) -> f32 {
  let Bedding = clamp(Par(9u), 0.0, 1.0);                       // slot 9  Hardness
  if (Bedding <= 0.0) { return 1.0; }
  let H = Raised(X, Y);
  // Alternating beds in elevation, plus a slow lateral variation so the beds are not perfectly flat.
  let Tilted = H * 26.0 + Grain(vec2f(f32(X), f32(Y)) / 160.0, Seed + 551u).x * 2.2;
  let Band = 0.5 + 0.5 * sin(Tilted * Tau);
  return mix(1.0, mix(0.35, 1.5, Band), Bedding);
}

@compute @workgroup_size(8, 8)
fn ErodeRain(@builtin(global_invocation_id) G : vec3u) {
  let S = u32(Span());
  if (G.x >= S || G.y >= S) { return; }
  let I = G.y * S + G.x;
  let Rain = Par(1u);                                           // slot 1  Rain
  let Weight = Coverage(I, i32(G.x), i32(G.y));
  Water[I] = Water[I] + Rain * Tick * mix(0.15, 1.0, Weight);
}

@compute @workgroup_size(8, 8)
fn ErodeFlux(@builtin(global_invocation_id) G : vec3u) {
  let S = u32(Span());
  if (G.x >= S || G.y >= S) { return; }
  let I = G.y * S + G.x;
  let X = i32(G.x);
  let Y = i32(G.y);

  let Inertia = clamp(Par(8u), 0.0, 0.98);                      // slot 8  Inertia
  let V = Layer.Vertical;
  let Surface = (Height[I] + Water[I]) * V;

  let Old = Flux[I];
  let Jl = Spot(X - 1, Y);
  let Jr = Spot(X + 1, Y);
  let Jd = Spot(X, Y - 1);
  let Ju = Spot(X, Y + 1);
  var Out = vec4f(
    max(0.0, Old.x * Inertia + Tick * Gravity * (Surface - (Height[Jl] + Water[Jl]) * V)),
    max(0.0, Old.y * Inertia + Tick * Gravity * (Surface - (Height[Jr] + Water[Jr]) * V)),
    max(0.0, Old.z * Inertia + Tick * Gravity * (Surface - (Height[Jd] + Water[Jd]) * V)),
    max(0.0, Old.w * Inertia + Tick * Gravity * (Surface - (Height[Ju] + Water[Ju]) * V)));

  // No cell may export more water than it holds.
  let Sum = Out.x + Out.y + Out.z + Out.w;
  if (Sum > 1e-9) {
    let Held = Water[I] * V;
    let Scale = min(1.0, Held / (Sum * Tick));
    Out = Out * Scale;
  }

  // Edges are walls, so the field drains to its own basins rather than off the side.
  if (X == 0)         { Out.x = 0.0; }
  if (X == Span() - 1) { Out.y = 0.0; }
  if (Y == 0)         { Out.z = 0.0; }
  if (Y == Span() - 1) { Out.w = 0.0; }
  Flux[I] = Out;
}

// ── Catchment ─────────────────────────────────────────────────────────────────────────────────────
//
// How much ground drains through each cell, by multiple-flow-direction: every cell hands its area
// to its lower neighbours in proportion to the slope towards each, so the result is the smooth
// dendritic network real drainage has rather than the single-pixel staircase D8 gives. It is
// gathered iteratively because that is what a compute shader can do — each round carries the area
// one cell further downhill, and the solver runs enough rounds for the long rivers to fill in.

fn Downhill(Fx : i32, Fy : i32, Tx : i32, Ty : i32) -> f32 {
  let Edge = i32(Span());
  let Source = Height[Spot(Fx, Fy)];
  var Offsets = array<vec2i, 8>(
    vec2i(1, 0), vec2i(-1, 0), vec2i(0, 1), vec2i(0, -1),
    vec2i(1, 1), vec2i(-1, 1), vec2i(1, -1), vec2i(-1, -1));
  var Total = 0.0;
  var Mine = 0.0;
  for (var K = 0; K < 8; K = K + 1) {
    let O = Offsets[K];
    let Nx = Fx + O.x;
    let Ny = Fy + O.y;
    if (Nx < 0 || Ny < 0 || Nx >= Edge || Ny >= Edge) { continue; }
    let Reach = select(1.0, 1.4142136, O.x != 0 && O.y != 0);
    let Drop = max(0.0, (Source - Height[Spot(Nx, Ny)]) / Reach);
    let Share = pow(Drop, 1.1);
    Total = Total + Share;
    if (Nx == Tx && Ny == Ty) { Mine = Share; }
  }
  if (Total <= 0.0) { return 0.0; }
  return Mine / Total;
}

@compute @workgroup_size(8, 8)
fn AreaSeed(@builtin(global_invocation_id) G : vec3u) {
  let S = u32(Span());
  if (G.x >= S || G.y >= S) { return; }
  let I = G.y * S + G.x;
  let A = Accum[I];
  Accum[I] = vec4f(A.x, A.y, A.z, 1.0);
}

@compute @workgroup_size(8, 8)
fn AreaGather(@builtin(global_invocation_id) G : vec3u) {
  let S = u32(Span());
  if (G.x >= S || G.y >= S) { return; }
  let I = G.y * S + G.x;
  let X = i32(G.x);
  let Y = i32(G.y);
  let Edge = i32(S);
  var Offsets = array<vec2i, 8>(
    vec2i(1, 0), vec2i(-1, 0), vec2i(0, 1), vec2i(0, -1),
    vec2i(1, 1), vec2i(-1, 1), vec2i(1, -1), vec2i(-1, -1));
  var Taken = 1.0;
  for (var K = 0; K < 8; K = K + 1) {
    let O = Offsets[K];
    let Nx = X + O.x;
    let Ny = Y + O.y;
    if (Nx < 0 || Ny < 0 || Nx >= Edge || Ny >= Edge) { continue; }
    if (Height[Spot(Nx, Ny)] <= Height[I]) { continue; }
    Taken = Taken + Accum[Spot(Nx, Ny)].w * Downhill(Nx, Ny, X, Y);
  }
  Relay[I] = Taken;
}

@compute @workgroup_size(8, 8)
fn AreaCommit(@builtin(global_invocation_id) G : vec3u) {
  let S = u32(Span());
  if (G.x >= S || G.y >= S) { return; }
  let I = G.y * S + G.x;
  let A = Accum[I];
  Accum[I] = vec4f(A.x, A.y, A.z, Relay[I]);
}

@compute @workgroup_size(8, 8)
fn ErodeFlow(@builtin(global_invocation_id) G : vec3u) {
  let S = u32(Span());
  if (G.x >= S || G.y >= S) { return; }
  let I = G.y * S + G.x;
  let X = i32(G.x);
  let Y = i32(G.y);
  let V = Layer.Vertical;

  let Mine = Flux[I];
  let FromLeft  = Flux[Spot(X - 1, Y)].y;
  let FromRight = Flux[Spot(X + 1, Y)].x;
  let FromDown  = Flux[Spot(X, Y - 1)].w;
  let FromUp    = Flux[Spot(X, Y + 1)].z;

  let In  = FromLeft + FromRight + FromDown + FromUp;
  let Out = Mine.x + Mine.y + Mine.z + Mine.w;

  let Before = Water[I] * V;
  let After = max(0.0, Before + Tick * (In - Out));
  Water[I] = After / V;

  let Mean = max(1e-5, (Before + After) * 0.5);
  let U = ((FromLeft - Mine.x) + (Mine.y - FromRight)) * 0.5 / Mean;
  let W = ((FromDown - Mine.z) + (Mine.w - FromUp)) * 0.5 / Mean;
  Velocity[I] = vec2f(U, W);

  // The river mask the texture stack reads. Instantaneous discharge is nearly uniform under
  // uniform rain, so this is the log of catchment area instead: scale free, and it is what makes
  // a stream read as a stream rather than as wet ground everywhere.
  let A = Accum[I];
  let Channel = clamp((log2(1.0 + A.w) - 2.2) / 7.0, 0.0, 1.0);
  Accum[I] = vec4f(max(A.x * 0.997, Channel), A.y, A.z, A.w);
}

@compute @workgroup_size(8, 8)
fn ErodeCarry(@builtin(global_invocation_id) G : vec3u) {
  let S = u32(Span());
  if (G.x >= S || G.y >= S) { return; }
  let I = G.y * S + G.x;
  let X = i32(G.x);
  let Y = i32(G.y);

  let Capacity = Par(3u);                                       // slot 3  Capacity
  let Dissolve = Par(4u);                                       // slot 4  Dissolve
  let Deposit  = Par(5u);                                       // slot 5  Deposition
  let Floor    = Par(7u);                                       // slot 7  MinSlope
  let V = Layer.Vertical;
  let Weight = Coverage(I, X, Y) * Layer.Opacity;

  let Dx = (Raised(X + 1, Y) - Raised(X - 1, Y)) * V * 0.5;
  let Dy = (Raised(X, Y + 1) - Raised(X, Y - 1)) * V * 0.5;
  let Grade = length(vec2f(Dx, Dy));
  let Tilt = max(Floor, Grade / sqrt(1.0 + Grade * Grade));

  let Speed = length(Velocity[I]);
  let Depth = Water[I] * V;
  // Thin films carry almost nothing; this is the lmax term that stops rain pitting flat ground.
  let Film = clamp(Depth / 0.012, 0.0, 1.0);
  let Discharge = sqrt(max(1.0, Accum[I].w));
  let Able = Capacity * Tilt * (Speed * 0.5 + Discharge * 0.09) * Film * 0.5;

  let Held = Sediment[I];
  var Change = 0.0;
  if (Able > Held) {
    Change = -Dissolve * (Able - Held) * Softness(X, Y, Layer.Seed);
  } else {
    Change = Deposit * (Held - Able);
  }
  Change = Change * Weight;

  let Shift = Change / max(V, 1e-6);
  Relay[I] = clamp(Height[I] + Shift, 0.0, 1.0);
  Sediment[I] = max(0.0, Held - Change);

  let A = Accum[I];
  Accum[I] = vec4f(A.x,
                   clamp(A.y + max(0.0, Change) * 7.0, 0.0, 1.0),
                   clamp(A.z + max(0.0, -Change) * 7.0, 0.0, 1.0),
                   A.w);
}

// Publishes a relayed field. Both the carry and the settle kernels derive a new height from their
// neighbours, so neither may write Height directly — they stage it here and this pass commits it.
@compute @workgroup_size(8, 8)
fn RelayApply(@builtin(global_invocation_id) G : vec3u) {
  let S = u32(Span());
  if (G.x >= S || G.y >= S) { return; }
  let I = G.y * S + G.x;
  Height[I] = Relay[I];
}

@compute @workgroup_size(8, 8)
fn ErodeSettle(@builtin(global_invocation_id) G : vec3u) {
  let S = u32(Span());
  if (G.x >= S || G.y >= S) { return; }
  let I = G.y * S + G.x;

  // Semi-Lagrangian: the sediment arriving here is whatever was upstream one step ago.
  let P = vec2f(f32(G.x), f32(G.y)) - Velocity[I] * Tick;
  let B = floor(P);
  let F = P - B;
  let X = i32(B.x);
  let Y = i32(B.y);
  let A0 = mix(Sediment[Spot(X, Y)], Sediment[Spot(X + 1, Y)], F.x);
  let A1 = mix(Sediment[Spot(X, Y + 1)], Sediment[Spot(X + 1, Y + 1)], F.x);
  Scratch[I] = mix(A0, A1, F.y);
}

@compute @workgroup_size(8, 8)
fn ErodeDry(@builtin(global_invocation_id) G : vec3u) {
  let S = u32(Span());
  if (G.x >= S || G.y >= S) { return; }
  let I = G.y * S + G.x;
  let Dry = Par(2u);                                            // slot 2  Evaporation
  Sediment[I] = Scratch[I];
  Water[I] = max(0.0, Water[I] * (1.0 - Dry * Tick * 16.0));
}

// Final tidy: drop whatever is still suspended and clear the standing water, so the stack hands on a
// dry heightfield rather than one with a millimetre of water baked into it.
@compute @workgroup_size(8, 8)
fn ErodeFinish(@builtin(global_invocation_id) G : vec3u) {
  let S = u32(Span());
  if (G.x >= S || G.y >= S) { return; }
  let I = G.y * S + G.x;
  let V = Layer.Vertical;
  Height[I] = clamp(Height[I] + Sediment[I] / max(V, 1e-6), 0.0, 1.0);
  Sediment[I] = 0.0;
  Water[I] = 0.0;
  Flux[I] = vec4f(0.0);
  Velocity[I] = vec2f(0.0);
}

// Normalises the field into 0..1 after the whole stack has run, so the render and the texture rules
// always see a full range regardless of what the layers did.
@compute @workgroup_size(8, 8)
fn NormaliseMain(@builtin(global_invocation_id) G : vec3u) {
  let S = u32(Span());
  if (G.x >= S || G.y >= S) { return; }
  let I = G.y * S + G.x;
  let Low  = Layer.MaskLow;
  let High = Layer.MaskHigh;
  Height[I] = clamp((Height[I] - Low) / max(1e-5, High - Low), 0.0, 1.0);
}
`;

// Reductions run on a second module so the main kernel stays free of workgroup storage.
const Reduce = /* wgsl */ `
struct Extent { Low : atomic<u32>, High : atomic<u32> };
@group(0) @binding(0) var<storage, read> Height : array<f32>;
@group(0) @binding(1) var<storage, read_write> Range : Extent;

// Monotone map from f32 (non-negative here) to u32 so atomicMin/Max can order it.
fn Ordered(V : f32) -> u32 { return bitcast<u32>(max(V, 0.0)); }

@compute @workgroup_size(256)
fn RangeMain(@builtin(global_invocation_id) G : vec3u) {
  if (G.x >= arrayLength(&Height)) { return; }
  let V = Ordered(Height[G.x]);
  atomicMin(&Range.Low, V);
  atomicMax(&Range.High, V);
}
`;

const Entries = [
  "ClearMain", "GenerateMain", "CompositeMain", "ModifyMain", "ResolveModifier",
  "WarpMain", "BlurAcross", "BlurDown", "ThermalGather", "ThermalSettle",
  "AreaSeed", "AreaGather", "AreaCommit",
  "ErodeRain", "ErodeFlux", "ErodeFlow", "ErodeCarry", "ErodeSettle", "ErodeDry",
  "ErodeFinish", "NormaliseMain", "RelayApply",
];

export class ReliefSolver {
  constructor(Device, Report) {
    this.Device = Device;
    this.Report = Report || (() => {});
    this.Size = 0;
    this.Buffers = null;
    this.Programme = [];
    this.Cursor = 0;
    this.Done = true;
    this.Stage = "idle";

    this.Module = Device.createShaderModule({ code: Kernel, label: "ReliefSolver.Kernel" });
    this.ReduceModule = Device.createShaderModule({ code: Reduce, label: "ReliefSolver.Reduce" });

    this.FieldLayout = Device.createBindGroupLayout({
      label: "ReliefSolver.Fields",
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
        ...[1, 2, 3, 4, 5, 6, 7, 8].map((B) => ({
          binding: B, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" },
        })),
      ],
    });
    this.LayerLayout = Device.createBindGroupLayout({
      label: "ReliefSolver.Layer",
      entries: [{
        binding: 0, visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "uniform", hasDynamicOffset: true, minBindingSize: 144 },
      }],
    });
    const Pipe = Device.createPipelineLayout({ bindGroupLayouts: [this.FieldLayout, this.LayerLayout] });

    this.Pipelines = {};
    for (const Name of Entries) {
      this.Pipelines[Name] = Device.createComputePipeline({
        label: `ReliefSolver.${Name}`,
        layout: Pipe,
        compute: { module: this.Module, entryPoint: Name },
      });
    }

    this.RangeLayout = Device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
      ],
    });
    this.RangePipeline = Device.createComputePipeline({
      label: "ReliefSolver.Range",
      layout: Device.createPipelineLayout({ bindGroupLayouts: [this.RangeLayout] }),
      compute: { module: this.ReduceModule, entryPoint: "RangeMain" },
    });

    this.FrameBuffer = Device.createBuffer({
      size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, label: "Frame",
    });
    this.LayerBuffer = Device.createBuffer({
      size: LayerStride * MaxLayers, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, label: "Layers",
    });
    this.LayerBytes = new ArrayBuffer(LayerStride * MaxLayers);
    this.LayerGroup = Device.createBindGroup({
      layout: this.LayerLayout,
      entries: [{ binding: 0, resource: { buffer: this.LayerBuffer, size: LayerStride } }],
    });

    this.RangeBuffer = Device.createBuffer({
      size: 8, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
    });
    this.RangeRead = Device.createBuffer({ size: 8, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
  }

  Allocate(Size) {
    if (this.Size === Size) return;
    if (this.Buffers) for (const B of Object.values(this.Buffers)) B.destroy();
    const Count = Size * Size;
    const Make = (Stride, Name) =>
      this.Device.createBuffer({
        size: Count * Stride,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
        label: Name,
      });
    this.Buffers = {
      Height: Make(4, "Height"),
      Scratch: Make(4, "Scratch"),
      Water: Make(4, "Water"),
      Sediment: Make(4, "Sediment"),
      Flux: Make(16, "Flux"),
      Velocity: Make(8, "Velocity"),
      Accum: Make(16, "Accum"),
      Relay: Make(4, "Relay"),
    };
    this.Size = Size;
    this.FieldGroup = this.Device.createBindGroup({
      layout: this.FieldLayout,
      entries: [
        { binding: 0, resource: { buffer: this.FrameBuffer } },
        { binding: 1, resource: { buffer: this.Buffers.Height } },
        { binding: 2, resource: { buffer: this.Buffers.Scratch } },
        { binding: 3, resource: { buffer: this.Buffers.Water } },
        { binding: 4, resource: { buffer: this.Buffers.Sediment } },
        { binding: 5, resource: { buffer: this.Buffers.Flux } },
        { binding: 6, resource: { buffer: this.Buffers.Velocity } },
        { binding: 7, resource: { buffer: this.Buffers.Accum } },
        { binding: 8, resource: { buffer: this.Buffers.Relay } },
      ],
    });
    this.RangeGroup = this.Device.createBindGroup({
      layout: this.RangeLayout,
      entries: [
        { binding: 0, resource: { buffer: this.Buffers.Height } },
        { binding: 1, resource: { buffer: this.RangeBuffer } },
      ],
    });
  }

  // Builds the work programme for a scene. Nothing is dispatched here; Advance() does the work in
  // slices so a 480-iteration erosion never blocks a frame.
  Begin(Scene, Draft) {
    const World = Scene.World;
    this.Allocate(World.Resolution);

    const Frame = new ArrayBuffer(32);
    new Uint32Array(Frame, 0, 4).set([World.Resolution, 0, 0, 0]);
    new Float32Array(Frame, 16, 4).set([World.WorldSize, World.HeightScale, 0, 0]);
    this.Device.queue.writeBuffer(this.FrameBuffer, 0, Frame);

    const Context = {
      Seed: World.Seed >>> 0,
      WorldSize: World.WorldSize,
      HeightScale: World.HeightScale,
      Size: World.Resolution,
    };

    const Live = Scene.Terrain.filter((L) => L.Enabled).slice(0, MaxLayers - 1);
    this.Programme = [{ Act: "Clear" }];
    let Slot = 0;
    for (const L of Live) {
      // Vertical converts normalised height into cell units: one unit is one cell width.
      const Cell = Context.WorldSize / Context.Size;
      const Pack = Object.assign({}, Context, { Size: Context.Size });
      PackTerrainLayer(L, this.LayerBytes, Slot * LayerStride, Pack);
      const Reals = new Float32Array(this.LayerBytes, Slot * LayerStride, 32);
      Reals[8] = Context.WorldSize;
      Reals[9] = Context.HeightScale / Cell;   // Vertical
      Reals[10] = Context.Size;                // Extent

      const Role = TerrainKinds[L.Kind].Role;
      if (Role === "Generator") {
        this.Programme.push({ Act: "Generate", Slot, Name: L.Name });
      } else if (L.Kind === "Hydraulic") {
        const Want = Math.round(L.Values.Iterations);
        this.Programme.push({
          Act: "Hydraulic", Slot, Name: L.Name,
          Total: Draft ? Math.max(12, Math.round(Want * 0.22)) : Want, Left: 0,
        });
      } else if (L.Kind === "Thermal") {
        const Want = Math.round(L.Values.Iterations);
        this.Programme.push({
          Act: "Thermal", Slot, Name: L.Name,
          Total: Draft ? Math.max(8, Math.round(Want * 0.3)) : Want, Left: 0,
        });
      } else if (L.Kind === "Warp") {
        this.Programme.push({ Act: "Warp", Slot, Name: L.Name });
      } else if (L.Kind === "Blur") {
        this.Programme.push({ Act: "Blur", Slot, Name: L.Name });
      } else {
        this.Programme.push({ Act: "Modify", Slot, Name: L.Name });
      }
      Slot += 1;
    }
    for (const Step of this.Programme) if (Step.Total) Step.Left = Step.Total;

    this.Device.queue.writeBuffer(this.LayerBuffer, 0, this.LayerBytes, 0, Math.max(LayerStride, Slot * LayerStride));
    this.Cursor = 0;
    this.Done = this.Programme.length === 0;
    this.Stage = "building";
    this.Weight = this.Programme.reduce((A, S) => A + (S.Total || 1), 0);
    this.Spent = 0;
  }

  get Progress() {
    return this.Weight ? Math.min(1, this.Spent / this.Weight) : 1;
  }

  // One slice. `Budget` is roughly how many erosion iterations may run before returning.
  Advance(Budget) {
    if (this.Done) return true;
    const Encoder = this.Device.createCommandEncoder({ label: "ReliefSolver.Advance" });
    const Pass = Encoder.beginComputePass();
    const Groups = Math.ceil(this.Size / 8);
    let Spend = 0;

    const Run = (Name, Slot) => {
      Pass.setPipeline(this.Pipelines[Name]);
      Pass.setBindGroup(0, this.FieldGroup);
      Pass.setBindGroup(1, this.LayerGroup, [Slot * LayerStride]);
      Pass.dispatchWorkgroups(Groups, Groups);
    };

    while (this.Cursor < this.Programme.length && Spend < Budget) {
      const Step = this.Programme[this.Cursor];
      this.Stage = Step.Name || Step.Act;

      if (Step.Act === "Clear") {
        Run("ClearMain", 0);
        this.Cursor += 1; this.Spent += 1; Spend += 1;
      } else if (Step.Act === "Generate") {
        Run("GenerateMain", Step.Slot);
        Run("CompositeMain", Step.Slot);
        this.Cursor += 1; this.Spent += 1; Spend += 2;
      } else if (Step.Act === "Modify") {
        Run("ModifyMain", Step.Slot);
        Run("ResolveModifier", Step.Slot);
        this.Cursor += 1; this.Spent += 1; Spend += 2;
      } else if (Step.Act === "Warp") {
        Run("WarpMain", Step.Slot);
        Run("ResolveModifier", Step.Slot);
        this.Cursor += 1; this.Spent += 1; Spend += 2;
      } else if (Step.Act === "Blur") {
        Run("BlurAcross", Step.Slot);
        Run("BlurDown", Step.Slot);
        Run("ResolveModifier", Step.Slot);
        this.Cursor += 1; this.Spent += 1; Spend += 3;
      } else if (Step.Act === "Thermal") {
        const Slice = Math.min(Step.Left, Math.max(1, Budget - Spend));
        for (let K = 0; K < Slice; K += 1) {
          Run("ThermalGather", Step.Slot);
          Run("ThermalSettle", Step.Slot);
          Run("RelayApply", Step.Slot);
        }
        Step.Left -= Slice; this.Spent += Slice; Spend += Slice;
        if (Step.Left <= 0) this.Cursor += 1;
      } else if (Step.Act === "Hydraulic") {
        // The catchment has to be close to converged before the first grain moves, or the
        // capacity term is wrong everywhere and the solver cuts valleys in the wrong places.
        if (!Step.Seeded) {
          Run("AreaSeed", Step.Slot);
          for (let K = 0; K < 72; K += 1) {
            Run("AreaGather", Step.Slot);
            Run("AreaCommit", Step.Slot);
          }
          Step.Seeded = true;
          Spend += 12;
        }
        const Slice = Math.min(Step.Left, Math.max(1, Budget - Spend));
        for (let K = 0; K < Slice; K += 1) {
          // One round per step keeps the catchment tracking the valleys as they deepen.
          Run("AreaGather", Step.Slot);
          Run("AreaCommit", Step.Slot);
          Run("ErodeRain", Step.Slot);
          Run("ErodeFlux", Step.Slot);
          Run("ErodeFlow", Step.Slot);
          Run("ErodeCarry", Step.Slot);
          Run("RelayApply", Step.Slot);
          Run("ErodeSettle", Step.Slot);
          Run("ErodeDry", Step.Slot);
          // Coupled slumping of the banks the water has just undercut.
          if ((K & 3) === 3) {
            Run("ThermalGather", Step.Slot);
            Run("ThermalSettle", Step.Slot);
            Run("RelayApply", Step.Slot);
          }
        }
        Step.Left -= Slice; this.Spent += Slice; Spend += Slice;
        if (Step.Left <= 0) {
          Run("ErodeFinish", Step.Slot);
          this.Cursor += 1;
        }
      } else {
        this.Cursor += 1;
      }
    }

    const Finished = this.Cursor >= this.Programme.length;
    Pass.end();
    this.Device.queue.submit([Encoder.finish()]);

    if (Finished) {
      this.Done = true;
      this.Stage = "ready";
    }
    return Finished;
  }

  // Rescales the finished field to the full 0..1 range. Returns a promise so the caller can wait
  // for the readback before the first render, or skip it entirely.
  async Settle() {
    const Device = this.Device;
    Device.queue.writeBuffer(this.RangeBuffer, 0, new Uint32Array([0x7f7fffff, 0]));
    const Encoder = Device.createCommandEncoder();
    const Pass = Encoder.beginComputePass();
    Pass.setPipeline(this.RangePipeline);
    Pass.setBindGroup(0, this.RangeGroup);
    Pass.dispatchWorkgroups(Math.ceil((this.Size * this.Size) / 256));
    Pass.end();
    Encoder.copyBufferToBuffer(this.RangeBuffer, 0, this.RangeRead, 0, 8);
    Device.queue.submit([Encoder.finish()]);

    await this.RangeRead.mapAsync(GPUMapMode.READ);
    const Words = new Uint32Array(this.RangeRead.getMappedRange().slice(0));
    this.RangeRead.unmap();
    const Low = new Float32Array(new Uint32Array([Words[0]]).buffer)[0];
    const High = new Float32Array(new Uint32Array([Words[1]]).buffer)[0];
    if (!(High > Low + 1e-4)) return { Low: 0, High: 1 };

    // Reuse the last layer slot to carry the range into NormaliseMain.
    const Slot = MaxLayers - 1;
    const Reals = new Float32Array(this.LayerBytes, Slot * LayerStride, 32);
    Reals.fill(0);
    Reals[5] = Low;
    Reals[6] = High;
    Device.queue.writeBuffer(this.LayerBuffer, Slot * LayerStride,
      this.LayerBytes, Slot * LayerStride, LayerStride);

    const Second = Device.createCommandEncoder();
    const Tidy = Second.beginComputePass();
    Tidy.setPipeline(this.Pipelines.NormaliseMain);
    Tidy.setBindGroup(0, this.FieldGroup);
    Tidy.setBindGroup(1, this.LayerGroup, [Slot * LayerStride]);
    const Groups = Math.ceil(this.Size / 8);
    Tidy.dispatchWorkgroups(Groups, Groups);
    Tidy.end();
    Device.queue.submit([Second.finish()]);
    return { Low, High };
  }
}

export const ReliefKernelSource = Kernel;
export const ReliefReduceSource = Reduce;
export const ReliefEntryPoints = Entries;

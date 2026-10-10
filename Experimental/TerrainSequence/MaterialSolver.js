// MaterialSolver — everything between the finished heightfield and the renderer.
//
// Three passes:
//   Occlude  horizon-search ambient occlusion, eight azimuths, from the heightfield alone
//   Shade    a sun ray marched across the heightfield, so ridges cast real shadows into valleys
//   Resolve  surface normals, then the texture layer stack, written into three sampled textures
//
// Occlude depends only on the terrain, Shade on the terrain and the sun, Resolve on everything.
// The host runs the cheapest set that the last edit actually invalidated.

import { LayerStride, PackTextureLayer } from "./HeightSpecification.js";

export const MaxTextureLayers = 24;

const Kernel = /* wgsl */ `
struct SceneUniform {
  Size        : u32,
  LayerCount  : u32,
  Seed        : u32,
  Quality     : u32,
  WorldSize   : f32,
  HeightScale : f32,
  WaterLevel  : f32,
  Time        : f32,
  Sun         : vec4f,
  SunTint     : vec4f,
  SkyTint     : vec4f,
};

struct Coat {
  Kind      : u32,
  Blend     : u32,
  Seed      : u32,
  Live      : u32,
  Opacity   : f32,
  Red       : f32,
  Green     : f32,
  Blue      : f32,
  Rough     : f32,
  WorldSize : f32,
  Vertical  : f32,
  Reserved  : f32,
  P         : array<vec4f, 6>,
  Tail      : array<vec4f, 7>,
};

@group(0) @binding(0) var<uniform> Scene : SceneUniform;
@group(0) @binding(1) var<storage, read>       Height    : array<f32>;
@group(0) @binding(2) var<storage, read>       Accum     : array<vec4f>;
@group(0) @binding(3) var<storage, read_write> Occlusion : array<f32>;
@group(0) @binding(4) var<storage, read_write> Daylight  : array<f32>;
@group(0) @binding(5) var<storage, read>       Coats     : array<Coat>;

@group(1) @binding(0) var Geometry : texture_storage_2d<rgba16float, write>;
@group(1) @binding(1) var Albedo   : texture_storage_2d<rgba16float, write>;
@group(1) @binding(2) var Masking  : texture_storage_2d<rgba16float, write>;

const Tau : f32 = 6.28318530717958647;

const CoatFill     : u32 = 0u;
const CoatAltitude : u32 = 1u;
const CoatSlope    : u32 = 2u;
const CoatFlow     : u32 = 3u;
const CoatDeposit  : u32 = 4u;
const CoatCavity   : u32 = 5u;
const CoatSnow     : u32 = 6u;
const CoatScatter  : u32 = 7u;

fn Span() -> i32 { return i32(Scene.Size); }

fn Spot(X : i32, Y : i32) -> u32 {
  let S = Span();
  return u32(clamp(Y, 0, S - 1) * S + clamp(X, 0, S - 1));
}

fn Raised(X : i32, Y : i32) -> f32 { return Height[Spot(X, Y)]; }

fn Lifted(P : vec2f) -> f32 {
  let B = floor(P);
  let F = P - B;
  let X = i32(B.x);
  let Y = i32(B.y);
  let A0 = mix(Raised(X, Y), Raised(X + 1, Y), F.x);
  let A1 = mix(Raised(X, Y + 1), Raised(X + 1, Y + 1), F.x);
  return mix(A0, A1, F.y);
}

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

fn Grain(Pos : vec2f, Seed : u32) -> f32 {
  let I = floor(Pos);
  let F = Pos - I;
  let U = F * F * F * (F * (F * 6.0 - 15.0) + 10.0);
  let Ii = vec2i(I);
  let Ga = Slope2(Ii + vec2i(0, 0), Seed);
  let Gb = Slope2(Ii + vec2i(1, 0), Seed);
  let Gc = Slope2(Ii + vec2i(0, 1), Seed);
  let Gd = Slope2(Ii + vec2i(1, 1), Seed);
  let Va = dot(Ga, F - vec2f(0.0, 0.0));
  let Vb = dot(Gb, F - vec2f(1.0, 0.0));
  let Vc = dot(Gc, F - vec2f(0.0, 1.0));
  let Vd = dot(Gd, F - vec2f(1.0, 1.0));
  return mix(mix(Va, Vb, U.x), mix(Vc, Vd, U.x), U.y);
}

fn Fractal(Pos : vec2f, Octaves : i32, Seed : u32) -> f32 {
  var P = Pos;
  var A = 1.0;
  var T = 0.0;
  var M = 0.0;
  for (var O = 0; O < Octaves; O = O + 1) {
    T = T + A * Grain(P, Seed + u32(O) * 57u);
    M = M + A;
    A = A * 0.5;
    P = P * 2.03 + vec2f(1.7, -3.1);
  }
  return T / max(M, 1e-5) * 0.5 + 0.5;
}

// ── Ambient occlusion by horizon search ───────────────────────────────────────────────────────────
// For each of eight compass directions, walk outward with a growing stride and keep the steepest
// angle seen. The sky an outcrop can see is what is left over.

@compute @workgroup_size(8, 8)
fn OccludeMain(@builtin(global_invocation_id) G : vec3u) {
  let S = u32(Span());
  if (G.x >= S || G.y >= S) { return; }
  let I = G.y * S + G.x;

  let Cell = Scene.WorldSize / f32(Scene.Size);
  let Vertical = Scene.HeightScale;
  let Here = Raised(i32(G.x), i32(G.y)) * Vertical;
  let Origin = vec2f(f32(G.x), f32(G.y));
  let Steps = select(18, 30, Scene.Quality > 0u);

  var Open = 0.0;
  for (var D = 0; D < 8; D = D + 1) {
    let A = (f32(D) + 0.5) * Tau / 8.0;
    let Step = vec2f(cos(A), sin(A));
    var Reach = 1.0;
    var Highest = 0.0;
    for (var K = 0; K < Steps; K = K + 1) {
      let P = Origin + Step * Reach;
      if (P.x < 0.0 || P.y < 0.0 || P.x > f32(S - 1u) || P.y > f32(S - 1u)) { break; }
      let Rise = Lifted(P) * Vertical - Here;
      let Tan = Rise / (Reach * Cell);
      Highest = max(Highest, Tan);
      Reach = Reach * 1.36 + 1.0;
    }
    // Uniform sky radiance over the unoccluded cone.
    Open = Open + 1.0 - Highest / sqrt(1.0 + Highest * Highest);
  }
  Occlusion[I] = clamp(Open / 8.0, 0.0, 1.0);
}

// ── Cast shadow ───────────────────────────────────────────────────────────────────────────────────

@compute @workgroup_size(8, 8)
fn ShadeMain(@builtin(global_invocation_id) G : vec3u) {
  let S = u32(Span());
  if (G.x >= S || G.y >= S) { return; }
  let I = G.y * S + G.x;

  let Dir = normalize(Scene.Sun.xyz);
  if (Dir.y <= 0.004) { Daylight[I] = 0.0; return; }

  let Cell = Scene.WorldSize / f32(Scene.Size);
  let Vertical = Scene.HeightScale;
  // Sun direction projected onto the grid, and how fast the ray climbs per cell travelled.
  let Flat = vec2f(Dir.x, Dir.z);
  let Len = length(Flat);
  if (Len < 1e-5) { Daylight[I] = 1.0; return; }
  let Step = Flat / Len;
  let Climb = (Dir.y / Len) * Cell;

  let Origin = vec2f(f32(G.x), f32(G.y));
  var Here = Raised(i32(G.x), i32(G.y)) * Vertical;
  // Lift off the surface by one cell so a flat plane does not shadow itself.
  Here = Here + Cell * 0.35;

  let Steps = select(96, 192, Scene.Quality > 0u);
  var Reach = 1.0;
  var Darkest = 1.0;
  for (var K = 0; K < Steps; K = K + 1) {
    let P = Origin + Step * Reach;
    if (P.x < 0.0 || P.y < 0.0 || P.x > f32(S - 1u) || P.y > f32(S - 1u)) { break; }
    let Ray = Here + Climb * Reach;
    let Ground = Lifted(P) * Vertical;
    // Penumbra: how close the ray passed, in units of the sun's angular radius.
    let Clear = (Ray - Ground) / max(Reach * Cell * 0.016, 1e-4);
    Darkest = min(Darkest, clamp(Clear, 0.0, 1.0));
    if (Darkest <= 0.0) { break; }
    Reach = Reach * 1.035 + 1.0;
  }
  Daylight[I] = Darkest;
}

// ── Texture stack ─────────────────────────────────────────────────────────────────────────────────

fn Band(V : f32, Low : f32, High : f32, Fall : f32) -> f32 {
  let F = max(1e-4, Fall);
  return clamp(smoothstep(Low - F, Low + F, V) * (1.0 - smoothstep(High - F, High + F, V)), 0.0, 1.0);
}

struct Surface {
  Tint  : vec3f,
  Rough : f32,
  Wet   : f32,
  Snow  : f32,
};

fn Painted(I : u32, X : i32, Y : i32, World : vec2f, Normal : vec3f,
           Tilt : f32, Curve : f32, Sky : f32) -> Surface {
  let H = Height[I];
  let A = Accum[I];
  var Out : Surface;
  Out.Tint = vec3f(0.42, 0.4, 0.38);
  Out.Rough = 0.85;
  Out.Wet = 0.0;
  Out.Snow = 0.0;

  for (var L = 0u; L < Scene.LayerCount; L = L + 1u) {
    let C = Coats[L];
    if (C.Live == 0u) { continue; }

    let Low  = C.P[0].x;                                       // slot 0  Low
    let High = C.P[0].y;                                       // slot 1  High
    let Fall = C.P[0].z;                                       // slot 2  Falloff
    let Mottle = C.P[0].w;                                     // slot 3  NoiseAmount
    let Grit = max(1.0, C.P[1].x);                             // slot 4  NoiseScale
    let Extra = C.P[1].y;                                      // slot 5  kind-specific
    let Extra2 = C.P[1].z;                                     // slot 6  kind-specific

    var W = 1.0;
    switch (C.Kind) {
      case CoatFill: {
        W = 1.0;
      }
      case CoatAltitude: {
        W = Band(H, Low, High, Fall);
      }
      case CoatSlope: {
        let Degrees = degrees(atan(Tilt));
        W = Band(Degrees, Low, High, max(0.25, Fall));
      }
      case CoatFlow: {
        W = clamp(smoothstep(Low - Fall, Low + Fall, A.x), 0.0, 1.0);
      }
      case CoatDeposit: {
        W = clamp(smoothstep(Low - Fall, Low + Fall, A.y), 0.0, 1.0);
      }
      case CoatCavity: {
        W = clamp(smoothstep(Low - Fall, Low + Fall, -Curve), 0.0, 1.0);
      }
      case CoatSnow: {
        let Line = Low + (Fractal(World / 2600.0, 3, C.Seed) - 0.5) * 0.09 * Extra2;
        let Reach = smoothstep(Line - Fall, Line + Fall, H);
        let Degrees = degrees(atan(Tilt));
        let Shed = 1.0 - smoothstep(Extra - 9.0, Extra + 3.0, Degrees);
        // Cornices: snow banks up where the ground is concave, and melts in running water.
        let Bank = 1.0 + clamp(-Curve, 0.0, 1.0) * 0.55 * Extra2;
        W = clamp(Reach * Shed * Bank * (1.0 - clamp(A.x * 2.2, 0.0, 1.0)), 0.0, 1.0);
      }
      case CoatScatter: {
        let N = Fractal(World / Grit, 4, C.Seed + 31u);
        W = clamp(smoothstep(1.0 - Low - Fall, 1.0 - Low + Fall, N), 0.0, 1.0);
      }
      default: {
        W = 0.0;
      }
    }

    if (Mottle > 0.0 && C.Kind != CoatFill) {
      let N = Fractal(World / Grit, 4, C.Seed + 909u);
      W = clamp(W * mix(1.0, N * 1.75, Mottle), 0.0, 1.0);
    }
    W = W * C.Opacity;
    if (W <= 0.0005) { continue; }

    // A little per-layer colour variation keeps large flats from reading as paint.
    let Shift = (Fractal(World / (Grit * 2.7), 3, C.Seed + 17u) - 0.5) * 0.14 * Mottle;
    let Tint = clamp(vec3f(C.Red, C.Green, C.Blue) * (1.0 + Shift), vec3f(0.0), vec3f(4.0));

    Out.Tint = mix(Out.Tint, Tint, W);
    Out.Rough = mix(Out.Rough, C.Rough, W);
    if (C.Kind == CoatFlow) { Out.Wet = max(Out.Wet, W * Extra); }
    if (C.Kind == CoatSnow) { Out.Snow = max(Out.Snow, W); }
  }
  return Out;
}

@compute @workgroup_size(8, 8)
fn ResolveMain(@builtin(global_invocation_id) G : vec3u) {
  let S = u32(Span());
  if (G.x >= S || G.y >= S) { return; }
  let I = G.y * S + G.x;
  let X = i32(G.x);
  let Y = i32(G.y);

  let Cell = Scene.WorldSize / f32(Scene.Size);
  let Vertical = Scene.HeightScale;

  // Sobel, so the normal survives the single-texel noise the erosion leaves behind.
  let Tl = Raised(X - 1, Y - 1); let Tc = Raised(X, Y - 1); let Tr = Raised(X + 1, Y - 1);
  let Ml = Raised(X - 1, Y);                                 let Mr = Raised(X + 1, Y);
  let Bl = Raised(X - 1, Y + 1); let Bc = Raised(X, Y + 1); let Br = Raised(X + 1, Y + 1);
  let Dx = ((Tr + 2.0 * Mr + Br) - (Tl + 2.0 * Ml + Bl)) * Vertical / (8.0 * Cell);
  let Dy = ((Bl + 2.0 * Bc + Br) - (Tl + 2.0 * Tc + Tr)) * Vertical / (8.0 * Cell);
  let Normal = normalize(vec3f(-Dx, 1.0, -Dy));
  let Tilt = length(vec2f(Dx, Dy));

  let Centre = Raised(X, Y);
  let Mean = (Ml + Mr + Tc + Bc) * 0.25;
  let Curve = clamp((Centre - Mean) * Vertical / Cell * 9.0, -1.0, 1.0);

  let World = (vec2f(f32(X), f32(Y)) - f32(Scene.Size) * 0.5) * Cell;
  let Sky = Occlusion[I];
  let Coat = Painted(I, X, Y, World, Normal, Tilt, Curve, Sky);

  // Wet rock is darker and much smoother; that single relationship does most of the work in
  // selling a river as water-cut rather than as a painted stripe.
  let Wet = clamp(Coat.Wet, 0.0, 1.0);
  let Tint = Coat.Tint * mix(1.0, 0.42, Wet);
  let Rough = clamp(mix(Coat.Rough, 0.12, Wet), 0.03, 1.0);

  textureStore(Geometry, vec2i(X, Y), vec4f(Normal, Sky));
  textureStore(Albedo, vec2i(X, Y), vec4f(Tint, Rough));
  textureStore(Masking, vec2i(X, Y),
               vec4f(Daylight[I], Wet, Coat.Snow, clamp(Accum[I].x, 0.0, 1.0)));
}
`;

export class MaterialSolver {
  constructor(Device) {
    this.Device = Device;
    this.Size = 0;
    this.Module = Device.createShaderModule({ code: Kernel, label: "MaterialSolver.Kernel" });

    this.FieldLayout = Device.createBindGroupLayout({
      label: "MaterialSolver.Fields",
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
        { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
        { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
        { binding: 5, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
      ],
    });
    this.TargetLayout = Device.createBindGroupLayout({
      label: "MaterialSolver.Targets",
      entries: [0, 1, 2].map((B) => ({
        binding: B,
        visibility: GPUShaderStage.COMPUTE,
        storageTexture: { access: "write-only", format: "rgba16float", viewDimension: "2d" },
      })),
    });
    const Pipe = Device.createPipelineLayout({ bindGroupLayouts: [this.FieldLayout, this.TargetLayout] });

    this.Pipelines = {};
    for (const Name of ["OccludeMain", "ShadeMain", "ResolveMain"]) {
      this.Pipelines[Name] = Device.createComputePipeline({
        label: `MaterialSolver.${Name}`,
        layout: Pipe,
        compute: { module: this.Module, entryPoint: Name },
      });
    }

    this.SceneBuffer = Device.createBuffer({
      size: 80, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, label: "SceneUniform",
    });
    this.CoatBuffer = Device.createBuffer({
      size: LayerStride * MaxTextureLayers,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, label: "Coats",
    });
    this.CoatBytes = new ArrayBuffer(LayerStride * MaxTextureLayers);
  }

  Allocate(Size, HeightBuffer, AccumBuffer) {
    const Device = this.Device;
    if (this.Size !== Size) {
      if (this.Occlusion) { this.Occlusion.destroy(); this.Daylight.destroy(); }
      if (this.Textures) for (const T of Object.values(this.Textures)) T.destroy();
      const Count = Size * Size;
      this.Occlusion = Device.createBuffer({ size: Count * 4, usage: GPUBufferUsage.STORAGE, label: "Occlusion" });
      this.Daylight = Device.createBuffer({ size: Count * 4, usage: GPUBufferUsage.STORAGE, label: "Daylight" });
      const Make = (Name) => Device.createTexture({
        label: Name,
        size: [Size, Size],
        format: "rgba16float",
        usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC,
      });
      this.Textures = { Geometry: Make("Geometry"), Albedo: Make("Albedo"), Masking: Make("Masking") };
      this.Views = {
        Geometry: this.Textures.Geometry.createView(),
        Albedo: this.Textures.Albedo.createView(),
        Masking: this.Textures.Masking.createView(),
      };
      this.TargetGroup = Device.createBindGroup({
        layout: this.TargetLayout,
        entries: [
          { binding: 0, resource: this.Views.Geometry },
          { binding: 1, resource: this.Views.Albedo },
          { binding: 2, resource: this.Views.Masking },
        ],
      });
      this.Size = Size;
    }
    this.FieldGroup = Device.createBindGroup({
      layout: this.FieldLayout,
      entries: [
        { binding: 0, resource: { buffer: this.SceneBuffer } },
        { binding: 1, resource: { buffer: HeightBuffer } },
        { binding: 2, resource: { buffer: AccumBuffer } },
        { binding: 3, resource: { buffer: this.Occlusion } },
        { binding: 4, resource: { buffer: this.Daylight } },
        { binding: 5, resource: { buffer: this.CoatBuffer } },
      ],
    });
  }

  WriteScene(Scene, SunVector, SunTint, SkyTint) {
    const World = Scene.World;
    const Live = Scene.Texture.filter((L) => L.Enabled).slice(0, MaxTextureLayers);
    const Bytes = new ArrayBuffer(80);
    new Uint32Array(Bytes, 0, 4).set([
      World.Resolution, Live.length, World.Seed >>> 0,
      World.Render.Quality === "Ultra" || World.Render.Quality === "High" ? 1 : 0,
    ]);
    new Float32Array(Bytes, 16, 4).set([
      World.WorldSize, World.HeightScale, World.Water.Level, 0,
    ]);
    new Float32Array(Bytes, 32, 4).set([SunVector[0], SunVector[1], SunVector[2], World.Sun.Intensity]);
    new Float32Array(Bytes, 48, 4).set([SunTint[0], SunTint[1], SunTint[2], 0]);
    new Float32Array(Bytes, 64, 4).set([SkyTint[0], SkyTint[1], SkyTint[2], 0]);
    this.Device.queue.writeBuffer(this.SceneBuffer, 0, Bytes);

    const Context = {
      Seed: World.Seed >>> 0,
      WorldSize: World.WorldSize,
      HeightScale: World.HeightScale,
      Size: World.Resolution,
    };
    for (let I = 0; I < Live.length; I += 1) {
      PackTextureLayer(Live[I], this.CoatBytes, I * LayerStride, Context);
    }
    if (Live.length) {
      this.Device.queue.writeBuffer(this.CoatBuffer, 0, this.CoatBytes, 0, Live.length * LayerStride);
    }
    this.LayerCount = Live.length;
  }

  Run(Which) {
    const Encoder = this.Device.createCommandEncoder({ label: "MaterialSolver.Run" });
    const Pass = Encoder.beginComputePass();
    const Groups = Math.ceil(this.Size / 8);
    for (const Name of Which) {
      Pass.setPipeline(this.Pipelines[Name]);
      Pass.setBindGroup(0, this.FieldGroup);
      Pass.setBindGroup(1, this.TargetGroup);
      Pass.dispatchWorkgroups(Groups, Groups);
    }
    Pass.end();
    this.Device.queue.submit([Encoder.finish()]);
  }
}

export const MaterialKernelSource = Kernel;

// SurfaceProjection — the viewport renderer.
//
// Three passes over a 4× multisampled target: an analytic sky, the terrain grid, and a water plane
// that works out its own depth by sampling the heightfield rather than by reading back a depth
// buffer. Tone mapping happens in each fragment shader, so there is no HDR resolve step to pay for.
//
// The grid carries no vertex buffer. A vertex reads its own height out of the storage buffer the
// solver already owns, which means a rebuilt terrain appears without a single byte being uploaded.

const Shader = /* wgsl */ `
struct ViewUniform {
  ViewClip : mat4x4f,
  ClipView : mat4x4f,
  Eye      : vec4f,
  Sun      : vec4f,
  SunTint  : vec4f,
  SkyTint  : vec4f,
  Terms    : vec4f,
  Water    : vec4f,
  Air      : vec4f,
  Grid     : vec4f,
};

@group(0) @binding(0) var<uniform> View : ViewUniform;
@group(0) @binding(1) var<storage, read> Height : array<f32>;

@group(1) @binding(0) var Smooth   : sampler;
@group(1) @binding(1) var Geometry : texture_2d<f32>;
@group(1) @binding(2) var Albedo   : texture_2d<f32>;
@group(1) @binding(3) var Masking  : texture_2d<f32>;

const Pi : f32 = 3.14159265358979;

fn Extent() -> f32 { return View.Terms.x; }
fn Vertical() -> f32 { return View.Terms.y; }
fn Field() -> f32 { return View.Terms.z; }

fn Raised(X : i32, Y : i32) -> f32 {
  let S = i32(Field());
  return Height[u32(clamp(Y, 0, S - 1) * S + clamp(X, 0, S - 1))];
}

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

fn Slope2(P : vec2i) -> vec2f {
  let A = f32(Churn(u32(P.x) * 73856093u ^ u32(P.y) * 19349663u) & 0x00ffffffu) / 16777216.0 * 6.2831853;
  return vec2f(cos(A), sin(A));
}

// Value and derivative, so a detail bump costs one evaluation instead of three.
fn Grain(Pos : vec2f) -> vec3f {
  let I = floor(Pos);
  let F = Pos - I;
  let U = F * F * F * (F * (F * 6.0 - 15.0) + 10.0);
  let Du = 30.0 * F * F * (F * (F - 2.0) + 1.0);
  let Ii = vec2i(I);
  let Ga = Slope2(Ii + vec2i(0, 0));
  let Gb = Slope2(Ii + vec2i(1, 0));
  let Gc = Slope2(Ii + vec2i(0, 1));
  let Gd = Slope2(Ii + vec2i(1, 1));
  let Va = dot(Ga, F - vec2f(0.0, 0.0));
  let Vb = dot(Gb, F - vec2f(1.0, 0.0));
  let Vc = dot(Gc, F - vec2f(0.0, 1.0));
  let Vd = dot(Gd, F - vec2f(1.0, 1.0));
  let K1 = Vb - Va;
  let K2 = Vc - Va;
  let K3 = Va - Vb - Vc + Vd;
  let Value = Va + K1 * U.x + K2 * U.y + K3 * U.x * U.y;
  let Deriv = Ga + U.x * (Gb - Ga) + U.y * (Gc - Ga) + U.x * U.y * (Ga - Gb - Gc + Gd)
            + Du * vec2f(K1 + K3 * U.y, K2 + K3 * U.x);
  return vec3f(Value, Deriv.x, Deriv.y);
}

// ── Sky ───────────────────────────────────────────────────────────────────────────────────────────
// Not a lookup table and not a cube map: a two-term scattering fit evaluated per pixel, so the same
// function can be called by the terrain shader for aerial perspective and stay consistent.

fn Henyey(Cosine : f32, G : f32) -> f32 {
  let Gg = G * G;
  return (1.0 - Gg) / (4.0 * Pi * pow(max(1.0 + Gg - 2.0 * G * Cosine, 1e-4), 1.5));
}

fn Firmament(Dir : vec3f, WithDisc : bool) -> vec3f {
  let L = normalize(View.Sun.xyz);
  let Up = clamp(L.y, -0.2, 1.0);
  let Turbidity = View.Air.y;
  let Look = clamp(Dir.y, -0.35, 1.0);
  let Cosine = dot(normalize(Dir), L);

  // Daylight falls away steeply once the sun is under about ten degrees.
  let Daylight = smoothstep(-0.12, 0.22, Up);
  let Dusk = 1.0 - smoothstep(-0.02, 0.38, Up);

  let Zenith = mix(vec3f(0.022, 0.045, 0.115), vec3f(0.055, 0.125, 0.295), Daylight);
  let Rim    = mix(vec3f(0.045, 0.055, 0.085), vec3f(0.36, 0.44, 0.56), Daylight);
  let Ember  = mix(vec3f(0.30, 0.12, 0.06), vec3f(1.05, 0.52, 0.22), Daylight);

  // Rayleigh: thicker air toward the horizon, blue because the short wavelengths scatter hardest.
  let Thickness = pow(1.0 - clamp(Look, 0.0, 1.0), 2.6 + Turbidity * 0.22);
  var Colour = mix(Zenith, Rim, Thickness);

  // Mie: the warm halo that collects around the sun and swells as it drops.
  let Halo = Henyey(Cosine, mix(0.62, 0.80, Daylight)) * (0.9 + Turbidity * 0.55);
  Colour = Colour + Ember * Halo * mix(0.35, 1.5, Dusk) * (0.35 + Thickness);
  Colour = Colour + vec3f(1.0, 0.76, 0.52) * pow(max(Cosine, 0.0), 7.0) * 0.06 * Daylight;

  // Below the horizon the view is into haze, not into sky.
  let Ground = mix(vec3f(0.035, 0.032, 0.030), Rim * 0.45, 0.5);
  Colour = mix(Ground, Colour, smoothstep(-0.055, 0.03, Dir.y));

  if (WithDisc) {
    let Disc = smoothstep(0.99965, 0.99992, Cosine);
    let Limb = 1.0 - 0.42 * smoothstep(0.99965, 0.99992, Cosine);
    Colour = Colour + View.SunTint.rgb * Disc * Limb * 14.0 * smoothstep(-0.02, 0.06, Up);
  }
  return Colour * View.Sun.w * 0.2;
}

fn Tonemap(X : vec3f) -> vec3f {
  // ACES fit, Narkowicz.
  let A = 2.51; let B = 0.03; let C = 2.43; let D = 0.59; let E = 0.14;
  return clamp((X * (A * X + B)) / (X * (C * X + D) + E), vec3f(0.0), vec3f(1.0));
}

fn Encode(Linear : vec3f) -> vec3f {
  let C = clamp(Linear, vec3f(0.0), vec3f(1.0));
  return select(1.055 * pow(C, vec3f(1.0 / 2.4)) - 0.055, C * 12.92, C <= vec3f(0.0031308));
}

struct Screen {
  @builtin(position) Place : vec4f,
  @location(0) Uv : vec2f,
};

@vertex
fn SkyVertex(@builtin(vertex_index) Which : u32) -> Screen {
  var Out : Screen;
  let X = f32((Which << 1u) & 2u) * 2.0 - 1.0;
  let Y = f32(Which & 2u) * 2.0 - 1.0;
  Out.Place = vec4f(X, Y, 1.0, 1.0);
  Out.Uv = vec2f(X * 0.5 + 0.5, 0.5 - Y * 0.5);
  return Out;
}

fn RayThrough(Uv : vec2f) -> vec3f {
  let Ndc = vec4f(Uv.x * 2.0 - 1.0, 1.0 - Uv.y * 2.0, 1.0, 1.0);
  let Far = View.ClipView * Ndc;
  return normalize(Far.xyz / Far.w - View.Eye.xyz);
}

@fragment
fn SkyFragment(In : Screen) -> @location(0) vec4f {
  let Dir = RayThrough(In.Uv);
  var Colour = Firmament(Dir, true);
  Colour = Colour * View.Terms.w;
  // A touch of ordered dither, because an 8-bit sky gradient bands badly without it.
  let Noise = (fract(sin(dot(In.Place.xy, vec2f(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;
  return vec4f(Encode(Tonemap(Colour)) + Noise, 1.0);
}

// ── Terrain ───────────────────────────────────────────────────────────────────────────────────────

struct Ground {
  @builtin(position) Place : vec4f,
  @location(0) World : vec3f,
  @location(1) Uv : vec2f,
};

@vertex
fn GroundVertex(@builtin(vertex_index) Which : u32) -> Ground {
  let G = u32(View.Grid.x);
  let Gx = Which % G;
  let Gz = Which / G;
  let Uv = vec2f(f32(Gx), f32(Gz)) / f32(G - 1u);
  let Texel = Uv * (Field() - 1.0);
  let H = Lifted(Texel);

  var Out : Ground;
  let Half = Extent() * 0.5;
  Out.World = vec3f(Uv.x * Extent() - Half, H * Vertical(), Uv.y * Extent() - Half);
  Out.Place = View.ViewClip * vec4f(Out.World, 1.0);
  Out.Uv = Uv;
  return Out;
}

fn Detail(World : vec2f, Distance : f32) -> vec2f {
  // Micro relief, faded out before it can alias into noise at range.
  let Near = 1.0 - smoothstep(Extent() * 0.08, Extent() * 0.45, Distance);
  if (Near <= 0.002) { return vec2f(0.0); }
  let A = Grain(World / 26.0);
  let B = Grain(World / 7.3);
  return (A.yz * 0.55 + B.yz * 0.3) * Near;
}

@fragment
fn GroundFragment(In : Ground) -> @location(0) vec4f {
  let Geo  = textureSample(Geometry, Smooth, In.Uv);
  let Coat = textureSample(Albedo, Smooth, In.Uv);
  let Mask = textureSample(Masking, Smooth, In.Uv);

  let Mode = i32(View.Air.w);
  let Sky = clamp(Geo.w, 0.0, 1.0);
  let Shadow = clamp(Mask.x, 0.0, 1.0);
  let Wet = clamp(Mask.y, 0.0, 1.0);
  let Snow = clamp(Mask.z, 0.0, 1.0);
  let Flow = clamp(Mask.w, 0.0, 1.0);

  let Eye = View.Eye.xyz;
  let Away = In.World - Eye;
  let Distance = length(Away);
  let Look = Away / max(Distance, 1e-4);

  var N = normalize(Geo.xyz);
  let Bump = Detail(In.World.xz, Distance);
  N = normalize(N + vec3f(-Bump.x, 0.0, -Bump.y) * mix(0.12, 0.028, Snow));

  if (Mode == 1) { return vec4f(Encode(Coat.rgb), 1.0); }
  if (Mode == 2) {
    let H = In.World.y / max(Vertical(), 1.0);
    return vec4f(Encode(vec3f(H)), 1.0);
  }
  if (Mode == 3) {
    let Tilt = degrees(acos(clamp(N.y, -1.0, 1.0))) / 90.0;
    return vec4f(Encode(mix(vec3f(0.07, 0.10, 0.14), vec3f(1.0, 0.42, 0.22), Tilt)), 1.0);
  }
  if (Mode == 4) {
    return vec4f(Encode(mix(vec3f(0.04, 0.05, 0.06), vec3f(0.35, 0.72, 1.0), Flow)), 1.0);
  }
  if (Mode == 5) {
    return vec4f(Encode(vec3f(Sky * Shadow)), 1.0);
  }
  if (Mode == 6) {
    return vec4f(Encode(N * 0.5 + 0.5), 1.0);
  }

  let L = normalize(View.Sun.xyz);
  let Vv = -Look;
  let Hv = normalize(L + Vv);
  let NdL = max(dot(N, L), 0.0);
  let NdV = max(dot(N, Vv), 1e-4);
  let NdH = max(dot(N, Hv), 0.0);
  let VdH = max(dot(Vv, Hv), 0.0);

  let Rough = clamp(Coat.w, 0.035, 1.0);
  let A = Rough * Rough;
  let A2 = A * A;
  let Denom = NdH * NdH * (A2 - 1.0) + 1.0;
  let Dist = A2 / max(Pi * Denom * Denom, 1e-6);
  let K = A * 0.5;
  let Gv = NdV / (NdV * (1.0 - K) + K);
  let Gl = NdL / (NdL * (1.0 - K) + K);
  let Base = mix(0.035, 0.072, Wet);
  let Fres = Base + (1.0 - Base) * pow(1.0 - VdH, 5.0);
  let Specular = Dist * Gv * Gl * Fres / (4.0 * NdV * max(NdL, 1e-4));

  // The terminator is softened a little: real ground is not a perfect Lambertian wall.
  let Wrap = clamp((dot(N, L) + 0.18) / 1.18, 0.0, 1.0);
  let Sun = View.SunTint.rgb * View.Sun.w;
  var Colour = Coat.rgb * Wrap * Shadow * Sun / Pi;
  Colour = Colour + Sun * Specular * NdL * Shadow;

  // Sky dome plus a warm bounce off the ground the surface is leaning into.
  // Sky irradiance is the whole dome integrated, not the zenith. Lighting the ground with
  // undiluted zenith blue throws the entire frame blue — measured at a red to blue ratio of 0.91
  // before this, 1.06 after, which is where sunlit rock belongs.
  let Grey = dot(View.SkyTint.rgb, vec3f(0.2126, 0.7152, 0.0722));
  let Pale = mix(View.SkyTint.rgb, vec3f(Grey), 0.55);
  let Dome = Pale * View.Grid.w;
  let Bounce = vec3f(0.30, 0.25, 0.19) * View.Grid.w * 0.45;
  Colour = Colour + Coat.rgb * Sky * (Dome * (0.55 + 0.45 * N.y) + Bounce * (1.0 - 0.6 * N.y));

  // Snow scatters light forward through its top millimetre; without this it reads as white paint.
  if (Snow > 0.01) {
    let Through = pow(clamp(dot(Look, L) * 0.5 + 0.5, 0.0, 1.0), 2.2);
    Colour = Colour + vec3f(0.62, 0.70, 0.86) * Snow * Through * Shadow * View.Sun.w * 0.05;
  }

  if (View.Grid.z > 0.5) {
    // Survey contours, antialiased by the screen-space derivative of the elevation.
    let Step = Vertical() / 28.0;
    let Line = abs(fract(In.World.y / Step - 0.5) - 0.5) / max(fwidth(In.World.y / Step), 1e-5);
    Colour = mix(Colour, Colour * 0.35 + vec3f(0.04, 0.05, 0.05), 1.0 - smoothstep(0.0, 1.4, Line));
  }

  // Aerial perspective, from the same sky function the background uses.
  let Haze = View.Air.x;
  let Column = Distance * exp(-max(In.World.y, 0.0) / 2600.0);
  let Depth = 1.0 - exp(-Column * Haze / 26000.0);
  let Inscatter = Firmament(Look, false)
                + View.SunTint.rgb * Henyey(dot(Look, L), 0.74) * View.Sun.w * 0.26;
  Colour = mix(Colour, Inscatter, clamp(Depth, 0.0, 0.96));

  Colour = Colour * View.Terms.w;
  return vec4f(Encode(Tonemap(Colour)), 1.0);
}

// ── Water ─────────────────────────────────────────────────────────────────────────────────────────

struct Pond {
  @builtin(position) Place : vec4f,
  @location(0) World : vec3f,
};

@vertex
fn WaterVertex(@builtin(vertex_index) Which : u32) -> Pond {
  var Corner = array<vec2f, 6>(
    vec2f(0.0, 0.0), vec2f(1.0, 0.0), vec2f(1.0, 1.0),
    vec2f(0.0, 0.0), vec2f(1.0, 1.0), vec2f(0.0, 1.0));
  let C = Corner[Which];
  let Half = Extent() * 0.5;
  var Out : Pond;
  Out.World = vec3f(C.x * Extent() - Half, View.Water.x * Vertical(), C.y * Extent() - Half);
  Out.Place = View.ViewClip * vec4f(Out.World, 1.0);
  return Out;
}

@fragment
fn WaterFragment(In : Pond) -> @location(0) vec4f {
  let Half = Extent() * 0.5;
  let Uv = (In.World.xz + Half) / Extent();
  let Bed = Lifted(clamp(Uv, vec2f(0.0), vec2f(1.0)) * (Field() - 1.0)) * Vertical();
  let Deep = In.World.y - Bed;
  if (Deep <= 0.0) { discard; }

  let Eye = View.Eye.xyz;
  let Away = In.World - Eye;
  let Distance = length(Away);
  let Look = Away / max(Distance, 1e-4);
  let L = normalize(View.Sun.xyz);

  // Two crossed wave trains, scaled so the ripple stays the same size on screen at any zoom.
  let Time = View.Air.z;
  let Wa = Grain(In.World.xz / 34.0 + vec2f(Time * 0.35, Time * 0.13));
  let Wb = Grain(In.World.xz / 11.0 - vec2f(Time * 0.21, Time * 0.44));
  let Shore = smoothstep(0.0, 26.0, Deep);
  let Ripple = (Wa.yz * 0.030 + Wb.yz * 0.016) * mix(0.25, 1.0, Shore);
  let N = normalize(vec3f(-Ripple.x, 1.0, -Ripple.y));

  let Vv = -Look;
  let Hv = normalize(L + Vv);
  let Fres = 0.02 + 0.98 * pow(1.0 - max(dot(N, Vv), 0.0), 5.0);

  let Sky = Firmament(reflect(Look, N), false);
  let Spec = pow(max(dot(N, Hv), 0.0), mix(900.0, 220.0, View.Water.z)) * 2.4;

  // Beer-Lambert through the water column; red dies first, which is what makes shallows read green.
  let Clarity = mix(7.0, 42.0, View.Water.z);
  let Through = exp(-vec3f(1.0 / 2.6, 1.0 / 9.0, 1.0 / 16.0) * Deep / Clarity);
  let Body = mix(vec3f(0.015, 0.055, 0.075), vec3f(0.03, 0.10, 0.12), View.Water.z);

  var Colour = Body * (1.0 - Fres) + Sky * Fres + View.SunTint.rgb * View.Sun.w * Spec * Fres;
  let Foam = (1.0 - smoothstep(0.0, 9.0 * View.Water.y + 1.0, Deep))
           * clamp(Wb.x * 1.6 + 0.55, 0.0, 1.0);
  Colour = mix(Colour, vec3f(0.78, 0.82, 0.85), Foam * 0.5);

  let Haze = View.Air.x;
  let Depthing = 1.0 - exp(-Distance * Haze / 26000.0);
  Colour = mix(Colour, Firmament(Look, false), clamp(Depthing, 0.0, 0.96));

  let Alpha = clamp(mix(0.30, 0.985, 1.0 - exp(-Deep * 0.22)) + Fres * 0.4 + Foam * 0.4, 0.0, 1.0);
  Colour = Colour * View.Terms.w;
  return vec4f(Encode(Tonemap(Colour)), Alpha * (1.0 - clamp(1.0 - Through.g, 0.0, 0.25)));
}
`;

export class SurfaceProjection {
  constructor(Device, Format) {
    this.Device = Device;
    this.Format = Format;
    this.Samples = 4;
    this.Grid = 0;
    this.Module = Device.createShaderModule({ code: Shader, label: "SurfaceProjection.Shader" });

    this.ViewLayout = Device.createBindGroupLayout({
      label: "SurfaceProjection.View",
      entries: [
        { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
        { binding: 1, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: "read-only-storage" } },
      ],
    });
    this.CoatLayout = Device.createBindGroupLayout({
      label: "SurfaceProjection.Coats",
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
        { binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
        { binding: 3, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
      ],
    });
    const Layout = Device.createPipelineLayout({ bindGroupLayouts: [this.ViewLayout, this.CoatLayout] });

    const Depth = { format: "depth24plus", depthWriteEnabled: true, depthCompare: "less" };
    const Multi = { count: this.Samples };

    this.SkyPipeline = Device.createRenderPipeline({
      label: "Sky", layout: Layout,
      vertex: { module: this.Module, entryPoint: "SkyVertex" },
      fragment: { module: this.Module, entryPoint: "SkyFragment", targets: [{ format: Format }] },
      primitive: { topology: "triangle-list" },
      depthStencil: { format: "depth24plus", depthWriteEnabled: false, depthCompare: "always" },
      multisample: Multi,
    });
    this.GroundPipeline = Device.createRenderPipeline({
      label: "Ground", layout: Layout,
      vertex: { module: this.Module, entryPoint: "GroundVertex" },
      fragment: { module: this.Module, entryPoint: "GroundFragment", targets: [{ format: Format }] },
      primitive: { topology: "triangle-list", cullMode: "none" },
      depthStencil: Depth,
      multisample: Multi,
    });
    this.WaterPipeline = Device.createRenderPipeline({
      label: "Water", layout: Layout,
      vertex: { module: this.Module, entryPoint: "WaterVertex" },
      fragment: {
        module: this.Module, entryPoint: "WaterFragment",
        targets: [{
          format: Format,
          blend: {
            color: { srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha", operation: "add" },
            alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" },
          },
        }],
      },
      primitive: { topology: "triangle-list", cullMode: "none" },
      depthStencil: { format: "depth24plus", depthWriteEnabled: false, depthCompare: "less" },
      multisample: Multi,
    });

    this.ViewBuffer = Device.createBuffer({
      size: 256, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, label: "ViewUniform",
    });
    this.Sampler = Device.createSampler({
      magFilter: "linear", minFilter: "linear", mipmapFilter: "linear",
      addressModeU: "clamp-to-edge", addressModeV: "clamp-to-edge",
    });
    this.Bytes = new ArrayBuffer(256);
  }

  Attach(HeightBuffer, Views) {
    this.ViewGroup = this.Device.createBindGroup({
      layout: this.ViewLayout,
      entries: [
        { binding: 0, resource: { buffer: this.ViewBuffer } },
        { binding: 1, resource: { buffer: HeightBuffer } },
      ],
    });
    this.CoatGroup = this.Device.createBindGroup({
      layout: this.CoatLayout,
      entries: [
        { binding: 0, resource: this.Sampler },
        { binding: 1, resource: Views.Geometry },
        { binding: 2, resource: Views.Albedo },
        { binding: 3, resource: Views.Masking },
      ],
    });
  }

  // (G-1)² quads of two triangles. Built once per grid size and left alone.
  SetGrid(G) {
    if (this.Grid === G) return;
    if (this.Indices) this.Indices.destroy();
    const Quads = (G - 1) * (G - 1);
    const Data = new Uint32Array(Quads * 6);
    let W = 0;
    for (let Z = 0; Z < G - 1; Z += 1) {
      for (let X = 0; X < G - 1; X += 1) {
        const A = Z * G + X;
        Data[W] = A; Data[W + 1] = A + G; Data[W + 2] = A + 1;
        Data[W + 3] = A + 1; Data[W + 4] = A + G; Data[W + 5] = A + G + 1;
        W += 6;
      }
    }
    this.Indices = this.Device.createBuffer({
      size: Data.byteLength, usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST, label: "GridIndices",
    });
    this.Device.queue.writeBuffer(this.Indices, 0, Data);
    this.IndexCount = Data.length;
    this.Grid = G;
  }

  Resize(Width, Height) {
    if (this.Width === Width && this.Height === Height) return;
    if (this.Colour) { this.Colour.destroy(); this.Depth.destroy(); }
    this.Colour = this.Device.createTexture({
      size: [Width, Height], format: this.Format, sampleCount: this.Samples,
      usage: GPUTextureUsage.RENDER_ATTACHMENT, label: "MultisampleColour",
    });
    this.Depth = this.Device.createTexture({
      size: [Width, Height], format: "depth24plus", sampleCount: this.Samples,
      usage: GPUTextureUsage.RENDER_ATTACHMENT, label: "Depth",
    });
    this.ColourView = this.Colour.createView();
    this.DepthView = this.Depth.createView();
    this.Width = Width;
    this.Height = Height;
  }

  WriteView(Camera, Aspect, Scene, Sun, SunTint, SkyTint, Time, ModeIndex) {
    const M = Camera.Matrices(Aspect);
    const F = new Float32Array(this.Bytes);
    F.set(M.ViewClip, 0);
    F.set(Invert4(M.ViewClip), 16);
    const World = Scene.World;
    F.set([M.Eye[0], M.Eye[1], M.Eye[2], 0], 32);
    F.set([Sun[0], Sun[1], Sun[2], World.Sun.Intensity], 36);
    F.set([SunTint[0], SunTint[1], SunTint[2], 0], 40);
    F.set([SkyTint[0], SkyTint[1], SkyTint[2], 0], 44);
    F.set([World.WorldSize, World.HeightScale, World.Resolution, World.Sky.Exposure], 48);
    F.set([World.Water.Level, World.Water.Depth, World.Water.Clarity, World.Water.Enabled ? 1 : 0], 52);
    F.set([World.Sky.Haze, World.Sky.Turbidity, Time, ModeIndex], 56);
    F.set([this.Grid, 0, World.Render.Contours ? 1 : 0, World.Sky.Ambient], 60);
    this.Device.queue.writeBuffer(this.ViewBuffer, 0, this.Bytes);
    return M;
  }

  Draw(Target, Scene) {
    const Encoder = this.Device.createCommandEncoder({ label: "SurfaceProjection.Draw" });
    const Pass = Encoder.beginRenderPass({
      colorAttachments: [{
        view: this.ColourView,
        resolveTarget: Target,
        clearValue: { r: 0.02, g: 0.03, b: 0.04, a: 1 },
        loadOp: "clear",
        storeOp: "discard",
      }],
      depthStencilAttachment: {
        view: this.DepthView, depthClearValue: 1, depthLoadOp: "clear", depthStoreOp: "discard",
      },
    });

    Pass.setBindGroup(0, this.ViewGroup);
    Pass.setBindGroup(1, this.CoatGroup);

    Pass.setPipeline(this.SkyPipeline);
    Pass.draw(3);

    Pass.setPipeline(this.GroundPipeline);
    Pass.setIndexBuffer(this.Indices, "uint32");
    Pass.drawIndexed(this.IndexCount);

    if (Scene.World.Water.Enabled) {
      Pass.setPipeline(this.WaterPipeline);
      Pass.draw(6);
    }

    Pass.end();
    this.Device.queue.submit([Encoder.finish()]);
  }
}

// Local copy so the renderer does not reach into the camera module for one function.
function Invert4(A) {
  const M = new Float32Array(16);
  const S0 = A[0] * A[5] - A[1] * A[4];
  const S1 = A[0] * A[6] - A[2] * A[4];
  const S2 = A[0] * A[7] - A[3] * A[4];
  const S3 = A[1] * A[6] - A[2] * A[5];
  const S4 = A[1] * A[7] - A[3] * A[5];
  const S5 = A[2] * A[7] - A[3] * A[6];
  const C5 = A[10] * A[15] - A[11] * A[14];
  const C4 = A[9] * A[15] - A[11] * A[13];
  const C3 = A[9] * A[14] - A[10] * A[13];
  const C2 = A[8] * A[15] - A[11] * A[12];
  const C1 = A[8] * A[14] - A[10] * A[12];
  const C0 = A[8] * A[13] - A[9] * A[12];
  const Det = S0 * C5 - S1 * C4 + S2 * C3 + S3 * C2 - S4 * C1 + S5 * C0;
  if (Math.abs(Det) < 1e-20) return M;
  const D = 1 / Det;
  M[0] = (A[5] * C5 - A[6] * C4 + A[7] * C3) * D;
  M[1] = (-A[1] * C5 + A[2] * C4 - A[3] * C3) * D;
  M[2] = (A[13] * S5 - A[14] * S4 + A[15] * S3) * D;
  M[3] = (-A[9] * S5 + A[10] * S4 - A[11] * S3) * D;
  M[4] = (-A[4] * C5 + A[6] * C2 - A[7] * C1) * D;
  M[5] = (A[0] * C5 - A[2] * C2 + A[3] * C1) * D;
  M[6] = (-A[12] * S5 + A[14] * S2 - A[15] * S1) * D;
  M[7] = (A[8] * S5 - A[10] * S2 + A[11] * S1) * D;
  M[8] = (A[4] * C4 - A[5] * C2 + A[7] * C0) * D;
  M[9] = (-A[0] * C4 + A[1] * C2 - A[3] * C0) * D;
  M[10] = (A[12] * S4 - A[13] * S2 + A[15] * S0) * D;
  M[11] = (-A[8] * S4 + A[9] * S2 - A[11] * S0) * D;
  M[12] = (-A[4] * C3 + A[5] * C1 - A[6] * C0) * D;
  M[13] = (A[0] * C3 - A[1] * C1 + A[2] * C0) * D;
  M[14] = (-A[12] * S3 + A[13] * S1 - A[14] * S0) * D;
  M[15] = (A[8] * S3 - A[9] * S1 + A[10] * S0) * D;
  return M;
}

export const SurfaceShaderSource = Shader;

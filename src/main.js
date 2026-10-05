const canvas = document.querySelector('#scene-canvas');
const loadingOverlay = document.querySelector('#loading-overlay');
const fallback = document.querySelector('#gpu-fallback');
const gpuError = document.querySelector('#gpu-error');
const gpuStatus = document.querySelector('#gpu-status');
const runToggle = document.querySelector('#run-toggle');
const runLabel = document.querySelector('#run-label');
const runIcon = document.querySelector('#run-icon');
const motionToggle = document.querySelector('#motion-toggle');
const giToggle = document.querySelector('#gi-toggle');
const fieldToggle = document.querySelector('#field-toggle');
const giSlider = document.querySelector('#gi-slider');
const bounceSlider = document.querySelector('#bounce-slider');
const viewSelect = document.querySelector('#view-select');
const rayBudgetLabel = document.querySelector('#ray-count-label');
const realtimeRays = document.querySelector('#realtime-rays');
const canvasRays = document.querySelector('#canvas-rays');
const fpsCount = document.querySelector('#fps-count');
const fieldStatus = document.querySelector('#field-status');

const WORLD_MIN = [-4.2, 0.22, -3.95];
const WORLD_SIZE = [8.4, 4.72, 7.9];
const PROBE_DIMS = [[14, 8, 14], [7, 4, 7], [4, 3, 4]];
const PROBE_BASES = [0, 1568, 1764];
const PROBE_COUNTS = [1568, 196, 48];
const TOTAL_PROBES = 1812;
const SHADOW_SIZE = 1024;
const MAX_TRIANGLES = 512;
const TRIANGLE_FLOATS = 20;
const VERTEX_FLOATS = 12;
const RAY_BUDGETS = { draft: 6, balanced: 12, quality: 20 };
const CASCADE_RAYS = 20;
const COMPUTE_WGSL = /* wgsl */`
struct Triangle {
  a: vec4<f32>,
  b: vec4<f32>,
  c: vec4<f32>,
  albedo: vec4<f32>,
  emission: vec4<f32>,
};

struct ComputeUniforms {
  lightPosition0: vec4<f32>,
  lightColor0: vec4<f32>,
  lightPosition1: vec4<f32>,
  lightColor1: vec4<f32>,
  worldMin: vec4<f32>,
  worldSize: vec4<f32>,
  settings: vec4<f32>,
};

struct HitResult {
  t: f32,
  position: vec3<f32>,
  normal: vec3<f32>,
  albedo: vec3<f32>,
  emission: vec3<f32>,
  found: u32,
};

@group(0) @binding(0) var<uniform> u: ComputeUniforms;
@group(0) @binding(1) var<storage, read> triangles: array<Triangle>;
@group(0) @binding(2) var<storage, read_write> probeRadiance: array<vec4<f32>>;

fn cascadeDims(level: u32) -> vec3<u32> {
  if (level == 0u) { return vec3<u32>(14u, 8u, 14u); }
  if (level == 1u) { return vec3<u32>(7u, 4u, 7u); }
  return vec3<u32>(4u, 3u, 4u);
}

fn cascadeBase(level: u32) -> u32 {
  if (level == 0u) { return 0u; }
  if (level == 1u) { return 1568u; }
  return 1764u;
}

fn probeIndex(level: u32, cell: vec3<u32>) -> u32 {
  let dims = cascadeDims(level);
  return cascadeBase(level) + cell.x + dims.x * (cell.y + dims.y * cell.z);
}

fn sampleCascade(level: u32, worldPosition: vec3<f32>, normal: vec3<f32>) -> vec3<f32> {
  let dims = cascadeDims(level);
  let normalized = clamp((worldPosition - u.worldMin.xyz) / u.worldSize.xyz, vec3<f32>(0.0), vec3<f32>(1.0));
  let grid = clamp(normalized * vec3<f32>(dims) - vec3<f32>(0.5), vec3<f32>(0.0), vec3<f32>(dims) - vec3<f32>(1.0));
  let floored = floor(grid);
  let lo = vec3<u32>(floored);
  let hi = min(lo + vec3<u32>(1u), dims - vec3<u32>(1u));
  let f = grid - floored;
  var l0 = vec3<f32>(0.0);
  var lx = vec3<f32>(0.0);
  var ly = vec3<f32>(0.0);
  var lz = vec3<f32>(0.0);
  for (var z = 0u; z < 2u; z = z + 1u) {
    for (var y = 0u; y < 2u; y = y + 1u) {
      for (var x = 0u; x < 2u; x = x + 1u) {
        let cell = vec3<u32>(select(lo.x, hi.x, x == 1u), select(lo.y, hi.y, y == 1u), select(lo.z, hi.z, z == 1u));
        let wx = select(1.0 - f.x, f.x, x == 1u);
        let wy = select(1.0 - f.y, f.y, y == 1u);
        let wz = select(1.0 - f.z, f.z, z == 1u);
        let weight = wx * wy * wz;
        let base = probeIndex(level, cell) * 4u;
        l0 = l0 + probeRadiance[base].rgb * weight;
        lx = lx + probeRadiance[base + 1u].rgb * weight;
        ly = ly + probeRadiance[base + 2u].rgb * weight;
        lz = lz + probeRadiance[base + 3u].rgb * weight;
      }
    }
  }
  return max(l0 + (lx * normal.x + ly * normal.y + lz * normal.z) * 0.6666667, vec3<f32>(0.0));
}

fn triangleDistance(ro: vec3<f32>, rd: vec3<f32>, tri: Triangle, minT: f32, maxT: f32) -> f32 {
  let edge1 = tri.b.xyz - tri.a.xyz;
  let edge2 = tri.c.xyz - tri.a.xyz;
  let p = cross(rd, edge2);
  let determinant = dot(edge1, p);
  if (abs(determinant) < 0.00001) { return -1.0; }
  let inverseDeterminant = 1.0 / determinant;
  let tvec = ro - tri.a.xyz;
  let uCoord = dot(tvec, p) * inverseDeterminant;
  if (uCoord < 0.0 || uCoord > 1.0) { return -1.0; }
  let q = cross(tvec, edge1);
  let vCoord = dot(rd, q) * inverseDeterminant;
  if (vCoord < 0.0 || uCoord + vCoord > 1.0) { return -1.0; }
  let t = dot(edge2, q) * inverseDeterminant;
  if (t > minT && t < maxT) { return t; }
  return -1.0;
}

fn traceScene(ro: vec3<f32>, rd: vec3<f32>, minT: f32, maxT: f32) -> HitResult {
  var best = HitResult(maxT, vec3<f32>(0.0), vec3<f32>(0.0), vec3<f32>(0.0), vec3<f32>(0.0), 0u);
  let triangleCount = u32(u.settings.x);
  for (var i = 0u; i < triangleCount; i = i + 1u) {
    let tri = triangles[i];
    let t = triangleDistance(ro, rd, tri, minT, best.t);
    if (t > 0.0) {
      best.t = t;
      best.position = ro + rd * t;
      best.normal = normalize(cross(tri.b.xyz - tri.a.xyz, tri.c.xyz - tri.a.xyz));
      if (dot(best.normal, rd) > 0.0) { best.normal = -best.normal; }
      best.albedo = tri.albedo.xyz;
      best.emission = tri.emission.xyz;
      best.found = 1u;
    }
  }
  return best;
}

fn occluded(ro: vec3<f32>, rd: vec3<f32>, maxT: f32) -> bool {
  if (maxT <= 0.035) { return false; }
  let triangleCount = u32(u.settings.x);
  for (var i = 0u; i < triangleCount; i = i + 1u) {
    if (triangleDistance(ro, rd, triangles[i], 0.025, maxT) > 0.0) { return true; }
  }
  return false;
}

fn directFromPoint(position: vec3<f32>, normal: vec3<f32>, albedo: vec3<f32>, lightPosition: vec4<f32>, lightColor: vec4<f32>) -> vec3<f32> {
  let delta = lightPosition.xyz - position;
  let distanceSquared = max(dot(delta, delta), 0.0001);
  let distance = sqrt(distanceSquared);
  let direction = delta / distance;
  let cosine = max(dot(normal, direction), 0.0);
  if (cosine <= 0.001) { return vec3<f32>(0.0); }
  // Keep a small exclusion radius around the point source so its visible emitter mesh does not shadow itself.
  if (occluded(position + normal * 0.025, direction, distance - 0.22)) { return vec3<f32>(0.0); }
  let attenuation = lightPosition.w / (1.0 + 0.075 * distanceSquared + 0.035 * distance);
  return albedo * lightColor.rgb * cosine * attenuation;
}

fn sampleDirection(index: u32, count: u32, probe: u32, level: u32) -> vec3<f32> {
  let fi = f32(index);
  let n = f32(count);
  let z = 1.0 - 2.0 * (fi + 0.5) / n;
  let radial = sqrt(max(0.0, 1.0 - z * z));
  let phase = f32(probe) * 0.754877666 + f32(level) * 1.618033989;
  let phi = fi * 2.39996323 + phase;
  return vec3<f32>(cos(phi) * radial, z, sin(phi) * radial);
}

@compute @workgroup_size(64)
fn updateCascade(@builtin(global_invocation_id) id: vec3<u32>) {
  let level = u32(u.settings.y);
  let dims = cascadeDims(level);
  let probeCount = dims.x * dims.y * dims.z;
  let localIndex = id.x;
  if (localIndex >= probeCount) { return; }
  let x = localIndex % dims.x;
  let y = (localIndex / dims.x) % dims.y;
  let z = localIndex / (dims.x * dims.y);
  let cellCenter = (vec3<f32>(f32(x), f32(y), f32(z)) + vec3<f32>(0.5)) / vec3<f32>(dims);
  let origin = u.worldMin.xyz + cellCenter * u.worldSize.xyz;
  var minDistance = 0.025;
  var maxDistance = 2.2;
  if (level == 1u) { minDistance = 2.2; maxDistance = 5.2; }
  if (level == 2u) { minDistance = 5.2; maxDistance = 10.0; }
  let rayCount = max(1u, u32(u.settings.w));
  var coefficient0 = vec3<f32>(0.0);
  var coefficientX = vec3<f32>(0.0);
  var coefficientY = vec3<f32>(0.0);
  var coefficientZ = vec3<f32>(0.0);
  for (var rayIndex = 0u; rayIndex < ${CASCADE_RAYS}u; rayIndex = rayIndex + 1u) {
    if (rayIndex >= rayCount) { break; }
    let direction = sampleDirection(rayIndex, rayCount, localIndex, level);
    let hit = traceScene(origin, direction, minDistance, maxDistance);
    var radiance = vec3<f32>(0.0);
    if (hit.found == 1u) {
      let direct = directFromPoint(hit.position, hit.normal, hit.albedo, u.lightPosition0, u.lightColor0)
                  + directFromPoint(hit.position, hit.normal, hit.albedo, u.lightPosition1, u.lightColor1);
      let ambient = hit.albedo * vec3<f32>(0.022, 0.035, 0.052) * (0.65 + 0.35 * max(hit.normal.y, 0.0));
      var bounced = vec3<f32>(0.0);
      if (level < 2u) { bounced = sampleCascade(level + 1u, hit.position, hit.normal) * u.settings.z * 0.58; }
      radiance = hit.emission + direct + ambient + hit.albedo * bounced;
    } else if (level == 2u) {
      let sky = mix(vec3<f32>(0.018, 0.032, 0.055), vec3<f32>(0.105, 0.17, 0.25), max(direction.y, 0.0));
      radiance = sky * 0.25;
    }
    coefficient0 = coefficient0 + radiance;
    coefficientX = coefficientX + radiance * direction.x;
    coefficientY = coefficientY + radiance * direction.y;
    coefficientZ = coefficientZ + radiance * direction.z;
  }
  let inverseRayCount = 1.0 / f32(rayCount);
  let outputIndex = (cascadeBase(level) + localIndex) * 4u;
  probeRadiance[outputIndex] = vec4<f32>(coefficient0 * inverseRayCount, 1.0);
  probeRadiance[outputIndex + 1u] = vec4<f32>(coefficientX * (3.0 * inverseRayCount), 0.0);
  probeRadiance[outputIndex + 2u] = vec4<f32>(coefficientY * (3.0 * inverseRayCount), 0.0);
  probeRadiance[outputIndex + 3u] = vec4<f32>(coefficientZ * (3.0 * inverseRayCount), 0.0);
}
`;

const RENDER_WGSL = /* wgsl */`
struct Triangle {
  a: vec4<f32>,
  b: vec4<f32>,
  c: vec4<f32>,
  albedo: vec4<f32>,
  emission: vec4<f32>,
};

struct FrameUniforms {
  viewProjection: mat4x4<f32>,
  shadowViewProjection: mat4x4<f32>,
  cameraPosition: vec4<f32>,
  lightPosition0: vec4<f32>,
  lightColor0: vec4<f32>,
  lightPosition1: vec4<f32>,
  lightColor1: vec4<f32>,
  worldMin: vec4<f32>,
  worldSize: vec4<f32>,
  params: vec4<f32>,
};

@group(0) @binding(0) var<uniform> frame: FrameUniforms;
@group(0) @binding(2) var<storage, read> probeRadiance: array<vec4<f32>>;
@group(0) @binding(3) var shadowDepth: texture_depth_2d;
@group(0) @binding(4) var shadowSampler: sampler_comparison;

struct VertexInput {
  @location(0) position: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) albedo: vec3<f32>,
  @location(3) emission: vec3<f32>,
};

struct VertexOutput {
  @builtin(position) clipPosition: vec4<f32>,
  @location(0) worldPosition: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) albedo: vec3<f32>,
  @location(3) emission: vec3<f32>,
};

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
  var output: VertexOutput;
  output.clipPosition = frame.viewProjection * vec4<f32>(input.position, 1.0);
  output.worldPosition = input.position;
  output.normal = input.normal;
  output.albedo = input.albedo;
  output.emission = input.emission;
  return output;
}

fn cascadeDims(level: u32) -> vec3<u32> {
  if (level == 0u) { return vec3<u32>(14u, 8u, 14u); }
  if (level == 1u) { return vec3<u32>(7u, 4u, 7u); }
  return vec3<u32>(4u, 3u, 4u);
}

fn cascadeBase(level: u32) -> u32 {
  if (level == 0u) { return 0u; }
  if (level == 1u) { return 1568u; }
  return 1764u;
}

fn probeIndex(level: u32, cell: vec3<u32>) -> u32 {
  let dims = cascadeDims(level);
  return cascadeBase(level) + cell.x + dims.x * (cell.y + dims.y * cell.z);
}

fn sampleCascade(level: u32, worldPosition: vec3<f32>, normal: vec3<f32>) -> vec3<f32> {
  let dims = cascadeDims(level);
  let normalized = clamp((worldPosition - frame.worldMin.xyz) / frame.worldSize.xyz, vec3<f32>(0.0), vec3<f32>(1.0));
  let grid = clamp(normalized * vec3<f32>(dims) - vec3<f32>(0.5), vec3<f32>(0.0), vec3<f32>(dims) - vec3<f32>(1.0));
  let floored = floor(grid);
  let lo = vec3<u32>(floored);
  let hi = min(lo + vec3<u32>(1u), dims - vec3<u32>(1u));
  let f = grid - floored;
  var l0 = vec3<f32>(0.0);
  var lx = vec3<f32>(0.0);
  var ly = vec3<f32>(0.0);
  var lz = vec3<f32>(0.0);
  for (var z = 0u; z < 2u; z = z + 1u) {
    for (var y = 0u; y < 2u; y = y + 1u) {
      for (var x = 0u; x < 2u; x = x + 1u) {
        let cell = vec3<u32>(select(lo.x, hi.x, x == 1u), select(lo.y, hi.y, y == 1u), select(lo.z, hi.z, z == 1u));
        let wx = select(1.0 - f.x, f.x, x == 1u);
        let wy = select(1.0 - f.y, f.y, y == 1u);
        let wz = select(1.0 - f.z, f.z, z == 1u);
        let weight = wx * wy * wz;
        let base = probeIndex(level, cell) * 4u;
        l0 = l0 + probeRadiance[base].rgb * weight;
        lx = lx + probeRadiance[base + 1u].rgb * weight;
        ly = ly + probeRadiance[base + 2u].rgb * weight;
        lz = lz + probeRadiance[base + 3u].rgb * weight;
      }
    }
  }
  return max(l0 + (lx * normal.x + ly * normal.y + lz * normal.z) * 0.6666667, vec3<f32>(0.0));
}

fn shadowVisibility(position: vec3<f32>, normal: vec3<f32>) -> f32 {
  let biasedPosition = position + normal * 0.018;
  let shadowClip = frame.shadowViewProjection * vec4<f32>(biasedPosition, 1.0);
  if (shadowClip.w <= 0.0) { return 1.0; }
  let ndc = shadowClip.xyz / shadowClip.w;
  let uv = vec2<f32>(ndc.x * 0.5 + 0.5, 0.5 - ndc.y * 0.5);
  if (uv.x < 0.002 || uv.x > 0.998 || uv.y < 0.002 || uv.y > 0.998 || ndc.z <= 0.0 || ndc.z >= 1.0) { return 1.0; }
  let lightDirection = normalize(frame.lightPosition0.xyz - position);
  let bias = 0.0012 + (1.0 - max(dot(normal, lightDirection), 0.0)) * 0.0008;
  return textureSampleCompare(shadowDepth, shadowSampler, uv, ndc.z - bias);
}

fn pointLight(position: vec3<f32>, normal: vec3<f32>, lightPosition: vec4<f32>, lightColor: vec4<f32>) -> vec3<f32> {
  let delta = lightPosition.xyz - position;
  let distanceSquared = max(dot(delta, delta), 0.0001);
  let direction = delta * inverseSqrt(distanceSquared);
  let lambert = max(dot(normal, direction), 0.0);
  let attenuation = lightPosition.w / (1.0 + 0.075 * distanceSquared + 0.035 * sqrt(distanceSquared));
  return lightColor.rgb * lambert * attenuation;
}

fn toneMap(color: vec3<f32>) -> vec3<f32> {
  let mapped = color / (vec3<f32>(1.0) + max(color, vec3<f32>(0.0)));
  return pow(max(mapped, vec3<f32>(0.0)), vec3<f32>(1.0 / 2.2));
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
  let normal = normalize(input.normal);
  let nearField = sampleCascade(0u, input.worldPosition, normal);
  let midField = sampleCascade(1u, input.worldPosition, normal);
  let farField = sampleCascade(2u, input.worldPosition, normal);
  let cache = nearField * 0.52 + midField * 0.31 + farField * 0.17;
  let albedo = input.albedo;
  let ambient = albedo * vec3<f32>(0.035, 0.047, 0.064);
  let shadow = shadowVisibility(input.worldPosition, normal);
  let direct = albedo * (pointLight(input.worldPosition, normal, frame.lightPosition0, frame.lightColor0) * shadow
                       + pointLight(input.worldPosition, normal, frame.lightPosition1, frame.lightColor1));
  let indirect = albedo * cache * frame.params.x;
  let viewDirection = normalize(frame.cameraPosition.xyz - input.worldPosition);
  let rim = pow(1.0 - max(dot(normal, viewDirection), 0.0), 3.0) * vec3<f32>(0.045, 0.09, 0.105);
  var color = ambient + direct + indirect + input.emission + rim;
  let mode = u32(frame.params.z + 0.5);
  if (mode == 1u) { color = nearField * 1.35 + vec3<f32>(0.015, 0.065, 0.055); }
  if (mode == 2u) { color = midField * 1.55 + vec3<f32>(0.055, 0.025, 0.09); }
  if (mode == 3u) { color = farField * 1.8 + vec3<f32>(0.095, 0.05, 0.012); }
  if (mode == 4u) { color = normal * 0.5 + vec3<f32>(0.5); }
  if (mode == 5u) { color = albedo * 0.8 + input.emission * 0.35; }
  if (mode == 6u) { color = albedo * cache * frame.params.x * 2.4; }
  if (mode == 7u) { color = vec3<f32>(shadow * 4.0); }
  return vec4<f32>(toneMap(color), 1.0);
}
`;

const SHADOW_WGSL = /* wgsl */`
struct ShadowUniforms {
  lightViewProjection: mat4x4<f32>,
};

@group(0) @binding(0) var<uniform> shadow: ShadowUniforms;

struct ShadowVertexInput {
  @location(0) position: vec3<f32>,
};

@vertex
fn shadowVertex(input: ShadowVertexInput) -> @builtin(position) vec4<f32> {
  return shadow.lightViewProjection * vec4<f32>(input.position, 1.0);
}
`;

const state = {
  device: null,
  context: null,
  format: null,
  depthTexture: null,
  shadowTexture: null,
  shadowSampler: null,
  shadowPipeline: null,
  shadowBindGroup: null,
  shadowUniformBuffer: null,
  renderPipeline: null,
  computePipeline: null,
  renderBindGroup: null,
  computeBindGroups: [],
  frameBuffer: null,
  computeUniformBuffers: [],
  triangleBuffer: null,
  vertexBuffer: null,
  shadowVertexBuffer: null,
  shadowTriangleCount: 0,
  radianceBuffer: null,
  width: 0,
  height: 0,
  playing: true,
  moving: true,
  refreshField: true,
  giEnabled: true,
  time: 0,
  frozenTime: 0,
  gain: Number(giSlider.value),
  bounce: Number(bounceSlider.value),
  viewMode: Number(viewSelect.value),
  quality: 'balanced',
  rayCount: RAY_BUDGETS.balanced,
  yaw: 0,
  pitch: 0.14,
  distance: 11.3,
  target: [0, 1.62, -0.08],
  lastFrameTime: 0,
  frameCount: 0,
  fpsMark: performance.now(),
  initialized: false,
  lastMeshTime: Number.NaN,
  triangleCount: 0,
  dynamicTriangleCount: 0,
  resizeObserver: null,
};

const lights = [
  { position: [-2.55, 3.78, 1.25], power: 19.0, color: [1.0, 0.55, 0.29] },
  { position: [2.65, 3.14, -1.45], power: 15.0, color: [0.20, 0.67, 1.0] },
];

const staticTriangles = [];
const dynamicObjects = [];
let currentTriangles = [];

function addTriangle(output, a, b, c, albedo, emission = [0, 0, 0], expectedNormal = null, castsShadow = true) {
  let p0 = [...a], p1 = [...b], p2 = [...c];
  let n = normalize3(cross3(sub3(p1, p0), sub3(p2, p0)));
  if (expectedNormal && dot3(n, expectedNormal) < 0) {
    [p1, p2] = [p2, p1];
    n = normalize3(cross3(sub3(p1, p0), sub3(p2, p0)));
  }
  output.push({ a: p0, b: p1, c: p2, normal: n, albedo: [...albedo], emission: [...emission], castsShadow });
}

function addQuad(output, points, albedo, normal, emission = [0, 0, 0]) {
  addTriangle(output, points[0], points[1], points[2], albedo, emission, normal);
  addTriangle(output, points[0], points[2], points[3], albedo, emission, normal);
}

function addBox(output, min, max, albedo, emission = [0, 0, 0]) {
  const [x0, y0, z0] = min;
  const [x1, y1, z1] = max;
  const faces = [
    { p: [[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]], n: [0,0,1] },
    { p: [[x1,y0,z0],[x0,y0,z0],[x0,y1,z0],[x1,y1,z0]], n: [0,0,-1] },
    { p: [[x0,y0,z0],[x0,y0,z1],[x0,y1,z1],[x0,y1,z0]], n: [-1,0,0] },
    { p: [[x1,y0,z1],[x1,y0,z0],[x1,y1,z0],[x1,y1,z1]], n: [1,0,0] },
    { p: [[x0,y1,z1],[x1,y1,z1],[x1,y1,z0],[x0,y1,z0]], n: [0,1,0] },
    { p: [[x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1]], n: [0,-1,0] },
  ];
  for (const face of faces) addQuad(output, face.p, albedo, face.n, emission);
}

function buildStaticScene() {
  // Open-front architectural lightwell.
  addQuad(staticTriangles, [[-4.65,0,-4.55],[4.65,0,-4.55],[4.65,0,4.55],[-4.65,0,4.55]], [0.105,0.145,0.17], [0,1,0]);
  addQuad(staticTriangles, [[-4.65,0,-4.55],[4.65,0,-4.55],[4.65,5.05,-4.55],[-4.65,5.05,-4.55]], [0.09,0.135,0.16], [0,0,1]);
  addQuad(staticTriangles, [[-4.65,0,4.55],[-4.65,0,-4.55],[-4.65,5.05,-4.55],[-4.65,5.05,4.55]], [0.105,0.16,0.17], [1,0,0]);
  addQuad(staticTriangles, [[4.65,0,-4.55],[4.65,0,4.55],[4.65,5.05,4.55],[4.65,5.05,-4.55]], [0.12,0.135,0.18], [-1,0,0]);
  addQuad(staticTriangles, [[-4.65,5.05,4.55],[4.65,5.05,4.55],[4.65,5.05,-4.55],[-4.65,5.05,-4.55]], [0.065,0.09,0.115], [0,-1,0]);

  // Inset floor guides, raised slightly to avoid depth fighting.
  const gridColor = [0.18, 0.245, 0.26];
  for (let x = -4; x <= 4; x += 1) {
    addQuad(staticTriangles, [[x-0.008,0.012,-4.35],[x+0.008,0.012,-4.35],[x+0.008,0.012,4.35],[x-0.008,0.012,4.35]], gridColor, [0,1,0]);
  }
  for (let z = -4; z <= 4; z += 1) {
    addQuad(staticTriangles, [[-4.45,0.013,z-0.008],[4.45,0.013,z-0.008],[4.45,0.013,z+0.008],[-4.45,0.013,z+0.008]], gridColor, [0,1,0]);
  }

  // Wall ribs and luminous architectural panels.
  for (const x of [-3.75, -1.65, 0.45, 2.55, 3.9]) {
    addBox(staticTriangles, [x,0.3,-4.51], [x+0.045,4.72,-4.40], [0.17,0.23,0.25]);
  }
  addQuad(staticTriangles, [[-3.15,3.68,-4.48],[-2.15,3.68,-4.48],[-2.15,4.38,-4.48],[-3.15,4.38,-4.48]], [0.28,0.20,0.11], [0,0,1], [4.4,1.38,0.39]);
  addQuad(staticTriangles, [[2.05,2.82,-4.48],[3.16,2.82,-4.48],[3.16,3.55,-4.48],[2.05,3.55,-4.48]], [0.12,0.25,0.3], [0,0,1], [0.22,2.0,3.5]);
  addQuad(staticTriangles, [[-4.53,2.78,-2.3],[-4.53,2.78,-1.3],[-4.53,3.58,-1.3],[-4.53,3.58,-2.3]], [0.2,0.22,0.14], [1,0,0], [2.2,1.5,0.35]);

  // Raised display plinths and simple architectural blocks.
  addBox(staticTriangles, [-1.42,0,-1.08], [1.42,0.42,1.08], [0.12,0.18,0.21]);
  addBox(staticTriangles, [-1.23,0.42,-0.91], [1.23,0.49,0.91], [0.20,0.28,0.30]);
  addBox(staticTriangles, [-2.88,0,-0.62], [-1.86,0.31,0.4], [0.10,0.16,0.21]);
  addBox(staticTriangles, [1.88,0,-1.88], [2.85,0.28,-0.91], [0.13,0.16,0.23]);

  // A pair of faceted, fixed luminous markers make the point-light positions legible.
  const lampA = makePolyhedron(0.17, 'ico', [0.7,0.43,0.23], [2.8,1.1,0.38]);
  appendTransformed(staticTriangles, lampA, [-2.55,3.78,1.25], [0.25,0.45,0.0], 1.0, 1.0, false);
  const lampB = makePolyhedron(0.15, 'ico', [0.18,0.52,0.7], [0.1,1.2,2.1]);
  appendTransformed(staticTriangles, lampB, [2.65,3.14,-1.45], [0.3,0.15,0.4], 1.0, 1.0, false);
}

function makePolyhedron(radius, type, albedo, emission) {
  let vertices;
  let faces;
  if (type === 'ico') {
    const phi = (1 + Math.sqrt(5)) / 2;
    vertices = [
      [-1,phi,0],[1,phi,0],[-1,-phi,0],[1,-phi,0],
      [0,-1,phi],[0,1,phi],[0,-1,-phi],[0,1,-phi],
      [phi,0,-1],[phi,0,1],[-phi,0,-1],[-phi,0,1],
    ].map((p) => scale3(normalize3(p), radius));
    faces = [
      [0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],
      [1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],
      [3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],
      [4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1],
    ];
  } else if (type === 'tetra') {
    vertices = [[1,1,1],[-1,-1,1],[-1,1,-1],[1,-1,-1]].map((p) => scale3(normalize3(p), radius));
    faces = [[0,1,2],[0,3,1],[0,2,3],[1,3,2]];
  } else {
    vertices = [[0,radius,0],[radius,0,0],[0,0,radius],[-radius,0,0],[0,0,-radius],[0,-radius,0]];
    faces = [[0,1,2],[0,2,3],[0,3,4],[0,4,1],[5,2,1],[5,3,2],[5,4,3],[5,1,4]];
  }
  const palette = [albedo, mix3(albedo, [0.18,0.72,0.72], 0.22), mix3(albedo, [0.53,0.32,0.82], 0.24), mix3(albedo, [0.95,0.56,0.28], 0.20)];
  return faces.map((face, index) => {
    let [a,b,c] = face.map((i) => [...vertices[i]]);
    const n = normalize3(cross3(sub3(b,a), sub3(c,a)));
    const centroid = scale3(add3(add3(a,b),c), 1/3);
    if (dot3(n,centroid) < 0) [b,c] = [c,b];
    const emissiveFace = index % 5 === 0 || (type === 'tetra' && index === 1);
    const faceEmission = emissiveFace ? [...emission] : [emission[0]*0.045, emission[1]*0.045, emission[2]*0.045];
    return { a, b, c, albedo: [...palette[index % palette.length]], emission: faceEmission };
  });
}

function appendTransformed(output, template, position, rotation, scale = 1, emissionScale = 1, castsShadow = true) {
  for (const tri of template) {
    const a = add3(rotate3(scale3(tri.a, scale), rotation), position);
    const b = add3(rotate3(scale3(tri.b, scale), rotation), position);
    const c = add3(rotate3(scale3(tri.c, scale), rotation), position);
    const normal = normalize3(cross3(sub3(b,a), sub3(c,a)));
    const emission = tri.emission.map((v) => v * emissionScale);
    addTriangle(output, a, b, c, tri.albedo, emission, normal, castsShadow);
  }
}

function buildDynamicObjects() {
  dynamicObjects.push({
    template: makePolyhedron(0.79, 'ico', [0.11,0.44,0.49], [0.08,0.72,0.82]),
    transform: (time) => ({
      position: [Math.sin(time * 0.72) * 0.30, 1.68 + Math.sin(time * 1.27) * 0.20, 0.02],
      rotation: [0.30 + Math.sin(time * 0.42) * 0.16, time * 0.56, time * 0.19],
      scale: 1.0 + Math.sin(time * 1.1) * 0.035,
      emissionScale: 0.8 + (Math.sin(time * 1.8) + 1) * 0.16,
    }),
  });
  dynamicObjects.push({
    template: makePolyhedron(0.59, 'tetra', [0.60,0.27,0.14], [0.86,0.29,0.09]),
    transform: (time) => ({
      position: [-2.22 + Math.cos(time * 0.74) * 0.30, 1.04 + Math.sin(time * 1.48) * 0.19, -0.45],
      rotation: [time * 0.36, -time * 0.68, 0.4 + time * 0.21],
      scale: 0.88 + Math.sin(time * 1.2) * 0.04,
      emissionScale: 0.72 + (Math.cos(time * 1.6) + 1) * 0.18,
    }),
  });
  dynamicObjects.push({
    template: makePolyhedron(0.46, 'ico', [0.23,0.27,0.58], [0.32,0.18,0.95]),
    transform: (time) => ({
      position: [2.08 + Math.sin(time * 0.62 + 1.2) * 0.27, 1.32 + Math.cos(time * 1.05) * 0.22, -1.43],
      rotation: [0.2 + time * 0.41, time * 0.73, -time * 0.24],
      scale: 0.87 + Math.sin(time * 0.9) * 0.055,
      emissionScale: 0.74 + (Math.sin(time * 1.45 + 1) + 1) * 0.18,
    }),
  });
}

function assembleScene(time, force = false) {
  const geometryTime = state.moving ? time : state.frozenTime;
  if (!force && geometryTime === state.lastMeshTime) return;
  state.lastMeshTime = geometryTime;
  const movingTriangles = [];
  for (const object of dynamicObjects) {
    const transform = object.transform(geometryTime);
    appendTransformed(movingTriangles, object.template, transform.position, transform.rotation, transform.scale, transform.emissionScale);
  }
  currentTriangles = staticTriangles.concat(movingTriangles);
  state.triangleCount = currentTriangles.length;
  state.dynamicTriangleCount = movingTriangles.length;
  document.querySelector('#triangle-count').textContent = state.triangleCount.toLocaleString();
  document.querySelector('#canvas-triangles').textContent = state.dynamicTriangleCount.toLocaleString();
  if (state.device) uploadGeometry();
}

function uploadGeometry() {
  if (state.triangleCount > MAX_TRIANGLES) throw new Error(`Scene has ${state.triangleCount} triangles, exceeding the ${MAX_TRIANGLES}-triangle streaming buffer.`);
  const triangleData = new Float32Array(state.triangleCount * TRIANGLE_FLOATS);
  const vertexData = new Float32Array(state.triangleCount * 3 * VERTEX_FLOATS);
  const shadowTriangleCount = currentTriangles.reduce((count, tri) => count + (tri.castsShadow === false ? 0 : 1), 0);
  const shadowVertexData = new Float32Array(shadowTriangleCount * 3 * VERTEX_FLOATS);
  let vertexOffset = 0;
  let shadowVertexOffset = 0;
  for (let index = 0; index < state.triangleCount; index++) {
    const tri = currentTriangles[index];
    const normal = normalize3(cross3(sub3(tri.b, tri.a), sub3(tri.c, tri.a)));
    const triOffset = index * TRIANGLE_FLOATS;
    triangleData.set([tri.a[0],tri.a[1],tri.a[2],0, tri.b[0],tri.b[1],tri.b[2],0, tri.c[0],tri.c[1],tri.c[2],0, tri.albedo[0],tri.albedo[1],tri.albedo[2],0, tri.emission[0],tri.emission[1],tri.emission[2],0], triOffset);
    for (const p of [tri.a, tri.b, tri.c]) {
      const vertex = [p[0],p[1],p[2], normal[0],normal[1],normal[2], tri.albedo[0],tri.albedo[1],tri.albedo[2], tri.emission[0],tri.emission[1],tri.emission[2]];
      vertexData.set(vertex, vertexOffset);
      vertexOffset += VERTEX_FLOATS;
      if (tri.castsShadow !== false) {
        shadowVertexData.set(vertex, shadowVertexOffset);
        shadowVertexOffset += VERTEX_FLOATS;
      }
    }
  }
  state.shadowTriangleCount = shadowTriangleCount;
  state.device.queue.writeBuffer(state.triangleBuffer, 0, triangleData);
  state.device.queue.writeBuffer(state.vertexBuffer, 0, vertexData);
  state.device.queue.writeBuffer(state.shadowVertexBuffer, 0, shadowVertexData);
}

function vec3(x,y,z) { return [x,y,z]; }
function add3(a,b) { return [a[0]+b[0],a[1]+b[1],a[2]+b[2]]; }
function sub3(a,b) { return [a[0]-b[0],a[1]-b[1],a[2]-b[2]]; }
function scale3(a,s) { return [a[0]*s,a[1]*s,a[2]*s]; }
function dot3(a,b) { return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]; }
function cross3(a,b) { return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]; }
function length3(a) { return Math.sqrt(dot3(a,a)); }
function normalize3(a) { const length = length3(a) || 1; return [a[0]/length,a[1]/length,a[2]/length]; }
function mix3(a,b,t) { return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t]; }
function rotate3(point, rotation) {
  let [x,y,z] = point;
  const [rx,ry,rz] = rotation;
  let c = Math.cos(rx), s = Math.sin(rx); [y,z] = [y*c-z*s, y*s+z*c];
  c = Math.cos(ry); s = Math.sin(ry); [x,z] = [x*c+z*s, -x*s+z*c];
  c = Math.cos(rz); s = Math.sin(rz); [x,y] = [x*c-y*s, x*s+y*c];
  return [x,y,z];
}

function perspective(fovy, aspect, near, far) {
  const f = 1 / Math.tan(fovy / 2);
  const out = new Float32Array(16);
  out[0] = f / aspect;
  out[5] = f;
  out[10] = far / (near - far);
  out[11] = -1;
  out[14] = (far * near) / (near - far);
  return out;
}

function lookAt(eye, target, up = [0,1,0]) {
  const z = normalize3(sub3(eye, target));
  const x = normalize3(cross3(up, z));
  const y = cross3(z, x);
  return new Float32Array([
    x[0],y[0],z[0],0,
    x[1],y[1],z[1],0,
    x[2],y[2],z[2],0,
    -dot3(x,eye),-dot3(y,eye),-dot3(z,eye),1,
  ]);
}

function multiply4(a, b) {
  const out = new Float32Array(16);
  for (let column = 0; column < 4; column++) {
    for (let row = 0; row < 4; row++) {
      out[column*4+row] = a[row] * b[column*4] + a[4+row] * b[column*4+1] + a[8+row] * b[column*4+2] + a[12+row] * b[column*4+3];
    }
  }
  return out;
}

function failGpu(reason) {
  console.error('Radiance Lab WebGPU initialization failed:', reason);
  gpuStatus.classList.add('error');
  gpuStatus.querySelector('span:last-child').textContent = 'GPU UNAVAILABLE';
  gpuError.textContent = String(reason?.message || reason || 'No WebGPU adapter was found.');
  fallback.hidden = false;
  loadingOverlay.classList.add('is-hidden');
  fieldStatus.textContent = 'FIELD OFFLINE';
  fieldStatus.style.color = '#ed9c8d';
}

async function compileShader(module, label) {
  if (!module.getCompilationInfo) return;
  const info = await module.getCompilationInfo();
  const errors = info.messages.filter((message) => message.type === 'error');
  if (errors.length) {
    throw new Error(`${label}: ${errors.map((error) => `line ${error.lineNum}: ${error.message}`).join('\n')}`);
  }
}

async function initializeGpu() {
  if (!navigator.gpu) throw new Error('navigator.gpu is not available. Use a current browser with WebGPU enabled over HTTPS or localhost.');
  const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
  if (!adapter) throw new Error('The browser did not return a WebGPU adapter. Check hardware acceleration and GPU availability.');
  state.device = await adapter.requestDevice({ label: 'Radiance Lab device' });
  state.device.lost.then((info) => {
    if (info.reason !== 'destroyed') failGpu(`GPU device lost: ${info.message || info.reason}`);
  });
  state.context = canvas.getContext('webgpu');
  if (!state.context) throw new Error('Could not create a WebGPU canvas context.');
  state.format = navigator.gpu.getPreferredCanvasFormat();
  state.context.configure({ device: state.device, format: state.format, alphaMode: 'opaque' });

  const computeModule = state.device.createShaderModule({ label: 'Radiance cascade compute shader', code: COMPUTE_WGSL });
  const renderModule = state.device.createShaderModule({ label: 'GI mesh render shader', code: RENDER_WGSL });
  const shadowModule = state.device.createShaderModule({ label: 'Point-light shadow-map shader', code: SHADOW_WGSL });
  await Promise.all([
    compileShader(computeModule, 'Compute shader'),
    compileShader(renderModule, 'Render shader'),
    compileShader(shadowModule, 'Shadow shader'),
  ]);

  state.computePipeline = await state.device.createComputePipelineAsync({
    label: 'Probe cascade update',
    layout: 'auto',
    compute: { module: computeModule, entryPoint: 'updateCascade' },
  });
  state.renderPipeline = await state.device.createRenderPipelineAsync({
    label: 'Lit scene mesh',
    layout: 'auto',
    vertex: {
      module: renderModule,
      entryPoint: 'vertexMain',
      buffers: [{
        arrayStride: VERTEX_FLOATS * 4,
        attributes: [
          { shaderLocation: 0, offset: 0, format: 'float32x3' },
          { shaderLocation: 1, offset: 12, format: 'float32x3' },
          { shaderLocation: 2, offset: 24, format: 'float32x3' },
          { shaderLocation: 3, offset: 36, format: 'float32x3' },
        ],
      }],
    },
    fragment: { module: renderModule, entryPoint: 'fragmentMain', targets: [{ format: state.format }] },
    primitive: { topology: 'triangle-list', cullMode: 'none' },
    depthStencil: { format: 'depth24plus', depthWriteEnabled: true, depthCompare: 'less' },
  });
  state.shadowPipeline = await state.device.createRenderPipelineAsync({
    label: 'Dynamic point-light shadow map',
    layout: 'auto',
    vertex: {
      module: shadowModule,
      entryPoint: 'shadowVertex',
      buffers: [{ arrayStride: VERTEX_FLOATS * 4, attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }] }],
    },
    primitive: { topology: 'triangle-list', cullMode: 'none' },
    depthStencil: { format: 'depth32float', depthWriteEnabled: true, depthCompare: 'less', depthBias: 2, depthBiasSlopeScale: 1.5 },
  });

  state.triangleBuffer = state.device.createBuffer({ label: 'Animated triangle scene', size: MAX_TRIANGLES * TRIANGLE_FLOATS * 4, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
  state.vertexBuffer = state.device.createBuffer({ label: 'Scene render vertices', size: MAX_TRIANGLES * 3 * VERTEX_FLOATS * 4, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
  state.shadowVertexBuffer = state.device.createBuffer({ label: 'Shadow-casting vertices', size: MAX_TRIANGLES * 3 * VERTEX_FLOATS * 4, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
  state.radianceBuffer = state.device.createBuffer({ label: 'Three-level probe radiance', size: TOTAL_PROBES * 4 * 16, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
  state.frameBuffer = state.device.createBuffer({ label: 'View, shadow, and lighting uniforms', size: 256, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  state.shadowUniformBuffer = state.device.createBuffer({ label: 'Point-light view projection', size: 64, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  state.shadowTexture = state.device.createTexture({
    label: 'Dynamic point-light depth map',
    size: [SHADOW_SIZE, SHADOW_SIZE],
    format: 'depth32float',
    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
  });
  state.shadowSampler = state.device.createSampler({ compare: 'less-equal', minFilter: 'linear', magFilter: 'linear' });
  state.computeUniformBuffers = PROBE_COUNTS.map((_, level) => state.device.createBuffer({ label: `Cascade ${level} uniforms`, size: 112, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST }));

  state.shadowBindGroup = state.device.createBindGroup({
    label: 'Shadow map bindings',
    layout: state.shadowPipeline.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: { buffer: state.shadowUniformBuffer } }],
  });
  const computeLayout = state.computePipeline.getBindGroupLayout(0);
  state.computeBindGroups = state.computeUniformBuffers.map((uniformBuffer, level) => state.device.createBindGroup({
    label: `Cascade ${level} bindings`,
    layout: computeLayout,
    entries: [
      { binding: 0, resource: { buffer: uniformBuffer } },
      { binding: 1, resource: { buffer: state.triangleBuffer } },
      { binding: 2, resource: { buffer: state.radianceBuffer } },
    ],
  }));
  state.renderBindGroup = state.device.createBindGroup({
    label: 'Lit scene bindings',
    layout: state.renderPipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: state.frameBuffer } },
      { binding: 2, resource: { buffer: state.radianceBuffer } },
      { binding: 3, resource: state.shadowTexture.createView() },
      { binding: 4, resource: state.shadowSampler },
    ],
  });
  resizeCanvas();
  assembleScene(state.time, true);
  state.initialized = true;
  gpuStatus.querySelector('span:last-child').textContent = 'WEBGPU / ACTIVE';
  loadingOverlay.classList.add('is-hidden');
  document.querySelector('#probe-count').innerHTML = `${TOTAL_PROBES.toLocaleString()} <i>probes</i>`;
  updateRayReadouts();
  requestAnimationFrame(frame);
}

function resizeCanvas() {
  if (!state.device || !state.context) return;
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 1.65);
  const width = Math.max(1, Math.round(rect.width * dpr));
  const height = Math.max(1, Math.round(rect.height * dpr));
  if (width === state.width && height === state.height) return;
  state.width = width;
  state.height = height;
  canvas.width = width;
  canvas.height = height;
  state.depthTexture?.destroy();
  state.depthTexture = state.device.createTexture({
    label: 'Scene depth buffer',
    size: [width, height],
    format: 'depth24plus',
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
  });
}

function writeUniforms() {
  const aspect = state.width / Math.max(state.height, 1);
  const projection = perspective(47 * Math.PI / 180, aspect, 0.08, 45);
  const cp = Math.cos(state.pitch);
  const eye = [
    state.target[0] + Math.sin(state.yaw) * cp * state.distance,
    state.target[1] + Math.sin(state.pitch) * state.distance,
    state.target[2] + Math.cos(state.yaw) * cp * state.distance,
  ];
  const viewProjection = multiply4(projection, lookAt(eye, state.target));
  const shadowProjection = perspective(108 * Math.PI / 180, 1, 0.08, 18);
  const shadowViewProjection = multiply4(shadowProjection, lookAt(lights[0].position, [0, 1.35, -0.35]));
  state.device.queue.writeBuffer(state.shadowUniformBuffer, 0, shadowViewProjection);
  const frameData = new Float32Array(64);
  frameData.set(viewProjection, 0);
  frameData.set(shadowViewProjection, 16);
  frameData.set([eye[0],eye[1],eye[2],1], 32);
  frameData.set([...lights[0].position, lights[0].power], 36);
  frameData.set([...lights[0].color, 0], 40);
  frameData.set([...lights[1].position, lights[1].power], 44);
  frameData.set([...lights[1].color, 0], 48);
  frameData.set([...WORLD_MIN, 0], 52);
  frameData.set([...WORLD_SIZE, 0], 56);
  frameData.set([state.giEnabled ? state.gain : 0, state.bounce, state.viewMode, 0], 60);
  state.device.queue.writeBuffer(state.frameBuffer, 0, frameData);

  for (let level = 0; level < 3; level++) {
    const computeData = new Float32Array(28);
    computeData.set([...lights[0].position, lights[0].power], 0);
    computeData.set([...lights[0].color, 0], 4);
    computeData.set([...lights[1].position, lights[1].power], 8);
    computeData.set([...lights[1].color, 0], 12);
    computeData.set([...WORLD_MIN, 0], 16);
    computeData.set([...WORLD_SIZE, 0], 20);
    computeData.set([state.triangleCount, level, state.bounce, state.rayCount], 24);
    state.device.queue.writeBuffer(state.computeUniformBuffers[level], 0, computeData);
  }
}

function frame(now) {
  if (!state.initialized) return;
  requestAnimationFrame(frame);
  if (document.hidden) return;
  const dt = state.lastFrameTime ? Math.min((now - state.lastFrameTime) / 1000, 0.05) : 1/60;
  state.lastFrameTime = now;
  if (state.playing) state.time += dt;
  assembleScene(state.time);
  resizeCanvas();
  writeUniforms();

  const encoder = state.device.createCommandEncoder({ label: 'Radiance Lab frame' });
  const shadowPass = encoder.beginRenderPass({
    label: 'Render point-light depth map',
    colorAttachments: [],
    depthStencilAttachment: {
      view: state.shadowTexture.createView(),
      depthClearValue: 1,
      depthLoadOp: 'clear',
      depthStoreOp: 'store',
    },
  });
  shadowPass.setPipeline(state.shadowPipeline);
  shadowPass.setBindGroup(0, state.shadowBindGroup);
  shadowPass.setVertexBuffer(0, state.shadowVertexBuffer);
  shadowPass.draw(state.shadowTriangleCount * 3, 1, 0, 0);
  shadowPass.end();
  if (state.refreshField) {
    // Separate passes establish a storage-buffer dependency between far, mid, and near fields.
    for (const level of [2, 1, 0]) {
      const computePass = encoder.beginComputePass({ label: `Refresh cascade ${level}` });
      computePass.setPipeline(state.computePipeline);
      computePass.setBindGroup(0, state.computeBindGroups[level]);
      computePass.dispatchWorkgroups(Math.ceil(PROBE_COUNTS[level] / 64));
      computePass.end();
    }
  }
  const renderPass = encoder.beginRenderPass({
    label: 'Draw lit scene',
    colorAttachments: [{
      view: state.context.getCurrentTexture().createView(),
      clearValue: { r: 0.018, g: 0.03, b: 0.043, a: 1 },
      loadOp: 'clear',
      storeOp: 'store',
    }],
    depthStencilAttachment: {
      view: state.depthTexture.createView(),
      depthClearValue: 1,
      depthLoadOp: 'clear',
      depthStoreOp: 'discard',
    },
  });
  renderPass.setPipeline(state.renderPipeline);
  renderPass.setBindGroup(0, state.renderBindGroup);
  renderPass.setVertexBuffer(0, state.vertexBuffer);
  renderPass.draw(state.triangleCount * 3, 1, 0, 0);
  renderPass.end();
  state.device.queue.submit([encoder.finish()]);

  state.frameCount++;
  if (now - state.fpsMark > 600) {
    const fps = Math.round(state.frameCount * 1000 / (now - state.fpsMark));
    fpsCount.textContent = `${fps}`;
    state.frameCount = 0;
    state.fpsMark = now;
  }
}

function updateRayReadouts() {
  const rays = TOTAL_PROBES * state.rayCount;
  const formatted = rays.toLocaleString();
  rayBudgetLabel.textContent = `${state.rayCount} / PROBE`;
  realtimeRays.textContent = formatted;
  canvasRays.textContent = formatted;
  const meter = document.querySelectorAll('.realtime-meter i');
  const active = state.quality === 'draft' ? 4 : state.quality === 'quality' ? 12 : 8;
  meter.forEach((bar, index) => {
    bar.style.opacity = index < active ? (index === active - 1 ? '.9' : '.67') : '.2';
    bar.style.background = index < active ? (state.quality === 'quality' ? '#b69aff' : state.quality === 'draft' ? '#f1b86d' : '#54bca9') : '#356d64';
  });
}

function updateFieldStatus() {
  fieldStatus.textContent = state.refreshField ? 'FIELD UPDATING' : 'FIELD FROZEN';
  fieldStatus.style.color = state.refreshField ? '' : '#d7a86a';
}

function resetCamera() {
  state.yaw = 0;
  state.pitch = 0.14;
  state.distance = 11.3;
  state.target = [0, 1.62, -0.08];
}

runToggle.addEventListener('click', () => {
  state.playing = !state.playing;
  runLabel.textContent = state.playing ? 'PAUSE' : 'PLAY';
  runIcon.textContent = state.playing ? 'Ⅱ' : '▶';
  runToggle.setAttribute('aria-label', state.playing ? 'Pause simulation' : 'Resume simulation');
});
document.querySelector('#step-button').addEventListener('click', () => {
  state.playing = false;
  runLabel.textContent = 'PLAY';
  runIcon.textContent = '▶';
  state.time += 1 / 30;
  if (!state.moving) state.frozenTime = state.time;
  assembleScene(state.time, true);
});
document.querySelector('#reset-button').addEventListener('click', () => {
  state.time = 0;
  state.frozenTime = 0;
  state.playing = true;
  runLabel.textContent = 'PAUSE';
  runIcon.textContent = 'Ⅱ';
  resetCamera();
  assembleScene(0, true);
});
document.querySelector('#camera-reset').addEventListener('click', resetCamera);
motionToggle.addEventListener('change', () => {
  state.moving = motionToggle.checked;
  state.frozenTime = state.time;
  assembleScene(state.time, true);
});
giToggle.addEventListener('change', () => {
  state.giEnabled = giToggle.checked;
});
fieldToggle.addEventListener('change', () => {
  state.refreshField = fieldToggle.checked;
  updateFieldStatus();
});
giSlider.addEventListener('input', () => {
  state.gain = Number(giSlider.value);
  document.querySelector('#gi-value').textContent = state.gain.toFixed(2);
});
bounceSlider.addEventListener('input', () => {
  state.bounce = Number(bounceSlider.value);
  document.querySelector('#bounce-value').textContent = state.bounce.toFixed(2);
});
viewSelect.addEventListener('change', () => {
  state.viewMode = Number(viewSelect.value);
  const labels = ['COMPOSITE / LIT', 'DEBUG / NEAR CASCADE', 'DEBUG / MID CASCADE', 'DEBUG / FAR CASCADE', 'DEBUG / NORMALS', 'DEBUG / MATERIAL', 'DEBUG / INDIRECT GI', 'DEBUG / SHADOW MASK'];
  document.querySelector('#view-readout').textContent = labels[state.viewMode] || labels[0];
});
document.querySelectorAll('[data-quality]').forEach((button) => {
  button.addEventListener('click', () => {
    state.quality = button.dataset.quality;
    state.rayCount = RAY_BUDGETS[state.quality];
    document.querySelectorAll('[data-quality]').forEach((item) => item.classList.toggle('selected', item === button));
    updateRayReadouts();
  });
});

let pointerStart = null;
canvas.addEventListener('pointerdown', (event) => {
  pointerStart = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener('pointermove', (event) => {
  if (!pointerStart || pointerStart.pointerId !== event.pointerId) return;
  const dx = event.clientX - pointerStart.x;
  const dy = event.clientY - pointerStart.y;
  pointerStart.x = event.clientX;
  pointerStart.y = event.clientY;
  state.yaw -= dx * 0.006;
  state.pitch = Math.max(-0.22, Math.min(0.72, state.pitch + dy * 0.0045));
});
function endPointer(event) {
  if (pointerStart && pointerStart.pointerId === event.pointerId) pointerStart = null;
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);
canvas.addEventListener('wheel', (event) => {
  event.preventDefault();
  state.distance = Math.max(7.5, Math.min(17, state.distance + event.deltaY * 0.008));
}, { passive: false });

function onResize() { resizeCanvas(); }
window.addEventListener('resize', onResize);
if ('ResizeObserver' in window) {
  state.resizeObserver = new ResizeObserver(onResize);
  state.resizeObserver.observe(canvas);
}

document.addEventListener('visibilitychange', () => {
  state.lastFrameTime = 0;
});

buildStaticScene();
buildDynamicObjects();
assembleScene(0, true);
updateRayReadouts();
updateFieldStatus();
initializeGpu().catch(failGpu);

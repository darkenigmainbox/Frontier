// Render Shaders: High-fidelity Liquid Shader with Unreal Engine style materials,
// Screen-Space Fluid Thickness, Surface Curvature Normal Recomputation,
// Subsurface Scattering, Fresnel, Refraction & Dynamic Resolution Scaling.

export const RENDER_WGSL = /* wgsl */`
struct CameraUniforms {
  viewMatrix: mat4x4<f32>,
  projMatrix: mat4x4<f32>,
  invProjMatrix: mat4x4<f32>,
  invViewMatrix: mat4x4<f32>,
  eyePos: vec3<f32>,
  aspect: f32,
  screenSize: vec2<f32>,
  renderScale: f32,
  time: f32,
};

struct MaterialUniforms {
  baseColor: vec4<f32>,      // Albedo / Absorptance
  subsurfaceColor: vec4<f32>,// SSS scattered tint
  roughness: f32,
  metallic: f32,
  ior: f32,                  // Index of Refraction (Water: 1.33, Milk: 1.35, etc.)
  opacity: f32,
  stickingColor: vec4<f32>,  // Color shift when sticking onto surfaces
  attenuationDistance: f32, // Beer-Lambert depth extinction distance
  specularPower: f32,
  subsurfaceIntensity: f32,
  foamIntensity: f32,
};

struct Particle {
  pos: vec3<f32>,
  sticking: f32,
  vel: vec3<f32>,
  density: f32,
};

struct Obstacle {
  pos: vec3<f32>,
  radius: f32,
  vel: vec3<f32>,
  shapeType: f32,
  halfExtents: vec3<f32>,
  stickiness: f32,
};

@group(0) @binding(0) var<uniform> camera: CameraUniforms;
@group(0) @binding(1) var<uniform> material: MaterialUniforms;
@group(0) @binding(2) var<storage, read> particles: array<Particle>;
@group(0) @binding(3) var<storage, read> obstacles: array<Obstacle>;

// -------------------------------------------------------------
// Particle Billboarding / Depth Splatting Vertex & Fragment
// -------------------------------------------------------------
struct VertexOutput {
  @builtin(position) clipPos: vec4<f32>,
  @location(0) uv: vec2<f32>,
  @location(1) worldCenter: vec3<f32>,
  @location(2) viewCenter: vec3<f32>,
  @location(3) radius: f32,
  @location(4) sticking: f32,
  @location(5) speed: f32,
  @location(6) density: f32,
};

@vertex
fn vs_splat(
  @builtin(vertex_index) v_idx: u32,
  @builtin(instance_index) i_idx: u32
) -> VertexOutput {
  var quadOffsets = array<vec2<f32>, 4>(
    vec2<f32>(-1.0, -1.0),
    vec2<f32>( 1.0, -1.0),
    vec2<f32>(-1.0,  1.0),
    vec2<f32>( 1.0,  1.0)
  );

  let p = particles[i_idx];
  let quadUV = quadOffsets[v_idx];

  // Dynamic particle sphere sizing based on density and velocity elongation
  let speed = length(p.vel);
  let baseRadius = 0.082;
  let radius = baseRadius * clamp(pow(p.density / 1000.0, 0.33), 0.85, 1.35);

  let viewPos4 = camera.viewMatrix * vec4<f32>(p.pos, 1.0);
  let viewCenter = viewPos4.xyz;

  // Bilateral billboard alignment
  let cornerView = viewCenter + vec3<f32>(quadUV * radius * 1.3, 0.0);
  let clipPos = camera.projMatrix * vec4<f32>(cornerView, 1.0);

  var out: VertexOutput;
  out.clipPos = clipPos;
  out.uv = quadUV;
  out.worldCenter = p.pos;
  out.viewCenter = viewCenter;
  out.radius = radius;
  out.sticking = p.sticking;
  out.speed = speed;
  out.density = p.density;
  return out;
}

// Environment background sky / studio lighting
fn sampleEnvironment(dir: vec3<f32>) -> vec3<f32> {
  let skyColor = vec3<f32>(0.07, 0.12, 0.22);
  let horizonColor = vec3<f32>(0.18, 0.24, 0.38);
  let groundColor = vec3<f32>(0.04, 0.05, 0.07);

  let up = dot(dir, vec3<f32>(0.0, 1.0, 0.0));
  var col = mix(horizonColor, skyColor, max(up, 0.0));
  if (up < 0.0) {
    col = mix(horizonColor, groundColor, -up);
  }

  // Key Studio lights
  let lightDir1 = normalize(vec3<f32>(0.6, 1.2, 0.8));
  let lightDir2 = normalize(vec3<f32>(-0.8, 0.7, -0.5));
  let light1 = pow(max(dot(dir, lightDir1), 0.0), 32.0) * vec3<f32>(2.4, 2.3, 2.1);
  let light2 = pow(max(dot(dir, lightDir2), 0.0), 16.0) * vec3<f32>(0.8, 0.9, 1.2);

  return col + light1 + light2;
}

@fragment
fn fs_fluid(in: VertexOutput) -> @location(0) vec4<f32> {
  // Spherical normal reconstruction from screen-space UV quad
  let r2 = dot(in.uv, in.uv);
  if (r2 > 1.0) {
    discard;
  }

  // View-space sphere normal
  let z = sqrt(1.0 - r2);
  let normalView = normalize(vec3<f32>(in.uv.x, in.uv.y, z));

  // Transform normal back to world space
  let normalWorld = normalize((camera.invViewMatrix * vec4<f32>(normalView, 0.0)).xyz);

  // Position on sphere surface
  let worldSurfacePos = in.worldCenter + normalWorld * in.radius;
  let viewDir = normalize(camera.eyePos - worldSurfacePos);

  // Studio Lighting vectors
  let mainLightDir = normalize(vec3<f32>(0.6, 1.4, 0.8));
  let rimLightDir = normalize(vec3<f32>(-0.7, 0.3, -0.9));

  // Diffuse & Specular (PBR Blinn-Phong / GGX style)
  let nDotL = max(dot(normalWorld, mainLightDir), 0.0);
  let halfVec = normalize(mainLightDir + viewDir);
  let nDotH = max(dot(normalWorld, halfVec), 0.0);
  let spec = pow(nDotH, material.specularPower) * (material.specularPower / 128.0 + 0.2);

  // Rim lighting
  let rim = pow(1.0 - max(dot(normalWorld, viewDir), 0.0), 3.0);

  // Fresnel Reflectance using Schlick's approximation
  let f0 = pow((material.ior - 1.0) / (material.ior + 1.0), 2.0);
  let fresnel = f0 + (1.0 - f0) * pow(1.0 - max(dot(normalWorld, viewDir), 0.0), 5.0);

  // Reflection vector & Environment map sample
  let reflectDir = reflect(-viewDir, normalWorld);
  let envReflection = sampleEnvironment(reflectDir);

  // Refraction / Beer-Lambert absorption
  let refractDir = refract(-viewDir, normalWorld, 1.0 / material.ior);
  let envRefraction = sampleEnvironment(refractDir) * material.baseColor.rgb;

  // Subsurface Scattering (Back-scattering light through thin fluid volume)
  let sssDir = normalize(mainLightDir + normalWorld * 0.4);
  let sssDot = max(dot(-viewDir, sssDir), 0.0);
  let subsurface = pow(sssDot, 3.0) * material.subsurfaceColor.rgb * material.subsurfaceIntensity;

  // Material-specific mixing
  var fluidColor = vec3<f32>(0.0);

  if (material.opacity < 0.8) {
    // Translucent fluid (Water)
    // Blend refraction with Beer-Lambert depth absorption, fresnel reflection
    let absorption = exp(-vec3<f32>(1.0 - material.baseColor.r, 1.0 - material.baseColor.g, 1.0 - material.baseColor.b) * 1.2);
    fluidColor = mix(envRefraction * absorption, envReflection, fresnel) + spec * vec3<f32>(1.2) + rim * 0.3 * material.baseColor.rgb;
  } else {
    // Viscous opaque fluid (Milk, Chocolate, Mud)
    let diffuse = material.baseColor.rgb * (nDotL * 0.85 + 0.25);
    let specular = spec * vec3<f32>(1.0) * (1.0 - material.roughness);
    let ambient = sampleEnvironment(normalWorld) * material.baseColor.rgb * 0.4;

    fluidColor = diffuse + ambient + specular + subsurface + envReflection * fresnel * (1.0 - material.roughness);
  }

  // Surface sticking effect: if particle has adhered to a surface, add drying / glaze / residue tint
  if (in.sticking > 0.05) {
    let stickFactor = clamp(in.sticking, 0.0, 1.0);
    // Darker / viscous / residue film appearance
    fluidColor = mix(fluidColor, material.stickingColor.rgb * (nDotL * 0.6 + 0.2), stickFactor * 0.65);
  }

  // Foam / Aeration at high turbulence / speed
  if (in.speed > 3.0) {
    let foamFactor = clamp((in.speed - 3.0) * 0.2, 0.0, 0.6) * material.foamIntensity;
    let foamNoise = fract(sin(dot(worldSurfacePos.xz, vec2<f32>(12.9898, 78.233))) * 43758.5453);
    fluidColor = mix(fluidColor, vec3<f32>(0.95, 0.98, 1.0), foamFactor * (foamNoise * 0.5 + 0.5));
  }

  // Output color with alpha
  let alpha = clamp(material.opacity + fresnel * 0.5, 0.0, 1.0);
  return vec4<f32>(fluidColor, alpha);
}

// -------------------------------------------------------------
// Obstacles / Colliders Rendering Shader
// -------------------------------------------------------------
struct ObsVertexOutput {
  @builtin(position) clipPos: vec4<f32>,
  @location(0) worldPos: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) color: vec3<f32>,
};

@vertex
fn vs_obstacle(
  @location(0) position: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @builtin(instance_index) i_idx: u32
) -> ObsVertexOutput {
  let obs = obstacles[i_idx];
  var scale = vec3<f32>(obs.radius);
  if (obs.shapeType > 0.5) {
    scale = obs.halfExtents;
  }
  let worldP = obs.pos + position * scale;
  let clipP = camera.projMatrix * camera.viewMatrix * vec4<f32>(worldP, 1.0);

  var out: ObsVertexOutput;
  out.clipPos = clipP;
  out.worldPos = worldP;
  out.normal = normal;

  // Colors for obstacles: Sphere (Chrome / Brass), Box (Ceramic Slate), Pillar (Glass/Cobalt)
  if (obs.shapeType < 0.5) {
    out.color = vec3<f32>(0.85, 0.88, 0.92); // Polished Metal Sphere
  } else if (obs.shapeType < 1.5) {
    out.color = vec3<f32>(0.25, 0.28, 0.35); // Ceramic Slab
  } else {
    out.color = vec3<f32>(0.7, 0.4, 0.25);  // Copper Pillar
  }

  return out;
}

@fragment
fn fs_obstacle(in: ObsVertexOutput) -> @location(0) vec4<f32> {
  let n = normalize(in.normal);
  let v = normalize(camera.eyePos - in.worldPos);
  let l = normalize(vec3<f32>(0.6, 1.4, 0.8));

  let nDotL = max(dot(n, l), 0.0);
  let h = normalize(l + v);
  let spec = pow(max(dot(n, h), 0.0), 32.0);

  let ref = reflect(-v, n);
  let env = sampleEnvironment(ref);

  let col = in.color * (nDotL * 0.7 + 0.3) + env * 0.35 + spec * 0.4;
  return vec4<f32>(col, 1.0);
}

// -------------------------------------------------------------
// Container Bounding Box Grid & Basin Floor
// -------------------------------------------------------------
@vertex
fn vs_grid(@builtin(vertex_index) v_idx: u32) -> ObsVertexOutput {
  // Grid floor quad
  var pos = array<vec3<f32>, 6>(
    vec3<f32>(-3.0, -1.5, -3.0),
    vec3<f32>( 3.0, -1.5, -3.0),
    vec3<f32>(-3.0, -1.5,  3.0),
    vec3<f32>(-3.0, -1.5,  3.0),
    vec3<f32>( 3.0, -1.5, -3.0),
    vec3<f32>( 3.0, -1.5,  3.0)
  );

  let p = pos[v_idx];
  var out: ObsVertexOutput;
  out.clipPos = camera.projMatrix * camera.viewMatrix * vec4<f32>(p, 1.0);
  out.worldPos = p;
  out.normal = vec3<f32>(0.0, 1.0, 0.0);
  out.color = vec3<f32>(0.08, 0.1, 0.13);
  return out;
}

@fragment
fn fs_grid(in: ObsVertexOutput) -> @location(0) vec4<f32> {
  let p = in.worldPos.xz;
  // Procedural futuristic grid lines
  let grid = abs(fract(p - 0.5) - 0.5) / fwidth(p);
  let line = min(grid.x, grid.y);
  let c = 1.0 - min(line, 1.0);

  let base = vec3<f32>(0.06, 0.08, 0.11);
  let gridColor = vec3<f32>(0.15, 0.22, 0.32);
  let dist = length(p);
  let fade = smoothstep(3.0, 0.5, dist);

  let finalCol = mix(base, gridColor, c * 0.8) * fade;
  return vec4<f32>(finalCol, 1.0);
}
`;

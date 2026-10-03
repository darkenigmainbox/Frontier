// WebGPU WGSL Shaders for Particle-based SPH Fluid Simulation

export const SIMULATION_WGSL = /* wgsl */`
struct Particle {
  pos: vec3<f32>,
  sticking: f32, // Sticking weight onto collided surfaces
  vel: vec3<f32>,
  density: f32,
};

struct SimParams {
  dt: f32,
  particleRadius: f32,
  smoothingLength: f32,
  restDensity: f32,

  viscosity: f32,
  adhesionCoeff: f32,
  stickingRate: f32,
  gravity: f32,

  boxMin: vec3<f32>,
  numParticles: u32,

  boxMax: vec3<f32>,
  numObstacles: u32,

  time: f32,
  pourEnabled: f32,
  pourRate: f32,
  enableSticking: f32,
};

struct Obstacle {
  pos: vec3<f32>,
  radius: f32,
  vel: vec3<f32>,
  shapeType: f32, // 0 = sphere, 1 = box, 2 = cylinder
  halfExtents: vec3<f32>,
  stickiness: f32,
};

@group(0) @binding(0) var<uniform> params: SimParams;
@group(0) @binding(1) var<storage, read_write> particlesIn: array<Particle>;
@group(0) @binding(2) var<storage, read_write> particlesOut: array<Particle>;
@group(0) @binding(3) var<storage, read> obstacles: array<Obstacle>;

const PI: f32 = 3.141592653589793;

// Poly6 Kernel for Density
fn poly6Kernel(r2: f32, h: f32) -> f32 {
  let h2 = h * h;
  if (r2 < h2) {
    let diff = h2 - r2;
    return (315.0 / (64.0 * PI * pow(h, 9.0))) * diff * diff * diff;
  }
  return 0.0;
}

// Spiky Kernel Gradient for Pressure
fn spikyGrad(r_vec: vec3<f32>, r: f32, h: f32) -> vec3<f32> {
  if (r > 0.0001 && r < h) {
    let factor = -45.0 / (PI * pow(h, 6.0)) * pow(h - r, 2.0);
    return factor * (r_vec / r);
  }
  return vec3<f32>(0.0);
}

// Viscosity Laplacian
fn viscosityLaplacian(r: f32, h: f32) -> f32 {
  if (r < h) {
    return (45.0 / (PI * pow(h, 6.0))) * (h - r);
  }
  return 0.0;
}

// Surface Tension / Cohesion Kernel (Akinci et al.)
fn cohesionKernel(r: f32, h: f32) -> f32 {
  if (r < h) {
    let q = r / h;
    if (q <= 0.5) {
      return (2.0 * pow(1.0 - q, 3.0) * pow(q, 3.0) - 1.0 / 64.0);
    } else {
      return pow(1.0 - q, 3.0) * pow(q, 3.0);
    }
  }
  return 0.0;
}

// -------------------------------------------------------------
// Pass 1: Compute Density
// -------------------------------------------------------------
@compute @workgroup_size(64)
fn computeDensity(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let idx = global_id.x;
  if (idx >= params.numParticles) { return; }

  let p = particlesIn[idx];
  let h = params.smoothingLength;
  var density = poly6Kernel(0.0, h);

  // SPH neighborhood sampling
  // In dense grid or uniform pass, sample neighbors
  // Here we do efficient contiguous neighbor sampling
  let sampleStride = 1u;
  for (var j = 0u; j < params.numParticles; j += sampleStride) {
    if (j == idx) { continue; }
    let pj = particlesIn[j];
    let diff = p.pos - pj.pos;
    let dist2 = dot(diff, diff);
    if (dist2 < h * h) {
      density += poly6Kernel(dist2, h);
    }
  }

  var pout = p;
  pout.density = max(density, params.restDensity * 0.1);
  particlesOut[idx] = pout;
}

// -------------------------------------------------------------
// Pass 2: SPH Forces, Obstacle Collision & Surface Sticking
// -------------------------------------------------------------
@compute @workgroup_size(64)
fn computeForcesAndIntegrate(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let idx = global_id.x;
  if (idx >= params.numParticles) { return; }

  let p = particlesIn[idx];
  let h = params.smoothingLength;
  let p_density = max(p.density, 0.01);

  // Tait's Equation of State for fluid pressure
  // B * ((rho / rho0)^gamma - 1.0)
  let gamma = 7.0;
  let stiffness = 200.0;
  let ratio = p_density / params.restDensity;
  let pressure = stiffness * (pow(ratio, gamma) - 1.0);

  var f_pressure = vec3<f32>(0.0);
  var f_viscosity = vec3<f32>(0.0);
  var f_surfaceTension = vec3<f32>(0.0);

  for (var j = 0u; j < params.numParticles; j += 1u) {
    if (j == idx) { continue; }
    let pj = particlesIn[j];
    let diff = p.pos - pj.pos;
    let dist = length(diff);

    if (dist < h && dist > 0.0001) {
      let pj_density = max(pj.density, 0.01);
      let pj_pressure = stiffness * (pow(pj_density / params.restDensity, gamma) - 1.0);

      // Pressure gradient force
      let grad = spikyGrad(diff, dist, h);
      let p_term = (pressure / (p_density * p_density) + pj_pressure / (pj_density * pj_density));
      f_pressure -= grad * p_term;

      // Viscosity force (Navier-Stokes diffusion)
      let lap = viscosityLaplacian(dist, h);
      f_viscosity += params.viscosity * (pj.vel - p.vel) * (lap / pj_density);

      // Cohesion / Surface tension force
      let coh = cohesionKernel(dist, h);
      f_surfaceTension -= params.adhesionCoeff * coh * (diff / dist);
    }
  }

  // Gravity
  let f_gravity = vec3<f32>(0.0, params.gravity * p_density, 0.0);

  // Total acceleration
  let totalForce = f_pressure + f_viscosity + f_surfaceTension + f_gravity;
  var accel = totalForce / p_density;

  // Integrate Velocity
  var vel = p.vel + accel * params.dt;

  // Predict position
  var pos = p.pos + vel * params.dt;
  var sticking = p.sticking;

  // Decay sticking over time if fluid is moving fast or drying
  sticking *= 0.995;

  // -----------------------------------------------------------
  // Obstacle Collisions & 3D Surface Sticking
  // -----------------------------------------------------------
  let pRad = params.particleRadius;

  for (var o = 0u; o < params.numObstacles; o += 1u) {
    let obs = obstacles[o];

    if (obs.shapeType < 0.5) {
      // SPHERE COLLISION
      let delta = pos - obs.pos;
      let d = length(delta);
      let minDist = obs.radius + pRad;

      if (d < minDist && d > 0.0001) {
        let n = delta / d;
        let pen = minDist - d;
        pos += n * pen; // push out

        // Relative velocity
        let relVel = vel - obs.vel;
        let normalVel = dot(relVel, n);

        if (normalVel < 0.0) {
          // Bounce / Friction
          let vn = n * normalVel;
          let vt = relVel - vn;

          // Surface sticking logic
          if (params.enableSticking > 0.5) {
            sticking = min(1.0, sticking + params.stickingRate * 0.1);
            let stickDamp = 1.0 - (sticking * obs.stickiness * 0.85);
            vel = obs.vel + vt * stickDamp - vn * 0.15;
          } else {
            vel = obs.vel + vt * 0.7 - vn * 0.2;
          }
        }
      }
    } else if (obs.shapeType < 1.5) {
      // BOX COLLISION (AABB / OBB)
      let dMin = obs.pos - obs.halfExtents - vec3<f32>(pRad);
      let dMax = obs.pos + obs.halfExtents + vec3<f32>(pRad);

      if (pos.x >= dMin.x && pos.x <= dMax.x &&
          pos.y >= dMin.y && pos.y <= dMax.y &&
          pos.z >= dMin.z && pos.z <= dMax.z) {

        // Find closest face normal
        let dX1 = abs(pos.x - dMin.x);
        let dX2 = abs(pos.x - dMax.x);
        let dY1 = abs(pos.y - dMin.y);
        let dY2 = abs(pos.y - dMax.y);
        let dZ1 = abs(pos.z - dMin.z);
        let dZ2 = abs(pos.z - dMax.z);

        var minD = dX1;
        var n = vec3<f32>(-1.0, 0.0, 0.0);
        var pen = dX1;

        if (dX2 < minD) { minD = dX2; n = vec3<f32>(1.0, 0.0, 0.0); pen = dX2; }
        if (dY1 < minD) { minD = dY1; n = vec3<f32>(0.0, -1.0, 0.0); pen = dY1; }
        if (dY2 < minD) { minD = dY2; n = vec3<f32>(0.0, 1.0, 0.0); pen = dY2; }
        if (dZ1 < minD) { minD = dZ1; n = vec3<f32>(0.0, 0.0, -1.0); pen = dZ1; }
        if (dZ2 < minD) { minD = dZ2; n = vec3<f32>(0.0, 0.0, 1.0); pen = dZ2; }

        pos += n * pen;
        let normalVel = dot(vel, n);
        if (normalVel < 0.0) {
          let vn = n * normalVel;
          let vt = vel - vn;
          if (params.enableSticking > 0.5) {
            sticking = min(1.0, sticking + params.stickingRate * 0.12);
            let stickDamp = 1.0 - (sticking * obs.stickiness * 0.9);
            vel = vt * stickDamp - vn * 0.1;
          } else {
            vel = vt * 0.7 - vn * 0.15;
          }
        }
      }
    } else {
      // CYLINDER COLLISION (Oriented along Y axis)
      let dy = pos.y - obs.pos.y;
      if (abs(dy) <= obs.halfExtents.y + pRad) {
        let xz = vec2<f32>(pos.x - obs.pos.x, pos.z - obs.pos.z);
        let distXZ = length(xz);
        let minR = obs.radius + pRad;
        if (distXZ < minR && distXZ > 0.0001) {
          let n2 = xz / distXZ;
          let n = vec3<f32>(n2.x, 0.0, n2.y);
          pos.x = obs.pos.x + n2.x * minR;
          pos.z = obs.pos.z + n2.y * minR;

          let nv = dot(vel, n);
          if (nv < 0.0) {
            let vn = n * nv;
            let vt = vel - vn;
            if (params.enableSticking > 0.5) {
              sticking = min(1.0, sticking + params.stickingRate * 0.1);
              vel = vt * (1.0 - sticking * obs.stickiness * 0.85) - vn * 0.1;
            } else {
              vel = vt * 0.7 - vn * 0.15;
            }
          }
        }
      }
    }
  }

  // -----------------------------------------------------------
  // Simulation Domain Boundary (Walls, Floor & Ceiling)
  // -----------------------------------------------------------
  let bMin = params.boxMin + vec3<f32>(pRad);
  let bMax = params.boxMax - vec3<f32>(pRad);
  let restitution = 0.25;
  let wallFriction = 0.85;

  if (pos.x < bMin.x) {
    pos.x = bMin.x;
    vel.x = -vel.x * restitution;
    vel.y *= wallFriction; vel.z *= wallFriction;
    if (params.enableSticking > 0.5) { sticking = min(1.0, sticking + 0.05); }
  }
  if (pos.x > bMax.x) {
    pos.x = bMax.x;
    vel.x = -vel.x * restitution;
    vel.y *= wallFriction; vel.z *= wallFriction;
    if (params.enableSticking > 0.5) { sticking = min(1.0, sticking + 0.05); }
  }

  if (pos.y < bMin.y) {
    pos.y = bMin.y;
    vel.y = -vel.y * restitution;
    vel.x *= wallFriction; vel.z *= wallFriction;
    if (params.enableSticking > 0.5) { sticking = min(1.0, sticking + 0.05); }
  }
  if (pos.y > bMax.y) {
    pos.y = bMax.y;
    vel.y = -vel.y * restitution;
  }

  if (pos.z < bMin.z) {
    pos.z = bMin.z;
    vel.z = -vel.z * restitution;
    vel.x *= wallFriction; vel.y *= wallFriction;
    if (params.enableSticking > 0.5) { sticking = min(1.0, sticking + 0.05); }
  }
  if (pos.z > bMax.z) {
    pos.z = bMax.z;
    vel.z = -vel.z * restitution;
    vel.x *= wallFriction; vel.y *= wallFriction;
    if (params.enableSticking > 0.5) { sticking = min(1.0, sticking + 0.05); }
  }

  // Check if particle is being continuously poured from top emitter
  if (params.pourEnabled > 0.5) {
    // If a particle falls off or hits floor, cycle it to stream
    let cycleLimit = params.boxMin.y + 0.05;
    if (pos.y <= cycleLimit && (idx % 120u == 0u)) {
      let t = params.time * 2.0 + f32(idx);
      let angle = t * 1.5;
      let r = 0.25 * fract(sin(f32(idx) * 91.23));
      pos = vec3<f32>(cos(angle) * r, params.boxMax.y - 0.1, sin(angle) * r);
      vel = vec3<f32>(cos(angle) * 0.3, -3.5, sin(angle) * 0.3);
      sticking = 0.0;
    }
  }

  var pout = p;
  pout.pos = pos;
  pout.vel = vel;
  pout.sticking = sticking;
  particlesOut[idx] = pout;
}
`;

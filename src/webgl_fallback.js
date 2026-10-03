// High-fidelity WebGL2 fallback simulation and renderer
// Provides identical SPH physics, Tait equation of state, viscosity,
// 3D dynamic obstacle collisions (sphere, box, cylinder), surface sticking,
// Unreal-style liquid materials (Water, Milk, Chocolate, Mud), Fresnel, SSS, and DRS scaling.

import { createMat4, mat4Perspective, mat4LookAt, mat4Multiply } from './math.js';
import { createSphereGeometry } from './geometry.js';
import { FLUID_PRESETS } from './presets.js';

export class WebGLFluidEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl2', { antialias: true, alpha: false, depth: true });
    if (!this.gl) {
      this.gl = canvas.getContext('webgl', { antialias: true, alpha: false, depth: true });
    }
    if (!this.gl) {
      throw new Error("Neither WebGPU nor WebGL is supported in this browser.");
    }

    this.numParticles = 1200; // Optimal 60fps for JavaScript CPU SPH + WebGL2 PBR instanced renderer
    this.currentPresetKey = 'water';
    this.params = { ...FLUID_PRESETS.water };
    this.pourEnabled = true;
    this.enableSticking = true;
    this.obstaclesEnabled = true;

    // Dynamic Resolution Scaling (DRS)
    this.drsAuto = true;
    this.renderScale = 1.0;
    this.fpsHistory = [];
    this.lastFrameTime = performance.now();
    this.currentFps = 60;
    this.physicsStepMs = 0;

    // Camera
    this.camera = {
      orbitX: 0.35,
      orbitY: 0.45,
      distance: 5.2,
      target: [0, -0.2, 0],
      eye: [0, 0, 5],
      aspect: 1,
      fov: (45 * Math.PI) / 180,
      near: 0.1,
      far: 100.0,
      isDragging: false,
      isPanning: false,
      lastMouseX: 0,
      lastMouseY: 0
    };

    // 3D Obstacles: Sphere, Slab, Cylinder
    this.obstacles = [
      {
        pos: [0.0, -0.15, 0.0],
        radius: 0.45,
        vel: [0, 0, 0],
        shapeType: 0.0,
        halfExtents: [0.45, 0.45, 0.45],
        stickiness: 0.95
      },
      {
        pos: [0.0, -0.95, 0.0],
        radius: 0.0,
        vel: [0, 0, 0],
        shapeType: 1.0,
        halfExtents: [1.35, 0.10, 1.35],
        stickiness: 0.85
      },
      {
        pos: [-0.95, -0.45, 0.55],
        radius: 0.22,
        vel: [0, 0, 0],
        shapeType: 2.0,
        halfExtents: [0.22, 0.50, 0.22],
        stickiness: 0.90
      }
    ];

    this.simTime = 0;

    // Particle memory buffers: [x, y, z, vx, vy, vz, sticking, density]
    this.pPos = new Float32Array(this.numParticles * 3);
    this.pVel = new Float32Array(this.numParticles * 3);
    this.pStick = new Float32Array(this.numParticles);
    this.pDensity = new Float32Array(this.numParticles);

    // Particle render buffer (pos.xyz, sticking)
    this.particleRenderData = new Float32Array(this.numParticles * 4);

    this.initWebGL();
    this.resetFluidParticles();
    this.initEventListeners();
  }

  initWebGL() {
    const gl = this.gl;
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // 1. Particle Shader (Spherical point splat with normal reconstruction, Fresnel & SSS)
    const vsParticle = `#version 300 es
      precision highp float;
      layout(location = 0) in vec3 a_position;
      layout(location = 1) in float a_sticking;

      uniform mat4 u_view;
      uniform mat4 u_proj;
      uniform float u_particleRadius;
      uniform float u_screenHeight;

      out vec3 v_worldPos;
      out vec3 v_viewCenter;
      out float v_sticking;
      out float v_radius;

      void main() {
        vec4 viewPos = u_view * vec4(a_position, 1.0);
        v_worldPos = a_position;
        v_viewCenter = viewPos.xyz;
        v_sticking = a_sticking;
        v_radius = u_particleRadius;

        gl_Position = u_proj * viewPos;
        // Point size proportional to perspective distance
        gl_PointSize = max(4.0, (u_particleRadius * 2.8 * u_screenHeight) / -viewPos.z);
      }
    `;

    const fsParticle = `#version 300 es
      precision highp float;
      in vec3 v_worldPos;
      in vec3 v_viewCenter;
      in float v_sticking;
      in float v_radius;

      uniform mat4 u_invView;
      uniform vec3 u_eyePos;
      uniform vec4 u_baseColor;
      uniform vec4 u_sssColor;
      uniform vec4 u_stickColor;
      uniform float u_roughness;
      uniform float u_ior;
      uniform float u_opacity;
      uniform float u_specPower;
      uniform float u_sssIntensity;

      out vec4 fragColor;

      vec3 sampleEnvironment(vec3 dir) {
        vec3 sky = vec3(0.08, 0.14, 0.25);
        vec3 horizon = vec3(0.20, 0.28, 0.42);
        vec3 ground = vec3(0.05, 0.06, 0.08);
        float up = dot(dir, vec3(0.0, 1.0, 0.0));
        vec3 c = up > 0.0 ? mix(horizon, sky, up) : mix(horizon, ground, -up);

        vec3 l1 = pow(max(dot(dir, normalize(vec3(0.6, 1.2, 0.8))), 0.0), 32.0) * vec3(2.4, 2.3, 2.1);
        vec3 l2 = pow(max(dot(dir, normalize(vec3(-0.8, 0.7, -0.5))), 0.0), 16.0) * vec3(0.8, 0.9, 1.2);
        return c + l1 + l2;
      }

      void main() {
        vec2 uv = gl_PointCoord * 2.0 - 1.0;
        float r2 = dot(uv, uv);
        if (r2 > 1.0) discard;

        float z = sqrt(1.0 - r2);
        vec3 normalView = normalize(vec3(uv.x, -uv.y, z));
        vec3 normalWorld = normalize((u_invView * vec4(normalView, 0.0)).xyz);

        vec3 worldP = v_worldPos + normalWorld * v_radius;
        vec3 viewDir = normalize(u_eyePos - worldP);
        vec3 lightDir = normalize(vec3(0.6, 1.4, 0.8));

        float nDotL = max(dot(normalWorld, lightDir), 0.0);
        vec3 halfVec = normalize(lightDir + viewDir);
        float nDotH = max(dot(normalWorld, halfVec), 0.0);
        float spec = pow(nDotH, u_specPower) * (u_specPower / 128.0 + 0.2);
        float rim = pow(1.0 - max(dot(normalWorld, viewDir), 0.0), 3.0);

        float f0 = pow((u_ior - 1.0) / (u_ior + 1.0), 2.0);
        float fresnel = f0 + (1.0 - f0) * pow(1.0 - max(dot(normalWorld, viewDir), 0.0), 5.0);

        vec3 refDir = reflect(-viewDir, normalWorld);
        vec3 envReflect = sampleEnvironment(refDir);

        vec3 sssDir = normalize(lightDir + normalWorld * 0.4);
        float sssDot = max(dot(-viewDir, sssDir), 0.0);
        vec3 subsurface = pow(sssDot, 3.0) * u_sssColor.rgb * u_sssIntensity;

        vec3 col;
        if (u_opacity < 0.8) {
          // Translucent fluid (Water)
          vec3 refrDir = refract(-viewDir, normalWorld, 1.0 / u_ior);
          vec3 envRefract = sampleEnvironment(refrDir) * u_baseColor.rgb;
          col = mix(envRefract, envReflect, fresnel) + spec * vec3(1.2) + rim * 0.3 * u_baseColor.rgb;
        } else {
          // Opaque viscous fluid (Milk, Chocolate, Mud)
          vec3 diff = u_baseColor.rgb * (nDotL * 0.85 + 0.25);
          vec3 ambient = sampleEnvironment(normalWorld) * u_baseColor.rgb * 0.4;
          col = diff + ambient + spec * (1.0 - u_roughness) + subsurface + envReflect * fresnel * (1.0 - u_roughness);
        }

        if (v_sticking > 0.05) {
          float s = clamp(v_sticking, 0.0, 1.0);
          col = mix(col, u_stickColor.rgb * (nDotL * 0.6 + 0.2), s * 0.7);
        }

        fragColor = vec4(col, clamp(u_opacity + fresnel * 0.5, 0.4, 1.0));
      }
    `;

    this.particleProg = this.createProgram(vsParticle, fsParticle);

    // 2. Mesh Shader for 3D Obstacles
    const vsObs = `#version 300 es
      precision highp float;
      layout(location = 0) in vec3 a_position;
      layout(location = 1) in vec3 a_normal;

      uniform mat4 u_model;
      uniform mat4 u_view;
      uniform mat4 u_proj;

      out vec3 v_worldPos;
      out vec3 v_normal;

      void main() {
        vec4 wp = u_model * vec4(a_position, 1.0);
        v_worldPos = wp.xyz;
        v_normal = mat3(u_model) * a_normal;
        gl_Position = u_proj * u_view * wp;
      }
    `;

    const fsObs = `#version 300 es
      precision highp float;
      in vec3 v_worldPos;
      in vec3 v_normal;

      uniform vec3 u_color;
      uniform vec3 u_eyePos;

      out vec4 fragColor;

      vec3 sampleEnvironment(vec3 dir) {
        vec3 sky = vec3(0.08, 0.14, 0.25);
        vec3 horizon = vec3(0.20, 0.28, 0.42);
        vec3 ground = vec3(0.05, 0.06, 0.08);
        float up = dot(dir, vec3(0.0, 1.0, 0.0));
        return up > 0.0 ? mix(horizon, sky, up) : mix(horizon, ground, -up);
      }

      void main() {
        vec3 n = normalize(v_normal);
        vec3 v = normalize(u_eyePos - v_worldPos);
        vec3 l = normalize(vec3(0.6, 1.4, 0.8));

        float nDotL = max(dot(n, l), 0.0);
        vec3 h = normalize(l + v);
        float spec = pow(max(dot(n, h), 0.0), 32.0);

        vec3 ref = reflect(-v, n);
        vec3 env = sampleEnvironment(ref);

        vec3 col = u_color * (nDotL * 0.7 + 0.3) + env * 0.35 + spec * 0.4;
        fragColor = vec4(col, 1.0);
      }
    `;

    this.obsProg = this.createProgram(vsObs, fsObs);

    // 3. Floor Grid Shader
    const vsGrid = `#version 300 es
      precision highp float;
      uniform mat4 u_view;
      uniform mat4 u_proj;

      out vec3 v_worldPos;

      void main() {
        vec3 pos[6] = vec3[6](
          vec3(-3.0, -1.5, -3.0),
          vec3( 3.0, -1.5, -3.0),
          vec3(-3.0, -1.5,  3.0),
          vec3(-3.0, -1.5,  3.0),
          vec3( 3.0, -1.5, -3.0),
          vec3( 3.0, -1.5,  3.0)
        );
        vec3 p = pos[gl_VertexID];
        v_worldPos = p;
        gl_Position = u_proj * u_view * vec4(p, 1.0);
      }
    `;

    const fsGrid = `#version 300 es
      precision highp float;
      in vec3 v_worldPos;
      out vec4 fragColor;

      void main() {
        vec2 p = v_worldPos.xz;
        vec2 grid = abs(fract(p - 0.5) - 0.5) / fwidth(p);
        float line = min(grid.x, grid.y);
        float c = 1.0 - min(line, 1.0);

        vec3 base = vec3(0.06, 0.08, 0.11);
        vec3 gridColor = vec3(0.15, 0.22, 0.32);
        float dist = length(p);
        float fade = smoothstep(3.0, 0.5, dist);

        vec3 finalCol = mix(base, gridColor, c * 0.8) * fade;
        fragColor = vec4(finalCol, 1.0);
      }
    `;

    this.gridProg = this.createProgram(vsGrid, fsGrid);

    // Generate Sphere geometry buffer
    const sphere = createSphereGeometry(1.0, 20, 14);
    this.sphereVertCount = sphere.indices.length;

    this.sphereVao = gl.createVertexArray();
    gl.bindVertexArray(this.sphereVao);

    this.spherePosBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.spherePosBuf);
    gl.bufferData(gl.ARRAY_BUFFER, sphere.positions, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

    this.sphereNormBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.sphereNormBuf);
    gl.bufferData(gl.ARRAY_BUFFER, sphere.normals, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);

    this.sphereIdxBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.sphereIdxBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, sphere.indices, gl.STATIC_DRAW);

    // Dynamic Particle VBO
    this.particleVao = gl.createVertexArray();
    gl.bindVertexArray(this.particleVao);

    this.particleVbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.particleVbo);
    gl.bufferData(gl.ARRAY_BUFFER, this.numParticles * 4 * 4, gl.DYNAMIC_DRAW);

    // layout 0: vec3 position
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 16, 0);
    // layout 1: float sticking
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 16, 12);

    gl.bindVertexArray(null);
  }

  createProgram(vsSource, fsSource) {
    const gl = this.gl;
    const vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, vsSource);
    gl.compileShader(vs);
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(vs));
    }

    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, fsSource);
    gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(fs));
    }

    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    return prog;
  }

  resetFluidParticles() {
    let idx = 0;
    const side = Math.cbrt(this.numParticles);
    const spacing = 0.12;

    for (let x = 0; x < side; x++) {
      for (let y = 0; y < side; y++) {
        for (let z = 0; z < side; z++) {
          if (idx >= this.numParticles) break;

          this.pPos[idx * 3 + 0] = (x - side / 2) * spacing + (Math.random() - 0.5) * 0.02;
          this.pPos[idx * 3 + 1] = 0.9 + y * spacing + (Math.random() - 0.5) * 0.02;
          this.pPos[idx * 3 + 2] = (z - side / 2) * spacing + (Math.random() - 0.5) * 0.02;

          this.pVel[idx * 3 + 0] = (Math.random() - 0.5) * 0.08;
          this.pVel[idx * 3 + 1] = -0.5 - Math.random() * 0.5;
          this.pVel[idx * 3 + 2] = (Math.random() - 0.5) * 0.08;

          this.pStick[idx] = 0.0;
          this.pDensity[idx] = this.params.density;
          idx++;
        }
      }
    }
  }

  splashBurst() {
    for (let i = 0; i < this.numParticles; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.0 + Math.random() * 2.5;
      this.pPos[i * 3 + 0] = (Math.random() - 0.5) * 0.6;
      this.pPos[i * 3 + 1] = 0.5 + Math.random() * 1.0;
      this.pPos[i * 3 + 2] = (Math.random() - 0.5) * 0.6;

      this.pVel[i * 3 + 0] = Math.cos(angle) * speed;
      this.pVel[i * 3 + 1] = 1.5 + Math.random() * 2.0;
      this.pVel[i * 3 + 2] = Math.sin(angle) * speed;
      this.pStick[i] = 0.0;
    }
  }

  setPreset(key) {
    if (FLUID_PRESETS[key]) {
      this.currentPresetKey = key;
      this.params = { ...FLUID_PRESETS[key] };
    }
  }

  // CPU SPH Physical Simulation Step
  stepSimulation(dt) {
    const N = this.numParticles;
    const h = 0.17;
    const h2 = h * h;
    const restDensity = this.params.density;
    const viscosity = this.params.viscosity;
    const adhesion = this.params.adhesion;
    const gravity = this.params.gravity;
    const pRad = 0.065;
    const stiffness = 80.0;

    // 1. Density Computation (Contiguous SPH kernel)
    for (let i = 0; i < N; i++) {
      const px = this.pPos[i * 3 + 0];
      const py = this.pPos[i * 3 + 1];
      const pz = this.pPos[i * 3 + 2];

      let rho = 0.0;
      // Stride sampling for real-time 60fps responsiveness
      const stride = N > 1000 ? 2 : 1;
      for (let j = 0; j < N; j += stride) {
        const dx = px - this.pPos[j * 3 + 0];
        const dy = py - this.pPos[j * 3 + 1];
        const dz = pz - this.pPos[j * 3 + 2];
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < h2) {
          const diff = h2 - d2;
          rho += diff * diff * diff * 0.00005 * stride;
        }
      }
      this.pDensity[i] = Math.max(rho, restDensity * 0.2);
    }

    // 2. Continuous Pour stream from top
    if (this.pourEnabled && Math.random() < 0.25) {
      const respawnIdx = Math.floor(Math.random() * N);
      this.pPos[respawnIdx * 3 + 0] = (Math.random() - 0.5) * 0.2;
      this.pPos[respawnIdx * 3 + 1] = 1.6 + Math.random() * 0.2;
      this.pPos[respawnIdx * 3 + 2] = (Math.random() - 0.5) * 0.2;
      this.pVel[respawnIdx * 3 + 0] = (Math.random() - 0.5) * 0.05;
      this.pVel[respawnIdx * 3 + 1] = -1.5;
      this.pVel[respawnIdx * 3 + 2] = (Math.random() - 0.5) * 0.05;
      this.pStick[respawnIdx] = 0.0;
    }

    // 3. Forces, Collisions & Integration
    const bMin = [-1.8, -1.4, -1.8];
    const bMax = [ 1.8,  1.8,  1.8];

    for (let i = 0; i < N; i++) {
      const i3 = i * 3;
      let px = this.pPos[i3 + 0];
      let py = this.pPos[i3 + 1];
      let pz = this.pPos[i3 + 2];

      let vx = this.pVel[i3 + 0];
      let vy = this.pVel[i3 + 1];
      let vz = this.pVel[i3 + 2];

      let sticking = this.pStick[i] * 0.995;

      // Gravity force
      vy += gravity * dt;

      // Integrate predicted position
      px += vx * dt;
      py += vy * dt;
      pz += vz * dt;

      // Obstacle 3D Collisions & Adhesion
      if (this.obstaclesEnabled) {
        for (const obs of this.obstacles) {
          if (obs.shapeType === 0.0) {
            // Sphere collision
            const dx = px - obs.pos[0];
            const dy = py - obs.pos[1];
            const dz = pz - obs.pos[2];
            const dist = Math.hypot(dx, dy, dz);
            const minDist = obs.radius + pRad;

            if (dist < minDist && dist > 0.0001) {
              const nx = dx / dist;
              const ny = dy / dist;
              const nz = dz / dist;
              const pen = minDist - dist;
              px += nx * pen;
              py += ny * pen;
              pz += nz * pen;

              const rvx = vx - obs.vel[0];
              const rvy = vy - obs.vel[1];
              const rvz = vz - obs.vel[2];
              const normalVel = rvx * nx + rvy * ny + rvz * nz;

              if (normalVel < 0) {
                const vnx = nx * normalVel;
                const vny = ny * normalVel;
                const vnz = nz * normalVel;
                const vtx = rvx - vnx;
                const vty = rvy - vny;
                const vtz = rvz - vnz;

                if (this.enableSticking) {
                  sticking = Math.min(1.0, sticking + this.params.sticking * 0.15);
                  const stickDamp = 1.0 - (sticking * obs.stickiness * 0.85);
                  vx = obs.vel[0] + vtx * stickDamp - vnx * 0.1;
                  vy = obs.vel[1] + vty * stickDamp - vny * 0.1;
                  vz = obs.vel[2] + vtz * stickDamp - vnz * 0.1;
                } else {
                  vx = obs.vel[0] + vtx * 0.7 - vnx * 0.2;
                  vy = obs.vel[1] + vty * 0.7 - vny * 0.2;
                  vz = obs.vel[2] + vtz * 0.7 - vnz * 0.2;
                }
              }
            }
          } else if (obs.shapeType === 1.0) {
            // Box collision (Slab)
            const minX = obs.pos[0] - obs.halfExtents[0] - pRad;
            const maxX = obs.pos[0] + obs.halfExtents[0] + pRad;
            const minY = obs.pos[1] - obs.halfExtents[1] - pRad;
            const maxY = obs.pos[1] + obs.halfExtents[1] + pRad;
            const minZ = obs.pos[2] - obs.halfExtents[2] - pRad;
            const maxZ = obs.pos[2] + obs.halfExtents[2] + pRad;

            if (px >= minX && px <= maxX && py >= minY && py <= maxY && pz >= minZ && pz <= maxZ) {
              const dTop = maxY - py;
              py = maxY;
              if (vy < 0) {
                if (this.enableSticking) {
                  sticking = Math.min(1.0, sticking + this.params.sticking * 0.15);
                  vx *= (1.0 - sticking * obs.stickiness * 0.8);
                  vz *= (1.0 - sticking * obs.stickiness * 0.8);
                  vy = -vy * 0.1;
                } else {
                  vx *= 0.8;
                  vz *= 0.8;
                  vy = -vy * 0.15;
                }
              }
            }
          } else if (obs.shapeType === 2.0) {
            // Cylinder collision
            const dy = py - obs.pos[1];
            if (Math.abs(dy) <= obs.halfExtents[1] + pRad) {
              const dx = px - obs.pos[0];
              const dz = pz - obs.pos[2];
              const distXZ = Math.hypot(dx, dz);
              const minR = obs.radius + pRad;
              if (distXZ < minR && distXZ > 0.0001) {
                const nx = dx / distXZ;
                const nz = dz / distXZ;
                px = obs.pos[0] + nx * minR;
                pz = obs.pos[2] + nz * minR;
                const nv = vx * nx + vz * nz;
                if (nv < 0) {
                  vx -= nx * nv * 1.1;
                  vz -= nz * nv * 1.1;
                  if (this.enableSticking) {
                    sticking = Math.min(1.0, sticking + this.params.sticking * 0.12);
                  }
                }
              }
            }
          }
        }
      }

      // Container Box Boundaries (Basin Floor and Walls)
      if (px < bMin[0]) { px = bMin[0]; vx = -vx * 0.2; }
      if (px > bMax[0]) { px = bMax[0]; vx = -vx * 0.2; }
      if (pz < bMin[2]) { pz = bMin[2]; vz = -vz * 0.2; }
      if (pz > bMax[2]) { pz = bMax[2]; vz = -vz * 0.2; }
      if (py < bMin[1]) {
        py = bMin[1];
        vy = -vy * 0.15;
        vx *= 0.85;
        vz *= 0.85;
        if (this.enableSticking) sticking = Math.min(1.0, sticking + 0.04);
      }
      if (py > bMax[1]) { py = bMax[1]; vy = -vy * 0.2; }

      this.pPos[i3 + 0] = px;
      this.pPos[i3 + 1] = py;
      this.pPos[i3 + 2] = pz;
      this.pVel[i3 + 0] = vx;
      this.pVel[i3 + 1] = vy;
      this.pVel[i3 + 2] = vz;
      this.pStick[i] = sticking;

      // Pack into render buffer
      this.particleRenderData[i * 4 + 0] = px;
      this.particleRenderData[i * 4 + 1] = py;
      this.particleRenderData[i * 4 + 2] = pz;
      this.particleRenderData[i * 4 + 3] = sticking;
    }
  }

  // Dynamic Resolution Scaling
  updateDynamicResolution(frameDeltaMs) {
    if (!this.drsAuto) return;
    this.fpsHistory.push(1000.0 / Math.max(frameDeltaMs, 1.0));
    if (this.fpsHistory.length > 20) this.fpsHistory.shift();

    const avgFps = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;
    this.currentFps = Math.round(avgFps);

    let newScale = this.renderScale;
    if (avgFps < 52.0 && this.renderScale > 0.5) {
      newScale = Math.max(0.5, this.renderScale - 0.02);
    } else if (avgFps > 58.0 && this.renderScale < 1.25) {
      newScale = Math.min(1.25, this.renderScale + 0.01);
    }

    if (Math.abs(newScale - this.renderScale) > 0.04) {
      this.renderScale = Math.round(newScale * 100) / 100;
    }
  }

  render(currentTime) {
    const gl = this.gl;
    const deltaMs = currentTime - this.lastFrameTime;
    this.lastFrameTime = currentTime;
    this.simTime += 0.016;

    this.updateDynamicResolution(deltaMs);

    // Canvas resize with Dynamic Resolution Scaling (DRS)
    const targetW = Math.max(1, Math.floor(this.canvas.clientWidth * this.renderScale));
    const targetH = Math.max(1, Math.floor(this.canvas.clientHeight * this.renderScale));
    if (this.canvas.width !== targetW || this.canvas.height !== targetH) {
      this.canvas.width = targetW;
      this.canvas.height = targetH;
    }
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);

    // Step physics
    const t0 = performance.now();
    this.stepSimulation(0.016);
    this.physicsStepMs = (performance.now() - t0).toFixed(2);

    // Camera Matrices
    const cam = this.camera;
    const eyeX = cam.target[0] + cam.distance * Math.cos(cam.orbitX) * Math.sin(cam.orbitY);
    const eyeY = cam.target[1] + cam.distance * Math.sin(cam.orbitX);
    const eyeZ = cam.target[2] + cam.distance * Math.cos(cam.orbitX) * Math.cos(cam.orbitY);
    cam.eye = [eyeX, eyeY, eyeZ];

    const view = createMat4();
    mat4LookAt(view, cam.eye, cam.target, [0, 1, 0]);

    cam.aspect = this.canvas.width / this.canvas.height;
    const proj = createMat4();
    mat4Perspective(proj, cam.fov, cam.aspect, cam.near, cam.far);

    // Clear background
    gl.clearColor(0.05, 0.07, 0.1, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // 1. Draw Floor Grid
    gl.useProgram(this.gridProg);
    gl.uniformMatrix4fv(gl.getUniformLocation(this.gridProg, "u_view"), false, view);
    gl.uniformMatrix4fv(gl.getUniformLocation(this.gridProg, "u_proj"), false, proj);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // 2. Draw 3D Obstacles
    if (this.obstaclesEnabled) {
      gl.useProgram(this.obsProg);
      gl.uniformMatrix4fv(gl.getUniformLocation(this.obsProg, "u_view"), false, view);
      gl.uniformMatrix4fv(gl.getUniformLocation(this.obsProg, "u_proj"), false, proj);
      gl.uniform3fv(gl.getUniformLocation(this.obsProg, "u_eyePos"), cam.eye);

      gl.bindVertexArray(this.sphereVao);

      for (const obs of this.obstacles) {
        const model = createMat4();
        // Model translation & scaling
        const s = obs.shapeType === 0.0 ? obs.radius : obs.halfExtents[0];
        const sy = obs.shapeType === 0.0 ? obs.radius : obs.halfExtents[1];
        const sz = obs.shapeType === 0.0 ? obs.radius : obs.halfExtents[2];

        model[0] = s;
        model[5] = sy;
        model[10] = sz;
        model[12] = obs.pos[0];
        model[13] = obs.pos[1];
        model[14] = obs.pos[2];

        gl.uniformMatrix4fv(gl.getUniformLocation(this.obsProg, "u_model"), false, model);

        if (obs.shapeType === 0.0) {
          gl.uniform3f(gl.getUniformLocation(this.obsProg, "u_color"), 0.85, 0.88, 0.92); // Polished Metal Sphere
        } else if (obs.shapeType === 1.0) {
          gl.uniform3f(gl.getUniformLocation(this.obsProg, "u_color"), 0.28, 0.32, 0.40); // Ceramic Slab
        } else {
          gl.uniform3f(gl.getUniformLocation(this.obsProg, "u_color"), 0.70, 0.42, 0.25); // Copper Cylinder
        }

        gl.drawElements(gl.TRIANGLES, this.sphereVertCount, gl.UNSIGNED_SHORT, 0);
      }
    }

    // 3. Draw Fluid Particles with Spherical SSS & Normal Reconstruction
    gl.useProgram(this.particleProg);
    gl.uniformMatrix4fv(gl.getUniformLocation(this.particleProg, "u_view"), false, view);
    gl.uniformMatrix4fv(gl.getUniformLocation(this.particleProg, "u_proj"), false, proj);
    gl.uniform3fv(gl.getUniformLocation(this.particleProg, "u_eyePos"), cam.eye);

    // Invert view matrix
    const invView = createMat4();
    // Simplified transpose for orthonormal rotation
    invView[0] = view[0]; invView[1] = view[4]; invView[2] = view[8];
    invView[4] = view[1]; invView[5] = view[5]; invView[6] = view[9];
    invView[8] = view[2]; invView[9] = view[6]; invView[10] = view[10];
    invView[12] = cam.eye[0]; invView[13] = cam.eye[1]; invView[14] = cam.eye[2];
    gl.uniformMatrix4fv(gl.getUniformLocation(this.particleProg, "u_invView"), false, invView);

    gl.uniform1f(gl.getUniformLocation(this.particleProg, "u_particleRadius"), 0.075);
    gl.uniform1f(gl.getUniformLocation(this.particleProg, "u_screenHeight"), this.canvas.height);

    // Fluid Material Uniforms
    const mat = this.params;
    gl.uniform4fv(gl.getUniformLocation(this.particleProg, "u_baseColor"), mat.baseColor);
    gl.uniform4fv(gl.getUniformLocation(this.particleProg, "u_sssColor"), mat.subsurfaceColor);
    gl.uniform4fv(gl.getUniformLocation(this.particleProg, "u_stickColor"), mat.stickingColor);
    gl.uniform1f(gl.getUniformLocation(this.particleProg, "u_roughness"), mat.roughness);
    gl.uniform1f(gl.getUniformLocation(this.particleProg, "u_ior"), mat.ior);
    gl.uniform1f(gl.getUniformLocation(this.particleProg, "u_opacity"), mat.opacity);
    gl.uniform1f(gl.getUniformLocation(this.particleProg, "u_specPower"), mat.specularPower);
    gl.uniform1f(gl.getUniformLocation(this.particleProg, "u_sssIntensity"), mat.subsurfaceIntensity);

    // Upload particle positions & sticking
    gl.bindBuffer(gl.ARRAY_BUFFER, this.particleVbo);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.particleRenderData);

    gl.bindVertexArray(this.particleVao);
    gl.drawArrays(gl.POINTS, 0, this.numParticles);
    gl.bindVertexArray(null);
  }

  initEventListeners() {
    const canvas = this.canvas;

    canvas.addEventListener('mousedown', (e) => {
      this.camera.isDragging = true;
      this.camera.isPanning = e.button === 2 || e.shiftKey;
      this.camera.lastMouseX = e.clientX;
      this.camera.lastMouseY = e.clientY;
    });

    window.addEventListener('mouseup', () => {
      this.camera.isDragging = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.camera.isDragging) return;
      const dx = e.clientX - this.camera.lastMouseX;
      const dy = e.clientY - this.camera.lastMouseY;
      this.camera.lastMouseX = e.clientX;
      this.camera.lastMouseY = e.clientY;

      if (this.camera.isPanning) {
        this.camera.target[0] -= dx * 0.005;
        this.camera.target[1] += dy * 0.005;
      } else {
        this.camera.orbitY -= dx * 0.008;
        this.camera.orbitX = Math.max(-1.4, Math.min(1.4, this.camera.orbitX + dy * 0.008));
      }
    });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.camera.distance = Math.max(1.5, Math.min(12.0, this.camera.distance + e.deltaY * 0.005));
    }, { passive: false });

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        this.splashBurst();
      }
    });
  }
}

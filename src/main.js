import { createMat4, mat4Perspective, mat4LookAt, mat4Multiply, mat4Invert } from './math.js';
import { SIMULATION_WGSL } from './simulation_shader.js';
import { RENDER_WGSL } from './render_shader.js';
import { createSphereGeometry, createBoxGeometry } from './geometry.js';
import { FLUID_PRESETS } from './presets.js';

class FluidEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.device = null;
    this.context = null;
    this.format = null;

    // Simulation configuration
    this.numParticles = 2048; // Crisp real-time performance with comprehensive 3D SPH forces
    this.currentPresetKey = 'water';
    this.params = { ...FLUID_PRESETS.water };
    this.pourEnabled = true;
    this.enableSticking = true;
    this.obstaclesEnabled = true;

    // Dynamic Resolution Scaling (DRS)
    this.drsAuto = true;
    this.renderScale = 1.0;
    this.targetFps = 60;
    this.fpsHistory = [];
    this.lastFrameTime = performance.now();
    this.currentFps = 60;
    this.physicsStepMs = 0;

    // Camera & Orbit Controls
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

    // Obstacles in 3D scene (Sphere, Box, Cylinder)
    this.obstacles = [
      {
        pos: [0.0, -0.4, 0.0],
        radius: 0.58,
        vel: [0, 0, 0],
        shapeType: 0.0, // Sphere
        halfExtents: [0.58, 0.58, 0.58],
        stickiness: 1.0
      },
      {
        pos: [-0.95, -0.85, 0.3],
        radius: 0.4,
        vel: [0, 0, 0],
        shapeType: 1.0, // Box
        halfExtents: [0.4, 0.25, 0.4],
        stickiness: 0.8
      },
      {
        pos: [0.95, -0.65, -0.2],
        radius: 0.42,
        vel: [0, 0, 0],
        shapeType: 2.0, // Cylinder
        halfExtents: [0.42, 0.45, 0.42],
        stickiness: 0.9
      }
    ];

    this.simTime = 0;
  }

  async init() {
    if (!navigator.gpu) {
      throw new Error("WebGPU is not supported by your browser or platform. Please enable WebGPU in Chrome / Edge / Firefox Nightly flags.");
    }

    const adapter = await navigator.gpu.requestAdapter({
      powerPreference: 'high-performance'
    });
    if (!adapter) {
      throw new Error("No suitable WebGPU adapter found.");
    }

    this.device = await adapter.requestDevice({
      requiredLimits: {
        maxStorageBufferBindingSize: 128 * 1024 * 1024
      }
    });

    this.context = this.canvas.getContext('webgpu');
    this.format = navigator.gpu.getPreferredCanvasFormat();
    this.context.configure({
      device: this.device,
      format: this.format,
      alphaMode: 'opaque'
    });

    this.initBuffers();
    this.initPipelines();
    this.initEventListeners();
    this.resetFluidParticles();

    console.log("WebGPU Realtime Fluid Engine initialized successfully.");
  }

  initBuffers() {
    const device = this.device;

    // 1. Particle Storage Buffers (Double buffered for Ping-Pong compute passes)
    // Particle struct layout (float x, y, z, sticking, vx, vy, vz, density) = 8 floats = 32 bytes
    const particleBufferSize = this.numParticles * 8 * 4;

    this.particleBufferA = device.createBuffer({
      size: particleBufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
    });

    this.particleBufferB = device.createBuffer({
      size: particleBufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
    });

    // 2. Obstacles Storage Buffer
    // Obstacle: pos(3), radius(1), vel(3), shapeType(1), halfExtents(3), stickiness(1) = 12 floats = 48 bytes
    const obstacleData = new Float32Array(this.obstacles.length * 12);
    this.updateObstacleBufferData(obstacleData);

    this.obstacleBuffer = device.createBuffer({
      size: obstacleData.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    });
    device.queue.writeBuffer(this.obstacleBuffer, 0, obstacleData);

    // 3. SimParams Uniform Buffer
    // 20 floats / ints = 80 bytes (aligned to 96 bytes)
    this.simParamsBuffer = device.createBuffer({
      size: 96,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    // 4. Camera Uniform Buffer
    // view(16), proj(16), invProj(16), invView(16), eyePos(3), aspect(1), screenSize(2), renderScale(1), time(1) = 72 floats = 288 bytes
    this.cameraBuffer = device.createBuffer({
      size: 320,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    // 5. Material Uniform Buffer
    // baseColor(4), subsurfaceColor(4), roughness(1), metallic(1), ior(1), opacity(1), stickingColor(4), attenuation(1), specPower(1), sssInt(1), foam(1) = 20 floats = 80 bytes
    this.materialBuffer = device.createBuffer({
      size: 96,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    // 6. Geometry Buffers for Obstacle Meshes
    const sphere = createSphereGeometry(1.0, 24, 16);
    this.sphereVertCount = sphere.indices.length;

    this.spherePosBuffer = device.createBuffer({
      size: sphere.positions.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    });
    device.queue.writeBuffer(this.spherePosBuffer, 0, sphere.positions);

    this.sphereNormalBuffer = device.createBuffer({
      size: sphere.normals.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    });
    device.queue.writeBuffer(this.sphereNormalBuffer, 0, sphere.normals);

    this.sphereIndexBuffer = device.createBuffer({
      size: sphere.indices.byteLength,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
    });
    device.queue.writeBuffer(this.sphereIndexBuffer, 0, sphere.indices);

    // Create Depth Texture for 3D sorting and screen rendering
    this.recreateDepthTexture();
  }

  recreateDepthTexture() {
    if (this.depthTexture) {
      this.depthTexture.destroy();
    }
    const width = Math.max(1, Math.floor(this.canvas.width * this.renderScale));
    const height = Math.max(1, Math.floor(this.canvas.height * this.renderScale));

    this.depthTexture = this.device.createTexture({
      size: [width, height],
      format: 'depth24plus',
      usage: GPUTextureUsage.RENDER_ATTACHMENT
    });
  }

  updateObstacleBufferData(buffer) {
    let offset = 0;
    for (const obs of this.obstacles) {
      buffer[offset + 0] = obs.pos[0];
      buffer[offset + 1] = obs.pos[1];
      buffer[offset + 2] = obs.pos[2];
      buffer[offset + 3] = obs.radius;

      buffer[offset + 4] = obs.vel[0];
      buffer[offset + 5] = obs.vel[1];
      buffer[offset + 6] = obs.vel[2];
      buffer[offset + 7] = obs.shapeType;

      buffer[offset + 8] = obs.halfExtents[0];
      buffer[offset + 9] = obs.halfExtents[1];
      buffer[offset + 10] = obs.halfExtents[2];
      buffer[offset + 11] = obs.stickiness;

      offset += 12;
    }
  }

  resetFluidParticles() {
    const data = new Float32Array(this.numParticles * 8);
    // Initialize particles in a falling stream & pool block above the colliders
    let idx = 0;
    const side = Math.cbrt(this.numParticles);
    const spacing = 0.11;

    for (let x = 0; x < side; x++) {
      for (let y = 0; y < side; y++) {
        for (let z = 0; z < side; z++) {
          if (idx >= this.numParticles) break;
          const pIndex = idx * 8;

          // Jittered block placement centered above obstacles
          const px = (x - side / 2) * spacing + (Math.random() - 0.5) * 0.02;
          const py = 0.8 + y * spacing + (Math.random() - 0.5) * 0.02;
          const pz = (z - side / 2) * spacing + (Math.random() - 0.5) * 0.02;

          data[pIndex + 0] = px;
          data[pIndex + 1] = py;
          data[pIndex + 2] = pz;
          data[pIndex + 3] = 0.0; // Sticking weight

          data[pIndex + 4] = (Math.random() - 0.5) * 0.1; // vx
          data[pIndex + 5] = -0.5 - Math.random() * 0.5;  // vy downward initial velocity
          data[pIndex + 6] = (Math.random() - 0.5) * 0.1; // vz
          data[pIndex + 7] = this.params.density;         // initial density

          idx++;
        }
      }
    }

    this.device.queue.writeBuffer(this.particleBufferA, 0, data);
    this.device.queue.writeBuffer(this.particleBufferB, 0, data);
  }

  initPipelines() {
    const device = this.device;

    // Simulation Shader Module
    const simModule = device.createShaderModule({ code: SIMULATION_WGSL });

    // 1. Density Pipeline
    this.densityPipeline = device.createComputePipeline({
      layout: 'auto',
      compute: {
        module: simModule,
        entryPoint: 'computeDensity'
      }
    });

    // 2. Forces & Collision Integration Pipeline
    this.forcesPipeline = device.createComputePipeline({
      layout: 'auto',
      compute: {
        module: simModule,
        entryPoint: 'computeForcesAndIntegrate'
      }
    });

    // Create Compute Bind Groups (Ping-Pong A -> B, and B -> A)
    this.simBindGroupA = device.createBindGroup({
      layout: this.densityPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.simParamsBuffer } },
        { binding: 1, resource: { buffer: this.particleBufferA } },
        { binding: 2, resource: { buffer: this.particleBufferB } },
        { binding: 3, resource: { buffer: this.obstacleBuffer } }
      ]
    });

    this.simBindGroupB = device.createBindGroup({
      layout: this.densityPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.simParamsBuffer } },
        { binding: 1, resource: { buffer: this.particleBufferB } },
        { binding: 2, resource: { buffer: this.particleBufferA } },
        { binding: 3, resource: { buffer: this.obstacleBuffer } }
      ]
    });

    // Render Shader Module
    const renderModule = device.createShaderModule({ code: RENDER_WGSL });

    // Fluid Splat Rendering Pipeline with Alpha Blending
    this.fluidPipeline = device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: renderModule,
        entryPoint: 'vs_splat'
      },
      fragment: {
        module: renderModule,
        entryPoint: 'fs_fluid',
        targets: [{
          format: this.format,
          blend: {
            color: {
              srcFactor: 'src-alpha',
              dstFactor: 'one-minus-src-alpha',
              operation: 'add'
            },
            alpha: {
              srcFactor: 'one',
              dstFactor: 'one-minus-src-alpha',
              operation: 'add'
            }
          }
        }]
      },
      primitive: {
        topology: 'triangle-strip',
        cullMode: 'none'
      },
      depthStencil: {
        depthWriteEnabled: true,
        depthCompare: 'less',
        format: 'depth24plus'
      }
    });

    // Obstacle Mesh Rendering Pipeline
    this.obstaclePipeline = device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: renderModule,
        entryPoint: 'vs_obstacle',
        buffers: [
          {
            arrayStride: 12,
            attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }]
          },
          {
            arrayStride: 12,
            attributes: [{ shaderLocation: 1, offset: 0, format: 'float32x3' }]
          }
        ]
      },
      fragment: {
        module: renderModule,
        entryPoint: 'fs_obstacle',
        targets: [{ format: this.format }]
      },
      primitive: {
        topology: 'triangle-list',
        cullMode: 'back'
      },
      depthStencil: {
        depthWriteEnabled: true,
        depthCompare: 'less',
        format: 'depth24plus'
      }
    });

    // Grid Floor Pipeline
    this.gridPipeline = device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: renderModule,
        entryPoint: 'vs_grid'
      },
      fragment: {
        module: renderModule,
        entryPoint: 'fs_grid',
        targets: [{ format: this.format }]
      },
      primitive: {
        topology: 'triangle-list'
      },
      depthStencil: {
        depthWriteEnabled: true,
        depthCompare: 'less',
        format: 'depth24plus'
      }
    });
  }

  updateSimulationParams() {
    const f32 = new Float32Array(24);
    const u32 = new Uint32Array(f32.buffer);

    f32[0] = 0.005; // dt
    f32[1] = 0.065; // particleRadius
    f32[2] = 0.17;  // smoothingLength
    f32[3] = this.params.density; // restDensity

    f32[4] = this.params.viscosity;
    f32[5] = this.params.adhesion;
    f32[6] = this.params.sticking;
    f32[7] = this.params.gravity;

    // boxMin: vec3(-2.0, -1.4, -2.0)
    f32[8] = -2.0; f32[9] = -1.4; f32[10] = -2.0;
    u32[11] = this.numParticles;

    // boxMax: vec3(2.0, 2.0, 2.0)
    f32[12] = 2.0; f32[13] = 2.0; f32[14] = 2.0;
    u32[15] = this.obstaclesEnabled ? this.obstacles.length : 0;

    f32[16] = this.simTime;
    f32[17] = this.pourEnabled ? 1.0 : 0.0;
    f32[18] = 1.0; // pourRate
    f32[19] = this.enableSticking ? 1.0 : 0.0;

    this.device.queue.writeBuffer(this.simParamsBuffer, 0, f32);
  }

  updateCameraUniforms() {
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

    const invProj = createMat4();
    mat4Invert(invProj, proj);

    const invView = createMat4();
    mat4Invert(invView, view);

    const camData = new Float32Array(80);
    camData.set(view, 0);
    camData.set(proj, 16);
    camData.set(invProj, 32);
    camData.set(invView, 48);

    camData[64] = eyeX; camData[65] = eyeY; camData[66] = eyeZ; camData[67] = cam.aspect;
    camData[68] = this.canvas.width; camData[69] = this.canvas.height;
    camData[70] = this.renderScale;
    camData[71] = this.simTime;

    this.device.queue.writeBuffer(this.cameraBuffer, 0, camData);
  }

  updateMaterialUniforms() {
    const mat = this.params;
    const f32 = new Float32Array(24);

    // baseColor (vec4)
    f32[0] = mat.baseColor[0]; f32[1] = mat.baseColor[1]; f32[2] = mat.baseColor[2]; f32[3] = mat.baseColor[3];
    // subsurfaceColor (vec4)
    f32[4] = mat.subsurfaceColor[0]; f32[5] = mat.subsurfaceColor[1]; f32[6] = mat.subsurfaceColor[2]; f32[7] = mat.subsurfaceColor[3];

    f32[8] = mat.roughness;
    f32[9] = mat.metallic;
    f32[10] = mat.ior;
    f32[11] = mat.opacity;

    // stickingColor (vec4)
    f32[12] = mat.stickingColor[0]; f32[13] = mat.stickingColor[1]; f32[14] = mat.stickingColor[2]; f32[15] = mat.stickingColor[3];

    f32[16] = mat.attenuationDistance;
    f32[17] = mat.specularPower;
    f32[18] = mat.subsurfaceIntensity;
    f32[19] = mat.foamIntensity;

    this.device.queue.writeBuffer(this.materialBuffer, 0, f32);
  }

  // Unreal Engine style Dynamic Resolution Scaling (DRS) algorithm
  updateDynamicResolution(frameDeltaMs) {
    if (!this.drsAuto) return;

    this.fpsHistory.push(1000.0 / Math.max(frameDeltaMs, 1.0));
    if (this.fpsHistory.length > 20) this.fpsHistory.shift();

    const avgFps = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;
    this.currentFps = Math.round(avgFps);

    // DRS Adjustment logic
    let newScale = this.renderScale;
    if (avgFps < 52.0 && this.renderScale > 0.5) {
      newScale = Math.max(0.5, this.renderScale - 0.02);
    } else if (avgFps > 58.0 && this.renderScale < 1.25) {
      newScale = Math.min(1.25, this.renderScale + 0.01);
    }

    if (Math.abs(newScale - this.renderScale) > 0.04) {
      this.renderScale = Math.round(newScale * 100) / 100;
      this.recreateDepthTexture();
    }
  }

  setPreset(key) {
    if (FLUID_PRESETS[key]) {
      this.currentPresetKey = key;
      this.params = { ...FLUID_PRESETS[key] };
      this.updateMaterialUniforms();
      this.updateSimulationParams();
    }
  }

  render(currentTime) {
    const deltaMs = currentTime - this.lastFrameTime;
    this.lastFrameTime = currentTime;
    this.simTime += 0.016;

    // 1. Dynamic Resolution evaluation
    this.updateDynamicResolution(deltaMs);

    // Handle canvas dimensions
    const displayWidth = this.canvas.clientWidth;
    const displayHeight = this.canvas.clientHeight;
    if (this.canvas.width !== displayWidth || this.canvas.height !== displayHeight) {
      this.canvas.width = displayWidth;
      this.canvas.height = displayHeight;
      this.recreateDepthTexture();
    }

    // 2. Animate Dynamic Obstacles slightly for realistic fluid splash & surface adherence
    const obsSin = Math.sin(this.simTime * 1.5) * 0.15;
    this.obstacles[0].pos[0] = obsSin;
    this.obstacles[0].vel[0] = Math.cos(this.simTime * 1.5) * 0.15 * 1.5;

    const obsData = new Float32Array(this.obstacles.length * 12);
    this.updateObstacleBufferData(obsData);
    this.device.queue.writeBuffer(this.obstacleBuffer, 0, obsData);

    // 3. Update Uniforms
    this.updateSimulationParams();
    this.updateCameraUniforms();
    this.updateMaterialUniforms();

    const tStartSim = performance.now();
    const commandEncoder = this.device.createCommandEncoder();

    // 4. Compute Pass 1: Compute Density (Buffer A -> Buffer B)
    const computePass1 = commandEncoder.beginComputePass();
    computePass1.setPipeline(this.densityPipeline);
    computePass1.setBindGroup(0, this.simBindGroupA);
    computePass1.dispatchWorkgroups(Math.ceil(this.numParticles / 64));
    computePass1.end();

    // 5. Compute Pass 2: Compute SPH Forces & Collision Integration (Buffer B -> Buffer A)
    const computePass2 = commandEncoder.beginComputePass();
    computePass2.setPipeline(this.forcesPipeline);
    computePass2.setBindGroup(0, this.simBindGroupB);
    computePass2.dispatchWorkgroups(Math.ceil(this.numParticles / 64));
    computePass2.end();

    this.physicsStepMs = (performance.now() - tStartSim).toFixed(2);

    // 6. Graphics Render Pass
    const currentView = this.context.getCurrentTexture().createView();
    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [{
        view: currentView,
        clearValue: { r: 0.05, g: 0.07, b: 0.1, a: 1.0 },
        loadOp: 'clear',
        storeOp: 'store'
      }],
      depthStencilAttachment: {
        view: this.depthTexture.createView(),
        depthClearValue: 1.0,
        depthLoadOp: 'clear',
        depthStoreOp: 'store'
      }
    });

    // Draw Floor Grid
    renderPass.setPipeline(this.gridPipeline);
    renderPass.setBindGroup(0, this.device.createBindGroup({
      layout: this.gridPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.cameraBuffer } },
        { binding: 1, resource: { buffer: this.materialBuffer } },
        { binding: 2, resource: { buffer: this.particleBufferA } },
        { binding: 3, resource: { buffer: this.obstacleBuffer } }
      ]
    }));
    renderPass.draw(6);

    // Draw Obstacles
    if (this.obstaclesEnabled) {
      renderPass.setPipeline(this.obstaclePipeline);
      renderPass.setBindGroup(0, this.device.createBindGroup({
        layout: this.obstaclePipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: this.cameraBuffer } },
          { binding: 1, resource: { buffer: this.materialBuffer } },
          { binding: 2, resource: { buffer: this.particleBufferA } },
          { binding: 3, resource: { buffer: this.obstacleBuffer } }
        ]
      }));
      renderPass.setVertexBuffer(0, this.spherePosBuffer);
      renderPass.setVertexBuffer(1, this.sphereNormalBuffer);
      renderPass.setIndexBuffer(this.sphereIndexBuffer, 'uint16');
      renderPass.drawIndexed(this.sphereVertCount, this.obstacles.length);
    }

    // Draw 3D Fluid Particles with Screen Space Splats & Shaders
    renderPass.setPipeline(this.fluidPipeline);
    renderPass.setBindGroup(0, this.device.createBindGroup({
      layout: this.fluidPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.cameraBuffer } },
        { binding: 1, resource: { buffer: this.materialBuffer } },
        { binding: 2, resource: { buffer: this.particleBufferA } },
        { binding: 3, resource: { buffer: this.obstacleBuffer } }
      ]
    }));
    renderPass.draw(4, this.numParticles);

    renderPass.end();

    // Submit Work to GPU
    this.device.queue.submit([commandEncoder.finish()]);
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

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

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
        this.camera.orbitY += dx * 0.008;
        this.camera.orbitX = Math.max(-1.4, Math.min(1.4, this.camera.orbitX + dy * 0.008));
      }
    });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.camera.distance = Math.max(1.5, Math.min(12.0, this.camera.distance + e.deltaY * 0.004));
    }, { passive: false });

    // Keyboard trigger for splash burst
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        this.splashBurst();
      }
    });
  }

  splashBurst() {
    this.resetFluidParticles();
  }
}

// -------------------------------------------------------------
// UI Integration and Application Bootstrap
// -------------------------------------------------------------
async function bootstrap() {
  const canvas = document.getElementById('simulation-canvas');
  const errorBanner = document.getElementById('error-banner');

  try {
    const engine = new FluidEngine(canvas);
    await engine.init();

    // Hook UI elements
    const statFps = document.getElementById('stat-fps');
    const statParticles = document.getElementById('stat-particles');
    const statRes = document.getElementById('stat-res');
    const statSimTime = document.getElementById('stat-simtime');

    const toggleDrs = document.getElementById('toggle-drs');
    const sliderScale = document.getElementById('slider-scale');
    const labelScale = document.getElementById('label-scale');

    const sliderViscosity = document.getElementById('slider-viscosity');
    const labelViscosity = document.getElementById('label-viscosity');

    const sliderAdhesion = document.getElementById('slider-adhesion');
    const labelAdhesion = document.getElementById('label-adhesion');

    const sliderStick = document.getElementById('slider-stick');
    const labelStick = document.getElementById('label-stick');

    const sliderGravity = document.getElementById('slider-gravity');
    const labelGravity = document.getElementById('label-gravity');

    const toggleObstacles = document.getElementById('toggle-obstacles');
    const toggleSticking = document.getElementById('toggle-sticking');

    const btnPour = document.getElementById('btn-pour');
    const btnReset = document.getElementById('btn-reset');

    // Preset Buttons
    const presetButtons = document.querySelectorAll('.preset-btn');
    presetButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        presetButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const key = btn.dataset.preset;
        engine.setPreset(key);

        // Update UI sliders to match preset
        sliderViscosity.value = engine.params.viscosity;
        labelViscosity.textContent = engine.params.viscosity.toFixed(3);

        sliderAdhesion.value = engine.params.adhesion;
        labelAdhesion.textContent = engine.params.adhesion.toFixed(2);

        sliderStick.value = engine.params.sticking;
        labelStick.textContent = engine.params.sticking.toFixed(2);

        sliderGravity.value = engine.params.gravity;
        labelGravity.textContent = engine.params.gravity.toFixed(1);
      });
    });

    // DRS Toggles
    toggleDrs.addEventListener('change', (e) => {
      engine.drsAuto = e.target.checked;
      sliderScale.disabled = e.target.checked;
    });

    sliderScale.addEventListener('input', (e) => {
      if (!engine.drsAuto) {
        engine.renderScale = parseFloat(e.target.value);
        labelScale.textContent = `${engine.renderScale.toFixed(2)}x`;
        engine.recreateDepthTexture();
      }
    });

    // Sliders
    sliderViscosity.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      engine.params.viscosity = v;
      labelViscosity.textContent = v.toFixed(3);
    });

    sliderAdhesion.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      engine.params.adhesion = v;
      labelAdhesion.textContent = v.toFixed(2);
    });

    sliderStick.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      engine.params.sticking = v;
      labelStick.textContent = v.toFixed(2);
    });

    sliderGravity.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      engine.params.gravity = v;
      labelGravity.textContent = v.toFixed(1);
    });

    toggleObstacles.addEventListener('change', (e) => {
      engine.obstaclesEnabled = e.target.checked;
    });

    toggleSticking.addEventListener('change', (e) => {
      engine.enableSticking = e.target.checked;
    });

    btnPour.addEventListener('click', () => {
      engine.pourEnabled = !engine.pourEnabled;
      btnPour.style.background = engine.pourEnabled ? '#2563eb' : '#475569';
    });

    btnReset.addEventListener('click', () => {
      engine.splashBurst();
    });

    statParticles.textContent = engine.numParticles.toLocaleString();

    // Main Animation Loop
    let lastUiUpdate = 0;
    function frame(time) {
      engine.render(time);

      if (time - lastUiUpdate > 250) {
        lastUiUpdate = time;
        statFps.textContent = `${engine.currentFps} FPS`;
        statRes.textContent = `${Math.round(engine.renderScale * 100)}%`;
        statSimTime.textContent = `${engine.physicsStepMs} ms`;
        if (engine.drsAuto) {
          sliderScale.value = engine.renderScale;
          labelScale.textContent = `${engine.renderScale.toFixed(2)}x (Auto)`;
        }
      }

      requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);

  } catch (err) {
    console.error("WebGPU Initialization Error:", err);
    errorBanner.style.display = 'block';
    errorBanner.innerHTML = `<strong>WebGPU Initialization Failed:</strong><br>${err.message}<br><br><span style="font-size:12px;opacity:0.9;">Ensure your browser supports WebGPU and WebGPU is enabled in browser flags.</span>`;
  }
}

window.addEventListener('DOMContentLoaded', bootstrap);

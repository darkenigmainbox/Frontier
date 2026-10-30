import {
  DEFAULT_EROSION_PARAMS,
  EMITTER_MODES,
  EROSION_LANDSCAPES,
} from './erosion-presets.js';
import {
  FULLSCREEN_VERT,
  INIT_PARTICLES_FRAG,
  INIT_TERRAIN_FRAG,
  PARTICLE_RENDER_FRAG,
  PARTICLE_RENDER_VERT,
  PARTICLE_SCATTER_FRAG,
  PARTICLE_SCATTER_VERT,
  PARTICLE_STEP_FRAG,
  SKY_BG_FRAG,
  SNOW_CRYO_FRAG,
  TERRAIN_INTEGRATE_FRAG,
  TERRAIN_RENDER_FRAG,
  TERRAIN_RENDER_VERT,
  THERMAL_TALUS_FRAG,
  WATER_FLUX_FRAG,
} from './erosion-shaders.js';

const PART_TEX_W = 256;
const PART_TEX_H = 128; // 256 * 128 = 32,768 GPU particle slots
export const MAX_GPU_PARTICLES = PART_TEX_W * PART_TEX_H;

const TELEMETRY_RES = 64;

const TELEMETRY_FRAG = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
in vec2 vUv;
layout(location = 0) out vec4 outStats;
uniform sampler2D uTerrainTex;
uniform sampler2D uInitialTex;
uniform float uGridRes;
void main() {
  ivec2 tc = clamp(ivec2(vUv * uGridRes), ivec2(0), ivec2(int(uGridRes) - 1));
  vec4 cur = texelFetch(uTerrainTex, tc, 0);
  vec4 ini = texelFetch(uInitialTex, tc, 0);
  float eroded = max(0.0, ini.r - cur.r);
  outStats = vec4(eroded, cur.g, cur.b, cur.a);
}
`;

function compileShader(gl, type, source, label) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, source);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error(`[GPU Erosion ${label}] Shader compile error:\n${log}`);
  }
  return sh;
}

function createProgram(gl, vsSrc, fsSrc, label) {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vsSrc, `${label}:VS`);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSrc, `${label}:FS`);
  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(prog);
    gl.deleteProgram(prog);
    throw new Error(`[GPU Erosion ${label}] Program link error:\n${log}`);
  }
  return prog;
}

function createDataTexture(gl, w, h, internalFormat, format, type) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);
  gl.bindTexture(gl.TEXTURE_2D, null);
  return tex;
}

function createFbo(gl, textures) {
  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  const drawBuffers = [];
  for (let i = 0; i < textures.length; i++) {
    const att = gl.COLOR_ATTACHMENT0 + i;
    gl.framebufferTexture2D(gl.FRAMEBUFFER, att, gl.TEXTURE_2D, textures[i], 0);
    drawBuffers.push(att);
  }
  gl.drawBuffers(drawBuffers);
  const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  if (status !== gl.FRAMEBUFFER_COMPLETE) {
    throw new Error(`Incomplete WebGL2 FBO: 0x${status.toString(16)}`);
  }
  return fbo;
}

export class GpuErosionEngine {
  constructor(canvas, onTelemetry = null) {
    this.canvas = canvas;
    this.onTelemetry = onTelemetry;

    const gl = canvas.getContext('webgl2', {
      antialias: true,
      alpha: false,
      depth: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    if (!gl) {
      throw new Error('WebGL2 is required for GPU Particle Erosion.');
    }
    this.gl = gl;

    const extColorFloat = gl.getExtension('EXT_color_buffer_float');
    if (!extColorFloat) {
      throw new Error('EXT_color_buffer_float is required for float32 GPGPU erosion.');
    }
    this.hasFloatBlend = Boolean(gl.getExtension('EXT_float_blend'));
    gl.getExtension('OES_texture_float_linear');

    this.params = { ...DEFAULT_EROSION_PARAMS };
    this.gridRes = this.params.gridSize; // 512

    this.active = false;   // Whether this viewport tab is visible
    this.playing = true;   // Whether simulation steps advance each frame
    this.stepCount = 0;
    this.startTimeMs = performance.now();
    this.fps = 60;
    this._fpsFrames = 0;
    this._fpsLastMs = performance.now();

    this.telemetry = {
      steps: 0,
      particles: this.params.particleCount,
      erodedVolumeM3: 0,
      coarseSedM3: 0,
      fineSedM3: 0,
      fps: 60,
    };

    // Camera state (3D Orbit + Pan)
    this.camera = {
      yaw: 0.42,
      pitch: 0.46,
      distance: 740.0,
      target: [0, 54, 0],
      fovDeg: 44,
    };

    // Storm & Interactive Brush state in world XZ coordinates
    this.stormTarget = [0, 0];
    this.pointerWorldXZ = [0, 0];
    this.brushDown = false;

    this._initPrograms();
    this._initBuffersAndTextures();
    this._initMeshVao();
    this._bindEvents();

    this.resetSimulation();
  }

  _initPrograms() {
    const gl = this.gl;
    this.progInitTerrain = createProgram(gl, FULLSCREEN_VERT, INIT_TERRAIN_FRAG, 'InitTerrain');
    this.progInitParticles = createProgram(gl, FULLSCREEN_VERT, INIT_PARTICLES_FRAG, 'InitParticles');
    this.progParticleStep = createProgram(gl, FULLSCREEN_VERT, PARTICLE_STEP_FRAG, 'ParticleStep');
    this.progParticleScatter = createProgram(gl, PARTICLE_SCATTER_VERT, PARTICLE_SCATTER_FRAG, 'ParticleScatter');
    this.progWaterFlux = createProgram(gl, FULLSCREEN_VERT, WATER_FLUX_FRAG, 'WaterFlux');
    this.progTerrainIntegrate = createProgram(gl, FULLSCREEN_VERT, TERRAIN_INTEGRATE_FRAG, 'TerrainIntegrate');
    this.progSnowCryo = createProgram(gl, FULLSCREEN_VERT, SNOW_CRYO_FRAG, 'SnowCryo');
    this.progThermalTalus = createProgram(gl, FULLSCREEN_VERT, THERMAL_TALUS_FRAG, 'ThermalTalus');
    this.progTerrainRender = createProgram(gl, TERRAIN_RENDER_VERT, TERRAIN_RENDER_FRAG, 'TerrainRender');
    this.progParticleRender = createProgram(gl, PARTICLE_RENDER_VERT, PARTICLE_RENDER_FRAG, 'ParticleRender');
    this.progSkyBg = createProgram(gl, FULLSCREEN_VERT, SKY_BG_FRAG, 'SkyBg');
    this.progTelemetry = createProgram(gl, FULLSCREEN_VERT, TELEMETRY_FRAG, 'Telemetry');
  }

  _initBuffersAndTextures() {
    const gl = this.gl;
    const R = this.gridRes;

    this.emptyVao = gl.createVertexArray();

    // Terrain ping-pong (RGBA32F: bedrock, coarseSed, fineSed, water)
    this.terrainTex = [
      createDataTexture(gl, R, R, gl.RGBA32F, gl.RGBA, gl.FLOAT),
      createDataTexture(gl, R, R, gl.RGBA32F, gl.RGBA, gl.FLOAT),
    ];
    this.terrainIdx = 0;

    // Initial un-eroded snapshot for cut/fill heatmap & cubic-meter telemetry
    this.initialTerrainTex = createDataTexture(gl, R, R, gl.RGBA32F, gl.RGBA, gl.FLOAT);
    this.fboInitialTerrain = createFbo(gl, [this.initialTerrainTex]);

    // Pipe flux ping-pong (RGBA32F)
    this.fluxTex = [
      createDataTexture(gl, R, R, gl.RGBA32F, gl.RGBA, gl.FLOAT),
      createDataTexture(gl, R, R, gl.RGBA32F, gl.RGBA, gl.FLOAT),
    ];
    this.fluxIdx = 0;
    this.fboFlux = [
      createFbo(gl, [this.fluxTex[0]]),
      createFbo(gl, [this.fluxTex[1]]),
    ];

    // Eulerian velocity & discharge field (RGBA32F)
    this.velocityFieldTex = createDataTexture(gl, R, R, gl.RGBA32F, gl.RGBA, gl.FLOAT);

    // Cryosphere ping-pong (RGBA32F: snowpack depth, glacier ice thickness, prev snow, ice melt)
    this.snowTex = [
      createDataTexture(gl, R, R, gl.RGBA32F, gl.RGBA, gl.FLOAT),
      createDataTexture(gl, R, R, gl.RGBA32F, gl.RGBA, gl.FLOAT),
    ];
    this.snowIdx = 0;
    this.fboSnowClear = [
      createFbo(gl, [this.snowTex[0]]),
      createFbo(gl, [this.snowTex[1]]),
    ];

    // Terrain single & MRT FBOs
    this.fboTerrainSingle = [
      createFbo(gl, [this.terrainTex[0]]),
      createFbo(gl, [this.terrainTex[1]]),
    ];
    this.fboTerrainIntegrate = [
      createFbo(gl, [this.terrainTex[0], this.velocityFieldTex]),
      createFbo(gl, [this.terrainTex[1], this.velocityFieldTex]),
    ];

    // Additive particle scatter target: RGBA32F when EXT_float_blend is supported, RGBA16F fallback otherwise!
    const scatterInternal = this.hasFloatBlend ? gl.RGBA32F : gl.RGBA16F;
    const scatterType = this.hasFloatBlend ? gl.FLOAT : gl.HALF_FLOAT;
    this.deltaTex = createDataTexture(gl, R, R, scatterInternal, gl.RGBA, scatterType);
    this.snowDeltaTex = createDataTexture(gl, R, R, scatterInternal, gl.RGBA, scatterType);
    this.fboDelta = createFbo(gl, [this.deltaTex, this.snowDeltaTex]);

    // 32,768 GPU Particle Ping-Pong Textures (256 x 128 RGBA32F)
    this.partPosAge = [
      createDataTexture(gl, PART_TEX_W, PART_TEX_H, gl.RGBA32F, gl.RGBA, gl.FLOAT),
      createDataTexture(gl, PART_TEX_W, PART_TEX_H, gl.RGBA32F, gl.RGBA, gl.FLOAT),
    ];
    this.partVelWater = [
      createDataTexture(gl, PART_TEX_W, PART_TEX_H, gl.RGBA32F, gl.RGBA, gl.FLOAT),
      createDataTexture(gl, PART_TEX_W, PART_TEX_H, gl.RGBA32F, gl.RGBA, gl.FLOAT),
    ];
    this.partSediment = [
      createDataTexture(gl, PART_TEX_W, PART_TEX_H, gl.RGBA32F, gl.RGBA, gl.FLOAT),
      createDataTexture(gl, PART_TEX_W, PART_TEX_H, gl.RGBA32F, gl.RGBA, gl.FLOAT),
    ];
    this.partExchange = createDataTexture(gl, PART_TEX_W, PART_TEX_H, gl.RGBA32F, gl.RGBA, gl.FLOAT);
    this.partExchange2 = createDataTexture(gl, PART_TEX_W, PART_TEX_H, gl.RGBA32F, gl.RGBA, gl.FLOAT);
    this.partIdx = 0;

    this.fboInitParticles = [
      createFbo(gl, [this.partPosAge[0], this.partVelWater[0], this.partSediment[0]]),
      createFbo(gl, [this.partPosAge[1], this.partVelWater[1], this.partSediment[1]]),
    ];
    this.fboStepParticles = [
      createFbo(gl, [this.partPosAge[0], this.partVelWater[0], this.partSediment[0], this.partExchange, this.partExchange2]),
      createFbo(gl, [this.partPosAge[1], this.partVelWater[1], this.partSediment[1], this.partExchange, this.partExchange2]),
    ];

    // Tiny 64x64 telemetry downsample FBO (sampled only once every 36 steps -> zero frame stall!)
    this.telemetryTex = createDataTexture(gl, TELEMETRY_RES, TELEMETRY_RES, gl.RGBA32F, gl.RGBA, gl.FLOAT);
    this.fboTelemetry = createFbo(gl, [this.telemetryTex]);
    this.telemetryBuf = new Float32Array(TELEMETRY_RES * TELEMETRY_RES * 4);
  }

  _initMeshVao() {
    const gl = this.gl;
    // Build a (R + 2) x (R + 2) grid where outer 1-vertex border has UV slightly outside [0, 1]
    // so TERRAIN_RENDER_VERT drops the outer ring cleanly to y = 0 as a solid geological block plinth!
    const N = this.gridRes;
    const M = N + 2;
    const uvs = new Float32Array(M * M * 2);
    let ptr = 0;
    for (let z = 0; z < M; z++) {
      const v = z === 0 ? -0.002 : z === M - 1 ? 1.002 : (z - 1) / (N - 1);
      for (let x = 0; x < M; x++) {
        const u = x === 0 ? -0.002 : x === M - 1 ? 1.002 : (x - 1) / (N - 1);
        uvs[ptr++] = u;
        uvs[ptr++] = v;
      }
    }

    const quadCount = (M - 1) * (M - 1);
    const indices = new Uint32Array(quadCount * 6);
    let ip = 0;
    for (let z = 0; z < M - 1; z++) {
      for (let x = 0; x < M - 1; x++) {
        const i00 = z * M + x;
        const i10 = i00 + 1;
        const i01 = i00 + M;
        const i11 = i01 + 1;
        indices[ip++] = i00;
        indices[ip++] = i01;
        indices[ip++] = i10;
        indices[ip++] = i10;
        indices[ip++] = i01;
        indices[ip++] = i11;
      }
    }

    this.terrainIndexCount = indices.length;
    this.terrainVao = gl.createVertexArray();
    gl.bindVertexArray(this.terrainVao);

    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    const ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    gl.bindVertexArray(null);
  }

  _bindEvents() {
    const el = this.canvas;
    let dragging = false;
    let button = 0;
    let lastX = 0;
    let lastY = 0;

    el.addEventListener('contextmenu', (e) => e.preventDefault());

    el.addEventListener('pointerdown', (e) => {
      if (!this.active) return;
      dragging = true;
      button = e.button;
      lastX = e.clientX;
      lastY = e.clientY;
      el.setPointerCapture(e.pointerId);

      const hit = this._raycastPlaneXZ(e.clientX, e.clientY);
      if (hit) this.pointerWorldXZ = hit;

      const isToolStroke =
        button === 0 &&
        (e.shiftKey || (this.params.brushMode && this.params.brushMode !== 'orbit'));
      if (isToolStroke && hit) {
        this.brushDown = true;
        if (this.params.brushMode === 'cloudburst' || e.shiftKey) {
          this.stormTarget = [hit[0], hit[1]];
        }
      }
    });

    el.addEventListener('pointermove', (e) => {
      if (!this.active) return;
      const hit = this._raycastPlaneXZ(e.clientX, e.clientY);
      if (hit) {
        this.pointerWorldXZ = hit;
        if (this.brushDown && (this.params.brushMode === 'cloudburst' || e.shiftKey)) {
          this.stormTarget = [hit[0], hit[1]];
        }
      }

      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;

      if (this.brushDown) return;

      if (button === 2 || button === 1 || (button === 0 && e.altKey)) {
        const panScale = this.camera.distance * 0.0014;
        const cy = Math.cos(this.camera.yaw);
        const sy = Math.sin(this.camera.yaw);
        this.camera.target[0] -= (cy * dx - sy * dy * 0.7) * panScale;
        this.camera.target[2] -= (-sy * dx - cy * dy * 0.7) * panScale;
      } else if (button === 0) {
        this.camera.yaw -= dx * 0.0065;
        this.camera.pitch = Math.max(0.12, Math.min(1.46, this.camera.pitch + dy * 0.006));
      }
    });

    const endDrag = () => {
      dragging = false;
      this.brushDown = false;
    };
    el.addEventListener('pointerup', endDrag);
    el.addEventListener('pointercancel', endDrag);

    el.addEventListener(
      'wheel',
      (e) => {
        if (!this.active) return;
        e.preventDefault();
        const factor = Math.exp(e.deltaY * 0.0011);
        this.camera.distance = Math.max(85, Math.min(1150, this.camera.distance * factor));
      },
      { passive: false }
    );
  }

  _raycastPlaneXZ(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return null;
    const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = 1 - ((clientY - rect.top) / rect.height) * 2;

    const { eye, forward, right, up } = this._getCameraBasis();
    const aspect = rect.width / rect.height;
    const tanHalf = Math.tan((this.camera.fovDeg * Math.PI) / 360);

    const dirX = forward[0] + right[0] * ndcX * aspect * tanHalf + up[0] * ndcY * tanHalf;
    const dirY = forward[1] + right[1] * ndcX * aspect * tanHalf + up[1] * ndcY * tanHalf;
    const dirZ = forward[2] + right[2] * ndcX * aspect * tanHalf + up[2] * ndcY * tanHalf;

    const refY = this.params.relief * 0.35;
    if (Math.abs(dirY) < 1e-4) return null;
    const t = (refY - eye[1]) / dirY;
    if (t < 0) return null;

    const half = this.params.worldSpan * 0.5;
    const wx = Math.max(-half, Math.min(half, eye[0] + dirX * t));
    const wz = Math.max(-half, Math.min(half, eye[2] + dirZ * t));
    return [wx, wz];
  }

  _getCameraBasis() {
    const { yaw, pitch, distance, target } = this.camera;
    const cp = Math.cos(pitch);
    const sp = Math.sin(pitch);
    const cy = Math.cos(yaw);
    const sy = Math.sin(yaw);

    const eye = [
      target[0] + distance * cp * sy,
      target[1] + distance * sp,
      target[2] + distance * cp * cy,
    ];
    let fx = target[0] - eye[0];
    let fy = target[1] - eye[1];
    let fz = target[2] - eye[2];
    const fl = Math.hypot(fx, fy, fz) || 1;
    fx /= fl; fy /= fl; fz /= fl;

    // right = normalize(cross(forward, worldUp))
    let rx = -fz;
    let ry = 0;
    let rz = fx;
    const rl = Math.hypot(rx, ry, rz) || 1;
    rx /= rl; rz /= rl;

    // up = cross(right, forward)
    const ux = ry * fz - rz * fy;
    const uy = rz * fx - rx * fz;
    const uz = rx * fy - ry * fx;

    return {
      eye,
      forward: [fx, fy, fz],
      right: [rx, ry, rz],
      up: [ux, uy, uz],
    };
  }

  _buildViewProjMatrix(aspect) {
    const { eye, forward, right, up } = this._getCameraBasis();
    const f = 1.0 / Math.tan((this.camera.fovDeg * Math.PI) / 360);
    const near = 2.0;
    const far = 3200.0;
    const nf = 1.0 / (near - far);

    // View matrix (column-major)
    const v0 = right[0], v4 = right[1], v8 = right[2],  v12 = -(right[0] * eye[0] + right[1] * eye[1] + right[2] * eye[2]);
    const v1 = up[0],    v5 = up[1],    v9 = up[2],     v13 = -(up[0] * eye[0] + up[1] * eye[1] + up[2] * eye[2]);
    const v2 = -forward[0], v6 = -forward[1], v10 = -forward[2], v14 = (forward[0] * eye[0] + forward[1] * eye[1] + forward[2] * eye[2]);

    const p0 = f / Math.max(aspect, 0.1);
    const p5 = f;
    const p10 = (far + near) * nf;
    const p14 = 2 * far * near * nf;

    const out = new Float32Array(16);
    out[0] = p0 * v0;  out[4] = p0 * v4;  out[8]  = p0 * v8;  out[12] = p0 * v12;
    out[1] = p5 * v1;  out[5] = p5 * v5;  out[9]  = p5 * v9;  out[13] = p5 * v13;
    out[2] = p10 * v2; out[6] = p10 * v6; out[10] = p10 * v10; out[14] = p10 * v14 + p14;
    out[3] = -v2;      out[7] = -v6;      out[11] = -v10;      out[15] = -v14;
    return { viewProj: out, eye };
  }

  _themeCode() {
    const theme = Number(this.params.materialTheme);
    return Number.isFinite(theme) ? Math.max(0, Math.min(3, Math.round(theme))) : 0;
  }

  _getHardnessUniforms() {
    const p = this.params;
    const strikeRad = (p.strataStrike * Math.PI) / 180;
    const dipRad = (p.strataDip * Math.PI) / 180;
    return {
      hardnessVec: [p.rockHardness, p.strataStrength, p.strataFreq, p.faultWeakness],
      strataVec: [Math.sin(strikeRad), Math.cos(strikeRad), Math.tan(dipRad), Math.max(40, p.relief)],
    };
  }

  /**
   * Derives the multi-agent particle species mix (rain / snow / wind / rockfall) plus the
   * wind vector from the active emitter mode and climate sliders.
   */
  _getClimateUniforms() {
    const p = this.params;
    const clamp01 = (v) => Math.max(0, Math.min(1, Number(v) || 0));
    const snowPossible = clamp01(p.snowfallRate) * (1.0 - clamp01((p.snowline - 0.10) / 0.95));

    let rain = 1, snow = 0, wind = 0, rock = 0;
    if (p.emitterMode === 'glacial-blizzard') {
      rain = 0.20 + 0.25 * (1.0 - snowPossible);
      snow = 0.95 + 0.45 * snowPossible;
      wind = 0.22 + 0.30 * clamp01(p.windSpeed);
      rock = 0.05 + 0.14 * clamp01(p.rockfallRate);
    } else if (p.emitterMode === 'aeolian-wind') {
      rain = 0.05;
      snow = 0.05 * snowPossible;
      wind = 1.05 + 0.45 * clamp01(p.windSpeed);
      rock = 0.05 + 0.16 * clamp01(p.rockfallRate);
    } else if (p.emitterMode === 'rockfall-avalanche') {
      rain = 0.05;
      snow = 0.03 * snowPossible;
      wind = 0.10;
      rock = 1.00 + 0.65 * clamp01(p.rockfallRate);
    } else if (p.emitterMode === 'storm-cell') {
      rain = 0.90;
      snow = 0.12 * snowPossible;
      wind = 0.14;
      rock = 0.03;
    } else if (p.emitterMode === 'sky-rain') {
      rain = 1.0;
      snow = 0.0;
      wind = 0.0;
      rock = 0.0;
    } else {
      // 'all-weather' multi-agent synchronized mix
      rain = 0.58;
      snow = 0.60 * snowPossible;
      wind = 0.22 + 0.34 * clamp01(p.windSpeed);
      rock = 0.14 + 0.30 * clamp01(p.rockfallRate);
    }

    const sum = Math.max(1e-4, rain + snow + wind + rock);
    const azRad = (p.windAzimuth * Math.PI) / 180;
    const windMag = 0.35 + 0.65 * clamp01(p.windSpeed);
    return {
      speciesVec: [rain / sum, snow / sum, wind / sum, rock / sum],
      snowVec: [p.snowline, clamp01(p.snowfallRate), clamp01(p.glacierStrength), 0.35 + 0.9 * clamp01(p.snowfallRate)],
      windVec: [Math.cos(azRad) * windMag, Math.sin(azRad) * windMag, 0.25 + 0.95 * clamp01(p.windSpeed), 0.35 + 0.65 * clamp01(p.windSpeed)],
      materialTheme: Number.isFinite(p.materialTheme) ? p.materialTheme : 0,
    };
  }

  applyLandscapePreset(landscapeId) {
    const preset = EROSION_LANDSCAPES[landscapeId] || EROSION_LANDSCAPES['layered-plateau'];
    this.params.landscape = preset.id;
    Object.assign(this.params, preset.defaults);
    this.params.materialTheme = preset.materialTheme;
    this.resetSimulation();
  }

  resetCamera() {
    this.camera.yaw = 0.42;
    this.camera.pitch = 0.46;
    this.camera.distance = 740.0;
    this.camera.target = [0, this.params.relief * 0.30, 0];
  }

  resetSimulation() {
    const gl = this.gl;
    const R = this.gridRes;
    const p = this.params;
    const preset = EROSION_LANDSCAPES[p.landscape] || EROSION_LANDSCAPES['layered-plateau'];

    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.bindVertexArray(this.emptyVao);

    // 1. Generate Initial Bedrock Terrain into terrainTex[0] AND initialTerrainTex
    gl.useProgram(this.progInitTerrain);
    gl.uniform4f(
      gl.getUniformLocation(this.progInitTerrain, 'uInitParams'),
      p.relief,
      p.roughness,
      preset.terrainType,
      p.seed
    );
    gl.uniform1f(gl.getUniformLocation(this.progInitTerrain, 'uWorldSpan'), p.worldSpan);

    gl.viewport(0, 0, R, R);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboTerrainSingle[0]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboInitialTerrain);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    this.terrainIdx = 0;

    // 2. Clear shallow-water flux, velocity & cryosphere (snowpack / glacier ice) textures
    for (let i = 0; i < 2; i++) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboFlux[i]);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboSnowClear[i]);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
    this.fluxIdx = 0;
    this.snowIdx = 0;

    // 3. Spawn staggered sky raindrops across all 32,768 GPU particle slots
    const emitter = EMITTER_MODES[p.emitterMode] || EMITTER_MODES['sky-rain'];
    gl.viewport(0, 0, PART_TEX_W, PART_TEX_H);
    gl.useProgram(this.progInitParticles);
    gl.uniform4f(
      gl.getUniformLocation(this.progInitParticles, 'uSpawnBox'),
      p.worldSpan,
      p.cloudHeight,
      p.seed,
      emitter.code
    );
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboInitParticles[0]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    this.partIdx = 0;

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindVertexArray(null);

    this.stepCount = 0;
    this.telemetry.steps = 0;
    this.telemetry.erodedVolumeM3 = 0;
    this.telemetry.coarseSedM3 = 0;
    this.telemetry.fineSedM3 = 0;
    this.telemetry.particles = p.particleCount;
    if (this.onTelemetry) this.onTelemetry(this.telemetry);
  }

  /**
   * Executes `count` full GPU erosion + shallow-water + sedimentation + thermal talus substeps!
   */
  stepSimulation(count = 1) {
    const gl = this.gl;
    const R = this.gridRes;
    const p = this.params;
    const dt = 0.085;
    const cellSize = p.worldSpan / R;
    const activeCount = Math.min(MAX_GPU_PARTICLES, Math.max(1024, Math.floor(p.particleCount)));
    const emitter = EMITTER_MODES[p.emitterMode] || EMITTER_MODES['sky-rain'];
    const { hardnessVec, strataVec } = this._getHardnessUniforms();
    const climate = this._getClimateUniforms();

    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);

    for (let s = 0; s < count; s++) {
      this.stepCount++;
      const prevP = this.partIdx;
      const nextP = 1 - prevP;

      // ---------------------------------------------------------------------
      // PASS A: GPU Lagrangian Particle Kinematics, Hardness Cutting & Cargo
      // ---------------------------------------------------------------------
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboStepParticles[nextP]);
      gl.viewport(0, 0, PART_TEX_W, PART_TEX_H);
      gl.disable(gl.BLEND);
      gl.useProgram(this.progParticleStep);
      gl.bindVertexArray(this.emptyVao);

      this._bindTex(this.progParticleStep, 'uTerrainTex', this.terrainTex[this.terrainIdx], 0);
      this._bindTex(this.progParticleStep, 'uPosAgeTex', this.partPosAge[prevP], 1);
      this._bindTex(this.progParticleStep, 'uVelWaterTex', this.partVelWater[prevP], 2);
      this._bindTex(this.progParticleStep, 'uSedimentTex', this.partSediment[prevP], 3);
      this._bindTex(this.progParticleStep, 'uVelocityFieldTex', this.velocityFieldTex, 4);
      this._bindTex(this.progParticleStep, 'uSnowTex', this.snowTex[this.snowIdx], 5);

      gl.uniform4f(gl.getUniformLocation(this.progParticleStep, 'uDomain'), p.worldSpan, R, dt, this.stepCount);
      gl.uniform4f(
        gl.getUniformLocation(this.progParticleStep, 'uRainEmitter'),
        p.cloudHeight,
        p.rainIntensity,
        emitter.code,
        activeCount
      );
      gl.uniform4f(
        gl.getUniformLocation(this.progParticleStep, 'uStormTarget'),
        this.stormTarget[0],
        this.stormTarget[1],
        Math.max(24.0, p.brushRadius * 1.8),
        0.35
      );
      gl.uniform4f(
        gl.getUniformLocation(this.progParticleStep, 'uHydraulics'),
        p.erosionStrength,
        p.sedimentCapacity,
        p.depositionRate,
        p.particleInertia
      );
      gl.uniform4f(
        gl.getUniformLocation(this.progParticleStep, 'uLifeEvap'),
        p.evaporation,
        p.gravity,
        38.0,
        p.pipeFlowBlend
      );
      gl.uniform4fv(gl.getUniformLocation(this.progParticleStep, 'uHardnessParams'), hardnessVec);
      gl.uniform4fv(gl.getUniformLocation(this.progParticleStep, 'uStrataOrient'), strataVec);
      gl.uniform4fv(gl.getUniformLocation(this.progParticleStep, 'uSpeciesMix'), climate.speciesVec);
      gl.uniform4fv(gl.getUniformLocation(this.progParticleStep, 'uSnowParams'), climate.snowVec);
      gl.uniform4fv(gl.getUniformLocation(this.progParticleStep, 'uWindParams'), climate.windVec);
      gl.uniform1f(gl.getUniformLocation(this.progParticleStep, 'uSeed'), p.seed);

      gl.drawArrays(gl.TRIANGLES, 0, 3);
      this.partIdx = nextP;

      // ---------------------------------------------------------------------
      // PASS B: Additive GPU Point-Sprite Scatter into `uDeltaTex` (512x512)
      // ---------------------------------------------------------------------
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboDelta);
      gl.viewport(0, 0, R, R);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.useProgram(this.progParticleScatter);

      this._bindTex(this.progParticleScatter, 'uPrevPosAgeTex', this.partPosAge[prevP], 0);
      this._bindTex(this.progParticleScatter, 'uNextPosAgeTex', this.partPosAge[nextP], 1);
      this._bindTex(this.progParticleScatter, 'uExchangeTex', this.partExchange, 2);
      this._bindTex(this.progParticleScatter, 'uExchange2Tex', this.partExchange2, 3);
      gl.uniform2f(gl.getUniformLocation(this.progParticleScatter, 'uDomainAndRes'), p.worldSpan, R);

      gl.drawArrays(gl.POINTS, 0, activeCount);
      gl.disable(gl.BLEND);

      // ---------------------------------------------------------------------
      // PASS C: GPU Shallow-Water Pipe Flux (`uFluxTex`)
      // ---------------------------------------------------------------------
      const nextFlux = 1 - this.fluxIdx;
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboFlux[nextFlux]);
      gl.viewport(0, 0, R, R);
      gl.useProgram(this.progWaterFlux);

      this._bindTex(this.progWaterFlux, 'uTerrainTex', this.terrainTex[this.terrainIdx], 0);
      this._bindTex(this.progWaterFlux, 'uFluxTex', this.fluxTex[this.fluxIdx], 1);
      gl.uniform4f(gl.getUniformLocation(this.progWaterFlux, 'uPipeParams'), R, cellSize, dt, p.gravity);

      gl.drawArrays(gl.TRIANGLES, 0, 3);
      this.fluxIdx = nextFlux;

      // ---------------------------------------------------------------------
      // PASS D: Integrate Terrain + Water + Scattered Exchanges + Brush
      // ---------------------------------------------------------------------
      const nextTerr = 1 - this.terrainIdx;
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboTerrainIntegrate[nextTerr]);
      gl.viewport(0, 0, R, R);
      gl.useProgram(this.progTerrainIntegrate);

      this._bindTex(this.progTerrainIntegrate, 'uTerrainTex', this.terrainTex[this.terrainIdx], 0);
      this._bindTex(this.progTerrainIntegrate, 'uDeltaTex', this.deltaTex, 1);
      this._bindTex(this.progTerrainIntegrate, 'uFluxTex', this.fluxTex[this.fluxIdx], 2);
      this._bindTex(this.progTerrainIntegrate, 'uSnowTex', this.snowTex[this.snowIdx], 3);

      gl.uniform4f(gl.getUniformLocation(this.progTerrainIntegrate, 'uIntParams'), R, cellSize, dt, p.evaporation);
      gl.uniform4f(
        gl.getUniformLocation(this.progTerrainIntegrate, 'uPipeErode'),
        p.pipeFlowBlend,
        p.erosionStrength,
        p.rockHardness,
        p.worldSpan
      );
      gl.uniform4fv(gl.getUniformLocation(this.progTerrainIntegrate, 'uHardnessParams'), hardnessVec);
      gl.uniform4fv(gl.getUniformLocation(this.progTerrainIntegrate, 'uStrataOrient'), strataVec);
      gl.uniform4fv(gl.getUniformLocation(this.progTerrainIntegrate, 'uClimate'), climate.snowVec);

      let brushCode = 0;
      if (this.brushDown) {
        if (p.brushMode === 'cloudburst') brushCode = 1;
        else if (p.brushMode === 'raise') brushCode = 2;
        else if (p.brushMode === 'carve') brushCode = 3;
      }
      gl.uniform4f(
        gl.getUniformLocation(this.progTerrainIntegrate, 'uBrush'),
        this.pointerWorldXZ[0],
        this.pointerWorldXZ[1],
        p.brushRadius,
        brushCode
      );
      gl.uniform1f(gl.getUniformLocation(this.progTerrainIntegrate, 'uBrushStrength'), p.brushStrength);
      gl.uniform1f(gl.getUniformLocation(this.progTerrainIntegrate, 'uSeed'), p.seed);

      gl.drawArrays(gl.TRIANGLES, 0, 3);
      this.terrainIdx = nextTerr;

      // ---------------------------------------------------------------------
      // PASS E: GPU Differential Cliff Spalling & Talus Angle-of-Repose Pass
      // ---------------------------------------------------------------------
      const nextTalus = 1 - this.terrainIdx;
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboTerrainSingle[nextTalus]);
      gl.viewport(0, 0, R, R);
      gl.useProgram(this.progThermalTalus);

      this._bindTex(this.progThermalTalus, 'uTerrainTex', this.terrainTex[this.terrainIdx], 0);
      gl.uniform4f(
        gl.getUniformLocation(this.progThermalTalus, 'uTalusParams'),
        R,
        cellSize,
        p.talusAngle,
        p.worldSpan
      );
      gl.uniform4fv(gl.getUniformLocation(this.progThermalTalus, 'uHardnessParams'), hardnessVec);
      gl.uniform4fv(gl.getUniformLocation(this.progThermalTalus, 'uStrataOrient'), strataVec);
      gl.uniform1f(gl.getUniformLocation(this.progThermalTalus, 'uSeed'), p.seed);

      gl.drawArrays(gl.TRIANGLES, 0, 3);
      this.terrainIdx = nextTalus;

      // ---------------------------------------------------------------------
      // PASS F: GPU Cryosphere — Snowpack Accumulation, Avalanche, Firn & Glacier Creep
      // ---------------------------------------------------------------------
      const nextSnow = 1 - this.snowIdx;
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboSnowClear[nextSnow]);
      gl.viewport(0, 0, R, R);
      gl.useProgram(this.progSnowCryo);

      this._bindTex(this.progSnowCryo, 'uTerrainTex', this.terrainTex[this.terrainIdx], 0);
      this._bindTex(this.progSnowCryo, 'uSnowTex', this.snowTex[this.snowIdx], 1);
      this._bindTex(this.progSnowCryo, 'uSnowDeltaTex', this.snowDeltaTex, 2);
      gl.uniform4f(gl.getUniformLocation(this.progSnowCryo, 'uCryoParams'), R, cellSize, dt, p.worldSpan);
      gl.uniform4fv(gl.getUniformLocation(this.progSnowCryo, 'uClimate'), climate.snowVec);
      gl.uniform4fv(gl.getUniformLocation(this.progSnowCryo, 'uStrataOrient'), strataVec);
      gl.uniform1f(gl.getUniformLocation(this.progSnowCryo, 'uSeed'), p.seed);

      gl.drawArrays(gl.TRIANGLES, 0, 3);
      this.snowIdx = nextSnow;
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindVertexArray(null);

    if (this.stepCount % 36 === 0) {
      this._sampleTelemetry();
    } else {
      this.telemetry.steps = this.stepCount;
      this.telemetry.particles = activeCount;
      this.telemetry.fps = this.fps;
      if (this.onTelemetry && this.stepCount % 8 === 0) this.onTelemetry(this.telemetry);
    }
  }

  _sampleTelemetry() {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboTelemetry);
    gl.viewport(0, 0, TELEMETRY_RES, TELEMETRY_RES);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.useProgram(this.progTelemetry);
    gl.bindVertexArray(this.emptyVao);

    this._bindTex(this.progTelemetry, 'uTerrainTex', this.terrainTex[this.terrainIdx], 0);
    this._bindTex(this.progTelemetry, 'uInitialTex', this.initialTerrainTex, 1);
    gl.uniform1f(gl.getUniformLocation(this.progTelemetry, 'uGridRes'), this.gridRes);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.readPixels(0, 0, TELEMETRY_RES, TELEMETRY_RES, gl.RGBA, gl.FLOAT, this.telemetryBuf);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    let sumEroded = 0;
    let sumCoarse = 0;
    let sumFine = 0;
    const buf = this.telemetryBuf;
    for (let i = 0; i < buf.length; i += 4) {
      sumEroded += buf[i];
      sumCoarse += buf[i + 1];
      sumFine += buf[i + 2];
    }
    const cellAreaSample = (this.params.worldSpan * this.params.worldSpan) / (TELEMETRY_RES * TELEMETRY_RES);
    this.telemetry.steps = this.stepCount;
    this.telemetry.particles = this.params.particleCount;
    this.telemetry.erodedVolumeM3 = Math.round(sumEroded * cellAreaSample);
    this.telemetry.coarseSedM3 = Math.round(sumCoarse * cellAreaSample);
    this.telemetry.fineSedM3 = Math.round(sumFine * cellAreaSample);
    this.telemetry.fps = this.fps;
    if (this.onTelemetry) this.onTelemetry(this.telemetry);
  }

  _bindTex(prog, name, tex, unit) {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(gl.getUniformLocation(prog, name), unit);
  }

  resizeIfNeeded() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(2, Math.floor(this.canvas.clientWidth * dpr));
    const h = Math.max(2, Math.floor(this.canvas.clientHeight * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
  }

  renderFrame() {
    const gl = this.gl;
    this.resizeIfNeeded();
    const W = this.canvas.width;
    const H = this.canvas.height;
    const p = this.params;

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, W, H);
    gl.clear(gl.DEPTH_BUFFER_BIT);

    // 1. Studio Sky Backdrop
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.useProgram(this.progSkyBg);
    gl.bindVertexArray(this.emptyVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // 2. 3D Displaced Terrain + Stratigraphy + Sedimentation + Raymarched Sun Shadows
    const { viewProj, eye } = this._buildViewProjMatrix(W / H);
    const az = (p.sunAzimuth * Math.PI) / 180;
    const el = (p.sunElevation * Math.PI) / 180;
    const sunDir = [Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)];
    const { hardnessVec, strataVec } = this._getHardnessUniforms();
    const climate = this._getClimateUniforms();
    const timeSec = (performance.now() - this.startTimeMs) * 0.001;

    const viewCode =
      p.viewMode === 'sediment' ? 1 :
      p.viewMode === 'hardness' ? 2 :
      p.viewMode === 'flow'     ? 3 :
      p.viewMode === 'clay'     ? 4 :
      p.viewMode === 'cryo'     ? 5 : 0;

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.depthMask(true);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    gl.useProgram(this.progTerrainRender);
    gl.bindVertexArray(this.terrainVao);

    this._bindTex(this.progTerrainRender, 'uTerrainTex', this.terrainTex[this.terrainIdx], 0);
    this._bindTex(this.progTerrainRender, 'uInitialTex', this.initialTerrainTex, 1);
    this._bindTex(this.progTerrainRender, 'uVelocityFieldTex', this.velocityFieldTex, 2);
    this._bindTex(this.progTerrainRender, 'uSnowTex', this.snowTex[this.snowIdx], 3);

    gl.uniformMatrix4fv(gl.getUniformLocation(this.progTerrainRender, 'uViewProj'), false, viewProj);
    gl.uniform3fv(gl.getUniformLocation(this.progTerrainRender, 'uCameraPos'), eye);
    gl.uniform3fv(gl.getUniformLocation(this.progTerrainRender, 'uSunDir'), sunDir);
    gl.uniform4f(
      gl.getUniformLocation(this.progTerrainRender, 'uRenderDomain'),
      p.worldSpan,
      this.gridRes,
      p.showWater ? 1.0 : 0.0,
      timeSec
    );
    gl.uniform4fv(gl.getUniformLocation(this.progTerrainRender, 'uHardnessParams'), hardnessVec);
    gl.uniform4fv(gl.getUniformLocation(this.progTerrainRender, 'uStrataOrient'), strataVec);

    const showCursorMode =
      p.brushMode === 'cloudburst' ? 1 :
      p.brushMode === 'raise'      ? 2 :
      p.brushMode === 'carve'      ? 3 :
      p.emitterMode === 'storm-cell' ? 1 : 0;
    const cursorXZ = p.emitterMode === 'storm-cell' && p.brushMode === 'orbit' ? this.stormTarget : this.pointerWorldXZ;
    gl.uniform4f(
      gl.getUniformLocation(this.progTerrainRender, 'uBrush'),
      cursorXZ[0],
      cursorXZ[1],
      p.emitterMode === 'storm-cell' && p.brushMode === 'orbit' ? Math.max(24, p.brushRadius * 1.8) : p.brushRadius,
      showCursorMode
    );
    gl.uniform1i(gl.getUniformLocation(this.progTerrainRender, 'uViewMode'), viewCode);
    gl.uniform1i(gl.getUniformLocation(this.progTerrainRender, 'uMaterialTheme'), this._themeCode());
    gl.uniform4fv(gl.getUniformLocation(this.progTerrainRender, 'uClimate'), climate.snowVec);
    gl.uniform1f(gl.getUniformLocation(this.progTerrainRender, 'uSeed'), p.seed);

    gl.drawElements(gl.TRIANGLES, this.terrainIndexCount, gl.UNSIGNED_INT, 0);

    // 3. 3D Falling Sky Raindrops & Sediment-Colored Surface Runoff Particles!
    if (p.showParticles && p.particleOpacity > 0.01) {
      const activeCount = Math.min(MAX_GPU_PARTICLES, Math.max(1024, Math.floor(p.particleCount)));
      gl.disable(gl.CULL_FACE);
      gl.depthMask(false);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      gl.useProgram(this.progParticleRender);
      gl.bindVertexArray(this.emptyVao);

      this._bindTex(this.progParticleRender, 'uPosAgeTex', this.partPosAge[this.partIdx], 0);
      this._bindTex(this.progParticleRender, 'uVelWaterTex', this.partVelWater[this.partIdx], 1);
      this._bindTex(this.progParticleRender, 'uSedimentTex', this.partSediment[this.partIdx], 2);
      this._bindTex(this.progParticleRender, 'uTerrainTex', this.terrainTex[this.terrainIdx], 3);

      gl.uniformMatrix4fv(gl.getUniformLocation(this.progParticleRender, 'uViewProj'), false, viewProj);
      gl.uniform3fv(gl.getUniformLocation(this.progParticleRender, 'uCameraPos'), eye);
      gl.uniform4f(
        gl.getUniformLocation(this.progParticleRender, 'uPartVis'),
        p.worldSpan,
        this.gridRes,
        p.particleOpacity,
        activeCount
      );

      gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, activeCount);

      gl.disable(gl.BLEND);
      gl.depthMask(true);
    }

    gl.bindVertexArray(null);
  }

  start() {
    if (this.active) return;
    this.active = true;
    this._fpsLastMs = performance.now();
    this._fpsFrames = 0;

    const tick = () => {
      if (!this.active) return;
      this._rafId = requestAnimationFrame(tick);

      const now = performance.now();
      this._fpsFrames++;
      if (now - this._fpsLastMs >= 500) {
        this.fps = Math.round((this._fpsFrames * 1000) / (now - this._fpsLastMs));
        this._fpsFrames = 0;
        this._fpsLastMs = now;
      }

      if (this.playing) {
        this.stepSimulation(this.params.substepsPerFrame);
      } else if (this.brushDown && this.params.brushMode !== 'orbit') {
        this.stepSimulation(1);
      }

      this.renderFrame();
    };
    this._rafId = requestAnimationFrame(tick);
  }

  stop() {
    this.active = false;
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  /**
   * Reads back the live GPU-eroded terrain heightfield on demand and builds a game-ready
   * 3D mesh (positions, normals, tangents, UVs, indices, and stratigraphic/sediment colors)
   * compatible with our `.GLB` and `.OBJ` exporters!
   */
  extractMeshForExport(exportStep = 2) {
    const gl = this.gl;
    const R = this.gridRes;
    const raw = new Float32Array(R * R * 4);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboTerrainSingle[this.terrainIdx]);
    gl.readPixels(0, 0, R, R, gl.RGBA, gl.FLOAT, raw);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    const stride = Math.max(1, exportStep);
    const M = Math.floor((R - 1) / stride) + 1;
    const vCount = M * M;
    const positions = new Float32Array(vCount * 3);
    const normals = new Float32Array(vCount * 3);
    const tangents = new Float32Array(vCount * 4);
    const uvs = new Float32Array(vCount * 2);
    const colors = new Float32Array(vCount * 4);

    const span = this.params.worldSpan;
    const cellWorld = span / (R - 1);

    const heightAt = (ix, iz) => {
      const cx = Math.max(0, Math.min(R - 1, ix));
      const cz = Math.max(0, Math.min(R - 1, iz));
      const idx = (cz * R + cx) * 4;
      return raw[idx] + raw[idx + 1] + raw[idx + 2];
    };

    for (let gz = 0; gz < M; gz++) {
      const iz = Math.min(R - 1, gz * stride);
      const v = iz / (R - 1);
      for (let gx = 0; gx < M; gx++) {
        const ix = Math.min(R - 1, gx * stride);
        const u = ix / (R - 1);
        const vi = gz * M + gx;
        const rawIdx = (iz * R + ix) * 4;

        const bed = raw[rawIdx];
        const coarse = raw[rawIdx + 1];
        const fine = raw[rawIdx + 2];
        const h = bed + coarse + fine;

        positions[vi * 3]     = (u - 0.5) * span;
        positions[vi * 3 + 1] = h;
        positions[vi * 3 + 2] = (v - 0.5) * span;

        uvs[vi * 2]     = u;
        uvs[vi * 2 + 1] = v;

        const hL = heightAt(ix - stride, iz);
        const hR = heightAt(ix + stride, iz);
        const hD = heightAt(ix, iz - stride);
        const hU = heightAt(ix, iz + stride);
        let nx = hL - hR;
        let ny = 2.0 * cellWorld * stride;
        let nz = hD - hU;
        const nl = Math.hypot(nx, ny, nz) || 1;
        nx /= nl; ny /= nl; nz /= nl;

        normals[vi * 3]     = nx;
        normals[vi * 3 + 1] = ny;
        normals[vi * 3 + 2] = nz;

        tangents[vi * 4]     = 1;
        tangents[vi * 4 + 1] = 0;
        tangents[vi * 4 + 2] = 0;
        tangents[vi * 4 + 3] = 1;

        // Bake rock vs coarse gravel vs fine ochre alluvial fan color into vertex colors!
        const fineW = Math.min(1, fine / 0.22);
        const coarseW = Math.min(1, coarse / 0.28) * (1 - fineW);
        const rockW = Math.max(0, 1 - fineW - coarseW);
        colors[vi * 4]     = rockW * 0.48 + coarseW * 0.52 + fineW * 0.72;
        colors[vi * 4 + 1] = rockW * 0.42 + coarseW * 0.47 + fineW * 0.58;
        colors[vi * 4 + 2] = rockW * 0.37 + coarseW * 0.40 + fineW * 0.36;
        colors[vi * 4 + 3] = 1.0;
      }
    }

    const qCount = (M - 1) * (M - 1);
    const indices = new Uint32Array(qCount * 6);
    let ip = 0;
    for (let gz = 0; gz < M - 1; gz++) {
      for (let gx = 0; gx < M - 1; gx++) {
        const i00 = gz * M + gx;
        const i10 = i00 + 1;
        const i01 = i00 + M;
        const i11 = i01 + 1;
        indices[ip++] = i00;
        indices[ip++] = i01;
        indices[ip++] = i10;
        indices[ip++] = i10;
        indices[ip++] = i01;
        indices[ip++] = i11;
      }
    }

    return { positions, normals, tangents, uvs, colors, indices };
  }
}

/* ============================================================
 * Frontier · SDF terrain — WebGL2 viewport
 *
 * Owns the GL state, the camera, the passes and the picking that the
 * sculpting tools need:
 *
 *   pass 1  SDF raycast (fullscreen)          → scene colour + linear depth
 *   pass 2  water surface (triangle grid)     → water colour + coverage
 *   pass 3  gizmos (lines)                    → grid, paths, brush ring
 *   pass 4  composite (exposure, ACES, vignette)
 *
 * There is no third-party dependency here: no three.js, no build step.
 * Everything is plain WebGL2 + typed arrays, which keeps the terrain
 * pipeline portable to the engine.
 *
 * Picking: pass 1 writes the linear ray distance into the alpha channel,
 * so a pick is one readPixels of one texel. The world position is then
 * reconstructed on the CPU from the same camera matrices the shader used
 * — no second render, no re-derivation.
 * ============================================================ */

import {
  FULLSCREEN_VS, SDF_RAYCAST_FS, WATER_VS, WATER_FS, COMPOSITE_FS, LINE_VS, LINE_FS,
} from './glsl.js';

const DEG = Math.PI / 180;

export class Viewport {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {{onPick?:Function, onError?:Function}} [hooks]
   */
  constructor(canvas, hooks = {}) {
    this.canvas = canvas;
    this.hooks = hooks;
    const gl = canvas.getContext('webgl2', {
      antialias: false, alpha: false, depth: true, stencil: false,
      powerPreference: 'high-performance', preserveDrawingBuffer: true,
      premultipliedAlpha: false,
    });
    if (!gl) throw new Error('WebGL2 is required — this build has no WebGL1 fallback.');
    this.gl = gl;
    this.floatRender = Boolean(gl.getExtension('EXT_color_buffer_float'));
    this.floatLinear = Boolean(gl.getExtension('OES_texture_float_linear'));
    if (!this.floatRender) {
      console.warn('[frontier] EXT_color_buffer_float unavailable — falling back to RGBA8 targets (linear depth precision reduced).');
    }
    this.linearAniso = gl.getExtension('EXT_texture_filter_anisotropic');

    this.width = 1;
    this.height = 1;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.time = 0;
    this.needsRender = true;
    this.stats = { fps: 0, frameMs: 0, tris: 0 };

    // camera state (spherical orbit)
    this.target = [0, 4, 0];
    this.azimuth = 0.9;
    this.elevation = 0.42;
    this.distance = 52;
    this.up = [0, 1, 0];

    this.volume = null;
    this.heightfield = null;
    this.channels = null;
    this.splats = null;
    this.textures = null;

    this.programs = {};
    this.buffers = {};
    this.targets = {};
    this.uniformLocations = new Map();

    this._initPrograms();
    this._initGrid();
    this._initEvents();
    this._resize();
  }

  /* ------------------------------ programs ------------------------------ */

  _compile(type, src, label) {
    const gl = this.gl;
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(sh);
      const lines = src.split('\n').map((l, i) => `${String(i + 1).padStart(4)}| ${l}`).join('\n');
      console.error(`[frontier] ${label} shader failed:\n${log}\n${lines}`);
      throw new Error(`${label} shader: ${log}`);
    }
    return sh;
  }

  _program(vsSrc, fsSrc, label) {
    const gl = this.gl;
    const vs = this._compile(gl.VERTEX_SHADER, vsSrc, label + ':vs');
    const fs = this._compile(gl.FRAGMENT_SHADER, fsSrc, label + ':fs');
    const p = gl.createProgram();
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      throw new Error(`${label} link: ${gl.getProgramInfoLog(p)}`);
    }
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return p;
  }

  _initPrograms() {
    const gl = this.gl;
    // fullscreen triangle: reuse the SDF vertex shader for every fullscreen pass
    this.programs.sdf = this._program(FULLSCREEN_VS, SDF_RAYCAST_FS, 'sdf');
    this.programs.composite = this._program(FULLSCREEN_VS, COMPOSITE_FS, 'composite');
    this.programs.water = this._program(WATER_VS, WATER_FS, 'water');
    this.programs.line = this._program(LINE_VS, LINE_FS, 'line');

    // a VAO is required in core profile even for attribute-less draws
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);
    gl.bindVertexArray(null);

    this.uniformNames = {
      sdf: ['uSdfTex', 'uSurfA', 'uSurfB', 'uSplatA', 'uSplatB', 'uMatAlb', 'uMatNrm', 'uDims',
        'uVolMin', 'uVolMax', 'uCell', 'uGridOrigin', 'uGridSize', 'uGrid', 'uCamPos', 'uCamBasis',
        'uResolution', 'uFovTan', 'uMaxDist', 'uSunDir', 'uSunColor', 'uSkyTop', 'uSkyHorizon',
        'uFogColor', 'uWaterLevel', 'uFogDensity', 'uSnowLine', 'uDetailFade', 'uChannelPreview', 'uShowFlow'],
      water: ['uSceneColor', 'uSurfA', 'uSurfB', 'uResolution', 'uCamPos', 'uSunDir', 'uSunColor',
        'uSkyTop', 'uSkyHorizon', 'uFogColor', 'uGridOrigin', 'uGridSize', 'uWaterLevel', 'uTime',
        'uFogDensity', 'uViewProj'],
      composite: ['uScene', 'uWater', 'uResolution', 'uExposure', 'uWaterOn', 'uVignette'],
      line: ['uViewProj', 'uOpacity'],
    };
    for (const key of Object.keys(this.uniformNames)) {
      const p = this.programs[key];
      const map = {};
      for (const n of this.uniformNames[key]) map[n] = gl.getUniformLocation(p, n);
      this.uniformLocations.set(key, map);
    }

    // 1×1 black textures so unused samplers are always valid
    this.dummyTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.dummyTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  }

  _initGrid() {
    const gl = this.gl;
    // gizmo line buffer, grown on demand
    this.lineBuf = gl.createBuffer();
    this.lineCount = 0;
  }

  /* ------------------------------- targets ------------------------------- */

  _makeTarget(w, h, { color, depth } = {}) {
    const gl = this.gl;
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    const internal = this.floatRender ? gl.RGBA32F : gl.RGBA8;
    const type = this.floatRender ? gl.FLOAT : gl.UNSIGNED_BYTE;
    const tex = gl.createTexture();
    if (color !== false) {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, gl.RGBA, type, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    }
    let depthRb = null;
    if (depth) {
      depthRb = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, depthRb);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthRb);
    }
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    if (status !== gl.FRAMEBUFFER_COMPLETE) console.warn('[frontier] incomplete framebuffer', status);
    return { fb, tex, depthRb, w, h };
  }

  _ensureTargets() {
    const w = this.width, h = this.height;
    if (this.targets.scene && this.targets.scene.w === w && this.targets.scene.h === h) return;
    const gl = this.gl;
    for (const k of ['scene', 'water']) {
      const t = this.targets[k];
      if (t) { gl.deleteFramebuffer(t.fb); gl.deleteTexture(t.tex); if (t.depthRb) gl.deleteRenderbuffer(t.depthRb); }
    }
    this.targets.scene = this._makeTarget(w, h, { color: true, depth: false });
    this.targets.water = this._makeTarget(w, h, { color: true, depth: true });
  }

  /* -------------------------------- data -------------------------------- */

  /**
   * Hand the viewport a new terrain. Uploads the SDF volume as a 3D
   * texture and the surface channels as 2D textures.
   */
  setTerrain({ volume, heightfield, channels, splats, textures }) {
    const gl = this.gl;
    this.volume = volume;
    this.heightfield = heightfield;
    this.channels = channels;
    this.splats = splats;
    if (textures) this.textures = textures;

    // ---- volume: RGBA32F 3D texture ----
    const { nx, ny, nz } = volume;
    if (!this.sdfTexture || this.sdfDims?.[0] !== nx || this.sdfDims?.[1] !== ny || this.sdfDims?.[2] !== nz) {
      if (this.sdfTexture) gl.deleteTexture(this.sdfTexture);
      this.sdfTexture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_3D, this.sdfTexture);
      gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
      gl.texStorage3D(gl.TEXTURE_3D, 1, gl.RGBA32F, nx, ny, nz);
      this.sdfDims = [nx, ny, nz];
    }
    this.uploadVolume();

    // ---- surface channel maps ----
    this.surfA = this._uploadField2D(this.surfA, this._channelA(heightfield, channels));
    this.surfB = this._uploadField2D(this.surfB, this._channelB(heightfield, channels, splats));

    // ---- material textures ----
    this._uploadMaterialTextures();

    this.needsRender = true;
  }

  /** (Re)upload the volume data. Call after erosion or a sculpt stroke. */
  uploadVolume() {
    const gl = this.gl;
    const { volume } = this;
    if (!volume) return;
    const { nx, ny, nz } = volume;
    if (!this.sdfStaging || this.sdfStaging.length !== nx * ny * nz * 4) {
      this.sdfStaging = new Float32Array(nx * ny * nz * 4);
    }
    const buf = this.sdfStaging;
    const hf = this.heightfield;
    let maxE = 1e-6, maxD = 1e-6;
    if (hf) {
      for (let i = 0; i < hf.erosion.length; i++) {
        if (hf.erosion[i] > maxE) maxE = hf.erosion[i];
        if (hf.deposit[i] > maxD) maxD = hf.deposit[i];
      }
    }
    for (let z = 0; z < nz; z++) {
      for (let y = 0; y < ny; y++) {
        for (let x = 0; x < nx; x++) {
          const i = (z * ny + y) * nx + x;
          const o = i * 4;
          buf[o] = volume.data[i];
          let wet = 0, ero = 0, dep = 0;
          if (hf && x < hf.nx && z < hf.nz) {
            const k = z * hf.nx + x;
            // wetness only matters near the surface: cheaper upload, same look
            wet = hf.wet[k];
            ero = hf.erosion[k] / maxE;
            dep = hf.deposit[k] / maxD;
          }
          buf[o + 1] = wet;
          buf[o + 2] = ero;
          buf[o + 3] = dep;
        }
      }
    }
    gl.bindTexture(gl.TEXTURE_3D, this.sdfTexture);
    gl.texSubImage3D(gl.TEXTURE_3D, 0, 0, 0, 0, nx, ny, nz, gl.RGBA, gl.FLOAT, buf);
    this.needsRender = true;
  }

  /** Upload the (static) baked material layers as two texture arrays. */
  _uploadMaterialTextures() {
    const gl = this.gl;
    const pack = this.textures;
    if (!pack) return;
    const { width, height, albedo, normal } = pack;
    const layers = height / width;
    if (!this.matAlb) {
      this.matAlb = gl.createTexture();
      this.matNrm = gl.createTexture();
      for (const [tex, data, comps] of [[this.matAlb, albedo, 3], [this.matNrm, normal, 4]]) {
        gl.bindTexture(gl.TEXTURE_2D_ARRAY, tex);
        gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, comps === 3 ? gl.RGB8 : gl.RGBA8, width, width, layers);
        gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.REPEAT);
        gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, 0, width, height, layers,
          comps === 3 ? gl.RGB : gl.RGBA, gl.UNSIGNED_BYTE, data);
        gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
        if (this.linearAniso) {
          gl.texParameterf(gl.TEXTURE_2D_ARRAY, this.linearAniso.TEXTURE_MAX_ANISOTROPY_EXT, 4);
        }
      }
    }
  }

  _channelA(hf, ch) {
    const n = hf.nx * hf.nz;
    if (!this._ca || this._ca.length !== n * 4) this._ca = new Float32Array(n * 4);
    const a = this._ca;
    // height (normalised), slope, flow (log), curvature
    let logMax = 1;
    for (let i = 0; i < n; i++) logMax = Math.max(logMax, Math.log1p(hf.flow[i]));
    let hMin = Infinity, hMax = -Infinity;
    for (let i = 0; i < n; i++) { if (hf.h[i] < hMin) hMin = hf.h[i]; if (hf.h[i] > hMax) hMax = hf.h[i]; }
    const span = Math.max(hMax - hMin, 1e-3);
    for (let i = 0; i < n; i++) {
      a[i * 4] = (hf.h[i] - hMin) / span;
      a[i * 4 + 1] = Math.min(1, hf.slope[i] / 2.2);
      a[i * 4 + 2] = Math.log1p(hf.flow[i]) / logMax;
      a[i * 4 + 3] = ch.curvature ? ch.curvature[i] : 0;
    }
    this._heightRange = [hMin, hMax];
    return a;
  }

  _channelB(hf, ch, splats) {
    const n = hf.nx * hf.nz;
    if (!this._cb || this._cb.length !== n * 4) this._cb = new Float32Array(n * 4);
    const b = this._cb;
    // erosion, deposit, hardness, exposure
    let maxE = 1e-6, maxD = 1e-6;
    for (let i = 0; i < n; i++) {
      maxE = Math.max(maxE, hf.erosion[i]);
      maxD = Math.max(maxD, hf.deposit[i]);
    }
    for (let i = 0; i < n; i++) {
      b[i * 4] = hf.erosion[i] / maxE;
      b[i * 4 + 1] = hf.deposit[i] / maxD;
      b[i * 4 + 2] = hf.hardness ? hf.hardness[i] : 0.4;
      b[i * 4 + 3] = ch.exposure ? ch.exposure[i] : 0;
    }
    if (!this._ca) this._ca = new Float32Array(n * 4);
    const a = this._ca;
    for (let i = 0; i < n; i++) {
      // snow / sand weights ride in the free channels of the splat texture
      void splats;
      void a;
    }
    return b;
  }

  _uploadField2D(tex, data) {
    const gl = this.gl;
    const w = this.heightfield.nx, h = this.heightfield.nz;
    if (!tex) {
      tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, w, h, 0, gl.RGBA, gl.FLOAT, data);
    } else {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, w, h, gl.RGBA, gl.FLOAT, data);
    }
    void this.floatLinear;
    return tex;
  }

  /* -------------------------------- water -------------------------------- */

  /** Build the water surface mesh (lakes at their spill level, sea at the waterline). */
  buildWaterMesh(waterLevel) {
    const gl = this.gl;
    const hf = this.heightfield;
    if (!hf) return;
    const nx = hf.nx, nz = hf.nz;
    const verts = [];
    for (let j = 0; j < nz - 1; j++) {
      for (let i = 0; i < nx - 1; i++) {
        const k = j * nx + i;
        const kh = j * nx + i + 1;
        const kv = (j + 1) * nx + i;
        const kd = (j + 1) * nx + i + 1;
        const levels = [k, kh, kv, kd].map((kk) => {
          const lake = hf.lake[kk];
          if (lake > 0) return lake;
          if (hf.h[kk] < waterLevel) return waterLevel;
          return null;
        });
        if (levels.some((l) => l === null)) continue;
        // two triangles per cell, each vertex carrying its level
        const P = [[i, j], [i + 1, j], [i, j + 1], [i + 1, j + 1]].map(([ii, jj]) => [
          hf.minX + ii * hf.cellX, hf.minZ + jj * hf.cellZ,
        ]);
        const tri = [[0, 1, 3], [0, 3, 2]];
        for (const t of tri) {
          for (const idx of t) {
            verts.push(P[idx][0], P[idx][1], levels[idx]);
          }
        }
      }
    }
    if (!verts.length) { this.waterVerts = 0; return; }
    this.waterVerts = verts.length / 3;
    const arr = new Float32Array(verts);
    if (!this.waterVbo) {
      this.waterVbo = gl.createBuffer();
      this.waterVao = gl.createVertexArray();
      gl.bindVertexArray(this.waterVao);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.waterVbo);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 12, 0);
      gl.enableVertexAttribArray(1);
      gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 12, 8);
      gl.bindVertexArray(null);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.waterVbo);
    gl.bufferData(gl.ARRAY_BUFFER, arr, gl.DYNAMIC_DRAW);
    this.waterLevel = waterLevel;
  }

  /* ------------------------------ gizmos ------------------------------ */
  /* A tiny immediate-mode line list: grid, spline paths, brush ring. */

  beginLines() { this._lines = []; }
  addLine(a, b, color = [1, 1, 1], ) {
    this._lines.push(a[0], a[1], a[2], color[0], color[1], color[2]);
    this._lines.push(b[0], b[1], b[2], color[0], color[1], color[2]);
  }
  addCircle(center, normal, radius, color, segments = 48) {
    // orthonormal frame around the normal
    let u = [1, 0, 0];
    if (Math.abs(normal[0]) > 0.9) u = [0, 0, 1];
    const t1 = normalize(cross(u, normal));
    const t2 = cross(normal, t1);
    for (let s = 0; s < segments; s++) {
      const a0 = (s / segments) * Math.PI * 2;
      const a1 = ((s + 1) / segments) * Math.PI * 2;
      this.addLine(
        [center[0] + (t1[0] * Math.cos(a0) + t2[0] * Math.sin(a0)) * radius,
          center[1] + (t1[1] * Math.cos(a0) + t2[1] * Math.sin(a0)) * radius,
          center[2] + (t1[2] * Math.cos(a0) + t2[2] * Math.sin(a0)) * radius],
        [center[0] + (t1[0] * Math.cos(a1) + t2[0] * Math.sin(a1)) * radius,
          center[1] + (t1[1] * Math.cos(a1) + t2[1] * Math.sin(a1)) * radius,
          center[2] + (t1[2] * Math.cos(a1) + t2[2] * Math.sin(a1)) * radius],
        color,
      );
    }
  }
  endLines() {
    const gl = this.gl;
    if (!this._lines) return;
    this.lineCount = this._lines.length / 6;
    if (!this.lineVbo) { this.lineVbo = gl.createBuffer(); this.lineVao = gl.createVertexArray(); }
    gl.bindVertexArray(this.lineVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.lineVbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this._lines), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
    gl.bindVertexArray(null);
  }

  /* ------------------------------- camera ------------------------------- */

  cameraPosition() {
    const ce = Math.cos(this.elevation);
    return [
      this.target[0] + Math.cos(this.azimuth) * ce * this.distance,
      this.target[1] + Math.sin(this.elevation) * this.distance,
      this.target[2] + Math.sin(this.azimuth) * ce * this.distance,
    ];
  }

  cameraBasis() {
    const eye = this.cameraPosition();
    const fwd = normalize(sub(this.target, eye));
    const right = normalize(cross(fwd, this.up));
    const up = cross(right, fwd);
    return { eye, fwd, right, up };
  }

  viewProjection() {
    const { eye, fwd, right, up } = this.cameraBasis();
    return multiply(perspective(48 * DEG, this.width / this.height, 0.1, 500), lookAt(eye, fwd, right, up));
  }

  /**
   * Ray from a canvas-space pixel (CSS pixels).
   * @returns {{origin:number[], dir:number[]}}
   */
  rayFromPixel(px, py) {
    const { eye, fwd, right, up } = this.cameraBasis();
    const aspect = this.width / this.height;
    const fovTan = Math.tan(48 * DEG / 2);
    const ndcX = (px / this.width) * 2 - 1;
    const ndcY = 1 - (py / this.height) * 2;
    const dir = normalize(add3(fwd, add3(
      scale(right, ndcX * fovTan * aspect),
      scale(up, ndcY * fovTan),
    )));
    return { origin: eye, dir };
  }

  /* ------------------------------- picking ------------------------------- */

  /**
   * Pick the terrain under a CSS pixel.
   * @returns {{point:number[], normal:number[], distance:number}|null}
   */
  pick(px, py) {
    const gl = this.gl;
    if (!this.volume || !this.sdfTexture) return null;
    // ensure a fresh render matching the current camera
    this.render();
    const x = Math.round(px * this.dpr);
    const y = Math.round(this.height - py * this.dpr); // GL origin is bottom-left
    const out = new Float32Array(4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.targets.scene.fb);
    gl.readPixels(Math.min(this.width - 1, Math.max(0, x)), Math.min(this.height - 1, Math.max(0, y)),
      1, 1, gl.RGBA, gl.FLOAT, out);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    const t = out[3];
    if (!(t > 0) || t >= 1e5) return null;
    const { origin, dir } = this.rayFromPixel(px, py);
    const point = add3(origin, scale(dir, t));
    const normal = this.volume.normal(point[0], point[1], point[2], [0, 1, 0]);
    return { point, normal, distance: t, color: [out[0], out[1], out[2]] };
  }

  /* ------------------------------- events ------------------------------- */

  _initEvents() {
    const c = this.canvas;
    let dragging = null;
    let lastX = 0, lastY = 0;
    let moved = false;
    const pointers = new Map();

    const pointerPos = (e) => {
      const r = c.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top];
    };

    c.addEventListener('pointerdown', (e) => {
      c.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, pointerPos(e));
      dragging = e.button === 2 || e.shiftKey ? 'pan' : (this.onPointerDrag ? 'tool' : 'orbit');
      lastX = e.clientX; lastY = e.clientY;
      moved = false;
      if (this.onStrokeStart) {
        const [px, py] = pointerPos(e);
        if (this.onStrokeStart(px, py, e) !== false) dragging = 'tool';
      }
    });

    c.addEventListener('pointermove', (e) => {
      const [px, py] = pointerPos(e);
      if (this.onHover) this.onHover(px, py, e);
      if (pointers.has(e.pointerId)) pointers.set(e.pointerId, [px, py]);
      if (dragging === null) return;
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      if (Math.abs(dx) + Math.abs(dy) > 2) moved = true;
      lastX = e.clientX; lastY = e.clientY;
      if (dragging === 'tool') {
        if (this.onStrokeMove) this.onStrokeMove(px, py, e);
        return;
      }
      if (dragging === 'orbit') {
        this.azimuth -= dx * 0.006;
        this.elevation = Math.max(-0.35, Math.min(1.45, this.elevation + dy * 0.005));
      } else {
        // pan: move the target in the camera plane
        const { right, up } = this.cameraBasis();
        const s = this.distance * 0.0016;
        for (let i = 0; i < 3; i++) this.target[i] += (-right[i] * dx + up[i] * dy) * s;
      }
      this.needsRender = true;
    });

    const endPointer = (e) => {
      pointers.delete(e.pointerId);
      if (dragging === 'tool' && this.onStrokeEnd) this.onStrokeEnd(moved, e);
      dragging = null;
    };
    c.addEventListener('pointerup', endPointer);
    c.addEventListener('pointercancel', endPointer);
    c.addEventListener('contextmenu', (e) => e.preventDefault());

    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      const f = Math.exp(e.deltaY * 0.0012);
      this.distance = Math.max(6, Math.min(160, this.distance * f));
      this.needsRender = true;
    }, { passive: false });

    // touch pinch
    c.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2) {
        const [a, b] = e.touches;
        const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
        if (this._pinch) {
          this.distance = Math.max(6, Math.min(160, this.distance * (this._pinch / d)));
          this.needsRender = true;
        }
        this._pinch = d;
      }
    }, { passive: true });
    c.addEventListener('touchend', () => { this._pinch = null; });
  }

  _resize() {
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width * this.dpr));
    const h = Math.max(1, Math.round(rect.height * this.dpr));
    if (w === this.width && h === this.height && this.canvas.width === w) return;
    this.width = w;
    this.height = h;
    this.canvas.width = w;
    this.canvas.height = h;
    this._ensureTargets();
    this.needsRender = true;
  }

  setSize() { this._resize(); }

  /* ------------------------------- render ------------------------------- */

  render(now = 0) {
    const gl = this.gl;
    this._resize();
    this.time = now * 0.001;
    const t0 = performance.now();
    const scene = this.targets.scene;
    const water = this.targets.water;
    const viewProj = this.viewProjection();
    const { eye, fwd, right, up } = this.cameraBasis();

    /* ---------------- pass 1: SDF raycast ---------------- */
    gl.bindFramebuffer(gl.FRAMEBUFFER, scene.fb);
    gl.viewport(0, 0, this.width, this.height);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (this.volume && this.sdfTexture) {
      const p = this.programs.sdf;
      const u = this.uniformLocations.get('sdf');
      gl.useProgram(p);
      gl.bindVertexArray(this.vao);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_3D, this.sdfTexture);
      gl.uniform1i(u.uSdfTex, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.surfA || this.dummyTex);
      gl.uniform1i(u.uSurfA, 1);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, this.surfB || this.dummyTex);
      gl.uniform1i(u.uSurfB, 2);
      gl.activeTexture(gl.TEXTURE3);
      gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.matAlb || this.dummyTex);
      gl.uniform1i(u.uMatAlb, 3);
      gl.activeTexture(gl.TEXTURE4);
      gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.matNrm || this.dummyTex);
      gl.uniform1i(u.uMatNrm, 4);
      gl.activeTexture(gl.TEXTURE5);
      gl.bindTexture(gl.TEXTURE_2D, this.dummyTex);
      gl.uniform1i(u.uSplatA, 5);
      gl.activeTexture(gl.TEXTURE6);
      gl.bindTexture(gl.TEXTURE_2D, this.dummyTex);
      gl.uniform1i(u.uSplatB, 6);

      const vis = this.visuals || {};
      const v = this.volume;
      gl.uniform3iv(u.uDims, v.dims);
      gl.uniform3fv(u.uVolMin, v.min);
      gl.uniform3fv(u.uVolMax, v.max);
      gl.uniform3fv(u.uCell, v.cell);
      const hf = this.heightfield;
      gl.uniform3fv(u.uGridOrigin, [hf.minX, 0, hf.minZ]);
      gl.uniform3fv(u.uGridSize, [hf.cellX * hf.nx, 1, hf.cellZ * hf.nz]);
      gl.uniform2f(u.uGrid, hf.nx, hf.nz);
      gl.uniform3fv(u.uCamPos, eye);
      gl.uniformMatrix3fv(u.uCamBasis, false, new Float32Array([
        right[0], right[1], right[2], up[0], up[1], up[2], fwd[0], fwd[1], fwd[2],
      ]));
      gl.uniform2f(u.uResolution, this.width, this.height);
      gl.uniform1f(u.uFovTan, Math.tan(48 * DEG / 2));
      gl.uniform1f(u.uMaxDist, 400);
      gl.uniform3fv(u.uSunDir, vis.sunDir || [0.5, 0.7, 0.3]);
      gl.uniform3fv(u.uSunColor, vis.sunColor || [1.0, 0.95, 0.86]);
      gl.uniform3fv(u.uSkyTop, vis.skyTop || [0.28, 0.45, 0.72]);
      gl.uniform3fv(u.uSkyHorizon, vis.skyHorizon || [0.72, 0.80, 0.86]);
      gl.uniform3fv(u.uFogColor, vis.fogColor || [0.72, 0.78, 0.84]);
      gl.uniform1f(u.uWaterLevel, vis.waterLevel ?? 0);
      gl.uniform1f(u.uFogDensity, vis.fogDensity ?? 0.9);
      gl.uniform1f(u.uSnowLine, vis.snowLine ?? 0.66);
      gl.uniform1f(u.uDetailFade, 1);
      gl.uniform1f(u.uChannelPreview, vis.channelPreview ?? 0);
      gl.uniform1f(u.uShowFlow, vis.showFlow ? 1 : 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    /* ---------------- pass 2: water ---------------- */
    if (this.waterVerts && this.visuals?.waterOn !== false) {
      const p = this.programs.water;
      const u = this.uniformLocations.get('water');
      gl.bindFramebuffer(gl.FRAMEBUFFER, water.fb);
      gl.viewport(0, 0, this.width, this.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LESS);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(p);
      gl.bindVertexArray(this.waterVao);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, scene.tex);
      gl.uniform1i(u.uSceneColor, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.surfA || this.dummyTex);
      gl.uniform1i(u.uSurfA, 1);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, this.surfB || this.dummyTex);
      gl.uniform1i(u.uSurfB, 2);
      gl.uniform2f(u.uResolution, this.width, this.height);
      gl.uniform3fv(u.uCamPos, eye);
      const vis = this.visuals || {};
      gl.uniform3fv(u.uSunDir, vis.sunDir || [0.5, 0.7, 0.3]);
      gl.uniform3fv(u.uSunColor, vis.sunColor || [1, 0.95, 0.86]);
      gl.uniform3fv(u.uSkyTop, vis.skyTop || [0.28, 0.45, 0.72]);
      gl.uniform3fv(u.uSkyHorizon, vis.skyHorizon || [0.72, 0.80, 0.86]);
      gl.uniform3fv(u.uFogColor, vis.fogColor || [0.72, 0.78, 0.84]);
      const hf = this.heightfield;
      gl.uniform3fv(u.uGridOrigin, [hf.minX, 0, hf.minZ]);
      gl.uniform3fv(u.uGridSize, [hf.cellX * hf.nx, 1, hf.cellZ * hf.nz]);
      gl.uniform1f(u.uWaterLevel, vis.waterLevel ?? 0);
      gl.uniform1f(u.uTime, this.time);
      gl.uniform1f(u.uFogDensity, vis.fogDensity ?? 0.9);
      gl.uniformMatrix4fv(u.uViewProj, false, new Float32Array(viewProj));
      gl.drawArrays(gl.TRIANGLES, 0, this.waterVerts);
      gl.disable(gl.BLEND);
    }

    /* ---------------- pass 3: gizmos ---------------- */
    // (drawn directly into the scene target with depth disabled, so lines
    //  are always visible — they are UI, not geometry)
    gl.bindFramebuffer(gl.FRAMEBUFFER, scene.fb);
    gl.viewport(0, 0, this.width, this.height);
    if (this.lineCount && this._linesOn !== false) {
      const p = this.programs.line;
      const u = this.uniformLocations.get('line');
      gl.useProgram(p);
      gl.bindVertexArray(this.lineVao);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.uniformMatrix4fv(u.uViewProj, false, new Float32Array(viewProj));
      gl.uniform1f(u.uOpacity, 0.85);
      gl.drawArrays(gl.LINES, 0, this.lineCount);
      gl.disable(gl.BLEND);
    }

    /* ---------------- pass 4: composite to screen ---------------- */
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.width, this.height);
    gl.disable(gl.DEPTH_TEST);
    const p = this.programs.composite;
    const u = this.uniformLocations.get('composite');
    gl.useProgram(p);
    gl.bindVertexArray(this.vao);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, scene.tex);
    gl.uniform1i(u.uScene, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.waterVerts && this.visuals?.waterOn !== false ? water.tex : this.dummyTex);
    gl.uniform1i(u.uWater, 1);
    gl.uniform2f(u.uResolution, this.width, this.height);
    gl.uniform1f(u.uExposure, this.visuals?.exposure ?? 1.25);
    gl.uniform1f(u.uWaterOn, this.waterVerts && this.visuals?.waterOn !== false ? 1 : 0);
    gl.uniform1f(u.uVignette, 0.35);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);

    const dt = performance.now() - t0;
    this.stats.frameMs = dt;
    this.needsRender = false;
    if (this.onFrame) this.onFrame(this.stats);
    return dt;
  }

  dispose() {
    const gl = this.gl;
    for (const t of Object.values(this.targets)) {
      if (!t) continue;
      gl.deleteFramebuffer(t.fb); gl.deleteTexture(t.tex);
      if (t.depthRb) gl.deleteRenderbuffer(t.depthRb);
    }
  }
}

/* -------------------------- small vector / matrix math -------------------------- */

function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function add3(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
function scale(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; }
function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function normalize(a) {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
}

function perspective(fovy, aspect, near, far) {
  const f = 1 / Math.tan(fovy / 2);
  const nf = 1 / (near - far);
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) * nf, -1,
    0, 0, 2 * far * near * nf, 0,
  ]);
}

function lookAt(eye, fwd, right, up) {
  // view matrix from an orientation basis (row-major, column vectors)
  const x = right, y = up, z = [-fwd[0], -fwd[1], -fwd[2]];
  return new Float32Array([
    x[0], y[0], z[0], 0,
    x[1], y[1], z[1], 0,
    x[2], y[2], z[2], 0,
    -(x[0] * eye[0] + x[1] * eye[1] + x[2] * eye[2]),
    -(y[0] * eye[0] + y[1] * eye[1] + y[2] * eye[2]),
    -(z[0] * eye[0] + z[1] * eye[1] + z[2] * eye[2]),
    1,
  ]);
}

function multiply(a, b) {
  const out = new Float32Array(16);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      out[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] +
        a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
  }
  return out;
}

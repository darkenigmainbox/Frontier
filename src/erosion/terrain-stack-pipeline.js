/**
 * Non-Destructive Bottom-to-Top GPU Terrain Stack Evaluator & Renderer.
 *
 * Evaluates an ordered stack of Landform, SDF Geometry, Sculpt, Spline, Simulation,
 * Rock-Placement, and Vegetation-Placement layers from bottom (last index) to top (index 0).
 */

import { FULLSCREEN_VERT } from './erosion-shaders.js';
import { MAX_GRASS_TUFTS } from './grass-system.js';
import {
  PIPELINE_TERRAIN_FRAG,
  PIPELINE_TERRAIN_VERT,
  SCULPT_STAMP_FRAG,
  SDF_CAVE_FRAG,
  SDF_CAVE_VERT,
  STACK_AEOLIAN_GLACIAL_FRAG,
  STACK_COPY_VEC_FRAG,
  STACK_HYDRAULIC_FRAG,
  STACK_LANDFORM_FRAG,
  STACK_RIVER_INCISION_FRAG,
  STACK_SURFACE_BAKE_FRAG,
  STACK_SYNC_EXPORT_FRAG,
  STACK_THERMAL_TALUS_FRAG,
} from './pipeline-shaders.js';
import { SdfCaveSystem } from './sdf-cave-mesher.js';
import {
  DERIVED_PALETTES,
  TERRAIN_STACK_PRESETS,
  createStackLayer,
} from './terrain-stack-presets.js';

function compile(gl, type, src, label) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error(`[Pipeline ${label}] ${info}`);
  }
  return sh;
}

function link(gl, vsSrc, fsSrc, label) {
  const vs = compile(gl, gl.VERTEX_SHADER, vsSrc, `${label}:VS`);
  const fs = compile(gl, gl.FRAGMENT_SHADER, fsSrc, `${label}:FS`);
  const p = gl.createProgram();
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.linkProgram(p);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(p);
    gl.deleteProgram(p);
    throw new Error(`[Pipeline ${label}] Link error: ${info}`);
  }
  return p;
}

function makeFloatTex(gl, w, h, linear = false) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, linear ? gl.LINEAR : gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, linear ? gl.LINEAR : gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, w, h, 0, gl.RGBA, gl.FLOAT, null);
  gl.bindTexture(gl.TEXTURE_2D, null);
  return tex;
}

function makeFbo(gl, colorAttachments) {
  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  const bufs = [];
  for (let i = 0; i < colorAttachments.length; i++) {
    const att = gl.COLOR_ATTACHMENT0 + i;
    gl.framebufferTexture2D(gl.FRAMEBUFFER, att, gl.TEXTURE_2D, colorAttachments[i], 0);
    bufs.push(att);
  }
  gl.drawBuffers(bufs);
  const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  if (status !== gl.FRAMEBUFFER_COMPLETE) {
    throw new Error(`[Pipeline FBO] Incomplete framebuffer: 0x${status.toString(16)}`);
  }
  return fbo;
}

const MASK_MODE_CODE = {
  height: 0,
  slope: 1,
  flow: 2,
  concavity: 3,
  radial: 4,
  noise: 5,
};

export class TerrainStackPipeline {
  constructor(engine) {
    this.engine = engine;
    this.gl = engine.gl;
    this.R = engine.gridRes;

    // Document state
    this.activePresetId = 'cliff-caves-undercuts';
    this.projectTitle = TERRAIN_STACK_PRESETS[this.activePresetId].name;
    this.paletteId = TERRAIN_STACK_PRESETS[this.activePresetId].palette ?? 0;
    this.shadingMode = 0; // 0=Derived Geology, 1=AO & Protrusions, 2=Hardness, 3=Drainage Flow, 4=Sedimentation, 5=Active Mask B&W, 6=Clay
    this.authorTool = 'navigate'; // 'navigate' | 'sculpt-add' | 'sculpt-remove' | 'sculpt-smooth' | 'cave-carve' | 'cave-fill' | 'spline-edit'
    this.layers = [];
    this.selectedLayerId = null;
    this.maskPreviewLayerId = null;
    this.lastEvalMs = 0;
    this.liveSimRunning = false;

    // Per-sculpt-layer GPU delta textures: layerId -> { tex: [t0, t1], fbo: [f0, f1], idx: 0, caveStrokes: [] }
    this.sculptStore = new Map();

    // 3D SDF Cave & Undercut Volumetric System
    this.caveSystem = new SdfCaveSystem();

    this._initGpuResources();
    this.loadPreset(this.activePresetId);
  }

  _initGpuResources() {
    const gl = this.gl;
    const R = this.R;

    this.progLandform = link(gl, FULLSCREEN_VERT, STACK_LANDFORM_FRAG, 'StackLandform');
    this.progSculptStamp = link(gl, FULLSCREEN_VERT, SCULPT_STAMP_FRAG, 'SculptStamp');
    this.progRiver = link(gl, FULLSCREEN_VERT, STACK_RIVER_INCISION_FRAG, 'StackRiver');
    this.progHydraulic = link(gl, FULLSCREEN_VERT, STACK_HYDRAULIC_FRAG, 'StackHydraulic');
    this.progThermal = link(gl, FULLSCREEN_VERT, STACK_THERMAL_TALUS_FRAG, 'StackThermal');
    this.progAeolianGlacial = link(gl, FULLSCREEN_VERT, STACK_AEOLIAN_GLACIAL_FRAG, 'StackAeolianGlacial');
    this.progBake = link(gl, FULLSCREEN_VERT, STACK_SURFACE_BAKE_FRAG, 'StackSurfaceBake');
    this.progSyncExport = link(gl, FULLSCREEN_VERT, STACK_SYNC_EXPORT_FRAG, 'StackSyncExport');
    this.progCopyVec = link(gl, FULLSCREEN_VERT, STACK_COPY_VEC_FRAG, 'StackCopyVec');
    this.progTerrain = link(gl, PIPELINE_TERRAIN_VERT, PIPELINE_TERRAIN_FRAG, 'PipelineTerrain');
    this.progCave = link(gl, SDF_CAVE_VERT, SDF_CAVE_FRAG, 'SdfCave');

    // Working Terrain Data ping-pong textures
    this.stateTex = [makeFloatTex(gl, R, R, false), makeFloatTex(gl, R, R, false)];
    this.geoTex = [makeFloatTex(gl, R, R, false), makeFloatTex(gl, R, R, false)];
    this.vecDispTex = [makeFloatTex(gl, R, R, false), makeFloatTex(gl, R, R, false)];
    this.bakedTex = makeFloatTex(gl, R, R, false);
    this.emptySculptTex = makeFloatTex(gl, R, R, false);

    // 3-target MRT FBOs for Landform passes + 2-target MRT FBOs for Simulation passes
    this.fboLandform = [
      makeFbo(gl, [this.stateTex[0], this.geoTex[0], this.vecDispTex[0]]),
      makeFbo(gl, [this.stateTex[1], this.geoTex[1], this.vecDispTex[1]]),
    ];
    this.fboSim = [
      makeFbo(gl, [this.stateTex[0], this.geoTex[0]]),
      makeFbo(gl, [this.stateTex[1], this.geoTex[1]]),
    ];
    this.fboStateRead = [makeFbo(gl, [this.stateTex[0]]), makeFbo(gl, [this.stateTex[1]])];
    this.fboGeoRead = [makeFbo(gl, [this.geoTex[0]]), makeFbo(gl, [this.geoTex[1]])];
    this.fboVecOnly = [makeFbo(gl, [this.vecDispTex[0]]), makeFbo(gl, [this.vecDispTex[1]])];
    this.fboSyncEngine = makeFbo(gl, [this.engine.terrainTex[0], this.engine.snowTex[0]]);
    this.fboBaked = makeFbo(gl, [this.bakedTex]);
    this.curIdx = 0;
    this.vecIdx = 0;

    // Downsampled 64x64 readback FBO for fast <0.5ms CPU snapshot (for SDF caves & rock placement)
    this.snapN = 64;
    this.snapTex = makeFloatTex(gl, this.snapN, this.snapN, false);
    this.fboSnap = makeFbo(gl, [this.snapTex]);
    this.snapBuf = new Float32Array(this.snapN * this.snapN * 4);
    this.rockSnapBuf = new Float32Array(this.snapN * this.snapN * 4);
    this.lastViewProj = null;

    // 128x128 Cave Portal Cutout Texture (OES_texture_float_linear if supported, else NEAREST)
    const P = this.caveSystem.portalMaskSize;
    this.cavePortalTex = makeFloatTex(gl, P, P, false);

    // 3D Volumetric SDF Cave VAO & dynamic buffers
    this.caveVao = gl.createVertexArray();
    gl.bindVertexArray(this.caveVao);
    this.cavePosBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.cavePosBuf);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

    this.caveNrmBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.caveNrmBuf);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);

    this.caveAttBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.caveAttBuf);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
  }

  _bindTex(prog, name, tex, unit) {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(gl.getUniformLocation(prog, name), unit);
  }

  _getOrCreateSculptEntry(layerId) {
    if (this.sculptStore.has(layerId)) return this.sculptStore.get(layerId);
    const gl = this.gl;
    const R = this.R;
    const t0 = makeFloatTex(gl, R, R, false);
    const t1 = makeFloatTex(gl, R, R, false);
    const f0 = makeFbo(gl, [t0]);
    const f1 = makeFbo(gl, [t1]);
    for (const f of [f0, f1]) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, f);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    const entry = { tex: [t0, t1], fbo: [f0, f1], idx: 0, caveStrokes: [] };
    this.sculptStore.set(layerId, entry);
    return entry;
  }

  clearSculptLayer(layerId) {
    const entry = this.sculptStore.get(layerId);
    const layer = this.layers.find((l) => l.id === layerId);
    if (entry) {
      const gl = this.gl;
      for (const f of entry.fbo) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, f);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      entry.caveStrokes.length = 0;
    }
    if (layer) layer.params.strokeCount = 0;
    this.evaluateStack({ reseedPlacements: true });
  }

  loadPreset(presetId) {
    const preset = TERRAIN_STACK_PRESETS[presetId] || TERRAIN_STACK_PRESETS['cliff-caves-undercuts'];
    this.activePresetId = preset.id;
    this.projectTitle = preset.name;
    this.paletteId = preset.palette ?? 0;

    const pal = DERIVED_PALETTES[this.paletteId] || DERIVED_PALETTES[0];
    this.engine.params.sunAzimuth = pal.sunAz;
    this.engine.params.sunElevation = pal.sunEl;

    // Clear old sculpt buffers and populate fresh editable stack layers
    for (const [, entry] of this.sculptStore) {
      for (const t of entry.tex) this.gl.deleteTexture(t);
      for (const f of entry.fbo) this.gl.deleteFramebuffer(f);
    }
    this.sculptStore.clear();

    this.layers = preset.layers();
    this.selectedLayerId = this.layers[0]?.id || null;
    this.evaluateStack({ reseedPlacements: true });
  }

  addLayer(type, overrides = {}) {
    const newLayer = createStackLayer(type, overrides);
    // Insert right above the currently selected layer (or at top of its natural stage)
    const selIdx = this.layers.findIndex((l) => l.id === this.selectedLayerId);
    const insertAt = selIdx >= 0 ? selIdx : 0;
    this.layers.splice(insertAt, 0, newLayer);
    this.selectedLayerId = newLayer.id;
    if (type === 'sculpt-layer') {
      this._getOrCreateSculptEntry(newLayer.id);
    }
    this.evaluateStack({ reseedPlacements: true });
    return newLayer;
  }

  duplicateLayer(layerId) {
    const idx = this.layers.findIndex((l) => l.id === layerId);
    if (idx < 0) return null;
    const src = this.layers[idx];
    const copy = createStackLayer(src.type, {
      name: `${src.name} copy`,
      enabled: src.enabled,
      mask: structuredClone(src.mask),
      params: structuredClone(src.params),
    });
    this.layers.splice(idx, 0, copy);
    this.selectedLayerId = copy.id;
    this.evaluateStack({ reseedPlacements: true });
    return copy;
  }

  deleteLayer(layerId) {
    if (this.layers.length <= 1) return false;
    const idx = this.layers.findIndex((l) => l.id === layerId);
    if (idx < 0 || this.layers[idx].locked) return false;
    this.layers.splice(idx, 1);
    const sc = this.sculptStore.get(layerId);
    if (sc) {
      for (const t of sc.tex) this.gl.deleteTexture(t);
      for (const f of sc.fbo) this.gl.deleteFramebuffer(f);
      this.sculptStore.delete(layerId);
    }
    if (this.selectedLayerId === layerId) {
      this.selectedLayerId = this.layers[Math.min(idx, this.layers.length - 1)]?.id || null;
    }
    this.evaluateStack({ reseedPlacements: true });
    return true;
  }

  moveLayer(fromIdx, toIdx) {
    if (fromIdx < 0 || fromIdx >= this.layers.length) return;
    const clamped = Math.max(0, Math.min(this.layers.length - 1, toIdx));
    if (fromIdx === clamped) return;
    const [moved] = this.layers.splice(fromIdx, 1);
    this.layers.splice(clamped, 0, moved);
    this.evaluateStack({ reseedPlacements: true });
  }

  getSelectedLayer() {
    return this.layers.find((l) => l.id === this.selectedLayerId) || null;
  }

  _packMaskUniforms(mask) {
    if (!mask || !mask.enabled) {
      return {
        cfg1: [0, 0, 0, 1],
        cfg2: [0.15, 0, 2.0, 1337],
      };
    }
    return {
      cfg1: [1, MASK_MODE_CODE[mask.mode] ?? 0, mask.min ?? 0.2, mask.max ?? 0.85],
      cfg2: [mask.feather ?? 0.15, mask.invert ? 1 : 0, mask.scale ?? 2.2, mask.seed ?? 1337],
    };
  }

  _maxReliefEstimate() {
    let r = 150;
    for (let i = this.layers.length - 1; i >= 0; i--) {
      const l = this.layers[i];
      if (!l.enabled) continue;
      if (l.type === 'base-landform') r = Math.max(60, l.params.relief || 150);
      else if (l.type === 'mountain-ridges' && l.params.combineMode === 0) r += (l.params.amplitude || 40) * 0.55;
      else if (l.type === 'rock-stacks') r += (l.params.height || 40) * 0.5;
    }
    return Math.min(280, r);
  }

  /**
   * Stamps a brush stroke into the active (or auto-created) `sculpt-layer`!
   */
  applySculptStroke(worldX, worldZ, isFirstSampleOfStroke = false) {
    let target = this.getSelectedLayer();
    if (!target || target.type !== 'sculpt-layer') {
      target = this.layers.find((l) => l.type === 'sculpt-layer' && l.enabled && !l.locked);
      if (!target) {
        target = this.addLayer('sculpt-layer', { name: 'SDF sculpt layer' });
      }
    }
    if (target.locked) return;

    const entry = this._getOrCreateSculptEntry(target.id);
    const tool = this.authorTool;
    const radius = target.params.brushRadius ?? 34;
    const strength = target.params.brushStrength ?? 0.72;

    if (tool === 'cave-carve' || tool === 'cave-fill') {
      // Sample current surface height at (worldX, worldZ) from CPU snapshot
      const st = this.engine.rockCalving.sampleTerrain(worldX, worldZ);
      const centerY = Math.max(4, st.surfaceH - (target.params.caveHeightOffset ?? 8.0));
      const last = entry.caveStrokes[entry.caveStrokes.length - 1];
      if (!last || Math.hypot(last.x - worldX, last.z - worldZ) > radius * 0.32) {
        entry.caveStrokes.push({
          x: worldX,
          y: centerY,
          z: worldZ,
          radius: radius * 0.65,
          strength,
          op: tool,
        });
        target.params.strokeCount = (target.params.strokeCount || 0) + 1;
        this.evaluateStack({ reseedPlacements: false });
      }
      return;
    }

    // Height / Smooth SDF Sculpt Stamp on GPU
    const gl = this.gl;
    const R = this.R;
    const next = 1 - entry.idx;
    const opCode = tool === 'sculpt-remove' ? 1 : tool === 'sculpt-smooth' ? 2 : 0;

    gl.bindFramebuffer(gl.FRAMEBUFFER, entry.fbo[next]);
    gl.viewport(0, 0, R, R);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.useProgram(this.progSculptStamp);
    gl.bindVertexArray(this.engine.emptyVao);
    this._bindTex(this.progSculptStamp, 'uSculptTex', entry.tex[entry.idx], 0);
    gl.uniform4f(
      gl.getUniformLocation(this.progSculptStamp, 'uBrushPosRad'),
      worldX,
      worldZ,
      radius,
      this.engine.params.worldSpan
    );
    gl.uniform4f(
      gl.getUniformLocation(this.progSculptStamp, 'uBrushOpStr'),
      opCode,
      strength,
      0,
      0
    );
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    entry.idx = next;

    if (isFirstSampleOfStroke) {
      target.params.strokeCount = (target.params.strokeCount || 0) + 1;
    }
    this.evaluateStack({ reseedPlacements: false });
  }

  /**
   * FULL BOTTOM-TO-TOP PIPELINE EVALUATION!
   * Iterates from `layers.length - 1` (bottom) up to `0` (top), executing each enabled
   * Landform, Sculpt, Spline, and Simulation operation in exact stack order.
   */
  evaluateStack({ reseedPlacements = true, fastPreview = false } = {}) {
    const t0 = performance.now();
    const gl = this.gl;
    const R = this.R;
    const span = this.engine.params.worldSpan;
    const maxRelief = this._maxReliefEstimate();

    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.disable(gl.CULL_FACE);
    gl.bindVertexArray(this.engine.emptyVao);
    gl.viewport(0, 0, R, R);

    // 1. Initialize empty working terrain state at bottom of stack
    this.curIdx = 0;
    this.vecIdx = 0;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboLandform[0]);
    gl.clearBufferfv(gl.COLOR, 0, new Float32Array([14.0, 0.0, 0.0, 0.0])); // bedrock=14m
    gl.clearBufferfv(gl.COLOR, 1, new Float32Array([0.52, 0.0, 0.0, 0.0])); // hardness=0.52
    gl.clearBufferfv(gl.COLOR, 2, new Float32Array([0.0, 0.0, 0.0, 0.0]));  // 3D vecDisp=0

    const activeCaveLayers = [];
    const activeSculptCaveStrokes = [];

    // 2. Evaluate BOTTOM -> TOP (`i = layers.length - 1` down to `0`)!
    for (let i = this.layers.length - 1; i >= 0; i--) {
      const layer = this.layers[i];
      if (!layer.enabled) continue;
      const p = layer.params;
      const { cfg1, cfg2 } = this._packMaskUniforms(layer.mask);

      if (
        layer.type === 'base-landform' ||
        layer.type === 'mountain-ridges' ||
        layer.type === 'stratigraphic-beds' ||
        layer.type === 'rock-stacks' ||
        layer.type === 'cliff-push-pull' ||
        layer.type === 'sculpt-layer' ||
        layer.type === 'spline-feature'
      ) {
        const next = 1 - this.curIdx;
        if (this.vecIdx === next) {
          this._copyVecDisp(this.vecIdx, this.curIdx);
          this.vecIdx = this.curIdx;
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboLandform[next]);
        gl.useProgram(this.progLandform);
        this._bindTex(this.progLandform, 'uStateTex', this.stateTex[this.curIdx], 0);
        this._bindTex(this.progLandform, 'uGeoTex', this.geoTex[this.curIdx], 1);
        this._bindTex(this.progLandform, 'uVecDispTex', this.vecDispTex[this.vecIdx], 2);

        let sculptTex = this.emptySculptTex;
        if (layer.type === 'sculpt-layer') {
          const entry = this._getOrCreateSculptEntry(layer.id);
          sculptTex = entry.tex[entry.idx];
          for (const cs of entry.caveStrokes) activeSculptCaveStrokes.push(cs);
        }
        this._bindTex(this.progLandform, 'uSculptTex', sculptTex, 3);

        gl.uniform4fv(gl.getUniformLocation(this.progLandform, 'uMaskCfg1'), cfg1);
        gl.uniform4fv(gl.getUniformLocation(this.progLandform, 'uMaskCfg2'), cfg2);

        let opKind = 0;
        let u0 = [0, 0, 0, 0], u1 = [0, 0, 0, 0], u2 = [0, 0, 0, 0];

        if (layer.type === 'base-landform') {
          opKind = 0;
          u0 = [p.archetype ?? 0, p.relief ?? 155, p.scale ?? 1.85, p.roughness ?? 0.62];
          u1 = [p.ridgeSharpness ?? 0.68, p.warpStrength ?? 0.45, p.valleyFloor ?? 0.22, p.baseHardness ?? 0.54];
          u2 = [p.seed ?? 4029, 0, 0, 0];
        } else if (layer.type === 'mountain-ridges') {
          opKind = 1;
          u0 = [p.generator ?? 0, p.combineMode ?? 0, p.amplitude ?? 62, p.scale ?? 2.2];
          u1 = [p.sharpness ?? 0.64, p.azimuth ?? 28, p.opacity ?? 1.0, p.hardnessDelta ?? 0.15];
          u2 = [p.seed ?? 7104, 0, 0, 0];
        } else if (layer.type === 'stratigraphic-beds') {
          opKind = 2;
          u0 = [p.bedCount ?? 9, p.terraceStrength ?? 0.58, p.hardSoftContrast ?? 0.78, p.dipAngle ?? 11];
          u1 = [p.strikeAzimuth ?? 24, p.bedFoldWarp ?? 0.28, p.ledgeOverhang ?? 0.35, p.opacity ?? 1.0];
          u2 = [p.seed ?? 3190, 0, 0, 0];
        } else if (layer.type === 'rock-stacks') {
          opKind = 3;
          u0 = [p.height ?? 54, p.spacing ?? 68, p.radius ?? 16, p.taper ?? 0.42];
          u1 = [p.tiers ?? 5, p.lean ?? 0.30, p.leanAzimuth ?? 35, p.caprockOverhang ?? 0.48];
          u2 = [p.opacity ?? 1.0, p.seed ?? 8821, 0, 0];
        } else if (layer.type === 'cliff-push-pull') {
          opKind = 4;
          u0 = [p.displacement ?? 11.5, p.featureScale ?? 2.6, p.slopeThreshold ?? 28, p.ledgeStrength ?? 0.62];
          u1 = [p.overhangBias ?? 0.55, p.verticalCrease ?? 0.58, p.opacity ?? 1.0, p.seed ?? 5512];
        } else if (layer.type === 'sculpt-layer') {
          opKind = 5;
          u0 = [p.opacity ?? 1.0, 0, 0, 0];
        } else if (layer.type === 'spline-feature') {
          opKind = 6;
          u0 = [p.mode ?? 0, p.width ?? 44, p.depth ?? 48, p.wallSteepness ?? 0.74];
          u1 = [p.meanderAmp ?? 0.32, p.waterFill ?? 0.28, p.bankFalloff ?? 0.55, p.opacity ?? 1.0];
          const pts = Array.isArray(p.points) ? p.points : [];
          const count = Math.min(8, pts.length);
          const flat = new Float32Array(16);
          for (let k = 0; k < count; k++) {
            flat[k * 2 + 0] = pts[k][0];
            flat[k * 2 + 1] = pts[k][1];
          }
          gl.uniform4fv(gl.getUniformLocation(this.progLandform, 'uSplinePts'), flat);
          gl.uniform1i(gl.getUniformLocation(this.progLandform, 'uSplineCount'), count);
        }

        gl.uniform4f(gl.getUniformLocation(this.progLandform, 'uDomain'), span, R, maxRelief, opKind);
        gl.uniform4fv(gl.getUniformLocation(this.progLandform, 'uParam0'), u0);
        gl.uniform4fv(gl.getUniformLocation(this.progLandform, 'uParam1'), u1);
        gl.uniform4fv(gl.getUniformLocation(this.progLandform, 'uParam2'), u2);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        this.curIdx = next;
        this.vecIdx = next;
      } else if (layer.type === 'sdf-caves') {
        activeCaveLayers.push(layer);
      } else if (layer.type === 'river-incision') {
        const iters = Math.max(1, Math.min(80, Math.round((p.iterations ?? 28) * (fastPreview ? 0.5 : 1.0))));
        gl.useProgram(this.progRiver);
        gl.uniform4f(
          gl.getUniformLocation(this.progRiver, 'uSimParams'),
          R, span, p.incisionStrength ?? 0.68, p.headwaterRain ?? 0.58
        );
        for (let it = 0; it < iters; it++) {
          const next = 1 - this.curIdx;
          gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboSim[next]);
          this._bindTex(this.progRiver, 'uStateTex', this.stateTex[this.curIdx], 0);
          this._bindTex(this.progRiver, 'uGeoTex', this.geoTex[this.curIdx], 1);
          gl.uniform4f(
            gl.getUniformLocation(this.progRiver, 'uSimExtra'),
            p.basinPooling ?? 0.42, p.hardnessRespect ?? 0.80, p.channelWidth ?? 0.45, it
          );
          gl.drawArrays(gl.TRIANGLES, 0, 3);
          this.curIdx = next;
        }
      } else if (layer.type === 'hydraulic-erosion') {
        const iters = Math.max(1, Math.min(120, Math.round((p.iterations ?? 52) * (fastPreview ? 0.45 : 1.0))));
        gl.useProgram(this.progHydraulic);
        gl.uniform4f(
          gl.getUniformLocation(this.progHydraulic, 'uHydParams'),
          R, span, p.erosionStrength ?? 0.74, p.sedimentCapacity ?? 0.82
        );
        for (let it = 0; it < iters; it++) {
          const next = 1 - this.curIdx;
          gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboSim[next]);
          this._bindTex(this.progHydraulic, 'uStateTex', this.stateTex[this.curIdx], 0);
          this._bindTex(this.progHydraulic, 'uGeoTex', this.geoTex[this.curIdx], 1);
          gl.uniform4f(
            gl.getUniformLocation(this.progHydraulic, 'uHydExtra'),
            p.depositionRate ?? 0.58, p.rainRate ?? 0.65, p.evaporation ?? 0.16, it
          );
          gl.drawArrays(gl.TRIANGLES, 0, 3);
          this.curIdx = next;
        }
      } else if (layer.type === 'thermal-talus') {
        const iters = Math.max(1, Math.min(90, Math.round((p.iterations ?? 34) * (fastPreview ? 0.5 : 1.0))));
        gl.useProgram(this.progThermal);
        gl.uniform4f(
          gl.getUniformLocation(this.progThermal, 'uTalusCfg'),
          R, span, p.reposeAngle ?? 33, p.spallingRate ?? 0.66
        );
        for (let it = 0; it < iters; it++) {
          const next = 1 - this.curIdx;
          gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboSim[next]);
          this._bindTex(this.progThermal, 'uStateTex', this.stateTex[this.curIdx], 0);
          this._bindTex(this.progThermal, 'uGeoTex', this.geoTex[this.curIdx], 1);
          gl.uniform4f(
            gl.getUniformLocation(this.progThermal, 'uTalusExt'),
            p.talusSpread ?? 0.58, p.hardnessShield ?? 0.72, it, 0
          );
          gl.drawArrays(gl.TRIANGLES, 0, 3);
          this.curIdx = next;
        }
      } else if (layer.type === 'aeolian-glacial') {
        const iters = Math.max(1, Math.min(70, Math.round((p.iterations ?? 22) * (fastPreview ? 0.5 : 1.0))));
        gl.useProgram(this.progAeolianGlacial);
        gl.uniform4f(
          gl.getUniformLocation(this.progAeolianGlacial, 'uProcCfg'),
          R, span, p.processMode ?? 0, p.intensity ?? 0.68
        );
        gl.uniform4f(
          gl.getUniformLocation(this.progAeolianGlacial, 'uProcExt'),
          p.snowline ?? 0.54, p.glacierCarve ?? 0.55, p.azimuth ?? 32, maxRelief
        );
        for (let it = 0; it < iters; it++) {
          const next = 1 - this.curIdx;
          gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboSim[next]);
          this._bindTex(this.progAeolianGlacial, 'uStateTex', this.stateTex[this.curIdx], 0);
          this._bindTex(this.progAeolianGlacial, 'uGeoTex', this.geoTex[this.curIdx], 1);
          gl.drawArrays(gl.TRIANGLES, 0, 3);
          this.curIdx = next;
        }
      }
    }

    // 3. Bake Surface Data (Horizon AO, Protrusions & Selected Layer's B&W Mask Preview)
    const sel = this.getSelectedLayer();
    const maskUniforms = this._packMaskUniforms(
      sel?.mask?.enabled ? sel.mask : { enabled: true, ...(sel?.mask || { mode: 'height', min: 0.2, max: 0.85 }) }
    );
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboBaked);
    gl.viewport(0, 0, R, R);
    gl.useProgram(this.progBake);
    this._bindTex(this.progBake, 'uStateTex', this.stateTex[this.curIdx], 0);
    this._bindTex(this.progBake, 'uGeoTex', this.geoTex[this.curIdx], 1);
    gl.uniform4f(gl.getUniformLocation(this.progBake, 'uBakeDomain'), span, R, maxRelief, 0);
    gl.uniform4fv(gl.getUniformLocation(this.progBake, 'uMaskCfg1'), maskUniforms.cfg1);
    gl.uniform4fv(gl.getUniformLocation(this.progBake, 'uMaskCfg2'), maskUniforms.cfg2);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // 4. Sync State+Geo into engine.terrainTex[0] (bedrock, coarse, fine, water) + engine.snowTex[0] (snow)
    this.engine.terrainIdx = 0;
    this.engine.snowIdx = 0;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboSyncEngine);
    gl.viewport(0, 0, R, R);
    gl.useProgram(this.progSyncExport);
    this._bindTex(this.progSyncExport, 'uStateTex', this.stateTex[this.curIdx], 0);
    this._bindTex(this.progSyncExport, 'uGeoTex', this.geoTex[this.curIdx], 1);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // 5. Read back fast 64x64 snapshot for 3D SDF Caves, Rock Placement & Telemetry!
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboSnap);
    gl.viewport(0, 0, this.snapN, this.snapN);
    gl.useProgram(this.engine.progTelemetry);
    this._bindTex(this.engine.progTelemetry, 'uTerrainTex', this.stateTex[this.curIdx], 0);
    gl.uniform1f(gl.getUniformLocation(this.engine.progTelemetry, 'uGridRes'), R);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.readPixels(0, 0, this.snapN, this.snapN, gl.RGBA, gl.FLOAT, this.snapBuf);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // Remap [bedrock, water, coarse, fine] -> [bedrock, coarse, fine, water] for RockCalvingSystem
    for (let k = 0; k < this.snapBuf.length; k += 4) {
      this.rockSnapBuf[k] = this.snapBuf[k];
      this.rockSnapBuf[k + 1] = this.snapBuf[k + 2];
      this.rockSnapBuf[k + 2] = this.snapBuf[k + 3];
      this.rockSnapBuf[k + 3] = this.snapBuf[k + 1];
    }

    // 6. Rebuild 3D Volumetric SDF Caves & Cliff Undercuts + Upload Portal Mask Texture
    const caveRes = this.caveSystem.rebuildCaveVolume({
      gridRgba: this.snapBuf,
      gridN: this.snapN,
      worldSpan: span,
      caveLayers: activeCaveLayers,
      sculptCaveStrokes: activeSculptCaveStrokes,
      maxRelief,
    });
    const P = this.caveSystem.portalMaskSize;
    gl.bindTexture(gl.TEXTURE_2D, this.cavePortalTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, P, P, 0, gl.RGBA, gl.FLOAT, this.caveSystem.portalTexData);
    gl.bindTexture(gl.TEXTURE_2D, null);

    if (caveRes.vertexCount > 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.cavePosBuf);
      gl.bufferData(gl.ARRAY_BUFFER, this.caveSystem.positions, gl.DYNAMIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.caveNrmBuf);
      gl.bufferData(gl.ARRAY_BUFFER, this.caveSystem.normals, gl.DYNAMIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.caveAttBuf);
      gl.bufferData(gl.ARRAY_BUFFER, this.caveSystem.attribs, gl.DYNAMIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }

    // 7. Update Rock Placement Layer & Telemetry
    this.engine.rockCalving.updateTerrainSnapshot(this.rockSnapBuf, this.snapN, span);
    const rockLayer = this.layers.find((l) => l.type === 'rock-placement' && l.enabled);
    if (rockLayer && reseedPlacements) {
      this.engine.params.showOutcrops = true;
      this.engine.params.boulderDensity = rockLayer.params.density ?? 0.62;
      this.engine.params.rockfallRate = rockLayer.params.talusAffinity ?? 0.72;
      this.engine.params.seed = rockLayer.params.seed ?? 4410;
      this.engine.rockCalving.seedForLandscape(this.engine.params);
      const settle = Math.max(0, Math.min(60, Math.round(rockLayer.params.settleSteps ?? 28)));
      for (let s = 0; s < settle; s++) {
        this.engine.rockCalving.stepPhysics(0.04, true);
      }
    } else if (!rockLayer) {
      this.engine.params.showOutcrops = false;
    }

    this.lastEvalMs = Math.max(0.1, performance.now() - t0);
    this._publishTelemetry();
  }

  _copyVecDisp(fromIdx, toIdx) {
    // Shader-based 1:1 RGBA32F copy (zero blitFramebuffer driver quirks on ANGLE D3D11)
    if (fromIdx === toIdx) return;
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboVecOnly[toIdx]);
    gl.viewport(0, 0, this.R, this.R);
    gl.useProgram(this.progCopyVec);
    this._bindTex(this.progCopyVec, 'uSrcTex', this.vecDispTex[fromIdx], 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  /**
   * Optional Live Simulation Tick (runs 1 real-time step of enabled simulation layers per frame when Play is active).
   */
  stepLiveSimulation() {
    const gl = this.gl;
    const R = this.R;
    const span = this.engine.params.worldSpan;
    const maxRelief = this._maxReliefEstimate();

    let ranAny = false;
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.bindVertexArray(this.engine.emptyVao);
    gl.viewport(0, 0, R, R);

    for (let i = this.layers.length - 1; i >= 0; i--) {
      const l = this.layers[i];
      if (!l.enabled) continue;
      const p = l.params;
      if (l.type === 'hydraulic-erosion') {
        const next = 1 - this.curIdx;
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboSim[next]);
        gl.useProgram(this.progHydraulic);
        this._bindTex(this.progHydraulic, 'uStateTex', this.stateTex[this.curIdx], 0);
        this._bindTex(this.progHydraulic, 'uGeoTex', this.geoTex[this.curIdx], 1);
        gl.uniform4f(gl.getUniformLocation(this.progHydraulic, 'uHydParams'), R, span, p.erosionStrength ?? 0.74, p.sedimentCapacity ?? 0.82);
        gl.uniform4f(gl.getUniformLocation(this.progHydraulic, 'uHydExtra'), p.depositionRate ?? 0.58, p.rainRate ?? 0.65, p.evaporation ?? 0.16, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        this.curIdx = next;
        ranAny = true;
      } else if (l.type === 'thermal-talus') {
        const next = 1 - this.curIdx;
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboSim[next]);
        gl.useProgram(this.progThermal);
        this._bindTex(this.progThermal, 'uStateTex', this.stateTex[this.curIdx], 0);
        this._bindTex(this.progThermal, 'uGeoTex', this.geoTex[this.curIdx], 1);
        gl.uniform4f(gl.getUniformLocation(this.progThermal, 'uTalusCfg'), R, span, p.reposeAngle ?? 33, p.spallingRate ?? 0.66);
        gl.uniform4f(gl.getUniformLocation(this.progThermal, 'uTalusExt'), p.talusSpread ?? 0.58, p.hardnessShield ?? 0.72, 0, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        this.curIdx = next;
        ranAny = true;
      }
    }

    if (ranAny) {
      // Re-bake AO/protrusions & sync to engine.terrainTex[0] / engine.snowTex[0]
      const sel = this.getSelectedLayer();
      const maskUniforms = this._packMaskUniforms(sel?.mask);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboBaked);
      gl.useProgram(this.progBake);
      this._bindTex(this.progBake, 'uStateTex', this.stateTex[this.curIdx], 0);
      this._bindTex(this.progBake, 'uGeoTex', this.geoTex[this.curIdx], 1);
      gl.uniform4f(gl.getUniformLocation(this.progBake, 'uBakeDomain'), span, R, maxRelief, 0);
      gl.uniform4fv(gl.getUniformLocation(this.progBake, 'uMaskCfg1'), maskUniforms.cfg1);
      gl.uniform4fv(gl.getUniformLocation(this.progBake, 'uMaskCfg2'), maskUniforms.cfg2);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboSyncEngine);
      gl.useProgram(this.progSyncExport);
      this._bindTex(this.progSyncExport, 'uStateTex', this.stateTex[this.curIdx], 0);
      this._bindTex(this.progSyncExport, 'uGeoTex', this.geoTex[this.curIdx], 1);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
  }

  _publishTelemetry() {
    const cellArea = Math.pow(this.engine.params.worldSpan / this.snapN, 2);
    let coarseM3 = 0, fineM3 = 0, waterM3 = 0;
    for (let i = 0; i < this.snapBuf.length; i += 4) {
      waterM3 += Math.max(0, this.snapBuf[i + 1]) * cellArea;
      coarseM3 += Math.max(0, this.snapBuf[i + 2]) * cellArea;
      fineM3 += Math.max(0, this.snapBuf[i + 3]) * cellArea;
    }
    this.engine.telemetry.coarseSedM3 = Math.round(coarseM3);
    this.engine.telemetry.fineSedM3 = Math.round(fineM3);
    this.engine.telemetry.waterVolumeM3 = Math.round(waterM3);
    this.engine.telemetry.evalMs = Number(this.lastEvalMs.toFixed(1));
    this.engine.telemetry.layerCount = this.layers.length;
    this.engine.telemetry.caveTris = Math.round(this.caveSystem.vertexCount / 3);
    if (this.engine.onTelemetry) this.engine.onTelemetry(this.engine.telemetry);
  }

  /**
   * Projects a 3D world point (wx, wy, wz) into normalized [0..1] viewport screen coords
   * for interactive 3D Spline Gizmos.
   */
  projectWorldToScreen(wx, wy, wz) {
    const m = this.lastViewProj;
    if (!m) return null;
    const cx = m[0] * wx + m[4] * wy + m[8] * wz + m[12];
    const cy = m[1] * wx + m[5] * wy + m[9] * wz + m[13];
    const cw = m[3] * wx + m[7] * wy + m[11] * wz + m[15];
    if (cw <= 0.1) return null;
    const ndcX = cx / cw;
    const ndcY = cy / cw;
    return {
      u: ndcX * 0.5 + 0.5,
      v: 0.5 - ndcY * 0.5,
    };
  }

  /**
   * Renders the evaluated 3D Vector-Displaced Terrain + 3D SDF Caves + Rock Placement + 3D Grass!
   */
  renderPipelineFrame(viewProj, eye, sunDir, timeSec) {
    this.lastViewProj = viewProj;
    const gl = this.gl;
    const R = this.R;
    const p = this.engine.params;
    const maxRelief = this._maxReliefEstimate();

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.engine.canvas.width, this.engine.canvas.height);
    gl.clearColor(0.06, 0.065, 0.07, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // 1. Atmospheric Sky Backdrop
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.depthMask(false);
    gl.useProgram(this.engine.progSkyBg);
    gl.uniform1i(gl.getUniformLocation(this.engine.progSkyBg, 'uMaterialTheme'), this.paletteId === 5 ? 7 : 0);
    gl.bindVertexArray(this.engine.emptyVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // 2. 3D Vector-Displaced Terrain Mesh (with true 3D Overhangs & SDF Cave Portal Cutouts)
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.depthMask(true);
    gl.disable(gl.CULL_FACE);

    gl.useProgram(this.progTerrain);
    gl.bindVertexArray(this.engine.terrainVao);
    this._bindTex(this.progTerrain, 'uStateTex', this.stateTex[this.curIdx], 0);
    this._bindTex(this.progTerrain, 'uGeoTex', this.geoTex[this.curIdx], 1);
    this._bindTex(this.progTerrain, 'uVecDispTex', this.vecDispTex[this.vecIdx], 2);
    this._bindTex(this.progTerrain, 'uBakedTex', this.bakedTex, 3);
    this._bindTex(this.progTerrain, 'uCavePortalTex', this.cavePortalTex, 4);

    gl.uniformMatrix4fv(gl.getUniformLocation(this.progTerrain, 'uViewProj'), false, viewProj);
    gl.uniform3fv(gl.getUniformLocation(this.progTerrain, 'uCameraPos'), eye);
    gl.uniform3fv(gl.getUniformLocation(this.progTerrain, 'uSunDir'), sunDir);
    gl.uniform4f(gl.getUniformLocation(this.progTerrain, 'uRenderDomain'), p.worldSpan, R, p.showWater !== false ? 1.0 : 0.0, maxRelief);
    gl.uniform2i(gl.getUniformLocation(this.progTerrain, 'uShadeConfig'), this.paletteId, this.shadingMode);

    const sel = this.getSelectedLayer();
    const isSculptTool = this.authorTool.startsWith('sculpt-') || this.authorTool.startsWith('cave-');
    const brushRad = sel?.type === 'sculpt-layer' ? (sel.params.brushRadius ?? 34) : p.brushRadius;
    const brushCode = isSculptTool ? (this.authorTool.startsWith('cave-') ? 3 : 1) : 0;
    gl.uniform4f(
      gl.getUniformLocation(this.progTerrain, 'uBrushCursor'),
      this.engine.pointerWorldXZ[0],
      this.engine.pointerWorldXZ[1],
      brushRad,
      brushCode
    );
    gl.drawElements(gl.TRIANGLES, this.engine.terrainIndexCount, gl.UNSIGNED_INT, 0);

    // 3. Real 3D Volumetric SDF Cave & Cliff-Undercut Interior Mesh!
    if (this.caveSystem.vertexCount > 0) {
      gl.useProgram(this.progCave);
      gl.bindVertexArray(this.caveVao);
      gl.uniformMatrix4fv(gl.getUniformLocation(this.progCave, 'uViewProj'), false, viewProj);
      gl.uniform3fv(gl.getUniformLocation(this.progCave, 'uCameraPos'), eye);
      gl.uniform3fv(gl.getUniformLocation(this.progCave, 'uSunDir'), sunDir);
      gl.uniform4f(gl.getUniformLocation(this.progCave, 'uRenderDomain'), p.worldSpan, R, 1.0, maxRelief);
      gl.uniform2i(gl.getUniformLocation(this.progCave, 'uShadeConfig'), this.paletteId, this.shadingMode);
      gl.drawArrays(gl.TRIANGLES, 0, this.caveSystem.vertexCount);
    }

    // 4. Rock-Placement Layer (3D Outcrops & Talus Boulders locked to exact 512x512 terrain!)
    const rockLayer = this.layers.find((l) => l.type === 'rock-placement' && l.enabled);
    if (rockLayer && this.engine.rockCalving.rocks.length > 0 && this.shadingMode !== 5) {
      gl.enable(gl.CULL_FACE);
      gl.cullFace(gl.BACK);
      const { hardnessVec, strataVec } = this.engine._getHardnessUniforms();
      const climate = this.engine._getClimateUniforms();
      const mapTheme = this.paletteId === 1 ? 3 : this.paletteId === 2 ? 2 : this.paletteId === 3 ? 4 : this.paletteId === 5 ? 7 : 1;

      gl.useProgram(this.engine.progRockInstance);
      gl.bindVertexArray(this.engine.rockVao);
      this._bindTex(this.engine.progRockInstance, 'uTerrainTex', this.engine.terrainTex[0], 0);
      this._bindTex(this.engine.progRockInstance, 'uSnowTex', this.engine.snowTex[0], 1);
      gl.uniformMatrix4fv(gl.getUniformLocation(this.engine.progRockInstance, 'uViewProj'), false, viewProj);
      gl.uniform3fv(gl.getUniformLocation(this.engine.progRockInstance, 'uCameraPos'), eye);
      gl.uniform3fv(gl.getUniformLocation(this.engine.progRockInstance, 'uSunDir'), sunDir);
      gl.uniform4f(gl.getUniformLocation(this.engine.progRockInstance, 'uRenderDomain'), p.worldSpan, R, 1.0, timeSec);
      gl.uniform4f(gl.getUniformLocation(this.engine.progRockInstance, 'uLayerVis'), 1, 1, 1, 1);
      gl.uniform4fv(gl.getUniformLocation(this.engine.progRockInstance, 'uHardnessParams'), hardnessVec);
      gl.uniform4fv(gl.getUniformLocation(this.engine.progRockInstance, 'uStrataOrient'), strataVec);
      gl.uniform1i(gl.getUniformLocation(this.engine.progRockInstance, 'uViewMode'), this.shadingMode === 6 ? 4 : 0);
      gl.uniform1i(gl.getUniformLocation(this.engine.progRockInstance, 'uMaterialTheme'), mapTheme);
      gl.uniform1i(gl.getUniformLocation(this.engine.progRockInstance, 'uFabricMode'), 0);
      gl.uniform4fv(gl.getUniformLocation(this.engine.progRockInstance, 'uClimate'), climate.snowVec);
      gl.uniform1f(gl.getUniformLocation(this.engine.progRockInstance, 'uSeed'), rockLayer.params.seed ?? 4410);

      gl.bindBuffer(gl.ARRAY_BUFFER, this.engine.rockInstVbo);
      const subs = this.engine.rockCalving.atlas.submeshes;
      for (let b = 0; b < subs.length; b++) {
        const count = this.engine.rockCalving.bucketCounts[b];
        if (count <= 0) continue;
        const sub = subs[b];
        const slice = this.engine.rockCalving.bucketData[b].subarray(0, count * 16);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, slice);
        gl.drawElementsInstanced(gl.TRIANGLES, sub.indexCount, gl.UNSIGNED_SHORT, sub.firstIndex * 2, count);
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }

    // 5. Vegetation-Placement Layer (Real 3D Curved Grass Tufts driven by slope/height/water masks!)
    const vegLayer = this.layers.find((l) => l.type === 'vegetation-placement' && l.enabled);
    if (vegLayer && (vegLayer.params.density ?? 0) > 0.01 && (this.shadingMode === 0 || this.shadingMode === 6)) {
      const vp = vegLayer.params;
      const tuftCount = Math.max(512, Math.min(MAX_GRASS_TUFTS, Math.round(vp.density * MAX_GRASS_TUFTS)));
      const slopeTan = Math.tan(((vp.slopeMax ?? 32) * Math.PI) / 180);

      gl.disable(gl.CULL_FACE);
      gl.useProgram(this.engine.progGrassInstance);
      gl.bindVertexArray(this.engine.grassVao);
      this._bindTex(this.engine.progGrassInstance, 'uTerrainTex', this.engine.terrainTex[0], 0);
      this._bindTex(this.engine.progGrassInstance, 'uSnowTex', this.engine.snowTex[0], 1);

      gl.uniformMatrix4fv(gl.getUniformLocation(this.engine.progGrassInstance, 'uViewProj'), false, viewProj);
      gl.uniform3fv(gl.getUniformLocation(this.engine.progGrassInstance, 'uCameraPos'), eye);
      gl.uniform3fv(gl.getUniformLocation(this.engine.progGrassInstance, 'uSunDir'), sunDir);
      gl.uniform4f(gl.getUniformLocation(this.engine.progGrassInstance, 'uRenderDomain'), p.worldSpan, R, 1.0, timeSec);
      gl.uniform4f(gl.getUniformLocation(this.engine.progGrassInstance, 'uGrassParams'), tuftCount, vp.bladeHeight ?? 1.18, vp.windSway ?? 0.65, slopeTan);
      gl.uniform4f(gl.getUniformLocation(this.engine.progGrassInstance, 'uGrassStyle'), vp.species ?? 0, vp.species === 1 ? 0.88 : 0.14, vp.elevationMax ?? 0.62, vp.patchiness ?? 0.56);
      gl.uniform4f(gl.getUniformLocation(this.engine.progGrassInstance, 'uWindRender'), 0.85, 0.52, 0.42, vp.species === 1 ? 0.5 : 0.0);
      gl.uniform4f(gl.getUniformLocation(this.engine.progGrassInstance, 'uStrataOrient'), 0.2, 1.0, 0.0, 1.0);
      gl.uniform1i(gl.getUniformLocation(this.engine.progGrassInstance, 'uViewMode'), this.shadingMode === 6 ? 4 : 0);
      gl.uniform1i(gl.getUniformLocation(this.engine.progGrassInstance, 'uMaterialTheme'), 8);
      gl.uniform1f(gl.getUniformLocation(this.engine.progGrassInstance, 'uSeed'), vp.seed ?? 9012);

      gl.drawElementsInstanced(gl.TRIANGLES, this.engine.grassIndexCount, gl.UNSIGNED_SHORT, 0, tuftCount);
      gl.enable(gl.CULL_FACE);
    }

    gl.bindVertexArray(null);
  }
}

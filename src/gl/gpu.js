// Frontier — GPU erosion pipeline (WebGL2).
// Orchestrates the ping-pong passes that mirror src/core/solver.js:
//   motion → event → splat → apply → cargo → redistance ×2 → clamp → thermal(÷3)
// plus GPU sculpting (tools + CSG stamps) with post-stroke redistancing.

import * as S from "./erosion-shaders.js";
import { fullscreenVertex } from "./common.js";
import { grainVertex, grainFragment } from "./render-shaders.js";
import {
  SIZE, ATLAS, PARTICLE_SIZE, SPLAT_SLICES, BAND, VOXEL_VOLUME, carveRadius,
} from "../core/constants.js";

const WIDTH = ATLAS[0], HEIGHT = ATLAS[1];

function compile(gl, vert, frag, label) {
  const prog = gl.createProgram();
  for (const [type, src] of [[gl.VERTEX_SHADER, vert], [gl.FRAGMENT_SHADER, frag]]) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, gl.getExtension("OES_texture_float_linear") ? src.replace("#version 300 es", "#version 300 es\n#define LINEAR_VOLUME") : src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(sh);
      gl.deleteShader(sh); gl.deleteProgram(prog);
      throw new Error(label + ": " + log);
    }
    gl.attachShader(prog, sh);
    gl.deleteShader(sh);
  }
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(label + ": " + gl.getProgramInfoLog(prog));
  return { handle: prog, locs: new Map(), label };
}
function uniLoc(gl, prog, name) {
  if (!prog.locs.has(name)) prog.locs.set(name, gl.getUniformLocation(prog.handle, name));
  return prog.locs.get(name);
}

export class GPUErosion {
  constructor(gl) {
    this.gl = gl;
    this.tick = 0;
    this.volumeIdx = 0;
    this.motionIdx = 0;
    this.cargoIdx = 0;
    this.materialIdx = 0;
    this.activeCount = 1024;
    this.sculpted = false;
    this.ledger = { eroded: 0, deposited: 0, carried: 0, retired: 0 };
    // Render-to-float ladder: RGBA32F preferred; RGBA16F (half) as fallback.
    // Neither -> caller falls back to CPU mirror mode.
    this.floatRender = !!gl.getExtension("EXT_color_buffer_float");
    if (!this.floatRender && !gl.getExtension("EXT_color_buffer_half_float"))
      throw new Error("No renderable float format (EXT_color_buffer_float / EXT_color_buffer_half_float)");
    this.texFmt = this.floatRender ? gl.RGBA32F : gl.RGBA16F;
    this.floatBlend = this.floatRender && !!gl.getExtension("EXT_float_blend");
    if (gl.getParameter(gl.MAX_TEXTURE_SIZE) < WIDTH) throw new Error(`Texture size too small (need ${WIDTH})`);
    this.fbo = gl.createFramebuffer();
    this.vao = gl.createVertexArray();
    this.volumes = [this.makeTex(WIDTH, HEIGHT), this.makeTex(WIDTH, HEIGHT)];
    this.linear = !!gl.getExtension("OES_texture_float_linear");
    if (this.linear) for (const t of this.volumes) { gl.bindTexture(gl.TEXTURE_2D, t); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); }
    this.positions = [this.makeTex(...PARTICLE_SIZE), this.makeTex(...PARTICLE_SIZE)];
    this.velocities = [this.makeTex(...PARTICLE_SIZE), this.makeTex(...PARTICLE_SIZE)];
    this.cargos = [this.makeTex(...PARTICLE_SIZE), this.makeTex(...PARTICLE_SIZE)];
    this.metas = [this.makeTex(...PARTICLE_SIZE), this.makeTex(...PARTICLE_SIZE)];
    this.species = [this.makeTex(...PARTICLE_SIZE), this.makeTex(...PARTICLE_SIZE)];
    this.materials = [this.makeTex(WIDTH, HEIGHT), this.makeTex(WIDTH, HEIGHT)];
    if (this.linear) for (const t of this.materials) { gl.bindTexture(gl.TEXTURE_2D, t); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); }
    this.impacts = this.makeTex(...PARTICLE_SIZE);
    this.contacts = this.makeTex(...PARTICLE_SIZE);
    this.exchanges = this.makeTex(...PARTICLE_SIZE);
    this.normals = this.makeTex(...PARTICLE_SIZE);
    this.requests = this.makeTex(WIDTH, HEIGHT, this.floatBlend ? gl.RGBA32F : gl.RGBA16F);
    this.speciesReq = this.makeTex(WIDTH, HEIGHT, this.floatBlend ? gl.RGBA32F : gl.RGBA16F);
    this.accept = this.makeTex(WIDTH, HEIGHT);
    this.pickTarget = this.makeTex(1, 1);
    this.progs = {};
    for (const [name, code] of Object.entries({
      motion: S.motionFragment,
      event: S.eventFragment,
      apply: S.applyFragment,
      cargo: S.cargoFragment,
      distance: S.distanceFragment,
      clamp: S.clampFragment,
      thermal: S.thermalFragment,
      sculpt: S.sculptFragment,
      pick: S.pickFragment,
    })) this.progs[name] = compile(gl, fullscreenVertex, code, `erosion/${name}`);
    this.progs.splat = compile(gl, S.splatVertex, S.splatFragment, "erosion/splat");
    this.progs.grains = compile(gl, grainVertex, grainFragment, "erosion/grains");
    this.target([this.volumes[0]], WIDTH, HEIGHT);
    this.target([this.positions[0], this.velocities[0], this.metas[0], this.impacts], ...PARTICLE_SIZE);
    this.target([this.requests], WIDTH, HEIGHT);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  get material() { return this.materials[this.materialIdx]; }
  get volume() { return this.volumes[this.volumeIdx]; }
  makeTex(w, h, fmt) {
    const gl = this.gl, t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texStorage2D(gl.TEXTURE_2D, 1, fmt || this.texFmt, w, h);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }
  uploadTex(tex, w, h, data) {
    const gl = this.gl; gl.bindTexture(gl.TEXTURE_2D, tex); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, w, h, gl.RGBA, gl.FLOAT, data);
  }
  upload(data) {
    const a = new Float32Array(WIDTH * HEIGHT * 4);
    let mass = 0;
    for (let z = 0; z < SIZE[2]; z++) for (let y = 0; y < SIZE[1]; y++) {
      const src = (z * SIZE[1] + y) * SIZE[0] * 4;
      const dst = ((Math.floor(z / 16) * SIZE[1] + y) * WIDTH + (z % 16) * SIZE[0]) * 4;
      a.set(data.subarray(src, src + SIZE[0] * 4), dst);
    }
    this.volumeIdx = 0;
    this.uploadTex(this.volume, WIDTH, HEIGHT, a);
    const empty = new Float32Array(PARTICLE_SIZE[0] * PARTICLE_SIZE[1] * 4);
    const p = empty.slice(); for (let i = 3; i < p.length; i += 4) p[i] = -1;
    for (let i = 0; i < 2; i++) {
      this.uploadTex(this.positions[i], ...PARTICLE_SIZE, p);
      this.uploadTex(this.velocities[i], ...PARTICLE_SIZE, empty);
      this.uploadTex(this.cargos[i], ...PARTICLE_SIZE, empty);
      this.uploadTex(this.metas[i], ...PARTICLE_SIZE, empty);
      this.uploadTex(this.species[i], ...PARTICLE_SIZE, empty);
      this.target([this.materials[i]], WIDTH, HEIGHT);
      this.gl.clearColor(0, 0, 0, 0); this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    }
    this.uploadTex(this.contacts, ...PARTICLE_SIZE, empty);
    this.uploadTex(this.exchanges, ...PARTICLE_SIZE, empty);
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    this.materialIdx = 0; this.tick = 0; this.motionIdx = 0; this.cargoIdx = 0;
    this.initialMass = mass; this.sculpted = false;
    this.ledger = { eroded: 0, deposited: 0, carried: 0, retired: 0 };
  }
  target(textures, w, h) {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    for (let i = 0; i < 4; i++) gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, textures[i] || null, 0);
    gl.drawBuffers(textures.map((_, i) => gl.COLOR_ATTACHMENT0 + i));
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error("FBO incomplete");
    gl.viewport(0, 0, w, h);
    gl.bindVertexArray(this.vao);
    gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE); gl.disable(gl.SCISSOR_TEST); gl.disable(gl.BLEND);
  }
  use(prog, texs = {}, vals = {}) {
    const gl = this.gl; gl.useProgram(prog.handle);
    let unit = 0;
    for (const [name, t] of Object.entries(texs)) {
      const l = uniLoc(gl, prog, name); if (l === null) continue;
      gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t); gl.uniform1i(l, unit++);
    }
    for (const [name, v] of Object.entries(vals)) {
      const l = uniLoc(gl, prog, name); if (l === null) continue;
      if (typeof v === "number") gl.uniform1f(l, v);
      else if (v.length === 3) gl.uniform3fv(l, v);
      else gl.uniform4fv(l, v);
    }
  }
  pass(name, targets, w, h, texs, vals = {}) {
    this.target(targets, w, h);
    this.use(this.progs[name], texs, vals);
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 3);
  }
  uniformValues(params) {
    return {
      physics: [0.04 * (params.speed ?? 1), params.rainfall, params.restitution ?? 0.08, params.wind],
      process: [params.erosion, params.hardness, params.deposition, params.capacity],
      config: [params.footprint, params.grainSize, this.activeCount, params.sourceMode || 0],
      canyonShape: [params.canyonWidth, params.canyonMeander, params.canyonFlare, 0],
      river: [params.riverSpeed, params.riverWidth, params.riverDepth, params.riverOffset || 0],
      windField: [params.windSpeed, params.windHeight, params.windSpread, (params.windDirection ?? 0) * Math.PI / 180],
      weather: [params.agentDiameter ?? 5, params.chemicalRate ?? 0.45, params.solubility ?? 0.6, params.riverEnabled === false ? 0 : 1],
      environment: [params.waterLevel, params.strata, params.seed, this.tick],
      extra: [params.thermal ?? 0.35, params.stability ?? 0.5, 0, 0],
    };
  }
  advance(params) {
    const gl = this.gl;
    this.activeCount = params.particleCount || 1024;
    const vals = this.uniformValues(params);
    const prevPos = this.positions[this.motionIdx], prevVel = this.velocities[this.motionIdx], oldCargo = this.cargos[this.cargoIdx], oldVol = this.volume, oldMat = this.material, oldSpecies = this.species[this.cargoIdx];
    const motion = 1 - this.motionIdx, nextCargo = 1 - this.cargoIdx, nextVol = 1 - this.volumeIdx, nextMat = 1 - this.materialIdx;

    // 1) motion: integrate particles, collide with the SDF
    this.pass("motion", [this.positions[motion], this.velocities[motion], this.metas[motion], this.impacts], ...PARTICLE_SIZE, {
      terrain: oldVol, positions: prevPos, velocities: prevVel, cargo: oldCargo, metadata: this.metas[this.motionIdx], species: oldSpecies,
    }, vals);

    // 2) event: contacts + bounded demands (the anti-runaway controller)
    this.pass("event", [this.contacts, this.exchanges, this.normals], ...PARTICLE_SIZE, {
      terrain: oldVol, positions: this.positions[motion], velocities: this.velocities[motion], cargo: oldCargo, metadata: this.metas[motion], species: oldSpecies, impacts: this.impacts, materials: oldMat,
    }, vals);

    // 3) splat: scatter demands additively into the atlas
    this.target([this.requests, this.speciesReq], WIDTH, HEIGHT);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    this.use(this.progs.splat, {
      terrain: oldVol, contacts: this.contacts, exchanges: this.exchanges, normalsTex: this.normals, species: oldSpecies,
    }, { environment: vals.environment, waterLevel: params.waterLevel });
    gl.enable(gl.BLEND); gl.blendEquation(gl.FUNC_ADD); gl.blendFunc(gl.ONE, gl.ONE);
    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, this.activeCount * SPLAT_SLICES);
    gl.disable(gl.BLEND);

    // 4) apply: materialize with per-voxel caps + armor accumulation
    this.pass("apply", [this.volumes[nextVol], this.accept, this.materials[nextMat]], WIDTH, HEIGHT, {
      terrain: oldVol, requests: this.requests, materials: oldMat, speciesRequests: this.speciesReq,
    });

    // 5) cargo: settle accepted amounts into particle sediment
    this.pass("cargo", [this.cargos[nextCargo], this.species[nextCargo]], ...PARTICLE_SIZE, {
      terrain: oldVol, contacts: this.contacts, exchanges: this.exchanges, acceptance: this.accept, positions: this.positions[motion], previousPositions: prevPos, cargo: oldCargo, metadata: this.metas[motion], species: oldSpecies, impacts: this.impacts, materials: oldMat, normalsTex: this.normals,
    }, vals);

    // 6) redistancing ×2 (alternating sweeps) — keeps the SDF valid & crisp
    this.pass("distance", [this.volumes[this.volumeIdx]], WIDTH, HEIGHT, { terrain: this.volumes[nextVol] }, { sweepSign: 0 });
    this.pass("distance", [this.volumes[nextVol]], WIDTH, HEIGHT, { terrain: this.volumes[this.volumeIdx] }, { sweepSign: 1 });
    this.volumeIdx = nextVol;
    this.pass("clamp", [this.volumes[1 - this.volumeIdx]], WIDTH, HEIGHT, { terrain: this.volumes[this.volumeIdx] });
    this.volumeIdx = 1 - this.volumeIdx;

    // 7) thermal talus every 3rd tick (mass-conserving column slump)
    if (this.tick % 3 === 0 && (params.thermal ?? 0) > 0) {
      const nv = 1 - this.volumeIdx, nm = 1 - this.materialIdx;
      this.pass("thermal", [this.volumes[nv], this.materials[nm]], WIDTH, HEIGHT, {
        terrain: this.volumes[this.volumeIdx], materials: this.materials[this.materialIdx],
      }, { thermalRate: params.thermal ?? 0.35 });
      this.volumeIdx = nv; this.materialIdx = nm;
      // re-clamp after slumping (ping-pong)
      this.pass("clamp", [this.volumes[1 - this.volumeIdx]], WIDTH, HEIGHT, { terrain: this.volumes[this.volumeIdx] });
      this.volumeIdx = 1 - this.volumeIdx;
    } else {
      this.materialIdx = nextMat;
    }

    this.motionIdx = motion; this.cargoIdx = nextCargo; this.tick++;
    const err = gl.getError(); if (err !== gl.NO_ERROR) throw new Error("GL error " + err);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  async complete() {
    const gl = this.gl, sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0); gl.flush();
    await new Promise((res, rej) => {
      const poll = () => {
        const r = gl.clientWaitSync(sync, 0, 0);
        if (r === gl.WAIT_FAILED) rej(new Error("fence failed"));
        else if (r === gl.TIMEOUT_EXPIRED) setTimeout(poll, 8);
        else res();
      }; poll();
    });
    gl.deleteSync(sync);
  }
  async step(params, count = 1) { for (let i = 0; i < count; i++) this.advance(params); await this.complete(); }
  async sculpt(point, radius, tool, strength = 0.5, stampType = 0, stampMode = 0, redistances = 6) {
    const gl = this.gl;
    const other = 1 - this.volumeIdx, otherMat = 1 - this.materialIdx;
    this.pass("sculpt", [this.volumes[other], this.materials[otherMat]], WIDTH, HEIGHT, {
      terrain: this.volume, materials: this.material,
    }, {
      brush: [...point, radius],
      brushParams: [strength, stampType, stampMode, { carve: 1, build: 2, smooth: 3, flatten: 4, stamp: 5, paint: 6 }[tool] || 1],
    });
    this.volumeIdx = other; this.materialIdx = otherMat; this.sculpted = true;
    // proper sculpting: restore a valid SDF after the stroke
    for (let i = 0; i < redistances; i++) {
      this.pass("distance", [this.volumes[1 - this.volumeIdx]], WIDTH, HEIGHT, { terrain: this.volumes[this.volumeIdx] }, { sweepSign: i % 2 });
      this.volumeIdx = 1 - this.volumeIdx;
    }
    this.pass("clamp", [this.volumes[1 - this.volumeIdx]], WIDTH, HEIGHT, { terrain: this.volumes[this.volumeIdx] });
    this.volumeIdx = 1 - this.volumeIdx;
    this.materialIdx = otherMat;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    await this.complete();
  }
  read(tex, w, h) {
    const gl = this.gl; this.target([tex], w, h); gl.readBuffer(gl.COLOR_ATTACHMENT0); const a = new Float32Array(w * h * 4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.FLOAT, a); gl.bindFramebuffer(gl.FRAMEBUFFER, null); return a;
  }
  async pick(origin, dir) {
    this.pass("pick", [this.pickTarget], 1, 1, { terrain: this.volume }, { origin, direction: dir }); await this.complete();
    const p = this.read(this.pickTarget, 1, 1); return p[3] > 0.5 ? Array.from(p.slice(0, 3)) : null;
  }
  async readVolume() {
    await this.complete();
    const atlas = this.read(this.volume, WIDTH, HEIGHT), a = new Float32Array(SIZE[0] * SIZE[1] * SIZE[2] * 4);
    for (let z = 0; z < SIZE[2]; z++) for (let y = 0; y < SIZE[1]; y++) {
      const src = ((Math.floor(z / 16) * SIZE[1] + y) * WIDTH + (z % 16) * SIZE[0]) * 4;
      const dst = (z * SIZE[1] + y) * SIZE[0] * 4;
      a.set(atlas.subarray(src, src + SIZE[0] * 4), dst);
    }
    return a;
  }
  drawGrains(uniforms, plumes = false) {
    const gl = this.gl; gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, gl.canvas.width, gl.canvas.height); gl.bindVertexArray(this.vao);
    this.use(this.progs.grains, {
      terrain: this.volume, positions: this.positions[this.motionIdx], cargo: this.cargos[this.cargoIdx], exchanges: this.exchanges, metadata: this.metas[this.motionIdx], species: this.species[this.cargoIdx],
    }, { eye: uniforms.subarray(0, 4), target: uniforms.subarray(4, 8), activeCount: this.activeCount, visualMode: plumes ? 1 : 0, waterLevel: uniforms[14] });
    gl.enable(gl.BLEND); gl.blendEquation(gl.FUNC_ADD); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.drawArrays(gl.POINTS, 0, this.activeCount); gl.disable(gl.BLEND);
  }
}

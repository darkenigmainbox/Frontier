// Frontier — renderer facade: WebGL2 raymarch + GPU erosion pipeline.
//
// Three tiers, chosen at init:
//   1. GPU (RGBA32F): EXT_color_buffer_float — full hybrid pipeline.
//   2. GPU (RGBA16F): EXT_color_buffer_half_float only — same pipeline, half
//      precision volumes (slightly softer SDF precision, same physics).
//   3. CPU mirror: no renderable float format — the volume is uploaded as a
//      *sampling* texture (core WebGL2, no extension needed) so the raymarch
//      view still works; sculpt + erosion run on the validated CPU solver.

import { GPUErosion } from "./gl/gpu.js";
import { vertexGLSL, fragmentGLSL } from "./gl/render-shaders.js";
import { SIZE, MIN, MAX, CELL, ATLAS, VOXEL_VOLUME } from "./core/constants.js";
import { Volume } from "./core/field.js";
import { sculptDab, redistanceVolume } from "./core/sculpt.js";
import { Solver } from "./core/solver.js";

const TOOL_ID = { carve: 1, build: 2, smooth: 3, flatten: 4, stamp: 5, paint: 6 };

export class Renderer {
  constructor(canvas, onError) {
    this.canvas = canvas;
    this.onError = onError;
    this.showParticles = true;
    this.showSediment = true;
    this.gpu = false;
    this.cpuMode = false;
  }
  async init(volume) {
    const gl = this.canvas.getContext("webgl2", { antialias: false, alpha: false, powerPreference: "high-performance", preserveDrawingBuffer: true });
    if (!gl) throw new Error("WebGL2 unavailable");
    this.gl = gl;
    try {
      this.erosion = new GPUErosion(gl);
      this.gpu = true;
    } catch (e) {
      console.warn("GPU render-to-float unavailable — CPU mirror mode", e);
      this.cpuMode = true;
      this.erosionError = e.message;
      this.cpuVolTex = this.sampleTex(ATLAS[0], ATLAS[1]);
      this.cpuMatTex = this.sampleTex(ATLAS[0], ATLAS[1]);
    }
    const vs = gl.createShader(gl.VERTEX_SHADER); gl.shaderSource(vs, vertexGLSL); gl.compileShader(vs);
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(vs));
    const fs = gl.createShader(gl.FRAGMENT_SHADER); gl.shaderSource(fs, fragmentGLSL()); gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(fs));
    const prog = gl.createProgram(); gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    this.prog = prog;
    gl.useProgram(prog);
    this.locs = ["eye", "target", "viewport", "light", "surface", "brush", "extra"].map(n => gl.getUniformLocation(prog, n));
    gl.uniform1f(gl.getUniformLocation(prog, "terrainShown"), 1); // float uniform (was uniform1i → GL_INVALID_OPERATION)
    gl.uniform1i(gl.getUniformLocation(prog, "materialAtlas"), 1);
    gl.bindVertexArray(gl.createVertexArray());
    this.upload(volume);
  }
  sampleTex(w, h) {
    const gl = this.gl, t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA32F, w, h); // sampling float textures is core WebGL2
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }
  // atlas dims are live — they follow the active resolution tier
  atlasDims() { return [ATLAS[0], ATLAS[1]]; }
  vol() {
    if (!this._vol) this._vol = new Volume(SIZE.slice(), MIN.slice(), MAX.slice());
    this._vol.data = this.data;
    return this._vol;
  }
  // pack the linear volume into the 16-slices-per-row atlas (GPU layout) + a
  // simple material layer (loose sediment species in R)
  packCPU() {
    const gl = this.gl, d = this.data;
    const [AW, AH] = this.atlasDims();
    const a = new Float32Array(AW * AH * 4);
    for (let z = 0; z < SIZE[2]; z++) for (let y = 0; y < SIZE[1]; y++) {
      const src = (z * SIZE[1] + y) * SIZE[0] * 4;
      const dst = ((Math.floor(z / 16) * SIZE[1] + y) * AW + (z % 16) * SIZE[0]) * 4;
      a.set(d.subarray(src, src + SIZE[0] * 4), dst);
    }
    const m = new Float32Array(AW * AH * 4);
    for (let i = 0; i < a.length; i += 4) { m[i] = a[i + 2]; m[i + 3] = 1; }
    gl.bindTexture(gl.TEXTURE_2D, this.cpuVolTex); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, AW, AH, gl.RGBA, gl.FLOAT, a);
    gl.bindTexture(gl.TEXTURE_2D, this.cpuMatTex); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, AW, AH, gl.RGBA, gl.FLOAT, m);
  }
  upload(vol) {
    this.data = vol;
    this._vol = null; this.solver = null;
    if (this.gpu) { this.erosion.upload(vol); return; }
    if (this.cpuMode) this.packCPU();
  }
  get canStep() { return this.gpu || this.cpuMode; }
  draw(uniforms) {
    if (!this.gpu && !this.cpuMode) return;
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.useProgram(this.prog);
    gl.disable(gl.BLEND); gl.disable(gl.DEPTH_TEST);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.gpu ? this.erosion.volume : this.cpuVolTex);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.gpu ? this.erosion.material : this.cpuMatTex);
    for (let i = 0; i < 7; i++) gl.uniform4fv(this.locs[i], uniforms.subarray(i * 4, i * 4 + 4));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (this.gpu) {
      if (this.showSediment) this.erosion.drawGrains(uniforms, true);
      if (this.showParticles) this.erosion.drawGrains(uniforms, false);
    }
  }
  async step(params, count) {
    if (this.gpu) return this.erosion.step(params, count);
    if (!this.cpuMode) throw new Error(this.erosionError || "no backend");
    if (!this.solver) this.solver = new Solver(this.vol(), params);
    for (let i = 0; i < count; i++) this.solver.step();
    this.packCPU(); // volume mutated in place — refresh the view texture
  }
  async sculpt(point, radius, tool, strength = 0.5, stampType = 0, stampMode = 0, redistances = 6) {
    if (this.gpu) return this.erosion.sculpt(point, radius, tool, strength, stampType, stampMode, redistances);
    if (!this.cpuMode) throw new Error("sculpt needs gpu");
    const t = typeof tool === "number" ? tool : (TOOL_ID[tool] || 1);
    const mode = stampMode === 1 || stampMode === "carve" ? "carve" : "union";
    sculptDab(this.vol(), point, radius, t, strength, stampType, mode);
    redistanceVolume(this.vol(), redistances);
    this.packCPU();
  }
  async pick(o, d) {
    if (this.gpu) return this.erosion.pick(o, d);
    if (!this.cpuMode || !this.data) return null;
    // CPU sphere-trace against the trilinearly sampled SDF (R channel)
    const s = this.sampleSDF.bind(this);
    let t = 0;
    for (let i = 0; i < 256; i++) {
      const x = o[0] + d[0] * t, y = o[1] + d[1] * t, z = o[2] + d[2] * t;
      if (t > 160) return null;
      const d0 = s(x, y, z);
      if (d0 < 0.05) return [x, y, z];
      t += Math.max(0.1, d0 * 0.9);
    }
    return null;
  }
  sampleSDF(x, y, z) {
    const d = this.data, [nx, ny] = SIZE;
    const gx = (x - MIN[0]) / CELL[0] - 0.5, gy = (y - MIN[1]) / CELL[1] - 0.5, gz = (z - MIN[2]) / CELL[2] - 0.5;
    const inside = gx >= 0 && gy >= 0 && gz >= 0 && gx <= nx - 1 && gy <= ny - 1 && gz <= SIZE[2] - 1;
    if (!inside) return 5; // treat outside as empty air — rays pass through
    const x0 = Math.min(nx - 2, Math.floor(gx)), y0 = Math.min(ny - 2, Math.floor(gy)), z0 = Math.min(SIZE[2] - 2, Math.floor(gz));
    const fx = gx - x0, fy = gy - y0, fz = gz - z0, S = nx * 4;
    const at = (i, j, k) => d[((z0 + k) * ny + (y0 + j)) * S + (x0 + i) * 4];
    const l = (a, b, u) => a + (b - a) * u;
    return l(l(l(at(0, 0, 0), at(1, 0, 0), fx), l(at(0, 1, 0), at(1, 1, 0), fx), fy),
             l(l(at(0, 0, 1), at(1, 0, 1), fx), l(at(0, 1, 1), at(1, 1, 1), fx), fy), fz);
  }
  async readVolume() { return this.data.slice(); }
  async auditErosion() {
    const e = this.erosion;
    if (this.gpu) {
      const load = e.read(e.cargos[e.cargoIdx], ...[64, 32]);
      const pos = e.read(e.positions[e.motionIdx], ...[64, 32]);
      let carried = 0, retired = 0, active = 0;
      for (let i = 0; i < load.length; i += 4) {
        carried += load[i]; retired += load[i + 3];
        if (i / 4 < e.activeCount && pos[i + 3] >= 0) active++;
      }
      const vol = await e.readVolume();
      let solid = 0;
      for (let i = 3; i < vol.length; i += 4) solid += vol[i] * VOXEL_VOLUME;
      return { active, carried, retired, solid, steps: e.tick, sculpted: e.sculpted };
    }
    // CPU mirror ledger
    let carried = 0, active = 0, solid = 0;
    if (this.solver) {
      const s = this.solver;
      for (let i = 0; i < s.N; i++) {
        carried += s.cargo[i * 4];
        if (s.pos[i * 4 + 3] >= 0) active++;
      }
    }
    for (let i = 3; i < this.data.length; i += 4) solid += this.data[i] * VOXEL_VOLUME;
    const L = this.solver ? this.solver.ledger : { eroded: 0, deposited: 0, retired: 0 };
    return { active, carried: carried * VOXEL_VOLUME, retired: L.retired, solid, steps: this.solver ? this.solver.tick : 0, sculpted: this.sculpted || false };
  }

  // Release all GL resources before a tier switch (the renderer is rebuilt).
  dispose() {
    const gl = this.gl;
    if (!gl) return;
    try {
      if (this.gpu && this.erosion?.dispose) this.erosion.dispose();
      if (this.prog) gl.deleteProgram(this.prog);
      if (this.cpuVolTex) gl.deleteTexture(this.cpuVolTex);
      if (this.cpuMatTex) gl.deleteTexture(this.cpuMatTex);
    } catch { /* context may already be lost */ }
    this.gpu = false; this.cpuMode = false;
  }
}
export async function createRenderer(canvas, data, onError) {
  const r = new Renderer(canvas, onError);
  await r.init(data);
  return r;
}

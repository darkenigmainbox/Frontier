// Frontier — renderer facade: WebGL2 raymarch + GPU erosion pipeline.

import { GPUErosion } from "./gl/gpu.js";
import { vertexGLSL, fragmentGLSL } from "./gl/render-shaders.js";
import { SIZE, VOXEL_VOLUME } from "./core/constants.js";

export class Renderer {
  constructor(canvas, onError) {
    this.canvas = canvas;
    this.onError = onError;
    this.showParticles = true;
    this.showSediment = true;
  }
  async init(volume) {
    const gl = this.canvas.getContext("webgl2", { antialias: false, alpha: false, powerPreference: "high-performance", preserveDrawingBuffer: true });
    if (!gl) throw new Error("WebGL2 unavailable");
    this.gl = gl;
    try {
      this.erosion = new GPUErosion(gl);
      this.gpu = true;
    } catch (e) {
      console.warn("GPU erosion unavailable", e);
      this.gpu = false;
      this.erosionError = e.message;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.disable(gl.BLEND);
    }
    const vs = gl.createShader(gl.VERTEX_SHADER); gl.shaderSource(vs, vertexGLSL); gl.compileShader(vs);
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(vs));
    const fs = gl.createShader(gl.FRAGMENT_SHADER); gl.shaderSource(fs, fragmentGLSL); gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(fs));
    const prog = gl.createProgram(); gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    this.prog = prog;
    gl.useProgram(prog);
    this.locs = ["eye", "target", "viewport", "light", "surface", "brush", "extra"].map(n => gl.getUniformLocation(prog, n));
    gl.uniform1i(gl.getUniformLocation(prog, "terrainShown"), 1);
    gl.bindVertexArray(gl.createVertexArray());
    this.upload(volume);
  }
  upload(vol) {
    this.data = vol;
    if (this.gpu) { this.erosion.upload(vol); return; }
    throw new Error("GPU pipeline required (EXT_color_buffer_float)");
  }
  draw(uniforms) {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.useProgram(this.prog);
    gl.disable(gl.BLEND); gl.disable(gl.DEPTH_TEST);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.erosion.volume);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.erosion.material);
    gl.uniform1i(gl.getUniformLocation(this.prog, "materialAtlas"), 1);
    for (let i = 0; i < 7; i++) gl.uniform4fv(this.locs[i], uniforms.subarray(i * 4, i * 4 + 4));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (this.showSediment) this.erosion.drawGrains(uniforms, true);
    if (this.showParticles) this.erosion.drawGrains(uniforms, false);
  }
  async step(params, count) { if (!this.gpu) throw new Error(this.erosionError || "no gpu"); return this.erosion.step(params, count); }
  async sculpt(point, radius, tool, strength, stampType, stampMode) { if (this.gpu) return this.erosion.sculpt(point, radius, tool, strength, stampType, stampMode); throw new Error("sculpt needs gpu"); }
  async pick(o, d) { if (this.gpu) return this.erosion.pick(o, d); return null; }
  async readVolume() { if (this.gpu) return this.erosion.readVolume(); return this.data.slice(); }
  async auditErosion() {
    if (!this.gpu) throw new Error(this.erosionError);
    const e = this.erosion;
    const load = e.read(e.cargos[e.cargoIdx], ...PARTICLE());
    const pos = e.read(e.positions[e.motionIdx], ...PARTICLE());
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
}
function PARTICLE() { return [64, 32]; } // 64x32 particle atlas

export async function createRenderer(canvas, volume, onError) {
  const r = new Renderer(canvas, onError);
  await r.init(volume);
  return r;
}

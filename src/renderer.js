import { GPUErosion } from "./gpu-erosion.js";
import { vertexGLSL, fragmentGLSL } from "./shaders.js";

export class Renderer{
  constructor(canvas, onError){
    this.canvas=canvas;
    this.onError=onError;
    this.showParticles=true;
    this.showSediment=true;
  }
  async init(volume){
    const gl=this.canvas.getContext("webgl2",{antialias:false,alpha:false,powerPreference:"high-performance",preserveDrawingBuffer:true});
    if(!gl) throw new Error("WebGL2 unavailable");
    this.gl=gl;
    const floatLinear=gl.getExtension("OES_texture_float_linear");
    try{
      this.erosion=new GPUErosion(gl);
      this.gpu=true;
    }catch(e){
      console.warn("GPU erosion fail",e);
      this.gpu=false;
      this.erosionError=e.message;
      gl.bindFramebuffer(gl.FRAMEBUFFER,null);
      gl.disable(gl.BLEND);
    }
    const vs=gl.createShader(gl.VERTEX_SHADER); gl.shaderSource(vs,vertexGLSL); gl.compileShader(vs);
    if(!gl.getShaderParameter(vs,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(vs));
    const fs=gl.createShader(gl.FRAGMENT_SHADER); gl.shaderSource(fs,fragmentGLSL); gl.compileShader(fs);
    if(!gl.getShaderParameter(fs,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(fs));
    const prog=gl.createProgram(); gl.attachShader(prog,vs); gl.attachShader(prog,fs); gl.linkProgram(prog);
    if(!gl.getProgramParameter(prog,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    this.prog=prog;
    gl.useProgram(prog);
    this.locs=["eye","target","viewport","light","surface","brush","extra","terrainShown"].map(n=>gl.getUniformLocation(prog,n));
    this.volTex=gl.createTexture();
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_3D,this.volTex);
    gl.texParameteri(gl.TEXTURE_3D,gl.TEXTURE_MIN_FILTER,floatLinear?gl.LINEAR:gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_3D,gl.TEXTURE_MAG_FILTER,floatLinear?gl.LINEAR:gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_3D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_3D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_3D,gl.TEXTURE_WRAP_R,gl.CLAMP_TO_EDGE);
    gl.uniform1i(gl.getUniformLocation(prog,"volume"),0);
    gl.bindVertexArray(gl.createVertexArray());
    this.upload(volume);
  }
  upload(vol){
    this.data=vol;
    if(this.gpu){ this.erosion.upload(vol); return; }
    const gl=this.gl;
    gl.bindTexture(gl.TEXTURE_3D,this.volTex);
    gl.texImage3D(gl.TEXTURE_3D,0,gl.RGBA32F,112,72,112,0,gl.RGBA,gl.FLOAT,vol);
  }
  draw(uniforms){
    const gl=this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    gl.viewport(0,0,this.canvas.width,this.canvas.height);
    gl.useProgram(this.prog);
    gl.disable(gl.BLEND); gl.disable(gl.DEPTH_TEST);
    if(this.gpu){
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.erosion.volume);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.erosion.material);
      gl.uniform1i(gl.getUniformLocation(this.prog,"materialAtlas"),1);
    } else {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_3D,this.volTex);
    }
    for(let i=0;i<7;i++) gl.uniform4fv(this.locs[i], uniforms.subarray(i*4,i*4+4));
    gl.uniform1f(gl.getUniformLocation(this.prog,"terrainShown"),1);
    gl.drawArrays(gl.TRIANGLES,0,3);
    if(this.gpu){
      if(this.showSediment) this.erosion.drawGrains(uniforms,true);
      if(this.showParticles) this.erosion.drawGrains(uniforms,false);
    }
  }
  async step(params,count){ if(!this.gpu) throw new Error(this.erosionError||"no gpu"); return this.erosion.step(params,count); }
  async sculpt(point,radius,tool,params){ if(this.gpu) return this.erosion.sculpt(point,radius,tool,params); throw new Error("sculpt needs gpu"); }
  async pick(o,d){ if(this.gpu) return this.erosion.pick(o,d); return null; }
  async readVolume(){ if(this.gpu) return this.erosion.readVolume(); return this.data.slice(); }
  async auditErosion(){ if(!this.gpu) throw new Error(this.erosionError); return this.erosion.audit(); }
}
export async function createRenderer(canvas, volume, onError, uniforms, settings){
  const r=new Renderer(canvas,onError);
  canvas.width=192; canvas.height=128;
  await r.init(volume);
  r.settings=settings;
  // quick check frame
  try{ r.draw(uniforms); }catch(e){ console.error(e); }
  return r;
}

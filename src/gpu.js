import { cascade, gather, render, blit, probeOverlay } from './shaders.js';
import { triangleData, emitterTriangleData, lightData, objects, cameraState, settings, sceneVersion } from './scene.js';
import { TriangleBVH } from './bvh.js';
export class GPURenderer {
 async init(canvas){
  if(!navigator.gpu)throw new Error('WebGPU is not available in this browser.');
  const adapter=await navigator.gpu.requestAdapter({powerPreference:'high-performance'});if(!adapter)throw new Error('No WebGPU adapter found.');
  this.timestamp=adapter.features.has('timestamp-query');
  this.device=await adapter.requestDevice({requiredFeatures:this.timestamp?['timestamp-query']:[]});const d=this.device;
  this.canvas=canvas;this.context=canvas.getContext('webgpu');this.format=navigator.gpu.getPreferredCanvasFormat();this.context.configure({device:d,format:this.format,alphaMode:'opaque'});
  this.adapterInfo=Object.fromEntries(['vendor','architecture','device','description'].map(k=>[k,adapter.info?.[k]||'']));
  this.name=adapter.info?.description||adapter.info?.architecture||adapter.info?.device||'WebGPU device';
  this.allocations=[];
  const buffer=(size,usage)=>{const b=d.createBuffer({size,usage});this.allocations.push(b);return b;};
  this.buffer=buffer;this.bvh=new TriangleBVH();
  this.uniform=buffer(144,GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST);
  this.sceneBuffers={};
  this.ensureSceneBuffer('triangles',80);this.ensureSceneBuffer('nodes',48);this.ensureSceneBuffer('emitterTriangles',48);this.ensureSceneBuffer('emitters',64);
  this.fields=[13824,6912,4608,5184].map(n=>buffer(n*16,GPUBufferUsage.STORAGE));
  this.levels=[0,1,2].map(i=>{const b=buffer(16,GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST);d.queue.writeBuffer(b,0,new Uint32Array([i,0,0,0]));return b;});
  const compute=async(code,label)=>{const m=d.createShaderModule({code,label});const info=await m.getCompilationInfo();const errors=info.messages.filter(m=>m.type==='error');if(errors.length)throw new Error(errors.map(m=>`${label}:${m.lineNum}: ${m.message}`).join('\n'));return d.createComputePipelineAsync({label,layout:'auto',compute:{module:m,entryPoint:'main'}});};
  this.cp=await compute(cascade,'Radiance cascade');this.gp=await compute(gather,'Irradiance gather');this.rp=await compute(render,'Scene shading');
  // Auto layouts omit globals unused by a shader entry point.
  this.gbg=d.createBindGroup({layout:this.gp.getBindGroupLayout(0),entries:[{binding:2,resource:{buffer:this.fields[0]}},{binding:5,resource:{buffer:this.fields[3]}}]});
  const mod=d.createShaderModule({code:blit});this.bp=d.createRenderPipeline({layout:'auto',vertex:{module:mod,entryPoint:'vs'},fragment:{module:mod,entryPoint:'fs',targets:[{format:this.format}]},primitive:{topology:'triangle-list'}});
  const pm=d.createShaderModule({code:probeOverlay,label:'Probe overlay'});
  this.pp=d.createRenderPipeline({layout:'auto',vertex:{module:pm,entryPoint:'vs'},fragment:{module:pm,entryPoint:'fs',targets:[{format:this.format,blend:{color:{srcFactor:'src-alpha',dstFactor:'one-minus-src-alpha'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha'}}}]},primitive:{topology:'triangle-list'}});
  this.pbg=d.createBindGroup({layout:this.pp.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:this.uniform}},...this.fields.slice(0,3).map((buffer,i)=>({binding:i+1,resource:{buffer}}))]});
  this.sampler=d.createSampler({magFilter:'linear',minFilter:'linear'});
  if(this.timestamp){this.queries=d.createQuerySet({type:'timestamp',count:6});this.queryBuffer=buffer(48,GPUBufferUsage.QUERY_RESOLVE|GPUBufferUsage.COPY_SRC);this.readBuffer=buffer(48,GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ);}
  this.gpuMs=null;this.pending=false;
  d.lost.then(info=>this.onError?.(new Error(`GPU device lost: ${info.message}`)));
  d.addEventListener('uncapturederror',e=>{console.error(e.error);this.onError?.(e.error);});
  this.rebindScene();this.resize();return this;
 }
 ensureSceneBuffer(name,size){
  const previous=this.sceneBuffers[name];if(previous&&previous.size>=size)return false;
  const capacity=Math.max(256,2**Math.ceil(Math.log2(Math.max(size,1))));
  if(previous){previous.destroy();this.allocations.splice(this.allocations.indexOf(previous),1);}
  this.sceneBuffers[name]=this.buffer(capacity,GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST);return true;
 }
 sceneEntries(){return [{binding:0,resource:{buffer:this.uniform}},{binding:1,resource:{buffer:this.sceneBuffers.triangles}},...this.fields.map((buffer,i)=>({binding:i+2,resource:{buffer}})),...['nodes','emitterTriangles','emitters'].map((key,i)=>({binding:i+7,resource:{buffer:this.sceneBuffers[key]}}))];}
 rebindScene(){
  const entries=this.sceneEntries();this.cbg=this.levels.map(buffer=>this.device.createBindGroup({layout:this.cp.getBindGroupLayout(0),entries:[...entries.filter(e=>e.binding!==5),{binding:6,resource:{buffer}}]}));
  if(this.texture)this.bindOutput();
 }
 bindOutput(){this.rbg=this.device.createBindGroup({layout:this.rp.getBindGroupLayout(0),entries:[...this.sceneEntries(),{binding:6,resource:this.texture.createView()}]});}
 get memory(){const buffers=this.allocations.reduce((sum,b)=>sum+b.size,0);const textures=this.canvas.width*this.canvas.height*4;return {buffers,textures,total:buffers+textures+(this.captureBytes||0)};}
 resize(){
  const w=Math.max(1,Math.floor(this.canvas.clientWidth* Math.min(devicePixelRatio,1.5)*settings.resolution)),h=Math.max(1,Math.floor(this.canvas.clientHeight*Math.min(devicePixelRatio,1.5)*settings.resolution));
  if(w===this.canvas.width&&h===this.canvas.height&&this.texture)return;
  this.canvas.width=w;this.canvas.height=h;this.texture?.destroy();this.texture=this.device.createTexture({size:[w,h],format:'rgba8unorm',usage:GPUTextureUsage.STORAGE_BINDING|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_SRC});
  this.bindOutput();
  this.bbg=this.device.createBindGroup({layout:this.bp.getBindGroupLayout(0),entries:[{binding:0,resource:this.texture.createView()},{binding:1,resource:this.sampler}]});
 }
 render(){
  const cpuStart=performance.now();this.resize();const d=this.device;const cam=cameraState(this.canvas.width/this.canvas.height);const raw=triangleData();
  let tris=raw;this.bvhMs=0;this.nodeCount=0;
  if(settings.bvh){
   const start=performance.now();
   if(this.sceneVersion!==sceneVersion){this.bvh.build(raw);this.sceneVersion=sceneVersion;}else this.bvh.refit(raw);
   tris=this.bvh.triangles;this.nodeCount=this.bvh.nodes.length;this.bvhMs=performance.now()-start;
  }
  const lights=lightData(),emitterTriangles=emitterTriangleData();this.triangleCount=tris.length/20;this.meshCount=objects.length;
  const payloads={triangles:tris,emitterTriangles,emitters:lights};
  // BVH OFF is a real baseline: no build, refit, reordering, or node upload.
  // Retain its allocation so re-enabling doesn't cause allocation churn.
  if(settings.bvh)payloads.nodes=this.bvh.data;
  let changed=false;
  for(const [key,data] of Object.entries(payloads)){changed=this.ensureSceneBuffer(key,data.byteLength)||changed;d.queue.writeBuffer(this.sceneBuffers[key],0,data);}
  if(changed)this.rebindScene();
  const data=new Float32Array([...cam.eye,0,...cam.forward,0,...cam.right,0,...cam.up,0,
   this.canvas.width,this.canvas.height,this.triangleCount,settings.time,
   settings.emission,settings.bounce,lights.length/8,settings.bvh?1:0,
   settings.gi?1:0,settings.view,settings.probes?1:0,settings.wireframe?1:0,
   this.meshCount,this.nodeCount,settings.shadowSamples,settings.probeVisibility?1:0,
   settings.probeLevel,settings.probeMode,settings.reflections?1:0,settings.emitterSize]);
  d.queue.writeBuffer(this.uniform,0,data);this.cpuMs=performance.now()-cpuStart;
  const e=d.createCommandEncoder();const measure=this.timestamp&&!this.pending;const frameId=this.frameId=(this.frameId||0)+1;
  const p=e.beginComputePass(measure?{timestampWrites:{querySet:this.queries,beginningOfPassWriteIndex:0,endOfPassWriteIndex:1}}:{});
  p.setPipeline(this.cp);
  if((settings.gi&&settings.view===0)||settings.view===2||settings.view===4||settings.probes){for(const l of [2,1,0]){p.setBindGroup(0,this.cbg[l]);p.dispatchWorkgroups(Math.ceil([13824,6912,4608][l]/64));}p.setPipeline(this.gp);p.setBindGroup(0,this.gbg);p.dispatchWorkgroups(81);}
  p.end();
  const shading=e.beginComputePass(measure?{timestampWrites:{querySet:this.queries,beginningOfPassWriteIndex:2,endOfPassWriteIndex:3}}:{});
  shading.setPipeline(this.rp);shading.setBindGroup(0,this.rbg);shading.dispatchWorkgroups(Math.ceil(this.canvas.width/8),Math.ceil(this.canvas.height/8));shading.end();
  const pass=e.beginRenderPass({...(measure?{timestampWrites:{querySet:this.queries,beginningOfPassWriteIndex:4,endOfPassWriteIndex:5}}:{}),colorAttachments:[{view:this.context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store',clearValue:{r:0,g:0,b:0,a:1}}]});pass.setPipeline(this.bp);pass.setBindGroup(0,this.bbg);pass.draw(3);if(settings.probes&&settings.view!==4){pass.setPipeline(this.pp);pass.setBindGroup(0,this.pbg);pass.draw(6,[864,108,18][settings.probeLevel]);}pass.end();
  if(measure){e.resolveQuerySet(this.queries,0,6,this.queryBuffer,0);e.copyBufferToBuffer(this.queryBuffer,0,this.readBuffer,0,48);}
  d.queue.submit([e.finish()]);
  if(measure){this.pending=true;this.timingReady=this.readBuffer.mapAsync(GPUMapMode.READ).then(()=>{const times=new BigUint64Array(this.readBuffer.getMappedRange());this.passMs={cascades:Number(times[1]-times[0])/1e6,shading:Number(times[3]-times[2])/1e6,present:Number(times[5]-times[4])/1e6};this.gpuMs=this.passMs.cascades+this.passMs.shading;this.timingFrameId=frameId;this.readBuffer.unmap();this.pending=false;}).catch(()=>{this.pending=false;});}
  return d.queue.onSubmittedWorkDone();
 }
 async capture(){
  const d=this.device,w=this.canvas.width,h=this.canvas.height;
  const stride=Math.ceil(w*4/256)*256;
  const buffer=d.createBuffer({size:stride*h,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});
  const target=d.createTexture({size:[w,h],format:this.format,usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.COPY_SRC});
  this.captureBytes=stride*h+w*h*4;
  const encoder=d.createCommandEncoder();const pass=encoder.beginRenderPass({colorAttachments:[{view:target.createView(),loadOp:'clear',storeOp:'store'}]});
  pass.setPipeline(this.bp);pass.setBindGroup(0,this.bbg);pass.draw(3);if(settings.probes&&settings.view!==4){pass.setPipeline(this.pp);pass.setBindGroup(0,this.pbg);pass.draw(6,[864,108,18][settings.probeLevel]);}pass.end();
  encoder.copyTextureToBuffer({texture:target},{buffer,bytesPerRow:stride},[w,h]);d.queue.submit([encoder.finish()]);
  await buffer.mapAsync(GPUMapMode.READ);const source=new Uint8Array(buffer.getMappedRange());const pixels=new Uint8ClampedArray(w*h*4);
  for(let y=0;y<h;y++)pixels.set(source.subarray(y*stride,y*stride+w*4),y*w*4);
  if(this.format.startsWith('bgra'))for(let i=0;i<pixels.length;i+=4){const r=pixels[i];pixels[i]=pixels[i+2];pixels[i+2]=r;}
  buffer.unmap();buffer.destroy();target.destroy();this.captureBytes=0;const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;canvas.getContext('2d').putImageData(new ImageData(pixels,w,h),0,0);
  return new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
 }
 destroy(){this.onError=null;this.device?.destroy();}
}

import {settings,updateScene} from './scene.js';
import {getProbeConfig} from './probes.js';
import {version} from '../package.json';

export function summarize(rows){
 const stats=key=>{const a=rows.map(r=>r[key]).filter(Number.isFinite).sort((a,b)=>a-b);if(!a.length)return null;return {n:a.length,median:(a[(a.length-1)>>1]+a[a.length>>1])/2,p95:a[Math.ceil(a.length*.95)-1],mean:a.reduce((x,y)=>x+y,0)/a.length};};
 return Object.fromEntries(['wallMs','cpuMs','refitMs','gpuMs','cascadeMs','shadingMs','presentMs','visibilityMs','reconstructionMs','sceneMs','encodeMs','queueMs','uploadBytes'].map(k=>[k,stats(k)]));
}

// Caller must stop its normal render loop before entering. Geometry/time/camera/
// resolution/lighting are unchanged between modes; only the accelerator differs.
export async function runBenchmark(renderer,{signal,onProgress=()=>{},warmup=2,samples=8,maxDurationMs=30000,slowFrameMs=2500}={}){
 if(settings.scene==='large'||(settings.scene==='stress'&&settings.stressCount>256))throw new Error('Brute-force safety guard: choose a smaller scene for A/B.');
 const original={...settings};const width=renderer.canvas.clientWidth,height=renderer.canvas.clientHeight;
 const report={version,createdAt:new Date().toISOString(),url:location.href,userAgent:navigator.userAgent,adapter:renderer.adapterInfo||{description:renderer.name},timestampQueries:renderer.timestamp,probeConfig:getProbeConfig(),settings:{...original,running:false},rows:[],status:'complete',reason:null,
  protocol:{order:['BVH','brute','brute','BVH'],warmupPerBlock:warmup,samplesPerBlock:samples,maxDurationMs,slowFrameMs,notes:'Frozen pose; same camera, render resolution, emitters, samples, GI, reflections and probe settings. Wall time includes transform update through completed GPU submission; excludes rAF pacing and timestamp readback wait. CPU pack/BVH excludes the preceding animation/deformation update, which is included in wall time. Modern renderer resets history and sample phase per block; BVH OFF bypasses TLAS/BLAS traversal but retains shared mesh/raster infrastructure.'}};
 const total=(warmup+samples)*4;let done=0;const start=performance.now();settings.running=false;
 const stopped=()=>signal?.aborted||document.hidden||performance.now()-start>maxDurationMs||renderer.canvas.clientWidth!==width||renderer.canvas.clientHeight!==height;
 const reason=()=>signal?.aborted?'Cancelled':document.hidden?'Tab hidden':renderer.canvas.clientWidth!==width||renderer.canvas.clientHeight!==height?'Viewport resized':'Time budget reached';
 try{
  await renderer.timingReady;
  outer:for(const bvh of [true,false,false,true]){
   settings.bvh=bvh;renderer.resetBenchmarkBlock?.();
   for(let i=0;i<warmup+samples;i++){
    if(stopped()){report.status='partial';report.reason=reason();break outer;}
    const begin=performance.now();updateScene(original.time);await renderer.render();const wallMs=performance.now()-begin;
    await renderer.timingReady;
    const timed=renderer.timestamp&&renderer.timingFrameId===renderer.frameId;
    if(i>=warmup)report.rows.push({bvh,wallMs,cpuMs:renderer.cpuMs,refitMs:renderer.bvhMs,sceneMs:renderer.sceneMs??null,encodeMs:renderer.encodeMs??null,queueMs:renderer.queueMs??null,uploadBytes:renderer.uploadBytes??null,scheduledRays:renderer.scheduledRays??null,visibilityMs:timed?renderer.passMs.visibility??null:null,reconstructionMs:timed?renderer.passMs.reconstruction??null:null,gpuMs:timed?renderer.gpuMs:null,cascadeMs:timed?renderer.passMs.cascades:null,shadingMs:timed?renderer.passMs.shading:null,presentMs:timed?renderer.passMs.present:null});
    done++;onProgress({done,total,bvh,warmup:i<warmup,wallMs});
    if(wallMs>slowFrameMs){report.status='partial';report.reason='Slow-frame safety limit reached (submitted GPU work cannot be cancelled)';break outer;}
    // Yield to paint the progress/cancel UI, without including that wait in timing.
    await new Promise(resolve=>setTimeout(resolve,0));
   }
  }
 }catch(error){report.status='error';report.reason=error.message||String(error);}
 finally{renderer.sampleFrame=null;Object.assign(settings,original);updateScene(original.time);}
 report.output={width:renderer.canvas.width,height:renderer.canvas.height,triangles:renderer.triangleCount,meshObjects:renderer.meshCount,localTriangles:renderer.localTriangleCount??null,effectiveFreshPanelSamples:renderer.acceleration&&settings.temporal?Math.min(8,settings.shadowSamples):settings.shadowSamples,effectiveFreshOrbSamples:renderer.acceleration&&settings.temporal?Math.min(8,settings.orbSamples):settings.orbSamples};
 report.summary={bvh:summarize(report.rows.filter(r=>r.bvh)),brute:summarize(report.rows.filter(r=>!r.bvh))};
 return report;
}

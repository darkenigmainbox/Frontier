// Reproducible offscreen measurement. This measures the selected browser adapter,
// not the user's GPU. Example: CHROMIUM_PATH=/tmp/chromium npm run measure
import {chromium} from '@playwright/test';
import {createServer} from 'vite';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
const revision=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const server=await createServer({server:{port:5182,host:'127.0.0.1',strictPort:true}});await server.listen();
let browser;
try{
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-unsafe-webgpu','--use-vulkan=swiftshader']});
 const page=await browser.newPage({deviceScaleFactor:1});await page.route('**/src/main.js*',r=>r.fulfill({contentType:'text/javascript',body:''}));await page.goto('http://127.0.0.1:5182');
 const result=await page.evaluate(async()=>{
  const {GPURenderer}=await import('/src/gpu.js');const {settings,makeScene,updateScene}=await import('/src/scene.js');
  Object.assign(settings,{scene:'primitives',time:74.4,resolution:1,running:false,probes:false,shadowSamples:16,gi:true,reflections:true,view:0});makeScene();
  let target;const canvas={clientWidth:160,clientHeight:100,width:160,height:100,getContext:()=>({configure:({device,format})=>target=device.createTexture({size:[160,100],format,usage:GPUTextureUsage.RENDER_ATTACHMENT}),getCurrentTexture:()=>target})};
  const r=await new GPURenderer().init(canvas);const errors=[];r.onError=e=>errors.push(e.message);const rows=[];
  // Alternate order across repeats to reduce warm-up/order bias.
  for(const bvh of [true,false,false,true]){
   settings.bvh=bvh;for(let i=0;i<2;i++){updateScene(settings.time);await r.render();await r.timingReady;}
   for(let i=0;i<5;i++){const start=performance.now();updateScene(settings.time);await r.render();const wallMs=performance.now()-start;await r.timingReady;
    rows.push({bvh,wallMs,cpuMs:r.cpuMs,refitMs:r.bvhMs,gpuMs:r.gpuMs,passes:r.passMs??null});}
  }
  const result={adapter:r.name,width:canvas.width,height:canvas.height,settings:{...settings},triangles:r.triangleCount,analyticShapes:r.analyticCount,errors,rows};r.destroy();return result;
 });
 result.sourceRevision=revision;result.note='Offscreen software/selected-adapter benchmark; not a measurement of the user device. Source may include uncommitted changes.';
 if(process.env.MEASURE_OUTPUT)fs.writeFileSync(process.env.MEASURE_OUTPUT,JSON.stringify(result,null,2));
 for(const enabled of [true,false]){const rows=result.rows.filter(r=>r.bvh===enabled);const med=k=>{const a=rows.map(r=>r[k]).filter(x=>x!=null).sort((a,b)=>a-b);return a.length?((a[(a.length-1)>>1]+a[a.length>>1])/2).toFixed(2):'n/a';};console.log(`${enabled?'BVH':'Brute'}: median wall ${med('wallMs')} ms, GPU ${med('gpuMs')} ms, CPU prep ${med('cpuMs')} ms, refit ${med('refitMs')} ms`);}
 console.log('Adapter:',result.adapter,'Resolution:',result.width,result.height,'Triangles:',result.triangles,'Analytic:',result.analyticShapes,'Errors:',result.errors);
}finally{await browser?.close();await server.close();}

// Offscreen software-GPU experiment; use the app's Measure A/B on real hardware.
// Current triangle-only scenes are more expensive than the archived mixed scenes.
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
  const {GPURenderer}=await import('/src/gpu.js');const {settings,makeScene}=await import('/src/scene.js');const {runBenchmark}=await import('/src/benchmark.js');
  Object.assign(settings,{scene:'primitives',time:74.4,resolution:1,running:false,probes:false,shadowSamples:16,gi:true,reflections:true,view:0});makeScene();
  let target;const canvas={clientWidth:160,clientHeight:100,width:160,height:100,getContext:()=>({configure:({device,format})=>target=device.createTexture({size:[160,100],format,usage:GPUTextureUsage.RENDER_ATTACHMENT}),getCurrentTexture:()=>target})};
  const r=await new GPURenderer().init(canvas);const errors=[];r.onError=e=>errors.push(e.message);
  try{const result=await runBenchmark(r,{warmup:2,samples:5});result.errors=errors;return result;}finally{r.destroy();}
 });
 result.sourceRevision=revision;result.note='Offscreen forced SwiftShader benchmark, NOT the user device. Uses the same safety limits as the UI; may stop with partial/no samples. Source may include uncommitted changes.';
 if(process.env.MEASURE_OUTPUT)fs.writeFileSync(process.env.MEASURE_OUTPUT,JSON.stringify(result,null,2));
 for(const [label,summary] of Object.entries(result.summary)){const med=k=>summary[k]?.median.toFixed(2)??'n/a';console.log(`${label}: ${summary.wallMs?.n??0} samples, median wall ${med('wallMs')} ms, GPU ${med('gpuMs')} ms, CPU prep ${med('cpuMs')} ms, refit ${med('refitMs')} ms`);}
 console.log('Status:',result.status,result.reason??'','Adapter:',result.adapter,'Output:',result.output,'Errors:',result.errors);
}finally{await browser?.close();await server.close();}

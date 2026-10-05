import {chromium} from '@playwright/test';
import {createServer} from 'vite';
import assert from 'node:assert/strict';

const server=await createServer({server:{host:'127.0.0.1',port:5180,strictPort:true}});
await server.listen();
const browser=await chromium.launch({
 executablePath:process.env.CHROMIUM_PATH||undefined,
 headless:true,
 args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-unsafe-webgpu','--use-vulkan=swiftshader'],
});
const url='http://127.0.0.1:5180';
try {
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>Object.defineProperty(navigator,'gpu',{value:undefined}));
 await page.goto(url);
 await page.locator('#loading.loaded').waitFor();
 assert.equal(await page.locator('#engine-status').textContent(),'WebGL preview');
 assert.ok(await page.locator('#fallback-notice').isVisible());
 await page.locator('#play').click();assert.equal(await page.locator('#playback-state').textContent(),'Simulation paused');
 await page.locator('#enable-gi').click();assert.equal(await page.locator('#enable-gi').getAttribute('aria-checked'),'false');
 await page.locator('#bounce').fill('1.5');await page.locator('#bounce').dispatchEvent('input');assert.equal(await page.locator('#bounce-value').textContent(),'1.50×');
 await page.locator('[data-view="3"]').click();assert.equal(await page.locator('[data-view="3"]').getAttribute('aria-selected'),'true');
 await page.locator('#show-probes').click();assert.equal(await page.locator('#show-probes').getAttribute('aria-checked'),'false');
 assert.equal(await page.locator('#benchmark').isDisabled(),true);assert.equal(await page.locator('#probe-visibility').isDisabled(),true);
 assert.ok(await page.locator('#bvh-quick').isVisible());assert.equal(await page.locator('#bvh-quick').isDisabled(),true);
 await page.locator('#scene-select').selectOption('deform');assert.ok(await page.locator('#deform-controls').isVisible());
 await page.locator('#wave-amplitude').fill('0.5');await page.locator('#wave-amplitude').dispatchEvent('input');assert.equal(await page.locator('#wave-amplitude-value').textContent(),'0.50×');
 await page.locator('#scene-select').selectOption('swarm');assert.equal(await page.locator('#scene-title').textContent(),'TRIANGLE SWARM');
 await page.locator('#scene-select').selectOption('windows');assert.equal(await page.locator('#shadow-samples').inputValue(),'16');
 await page.locator('#scene-select').selectOption('primitives');assert.equal(await page.locator('#scene-title').textContent(),'TRIANGLE PLAYGROUND');
 await page.locator('#scene-select').selectOption('stress');assert.ok(await page.locator('#stress-controls').isVisible());await page.locator('#stress-count').selectOption('64');
 await page.locator('#memory-info').click();assert.ok((await page.locator('#dialog-content').textContent()).includes('not total VRAM'));await page.keyboard.press('Escape');
 await page.locator('#reset').click();assert.equal(await page.locator('#scene-select').inputValue(),'chamber');assert.equal(await page.locator('#enable-gi').getAttribute('aria-checked'),'true');
 await page.locator('#how-it-works').click();assert.equal(await page.locator('dialog').evaluate(e=>e.open),true);await page.keyboard.press('Escape');
 const downloadPromise=page.waitForEvent('download');await page.locator('#snapshot').click();const download=await downloadPromise;assert.equal(download.suggestedFilename(),'cascade-lab.png');
 await page.setViewportSize({width:390,height:844});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Mobile layout should not overflow');
 assert.ok(await page.locator('canvas').isVisible());
 assert.deepEqual(errors,[]);await page.close();console.log('✓ UI: fallback, controls, reset, dialogs, PNG export, mobile layout');

 // Execute real shaders into an offscreen texture. Headless SwiftShader may support
 // WebGPU compute but not a browser swap chain; no canvas compositing is needed here.
 const gpuPage=await browser.newPage({deviceScaleFactor:1});
 await gpuPage.route('**/src/main.js*',r=>r.fulfill({contentType:'text/javascript',body:''}));
 await gpuPage.goto(url);
 const results=await gpuPage.evaluate(async()=>{
  if(!navigator.gpu||!await navigator.gpu.requestAdapter())return {skip:true};
  const {GPURenderer}=await import('/src/gpu.js');const {settings,updateScene,makeScene,triangleData,emitterTriangleData,objects,lightData}=await import('/src/scene.js');settings.resolution=1;settings.running=false;settings.probes=false;updateScene(0);
  let target,device;const errors=[];
  const canvas={clientWidth:64,clientHeight:48,width:64,height:48,getContext:()=>({configure:({device:d,format})=>{device=d;target=d.createTexture({size:[64,48],format,usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.COPY_SRC});},getCurrentTexture:()=>target})};
  const renderer=await new GPURenderer().init(canvas);renderer.onError=e=>errors.push(e.message);
  async function readFrame(){
   await renderer.render();const output=device.createBuffer({size:256*48,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});const encoder=device.createCommandEncoder();encoder.copyTextureToBuffer({texture:target},{buffer:output,bytesPerRow:256},[64,48]);device.queue.submit([encoder.finish()]);await output.mapAsync(GPUMapMode.READ);const pixels=new Uint8Array(output.getMappedRange()).slice();output.unmap();output.destroy();return pixels;
  }
  const lit=await readFrame();const baseMemory=renderer.memory.total;settings.bvh=false;const brute=await readFrame();const bruteRefitMs=renderer.bvhMs;settings.bvh=true;settings.gi=false;const direct=await readFrame();settings.gi=true;updateScene(2);const moving=await readFrame();settings.view=3;const normals=await readFrame();settings.probes=true;const probes=await readFrame();
  const difference=(a,b)=>a.reduce((sum,x,i)=>sum+(x!==b[i]?1:0),0);
  const maxDifference=(a,b)=>a.reduce((max,x,i)=>Math.max(max,Math.abs(x-b[i])),0);
  const capture=await renderer.capture();const colors=new Set();for(let i=0;i<lit.length;i+=4)colors.add(lit.slice(i,i+3).join(','));
  const initialTriangles=renderer.triangleCount;
  settings.probes=false;settings.view=4;const atlas=await readFrame();settings.probeLevel=2;const farAtlas=await readFrame();
  settings.scene='windows';settings.view=0;settings.gi=false;settings.shadowSamples=1;makeScene();const hard=await readFrame();settings.shadowSamples=16;const soft=await readFrame();settings.emitterSize=.2;updateScene(0);const smallEmitter=await readFrame();
  settings.scene='primitives';settings.emitterSize=1;settings.shadowSamples=1;makeScene();const primitiveMesh=await readFrame();const primitiveTriangles=renderer.triangleCount;const primitiveMeshCount=renderer.meshCount;const uploadedAll=primitiveTriangles===objects.reduce((n,o)=>n+(o.geometry.index?.count??o.geometry.attributes.position.count)/3,0);
  const packed=triangleData(),emitterPacked=emitterTriangleData(),emitterRanges=lightData();
  const positionsKey=(data,offset)=>[0,1,2,4,5,6,8,9,10].map(k=>data[offset+k]).join(',');
  const sceneTriangles=new Set();for(let i=0;i<packed.length;i+=20)sceneTriangles.add(positionsKey(packed,i));
  let allEmitterSamplesAreMeshTriangles=true;for(let i=0;i<emitterPacked.length;i+=12)if(!sceneTriangles.has(positionsKey(emitterPacked,i)))allEmitterSamplesAreMeshTriangles=false;
  let emitterCDFValid=true;for(let i=0;i<emitterRanges.length;i+=8){const first=emitterRanges[i],count=emitterRanges[i+1];let previous=0;for(let j=0;j<count;j++){const cdf=emitterPacked[(first+j)*12+3];if(cdf<previous||cdf>1)emitterCDFValid=false;previous=cdf;}if(previous!==1||emitterRanges[i+2]<=0)emitterCDFValid=false;}
  const tracedEmissiveTriangles=Array.from({length:packed.length/20},(_,i)=>packed[i*20+15]>0&&packed[i*20+18]===1).filter(Boolean).length;
  settings.bvh=false;const primitiveBrute=await readFrame();settings.bvh=true;
  const orbBefore=Array.from(emitterTriangleData());updateScene(4);const orbAfter=Array.from(emitterTriangleData());
  settings.scene='stress';settings.stressCount=1536;settings.reflections=false;settings.gi=true;makeScene();const stress=await readFrame();const stressTriangles=renderer.triangleCount,stressMemory=renderer.memory.total;
  settings.scene='deform';settings.time=0;settings.gi=true;settings.reflections=true;settings.shadowSamples=1;makeScene();
  // Freeze every other animation: subsequent changes must come from the mesh alone.
  for(const o of objects)if(o.motion!=='wave')o.motion=null;
  updateScene(0);const sheet=objects.find(o=>o.kind==='wavy-sheet');const waveVertices=sheet.geometry.attributes.position.count;
  const indicesBefore=Array.from(sheet.geometry.index.array),positionsBefore=Array.from(sheet.geometry.attributes.position.array),transformBefore=sheet.matrix.toArray(),lightsBefore=Array.from(lightData());
  const wave0=await readFrame();const waveTriangles=sheet.geometry.index.count/3;const treeBefore=renderer.bvh.nodes;settings.view=4;const waveAtlas0=await readFrame();
  updateScene(1.7);const positionsAfter=Array.from(sheet.geometry.attributes.position.array);settings.view=0;const wave1=await readFrame();const reusedWaveTree=renderer.bvh.nodes===treeBefore;
  settings.wireframe=true;const waveEdges=await readFrame();settings.wireframe=false;
  settings.bvh=false;const waveBrute=await readFrame();const waveBruteRefit=renderer.bvhMs;settings.bvh=true;
  settings.view=4;const waveAtlas1=await readFrame();
  const connectedTopologyUnchanged=difference(indicesBefore,Array.from(sheet.geometry.index.array))===0;
  const objectTransformUnchanged=difference(transformBefore,sheet.matrix.toArray())===0;
  const lightsUnchanged=difference(lightsBefore,Array.from(lightData()))===0;
  settings.waveAmplitude=0;updateScene(1.7);const flattened=sheet.geometry.attributes.position.array.every((v,i)=>i%3!==2||v===0);
  const {runBenchmark}=await import('/src/benchmark.js');
  settings.scene='primitives';settings.view=0;settings.shadowSamples=1;settings.gi=false;settings.probes=false;settings.running=true;settings.time=3;settings.bvh=false;makeScene();
  const snapshot=JSON.stringify(settings);const benchmark=await runBenchmark(renderer,{warmup:0,samples:1,maxDurationMs:60000,slowFrameMs:20000});
  const benchmarkRestored=snapshot===JSON.stringify(settings);
  const abort=new AbortController();abort.abort();const cancelled=await runBenchmark(renderer,{signal:abort.signal});
  // Isolated wall-leak fixture: all eight probes contain white irradiance. A
  // horizontal wall separates the surface from its front-facing probes. No
  // cascade-merging correctness claim is made by this final-interpolation test.
  const {common}=await import('/src/shaders.js');
  const fixtureModule=device.createShaderModule({code:common+`
    @group(0) @binding(6) var<storage,read_write> testOutput:array<vec4f>;
    @compute @workgroup_size(1) fn main(){testOutput[0]=vec4f(sampleIrradiance(vec3f(0,1,0),vec3f(0,1,0)),1);}
  `});
  const fixturePipeline=await device.createComputePipelineAsync({layout:'auto',compute:{module:fixtureModule,entryPoint:'main'}});
  const fixtureBuffer=(size,usage)=>device.createBuffer({size,usage});
  const uniform=fixtureBuffer(144,GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST),triangles=fixtureBuffer(160,GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST),irrad=fixtureBuffer(5184*16,GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST),emptyNodes=fixtureBuffer(48,GPUBufferUsage.STORAGE),out=fixtureBuffer(16,GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC),read=fixtureBuffer(16,GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ);
  const vertices=[-10,1.2,-10,0,10,1.2,-10,0,10,1.2,10,0,1,1,1,0,0,0,0,0,-10,1.2,-10,0,10,1.2,10,0,-10,1.2,10,0,1,1,1,0,0,0,0,0];
  device.queue.writeBuffer(triangles,0,new Float32Array(vertices));device.queue.writeBuffer(irrad,0,new Float32Array(5184*4).fill(1));
  const bind=device.createBindGroup({layout:fixturePipeline.getBindGroupLayout(0),entries:[[0,uniform],[1,triangles],[5,irrad],[6,out],[7,emptyNodes]].map(([binding,buffer])=>({binding,resource:{buffer}}))});
  async function visibilityFixture(blocked,guard){const u=new Float32Array(36);u[18]=blocked?2:0;u[31]=guard?1:0;device.queue.writeBuffer(uniform,0,u);const encoder=device.createCommandEncoder();const pass=encoder.beginComputePass();pass.setPipeline(fixturePipeline);pass.setBindGroup(0,bind);pass.dispatchWorkgroups(1);pass.end();encoder.copyBufferToBuffer(out,0,read,0,16);device.queue.submit([encoder.finish()]);await read.mapAsync(GPUMapMode.READ);const v=new Float32Array(read.getMappedRange())[0];read.unmap();return v;}
  const visibility={naiveBlocked:await visibilityFixture(true,false),guardedBlocked:await visibilityFixture(true,true),guardedClear:await visibilityFixture(false,true)};
  for(const b of [uniform,triangles,irrad,emptyNodes,out,read])b.destroy();
  const result={errors,visibility,benchmarkRestored,benchmarkStatus:benchmark.status,benchmarkRows:benchmark.rows.length,benchmarkBVHOffCPU:benchmark.rows.filter(r=>!r.bvh).every(r=>r.refitMs===0),benchmarkHasPasses:!renderer.timestamp||benchmark.rows.every(r=>r.cascadeMs!=null&&r.shadingMs!=null&&r.presentMs!=null),benchmarkCancelled:cancelled.status,colors:colors.size,giChanges:difference(lit,direct),motionChanges:difference(lit,moving),normalChanges:difference(moving,normals),probeChanges:difference(normals,probes),captureBytes:capture.size,triangles:initialTriangles,bruteRefitMs,
   waveVertices,waveTriangles,reusedWaveTree,connectedTopologyUnchanged,objectTransformUnchanged,lightsUnchanged,flattened,
   waveVertexChanges:difference(positionsBefore,positionsAfter),waveImageChanges:difference(wave0,wave1),waveAtlasChanges:difference(waveAtlas0,waveAtlas1),waveBVHDifference:difference(wave1,waveBrute),waveEdgeChanges:difference(wave1,waveEdges),waveBruteRefit,
   bvhDifference:difference(lit,brute),bvhMaxDifference:maxDifference(lit,brute),meshBVHDifference:difference(primitiveMesh,primitiveBrute),meshBVHMaxDifference:maxDifference(primitiveMesh,primitiveBrute),atlasChanges:difference(atlas,farAtlas),penumbraChanges:difference(hard,soft),emitterSizeChanges:difference(soft,smallEmitter),primitiveTriangles,primitiveMeshCount,uploadedAll,allEmitterSamplesAreMeshTriangles,emitterCDFValid,tracedEmissiveTriangles,orbChanges:difference(orbBefore,orbAfter),stressTriangles,baseMemory,stressMemory};renderer.destroy();return result;
 });
 if(results.skip){console.log('SKIP WebGPU: no adapter in this browser');}else{
  assert.deepEqual(results.errors,[]);assert.ok(results.colors>20);assert.ok(results.giChanges>100);assert.ok(results.motionChanges>100);assert.ok(results.normalChanges>100);assert.ok(results.probeChanges>100);assert.ok(results.captureBytes>100);assert.ok(results.triangles>50);
  // Different traversal orders can resolve shared edges with a one-LSB difference.
  assert.ok(results.bvhDifference<=12);assert.ok(results.bvhMaxDifference<=1);assert.ok(results.meshBVHDifference<=24);assert.ok(results.meshBVHMaxDifference<=1);assert.equal(results.primitiveTriangles,3052);assert.equal(results.primitiveMeshCount,15);assert.ok(results.uploadedAll);assert.ok(results.allEmitterSamplesAreMeshTriangles);assert.ok(results.emitterCDFValid);assert.equal(results.tracedEmissiveTriangles,724);assert.ok(results.orbChanges>0);
  assert.ok(results.atlasChanges>100);assert.ok(results.penumbraChanges>50);assert.ok(results.emitterSizeChanges>100);assert.equal(results.stressTriangles,19188);assert.ok(results.stressMemory>results.baseMemory);
  assert.equal(results.bruteRefitMs,0);assert.equal(results.waveBruteRefit,0);assert.equal(results.waveVertices,1617);assert.equal(results.waveTriangles,3072);
  assert.ok(results.reusedWaveTree);assert.ok(results.connectedTopologyUnchanged);assert.ok(results.objectTransformUnchanged);assert.ok(results.lightsUnchanged);assert.ok(results.flattened);
  assert.ok(results.waveVertexChanges>1000);assert.ok(results.waveImageChanges>100);assert.ok(results.waveAtlasChanges>100);assert.ok(results.waveEdgeChanges>100);assert.equal(results.waveBVHDifference,0);
  assert.ok(results.benchmarkRestored);assert.equal(results.benchmarkStatus,'complete');assert.equal(results.benchmarkRows,4);assert.ok(results.benchmarkBVHOffCPU);assert.ok(results.benchmarkHasPasses);assert.equal(results.benchmarkCancelled,'partial');
  assert.ok(Math.abs(results.visibility.naiveBlocked-1)<.0001);assert.equal(results.visibility.guardedBlocked,0);assert.ok(Math.abs(results.visibility.guardedClear-1)<.0001);
  console.log('✓ GPU: WGSL compilation, cascade dispatch + merge, GI toggle, dynamic geometry, normals, readback',results);
 }
 // Real WebGPU UI lifecycle, with only presentation redirected to an offscreen
 // texture because this headless browser cannot composite a WebGPU swap chain.
 if(!results.skip){
  const uiGPU=await browser.newPage({viewport:{width:1000,height:800},deviceScaleFactor:1});const uiErrors=[];uiGPU.on('pageerror',e=>uiErrors.push(e.message));
  await uiGPU.addInitScript(()=>{
   const original=HTMLCanvasElement.prototype.getContext;
   HTMLCanvasElement.prototype.getContext=function(type,...args){
    if(type!=='webgpu')return original.call(this,type,...args);
    const canvas=this;let device,format,target,width,height;
    return {configure:options=>{device=options.device;format=options.format;},getCurrentTexture:()=>{if(!target||width!==canvas.width||height!==canvas.height){target?.destroy();width=canvas.width;height=canvas.height;target=device.createTexture({size:[width,height],format,usage:GPUTextureUsage.RENDER_ATTACHMENT});}return target;}};
   };
  });
  await uiGPU.route('**/src/scene.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace('resolution:.75','resolution:.05').replace('probes:true','probes:false').replace('shadowSamples:4','shadowSamples:1').replace('gi:true','gi:false')});});
  await uiGPU.goto(url+'/?scene=primitives');await uiGPU.locator('#loading.loaded').waitFor();
  assert.equal(await uiGPU.locator('#engine-status').textContent(),'WebGPU active');
  await uiGPU.locator('#bvh-quick').click();assert.equal(await uiGPU.locator('#bvh').getAttribute('aria-checked'),'false');
  await uiGPU.locator('#benchmark').click();await uiGPU.locator('#run-benchmark').click();assert.equal(await uiGPU.locator('#scene-select').isDisabled(),true);
  await uiGPU.locator('#download-benchmark').waitFor({timeout:60000});assert.equal(await uiGPU.locator('#benchmark-status').textContent(),'Completed all four blocks.');
  assert.equal(await uiGPU.locator('#scene-select').isDisabled(),false);assert.equal(await uiGPU.locator('#bvh-quick').getAttribute('aria-checked'),'false');
  const downloaded=uiGPU.waitForEvent('download');await uiGPU.locator('#download-benchmark').click();assert.equal((await downloaded).suggestedFilename(),'cascade-benchmark.json');assert.deepEqual(uiErrors,[]);await uiGPU.close();
  console.log('✓ WebGPU UI benchmark: control locking, complete ABBA run, restore, export');
 }

}finally{await browser.close();await server.close();}

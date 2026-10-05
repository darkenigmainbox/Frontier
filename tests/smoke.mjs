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
 await page.locator('#scene-select').selectOption('swarm');assert.equal(await page.locator('#scene-title').textContent(),'TRIANGLE SWARM');
 await page.locator('#scene-select').selectOption('windows');assert.equal(await page.locator('#shadow-samples').inputValue(),'16');
 await page.locator('#scene-select').selectOption('primitives');assert.equal(await page.locator('#scene-title').textContent(),'ANALYTIC PLAYGROUND');
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
  const {GPURenderer}=await import('/src/gpu.js');const {settings,updateScene,makeScene,analyticData}=await import('/src/scene.js');settings.resolution=1;settings.running=false;settings.probes=false;updateScene(0);
  let target,device;const errors=[];
  const canvas={clientWidth:64,clientHeight:48,width:64,height:48,getContext:()=>({configure:({device:d,format})=>{device=d;target=d.createTexture({size:[64,48],format,usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.COPY_SRC});},getCurrentTexture:()=>target})};
  const renderer=await new GPURenderer().init(canvas);renderer.onError=e=>errors.push(e.message);
  async function readFrame(){
   await renderer.render();const output=device.createBuffer({size:256*48,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});const encoder=device.createCommandEncoder();encoder.copyTextureToBuffer({texture:target},{buffer:output,bytesPerRow:256},[64,48]);device.queue.submit([encoder.finish()]);await output.mapAsync(GPUMapMode.READ);const pixels=new Uint8Array(output.getMappedRange()).slice();output.unmap();output.destroy();return pixels;
  }
  const lit=await readFrame();const baseMemory=renderer.memory.total;settings.bvh=false;const brute=await readFrame();settings.bvh=true;settings.gi=false;const direct=await readFrame();settings.gi=true;updateScene(2);const moving=await readFrame();settings.view=3;const normals=await readFrame();settings.probes=true;const probes=await readFrame();
  const difference=(a,b)=>a.reduce((sum,x,i)=>sum+(x!==b[i]?1:0),0);
  const capture=await renderer.capture();const colors=new Set();for(let i=0;i<lit.length;i+=4)colors.add(lit.slice(i,i+3).join(','));
  const initialTriangles=renderer.triangleCount;
  settings.probes=false;settings.view=4;const atlas=await readFrame();settings.probeLevel=2;const farAtlas=await readFrame();
  settings.scene='windows';settings.view=0;settings.gi=false;settings.shadowSamples=1;makeScene();const hard=await readFrame();settings.shadowSamples=16;const soft=await readFrame();settings.emitterSize=.2;updateScene(0);const smallEmitter=await readFrame();
  settings.scene='primitives';settings.emitterSize=1;settings.shadowSamples=1;makeScene();const analytical=await readFrame();const analyticalCount=renderer.analyticCount;settings.bvh=false;const analyticalBrute=await readFrame();settings.bvh=true;
  const orbBefore=Array.from(analyticData());updateScene(4);const orbAfter=Array.from(analyticData());
  settings.scene='stress';settings.stressCount=1536;settings.reflections=false;settings.gi=true;makeScene();const stress=await readFrame();const stressTriangles=renderer.triangleCount,stressMemory=renderer.memory.total;
  const result={errors,colors:colors.size,giChanges:difference(lit,direct),motionChanges:difference(lit,moving),normalChanges:difference(moving,normals),probeChanges:difference(normals,probes),captureBytes:capture.size,triangles:initialTriangles,
   bvhDifference:difference(lit,brute),analyticBVHDifference:difference(analytical,analyticalBrute),atlasChanges:difference(atlas,farAtlas),penumbraChanges:difference(hard,soft),emitterSizeChanges:difference(soft,smallEmitter),analyticalCount,orbChanges:difference(orbBefore,orbAfter),stressTriangles,baseMemory,stressMemory};renderer.destroy();return result;
 });
 if(results.skip){console.log('SKIP WebGPU: no adapter in this browser');}else{
  assert.deepEqual(results.errors,[]);assert.ok(results.colors>20);assert.ok(results.giChanges>100);assert.ok(results.motionChanges>100);assert.ok(results.normalChanges>100);assert.ok(results.probeChanges>100);assert.ok(results.captureBytes>100);assert.ok(results.triangles>50);
  assert.equal(results.bvhDifference,0);assert.equal(results.analyticBVHDifference,0);assert.ok(results.analyticalCount>=6);assert.ok(results.orbChanges>0);
  assert.ok(results.atlasChanges>100);assert.ok(results.penumbraChanges>50);assert.ok(results.emitterSizeChanges>100);assert.ok(results.stressTriangles>18000);assert.ok(results.stressMemory>results.baseMemory);
  console.log('✓ GPU: WGSL compilation, cascade dispatch + merge, GI toggle, dynamic geometry, normals, readback',results);
 }
}finally{await browser.close();await server.close();}

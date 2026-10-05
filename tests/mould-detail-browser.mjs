import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from '@playwright/test';
import {createServer} from 'vite';
const server=await createServer({configFile:false,root:'site',server:{host:'0.0.0.0',port:5197}});await server.listen();
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1680,height:1100}}),errors=[],failed=[];
 page.on('console',m=>console.log('browser:',m.text()));
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(r.url());});
 await page.goto('http://127.0.0.1:5197/terrain/index.html');
 const ready=()=>page.waitForFunction(()=>window.CliffApp&&!CliffApp.State.Busy&&(CliffApp.State.Error||(!CliffApp.State.Dirty&&CliffApp.State.Result)),null,{timeout:180000});
 await ready();console.log('initial ready');await page.click('[data-stage="6"]');await page.click('#Regenerate');await ready();
 console.log('generation ready');assert.equal(await page.evaluate(()=>CliffApp.State.Error),null);
 assert.equal(await page.locator('#StageNumber').textContent(),'06 / 06');
 assert.equal(await page.evaluate(()=>CliffApp.State.Result.Stages.length),6);
 assert(await page.locator('#MouldStudy').isVisible());
 const stages=await page.evaluate(()=>CliffApp.State.Result.Stages.map(s=>s.Metrics));
 assert.equal(stages[5].ZeroArea,0);assert.equal(stages[5].OpenEdges,0);
 fs.mkdirSync('docs/terrain/mould-renders',{recursive:true});
 // A warm, UNTEXTURED clay material. All captures use generated meshes in the live viewport.
 const camera=async(close=false)=>page.evaluate(close=>{
  const a=CliffApp;a.Controls.enableDamping=false;a.ViewportEditor.setMode('View');
  for(const body of a.BodyGroup.children){body.material.color.set('#a18e77');body.material.flatShading=true;}
  a.Renderer.setPixelRatio(1);a.Renderer.setSize(1600,1000,false);a.Camera.aspect=1.6;
  a.FrameView();const centre=a.Controls.target.clone();
  a.Controls.target.copy(centre).add(a.Camera.position.clone().set(0,close?1:0,close?4:0));
  a.Camera.position.copy(a.Controls.target).add(a.Camera.position.clone().set(close?3:27,close?5:16,close?30:44));a.Camera.aspect=1.6;
  a.Camera.updateProjectionMatrix();a.Controls.update();a.Scene.updateMatrixWorld(true);
  a.Renderer.shadowMap.needsUpdate=true;a.Renderer.render(a.Scene,a.Camera);
 },close);
 const capture=async(name,close=false)=>{
  await camera(close);
  const url=await page.evaluate(()=>{const a=CliffApp;a.Renderer.render(a.Scene,a.Camera);return a.Renderer.domElement.toDataURL('image/png');});
  fs.writeFileSync(`docs/terrain/mould-renders/${name}.png`,Buffer.from(url.split(',')[1],'base64'));
 };
 await capture('stage6-final');await capture('stage6-close',true);
 await page.selectOption('#DetailView','Before');await capture('stage5-before-close',true);
 const beforeObj=await page.evaluate(()=>CliffApp.ObjText());assert.equal((beforeObj.match(/^f /gm)||[]).length,stages[5].Triangles,'export remains final, not inspection geometry');
 await page.selectOption('#DetailView','Noisy');
 assert.equal(await page.evaluate(()=>CliffApp.BodyGroup.children[0].material.clippingPlanes.length),1);
 await capture('noisy-mould-cutaway');
 await page.selectOption('#DetailView','Final');
 assert.equal(await page.evaluate(()=>CliffApp.BodyGroup.children[0].material.clippingPlanes.length),0);
 const result=await page.evaluate(()=>({detail:CliffApp.State.Result.Stages[5].Detail,metrics:CliffApp.State.Result.Stages[5].Metrics,specification:CliffApp.State.Specification}));
 fs.writeFileSync('docs/terrain/mould-renders/recipe.json',JSON.stringify({Format:'Frontier.PolygonCliff',Version:9,Specification:result.specification},null,2));
 fs.writeFileSync('docs/terrain/mould-renders/measurements.json',JSON.stringify(result,null,2));
 console.log('captures done, testing cached rebuild');await page.evaluate(()=>{CliffApp.Renderer.shadowMap.enabled=false;CliffApp.State.Worker.addEventListener('message',e=>console.log('worker',e.data.Progress??e.data.Error??'ready'));CliffApp.SetSpecification({DetailSeed:43});});await ready();
 console.log('generation ready');assert.equal(await page.evaluate(()=>CliffApp.State.Error),null);
 assert.deepEqual(await page.evaluate(()=>CliffApp.State.Result.ExecutedStages),[6]);
 assert.deepEqual(await page.evaluate(()=>CliffApp.State.Result.ReusedStages),[1,2,3,4,5]);
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
 console.log(JSON.stringify({passed:true,wasmLoaded:true,stage6:true,exportTriangles:stages[5].Triangles,cache:true,errors,failed,...result.detail},null,2));
}finally{await browser.close();await server.close();}

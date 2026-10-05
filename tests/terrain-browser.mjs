import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from '@playwright/test';
import {createServer} from 'vite';
const server=await createServer({configFile:false,root:'site',server:{host:'0.0.0.0',port:0}});await server.listen();
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],failures=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failures.push(`${r.status()} ${r.url()}`);});
 await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/terrain/index.html`);
 const ready=()=>page.waitForFunction(()=>window.CliffApp&&!CliffApp.State.Busy,null,{timeout:120000});await ready();
 assert.equal(await page.evaluate(()=>CliffApp.State.Error),null);
 assert.equal(await page.evaluate(()=>CliffApp.State.DisplayStage),6);
 assert.equal(await page.locator('.StageButton').count(),6);
 await page.click('#DetailCloseup');
 const frame=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await frame();
 const after=await page.evaluate(()=>({image:CliffApp.Renderer.domElement.toDataURL(),camera:CliffApp.Camera.position.toArray(),target:CliffApp.Controls.target.toArray()}));
 fs.mkdirSync('.arena',{recursive:true});await page.screenshot({path:'.arena/terrain-stage6.png'});
 await page.click('#CompareDetail');await frame();
 const before=await page.evaluate(()=>({image:CliffApp.Renderer.domElement.toDataURL(),camera:CliffApp.Camera.position.toArray(),triangles:CliffApp.State.Result.Stages[4].Metrics.Triangles}));
 assert(before.camera.every((x,i)=>Math.abs(x-after.camera[i])<1e-9),'comparison preserves camera to floating-point precision');assert.notEqual(before.image,after.image,'stage 6 visibly changes the mesh');
 await page.screenshot({path:'.arena/terrain-stage5.png'});
 await page.click('#CompareDetail');await frame();
 const exported=await page.evaluate(()=>{const s=CliffApp.ObjText();return {vertices:(s.match(/^v /gm)||[]).length,faces:(s.match(/^f /gm)||[]).length,metrics:CliffApp.State.Result.Stages[5].Metrics};});
 assert.equal(exported.vertices,exported.metrics.Vertices);assert.equal(exported.faces,exported.metrics.Triangles);
 await page.selectOption('#DetailRock','Granite');assert.equal(await page.evaluate(()=>CliffApp.State.Dirty),true);
 assert(await page.locator('#ExportObj').isDisabled());await page.click('#Regenerate');await ready();
 assert.equal(await page.evaluate(()=>CliffApp.State.Error),null);
 assert.deepEqual(await page.evaluate(()=>CliffApp.State.Result.ExecutedStages),[6]);
 assert.deepEqual(await page.evaluate(()=>CliffApp.State.Result.ReusedStages),[1,2,3,4,5]);
 await page.click('#Wire');assert(await page.evaluate(()=>CliffApp.State.Wire));
 await page.click('#ExportRecipe'); // exercise the v3 browser download path
 assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
 console.log(JSON.stringify({passed:true,stage5Triangles:before.triangles,stage6:exported.metrics,closeupTarget:after.target,errors,failedRequests:failures},null,2));
}finally{await browser.close();await server.close();}

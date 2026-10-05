import assert from 'node:assert/strict';import fs from 'node:fs';
import {chromium} from '@playwright/test';import {createServer} from 'vite';
const server=await createServer({configFile:false,root:'site',server:{host:'0.0.0.0',port:5193}});await server.listen();
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5193/terrain/index.html');
 const ready=()=>page.waitForFunction(()=>window.CliffApp&&!CliffApp.State.Busy&&!CliffApp.State.Dirty&&CliffApp.State.Result,null,{timeout:120000});await ready();
 const change=async(id,value)=>{
  const old=await page.evaluate(()=>CliffApp.State.ReadyRevision);
  await page.locator('#'+id).evaluate((el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));},String(value));
  await page.waitForFunction(r=>CliffApp.State.ReadyRevision>r&&!CliffApp.State.Busy&&!CliffApp.State.Dirty,old,{timeout:120000});
  assert.equal(await page.evaluate(()=>CliffApp.State.Error),null);
 };
 const frame=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 await change('ShapeMode','Procedural');await change('NoiseMode','None');await change('Variation',0);await page.click('#Front');
 fs.mkdirSync('.arena',{recursive:true});const images=[];
 for(const seed of [42,1,73]){await change('Seed',seed);await frame();images.push(await page.evaluate(()=>CliffApp.Renderer.domElement.toDataURL()));await page.screenshot({path:`.arena/formation-${seed}.png`});}
 assert.equal(new Set(images).size,3,'seed changes visible formation even without noise');
 await change('Lean',-1);const left=await page.evaluate(()=>CliffApp.ObjText());await change('Lean',1);assert.notEqual(await page.evaluate(()=>CliffApp.ObjText()),left);
 const downloadPromise=page.waitForEvent('download');await page.click('#ExportRecipe');const recipe=JSON.parse(fs.readFileSync(await (await downloadPromise).path(),'utf8'));assert.equal(recipe.Version,5);
 await change('ShapeMode','Authored');assert(await page.locator('#Lean').isDisabled());await change('ShapeMode','Procedural');assert(!(await page.locator('#Lean').isDisabled()));
 await page.locator('[data-stage="2"]').click();await page.click('#Regenerate');await ready();assert.equal(await page.evaluate(()=>CliffApp.State.DisplayStage),2);
 // A stage-1 edit invalidates downstream output; later stages still require the explicit rebuild.
 await page.locator('#Seed').evaluate(el=>{el.value=19;el.dispatchEvent(new Event('input',{bubbles:true}));});assert(await page.locator('#ExportObj').isDisabled());
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,noiseIndependentSeedPreviews:3,automaticPreview:true,version:recipe.Version,errors}));
}finally{await browser.close();await server.close();}

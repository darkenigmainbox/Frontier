import assert from 'node:assert/strict';import fs from 'node:fs';
import {chromium} from '@playwright/test';import {createServer} from 'vite';
const server=await createServer({configFile:false,root:'site',server:{host:'0.0.0.0',port:5194}});await server.listen();
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1366,height:768}}),errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)requests.push(r.url());});
 await page.goto('http://127.0.0.1:5194/terrain/index.html');
 await page.waitForFunction(()=>window.CliffApp?.State.Result&&!CliffApp.State.Busy,null,{timeout:120000});
 assert.equal(await page.evaluate(()=>CliffApp.State.Specification.ShapeMode),'Solid');
 assert.equal(await page.locator('.StageButton').count(),5);
 const change=async(id,value)=>{
  const r=await page.evaluate(()=>CliffApp.State.ReadyRevision);
  await page.locator('#'+id).evaluate((el,v)=>{el.value=String(v);el.dispatchEvent(new Event('input',{bubbles:true}));},value);
  await page.waitForFunction(r=>CliffApp.State.ReadyRevision>r&&!CliffApp.State.Busy&&!CliffApp.State.Dirty,r,{timeout:120000});
  assert.equal(await page.evaluate(()=>CliffApp.State.Error),null);
 };
 const frame=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 const shapes=[];fs.mkdirSync('.arena',{recursive:true});
 for(const Profile of ['Headland','Escarpment','Spire','Needles','WideWall','Amphitheatre']){
  await change('Profile',Profile);assert.equal(await page.locator('#NoiseMode').count(),0,'inapplicable noise control should not be offered');
  if(Profile==='Spire')assert.equal(await page.locator('#PeakCount').count(),0,'a monolith does not expose a non-working count slider');
  await page.click('#Top');await frame();
  const top=await page.evaluate(()=>({y:CliffApp.Camera.position.y-CliffApp.Controls.target.y,z:CliffApp.Camera.position.z-CliffApp.Controls.target.z,image:CliffApp.Renderer.domElement.toDataURL()}));
  assert(top.y>Math.abs(top.z)*100);
  await page.click('#Side');await frame();const side=await page.evaluate(()=>CliffApp.Renderer.domElement.toDataURL());assert.notEqual(side,top.image);
  await page.click('#Frame');await frame();
  shapes.push(await page.evaluate(()=>({profile:CliffApp.State.Specification.Profile,triangles:CliffApp.State.Result.Stages[0].Metrics.Triangles,open:CliffApp.State.Result.Stages[0].Metrics.OpenEdges})));
 }
 assert.deepEqual(await page.locator('#PeakCount option').evaluateAll(es=>es.map(e=>e.value)),['0','5','6','7'],'only applicable horseshoe segment counts');
 const downloadPromise=page.waitForEvent('download');await page.click('#ExportRecipe');const recipe=JSON.parse(fs.readFileSync(await (await downloadPromise).path(),'utf8'));assert.equal(recipe.Version,6);
 await change('Profile','Headland');const initial=await page.evaluate(()=>CliffApp.ObjText());await change('Seed',73);assert.notEqual(await page.evaluate(()=>CliffApp.ObjText()),initial);
 await page.locator('[data-stage="2"]').click();await page.click('#Regenerate');await page.waitForFunction(()=>!CliffApp.State.Busy&&!CliffApp.State.Dirty,null,{timeout:120000});assert.equal(await page.evaluate(()=>CliffApp.State.DisplayStage),2);
 assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
 console.log(JSON.stringify({passed:true,shapes,recipeVersion:recipe.Version,topAndSide:true,automaticPreview:true,downstreamStage2:true,errors,failedRequests:requests},null,2));
}finally{await browser.close();await server.close();}

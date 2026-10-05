import assert from 'node:assert/strict';import fs from 'node:fs';
import {chromium} from '@playwright/test';import {createServer} from 'vite';
const server=await createServer({configFile:false,root:'site',server:{host:'0.0.0.0',port:5195}});await server.listen();
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--in-process-gpu','--no-zygote','--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],failed=[];page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.status()>=400)failed.push(r.url());});
 await page.goto('http://127.0.0.1:5195/terrain/index.html');
 const ready=()=>page.waitForFunction(()=>window.CliffApp?.State.Result&&!CliffApp.State.Busy&&!CliffApp.State.Dirty,null,{timeout:120000});await ready();
 assert.equal(await page.locator('#ShapeMode').count(),0,'legacy mode picker removed');
 const change=async(id,value)=>{
  const revision=await page.evaluate(()=>CliffApp.State.ReadyRevision);
  await page.locator('#'+id).evaluate((el,v)=>{el.value=String(v);el.dispatchEvent(new Event('input',{bubbles:true}));},value);
  await page.waitForFunction(r=>CliffApp.State.ReadyRevision>r&&!CliffApp.State.Busy&&!CliffApp.State.Dirty,revision,{timeout:120000});
  assert.equal(await page.evaluate(()=>CliffApp.State.Error),null);
 };
 fs.mkdirSync('.arena',{recursive:true});
 for(const profile of ['RockArch','Canyon','RouteCliff']){
  await change('Profile',profile);assert(await page.locator('#RouteCanvas').isVisible());
  for(const view of ['Frame','Front','Top','Side']){await page.click('#'+view);await page.waitForTimeout(500);fs.writeFileSync(`.arena/routes-${profile}-${view}.png`,Buffer.from((await page.evaluate(()=>CliffApp.Renderer.domElement.toDataURL())).split(',')[1],'base64'));}
 }
 const before=await page.evaluate(()=>CliffApp.ObjText());
 await page.locator('#RouteCanvas').focus();await page.keyboard.press('ArrowDown');await ready();
 assert.notEqual(await page.evaluate(()=>CliffApp.ObjText()),before,'route edit changes mesh');
 const after=await page.evaluate(()=>CliffApp.ObjText());
 // A second edit after a rebuild catches stale editor/specification references.
 await page.locator('#RouteCanvas').focus();await page.keyboard.press('ArrowDown');await ready();
 assert.notEqual(await page.evaluate(()=>CliffApp.ObjText()),after);
 await page.click('#RouteAdd');await ready();assert.equal(await page.locator('#RouteCanvas circle').count(),5);
 await page.click('#RouteRemove');await ready();assert.equal(await page.locator('#RouteCanvas circle').count(),4);
 // Exercise the actual pointer-drag interaction.
 const circle=await page.locator('#RouteCanvas circle').first().boundingBox();
 await page.mouse.move(circle.x+circle.width/2,circle.y+circle.height/2);await page.mouse.down();await page.mouse.move(circle.x+circle.width/2+12,circle.y+circle.height/2+5,{steps:4});await page.mouse.up();await ready();
 const saved=await page.evaluate(()=>structuredClone(CliffApp.State.Specification));
 const download=page.waitForEvent('download');await page.click('#ExportRecipe');const recipe=JSON.parse(fs.readFileSync(await (await download).path(),'utf8'));assert.equal(recipe.Version,6);assert.deepEqual(recipe.Specification.RoutePoints,saved.RoutePoints);
 await change('Profile','Headland');
 await page.setInputFiles('#RecipeFile',{name:'route.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(recipe))});await ready();
 assert.deepEqual(await page.evaluate(()=>CliffApp.State.Specification.RoutePoints),saved.RoutePoints);
 assert.equal(await page.locator('#RouteCanvas circle').count(),4);
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);console.log(JSON.stringify({passed:true,profiles:3,views:4,curveEditing:true,drag:true,recipeRoundtrip:true,errors,failedRequests:failed},null,2));
}finally{await browser.close();await server.close();}

import assert from 'node:assert/strict';import fs from 'node:fs';
import {chromium} from '@playwright/test';import {createServer} from 'vite';
const server=await createServer({configFile:false,root:'site',server:{host:'0.0.0.0',port:5198}});await server.listen();
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1600,height:1050}}),errors=[];page.setDefaultTimeout(90000);page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5198/terrain/index.html?stage=6');
 const ready=()=>page.waitForFunction(()=>CliffApp.State.Result&&!CliffApp.State.Busy&&!CliffApp.State.Dirty,null,{timeout:180000});await ready();
 await page.evaluate(()=>CliffApp.SetSpecification({TransformPosition:[3,1,2],TransformRotation:[0,.25,0],TransformScale:[1.1,.9,1.2]}));await ready();
 assert.deepEqual(await page.evaluate(()=>CliffApp.State.Result.ExecutedStages),[]);
 await page.evaluate(()=>{CliffApp.Renderer.shadowMap.enabled=false;CliffApp.Controls.enableDamping=false;});
 await page.click('#PaintProtectAll');await page.click('#PaintToggle');
 assert(await page.evaluate(()=>CliffApp.State.Painting));assert(await page.locator('#ToolMove').isDisabled());
 await page.fill('#PaintRadius','5');await page.locator('#PaintStrength').fill('1');
 const target=await page.evaluate(()=>{
  const a=CliffApp,r=a.Renderer.domElement.getBoundingClientRect();a.Scene.updateMatrixWorld(true);
  const mesh=a.BodyGroup.children[0],p=mesh.geometry.attributes.position,n=mesh.geometry.attributes.normal;
  for(let i=0;i<p.count;i++){
   if(n.getZ(i)<.6||p.getY(i)<7||p.getY(i)>15)continue;
   const v=a.Camera.position.clone().fromBufferAttribute(p,i);mesh.localToWorld(v);v.project(a.Camera);
   const x=r.left+(v.x+1)*r.width/2,y=r.top+(1-v.y)*r.height/2;
   if(x>r.left+r.width*.35&&x<r.right-80&&y>r.top+210&&y<r.bottom-120)return {x,y};
  }throw Error('No visible paint target');
 });
 const drag=async()=>{await page.mouse.move(target.x,target.y);await page.mouse.down();await page.mouse.move(target.x+45,target.y+25,{steps:8});await page.mouse.up();};
 await drag();assert((await page.evaluate(()=>CliffApp.State.Specification.DetailPaint.length))>0);
 assert(await page.evaluate(()=>CliffApp.Controls.enabled));assert(await page.locator('#ExportObj').isDisabled());
 await page.click('#PaintUndo');assert.equal(await page.evaluate(()=>CliffApp.State.Specification.DetailPaint.length),0);
 await drag();const stamps=await page.evaluate(()=>structuredClone(CliffApp.State.Specification.DetailPaint));
 fs.mkdirSync('docs/terrain/paint-renders',{recursive:true});
 const capture=async name=>{const data=await page.evaluate(()=>{const a=CliffApp;a.Renderer.shadowMap.enabled=true;a.Renderer.shadowMap.needsUpdate=true;a.Renderer.render(a.Scene,a.Camera);return a.Renderer.domElement.toDataURL();});fs.writeFileSync(`docs/terrain/paint-renders/${name}.png`,Buffer.from(data.split(',')[1],'base64'));};
 await page.mouse.move(20,20);await capture('painted-mask');
 await page.click('#PaintToggle');assert(!(await page.evaluate(()=>CliffApp.State.Painting)));assert(!(await page.locator('#ToolMove').isDisabled()));
 await page.evaluate(()=>CliffApp.SetSpecification({DetailBias:.5,DetailPattern:'Fractal'}));await ready();
 const d=await page.evaluate(()=>CliffApp.State.Result.Stages[5].Detail);assert(d.affectedVertices>0&&d.affectedVertices<d.mouldVerticesMoved*.5);assert(d.removedVolume>0);
 assert.deepEqual(await page.evaluate(()=>CliffApp.State.Result.ExecutedStages),[6]);
 await capture('localized-cut');
 const download=page.waitForEvent('download');await page.click('#ExportRecipe');const recipe=JSON.parse(fs.readFileSync(await(await download).path(),'utf8'));assert.equal(recipe.Version,10);assert.deepEqual(recipe.Specification.DetailPaint,stamps);
 fs.writeFileSync('docs/terrain/paint-renders/recipe.json',JSON.stringify(recipe,null,2));
 fs.writeFileSync('docs/terrain/paint-renders/measurements.json',JSON.stringify(d,null,2));
 const importRevision=await page.evaluate(()=>CliffApp.State.Revision);
 await page.setInputFiles('#RecipeFile',{name:'paint.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(recipe))});await page.waitForFunction(revision=>CliffApp.State.Revision>revision,importRevision);await ready();assert.deepEqual(await page.evaluate(()=>CliffApp.State.Specification.DetailPaint),stamps);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,realPointerPainting:true,posedPainting:true,undo:true,maskExportImport:true,detailOnlyRebuild:true,errors,detail:d},null,2));
}finally{await browser.close();await server.close();}

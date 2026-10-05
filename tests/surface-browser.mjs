import assert from 'node:assert/strict';import fs from 'node:fs';import {chromium} from '@playwright/test';import {createServer} from 'vite';
const server=await createServer({configFile:false,root:'site',server:{host:'0.0.0.0',port:5197}});await server.listen();
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],failed=[];page.on('pageerror',e=>{errors.push(e.message);console.error(e.stack);});page.on('response',r=>{if(r.status()>=400)failed.push(r.url());});
 await page.goto('http://127.0.0.1:5197/terrain/index.html');
 const ready=()=>page.waitForFunction(()=>window.CliffApp?.SurfaceStudy.State.Result&&!CliffApp.SurfaceStudy.State.Busy&&!CliffApp.SurfaceStudy.State.Pending&&!CliffApp.State.Busy&&!CliffApp.State.Dirty,null,{timeout:120000});await ready();
 const frame=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 fs.mkdirSync('.arena',{recursive:true});
 const capture=async name=>{await frame();const image=await page.evaluate(()=>CliffApp.Renderer.domElement.toDataURL());fs.writeFileSync('.arena/surface-'+name+'.png',Buffer.from(image.split(',')[1],'base64'));return image;};
 const albedo=await capture('albedo');
 const variations=await page.evaluate(()=>{const a=CliffApp,c=document.createElement('canvas');c.width=a.Renderer.domElement.width;c.height=a.Renderer.domElement.height;const ctx=c.getContext('2d');ctx.drawImage(a.Renderer.domElement,0,0);return new Set(Array.from({length:18},(_,i)=>Array.from(ctx.getImageData(400,320+i*10,1,1).data).join(','))).size;});assert(variations>5,'first on-demand PBR frame must show texture variation, not an unrefreshed constant UV');assert.equal(await page.evaluate(()=>CliffApp.State.Mode),'Surface');
 assert(await page.evaluate(()=>CliffApp.BodyGroup.children.every(b=>b.geometry.getAttribute('uv')&&b.material.map?.isDataTexture)));
 assert(await page.evaluate(()=>{const a=CliffApp,b=a.BodyGroup.children[0];let enabled=false;b.onAfterRender=()=>{const gl=a.Renderer.getContext(),program=gl.getParameter(gl.CURRENT_PROGRAM),i=gl.getAttribLocation(program,'uv');enabled=i>=0&&gl.getVertexAttrib(i,gl.VERTEX_ATTRIB_ARRAY_ENABLED);};a.Renderer.render(a.Scene,a.Camera);b.onAfterRender=()=>{};return enabled;}),'PBR UV input must be bound, not a constant atlas texel');
 await page.click('#SurfaceBefore');const fresh=await capture('fresh');assert.notEqual(fresh,albedo,'aged material differs from fresh');
 for(const name of ['Height','Slope','Curvature','Pointiness','AO','Runoff','Splat']){await page.selectOption('#SurfaceView',name);assert.notEqual(await capture(name),albedo);}
 await page.selectOption('#SurfaceView','Albedo');await page.click('#Clay');await frame();assert.equal(await page.evaluate(()=>CliffApp.State.Mode),'Clay');await page.click('#Surface');
 // Full stage 5 must bake actual fracture/fissure faces, not painted crack noise.
 await page.locator('[data-stage="5"]').click();await page.click('#Regenerate');await ready();await page.selectOption('#SurfaceView','Albedo');await capture('stage5');
 await page.selectOption('#SurfaceView','Cracks');await capture('cracks');assert(await page.evaluate(()=>CliffApp.SurfaceStudy.State.Result.maps.Cracks.some((v,i)=>i%4===0&&v>0)));
 await page.selectOption('#SurfaceView','Albedo');
 // Export the real texture pack, retaining UVs and alpha-channel splat data.
 const download=page.waitForEvent('download',{timeout:120000});await page.click('#SurfaceExport');const file=await download;assert.equal(file.suggestedFilename(),'Frontier-surface-maps.zip');await file.saveAs('.arena/surface-pack.zip');
 const recipeDownload=page.waitForEvent('download');await page.click('#ExportRecipe');const recipe=JSON.parse(fs.readFileSync(await (await recipeDownload).path(),'utf8'));assert.equal(recipe.Version,8);assert.equal(recipe.Surface.Cycles,80);
 // Surface settings rebake without regenerating mesh geometry.
 await page.locator('#SurfaceControls').evaluate(el=>el.closest('details').open=true);
 const rev=await page.evaluate(()=>CliffApp.State.ReadyRevision),oldBake=await page.evaluate(()=>CliffApp.SurfaceStudy.State.ReadyRevision);
 await page.locator('#SurfaceRain').evaluate(el=>{el.value='0';el.dispatchEvent(new Event('input',{bubbles:true}));});await ready();
 assert.equal(await page.evaluate(()=>CliffApp.State.ReadyRevision),rev);assert((await page.evaluate(()=>CliffApp.SurfaceStudy.State.ReadyRevision))>oldBake);
 assert(await page.evaluate(()=>CliffApp.SurfaceStudy.State.Result.maps.Weathering.every((v,i)=>i%4===3||v===0)));
 const beforeImport=await page.evaluate(()=>CliffApp.SurfaceStudy.State.ReadyRevision);
 await page.setInputFiles('#RecipeFile',{name:'surface.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(recipe))});await page.waitForFunction(rev=>CliffApp.SurfaceStudy.State.ReadyRevision>rev&&!CliffApp.SurfaceStudy.State.Pending&&!CliffApp.SurfaceStudy.State.Busy&&CliffApp.SurfaceStudy.State.Result?.settings.Rain===.7,beforeImport,{timeout:120000});await ready();assert.equal(await page.evaluate(()=>CliffApp.SurfaceStudy.State.Settings.Rain),.7);
 assert((await page.evaluate(()=>CliffApp.SurfaceStudy.State.Result.stats.waterLedger.supplied))>0);
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
 const stats=await page.evaluate(()=>CliffApp.SurfaceStudy.State.Result.stats);console.log(JSON.stringify({passed:true,actualTextures:true,mapViews:7,stage5Cracks:true,zipExport:true,recipeVersion:8,settingsDoNotRebuildGeometry:true,stats,errors,failedRequests:failed},null,2));
}finally{await browser.close();await server.close();}

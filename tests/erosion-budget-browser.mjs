import assert from 'node:assert/strict';import {chromium} from '@playwright/test';import {createServer} from 'vite';
const server=await createServer({configFile:false,root:'site',server:{host:'0.0.0.0',port:5194}});await server.listen();
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const ready=async p=>{await p.waitForFunction(()=>CliffApp.State&&!CliffApp.State.Busy&&(CliffApp.State.Error||CliffApp.State.Result),null,{timeout:240000});assert.equal(await p.evaluate(()=>CliffApp.State.Error),null);};
 await page.goto('http://127.0.0.1:5194/terrain/index.html?stage=5.1');
 await page.waitForFunction(()=>window.CliffApp?.State.Busy);
 await page.locator('#Regenerate').click();
 assert.equal(await page.evaluate(()=>CliffApp.State.Busy),false);assert(await page.locator('#Loading').isHidden());
 await page.locator('#Regenerate').click();await ready(page);
 assert.equal(await page.evaluate(()=>CliffApp.State.Result.Erosion.Erosion.budgetExceeded),false);
 assert(await page.locator('#ErosionNotice').isHidden());
 await page.locator('#NextStage').click();await page.locator('#Regenerate').click();await ready(page);
 assert.equal(await page.evaluate(()=>CliffApp.State.Result.Stages[5].Number),6);
 assert(!(await page.locator('#ExportObj').isDisabled()));
 // Fault-inject a fast monotonic clock in the actual production worker, not a
 // fabricated result. This deterministically exercises the deadline fallback.
 const context=await browser.newContext();
 await context.route('**/GenerationQueue-*.js',async route=>{const response=await route.fetch();await route.fulfill({response,body:'let testClock=0;Object.defineProperty(performance,"now",{value:()=>testClock+=5000});\n'+await response.text()});});
 const fallback=await context.newPage();fallback.on('pageerror',e=>errors.push(e.message));
 await fallback.goto('http://127.0.0.1:5194/terrain/index.html?stage=6');await ready(fallback);
 assert.equal(await fallback.evaluate(()=>CliffApp.State.Result.Erosion.Erosion.budgetExceeded),true);
 assert.equal(await fallback.evaluate(()=>CliffApp.State.Result.Erosion.Meshes===CliffApp.State.Result.Stages[4].Meshes),true);
 assert(await fallback.locator('#ErosionNotice').isVisible());
 assert(!(await fallback.locator('#ExportObj').isDisabled()));
 const metrics=await fallback.evaluate(()=>CliffApp.State.Result.Stages[5].Metrics);
 for(const key of ['ZeroArea','OpenEdges','NonmanifoldEdges','NonmanifoldVertices','WindingErrors','DuplicateTriangles'])assert.equal(metrics[key],0,key);
 assert.deepEqual(errors,[]);
 console.log('PASS: production worker cancellation, normal 5.1→6, forced deadline/current-stage-5 fallback, visible warning, validated stage-6 export.');
}finally{await browser.close();await server.close();}

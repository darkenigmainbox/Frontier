import assert from 'node:assert/strict';import {chromium} from '@playwright/test';import {createServer} from 'vite';
const server=await createServer({configFile:false,root:'site',server:{host:'0.0.0.0',port:5193}});await server.listen();
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5193/terrain/index.html?stage=6');
 const ready=async()=>{await page.waitForFunction(()=>CliffApp.State&&!CliffApp.State.Busy&&(CliffApp.State.Error||CliffApp.State.Result),null,{timeout:240000});assert.equal(await page.evaluate(()=>CliffApp.State.Error),null);};await ready();
 for(const depth of [.5,1.5]){
  await page.evaluate(depth=>CliffApp.SetSpecification({DetailMaskMode:'Paint',DetailBias:depth}),depth);await ready();
  const result=await page.evaluate(()=>({metrics:CliffApp.State.Result.Stages[5].Metrics,executed:CliffApp.State.Result.ExecutedStages,repairs:CliffApp.State.Result.Stages[5].Detail.exchangeRepairs,faces:(CliffApp.ObjText().match(/^f /gm)||[]).length}));
  for(const key of ['ZeroArea','OpenEdges','NonmanifoldEdges','NonmanifoldVertices','WindingErrors','DuplicateTriangles'])assert.equal(result.metrics[key],0);
  assert.deepEqual(result.executed,[6]);assert.equal(result.faces,result.metrics.Triangles);assert(!(await page.locator('#ExportObj').isDisabled()));console.log(JSON.stringify({depth,...result}));
 }
 assert.deepEqual(errors,[]);console.log('PASS: both repaired cases in production browser worker; final mesh export enabled.');
}finally{await browser.close();await server.close();}

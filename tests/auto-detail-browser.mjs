import assert from 'node:assert/strict';import fs from 'node:fs';
import {chromium} from '@playwright/test';import {createServer} from 'vite';
const server=await createServer({configFile:false,root:'site',server:{host:'0.0.0.0',port:5195}});await server.listen();
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.setDefaultTimeout(90000);page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5195/terrain/index.html?stage=6');
 const ready=()=>page.waitForFunction(()=>CliffApp.State.Result&&!CliffApp.State.Busy&&!CliffApp.State.Dirty,null,{timeout:180000});await ready();
 assert.equal(await page.locator('#DetailMaskMode').inputValue(),'Auto');assert(await page.locator('#AutoMaskControls').isVisible());assert(!(await page.locator('#ManualPaintTools').isVisible()));
 const first=await page.evaluate(()=>CliffApp.State.Result.Stages[5].Detail);assert(first.affectedVertices<first.mouldVerticesMoved);
 await page.click('#PaintToggle');assert.match(await page.locator('#StageDescription').textContent(),/AUTO MASK PREVIEW/);
 const r=await page.locator('#SceneCanvas').boundingBox();await page.mouse.click(r.x+r.width*.5,r.y+r.height*.5);
 assert.equal(await page.evaluate(()=>CliffApp.State.Specification.DetailPaint.length),0,'Auto preview cannot paint');
 await page.click('#PaintToggle');
 await page.selectOption('#DetailMaskMode','AutoPaint');assert(await page.locator('#AutoMaskControls').isVisible());assert(await page.locator('#ManualPaintTools').isVisible());assert(await page.locator('#PaintProtectAll').isDisabled());
 await page.selectOption('#DetailMaskMode','Paint');assert(!(await page.locator('#AutoMaskControls').isVisible()));assert(!(await page.locator('#PaintProtectAll').isDisabled()));
 await page.selectOption('#DetailMaskMode','Auto');await page.locator('#DetailAutoCoverage').fill('0');await page.click('#Regenerate');await ready();
 assert.equal(await page.evaluate(()=>CliffApp.State.Result.Stages[5].Detail.removedVolume),0);
 assert.deepEqual(await page.evaluate(()=>CliffApp.State.Result.ExecutedStages),[6]);
 await page.locator('#DetailAutoCoverage').fill('0.45');await page.click('#Regenerate');await ready();
 assert.equal(await page.evaluate(()=>CliffApp.State.Specification.DetailMaskMode),'Auto');
 const download=page.waitForEvent('download');await page.click('#ExportRecipe');const recipe=JSON.parse(fs.readFileSync(await(await download).path(),'utf8'));assert.equal(recipe.Version,11);assert.equal(recipe.Specification.DetailMaskMode,'Auto');
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,default:'Auto',threeModes:true,previewCannotPaint:true,zeroCoverage:true,stage6Only:true,recipe11:true,errors,detail:first},null,2));
}finally{await browser.close();await server.close();}

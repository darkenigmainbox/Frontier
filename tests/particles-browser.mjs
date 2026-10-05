import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from '@playwright/test';
import {createServer} from 'vite';
const server=await createServer({configFile:false,root:'site',server:{host:'0.0.0.0',port:5192}});await server.listen();
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],failed=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(r.url());});
 await page.goto('http://127.0.0.1:5192/terrain/index.html?particles');
 const ready=()=>page.waitForFunction(()=>window.GrainApp?.Parameters.Result&&!GrainApp.Parameters.Busy&&!GrainApp.Parameters.Replaying,null,{timeout:120000});await ready();
 assert.equal(await page.locator('.StageButton').count(),5,'stage 6 reverted');
 assert.equal(await page.evaluate(()=>GrainApp.Parameters.Error),null);
 const snapshot=()=>page.evaluate(async()=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',GrainApp.Parameters.Result.attributes))).map(v=>v.toString(16).padStart(2,'0')).join(''));
 const freshHash=await snapshot();const initial=await page.evaluate(()=>GrainApp.Parameters.Result.metrics);
 assert.equal(initial.particles,5000);assert.equal(initial.cycle,0);
 await page.click('#ParticleStep');await ready();
 await page.evaluate(()=>{const el=document.querySelector('#PRain');el.value='.9';el.dispatchEvent(new Event('input',{bubbles:true}));});
 await page.click('#ParticleStep');await ready();
 const weatheredHash=await snapshot();assert.notEqual(weatheredHash,freshHash);
 const frame=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await frame();
 const live=await page.evaluate(()=>GrainApp.Renderer.domElement.toDataURL());await page.click('#ParticleBefore');await frame();
 assert.notEqual(await page.evaluate(()=>GrainApp.Renderer.domElement.toDataURL()),live);assert.equal(await snapshot(),weatheredHash,'comparison does not mutate physics');
 await page.click('#ParticleBefore');await frame();
 const download=page.waitForEvent('download');await page.click('#GrainSave');const file=await download;
 const recipe=JSON.parse(fs.readFileSync(await file.path(),'utf8'));assert.equal(recipe.format,'Frontier.ParticleWeathering');assert.equal(recipe.cycles,50);assert.deepEqual(recipe.events.map(e=>e.cycle),[0,25]);
 await page.click('#ParticleReset');await ready();assert.equal(await snapshot(),freshHash);
 await page.setInputFiles('#ParticleFile',{name:'study.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(recipe))});
 await page.waitForFunction(()=>GrainApp.Parameters.Result?.metrics.cycle===50&&!GrainApp.Parameters.Replaying&&!GrainApp.Parameters.Busy,null,{timeout:120000});
 assert.equal(await snapshot(),weatheredHash,'browser save/load replays particles exactly');
 await page.selectOption('#ParticleChannel','oxide');await frame();assert.notEqual(await page.evaluate(()=>GrainApp.Renderer.domElement.toDataURL()),live);
 await page.selectOption('#ParticleChannel','mineral');
 await page.click('#ParticleContext');assert(await page.evaluate(()=>GrainApp.Camera.position.length()>1));await page.click('#ParticleMacro');assert(await page.evaluate(()=>GrainApp.Camera.position.length()<.2));
 // Presets and rebuilt thickness/radius must actually repack the particles.
 await page.locator('[data-rock="Granite"]').click();await ready();assert.equal(await page.evaluate(()=>GrainApp.Parameters.Result.spec.Preset),'Granite');
 await page.evaluate(()=>{const el=document.querySelector('#PThickness');el.value='.001';el.dispatchEvent(new Event('input',{bubbles:true}));});assert(await page.locator('#ParticlePlay').isDisabled());
 await page.click('#ParticleBuild');await ready();assert.equal(await page.evaluate(()=>GrainApp.Parameters.Result.spec.Thickness),.001);
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
 console.log(JSON.stringify({passed:true,initial,savedCycles:recipe.cycles,exactReplay:true,stageCount:5,errors,failedRequests:failed},null,2));
}finally{await browser.close();await server.close();}

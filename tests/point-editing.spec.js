import {test,expect} from '@playwright/test';

const source={id:'test-shape',name:'Point editing fixture',points:[[-.35,.1],[-.05,.1],[-.05,.9],[-.35,.9]],sipes:[[[-.3,.3],[-.2,.5],[-.1,.3]]],role:'lug',heightRatio:1,enabled:true,phase:'1',mirror:{mode:'width',axisX:0,axisY:.5,stagger:0}};
async function boot(page,triangle=false){
  const design={version:1,name:'Point editing',preset:'rugged',modified:true,shapes:[structuredClone(source)]};
  if(triangle)design.shapes[0].points.pop();
  await page.addInitScript(design=>{localStorage.setItem('frontier-ui-mode','designer');localStorage.setItem('frontier-tread-v1',JSON.stringify({pattern:'rugged',radius:340,width:285,depth:16,repeats:32,gap:1,sipes:true,casing:true,view:'flat',patternRevision:7,design}));},design);
  await page.setViewportSize({width:1600,height:1000});await page.goto('/');await page.waitForFunction(()=>window.__treadLab?.ready);
}
async function coords(page,x,y){return page.evaluate(([x,y])=>{const svg=document.querySelector('#design-canvas'),s=window.__treadLab.settings;const p=new DOMPoint(x*s.width,y*2*Math.PI*s.radius/s.repeats).matrixTransform(svg.getScreenCTM());return {x:p.x,y:p.y};},[x,y]);}
async function click(page,x,y,keys=[]){const p=await coords(page,x,y);for(const k of keys)await page.keyboard.down(k);await page.mouse.click(p.x,p.y);for(const k of [...keys].reverse())await page.keyboard.up(k);}
const handle=(page,index,sipe='')=>page.locator(`#design-canvas [data-vertex="${index}"][data-sipe="${sipe}"]`);
const current=page=>page.evaluate(()=>window.__treadLab.settings.design.shapes[0]);
async function count(page,n,sipe=false){await page.waitForFunction(({n,sipe})=>window.__treadLab?.ready&&(sipe?window.__treadLab.settings.design.shapes[0].sipes[0]?.length:window.__treadLab.settings.design.shapes[0].points.length)===n,{n,sipe});}

test('Ctrl/Cmd inserts outline and cut points, Alt removes; edits remain local in B and undo in one step',async({page})=>{
  test.setTimeout(120000);const errors=[];page.on('pageerror',e=>errors.push(e.message));await boot(page);
  await handle(page,0).click();await expect(page.locator('#undo-design')).toBeDisabled();
  const view=await page.locator('#design-canvas').getAttribute('viewBox');
  await click(page,-.35,1.5,['Control']);await count(page,5);
  const s=await current(page);expect(s.points[4][0]).toBeCloseTo(-.35);expect(s.points[4][1]).toBeCloseTo(.5,3);
  await handle(page,4).click({modifiers:['Alt']});await count(page,4);
  expect(await page.locator('#design-canvas').getAttribute('viewBox')).toBe(view);
  await page.locator('#undo-design').click();await count(page,5);
  await page.locator('#redo-design').click();await count(page,4);
  await click(page,-.2,1.1,['Meta']);await count(page,5);
  await page.locator('#undo-design').click();await count(page,4);
  await click(page,-.25,1.4,['Control']);await count(page,4,true);
  expect((await current(page)).sipes[0][1][1]).toBeCloseTo(.4,3);
  await handle(page,1,'0').click({modifiers:['Alt']});await count(page,3,true);
  await page.locator('#undo-design').click();await count(page,4,true);
  await page.locator('#redo-design').click();await count(page,3,true);
  expect((await current(page)).points).toEqual(source.points);
  expect((await current(page)).mirror).toEqual(source.mirror);
  await expect(page.locator('#error')).toBeHidden();expect(errors).toEqual([]);
});

test('Cut points and entire cut lines can be reshaped, Shift constrained and extended at either endpoint',async({page})=>{
  test.setTimeout(150000);await boot(page);
  const rect=await handle(page,1,'0').boundingBox();
  await page.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2);await page.keyboard.down('Shift');await page.mouse.down();await page.mouse.move(rect.x+rect.width/2+14,rect.y+rect.height/2+3,{steps:3});await page.mouse.up();await page.keyboard.up('Shift');
  await page.waitForFunction(()=>window.__treadLab.settings.design.shapes[0].sipes[0][1][0]!==-.2);
  expect((await current(page)).sipes[0][1][1]).toBe(.5);
  await page.locator('#undo-design').click();await page.waitForFunction(()=>window.__treadLab.settings.design.shapes[0].sipes[0][1][0]===-.2);
  const start=await coords(page,-.25,1.4);
  await page.mouse.move(start.x,start.y);await page.mouse.down();await page.keyboard.down('Shift');await page.mouse.move(start.x+12,start.y+2,{steps:3});await page.mouse.up();await page.keyboard.up('Shift');
  await page.waitForFunction(()=>window.__treadLab.settings.design.shapes[0].sipes[0][0][0]!==-.3);
  const changed=await current(page);expect(changed.points).toEqual(source.points);
  const delta=changed.sipes[0][0][0]-source.sipes[0][0][0];
  changed.sipes[0].forEach((p,i)=>{expect(p[0]-source.sipes[0][i][0]).toBeCloseTo(delta,8);expect(p[1]).toBe(source.sipes[0][i][1]);});
  await page.locator('#undo-design').click();await page.waitForFunction(()=>window.__treadLab.settings.design.shapes[0].sipes[0][0][0]===-.3);
  await handle(page,2,'0').click();await click(page,-.07,1.7,['Control','Shift']);await count(page,4,true);
  expect((await current(page)).sipes[0][3][0]).toBeCloseTo(-.07,3);
  await handle(page,0,'0').click();await click(page,-.33,1.65,['Control','Shift']);await count(page,5,true);
  expect((await current(page)).sipes[0][0][1]).toBeCloseTo(.65,3);
  await handle(page,4,'0').click();await page.locator('#add-vertex').click();await count(page,6,true);
  const cut=(await current(page)).sipes[0];expect(cut[5][1]).toBeCloseTo(.7,3);expect(cut[4][1]).toBeCloseTo(.5,3);
  await page.locator('#delete-cut').click();await page.waitForFunction(()=>window.__treadLab.settings.design.shapes[0].sipes.length===0);
  await page.locator('#undo-design').click();await count(page,6,true);
  await expect(page.locator('#error')).toBeHidden();
});

test('Minimum outline guard, two-point cut deletion, pan and mirror protection',async({page})=>{
  test.setTimeout(120000);await boot(page,true);
  await handle(page,1).click({modifiers:['Alt']});await expect(page.locator('#toast')).toContainText('at least three');expect((await current(page)).points).toHaveLength(3);
  await handle(page,1,'0').click({modifiers:['Alt']});await count(page,2,true);
  await handle(page,0,'0').click({modifiers:['Alt']});await page.waitForFunction(()=>window.__treadLab.settings.design.shapes[0].sipes.length===0);
  await page.locator('#undo-design').click();await count(page,2,true);
  // The right-hand triangle is a linked width mirror, not a second source.
  await click(page,.2,1.1,['Control']);await expect(page.locator('#toast')).toContainText('linked copy');expect((await current(page)).points).toHaveLength(3);
  const view=await page.locator('#design-canvas').getAttribute('viewBox');const bounds=await page.locator('#design-canvas').boundingBox();
  await page.mouse.move(bounds.x+20,bounds.y+30);await page.mouse.down({button:'right'});await page.mouse.move(bounds.x+40,bounds.y+45,{steps:3});await page.mouse.up({button:'right'});
  expect(await page.locator('#design-canvas').getAttribute('viewBox')).not.toBe(view);expect((await current(page)).points).toHaveLength(3);
});

import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';

async function clickPoint(page,x,y){
  const p=await page.evaluate(([x,y])=>{const svg=document.querySelector('#design-canvas'),s=window.__treadLab.settings;const point=new DOMPoint(x*s.width,y*2*Math.PI*s.radius/s.repeats).matrixTransform(svg.getScreenCTM());return {x:point.x,y:point.y};},[x,y]);
  await page.mouse.click(p.x,p.y);
}

test('Designer edits linked mirrors and vertices, undo/redo, arbitrary polygons/sipes, JSON/SVG/STL and persistence',async({page})=>{
  test.setTimeout(240000);const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',dialog=>dialog.accept());
  await page.setViewportSize({width:1600,height:1000});await page.goto('/');await page.waitForFunction(()=>window.__treadLab?.ready);
  await expect(page.locator('body')).toHaveClass('designer-mode');
  expect(await page.evaluate(()=>getComputedStyle(document.body).backgroundColor)).toBe('rgb(9, 10, 12)');
  await expect(page.locator('[data-select-shape]')).toHaveCount(4);
  await page.locator('#mirror-mode').selectOption('width');
  await page.locator('#mirror-x').fill('12');await page.locator('#mirror-x').press('Tab');
  await page.waitForFunction(()=>Math.abs(window.__treadLab.settings.design.shapes[0].mirror.axisX-12/285)<1e-6);
  await page.locator('#mirror-stagger').fill('0.35');await page.locator('#mirror-stagger').press('Tab');
  await page.waitForFunction(()=>window.__treadLab.settings.design.shapes[0].mirror.stagger===.35);
  const before=await page.evaluate(()=>window.__treadLab.settings.design.shapes[0].points[1]);
  const handle=page.locator('#design-canvas [data-vertex="1"][data-sipe=""]');const rect=await handle.boundingBox();
  await page.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2);await page.mouse.down();await page.mouse.move(rect.x+rect.width/2+5,rect.y+rect.height/2+3,{steps:3});await page.mouse.up();
  await page.waitForFunction(before=>JSON.stringify(window.__treadLab.settings.design.shapes[0].points[1])!==JSON.stringify(before),before);
  await page.locator('#undo-design').click();await page.waitForFunction(before=>JSON.stringify(window.__treadLab.settings.design.shapes[0].points[1])===JSON.stringify(before),before);
  await page.locator('#redo-design').click();await page.waitForFunction(before=>JSON.stringify(window.__treadLab.settings.design.shapes[0].points[1])!==JSON.stringify(before),before);
  await page.locator('#new-kind').selectOption('triangle');await page.locator('#add-shape').click();
  await page.waitForFunction(()=>window.__treadLab.settings.design.shapes.length===5);
  await page.locator('#mirror-mode').selectOption('both');await page.waitForFunction(()=>window.__treadLab.settings.design.shapes[4].mirror.mode==='both');
  await page.locator('#bake-mirrors').click();await page.waitForFunction(()=>window.__treadLab.settings.design.shapes.length===8);
  await page.locator('[data-tool="polygon"]').click();
  for(const p of [[.12,.12],[.28,.12],[.28,.64],[.12,.64]])await clickPoint(page,...p);
  await page.locator('#finish-draw').click();await page.waitForFunction(()=>window.__treadLab.settings.design.shapes.length===9);
  await page.locator('[data-tool="sipe"]').click();await clickPoint(page,.15,.30);await clickPoint(page,.25,.38);await page.locator('#finish-draw').click();
  await page.waitForFunction(()=>window.__treadLab.settings.design.shapes[8].sipes.length===1);
  await expect(page.locator('#error')).toBeHidden();
  let pending=page.waitForEvent('download');await page.locator('#save-design').click();const projectDownload=await pending;const project=await fs.readFile(await projectDownload.path());
  const saved=JSON.parse(project.toString());expect(saved.design.shapes).toHaveLength(9);expect(saved.design.shapes[0].mirror.mode).toBe('width');
  pending=page.waitForEvent('download');await page.locator('#export-svg').click();const svgDownload=await pending;const svg=await fs.readFile(await svgDownload.path(),'utf8');expect(svg).toContain('<svg');expect(svg).toContain('<path');expect(svg).not.toContain('<image');
  await page.locator('#blank-design').click();await page.waitForFunction(()=>window.__treadLab.settings.design.shapes.length===0);
  await page.locator('#design-file').setInputFiles({name:'project.json',mimeType:'application/json',buffer:project});await page.waitForFunction(()=>window.__treadLab.settings.design.shapes.length===9);
  await page.locator('[data-view="flat"]').click();await page.waitForFunction(()=>window.__treadLab.settings.view==='flat');
  await page.locator('#export-format').selectOption('stl');pending=page.waitForEvent('download');await page.locator('#export').click();const download=await pending,bytes=await fs.readFile(await download.path());
  expect(bytes.readUInt32LE(80)).toBe(await page.evaluate(()=>window.__treadLab.triangles));expect(bytes.length).toBe(84+50*bytes.readUInt32LE(80));
  await page.reload();await page.waitForFunction(()=>window.__treadLab?.settings.design.shapes.length===9);
  await expect(page.locator('[data-select-shape]')).toHaveCount(9);
  expect(await page.evaluate(()=>window.__treadLab.settings.design.shapes[0].mirror.stagger)).toBe(.35);
  expect(errors).toEqual([]);
});

test('Preset replacement undo restores dimensions too; invalid imports are safe; mobile has no overflow',async({page})=>{
  test.setTimeout(120000);page.on('dialog',dialog=>dialog.accept());
  await page.goto('/');await page.waitForFunction(()=>window.__treadLab?.ready);
  await page.locator('#design-preset').selectOption('highway');await page.locator('#load-preset').click();await page.waitForFunction(()=>window.__treadLab.settings.pattern==='highway');
  expect(await page.evaluate(()=>window.__treadLab.settings.width)).toBe(235);
  await page.locator('#undo-design').click();await page.waitForFunction(()=>window.__treadLab.settings.pattern==='rugged');
  expect(await page.evaluate(()=>window.__treadLab.settings.width)).toBe(285);
  await page.locator('#design-file').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{"version":100}')});
  await expect(page.locator('#toast')).toContainText('Cannot open project');
  expect(await page.evaluate(()=>window.__treadLab.settings.pattern)).toBe('rugged');
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.locator('#design-canvas').scrollIntoViewIfNeeded();await expect(page.locator('#design-canvas')).toBeVisible();
  await page.locator('#export').scrollIntoViewIfNeeded();await expect(page.locator('#export')).toBeEnabled();
});

test('Invalid editable outlines pause export without losing the draft; undo recovers',async({page})=>{
  page.on('dialog',dialog=>dialog.accept());await page.goto('/');await page.waitForFunction(()=>window.__treadLab?.ready);
  const project=await page.evaluate(()=>{const {design,...settings}=window.__treadLab.settings;const draft=structuredClone(design);draft.name='Crossed draft';draft.modified=true;draft.shapes=draft.shapes.slice(0,1);draft.shapes[0].points=[[-.2,.1],[.2,.9],[-.2,.9],[.2,.1]];return {format:'frontier-tread',version:1,settings,design:draft};});
  await page.locator('#design-file').setInputFiles({name:'crossed.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(project))});
  await expect(page.locator('#error')).toContainText('Preview paused');await expect(page.locator('#export')).toBeDisabled();
  await expect(page.locator('#design-name')).toHaveValue('Crossed draft');
  await page.locator('#undo-design').click();await page.waitForFunction(()=>window.__treadLab?.ready);
  await expect(page.locator('#error')).toBeHidden();await expect(page.locator('#export')).toBeEnabled();
});

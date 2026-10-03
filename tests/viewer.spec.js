import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';

test.beforeEach(async({page})=>{await page.addInitScript(()=>localStorage.setItem('frontier-ui-mode','viewer'));});

test('Patterns, views, mesh controls, persistence and real downloads work',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');await page.waitForFunction(()=>window.__treadLab?.ready);
  expect(await page.evaluate(()=>window.__treadLab.revision)).toBe(7);
  for(const pattern of ['highway','all-terrain','rugged','mud']){
    await page.locator(`[data-pattern="${pattern}"]`).click();
    await page.waitForFunction(p=>window.__treadLab.settings.pattern===p,pattern);
    await expect(page.locator(`[data-pattern="${pattern}"]`)).toHaveAttribute('aria-pressed','true');
    if(pattern==='rugged'){
      await page.locator('#blueprint').click();
      await expect(page.locator('.family-key li')).toHaveCount(4);
      await expect(page.locator('#dialog-content')).toContainText('mirror both width and travel direction');
      for(const family of ['shoulder','upright','center','diagonal'])expect(await page.locator(`#dialog-content path[data-family="${family}"]`).count()).toBeGreaterThan(0);
      await page.locator('#close-dialog').click();
    }
    if(pattern==='mud'){
      await page.locator('#blueprint').click();
      await expect(page.locator('.family-key li')).toHaveCount(4);
      await expect(page.locator('#dialog-content')).toContainText('bars are only 24% of tread depth');
      for(const family of ['shoulder','center','outer-ejector','inner-ejector'])expect(await page.locator(`#dialog-content path[data-family="${family}"]`).count()).toBeGreaterThan(0);
      await page.locator('#close-dialog').click();
    }
  }
  await page.locator('[data-view="flat"]').click();await page.waitForFunction(()=>window.__treadLab.settings.view==='flat');
  expect(await page.evaluate(()=>window.__treadLab.ejectors)).toBe(24);
  expect(await page.evaluate(()=>window.__treadLab.blocks)).toBe(24);
  const before=await page.evaluate(()=>window.__treadLab.triangles);
  await page.locator('#sipes').uncheck();await page.waitForFunction(()=>!window.__treadLab.settings.sipes);
  expect(await page.evaluate(()=>window.__treadLab.triangles)).toBeLessThan(before);
  await page.locator('#casing').uncheck();await page.waitForFunction(()=>!window.__treadLab.settings.casing);
  await page.locator('#wireframe').click();await expect(page.locator('#wireframe')).toHaveAttribute('aria-pressed','true');
  await page.locator('#width').fill('320');await page.locator('#width').dispatchEvent('input');await page.waitForFunction(()=>window.__treadLab.settings.width===320);
  await page.reload();await page.waitForFunction(()=>window.__treadLab?.settings.width===320);
  await expect(page.locator('#width-value')).toHaveText('320');
  await page.locator('#blueprint').click();await expect(page.locator('#info-dialog')).toBeVisible();await page.keyboard.press('Escape');
  await page.locator('#about').click();await expect(page.locator('#dialog-content')).toContainText('not a boolean-unioned');await page.locator('#close-dialog').click();
  for(const format of ['stl','obj']){
    await page.locator('#export-format').selectOption(format);
    const downloadPromise=page.waitForEvent('download');await page.locator('#export').click();const download=await downloadPromise;
    expect(download.suggestedFilename()).toBe(`frontier-mud-flat-320mm.${format}`);
    const bytes=await fs.readFile(await download.path());
    if(format==='stl'){const count=bytes.readUInt32LE(80);expect(count).toBeGreaterThan(100);expect(bytes.length).toBe(84+count*50);}
    else{expect(bytes.toString()).toContain('o Extruded_tread_blocks_and_sipes');expect(bytes.toString()).toContain('\nf ');}
  }
  await page.locator('#reset-settings').click();await page.waitForFunction(()=>window.__treadLab.settings.width===305);
  await expect(page.locator('#sipes')).toBeChecked();expect(errors).toEqual([]);
});

test('Mobile workspace has no horizontal overflow and exposes export',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/');await page.waitForFunction(()=>window.__treadLab?.ready);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.locator('[data-pattern="highway"]').click();await page.waitForFunction(()=>window.__treadLab.settings.pattern==='highway');
  await page.locator('#export').scrollIntoViewIfNeeded();await expect(page.locator('#export')).toBeVisible();await expect(page.locator('#export')).toBeEnabled();
});

test('Untouched saved mud preset refreshes to the new reference proportions',async({page})=>{
  await page.addInitScript(()=>{
    localStorage.setItem('frontier-tread-v1',JSON.stringify({pattern:'mud',radius:340,width:305,depth:20,repeats:28,gap:1,sipes:true,casing:true,view:'flat',patternRevision:4}));
  });
  await page.goto('/');await page.waitForFunction(()=>window.__treadLab?.ready);
  expect(await page.evaluate(()=>window.__treadLab.settings.repeats)).toBe(32);
  await expect(page.locator('#repeats-value')).toHaveText('32');
  await expect(page.locator('#error')).toBeHidden();
});

test('New off-road studies: filters, both meshes, reference photos, export and persistence',async({page})=>{
  test.setTimeout(150000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');await page.waitForFunction(()=>window.__treadLab?.ready);
  await expect(page.locator('[data-pattern]')).toHaveCount(8);
  await page.locator('[data-filter="new"]').click();
  await expect(page.locator('[data-pattern]:visible')).toHaveCount(4);
  for(const id of ['trail-hybrid','canyon-rt','baja-interlock','rock-cleat']){
    await page.locator(`[data-pattern="${id}"]`).click();
    await page.waitForFunction(id=>window.__treadLab.settings.pattern===id,id);
    await page.locator('#reset-settings').click();
    for(const view of ['tire','flat']){
      await page.locator(`[data-view="${view}"]`).click();
      await page.waitForFunction(view=>window.__treadLab.settings.view===view,view);
      await expect(page.locator('#error')).toBeHidden();
      expect(await page.evaluate(()=>window.__treadLab.triangles)).toBeGreaterThan(10000);
    }
    await page.locator('#blueprint').click();
    await expect(page.locator('.web-reference')).toBeVisible();
    await page.locator('.web-reference img').scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>document.querySelector('.web-reference img')?.naturalWidth>0);
    await expect(page.locator('.web-reference a').first()).toHaveAttribute('href',/^https:\/\//);
    await expect(page.locator('#dialog-content')).toContainText('not an exact replica');
    await page.locator('#close-dialog').click();
    await page.locator('#export-format').selectOption('stl');
    const downloadPromise=page.waitForEvent('download');await page.locator('#export').click();const download=await downloadPromise;
    expect(download.suggestedFilename()).toContain(`frontier-${id}-flat-`);
    const bytes=await fs.readFile(await download.path());
    expect(bytes.length).toBe(84+50*bytes.readUInt32LE(80));
    expect(bytes.readUInt32LE(80)).toBe(await page.evaluate(()=>window.__treadLab.triangles));
  }
  await page.reload();await page.waitForFunction(()=>window.__treadLab?.settings.pattern==='rock-cleat');
  await expect(page.locator('[data-pattern="rock-cleat"]')).toHaveAttribute('aria-pressed','true');
  await page.locator('[data-filter="original"]').click();await expect(page.locator('[data-pattern]:visible')).toHaveCount(4);
  await page.locator('[data-filter="all"]').click();await expect(page.locator('[data-pattern]:visible')).toHaveCount(8);
  expect(errors).toEqual([]);
});

test('Mobile new library and research dialog stay within the viewport',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('/');await page.waitForFunction(()=>window.__treadLab?.ready);
  await page.locator('[data-filter="new"]').click();
  await page.locator('[data-pattern="rock-cleat"]').click();await page.waitForFunction(()=>window.__treadLab.settings.pattern==='rock-cleat');
  await page.locator('#blueprint').click();await expect(page.locator('#info-dialog')).toBeVisible();
  const overflow=await page.locator('#info-dialog').evaluate(el=>el.scrollWidth>el.clientWidth);
  expect(overflow).toBe(false);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.keyboard.press('Escape');await page.locator('#export').scrollIntoViewIfNeeded();await expect(page.locator('#export')).toBeEnabled();
});

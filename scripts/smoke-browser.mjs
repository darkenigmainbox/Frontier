/**
 * Browser smoke test. Start `npm run dev` first, then run `npm run test:browser`.
 * Set CHROMIUM_EXECUTABLE to a local Chrome/Chromium executable if Playwright's
 * browser is not installed; ROCK_LAB_TEST_URL can point at a preview build.
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';

const baseURL = process.env.ROCK_LAB_TEST_URL || 'http://127.0.0.1:5173/';
const launchOptions = {
  headless: true,
  args: ['--no-sandbox', '--enable-webgl', '--enable-unsafe-swiftshader'],
};
if (process.env.CHROMIUM_EXECUTABLE) launchOptions.executablePath = process.env.CHROMIUM_EXECUTABLE;
if (process.env.ROCK_LAB_LAMBDA_CHROMIUM === '1') {
  launchOptions.args.push('--single-process', '--no-zygote', '--in-process-gpu', '--use-gl=angle', '--use-angle=swiftshader');
}

async function withBrowser(callback) {
  const browser = await chromium.launch(launchOptions);
  try { await callback(browser); }
  finally { await browser.close(); }
}

async function waitForReady(page) {
  await page.waitForFunction(() => document.querySelector('.ready-badge')?.textContent.trim() === 'READY', null, { timeout: 90000 });
}

let expectedMetrics;
await withBrowser(async (browser) => {
  const page = await browser.newPage({ viewport: { width: 1365, height: 900 } });
  const errors = [];
  let workerCount = 0;
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('worker', () => workerCount++);
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await waitForReady(page);
  expectedMetrics = await page.locator('.summary-metrics').innerText();
  assert.equal(workerCount, 1, 'normal mode should start a worker');
  assert.deepEqual(errors, [], 'the normal preview should not throw');
  console.log('✓ Normal worker loads and produces a mesh');
});

await withBrowser(async (browser) => {
  const context = await browser.newContext({ viewport: { width: 1365, height: 900 }, acceptDownloads: true });
  let blocked = 0;
  await context.route((url) => /\/(?:src\/generator\/worker\.js|assets\/worker-[^/]+\.js)$/.test(url.pathname), (route) => {
    blocked++;
    return route.abort('blockedbyclient');
  });
  const page = await context.newPage();
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await waitForReady(page);
  assert.equal(blocked, 1, 'the test should block the worker script');
  assert.equal(await page.locator('.summary-metrics').innerText(), expectedMetrics, 'fallback geometry should match worker geometry');
  const oldDimensions = await page.locator('.summary-dimensions strong').innerText();
  await page.locator('#width').fill('1.4');
  await page.waitForFunction(() => document.querySelector('.ready-badge')?.textContent.trim() !== 'READY');
  await waitForReady(page);
  assert.notEqual(await page.locator('.summary-dimensions strong').innerText(), oldDimensions, 'controls should work after fallback');
  await page.getByRole('button', { name: 'Export mesh' }).click();
  const downloadPromise = page.waitForEvent('download', { timeout: 60000 });
  await page.getByRole('menuitem', { name: /GLB mesh/ }).click();
  const download = await downloadPromise;
  const data = await readFile(await download.path());
  assert.equal(data.subarray(0, 4).toString('ascii'), 'glTF', 'fallback should export a GLB');
  console.log('✓ Blocked worker falls back, updates controls and exports GLB');
});

await withBrowser(async (browser) => {
  const page = await browser.newPage({ viewport: { width: 1365, height: 900 } });
  await page.addInitScript(() => {
    window.Worker = class { constructor() { throw new DOMException('Worker blocked', 'SecurityError'); } };
  });
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await waitForReady(page);
  assert.equal(await page.locator('.summary-metrics').innerText(), expectedMetrics);
  console.log('✓ A blocked Worker constructor also falls back');
});

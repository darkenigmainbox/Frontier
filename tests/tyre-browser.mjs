import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import { createServer } from "vite";
const server = await createServer({
  configFile: false,
  root: "site",
  server: { host: "0.0.0.0", port: 5195 },
});
await server.listen();
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH,
  args: [
    "--no-sandbox",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
try {
  const page = await browser.newPage({
      viewport: { width: 1500, height: 1050 },
    }),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:5195/tyre/index.html");
  await page.waitForFunction(() => window.TyreApp?.meshes.length > 0);
  const verify = async () => {
    const result = await page.evaluate(() => TyreApp.audit());
    for (const r of result) assert(r.volume > 0);
    for (const r of result)
      for (const k of [
        "nonQuad",
        "degenerate",
        "openEdges",
        "nonmanifold",
        "windingErrors",
      ])
        assert.equal(r[k], 0, k);
    assert(!(await page.locator("#export").isDisabled()));
  };
  await verify();
  const initial = await page.evaluate(() => TyreApp.state);
  await page.locator("#columns").click();
  assert.equal(
    await page.evaluate(() => TyreApp.state.blocks[0].grid[0].length),
    9,
  );
  await page.locator("#undo").click();
  assert.deepEqual(await page.evaluate(() => TyreApp.state), initial);
  await page.locator("#redo").click();
  await verify();
  await page.locator("#undo").click();
  await page.locator("#mirror").click();
  assert.equal(await page.evaluate(() => TyreApp.state.blocks.length), 5);
  await verify();
  await page.locator("#delete").click();
  assert.equal(await page.evaluate(() => TyreApp.state.blocks.length), 4);
  await page.locator("#blocks button").first().click();
  const handle = page.locator('circle[data-j="0"][data-i="0"]');
  const box = await handle.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 5, box.y + box.height / 2 + 3);
  await page.mouse.up();
  assert.notDeepEqual(
    await page.evaluate(() => TyreApp.state.blocks[0].grid),
    initial.blocks[0].grid,
  );
  await verify();
  await page.locator("#undo").click();
  // Draw an actual custom patch in SVG world coordinates.
  await page.locator("#draw").click();
  for (const [x, y] of [
    [-20, 10],
    [20, 10],
    [25, 32],
    [-18, 30],
  ]) {
    const screen = await page.evaluate(
      ([x, y]) => {
        const p = new DOMPoint(x, y).matrixTransform(
          document.getElementById("editor").getScreenCTM(),
        );
        return { x: p.x, y: p.y };
      },
      [x, y],
    );
    await page.mouse.click(screen.x, screen.y);
  }
  assert.equal(await page.evaluate(() => TyreApp.state.blocks.length), 5);
  await verify();
  await page.locator("#undo").click();
  const exported = await page.evaluate(() => TyreApp.obj());
  assert(
    exported
      .split("\n")
      .filter((l) => l.startsWith("f "))
      .every((l) => l.split(" ").length === 5),
  );
  for (const name of ["Chevron", "Touring", "Trail"]) {
    await page.locator("#preset").selectOption(name);
    await verify();
  }
  // Save/load restores custom vector geometry, not a raster map.
  const recipe = await page.evaluate(() => TyreApp.state);
  await page.locator("#rotateRight").click();
  await verify();
  await page
    .locator("#file")
    .setInputFiles({
      name: "recipe.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(recipe)),
    });
  await page.waitForFunction(
    () => document.getElementById("status").textContent === "Recipe loaded",
  );
  assert.deepEqual(await page.evaluate(() => TyreApp.state), recipe);
  await page.locator("#param-width").focus();
  await page.keyboard.press("ArrowRight");
  assert.equal(await page.evaluate(() => TyreApp.state.width), 290);
  await verify();
  await page.locator("#undo").click();
  const download = page.waitForEvent("download");
  await page.locator("#export").click();
  const d = await download;
  assert.equal(d.suggestedFilename(), "quad-tyre.obj");
  await page.screenshot({ path: "docs/tyre/editor.png" });
  await page.locator("#wire").uncheck();
  await page
    .locator("#viewport")
    .screenshot({ path: "docs/tyre/tyre-solid.png" });
  await page.locator("#wire").check();
  await page
    .locator("#viewport")
    .screenshot({ path: "docs/tyre/tyre-quads.png" });
  await page.locator("#isolate").check();
  await page
    .locator("#viewport")
    .screenshot({ path: "docs/tyre/block-quads.png" });
  await page.locator("#isolate").uncheck();
  assert.deepEqual(errors, []);
  console.log(
    "PASS: production browser, grid editing, draw, mirror, refinement, undo/redo, three presets, all-quad OBJ.",
  );
} finally {
  await browser.close();
  await server.close();
}

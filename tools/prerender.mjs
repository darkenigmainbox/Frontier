/**
 * Pre-render each chapter to static HTML in dist/, so every chapter is a real URL
 * with real text (shareable, indexable, and viewable without JS).
 * Runs after `vite build`. Requires react-dom/server.
 */
import { build } from "vite";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();

async function loadEntry() {
  // Build the SSG entry in isolation so we can import it in node.
  await build({
    configFile: false,
    logLevel: "error",
    build: {
      ssr: "src/ssg.tsx",
      outDir: ".ssg",
      emptyOutDir: true,
      rollupOptions: { output: { format: "es", entryFileNames: "entry.mjs" } },
    },
    resolve: { alias: {} },
  });
  const mod = await import(pathToFileURL(resolve(root, ".ssg/entry.mjs")).href);
  return mod;
}

const main = async () => {
  const mod = await loadEntry();
  const { render, chapters } = mod;
  const template = readFileSync(resolve(root, "dist/index.html"), "utf8");

  let count = 0;
  for (const ch of chapters) {
    const { html, title, description } = render(ch.slug);
    const page = template
      .replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`)
      .replace(
        /<meta name="description"[\s\S]*?>/,
        `<meta name="description" content="${description}" />`
      )
      .replace('<div id="root"></div>', `<div id="root">${html}</div>`);

    const outDir =
      ch.slug === "home" ? resolve(root, "dist") : resolve(root, "dist", ch.slug);
    if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
    writeFileSync(resolve(outDir, "index.html"), page);
    count++;
  }
  console.log(`pre-rendered ${count} pages`);
};

main();

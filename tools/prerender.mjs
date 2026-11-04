/**
 * Pre-render every route to static HTML in dist/, so each page is a real URL
 * with real text (shareable, indexable, readable without JS).
 *
 * Writes: the library's front matter, the shelf, all 114 sūrah URLs, the
 * magazine's chapters, and one directory per āyah of Ar-Raʿd.
 */
import { build } from "vite";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();

async function loadEntry() {
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
  return import(pathToFileURL(resolve(root, ".ssg/entry.mjs")).href);
}

const write = (path, page) => {
  const dir =
    path === "/" ? resolve(root, "dist") : resolve(root, "dist", path.replace(/^\//, ""));
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, "index.html"), page);
};

const main = async () => {
  const { render, chaptersOut } = await loadEntry();
  const template = readFileSync(resolve(root, "dist/index.html"), "utf8");

  const page = (path) => {
    const { html, title, description } = render(path);
    return template
      .replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`)
      .replace(
        /<meta name="description"[\s\S]*?>/,
        `<meta name="description" content="${description}" />`
      )
      .replace('<div id="root"></div>', `<div id="root">${html}</div>`);
  };

  let count = 0;
  for (const ch of chaptersOut) {
    write(ch.path, page(ch.path));
    count++;
  }
  console.log(`pre-rendered ${count} routes`);

  // One directory per āyah of the reader, so /surah/13/tafsir/11 resolves on a
  // plain static host; the client reads the path and scrolls to the āyah.
  // A deep link does not need the full reader inlined — the client renders it
  // from the path. Inlining it 86 times made dist/ 51 MB.
  const shell = template.replace('<div id="root"></div>', '<div id="root"></div>');
  let deep = 0;
  for (let n = 1; n <= 43; n++) {
    write(`/surah/13/tafsir/${n}`, shell);
    deep++;
  }
  // The old flat URLs from the first build still have to land somewhere.
  for (let n = 1; n <= 43; n++) {
    write(`/tafsir/${n}`, shell);
    deep++;
  }
  console.log(`wrote ${deep} āyah deep links`);

  writeFileSync(resolve(root, "dist/404.html"), page("/"));
  console.log("wrote 404.html");
};

main();

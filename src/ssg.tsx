import { renderToString } from "react-dom/server";
import { createElement } from "react";
import App from "./App";
import { chapters, shelfSurahs } from "./data";

/**
 * Routes pre-rendered to real HTML. The shelf is rendered in full (it is the
 * page that matters for indexing); a sealed sūrah is rendered for all 113 so
 * that /surah/2 is a real page and not a 404; the magazine's chapters render
 * their own text.
 */
export const chaptersOut = [
  { path: "/", label: "Cover" },
  { path: "/index", label: "114 sūrahs" },
  { path: "/introduction", label: "Introduction" },
  { path: "/context", label: "Context" },
  { path: "/method", label: "Method" },
  { path: "/status", label: "What is written" },
  { path: "/surah/13", label: "Ar-Raʿd" },
  ...chapters
    .filter((c) => c.slug !== "index")
    .map((c) => ({ path: `/surah/13/${c.slug}`, label: c.label })),
  ...shelfSurahs.filter((s) => !s.built).map((s) => ({ path: `/surah/${s.n}`, label: s.name })),
];

const TITLES: Record<string, string> = {
  "/": "The Qur’ān — A Sūrah Magazine",
  "/index": "114 sūrahs — A Sūrah Magazine",
  "/introduction": "Introduction — A Sūrah Magazine",
  "/context": "How a recitation became a book — A Sūrah Magazine",
  "/method": "The rules — A Sūrah Magazine",
  "/status": "What is written — A Sūrah Magazine",
};

export function render(path: string) {
  const html = renderToString(createElement(App as any, { initialPath: path }));

  const sealed = /^\/surah\/(\d+)$/.exec(path);
  if (sealed) {
    const s = shelfSurahs.find((x) => x.n === parseInt(sealed[1], 10));
    if (s) {
      return {
        html,
        title: `${s.name} · Sūrah ${s.n} — A Sūrah Magazine`,
        description: `Sūrah ${s.n}, ${s.name} (${s.ayat} āyāt, ${s.type}). Not yet written — what this page will contain when it is.`,
      };
    }
  }

  const mag = /^\/surah\/13(?:\/([a-z]+))?/.exec(path);
  if (mag) {
    const slug = mag[1] || "map";
    const c = chapters.find((x) => x.slug === slug);
    return {
      html,
      title: `Ar-Raʿd · ${c?.label ?? "The Text"} — A Sūrah Magazine`,
      description: `Sūrah 13, Ar-Raʿd — ${c?.label ?? "the text"}. 43 āyāt, every word tappable to its Arabic root.`,
    };
  }

  return {
    html,
    title: TITLES[path] ?? "The Qur’ān — A Sūrah Magazine",
    description:
      "The whole Qur’ān as a library of sūrahs: one written as a magazine, the rest on the shelf with what each will contain. Arabic word by word, roots, and sourced commentary.",
  };
}

import { renderToString } from "react-dom/server";
import { createElement } from "react";
import App from "./App";
import { chapters as ch, editorial, ayat } from "./data";

export const chapters = [
  { slug: "home", label: "Cover" },
  ...ch.map((c) => ({ slug: c.slug, label: c.label })),
];

export function render(slug: string) {
  const html = renderToString(createElement(App, { initialSlug: slug }));
  const m = editorial.surahMeta;
  const base = `${m.name} · ${m.arabic}`;
  const titles: Record<string, string> = {
    home: `${base} — A Sūrah Magazine`,
    index: `Index — ${base}`,
    introduction: `Introduction — ${base}`,
    context: `Context: Ḥudaybiyyah — ${base}`,
    theme: `Theme: Truth and Foam — ${base}`,
    tafsir: `Āyah by āyah — ${base}`,
    story: `Story: Zayd and the Mountain — ${base}`,
    roots: `Roots — ${base}`,
    colophon: `Sources — ${base}`,
  };
  const descriptions: Record<string, string> = {
    home: `${m.name} (Sūrah 13) — 43 āyāt, word roots, occasion of revelation per āyah, and only verified hadith. A dark, minimal magazine.`,
    index: "Contents of the Ar-Raʿd magazine.",
    introduction: editorial.introduction.lede,
    context:
      "The treaty of Ḥudaybiyyah, 6 AH — the occasion behind 13:30, from Ṣaḥīḥ al-Bukhārī 2731.",
    theme: editorial.theme.standfirst,
    tafsir: `All 43 āyāt of Sūrah Ar-Raʿd with tappable word roots, al-Mukhtaṣar and Ibn Kathīr commentary, and a source note on every āyah.`,
    story: editorial.story.standfirst,
    roots: "Every Arabic root used in Sūrah Ar-Raʿd, with attested senses and provenance.",
    colophon: "Every source, every hadith number, and the method behind the Ar-Raʿd magazine.",
  };
  return {
    html,
    title: titles[slug] ?? `${base}`,
    description: (descriptions[slug] ?? descriptions.home).replace(/"/g, "&quot;"),
  };
}

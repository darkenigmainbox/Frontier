import surahJson from "./data/surah.json";
import editorialJson from "./data/editorial.json";
import citationsJson from "./data/citations.json";

export type Word = {
  ar: string;
  root: string;
  lem: string;
  pos: string;
};

export type Note = {
  type?: "text" | "report" | "disputed" | "caution";
  title?: string;
  text?: string;
  source?: string;
};

export type Ayah = {
  n: number;
  ar: string;
  en: string;
  tr: string;
  words: Word[];
  ibnKathir: string;
  mukhtasar: string;
  note: Note;
};

export type Sense = {
  pos: string;
  headword: string;
  definition: string;
  when: string;
};

export type Root = {
  root: string;
  qac: string;
  arabic: string;
  summary: string;
  development: string;
  senses: Sense[];
  cautions: string[];
  sources: string[];
};

export type SurahData = { surah: number; ayat: Ayah[]; roots: Record<string, Root> };

export const surah = surahJson as unknown as SurahData;
export const editorial = editorialJson as any;
export const citations = citationsJson as any;

export const ayat = surah.ayat;
export const roots = surah.roots;

export const rootLetters = (r: string): string[] => Array.from(r);

export const rootCount = Object.keys(roots).length;

/** How many āyāt a root appears in. */
export const rootFrequency: Record<string, number> = (() => {
  const out: Record<string, number> = {};
  for (const a of ayat) {
    const seen = new Set<string>();
    for (const w of a.words) {
      if (w.root && !seen.has(w.root)) {
        seen.add(w.root);
        out[w.root] = (out[w.root] || 0) + 1;
      }
    }
  }
  return out;
})();

export const getAyah = (n: number) => ayat.find((a) => a.n === n);

export const hadith = (key: string) => citations.hadith?.[key];

export const source = (id: string) =>
  (citations.sources as any[]).find((s) => s.id === id);

export const sourceLabel = (id: string) => {
  const s = source(id);
  if (!s) return id;
  return s.label as string;
};

export const chapters: {
  number: string;
  slug: string;
  label: string;
  title: string;
  quote: string;
}[] = editorial.chapters;

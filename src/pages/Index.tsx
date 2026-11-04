import { chapters, editorial, rootCount } from "../data";
import { ChapterHead } from "../components/ChapterHead";

const tails: Record<string, string> = {
  introduction: "what this sūrah is",
  context: "Ḥudaybiyyah, 6 AH",
  theme: "truth and foam",
  tafsir: "43 āyāt · tap a word",
  story: "Zayd and the mountain",
  roots: `${rootCount} roots`,
  colophon: "every link, checked",
};

export function Index({ go }: { go: (slug: string) => void }) {
  const rows = chapters.filter((c) => c.slug !== "index");

  return (
    <div className="wrap page">
      <ChapterHead
        number={chapters[0].number}
        label="Contents"
        title="Index"
        quote={chapters[0].quote}
        kicker={editorial.surahMeta.kicker}
      />

      <div className="index-grid" style={{ marginTop: "1rem" }}>
        {rows.map((c) => (
          <button key={c.slug} className="index-row" onClick={() => go(c.slug)}>
            <span className="index-num mono">{c.number}</span>
            <span className="index-label">{c.label}</span>
            <span className="index-tail">{tails[c.slug] || ""}</span>
          </button>
        ))}
      </div>

      <div className="split split-2" style={{ marginTop: "clamp(2.5rem, 7vw, 4rem)" }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: ".7rem" }}>
            How to read this
          </div>
          <p className="prose" style={{ fontSize: ".95rem" }}>
            {editorial.readingOrder.note}
          </p>
        </div>
        <div>
          <div className="eyebrow" style={{ marginBottom: ".7rem" }}>
            On sources
          </div>
          <p className="prose" style={{ fontSize: ".95rem" }}>
            Nothing in this magazine is presented as a scholar's opinion without naming the
            scholar. Every hadith carries its collection, its number and its grade, and can be
            opened on sunnah.com. Where a report is weak, the page says so — including on the
            āyāt where the weak report is the famous one.
          </p>
        </div>
      </div>
    </div>
  );
}

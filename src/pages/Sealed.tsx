import { shelfSurah, libraryText, shelfSurahs } from "../data";

const SHAPE = [
  ["01", "Its own index", "The movements of this sūrah, named and in order, each one a link"],
  ["02", "Introduction", "What this sūrah is, and how it makes its argument"],
  ["03", "Context", "The occasion of revelation — only where a report exists, labelled"],
  ["04", "Theme", "The image the sūrah is built around"],
  ["05", "The text", "Every āyah, every word tappable to its root"],
  ["06", "Story", "One scene drawn from the sūrah's own material"],
  ["07", "Lexicon", "Every root it uses, with attested senses"],
  ["08", "Conclusion", "What it leaves standing"],
];

/**
 * A sūrah that has not been written yet.
 *
 * It is not an error page and not a blank: it states the sūrah's name, its
 * place in the muṣaf and in the order of revelation, its size, and exactly
 * what will be behind the plate when its turn comes.
 */
export function Sealed({ n, go }: { n: number; go: (s: string) => void }) {
  const s = shelfSurah(n);
  if (!s) return null;

  const prev = shelfSurahs.find((x) => x.n === n - 1);
  const next = shelfSurahs.find((x) => x.n === n + 1);

  return (
    <div className="page">
      <div className="wrap">
        <div className="running-head">
          <span>{s.name}</span>
          <span className="rh-mid">
            Sūrah {s.n} · {s.type === "meccan" ? "Makkan" : "Madinan"}
          </span>
          <span>{String(s.n).padStart(2, "0")}</span>
        </div>

        <header className="surah-head">
          <div className="surah-num">SŪRAH {String(s.n).padStart(3, "0")}</div>
          <div className="surah-ar-big">{s.ar}</div>
          <h1 className="surah-name">{s.name}</h1>
          <div className="surah-mean">
            {s.meaning} · {s.ayat} āyāt · juzʾ {s.juz} · revealed {s.rev}
            {ordinal(s.rev)}
          </div>
        </header>

        <div className="sealed">
          <div className="sealed-stamp">
            <span className="ar" lang="ar" dir="rtl">
              لَمْ تُكْتَبْ بَعْد
            </span>
            <span className="sealed-sep" aria-hidden="true">
              ·
            </span>
            <span className="sealed-en">Not yet written</span>
          </div>

          <p className="sealed-text">
            This sūrah is on the shelf but sealed. Its text is not printed here yet, because
            printing it means doing the work this magazine does for one sūrah at a time: the
            Arabic word by word, the roots, an occasion only where a report survives, and
            commentary quoted with its source. Until that is done, this plate is the honest
            answer.
          </p>

          <p className="tiny dim" style={{ lineHeight: 1.8, maxWidth: "52ch" }}>
            {libraryText.status.next}
          </p>
        </div>

        <div className="sealed-shape">
          <div className="eyebrow eyebrow-signal" style={{ marginBottom: ".7rem" }}>
            What will be behind this plate
          </div>
          <div className="sealed-list">
            {SHAPE.map(([num, title, note]) => (
              <div key={num} className="sealed-row">
                <span className="sealed-n mono">{num}</span>
                <span className="sealed-t">{title}</span>
                <span className="sealed-d">{note}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="sealed-call">
          <div className="eyebrow" style={{ marginBottom: ".6rem" }}>
            The one that is finished
          </div>
          <button className="sealed-done" onClick={() => go("surah/13")}>
            <span className="shelf-n mono">013</span>
            <span className="status-name">Ar-Raʿd</span>
            <span className="status-ar ar">الرعد</span>
            <span className="status-go">Open the magazine →</span>
          </button>
        </div>

        <div className="pager">
          <button className="pager-btn" onClick={() => go("surah/" + (prev ? prev.n : 114))}>
            <span className="pager-dir">←</span>
            <span className="pager-name">{prev ? prev.name : "An-Nās"}</span>
          </button>
          <button className="pager-btn next" onClick={() => go("surah/" + (next ? next.n : 1))}>
            <span className="pager-dir">Next →</span>
            <span className="pager-name">{next ? next.name : "Al-Fātiḥa"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

import { useEffect, useMemo, useRef, useState } from "react";
import { ayat, editorial, roots } from "../data";
import { ArabicAyah, useRoots } from "../components/Roots";
import { HadithCard, SourceChip } from "../components/Source";

const chipLabel: Record<string, string> = {
  report: "Occasion reported",
  text: "Reading the text",
  disputed: "Disputed report",
  caution: "Handle with care",
};

const chipClass: Record<string, string> = {
  report: "chip-report",
  text: "chip-text",
  disputed: "chip-disputed",
  caution: "chip-caution",
};

const RANGES = [
  { label: "All", from: 1, to: 43 },
  { label: "1–4", from: 1, to: 4 },
  { label: "5–11", from: 5, to: 11 },
  { label: "12–17", from: 12, to: 17 },
  { label: "18–29", from: 18, to: 29 },
  { label: "30–34", from: 30, to: 34 },
  { label: "35–43", from: 35, to: 43 },
];

export function Tafsir({
  focus,
  setFocus,
  showTranslation,
  setShowTranslation,
}: {
  focus?: number;
  setFocus: (n?: number) => void;
  showTranslation: boolean;
  setShowTranslation: (b: boolean) => void;
}) {
  const { open, openParticle, element } = useRoots();
  const [range, setRange] = useState(0);
  const [reader, setReader] = useState(1);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.style.setProperty("--reader", String(reader));
    return () => {
      document.documentElement.style.removeProperty("--reader");
    };
  }, [reader]);

  const list = useMemo(() => {
    const r = RANGES[range];
    return ayat.filter((a) => a.n >= r.from && a.n <= r.to);
  }, [range]);

  useEffect(() => {
    if (focus) {
      const el = document.getElementById(`ayah-${focus}`);
      if (el) {
        setTimeout(() => el.scrollIntoView({ block: "start", behavior: "smooth" }), 80);
      }
    }
  }, [focus, range]);

  return (
    <div className="page">
      <div className="wrap">
        <header className="chapter-head" style={{ paddingBottom: "1.4rem" }}>
          <div className="chapter-num" aria-hidden="true">
            <span>05</span>
          </div>
          <div className="chapter-meta">
            <span>The Text</span>
            <span>13 · Ar-Raʿd</span>
            <span>{ayat.length} āyāt</span>
          </div>
          <h2 className="chapter-title">Āyah by āyah</h2>
          <p className="chapter-quote">
            Tap any underlined word for its root, its senses and where the sense comes from.
          </p>
          <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap", marginTop: ".4rem" }}>
            <button
              className={"icon-btn" + (showTranslation ? " on" : "")}
              onClick={() => setShowTranslation(!showTranslation)}
            >
              Translation {showTranslation ? "on" : "off"}
            </button>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: ".3rem",
                border: "1px solid var(--line)",
                borderRadius: 999,
                padding: "0 .25rem",
              }}
            >
              <button
                className="icon-btn"
                style={{ border: 0, height: 26, minWidth: 24 }}
                onClick={() => setReader((r) => Math.max(0.85, +(r - 0.1).toFixed(2)))}
                aria-label="Smaller text"
              >
                A−
              </button>
              <span className="tiny dim mono" style={{ minWidth: 30, textAlign: "center" }}>
                {Math.round(reader * 100)}%
              </span>
              <button
                className="icon-btn"
                style={{ border: 0, height: 26, minWidth: 24 }}
                onClick={() => setReader((r) => Math.min(1.6, +(r + 0.1).toFixed(2)))}
                aria-label="Larger text"
              >
                A+
              </button>
            </div>
          </div>
        </header>

        <div
          style={{
            position: "sticky",
            top: 54,
            zIndex: 30,
            background: "var(--ink)",
            borderBottom: "1px solid var(--line-soft)",
            padding: ".65rem 0",
            marginBottom: ".5rem",
            display: "flex",
            gap: ".4rem",
            overflowX: "auto",
            scrollbarWidth: "none",
          }}
        >
          {RANGES.map((r, i) => (
            <button
              key={r.label}
              className={"icon-btn" + (range === i ? " on" : "")}
              onClick={() => {
                setRange(i);
                setFocus(undefined);
              }}
              style={{ flex: "0 0 auto" }}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="ayah-list" ref={rootRef}>
          {list.map((a) => (
            <article className="ayah" id={`ayah-${a.n}`} key={a.n}>
              <div className="ayah-head">
                <a
                  className="ayah-no mono"
                  href={`/tafsir/${a.n}`}
                  onClick={(e) => {
                    e.preventDefault();
                    setFocus(a.n);
                    window.history.replaceState({}, "", `/tafsir/${a.n}`);
                  }}
                  style={{ borderBottom: "1px solid transparent" }}
                  title={`Link to āyah ${a.n}`}
                >
                  13 : {a.n}
                </a>
                {a.note?.type && (
                  <span className={"ayah-chip " + (chipClass[a.note.type] || "")}>
                    {chipLabel[a.note.type]}
                  </span>
                )}
              </div>

              <ArabicAyah words={a.words} onOpen={open} onOpenParticle={openParticle} />

              {showTranslation && (
                <>
                  <div className="ayah-en">“{a.en}”</div>
                  {a.tr && <div className="ayah-tr">{a.tr}</div>}
                </>
              )}

              {a.note?.text && (
                <div className={"note " + (a.note.type ? "note-" + a.note.type : "")}>
                  <div className="note-h">
                    {a.note.title && <span className="note-t">{a.note.title}</span>}
                    {a.note.source && <SourceChip id={a.note.source} />}
                  </div>
                  <p className="note-p">{a.note.text}</p>
                  {a.note.type === "report" && a.note.source && (
                    <HadithCard id={a.note.source} />
                  )}
                </div>
              )}

              <div className="details">
                <details>
                  <summary>What the āyah says — plain commentary</summary>
                  <div className="details-body">
                    <p className="tafsir-body">{a.mukhtasar}</p>
                    <div style={{ marginTop: ".7rem", display: "flex", gap: ".5rem", alignItems: "center" }}>
                      <span className="tiny dim">al-Mukhtaṣar</span>
                      <SourceChip id="mukhtasar" />
                    </div>
                  </div>
                </details>

                {a.ibnKathir && (
                  <details>
                    <summary>Ibn Kathīr's commentary (abridged)</summary>
                    <div className="details-body">
                      <div className="tafsir-body">{clean(a.ibnKathir)}</div>
                      <div style={{ marginTop: ".7rem", display: "flex", gap: ".5rem", alignItems: "center" }}>
                        <span className="tiny dim">Tafsīr Ibn Kathīr</span>
                        <SourceChip id="ibnkathir" />
                      </div>
                    </div>
                  </details>
                )}

                <details>
                  <summary>Word roots in this āyah</summary>
                  <div className="details-body">
                    <div style={{ display: "flex", flexWrap: "wrap", gap: ".35rem" }}>
                      {uniqRoots(a).map((r) => (
                        <button
                          key={r.root}
                          className="icon-btn"
                          onClick={() => open(r.root, "")}
                          style={{ height: 30, fontSize: ".72rem" }}
                        >
                          <span className="ar" style={{ fontSize: ".95rem" }}>
                            {r.arabic}
                          </span>
                          <span style={{ color: "var(--dim)", fontSize: ".6rem" }}>
                            {r.latin}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </details>
              </div>
            </article>
          ))}
        </div>

        <div className="caveat" style={{ marginTop: "3rem" }}>
          <h4>On these notes</h4>
          <p>
            Each āyah carries a label: <b>occasion reported</b> where a specific, named report
            exists; <b>reading the text</b> where no occasion is reported and the wording must carry
            the meaning; <b>disputed report</b> or <b>handle with care</b> where the famous story is
            not reliable. The plain commentary is al-Mukhtaṣar (King Fahd Complex); the longer
            commentary is Ibn Kathīr. They are quotations, not this magazine's opinions.
          </p>
        </div>

        <div className="pager" style={{ marginBottom: "3rem" }}>
          <button className="pager-btn" onClick={() => setFocus(Math.max(1, (focus || 1) - 1))}>
            <span className="pager-dir">← Previous</span>
            <span className="pager-name">
              Āyah {Math.max(1, (focus || 1) - 1)}
            </span>
          </button>
          <button
            className="pager-btn next"
            onClick={() => setFocus(Math.min(43, (focus || 1) + 1))}
          >
            <span className="pager-dir">Next →</span>
            <span className="pager-name">Āyah {Math.min(43, (focus || 1) + 1)}</span>
          </button>
        </div>
      </div>
      {element}
    </div>
  );
}

function clean(t: string) {
  // collapse the repeated Arabic/translation scaffolding; keep prose paragraphs
  return t
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^\([^)]{0,220}\)\n/gm, "")
    .trim();
}

function uniqRoots(a: { words: { ar: string; root: string }[] }) {
  const seen = new Set<string>();
  const out: { root: string; arabic: string; latin: string }[] = [];
  for (const w of a.words) {
    if (!w.root || seen.has(w.root) || !roots[w.root]) continue;
    seen.add(w.root);
    out.push({ root: w.root, arabic: roots[w.root].arabic, latin: roots[w.root].qac });
  }
  return out;
}

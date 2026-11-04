import { useMemo, useState } from "react";
import { editorial, rootFrequency, roots } from "../data";
import { ChapterHead } from "../components/ChapterHead";
import { useRoots } from "../components/Roots";

export function RootsIndex() {
  const { open, element } = useRoots();
  const [q, setQ] = useState("");

  const all = useMemo(() => {
    return Object.values(roots)
      .map((r) => ({ ...r, freq: rootFrequency[r.root] || 1 }))
      .sort((a, b) => b.freq - a.freq || a.root.localeCompare(b.root));
  }, []);

  const filtered = useMemo(() => {
    if (!q.trim()) return all;
    const s = q.trim();
    return all.filter(
      (r) =>
        r.arabic.includes(s) ||
        r.root.includes(s) ||
        r.summary.toLowerCase().includes(s.toLowerCase())
    );
  }, [q, all]);

  return (
    <div className="page">
      <div className="wrap">
        <ChapterHead
          number="08"
          label="Lexicon"
          title="Every root, three letters at a time"
          quote={`${all.length} distinct roots carry the whole of Sūrah Ar-Raʿd. Open any of them.`}
          kicker={editorial.surahMeta.name}
        />

        <div style={{ display: "flex", gap: ".6rem", marginBottom: "1.4rem", flexWrap: "wrap" }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search roots — try رعد, or “thunder”"
            style={{
              flex: "1 1 240px",
              minWidth: 0,
              background: "var(--panel)",
              border: "1px solid var(--line)",
              borderRadius: 999,
              padding: ".7rem 1.1rem",
              color: "var(--text)",
              font: "inherit",
              fontSize: ".86rem",
              outline: "none",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--signal)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--line)")}
          />
          <div className="icon-btn" style={{ cursor: "default" }}>
            {filtered.length} shown
          </div>
        </div>

        <div className="roots-grid">
          {filtered.map((r) => (
            <button
              key={r.root}
              className="root-cell"
              onClick={() => open(r.root, "")}
              title={r.summary.slice(0, 90)}
            >
              <span className="r-ar">{r.arabic}</span>
              <span className="r-n">
                {r.freq} {r.freq === 1 ? "āyah" : "āyāt"}
              </span>
            </button>
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="tiny muted" style={{ marginTop: "1.5rem" }}>
            No root matches “{q}”. This index only covers the roots used in Sūrah Ar-Raʿd.
          </p>
        )}

        <div className="split split-2" style={{ marginTop: "clamp(2.5rem,7vw,4rem)" }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: ".7rem" }}>
              What a root is
            </div>
            <p className="prose" style={{ fontSize: ".94rem" }}>
              Arabic builds words from a skeleton of two to four consonants. Insert vowels, double a
              letter, add a prefix, and the same three letters become a verb, a noun, a participle or
              a place. <span className="ar" dir="rtl">رَعَدَ</span> — to thunder;{" "}
              <span className="ar" dir="rtl">الرَّعْد</span> — the thunder;{" "}
              <span className="ar" dir="rtl">رَعَّاد</span> — the one that thunders a lot. All three
              are one root: <span className="ar" dir="rtl">ر ع د</span>.
            </p>
          </div>
          <div>
            <div className="eyebrow" style={{ marginBottom: ".7rem" }}>
              On the definitions
            </div>
            <p className="prose" style={{ fontSize: ".94rem" }}>
              Each root's senses are condensed from Lane's Lexicon and al-Rāghib al-Iṣfahānī's
              al-Mufradāt, and the provenance for every root is shown inside the panel. Where a root
              has a misleading modern reflex — a branch in English that the Qur'ān never uses — the
              panel says so.
            </p>
          </div>
        </div>
      </div>
      {element}
    </div>
  );
}

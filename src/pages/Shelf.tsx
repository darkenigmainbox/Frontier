import { useMemo, useState } from "react";
import { shelfSurahs, shelfStats, type ShelfSurah } from "../data";

type Sort = "mushaf" | "revealed" | "length";

const TYPE_LABEL = { meccan: "Makkan", medinan: "Madinan" } as const;

/**
 * The whole Qur'ān on one screen: 114 sūrahs, searchable, sortable by muṣḥaf
 * order, revelation order, or length. A sūrah that has been written opens the
 * magazine; one that has not opens a plate that says so.
 */
export function Shelf({ go }: { go: (n: number) => void }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("mushaf");
  const [onlyBuilt, setOnlyBuilt] = useState(false);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = shelfSurahs.filter((s) => {
      if (onlyBuilt && !s.built) return false;
      if (!needle) return true;
      return (
        String(s.n) === needle ||
        s.name.toLowerCase().includes(needle) ||
        s.meaning.toLowerCase().includes(needle) ||
        s.ar.includes(q.trim())
      );
    });
    list = [...list];
    if (sort === "revealed") list.sort((a, b) => a.rev - b.rev);
    if (sort === "length") list.sort((a, b) => b.ayat - a.ayat);
    return list;
  }, [q, sort, onlyBuilt]);

  return (
    <div className="page">
      <div className="wrap">
        <div className="running-head">
          <span>Qur’ān</span>
          <span className="rh-mid">The shelf</span>
          <span>01</span>
        </div>

        <header className="chapter-head" style={{ paddingBottom: "1rem" }}>
          <div className="eyebrow eyebrow-signal">Contents</div>
          <h1 className="lib-title" style={{ fontSize: "clamp(2rem,7.5vw,3.4rem)" }}>
            114 sūrahs
          </h1>
          <p className="surah-lede" style={{ marginTop: ".9rem" }}>
            {shelfStats.ayat.toLocaleString()} āyāt, {shelfStats.words.toLocaleString()} words,{" "}
            {shelfStats.meccan} Makkan and {shelfStats.medinan} Madinan. Each sūrah opens a
            magazine of its own.
          </p>
        </header>

        <input
          className="shelf-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search a name, a number, or a meaning — 13, Ya-Sin, thunder"
          aria-label="Search sūrahs"
        />

        <div className="shelf-filter">
          {(
            [
              ["mushaf", "Muṣḥaf"],
              ["revealed", "Revelation"],
              ["length", "Longest"],
            ] as [Sort, string][]
          ).map(([k, label]) => (
            <button
              key={k}
              className="icon-btn"
              onClick={() => setSort(k)}
              style={sort === k ? { borderColor: "var(--signal)", color: "var(--paper)" } : undefined}
            >
              {label}
            </button>
          ))}
          <button
            className="icon-btn"
            onClick={() => setOnlyBuilt((v) => !v)}
            style={onlyBuilt ? { borderColor: "var(--signal)", color: "var(--paper)" } : undefined}
          >
            Written only
          </button>
          <span className="tiny dim" style={{ alignSelf: "center" }}>
            {rows.length} shown
          </span>
        </div>

        <div className="shelf-head">
          <span>№</span>
          <span>Sūrah</span>
          <span>Āyāt</span>
          <span>Juzʾ</span>
          <span>Revealed</span>
        </div>

        <div className="shelf">
          {rows.map((s) => (
            <Row key={s.n} s={s} go={go} />
          ))}
        </div>

        {rows.length === 0 && (
          <p className="surah-lede" style={{ marginTop: "2rem" }}>
            Nothing matches “{q}”. Try a number, or part of a name.
          </p>
        )}

        <p className="tiny dim" style={{ marginTop: "2.5rem", lineHeight: 1.8, maxWidth: "52ch" }}>
          One sūrah is written: <strong style={{ color: "var(--muted)" }}>13 · Ar-Raʿd</strong>.
          The other 113 are sealed — tap one to see exactly what it will contain when it is
          built. Revelation numbers follow the traditional order.
        </p>
      </div>
    </div>
  );
}

function Row({ s, go }: { s: ShelfSurah; go: (n: number) => void }) {
  return (
    <button
      className={"shelf-row" + (s.built ? " built" : "")}
      onClick={() => go(s.n)}
      aria-label={`${s.name}, sūrah ${s.n}, ${s.ayat} āyāt${s.built ? "" : " — not yet written"}`}
    >
      <span className="shelf-n mono">{String(s.n).padStart(3, "0")}</span>

      <span className="shelf-id">
        <span className="shelf-name">{s.name}</span>
        <span className="shelf-ar" lang="ar" dir="rtl">
          {s.ar}
        </span>
      </span>

      <span className="shelf-col">
        <span className="shelf-count">{s.ayat}</span>
        <span className="shelf-lab">āyāt</span>
      </span>

      <span className="shelf-col">
        <span className="shelf-count">{s.juz}</span>
        <span className="shelf-lab">juzʾ</span>
      </span>

      <span className="shelf-col">
        <span className="shelf-count">{s.rev}</span>
        <span className="shelf-lab">{TYPE_LABEL[s.type]}</span>
      </span>

      {/* phones: the three numeric columns collapse into one readable line */}
      <span className="shelf-meta-line">
        {s.ayat} āyāt · juzʾ {s.juz} · {TYPE_LABEL[s.type]} · revealed {s.rev}
      </span>
    </button>
  );
}

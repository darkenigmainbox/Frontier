import { libraryText, shelfStats, shelfSurahs } from "../data";
import { Portal } from "../components/Portal";

const T = libraryText;

/* ---------------------------------------------------------------- cover */

export function LibraryCover({ go }: { go: (s: string) => void }) {
  const c = T.cover;
  return (
    <div className="page lib-cover">
      <div className="wrap">
        <div
          className="topbar-inner"
          style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}
        >
          <span className="eyebrow">{c.kicker}</span>
          <span className="eyebrow">Issue 01 · 114 sūrahs</span>
        </div>

        <div style={{ marginTop: "clamp(2.4rem,10vw,5rem)" }}>
          <div
            className="cover-ar"
            style={{ textAlign: "right", fontSize: "clamp(2.1rem,8.6vw,3.4rem)" }}
            aria-hidden="true"
          >
            {c.arabic}
          </div>

          <h1 className="lib-title">
            {c.title.map((line: string, i: number) => (
              <span key={i} style={{ display: "block" }}>
                {line}
              </span>
            ))}
          </h1>

          <p className="lib-sub">{c.standfirst}</p>

          <div className="lib-stats">
            <Stat v={String(shelfStats.surahs)} k="Sūrahs" />
            <Stat v={shelfStats.ayat.toLocaleString()} k="Āyāt" />
            <Stat v={shelfStats.words.toLocaleString()} k="Words" />
            <Stat v="1" k="Written" />
          </div>

          <div style={{ display: "flex", gap: ".55rem", flexWrap: "wrap", marginTop: "clamp(1.8rem,5vw,2.6rem)" }}>
            <button className="enter-btn" onClick={() => go("index")} style={{ margin: 0 }}>
              The shelf <span aria-hidden="true">→</span>
            </button>
            <button className="enter-btn ghost" onClick={() => go("introduction")} style={{ margin: 0 }}>
              Start here
            </button>
          </div>

          <p className="tiny dim" style={{ marginTop: "1.8rem", maxWidth: "46ch", lineHeight: 1.8 }}>
            {c.note}
          </p>
        </div>
      </div>
    </div>
  );
}

function Stat({ v, k }: { v: string; k: string }) {
  return (
    <div>
      <div className="lib-stat-v">{v}</div>
      <div className="lib-stat-k">{k}</div>
    </div>
  );
}

/* ---------------------------------------------------------------- generic head */

function LibHead({ n, kicker, title, standfirst }: { n: string; kicker: string; title: string; standfirst: string }) {
  return (
    <>
      <div className="running-head">
        <span>Qur’ān</span>
        <span className="rh-mid">{kicker}</span>
        <span>{n}</span>
      </div>
      <div className="chapter-head" style={{ paddingBottom: "1.2rem" }}>
        <div className="chapter-num" aria-hidden="true">
          <span>{n}</span>
        </div>
        <div className="chapter-meta">
          <span>{kicker}</span>
        </div>
        <h1 className="lib-page-title">{title}</h1>
        <p className="surah-lede">{standfirst}</p>
      </div>
    </>
  );
}

/* ---------------------------------------------------------------- introduction */

export function LibraryIntro({ go }: { go: (s: string) => void }) {
  const c = T.introduction;
  return (
    <div className="page">
      <div className="wrap">
        <LibHead n={c.number} kicker={c.kicker} title={c.title} standfirst={c.lede} />

        <div className="lib-ar-hero">
          <div className="ar" style={{ fontSize: "clamp(1.15rem,3.4vw,1.5rem)", lineHeight: 2.1 }}>
            {c.arabic}
          </div>
          <p className="tiny dim" style={{ marginTop: ".5rem" }}>
            {c.arabicNote}
          </p>
        </div>

        <div className="prose lib-prose">
          {c.sections.map((s: any, i: number) => (
            <div key={i} className="lib-block">
              <h2 className="lib-h">{s.h}</h2>
              <p>{s.text}</p>
              <Chips keys={[s.cite]} />
            </div>
          ))}
        </div>

        <blockquote className="pull">
          <p>{c.pull.text}</p>
          <footer>{c.pull.attribution}</footer>
        </blockquote>

        <div className="pager">
          <button className="pager-btn" onClick={() => go("index")}>
            <span className="pager-dir">←</span>
            <span className="pager-name">The shelf</span>
          </button>
          <button className="pager-btn next" onClick={() => go("context")}>
            <span className="pager-dir">Next →</span>
            <span className="pager-name">How it became a book</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- context */

export function LibraryContext({ go }: { go: (s: string) => void }) {
  const c = T.context;
  return (
    <div className="page">
      <div className="wrap">
        <LibHead n={c.number} kicker={c.kicker} title={c.title} standfirst={c.standfirst} />

        <div className="tl">
          {c.timeline.map((t: any, i: number) => (
            <div key={i} className="tl-row">
              <div className="tl-year">{t.year}</div>
              <div className="tl-body">
                <h2 className="lib-h" style={{ marginTop: 0 }}>
                  {t.label}
                </h2>
                <p>{t.text}</p>
                <Chips keys={[t.cite]} />
              </div>
            </div>
          ))}
        </div>

        <div className="note note-caution" style={{ marginTop: "2.4rem" }}>
          <div className="note-head">
            <span className="note-tag">{c.caveat.title}</span>
          </div>
          <p style={{ margin: ".5rem 0 0", lineHeight: 1.75 }}>{c.caveat.text}</p>
        </div>

        <div className="pager">
          <button className="pager-btn" onClick={() => go("introduction")}>
            <span className="pager-dir">←</span>
            <span className="pager-name">Introduction</span>
          </button>
          <button className="pager-btn next" onClick={() => go("method")}>
            <span className="pager-dir">Next →</span>
            <span className="pager-name">The rules</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- method */

export function LibraryMethod({ go }: { go: (s: string) => void }) {
  const c = T.method;
  return (
    <div className="page">
      <div className="wrap">
        <LibHead n={c.number} kicker={c.kicker} title={c.title} standfirst={c.standfirst} />

        <div className="rules">
          {c.rules.map((r: any) => (
            <div key={r.n} className="rule">
              <div className="rule-n mono">{r.n}</div>
              <div>
                <h2 className="lib-h" style={{ marginTop: 0 }}>
                  {r.h}
                </h2>
                <p>{r.text}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="not-list">
          <div className="eyebrow eyebrow-signal" style={{ marginBottom: ".7rem" }}>
            Not in this library
          </div>
          <ul>
            {c.not.map((x: string, i: number) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </div>

        <div className="pager">
          <button className="pager-btn" onClick={() => go("context")}>
            <span className="pager-dir">←</span>
            <span className="pager-name">Context</span>
          </button>
          <button className="pager-btn next" onClick={() => go("status")}>
            <span className="pager-dir">Next →</span>
            <span className="pager-name">What is written</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- status */

export function LibraryStatus({ go }: { go: (s: string) => void }) {
  const c = T.status;
  const built = shelfSurahs.filter((s) => s.built);
  const sealed = shelfStats.surahs - built.length;

  return (
    <div className="page">
      <div className="wrap">
        <LibHead n={c.number} kicker={c.kicker} title={c.title} standfirst={c.standfirst} />

        <div className="status-built">
          {built.map((s) => (
            <button key={s.n} className="status-card on" onClick={() => go("surah/" + s.n)}>
              <span className="shelf-n mono">{String(s.n).padStart(3, "0")}</span>
              <span className="status-name">{s.name}</span>
              <span className="status-ar ar">{s.ar}</span>
              <span className="status-line">{c.built}</span>
              <span className="status-go">Open the magazine →</span>
            </button>
          ))}

          <div className="status-card off">
            <span className="shelf-n mono">113</span>
            <span className="status-name">Sealed</span>
            <span className="status-ar ar">قيد الكتابة</span>
            <span className="status-line">{c.next}</span>
            <span className="status-go dim">Each will open the same way</span>
          </div>
        </div>

        <div className="status-shape">
          <div className="eyebrow eyebrow-signal" style={{ marginBottom: ".8rem" }}>
            What every sūrah will contain
          </div>
          <ol>
            {[
              "Its own index — the movements, in order, every one a link",
              "An introduction: what this sūrah is and how it argues",
              "Context: the occasion, only where one is reported",
              "The theme, with the sūrah's central image",
              "The text — every āyah, every word tappable",
              "A story from the sūrah's own material",
              "Its lexicon: every root it uses",
              "A conclusion, and the sources",
            ].map((x, i) => (
              <li key={i}>
                <span className="mono">{String(i + 1).padStart(2, "0")}</span>
                {x}
              </li>
            ))}
          </ol>
        </div>

        <div className="pager">
          <button className="pager-btn" onClick={() => go("method")}>
            <span className="pager-dir">←</span>
            <span className="pager-name">The rules</span>
          </button>
          <button className="pager-btn next" onClick={() => go("index")}>
            <span className="pager-dir">The shelf →</span>
            <span className="pager-name">114 sūrahs</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- source chip
   Small, shared: the source name behind a line, opening the sources page. */

const SRC: Record<string, string> = {
  quran: "Qur’ān text — Tanzil",
  mukhtasar: "al-Mukhtaṣar — King Fahd Complex",
  mufradat: "al-Mufradāt — al-Rāghib",
  ahmad_76: "Musnad Aḥmad 76",
  mufaddal: "",
};

function Chips({ keys }: { keys: (string | undefined)[] }) {
  const list = keys.filter(Boolean) as string[];
  if (!list.length) return null;
  return (
    <div className="lib-chips">
      {list.map((k) => (
        <span key={k} className="lib-chip" title={SRC[k] || k}>
          {SRC[k] || k}
        </span>
      ))}
    </div>
  );
}

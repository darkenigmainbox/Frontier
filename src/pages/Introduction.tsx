import { editorial } from "../data";
import { ChapterHead } from "../components/ChapterHead";
import { SourceChip } from "../components/Source";

export function Introduction({ go }: { go: (s: string) => void }) {
  const intro = editorial.introduction;

  return (
    <div className="page">
      <div className="wrap">
        <ChapterHead
          number="02"
          label="Introduction"
          title={intro.lede.split(".")[0] + "."}
          quote="Forty-three āyāt, delivered in Makkah, about a world that was already speaking."
        />

        <div className="split split-13">
          <div>
            <div className="ar" style={{ fontSize: "clamp(1.35rem,4.4vw,1.85rem)", color: "var(--paper)", lineHeight: 2 }}>
              {intro.arabicHeading}
            </div>
            <div className="eyebrow" style={{ marginTop: ".8rem" }}>
              Ar-Raʿd 13:1
            </div>
          </div>

          <div className="prose">
            <p className="drop">{intro.lede}</p>
            {intro.paragraphs.map((p: any, i: number) => (
              <p key={i}>
                {p.text}
                {p.cite && <SourceChip id={p.cite} />}
              </p>
            ))}
          </div>
        </div>

        <div className="facts">
          {intro.facts.map((f: any) => (
            <div className="fact" key={f.label}>
              <div className="fact-v">{f.value}</div>
              <div className="fact-k">{f.label}</div>
            </div>
          ))}
        </div>

        <div className="split split-2" style={{ alignItems: "center" }}>
          <figure className="figure aspect-4-5">
            <img src="/img/arch.webp" alt="A dark architectural study — light through a single opening" />
            <figcaption>The sūrah's argument is architectural: things held in place that should not hold.</figcaption>
          </figure>

          <div>
            <blockquote className="pullquote" style={{ marginTop: 0 }}>
              <p>“{intro.pullQuote.text}”</p>
              <cite>{intro.pullQuote.attribution}</cite>
            </blockquote>
            <p className="prose" style={{ fontSize: ".95rem" }}>
              Read in one sitting it takes about twenty minutes. Read the way it was delivered — a
              handful of āyāt at a time, over days — it behaves less like an essay and more like
              weather.
            </p>
            <button
              className="enter-btn"
              style={{ marginTop: "1.2rem", background: "var(--paper)", color: "var(--ink)" }}
              onClick={() => go("tafsir")}
            >
              Begin the text <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

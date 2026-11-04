import { editorial } from "../data";
import { ChapterHead } from "../components/ChapterHead";
import { HadithCard, SourceChip } from "../components/Source";

export function Story({ go }: { go: (s: string) => void }) {
  const s = editorial.story;

  return (
    <div className="page">
      <div className="wrap">
        <ChapterHead number="07" label="Story" title={s.title} quote={s.standfirst} kicker="Musnad Aḥmad 76 · Ṣaḥīḥ al-Bukhārī 4986" />

        <div className="split split-13">
          <figure className="figure aspect-4-5" style={{ alignSelf: "start" }}>
            <img src="/img/scribe.webp" alt="A reed pen and an inkwell on an aged page, raking light" />
            <figcaption>Zayd ibn Thābit — one of the scribes of the revelation.</figcaption>
          </figure>

          <div className="prose">
            {s.paragraphs.map((p: any, i: number) => (
              <p key={i} className={i === 0 ? "drop" : undefined}>
                {p.text}
                {p.cite && <SourceChip id={p.cite} />}
              </p>
            ))}
          </div>
        </div>

        <div className="split split-2" style={{ marginTop: "clamp(2rem,5vw,3rem)" }}>
          <div>
            <HadithCard id="ahmad_76" />
          </div>
          <div>
            <blockquote className="pullquote" style={{ marginTop: 0 }}>
              <p>“{s.pullQuote.text}”</p>
              <cite>{s.pullQuote.attribution}</cite>
            </blockquote>
            <p className="tiny muted" style={{ lineHeight: 1.7 }}>
              The comparison is exact and it is the sūrah's own: the demand in āyah 31 was for a
              recitation heavy enough to move mountains. What was actually produced was a book, and
              the man who gathered it described the work in the same terms.
            </p>
          </div>
        </div>

        <button
          className="enter-btn"
          style={{ marginTop: "2.4rem", background: "var(--paper)", color: "var(--ink)" }}
          onClick={() => go("colophon")}
        >
          Sources & colophon <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  );
}

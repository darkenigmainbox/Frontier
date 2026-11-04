import { editorial } from "../data";
import { ChapterHead } from "../components/ChapterHead";
import { SourceChip } from "../components/Source";

export function Theme({ go }: { go: (s: string) => void }) {
  const t = editorial.theme;

  return (
    <div className="page">
      <div className="wrap">
        <ChapterHead
          number="05"
          label="Theme"
          title={t.title}
          quote={t.standfirst}
          kicker="13:17"
        />

        <div className="split split-2" style={{ marginBottom: "clamp(2rem,5vw,3rem)" }}>
          <figure className="figure aspect-4-5">
            <img src="/img/flood.webp" alt="A river bed in flood, carrying foam on the surface" />
            <figcaption>The wādī in flood — the water is the message, the foam is the noise.</figcaption>
          </figure>
          <figure className="figure aspect-4-5">
            <img src="/img/fire.webp" alt="Molten metal in a crucible, dross rising to the surface" />
            <figcaption>Smelted ore throwing up its scum. The valuable thing is underneath.</figcaption>
          </figure>
        </div>

        <div className="prose" style={{ maxWidth: "62ch" }}>
          {t.blocks.map((b: any, i: number) => (
            <section key={i} style={{ marginBottom: "clamp(2rem,5vw,3rem)" }}>
              <div className="eyebrow eyebrow-signal" style={{ marginBottom: ".7rem" }}>
                {b.label}
              </div>
              {b.arabic && (
                <div
                  className="ar"
                  style={{
                    fontSize: "clamp(1.3rem,4.2vw,1.7rem)",
                    color: "var(--paper)",
                    lineHeight: 2,
                    textAlign: "right",
                    marginBottom: ".9rem",
                  }}
                >
                  {b.arabic}
                </div>
              )}
              <p>
                {b.text}
                {b.cite && <SourceChip id={b.cite} />}
              </p>
            </section>
          ))}
        </div>

        <div className="pullquote">
          <p>“As for the foam, it goes as jetsam. As for what benefits people, it remains in the earth.”</p>
          <cite>Ar-Raʿd 13:17</cite>
        </div>

        <div style={{ marginTop: "clamp(2rem,5vw,3rem)" }}>
          <div className="eyebrow" style={{ marginBottom: "1.2rem" }}>
            How the sūrah is built
          </div>
          <div className="index-grid" style={{ borderTop: "1px solid var(--line)" }}>
            {t.structure.map((s: any) => (
              <div
                key={s.range}
                style={{
                  display: "grid",
                  gridTemplateColumns: "4rem 1fr",
                  gap: "1rem",
                  padding: "1.15rem 0",
                  borderBottom: "1px solid var(--line-soft)",
                  alignItems: "baseline",
                }}
              >
                <span className="mono tiny dim">{s.range}</span>
                <div>
                  <div style={{ fontSize: "1.02rem", color: "var(--paper)", letterSpacing: "-.01em" }}>
                    {s.title}
                  </div>
                  <div className="tiny muted" style={{ marginTop: ".2rem", lineHeight: 1.55 }}>
                    {s.text}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          className="enter-btn"
          style={{ marginTop: "2.4rem", background: "var(--paper)", color: "var(--ink)" }}
          onClick={() => go("tafsir")}
        >
          Read it āyah by āyah <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  );
}

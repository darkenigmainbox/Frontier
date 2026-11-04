import { editorial } from "../data";
import { ChapterHead } from "../components/ChapterHead";
import { HadithCard, SourceChip } from "../components/Source";

export function Context() {
  const c = editorial.context;

  return (
    <div className="page">
      <div className="wrap">
        <ChapterHead number="03" label="Context" title={c.title} quote={c.standfirst} kicker="6 AH · Al-Ḥudaybiyyah" />

        <figure className="figure aspect-16-9" style={{ marginBottom: "clamp(2rem,5vw,3rem)" }}>
          <img src="/img/desert.webp" alt="Desert approach — a caravan road in low light" />
          <figcaption>
            The Ḥijāz road south from Madīnah. Fourteen hundred travellers, no weapons for war.
          </figcaption>
        </figure>

        <div className="split split-13">
          <div>
            <div className="eyebrow eyebrow-signal" style={{ marginBottom: ".8rem" }}>
              The occasion
            </div>
            <p className="tiny muted" style={{ lineHeight: 1.7 }}>
              The report below is the longest treaty account in Ṣaḥīḥ al-Bukhārī. It is not only the
              single clearest occasion tied to this sūrah — it is one of the clearest occasions tied
              to any sūrah, with the refusal recorded verbatim.
            </p>
            <div className="hr-thin" />
            <div className="eyebrow" style={{ marginBottom: ".6rem" }}>
              Read alongside
            </div>
            <p className="tiny dim">Ar-Raʿd 13:30 · 13:31 · 13:39</p>
          </div>

          <div className="prose">
            {c.narrative.map((n: any, i: number) => (
              <div key={i} style={{ marginBottom: "1.8em" }}>
                <h3
                  style={{
                    fontSize: ".68rem",
                    letterSpacing: ".18em",
                    textTransform: "uppercase",
                    color: "var(--signal)",
                    marginBottom: ".5rem",
                    fontWeight: 500,
                  }}
                >
                  {n.heading}
                </h3>
                <p>
                  {n.text}
                  {n.cite && <SourceChip id={n.cite} />}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="split split-2" style={{ marginTop: "clamp(2rem,6vw,3.4rem)" }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: ".8rem" }}>
              The document
            </div>
            <HadithCard id="bukhari_2731" />
          </div>
          <div>
            <div className="eyebrow" style={{ marginBottom: ".8rem" }}>
              The line that did it
            </div>
            <div className="caveat" style={{ marginTop: 0 }}>
              <h4>“I do not know al-Raḥmān”</h4>
              <p>
                Suhayl ibn ʿAmr's objection is not that the name is unfamiliar as a word. It is that
                the name makes a claim about the One being addressed, and he was not prepared to sign
                it. Ar-Raʿd 13:30 answers the same objection: “while they disbelieve in al-Raḥmān. Say:
                He is my Lord; there is none worthy of worship but He.”{" "}
                <SourceChip id="mukhtasar" />
              </p>
            </div>
            <div className="timeline">
              {c.timeline.map((t: any) => (
                <div className="tl-item" key={t.date}>
                  <div className="tl-date">{t.date}</div>
                  <div className="tl-text">{t.text}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="caveat" style={{ borderColor: "#3a2f1d" }}>
          <h4>{c.caveat.title}</h4>
          <p>{c.caveat.text}</p>
        </div>
      </div>
    </div>
  );
}

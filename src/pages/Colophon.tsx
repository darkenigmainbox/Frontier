import { citations } from "../data";
import { ChapterHead } from "../components/ChapterHead";

export function Colophon({ go }: { go: (s: string) => void }) {
  const srcs = citations.sources as any[];
  const hadiths = Object.entries(citations.hadith) as [string, any][];

  return (
    <div className="page">
      <div className="wrap">
        <ChapterHead
          number="10"
          label="Sources"
          title="Colophon"
          quote="Every source, every hadith number, and the method behind the magazine."
          kicker="Rights · Method"
        />

        <h3
          style={{
            fontSize: ".68rem",
            letterSpacing: ".2em",
            textTransform: "uppercase",
            color: "var(--signal)",
            marginBottom: "1rem",
          }}
        >
          Sources
        </h3>

        <div style={{ borderTop: "1px solid var(--line)" }}>
          {srcs.map((s) => (
            <div
              key={s.id}
              style={{
                display: "grid",
                gap: ".35rem",
                padding: "1.1rem 0",
                borderBottom: "1px solid var(--line-soft)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: "1rem",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                }}
              >
                <span style={{ color: "var(--paper)", fontSize: ".98rem", letterSpacing: "-.01em" }}>
                  {s.label}
                </span>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="tiny"
                  style={{ color: "var(--signal)", borderBottom: "1px solid currentColor" }}
                >
                  open ↗
                </a>
              </div>
              <p className="tiny muted" style={{ lineHeight: 1.68, margin: 0 }}>
                {s.detail}
              </p>
            </div>
          ))}
        </div>

        <h3
          style={{
            fontSize: ".68rem",
            letterSpacing: ".2em",
            textTransform: "uppercase",
            color: "var(--signal)",
            margin: "3rem 0 1rem",
          }}
        >
          Hadith cited — every one checked
        </h3>
        <p className="tiny muted" style={{ marginBottom: "1.2rem", maxWidth: "62ch" }}>
          Each entry below was opened on sunnah.com and its printed grade recorded. Nothing is
          quoted from memory, and nothing is quoted from a collection this magazine has not read.
        </p>

        <div style={{ borderTop: "1px solid var(--line)" }}>
          {hadiths.map(([key, h]) => (
            <a
              key={key}
              href={h.url}
              target="_blank"
              rel="noreferrer noopener"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: ".4rem 1rem",
                padding: "1rem 0",
                borderBottom: "1px solid var(--line-soft)",
                alignItems: "baseline",
              }}
            >
              <span style={{ fontSize: ".94rem", color: "var(--paper)" }}>
                {h.collection} · {h.number}
              </span>
              <span
                className="tiny"
                style={{
                  color: h.grade.toLowerCase().includes(" ḥasan") || h.grade.toLowerCase().startsWith("ḥasan") ? "#8aa87f" : "#8aa87f",
                  border: "1px solid var(--line)",
                  padding: ".1rem .45rem",
                  borderRadius: 3,
                  justifySelf: "end",
                  fontSize: ".58rem",
                  letterSpacing: ".06em",
                  textTransform: "uppercase",
                }}
              >
                {h.grade}
              </span>
              <span className="tiny dim" style={{ gridColumn: "1 / -1" }}>
                Narrated by {h.narrator}
              </span>
            </a>
          ))}
        </div>

        <div className="caveat" style={{ marginTop: "2.5rem" }}>
          <h4>Method, stated plainly</h4>
          <p>
            The Qur'ān text is Tanzil's Uthmani text; the translation is Saheeh International. Word
            segmentation and root assignment are from the Quranic Arabic Corpus v0.4. Root senses are
            condensed from Lane and al-Mufradāt with per-root provenance. Commentary is quoted from
            al-Mukhtaṣar (King Fahd Complex) and the abridged Ibn Kathīr; it is not rewritten in the
            magazine's own voice. Occasion-of-revelation notes distinguish, on every āyah, between a
            named report, a reading of the text, a dispute, and a report that should not be repeated
            as fact. Where an āyah's famous story is weak, the page says so rather than dropping it
            silently.
          </p>
        </div>

        <div
          className="tiny dim"
          style={{
            marginTop: "2.5rem",
            borderTop: "1px solid var(--line-soft)",
            paddingTop: "1.2rem",
            lineHeight: 1.7,
          }}
        >
          <p>
            Ar-Raʿd · A Sūrah Magazine. Text under the Open Font License (Amiri Quran, Inter). Qur'ān
            text and translation are the property of their respective rights holders and are used
            here for study. Imagery is generated; it is illustrative and not historical.
          </p>
          <p style={{ marginTop: ".8rem" }}>
            <button className="icon-btn" onClick={() => go("index")}>
              ← Back to index
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

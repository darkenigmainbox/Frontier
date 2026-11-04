import { editorial, ayat, rootCount } from "../data";
import { ChapterHead } from "../components/ChapterHead";

export function Conclusion({ go }: { go: (s: string) => void }) {
  const c = editorial.conclusion;
  const reportCount = ayat.filter((a) => a.note?.type === "report").length;
  const flagged = ayat.filter(
    (a) => a.note?.type === "caution" || a.note?.type === "disputed"
  ).length;

  return (
    <div className="page">
      <div className="wrap">
        <ChapterHead
          number="08"
          label="Conclusion"
          title={c.title}
          quote="Read as a whole, the sūrah does not argue anyone out of their position. It shows them their own world."
          kicker="13:27 · 13:39 · 13:43"
        />

        <div className="split split-13" style={{ marginBottom: "clamp(2.5rem,6vw,4rem)" }}>
          <div style={{ alignSelf: "start" }}>
            <div
              className="ar"
              style={{
                fontSize: "clamp(1.3rem,4.4vw,1.7rem)",
                color: "var(--paper)",
                lineHeight: 2.05,
              }}
            >
              {c.closing}
            </div>
            <p className="tiny dim" style={{ marginTop: ".5rem" }}>
              {c.closingTranslation}
            </p>
            <figure className="figure aspect-1-1" style={{ marginTop: "1.6rem" }}>
              <img src="/img/arch.webp" alt="A single shaft of light in a dark concrete interior" />
              <figcaption>The argument is architectural: things held in place that should not hold.</figcaption>
            </figure>
          </div>

          <div className="prose">
            {c.paragraphs.map((p: any, i: number) => (
              <p key={i} className={i === 0 ? "drop" : undefined}>
                {p.text}
              </p>
            ))}
          </div>
        </div>

        <div className="facts" style={{ marginBottom: "clamp(2.5rem,6vw,4rem)" }}>
          <div className="fact">
            <div className="fact-v">{ayat.length}</div>
            <div className="fact-k">Āyāt annotated</div>
          </div>
          <div className="fact">
            <div className="fact-v">{rootCount}</div>
            <div className="fact-k">Roots traced</div>
          </div>
          <div className="fact">
            <div className="fact-v">{reportCount}</div>
            <div className="fact-k">Named occasions</div>
          </div>
          <div className="fact">
            <div className="fact-v">{flagged}</div>
            <div className="fact-k">Flagged reports</div>
          </div>
        </div>

        <div className="split split-2">
          <div>
            <div className="eyebrow" style={{ marginBottom: ".7rem" }}>
              What to do next
            </div>
            <p className="prose" style={{ fontSize: ".95rem" }}>
              Read the sūrah again, straight through, without opening a single note. Then read
              āyah 17 once more and see whether the flood has changed shape now that you know who
              was standing in it.
            </p>
            <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap", marginTop: "1.2rem" }}>
              <button
                className="enter-btn"
                style={{ background: "var(--paper)", color: "var(--ink)", margin: 0 }}
                onClick={() => go("tafsir")}
              >
                Back to the text <span aria-hidden="true">→</span>
              </button>
              <button className="icon-btn" onClick={() => go("colophon")}>
                Sources
              </button>
            </div>
          </div>
          <div>
            <div className="eyebrow" style={{ marginBottom: ".7rem" }}>
              The last āyah
            </div>
            <div
              className="ar"
              style={{
                fontSize: "clamp(1.2rem,3.8vw,1.5rem)",
                lineHeight: 2.1,
                color: "var(--paper)",
                textAlign: "right",
              }}
            >
              وَالَّذِينَ آتَيْنَاهُمُ الْكِتَابَ يَفْرَحُونَ بِمَا أُنزِلَ إِلَيْكَ
            </div>
            <p className="tiny muted" style={{ marginTop: ".6rem", lineHeight: 1.7 }}>
              “And those to whom We have given the Scripture rejoice at what has been revealed to
              you.” — 13:36
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

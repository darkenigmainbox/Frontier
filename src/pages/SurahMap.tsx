import { useState } from "react";
import { editorial, roots, type Root } from "../data";
import surahIndex from "../data/surah-index.json";
import { ChapterHead } from "../components/ChapterHead";
import { Portal } from "../components/Portal";
import { RootSheet } from "../components/Roots";

const OCC_LABEL: Record<string, string> = {
  report: "Occasion reported",
  disputed: "Disputed",
  caution: "Handle with care",
};

/**
 * The index *inside* the sūrah.
 *
 * The magazine has an index (all chapters); this is the sūrah's own index:
 * its movements, the āyāt with a reported occasion, the words it repeats, and
 * its vocabulary. Every line is a link into the text or into a root — nothing
 * here is a claim of its own.
 */
export function SurahMap({ go }: { go: (s: string) => void }) {
  const [openRoot, setOpenRoot] = useState<Root | null>(null);
  const data = surahIndex as any;

  const open = (n: number) => go(`tafsir/${n}`);

  const jump = (root: string, ayah: number) => {
    const r = (roots as any)[root];
    if (r) setOpenRoot(r);
    else open(ayah);
  };

  return (
    <div className="page">
      <div className="wrap">
        <ChapterHead
          number="02"
          label="The sūrah's index"
          title={data.title}
          quote={data.standfirst}
          kicker="Ar-Raʿd 13 · 43 āyāt"
        />

        {/* ------------------------------------------------- movements */}
        <section style={{ marginTop: "clamp(1.5rem,5vw,2.5rem)" }}>
          {data.movements.map((m: any, i: number) => (
            <div key={i} className="mv">
              <div className="mv-head">
                <span className="mv-range mono">
                  {m.range[0]}–{m.range[1]}
                </span>
                <h2 className="mv-label">{m.label}</h2>
              </div>
              <p className="mv-note">{m.note}</p>

              <div className="mv-entries">
                {m.entries.map((e: any, j: number) => {
                  // Only an entry that IS the āyah with the report carries the tag.
                  // 11 has two entries (the report, and the "a people does not
                  // change" line); the tag belongs to the first, not the second.
                  const kind = e.occ;
                  const isOcc = kind === "report" || kind === "disputed" || kind === "caution";
                  return (
                    <button
                      key={j}
                      className="mv-entry"
                      onClick={() => open(e.ayah)}
                      title={`Open āyah ${e.ayah}`}
                    >
                      <span className="mv-n mono">{e.ayah}</span>
                      <span className="mv-t">{e.title}</span>
                      {isOcc && (
                        <span className={"mv-occ " + kind}>
                          {OCC_LABEL[kind as string] || "Occasion"}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </section>

        {/* ------------------------------------------------- occasions + vocab */}
        <div className="split split-2" style={{ marginTop: "clamp(2.2rem,6vw,3.5rem)" }}>
          <section>
            <div className="eyebrow eyebrow-signal" style={{ marginBottom: ".5rem" }}>
              Where an occasion is reported
            </div>
            <p className="tiny dim" style={{ marginBottom: "1rem", lineHeight: 1.7 }}>
              Seven āyāt in this sūrah carry a report about when or why they came down.
              Each is labelled with what kind of claim it is. The rest say plainly that
              no occasion is reported.
            </p>
            <div style={{ borderTop: "1px solid var(--line)" }}>
              {data.occasions.map((o: any) => (
                <button key={o.ayah} className="occ-item" onClick={() => open(o.ayah)}>
                  <span className="occ-item-n mono">{o.ayah}</span>
                  <span>
                    <span className="occ-item-t">{o.title}</span>
                    <span className="occ-item-w">{o.who}</span>
                  </span>
                  <span className={"occ-pill " + o.kind}>{OCC_LABEL[o.kind]}</span>
                </button>
              ))}
            </div>
          </section>

          <section>
            <div className="eyebrow eyebrow-signal" style={{ marginBottom: ".5rem" }}>
              The words it turns on
            </div>
            <p className="tiny dim" style={{ marginBottom: "1rem", lineHeight: 1.7 }}>
              Twelve words that carry the sūrah. Tap one for its root and its meaning.
            </p>
            <div className="vocab">
              {data.vocabulary.map((v: any, i: number) => (
                <button key={i} className="vocab-item" onClick={() => jump(v.root, v.ayah)}>
                  <span className="vocab-ar ar">{v.ar}</span>
                  <span className="vocab-en">{v.en}</span>
                  <span className="vocab-n mono">
                    {v.root} · {v.ayah}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>

      </div>

      {openRoot && (
        <Portal>
          <RootSheet root={openRoot} onClose={() => setOpenRoot(null)} />
        </Portal>
      )}
    </div>
  );
}

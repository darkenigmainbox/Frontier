import { useCallback, useEffect, useRef, useState } from "react";
import { roots, rootFrequency, particles, type Root } from "../data";
import { Portal } from "./Portal";

function ParticleSheet({
  word,
  info,
  onClose,
}: {
  word: string;
  info: { en: string; kind: string; note?: string };
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <Portal>
      <div className="scrim" onClick={onClose} />
      <aside className="sheet" role="dialog" aria-modal="true" aria-label={`Gloss for ${word}`}>
        <div className="sheet-inner">
          <div className="sheet-close">
            <button className="icon-btn" onClick={onClose} aria-label="Close">
              Close ✕
            </button>
          </div>
          <div className="sheet-word ar">{word}</div>
          <div className="sheet-label" style={{ marginTop: "1.2rem" }}>
            {info.kind}
          </div>
          <div className="sheet-text" style={{ color: "var(--paper)", fontSize: "1.02rem" }}>
            {info.en}
          </div>
          {info.note && (
            <>
              <div className="sheet-label">Note</div>
              <div className="sheet-text">{info.note}</div>
            </>
          )}
          <div className="hr-thin" />
          <p className="tiny dim" style={{ lineHeight: 1.6 }}>
            Function words — prepositions, pronouns, particles — have no three-letter root. This
            gloss gives the force the word carries in this āyah.
          </p>
        </div>
      </aside>
    </Portal>
  );
}

export function RootSheet({ root, word, onClose }: { root: Root; word?: string; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const letters = Array.from(root.arabic);

  return (
    <Portal>
      <div className="scrim" onClick={onClose} />
      <aside
        className="sheet"
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={`Root ${root.arabic}`}
      >
        <div className="sheet-inner">
          <div className="sheet-close">
            <button className="icon-btn" onClick={onClose} aria-label="Close">
              Close ✕
            </button>
          </div>

          {word && <div className="sheet-word ar">{word}</div>}

          <div className="sheet-label" style={{ marginTop: word ? "1.4rem" : "0.4rem" }}>
            Root
          </div>
          <div className="sheet-root-letters">
            {letters.map((l, i) => (
              <span className="root-letter" key={i}>
                {l}
              </span>
            ))}
            <span className="root-letter sep">·</span>
            <span className="root-letter sep">{root.qac}</span>
          </div>

          <div className="sheet-text" style={{ marginTop: ".4rem" }}>
            {root.summary}
          </div>

          {root.development && (
            <>
              <div className="sheet-label">How the root develops</div>
              <div className="sheet-text">{root.development}</div>
            </>
          )}

          {root.senses.length > 0 && (
            <>
              <div className="sheet-label">Attested senses</div>
              {root.senses.map((s, i) => (
                <div className="sense" key={i}>
                  <div className="sense-tag">
                    {s.headword ? `${s.headword}  ·  ` : ""}
                    {s.pos}
                  </div>
                  <div className="sense-def">{s.definition}</div>
                  {s.when && <div className="sense-when">{s.when}</div>}
                </div>
              ))}
            </>
          )}

          {root.cautions.length > 0 && (
            <>
              <div className="sheet-label">Cautions</div>
              {root.cautions.map((c, i) => (
                <div key={i} className="sheet-text" style={{ color: "var(--muted)", marginBottom: ".6rem" }}>
                  — {c}
                </div>
              ))}
            </>
          )}

          <div className="sheet-label">Appears in</div>
          <div className="sheet-text">
            {rootFrequency[root.root] || 1} āyah{rootFrequency[root.root] === 1 ? "" : "s"} of this
            sūrah
          </div>

          {root.sources.length > 0 && (
            <>
              <div className="sheet-label">Provenance</div>
              <div className="prov">
                {root.sources.map((s) => (
                  <span key={s}>{s.replace(":", " ")}</span>
                ))}
              </div>
            </>
          )}

          <div className="hr-thin" />
          <p className="tiny dim" style={{ lineHeight: 1.6 }}>
            Root senses are condensed from Lane's Arabic–English Lexicon and al-Rāghib
            al-Iṣfahānī's al-Mufradāt, cross-checked per root. Word segmentation and root
            assignment follow the Quranic Arabic Corpus v0.4.
          </p>
        </div>
      </aside>
    </Portal>
  );
}

export function useRoots() {
  const [state, setState] = useState<{ root?: string; word?: string; particle?: string } | null>(
    null
  );

  const open = useCallback((rootKey: string, word?: string) => {
    if (!roots[rootKey]) return;
    setState({ root: rootKey, word });
  }, []);

  const openParticle = useCallback((key: string, word: string) => {
    if (!particles[key]) return;
    setState({ particle: key, word });
  }, []);

  const close = useCallback(() => setState(null), []);

  const element = state ? (
    state.root ? (
      <RootSheet root={roots[state.root]} word={state.word} onClose={close} />
    ) : state.particle ? (
      <ParticleSheet word={state.word || ""} info={particles[state.particle]} onClose={close} />
    ) : null
  ) : null;

  return { open, openParticle, close, element, active: state?.root };
}

type Props = {
  words: { ar: string; root: string; p?: string }[];
  onOpen: (root: string, word?: string) => void;
  onOpenParticle: (key: string, word: string) => void;
  activeRoot?: string;
};

/** The Arabic āyah. Every word is tappable: roots open the lexicon, particles open a gloss. */
export function ArabicAyah({ words, onOpen, onOpenParticle, activeRoot }: Props) {
  return (
    <div className="ayah-ar ar">
      {words.map((w, i) => {
        const hasRoot = !!w.root && !!roots[w.root];
        const hasParticle = !hasRoot && !!w.p && !!particles[w.p];
        if (!hasRoot && !hasParticle) return <span key={i}>{w.ar} </span>;

        const act = hasRoot
          ? () => onOpen(w.root, w.ar)
          : () => onOpenParticle(w.p!, w.ar);

        return (
          <span key={i}>
            <span
              className={
                "w" +
                (hasRoot ? " root" : " particle") +
                (hasRoot && activeRoot === w.root ? " active" : "")
              }
              role="button"
              tabIndex={0}
              aria-label={
                hasRoot ? `${w.ar} — root ${roots[w.root].arabic}` : `${w.ar} — ${particles[w.p!].en}`
              }
              onClick={act}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  act();
                }
              }}
            >
              {w.ar}
            </span>{" "}
          </span>
        );
      })}
    </div>
  );
}

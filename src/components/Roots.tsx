import { useCallback, useEffect, useRef, useState } from "react";
import { roots, rootFrequency, type Root } from "../data";

function RootSheet({ root, word, onClose }: { root: Root; word?: string; onClose: () => void }) {
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
    <>
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
    </>
  );
}

export function useRoots() {
  const [state, setState] = useState<{ root: string; word?: string } | null>(null);

  const open = useCallback((rootKey: string, word?: string) => {
    if (!roots[rootKey]) return;
    setState({ root: rootKey, word });
  }, []);

  const close = useCallback(() => setState(null), []);

  const element = state ? (
    <RootSheet root={roots[state.root]} word={state.word} onClose={close} />
  ) : null;

  return { open, close, element, active: state?.root };
}

type Props = {
  words: { ar: string; root: string }[];
  onOpen: (root: string, word?: string) => void;
  activeRoot?: string;
};

/** The Arabic āyah, with every word that has a dictionary root made tappable. */
export function ArabicAyah({ words, onOpen, activeRoot }: Props) {
  return (
    <div className="ayah-ar ar">
      {words.map((w, i) => {
        const known = !!w.root && !!roots[w.root];
        return (
          <span key={i}>
            <span
              className={
                "w" + (known ? " root" : "") + (known && activeRoot === w.root ? " active" : "")
              }
              role={known ? "button" : undefined}
              tabIndex={known ? 0 : undefined}
              aria-label={known ? `${w.ar} — root ${roots[w.root].arabic}` : undefined}
              onClick={known ? () => onOpen(w.root, w.ar) : undefined}
              onKeyDown={
                known
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onOpen(w.root, w.ar);
                      }
                    }
                  : undefined
              }
            >
              {w.ar}
            </span>{" "}
          </span>
        );
      })}
    </div>
  );
}

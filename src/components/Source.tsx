import { useState } from "react";
import { citations, source } from "../data";

export function SourceChip({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const s = source(id);
  if (!s) return null;

  return (
    <>
      <button
        className="src"
        onClick={() => setOpen(true)}
        aria-label={`Source: ${s.label}`}
        title={s.label}
      >
        src
      </button>
      {open && (
        <>
          <div className="scrim" onClick={() => setOpen(false)} style={{ zIndex: 120 }} />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={s.label}
            style={{
              position: "fixed",
              zIndex: 130,
              inset: "auto 0 0 0",
              maxWidth: 560,
              margin: "0 auto",
              background: "var(--ink-2)",
              border: "1px solid var(--line)",
              borderRadius: "12px 12px 0 0",
              padding: "1.4rem 1.4rem 2rem",
              animation: "sheetUp .3s var(--ease) both",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div className="eyebrow eyebrow-signal">Source</div>
              <button
                className="icon-btn"
                onClick={() => setOpen(false)}
                aria-label="Close"
                style={{ height: 26, minWidth: 26 }}
              >
                ✕
              </button>
            </div>
            <h3 style={{ fontSize: "1.15rem", margin: "0.6rem 0 0.5rem", letterSpacing: "-0.02em" }}>
              {s.label}
            </h3>
            <p className="tiny muted" style={{ lineHeight: 1.65 }}>
              {s.detail}
            </p>
            {s.url && (
              <a
                href={s.url}
                target="_blank"
                rel="noreferrer noopener"
                className="tiny"
                style={{
                  color: "var(--signal)",
                  display: "inline-block",
                  marginTop: "0.7rem",
                  borderBottom: "1px solid currentColor",
                }}
              >
                Open source ↗
              </a>
            )}
            <div
              className="tiny dim"
              style={{ marginTop: "1.2rem", borderTop: "1px solid var(--line-soft)", paddingTop: "0.8rem" }}
            >
              {citations.sources.length} sources are listed in the colophon. Every citation in
              this magazine resolves to one of them.
            </div>
          </div>
        </>
      )}
    </>
  );
}

export function HadithCard({ id }: { id: string }) {
  const h = citations.hadith[id];
  if (!h) return null;
  return (
    <figure className="hadith">
      <div className="hadith-top">
        <div className="hadith-ref">
          {h.collection} · {h.number}
        </div>
        <div className="hadith-grade">{h.grade}</div>
      </div>
      {h.arabicKey && <div className="hadith-ar ar">{h.arabicKey}</div>}
      <blockquote className="hadith-en" style={{ margin: 0 }}>
        “{h.english}”
      </blockquote>
      <figcaption className="hadith-narr">
        Narrated by {h.narrator}
        {h.url && (
          <>
            {" · "}
            <a
              href={h.url}
              target="_blank"
              rel="noreferrer noopener"
              style={{ color: "var(--signal)", borderBottom: "1px solid currentColor" }}
            >
              verify on sunnah.com ↗
            </a>
          </>
        )}
      </figcaption>
    </figure>
  );
}

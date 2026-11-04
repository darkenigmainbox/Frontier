import { useEffect, useMemo, useState } from "react";
import { chapters, editorial } from "./data";
import { Cover } from "./pages/Cover";
import { Index } from "./pages/Index";
import { Introduction } from "./pages/Introduction";
import { Context } from "./pages/Context";
import { Theme } from "./pages/Theme";
import { Tafsir } from "./pages/Tafsir";
import { Story } from "./pages/Story";
import { RootsIndex } from "./pages/RootsIndex";
import { Colophon } from "./pages/Colophon";

const SLUGS = chapters.map((c) => c.slug);

export default function App({ initialSlug }: { initialSlug?: string } = {}) {
  const [slug, setSlug] = useState<string>(initialSlug || "home");
  const [drawer, setDrawer] = useState(false);
  const [light, setLight] = useState(false);
  const [showTranslation, setShowTranslation] = useState(true);
  const [focus, setFocus] = useState<number | undefined>(undefined);
  const [progress, setProgress] = useState(0);

  // theme
  useEffect(() => {
    const saved = localStorage.getItem("ar-rad-theme");
    if (saved === "light") setLight(true);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.classList.toggle("light", light);
    localStorage.setItem("ar-rad-theme", light ? "light" : "dark");
  }, [light]);

  // path routing — /context, /tafsir/11 … real URLs, shareable
  useEffect(() => {
    if (typeof window === "undefined") return;
    const apply = () => {
      const parts = window.location.pathname.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);
      const s = parts[0] || "home";
      setSlug(SLUGS.includes(s) ? s : "home");
      if (parts[0] === "tafsir" && parts[1]) {
        const n = parseInt(parts[1].replace(/[^0-9]/g, ""), 10);
        if (n >= 1 && n <= 43) setFocus(n);
      }
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    };
    apply();
    window.addEventListener("popstate", apply);
    return () => window.removeEventListener("popstate", apply);
  }, []);

  const go = (s: string) => {
    setDrawer(false);
    if (s !== "tafsir") setFocus(undefined);
    const target = s === "home" ? "/" : "/" + s;
    if (window.location.pathname === target) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    window.history.pushState({}, "", target);
    setSlug(s);
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  };

  // scroll progress
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setProgress(max > 0 ? (h.scrollTop / max) * 100 : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [slug]);

  // keyboard nav between chapters
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement) {
        const tag = e.target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || e.target.isContentEditable) return;
      }
      if (e.key === "Escape") setDrawer(false);
      if (e.key === "ArrowRight" || e.key === "n") {
        const i = SLUGS.indexOf(slug);
        const next = i === -1 ? SLUGS[1] : SLUGS[Math.min(SLUGS.length - 1, i + 1)];
        go(next);
      }
      if (e.key === "ArrowLeft" || e.key === "p") {
        const i = SLUGS.indexOf(slug);
        const prev = i <= 1 ? SLUGS[1] : SLUGS[i - 1];
        go(prev);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [slug]);

  const current = useMemo(() => chapters.find((c) => c.slug === slug), [slug]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const label = slug === "home" ? "A Sūrah Magazine" : current?.label ?? "A Sūrah Magazine";
    document.title =
      slug === "home"
        ? "Ar-Raʿd · A Sūrah Magazine"
        : `Ar-Raʿd · ${label}`;
  }, [slug, current]);

  const body = (() => {
    switch (slug) {
      case "home":
        return <Cover onEnter={() => go("index")} />;
      case "index":
        return <Index go={go} />;
      case "introduction":
        return <Introduction go={go} />;
      case "context":
        return <Context />;
      case "theme":
        return <Theme go={go} />;
      case "tafsir":
        return (
          <Tafsir
            focus={focus}
            setFocus={setFocus}
            showTranslation={showTranslation}
            setShowTranslation={setShowTranslation}
          />
        );
      case "story":
        return <Story go={go} />;
      case "roots":
        return <RootsIndex />;
      case "colophon":
        return <Colophon go={go} />;
      default:
        return <Index go={go} />;
    }
  })();

  const i = SLUGS.indexOf(slug);
  const prev = i > 1 ? chapters[i - 1] : null;
  const next = i >= 0 && i < SLUGS.length - 1 ? chapters[i + 1] : null;

  return (
    <div className="shell">
      <header className="topbar">
        <div className="wrap topbar-inner">
          <button
            className="brand"
            onClick={() => go("home")}
            style={{ background: "none", border: 0, cursor: "pointer", textAlign: "left" }}
            aria-label="Cover"
          >
            <span className="brand-num mono">13</span>
            <span className="brand-mark">
              Ar-Raʿd {current && current.slug !== "home" ? `· ${current.label}` : "· a sūrah magazine"}
            </span>
          </button>

          <button
            className="icon-btn"
            onClick={() => setLight(!light)}
            aria-label="Toggle theme"
            title="Toggle theme"
          >
            {light ? "Dark" : "Light"}
          </button>

          <button
            className="icon-btn"
            onClick={() => setDrawer(true)}
            aria-label="Open contents"
            aria-expanded={drawer}
          >
            <span aria-hidden="true" style={{ display: "grid", gap: 3 }}>
              <span style={{ width: 14, height: 1, background: "currentColor", display: "block" }} />
              <span style={{ width: 14, height: 1, background: "currentColor", display: "block" }} />
            </span>
            <span style={{ fontSize: ".66rem", letterSpacing: ".1em" }}>INDEX</span>
          </button>
          <div className="progress-line" style={{ width: `${progress}%` }} />
        </div>
      </header>

      <main style={{ flex: 1 }}>{body}</main>

      {slug !== "home" && slug !== "index" && (
        <nav className="wrap" style={{ paddingBottom: "clamp(1rem,4vw,2rem)" }}>
          <div className="pager">
            <button
              className="pager-btn"
              onClick={() => go(prev ? prev.slug : "index")}
              style={{ opacity: prev ? 1 : 0.5 }}
            >
              <span className="pager-dir">← Previous</span>
              <span className="pager-name">{prev ? prev.label : "Contents"}</span>
            </button>
            <button
              className="pager-btn next"
              onClick={() => go(next ? next.slug : "colophon")}
              style={{ opacity: next ? 1 : 0.5 }}
            >
              <span className="pager-dir">Next →</span>
              <span className="pager-name">{next ? next.label : "End"}</span>
            </button>
          </div>
          <div
            className="tiny dim"
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              paddingTop: ".9rem",
              flexWrap: "wrap",
            }}
          >
            <span>{editorial.surahMeta.name} · 13 · 43 āyāt</span>
            <span>← → to move between chapters</span>
          </div>
        </nav>
      )}

      {drawer && (
        <div className="drawer" role="dialog" aria-modal="true" aria-label="Contents">
          <div className="drawer-head">
            <span className="eyebrow eyebrow-signal">Contents</span>
            <button className="icon-btn" onClick={() => setDrawer(false)} aria-label="Close">
              Close ✕
            </button>
          </div>
          <div>
            <button className="index-row" onClick={() => go("home")}>
              <span className="index-num mono">00</span>
              <span className="index-label">Cover</span>
              <span className="index-tail" />
            </button>
            {chapters.map((c) => (
              <button
                key={c.slug}
                className="index-row"
                onClick={() => go(c.slug)}
                style={{ opacity: slug === c.slug ? 1 : 0.72 }}
              >
                <span className="index-num mono">{c.number}</span>
                <span
                  className="index-label"
                  style={{ color: slug === c.slug ? "var(--paper)" : undefined }}
                >
                  {c.label}
                </span>
                <span className="index-tail">{c.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

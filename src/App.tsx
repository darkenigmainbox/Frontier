import { useEffect, useState } from "react";
import { chapters, shelfSurah, shelfSurahs, type ShelfSurah } from "./data";

/* ---- the whole Qur'ān ---- */
import {
  LibraryCover,
  LibraryIntro,
  LibraryContext,
  LibraryMethod,
  LibraryStatus,
} from "./pages/Library";
import { Shelf } from "./pages/Shelf";
import { Sealed } from "./pages/Sealed";

/* ---- the one sūrah written so far ---- */
import { Index } from "./pages/Index";
import { SurahMap } from "./pages/SurahMap";
import { Introduction } from "./pages/Introduction";
import { Context } from "./pages/Context";
import { Theme } from "./pages/Theme";
import { Tafsir } from "./pages/Tafsir";
import { Story } from "./pages/Story";
import { RootsIndex } from "./pages/RootsIndex";
import { Conclusion } from "./pages/Conclusion";
import { Colophon } from "./pages/Colophon";

/**
 * Routes
 *
 *   /                          the library cover
 *   /index                     the shelf — all 114 sūrahs
 *   /introduction /context /method /status       the library's front matter
 *
 *   /surah/13                  Ar-Raʿd — its own index
 *   /surah/13/tafsir           the text
 *   /surah/13/tafsir/11        one āyah
 *   /surah/2 …                 any other sūrah: sealed plate
 *
 *   /tafsir …                  the first build's URLs, still redirect here
 */
type View =
  | { v: "cover" }
  | { v: "shelf" }
  | { v: "lib-intro" }
  | { v: "lib-context" }
  | { v: "lib-method" }
  | { v: "lib-status" }
  | { v: "mag"; slug: string; ayah?: number }
  | { v: "sealed"; n: number };

const MAGAZINE = new Set(chapters.map((c) => c.slug));

function parse(pathname: string): View {
  const p = pathname.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);
  const head = p[0] || "";

  if (!head) return { v: "cover" };
  if (head === "index") return { v: "shelf" };
  if (head === "introduction") return { v: "lib-intro" };
  if (head === "context") return { v: "lib-context" };
  if (head === "method") return { v: "lib-method" };
  if (head === "status") return { v: "lib-status" };

  if (head === "surah" && p[1]) {
    const n = parseInt(p[1], 10);
    if (!(n >= 1 && n <= 114)) return { v: "shelf" };
    if (n !== 13) return { v: "sealed", n };
    const sub = p[2];
    const ayah = p[3] ? parseInt(p[3], 10) : undefined;
    return { v: "mag", slug: sub && MAGAZINE.has(sub) ? sub : "map", ayah };
  }

  // The first build's flat URLs: they belong to sūrah 13.
  if (head === "tafsir") {
    const ayah = p[1] ? parseInt(p[1], 10) : undefined;
    return { v: "mag", slug: "tafsir", ayah };
  }
  if (MAGAZINE.has(head)) return { v: "mag", slug: head };

  return { v: "shelf" };
}

/** The URL a view lives at. One place, so links cannot drift from the router. */
export function href(view: View): string {
  switch (view.v) {
    case "cover":
      return "/";
    case "shelf":
      return "/index";
    case "lib-intro":
      return "/introduction";
    case "lib-context":
      return "/context";
    case "lib-method":
      return "/method";
    case "lib-status":
      return "/status";
    case "sealed":
      return `/surah/${view.n}`;
    case "mag":
      return view.slug === "map" ? "/surah/13" : "/surah/13/" + view.slug;
  }
}

export default function App({ initialPath }: { initialPath?: string } = {}) {
  const [view, setView] = useState<View>(() =>
    parse(initialPath ?? (typeof window !== "undefined" ? window.location.pathname : "/"))
  );
  const [drawer, setDrawer] = useState(false);
  const [light, setLight] = useState(false);
  const [showTranslation, setShowTranslation] = useState(true);
  const [progress, setProgress] = useState(0);

  /* ---------------------------------------------------------------- theme */
  useEffect(() => {
    const saved = localStorage.getItem("ar-rad-theme");
    if (saved === "light") setLight(true);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("light", light);
    localStorage.setItem("ar-rad-theme", light ? "light" : "dark");
  }, [light]);

  /* ---------------------------------------------------------------- routing */
  useEffect(() => {
    const apply = () => {
      setView(parse(window.location.pathname));
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    };
    apply();
    window.addEventListener("popstate", apply);
    return () => window.removeEventListener("popstate", apply);
  }, []);

  /** go("/surah/13/tafsir/11") — the string is the URL, so there is one truth. */
  const go = (path: string) => {
    const target = path.startsWith("/") ? path : "/" + path;
    setDrawer(false);
    if (window.location.pathname === target) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    window.history.pushState({}, "", target);
    setView(parse(target));
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  };

  /* ---------------------------------------------------------------- title */
  useEffect(() => {
    const base = "A Sūrah Magazine";
    if (view.v === "cover") document.title = `The Qur’ān · ${base}`;
    else if (view.v === "shelf") document.title = `114 sūrahs · ${base}`;
    else if (view.v === "sealed") {
      const s = shelfSurah(view.n);
      document.title = s ? `${s.name} · Sūrah ${s.n} — not yet written` : base;
    } else if (view.v === "mag") {
      const c = chapters.find((x) => x.slug === view.slug);
      document.title = `Ar-Raʿd · ${c?.label ?? "A Sūrah Magazine"}`;
    } else {
      const label = {
        "lib-intro": "Introduction",
        "lib-context": "Context",
        "lib-method": "Method",
        "lib-status": "What is written",
      }[view.v as string];
      document.title = `${label} · ${base}`;
    }
  }, [view]);

  /* ---------------------------------------------------------------- progress */
  useEffect(() => {
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
  }, [view]);

  /* ---------------------------------------------------------------- keyboard */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement) {
        const t = e.target.tagName;
        if (t === "INPUT" || t === "TEXTAREA" || e.target.isContentEditable) return;
      }
      if (e.key === "Escape") setDrawer(false);
      if (!(e.key === "ArrowRight" || e.key === "ArrowLeft")) return;
      if (view.v !== "mag") return;
      const i = chapters.findIndex((c) => c.slug === view.slug);
      const next = e.key === "ArrowRight" ? chapters[i + 1] : chapters[i - 1];
      if (next) {
        e.preventDefault();
        go(next.slug === "map" ? "/surah/13" : `/surah/13/${next.slug}`);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view]);

  /* ---------------------------------------------------------------- body */
  const body = (() => {
    switch (view.v) {
      case "cover":
        return <LibraryCover go={go} />;
      case "shelf":
        return <Shelf go={(n) => go(`/surah/${n}`)} />;
      case "lib-intro":
        return <LibraryIntro go={go} />;
      case "lib-context":
        return <LibraryContext go={go} />;
      case "lib-method":
        return <LibraryMethod go={go} />;
      case "lib-status":
        return <LibraryStatus go={go} />;
      case "sealed":
        return <Sealed n={view.n} go={go} />;

      case "mag": {
        const s = view.slug;
        const at = (x: string) => go(x === "map" ? "/surah/13" : `/surah/13/${x}`);
        switch (s) {
          case "index":
            return <Index go={at} />;
          case "map":
            return <SurahMap go={(to) => go(`/surah/13/${to}`)} />;
          case "introduction":
            return <Introduction go={at} />;
          case "context":
            return <Context />;
          case "theme":
            return <Theme go={at} />;
          case "tafsir":
            return (
              <Tafsir
                focus={view.ayah}
                setFocus={(n) => go(n ? `/surah/13/tafsir/${n}` : "/surah/13/tafsir")}
                showTranslation={showTranslation}
                setShowTranslation={setShowTranslation}
              />
            );
          case "story":
            return <Story go={at} />;
          case "roots":
            return <RootsIndex />;
          case "conclusion":
            return <Conclusion go={at} />;
          case "colophon":
            return <Colophon go={at} />;
          default:
            return <SurahMap go={(to) => go(`/surah/13/${to}`)} />;
        }
      }
    }
  })();

  const magIndex = view.v === "mag" ? chapters.findIndex((c) => c.slug === view.slug) : -1;
  const prev = magIndex > 0 ? chapters[magIndex - 1] : null;
  const next = magIndex >= 0 && magIndex < chapters.length - 1 ? chapters[magIndex + 1] : null;
  const inMagazine = view.v === "mag" && view.slug !== "index";

  return (
    <div className="shell">
      <header className="topbar">
        <div className="wrap topbar-inner">
          <button
            className="brand"
            onClick={() => go("/")}
            style={{ background: "none", border: 0, cursor: "pointer", textAlign: "left" }}
            aria-label="Cover"
          >
            <span className="brand-num mono">{brandNum(view)}</span>
            <span className="brand-mark">{brandMark(view)}</span>
          </button>

          <button className="icon-btn" onClick={() => setLight(!light)} aria-label="Toggle theme">
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

      {/* the pager belongs to the magazine, not to the library */}
      {inMagazine && (
        <nav className="wrap" style={{ paddingBottom: "clamp(1rem,4vw,2rem)" }}>
          <div className="pager">
            <button
              className="pager-btn"
              onClick={() => go(prev ? magHref(prev.slug) : "/index")}
              style={{ opacity: prev ? 1 : 0.5 }}
            >
              <span className="pager-dir">← Previous</span>
              <span className="pager-name">{prev ? prev.label : "The shelf"}</span>
            </button>
            <button
              className="pager-btn next"
              onClick={() => go(next ? magHref(next.slug) : "/index")}
              style={{ opacity: next ? 1 : 0.5 }}
            >
              <span className="pager-dir">Next →</span>
              <span className="pager-name">{next ? next.label : "The shelf"}</span>
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
            <span>Ar-Raʿd · 13 · 43 āyāt · of 114 sūrahs</span>
            <span>← → to move between chapters</span>
          </div>
        </nav>
      )}

      {drawer && (
        <Drawer
          view={view}
          go={go}
          close={() => setDrawer(false)}
          onPickSurah={(s) => go(`/surah/${s.n}`)}
        />
      )}
    </div>
  );
}

const magHref = (slug: string) => (slug === "map" ? "/surah/13" : `/surah/13/${slug}`);

function brandNum(view: View) {
  if (view.v === "sealed") return String(view.n).padStart(2, "0");
  if (view.v === "mag") return "13";
  return "13";
}

function brandMark(view: View) {
  if (view.v === "cover") return "Qur’ān · the library";
  if (view.v === "shelf") return "Qur’ān · 114 sūrahs";
  if (view.v === "sealed") {
    const s = shelfSurah(view.n);
    return `Qur’ān · ${s?.name ?? "sūrah"}`;
  }
  if (view.v === "mag") {
    const c = chapters.find((x) => x.slug === view.slug);
    return `Ar-Raʿd · ${c?.label ?? "the text"}`;
  }
  const label = {
    "lib-intro": "Introduction",
    "lib-context": "Context",
    "lib-method": "Method",
    "lib-status": "What is written",
  }[view.v as string];
  return `Qur’ān · ${label}`;
}

/* ---------------------------------------------------------------- drawer */

function Drawer({
  view,
  go,
  close,
  onPickSurah,
}: {
  view: View;
  go: (p: string) => void;
  close: () => void;
  onPickSurah: (s: ShelfSurah) => void;
}) {
  const inMag = view.v === "mag";
  const cur = view.v === "sealed" ? view.n : inMag ? 13 : 0;

  return (
    <div className="drawer" role="dialog" aria-modal="true" aria-label="Contents">
      <div className="drawer-head">
        <span className="eyebrow eyebrow-signal">Contents</span>
        <button className="icon-btn" onClick={close} aria-label="Close">
          Close ✕
        </button>
      </div>

      <div className="drawer-sub">
        <span className="eyebrow" style={{ color: "var(--muted)" }}>
          The library
        </span>
      </div>
      <div>
        {[
          ["00", "Cover", "/"],
          ["01", "The shelf", "/index"],
          ["02", "Introduction", "/introduction"],
          ["03", "How it became a book", "/context"],
          ["04", "The rules", "/method"],
          ["05", "What is written", "/status"],
        ].map(([n, label, href]) => (
          <button key={href} className="index-row" onClick={() => go(href)}>
            <span className="index-num mono">{n}</span>
            <span className="index-label">{label}</span>
            <span className="index-tail" />
          </button>
        ))}
      </div>

      <div className="drawer-sub">
        <span className="eyebrow" style={{ color: "var(--muted)" }}>
          Sūrah 13 · Ar-Raʿd
        </span>
      </div>
      <div>
        {chapters.map((c) => (
          <button
            key={c.slug}
            className="index-row"
            onClick={() => go(magHref(c.slug))}
            style={{ opacity: inMag && view.slug === c.slug ? 1 : 0.72 }}
          >
            <span className="index-num mono">{c.number}</span>
            <span
              className="index-label"
              style={{ color: inMag && view.slug === c.slug ? "var(--paper)" : undefined }}
            >
              {c.label}
            </span>
            <span className="index-tail">{c.title}</span>
          </button>
        ))}
      </div>

      <div className="drawer-sub">
        <span className="eyebrow" style={{ color: "var(--muted)" }}>
          Jump to a sūrah
        </span>
      </div>
      <div className="drawer-grid">
        {shelfSurahs.map((s) => (
          <button
            key={s.n}
            className={
              "drawer-cell" + (s.n === cur ? " on" : "") + (s.built ? " built" : "")
            }
            onClick={() => onPickSurah(s)}
            title={`${s.n} · ${s.name}`}
          >
            {s.n}
          </button>
        ))}
      </div>
    </div>
  );
}

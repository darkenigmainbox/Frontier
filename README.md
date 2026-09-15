# Frontier

**Frontier Icons** — a hand-drawn SVG icon set for the Frontier editor, plus an interactive
HTML review board for judging every glyph before it ships.

191 icons · 24×24 grid · 2px round strokes · cut-corner family language · optional multicolour accent layer.

---

## Look at the icons

```bash
# from the repo root
python3 -m http.server 8000        # or: npx serve .
# open http://localhost:8000
```

(or just open `index.html` directly — it needs no build step and no network)

`index.html` is the review board:

* **grid of all 191 icons**, grouped by category, with search (`/`), category + provenance filters
* **controls**: preview size 20–48, stroke width 1.5–2.25, **multi vs mono** colour mode,
  accent colour presets + custom picker, light/dark theme
* **click any icon** → detail drawer: 96px stage, 16/20/24/32/48px ramp, design note,
  copy **SVG / `<use>` snippet / React component**, download `.svg`
* **your verdicts**: 👍 like · ⧉ looks copied · ✕ not good · ✎ needs correction + free-text note.
  Stored in `localStorage`, exportable as **JSON or Markdown**, importable again
* **Editor mock**: the whole set rendered live at 13–17px inside a fake IDE chrome
  (activity bar, tabs, file tree, toolbar, gutter, status bar) — the real legibility test
* dashboard pills count each verdict and double as filters

## Provenance policy (is anything copied?)

Nothing is traced, imported or path-copied from Lucide or any other library. Every `d`
attribute was authored by hand on the 24×24 grid. Each icon carries an honest provenance badge:

| badge | meaning |
|---|---|
| `original` | geometry invented for this set (cut-corner family, accent layer, hex-nodes…) |
| `conventional` | the *concept* is common (magnifier, folder, pencil). Redrawn from scratch in the family language — familiar on purpose, not copied |
| `constrained` | near-universal glyph (scissors, padlock, play). Any honest redraw looks similar; the per-icon note states the differentiating detail |

The drawer shows the note per icon, so "which ones look copied" is a reviewable claim, not a vibe.

## Design language

* **Grid**: 24×24, live area 18×18 (3…21), stroke 2, round caps & joins.
* **Cut corners**: containers use 45° chamfers (2–4u) instead of rounded rects.
  Documents carry a big cut corner **top-left** with no fold line.
* **Accent layer**: sub-elements tagged `fx-a` (accent stroke), `fx-f` (accent fill),
  `fx-t` (accent tint, 20% opacity). In mono mode the accent collapses to `currentColor`,
  so every icon works one-colour; set `--fx-accent` for multicolour.
* **Family marks**: hex-nodes for git graphs, the four-ray spark for AI, square micro-bullets
  for lists/menus, octagon lenses/badges for search & diagnostics.

## Use the icons in code

```html
<!-- sprite -->
<svg class="fx-icon" width="24" height="24"><use href="icons/sprite.svg#fx-file-new"/></svg>

<!-- or standalone -->
<img src="icons/svg/file-new.svg" width="24" height="24">
```

```css
@import "icons/frontier-icons.css";
:root { --fx-accent: #e0533d; --fx-tint: .2; }   /* multicolour */
/* omit --fx-accent for pure mono */
```

Files:

| path | what |
|---|---|
| `index.html` | review board (no build needed) |
| `icons/*.js` | **source of truth** — icon data + path geometry, per category |
| `icons/svg/*.svg` | built standalone icons (accent → `var(--fx-accent, currentColor)`) |
| `icons/sprite.svg` | built `<symbol>` sprite |
| `icons/frontier-icons.css` | presentation classes |
| `icons/frontier-icons.json` | metadata index (names, tags, provenance, notes) |
| `tools/build.mjs` | regenerates the built files from the sources |
| `tools/qa.mjs` | renders labelled contact sheets (PNG) for visual QA; needs `@resvg/resvg-js` (`RESVG_PATH=… node tools/qa.mjs out/ [cols] [cell]`, `FX_MONO=1` for mono sheets) |

Rebuild after editing sources:

```bash
node tools/build.mjs
```

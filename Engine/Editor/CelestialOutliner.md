# Celestial Outliner — the development editor's world outline

A 1:1 port of the reference celestial panel's outliner
(`https://sultanaladin.github.io/Frontier-/celestial/`), spoke in ImGui over
Vulkan, as a docking window. Two docked panels: **Outliner** (this) and
**Viewport** (the live render target).

```
Engine/Editor/
├── WorldEntry.h / .cpp          the generic world-entry roster (engine-owned, project-fed)
├── CelestialIconIndex.h / .cpp  the SVG icon sheet (ThorVG raster, once at bring-up)
├── CelestialOutlinerPanel.h     the 1:1 outline (glass plate, tiles, pills, rows, footer)
├── CelestialEditorHost.h        the two-column dock host (outliner + viewport)
└── Icons/*.svg                  the reference's own icon documents, verbatim (84)
```

## Reference fidelity

- **Tokens**: the reference's `:root` palette as bytes (`--glass`, `--g2`,
  `--g3`, `--stroke`, `--stroke2`, `--text`, `--t2`, `--t3`, red/green/yellow).
- **Metrics**: every CSS figure as pixels — the 316px plate (236px compact),
  the 28px glass radius, the 22/22/12 header, the stat tiles, the 40px search
  pill, the 26px filter pills, the 36px rows (30px compact) with 16px indents,
  the five-figure footer on its 4-column grid (2 compact), Cam wrapping included.
- **Icons**: the reference's `I()` idiom (stroke-width 1.6) plus its ported-panel
  supplements (1.9), document for document. `currentColor` is rewritten to white
  on the way into ThorVG (which has no CSS cascade); the tint arrives at draw
  time, exactly like the reference's `color` property.
- **Type**: Outfit Light (the reference's 300-weight voice) for words,
  JetBrains Mono for the tabular numerals (clock, metas, stat and foot numerals),
  stable across ticks the way the reference's `tabular-nums` are.
- **Behaviour**: single pick with ancestor opening, eye flips, chevron folds,
  search narrowing, pill narrowing, and drag re-seating with into/before
  affordances and cycle refusal — the reference's `renderTree` contract.

## Development-only (`FRONTIER_DEVELOPMENT`)

The whole editor compiles behind `FRONTIER_DEVELOPMENT`:

- **Defined** (the default): the host records the fullscreen dockspace with the
  outliner + viewport over the live world; icons upload once; the viewport
  samples the render target every tick.
- **Undefined** (ship): every editor method is a mute husk — no dockspace, no
  panels, no icon upload, no viewport barrier — and the game renders fullscreen.

Windows: `ToolchainSequence.ps1 -Development:$false` for the ship build.
CMake: the define rides `target_compile_definitions` per target.

## Feed contract (Engine ⇄ Project seam)

The engine never learns game semantics. Every tick before `Present`, the project
registers **every world entry** — scene placements arrive through the adapted
`EditorInstance` roster (`scene#<ordinal>`), full-fidelity rows through
`RegisterWorldEntry` (`Projects/Project-Zero/Source/CelestialFeedSequence.cpp`
registers the celestial block: `celworld`, `cel#<entity>`, `celmoon#<slot>`).
The panel owns eyes, above-links, folds, picks, search and lit pills across
ticks; after `Present` the project reads the roster back (`ApplyOutlinerToWorld`)
so hiding a row hides the thing. Rows unfed for a whole tick are swept.

## Proof

```sh
bash Scratchpad/CheckCelestialOutlinerProof.sh
```

Compiles the patched vendor + celestial editor + ThorVG headless, drives the
reference tree through five phases, and gates twelve faces, 84 rasterised icons,
23 registered rows, the glass plate, the standing pips, and the sheets:

`Diagnostics/CelestialOutlinerProof_{Full,Search,Pills,Compact,Foot}.png`

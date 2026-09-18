# Frontier · SDF terrain generator

An erodible-terrain generator for a game engine. One **signed-distance volume** is
the source of truth; the height field, the mesh, the material splats, the
heightmap and the water are all derived from it. Nothing is "a heightmap with a
mesh on top": caves, overhangs, arches and brush-carved tunnels survive every
stage, because every stage writes the field, not a picture of the field.

```
base landform → SDF volume ─┬→ erosion (flow → fluvial → particles → detail)
                            ├→ eikonal re-solve (|∇d| = 1, banded)
                            ├→ sculpting (13 brushes, banded)
                            └→ materials → splats → textures → export
```

## Run it

```bash
npm install

npm run dev          # app on http://localhost:5173  (WebGL2 raymarcher + sculpting)
npm run build        # static build in dist/
npm test             # 22 unit tests: SDF, hydrology, erosion
npm run gen -- --help   # headless bake, see below
```

The app renders the volume by **raymarching the SDF** in a GLSL fragment
shader, so the sculpt preview is the same geometry the mesher will export.
Left-drag orbits, right-drag sculpts, `[` / `]` resize the brush, and every
edit is undoable.

## Bake terrain for the engine (no browser)

```bash
node tools/generate.mjs --res draft --seed 4821 --out terrain/volcano
node tools/generate.mjs --res high --material alpine --atlas 512
node tools/generate.mjs --shape plateau --fluvial 220 --particles 60000
```

One directory per bake:

| file | what it is |
| --- | --- |
| `terrain.frontier` | the SDF volume (`FSDF` container: JSON header + truncated float32 distances). Load it in the engine and raycast/march it directly. |
| `terrain.obj` / `.mtl` | mesh, split per material and per chunk group (`usemtl` per layer) |
| `terrain.stl` | interchange for DCC tools / printing |
| `heightmap16.png` | 16-bit height field, for engines that want a classic terrain |
| `splat0.png` / `splat1.png` | per-layer material weights (RGBA sheets) |
| `albedo.png`, `channels.png` | baked preview colour, and height/slope/curvature/flow |
| `texture-atlas*.png` | 5 material layers (albedo, normal, roughness) as stacked atlas rows |
| `recipe.json` | the exact parameters + stats — every bake is reproducible |
| `preview.png` | shaded-relief thumbnail |

`--res draft|standard|high|ultra` trades time for detail (80×48×80 … 224×136×224
voxels); a draft bake is ~3 s including textures.

## What's in the box

- **`src/core/sdf-volume.js`** — a *truncated* SDF: 8-voxel band, chunked,
  with a band-aware raycast, boxed writes and band clamps on every writer.
- **`src/core/eikonal.js`** — banded fast-sweeping re-solve (`redistance`) used
  after rasterisation, CSG and strokes, so `|∇d| ≈ 1` holds everywhere the
  raycaster and the mesher look.
- **`src/gen/erosion-fluvial.js`** — priority-flood depression filling + MFD
  routing + stream-power incision with **incision guards** (see below).
- **`src/gen/erosion-particles.js`** — guarded droplet transport: channels,
  fans and deltas, with a per-column incision budget so a droplet can never
  cut a runaway hole.
- **`src/sculpt/brushes.js`** — raise, carve, smooth, flatten, pinch, inflate,
  erode, deposit, stamp (rock/boulder/crater/dune/mesa/arch), path, wind,
  noise, terrace. Strokes are undoable voxel snapshots.

### Erosion guards (the "no runaway holes" rules)

| guard | rule |
| --- | --- |
| `maxIncision` | hard cap on how far one column may be cut below its base height |
| capacity transport | material moves only when the flow can carry it; excess is deposited |
| `maxAggradation` | per-column cap on deposit per pass — no growing mounds |
| rock floor | incision never cuts below the volume floor |
| `stopSlope` | droplets die on flat ground instead of tunnelling |
| armouring / hardness | hard strata resist cutting, so cliffs become banded, not uniform |

Tuning lives in `src/gen/params.js`.

## Tests and QA tools

```bash
node --test "tests/**/*.test.js"      # SDF container, hydrology, erosion budgets
node tools/dev/sculpt-test.mjs        # every brush + stamp, |∇d| after strokes
node tools/dev/asset-test.mjs         # mesh assemble + exporters + texture bake
node tools/dev/app-smoke.mjs          # boots the real app against a stub DOM/WebGL2
node tools/dev/render-cpu.mjs --ss 2 --clay --out shots/a.png   # CPU raymarch QA
```

`app-smoke.mjs` is the browser-less integration test: it loads `src/app/main.js`
(the real module), drives generate → sculpt → undo/redo → mesh → export, and
fails on any exception.

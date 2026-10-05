# Stage-1 solid rock formations

## Why this replaces the previous attempt

The previous seeded generator still joined a front and back profile into a folded wall. Changing peaks did not give the formations sufficiently different three-dimensional structures. Old recipe loading retains compatibility internally, but the legacy generator picker has been removed. New designs use solid formations.

The new **3D masses — distinct structures** mode builds closed polygon rock volumes positioned in all three dimensions. Overlapping portions are removed using polygon clipping, and shared internal faces are cancelled before triangulation. No SDF or analytic rendering is used.

| Preset | Construction |
| --- | --- |
| Compact outcrop | Central bulky rock with surrounding, unequal buttresses |
| Terraced mesa | Broad platforms that step inward with height |
| Thick monolith | Tall substantial shaft, shoulder and broad crown—not a blade |
| Tower cluster | Towers distributed across the ground plane on a shared foundation |
| Curved ridge | Rock masses along a bent footprint |
| Horseshoe cliff | Curved masses surrounding a genuinely empty, open courtyard |
| Route-following cliff | Connected cliff masses along an editable ground-plane curve |
| Winding canyon | Two walls offset from the route, leaving a corridor between them |
| Rock arch | Tilted solid rock segments rise over the route, forming a real opening underneath |

These are coarse structural bases, not a geological simulation or finished realistic rock. Some shapes remain deliberately blocky; the existing fracture stages supply subsequent cuts. Arches are supported, but this is not a general cave generator.

## Controls and inspection

- Presets apply their own width, height, depth and structural settings.
- Seed changes asymmetry, arrangement, height and facet orientation.
- Only controls used by the selected family are shown. Count dropdowns expose supported counts; the single monolith has no count control.
- Crown bevel, lean, shelves, mass height variation, spread, narrowing and cove opening affect the appropriate families. Legacy surface-noise controls are hidden in solid mode rather than offered as ineffective controls.
- Stage 1 rebuilds after a 350 ms editing pause; later stages still require explicit rebuilding. Upstream changes invalidate stale exports.
- **Top**, **Side**, **Front** and orbit/frame views expose depth and footprint, not merely the front silhouette.

## Curve design

Choose **Route-following cliff**, **Winding canyon** or **Rock arch**. The top-view route designer appears directly below the preset:

- Drag numbered dots, or select one and use arrow keys / X and Z percentage inputs.
- Click empty space to insert a point near the closest guide segment; Add point inserts a midpoint. Remove point or Delete removes the selected point. Routes contain 2–8 points.
- Sweep, Bend and Straight provide starting curves. Curve smoothing blends straight spans with a cubic spline. A two-point straight route remains straight.
- Route segments (4–12) control the number of rock sections along the path. Increase this for tighter bends.
- Width/depth scale the **route envelope**, while rock thickness is independent; total geometry can extend outside that envelope. Height controls the formation's vertical extent.
- Canyon corridor width controls wall offset; tight turns or self-crossing routes can merge walls. It is not a guaranteed minimum navigable clearance.
- Arch band thickness controls the supporting rock around the opening. The arch rises automatically above the planar guide; this is not an arbitrary 3D/elevation curve editor.

Edits auto-preview at stage 1 and are saved in the recipe. Later stages require manual rebuilding. Invalid point layouts are not applied; the editor shows an error and keeps the last valid generated result. Especially tight/self-crossing routes may need additional segments or moved control points. No arbitrary-curve topology guarantee is claimed.

## Compatibility and scope

New cliff recipes use version **6**. Versions 1–3 default to Authored mode; version 4 without a mode defaults to the earlier Procedural generator. Earlier generators are not selectable in the main UI; old recipes still load through their compatibility path. Selecting a preset returns to solid mode. Historical Authored five-stage hashes still pass.

The workflow still has five polygon stages. Particle simulation, worker, panel and styling files were not changed. Floating/stacking grains remain deferred. RC/atrium source and its built JavaScript bundle are unchanged. No stage 6 was reintroduced.

## Verification

`npm run test:solid-formations` records results in `solid-formation-checks.json`:

- Six families × five seeds: 30 stage-1 shapes, each with exactly one connected triangle component.
- Both endpoints of every displayed family-specific structural control change construction and retain connected, valid stage-1 output.
- An empty horseshoe courtyard versus occupied mesa interior; monolith crown with substantial width **and** depth.
- Full five-stage pipelines for all six families.
- Deterministic seeds, cache invalidation and recipe migration.

All tested stages pass open-edge, nonmanifold-edge/vertex, winding, duplicate-triangle and zero-area checks, with finite vertices and positive per-body volumes. The additional component check caught internal cap fragments that edge metrics alone missed; coplanar overlap cancellation now removes those interfaces in solid-mode joins. Legacy joins retain their original path.

`npm run test:solid-formations:browser` checks the built page: six families, family-specific controls, Top/Side views, seed auto-preview, recipe v6 and downstream stage 2. No page errors or failed asset requests were observed. Frame/front/top/side screenshots were also captured for visual inspection.

Legacy `test:formations`, `test:formations:browser`, `test:particles` and `test:particles:browser` pass, including exact particle replay. Browser verification used local software-rendered Chromium, not a hardware performance measurement.

Narrow-triangle warnings remain and are recorded rather than hidden. These finite fixtures do not certify every possible combination or prove absence of all geometric self-intersections. Clean topology is also not proof of attractive appearance; the visual distinction comes from the different spatial constructions above. No FPS claim is made.

### Route/arch verification

`npm run test:routes` records `route-checks.json`: 27 fixtures (three new families × three routes × three seeds), 22 route-control endpoint fixtures, all five stages for each new family, actual empty arch interior and occupied overhead span, route validation, deep-value cache reuse and recipe-v6 roundtrip. All tested stages pass the principal topology checks. Arches and single-route cliffs are connected; a straight canyon intentionally contains two separate walls.

`npm run test:routes:browser` checks all three new presets and four camera views, keyboard and pointer curve edits, repeated editing after regeneration, point insertion/deletion and downloaded recipe reload. Canvas views were captured and inspected; full-page Playwright screenshots timed out in this sandbox, so the test captures the WebGL canvas directly instead. Solid and particle browser regressions also passed. This does not measure hardware FPS.

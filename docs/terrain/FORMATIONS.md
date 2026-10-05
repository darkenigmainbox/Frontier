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

Choose **Route-following cliff**, **Winding canyon** or **Rock arch**, then click **Spline** in the viewport toolbar. The inspector's spline editor has been removed.

- The green route and control dots are drawn in the actual 3D viewport, visible through the rock. **Top** is useful for a clear plan view; editing also works from an orbit view.
- Drag a dot directly, or use the selected point's X/Z move gizmo. Editing stays on the formation's local ground plane, including after rotation and scaling.
- Shift-click the ground plane to insert a point near the closest guide span. The floating viewport strip also has Add point, Delete point and starting-curve presets. Routes contain 2–8 points.
- Arrow keys nudge the selected point; Delete removes it. Geometry rebuilds after release at stage 1. Later stages still need an explicit rebuild.
- Smoothing, segment count, dimensions and thickness remain ordinary inspector parameters—not a separate spline editing canvas.
- Width/depth scale the route envelope; rock thickness remains independent. Total geometry can extend outside the envelope.
- Tight turns or self-crossing canyon routes can merge walls. Corridor width is not a guaranteed minimum navigable clearance.
- An arch rises automatically over the planar guide. This is not an arbitrary elevation-curve editor.

Invalid point layouts are not applied, and an error is shown. Especially tight/self-crossing routes may need more segments or moved points. No arbitrary-curve topology guarantee is claimed.

## Viewport transform gizmos

**Move (W)**, **Rotate (E)** and **Scale (R)** act on the whole formation, not individual fractured pieces. Axes are local to the formation; the pivot is at the centre of its ground-plane envelope. **View (Q)** returns to inspection, and **Reset pose** restores identity placement without changing the spline or geological parameters. Orbiting is disabled during handle drags, then restored. Frame/F fits the transformed object, including enlarged formations.

Placement is a separate scene transform, shared by all five stages and the spline overlay. It does not force geological mesh regeneration. Recipes store position, Euler rotation and positive per-axis scale. OBJ exports apply placement but exclude the exploded inspection view. Geometry diagnostics and particle sampling retain their original generation-space interpretation. Scale is bounded to 0.05–10 per axis and translation to ±500 metres; mirrored/zero scales are not supported.

## Compatibility and scope

New cliff recipes use version **7**. Versions 1–3 default to Authored mode; version 4 without a mode defaults to the earlier Procedural generator. Earlier generators are not selectable in the main UI; old recipes still load through their compatibility path. Selecting a preset returns to solid mode. Historical Authored five-stage hashes still pass.

The workflow still has five polygon stages. Particle simulation, worker, panel and styling files were not changed. Floating/stacking grains remain deferred. RC/atrium source is unchanged. The shared Three.js bundle now includes the transform-control helpers, so generated bundle names changed. No stage 6 was reintroduced.

## Verification

`npm run test:solid-formations` records results in `solid-formation-checks.json`:

- Six families × five seeds: 30 stage-1 shapes, each with exactly one connected triangle component.
- Both endpoints of every displayed family-specific structural control change construction and retain connected, valid stage-1 output.
- An empty horseshoe courtyard versus occupied mesa interior; monolith crown with substantial width **and** depth.
- Full five-stage pipelines for all six families.
- Deterministic seeds, cache invalidation and recipe migration.

All tested stages pass open-edge, nonmanifold-edge/vertex, winding, duplicate-triangle and zero-area checks, with finite vertices and positive per-body volumes. The additional component check caught internal cap fragments that edge metrics alone missed; coplanar overlap cancellation now removes those interfaces in solid-mode joins. Legacy joins retain their original path.

`npm run test:solid-formations:browser` checks the built page: six families, family-specific controls, Top/Side views, seed auto-preview, recipe v7 and downstream stage 2. No page errors or failed asset requests were observed. Frame/front/top/side screenshots were also captured for visual inspection.

Legacy `test:formations`, `test:formations:browser`, `test:particles` and `test:particles:browser` pass, including exact particle replay. Browser verification used local software-rendered Chromium, not a hardware performance measurement.

Narrow-triangle warnings remain and are recorded rather than hidden. These finite fixtures do not certify every possible combination or prove absence of all geometric self-intersections. Clean topology is also not proof of attractive appearance; the visual distinction comes from the different spatial constructions above. No FPS claim is made.

### Route/arch verification

`npm run test:routes` records `route-checks.json`: 27 fixtures (three new families × three routes × three seeds), 22 route-control endpoint fixtures, all five stages for each new family, actual empty arch interior and occupied overhead span, route validation, deep-value cache reuse and recipe-v6 roundtrip. All tested stages pass the principal topology checks. Arches and single-route cliffs are connected; a straight canyon intentionally contains two separate walls.

`npm run test:routes:browser` checks all three new presets and four camera views, keyboard and pointer curve edits, repeated editing after regeneration, point insertion/deletion and downloaded recipe reload. Canvas views were captured and inspected; full-page Playwright screenshots timed out in this sandbox, so the test captures the WebGL canvas directly instead. Solid and particle browser regressions also passed. This does not measure hardware FPS.

### Viewport editing verification

`npm run test:placement` checks transform validation, identity defaults for recipe versions 1–6, recipe-v7 roundtrip and geometry-cache preservation. `npm run test:viewport:browser` exercises real mouse drags on move/rotate/scale handles, orbit suppression/restoration, viewport spline dragging before and after placement, point insertion/deletion, keyboard edits, transformed OBJ output, Reset pose and recipe reload. The inspector canvas is asserted absent. The route and solid browser suites use the new viewport UI and recipe version. Particle CPU/hash and built-site browser replay regressions also pass.

The broader RC smoke run passed its fallback UI and reference-GPU geometry/shader checks, but its final UI benchmark hit the software renderer's existing slow-frame safety limit rather than completing all four blocks. That run is not reported as a full pass; no benchmark limits or RC implementation were changed for this viewport work.

# Stage 6: geometric rock relief

## Scope and rollback

The independent terrain demo lives at `terrain/index.html`, deployed at `site/terrain/index.html`. The RC/atrium renderer is unchanged.

The parent checkpoint is **`d93aa16` — Import Slate cliff baseline as separate terrain demo**. The stage-6 implementation, tests and deployment are kept together in the next commit. Reverting that implementation commit restores the imported five-stage demo without rewriting branch history.

**User clarification:** grain texture must eventually be simulated with actual particles. The inherited polygon/column grain study was not the intended implementation. It remains a labelled legacy study; correcting it is deferred until after this stage-6 review. Stage 6 is mesh relief, not a substitute particle simulation.

Stage 1's generation algorithm is untouched. No SDF construction, conversion, sampling or rendering is included.

## Try it

1. Open the terrain page. It initially generates through **06 — Rock surface detail** in a worker.
2. Press **Detail close-up** to inspect a visible detailed region.
3. Press **5 ↔ 6** to compare the original and detailed meshes without reframing the camera. Press **Frame** to return to the whole formation.
4. Use **Wireframe** to see the actual added triangles, and rotate the light using the Display controls.
5. In **Rock surface detail**, change sandstone/granite/slate structure, detail seed, maximum relief, feature wavelength, target triangle spacing or triangle ceiling; press **Rebuild through 06**.
6. **Export OBJ** exports the displaced positions and triangle indices. **Save recipe** writes version 3; versions 1 and 2 remain readable.

The initial build runs all stages and can take several seconds. Subsequent detail-only rebuilds reuse stages 1–5. This is an authoring prototype, not a measured realtime terrain system.

## Implementation

`SurfaceDetail.js` refines each indexed stage-5 body independently. Shared edges receive a single midpoint on both incident faces, including one-, two- and three-edge split cases. A global triangle allowance is distributed by surface area; the source triangles are always retained. Refinement stops at the spacing target, budget or pass limit.

Object-space, seeded rock patterns create shallow inward relief: warped bedding for sandstone, ridged/pitted variation for granite and sharper directional bands for slate. Fine frequencies are attenuated where the mesh cannot resolve them. These patterns are an artistic approximation, not a geological or particle simulation.

Crease boundaries, material-tag boundaries, crack surfaces, bases and termination surfaces are pinned. Displacement is bounded using triangle-BVH inward thickness queries and relaxed near pinned/thin regions. Local orientation checks reduce risky displacement; structural topology and volume are validated before accepting a body. Rendering uses interpolated normals inside detail patches and face normals at protected features. Smoothing changes appearance only; the relief itself is in the exported mesh.

Stage 6 has an independent seed and invalidation group. Stage-5 meshes are not mutated. Specification invalidation now uses 7 as the "no stage changed" sentinel, and the UI/worker support six stages.

## Checks performed

- `npm run test:terrain`: original five-stage mesh hashes match the imported baseline; all three rock structures; separate detail-seed changes; same-runtime deterministic replay; upstream reuse; zero-depth volume preservation; shared-edge cube fixtures at different budgets; pinned corners and protected surfaces; thin-slab thickness guards; invalid inputs; recipe compatibility.
- `npm run test:terrain:browser`: tests the **built site**, worker startup, six-stage UI, camera-preserving comparison, canvas differences, OBJ vertex/face counts, dirty-export protection, detail-only rebuild/reuse, wireframe and recipe download. No page errors or failed asset requests in the tested Chromium run.
- Existing `npm test`: RC/atrium smoke and modern GPU regressions pass.
- Actual default full-view and close-up screenshots were inspected. No hardware FPS claim is made.

### Default result

| Measurement | Chromium built-site check |
| --- | ---: |
| Stage-5 triangles | 36,710 |
| Stage-6 triangles | 205,068 |
| Closed bodies | 54 |
| Displaced vertices | 61,007 |
| Maximum actual displacement | 13.36 cm |
| Open/nonmanifold edges | 0 / 0 |
| Nonmanifold vertices / duplicate triangles | 0 / 0 |
| Zero-area / winding defects | 0 / 0 |
| Triangles below 5 degrees | **16** |
| Minimum triangle angle | **2.54 degrees** |

The Node run produced 205,064 triangles and 61,005 displaced vertices. Small cross-runtime differences occur in the inherited floating-point polygon pipeline; reproducibility is checked within a runtime, not promised bit-for-bit between JS engines. Full recorded results are in `stage6-checks.json`.

## Known limitations

- This is broader rock relief, **not fine particle grain texture**, colour texturing, arbitrary undercuts or whole-cliff erosion. Material distinctions and visual quality are intended for review.
- Narrow-triangle warnings remain visible. Structural validity plus local thickness/orientation guards are **not a complete proof of no self-intersections**.
- Pinned feature boundaries can remain visibly faceted. OBJ currently retains the upstream flat-shading export convention; the positions/relief are exported, but the preview's custom smooth normals are not.
- A triangle ceiling cannot reduce an already larger stage-5 input. That condition is explicitly reported. Per-body budget allocation and the refinement pass limit can leave some requested spacing unresolved; this is not an exact uniform remesher.
- No LOD system, target-hardware performance qualification or production-game asset budget is supplied by this stage.

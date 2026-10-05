# Slate terrain generator: baseline audit (historical)

**Update:** Stage 6 is now implemented in `terrain/SurfaceDetail.js`. See [the implementation notes](STAGE6.md). This file preserves the earlier audit and proposal, not the current implementation status. The user clarified that the grain work must eventually simulate actual particles; the legacy polygon-grain study is not the intended solution and its correction remains deferred.

## Source inspected

- Repository: `unassignedinbox/Slate`
- Requested branch: `arena/01a0fd48-slate`
- Inspected commit: `8d635268610bdafeb5f4b11bbf3966700712004a`
- Local reference clone: `/home/user/Slate-reference`
- Generator: `Frontier/Experimental/CliffSequence/`
- Focused sparse checkout includes the generator, Ocean browser libraries, Fluid theme source and referenced font directory. The complete large Slate asset tree was not checked out.
- No upstream source was modified. Frontier's existing RC/atrium demo is unchanged.

Existing hosted source entry (not independently browser-verified in this audit):
https://raw.githack.com/unassignedinbox/Slate/8d635268610bdafeb5f4b11bbf3966700712004a/Frontier/Experimental/CliffSequence/index.html

## What is actually implemented

1. Cliff mass — `ReliefProjection.js`, `ConstructMass` in `FractureSequence.js`.
2. Primary fractures.
3. Bounded joints.
4. Edge spalls.
5. Surface fissures.

`CliffSequence.Generate` clamps the requested stage to 1–5. The value 6 returned by the specification's invalidation logic is not an implemented geometry stage.

`GrainSequence.js` and `GrainPanel.js` implement a separate material study. A selected source triangle supplies an attachment frame and patch-size limit. The study models polygonal, columnar mineral grains and top-down weathering; it does not modify the full cliff or support general 3D grain cleavage/undercutting. The UI explicitly says no displacement or baking. It is useful research, not an integrated sixth stage.

## Baseline CPU checks

See `slate-baseline.json`. These are generation/topology checks, not rendering benchmarks or a full upstream test-suite run.

Stage 1, using each profile's formation preset:

| Profile | Triangles |
| --- | ---: |
| Headland | 716 |
| Escarpment | 736 |
| Amphitheatre | 842 |
| Spire | 2,918 |
| Needles | 6,764 |
| WideWall | 1,114 |

All six reported zero open edges, nonmanifold edges/vertices, winding errors, zero-area triangles and duplicate triangles, with positive volumes.

The default five-stage generation produced 716 / 9,544 / 20,472 / 32,414 / 36,710 triangles. Every stage reported zero in the same defect categories and positive volume. This does not establish freedom from geometric self-intersections: the existing topology metrics are not a complete intersection test.

A reduced-resolution grain study (`Resolution:12`, other defaults, 10 weathering steps) produced 17,498 boundary triangles. This is a small material patch, not a detailed cliff. It illustrates why replicating individual grain geometry over the entire cliff should not be the default.

## Stage 1 recommendation: improve structure before noise

The current mass is a closed front/back loft built from authored width/crown/projection stations and five elevation sections. Both sides share the projected station/crown layout; thickness is constrained. Six profiles and gradient/ridged/cellular noise already provide variation, but the mass remains tied to that loft structure.

### First implementation: preserve the current downstream contract

- Separate low-frequency silhouette generation from surface relief. Generate seeded, unequal crown peaks, saddles, buttresses and recesses with minimum spacing, rather than merely increasing existing noise amplitude.
- Add controlled lean and lateral movement across height. Vary broad shelf elevations and retreat to create shoulders/terraces, while retaining orientation and thickness guards.
- Give front and rear depth profiles more independent character, still sharing compatible closed boundaries. Validate loft cells before passing them to the existing fracture pipeline.
- Offer legible geological controls: peak count, peak-height spread, peak spacing, lean, buttress depth, terrace amount and concavity. Keep detail roughness separate.
- Use an isolated shape seed so surface-detail changes do not regenerate the silhouette.
- Keep the existing profiles as reproducible presets and preserve old recipe behavior via a versioned shape mode.

First visual targets: an asymmetric buttressed cliff, a terraced sandstone escarpment and a leaning narrow spire. Compare these in plain clay and silhouette view, without surface detail hiding weaknesses.

True arches, caves, disconnected stacks and branching masses require a more general topology model than this paired loft. Do not promise those as a few extra noise sliders. A later polygon/cell-based structural generator could support them, but requires downstream fracture compatibility work; it need not use SDFs.

## Proposed stage 6: material-driven mesh relief

**Recommended starting point:** conforming adaptive subdivision plus geological procedural displacement, with optional localized cuts. The resulting vertices/triangles—not just a shader—must carry the relief and be exported.

1. Accept the immutable stage-5 meshes and their face tags. Maintain a separate detail checkpoint and seed; changing material parameters should reuse stages 1–5.
2. Refine triangles according to requested feature size, detail importance and a hard triangle budget. Propagate edge splits to neighbours to avoid T-junctions. Do not subdivide every triangle to microscopic spacing.
3. Evaluate continuous, object-space 3D detail fields: layered erosion for sandstone, irregular faceted pits/chips for granite, elongated cleavage for slate. Combine a few meaningful feature scales rather than uniform high-frequency noise.
4. Use lithology, bedding orientation and fracture/spall tags to control where detail appears. Fresh fracture faces and weathered exterior faces should differ.
5. Start with fixed feature boundaries and a narrow displacement fade near them. Keep shared geometric vertices coherent across neighbouring faces; preserve hard shading normals separately. Never weld separate fractured bodies together just to hide a seam.
6. Limit displacement against local thickness and nearby opposing faces. Reject or reduce changes that invert triangles or create collisions. Existing manifold metrics alone will not detect every self-intersection.
7. Recompute normals, retain protected fracture rims and crack mouths, and validate finite coordinates, closedness, positive volume, winding, degeneracy and self-intersections. Export the actual detailed mesh.

Displacement is suitable for shallow relief, not arbitrary undercuts or holes. Where a rock style needs deeper chips, extend the existing local polygon-cut approach instead of pretending a height field can represent everything.

### Other detail sources

| Approach | Useful for | Important trade-off |
| --- | --- | --- |
| Procedural geological relief | Seeded variation, adjustable rock styles, UV-free evaluation | Requires careful directional features and masks; noise alone looks lumpy |
| Scanned height/displacement maps | Capturing convincing real-rock surface structure | Requires appropriately licensed scans, scale calibration and seam-safe projection; height alone cannot reproduce undercuts |
| Existing discrete grains | Inspectable local weathering, close-up patches, reference material patterns | High polygon count even for small patches; currently columnar/top-down, not a whole-cliff erosion system |
| Normal/bump maps only | Optional sub-pixel appearance on a game asset | Do not change mesh silhouette, collision or exported geometric relief; cannot satisfy stage 6 by themselves |

The grain study could later supply sampled relief patterns for local mesh patches, but that transfer is new work—not functionality already present. Keep explicit grains for selected close-up regions rather than instancing them across every square metre.

### Detail budget and acceptance criteria

Halving surface triangle spacing costs roughly four times as many triangles on the same area. Dense authoring detail is not automatically suitable as a realtime game mesh. Provide draft/final triangle budgets and local high-detail regions; assess LODs separately if game delivery is required. No hardware FPS prediction is justified by the current CPU audit.

A successful stage 6 must show relief in wireframe, grazing-angle silhouette/shadows and exported geometry, not only in colour. It must preserve existing fissures, support deterministic regeneration and leave stages 1–5 unchanged when only detail parameters change.

## Scope boundary

This is a source audit and implementation proposal. Base-shape improvements and integrated stage 6 have **not** been implemented. No SDF construction, sampling, conversion or rendering has been added. The recommended first rock style is layered sandstone, followed by a distinctly different granite preset to test that the detail system is material-driven rather than one noise pattern with different colours.

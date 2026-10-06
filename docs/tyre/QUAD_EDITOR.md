# Quad tyre editor — first working replacement

## Source and scope
Imported the exact restored Slate generator at `73f4bf791ffcafe48a1370a2c371bb28e49848a4` into `tyre/upstream/`, without changing it or the terrain tool. The new standalone editor is `tyre/index.html`; the production build is `site/tyre/index.html`.

This is a focused replacement of tread authoring, **not full feature parity with Slate's material, decal, cord, groove-layer and GLTF tooling**. Old recipes are not silently converted. The original `buildPolyTread()` used `THREE.ShapeUtils.triangulateShape`, refined triangle caps and raster depth samples. That path does not execute in the new editor.

## Method
1. Draw a convex four-corner starting patch (either orientation), or add a rectangular block.
2. Bilinear interpolation initially fills it with a 4×4 quad grid. Every grid point is editable. Mild concavity is supported; doubling rows/columns preserves the existing shape and shared vertices.
3. Make a slightly inset quad cap, a close top support loop, a chamfer loop and matched wall loops. Close the underside with a second quad grid. No triangle fans or triangle-to-quad conversion.
4. Wrap coordinates analytically onto the crowned tyre surface. This is a coordinate transformation of actual polygon vertices, **not a heightmap**. Repeat the tile around the circumference.
5. Revolve a closed cross-section into an indexed quad casing, welding angular seams by shared indices.
6. Keep `vertices` and four-index `quads` as the authoritative mesh. Export OBJ with `f a b c d`. WebGL receives temporary diagonal splits for display only. The wireframe shows the source quad edges.

## Controls
- Select or drag blocks in the 2D pattern tile; drag any circle to edit a vertex.
- Draw four starting corners in perimeter order; Escape cancels.
- Duplicate, mirror across tyre centreline, rotate ±5°, scale ±10%, add rows/columns.
- Snap to 1 mm; arrows nudge 1 mm, Shift arrows 5 mm.
- Wheel zoom; middle/right-drag pan; Fit restores the tile view.
- Undo/redo, JSON recipe save/load, OBJ download.
- Quad-edge toggle and **Isolate block** for inspecting actual cap/bevel/wall edge flow.
- Width, aspect, rim, repeat count, block height, crown and inset parameters. Pitch updates preserve the normalized pattern placement.

## Validation and boundaries
- Reject collapsed, inverted and non-convex individual grid cells, and crossing patch boundaries.
- Reject proportional chamfers if the patch centroid is outside an edge's interior half-plane: deep non-star-shaped concavities need a different multi-patch layout, not a hidden triangle fill.
- Chamfer width is proportional to the patch dimensions, **not a constant-distance offset**.
- Audit face arity, repeated indices, near-zero triangle halves, open/non-manifold edges, edge winding, finite positive signed volume and maximum face valence. Failed audits disable export. 150,000-quad generation budget.
- Reject edits beyond the supported crown and patches spanning a full repeat; reject folded chamfers during editing. Report periodic bounding-box overlap warnings. These warnings are conservative, **not an exact intersection certificate**. Overlapping copies are not automatically fused or rejected; move them apart before using the geometry.
- Casing and blocks are **separate closed solids**. Tread bases sit 0.6 mm inside the casing; the casing under them is not removed. This is not one welded subdivision surface. A common deformation must be applied to both for them to move together.
- No arbitrary polygon-with-holes mesher, welded branching patch system, connected sipes, groove booleans, or automated retopology is claimed. Such shapes need explicitly connected patch layouts in a later extension.

## Measured topology
All three initial presets: zero non-quad faces, open edges, non-manifold edges, winding conflicts and degenerate faces; positive signed volume for every solid; maximum vertex face-valence 4.

| Preset | Closed solids | Quad faces |
|---|---:|---:|
| Trail | 129 | 21,760 |
| Chevron | 65 | 15,616 |
| Touring | 201 | 31,040 |

## Tests / actual renders
- `npm run test:tyre`: all presets, custom and mildly concave patches, mirror/rotation/refinement, invalid grid rejection, simple smooth deformation with unchanged topology, OBJ four-index faces, recipe round trip and size budget.
- `npm run test:tyre:browser`: production browser, draw/drag, mirror, refinement, undo/redo, parameters, recipe import, actual OBJ download and all three presets.
- `editor.png`, `tyre-solid.png`, `tyre-quads.png`, `block-quads.png`: real production-browser captures, not generated artwork. Tests regenerate these files.

For a local preview: `npm run dev`, then `/tyre/index.html`.

# Frontier — Tread Lab

**Black-theme polygon tread designer** with an editable SVG workspace and a live 3D tyre mesh. Eight editable starting presets: four from the supplied photographs and four revised off-road drafts. This repo started empty; it now contains a local 3D viewer, a reusable mesh generator, and browser/command-line mesh export.

**The tread is geometry, not a texture or height map.** Blocks have extruded walls and beveled edges. Grooves are open spaces between blocks. Sipes are polygon cuts through the upper portion of a lug, with recessed mesh floors and walls.

## Revision 7 — editable 2D → 3D designer

**Designer** is the default workspace. It shows a polygon editor beside the actual extruded 3D tyre; **Viewer** switches to a larger mesh view. Both use the same live design and OBJ/STL export.

### Design a tread

1. Choose **Highway**, **All-terrain**, **Rugged terrain**, **Mud terrain**, or one of the four revised drafts, then click **Load**. Or choose **Blank**.
2. Select a shape in the list or on the canvas. Drag the solid source polygon to move it; drag circular handles to edit outline or sipe vertices. A selected vertex also has precise **X / mm** and **Y / local pitch** fields.
3. **Add** rectangles, triangles, chevrons or low ejectors, or use **Polygon** to click your own outline. Finish with **Finish / Enter**, cancel with **Escape**. There is no fixed shape-type count. Use **Duplicate**, **Delete shape**, or the visibility checkbox as needed.
4. Choose a mirror per shape:
   - **Across tyre width (X)**: reflect across an adjustable X axis.
   - **Along tread / travel (Y)**: reflect across an adjustable local Y axis.
   - **Point mirror (X + Y)**: reverse both coordinates.
   - **Four-way**: source, X, Y and XY copies.
   - Set **X axis / mm**, **Y axis / pitch**, and **Copy stagger / pitch** independently for each type. Sipes follow the same transformation. Symmetric duplicates are removed within a type.
   - **Make mirror copies independent** converts linked copies to separately editable shapes.
5. Assign the type to **every pitch**, **A only**, or **B only**. The two-pitch cell is arrayed around the tyre. Circumference repeats remain even so the A/B seam closes.
6. Select a block and use **Cut line** to draw a recessed polyline cut. Sipes are clipped to the block in the mesh. Ctrl/Cmd-click (or double-click) near a source outline or cut-line segment to insert a point; Alt-click a handle to remove one. The **+ Point / − Point** buttons remain available too. Rotate a shape and all its sipes with **Rotate °**.
7. Tune width, radius, depth, groove spacing and repeat count. The 2D view shows source outlines; spacing and bevels are applied by the 3D mesh engine. **Flat tread** shows the six-repeat mesh sample. A shape’s height percentage applies relative to overall tread depth.

**Navigation:** wheel to zoom the SVG, middle/right drag to pan (Alt is reserved for point removal), **Fit 2D** to reset. Optional snap uses 0.025 normalized width/pitch increments. Solid outlines are editable sources; dashed outlines are linked or repeated instances; faint shapes show surrounding repeats.

**History & saving:** Undo/redo retains up to 80 shape-edit operations, including preset/project replacement and associated dimension restoration. Use buttons or Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z when not typing in a field. Drafts and dimensions autosave locally. **Save JSON / Open JSON** round-trip vertices, sipe paths, mirror axes, phases, visibility, heights and mesh settings. Project imports are validated and limited to 5 MB. Save JSON as your durable backup; browser storage can be cleared or unavailable. **SVG ↓** exports the two-pitch construction outlines (not a restorable mirror project); arbitrary external SVG import is not implemented. Use JSON to reopen editable projects.

**Validation:** self-crossing/degenerate outlines pause 3D rebuilding and disable mesh export; the last valid mesh remains visible with an error. The editable draft is retained so you can repair it or undo. Overlap and out-of-width warnings help diagnose mirror/stagger issues; they are not manufacturing validation. Large numbers of shapes increase build time. Exports remain assemblies of separate solids, not boolean unions.

### Point and cut-line editing (1.6.1)

| Gesture | Action |
|---|---|
| **Ctrl/Cmd + click** near an edge | Insert a point exactly on the nearest source polygon edge or cut-line segment |
| **Alt + click** a circular handle | Remove that outline or cut point |
| **Drag** orange / blue handles | Reshape the block outline / sipe polyline |
| **Drag a cut line** | Move just that cut, without moving its block |
| **Shift + drag** a handle, shape or cut line | Constrain movement horizontally or vertically in physical 2D space |
| **Ctrl/Cmd + Shift + click** | Extend the selected cut; select its first endpoint to prepend, otherwise extend its end |
| **Double-click** near an edge | Also insert a point (outline or cut line) |

In drawing mode, Shift-click constrains the next segment to horizontal/vertical. Use **Cut line** to add another sipe; each appears in the **Cut lines / sipes** list with its own selection and delete button. Selected cuts are highlighted. Changes propagate through their linked mirrors into the actual 3D mesh, local autosave and JSON projects.

Polygons retain at least three points. Removing a point from a two-point cut removes that cut; undo restores it. Insertion never invents a closing edge for an open cut line or duplicates an endpoint. The toolbar's **+ Point** splits the final real segment when its last endpoint is selected. Linked mirror copies remain read-only: edit their solid source or make them independent first. A plain selection click no longer creates an empty undo operation.

### Revisited off-road drafts

The revision-6 additions were rejected visually. Revision 7 changes their actual polygons rather than just their labels:
- **Trail hybrid:** broader offset Z/notched centers and narrower shoulders, replacing the detached diamond/arrow appearance.
- **Canyon R/T:** broader clipped center blocks and winding channel boundaries rather than a regular grid of diamonds.
- **Baja interlock:** angled, less rectangular interlocking blocks and winding channels; default repeat count is now **44**, not 48.
- **Rock cleat M/T:** sloping shoulder bars, wider center cleats, elbow sipes and reduced pair stagger, replacing the small shield-like cleats and hexagonal paddles.

These are still **unverified visual approximations**, not exact replicas or confirmed reference matches. The source photographs/links remain available via **Preset blueprint & reference**. All original four source presets are preserved, including the mirrored rugged and revision-5 mud definitions. Presets are converted to editable types with exact detected mirror relationships, not flattened images.

## Revision 6 — four new off-road studies

The library now has **eight selectable designs**, with **All / New / Original** filters. New studies appear first. **Blueprint & references** shows the actual vector layout, a reference photograph, photo attribution and the manufacturer’s product-page link. On mobile the library scrolls horizontally.

| New study / export ID | Visual reference | Construction | Default width / depth / repeats |
|---|---|---|---|
| Trail hybrid / `trail-hybrid` | [Toyo Open Country R/T Trail](https://www.toyotires.com/product/open-country-rt-trail/) | Alternating S-notched/diagonal center pairs, scalloped shoulders, low bars | 285 mm / 15 mm / 36 |
| Canyon R/T / `canyon-rt` | [Falken Wildpeak R/T](https://www.falkentire.com/wildpeak/rt) | Three staggered center rows, stepped shoulders, notched medial blocks | 285 mm / 15 mm / 36 |
| Baja interlock / `baja-interlock` | [BFGoodrich All-Terrain T/A KO3](https://www.bfgoodrichtires.com/auto/tire-highlights/all-terrain-t-a-ko3) | Compact interlocking rows and multiple zigzag sipes | 275 mm / 11 mm / 48 |
| Rock cleat M/T / `rock-cleat` | [Maxxis RAZR MT](https://www.maxxis.com/us/tire/razr-mt/) | Broad paddles, offset center cleats, open channels, low bars | 305 mm / 18 mm / 30 |

These are **original, simplified visual interpretations**, not exact replicas, engineering models or manufacturer-endorsed designs. The parameters are adjustable modeling defaults, **not manufacturer dimensions**. They do not reproduce tire compounds, carcass construction, variable-pitch sequences or internal 3D-locking sipe technology. No tire-performance claims are made.

All four original polygon definitions remain unchanged, including the corrected mirrored rugged families and revision-5 mud blocks. New patterns use the same actual extruded mesh / geometric sipe engine and work in wrapped and flat views, with OBJ/STL export. Flat backing automatically supports the full staggered outlines.

Research photographs (comparison only, **never mesh textures**) are stored in `public/references/`:
- Trail hybrid: [Mavis / Toyo product photograph](https://www.mavis.com/tire-brands/toyo/opencountryrttrail/).
- Canyon R/T: [Wildpeak R/T owner photograph / Wrangler Forum](https://www.wranglerforum.com/threads/new-falken-wildpeak-r-t.2453363/).
- Baja interlock: [KO3 photograph / OVR Magazine](https://www.ovrmag.com/vehicle-gear/bfgoodrich-all-terrain-ko3-review-evolution-of-an-icon/965.article).
- Rock cleat M/T: [RAZR MT tread photograph / MotorTrend](https://www.motortrend.com/reviews/1712-looks-are-deceiving-when-it-comes-to-the-maxxis-razr-mt).

Photographs and product names belong to their respective owners. Source links and interpretation caveats are also recorded per design in exported manifests.

## Revision 5 — mud rebuilt from the re-supplied reference

This replaces the unsuccessful pointed-center interpretation from revision 4.

- **Broad, flat-ended center blocks** replace the long narrow spears. The center outlines are convex five-sided bars with two substantial end caps, not serrated or needle-tipped shapes.
- **Steeper hooked shoulder paddles** replace the shallow S-like sweep. Their leading and trailing edges follow sampled curves, with an angular inner hook.
- Reworked the stagger and preserved an open groove between each center block and the shoulder hook. The small ejector bars remain low, separate geometry in the shoulder channels.
- Revised the default mud pitch to **32 repeats**, while keeping width 305 mm and depth 20 mm. An untouched saved 28-repeat legacy mud preset migrates to the new pitch; custom dimensions are retained. Use **Reset** on Mud terrain to explicitly load all new defaults.
- The highway, all-terrain and corrected rugged patterns remain unchanged.

Revision 5 was marked **REV 05**; the current expansion is **REV 06**. This is a hand-authored reference study, not an exact scan. Geometry/topology tests validate construction, not photographic likeness.

## Revision 4 — superseded mud interpretation

- Replaced the width-only mirrored V layout with **opposed, same-slope shoulder sweeps**, based on reference 4.
- Lengthened the center blocks into **tapered interleaving spears** that cross the tread median and extend beyond one pitch. The shoulder and center spacing no longer forms a straight central zipper.
- Matched shoulder sipes to the swept outlines and retained the center lugs’ side-entry kinks as full-depth geometry.
- Repositioned both low ejector bars in each shoulder groove. Their tops remain at **24% of tread depth**.
- All four source features—shoulder, center spear, outer bar and inner bar—use the same point-mirror transform for their opposite copies, including sipes.
- **Highway, all-terrain and the corrected revision-3 rugged pattern are unchanged.** Regression tests preserve their definitions.

Revision 4 was marked **REV 04**; its pointed center layout is superseded above. The mud blueprint now identifies shoulders, center spears and both ejector-bar types. The supplied photos remain visual references, not dimensioned engineering drawings.

## Revision 3 — mirrored rugged-terrain families

The annotated reference identifies four families: **red shoulders**, **cream upright lugs**, **orange diagonal lugs**, and a **green double-notched center lug**.

- Each pair is generated from **one canonical outline and sipe definition**, rather than independently drawn left/right approximations.
- The opposite copy reverses both width and travel coordinates: a **point mirror / 180° in-plane turn**. A width-only reflection puts the notches on the wrong ends for this reference.
- The green center is built from a half-outline and its point mirror, giving it matching opposing notches and mirrored sipes.
- Shoulder pairs retain their staggering; the diagonal and upright/center groups alternate in a two-pitch repeat.
- The rugged blueprint uses the same four annotation colors to make the matching families easy to inspect. The 3D mesh remains rubber-colored geometry, with no tread maps.
- **Highway, all-terrain and mud geometry is unchanged from revision 2.** Regression tests compare their source definitions with the previous revision.

Revision 3 introduced the **REV 03** mirrored rugged construction. Dimensions are still reference-based approximations; the mirror relationship is exact in the constructed geometry.

## Revision 2 — closer reference matching

- **Highway:** asymmetric rib widths, a connected narrow second rib, four straight drainage channels, slimmer diagonal cuts, and curved shoulder grooves.
- **All-terrain:** larger stepped center blocks, diagonal boundaries that cross repeat seams, a winding center channel, and staggered shoulders instead of aligned horizontal gaps.
- **Rugged:** a true two-pitch sequence alternating diagonal and upright notched blocks, including the offset inner shoulder lug. Shoulder staggering stays continuous through both pitches.
- **Mud:** sampled curved shoulder paddles, offset center spears, and four small ejector bars per pitch. Ejectors are only **24% of tread depth**, not full-height lugs.
- Pattern-specific sipe widths, two-segment edge bevels, and blueprint proportions tied to the physical default dimensions.

Revision 2 remains the baseline for the other three patterns. `blocks` counts full-height lugs/rib sections; `ejectors` is reported separately in export manifests. The supplied photos remain the visual reference, not engineering drawings or exact scans.

## Run

Requires Node.js 22+.

```sh
npm ci
npm run dev
```

Open the address printed by Vite (default port 5173). The server binds to `0.0.0.0` and accepts Arena's `.e2b.app` preview hosts. Fonts and runtime dependencies are bundled locally; the app does not fetch remote image assets or call any backend.

```sh
npm run build     # production output in dist/
npm run preview   # serve production build
```

## The four original references

[Original reference Gist](https://gist.github.com/SultanAladin/b9585bb30c92c916fbab8c740f85de37)

| Reference order | Pattern | Construction | Default width / depth / repeats |
|---|---|---|---|
| 1 | Highway | Asymmetric ribs, connected narrow rib, curved shoulder cuts | 235 mm / 8 mm / 56 |
| 2 | All-terrain | Interlocking stepped diagonals, winding center channel, staggered shoulders | 265 mm / 12 mm / 40 |
| 3 | Rugged terrain | Mirrored lug pairs, symmetric double-notched center, two-pitch layout | 285 mm / 16 mm / 32 |
| 4 | Mud terrain | Hooked shoulders, broad flat-ended center blocks, low ejector bars | 305 mm / 20 mm / 32 |

These are **hand-authored interpretations**, not exact pixel traces or scans. Photographs do not supply engineering dimensions, so dimensions and repeat counts are adjustable starting values. Each preset starts at a 340 mm casing radius; tread depth is additional to that radius. The crown falls toward the shoulders.

## Viewer

- Select any of the eight patterns; use **New** to show only the new off-road studies.
- Inspect a **full wrapped tire** or a **six-repeat flat tread sample**.
- Adjust width, radius, tread depth, repeat count, and groove spacing.
- Toggle actual sipe geometry and the carcass/backing.
- Inspect triangle edges with **Wireframe**.
- Drag to orbit, right-drag to pan, scroll/pinch to zoom; press **F** to fit.
- Use the rotation button for a turntable view.
- Open **Blueprint & references** for the source vector construction.
- Download the current mesh as **OBJ** or **binary STL**.
- Settings persist in local storage. Reset restores the selected pattern's defaults.

Repeat counts are even so the rugged pattern’s two-pitch sequence closes without a phase discontinuity. The flat sample uses the same physical repeat length as the tire, so changing radius/repeat count also changes its length. Its end lugs follow their natural staggered outlines rather than being cropped flush.

## Export without a browser

```sh
# All eight patterns, both views, with carcasses/backings:
npm run export:meshes

# Only the four new off-road patterns, both views:
npm run export:meshes -- --pattern new --out exports/new

# One new pattern:
npm run export:meshes -- --pattern canyon-rt --out exports/canyon

# Only the corrected mud pattern, both views:
npm run export:meshes -- --pattern mud --out exports/mud

# Export the preserved rugged correction separately:
npm run export:meshes -- --pattern rugged --out exports/rugged

# OBJ files instead:
npm run export:meshes -- --format obj --out exports/obj

# Only wrapped tread blocks, without a carcass:
npm run export:meshes -- --view tire --tread-only --out exports/treads
```

Options: `--pattern all|new|highway|all-terrain|rugged|mud|trail-hybrid|canyon-rt|baja-interlock|rock-cleat`, `--format stl|obj`, `--view both|tire|flat`, `--out PATH`, `--tread-only`.

The export command also writes a manifest with settings/triangle counts and an import README. Generated models are ignored by Git under `exports/`; regenerate them from the source rather than committing large binaries.

### Units and topology

- Coordinates are **millimeters**. STL carries no unit metadata: select mm on import. If one Blender unit represents one meter, scale by `0.001`.
- Wrapped tire axle: **X**. Flat tread: **X** across the width, **Y** upward, **Z** along the strip.
- OBJ retains named mesh components and normals. STL stores triangles only; no textures/material files are required.
- **Exports are mesh assemblies, not boolean-unioned manufacturing solids.** Lugs use touching/intersecting lower and upper solids; lugs overlap the casing. Very tight groove settings can bring neighboring bevels together.
- For printing/manufacturing, union or remesh, weld/repair, and validate the resulting solid in your modeling tool. These meshes are not engineered or validated for functional tires.
- The tire carcass includes an inner liner and open wheel bore. The generated casing itself has a closed indexed surface. This does **not** imply the complete exported assembly is a single watertight manifold.

## Implementation

- `src/patterns.js`: editable 2D lug outlines and sipe paths, plus SVG blueprint generation.
- `src/offroad-patterns.js`: four new normalized block/sipe layouts and attributed reference metadata.
- `src/design.js`: editable project schema, preset-to-type conversion, linked mirror expansion, validation and SVG output.
- `src/designer.js`: SVG canvas, handles, history, shape controls, autosave and JSON projects.
- `src/point-editing.js`: physical-space edge projection, open/closed insertion and axis constraints.
- `src/designer.css`: black theme and responsive designer layout.
- `src/geometry.js`: 2D polygon subtraction, extrusion, bevels, pre-bend tessellation, cylindrical wrapping, carcass construction.
- `src/main.js`: Three.js viewer, controls, downloads.
- `src/settings.js`: saved settings restoration and non-custom legacy mud-preset migration.
- `scripts/export-meshes.js`: headless batch exporter using the same geometry engine.

Wrapping bends already-extruded polygon geometry around a cylindrical crown. It does not sample an image, height field, bump map, normal map, or displacement texture. The studio environment map is lighting only; it is not tread data.

## Tests

```sh
npm test
npx playwright install chromium
npm run test:e2e
```

Geometry tests cover all eight patterns, repeat-seam overlaps at default spacing, both views, finite positions/normals, parameter limits, real sipe floors, topology changes when sipes are disabled, carcass edge closure/winding, and binary STL/OBJ serialization.

Browser tests exercise all presets, view switching, parameters, toggles, persistence, dialogs, actual file downloads, and mobile overflow. Revision-specific tests also check highway rib continuity, two-pitch rugged staggering, diagonal all-terrain boundaries, and the actual height of mud ejectors. To use an existing Chromium installation, set `CHROMIUM_PATH=/path/to/chromium`.

Revision 3 adds exact mirrored-outline/sipe checks, central-lug symmetry, preserved winding, the color-coded family blueprint, and unchanged-other-pattern regressions.

Revision 4 adds mud point-mirror/phase checks, long cross-median center-lug checks, and preservation checks for the other three patterns. Default repeat-seam overlap and actual low-ejector geometry tests cover the new layout.

Revision 5 checks the broad end caps, convex center contours, shoulder sweep, default 32-repeat pitch, unchanged other patterns and preservation/migration of saved settings.

Revision 6 extends construction tests to all eight designs, adds unchanged-mud regression checks, new-pattern backing coverage, provenance checks, library filters, new preset restoration and new-pattern browser/download tests.

Revision 7 tests preserve every preset contour/sipe during conversion, mirror transforms, custom axes, phase and visibility, empty designs, actual custom geometry/sipe floors, invalid outlines/imports, SVG escaping, and browser vertex editing, mirror baking, polygon/sipe drawing, history, project reopening, custom STL exports, dark theme and mobile overflow.

Point-editing tests cover Ctrl/Cmd insertion, Alt removal and minimum-point guards, phase-B local coordinates, Shift constraints, independent cut dragging, endpoint extension, open-polyline insertion, mirror protection, pan, and one-step undo/redo.

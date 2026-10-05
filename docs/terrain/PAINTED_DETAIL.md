# Painted control over stage 6

**Update:** [Auto, Paint and Auto + paint modes](AUTO_DETAIL.md) are available. New sessions default to Auto; choose Paint for the manual workflow below.

The accepted hollow-mould boolean is unchanged in principle. This pass adds an object-space, surface-oriented paint mask that controls **where** its inner wall moves. It does not displace stage 5 directly or add textures.

## Workflow

1. Open stage 6. Choose **Protect all · clear paint** to start from an unaffected rock.
2. Choose **Paint influence in viewport**. The app displays the original stage-1 mass with a shaded weight preview: **blue = protected**, **orange = affected**.
3. Left-drag on the rock. Adjust brush radius (local metres), strength and soft-edge falloff. Switch the brush action to **Protect / erase influence** to remove weight. Undo restores the preceding stroke or clear operation (20 undo entries).
4. Stop painting to return to the rock and orbit normally, then **Rebuild through 06**. Painting is not an automatic expensive boolean rebuild.

Right-drag/pan and wheel zoom remain available while painting; Escape exits paint mode. Move/rotate/scale/spline tools are disabled during a stroke session to avoid competing pointer handlers, and restored on exit.

**Affect all** restores the old all-over treatment. Entering paint mode on an untouched all-affected mask selects the protect brush automatically; on an all-protected mask it selects the add brush. Existing recipes default to that treatment, so this does not silently change the previously accepted result.

## Shape, coverage and depth

- **Fractal:** the previously accepted irregular, three-octave relief.
- **Ridges:** an absolute-value ridge transform with sharper creases.
- **Cellular pits:** a seeded 3D nearest-cell field, giving isolated depressions rather than the same fractal surface under a new name.
- **Mask coverage:** trims low-weight painted edges. Zero protects everything. Fully painted centres retain full influence for nonzero coverage. This is **not** an automatic random-coverage generator: the user chooses the patches by painting.
- **Cut depth / penetration:** the mean inward offset, now up to 1.5 m, independent of noise amplitude. Increasing depth moves the painted mould farther into the rock without requiring stronger noise.
- **Noise displacement, wavelength, vertical frequency and seed:** remain independent controls.

For each inner mould vertex, the signed offset is approximately:

`paint weight × (cut depth + noise amplitude × noise signal) × ground fade`

The outer box stays fixed. A zero-weight vertex has zero displacement. The final operation remains `stage5 − displaced(box − original stage1)`. A **completely protected mask returns the original stage-5 meshes exactly**, bypassing the numerical recut.

## Persistence and limits

Brush stamps store local position, local surface normal, radius, strength, softness and target weight. They are evaluated on the refined mould, not tied to fragile output-triangle indices. They follow the formation's move/rotate/scale transform, including nonuniform scale. Opposite-facing surfaces are excluded by a normal gate; this is not a geodesic brush, so nearby similarly oriented surfaces can still share influence.

Version-10 recipes save the mask, patterns, coverage, depth and placement. Versions 1–9 remain readable. OBJ exports the resulting triangles, not a Blender-specific vertex-group object.

Stamps are anchored in local metres: reshaping the base can move the surface relative to old strokes. Check alignment after changing a formation. The limit is 3,000 stamps. The colour preview interpolates weights over the original source triangles; the mould is refined separately. Use a brush radius at least about twice the mould spacing for reliable smooth patches. Sub-triangle painted features cannot be promised at the prototype's coarse resolution.

Partially protected results still undergo the existing bounded numerical cleanup (1–3 mm), and brush boundaries interpolate across mould triangles. Thus only the fully protected fast path is an exact unchanged-mesh guarantee. Narrow triangles and the existing self-intersection limitations remain; aggressive depths can require gentler settings.

## Actual captured example

The browser test painted three stamps on a moved, rotated and nonuniformly scaled formation. Only **444 of 6,013 inner mould vertices** had nonzero influence; the surrounding broad faces stayed flat. This example used 0.5 m penetration and 0.5 m noise amplitude. It removed approximately **33.78 m³**, produced **6,130 triangles**, and the measured detail computation took **1.10 seconds** in the sandbox browser (not including earlier stages or rendering).

- [Painted mask](paint-renders/painted-mask.png)
- [Localized boolean result](paint-renders/localized-cut.png)
- [Reproducible recipe](paint-renders/recipe.json)
- [Measurements](paint-renders/measurements.json)

These are captures of the actual application's WebGL canvas, not generated illustrations.

## Verification

- `npm run test:detail-mask`: exact all-protected identity, paint/erase, smooth falloff, opposite-normal rejection, coverage trimming, input limits, idempotent recipe normalization, three distinct CSG noise results, increased penetration, upstream mesh preservation, stage-6-only invalidation and recipe-10 round-trip.
- `npm run test:detail-paint:browser`: actual pointer strokes on a posed formation, undo, coloured preview, export disabled while painting, stage-6-only rebuild, saved mask import/export, and no page errors.
- Existing mould suite: six formations plus seed/neutral controls passed.
- Existing viewport suite: real gizmo drags, spline editing, posed OBJ and version-10 recipe round-trip passed. Its asynchronous import check now waits for a new generation revision instead of accidentally inspecting the pre-import state.
- Placement CPU suite passed. No RC/atrium, particle simulation or stages 1–5 geometry-source changes were made.

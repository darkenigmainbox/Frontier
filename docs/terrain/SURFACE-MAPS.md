# Geometry-derived surface textures — no noise

This is a first whole-formation material pass, interpreting the requested Gaea-like “satmaps” as **splat/control maps**, not satellite photography. It generates real UV atlases and PNG textures, not just vertex colours. It does not add noise textures, stochastic colour fields, noise displacement or an SDF.

## Use

The cliff opens in **Surface** mode and bakes its selected valid stage in a cancellable worker. Clay and Cut surfaces remain available. The inspector's **Surface maps · no noise** panel contains:

- Sandstone, limestone and basalt palettes with different qualitative iron/solubility responses.
- Weathered/fresh comparison, lit material and unlit albedo, plus individual control-map views.
- Weathering cycles, rain, drying, acidity, oxygen, runoff/trapping and AO reach/samples.
- Ordered horizontal strata: layer thickness and contrast. This is an explicit repeating mineral-layer model, not noise; set contrast to zero to remove visible bands.
- 512² / 1024² / 2048² atlas sizes and **Export pack**.

**Stage 1 has no generated fissures.** Rebuild through stages 2–5 to include their actual fracture, joint, spall and crack surfaces. Surface settings rebake the maps without regenerating the cliff mesh. Geometry edits invalidate the old atlas; stale exports are disabled. Viewport splines and transform gizmos remain intact.

## Thirteen maps

| PNG | Meaning |
| --- | --- |
| Albedo | Weathered colour, sRGB; AO/lighting are not baked into it |
| Fresh | Unweathered colour reference, sRGB |
| Roughness | Wetness lowers roughness; deposits increase it |
| Height | Normalized generation-space elevation, **not displacement** |
| Slope | Face inclination, zero horizontal to one vertical; uses absolute normal-Y |
| Curvature | Signed edge-angle proxy: dark concave, mid-grey flat, light convex |
| Pointiness | Positive/convex edge-angle response |
| AO | White exposed / dark occluded, from deterministic hemisphere triangle rays |
| Cracks | Real tagged cut surfaces plus distance-decayed influence across mesh edges |
| Runoff | Accumulated downhill flow, normalized by this mesh's maximum |
| Wetness | Final retained surface-water value |
| Weathering | R = oxide; G = surface-loss response; B = deposition/trapping proxy |
| Splat | Normalized RGBA weights: R fresh rock, G oxide, B deposits, A wet rock |

Splat alpha is a **material weight**, not transparency. The raw PNG encoder preserves RGB even when alpha is zero; a Canvas roundtrip can otherwise destroy those values. Mask textures are linear data. Diagnostic previews display their byte values without scene lighting.

## How it works

1. Weld coincident mesh positions for analysis, build edge adjacency, and compute face normals, height, signed dihedral angles and tagged-cut influence. Edge features spread along actual mesh edges with distance falloff.
2. Build a triangle BVH. Fixed, deterministic cosine-hemisphere directions estimate short-range AO; upward triangle rays estimate rain visibility. No random noise or noise generator is involved. AO includes a virtual ground patch made of two triangles at the mesh's minimum local Y; those helper triangles are not exported with the rock.
3. Restart from fresh material and advance a bounded, dimensionless surface-water model for the selected cycles under constant settings. This is a parameter-study bake, not an ongoing weather-event history. Exposed upward-facing surfaces receive rain. Water moves down connected mesh edges and exchanges laterally on level shelves. Drying and overflow remove water. A ledger checks supplied minus evaporated/escaped/remaining water.
4. Wetness, oxygen and iron susceptibility accumulate oxide staining. Wetness, acidity and rock solubility accumulate a loss response. Wet concavities and cut surfaces favour a deposition/trapping proxy. Convex exposed areas reveal more fresh material. These fields blend the palette and roughness.
5. Rasterise interpolated fields and ordered strata into padded per-triangle UV charts. The same atlas coordinates drive all maps. The renderer keeps a stable UV buffer and invalidates the next on-demand frame after material upload; tests guard against accidentally sampling only one texel.

## Scope and limitations

- This is **surface appearance weathering**, not a calibrated geology/chemistry solver. Loss changes colour, not rock volume. The deposit response is a heuristic coating proxy, not a mass-conserving sediment transport solver.
- No physical mesh erosion/displacement, new grain simulation, particle stacking fix or stage 6 was added. Particle implementation and RC source are unchanged.
- The model is deterministic, not a photographic microtexture generator. Coarse triangles and field interpolation can remain visible; curvature is an edge-angle proxy, not exact smooth-surface curvature. The current look is intentionally coarse/stylized.
- Baking is in formation-local space with local Y as gravity. Placement transforms move the baked material with the model; rotating the object does not resimulate rainfall or ground AO.
- Atlas charts prioritize robust correspondence and export over packing efficiency. No mipmaps are generated, to avoid cross-chart bleeding. Small charts limit detail; crowded atlases require a higher resolution. The triangle ceiling is 150,000, also subject to chart-size limits.
- At 1024², the 13 uncompressed RGBA maps occupy **52 MiB CPU**. At 2048² that becomes **208 MiB**. The UI's GPU figure is a map-cache estimate only, excluding geometry, shadows, framebuffer and driver overhead; it is not measured total VRAM usage.
- No hardware FPS claim is made. Bake durations shown in the UI are actual elapsed worker timings, not frame-rate measurements.

## Export / compatibility

**Export pack** downloads a ZIP containing a UV-mapped, placement-transformed triangle OBJ; `rock.mtl`; all 13 PNGs; a recipe; and `maps.json` describing channels, colour spaces and settings. The exploded inspection view is not exported. The ordinary Export OBJ button remains geometry-only.

MTL references Albedo and the PBR `map_Pr` roughness extension; support for that extension varies by importer. Other maps are provided for explicit material wiring. PNG rows and exported OBJ V coordinates are converted consistently. Exports use lossless PNG compression and uncompressed ZIP entries, with CRC checks.

Cliff recipes are now **version 8**, with surface settings in a separate `Surface` object. Earlier geometry/placement recipes still load; absent surface settings use defaults. Baked image pixels are regenerated rather than embedded in recipes.

## Verification

- `npm run test:surface`: triangle-ray intersection, a roof lowering actual AO, convex/concave feature checks, dry/anoxic/neutral controls, deterministic replay, water balance, normalized splat weights, lossless zero-alpha PNG channels, ZIP structure, UV OBJ and a full stage-5 bake without geometry mutation.
- `npm run test:surface:browser`: built-site initial PBR UV binding and visible texture variation, material/fresh/map views, stage-5 crack masks, ZIP download, recipe-v8 reload including regenerated wet results, and surface-setting edits without geometry rebuilds.
- Native Python ZIP CRC validation also accepted the downloaded archive. See `surface-checks.json` for recorded CPU checks. Browser captures were visually inspected, rather than relying only on topology or hashes.

The existing viewport browser suite also passed real gizmo drags and spline editing with the surface system enabled. Particle CPU/hash and browser replay regressions passed; their implementation files were not modified.

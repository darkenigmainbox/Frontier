# 5.1 · Face erosion

A new checkpoint sits **between Surface fissures (05) and Mould detail (06)**. The sidebar entry is **5.1 — Face erosion**. `?stage=5.1` opens it directly; the next/previous buttons traverse 5 → 5.1 → 6.

## What it does

Each connected rock component gets its own local bounding-box centre. Vertices move along directions toward or away from that centre, using a smooth, seeded directional field. Different regions of a rock receive different amounts, so this **deforms its faces**, rather than translating the entire block.

- **Inward face depth:** maximum requested inward movement, default 0.35 m.
- **Outward bulge:** maximum requested outward movement, default 0.15 m.
- **Outward region share:** a threshold/bias toward outward regions, not an exact percentage of faces.
- **Face variation:** blends between a uniform inward contraction and the directional random field.
- **Face erosion seed:** repeatable, independent of fracture and mould seeds.

The ground contact is pinned, with a 0.5 m transition above it. Shared vertices are moved once. Vertex count, triangle indices, connectivity and face tags stay unchanged. This is a geometric erosion-like deformation, not a physical erosion simulation or independent face extrusion. Existing spall/fissure feature annotations remain upstream annotations; their triangles are deformed with the rock.

Set both inward and outward amounts to zero to preserve stage 5 exactly. Recipes through version 11 load with those amounts zero, preserving their earlier appearance. New version-12 recipes save the erosion controls.

## Safety checks

For each candidate deformation:

1. Recompute indexed topology, triangle areas and signed volume.
2. Reject degenerate faces and triangles whose normals rotate more than 60 degrees from their input normals.
3. Use a triangle AABB tree and triangle/triangle SAT checks for newly detected overlaps, including between separate rocks.
4. Check for newly contained connected components, which surface-intersection checks alone would miss.
5. Reduce the requested displacement on offending rock meshes and retry. Persistently unsafe rocks are restored to their input geometry. A final conservative fallback restores the entire input if necessary.

Existing input contacts are compared against the original geometry; this does not repair pre-existing intersections. These are practical floating-point checks, not a mathematical guarantee for arbitrary pathological input. The UI reports changed, limited and rejected rock meshes and the maximum applied movement, rather than pretending all requested movement was accepted. Narrow-triangle warnings remain visible.

## Stage 6 integration

Stage 6 now subtracts the original-base noisy mould from **stage 5.1**, not directly from stage 5. The mould is still constructed from the **original stage-1 mass**. Its inspector offers both **5.1 · Before mould detail** and **05 · Before face erosion**.

Consequently, a stage-5.1 bulge that extends beyond the original base can be trimmed by that mould, including where mould displacement is zero. A completely protected stage-6 mask still bypasses the boolean and retains its input exactly. Auto remains the default influence mode.

Changes to erosion reuse stages 1–5 and invalidate 5.1 and 6. Changes to mould detail reuse 5.1. Placement edits do not rebuild geometry. The synchronous five-stage generator still stops at 5; the async `MouldSequence` accepts `Through=5.1`. To preserve the existing stage-6 array index, the extra result is exposed as `Result.Erosion`, with `Number:5.1`; it is included in worker validation and timing/cache reports.

## Actual result and cost

The default headland test changed all 48 rock meshes. Safety checks reduced the requested movement on 37; none needed complete rejection. It moved 10,147 vertices inward and 2,148 outward, with a maximum applied movement of approximately 0.316 m. Indexed connectivity was unchanged and no new overlaps were reported by the final check.

The browser measured **14.67 seconds for stage 5.1**, including three safety passes. This is substantially more expensive than the mould pass because of the intersection checks. It excludes earlier stages and is not a user-hardware performance claim.

Actual viewport captures, at the same camera position:

- [Stage 5](erosion-renders/stage5.png)
- [Stage 5.1](erosion-renders/stage51.png)
- [Stage 6 using the eroded input](erosion-renders/stage6.png)
- [Recipe](erosion-renders/recipe.json)
- [Measurements](erosion-renders/measurements.json)

No generated illustrations or substitute geometry were used.

## Tests

- `test:face-erosion`: surface-crossing and containment fixtures; inward/outward movement; unchanged vertex counts/connectivity; pinned ground; no new detected overlaps; zero-strength identity; stage-6 handoff; caching; recipe-12 round-trip and legacy compatibility.
- `test:face-erosion:browser`: actual 5.1 menu, visible controls, direct-link launch, stage navigation, OBJ export, stage-6 input, Auto retained, recipe import/export and no page errors.
- Existing six-formation mould tests passed with erosion explicitly disabled to test their previous contract. Manual/Auto mask CPU tests and placement tests passed. The existing real-gizmo/posed-spline browser suite passed with recipe 12.

The more varied stage-6 input exposed microscopic clusters of degenerate Float32 exchange faces. The existing repair now permits a sequence of link-safe microscopic collapses through an already-degenerate cluster, while refusing to degenerate or invert previously valid faces. Final strict area and topology checks are unchanged.

# Procedural stage-1 rock formations

## What changed

The old generator perturbed six authored station layouts. Its noise controls altered those layouts without replacing their basic structural arrangement. Parameter edits also required an explicit rebuild, which made it easy to keep viewing an unchanged result.

Stage 1 now defaults to **Procedural — seeded formations**. `FormationShape.js` constructs a new macro layout from the formation seed: peak count (when automatic), unequal peak positions/heights, shoulders, saddles, front buttresses/recesses and independently varying rear thickness. The existing polygon loft/cell contract is retained for stages 2–5.

Small surface-relief noise is applied afterwards. **Noise = None and relief strength = 0 do not disable structural generation.**

Stage-1 controls automatically rebuild after a 350 ms editing pause. Later stages remain explicitly rebuilt to avoid repeatedly running the expensive fracture pipeline during slider changes. Changing upstream settings invalidates stale geometry/export as before.

## Controls

- **Major peaks = 0 / Seeded:** the seed chooses 1–5 major peaks. Set 1–7 explicitly to control the count.
- **Peak / valley contrast:** deep saddles versus a continuous high ridge; also affects single-peak shoulders.
- **Peak sharpness:** broad shoulders versus narrow pointed peaks.
- **Formation lean:** signed lateral lean with physical height.
- **Crown taper:** narrows the upper mass.
- **Large shelves:** varies broad depth setbacks with elevation.
- **Buttress / recess depth:** controls large front projections and bays.
- **Width, height, depth:** physical dimensions/proportions.
- **Small surface relief:** secondary noise only, kept separate from the macro controls.

The six landform presets now apply structural settings as well as proportions. Their profiles also bias the generated structure: a recessed amphitheatre, stepped escarpment, high continuous wall, spire or serrated needles. These are still connected, ground-based formations, not a general-purpose cave/arch/disconnected-boulder topology generator.

Lean and taper are functions of physical height, not just the row index. This avoids the projected-cell folding that otherwise occurs when neighbouring peaks have different heights. An orientation guard remains as a safety check; it did not attenuate these controls in the tested cases. The front/back surfaces retain a minimum thickness.

## Compatibility and scope

- **Legacy — authored profiles** remains available. New macro controls are disabled in that mode rather than pretending to affect it.
- New cliff recipes use **version 4**. Versions 1–3 load in legacy mode, preserving their previous base-shape interpretation. The historical five-stage mesh hashes still match when that mode is selected.
- Stage-1 shape changes invalidate downstream checkpoints. Unchanged shapes reuse cached stage 1.
- The particle/grain implementation files were **not modified**. The user's reported floating/stacking issue is acknowledged and deferred, not fixed by this change.
- No stage 6, SDF work, new erosion model or RC renderer changes were added.

## Verification

`npm run test:formations` checks:

- Six seeds with surface noise disabled: distinct meshes and 1–5 generated peaks.
- All six structural presets.
- Both endpoints of all seven macro controls; each changes the generated structure.
- Single-peak contrast, deterministic regeneration, checkpoint invalidation and recipe compatibility.
- Structural topology and positive per-body volumes across all those stage-1 fixtures.
- Full stages 1–5 for the default formation, seed 73 and the escarpment preset.

`npm run test:formations:browser` tests the **built page**: automatic rebuilding, three visibly different no-noise seed previews, lean affecting exported mesh geometry, legacy-control disabling, version-4 recipe export, downstream generation and stale-export protection. No page errors were observed. Real browser images for seeds 42, 1 and 73 were inspected.

Particle CPU and built-site browser regressions also pass, including exact study replay and legacy cliff hashes. No changes were made to the RC renderer or shared Three.js bundle in this implementation.

See `formation-checks.json` for the recorded corpus. Example no-noise stage-1 results: seed 42 → 2 peaks / 924 triangles; seed 1 → 5 peaks / 2,070 triangles; seed 73 → 1 peak / 592 triangles. The full default pipeline with its normal small-relief settings produced 902 / 8,872 / 17,330 / 27,162 / 29,164 triangles.

Narrow-triangle warnings remain visible: the default full pipeline reports 5 / 0 / 4 / 3 / 3 triangles below five degrees. Structural topology checks are not a complete self-intersection proof, and this finite test corpus does not certify every possible parameter combination. No hardware FPS claim is made.

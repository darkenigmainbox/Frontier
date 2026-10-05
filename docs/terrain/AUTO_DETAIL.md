# Auto and painted influence — recipe 11

New sessions now start in **Auto**. Stage 6 still performs triangle-mesh subtraction using the displaced negative of the original stage-1 mass. No textures, SDF conversion or changes to stages 1–5 are involved.

The influence selector at the top of the stage-6 inspector offers:

- **Auto:** seeded procedural patches only. Stored paint is ignored, not deleted.
- **Paint:** the existing manual base weight and surface brush strokes. Auto parameters are ignored.
- **Auto + paint:** procedural patches, followed by brush additions or protection. Paint trim is applied after those corrections.

## Auto controls

- **Coverage:** shifts the threshold of a smooth 3D value-noise mask. Lower values leave more areas protected; higher values affect more areas. It is a threshold control, **not an exact surface-area percentage**. Zero protects everything; one affects everything.
- **Patch size:** spatial scale in local metres, separate from the detailed cutting noise wavelength.
- **Gradient falloff:** width of the soft transition between protected and affected areas. Zero gives a hard vertex-weight threshold, still interpolated across mesh triangles.
- **Patch seed:** independent of the detailed surface-noise seed.
- **Height bias:** negative favours lower regions; positive favours upper regions. Zero is unbiased. Height is measured in original local formation coordinates.

Default settings: coverage 0.45, patch size 6 m, falloff 0.3, seed 42, height bias 0. Noise shape and penetration controls remain available underneath.

**Preview Auto mask** shows the original mass coloured blue for protected regions and orange for affected regions. It supports orbiting but cannot paint. Return to the rock and rebuild through 06 after changing settings. Choose Auto + paint to edit that procedural mask locally, or Paint to use a fully manual mask. The manual Protect all/Affect all buttons are enabled only in Paint; Clear painted corrections removes strokes without changing Auto settings.

Recipe 11 saves the mode and Auto settings. Recipes 1–10 load in Paint mode to preserve their previous unmasked or manually painted result rather than silently adding procedural patches.

## Verification

`tests/auto-detail-mask.mjs` checks mixed and soft weights, deterministic seeds, size/seed variation, monotonic coverage, hybrid add/protect, input validation, legacy recipe migration, topology of the default Auto result, exact stage-5 output at zero coverage, and detail-only cache invalidation.

`tests/auto-detail-browser.mjs` checks the production build: default Auto selection, visible mode-specific controls, read-only Auto preview, all three modes, zero coverage, stage-6-only rebuilds, recipe 11 and no page errors. The real-pointer painted-mask browser suite also passed with explicit Paint mode, including posed painting, undo and recipe import/export. Manual mask and placement CPU tests passed.

The captured browser test's default Auto headland influenced 4,197 of 6,026 inner mould vertices, removed about 56.54 m³, and produced 16,374 triangles with zero reported topology defects. This is a coarse prototype: smooth transitions are sampled at mould vertices, narrow triangles remain possible, and topology checks do not prove global absence of self-intersections for arbitrary extreme settings.

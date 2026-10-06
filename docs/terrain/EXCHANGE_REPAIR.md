# Stage-6 ZeroArea=1 repair

Two reproducible variants of the reported error were found on the default eroded headland, in Paint mode with the all-affected mask and cut depths of 0.5 m and 1.5 m. The user's exact recipe was not supplied; these are reproductions of the same validation failure, not a claim to have tested their precise settings.

## Cause

The boolean mesh uses Float32 exchange coordinates. At a ground-level corner, three points roughly a micrometre apart form a triangle below the existing area threshold. The old cleanup can only collapse to an existing endpoint, and its normal-change limit can reject both endpoint choices even though the positional adjustment is microscopic. The surrounding faces prevent a useful diagonal flip.

## Repair

- Try a Float32-quantized midpoint as well as both endpoints of a microscopic edge. This can distribute the normal change across both sides of the corner.
- Preserve the manifold link condition, the 10-micrometre movement bound and checks against collapsing or inverting previously valid faces.
- For midpoint proposals, check changed faces against the complete candidate surface for newly detected triangle overlaps, relative to the pre-repair mesh.
- If only zero-area defects remain, permit a second short-edge-collapse attempt with a normal cosine limit of 0.95 (about 18 degrees), instead of the usual 0.99 (about 8 degrees). This fallback has the same microscopic displacement bound and includes the overlap check for endpoint proposals too. Diagonal flips retain the original normal limit.
- Re-run the strict final topology/area/finite-positive-volume validator. No bad triangle is simply deleted on its own, and no previous mesh is substituted.

Pre-existing contacts and the practical floating-point limitations of the intersection test remain as documented for the prototype. Narrow-triangle warnings are separate from degenerate faces and are not suppressed.

## Regression coverage

`tests/fixtures/exchange-ground-corner.json` and `exchange-deep-corner.json` are closed connected components extracted from the failing generated meshes. Each has exactly one zero-area defect and no other reported topology defects before repair. After repair, both have zero open/nonmanifold edges, zero nonmanifold vertices, zero duplicate/degenerate faces and consistent winding. The midpoint is explicitly Float32-representable; repeated cleanup is idempotent.

Commands:

- `npm run test:exchange-repair` — both captured failures and 13 full eroded-cliff boolean cases, varying seed, cut depth, spacing, wavelength and noise pattern.
- `npm run test:exchange-repair:browser` — production worker/WASM, both reproduced settings, zero reported topology defects, detail-only rebuild and enabled OBJ export.
- The existing six-formation mould regression suite also passed.

The browser produced 25,194 triangles at depth 0.5 m and 23,900 at depth 1.5 m, with zero degenerate faces in both. Node and browser triangle counts can differ at floating-point tolerances, as before.

# Stage 5.1 validation responsiveness

The screenshots show erosion's safety pass, before the stage-6 boolean. Repeated allocation-heavy triangle separating-axis tests were the measured bottleneck.

## Changes
- Cache prepared triangle edges, normals and shared-vertex contraction. Preserve the original AABB rejection, SAT axes and tolerances.
- Once both bodies in a pair are already unsafe, further contacts cannot affect that pass's rejection set. Skip them. The final accepted pass still checks all relevant pairs. Detected-contact totals therefore no longer match the older exhaustive diagnostic count.
- Report validation phase and elapsed/budget time at roughly 250 ms checkpoints.
- Limit validation to 20 seconds or 8 million work checkpoints. These are cooperative limits, not a hard real-time timer: individual operations and suspended tabs can delay the next checkpoint.
- On budget exhaustion, discard **all** deformation and retain the **current** stage-5 meshes and records unchanged. Never accept a partially checked candidate or reuse an unrelated old result. Stage 6 may continue from that unchanged input; its existing mesh validators still apply.
- Show a persistent inspector warning when erosion was skipped. Explicitly rebuilding through 5.1 retries a budget rejection and invalidates downstream detail. Setting both erosion amplitudes to zero bypasses deformation.
- “Cancel build” terminates the worker without immediately starting another one.

## Evidence
Same-input Node comparison against published a75's erosion code, asserting deep equality of full meshes and reduction factors:
- Initial optimized run: 8575 ms → 2179 ms (3.93×).
- Final code, including cached original AABB parity: 6239 ms → 1724 ms (3.62×).
These are local fixture measurements, not a guarantee of browser speed or the user's exact recipe.

Tests passing:
- 15,000 seeded SAT comparisons (shared edges/vertices, coplanar and small triangles); accepted default output also checked with the original SAT implementation.
- Forced deadline and mid-validation work-budget fallback preserve stage-5 mesh/record object identity.
- Existing erosion topology, collision, containment, cache and stage-6-input regression.
- Both microscopic-corner fixtures and 13 full erosion/boolean cases.
- Production Chromium worker: cancel/restart, normal 5.1→6, forced deadline via test-only accelerated worker clock, visible warning, unchanged current stage-5 input and validated stage-6 export.
- Existing production-browser repair cases at Paint depths 0.5 and 1.5: all hard defect counters zero; OBJ face counts match.

The screenshot's complete recipe was not supplied. Existing floating-point safety checks remain safeguards, not a mathematical intersection certificate.

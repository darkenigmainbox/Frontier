# BVH investigation · 2026-10-05

> **Historical v0.3/v0.4 results.** v0.5 replaces every analytic primitive with a triangle mesh and samples actual emitter triangles. The current Triangle playground has 3,052 triangles, not 36. Do not use the numbers below as current performance claims; rerun Measure A/B for the triangle-only workload.

## The report being investigated

The user observed approximately 22 FPS / 23.4 ms GPU with BVH enabled, and reported a fall to 1 FPS with BVH disabled, in the **Analytic playground**. The screenshot shows 16 shadow samples and 75% render scale. The screenshot does not supply the disabled-mode GPU time or device model, so it does not establish the source of that drop.

## What was measured here

**These measurements use Chromium's SwiftShader SOFTWARE GPU in the sandbox. They are not the user's GPU, not hardware-GPU performance claims, and not the exact camera shown in the screenshot.**

Fixed analytic scene: 36 triangles, 7 analytic shapes, time 74.4 s, default camera, GI and reflections enabled, probes off, 16 shadow samples, visibility guard off, **160 × 100 actual output pixels**. The tiny output size keeps software tracing tractable. Warm-up/order: BVH / brute / brute / BVH, two discarded warm-ups plus five recorded frames per block, ten measurements per mode. The completed-render wall clock covers transform update through completed GPU work; timestamp readback waiting is excluded. Rendering does not wait for animation-frame pacing.

### Previous renderer (v0.3)

| Median | BVH | Brute force |
| --- | ---: | ---: |
| Completed render | 1398.35 ms | 1103.35 ms |
| GPU compute | 1396.16 ms | 1101.76 ms |
| CPU packing + BVH preparation | 0.20 ms | 0.15 ms |

[Raw samples and settings](measurements/software-baseline.json). The only baseline source change exposed the already-existing timestamp readback promise, allowing the test to wait for the correct frame's measurement.

### Updated renderer (v0.4)

| Median | BVH | Brute force |
| --- | ---: | ---: |
| Completed render | 1547.45 ms | 1257.65 ms |
| GPU compute total | 1545.52 ms | 1256.00 ms |
| GPU cascades + gather | 150.96 ms | 128.54 ms |
| GPU primary / shadow / reflection | 1395.67 ms | 1116.32 ms |
| GPU presentation | 0.24 ms | 0.26 ms |
| CPU preparation | 0.25 ms | 0.15 ms |

[Raw samples and settings](measurements/software-v04.json). Medians of individual stages need not sum to the median total. Refitting this tiny BVH was below the effective CPU timer resolution for the median sample; that is not a claim of zero execution cost when enabled. Brute mode explicitly performs no refit.

**Interpretation:** this software configuration favors brute force for this very small triangle scene. It does not reproduce a catastrophic BVH-off regression. Most time here is pixel shading, which includes direct shadow samples and reflections, rather than the cascade solve. These observations do not diagnose another GPU/driver. The updated renderer is not claimed to be faster: it changes shader logic and pass instrumentation, and both measured software paths were slower in this run.

## Measure the user's device

Use **Measure A/B** above the viewport. The app freezes the current pose and keeps all other settings fixed, runs BVH / brute / brute / BVH with two warm-ups and eight recorded frames per block, and exports:

- Individual samples plus median and p95, sample counts and completion/abort status.
- CPU preparation and BVH update time.
- Separate timestamped cascade/gather, primary/shadow/reflection, and presentation passes.
- Completed-render wall time, without claiming it is browser FPS.
- Exact render dimensions, scene/camera/time/quality settings, app URL/version, user agent, and available adapter metadata.

Controls and orbit input are locked during measurement. Settings are restored afterward. A resize, hidden tab, cancel request, 30-second budget, or >2.5-second frame stops the experiment. Submitted GPU work cannot be cancelled midway. Partial runs may have unequal samples and are labeled accordingly. Large stress scenes are excluded from brute-force benchmarking rather than silently changing the scene.

Run the CLI experiment with `npm run measure`. Optional environment variables: `CHROMIUM_PATH`, `MEASURE_OUTPUT`. The script intentionally requests SwiftShader for reproducibility; use the browser UI for real hardware measurements.

## Lighting correctness findings

The old implementation added registered emitter radiance to a coarse interpolated probe field **and** integrated the same emitters with direct shadow rays at the visible surface. This could double-count direct energy and spread it through geometry via the probe interpolation.

v0.4 excludes those registered direct-emitter hits from the gathered indirect field. Non-emissive hits still estimate reflected direct light. An unregistered emissive sky backdrop remains a field input. This is still an approximate single-bounce cache, not a full physical transport solver.

The optional **GI visibility guard** casts surface-to-probe rays and rejects blocked or back-facing connections before normalized interpolation. A controlled GPU test uses eight white probes behind a wall:

| Fixture | Returned irradiance (one channel) |
| --- | ---: |
| Naive interpolation, wall present | 1 |
| Guard enabled, wall present | 0 |
| Guard enabled, no wall | 1 |

This tests only final interpolation. It **does not prove** that coarse cascade merging, parallax, probes inside geometry, or angular aliasing are solved. The guard defaults OFF because it adds up to eight ray queries per irradiance lookup (including reflected hits). Blocky/leaking indirect lighting can remain.

Direct-only and normals views now skip unneeded GI work when overlays are off. Soft direct shadows remain a separate sampled ray-visibility calculation: their visual quality is not evidence that the indirect field is correct. The output still has no antialiasing/temporal reconstruction; low render scale can also cause jagged outlines, independently of GI leakage.


## v0.6: sphere sampling, quality controls and grand hall

The historical performance tables above still do **not** describe the current triangle-only renderer. No hardware FPS improvement is claimed. New any-hit shadow traversal may save work, while the default orb count rises to 16 samples; these changes need a same-device, same-settings measurement.

The sphere regression fixture traces the actual **720-triangle orb**, without other scene occluders. Seventy inward-facing receivers sit 3 m from its center: 16 equatorial positions, six cardinal directions, and 48 directions distributed over the sphere. The small ambient term is subtracted. This checks coverage in every direction, including above/below—not just a single floor image. Single-channel direct radiance, emission multiplier 1:

| Orb samples | Minimum | Maximum | Max/min |
| --- | ---: | ---: | ---: |
| 8 | 0.08870 | 0.26520 | 2.990 |
| 16 (default) | 0.14066 | 0.22442 | 1.595 |
| 32 | 0.16064 | 0.21148 | 1.316 |
| 64 | 0.17584 | 0.21026 | 1.196 |
| 256 (test-only convergence reference) | 0.18596 | 0.19321 | 1.039 |

These are **SwiftShader correctness measurements, not performance measurements**. They demonstrate outward coverage and convergence, not perfect uniformity at interactive sample counts. Low settings can still show directional quadrature artifacts; the tessellated geometry itself is not an exact sphere. Sampling uses a smoothly blended, mesh-normal-weighted triangle CDF, normal-space ordering, barycentric surface points, and matching PDF compensation—no analytic light or intersection proxy. Real scene blockers should produce unequal brightness.

GPU smoke tests additionally exercise probe-field reallocation/dispatch (Low, High with increased angular detail, Ultra with increased angular detail), dynamic atlas indexing, standard-density hall bounds, the **10,008-triangle** hall, and the large-scene brute-force guard. Default/high-density geometry, BVH/brute equivalence, connected vertex deformation, actual emitter triangle membership, and the existing visibility fixture remain tested. The hall's crate slider spans **4,008–16,008 triangles**.

Probe configuration and all light-quality settings are included in benchmark JSON. CPU pack/BVH excludes the preceding scene animation/deformation update; completed-render wall time includes it. The grand hall and >256-cube stress variants are blocked from brute-force A/B in the shared benchmark as well as the UI to reduce watchdog risk. Other scenes retain a genuine BVH-off baseline.

## v0.7: instancing, visibility raster and reconstruction

The user's v0.6 screenshot shows **57.3 ms CPU preparation**, **29.36 ms GPU cascades**, **18.87 ms GPU shading**, and about **5 FPS**. Those partial timings do not account for an entire 200 ms render-loop interval. v0.7 adds scene-update, encode, submission-wait and completed-render timing rather than attributing the remainder to an unmeasured bottleneck.

### Small software-GPU pipeline comparison

[Raw settings and samples](measurements/software-v07.json), reproducible with `npm run compare`. Chromium SwiftShader, **64×48 pixels**, moving 10,008-triangle hall, 7,884 probes, base angular detail, Lit view with reflections, 64 panel/64 orb targets, emission 4.9, orb multiplier 3.3, panel size 1.9. Two warm-ups and **only three samples per profile**, fixed profile order. The camera/pose/view are not a reconstruction of the user's cropped screenshots.

| Median | Retained v0.6 reference | v0.7 full refresh, no reconstruction | v0.7 reconstructed, quarter budget |
| --- | ---: | ---: | ---: |
| Completed render | 7,758.9 ms | 13,018.2 ms | 2,569.1 ms |
| CPU preparation | 14.0 ms | 5.3 ms | 3.9 ms |
| CPU hierarchy preparation | 1.6 ms | 0.4 ms | 0.3 ms |
| GPU total (excludes presentation) | 7,748.04 ms | 13,009.37 ms | 2,562.37 ms |
| Visibility raster | — | 11.66 ms | 11.81 ms |
| Cascades/gather | 4,019.96 ms | 6,262.93 ms | 1,625.10 ms |
| Lighting/shadows/reflections | 3,681.70 ms | 6,788.48 ms | 923.39 ms |
| Reconstruction/display filtering | — | 1.15 ms | 2.08 ms |
| Interval rays | 193,536 | 193,536 | 48,384 |

**Interpretation:** the budgeted/reconstructed path took about 3.02× less completed-render time in this software experiment. It traces fewer probes and at most eight fresh direct samples per emitter, reusing history; it is **not equal per-frame work or demonstrated equal image quality**. Full-refresh v0.7 was slower than the old approximation because the new visibility checks and instanced traversal have costs. This is not a hardware FPS result, not a basis for predicting 5→16 FPS on the user's GPU, and not a robust multi-device benchmark. The retained reference uses the current scene-update cache and allocation-reduced refit copy, so it is not an untouched old binary. Stage medians need not sum to the median total.

### Correctness and structural checks

- Hall: **10,008 rendered / 4,020 unique local triangles**, 525 instances, 26 meshes. All 500 crates share one cube BLAS. Only the 3,072-triangle sheet's local vertex/BLAS data updates; static mesh data stays cached.
- One moving-frame test uploaded 544,928 geometry/emitter bytes. Settled paused frames uploaded zero of those bytes; uniforms and scheduling still update.
- New instanced BVH/brute direct-light images matched exactly in the 64×48 fixture, with reconstruction disabled and fixed sampling. Brute steady-state hierarchy-refit time was zero.
- Raster reconstruction versus closest-triangle camera queries: **2,579 tested pixels**, maximum distance discrepancy about **0.00000572 world units**. Pixel centers within 0.2 pixels of either triangle edge are excluded because fixed-function subpixel coverage and floating-point ray intersections have different edge rules. This is not a claim of bit-identical silhouettes.
- Low budget: full refresh 7,168 interval rays, quarter frames 1,792. High and Ultra increased-angular full dispatches exercised 229,376 and 774,144 rays. Resize replaced targets and reset history.
- Opaque wall and 0.8 mm blocker: final probe lookup **0**, coarse connector **0**, inside-probe validity **0**. An enclosed-probe fixture larger than the near-grid reach is rejected too. Move the blocker away: final lookup **0.375** (its trilinear weight), coarse connector **1**, validity **1**.
- Connected sheet: final/coarse results **0/0** while blocking and **0.375/1** after non-rigid vertex displacement, with unchanged topology/matrix. No SDF or analytic surface proxy.
- Static history accumulated to 13 frames in the fixture. Changed emission, a large light-position jump, scene change and resize reset it to one. All 60 visible moving-instance pixels in the motion check rejected their history.

These fixtures establish specific invariants, **not** complete GI correctness. The connector test is conservative, local backface classification is a heuristic, and coarse filtering uses finite stochastic samples. Unchanged/unscheduled fields can lag, moving surfaces have less history, and darkening/noise or residual leaks can remain.

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

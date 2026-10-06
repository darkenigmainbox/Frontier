# Cascade / lab · v0.8

A WebGPU **visibility-raster + triangle-traced lighting** experiment. The camera view is rasterized; GI, shadow, reflection and probe-visibility queries intersect real mesh triangles. Built with JavaScript, WGSL, Vite and Three.js (geometry/math and the explicitly labeled WebGL fallback).

**Research prototype, not a production GI SDK.** v0.7 implements shared geometry, visibility rasterization, conservative visibility-tested merging, temporal reconstruction and budgeted probe updates. It does not claim universally correct GI or a particular hardware frame rate.

## Run, test and publish

```sh
npm install
npm run dev
npm run build
npm run preview
# Install a Playwright Chromium build first if needed:
npx playwright install chromium
npm test
npm run build:githack
```

WebGPU requires HTTPS or localhost and a compatible GPU/browser/driver. Dev binds to `0.0.0.0` and permits `.e2b.app` hosts. Fonts/icons are local. `CHROMIUM_PATH` can select another Chromium binary for tests. Tests explicitly request SwiftShader for reproducible software-GPU execution.

`site/` is the intentionally tracked static deployment. Relative asset URLs work under:

```text
https://raw.githack.com/darkenigmainbox/Frontier/<commit-sha>/site/index.html?scene=atrium
```

Rebuild and commit `site/` before publishing a new immutable link. raw.githack may show an external-content notice before opening the app.

## Quad tyre workshop

Open `/tyre/index.html` in the dev server or `site/tyre/index.html` in a published build. Editable vector patches, mirrored/repeated tread blocks, indexed quad caps/bevels/walls, and four-index OBJ export. This first replacement uses separate closed blocks and a quad casing, not a welded single surface. See [method, tests and limitations](docs/tyre/QUAD_EDITOR.md). The pinned original Slate generator is preserved in `tyre/upstream/`.

## New: Aurum atrium

An original procedural, modern Sponza-style architectural test scene: **24 × 22 × 10 m**, with two-storey cylindrical colonnades, upper galleries and balustrades, solid stairs with actual stairwell openings, recessed wall panels, timber soffit fins, a skylight lattice, planted seating bays and a connected bronze ribbon sculpture. Terracotta and teal banners deform at their vertices while their top edges remain pinned.

**9,476 rendered triangles · 1,444 unique local triangles · 428 instances · 9 shared/unique meshes.** Curved columns, foliage, sculpture, walls and emitters are all triangle geometry—not analytic intersection shapes, SDFs or image backdrops. Architecture is static and cached; only the two 240-triangle banners deform, plus the moving mesh emitter. Three registered mesh lights keep light sampling bounded: the skylight, warm rear recess and orb. The roof aperture/transoms physically occlude the daylight emitter.

Choose **Aurum atrium** or open `?scene=atrium`. Its entrance camera and probe bounds are configured for the architecture. Toggle **Triangle edges / wireframe** to inspect the actual tessellation. The existing crate hall remains a separate stress test. Neither architectural hall permits brute-force A/B in the UI. This is a lighting test environment, not a collision-enabled walking simulator or an official Sponza asset; the renderer's existing GI/reconstruction limitations still apply.

## A. Shared meshes and two-level acceleration

`src/acceleration.js` stores each unique mesh once in local coordinates, with a triangle **BLAS**. A world-space **TLAS** bounds mesh instances. The hall's **500 crates share one 12-triangle cube and one BLAS**. Its 10,008 rendered triangles require **4,020 stored local triangles across 26 unique meshes**, with 525 instances.

- Rigid animation updates transforms/inverses and object bounds, not every world-space triangle.
- Static room meshes remain cached on the GPU.
- The connected sheet changes vertex positions and refits only its own BLAS. Its indices and object matrix stay fixed.
- Triangle/node storage is reused. Unchanged scene updates are skipped; settled paused frames upload **zero geometry/emitter bytes**. Uniforms and probe scheduling still have uploads.
- A frame after motion stops clears instance history-rejection flags once.
- BVH OFF bypasses both TLAS and BLAS traversal. Dynamic triangle ordering needed by raster visibility remains; existing hierarchy allocations are retained. After initialization, brute mode skips hierarchy refits. Re-enabling refits stale bounds.
- Cold scene setup still constructs the shared acceleration/raster infrastructure; BVH OFF is not a promise of zero cold-start preparation.

**No SDF or analytic sphere/capsule/box surface intersections.** AABBs only reject candidates. All accepted ray hits use mesh triangles. Direct-light samples are barycentric points on emitter triangles, not analytic light proxies.

`updateScene()` caches its inputs. External integrations that change animation descriptors at the same simulation time should call `invalidateSceneUpdate()`. External vertex changes must update the geometry attribute version (`needsUpdate=true`); topology changes require rebuilding the scene.

## B. Visibility raster

A depth-tested raster pass writes **instance ID + triangle ID** to `rg32uint`, with a `depth32float` depth attachment. Shared meshes draw with instancing. There are no primary-camera BVH traversals.

Shading reconstructs pixel-centre barycentrics from the **one selected triangle**, then obtains its world position, face normal and material. This avoids storing a large full G-buffer and avoids subpixel interpolation error in stored barycentrics. The single-triangle calculation is not a scene ray search. World-space lighting rays still see off-screen mesh geometry.

Normals are geometric face normals; curved meshes can look faceted. No MSAA/TAA silhouette antialiasing is claimed. A visibility raster is not a screen-space-only GI tracer.

## C. Conservative GI visibility

`src/modern-shaders.js` implements:

1. **Probe rejection.** Opposing-axis triangle queries (at least 2 m reach, with offset origins to catch on-surface probes) detect enclosing backfaces; probes too close to a surface are also rejected. This is a local heuristic, not a general point-in-solid proof or probe relocation system.
2. **Directional/spatial filtering.** The merge samples the eight spatial neighbours and four finer angular child bins over time, instead of always fetching one nearest direction.
3. **Endpoint reconnection.** A triangle visibility query connects displaced interval endpoints. Blocked connectors contribute zero instead of importing radiance through a blocker.
4. **Surface-to-probe visibility.** Final interpolation also rejects blocked/back-facing/invalid connections. With reconstruction, one weighted neighbour is sampled per lookup; without it, all eight final neighbours are evaluated.

These checks are always enabled on the new WebGPU path. They are **conservative**: blocked samples are not renormalized into other neighbours, and the original interval test plus connector can over-occlude. Darkening, finite-sample artifacts and residual errors are possible. This is not the exhaustive bilinear-fix algorithm, a complete physical transport solution, or multi-bounce path tracing. Turning reconstruction off freezes the stochastic cascade-merge sample; it is not a ground-truth integrator.

GPU fixtures check a lit probe field across an opaque wall separating two regions, a **0.8 mm blocker**, a vertex-deformed blocker and a **connected non-rigid sheet**. Both the final lookup and the coarse connector are blocked, then admit light after the blocker moves out of the path. These controlled cases do not prove absence of leakage in every scene.

## D. Temporal reconstruction and update budgets

- **Quarter / half / all** schedules a hard, rounded-up per-level probe count. Overdue probes prevent starvation; changed geometry regions receive priority over ordinary background updates.
- Initial frames, scene/quality/lighting-setting changes, viewport resize and large emitter jumps refresh all probes and reject history.
- Cascade samples accumulate in their persistent directional fields. Static fields stop updating after a warm-up of `budget × 16` frames; geometry changes resume updates.
- The temporal image pass reprojects world positions into the previous camera. It rejects mismatched instances, moved instances, disocclusions/position differences and normal changes. Reflective surfaces reject history during camera motion.
- History is neighbourhood-clamped. Static surfaces can accumulate up to 16 frames; changing scenes use at most four. Continuously moving lighting can still lag; this is not exact lighting-change detection everywhere.
- A separate **edge-aware filter** checks instance identity, normals and geometric separation instead of blindly blurring across walls.
- With reconstruction enabled, direct lighting uses **up to eight fresh samples per emitter per frame**, even if the panel/orb target is 16/32/64. Those controls remain full fresh-sample counts when reconstruction is disabled. Cascade-hit lighting uses one panel sample and two orb samples.

Budgeting trades instantaneous completeness for reuse. Moving instances reject rather than motion-vector-reproject their history, so their soft shadows can be noisier than static surfaces. This is not equal per-frame quality to tracing 64 fresh light samples everywhere.

## Probe controls

| Density | C0 / C1 / C2 grids | Total probes | Full-refresh interval rays |
| --- | --- | ---: | ---: |
| Low | 8×4×8 / 4×2×4 / 2×1×2 | 292 | 7,168 |
| Standard | 12×6×12 / 6×3×6 / 3×2×3 | 990 | 25,344 |
| High | 16×8×16 / 8×4×8 / 4×2×4 | 2,336 | 57,344 |
| Ultra | 24×12×24 / 12×6×12 / 6×3×6 | 7,884 | 193,536 |

Angular detail changes 16/64/256 directions per probe to 64/256/1,024: **four times the interval work**. Standard quarter-budget frames trace 6,464 interval rays (per-level rounding); Ultra base-angular quarter-budget frames trace 48,384. Full resets are more expensive. These counts exclude classification, connector, direct shadow and reflection rays.

Bounds cover 12×7×11 m normally and 24×10×22 m in the hall. Intervals adapt to grid spacing and room size. `src/probes.js` configures every pass and the fallback's illustrative layout. More probes increase work and memory; they do not automatically fix transport.

Probe overlay is intentionally X-ray. Radiance colours come from the current cached fields; visibility means interval miss fraction, not full-scene visibility. The atlas displays directional bins. Probes/atlas request GI updates even when GI shading is disabled, until the static cache settles.

## Scenes and controls

| Scene | Geometry/workload |
| --- | --- |
| The light chamber | 1,945 triangles; coloured panels, ball and moving/deforming objects |
| Deforming mesh | 4,584 triangles; sheet with 1,617 vertices and 3,072 connected triangles |
| Window / penumbra lab | Real wall openings, mullions, exterior emitter and sky backdrop |
| Triangle playground | 3,052 triangles; tessellated spheres, boxes and capsules |
| Grand hall · 10K | 24×22×10 m; 10,008 triangles at 500 crates, 15 pillars and the connected sheet |
| Geometry stress test | Up to 1,536 animated cubes; 19,188 total triangles |
| Triangle swarm | 64 vertex-deforming shards |
| Aurum atrium | Modern colonnade, galleries, skylight, sculpture and deforming banners; 9,476 triangles |
| Stack study | Occlusion and reflection inspection |

The hall crate slider spans **4,008–16,008 triangles**. BVH-off A/B is blocked for both architectural halls and >256-cube stress variants to reduce GPU watchdog risk, not silently replaced by a different workload.

- Drag/scroll: orbit/zoom. Space: animation. R: camera reset. G: GI. P: probes. F: fullscreen.
- Lit / Direct / Indirect / Normals / Probe atlas; actual triangle edges; PNG capture; reset controls.
- Orb emission and isolation; panel area and sample targets; orb sample target; GI intensity; reflection toggle; render scale.
- The 720-triangle ball uses a smoothly blended mixture of six normal-weighted triangle-area distributions with PDF compensation and a uniform support floor. It emits outward without a disk/sphere sampling proxy. Low counts can still show quadrature artifacts.
- Emission is surface light, not volumetric fog, bloom or a hard influence radius. Panel size changes emitting area at constant radiance.
- Reflections use one ideal reflected triangle ray, not rough recursive path tracing, SSR or a cubemap.

## Timing and memory

The UI separately displays:

- CPU scene update (animation/deformation), renderer preparation, command encoding, submit-to-complete wait, and completed-render wall time.
- GPU **visibility raster**, **cascades/gather**, **lighting/shadows/reflections**, **reconstruction**, **presentation/overlay**.
- Actual scheduled interval rays and geometry/emitter upload bytes (excluding uniforms/schedules).
- FPS: render-loop throughput, which also includes scheduling/UI costs.

Submit-to-complete contains GPU execution and synchronization: **do not add it to GPU time**. Preparation includes packing and driver calls, not the preceding scene update. The GPU total includes visibility/reconstruction and excludes presentation.

Owned VRAM accounting includes padded shared triangle/node/emitter buffers, probe/state fields, schedules, uniforms, timing readbacks, visibility/depth, raw lighting, two history sets and output textures. Current render targets total approximately **72 bytes/output pixel** before capture. History therefore raises memory use relative to v0.6 even though mesh storage shrinks. Excludes driver/pipeline/browser swap-chain allocations, other applications and delayed destruction; it is **not total device VRAM**. Position/identity history uses half floats suited to this demo's bounds/counts, not an arbitrarily large-world representation.

**Measure A/B** freezes the pose and alternates acceleration modes with safety limits, exports stage timings/settings and restores controls. Modern blocks reset sample phase/history. The retained v0.6 reference lives in `src/reference-gpu.js` for tests/comparison, not the production UI.

```sh
npm run measure  # safety-limited BVH/brute software experiment
npm run compare  # slow, high-quality-target v0.6/v0.7 pipeline comparison
```

See [measurements and caveats](docs/MEASUREMENTS.md), especially the v0.7 comparison. The reconstructed path performs less fresh work and is **not an equal-quality benchmark**. No speedup is promised on an unmeasured GPU.

## Tests and remaining limitations

`npm test` retains the previous algorithm's regression suite and exercises the new pipeline separately: shared BLAS/TLAS, paused caching, fixed-budget coverage, actual GPU shaders, raster IDs/barycentrics against camera-ray geometry away from quantized raster edges, BVH/brute equivalence, wall/thin-blocker/sheet visibility, history accumulation/rejection, lighting jumps, density changes and resize. The real WebGPU UI benchmark lifecycle is tested with offscreen presentation in headless Chromium.

Remaining work includes more robust probe classification/placement, less biased merging, object motion vectors, better sampling/denoising, antialiasing, higher-quality acceleration trees/GPU refits and hardware-target profiling. Full-refresh visibility checks can be **slower** than the old leaking approximation. Temporal lag, noisy moving surfaces, dark corners and residual GI errors remain possible.

WebGL fallback is a labelled conventional raster preview with point lights/shadow maps. It does **not** run these cascade/reconstruction compute stages. Character loading/skinning and cloth simulation are not implemented; the sheet is procedural vertex deformation.

## Particle grain weathering demo

The separate terrain page at `terrain/index.html?particles` (deployed under `site/`) now uses discrete mineral particles attached to a cliff face. The rejected stage-6 displacement was reverted. The original five cliff stages and RC/atrium demo are preserved.

Try sandstone, granite or limestone; run chemical weathering, inspect crystals, compare fresh/current grains and use **On rock** to locate the patch. This is a bounded millimetre-scale coating experiment, not a calibrated geological model or whole-cliff grain simulation. No SDF stage. See [scope, controls and tests](docs/terrain/PARTICLES.md).

Tests: `npm run test:particles`; built-site browser checks: `npm run test:particles:browser` (Playwright Chromium, optionally `CHROMIUM_PATH`).

## Procedural base formations

Stage 1 now generates seeded macro formations rather than only perturbing authored profiles. Open `site/terrain/index.html`, leave **Major peaks** on **Seeded**, and try **New seed**. Peak contrast, sharpness, lean, taper, shelves and recess depth are independent of small surface noise. Stage 1 auto-previews; later stages rebuild on demand. Old cliff recipes retain a legacy mode. The particle model—including its deferred stacking issue—is unchanged. See [formation controls, scope and checks](docs/terrain/FORMATIONS.md).

Tests: `npm run test:formations` and `npm run test:formations:browser`.

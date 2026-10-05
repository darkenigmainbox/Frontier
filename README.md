# Cascade / lab · v0.4

An interactive **WebGPU 3D radiance-cascade prototype** with animated/deforming triangles, a moving emissive sphere, analytic primitives, traced reflections, area-light shadows, and a triangle BVH. Built with Vite, JavaScript, WGSL, and Three.js (scene math and the explicitly labeled WebGL fallback).

**A research renderer, not a production-ready game-lighting SDK.** WebGPU runs real interval tracing, coarse-to-fine merging, and irradiance gathering. The approximations and performance limits are exposed rather than hidden behind simulated metrics.

## Run / build

```sh
npm install
npm run dev
npm run build
npm run preview
```

WebGPU requires HTTPS or localhost and a compatible browser/GPU/driver. Current Chrome/Edge are good starting points. The dev server binds to `0.0.0.0` and accepts Arena's `.e2b.app` preview hosts. Fonts, icons, and geometry are local; no asset API is needed.

### Static deployment on raw.githack.com

```sh
npm run build:githack
```

This produces **`site/`**, the intentionally tracked static deployment artifact. Vite uses relative URLs, so the app, fonts, favicon, and chunks work from nested paths. Rebuild this directory whenever source changes, commit it, and serve the resulting public commit:

```text
https://raw.githack.com/darkenigmainbox/Frontier/<commit-sha>/site/index.html
```

Add `?scene=deform`, `?scene=windows`, `?scene=primitives`, or `?scene=stress` to open a specific scene. Use an immutable commit URL to avoid stale branch caches. This session publishes only from `arena/01a10bdc-frontier`.

## Seven scenes

| Scene | What to inspect |
| --- | --- |
| Deforming mesh | One connected indexed sheet: 1,617 vertices, 3,072 triangles, pinned top edge, fixed object transform, changing vertex positions |
| The light chamber | Two colored panels, an orbiting emissive ball, mirror-like sphere, deforming shards, capsule, and analytic box |
| Window / penumbra lab | Actual wall openings and mullions, exterior rectangular emitter, emissive sky backdrop, and shadow-receiving objects/floor |
| Analytic playground | Exact spheres, axis-aligned boxes, and vertical capsules; seven analytic primitives including the moving emitter |
| Geometry stress test | Seeded, animated triangle cubes: 64 / 256 / 768 / 1,536 instances; **18,468 total triangles** at maximum |
| Triangle swarm | 64 orbiting/deforming triangle shards |
| Stack study | Taller blocks for occlusion and reflection inspection |

For a clear **penumbra comparison**, open the window room, pause motion, use **Direct only**, disable probes, and compare 1 shadow sample against 16 or 64. Change **Area emitter size** to see shadow softness change. Size changes emitting area at constant radiance, so total power also changes. This is surface lighting, **not volumetric fog or god rays**. The window scene selects 16 samples; stress selects 1 to keep workloads manageable.

The ball's emissive material is visible to primary and reflected rays. Cascade rays intersect it as an occluder but exclude its directly sampled emission from the indirect field, avoiding a second direct-light contribution. Its direct light is sampled using a camera-independent disk facing the shaded surface, with a conservative endpoint offset to avoid self-shadowing inside the analytic emitter. This is an approximation, not exact spherical-light integration.

## Controls and visualization

- **Drag / scroll:** orbit / zoom, constrained to the open side of the chamber.
- **Space:** pause/resume. **R:** reset camera. **G:** GI. **P:** probes. **F:** fullscreen.
- Adjust emission, indirect intensity, speed, render scale, emitter size, and 1/4/16/64 shadow samples.
- Toggle BVH acceleration directly above the viewport, and reflected rays in the sidebar. BVH OFF skips CPU building/refitting, triangle reordering and node uploads as well as GPU traversal; existing buffer capacities remain allocated. Brute-force comparison is limited to ≤256 stress cubes to avoid obvious GPU watchdog hazards.
- Inspect **Lit**, **Direct only**, **Indirect** (gathered radiance), **Normals**, and **Probe atlas**.
- **Triangle edges / wireframe** draws actual barycentric triangle edges on WebGPU (wireframe mesh rendering on WebGL), including the connected deforming sheet. Analytic shapes have no triangle edges in WebGPU.
- Export a PNG including probe overlays, restart time, or restore all settings.

### Actual probe data

The default overlay shows **C1's 108 probes**. Select C0 (864), C1 (108), or C2 (18). Markers are drawn through geometry intentionally:

- **Radiance:** average merged indirect-field radiance from that probe's actual GPU buffer, tonemapped.
- **Cascade ID:** a fixed color identifying the selected level.
- **Visibility:** fraction of directions with no intersection in that probe's own distance interval; not full-scene visibility.

**Probe atlas** tiles show directional bins, not averages. Columns are 36 / 12 / 6 for C0 / C1 / C2, with probes in the same X-fastest order as the 3D grid. Visibility mode displays the interval miss flag per direction. Cascade-ID mode affects marker colors only; the atlas still displays radiance.

Probes/atlas require current cascade data, so their visualization continues to dispatch cascades even when GI shading is toggled off. Disable overlays and use Lit/Direct to measure GI-off performance without that debug work.

## Dynamic meshes: the distinction this demo now shows

Moving a rigid object is not the same as deforming a mesh. In **Deforming mesh**, `updateScene()` changes the local-space positions in a single indexed `PlaneGeometry(6, 4.2, 48, 32)`. The top row stays pinned; the other 1,568 vertices bend. The object matrix and triangle indices do not change. Set **Vertex displacement** to zero for a flat sheet; enable **Triangle edges / wireframe** to inspect the actual triangles. This is a procedural wave, **not** cloth simulation or an imported skinned character.

Every frame follows this chain:

```text
animate / skin / displace vertices
        ↓
update triangle positions (+ refit BVH if enabled)
        ↓
trace cascade rays against the CURRENT triangles
        ↓
merge distant radiance into nearer cascades
        ↓
gather and sample lighting for surfaces
```

A character can supply skinned vertices to the same ray-query stage. Merely animating the raster draw is insufficient: tracing against the old bind-pose mesh would give incorrect shadows and GI. GPU-only vertex displacement also needs a matching tracing representation. A normal-map-only ripple does not move the surface or silhouette and does not require changing bounds, though lighting/material evaluation must use the updated normals.

**No SDF is generated here.** Radiance cascades organize lighting samples; they do not prescribe an SDF as the geometry representation. An SDF can describe animated analytic geometry, but keeping a baked mesh-distance volume accurate under arbitrary skinning is a different, potentially costly problem. This renderer avoids it by intersecting triangles directly.

### Does BVH overhead outweigh the benefit?

Sometimes, particularly with tiny scenes or very few rays. The comparison is:

```text
BVH ON  = geometry update + BVH update + rays × accelerated query cost
BVH OFF = geometry update              + rays × full triangle-list cost
```

For illustration, 25,344 cascade rays against 10,000 triangles imply about 253 million triangle checks without acceleration, before shadow/reflection work. A BVH rejects groups by their bounding boxes, but its benefit depends on overlap, mesh motion, ray distribution and update implementation. This demo uses CPU refitting, not GPU refitting or hardware ray-tracing support. Large deformation can degrade the hierarchy and eventually justify a rebuild. Compare **CPU pack + BVH, the explicit CPU BVH time, GPU time and FPS**; GPU time alone omits CPU update overhead. Pause motion for a stable comparison, and keep resolution/samples/overlays unchanged.

Cascades are distance scales, **not bounce counts**. Three levels do not mean three light bounces. This prototype evaluates emission/direct-lit hits and approximates their gathered contribution; it is not a full multi-bounce transport solver.

## Acceleration and reflections

### Triangle BVH

`src/bvh.js` builds a **CPU median-split binary BVH** with up to four triangles per leaf. Nodes are flattened depth-first with escape indices for stackless WGSL traversal. Triangle vertices are uploaded in leaf order. When BVH is enabled, its topology is rebuilt on scene changes and **bounds are refitted each frame**, including deformed vertices. When disabled, raw triangles are uploaded directly with no BVH work. Re-enabling refits current geometry or rebuilds if the scene changed. This same triangle BVH is used for primary, shadow, cascade, and reflected rays.

This is software ray tracing in WebGPU compute, **not hardware RT/DXR**. Analytic primitives use exact intersections in a separate small linear list; they are not in the triangle BVH. Sphere, AABB, and vertical-capsule intersections include inside/outside and end-cap handling. Analytic primitives are shown separately in telemetry and do not count as WebGPU triangles.

Reflections trace **one perfect reflected ray** at reflective surfaces and blend the result with a Fresnel-like material weight. Reflected hits evaluate emission, direct lighting, and gathered radiance. They are **not SSR, cubemaps, rough microfacet sampling, or recursive path tracing**. The Traced reflections switch permits an A/B comparison.

## Radiance-cascade pipeline

| Level | Probe grid | Probes | Directions/probe | Interval |
| --- | --- | ---: | ---: | --- |
| C0 | 12 × 6 × 12 | 864 | 16 | 0–0.9 m |
| C1 | 6 × 3 × 6 | 108 | 64 | 0.9–3 m |
| C2 | 3 × 2 × 3 | 18 | 256 | 3–24 m |

**990 probes, 25,344 interval rays per update.** Directions use a uniform-solid-angle spherical parameterization. Spatial sampling becomes coarser as directional sampling becomes finer.

1. `src/scene.js` transforms/deforms geometry and produces triangle, analytic-shape, and emitter data. `src/bvh.js` builds/refits triangle bounds.
2. `src/shaders.js` traces **C2 → C1 → C0**. Unoccluded interval rays merge coarse radiance with trilinear spatial interpolation and nearest directional-bin lookup. Non-emissive hits evaluate a scaled direct-light term. Registered direct emitters block the ray but do not inject emission into this indirect cache; unregistered emissive backdrops can still contribute. Cascade hit lighting uses one representative sample per emitter for cost control.
3. A gather pass integrates C0 into six cosine-weighted irradiance lobes per probe.
4. Primary rays trace the scene, interpolate gathered irradiance, sample area-light visibility, and optionally trace one reflection. Direct/reflection lighting uses the selected shadow-sample count.
5. A full-screen pass presents the compute texture; an instanced pass draws probe markers.

`src/gpu.js` owns buffers, bind groups, dispatch order, output texture, timing, and readback. Allocations grow when scene capacity increases. The renderer waits for completed submitted work before scheduling another frame, avoiding an unbounded command backlog.

## Measurement and lighting diagnosis

Click **Measure A/B** above the viewport for a controlled comparison on your own GPU. It freezes the scene/camera/settings, alternates modes with warm-ups, reports medians and p95/raw samples in a downloadable JSON, and restores the original settings. See [the measured software-GPU results and limitations](docs/MEASUREMENTS.md). A sandbox software renderer did **not** reproduce the reported BVH-off slowdown; it must be measured on the affected hardware rather than assumed normal.

Blocky indirect light is a real limitation: C0 uses only 16 directions per probe, directional merging is coarse, interpolation normally ignores walls, and probe origins differ. Soft direct shadows come from separate visibility rays and do not validate the cascade solve. v0.4 removes duplicate registered-emitter energy from the probe cache, and offers **GI visibility guard** to test surface-to-probe visibility at additional cost. The guard is OFF by default and is not a complete leakage fix. No antialiasing is implemented, so 75% render scale can also produce visibly jagged outlines.

Use **Direct only** versus **Indirect** with overlays disabled to distinguish the two lighting paths. Direct-only and normals views now skip unneeded cascade and shading work; turning off GI while inspecting probes still runs the solve for that debug data.

## Performance / VRAM telemetry

- **FPS:** completed browser/render-loop throughput, not a synthetic engine benchmark.
- **GPU time:** hardware timestamp queries when available; compute total excludes presentation. The pass strip separately reports cascades/gather, primary/shadow/reflection shading, and presentation/overlay. Otherwise shown as unavailable.
- **CPU pack + BVH:** triangle packing, BVH build/refit, buffer writes/rebinding, and resize preparation. Excludes the preceding object-transform update and UI work.
- **VRAM allocation · est.:** sum of known renderer-owned GPU buffer capacities, RGBA8 output texture, and temporary capture allocations while active. Click the metric for a breakdown.

**WebGPU cannot expose total physical VRAM, other apps' GPU memory, or exact resident memory.** This is an application allocation estimate, not a device-usage meter. It excludes browser swap-chain buffers, pipeline/driver overhead, query-set implementation memory, and delayed resource destruction. Buffer capacities are retained when a scene gets smaller. WebGL fallback allocation is not estimated.

At 64×48 output, the software-GPU tests recorded approximately 0.49 MiB owned for the chamber and 3.48 MiB for 1,536 stress cubes; real viewport output textures add more. These are allocation checks, **not hardware performance claims**.

## Limits before game integration

- CPU median-split BVH construction/refitting is simple, not a production SAH builder or GPU scene acceleration system. Large motions can degrade a refitted hierarchy.
- Cascade merging remains approximate: no parallax correction, visibility-aware coarse merging, or probe relocation. The optional final surface-to-probe visibility guard can reject some invalid interpolation connections, but probes inside geometry and incorrect merged radiance can still leak or produce bands.
- The gathered term estimates reflected direct light and includes unregistered emissive backdrops; registered directly sampled lamps are excluded to prevent duplicate direct energy. It is **not** an exact indirect-light decomposition or iterative multi-bounce solver.
- Deterministic area-light sampling can show stepped penumbrae at low sample counts. There is no temporal accumulation or denoiser. Cascade-hit direct lighting is lower quality than primary-hit lighting.
- No production material model, light importance sampling, adaptive cascade layout, or guaranteed frame rate. Measure on your target devices.

For a game, improve BVH quality and GPU refitting, implement engine-driven materials/geometry, visibility-aware probe placement/interpolation, temporal filtering, and configurable quality budgets. The in-app renderer notes explain the actual implemented paths.

## WebGL fallback

When WebGPU is unavailable or lost, the app switches to a **clearly labeled Three.js raster preview**. It has conventional lights/shadow maps and a fill approximation, **not** cascade GI, sampled-area penumbrae, analytic ray intersections, or BVH tracing. Probe markers are illustrative, atlas is unavailable, and unsupported telemetry is marked unavailable. The fallback does not pretend its numbers come from WebGPU.

## Tests

```sh
npx playwright install chromium
npm test
```

Tests start an isolated Vite server on port 5180 and check fallback labeling, controls, scene switching, memory explanation, pause/reset, dialogs, PNG download, and mobile overflow. The GPU tests execute WGSL into an offscreen texture (avoiding headless swap-chain limitations) and verify:

- Nontrivial output, GI and geometry-motion changes, normals, overlays, atlas levels, PNG readback.
- BVH vs brute force agreement: exact pixels for the analytic and deforming-sheet tests; the chamber permits a few one-LSB differences from shared-edge/tie ordering.
- Window shadow-sample and emitter-size image changes.
- Analytic geometry and moving emitter updates.
- An **18,468-triangle** dispatch and corresponding allocation growth.
- Benchmark state restoration, cancellation, timestamp stages, full WebGPU UI control locking and JSON export; an isolated blocked-probe fixture verifies the optional visibility guard.
- Isolated connected-mesh deformation: fixed topology, fixed transform, fixed lights, changing vertices and cascade atlas; BVH refit reuses the same tree, and BVH OFF records zero refit time.

GPU tests explicitly skip if no adapter exists. Set `CHROMIUM_PATH=/path/to/chromium` to use an existing browser. Linux may need `npx playwright install-deps chromium` or equivalent native libraries.

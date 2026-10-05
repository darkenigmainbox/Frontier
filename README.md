# Cascade / lab · v0.2

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

Add `?scene=windows`, `?scene=primitives`, or `?scene=stress` to open a specific scene. Use an immutable commit URL to avoid stale branch caches. This session publishes only from `arena/01a10bdc-frontier`.

## Six scenes

| Scene | What to inspect |
| --- | --- |
| The light chamber | Two colored panels, an orbiting emissive ball, mirror-like sphere, deforming shards, capsule, and analytic box |
| Window / penumbra lab | Actual wall openings and mullions, exterior rectangular emitter, emissive sky backdrop, and shadow-receiving objects/floor |
| Analytic playground | Exact spheres, axis-aligned boxes, and vertical capsules; seven analytic primitives including the moving emitter |
| Geometry stress test | Seeded, animated triangle cubes: 64 / 256 / 768 / 1,536 instances; **18,468 total triangles** at maximum |
| Triangle swarm | 64 orbiting/deforming triangle shards |
| Stack study | Taller blocks for occlusion and reflection inspection |

For a clear **penumbra comparison**, open the window room, pause motion, use **Direct only**, disable probes, and compare 1 shadow sample against 16 or 64. Change **Area emitter size** to see shadow softness change. Size changes emitting area at constant radiance, so total power also changes. This is surface lighting, **not volumetric fog or god rays**. The window scene selects 16 samples; stress selects 1 to keep workloads manageable.

The ball's emissive material is visible to primary, reflected, and cascade rays. Its direct light is sampled using a camera-independent disk facing the shaded surface, with a conservative endpoint offset to avoid self-shadowing inside the analytic emitter. This is an approximation, not exact spherical-light integration.

## Controls and visualization

- **Drag / scroll:** orbit / zoom, constrained to the open side of the chamber.
- **Space:** pause/resume. **R:** reset camera. **G:** GI. **P:** probes. **F:** fullscreen.
- Adjust emission, indirect intensity, speed, render scale, emitter size, and 1/4/16/64 shadow samples.
- Toggle BVH traversal and reflected rays independently. Brute-force comparison is limited to ≤256 stress cubes to avoid obvious GPU watchdog hazards.
- Inspect **Lit**, **Direct only**, **Indirect** (gathered radiance), **Normals**, and **Probe atlas**.
- Export a PNG including probe overlays, restart time, or restore all settings.

### Actual probe data

The default overlay shows **C1's 108 probes**. Select C0 (864), C1 (108), or C2 (18). Markers are drawn through geometry intentionally:

- **Radiance:** average merged radiance from that probe's actual GPU buffer, tonemapped.
- **Cascade ID:** a fixed color identifying the selected level.
- **Visibility:** fraction of directions with no intersection in that probe's own distance interval; not full-scene visibility.

**Probe atlas** tiles show directional bins, not averages. Columns are 36 / 12 / 6 for C0 / C1 / C2, with probes in the same X-fastest order as the 3D grid. Visibility mode displays the interval miss flag per direction. Cascade-ID mode affects marker colors only; the atlas still displays radiance.

Probes/atlas require current cascade data, so their visualization continues to dispatch cascades even when GI shading is toggled off. Disable overlays and use Lit/Direct to measure GI-off performance without that debug work.

## Acceleration and reflections

### Triangle BVH

`src/bvh.js` builds a **CPU median-split binary BVH** with up to four triangles per leaf. Nodes are flattened depth-first with escape indices for stackless WGSL traversal. Triangle vertices are uploaded in leaf order. The topology is rebuilt on scene changes and **bounds are refitted each frame**, including deformed vertices. This same triangle BVH is used for primary, shadow, cascade, and reflected rays.

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
2. `src/shaders.js` traces **C2 → C1 → C0**. Unoccluded interval rays merge coarse radiance with trilinear spatial interpolation and nearest directional-bin lookup. Hits evaluate emission and a scaled direct-light term. Cascade hit lighting uses one representative sample per emitter for cost control.
3. A gather pass integrates C0 into six cosine-weighted irradiance lobes per probe.
4. Primary rays trace the scene, interpolate gathered irradiance, sample area-light visibility, and optionally trace one reflection. Direct/reflection lighting uses the selected shadow-sample count.
5. A full-screen pass presents the compute texture; an instanced pass draws probe markers.

`src/gpu.js` owns buffers, bind groups, dispatch order, output texture, timing, and readback. Allocations grow when scene capacity increases. The renderer waits for completed submitted work before scheduling another frame, avoiding an unbounded command backlog.

## Performance / VRAM telemetry

- **FPS:** completed browser/render-loop throughput, not a synthetic engine benchmark.
- **GPU time:** hardware timestamp queries when available; covers compute passes, excludes presentation/overlay rendering. Otherwise shown as unavailable.
- **CPU pack + BVH:** triangle packing, BVH build/refit, buffer writes/rebinding, and resize preparation. Excludes the preceding object-transform update and UI work.
- **VRAM allocation · est.:** sum of known renderer-owned GPU buffer capacities, RGBA8 output texture, and temporary capture allocations while active. Click the metric for a breakdown.

**WebGPU cannot expose total physical VRAM, other apps' GPU memory, or exact resident memory.** This is an application allocation estimate, not a device-usage meter. It excludes browser swap-chain buffers, pipeline/driver overhead, query-set implementation memory, and delayed resource destruction. Buffer capacities are retained when a scene gets smaller. WebGL fallback allocation is not estimated.

At 64×48 output, the software-GPU tests recorded approximately 0.49 MiB owned for the chamber and 3.48 MiB for 1,536 stress cubes; real viewport output textures add more. These are allocation checks, **not hardware performance claims**.

## Limits before game integration

- CPU median-split BVH construction/refitting is simple, not a production SAH builder or GPU scene acceleration system. Large motions can degrade a refitted hierarchy.
- Cascade merging remains approximate: no parallax correction, visibility-aware interpolation, or probe relocation. Probes inside geometry and coarse interpolation can leak light or produce bands.
- The gathered term contains visible emitter energy and direct-lit hit surfaces: it is **not** a clean indirect-only physical decomposition or iterative multi-bounce solver.
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
- **Pixel-identical BVH vs brute force** for the chamber and analytic scene.
- Window shadow-sample and emitter-size image changes.
- Analytic geometry and moving emitter updates.
- An **18,468-triangle** dispatch and corresponding allocation growth.

GPU tests explicitly skip if no adapter exists. Set `CHROMIUM_PATH=/path/to/chromium` to use an existing browser. Linux may need `npx playwright install-deps chromium` or equivalent native libraries.

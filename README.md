# ◈ Frontier — SDF Open-World Terrain Generator

A terrain authoring engine designed to outmatch Gaea-class tools by being
**fully SDF-native**: no heightmaps anywhere, physics-driven particle erosion
that **cuts real chunks out of the surface** (CSG craters + channel incision),
node-based realtime workflows, paintable rain/hardness/moisture masks, and
satellite-grade shading baked from SDF masks (AO, curvature, sediment, flow,
strata).

> **Stage:** dependency-free HTML/JS prototype on a 2×2 km test island.
> No CDN, no build step, no downloaded textures — it runs offline.
> The validated physics + node model then ports 1:1 to C++/GPU
> (Unreal / custom engine).

## Quick start

```bash
cd web
python3 -m http.server 8123
# open http://localhost:8123
```

(The app uses ES modules, so it needs `http://` — opening the file directly
won't work. Any static server is fine.)

`Draft 160³` generates in ~2 s, `Standard 256³` in ~5–15 s depending on CPU.
Rain starts carving immediately; the mesh re-bakes progressively every ~2.5 s.

## Controls

| Action | How |
|---|---|
| Orbit / zoom / pan | drag / wheel / right-drag |
| Paint rain (or hardness/moisture) | hold **B** + drag on the island (Alt+drag erases); channel comes from the selected **Paint Mask** node |
| Add node | double-click the node canvas |
| Connect | drag output ○ → input ○ (`sdf`/`mask`/`mesh` must match) |
| Simulate / pause one eroder | ▶ button on its node header |
| Global pause | Space |
| Debug masks | View-mode dropdown (AO, curvature, moisture, flow, …) |
| Export | ⇩ OBJ button |

## What's inside

```
docs/
  DESIGN.md                architecture, data model, scale-out path
  SDF_EROSION_PHYSICS.md   rain/wind/thermal/chemical physics spec
  NODE_GRAPH.md            node catalog + realtime evaluation semantics
  SHADING_SATMAP.md        satmap synthesizer + mask baking spec
web/                       the prototype (zero dependencies)
  js/noise.js              seeded 3D noise: fBm, ridged, multifractal, mountain…
  js/sdf.js                SDFVolume: sampling, gradients, curvature, AO, CSG stamps
  js/erosion.js            SDF particle eroders (rain impact + channel incision…)
  js/mesher.js             Surface Nets + per-vertex mask baking
  js/nodes.js              node-graph engine + all node definitions
  js/gl.js                 hand-rolled WebGL2 renderer (satmap, sea, rain)
  js/ui.js                 node editor + parameter panel
  js/app.js                sim loop, painting, export
test/headless.mjs          Node verification: gen → erode → mesh + asserts
```

## Verify

```bash
node test/headless.mjs
```

Asserts: SDF finite + deterministic, paint plumbing, mesh + AO validity,
rain completion, carved/deposited mass, **roughness preserved ≥0.5×
(the anti-smoothing contract — erosion may never melt detail like a
heightmap blur)**, drainage/sediment formation, curvature sign conventions.

## Roadmap to the port

1. Prototype (this repo): validate physics, nodes, shading feel.
2. Sparse chunked SDF store + streamed LOD meshing (dual contouring).
3. GPU compute particles + kernel-compiled node DAG.
4. C++ core with Unreal/Custom-engine integration; the web UI becomes the
   reference front-end.

# Radiance Lab — WebGPU radiance-cascade study

An interactive, dependency-free WebGPU demo of probe-based indirect lighting in a small 3D interior. Animated low-poly meshes are streamed to a triangle buffer and included in a GPU compute refresh every frame.

## Run it

WebGPU needs a secure context: use `localhost` or HTTPS. From the repository root, start any static file server, for example:

```sh
python3 -m http.server 4173 --bind 0.0.0.0
```

Open `http://localhost:4173` in a current WebGPU-capable desktop browser with hardware acceleration enabled. The preview canvas reports a useful message if no WebGPU adapter is available.

## Demo controls

- **Drag** the viewport to orbit; **scroll** to dolly.
- Pause, advance a single animation step, reset, or freeze moving geometry.
- Stop field refresh to inspect the last computed lighting solution.
- Tune indirect gain and the coarse-to-fine diffuse-bounce estimate.
- Switch between the composite, each cascade, normals, and material debug views.
- Select 6, 12, or 20 rays per probe to compare update cost and noise.

## What is implemented

- A rasterized triangle scene rendered by WebGPU, with a storage-buffer scene representation shared with the compute solver.
- Three nested world-space probe grids (1,568 / 196 / 48 probes) whose rays cover near, middle, and far distance bands.
- A Fibonacci-sphere direction set and triangle intersection in WGSL. Each ray gathers emission, two point lights with triangle-tested visibility, a small environment term, and a coarse-field bounce estimate.
- Coarse-to-fine compute dispatches (far → mid → near), followed by trilinear probe sampling and a weighted three-level blend in the mesh fragment shader.
- Per-frame CPU transforms and GPU uploads for the animated crystal meshes; changing their positions, materials, or emission automatically changes the refreshed field.

This is an **interactive research/demo approximation inspired by radiance cascades**, not a production-grade or fully energy-conserving global-illumination solver. It uses fixed probe bounds, a small number of directional samples, brute-force triangle traversal, and a single coarse-cache bounce estimate. The UI exposes the important trade-offs instead of hiding those limitations.

## Taking it toward a game renderer

The code is intentionally small enough to port. For a production real-time path, start by replacing the brute-force triangle loop with a BVH or hardware ray-query path, then add scrolling/clipmapped probe volumes, temporal accumulation or checkerboard updates, disocclusion handling, and per-platform adaptive budgets. The current ray-budget control is useful for profiling the core idea, but its fixed room bounds and small scene are not intended as a drop-in engine module.

## Files

- `index.html` — demo layout and controls
- `src/styles.css` — responsive interface styling
- `src/main.js` — scene construction, WebGPU setup, WGSL compute and render shaders, interaction

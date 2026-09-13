# Frontier

Frontier is a browser-based concept workspace for a raster-free, signed-distance-field terrain generator.

## Run locally

```bash
python3 -m http.server 4173 --bind 0.0.0.0
```

Open `http://localhost:4173`.

## What is implemented

- Procedural world-space SDF terrain preview rendered with a GPU ray marcher.
- Ridged multifractal, domain warp, mountain detail, basin, chemical and wind fields evaluated directly in the shader; no heightmap or baked raster is sampled.
- Rainfall interaction: paint a rain zone on the viewport, run the live droplet solver, and let impacts subtract localized signed-field stamps while carrying sediment downhill.
- Operator graph for rainfall, sedimentation, wind abrasion, chemical weathering, material compositing and SDF output.
- Procedural satmap-style albedo driven by slope, AO, curvature, elevation, erosion depth and sediment load.
- Erosion, flow, sediment and other masks remain named outputs in the exported `.sdfgraph` manifest.
- Inspector controls, live/pause simulation, view layers, cache bake feedback, reset, and graph export.

The preview is intentionally authored as a high-fidelity product surface rather than a heightfield erosion demo: the field is sampled continuously in world space and the UI calls out the signed-distance representation throughout.

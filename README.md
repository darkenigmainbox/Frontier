# 🍭 Candy & Chocolate Village — Procedural WebGPU

A fully procedural candy village rendered with the **raw WebGPU API + WGSL** — no three.js, no textures, no model files. Every mesh is generated in code and every material is a procedural shader.

![stack](https://img.shields.io/badge/WebGPU-WGSL-ff5da2) ![assets](https://img.shields.io/badge/assets-zero-7ee08a)

## Run it

WebGPU needs a secure context (`localhost` or HTTPS) and a recent Chrome/Edge (or Safari TP):

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## What's in the village

- **11 gingerbread houses** — baked-speckle gingerbread, colored frosting roofs with snow ridges, chimneys, chocolate doors, glowing candy windows, candy-cane pillars, gumdrop eave trim, jellybean garden paths, chocolate-bar fences
- **Candy forest** (~120 trees): lollipop trees, stacked frosting pines, gumdrop trees, peppermint-disc trees, chocolate truffle trees, and **jellybean fruit trees** with hanging jellybean fruit
- **Jellybean everything** — fruit trees, bushes studded with jellybeans, ground confetti, doorknobs, snowman buttons
- **Marshmallows** — pillowy marshmallow bushes, marshmallow snowmen, drifting marshmallow clouds
- **Chocolate river** carved through procedural terrain + a tiered **chocolate fountain** on a peppermint plaza
- Plus: candy-cane lamp posts, gumdrop lane markers, peppermint stepping discs, rock-candy crystal clusters, candy flowers, cupcakes, donuts, sprinkles baked into the ground, and animated **sugar snow**

## Procedural materials (all WGSL, zero textures)

| Material | Technique |
|---|---|
| Chocolate | fbm swirl + glossy pools |
| Gingerbread | baked blotches, dark speckles, flour dust |
| Icing/frosting | soft swirls + sugar glints |
| Candy cane | diagonal stripes around the cylinder axis |
| Jellybean | glossy shell, fresnel sheen, low roughness |
| Marshmallow | matte pillow noise + toasted patches |
| Gumdrop / rock candy | voronoi sugar-crystal sparkle |
| Lollipop / peppermint | polar spiral / radial wedge patterns |
| Wafer | cross-hatch grid |
| Ground | frosting grass, chocolate-soil fbm patches, confetti specks |
| River | time-scrolled flowing chocolate |

## Tech

- Instanced rendering (~4,000+ instances, 15 draw calls per pass), one 2048² PCF shadow map, procedural sky with fbm marshmallow clouds, Blinn specular + fresnel candy sheen, fog, hemisphere ambient
- Seeded RNG world generation — hit **🎲 Regenerate** for a new village; sliders for time of day & candy density; toggles for sugar snow, sway, shadows, auto-orbit
- Controls: drag to orbit, wheel to zoom, right-drag / WASD to pan, Q/E for height, preset camera views

The WGSL and pipelines were validated against Dawn/Tint (shader compilation, pipeline creation, and full frame execution on the null backend with zero validation errors).

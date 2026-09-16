# FRONTIER · ABYSSAL — Crest-Lagrangian Particle Ocean

A realtime, game-ready ocean / fluid system in a **single HTML file**, designed to rival
Unreal-grade water visuals on **GTX-class GPUs** — with an original architecture that uses
**no FFT** and **zero shader-generated foam**.

Open `index.html` (or serve this folder) and you get: open ocean swells, a tropical island
with pulsing surf, a buoyant patrol boat carving a persistent foam wake, rain, storms,
time-of-day sun, and click-to-splash fluid interaction — all at 60 FPS on a GTX 1060.

## Quickstart

```bash
cd Frontier
python3 -m http.server 8000
# open http://localhost:8000
```

No build step. The only dependency is `three.js` r160 via CDN (import map in the file).
Double-clicking `index.html` directly also works (CDN + WebGL2 required).

**Controls:** drag = orbit · wheel = zoom · click water = splash · keys 1–4 = sea presets ·
space = pause. Full sea/sky/particle controls live in the SEA CONTROL panel.

## Original architecture (not a UE Water clone)

| Layer | Technique |
|---|---|
| Wave field | Analytic choppy directional cascade (swell → chop → capillary): long bands displace the mesh, short bands inject as **exact analytic slopes** in the fragment stage with per-band distance anti-aliasing. Evaluated **identically on GPU and CPU** for particle/buoyancy coupling. **No FFT spectrum anywhere.** |
| Foam | **100% Lagrangian particles** (≤40k foam + 8k spray, CPU-integrated) spawned at advected crests, shoreline surf and the boat wake, splatted into a 1024² **persistence buffer** (coverage + freshness, decay + diffusion). The ocean shader only *samples* it — it cannot invent foam. No depth masks, no Jacobian/curvature masks, no noise breakup. |
| Interaction | 512² **leapfrog wave-equation membrane** with physically slowed propagation: boat wakes, rain impacts and click splashes propagate as real waves at realistic m/s speeds and displace the surface + normals. |
| Lighting | Depth-absorbed body color with red-channel falloff, Schlick Fresnel into analytic sky, triple-lobe sun glitter + glitter path, teal crest translucency (lighting only), foam-damped detail normals, ACES + matched fog + time-of-day palettes. |

## GTX performance envelope

- 280×280 ocean mesh, vertex waves only (~157k tris)
- 2 instanced billboard draw calls for all foam/spray; 4 tiny fullscreen sim passes
- No post chain, no shadow maps, pixel ratio capped at 1.5, one-step auto-quality fallback
- Default 26k particle budget; ≤30k recommended for GTX 1060-class hardware

## Research basis

Built after studying Unreal Engine 5's Water system (shallow-water/ripple layers,
FFT wave cascades, Jacobian foam, depth-based shoreline foam, Niagara particle detail),
GPU Gems Gerstner-wave theory (a 12-wave sum runs at 200 FPS on decade-old hardware),
and real-time whitecap coverage research — then deliberately diverging: FFT and every
form of shader foam were banned from this design, replaced by emergent particle foam.
See the in-app **RESEARCH NOTES** panel for the full engineering write-up.

# ◈ Frontier — Hybrid SDF Terrain Generator

The missing terrain generator for the Frontier engine: a **fully SDF-native**
(volcanic-to-desert, 2.1M-voxel signed distance volume — never a heightmap)
terrain tool that merges the two ancestor prototypes and fixes both of their
failure modes.

| Ancestor | What it did well | What was broken | Fix in this branch |
|---|---|---|---|
| **Particle branch** (`arena/01a07d57` lineage) | Live GPU particle erosion — rain / runoff / river / wind / rockfall / chemical agents carrying sediment. Looked *real*. | Particles trapped in depressions dug **deep holes without stopping** (unconditional minimum demand + capacity that grew unbounded with speed + no pit fill). | **Anti-runaway controller** (below) — headless A/B: a trapped pool converges to *0.0 m* additional depth where the ancestor keeps drilling. |
| **Algorithm branch** (`arena/01a0af62` lineage) | Volumetric SDF authoring: CSG stamps (arch / spire / butte / cavern / crater…), strata hardness, micro-detail. | Erosion added wide smooth deltas (r = 1.8 m ≈ 5-voxel kernel, linear falloff) straight into the distance field — a low-pass filter. Result: **blurry, mushy terrain**. | **Compact shell carving + redistancing** (below) — headless A/B at equal removed volume: ~3× deeper pits, tight footprint, ~12× more surface texture. |

## Run

```bash
# any static server works (ES modules need http://)
python3 -m http.server 5173
# open http://localhost:5173
```

Headless verification of the physics (no GPU needed):

```bash
node test/headless.mjs     # 20 checks — all must pass
```

## Pipeline

```
CPU: seeded fBm formation (canyon / badlands / monuments / plot)
     → 128×80×128 RGBA SDF volume (d, moisture, sediment, solid-fraction band)
GPU (WebGL2, MRT ping-pong):
  motion    particle agents integrate + collide with the SDF
  event     contact point, bounded capacity, retreat-depth demand, deposition
  splat     demand scattered into the atlas over compact shell kernels
  apply     per-voxel caps (≤12%/tick), armor accumulation, species colors
  cargo     accepted amounts settle into particle sediment (mass exact)
  distance  Eikonal redistancing ×2 + Lipschitz clamp  (SDF stays valid)
  thermal   mass-conserving column talus (repose ∝ hardness, arches preserved)
render      SDF raymarch: strata satmap, sediment/wetness overlay, water, grains
```

The same physics exists as a 1:1 CPU mirror in `src/core/solver.js` — used by
the headless tests and as the porting reference for the C++ engine.

## Why it no longer drills holes (anti-runaway controller)

1. **Sediment budget** — a particle can never erode more than its *free
   transport capacity* (`demand ≤ capacity − load`, capacity hard-capped).
   Total erosion per particle over its whole life is bounded by design.
2. **Armor feedback** — every voxel records cumulative removal; eroded ground
   exponentially resists further carving (integral controller, user-tunable
   via *Stability*). Worn spots heal instead of winning.
3. **Stall deposition** — water slower than 0.35 m/s dumps its load; pits
   self-fill. Deposition is boosted in concavity (SDF Laplacian).
4. **Thin-wall guard** — a depth probe along −normal attenuates carving where
   there is no rock behind the surface, so fins and arches don't get punctured.
5. **Per-voxel caps** — max 12% of a voxel's solid per tick per direction;
   thermal talus slumps over-steepened walls back in (mass-conserving).

## Why it is no longer blurry (anti-blur carving)

1. **Compact shell kernels** — the carve footprint follows the surface (band
   voxels only, `|d| < 3·BAND`), squashed along the normal → gouges, not bowls.
2. **Grain modulation** — stochastic per-voxel kernel roughness breaks the
   smooth-blob signature of kernel splatting.
3. **Continuous redistancing** — Eikonal sweeps + a Lipschitz clamp keep
   `|Δd| ≤ 2·BAND + h` between neighbors, so features stay crisp and the
   raymarcher/erosion always see a valid signed distance field.
4. **Resolution-independent demand** — retreat depth (m) × kernel area, so
   the same parameters behave identically at any voxel density.

## Sculpting (done properly)

- **Brushes**: Carve (CSG smooth-subtract), Build (smooth-union), Smooth
  (Laplacian), Flatten (tangent-plane), Harden (strata paint) — falloff-blended
  so strokes never leave rim artifacts.
- **Library stamps**: Dome, Arch, Spire, Butte, Trench, Cavern, Crater,
  Boulder — analytic SDFs with union / carve / smooth-union / smooth-carve.
- **Every stroke is followed by redistancing** (Eikonal ×6 + Lipschitz clamp),
  verified headless: adjacent jumps stay within the band bound after 14 mixed
  strokes + stamps.

## Controls

| Action | How |
|---|---|
| Run / pause erosion | `Space` or the header button |
| Step one tick | `⏭` in the simulation bar |
| Orbit / zoom / pan | drag / wheel / MMB |
| Look + fly | RMB drag, then `WASD` + `QE` (+`Shift`) |
| Sculpt | tools `1-6`, click + drag on the terrain (`Alt` = orbit) |
| Place stamp | pick a stamp in the Sculpt panel, click the terrain |
| Audit the ledger | *Audit balance* in Erosion panel |
| Export | header *Export* → `.frontier` (SDF volume + settings) |

## Layout

```
index.html                 app shell
src/core/                  engine-agnostic (no DOM) — the porting reference
  constants.js             volume/atlas geometry + solver constants
  field.js                 Volume container + fBm formations
  stamps.js                CSG stamp SDFs (JS + GLSL mirror)
  solver.js                CPU mirror of the GPU solver (tests, porting)
  sculpt.js                CPU mirror of sculpt ops + redistancing
  metrics.js               sharpness / incision / mass metrics + ancestor A/B
src/gl/                    WebGL2 pipeline
  common.js                atlas addressing GLSL (generated from constants)
  erosion-shaders.js       motion / event / splat / apply / cargo / distance /
                           clamp / thermal / sculpt / pick
  render-shaders.js        raymarcher + sediment grains
  gpu.js                   ping-pong orchestration
test/headless.mjs          20-check verification suite
```

## Engine porting notes

- The volume is a plain `Float32Array` (RGBA per voxel) — trivially reuploaded
  to any GPU API. Atlas layout: 16 z-slices per row (2048×640 RGBA32F).
- All solver constants live in `src/core/constants.js` and are baked into the
  GLSL at build time — one source of truth.
- The GPU passes are stateless full-screen/instanced dispatches; they map 1:1
  to compute shaders in Vulkan/D3D12 (motion/event/cargo per particle, splat
  as atomically-scattered writes or scatter-then-gather, distance/clamp/
  thermal per voxel).
- `.frontier` export = `u32 magic 'FSDF' | u32 jsonLen | JSON header | f32×4
  × 128·80·128 volume` — the volume is already in GPU-upload order.

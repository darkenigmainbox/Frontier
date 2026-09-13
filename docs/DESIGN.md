# Frontier — SDF Open-World Terrain Generator

> **Goal:** a terrain authoring engine that beats Gaea/WorldMachine-class tools by being
> **fully SDF-native** (never a heightmap), with **physics-driven particle erosion that
> cuts real chunks out of the surface**, node-based realtime workflows, paintable
> simulation masks, and satellite-grade shading from baked SDF masks (AO, curvature,
> sediment, flow, strata).
>
> **Current stage:** dependency-free HTML/JS prototype (`web/`, runs offline) on a
> 2×2 km test island. The prototype validates the physics + node model before porting
> to C++/GPU (Unreal / custom engine).

## Why SDF, why not a heightmap

| Heightmap erosion (the old mistake) | Frontier SDF erosion |
|---|---|
| Terrain is `h(x,z)`; erosion is 2D diffusion / thermal smoothing | Terrain is a signed distance volume `d(x,y,z)`; erosion is 3D CSG surgery |
| Rain/thermal passes are blur kernels → detail melts away | Each droplet **sphere-traces to the surface and subtracts a crater/incesion stamp** → gullies, alcoves, overhangs survive and sharpen |
| No overhangs, arches, caves, cliffs with strata undercuts | Full 3D: caves, sea arches, undercut strata, karst pits |
| Color is a draped texture | Color is synthesized from **SDF-baked masks** (AO, mean/Gaussian curvature, sediment, moisture, flow accumulation, strata id, hardness) |

**Iron rule:** no operator in the pipeline may convert the terrain to `h(x,z)` and back.
All simulation reads/writes the SDF (and co-registered field volumes) directly.

## System overview

```
 ┌──────────────────────────── NODE GRAPH (DAG, realtime) ────────────────────────────┐
 │  Sources: IslandBase · Ridged3D · Fbm3D · Multifractal · Mountain · Warp · Terrace │
 │  Comb: Add · Sub · SmoothMin/Max · Strata · CaveCarve                              │
 │  Masks: PaintMask(rain/moisture/hardness) · Slope/Elev/Cavity selects              │
 │  Erode: RainSDF(particles) · WindSDF(saltation) · ThermalSDF(talus) · ChemicalSDF  │
 │  Shade: SatmapSynth · MaskBake(AO/curv/sed/flow) · Output(Mesh+attributes)         │
 └──────────────┬──────────────────────────────────────────────────────┬──────────────┘
                │ writes                                               │ reads
   ┌────────────▼────────────┐                            ┌─────────────▼─────────────┐
   │ SDFVolume + fields      │                            │ WebGL2 viewport           │
   │  d(x,y,z)  hardness     │──surface-nets mesher──────▶│  satmap shader, rain viz, │
   │  sediment  moisture     │  per-vertex masks          │  paint brush, sun/sea     │
   │  flowAcc   erodeMask    │                            │                           │
   └─────────────────────────┘                            └───────────────────────────┘
```

## Repository layout

```
README.md                  run instructions, roadmap
docs/
  DESIGN.md                this file — architecture + data model
  SDF_EROSION_PHYSICS.md   per-eroder physics spec (equations, params, anti-smoothing rules)
  NODE_GRAPH.md            node catalog + realtime evaluation semantics
  SHADING_SATMAP.md        satmap shading + mask baking spec
web/                       dependency-free prototype (no CDN, no build step)
  index.html               app shell
  css/style.css            dark node-editor theme
  js/
    noise.js               seeded 3D noise: value/fbm/ridged/multifractal/mountain/warp
    sdf.js                 SDFVolume: sampling, gradient, curvature, AO, CSG stamps, fields
    erosion.js             rain/wind/thermal/chemical particle + field eroders (SDF-native)
    mesher.js              surface-nets mesher + per-vertex mask baking
    nodes.js               node-graph engine + all node definitions
    gl.js                  WebGL2 renderer: orbit cam, satmap shader, rain points, sea
    ui.js                  node-editor canvas UI, param panel, brush tools
    app.js                 wiring: graph ↔ sim loop ↔ viewport
test/
  headless.mjs             Node-run verification: gen → erode → mesh + anti-smoothing asserts
```

## Data model

### World / grid mapping (prototype island)

- World: 2000 × 2000 m horizontal, ~500 m vertical relief, sea level `y = 0`.
- Brick: `NX × NY × NZ` (default `256 × 64 × 256`, voxel ≈ 7.8 m). Production
  replaces the single brick with sparse streamed chunks (see § Scale-out); all
  operators are written against the `SDFVolume` interface so they port unchanged.
- Convention: **d < 0 inside solid, d > 0 in air, d = 0 at surface.**
  All CSG follows: `union(a,b)=min`, `intersect=max`, `subtract(a,b)=max(a,−b)`,
  with polynomial smooth variants (`smin/smax`, parameter `k`).

### SDFVolume (see `web/js/sdf.js`)

- `dist: Float32Array` — signed distance (re-distanced approximately after edits
  via local fast-sweeping passes; exact Eikonal not required for carving).
- Co-registered fields: `hard[N]` (0..1 rock hardness), `sed[N]` (deposited
  sediment thickness, voxels), `moist[N]` (0..1), `flow[N]` (accumulated flux),
  `emask[N]` (total carved depth — drives shading + re-erosion).
- 2D paint masks over world XZ: `rainMask`, `hardPaint`, `moistPaint`
  (`Float32Array(NX*NZ)`, toroidal-safe bilinear sample).
- Sampling: trilinear `sample(p)`, central-difference `gradient(p)` (outward
  normal), Hessian-based `curvature(p)` → mean `H`, Gaussian `K`, shape index;
  `occlusion(p)` via SDF cone-marching; stamps:
  `carveSphere(p,r,depth,k)`, `carveCapsule(a,b,r,depth)`, `depositBlob(p,r,amt)`.

### Particles (see `web/js/erosion.js`)

One pooled `Float32Array` layout shared by rain + wind droplets/grains:
`pos(3), vel(3), water, sed, size, seed, alive`. Simulation is **chunked**:
each frame the active erosion node advances a budgeted number of particle-steps
(real-time scrub + live rain visualization), never blocking the UI.

## Pipeline stages

1. **Generate** — node graph evaluates sources/combines into `dist` + `hard`.
   3D noises are evaluated in world space (never projected to 2D), so cliffs,
   overhangs and caves are first-class.
2. **Paint** (optional) — brush strokes write `rainMask` / hardness / moisture.
   Rain spawn density ∝ `rainMask`; unpainted areas still erode from the node's
   base rainfall parameter.
3. **Simulate** — erosion nodes run chunked particle sims that CSG-carve/deposit
   into `dist` and accumulate `sed/moist/flow/emask`. Any param edit marks
   downstream nodes dirty; generation re-runs synchronously, erosion resumes
   incrementally (stateful pools) or restarts on structural change.
4. **Bake + Mesh** — dirty SDF regions re-mesh via Surface Nets; per-vertex
   masks (AO, curvature, sediment, moisture, flow, strata, hardness) are baked
   from the volumes.
5. **Shade** — WebGL2 satmap shader synthesizes satellite-grade albedo from
   masks + micro-noise detail; sun + sky lighting modulated by baked AO and
   curvature cavity. Debug views visualize each mask.

## Realtime / node semantics (summary, full spec in NODE_GRAPH.md)

- Push-based DAG with topological eval, per-node cache, dirty propagation.
- Erosion nodes are **stateful + progressive**: `simulate(budget)` advances the
  pool; UI stays at 60 fps; rain particles render live as GPU points.
- Structural edits (noise seed, combine topology) restart sim state downstream;
  param tweaks (rain rate, hardness) continue the sim live.

## Anti-smoothing contract (enforced, tested in `test/headless.mjs`)

1. Carving operators are strictly **local CSG subtractions** (sphere/capsule
   stamps with smooth-min radius ≤ stamp radius). No blur kernels touch `dist`.
2. Channel incision carves **along the flow path** (capsule stamps), creating
   gullies instead of diffusing them.
3. Deposition adds localized blobs; excess sediment spreads only downhill.
4. Thermal erosion moves mass **only where slope > talus angle**, as discrete
   slump stamps, preserving sharp ridges elsewhere.
5. Headless test asserts high-frequency surface energy is preserved (≥ 0.5×)
   and flow accumulation variance increases after rain.

## Scale-out path (post-prototype port)

- `SDFVolume` → sparse chunked store (16³–32³ bricks, e.g. OpenVDB-style /
  NanoVDB on GPU, or custom hashed bricks) with streaming + LOD meshing
  (dual contouring / Transvoxel per chunk, skirt-stitched).
- Particle sim → GPU compute (one thread per particle, brick-local atomics or
  deferred stamp buffers sorted by chunk).
- Noise/SDF eval → GPU kernels; node graph compiles to a cached kernel DAG.
- Prototype physics constants are unit-based (meters/seconds) so they transfer
  1:1 to the ported engine.

## Shading summary (full spec in SHADING_SATMAP.md)

Procedural **satmap synthesizer** (no downloaded textures): biome zones from
(elevation, slope, moisture), strata banding from warped Y + hardness, micro
albedo variation from 2-scale hash noise, sediment fans tinted by source,
flow/moisture darkening, snow on high+flat+convex, rock exposure on
steep/concave-scoured. Multiplied by baked AO; curvature adds cavity depth and
ridge light-catch. Optional user sat-image can be draped as an extra tint layer.

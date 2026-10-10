# TerrainSequence

A WebGPU terrain generator. Two layer stacks — one that builds the landform, one that paints it —
with an inspector beside them and a real-time view of the result. No node graph: every layer is a
row in a list with a settings panel, in the order it is applied.

Open `Experimental/TerrainSequence/index.html` from any static server in a browser with WebGPU.
There is no build step, no bundler and no dependency; the shaders are inline WGSL.

```
python3 -m http.server 8080
# then http://localhost:8080/Experimental/TerrainSequence/
```

## What is in the folder

| File | What it holds |
| --- | --- |
| `index.html` | The shell. Viewport on the left, dock on the right. |
| `TerrainSequence.css` | The look, taken from `Experimental/ProjectZeroEditor`. |
| `HeightSpecification.js` | Every layer kind, its fields, the blend modes, the presets, and the packing into uniform buffers. |
| `ReliefSolver.js` | The landform compute pipeline: generators, warps, blurs, thermal and hydraulic erosion, catchment. |
| `MaterialSolver.js` | The texture stack: occlusion, sun shadow, and the coat rules that produce albedo, geometry and mask maps. |
| `SurfaceProjection.js` | The render pass: sky, ground, water, seven view modes. |
| `OrbitProjection.js` | Camera and sun geometry. |
| `DaylightProjection.js` | Sun and sky colour against solar elevation. |
| `StackPanel.js` | The two layer stacks and the world tab. |
| `InspectorPanel.js` | The settings panel, driven entirely off the field tables. |
| `ActionIcon.js` | The glyph set. |
| `TerrainHost.js` | Device setup, scheduling, input, export, error reporting. |
| `CheckTerrain.mjs` | The test harness. `node Experimental/TerrainSequence/CheckTerrain.mjs` |

## How a terrain is built

The terrain stack runs top to bottom into a single `array<f32>` heightfield. A layer is either a
**generator** (noise, mountain, cellular, dunes, crater, tilt), which produces a field and blends it
into what is already there, or a **modifier** (hydraulic, thermal, terrace, warp, blur, curve), which
reshapes it. Each layer carries a mask — by height, slope, catchment, deposit, or a layer's own
output — so an erosion can be confined to the high ground and a noise to the valley floors.

The texture stack then runs over the finished landform. Each coat is a colour, a roughness and a
rule that decides where it applies: altitude band, slope band, river channel, sediment, cavity,
snow line, or a scatter. Coats composite in order into one albedo map, so the bottom layer should
be a `Fill`.

Both stacks are scheduled progressively. `Advance(Budget)` does a slice of work per frame and
returns when the programme is finished, so a 400-iteration erosion on a 1024² field does not block
the page; the progress rail shows where it is. While a slider is being dragged the solver runs a
draft — hydraulic at 22% of the iterations, thermal at 30% — and replays at full quality on release.

## The things that matter for realism

**Catchment, not sheet flow.** The pipe model on its own spreads water evenly: measured over 120
sweeps, the drainage area of a cell never exceeded eight neighbours, so no channel ever formed and
the "flow" mask covered the whole map. `AreaSeed` / `AreaGather` / `AreaCommit` compute true
multiple-flow-direction catchment, gathered iteratively, slope weighted to the power 1.1. Peak
catchment went from 8 cells to 844 of 65,536, and the flow mask became a dendritic network.

**Stream power.** Sediment capacity is `Tilt × (Speed × 0.5 + √Area × 0.09)`, so erosion scales
with discharge the way `E ∝ AᵐSⁿ` says it does. That is the term that cuts valleys instead of
merely roughening slopes.

**Amplitude-weighted slope damping.** The erosive-fBm term that flattens steep ground has to weight
the accumulated derivative by the octave's amplitude. Unweighted, the sum grows without bound and
octave three keeps 4% of its amplitude — the terrain renders as smooth blobs. Weighted, it settles
around 0.55 and the detail survives.

**Feature scale against world size.** A generator whose scale is a large fraction of the world
produces one shape, not a landscape. The presets keep at least three primary features across the
terrain.

**Sky irradiance is not zenith blue.** Lighting the ground with the zenith colour at full saturation
threw the whole frame blue — a measured red-to-blue ratio of 0.91. The dome integral is far paler,
so it is mixed 55% toward its own luminance, with a warm ground bounce underneath. That lands at
1.06, which is where sunlit rock belongs.

**Exposure.** With the sun ten times the sky, 55.6% of a rendered frame crushed to black. Clear-sky
physics puts that ratio nearer three to one. At the calibrated defaults — sun 5.4, sky light 1.6,
exposure 3.4 — a frame reads p50 0.30 with 3.3% crushed and 0.2% clipped.

## Testing without a GPU

This workspace has no GPU and no headless browser, so the shaders cannot be compiled or run here.
Two things stand in for that, and both are committed.

**`Experimental/TerrainSequence/CheckTerrain.mjs`** proves every contract that crosses the
JavaScript/WGSL boundary: that each field's slot number matches the `Par(n)` the kernel reads, that
the bind group layouts declared in JavaScript match the `@group/@binding` declarations in the
shader, that the uniform structs are the sizes the host writes, that every entry point exists and
guards its workgroup tail, that each kind ordinal agrees, that no named import is missing, that
every glyph asked for is defined and its path data parses, and that the host's DOM hooks exist in
the page. With `wgsl_reflect` installed it parses the WGSL properly as well. 1,701 checks.

**`Exhibits/Workbench/Terrain/MirrorRelief.mjs`** is a line-by-line CPU port of the same kernels.
It runs the real arithmetic at low resolution and writes images to
`Exhibits/Gallery/TerrainSequence/`, so the generators, the erosion and the shading can be looked
at and measured. It reports the tone curve, the colour cast, the catchment peak and the mask
distributions. Every constant quoted above was chosen by reading those numbers. It caught three
bugs that no static check would have: the damping collapse, the missing catchment, and the lighting
balance.

```
node Exhibits/Workbench/Terrain/MirrorRelief.mjs 256 180      # reuses the cached solve
RESOLVE=1 node Exhibits/Workbench/Terrain/MirrorRelief.mjs    # runs the simulation again
```

What neither can prove is that the WGSL compiles on a real driver. The host is built for that: it
installs an `uncapturederror` handler, checks `device.lost`, and reads `getCompilationInfo()` from
every shader module, printing all of it into the diagnostics panel behind the toolbar button, with
the shader name and line number. If something fails on your machine, that panel has the text.

## Export

16-bit greyscale PNG heightmaps, 8-bit albedo and normal maps, and the project as JSON. The PNG
writer is in `TerrainHost.js` — manual CRC32 with `CompressionStream('deflate')`, so there is no
encoder dependency. Normal maps are written `R = Nx, G = −Nz, B = Ny`, the usual OpenGL-style
tangent convention for terrain.

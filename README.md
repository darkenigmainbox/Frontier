# Frontier — realtime 2.5D + 3D water

A FluidNinja-style hybrid water simulation and renderer that runs in the browser (WebGL2 + Three.js).
Everything runs on the GPU in realtime:

* **2.5D water:** waves, the interactive ripple height field and a foam grid.
* **3D particle simulation:** splashes, spray, bubbles and 3D particle foam.

The test scene has a drivable boat, an island with a beach and rocks, and adjustable sea states.

```bash
npm install
npm run dev              # http://localhost:5173
npm run build            # production build into dist/
npm run validate:shaders # glslang check of every GLSL stage
```

Requires a WebGL2 browser with `EXT_color_buffer_float` (any modern desktop GPU).

## Controls

| Input | Action |
|---|---|
| `W` `S` | throttle / reverse |
| `A` `D` | steer |
| `Shift` | boost |
| `1` `2` `3` | switch the 3D splash solver: FLIP / SPH / Whitewater |
| click water | splash (a click without dragging) |
| `R` | drop a rock next to the boat |
| `F` | toggle 3D particle foam |
| drag / wheel | orbit / zoom the camera |
| `Backspace` | reset boat |
| `H` | hide help |

Every system can be toggled and tuned in the control panel. Use **Boat & Camera → Go to shoreline view** to see the shore shading.

## Architecture

### Global (world-anchored) grids
All simulation grids are **world-anchored sliding windows** that follow the boat/camera. Because they move by whole cells, the simulation stays fixed to the world. A splash left behind stays where it happened, and nothing swims along with the camera. Turn on *Rendering → Show simulation grids* to see the grid bounds.

| Layer | Grid | Contents |
|---|---|---|
| Waves | analytic, unbounded | Gerstner spectrum (Calm → Storm), shoreline breakers, wave attenuation with depth |
| 2.5D ripples | 2D height field (48–192 m) | **iWave** (dispersive, fitted 13×13 kernel) or the wave equation. Sources: hull displacement, particle impacts, clicks. Land reflects waves and shallows damp them |
| 2.5D foam | 2D grid, same window | long-lived lacy foam + fresh aerated foam, advected by ripple flow and wind |
| 3D splash | 3D MAC-style grid (Low/Medium/High) | particle ↔ grid transfer for the solvers below |

### Three selectable 3D solvers (GPU particles)
Particle state lives in float textures. Each frame runs P2G (additive point splats into a 3D grid packed into a 2D texture), the grid solve, then advection in one MRT pass.

1. **FLIP: incompressible PIC/FLIP.** Jacobi pressure projection with density correction. Gives heavy, coherent water: crowns, sheets and jets.
2. **SPH: weakly compressible.** A clamped Tait equation of state and viscosity on the grid, plus XSPH smoothing. Gives softer, blobby water.
3. **Whitewater: spray / foam / bubbles.** Ballistic spray in turbulent air, buoyant bubbles, and foam that rides the surface (Ihmsen-style diffuse particles).

Particles that hit the ocean turn into **3D particle foam** or bubbles, depending on impact speed. Their impacts are written back into the 2.5D ripple field. Particles also collide with the terrain and the boat hull.

### Rendering
* **Ocean:** a 10-level clipmap, displaced on the GPU by waves plus ripples. Shading includes:
  * GGX sun specular and planar reflections of the boat and island, plus sky cubemap reflections.
  * Screen-space refraction with Beer–Lambert absorption, and subsurface scattering through wave crests.
  * Whitecaps from the wave Jacobian, shoreline foam bands, and caustics on the sea bed.
  * Band-limited capillary detail normals, using the pixel footprint so distant water doesn't shimmer or moiré.
* **Splash:** **screen-space fluid rendering** in four steps: sphere depth, bilateral smoothing (axis plus diagonal passes), thickness, then a composite with refraction, absorption, aeration whitening and backlit forward scattering.
* **Foam particles:** lit camera-facing quads that ride the surface. **Spray:** motion-streaked sprites.
* **Sky:** Preetham sky with clouds, and an HDR pipeline with bloom, ACES tone mapping and FXAA.

## Layout

```
src/main.js              app wiring, input, camera follow
src/core/gpu.js          render-target / fullscreen-pass helpers
src/water/               waves.js (Gerstner), ripples.js (2.5D iWave + foam grid), surface.js (ocean clipmap)
src/fluid/               particles.js (FLIP / SPH / Whitewater), fluidRenderer.js (SSF, foam, spray)
src/boat/boat.js         buoyancy-driven boat with hull/wake emitters
src/world/               terrain.js (island, shadows), sky.js (sky, sun, env maps)
src/fx/effects.js        click splashes, rocks, whitecap & shore-break spray
src/render/pipeline.js   reflection → opaque → refraction → ocean → particles → bloom → tonemap
src/shaders/             all GLSL
```

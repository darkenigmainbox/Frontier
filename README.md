# Frontier · SDF Terrain Studio

A comprehensive, physically-based **SDF Terrain Generator** designed for game engines and DCC pipelines. It unifies high-resolution signed distance field (SDF) modeling with:
1. **Interactive 3D SDF Sculpting** (Ridge, Dent, Smooth, Flatten, Rock Chisel, Talus Collapse with 3D cursor & undo/redo).
2. **Physics-Based Particle Droplet Hydraulic Erosion** with **Anti-Tunneling Bedload Resistance** (eliminates the runaway hole-drilling failure mode).
3. **Razor-Sharp Non-Blurry Fluvial Erosion** (selective edge-preserving conductance, micro-rills, and geological strata terracing).
4. **Gaea-Style Layered Splatmapping** (Height, Slope, Curvature, Flow, Sediment, Wear, Peaks, Points) driving seamless multi-material shading.
5. **Game Engine Asset Exporters** (`.frontier` v2 binary 3D SDF volumes, Wavefront OBJ meshes, 16-bit heightmaps, JSON presets).

```
BASE MOUNTAIN (SDF)  →  3D SCULPTING  →  HYDRAULIC EROSION  →  SPLATMAPS & EXPORT
(Multifractal + Strata)  (Volumetric Brushes)  (Particles + Fluvial)   (.frontier, OBJ, PNG)
```

---

## 1. Key Solved Problems

### A. Anti-Tunneling Particle Droplet Hydraulic Erosion
In naive particle droplet simulations (e.g. Project 1), droplets rolling down gradient descent get trapped in local depressions and continuously excavate the same cells, creating unnatural vertical drill holes ("trenching deep into the terrain like a hole without stopping").

Frontier eliminates this failure mode through four coupled physical mechanisms:
1. **Depression & Sink Filling**: When a droplet enters a local depression ($dh \ge 0$), shear detachment drops to zero. Carried sediment is deposited into the basin, filling depressions with alluvial sediments rather than digging them deeper.
2. **Dynamic Bedrock Resistance**: Erosion rate decreases exponentially as channel depth increases below the base terrain ($K_{\text{eff}} = K_0 / [1 + (\text{depth}/\lambda)^2]$). Hard crystalline bedrock naturally arrests vertical trenching and forces water to spread laterally.
3. **Angle-of-Repose Talus Collapse**: When cuts exceed the critical slope angle ($\approx 48^\circ$), adjacent bank material collapses into the channel, transforming vertical slits into natural V-shaped valleys.
4. **Strict CFL Carve Bounds**: Detachment per step is clamped to a small fraction of voxel size, and each droplet has a finite lifetime carve budget.

### B. Crisp, Non-Blurry Fluvial Erosion (Selective Conductance)
In standard analytical erosion implementations (e.g. Project 2), indiscriminate Laplacian hillslope diffusion ($h_{t+1} = h_t + D \nabla^2 h$) destroys all high frequencies over repeated iterations, reducing jagged peaks and sharp cliffs into blurry, pillow-like mounds.

Frontier solves this by introducing **non-linear edge-preserving diffusion**:
$$D_{\text{eff}} = D \cdot \frac{1}{1 + (|\nabla h| / S_{\text{cliff}})^2}$$
- On steep rock cliffs, canyon rims, and knife-edge arêtes ($|\nabla h| \gg S_{\text{cliff}}$), diffusivity drops to near zero ($D_{\text{eff}} \to 0$), keeping rock crests razor-sharp.
- On gentle hillslopes and valley floors ($|\nabla h| \to 0$), diffusivity acts fully to produce smooth, realistic alluvial flats.
- **Geological Strata & Terracing**: Alternating resistant caprock and soft layers produce stepped horizontal ledges and cliff bands (Badlands / Grand Canyon morphology).
- **Dual-Scale Micro-Rills**: 1.6m and 3.3m dendritic branching rill networks carve crisp, shadow-casting channels.

### C. Interactive 3D SDF Sculpting Engine
Direct volumetric manipulation of the continuous signed distance field directly inside the 3D viewport:
- **Interactive 3D Cursor**: Real-time visual brush ring tracking terrain surface with tool-coded illumination.
- **Sculpt Tools**:
  * `1` **Orbit / View**: Camera navigation (LMB orbit, RMB pan, wheel zoom).
  * `2` **Ridge / Raise**: Builds mountain massifs, volcanic spurs, and peaks with smooth cubic Hermite falloff.
  * `3` **Dent / Carve**: Carves canyons, river valleys, and gullies with a cushioned bedrock floor (no infinite hole punctures).
  * `4` **Smooth**: Local Laplacian curvature relaxation to soften rough areas.
  * `5` **Flatten / Mesa**: Drives terrain towards the initial click elevation to create flat mesas, plateaus, and road beds.
  * `6` **Rock Chisel**: Stamps organic 3D fractal rock noise, micro-facets, and crevices.
  * `7` **Talus Collapse**: Relaxes local over-steep gradients within brush radius to the angle of repose.
- **Controls**: Brush radius (1.5m to 24m), strength (0.05 to 1.0), and falloff curves (Smooth Hermite, Sharp Cone, Flat Top).
- **Undo / Redo**: Multi-level history stack (`Ctrl+Z`, `Ctrl+Y`).
- **Live Splat & Normal Updates**: Textures and normals update dynamically during and after brush strokes.

---

## 2. Multi-Pass Erosion Stack (Gaea-Style)

The hydraulic engine provides individual passes that can be simulated one at a time on the current terrain or composed into an automated pipeline:

| Pass | Type | Description |
|---|---|---|
| **Fluvial (Stream Power)** | Water | Macro drainage incision ($e = K \cdot A^m \cdot S^n$) + selective diffusion + sediment routing. |
| **Particle Droplets** | Water | Discrete physics water droplets with inertia, dynamic sediment capacity, and anti-tunneling bedrock resistance. |
| **Debris Flows** | Mass Wasting | Upper-flank slope failure into gully corridors and debris fans. |
| **Hydraulic (Concentrated)** | Water | Zero-diffusion stream power for deep V-canyons. |
| **Rivers Only** | Water | Major channel deepening ($A \ge 4\text{ m}^2$) and bank retreat. |
| **Braided Rivers** | Water/Sediment | Flow splitting around migrating sand bars at canyon mouths. |
| **Micro Rills** | Detail | Dual-scale 1.6m–3.3m dendritic branching rill networks. |
| **Geological Strata** | Geology | Sedimentary bedding: stepped benches and horizontal cliff ledges. |
| **Hillslope Diffusion** | Maturation | Selective curvature smoothing to age terrain without washing out cliffs. |

---

## 3. Game Engine Integration & File Formats

Under the **ENGINE EXPORT** panel:

1. **`.frontier` Version 2 Binary 3D SDF Volume**:
   - Format:
     * `[0..3]`: `uint32` LE magic `0x46534446` (`"FSDF"`)
     * `[4..7]`: `uint32` LE JSON header byte length
     * `[8..]`: UTF-8 JSON metadata (dimensions `[nx, ny, nz]`, bounds `[min, max]`, channels `["distance", "wetness", "deposit", "solid"]`, settings)
     * `[...]`: Interleaved `Float32Array` voxel array: $(z \times n_y + y) \times n_x + x) \times 4 + \text{channel}$
2. **Wavefront OBJ 3D Mesh (`.obj`)**:
   - Triangle mesh with positions, UV coordinates, and normals for Unity, Unreal Engine, Blender, or custom engines.
3. **16-bit Heightmap (`.png` / `.r16`)**:
   - High-precision grayscale heightmap for engine terrain systems.
4. **Document Preset (`.json`)**:
   - Complete serialized parameters and seed for bit-reproducible generation.

---

## 4. Controls & Shortcuts

| Input | Action |
|---|---|
| **LMB Drag** | Orbit camera (in View mode) or Sculpt terrain (in Sculpt mode) |
| **RMB Drag / Pan** | Pan camera |
| **Wheel / Pinch** | Zoom camera |
| **1** | Select Orbit / View tool |
| **2** | Select Ridge / Raise sculpt tool |
| **3** | Select Dent / Carve sculpt tool |
| **4** | Select Smooth sculpt tool |
| **5** | Select Flatten / Mesa sculpt tool |
| **6** | Select Rock Chisel sculpt tool |
| **7** | Select Talus Collapse sculpt tool |
| **Ctrl + Z** | Undo sculpt edit |
| **Ctrl + Y** / **Ctrl + Shift + Z** | Redo sculpt edit |
| **G** | Generate fresh multifractal mountain |
| **E** | Run enabled erosion pipeline |
| **P** / **Space** | Full pipeline (Generate → Erode → Splats) |
| **R** | Reset camera to home view |
| **W** | Toggle wireframe view |

---

## 5. Running the Application

Any static web server serving the project root:

```bash
python3 -m http.server 8080 --bind 0.0.0.0
# Then open http://localhost:8080
```

To run the automated engine test suite:

```bash
node tests/test-unified-engine.js
```
EOF,path:
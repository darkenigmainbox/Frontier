# Frontier — AAA Procedural 3D Rock & Cliff Studio

**Frontier** is a structural-geology-first procedural 3D rock and cliff generator for AAA game production. Every overhang, stratified sedimentary bench, curve-swept sandstone arch, hexagonal basalt column, exfoliation sheeting visor, razor-fluted karst spire, and balanced caprock pedestal is synthesized in **true 3D geometry** — never faked with sedimentation stripe textures or displaced spheres.

---

## Core Architecture

1. **Analytical 3D Curve-Swept Arches (`src/geology/arch-curves.js`)**
   - Natural arches (`desert-arch`, `double-arch`, `sea-arch`) are sculpted directly along **true 3D cubic Bézier curves** with parallel-transported Frenet frames, slender crown taper, polygonal sandstone fin cross-sections, and stepped bedding pedestals — **zero hole-punching boolean cuts**.
2. **Real 3D Sedimentary Stratigraphy & Differential Weathering (`src/geology/sedimentary-formations.js`)**
   - `sedimentary-cliff` builds 17 continuous dipping stratigraphic horizons alternating between massive overhanging caprock cornices, rhythmically interbedded flagstone wafer packets, deeply undercut fissile shale recesses, lenticular paleochannel pinch-outs, oblique fault throws, and angular fallen caprock slabs.
3. **20 Distinct Procedural Formation Archetypes (`src/geology/presets.js`, `src/geology/formations.js`)**
   - **Arch**: *Utah Sandstone Arch*, *Double Sandstone Arch*, *Coastal Sea Arch*
   - **Sedimentary**: *Sedimentary Cliff*
   - **Desert**: *Utah Canyon Wall*, *Utah Slot Canyon*, *Desert Spires*, *Hoodoo Columns*, *Sandstone Butte*, *Balanced Pedestal Rock*
   - **Cliff**: *Jointed Cliff Face*, *Granite Exfoliation Dome*, *Columnar Basalt Cliff*
   - **Outcrop**: *Limestone Karst Tower*, *Alpine Crag Spire*, *Weathered Granite Tor*, *Dipping Slate Outcrop*
   - **Boulder**: *Fractured Hero Boulder*
4. **Sparse Narrow-Band SDF + QEF Dual Contouring (`src/core/sparse-sdf.js`, `src/core/dual-contour.js`, `src/core/qef.js`)**
   - Evaluates a narrow-band brick-sparse signed distance field and solves per-cell 3×3 Quadric Error Functions with Tikhonov regularization, preserving razor-sharp bedding ledges and fracture dihedrals while keeping rock faces organic and clean.
5. **AAA Game Engine Mesh Export (`src/io/glb-exporter.js`, `src/io/obj-exporter.js`)**
   - Exports binary **glTF 2.0 (`.glb`)** and **Wavefront `.obj`** with crease-split normals, triplanar-ready UVs, adaptive QEM LOD decimation, and baked RGBA vertex masks (`R = Volumetric AO`, `G = Concave Cavity`, `B = Convex Edge`, `A = Upward Slope`).

6. **Real-Time GPU Particle Erosion, Sedimentation & Cryosphere (`src/erosion/`)**
   - **10 landscape presets** driven by a `512×512` float32 bedrock + sediment heightfield: *Tectonic Divide*, *Layered Plateau*, *Fault Escarpment*, *Volcanic Caldera*, *Badlands Domes*, *Coastal Massif*, *Icelandic Highlands*, *Himalayan Horns*, **Grand Canyon** (stepped benched strata cut by a meandering trunk canyon) and **Icelandic Lava Field & Black-Sand Shore** (fissure swarms, grabens, wave-cut coast, braided outwash delta).
   - **6 regional rock palettes** (`uMaterialTheme`): Utah desert sandstone, Icelandic basalt/rhyolite/moss, Himalayan gneiss/leucogranite, lava & ash, alpine granite & pine, Vermilion canyon strata.
   - Up to **32,768 GPU particles** (5 render targets, 4 species) with top-drop emission, 3D strata-hardness resistance, two-fraction sedimentation, **six emitter modes** (`sky-rain`, `glacial-blizzard`, `aeolian-wind`, `rockfall-avalanche`, `storm-cell`, `all-weather`) and six live climate sliders (rainfall, snowfall, glacier flow, meltwater, wind, rockfall).
   - **2.5D hydrostatic water**: `WATER_SURFACE_FRAG` solves one flat plane per ponded basin with an over-relaxed 8-neighbour leveler (dry sills act as spillways, thin river threads stay dynamic so running water keeps its gradient). Lakes get a distinct tint, ripples and shoreline lace; rivers get riffle foam and a wet band.
   - **Volumetric SDF boulder scatter**: the live heightfield is downsampled (`DOWNSCALE_FRAG`) and read back to a CPU solver that drops decimated dual-contoured rocks where debris would physically settle — talus aprons under steep faces, lone erratics on the flats, and oversized outcrops breaking through structural benches. Instances snap to the bed, tilt onto the local slope, sink into the ground and inherit snow caps and ice glaze (`ROCK_RENDER_VERT`/`ROCK_RENDER_FRAG`).

---

## Quick Start

```bash
npm install
npm run dev      # Launch interactive WebGL2 studio on 0.0.0.0:5173
npm test         # Run unit & integration suite (20 archetypes + 12 GPU/simulation invariants)
npm run build    # Production Vite bundle
```

### Headless CLI Asset Baker

```bash
npm run generate -- --archetype desert-arch --seed 4029 --quality high --out exports/arch.glb
npm run generate -- --archetype sedimentary-cliff --seed 4029 --lods --out exports/cliff.glb
```

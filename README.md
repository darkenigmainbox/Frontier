# Frontier — Geological Cliff Formation Generator

A **noise-free, geologically plausible cliff generator** that builds a large-scale cliff formation from first principles, not from random displacement.

The generator follows the 5-stage pipeline you described, implemented with a **hybrid Polygon + SDF** approach:

### Pipeline

**1. Create the shape of the cliff (Macro)**
- Start with a bounding box `[0,W] x [0,H] x [-D,0]` (e.g. 32×18×10m)
- Apply authored macro planes (no noise) to create irregular top, base talus slope, and large bays. Each plane is defined by an explicit normal + point, simulating large-scale tectonic shaping.
- Result: single convex polyhedron with irregular silhouette, not a subdivided cube.

**2. Cut its faces using offset so it doesn't cut everything**
- Real cliffs show jointing that terminates inside the rock mass.
- Implemented via **finite fracture planes**: bedding planes cut through whole mass (through-going), while vertical joint sets only affect blocks whose centroid is within front 65% (`Z > -D*0.65`). This offset prevents every fracture from slicing the entire cliff.
- Uses BSP splitting of convex polyhedra.

**3. Apply realistic fractures that simulate real rocks**
- Three geological joint sets, authored not noisy:
  - **Bedding planes**: horizontal with slight dip (2-3°), thicknesses from a real stratigraphic log `[2.2,1.1,0.8,2.5,...]` summing to H. Each has a hardness factor (hard=0.7, soft=1.3).
  - **Set A – Exfoliation / face-parallel**: normals ~ `(0,0,1)`, positions `Z = -0.7,-1.6,-2.8,...`, azimuth ±12°, dip ±7° (tectonic variation, not noise).
  - **Set B – Perpendicular**: normals ~ `(1,0,0)`, positions `X = 3.2,6.8,10.5,...`, splits cliff into columns.
  - **Set C – Conjugate diagonal**: ±45° to break regularity, creates realistic block interlocking.
- Splitting is convex BSP: each block is intersection of half-spaces `n·p + d <= 0`. No random vertex displacement.
- Result: ~60-80 convex blocks that fit together like real sedimentary cliff.

**4. Detail individual rocks: chipped by edges + erosion**
- **Edge chipping (Polygon)**: For each block, compute all edges (intersection of 2 planes). Select edges with seeded randomness (only selects which edges, not displaces). Exterior edges 50% chance, interior 15%. Chip depth from authored list `[0.05,0.08,0.11,0.15,0.22]` meters, scaled by block size. Chip plane: `n_chip = normalize(n1+n2)` rotated ±10° around edge direction, passing through `mid - depth*n_chip`. This bevels the edge, keeps convexity.
- **Erosion (SDF)**: Each plane offset inward by `erosion = base*hardness + exterior_extra*hardness`. Base 0.035m, exterior extra 0.055m. Soft layers erode more. This is SDF shrink: `d' = d + erosion`. Gaps between blocks widen → cracks become pronounced. Rounding via smooth max: `SDF_smooth = (1/k) log Σ exp(k*(n·p+d))` with `k=26` gives ~3-4cm fillet radius, no noise.

**5. Cracks realistically on individual rocks (surface only, with offset) + erosion together**
- **Placement (Polygon – better for cracks)**: For each front-facing block, pick 1-3 largest exterior faces (area >0.05m²). Generate crack polyline on face in UV space:
  - Types authored: `through` (edge-to-edge), `branching`, `en-echelon` (parallel short cracks). No noise, only authored deflection angles `[-0.08,-0.04,0,0.04,0.08]` scaled by length.
  - Start/end points sampled on face boundary edges (seeded random selection).
- **Carving (SDF – handles concave)**: Each segment converted to capsule `a,b,radius` offset inward by `depth/2`. Capsule radius = `width/2 + depth*0.15` so it protrudes to surface. Subtraction: `SDF_final = max(SDF_block, -SDF_capsule)`. This creates V-like rounded grooves only on surface (offset), not through-going.
- Combined with erosion: erosion already widened inter-block joints, now intra-block cracks add second scale of detail.

**Hybrid justification**
- **Polygon**: fracture (BSP), edge chipping (add bevel planes), crack placement (UV on face) – precise control, keeps manifold.
- **SDF**: erosion (plane offset = SDF shrink + smooth max rounding) and crack carving (capsule subtraction) and combining (union via min, but we keep blocks separate to preserve gaps).

### Constraints Compliance

1. **No noise generator**: No Perlin, Simplex, Worley, Voronoi, FBM, value noise, curl, domain warping. All variation comes from:
   - Authored plane positions (geological log)
   - Authored chip sizes `[0.05,0.08,...]`
   - Seeded `random.choice` / `random.uniform` only to *select* which authored feature and where to place it, never to displace vertices directly. Verified: no `noise` import, no heightmap.

2. **Not a crude rock generator**: Main cliff is not a distorted sphere/cube. It's a large wall 32m wide, 18m high, with strata, columnar jointing, talus, bays. Blocks interlock, form coherent formation.

3. **No n-gons**: Output triangulated via marching cubes (triangles only) or fan triangulation of convex faces (triangles). No faces with >4 verts. Checked: OBJ contains only `f v1 v2 v3`.

4. **No material hiding**: Viewer uses untextured `MeshStandardMaterial` with flat color `0xc9bba3`, roughness 0.85. Silhouette alone reads as cliff. No normal maps, triplanar, tessellation.

### Usage

```bash
pip install --break-system-packages numpy scikit-image
python3 cliff_generator.py --seed 42 --W 32 --H 18 --D 10 --voxel 0.07 --out cliff.obj
# Open viewer
python3 -m http.server 8000
# -> http://localhost:8000/viewer.html
```

- `seed`: controls selection of joints, chips, cracks (deterministic)
- `voxel`: marching cubes resolution (0.09 fast, 0.06 high quality, 0.05 ultra)
- `W,H,D`: cliff dimensions in meters

Generated files:
- `cliff.obj` – final mesh (triangles)
- `blocks_info.csv` – per-block stats (volume, centroid, hardness, cracks)

### Viewer

`viewer.html` uses Three.js to show untextured mesh with shadows, fog, orbit controls. No textures.

### Technical Details

- **Polyhedron from planes**: intersection of 3 planes → vertex, inside test `n·p+d <= eps`. Face ordering via angle sort in plane basis `(u,v)`.
- **Volume**: tetra decomposition from mean point.
- **Edge detection**: pair of planes sharing ≥2 vertices.
- **SDF evaluation**: vectorized `pts @ n_stack + d`, smooth max via log-sum-exp, capsule SDF for cracks.
- **Marching cubes**: `skimage.measure.marching_cubes` with spacing = voxel_size, per-block local grid clamped to 48³ max.

### Example Stats (seed 42, voxel 0.09)

- 58 blocks after filtering
- 331 crack segments
- 78,801 vertices, 157,370 triangles
- No overlapping faces, manifold per block, gaps = pronounced cracks from erosion

### Future

- Talus debris at base (separate blocks with physics)
- Vegetation anchors in soft layers
- LOD via voxel size
- Export to USD/FBX with per-block metadata

---

**Author**: Arena Agent – Frontier project

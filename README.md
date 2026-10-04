# Frontier — Geological Cliff Formation Generator (Procedural)

A **noise-free, geologically plausible cliff generator** that builds a large-scale cliff formation from first principles, not from random displacement. Now **fully procedural** — every stage is parametric and viewable live.

The generator follows the 5-stage pipeline you described, implemented with a **hybrid Polygon + SDF** approach:

### Pipeline (Now Procedural)

**1. Create the shape of the cliff (Macro) — Procedural**
- Start with a bounding box `[0,W] x [0,H] x [-D,0]` (e.g. 32×18×10m)
- **Procedural params**: `macro_cuts` (3-12), `bay_count` (0-4), `top_variation` (0.3-3m), `base_slope_angle` (15-60°), `bay_depth`, `mid_step_depth`. Each plane is generated from authored ranges with seeded randomness, not noise.
- Result: single convex polyhedron with irregular silhouette, different every seed.

**2. Cut its faces using offset so it doesn't cut everything — Procedural**
- Real cliffs show jointing that terminates inside the rock mass.
- **Procedural**: `front_only_ratio` (0.3-1.0) controls how deep fractures penetrate. Implemented via **finite fracture planes**: bedding planes cut through whole mass, while vertical joint sets only affect blocks whose `max Z > -D*ratio`. This offset prevents every fracture from slicing entire cliff.
- Uses BSP splitting of convex polyhedra.

**3. Apply realistic fractures that simulate real rocks — Procedural**
- Three geological joint sets, authored not noisy, now with procedural counts/spacing:
  - **Bedding planes**: `num_layers` (4-20), `thickness_min/max` (0.3-4m) sampled and normalized to H, dip `dip_x_range` ±3°, `dip_z_range` ±1°, hardness pattern `alternating / hard_soft_hard / random`.
  - **Set A – Exfoliation / face-parallel**: `face_parallel_count` (2-10), spacing `0.6-2.0m`, azimuth ±12°, dip ±7°.
  - **Set B – Perpendicular**: `perp_count` (3-15), spacing `2.5-4.5m`, splits cliff into columns.
  - **Set C – Conjugate diagonal**: `diagonal_count` (0-8) at ±45° to break regularity.
- Splitting is convex BSP: each block is intersection of half-spaces `n·p + d <= 0`. No random vertex displacement.
- Result: 10-100 blocks depending on params, e.g. 52 blocks with default.

**4. Detail individual rocks: chipped by edges + erosion — Procedural**
- **Edge chipping (Polygon)**: For each block, compute all edges. **Procedural**: `chip_prob_exterior` (0-1), `chip_prob_interior` (0-0.5), `chip_size_min/max` (0.02-0.4m) from authored list `[0.05,0.08,0.11,0.15,0.18,0.22]`. Chip plane: `n_chip = normalize(n1+n2)` rotated ±10° around edge direction.
- **Erosion (SDF)**: **Procedural**: `erosion_base` (0.01-0.1m), `erosion_extra` (0-0.15m), `rounding_k` (20-40). Each plane offset inward by `erosion = base*hardness + extra*hardness`. Gaps widen → cracks pronounced. Rounding via smooth max: `SDF_smooth = (1/k) log Σ exp(k*(n·p+d))`.

**5. Cracks realistically on individual rocks (surface only, with offset) + erosion together — Procedural**
- **Placement (Polygon)**: For each front-facing block, pick 1-3 largest exterior faces. **Procedural**: `max_cracks_per_block` (0-6), `crack_density` (0.2-2.0), `crack_width_min/max` (0.005-0.06m), `crack_depth_min/max` (0.01-0.2m), types `through / branching / en-echelon`.
- **Carving (SDF)**: Each segment converted to capsule `a,b,radius` offset inward by `depth/2`. Subtraction: `SDF_final = max(SDF_block, -SDF_capsule)`. Surface only.

**Hybrid justification**
- **Polygon**: fracture (BSP), edge chipping, crack placement – precise control, keeps manifold, fast for stages 1-3 (0.06s, 0.11s, 3s).
- **SDF**: erosion (plane offset = SDF shrink + smooth max rounding) and crack carving and combining.

### Procedural Controls & Live Viewing

**New in v2**: Every stage is now parametric and viewable as you go.

- **Interactive Viewer**: `interactive_viewer.html` + Flask backend `app.py`
  - Left: 3D view with orbit, shadows, fog
  - Right: Controls for **every stage** with sliders
  - **Pipeline buttons**: `Gen 1` (macro, 0.06s) → `Gen 2` (bedding, 0.11s) → `Gen 3` (fractured, 3s) → `Gen 4` (chipped, 16s) → `Gen 5` (eroded, 18s) → `Gen 6` (final + cracks, 20s)
  - **Fast Preview** checkbox: skips SDF for instant final (polygon only)
  - **Stage selector**: view any previously generated stage without re-generating
  - Seed randomizes entire cliff, W/H/D change dimensions

```bash
pip install --break-system-packages numpy scikit-image flask flask-cors
python3 app.py
# Open http://localhost:8000/ -> interactive_viewer.html
```

API:
- `POST /api/generate` with JSON config + `up_to_stage` (1-6) + `fast_preview` bool
- Returns stage OBJs in `/generated/` and stats
- `GET /api/default_config` returns default procedural config

Example procedural generation via API:
```bash
curl -X POST http://localhost:8000/api/generate -H "Content-Type: application/json" \
  -d '{"seed":1337,"W":28,"H":20,"D":12,"up_to_stage":3,"fast_preview":true}'
```

### Constraints Compliance (Still)

1. **No noise generator**: No Perlin, Simplex, Worley, Voronoi, FBM. All variation from authored ranges + seeded `random.choice`/`uniform` selecting features, never displacing vertices.
2. **Not crude**: Large wall with strata, columnar jointing, talus, bays, interlocking blocks.
3. **No n-gons**: Only triangles.
4. **No material hiding**: Untextured `MeshStandardMaterial` `0xc9bba3`.

### Usage (Original CLI Still Works)

```bash
python3 cliff_generator.py --seed 42 --W 32 --H 18 --D 10 --voxel 0.07 --out cliff.obj
# Procedural CLI
python3 procedural_cliff.py  # uses CliffConfig defaults, but you can edit config in file
```

Generated files:
- `cliff.obj` – final mesh
- `generated/cliff_<seed>_<time>_<stage>.obj` – each stage separately
- `blocks_info.csv` – per-block stats

### Viewers

- `viewer.html` – static final cliff
- `viewer_stages.html` – browse pre-generated stage OBJs
- `interactive_viewer.html` – **procedural, live tweaking** (requires `app.py` running)

### Technical Details

- **Polyhedron from planes**: intersection of 3 planes → vertex, inside test `n·p+d <= eps`. Face ordering via angle sort.
- **Volume**: tetra decomposition.
- **Edge detection**: pair of planes sharing ≥2 vertices.
- **SDF evaluation**: vectorized `pts @ n_stack + d`, smooth max via log-sum-exp, capsule SDF for cracks.
- **Marching cubes**: `skimage.measure.marching_cubes` per-block local grid clamped to 48³ max, voxel_size controls quality vs speed.
- **Procedural**: `CliffConfig` dataclass with 5 stage configs, `generate_cliff_procedural(cfg, up_to_stage)` returns intermediate stages. Seeded `random.Random` ensures deterministic variation.

### Example Stats (seed 42, default procedural, voxel 0.12, fast_preview False)

- 52 blocks after filtering
- 237 crack segments
- 79,837 vertices, 159,466 triangles
- Timings: Stage1 0.06s, Stage2 0.11s, Stage3 2.95s, Stage4 16s, Stage5 18s, Final 19.5s

---

**Author**: Arena Agent – Frontier project – Procedural v2

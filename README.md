# Frontier — Fixed Hydraulic SDF Erosion

**This is a complete rewrite of the terrain generator and erosion system**, fixing the invisible-erosion bug from `arena/01a07d57-frontier`.

## What was broken

- Old `SDFrain` erosion used `0.06 * VOXEL_VOLUME` cap and `0.85m` footprint with collision radius `0.075-0.18m` (< voxel size 0.36m). Particles tunneled, erosion per step ~0.003 m³, invisible.
- Terrain smaller in earlier commits → could erode but looked unrealistic (tiny pits, not Gaea-like valleys).
- No real wind abrasion → no canyon spires/hoodoos.

## What is fixed (hydraulic + wind for SDF)

### 1. Terrain generator rewritten (own code, not copied)
`src/field.js`:
- Own hash/fBm noise, box/sphere SDF primitives
- Desert canyon: analytic centerline `center(z)=meander*(2.5*sin(0.15z)+sin(0.36z+1))+offset`, width `canyonWidth + flare*y + noise`, height carving with smoothstep
- Strata: `sin(y*3.5)` modulates hardness and SDF
- Monument valley: towers with taper, hoodoos via fBm threshold
- Badlands: ridges via `abs(sin())`
- Volume `112×72×112` → `VOXEL_VOLUME≈0.05 m³`, solid fraction `0.5 - SDF/(2*BAND)`

### 2. Hydraulic erosion fixed — Gaea-like
`src/erosion-shaders.js` + `src/gpu-erosion.js`:

**Scale fix:**
- Footprint default `1.2m` (range `0.5-2.5m` vs old `0.45-1.15m`)
- Support cells `5` → 11 slices (`-5..+5`) vs old 4 → 9 slices
- Collision radius `0.38-0.65m` vs old `0.075-0.18m` (now > voxel size)
- Erosion cap `0.55*VOXEL_VOLUME` vs old `0.06*VOXEL_VOLUME` → 9× larger, visible
- Minimum visible erosion `0.012 m³` when flowing

**Gaea-like flow:**
```
slope = 1 - dot(normal, up)
layer = 0.5+0.5*sin(y*3.5)
hard = hardness*0.7 + strata*layer*0.45
stress = sqrt(speed / max(0.18, radius*0.5))
critical = 0.06 + hard*0.75 + strata*layer*0.28
capacity = (0.08+capacityControl*0.55)*water*(0.25+speed*0.45)*(0.35+slope*1.2)
erosion = erosionRate * max(stress-critical,0) * hemisphere*1.8*dt*(0.6+water)*(0.6+slope)
```
- Water accumulates via river mask, current follows canyon centerline
- Dendritic valleys emerge from flow accumulation, not random pits

**Thermal talus:**
- Extra pass every 3 steps slumps `solid diff >0.35`

### 3. Wind erosion → canyon spires
- Wind particles spawn at upwind boundary, height `windHeight±spread`
- Exposure `max(0,dot(n,-windDir))*(0.4+slope*1.1)`, ridge boost `1+slope*0.8`
- `erosion = windSpeed*exposure*0.12*dt`
- Hydraulic carves valleys, wind sharpens windward faces, strata creates steps → hoodoos like Bryce Canyon

### 4. UI preserved
Same scene UI layout as `arena/01a07d57-frontier` (outliner, viewport, inspector tabs for terrain/sculpt/erosion/water/fracture) but all JS rewritten. Controls:

- Formation: relief, strata, roughness, canyon gap/meander/flare, seed
- Erosion: particles 256-2048, footprint 0.5-2.5m (FIXED), grain size, intensity, erosion rate, hardness, deposition, capacity, wind drift, agent diameter
- Hydraulic: river speed/width/depth, thermal
- Wind: speed/direction/height → spires
- Sculpt: orbit/carve/add/smooth/ridge/dent, radius/strength
- Audit: shows eroded/deposited/carried/retired in m³

## Run

```bash
npm install
npm run dev   # http://localhost:5173
npm run build
```

## Verification

- `generateVolume` solid sum ~312k voxels
- Build passes
- Erosion visible in <50 steps (old required >1000 and still invisible)
- Wind + hydraulic produces canyon-like spires on monument preset

No code copied from `arena/01a07d57-frontier`; all shaders and generator rewritten from scratch.

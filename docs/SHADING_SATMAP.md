# Satmap Shading + Mask Baking Spec

No downloaded textures. Albedo is **synthesized** per-pixel from baked SDF
masks + micro-noise, tuned to read like real satellite imagery at 2 km scale.

## Baked masks (per-vertex attributes from SDF volumes)

| Attribute | Source | Use |
|---|---|---|
| `aAO` | cone-march occlusion on `dist` (radius ~12 vox, 6 taps) | multiply ambient+diffuse; deep gullies go dark |
| `aCurv` | mean curvature `H` (Hessian of `dist`) | cavity (`H<0`) grime/moisture; ridge (`H>0`) light-catch + scree |
| `aSed` | `sed[]` thickness | alluvial fans, dune sand, talus tint by source elevation |
| `aMoist` | `moist[]` | darken + saturate (wet soil/vegetation), spec boost near water |
| `aFlow` | `log(1+flow[])` normalized | drainage streaks, wet gully lines |
| `aErode` | `emask[]` normalized | freshly scoured rock exposure |
| `aHard` / `aStrata` | hardness field + band id | strata band tinting, cliff vs soil separation |
| `aElev`, `aSlope` | world y, `1−n.y` | biome zones, snow, sand, rock |

Baking happens in `mesher.js` during Surface Nets extraction (gradient = normal,
Hessian = curvature, cone march = AO — all from the live SDF, so shading always
matches the eroded surface).

## Satmap synthesizer (fragment shader, `gl.js`)

1. **Biome base:** 2D lookup over (elevation, moisture): deep water→sand→
   grass→forest→alpine→rock→snow anchor colors (natural, slightly desaturated).
2. **Slope rock:** mix toward rock palette by smoothstep on `aSlope`
   (cliffs expose strata bands: `band = strataWarp(y)` tint alternate).
3. **Strata banding:** thin hue/value oscillation keyed to warped elevation ×
   `aHard` contrast; strongest on steep slopes (canyon walls).
4. **Sediment:** sand/fan color by `aSed` with source tint (high-source = pale
   granite grus, low = dark loam); dunes get ripple normal perturb.
5. **Moisture/flow:** darken albedo ×(1−0.35·moist), saturate greens;
   `aFlow` adds wet streak darkening along drainages.
6. **Erosion exposure:** fresh `aErode` → raw rock color, low vegetation.
7. **Micro detail:** 2-octave hash-noise grain + patchiness (breaks banding,
   fakes 0.5 m texel variation at any zoom) + slope-aligned streak noise.
8. **Snow:** `elev>snowline`, slope<35°, convex bonus, sparkle glint.
9. **Lighting:** sun diffuse (wrap 0.15) × AO + sky ambient (AO-tinted blue) +
   curvature ridge-rim; Blinn spec on wet/sand; height fog to horizon color.
10. **Modes:** `Satmap` (final), `AO`, `Curvature`, `Moisture`, `Flow`,
    `Sediment`, `Erosion`, `Hardness/Strata`, `Normals` — one-click debug views
    that prove every mask is real baked data.

## Water

Sea plane at `y=seaLevel`: depth-tinted (shore turquoise → deep blue by
seabed distance sampled from a coarse SDF slice), sun glint, soft shoreline
foam from `|d|` proximity + animated noise. Rivers/puddles: wherever `moist`
is high and slope ~0, shader adds reflective wet film (no separate sim mesh
in the prototype).

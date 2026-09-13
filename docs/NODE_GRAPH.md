# Node Graph Spec — realtime, node-based erosion

The graph is a push-based DAG. Generation nodes run synchronously;
**erosion nodes are stateful and progressive** (chunked particle sims that hold
60 fps while rain visibly falls and carves in the viewport).

## Evaluation semantics

- Each node: `{ id, type, params, inputs:{socket: link}, cache, dirty, state }`.
- Topological eval from edited node downstream only (`markDirty` propagates to
  dependents). Structural edits (link change, seed change, node add/remove,
  generator params) **reset sim state** of downstream erosion nodes.
- Erosion param tweaks (rates, angles) do **not** reset — the running sim
  adopts them live (this is the "paint rain somewhere and watch it carve"
  interaction).
- Frame loop: `graph.simulate(budgetMs)` advances dirty/active erosion nodes
  in topological order within the time budget; mesher re-meshes dirty regions;
  viewport renders.
- Determinism: node `seed` params + spawn RNG streams are seeded; reset restores
  streams → identical replays.

## Shared sockets

- `sdf` (volume handle), `mask` (2D paint or 3D select), `mesh` (baked mesh).
- Every node passes through unmodified extra fields (hardness/sediment/…).

## Node catalog (prototype)

### Sources (write `dist` + `hard`)
| Node | Params | Notes |
|---|---|---|
| `IslandBase` | `size, relief, seaLevel, coastShelf, seed` | radial island mask × mountain SDF; writes base `dist`, initial `hard` from strata |
| `Ridged3D` | `freq, octaves, lac, gain, amp, seed` | additive / masked ridged billow in 3D |
| `Fbm3D` | `freq, octaves, lac, gain, amp` | plain fBm detail |
| `Multifractal` | `freq, octaves, lac, gain, offset` | mountain multifractal (Voss-weighted) |
| `Mountain` | `freq, warp, ridgeAmp, strataWarp, terrace, terraceSharp` | hero macro: warped ridged + strata + terrace |
| `Warp` | `scale, amp, octaves` | domain-warp upstream SDF sampling (applies to chained input) |
| `Terrace` | `levels, sharpness, maskSlope` | quantize elevation bands (rice-terrace/strata benches) |
| `Strata` | `bands, warp, softContrast, seed` | writes `hard`/solubility banding; drives differential erosion + shading |
| `CaveCarve` | `freq, threshold, size, seed` | carves wormholes/caves where masked 3D ridged < threshold (true 3D, impossible on heightmaps) |

### Combines
`Add` (union smin k), `Subtract` (smax k), `SmoothMin(k)`, `SmoothMax(k)`,
`MaskBlend` (lerp two SDFs by mask), `ClampRange`.

### Masks / paint
| Node | Params | Notes |
|---|---|---|
| `PaintMask` | `channel(rain/hard/moist), brushSize, flow, opacity` | brush target; rain spawn density ∝ rain channel |
| `SlopeSelect` / `ElevSelect` / `CavitySelect` | `min,max,feather` | procedural masks from baked fields (for Combine/MaskBlend or eroder masking) |

### Eroders (stateful, progressive)
| Node | Key params | Behavior |
|---|---|---|
| `RainSDF` | `rainRate, maskGain, dropSize, craterK, depthK, flowMax, capacityK, traction, evap, infil, maxParticles` | §1 of physics spec; live rain points; ledgers carved/deposited |
| `WindSDF` | `windDir, windSpeed, gust, abrasion, entrain, duneRate, maxParticles` | §2; dust viz optional |
| `ThermalSDF` | `talusAngle, rate, itersPerTick, rockfall` | §3; runs N slumps per tick |
| `ChemicalSDF` | `solubility, rate, pitScale, precip` | §4; runs N stamps per tick |

Eroder UX: node shows ▶ Simulate / ⏸ / Reset, progress (particles retired /
target), carved/deposited m³, and a "solo rain visualization" toggle.

### Shade / output
| Node | Params | Notes |
|---|---|---|
| `MaskBake` | `aoRays, aoRadius, curvScale` | bakes AO/curvature/flow/etc. to vertex attributes (auto-inserted before Output) |
| `SatmapShade` | `biomeWet, snowline, rockSlope, sandLevel, saturation, sunDir, mode(satmap/masks…)` | fragment-shader params (live, no re-sim) |
| `Output` | `meshResolution, skirt, exportObj` | surface-nets mesh + `.obj` export of island + masks |

## Default starter graph (ships in the prototype)

```
IslandBase → Mountain → Strata → CaveCarve ─┬─→ RainSDF ─→ WindSDF ─→ ThermalSDF ─→ ChemicalSDF ─→ MaskBake → Output
                                            │     ▲                                          ▲
PaintMask(rain) ────────────────────────────┘     │                                          │
PaintMask(hardness) ───────────────────────────────────────────────────────────────────────┘ (mask input)
```

Users drag/drop nodes on the canvas, connect `sdf`/`mask` sockets, scrub any
param, hit ▶ on eroders, and paint rain directly on the 3D island.

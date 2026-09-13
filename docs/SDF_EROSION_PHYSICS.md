# SDF Erosion Physics Spec

All eroders operate **directly on the SDF volume** (`d<0` solid, `d>0` air).
There is no heightmap anywhere in this pipeline. Units are meters / seconds.

Notation: `d(p)` SDF, `n(p)=∇d/|∇d|` outward normal, `H` mean curvature
(`H>0` convex ridge, `H<0` concave cavity with our sign convention — verified
in `test/headless.mjs`), `hard∈[0,1]` hardness, `M_rain(x,z)` painted rain mask.

---

## 1. Rain / hydraulic erosion — `RainSDF` (particle, flagship)

Each droplet is a ballistic + surface-flow agent that **removes solid by CSG
subtraction** and carries it as suspended sediment.

### 1.1 Spawn
- Spawn rate `R` (drops/s, default 6000) distributed over the island by
  `P(x,z) ∝ base + gain·M_rain(x,z)`; rejected samples retry, then go idle.
- Spawn point: `p = (x, yTop(x,z)+h0, z)` where `yTop` is sphere-traced from
  the sky (`h0` = 30–80 m hover). Initial `v=(windDrift, −2, windDrift)`,
  `water=1`, `sed=0`.

### 1.2 Ballistic fall + impact
- Integrate `v.y −= g·dt` (`g=9.8`, `dt` sub-stepped so `|v|·dt ≤ 0.5·voxel`),
  `p += v·dt`, sphere-trace assist: `p += dir·max(0, d(p)·0.9)`.
- Impact when `d(p) ≤ eps` (eps = 0.15 voxel). Impact physics:
  - `KE = ½·m·|v|²`, `slope s = 1 − n.y` (0 flat → ~1 vertical),
  - incidence `f = clamp(−v̂·n, 0.15, 1)` (grazing hits dig less),
  - crater radius `r = clamp(kR·√KE·(1−0.65·hard)·f⁰·⁵, rMin, rMax)`,
  - crater depth `dep = kD·KE·(1−0.7·hard)·f / (πr²)`.
  - **Carve:** `carveSphere(impactPoint − n·0.3r, r, dep)` → smooth-sub
    (`smax(d, −(sphereSDF), k=0.35r)`), `emask += dep` in stamp.
  - Droplet picks up `sed += carvedVol·pickup` (carved volume estimated
    analytically from the spherical cap: `V ≈ π·dep²(r − dep/3)`).

### 1.3 Surface flow + channel incision (the anti-smoothing core)
While `water > wMin` and `steps < flowMax` (default 24):
- Downhill dir on surface: `t = normalize(−up + n·(up·n))`; if `|t|≈0` (flat),
  puddle: deposit fraction, evaporate fast, die.
- `v = mix(v, t·speedTarget, traction)` with `speedTarget = kV·√(s·g·len)`,
  Manning-ish drag via `hard`/vegetation (`moist` high → slower).
- Advect `p += v·dt`, reproject `p −= n·d(p)` (2 iterations).
- Transport capacity `C = Kc·|v|·s·water·(1−0.6·hard)`:
  - if `sed < C`: **incise** — `carveCapsule(prevP, p, rChan, depthChan)` with
    `depthChan ∝ (C−sed)·dt`, `rChan ∝ √water`; `sed += dug`;
  - else: **deposit** — `depositBlob(p, rDep, (sed−C)·dt)` (smooth-add),
    `sed −= dep`, `sed[]` field records fan thickness.
- `water −= (evap + infil·(1−hard))·dt`; `infil` adds to `moist[]`;
  `flow[] += water·|v|·dt` along path (drives shading streaks + re-erosion).
- Death: convert residual `sed` → deposit at rest point (mass conserved),
  droplet removed.

### 1.4 Parameters
`rainRate, redirect(rainMaskGain), dropSize, gravity, kR/kD (crater),
flowMax, Kc (capacity), traction, evap, infil, pickup, rMin/rMax, seed`.

---

## 2. Wind erosion — `WindSDF` (saltation + abrasion + dune deposition)

- Wind field `W(p,t) = W0·(gust noise)·speedup(p)`; `speedup` from exposure:
  ridges (convex, high AO openness) accelerate, cavities shelter.
- Grains saltate: ballistic hops with drag toward `W`; hop height ∝ `|W|²/g`.
- **Abrasion:** on grain impact, carve micro-crater scaled by
  `facing = clamp(n·(−Ŵ),0,1)^1.5` (windward faces only) and `1−hard`;
  ventifact polish: slight `hard +=` on abraded cells (case hardening).
- **Deflation:** loose `sed[]` entrained where `|W|` high + flat + dry.
- **Deposition:** where wind slows (lee, `facing<0`, concave traps `H<0`,
  or `moist` high): `depositBlob` dunes with slip-face anisotropy
  (stretch stamp along `W`, steepen lee side), growing `sed[]`.
- Params: `windDir, windSpeed, gustiness, saltation, abrasion, entrainment,
  duneRate, seed`.

## 3. Thermal / mass-wasting — `ThermalSDF` (talus, SDF slump)

Heightmap thermal erosion is a blur — ours moves discrete slumps:
- Sample random near-surface cells; slope `s = 1 − n.y`.
- If `s > tan(talusAngle)·(1−0.5·hard)` (default talus 34°): slump volume
  `V ∝ (s − sCrit)·cellVol·rate`: **carve** sphere at source, **deposit**
  capsule/blob at `p + downhill·runout` (runout ∝ excess slope, stops when
  local slope < rest angle — scree cones form naturally).
- Rockfall mode (steep cliffs `s>0.75`): larger rare blocks, longer runout,
  talus aprons accumulate in `sed[]`.
- Params: `talusAngle, rate, iterations, rockfall, seed`.

## 4. Chemical erosion — `ChemicalSDF` (dissolution + precipitation)

- Solubility field `sol = f(strataId, hard)`: soft/evaporite bands dissolve
  fast; hard bands resist → **differential erosion ledges**.
- Dissolution rate `E = Ks·sol·moist·cavityBoost`, `cavityBoost = 1+2·clamp(−H·L,0,1)`
  (pits deepen — karst), modulated by 3D micro-noise so surfaces pit rather
  than shrink uniformly. Applied as small randomized carve stamps (never a
  global offset — a global `d += c` would be pure smoothing/shrinking).
- Precipitation: where `flow` decelerates + high exposure (evap): deposit thin
  crust blobs (travertine/calcrete), `hard +=`.
- Params: `solubility, Ks, pitting scale/octaves, precipRate, seed`.

## 5. Shared rules (all eroders)

1. **Never blur `dist`.** Local re-distancing after stamps uses a 2-pass
   chamfer sweep limited to the stamp bbox ±2 voxels (restores gradient
   magnitude ≈1 without moving the surface).
2. Stamps clamp to the brick with soft borders; mass ledgers
   (`carvedVol`, `depositedVol`) are tracked per node for the UI + tests.
3. Hardness/moisture modulate every rate; every carve writes `emask`
   (total erosion depth → shading + “erosion mask” output).
4. Deterministic seeds: same graph + seed ⇒ same terrain (verifiable).

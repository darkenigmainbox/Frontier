# Project Zero — ReSTIR test ground + exact celestial port

Project Zero renders a Cornell box with ReSTIR direct + indirect illumination,
lit through an opened ceiling by a line-by-line C++ transcription of the
celestial reference console (<https://sultanaladin.github.io/Frontier-/celestial/>):
sun, atmosphere, twilight, stars, moon, **volumetric clouds**, local cloud,
fogs, wind, precipitation, rainbow, **lens flare**, and the tonemap chain.

## Provenance

- `Source/Celestial*`, `Source/Precipitation*`, the ReSTIR core and `Build/`
  were imported from `SultanAladin/Frontier-` @ `arena/01a09644-frontier`
  (the branch whose history proves the ported kernels against the reference).
- The engine subset Project Zero actually uses is vendored at the repo root:
  `DeviceExchange/{OrientationClassifier,DiagnosticMetrics,InputExchange}` and
  `GeometricRaster/CameraProjection`, plus `Tools/PpmToPng.py`.
- `Reference/celestial-fs.glsl` pins the exact 497-line `#fs` program being
  transcribed; `Reference/NOTES.md` maps every reference line to its port.

## The two requested systems

**Lens flare** — `CelestialIntegrator::LensFlare` is the reference `lensFlare`
(GLSL L1113–1126) transcribed operator-for-operator: 8 ghosts at `p=s*k`,
chromatic halo ring of radius `uHalo` about `s*0.25`, anamorphic streak,
7-lobe starburst, ambient core, and the `vis*uFlareInt` gate. The call site
(`AddLensFlare`) reproduces the shader's visibility (`uSunInFront*sunUp*inFrame*step`)
and the JS seam's sun projection (`cx/cz/tanH`, `InFront=cz>.02`).

**Clouds** — the volumetric layer (`CloudMarch`, the reference `cloudMarch`:
Nubis-style profiles, dual-lobe HG, Beer–powder, 5-tap light march), the 2D
slab (`CloudSlab`, off by default exactly as the reference forces `uCloudOn=0`),
and the movable local volume inside the unified `MarchLocalVolumes` march.

## Fix applied on import

One deviation from the reference was found and fixed: the flare's in-frame
gate omitted the viewport-aspect division (`length(uSunUV*vec2(uRes.y/uRes.x,1))`,
GLSL L1255), holding the flare visible too far past the left/right edges on wide
frames. `ObserverFrame` now carries the aspect (set from the camera) and the gate
measures `sqrt((SunU/Aspect)²+SunV²)`. The `LensFlare` kernel itself was already
exact and is untouched. See `Reference/NOTES.md`.

## Build & run (headless, this repo only)

The full `Makefile` links the entire Frontier engine. `Makefile.standalone`
builds the same sources against the vendored subset:

```sh
cd Projects/Project-Zero
make -f Makefile.standalone            # bin/Project-Zero
make -f Makefile.standalone run        # render + Diagnostics/*.ppm→.png (~45 s, 2 cores)
make -f Makefile.standalone proof-run  # flare/cloud exactness proof (ALL CHECKS PASSED, ~6 s)
```

`Proof/ProofCelestial.cpp` drives the shipping integrator and asserts the
reference's own laws (ghost positions, ring radius, per-variety weights,
cloud structural contribution, hue anchors), writing `Proof/proof_*.png`.

## Regression status (2026-09-14, g++ 12.2, `-O2 -Werror` clean)

- `Diagnostics/ProjectZero_ReSTIR_GI.png`: **bitwise identical** to upstream.
- `Diagnostics/ProjectZero_Celestial.png`: 9/921600 bytes differ (±2 LSB) —
  threading FP noise; the aspect fix correctly changes nothing at noon with the
  sun out of frame. Telemetry matches upstream exactly (sky 11.359%, mean
  luminance 0.620814, sun elev 64°).
- `Diagnostics/Celestial_{Dawn,Dusk,Night,Noon}.png`: upstream time-of-day
  references, kept as shipped.

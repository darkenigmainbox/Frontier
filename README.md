# Frontier

Frontier engine checkout hosting **Project Zero**: a ReSTIR photometric test
ground lit by an exact C++ port of the celestial reference console
(<https://sultanaladin.github.io/Frontier-/celestial/>).

- `Projects/Project-Zero/` — the project (see its `README.md` for build, proof,
  and regression notes). Lens flare and volumetric clouds are rendered here,
  transcribed line-by-line from the reference `#fs` program pinned in
  `Projects/Project-Zero/Reference/`.
- `DeviceExchange/`, `GeometricRaster/` — the minimal engine subset Project
  Zero builds against (vectors, camera, input, telemetry).
- `Tools/PpmToPng.py` — stdlib-only PPM→PNG converter used by the renderers.

Quick start:

```sh
cd Projects/Project-Zero
make -f Makefile.standalone proof-run  # flare/cloud exactness proof
make -f Makefile.standalone run        # full ReSTIR + celestial frame
```

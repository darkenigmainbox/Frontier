# Mineral-particle weathering prototype

## Revert and replacement

The user rejected the stage-6 mesh-displacement implementation. Commit `1dd8397` reverts `441db45`, restoring the imported five-stage terrain baseline from `d93aa16` without rewriting history. The new implementation is a separate particle material workflow, not another version of stage-6 displacement. No SDF stage is included.

The old `GrainPanel.js` / `GrainSequence.js` column-based study remains as legacy source, but is no longer the active material panel. `CaptureGrainSource` is reused solely for its validated triangle attachment frame. The active simulation uses `ParticleSimulation.js`, `ParticleWorker.js` and `ParticlePanel.js`.

## What to try

Open `site/terrain/index.html?particles` on the deployed site (or `terrain/index.html?particles` in development).

- **Sandstone / Granite / Limestone:** change the mineral mixture and rebuild.
- **Nominal grain radius:** 0.15–1.5 mm; actual radii vary and packing rejects intersecting candidates.
- **Coating thickness:** 0.5–6 mm. Grain centres occupy a continuous 3D volume, not vertical columns or height-map cells.
- **Euhedral quartz fraction:** mixes rounded/subangular quartz grains with idealised six-sided, pointed quartz crystals. Other minerals use faceted or thin-flake geometry.
- **Rain, acidity, oxygen, drying, erosion:** influence the simulated weathering. Packing changes require rebuilding; weather changes can be applied while stepping/running.
- **Run weathering / +25 cycles:** advance the simulation. Studies are capped at 3,000 cycles so replay remains bounded.
- **Fresh ↔ current:** compare the original aggregate with the current particles without changing the live physics state.
- **Minerals / Clay / Oxidation / Moisture / Cement bonds:** inspect appearance or state. Click a visible grain for its individual properties.
- **On rock:** zoom out to the actual source cliff geometry. A deliberately enlarged locator marks the tiny patch. **Macro** returns to particle scale.
- **Sample cliff face:** attaches a fresh patch to the selected/current cliff source. Build the desired cliff stage first; the default demonstration attaches to stage 1 for quick startup.
- **Save study / Open:** persist a versioned seeded recipe, source triangle, cycle count and parameter-change events. Loading requires the same source cliff face and replays the simulation; it does not trust arbitrary imported geometry.

## Implemented model

### Grains and attachment

Seeded random sequential packing creates actual particle centres, radii, mineral assignments and orientations. Initial bounding spheres do not overlap. A spatial hash finds nearby grains and constructs a local cement-contact graph. Base-embedded grains anchor the graph. Unconnected grains are mechanically loose from the start, rather than silently glued to the rock.

The default is **5,000 particles on a 40 mm-wide, 2 mm-thick patch**. Count is a ceiling, not a guarantee: large grains or a small patch can exhaust packing space before the requested count is reached. Random sequential packing biases the accepted distribution; the radius control is nominal, not a promise about the final arithmetic mean.

The patch is transformed onto the actual source-triangle tangent frame. The material viewer includes the real source cliff meshes in that same coordinate frame. Instanced mineral meshes—not point sprites, a normal map or a sampled displacement texture—display the grains.

### Mineral response

- Quartz: resistant, non-oxidising in this model.
- Feldspar: slower acid-assisted alteration/dissolution, with no oxidation term for the simplified pure phase.
- Calcite: substantially more susceptible to acidic dissolution.
- Biotite mica: an iron-bearing, softer flake-like phase.
- Pyrite: iron-bearing crystals; oxidation produces local acidity that can diffuse across nearby wet contacts.

Water supply, drying, approximate shielding and local contact exchange determine particle wetness. Chemistry requires water. Oxygen gates oxidation. Dissolution reduces actual particle mass and radius; oxide state changes susceptible grains' colour and weakens their cement bonds. Pure quartz/calcite do not simply turn orange with age.

A support traversal releases grains when cement contacts fail or dissolution removes their support. Released particles move under gravity projected into the source frame and a simple runoff force. Sphere-proxy contacts, friction/damping and a backing-plane contact keep the mechanics bounded. Escaping grains and dissolved material are tracked separately.

### Accounting and reproducibility

The ledger tracks **original mineral mass**: remaining particle mass + dissolved mineral + escaped debris. Tests check a small numerical residual. This is not a stoichiometric accounting of added atmospheric oxygen or new oxide phases.

Packing and stepping are deterministic within the tested JS runtime for a given seed, source gravity and parameter history. The built-site browser test saves a study with a mid-run rain change, rebuilds, reloads and verifies an identical particle-buffer hash.

## Tests

- `npm run test:particles`: original five cliff-stage mesh hashes unchanged; continuous 3D packing; initial sphere separation; seed repeatability; chemical size loss; detached particle motion; selective calcite/quartz response; greater acid attack on calcite-rich material; dry and oxygen-free controls; event replay; finite state and mineral mass ledger; rejected packing changes during stepping.
- `npm run test:particles:browser`: builds the deployed page, tests worker startup, five-stage terrain UI, fresh/current comparison, exact saved-study replay, diagnostic channels, source-rock/macro views, preset changes and thickness rebuilding. No page errors or failed requests in the tested Chromium run.
- Existing `npm test`: RC/atrium smoke and modern GPU regressions pass.
- Fresh and 200-cycle images were captured from the real browser and visually reviewed. Numerical checks are recorded in `particle-checks.json`.

## Important limits

This is a **physically inspired, accelerated particle prototype**, not a calibrated geochemical or discrete-element solver. Rates are illustrative and cycles are not years. Mechanical motion is slowed for inspection; its time scale is separate from the accelerated chemistry.

The shapes are idealised rendering proxies. Mass uses an equivalent-sphere approximation; contact radii do not exactly reproduce the anisotropic rendered crystal/flake shapes. Cement is a support/bond model, not an elastic stress solver. Water is a wetness/contact-exchange model, not resolved fluid flow. There is no stoichiometric redox solver, oxygen diffusion PDE, new crystal growth, transported oxide precipitation/staining, fragmentation into daughter grains or recementation.

**It is a local porous particle coating, not whole-cliff particle coverage.** Grain loss exposes the original substrate; it does not excavate the underlying solid. The coating is not a welded/watertight mesh, and the cliff's existing OBJ export still exports the cliff—not these particle instances. Saving a study preserves the particle experiment, not a baked texture or production game asset.

This bounded patch lets the user evaluate the grain approach before spending work on whole-rock coverage, cached surface splats, baking, LODs or other delivery methods. No target-hardware FPS claim is made.

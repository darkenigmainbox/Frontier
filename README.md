# Frontier / Rock Lab

A browser-based procedural rock and cliff generator. Build a seeded formation, inspect it in 3D, and export the generated geometry for a game or DCC workflow. No backend or external asset service is required.

## Run locally

Requires Node.js 20.19+ or 22.12+.

```bash
npm install
npm run dev
```

Open the URL printed by Vite. Run `npm test` for the geometry and worker-recovery tests and `npm run build` for a production build. `npm run preview` serves that build locally.

For the browser smoke test, start the app in another terminal and run `CHROMIUM_EXECUTABLE=/path/to/chromium npm run test:browser`. It checks normal worker startup, blocked-worker fallback, parameter updates, and GLB export. Set `ROCK_LAB_TEST_URL` to test a different server or a production preview.

## Using Rock Lab

- Choose **Outcrop**, **Cliff**, or **Boulder**. These select procedural placement rules, not prebuilt meshes.
- Enter a seed (0–4,294,967,295) or generate a new one. A seed **and the same parameters** reproduce the same geometry in this version.
- Adjust width, height, fracture density, vertical joint bias, weathering, and surface detail. Changes normally rebuild the geometry in a worker. If a browser or embedded preview blocks the worker, Rock Lab automatically switches to a time-sliced main-thread fallback using the same geometry; generation may be slower.
- Drag to orbit, right-drag to pan, and scroll to zoom. With the preview focused, arrow keys pan, Shift + arrows orbit, and + / − zoom. Use **Frame** to reset the camera. The inspector includes stone tones, lighting, grid, wireframe, and rotation controls.
- **Export mesh → GLB** includes the mesh, normals, tangents, UVs, vertex colors, and a simple rough stone material with embedded grain and normal maps. **OBJ** exports geometry, UVs, and normals only, without a material file. The viewport floor, lights, and grid are never exported.

Exports use meters, Y-up, with the base at Y=0. GLB metadata records the seed, formation, geometry settings, and material choice. Lighting, camera, and view toggles affect the preview only.

## How the geometry is made

The silhouette is not a noise-displaced stock sphere. A seeded layout assembles anisotropic parent rock volumes whose silhouettes are created by randomly oriented clipping planes. Irregular three-dimensional sites divide each parent into convex, mating fracture cells; narrow gaps expose the joints. An anisotropic distance metric biases fracture planes toward vertical when requested, without adding layered textures. Independently sampled corner cuts remove real material, while worn edges, localized erosion pits, short fracture scars, and restrained multi-scale relief deform subdivided surfaces. Small independently generated talus pieces help ground the formation. The layout, parent cuts, fracture sites, and surface features use separate deterministic random streams so changing one parameter does not arbitrarily reshuffle the entire formation.

The stone shader adds subtle isotropic mineral grain; it does not use a sedimentary layer texture. The coarse forms, major fractures, chips, and surface relief are all exported geometry.

## Production considerations

The exports are **high-detail source meshes**, not automatically certified AAA production assets. Fragments are closed but can overlap, so internal faces remain. The generator does not create LODs, collision meshes, lightmap UVs, a boolean-unioned manifold, or engine-specific optimization. Depending on the settings, formations may contain hundreds of thousands of triangles. Reduce surface detail or process the exported asset in a DCC/engine to decimate or retopologize, bake maps, create LODs and collision, and tune materials for the target platform. GLB import support varies by engine and version; Blender can be used as an interchange step where needed.

## Project structure

- `src/generator/rockGeometry.js` — seeded volume clipping, 3D fractures, erosion, and mesh buffers.
- `src/generator/worker.js` and `generationRunner.js` — worker lifecycle and cancellable compatibility fallback.
- `src/components/RockViewport.jsx` — Three.js preview and GLB/OBJ export.
- `tests/` — determinism, topology, worker failure, and recovery checks.
- `scripts/smoke-browser.mjs` — browser-level worker, fallback, and export checks.

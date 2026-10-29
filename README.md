# Frontier — Formation Lab

A browser-based, geometry-first procedural rock and cliff authoring prototype. Built with Three.js, Vite, and a dedicated mesh-generation worker.

## Run

Requires Node.js 22.12+.

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. The dev server binds to `0.0.0.0` and supports Arena's `.e2b.app` preview hosts.

```sh
npm test       # deterministic geometry / index / normal / closed-edge tests
npm run build # production bundle
npm run preview
```

## What it generates

- **Fractured cliffs:** a seed-dependent correlated ridge with unequal buttresses, branches, and independently clipped convex masses.
- **Rock outcrops:** multiple radial growth branches with varying proportions.
- **Weathered spires:** irregular pillar clusters with separate caps and basal masses.
- **Natural arches:** an irregular connected arch envelope with variable thickness.

Every mesh is synthesized from the seed and parameters; there are no bundled rock meshes, photographic textures, displacement maps, or noise-heightfield terrain. A preset selects a growth topology, not a fixed mesh.

### Geometry pipeline

1. Grow overlapping, anisotropic superellipsoidal volumes with seeded rotations, dimensions, and crystal-face clipping planes.
2. Weld the mass with narrow smooth unions, preserving broad facets.
3. Subtract three intersecting joint families, including oblique shears. Cuts taper into the mass and some have finite lateral extent, leaving structural bridges.
4. Project rotated convex weathering/spall volumes onto the combined exposed envelope, then subtract them. This adds broken faces rather than round noise bumps.
5. Sample the implicit field with adaptive **bounds** (not adaptive voxel resolution), extract indexed geometry with shared-edge marching tetrahedra, and evaluate local surface normals.
6. Add seeded convex talus pieces around the foot of the formation.

Standard mode uses a 0.225 m sampling interval before mass scaling; high resolution uses 0.145 m. The worker keeps the interface responsive. Generation time and mesh complexity depend on the topology, settings, and machine. Thumbnail studies use a separate coarser sampling interval.

## Controls

Choose a formation or a study card; change the seed, nominal mass scale, verticality, fracture density, and weathering. Press **Generate formation** to apply changed structure settings. Shuffle generates a new seed immediately. Tone, lighting, wireframe/clay inspection, and the grid update immediately without rebuilding the mesh.

- Left-drag: orbit
- Right-drag: pan
- Scroll/pinch: zoom
- Frame icon: reset the view
- Expand icon: fullscreen viewport, where permitted by the browser

Actual generated meshes are rendered for the study-card previews. The renderer includes real-time shadowing and SSAO, with rendering suspended when the view is idle.

## Export and game-engine use

**Export mesh** downloads an indexed source mesh as OBJ, including the talus pieces, normals, vertex colors, seed, and parameter metadata. The coordinates are **meters, Y up**. OBJ vertex-color support varies between DCC tools and importers; no MTL, UV set, or texture images are generated. The current inspection mode does not change exported geometry.

This is an authoring/research prototype, **not a finished AAA asset pipeline or a physical geological simulation**. In particular:

- The sampling interval limits the smallest resolved cracks; narrow joints can disappear at low resolution.
- Shapes can contain disconnected fragments and small components. Not every seed has been exhaustively topology-tested.
- There is no automatic retopology, UV unwrapping, mesh decimation, LOD chain, collision generation, fracture simulation, or Nanite/engine integration.
- Talus placement is seeded scattering rather than a rigid-body settling simulation.
- Stone tones are art-direction choices, not lithology-specific geological models.
- Uniform voxel sampling and OBJ string creation are memory-intensive at high resolution. A sufficiently capable WebGL2 GPU is recommended for large meshes.

For production: review silhouettes and scale, remove unwanted components, validate manifoldness and face orientation, generate collision and LODs (or prepare a virtualized-geometry import), and profile in the target engine. Add physically based material detail separately if the art direction requires close-up surface grain.

## Files

- `src/geology.js` — deterministic envelope, fractures, spalling, and polygonization; independently runnable in Node.
- `src/worker.js` — background mesh generation and transferable typed arrays.
- `src/main.js` — viewer, lighting, controls, procedural talus, study thumbnails, OBJ export.
- `src/style.css` — responsive authoring workspace.
- `tests/geology.test.js` — generator tests using Node's built-in test runner.

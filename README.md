# Stoneforge

A seeded procedural rock and cliff formation studio. Generate an actual 3D mesh, orbit the preview, and export the asset as a binary glTF (`.glb`) file.

## Run

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. `npm run build` creates a production build; `npm test` runs the generator tests.

## How it works

Rock clusters use a unique collection of irregular, convex fracture bodies per seed. Cliff faces use a continuous wall divided into independently tilted fracture domains, with recessed joints, localized ledges, a broken skyline, and fallen blocks at the base. Granite, basalt, and limestone change the fracture structure and proportions as well as the material color. Limestone uses seeded, irregular 3D solution cavities and channels cut into the actual mesh after the cliff is assembled. Use the CLAY button in the viewport to compare shapes with the same neutral material (it is preview-only and does not alter the export). Their randomized supporting planes intersect into distinct rock faces, and the bodies are blended into a coherent mass. Directional, tapered clefts subtract geometry, while gentle domain deformation weathers the plane intersections. The field is sampled in three dimensions and polygonized using marching tetrahedra, allowing overhangs and undercuts rather than limiting the result to a heightmap. Vertices are shared along grid edges and normals are computed on the resulting mesh. A worker keeps generation off the UI thread.

The GLB contains the generated mesh and a neutral, untextured PBR material. It is suitable as a starting point for an asset workflow; it does not yet generate UVs, LODs, collision meshes, optimized topology, or production-ready scan-level detail. Use the quality setting to trade generation time and polygon count for surface resolution. The seed and settings reproduce the same geometry.

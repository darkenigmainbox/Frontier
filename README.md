# Frontier — AAA City Road Network Editor

**2D vector road editor + 3D PBR viewport — clean quad-flow topology, built for next-generation open-world games (GTA VI class).**

One project showcases the **full transect: countryside → city → offroad**, with terrain, rivers/lakes, bridges, pavements/ramps, markings, buildings, vegetation, monorails & trains cutting through streets.

![Frontier](https://img.shields.io/badge/AAA-PBR_/_Quad_Flow-5ee1ff?style=for-the-badge) ![Three.js](https://img.shields.io/badge/Three.js-r160-049EF4)

## Live — 2D ↔ 3D, same source of truth

| 2D Plan (left) | 3D Viewport (right) |
|---|---|
| Canvas vector editor: pan/zoom, snap, draw roads as graph nodes + segments, terrain sculpt, topology cleaning | Three.js PBR scene: Z-up terrain, quad-strip roads, sidewalks, markings, bridges w/ piers, crosswalks, ADA ramps, buildings, low-poly trees, water, monorail & train |

---

## Demo Transect
- **Countryside (NW)** rolling hills, rural 2L winding + dirt trails, pond, farmsteads & forest.
- **Highway (N→S)** 6-lane spine with concrete median + ramps, bridging the river twice.
- **City Center** gridded avenues + diagonal boulevard with central tram, old-town cobble, monorail loop on elevated beams/pillars, ground train cutting through streets.
- **Industrial (S)** wide 2-lane sheds & southern bridge.
- **Offroad (E)** gravel/forest dirt trails & lake bridge.

## Run
```
npm install
npm run dev   # http://localhost:5173
npm run build
```

## Features
- 10 presets (Highway 6L, Avenue 4L, Boulevard 6L+Tram, Residential, Cobble, Industrial, Rural, Dirt, Gravel, Ramp)
- Quad-flow ribbon meshes, mitered joins, continuous UVs, blended intersection caps
- Auto topology cleaning (same-type & mixed-type crossings)
- Bridges auto-detect water/height → deck + piers + beams + railings
- Markings: double/solid/dashed + crosswalks + tactile ADA ramps
- Sidewalks 2-4m, curb 0.12m
- Terrain FBM heightmap with sculpt brush, roads carve/embank
- River + 2 lakes, PBR water
- Buildings by zone, 400+ low-poly trees, monorail & train


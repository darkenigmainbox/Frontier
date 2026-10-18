# Frontier — Road Studio

A robust **2D road editor + live 3D preview** for designing a full game-ready city road network —
**countryside → city → offroad** — with clean **quad-flow topology** throughout.

![stack](https://img.shields.io/badge/three.js-3D_preview-blue) ![topology](https://img.shields.io/badge/topology-all--quad-green)

## Quick start

```bash
npm install
npm run dev      # 2D editor (left) + live 3D preview (right) at http://localhost:5173
npm run build    # production bundle in dist/
```

The demo city loads automatically: downtown grid + ring arterial, freeway with two
grade-separated interchanges, river + lake with bridges, heavy rail with level crossings,
downtown monorail loop, suburbs, farmland, tarn loop and offroad hill trails.

## What you get

**2D editor (CAD-style canvas)**
- Draw tools: Road · Heavy rail · Monorail · Bridge · Roundabout · Erase
- Terrain brushes: raise / lower / carve water (lakes & ponds)
- Snap to nodes + road interiors, auto-split & merge of intersecting roads
- Pan (drag empty space), zoom (wheel), double-click a road to insert a node
- Undo/redo (80 steps), layers, validation with click-to-zoom issues

**3D live preview (Three.js, mirrors every 2D edit)**
- Terrain with road corridors carved/embanked, animated water, shadows, clouds
- Traffic: cars on lanes, freight consist on heavy rail, monorail trains
- Orbit / zoom / pan, wireframe X-ray, cinematic flyover

**Road system**
- 19-preset library: freeway, highway, arterials, urban streets, one-ways, alley,
  residential, rural, scenic, dirt, offroad trail, promenade, viaducts, causeways,
  double/single heavy rail, monorail — each with a cross-section thumbnail
- Markings: double-yellow, dashed, edge lines, turn lanes, parking ticks,
  zebra crosswalks + stop lines auto-placed at junctions
- Pavements with curb ramps at junctions and driveway dips (residential)
- Bridges: beam/arch profiles that always meet the ground, railings, piers,
  abutments; per-node lift `h` for overpasses, ramps and interchanges
- Grade separation is level-aware: overpasses never merge, at-grade crossings do

**Topology (game-ready, quad-dominant)**
- Roads are single-quad-strip ribbons; junctions are all-quad fan subdivisions
  (each fan triangle → 3 quads), tinted by the widest incident road
- Straight butt-joints stay seamless (no blob); dirt/trail junctions stay small
- OBJ export writes **true quad faces** + vertex colors + MTL, grouped per
  system (asphalt, markings, sidewalks, bridge, ballast, terrain, …)

**World**
- 1200×1200 m terrain: city pad, farmland stripes, rolling hills, offroad ridge,
  river + Lake Serene + tarn, all sculptable
- Procedural dressing kept clear of roads/water: downtown towers, suburb houses,
  barns, lakeside cabins, station hall, parks, roadside rows, forests

## Controls

| Key | Action |
|-----|--------|
| `V R T M B O U J W` | Select · Road · Rail · Monorail · Bridge · Roundabout · Raise · Lower · Water |
| Click / Double-click / `Enter` / `Esc` | Place point / finish / finish / cancel |
| `Ctrl+Z` / `Ctrl+Y`, `Del` | Undo / redo / delete selection |
| `Shift+Click` on preset | Apply preset to selected road/rail |

## Project layout

```
src/
  main.js         bootstrap + splitter
  state.js        store: project model, selection, undo/redo
  presets.js      19 road/rail presets + cross-section art
  geometry.js     sampling, intersections, noise
  terrain.js      heightfield, lakes, rivers, brushes, road stamping
  topology.js     junction graph, level-aware auto-merge, validation
  meshBuilder.js  quad-flow ribbons, junctions, bridges, rails, crossings
  world.js        full build orchestration (2D / 3D / OBJ share this)
  buildings.js    procedural blocks + low-poly trees
  demoCity.js     the full countryside→city→offroad project
  editor2d.js     canvas editor + tools
  view3d.js       Three.js preview + traffic
  ui.js           panels + toolbar + shortcuts
  exporters.js    JSON save/load, OBJ+MTL quad export
```

## Format notes

- Units are meters, world is 1200×1200 centered at origin, water ≈ +1.25 m.
- A road is an ordered node list + preset; junctions form wherever roads share a
  node at the same level. Node `h` is a vertical lift in meters.
- `bridge.height` is mid-span clearance; bridge ends always blend to the ground.

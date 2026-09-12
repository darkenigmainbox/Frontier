# Project Zero celestial content

This folder is the Project Zero landing point for the Celestial port. `CelestialPanel.html` is the latest
single-file reference panel from SultanAladin/Frontier- (`arena/01a08682-frontier`); it is kept beside the native
Project Zero content so its controls and defaults can be checked without treating the browser demo as a second
renderer.

Open it through a static server from the repository root, for example:

```bash
python3 -m http.server 8765
# browse to /Projects/Project-Zero/Content/Celestial/CelestialPanel.html
```

The panel's six atlas images are shared with the native renderer through `EngineContent/CelestialTextures/`.
The relative path in the HTML intentionally points there, so the browser reference and the Vulkan asset census do
not grow two copies of Luna, Ember, Glacier, Shard, Shroud and Sulfur.

## Native Project Zero mapping

`Projects/Project-Zero/Source/CelestialSequence.{h,cpp}` is the authoritative native state and editor bridge.
The outliner now carries the weather entities plus the remaining presentation entities from the reference panel:

- Atmosphere, Sun, Sky, Stars and Moons
- Height Fog, Atmospheric Fog, Local Volumetric Fog
- Cloud Layer, Clouds, Local Cloud and Wind
- Precipitation, Rainbow and Lens Flare
- Height Field, Camera and Post Process

Point and spot lights stay owned by the scene lighting feed, and the cinematic camera remains deferred as a rig.
The browser panel is a visual/control reference; the native editor sheet is the write-back path used by Project
Zero.

Height Fog and Atmospheric Fog are real render settings, not sheet-only placeholders. They are packed in the tail
of the binding-21 sky record and applied to finite camera-to-surface segments in both the CPU visibility raster
and the ReSTIR shader. Local clouds/fog continue to use the shared volumetric march and cloud advection path.

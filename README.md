# Frontier — polygon tire treads

Four ready-to-import **mesh** tires are in [`meshes/`](meshes/):

- `tire_chevron.obj` — directional V lugs
- `tire_staggered.obj` — staggered road blocks
- `tire_ribbed.obj` — siped longitudinal ribs
- `tire_offroad.obj` — alternating shoulder lugs and central diamonds

The raised tread is actual extruded polygon geometry wrapped around a closed annular tire carcass, **not a texture, bump, displacement, or height map**. Import the OBJ files into Blender or another 3D editor. The wheel axle is the X axis, centered at the origin; tire width is 0.7 units and outer radius is approximately 1.02–1.065 units. These are standalone tire meshes; rims are not included.

Regenerate or adjust circumferential repeat count with Python 3 (no packages required):

```sh
python3 scripts/make_treads.py --count 40 --output meshes
```

Reference: [tread images supplied in the gist](https://gist.github.com/SultanAladin/b9585bb30c92c916fbab8c740f85de37). The four designs are procedural interpretations, not traced copies of the photos.

"""
Export intermediate stages as separate OBJs for illustration
Stages:
1. Macro shape only
2. After bedding
3. After joints (full fracture)
4. After edge chipping
5. After erosion
6. Final with cracks
"""

import numpy as np
from cliff_generator import (
    create_initial_bounding_planes, create_macro_planes, create_bedding_planes,
    create_joint_planes, split_blocks_by_planes, polyhedron_vertices,
    polyhedron_volume_and_centroid, Block, assign_hardness_and_strata,
    apply_edge_chipping, apply_erosion, generate_cracks_for_block,
    polyhedron_to_mesh, save_obj
)

W, H, D = 32.0, 18.0, 10.0
seed = 42

thicknesses = [2.2, 1.1, 0.8, 2.5, 1.5, 0.9, 2.0, 1.2, 1.8, 0.7, 1.3, 2.0]
dip_angles = [(2.0, 0.5), (-1.5, -0.8), (3.0, 0.3), (-2.0, 1.0), (1.0, -0.5), (2.5, 0.2), (-1.0, -0.3), (1.5, 0.6), (-2.5, -0.4), (0.8, 0.2), (1.2, -0.6)]
hardness_values = [0.7, 1.3, 0.8, 1.4, 0.75, 1.2, 0.7, 1.25, 0.8, 1.35, 0.75, 0.9]

def blocks_to_mesh(blocks):
    all_verts = []
    all_faces = []
    offset = 0
    for b in blocks:
        verts, faces = polyhedron_to_mesh(b)
        if verts is None:
            continue
        all_verts.append(verts)
        all_faces.append(faces + offset)
        offset += len(verts)
    if not all_verts:
        return None, None
    return np.vstack(all_verts), np.vstack(all_faces)

# Stage 1
print("Stage 1: Macro shape")
init_planes = create_initial_bounding_planes(W,H,D)
macro_planes = create_macro_planes(W,H,D)
verts0 = polyhedron_vertices(init_planes)
vol0, cent0 = polyhedron_volume_and_centroid(verts0, init_planes)
blocks = [Block(planes=init_planes, volume=vol0, centroid=cent0, verts=verts0)]

from cliff_generator import block_intersects_plane
for mp in macro_planes:
    new_blocks = []
    for b in blocks:
        if not block_intersects_plane(b.verts, mp):
            vals = mp.evaluate(b.verts)
            if np.all(vals <= 1e-6):
                new_blocks.append(b)
            continue
        new_planes = b.planes + [mp]
        v = polyhedron_vertices(new_planes)
        if len(v)>=4:
            vol, cent = polyhedron_volume_and_centroid(v, new_planes)
            new_blocks.append(Block(planes=new_planes, volume=vol, centroid=cent, verts=v))
    blocks = new_blocks

verts, faces = blocks_to_mesh(blocks)
if verts is not None:
    save_obj("stage1_macro.obj", verts, faces)

# Stage 2 bedding
print("Stage 2: Bedding")
bedding_planes = create_bedding_planes(H, thicknesses, dip_angles)
blocks = split_blocks_by_planes(blocks, bedding_planes, front_only=False, D=D, seed=seed)
blocks = assign_hardness_and_strata(blocks, thicknesses, hardness_values)
verts, faces = blocks_to_mesh(blocks)
if verts is not None:
    save_obj("stage2_bedding.obj", verts, faces)

# Stage 3 joints
print("Stage 3: Joints")
joint_planes = create_joint_planes(W,D,seed=seed+1)
blocks = split_blocks_by_planes(blocks, joint_planes, front_only=True, D=D, seed=seed+2)
# filter
blocks = [b for b in blocks if b.volume>0.08]
verts, faces = blocks_to_mesh(blocks)
if verts is not None:
    save_obj("stage3_fractured.obj", verts, faces)

# Stage 4 chipping
print("Stage 4: Edge chipping")
blocks = apply_edge_chipping(blocks, seed=seed+10)
verts, faces = blocks_to_mesh(blocks)
if verts is not None:
    save_obj("stage4_chipped.obj", verts, faces)

# Stage 5 erosion
print("Stage 5: Erosion")
blocks = apply_erosion(blocks, base_erosion=0.035, exterior_extra=0.055)
verts, faces = blocks_to_mesh(blocks)
if verts is not None:
    save_obj("stage5_eroded.obj", verts, faces)

print("All stages exported")

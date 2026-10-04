"""Generate high-quality cliff with smaller voxels and more detail"""
from cliff_generator import generate_cliff, save_obj, save_blocks_info

if __name__ == "__main__":
    # High quality settings
    result, blocks = generate_cliff(seed=42, W=32, H=18, D=10, voxel_size=0.06)
    if result:
        verts, faces = result
        save_obj("cliff_hq.obj", verts, faces)
        save_blocks_info("blocks_hq.csv", blocks)
        print("High quality cliff saved to cliff_hq.obj")
    
    # Alternative seed for variety
    result2, blocks2 = generate_cliff(seed=1337, W=28, H=20, D=12, voxel_size=0.07)
    if result2:
        verts2, faces2 = result2
        save_obj("cliff_alt.obj", verts2, faces2)
        save_blocks_info("blocks_alt.csv", blocks2)
        print("Alt cliff saved to cliff_alt.obj")

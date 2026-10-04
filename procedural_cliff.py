"""
Procedural Cliff Generator - fully parametric version
Each stage is configurable via a dict, allowing procedural variation.
No noise - only authored features selected via seeded randomness.

Stages:
1. Macro shape with base/middle/top sections
2. Bedding (stratification)
3. Joints (fracture sets with offset)
4. Edge chipping + erosion
5. Surface cracks + erosion
"""

import math
import random
from dataclasses import dataclass, field, asdict
from typing import List, Tuple, Dict, Any
import numpy as np
from skimage import measure

from cliff_generator import (
    Plane, plane_from_normal_point,
    polyhedron_vertices, polyhedron_volume_and_centroid,
    block_intersects_plane, Block,
    polyhedron_to_mesh, mesh_block_sdf, save_obj,
    create_initial_bounding_planes
)

@dataclass
class Stage1Config:
    # Overall
    macro_cuts: int = 3
    num_profiles: int = 5
    profile_variation: float = 0.8
    # Base section - distinct control
    base_height_ratio: float = 0.25
    base_depth: float = 0.0
    base_slope: float = -15.0
    base_bulge: float = 0.2
    # Middle section
    middle_height_ratio: float = 0.50
    middle_depth: float = -0.8
    middle_slope: float = 1.0
    middle_bulge: float = 0.3
    # Top section
    top_height_ratio: float = 0.25
    top_depth: float = -1.3
    top_slope: float = -20.0
    top_bulge: float = 0.1
    # Additional
    top_variation: float = 0.9
    bay_count: int = 1
    bay_depth: float = 0.9
    mid_step_depth: float = 1.0
    base_slope_angle: float = 45.0
    seed: int = 0

@dataclass
class Stage2Config:
    num_layers: int = 12
    thickness_min: float = 0.7
    thickness_max: float = 2.5
    dip_x_range: Tuple[float,float] = (-3.0, 3.0)
    dip_z_range: Tuple[float,float] = (-1.0, 1.0)
    hardness_pattern: str = "alternating"
    seed: int = 0

@dataclass
class Stage3Config:
    face_parallel_count: int = 3
    face_parallel_spacing_min: float = 0.9
    face_parallel_spacing_max: float = 2.2
    perp_count: int = 5
    perp_spacing_min: float = 3.5
    perp_spacing_max: float = 5.0
    diagonal_count: int = 1
    azimuth_var: float = 12.0
    dip_var: float = 7.0
    front_only_ratio: float = 0.80
    seed: int = 0

@dataclass
class Stage4Config:
    chip_prob_exterior: float = 0.5
    chip_prob_interior: float = 0.15
    chip_size_min: float = 0.05
    chip_size_max: float = 0.22
    chip_size_options: List[float] = field(default_factory=lambda: [0.05,0.08,0.11,0.15,0.18,0.22])
    erosion_base: float = 0.035
    erosion_extra: float = 0.055
    rounding_k: float = 26.0
    seed: int = 0

@dataclass
class Stage5Config:
    max_cracks_per_block: int = 3
    crack_width_min: float = 0.012
    crack_width_max: float = 0.03
    crack_depth_min: float = 0.03
    crack_depth_max: float = 0.10
    crack_density: float = 1.0
    crack_types: List[str] = field(default_factory=lambda: ["through","branching","en-echelon"])
    seed: int = 0

@dataclass
class CliffConfig:
    seed: int = 42
    W: float = 32.0
    H: float = 18.0
    D: float = 10.0
    voxel_size: float = 0.12
    fast_preview: bool = False
    stage1: Stage1Config = field(default_factory=Stage1Config)
    stage2: Stage2Config = field(default_factory=Stage2Config)
    stage3: Stage3Config = field(default_factory=Stage3Config)
    stage4: Stage4Config = field(default_factory=Stage4Config)
    stage5: Stage5Config = field(default_factory=Stage5Config)

    def to_dict(self):
        return {
            "seed": self.seed,
            "W": self.W, "H": self.H, "D": self.D,
            "voxel_size": self.voxel_size,
            "fast_preview": self.fast_preview,
            "stage1": asdict(self.stage1),
            "stage2": asdict(self.stage2),
            "stage3": asdict(self.stage3),
            "stage4": asdict(self.stage4),
            "stage5": asdict(self.stage5),
        }

    @staticmethod
    def from_dict(d: Dict[str,Any]):
        cfg = CliffConfig()
        cfg.seed = d.get("seed", 42)
        cfg.W = d.get("W", 32.0)
        cfg.H = d.get("H", 18.0)
        cfg.D = d.get("D", 10.0)
        cfg.voxel_size = d.get("voxel_size", 0.12)
        cfg.fast_preview = d.get("fast_preview", False)
        if "stage1" in d:
            for k,v in d["stage1"].items():
                if hasattr(cfg.stage1, k):
                    setattr(cfg.stage1, k, v)
        if "stage2" in d:
            for k,v in d["stage2"].items():
                if hasattr(cfg.stage2, k):
                    setattr(cfg.stage2, k, v)
        if "stage3" in d:
            for k,v in d["stage3"].items():
                if hasattr(cfg.stage3, k):
                    setattr(cfg.stage3, k, v)
        if "stage4" in d:
            for k,v in d["stage4"].items():
                if hasattr(cfg.stage4, k):
                    setattr(cfg.stage4, k, v)
        if "stage5" in d:
            for k,v in d["stage5"].items():
                if hasattr(cfg.stage5, k):
                    setattr(cfg.stage5, k, v)
        return cfg

# ---------- Procedural generators ----------

def generate_macro_blocks_procedural(W,H,D, cfg: Stage1Config, global_seed: int):
    """
    Generate base/middle/top blocks with sloped fronts.
    Only 3 main blocks spanning full width to avoid explosion,
    plus X variation via extra diagonal planes.
    """
    rnd = random.Random(global_seed + cfg.seed)
    total_ratio = cfg.base_height_ratio + cfg.middle_height_ratio + cfg.top_height_ratio
    base_ratio = cfg.base_height_ratio / total_ratio
    mid_ratio = cfg.middle_height_ratio / total_ratio
    top_ratio = cfg.top_height_ratio / total_ratio

    Hb = H * base_ratio
    Hm = H * mid_ratio
    Ht = H * top_ratio

    Yb0, Yb1 = 0.0, Hb
    Ym0, Ym1 = Hb, Hb+Hm
    Yt0, Yt1 = Hb+Hm, H

    blocks = []

    def make_wedge_block(x0,x1, y0,y1, z_back, z_front_bottom, z_front_top):
        planes = []
        planes.append(Plane(n=np.array([-1.0,0.0,0.0]), d=x0, source='macro'))
        planes.append(Plane(n=np.array([1.0,0.0,0.0]), d=-x1, source='macro'))
        planes.append(Plane(n=np.array([0.0,-1.0,0.0]), d=y0, source='macro'))
        planes.append(Plane(n=np.array([0.0,1.0,0.0]), d=-y1, source='macro'))
        planes.append(Plane(n=np.array([0.0,0.0,-1.0]), d=-D, source='macro'))
        a = (z_front_top - z_front_bottom) / (y1 - y0 + 1e-9)
        b = z_front_bottom - a*y0
        n_front = np.array([0.0, -a, 1.0], dtype=np.float64)
        norm = np.linalg.norm(n_front)
        if norm < 1e-9:
            norm = 1.0
        n_front = n_front / norm
        d_front = -b / norm
        planes.append(Plane(n=n_front, d=d_front, source='macro'))
        return planes

    # Base
    Zb_bottom = cfg.base_depth + rnd.uniform(-0.2,0.2) + cfg.base_bulge*0.2
    Zb_top = Zb_bottom + Hb * math.tan(math.radians(cfg.base_slope)) + rnd.uniform(-0.2,0.2)
    Zb_bottom = max(-D+0.5, min(0.4, Zb_bottom))
    Zb_top = max(-D+0.5, min(0.4, Zb_top))
    base_planes = make_wedge_block(0,W, Yb0,Yb1, -D, Zb_bottom, Zb_top)
    verts = polyhedron_vertices(base_planes)
    if len(verts)>=4:
        vol, cent = polyhedron_volume_and_centroid(verts, base_planes)
        if vol>0.05:
            blocks.append(Block(planes=base_planes, volume=vol, centroid=cent, verts=verts))

    # Middle
    Zm_bottom = cfg.middle_depth + rnd.uniform(-0.3,0.3) + cfg.middle_bulge*0.2
    Zm_bottom = (Zb_top + Zm_bottom) * 0.5
    Zm_top = Zm_bottom + Hm * math.tan(math.radians(cfg.middle_slope)) + rnd.uniform(-0.3,0.3)
    Zm_bottom = max(-D+0.5, min(0.4, Zm_bottom))
    Zm_top = max(-D+0.5, min(0.4, Zm_top))
    mid_planes = make_wedge_block(0,W, Ym0,Ym1, -D, Zm_bottom, Zm_top)
    verts = polyhedron_vertices(mid_planes)
    if len(verts)>=4:
        vol, cent = polyhedron_volume_and_centroid(verts, mid_planes)
        if vol>0.05:
            blocks.append(Block(planes=mid_planes, volume=vol, centroid=cent, verts=verts))

    # Top
    Zt_bottom = cfg.top_depth + rnd.uniform(-0.3,0.3) + cfg.top_bulge*0.1
    Zt_bottom = (Zm_top + Zt_bottom) * 0.5
    Zt_top = Zt_bottom + Ht * math.tan(math.radians(cfg.top_slope)) + rnd.uniform(-0.4,0.4)
    Zt_bottom = max(-D+0.5, min(0.4, Zt_bottom))
    Zt_top = max(-D+0.5, min(0.4, Zt_top))
    top_planes = make_wedge_block(0,W, Yt0,Yt1, -D, Zt_bottom, Zt_top)
    verts = polyhedron_vertices(top_planes)
    if len(verts)>=4:
        vol, cent = polyhedron_volume_and_centroid(verts, top_planes)
        if vol>0.05:
            blocks.append(Block(planes=top_planes, volume=vol, centroid=cent, verts=verts))

    # Extra irregularity via additional planes (X variation)
    extra_planes = []
    num_profiles = max(2, cfg.num_profiles)
    for i in range(num_profiles):
        x = W * (i+0.5) / num_profiles
        depth_var = rnd.uniform(-cfg.profile_variation, cfg.profile_variation)
        nx = rnd.uniform(-0.4,0.4)
        nz = 0.9
        n = np.array([nx, 0.08, nz], dtype=np.float64); n/=np.linalg.norm(n)+1e-9
        p = np.array([x, H*0.5, depth_var], dtype=np.float64)
        extra_planes.append(plane_from_normal_point(n,p,source='macro'))

    for _ in range(max(0, cfg.macro_cuts)):
        nx = rnd.uniform(-0.3,0.3)
        ny = rnd.uniform(0.5,0.9)
        nz = rnd.uniform(0.2,0.6)
        n = np.array([nx, ny, nz], dtype=np.float64); n/=np.linalg.norm(n)+1e-9
        p = np.array([W*rnd.uniform(0.1,0.9), H - rnd.uniform(0.2, cfg.top_variation+0.5), -D*rnd.uniform(0.1,0.5)], dtype=np.float64)
        extra_planes.append(plane_from_normal_point(n,p,source='macro'))

    for _ in range(cfg.bay_count):
        nx = rnd.uniform(0.2,0.5); ny = rnd.uniform(0.05,0.2); nz = rnd.uniform(0.8,0.95)
        n = np.array([nx, ny, nz], dtype=np.float64); n/=np.linalg.norm(n)+1e-9
        p = np.array([W*rnd.uniform(0.2,0.8), H*rnd.uniform(0.2,0.8), -rnd.uniform(0.3, cfg.bay_depth)], dtype=np.float64)
        extra_planes.append(plane_from_normal_point(n,p,source='macro'))
        nx = rnd.uniform(-0.5,-0.2)
        n = np.array([nx, ny, nz], dtype=np.float64); n/=np.linalg.norm(n)+1e-9
        p = np.array([W*rnd.uniform(0.2,0.8), H*rnd.uniform(0.2,0.8), -rnd.uniform(0.3, cfg.bay_depth)], dtype=np.float64)
        extra_planes.append(plane_from_normal_point(n,p,source='macro'))

    final_blocks = []
    for b in blocks:
        cur_planes = b.planes
        for ep in extra_planes:
            if not block_intersects_plane(polyhedron_vertices(cur_planes), ep):
                vals = ep.evaluate(polyhedron_vertices(cur_planes))
                if np.all(vals > 1e-6):
                    cur_planes = None
                    break
                else:
                    continue
            cur_planes = cur_planes + [ep]
        if cur_planes is None:
            continue
        verts = polyhedron_vertices(cur_planes)
        if len(verts)>=4:
            vol, cent = polyhedron_volume_and_centroid(verts, cur_planes)
            if vol>0.05:
                final_blocks.append(Block(planes=cur_planes, volume=vol, centroid=cent, verts=verts))

    return final_blocks if final_blocks else blocks

def generate_macro_planes_procedural(W,H,D, cfg: Stage1Config, global_seed: int):
    # Legacy - kept for compatibility, now calls block version and extracts planes
    blocks = generate_macro_blocks_procedural(W,H,D,cfg,global_seed)
    # Return extra planes from first block beyond the 6 base planes as representative
    if not blocks:
        return []
    # Just return empty, since we use blocks directly
    return []

def generate_bedding_procedural(H, cfg: Stage2Config, global_seed: int):
    rnd = random.Random(global_seed + cfg.seed + 100)
    n = cfg.num_layers
    raw = [rnd.uniform(cfg.thickness_min, cfg.thickness_max) for _ in range(n)]
    total = sum(raw)
    scale = H / total
    thicknesses = [t*scale for t in raw]
    dip_angles = []
    for _ in range(n-1):
        dx = rnd.uniform(cfg.dip_x_range[0], cfg.dip_x_range[1])
        dz = rnd.uniform(cfg.dip_z_range[0], cfg.dip_z_range[1])
        dip_angles.append((dx, dz))
    planes = []
    y = 0.0
    for i in range(n-1):
        y += thicknesses[i]
        if y >= H-1e-6:
            break
        dip_x = math.radians(dip_angles[i][0])
        dip_z = math.radians(dip_angles[i][1])
        cx = math.cos(dip_x); sx = math.sin(dip_x)
        cz = math.cos(math.radians(dip_angles[i][1])); sz = math.sin(math.radians(dip_angles[i][1]))
        nx = -sz * cx
        ny = cz * cx
        nz = sx
        n = np.array([nx, ny, nz], dtype=np.float64)
        n = n / (np.linalg.norm(n)+1e-12)
        p = np.array([0.0, y, 0.0], dtype=np.float64)
        pl = plane_from_normal_point(n, p, source='bedding')
        planes.append(pl)
    return planes, thicknesses, dip_angles

def generate_hardness_values(num_layers, pattern, seed):
    rnd = random.Random(seed)
    if pattern == "alternating":
        vals = [0.7 if i%2==0 else 1.3 for i in range(num_layers)]
        vals = [v * rnd.uniform(0.9,1.1) for v in vals]
        return vals
    elif pattern == "hard_soft_hard":
        vals = []
        for i in range(num_layers):
            if i < num_layers*0.3 or i > num_layers*0.7:
                vals.append(rnd.uniform(0.65,0.85))
            else:
                vals.append(rnd.uniform(1.2,1.4))
        return vals
    else:
        return [rnd.uniform(0.7,1.4) for _ in range(num_layers)]

def generate_joints_procedural(W,D, cfg: Stage3Config, global_seed: int):
    rnd = random.Random(global_seed + cfg.seed + 200)
    planes = []
    z = -rnd.uniform(0.3, 0.8)
    for _ in range(cfg.face_parallel_count):
        if z < -D*0.9:
            break
        az = rnd.uniform(-cfg.azimuth_var, cfg.azimuth_var)
        dip = rnd.uniform(-cfg.dip_var, cfg.dip_var)
        az_r = math.radians(az); dip_r = math.radians(dip)
        nx = math.sin(az_r)
        ny = -math.sin(dip_r) * math.cos(az_r)
        nz = math.cos(dip_r) * math.cos(az_r)
        n = np.array([nx, ny, nz], dtype=np.float64); n/=np.linalg.norm(n)+1e-12
        p = np.array([0.0, 0.0, z], dtype=np.float64)
        planes.append(plane_from_normal_point(n,p,source='joint'))
        z -= rnd.uniform(cfg.face_parallel_spacing_min, cfg.face_parallel_spacing_max)
    x = rnd.uniform(2.0, 4.0)
    for _ in range(cfg.perp_count):
        if x > W-1.0:
            break
        az = rnd.uniform(-cfg.azimuth_var*0.8, cfg.azimuth_var*0.8)
        dip = rnd.uniform(-cfg.dip_var*0.8, cfg.dip_var*0.8)
        az_r = math.radians(az); dip_r = math.radians(dip)
        nx = math.cos(az_r)
        ny = math.sin(dip_r) * math.sin(az_r)
        nz = -math.cos(dip_r) * math.sin(az_r)
        n = np.array([nx, ny, nz], dtype=np.float64); n/=np.linalg.norm(n)+1e-12
        p = np.array([x, 0.0, 0.0], dtype=np.float64)
        planes.append(plane_from_normal_point(n,p,source='joint'))
        x += rnd.uniform(cfg.perp_spacing_min, cfg.perp_spacing_max)
    for _ in range(cfg.diagonal_count):
        x = rnd.uniform(W*0.1, W*0.9)
        az = rnd.uniform(35,55) if rnd.random()<0.5 else rnd.uniform(-55,-35)
        dip = rnd.uniform(-cfg.dip_var*0.7, cfg.dip_var*0.7)
        az_r = math.radians(az); dip_r = math.radians(dip)
        nx = math.cos(az_r); nz = math.sin(az_r); ny = math.sin(dip_r)
        n = np.array([nx, ny, nz], dtype=np.float64); n/=np.linalg.norm(n)+1e-12
        p = np.array([x, 0.0, -rnd.uniform(0.5,2.5)], dtype=np.float64)
        planes.append(plane_from_normal_point(n,p,source='joint'))
    return planes

def split_blocks_by_planes_procedural(blocks, cut_planes, front_only, D, front_ratio, seed):
    rnd = random.Random(seed)
    new_blocks = blocks
    for cut in cut_planes:
        next_blocks = []
        for b in new_blocks:
            if front_only:
                if b.verts.size > 0:
                    max_z = b.verts[:,2].max()
                    if max_z < -D*front_ratio:
                        next_blocks.append(b)
                        continue
                else:
                    if b.centroid[2] < -D*front_ratio:
                        next_blocks.append(b)
                        continue
            verts = b.verts
            if len(verts)==0:
                verts = polyhedron_vertices(b.planes)
                if len(verts)==0:
                    continue
                b.verts = verts
            if not block_intersects_plane(verts, cut):
                next_blocks.append(b)
                continue
            duplicate=False
            for pl in b.planes:
                if abs(abs(float(pl.n @ cut.n)) -1.0) < 1e-3 and abs(pl.d - cut.d) < 0.05:
                    duplicate=True
                    break
            if duplicate:
                next_blocks.append(b)
                continue
            b1_planes = b.planes + [cut]
            b2_planes = b.planes + [cut.flipped()]
            v1 = polyhedron_vertices(b1_planes)
            v2 = polyhedron_vertices(b2_planes)
            if len(v1)>=4:
                vol1, cent1 = polyhedron_volume_and_centroid(v1, b1_planes)
                if vol1 > 1e-4:
                    next_blocks.append(Block(planes=b1_planes, volume=vol1, centroid=cent1, verts=v1, hardness=b.hardness, stratum_id=b.stratum_id))
            if len(v2)>=4:
                vol2, cent2 = polyhedron_volume_and_centroid(v2, b2_planes)
                if vol2 > 1e-4:
                    next_blocks.append(Block(planes=b2_planes, volume=vol2, centroid=cent2, verts=v2, hardness=b.hardness, stratum_id=b.stratum_id))
        new_blocks = next_blocks
        if len(new_blocks) > 1000:
            break
    return new_blocks

def apply_edge_chipping_procedural(blocks, cfg: Stage4Config, global_seed: int):
    rnd = random.Random(global_seed + cfg.seed)
    new_blocks = []
    for b in blocks:
        if b.volume < 0.08:
            new_blocks.append(b)
            continue
        from cliff_generator import compute_block_edges
        edges = compute_block_edges(b)
        exterior_plane_indices = set()
        for pi, pl in enumerate(b.planes):
            if pl.source in ('bound','macro'):
                exterior_plane_indices.add(pi)
        chip_planes = []
        for pi, pj, v0, v1, length, mid in edges:
            is_ext = (pi in exterior_plane_indices) or (pj in exterior_plane_indices)
            prob = cfg.chip_prob_exterior if is_ext else cfg.chip_prob_interior
            if rnd.random() > prob:
                continue
            options = [s for s in cfg.chip_size_options if cfg.chip_size_min <= s <= cfg.chip_size_max]
            if not options:
                options = [cfg.chip_size_min, cfg.chip_size_max]
            chip_depth = rnd.choice(options)
            max_allowed = (b.volume ** (1/3)) * 0.35
            chip_depth = min(chip_depth, max_allowed, length*0.4)
            if chip_depth < 0.02:
                continue
            n1 = b.planes[pi].n
            n2 = b.planes[pj].n
            n_avg = n1 + n2
            norm = np.linalg.norm(n_avg)
            if norm < 1e-8:
                continue
            n_avg = n_avg / norm
            p_chip = mid - chip_depth * n_avg
            edge_dir = (v1 - v0) / (length + 1e-12)
            tilt_angle = rnd.uniform(-10,10)
            theta = math.radians(tilt_angle)
            k = edge_dir
            v = n_avg
            v_rot = v * math.cos(theta) + np.cross(k, v) * math.sin(theta) + k * (k @ v) * (1 - math.cos(theta))
            v_rot = v_rot / (np.linalg.norm(v_rot)+1e-12)
            if v_rot @ n_avg < 0.3:
                v_rot = n_avg
            chip_plane = plane_from_normal_point(v_rot, p_chip, source='chip')
            chip_planes.append(chip_plane)
        cur_planes = b.planes.copy()
        for cp in chip_planes:
            test_planes = cur_planes + [cp]
            verts = polyhedron_vertices(test_planes)
            if len(verts) < 4:
                continue
            vol, cent = polyhedron_volume_and_centroid(verts, test_planes)
            if vol < 0.02 or vol < b.volume*0.3:
                continue
            cur_planes = test_planes
        final_verts = polyhedron_vertices(cur_planes)
        if len(final_verts) >=4:
            vol, cent = polyhedron_volume_and_centroid(final_verts, cur_planes)
            new_blocks.append(Block(planes=cur_planes, volume=vol, centroid=cent, verts=final_verts, hardness=b.hardness, stratum_id=b.stratum_id))
        else:
            new_blocks.append(b)
    return new_blocks

def apply_erosion_procedural(blocks, cfg: Stage4Config):
    from cliff_generator import apply_erosion as _apply_erosion
    return _apply_erosion(blocks, base_erosion=cfg.erosion_base, exterior_extra=cfg.erosion_extra)

def generate_cracks_procedural(block, cfg: Stage5Config, global_seed: int, block_idx: int):
    from cliff_generator import generate_cracks_for_block as _gen_cracks
    rnd = random.Random(global_seed + cfg.seed + block_idx)
    max_cracks = int(cfg.max_cracks_per_block * cfg.crack_density)
    max_cracks = max(1, max_cracks)
    cracks = _gen_cracks(block, seed=global_seed+cfg.seed+block_idx, max_cracks=max_cracks)
    scaled = []
    for a,b,r,d in cracks:
        width = rnd.uniform(cfg.crack_width_min, cfg.crack_width_max)
        depth = rnd.uniform(cfg.crack_depth_min, cfg.crack_depth_max)
        new_r = width*0.5 + depth*0.15
        scaled.append((a,b,new_r,depth))
    return scaled

# ---------- Full pipeline ----------

def generate_cliff_procedural(config: CliffConfig, up_to_stage: int = 6):
    stages = {}
    W,H,D = config.W, config.H, config.D
    seed = config.seed
    up_to_stage = max(1, min(6, up_to_stage))

    # Stage 1: Macro with base/mid/top
    blocks = generate_macro_blocks_procedural(W,H,D, config.stage1, seed)

    def blocks_to_mesh(blocks):
        all_v = []
        all_f = []
        off=0
        for b in blocks:
            v,f = polyhedron_to_mesh(b)
            if v is None:
                continue
            all_v.append(v)
            all_f.append(f+off)
            off+=len(v)
        if not all_v:
            return None, None
        return np.vstack(all_v), np.vstack(all_f)

    v1,f1 = blocks_to_mesh(blocks)
    stages['stage1_macro'] = (v1,f1,blocks.copy())
    if up_to_stage <= 1:
        stages['final'] = (v1,f1,blocks)
        return {"stages": stages, "final_verts": v1, "final_faces": f1, "blocks": blocks, "config": config}

    # Stage 2: Bedding
    bedding_planes, thicknesses, dip_angles = generate_bedding_procedural(H, config.stage2, seed)
    hardness_vals = generate_hardness_values(config.stage2.num_layers, config.stage2.hardness_pattern, seed+50)
    blocks = split_blocks_by_planes_procedural(blocks, bedding_planes, front_only=False, D=D, front_ratio=1.0, seed=seed+1)
    y_bounds=[0.0]
    cum=0.0
    for th in thicknesses:
        cum+=th
        y_bounds.append(cum)
    for b in blocks:
        y=b.centroid[1]
        sid=0
        for i in range(len(y_bounds)-1):
            if y_bounds[i] <= y < y_bounds[i+1]:
                sid=i
                break
        b.stratum_id=sid
        b.hardness = hardness_vals[sid] if sid < len(hardness_vals) else 1.0

    v2,f2 = blocks_to_mesh(blocks)
    stages['stage2_bedding'] = (v2,f2,blocks.copy(), {"thicknesses":thicknesses, "hardness":hardness_vals})
    if up_to_stage <= 2:
        stages['final'] = (v2,f2,blocks)
        return {"stages": stages, "final_verts": v2, "final_faces": f2, "blocks": blocks, "config": config}

    # Stage 3: Joints
    joint_planes = generate_joints_procedural(W,D, config.stage3, seed)
    blocks = split_blocks_by_planes_procedural(blocks, joint_planes, front_only=True, D=D, front_ratio=config.stage3.front_only_ratio, seed=seed+2)
    blocks = [b for b in blocks if b.volume>0.08]
    v3,f3 = blocks_to_mesh(blocks)
    stages['stage3_fractured'] = (v3,f3,blocks.copy())
    if up_to_stage <= 3:
        stages['final'] = (v3,f3,blocks)
        return {"stages": stages, "final_verts": v3, "final_faces": f3, "blocks": blocks, "config": config}

    # Stage 4: Chipping
    blocks = apply_edge_chipping_procedural(blocks, config.stage4, seed)
    v4,f4 = blocks_to_mesh(blocks)
    stages['stage4_chipped'] = (v4,f4,blocks.copy())
    if up_to_stage <= 4:
        stages['final'] = (v4,f4,blocks)
        return {"stages": stages, "final_verts": v4, "final_faces": f4, "blocks": blocks, "config": config}

    # Stage 4b: Erosion
    blocks = apply_erosion_procedural(blocks, config.stage4)
    v4b,f4b = blocks_to_mesh(blocks)
    stages['stage5_eroded'] = (v4b,f4b,blocks.copy())
    if up_to_stage <= 5:
        stages['final'] = (v4b,f4b,blocks)
        return {"stages": stages, "final_verts": v4b, "final_faces": f4b, "blocks": blocks, "config": config}

    # Stage 5: Cracks
    for idx,b in enumerate(blocks):
        if b.centroid[2] > -D*config.stage3.front_only_ratio:
            cracks = generate_cracks_procedural(b, config.stage5, seed, idx)
            b.cracks = cracks
        else:
            b.cracks = []
    # Final meshing with SDF (or fast polygon)
    all_verts=[]
    all_faces=[]
    off=0
    for b in blocks:
        if config.fast_preview:
            use_sdf = False
        else:
            use_sdf = (len(b.cracks)>0) or (b.centroid[2] > -2.0) or (b.volume>1.5)
        if use_sdf:
            vm,fm = mesh_block_sdf(b, voxel_size=config.voxel_size, smooth_k=config.stage4.rounding_k)
            if vm is None:
                vm,fm = polyhedron_to_mesh(b)
        else:
            vm,fm = polyhedron_to_mesh(b)
        if vm is None:
            continue
        all_verts.append(vm)
        all_faces.append(fm+off)
        off+=len(vm)
    if all_verts:
        final_v = np.vstack(all_verts)
        final_f = np.vstack(all_faces)
    else:
        final_v, final_f = None, None

    stages['final'] = (final_v, final_f, blocks)
    return {
        "stages": stages,
        "final_verts": final_v,
        "final_faces": final_f,
        "blocks": blocks,
        "config": config
    }

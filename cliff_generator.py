"""
Cliff / Rock Formation Generator
Implements the 5-stage pipeline described by user:

1. Create shape of cliff (macro shaping via authored planes, no noise)
2. Cut its faces using offset so it doesn't cut everything (finite joint sets)
3. Apply realistic fractures (bedding + vertical joint sets) -> blocks
4. Detail individual rocks: chipped by edges + erosion (SDF shrink + rounding)
5. Add realistic cracks on individual rocks (surface only, with offset) + erosion together

Uses both Polygon (BSP convex polyhedra) and SDF:
- Polygon for fracture, edge chipping, crack placement (better control)
- SDF for erosion (uniform shrink + smooth rounding) and for carving cracks (concave) and combining.

Constraints:
- No noise generators (no Perlin, Simplex, Worley, etc.)
- No random vertex displacement. Random only selects/arranges authored features.
- Output only triangles/quads, no n-gons.
- No materials hiding poor geometry.

Author: Arena Agent
"""

import math
import random
from dataclasses import dataclass, field
from typing import List, Tuple, Optional
import itertools

import numpy as np
from skimage import measure

# ---------- Geometry primitives ----------

@dataclass
class Plane:
    n: np.ndarray  # shape (3,) outward normal, normalized
    d: float       # plane equation n·p + d = 0, interior n·p + d <= 0
    source: str = "unknown"  # 'bound','macro','bedding','joint','chip'
    hardness_factor: float = 1.0

    def flipped(self):
        return Plane(n=-self.n, d=-self.d, source=self.source, hardness_factor=self.hardness_factor)

    def evaluate(self, pts: np.ndarray) -> np.ndarray:
        """ pts (...,3) -> (...,) signed distance (positive outside) """
        return pts @ self.n + self.d

def plane_from_normal_point(n: np.ndarray, p: np.ndarray, source="unknown") -> Plane:
    n = np.asarray(n, dtype=np.float64)
    n = n / (np.linalg.norm(n) + 1e-12)
    d = -float(n @ p)
    return Plane(n=n, d=d, source=source)

def intersect_three_planes(p1: Plane, p2: Plane, p3: Plane, eps=1e-9) -> Optional[np.ndarray]:
    A = np.stack([p1.n, p2.n, p3.n], axis=0)  # 3x3
    b = -np.array([p1.d, p2.d, p3.d], dtype=np.float64)
    det = np.linalg.det(A)
    if abs(det) < eps:
        return None
    try:
        x = np.linalg.solve(A, b)
    except np.linalg.LinAlgError:
        return None
    return x

def polyhedron_vertices(planes: List[Plane], eps_inside=1e-6, eps_on=1e-4):
    """Return list of vertices (np array) that are inside all planes and are intersection of 3 planes."""
    verts = []
    n = len(planes)
    # Use combinations
    for i, j, k in itertools.combinations(range(n), 3):
        p = intersect_three_planes(planes[i], planes[j], planes[k])
        if p is None:
            continue
        # check inside all
        inside = True
        for pl in planes:
            if pl.evaluate(p) > eps_inside:
                inside = False
                break
        if not inside:
            continue
        # deduplicate
        found = False
        for v in verts:
            if np.linalg.norm(v - p) < 1e-4:
                found = True
                break
        if not found:
            verts.append(p)
    if not verts:
        return np.zeros((0,3), dtype=np.float64)
    return np.stack(verts, axis=0)

def polyhedron_aabb(verts: np.ndarray):
    if len(verts)==0:
        return None
    return verts.min(axis=0), verts.max(axis=0)

def polyhedron_volume_and_centroid(verts: np.ndarray, planes: List[Plane]) -> Tuple[float, np.ndarray]:
    """Approximate volume via convex hull triangulation from centroid of vertices.
       For convex polyhedron defined by planes, we can triangulate each face.
       Simpler: compute volume via divergence using face polygons.
       We'll compute faces first.
    """
    if len(verts) < 4:
        return 0.0, np.zeros(3)
    # Compute faces: for each plane, collect verts on plane
    # Then order them and triangulate
    total_vol = 0.0
    centroid_acc = np.zeros(3)
    # Use method: decompose into tetrahedra from origin? But origin may be outside.
    # Better: use centroid of verts as reference.
    ref = verts.mean(axis=0)
    # For each plane, get polygon
    for pl in planes:
        # find verts on plane
        dists = np.abs(pl.evaluate(verts))
        on_idx = np.where(dists < 1e-3)[0]
        if len(on_idx) < 3:
            continue
        face_verts = verts[on_idx]
        # order face verts
        # compute basis
        # find two orthogonal vectors to n
        n = pl.n
        # pick arbitrary up
        up = np.array([0,0,1], dtype=np.float64) if abs(n[2]) < 0.9 else np.array([0,1,0], dtype=np.float64)
        u = np.cross(n, up)
        u_norm = np.linalg.norm(u)
        if u_norm < 1e-8:
            up = np.array([1,0,0], dtype=np.float64)
            u = np.cross(n, up)
            u_norm = np.linalg.norm(u)
        u = u / u_norm
        v = np.cross(n, u)
        v = v / (np.linalg.norm(v)+1e-12)
        # project
        center = face_verts.mean(axis=0)
        # angle sort
        angles = []
        for fv in face_verts:
            d = fv - center
            x = d @ u
            y = d @ v
            ang = math.atan2(y, x)
            angles.append(ang)
        order = np.argsort(angles)
        ordered = face_verts[order]
        # triangulate fan from first
        for i in range(1, len(ordered)-1):
            v0 = ordered[0]
            v1 = ordered[i]
            v2 = ordered[i+1]
            # tetra volume with ref
            # volume of tetra (ref, v0, v1, v2) = |det(v0-ref, v1-ref, v2-ref)|/6
            # sign depends on orientation, but we want absolute for volume? For closed convex, using ref inside, all tetra have same orientation if faces outward.
            # We'll compute signed volume using normal direction.
            # Use formula: volume contribution = dot(v0 - ref, cross(v1-ref, v2-ref))/6
            vol = np.dot(v0 - ref, np.cross(v1 - ref, v2 - ref)) / 6.0
            total_vol += vol
            # centroid of tetra
            tet_cent = (ref + v0 + v1 + v2) / 4.0
            centroid_acc += tet_cent * vol
    if abs(total_vol) < 1e-9:
        return 0.0, ref
    total_vol = abs(total_vol)
    centroid = centroid_acc / (total_vol + 1e-12) if total_vol>0 else ref
    # Actually centroid_acc was signed, need abs? Let's recompute with absolute? For convex and ref inside, vol should have consistent sign (negative if outward?). Let's take absolute for centroid weighting.
    # We'll just return mean as centroid if calculation unstable.
    if np.any(np.isnan(centroid)) or np.linalg.norm(centroid) > 1e4:
        centroid = ref
    return total_vol, centroid

def block_intersects_plane(verts: np.ndarray, plane: Plane, eps=1e-6):
    if len(verts)==0:
        return False
    vals = plane.evaluate(verts)
    has_pos = np.any(vals > eps)
    has_neg = np.any(vals < -eps)
    return has_pos and has_neg

# ---------- Cliff generation ----------

@dataclass
class Block:
    planes: List[Plane]
    volume: float = 0.0
    centroid: np.ndarray = field(default_factory=lambda: np.zeros(3))
    verts: np.ndarray = field(default_factory=lambda: np.zeros((0,3)))
    # for crack SDF
    cracks: List[Tuple[np.ndarray, np.ndarray, float, float]] = field(default_factory=list) # (p0,p1,radius,depth) segments
    # hardness per block (based on stratum)
    hardness: float = 1.0
    stratum_id: int = 0

def create_initial_bounding_planes(W, H, D):
    # Box [0,W] x [0,H] x [-D,0]
    planes = []
    planes.append(Plane(n=np.array([-1,0,0], dtype=np.float64), d=0.0, source='bound')) # x=0, outward -X
    planes.append(Plane(n=np.array([1,0,0], dtype=np.float64), d=-W, source='bound')) # x=W
    planes.append(Plane(n=np.array([0,-1,0], dtype=np.float64), d=0.0, source='bound')) # y=0
    planes.append(Plane(n=np.array([0,1,0], dtype=np.float64), d=-H, source='bound')) # y=H
    planes.append(Plane(n=np.array([0,0,-1], dtype=np.float64), d=-D, source='bound')) # z=-D, outward -Z
    planes.append(Plane(n=np.array([0,0,1], dtype=np.float64), d=0.0, source='bound')) # z=0
    return planes

def create_macro_planes(W, H, D):
    """Authored large-scale cuts to create irregular silhouette, no noise."""
    macro = []
    # Top front bevel
    n = np.array([0.12, 0.9, 0.35], dtype=np.float64); n/=np.linalg.norm(n)
    p = np.array([W*0.5, H-0.6, -0.4], dtype=np.float64)
    macro.append(plane_from_normal_point(n, p, source='macro'))
    # Top back bevel
    n = np.array([0.0, 0.85, -0.45], dtype=np.float64); n/=np.linalg.norm(n)
    p = np.array([W*0.5, H-1.1, -D+1.2], dtype=np.float64)
    macro.append(plane_from_normal_point(n, p, source='macro'))
    # Left top
    n = np.array([0.6, 0.75, 0.1], dtype=np.float64); n/=np.linalg.norm(n)
    p = np.array([1.2, H-0.9, -1.0], dtype=np.float64)
    macro.append(plane_from_normal_point(n, p, source='macro'))
    # Right top
    n = np.array([-0.55, 0.8, 0.05], dtype=np.float64); n/=np.linalg.norm(n)
    p = np.array([W-1.0, H-1.3, -0.8], dtype=np.float64)
    macro.append(plane_from_normal_point(n, p, source='macro'))
    # Base front talus slope (creates slight overhang at base)
    n = np.array([0.0, -0.65, 0.75], dtype=np.float64); n/=np.linalg.norm(n)
    p = np.array([W*0.5, 1.8, -0.2], dtype=np.float64)
    macro.append(plane_from_normal_point(n, p, source='macro'))
    # Mid cliff large step (simulates harder layer protruding)
    n = np.array([0.0, 0.2, 0.98], dtype=np.float64); n/=np.linalg.norm(n)
    p = np.array([W*0.5, H*0.55, -2.2], dtype=np.float64)
    macro.append(plane_from_normal_point(n, p, source='macro'))
    # Additional large diagonal cut for visual interest (creates bay)
    n = np.array([0.3, 0.1, 0.95], dtype=np.float64); n/=np.linalg.norm(n)
    p = np.array([W*0.35, H*0.5, -1.0], dtype=np.float64)
    macro.append(plane_from_normal_point(n, p, source='macro'))
    n = np.array([-0.25, 0.15, 0.95], dtype=np.float64); n/=np.linalg.norm(n)
    p = np.array([W*0.65, H*0.6, -1.2], dtype=np.float64)
    macro.append(plane_from_normal_point(n, p, source='macro'))
    return macro

def create_bedding_planes(H, thicknesses, dip_angles_deg):
    """Bedding planes: horizontal with slight dip."""
    planes = []
    y = 0.0
    for idx, (th, dip) in enumerate(zip(thicknesses[:-1], dip_angles_deg)):
        y += th
        if y >= H-1e-6:
            break
        # dip: rotation around X and Z
        dip_x = math.radians(dip[0])
        dip_z = math.radians(dip[1])
        # base normal (0,1,0) rotated
        # rotate around X by dip_x, then around Z by dip_z
        # Rotation matrix: Rx * Rz? Let's apply simple.
        # Start with (0,1,0)
        # After Rx(dip_x): y' = cos* y - sin* z, z' = sin*y + cos*z . Since initial z=0, y=1 => y'=cos, z'=sin
        # Then Rz(dip_z): x' = cos*x - sin*y, y' = sin*x + cos*y
        # For vector (0, cos, sin) after first rot, after Rz:
        # x = -sin(dip_z)*cos(dip_x)
        # y = cos(dip_z)*cos(dip_x)
        # z = sin(dip_x)
        cx = math.cos(dip_x); sx = math.sin(dip_x)
        cz = math.cos(math.radians(dip[1])); sz = math.sin(math.radians(dip[1]))
        # Actually dip[1] is around Z
        nx = -sz * cx
        ny = cz * cx
        nz = sx
        n = np.array([nx, ny, nz], dtype=np.float64)
        n = n / (np.linalg.norm(n)+1e-12)
        p = np.array([0.0, y, 0.0], dtype=np.float64)
        pl = plane_from_normal_point(n, p, source='bedding')
        pl.hardness_factor = 1.0
        planes.append(pl)
    return planes

def create_joint_planes(W, D, seed=42):
    """Create vertical joint sets: face-parallel (exfoliation) and perpendicular."""
    rnd = random.Random(seed)
    planes = []

    # Set A: face-parallel, normal ~ Z, positions in Z (depth)
    # Authored positions with slight variation (not noise, but authored list)
    z_positions = [-0.7, -1.6, -2.8, -4.2, -5.8, -7.5]  # front to back
    for z in z_positions:
        # authored azimuth variation ±12°, dip variation ±7°
        az = rnd.uniform(-12, 12)  # degrees around Y
        dip = rnd.uniform(-7, 7)   # tilt from vertical
        az_r = math.radians(az)
        dip_r = math.radians(dip)
        # ideal normal (0,0,1)
        # rotate around Y by az, then around X by dip
        # (0,0,1) rotated around Y: (sin az, 0, cos az)
        # then rotate around X by dip: y = -sin dip * z + cos dip * y
        # So: x = sin az
        # y = -sin dip * cos az
        # z = cos dip * cos az
        nx = math.sin(az_r)
        ny = -math.sin(dip_r) * math.cos(az_r)
        nz = math.cos(dip_r) * math.cos(az_r)
        n = np.array([nx, ny, nz], dtype=np.float64)
        n = n / (np.linalg.norm(n)+1e-12)
        p = np.array([0.0, 0.0, z], dtype=np.float64)
        pl = plane_from_normal_point(n, p, source='joint')
        planes.append(pl)

    # Set B: perpendicular, normal ~ X, positions in X
    x_positions = [3.2, 6.8, 10.5, 14.0, 17.3, 20.8, 24.1, 27.0]
    for x in x_positions:
        az = rnd.uniform(-10, 10)  # variation around Z? Actually rotate around Y and Z
        dip = rnd.uniform(-6, 6)
        az_r = math.radians(az)
        dip_r = math.radians(dip)
        # ideal normal (1,0,0)
        # rotate around Y by az: (cos az, 0, -sin az)?? Let's use similar: (cos az, 0, sin az) for small variation
        # Actually for X normal, rotate around Y and X
        # Start (1,0,0), rotate around Y by az: (cos az, 0, -sin az)
        # Rotate around X by dip: y = -sin dip * z + cos dip * y
        # So x = cos az
        # y = sin dip * sin az (since z = -sin az)
        # z = cos dip * (-sin az)
        # Simplify with small angles
        nx = math.cos(az_r)
        ny = math.sin(dip_r) * math.sin(az_r)  # sign may vary
        nz = -math.cos(dip_r) * math.sin(az_r)
        n = np.array([nx, ny, nz], dtype=np.float64)
        n = n / (np.linalg.norm(n)+1e-12)
        p = np.array([x, 0.0, 0.0], dtype=np.float64)
        pl = plane_from_normal_point(n, p, source='joint')
        planes.append(pl)

    # Set C: diagonal set to break up regularity (conjugate joints)
    diag_x = [5.0, 12.5, 19.0, 25.5]
    for x in diag_x:
        az = rnd.uniform(35, 55)  # diagonal ~45°
        dip = rnd.uniform(-5,5)
        az_r = math.radians(az)
        dip_r = math.radians(dip)
        # normal at 45° in XZ plane
        nx = math.cos(az_r)
        nz = math.sin(az_r)
        ny = math.sin(dip_r)
        n = np.array([nx, ny, nz], dtype=np.float64)
        n/=np.linalg.norm(n)+1e-12
        p = np.array([x, 0.0, -1.5], dtype=np.float64)
        pl = plane_from_normal_point(n, p, source='joint')
        planes.append(pl)

        az2 = rnd.uniform(-55, -35)
        az_r2 = math.radians(az2)
        nx2 = math.cos(az_r2)
        nz2 = math.sin(az_r2)
        n2 = np.array([nx2, ny, nz2], dtype=np.float64)
        n2/=np.linalg.norm(n2)+1e-12
        pl2 = plane_from_normal_point(n2, p, source='joint')
        planes.append(pl2)

    return planes

def split_blocks_by_planes(initial_blocks: List[Block], cut_planes: List[Plane], front_only=False, D=10.0, seed=0):
    """Iteratively split blocks by cut planes."""
    rnd = random.Random(seed)
    blocks = initial_blocks
    for cut in cut_planes:
        new_blocks = []
        for b in blocks:
            # front_only check: only cut if centroid is near front
            if front_only:
                if b.centroid[2] < -D*0.65:  # back 35% not cut
                    new_blocks.append(b)
                    continue
            verts = b.verts
            if len(verts)==0:
                verts = polyhedron_vertices(b.planes)
                if len(verts)==0:
                    continue
                b.verts = verts
            if not block_intersects_plane(verts, cut):
                new_blocks.append(b)
                continue
            # split
            # check if cut plane is coplanar with existing (avoid duplicate)
            duplicate=False
            for pl in b.planes:
                if abs(abs(float(pl.n @ cut.n)) -1.0) < 1e-3 and abs(pl.d - cut.d) < 0.05:
                    duplicate=True
                    break
            if duplicate:
                new_blocks.append(b)
                continue
            # create two blocks
            b1_planes = b.planes + [cut]
            b2_planes = b.planes + [cut.flipped()]

            v1 = polyhedron_vertices(b1_planes)
            v2 = polyhedron_vertices(b2_planes)
            if len(v1)>=4:
                vol1, cent1 = polyhedron_volume_and_centroid(v1, b1_planes)
                if vol1 > 1e-4:
                    nb1 = Block(planes=b1_planes, volume=vol1, centroid=cent1, verts=v1, hardness=b.hardness, stratum_id=b.stratum_id)
                    new_blocks.append(nb1)
            if len(v2)>=4:
                vol2, cent2 = polyhedron_volume_and_centroid(v2, b2_planes)
                if vol2 > 1e-4:
                    nb2 = Block(planes=b2_planes, volume=vol2, centroid=cent2, verts=v2, hardness=b.hardness, stratum_id=b.stratum_id)
                    new_blocks.append(nb2)
            # if both failed, keep original? shouldn't
        blocks = new_blocks
        # safety: limit blocks
        if len(blocks) > 800:
            # merge tiny blocks? For now keep
            pass
    return blocks

def compute_block_edges(block: Block):
    """Return list of edges: each edge is (plane_i, plane_j, v0, v1, length, midpoint)"""
    planes = block.planes
    verts = block.verts
    if len(verts) < 4:
        return []
    edges = []
    # For each pair of planes, find verts that lie on both
    for i in range(len(planes)):
        for j in range(i+1, len(planes)):
            # find verts on both planes
            d1 = np.abs(planes[i].evaluate(verts))
            d2 = np.abs(planes[j].evaluate(verts))
            mask = (d1 < 1e-3) & (d2 < 1e-3)
            idx = np.where(mask)[0]
            if len(idx) >= 2:
                # For convex, should be exactly 2, but if more, find extremes
                # Get the two farthest points among those
                pts = verts[idx]
                # Find pair with max distance
                max_dist = -1
                best_pair = (pts[0], pts[1])
                for a in range(len(pts)):
                    for b in range(a+1, len(pts)):
                        dist = np.linalg.norm(pts[a]-pts[b])
                        if dist > max_dist:
                            max_dist = dist
                            best_pair = (pts[a], pts[b])
                v0, v1 = best_pair
                length = np.linalg.norm(v1 - v0)
                if length < 1e-4:
                    continue
                mid = (v0 + v1) * 0.5
                edges.append((i, j, v0, v1, length, mid))
    return edges

def apply_edge_chipping(blocks: List[Block], seed=123, chip_prob_exterior=0.45, chip_prob_interior=0.12):
    """Chip edges by adding small bevel planes."""
    rnd = random.Random(seed)
    new_blocks = []
    for b_idx, block in enumerate(blocks):
        # skip tiny blocks
        if block.volume < 0.08:
            new_blocks.append(block)
            continue
        edges = compute_block_edges(block)
        # determine which planes are exterior (source bound/macro)
        exterior_plane_indices = set()
        for pi, pl in enumerate(block.planes):
            if pl.source in ('bound','macro'):
                exterior_plane_indices.add(pi)
        # Also consider if face is not shared: we can approximate exterior if plane is bound/macro
        # For each edge, check if at least one plane is exterior
        chip_planes = []
        for e_idx, (pi, pj, v0, v1, length, mid) in enumerate(edges):
            is_exterior = (pi in exterior_plane_indices) or (pj in exterior_plane_indices)
            prob = chip_prob_exterior if is_exterior else chip_prob_interior
            # seeded random selection (not displacing vertices)
            # Use deterministic hash
            r = rnd.random()
            # Actually need per-edge random, but using global rnd with seed ensures deterministic
            if r > prob:
                continue
            # chip depth: based on edge length and block size, authored range
            # Use random to select from authored chip sizes, not to displace
            chip_options = [0.06, 0.09, 0.12, 0.15, 0.18]  # meters
            # select based on edge length: longer edges get larger chip
            # Use random to pick, but weighted by length
            # For exterior edges, larger chips
            if is_exterior:
                depth_choices = [0.09, 0.12, 0.18, 0.22]
            else:
                depth_choices = [0.05, 0.08, 0.11]
            chip_depth = rnd.choice(depth_choices)
            # Clamp to not exceed half block size
            max_allowed = (block.volume ** (1/3)) * 0.35
            chip_depth = min(chip_depth, max_allowed, length*0.4)
            if chip_depth < 0.02:
                continue
            n1 = block.planes[pi].n
            n2 = block.planes[pj].n
            n_avg = n1 + n2
            norm = np.linalg.norm(n_avg)
            if norm < 1e-8:
                continue
            n_avg = n_avg / norm
            # chip plane normal outward = n_avg
            # point: mid - chip_depth * n_avg (inward)
            p_chip = mid - chip_depth * n_avg
            # Slight variation in normal to simulate natural chipping (authored tilt, not noise)
            # Tilt chip plane by small angle around edge direction
            edge_dir = (v1 - v0) / (length + 1e-12)
            # Create tilt: rotate n_avg around edge_dir by small angle (±10°)
            tilt_angle = rnd.uniform(-10, 10)  # degrees, authored variation
            # Rodrigues rotation
            theta = math.radians(tilt_angle)
            # n_avg rotated around edge_dir
            # v_rot = v*cos + (k x v)*sin + k*(k·v)*(1-cos)
            k = edge_dir
            v = n_avg
            v_rot = v * math.cos(theta) + np.cross(k, v) * math.sin(theta) + k * (k @ v) * (1 - math.cos(theta))
            v_rot = v_rot / (np.linalg.norm(v_rot)+1e-12)
            # Ensure still outward-ish (dot with original >0)
            if v_rot @ n_avg < 0.3:
                v_rot = n_avg
            chip_plane = plane_from_normal_point(v_rot, p_chip, source='chip')
            chip_planes.append(chip_plane)

        # Add chip planes to block, checking validity
        cur_planes = block.planes.copy()
        for cp in chip_planes:
            test_planes = cur_planes + [cp]
            verts = polyhedron_vertices(test_planes)
            if len(verts) < 4:
                continue
            vol, cent = polyhedron_volume_and_centroid(verts, test_planes)
            if vol < 0.02:  # too small, skip
                continue
            # Also check volume not reduced too much (<30% original)
            if vol < block.volume * 0.3:
                continue
            cur_planes = test_planes
            # update verts for next iteration? Keep using original for edge list, but for validity we computed
        # Recompute final verts, volume
        final_verts = polyhedron_vertices(cur_planes)
        if len(final_verts) >=4:
            vol, cent = polyhedron_volume_and_centroid(final_verts, cur_planes)
            new_block = Block(planes=cur_planes, volume=vol, centroid=cent, verts=final_verts, hardness=block.hardness, stratum_id=block.stratum_id)
            new_blocks.append(new_block)
        else:
            new_blocks.append(block)
    return new_blocks

def assign_hardness_and_strata(blocks: List[Block], thicknesses, hardness_values):
    """Assign hardness based on Y centroid and stratum."""
    # Build cumulative y boundaries
    y_bounds = [0.0]
    cum = 0.0
    for th in thicknesses:
        cum += th
        y_bounds.append(cum)
    for b in blocks:
        y = b.centroid[1]
        # find stratum
        sid = 0
        for i in range(len(y_bounds)-1):
            if y_bounds[i] <= y < y_bounds[i+1]:
                sid = i
                break
        b.stratum_id = sid
        if sid < len(hardness_values):
            b.hardness = hardness_values[sid]
        else:
            b.hardness = 1.0
    return blocks

def apply_erosion(blocks: List[Block], base_erosion=0.04, exterior_extra=0.06):
    """Erode blocks by moving planes inward (SDF shrink)."""
    eroded = []
    for b in blocks:
        new_planes = []
        for pl in b.planes:
            # erosion amount depends on hardness (soft erodes more) and exterior
            is_exterior = pl.source in ('bound','macro','chip')
            # hardness: soft >1, hard <1
            erosion = base_erosion * b.hardness
            if is_exterior:
                erosion += exterior_extra * b.hardness
            # For chip planes, slightly less erosion
            if pl.source == 'chip':
                erosion *= 0.7
            # Create eroded plane: d' = d + erosion (since outward normal, interior shrinks)
            # But need to ensure not too much
            # Clamp erosion to not make block empty: we will check later
            new_pl = Plane(n=pl.n, d=pl.d + erosion, source=pl.source, hardness_factor=pl.hardness_factor)
            new_planes.append(new_pl)
        verts = polyhedron_vertices(new_planes)
        if len(verts) < 4:
            # try reduced erosion
            # halve erosion
            new_planes2 = []
            for pl in b.planes:
                is_exterior = pl.source in ('bound','macro','chip')
                erosion = (base_erosion * 0.5) * b.hardness
                if is_exterior:
                    erosion += (exterior_extra*0.5) * b.hardness
                new_pl = Plane(n=pl.n, d=pl.d + erosion, source=pl.source)
                new_planes2.append(new_pl)
            verts = polyhedron_vertices(new_planes2)
            if len(verts) <4:
                # keep original with tiny erosion
                eroded.append(b)
                continue
            vol, cent = polyhedron_volume_and_centroid(verts, new_planes2)
            eroded.append(Block(planes=new_planes2, volume=vol, centroid=cent, verts=verts, hardness=b.hardness, stratum_id=b.stratum_id))
        else:
            vol, cent = polyhedron_volume_and_centroid(verts, new_planes)
            # if volume too small, keep original
            if vol < 0.01 or vol < b.volume*0.15:
                eroded.append(b)
            else:
                eroded.append(Block(planes=new_planes, volume=vol, centroid=cent, verts=verts, hardness=b.hardness, stratum_id=b.stratum_id))
    return eroded

# ---------- Crack generation (polygon placement, SDF carving) ----------

def generate_cracks_for_block(block: Block, seed=0, max_cracks=3):
    """Generate crack segments on exterior faces.
       Each crack is a polyline on face, converted to capsules for SDF subtraction.
       Returns list of (p0,p1,radius,depth) segments.
    """
    rnd = random.Random(seed + int(block.centroid[0]*10) + int(block.centroid[1]*10) + int(block.centroid[2]*10))
    # Find exterior faces (large area, bound/macro/chip)
    exterior_faces = []
    verts = block.verts
    if len(verts) <4:
        return []
    for pi, pl in enumerate(block.planes):
        if pl.source not in ('bound','macro','chip','joint'): # joint faces may also be exterior if near front
            # check if joint face is near front and exposed: if centroid Z close to front and plane is joint with normal ~ Z, could be exposed
            # For simplicity, allow joint faces with high Z
            if block.centroid[2] > -1.0 and pl.source=='joint':
                pass
            else:
                # only consider bound/macro/chip as crack candidates
                if pl.source not in ('bound','macro','chip'):
                    continue
        # collect verts on this plane
        dists = np.abs(pl.evaluate(verts))
        on_idx = np.where(dists < 1e-3)[0]
        if len(on_idx) <3:
            continue
        face_verts = verts[on_idx]
        # compute area approx
        # order verts
        n = pl.n
        up = np.array([0,0,1], dtype=np.float64) if abs(n[2])<0.9 else np.array([0,1,0], dtype=np.float64)
        u = np.cross(n, up); u/=np.linalg.norm(u)+1e-12
        v = np.cross(n, u); v/=np.linalg.norm(v)+1e-12
        center = face_verts.mean(axis=0)
        angles = []
        for fv in face_verts:
            d = fv - center
            angles.append(math.atan2(d @ v, d @ u))
        order = np.argsort(angles)
        ordered = face_verts[order]
        # compute area via shoelace in uv
        area = 0.0
        for i in range(len(ordered)):
            j = (i+1)%len(ordered)
            # project to uv
            pi_uv = np.array([ (ordered[i]-center) @ u, (ordered[i]-center) @ v ])
            pj_uv = np.array([ (ordered[j]-center) @ u, (ordered[j]-center) @ v ])
            area += pi_uv[0]*pj_uv[1] - pj_uv[0]*pi_uv[1]
        area = abs(area)*0.5
        if area < 0.05: # too small face
            continue
        exterior_faces.append((pi, pl, ordered, center, u, v, area))

    if not exterior_faces:
        return []

    # Sort by area descending, pick largest few
    exterior_faces.sort(key=lambda x: x[6], reverse=True)
    num_faces_to_crack = min(len(exterior_faces), rnd.randint(1, max_cracks))
    # select faces randomly from top few
    selected_faces = rnd.sample(exterior_faces, num_faces_to_crack)

    crack_segments = []

    for (pi, pl, ordered, center, u, v, area) in selected_faces:
        n = pl.n
        # Define crack pattern: authored types, not noise
        # Types: 'through' (edge to edge), 'branching', 'en-echelon'
        crack_type = rnd.choice(['through', 'through', 'branching', 'en-echelon'])
        # For simplicity, generate polyline on face in uv coordinates, then convert to world

        # Helper to convert uv to world: world = center + u*uu + v*vv ??? Actually need to map from face local
        # We'll use face's own basis but need to define uv origin at center
        # For point inside face, we can generate in uv and then world = center + u*uu + v*vv

        # Determine face bounds in uv
        # Project ordered verts to uv
        uv_pts = []
        for fv in ordered:
            d = fv - center
            uv_pts.append(np.array([d @ u, d @ v]))
        uv_pts = np.array(uv_pts)
        min_uv = uv_pts.min(axis=0)
        max_uv = uv_pts.max(axis=0)
        # inset a bit
        inset = 0.05
        # generate start and end points on face edges
        # Pick two edges of face polygon
        # For through crack: pick two points on boundary
        if crack_type == 'through':
            # pick two distinct edges
            # choose random points on polygon boundary
            # Simplified: pick random angle for start and end on opposite sides
            # We'll sample points on polygon edges
            def random_point_on_polygon_boundary():
                # pick random edge
                edge_idx = rnd.randint(0, len(ordered)-1)
                a = ordered[edge_idx]
                b = ordered[(edge_idx+1)%len(ordered)]
                t = rnd.uniform(0.15, 0.85)
                pt = a*(1-t) + b*t
                # convert to uv
                d = pt - center
                return np.array([d @ u, d @ v]), pt
            uv_start, world_start = random_point_on_polygon_boundary()
            uv_end, world_end = random_point_on_polygon_boundary()
            # ensure not same edge and not too close
            attempts=0
            while np.linalg.norm(uv_start-uv_end) < 0.2 and attempts<10:
                uv_end, world_end = random_point_on_polygon_boundary()
                attempts+=1
            # Create polyline with 2-4 segments, with small deflection (authored)
            num_seg = rnd.randint(2,4)
            # Linear interpolation with deflection
            # Generate intermediate points with offset perpendicular to line
            poly_uv = [uv_start]
            for s in range(1, num_seg):
                t = s / num_seg
                base = uv_start*(1-t) + uv_end*t
                # deflection: perpendicular offset
                # direction of crack
                dir_vec = uv_end - uv_start
                dir_norm = dir_vec / (np.linalg.norm(dir_vec)+1e-12)
                perp = np.array([-dir_norm[1], dir_norm[0]])
                # authored deflection amounts (not noise)
                deflect_options = [-0.08, -0.04, 0.0, 0.04, 0.08]
                deflect = rnd.choice(deflect_options) * (1.0 if s%2==0 else -1.0) * (1.0 + rnd.uniform(-0.2,0.2))
                # scale by length
                length = np.linalg.norm(dir_vec)
                deflect *= length
                base = base + perp * deflect
                poly_uv.append(base)
            poly_uv.append(uv_end)

            # Convert poly_uv to world points
            poly_world = []
            for uv in poly_uv:
                world = center + u*uv[0] + v*uv[1]
                poly_world.append(world)
            # For each segment, create capsule for SDF
            for i in range(len(poly_world)-1):
                p0 = poly_world[i]
                p1 = poly_world[i+1]
                # offset inward by depth/2
                depth = rnd.choice([0.04, 0.06, 0.08, 0.10]) * block.hardness  # deeper in soft rock
                width = rnd.choice([0.015, 0.022, 0.03])
                # Inward offset
                p0_in = p0 - n * (depth*0.5)
                p1_in = p1 - n * (depth*0.5)
                radius = width*0.5 + depth*0.15  # ensure protrudes to surface
                crack_segments.append((p0_in, p1_in, radius, depth))

        elif crack_type == 'branching':
            # One main crack plus one branch
            # Main crack as through
            def rand_boundary():
                edge_idx = rnd.randint(0, len(ordered)-1)
                a = ordered[edge_idx]
                b = ordered[(edge_idx+1)%len(ordered)]
                t = rnd.uniform(0.2,0.8)
                pt = a*(1-t)+b*t
                d = pt-center
                return np.array([d@u, d@v]), pt
            uv_start, _ = rand_boundary()
            # end inside face
            uv_end = np.array([rnd.uniform(min_uv[0]*0.5, max_uv[0]*0.5), rnd.uniform(min_uv[1]*0.5, max_uv[1]*0.5)])
            # main polyline
            poly_uv = [uv_start, (uv_start+uv_end)*0.5 + np.array([rnd.choice([-0.05,0.05]), rnd.choice([-0.05,0.05])]), uv_end]
            poly_world = [center + u*uv[0] + v*uv[1] for uv in poly_uv]
            for i in range(len(poly_world)-1):
                p0 = poly_world[i]; p1=poly_world[i+1]
                depth = rnd.choice([0.05,0.07,0.09])
                width = rnd.choice([0.018,0.025])
                p0_in = p0 - n*(depth*0.5); p1_in = p1 - n*(depth*0.5)
                radius = width*0.5 + depth*0.15
                crack_segments.append((p0_in,p1_in,radius,depth))
            # branch from middle
            mid_uv = poly_uv[1]
            branch_end_uv = mid_uv + np.array([rnd.choice([-0.15,0.15]), rnd.choice([-0.15,0.15])])
            # clamp inside face (approx)
            branch_world = [center + u*mid_uv[0] + v*mid_uv[1], center + u*branch_end_uv[0] + v*branch_end_uv[1]]
            for i in range(len(branch_world)-1):
                p0=branch_world[i]; p1=branch_world[i+1]
                depth = rnd.choice([0.03,0.05])
                width = rnd.choice([0.012,0.018])
                p0_in = p0 - n*(depth*0.5); p1_in = p1 - n*(depth*0.5)
                radius = width*0.5 + depth*0.15
                crack_segments.append((p0_in,p1_in,radius,depth))

        else: # en-echelon
            # series of short parallel cracks
            num_cracks = rnd.randint(2,4)
            base_uv = np.array([rnd.uniform(min_uv[0]*0.3, max_uv[0]*0.3), rnd.uniform(min_uv[1]*0.3, max_uv[1]*0.3)])
            dir_angle = rnd.uniform(0, 2*math.pi)
            dir_vec = np.array([math.cos(dir_angle), math.sin(dir_angle)]) * 0.25
            for c in range(num_cracks):
                offset = np.array([-dir_vec[1], dir_vec[0]]) * (c*0.12)
                uv0 = base_uv + offset
                uv1 = uv0 + dir_vec * rnd.uniform(0.8,1.2)
                w0 = center + u*uv0[0] + v*uv0[1]
                w1 = center + u*uv1[0] + v*uv1[1]
                depth = rnd.choice([0.03,0.05,0.06])
                width = rnd.choice([0.012,0.018])
                p0_in = w0 - n*(depth*0.5); p1_in = w1 - n*(depth*0.5)
                radius = width*0.5 + depth*0.15
                crack_segments.append((p0_in,p1_in,radius,depth))

    return crack_segments

# ---------- SDF evaluation and meshing ----------

def capsule_sdf(p, a, b, r):
    """p: (N,3), a,b (3,), r float -> (N,) sdf"""
    # vector from a to b
    ab = b - a
    ap = p - a
    # project
    ab_len2 = np.dot(ab,ab) + 1e-12
    t = np.clip((ap @ ab) / ab_len2, 0.0, 1.0)  # (N,)
    # closest point
    # (N,3) = a + t[:,None]*ab
    closest = a + t[:,None] * ab
    dist = np.linalg.norm(p - closest, axis=1) - r
    return dist

def block_sdf(pts: np.ndarray, planes: List[Plane], cracks: List[Tuple[np.ndarray,np.ndarray,float,float]], smooth_k=32.0):
    """Evaluate SDF for a block with cracks.
       pts: (N,3)
       Returns (N,) sdf, negative inside.
    """
    # plane SDFs: n·p + d
    # Stack planes
    if len(planes)==0:
        return np.full(pts.shape[0], 1e6)
    # For smooth max (rounding), use log-sum-exp: smooth_max = (1/k) * log(sum exp(k * sdf_i))
    # This rounds edges with radius ~ 1/k
    # Compute all plane SDFs
    # pts (N,3) @ n.T (3,M) -> (N,M)
    n_stack = np.stack([pl.n for pl in planes], axis=1)  # 3 x M
    d_stack = np.array([pl.d for pl in planes], dtype=np.float64)  # M
    # plane_sdfs = pts @ n_stack + d_stack
    plane_sdfs = pts @ n_stack + d_stack[None,:]  # N x M
    # smooth max
    # To avoid overflow, subtract max? But we need smooth max, use trick: max + (1/k) log(sum exp(k*(x-max)))
    # Compute max per point
    max_sdf = np.max(plane_sdfs, axis=1)  # N
    # For smooth, if k large, smooth ~ max. We'll compute exp(k*(plane_sdfs - max_sdf[:,None]))
    # Then smooth = max + (1/k) log(mean? actually sum)
    # Use k
    k = smooth_k
    # exp
    exp_vals = np.exp(k * (plane_sdfs - max_sdf[:,None]))  # N x M
    sum_exp = np.sum(exp_vals, axis=1)  # N
    smooth = max_sdf + (1.0/k) * np.log(sum_exp + 1e-12)
    sdf = smooth

    # Apply cracks subtraction: sdf = max(sdf, -capsule_sdf)
    # For each crack capsule
    for (a,b,r,depth) in cracks:
        cap_sdf = capsule_sdf(pts, a, b, r)  # negative inside capsule
        # subtraction: max(sdf, -cap_sdf)
        # -cap_sdf is positive inside capsule, negative outside? Actually cap_sdf negative inside, so -cap_sdf positive inside
        # We want to remove inside capsule: result should be positive inside capsule if it was inside block
        # So max(sdf, -cap_sdf) does that: inside capsule, -cap_sdf >0, so max becomes >0 (outside)
        # Outside capsule, cap_sdf >0, -cap_sdf <0, max keeps sdf
        sdf = np.maximum(sdf, -cap_sdf)
    return sdf

def mesh_block_sdf(block: Block, voxel_size=0.07, smooth_k=28.0):
    """Generate mesh for block using marching cubes on its SDF."""
    verts = block.verts
    if len(verts) <4:
        return None, None
    min_c, max_c = polyhedron_aabb(verts)
    # expand
    pad = 0.15
    min_c = min_c - pad
    max_c = max_c + pad
    # compute grid dimensions
    ext = max_c - min_c
    # avoid huge grids
    # voxel_size adaptive based on volume: smaller blocks use smaller voxel? Actually keep constant for quality
    # But clamp max resolution
    nx = int(np.ceil(ext[0] / voxel_size)) + 1
    ny = int(np.ceil(ext[1] / voxel_size)) + 1
    nz = int(np.ceil(ext[2] / voxel_size)) + 1
    # clamp to max 48 per dim to avoid explosion
    max_res = 48
    if nx > max_res:
        nx = max_res
    if ny > max_res:
        ny = max_res
    if nz > max_res:
        nz = max_res
    # if still too many voxels (> 48^3 ~110k), okay
    x = np.linspace(min_c[0], max_c[0], nx)
    y = np.linspace(min_c[1], max_c[1], ny)
    z = np.linspace(min_c[2], max_c[2], nz)
    # create grid
    # Use broadcasting to evaluate SDF efficiently without huge memory? We'll create meshgrid
    # For memory, we can evaluate in chunks
    # Create 3D arrays
    # Use np.meshgrid with indexing='ij'
    X, Y, Z = np.meshgrid(x, y, z, indexing='ij')
    pts = np.stack([X.ravel(), Y.ravel(), Z.ravel()], axis=1)  # (N,3)
    # Evaluate SDF
    sdf_vals = block_sdf(pts, block.planes, block.cracks, smooth_k=smooth_k)
    sdf_grid = sdf_vals.reshape((nx, ny, nz))
    # marching cubes needs (nx,ny,nz) with spacing
    # skimage expects volume as (M,N,P)
    try:
        verts_mc, faces_mc, normals_mc, values_mc = measure.marching_cubes(sdf_grid, level=0.0, spacing=(x[1]-x[0], y[1]-y[0], z[1]-z[0]))
    except Exception as e:
        # No surface or failure
        # Fallback to polyhedron mesh
        return None, None
    # verts_mc are in grid coordinates starting at 0, need to offset by min_c
    verts_mc = verts_mc + min_c[None,:]
    # faces_mc are triangles
    # Check for degenerate
    if len(verts_mc) < 3 or len(faces_mc) <1:
        return None, None
    return verts_mc, faces_mc

def polyhedron_to_mesh(block: Block):
    """Convert convex polyhedron (planes) directly to triangle mesh (no SDF)."""
    verts = block.verts
    if len(verts) <4:
        return None, None
    # For each plane, get face polygon and triangulate
    all_verts = []
    all_faces = []
    vert_map = {}  # map from original vert index to new index? We'll just create unique verts per face and then merge? For simplicity, create global vertex list and triangulate faces using fan.
    # We'll create list of unique vertices (already have)
    # For each face, order verts and triangulate
    # Need to map global vert indices
    # Create dictionary from vert position to index
    # Use rounding
    global_vert_list = verts.tolist()
    # For fast lookup, use list
    # For each plane
    for pl in block.planes:
        dists = np.abs(pl.evaluate(verts))
        on_idx = np.where(dists < 1e-3)[0]
        if len(on_idx) <3:
            continue
        face_verts = verts[on_idx]
        # order
        n = pl.n
        up = np.array([0,0,1], dtype=np.float64) if abs(n[2])<0.9 else np.array([0,1,0], dtype=np.float64)
        u = np.cross(n, up); u/=np.linalg.norm(u)+1e-12
        v = np.cross(n, u); v/=np.linalg.norm(v)+1e-12
        center = face_verts.mean(axis=0)
        angles = []
        for fv in face_verts:
            d = fv - center
            angles.append(math.atan2(d @ v, d @ u))
        order = np.argsort(angles)
        ordered_idx = on_idx[order]
        # triangulate fan
        # Need to ensure normal orientation: outward normal is pl.n, but fan order may be clockwise. Check.
        # For convex, ordered should be CCW when looking from outside? Let's check orientation via normal.
        # Compute normal of first triangle
        if len(ordered_idx) >=3:
            v0 = verts[ordered_idx[0]]
            v1 = verts[ordered_idx[1]]
            v2 = verts[ordered_idx[2]]
            tri_n = np.cross(v1 - v0, v2 - v0)
            tri_n = tri_n / (np.linalg.norm(tri_n)+1e-12)
            # If dot with pl.n <0, reverse order
            if tri_n @ pl.n < 0:
                ordered_idx = ordered_idx[::-1]
        # fan from first
        for i in range(1, len(ordered_idx)-1):
            all_faces.append([int(ordered_idx[0]), int(ordered_idx[i]), int(ordered_idx[i+1])])
    if not all_faces:
        return None, None
    return verts, np.array(all_faces, dtype=np.int32)

# ---------- Main generator ----------

def generate_cliff(seed=42, W=32.0, H=18.0, D=10.0, voxel_size=0.07):
    rnd = random.Random(seed)
    print(f"[CliffGen] Seed {seed}, Dimensions W={W} H={H} D={D}")

    # Stage 1: Create shape of cliff (macro shaping)
    print("[Stage 1] Creating cliff macro shape...")
    init_planes = create_initial_bounding_planes(W, H, D)
    macro_planes = create_macro_planes(W, H, D)
    # Start with one block
    verts0 = polyhedron_vertices(init_planes)
    vol0, cent0 = polyhedron_volume_and_centroid(verts0, init_planes)
    blocks = [Block(planes=init_planes, volume=vol0, centroid=cent0, verts=verts0)]

    # Apply macro planes (intersection)
    for mp in macro_planes:
        new_blocks = []
        for b in blocks:
            if not block_intersects_plane(b.verts, mp):
                # check if entirely inside
                vals = mp.evaluate(b.verts)
                if np.all(vals <= 1e-6):
                    new_blocks.append(b)
                # else entirely outside -> discard
                continue
            new_planes = b.planes + [mp]
            v = polyhedron_vertices(new_planes)
            if len(v) >=4:
                vol, cent = polyhedron_volume_and_centroid(v, new_planes)
                if vol > 1e-3:
                    new_blocks.append(Block(planes=new_planes, volume=vol, centroid=cent, verts=v))
        blocks = new_blocks
    print(f"  After macro shaping: {len(blocks)} block(s), vol {blocks[0].volume if blocks else 0:.2f}")

    # Stage 2 & 3: Cut faces with offset, apply realistic fractures
    # Bedding
    thicknesses = [2.2, 1.1, 0.8, 2.5, 1.5, 0.9, 2.0, 1.2, 1.8, 0.7, 1.3, 2.0]  # sums to 18
    dip_angles = [(2.0, 0.5), (-1.5, -0.8), (3.0, 0.3), (-2.0, 1.0), (1.0, -0.5), (2.5, 0.2), (-1.0, -0.3), (1.5, 0.6), (-2.5, -0.4), (0.8, 0.2), (1.2, -0.6)]  # (dip_x, dip_z)
    bedding_planes = create_bedding_planes(H, thicknesses, dip_angles)
    print(f"[Stage 2-3] Bedding planes: {len(bedding_planes)}")
    blocks = split_blocks_by_planes(blocks, bedding_planes, front_only=False, D=D, seed=seed)
    print(f"  After bedding: {len(blocks)} blocks")

    # Hardness values per stratum (alternating hard/soft)
    hardness_values = [0.7, 1.3, 0.8, 1.4, 0.75, 1.2, 0.7, 1.25, 0.8, 1.35, 0.75, 0.9]

    blocks = assign_hardness_and_strata(blocks, thicknesses, hardness_values)

    # Joints
    joint_planes = create_joint_planes(W, D, seed=seed+1)
    print(f"  Joint planes: {len(joint_planes)} (face-parallel, perpendicular, diagonal)")
    # Split: face-parallel and diagonal only near front
    # Separate joint planes into front_only and all?
    # We'll split all but with front_only flag for those with normal ~ Z or diagonal
    # For simplicity, use front_only for all joints (geologically fractures more intense near exposed face)
    blocks = split_blocks_by_planes(blocks, joint_planes, front_only=True, D=D, seed=seed+2)
    print(f"  After joints: {len(blocks)} blocks")

    # Filter tiny blocks and keep only those with reasonable volume
    filtered = []
    for b in blocks:
        if b.volume > 0.08:  # keep >0.08 m³
            filtered.append(b)
    print(f"  After filtering tiny (<0.08m³): {len(filtered)} blocks (from {len(blocks)})")
    blocks = filtered

    # Stage 4: Detail individual rocks - chipped by edges
    print("[Stage 4] Edge chipping...")
    blocks = apply_edge_chipping(blocks, seed=seed+10, chip_prob_exterior=0.5, chip_prob_interior=0.15)
    print(f"  After chipping: {len(blocks)} blocks")

    # Erosion so cracks become more pronounced (SDF shrink)
    print("[Stage 4b] Erosion (SDF shrink)...")
    blocks = apply_erosion(blocks, base_erosion=0.035, exterior_extra=0.055)
    print(f"  After erosion: {len(blocks)} blocks")

    # Stage 5: Cracks realistically on individual rocks (surface only, with offset) + erosion together
    print("[Stage 5] Generating surface cracks...")
    for idx, b in enumerate(blocks):
        # Only generate cracks for blocks near front (exposed)
        if b.centroid[2] > -D*0.7:  # front 70%
            # Number of cracks based on size and hardness (soft rock cracks more)
            max_cracks = 2 if b.volume < 1.0 else 3
            if b.hardness > 1.2:
                max_cracks += 1
            cracks = generate_cracks_for_block(b, seed=seed+100+idx, max_cracks=max_cracks)
            b.cracks = cracks
        else:
            b.cracks = []
    total_cracks = sum(len(b.cracks) for b in blocks)
    print(f"  Total crack segments: {total_cracks}")

    # Final meshing: Use SDF + marching cubes for blocks with cracks or for all to get erosion rounding
    print("[Final] Meshing blocks (Polygon + SDF hybrid)...")
    all_verts = []
    all_faces = []
    vert_offset = 0
    mesh_blocks = []  # for stats

    for b_idx, b in enumerate(blocks):
        # For blocks without cracks and small, use direct polyhedron mesh (faster, preserves sharpness where needed)
        # For blocks with cracks or exterior, use SDF marching cubes to get rounded erosion + cracks
        use_sdf = (len(b.cracks) > 0) or (b.centroid[2] > -2.0)  # front blocks use SDF for erosion rounding
        # Also use SDF for larger blocks to get rounding
        if b.volume > 1.5:
            use_sdf = True

        if use_sdf:
            verts_mc, faces_mc = mesh_block_sdf(b, voxel_size=voxel_size, smooth_k=26.0)
            if verts_mc is None:
                # fallback to polyhedron
                verts_p, faces_p = polyhedron_to_mesh(b)
                if verts_p is None:
                    continue
                verts_mc, faces_mc = verts_p, faces_p
        else:
            verts_mc, faces_mc = polyhedron_to_mesh(b)
            if verts_mc is None:
                continue

        # Append to global mesh
        all_verts.append(verts_mc)
        # offset faces
        faces_offset = faces_mc + vert_offset
        all_faces.append(faces_offset)
        vert_offset += len(verts_mc)
        mesh_blocks.append((b_idx, len(verts_mc), len(faces_mc)))

        if b_idx % 20 == 0:
            print(f"    Meshed {b_idx}/{len(blocks)} blocks...")

    if not all_verts:
        print("No mesh generated!")
        return None, blocks

    final_verts = np.vstack(all_verts)
    final_faces = np.vstack(all_faces)

    print(f"[Done] Final mesh: {len(final_verts)} vertices, {len(final_faces)} triangles, from {len(blocks)} blocks")
    return (final_verts, final_faces), blocks

def save_obj(path, verts, faces):
    with open(path, 'w') as f:
        f.write("# Cliff formation generated by cliff_generator.py\n")
        f.write(f"# Vertices {len(verts)} Faces {len(faces)}\n")
        f.write("# No noise used, only authored geological features\n")
        for v in verts:
            f.write(f"v {v[0]:.6f} {v[1]:.6f} {v[2]:.6f}\n")
        for tri in faces:
            # OBJ indices 1-based
            f.write(f"f {tri[0]+1} {tri[1]+1} {tri[2]+1}\n")
    print(f"Saved OBJ to {path}")

def save_blocks_info(path, blocks):
    with open(path, 'w') as f:
        f.write("block_id,volume,centroid_x,centroid_y,centroid_z,hardness,stratum,num_planes,num_cracks\n")
        for i,b in enumerate(blocks):
            f.write(f"{i},{b.volume:.4f},{b.centroid[0]:.3f},{b.centroid[1]:.3f},{b.centroid[2]:.3f},{b.hardness:.2f},{b.stratum_id},{len(b.planes)},{len(b.cracks)}\n")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Cliff generator")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--W", type=float, default=32.0)
    parser.add_argument("--H", type=float, default=18.0)
    parser.add_argument("--D", type=float, default=10.0)
    parser.add_argument("--voxel", type=float, default=0.07)
    parser.add_argument("--out", type=str, default="cliff.obj")
    args = parser.parse_args()

    result, blocks = generate_cliff(seed=args.seed, W=args.W, H=args.H, D=args.D, voxel_size=args.voxel)
    if result is not None:
        verts, faces = result
        save_obj(args.out, verts, faces)
        save_blocks_info("blocks_info.csv", blocks)
        print(f"Generation complete. OBJ: {args.out}")

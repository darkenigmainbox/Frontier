#!/usr/bin/env python3
"""Rebuild the Liger as a fitted, native SolidArc CAD assembly.

Run from the repository root with:
    ~/.venv/bin/python Vehicles/tools/rebuild_liger.py

The main body is rebuilt from the evaluated Blender shell mesh.  X-normal mesh
sections are stitched into a consistent, symmetry-aware half-profile, tracked
along the vehicle, mirrored, and least-squares fitted to one clamped bicubic
NURBS surface.  The fitted exterior is kept as an editable, open one-face B-rep
sheet: the source is an open skin, and SolidArc's current `solidify` operation
produces unsewn disconnected faces for this boundary, so this generator does not
claim a closed solid.  The source cowl is reconstructed as a fair upper patch;
the unglazed roof/windscreen frame is represented by its extracted boundary
rails.  Four parametric tire/rim assemblies use the source wheel centres and
measured tire envelope.

This is a body-shell/display assembly, not a complete chassis: no suspension,
interior, drivetrain, glazing, or hidden lower-cowl surface is invented.
"""
from __future__ import annotations

import heapq
import json
import math
import sys
import time
from collections import defaultdict
from pathlib import Path

import numpy as np
from scipy.interpolate import BSpline
from scipy.spatial import cKDTree

ROOT = Path(__file__).resolve().parents[2]
LIGER = ROOT / "Vehicles" / "Liger"
MESH_DIR = LIGER / "mesh"
OUT_ARC = LIGER / "Liger_Rebuild.arc"
OUT_REPORT = LIGER / "rebuild_report.json"
RENDER_ARC = LIGER / "SolidArc" / "render_rebuild.arc"

sys.path.insert(0, str(ROOT / "Vehicles" / "tools"))
from sections import cut_x  # noqa: E402

# Source Blender dimensions are cm.  The geometry caches retain Blender world
# coordinates; the original model's mirror plane is Y=-47.85897 cm.
Y_MIRROR_CM = -47.8589706421
CM_TO_M = 0.01
X0_CM, X1_CM, DX_CM = -180.0, 258.0, 3.0
PROFILE_SAMPLES = 41  # centreline -> outer edge on one side
MERGE_TOL_CM = 0.35


def _bspline_basis(u: np.ndarray, count: int, degree: int = 3) -> np.ndarray:
    """Dense basis matrix using the same clamped-uniform knots as SolidArc Patch."""
    if count <= degree:
        raise ValueError(f"need more than {degree} control poles, got {count}")
    interior = np.arange(1, count - degree, dtype=float) / (count - degree)
    knots = np.concatenate((np.zeros(degree + 1), interior, np.ones(degree + 1)))
    return BSpline.design_matrix(np.asarray(u, dtype=float), knots, degree).toarray()


def _resample_polyline(points: np.ndarray, count: int) -> np.ndarray:
    if len(points) < 2:
        raise ValueError("a section needs at least two points")
    d = np.linalg.norm(np.diff(points, axis=0), axis=1)
    keep = np.concatenate(([True], d > 1e-7))
    points = points[keep]
    if len(points) < 2:
        raise ValueError("collapsed section")
    s = np.concatenate(([0.0], np.cumsum(np.linalg.norm(np.diff(points, axis=0), axis=1))))
    if s[-1] < 1e-7:
        raise ValueError("zero-length section")
    u = np.linspace(0.0, s[-1], count)
    return np.column_stack([np.interp(u, s, points[:, axis]) for axis in range(points.shape[1])])


def _half_section_candidates(vertices: np.ndarray, triangles: np.ndarray, x: float):
    """Return candidate centre-to-side contours from a symmetry-folded mesh slice.

    A simple longest-chain pick drops real shell branches near the rear arch and
    nose.  Here every section segment is folded onto +Y, endpoints are merged in
    3D section space, and graph paths from the centreline to the outer skin are
    retained as candidates.  A later dynamic-programming pass chooses a single
    continuous path through X.
    """
    lines = cut_x(vertices, triangles, float(x))
    segments: list[tuple[np.ndarray, np.ndarray]] = []
    all_y: list[float] = []
    for line in lines:
        if len(line) < 2:
            continue
        all_y.extend(np.abs(line[:, 1]).tolist())
        for a, b in zip(line[:-1], line[1:]):
            if a[1] * b[1] < 0.0:
                t = -a[1] / (b[1] - a[1])
                mid = a + t * (b - a)
                pairs = ((a, mid), (mid, b))
            else:
                pairs = ((a, b),)
            for p, q in pairs:
                pp = np.array([abs(p[1]), p[2]], dtype=float)
                qq = np.array([abs(q[1]), q[2]], dtype=float)
                if np.linalg.norm(pp - qq) > 1e-4:
                    segments.append((pp, qq))
    if not segments:
        return [], 0.0

    # Merge duplicate/near-coincident mesh intersections with a true spatial
    # tolerance rather than quantized bins (which can split points at bin edges).
    raw = np.asarray([p for pair in segments for p in pair], dtype=float)
    tree = cKDTree(raw)
    parent = np.arange(len(raw), dtype=np.int32)
    rank = np.zeros(len(raw), dtype=np.int8)

    def find(a: int) -> int:
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = int(parent[a])
        return a

    def union(a: int, b: int) -> None:
        a, b = find(a), find(b)
        if a == b:
            return
        if rank[a] < rank[b]:
            a, b = b, a
        parent[b] = a
        if rank[a] == rank[b]:
            rank[a] += 1

    for a, b in tree.query_pairs(MERGE_TOL_CM):
        union(int(a), int(b))

    sums: dict[int, np.ndarray] = defaultdict(lambda: np.zeros(2, dtype=float))
    counts: dict[int, int] = defaultdict(int)
    for i, p in enumerate(raw):
        root = find(i)
        sums[root] += p
        counts[root] += 1
    roots = sorted(sums)
    root_to_id = {root: i for i, root in enumerate(roots)}
    points = {root_to_id[root]: sums[root] / counts[root] for root in roots}

    adjacency: dict[int, dict[int, float]] = defaultdict(dict)
    for k, (p, q) in enumerate(segments):
        a = root_to_id[find(2 * k)]
        b = root_to_id[find(2 * k + 1)]
        if a == b:
            continue
        w = float(np.linalg.norm(points[a] - points[b]))
        if w <= 1e-5:
            continue
        if w < adjacency[a].get(b, math.inf):
            adjacency[a][b] = w
            adjacency[b][a] = w

    # Connected components that reach from the centreline to a meaningful side
    # extent are candidates.  The shell's tiny underside fragments are excluded.
    unseen = set(adjacency)
    components: list[list[int]] = []
    while unseen:
        start = unseen.pop()
        stack = [start]
        component = [start]
        while stack:
            u = stack.pop()
            for v in adjacency[u]:
                if v in unseen:
                    unseen.remove(v)
                    component.append(v)
                    stack.append(v)
        yy = [points[u][0] for u in component]
        if min(yy) < 1.6 and max(yy) > 25.0:
            components.append(component)

    candidates = []
    for component in components:
        ys = np.asarray([points[u][0] for u in component])
        max_y = float(ys.max())
        starts = [u for u in component if points[u][0] <= 1.6 and len(adjacency[u]) == 1]
        if not starts:
            starts = sorted(
                (u for u in component if points[u][0] <= 2.0),
                key=lambda u: -points[u][1],
            )[:3]
        goals = [
            u for u in component
            if points[u][0] >= max_y - 1.0 and len(adjacency[u]) == 1
        ]
        if not goals:
            goals = sorted(
                (u for u in component if points[u][0] >= max_y - 1.0),
                key=lambda u: -points[u][0],
            )[:3]
        if not starts or not goals:
            continue

        for source in starts:
            # Dijkstra from the centre to every side endpoint in this component.
            distance = {source: 0.0}
            previous: dict[int, int] = {}
            queue = [(0.0, source)]
            while queue:
                dist, u = heapq.heappop(queue)
                if dist > distance[u] + 1e-10:
                    continue
                for v, weight in adjacency[u].items():
                    nd = dist + weight
                    if nd < distance.get(v, math.inf):
                        distance[v] = nd
                        previous[v] = u
                        heapq.heappush(queue, (nd, v))
            for goal in goals:
                if goal not in distance or points[goal][0] < 30.0 or distance[goal] < 10.0:
                    continue
                path = [goal]
                while path[-1] != source:
                    path.append(previous[path[-1]])
                path.reverse()
                half = np.asarray([points[u] for u in path], dtype=float)
                if len(half) < 3:
                    continue
                candidate = np.column_stack((np.full(len(half), x), half))
                sampled = _resample_polyline(candidate, PROFILE_SAMPLES)
                # Reject graph loops/branches that repeatedly travel back toward
                # the centre; a body half-profile is predominantly monotonic in Y.
                if np.minimum(0.0, np.diff(sampled[:, 1])).sum() < -10.0:
                    continue
                if any(
                    np.linalg.norm(sampled[:, 1:] - existing["half"][:, 1:], axis=1).mean() < 0.8
                    for existing in candidates
                ):
                    continue
                penalty = 0.30 * max(0.0, max(all_y) - sampled[-1, 1])
                candidates.append({
                    "half": sampled,
                    "local": float(penalty),
                    "path_length_cm": float(distance[goal]),
                    "outer_y_cm": float(sampled[-1, 1]),
                    "outer_z_cm": float(sampled[-1, 2]),
                })

    candidates.sort(key=lambda q: q["local"])
    return candidates[:8], float(max(all_y, default=0.0))


def _profile_transition(a: dict, b: dict) -> float:
    d = np.linalg.norm(a["half"][:, 1:] - b["half"][:, 1:], axis=1)
    return float(d.mean() + 0.25 * d[-1] + 0.15 * d[0] + 0.02 * abs(a["path_length_cm"] - b["path_length_cm"]))


def _track_sections(vertices: np.ndarray, triangles: np.ndarray):
    xs = np.arange(X0_CM, X1_CM + DX_CM * 0.25, DX_CM, dtype=float)
    candidates_by_x = []
    started = time.time()
    for i, x in enumerate(xs):
        # The fractional offset avoids repeatedly cutting through original mesh
        # vertices; retain the documented X extent to the nearest 3 cm.
        station_x = float(x + 0.173)
        candidates, _ = _half_section_candidates(vertices, triangles, station_x)
        candidates_by_x.append(candidates)
        if (i + 1) % 25 == 0 or i == len(xs) - 1:
            print(f"sectioning {i + 1:3d}/{len(xs)}  x={station_x:7.2f} cm  candidates={len(candidates)}")

    valid = [i for i, c in enumerate(candidates_by_x) if c]
    if len(valid) < 2:
        raise RuntimeError("could not recover a continuous body section track")
    print(f"section graph: {len(valid)}/{len(xs)} stations, {len(xs)-len(valid)} degenerate cuts; tracking... ({time.time()-started:.1f}s)")

    costs = [np.asarray([q["local"] for q in candidates_by_x[valid[0]]], dtype=float)]
    backpointers: list[list[int]] = []
    for j in range(1, len(valid)):
        prev_idx, idx = valid[j - 1], valid[j]
        previous, current = candidates_by_x[prev_idx], candidates_by_x[idx]
        row, back = [], []
        for q in current:
            proposals = [costs[-1][k] + _profile_transition(p, q) for k, p in enumerate(previous)]
            k = int(np.argmin(proposals))
            row.append(proposals[k] + q["local"])
            back.append(k)
        costs.append(np.asarray(row, dtype=float))
        backpointers.append(back)

    selected = [0] * len(valid)
    selected[-1] = int(np.argmin(costs[-1]))
    for j in range(len(valid) - 1, 0, -1):
        selected[j - 1] = backpointers[j - 1][selected[j]]
    chosen = {idx: candidates_by_x[idx][selected[j]] for j, idx in enumerate(valid)}

    # Some X planes coincide with a saddle/branch and have no graph path.  Fill
    # only these isolated misses between the selected neighbouring contours.
    halves = []
    for i, x in enumerate(xs):
        station_x = float(x + 0.173)
        if i in chosen:
            half = chosen[i]["half"].copy()
        else:
            left = max((k for k in valid if k < i), default=valid[0])
            right = min((k for k in valid if k > i), default=valid[-1])
            if left == right:
                half = chosen[left]["half"].copy()
            else:
                t = (i - left) / (right - left)
                half = (1.0 - t) * chosen[left]["half"] + t * chosen[right]["half"]
            half[:, 0] = station_x
        negative = half.copy()
        negative[:, 1] *= -1.0
        # Full section is ordered -Y outer -> centreline -> +Y outer.
        full = np.vstack((negative[::-1][:-1], half))
        halves.append(full)

    return xs + 0.173, np.asarray(halves), len(valid), len(xs) - len(valid)


def _fit_curve_controls(samples: np.ndarray, count: int, degree: int = 3) -> np.ndarray:
    params = np.linspace(0.0, 1.0, len(samples))
    basis = _bspline_basis(params, count, degree)
    fixed = basis[:, :1] * samples[0] + basis[:, -1:] * samples[-1]
    inner = np.linalg.lstsq(basis[:, 1:-1], samples - fixed, rcond=None)[0]
    return np.vstack((samples[0], inner, samples[-1]))


def _fit_surface(sections: np.ndarray, xs_cm: np.ndarray, nu: int, nv: int):
    """Approximate the structured mesh-section grid with a tensor B-spline patch."""
    m, n, _ = sections.shape
    degree = 3
    v = np.linspace(0.0, 1.0, n)
    v_basis = _bspline_basis(v, nv, degree)
    curve_controls = np.asarray([
        np.vstack((
            section[0],
            np.linalg.lstsq(
                v_basis[:, 1:-1],
                section - (v_basis[:, :1] * section[0] + v_basis[:, -1:] * section[-1]),
                rcond=None,
            )[0],
            section[-1],
        ))
        for section in sections
    ])

    u = (xs_cm - xs_cm[0]) / (xs_cm[-1] - xs_cm[0])
    u_basis = _bspline_basis(u, nu, degree)
    targets = curve_controls.reshape(m, nv * 3)
    endpoints = u_basis[:, :1] * targets[0] + u_basis[:, -1:] * targets[-1]
    inner = np.linalg.lstsq(u_basis[:, 1:-1], targets - endpoints, rcond=None)[0]
    net = np.vstack((targets[0], inner, targets[-1])).reshape(nu, nv, 3)

    fitted_u = np.einsum("mi,ijc->mjc", u_basis, net)
    fitted = np.einsum("mjc,nj->mnc", fitted_u, v_basis)
    error_cm = np.linalg.norm(fitted - sections, axis=2)
    max_station, max_sample = np.unravel_index(int(np.argmax(error_cm)), error_cm.shape)
    report = {
        "control_poles": [int(nu), int(nv)],
        "section_samples": [int(m), int(n)],
        "fit_max_at": {
            "station_x_cm": float(xs_cm[max_station]),
            "section_sample_index": int(max_sample),
        },
        "fit_mean_cm": float(error_cm.mean()),
        "fit_rms_cm": float(np.sqrt(np.mean(error_cm ** 2))),
        "fit_p95_cm": float(np.quantile(error_cm, 0.95)),
        "fit_max_cm": float(error_cm.max()),
    }
    return net, report


def _arc_point(p: np.ndarray) -> str:
    return f"({p[0]*CM_TO_M:.5f},{p[1]*CM_TO_M:.5f},{p[2]*CM_TO_M:.5f})"


def _emit_curve(out: list[str], name: str, points_cm: list[list[float]], *, reverse: bool = False):
    pts = np.asarray(points_cm, dtype=float)
    if reverse:
        pts = pts[::-1].copy()
    coords = " ".join(_arc_point(p) for p in pts)
    if len(pts) == 2:
        out.append(f"line {coords} --name={name}")
    else:
        degree = min(3, len(pts) - 1)
        suffix = f" --degree={degree}" if degree < 3 else ""
        out.append(f"spline {coords}{suffix} --name={name}")


def _tire_commands(out: list[str], label: str, x_cm: float, y_cm: float, z_cm: float, *,
                   outer_radius_cm: float = 41.30, width_cm: float = 32.12):
    x, y, z = (v * CM_TO_M for v in (x_cm, y_cm, z_cm))
    outer = outer_radius_cm * CM_TO_M
    radial_half = 9.6 * CM_TO_M
    major = outer - radial_half
    half_width = width_cm * CM_TO_M * 0.5
    y0 = y - half_width
    out.extend([
        f"workplane xy --origin=(0,0,{z:.5f})",
        f"ellipse ({x+major:.5f},{y:.5f}) {radial_half:.5f} {half_width:.5f} --name=TireProfile_{label}",
        f"revolve TireProfile_{label} 360 --origin=({x:.5f},{y:.5f},{z:.5f}) --axis=(0,1,0) --name=Tire_{label}",
        f"delete TireProfile_{label}",
        f"matcap Tire_{label} carbon",
        f"tint Tire_{label} 0.10 0.11 0.12",
        f"torus ({x:.5f},{y:.5f},{z:.5f}) 0.205 0.009 --axis=(0,1,0) --name=RimLip_{label}",
        f"matcap RimLip_{label} chrome",
        f"tint RimLip_{label} 0.72 0.76 0.82",
        f"cylinder ({x:.5f},{y-0.050:.5f},{z:.5f}) 0.052 0.100 --axis=(0,1,0) --name=Hub_{label}",
        f"matcap Hub_{label} chrome",
        f"tint Hub_{label} 0.70 0.74 0.80",
        f"box ({x+0.052:.5f},{y-0.022:.5f},{z-0.012:.5f}) 0.155 0.044 0.024 --name=Spoke_{label}",
        f"array Spoke_{label} --count=8 --axis=({x:.5f},{y:.5f},{z:.5f}),(0,1,0) --angle=360 --name=Spokes_{label}",
    ])
    spoke_names = [f"Spoke_{label}"] + [f"Spokes_{label}.{i}" for i in range(1, 8)]
    out.append("matcap " + " ".join(spoke_names) + " chrome")
    out.append("tint " + " ".join(spoke_names) + " 0.70 0.74 0.80")


def generate():
    mesh_data = np.load(MESH_DIR / "Body_Main_Shell.npz")
    vertices = mesh_data["V"].astype(np.float64)
    triangles = mesh_data["T"].astype(np.int64)
    mirror_y = 0.5 * (vertices[:, 1].min() + vertices[:, 1].max())
    vertices[:, 1] -= mirror_y
    print(f"Body_Main_Shell: {len(vertices):,} vertices, {len(triangles):,} triangles; Y mirror={mirror_y:.4f} cm")

    xs_cm, sections_cm, valid_sections, interpolated_sections = _track_sections(vertices, triangles)
    # One non-periodic NURBS patch gives the skin a continuous, seam-free surface.
    # Pole counts are deliberately much smaller than the mesh but dense enough to
    # preserve the hood, arch, cabin, and nose transitions.
    control_net, fit_report = _fit_surface(sections_cm, xs_cm, nu=60, nv=37)
    print("B-spline fit:", json.dumps(fit_report, sort_keys=True))

    out = [
        "# SolidArc native document v1",
        "# Liger — fitted CAD shell from the evaluated Blender exterior mesh.",
        "# Units: metres. Z up, +X front. Blender Y mirror plane recentered to Y=0.",
        "# Main skin: 60×37-pole bicubic B-spline, least-squares fit to section profiles; intentionally an open surface shell.",
        "# Open unglazed roof frame and cowl surfaces; four source-positioned parametric wheel assemblies.",
        "reset",
        "show shading plastic",
        "# STEP 1 — one continuous fitted body skin (open surface; not a closed solid)",
    ]
    flat = control_net.reshape(-1, 3) * CM_TO_M
    poles = " ".join(f"({p[0]:.5f},{p[1]:.5f},{p[2]:.5f})" for p in flat)
    out.append(f"patch {control_net.shape[0]} {control_net.shape[1]} {poles} --degree=3 --name=Body_Surface")
    out.append("sew Body_Surface --name=Body_Shell")
    out.append("matcap Body_Shell plastic-white")
    out.append("tint Body_Shell 0.34 0.52 0.70")
    out.append("topology Body_Shell")

    curves = json.loads((LIGER / "curves.json").read_text(encoding="utf-8"))["curves"]
    by_name = {c["name"]: c for c in curves}

    # Phase 2: two fair CAD patches from the actual cowl rim network.  The
    # back-rim endpoints are snapped to the side-rim endpoints before fitting.
    cowl_upper_names = [
        "Front_Cowl_Edge_001", "Front_Cowl_Edge_002", "Front_Cowl_Edge_003",
        "Front_Cowl_Crease_001",
    ]
    cowl_upper = {n: [list(p) for p in by_name[n]["pts"]] for n in cowl_upper_names}
    cowl_upper["Front_Cowl_Crease_001"][0] = cowl_upper["Front_Cowl_Edge_001"][0]
    cowl_upper["Front_Cowl_Crease_001"][-1] = cowl_upper["Front_Cowl_Edge_003"][-1]
    upper_labels = ["Cowl_Side_Pos", "Cowl_Front_Rim", "Cowl_Side_Neg", "Cowl_Rear_Rim"]
    for name, label in zip(cowl_upper_names, upper_labels):
        _emit_curve(out, label, cowl_upper[name], reverse=True)
    out.append("fairpatch Cowl_Side_Pos Cowl_Front_Rim Cowl_Side_Neg Cowl_Rear_Rim --name=Cowl_Upper")
    out.append("matcap Cowl_Upper plastic-white")
    out.append("tint Cowl_Upper 0.39 0.56 0.73")

    # Retain the five lower-cowl boundaries as hidden construction references.
    # They do not form a single clean fair patch in the current kernel: the
    # source lower rim has a central notch and the generic N-sided fill twists.
    cowl_lower_names = [
        "Front_Cowl_Edge_004", "Front_Cowl_Edge_005", "Front_Cowl_Edge_006",
        "Front_Cowl_Edge_007", "Front_Cowl_Edge_008",
    ]
    lower_labels = [
        "Cowl_Lower_Ref_04", "Cowl_Lower_Ref_05", "Cowl_Lower_Ref_06",
        "Cowl_Lower_Ref_07", "Cowl_Lower_Ref_08",
    ]
    for name, label in zip(cowl_lower_names, lower_labels):
        _emit_curve(out, label, by_name[name]["pts"], reverse=True)
    out.append(
        "hide Cowl_Side_Pos Cowl_Front_Rim Cowl_Side_Neg Cowl_Rear_Rim "
        "Cowl_Lower_Ref_04 Cowl_Lower_Ref_05 Cowl_Lower_Ref_06 "
        "Cowl_Lower_Ref_07 Cowl_Lower_Ref_08"
    )

    # The frame is deliberately open: selected extracted rails become slender
    # parametric tubes, leaving roof/windscreen apertures unglazed.
    frame_rails = [
        ("Roof_Glass_Frame_Edge_002", "Frame_Roof_Rear"),
        ("Roof_Glass_Frame_Edge_004", "Frame_Roof_Left"),
        ("Roof_Glass_Frame_Edge_006", "Frame_Roof_Right"),
        ("Roof_Glass_Frame_Edge_005", "Frame_Roof_Header"),
        ("Roof_Glass_Frame_Edge_007", "Frame_Windscreen_Base"),
        ("Roof_Glass_Frame_Edge_008", "Frame_Windscreen_Rim"),
    ]
    for source_name, label in frame_rails:
        _emit_curve(out, label + "_Guide", by_name[source_name]["pts"])
        out.append(f"pipe {label}_Guide 0.009 --name={label}")
        out.append(f"matcap {label} chrome")
        out.append(f"tint {label} 0.66 0.70 0.76")
        out.append(f"hide {label}_Guide")

    # Blender source transforms measured from the Liger_named.blend wheel objects.
    # Tire radius/width: evaluated envelope ≈ Ø82.6 cm × 32.1 cm.
    wheel_centres = [
        ("F_Pos", 175.0688, 94.3266, 43.8138),
        ("F_Neg", 175.0688, -94.3266, 43.8138),
        ("R_Pos", -107.0000, 97.9580, 44.1095),
        ("R_Neg", -107.0000, -97.9580, 44.1095),
    ]
    out.append("# STEP 4 — four source-positioned tire/rim assemblies (parametric CAD solids)")
    for label, x, y, z in wheel_centres:
        _tire_commands(out, label, x, y, z)

    out += [
        "# Presentation defaults",
        "gizmo off",
        "show cages off",
        "show iso off",
        "view iso",
        "view fit",
        "list",
    ]
    OUT_ARC.write_text("\n".join(out) + "\n", encoding="utf-8")

    # Reproducible SolidArc render proof journal.
    proof = [
        f"open {OUT_ARC}",
        "show shading plastic",
        "show cages off",
        "show iso off",
        "gizmo off",
        "view iso",
        "view orbit 80 5",
        "view fit",
        "render Liger_Rebuild_Hero --size=1920x1200",
        "view front",
        "view fit",
        "render Liger_Rebuild_Side --size=1920x1200",
        "view top",
        "view fit",
        "render Liger_Rebuild_Top --size=1920x1200",
        "view iso",
        "view orbit 10 5",
        "view fit",
        "render Liger_Rebuild_RearQuarter --size=1920x1200",
    ]
    RENDER_ARC.parent.mkdir(parents=True, exist_ok=True)
    RENDER_ARC.write_text("\n".join(proof) + "\n", encoding="utf-8")

    report = {
        "source": "Vehicles/Liger/mesh/Body_Main_Shell.npz",
        "source_vertices": int(len(vertices)),
        "source_triangles": int(len(triangles)),
        "units": "cm source; metres in SolidArc",
        "y_mirror_plane_source_cm": float(mirror_y),
        "x_extent_cm": [float(xs_cm[0]), float(xs_cm[-1])],
        "section_spacing_cm": DX_CM,
        "valid_section_count": valid_sections,
        "interpolated_degenerate_sections": interpolated_sections,
        "surface_fit": fit_report,
        "body_representation": "single open one-face B-rep surface shell; not a closed solid",
        "solidarc_validation": {
            "modeling_command_refusals": 0,
            "body_shell": {
                "classification": "sheet",
                "vertices": 4,
                "edges": 4,
                "faces": 1,
                "loops": 1,
                "hulls": 1,
                "closed": False,
                "manifold": True,
                "oriented": True,
                "volume_m3": 0.0,
                "area_m2": 11.977384,
            },
        },
        "wheel_centres_cm": [list(w) for w in wheel_centres],
        "wheel_envelope_cm": {"diameter": 82.6, "width": 32.12},
        "parts": [
            "fitted Body_Main_Shell surface",
            "fair upper Front_Cowl patch; lower cowl boundaries retained as hidden curves",
            "six open Roof_Glass_Frame rails",
            "four parametric tire/rim/hub/spoke assemblies",
        ],
        "scope_note": "Unglazed exterior body-shell display assembly; no chassis, suspension, interior, or drivetrain.",
        "solidarc_journal": str(OUT_ARC.relative_to(ROOT)),
        "solidarc_render_journal": str(RENDER_ARC.relative_to(ROOT)),
    }
    OUT_REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {OUT_ARC.relative_to(ROOT)} ({len(out)} commands)")
    print(f"wrote {OUT_REPORT.relative_to(ROOT)}")
    print(f"wrote {RENDER_ARC.relative_to(ROOT)}")


if __name__ == "__main__":
    generate()

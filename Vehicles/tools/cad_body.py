#!/usr/bin/env python3
"""Phase 4 — proper CAD body: a fitted NURBS patch NETWORK on the Liger main shell.

  ~/.venv/bin/python Vehicles/tools/cad_body.py Liger

Why the earlier phases looked wrong: every strip was lofted between two curves on its
own, so neighbouring strips only approximately met (gaps, twisted ribbons, pink back
faces) and nothing was ever stitched into one body.

This generator builds one continuous atlas over the half shell instead:

  * rows  — 12 longitudinal curves (inner boundary/centreline, the 10 design creases,
    outer boundary).  Where a crease exists at a station the row lies exactly on it;
    where it does not, the row position is interpolated between the neighbouring
    measured rows, so the patch grid topology is identical at every station.
  * columns — exact mesh cross-sections at the interval breaks.
  * every patch is a clamped-uniform bicubic B-spline LEAST-SQUARES FITTED to dense
    points cut from the Blender mesh, with its four boundary pole rows/columns held
    fixed to the shared row/column curves.  Because the kernel's `patch` uses the same
    clamped uniform knots (Kernel/SurfaceSpecification.cpp ClampedUniform), shared
    edges coincide EXACTLY and `sew` stitches all patches into ONE oriented body.
  * the -Y half is emitted as mirrored poles with reversed V, so orientations agree.

Outputs Vehicles/<Car>/<Car>_Body_CAD.arc and cad_body.json (poles + deviation).
"""
import sys, os, json, math
import numpy as np
from scipy.signal import medfilt
sys.path.insert(0, os.path.dirname(__file__))
from sections import cut_x, length
import nurbs

CAR = sys.argv[1] if len(sys.argv) > 1 else 'Liger'
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUTDIR = f'{ROOT}/Vehicles/{CAR}'
SCALE = 0.01
DEG = 3

d = np.load(f'{OUTDIR}/mesh/Body_Main_Shell.npz')
V, T = d['V'].astype('f8'), d['T'].astype('i8')
YC = (V[:, 1].min() + V[:, 1].max()) / 2
V[:, 1] -= YC
F = json.load(open(f'{OUTDIR}/features.json'))['parts']['Body_Main_Shell']['lines']

# ---------------------------------------------------------------- landmark creases (+Y)
LANDMARKS = {'SillCrease': 34, 'DoorCrease': 78, 'BonnetEdge': 23, 'FenderCrease': 79,
             'BonnetShoulder': 25, 'RearShoulder': 30, 'RearDeckInner': 75,
             'RearLedgeOuter': 41, 'RearLedgeInner': 97, 'FrontSill': 22}
LM = {}
for name, i in LANDMARKS.items():
    P = np.array(F['CREASE'][i]); P[:, 1] -= YC
    if P[:, 1].mean() < 0: P[:, 1] *= -1
    LM[name] = P[np.argsort(P[:, 0])]


def cross(P, x):
    out = []
    for a, b in zip(P[:-1], P[1:]):
        if (a[0] - x) * (b[0] - x) <= 0 and a[0] != b[0]:
            t = (x - a[0]) / (b[0] - a[0]); out.append(a + t * (b - a))
    return out


def arc(P): return np.r_[0, np.cumsum(np.linalg.norm(np.diff(P, axis=0), axis=1))]


def chains_at(x):
    return cut_x(V, T, x)


def half_from(L):
    if L[0, 1] > L[-1, 1]: L = L[::-1]
    c = int(np.argmin(np.abs(L[:, 1])))
    return L[c:].copy()                      # inner boundary -> outer boundary, +Y half


def half_profile(x, prev=None):
    """+Y half section: the longest open chain of the x-cut, inner boundary first.  Where the
    cut closes (tail / nose tips) the +Y half of the closed loop is used."""
    ls = chains_at(x)
    cand = [L for L in ls if np.linalg.norm(L[0] - L[-1]) > 5]
    if not cand:
        for L in [L for L in ls if np.linalg.norm(L[0] - L[-1]) < 1e-3 and len(L) > 8]:
            c = int(np.argmin(np.abs(L[:, 1])))
            R = np.vstack([L[c:], L[1:c + 1]])
            neg = np.where(R[1:, 1] < 0)[0]
            k = int(neg[0]) + 1 if len(neg) else len(R) - 1
            if k >= 4: cand.append(R[:k])
    if not cand: return None
    return half_from(max(cand, key=length))


SNAP = 3.0
BND = {}
# ---------------------------------------------------------------- exact boundary rows
# The half shell's inner boundary (centreline seam + cockpit rim) and outer boundary
# (sill, arch rims, splitter, tail and nose edges) are chains of the mesh's own boundary
# edges: noise-free replacements for "first/last point of the section chain".
import collections as _c
_ec = _c.Counter()
for a, b, c in T:
    for e in ((a, b), (b, c), (c, a)): _ec[tuple(sorted(e))] += 1
_bnd = [e for e, n in _ec.items() if n == 1]
_adj = _c.defaultdict(list)
for a, b in _bnd: _adj[a].append(b); _adj[b].append(a)
_seen = set(); CHAINS = []
for v in [v for v in list(_adj) if len(_adj[v]) == 1] + list(_adj):
    if v in _seen: continue
    path = [v]; _seen.add(v)
    while True:
        nxt = [w for w in _adj[path[-1]] if w not in _seen]
        if not nxt: break
        _seen.add(nxt[0]); path.append(nxt[0])
    if len(path) > 20: CHAINS.append(V[path])
CHAINS.sort(key=len)
inner = max(CHAINS, key=lambda P: (np.abs(P[:, 1]) < 1.0).sum())
outer = max([C for C in CHAINS if C is not inner], key=len)
print('boundary chains:', [len(C) for C in CHAINS], '-> inner/outer', len(inner), len(outer))


def cross_near(P, x, ref):
    """crossing of polyline P with plane x nearest (in y,z) to reference point ref"""
    cs = cross(P, x)
    if not cs: return None
    return min(cs, key=lambda q: np.linalg.norm(q[1:] - ref[1:]))


# global row order: topological sort of pairwise "inner of" observations at stations where
# both creases of a pair are measurable (front and rear creases never coexist, so means
# over all stations would mix unrelated regions and scramble the order).
probe = np.arange(-180, 258, 4.0)
pairs = {}
for x in probe:
    H = half_profile(x)
    if H is None: continue
    S = arc(H)
    got = {}
    for n in LANDMARKS:
        cs = cross(LM[n], x)
        if not cs: continue
        dd = np.linalg.norm(H[:, 1:] - cs[0][1:], axis=1); i = int(np.argmin(dd))
        if dd[i] < SNAP and 2 < S[i] < S[-1] - 2: got[n] = S[i]
    for a in got:
        for b in got:
            if a < b:
                k = (a, b) if got[a] < got[b] else (b, a)
                pairs[k] = pairs.get(k, 0) + 1
import collections
score = collections.Counter()
for (a, b), c in pairs.items():
    score[(a, b)] += c
edges = {a: set() for a in LANDMARKS}
for (a, b), c in sorted(score.items()):
    if (b, a) in score and score[(b, a)] > c: continue      # keep the dominant direction
    edges[a].add(b)
pred = {a: set() for a in LANDMARKS}
for a, ss in edges.items():
    for b in ss: pred[b].add(a)
orderlist = []
remaining = set(LANDMARKS)
while remaining:
    ready = [n for n in sorted(remaining) if not (pred[n] & remaining)]
    if not ready: ready = [sorted(remaining)[0]]
    n = ready[0]; orderlist.append(n); remaining.discard(n)
ROWS = ['Centre'] + orderlist + ['End']
print('row order:', ROWS)

X_MIN, X_MAX = float(V[:, 0].min()) + 0.5, float(V[:, 0].max()) - 0.5


def row_positions(H, x=None):
    """arc positions of every row on section H (measured crease crossings else rank-interp)"""
    S = arc(H)
    meas = {'Centre': 0.0, 'End': S[-1]}
    if x is not None and BND:                       # snap the two boundary rows to the global
        for name, ref in (('Centre', None), ('End', None)):   # smoothed boundary curves
            seg = BND.get((name, seg_of(x)))
            if seg is None: continue
            q = np.array([x, seg[0](x), seg[1](x)])
            dd = np.linalg.norm(H[:, :] - q, axis=1); i = int(np.argmin(dd))
            if dd[i] < 6.0: meas[name] = S[i]
    for n in LANDMARKS:
        cs = cross(LM[n], H[0, 0])
        if not cs: continue
        dd = np.linalg.norm(H[:, 1:] - cs[0][1:], axis=1); i = int(np.argmin(dd))
        if dd[i] < SNAP and 2 < S[i] < S[-1] - 2: meas[n] = S[i]
    last = 0.0
    for r in range(1, len(ROWS) - 1):        # rows coinciding with the previous kept one
        n = ROWS[r]                          # (the aperture rim IS the bonnet edge there)
        if meas.get(n) is not None:
            if meas[n] - last < 1.2: meas.pop(n)
            else: last = meas[n]
    known = sorted((ROWS.index(n), s) for n, s in meas.items())
    pos = {}
    for r, n in enumerate(ROWS):
        pos[n] = float(np.interp(r, [k[0] for k in known], [k[1] for k in known]))
    for r in range(1, len(ROWS)):                       # keep strictly monotone
        pos[ROWS[r]] = max(pos[ROWS[r]], pos[ROWS[r - 1]] + 1.2)
    return pos, S


def point_at(H, S, s):
    return np.array([np.interp(s, S, H[:, k]) for k in range(3)])


def strip_at(H, S, lo, hi, n):
    u = np.linspace(lo, hi, n)
    return np.column_stack([np.interp(u, S, H[:, k]) for k in range(3)])


# ---------------------------------------------------------------- stations
ST = 3.0
stations = []
for x in np.arange(X_MIN, X_MAX + 1e-9, ST):
    H = half_profile(x)
    if H is None or len(H) < 8: continue
    stations.append(dict(x=float(x), H=H, S=arc(H)))
for st in stations:
    st['pos'], st['S'] = row_positions(st['H'])
print('stations:', len(stations), ' x %.1f..%.1f' % (stations[0]['x'], stations[-1]['x']))

# ---------------------------------------------------------------- interval breaks
MAXLEN = 34.0


def sig(x):
    H = half_profile(x)
    return None if H is None else (H[-1, 2], H[0, 1])


def pinch(x0, x1):
    """bisect the x where the section topology flips (arch rim meets the sill / header)"""
    p0, p1 = sig(x0), sig(x1)
    if p0 is None or p1 is None: return (x0 + x1) / 2
    use_z = abs(p0[0] - p1[0]) >= abs(p0[1] - p1[1])
    k = 0 if use_z else 1
    thr = (p0[k] + p1[k]) / 2
    same = lambda p: abs(p[k] - p0[k]) < abs(p[k] - p1[k])
    lo, hi = x0, x1
    for _ in range(14):
        mid = (lo + hi) / 2
        p = sig(mid)
        if p is None or same(p): lo = mid
        else: hi = mid
        if hi - lo < 0.05: break
    return (lo + hi) / 2


hard = [X_MIN, X_MAX]
PINCH = set()
for a, b in zip(stations[:-1], stations[1:]):            # aperture ends + arch rim pinches:
    if b['x'] - a['x'] < 2.2 * ST and (abs(a['H'][0, 1] - b['H'][0, 1]) > 3 or abs(a['H'][-1, 2] - b['H'][-1, 2]) > 8):
        px = pinch(a['x'], b['x']); PINCH.add(round(px, 4))
        hard.append(px)                                  # the break sits ON the pinch point,
hard = sorted(hard)                                      # shared by both neighbouring intervals

# global smoothed boundary-row curves per topological segment: the raw first/last point of
# a section chain alternates between lip top and underside (sawtooth), a smoothing spline
# through the segment follows the true edge instead.
from scipy.interpolate import UnivariateSpline
segs = [X_MIN] + [p for p in sorted(PINCH) if X_MIN < p < X_MAX] + [X_MAX]


def seg_of(x):
    for k in range(len(segs) - 1):
        if segs[k] - 1e-9 <= x <= segs[k + 1] + 1e-9: return k
    return len(segs) - 2


for k in range(len(segs) - 1):
    st = [t for t in stations if segs[k] + 0.5 < t['x'] < segs[k + 1] - 0.5]
    if len(st) < 8: continue
    xs = np.array([t['x'] for t in st])
    for name, idx in (('Centre', 0), ('End', -1)):
        P = np.array([t['H'][idx] for t in st])
        fy = UnivariateSpline(xs, P[:, 1], s=len(xs) * 2.0 ** 2)
        fz = UnivariateSpline(xs, P[:, 2], s=len(xs) * 2.0 ** 2)
        BND[(name, k)] = (fy, fz)
for st in stations:                                  # second pass with the smoothed boundaries
    st['pos'], st['S'] = row_positions(st['H'], st['x'])
soft = []
for n, P in LM.items():                                  # crease ends = design knot columns
    for e in (P[:, 0].min(), P[:, 0].max()):
        if X_MIN + 10 < e < X_MAX - 10: soft.append(float(e))
breaks = list(hard)
for b in sorted(soft):                                   # soft breaks yield to hard ones
    if min(abs(b - h) for h in breaks) >= 8: breaks.append(b)
breaks = sorted(breaks)
final = [breaks[0]]
for b in breaks[1:]:                                     # cap interval length
    span = b - final[-1]
    if span > MAXLEN:
        n = int(math.ceil(span / MAXLEN))
        for k in range(1, n):
            final.append(final[-1] + span / n)
    final.append(b)
INTERVALS = [(final[i], final[i + 1]) for i in range(len(final) - 1) if final[i + 1] - final[i] > 3]


def internal_jump(xa, xb):
    """x inside (xa,xb) where the section topology still turns sharply (arch rim, header)"""
    best = None
    for a, b in zip(stations[:-1], stations[1:]):
        if not (xa + 4 < b['x'] < xb - 4): continue
        sc = max(abs(a['H'][-1, 2] - b['H'][-1, 2]) / 6.0, abs(a['H'][0, 1] - b['H'][0, 1]) / 3.0)
        if sc > 1 and (best is None or sc > best[1]): best = (pinch(a['x'], b['x']), sc)
    if best: PINCH.add(round(best[0], 4))
    return best[0] if best else None


for _ in range(4):
    out, changed = [], False
    for xa, xb in INTERVALS:
        j = internal_jump(xa, xb)
        if j and min(j - xa, xb - j) > 4: out += [(xa, j), (j, xb)]; changed = True
        else: out.append((xa, xb))
    INTERVALS = out
    if not changed: break
mg = []
for iv in INTERVALS:                                     # sliver intervals merge into the right
    if mg and iv[0] - mg[-1][1] < 1e-9 and iv[1] - iv[0] < 6:
        mg[-1] = (mg[-1][0], iv[1])
    elif mg and mg[-1][1] - mg[-1][0] < 6 and iv[0] - mg[-1][1] < 1e-9:
        mg[-1] = (mg[-1][0], iv[1])
    else:
        mg.append(iv)
INTERVALS = mg
print('intervals:', len(INTERVALS), ' '.join('%.0f..%.0f' % t for t in INTERVALS))


bw = {(ROWS[r], ROWS[r + 1]): [] for r in range(len(ROWS) - 1)}
for st in stations:
    for r in range(len(ROWS) - 1):
        bw[(ROWS[r], ROWS[r + 1])].append(st['pos'][ROWS[r + 1]] - st['pos'][ROWS[r]])
COUNTV = {b: int(max(4, min(12, 3 + round(np.mean(w) / 5.0)))) for b, w in bw.items()}
COUNTU = {i: int(max(4, min(12, 3 + round((b - a) / 12.0)))) for i, (a, b) in enumerate(INTERVALS)}

# ---------------------------------------------------------------- fit the network
corners, rowpoles, patches = {}, {}, []
for i, (xa, xb) in enumerate(INTERVALS):
    cu = COUNTU[i]
    xcL, xcR = xa, xb                         # columns exactly on the breaks: pinch breaks are
    sts = [st for st in stations if xcL + 0.4 <= st['x'] <= xcR - 0.4]   # consistent both sides
    if not sts: sts = [st for st in stations if xcL - 0.4 <= st['x'] <= xcR + 0.4]
    if not sts: continue
    ends = {}
    for xe, tag in ((xcL, 'L'), (xcR, 'R')):
        Href = min(sts, key=lambda s: abs(s['x'] - xe))['H'] if sts else \
            min(stations, key=lambda s: abs(s['x'] - xe))['H']
        H = half_profile(xe, Href) if Href is not None else None
        if H is None or len(H) < 8:
            H = Href
        pos, S = row_positions(H, xe)
        ends[tag] = (H, S, pos)
        for n in ROWS:
            c = point_at(H, S, pos[n])
            if n == 'Centre': c[1] = 0.0
            corners[(n, i, tag)] = c
    sm = {}                                              # kill single-station branch switches
    for n in ROWS:                                       # of the crease detection (interior only;
        arr = np.array([st['pos'][n] for st in sts])     # the column ends stay raw so that
        if len(arr) >= 7:                                # neighbouring intervals still share)
            w = 7 if n in ('Centre', 'End') else 5
            a2 = medfilt(arr, w)
            a2 = np.convolve(a2, np.ones(5) / 5, 'same')
            a2[0], a2[-1] = arr[0], arr[-1]
            a2 = np.maximum.accumulate(a2)               # rows may not cross
            arr = a2
        sm[n] = arr
    for k, st in enumerate(sts):
        st['sm'] = {n: sm[n][k] for n in ROWS}
    for n in ROWS:                                       # row curves along x
        t = np.r_[0.0, [(st['x'] - xcL) / (xcR - xcL) for st in sts], 1.0]
        pts = np.vstack([corners[(n, i, 'L')]] + [point_at(st['H'], st['S'], st['sm'][n]) for st in sts]
                        + [corners[(n, i, 'R')]])
        rowpoles[(n, i)] = nurbs.fit_curve(cu, DEG, t, pts, fixed={0: corners[(n, i, 'L')], cu - 1: corners[(n, i, 'R')]})
    for r in range(len(ROWS) - 1):
        band = (ROWS[r], ROWS[r + 1]); cv = COUNTV[band]
        cols = {}
        for tag in ('L', 'R'):
            H, S, pos = ends[tag]
            pts = strip_at(H, S, pos[band[0]], pos[band[1]], max(cv * 3, 12))
            cols[tag] = nurbs.fit_curve(cv, DEG, np.linspace(0, 1, len(pts)), pts,
                                        fixed={0: corners[(band[0], i, tag)], cv - 1: corners[(band[1], i, tag)]})
        U, VV, Q = [], [], []
        for st in sts:
            pts = strip_at(st['H'], st['S'], st['sm'][band[0]], st['sm'][band[1]], max(cv * 4, 16))
            s = arc(pts)
            vv = s / s[-1] if s[-1] > 1e-6 else np.linspace(0, 1, len(pts))
            U += [((st['x'] - xcL) / (xcR - xcL))] * len(pts); VV += list(vv); Q += list(pts)
        fixed = {(iu, 0): rowpoles[(band[0], i)][iu] for iu in range(cu)}
        fixed.update({(iu, cv - 1): rowpoles[(band[1], i)][iu] for iu in range(cu)})
        fixed.update({(0, iv): cols['L'][iv] for iv in range(cv)})
        fixed.update({(cu - 1, iv): cols['R'][iv] for iv in range(cv)})
        Q = np.array(Q)
        lo = np.min(np.vstack([Q, np.array(list(fixed.values()))]), axis=0) - 0.06 * np.ptp(Q, axis=0)
        hi = np.max(np.vstack([Q, np.array(list(fixed.values()))]), axis=0) + 0.06 * np.ptp(Q, axis=0)
        m = len(U); fair = 2e-3
        for _ in range(4):                            # fair harder until no pole escapes the
            poles = nurbs.fit_surface(cu, cv, DEG, np.array(U), np.array(VV), Q, fixed=fixed, fair=fair * m)
            if (poles.reshape(-1, 3) > lo).all() and (poles.reshape(-1, 3) < hi).all(): break
            fair = max(fair * 30, 1e-2)               # data box: fold/overshoot detected
        patches.append(dict(band=band, i=i, x=[xa, xb], cu=cu, cv=cv, poles=poles))
print('patches per side:', len(patches))

# ---------------------------------------------------------------- deviation vs mesh
from scipy.spatial import cKDTree
# distance to the triangle soup, not to the vertices: the Blender shell has long thin
# triangles on the roof/deck where vertex spacing reaches 10 cm and would fake big errors
R = d['T'].astype('i8'); A, B, C = V[R[:, 0]], V[R[:, 1]], V[R[:, 2]]
w = np.array([[.5, .5, 0], [.5, 0, .5], [0, .5, .5], [1/3, 1/3, 1/3], [.25, .5, .25], [.5, .25, .25],
              [.25, .25, .5], [.75, .125, .125], [.125, .75, .125], [.125, .125, .75], [.6, .2, .2], [.2, .6, .2], [.2, .2, .6]])
CLOUD = np.einsum('wk,tkc->twc', w, np.stack([A, B, C], 1)).reshape(-1, 3)
tree = cKDTree(CLOUD)
for p in patches:
    S, u, v = nurbs.grid(p['cu'], p['cv'], DEG, p['poles'], 16, 16)
    dd, _ = tree.query(S.reshape(-1, 3))
    p['mean_dev'] = float(dd.mean()); p['max_dev'] = float(dd.max())
order = sorted(patches, key=lambda p: -p['max_dev'])
allmean = float(np.mean([p['mean_dev'] for p in patches])); allmax = float(max(p['max_dev'] for p in patches))
print(f'shell fit: mean {allmean:.3f} cm, worst {allmax:.2f} cm')
for p in order[:10]:
    print(f"   {p['band'][0]:>14s} -> {p['band'][1]:<14s} x {p['x'][0]:7.1f}..{p['x'][1]:7.1f}  mean {p['mean_dev']:.2f} max {p['max_dev']:.2f}")

# ---------------------------------------------------------------- journal
out = ['# SolidArc native document v1',
       f'# {CAR} — phase 4 CAD body: {len(patches)} bicubic patches per side, least-squares fitted to the',
       '# Blender shell on a global row/column atlas (rows = inner boundary + 10 design creases + outer',
       '# boundary; columns = exact section breaks).  Boundary poles are shared, so every edge coincides',
       '# exactly and `sew` closes the network into one oriented body.  Metres, Z up, +X front.',
       'reset', 'show shading plastic']
names = []
for sign, tag in ((1, 'R'), (-1, 'L')):
    for p in patches:
        P = p['poles'].copy(); P[:, :, 1] *= sign
        if sign < 0: P = P[:, ::-1, :]
        nm = f'{tag}_{p["band"][0]}_{p["band"][1]}_x{int(p["x"][0])}'
        names.append(nm)
        pts = ' '.join(f'({q[0]*SCALE:.6f},{q[1]*SCALE:.6f},{q[2]*SCALE:.6f})' for q in P.reshape(-1, 3))
        out.append(f'# STEP {len(names)} — {nm}: bicubic {p["cu"]}x{p["cv"]}, fit mean {p["mean_dev"]:.2f} / max {p["max_dev"]:.2f} cm')
        out.append(f'patch {p["cu"]} {p["cv"]} {pts} --degree=3 --name={nm}')
out.append(f'sew {" ".join(names)}')
out.append('rename Sewn Body_Main_Shell')
out.append('tint Body_Main_Shell 0.80 0.82 0.86')
open(f'{OUTDIR}/{CAR}_Body_CAD.arc', 'w').write('\n'.join(out) + '\n')
json.dump(dict(car=CAR, units='cm', rows=ROWS, intervals=INTERVALS, countu=COUNTU,
               countv={f'{a}_{b}': c for (a, b), c in COUNTV.items()},
               fit=dict(mean=allmean, max=allmax),
               patches=[dict(band=list(p['band']), x=p['x'], cu=p['cu'], cv=p['cv'],
                             mean_dev=p['mean_dev'], max_dev=p['max_dev'],
                             poles=p['poles'].round(4).tolist()) for p in patches]),
          open(f'{OUTDIR}/cad_body.json', 'w'))
print('journal:', f'{CAR}_Body_CAD.arc', len(out), 'lines')

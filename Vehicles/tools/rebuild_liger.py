#!/usr/bin/env python3
"""Liger — proper CAD rebuild in SolidArc (replaces the strip-loft attempts).

One dense landmark-aligned, exactly mirror-symmetric loft of open station sections
(sill/arch-rim -> over the roof -> other side) gives the whole outer skin as a single
smooth NURBS sheet; the wheel-arch / intake openings appear because the section
endpoints ride the boundary loop (sill segments + arch rims), exactly as the design
trims them.  Floor patches close the underside between the arches; the cowl and the
roof glass frame are their own small lofts; four revolved tyres at the fitted wheel
circles make it a standing vehicle.  No booleans: everything the kernel does is a
loft/revolve, so the journal replays fast with 0 refusals.

Run:  ~/.venv/bin/python Vehicles/tools/rebuild_liger.py [--test]
Outputs:
  Vehicles/Liger/Liger_Rebuild.arc          journal (replay = rebuild)
  Vehicles/Liger/Liger_Rebuild_Data.json    section grid + wheel fits + deviation
  Vehicles/Liger/SolidArc/render_rebuild.arc  kernel render script
"""
import sys, os, json, math
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from sections import cut_x, length

TEST = '--test' in sys.argv
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = f'{ROOT}/Vehicles/Liger'
SCALE = 0.01

d = np.load(f'{OUT}/mesh/Body_Main_Shell.npz'); V, T = d['V'].astype('f8'), d['T']
yc = (V[:, 1].min() + V[:, 1].max()) / 2; V[:, 1] -= yc

NF, NT = 10, 14                      # flank / half-top points per side; N = 2*(NF+NT)+1
N = 2 * (NF + NT) + 1

def resample(L, n):
    s = np.r_[0, np.cumsum(np.linalg.norm(np.diff(L, axis=0), axis=1))]
    u = np.linspace(0, s[-1], n)
    return np.column_stack([np.interp(u, s, L[:, k]) for k in range(3)])

def resample_landmarks(L):
    """anchor the parameterisation at the shoulders so U-lines stay aligned"""
    c = int(np.argmin(np.abs(L[:, 1])))
    left, right = L[:c + 1], L[c:]
    il = int(np.argmin(left[:, 1])); ir = int(np.argmax(right[:, 1]))
    FL = 0.18
    sl = np.r_[0, np.cumsum(np.linalg.norm(np.diff(left, axis=0), axis=1))]
    il = max(il, int(np.searchsorted(sl, FL * sl[-1])))
    sr = np.r_[0, np.cumsum(np.linalg.norm(np.diff(right, axis=0), axis=1))]
    ir = min(ir, int(np.searchsorted(sr, (1 - FL) * sr[-1])))
    return np.vstack([resample(left[:il + 1], NF + 1)[:-1], resample(left[il:], NT + 1),
                      resample(right[:ir + 1], NT + 1)[1:], resample(right[ir:], NF + 1)[1:]])

def merge_chains(cs, tol=0.1):
    """join chains that meet end-to-end (slice splits where the plane is tangent)"""
    cs = list(cs); changed = True
    while changed:
        changed = False
        for i in range(len(cs)):
            for j in range(len(cs) - 1, -1, -1):
                if i == j or i >= len(cs) or j >= len(cs): continue
                a, b = cs[i], cs[j]
                if np.linalg.norm(a[-1] - b[0]) < tol: cs[i] = np.vstack([a, b[1:]])
                elif np.linalg.norm(a[-1] - b[-1]) < tol: cs[i] = np.vstack([a, b[::-1][1:]])
                elif np.linalg.norm(a[0] - b[-1]) < tol: cs[i] = np.vstack([b, a[1:]])
                elif np.linalg.norm(a[0] - b[0]) < tol: cs[i] = np.vstack([b[::-1], a[1:]])
                else: continue
                del cs[j]; changed = True; break
    return cs

def candidates(VV, TT, x, minlen):
    """all plausible open profile chains at this station (rings opened both ways)"""
    out = []
    for L in merge_chains(cut_x(VV, TT, x)):
        if length(L) < minlen: continue
        if np.linalg.norm(L[0] - L[-1]) > 1e-3:
            out.append(L)
        else:                                        # ring: offer the longer (outer) arc
            R = L[:-1]
            a, b = int(np.argmax(R[:, 1])), int(np.argmin(R[:, 1]))
            lo, hi = min(a, b), max(a, b)
            arc1, arc2 = R[lo:hi + 1], np.vstack([R[hi:], R[:lo + 1]])
            out.append(arc1 if length(arc1) >= length(arc2) else arc2)
    return out

def pick(cs, prev):
    if not cs: return None
    if prev is None: return max(cs, key=length)
    def cost(L):                                     # mean distance to the previous section
        Q = resample(L, 49)
        d = np.min(np.linalg.norm(Q[:, None, 1:] - prev[None, :, 1:], axis=2), axis=1)
        return d.mean()
    return min(cs, key=cost)

def symmetrise(S):
    M = S[::-1].copy(); M[:, 1] *= -1
    return (S + M) / 2

# ---------------------------------------------------------------- station schedule (cm)
def sched(a, b, dx): return np.arange(a, b + 1e-6, dx)
ST = np.unique(np.r_[sched(-181, -160, 2), sched(-160, -132, 3), sched(-132, -60, 4),
                     sched(-60, 112, 6), sched(112, 132, 3), sched(132, 210, 4),
                     sched(210, 232, 3), sched(232, 250, 2.5), sched(250, 259, 3)])
ST = np.unique(np.r_[ST, [-157.5, -155, -62, -60.3, 134.3, 137, 205, 207.6,
                          210, 212, 216, 220, 224]])   # pin arch rim ends + wheelhouse transition
if TEST: ST = ST[::4]

X_MAIN = (-171.0, 250.0)          # stations with the full sill->roof->sill profile
sections = []
cand_at = {}
for x in ST:
    cs = candidates(V, T, x, 30)
    if not cs: continue
    cand_at[float(x)] = cs
    if X_MAIN[0] <= x <= X_MAIN[1]:
        L = max(cs, key=length)
        if L[0, 1] > L[-1, 1]: L = L[::-1]
        c = int(np.argmin(np.abs(L[:, 1])))
        lf, rt = L[:c + 1], L[c:]
        gl, gr = abs(lf[0, 1]) > 100, abs(rt[-1, 1]) > 100
        if gl != gr:                       # one rim missing (slot/opening split): mirror the good arc
            H = lf if gl else rt
            M = H.copy(); M[:, 1] *= -1
            L = np.vstack([H, M[::-1][1:]]) if gl else np.vstack([M[::-1][:-1], H])
        sections.append((float(x), symmetrise(resample_landmarks(L))[::-1]))

# tail / nose caps: continuity-picked, full-width chains only (inner arcs are narrower)
def project_resample(chain, seed):
    """resample chain with the seed's parameterisation (nearest-point projection)"""
    D = resample(chain, 400)
    Q = np.array([D[np.argmin(np.linalg.norm(D - p, axis=1))] for p in seed])
    return Q

def cap(x_list, seed):
    out, prev = [], seed
    for x in x_list:
        cs = [c for c in cand_at.get(x, []) if np.ptp(c[:, 1]) > 1.6]
        L = pick(cs, prev)
        if L is None: continue
        if L[0, 1] > L[-1, 1]: L = L[::-1]
        S = symmetrise(resample_landmarks(L))[::-1]
        out.append((x, S)); prev = S
    return out
tail_secs = cap(sorted([x for x in cand_at if x < X_MAIN[0]], reverse=True), sections[0][1])
tail_secs = tail_secs[::-1]                              # tail tip -> boundary (open rim seam)
nose_secs = cap(sorted(x for x in cand_at if x > X_MAIN[1]), sections[-1][1])
# one light binomial pass along the station axis damps slice noise (shoulder ripple)
A = np.array([S for _, S in sections])
A[1:-1] = 0.25 * A[:-2] + 0.5 * A[1:-1] + 0.25 * A[2:]
sections = [(float(x), A[i]) for i, (x, _) in enumerate(sections)]
print(f'{len(sections)} skin sections over x {sections[0][0]:.0f}..{sections[-1][0]:.0f}')

# floor patches (underside chords) on the x-ranges clear of the arches
FLOOR_RANGES = [(-179, -159), (-59, 131), (209, 259)]
floors = [[] for _ in FLOOR_RANGES]
for x, S in sections:
    for i, (a, b) in enumerate(FLOOR_RANGES):
        if a <= x <= b and min(S[0, 2], S[-1, 2]) < 40:
            a0, b0 = S[0], S[-1]
            zlo = min(a0[2], b0[2]) - 1.0
            floors[i].append((float(x), np.array([[x, b0[1] + (a0[1] - b0[1]) * f, zlo]
                                                  for f in np.linspace(0, 1, 5)])))

# small parts: front cowl + roof glass frame, sectioned the same way
def part_sections(path, x0, x1, n_st, n_pts, top=False):
    dd = np.load(path); VV, TT = dd['V'].astype('f8'), dd['T']; VV[:, 1] -= yc
    out = []; prev = None
    for x in np.linspace(x0, x1, n_st):
        cs = candidates(VV, TT, x, 5)
        if not cs: continue
        L = max(cs, key=lambda q: q[:, 2].mean()) if top else pick(cs, prev)
        if L[0, 1] > L[-1, 1]: L = L[::-1]
        S = symmetrise(resample(L, n_pts))[::-1]
        out.append((float(x), S)); prev = S
    return out
cowl = part_sections(f'{OUT}/mesh/Body_Front_Cowl.npz', 118, 137, 8, 21, top=True)
glass = part_sections(f'{OUT}/mesh/Body_Roof_Glass_Frame.npz', -12, 144, 24, 21)
print(f'parts: cowl {len(cowl)} sections, glass frame {len(glass)} sections')

# wheel centres from the fitted arch rims (circle fit on the upper rim half)
CURVES = json.load(open(f'{OUT}/curves.json'))['curves']
CByName = {c['name']: c for c in CURVES}
def fit_wheel(*names):
    P = np.vstack([np.array(CByName[n]['pts']) for n in names])[:, [0, 2]]
    P = P[P[:, 1] > np.percentile(P[:, 1], 45)]
    A = np.c_[2 * P[:, 0], 2 * P[:, 1], np.ones(len(P))]
    c, *_ = np.linalg.lstsq(A, P[:, 0]**2 + P[:, 1]**2, rcond=None)
    return c[0], c[1], math.sqrt(c[2] + c[0]**2 + c[1]**2)
WX_R, WZ_R, _ = fit_wheel('Shell_Crease_092')
WX_F, WZ_F, _ = fit_wheel('Shell_Crease_026')
TYRE_R, TYRE_W, TYRE_Y = 0.345, 0.095, 0.95          # from Vehicles/Tread design
print(f'wheels: rear x {WX_R:.2f} z {WZ_R:.2f}, front x {WX_F:.2f} z {WZ_F:.2f}')

# ---------------------------------------------------------------- deviation vs the Blender shell
def loft_eval(xs, secs, x):
    i = max(0, min(np.searchsorted(xs, x) - 1, len(xs) - 2))
    t = (x - xs[i]) / (xs[i + 1] - xs[i])
    return (1 - t) * secs[i] + t * secs[i + 1]
xs = np.array([s[0] for s in sections]); secs = np.array([s[1] for s in sections])
devs = []
for i in range(len(xs) - 1):
    xm = (xs[i] + xs[i + 1]) / 2
    chains = cut_x(V, T, xm)
    if not chains: continue
    S = loft_eval(xs, secs, xm)
    Lm = np.vstack([resample(Lc, max(8, int(length(Lc)))) for Lc in chains])
    dd = np.min(np.linalg.norm(S[:, None, 1:] - Lm[None, :, 1:], axis=2), axis=1)
    devs.append((float(xm), float(dd.max()), float(dd.mean())))
worst = max(devs, key=lambda r: r[1])
print(f'shell loft -> mesh: max {worst[1]:.2f} cm (x={worst[0]:.0f}), mean {np.mean([r[2] for r in devs]):.3f} cm')

# ---------------------------------------------------------------- journal
out = ['# SolidArc native document v1',
       '# Liger — full vehicle, rebuilt properly: ONE dense loft of mirror-symmetric station',
       '# sections for the outer skin (arch/intake openings trimmed by the boundary rails),',
       '# floor patches, cowl + roof glass frame lofts, four revolved tyres at fitted centres.',
       '# Right-handed, Z up, metres. +X front, mirrored about Y=0.  Replay = rebuild.',
       'reset']
step = 1

def P(p): return f'({p[0]*SCALE:.4f},{p[1]*SCALE:.4f},{p[2]*SCALE:.4f})'

def emit_loft(title, secs, name, tint, thin=2, deg=3, guides=()):
    global step
    out.append(f'# STEP {step} — {title}: {len(secs)} sections'); step += 1
    names = []
    for k, (x, S) in enumerate(secs, 1):
        keep = list(range(0, len(S), thin))
        if keep[-1] != len(S) - 1: keep.append(len(S) - 1)
        nm = f'{name}_s{k:02d}'; names.append(nm)
        sdeg = ' --degree=2' if len(keep) < 5 else ''
        out.append('spline ' + ' '.join(P(p) for p in S[keep]) + sdeg + f' --name={nm}')
    g = ''
    if guides:
        for gn in guides:
            c = CByName[gn]
            out.append('spline ' + ' '.join(P(p) for p in np.array(c['pts'])) + f' --name={gn}')
        g = f' --guides={",".join(guides)}'
    out.append(f'loft {" ".join(names)}{g}{f" --degree={deg}" if deg != 3 else ""} --sheet --name={name}')
    out.append('delete ' + ' '.join(names))
    if guides: out.append('delete ' + ' '.join(guides))
    out.append(f'tint {name} {tint}')

SHELL = '0.80 0.82 0.86'
emit_loft('outer skin (sill/arch-rim -> roof -> sill), the boundary rails trim the arches',
          sections, 'Shell', SHELL)
if len(tail_secs) >= 3:
    emit_loft('tail cap (wrap over the tail face, sewn to the skin at x=%.0f cm)' % tail_secs[-1][0],
              tail_secs, 'Shell_Tail', SHELL, deg=2)
if len(nose_secs) >= 3:
    emit_loft('nose cap (wrap over the nose face, sewn to the skin at x=%.0f cm)' % nose_secs[0][0],
              nose_secs, 'Shell_Nose', SHELL, deg=2)
for i, fl in list(enumerate(floors)):
    if len(fl) >= 2:
        emit_loft(f'floor patch {i+1}', fl, f'Floor{i+1}', '0.30 0.30 0.32')
emit_loft('front cowl', cowl, 'Cowl', '0.62 0.64 0.68')
emit_loft('roof glass frame', glass, 'GlassFrame', '0.10 0.10 0.12')

out.append(f'# STEP {step} — tyres: revolved crown profiles at the fitted wheel centres'); step += 1
prof = [(0.20, -TYRE_W), (0.30, -TYRE_W), (0.335, -0.075), (TYRE_R, -0.03), (TYRE_R, 0.03),
        (0.335, 0.075), (0.30, TYRE_W), (0.20, TYRE_W)]
for tag, cx in (('FR', WX_F), ('FL', WX_F), ('RR', WX_R), ('RL', WX_R)):
    cx *= SCALE
    cy = TYRE_Y if tag.endswith('R') else -TYRE_Y
    cz = TYRE_R
    pts = ' '.join(f'({cx:.4f},{cy + w:.4f},{cz + r:.4f})' for r, w in prof)
    out.append(f'spline {pts} --closed --name=Tyre{tag}_p')
    out.append(f'revolve Tyre{tag}_p 360 --origin=({cx:.4f},{cy:.4f},{cz:.4f}) --axis=(0,1,0) --name=Tyre{tag}')
    out.append(f'delete Tyre{tag}_p')
out.append('tint TyreFR TyreFL TyreRR TyreRL 0.13 0.13 0.14')

open(f'{OUT}/Liger_Rebuild.arc', 'w').write('\n'.join(out) + '\n')
json.dump(dict(units='cm', mirror_offset=yc,
               stations=[s[0] for s in sections],
               sections=[s[1].round(3).tolist() for s in sections],
               wheels=dict(rear=[WX_R, WZ_R], front=[WX_F, WZ_F]),
               deviation=dict(max_cm=worst[1], mean_cm=float(np.mean([r[2] for r in devs])))),
          open(f'{OUT}/Liger_Rebuild_Data.json', 'w'))
print(f'journal: {sum(1 for l in out if l and not l.startswith("#"))} operations')

# ---------------------------------------------------------------- kernel render script
r = ['# run after the journal:  SolidArc Liger_Rebuild.arc render_rebuild.arc --proofs DIR',
     'show shading plastic', 'show cages off', 'show iso off',
     'view iso', 'view fit', 'view dolly 3', 'render Liger_RB_01_Iso --size=1920x1200',
     'view orbit 150 20', 'view fit', 'view dolly 3', 'render Liger_RB_02_RearQuarter --size=1920x1200',
     'view front', 'view fit', 'view dolly 3', 'render Liger_RB_03_Side --size=1920x1200',
     'view top', 'view fit', 'view dolly 3', 'render Liger_RB_04_Top --size=1920x1200',
     'view right', 'view fit', 'view dolly 3', 'render Liger_RB_05_Front --size=1920x1200',
     'view left', 'view fit', 'view dolly 3', 'render Liger_RB_06_Rear --size=1920x1200']
open(f'{OUT}/SolidArc/render_rebuild.arc', 'w').write('\n'.join(r) + '\n')
print('wrote render_rebuild.arc')

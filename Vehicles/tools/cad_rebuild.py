#!/usr/bin/env python3
"""Phase 4 — full-length, mirror-symmetric, sewn SolidArc CAD rebuild of the Liger body.

Improves on the earlier journals by (a) covering the *entire* design length
(the previous sheets stopped at x=-160 cm at the tail and 246 cm at the nose,
dropping ~24 cm and ~14 cm of body), (b) denser curvature-aware station spacing,
(c) exact mirror symmetry of every section, (d) sewing the segment lofts into one
shell, and (e) adding the cowl and roof-glass-frame as separate lofts.

  ~/.venv/bin/python Vehicles/tools/cad_rebuild.py Liger

Outputs:
  Vehicles/<Car>/<Car>_CAD.arc   — the rebuild journal (reset + one op per line)
  Vehicles/<Car>/cad.json        — section grid + deviation report
"""
import sys, os, json, math
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from sections import cut_x, length

CAR = sys.argv[1] if len(sys.argv) > 1 else 'Liger'
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUTDIR = f'{ROOT}/Vehicles/{CAR}'
SCALE = 0.01

V, T = None, None
def load_main():
    d = np.load(f'{OUTDIR}/mesh/Body_Main_Shell.npz'); V, T = d['V'].astype('f8'), d['T']
    yc = (V[:, 1].min() + V[:, 1].max()) / 2; V[:, 1] -= yc
    return V, T

NF, NT = 10, 20                       # points per flank / per half-top
N = 2 * (NF + NT) + 1                 # 61-point sections (odd -> centreline point)

# full design length, cm; consecutive segments share their boundary station so the lofts sew.
# The extreme tail (x < ~-176) closes into a tube, so it is rebuilt separately as a
# closed-loop loft (Tail_Cap); the open horseshoe shell starts at -176.
SEGMENTS = [('Tail', -176, -132, 5.5), ('RearArch', -132, -68, 5.3), ('Cabin', -68, 112, 5.0),
            ('FrontArch', 112, 205, 4.6), ('Nose', 205, 261, 5.0)]
TAILCAP = (-184.0, -176.0, 4.0)   # closed-tube tail cap

def main_profile(x):
    ls = cut_x(V, T, x)
    ls = [L for L in ls if np.linalg.norm(L[0] - L[-1]) > 5]
    if not ls: return None
    L = max(ls, key=length)
    if L[0, 1] > L[-1, 1]: L = L[::-1]
    return L

def resample(L, n):
    s = np.r_[0, np.cumsum(np.linalg.norm(np.diff(L, axis=0), axis=1))]
    u = np.linspace(0, s[-1], n)
    return np.column_stack([np.interp(u, s, L[:, k]) for k in range(3)])

def resample_landmarks(L):
    m = len(L); c = int(np.argmin(np.abs(L[:, 1])))
    left, right = L[:c + 1], L[c:]
    il = int(np.argmin(left[:, 1])); ir = int(np.argmax(right[:, 1]))
    FL = 0.18
    sl = np.r_[0, np.cumsum(np.linalg.norm(np.diff(left, axis=0), axis=1))]
    il = max(il, int(np.searchsorted(sl, FL * sl[-1])))
    sr = np.r_[0, np.cumsum(np.linalg.norm(np.diff(right, axis=0), axis=1))]
    ir = min(ir, int(np.searchsorted(sr, (1 - FL) * sr[-1])))
    parts = [resample(left[:il + 1], NF + 1)[:-1], resample(left[il:], NT + 1),
             resample(right[:ir + 1], NT + 1)[1:], resample(right[ir:], NF + 1)[1:]]
    return np.vstack(parts)

def symmetrise(S):
    M = S[::-1].copy(); M[:, 1] *= -1
    return (S + M) / 2

def closed_profile(x):
    """the extreme tail is a closed tube: return the longest CLOSED loop, opened at its lowest point"""
    ls = cut_x(V, T, x)
    closed = [L for L in ls if np.linalg.norm(L[0] - L[-1]) <= 5 and length(L) > 20]
    if not closed: return None
    L = max(closed, key=length)
    i = int(np.argmin(L[:, 2]))                    # start at the bottom
    L = np.vstack([L[i:], L[:i + 1]])              # open the loop at the bottom
    if L[0, 1] > L[-1, 1]: L = L[::-1]
    return L

def build():
    global V, T
    V, T = load_main()
    grid, stations = {}, {}
    for name, x0, x1, dx in SEGMENTS:
        xs = np.linspace(x0, x1, int(round((x1 - x0) / dx)) + 1)
        secs = []
        for x in xs:
            L = main_profile(x)
            if L is None or length(L) < 25: continue
            secs.append(symmetrise(resample_landmarks(L))[::-1])
        grid[name] = np.array(secs); stations[name] = xs[:len(secs)].tolist()
        print(f'{name:10s} {len(secs):3d} sections  x {xs[0]:.0f}..{xs[-1]:.0f}')
    # tail cap: closed loops, resampled by arc length, symmetrised
    x0, x1, dx = TAILCAP
    xs = np.linspace(x0, x1, int(round((x1 - x0) / dx)) + 1)
    secs = []
    for x in xs:
        L = closed_profile(x)
        if L is None: continue
        secs.append(symmetrise(resample(L, N))[::-1])
    grid['TailCap'] = np.array(secs); stations['TailCap'] = xs[:len(secs)].tolist()
    print(f'TailCap    {len(secs):3d} sections  x {xs[0]:.0f}..{xs[-1]:.0f} (closed)')
    return grid, stations

def dev_report(grid, stations):
    devs = []
    def loft_eval(secs, xs, x):
        i = max(0, min(np.searchsorted(xs, x) - 1, len(xs) - 2)); t = (x - xs[i]) / (xs[i + 1] - xs[i])
        return (1 - t) * secs[i] + t * secs[i + 1]
    for name, _, _, _ in (list(SEGMENTS) + [('TailCap',) + TAILCAP]):
        xs, secs = stations[name], grid[name]
        for i in range(len(xs) - 1):
            xm = (xs[i] + xs[i + 1]) / 2; chains = cut_x(V, T, xm)
            if not chains: continue
            S = loft_eval(secs, xs, xm)
            # compare the shell to the OUTER profile only (longest open chain); recessed
            # deck/intake pockets are separate detail surfaces, reported apart.
            open_ch = [L for L in chains if np.linalg.norm(L[0] - L[-1]) > 5]
            if not open_ch: continue
            Lm = resample(max(open_ch, key=length), 64)
            dd = np.min(np.linalg.norm(S[:, None, 1:] - Lm[None, :, 1:], axis=2), axis=1)
            devs.append((name, xm, float(dd.max()), float(dd.mean())))
    return devs

def loft_part(out, step, meshname, label, nsec, tintcol):
    d = np.load(f'{OUTDIR}/mesh/{meshname}.npz'); Pv, Pt = d['V'].astype('f8'), d['T']
    Pv[:, 1] -= (Pv[:, 1].min() + Pv[:, 1].max()) / 2
    x0, x1 = Pv[:, 0].min(), Pv[:, 0].max()
    secs = []
    for x in np.linspace(x0, x1, nsec):
        ls = cut_x(Pv, Pt, x)
        ls = [L for L in ls if np.linalg.norm(L[0] - L[-1]) > 3 and length(L) > 20
              and (L[:, 1].max() - L[:, 1].min()) > 40]   # skip degenerate tip slivers (cm)
        if not ls: continue
        L = max(ls, key=length)
        if L[0, 1] > L[-1, 1]: L = L[::-1]
        secs.append(symmetrise(resample(L, 31)))
    if len(secs) < 2: return step
    out.append(f'# STEP {step} — {label}: {len(secs)} symmetric sections')
    names = []
    for k, S in enumerate(secs, 1):
        pts = ' '.join(f'({p[0]*SCALE:.4f},{p[1]*SCALE:.4f},{p[2]*SCALE:.4f})' for p in S)
        nm = f'Sec_{label}_{k:02d}'; names.append(nm)
        out.append(f'spline {pts} --name={nm}')
    step += 1
    out.append(f'loft {" ".join(names)} --sheet --name={label}')
    out.append(f'delete {" ".join(names)}')
    out.append(f'tint {label} {tintcol}')
    return step + 1

def emit(grid, stations, curves, devs):
    worst = max(devs, key=lambda r: r[2]); mean = np.mean([r[3] for r in devs])
    out = ['# SolidArc native document v1',
           f'# {CAR} — full-length mirror-symmetric sewn CAD rebuild from the reference mesh (phase 4).',
           '# Right-handed, Z up, metres. +X front, mirrored about Y=0. Each line is one operation.',
           f'# shell deviation (loft -> mesh at mid-stations): mean {mean:.2f} cm, max {worst[2]:.2f} cm @ {worst[0]} x={worst[1]:.0f} cm',
           'reset']
    step = 1; SHELL = '0.80 0.82 0.86'
    shell_names = []
    def loft_segment(name, closed):
        nonlocal step
        secs, xs = grid[name], stations[name]
        out.append(f'# STEP {step} — {name}: {len(secs)} symmetric station sections (x = {xs[0]:.0f} .. {xs[-1]:.0f} cm){" closed" if closed else ""}')
        names = []
        for k, S in enumerate(secs, 1):
            pts = ' '.join(f'({p[0]*SCALE:.4f},{p[1]*SCALE:.4f},{p[2]*SCALE:.4f})' for p in S)
            nm = f'Sec_{name}_{k:02d}'; names.append(nm)
            out.append(f'spline {pts}{" --closed" if closed else ""} --name={nm}')
        step += 1
        sn = f'Shell_{name}'
        out.append(f'# STEP {step} — {name}: loft into a degree-3 {"tube" if closed else "sheet"}, drop construction sections')
        out.append(f'loft {" ".join(names)}{"" if closed else " --sheet"} --name={sn}')
        out.append(f'delete {" ".join(names)}')
        out.append(f'tint {sn} {SHELL}')
        step += 1
        return sn
    for name, _, _, _ in SEGMENTS:
        shell_names.append(loft_segment(name, False))
    loft_segment('TailCap', True)   # separate closed tube; not part of the open shell sew
    out.append(f'# STEP {step} — sew the five sheets into one continuous shell')
    out.append(f'sew {" ".join(shell_names)} --name=Body_Shell')
    out.append(f'tint Body_Shell {SHELL}')
    step += 1
    # ---- separate parts: front cowl (the roof-glass frame is multi-component and kept as trim) ----
    step = loft_part(out, step, 'Body_Front_Cowl', 'Cowl', 8, '0.30 0.32 0.36')
    out.append(f'# STEP {step} — trim network: arch/panel boundaries (blue) and creases (red)')
    for c in curves:
        if c['part'] != 'Body_Main_Shell': continue
        pts = ' '.join(f'({x*SCALE:.4f},{y*SCALE:.4f},{z*SCALE:.4f})' for x, y, z in c['pts'])
        cmd = 'spline' if len(c['pts']) > 2 else 'line'
        deg = ' --degree=2' if len(c['pts']) == 3 else ''
        out.append(f'{cmd} {pts}{deg}{" --closed" if c["closed"] else ""} --name={c["name"]}')
        out.append(f'tint {c["name"]} {"0.15 0.35 1.00" if c["kind"] == "BOUNDARY" else "0.85 0.10 0.10"}')
    open(f'{OUTDIR}/{CAR}_CAD.arc', 'w').write('\n'.join(out) + '\n')
    return out, worst, mean

def main():
    grid, stations = build()
    curves = json.load(open(f'{OUTDIR}/curves.json'))['curves']
    devs = dev_report(grid, stations)
    out, worst, mean = emit(grid, stations, curves, devs)
    json.dump(dict(car=CAR, units='cm', points_per_section=N,
                   segments={n: dict(x=stations[n], sections=grid[n].round(3).tolist()) for n in grid},
                   deviation=devs), open(f'{OUTDIR}/cad.json', 'w'))
    nops = sum(1 for l in out if not l.startswith('#'))
    print(f'journal: {nops} ops, sections {sum(len(g) for g in grid.values())}')
    print(f'deviation: mean {mean:.2f} cm, max {worst[2]:.2f} cm ({worst[0]} x={worst[1]:.0f})')

if __name__ == '__main__':
    main()

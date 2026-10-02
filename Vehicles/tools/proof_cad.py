#!/usr/bin/env python3
"""Proof sheet: the fitted CAD patch network vs the Blender shell, same cameras.

  ~/.venv/bin/python Vehicles/tools/proof_cad.py Liger

Writes Vehicles/<Car>/<Car>_Body_CAD.png  (3 view pairs + deviation headline).
"""
import sys, os, json, math
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
import nurbs
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.collections import PolyCollection

CAR = sys.argv[1] if len(sys.argv) > 1 else 'Liger'
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = f'{ROOT}/Vehicles/{CAR}'
J = json.load(open(f'{OUT}/cad_body.json'))
d = np.load(f'{OUT}/mesh/Body_Main_Shell.npz')
V, T = d['V'].astype('f8'), d['T'].astype('i8')
V[:, 1] -= (V[:, 1].min() + V[:, 1].max()) / 2


def camera(az, el):
    az, el = math.radians(az), math.radians(el)
    f = np.array([math.cos(el) * math.cos(az), math.cos(el) * math.sin(az), math.sin(el)])
    r = np.cross([0, 0, 1], f); r /= np.linalg.norm(r)
    return np.array([r, np.cross(f, r), f])


def paint(ax, quads, R, tintc=(0.85, 0.87, 0.92)):
    Lv = np.array([0.3, -0.5, 0.8]); Lv /= np.linalg.norm(Lv)
    n = np.cross(quads[:, 2] - quads[:, 0], quads[:, 3] - quads[:, 1])
    n /= np.linalg.norm(n, axis=1, keepdims=True) + 1e-9
    lam = np.abs(n @ Lv); P = quads @ R.T
    o = np.argsort(P[:, :, 2].mean(1)); c = np.clip(0.3 + 0.65 * lam, 0, 1)[o]
    rgb = np.column_stack([c * tintc[0], c * tintc[1], c * tintc[2]])
    ax.add_collection(PolyCollection(P[o][:, :, :2], facecolors=rgb, edgecolors='none'))
    ax.autoscale_view(); ax.set_aspect('equal'); ax.set_axis_off()


Q = []
for p in J['patches']:
    P = np.array(p['poles'])
    for sign in (1, -1):
        Ps = P.copy(); Ps[:, :, 1] *= sign
        if sign < 0: Ps = Ps[:, ::-1, :]
        S, u, v = nurbs.grid(p['cu'], p['cv'], 3, Ps, 14, 14)
        A, B, C, D = S[:-1, :-1], S[1:, :-1], S[1:, 1:], S[:-1, 1:]
        Q.append(np.stack([A, B, C, D], axis=2).reshape(-1, 4, 3))
Q = np.vstack(Q)
mq = np.concatenate([V[T], V[T][:, 2:3]], axis=1)
fig, axs = plt.subplots(3, 2, figsize=(22, 15), dpi=100)
for row, (az, el, t) in enumerate([(-55, 20, 'front three-quarter'), (130, 18, 'rear three-quarter'), (-90, 2, 'side')]):
    R = camera(az, el)
    paint(axs[row, 0], mq, R); axs[row, 0].set_title(f'Blender shell (reference) — {t}')
    paint(axs[row, 1], Q, R); axs[row, 1].set_title(f'CAD body: {len(J["patches"]) * 2} sewn bicubic patches — {t}')
fig.suptitle(f'{CAR}_Body_CAD.arc — fitted NURBS network vs Blender shell · '
             f'deviation mean {J["fit"]["mean"]:.2f} cm, worst {J["fit"]["max"]:.1f} cm', fontsize=14)
plt.tight_layout(); fig.savefig(f'{OUT}/{CAR}_Body_CAD.png')
print('wrote', f'{OUT}/{CAR}_Body_CAD.png')

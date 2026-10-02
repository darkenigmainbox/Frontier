"""Clamped-uniform B-spline basis + constrained least-squares fitting.

Everything here mirrors the SolidArc kernel exactly (Kernel/SurfaceSpecification.cpp
`ClampedUniform`, Kernel/CurveSpecification.cpp `ClampedUniformKnots`): a `patch
countU countV poles... --degree=p` figure is a tensor-product B-spline with clamped
UNIFORM knot vectors in both directions and unit weights, row-major pole order
(index = iu * countV + iv).  Because the knots are a pure function of (count, degree),
two patches that share a pole row/column and the same count on the running direction
share that edge curve EXACTLY - which is what lets `sew` stitch the fitted network
into one body with zero gaps.
"""
import numpy as np


def clamped_uniform(count, degree):
    """Knot vector identical to the kernel's ClampedUniform(count, degree)."""
    k = np.zeros(count + degree + 1)
    interior = count - degree - 1
    for i in range(degree + 1):
        k[i] = 0.0
        k[count + i] = 1.0
    for i in range(1, interior + 1):
        k[degree + i] = i / (interior + 1.0)
    return k


def basis(knots, degree, t):
    """Cox-de Boor: values of all n = len(knots)-degree-1 basis functions at t -> (len(t), n)."""
    t = np.atleast_1d(np.asarray(t, dtype=float))
    nk = len(knots)
    n = nk - degree - 1
    N = np.zeros((len(t), nk))
    for i in range(nk - 1):                                   # degree 0
        N[:, i] = (t >= knots[i]) & (t < knots[i + 1])
    end = max(i for i in range(nk - 1) if knots[i] < knots[i + 1])
    at1 = (t >= knots[nk - 1])                                # right end: limit span
    N[at1] = 0.0
    N[at1, end] = 1.0
    for p in range(1, degree + 1):
        M = np.zeros((len(t), nk))
        for i in range(nk - p - 1):
            d1 = knots[i + p] - knots[i]
            d2 = knots[i + p + 1] - knots[i + 1]
            a = np.where(d1 > 0, (t - knots[i]) / d1, 0.0) if d1 > 0 else 0.0
            b = np.where(d2 > 0, (knots[i + p + 1] - t) / d2, 0.0) if d2 > 0 else 0.0
            M[:, i] = a * N[:, i] + b * N[:, i + 1]
        N = M
    return N[:, :n]


def basis_matrix(count, degree, t):
    """(len(t), count) matrix of basis function values; clamped uniform knots."""
    return basis(clamped_uniform(count, degree), degree, t)


def surface(count_u, count_v, degree, poles, u, v):
    """Evaluate the tensor product surface. poles: (count_u, count_v, 3)."""
    Nu = basis_matrix(count_u, degree, u)
    Nv = basis_matrix(count_v, degree, v)
    P = poles.reshape(count_u, count_v, 3)
    out = np.einsum('mi,mj,ijc->mc', Nu, Nv, P)
    return out


def grid(count_u, count_v, degree, poles, nu=24, nv=24):
    u = np.linspace(0, 1, nu)
    v = np.linspace(0, 1, nv)
    U, Vv = np.meshgrid(u, v, indexing='ij')
    S = surface(count_u, count_v, degree, poles, U.ravel(), Vv.ravel())
    return S.reshape(nu, nv, 3), u, v


def fit_surface(count_u, count_v, degree, u, v, pts, fixed=None, ridge=1e-8, fair=0.0):
    """Least-squares tensor-product fit.

    u, v, pts: (m,) / (m,) / (m,3).  `fixed`: dict {(iu, iv): point3} poles held exactly
    (boundary rows/columns shared with neighbouring patches).  `fair`: weight of a
    second-difference (thin-plate) penalty on the free poles that keeps the patch from
    folding when the data or the held boundary is inconsistent.  Returns poles
    (count_u, count_v, 3).
    """
    Nu = basis_matrix(count_u, degree, u)          # (m, cu)
    Nv = basis_matrix(count_v, degree, v)          # (m, cv)
    A = Nu[:, :, None] * Nv[:, None, :]            # (m, cu, cv)
    A = A.reshape(len(u), count_u * count_v)
    rhs = pts.astype(float).copy()                 # (m,3)
    free = []
    idx = {}
    for i in range(count_u):
        for j in range(count_v):
            idx[(i, j)] = i * count_v + j
            if fixed is None or (i, j) not in fixed:
                free.append(i * count_v + j)
    fixed_cols = [c for c in range(count_u * count_v) if c not in free]
    Fpen = None
    if fair > 0:
        rows = []
        for i in range(count_u):
            for j in range(count_v):
                for di, dj in ((1, 0), (0, 1)):
                    if di and i >= 2:
                        r = np.zeros(count_u * count_v)
                        r[idx[(i, j)]] = 1; r[idx[(i - 1, j)]] = -2; r[idx[(i - 2, j)]] = 1
                        rows.append(r)
                    if dj and j >= 2:
                        r = np.zeros(count_u * count_v)
                        r[idx[(i, j)]] = 1; r[idx[(i, j - 1)]] = -2; r[idx[(i, j - 2)]] = 1
                        rows.append(r)
        Fpen = np.array(rows)
        rhsf = -Fpen[:, fixed_cols] @ np.array([fixed[(c // count_v, c % count_v)] for c in fixed_cols]).reshape(-1, 3) if fixed_cols else np.zeros((len(rows), 3))
    if fixed_cols:
        F = np.zeros((len(u), len(fixed_cols)))
        for k, c in enumerate(fixed_cols):
            F[:, k] = A[:, c]
            ij = (c // count_v, c % count_v)
            rhs -= np.outer(A[:, c], np.asarray(fixed[ij], dtype=float))
    Af = A[:, free]
    G = Af.T @ Af + ridge * np.eye(len(free))
    B = Af.T @ rhs
    if Fpen is not None:
        Ff = Fpen[:, free]
        G = G + fair * (Ff.T @ Ff)
        B = B + fair * (Ff.T @ rhsf)
    sol = np.linalg.solve(G, B)
    poles = np.zeros((count_u * count_v, 3))
    for k, c in enumerate(free):
        poles[c] = sol[k]
    if fixed:
        for ij, p in fixed.items():
            poles[idx[ij]] = p
    return poles.reshape(count_u, count_v, 3)


def fit_curve(count, degree, t, pts, fixed=None, ridge=1e-9):
    """1-D clamped-uniform B-spline least-squares fit; `fixed` {i: point}."""
    N = basis_matrix(count, degree, t)
    rhs = np.asarray(pts, float)
    free = [i for i in range(count) if fixed is None or i not in fixed]
    if fixed:
        for i, p in fixed.items():
            rhs = rhs - np.outer(N[:, i], np.asarray(p, float))
    A = N[:, free]
    sol = np.linalg.solve(A.T @ A + ridge * np.eye(len(free)), A.T @ rhs)
    out = np.zeros((count, 3))
    for k, i in enumerate(free):
        out[i] = sol[k]
    if fixed:
        for i, p in fixed.items():
            out[i] = p
    return out


def curve_points(count, degree, poles, t):
    N = basis_matrix(count, degree, t)
    return N @ poles

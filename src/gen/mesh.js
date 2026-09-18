/* ============================================================
 * Frontier · SDF terrain — surface extraction (SurfaceNets)
 *
 * The SDF is the terrain; the mesh is a *view* of it. Extraction
 * happens per chunk so a brush stroke only re-tessellates what it
 * touched (a 16³ chunk is ~2 ms).
 *
 * Why SurfaceNets rather than Marching Cubes:
 *   · no 256-entry tables to get wrong, and no ambiguous cases —
 *     topology is derived from the field itself;
 *   · one vertex per sign-changing cell ⇒ quad output that is far
 *     cleaner than MC's sliver triangles, which matters a lot when
 *     the erosion has just cut sub-cell rills;
 *   · the vertex is projected back onto the zero level set along the
 *     field gradient, which recovers the sharpness MC would give.
 *
 * Chunk ownership: a quad belongs to the chunk that owns the *lowest*
 * cell touching the grid edge, so each quad is emitted exactly once
 * and neighbouring chunks stay seam-free (they share the same field).
 * ============================================================ */

const CUBE_EDGES = [
  // [corner a, corner b] of the unit cell, corner index = x + 2y + 4z
  [0, 1], [1, 3], [2, 3], [0, 2],
  [4, 5], [5, 7], [6, 7], [4, 6],
  [0, 4], [1, 5], [3, 7], [2, 6],
];

const CORNER_OFF = [
  [0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0],
  [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1],
];

export class MeshBuilder {
  constructor(capacity = 4096) {
    this.cap = capacity;
    this.positions = new Float32Array(capacity * 3);
    this.normals = new Float32Array(capacity * 3);
    this.attrs = new Float32Array(capacity * 8);
    this.indices = new Uint32Array(capacity * 6);
    this.vCount = 0;
    this.iCount = 0;
  }
  reset() { this.vCount = 0; this.iCount = 0; return this; }
  growV(need) {
    if (this.vCount + need <= this.cap) return;
    while (this.vCount + need > this.cap) this.cap *= 2;
    const p = new Float32Array(this.cap * 3); p.set(this.positions); this.positions = p;
    const n = new Float32Array(this.cap * 3); n.set(this.normals); this.normals = n;
    const a = new Float32Array(this.cap * 8); a.set(this.attrs); this.attrs = a;
    const i = new Uint32Array(this.cap * 6); i.set(this.indices); this.indices = i;
  }
  addVertex(x, y, z, nx, ny, nz, a0, a1, a2, a3, b0, b1, b2, b3) {
    this.growV(1);
    const v = this.vCount, p3 = v * 3, a8 = v * 8;
    this.positions[p3] = x; this.positions[p3 + 1] = y; this.positions[p3 + 2] = z;
    this.normals[p3] = nx; this.normals[p3 + 1] = ny; this.normals[p3 + 2] = nz;
    this.attrs[a8] = a0; this.attrs[a8 + 1] = a1; this.attrs[a8 + 2] = a2; this.attrs[a8 + 3] = a3;
    this.attrs[a8 + 4] = b0; this.attrs[a8 + 5] = b1; this.attrs[a8 + 6] = b2; this.attrs[a8 + 7] = b3;
    this.vCount++;
    return v;
  }
  addQuad(a, b, c, d) {
    if (this.iCount + 6 > this.cap * 6) {
      // indices grow with vertices; the vertex growth handles the rest
      this.growV(1);
    }
    this.indices[this.iCount++] = a;
    this.indices[this.iCount++] = b;
    this.indices[this.iCount++] = c;
    this.indices[this.iCount++] = a;
    this.indices[this.iCount++] = c;
    this.indices[this.iCount++] = d;
  }
}

/**
 * Extract one chunk into `out` (a MeshBuilder).
 *
 * @param {import('../core/sdf-volume.js').SdfVolume} vol
 * @param {number} ci chunk index
 * @param {MeshBuilder} out
 * @param {(x:number,z:number)=>object} [attrFn] per-vertex attribute lookup
 * @param {object} [opt] { project:boolean }
 */
export function meshChunk(vol, ci, out, attrFn = null, opt = {}) {
  const { nx, ny, nz, data, chunk } = vol;
  const project = opt.project !== false;
  const csx = Math.min(chunk, vol.nx - (vol.chunkCoord(ci)[0]) * chunk);
  void csx;
  const [cx, cy, cz] = vol.chunkCoord(ci);
  const x0 = cx * chunk, y0 = cy * chunk, z0 = cz * chunk;
  const x1 = Math.min(x0 + chunk, nx), y1 = Math.min(y0 + chunk, ny), z1 = Math.min(z0 + chunk, nz);

  // vertex map over the *extended* cell range (one cell of overlap on each side)
  const ex0 = Math.max(0, x0 - 1), ey0 = Math.max(0, y0 - 1), ez0 = Math.max(0, z0 - 1);
  const ex1 = Math.min(nx - 2, x1), ey1 = Math.min(ny - 2, y1), ez1 = Math.min(nz - 2, z1);
  const sx = ex1 - ex0 + 1, sy = ey1 - ey0 + 1, sz = ez1 - ez0 + 1;
  const cellIndex = new Int32Array(sx * sy * sz).fill(-1);
  const cellId = (i, j, k) => (k - ez0) * sx * sy + (j - ey0) * sx + (i - ex0);

  const idx = (i, j, k) => (k * ny + j) * nx + i;
  const corner = new Float32Array(8);
  const cornerPos = new Float32Array(24);
  const px = new Float32Array(8), py = new Float32Array(8), pz = new Float32Array(8);

  const computeVertex = (i, j, k) => {
    // 8 corner distances
    let neg = 0;
    for (let c = 0; c < 8; c++) {
      const o = CORNER_OFF[c];
      const v = data[idx(i + o[0], j + o[1], k + o[2])];
      corner[c] = v;
      if (v < 0) neg++;
      px[c] = vol.min[0] + (i + o[0]) * vol.cell[0];
      py[c] = vol.min[1] + (j + o[1]) * vol.cell[1];
      pz[c] = vol.min[2] + (k + o[2]) * vol.cell[2];
    }
    if (neg === 0 || neg === 8) return -1;
    let sx0 = 0, sy0 = 0, sz0 = 0, n = 0;
    for (let e = 0; e < 12; e++) {
      const [a, b] = CUBE_EDGES[e];
      const da = corner[a], db = corner[b];
      if ((da < 0) === (db < 0)) continue;
      const t = da / (da - db);
      sx0 += px[a] + (px[b] - px[a]) * t;
      sy0 += py[a] + (py[b] - py[a]) * t;
      sz0 += pz[a] + (pz[b] - pz[a]) * t;
      n++;
    }
    if (!n) return -1;
    let vx = sx0 / n, vy = sy0 / n, vz = sz0 / n;
    // project onto the zero level set along the gradient (2 Newton steps)
    if (project) {
      for (let it = 0; it < 2; it++) {
        const d = vol.sampleWorld(vx, vy, vz);
        if (Math.abs(d) < 1e-4) break;
        const g = vol.gradient(vx, vy, vz, G);
        const gl = g[0] * g[0] + g[1] * g[1] + g[2] * g[2];
        if (gl < 1e-8) break;
        const f = Math.min(1.5, d / gl);
        vx -= g[0] * f; vy -= g[1] * f; vz -= g[2] * f;
      }
    }
    const nrm = vol.normal(vx, vy, vz, N);
    let a = EMPTY_ATTR;
    if (attrFn) a = attrFn(vx, vy, vz);
    const v = out.addVertex(vx, vy, vz, nrm[0], nrm[1], nrm[2],
      a.e, a.d, a.f, a.w, a.s, a.c, a.h, a.t);
    cellIndex[cellId(i, j, k)] = v;
    return v;
  };

  const vertAt = (i, j, k) => {
    if (i < ex0 || j < ey0 || k < ez0 || i > ex1 || j > ey1 || k > ez1) return -1;
    const id = cellId(i, j, k);
    const cached = cellIndex[id];
    if (cached !== -1) return cached;
    return computeVertex(i, j, k);
  };

  const tryQuad = (c0, c1, c2, c3) => {
    const v0 = vertAt(...c0), v1 = vertAt(...c1), v2 = vertAt(...c2), v3 = vertAt(...c3);
    if (v0 < 0 || v1 < 0 || v2 < 0 || v3 < 0) return;
    // orient the quad so its normal points along +∇d (out of the rock)
    const P = out.positions;
    const ax = P[v1 * 3] - P[v0 * 3], ay = P[v1 * 3 + 1] - P[v0 * 3 + 1], az = P[v1 * 3 + 2] - P[v0 * 3 + 2];
    const bx = P[v2 * 3] - P[v0 * 3], by = P[v2 * 3 + 1] - P[v0 * 3 + 1], bz = P[v2 * 3 + 2] - P[v0 * 3 + 2];
    const qx = ay * bz - az * by, qy = az * bx - ax * bz, qz = ax * by - ay * bx;
    const mid = [(P[v0 * 3] + P[v2 * 3]) * 0.5, (P[v0 * 3 + 1] + P[v2 * 3 + 1]) * 0.5, (P[v0 * 3 + 2] + P[v2 * 3 + 2]) * 0.5];
    const g = vol.gradient(mid[0], mid[1], mid[2], G);
    if (qx * g[0] + qy * g[1] + qz * g[2] < 0) out.addQuad(v0, v3, v2, v1);
    else out.addQuad(v0, v1, v2, v3);
  };

  const inside = (i, j, k) => i >= 0 && j >= 0 && k >= 0 && i < nx - 1 && j < ny - 1 && k < nz - 1;
  const dAt = (i, j, k) => (inside(i, j, k) ? data[idx(i, j, k)] : 1);

  // ---- X edges: cells (i, j-1..j, k-1..k) -------------------------------
  for (let i = Math.max(0, x0); i < Math.min(x1, nx - 1); i++) {
    for (let j = Math.max(cy * chunk + 1, 1); j < Math.min((cy + 1) * chunk + 1, ny - 1); j++) {
      for (let k = Math.max(cz * chunk + 1, 1); k < Math.min((cz + 1) * chunk + 1, nz - 1); k++) {
        const a = dAt(i, j, k), b = dAt(i + 1, j, k);
        if ((a < 0) === (b < 0)) continue;
        tryQuad([i, j - 1, k - 1], [i, j, k - 1], [i, j, k], [i, j - 1, k]);
      }
    }
  }
  // ---- Y edges: cells (i-1..i, j, k-1..k) -------------------------------
  for (let j = Math.max(0, y0); j < Math.min(y1, ny - 1); j++) {
    for (let i = Math.max(cx * chunk + 1, 1); i < Math.min((cx + 1) * chunk + 1, nx - 1); i++) {
      for (let k = Math.max(cz * chunk + 1, 1); k < Math.min((cz + 1) * chunk + 1, nz - 1); k++) {
        const a = dAt(i, j, k), b = dAt(i, j + 1, k);
        if ((a < 0) === (b < 0)) continue;
        tryQuad([i - 1, j, k - 1], [i, j, k - 1], [i, j, k], [i - 1, j, k]);
      }
    }
  }
  // ---- Z edges: cells (i-1..i, j-1..j, k) -------------------------------
  for (let k = Math.max(0, z0); k < Math.min(z1, nz - 1); k++) {
    for (let i = Math.max(cx * chunk + 1, 1); i < Math.min((cx + 1) * chunk + 1, nx - 1); i++) {
      for (let j = Math.max(cy * chunk + 1, 1); j < Math.min((cy + 1) * chunk + 1, ny - 1); j++) {
        const a = dAt(i, j, k), b = dAt(i, j, k + 1);
        if ((a < 0) === (b < 0)) continue;
        tryQuad([i - 1, j - 1, k], [i, j - 1, k], [i, j, k], [i - 1, j, k]);
      }
    }
  }
  return out;
}

const G = [0, 0, 0];
const N = [0, 1, 0];
const EMPTY_ATTR = { e: 0, d: 0, f: 0, w: 0, s: 0, c: 0, h: 0, t: 0 };

/** True when a chunk can possibly contain a surface (skip empty chunks). */
export function chunkHasSurface(vol, ci) {
  return vol.chunkMin[ci] <= 0 && vol.chunkMax[ci] >= 0;
}

/** World-space AABB of a chunk's geometry, padded — for frustum culling. */
export function chunkBounds(vol, ci) {
  return vol.chunkWorldBounds(ci);
}

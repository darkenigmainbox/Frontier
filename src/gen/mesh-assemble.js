/* ============================================================
 * Frontier · SDF terrain — chunk meshes and assembly
 *
 * Ties the SurfaceNets extractor to the erosion field so every vertex
 * carries the channels the materials and the exporters need
 * (erosion, deposition, flow, wetness, slope, curvature, height,
 * trail), plus UVs in the terrain's own 0..1 space.
 *
 * Assembly is chunk-parallel in spirit (chunks are independent) and is
 * also the unit of *re*-meshing: a sculpt stroke marks chunks dirty
 * and only those get re-extracted.
 * ============================================================ */

import { MeshBuilder, meshChunk } from './mesh.js';

/**
 * Build the vertex attribute lookup for a volume/grid pair.
 * @returns {(x:number,y:number,z:number)=>object}
 */
export function makeAttributeFn(vol, hf, channels) {
  const nx = hf.nx, nz = hf.nz;
  let maxE = 1e-6, maxD = 1e-6, maxF = 1e-6;
  for (let i = 0; i < nx * nz; i++) {
    maxE = Math.max(maxE, hf.erosion[i]);
    maxD = Math.max(maxD, hf.deposit[i]);
    maxF = Math.max(maxF, hf.flow[i]);
  }
  const logMax = Math.log(1 + maxF);
  const out = { e: 0, d: 0, f: 0, w: 0, s: 0, c: 0, h: 0, t: 0 };
  return (x, y, z) => {
    const i = Math.min(nx - 1, Math.max(0, Math.round((x - hf.minX) / hf.cellX)));
    const j = Math.min(nz - 1, Math.max(0, Math.round((z - hf.minZ) / hf.cellZ)));
    const k = j * nx + i;
    out.e = hf.erosion[k] / maxE;
    out.d = hf.deposit[k] / maxD;
    out.f = Math.log(1 + hf.flow[k]) / logMax;
    out.w = hf.wet[k];
    out.s = Math.min(1, hf.slope[k] / 2.2);
    out.c = channels?.curvature ? channels.curvature[k] : 0;
    out.h = channels?.height ? channels.height[k] : 0;
    out.t = channels?.exposure ? channels.exposure[k] : 0;
    void y;
    return out;
  };
}

/**
 * Extract one chunk and append it to a shared builder.
 * @returns {number} vertices added
 */
export function appendChunk(vol, ci, builder, attrFn, opt = {}) {
  const before = builder.vCount;
  meshChunk(vol, ci, builder, attrFn, opt);
  return builder.vCount - before;
}

/**
 * Extract the whole volume.
 * @param {import('../core/sdf-volume.js').SdfVolume} vol
 * @param {object} o
 * @returns {{positions:Float32Array, normals:Float32Array, attrs:Float32Array,
 *            indices:Uint32Array, uvs:Float32Array, vertexCount:number, indexCount:number}}
 */
export function meshVolume(vol, {
  hf = null, channels = null, onlySurfaceChunks = true, chunkFilter = null, project = true,
} = {}) {
  const attrFn = hf ? makeAttributeFn(vol, hf, channels) : null;
  const builder = new MeshBuilder(1 << 16);
  for (let ci = 0; ci < vol.chunkCount; ci++) {
    if (chunkFilter && !chunkFilter(ci)) continue;
    if (onlySurfaceChunks && (vol.chunkMin[ci] > 0 || vol.chunkMax[ci] < 0)) continue;
    meshChunk(vol, ci, builder, attrFn, { project });
  }
  const n = builder.vCount;
  const positions = builder.positions.slice(0, n * 3);
  const normals = builder.normals.slice(0, n * 3);
  const attrs = builder.attrs.slice(0, n * 8);
  const indices = builder.indices.slice(0, builder.iCount);
  // UVs in terrain space so the heightmap/splatmap exports line up with the mesh
  const uvs = new Float32Array(n * 2);
  const sx = vol.size[0], sz = vol.size[2];
  for (let i = 0; i < n; i++) {
    uvs[i * 2] = (positions[i * 3] - vol.min[0]) / sx;
    uvs[i * 2 + 1] = (positions[i * 3 + 2] - vol.min[2]) / sz;
  }
  return {
    positions, normals, attrs, indices, uvs,
    vertexCount: n, indexCount: builder.iCount,
  };
}

/** Remesh only the dirty chunks, replacing their ranges in a previous result. */
export function remeshDirty(vol, previous, { hf = null, channels = null } = {}) {
  if (!vol.meshDirty.size) return previous;
  const attrFn = hf ? makeAttributeFn(vol, hf, channels) : null;
  const rebuild = Array.from(vol.meshDirty);
  vol.meshDirty.clear();
  if (rebuild.length > vol.chunkCount * 0.5) {
    return meshVolume(vol, { hf, channels });
  }
  // Simplest correct policy: re-extract everything (chunk ranges would need
  // a range index, which is not worth the complexity at these grid sizes).
  void attrFn;
  return meshVolume(vol, { hf, channels });
}

/** Triangle count for a mesh result. */
export const triangleCount = (mesh) => mesh.indexCount / 3;

/** Bounding box of a mesh (for framing / export metadata). */
export function meshBounds(mesh) {
  const p = mesh.positions;
  const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < p.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      if (p[i + k] < mn[k]) mn[k] = p[i + k];
      if (p[i + k] > mx[k]) mx[k] = p[i + k];
    }
  }
  return { min: mn, max: mx };
}

/**
 * Split a combined mesh back into per-chunk chunks for the exporters —
 * the OBJ writer takes the same shape, so exports and the app share the
 * buffer layout.
 */
export function splitByChunk(vol, mesh, hf, splats) {
  const out = [];
  const { positions, normals, attrs, indices, uvs } = mesh;
  const chunkOf = (vi) => vol.chunkIndexAt(positions[vi * 3], positions[vi * 3 + 1], positions[vi * 3 + 2]);
  const groups = new Map();
  for (let t = 0; t < indices.length; t += 3) {
    const c = chunkOf(indices[t]);
    let g = groups.get(c);
    if (!g) { g = []; groups.set(c, g); }
    g.push(indices[t], indices[t + 1], indices[t + 2]);
  }
  for (const tri of groups.values()) {
    const map = new Map();
    const pos = [], nrm = [], at = [], ind = [], uv = [];
    for (const vi of tri) {
      let ni = map.get(vi);
      if (ni === undefined) {
        ni = pos.length / 3;
        map.set(vi, ni);
        pos.push(positions[vi * 3], positions[vi * 3 + 1], positions[vi * 3 + 2]);
        nrm.push(normals[vi * 3], normals[vi * 3 + 1], normals[vi * 3 + 2]);
        uv.push(uvs[vi * 2], uvs[vi * 2 + 1]);
        for (let k = 0; k < 8; k++) at.push(attrs[vi * 8 + k]);
      }
      ind.push(ni);
    }
    out.push({
      positions: new Float32Array(pos),
      normals: new Float32Array(nrm),
      attrs: new Float32Array(at),
      uvs: new Float32Array(uv),
      indices: new Uint32Array(ind),
      splats: splatWeightsFor(splats, hf, pos),
    });
  }
  return out;
}

/** Per-vertex 5-layer weights sampled from the splat model. */
function splatWeightsFor(splats, hf, positions) {
  const n = positions.length / 3;
  const out = new Float32Array(n * 5);
  if (!splats) return out;
  for (let i = 0; i < n; i++) {
    const x = positions[i * 3], z = positions[i * 3 + 2];
    const fi = Math.min(hf.nx - 1, Math.max(0, Math.round((x - hf.minX) / hf.cellX)));
    const fj = Math.min(hf.nz - 1, Math.max(0, Math.round((z - hf.minZ) / hf.cellZ)));
    const k = fj * hf.nx + fi;
    for (let l = 0; l < 5; l++) out[i * 5 + l] = splats.weights[k * 5 + l];
  }
  return out;
}

// Frontier — node-graph engine + node definitions. DOM-free.
// Generators run chunked (async) over row ranges; eroders are stateful sims.

import { fbm, ridged, multifractal, mountain, warpVec, terrace, smoothstep, clamp, mulberry32 } from './noise.js';
import { SDFVolume, sminP, smaxP } from './sdf.js';
import { RainSim, WindSim, ThermalSim, ChemicalSim, RainDefaults, WindDefaults, ThermalDefaults, ChemicalDefaults } from './erosion.js';
import { meshSurfaceNets } from './mesher.js';

export { RainDefaults, WindDefaults, ThermalDefaults, ChemicalDefaults };

// ---------- param schema helpers ----------
const P = (name, label, def, min, max, step = 0, opts = {}) =>
  ({ name, label, def, min, max, step, ...opts });

let _uid = 1;
export function nid(prefix = 'n') { return prefix + (_uid++); }

// ---------- node definitions ----------
export const NODE_DEFS = {
  IslandBase: {
    title: 'Island Base', category: 'Source', color: '#4da3ff',
    inputs: [], outputs: ['sdf'],
    params: [
      P('relief', 'Relief (m)', 420, 100, 700, 5),
      P('seaLevel', 'Sea level (m)', 0, -100, 100, 1),
      P('islandR', 'Island radius', 0.42, 0.2, 0.49, 0.005),
      P('shelf', 'Coast shelf', 0.16, 0.02, 0.4, 0.005),
      P('baseFreq', 'Base freq', 1.6, 0.5, 4, 0.05),
      P('seed', 'Seed', 20260, 0, 99999, 1),
    ],
    isSource: true,
    run(node, vol, ctx, j0, j1) {
      const p = node.params;
      const cx = vol.minX + vol.sizeX / 2, cz = vol.minZ + vol.sizeZ / 2;
      const R = vol.sizeX * p.islandR;
      for (let j = j0; j < j1; j++) {
        for (let k = 0; k < vol.nz; k++) {
          for (let i = 0; i < vol.nx; i++) {
            const id = vol.idx(i, j, k);
            const x = vol.minX + (i / (vol.nx - 1)) * vol.sizeX;
            const y = vol.minY + (j / (vol.ny - 1)) * vol.sizeY;
            const z = vol.minZ + (k / (vol.nz - 1)) * vol.sizeZ;
            const r = Math.hypot(x - cx, z - cz) / R;
            // Island mask: 1 center -> 0 ocean, with shelf.
            const mask = 1 - smoothstep(1 - p.shelf * 2.2, 1.0, r + 0.08 * fbm(x * 0.004, 0, z * 0.004, { octaves: 3, seed: p.seed }));
            const m = mountain(x * 0.0016 * p.baseFreq, y * 0.0011 * p.baseFreq, z * 0.0016 * p.baseFreq,
              { freq: 1, warp: 0.42, ridgeAmp: 1.0, baseAmp: 0.42, strataWarp: 0.35, octaves: 5, seed: p.seed });
            const h = p.seaLevel + (m - 0.28) * p.relief * (0.25 + 0.75 * mask) - (1 - mask) * 130;
            vol.dist[id] = y - h; // <0 solid. (3D noises above keep this overhang-capable downstream.)
            // Base hardness: higher + ridged areas harder.
            vol.hard[id] = clamp(0.42 + 0.3 * m + 0.15 * fbm(x * 0.01, y * 0.01, z * 0.01, { octaves: 2, seed: p.seed + 5 }) * 0.5 + 0.075, 0.05, 1);
            vol.strata[id] = 0;
            vol.sed[id] = 0; vol.moist[id] = 0; vol.flow[id] = 0; vol.emask[id] = 0;
          }
        }
      }
      // Solid floor + soft side walls so the mesh closes.
      if (j0 === 0) {
        for (let k = 0; k < vol.nz; k++)
          for (let i = 0; i < vol.nx; i++) {
            const id = vol.idx(i, 0, k);
            if (vol.dist[id] > 0) vol.dist[id] = -5;
          }
      }
    },
  },

  Mountain: {
    title: 'Mountain', category: 'Source', color: '#4da3ff',
    inputs: ['sdf'], outputs: ['sdf'],
    params: [
      P('freq', 'Frequency', 2.4, 0.5, 8, 0.05),
      P('amp', 'Amplitude (m)', 150, 0, 400, 2),
      P('warp', 'Domain warp', 0.5, 0, 1.2, 0.02),
      P('ridge', 'Ridge weight', 1.0, 0, 1.5, 0.02),
      P('octaves', 'Octaves', 5, 2, 8, 1),
      P('seed', 'Seed', 3101, 0, 99999, 1),
    ],
    run(node, vol, ctx, j0, j1) {
      const p = node.params;
      const s = 0.0016 * p.freq;
      for (let j = j0; j < j1; j++)
        for (let k = 0; k < vol.nz; k++)
          for (let i = 0; i < vol.nx; i++) {
            const id = vol.idx(i, j, k);
            const x = vol.minX + (i / (vol.nx - 1)) * vol.sizeX;
            const y = vol.minY + (j / (vol.ny - 1)) * vol.sizeY;
            const z = vol.minZ + (k / (vol.nz - 1)) * vol.sizeZ;
            const m = mountain(x * s, y * s * 0.7, z * s,
              { freq: 1, warp: p.warp, ridgeAmp: p.ridge, baseAmp: 0.35, octaves: Math.round(p.octaves), seed: p.seed });
            vol.dist[id] -= (m - 0.42) * p.amp;
            vol.hard[id] = clamp(vol.hard[id] + (m - 0.5) * 0.12, 0.05, 1);
          }
    },
  },

  Ridged3D: {
    title: 'Ridged 3D', category: 'Source', color: '#4da3ff',
    inputs: ['sdf'], outputs: ['sdf'],
    params: [
      P('freq', 'Frequency', 6.0, 0.5, 30, 0.1),
      P('amp', 'Amplitude (m)', 40, -150, 150, 1),
      P('octaves', 'Octaves', 4, 1, 8, 1),
      P('mode', 'Mode', 0, 0, 1, 1, { labels: ['Add', 'Carve'] }),
      P('seed', 'Seed', 77, 0, 99999, 1),
    ],
    run(node, vol, ctx, j0, j1) {
      const p = node.params;
      const s = 0.004 * p.freq;
      for (let j = j0; j < j1; j++)
        for (let k = 0; k < vol.nz; k++)
          for (let i = 0; i < vol.nx; i++) {
            const id = vol.idx(i, j, k);
            const x = vol.minX + (i / (vol.nx - 1)) * vol.sizeX;
            const y = vol.minY + (j / (vol.ny - 1)) * vol.sizeY;
            const z = vol.minZ + (k / (vol.nz - 1)) * vol.sizeZ;
            const r = ridged(x * s, y * s, z * s, { octaves: Math.round(p.octaves), seed: p.seed });
            const v = (r - 0.45) * Math.abs(p.amp);
            vol.dist[id] += (p.mode === 1 ? v : -v) * Math.sign(p.amp || 1);
          }
    },
  },

  Fbm3D: {
    title: 'FBM Detail', category: 'Source', color: '#4da3ff',
    inputs: ['sdf'], outputs: ['sdf'],
    params: [
      P('freq', 'Frequency', 9.0, 0.5, 40, 0.1),
      P('amp', 'Amplitude (m)', 22, -120, 120, 1),
      P('octaves', 'Octaves', 4, 1, 8, 1),
      P('seed', 'Seed', 913, 0, 99999, 1),
    ],
    run(node, vol, ctx, j0, j1) {
      const p = node.params;
      const s = 0.004 * p.freq;
      for (let j = j0; j < j1; j++)
        for (let k = 0; k < vol.nz; k++)
          for (let i = 0; i < vol.nx; i++) {
            const id = vol.idx(i, j, k);
            const x = vol.minX + (i / (vol.nx - 1)) * vol.sizeX;
            const y = vol.minY + (j / (vol.ny - 1)) * vol.sizeY;
            const z = vol.minZ + (k / (vol.nz - 1)) * vol.sizeZ;
            vol.dist[id] -= fbm(x * s, y * s, z * s, { octaves: Math.round(p.octaves), seed: p.seed }) * p.amp;
          }
    },
  },

  Multifractal: {
    title: 'Multifractal', category: 'Source', color: '#4da3ff',
    inputs: ['sdf'], outputs: ['sdf'],
    params: [
      P('freq', 'Frequency', 3.0, 0.5, 20, 0.1),
      P('amp', 'Amplitude (m)', 90, -250, 250, 2),
      P('octaves', 'Octaves', 5, 1, 8, 1),
      P('gain', 'Gain', 0.7, 0.1, 1.5, 0.02),
      P('seed', 'Seed', 4242, 0, 99999, 1),
    ],
    run(node, vol, ctx, j0, j1) {
      const p = node.params;
      const s = 0.0016 * p.freq;
      for (let j = j0; j < j1; j++)
        for (let k = 0; k < vol.nz; k++)
          for (let i = 0; i < vol.nx; i++) {
            const id = vol.idx(i, j, k);
            const x = vol.minX + (i / (vol.nx - 1)) * vol.sizeX;
            const y = vol.minY + (j / (vol.ny - 1)) * vol.sizeY;
            const z = vol.minZ + (k / (vol.nz - 1)) * vol.sizeZ;
            const m = multifractal(x * s, y * s * 0.7, z * s,
              { octaves: Math.round(p.octaves), gain: p.gain, seed: p.seed });
            vol.dist[id] -= m * p.amp;
          }
    },
  },

  Warp: {
    title: 'Domain Warp', category: 'Combine', color: '#b78bff',
    inputs: ['sdf'], outputs: ['sdf'],
    params: [
      P('scale', 'Warp scale', 1.2, 0.1, 6, 0.05),
      P('amp', 'Warp amp (m)', 60, 0, 250, 2),
      P('seed', 'Seed', 515, 0, 99999, 1),
    ],
    runFull(node, vol, ctx) {
      const p = node.params;
      const tmp = new Float32Array(vol.dist);
      const s = 0.0011 * p.scale;
      for (let j = 0; j < vol.ny; j++)
        for (let k = 0; k < vol.nz; k++)
          for (let i = 0; i < vol.nx; i++) {
            const x = vol.minX + (i / (vol.nx - 1)) * vol.sizeX;
            const y = vol.minY + (j / (vol.ny - 1)) * vol.sizeY;
            const z = vol.minZ + (k / (vol.nz - 1)) * vol.sizeZ;
            const w = warpVec(x * s, y * s, z * s, { scale: 1, amp: p.amp, octaves: 2, seed: p.seed });
            vol.dist[vol.idx(i, j, k)] = sampleRaw(tmp, vol, x + w[0], y + w[1] * 0.7, z + w[2]);
          }
    },
  },

  Terrace: {
    title: 'Terrace', category: 'Combine', color: '#b78bff',
    inputs: ['sdf'], outputs: ['sdf'],
    params: [
      P('levels', 'Levels', 7, 2, 24, 1),
      P('sharp', 'Sharpness', 0.65, 0, 1, 0.02),
      P('top', 'Top (m)', 380, 50, 700, 5),
      P('bottom', 'Bottom (m)', 4, -50, 200, 2),
      P('amount', 'Amount', 0.8, 0, 1, 0.02),
    ],
    run(node, vol, ctx, j0, j1) {
      const p = node.params;
      for (let j = j0; j < j1; j++)
        for (let k = 0; k < vol.nz; k++)
          for (let i = 0; i < vol.nx; i++) {
            const id = vol.idx(i, j, k);
            const y = vol.minY + (j / (vol.ny - 1)) * vol.sizeY;
            const t = clamp((y - p.bottom) / Math.max(1, p.top - p.bottom), 0, 1);
            const tq = terrace(t, Math.round(p.levels), p.sharp);
            const off = (tq * (p.top - p.bottom) + p.bottom - y) * p.amount;
            vol.dist[id] -= off;
          }
    },
  },

  Strata: {
    title: 'Strata Bands', category: 'Combine', color: '#b78bff',
    inputs: ['sdf'], outputs: ['sdf'],
    params: [
      P('bands', 'Band count', 9, 2, 30, 1),
      P('warp', 'Band warp (m)', 26, 0, 120, 1),
      P('contrast', 'Hardness contrast', 0.55, 0, 1, 0.02),
      P('relief', 'Relief (m)', 420, 100, 800, 5),
      P('seed', 'Seed', 414, 0, 99999, 1),
    ],
    run(node, vol, ctx, j0, j1) {
      const p = node.params;
      for (let j = j0; j < j1; j++)
        for (let k = 0; k < vol.nz; k++)
          for (let i = 0; i < vol.nx; i++) {
            const id = vol.idx(i, j, k);
            const x = vol.minX + (i / (vol.nx - 1)) * vol.sizeX;
            const y = vol.minY + (j / (vol.ny - 1)) * vol.sizeY;
            const z = vol.minZ + (k / (vol.nz - 1)) * vol.sizeZ;
            const w = fbm(x * 0.002, y * 0.002, z * 0.002, { octaves: 3, seed: p.seed }) * p.warp;
            const band = 0.5 + 0.5 * Math.sin(((y + w) / p.relief) * Math.PI * 2 * p.bands);
            const soft = band * band * (3 - 2 * band);
            vol.hard[id] = clamp(vol.hard[id] * (1 - p.contrast * 0.5) + soft * p.contrast, 0.03, 1);
            vol.strata[id] = ((y + w) / p.relief) * p.bands; // float band coordinate
          }
    },
  },

  CaveCarve: {
    title: 'Cave Carve', category: 'Combine', color: '#b78bff',
    inputs: ['sdf'], outputs: ['sdf'],
    params: [
      P('freq', 'Frequency', 2.2, 0.5, 10, 0.1),
      P('threshold', 'Threshold', 0.52, 0.2, 0.8, 0.01),
      P('size', 'Size (m)', 60, 5, 200, 2),
      P('maxY', 'Max elevation', 120, -100, 500, 5),
      P('seed', 'Seed', 66, 0, 99999, 1),
    ],
    run(node, vol, ctx, j0, j1) {
      const p = node.params;
      const s = 0.0022 * p.freq;
      for (let j = j0; j < j1; j++)
        for (let k = 0; k < vol.nz; k++)
          for (let i = 0; i < vol.nx; i++) {
            const id = vol.idx(i, j, k);
            const d0 = vol.dist[id];
            if (d0 >= -2) continue; // only deep inside solid
            const y = vol.minY + (j / (vol.ny - 1)) * vol.sizeY;
            if (y > p.maxY) continue;
            const x = vol.minX + (i / (vol.nx - 1)) * vol.sizeX;
            const z = vol.minZ + (k / (vol.nz - 1)) * vol.sizeZ;
            const r = ridged(x * s, y * s, z * s, { octaves: 3, seed: p.seed });
            const c = (p.threshold - r) * p.size;
            if (c > d0) vol.dist[id] = smaxP(d0, c, 8);
          }
    },
  },

  PaintMask: {
    title: 'Paint Mask', category: 'Mask', color: '#ffd166',
    inputs: [], outputs: ['mask'],
    params: [
      P('channel', 'Channel', 0, 0, 2, 1, { labels: ['Rain', 'Hardness', 'Moisture'] }),
      P('brush', 'Brush (m)', 90, 10, 400, 5),
      P('flow', 'Flow', 0.35, 0.02, 1, 0.02),
      P('value', 'Value', 1.0, 0, 1, 0.02),
    ],
    isSide: true,
  },

  RainSDF: {
    title: 'Rain Erosion', category: 'Erode', color: '#5eead4',
    inputs: ['sdf', 'mask'], outputs: ['sdf'],
    eroder: 'rain',
    params: [
      P('rainRate', 'Rain rate', 9000, 500, 40000, 250),
      P('maskGain', 'Paint gain', 6.0, 0, 15, 0.1),
      P('dropSize', 'Drop parcel', 1.6, 0.5, 5, 0.1),
      P('craterK', 'Crater size', 0.30, 0.05, 1.2, 0.01),
      P('craterAspect', 'Crater depth', 0.35, 0.05, 1.0, 0.02),
      P('flowMax', 'Flow length', 26, 4, 80, 1),
      P('capacityK', 'Capacity', 0.55, 0.05, 3, 0.02),
      P('targetDrops', 'Target drops', 120000, 5000, 600000, 5000),
      P('seed', 'Seed', 1337, 0, 99999, 1),
    ],
  },
  WindSDF: {
    title: 'Wind Erosion', category: 'Erode', color: '#5eead4',
    inputs: ['sdf', 'mask'], outputs: ['sdf'],
    eroder: 'wind',
    params: [
      P('windDeg', 'Wind dir (deg)', 20, 0, 360, 2),
      P('speed', 'Wind speed', 14, 2, 45, 0.5),
      P('gust', 'Gustiness', 0.6, 0, 1.5, 0.05),
      P('abrasion', 'Abrasion', 0.5, 0, 2.5, 0.05),
      P('duneRate', 'Dune rate', 1.0, 0, 3, 0.05),
      P('targetDrops', 'Target grains', 40000, 2000, 200000, 2000),
      P('seed', 'Seed', 777, 0, 99999, 1),
    ],
  },
  ThermalSDF: {
    title: 'Thermal (Talus)', category: 'Erode', color: '#5eead4',
    inputs: ['sdf', 'mask'], outputs: ['sdf'],
    eroder: 'thermal',
    params: [
      P('talusDeg', 'Talus angle', 34, 20, 50, 0.5),
      P('rate', 'Rate', 1.0, 0.1, 4, 0.05),
      P('rockfall', 'Rockfall', 0.35, 0, 2, 0.05),
      P('itersPerTick', 'Iters/tick', 1200, 100, 8000, 100),
      P('targetOps', 'Target ops', 60000, 2000, 400000, 2000),
      P('seed', 'Seed', 9001, 0, 99999, 1),
    ],
  },
  ChemicalSDF: {
    title: 'Chemical', category: 'Erode', color: '#5eead4',
    inputs: ['sdf', 'mask'], outputs: ['sdf'],
    eroder: 'chemical',
    params: [
      P('solubility', 'Solubility', 0.6, 0, 1.5, 0.02),
      P('rate', 'Rate', 1.0, 0.1, 4, 0.05),
      P('pitR', 'Pit size', 3.2, 0.8, 12, 0.1),
      P('precip', 'Precipitate', 0.25, 0, 1.5, 0.02),
      P('itersPerTick', 'Iters/tick', 900, 100, 6000, 100),
      P('targetOps', 'Target ops', 40000, 2000, 300000, 2000),
      P('seed', 'Seed', 5150, 0, 99999, 1),
    ],
  },

  MaskBake: {
    title: 'Mask Bake + Mesh', category: 'Output', color: '#9dffa8',
    inputs: ['sdf'], outputs: ['mesh'],
    params: [
      P('aoRadius', 'AO radius (vox)', 9, 2, 24, 1),
      P('aoTaps', 'AO taps', 5, 2, 10, 1),
    ],
    isBake: true,
  },
  SatmapShade: {
    title: 'Satmap Shade', category: 'Output', color: '#9dffa8',
    inputs: ['mesh'], outputs: ['mesh'],
    params: [
      P('mode', 'View mode', 0, 0, 8, 1, { labels: ['Satmap', 'AO', 'Curvature', 'Moisture', 'Flow', 'Sediment', 'Erosion', 'Strata', 'Normals'] }),
      P('sunAzim', 'Sun azimuth', 135, 0, 360, 1),
      P('sunElev', 'Sun elevation', 42, 2, 90, 1),
      P('snowline', 'Snowline (m)', 300, 50, 700, 5),
      P('saturation', 'Saturation', 1.0, 0, 2, 0.02),
      P('seaLevel', 'Sea level (m)', 0, -100, 100, 1),
    ],
    isSide: true,
  },
  Output: {
    title: 'Output', category: 'Output', color: '#9dffa8',
    inputs: ['mesh'], outputs: [],
    params: [],
    isSide: true,
  },
};

function sampleRaw(arr, vol, x, y, z) {
  let gx = ((x - vol.minX) / vol.sizeX) * (vol.nx - 1);
  let gy = ((y - vol.minY) / vol.sizeY) * (vol.ny - 1);
  let gz = ((z - vol.minZ) / vol.sizeZ) * (vol.nz - 1);
  gx = clamp(gx, 0, vol.nx - 1.001); gy = clamp(gy, 0, vol.ny - 1.001); gz = clamp(gz, 0, vol.nz - 1.001);
  const i = gx | 0, j = gy | 0, k = gz | 0;
  const fx = gx - i, fy = gy - j, fz = gz - k;
  const nx = vol.nx, nxy = vol.nx * vol.ny;
  const i000 = k * nxy + j * nx + i;
  const c00 = arr[i000] + (arr[i000 + 1] - arr[i000]) * fx;
  const c10 = arr[i000 + nx] + (arr[i000 + nx + 1] - arr[i000 + nx]) * fx;
  const c01 = arr[i000 + nxy] + (arr[i000 + nxy + 1] - arr[i000 + nxy]) * fx;
  const c11 = arr[i000 + nxy + nx] + (arr[i000 + nxy + nx + 1] - arr[i000 + nxy + nx]) * fx;
  return (c00 + (c10 - c00) * fy) + ((c01 + (c11 - c01) * fy) - (c00 + (c10 - c00) * fy)) * fz;
}

export function defaultParams(type) {
  const def = NODE_DEFS[type];
  const o = {};
  for (const p of def.params) o[p.name] = p.def;
  return o;
}

export function makeNode(type, x = 60, y = 60) {
  return { id: nid('n'), type, x, y, params: defaultParams(type), inputs: {}, sim: null, genVersion: -1 };
}

// ---------------- Graph ----------------
export class Graph {
  constructor() {
    this.nodes = new Map();
    this.ctx = { vol: null, mesh: null, meshDirty: true, bakeParams: { aoRadius: 9, aoTaps: 5 }, shade: null, world: null };
    this.genToken = 0;
    this.order = [];
  }
  addNode(node) { this.nodes.set(node.id, node); return node; }
  removeNode(id) {
    this.nodes.delete(id);
    for (const n of this.nodes.values())
      for (const s of Object.keys(n.inputs))
        if (n.inputs[s] && n.inputs[s].node === id) delete n.inputs[s];
  }
  link(dstId, socket, srcId) {
    const n = this.nodes.get(dstId);
    if (n) n.inputs[socket] = { node: srcId };
  }
  unlink(dstId, socket) {
    const n = this.nodes.get(dstId);
    if (n) delete n.inputs[socket];
  }
  upstreamOf(id, socket) {
    const n = this.nodes.get(id);
    const l = n && n.inputs[socket];
    return l ? this.nodes.get(l.node) : null;
  }

  topoSort() {
    // Kahn over sdf/mesh links.
    const indeg = new Map(), adj = new Map();
    for (const n of this.nodes.values()) { indeg.set(n.id, 0); adj.set(n.id, []); }
    for (const n of this.nodes.values()) {
      for (const s of Object.keys(n.inputs)) {
        const src = n.inputs[s] && n.inputs[s].node;
        if (src && this.nodes.has(src) && src !== n.id) {
          adj.get(src).push(n.id);
          indeg.set(n.id, indeg.get(n.id) + 1);
        }
      }
    }
    const q = [];
    for (const [id, d] of indeg) if (d === 0) q.push(id);
    const out = [];
    while (q.length) {
      const id = q.shift();
      out.push(this.nodes.get(id));
      for (const m of adj.get(id)) {
        indeg.set(m, indeg.get(m) - 1);
        if (indeg.get(m) === 0) q.push(m);
      }
    }
    return out;
  }

  eroderChain() { return this.topoSort().filter((n) => NODE_DEFS[n.type].eroder); }

  // Find the linear sdf pipeline feeding `endNode` (follow `sdf` inputs back).
  sdfPipeline(endNode) {
    const chain = [];
    let cur = endNode;
    const seen = new Set();
    while (cur && !seen.has(cur.id)) {
      seen.add(cur.id);
      chain.unshift(cur);
      cur = this.upstreamOf(cur.id, 'sdf');
    }
    return chain;
  }

  findBake() {
    for (const n of this.nodes.values()) if (n.type === 'MaskBake') {
      // must be connected (directly or via shade/output chain)
      return n;
    }
    return null;
  }

  // ---- structural evaluation: (re)generate + (re)mesh, chunked/async ----
  async evaluate(world, onProgress) {
    const token = ++this.genToken;
    const bake = this.findBake();
    if (!bake) return;
    const pipe = this.sdfPipeline(bake);
    const gens = pipe.filter((n) => !NODE_DEFS[n.type].eroder && !NODE_DEFS[n.type].isBake);
    if (!gens.length || gens[0].type !== 'IslandBase') throw new Error('Pipeline must start with Island Base');

    const { nx, ny, nz, minY, sizeY } = world;
    const vol = new SDFVolume(nx, ny, nz, -1000, minY, -1000, 2000, sizeY, 2000);
    this.ctx.world = world;
    const CH = Math.max(4, Math.floor(ny / 8));
    const tick = () => new Promise((r) => setTimeout(r, 0));
    let step = 0;
    const total = gens.length * Math.ceil(ny / CH) + 2;
    for (const gnode of gens) {
      const def = NODE_DEFS[gnode.type];
      if (def.runFull) {
        def.runFull(gnode, vol, this.ctx);
        step += Math.ceil(ny / CH);
        if (onProgress) onProgress(step / total, gnode.type);
        await tick();
      } else if (def.run) {
        for (let j0 = 0; j0 < ny; j0 += CH) {
          if (token !== this.genToken) return; // superseded
          def.run(gnode, vol, this.ctx, j0, Math.min(ny, j0 + CH));
          step++;
          if (onProgress) onProgress(step / total, gnode.type);
          await tick();
        }
      }
    }
    if (token !== this.genToken) return;
    this.ctx.vol = vol; // publish only completed generations
    // (Re)create eroder sims bound to the fresh volume.
    for (const n of this.eroderChain()) this.bindSim(n, true);
    if (onProgress) onProgress(0.985, 'mesh');
    await tick();
    if (token !== this.genToken) return;
    this.remesh();
    if (onProgress) onProgress(1, 'done');
  }

  bindSim(n, force = false) {
    const kind = NODE_DEFS[n.type].eroder;
    if (!kind || !this.ctx.vol) return null;
    if (!n.sim || force || n.sim.vol !== this.ctx.vol) {
      const P3 = this.eroderParams(n);
      if (kind === 'rain') n.sim = new RainSim(this.ctx.vol, P3);
      else if (kind === 'wind') n.sim = new WindSim(this.ctx.vol, P3);
      else if (kind === 'thermal') n.sim = new ThermalSim(this.ctx.vol, P3);
      else if (kind === 'chemical') n.sim = new ChemicalSim(this.ctx.vol, P3);
      n.sim.seaLevel = this.seaLevel();
    }
    return n.sim;
  }

  eroderParams(n) {
    const p = { ...n.params };
    if (n.type === 'WindSDF') {
      const a = (p.windDeg * Math.PI) / 180;
      p.dirX = Math.cos(a); p.dirZ = Math.sin(a);
      delete p.windDeg;
    }
    return p;
  }

  seaLevel() {
    const shade = [...this.nodes.values()].find((n) => n.type === 'SatmapShade');
    return shade ? shade.params.seaLevel : 0;
  }

  remesh() {
    const bake = this.findBake();
    if (!bake || !this.ctx.vol) return;
    this.ctx.bakeParams = { aoRadius: bake.params.aoRadius, aoTaps: bake.params.aoTaps };
    this.ctx.mesh = meshSurfaceNets(this.ctx.vol, {
      aoRadiusVox: bake.params.aoRadius, aoTaps: bake.params.aoTaps,
    });
    this.ctx.meshDirty = true;
  }

  resetErosion() {
    for (const n of this.eroderChain()) {
      const s = this.bindSim(n, true);
      if (s) s.reset();
    }
    this.ctx.meshDirty = true;
  }

  // Advance active eroders within a time budget (ms). Returns activity flag.
  // Adaptive: per-node EMA of ms/unit sizes each advance call to fit the
  // remaining budget, so slow machines do less per frame instead of stalling.
  simulateTick(budgetMs = 10) {
    const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const t0 = now();
    let active = false;
    this._cost = this._cost || {};
    for (const n of this.eroderChain()) {
      const remain = budgetMs - (now() - t0);
      if (remain <= 0.5) break;
      const sim = this.bindSim(n);
      if (!sim || !sim.p.active || sim.done) continue;
      active = true;
      sim.setParams(this.eroderParams(n));
      const ema = this._cost[n.id] || (this._cost[n.id] = { ms: 0.004 });
      const per = Math.max(1e-4, ema.ms);
      let units;
      const s0 = now();
      if (n.type === 'RainSDF' || n.type === 'WindSDF') {
        units = Math.max(400, Math.min(16000, Math.floor(remain / per)));
        sim.advance(units);
      } else {
        units = Math.max(60, Math.min(n.params.itersPerTick, Math.floor(remain / per)));
        sim.advance(units);
      }
      ema.ms = ema.ms * 0.75 + (Math.max(1e-3, now() - s0) / units) * 0.25;
    }
    return active;
  }
}

export function buildDefaultGraph() {
  const g = new Graph();
  const base = makeNode('IslandBase', 40, 200);
  const mtn = makeNode('Mountain', 230, 200);
  const fbm = makeNode('Fbm3D', 420, 120);
  const strata = makeNode('Strata', 420, 300);
  const cave = makeNode('CaveCarve', 610, 200);
  const paint = makeNode('PaintMask', 230, 420);
  const rain = makeNode('RainSDF', 800, 120);
  const wind = makeNode('WindSDF', 800, 300);
  const therm = makeNode('ThermalSDF', 990, 120);
  const chem = makeNode('ChemicalSDF', 990, 300);
  const bake = makeNode('MaskBake', 1180, 200);
  const shade = makeNode('SatmapShade', 1370, 200);
  const out = makeNode('Output', 1560, 200);
  for (const n of [base, mtn, fbm, strata, cave, paint, rain, wind, therm, chem, bake, shade, out]) g.addNode(n);
  // NOTE: prototype pipeline is linear along `sdf`; Fbm/Strata both feed via chain:
  g.link(mtn.id, 'sdf', base.id);
  g.link(strata.id, 'sdf', mtn.id);
  g.link(fbm.id, 'sdf', strata.id);
  g.link(cave.id, 'sdf', fbm.id);
  g.link(rain.id, 'sdf', cave.id);
  g.link(rain.id, 'mask', paint.id);
  g.link(wind.id, 'sdf', rain.id);
  g.link(therm.id, 'sdf', wind.id);
  g.link(chem.id, 'sdf', therm.id);
  g.link(bake.id, 'sdf', chem.id);
  g.link(shade.id, 'mesh', bake.id);
  g.link(out.id, 'mesh', shade.id);
  return g;
}

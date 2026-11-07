// Dependency-free software rasterizer used for development previews.
// It consumes the same baked vertex buffer / draws / instances as the WebGPU
// renderer AND shades fragments with a JavaScript transcription of the WGSL
// material library (tools/matlib.mjs), so the procedural materials, sky and
// lighting can be inspected on machines without a GPU.
// Shadows are not simulated here (the real renderer uses a 2048² shadow map).
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { buildWorld } from '../src/world.js';
import { perspective, lookAt, mul } from '../src/math.js';
import { computeSky } from '../src/sky.js';
import { material, lightSurface, skyColor, skyFog, norm, sat } from './matlib.mjs';

const W = Number(process.env.W || 940);
const H = Number(process.env.H || 580);
const HOUR = Number(process.env.HOUR || 16.6);
const NOISE_FLOOR = 0;

const world = buildWorld();
const { positions, normals, uvs, extras, indices, draws } = world;

// ------------------------------------------------------------------ camera
const camArg = process.argv[2] || 'village';
const CAMS = {
  village: { theta: 0.40, phi: 1.32, radius: 41, target: [0, 5.5, -6] },
  plaza: { theta: 0.16, phi: 1.40, radius: 19, target: [0, 3.2, -6.5] },
  forest: { theta: -0.95, phi: 1.24, radius: 58, target: [0, 5, -10] },
  river: { theta: 0.18, phi: 1.24, radius: 30, target: [-4, 1.6, -42] },
  house: { theta: -0.5, phi: 1.34, radius: 15, target: [0, 3.4, -13] },
  top: { ortho: true },
};
const c = CAMS[camArg] || CAMS.village;

let view, proj, eye;
if (c.ortho) {
  view = lookAt([0, 160, 0.01], [0, 0, 0], [0, 0, -1]);
  const s = 105;
  proj = new Float32Array([1 / s, 0, 0, 0, 0, (1 / s) * (W / H), 0, 0, 0, 0, -1 / 400, 0, 0, 0, 0.5, 1]);
  eye = [0, 160, 0];
} else {
  const sp = Math.sin(c.phi);
  eye = [
    c.target[0] + c.radius * sp * Math.sin(c.theta),
    c.target[1] + c.radius * Math.cos(c.phi),
    c.target[2] + c.radius * sp * Math.cos(c.theta),
  ];
  view = lookAt(eye, c.target, [0, 1, 0]);
  proj = perspective((54 * Math.PI) / 180, W / H, 0.4, 620);
}
const viewProj = mul(proj, view);

const sky = computeSky(HOUR);
const G = {
  time: 12.0,
  night: sky.night,
  sunDir: sky.sunDir,
  sunColor: sky.sunColor,
  sunIntensity: sky.sunIntensity,
  skyTop: sky.skyTop,
  skyHorizon: sky.skyHorizon,
  skyGround: sky.skyGround,
  eye,
};
const EXPOSURE = 1.15 + sky.night * 0.5;
const FOG_DENSITY = 0.0030 + sky.night * 0.0016;

// ------------------------------------------------------------------ raster
const color = new Float32Array(W * H * 3);
const depth = new Float32Array(W * H).fill(Infinity);

for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const ndcX = (x / W) * 2 - 1;
    const ndcY = 1 - (y / H) * 2;
    const near = invProject(ndcX, ndcY, 0);
    const far = invProject(ndcX, ndcY, 1);
    const dir = norm([far[0] - near[0], far[1] - near[1], far[2] - near[2]]);
    const col = skyColor(dir, G);
    const i = (y * W + x) * 3;
    color[i] = col[0]; color[i + 1] = col[1]; color[i + 2] = col[2];
  }
}

function invProject(nx, ny, nz) {
  // invert viewProj once per unique ray (kept simple: full inverse per call is
  // too slow for every pixel, so use the analytic inverse of a TRS camera)
  const m = viewProj;
  const a00 = m[0], a01 = m[1], a02 = m[2], a03 = m[3];
  const a10 = m[4], a11 = m[5], a12 = m[6], a13 = m[7];
  const a20 = m[8], a21 = m[9], a22 = m[10], a23 = m[11];
  const a30 = m[12], a31 = m[13], a32 = m[14], a33 = m[15];
  const b00 = a00 * a11 - a01 * a10;
  const b01 = a00 * a12 - a02 * a10;
  const b02 = a00 * a13 - a03 * a10;
  const b03 = a01 * a12 - a02 * a11;
  const b04 = a01 * a13 - a03 * a11;
  const b05 = a02 * a13 - a03 * a12;
  const b06 = a20 * a31 - a21 * a30;
  const b07 = a20 * a32 - a22 * a30;
  const b08 = a20 * a33 - a23 * a30;
  const b09 = a21 * a32 - a22 * a31;
  const b10 = a21 * a33 - a23 * a31;
  const b11 = a22 * a33 - a23 * a32;
  let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
  if (!det) return [0, 0, 0];
  det = 1 / det;
  const x = nx, y = ny, z = nz;
  return [
    ((a11 * b11 - a12 * b10 + a13 * b09) * x + (a02 * b10 - a01 * b11 - a03 * b09) * y + (a31 * b05 - a32 * b04 + a33 * b03) * z + (a22 * b04 - a21 * b05 - a23 * b03)) * det,
    ((a12 * b08 - a10 * b11 - a13 * b07) * x + (a00 * b11 - a02 * b08 + a03 * b07) * y + (a32 * b02 - a30 * b05 - a33 * b01) * z + (a20 * b05 - a22 * b02 + a23 * b01)) * det,
    ((a10 * b10 - a11 * b08 + a13 * b06) * x + (a01 * b08 - a00 * b10 - a03 * b06) * y + (a30 * b04 - a31 * b02 + a33 * b00) * z + (a21 * b02 - a20 * b04 - a23 * b00)) * det,
  ];
}

function project(x, y, z) {
  const m = viewProj;
  return [
    m[0] * x + m[4] * y + m[8] * z + m[12],
    m[1] * x + m[5] * y + m[9] * z + m[13],
    m[2] * x + m[6] * y + m[10] * z + m[14],
    m[3] * x + m[7] * y + m[11] * z + m[15],
  ];
}

let fragCount = 0;
const tri = { p: [null, null, null], n: [null, null, null], uv: [null, null, null], ext: [null, null, null] };

function shadeTri(mat, tint, hue, shadow = 1) {
  const [A, B, C] = tri.p;
  const pa = project(A[0], A[1], A[2]);
  const pb = project(B[0], B[1], B[2]);
  const pc = project(C[0], C[1], C[2]);
  if (pa[3] <= 0.001 || pb[3] <= 0.001 || pc[3] <= 0.001) return;

  const x0 = (pa[0] / pa[3] * 0.5 + 0.5) * W, y0 = (0.5 - pa[1] / pa[3] * 0.5) * H;
  const x1 = (pb[0] / pb[3] * 0.5 + 0.5) * W, y1 = (0.5 - pb[1] / pb[3] * 0.5) * H;
  const x2 = (pc[0] / pc[3] * 0.5 + 0.5) * W, y2 = (0.5 - pc[1] / pc[3] * 0.5) * H;

  const minX = Math.max(0, Math.floor(Math.min(x0, x1, x2)));
  const maxX = Math.min(W - 1, Math.ceil(Math.max(x0, x1, x2)));
  const minY = Math.max(0, Math.floor(Math.min(y0, y1, y2)));
  const maxY = Math.min(H - 1, Math.ceil(Math.max(y0, y1, y2)));
  if (minX > maxX || minY > maxY) return;

  const area = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
  if (Math.abs(area) < 1e-9) return;
  const inv = 1 / area;
  const z0 = pa[2] / pa[3], z1 = pb[2] / pb[3], z2 = pc[2] / pc[3];

  const isGround = mat.matId === 0 || mat.matId === 13 || mat.matId === 9;

  for (let py = minY; py <= maxY; py++) {
    const yy = py + 0.5;
    for (let px = minX; px <= maxX; px++) {
      const xx = px + 0.5;
      const w0 = ((x1 - xx) * (y2 - yy) - (x2 - xx) * (y1 - yy)) * inv;
      const w1 = ((x2 - xx) * (y0 - yy) - (x0 - xx) * (y2 - yy)) * inv;
      const w2 = 1 - w0 - w1;
      if (w0 < 0 || w1 < 0 || w2 < 0) continue;

      const z = w0 * z0 + w1 * z1 + w2 * z2;
      const di = py * W + px;
      if (z >= depth[di]) continue;
      depth[di] = z;

      const wp = [
        w0 * A[0] + w1 * B[0] + w2 * C[0],
        w0 * A[1] + w1 * B[1] + w2 * C[1],
        w0 * A[2] + w1 * B[2] + w2 * C[2],
      ];
      let n = norm([
        w0 * tri.n[0][0] + w1 * tri.n[1][0] + w2 * tri.n[2][0],
        w0 * tri.n[0][1] + w1 * tri.n[1][1] + w2 * tri.n[2][1],
        w0 * tri.n[0][2] + w1 * tri.n[1][2] + w2 * tri.n[2][2],
      ]);
      const uv = [
        w0 * tri.uv[0][0] + w1 * tri.uv[1][0] + w2 * tri.uv[2][0],
        w0 * tri.uv[0][1] + w1 * tri.uv[1][1] + w2 * tri.uv[2][1],
      ];
      const ext = [
        w0 * tri.ext[0][0] + w1 * tri.ext[1][0] + w2 * tri.ext[2][0],
        w0 * tri.ext[0][1] + w1 * tri.ext[1][1] + w2 * tri.ext[2][1],
      ];

      const V = norm([G.eye[0] - wp[0], G.eye[1] - wp[1], G.eye[2] - wp[2]]);
      if (n[0] * V[0] + n[1] * V[1] + n[2] * V[2] < 0) n = [-n[0], -n[1], -n[2]];

      const s = material(wp, n, uv, ext, tint || [1, 1, 1], hue || 0, mat, G);
      let col = lightSurface(s, n, wp, G, shadow);

      if (!isGround) {
        const contact = 0.62 + (1 - 0.62) * smoothstep(-0.3, 2.2, wp[1]);
        col = [col[0] * contact, col[1] * contact, col[2] * contact];
      }

      const toFrag = [wp[0] - G.eye[0], wp[1] - G.eye[1], wp[2] - G.eye[2]];
      const dist = Math.hypot(...toFrag) || 0.001;
      const fogAmt = sat(1 - Math.exp(-dist * FOG_DENSITY));
      const fog = skyFog([toFrag[0] / dist, toFrag[1] / dist, toFrag[2] / dist], G);
      col = [
        col[0] + (fog[0] - col[0]) * fogAmt * 0.92,
        col[1] + (fog[1] - col[1]) * fogAmt * 0.92,
        col[2] + (fog[2] - col[2]) * fogAmt * 0.92,
      ];

      const o = di * 3;
      color[o] = col[0]; color[o + 1] = col[1]; color[o + 2] = col[2];
      fragCount++;
    }
  }
}

function smoothstep(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a || 1e-9)));
  return t * t * (3 - 2 * t);
}

const vtx = (i) => {
  const b = i * 3;
  return { p: [positions[b], positions[b + 1], positions[b + 2]], n: [normals[b], normals[b + 1], normals[b + 2]], uv: [uvs[i * 2], uvs[i * 2 + 1]], ext: [extras[i * 2], extras[i * 2 + 1]] };
};

function rasterStatic(d) {
  for (let i = d.firstIndex; i < d.firstIndex + d.indexCount; i += 3) {
    const a = vtx(indices[i]), b = vtx(indices[i + 1]), c2 = vtx(indices[i + 2]);
    tri.p = [a.p, b.p, c2.p]; tri.n = [a.n, b.n, c2.n];
    tri.uv = [a.uv, b.uv, c2.uv]; tri.ext = [a.ext, b.ext, c2.ext];
    shadeTri(d, null, 0);
  }
}

const inst = world.instances;
function rasterInstanced(d) {
  for (let k = 0; k < d.instanceCount; k++) {
    const b = (d.instanceOffset + k) * 16;
    const px = inst[b], py = inst[b + 1], pz = inst[b + 2];
    const sx = inst[b + 4], sy = inst[b + 5], sz = inst[b + 6];
    const hue = inst[b + 7];
    const qx = inst[b + 8], qy = inst[b + 9], qz = inst[b + 10], qw = inst[b + 11];
    const tint = [inst[b + 12], inst[b + 13], inst[b + 14]];
    const R = [
      1 - 2 * (qy * qy + qz * qz), 2 * (qx * qy + qz * qw), 2 * (qx * qz - qy * qw),
      2 * (qx * qy - qz * qw), 1 - 2 * (qx * qx + qz * qz), 2 * (qy * qz + qx * qw),
      2 * (qx * qz + qy * qw), 2 * (qy * qz - qx * qw), 1 - 2 * (qx * qx + qy * qy),
    ];
    const xf = (v) => [
      px + R[0] * v[0] * sx + R[3] * v[1] * sy + R[6] * v[2] * sz,
      py + R[1] * v[0] * sx + R[4] * v[1] * sy + R[7] * v[2] * sz,
      pz + R[2] * v[0] * sx + R[5] * v[1] * sy + R[8] * v[2] * sz,
    ];
    const nf = (v) => norm([
      R[0] * (v[0] / sx) + R[3] * (v[1] / sy) + R[6] * (v[2] / sz),
      R[1] * (v[0] / sx) + R[4] * (v[1] / sy) + R[7] * (v[2] / sz),
      R[2] * (v[0] / sx) + R[5] * (v[1] / sy) + R[8] * (v[2] / sz),
    ]);
    for (let i = d.firstIndex; i < d.firstIndex + d.indexCount; i += 3) {
      const a = vtx(indices[i]), b2 = vtx(indices[i + 1]), c2 = vtx(indices[i + 2]);
      tri.p = [xf(a.p), xf(b2.p), xf(c2.p)];
      tri.n = [nf(a.n), nf(b2.n), nf(c2.n)];
      tri.uv = [a.uv, b2.uv, c2.uv]; tri.ext = [a.ext, b2.ext, c2.ext];
      shadeTri(d, tint, hue);
    }
  }
}

const t0 = Date.now();
for (const d of draws) {
  if (d.useInstance) rasterInstanced(d);
  else rasterStatic(d);
}
console.log(`shaded ${fragCount.toLocaleString()} fragments in ${((Date.now() - t0) / 1000).toFixed(1)} s`);

// --------------------------------------------------------------------- png
const out = Buffer.alloc(W * H * 4);
for (let i = 0; i < W * H; i++) {
  for (let ch = 0; ch < 3; ch++) {
    let v = color[i * 3 + ch] * EXPOSURE;
    v = (v * (2.51 * v + 0.03)) / (v * (2.43 * v + 0.59) + 0.14);
    v = Math.pow(Math.max(0, Math.min(1, v)), 1 / 2.2);
    // vignette like the composite pass
    const x = (i % W) / W, y = Math.floor(i / W) / H;
    const d = Math.hypot(x - 0.5, y - 0.5);
    v *= 1 - Math.min(1, d * d * 1.9) * 0.34;
    out[i * 4 + ch] = Math.round(v * 255);
  }
  out[i * 4 + 3] = 255;
}

const crcTable = new Int32Array(256).map((_, n) => {
  let cc = n;
  for (let k = 0; k < 8; k++) cc = cc & 1 ? 0xedb88320 ^ (cc >>> 1) : cc >>> 1;
  return cc;
});
const crc32 = (buf) => {
  let cc = -1;
  for (let i = 0; i < buf.length; i++) cc = crcTable[(cc ^ buf[i]) & 0xff] ^ (cc >>> 8);
  return (cc ^ -1) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; ihdr[9] = 6;
const raw = Buffer.alloc((W * 4 + 1) * H);
for (let y = 0; y < H; y++) {
  raw[y * (W * 4 + 1)] = 0;
  out.copy(raw, y * (W * 4 + 1) + 1, y * W * 4, (y + 1) * W * 4);
}
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw, { level: 6 })),
  chunk('IEND', Buffer.alloc(0)),
]);
const file = `/home/user/Frontier/preview-${camArg}.png`;
writeFileSync(file, png);
console.log('wrote', file);

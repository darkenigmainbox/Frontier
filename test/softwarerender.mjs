// Frontier — software SDF raymarcher (CPU mirror of the GPU render pass).
// Produces the visual-proof renders headlessly: same field, same shading
// language as src/gl/render-shaders.js (strata satmap, sediment tint, wetness
// darkening, water plane, sun soft shadows, AO, haze, filmic tonemap).
// Pure Node, no deps.

import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

// ---- tiny PNG writer (RGBA8) -----------------------------------------------
const crcTable = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; }
  return t;
})();
function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = (c >>> 8) ^ crcTable[(c ^ buf[i]) & 0xff];
  return (~c) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
export function writePNG(path, w, h, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  writeFileSync(path, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw, { level: 6 })), chunk("IEND", Buffer.alloc(0))]));
}

// ---- hash noise (mirrors GLSL vnoise) --------------------------------------
function hash1(x, y, z) {
  const qx = frac(x * 0.1031), qy = frac(y * 0.1031), qz = frac(z * 0.1031);
  const yy = qy + dot3(qx, qy, qz, qy, qz, qx) + 33.33;
  return frac((qx + yy) * qz);
}
function frac(v) { return v - Math.floor(v); }
function dot3(a, b, c, d, e, f) { return a * d + b * e + c * f; }
function vnoise(x, y, z) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  let fx = x - ix, fy = y - iy, fz = z - iz;
  fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); fz = fz * fz * (3 - 2 * fz);
  const h = (i, j, k) => hash1(ix + i, iy + j, iz + k);
  const l = (a, b, t) => a + (b - a) * t;
  return l(
    l(l(h(0, 0, 0), h(1, 0, 0), fx), l(h(0, 1, 0), h(1, 1, 0), fx), fy),
    l(l(h(0, 0, 1), h(1, 0, 1), fx), l(h(0, 1, 1), h(1, 1, 1), fx), fy), fz);
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const mix = (a, b, t) => a + (b - a) * t;
const mix3 = (a, b, t) => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];

// ---- field sampling (trilinear over the volume's R channel) ----------------
export function makeSampler(vol) {
  const { dims, min, cell, data } = vol;
  const [nx, ny, nz] = dims;
  return function sdf(x, y, z) {
    const gx = clamp((x - min[0]) / cell[0] - 0.5, 0, nx - 1.001);
    const gy = clamp((y - min[1]) / cell[1] - 0.5, 0, ny - 1.001);
    const gz = clamp((z - min[2]) / cell[2] - 0.5, 0, nz - 1.001);
    const x0 = Math.floor(gx), y0 = Math.floor(gy), z0 = Math.floor(gz);
    const fx = gx - x0, fy = gy - y0, fz = gz - z0;
    const x1 = Math.min(nx - 1, x0 + 1), y1 = Math.min(ny - 1, y0 + 1), z1 = Math.min(nz - 1, z0 + 1);
    const at = (i, j, k) => data[(((k * ny) + j) * nx + i) * 4];
    const l = (a, b, t) => a + (b - a) * t;
    const v =
      l(l(l(at(x0, y0, z0), at(x1, y0, z0), fx), l(at(x0, y1, z0), at(x1, y1, z0), fx), fy),
        l(l(at(x0, y0, z1), at(x1, y0, z1), fx), l(at(x0, y1, z1), at(x1, y1, z1), fx), fy), fz);
    const outside = Math.hypot(
      Math.max(min[0] - x, x - (min[0] + nx * cell[0]), 0),
      Math.max(min[1] - y, y - (min[1] + ny * cell[1]), 0),
      Math.max(min[2] - z, z - (min[2] + nz * cell[2]), 0));
    return v + outside;
  };
}

// ---- full scene render -------------------------------------------------------
// opts: {width, height, eye:[3], target:[3], sunDeg, waterLevel, water:true, haze, wetGain}
export function renderScene(vol, opts) {
  const sdf = makeSampler(vol);
  const W = opts.width || 880, H = opts.height || 550;
  const img = Buffer.alloc(W * H * 4);
  const aspect = W / H;
  const eye = opts.eye, target = opts.target;
  let fwd = [target[0] - eye[0], target[1] - eye[1], target[2] - eye[2]];
  let fl = Math.hypot(...fwd) || 1; fwd = fwd.map(v => v / fl);
  // right = normalize(cross(fwd, (0,1,0))), up = cross(right, fwd)
  let right = [-fwd[2], 0, fwd[0]];
  let rl = Math.hypot(...right) || 1; right = right.map(v => v / rl);
  const up = [
    right[1] * fwd[2] - right[2] * fwd[1],
    right[2] * fwd[0] - right[0] * fwd[2],
    right[0] * fwd[1] - right[1] * fwd[0],
  ];
  const ang = (opts.sunDeg ?? 135) * Math.PI / 180;
  let sun = [Math.cos(ang), 0.85, Math.sin(ang)];
  let sl = Math.hypot(...sun); sun = sun.map(v => v / sl);
  const waterY = opts.waterLevel ?? 0.7;
  const waterOn = opts.water !== false;
  const haze = opts.haze ?? 0.25;
  const wetGain = opts.wetGain ?? 1;
  const BAND = 0.32;

  const field = (p) => sdf(p[0], p[1], p[2]);
  const normalAt = (p, e = 0.13) => {
    const g = [
      field([p[0] + e, p[1], p[2]]) - field([p[0] - e, p[1], p[2]]),
      field([p[0], p[1] + e, p[2]]) - field([p[0], p[1] - e, p[2]]),
      field([p[0], p[1], p[2] + e]) - field([p[0], p[1], p[2] - e]),
    ];
    const l = Math.hypot(...g) || 1;
    return g.map(v => v / l);
  };

  function trace(ro, rd) {
    // bounds
    const mn = vol.min, mx = vol.min.map((v, i) => v + vol.dims[i] * vol.cell[i]);
    const safe = rd.map(v => Math.sign(v || 1e-12) * Math.max(Math.abs(v), 1e-6));
    const a = (mn.map((v, i) => (v - ro[i]) / safe[i]));
    const b = (mx.map((v, i) => (v - ro[i]) / safe[i]));
    const n = a.map((v, i) => Math.min(v, b[i])), f = a.map((v, i) => Math.max(v, b[i]));
    const t0 = Math.max(...n), t1 = Math.min(...f);
    let t = Math.max(0, t0);
    if (t > t1) return 200;
    for (let i = 0; i < 200; i++) {
      const d = field([ro[0] + rd[0] * t, ro[1] + rd[1] * t, ro[2] + rd[2] * t]);
      if (d < 0.06) return t;
      t += Math.max(0.035, d * 0.65);
      if (t > t1) break;
    }
    return 200;
  }
  function shadow(p) {
    let t = 0.18, s = 1;
    for (let i = 0; i < 28; i++) {
      const q = [p[0] + sun[0] * t, p[1] + sun[1] * t, p[2] + sun[2] * t];
      const h = field(q);
      s = Math.min(s, 9 * h / t);
      t += clamp(h, 0.16, 1.6);
      if (h < 0.04 || t > 29) break;
    }
    return clamp(s, 0, 1);
  }
  function ambient(p, n) {
    let a = 0, w = 1;
    for (let i = 1; i <= 4; i++) {
      const h = i * 0.48;
      a += (h - field([p[0] + n[0] * h, p[1] + n[1] * h, p[2] + n[2] * h])) * w;
      w *= 0.55;
    }
    return clamp(1 - a * 0.38, 0.25, 1);
  }
  const sky = (rd) => mix3([0.58, 0.60, 0.53], [0.31, 0.40, 0.39], clamp((rd[1] + 0.1) / 0.9, 0, 1));

  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      const u = (px / W * 2 - 1), v = 1 - py / H * 2;
      const rd = [
        fwd[0] + right[0] * u * aspect * 0.62 + up[0] * v * 0.62,
        fwd[1] + right[1] * u * aspect * 0.62 + up[1] * v * 0.62,
        fwd[2] + right[2] * u * aspect * 0.62 + up[2] * v * 0.62,
      ];
      const rdl = Math.hypot(...rd); rd[0] /= rdl; rd[1] /= rdl; rd[2] /= rdl;
      const t = trace(eye, rd);
      let color = sky(rd);
      let hitT = 200;
      if (t < 150) {
        hitT = t;
        const p = [eye[0] + rd[0] * t, eye[1] + rd[1] * t, eye[2] + rd[2] * t];
        const geo = normalAt(p), e = 0.12;
        const q = [p[0] * 5, p[1] * 5, p[2] * 5];
        const g = [
          vnoise(q[0] + e, q[1], q[2]) - vnoise(q[0] - e, q[1], q[2]),
          vnoise(q[0], q[1] + e, q[2]) - vnoise(q[0], q[1] - e, q[2]),
          vnoise(q[0], q[1], q[2] + e) - vnoise(q[0], q[1], q[2] - e),
        ].map(x => x / 0.24);
        const gn = Math.hypot(...g) || 1;
        const gd = (g[0] * geo[0] + g[1] * geo[1] + g[2] * geo[2]) / gn;
        const n = geo.map((x, i) => x - (g[i] / gn - geo[i] * gd) * 0.5);
        const nl = Math.hypot(...n) || 1; n[0] /= nl; n[1] /= nl; n[2] /= nl;

        const sh = shadow([p[0] + geo[0] * 0.17, p[1] + geo[1] * 0.17, p[2] + geo[2] * 0.17]);
        const ao = ambient(p, geo);
        const diffuse = Math.max(0, n[0] * sun[0] + n[1] * sun[1] + n[2] * sun[2]);

        // rock color (strata satmap + sediment + wetness), mirrors rockColor()
        const grain = vnoise(p[0] * 8, p[1] * 8, p[2] * 8);
        const broad = vnoise(p[0] * 0.43, p[1] * 0.43, p[2] * 0.43) + 0.45 * vnoise(p[0] * 1.8, p[1] * 1.8, p[2] * 1.8);
        const bedding = p[1] + vnoise(p[0] * 0.12, 0, p[2] * 0.12) * 0.4;
        const bands = 0.5 + 0.5 * Math.sin(bedding * 3.4 + 0.4 * Math.sin(bedding * 1.1));
        const thin = Math.pow(0.5 + 0.5 * Math.sin(bedding * 17 + vnoise(p[0] * 2, p[1] * 2, p[2] * 2) * 1.7), 12);
        let c = mix3([0.37, 0.135, 0.064], [0.72, 0.33, 0.14], 0.37 + broad * 0.31);
        c = mix3(c, [c[0] * 0.74, c[1] * 0.70, c[2] * 0.65], bands * 0.23);
        c = c.map(x => x * (1 - thin * 0.2));
        c = c.map((x, i) => x + [0.055, 0.04, 0.028][i] * (grain - 0.5));
        const top = clamp((n[1] - 0.55) / 0.41, 0, 1);
        c = mix3(c, [0.64 * (0.9 + broad * 0.12), 0.37 * (0.9 + broad * 0.12), 0.185 * (0.9 + broad * 0.12)], top * 0.67);
        const streak = vnoise(p[0] * 3.3, p[1] * 0.13, p[2] * 3.3);
        c = c.map(x => x * (0.79 + 0.28 * streak));
        // wetness darkening from the moisture channel (bilinear-ish, nearest ok)
        {
          const { dims, min, cell, data } = vol;
          const gx = clamp(Math.round((p[0] - min[0]) / cell[0] - 0.5), 0, dims[0] - 1);
          const gy = clamp(Math.round((p[1] - min[1]) / cell[1] - 0.5), 0, dims[1] - 1);
          const gz = clamp(Math.round((p[2] - min[2]) / cell[2] - 0.5), 0, dims[2] - 1);
          const moist = data[(((gz * dims[1]) + gy) * dims[0] + gx) * 4 + 1];
          const wet = clamp(moist * 2.2 * wetGain, 0, 0.6);
          c = c.map(x => x * (1 - wet * 0.35));
        }

        color = [
          c[0] * (0.25 * ao + 1.05 * diffuse * sh + Math.max(-n[1], 0) * 0.13),
          c[1] * (0.28 * ao + 0.91 * diffuse * sh + Math.max(-n[1], 0) * 0.075),
          c[2] * (0.27 * ao + 0.70 * diffuse * sh + Math.max(-n[1], 0) * 0.035),
        ];

        const fres = Math.pow(1 - Math.max(0, n[0] * -rd[0] + n[1] * -rd[1] + n[2] * -rd[2]), 3);
        color = color.map((x, i) => x + c[i] * fres * 0.09);
      }
      // ocean floor + water plane
      if (rd[1] < -0.001) {
        const ft = (-1.6 - eye[1]) / rd[1];
        let floorColor = null;
        if (ft > 0 && ft < hitT) {
          const p = [eye[0] + rd[0] * ft, -1.6, eye[2] + rd[2] * ft];
          const tex = vnoise(p[0] * 2, 0, p[2] * 2) * 0.025 + vnoise(p[0] * 0.15, 0, p[2] * 0.15) * 0.045;
          const sh2 = shadow([p[0], -1.48, p[2]]);
          floorColor = [(0.49 + tex) * (0.56 + 0.44 * sh2), (0.445 + tex) * (0.56 + 0.44 * sh2), (0.345 + tex) * (0.56 + 0.44 * sh2)];
        }
        const tw = (waterY - eye[1]) / rd[1];
        if (waterOn && tw > 0 && tw < hitT) {
          const p = [eye[0] + rd[0] * tw, waterY, eye[2] + rd[2] * tw];
          const cx = 2.5 * Math.sin(p[2] * 0.15) + Math.sin(p[2] * 0.36 + 1);
          if (Math.abs(p[0] - cx) < 4.6 + waterY * 0.12 && Math.abs(p[2]) < 16.7 && field(p) > 0.015) {
            const fres = 0.035 + 0.55 * Math.pow(1 - Math.max(0, -rd[1]), 5);
            const depth = floorColor ? Math.min(tw - ft, 8) : 8; // water depth along the ray
            const sh3 = shadow([p[0], waterY + 0.1, p[2]]);
            const lit = 0.65 + 0.35 * sh3;
            const waterC = [0.12 * lit, 0.26 * lit, 0.23 * lit];
            let col = floorColor ? mix3(waterC, floorColor, 0.25 + 0.35 * Math.exp(-depth * 0.45)) : waterC;
            col = mix3(col, sky([rd[0], -rd[1], rd[2]]), fres);
            // sun glint: reflect(-sun, n=(0,1,0)) · (-rd)
            const spec = Math.pow(Math.max(0, -sun[0] * rd[0] + sun[1] * rd[1] - sun[2] * rd[2]), 140);
            col = [col[0] + spec * sh3 * 0.7, col[1] + 0.88 * spec * sh3 * 0.7, col[2] + 0.64 * spec * sh3 * 0.7];
            color = col;
            hitT = tw;
          } else if (floorColor) { color = floorColor; hitT = ft; }
        } else if (floorColor) { color = floorColor; hitT = ft; }
      }
      if (hitT < 150) {
        const fog = 1 - Math.exp(-hitT * hitT * (0.000016 + haze * 0.000023));
        color = mix3(color, [0.58, 0.60, 0.52], Math.min(0.83, fog));
      }
      // filmic-ish tonemap + gamma + vignette + dither
      color = color.map(x => Math.pow(x / (x + 0.78), 1 / 2.2) * 255);
      const vg = 1 - 0.13 * (u * 0.65 * u * 0.65 + v * 0.65 * v * 0.65);
      const d = (hash1(px, py, 1) - 0.5);
      const o = (py * W + px) * 4;
      img[o] = clamp(color[0] * vg + d, 0, 255);
      img[o + 1] = clamp(color[1] * vg + d, 0, 255);
      img[o + 2] = clamp(color[2] * vg + d, 0, 255);
      img[o + 3] = 255;
    }
  }
  return img;
}

// Top-view incision/deposition map vs a reference height field (blue = cut deep,
// warm = filled) — the fastest way to SEE channel networks and pit behavior.
export function incisionMapDims(vol, width = 620) {
  const [nx, nz] = [vol.dims[0], vol.dims[2]];
  const scale = Math.max(1, Math.floor(width / nx));
  return [nx * scale, nz * scale];
}
export function renderIncisionMap(vol, hf0, width = 620) {
  const [nx, nz] = [vol.dims[0], vol.dims[2]];
  const scale = Math.max(1, Math.floor(width / nx));
  const W = nx * scale, H = nz * scale;
  const img = Buffer.alloc(W * H * 4);
  const hf = new Float32Array(nx * nz).fill(-1e9);
  for (let z = 0; z < nz; z++) for (let x = 0; x < nx; x++) {
    for (let y = vol.dims[1] - 1; y >= 0; y--) {
      if (vol.data[vol.index(x, y, z) + 3] >= 0.5) { hf[z * nx + x] = vol.min[1] + (y + 0.5) * vol.cell[1]; break; }
    }
  }
  const sun = [Math.cos(130 * Math.PI / 180), 0.8, Math.sin(130 * Math.PI / 180)];
  const margin = 3; // skip the floating border sheet — not gameplay terrain
  for (let z = 0; z < nz; z++) for (let x = 0; x < nx; x++) {
    const h = hf[z * nx + x];
    const h0 = hf0[z * nx + x];
    let r, g, b;
    if (x < margin || z < margin || x >= nx - margin || z >= nz - margin) { r = 22; g = 24; b = 30; }
    else if (h <= -1e8) { r = 30; g = 42; b = 58; }
    else {
      const sx = (hf[z * nx + Math.min(nx - 1, x + 1)] - hf[z * nx + Math.max(0, x - 1)]) / (2 * vol.cell[0]);
      const sz = (hf[Math.min(nz - 1, z + 1) * nx + x] - hf[Math.max(0, z - 1) * nx + x]) / (2 * vol.cell[2]);
      const n = [-sx, 1, -sz], nl = Math.hypot(...n);
      const diff = Math.max(0, (n[0] * sun[0] + n[1] * sun[1] + n[2] * sun[2]) / nl);
      const d = h0 > -1e8 ? h0 - h : 0;
      if (d > 0.02) {
        const t = Math.min(1, d / 4);
        r = 190 - 160 * t; g = 150 - 90 * t; b = 200 + 40 * t;
      } else if (d < -0.02) {
        const t = Math.min(1, -d / 1.5);
        r = 170 + 70 * t; g = 125 - 35 * t; b = 80 - 45 * t;
      } else {
        const l = 0.42 + 0.5 * diff;
        r = 176 * l; g = 132 * l; b = 96 * l;
      }
    }
    for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
      const o = ((z * scale + dy) * W + x * scale + dx) * 4;
      img[o] = r; img[o + 1] = g; img[o + 2] = b; img[o + 3] = 255;
    }
  }
  return img;
}

// A faithful JavaScript transcription of the WGSL material library in
// src/scene.wgsl. Used exclusively by tools/preview-render.mjs so the
// procedural materials can be previewed on machines without a GPU.
// Keep this file in sync with the shader when tweaking the look.
import { MAT } from '../src/materials.js';

export const sat = (x) => Math.min(1, Math.max(0, x));
const fract = (x) => x - Math.floor(x);

export function hash13(x, y, z) {
  let px = fract(x * 0.1031);
  let py = fract(y * 0.1031);
  let pz = fract(z * 0.1031);
  const d = px * (py + 33.33) + py * (pz + 33.33) + pz * (px + 33.33);
  px += d; py += d; pz += d;
  return fract((px + py) * pz);
}

export function hash33(x, y, z) {
  let px = fract(x * 0.1031);
  let py = fract(y * 0.103);
  let pz = fract(z * 0.0973);
  // dot(p, p.yxz + 33.33) with p.yxz = (py, px, pz)
  const d = px * (py + 33.33) + py * (px + 33.33) + pz * (pz + 33.33);
  px += d; py += d; pz += d;
  return [fract((px + py) * pz), fract(2 * px * py), fract((py + px) * px)];
}

export function vnoise(x, y, z) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const fx = x - ix, fy = y - iy, fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const uz = fz * fz * (3 - 2 * fz);
  const c000 = hash13(ix, iy, iz);
  const c100 = hash13(ix + 1, iy, iz);
  const c010 = hash13(ix, iy + 1, iz);
  const c110 = hash13(ix + 1, iy + 1, iz);
  const c001 = hash13(ix, iy, iz + 1);
  const c101 = hash13(ix + 1, iy, iz + 1);
  const c011 = hash13(ix, iy + 1, iz + 1);
  const c111 = hash13(ix + 1, iy + 1, iz + 1);
  const x00 = c000 + (c100 - c000) * ux;
  const x10 = c010 + (c110 - c010) * ux;
  const x01 = c001 + (c101 - c001) * ux;
  const x11 = c011 + (c111 - c011) * ux;
  const y0 = x00 + (x10 - x00) * uy;
  const y1 = x01 + (x11 - x01) * uy;
  return y0 + (y1 - y0) * uz;
}

export function fbm3(x, y, z, octaves) {
  let px = x, py = y, pz = z;
  let amp = 0.5, sum = 0, norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * vnoise(px, py, pz);
    norm += amp;
    px = px * 2.03 + 17.3;
    py = py * 2.03 + 9.1;
    pz = pz * 2.03 + 5.7;
    amp *= 0.5;
  }
  return sum / Math.max(norm, 0.0001);
}

/** returns [dist, cellHash] */
export function cellF1(x, y, z) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const fx = x - ix, fy = y - iy, fz = z - iz;
  let d1 = 4, id = 0;
  for (let i = 0; i < 8; i++) {
    const ox = i & 1, oy = (i >> 1) & 1, oz = (i >> 2) & 1;
    const r = hash33(ix + ox, iy + oy, iz + oz);
    const dx = ox + r[0] - fx, dy = oy + r[1] - fy, dz = oz + r[2] - fz;
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (d < d1) { d1 = d; id = r[0]; }
  }
  return [d1, id];
}

const mix3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const mul3 = (a, b) => [a[0] * b[0], a[1] * b[1], a[2] * b[2]];
const scale3 = (a, s) => [a[0] * s, a[1] * s, a[2] * s];

/**
 * Port of material() from scene.wgsl.
 * g = { time, night, sunDir, sunColor, sunIntensity, skyTop, skyHorizon, skyGround }
 */
export function material(wp, n, uv, ext, tint, hue, mat, g) {
  const [wx, wy, wz] = wp;
  const t = g.time;
  const night = g.night;
  const ao = ext[0];
  const baseA = mul3(mat.color1, tint);
  const baseB = mat.color2;
  const id = mat.matId;

  let albedo = [0.8, 0.8, 0.8];
  let rough = 0.5, sss = 0, coat = 0, sparkle = 0, emis = [0, 0, 0], bump = 0;

  if (id === MAT.SNOW) {
    const q = [wx * 0.55, wy * 0.55, wz * 0.55];
    const d1 = fbm3(q[0], q[1], q[2], 2);
    const d2 = fbm3(q[0] * 3.7 + 4.2, q[1] * 3.7 + 1.1, q[2] * 3.7 + 8.8, 2);
    const grain = cellF1(wx * 20, wy * 20, wz * 20);
    let c = mix3([0.80, 0.86, 0.97], [1.0, 0.98, 0.99], d1);
    c = mix3(c, [1.0, 0.84, 0.92], 0.38 * sat((d2 - 0.58) * 2.2));
    c = mix3(c, [0.84, 0.98, 0.94], 0.30 * sat((0.34 - d2) * 3.0));
    c = scale3(c, 0.93 + 0.10 * grain[1]);
    albedo = scale3(c, ao);
    rough = 0.55 - 0.12 * grain[1];
    sparkle = 1.0;
    bump = 1.1;
  } else if (id === MAT.GINGER) {
    const q = [wx * 1.55, wy * 1.55, wz * 1.55];
    const warpv = fbm3(q[0] * 0.5, q[1] * 0.5, q[2] * 0.5, 2);
    const crumb = fbm3(q[0] + warpv * 2.2, q[1] + warpv * 1.3, q[2] + warpv * 1.8, 3);
    let c = mix3(baseA, baseB, sat(crumb * 1.35 - 0.15));
    const pore = cellF1(wx * 33, wy * 33, wz * 33);
    c = scale3(c, 1 - sat((0.30 - pore[0]) * 4.5) * 0.42);
    c = scale3(c, 0.92 + 0.16 * cellF1(wx * 80, wy * 80, wz * 80)[1]);
    const dust = sat((n[1] - 0.2) * 1.7) * (0.5 + 0.5 * fbm3(wx * 6.5, wy * 6.5, wz * 6.5, 2));
    c = mix3(c, [1.0, 0.955, 0.92], dust * 0.32);
    c = scale3(c, 0.88 + 0.12 * sat(n[1] * 0.5 + 0.62));
    albedo = scale3(c, ao);
    rough = 0.66 - 0.18 * dust;
    sss = 0.22;
    sparkle = 0.2 + dust * 0.5;
    bump = 1.5;
  } else if (id === MAT.ICING) {
    const veins = fbm3(wx * 2.4, wy * 2.4, wz * 2.4, 3);
    let c = mix3([0.995, 0.985, 0.975], baseA, 0.30 + 0.30 * veins);
    const ridge = 0.5 + 0.5 * Math.sin(uv[1] * 30 + fbm3(wx * 2.6, wy * 2.6, wz * 2.6, 2) * 7);
    c = scale3(c, 0.93 + 0.09 * ridge);
    c = scale3(c, 0.97 + 0.05 * cellF1(wx * 55, wy * 55, wz * 55)[1]);
    albedo = scale3(c, ao);
    rough = 0.15; sss = 0.8; coat = 1.0; sparkle = 0.4; bump = 0.7;
  } else if (id === MAT.CHOC) {
    const q = [wx * 2.1, wy * 2.1, wz * 2.1];
    const warp = fbm3(q[0] * 0.6, q[1] * 0.6, q[2] * 0.6, 2);
    const swirl = fbm3(q[0] + warp * 2.0, q[1] + warp * 1.4, q[2] + warp * 0.8, 3);
    let c = mix3(baseA, baseB, sat(swirl * 1.45 - 0.2));
    c = scale3(c, 0.94 + 0.12 * cellF1(wx * 60, wy * 60, wz * 60)[1]);
    c = scale3(c, 0.9 + 0.1 * cellF1(wx * 14, wy * 14, wz * 14)[1]);
    albedo = scale3(c, ao);
    rough = 0.24 - 0.08 * swirl; coat = 0.95; sss = 0.08; bump = 0.4;
  } else if (id === MAT.CANE) {
    const f = fract(uv[1] * 1.35 + uv[0] * 2.0 + hue * 0.37);
    const s1 = sat(sat((f - 0.42) / 0.08) - sat((f - 0.86) / 0.08));
    let c = mix3([0.975, 0.965, 0.955], baseA, s1);
    c = scale3(c, 0.94 + 0.14 * cellF1(wx * 48, wy * 48, wz * 48)[1]);
    albedo = scale3(c, ao);
    rough = 0.10 + 0.10 * cellF1(wx * 26, wy * 26, wz * 26)[1];
    coat = 1.0; sss = 0.35; sparkle = 1.0; bump = 0.5;
  } else if (id === MAT.LOLLI) {
    const r = Math.hypot(uv[0], uv[1]);
    const ang = Math.atan2(uv[1], uv[0]);
    const sw = Math.sin(ang * 3.0 + r * 17.0 - 1.4 + hue * 2.0);
    const band = sat(sw * 0.5 + 0.5);
    let c = mix3([1.0, 0.985, 0.975], baseA, sat((band - 0.34) / 0.32));
    c = mix3(c, baseB, sat((r - 0.62) / 0.38) * 0.6);
    c = scale3(c, 0.97 + 0.05 * cellF1(wx * 70, wy * 70, wz * 70)[1]);
    albedo = scale3(c, ao);
    rough = 0.055; coat = 1.0; sss = 0.55; sparkle = 0.75; bump = 0.18;
  } else if (id === MAT.JELLY) {
    const sp = cellF1(wx * 85, wy * 85, wz * 85);
    const body = fbm3(wx * 3.2, wy * 3.2, wz * 3.2, 2);
    let c = mix3(baseA, [1, 1, 1], 0.10 + 0.10 * body);
    c = scale3(c, 0.92 + 0.16 * sp[1]);
    c = scale3(c, 0.86 + 0.14 * sat(n[1] * 0.5 + 0.6));
    albedo = scale3(c, ao);
    rough = 0.085; coat = 1.0; sss = 1.0; sparkle = 0.55; bump = 0.3;
  } else if (id === MAT.MALLOW) {
    const poreN = fbm3(wx * 4.2, wy * 4.2, wz * 4.2, 3);
    let c = mix3([0.995, 0.985, 0.965], [1.0, 0.94, 0.91], 0.45 + 0.55 * poreN);
    c = scale3(c, 0.95 + 0.06 * cellF1(wx * 24, wy * 24, wz * 24)[1]);
    const dust = sat(fbm3(wx * 9, wy * 9, wz * 9, 2) - 0.55) * 1.6;
    c = mix3(c, [1, 1, 1], dust * 0.5);
    albedo = scale3(c, ao);
    rough = 0.60 - 0.1 * dust; sss = 1.0; sparkle = 0.45 + dust * 0.5; bump = 1.6;
  } else if (id === MAT.GUMDROP) {
    const sp = cellF1(wx * 30, wy * 30, wz * 30);
    const sp2 = cellF1(wx * 90, wy * 90, wz * 90);
    let c = scale3(baseA, 0.82 + 0.32 * sp[1]);
    c = mix3(c, [1.0, 0.99, 0.98], sat((0.16 - sp2[0]) * 5.0) * 0.55);
    albedo = scale3(c, ao);
    rough = 0.20 + 0.08 * sp2[1]; coat = 1.0; sss = 0.6; sparkle = 1.0; bump = 0.8;
  } else if (id === MAT.PEPPERMINT) {
    const r = Math.hypot(uv[0], uv[1]);
    const ang = Math.atan2(uv[1], uv[0]);
    const sw = Math.sin(ang * 5.0 - r * 21.0);
    let c = mix3([1.0, 0.985, 0.985], baseA, sat((sw + 0.12) / 0.24));
    c = mix3(c, [1, 1, 1], sat((r - 0.87) / 0.06) * 0.9);
    c = mix3(c, baseB, sat((r - 0.55) / 0.32) * 0.25 * sat((sw + 0.1) / 0.2));
    c = scale3(c, 0.96 + 0.06 * cellF1(wx * 60, wy * 60, wz * 60)[1]);
    albedo = scale3(c, ao);
    rough = 0.09; coat = 1.0; sss = 0.25; sparkle = 0.7; bump = 0.25;
  } else if (id === MAT.GLASS) {
    let c = mix3([0.62, 0.84, 1.0], baseA, 0.55);
    c = scale3(c, 0.75 + 0.25 * fbm3(wx * 3, wy * 3, wz * 3, 2));
    albedo = scale3(c, ao * 0.34);
    rough = 0.04; coat = 1.0; sss = 0.5; sparkle = 0.25;
    const flick = 0.86 + 0.14 * Math.sin(t * 2.6 + wx * 4.1 + wz * 2.7) * Math.sin(t * 1.1 + wy * 2.0);
    emis = scale3([1.0, 0.58, 0.24], mat.emissive * (0.05 + night * 1.45) * flick);
  } else if (id === MAT.LICORICE) {
    albedo = scale3(scale3(baseA, 0.85 + 0.30 * fbm3(wx * 9, wy * 9, wz * 9, 2)), ao);
    rough = 0.28; coat = 0.75; sparkle = 0.2; bump = 0.7;
  } else if (id === MAT.SPRINKLE) {
    let c = scale3(baseA, 0.9 + 0.2 * cellF1(wx * 90, wy * 90, wz * 90)[1]);
    const band = 0.5 + 0.5 * Math.sin(uv[1] * 26 + hue * 6.28);
    c = mix3(c, [1, 1, 1], sat((band - 0.7) * 3.0) * 0.65);
    albedo = scale3(c, ao);
    rough = 0.17; coat = 1.0; sparkle = 0.8;
  } else if (id === MAT.RIVER) {
    const flow = [wx * 0.62 - t * 0.55, wy * 3.0, wz * 1.5 + t * 0.12];
    const n1 = fbm3(flow[0], flow[1], flow[2], 3);
    const n2 = fbm3(flow[0] * 2.4 + 7, flow[1] * 2.4 + 3, flow[2] * 2.4 + 1, 2);
    let c = mix3(baseA, baseB, sat(n1 * 1.5 - 0.12));
    c = mix3(c, [0.90, 0.72, 0.56], sat((n2 - 0.58) * 2.6) * 0.65);
    c = mix3(c, [0.26, 0.13, 0.08], sat((0.40 - n1) * 2.4) * 0.5);
    albedo = scale3(c, ao);
    rough = 0.055; coat = 1.0; sss = 0.10; sparkle = 0.18; bump = 1.3;
  } else {
    albedo = scale3(baseA, ao);
    rough = mat.rough;
    sss = 0.2;
  }

  if (mat.emissive > 0 && id !== MAT.GLASS) {
    const flick = 0.9 + 0.1 * Math.sin(t * 3.1 + wx * 2.3 + wz * 1.7);
    emis = [emis[0] + albedo[0] * mat.emissive * (0.12 + night * 1.55) * flick,
            emis[1] + albedo[1] * mat.emissive * (0.12 + night * 1.55) * flick,
            emis[2] + albedo[2] * mat.emissive * (0.12 + night * 1.55) * flick];
  }
  return { albedo, rough, sss, coat, sparkle, emis };
}

export function lightSurface(s, n, wp, g, shadow = 1) {
  const V = norm([g.eye[0] - wp[0], g.eye[1] - wp[1], g.eye[2] - wp[2]]);
  const L = norm(g.sunDir);
  const H = norm([L[0] + V[0], L[1] + V[1], L[2] + V[2]]);
  const sunI = g.sunIntensity;
  const t = g.time;

  const NdL = dot(n, L);
  const wrap = sat((NdL + s.sss * 0.65) / (1 + s.sss * 0.65));
  const NdV = sat(dot(n, V));
  const NdH = sat(dot(n, H));
  const fres = Math.pow(1 - NdV, 5);

  let col = scale3(mul3(s.albedo, g.sunColor), sunI * wrap * shadow);
  const shin = 8 + (380 - 8) * (1 - s.rough);
  const specD = Math.pow(NdH, shin) * (shin + 8) * 0.013;
  col = add3(col, scale3(g.sunColor, sunI * specD * (0.35 + 0.65 * s.coat) * shadow));
  col = add3(col, scale3(g.sunColor, sunI * Math.pow(NdH, 1400) * s.coat * 5 * shadow));

  const skyAmb = mix3(g.skyGround, g.skyTop, sat(n[1] * 0.5 + 0.5));
  col = add3(col, scale3(mul3(s.albedo, skyAmb), (0.75 + 0.55 * sat(n[1])) * 0.55));
  col = add3(col, scale3(skyAmb, fres * (0.10 + 0.30 * s.coat)));

  if (s.coat > 0.05 || s.rough < 0.35) {
    const ndv = dot(n, V) * 2;
    const Rv = [V[0] - n[0] * ndv, V[1] - n[1] * ndv, V[2] - n[2] * ndv];
    const env = skyFog(Rv, g);
    const envAmt = (1 - s.rough) * (0.18 + 0.82 * s.coat) * (0.16 + 0.84 * fres);
    col = add3(col, scale3(env, envAmt * 0.16));
  }

  const back = sat(dot(V, [-L[0], -L[1], -L[2]]) * 0.5 + 0.5);
  col = add3(col, scale3(mul3(s.albedo, g.sunColor), sunI * s.sss * Math.pow(back, 3) * 0.30));

  if (s.sparkle > 0.001) {
    const cell = cellF1(wp[0] * 52, wp[1] * 52, wp[2] * 52);
    const tw = Math.pow(sat(Math.sin(t * 2.1 + cell[1] * 47 + wp[1] * 3)), 16);
    const glint = tw * (Math.pow(NdH, 90) * 2.6 + 0.05) + tw * fres * 0.35;
    const base = add3(scale3(g.sunColor, sunI * shadow), scale3(skyAmb, 0.6));
    col = add3(col, scale3(base, s.sparkle * glint * 2.4));
  }
  return add3(col, s.emis);
}

// ------------------------------------------------------------------ vectors
export const norm = (v) => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

// ---------------------------------------------------------------------- sky
export function skyColor(dirIn, g) {
  const dir = norm(dirIn);
  const up = sat(dir[1]);
  let col = mix3(g.skyHorizon, g.skyTop, Math.pow(up, 0.42));
  col = mix3(col, g.skyGround, sat(-dir[1] * 3));
  const sunI = g.sunIntensity;
  const sd = sat(dot(dir, norm(g.sunDir)));
  col = add3(col, scale3(g.sunColor, Math.pow(sd, 6) * 0.14 * sunI));
  col = add3(col, scale3(g.sunColor, Math.pow(sd, 700) * 2.2 * sunI));
  col = add3(col, scale3(g.sunColor, Math.pow(sd, 6000) * 26 * sunI));

  const t = g.time;
  const night = g.night;
  if (dir[1] > 0.02) {
    const px = (dir[0] / (dir[1] + 0.18)) * 0.5;
    const pz = (dir[2] / (dir[1] + 0.18)) * 0.5;
    const n1 = fbm3(px * 1.15 + t * 0.01, pz * 1.15, px * 0.35, 4);
    const n2 = fbm3(px * 2.6 - t * 0.016, pz * 2.6, 3.7, 3);
    const band = sat((n1 * 0.75 + n2 * 0.35 - 0.42) * 2.4);
    let cc = mix3([0.90, 0.62, 0.80], [1.0, 0.94, 0.88], sat(n1 * 1.5));
    const lit = 0.22 + 0.78 * sat(sunI / 2.6);
    cc = scale3(cc, lit);
    cc = add3(cc, scale3(g.sunColor, Math.pow(sd, 3) * 0.30 * sat(sunI / 2.6)));
    cc = mix3(cc, [0.16, 0.14, 0.30], night * 0.75);
    col = mix3(col, cc, band * sat(dir[1] * 1.7) * 0.72);
  }
  if (night > 0.02) {
    const gx = Math.floor(dir[0] * 210), gy = Math.floor(dir[1] * 210), gz = Math.floor(dir[2] * 210);
    const h = hash33(gx, gy, gz);
    const tw = 0.55 + 0.45 * Math.sin(t * 2.3 + h[1] * 42);
    const star = h[0] > 0.9982 ? tw : 0;
    col = add3(col, scale3([1, 1, 1], star * night * sat(dir[1] * 2.5) * 2.2));
  }
  return [Math.max(0, col[0]), Math.max(0, col[1]), Math.max(0, col[2])];
}

export function skyFog(dirIn, g) {
  const dir = norm(dirIn);
  const up = sat(dir[1]);
  let col = mix3(g.skyHorizon, g.skyTop, Math.pow(up, 0.42));
  col = mix3(col, g.skyGround, sat(-dir[1] * 3));
  const sd = sat(dot(dir, norm(g.sunDir)));
  return add3(col, scale3(g.sunColor, Math.pow(sd, 6) * 0.14 * g.sunIntensity));
}

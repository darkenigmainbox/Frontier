// ---------------------------------------------------------------------------
// Global constants + deterministic JS noise/terrain/Gerstner helpers.
// The WORLD is square; every grid (heightfield, SWE, spectral, foam,
// particles, terrain) covers the SAME [-WORLD/2, WORLD/2] area  -> "global grid".
//
// UV convention (used everywhere, CPU + GLSL):
//   u =  x / WORLD + 0.5
//   v =  0.5 - z / WORLD        (v grows toward -z, matches PlaneGeometry uv
//                                after rotateX(-PI/2))
// ---------------------------------------------------------------------------
import * as THREE from 'three';

export const WORLD = 240;            // world size in metres (240 x 240)
export const HALF = WORLD / 2;
export const ISLAND_CENTER = new THREE.Vector2(-20, -14);
export const ISLAND_RADIUS = 58;

export const worldToUv = (x, z) => [x / WORLD + 0.5, 0.5 - z / WORLD];
export const uvToWorld = (u, v) => [(u - 0.5) * WORLD, (0.5 - v) * WORLD];

// ---- deterministic value noise -------------------------------------------
function hash2(ix, iz) {
  let n = ix * 374761393 + iz * 668265263;
  n = (n ^ (n >> 13)) * 1274126177;
  return ((n ^ (n >> 16)) >>> 0) / 4294967295;
}
function smooth(t) { return t * t * (3 - 2 * t); }
export function valueNoise(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z);
  const fx = x - ix, fz = z - iz;
  const a = hash2(ix, iz), b = hash2(ix + 1, iz);
  const c = hash2(ix, iz + 1), d = hash2(ix + 1, iz + 1);
  const ux = smooth(fx), uz = smooth(fz);
  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz; // 0..1
}
export function fbm(x, z, oct = 5) {
  let v = 0, amp = 0.5, f = 1, norm = 0;
  for (let i = 0; i < oct; i++) {
    v += amp * valueNoise(x * f, z * f);
    norm += amp; amp *= 0.5; f *= 2.03;
  }
  return v / norm; // 0..1
}
function ridged(x, z) {
  return 1 - Math.abs(2 * fbm(x, z, 4) - 1);
}

// ---- terrain height function (single source of truth) ---------------------
export function terrainHeight(x, z) {
  // main island
  const dx = (x - ISLAND_CENTER.x) / ISLAND_RADIUS;
  const dz = (z - ISLAND_CENTER.y) / (ISLAND_RADIUS * 0.78);
  const d = Math.sqrt(dx * dx + dz * dz);
  const n = fbm(x * 0.018 + 7.3, z * 0.018 - 2.1, 5);
  const r = ridged(x * 0.012 - 3.0, z * 0.012 + 5.0);
  const land = 2.2 + n * 6.5 + Math.pow(r, 3) * 7.0;            // hills
  const fall = THREE.MathUtils.smoothstep(1 - d, -0.12, 0.42); // 1 inside -> 0 sea
  let h = THREE.MathUtils.lerp(-7.5, land, fall);

  // gentle beach shelf so the shoreline foam / colour gradient reads well
  const shelf = THREE.MathUtils.smoothstep(1 - d, -0.55, 0.05);
  h = THREE.MathUtils.lerp(h, -1.6 + n * 0.7, shelf * (1 - fall) * 0.85);

  // small second islet (SE) - nice extra shoreline to test against
  const d2 = Math.hypot(x - 62, z - 58) / 17;
  const fall2 = THREE.MathUtils.smoothstep(1 - d2, -0.1, 0.5);
  h = Math.max(h, THREE.MathUtils.lerp(-7, 1.6 + n * 2.2, fall2));

  // shallow sandbar arc (W) - breakers live here
  const bar = Math.exp(-Math.pow(Math.hypot(x + 88, z + 40) - 26, 2) / 90);
  h += bar * 5.2;

  // seabed detail so caustics/depth colour are not flat
  if (h < 0) h -= fbm(x * 0.05, z * 0.05, 3) * 1.4 * Math.min(1, -h * 0.3);
  return h;
}

// terrain height texture for shaders: R = height, G = fbm detail, B = wetness-ish
export function makeTerrainTexture(res = 256) {
  const data = new Uint16Array(res * res * 4);
  const toHalf = THREE.DataUtils.toHalfFloat;
  for (let j = 0; j < res; j++) {
    for (let i = 0; i < res; i++) {
      const [x, z] = uvToWorld(i / (res - 1), j / (res - 1));
      const o = (j * res + i) * 4;
      data[o] = toHalf(terrainHeight(x, z));
      data[o + 1] = toHalf(fbm(x * 0.06 + 3, z * 0.06, 4));
      data[o + 2] = toHalf(0);
      data[o + 3] = toHalf(1);
    }
  }
  const tex = new THREE.DataTexture(data, res, res, THREE.RGBAFormat, THREE.HalfFloatType);
  tex.magFilter = tex.minFilter = THREE.LinearFilter;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}

// noise texture: RG = fbm gradient (detail normals), B = fbm value, A = white noise
export function makeNoiseTexture(res = 256) {
  const data = new Uint8Array(res * res * 4);
  const val = (x, z) => fbm((x / res) * 8, (z / res) * 8, 4);
  for (let j = 0; j < res; j++) {
    for (let i = 0; i < res; i++) {
      const e = 1.5;
      const gx = val(i + e, j) - val(i - e, j);
      const gz = val(i, j + e) - val(i, j - e);
      const o = (j * res + i) * 4;
      data[o] = THREE.MathUtils.clamp(128 + gx * 900, 0, 255);
      data[o + 1] = THREE.MathUtils.clamp(128 + gz * 900, 0, 255);
      data[o + 2] = val(i, j) * 255;
      data[o + 3] = hash2(i * 3 + 11, j * 7 + 5) * 255;
    }
  }
  const tex = new THREE.DataTexture(data, res, res);
  tex.magFilter = tex.minFilter = THREE.LinearFilter;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

// ---- shared analytic Gerstner set (JS mirror of the vertex shader) -------
// 6 directional waves. GLSL gets two vec4 arrays; JS keeps the same numbers
// so boat/buoy buoyancy matches the rendered surface exactly.
const GERSTNER_BASE = [
  { dirOff: 0.0, len: 62, amp: 0.42, steep: 0.55 },
  { dirOff: 0.42, len: 34, amp: 0.26, steep: 0.6 },
  { dirOff: -0.55, len: 21, amp: 0.16, steep: 0.65 },
  { dirOff: 0.95, len: 13, amp: 0.09, steep: 0.7 },
  { dirOff: -1.25, len: 8.5, amp: 0.055, steep: 0.75 },
  { dirOff: 1.7, len: 5.2, amp: 0.032, steep: 0.8 },
];
export const gerstnerUniforms = {
  uWavesA: { value: GERSTNER_BASE.map(() => new THREE.Vector4()) }, // dx,dz,k,omega
  uWavesB: { value: GERSTNER_BASE.map(() => new THREE.Vector4()) }, // amp,steep,phase,0
};
export const gerstnerJS = GERSTNER_BASE.map(() => ({ dx: 0, dz: 0, k: 0, w: 0, a: 0, ph: 0 }));

export function updateGerstner(windDirDeg, windSpeed) {
  const base = THREE.MathUtils.degToRad(windDirDeg);
  GERSTNER_BASE.forEach((g, i) => {
    const ang = base + g.dirOff;
    const dx = Math.cos(ang), dz = Math.sin(ang);
    const k = (Math.PI * 2) / g.len;
    const w = Math.sqrt(9.81 * k) * (0.55 + windSpeed * 0.045);
    const ph = i * 1.37;
    gerstnerUniforms.uWavesA.value[i].set(dx, dz, k, w);
    gerstnerUniforms.uWavesB.value[i].set(g.amp, g.steep, ph, 0);
    gerstnerJS[i] = { dx, dz, k, w, a: g.amp, ph };
  });
}
export function gerstnerHeight(x, z, t, ampScale) {
  let y = 0;
  for (const g of gerstnerJS) y += g.a * Math.sin(g.k * (g.dx * x + g.dz * z) - g.w * t + g.ph);
  return y * ampScale;
}
updateGerstner(35, 6);

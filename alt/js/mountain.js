/* ============================================================
 * Frontier · SDF Terrain Lab — Mountain builder
 *
 * Builds the base SDF height field (signed distance from the
 * y=0 sea plane to the implicit terrain surface) on an N×N grid
 * over a 100 m × 100 m square.
 *
 * Shape = multifractal gradient noise (fBm + ridged blend),
 * shaped by a radial *peak gradient* (1 at the summit, 0 at the
 * rim) + a linear tilt, with domain warping for organic form.
 * ============================================================ */

import { Perlin2D, fbm01, ridged, subseed } from './noise.js';

export const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const smoothstep = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/**
 * @param {object} p
 * @param {number} p.N            grid nodes per side (resolution)
 * @param {number} p.worldSize    world extent in meters (default 100)
 * @param {number} p.seed
 * @param {number} p.frequency    base feature frequency (features across the map)
 * @param {number} p.octaves      fBm octaves
 * @param {number} p.gain         multifractal persistence (lacunarity gain)
 * @param {number} p.ridge        0..1 blend toward ridged multifractal
 * @param {number} p.peakHeight   summit height above sea level (m)
 * @param {number} p.peakRadius   distance where the peak fades to the rim (m)
 * @param {number} p.peakSharp    peak gradient exponent
 * @param {number} p.warp         domain warp amount 0..1
 * @param {number} p.tilt         linear tilt 0..1 (valley side stretch)
 * @param {number} p.seaLevel     base/sea level (m, usually negative)
 * @returns {{h: Float32Array, N: number, voxel: number, minH: number, maxH: number, meanH: number}}
 */
export function buildMountain(p = {}) {
  const N = (p.N ?? 320) | 0;
  const worldSize = p.worldSize ?? 100;
  const seed = (p.seed ?? 1337) >>> 0;
  const frequency = p.frequency ?? 2.4;
  const octaves = p.octaves ?? 5;
  const gain = p.gain ?? 0.48;
  const ridge = p.ridge ?? 0.38;
  const peakHeight = p.peakHeight ?? 50;
  const peakRadius = p.peakRadius ?? 28;
  const peakSharp = p.peakSharp ?? 1.5;
  const warp = p.warp ?? 0.55;
  const tilt = p.tilt ?? 0.42;
  const seaLevel = p.seaLevel ?? -7;
  const strata = p.strata ?? 0.20;
  const voxel = worldSize / (N - 1);

  const nBase = new Perlin2D(seed);
  const nDet = new Perlin2D(subseed(seed, 0x51a7));
  const nWarp = new Perlin2D(subseed(seed, 0x9e37));
  const nStruct = new Perlin2D(subseed(seed, 0x7c1d));

  const s = frequency / worldSize;            // base spatial frequency
  const warpS = s * 0.55;                        // warp operates at lower freq
  const tiltAngle = (seed % 628) / 100;          // deterministic per seed
  const tiltCos = Math.cos(tiltAngle);
  const tiltSin = Math.sin(tiltAngle);
  // per-seed major-ridge orientation for the flank massif
  const ridgeAng = (((seed >> 9) % 628) / 100) + 0.4;
  const rCos = Math.cos(ridgeAng), rSin = Math.sin(ridgeAng);
  // per-seed summit offset so peaks land organically, not dead-centre
  const peakX = (((seed >> 3) % 25) - 12) * 0.9;
  const peakZ = (((seed >> 7) % 25) - 12) * 0.9;

  const h = new Float32Array(N * N);
  const valley = new Float32Array(N * N); // drainage-valley attractor mask (0..1)
  let minH = Infinity, maxH = -Infinity, sumH = 0;

  for (let j = 0; j < N; j++) {
    const z = (j - (N - 1) / 2) * voxel;
    for (let i = 0; i < N; i++) {
      const x = (i - (N - 1) / 2) * voxel;

      // ---- domain warp (organic displacement) ----
      let wx = x * s + warp * 1.7 * nWarp.noise(x * warpS + 31.4, z * warpS - 17.8);
      let wz = z * s + warp * 1.7 * nWarp.noise(x * warpS - 51.2, z * warpS + 44.9);

      // ---- multifractal: fBm blended with ridged multifractal ----
      const f = fbm01(nBase, wx, wz, {
        octaves,
        lacunarity: 2.05,
        gain,
      });
      const r = ridged(nBase, wx * 0.9 + 7.3, wz * 0.9 - 3.1, {
        octaves: Math.max(2, octaves - 1),
        lacunarity: 2.2,
        gain: gain + 0.08,
      });
      const base = f * (1 - ridge) + r * ridge;   // ~[0,1]

      // ---- radial peak gradient: 1 at summit -> 0 at rim ----
      const dx = x - peakX, dz = z - peakZ;
      const dist0 = Math.sqrt(dx * dx + dz * dz);
      const dist = Math.max(0.001,
        dist0 - tilt * (x * tiltCos + z * tiltSin) * 0.45);
      const theta = Math.atan2(dz, dx);
      const angK = 2.4;
      const ang = fbm01(nWarp,
        Math.cos(theta) * angK + 40.2, Math.sin(theta) * angK - 12.9,
        { octaves: 2, lacunarity: 2.3, gain: 0.5 });
      const lobeR = 0.70 + 0.60 * ang;                  // 0.70..1.30
      const R2 = peakRadius * 1.42 * lobeR;           // core radius (broad, gentle flank)
      const R1 = peakRadius * 2.05 * (0.88 + 0.24 * ang); // skirt radius
      const d2 = dist / R2;
      const d1 = dist / R1;
      const mCore = Math.pow(Math.max(0, 1 - d2 * d2), peakSharp);
      const mEnv = Math.pow(Math.max(0, 1 - d1), 1.6);  // broad radial envelope

      // ---- structural ridges ("pre-erosion") ----
      const sRidge = s * 1.7;                            // ~4 features / 100 m
      const rw1 = nWarp.noise(x * sRidge * 0.5 + 13.7, z * sRidge * 0.5 - 41.2);
      const rw2 = nWarp.noise(x * sRidge * 0.5 - 37.9, z * sRidge * 0.5 + 28.4);
      const spine = ridged(nStruct,
        (x * sRidge + rw1 * 1.8) * (1.0 + tilt * 0.35),
        (z * sRidge + rw2 * 1.8) * (1.0 - tilt * 0.35),
        { octaves: 3, lacunarity: 2.1, gain: 0.5 });
      const spineSharp = Math.pow(spine, 1.3);
      const flank = mEnv * (0.45 + 0.55 * spineSharp) * (1 - mCore * 0.8);

      // ---- 5-fold flow corridors ----
      const nSect = 5;
      const vPhase = nStruct.noise(5.5, 9.1) * 2.0;
      const vCos = Math.cos(theta * nSect + vPhase);
      const vIrreg = 0.72 + 0.56 * fbm01(nStruct,
        Math.cos(theta) * 2.3 + 1.2, Math.sin(theta) * 2.3 - 0.7,
        { octaves: 2, lacunarity: 2.1, gain: 0.5 });
      const valleyMask = Math.pow(Math.max(0, -vCos), 5.0) * vIrreg;

      // ---- ridge massif: the main drainage structure ----
      const u = x * rCos + z * rSin;
      const v = -x * rSin + z * rCos;
      const massifProf = ridged(nStruct, v * 0.052 + u * 0.011 + 41.7, u * 0.019 - 23.3,
        { octaves: 2, lacunarity: 2.1, gain: 0.5 });
      const massifEnv = smoothstep(0.30, 0.55, d1) * (1 - smoothstep(0.85, 1.10, d1)) * (1 - mCore * 0.9);
      const corridor = 1 - 0.85 * Math.min(1, valleyMask);
      const massifAmp = peakHeight * 0.20 * (2 * massifProf - 1) * massifEnv * corridor;

      const vWindow = smoothstep(0.30, 0.55, d1) * (1 - mCore * 0.85);

      let m = 0.85 * mCore + flank;
      const rim = Math.max(Math.abs(x), Math.abs(z)) / (worldSize * 0.5);
      m *= 1 - smoothstep(0.94, 1.0, rim);

      // ---- world-space relief + fine detail ----
      const det = fbm01(nDet, x * s * 3.4 + 91.2, z * s * 3.4 - 47.5, {
        octaves: 3, lacunarity: 2.3, gain: 0.5,
      }) - 0.5;
      const gully = fbm01(nDet, x * s * 12 + 23.7, z * s * 12 - 88.4, {
        octaves: 3, lacunarity: 2.3, gain: 0.5,
      }) - 0.5;
      const midRelief = fbm01(nDet, x * s * 1.35 - 33.7, z * s * 1.35 + 21.2, {
        octaves: 3, lacunarity: 2.1, gain: 0.5,
      }) - 0.5;

      const peakAmp = peakHeight * m * (0.80 + 0.26 * base);
      const floorClean = 1 - 0.75 * Math.min(1, valleyMask);
      const reliefAmp = peakHeight * 0.10 * m * midRelief * 2.0 * floorClean;
      const detailAmp = peakHeight * 0.055 * m * det * 2.0 * floorClean;
      const gullyEnv = smoothstep(0.25, 0.45, d1) * (1 - smoothstep(0.90, 1.10, d1)) * (1 - mCore * 0.6);
      const gullyAmp = peakHeight * 0.035 * gullyEnv * gully * 2.0 * floorClean;

      // ---- broad low foothills across the whole map ----
      const plainN = fbm01(nWarp, x * s * 0.38 + 3.1, z * s * 0.38 - 7.7, {
        octaves: 3, lacunarity: 2.1, gain: 0.5,
      });
      const plainAmp = peakHeight * 0.14
        * (1.35 - 0.75 * valleyMask)
        * (0.10 + 0.90 * plainN)
        * (1 - smoothstep(0.12, 0.75, mCore));

      const shore = fbm01(nWarp, x * s * 0.55 + 5.5, z * s * 0.55 - 3.3, {
        octaves: 2, lacunarity: 2.0, gain: 0.5,
      }) - 0.5;
      const shoreAmp = shore * 2.4 * (1 - m);

      let hv = (seaLevel - 5.5) + peakAmp + plainAmp + reliefAmp + detailAmp + gullyAmp + massifAmp + shoreAmp;

      // Geological strata modulation (horizontal rock ledges / stepped benches)
      if (strata > 0.01 && hv > seaLevel) {
        const alt = hv - seaLevel;
        const st = Math.sin(alt * 0.45) * 0.7 + Math.sin(alt * 1.1) * 0.3;
        const strataLedge = st * strata * 2.0 * Math.min(1.0, (alt + 1.0) / 6.0);
        hv += strataLedge;
      }

      h[j * N + i] = hv;
      valley[j * N + i] = valleyMask * vWindow;
      if (hv < minH) minH = hv;
      if (hv > maxH) maxH = hv;
      sumH += hv;
    }
  }

  return { h, N, voxel, minH, maxH, meanH: sumH / (N * N), valley };
}

import { FastNoise } from "./noise.js";

export class TerrainSDF {
  constructor(res = 160, bounds = { xMin: -30, xMax: 30, yMin: -5, yMax: 25, zMin: -30, zMax: 30 }, seed = 42) {
    this.res = res; // grid resolution per axis for 2D heightfield + 3D SDF field
    this.bounds = bounds;
    this.seed = seed;
    this.noise = new FastNoise(seed);

    // Heightfield grid
    this.height = new Float32Array(res * res);
    this.water = new Float32Array(res * res);
    this.sediment = new Float32Array(res * res);
    this.hardness = new Float32Array(res * res);
    this.bedrock = new Float32Array(res * res); // base unweathered rock
    this.normals = new Float32Array(res * res * 3);

    // 3D SDF grid for true volumetric features (overhangs, caves, arches, spires)
    this.sdfResX = 96;
    this.sdfResY = 64;
    this.sdfResZ = 96;
    this.sdfVolume = new Float32Array(this.sdfResX * this.sdfResY * this.sdfResZ);

    this.initTerrain("canyon");
  }

  setSeed(seed) {
    this.seed = seed;
    this.noise = new FastNoise(seed);
  }

  // Generate varied terrain styles: canyon, mountain, spires, mesa
  initTerrain(preset = "canyon") {
    const N = this.res;
    const { xMin, xMax, zMin, zMax, yMin, yMax } = this.bounds;
    const ySpan = yMax - yMin;

    for (let iz = 0; iz < N; iz++) {
      const zNorm = iz / (N - 1);
      const zWorld = zMin + zNorm * (zMax - zMin);

      for (let ix = 0; ix < N; ix++) {
        const xNorm = ix / (N - 1);
        const xWorld = xMin + xNorm * (xMax - xMin);
        const idx = iz * N + ix;

        let h = 0;
        let hard = 0.5;

        if (preset === "canyon") {
          // Meandering canyon with layered plateau walls
          const [wx, wz] = this.noise.warp2D(xWorld * 0.08, zWorld * 0.08, 0.5, 3.0);
          const baseNoise = this.noise.fbm2D(wx * 0.6, wz * 0.6, 5, 2.1, 0.48);
          
          // River canyon cut along center with meander
          const meander = 8.0 * Math.sin(zWorld * 0.08) + 3.0 * Math.cos(zWorld * 0.17 + 1.2);
          const distToRiver = Math.abs(xWorld - meander);
          
          // Terraced plateau profile
          let plateau = baseNoise * 14.0 + 8.0;
          
          // Carve deep canyon
          const canyonWidth = 7.5;
          const canyonDepth = 12.0;
          const canyonCut = Math.exp(-Math.pow(distToRiver / canyonWidth, 2.2)) * canyonDepth;
          h = plateau - canyonCut;

          // Terraced strata effect (stratified sedimentary rock)
          const strataFrequency = 0.8;
          const strata = Math.sin(h * strataFrequency);
          h += strata * 0.45;

          // Geologic hardness variation (sandstone vs hard caprock)
          hard = 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(h * 0.6 + baseNoise * 2.0));
        } 
        else if (preset === "spires") {
          // Hoodoos, pinnacles and eroded spire rock formations (Bryce / Monument Valley style)
          const [wx, wz] = this.noise.warp2D(xWorld * 0.15, zWorld * 0.15, 0.8, 4.0);
          const peaks = this.noise.ridgedNoise2D(wx * 0.9, wz * 0.9, 6, 2.0, 0.55);
          const base = this.noise.fbm2D(xWorld * 0.05, zWorld * 0.05, 3, 2.0, 0.5);
          
          // Form tall needle spires
          h = Math.pow(peaks, 1.8) * 19.0 + base * 4.0;
          
          // Stepped caps
          h = Math.floor(h * 1.5) / 1.5 + 0.3 * (h % 1.0);
          hard = 0.4 + 0.5 * peaks;
        } 
        else if (preset === "mountain") {
          // Alpine peaks with ridged multi-fractal
          const r1 = this.noise.ridgedNoise2D(xWorld * 0.06, zWorld * 0.06, 6, 2.1, 0.5);
          const r2 = this.noise.fbm2D(xWorld * 0.12, zWorld * 0.12, 4, 2.0, 0.45);
          h = r1 * 18.0 + r2 * 4.0 + 2.0;
          hard = 0.6 + 0.3 * r1;
        } 
        else { // Mesa / Butte
          const dCenter = Math.hypot(xWorld, zWorld);
          const mesaMask = 1.0 / (1.0 + Math.exp((dCenter - 14.0) * 0.8));
          const noise = this.noise.fbm2D(xWorld * 0.1, zWorld * 0.1, 4);
          h = mesaMask * 14.0 + noise * 3.0;
          hard = 0.5 + 0.4 * mesaMask;
        }

        // Clamp height within reasonable vertical bounds
        h = Math.max(0.5, Math.min(ySpan * 0.85, h));

        this.height[idx] = h;
        this.bedrock[idx] = h;
        this.sediment[idx] = 0.0;
        this.water[idx] = 0.0;
        this.hardness[idx] = hard;
      }
    }

    this.computeNormals();
    this.rebuildSDFVolume();
  }

  // Calculate high precision surface normals using central differences
  computeNormals() {
    const N = this.res;
    const { xMin, xMax, zMin, zMax } = this.bounds;
    const dx = (xMax - xMin) / (N - 1);
    const dz = (zMax - zMin) / (N - 1);

    for (let iz = 0; iz < N; iz++) {
      for (let ix = 0; ix < N; ix++) {
        const idx = iz * N + ix;
        const xL = Math.max(0, ix - 1);
        const xR = Math.min(N - 1, ix + 1);
        const zD = Math.max(0, iz - 1);
        const zU = Math.min(N - 1, iz + 1);

        const dhdx = (this.height[iz * N + xR] - this.height[iz * N + xL]) / ((xR - xL) * dx);
        const dhdz = (this.height[zU * N + ix] - this.height[zD * N + ix]) / ((zU - zD) * dz);

        // Vector: (-dhdx, 1, -dhdz) normalized
        const nx = -dhdx;
        const ny = 1.0;
        const nz = -dhdz;
        const len = Math.hypot(nx, ny, nz) || 1.0;

        const nIdx = idx * 3;
        this.normals[nIdx] = nx / len;
        this.normals[nIdx + 1] = ny / len;
        this.normals[nIdx + 2] = nz / len;
      }
    }
  }

  // Continuous bilinear sampling of height & gradient
  sampleHeightAndGradient(wx, wz) {
    const { xMin, xMax, zMin, zMax } = this.bounds;
    const u = (wx - xMin) / (xMax - xMin);
    const v = (wz - zMin) / (zMax - zMin);

    const N = this.res;
    const fx = u * (N - 1);
    const fz = v * (N - 1);

    if (fx < 0 || fx >= N - 1 || fz < 0 || fz >= N - 1) {
      return { height: 0, gx: 0, gz: 0, inside: false };
    }

    const ix = Math.floor(fx);
    const iz = Math.floor(fz);
    const tx = fx - ix;
    const tz = fz - iz;

    const h00 = this.height[iz * N + ix];
    const h10 = this.height[iz * N + ix + 1];
    const h01 = this.height[(iz + 1) * N + ix];
    const h11 = this.height[(iz + 1) * N + ix + 1];

    const h = (1 - tx) * (1 - tz) * h00 +
              tx * (1 - tz) * h10 +
              (1 - tx) * tz * h01 +
              tx * tz * h11;

    // Gradient in world units
    const dx = (xMax - xMin) / (N - 1);
    const dz = (zMax - zMin) / (N - 1);
    const gx = ((h10 - h00) * (1 - tz) + (h11 - h01) * tz) / dx;
    const gz = ((h01 - h00) * (1 - tx) + (h11 - h10) * tx) / dz;

    return { height: h, gx, gz, inside: true };
  }

  // Synchronize 3D Signed Distance Field (SDF) from the heightfield with volumetric caves / strata
  rebuildSDFVolume() {
    const sx = this.sdfResX;
    const sy = this.sdfResY;
    const sz = this.sdfResZ;
    const { xMin, xMax, yMin, yMax, zMin, zMax } = this.bounds;

    const dx = (xMax - xMin) / (sx - 1);
    const dy = (yMax - yMin) / (sy - 1);
    const dz = (zMax - zMin) / (sz - 1);

    for (let k = 0; k < sz; k++) {
      const wz = zMin + k * dz;
      for (let j = 0; j < sy; j++) {
        const wy = yMin + j * dy;
        for (let i = 0; i < sx; i++) {
          const wx = xMin + i * dx;
          const { height } = this.sampleHeightAndGradient(wx, wz);
          
          // Distance to ground surface
          let sdf = wy - height;

          // Volumetric carving: rock alcoves & wind caves along steep cliffs
          if (wy < height && wy > height - 4.0) {
            const caveNoise = this.noise.valueNoise3D(wx * 0.25, wy * 0.4, wz * 0.25);
            if (caveNoise > 0.72) {
              // Create natural hollows / overhangs
              const hollow = (caveNoise - 0.72) * 5.0;
              sdf = Math.max(sdf, hollow);
            }
          }

          const vIdx = (k * sy + j) * sx + i;
          this.sdfVolume[vIdx] = sdf;
        }
      }
    }
  }

  // Raymarching function against SDF volume
  raymarchSDF(ro, rd, maxDist = 120.0) {
    let t = 0.5;
    for (let step = 0; step < 160; step++) {
      const p = [ro[0] + rd[0] * t, ro[1] + rd[1] * t, ro[2] + rd[2] * t];
      const d = this.sampleSDF(p[0], p[1], p[2]);
      if (d < 0.02) return { hit: true, dist: t, point: p };
      t += Math.max(0.04, d * 0.7);
      if (t > maxDist) break;
    }
    return { hit: false, dist: t, point: null };
  }

  // Trilinear sample of 3D SDF
  sampleSDF(wx, wy, wz) {
    const { xMin, xMax, yMin, yMax, zMin, zMax } = this.bounds;
    const sx = this.sdfResX;
    const sy = this.sdfResY;
    const sz = this.sdfResZ;

    const u = (wx - xMin) / (xMax - xMin);
    const v = (wy - yMin) / (yMax - yMin);
    const w = (wz - zMin) / (zMax - zMin);

    if (u < 0 || u >= 1 || v < 0 || v >= 1 || w < 0 || w >= 1) {
      // Outside volume bounds
      return wy - 2.0;
    }

    const fx = u * (sx - 1);
    const fy = v * (sy - 1);
    const fz = w * (sz - 1);

    const ix = Math.floor(fx);
    const iy = Math.floor(fy);
    const iz = Math.floor(fz);

    const tx = fx - ix;
    const ty = fy - iy;
    const tz = fz - iz;

    const sample = (x, y, z) => this.sdfVolume[(z * sy + y) * sx + x];

    const c000 = sample(ix, iy, iz);
    const c100 = sample(Math.min(sx - 1, ix + 1), iy, iz);
    const c010 = sample(ix, Math.min(sy - 1, iy + 1), iz);
    const c110 = sample(Math.min(sx - 1, ix + 1), Math.min(sy - 1, iy + 1), iz);
    const c001 = sample(ix, iy, Math.min(sz - 1, iz + 1));
    const c101 = sample(Math.min(sx - 1, ix + 1), iy, Math.min(sz - 1, iz + 1));
    const c011 = sample(ix, Math.min(sy - 1, iy + 1), Math.min(sz - 1, iz + 1));
    const c111 = sample(Math.min(sx - 1, ix + 1), Math.min(sy - 1, iy + 1), Math.min(sz - 1, iz + 1));

    const x00 = c000 + tx * (c100 - c000);
    const x10 = c010 + tx * (c110 - c010);
    const x01 = c001 + tx * (c101 - c001);
    const x11 = c011 + tx * (c111 - c011);

    const y0 = x00 + ty * (x10 - x00);
    const y1 = x01 + ty * (x11 - x01);

    return y0 + tz * (y1 - y0);
  }
}

import { FastNoise } from "./noise.js";
import { sampleStampSDF } from "./stamps.js";

// Pure 3D Volumetric SDF with High-Frequency Micro-Noise & Sedimentary Strata
// Res: 160 x 96 x 160 (2.45 million volumetric voxels)
// Stored as RGBA32F:
// R = Signed Distance (d < 0 rock solid, d > 0 air void)
// G = Moisture / Water flow
// B = Loose sediment / talus scree
// A = Strata rock hardness
export class PureVolumetricSDF {
  constructor(res = [160, 96, 160], bounds = { min: [-30, -6, -30], max: [30, 26, 30] }, seed = 42) {
    this.dim = res;
    this.bounds = bounds;
    this.seed = seed;
    this.noise = new FastNoise(seed);

    const count = res[0] * res[1] * res[2];
    this.data = new Float32Array(count * 4);
    this.stamps = [];

    this.initTerrain("canyon");
  }

  getNx() { return this.dim[0]; }
  getNy() { return this.dim[1]; }
  getNz() { return this.dim[2]; }

  voxelIndex(ix, iy, iz) {
    const [nx, ny] = this.dim;
    return ((iz * ny + iy) * nx + ix) * 4;
  }

  worldToGrid(wx, wy, wz) {
    const { min, max } = this.bounds;
    const [nx, ny, nz] = this.dim;
    const gx = ((wx - min[0]) / (max[0] - min[0])) * (nx - 1);
    const gy = ((wy - min[1]) / (max[1] - min[1])) * (ny - 1);
    const gz = ((wz - min[2]) / (max[2] - min[2])) * (nz - 1);
    return [gx, gy, gz];
  }

  baseSDF(wx, wy, wz, preset) {
    const [wxWarp, wzWarp] = this.noise.warp2D(wx * 0.08, wz * 0.08, 0.45, 2.8);

    // High frequency micro-strata in full 3D space
    const microStrata = Math.sin(wy * 2.8) * 0.35 + Math.sin(wy * 7.0) * 0.15 + Math.sin(wy * 16.0) * 0.06;

    let d = 999.0;
    let hardness = 0.5;

    if (preset === "canyon") {
      // Meandering canyon with layered plateau walls & undercut caves
      const meander = 7.5 * Math.sin(wz * 0.09) + 2.5 * Math.cos(wz * 0.2 + 0.9);
      const distToRiver = Math.abs(wx - meander);

      const plateauFbm = this.noise.fbm2D(wxWarp * 0.06, wzWarp * 0.06, 5, 2.1, 0.5);
      const groundY = 8.5 + plateauFbm * 14.0;

      // Base distance to ground plane
      d = wy - groundY;

      // Canyon gorge carve in XY and Z
      const canyonWidth = 7.0 + 1.2 * Math.sin(wz * 0.35);
      const canyonCut = distToRiver - canyonWidth;
      const gorgeFloor = wy - 1.0;
      const canyonVoid = Math.max(-canyonCut, -gorgeFloor);

      d = Math.max(d, -canyonCut);

      // Undercut cave along canyon wall in 3D
      const caveDist = Math.hypot((wx - (meander + canyonWidth)) * 0.8, (wy - 3.5) * 1.6, (wz - 2.0) * 0.7) - 3.2;
      d = Math.max(d, -caveDist);

      d += microStrata * 0.45;
      hardness = 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(wy * 0.85));
    } 
    else if (preset === "spires") {
      // Bryce / Monument Valley needle spires in 3D
      const ridged = this.noise.ridgedNoise2D(wx * 0.13, wz * 0.13, 5, 2.05, 0.52);
      const fbm = this.noise.fbm2D(wx * 0.05, wz * 0.05, 3);
      const h = Math.pow(ridged, 1.85) * 20.0 + fbm * 4.0 + 1.0;
      d = wy - h;

      // Vertical fluting in XY plane
      const flute = this.noise.valueNoise3D(wx * 0.65, wy * 0.12, wz * 0.65);
      d += (flute - 0.5) * 1.5 + microStrata * 0.5;
      hardness = 0.5 + 0.45 * ridged;
    } 
    else if (preset === "mountain") {
      const r1 = this.noise.ridgedNoise2D(wx * 0.07, wz * 0.07, 6, 2.1, 0.5);
      d = wy - (r1 * 21.0 + 1.5);
      d += microStrata * 0.3;
      hardness = 0.6 + 0.35 * r1;
    } 
    else { // Mesa
      const dist = Math.hypot(wx, wz);
      const mask = 1.0 / (1.0 + Math.exp((dist - 15.0) * 0.9));
      d = wy - (mask * 16.0 + 1.5);
      d += microStrata * 0.45;
      hardness = 0.7 * mask + 0.3;
    }

    // High frequency surface crispness noise
    const microNoise = (this.noise.valueNoise3D(wx * 0.6, wy * 0.6, wz * 0.6) - 0.5) * 0.4;
    d += microNoise;

    return { distance: d, hardness };
  }

  initTerrain(preset = "canyon") {
    const [nx, ny, nz] = this.dim;
    const { min, max } = this.bounds;
    const dx = (max[0] - min[0]) / (nx - 1);
    const dy = (max[1] - min[1]) / (ny - 1);
    const dz = (max[2] - min[2]) / (nz - 1);

    for (let iz = 0; iz < nz; iz++) {
      const wz = min[2] + iz * dz;
      for (let iy = 0; iy < ny; iy++) {
        const wy = min[1] + iy * dy;
        for (let ix = 0; ix < nx; ix++) {
          const wx = min[0] + ix * dx;
          const idx = this.voxelIndex(ix, iy, iz);

          const { distance, hardness } = this.baseSDF(wx, wy, wz, preset);

          this.data[idx] = distance;
          this.data[idx + 1] = 0.0;
          this.data[idx + 2] = 0.0;
          this.data[idx + 3] = hardness;
        }
      }
    }

    for (const stamp of this.stamps) {
      this.applyStampInternal(stamp);
    }
  }

  addStamp(type, position, scale = [1, 1, 1], mode = "union", params = {}) {
    const stamp = { type, position, scale, mode, params };
    this.stamps.push(stamp);
    this.applyStampInternal(stamp);
  }

  applyStampInternal(stamp) {
    const [nx, ny, nz] = this.dim;
    const { min, max } = this.bounds;
    const dx = (max[0] - min[0]) / (nx - 1);
    const dy = (max[1] - min[1]) / (ny - 1);
    const dz = (max[2] - min[2]) / (nz - 1);

    const [px, py, pz] = stamp.position;
    const [sx, sy, sz] = stamp.scale;
    const radius = Math.max(sx, sy, sz) * 12.0;

    const [gxMin, gyMin, gzMin] = this.worldToGrid(px - radius, py - radius, pz - radius);
    const [gxMax, gyMax, gzMax] = this.worldToGrid(px + radius, py + radius, pz + radius);

    const iX0 = Math.max(0, Math.floor(gxMin));
    const iX1 = Math.min(nx - 1, Math.ceil(gxMax));
    const iY0 = Math.max(0, Math.floor(gyMin));
    const iY1 = Math.min(ny - 1, Math.ceil(gyMax));
    const iZ0 = Math.max(0, Math.floor(gzMin));
    const iZ1 = Math.min(nz - 1, Math.ceil(gzMax));

    for (let iz = iZ0; iz <= iZ1; iz++) {
      const wz = min[2] + iz * dz;
      for (let iy = iY0; iy <= iY1; iy++) {
        const wy = min[1] + iy * dy;
        for (let ix = iX0; ix <= iX1; ix++) {
          const wx = min[0] + ix * dx;

          const lx = (wx - px) / sx;
          const ly = (wy - py) / sy;
          const lz = (wz - pz) / sz;

          const stampDist = sampleStampSDF(stamp.type, [lx, ly, lz], stamp.params) * Math.min(sx, sy, sz);
          const idx = this.voxelIndex(ix, iy, iz);
          const curr = this.data[idx];

          if (stamp.mode === "union") {
            this.data[idx] = Math.min(curr, stampDist);
          } else if (stamp.mode === "subtract") {
            this.data[idx] = Math.max(curr, -stampDist);
          } else if (stamp.mode === "smooth_union") {
            const k = 1.6;
            const h = Math.max(0, Math.min(1, 0.5 + 0.5 * (stampDist - curr) / k));
            this.data[idx] = (curr * h + stampDist * (1 - h)) - k * h * (1 - h);
          } else if (stamp.mode === "smooth_subtract") {
            const k = 1.6;
            const h = Math.max(0, Math.min(1, 0.5 - 0.5 * (curr + stampDist) / k));
            this.data[idx] = (curr * (1 - h) - stampDist * h) + k * h * (1 - h);
          }
        }
      }
    }
  }

  // Trilinear 3D sample
  sampleSDF(wx, wy, wz) {
    const { min, max } = this.bounds;
    const [nx, ny, nz] = this.dim;

    const u = (wx - min[0]) / (max[0] - min[0]);
    const v = (wy - min[1]) / (max[1] - min[1]);
    const w = (wz - min[2]) / (max[2] - min[2]);

    if (u < 0 || u >= 1 || v < 0 || v >= 1 || w < 0 || w >= 1) {
      return wy - min[1];
    }

    const fx = u * (nx - 1);
    const fy = v * (ny - 1);
    const fz = w * (nz - 1);

    const ix = Math.floor(fx);
    const iy = Math.floor(fy);
    const iz = Math.floor(fz);

    const tx = fx - ix;
    const ty = fy - iy;
    const tz = fz - iz;

    const val = (x, y, z) => this.data[this.voxelIndex(x, y, z)];

    const c000 = val(ix, iy, iz);
    const c100 = val(Math.min(nx - 1, ix + 1), iy, iz);
    const c010 = val(ix, Math.min(ny - 1, iy + 1), iz);
    const c110 = val(Math.min(nx - 1, ix + 1), Math.min(ny - 1, iy + 1), iz);
    const c001 = val(ix, iy, Math.min(nz - 1, iz + 1));
    const c101 = val(Math.min(nx - 1, ix + 1), iy, Math.min(nz - 1, iz + 1));
    const c011 = val(ix, Math.min(ny - 1, iy + 1), Math.min(nz - 1, iz + 1));
    const c111 = val(Math.min(nx - 1, ix + 1), Math.min(ny - 1, iy + 1), Math.min(nz - 1, iz + 1));

    const x00 = c000 + tx * (c100 - c000);
    const x10 = c010 + tx * (c110 - c010);
    const x01 = c001 + tx * (c101 - c001);
    const x11 = c011 + tx * (c111 - c011);

    const y0 = x00 + ty * (x10 - x00);
    const y1 = x01 + ty * (x11 - x01);

    return y0 + tz * (y1 - y0);
  }

  // Analytical 3D normal vector
  sampleNormal(wx, wy, wz, eps = 0.22) {
    const nx = this.sampleSDF(wx + eps, wy, wz) - this.sampleSDF(wx - eps, wy, wz);
    const ny = this.sampleSDF(wx, wy + eps, wz) - this.sampleSDF(wx, wy - eps, wz);
    const nz = this.sampleSDF(wx, wy, wz + eps) - this.sampleSDF(wx, wy, wz - eps);
    const len = Math.hypot(nx, ny, nz) || 1.0;
    return [nx / len, ny / len, nz / len];
  }
}

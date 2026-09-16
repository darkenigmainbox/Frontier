import { FastNoise } from "./noise.js";
import { sampleStampSDF } from "./stamps.js";

// Pure Volumetric 3D Signed Distance Field (SDF) Grid
// Dimensions: 128 x 80 x 128 (1.31 million volumetric voxels)
// Stored as RGBA32F:
// R = Signed Distance (negative = solid rock, positive = air)
// G = Moisture / Water flow
// B = Sediment (talus, gravel, sand)
// A = Rock Hardness (geologic strata resistance)
export class VolumetricSDF {
  constructor(res = [128, 80, 128], bounds = { min: [-28, -6, -28], max: [28, 26, 28] }, seed = 42) {
    this.dim = res; // [Nx, Ny, Nz]
    this.bounds = bounds;
    this.seed = seed;
    this.noise = new FastNoise(seed);

    const totalVoxels = res[0] * res[1] * res[2];
    this.data = new Float32Array(totalVoxels * 4); // RGBA format

    this.activeStamps = [];
    this.initTerrain("canyon");
  }

  getNx() { return this.dim[0]; }
  getNy() { return this.dim[1]; }
  getNz() { return this.dim[2]; }

  worldToGrid(wx, wy, wz) {
    const { min, max } = this.bounds;
    const [nx, ny, nz] = this.dim;
    const gx = ((wx - min[0]) / (max[0] - min[0])) * (nx - 1);
    const gy = ((wy - min[1]) / (max[1] - min[1])) * (ny - 1);
    const gz = ((wz - min[2]) / (max[2] - min[2])) * (nz - 1);
    return [gx, gy, gz];
  }

  gridToWorld(gx, gy, gz) {
    const { min, max } = this.bounds;
    const [nx, ny, nz] = this.dim;
    const wx = min[0] + (gx / (nx - 1)) * (max[0] - min[0]);
    const wy = min[1] + (gy / (ny - 1)) * (max[1] - min[1]);
    const wz = min[2] + (gz / (nz - 1)) * (max[2] - min[2]);
    return [wx, wy, wz];
  }

  voxelIndex(ix, iy, iz) {
    const [nx, ny] = this.dim;
    return ((iz * ny + iy) * nx + ix) * 4;
  }

  // Base procedural 3D Signed Distance function with micro-detail
  baseDistance(wx, wy, wz, preset) {
    const [wxWarp, wzWarp] = this.noise.warp2D(wx * 0.08, wz * 0.08, 0.4, 2.5);

    let d = 999.0;
    let baseHardness = 0.5;

    // Micro-detail strata layers (geological stratification)
    const microStrata = Math.sin(wy * 2.8) * 0.25 + Math.sin(wy * 6.5) * 0.12 + Math.sin(wy * 14.0) * 0.05;

    if (preset === "canyon") {
      // Meandering canyon with central gorge, terraced cliffs and volumetric undercut caves
      const meander = 7.0 * Math.sin(wz * 0.09) + 2.5 * Math.cos(wz * 0.2 + 0.8);
      const distFromCenter = Math.abs(wx - meander);

      // Plateau height with multi-octave FBM
      const plateauNoise = this.noise.fbm2D(wxWarp * 0.06, wzWarp * 0.06, 5, 2.1, 0.5);
      const groundY = 8.0 + plateauNoise * 14.0;

      // Base signed distance to ground surface
      d = wy - groundY;

      // Carve deep canyon gorge
      const canyonWidth = 6.8 + 1.2 * Math.sin(wz * 0.3);
      const canyonWall = distFromCenter - canyonWidth;
      const gorgeDepth = wy - 1.2; // canyon floor at y ~ 1.2
      const canyonVoid = Math.max(-canyonWall, -gorgeDepth);

      // Subtract canyon void from terrain
      d = Math.max(d, -canyonWall);

      // Add natural horizontal undercut cave along canyon wall (true 3D volumetric SDF)
      const caveCenter = [meander + canyonWidth, 3.8, 2.0];
      const caveDist = Math.hypot((wx - caveCenter[0]) * 0.8, (wy - caveCenter[1]) * 1.5, (wz - caveCenter[2]) * 0.7) - 3.2;
      d = Math.max(d, -caveDist);

      // Strata & micro-terracing
      d += microStrata * 0.4;
      baseHardness = 0.4 + 0.4 * (0.5 + 0.5 * Math.sin(wy * 0.8));
    } 
    else if (preset === "spires") {
      // Bryce Canyon / Monument Valley style hoodoos and vertical needle spires
      const ridged = this.noise.ridgedNoise2D(wx * 0.14, wz * 0.14, 5, 2.0, 0.52);
      const fbm = this.noise.fbm2D(wx * 0.05, wz * 0.05, 3);
      const spireHeight = Math.pow(ridged, 1.8) * 20.0 + fbm * 4.0 + 1.0;

      d = wy - spireHeight;

      // Vertical fluting & columnar jointing
      const flute = this.noise.valueNoise3D(wx * 0.6, wy * 0.1, wz * 0.6);
      d += (flute - 0.5) * 1.4 + microStrata * 0.5;
      baseHardness = 0.5 + 0.4 * ridged;
    } 
    else if (preset === "mountain") {
      // Sharp alpine ridges with jagged peaks
      const r1 = this.noise.ridgedNoise2D(wx * 0.07, wz * 0.07, 6, 2.1, 0.5);
      const mountainH = r1 * 22.0 + 1.5;
      d = wy - mountainH;
      d += microStrata * 0.3;
      baseHardness = 0.6 + 0.35 * r1;
    } 
    else { // Mesa
      const dCenter = Math.hypot(wx, wz);
      const mesaMask = 1.0 / (1.0 + Math.exp((dCenter - 15.0) * 0.9));
      const mesaH = mesaMask * 16.0 + 1.0;
      d = wy - mesaH;
      d += microStrata * 0.45;
      baseHardness = 0.7 * mesaMask + 0.3;
    }

    // High frequency micro-roughness noise
    const microNoise = (this.noise.valueNoise3D(wx * 0.5, wy * 0.5, wz * 0.5) - 0.5) * 0.35;
    d += microNoise;

    return { distance: d, hardness: baseHardness };
  }

  // Generate / Reset the 3D SDF volume
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

          const { distance, hardness } = this.baseDistance(wx, wy, wz, preset);

          this.data[idx] = distance;      // Signed distance (negative = rock)
          this.data[idx + 1] = 0.0;       // Moisture / water flow
          this.data[idx + 2] = 0.0;       // Loose sediment / talus
          this.data[idx + 3] = hardness;  // Rock strata resistance
        }
      }
    }

    // Apply any active stamps
    for (const stamp of this.activeStamps) {
      this.applyStampInternal(stamp);
    }
  }

  // Stamp a 3D volumetric geometric feature into the SDF
  // mode: "union" (add rock), "subtract" (carve void), "smooth_union", "smooth_subtract"
  addStamp(type, position, rotation = [0, 0, 0], scale = [1, 1, 1], mode = "union", params = {}) {
    const stamp = { type, position, rotation, scale, mode, params };
    this.activeStamps.push(stamp);
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

    // Bounding box for stamp optimization
    const maxRadius = Math.max(sx, sy, sz) * 12.0;
    const [gxMin, gyMin, gzMin] = this.worldToGrid(px - maxRadius, py - maxRadius, pz - maxRadius);
    const [gxMax, gyMax, gzMax] = this.worldToGrid(px + maxRadius, py + maxRadius, pz + maxRadius);

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

          // Local coordinates relative to stamp
          const lx = (wx - px) / sx;
          const ly = (wy - py) / sy;
          const lz = (wz - pz) / sz;

          const stampDist = sampleStampSDF(stamp.type, [lx, ly, lz], stamp.params) * Math.min(sx, sy, sz);

          const idx = this.voxelIndex(ix, iy, iz);
          const currentDist = this.data[idx];

          if (stamp.mode === "union") {
            // Add rock solid
            this.data[idx] = Math.min(currentDist, stampDist);
          } else if (stamp.mode === "subtract") {
            // Carve cavity / arch hole
            this.data[idx] = Math.max(currentDist, -stampDist);
          } else if (stamp.mode === "smooth_union") {
            // Smooth blend rock
            const k = 1.5;
            const h = Math.max(0, Math.min(1, 0.5 + 0.5 * (stampDist - currentDist) / k));
            this.data[idx] = (currentDist * h + stampDist * (1 - h)) - k * h * (1 - h);
          } else if (stamp.mode === "smooth_subtract") {
            const k = 1.5;
            const h = Math.max(0, Math.min(1, 0.5 - 0.5 * (currentDist + stampDist) / k));
            this.data[idx] = (currentDist * (1 - h) - stampDist * h) + k * h * (1 - h);
          }
        }
      }
    }
  }

  // Continuous trilinear sampling of SDF value
  sampleSDF(wx, wy, wz) {
    const { min, max } = this.bounds;
    const [nx, ny, nz] = this.dim;

    const u = (wx - min[0]) / (max[0] - min[0]);
    const v = (wy - min[1]) / (max[1] - min[1]);
    const w = (wz - min[2]) / (max[2] - min[2]);

    if (u < 0 || u >= 1 || v < 0 || v >= 1 || w < 0 || w >= 1) {
      return wy - min[1]; // outside bounds: distance to floor
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

  // Analytical gradient (SDF Normal) in 3D: gives exact surface normal in XY and Z
  sampleNormal(wx, wy, wz, eps = 0.25) {
    const d = this.sampleSDF(wx, wy, wz);
    const nx = this.sampleSDF(wx + eps, wy, wz) - this.sampleSDF(wx - eps, wy, wz);
    const ny = this.sampleSDF(wx, wy + eps, wz) - this.sampleSDF(wx, wy - eps, wz);
    const nz = this.sampleSDF(wx, wy, wz + eps) - this.sampleSDF(wx, wy, wz - eps);

    const len = Math.hypot(nx, ny, nz) || 1.0;
    return [nx / len, ny / len, nz / len];
  }
}

// Professional High-Fidelity GAEA-Style Stream-Power & Aeolian Erosion Simulator
// Designed specifically to achieve razor-sharp dendritic river valleys, sharp ridge crests,
// natural talus slopes at the angle of repose, and authentic geological canyon strata.

export class RealisticGaeaErosion {
  constructor(terrain) {
    this.terrain = terrain;

    this.params = {
      // Hydraulic parameters
      erosionRate: 0.18,          // Bedrock carving power
      depositionRate: 0.16,       // Valley sediment deposition rate
      capacityFactor: 5.5,        // Sediment carrying capacity multiplier
      minSlope: 0.015,            // Minimum slope floor
      evaporationRate: 0.018,     // Droplet evaporation per step
      gravity: 9.8,
      inertia: 0.25,              // Momentum retention of droplets (controls straightness of rivers)
      rainIntensity: 1.2,
      maxPathSteps: 80,           // Droplet lifecycle steps
      erosionRadius: 3,           // Non-voxel kernel radius

      // Micro-Erosion & Capillary Detailing (eliminates blurriness, creates sharp fluting)
      microDetailStrength: 0.12,  // High frequency rill incision
      microDetailFreq: 2.2,

      // Wind (Aeolian) Erosion (carves windward faces and sculpts canyon spires)
      windStrength: 0.45,
      windAngle: 0.785,           // 45 degrees
      windAbrasion: 0.05,
      windDeposit: 0.07,

      // Thermal Weathering & Talus Scree (angle of repose)
      talusAngle: 0.62,           // Tan(32 deg)
      talusRate: 0.18,
    };

    this.buildKernel();
  }

  buildKernel() {
    const r = this.params.erosionRadius;
    this.kernel = [];
    let sum = 0;
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const d = Math.hypot(dx, dy);
        if (d <= r) {
          const w = Math.max(0, 1 - d / r);
          this.kernel.push({ dx, dy, w });
          sum += w;
        }
      }
    }
    for (const k of this.kernel) {
      k.w /= sum;
    }
  }

  setParameters(p) {
    let rebuild = false;
    if (p.erosionRadius !== undefined && p.erosionRadius !== this.params.erosionRadius) {
      rebuild = true;
    }
    Object.assign(this.params, p);
    if (rebuild) this.buildKernel();
  }

  // Hydraulic particle simulation with continuous sub-grid kinematics
  stepRainDrops(numDrops = 3000) {
    const N = this.terrain.res;
    const { min, max } = this.terrain.bounds;
    const dx = (max[0] - min[0]) / (N - 1);
    const dz = (max[2] - min[2]) / (N - 1);

    const {
      erosionRate,
      depositionRate,
      capacityFactor,
      minSlope,
      evaporationRate,
      inertia,
      rainIntensity,
      maxPathSteps,
      microDetailStrength,
      microDetailFreq,
    } = this.params;

    const activePaths = [];

    for (let i = 0; i < numDrops; i++) {
      let wx = min[0] + Math.random() * (max[0] - min[0]);
      let wz = min[2] + Math.random() * (max[2] - min[2]);

      let vx = 0;
      let vz = 0;
      let water = rainIntensity;
      let sediment = 0;

      const path = [];

      for (let step = 0; step < maxPathSteps; step++) {
        const fx = ((wx - min[0]) / (max[0] - min[0])) * (N - 1);
        const fz = ((wz - min[2]) / (max[2] - min[2])) * (N - 1);

        const ix = Math.floor(fx);
        const iz = Math.floor(fz);

        if (ix < 1 || ix >= N - 2 || iz < 1 || iz >= N - 2) break;

        const { height: hOld, gx, gz } = this.terrain.sampleHeightAndGradient(wx, wz);

        if (i < 80 && step % 2 === 0) {
          path.push([wx, hOld + 0.2, wz]);
        }

        // Steer droplet with terrain slope gradient + velocity momentum
        vx = vx * inertia - gx * (1 - inertia);
        vz = vz * inertia - gz * (1 - inertia);

        const speed = Math.hypot(vx, vz);
        if (speed < 0.0001) {
          // Stagnation: drop sediment
          this.deposit(ix, iz, sediment);
          sediment = 0;
          break;
        }

        const dirX = vx / speed;
        const dirZ = vz / speed;

        const nextWx = wx + dirX * dx * 0.75;
        const nextWz = wz + dirZ * dz * 0.75;

        const { height: hNew } = this.terrain.sampleHeightAndGradient(nextWx, nextWz);
        const dh = hNew - hOld;

        const slope = Math.max(-dh, minSlope);

        // Micro fluting modulation
        const microMod = 1.0 + Math.sin(wx * microDetailFreq + wz * microDetailFreq) * microDetailStrength;

        // Transport capacity: C = c * water * speed * slope
        const capacity = Math.max(0, slope * speed * water * capacityFactor * microMod);

        const gridIdx = iz * N + ix;
        const hardness = this.terrain.hardness[gridIdx] || 0.5;
        const effectiveErosion = erosionRate * (1.1 - hardness * 0.65);

        if (sediment > capacity) {
          // Deposition in valleys / hollows
          const toDeposit = (sediment - capacity) * depositionRate;
          sediment -= toDeposit;
          this.deposit(ix, iz, toDeposit);
          this.terrain.sediment[gridIdx] += toDeposit;
        } else {
          // Carve dendritic stream channels
          const toErode = Math.min((capacity - sediment) * effectiveErosion, -dh > 0 ? -dh : 0.6);
          sediment += toErode;
          this.erode(ix, iz, toErode);
          this.terrain.erosionMask[gridIdx] = Math.min(1.0, this.terrain.erosionMask[gridIdx] + toErode * 1.5);
        }

        wx = nextWx;
        wz = nextWz;
        water *= (1.0 - evaporationRate);
        if (water < 0.015) break;
      }

      if (path.length > 1) {
        activePaths.push(path);
      }
    }

    this.terrain.computeNormals();
    return activePaths;
  }

  erode(ix, iz, amount) {
    const N = this.terrain.res;
    for (const k of this.kernel) {
      const cx = ix + k.dx;
      const cz = iz + k.dy;
      if (cx >= 0 && cx < N && cz >= 0 && cz < N) {
        const idx = cz * N + cx;
        this.terrain.height[idx] = Math.max(0.1, this.terrain.height[idx] - amount * k.w);
      }
    }
  }

  deposit(ix, iz, amount) {
    const N = this.terrain.res;
    for (const k of this.kernel) {
      const cx = ix + k.dx;
      const cz = iz + k.dy;
      if (cx >= 0 && cx < N && cz >= 0 && cz < N) {
        const idx = cz * N + cx;
        this.terrain.height[idx] += amount * k.w;
      }
    }
  }

  // Thermal talus scree weathering (angle of repose)
  stepThermal(iterations = 1) {
    const N = this.terrain.res;
    const { talusAngle, talusRate } = this.params;
    const { min, max } = this.terrain.bounds;
    const cellSize = (max[0] - min[0]) / (N - 1);

    const neighbors = [
      [-1, 0], [1, 0], [0, -1], [0, 1],
      [-1, -1], [1, -1], [-1, 1], [1, 1]
    ];

    for (let it = 0; it < iterations; it++) {
      for (let iz = 1; iz < N - 1; iz++) {
        for (let ix = 1; ix < N - 1; ix++) {
          const idx = iz * N + ix;
          const h = this.terrain.height[idx];

          let maxDiff = 0;
          let targetIdx = -1;

          for (const [dx, dz] of neighbors) {
            const dist = Math.hypot(dx, dz) * cellSize;
            const nIdx = (iz + dz) * N + (ix + dx);
            const diff = (h - this.terrain.height[nIdx]) / dist;

            if (diff > maxDiff) {
              maxDiff = diff;
              targetIdx = nIdx;
            }
          }

          if (maxDiff > talusAngle && targetIdx !== -1) {
            const slip = (maxDiff - talusAngle) * cellSize * 0.5 * talusRate;
            this.terrain.height[idx] -= slip;
            this.terrain.height[targetIdx] += slip;
            this.terrain.sediment[targetIdx] += slip;
          }
        }
      }
    }
    this.terrain.computeNormals();
  }

  // Aeolian (Wind) Erosion: Sculpting sharp windward ridges and depositing leeward talus
  stepWind(steps = 1) {
    const N = this.terrain.res;
    const { windAngle, windStrength, windAbrasion, windDeposit } = this.params;
    const cosW = Math.cos(windAngle);
    const sinW = Math.sin(windAngle);

    for (let s = 0; s < steps; s++) {
      for (let iz = 1; iz < N - 1; iz++) {
        for (let ix = 1; ix < N - 1; ix++) {
          const idx = iz * N + ix;
          const nx = this.terrain.normals[idx * 3];
          const ny = this.terrain.normals[idx * 3 + 1];
          const nz = this.terrain.normals[idx * 3 + 2];

          const dot = nx * cosW + nz * sinW;
          const steepness = Math.sqrt(Math.max(0, 1.0 - ny * ny));
          const hard = this.terrain.hardness[idx] || 0.5;

          if (dot > 0.15) {
            const carve = dot * steepness * windStrength * windAbrasion * (1.1 - hard);
            this.terrain.height[idx] = Math.max(0.1, this.terrain.height[idx] - carve);
          } else if (dot < -0.15) {
            const dep = (-dot) * (1.0 - steepness) * windStrength * windDeposit;
            this.terrain.height[idx] += dep;
            this.terrain.sediment[idx] += dep;
          }
        }
      }
    }
    this.terrain.computeNormals();
  }

  // Micro-Erosion: Creates crisp capillary rills & micro-gullying
  stepMicroDetail() {
    const N = this.terrain.res;
    const { min, max } = this.terrain.bounds;
    const dx = (max[0] - min[0]) / (N - 1);
    const dz = (max[2] - min[2]) / (N - 1);
    const { microDetailFreq, microDetailStrength } = this.params;

    for (let iz = 1; iz < N - 1; iz++) {
      const wz = min[2] + iz * dz;
      for (let ix = 1; ix < N - 1; ix++) {
        const wx = min[0] + ix * dx;
        const idx = iz * N + ix;
        const slope = 1.0 - Math.min(1.0, this.terrain.normals[idx * 3 + 1]);

        // Incise sharp capillary grooves on steep slopes
        if (slope > 0.3) {
          const groove = Math.sin(wx * microDetailFreq * 3.5) * Math.cos(wz * microDetailFreq * 3.5);
          if (groove > 0.3) {
            const carve = (groove - 0.3) * slope * microDetailStrength * 0.18;
            this.terrain.height[idx] = Math.max(0.1, this.terrain.height[idx] - carve);
          }
        }
      }
    }
    this.terrain.computeNormals();
  }

  simulateCycle(rainDrops = 3000) {
    const paths = this.stepRainDrops(rainDrops);
    this.stepThermal(1);
    this.stepWind(1);
    this.stepMicroDetail();
    return paths;
  }
}

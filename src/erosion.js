// Professional Hydraulic & Aeolian (Wind) Terrain Erosion Simulator
// Designed specifically for realistic Gaea-style dendritic gullying, talus accumulation,
// canyon carving, and windward-leeward spire formation.

export class ErosionSimulator {
  constructor(terrain) {
    this.terrain = terrain;

    // Default physical simulation parameters
    this.params = {
      // Hydraulic parameters
      erosionRate: 0.12,          // Detachment strength
      depositionRate: 0.14,       // Deposition settling rate
      capacityFactor: 4.5,        // Sediment carry capacity multiplier
      minSlope: 0.02,             // Minimum slope preventing divide-by-zero
      evaporationRate: 0.02,      // Water loss per step
      gravity: 9.8,
      inertia: 0.18,              // Momentum retention of raindrop
      rainIntensity: 1.0,         // Water added per drop
      maxPathSteps: 64,           // Droplet lifecycle steps
      erosionRadius: 3,           // Kernel brush radius (in grid cells)

      // Thermal weathering & Talus (talus scree slopes at angle of repose)
      talusAngle: 0.65,           // Critical repose slope (tan θ ≈ 33 degrees)
      talusRate: 0.15,

      // Wind (Aeolian) erosion parameters
      windAngle: 0.785,           // Wind direction angle in radians (~45 deg)
      windStrength: 0.35,         // Wind force
      windAbrasion: 0.04,         // Erosion on wind-facing steep faces
      windDeposit: 0.06,          // Deposition in lee shadows / troughs
    };

    // Precalculate circular kernel brush weights for non-voxel artifact-free erosion
    this.buildBrushKernel();
  }

  buildBrushKernel() {
    const r = this.params.erosionRadius;
    const size = r * 2 + 1;
    this.kernelOffsets = [];
    let sum = 0;

    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const dist = Math.hypot(dx, dy);
        if (dist <= r) {
          const weight = Math.max(0, 1 - dist / r);
          this.kernelOffsets.push({ dx, dy, weight });
          sum += weight;
        }
      }
    }

    // Normalize weights
    for (const k of this.kernelOffsets) {
      k.weight /= sum;
    }
  }

  setParameters(newParams) {
    let rebuild = false;
    if (newParams.erosionRadius !== undefined && newParams.erosionRadius !== this.params.erosionRadius) {
      rebuild = true;
    }
    Object.assign(this.params, newParams);
    if (rebuild) this.buildBrushKernel();
  }

  // Run N rain droplets in particle mode
  stepRainParticles(numDrops = 1500) {
    const N = this.terrain.res;
    const { xMin, xMax, zMin, zMax } = this.terrain.bounds;
    const dx = (xMax - xMin) / (N - 1);
    const dz = (zMax - zMin) / (N - 1);

    const {
      erosionRate,
      depositionRate,
      capacityFactor,
      minSlope,
      evaporationRate,
      gravity,
      inertia,
      rainIntensity,
      maxPathSteps,
    } = this.params;

    const activeParticles = [];

    for (let i = 0; i < numDrops; i++) {
      // Spawn rain droplet randomly over terrain
      let wx = xMin + Math.random() * (xMax - xMin);
      let wz = zMin + Math.random() * (zMax - zMin);

      let vx = 0;
      let vz = 0;
      let water = rainIntensity;
      let sediment = 0;

      const path = [];

      for (let step = 0; step < maxPathSteps; step++) {
        // Grid index
        const fx = ((wx - xMin) / (xMax - xMin)) * (N - 1);
        const fz = ((wz - zMin) / (zMax - zMin)) * (N - 1);

        const ix = Math.floor(fx);
        const iz = Math.floor(fz);

        if (ix < 1 || ix >= N - 2 || iz < 1 || iz >= N - 2) {
          // Flowed off edge
          break;
        }

        const { height: hOld, gx, gz } = this.terrain.sampleHeightAndGradient(wx, wz);

        // Store droplet position for visualizer
        if (i < 80 && step % 2 === 0) {
          path.push([wx, hOld + 0.15, wz]);
        }

        // Steer velocity with terrain downhill gradient & momentum
        vx = vx * inertia - gx * (1 - inertia);
        vz = vz * inertia - gz * (1 - inertia);

        const speed = Math.hypot(vx, vz);
        if (speed < 0.0001) {
          // Stagnant puddle: deposit all sediment and evaporate
          this.depositBrush(ix, iz, sediment);
          sediment = 0;
          break;
        }

        // Normalize direction and step forward
        const dirX = vx / speed;
        const dirZ = vz / speed;

        const nextWx = wx + dirX * dx * 0.75;
        const nextWz = wz + dirZ * dz * 0.75;

        const { height: hNew } = this.terrain.sampleHeightAndGradient(nextWx, nextWz);
        const dh = hNew - hOld;

        // Transport capacity equation (Gaea / Stream Power Model)
        // C = c_factor * water * speed * max(-dh, minSlope)
        const slope = Math.max(-dh, minSlope);
        const capacity = Math.max(0, slope * speed * water * capacityFactor);

        const gridIdx = iz * N + ix;
        const rockHardness = this.terrain.hardness[gridIdx] || 0.5;
        const effectiveErodeRate = erosionRate * (1.0 - rockHardness * 0.65);

        if (sediment > capacity) {
          // Deposition: drop surplus sediment into valley or depression
          const toDeposit = (sediment - capacity) * depositionRate;
          sediment -= toDeposit;
          this.depositBrush(ix, iz, toDeposit);
          this.terrain.sediment[gridIdx] += toDeposit;
        } else {
          // Erosion: detach rock material along flow channels
          const toErode = Math.min((capacity - sediment) * effectiveErodeRate, -dh > 0 ? -dh : 0.5);
          sediment += toErode;
          this.erodeBrush(ix, iz, toErode);
        }

        // Advance water droplet
        wx = nextWx;
        wz = nextWz;
        water *= (1.0 - evaporationRate);
        if (water < 0.01) break;
      }

      if (path.length > 1) {
        activeParticles.push(path);
      }
    }

    this.terrain.computeNormals();
    return activeParticles;
  }

  // Smooth kernel erosion
  erodeBrush(ix, iz, amount) {
    const N = this.terrain.res;
    for (const k of this.kernelOffsets) {
      const cx = ix + k.dx;
      const cz = iz + k.dy;
      if (cx >= 0 && cx < N && cz >= 0 && cz < N) {
        const idx = cz * N + cx;
        this.terrain.height[idx] = Math.max(0.1, this.terrain.height[idx] - amount * k.weight);
      }
    }
  }

  // Smooth kernel deposition
  depositBrush(ix, iz, amount) {
    const N = this.terrain.res;
    for (const k of this.kernelOffsets) {
      const cx = ix + k.dx;
      const cz = iz + k.dy;
      if (cx >= 0 && cx < N && cz >= 0 && cz < N) {
        const idx = cz * N + cx;
        this.terrain.height[idx] += amount * k.weight;
      }
    }
  }

  // Thermal Weathering & Talus formation:
  // Material above the critical angle of repose crumbles down to form natural scree slopes.
  stepThermalWeathering(iterations = 1) {
    const N = this.terrain.res;
    const { talusAngle, talusRate } = this.params;
    const { xMin, xMax } = this.terrain.bounds;
    const cellSize = (xMax - xMin) / (N - 1);

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

  // Aeolian (Wind) Erosion & Saltation:
  // Wind strips exposed rock from windward facing slopes and deposits sediment in leeward shadow zones,
  // sculpting dramatic canyon spires, yardangs, and dunes.
  stepWindErosion(steps = 1) {
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

          // Dot product between wind vector and surface normal
          // Positive: facing wind (abrasion), Negative: leeward (shadow deposit)
          const dot = nx * cosW + nz * sinW;
          const steepness = Math.sqrt(Math.max(0, 1.0 - ny * ny));
          const hard = this.terrain.hardness[idx] || 0.5;

          if (dot > 0.15) {
            // Windward: carve and sharpen ridges/spires
            const carve = dot * steepness * windStrength * windAbrasion * (1.1 - hard);
            this.terrain.height[idx] = Math.max(0.1, this.terrain.height[idx] - carve);
          } else if (dot < -0.15) {
            // Leeward eddy: drop fine sediment
            const dep = (-dot) * (1.0 - steepness) * windStrength * windDeposit;
            this.terrain.height[idx] += dep;
            this.terrain.sediment[idx] += dep;
          }
        }
      }
    }
    this.terrain.computeNormals();
  }

  // Combined one-click simulation step
  simulateCycle(rainDrops = 2500) {
    const particles = this.stepRainParticles(rainDrops);
    this.stepThermalWeathering(1);
    this.stepWindErosion(1);
    this.terrain.rebuildSDFVolume();
    return particles;
  }
}

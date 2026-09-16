// Volumetric 3D SDF Erosion Simulator
// True 3-Dimensional Hydraulic Erosion + Aeolian (Wind) Weathering + Micro-Erosion
// Particles move in full 3D space, flow along SDF surfaces in X, Y, and Z directions,
// and carve volumetric undercuts, overhangs, and canyon spires.

export class VolumetricErosion {
  constructor(sdf) {
    this.sdf = sdf;

    this.params = {
      // 3D Hydraulic Erosion
      erosionRate: 0.16,          // Detachment strength
      depositionRate: 0.15,       // Sediment drop rate
      capacityFactor: 4.8,        // Transport capacity
      gravity: 9.8,
      inertia: 0.22,              // Droplet momentum retention
      maxPathSteps: 70,           // Droplet lifetime steps
      carveRadius: 1.8,           // Carve spherical radius in world units
      evaporationRate: 0.02,

      // Micro-Erosion & Gullying (high-frequency detail)
      microErosionScale: 1.8,     // Micro rill / fluting frequency
      microCarveStrength: 0.08,   // High-frequency surface incision

      // 3D Aeolian (Wind) Weathering (carves XY and Z cliffs)
      windDirection: [0.707, 0.1, 0.707], // 3D wind velocity vector
      windAbrasion: 0.06,         // Surface abrasion on windward faces
      windDeposit: 0.04,          // Sediment drop in leeward eddies

      // Thermal talus repose
      talusThreshold: 0.85,       // Max slope gradient before rockfall
      talusRate: 0.18,
    };
  }

  setParameters(p) {
    Object.assign(this.params, p);
  }

  // Volumetric Rain Droplet Simulation
  // Droplets are spawned in 3D air above terrain, fall by gravity, impact the 3D SDF surface,
  // and slide along the 3D surface tangent (constrained by SDF normal: v_surface = v - (v·N)N).
  stepVolumetricRain(numDrops = 1800) {
    const { min, max } = this.sdf.bounds;
    const {
      erosionRate,
      depositionRate,
      capacityFactor,
      gravity,
      inertia,
      maxPathSteps,
      carveRadius,
      evaporationRate,
      microErosionScale,
      microCarveStrength,
    } = this.params;

    const activePaths = [];

    for (let drop = 0; drop < numDrops; drop++) {
      // Spawn random point in 3D airspace
      let wx = min[0] + Math.random() * (max[0] - min[0]);
      let wz = min[2] + Math.random() * (max[2] - min[2]);
      let wy = max[1] - 1.0; // near top of volume

      // Freefall until hitting SDF surface (distance <= 0.05)
      let hit = false;
      for (let f = 0; f < 30; f++) {
        const d = this.sdf.sampleSDF(wx, wy, wz);
        if (d <= 0.1) {
          hit = true;
          break;
        }
        wy -= Math.max(0.4, d * 0.8);
        if (wy <= min[1] + 1.0) break;
      }

      if (!hit) continue;

      let vx = 0;
      let vy = 0;
      let vz = 0;
      let water = 1.0;
      let sediment = 0.0;

      const path = [];

      for (let step = 0; step < maxPathSteps; step++) {
        // Sample 3D SDF surface normal
        const [nx, ny, nz] = this.sdf.sampleNormal(wx, wy, wz);

        if (step % 2 === 0 && drop < 60) {
          path.push([wx, wy, wz]);
        }

        // Downward gravity force
        let fx = 0;
        let fy = -gravity * 0.1;
        let fz = 0;

        // Project gravity onto surface tangent plane (3D surface flow)
        // Force_tangent = F - (F·N) * N
        const fDotN = fx * nx + fy * ny + fz * nz;
        fx -= fDotN * nx;
        fy -= fDotN * ny;
        fz -= fDotN * nz;

        // Accelerate velocity with momentum inertia
        vx = vx * inertia + fx * (1 - inertia);
        vy = vy * inertia + fy * (1 - inertia);
        vz = vz * inertia + fz * (1 - inertia);

        const speed = Math.hypot(vx, vy, vz);
        if (speed < 0.001) break;

        // Step forward in 3D space
        const stepDist = 0.45;
        const nvx = vx / speed;
        const nvy = vy / speed;
        const nvz = vz / speed;

        const nextWx = wx + nvx * stepDist;
        const nextWy = wy + nvy * stepDist;
        const nextWz = wz + nvz * stepDist;

        // Constrain particle to SDF surface (snap back along surface normal)
        const nextDist = this.sdf.sampleSDF(nextWx, nextWy, nextWz);
        const snappedWx = nextWx - nx * nextDist;
        const snappedWy = nextWy - ny * nextDist;
        const snappedWz = nextWz - nz * nextDist;

        // Elevation change dh
        const dh = snappedWy - wy;
        const slope = Math.max(0.02, -dh / stepDist);

        // Micro-erosion fluting modulation based on position
        const microFlute = 1.0 + Math.sin(wx * microErosionScale + wz * microErosionScale) * microCarveStrength;

        // Stream power transport capacity: C = c * water * speed * slope
        const capacity = Math.max(0, slope * speed * water * capacityFactor * microFlute);

        // Read local rock hardness from voxel
        const [gx, gy, gz] = this.sdf.worldToGrid(wx, wy, wz);
        const ix = Math.max(0, Math.min(this.sdf.getNx() - 1, Math.round(gx)));
        const iy = Math.max(0, Math.min(this.sdf.getNy() - 1, Math.round(gy)));
        const iz = Math.max(0, Math.min(this.sdf.getNz() - 1, Math.round(gz)));
        const vIdx = this.sdf.voxelIndex(ix, iy, iz);
        const hardness = this.sdf.data[vIdx + 3] || 0.5;

        const effectiveErodeRate = erosionRate * (1.1 - hardness * 0.6);

        if (sediment > capacity) {
          // Volumetric Deposition: Fill hollows / crevices
          const toDeposit = (sediment - capacity) * depositionRate;
          sediment -= toDeposit;
          this.alterSDFVolume(snappedWx, snappedWy, snappedWz, carveRadius * 0.8, -toDeposit); // negative distance = add solid
          this.sdf.data[vIdx + 2] += toDeposit; // add sediment
        } else {
          // Volumetric Erosion: Carve rock solid (increase signed distance)
          const toErode = Math.min((capacity - sediment) * effectiveErodeRate, 0.4);
          sediment += toErode;
          this.alterSDFVolume(snappedWx, snappedWy, snappedWz, carveRadius, toErode); // positive distance = carve void
        }

        // Moisture trail
        this.sdf.data[vIdx + 1] = Math.min(1.0, this.sdf.data[vIdx + 1] + 0.15);

        // Advance particle
        wx = snappedWx;
        wy = snappedWy;
        wz = snappedWz;

        // Boundary check
        if (wx < min[0] || wx > max[0] || wz < min[2] || wz > max[2] || wy < min[1] || wy > max[1]) {
          break;
        }

        water *= (1.0 - evaporationRate);
        if (water < 0.02) break;
      }

      if (path.length > 1) {
        activePaths.push(path);
      }
    }

    return activePaths;
  }

  // Carve or deposit into the 3D SDF volume within a spherical kernel
  alterSDFVolume(wx, wy, wz, radius, deltaDist) {
    const { min, max } = this.sdf.bounds;
    const [nx, ny, nz] = this.sdf.dim;

    const [gx, gy, gz] = this.sdf.worldToGrid(wx, wy, wz);
    const radVoxX = (radius / (max[0] - min[0])) * (nx - 1);
    const radVoxY = (radius / (max[1] - min[1])) * (ny - 1);
    const radVoxZ = (radius / (max[2] - min[2])) * (nz - 1);

    const iX0 = Math.max(0, Math.floor(gx - radVoxX));
    const iX1 = Math.min(nx - 1, Math.ceil(gx + radVoxX));
    const iY0 = Math.max(0, Math.floor(gy - radVoxY));
    const iY1 = Math.min(ny - 1, Math.ceil(gy + radVoxY));
    const iZ0 = Math.max(0, Math.floor(gz - radVoxZ));
    const iZ1 = Math.min(nz - 1, Math.ceil(gz + radVoxZ));

    const dx = (max[0] - min[0]) / (nx - 1);
    const dy = (max[1] - min[1]) / (ny - 1);
    const dz = (max[2] - min[2]) / (nz - 1);

    for (let iz = iZ0; iz <= iZ1; iz++) {
      const pz = min[2] + iz * dz;
      for (let iy = iY0; iy <= iY1; iy++) {
        const py = min[1] + iy * dy;
        for (let ix = iX0; ix <= iX1; ix++) {
          const px = min[0] + ix * dx;

          const dist = Math.hypot(px - wx, py - wy, pz - wz);
          if (dist < radius) {
            const weight = 1.0 - (dist / radius);
            const idx = this.sdf.voxelIndex(ix, iy, iz);
            this.sdf.data[idx] += deltaDist * weight;
          }
        }
      }
    }
  }

  // Aeolian (Wind) Weathering across full 3D Volume:
  // Carves vertical rock walls, forms desert yardangs, needles, and undercut alcoves in XY direction.
  step3DWindErosion(steps = 1) {
    const [nx, ny, nz] = this.sdf.dim;
    const { min, max } = this.sdf.bounds;
    const dx = (max[0] - min[0]) / (nx - 1);
    const dy = (max[1] - min[1]) / (ny - 1);
    const dz = (max[2] - min[2]) / (nz - 1);

    const [wxDir, wyDir, wzDir] = this.params.windDirection;
    const { windAbrasion, windDeposit } = this.params;

    for (let s = 0; s < steps; s++) {
      for (let iz = 1; iz < nz - 1; iz++) {
        const wz = min[2] + iz * dz;
        for (let iy = 1; iy < ny - 1; iy++) {
          const wy = min[1] + iy * dy;
          for (let ix = 1; ix < nx - 1; ix++) {
            const wx = min[0] + ix * dx;
            const idx = this.sdf.voxelIndex(ix, iy, iz);
            const dist = this.sdf.data[idx];

            // Only process surface boundary voxels (|dist| < 1.0)
            if (Math.abs(dist) > 1.2) continue;

            const [normX, normY, normZ] = this.sdf.sampleNormal(wx, wy, wz);

            // Dot product between surface normal and wind vector
            const dot = normX * wxDir + normY * wyDir + normZ * wzDir;
            const steepCliff = Math.sqrt(Math.max(0, 1.0 - normY * normY)); // cliff face in XY
            const hard = this.sdf.data[idx + 3] || 0.5;

            if (dot > 0.15) {
              // Windward face: carve vertical rock grooves and sharpen spires
              const carve = dot * steepCliff * windAbrasion * (1.1 - hard);
              this.sdf.data[idx] += carve;
            } else if (dot < -0.15) {
              // Leeward shadow: deposit fine sediment
              const dep = (-dot) * windDeposit;
              this.sdf.data[idx] = Math.max(-0.5, this.sdf.data[idx] - dep * 0.4);
              this.sdf.data[idx + 2] += dep;
            }
          }
        }
      }
    }
  }

  // Micro-Erosion: Incises sharp dendritic capillary rills along surface gradients
  stepMicroErosion() {
    const [nx, ny, nz] = this.sdf.dim;
    const { min, max } = this.sdf.bounds;
    const dx = (max[0] - min[0]) / (nx - 1);
    const dy = (max[1] - min[1]) / (ny - 1);
    const dz = (max[2] - min[2]) / (nz - 1);
    const { microErosionScale, microCarveStrength } = this.params;

    for (let iz = 2; iz < nz - 2; iz++) {
      const wz = min[2] + iz * dz;
      for (let iy = 2; iy < ny - 2; iy++) {
        const wy = min[1] + iy * dy;
        for (let ix = 2; ix < nx - 2; ix++) {
          const idx = this.sdf.voxelIndex(ix, iy, iz);
          const dist = this.sdf.data[idx];

          if (Math.abs(dist) > 0.9) continue;

          const wx = min[0] + ix * dx;

          // High frequency micro-fluting function
          const rillPattern = Math.sin(wx * microErosionScale * 2.5 + wy * 1.5) * 
                              Math.cos(wz * microErosionScale * 2.5 + wy * 1.2);

          if (rillPattern > 0.4) {
            const carve = (rillPattern - 0.4) * microCarveStrength * 0.5;
            this.sdf.data[idx] += carve;
          }
        }
      }
    }
  }

  // Run a complete 3D erosion cycle
  simulateCycle(drops = 2200) {
    const paths = this.stepVolumetricRain(drops);
    this.step3DWindErosion(1);
    this.stepMicroErosion();
    return paths;
  }
}

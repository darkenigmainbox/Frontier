// Advanced Geological Erosion Engine: Hydraulic (Droplet Physics) + Thermal (Talus / Scree)
// Generates: Modified Heightfield, Flow Accumulation Map, Talus Scree Map, Cavity Map, Normal Map

export class ErosionSimulation {
  constructor(size = 512) {
    this.size = size;
    this.flowMap = new Float32Array(size * size);
    this.talusMap = new Float32Array(size * size);
    this.cavityMap = new Float32Array(size * size);
    this.normalMap = new Float32Array(size * size * 3);
    this.slopeMap = new Float32Array(size * size);
  }

  resize(size) {
    if (this.size !== size) {
      this.size = size;
      this.flowMap = new Float32Array(size * size);
      this.talusMap = new Float32Array(size * size);
      this.cavityMap = new Float32Array(size * size);
      this.normalMap = new Float32Array(size * size * 3);
      this.slopeMap = new Float32Array(size * size);
    }
  }

  // Hydraulic Erosion: Physical droplet simulation carving rivers, gullies and alluvial fans
  simulateHydraulic(heights, options = {}) {
    const {
      iterations = 45000,
      inertia = 0.15,
      capacityFactor = 3.5,
      minSlope = 0.015,
      depositionRate = 0.18,
      erosionRate = 0.35,
      gravity = 18.0,
      evaporation = 0.02,
      erosionRadius = 2,
      seed = 42
    } = options;

    const S = this.size;
    const S1 = S - 1;
    this.flowMap.fill(0);

    // Precompute brush weights for smooth erosion footprint
    const brushIndices = [];
    const brushWeights = [];
    for (let dy = -erosionRadius; dy <= erosionRadius; dy++) {
      for (let dx = -erosionRadius; dx <= erosionRadius; dx++) {
        const distSq = dx * dx + dy * dy;
        if (distSq <= erosionRadius * erosionRadius) {
          const w = 1.0 - Math.sqrt(distSq) / (erosionRadius + 0.1);
          brushIndices.push({ dx, dy });
          brushWeights.push(w);
        }
      }
    }
    const weightSum = brushWeights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < brushWeights.length; i++) brushWeights[i] /= weightSum;

    // Pseudo-random generator (Mulberry32)
    let s = (seed ^ 0xdeadbeef) >>> 0;
    const rnd = () => {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    const maxSteps = 45;

    for (let iter = 0; iter < iterations; iter++) {
      // Spawn droplet at random location (biased slightly away from extreme boundaries)
      let posX = 2 + rnd() * (S - 5);
      let posY = 2 + rnd() * (S - 5);
      let dirX = 0;
      let dirY = 0;
      let speed = 1.0;
      let water = 1.0;
      let sediment = 0.0;

      for (let step = 0; step < maxSteps; step++) {
        const nodeX = Math.floor(posX);
        const nodeY = Math.floor(posY);
        const u = posX - nodeX;
        const v = posY - nodeY;

        if (nodeX < 1 || nodeX >= S - 2 || nodeY < 1 || nodeY >= S - 2) break;

        // Bilinear height and slope calculation
        const idx00 = nodeY * S + nodeX;
        const idx10 = idx00 + 1;
        const idx01 = idx00 + S;
        const idx11 = idx01 + 1;

        const h00 = heights[idx00];
        const h10 = heights[idx10];
        const h01 = heights[idx01];
        const h11 = heights[idx11];

        // Gradient vector
        const gradX = (h10 - h00) * (1 - v) + (h11 - h01) * v;
        const gradY = (h01 - h00) * (1 - u) + (h11 - h10) * u;
        const currentHeight = h00 * (1 - u) * (1 - v) + h10 * u * (1 - v) + h01 * (1 - u) * v + h11 * u * v;

        // Accumulate flow in drainage map
        this.flowMap[idx00] += water * (1 - u) * (1 - v);
        this.flowMap[idx10] += water * u * (1 - v);
        this.flowMap[idx01] += water * (1 - u) * v;
        this.flowMap[idx11] += water * u * v;

        // Update direction with inertia
        dirX = dirX * inertia - gradX * (1 - inertia);
        dirY = dirY * inertia - gradY * (1 - inertia);
        const len = Math.sqrt(dirX * dirX + dirY * dirY);
        if (len === 0) break;
        dirX /= len;
        dirY /= len;

        // Next position
        const nextX = posX + dirX;
        const nextY = posY + dirY;

        if (nextX < 1 || nextX >= S - 2 || nextY < 1 || nextY >= S - 2) break;

        const nextNodeX = Math.floor(nextX);
        const nextNodeY = Math.floor(nextY);
        const nextU = nextX - nextNodeX;
        const nextV = nextY - nextNodeY;

        const nextH00 = heights[nextNodeY * S + nextNodeX];
        const nextH10 = heights[nextNodeY * S + nextNodeX + 1];
        const nextH01 = heights[(nextNodeY + 1) * S + nextNodeX];
        const nextH11 = heights[(nextNodeY + 1) * S + nextNodeX + 1];

        const nextHeight = nextH00 * (1 - nextU) * (1 - nextV) + nextH10 * nextU * (1 - nextV) + nextH01 * (1 - nextU) * nextV + nextH11 * nextU * nextV;
        const deltaHeight = nextHeight - currentHeight;

        // Sediment transport capacity
        const slope = Math.max(-deltaHeight, minSlope);
        const capacity = Math.max(slope * speed * water * capacityFactor, 0.001);

        if (sediment > capacity || deltaHeight > 0) {
          // Deposit sediment
          const depositAmount = (deltaHeight > 0)
            ? Math.min(deltaHeight, sediment)
            : (sediment - capacity) * depositionRate;

          sediment -= depositAmount;
          heights[idx00] += depositAmount * (1 - u) * (1 - v);
          heights[idx10] += depositAmount * u * (1 - v);
          heights[idx01] += depositAmount * (1 - u) * v;
          heights[idx11] += depositAmount * u * v;
        } else {
          // Erode rock
          const erodeAmount = Math.min((capacity - sediment) * erosionRate, -deltaHeight);
          sediment += erodeAmount;

          for (let b = 0; b < brushIndices.length; b++) {
            const bx = nodeX + brushIndices[b].dx;
            const by = nodeY + brushIndices[b].dy;
            if (bx >= 0 && bx < S && by >= 0 && by < S) {
              const bIdx = by * S + bx;
              heights[bIdx] = Math.max(0, heights[bIdx] - erodeAmount * brushWeights[b]);
            }
          }
        }

        // Accelerate droplet downhill
        speed = Math.sqrt(Math.max(0, speed * speed + deltaHeight * gravity));
        water *= (1.0 - evaporation);

        posX = nextX;
        posY = nextY;
      }
    }

    // Normalize flow accumulation for texturing
    let maxFlow = 0;
    for (let i = 0; i < S * S; i++) {
      if (this.flowMap[i] > maxFlow) maxFlow = this.flowMap[i];
    }
    if (maxFlow > 0) {
      const invMax = 1.0 / maxFlow;
      for (let i = 0; i < S * S; i++) {
        // Logarithmic scaling for realistic river hierarchy
        this.flowMap[i] = Math.log1p(this.flowMap[i] * 3.0) / Math.log1p(maxFlow * 3.0);
      }
    }
  }

  // Thermal Weathering & Scree/Talus Slope Failure
  simulateThermal(heights, options = {}) {
    const {
      iterations = 18,
      talusAngle = 36, // degrees (angle of repose)
      talusRate = 0.45
    } = options;

    const S = this.size;
    this.talusMap.fill(0);
    const talusThreshold = Math.tan((talusAngle * Math.PI) / 180.0) / S * 1.5;

    for (let iter = 0; iter < iterations; iter++) {
      for (let y = 1; y < S - 1; y++) {
        const yRow = y * S;
        for (let x = 1; x < S - 1; x++) {
          const idx = yRow + x;
          const h = heights[idx];

          // Check 4 neighbors
          const nN = idx - S;
          const nS = idx + S;
          const nW = idx - 1;
          const nE = idx + 1;

          let maxDiff = 0;
          let target = -1;

          const dN = h - heights[nN];
          if (dN > maxDiff) { maxDiff = dN; target = nN; }
          const dS = h - heights[nS];
          if (dS > maxDiff) { maxDiff = dS; target = nS; }
          const dW = h - heights[nW];
          if (dW > maxDiff) { maxDiff = dW; target = nW; }
          const dE = h - heights[nE];
          if (dE > maxDiff) { maxDiff = dE; target = nE; }

          if (maxDiff > talusThreshold && target >= 0) {
            const shift = (maxDiff - talusThreshold) * talusRate * 0.5;
            heights[idx] -= shift;
            heights[target] += shift;
            this.talusMap[target] += shift * 2.0;
          }
        }
      }
    }

    // Normalize talus map
    let maxTalus = 0;
    for (let i = 0; i < S * S; i++) {
      if (this.talusMap[i] > maxTalus) maxTalus = this.talusMap[i];
    }
    if (maxTalus > 0) {
      for (let i = 0; i < S * S; i++) {
        this.talusMap[i] = Math.min(1.0, this.talusMap[i] / (maxTalus * 0.8));
      }
    }
  }

  // Compute Surface Normals, Slope (0° to 90°), and Cavity (Ambient Occlusion/Curvature)
  computeDerivatives(heights, worldHeight = 100.0) {
    const S = this.size;
    const invS = 1.0 / (S - 1);
    const scaleFactor = worldHeight * invS;

    for (let y = 0; y < S; y++) {
      const ym = Math.max(0, y - 1) * S;
      const yp = Math.min(S - 1, y + 1) * S;
      const yc = y * S;

      for (let x = 0; x < S; x++) {
        const xm = Math.max(0, x - 1);
        const xp = Math.min(S - 1, x + 1);

        const hL = heights[yc + xm];
        const hR = heights[yc + xp];
        const hD = heights[ym + x];
        const hU = heights[yp + x];
        const hC = heights[yc + x];

        // Central differences
        const dx = (hR - hL) * 0.5 * scaleFactor;
        const dz = (hU - hD) * 0.5 * scaleFactor;

        // Normal = normalize(-dx, 1.0, -dz)
        const nx = -dx;
        const ny = 1.0;
        const nz = -dz;
        const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
        const normX = nx / len;
        const normY = ny / len;
        const normZ = nz / len;

        const idx3 = (yc + x) * 3;
        this.normalMap[idx3] = normX;
        this.normalMap[idx3 + 1] = normY;
        this.normalMap[idx3 + 2] = normZ;

        // Slope in degrees: arccos(Ny)
        const slopeDeg = (Math.acos(Math.max(-1, Math.min(1, normY))) * 180.0) / Math.PI;
        this.slopeMap[yc + x] = slopeDeg;

        // Discrete Laplacian for Cavity / Curvature (crevices vs ridges)
        const laplacian = (hL + hR + hU + hD - 4.0 * hC) * 10.0;
        // Map to 0..1 range (0.5 is flat, >0.5 is concave crevice, <0.5 is convex peak)
        this.cavityMap[yc + x] = Math.max(0.0, Math.min(1.0, 0.5 + laplacian * 2.0));
      }
    }
  }
}

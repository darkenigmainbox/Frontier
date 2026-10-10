// Ultra-fast seeded procedural noise generator
// Includes: Simplex/Perlin, Ridged Multifractal, Voronoi/Worley, Domain Warping, Billow

export class FastNoise {
  constructor(seed = 1337) {
    this.seed = seed;
    this.perm = new Uint8Array(512);
    this.permMod12 = new Uint8Array(512);
    this.reseed(seed);
  }

  reseed(seed) {
    this.seed = seed;
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    
    // MurmurHash / LCG shuffle
    let s = (seed ^ 0x6a09e667) >>> 0;
    for (let i = 255; i > 0; i--) {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      const j = (s >> 16) % (i + 1);
      const tmp = p[i];
      p[i] = p[j];
      p[j] = tmp;
    }
    for (let i = 0; i < 512; i++) {
      this.perm[i] = p[i & 255];
      this.permMod12[i] = (this.perm[i] % 12);
    }
  }

  // 2D Simplex Noise
  noise2D(x, y) {
    const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
    const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;

    let s = (x + y) * F2;
    let i = Math.floor(x + s);
    let j = Math.floor(y + s);
    let t = (i + j) * G2;
    let X0 = i - t;
    let Y0 = j - t;
    let x0 = x - X0;
    let y0 = y - Y0;

    let i1, j1;
    if (x0 > y0) { i1 = 1; j1 = 0; }
    else { i1 = 0; j1 = 1; }

    let x1 = x0 - i1 + G2;
    let y1 = y0 - j1 + G2;
    let x2 = x0 - 1.0 + 2.0 * G2;
    let y2 = y0 - 1.0 + 2.0 * G2;

    let ii = i & 255;
    let jj = j & 255;

    let gi0 = this.permMod12[ii + this.perm[jj]];
    let gi1 = this.permMod12[ii + i1 + this.perm[jj + j1]];
    let gi2 = this.permMod12[ii + 1 + this.perm[jj + 1]];

    const grad3 = [
      [1, 1], [-1, 1], [1, -1], [-1, -1],
      [1, 0], [-1, 0], [0, 1], [0, -1],
      [1, 1], [-1, 1], [1, -1], [-1, -1]
    ];

    let t0 = 0.5 - x0 * x0 - y0 * y0;
    let n0 = 0;
    if (t0 > 0) {
      t0 *= t0;
      const g = grad3[gi0];
      n0 = t0 * t0 * (g[0] * x0 + g[1] * y0);
    }

    let t1 = 0.5 - x1 * x1 - y1 * y1;
    let n1 = 0;
    if (t1 > 0) {
      t1 *= t1;
      const g = grad3[gi1];
      n1 = t1 * t1 * (g[0] * x1 + g[1] * y1);
    }

    let t2 = 0.5 - x2 * x2 - y2 * y2;
    let n2 = 0;
    if (t2 > 0) {
      t2 *= t2;
      const g = grad3[gi2];
      n2 = t2 * t2 * (g[0] * x2 + g[1] * y2);
    }

    return 70.0 * (n0 + n1 + n2); // Normalized roughly -1 to 1
  }

  // Fractal Brownian Motion (FBM)
  fbm(x, y, octaves = 6, lacunarity = 2.0, persistence = 0.5) {
    let total = 0;
    let frequency = 1.0;
    let amplitude = 1.0;
    let maxValue = 0;
    for (let i = 0; i < octaves; i++) {
      total += this.noise2D(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      frequency *= lacunarity;
      amplitude *= persistence;
    }
    return total / maxValue;
  }

  // Ridged Multifractal Noise (Gaea's alpine ridge signature)
  ridgedMF(x, y, octaves = 6, lacunarity = 2.1, persistence = 0.5, sharpness = 2.0) {
    let result = 0;
    let frequency = 1.0;
    let amplitude = 1.0;
    let weight = 1.0;
    let maxAmp = 0;

    for (let i = 0; i < octaves; i++) {
      let n = Math.abs(this.noise2D(x * frequency, y * frequency));
      n = 1.0 - n; // invert ridges
      n = Math.pow(Math.max(0, n), sharpness); // sharpen crests
      n *= weight;
      weight = Math.min(1.0, Math.max(0.0, n * 2.0)); // feedback

      result += n * amplitude;
      maxAmp += amplitude;
      frequency *= lacunarity;
      amplitude *= persistence;
    }
    return result / (maxAmp * 0.75);
  }

  // Billow Noise (Puffy hills / dunes)
  billow(x, y, octaves = 5, lacunarity = 2.0, persistence = 0.5) {
    let total = 0;
    let frequency = 1.0;
    let amplitude = 1.0;
    let maxValue = 0;
    for (let i = 0; i < octaves; i++) {
      total += (Math.abs(this.noise2D(x * frequency, y * frequency)) * 2.0 - 1.0) * amplitude;
      maxValue += amplitude;
      frequency *= lacunarity;
      amplitude *= persistence;
    }
    return (total / maxValue + 1.0) * 0.5;
  }

  // Voronoi / Worley Noise (Cragged rock faces, columnar joints, cellular blocks)
  voronoi(x, y) {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    let minDist1 = 1e9;
    let minDist2 = 1e9;

    for (let j = -1; j <= 1; j++) {
      for (let i = -1; i <= 1; i++) {
        const cx = ix + i;
        const cy = iy + j;
        // Seeded random point in cell
        const h = Math.sin(cx * 12.9898 + cy * 78.233 + this.seed) * 43758.5453;
        const px = cx + (h - Math.floor(h));
        const h2 = Math.cos(cx * 37.719 + cy * 26.639 + this.seed) * 28913.23;
        const py = cy + (h2 - Math.floor(h2));

        const dx = px - x;
        const dy = py - y;
        const d = Math.sqrt(dx * dx + dy * dy);

        if (d < minDist1) {
          minDist2 = minDist1;
          minDist1 = d;
        } else if (d < minDist2) {
          minDist2 = d;
        }
      }
    }
    // F2 - F1 gives pronounced cellular borders (mountain ridges)
    return { f1: minDist1, f2: minDist2, edge: minDist2 - minDist1 };
  }

  // Domain Warped Fractal (Tectonic folds and twisted geologic strata)
  warpedFbm(x, y, warpStrength = 1.2, octaves = 6) {
    const qx = this.fbm(x, y, 3, 2.0, 0.5);
    const qy = this.fbm(x + 5.2, y + 1.3, 3, 2.0, 0.5);

    const rx = this.fbm(x + 4.0 * qx + 1.7, y + 4.0 * qy + 9.2, 3, 2.0, 0.5);
    const ry = this.fbm(x + 4.0 * qx + 8.3, y + 4.0 * qy + 2.8, 3, 2.0, 0.5);

    return this.fbm(x + warpStrength * rx, y + warpStrength * ry, octaves, 2.0, 0.5);
  }
}

// Procedural Noise and 3D Vector Math for Volumetric SDF & Hydraulic Erosion
export class FastNoise {
  constructor(seed = 1337) {
    this.seed = seed;
  }

  // 3D hash
  hash(x, y, z) {
    let h = Math.imul(x, 1540483477) ^ Math.imul(y, 1812433253) ^ Math.imul(z, 179424673) ^ Math.imul(this.seed, 1013904223);
    h = Math.imul(h ^ (h >>> 16), 1664525);
    h = Math.imul(h ^ (h >>> 13), 22695477);
    return ((h ^ (h >>> 15)) >>> 0) / 4294967295;
  }

  // 3D Value Noise with smooth cubic interpolation
  valueNoise3D(x, y, z) {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const iz = Math.floor(z);

    const fx = x - ix;
    const fy = y - iy;
    const fz = z - iz;

    const u = fx * fx * (3.0 - 2.0 * fx);
    const v = fy * fy * (3.0 - 2.0 * fy);
    const w = fz * fz * (3.0 - 2.0 * fz);

    const c000 = this.hash(ix, iy, iz);
    const c100 = this.hash(ix + 1, iy, iz);
    const c010 = this.hash(ix, iy + 1, iz);
    const c110 = this.hash(ix + 1, iy + 1, iz);
    const c001 = this.hash(ix, iy, iz + 1);
    const c101 = this.hash(ix + 1, iy, iz + 1);
    const c011 = this.hash(ix, iy + 1, iz + 1);
    const c111 = this.hash(ix + 1, iy + 1, iz + 1);

    const x00 = c000 + u * (c100 - c000);
    const x10 = c010 + u * (c110 - c010);
    const x01 = c001 + u * (c101 - c001);
    const x11 = c011 + u * (c111 - c011);

    const y0 = x00 + v * (x10 - x00);
    const y1 = x01 + v * (x11 - x01);

    return y0 + w * (y1 - y0);
  }

  // 2D Value Noise
  valueNoise2D(x, z) {
    const ix = Math.floor(x);
    const iz = Math.floor(z);

    const fx = x - ix;
    const fz = z - iz;

    const u = fx * fx * (3.0 - 2.0 * fx);
    const w = fz * fz * (3.0 - 2.0 * fz);

    const c00 = this.hash(ix, 0, iz);
    const c10 = this.hash(ix + 1, 0, iz);
    const c01 = this.hash(ix, 0, iz + 1);
    const c11 = this.hash(ix + 1, 0, iz + 1);

    const x0 = c00 + u * (c10 - c00);
    const x1 = c01 + u * (c11 - c01);

    return x0 + w * (x1 - x0);
  }

  // Fractal Brownian Motion (FBM)
  fbm2D(x, z, octaves = 5, lacunarity = 2.0, gain = 0.5) {
    let sum = 0;
    let amp = 1.0;
    let freq = 1.0;
    let maxAmp = 0;
    for (let i = 0; i < octaves; i++) {
      sum += this.valueNoise2D(x * freq, z * freq) * amp;
      maxAmp += amp;
      freq *= lacunarity;
      amp *= gain;
    }
    return sum / maxAmp;
  }

  // Ridged Multi-fractal Noise for sharp ridge formations & canyon spines
  ridgedNoise2D(x, z, octaves = 5, lacunarity = 2.0, gain = 0.5) {
    let sum = 0;
    let amp = 1.0;
    let freq = 1.0;
    let maxAmp = 0;
    for (let i = 0; i < octaves; i++) {
      let n = this.valueNoise2D(x * freq, z * freq);
      n = 1.0 - Math.abs(n * 2.0 - 1.0); // sharp peaks
      n = n * n; // sharper ridges
      sum += n * amp;
      maxAmp += amp;
      freq *= lacunarity;
      amp *= gain;
    }
    return sum / maxAmp;
  }

  // Domain warping for natural geological strata & river meandering
  warp2D(x, z, scale = 0.05, intensity = 4.0) {
    const qx = this.valueNoise2D(x * scale, z * scale);
    const qz = this.valueNoise2D(x * scale + 5.2, z * scale + 1.3);
    return [
      x + qx * intensity,
      z + qz * intensity
    ];
  }
}

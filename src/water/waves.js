import * as THREE from 'three';

export const NUM_WAVES = 12;
const G = 9.81;

export const WAVE_PRESETS = {
  Calm: { height: 0.35, wavelength: 22, choppiness: 0.5, shore: 0.35, spread: 0.9 },
  Moderate: { height: 1.1, wavelength: 42, choppiness: 0.7, shore: 0.6, spread: 1.0 },
  Rough: { height: 2.2, wavelength: 62, choppiness: 0.85, shore: 0.9, spread: 1.1 },
  Storm: { height: 3.8, wavelength: 95, choppiness: 0.95, shore: 1.2, spread: 1.25 },
};

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Directional Gerstner spectrum. The exact same math runs in GLSL (chunks.js WAVES)
 * so CPU queries (boat buoyancy, spray triggers) match the rendered surface.
 */
export class Waves {
  constructor(terrain) {
    this.terrain = terrain;
    this.params = {
      preset: 'Moderate',
      height: 1.1,
      wavelength: 42,
      choppiness: 0.7,
      windDir: 35,
      spread: 1.0,
      speed: 1.0,
      shoreWaves: true,
      shoreAmp: 0.6,
    };
    this.a = new Float32Array(NUM_WAVES * 4); // dirX, dirZ, k, A
    this.b = new Float32Array(NUM_WAVES * 4); // omega, phase, Q, 0
    this.uniforms = {
      uWaveA: { value: Array.from({ length: NUM_WAVES }, () => new THREE.Vector4()) },
      uWaveB: { value: Array.from({ length: NUM_WAVES }, () => new THREE.Vector4()) },
      uShore: { value: new THREE.Vector4() },
      uTime: { value: 0 },
    };
    this.rebuild();
  }

  applyPreset(name) {
    const p = WAVE_PRESETS[name];
    if (!p) return;
    Object.assign(this.params, { preset: name, height: p.height, wavelength: p.wavelength, choppiness: p.choppiness, shoreAmp: p.shore, spread: p.spread });
    this.rebuild();
  }

  get windAngle() { return THREE.MathUtils.degToRad(this.params.windDir); }
  get windVector() { const a = this.windAngle; return new THREE.Vector2(Math.cos(a), Math.sin(a)); }

  rebuild() {
    const p = this.params;
    const rand = mulberry32(1337);
    const wind = this.windAngle;
    const lambdas = [], weights = [];
    let wsum = 0;
    for (let i = 0; i < NUM_WAVES; i++) {
      // Swell only: the FFT cascades (fft.js) carry the wind sea and all short waves
      const l = p.wavelength * Math.pow(0.9, i) * (0.88 + 0.24 * rand());
      lambdas.push(l);
      const w = Math.pow(l, 0.85);
      weights.push(w); wsum += w;
    }
    let steepSum = 0;
    for (let i = 0; i < NUM_WAVES; i++) {
      const l = lambdas[i];
      const k = (2 * Math.PI) / l;
      let A = (p.height * 0.5 * weights[i]) / wsum * 2.0;
      A = Math.min(A, 0.018 * l); // keep individual crests below breaking steepness
      const spreadI = p.spread * (0.35 + 0.65 * (i / (NUM_WAVES - 1)));
      const ang = wind + (rand() - 0.5) * 2 * spreadI;
      this.a[i * 4 + 0] = Math.cos(ang);
      this.a[i * 4 + 1] = Math.sin(ang);
      this.a[i * 4 + 2] = k;
      this.a[i * 4 + 3] = A;
      this.b[i * 4 + 0] = Math.sqrt(G * k) * p.speed;
      this.b[i * 4 + 1] = rand() * Math.PI * 2;
      steepSum += k * A;
    }
    // Choppiness limited so the surface never self-intersects (sum Q*k*A < 1)
    const Q = Math.min(p.choppiness, 0.92 / Math.max(steepSum, 1e-4));
    for (let i = 0; i < NUM_WAVES; i++) this.b[i * 4 + 2] = Q;
    this.Q = Q;

    for (let i = 0; i < NUM_WAVES; i++) {
      this.uniforms.uWaveA.value[i].fromArray(this.a, i * 4);
      this.uniforms.uWaveB.value[i].fromArray(this.b, i * 4);
    }
    const shoreLambda = 14 + p.wavelength * 0.15;
    const ks = (2 * Math.PI) / shoreLambda;
    this.shore = { amp: p.shoreAmp, k: ks, omega: Math.sqrt(G * ks * 0.6) * p.speed, on: p.shoreWaves ? 1 : 0 };
    this.uniforms.uShore.value.set(this.shore.amp, this.shore.k, this.shore.omega, this.shore.on);
    if (this.onRebuild) this.onRebuild();
  }

  setTime(t) { this.time = t; this.uniforms.uTime.value = t; }

  // Gerstner displacement at undisplaced point (bx, bz)
  disp(bx, bz, out) {
    const t = this.time || 0;
    let dx = 0, dy = 0, dz = 0;
    for (let i = 0; i < NUM_WAVES; i++) {
      const o = i * 4;
      const DX = this.a[o], DZ = this.a[o + 1], k = this.a[o + 2], A = this.a[o + 3];
      const th = k * (DX * bx + DZ * bz) - this.b[o] * t + this.b[o + 1];
      const c = Math.cos(th), s = Math.sin(th), Q = this.b[o + 2];
      dx += Q * A * DX * c; dz += Q * A * DZ * c; dy += A * s;
    }
    out.x = dx; out.y = dy; out.z = dz;
    return out;
  }

  // Jacobian of the horizontal displacement (folding -> whitecaps)
  jacobian(bx, bz) {
    const t = this.time || 0;
    let jxx = 0, jzz = 0, jxz = 0;
    for (let i = 0; i < NUM_WAVES; i++) {
      const o = i * 4;
      const DX = this.a[o], DZ = this.a[o + 1], k = this.a[o + 2], A = this.a[o + 3], Q = this.b[o + 2];
      const s = Math.sin(k * (DX * bx + DZ * bz) - this.b[o] * t + this.b[o + 1]);
      const kA = Q * k * A * s;
      jxx += kA * DX * DX; jzz += kA * DZ * DZ; jxz += kA * DX * DZ;
    }
    return (1 - jxx) * (1 - jzz) - jxz * jxz;
  }

  static atten(groundH) {
    const x = Math.min(Math.max(-groundH / 16, 0), 1);
    const s = x * x * (3 - 2 * x);
    return 0.1 + 0.9 * s;
  }

  shoreHeight(x, z, d) {
    if (!this.shore.on) return { h: 0, crest: 0 };
    const sm = (e0, e1, v) => { const t = Math.min(Math.max((v - e0) / (e1 - e0), 0), 1); return t * t * (3 - 2 * t); };
    const env = sm(60, 14, d) * sm(-1.5, 6, d);
    const vari = 0.7 + 0.3 * Math.sin(x * 0.021 + z * 0.013 + (this.time || 0) * 0.11);
    const ph = this.shore.k * d + this.shore.omega * (this.time || 0);
    const s = 0.5 + 0.5 * Math.sin(ph);
    const prof = s * s * s;
    return { h: this.shore.amp * env * vari * prof, crest: prof * env };
  }

  /** Surface height at world (x, z), inverting the horizontal Gerstner displacement. */
  heightAt(x, z) {
    const tmp = this._tmp || (this._tmp = { x: 0, y: 0, z: 0 });
    const ground = this.terrain ? this.terrain.sample(x, z) : { h: -50, d: 500 };
    const att = Waves.atten(ground.h);
    let bx = x, bz = z;
    for (let i = 0; i < 4; i++) {
      this.disp(bx, bz, tmp);
      bx = x - tmp.x * att; bz = z - tmp.z * att;
    }
    this.disp(bx, bz, tmp);
    return tmp.y * att + this.shoreHeight(x, z, ground.d).h;
  }

  baseAt(x, z) {
    const tmp = this._tmp2 || (this._tmp2 = { x: 0, y: 0, z: 0 });
    const ground = this.terrain ? this.terrain.sample(x, z) : { h: -50 };
    const att = Waves.atten(ground.h);
    let bx = x, bz = z;
    for (let i = 0; i < 4; i++) { this.disp(bx, bz, tmp); bx = x - tmp.x * att; bz = z - tmp.z * att; }
    return { x: bx, z: bz, att };
  }

  /** Approximate horizontal orbital velocity of the surface at (x, z) (for spray direction). */
  surfaceVelocity(x, z, out) {
    const t = this.time || 0;
    let vx = 0, vy = 0, vz = 0;
    for (let i = 0; i < NUM_WAVES; i++) {
      const o = i * 4;
      const DX = this.a[o], DZ = this.a[o + 1], k = this.a[o + 2], A = this.a[o + 3], w = this.b[o], Q = this.b[o + 2];
      const th = k * (DX * x + DZ * z) - w * t + this.b[o + 1];
      const s = Math.sin(th), c = Math.cos(th);
      vx += Q * A * DX * w * s; vz += Q * A * DZ * w * s; vy += -A * w * c;
    }
    out.set(vx, vy, vz);
    return out;
  }
}

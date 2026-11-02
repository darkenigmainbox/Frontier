import * as THREE from 'three';
import { rawMaterial } from '../core/gpu.js';
import { fftShaders } from '../shaders/fft.js';

const G = 9.81;

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Multi-cascade Tessendorf FFT ocean (JONSWAP spectrum, frequency dependent directional spreading).
 *
 * The long swell stays analytic (Gerstner, `waves.js`) so CPU queries such as boat buoyancy match the
 * rendered surface; the FFT supplies the wind sea and all the small scale chop. Tile sizes are mutually
 * non-commensurate and each cascade only carries its own wavenumber band, so the sum never repeats
 * visibly; a low-frequency amplitude modulation in the shaders hides any remaining periodicity.
 */
export class OceanFFT {
  constructor(gpu, waves, N = 256) {
    this.gpu = gpu;
    this.waves = waves;
    this.N = N;
    this.sizes = [137.0, 31.7, 7.3];
    this.params = {
      enabled: true,
      share: 0.5,       // FFT wind-sea height as a fraction of the sea-state height
      peak: 0.32,       // wind-sea peak wavelength as a fraction of the swell wavelength
      choppiness: 1.0,
      variation: 0.45,  // large-scale amplitude modulation (anti-tiling)
    };
    const floatTex = (data) => {
      const t = new THREE.DataTexture(data, N, N, THREE.RGBAFormat, THREE.FloatType);
      t.minFilter = t.magFilter = THREE.NearestFilter;
      t.needsUpdate = true;
      return t;
    };
    this.h0 = this.sizes.map(() => floatTex(new Float32Array(N * N * 4)));
    const pingOpts = {
      type: THREE.FloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter,
      depthBuffer: false, stencilBuffer: false, count: 2, generateMipmaps: false,
    };
    this.ping = [new THREE.WebGLRenderTarget(N, N, pingOpts), new THREE.WebGLRenderTarget(N, N, pingOpts)];
    const aniso = gpu.renderer.capabilities.getMaxAnisotropy();
    this.out = this.sizes.map(() => {
      const rt = new THREE.WebGLRenderTarget(N, N, {
        type: THREE.HalfFloatType, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter,
        wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping,
        depthBuffer: false, stencilBuffer: false, count: 2, generateMipmaps: true,
      });
      for (const t of rt.textures) {
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.minFilter = THREE.LinearMipmapLinearFilter;
        t.magFilter = THREE.LinearFilter;
        t.generateMipmaps = true;
        t.anisotropy = Math.min(8, aniso);
      }
      return rt;
    });

    this.specMat = rawMaterial(fftShaders.spectrum, { uH0: { value: null }, uTime: { value: 0 }, uL: { value: 1 }, uChop: { value: 1 } });
    this.passMat = rawMaterial(fftShaders.pass, { uSrc0: { value: null }, uSrc1: { value: null }, uSub: { value: 2 }, uHoriz: { value: 1 } });
    this.finMat = rawMaterial(fftShaders.finalize, { uSrc0: { value: null }, uSrc1: { value: null } });

    // Shared with every shader that includes the WAVES chunk
    Object.assign(waves.uniforms, {
      uFFTDisp0: { value: this.out[0].textures[0] }, uFFTSlope0: { value: this.out[0].textures[1] },
      uFFTDisp1: { value: this.out[1].textures[0] }, uFFTSlope1: { value: this.out[1].textures[1] },
      uFFTDisp2: { value: this.out[2].textures[0] }, uFFTSlope2: { value: this.out[2].textures[1] },
      uFFTSize: { value: new THREE.Vector3(...this.sizes) },
      uFFTParams: { value: new THREE.Vector4(1, this.params.variation, N, 0) },
    });
    this.uniforms = waves.uniforms;
    waves.onRebuild = () => this.buildSpectrum();
    this.buildSpectrum();
  }

  /** Initial spectrum h0(k) for every cascade (CPU, only when the sea state changes). */
  buildSpectrum() {
    const N = this.N, p = this.params, wp = this.waves.params;
    const rand = mulberry32(90210);
    const gauss = () => {
      const u = Math.max(rand(), 1e-9), v = rand();
      const r = Math.sqrt(-2 * Math.log(u));
      return [r * Math.cos(2 * Math.PI * v), r * Math.sin(2 * Math.PI * v)];
    };
    const wind = this.waves.windAngle;
    const lambdaP = Math.max(2, wp.wavelength * p.peak);
    const kp = (2 * Math.PI) / lambdaP;
    const omegaP = Math.sqrt(G * kp);
    const gamma = 3.3;
    // Directional spreading exponent: narrow near the peak, broader away from it (Mitsuyasu)
    const sPeak = 10 / (0.4 + Math.max(wp.spread, 0.05) * 1.6);
    const normCache = new Map();
    const dirNorm = (s) => {
      const key = Math.round(s * 10);
      let v = normCache.get(key);
      if (v === undefined) {
        let sum = 0; const n = 256;
        for (let i = 0; i < n; i++) sum += Math.pow(Math.abs(Math.cos((-Math.PI + (i + 0.5) * 2 * Math.PI / n) / 2)), 2 * key / 10);
        v = 1 / (sum * 2 * Math.PI / n);
        normCache.set(key, v);
      }
      return v;
    };
    const kMax = (2 * Math.PI) / 0.06;
    const bands = this.sizes.map(() => [0, 0]);
    // band edges: cascade i carries [edge(i), edge(i+1)), edge(i+1) = 6 * 2pi / L(i+1)
    for (let i = 0; i < this.sizes.length; i++) {
      bands[i][0] = i === 0 ? 0 : (2 * Math.PI / this.sizes[i]) * 6;
      bands[i][1] = i === this.sizes.length - 1 ? Infinity : (2 * Math.PI / this.sizes[i + 1]) * 6;
    }

    const raw = [];
    let variance = 0;
    for (let c = 0; c < this.sizes.length; c++) {
      const L = this.sizes[c];
      const dk = (2 * Math.PI) / L;
      const h0 = new Float32Array(N * N * 2);
      for (let j = 0; j < N; j++) {
        const nz = j < N / 2 ? j : j - N;
        for (let i = 0; i < N; i++) {
          const nx = i < N / 2 ? i : i - N;
          const g = gauss();
          const kx = nx * dk, kz = nz * dk;
          const k = Math.hypot(kx, kz);
          let amp = 0;
          if (k > 1e-6 && k >= bands[c][0] && k < bands[c][1]) {
            const w = Math.sqrt(G * k);
            const sigma = w <= omegaP ? 0.07 : 0.09;
            const r = Math.exp(-((w - omegaP) ** 2) / (2 * sigma * sigma * omegaP * omegaP));
            const Sw = Math.pow(w, -5) * Math.exp(-1.25 * Math.pow(omegaP / w, 4)) * Math.pow(gamma, r);
            const ratio = w / omegaP;
            const s = Math.min(Math.max(ratio < 1 ? sPeak * Math.pow(ratio, 5) : sPeak * Math.pow(ratio, -2.5), 0.6), 40);
            const dth = Math.atan2(kz, kx) - wind;
            const D = dirNorm(s) * Math.pow(Math.abs(Math.cos(dth / 2)), 2 * Math.round(s * 10) / 10);
            const Sk = Sw * (G / (2 * w)) / k * D * Math.exp(-((k / kMax) ** 2));
            amp = Math.sqrt(Sk * dk * dk / 2);
          }
          const o = (j * N + i) * 2;
          h0[o] = g[0] * amp; h0[o + 1] = g[1] * amp;
          variance += (h0[o] * h0[o] + h0[o + 1] * h0[o + 1]) * 2;
        }
      }
      raw.push(h0);
    }
    // Normalise to the requested significant wave height (Hs = 4 sigma)
    const Hs = Math.max(wp.height * p.share, 0.0);
    const scale = variance > 0 ? (Hs / 4) / Math.sqrt(variance) : 0;
    for (let c = 0; c < this.sizes.length; c++) {
      const h0 = raw[c], tex = this.h0[c], d = tex.image.data;
      for (let j = 0; j < N; j++) {
        for (let i = 0; i < N; i++) {
          const o = (j * N + i) * 2, m = (((N - j) % N) * N + ((N - i) % N)) * 2, q = (j * N + i) * 4;
          d[q] = h0[o] * scale; d[q + 1] = h0[o + 1] * scale;
          d[q + 2] = h0[m] * scale; d[q + 3] = -h0[m + 1] * scale; // conj(h0(-k))
        }
      }
      tex.needsUpdate = true;
    }
    this.hs = Hs;
  }

  update(time) {
    const p = this.params;
    this.uniforms.uFFTParams.value.set(p.enabled ? 1 : 0, p.variation, this.N, 0);
    if (!p.enabled) return;
    const g = this.gpu, N = this.N, steps = Math.log2(N);
    const t = time * this.waves.params.speed;
    for (let c = 0; c < this.sizes.length; c++) {
      const su = this.specMat.uniforms;
      su.uH0.value = this.h0[c]; su.uTime.value = t; su.uL.value = this.sizes[c]; su.uChop.value = p.choppiness;
      g.run(this.specMat, this.ping[0]);
      let cur = 0;
      const pu = this.passMat.uniforms;
      for (const horiz of [1, 0]) {
        pu.uHoriz.value = horiz;
        for (let s = 1; s <= steps; s++) {
          pu.uSub.value = Math.pow(2, s);
          pu.uSrc0.value = this.ping[cur].textures[0];
          pu.uSrc1.value = this.ping[cur].textures[1];
          g.run(this.passMat, this.ping[1 - cur]);
          cur = 1 - cur;
        }
      }
      this.finMat.uniforms.uSrc0.value = this.ping[cur].textures[0];
      this.finMat.uniforms.uSrc1.value = this.ping[cur].textures[1];
      g.run(this.finMat, this.out[c]);
    }
  }
}

// ---------------------------------------------------------------------------
// WaterSim — the three grid solvers + unified output + advected foam grid.
//
//   Mode 0  HEIGHTFIELD WAVE EQUATION  (Fluid-Ninja style 2.5D ripples)
//   Mode 1  SHALLOW WATER EQUATIONS    (depth+momentum, shoreline physics)
//   Mode 2  SPECTRAL OCEAN             (24-wave Phillips-like spectrum baked
//                                       to the grid + wave-eq interaction
//                                       layer, like AAA FFT+heightfield stacks)
//
// Every solver writes the same OUTPUT texture (height, velocity, foam source)
// covering the whole world, and the foam grid is advected by that velocity —
// so the water mesh, foam, GPU particles and boat all stay in perfect sync
// no matter which solver is live.
// ---------------------------------------------------------------------------
import * as THREE from 'three';
import { WORLD, worldToUv } from './config.js';
import {
  FS_VERT, WAVE_FRAG, SWE_INIT_FRAG, SWE_FRAG, SPECTRAL_FRAG, OUTPUT_FRAG, FOAM_FRAG,
} from './shaders.js';

const MAX_SPLATS = 16;

function makeRT(res) {
  return new THREE.WebGLRenderTarget(res, res, {
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
    depthBuffer: false,
    stencilBuffer: false,
  });
}

export class WaterSim {
  constructor(renderer, { terrainTex, noiseTex, res = 256 }) {
    this.renderer = renderer;
    this.terrainTex = terrainTex;
    this.noiseTex = noiseTex;
    this.res = res;
    this.mode = 0;
    this.splatQueue = [];

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null);
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);

    // shared splat uniforms (same objects plugged into every material)
    this.splatUniforms = {
      uSplats: { value: Array.from({ length: MAX_SPLATS }, () => new THREE.Vector4(0, 0, 0.01, 0)) },
      uSplatCount: { value: 0 },
    };
    this.common = {
      uWorld: { value: WORLD },
      uTexel: { value: 1 / res },
      uTerrain: { value: terrainTex },
    };

    const mat = (frag, extra) => new THREE.ShaderMaterial({
      vertexShader: FS_VERT,
      fragmentShader: frag,
      uniforms: { ...this.common, ...this.splatUniforms, ...extra },
      depthTest: false, depthWrite: false,
    });

    this.waveMat = mat(WAVE_FRAG, {
      uState: { value: null },
      uDamping: { value: 0.996 },
      uWaveSpeed: { value: 1.9 },
    });
    this.sweInitMat = mat(SWE_INIT_FRAG, {});
    this.sweMat = mat(SWE_FRAG, {
      uState: { value: null },
      uDt: { value: 1 / 60 },
      uGravity: { value: 9.81 },
      uVelDamp: { value: 0.996 },
      uWindXZ: { value: new THREE.Vector2(1, 0) },
    });
    this.spectralMat = mat(SPECTRAL_FRAG, {
      uTime: { value: 0 },
      uAmp: { value: 1.2 },
      uWindDir: { value: 0.6 },
      uWindSpeed: { value: 6 },
      uChop: { value: 0.7 },
    });
    this.outputMat = mat(OUTPUT_FRAG, {
      uState: { value: null },
      uState2: { value: null },
      uMode: { value: 0 },
      uFoamGain: { value: 1 },
    });
    this.foamMat = mat(FOAM_FRAG, {
      uPrevFoam: { value: null },
      uSim: { value: null },
      uNoise: { value: noiseTex },
      uTime: { value: 0 },
      uDt: { value: 1 / 60 },
      uDecay: { value: 0.97 },
      uShoreFoamOn: { value: 1 },
      uWindXZ: { value: new THREE.Vector2(1, 0) },
    });

    this.buildTargets();
    this.reset();
  }

  buildTargets() {
    const r = this.res;
    const disposables = [this.waveA, this.waveB, this.sweA, this.sweB, this.spectralRT, this.outputRT, this.foamA, this.foamB];
    disposables.forEach((t) => t && t.dispose());
    this.waveA = makeRT(r); this.waveB = makeRT(r);
    this.sweA = makeRT(r); this.sweB = makeRT(r);
    this.spectralRT = makeRT(r);
    this.outputRT = makeRT(r);
    this.foamA = makeRT(r); this.foamB = makeRT(r);
    this.common.uTexel.value = 1 / r;
    // CPU readback cache (boat buoyancy samples the real GPU surface)
    this.readBuf = new Uint16Array(r * r * 4);
    this.heightCache = new Float32Array(r * r);
    this.cacheValid = false;
  }

  pass(material, target) {
    this.quad.material = material;
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(null);
  }

  reset() {
    // SWE starts from "sea at rest" depth; everything else from cleared targets
    this.pass(this.sweInitMat, this.sweA);
    this.pass(this.sweInitMat, this.sweB);
    for (const rt of [this.waveA, this.waveB, this.foamA, this.foamB]) {
      this.renderer.setRenderTarget(rt);
      this.renderer.setClearColor(0x000000, 0);
      this.renderer.clear(true, false, false);
    }
    this.renderer.setRenderTarget(null);
    this.cacheValid = false;
  }

  setMode(mode) {
    this.mode = mode;
    this.outputMat.uniforms.uMode.value = mode;
    if (mode === 1) { this.pass(this.sweInitMat, this.sweA); this.pass(this.sweInitMat, this.sweB); }
  }

  setResolution(res) {
    if (res === this.res) return;
    this.res = res;
    this.buildTargets();
    this.reset();
    if (this.mode === 1) this.setMode(1);
  }

  /** Queue a radial impulse. world coords, radius in metres, strength ~ height. */
  addSplat(x, z, radius, strength) {
    if (x < -WORLD / 2 || x > WORLD / 2 || z < -WORLD / 2 || z > WORLD / 2) return;
    this.splatQueue.push({ x, z, radius, strength });
  }

  flushSplats(intoFoamOnly = false) {
    const q = this.splatQueue;
    // keep the strongest if the queue overflows
    q.sort((a, b) => Math.abs(b.strength) - Math.abs(a.strength));
    const n = Math.min(q.length, MAX_SPLATS);
    const arr = this.splatUniforms.uSplats.value;
    for (let i = 0; i < n; i++) {
      const [u, v] = worldToUv(q[i].x, q[i].z);
      arr[i].set(u, v, q[i].radius / WORLD, intoFoamOnly ? q[i].strength * 0.0 : q[i].strength);
      if (intoFoamOnly) arr[i].w = q[i].strength; // foam pass re-reads same array
    }
    this.splatUniforms.uSplatCount.value = n;
    this._foamSplatCount = n;
    this.splatQueue.length = 0;
  }

  stepWave(substeps, withSplats) {
    for (let i = 0; i < substeps; i++) {
      if (!withSplats || i > 0) this.splatUniforms.uSplatCount.value = 0;
      this.waveMat.uniforms.uState.value = this.waveA.texture;
      this.pass(this.waveMat, this.waveB);
      [this.waveA, this.waveB] = [this.waveB, this.waveA];
    }
    this.splatUniforms.uSplatCount.value = this._foamSplatCount || 0;
  }

  stepSWE(dt, substeps) {
    const sdt = Math.min(dt, 1 / 30) / substeps;
    this.sweMat.uniforms.uDt.value = sdt;
    for (let i = 0; i < substeps; i++) {
      if (i > 0) this.splatUniforms.uSplatCount.value = 0;
      this.sweMat.uniforms.uState.value = this.sweA.texture;
      this.pass(this.sweMat, this.sweB);
      [this.sweA, this.sweB] = [this.sweB, this.sweA];
    }
    this.splatUniforms.uSplatCount.value = this._foamSplatCount || 0;
  }

  /**
   * Advance everything one frame.
   * p: { damping, waveSpeed, spectralAmp, chop, windDirRad, windSpeed,
   *      windVector(THREE.Vector2), foamGain, foamDecay, shoreFoam,
   *      runFoam(bool), timeScale }
   */
  update(dt, time, p) {
    this.flushSplats();
    const wind = p.windVector;

    this.waveMat.uniforms.uDamping.value = p.damping;
    this.waveMat.uniforms.uWaveSpeed.value = p.waveSpeed;
    this.sweMat.uniforms.uWindXZ.value.copy(wind);
    this.spectralMat.uniforms.uTime.value = time;
    this.spectralMat.uniforms.uAmp.value = p.spectralAmp;
    this.spectralMat.uniforms.uWindDir.value = p.windDirRad;
    this.spectralMat.uniforms.uWindSpeed.value = p.windSpeed;
    this.spectralMat.uniforms.uChop.value = p.chop;

    if (this.mode === 0) {
      this.stepWave(3, true);
      this.outputMat.uniforms.uState.value = this.waveA.texture;
      this.outputMat.uniforms.uState2.value = this.waveA.texture;
    } else if (this.mode === 1) {
      this.stepSWE(dt * p.timeScale, 3);
      this.outputMat.uniforms.uState.value = this.sweA.texture;
      this.outputMat.uniforms.uState2.value = this.sweA.texture;
    } else {
      this.stepWave(3, true);                                  // interaction ripples
      this.pass(this.spectralMat, this.spectralRT);           // ocean spectrum
      this.outputMat.uniforms.uState.value = this.spectralRT.texture;
      this.outputMat.uniforms.uState2.value = this.waveA.texture;
    }

    this.outputMat.uniforms.uFoamGain.value = p.foamGain;
    this.pass(this.outputMat, this.outputRT);

    if (p.runFoam) {
      const f = this.foamMat.uniforms;
      f.uPrevFoam.value = this.foamA.texture;
      f.uSim.value = this.outputRT.texture;
      f.uTime.value = time;
      f.uDt.value = Math.min(dt * p.timeScale, 1 / 30);
      f.uDecay.value = p.foamDecay;
      f.uShoreFoamOn.value = p.shoreFoam ? 1 : 0;
      f.uWindXZ.value.copy(wind);
      this.pass(this.foamMat, this.foamB);
      [this.foamA, this.foamB] = [this.foamB, this.foamA];
    }
    // splats are one-frame events
    this.splatUniforms.uSplatCount.value = 0;
    this._foamSplatCount = 0;
  }

  get outputTexture() { return this.outputRT.texture; }
  get foamTexture() { return this.foamA.texture; }

  /** Throttled GPU->CPU copy of the surface so floating bodies ride the sim. */
  refreshHeightCache() {
    try {
      this.renderer.readRenderTargetPixels(this.outputRT, 0, 0, this.res, this.res, this.readBuf);
      const fromHalf = THREE.DataUtils.fromHalfFloat;
      const n = this.res * this.res;
      for (let i = 0; i < n; i++) this.heightCache[i] = fromHalf(this.readBuf[i * 4]);
      this.cacheValid = true;
    } catch (e) {
      this.cacheValid = false;
    }
  }

  /** Bilinear sample of the last readback (0 when unavailable). */
  sampleHeightCached(x, z) {
    if (!this.cacheValid) return 0;
    const r = this.res;
    const [u, v] = worldToUv(x, z);
    if (u < 0 || u > 1 || v < 0 || v > 1) return 0;
    const fx = u * (r - 1), fy = v * (r - 1);
    const ix = Math.min(Math.floor(fx), r - 2), iy = Math.min(Math.floor(fy), r - 2);
    const tx = fx - ix, ty = fy - iy;
    const c = this.heightCache;
    const a = c[iy * r + ix], b = c[iy * r + ix + 1];
    const d = c[(iy + 1) * r + ix], e = c[(iy + 1) * r + ix + 1];
    return a + (b - a) * tx + (d - a) * ty + (a - b - d + e) * tx * ty;
  }
}

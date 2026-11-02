import * as THREE from 'three';
import { rawMaterial, additive, vertexCountGeometry } from '../core/gpu.js';
import { rippleShaders } from '../shaders/ripple.js';

/**
 * Fit a radially symmetric 13x13 kernel whose discrete Fourier response matches
 * |k| (the vertical-derivative operator of linear deep-water waves). The classic
 * truncated iWave kernel has a large DC offset and negative high-frequency lobes
 * (unstable), so we solve a small least-squares problem instead.
 */
export function fitIWaveKernel(P = 6) {
  const classes = [];
  for (let i = 0; i <= P; i++) for (let j = 0; j <= i; j++) classes.push([i, j]);
  const orbits = classes.map(([a, b]) => {
    const set = new Map();
    for (const [x, y] of [[a, b], [b, a]]) for (const sx of [-1, 1]) for (const sy of [-1, 1]) set.set(`${sx * x},${sy * y}`, [sx * x, sy * y]);
    return [...set.values()];
  });
  const resp = (c, kx, ky) => { let s = 0; for (const [x, y] of orbits[c]) s += Math.cos(kx * x + ky * y); return s; };
  const n = classes.length;
  const A = Array.from({ length: n }, () => new Float64Array(n + 1));
  const row = new Float64Array(n);
  for (let r = 0.02; r <= Math.PI; r += 0.04) {
    for (let t = 0; t <= Math.PI / 4 + 1e-6; t += Math.PI / 32) {
      const kx = r * Math.cos(t), ky = r * Math.sin(t);
      const w = r < 2.4 ? 1 : 0.25;
      for (let i = 0; i < n; i++) row[i] = resp(i, kx, ky);
      for (let i = 0; i < n; i++) {
        A[i][n] += w * row[i] * r;
        for (let j = 0; j < n; j++) A[i][j] += w * row[i] * row[j];
      }
    }
  }
  for (let i = 0; i < n; i++) A[i][i] += 1e-6;
  for (let i = 0; i < n; i++) { // Gauss-Jordan
    let p = i;
    for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[p][i])) p = r;
    [A[i], A[p]] = [A[p], A[i]];
    for (let r = 0; r < n; r++) {
      if (r === i) continue;
      const f = A[r][i] / A[i][i];
      for (let c = i; c <= n; c++) A[r][c] -= f * A[i][c];
    }
  }
  const kernel = new Float32Array(49);
  classes.forEach(([a, b], idx) => {
    const w = A[idx][n] / A[idx][idx];
    kernel[a * 7 + b] = w;
    kernel[b * 7 + a] = w;
  });
  return kernel;
}

/**
 * 2.5D interactive water: height-field ripples (iWave / wave equation) + foam grid.
 * The grid is world-anchored and scrolls (whole texels) to stay centred on the
 * focus point, so it behaves like one seamless global field.
 */
export class RippleSim {
  constructor(gpu, shared, terrainUniforms) {
    this.gpu = gpu;
    this.res = 512;
    this.params = {
      enabled: true,
      solver: 'iWave (dispersive)',
      size: 96,
      damping: 0.12,
      waveSpeed: 3.0,
      boatWake: 1.0,
      impactStrength: 1.0,
      foamGrid: true,
      foamDecay: 6,
      steepFoam: 2.0,
      boatFoam: 1.0,
      foamFlow: 0.6,
    };
    const filter = gpu.floatLinear ? THREE.LinearFilter : THREE.NearestFilter;
    this.state = [0, 1].map(() => gpu.target(this.res, this.res, { type: THREE.FloatType, filter }));
    this.foam = [0, 1].map(() => gpu.target(this.res, this.res, { type: THREE.HalfFloatType, filter: THREE.LinearFilter }));
    this.impulse = gpu.target(this.res, this.res, { type: THREE.HalfFloatType, filter: THREE.LinearFilter });
    this.scratch = gpu.target(this.res, this.res, { type: THREE.FloatType, filter });
    this.cur = 0; this.fcur = 0;
    for (const t of [...this.state, ...this.foam, this.impulse]) gpu.clear(t);

    this.origin = new THREE.Vector2(-this.params.size / 2, -this.params.size / 2);
    this.uniforms = {
      uRipple: { value: this.state[0].texture },
      uFoamGrid: { value: this.foam[0].texture },
      uRippleXf: { value: new THREE.Vector4(this.origin.x, this.origin.y, this.params.size, 1) },
    };
    this.kernel = fitIWaveKernel();
    this.drops = [];
    this.accum = 0;

    const boatU = () => ({
      uBoatXZ: { value: new THREE.Vector2() },
      uBoatPrevXZ: { value: new THREE.Vector2() },
      uBoatDir: { value: new THREE.Vector2(1, 0) },
      uBoatPrevDir: { value: new THREE.Vector2(1, 0) },
      uBoatShape: { value: new THREE.Vector3(3.3, 1.15, 0.55) },
      uBoatStrength: { value: 1 },
      uBoatSpeed: { value: 0 },
      uDrops: { value: Array.from({ length: 8 }, () => new THREE.Vector4()) },
      uDropCount: { value: 0 },
    });
    this.stepMat = rawMaterial(rippleShaders.rippleStep, {
      ...terrainUniforms, ...this.uniforms, ...boatU(),
      uState: { value: null }, uImpulse: { value: this.impulse.texture },
      uKernel: { value: this.kernel }, uDt: { value: 1 / 60 }, uGdt2: { value: 0 }, uAlpha: { value: 0.1 },
      uC2: { value: 0.1 }, uDamp: { value: 0.01 }, uSolver: { value: 0 }, uUseImpulse: { value: 1 },
    });
    this.foamMat = rawMaterial(rippleShaders.foamStep, {
      ...terrainUniforms, ...shared.waves, ...this.uniforms, ...boatU(),
      uCrestThresh: { value: 0.55 }, uCrestFoam: { value: 0.7 },
      uFoamPrev: { value: null }, uState: { value: null }, uImpulse: { value: this.impulse.texture },
      uDt: { value: 1 / 60 }, uDecay: { value: 9 }, uSteepFoam: { value: 2 }, uSteepThresh: { value: 0.12 },
      uWindDrift: { value: new THREE.Vector2() }, uRippleFlow: { value: 0.6 }, uBoatFoam: { value: 1 },
      uUseImpulse: { value: 1 }, uFoamTime: { value: 0 },
    });
    this.shiftMat = rawMaterial(rippleShaders.gridShift, { uSrc: { value: null }, uShift: { value: new THREE.Vector2() } });
    this.splatMat = rawMaterial(rippleShaders.impulseSplat, {
      ...this.uniforms,
      uPos: { value: null }, uVel: { value: null }, uPTex: { value: new THREE.Vector2() },
      uImpulseScale: { value: 0.0035 }, uFoamPerHit: { value: 0.05 },
    }, additive);
    this.splatScene = new THREE.Scene();
    this.splatPoints = null;
  }

  get texel() { return this.params.size / this.res; }

  resize(size) {
    this.params.size = size;
    for (const t of [...this.state, ...this.foam]) this.gpu.clear(t);
    this.uniforms.uRippleXf.value.z = size;
    this._focusInit = false;
  }

  setFocus(x, z) {
    const tx = this.texel;
    const ox = Math.floor((x - this.params.size / 2) / tx) * tx;
    const oz = Math.floor((z - this.params.size / 2) / tx) * tx;
    if (!this._focusInit) { this.origin.set(ox, oz); this._focusInit = true; }
    const sx = Math.round((ox - this.origin.x) / tx), sz = Math.round((oz - this.origin.y) / tx);
    if (sx !== 0 || sz !== 0) {
      if (Math.abs(sx) >= this.res || Math.abs(sz) >= this.res) {
        for (const t of [...this.state, ...this.foam]) this.gpu.clear(t);
      } else {
        this.shift(this.state, 'cur', sx, sz);
        this.shift(this.foam, 'fcur', sx, sz);
      }
      this.origin.set(this.origin.x + sx * tx, this.origin.y + sz * tx);
    }
    this.uniforms.uRippleXf.value.set(this.origin.x, this.origin.y, this.params.size, this.params.enabled ? 1 : 0);
  }

  shift(pair, key, sx, sz) {
    this.shiftMat.uniforms.uSrc.value = pair[this[key]].texture;
    this.shiftMat.uniforms.uShift.value.set(sx, sz);
    this.gpu.run(this.shiftMat, pair[1 - this[key]]);
    this[key] = 1 - this[key];
  }

  addDrop(x, z, radius, strength) {
    if (this.drops.length < 8) this.drops.push(new THREE.Vector4(x, z, radius, strength));
  }

  // Particle impacts -> impulse texture (cleared every frame)
  // Call once per frame before particle substeps. Only clears once the previous
  // impulses were consumed by a ripple step (matters at high refresh rates).
  beginImpacts() {
    if (this.impulseConsumed !== false) this.gpu.clear(this.impulse);
    this.impulseConsumed = false;
  }

  // Call after every particle substep (impact flags only live for one substep).
  splatImpacts(particles) {
    if (!particles) return;
    if (!this.splatPoints || this.splatPoints.userData.count !== particles.count) {
      if (this.splatPoints) { this.splatScene.remove(this.splatPoints); this.splatPoints.geometry.dispose(); }
      this.splatPoints = new THREE.Points(vertexCountGeometry(particles.count), this.splatMat);
      this.splatPoints.frustumCulled = false;
      this.splatPoints.userData.count = particles.count;
      this.splatScene.add(this.splatPoints);
    }
    const u = this.splatMat.uniforms;
    u.uPos.value = particles.posTexture;
    u.uVel.value = particles.velTexture;
    u.uPTex.value.set(particles.texW, particles.texH);
    u.uImpulseScale.value = 0.0035 * this.params.impactStrength;
    const r = this.gpu.renderer;
    r.setRenderTarget(this.impulse);
    r.render(this.splatScene, this.gpu.camera);
  }

  setBoatUniforms(mat, boat) {
    const u = mat.uniforms;
    u.uBoatPrevXZ.value.copy(u.uBoatXZ.value);
    u.uBoatPrevDir.value.copy(u.uBoatDir.value);
    if (boat) {
      u.uBoatXZ.value.set(boat.position.x, boat.position.z);
      u.uBoatDir.value.copy(boat.heading2D);
      u.uBoatSpeed.value = boat.speed;
      if (!this._boatInit) { u.uBoatPrevXZ.value.copy(u.uBoatXZ.value); u.uBoatPrevDir.value.copy(u.uBoatDir.value); }
    }
  }

  update(dt, time, boat, wind) {
    const p = this.params;
    this.uniforms.uRippleXf.value.w = p.enabled ? 1 : 0;
    if (!p.enabled && this._wasEnabled !== false) { for (const t of this.state) this.gpu.clear(t); }
    this._wasEnabled = p.enabled;
    if (!p.foamGrid && this._foamWas !== false) { for (const t of this.foam) this.gpu.clear(t); }
    this._foamWas = p.foamGrid;
    if (!p.enabled && !p.foamGrid) { this.drops.length = 0; this.impulseConsumed = true; return; }

    const step = 1 / 60;
    this.accum = Math.min(this.accum + dt, step * 3);
    let first = true;
    while (this.accum >= step) {
      this.accum -= step;
      if (p.enabled) {
        const s = this.stepMat.uniforms;
        // iWave: g in grid units -> correct deep-water dispersion for the chosen texel size
        s.uSolver.value = p.solver.startsWith('iWave') ? 0 : 1;
        s.uGdt2.value = (9.81 / this.texel) * step * step;
        s.uAlpha.value = p.damping;
        s.uDt.value = step;
        const c = p.waveSpeed * step / this.texel;
        s.uC2.value = Math.min(c * c, 0.45);
        s.uDamp.value = p.damping * 0.1;
        s.uBoatStrength.value = p.boatWake;
        s.uUseImpulse.value = first ? 1 : 0;
        this.setBoatUniforms(this.stepMat, boat);
        s.uDropCount.value = first ? this.drops.length : 0;
        this.drops.forEach((d, i) => s.uDrops.value[i].copy(d));
        s.uState.value = this.state[this.cur].texture;
        this.gpu.run(this.stepMat, this.state[1 - this.cur]);
        this.cur = 1 - this.cur;
      }
      if (p.foamGrid) {
        const f = this.foamMat.uniforms;
        f.uDt.value = step;
        f.uDecay.value = p.foamDecay;
        f.uSteepFoam.value = p.steepFoam;
        f.uBoatFoam.value = p.boatFoam;
        f.uRippleFlow.value = p.foamFlow;
        f.uWindDrift.value.copy(wind).multiplyScalar(0.15);
        f.uUseImpulse.value = first ? 1 : 0;
        f.uFoamTime.value = time;
        this.setBoatUniforms(this.foamMat, boat);
        f.uDropCount.value = first ? this.drops.length : 0;
        this.drops.forEach((d, i) => f.uDrops.value[i].copy(d));
        f.uFoamPrev.value = this.foam[this.fcur].texture;
        f.uState.value = this.state[this.cur].texture;
        this.gpu.run(this.foamMat, this.foam[1 - this.fcur]);
        this.fcur = 1 - this.fcur;
      }
      this._boatInit = true;
      first = false;
    }
    if (!first) { this.drops.length = 0; this.impulseConsumed = true; }
    this.uniforms.uRipple.value = this.state[this.cur].texture;
    this.uniforms.uFoamGrid.value = this.foam[this.fcur].texture;
  }
}

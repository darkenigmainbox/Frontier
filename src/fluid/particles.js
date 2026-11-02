import * as THREE from 'three';
import { rawMaterial, additive, vertexCountGeometry } from '../core/gpu.js';
import { particleSimShaders } from '../shaders/particles.js';

export const SIM_MODES = {
  'FLIP — incompressible PIC/FLIP': 0,
  'SPH — weakly compressible': 1,
  'Whitewater — spray/foam/bubbles': 2,
};

export const GRID_QUALITY = {
  Low: { dim: [64, 32, 64], h: 0.34, tiles: [8, 4] },
  Medium: { dim: [96, 40, 96], h: 0.26, tiles: [8, 5] },
  High: { dim: [128, 48, 128], h: 0.2, tiles: [8, 6] },
};

export const PARTICLE_BUDGET = {
  '32k': [256, 128],
  '65k': [256, 256],
  '131k': [512, 256],
  '262k': [512, 512],
};

const MAX_EMIT = 16;

/**
 * GPU particle simulation for splashes, spray, bubbles and 3D foam.
 * Particles live in float textures; spray particles are coupled through a
 * world-anchored 3D grid (tiled into a 2D texture) that follows the focus point.
 *
 *  Mode 0  FLIP: P2G -> gravity -> divergence (+density correction) -> Jacobi pressure -> project -> G2P (PIC/FLIP blend)
 *  Mode 1  SPH : P2G -> equation-of-state pressure + viscosity on the grid -> FLIP-style force transfer + XSPH
 *  Mode 2  Whitewater: ballistic spray in turbulent air (grid density lowers drag), bubbles rise into foam
 */
export class ParticleSystem {
  constructor(gpu, shared) {
    this.gpu = gpu;
    this.shared = shared;
    this.params = {
      enabled: true,
      mode: 'FLIP — incompressible PIC/FLIP',
      budget: '131k',
      grid: 'Medium',
      substeps: 2,
      flipRatio: 0.96,
      pressureIters: 30,
      restDensity: 3.0,
      densityCorrection: 0.35,
      sphStiffness: 7.0,
      sphViscosity: 0.08,
      xsph: 0.06,
      airDrag: 0.6,
      turbulence: 6.0,
      foamChance: 0.55,
      bubbleChance: 0.35,
      foamLife: 7.0,
      foamParticles: true,
      cohesion: 0.6,
    };
    this.gridOrigin = new THREE.Vector3();
    this.frame = 0;
    this.queue = [];
    this.cursor = 0;

    this.simUniforms = {
      uGridOrigin: { value: this.gridOrigin },
      uGridH: { value: 0.25 },
      uGridDim: { value: new THREE.Vector3() },
      uGridTiles: { value: new THREE.Vector2() },
      uGridTex: { value: new THREE.Vector2() },
    };
    this.boatUniforms = {
      uBoatPos: { value: new THREE.Vector3(0, -100, 0) },
      uBoatInv: { value: new THREE.Matrix3() },
      uBoatHalf: { value: new THREE.Vector3(3.2, 0.8, 1.1) },
      uBoatVel: { value: new THREE.Vector3() },
    };
    this.allocateParticles(this.params.budget);
    this.allocateGrid(this.params.grid);
    this.buildMaterials();
  }

  get count() { return this.texW * this.texH; }
  get posTexture() { return this.state[this.cur].textures[0]; }
  get velTexture() { return this.state[this.cur].textures[1]; }
  get modeIndex() { return SIM_MODES[this.params.mode] ?? 0; }

  allocateParticles(budget) {
    if (this.state) this.state.forEach((s) => s.dispose());
    const [w, h] = PARTICLE_BUDGET[budget] || PARTICLE_BUDGET['131k'];
    this.texW = w; this.texH = h;
    this.state = [0, 1].map(() => this.gpu.target(w, h, { type: THREE.FloatType, count: 2 }));
    this.state.forEach((s) => this.gpu.clear(s));
    this.cur = 0;
    this.cursor = 0;
    if (this.advectMat) this.advectMat.uniforms.uPTex.value.set(w, h);
    if (this.p2gPoints) this.rebuildP2G();
  }

  allocateGrid(quality) {
    const q = GRID_QUALITY[quality] || GRID_QUALITY.Medium;
    this.gridQ = q;
    const [nx, ny, nz] = q.dim;
    const [tx, ty] = q.tiles;
    const W = nx * tx, H = nz * ty;
    if (this.grid) Object.values(this.grid).forEach((t) => t.dispose());
    const g = this.gpu;
    const splatType = g.floatBlend ? THREE.FloatType : THREE.HalfFloatType;
    this.grid = {
      splat: g.target(W, H, { type: splatType }),
      vel: g.target(W, H, { type: THREE.FloatType, count: 2 }), // [0] new velocity + type, [1] P2G velocity + mass
      solved: g.target(W, H, { type: THREE.FloatType }),
      div: g.target(W, H, { type: THREE.FloatType }),
      p0: g.target(W, H, { type: THREE.FloatType }),
      p1: g.target(W, H, { type: THREE.FloatType }),
    };
    Object.values(this.grid).forEach((t) => g.clear(t));
    const u = this.simUniforms;
    u.uGridH.value = q.h;
    u.uGridDim.value.set(nx, ny, nz);
    u.uGridTiles.value.set(tx, ty);
    u.uGridTex.value.set(W, H);
    this.extent = new THREE.Vector3(nx * q.h, ny * q.h, nz * q.h);
  }

  buildMaterials() {
    const S = this.shared;
    const io = () => ({ uPos: { value: null }, uVel: { value: null }, uPTex: { value: new THREE.Vector2(this.texW, this.texH) } });
    this.p2gMat = rawMaterial(particleSimShaders.p2g, { ...this.simUniforms, ...io() }, additive);
    this.p2gScene = new THREE.Scene();
    this.rebuildP2G();

    this.normalizeMat = rawMaterial(particleSimShaders.gridNormalize, {
      ...this.simUniforms, ...this.boatUniforms, ...S.terrain,
      uSplat: { value: null }, uDt: { value: 1 / 120 }, uGravityOn: { value: 1 }, uFluidMass: { value: 0.6 },
    });
    this.divMat = rawMaterial(particleSimShaders.divergence, {
      ...this.simUniforms, uGridVel: { value: null }, uGridOld: { value: null },
      uRest: { value: 3 }, uDensK: { value: 0.3 }, uDt: { value: 1 / 120 },
    });
    this.jacobiMat = rawMaterial(particleSimShaders.jacobi, { ...this.simUniforms, uP: { value: null }, uDiv: { value: null } });
    this.projectMat = rawMaterial(particleSimShaders.project, { ...this.simUniforms, uGridVel: { value: null }, uP: { value: null }, uDiv: { value: null } });
    this.sphMat = rawMaterial(particleSimShaders.sphForce, {
      ...this.simUniforms, uGridVel: { value: null }, uGridOld: { value: null },
      uRest: { value: 3 }, uStiff: { value: 6 }, uVisc: { value: 0.1 }, uDt: { value: 1 / 120 },
    });
    const emitArr = () => ({ value: Array.from({ length: MAX_EMIT }, () => new THREE.Vector4()) });
    this.advectMat = rawMaterial(particleSimShaders.advect, {
      ...this.simUniforms, ...this.boatUniforms, ...S.terrain, ...S.waves, ...S.ripple,
      ...io(),
      uGridVel: { value: null }, uGridOld: { value: null },
      uMode: { value: 0 }, uDt: { value: 1 / 120 }, uFrame: { value: 0 },
      uFlip: { value: 0.95 }, uXsph: { value: 0.05 }, uAirDrag: { value: 0.6 }, uTurb: { value: 5 },
      uFoamChance: { value: 0.5 }, uBubbleChance: { value: 0.3 }, uFoamLife: { value: 7 }, uFoamEnabled: { value: 1 },
      uWind: { value: new THREE.Vector2() }, uCohesion: { value: 0.5 }, uRippleFlow: { value: 0.5 },
      uCount: { value: this.count }, uEmitCount: { value: 0 },
      uEmitA: emitArr(), uEmitB: emitArr(), uEmitC: emitArr(), uEmitD: emitArr(),
    });
  }

  rebuildP2G() {
    if (this.p2gPoints) { this.p2gScene.remove(this.p2gPoints); this.p2gPoints.geometry.dispose(); }
    this.p2gPoints = new THREE.Points(vertexCountGeometry(this.count * 8), this.p2gMat);
    this.p2gPoints.frustumCulled = false;
    this.p2gScene.add(this.p2gPoints);
  }

  setBudget(b) { this.params.budget = b; this.allocateParticles(b); }
  setGrid(q) { this.params.grid = q; this.allocateGrid(q); }
  reset() { this.state.forEach((s) => this.gpu.clear(s)); this.queue.length = 0; }

  /**
   * Queue an emission. kind 0 = burst (ball), kind 1 = crown ring.
   * type: 1 spray, 2 foam, 3 bubble.
   */
  emit(e) {
    if (!this.params.enabled) return;
    const count = Math.floor(e.count);
    if (count <= 0) return;
    if (e.type === 2 && !this.params.foamParticles) return;
    this.queue.push({
      pos: e.pos, spread: e.spread ?? 0.1, vel: e.vel ?? new THREE.Vector3(), velSpread: e.velSpread ?? 0.5,
      count, type: e.type ?? 1, life: e.life ?? 4, kind: e.kind ?? 0, ring: e.ring ?? 0, radial: e.radial ?? 0,
    });
  }

  setBoat(boat) {
    const b = this.boatUniforms;
    if (!boat) { b.uBoatPos.value.set(0, -1000, 0); return; }
    b.uBoatPos.value.copy(boat.collisionCenter);
    b.uBoatInv.value.setFromMatrix4(boat.mesh.matrixWorld).invert();
    b.uBoatHalf.value.copy(boat.collisionHalf);
    b.uBoatVel.value.copy(boat.velocity);
  }

  setFocus(x, z) {
    const q = this.gridQ, h = q.h;
    const ox = Math.floor((x - this.extent.x / 2) / h) * h;
    const oz = Math.floor((z - this.extent.z / 2) / h) * h;
    const oy = Math.floor(-2.5 / h) * h;
    if (ox !== this.gridOrigin.x || oz !== this.gridOrigin.z || oy !== this.gridOrigin.y) {
      this.gridOrigin.set(ox, oy, oz);
      this.gpu.clear(this.grid.p0); this.gpu.clear(this.grid.p1);
    }
  }

  pushEmitters(count) {
    const u = this.advectMat.uniforms;
    let n = 0;
    let budget = Math.floor(this.count * 0.2);
    while (this.queue.length && n < MAX_EMIT && budget > 0) {
      const e = this.queue.shift();
      const cnt = Math.min(e.count, budget);
      budget -= cnt;
      u.uEmitA.value[n].set(e.pos.x, e.pos.y, e.pos.z, e.spread);
      u.uEmitB.value[n].set(e.vel.x, e.vel.y, e.vel.z, e.velSpread);
      u.uEmitC.value[n].set(this.cursor, cnt, e.type, e.life);
      u.uEmitD.value[n].set(e.kind, e.ring, e.radial, 0);
      this.cursor = (this.cursor + cnt) % count;
      n++;
    }
    this.queue.length = Math.min(this.queue.length, 64);
    u.uEmitCount.value = n;
  }

  update(dt, ctx) {
    if (!this.params.enabled) { this.queue.length = 0; return; }
    const p = this.params;
    const g = this.gpu;
    const r = g.renderer;
    const mode = this.modeIndex;
    const sub = Math.max(1, p.substeps);
    const h = Math.min(dt, 1 / 30) / sub;
    const R = p.restDensity;

    for (let s = 0; s < sub; s++) {
      const src = this.state[this.cur];
      // 1) Particle -> grid
      g.clear(this.grid.splat);
      this.p2gMat.uniforms.uPos.value = src.textures[0];
      this.p2gMat.uniforms.uVel.value = src.textures[1];
      this.p2gMat.uniforms.uPTex.value.set(this.texW, this.texH);
      r.setRenderTarget(this.grid.splat);
      r.render(this.p2gScene, g.camera);

      // 2) Normalise + classify + gravity
      const nu = this.normalizeMat.uniforms;
      nu.uSplat.value = this.grid.splat.texture;
      nu.uDt.value = h;
      nu.uGravityOn.value = mode === 0 ? 1 : 0;
      nu.uFluidMass.value = R * 0.2;
      g.run(this.normalizeMat, this.grid.vel);
      const velNew = this.grid.vel.textures[0];
      const velOld = this.grid.vel.textures[1];
      let gridVel = velNew;

      if (mode === 0) {
        // 3a) FLIP pressure projection
        const du = this.divMat.uniforms;
        du.uGridVel.value = velNew; du.uGridOld.value = velOld;
        du.uRest.value = R; du.uDensK.value = p.densityCorrection; du.uDt.value = h;
        g.run(this.divMat, this.grid.div);
        let pa = this.grid.p0, pb = this.grid.p1;
        const ju = this.jacobiMat.uniforms;
        ju.uDiv.value = this.grid.div.texture;
        for (let i = 0; i < p.pressureIters; i++) {
          ju.uP.value = pa.texture;
          g.run(this.jacobiMat, pb);
          [pa, pb] = [pb, pa];
        }
        this.grid.p0 = pa; this.grid.p1 = pb;
        const pu = this.projectMat.uniforms;
        pu.uGridVel.value = velNew; pu.uP.value = pa.texture; pu.uDiv.value = this.grid.div.texture;
        g.run(this.projectMat, this.grid.solved);
        gridVel = this.grid.solved.texture;
      } else if (mode === 1) {
        // 3b) SPH equation of state forces
        const su = this.sphMat.uniforms;
        su.uGridVel.value = velNew; su.uGridOld.value = velOld;
        su.uRest.value = R; su.uStiff.value = p.sphStiffness; su.uVisc.value = p.sphViscosity; su.uDt.value = h;
        g.run(this.sphMat, this.grid.solved);
        gridVel = this.grid.solved.texture;
      }

      // 4) Grid -> particle + advection + collisions + type transitions + emission
      const au = this.advectMat.uniforms;
      au.uPos.value = src.textures[0];
      au.uVel.value = src.textures[1];
      au.uPTex.value.set(this.texW, this.texH);
      au.uGridVel.value = gridVel;
      au.uGridOld.value = velOld;
      au.uMode.value = mode;
      au.uDt.value = h;
      au.uFrame.value = (this.frame++) % 1000000;
      au.uFlip.value = p.flipRatio;
      au.uXsph.value = p.xsph;
      au.uAirDrag.value = p.airDrag;
      au.uTurb.value = p.turbulence;
      au.uFoamChance.value = p.foamChance;
      au.uBubbleChance.value = p.bubbleChance;
      au.uFoamLife.value = p.foamLife;
      au.uFoamEnabled.value = p.foamParticles ? 1 : 0;
      au.uCohesion.value = p.cohesion;
      au.uWind.value.copy(ctx.wind).multiplyScalar(ctx.windSpeed ?? 4);
      au.uCount.value = this.count;
      if (s === 0) this.pushEmitters(this.count); else au.uEmitCount.value = 0;
      const dst = this.state[1 - this.cur];
      g.run(this.advectMat, dst);
      this.cur = 1 - this.cur;
      if (ctx.onSubstep) ctx.onSubstep(this);
    }
  }
}

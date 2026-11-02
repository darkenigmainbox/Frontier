import * as THREE from 'three';
import { rawMaterial, additive, vertexCountGeometry, instancedQuadGeometry } from '../core/gpu.js';
import { particleRenderShaders } from '../shaders/particleRender.js';

/**
 * Renders the GPU particles:
 *  - 3D particle foam: oriented discs riding the animated ocean surface
 *  - spray: screen-space fluid (sphere depth -> bilateral smoothing -> shading with
 *    refraction, absorption, Fresnel and aeration) or velocity-stretched sprites
 */
export class FluidRenderer {
  constructor(gpu, particles, shared) {
    this.gpu = gpu;
    this.particles = particles;
    this.shared = shared;
    this.params = {
      ssf: true,
      particleRadius: 0.12,
      smoothing: 0.45,
      blurIterations: 3,
      whiteness: 0.85,
      foamSize: 0.16,
      foamOpacity: 0.85,
      spraySize: 0.035,
      streak: 0.02,
    };
    const io = () => ({ uPos: { value: null }, uVel: { value: null }, uPTex: { value: new THREE.Vector2() } });
    const light = { uSunDir: shared.light.uSunDir, uSunColor: shared.light.uSunColor, uSkyCube: shared.light.uSkyCube };

    this.foamMat = rawMaterial(particleRenderShaders.foamQuad, {
      ...shared.terrain, ...shared.waves, ...shared.ripple, ...light, ...io(),
      uFoamSize: { value: 0.16 }, uFoamOpacity: { value: 0.85 },
    }, { transparent: true, depthTest: true, depthWrite: false, blending: THREE.NormalBlending });
    this.sprayMat = rawMaterial(particleRenderShaders.spray, {
      ...light, ...io(), uSpraySize: { value: 0.035 }, uStreak: { value: 0.02 },
    }, { transparent: true, depthTest: true, depthWrite: false, blending: THREE.NormalBlending });
    this.depthMat = rawMaterial(particleRenderShaders.ssfDepth, {
      ...io(), uRadius: { value: 0.09 }, uProjScale: { value: 1 },
    }, { depthTest: true, depthWrite: true });
    this.thickMat = rawMaterial(particleRenderShaders.ssfThick, {
      ...io(), uRadius: { value: 0.09 }, uProjScale: { value: 1 },
    }, { ...additive, depthTest: false, depthWrite: false });
    this.blurMat = rawMaterial(particleRenderShaders.ssfBlur, {
      uDepth: { value: null }, uDir: { value: new THREE.Vector2() }, uProjScale: { value: 1 },
      uBlurRadius: { value: 0.2 }, uFalloff: { value: 0.25 },
    });
    this.compositeMat = rawMaterial(particleRenderShaders.ssfComposite, {
      ...light,
      uDepth: { value: null }, uThick: { value: null }, uScene: { value: null },
      uProj: { value: new THREE.Matrix4() }, uViewInv: { value: new THREE.Matrix4() },
      uCamPos: { value: new THREE.Vector3() }, uInvRes: { value: new THREE.Vector2() },
      uAbsorb: shared.water.uAbsorb, uDeepColor: shared.water.uDeepColor, uWhiteness: { value: 0.85 },
    }, { transparent: true, depthTest: true, depthWrite: false, blending: THREE.NormalBlending });

    this.foamScene = new THREE.Scene();
    this.sprayScene = new THREE.Scene();
    this.depthScene = new THREE.Scene();
    this.thickScene = new THREE.Scene();
    this.rebuild();
  }

  rebuild() {
    const n = this.particles.count;
    if (this.n === n) return;
    this.n = n;
    for (const s of [this.foamScene, this.sprayScene, this.depthScene, this.thickScene]) {
      for (const o of [...s.children]) { s.remove(o); o.geometry.dispose(); }
    }
    const foam = new THREE.Mesh(instancedQuadGeometry(n), this.foamMat);
    const spray = new THREE.Mesh(instancedQuadGeometry(n), this.sprayMat);
    const pts = vertexCountGeometry(n);
    const depth = new THREE.Points(pts, this.depthMat);
    const thick = new THREE.Points(pts, this.thickMat);
    for (const o of [foam, spray, depth, thick]) o.frustumCulled = false;
    this.foamScene.add(foam); this.sprayScene.add(spray); this.depthScene.add(depth); this.thickScene.add(thick);
  }

  resize(w, h) {
    this.w = w; this.h = h;
    const g = this.gpu;
    if (this.rtDepth) [this.rtDepth, this.rtBlur, this.rtThick].forEach((t) => t.dispose());
    this.rtDepth = g.target(w, h, { type: THREE.FloatType, depth: true });
    this.rtBlur = g.target(w, h, { type: THREE.FloatType });
    this.rtThick = g.target(Math.max(1, w >> 1), Math.max(1, h >> 1), { type: THREE.HalfFloatType, filter: THREE.LinearFilter });
  }

  bindParticles(mat) {
    const u = mat.uniforms;
    u.uPos.value = this.particles.posTexture;
    u.uVel.value = this.particles.velTexture;
    u.uPTex.value.set(this.particles.texW, this.particles.texH);
  }

  renderFoam(camera, target) {
    if (!this.particles.params.enabled || !this.particles.params.foamParticles) return;
    this.rebuild();
    this.bindParticles(this.foamMat);
    this.foamMat.uniforms.uFoamSize.value = this.params.foamSize;
    this.foamMat.uniforms.uFoamOpacity.value = this.params.foamOpacity;
    const r = this.gpu.renderer;
    r.setRenderTarget(target);
    r.render(this.foamScene, camera);
  }

  /** Spray / fluid. `sceneCopy` = colour of the frame so far (for refraction). */
  renderSpray(camera, target, copyScene) {
    if (!this.particles.params.enabled) return;
    this.rebuild();
    const r = this.gpu.renderer;
    const p = this.params;
    if (!p.ssf) {
      this.bindParticles(this.sprayMat);
      this.sprayMat.uniforms.uSpraySize.value = p.spraySize;
      this.sprayMat.uniforms.uStreak.value = p.streak;
      r.setRenderTarget(target);
      r.render(this.sprayScene, camera);
      return;
    }
    const projScale = camera.projectionMatrix.elements[5] * this.h * 0.5;
    // 1) sphere depth
    this.bindParticles(this.depthMat);
    this.depthMat.uniforms.uRadius.value = p.particleRadius;
    this.depthMat.uniforms.uProjScale.value = projScale;
    this.gpu.clear(this.rtDepth, 0x000000, 0);
    r.setRenderTarget(this.rtDepth);
    r.render(this.depthScene, camera);
    // 2) thickness (half res, additive)
    this.bindParticles(this.thickMat);
    this.thickMat.uniforms.uRadius.value = p.particleRadius;
    this.thickMat.uniforms.uProjScale.value = projScale * 0.5;
    this.gpu.clear(this.rtThick, 0x000000, 0);
    r.setRenderTarget(this.rtThick);
    r.render(this.thickScene, camera);
    // 3) bilateral smoothing
    const b = this.blurMat.uniforms;
    b.uProjScale.value = projScale;
    b.uBlurRadius.value = p.smoothing;
    b.uFalloff.value = p.particleRadius * 4.0;
    let src = this.rtDepth;
    for (let i = 0; i < p.blurIterations; i++) {
      // Alternate axis-aligned and diagonal passes: a separable bilateral filter alone leaves blocky,
      // axis-aligned plateaus in the smoothed depth
      const diag = i % 2 === 1, k = diag ? Math.SQRT1_2 : 1;
      b.uDepth.value = src.texture; b.uDir.value.set(k / this.w, diag ? k / this.h : 0);
      this.gpu.run(this.blurMat, this.rtBlur);
      b.uDepth.value = this.rtBlur.texture; b.uDir.value.set(diag ? k / this.w : 0, (diag ? -k : 1) / this.h);
      this.gpu.run(this.blurMat, this.rtDepth);
      src = this.rtDepth;
    }
    // 4) shading + composite into the HDR frame (depth tested against the scene)
    copyScene();
    const c = this.compositeMat.uniforms;
    c.uDepth.value = this.rtDepth.texture;
    c.uThick.value = this.rtThick.texture;
    c.uProj.value.copy(camera.projectionMatrix);
    c.uViewInv.value.copy(camera.matrixWorld);
    c.uCamPos.value.setFromMatrixPosition(camera.matrixWorld);
    c.uInvRes.value.set(1 / this.w, 1 / this.h);
    c.uWhiteness.value = p.whiteness;
    this.gpu.run(this.compositeMat, target);
  }
}

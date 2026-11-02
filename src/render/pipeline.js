import * as THREE from 'three';
import { rawMaterial } from '../core/gpu.js';
import { postShaders } from '../shaders/post.js';

/**
 * Frame graph:
 *  reflection (mirrored camera, geometry only) -> opaque HDR (sky, island, boat)
 *  -> copy colour + linear depth (refraction source) -> ocean surface
 *  -> 3D particle foam -> spray / screen-space fluid -> bloom -> ACES -> FXAA
 */
export class Pipeline {
  constructor(renderer, gpu) {
    this.renderer = renderer;
    this.gpu = gpu;
    this.params = { bloom: true, bloomStrength: 0.35, bloomThreshold: 1.6, exposure: 0.8, fxaa: true, reflectionScale: 0.5 };
    this.blitMat = rawMaterial(postShaders.blitDepth, { uColor: { value: null }, uDepth: { value: null }, uNear: { value: 0.1 }, uFar: { value: 1000 } });
    this.brightMat = rawMaterial(postShaders.bright, { uSrc: { value: null }, uTexel: { value: new THREE.Vector2() }, uThreshold: { value: 1.5 } });
    this.blurMat = rawMaterial(postShaders.blur, { uSrc: { value: null }, uDir: { value: new THREE.Vector2() } });
    this.toneMat = rawMaterial(postShaders.tonemap, { uSrc: { value: null }, uBloom: { value: null }, uBloomStrength: { value: 0.3 }, uExposure: { value: 0.8 } });
    this.fxaaMat = rawMaterial(postShaders.fxaa, { uSrc: { value: null }, uTexel: { value: new THREE.Vector2() } });
    this.reflCam = new THREE.PerspectiveCamera();
    this.reflMatrix = new THREE.Matrix4();
    this.clipPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0.0);
    this.black = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
    this.black.needsUpdate = true;
  }

  resize(w, h) {
    this.w = w; this.h = h;
    const g = this.gpu;
    const dispose = (t) => t && t.dispose();
    [this.rtMain, this.rtRefr, this.rtReflect, this.rtB1, this.rtB2, this.rtLDR].forEach(dispose);
    this.rtMain = g.target(w, h, { type: THREE.HalfFloatType, filter: THREE.LinearFilter, depthTexture: true });
    this.rtRefr = g.target(w, h, { type: THREE.HalfFloatType, filter: THREE.LinearFilter });
    const rs = this.params.reflectionScale;
    this.rtReflect = g.target(Math.max(1, Math.floor(w * rs)), Math.max(1, Math.floor(h * rs)), { type: THREE.HalfFloatType, filter: THREE.LinearFilter, depth: true });
    this.rtB1 = g.target(Math.max(1, w >> 2), Math.max(1, h >> 2), { type: THREE.HalfFloatType, filter: THREE.LinearFilter });
    this.rtB2 = g.target(Math.max(1, w >> 2), Math.max(1, h >> 2), { type: THREE.HalfFloatType, filter: THREE.LinearFilter });
    this.rtLDR = g.target(w, h, { type: THREE.UnsignedByteType, filter: THREE.LinearFilter });
  }

  updateReflectionCamera(camera) {
    // Same construction as three's Reflector: mirror the camera about the y = 0 plane
    const camPos = new THREE.Vector3().setFromMatrixPosition(camera.matrixWorld);
    const rot = new THREE.Matrix4().extractRotation(camera.matrixWorld);
    const view = new THREE.Vector3(camPos.x, -camPos.y, camPos.z);
    const look = new THREE.Vector3(0, 0, -1).applyMatrix4(rot).add(camPos);
    const target = new THREE.Vector3(look.x, -look.y, look.z);
    const up = new THREE.Vector3(0, 1, 0).applyMatrix4(rot);
    up.y = -up.y;
    const rc = this.reflCam;
    rc.position.copy(view);
    rc.up.copy(up);
    rc.lookAt(target);
    rc.near = camera.near; rc.far = camera.far;
    rc.projectionMatrix.copy(camera.projectionMatrix);
    rc.updateMatrixWorld();
    rc.matrixWorldInverse.copy(rc.matrixWorld).invert();
    this.reflMatrix.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
    this.reflMatrix.multiply(rc.projectionMatrix).multiply(rc.matrixWorldInverse);
  }

  copyScene() {
    const b = this.blitMat.uniforms;
    b.uColor.value = this.rtMain.texture;
    b.uDepth.value = this.rtMain.depthTexture;
    this.gpu.run(this.blitMat, this.rtRefr);
  }

  render(ctx) {
    const { camera, skyScene, opaqueScene, waterScene, overlayScene, water, terrain, fluid } = ctx;
    const r = this.renderer;
    const g = this.gpu;
    this.blitMat.uniforms.uNear.value = camera.near;
    this.blitMat.uniforms.uFar.value = camera.far;

    // 1) Planar reflection of the island/boat (sky comes from the cubemap in the water shader)
    if (water.params.planarReflections) {
      this.updateReflectionCamera(camera);
      g.clear(this.rtReflect, 0x000000, 0);
      terrain.material.uniforms.uClipBelow.value = 1;
      r.clippingPlanes = [this.clipPlane];
      r.setRenderTarget(this.rtReflect);
      r.render(opaqueScene, this.reflCam);
      r.clippingPlanes = [];
      terrain.material.uniforms.uClipBelow.value = 0;
      water.uniforms.uReflect.value = this.rtReflect.texture;
      water.uniforms.uReflMatrix.value.copy(this.reflMatrix);
    } else {
      water.uniforms.uReflect.value = this.black;
    }

    // 2) Opaque HDR pass
    g.clear(this.rtMain, 0x000000, 1);
    r.setRenderTarget(this.rtMain);
    r.render(skyScene, camera);
    r.render(opaqueScene, camera);

    // 3) Refraction source (colour + linear depth)
    this.copyScene();
    water.uniforms.uRefr.value = this.rtRefr.texture;

    // 4) Ocean
    r.setRenderTarget(this.rtMain);
    r.render(waterScene, camera);

    // 5) 3D particle foam, then spray (screen-space fluid or sprites)
    fluid.renderFoam(camera, this.rtMain);
    fluid.renderSpray(camera, this.rtMain, () => { this.copyScene(); return this.rtRefr.texture; });

    // Debug overlays (grid bounds)
    if (overlayScene.visible) { r.setRenderTarget(this.rtMain); r.render(overlayScene, camera); }

    // 6) Bloom
    const p = this.params;
    if (p.bloom) {
      const bu = this.brightMat.uniforms;
      bu.uSrc.value = this.rtMain.texture; bu.uTexel.value.set(1 / this.w, 1 / this.h); bu.uThreshold.value = p.bloomThreshold;
      g.run(this.brightMat, this.rtB1);
      const tw = 1 / this.rtB1.width, th = 1 / this.rtB1.height;
      for (const s of [1, 2]) {
        this.blurMat.uniforms.uSrc.value = this.rtB1.texture; this.blurMat.uniforms.uDir.value.set(tw * s, 0);
        g.run(this.blurMat, this.rtB2);
        this.blurMat.uniforms.uSrc.value = this.rtB2.texture; this.blurMat.uniforms.uDir.value.set(0, th * s);
        g.run(this.blurMat, this.rtB1);
      }
    }
    // 7) Tonemap (+FXAA)
    const t = this.toneMat.uniforms;
    t.uSrc.value = this.rtMain.texture;
    t.uBloom.value = p.bloom ? this.rtB1.texture : this.black;
    t.uBloomStrength.value = p.bloom ? p.bloomStrength : 0;
    t.uExposure.value = p.exposure;
    if (p.fxaa) {
      g.run(this.toneMat, this.rtLDR);
      this.fxaaMat.uniforms.uSrc.value = this.rtLDR.texture;
      this.fxaaMat.uniforms.uTexel.value.set(1 / this.w, 1 / this.h);
      g.run(this.fxaaMat, null);
    } else {
      g.run(this.toneMat, null);
    }
  }
}

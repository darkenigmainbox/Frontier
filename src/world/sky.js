import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';

/** Physically based sky (Preetham + clouds), sun light, sky cubemap (water reflections) and PMREM (boat PBR). */
export class SkySystem {
  constructor(renderer) {
    this.renderer = renderer;
    this.params = { elevation: 14, azimuth: 205, turbidity: 3.5, rayleigh: 1.4, clouds: 0.35, sunIntensity: 3.0 };
    this.sky = new Sky();
    this.sky.scale.setScalar(4000);
    this.scene = new THREE.Scene();
    this.scene.add(this.sky);
    this.cubeRT = new THREE.WebGLCubeRenderTarget(256, {
      type: THREE.HalfFloatType,
      generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter,
      magFilter: THREE.LinearFilter,
    });
    this.cubeCam = new THREE.CubeCamera(1, 10000, this.cubeRT);
    this.cubeCam.position.set(0, 2, 0);
    this.scene.add(this.cubeCam);
    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.sunDir = new THREE.Vector3();
    this.sunColor = new THREE.Vector3();
    this.light = new THREE.DirectionalLight(0xffffff, 1);
    this.dirty = true;
    this.frame = 0;
    this.envTexture = null;
  }

  apply() {
    const p = this.params;
    const phi = THREE.MathUtils.degToRad(90 - p.elevation);
    const theta = THREE.MathUtils.degToRad(p.azimuth);
    this.sunDir.setFromSphericalCoords(1, phi, theta);
    const u = this.sky.material.uniforms;
    u.sunPosition.value.copy(this.sunDir);
    u.turbidity.value = p.turbidity;
    u.rayleigh.value = p.rayleigh;
    u.mieCoefficient.value = 0.005;
    u.mieDirectionalG.value = 0.8;
    if (u.cloudCoverage) u.cloudCoverage.value = p.clouds;
    const e = this.sunDir.y;
    const warm = THREE.MathUtils.smoothstep(e, 0.0, 0.4);
    const day = THREE.MathUtils.smoothstep(e, -0.04, 0.06);
    const c = new THREE.Color(1.0, 0.42, 0.18).lerp(new THREE.Color(1.0, 0.95, 0.87), warm);
    this.sunColor.set(c.r, c.g, c.b).multiplyScalar(p.sunIntensity * day);
    this.light.color.setRGB(c.r, c.g, c.b);
    this.light.intensity = p.sunIntensity * day * Math.PI; // three's Lambert includes 1/pi
    this.light.position.copy(this.sunDir).multiplyScalar(100);
    this.dirty = true;
  }

  update(time, onEnvChanged) {
    const u = this.sky.material.uniforms;
    if (u.time) u.time.value = time;
    this.frame++;
    if (this.dirty || this.frame % 30 === 0) {
      // The sun disc is handled analytically (GGX) by the water/terrain shaders: keep it out of the cubemap
      if (u.showSunDisc) u.showSunDisc.value = 0;
      this.cubeCam.update(this.renderer, this.scene);
      if (u.showSunDisc) u.showSunDisc.value = 1;
      if (this.dirty) {
        if (this.envRT) this.envRT.dispose();
        this.envRT = this.pmrem.fromCubemap(this.cubeRT.texture);
        this.envTexture = this.envRT.texture;
        onEnvChanged && onEnvChanged(this.envTexture);
      }
      this.dirty = false;
    }
  }
}

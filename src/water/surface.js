import * as THREE from 'three';
import { rawMaterial } from '../core/gpu.js';
import { waterShaders } from '../shaders/water.js';

/**
 * Infinite ocean surface built from nested square LOD rings centred on the camera.
 * Each ring is snapped to its own vertex spacing (no vertex swimming) and overlaps
 * the next finer ring by a couple of cells; coarser rings are nudged back in depth
 * so the finer one always wins (crack-free without stitching).
 */
export class WaterSurface {
  constructor(shared, levels = 10, cells = 128, baseSpacing = 0.25) {
    this.group = new THREE.Group();
    this.levels = [];
    this.params = {
      planarReflections: true,
      refraction: true,
      sss: true,
      detailNormals: true,
      detailStrength: 1.0,
      roughness: 0.06,
      crestFoam: 0.7,
      crestThreshold: 0.55,
      shoreFoam: 0.8,
      foamScale: 1.0,
      gridFoam: true,
      fogDensity: 0.00022,
    };
    const common = {
      ...shared.terrain, ...shared.waves, ...shared.ripple, ...shared.light, ...shared.water,
      uRefr: { value: null },
      uReflect: { value: null },
      uReflMatrix: { value: new THREE.Matrix4() },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uToggles: { value: new THREE.Vector4(1, 1, 1, 1) },
      uFoamParams: { value: new THREE.Vector4(0.7, 1, 0.8, 1.0) },
      uCrestThresh: { value: 0.55 },
      uFoamTex: shared.foamTex,
      uWaveHeight: { value: 1 },
      uWindAngle: { value: 0 },
      uFogDensity: shared.fog.uFogDensity,
      uRoughness: { value: 0.06 },
      uDetailStrength: { value: 1 },
    };
    this.uniforms = common;
    for (let l = 0; l < levels; l++) {
      const s = baseSpacing * Math.pow(2, l);
      const geo = WaterSurface.ringGeometry(cells, s, l === 0 ? 0 : (cells / 4 - 2) * s);
      const mat = rawMaterial(waterShaders.water, {
        ...common,
        uLevelOffset: { value: new THREE.Vector2() },
        uLodScale: { value: 1 + l * 4e-4 },
      }, { depthTest: true, depthWrite: true });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.frustumCulled = false;
      mesh.renderOrder = l;
      this.group.add(mesh);
      this.levels.push({ mesh, mat, spacing: s });
    }
  }

  static ringGeometry(cells, spacing, holeHalf) {
    const half = (cells / 2) * spacing;
    const n = cells + 1;
    const pos = new Float32Array(n * n * 3);
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const k = (j * n + i) * 3;
        pos[k] = -half + i * spacing;
        pos[k + 1] = 0;
        pos[k + 2] = -half + j * spacing;
      }
    }
    const idx = [];
    for (let j = 0; j < cells; j++) {
      for (let i = 0; i < cells; i++) {
        const x0 = -half + i * spacing, z0 = -half + j * spacing;
        const x1 = x0 + spacing, z1 = z0 + spacing;
        if (holeHalf > 0 && x0 >= -holeHalf && x1 <= holeHalf && z0 >= -holeHalf && z1 <= holeHalf) continue;
        const a = j * n + i, b = a + 1, c = a + n, d = c + 1;
        idx.push(a, c, b, b, c, d);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setIndex(idx);
    return geo;
  }

  update(camera, waves, size) {
    const p = this.params, u = this.uniforms;
    for (const L of this.levels) {
      L.mat.uniforms.uLevelOffset.value.set(
        Math.round(camera.position.x / L.spacing) * L.spacing,
        Math.round(camera.position.z / L.spacing) * L.spacing,
      );
    }
    u.uResolution.value.copy(size);
    u.uToggles.value.set(p.planarReflections ? 1 : 0, p.refraction ? 1 : 0, p.sss ? 1 : 0, p.detailNormals ? 1 : 0);
    u.uFoamParams.value.set(p.crestFoam, p.gridFoam ? 1 : 0, p.shoreFoam, p.foamScale);
    u.uCrestThresh.value = p.crestThreshold;
    u.uWaveHeight.value = Math.max(0.2, waves.params.height);
    u.uWindAngle.value = waves.windAngle;
    u.uRoughness.value = p.roughness;
    u.uDetailStrength.value = p.detailStrength;
  }
}

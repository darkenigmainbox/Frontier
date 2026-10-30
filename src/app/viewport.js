/**
 * Three.js WebGL2 AAA Rock & Cliff Studio Viewport.
 *
 * Features:
 * - Honest Flat-Material Stone Rendering (zero bitmap noise, zero fake sedimentary stripe textures)
 * - Volumetric SDF Vertex AO + Geometric Curvature shader integration
 * - Dynamic tight-frustum 2048x2048 PCFSoftShadowMap directional sunlight rig
 * - 5 Inspection Modes: AAA Flat Stone, Pure Matte Clay, Lithology Tone, AO Grayscale, Curvature/Normal Diagnostics
 * - 1.80m Human Scale Reference Figure + Meter Grid Ground Shadow Catcher
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { LITHOLOGY_PALETTES } from '../geology/presets.js';

export class RockStudioViewport {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#171a1f');
    this.scene.fog = new THREE.FogExp2('#171a1f', 0.0045);

    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;

    this.camera = new THREE.PerspectiveCamera(40, w / h, 0.08, 600);
    this.camera.position.set(14, 9, 20);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(w, h);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.04;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.065;
    this.controls.maxPolarAngle = Math.PI * 0.495;
    this.controls.minDistance = 1.2;
    this.controls.maxDistance = 180;
    this.controls.target.set(0, 3.5, 0);

    this.turntable = false;
    this.sunAzimuthDeg = 42;
    this.sunElevationDeg = 44;
    this.shadingMode = 'lithology'; // 'lithology' | 'flat-stone' | 'pure-clay' | 'ao' | 'curvature' | 'normals'
    this.currentLithology = 'navajoRed';
    this.boundRadius = 10;
    this.formationDims = [16, 10, 8];

    this.shaderUniforms = {
      uCurvatureStrength: { value: 0.85 },
      uAoStrength: { value: 0.92 },
      uUseVertexAlbedo: { value: 0.0 },
      uDebugMode: { value: 0 },
    };
    this.hasCustomAlbedo = false;
    this.manualLithologyOverride = false;

    this._initEnvironmentAndLights();
    this._initGroundAndScaleRef();
    this._initRockMaterial();

    this.rockMesh = null;
    this.wireMesh = null;
    this.wireframeVisible = false;

    this._onResize = () => {
      if (this.active) this.resize();
    };
    window.addEventListener('resize', this._onResize);

    this.active = true;
    this._clock = new THREE.Clock();
    this._raf = 0;
    this._animate = this._animate.bind(this);
    this._animate();
  }

  setActive(flag) {
    this.active = Boolean(flag);
    this.controls.enabled = this.active;
    if (this.active) {
      this._clock.getDelta();
      this.resize();
    }
  }

  getCameraAdapter() {
    this.camera.updateMatrixWorld();
    this.camera.updateProjectionMatrix();
    const vp = new THREE.Matrix4().multiplyMatrices(
      this.camera.projectionMatrix,
      this.camera.matrixWorldInverse
    );
    const e = this.camera.matrixWorld.elements;
    const eye = [this.camera.position.x, this.camera.position.y, this.camera.position.z];
    // Camera world right = +X col, up = +Y col, forward = -Z col
    const right = [e[0], e[1], e[2]];
    const up = [e[4], e[5], e[6]];
    const forward = [-e[8], -e[9], -e[10]];
    const width = this.container.clientWidth || 1;
    const height = this.container.clientHeight || 1;
    const fovDeg = this.camera.fov;

    return {
      viewProj: vp.elements,
      width,
      height,
      eye,
      forward,
      right,
      up,
      fovDeg,
      minWorldY: 0.0,
      baseFloorY: () => 0.0,
      raycastGround: (clientX, clientY) => {
        const rect = this.container.getBoundingClientRect();
        const ndcX = ((clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
        const ndcY = 1 - ((clientY - rect.top) / Math.max(1, rect.height)) * 2;
        const aspect = width / Math.max(1, height);
        const tanHalf = Math.tan((fovDeg * Math.PI) / 360);
        const dx = forward[0] + right[0] * ndcX * aspect * tanHalf + up[0] * ndcY * tanHalf;
        const dy = forward[1] + right[1] * ndcX * aspect * tanHalf + up[1] * ndcY * tanHalf;
        const dz = forward[2] + right[2] * ndcX * aspect * tanHalf + up[2] * ndcY * tanHalf;
        if (Math.abs(dy) < 1e-4) return null;
        const t = -eye[1] / dy;
        if (t < 0) return null;
        return [
          Math.max(-25, Math.min(25, eye[0] + dx * t)),
          0.0,
          Math.max(-25, Math.min(25, eye[2] + dz * t)),
        ];
      },
    };
  }

  _initEnvironmentAndLights() {
    // Subtle procedural studio sky/ground PMREM environment for realistic rough stone micro-specular
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const envScene = new THREE.Scene();
    const envGeo = new THREE.SphereGeometry(20, 24, 16);
    const envMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      vertexShader: `
        varying vec3 vPos;
        void main() {
          vPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vPos;
        void main() {
          float h = normalize(vPos).y;
          vec3 sky = mix(vec3(0.24, 0.27, 0.32), vec3(0.42, 0.50, 0.62), clamp(h, 0.0, 1.0));
          vec3 gnd = vec3(0.14, 0.13, 0.12);
          vec3 col = h >= 0.0 ? sky : mix(vec3(0.20, 0.19, 0.18), gnd, clamp(-h * 2.0, 0.0, 1.0));
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    envScene.add(new THREE.Mesh(envGeo, envMat));
    this.envRT = pmrem.fromScene(envScene, 0.04);
    this.scene.environment = this.envRT.texture;
    this.scene.environmentIntensity = 0.55;
    envGeo.dispose();
    envMat.dispose();
    pmrem.dispose();

    // Key Sun Directional Light
    this.sunLight = new THREE.DirectionalLight('#fff6ea', 2.65);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    this.sunLight.shadow.bias = -0.00035;
    this.sunLight.shadow.normalBias = 0.035;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    // Sky/Ground Hemisphere Fill
    this.hemiLight = new THREE.HemisphereLight('#a9c0db', '#4a433b', 0.62);
    this.scene.add(this.hemiLight);

    // Cool Rim Backlight to separate dark overhangs from background
    this.rimLight = new THREE.DirectionalLight('#8fb0d8', 0.42);
    this.scene.add(this.rimLight);

    this.updateSunPosition();
  }

  _initGroundAndScaleRef() {
    // Studio shadow-catching floor with subtle 1m & 5m scale grid
    const groundGeo = new THREE.CircleGeometry(120, 72);
    groundGeo.rotateX(-Math.PI / 2);

    const groundMat = new THREE.MeshStandardMaterial({
      color: '#1d2127',
      roughness: 0.96,
      metalness: 0.0,
    });
    groundMat.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        '#include <common>\nvarying vec3 vGroundWorld;'
      ).replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvGroundWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;'
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        '#include <common>\nvarying vec3 vGroundWorld;'
      ).replace(
        '#include <color_fragment>',
        `#include <color_fragment>
         vec2 c1 = abs(fract(vGroundWorld.xz - 0.5) - 0.5) / fwidth(vGroundWorld.xz);
         float line1 = 1.0 - min(min(c1.x, c1.y), 1.0);
         vec2 c5 = abs(fract(vGroundWorld.xz * 0.2 - 0.5) - 0.5) / fwidth(vGroundWorld.xz * 0.2);
         float line5 = 1.0 - min(min(c5.x, c5.y), 1.0);
         float distFade = exp(-length(vGroundWorld.xz) * 0.028);
         diffuseColor.rgb += vec3(0.035 * line1 + 0.075 * line5) * distFade;`
      );
    };

    this.groundMesh = new THREE.Mesh(groundGeo, groundMat);
    this.groundMesh.position.y = -0.005;
    this.groundMesh.receiveShadow = true;
    this.scene.add(this.groundMesh);

    // 1.80m Human Scale Reference Figure (essential in AAA environment production!)
    this.scaleHuman = this._buildHumanScaleFigure();
    this.scaleHuman.visible = true;
    this.scene.add(this.scaleHuman);
  }

  _buildHumanScaleFigure() {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
      color: '#d9822b',
      roughness: 0.55,
      metalness: 0.05,
    });

    // Legs (0 .. 0.88m)
    const legGeo = new THREE.CapsuleGeometry(0.075, 0.72, 6, 10);
    const legL = new THREE.Mesh(legGeo, mat);
    legL.position.set(-0.10, 0.44, 0);
    legL.castShadow = true;
    const legR = legL.clone();
    legR.position.x = 0.10;

    // Torso (0.86 .. 1.48m)
    const torsoGeo = new THREE.CapsuleGeometry(0.155, 0.40, 8, 12);
    const torso = new THREE.Mesh(torsoGeo, mat);
    torso.position.set(0, 1.17, 0);
    torso.castShadow = true;

    // Arms
    const armGeo = new THREE.CapsuleGeometry(0.055, 0.52, 6, 8);
    const armL = new THREE.Mesh(armGeo, mat);
    armL.position.set(-0.23, 1.12, 0);
    armL.rotation.z = 0.08;
    armL.castShadow = true;
    const armR = armL.clone();
    armR.position.x = 0.23;
    armR.rotation.z = -0.08;

    // Head (top at 1.80m)
    const headGeo = new THREE.SphereGeometry(0.115, 14, 12);
    const head = new THREE.Mesh(headGeo, mat);
    head.position.set(0, 1.685, 0);
    head.castShadow = true;

    // Base plinth ring (0.5m radius)
    const ringGeo = new THREE.RingGeometry(0.32, 0.36, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({ color: '#d9822b', side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = 0.004;

    group.add(legL, legR, torso, armL, armR, head, ring);
    return group;
  }

  _initRockMaterial() {
    this.rockMaterial = new THREE.MeshStandardMaterial({
      color: '#7b7873',
      roughness: 0.85,
      metalness: 0.0,
      dithering: true,
    });

    this.rockMaterial.onBeforeCompile = (shader) => {
      shader.uniforms.uCurvatureStrength = this.shaderUniforms.uCurvatureStrength;
      shader.uniforms.uAoStrength = this.shaderUniforms.uAoStrength;
      shader.uniforms.uUseVertexAlbedo = this.shaderUniforms.uUseVertexAlbedo;
      shader.uniforms.uDebugMode = this.shaderUniforms.uDebugMode;

      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
           attribute vec4 aRockMask;
           attribute vec3 aRockAlbedo;
           varying vec4 vRockMask;
           varying vec3 vRockAlbedo;
           varying vec3 vWorldNormalViz;`
        )
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
           vRockMask = aRockMask;
           vRockAlbedo = aRockAlbedo;
           vWorldNormalViz = normalize(mat3(modelMatrix) * objectNormal);`
        );

      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
           varying vec4 vRockMask;
           varying vec3 vRockAlbedo;
           varying vec3 vWorldNormalViz;
           uniform float uCurvatureStrength;
           uniform float uAoStrength;
           uniform float uUseVertexAlbedo;
           uniform int uDebugMode;`
        )
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
           if (uUseVertexAlbedo > 0.5) {
             diffuseColor.rgb = vRockAlbedo;
           }
           float edgeCatch = vRockMask.z * 0.065 * uCurvatureStrength;
           float cavityDark = 1.0 - vRockMask.y * 0.16 * uCurvatureStrength;
           diffuseColor.rgb = (diffuseColor.rgb + vec3(edgeCatch)) * cavityDark;`
        )
        .replace(
          '#include <aomap_fragment>',
          `#include <aomap_fragment>
           float vtxAO = mix(1.0, vRockMask.x, uAoStrength);
           reflectedLight.indirectDiffuse *= vtxAO;
           reflectedLight.indirectSpecular *= mix(1.0, vtxAO, 0.8);`
        )
        .replace(
          '#include <dithering_fragment>',
          `#include <dithering_fragment>
           if (uDebugMode == 1) {
             gl_FragColor = vec4(vec3(vRockMask.x), 1.0);
           } else if (uDebugMode == 2) {
             gl_FragColor = vec4(vRockMask.y, vRockMask.z, vRockMask.x, 1.0);
           } else if (uDebugMode == 3) {
             gl_FragColor = vec4(normalize(vWorldNormalViz) * 0.5 + 0.5, 1.0);
           }`
        );
    };

    this.wireMaterial = new THREE.MeshBasicMaterial({
      color: '#11161d',
      wireframe: true,
      transparent: true,
      opacity: 0.26,
      depthTest: true,
    });
  }

  setFormationMesh(meshData, lithology, dims, autoFrame = false) {
    if (this.rockMesh) {
      this.scene.remove(this.rockMesh);
      this.rockMesh.geometry.dispose();
      this.rockMesh = null;
    }
    if (this.wireMesh) {
      this.scene.remove(this.wireMesh);
      this.wireMesh = null;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(meshData.positions, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(meshData.normals, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(meshData.uvs, 2));
    geometry.setAttribute('aRockMask', new THREE.BufferAttribute(meshData.colors, 4));
    const vCount = meshData.positions.length / 3;
    const albedoArr = (meshData.hasCustomAlbedo && meshData.albedos)
      ? meshData.albedos
      : new Float32Array(vCount * 3).fill(0.5);
    geometry.setAttribute('aRockAlbedo', new THREE.BufferAttribute(albedoArr, 3));
    geometry.setIndex(new THREE.BufferAttribute(meshData.indices, 1));
    geometry.computeBoundingSphere();

    this.hasCustomAlbedo = !!(meshData.hasCustomAlbedo && meshData.albedos);
    this.manualLithologyOverride = false;

    this.rockMesh = new THREE.Mesh(geometry, this.rockMaterial);
    this.rockMesh.castShadow = true;
    this.rockMesh.receiveShadow = true;
    this.scene.add(this.rockMesh);

    this.wireMesh = new THREE.Mesh(geometry, this.wireMaterial);
    this.wireMesh.visible = this.wireframeVisible;
    this.scene.add(this.wireMesh);

    this.currentLithology = lithology || 'dolomite';
    this.formationDims = dims || [12, 8, 8];
    this.boundRadius = Math.max(2, geometry.boundingSphere ? geometry.boundingSphere.radius : 8);

    // Place 1.80m human reference neatly off the front-right toe of the formation
    this.scaleHuman.position.set(
      this.formationDims[0] * 0.54 + 0.9,
      0,
      this.formationDims[2] * 0.28
    );

    this._applyShadingUniforms();
    this.updateSunPosition();

    if (autoFrame) {
      this.frameCamera('hero');
    }
  }

  setShadingMode(mode) {
    this.shadingMode = mode;
    this._applyShadingUniforms();
  }

  setLithologyOverride(lithKey) {
    if (lithKey) {
      this.currentLithology = lithKey;
      this.manualLithologyOverride = true;
      this._applyShadingUniforms();
    }
  }

  _applyShadingUniforms() {
    const mode = this.shadingMode;
    this.shaderUniforms.uUseVertexAlbedo.value = 0.0;
    if (mode === 'pure-clay') {
      this.rockMaterial.color.set(LITHOLOGY_PALETTES.pureClay.color);
      this.rockMaterial.roughness = LITHOLOGY_PALETTES.pureClay.roughness;
      this.shaderUniforms.uCurvatureStrength.value = 0.0;
      this.shaderUniforms.uAoStrength.value = 0.85;
      this.shaderUniforms.uDebugMode.value = 0;
    } else if (mode === 'lithology') {
      const pal = LITHOLOGY_PALETTES[this.currentLithology] || LITHOLOGY_PALETTES.neutralStone;
      this.rockMaterial.color.set(pal.color);
      this.rockMaterial.roughness = pal.roughness;
      this.shaderUniforms.uCurvatureStrength.value = 0.88;
      this.shaderUniforms.uAoStrength.value = 0.94;
      this.shaderUniforms.uUseVertexAlbedo.value = (this.hasCustomAlbedo && !this.manualLithologyOverride) ? 1.0 : 0.0;
      this.shaderUniforms.uDebugMode.value = 0;
    } else if (mode === 'ao') {
      this.shaderUniforms.uDebugMode.value = 1;
    } else if (mode === 'curvature') {
      this.shaderUniforms.uDebugMode.value = 2;
    } else if (mode === 'normals') {
      this.shaderUniforms.uDebugMode.value = 3;
    } else {
      // 'flat-stone' default AAA studio stone
      this.rockMaterial.color.set(LITHOLOGY_PALETTES.neutralStone.color);
      this.rockMaterial.roughness = LITHOLOGY_PALETTES.neutralStone.roughness;
      this.shaderUniforms.uCurvatureStrength.value = 0.85;
      this.shaderUniforms.uAoStrength.value = 0.92;
      this.shaderUniforms.uDebugMode.value = 0;
    }
  }

  setSunAngles(azimuthDeg, elevationDeg) {
    this.sunAzimuthDeg = azimuthDeg;
    this.sunElevationDeg = elevationDeg;
    this.updateSunPosition();
  }

  updateSunPosition() {
    const az = (this.sunAzimuthDeg * Math.PI) / 180;
    const el = (Math.max(6, this.sunElevationDeg) * Math.PI) / 180;
    const r = Math.max(18, this.boundRadius * 3.2);
    const targetY = this.formationDims[1] * 0.42;

    const sx = Math.sin(az) * Math.cos(el) * r;
    const sy = targetY + Math.sin(el) * r;
    const sz = Math.cos(az) * Math.cos(el) * r;

    this.sunLight.position.set(sx, sy, sz);
    this.sunLight.target.position.set(0, targetY, 0);
    this.sunLight.target.updateMatrixWorld();

    // Tight shadow frustum scaled to current asset
    const ext = Math.max(4, this.boundRadius * 1.45);
    const cam = this.sunLight.shadow.camera;
    cam.left = -ext;
    cam.right = ext;
    cam.top = ext;
    cam.bottom = -ext;
    cam.near = r * 0.15;
    cam.far = r * 2.4;
    cam.updateProjectionMatrix();
    this.sunLight.shadow.normalBias = this.boundRadius * 0.0032;

    this.rimLight.position.set(-sx * 0.8, targetY + r * 0.45, -sz * 0.8);
  }

  setWireframe(enabled) {
    this.wireframeVisible = !!enabled;
    if (this.wireMesh) this.wireMesh.visible = this.wireframeVisible;
  }

  setScaleHumanVisible(enabled) {
    this.scaleHuman.visible = !!enabled;
  }

  setTurntable(enabled) {
    this.turntable = !!enabled;
  }

  frameCamera(preset = 'hero') {
    const [dx, dy, dz] = this.formationDims;
    const targetY = dy * 0.42;
    this.controls.target.set(0, targetY, 0);

    const dist = Math.max(3.0, this.boundRadius * 2.25);
    let yaw = 0.48, pitch = 0.33;
    if (preset === 'front') { yaw = 0.0; pitch = 0.22; }
    else if (preset === 'side') { yaw = 1.38; pitch = 0.24; }
    else if (preset === 'top') { yaw = 0.25; pitch = 1.28; }
    else if (preset === 'low') { yaw = -0.38; pitch = 0.07; }

    this.camera.position.set(
      Math.sin(yaw) * Math.cos(pitch) * dist,
      targetY + Math.sin(pitch) * dist,
      Math.cos(yaw) * Math.cos(pitch) * dist
    );
    this.controls.update();
  }

  resize() {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  _animate() {
    this._raf = requestAnimationFrame(this._animate);
    if (!this.active) return;
    const dt = this._clock.getDelta();
    if (this.turntable) {
      const offset = this.camera.position.clone().sub(this.controls.target);
      offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), dt * 0.35);
      this.camera.position.copy(this.controls.target).add(offset);
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}

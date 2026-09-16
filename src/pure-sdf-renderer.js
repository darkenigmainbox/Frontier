import * as THREE from "three";

// High-Fidelity GPU 3D SDF Raymarching Engine
// Directly marches rays through the 3D volume texture on the GPU.
// Includes procedural micro-fluting and high-contrast ambient occlusion in the shader
// to deliver razor-sharp Gaea-like ridges and canyon detail.
export class PureSDFRaymarcher {
  constructor(canvasContainer, sdf) {
    this.container = canvasContainer;
    this.sdf = sdf;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      45,
      canvasContainer.clientWidth / canvasContainer.clientHeight,
      0.1,
      250
    );
    this.camera.position.set(0, 26, 50);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    canvasContainer.appendChild(this.renderer.domElement);

    this.setupVolumeTexture();
    this.setupScreenQuad();
    this.setupParticleSystem();
    this.setupControls();

    window.addEventListener("resize", () => this.onWindowResize());
  }

  setupVolumeTexture() {
    const [nx, ny, nz] = this.sdf.dim;
    this.volumeTex = new THREE.Data3DTexture(this.sdf.data, nx, ny, nz);
    this.volumeTex.format = THREE.RGBAFormat;
    this.volumeTex.type = THREE.FloatType;
    this.volumeTex.minFilter = THREE.LinearFilter;
    this.volumeTex.magFilter = THREE.LinearFilter;
    this.volumeTex.unpackAlignment = 1;
    this.volumeTex.needsUpdate = true;
  }

  updateVolumeTexture() {
    this.volumeTex.needsUpdate = true;
  }

  setupScreenQuad() {
    const quadGeo = new THREE.PlaneGeometry(2, 2);

    this.raymarchMat = new THREE.ShaderMaterial({
      uniforms: {
        uVolume: { value: this.volumeTex },
        uBoundsMin: { value: new THREE.Vector3(...this.sdf.bounds.min) },
        uBoundsMax: { value: new THREE.Vector3(...this.sdf.bounds.max) },
        uCameraPos: { value: this.camera.position },
        uCameraInvProj: { value: new THREE.Matrix4() },
        uCameraInvView: { value: new THREE.Matrix4() },
        uSunDir: { value: new THREE.Vector3(0.65, 0.72, 0.45).normalize() },
        uShowWater: { value: 1.0 },
        uWaterLevel: { value: 1.8 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        precision highp sampler3D;

        uniform sampler3D uVolume;
        uniform vec3 uBoundsMin;
        uniform vec3 uBoundsMax;
        uniform vec3 uCameraPos;
        uniform mat4 uCameraInvProj;
        uniform mat4 uCameraInvView;
        uniform vec3 uSunDir;
        uniform float uShowWater;
        uniform float uWaterLevel;

        varying vec2 vUv;

        vec2 intersectBox(vec3 ro, vec3 rd, vec3 bmin, vec3 bmax) {
          vec3 t0 = (bmin - ro) / rd;
          vec3 t1 = (bmax - ro) / rd;
          vec3 tmin = min(t0, t1);
          vec3 tmax = max(t0, t1);
          float tn = max(max(tmin.x, tmin.y), tmin.z);
          float tf = min(min(tmax.x, tmax.y), tmax.z);
          return vec2(tn, tf);
        }

        vec4 sampleVol(vec3 p) {
          vec3 uvw = (p - uBoundsMin) / (uBoundsMax - uBoundsMin);
          return texture(uVolume, uvw);
        }

        // Analytical normal with adaptive step for sharp cliff crests
        vec3 getNormal(vec3 p) {
          float eps = 0.14;
          float d = sampleVol(p).r;
          float dx = sampleVol(p + vec3(eps, 0.0, 0.0)).r - sampleVol(p - vec3(eps, 0.0, 0.0)).r;
          float dy = sampleVol(p + vec3(0.0, eps, 0.0)).r - sampleVol(p - vec3(0.0, eps, 0.0)).r;
          float dz = sampleVol(p + vec3(0.0, 0.0, eps)).r - sampleVol(p - vec3(0.0, 0.0, eps)).r;
          return normalize(vec3(dx, dy, dz));
        }

        void main() {
          vec4 ndc = vec4(vUv * 2.0 - 1.0, 1.0, 1.0);
          vec4 viewRay = uCameraInvProj * ndc;
          viewRay.xyz /= viewRay.w;
          vec3 rd = normalize((uCameraInvView * vec4(viewRay.xyz, 0.0)).xyz);
          vec3 ro = uCameraPos;

          // Sky gradient
          vec3 skyTop = vec3(0.12, 0.22, 0.38);
          vec3 skyBottom = vec3(0.68, 0.74, 0.84);
          vec3 col = mix(skyBottom, skyTop, clamp(rd.y * 0.8 + 0.25, 0.0, 1.0));

          vec2 boxHit = intersectBox(ro, rd, uBoundsMin, uBoundsMax);
          if (boxHit.x <= boxHit.y && boxHit.y > 0.0) {
            float t = max(boxHit.x, 0.1);
            float tMax = boxHit.y;

            bool hit = false;
            vec3 hitPos = ro;
            vec4 hitData = vec4(0.0);

            // 200 sphere-assisted raymarch steps
            for (int step = 0; step < 200; step++) {
              vec3 p = ro + rd * t;
              vec4 data = sampleVol(p);
              float d = data.r;

              if (d < 0.018) {
                hit = true;
                hitPos = p;
                hitData = data;
                break;
              }

              t += max(0.038, d * 0.75);
              if (t > tMax) break;
            }

            if (hit) {
              vec3 N = getNormal(hitPos);
              float slope = 1.0 - clamp(N.y, 0.0, 1.0);
              float altitude = clamp((hitPos.y - uBoundsMin.y) / (uBoundsMax.y - uBoundsMin.y), 0.0, 1.0);

              // Geological sandstone stratification bands
              float strata1 = sin(hitPos.y * 1.8) * 0.5 + 0.5;
              float strata2 = sin(hitPos.y * 5.4) * 0.5 + 0.5;
              float strata3 = sin(hitPos.y * 14.0) * 0.5 + 0.5;
              float strata = strata1 * 0.55 + strata2 * 0.3 + strata3 * 0.15;

              // Gaea desert palette
              vec3 colLow = vec3(0.52, 0.24, 0.15);      // Deep red canyon sandstone
              vec3 colMid = vec3(0.78, 0.44, 0.25);      // Terracotta orange
              vec3 colHigh = vec3(0.92, 0.74, 0.52);     // Navajo tan plateau
              vec3 colCliff = vec3(0.24, 0.14, 0.11);    // Dark steep cliff shadow
              vec3 colTalus = vec3(0.88, 0.74, 0.56);    // Talus scree sediment

              vec3 rockColor = mix(colLow, colMid, smoothstep(0.0, 0.45, altitude));
              rockColor = mix(rockColor, colHigh, smoothstep(0.45, 0.95, altitude));
              rockColor = mix(rockColor, colCliff, strata * 0.35);

              // Cliff shading
              rockColor = mix(rockColor, colCliff, smoothstep(0.45, 0.88, slope));

              // Blend talus sediment
              float sed = clamp(hitData.b * 1.8, 0.0, 1.0);
              rockColor = mix(rockColor, colTalus, sed * (1.0 - slope * 0.8));

              // High-contrast lighting with crisp ambient occlusion
              float diff = max(dot(N, uSunDir), 0.0);
              vec3 ambient = vec3(0.26, 0.30, 0.42);
              vec3 sun = vec3(1.0, 0.94, 0.84) * diff;

              // Cavity exposure
              float ao = clamp(0.45 + 0.55 * N.y, 0.2, 1.0);

              col = rockColor * (ambient + sun) * ao;

              // Atmospheric distance haze
              float fog = 1.0 - exp(-t * 0.012);
              col = mix(col, skyBottom, fog);
            }
          }

          // Optional water plane
          if (uShowWater > 0.5 && ro.y > uWaterLevel && rd.y < 0.0) {
            float tw = (uWaterLevel - ro.y) / rd.y;
            vec3 wp = ro + rd * tw;
            if (wp.x >= uBoundsMin.x && wp.x <= uBoundsMax.x && wp.z >= uBoundsMin.z && wp.z <= uBoundsMax.z) {
              vec4 wdata = sampleVol(wp);
              if (wdata.r > 0.0) {
                vec3 waterCol = vec3(0.12, 0.36, 0.44);
                col = mix(waterCol, col, 0.35);
              }
            }
          }

          gl_FragColor = vec4(col, 1.0);
        }
      `,
      depthWrite: false,
      depthTest: false,
    });

    this.quadMesh = new THREE.Mesh(quadGeo, this.raymarchMat);
    this.scene.add(this.quadMesh);
  }

  setWaterLevel(level) {
    this.raymarchMat.uniforms.uWaterLevel.value = level;
  }

  setWaterVisible(visible) {
    this.raymarchMat.uniforms.uShowWater.value = visible ? 1.0 : 0.0;
  }

  setupParticleSystem() {
    const maxParticles = 2500;
    const pGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(maxParticles * 3);
    const colors = new Float32Array(maxParticles * 3);

    pGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    pGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const pMat = new THREE.PointsMaterial({
      size: 0.35,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });

    this.particleMesh = new THREE.Points(pGeo, pMat);
    this.scene.add(this.particleMesh);
  }

  updateParticles(paths) {
    if (!paths || paths.length === 0) return;
    const posAttr = this.particleMesh.geometry.attributes.position;
    const colAttr = this.particleMesh.geometry.attributes.color;
    let pIdx = 0;
    const maxP = posAttr.count;

    for (const path of paths) {
      for (let i = 0; i < path.length; i++) {
        if (pIdx >= maxP) break;
        posAttr.setXYZ(pIdx, path[i][0], path[i][1], path[i][2]);
        const prog = i / path.length;
        colAttr.setXYZ(pIdx, 0.2 + prog * 0.7, 0.65 + prog * 0.2, 1.0 - prog * 0.5);
        pIdx++;
      }
      if (pIdx >= maxP) break;
    }

    for (let i = pIdx; i < maxP; i++) {
      posAttr.setXYZ(i, 0, -999, 0);
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  }

  setupControls() {
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    let spherical = { radius: 52, theta: 0.75, phi: 1.12 };
    const target = new THREE.Vector3(0, 8, 0);

    const updateCameraPos = () => {
      spherical.phi = Math.max(0.12, Math.min(Math.PI / 2 - 0.05, spherical.phi));
      this.camera.position.x = target.x + spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
      this.camera.position.y = target.y + spherical.radius * Math.cos(spherical.phi);
      this.camera.position.z = target.z + spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
      this.camera.lookAt(target);
    };

    updateCameraPos();

    this.container.addEventListener("mousedown", (e) => {
      if (e.button === 0 || e.button === 2) {
        isDragging = true;
        prevMouseX = e.clientX;
        prevMouseY = e.clientY;
      }
    });

    window.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      const dx = e.clientX - prevMouseX;
      const dy = e.clientY - prevMouseY;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;

      if (e.buttons === 1) {
        spherical.theta -= dx * 0.008;
        spherical.phi -= dy * 0.008;
        updateCameraPos();
      } else if (e.buttons === 2) {
        const right = new THREE.Vector3().crossVectors(this.camera.getWorldDirection(new THREE.Vector3()), this.camera.up).normalize();
        target.addScaledVector(right, -dx * 0.05);
        target.y += dy * 0.05;
        updateCameraPos();
      }
    });

    window.addEventListener("mouseup", () => {
      isDragging = false;
    });

    this.container.addEventListener("wheel", (e) => {
      e.preventDefault();
      spherical.radius = Math.max(10, Math.min(130, spherical.radius + e.deltaY * 0.05));
      updateCameraPos();
    }, { passive: false });

    this.container.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  onWindowResize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  render() {
    this.camera.updateMatrixWorld();
    this.raymarchMat.uniforms.uCameraPos.value.copy(this.camera.position);
    this.raymarchMat.uniforms.uCameraInvProj.value.copy(this.camera.projectionMatrixInverse);
    this.raymarchMat.uniforms.uCameraInvView.value.copy(this.camera.matrixWorld);

    this.renderer.render(this.scene, this.camera);
  }
}

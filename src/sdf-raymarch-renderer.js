import * as THREE from "three";

// Pure Volumetric 3D SDF Raymarching Viewport
// Renders the terrain directly by raymarching into a 3D Data3DTexture on the GPU.
// No polygon mesh is used: fully supports true 3D arches, undercuts, caves, and overhangs in XY/Z!
export class SDFRaymarchRenderer {
  constructor(canvasContainer, sdfVolume) {
    this.container = canvasContainer;
    this.sdf = sdfVolume;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      45,
      canvasContainer.clientWidth / canvasContainer.clientHeight,
      0.1,
      200
    );
    this.camera.position.set(0, 24, 46);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    canvasContainer.appendChild(this.renderer.domElement);

    this.setup3DTexture();
    this.setupRaymarchScreenQuad();
    this.setupParticleSystem();
    this.setupControls();

    window.addEventListener("resize", () => this.onWindowResize());
  }

  setup3DTexture() {
    const [nx, ny, nz] = this.sdf.dim;

    // Create 3D Data Texture on GPU (RGBA Float)
    this.texture3D = new THREE.Data3DTexture(this.sdf.data, nx, ny, nz);
    this.texture3D.format = THREE.RGBAFormat;
    this.texture3D.type = THREE.FloatType;
    this.texture3D.minFilter = THREE.LinearFilter;
    this.texture3D.magFilter = THREE.LinearFilter;
    this.texture3D.unpackAlignment = 1;
    this.texture3D.needsUpdate = true;
  }

  update3DTexture() {
    this.texture3D.needsUpdate = true;
  }

  setupRaymarchScreenQuad() {
    // Fullscreen quad for volumetric raymarching
    const quadGeo = new THREE.PlaneGeometry(2, 2);

    this.raymarchMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uSDFVolume: { value: this.texture3D },
        uBoundsMin: { value: new THREE.Vector3(...this.sdf.bounds.min) },
        uBoundsMax: { value: new THREE.Vector3(...this.sdf.bounds.max) },
        uCameraPos: { value: this.camera.position },
        uCameraInvProj: { value: new THREE.Matrix4() },
        uCameraInvView: { value: new THREE.Matrix4() },
        uSunDir: { value: new THREE.Vector3(0.6, 0.7, 0.5).normalize() },
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

        uniform sampler3D uSDFVolume;
        uniform vec3 uBoundsMin;
        uniform vec3 uBoundsMax;
        uniform vec3 uCameraPos;
        uniform mat4 uCameraInvProj;
        uniform mat4 uCameraInvView;
        uniform vec3 uSunDir;
        uniform float uShowWater;
        uniform float uWaterLevel;

        varying vec2 vUv;

        // Bounding box intersection
        vec2 rayBoxIntersect(vec3 ro, vec3 rd, vec3 bmin, vec3 bmax) {
          vec3 t0 = (bmin - ro) / rd;
          vec3 t1 = (bmax - ro) / rd;
          vec3 tmin = min(t0, t1);
          vec3 tmax = max(t0, t1);
          float tn = max(max(tmin.x, tmin.y), tmin.z);
          float tf = min(min(tmax.x, tmax.y), tmax.z);
          return vec2(tn, tf);
        }

        // Sample 3D SDF volume texture
        vec4 sampleVolume(vec3 p) {
          vec3 uvw = (p - uBoundsMin) / (uBoundsMax - uBoundsMin);
          return texture(uSDFVolume, uvw);
        }

        // Central difference normal for pixel-sharp canyon edges
        vec3 calcNormal(vec3 p) {
          float eps = 0.18;
          float d = sampleVolume(p).r;
          float dx = sampleVolume(p + vec3(eps, 0.0, 0.0)).r - sampleVolume(p - vec3(eps, 0.0, 0.0)).r;
          float dy = sampleVolume(p + vec3(0.0, eps, 0.0)).r - sampleVolume(p - vec3(0.0, eps, 0.0)).r;
          float dz = sampleVolume(p + vec3(0.0, 0.0, eps)).r - sampleVolume(p - vec3(0.0, 0.0, eps)).r;
          return normalize(vec3(dx, dy, dz));
        }

        void main() {
          // Reconstruct camera ray from screen quad UV
          vec4 ndc = vec4(vUv * 2.0 - 1.0, 1.0, 1.0);
          vec4 viewRay = uCameraInvProj * ndc;
          viewRay.xyz /= viewRay.w;
          vec3 rd = normalize((uCameraInvView * vec4(viewRay.xyz, 0.0)).xyz);
          vec3 ro = uCameraPos;

          // Sky background
          vec3 skyTop = vec3(0.12, 0.22, 0.38);
          vec3 skyBottom = vec3(0.65, 0.72, 0.82);
          vec3 col = mix(skyBottom, skyTop, clamp(rd.y * 0.8 + 0.2, 0.0, 1.0));

          // Intersect with 3D SDF bounding box
          vec2 boxHit = rayBoxIntersect(ro, rd, uBoundsMin, uBoundsMax);
          if (boxHit.x <= boxHit.y && boxHit.y > 0.0) {
            float t = max(boxHit.x, 0.1);
            float tMax = boxHit.y;

            bool hit = false;
            vec3 hitPos = ro;
            vec4 hitData = vec4(0.0);

            // High precision sphere-assisted volumetric raymarching
            for (int step = 0; step < 180; step++) {
              vec3 p = ro + rd * t;
              vec4 data = sampleVolume(p);
              float d = data.r; // signed distance

              if (d < 0.02) {
                hit = true;
                hitPos = p;
                hitData = data;
                break;
              }

              // Step forward proportionally to distance, with minimum step to prevent tunneling
              t += max(0.045, d * 0.72);
              if (t > tMax) break;
            }

            if (hit) {
              vec3 N = calcNormal(hitPos);
              float slope = 1.0 - clamp(N.y, 0.0, 1.0); // cliff steepness
              float altitude = clamp((hitPos.y - uBoundsMin.y) / (uBoundsMax.y - uBoundsMin.y), 0.0, 1.0);

              // Terraced sedimentary strata bands
              float strata = sin(hitPos.y * 2.4) * 0.5 + 0.5;
              float strataFine = sin(hitPos.y * 7.0) * 0.5 + 0.5;

              // Desert rock palette (Grand Canyon / Bryce Spire sandstone)
              vec3 colLow = vec3(0.55, 0.26, 0.16);     // Dark red sandstone
              vec3 colMid = vec3(0.82, 0.48, 0.28);     // Terracotta orange
              vec3 colHigh = vec3(0.92, 0.74, 0.52);    // Navajo tan sandstone
              vec3 colCliff = vec3(0.28, 0.18, 0.14);   // Deep shadow cliff face
              vec3 colTalus = vec3(0.88, 0.72, 0.54);   // Sandy scree sediment

              vec3 rockColor = mix(colLow, colMid, smoothstep(0.0, 0.5, altitude));
              rockColor = mix(rockColor, colHigh, smoothstep(0.5, 1.0, altitude));
              rockColor = mix(rockColor, colCliff, strata * 0.35 + strataFine * 0.15);

              // Darken steep vertical cliff drops
              rockColor = mix(rockColor, colCliff, smoothstep(0.5, 0.9, slope));

              // Blend loose sediment (talus/sand deposited by erosion)
              float sediment = clamp(hitData.b * 1.6, 0.0, 1.0);
              rockColor = mix(rockColor, colTalus, sediment * (1.0 - slope * 0.8));

              // Lighting & Sun Diffuse
              float diff = max(dot(N, uSunDir), 0.0);
              vec3 ambient = vec3(0.22, 0.26, 0.35);
              vec3 sunLight = vec3(1.0, 0.95, 0.85) * diff;

              // Soft ambient occlusion based on upward exposure
              float ao = clamp(0.5 + 0.5 * N.y, 0.25, 1.0);

              col = rockColor * (ambient + sunLight) * ao;

              // Atmospheric distance fog
              float fog = 1.0 - exp(-t * 0.012);
              col = mix(col, skyBottom, fog);
            }
          }

          // Optional water plane in canyon base
          if (uShowWater > 0.5 && ro.y > uWaterLevel && rd.y < 0.0) {
            float tw = (uWaterLevel - ro.y) / rd.y;
            vec3 wp = ro + rd * tw;
            if (wp.x >= uBoundsMin.x && wp.x <= uBoundsMax.x && wp.z >= uBoundsMin.z && wp.z <= uBoundsMax.z) {
              vec4 waterSdf = sampleVolume(wp);
              if (waterSdf.r > 0.0) { // only show water in open air
                vec3 waterCol = vec3(0.12, 0.35, 0.42);
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

    this.quadMesh = new THREE.Mesh(quadGeo, this.raymarchMaterial);
    this.scene.add(this.quadMesh);
  }

  setWaterLevel(level) {
    this.raymarchMaterial.uniforms.uWaterLevel.value = level;
  }

  setWaterVisible(visible) {
    this.raymarchMaterial.uniforms.uShowWater.value = visible ? 1.0 : 0.0;
  }

  setupParticleSystem() {
    const maxParticles = 2500;
    const pGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(maxParticles * 3);
    const colors = new Float32Array(maxParticles * 3);

    pGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    pGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const pMat = new THREE.PointsMaterial({
      size: 0.4,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    });

    this.particleMesh = new THREE.Points(pGeo, pMat);
    this.scene.add(this.particleMesh);
  }

  updateParticles(activeParticlePaths) {
    if (!activeParticlePaths || activeParticlePaths.length === 0) return;

    const posAttr = this.particleMesh.geometry.attributes.position;
    const colAttr = this.particleMesh.geometry.attributes.color;
    let pIdx = 0;
    const maxP = posAttr.count;

    for (const path of activeParticlePaths) {
      for (let i = 0; i < path.length; i++) {
        if (pIdx >= maxP) break;
        const pt = path[i];
        posAttr.setXYZ(pIdx, pt[0], pt[1], pt[2]);

        const progress = i / path.length;
        colAttr.setXYZ(pIdx, 0.2 + progress * 0.7, 0.65 + progress * 0.2, 1.0 - progress * 0.5);
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

    let spherical = {
      radius: 54,
      theta: 0.75,
      phi: 1.15,
    };

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

      if (e.buttons === 1) { // Left click: orbit
        spherical.theta -= dx * 0.008;
        spherical.phi -= dy * 0.008;
        updateCameraPos();
      } else if (e.buttons === 2) { // Right click: pan
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
    // Update raymarching camera uniforms
    this.camera.updateMatrixWorld();
    this.raymarchMaterial.uniforms.uCameraPos.value.copy(this.camera.position);
    this.raymarchMaterial.uniforms.uCameraInvProj.value.copy(this.camera.projectionMatrixInverse);
    this.raymarchMaterial.uniforms.uCameraInvView.value.copy(this.camera.matrixWorld);

    this.renderer.render(this.scene, this.camera);
  }
}

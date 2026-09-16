import * as THREE from "three";

export class TerrainRenderer {
  constructor(canvasContainer, terrain) {
    this.container = canvasContainer;
    this.terrain = terrain;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x121720);
    this.scene.fog = new THREE.FogExp2(0x121720, 0.012);

    this.camera = new THREE.PerspectiveCamera(
      45,
      canvasContainer.clientWidth / canvasContainer.clientHeight,
      0.1,
      500
    );
    this.camera.position.set(0, 32, 48);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    canvasContainer.appendChild(this.renderer.domElement);

    this.setupLighting();
    this.setupWaterPlane();
    this.createTerrainMesh();
    this.setupParticleSystem();
    this.setupControls();

    window.addEventListener("resize", () => this.onWindowResize());
  }

  setupLighting() {
    const ambient = new THREE.AmbientLight(0xdde8ff, 0.55);
    this.scene.add(ambient);

    // Warm directional sun light for dramatic canyon relief
    this.sunLight = new THREE.DirectionalLight(0xfff1dc, 2.4);
    this.sunLight.position.set(35, 45, 30);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 140;
    this.sunLight.shadow.camera.left = -40;
    this.sunLight.shadow.camera.right = 40;
    this.sunLight.shadow.camera.top = 40;
    this.sunLight.shadow.camera.bottom = -40;
    this.sunLight.shadow.bias = -0.0004;
    this.scene.add(this.sunLight);

    // Subtle blue sky fill light
    const skyFill = new THREE.DirectionalLight(0x7fb2e5, 0.65);
    skyFill.position.set(-30, 25, -30);
    this.scene.add(skyFill);
  }

  setupWaterPlane() {
    const geo = new THREE.PlaneGeometry(60, 60, 64, 64);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x1f4e5b,
      roughness: 0.1,
      metalness: 0.2,
      transparent: true,
      opacity: 0.75,
    });
    this.waterMesh = new THREE.Mesh(geo, mat);
    this.waterMesh.position.y = 1.8;
    this.scene.add(this.waterMesh);
  }

  setWaterLevel(level) {
    this.waterMesh.position.y = level;
  }

  setWaterVisible(visible) {
    this.waterMesh.visible = visible;
  }

  createTerrainMesh() {
    const N = this.terrain.res;
    const { xMin, xMax, zMin, zMax } = this.terrain.bounds;

    const geometry = new THREE.PlaneGeometry(xMax - xMin, zMax - zMin, N - 1, N - 1);
    geometry.rotateX(-Math.PI / 2); // align to XZ

    // Custom shader material for Gaea-style multi-strata rock, sediment, and cliff texturing
    const terrainMaterial = new THREE.ShaderMaterial({
      uniforms: {
        lightDir: { value: new THREE.Vector3(0.6, 0.7, 0.5).normalize() },
        ambientColor: { value: new THREE.Color(0x303b4d) },
        sunColor: { value: new THREE.Color(0xfff3e3) },
        colorBedrockLow: { value: new THREE.Color(0x8a482b) },    // Red sandstone
        colorBedrockMid: { value: new THREE.Color(0xc9824f) },    // Desert orange rock
        colorBedrockHigh: { value: new THREE.Color(0xd9b382) },   // Navajo tan sandstone
        colorCliff: { value: new THREE.Color(0x42291d) },         // Steep eroded canyon wall
        colorSediment: { value: new THREE.Color(0xdeb887) },      // Sandy talus sediment
        colorGully: { value: new THREE.Color(0x2d211a) },         // Damp valley grooves
      },
      vertexShader: `
        attribute float aSediment;
        attribute float aHardness;
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        varying float vSediment;
        varying float vHardness;

        void main() {
          vNormal = normal;
          vSediment = aSediment;
          vHardness = aHardness;
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPos = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform vec3 lightDir;
        uniform vec3 ambientColor;
        uniform vec3 sunColor;
        uniform vec3 colorBedrockLow;
        uniform vec3 colorBedrockMid;
        uniform vec3 colorBedrockHigh;
        uniform vec3 colorCliff;
        uniform vec3 colorSediment;
        uniform vec3 colorGully;

        varying vec3 vNormal;
        varying vec3 vWorldPos;
        varying float vSediment;
        varying float vHardness;

        void main() {
          vec3 N = normalize(vNormal);
          float slope = 1.0 - clamp(N.y, 0.0, 1.0); // 0 = flat, 1 = vertical cliff
          float altitude = clamp((vWorldPos.y) / 22.0, 0.0, 1.0);

          // Terraced strata bands (stratigraphic rock banding)
          float strata = sin(vWorldPos.y * 2.2) * 0.5 + 0.5;
          float strataFine = sin(vWorldPos.y * 6.5) * 0.5 + 0.5;

          // Base rock color blend
          vec3 rockColor = mix(colorBedrockLow, colorBedrockMid, smoothstep(0.0, 0.5, altitude));
          rockColor = mix(rockColor, colorBedrockHigh, smoothstep(0.5, 1.0, altitude));
          rockColor = mix(rockColor, colorCliff, strata * 0.35 + strataFine * 0.15);

          // Canyon cliff shadow on steep drops
          rockColor = mix(rockColor, colorCliff, smoothstep(0.45, 0.85, slope));

          // Deposited sediment in gullies & valley basins
          float sedFactor = clamp(vSediment * 1.8, 0.0, 1.0);
          vec3 surfaceColor = mix(rockColor, colorSediment, sedFactor * (1.0 - slope * 0.7));

          // Diffuse lighting + Ambient
          float diff = max(dot(N, lightDir), 0.0);
          float halfLambert = diff * 0.5 + 0.5;
          vec3 lighting = ambientColor + sunColor * (diff * 0.85 + 0.15);

          // Strata cavity ambient occlusion
          float ao = clamp(0.7 + 0.3 * N.y, 0.2, 1.0);

          vec3 finalColor = surfaceColor * lighting * ao;
          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
    });

    // Custom attributes for sediment & hardness
    const sedimentAttr = new Float32Array(N * N);
    const hardnessAttr = new Float32Array(N * N);
    geometry.setAttribute("aSediment", new THREE.BufferAttribute(sedimentAttr, 1));
    geometry.setAttribute("aHardness", new THREE.BufferAttribute(hardnessAttr, 1));

    this.terrainMesh = new THREE.Mesh(geometry, terrainMaterial);
    this.terrainMesh.receiveShadow = true;
    this.terrainMesh.castShadow = true;
    this.scene.add(this.terrainMesh);

    this.updateGeometry();
  }

  updateGeometry() {
    const N = this.terrain.res;
    const pos = this.terrainMesh.geometry.attributes.position;
    const sedAttr = this.terrainMesh.geometry.attributes.aSediment;
    const hardAttr = this.terrainMesh.geometry.attributes.aHardness;

    // In Three.js PlaneGeometry(w, h, N-1, N-1) rotated X(-PI/2):
    // vertices are ordered row by row
    let idx = 0;
    for (let iz = 0; iz < N; iz++) {
      for (let ix = 0; ix < N; ix++) {
        const gridIdx = iz * N + ix;
        pos.setY(idx, this.terrain.height[gridIdx]);
        sedAttr.setX(idx, this.terrain.sediment[gridIdx]);
        hardAttr.setX(idx, this.terrain.hardness[gridIdx]);
        idx++;
      }
    }

    pos.needsUpdate = true;
    sedAttr.needsUpdate = true;
    hardAttr.needsUpdate = true;

    this.terrainMesh.geometry.computeVertexNormals();
  }

  setupParticleSystem() {
    const maxParticles = 3000;
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
    this.particleMesh.visible = true;
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

        // Blue water droplet fading to turquoise/tan sediment
        const progress = i / path.length;
        colAttr.setXYZ(pIdx, 0.2 + progress * 0.6, 0.6 + progress * 0.3, 0.95 - progress * 0.4);
        pIdx++;
      }
      if (pIdx >= maxP) break;
    }

    for (let i = pIdx; i < maxP; i++) {
      posAttr.setXYZ(i, 0, -999, 0); // hide unused
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  }

  setupControls() {
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    let spherical = {
      radius: 55,
      theta: 0.8,  // azimuth
      phi: 1.1,    // polar
    };

    const target = new THREE.Vector3(0, 6, 0);

    const updateCameraPos = () => {
      spherical.phi = Math.max(0.15, Math.min(Math.PI / 2 - 0.05, spherical.phi));
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
      spherical.radius = Math.max(12, Math.min(120, spherical.radius + e.deltaY * 0.05));
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
    this.renderer.render(this.scene, this.camera);
  }
}

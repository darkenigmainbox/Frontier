import * as THREE from "three";

// High-Definition Photorealistic Viewport for GAEA-Quality Terrain & Erosion
export class HighDefTerrainRenderer {
  constructor(canvasContainer, terrain) {
    this.container = canvasContainer;
    this.terrain = terrain;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f141d);
    this.scene.fog = new THREE.FogExp2(0x0f141d, 0.009);

    this.camera = new THREE.PerspectiveCamera(
      45,
      canvasContainer.clientWidth / canvasContainer.clientHeight,
      0.1,
      600
    );
    this.camera.position.set(0, 32, 52);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    canvasContainer.appendChild(this.renderer.domElement);

    this.setupLighting();
    this.setupWaterPlane();
    this.createTerrainMesh();
    this.setupParticleSystem();
    this.setupControls();

    window.addEventListener("resize", () => this.onWindowResize());
  }

  setupLighting() {
    const ambient = new THREE.AmbientLight(0xdbe6f6, 0.5);
    this.scene.add(ambient);

    // Warm high-contrast directional sun for sharp canyon shadow relief
    this.sunLight = new THREE.DirectionalLight(0xffeedd, 2.8);
    this.sunLight.position.set(40, 50, 32);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 150;
    this.sunLight.shadow.camera.left = -45;
    this.sunLight.shadow.camera.right = 45;
    this.sunLight.shadow.camera.top = 45;
    this.sunLight.shadow.camera.bottom = -45;
    this.sunLight.shadow.bias = -0.0003;
    this.scene.add(this.sunLight);

    // Cyan sky bounce fill
    const skyFill = new THREE.DirectionalLight(0x7fb5e6, 0.7);
    skyFill.position.set(-35, 30, -35);
    this.scene.add(skyFill);
  }

  setupWaterPlane() {
    const geo = new THREE.PlaneGeometry(64, 64, 64, 64);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x1a4652,
      roughness: 0.1,
      metalness: 0.15,
      transparent: true,
      opacity: 0.8,
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
    const { min, max } = this.terrain.bounds;
    const width = max[0] - min[0];
    const depth = max[2] - min[2];

    const geometry = new THREE.PlaneGeometry(width, depth, N - 1, N - 1);
    geometry.rotateX(-Math.PI / 2);

    // High-fidelity Gaea-style shader with sedimentary strata, cliff carving, and talus sediment
    const material = new THREE.ShaderMaterial({
      uniforms: {
        lightDir: { value: new THREE.Vector3(0.6, 0.7, 0.5).normalize() },
        ambientColor: { value: new THREE.Color(0x2d3748) },
        sunColor: { value: new THREE.Color(0xfff3e3) },
        colLow: { value: new THREE.Color(0x7a3922) },       // Deep red canyon sandstone
        colMid: { value: new THREE.Color(0xb86c3b) },       // Desert terracotta rock
        colHigh: { value: new THREE.Color(0xd9ab79) },      // Navajo tan plateau sandstone
        colCliff: { value: new THREE.Color(0x382218) },     // Deep dark eroded cliff
        colTalus: { value: new THREE.Color(0xdeb887) },     // Sandy talus scree sediment
        colFlow: { value: new THREE.Color(0x231812) },      // Damp stream bed rills
      },
      vertexShader: `
        attribute float aSediment;
        attribute float aErosion;
        attribute float aHardness;
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        varying float vSediment;
        varying float vErosion;
        varying float vHardness;

        void main() {
          vNormal = normal;
          vSediment = aSediment;
          vErosion = aErosion;
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
        uniform vec3 colLow;
        uniform vec3 colMid;
        uniform vec3 colHigh;
        uniform vec3 colCliff;
        uniform vec3 colTalus;
        uniform vec3 colFlow;

        varying vec3 vNormal;
        varying vec3 vWorldPos;
        varying float vSediment;
        varying float vErosion;
        varying float vHardness;

        void main() {
          vec3 N = normalize(vNormal);
          float slope = 1.0 - clamp(N.y, 0.0, 1.0);
          float altitude = clamp((vWorldPos.y) / 24.0, 0.0, 1.0);

          // Fine sedimentary rock strata banding
          float strata1 = sin(vWorldPos.y * 1.8) * 0.5 + 0.5;
          float strata2 = sin(vWorldPos.y * 5.2) * 0.5 + 0.5;
          float strata3 = sin(vWorldPos.y * 12.0) * 0.5 + 0.5;
          float strata = strata1 * 0.6 + strata2 * 0.3 + strata3 * 0.1;

          // Color blend based on altitude
          vec3 rockColor = mix(colLow, colMid, smoothstep(0.0, 0.45, altitude));
          rockColor = mix(rockColor, colHigh, smoothstep(0.45, 0.95, altitude));
          rockColor = mix(rockColor, colCliff, strata * 0.3);

          // Steep cliff wall shading
          rockColor = mix(rockColor, colCliff, smoothstep(0.42, 0.85, slope));

          // Carved erosion flow channels (damp darker rock in deep gullies)
          float erosionCarve = clamp(vErosion * 2.2, 0.0, 1.0);
          rockColor = mix(rockColor, colFlow, erosionCarve * 0.55);

          // Loose sediment accumulation (scree / talus slopes)
          float sedFactor = clamp(vSediment * 2.0, 0.0, 1.0);
          vec3 surfaceColor = mix(rockColor, colTalus, sedFactor * (1.0 - slope * 0.75));

          // Lighting
          float diff = max(dot(N, lightDir), 0.0);
          vec3 lighting = ambientColor + sunColor * (diff * 0.88 + 0.12);

          // Cavity ambient occlusion
          float ao = clamp(0.65 + 0.35 * N.y, 0.25, 1.0);

          gl_FragColor = vec4(surfaceColor * lighting * ao, 1.0);
        }
      `,
    });

    const sedimentAttr = new Float32Array(N * N);
    const erosionAttr = new Float32Array(N * N);
    const hardnessAttr = new Float32Array(N * N);

    geometry.setAttribute("aSediment", new THREE.BufferAttribute(sedimentAttr, 1));
    geometry.setAttribute("aErosion", new THREE.BufferAttribute(erosionAttr, 1));
    geometry.setAttribute("aHardness", new THREE.BufferAttribute(hardnessAttr, 1));

    this.terrainMesh = new THREE.Mesh(geometry, material);
    this.terrainMesh.receiveShadow = true;
    this.terrainMesh.castShadow = true;
    this.scene.add(this.terrainMesh);

    this.updateGeometry();
  }

  updateGeometry() {
    const N = this.terrain.res;
    const pos = this.terrainMesh.geometry.attributes.position;
    const sedAttr = this.terrainMesh.geometry.attributes.aSediment;
    const eroAttr = this.terrainMesh.geometry.attributes.aErosion;
    const hardAttr = this.terrainMesh.geometry.attributes.aHardness;

    let idx = 0;
    for (let iz = 0; iz < N; iz++) {
      for (let ix = 0; ix < N; ix++) {
        const gridIdx = iz * N + ix;
        pos.setY(idx, this.terrain.height[gridIdx]);
        sedAttr.setX(idx, this.terrain.sediment[gridIdx]);
        eroAttr.setX(idx, this.terrain.erosionMask[gridIdx]);
        hardAttr.setX(idx, this.terrain.hardness[gridIdx]);
        idx++;
      }
    }

    pos.needsUpdate = true;
    sedAttr.needsUpdate = true;
    eroAttr.needsUpdate = true;
    hardAttr.needsUpdate = true;

    this.terrainMesh.geometry.computeVertexNormals();
  }

  setupParticleSystem() {
    const maxParticles = 3500;
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
        colAttr.setXYZ(pIdx, 0.2 + progress * 0.6, 0.6 + progress * 0.3, 0.95 - progress * 0.4);
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
      radius: 58,
      theta: 0.8,
      phi: 1.1,
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
      spherical.radius = Math.max(12, Math.min(130, spherical.radius + e.deltaY * 0.05));
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

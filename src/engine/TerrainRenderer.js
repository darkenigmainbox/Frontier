// Frontier AAA 3D Viewport Renderer
// Handles: Three.js PBR lighting, Shading View Modes, Water Basin, Dynamic Droplet Particles, Camera

import * as THREE from 'three';

export class TerrainRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#121316');

    // Camera setup
    const aspect = canvas.clientWidth / (canvas.clientHeight || 1);
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.5, 4000);
    this.camera.position.set(280, 220, 340);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false
    });
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Atmospheric Fog
    this.scene.fog = new THREE.FogExp2('#14171d', 0.0012);

    // Lighting
    this.setupLighting();

    // Terrain Mesh container
    this.terrainMesh = null;
    this.terrainGeo = null;
    this.terrainMat = null;
    this.colorTexture = null;
    this.viewMode = 'pbr';

    // Water Plane
    this.setupWater();

    // Particle simulation group
    this.particleSystem = null;

    // Orbit controls emulation
    this.setupControls();

    // Animation loop
    this.clock = new THREE.Clock();
    this.animId = null;
    this.startLoop();
  }

  setupLighting() {
    this.ambientLight = new THREE.AmbientLight('#2a3242', 0.85);
    this.scene.add(this.ambientLight);

    this.hemiLight = new THREE.HemisphereLight('#6882a8', '#1c1b18', 0.9);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight('#fff1da', 2.8);
    this.sunLight.position.set(220, 260, 180);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 1000;
    const d = 260;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0004;
    this.scene.add(this.sunLight);

    // Sky dome hemisphere
    const skyGeo = new THREE.SphereGeometry(1800, 32, 16);
    this.skyMat = new THREE.MeshBasicMaterial({
      color: '#1a2233',
      side: THREE.BackSide
    });
    this.skyMesh = new THREE.Mesh(skyGeo, this.skyMat);
    this.scene.add(this.skyMesh);
  }

  setupWater() {
    const waterGeo = new THREE.PlaneGeometry(800, 800, 64, 64);
    waterGeo.rotateX(-Math.PI / 2);
    this.waterMat = new THREE.MeshStandardMaterial({
      color: '#1f5370',
      roughness: 0.1,
      metalness: 0.15,
      transparent: true,
      opacity: 0.82
    });
    this.waterMesh = new THREE.Mesh(waterGeo, this.waterMat);
    this.waterMesh.position.y = 22; // Default water height
    this.waterMesh.receiveShadow = true;
    this.scene.add(this.waterMesh);
  }

  setWaterHeight(height, visible = true) {
    if (this.waterMesh) {
      this.waterMesh.position.y = height;
      this.waterMesh.visible = visible;
    }
  }

  setLightingPreset(preset) {
    switch (preset) {
      case 'golden':
        this.sunLight.color.set('#f5b971');
        this.sunLight.intensity = 3.2;
        this.sunLight.position.set(300, 90, 120);
        this.ambientLight.color.set('#4a373b');
        this.ambientLight.intensity = 0.9;
        this.scene.fog.color.set('#2b2024');
        this.skyMat.color.set('#3a242c');
        break;
      case 'noon':
        this.sunLight.color.set('#fffdf8');
        this.sunLight.intensity = 3.6;
        this.sunLight.position.set(50, 360, 50);
        this.ambientLight.color.set('#3a4a60');
        this.ambientLight.intensity = 1.0;
        this.scene.fog.color.set('#1a2638');
        this.skyMat.color.set('#20324d');
        break;
      case 'overcast':
        this.sunLight.color.set('#b0bac9');
        this.sunLight.intensity = 1.4;
        this.sunLight.position.set(120, 200, 120);
        this.ambientLight.color.set('#454e59');
        this.ambientLight.intensity = 1.3;
        this.scene.fog.color.set('#222830');
        this.skyMat.color.set('#2b333d');
        break;
      case 'sunset':
        this.sunLight.color.set('#ea6045');
        this.sunLight.intensity = 3.0;
        this.sunLight.position.set(-320, 50, 90);
        this.ambientLight.color.set('#402838');
        this.ambientLight.intensity = 0.8;
        this.scene.fog.color.set('#2d1a29');
        this.skyMat.color.set('#3b1a2a');
        break;
      case 'night':
        this.sunLight.color.set('#8ca7d4');
        this.sunLight.intensity = 0.9;
        this.sunLight.position.set(-180, 220, -180);
        this.ambientLight.color.set('#161c28');
        this.ambientLight.intensity = 0.5;
        this.scene.fog.color.set('#0b0e14');
        this.skyMat.color.set('#0c1017');
        break;
    }
  }

  // Update terrain geometry and textures from generator output
  updateTerrain(generator, viewMode = 'pbr', wireframe = false) {
    this.viewMode = viewMode;
    const S = generator.resolution;
    const worldSize = 360;

    // Create or resize geometry
    if (!this.terrainGeo || this.terrainGeo.parameters.widthSegments !== S - 1) {
      if (this.terrainMesh) {
        this.scene.remove(this.terrainMesh);
        this.terrainGeo.dispose();
      }
      this.terrainGeo = new THREE.PlaneGeometry(worldSize, worldSize, S - 1, S - 1);
      this.terrainGeo.rotateX(-Math.PI / 2);
    }

    const pos = this.terrainGeo.attributes.position;
    const heights = generator.heightfield;
    for (let i = 0; i < S * S; i++) {
      pos.setY(i, heights[i]);
    }
    pos.needsUpdate = true;
    this.terrainGeo.computeVertexNormals();

    // Prepare pixel buffer according to view mode
    const pixels = new Uint8Array(S * S * 4);
    if (viewMode === 'pbr' || viewMode === 'albedo') {
      const tex = generator.textureMap;
      for (let i = 0; i < S * S * 4; i++) {
        pixels[i] = Math.min(255, Math.max(0, Math.floor(tex[i] * 255)));
      }
    } else if (viewMode === 'heightmap') {
      const minH = generator.minHeight;
      const maxH = Math.max(minH + 1, generator.maxHeight);
      for (let i = 0; i < S * S; i++) {
        const norm = Math.max(0, Math.min(1, (heights[i] - minH) / (maxH - minH)));
        const v = Math.floor(norm * 255);
        const idx = i * 4;
        pixels[idx] = v;
        pixels[idx + 1] = v;
        pixels[idx + 2] = v;
        pixels[idx + 3] = 255;
      }
    } else if (viewMode === 'slope') {
      const slopes = generator.erosion.slopeMap;
      for (let i = 0; i < S * S; i++) {
        const s = Math.min(90, Math.max(0, slopes[i])) / 90;
        const idx = i * 4;
        // Green -> Yellow -> Red -> Magenta
        pixels[idx] = Math.floor(Math.min(1, s * 2) * 255);
        pixels[idx + 1] = Math.floor(Math.max(0, 1.0 - s * 1.5) * 255);
        pixels[idx + 2] = Math.floor(Math.max(0, s - 0.5) * 2 * 255);
        pixels[idx + 3] = 255;
      }
    } else if (viewMode === 'flow') {
      const flows = generator.erosion.flowMap;
      for (let i = 0; i < S * S; i++) {
        const f = Math.min(1, Math.max(0, flows[i]));
        const idx = i * 4;
        pixels[idx] = Math.floor(f * 40);
        pixels[idx + 1] = Math.floor(f * 200 + 20);
        pixels[idx + 2] = Math.floor(f * 255 + 30);
        pixels[idx + 3] = 255;
      }
    } else if (viewMode === 'talus') {
      const talus = generator.erosion.talusMap;
      for (let i = 0; i < S * S; i++) {
        const t = Math.min(1, Math.max(0, talus[i]));
        const idx = i * 4;
        pixels[idx] = Math.floor(t * 240 + 30);
        pixels[idx + 1] = Math.floor(t * 140 + 20);
        pixels[idx + 2] = Math.floor(t * 50 + 20);
        pixels[idx + 3] = 255;
      }
    } else if (viewMode === 'cavity') {
      const cav = generator.erosion.cavityMap;
      for (let i = 0; i < S * S; i++) {
        const c = Math.floor(cav[i] * 255);
        const idx = i * 4;
        pixels[idx] = c;
        pixels[idx + 1] = c;
        pixels[idx + 2] = c;
        pixels[idx + 3] = 255;
      }
    } else if (viewMode === 'normal') {
      const norms = generator.erosion.normalMap;
      for (let i = 0; i < S * S; i++) {
        const idx3 = i * 3;
        const idx4 = i * 4;
        pixels[idx4] = Math.floor((norms[idx3] * 0.5 + 0.5) * 255);
        pixels[idx4 + 1] = Math.floor((norms[idx3 + 1] * 0.5 + 0.5) * 255);
        pixels[idx4 + 2] = Math.floor((norms[idx3 + 2] * 0.5 + 0.5) * 255);
        pixels[idx4 + 3] = 255;
      }
    }

    if (!this.colorTexture || this.colorTexture.image.width !== S) {
      this.colorTexture = new THREE.DataTexture(pixels, S, S, THREE.RGBAFormat);
      this.colorTexture.wrapS = THREE.ClampToEdgeWrapping;
      this.colorTexture.wrapT = THREE.ClampToEdgeWrapping;
      this.colorTexture.minFilter = THREE.LinearFilter;
      this.colorTexture.magFilter = THREE.LinearFilter;
    } else {
      this.colorTexture.image.data.set(pixels);
    }
    this.colorTexture.needsUpdate = true;

    if (!this.terrainMat) {
      this.terrainMat = new THREE.MeshStandardMaterial({
        map: this.colorTexture,
        roughness: 0.82,
        metalness: 0.05,
        wireframe: wireframe
      });
      this.terrainMesh = new THREE.Mesh(this.terrainGeo, this.terrainMat);
      this.terrainMesh.castShadow = true;
      this.terrainMesh.receiveShadow = true;
      this.scene.add(this.terrainMesh);
    } else {
      this.terrainMat.map = this.colorTexture;
      this.terrainMat.wireframe = wireframe;
      if (viewMode === 'albedo' || viewMode === 'heightmap' || viewMode === 'slope' || viewMode === 'flow' || viewMode === 'talus' || viewMode === 'normal') {
        this.terrainMat.roughness = 1.0;
        this.terrainMat.metalness = 0.0;
      } else {
        this.terrainMat.roughness = 0.82;
        this.terrainMat.metalness = 0.05;
      }
      this.terrainMat.needsUpdate = true;
    }
  }

  // Trigger Live Rain Droplet Particle FX
  triggerRainParticles(generator, count = 2500) {
    if (this.particleSystem) {
      this.scene.remove(this.particleSystem);
      this.particleSystem.geometry.dispose();
      this.particleSystem.material.dispose();
    }

    const S = generator.resolution;
    const worldSize = 360;
    const invS = worldSize / S;
    const heights = generator.heightfield;

    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const gx = Math.floor(Math.random() * (S - 4)) + 2;
      const gz = Math.floor(Math.random() * (S - 4)) + 2;
      const wx = (gx - S * 0.5) * invS;
      const wz = (gz - S * 0.5) * invS;
      const wy = heights[gz * S + gx] + 1.5;

      positions[i * 3] = wx;
      positions[i * 3 + 1] = wy;
      positions[i * 3 + 2] = wz;

      // Downhill velocity approximation
      velocities[i * 3] = (Math.random() - 0.5) * 0.5;
      velocities[i * 3 + 1] = -1.2;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const particleMat = new THREE.PointsMaterial({
      color: '#7ad4ff',
      size: 2.2,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });

    this.particleSystem = new THREE.Points(particleGeo, particleMat);
    this.scene.add(this.particleSystem);

    // Animate particles for 3.5 seconds then fade
    let elapsed = 0;
    const animInterval = setInterval(() => {
      elapsed += 0.03;
      const p = this.particleSystem.geometry.attributes.position;
      for (let i = 0; i < count; i++) {
        p.array[i * 3 + 1] -= 1.8;
        if (p.array[i * 3 + 1] < 0) {
          p.array[i * 3 + 1] = 120 + Math.random() * 80;
        }
      }
      p.needsUpdate = true;

      if (elapsed > 3.0) {
        clearInterval(animInterval);
        this.scene.remove(this.particleSystem);
        this.particleSystem = null;
      }
    }, 30);
  }

  // Camera presets
  setCameraPreset(type) {
    switch (type) {
      case 'perspective':
        this.camera.position.set(280, 220, 340);
        this.target.set(0, 40, 0);
        break;
      case 'top':
        this.camera.position.set(0, 520, 0);
        this.target.set(0, 0, 0);
        break;
      case 'front':
        this.camera.position.set(0, 90, 480);
        this.target.set(0, 50, 0);
        break;
      case 'iso':
        this.camera.position.set(340, 300, 340);
        this.target.set(0, 40, 0);
        break;
      case 'reset':
        this.camera.position.set(280, 220, 340);
        this.target.set(0, 40, 0);
        break;
    }
    this.camera.lookAt(this.target);
  }

  // Orbit navigation controls
  setupControls() {
    this.target = new THREE.Vector3(0, 40, 0);
    let isDragging = false;
    let isPanning = false;
    let prevMouse = { x: 0, y: 0 };

    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) isDragging = true;
      if (e.button === 2) isPanning = true;
      prevMouse = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mouseup', () => {
      isDragging = false;
      isPanning = false;
    });

    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    this.canvas.addEventListener('mousemove', (e) => {
      if (!isDragging && !isPanning) return;
      const dx = e.clientX - prevMouse.x;
      const dy = e.clientY - prevMouse.y;
      prevMouse = { x: e.clientX, y: e.clientY };

      if (isDragging) {
        // Orbit around target
        const offset = this.camera.position.clone().sub(this.target);
        let radius = offset.length();
        let theta = Math.atan2(offset.x, offset.z) - dx * 0.007;
        let phi = Math.acos(Math.max(-1, Math.min(1, offset.y / radius))) + dy * 0.007;
        phi = Math.max(0.08, Math.min(Math.PI * 0.48, phi));

        this.camera.position.x = this.target.x + radius * Math.sin(phi) * Math.sin(theta);
        this.camera.position.y = this.target.y + radius * Math.cos(phi);
        this.camera.position.z = this.target.z + radius * Math.sin(phi) * Math.cos(theta);
        this.camera.lookAt(this.target);
      } else if (isPanning) {
        // Pan target and camera
        const panSpeed = 0.35;
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion);

        const pan = right.multiplyScalar(-dx * panSpeed).add(up.multiplyScalar(dy * panSpeed));
        this.camera.position.add(pan);
        this.target.add(pan);
        this.camera.lookAt(this.target);
      }
    });

    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY * 0.25;
      const offset = this.camera.position.clone().sub(this.target);
      const newRadius = Math.max(30, Math.min(1200, offset.length() + zoomFactor));
      offset.setLength(newRadius);
      this.camera.position.copy(this.target).add(offset);
      this.camera.lookAt(this.target);
    }, { passive: false });
  }

  resize() {
    if (!this.canvas) return;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (w === 0 || h === 0) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  startLoop() {
    const loop = () => {
      this.animId = requestAnimationFrame(loop);
      const time = this.clock.getElapsedTime();

      // Subtle water wave surface animation
      if (this.waterMat) {
        this.waterMesh.position.y += Math.sin(time * 2.0) * 0.015;
      }

      this.renderer.render(this.scene, this.camera);
    };
    loop();
  }

  destroy() {
    if (this.animId) cancelAnimationFrame(this.animId);
    this.renderer.dispose();
  }
}

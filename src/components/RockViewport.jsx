import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createRandom } from '../generator/random.js';
import { createGenerationRunner } from '../generator/generationRunner.js';

function createGrainMaps() {
  const size = 256;
  const random = createRandom(85741);
  const layers = [8, 16, 32, 64].map((cells) => {
    const values = new Float32Array(cells * cells);
    for (let i = 0; i < values.length; i++) values[i] = random();
    return { cells, values };
  });
  function sample(x, y, layer) {
    const { cells, values } = layer;
    const px = x / size * cells;
    const py = y / size * cells;
    const x0 = Math.floor(px) % cells;
    const y0 = Math.floor(py) % cells;
    const x1 = (x0 + 1) % cells;
    const y1 = (y0 + 1) % cells;
    let fx = px - Math.floor(px), fy = py - Math.floor(py);
    fx = fx * fx * (3 - 2 * fx);
    fy = fy * fy * (3 - 2 * fy);
    const top = values[y0 * cells + x0] * (1 - fx) + values[y0 * cells + x1] * fx;
    const bottom = values[y1 * cells + x0] * (1 - fx) + values[y1 * cells + x1] * fx;
    return top * (1 - fy) + bottom * fy;
  }
  const heights = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      heights[y * size + x] = layers.reduce((sum, layer, i) => sum + sample(x, y, layer) * [0.48, 0.3, 0.16, 0.08][i], 0) + (random() - 0.5) * 0.06;
    }
  }
  const normalCanvas = document.createElement('canvas');
  const colorCanvas = document.createElement('canvas');
  normalCanvas.width = normalCanvas.height = colorCanvas.width = colorCanvas.height = size;
  const normalContext = normalCanvas.getContext('2d');
  const colorContext = colorCanvas.getContext('2d');
  const image = normalContext.createImageData(size, size);
  const colorImage = colorContext.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const left = heights[y * size + (x - 1 + size) % size];
      const right = heights[y * size + (x + 1) % size];
      const up = heights[((y - 1 + size) % size) * size + x];
      const down = heights[((y + 1) % size) * size + x];
      const normal = new THREE.Vector3((left - right) * 4.1, (up - down) * 4.1, 1).normalize();
      const index = (y * size + x) * 4;
      image.data[index] = (normal.x * 0.5 + 0.5) * 255;
      image.data[index + 1] = (normal.y * 0.5 + 0.5) * 255;
      image.data[index + 2] = (normal.z * 0.5 + 0.5) * 255;
      image.data[index + 3] = 255;
      // Isotropic mineral flecks and mottling; deliberately no horizontal strata.
      const grain = random();
      const fleck = grain < 0.025 ? -25 : grain > 0.985 ? 13 : 0;
      const shade = 221 + (heights[y * size + x] - 0.5) * 56 + (grain - 0.5) * 14 + fleck;
      colorImage.data[index] = shade * 1.015;
      colorImage.data[index + 1] = shade;
      colorImage.data[index + 2] = shade * 0.985;
      colorImage.data[index + 3] = 255;
    }
  }
  normalContext.putImageData(image, 0, 0);
  colorContext.putImageData(colorImage, 0, 0);
  const normalTexture = new THREE.CanvasTexture(normalCanvas);
  const colorTexture = new THREE.CanvasTexture(colorCanvas);
  normalTexture.wrapS = normalTexture.wrapT = colorTexture.wrapS = colorTexture.wrapT = THREE.RepeatWrapping;
  colorTexture.colorSpace = THREE.SRGBColorSpace;
  normalTexture.name = 'Fine stone grain normals';
  colorTexture.name = 'Mineral flecks';
  return { normalTexture, colorTexture };
}

function createContactShadow() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(128, 128, 8, 128, 128, 128);
  gradient.addColorStop(0, 'rgba(36, 33, 28, .45)');
  gradient.addColorStop(0.45, 'rgba(42, 39, 34, .20)');
  gradient.addColorStop(1, 'rgba(42, 39, 34, 0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(canvas);
}

function fitSize(stats, aspect) {
  const [width, height, depth] = stats.dimensions;
  return Math.max(height * 1.08, (width * 0.84 + depth * 0.35) / Math.max(0.1, aspect));
}

function formationCenter(stats) {
  const { min, max } = stats.bounds;
  return new THREE.Vector3((min[0] + max[0]) / 2, (min[1] + max[1]) * 0.48, (min[2] + max[2]) / 2);
}

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10000);
}

const RockViewport = forwardRef(function RockViewport({ settings, retryKey, material, wireframe, grid, autoRotate, lighting, onStats, onStatus }, ref) {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const runnerRef = useRef(null);
  const generationModeRef = useRef('starting');
  const requestRef = useRef(0);
  const rendererErrorRef = useRef('');
  const callbacksRef = useRef({ onStats, onStatus });
  const lastKindRef = useRef(null);
  callbacksRef.current = { onStats, onStatus };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#b8b7ad');
    scene.fog = new THREE.Fog('#b8b7ad', 17, 43);
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 150);
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
      rendererErrorRef.current = '';
    } catch {
      rendererErrorRef.current = 'WebGL is unavailable. Please enable hardware acceleration or use a WebGL-capable browser.';
      callbacksRef.current.onStatus({ state: 'error', message: rendererErrorRef.current });
      return undefined;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = false;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.domElement.setAttribute('aria-label', 'Interactive 3D preview. Arrow keys pan, Shift and arrow keys orbit, plus and minus zoom.');
    renderer.domElement.setAttribute('tabindex', '0');
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 2;
    controls.maxDistance = 35;
    controls.maxPolarAngle = Math.PI / 2 - 0.025;
    controls.screenSpacePanning = true;
    controls.autoRotateSpeed = 0.65;
    controls.listenToKeyEvents(renderer.domElement);

    const hemisphere = new THREE.HemisphereLight(0xe6e9e5, 0x716a5b, 1.55);
    scene.add(hemisphere);
    const sun = new THREE.DirectionalLight(0xfff2e2, 2.65);
    sun.position.set(-5, 9, 6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -12;
    sun.shadow.camera.right = 12;
    sun.shadow.camera.top = 12;
    sun.shadow.camera.bottom = -12;
    sun.shadow.camera.near = 0.1;
    sun.shadow.camera.far = 35;
    sun.shadow.bias = -0.00035;
    sun.shadow.normalBias = 0.025;
    sun.shadow.radius = 3;
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0xd0dedc, 0.55);
    fill.position.set(7, 4, -6);
    scene.add(fill);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(180, 180),
      new THREE.MeshStandardMaterial({ color: 0xb3b1a5, roughness: 1 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.015;
    floor.receiveShadow = true;
    scene.add(floor);

    const contactTexture = createContactShadow();
    const contact = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: contactTexture, transparent: true, depthWrite: false, opacity: 0.62 }));
    contact.rotation.x = -Math.PI / 2;
    contact.position.y = 0.002;
    scene.add(contact);

    const gridHelper = new THREE.GridHelper(40, 40, 0x767970, 0x8c8c80);
    gridHelper.position.y = 0.005;
    gridHelper.material.transparent = true;
    gridHelper.material.opacity = 0.17;
    gridHelper.visible = false;
    scene.add(gridHelper);

    const { normalTexture, colorTexture } = createGrainMaps();
    const rockMaterial = new THREE.MeshStandardMaterial({
      color: 0x827f73,
      roughness: 0.96,
      metalness: 0,
      vertexColors: true,
      map: colorTexture,
      normalMap: normalTexture,
      normalScale: new THREE.Vector2(0.82, 0.82),
    });
    rockMaterial.name = 'Stone';
    const wireMaterial = new THREE.MeshBasicMaterial({ color: 0x202820, wireframe: true, transparent: true, opacity: 0.38, depthWrite: false });
    const rockGroup = new THREE.Group();
    scene.add(rockGroup);

    const state = { scene, camera, renderer, controls, rockGroup, rockMaterial, wireMaterial, gridHelper, contact, sun, hemisphere, fill, floor, normalTexture, colorTexture, contactTexture, mesh: null, wire: null, stats: null, settings: null, needsRender: true };
    sceneRef.current = state;
    const onCanvasKeyDown = (event) => {
      if (!['+', '=', '-', '_'].includes(event.key)) return;
      event.preventDefault();
      const offset = camera.position.clone().sub(controls.target);
      const factor = event.key === '+' || event.key === '=' ? 0.9 : 1.1;
      const distance = THREE.MathUtils.clamp(offset.length() * factor, controls.minDistance, controls.maxDistance);
      camera.position.copy(controls.target).add(offset.setLength(distance));
      controls.update();
      state.needsRender = true;
    };
    renderer.domElement.addEventListener('keydown', onCanvasKeyDown);
    camera.position.set(6, 4.6, 9);
    controls.target.set(0, 1.2, 0);
    controls.update();

    const resize = () => {
      const width = Math.max(1, container.clientWidth);
      const height = Math.max(1, container.clientHeight);
      const oldAspect = camera.aspect;
      camera.aspect = width / height;
      if (state.stats && Math.abs(oldAspect - camera.aspect) > 0.001) {
        const ratio = fitSize(state.stats, camera.aspect) / fitSize(state.stats, oldAspect);
        const offset = camera.position.clone().sub(controls.target).multiplyScalar(ratio);
        camera.position.copy(controls.target).add(offset);
        controls.minDistance = Math.max(1, controls.minDistance * ratio);
        controls.maxDistance = Math.max(25, controls.maxDistance * ratio);
        controls.update();
      }
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      state.needsRender = true;
    };
    controls.addEventListener('change', () => { state.needsRender = true; });
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();
    let frame;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      controls.update();
      if (state.needsRender) {
        renderer.render(scene, camera);
        state.needsRender = false;
      }
    };
    animate();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.domElement.removeEventListener('keydown', onCanvasKeyDown);
      controls.dispose();
      if (state.mesh) state.mesh.geometry.dispose();
      rockMaterial.dispose();
      wireMaterial.dispose();
      normalTexture.dispose();
      colorTexture.dispose();
      contactTexture.dispose();
      contact.geometry.dispose();
      contact.material.dispose();
      floor.geometry.dispose();
      floor.material.dispose();
      gridHelper.geometry.dispose();
      gridHelper.material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      sceneRef.current = null;
    };
  }, []);

  function frameRock() {
    const state = sceneRef.current;
    if (!state?.stats) return;
    const { camera, controls, stats } = state;
    const center = formationCenter(stats);
    const verticalFov = camera.fov * Math.PI / 180;
    const distance = fitSize(stats, camera.aspect) / (2 * Math.tan(verticalFov / 2)) * 1.35;
    const direction = new THREE.Vector3(0.75, 0.50, 1).normalize();
    camera.position.copy(center).addScaledVector(direction, distance);
    controls.target.copy(center);
    controls.minDistance = Math.max(1, distance * 0.25);
    controls.maxDistance = Math.max(25, distance * 3.5);
    controls.update();
  }

  function preserveFraming(previous, current) {
    const state = sceneRef.current;
    if (!state || !previous) return;
    const { camera, controls } = state;
    const ratio = fitSize(current, camera.aspect) / fitSize(previous, camera.aspect);
    const centerDelta = formationCenter(current).sub(formationCenter(previous));
    const target = controls.target.clone().add(centerDelta);
    const offset = camera.position.clone().sub(controls.target).multiplyScalar(ratio);
    controls.target.copy(target);
    camera.position.copy(target).add(offset);
    controls.minDistance = Math.max(1, controls.minDistance * ratio);
    controls.maxDistance = Math.max(25, controls.maxDistance * ratio);
    controls.update();
    state.needsRender = true;
  }

  useEffect(() => {
    if (rendererErrorRef.current) return undefined;

    const handleError = (id, error) => {
      if (id !== requestRef.current) return;
      const message = error instanceof Error ? error.message : String(error);
      callbacksRef.current.onStatus({
        state: 'error',
        message: message || 'The generator could not complete this mesh.',
        action: error?.name === 'GeneratorLoadError' ? 'reload' : 'retry',
      });
    };

    const runner = createGenerationRunner({
      createWorker: () => new Worker(new URL('../generator/worker.js', import.meta.url), { type: 'module' }),
      generateFallback: async (settings, signal) => {
        let generateRockAsync;
        try {
          ({ generateRockAsync } = await import('../generator/rockGeometry.js'));
        } catch (cause) {
          const error = new Error('Unable to load the generator. Check your connection and reload the preview.', { cause });
          error.name = 'GeneratorLoadError';
          throw error;
        }
        return generateRockAsync(settings, { signal });
      },
      onModeChange: (mode, reason) => {
        generationModeRef.current = mode;
        if (mode === 'fallback') {
          console.warn('Rock Lab: worker unavailable; using compatibility mode.', reason?.message || reason);
          callbacksRef.current.onStatus({ state: 'generating', message: 'Using compatibility mode…' });
        }
      },
      onError: handleError,
      onResult: (id, result) => {
        if (id !== requestRef.current) return;
        const state = sceneRef.current;
        if (!state) return;
        try {
          const previousStats = state.stats;
          const previousSettings = state.settings;
          const geometry = new THREE.BufferGeometry();
          geometry.setAttribute('position', new THREE.BufferAttribute(result.positions, 3));
          geometry.setAttribute('normal', new THREE.BufferAttribute(result.normals, 3));
          geometry.setAttribute('tangent', new THREE.BufferAttribute(result.tangents, 4));
          geometry.setAttribute('color', new THREE.BufferAttribute(result.colors, 3));
          geometry.setAttribute('uv', new THREE.BufferAttribute(result.uvs, 2));
          geometry.setIndex(new THREE.BufferAttribute(result.indices, 1));
          geometry.computeBoundingBox();
          geometry.computeBoundingSphere();
          if (state.mesh) {
            state.rockGroup.remove(state.mesh, state.wire);
            state.mesh.geometry.dispose();
          }
          const mesh = new THREE.Mesh(geometry, state.rockMaterial);
          mesh.name = `Frontier_${result.settings.kind}_${result.settings.seed}`;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          mesh.userData = { generator: 'Frontier Rock Lab', ...result.settings, units: 'meters' };
          const wire = new THREE.Mesh(geometry, state.wireMaterial);
          wire.visible = state.wireVisible || false;
          wire.renderOrder = 1;
          state.rockGroup.add(mesh, wire);
          state.mesh = mesh;
          state.wire = wire;
          state.stats = result.stats;
          state.settings = result.settings;
          state.contact.position.x = (result.stats.bounds.min[0] + result.stats.bounds.max[0]) / 2;
          state.contact.position.z = (result.stats.bounds.min[2] + result.stats.bounds.max[2]) / 2;
          state.contact.scale.set(result.stats.dimensions[0] * 1.25, result.stats.dimensions[2] * 1.45, 1);
          state.renderer.shadowMap.needsUpdate = true;
          state.needsRender = true;
          if (lastKindRef.current !== result.settings.kind) {
            lastKindRef.current = result.settings.kind;
            frameRock();
          } else if (previousSettings && (previousSettings.width !== result.settings.width || previousSettings.height !== result.settings.height || previousSettings.seed !== result.settings.seed)) {
            // Preserve the user's orbit and relative zoom while accommodating a new footprint.
            preserveFraming(previousStats, result.stats);
          }
          callbacksRef.current.onStats(result.stats);
          callbacksRef.current.onStatus({ state: 'ready', message: '' });
        } catch (error) {
          handleError(id, error);
        }
      },
    });
    runnerRef.current = runner;
    return () => {
      runner.dispose();
      runnerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (rendererErrorRef.current) {
      callbacksRef.current.onStatus({ state: 'error', message: rendererErrorRef.current });
      return undefined;
    }
    const id = ++requestRef.current;
    const message = generationModeRef.current === 'fallback' ? 'Using compatibility mode…' : '';
    callbacksRef.current.onStatus({ state: 'generating', message });
    const timeout = window.setTimeout(() => runnerRef.current?.request(id, settings), 110);
    return () => window.clearTimeout(timeout);
  }, [settings, retryKey]);

  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.rockMaterial.color.set(material.color);
      sceneRef.current.materialId = material.id;
      sceneRef.current.needsRender = true;
    }
  }, [material]);

  useEffect(() => {
    const state = sceneRef.current;
    if (!state) return;
    state.wireVisible = wireframe;
    if (state.wire) state.wire.visible = wireframe;
    state.needsRender = true;
  }, [wireframe]);

  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.gridHelper.visible = grid;
      sceneRef.current.needsRender = true;
    }
  }, [grid]);

  useEffect(() => {
    if (sceneRef.current) sceneRef.current.controls.autoRotate = autoRotate;
  }, [autoRotate]);

  useEffect(() => {
    const state = sceneRef.current;
    if (!state) return;
    if (lighting === 'warm') {
      state.sun.color.set('#ffe0b5');
      state.sun.intensity = 2.85;
      state.hemisphere.color.set('#e0e1d9');
      state.hemisphere.intensity = 1.35;
    } else {
      state.sun.color.set('#fff2e2');
      state.sun.intensity = 2.65;
      state.hemisphere.color.set('#e6e9e5');
      state.hemisphere.intensity = 1.55;
    }
    state.needsRender = true;
  }, [lighting]);

  useImperativeHandle(ref, () => ({
    resetCamera: frameRock,
    async exportMesh(format) {
      const state = sceneRef.current;
      if (!state?.mesh) throw new Error('The mesh is not ready yet.');
      // Snapshot the material so a color change during asynchronous export
      // cannot change the asset being written. Geometry buffers stay alive on
      // this mesh even if the viewport swaps to a newly generated formation.
      const exportMaterial = state.rockMaterial.clone();
      const clone = new THREE.Mesh(state.mesh.geometry, exportMaterial);
      clone.name = state.mesh.name;
      clone.userData = { ...state.mesh.userData, material: state.materialId };
      clone.updateMatrixWorld(true);
      const filename = `frontier-${state.settings.kind}-${state.settings.seed}`;
      try {
        if (format === 'obj') {
          const { OBJExporter } = await import('three/addons/exporters/OBJExporter.js');
          // OBJ intentionally carries no MTL; avoid a dangling material reference.
          const text = new OBJExporter().parse(clone).replace(/^usemtl .*\r?\n/gm, '');
          downloadBlob(new Blob([text], { type: 'text/plain' }), `${filename}.obj`);
        } else {
          const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js');
          const binary = await new GLTFExporter().parseAsync(clone, { binary: true, maxTextureSize: 512 });
          downloadBlob(new Blob([binary], { type: 'model/gltf-binary' }), `${filename}.glb`);
        }
      } finally {
        exportMaterial.dispose();
      }
    },
  }), []);

  return <div className="canvas-container" ref={containerRef} />;
});

export default RockViewport;

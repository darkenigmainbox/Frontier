// ─── Three.js scene: converts the world build into live meshes ───────────────
// Reflects 2D edits: rebuild() re-creates all buffers from the project model.

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { MeshData } from '../gen/mesh.ts';
import type { WorldBuild } from '../gen/build.ts';
import type { Project, Stroke } from '../core/types.ts';

export interface PickResult {
  kind: 'stroke' | 'node' | 'building' | 'tree' | 'ground';
  id: string | null;
  point: THREE.Vector3;
}

export class Scene3D {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  root = new THREE.Group();
  pickGroup = new THREE.Group();
  private sun: THREE.DirectionalLight;
  private strokePicks: THREE.Object3D[] = [];
  private nodeHandles: THREE.Mesh[] = [];
  private animTime = 0;
  private waterMats: THREE.MeshStandardMaterial[] = [];

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#9fc4e8');
    this.scene.fog = new THREE.Fog('#9fc4e8', 900, 3200);

    this.camera = new THREE.PerspectiveCamera(52, 1, 1, 6000);
    this.camera.position.set(340, 420, 520);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.07;
    this.controls.maxPolarAngle = Math.PI * 0.495;
    this.controls.minDistance = 30;
    this.controls.maxDistance = 2600;

    const hemi = new THREE.HemisphereLight('#cfe5ff', '#5a6b4a', 0.85);
    this.scene.add(hemi);
    this.sun = new THREE.DirectionalLight('#fff2dc', 2.1);
    this.sun.position.set(-620, 820, 460);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const s = 1300;
    this.sun.shadow.camera.left = -s;
    this.sun.shadow.camera.right = s;
    this.sun.shadow.camera.top = s;
    this.sun.shadow.camera.bottom = -s;
    this.sun.shadow.camera.far = 3000;
    this.sun.shadow.bias = -0.0006;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);

    this.scene.add(this.root);
    this.scene.add(this.pickGroup);

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize(): void {
    const w = this.canvas.clientWidth || this.canvas.parentElement?.clientWidth || 800;
    const h = this.canvas.clientHeight || this.canvas.parentElement?.clientHeight || 600;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private toGeom(data: MeshData): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
    g.setAttribute('color', new THREE.BufferAttribute(data.colors, 3));
    g.setIndex(new THREE.BufferAttribute(data.indices, 1));
    g.computeVertexNormals();
    return g;
  }

  private mat(opts: THREE.MeshStandardMaterialParameters = {}): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.92,
      metalness: 0.02,
      side: THREE.DoubleSide,
      ...opts,
    });
  }

  private addMesh(data: MeshData, mat: THREE.Material, shadows = true): THREE.Mesh | null {
    if (data.positions.length === 0) return null;
    const mesh = new THREE.Mesh(this.toGeom(data), mat);
    mesh.castShadow = shadows;
    mesh.receiveShadow = shadows;
    this.root.add(mesh);
    return mesh;
  }

  rebuild(project: Project, world: WorldBuild): void {
    // clear
    this.root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
    });
    this.root.clear();
    this.pickGroup.clear();
    this.strokePicks = [];
    this.nodeHandles = [];
    this.waterMats = [];

    const sh = project.settings.shadows;
    this.renderer.shadowMap.enabled = sh;

    // terrain
    const terrainData = buildTerrainMesh(world);
    const terrainMesh = this.addMesh(terrainData, this.mat({ roughness: 0.98, vertexColors: true }), true)!;
    terrainMesh.receiveShadow = true;
    terrainMesh.castShadow = false;

    // water
    const waterMat = this.mat({
      roughness: 0.18,
      metalness: 0.35,
      transparent: true,
      opacity: 0.82,
      color: new THREE.Color('#4d9fd8'),
    });
    this.waterMats.push(waterMat);
    this.addMesh(world.water.build(), waterMat, false);

    // roads (drawn above terrain)
    const roadMat = this.mat({ roughness: 0.88 });
    this.addMesh(world.roads.surface.build(), roadMat, true);
    const markMat = this.mat({ roughness: 0.7 });
    if (project.settings.showMarkings) this.addMesh(world.roads.markings.build(), markMat, false);
    this.addMesh(world.roads.pavement.build(), this.mat({ roughness: 0.9 }), true);
    this.addMesh(world.roads.curb.build(), this.mat({ roughness: 0.9 }), true);
    this.addMesh(world.roads.bridge.build(), this.mat({ roughness: 0.75, metalness: 0.15 }), true);

    // rails
    this.addMesh(world.rails.ballast.build(), this.mat({ roughness: 1 }), true);
    this.addMesh(world.rails.rails.build(), this.mat({ roughness: 0.45, metalness: 0.65 }), true);
    this.addMesh(world.rails.furniture.build(), this.mat({ roughness: 0.9 }), true);
    this.addMesh(world.rails.monorail.build(), this.mat({ roughness: 0.55, metalness: 0.2 }), true);

    // city
    this.addMesh(world.buildings.build(), this.mat({ roughness: 0.85 }), true);
    this.addMesh(world.treeTrunks.build(), this.mat({ roughness: 1 }), true);
    this.addMesh(world.treeLeaves.build(), this.mat({ roughness: 0.95, flatShading: true }), true);

    // pick proxies: one invisible line per stroke
    for (const st of project.strokes) {
      const pts = st.points.map((p) => new THREE.Vector3(p.x, (p.y ?? 0) + 1, p.z));
      if (pts.length < 2) continue;
      const g = new THREE.BufferGeometry().setFromPoints(pts);
      const m = new THREE.LineBasicMaterial({ transparent: true, opacity: 0, depthTest: false });
      const line = new THREE.Line(g, m);
      line.userData = { kind: 'stroke', id: st.id };
      line.renderOrder = -1;
      this.pickGroup.add(line);
      this.strokePicks.push(line);
    }
    // building pick boxes
    for (const b of project.buildings) {
      const g = new THREE.BoxGeometry(b.w, b.h, b.d);
      const m = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthTest: false });
      const mesh = new THREE.Mesh(g, m);
      mesh.position.set(b.x, (world.terrain.sample(b.x, b.z) + b.h / 2) as number, b.z);
      mesh.rotation.y = b.rot;
      mesh.userData = { kind: 'building', id: b.id };
      this.pickGroup.add(mesh);
    }
    // node handles for the selected stroke (added by showNodeHandles)
  }

  showNodeHandles(project: Project, strokeId: string | null, world: WorldBuild): void {
    for (const h of this.nodeHandles) {
      this.root.remove(h);
      h.geometry.dispose();
    }
    this.nodeHandles = [];
    if (!strokeId) return;
    const st = project.strokes.find((s) => s.id === strokeId);
    if (!st) return;
    const g = new THREE.SphereGeometry(3.2, 12, 10);
    const m = new THREE.MeshBasicMaterial({ color: '#ffb02e', depthTest: true });
    st.points.forEach((p, i) => {
      const y = p.y ?? world.terrain.sample(p.x, p.z) + 2;
      const mesh = new THREE.Mesh(g, m);
      mesh.position.set(p.x, y + 1.5, p.z);
      mesh.userData = { kind: 'node', strokeId, index: i };
      this.root.add(mesh);
      this.nodeHandles.push(mesh);
    });
  }

  pick(clientX: number, clientY: number): PickResult | null {
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    const ray = new THREE.Raycaster();
    ray.params.Line = { threshold: 14 };
    ray.setFromCamera(ndc, this.camera);

    const nodeHit = ray.intersectObjects(this.nodeHandles, false)[0];
    if (nodeHit) {
      return { kind: 'node', id: (nodeHit.object.userData as { strokeId: string }).strokeId, point: nodeHit.point.clone() };
    }
    const pickHit = ray.intersectObjects(this.pickGroup.children, true)[0];
    if (pickHit) {
      const ud = pickHit.object.userData as { kind: string; id: string };
      return { kind: ud.kind as PickResult['kind'], id: ud.id, point: pickHit.point.clone() };
    }
    const rootMeshes = this.root.children.filter((c) => (c as THREE.Mesh).isMesh) as THREE.Mesh[];
    const groundHit = ray.intersectObjects(rootMeshes, false)[0];
    if (groundHit) return { kind: 'ground', id: null, point: groundHit.point.clone() };
    return null;
  }

  rayToGround(clientX: number, clientY: number, planeY = 0): THREE.Vector3 | null {
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -planeY);
    const out = new THREE.Vector3();
    return ray.ray.intersectPlane(plane, out) ? out : null;
  }

  render(dt: number): void {
    this.animTime += dt;
    // gentle water shimmer
    for (const wm of this.waterMats) {
      wm.opacity = 0.8 + Math.sin(this.animTime * 0.8) * 0.03;
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  frameAll(project: Project): void {
    const half = project.terrain.size / 2;
    this.camera.position.set(half * 0.85, half * 0.95, half * 1.15);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }
}

// Terrain mesh with height/slope-based vertex colors + paint override
function buildTerrainMesh(world: WorldBuild): MeshData {
  const t = world.terrain;
  const res = t.res;
  const half = t.size / 2;
  const cell = t.cell;
  const positions = new Float32Array(res * res * 3);
  const colors = new Float32Array(res * res * 3);
  const indices = new Uint32Array((res - 1) * (res - 1) * 6);

  const PAINT: [number, number, number][] = [
    [0.38, 0.52, 0.26], // grass
    [0.45, 0.42, 0.38], // rock
    [0.76, 0.7, 0.52],  // sand
    [0.52, 0.42, 0.3],  // dirt
  ];

  for (let j = 0; j < res; j++) {
    for (let i = 0; i < res; i++) {
      const idx = j * res + i;
      const x = -half + i * cell;
      const z = -half + j * cell;
      const y = t.heights[idx];
      positions[idx * 3] = x;
      positions[idx * 3 + 1] = y;
      positions[idx * 3 + 2] = z;

      const paint = t.paint[idx];
      const base = PAINT[paint] ?? PAINT[0];
      const slope = t.slope(x, z);
      let r = base[0], g = base[1], b = base[2];
      // rock bleed on steep slopes
      if (slope > 0.5 && paint !== 1) {
        const k = Math.min(1, (slope - 0.5) / 0.7) * 0.8;
        r += (PAINT[1][0] - r) * k;
        g += (PAINT[1][1] - g) * k;
        b += (PAINT[1][2] - b) * k;
      }
      // subtle noise variation
      const n = 0.92 + ((i * 73856093) ^ (j * 19349663)) % 100 / 600;
      colors[idx * 3] = r * n;
      colors[idx * 3 + 1] = g * n;
      colors[idx * 3 + 2] = b * n;
    }
  }
  let k = 0;
  for (let j = 0; j < res - 1; j++) {
    for (let i = 0; i < res - 1; i++) {
      const a = j * res + i, b = a + 1, c = a + res, d = c + 1;
      indices[k++] = a; indices[k++] = c; indices[k++] = b;
      indices[k++] = b; indices[k++] = c; indices[k++] = d;
    }
  }
  return { positions, colors, indices };
}

export type { Stroke };

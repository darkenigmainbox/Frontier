// Frontier 3D viewport — live game preview: terrain, water, roads, rails, traffic.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildWorld } from './world.js';
import { getPreset } from './presets.js';

export class View3D {
  constructor(container, store, opts = {}) {
    this.container = container;
    this.store = store;
    this.onStats = opts.onStats || (() => {});
    this.showCars = true;
    this.showTrains = true;
    this.flyover = false;
    this._flyT = 0;
    this.world = null;
    this.cars = [];
    this.trains = [];
    this.clouds = [];
    this._rebuildTimer = null;

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(1.75, window.devicePixelRatio || 1));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#a9c8e2');
    this.scene.fog = new THREE.Fog('#a9c8e2', 700, 2400);

    this.camera = new THREE.PerspectiveCamera(55, 1, 0.5, 5000);
    this.camera.position.set(330, 260, 470);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 0, 60);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI * 0.495;
    this.controls.minDistance = 8;
    this.controls.maxDistance = 1600;

    const hemi = new THREE.HemisphereLight('#cfe5ff', '#5a6b52', 0.95);
    this.scene.add(hemi);
    this.sun = new THREE.DirectionalLight('#fff2dd', 2.1);
    this.sun.position.set(420, 520, 260);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.left = -650; sc.right = 650; sc.top = 650; sc.bottom = -650;
    sc.far = 1800;
    this.sun.shadow.bias = -0.0004;
    this.scene.add(this.sun);
    this.scene.add(new THREE.AmbientLight('#ffffff', 0.15));

    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.trafficGroup = new THREE.Group();
    this.scene.add(this.trafficGroup);
    this.makeClouds();

    this.materials = {
      asphalt: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96, metalness: 0 }),
      junction: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96, metalness: 0 }),
      marking: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2 }),
      sidewalk: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }),
      curb: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }),
      grassMed: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }),
      bridge: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 }),
      ballast: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }),
      sleeper: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }),
      steel: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.7 }),
      beam: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }),
      pillar: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 }),
      terrain: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 }),
      water: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.25, metalness: 0.1, transparent: true, opacity: 0.82 }),
      building: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }),
      trunk: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }),
      leaf: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }),
      wood: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }),
    };

    new ResizeObserver(() => this.resize()).observe(container);
    this.resize();
    store.subscribe((what) => {
      if (what === 'all' || what === 'roads' || what === 'terrain') this.rebuildSoon();
    });
    this.rebuildSoon(60);
    this._last = performance.now();
    const loop = () => { this.tick(); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }

  resize() {
    const r = this.container.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    this.renderer.setSize(r.width, r.height);
    this.camera.aspect = r.width / r.height;
    this.camera.updateProjectionMatrix();
  }

  rebuildSoon(delay = 350) {
    clearTimeout(this._rebuildTimer);
    this._rebuildTimer = setTimeout(() => this.rebuild(), delay);
  }

  bucketMesh(bucket, mat, { cast = false, receive = true } = {}) {
    if (!bucket.vertCount()) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(bucket.pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(bucket.col, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(bucket.uv, 2));
    const idx = [];
    for (let i = 0; i < bucket.quad.length; i += 4) {
      const a = bucket.quad[i], b = bucket.quad[i + 1], c = bucket.quad[i + 2], d = bucket.quad[i + 3];
      idx.push(a, b, c, a, c, d);
    }
    for (const t of bucket.tri) idx.push(t);
    g.setIndex(idx);
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat);
    m.castShadow = cast; m.receiveShadow = receive;
    return m;
  }

  rebuild() {
    const t0 = performance.now();
    const world = buildWorld(this.store.project, { terrainN: 140, roadStep: 2.2 });
    this.world = world;
    // dispose old
    this.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    this.group.clear();
    const M = this.materials;
    const casters = new Set(['building', 'trunk', 'leaf', 'pillar', 'bridge', 'beam']);
    for (const [name, bucket] of Object.entries(world.buckets)) {
      const mesh = this.bucketMesh(bucket, M[name] || M.asphalt, { cast: casters.has(name) });
      if (mesh) { mesh.name = name; this.group.add(mesh); }
    }
    this.setupTraffic(world);
    const ms = Math.round(performance.now() - t0);
    this.onStats(world.stats, {
      ms,
      roads: this.store.project.roads.length,
      rails: (this.store.project.rails || []).length,
      junctions: world.junctions.length,
      crossings: world.crossings.length,
      buildings: world.dressing.buildings.length,
      trees: world.dressing.trees.length,
    });
  }

  // ---------- traffic ----------
  setupTraffic(world) {
    this.trafficGroup.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    this.trafficGroup.clear();
    this.cars = []; this.trains = [];
    const carGeo = new THREE.BoxGeometry(1.9, 1.35, 4.2);
    carGeo.translate(0, 0.9, 0);
    const palette = ['#d94f4f', '#4f7fd9', '#e8e8e8', '#2b2f36', '#e8b93c', '#4cc38a', '#9a6ee8', '#e8762b'];
    const eligible = world.roadData.filter(({ road, preset, samples }) =>
      preset.kind === 'road' && !preset.pedestrian && !preset.narrow &&
      ((preset.lanesFwd || 0) + (preset.lanesBwd || 0)) > 0 && samples.length > 12);
    const carCount = Math.min(30, eligible.length * 2);
    for (let i = 0; i < carCount; i++) {
      const rd = eligible[i % eligible.length];
      const total = rd.samples[rd.samples.length - 1].dist;
      const mat = new THREE.MeshStandardMaterial({ color: palette[i % palette.length], roughness: 0.5, metalness: 0.25 });
      const mesh = new THREE.Mesh(carGeo, mat);
      mesh.castShadow = true;
      this.trafficGroup.add(mesh);
      this.cars.push({
        samples: rd.samples, total, dist: (total / carCount) * i + Math.random() * 20,
        speed: 9 + Math.random() * 9, lane: (i % 2 === 0 ? 1 : -1) * 1.8, mesh,
      });
    }
    // heavy rail consist on longest rail
    const heavy = world.railData.filter((r) => r.rail.kind === 'rail').sort((a, b) => b.samples.length - a.samples.length)[0];
    if (heavy) {
      const total = heavy.samples[heavy.samples.length - 1].dist;
      const carGeoT = new THREE.BoxGeometry(2.9, 3.1, 11);
      carGeoT.translate(0, 2.1, 0);
      for (let i = 0; i < 5; i++) {
        const mat = new THREE.MeshStandardMaterial({ color: i === 0 ? '#27435e' : '#7a2020', roughness: 0.55, metalness: 0.3 });
        const mesh = new THREE.Mesh(carGeoT, mat);
        mesh.castShadow = true;
        this.trafficGroup.add(mesh);
        this.trains.push({ samples: heavy.samples, total, dist: total * 0.15 - i * 12.5, speed: 16, mesh, dy: 0.4 });
      }
    }
    // monorails on longest monorail
    const mono = world.railData.filter((r) => r.rail.kind === 'monorail').sort((a, b) => b.samples.length - a.samples.length)[0];
    if (mono) {
      const total = mono.samples[mono.samples.length - 1].dist;
      const mGeo = new THREE.BoxGeometry(2.3, 2.2, 9);
      mGeo.translate(0, 1.9, 0);
      for (const frac of [0.1, 0.55]) {
        for (let i = 0; i < 3; i++) {
          const mat = new THREE.MeshStandardMaterial({ color: '#e8eef4', roughness: 0.4, metalness: 0.2 });
          const mesh = new THREE.Mesh(mGeo, mat);
          mesh.castShadow = true;
          this.trafficGroup.add(mesh);
          this.trains.push({ samples: mono.samples, total, dist: total * frac - i * 10, speed: 13, mesh, dy: 0.75, mono: true });
        }
      }
    }
  }

  sampleAt(samples, dist) {
    const total = samples[samples.length - 1].dist;
    let d = ((dist % total) + total) % total;
    let lo = 0, hi = samples.length - 1;
    while (lo < hi - 1) { const mid = (lo + hi) >> 1; if (samples[mid].dist <= d) lo = mid; else hi = mid; }
    const a = samples[lo], b = samples[hi];
    const t = (d - a.dist) / Math.max(1e-6, b.dist - a.dist);
    return {
      x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, y: a.y + (b.y - a.y) * t,
      dx: a.dirx + (b.dirx - a.dirx) * t, dz: a.dirz + (b.dirz - a.dirz) * t,
    };
  }

  makeClouds() {
    const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, transparent: true, opacity: 0.85 });
    for (let i = 0; i < 9; i++) {
      const g = new THREE.Group();
      const n = 3 + (i % 3);
      for (let k = 0; k < n; k++) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(40 + ((i * 7 + k * 13) % 40), 10, 26 + ((i * 5 + k * 11) % 24)), mat);
        m.position.set(k * 30 - n * 15, (k % 2) * 6, (k % 3) * 12);
        g.add(m);
      }
      g.position.set(-600 + ((i * 173) % 1200), 190 + (i % 4) * 22, -600 + ((i * 271) % 1200));
      this.scene.add(g);
      this.clouds.push({ g, v: 1.2 + (i % 3) * 0.7 });
    }
  }

  tick() {
    const now = performance.now();
    const dt = Math.min(0.05, (now - this._last) / 1000);
    this._last = now;
    // traffic
    const showC = this.showCars, showT = this.showTrains;
    for (const c of this.cars) {
      c.mesh.visible = showC;
      if (!showC) continue;
      c.dist += c.speed * dt;
      const p = this.sampleAt(c.samples, c.dist);
      const lx = -p.dz, lz = p.dx;
      c.mesh.position.set(p.x + lx * c.lane, p.y + 0.08, p.z + lz * c.lane);
      c.mesh.rotation.y = Math.atan2(p.dx, p.dz);
    }
    for (const t of this.trains) {
      t.mesh.visible = showT;
      if (!showT) continue;
      t.dist += t.speed * dt;
      const p = this.sampleAt(t.samples, t.dist);
      t.mesh.position.set(p.x, p.y + (t.dy || 0), p.z);
      t.mesh.rotation.y = Math.atan2(p.dx, p.dz);
    }
    for (const c of this.clouds) {
      c.g.position.x += c.v * dt;
      if (c.g.position.x > 700) c.g.position.x = -700;
    }
    if (this.materials.water) {
      this.materials.water.opacity = 0.8 + Math.sin(now * 0.0009) * 0.04;
    }
    if (this.flyover) {
      this._flyT += dt * 0.045;
      const a = this._flyT;
      this.camera.position.set(Math.cos(a) * 520, 200 + Math.sin(a * 2.3) * 60, Math.sin(a) * 520 + 60);
      this.camera.lookAt(0, 0, 60);
    } else {
      this.controls.update();
    }
    this.renderer.render(this.scene, this.camera);
  }

  setWireframe(on) {
    for (const m of Object.values(this.materials)) m.wireframe = !!on;
  }
}

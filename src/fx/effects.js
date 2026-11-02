import * as THREE from 'three';

/** Splash sources that feed the 3D particle sim and the 2.5D ripple/foam grid. */
export class Effects {
  constructor({ scene, particles, ripple, waves, terrain }) {
    this.scene = scene;
    this.particles = particles;
    this.ripple = ripple;
    this.waves = waves;
    this.terrain = terrain;
    this.params = { clickSplash: true, splashScale: 1.0, crestSpray: true, shoreSpray: true, rockSize: 0.7 };
    this.rocks = [];
    this.rockMat = new THREE.MeshStandardMaterial({ color: 0x6b6660, roughness: 0.9, flatShading: true });
    this.focus = new THREE.Vector3();
  }

  emitter() {
    return {
      particles: (e) => this.particles.emit(e),
      drop: (x, z, r, s) => this.ripple.addDrop(x, z, r, s),
    };
  }

  /** Crown splash + Worthington jet + ripple ring + foam. */
  splash(x, z, scale = 1) {
    const s = scale * this.params.splashScale;
    const H = this.waves.heightAt(x, z);
    const p = new THREE.Vector3(x, H, z);
    const P = this.particles;
    P.emit({ kind: 1, count: 2600 * s, pos: p, spread: 0.08 * s, ring: 0.35 * s, radial: 2.6 * Math.sqrt(s), vel: new THREE.Vector3(0, 4.2 * Math.sqrt(s), 0), velSpread: 0.6, type: 1, life: 4 });
    P.emit({ kind: 0, count: 1100 * s, pos: p.clone().setY(H + 0.15), spread: 0.14 * s, vel: new THREE.Vector3(0, 7.5 * Math.sqrt(s), 0), velSpread: 0.9, type: 1, life: 4 });
    P.emit({ kind: 1, count: 1400 * s, pos: p, spread: 0.3 * s, ring: 0.9 * s, radial: 1.2, vel: new THREE.Vector3(), velSpread: 0.2, type: 2, life: 11 });
    this.ripple.addDrop(x, z, 0.9 * Math.sqrt(s), 0.35 * s);
  }

  dropRock(around) {
    const r = this.params.rockSize * (0.7 + Math.random() * 0.6);
    const geo = new THREE.IcosahedronGeometry(r, 1);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const f = 0.8 + Math.random() * 0.35;
      pos.setXYZ(i, pos.getX(i) * f, pos.getY(i) * f, pos.getZ(i) * f);
    }
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, this.rockMat);
    const a = Math.random() * Math.PI * 2, d = 6 + Math.random() * 6;
    mesh.position.set(around.x + Math.cos(a) * d, 14 + Math.random() * 6, around.z + Math.sin(a) * d);
    this.scene.add(mesh);
    this.rocks.push({ mesh, r, vel: new THREE.Vector3(0, 0, 0), spin: new THREE.Vector3(Math.random(), Math.random(), Math.random()).multiplyScalar(3), splashed: false, age: 0 });
  }

  update(dt, focus) {
    this.focus.copy(focus);
    // Rocks
    for (let i = this.rocks.length - 1; i >= 0; i--) {
      const R = this.rocks[i];
      R.age += dt;
      const m = R.mesh;
      const H = this.waves.heightAt(m.position.x, m.position.z);
      if (!R.splashed) {
        R.vel.y -= 9.81 * dt;
        if (m.position.y - R.r * 0.5 < H) {
          R.splashed = true;
          const speed = -R.vel.y;
          this.splash(m.position.x, m.position.z, Math.min(2.2, 0.35 + speed * R.r * 0.09));
          R.vel.multiplyScalar(0.2);
        }
      } else {
        R.vel.y += (-1.6 - R.vel.y) * Math.min(1, dt * 3);
      }
      m.position.addScaledVector(R.vel, dt);
      m.rotation.x += R.spin.x * dt; m.rotation.y += R.spin.y * dt;
      const ground = this.terrain.sample(m.position.x, m.position.z).h;
      if (m.position.y < ground + R.r * 0.6) { m.position.y = ground + R.r * 0.6; R.vel.set(0, 0, 0); }
      if (R.age > 12) { this.scene.remove(m); m.geometry.dispose(); this.rocks.splice(i, 1); }
    }

    if (!this.particles.params.enabled) return;
    const W = this.waves;
    // Whitecap spray anywhere around the player: crests where the Gerstner surface folds
    if (this.params.crestSpray && W.params.height > 0.5) {
      let emitted = 0;
      const thresh = this.crestThreshold ?? 0.72;
      for (let i = 0; i < 20 && emitted < 3; i++) {
        const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * 55;
        const x = focus.x + Math.cos(a) * d, z = focus.z + Math.sin(a) * d;
        const g = this.terrain.sample(x, z);
        if (g.h > -4) continue;
        const b = W.baseAt(x, z);
        const J = W.jacobian(b.x, b.z);
        if (J < thresh - 0.08) {
          const sev = Math.min(1, (thresh - 0.08 - J) * 4) * Math.min(1.5, W.params.height / 2);
          const H = W.heightAt(x, z);
          const wind = W.windVector;
          const vel = new THREE.Vector3(wind.x * (1.5 + W.params.height), 1.4 + W.params.height * 0.7, wind.y * (1.5 + W.params.height));
          this.particles.emit({ kind: 0, count: 40 + 160 * sev, pos: new THREE.Vector3(x, H + 0.1, z), spread: 0.6, vel, velSpread: 0.7, type: 1, life: 3 });
          emitted++;
        }
      }
    }
    // Shore-break spray where breakers hit the beach / boulders
    if (this.params.shoreSpray && W.params.shoreWaves) {
      let emitted = 0;
      for (let i = 0; i < 28 && emitted < 3; i++) {
        const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * 70;
        const x = focus.x + Math.cos(a) * d, z = focus.z + Math.sin(a) * d;
        const g = this.terrain.sample(x, z);
        if (g.d < 1.5 || g.d > 9) continue;
        const sh = W.shoreHeight(x, z, g.d);
        if (sh.crest > 0.5 && Math.random() < 0.25) {
          const e = 2;
          const gx = this.terrain.sample(x + e, z).d - this.terrain.sample(x - e, z).d;
          const gz = this.terrain.sample(x, z + e).d - this.terrain.sample(x, z - e).d;
          const n = new THREE.Vector2(-gx, -gz).normalize();
          const H = W.heightAt(x, z);
          const amp = W.params.shoreAmp;
          this.particles.emit({ kind: 0, count: 90 * amp + 30, pos: new THREE.Vector3(x, H, z), spread: 0.9, vel: new THREE.Vector3(n.x * 2.5, 2.2 + amp * 2.5, n.y * 2.5), velSpread: 0.9, type: 1, life: 3 });
          this.particles.emit({ kind: 0, count: 60, pos: new THREE.Vector3(x, H, z), spread: 1.6, vel: new THREE.Vector3(n.x, 0, n.y), velSpread: 0.3, type: 2, life: 7 });
          emitted++;
        }
      }
    }
  }
}

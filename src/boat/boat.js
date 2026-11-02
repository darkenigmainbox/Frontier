import * as THREE from 'three';

const _q = new THREE.Quaternion();

function buildHull(L, B) {
  // Local axes: +X bow, +Y up, +Z starboard
  const NU = 40, NV = 12;
  const halfW = (u) => (u < 0.55 ? (B / 2) * (0.9 + 0.1 * (u / 0.55)) : (B / 2) * Math.sqrt(Math.max(0, 1 - ((u - 0.55) / 0.45) ** 2)));
  const keel = (u) => -0.55 + 0.42 * Math.max(0, (u - 0.6) / 0.4) ** 1.6 + 0.08 * Math.max(0, (0.12 - u) / 0.12);
  const gun = (u) => 0.62 + 0.3 * u * u;
  const dead = (u) => 0.22 + 0.25 * u;
  const section = (u, v) => {
    // v in [-1, 1]: port gunwale -> keel -> starboard gunwale
    const w = halfW(u), k = keel(u), g = gun(u), dr = dead(u);
    const a = Math.abs(v);
    let z, y;
    if (a < 0.5) { const t = a / 0.5; z = w * 0.86 * t; y = k + dr * t; }
    else { const t = (a - 0.5) / 0.5; z = w * (0.86 + 0.14 * Math.sin(t * Math.PI / 2)); y = k + dr + (g - k - dr) * t; }
    return [(u - 0.5) * L, y, Math.sign(v) * z];
  };
  const pos = [], col = [], idx = [];
  const white = [0.92, 0.92, 0.9], red = [0.45, 0.06, 0.05], stripe = [0.05, 0.18, 0.42], deck = [0.55, 0.42, 0.28];
  const colorAt = (y, u) => (y < 0.02 ? red : y > gun(u) - 0.16 && y < gun(u) - 0.06 ? stripe : white);
  for (let i = 0; i <= NU; i++) {
    const u = i / NU;
    for (let j = 0; j <= NV * 2; j++) {
      const v = j / NV - 1;
      const p = section(u, v);
      pos.push(...p); col.push(...colorAt(p[1], u));
    }
  }
  const row = NV * 2 + 1;
  for (let i = 0; i < NU; i++) for (let j = 0; j < NV * 2; j++) {
    const a = i * row + j, b = a + 1, c = a + row, d = c + 1;
    idx.push(a, b, c, b, d, c);
  }
  // Deck (quad strip between gunwales)
  const deckStart = pos.length / 3;
  for (let i = 0; i <= NU; i++) {
    const u = i / NU;
    const pL = section(u, -1), pR = section(u, 1);
    pos.push(pL[0], pL[1] - 0.04, pL[2], pR[0], pR[1] - 0.04, pR[2]);
    col.push(...deck, ...deck);
  }
  for (let i = 0; i < NU; i++) {
    const a = deckStart + i * 2, b = a + 1, c = a + 2, d = a + 3;
    idx.push(a, c, b, b, c, d);
  }
  // Transom (fan)
  const tc = pos.length / 3;
  pos.push(-L / 2, (keel(0) + gun(0)) / 2, 0); col.push(...white);
  for (let j = 0; j <= NV * 2; j++) {
    const p = section(0, j / NV - 1);
    pos.push(...p); col.push(...colorAt(p[1], 0));
  }
  for (let j = 0; j < NV * 2; j++) idx.push(tc, tc + 1 + j + 1, tc + 1 + j);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

export class Boat {
  constructor(waves, terrain, start = new THREE.Vector3(20, 0, 168), yaw = -Math.PI / 2) {
    this.waves = waves;
    this.terrain = terrain;
    this.L = 6.8; this.B = 2.3;
    this.mesh = new THREE.Group();
    const hullMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.0, side: THREE.DoubleSide });
    this.mesh.add(new THREE.Mesh(buildHull(this.L, this.B), hullMat));
    const add = (geo, mat, x, y, z, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.z = rz; this.mesh.add(m); return m; };
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xe8e8e4, roughness: 0.4 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x1a1d22, roughness: 0.5, metalness: 0.3 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x0b1820, roughness: 0.05, metalness: 0.9 });
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x2b4a6b, roughness: 0.8 });
    add(new THREE.BoxGeometry(1.1, 0.75, 1.2), whiteMat, 0.1, 1.0, 0);            // console
    add(new THREE.BoxGeometry(0.05, 0.55, 1.25), glassMat, 0.72, 1.35, 0, -0.55);  // windshield
    add(new THREE.BoxGeometry(0.7, 0.35, 1.5), seatMat, -1.4, 0.8, 0);            // bench
    add(new THREE.BoxGeometry(0.5, 0.9, 0.45), darkMat, -3.55, 0.55, 0);           // outboard
    add(new THREE.BoxGeometry(0.35, 0.55, 0.12), darkMat, -3.6, -0.05, 0);         // leg
    const rail = new THREE.MeshStandardMaterial({ color: 0xc8ccd0, roughness: 0.2, metalness: 1.0 });
    for (const s of [-1, 1]) add(new THREE.CylinderGeometry(0.025, 0.025, 3.2, 8), rail, 1.3, 1.25, s * 0.95, Math.PI / 2);

    this.position = start.clone();
    this.velocity = new THREE.Vector3();
    this.yaw = yaw; this.yawRate = 0;
    this.pitch = 0; this.roll = 0; this.pitchVel = 0; this.rollVel = 0;
    this.heading2D = new THREE.Vector2(Math.cos(yaw), Math.sin(yaw));
    this.speed = 0;
    this.throttle = 0; this.steer = 0;
    this.keys = {};
    this.collisionHalf = new THREE.Vector3(3.5, 0.75, 1.2);
    this.collisionCenter = new THREE.Vector3();
    this.airborne = false;
    this.emitAcc = { bow: 0, wash: 0, side: 0, rooster: 0 };
    this.params = { thrust: 1.0, enabled: true, spray: true };
    this.position.y = waves.heightAt(start.x, start.z) - 0.3;
    this.bindKeys();
    this.syncMesh();
  }

  bindKeys() {
    const set = (e, v) => {
      const k = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift'].includes(k)) {
        this.keys[k] = v;
        if (k.startsWith('arrow')) e.preventDefault();
      }
    };
    window.addEventListener('keydown', (e) => { if (e.target.tagName !== 'INPUT') set(e, true); });
    window.addEventListener('keyup', (e) => set(e, false));
    window.addEventListener('blur', () => { this.keys = {}; });
  }

  reset(p, yaw) {
    this.position.copy(p); this.velocity.set(0, 0, 0);
    this.yaw = yaw; this.yawRate = 0; this.pitch = this.roll = this.pitchVel = this.rollVel = 0;
    this.position.y = this.waves.heightAt(p.x, p.z) - 0.3;
  }

  localToWorld(x, y, z, out) { return out.set(x, y, z).applyMatrix4(this.mesh.matrixWorld); }

  update(dt, emit) {
    const k = this.keys;
    const fwdIn = (k.w || k.arrowup ? 1 : 0) - (k.s || k.arrowdown ? 1 : 0);
    const steerIn = (k.d || k.arrowright ? 1 : 0) - (k.a || k.arrowleft ? 1 : 0);
    this.throttle += (fwdIn - this.throttle) * Math.min(1, dt * 2.5);
    this.steer += (steerIn - this.steer) * Math.min(1, dt * 4);
    const boost = k.shift ? 1.6 : 1.0;

    const fwd = new THREE.Vector2(Math.cos(this.yaw), Math.sin(this.yaw));
    this.heading2D.copy(fwd);
    const side = new THREE.Vector2(-fwd.y, fwd.x);
    const vh = new THREE.Vector2(this.velocity.x, this.velocity.z);
    const vF = vh.dot(fwd), vS = vh.dot(side);

    // Sample the ocean at hull points (same function the GPU renders)
    const W = this.waves;
    const hx = this.L * 0.38, hz = this.B * 0.42;
    const px = this.position.x, pz = this.position.z;
    const hBow = W.heightAt(px + fwd.x * hx, pz + fwd.y * hx);
    const hStern = W.heightAt(px - fwd.x * hx, pz - fwd.y * hx);
    const hPort = W.heightAt(px - side.x * hz, pz - side.y * hz);
    const hStar = W.heightAt(px + side.x * hz, pz + side.y * hz);
    const hC = W.heightAt(px, pz);
    const hMean = (hBow + hStern + hPort + hStar + hC * 2) / 6;

    const draft = 0.42;
    const submersion = hMean - (this.position.y - draft);
    const inWater = submersion > 0.02;
    const wasAir = this.airborne;
    this.airborne = submersion < -0.05;
    const wet = THREE.MathUtils.clamp(submersion / draft, 0, 1.6);

    // Propulsion only while the prop is in the water
    const thrust = this.throttle * 7.0 * this.params.thrust * boost * (inWater ? 1 : 0.1);
    let aF = thrust - 0.045 * vF * Math.abs(vF) - 0.15 * vF;
    let aS = -vS * (inWater ? 2.6 : 0.2);
    let newVF = vF + aF * dt;
    let newVS = vS + aS * dt;
    // Steering (works better with speed; reversed when going backwards)
    const steerAuth = (0.35 + 0.09 * Math.abs(vF)) * Math.sign(vF + 0.6);
    const yawTarget = THREE.MathUtils.clamp(this.steer * steerAuth, -1.1, 1.1);
    this.yawRate += (yawTarget - this.yawRate) * Math.min(1, dt * (inWater ? 2.2 : 0.3));
    this.yaw += this.yawRate * dt;

    // Vertical: buoyancy + damping + gravity (can go airborne and slam)
    const buoy = (9.81 / draft) * Math.max(0, submersion);
    const vy = this.velocity.y + (buoy - 9.81 - this.velocity.y * 3.2 * Math.min(wet, 1)) * dt;

    const nf = new THREE.Vector2(Math.cos(this.yaw), Math.sin(this.yaw));
    const ns = new THREE.Vector2(-nf.y, nf.x);
    this.velocity.set(nf.x * newVF + ns.x * newVS, vy, nf.y * newVF + ns.y * newVS);
    this.position.addScaledVector(this.velocity, dt);

    // Pitch / roll follow the local wave slope + planing + banking
    const slopePitch = Math.atan2(hBow - hStern, 2 * hx);
    const slopeRoll = Math.atan2(hStar - hPort, 2 * hz);
    const planing = THREE.MathUtils.clamp(vF * 0.011, -0.05, 0.11) * (1 - THREE.MathUtils.clamp((vF - 9) / 8, 0, 0.6));
    const pitchT = slopePitch + planing;
    const rollT = slopeRoll * 0.85 - this.yawRate * vF * 0.025; // bank into turns
    const kAng = inWater ? 14 : 1.5, cAng = inWater ? 4.5 : 0.6;
    this.pitchVel += (kAng * (pitchT - this.pitch) - cAng * this.pitchVel) * dt;
    this.rollVel += (kAng * (rollT - this.roll) - cAng * this.rollVel) * dt;
    this.pitch += this.pitchVel * dt;
    this.roll += this.rollVel * dt;

    // Terrain: run aground gracefully
    const g = this.terrain.sample(this.position.x, this.position.z);
    if (g.h > this.position.y - 0.55) {
      const e = 1.5;
      const gx = this.terrain.sample(this.position.x + e, this.position.z).h - this.terrain.sample(this.position.x - e, this.position.z).h;
      const gz = this.terrain.sample(this.position.x, this.position.z + e).h - this.terrain.sample(this.position.x, this.position.z - e).h;
      const n = new THREE.Vector2(-gx, -gz);
      if (n.lengthSq() > 1e-6) {
        n.normalize();
        const vn = this.velocity.x * n.x + this.velocity.z * n.y;
        if (vn < 0) { this.velocity.x -= 1.4 * vn * n.x; this.velocity.z -= 1.4 * vn * n.y; }
        this.position.x += n.x * 0.05; this.position.z += n.y * 0.05;
      }
      this.velocity.multiplyScalar(0.96);
      this.position.y = Math.max(this.position.y, g.h + 0.55);
    }

    this.speed = Math.hypot(this.velocity.x, this.velocity.z);
    this.syncMesh();
    if (emit && this.params.spray) this.emitSpray(dt, emit, hMean, wasAir, inWater, vF);
  }

  syncMesh() {
    this.mesh.position.copy(this.position);
    // Order: yaw about Y, then roll about local X (bow axis), then pitch about local Z
    _q.setFromEuler(new THREE.Euler(0, -this.yaw, 0));
    const qr = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), this.roll);
    const qp = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), this.pitch);
    this.mesh.quaternion.copy(_q).multiply(qp).multiply(qr);
    this.mesh.updateMatrixWorld(true);
    this.localToWorld(0, 0.2, 0, this.collisionCenter);
  }

  emitSpray(dt, emit, hMean, wasAir, inWater, vF) {
    const sp = Math.abs(vF);
    const up = new THREE.Vector3(0, 1, 0);
    const fwd3 = new THREE.Vector3(Math.cos(this.yaw), 0, Math.sin(this.yaw));
    const side3 = new THREE.Vector3(-fwd3.z, 0, fwd3.x);
    const acc = this.emitAcc;

    // Slamming back into the water after being airborne
    if (wasAir && inWater && this.velocity.y < -1.8) {
      const s = Math.min(-this.velocity.y / 5, 1.5);
      const c = this.localToWorld(0.6, 0, 0, new THREE.Vector3());
      c.y = hMean;
      emit.particles({ kind: 1, count: 2600 * s, pos: c, spread: 0.3, ring: 1.6, radial: 2.5 + s * 2.5, vel: new THREE.Vector3(this.velocity.x * 0.5, 2.5 + s * 3, this.velocity.z * 0.5), velSpread: 0.8, type: 1, life: 4 });
      emit.particles({ kind: 1, count: 1200 * s, pos: c, spread: 0.6, ring: 2.2, radial: 1.2, vel: new THREE.Vector3(), velSpread: 0.3, type: 2, life: 9 });
      emit.drop(c.x, c.z, 2.2, 0.25 * s);
    }
    if (!inWater) return;

    // Bow sheets: water climbing the hull and peeling off the waterline from the stem to midships.
    // Emitted at several points along each side so the sheet is a continuous, detailed curtain.
    if (sp > 1.5) {
      acc.bow += (sp - 1.5) * 520 * dt;
      const n = Math.floor(acc.bow); acc.bow -= n;
      if (n > 0) {
        const pts = [0.0, 0.4, 0.8];
        for (const s of [-1, 1]) {
          for (const t of pts) {
            const lx = 3.0 - t * 2.4;
            // just outside the tapered hull (matches the particle collider in the advect shader)
            const tb = Math.min(Math.max(lx / this.collisionHalf.x, -1), 1);
            const bowT = Math.min(Math.max((tb - 0.25) / 0.75, 0), 1);
            const lz = s * (this.collisionHalf.z * Math.sqrt(Math.max(0, 1 - bowT * bowT)) + 0.08);
            const p = this.localToWorld(lx, -0.2, lz, new THREE.Vector3());
            p.y = Math.max(p.y, hMean - 0.05);
            const k = 1 - 0.55 * t;
            const v = new THREE.Vector3()
              .addScaledVector(side3, s * (0.3 * sp + 0.5) * k)
              .addScaledVector(up, (0.16 * sp + 0.9) * k)
              .addScaledVector(fwd3, 0.55 * sp * (1 - t));
            emit.particles({ kind: 0, count: n / (2 * pts.length), pos: p, spread: 0.12 + 0.1 * t, vel: v, velSpread: 0.18 + sp * 0.03, type: 1, life: 2.5 });
          }
        }
      }
    }
    // Stern wash foam + hull side foam (3D particle foam)
    if (sp > 0.8) {
      acc.wash += sp * 45 * dt;
      let n = Math.floor(acc.wash); acc.wash -= n;
      if (n > 0) emit.particles({ kind: 0, count: n, pos: this.localToWorld(-3.8, 0, 0, new THREE.Vector3()), spread: 0.7, vel: fwd3.clone().multiplyScalar(-0.3 * sp), velSpread: 0.4, type: 2, life: 10 });
      acc.side += sp * 40 * dt;
      n = Math.floor(acc.side); acc.side -= n;
      if (n > 0) for (const s of [-1, 1]) {
        emit.particles({ kind: 0, count: n / 2, pos: this.localToWorld(0.8, 0, s * 1.15, new THREE.Vector3()), spread: 1.4, vel: side3.clone().multiplyScalar(s * 0.6), velSpread: 0.2, type: 2, life: 9 });
      }
    }
    // Prop rooster tail
    if (sp > 6 && this.throttle > 0.3) {
      acc.rooster += sp * 9 * this.throttle * dt;
      const n = Math.floor(acc.rooster); acc.rooster -= n;
      if (n > 0) {
        const p = this.localToWorld(-3.9, 0, 0, new THREE.Vector3());
        p.y = hMean;
        emit.particles({ kind: 0, count: n, pos: p, spread: 0.2, vel: fwd3.clone().multiplyScalar(-0.15 * sp).addScaledVector(up, 1.8 + sp * 0.1), velSpread: 1.1, type: 1, life: 2.0 });
      }
    }
  }
}

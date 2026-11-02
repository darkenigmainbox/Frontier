// ---------------------------------------------------------------------------
// Drivable test boat: lofted hull, 4-probe buoyancy sampled from the live
// water surface (analytic Gerstner + GPU sim readback), arcade propulsion,
// and full interaction back into the sim: propeller wash, V-wake splats,
// hull foam trail and bow spray (fed to the GPU particle emitters).
// Controls (wired in main): W/S throttle, A/D rudder, Space handbrake-ish stop.
// ---------------------------------------------------------------------------
import * as THREE from 'three';
import { HALF } from './config.js';

function buildHull() {
  // loft cross-sections from stern (z=-3.4) to bow (z=+3.6)
  const LEN_SEG = 14, RAD_SEG = 10;
  const positions = [], indices = [];
  for (let i = 0; i <= LEN_SEG; i++) {
    const t = i / LEN_SEG;                       // 0 stern -> 1 bow
    const z = THREE.MathUtils.lerp(-3.4, 3.6, t);
    const beam = 2.15 * Math.pow(Math.sin(Math.PI * (0.12 + 0.88 * Math.min(t * 1.12, 1))), 0.55)
      * (t > 0.85 ? (1 - (t - 0.85) / 0.15) * 0.92 + 0.08 : 1);
    const depth = 0.85 * Math.pow(Math.sin(Math.PI * Math.min(0.15 + t * 0.95, 1)), 0.7) + 0.08;
    const sheer = 0.55 + Math.pow(Math.abs(t - 0.45) * 2, 2.2) * 0.38;   // raised bow/stern
    for (let j = 0; j <= RAD_SEG; j++) {
      const s = j / RAD_SEG;                     // 0 port deck -> 1 starboard deck
      const x = (s - 0.5) * beam;
      const y = sheer - Math.pow(Math.sin(Math.PI * s), 0.75) * (depth + sheer - 0.02);
      positions.push(x, y, z);
    }
  }
  for (let i = 0; i < LEN_SEG; i++) {
    for (let j = 0; j < RAD_SEG; j++) {
      const a = i * (RAD_SEG + 1) + j, b = a + RAD_SEG + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

export class Boat {
  constructor(scene) {
    this.group = new THREE.Group();
    const white = new THREE.MeshStandardMaterial({ color: 0xf2f0e9, roughness: 0.32, metalness: 0.08, side: THREE.DoubleSide });
    const teak = new THREE.MeshStandardMaterial({ color: 0x9a6b42, roughness: 0.8 });
    const teal = new THREE.MeshStandardMaterial({ color: 0x14666e, roughness: 0.4, metalness: 0.15 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x22262b, roughness: 0.55, metalness: 0.35 });
    const glass = new THREE.MeshStandardMaterial({ color: 0x9fd4e8, roughness: 0.08, metalness: 0.4, transparent: true, opacity: 0.55 });

    const hull = new THREE.Mesh(buildHull(), white);
    hull.castShadow = true;
    this.group.add(hull);

    // stripe + deck
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.16, 5.6), teal);
    stripe.position.set(0, 0.42, -0.25);
    this.group.add(stripe);
    const deck = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.09, 6.1), teak);
    deck.position.set(0, 0.62, -0.1);
    deck.castShadow = true;
    this.group.add(deck);
    const bowDeck = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.09, 20, 1, false, 0, Math.PI), teak);
    bowDeck.rotation.z = 0; bowDeck.rotation.y = Math.PI / 2;
    bowDeck.scale.set(1, 1, 1.9);
    bowDeck.position.set(0, 0.62, 2.55);
    this.group.add(bowDeck);

    // console + windshield + seats
    const console_ = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.85, 0.85), white);
    console_.position.set(0, 1.05, 0.55); console_.castShadow = true;
    this.group.add(console_);
    const shield = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.55, 0.06), glass);
    shield.position.set(0, 1.62, 0.82); shield.rotation.x = -0.28;
    this.group.add(shield);
    const seatGeo = new THREE.BoxGeometry(0.62, 0.5, 0.6);
    for (const sx of [-0.48, 0.48]) {
      const seat = new THREE.Mesh(seatGeo, teal);
      seat.position.set(sx, 0.9, -0.4); seat.castShadow = true;
      this.group.add(seat);
    }
    const bench = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.45, 0.55), teal);
    bench.position.set(0, 0.85, -2.2);
    this.group.add(bench);

    // canopy frame
    const postGeo = new THREE.CylinderGeometry(0.035, 0.035, 1.15, 8);
    for (const [px, pz] of [[-0.85, 0.9], [0.85, 0.9], [-0.85, -1.5], [0.85, -1.5]]) {
      const post = new THREE.Mesh(postGeo, dark);
      post.position.set(px, 1.5, pz);
      this.group.add(post);
    }
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.07, 2.7), white);
    canopy.position.set(0, 2.1, -0.3); canopy.castShadow = true;
    this.group.add(canopy);

    // outboard motor
    const motor = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.0, 0.42), dark);
    motor.position.set(0, 0.55, -3.55); motor.castShadow = true;
    this.group.add(motor);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.7, 0.5), dark);
    fin.position.set(0, -0.25, -3.6);
    this.group.add(fin);
    this.motor = motor;

    // nav lights
    const mkLight = (color, x) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 10),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 2.2 }));
      m.position.set(x, 0.78, 2.3);
      this.group.add(m);
    };
    mkLight(0xff2233, -0.85); mkLight(0x22ff66, 0.85);

    // soft blob shadow + hull foam ring (fake AO on the water)
    this.blob = new THREE.Mesh(
      new THREE.CircleGeometry(3.4, 24),
      new THREE.MeshBasicMaterial({ color: 0x02141c, transparent: true, opacity: 0.32, depthWrite: false }),
    );
    this.blob.rotation.x = -Math.PI / 2;
    this.blob.scale.set(0.72, 1.25, 1);
    this.blob.renderOrder = 2;
    scene.add(this.blob);

    scene.add(this.group);
    this.reset();

    // state
    this.speed = 0;
    this.steer = 0;
    this._splatAcc = 0;
    this._bobPhase = Math.random() * 10;
  }

  reset() {
    this.pos = new THREE.Vector3(34, 0, 30);
    this.heading = Math.atan2(-34 - 0, 30 - 0) + Math.PI; // roughly toward island
    this.heading = -2.25;
    this.speed = 0;
    this.group.position.copy(this.pos);
  }

  get forward() { return new THREE.Vector2(Math.sin(this.heading), Math.cos(this.heading)); }

  /**
   * input: { throttle -1..1, steer -1..1, brake }
   * sample(x,z) -> water surface height
   * terrainAt(x,z) -> terrain height
   * fx: { splat(x,z,r,s), burst(x,z,s,r) }
   * wakeOn: emit sim interaction
   */
  update(dt, input, sample, terrainAt, fx, wakeOn, time) {
    const MAXS = 15;
    // propulsion
    const accel = input.throttle * 7.5;
    this.speed += accel * dt;
    this.speed -= this.speed * 0.22 * dt * (1 + Math.abs(this.speed) * 0.06); // hydro drag
    if (input.brake) this.speed -= this.speed * 2.6 * dt;
    if (input.throttle === 0) this.speed -= this.speed * 0.35 * dt;
    this.speed = THREE.MathUtils.clamp(this.speed, -4.5, MAXS);

    // rudder authority grows with speed
    const spdF = THREE.MathUtils.clamp(this.speed / 6, -1, 1);
    this.steer = THREE.MathUtils.lerp(this.steer, input.steer, 1 - Math.exp(-dt * 6));
    this.heading -= this.steer * spdF * 0.85 * dt * (Math.abs(this.speed) > 0.2 ? 1 : 0);

    const fwd = this.forward;
    let nx = this.pos.x + fwd.x * this.speed * dt;
    let nz = this.pos.z + fwd.y * this.speed * dt;

    // soft shore collision: ground out and slide along the beach
    const th = terrainAt(nx, nz);
    if (th > -0.55) {
      const push = 14 * dt;
      const gx = terrainAt(nx + 1.5, nz) - terrainAt(nx - 1.5, nz);
      const gz = terrainAt(nx, nz + 1.5) - terrainAt(nx, nz - 1.5);
      nx -= gx * push; nz -= gz * push;
      this.speed *= Math.max(0, 1 - dt * 2.2);
      if (Math.abs(this.speed) > 2 && wakeOn) fx.burst(nx, nz, 0.8, 1.6);
    }
    nx = THREE.MathUtils.clamp(nx, -HALF + 6, HALF - 6);
    nz = THREE.MathUtils.clamp(nz, -HALF + 6, HALF - 6);
    this.pos.x = nx; this.pos.z = nz;

    // ---- buoyancy: 4 probes (bow, stern, port, starboard) ----
    const right = new THREE.Vector2(fwd.y, -fwd.x);
    const P = (along, side) => [
      this.pos.x + fwd.x * along + right.x * side,
      this.pos.z + fwd.y * along + right.y * side,
    ];
    const [bx, bz] = P(2.9, 0), [sx, sz] = P(-2.9, 0);
    const [px, pz] = P(0, -1.05), [qx, qz] = P(0, 1.05);
    const hBow = sample(bx, bz), hStern = sample(sx, sz);
    const hPort = sample(px, pz), hStar = sample(qx, qz);
    const hAvg = (hBow + hStern + hPort + hStar) * 0.25;

    const draft = 0.42 - Math.min(Math.abs(this.speed) * 0.016, 0.22); // planes up slightly at speed
    const targetY = hAvg + draft;
    this.pos.y = THREE.MathUtils.lerp(this.pos.y ?? targetY, targetY, 1 - Math.exp(-dt * 5));

    const pitch = Math.atan2(hStern - hBow, 5.8) + Math.min(this.speed * 0.006, 0.07) * (input.throttle > 0 ? 1 : 0.3);
    const roll = Math.atan2(hStar - hPort, 2.1) - this.steer * Math.abs(spdF) * 0.16;

    this.group.position.set(this.pos.x, this.pos.y, this.pos.z);
    const e = new THREE.Euler(pitch, this.heading, roll, 'YXZ');
    const targetQ = new THREE.Quaternion().setFromEuler(e);
    this.group.quaternion.slerp(targetQ, 1 - Math.exp(-dt * 4.5));
    this.motor.rotation.y = -this.steer * 0.4;

    // blob shadow rides the surface
    this.blob.position.set(this.pos.x, hAvg + 0.06, this.pos.z);
    this.blob.rotation.z = this.heading;

    // ---- interaction back into the grid ----
    let bowSpray = 0;
    this._splatAcc += dt;
    const moving = Math.abs(this.speed);
    if (wakeOn && this._splatAcc > 0.045) {
      this._splatAcc = 0;
      // prop wash + hull displacement (negative = pushed-down water at stern)
      if (moving > 0.4) {
        fx.splat(sx, sz, 1.7, -0.10 - moving * 0.012);
        // V-wake shoulders
        const back = 3.2 + moving * 0.25;
        for (const sgn of [-1, 1]) {
          const wx = this.pos.x - fwd.x * back + right.x * sgn * (1.1 + moving * 0.10);
          const wz = this.pos.z - fwd.y * back + right.y * sgn * (1.1 + moving * 0.10);
          fx.splat(wx, wz, 1.25, 0.045 + moving * 0.006);
        }
      }
      // gentle hull ripple ring even at rest (bobbing pushes water)
      fx.splat(bx, bz, 1.1, 0.02 + Math.sin(time * 1.3 + this._bobPhase) * 0.012);
    }
    // bow burying into a crest -> spray burst
    const bowDip = (hBow - this.pos.y);
    if (moving > 3.5 && bowDip > 0.12) {
      bowSpray = Math.min((bowDip - 0.1) * moving * 0.35, 2.4);
      if (wakeOn && Math.random() < 0.35) fx.splat(bx, bz, 1.5, 0.08);
    } else if (moving > 6) {
      bowSpray = (moving - 6) * 0.09;
    }

    return {
      x: this.pos.x, z: this.pos.z,
      dirX: fwd.x, dirZ: fwd.y,
      speed: this.speed,
      velX: fwd.x * this.speed, velZ: fwd.y * this.speed,
      bowX: bx, bowZ: bz, bowSpray,
      surfaceY: hAvg,
    };
  }
}

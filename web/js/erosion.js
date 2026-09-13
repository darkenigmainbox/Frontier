// Frontier — SDF-native eroders. No heightmaps: droplets sphere-trace to the
// surface and remove solid via CSG subtraction; sediment is carried and
// re-deposited via CSG union. DOM-free.

import { mulberry32, vnoise, clamp } from './noise.js';

// Fast column scan for surface Y using raw grid (no interpolation cost).
export function columnSurfaceY(vol, i, k) {
  const { nx, ny, dist } = vol;
  const base = k * ny * nx;
  for (let j = ny - 1; j > 0; j--) {
    const a = dist[base + j * nx + i];
    const b = dist[base + (j - 1) * nx + i];
    if (a > 0 && b <= 0) {
      const t = a / (a - b);
      const y1 = vol.minY + (j / (ny - 1)) * vol.sizeY;
      const y0 = vol.minY + ((j - 1) / (ny - 1)) * vol.sizeY;
      return y1 + (y0 - y1) * t;
    }
  }
  return null;
}

// Shared fixed particle pool (structure-of-arrays in one Float32Array).
// stride 12: px,py,pz,vx,vy,vz,water,sed,age,state,size,seed
export class ParticlePool {
  constructor(max) {
    this.max = max;
    this.data = new Float32Array(max * 12);
    this.alive = 0;
    this.cursor = 0;
    this.positions = new Float32Array(max * 3); // render view (compacted)
    this.posCount = 0;
  }
  reset() { this.alive = 0; this.cursor = 0; this.data.fill(0); }
  alloc() {
    // Find dead slot (state==0) scanning from cursor.
    if (this.alive >= this.max) return -1; // saturated: fail fast, no scan
    for (let n = 0; n < this.max; n++) {
      const s = (this.cursor + n) % this.max;
      if (this.data[s * 12 + 9] === 0) { this.cursor = (s + 1) % this.max; this.alive++; return s; }
    }
    return -1;
  }
  compactPositions() {
    let w = 0;
    const d = this.data;
    for (let s = 0; s < this.max; s++) {
      if (d[s * 12 + 9] !== 0) {
        this.positions[w * 3] = d[s * 12]; this.positions[w * 3 + 1] = d[s * 12 + 1]; this.positions[w * 3 + 2] = d[s * 12 + 2];
        w++;
      }
    }
    this.posCount = w;
  }
}

const _n = [0, 0, 0];

export const RainDefaults = {
  rainRate: 9000, maskGain: 6.0, baseProb: 0.15, dropSize: 1.6,
  gravity: 9.8, craterK: 0.30, craterAspect: 0.35, rMin: 2.0, rMax: 18.0,
  flowMax: 26, capacityK: 0.55, traction: 0.35, speedK: 1.25,
  chanR: 2.6, evap: 0.030, infil: 0.055, pickup: 0.85, depK: 2.2,
  maxParticles: 6000, targetDrops: 120000, hover: 40, seed: 1337,
  terminalV: 30, active: true,
};

export class RainSim {
  constructor(vol, params = {}) {
    this.vol = vol;
    this.p = { ...RainDefaults, ...params };
    this.pool = new ParticlePool(this.p.maxParticles);
    this.rng = mulberry32(this.p.seed);
    this.spawned = 0; this.retired = 0;
    this.c0 = vol.carvedVol; this.d0 = vol.depositedVol;
    this.seaLevel = 0;
  }
  setParams(p) { Object.assign(this.p, p); }
  reset() {
    this.pool.reset();
    this.rng = mulberry32(this.p.seed);
    this.spawned = 0; this.retired = 0; this._rr = 0;
    this.c0 = this.vol.carvedVol; this.d0 = this.vol.depositedVol;
  }
  get carved() { return this.vol.carvedVol - this.c0; }
  get deposited() { return this.vol.depositedVol - this.d0; }
  get done() { return this.retired >= this.p.targetDrops; }

  trySpawn() {
    const vol = this.vol, p = this.p, rng = this.rng;
    if (this.spawned >= p.targetDrops) return false;
    for (let attempt = 0; attempt < 6; attempt++) {
      const fx = 0.04 + rng() * 0.92, fz = 0.04 + rng() * 0.92;
      const x = vol.minX + fx * vol.sizeX, z = vol.minZ + fz * vol.sizeZ;
      const m = vol.samplePaint(vol.paintRain, x, z);
      if (rng() > p.baseProb + p.maskGain * m) continue;
      const i = Math.round(fx * (vol.nx - 1)), k = Math.round(fz * (vol.nz - 1));
      const sy = columnSurfaceY(vol, i, k);
      if (sy === null || sy < this.seaLevel + 1) continue;
      const s = this.pool.alloc();
      if (s < 0) return false;
      const d = this.pool.data, o = s * 12;
      d[o] = x; d[o + 1] = sy + p.hover * (0.5 + rng()); d[o + 2] = z;
      d[o + 3] = (rng() - 0.5) * 2; d[o + 4] = -16; d[o + 5] = (rng() - 0.5) * 2;
      d[o + 6] = 1; d[o + 7] = 0; d[o + 8] = 0; d[o + 9] = 1;
      d[o + 10] = p.dropSize * (0.7 + rng() * 0.6); d[o + 11] = rng() * 1000;
      this.spawned++;
      return true;
    }
    return false;
  }

  kill(s, depositRest = true) {
    const d = this.pool.data, o = s * 12;
    if (d[o + 9] === 0) return;
    if (depositRest && d[o + 7] > 0.02) {
      const vol = this.vol;
      vol.gradient(d[o], d[o + 1], d[o + 2], _n);
      const r = Math.cbrt(Math.max(d[o + 7], 0.05)) * 1.4;
      vol.depositBlob(d[o] + _n[0] * r * 0.3, d[o + 1] + _n[1] * r * 0.3, d[o + 2] + _n[2] * r * 0.3,
        clamp(r, 1, 8), clamp(r * 0.45, 0.5, 3), 0.25);
    }
    d[o + 9] = 0;
    this.pool.alive--;
    this.retired++;
  }

  // Advance up to maxSteps particle-steps. Returns steps executed.
  advance(maxSteps) {
    const vol = this.vol, p = this.p;
    const vox = vol.voxel, eps = vox * 0.18;
    let steps = 0;
    // Refill: spawn while under rate-implied population.
    if (p.active && !this.done) {
      const wantAlive = Math.min(p.maxParticles, 400 + p.rainRate * 0.25);
      // Rejection sampling misses often: retry through failures (pool.alloc
      // fails fast when saturated, so this loop stays cheap).
      let guard = p.maxParticles * 2;
      while (this.pool.alive < wantAlive && guard-- > 0) this.trySpawn();
    }
    const d = this.pool.data;
    // Round-robin stepping: consume the full budget even when alive < maxSteps.
    let cursor = this._rr || 0, deadRun = 0;
    const max = this.pool.max;
    while (steps < maxSteps && deadRun < max) {
      const slot = cursor;
      cursor = (cursor + 1) % max;
      const o = slot * 12;
      const st = d[o + 9];
      if (st === 0) { deadRun++; continue; }
      deadRun = 0;
      steps++;
      d[o + 8] += 1; // age
      if (st === 1) this.stepFalling(slot, o, eps);
      else this.stepFlowing(slot, o, eps);
    }
    this._rr = cursor;
    this.pool.compactPositions();
    return steps;
  }

  stepFalling(s, o, eps) {
    const vol = this.vol, p = this.p, d = this.pool.data;
    let px = d[o], py = d[o + 1], pz = d[o + 2];
    let vx = d[o + 3], vy = d[o + 4], vz = d[o + 5];
    const vox = vol.voxel;
    vy -= p.gravity * 0.03;
    if (vy < -p.terminalV) vy = -p.terminalV;
    const sp = Math.hypot(vx, vy, vz);
    // Sub-step so no tunneling.
    const dt = Math.min(0.05, (vox * 0.5) / Math.max(sp, 1e-3));
    px += vx * dt; py += vy * dt; pz += vz * dt;
    // Sphere-trace assist along velocity (fast-fall through open air).
    const dist = vol.sample(px, py, pz);
    if (dist > vox * 0.75) {
      const adv = Math.min(dist * 0.85, vox * 3 + sp * dt * 2);
      px += (vx / sp) * adv; py += (vy / sp) * adv; pz += (vz / sp) * adv;
    }
    d[o] = px; d[o + 1] = py; d[o + 2] = pz;
    d[o + 3] = vx; d[o + 4] = vy; d[o + 5] = vz;
    if (!vol.inside(px, py, pz)) { this.kill(s, false); return; }
    const dNow = vol.sample(px, py, pz);
    if (dNow <= eps) this.impact(s, o, sp);
    else if (d[o + 8] > 400) this.kill(s, false);
  }

  impact(s, o, sp) {
    const vol = this.vol, p = this.p, d = this.pool.data;
    const px = d[o], py = d[o + 1], pz = d[o + 2];
    vol.gradient(px, py, pz, _n);
    const hard = vol.hardnessAt(px, py, pz);
    const vnx = d[o + 3] / sp, vny = d[o + 4] / sp, vnz = d[o + 5] / sp;
    const facing = clamp(-(vnx * _n[0] + vny * _n[1] + vnz * _n[2]), 0.12, 1);
    const mass = Math.pow(d[o + 10], 3);
    const KE = 0.5 * mass * sp * sp;
    const r = clamp(p.craterK * Math.sqrt(KE) * (1 - 0.62 * hard) * Math.sqrt(facing), p.rMin, p.rMax);
    const dep = clamp(p.craterAspect * r * facing * (1 - 0.5 * hard), 0.2, r * 0.9);
    // Sphere center above surface so the cap digs `dep` deep.
    const cx = px + _n[0] * (r - dep), cy = py + _n[1] * (r - dep), cz = pz + _n[2] * (r - dep);
    vol.carveSphere(cx, cy, cz, r, r * 0.3, dep * 0.15);
    const capV = Math.PI * dep * dep * (r - dep / 3);
    d[o + 7] += capV * p.pickup;
    vol.splat(vol.moist, px, py, pz, 0.25, 1);
    // Deflect onto tangent plane -> flowing state.
    const vn = d[o + 3] * _n[0] + d[o + 4] * _n[1] + d[o + 5] * _n[2];
    d[o + 3] -= _n[0] * vn * 1.4; d[o + 4] -= _n[1] * vn * 1.4; d[o + 5] -= _n[2] * vn * 1.4;
    d[o + 9] = 2; d[o + 8] = 0;
  }

  stepFlowing(s, o, eps) {
    const vol = this.vol, p = this.p, d = this.pool.data;
    const vox = vol.voxel;
    let px = d[o], py = d[o + 1], pz = d[o + 2];
    vol.gradient(px, py, pz, _n);
    const slope = 1 - _n[1]; // 0 flat .. ~1 vertical (n.y in [-1,1] on surface)
    const hard = vol.hardnessAt(px, py, pz);
    // Downhill tangent: t = -up + n*(up.n).
    let tx = _n[0] * _n[1], ty = -1 + _n[1] * _n[1], tz = _n[2] * _n[1];
    const tl = Math.hypot(tx, ty, tz);
    if (tl < 1e-4 || slope < 0.004) {
      // Puddle: dump sediment, soak, die.
      vol.splat(vol.moist, px, py, pz, 0.5 * d[o + 6], 2);
      this.kill(s, true);
      return;
    }
    tx /= tl; ty /= tl; tz /= tl;
    const target = p.speedK * Math.sqrt(Math.max(slope, 0.02) * p.gravity * vox * 2);
    const tr = clamp(p.traction, 0.01, 1);
    let vx = d[o + 3] + (tx * target - d[o + 3]) * tr;
    let vy = d[o + 4] + (ty * target - d[o + 4]) * tr;
    let vz = d[o + 5] + (tz * target - d[o + 5]) * tr;
    const sp = Math.max(Math.hypot(vx, vy, vz), 0.2);
    const dt = Math.min(0.06, (vox * 0.6) / sp);
    const qx = px + vx * dt, qy = py + vy * dt, qz = pz + vz * dt;
    if (!vol.inside(qx, qy, qz)) { this.kill(s, true); return; }
    // Reproject to surface (2 iterations).
    let rx = qx, ry = qy, rz = qz;
    for (let it = 0; it < 2; it++) {
      const dd = vol.sample(rx, ry, rz);
      vol.gradient(rx, ry, rz, _n);
      rx -= _n[0] * dd; ry -= _n[1] * dd; rz -= _n[2] * dd;
    }
    const water = d[o + 6];
    const cap = p.capacityK * sp * Math.max(slope, 0.01) * water * (1 - 0.6 * hard) * vox;
    if (d[o + 7] < cap) {
      // INCISE: carve a channel capsule along the path segment.
      const want = Math.min(cap - d[o + 7], vox * vox * vox * 2);
      const rCh = clamp(p.chanR * Math.sqrt(water) * (1 - 0.4 * hard), vox * 0.35, vox * 1.6);
      const mx = (px + rx) / 2 - _n[0] * rCh * 0.25, my = (py + ry) / 2 - _n[1] * rCh * 0.25, mz = (pz + rz) / 2 - _n[2] * rCh * 0.25;
      const dug = vol.carveCapsule(px - _n[0] * rCh * 0.25, py - _n[1] * rCh * 0.25, pz - _n[2] * rCh * 0.25,
        mx, my, mz, rCh, 0.1);
      void want;
      d[o + 7] += dug * p.pickup;
    } else {
      // DEPOSIT: drop a fraction as an alluvial blob.
      const f = clamp(p.depK * dt * (d[o + 7] / Math.max(cap, 1e-3) - 1), 0, 0.6);
      const dv = d[o + 7] * f;
      if (dv > 1e-4) {
        const rr = Math.cbrt(Math.max(dv, 0.02)) * 1.1;
        vol.depositBlob(rx + _n[0] * rr * 0.2, ry + _n[1] * rr * 0.2, rz + _n[2] * rr * 0.2,
          clamp(rr, 1, 9), clamp(rr * 0.42, 0.4, 3.5), 0.3);
        d[o + 7] -= dv;
      }
    }
    d[o] = rx; d[o + 1] = ry; d[o + 2] = rz;
    d[o + 3] = vx; d[o + 4] = vy; d[o + 5] = vz;
    // Water loss + field feedback.
    const loss = (p.evap * water + p.infil * (1 - hard)) * dt * 8;
    d[o + 6] = water - loss;
    vol.splat(vol.flow, rx, ry, rz, water * sp * dt * 0.15, 1);
    vol.splat(vol.moist, rx, ry, rz, p.infil * (1 - hard) * dt * 4, 1);
    if (d[o + 6] < 0.05 || d[o + 8] > p.flowMax * 3 || sp < 0.25) this.kill(s, true);
  }
}

// ---------------- Wind ----------------
export const WindDefaults = {
  dirX: 1, dirZ: 0.35, speed: 14, gust: 0.6, gustFreq: 0.004,
  drag: 1.6, settle: 0.35, abrasion: 0.5, grainSize: 1.2,
  entrain: 0.4, duneRate: 1.0, maxParticles: 2500, targetDrops: 40000,
  seed: 777, active: true,
};

export class WindSim {
  constructor(vol, params = {}) {
    this.vol = vol;
    this.p = { ...WindDefaults, ...params };
    this.pool = new ParticlePool(this.p.maxParticles);
    this.rng = mulberry32(this.p.seed);
    this.spawned = 0; this.retired = 0; this.time = 0;
    this.c0 = vol.carvedVol; this.d0 = vol.depositedVol;
    this.seaLevel = 0;
  }
  setParams(p) { Object.assign(this.p, p); }
  reset() {
    this.pool.reset(); this.rng = mulberry32(this.p.seed);
    this.spawned = 0; this.retired = 0; this.time = 0; this._rr = 0;
    this.c0 = this.vol.carvedVol; this.d0 = this.vol.depositedVol;
  }
  get carved() { return this.vol.carvedVol - this.c0; }
  get deposited() { return this.vol.depositedVol - this.d0; }
  get done() { return this.retired >= this.p.targetDrops; }

  windAt(x, y, z, out) {
    const p = this.p;
    const g = 1 + p.gust * vnoise(x * p.gustFreq + this.time * 0.05, y * p.gustFreq, z * p.gustFreq, 4242);
    const l = Math.hypot(p.dirX, p.dirZ) || 1;
    const exposure = 0.55 + 0.45 * this.vol.sampleField(this.vol.moist, x, y, z) * 0 + 0.45; // base 1.0; exposure via AO approx below
    void exposure;
    out[0] = (p.dirX / l) * p.speed * g;
    out[1] = 0.6 * Math.sin(x * 0.002 + this.time * 0.3) * p.speed * 0.1;
    out[2] = (p.dirZ / l) * p.speed * g;
    return out;
  }

  trySpawn() {
    const vol = this.vol, p = this.p, rng = this.rng;
    if (this.spawned >= p.targetDrops) return false;
    const s = this.pool.alloc();
    if (s < 0) return false;
    // Spawn upwind-biased random positions above terrain.
    const fx = rng(), fz = rng();
    const x = vol.minX + fx * vol.sizeX, z = vol.minZ + fz * vol.sizeZ;
    const i = Math.round(fx * (vol.nx - 1)), k = Math.round(fz * (vol.nz - 1));
    const sy = columnSurfaceY(vol, i, k);
    if (sy === null) return false;
    const d = this.pool.data, o = s * 12;
    const w = this.windAt(x, sy + 20, z, [0, 0, 0]);
    d[o] = x; d[o + 1] = sy + 4 + rng() * 30; d[o + 2] = z;
    d[o + 3] = w[0]; d[o + 4] = 0; d[o + 5] = w[2];
    d[o + 6] = 1; d[o + 7] = 0; d[o + 8] = 0; d[o + 9] = 1;
    d[o + 10] = p.grainSize; d[o + 11] = rng() * 100;
    this.spawned++;
    return true;
  }

  kill(s) {
    if (this.pool.data[s * 12 + 9] === 0) return;
    this.pool.data[s * 12 + 9] = 0;
    this.pool.alive--;
    this.retired++;
  }

  advance(maxSteps) {
    const p = this.p;
    this.time += 0.016;
    if (p.active && !this.done) {
      let guard = 1200;
      const wantAlive = Math.min(p.maxParticles, 300 + this.pool.max * 0.5);
      while (this.pool.alive < wantAlive && guard-- > 0) this.trySpawn();
    }
    const d = this.pool.data, vol = this.vol, vox = vol.voxel;
    const w = [0, 0, 0];
    let steps = 0;
    const wl = Math.hypot(p.dirX, p.dirZ) || 1;
    const wdx = p.dirX / wl, wdz = p.dirZ / wl;
    const max = this.pool.max;
    let cursor = this._rr || 0, deadRun = 0;
    while (steps < maxSteps && deadRun < max) {
      const s = cursor;
      cursor = (cursor + 1) % max;
      const o = s * 12;
      if (d[o + 9] === 0) { deadRun++; continue; }
      deadRun = 0;
      steps++;
      d[o + 8]++;
      let px = d[o], py = d[o + 1], pz = d[o + 2];
      this.windAt(px, py, pz, w);
      const dt = 0.05;
      d[o + 3] += ((w[0] - d[o + 3]) * p.drag) * dt;
      d[o + 4] += ((w[1] - d[o + 4]) * p.drag - 9.8 * p.settle) * dt;
      d[o + 5] += ((w[2] - d[o + 5]) * p.drag) * dt;
      px += d[o + 3] * dt; py += d[o + 4] * dt; pz += d[o + 5] * dt;
      if (!vol.inside(px, py, pz) || d[o + 8] > 600) {
        // Drop load as dust where it dies inside.
        if (vol.inside(px, py, pz) && d[o + 7] > 0.05) {
          vol.splat(vol.sed, px, py, pz, d[o + 7] * 0.05, 1);
        }
        this.kill(s); continue;
      }
      const dist = vol.sample(px, py, pz);
      const sp = Math.hypot(d[o + 3], d[o + 4], d[o + 5]);
      if (dist <= vox * 0.2) {
        // Impact: abrade windward, entrain or bounce.
        vol.gradient(px, py, pz, _n);
        const hard = vol.hardnessAt(px, py, pz);
        const facing = clamp(-(_n[0] * wdx + _n[2] * wdz), 0, 1);
        const abr = p.abrasion * Math.pow(facing, 1.5) * (1 - hard * 0.8) * sp * 0.02;
        if (abr > 0.02 && sp > 3) {
          const r = clamp(abr * vox * 0.8 + 0.6, 0.5, vox * 1.4);
          const dug = vol.carveSphere(px - _n[0] * r * 0.4, py - _n[1] * r * 0.4, pz - _n[2] * r * 0.4, r, r * 0.3, 0.05);
          d[o + 7] += dug * 0.5;
        }
        // Entrain loose sediment on fast flat dry hits.
        const sedHere = vol.sampleField(vol.sed, px, py, pz);
        if (sp > 8 && sedHere > 0.05 && _n[1] > 0.86) {
          d[o + 7] += Math.min(sedHere, p.entrain) * 0.5;
          vol.splat(vol.sed, px, py, pz, -p.entrain * 0.3, 1);
        }
        // Bounce.
        const vn = d[o + 3] * _n[0] + d[o + 4] * _n[1] + d[o + 5] * _n[2];
        if (vn < 0) {
          d[o + 3] -= 1.5 * vn * _n[0]; d[o + 4] -= 1.5 * vn * _n[1]; d[o + 5] -= 1.5 * vn * _n[2];
          d[o + 3] *= 0.55; d[o + 4] *= 0.45; d[o + 5] *= 0.55;
        }
        px += _n[0] * vox * 0.4; py += _n[1] * vox * 0.4; pz += _n[2] * vox * 0.4;
      } else if (dist < vox * 3) {
        // Near-surface slow zone: dune deposition in lee / moist traps.
        vol.gradient(px, py, pz, _n);
        const lee = clamp((_n[0] * wdx + _n[2] * wdz), 0, 1); // normal along wind = lee
        const moist = vol.sampleField(vol.moist, px, py, pz);
        if (d[o + 7] > 0.03 && (sp < 6 || lee > 0.4 || moist > 0.5)) {
          const dv = Math.min(d[o + 7], p.duneRate * 0.4);
          const rr = Math.cbrt(Math.max(dv, 0.03)) * 1.2;
          vol.depositBlob(px, py - vox * 0.5, pz, clamp(rr, 1, 7), clamp(rr * 0.35, 0.4, 2.5), 0.35);
          d[o + 7] -= dv;
        }
      }
      d[o] = px; d[o + 1] = py; d[o + 2] = pz;
    }
    this._rr = cursor;
    this.pool.compactPositions();
    return steps;
  }
}

// ---------------- Thermal (talus slump) ----------------
export const ThermalDefaults = {
  talusDeg: 34, rate: 1.0, itersPerTick: 1200, rockfall: 0.35, slumpK: 1.1, seed: 9001, active: true,
  targetOps: 60000,
};

export class ThermalSim {
  constructor(vol, params = {}) {
    this.vol = vol;
    this.p = { ...ThermalDefaults, ...params };
    this.rng = mulberry32(this.p.seed);
    this.slumps = 0; this.iters = 0;
    this.c0 = vol.carvedVol; this.d0 = vol.depositedVol;
  }
  setParams(p) { Object.assign(this.p, p); }
  reset() {
    this.rng = mulberry32(this.p.seed); this.slumps = 0; this.iters = 0;
    this.c0 = this.vol.carvedVol; this.d0 = this.vol.depositedVol;
  }
  get carved() { return this.vol.carvedVol - this.c0; }
  get deposited() { return this.vol.depositedVol - this.d0; }
  get done() { return this.iters >= (this.p.targetOps || Infinity); }

  advance(n) {
    const vol = this.vol, p = this.p, rng = this.rng, vox = vol.voxel;
    const tanCrit = Math.tan((p.talusDeg * Math.PI) / 180);
    let did = 0;
    for (let it = 0; it < n; it++) {
      this.iters++;
      const i = 2 + Math.floor(rng() * (vol.nx - 4));
      const k = 2 + Math.floor(rng() * (vol.nz - 4));
      const sy = columnSurfaceY(vol, i, k);
      if (sy === null) continue;
      const x = vol.minX + (i / (vol.nx - 1)) * vol.sizeX;
      const z = vol.minZ + (k / (vol.nz - 1)) * vol.sizeZ;
      vol.gradient(x, sy + vox * 0.3, z, _n);
      // slope as rise/run from normal: tan = |horizontal| / n.y
      const ny = Math.max(_n[1], 0.05);
      const slope = Math.hypot(_n[0], _n[2]) / ny;
      const hard = vol.hardnessAt(x, sy, z);
      const crit = tanCrit * (0.55 + 0.45 * hard);
      const excess = slope - crit;
      // Rockfall on cliffs.
      const cliff = slope > 1.6 && rng() < p.rockfall * 0.02;
      if (excess <= 0 && !cliff) continue;
      let tx = _n[0] * _n[1], ty = -1 + _n[1] * _n[1], tz = _n[2] * _n[1];
      const tl = Math.hypot(tx, ty, tz) || 1;
      tx /= tl; ty /= tl; tz /= tl;
      const mag = cliff ? 2.5 + rng() * 2 : (0.35 + excess * 2.2) * p.rate * p.slumpK;
      const r = clamp(mag * vox * 0.8, vox * 0.7, vox * (cliff ? 3.2 : 2.2));
      vol.carveSphere(x - _n[0] * r * 0.3, sy - _n[1] * r * 0.3, z - _n[2] * r * 0.3, r, r * 0.3, 0.08);
      const run = vox * (cliff ? 4 + rng() * 4 : 1.5 + excess * 6);
      const dx = x + tx * run, dy = sy + ty * run, dz = z + tz * run;
      if (vol.inside(dx, dy, dz)) {
        vol.depositBlob(dx, dy + r * 0.2, dz, r * 1.15, r * 0.5, 0.4);
      }
      this.slumps++;
      did++;
    }
    return did;
  }
}

// ---------------- Chemical (dissolution + precipitation) ----------------
export const ChemicalDefaults = {
  solubility: 0.6, rate: 1.0, itersPerTick: 900, pitR: 3.2, pitFreq: 0.05,
  cavityBoost: 2.0, precip: 0.25, seed: 5150, active: true,
  targetOps: 40000,
};

export class ChemicalSim {
  constructor(vol, params = {}) {
    this.vol = vol;
    this.p = { ...ChemicalDefaults, ...params };
    this.rng = mulberry32(this.p.seed);
    this.pits = 0; this.crusts = 0; this.iters = 0;
    this.c0 = vol.carvedVol; this.d0 = vol.depositedVol;
    this._curv = {};
  }
  setParams(p) { Object.assign(this.p, p); }
  reset() {
    this.rng = mulberry32(this.p.seed); this.pits = 0; this.crusts = 0; this.iters = 0;
    this.c0 = this.vol.carvedVol; this.d0 = this.vol.depositedVol;
  }
  get carved() { return this.vol.carvedVol - this.c0; }
  get deposited() { return this.vol.depositedVol - this.d0; }
  get done() { return this.iters >= (this.p.targetOps || Infinity); }

  advance(n) {
    const vol = this.vol, p = this.p, rng = this.rng, vox = vol.voxel;
    let did = 0;
    for (let it = 0; it < n; it++) {
      this.iters++;
      const i = 2 + Math.floor(rng() * (vol.nx - 4));
      const k = 2 + Math.floor(rng() * (vol.nz - 4));
      const sy = columnSurfaceY(vol, i, k);
      if (sy === null) continue;
      const x = vol.minX + (i / (vol.nx - 1)) * vol.sizeX;
      const z = vol.minZ + (k / (vol.nz - 1)) * vol.sizeZ;
      const y = sy + vox * 0.2;
      const moist = vol.sampleField(vol.moist, x, y, z);
      if (rng() > 0.25 + 0.75 * moist) continue;
      const hard = vol.hardnessAt(x, y, z);
      const sol = p.solubility * (1 - hard * 0.8);
      vol.curvature(x, y, z, this._curv);
      const cav = clamp(-this._curv.H * vox * 4, 0, 2);
      // Pitting modulation: dissolve in pits, not uniform shrink.
      const pn = vnoise(x * p.pitFreq, y * p.pitFreq, z * p.pitFreq, 777);
      const E = p.rate * sol * (0.3 + 0.7 * moist) * (1 + p.cavityBoost * cav);
      if (E > 0.12 && pn > -0.35) {
        const r = p.pitR * (0.5 + rng() * 0.8) * (0.6 + E);
        vol.gradient(x, y, z, _n);
        vol.carveSphere(x - _n[0] * r * 0.5, y - _n[1] * r * 0.5, z - _n[2] * r * 0.5,
          clamp(r, 0.8, vox * 2), 0, 0.06);
        this.pits++; did++;
      } else if (rng() < p.precip * 0.02) {
        // Travertine/calcrete crust where flow stalls.
        const flow = vol.sampleField(vol.flow, x, y, z);
        if (flow > 0.2) {
          vol.gradient(x, y, z, _n);
          vol.depositBlob(x + _n[0] * vox * 0.4, y + _n[1] * vox * 0.4, z + _n[2] * vox * 0.4,
            vox * 1.1, vox * 0.4, 0.2);
          this.crusts++; did++;
        }
      }
    }
    return did;
  }
}

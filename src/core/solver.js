// Frontier — hybrid erosion solver (CPU reference implementation).
//
// This is the 1:1 CPU mirror of the GPU solver in src/gl/erosion-shaders.js.
// It exists for three reasons:
//   1. headless verification of the physics (test/headless.mjs),
//   2. a CPU fallback for machines without WebGL2 float render targets,
//   3. a porting reference for the user's C++ engine.
//
// The solver merges the two ancestor projects:
//   • particle agents (rain/runoff/river/wind/rock/chem) with sediment cargo —
//     the realistic motion of the particle branch;
//   • CSG-stamp sculpting + strata hardness — the authoring power of the
//     algorithmic branch;
// and fixes both ancestors' failure modes:
//   • runaway holes  → strict sediment budget + armor feedback + stall deposition
//   • blurry surfaces → compact surface-shell kernels + grain modulation + redistancing
//
// Load (sediment carried by a particle) is measured in voxel volumes (vox).

import {
  CAP_MAX, DEMAND_MAX_FRAC, ARMOR_GAIN, ARMOR_RELAX,
  THIN_GUARD, STALL_SPEED, STALL_DEPOSIT, carveRadius, BAND, MAX_SEGMENTS,
} from "./constants.js";
import { mulberry32 } from "./noise.js";
import { lipschitzClamp } from "./sculpt.js";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const mix = (a, b, t) => a + (b - a) * t;

export class Solver {
  constructor(vol, params) {
    this.vol = vol;
    this.params = { ...params };
    this.tick = 0;
    this.rng = mulberry32((params.seed | 0) * 7349 + 13);
    this.legacy = !!params.legacy; // reproduce the ancestor bugs for A/B tests

    const N = Math.min(2048, Math.max(64, params.particleCount | 0));
    this.N = N;
    const F = () => new Float32Array(N);
    this.pos = F();
    for (let i = 3; i < this.pos.length; i += 4) this.pos[i] = -1; // w=age<0 → dead
    this.prev = F();     // position at the previous tick (GPU parity / cargo)
    this.lastCarve = F(); // persistent carve anchor: xyz = last swept contact, w = valid
    this.vel = F(); this.meta = F(); this.cargo = F();
    this.species = F(); // per-particle coarse fraction (scalar for CPU)
    this.ledger = { eroded: 0, deposited: 0, carried: 0, retired: 0 };
    this.stats = { contacts: 0, sweeps: 0, dabs: 0 }; // swept-carving telemetry

    // per-tick request grids (voxel units)
    const n = vol.dims[0] * vol.dims[1] * vol.dims[2];
    this.reqErode = new Float32Array(n);
    this.reqDeposit = new Float32Array(n);
  }

  param(k, dflt) { const v = this.params[k]; return v === undefined ? dflt : v; }

  // ---------------------------------------------------------------- spawning
  spawnParticle(i) {
    const p = this.params, v = this.vol, rand = this.rng;
    const kind = this.param("sourceMode", 0);
    const [mnx, mny, mnz] = v.min, [mxx, , mxz] = v.max;
    let x, y, z, vx = 0, vy = 0, vz = 0;

    if (kind === 2) { // river: upstream on the canyon centerline
      z = mnz + 0.6;
      x = canyonCenterAt(z, p) + (rand() - 0.5) * this.param("riverWidth", 3.5) * 1.4;
      y = this.param("waterLevel", 0.7) - this.param("riverDepth", 0.6) * rand();
      const c = riverCurrentAt(x, y, z, p);
      vx = c[0]; vy = c[1]; vz = c[2];
    } else if (kind === 3) { // wind: upwind boundary
      const dir = (this.param("windDirection", 0) * Math.PI) / 180;
      const dx = Math.cos(dir), dz = Math.sin(dir);
      const side = -dz, ext = Math.min(
        (mxx - 0.8 - mnz * 0) / Math.max(Math.abs(dx), 1e-4),
        (mxz - 0.8) / Math.max(Math.abs(dz), 1e-4)
      );
      x = mxx - ext * dx - side * (rand() - 0.5) * 24;
      z = mxz - ext * dz + dx * (rand() - 0.5) * 24;
      y = clamp(this.param("windHeight", 7) + (rand() - 0.5) * this.param("windSpread", 2), mny + 1, 20);
      vx = dx * this.param("windSpeed", 6.5); vz = dz * this.param("windSpeed", 6.5); vy = 0;
    } else if (kind === 4) { // rockfall: spawn above a steep face
      x = mix(mnx + 2, mxx - 2, rand()); z = mix(mnz + 2, mxz - 2, rand());
      y = 20;
      for (let j = 0; j < 60; j++) {
        const d = v.sampleSDF(x, y, z);
        if (d < 0.1 || y < -1.5) break;
        y -= clamp(d * 0.6, 0.05, 1.2);
      }
      vy = -5.5;
    } else { // rain / runoff / chem: sky
      x = mix(mnx + 1, mxx - 1, rand()); z = mix(mnz + 1, mxz - 1, rand());
      y = 21;
      for (let j = 0; j < 90; j++) {
        const d = v.sampleSDF(x, y, z);
        if (d < 0.1 || y < -1.5) break;
        y -= clamp(d * 0.6, 0.04, 1.0);
      }
      vy = kind === 4 ? -5.5 : -2.8;
      vx = this.param("wind", 0.25) * 0.7 * (rand() - 0.2);
    }
    // lift out of the surface
    const n = [0, 0, 0];
    v.normal(x, y, z, n);
    const d0 = v.sampleSDF(x, y, z);
    if (d0 < 0.15) { x += n[0] * (0.15 - d0); y += n[1] * (0.15 - d0); z += n[2] * (0.15 - d0); }

    this.pos[i * 4] = x; this.pos[i * 4 + 1] = y; this.pos[i * 4 + 2] = z; this.pos[i * 4 + 3] = 0;
    this.prev[i * 4] = x; this.prev[i * 4 + 1] = y; this.prev[i * 4 + 2] = z; this.prev[i * 4 + 3] = -1;
    this.lastCarve[i * 4] = x; this.lastCarve[i * 4 + 1] = y; this.lastCarve[i * 4 + 2] = z; this.lastCarve[i * 4 + 3] = 0; // no sweep anchor yet
    this.vel[i * 4] = vx; this.vel[i * 4 + 1] = vy; this.vel[i * 4 + 2] = vz; this.vel[i * 4 + 3] = 1;
    this.meta[i * 4] = kind;
    this.meta[i * 4 + 1] = this.param("footprint", 1.2);
    this.meta[i * 4 + 2] = this.param("grainSize", 0.25) * 1000 + this.rng() * 4; // grain mass proxy
    this.meta[i * 4 + 3] = this.param("restitution", 0.08);
    this.cargo[i * 4] = 0; this.cargo[i * 4 + 1] = 0; this.cargo[i * 4 + 2] = 0; this.cargo[i * 4 + 3] = 0;
    this.species[i] = kind === 4 ? 0.8 : 0.35;
  }

  // ------------------------------------------------------------------ motion
  motion(dt) {
    const v = this.vol, p = this.params;
    const windDir = (this.param("windDirection", 0) * Math.PI) / 180;
    const wx = Math.cos(windDir), wz = Math.sin(windDir);
    const wSpeed = this.param("windSpeed", 6.5);
    const collisionR = clamp(0.38 + 0.15 * this.param("footprint", 1.2), 0.38, 0.7);
    const n = [0, 0, 0], q = [0, 0, 0];

    for (let i = 0; i < this.N; i++) {
      const age = this.pos[i * 4 + 3];
      if (age < 0) {
        if (this.rng() < this.param("rainfall", 0.65) * 0.35) this.spawnParticle(i);
        continue;
      }
      this.prev[i * 4] = this.pos[i * 4];
      this.prev[i * 4 + 1] = this.pos[i * 4 + 1];
      this.prev[i * 4 + 2] = this.pos[i * 4 + 2];
      this.prev[i * 4 + 3] = age;
      const kind = this.meta[i * 4];
      const life = kind === 2 ? 35 : kind === 4 ? 50 : 25;
      const water = this.vel[i * 4 + 3];
      let x = this.pos[i * 4], y = this.pos[i * 4 + 1], z = this.pos[i * 4 + 2];
      let vx = this.vel[i * 4], vy = this.vel[i * 4 + 1], vz = this.vel[i * 4 + 2];

      // physics substeps (2 for stability at dt=40ms)
      const h = dt * 0.5;
      for (let s = 0; s < 2; s++) {
        if (kind === 3) { // wind grain: drag toward wind + gravity settling
          const settling = clamp(this.meta[i * 4 + 2] * this.meta[i * 4 + 2] * 0.1, 0.015, 1.2);
          vx = mix(vx, wx * wSpeed, 1 - Math.exp(-h * 2.6));
          vz = mix(vz, wz * wSpeed, 1 - Math.exp(-h * 2.6));
          vy = mix(vy, (this.param("windHeight", 7) - y) * 0.45 - settling, 1 - Math.exp(-h * 2.6));
        } else {
          const wet = this.param("waterEnabled", true) && y < this.param("waterLevel", 0.7);
          const coarse = this.species[i];
          const grav = wet ? mix(0.1, 0.8, coarse) : 1;
          vy += -9.81 * grav * h;
          vx += this.param("wind", 0.25) * 0.35 * h;
          const drag = wet ? 0.42 : 0.12;
          const e = Math.exp(-h * drag);
          vx *= e; vy *= e; vz *= e;
          if (kind === 2 || (wet && this.param("riverEnabled", true))) {
            const c = riverCurrentAt(x, y, z, p);
            const rDrag = (kind === 4 ? 1.6 : 3.2) * (1 - coarse * 0.6);
            const m = 1 - Math.exp(-h * rDrag);
            vx = mix(vx, c[0], m); vy = mix(vy, c[1], m); vz = mix(vz, c[2], m);
          }
        }
        const sp = Math.hypot(vx, vy, vz);
        if (sp > 12) { const f = 12 / sp; vx *= f; vy *= f; vz *= f; }

        // integrate + SDF collision
        q[0] = x + vx * h; q[1] = y + vy * h; q[2] = z + vz * h;
        const d = v.sampleSDF3(q);
        if (d < collisionR) {
          v.normal(q[0], q[1], q[2], n);
          const push = collisionR - d;
          q[0] += n[0] * push; q[1] += n[1] * push; q[2] += n[2] * push;
          const inward = Math.min(vx * n[0] + vy * n[1] + vz * n[2], 0);
          const rest = this.meta[i * 4 + 3];
          vx -= (1 + rest) * inward * n[0];
          vy -= (1 + rest) * inward * n[1];
          vz -= (1 + rest) * inward * n[2];
          const de = Math.exp(-h * (kind === 4 ? 0.9 : 0.45));
          vx *= de; vy *= de; vz *= de;
        }
        x = q[0]; y = q[1]; z = q[2];
      }

      const evap = kind === 2 || kind === 3 ? 0.003 : 0.028;
      this.vel[i * 4] = vx; this.vel[i * 4 + 1] = vy; this.vel[i * 4 + 2] = vz;
      this.vel[i * 4 + 3] = water * Math.exp(-dt * evap);
      this.pos[i * 4] = x; this.pos[i * 4 + 1] = y; this.pos[i * 4 + 2] = z;
      this.pos[i * 4 + 3] = age + dt;

      // expiry
      const load = this.cargo[i * 4];
      const pending = this.cargo[i * 4 + 1];
      const out =
        age + dt > life || this.vel[i * 4 + 3] < 0.008 || load > 12 ||
        x < v.min[0] + 0.25 || x > v.max[0] - 0.25 ||
        z < v.min[2] + 0.25 || z > v.max[2] - 0.25 || y < v.min[1] + 0.25;
      if (out) {
        this.pos[i * 4 + 3] = -1;
        this.lastCarve[i * 4 + 3] = 0; // invalidate the carve anchor
        this.ledger.retired += (load + pending) * this.vol.voxelVolume;
        this.cargo[i * 4] = 0; this.cargo[i * 4 + 1] = 0;
      }
    }
  }

  // ------------------------------------------- events (demand computation)
  // Demand is expressed as a *retreat depth* (meters of surface recession)
  // times the kernel cross-section — resolution independent. The universal
  // budget then caps it by the particle's free transport capacity.
  events(dt) {
    const v = this.vol, p = this.params;
    const r = carveRadius(this.param("footprint", 1.2));
    const dtScale = 3.0;
    const erosionRate = this.param("erosion", 0.62);
    const hardnessCtl = this.param("hardness", 0.45);
    const strata = this.param("strata", 0.65);
    const capCtl = this.param("capacity", 0.65);
    const depositionRate = this.param("deposition", 0.35);
    const stability = this.param("stability", 0.5);
    const armorFloor = mix(0.22, 0.03, stability);
    const windDir = (this.param("windDirection", 0) * Math.PI) / 180;
    const wSpeed = this.param("windSpeed", 6.5);
    const n = [0, 0, 0], mat = [0, 0, 0, 0];
    const area = Math.PI * r * r;                       // kernel cross-section [m²]
    const vox = this.vol.voxelVolume;

    for (let i = 0; i < this.N; i++) {
      if (this.pos[i * 4 + 3] < 0) continue;
      const kind = this.meta[i * 4];
      const x = this.pos[i * 4], y = this.pos[i * 4 + 1], z = this.pos[i * 4 + 2];
      const d = v.sampleSDF(x, y, z);
      if (d > 1.2 || d < -0.8) continue; // far from the surface → no exchange

      v.normal(x, y, z, n);
      const c = [x - n[0] * d, y - n[1] * d, z - n[2] * d]; // closest surface point
      const speed = Math.hypot(this.vel[i * 4], this.vel[i * 4 + 1], this.vel[i * 4 + 2]);
      const water = this.vel[i * 4 + 3];
      const load = this.cargo[i * 4];
      const slope = 1 - clamp(n[1], 0, 1);

      // local material
      const layer = 0.5 + 0.5 * Math.sin(c[1] * 3.5);
      const hard = clamp(hardnessCtl * 0.7 + strata * layer * 0.45, 0.05, 0.95);
      v.sampleMaterial(c[0], c[1], c[2], mat);
      const armor = mat[3];

      // --- per-kind drive φ (dimensionless) and capacity (bounded, vox) ---
      let cap = 0, phi = 0, depositVox = 0;
      if (kind === 3) { // wind abrasion
        const wdx = Math.cos(windDir), wdz = Math.sin(windDir);
        const exposure = Math.max(0, n[0] * -wdx + n[2] * -wdz) * (0.4 + slope * 1.1);
        cap = Math.min(0.3, (0.05 * wSpeed + 0.03 * speed) * (1 - 0.5 * hard));
        phi = 0.028 * wSpeed * exposure * dt * dtScale;
      } else if (kind === 4) { // rockfall impact
        const impact = Math.max(0, -(this.vel[i * 4] * n[0] + this.vel[i * 4 + 1] * n[1] + this.vel[i * 4 + 2] * n[2]));
        const energy = 0.5 * 2650 * 0.02 * impact * impact;
        cap = Math.min(0.8, 0.05 * Math.pow(energy, 0.45) * (1 - 0.6 * hard));
        phi = 0.14 * Math.pow(Math.max(energy, 1e-6), 0.45) * dt * dtScale;
      } else if (kind === 5) { // chemical dissolution
        cap = 0.5 * (1 - 0.4 * hard);
        phi = capCtl * this.param("solubility", 0.6) * Math.max(0, 1 - load / Math.max(cap, 1e-4)) * water * 0.25 * dt * dtScale / (0.3 + hard);
      } else { // hydraulic (rain / runoff / river)
        const satV = clamp(speed / 2.2, 0, 1);
        cap = Math.min(CAP_MAX, capCtl * 1.35 * water * (0.22 + 0.78 * satV) * (0.35 + slope) * (1 - 0.45 * hard));
        const stress = Math.sqrt(speed / Math.max(0.18, this.meta[i * 4 + 1] * 0.5));
        const critical = 0.06 + hard * 0.75 + strata * layer * 0.28;
        phi = erosionRate * Math.max(0, stress - critical * 0.6) * dt * dtScale * (0.6 + water) * (0.6 + slope);
        if (!this.legacy) {
          // gully feedback: flow incises faster where the ground is already wet
          // (moisture left by earlier flow) → drainage self-organizes into
          // dendritic channel networks instead of uniform sheet erosion
          const wetPath = v.sampleWet(c[0], c[1], c[2]);
          phi *= 1 + this.param("gully", 1.2) * wetPath;
        }
      }

      // convert drive → retreat depth [m] → demand in voxels
      let demandVox = phi * 0.005 * area / vox;
      if (this.legacy) {
        // ancestor-A reproduction: unconditional minimum demand + no budget
        demandVox = Math.max(demandVox, 0.012 / vox);
      } else {
        // --- anti-runaway controller ---
        demandVox *= mix(1.0, armorFloor, armor); // integral feedback: worn rock armors
        // thin-wall guard: don't puncture fins / arches
        const probe = 2.2 * r;
        const dDeep = v.sampleSDF(c[0] - n[0] * probe, c[1] - n[1] * probe, c[2] - n[2] * probe);
        const thin = clamp(-dDeep / probe, 0, 1);
        demandVox *= mix(THIN_GUARD, 1.0, thin);
      }

      // --- deposition (pits self-fill) ---
      const concave = this.concavity(c, n, r);
      const excess = Math.max(0, load - cap);
      depositVox = depositionRate * excess * dt * dtScale * (0.6 + 1.6 * concave);
      if (speed < STALL_SPEED && kind !== 3) depositVox += load * STALL_DEPOSIT * dt * 6;
      if (this.legacy) depositVox = 0; // ancestor-A never filled pits back

      // universal budget (the fix): never exceed free capacity. Ancestor-A had none.
      if (!this.legacy) demandVox = Math.min(demandVox, Math.max(0, cap - load));
      if (demandVox <= 0 && depositVox <= 0) continue;
      this.stats.contacts++;

      // --- swept contact (capsule carving) -----------------------------------
      // Carving follows the particle's whole path: the demand is spread over
      // capsule sub-centers from the *persistent carve anchor* to the current
      // contact whenever the particle has moved past the dab spacing. Any
      // speed therefore paints an evenly-spaced, continuous channel.
      let from = null;
      if (this.param("channel", 1) && !this.legacy && kind !== 4 && this.lastCarve[i * 4 + 3] > 0.5) {
        const lx = this.lastCarve[i * 4], ly = this.lastCarve[i * 4 + 1], lz = this.lastCarve[i * 4 + 2];
        const segLen = Math.hypot(lx - c[0], ly - c[1], lz - c[2]);
        if (segLen > 0.05 && segLen < 5.5) from = [lx, ly, lz]; // dead-band + teleport guards
      }
      if (from) {
        const segLen = Math.hypot(from[0] - c[0], from[1] - c[1], from[2] - c[2]);
        const K = Math.min(MAX_SEGMENTS, Math.max(1, Math.ceil(segLen / (0.6 * r))));
        this.stats.sweeps++; this.stats.dabs += K;
        for (let k = 1; k <= K; k++) {
          const t = k / K;
          const cc = [
            from[0] + (c[0] - from[0]) * t,
            from[1] + (c[1] - from[1]) * t,
            from[2] + (c[2] - from[2]) * t,
          ];
          this.applyRequest(cc, n, r, i, demandVox / K, depositVox / K);
        }
      } else {
        this.applyRequest(c, n, r, i, demandVox, depositVox);
      }
      this.lastCarve[i * 4] = c[0]; this.lastCarve[i * 4 + 1] = c[1];
      this.lastCarve[i * 4 + 2] = c[2]; this.lastCarve[i * 4 + 3] = 1;
    }
  }

  // Mean curvature sign helper: >0 → surface concave (pit), <0 → convex (ridge)
  concavity(c, n, r) {
    const v = this.vol, e = r * 0.8;
    const o = [[e, 0, 0], [-e, 0, 0], [0, e, 0], [0, -e, 0], [0, 0, e], [0, 0, -e]];
    let sum = 0;
    for (const oo of o) sum += v.sampleSDF(c[0] + oo[0], c[1] + oo[1], c[2] + oo[2]);
    const lap = (sum - 6 * v.sampleSDF3(c)) / (e * e);
    return clamp(-lap / 6, 0, 1); // lap<0 → concave pit → concavity 0..1
  }

  // Distribute demand over the surface-shell kernel with grain modulation,
  // accumulate into request grids (voxel-volume units).
  applyRequest(c, n, r, pid, erode, deposit) {
    const v = this.vol;
    const [nx, ny, nz] = v.dims;
    const gx = (c[0] - v.min[0]) / v.cell[0] - 0.5;
    const gy = (c[1] - v.min[1]) / v.cell[1] - 0.5;
    const gz = (c[2] - v.min[2]) / v.cell[2] - 0.5;
    const rad = r / Math.min(...v.cell);
    const i0 = [Math.max(0, Math.floor(gx - rad)), Math.max(0, Math.floor(gy - rad)), Math.max(0, Math.floor(gz - rad))];
    const i1 = [Math.min(nx - 1, Math.ceil(gx + rad)), Math.min(ny - 1, Math.ceil(gy + rad)), Math.min(nz - 1, Math.ceil(gz + rad))];
    const bandW = BAND * 2.0;

    // pass 1: kernel weights over the surface shell (band) voxels only
    let sumSolid = 0, sumAir = 0;
    const idxs = [], wSolid = [], wAir = [];
    for (let z = i0[2]; z <= i1[2]; z++) for (let y = i0[1]; y <= i1[1]; y++) for (let x = i0[0]; x <= i1[0]; x++) {
      v.worldAt(x, y, z, tmp3);
      // squash the kernel along the surface normal -> flat gouges, not round
      // bowls: tangent extent stays r, normal extent is compressed
      const qx = tmp3[0] - c[0], qy = tmp3[1] - c[1], qz = tmp3[2] - c[2];
      const qn = qx * n[0] + qy * n[1] + qz * n[2];
      const qt = Math.hypot(qx - n[0] * qn, qy - n[1] * qn, qz - n[2] * qn);
      const dist = Math.hypot(qt, qn * 1.8);
      if (dist > r) continue;
      // grain modulation: stochastic kernel roughness breaks the smooth-blob look
      const grain = 0.55 + 0.9 * hash3(x, y, z, pid + (this.tick & 1023) * 131);
      const k = Math.pow(Math.max(0, 1 - dist / r), 2) * grain;
      const idx4 = v.index(x, y, z);
      const solid = v.data[idx4 + 3];
      const band = 1 - Math.min(1, Math.max(0, (Math.abs(v.data[idx4]) - BAND) / bandW));
      if (band <= 0) continue;
      idxs.push(idx4); wSolid.push(k * band * solid); wAir.push(k * band * (1 - solid));
      sumSolid += k * band * solid; sumAir += k * band * (1 - solid);
    }
    if (idxs.length === 0 || (erode > 0 && sumSolid <= 1e-9 && deposit > 0 && sumAir <= 1e-9)) return;
    if (idxs.length === 0) return;

    // ancestor-A reproduced its fat per-event cap here: 0.55 × kernel solid
    if (this.legacy) erode = Math.min(erode, 0.55 * sumSolid);
    // pass 2: distribute the demand across the shell (total removed == demand)
    for (let j = 0; j < idxs.length; j++) {
      const vi = idxs[j] / 4;
      if (erode > 0 && sumSolid > 1e-9 && wSolid[j] > 0) this.reqErode[vi] += erode * (wSolid[j] / sumSolid);
      if (deposit > 0 && sumAir > 1e-9 && wAir[j] > 0) this.reqDeposit[vi] += deposit * (wAir[j] / sumAir);
    }
    this.cargo[pid * 4 + 1] += erode;   // pending pickup (validated by apply)
    this.cargo[pid * 4 + 2] += deposit; // pending drop (validated by apply)
  }

  // ----------------------------------------------------------------- apply
  // Materialize requests into the volume with hard per-event area caps.
  apply() {
    const v = this.vol;
    const [nx, ny, nz] = v.dims;
    const vol = v.voxelVolume;
    let acceptedErode = 0, acceptedDeposit = 0, requestedErode = 0, requestedDeposit = 0;
    for (let z = 0; z < nz; z++) for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
      const idx4 = v.index(x, y, z), idx = idx4 / 4;
      const re = this.reqErode[idx], rd = this.reqDeposit[idx];
      if (re <= 0 && rd <= 0) continue;
      const a = v.data[idx4 + 3];
      // hard area caps (anti-runaway #2): never gut more than DEMAND_MAX_FRAC of
      // what the voxel holds / can hold in one tick
      const eVol = Math.min(re, a * DEMAND_MAX_FRAC);
      const dVol = Math.min(rd, (1 - a) * DEMAND_MAX_FRAC * 3 + eVol);
      if (eVol > 0 || dVol > 0) {
        const na = clamp(a + (dVol - eVol), 0, 1);
        v.data[idx4 + 3] = na;
        if (na > 0.0001 && na < 0.9999) v.data[idx4] = BAND * (1 - 2 * na);
        else if (na >= 0.9999) v.data[idx4] = Math.min(v.data[idx4], -BAND);
        else v.data[idx4] = Math.max(v.data[idx4], BAND);
        // armor: integral of removal (anti-runaway #3)
        v.material[idx4 + 3] = clamp(v.material[idx4 + 3] + eVol * ARMOR_GAIN - ARMOR_RELAX, 0, 1);
        v.data[idx4 + 2] += dVol * vol; // loose sediment (m³)
        // moisture follows the *exchange*: cells where flow actually carves or
        // fills get wet, rarely-visited cells dry out → gully self-organization
        v.data[idx4 + 1] = Math.min(1, v.data[idx4 + 1] * 0.995 + 6 * eVol + 0.5 * dVol);
      }
      requestedErode += re; requestedDeposit += rd;
      acceptedErode += eVol; acceptedDeposit += dVol;
      this.reqErode[idx] = 0; this.reqDeposit[idx] = 0;
    }
    const V = vol;
    this.ledger.eroded += acceptedErode * V;
    this.ledger.deposited += acceptedDeposit * V;
    // particles pick up / drop the *accepted* amounts (exact conservation:
    // volume lost to per-voxel caps never enters anyone's cargo)
    const eRatio = requestedErode > 1e-9 ? acceptedErode / requestedErode : 0;
    const dRatio = requestedDeposit > 1e-9 ? acceptedDeposit / requestedDeposit : 0;
    for (let i = 0; i < this.N; i++) {
      const e = this.cargo[i * 4 + 1], d = this.cargo[i * 4 + 2];
      if (e > 0) { this.cargo[i * 4] += e * eRatio; this.cargo[i * 4 + 1] = 0; }
      if (d > 0) { this.cargo[i * 4] = Math.max(0, this.cargo[i * 4] - d * dRatio); this.cargo[i * 4 + 2] = 0; }
    }
  }

  // --------------------------------------------------------- redistancing
  // Keep the SDF metric valid after edits (anti-blur): band voxels are exact,
  // the rest is solved by 2 Eikonal sweeps.
  redistance(iterations = 2) {
    const v = this.vol, [nx, ny, nz] = v.dims;
    const d = v.data;
    const hmin = Math.min(v.cell[0], v.cell[1], v.cell[2]);
    for (let it = 0; it < iterations; it++) {
      // alternate sweep direction to avoid directional bias
      const fwd = it % 2 === 0;
      for (let zi = 0; zi < nz; zi++) {
        const z = fwd ? zi : nz - 1 - zi;
        for (let yi = 0; yi < ny; yi++) {
          const y = fwd ? yi : ny - 1 - yi;
          for (let xi = 0; xi < nx; xi++) {
            const x = fwd ? xi : nx - 1 - xi;
            const i = v.index(x, y, z);
            const a = d[i + 3];
            if (a > 0.0001 && a < 0.9999) { d[i] = BAND * (1 - 2 * a); continue; }
            const sign = a >= 0.5 ? -1 : 1;
            const xm = x > 0 ? Math.abs(d[v.index(x - 1, y, z)]) : 1e9;
            const xp = x < nx - 1 ? Math.abs(d[v.index(x + 1, y, z)]) : 1e9;
            const ym = y > 0 ? Math.abs(d[v.index(x, y - 1, z)]) : 1e9;
            const yp = y < ny - 1 ? Math.abs(d[v.index(x, y + 1, z)]) : 1e9;
            const zm = z > 0 ? Math.abs(d[v.index(x, y, z - 1)]) : 1e9;
            const zp = z < nz - 1 ? Math.abs(d[v.index(x, y, z + 1)]) : 1e9;
            let a1 = Math.min(xm, xp), a2 = Math.min(ym, yp), a3 = Math.min(zm, zp);
            if (a1 > a2) { const t = a1; a1 = a2; a2 = t; }
            if (a2 > a3) { const t = a2; a2 = t; a3 = t; }
            if (a1 > a2) { const t = a1; a1 = a2; a2 = t; }
            let t = a1 + hmin;
            if (t > a2) t = (a1 + a2 + Math.sqrt(Math.max(0, 2 * hmin * hmin - (a1 - a2) * (a1 - a2)))) * 0.5;
            if (t > a3) {
              const sum = a1 + a2 + a3;
              t = (sum + Math.sqrt(Math.max(0, sum * sum - 3 * (a1 * a1 + a2 * a2 + a3 * a3 - hmin * hmin)))) / 3;
            }
            const cand = sign * Math.max(BAND, t);
            if (it === 0 || Math.abs(cand) < Math.abs(d[i])) d[i] = cand;
          }
        }
      }
    }
    lipschitzClamp(v, 2);
  }

  // --------------------------------------------------------- thermal talus
  // Column-based talus slump: material moves DOWNHILL from column tops that
  // exceed the angle of repose onto the top of the lower neighbor column.
  // Mass-conserving, gravity-directed, hardness-scaled (hard strata hold
  // steeper cliffs → stratified steps). Replaces the ancestor's lateral
  // diffusion that eroded every cliff face and collapsed the canyon rims.
  thermal(rate) {
    if (rate <= 0) return;
    const v = this.vol, [nx, ny, nz] = v.dims;
    // snapshot column tops
    const topY = new Int16Array(nx * nz).fill(-1);
    for (let z = 0; z < nz; z++) for (let x = 0; x < nx; x++) {
      for (let y = ny - 1; y >= 0; y--) {
        if (v.data[v.index(x, y, z) + 3] >= 0.5) { topY[z * nx + x] = y; break; }
      }
    }
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    const repose = 1.45; // voxels — natural talus angle with slight rock cohesion
    for (let z = 0; z < nz; z++) for (let x = 0; x < nx; x++) {
      const ay = topY[z * nx + x];
      if (ay < 1) continue; // no solid, or at floor: never dig the bedrock base
      // only slump grounded columns — floating sheets and arch spans stay put
      let grounded = false;
      for (let g = Math.max(0, ay - 4); g < ay; g++) if (v.data[v.index(x, g, z) + 3] >= 0.5) { grounded = true; break; }
      if (!grounded) continue;
      const ai = v.index(x, ay, z);
      const aSolid = v.data[ai + 3];
      if (aSolid <= 0) continue;
      // local hardness (strata) holds steeper walls
      const hard = clamp(0.45 + v.material[ai + 3], 0, 1);
      const rep = repose + hard * 1.2;
      for (const [dx, dz] of dirs) {
        const X = x + dx, Z = z + dz;
        if (X < 0 || X >= nx || Z < 0 || Z >= nz) continue;
        const by = topY[Z * nx + X];
        const drop = ay - (by + 1); // height difference in voxels (b's fill level)
        if (drop <= rep) continue;
        let amt = rate * (drop - rep) * 0.06; // voxel fraction to move
        amt = Math.min(amt, aSolid * 0.5);
        if (amt <= 1e-4) continue;
        v.data[ai + 3] -= amt;             // shave the source top
        if (by + 1 < ny) {                 // fill on top of the lower column
          const bi = v.index(X, by + 1, Z);
          v.data[bi + 3] = Math.min(1, v.data[bi + 3] + amt);
        }
      }
    }
  }

  // ------------------------------------------------------------- one tick
  step(params) {
    if (params) this.params = { ...this.params, ...params };
    const dt = 0.04 * this.param("speed", 1);
    this.motion(dt);
    this.events(dt);
    this.apply();
    if (this.tick % 4 === 0) this.redistance(2);
    if (this.tick % 3 === 0) this.thermal(this.param("thermal", 0.35));
    this.tick++;
    return this.ledger;
  }
}

// Analytic river helpers shared by CPU solver (mirrored in GLSL)
export function canyonCenterAt(z, p) {
  return (p.canyonMeander ?? 1) * (2.5 * Math.sin(z * 0.15) + Math.sin(z * 0.36 + 1)) + (p.riverOffset || 0);
}
export function riverCurrentAt(x, y, z, p) {
  const deriv = (p.canyonMeander ?? 1) * (0.375 * Math.cos(z * 0.15) + 0.36 * Math.cos(z * 0.36 + 1));
  const l = Math.hypot(deriv, 1);
  const tangent = [deriv / l, 0, 1 / l];
  const width = p.riverWidth ?? 3.5;
  const lateral = clamp(canyonCenterAt(z, p) - x, -width, width) * 0.65;
  return [tangent[0] * (p.riverSpeed ?? 3.2) + 0, -0.25, tangent[2] * (p.riverSpeed ?? 3.2) + lateral * 0.0];
}

function hash3(x, y, z, seed) {
  let n = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 2147483647) ^ Math.imul(seed, 1274126177);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}
const tmp3 = [0, 0, 0];

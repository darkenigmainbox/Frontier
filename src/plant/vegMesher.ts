/**
 * Vegetable mesher.
 *
 * Root/bulb vegetables, leafy rosettes and fruiting vines/bushes are built
 * with the same discipline as the trees, grasses and desert plants: ONE
 * closed quad manifold per plant. Leaves, branches, flowers and fruit leave
 * their parent through rectangular windows cut into the parent's ring grid
 * and are welded to it with collar loops. Nothing is intersected, instanced
 * or merged, so the topology validator reports a single genus-0 surface and
 * the wind deformation is continuous from the soil to the tip of every leaf.
 *
 * Root vegetables grow their taproot/bulb body straight down from a small
 * crown disc at the soil line — most of the body is buried, with only its
 * shoulder and neck exposed (`exposure`), and a rosette of leaves fans out of
 * the same crown disc above ground, exactly like a real carrot or beetroot
 * pulled halfway out of the soil.
 *
 * Organ levels (for the Levels view and the GLB TEXCOORD_1 channel):
 *   0 body / crown / stem · 1 branches, leaves · 2 flowers, fruit.
 */

import { QuadMesh, VertexWind } from '../tree/mesh';
import { Random } from '../core/random';
import {
  V3, UP, TAU, DEG2RAD, add, addScaled, sub, dot, cross, normalize,
  lengthSq, lerp, mod, clamp, rotateAxis, scale,
} from '../core/math';
import { Line, Frame, growLine } from './line';
import { VegParams, vegHeight } from './vegParams';
import { bladePoint } from './grassMesher';

export interface VegStats {
  /** Organs meshed (body, crown, stem, branches, leaves, flowers, fruit). */
  organs: number;
  /** Windows welded (every organ but the body/crown has one). */
  junctions: number;
  dropped: number;
  dropReasons: Record<string, number>;
  /** body/stem · branches & leaves · flowers & fruit */
  perLevel: [number, number, number];
  leaves: number;
  branches: number;
  flowers: number;
  fruits: number;
}

export interface VegBuildResult {
  mesh: QuadMesh;
  stats: VegStats;
  height: number;
  /** Depth of the plant below the ground (metres). */
  groundDepth: number;
}

/** Where a child leaves its parent: a point on the parent surface with its frame. */
interface Exit {
  pos: V3;
  normal: V3;
  dir: V3;
  size: number;
  N: number;
}

interface Attachment {
  s: number;
  az: number;
  w: number;
  h: number;
  hh: number;
  pri: number;
  make: (exit: Exit) => Organ;
  j0: number;
  row0: number;
  row1: number;
}

interface Organ {
  level: number;
  line: Line;
  sStart: number;
  profile: (s: number, j: number, N: number) => { x: number; y: number };
  radius: (s: number) => number;
  round: boolean;
  extra: number[];
  spacing: number;
  children: Attachment[];
  wind: (s: number, y: number) => VertexWind;
  pivot: V3;
  r0: number;
  /** Colour group for this organ's vertices: 0 = skin/leaf (default), 1 = crown/neck, 2 = flower, 3 = fruit. */
  accent?: number;
}

interface Ring {
  idx: number[];
  s: number;
  f: Frame;
}

interface CrownWindow {
  a0: number;
  b0: number;
  w: number;
  h: number;
  make: (exit: Exit) => Organ;
}

/** (rows, columns) offsets tried when a window does not fit where the child wants it, cheapest first. */
const OFFSETS: [number, number][] = [
  [0, 0], [0, 1], [0, -1], [1, 0], [-1, 0],
  [1, 1], [1, -1], [-1, 1], [-1, -1],
  [2, 0], [-2, 0], [0, 2], [0, -2],
  [2, 1], [2, -1], [-2, 1], [-2, -1],
  [3, 0], [-3, 0], [3, 1], [-3, 1],
  [4, 0], [-4, 0],
];

const GOLDEN = 2.399963229728653; // 137.5°

export class VegMesher {
  readonly mesh = new QuadMesh();
  private readonly g: VegParams;
  private readonly bodyRng: Random;
  private readonly leafRng: Random;
  private readonly branchRng: Random;
  private readonly fruitRng: Random;
  private plantH = 1;
  private groundDepth = 0;
  private stats: VegStats = {
    organs: 0, junctions: 0, dropped: 0, dropReasons: {}, perLevel: [0, 0, 0],
    leaves: 0, branches: 0, flowers: 0, fruits: 0,
  };

  constructor(g: VegParams, seed: number) {
    this.g = g;
    const rng = new Random((seed ^ 0x76a3c951) >>> 0);
    this.bodyRng = rng.fork();
    this.leafRng = rng.fork();
    this.branchRng = rng.fork();
    this.fruitRng = rng.fork();
  }

  build(): VegBuildResult {
    this.plantH = Math.max(0.03, vegHeight(this.g));
    switch (this.g.habit) {
      case 'root': {
        // How high the crown (and the leaves growing out of it) sits above
        // the true soil datum y=0: the neck is always exposed, plus
        // whatever fraction of the body itself `exposure` pulls out of the
        // ground — this is the partial-exposure behaviour the carrot/
        // beetroot/onion presets rely on.
        const lift = Math.max(0, this.g.neckLength) + Math.max(0.02, this.g.bodyLength) * clamp(this.g.exposure, 0, 1);
        this.meshRosetteCrown({ w: 2, h: 3, lift, make: (exit) => this.makeRootBody(exit) });
        break;
      }
      case 'leafy':
        this.meshRosetteCrown({ w: 2, h: 2, lift: 0, make: (exit) => this.makeLeafyStub(exit) });
        break;
      case 'vine':
        this.meshRoot(this.makeVineStem());
        break;
    }
    let maxY = 1e-3;
    const p = this.mesh.positions;
    for (let i = 1; i < p.length; i += 3) if (p[i] > maxY) maxY = p[i];
    const w = this.mesh.wind;
    for (let i = 0; i < w.length; i += 4) w[i] = clamp(p[(i / 4) * 3 + 1] / maxY, 0, 1);
    return { mesh: this.mesh, stats: this.stats, height: maxY, groundDepth: this.groundDepth };
  }

  // ---------------------------------------------------------------------------
  // Root / bulb vegetables: a crown disc at the soil line carries the taproot
  // straight down and a rosette of leaves fanning up.
  // ---------------------------------------------------------------------------

  /**
   * A small basal disc at the soil line carrying a rosette of leaves fanning
   * up and out, with one central window reserved for a `centre` organ (a
   * taproot growing down for root habit, or a short stub growing up for
   * leafy habit). Leaves and the centre organ share the exact same welded
   * grid, so packing is identical (and identically reliable) for both.
   */
  private meshRosetteCrown(centre: { w: number; h: number; lift: number; make: (exit: Exit) => Organ }): void {
    const g = this.g;
    const mesh = this.mesh;
    const R = Math.max(0.012, g.crownRadius);
    const H = Math.max(0, g.crownHeight);
    const sink = 0.004;
    const lift = Math.max(0, centre.lift);
    const prof = 2.2;
    const leafN = clamp(Math.round(g.leafSides / 2) * 2, 8, 16);
    const lw = windowFor(leafN);
    const pitch = Math.max(lw.w, lw.h) + 1;
    const leaves = Math.max(1, Math.round(g.leaves));
    const need = leaves + 4; // reserve room for the centre window
    const S = Math.max(3, Math.ceil(Math.sqrt((Math.max(1, need) * 1.18) / 0.7)));
    const K = S * pitch + 2;

    const domePoint = (u01: number, v01: number): V3 => {
      const u = 2 * u01 - 1;
      const v = 2 * v01 - 1;
      const x = u * Math.sqrt(Math.max(0, 1 - (v * v) / 2));
      const z = v * Math.sqrt(Math.max(0, 1 - (u * u) / 2));
      const r = Math.min(1, Math.sqrt(x * x + z * z));
      // The crown disc itself sits at the soil line at its rim, but its
      // centre is lifted by `lift`: this is what visibly pulls a root
      // vegetable's shoulder out of the ground as `exposure` increases.
      return { x: R * x, y: -sink + H * (1 - Math.pow(r, prof)) + lift * (1 - Math.pow(r, 3)), z: R * z };
    };
    const domeNormal = (u01: number, v01: number): V3 => {
      const e = 0.5 / K;
      const du = sub(domePoint(Math.min(1, u01 + e), v01), domePoint(Math.max(0, u01 - e), v01));
      const dv = sub(domePoint(u01, Math.min(1, v01 + e)), domePoint(u01, Math.max(0, v01 - e)));
      const n = cross(dv, du);
      return lengthSq(n) < 1e-18 ? { x: 0, y: 1, z: 0 } : normalize(n);
    };

    type Site = { i: number; k: number; r: number; az: number; free: boolean };
    const sites: Site[][] = [];
    for (let i = 0; i < S; i++) {
      sites.push([]);
      for (let k = 0; k < S; k++) {
        const ca = 1 + i * pitch + pitch / 2;
        const cb = 1 + k * pitch + pitch / 2;
        const p = domePoint(ca / K, cb / K);
        const r = Math.sqrt(p.x * p.x + p.z * p.z) / R;
        sites[i].push({ i, k, r, az: Math.atan2(p.z, p.x), free: r <= 0.955 });
      }
    }
    // Centre window — reserve its footprint (plus a one-cell margin) before
    // handing out any leaf sites, so a leaf window's edge can never land on
    // a centre-organ cell regardless of pitch rounding.
    const rw = { w: centre.w, h: centre.h };
    const ra0 = Math.floor((K - rw.w) / 2);
    const rb0 = Math.floor((K - rw.h) / 2);
    const overlapsRoot = (i: number, k: number): boolean => {
      const a0 = 1 + i * pitch + Math.floor((pitch - lw.w) / 2);
      const b0 = 1 + k * pitch + Math.floor((pitch - lw.h) / 2);
      const marg = 1;
      return a0 < ra0 + rw.w + marg && a0 + lw.w + marg > ra0 && b0 < rb0 + rw.h + marg && b0 + lw.h + marg > rb0;
    };
    for (const row of sites) for (const s of row) if (overlapsRoot(s.i, s.k)) s.free = false;

    const windows: CrownWindow[] = [];
    const free: Site[] = [];
    for (const row of sites) for (const s of row) if (s.free) free.push(s);
    free.sort((a, b) => a.r - b.r);
    const nLeaves = Math.min(leaves, free.length);
    if (nLeaves < leaves) this.drop('no room on crown', leaves - nLeaves);
    const order: Site[] = [];
    const stride = 2;
    const used = new Array(free.length).fill(false);
    let idx = 0;
    for (let n = 0; n < free.length; n++) {
      while (used[idx]) idx = (idx + 1) % free.length;
      order.push(free[idx]);
      used[idx] = true;
      idx = (idx + stride) % free.length;
    }
    for (let n = 0; n < nLeaves; n++) {
      const s = order[n % order.length];
      if (n >= order.length) break;
      s.free = false;
      const rFrac = clamp(s.r / 0.955, 0, 1);
      const rb = this.leafRng;
      const az = s.az + rb.uniform() * 0.5;
      const lean = (10 + (g.leafSpread - 10) * Math.pow(rFrac, 0.8) + 6 * rb.uniform()) * DEG2RAD;
      const vals = {
        az, lean,
        length: Math.max(0.015, g.leafLength * (0.72 + 0.38 * rFrac) * (1 + g.leafLengthV * rb.uniform())),
        width: Math.max(0.004, g.leafWidth * (0.85 + 0.3 * rFrac) * (1 + 0.1 * rb.uniform())),
        phase: rb.next(),
      };
      windows.push({
        a0: 1 + s.i * pitch + Math.floor((pitch - lw.w) / 2),
        b0: 1 + s.k * pitch + Math.floor((pitch - lw.h) / 2),
        w: lw.w, h: lw.h,
        make: (exit) => this.makeLeaf(exit, vals),
      });
    }
    windows.push({ a0: ra0, b0: rb0, w: rw.w, h: rw.h, make: centre.make });

    const cellWin = new Int32Array(K * K).fill(-1);
    windows.forEach((win, id) => {
      for (let a = win.a0; a < win.a0 + win.w; a++) for (let b = win.b0; b < win.b0 + win.h; b++) cellWin[a * K + b] = id;
    });
    const occ = (a: number, b: number): boolean => a >= 0 && b >= 0 && a < K && b < K && cellWin[a * K + b] >= 0;
    const interior = (a: number, b: number): boolean => occ(a - 1, b - 1) && occ(a - 1, b) && occ(a, b - 1) && occ(a, b);
    const vid = new Int32Array((K + 1) * (K + 1)).fill(-1);
    const still: VertexWind = { height: 0, limb: 0, phase: 0, detail: 0 };
    const origin = { x: 0, y: 0, z: 0 };
    for (let a = 0; a <= K; a++) {
      for (let b = 0; b <= K; b++) {
        if (interior(a, b)) continue;
        const p = domePoint(a / K, b / K);
        vid[a * (K + 1) + b] = mesh.addVertex(p.x, p.y, p.z, still, origin, 0, 0, 1);
      }
    }
    const V = (a: number, b: number): number => vid[a * (K + 1) + b];
    this.stats.organs++;
    this.stats.perLevel[0]++;
    for (let a = 0; a < K; a++) {
      for (let b = 0; b < K; b++) {
        if (cellWin[a * K + b] >= 0) continue;
        mesh.addQuad(V(a, b), V(a, b + 1), V(a + 1, b + 1), V(a + 1, b), [a / K, b / K, a / K, (b + 1) / K, (a + 1) / K, (b + 1) / K, (a + 1) / K, b / K]);
      }
    }
    const depth = Math.max(0.008, 0.3 * R);
    this.groundDepth = sink + depth;
    const rim: number[] = [];
    for (let a = 0; a < K; a++) rim.push(V(a, K));
    for (let b = K; b > 0; b--) rim.push(V(K, b));
    for (let a = K; a > 0; a--) rim.push(V(a, 0));
    for (let b = 0; b < K; b++) rim.push(V(0, b));
    const below: number[] = [];
    for (const v of rim) below.push(mesh.addVertex(mesh.positions[v * 3] * 0.8, -sink - depth, mesh.positions[v * 3 + 2] * 0.8, still, origin, 0, 0, 1));
    const M = rim.length;
    for (let j = 0; j < M; j++) {
      const j1 = (j + 1) % M;
      mesh.addQuad(below[j], below[j1], rim[j1], rim[j], [j / M, -0.1, (j + 1) / M, -0.1, (j + 1) / M, 0, j / M, 0]);
    }
    this.cap([...below].reverse());

    for (const win of windows) {
      const loop: number[] = [];
      const { a0, b0, w, h } = win;
      for (let a = a0; a < a0 + w; a++) loop.push(V(a, b0 + h));
      for (let b = b0 + h; b > b0; b--) loop.push(V(a0 + w, b));
      for (let a = a0 + w; a > a0; a--) loop.push(V(a, b0));
      for (let b = b0; b < b0 + h; b++) loop.push(V(a0, b));
      const uc = (a0 + w / 2) / K;
      const vc = (b0 + h / 2) / K;
      const cell = (2 * R) / K;
      const exit: Exit = { pos: domePoint(uc, vc), normal: domeNormal(uc, vc), dir: { x: 0, y: 1, z: 0 }, size: Math.max(w, h) * cell, N: loop.length };
      this.meshTube(win.make(exit), loop, exit);
    }
  }

  /**
   * The taproot/bulb body: grows straight down from the crown through a
   * short exposed neck, then the shoulder-to-tip body — mostly buried, with
   * only the neck plus a shoulder fraction (`exposure`) standing clear of
   * the soil, exactly like a carrot or beetroot pulled halfway out of the
   * ground. `exit.pos` is already lifted above the soil datum (y = 0) by
   * the caller so the whole exposed portion clears the ground plane.
   */
  private makeRootBody(exit: Exit): Organ {
    const g = this.g;
    const bodyLen = Math.max(0.02, g.bodyLength);
    const neckLen = Math.max(0, g.neckLength);
    const R = Math.max(0.01, g.bodyRadius);
    const exposure = clamp(g.exposure, 0, 1);
    const above = bodyLen * exposure; // fraction of the body clear of the soil
    const buried = bodyLen - above;
    const L = neckLen + bodyLen;
    this.groundDepth = Math.max(this.groundDepth, buried);
    const dir0 = { x: 0, y: -1, z: 0 };
    const right0 = { x: 1, y: 0, z: 0 };
    const steps = Math.max(16, Math.round(g.bodyRings));
    // Grows downward from the crown (exit.pos, above the soil line) through
    // the neck first, then the body, ending at the buried tip.
    const line = growLine(exit.pos, dir0, right0, L, steps, () => ({}));
    const taper = clamp(g.bodyTaper, 0, 1);
    const bulge = clamp(g.bulbBulge, 0, 1);
    const radius = (s: number): number => {
      if (s < neckLen) {
        // Neck: narrow cylinder from the crown down to the shoulder.
        const u = neckLen > 1e-6 ? s / neckLen : 1;
        return Math.max(0.002, R * g.neckRadius * (0.85 + 0.15 * u));
      }
      const t = clamp((s - neckLen) / bodyLen, 0, 1); // 0 at shoulder, 1 at buried tip
      // Shoulder profile: a bulb bulge blends toward a rounded-to-pointed taproot tip.
      const bulbProfile = Math.sin(Math.PI * Math.pow(1 - t, 0.6)) * (1 - 0.15 * t);
      const spindleProfile = (1 - t) * (1 - Math.pow(t, 1 + taper * 3));
      let r = R * lerp1(spindleProfile, bulbProfile, bulge);
      // Rounded shoulder just below the neck so the two blend smoothly.
      if (t < 0.06) r *= 0.85 + 0.15 * (t / 0.06);
      return Math.max(0.0015, r);
    };
    const ribs = Math.max(0, Math.round(g.ribCount));
    const ribDepth = clamp(g.ribDepth, 0, 0.3);
    const profile = (s: number, j: number, n: number): { x: number; y: number } => {
      const th = (TAU * j) / n;
      let r = radius(s);
      if (ribs > 0 && s >= neckLen) {
        r *= 1 + ribDepth * Math.tanh(1.6 * Math.cos(ribs * th)) / 0.9217;
      }
      return { x: r * Math.cos(th), y: r * Math.sin(th) };
    };
    const children: Attachment[] = [];
    // Trailing root hairs near the buried tip.
    const nHairs = Math.max(0, Math.round(g.rootHairs));
    if (nHairs > 0) {
      const hairZoneLo = neckLen + bodyLen * 0.62;
      const hairZoneHi = neckLen + bodyLen * 0.96;
      for (let k = 0; k < nHairs; k++) {
        const s = hairZoneLo + ((k + 0.5) / nHairs) * (hairZoneHi - hairZoneLo);
        const az = k * GOLDEN + this.fruitRng.next() * 0.5;
        children.push({
          s, az, w: 1, h: 1, hh: 0.0015, pri: 1,
          j0: 0, row0: 0, row1: 0,
          make: (ex) => this.makeRootHair(ex),
        });
      }
    }
    const pivot = { x: 0, y: 0, z: 0 };
    return {
      level: 0, line, sStart: 0.4 * exit.size, profile, radius, round: true,
      extra: [Math.max(1e-4, neckLen - 0.001), neckLen + above],
      spacing: Math.max(1e-4, L / Math.max(10, Math.round(g.bodyRings))),
      children,
      wind: (_s, y) => ({ height: clamp(1 - (y + this.groundDepth) / this.plantH, 0, 1) * 0.15, limb: 0, phase: 0, detail: 0 }),
      pivot,
      r0: R,
      accent: 1,
    };
  }

  private makeRootHair(exit: Exit): Organ {
    const g = this.g;
    const L = Math.max(0.004, g.rootHairLength * (0.7 + 0.6 * this.fruitRng.next()));
    const dir0 = normalize(add(scale(exit.normal, 0.7), scale({ x: 0, y: -1, z: 0 }, 0.85)));
    let right0 = cross(exit.dir, exit.normal);
    right0 = lengthSq(right0) < 1e-10 ? { x: 1, y: 0, z: 0 } : normalize(right0);
    const line = growLine(exit.pos, dir0, right0, L, 3, () => ({}));
    const radius = (s: number): number => Math.max(0.0004, 0.0012 * (1 - s / L));
    const pivot = exit.pos;
    return {
      level: 1, line, sStart: Math.max(0.4 * exit.size, 0.0008),
      profile: (s, j, n) => {
        const r = radius(s);
        const th = (TAU * j) / n;
        return { x: r * Math.cos(th), y: r * Math.sin(th) };
      },
      radius, round: true, extra: [], spacing: Math.max(1e-5, L / 2), children: [],
      wind: () => ({ height: 0, limb: 0, phase: 0, detail: 0 }),
      pivot, r0: 0.0012, accent: 1,
    };
  }

  // ---------------------------------------------------------------------------
  // Leafy vegetables: a broad basal rosette (all leaves fan out of the crown
  // disc, like cabbage / lettuce / kale) topped by a short bare stub so the
  // centre of the rosette isn't a bare hole.
  // ---------------------------------------------------------------------------

  private makeLeafyStub(exit: Exit): Organ {
    const g = this.g;
    const R = Math.max(0.006, g.stemRadius);
    const H = Math.max(0.006, Math.min(g.stemHeight, R * 2.2));
    const line = growLine(exit.pos, { x: 0, y: 1, z: 0 }, { x: 1, y: 0, z: 0 }, H, 3, () => ({}));
    const radius = (s: number): number => Math.max(0.35 * R, R * (1 - 0.5 * (s / H)));
    const pivot = exit.pos;
    return {
      level: 0, line, sStart: 0.4 * exit.size,
      profile: (s, j, n) => {
        const r = radius(s);
        const th = (TAU * j) / n;
        return { x: r * Math.cos(th), y: r * Math.sin(th) };
      },
      radius, round: true, extra: [], spacing: Math.max(1e-4, H / 3), children: [],
      wind: (_s, y) => ({ height: clamp(y / this.plantH, 0, 1), limb: 0, phase: 0, detail: 0 }),
      pivot, r0: R,
    };
  }

  // ---------------------------------------------------------------------------
  // Fruiting vines/bushes: a stem with branches carrying leaves, flowers, fruit.
  // ---------------------------------------------------------------------------

  private makeVineStem(): Organ {
    const g = this.g;
    const R = Math.max(0.005, g.stemRadius);
    const H = Math.max(0.05, g.stemHeight);
    const depth = Math.max(0.01, 0.4 * R);
    this.groundDepth = Math.max(this.groundDepth, depth);
    const L = H + depth;
    const lean = g.stemLean * DEG2RAD;
    const az0 = this.bodyRng.next() * TAU;
    const A = { x: Math.cos(az0), y: 0, z: Math.sin(az0) };
    const dir0 = normalize(add(scale(UP, Math.cos(lean)), scale(A, Math.sin(lean))));
    const right0 = normalize(cross(UP, A));
    const steps = Math.max(14, Math.round(g.bodyRings));
    const line = growLine({ x: 0, y: -depth, z: 0 }, dir0, right0, L, steps, (t0, t1) => ({
      gravity: 3 * DEG2RAD * (t1 - t0) * (this.bodyRng.uniform() > 0 ? 1 : -1),
    }));
    const radius = (s: number): number => {
      if (s < depth) return R * (0.9 + 0.1 * (s / depth));
      const t = (s - depth) / H;
      return Math.max(0.2 * R, R * (1 - 0.55 * t));
    };
    const N = Math.max(8, Math.round(g.bodySides));
    const children: Attachment[] = [];
    const nb = Math.max(0, Math.round(g.branches));
    const zLo = depth + clamp(g.branchFrom, 0, 0.95) * H;
    const zHi = depth + clamp(g.branchTo, 0.05, 1) * H;
    for (let k = 0; k < nb; k++) {
      const t = nb > 1 ? k / (nb - 1) : 0.5;
      const s = zLo + t * (zHi - zLo);
      const az = k * GOLDEN + this.branchRng.next() * 0.4;
      const branchR = Math.max(0.003, R * 0.45 * (1 + 0.15 * this.branchRng.uniform()));
      const chord = (TAU * radius(clamp(s, 0, L))) / N;
      const side = Math.max(0.006, branchR * 2 * 0.7);
      const branchN = Math.max(8, Math.round(g.branchSides));
      let w = clamp(Math.round(side / chord), 1, branchN / 2 - 1);
      let h = branchN / 2 - w;
      if (h < 1) {
        w = branchN / 2 - 1;
        h = 1;
      }
      const hh = Math.max(0.006, side / 2);
      const branchLen = Math.max(0.03, g.branchLength * (1 + g.branchLengthV * this.branchRng.uniform()));
      children.push({
        s, az, w, h, hh, pri: 0, j0: 0, row0: 0, row1: 0,
        make: (exit) => this.makeBranch(exit, branchR, branchLen, branchN),
      });
    }
    const pivot = { x: 0, y: 0, z: 0 };
    return {
      level: 0, line, sStart: 0, profile: (s, j, n) => {
        const r = radius(s);
        const th = (TAU * j) / n;
        return { x: r * Math.cos(th), y: r * Math.sin(th) };
      },
      radius, round: true, extra: [depth, L - 0.004],
      spacing: Math.max(1e-4, H / Math.max(8, Math.round(g.bodyRings))),
      children,
      wind: (_s, y) => ({ height: clamp(y / this.plantH, 0, 1), limb: 0, phase: 0, detail: 0 }),
      pivot, r0: R,
    };
  }

  private makeBranch(exit: Exit, branchR: number, branchLen: number, branchN: number): Organ {
    const g = this.g;
    this.stats.branches++;
    const A = 90 * DEG2RAD - clamp(g.branchAngle, 0, 90) * DEG2RAD;
    const dir0 = normalize(add(scale(exit.dir, Math.sin(A)), scale(exit.normal, Math.cos(A))));
    let right0 = cross(exit.dir, exit.normal);
    right0 = lengthSq(right0) < 1e-10 ? { x: 1, y: 0, z: 0 } : normalize(right0);
    const droop = clamp(g.branchDroop, 0, 80) * DEG2RAD;
    const steps = Math.max(8, Math.round(branchLen / 0.02));
    const line = growLine(exit.pos, dir0, right0, branchLen, steps, (t0, t1) => ({
      gravity: droop * (Math.pow(t1, 1.3) - Math.pow(t0, 1.3)),
    }));
    const radius = (s: number): number => Math.max(0.15 * branchR, branchR * (1 - 0.75 * (s / branchLen)));
    const children: Attachment[] = [];
    const nl = Math.max(0, Math.round(g.leaves));
    const nfl = g.flowers ? Math.max(0, Math.round(g.flowersPerBranch)) : 0;
    const nfr = Math.max(0, Math.round(g.fruitsPerBranch));
    // Leaves occupy the lower ~70% of the branch; flowers/fruit cluster in a
    // separate zone near the tip so the two families never fight for the
    // same stations.
    const leafZoneEnd = (nfl + nfr) > 0 ? branchLen * 0.62 : branchLen * 0.94;
    const sStart0 = Math.min(0.3 * branchLen, Math.max(0.4 * exit.size, 0.006));
    const spacing = Math.max(0.01, (leafZoneEnd - sStart0) / Math.max(3, nl + 1));
    for (let k = 0; k < nl; k++) {
      const t = (k + 0.7) / Math.max(1, nl);
      const s = sStart0 + t * (leafZoneEnd - sStart0 - spacing * 0.3);
      const az = k * GOLDEN + this.leafRng.next() * 0.4;
      const vals = {
        az, lean: 60 * DEG2RAD + 10 * DEG2RAD * this.leafRng.uniform(),
        length: Math.max(0.015, g.leafLength * (1 + g.leafLengthV * this.leafRng.uniform())),
        width: Math.max(0.006, g.leafWidth * (1 + 0.15 * this.leafRng.uniform())),
        phase: this.leafRng.next(),
      };
      children.push({
        s, az, w: 1, h: 2, hh: Math.max(0.004, spacing * 0.3), pri: 1,
        j0: 0, row0: 0, row1: 0,
        make: (ex) => this.makeLeaf(ex, vals),
      });
    }
    // Flower/fruit truss: each family sits on its own ring (one row, many
    // azimuths) so up to `branchN` items per family fit side by side without
    // fighting each other for space along the branch length.
    const trussHi = branchLen - 1.7 * 0.009;
    const trussLo = Math.max(leafZoneEnd + 0.01, branchLen * 0.6);
    const sFlowers = clamp(trussHi, trussLo, trussHi);
    const sFruit = clamp(trussHi - (nfl > 0 ? 0.35 * (trussHi - trussLo) : 0), trussLo, trussHi);
    for (let k = 0; k < nfl; k++) {
      const az = ((k + 0.5) / Math.max(1, nfl)) * TAU + this.fruitRng.next() * 0.15;
      children.push({
        s: sFlowers, az, w: 1, h: 1, hh: 0.006, pri: 2, j0: 0, row0: 0, row1: 0,
        make: (ex) => this.makeFlower(ex),
      });
    }
    for (let k = 0; k < nfr; k++) {
      const az = ((k + 0.5) / Math.max(1, nfr)) * TAU + Math.PI / Math.max(1, nfr) + this.fruitRng.next() * 0.15;
      children.push({
        s: sFruit, az, w: 1, h: 1, hh: 0.009, pri: 2, j0: 0, row0: 0, row1: 0,
        make: (ex) => this.makeVegFruit(ex),
      });
    }
    const pivot = exit.pos;
    const phase = this.branchRng.next();
    return {
      level: 1, line, sStart: sStart0,
      profile: (s, j, n) => {
        const r = radius(s);
        const th = (TAU * j) / n;
        return { x: r * Math.cos(th), y: r * Math.sin(th) };
      },
      radius, round: true,
      extra: [branchLen * 0.5, branchLen - 0.004],
      spacing: Math.max(1e-4, branchLen / Math.max(6, Math.round(branchN * 0.8))),
      children,
      wind: (s, y) => ({ height: clamp(y / this.plantH, 0, 1), limb: clamp(0.4 * (s / branchLen), 0, 1), phase, detail: 0 }),
      pivot, r0: branchR,
    };
  }

  private makeFlower(exit: Exit): Organ {
    const g = this.g;
    this.stats.flowers++;
    const L = Math.max(0.004, g.flowerLength);
    const R = Math.max(0.002, g.flowerRadius);
    const dir0 = normalize(add(scale(exit.normal, 0.6), scale(exit.dir, -0.5)));
    let right0 = cross(exit.dir, exit.normal);
    right0 = lengthSq(right0) < 1e-10 ? { x: 1, y: 0, z: 0 } : normalize(right0);
    const line = growLine(exit.pos, dir0, right0, L, 4, () => ({}));
    const radius = (s: number): number => {
      const t = clamp(s / L, 0, 1);
      return Math.max(0.0008, R * (0.5 + 0.7 * Math.sin(Math.PI * clamp(t, 0.05, 0.95))));
    };
    const pivot = exit.pos;
    return {
      level: 2, line, sStart: Math.min(0.3 * L, Math.max(0.4 * exit.size, 0.0008)),
      profile: (s, j, n) => {
        const r = radius(s);
        const th = (TAU * j) / n;
        return { x: r * Math.cos(th), y: r * Math.sin(th) };
      },
      radius, round: true, extra: [L * 0.5], spacing: Math.max(1e-5, L / 3), children: [],
      wind: (_s, y) => ({ height: clamp(y / this.plantH, 0, 1), limb: 0.6, phase: 0.4, detail: 0 }),
      pivot, r0: R, accent: 2,
    };
  }

  private makeVegFruit(exit: Exit): Organ {
    const g = this.g;
    this.stats.fruits++;
    const L = Math.max(0.01, g.fruitLength);
    const R = Math.max(0.004, g.fruitRadius);
    const dir0 = normalize(add(scale(exit.normal, 0.35), scale(exit.dir, -0.94)));
    let right0 = cross(exit.dir, exit.normal);
    right0 = lengthSq(right0) < 1e-10 ? { x: 1, y: 0, z: 0 } : normalize(right0);
    const line = growLine(exit.pos, dir0, right0, L, 8, () => ({}));
    const taper = clamp(g.fruitTaper, 0, 1);
    const radius = (s: number): number => {
      const t = clamp(s / L, 0, 1);
      const round = 0.4 + 0.6 * Math.pow(Math.sin(Math.PI * clamp(t, 0.02, 0.98)), 0.7);
      const pod = (1 - t) * (1 - 0.2 * t);
      return Math.max(0.0012, R * lerp1(round, pod, taper) * (1 - 0.3 * sstep(0.85, 1, t)));
    };
    const pivot = exit.pos;
    return {
      level: 2, line, sStart: Math.min(0.3 * L, Math.max(0.4 * exit.size, 0.001)),
      profile: (s, j, n) => {
        const r = radius(s);
        const th = (TAU * j) / n;
        return { x: r * Math.cos(th), y: r * Math.sin(th) };
      },
      radius, round: true, extra: [L * 0.5, L * 0.85], spacing: Math.max(1e-5, L / 5), children: [],
      wind: (_s, y) => ({ height: clamp(y / this.plantH, 0, 1), limb: 0, phase: 0, detail: 0 }),
      pivot, r0: R, accent: 3,
    };
  }

  // ---------------------------------------------------------------------------
  // Leaves (all habits): a flat or lobed blade, optionally ruffled or rolled
  // into a hollow tube (onion / scallion).
  // ---------------------------------------------------------------------------

  private makeLeaf(exit: Exit, o: { az: number; lean: number; length: number; width: number; phase: number }): Organ {
    const g = this.g;
    this.stats.leaves++;
    const L = o.length;
    const A = { x: Math.cos(o.az), y: 0, z: Math.sin(o.az) };
    const dir0 = normalize(add(scale(UP, Math.cos(o.lean)), scale(A, Math.sin(o.lean))));
    const right0 = normalize(cross(UP, A));
    const droop = (g.leafCurve + 10 * this.leafRng.uniform()) * DEG2RAD;
    const steps = Math.max(8, Math.round(g.leafRings));
    const line = growLine(exit.pos, dir0, right0, L, steps, (t0, t1) => ({
      gravity: droop * (Math.pow(t1, 1.5) - Math.pow(t0, 1.5)),
    }));
    const keel = clamp(g.leafKeel, 0, 1);
    const hollow = clamp(g.leafHollow, 0, 1);
    const lobe = clamp(g.leafLobe, 0, 1);
    const nLobes = Math.max(1, Math.round(g.leafLobes));
    const ruffle = clamp(g.leafRuffle, 0, 1);
    const rufflePeriod = Math.max(1, g.leafRufflePeriod);
    const sStart = Math.min(0.3 * L, Math.max(1.4 * o.width * 0.3, 1.0 * exit.size, 0.0012));
    const N = exit.N;
    const m = N / 2;
    const widthAt = (s: number): number => {
      const t = clamp(s / L, 0, 1);
      // Broad leaves (low lobe) keep their belly width until close to the
      // tip, like cabbage / kale / lettuce; deeply lobed leaves (carrot,
      // tomato) narrow earlier so the compound-leaf silhouette still reads.
      const onset = lerp1(0.68, 0.5, lobe);
      const pw = lerp1(1.7, 1.2, lobe);
      return o.width * (0.35 + 0.65 * sstep(0, 0.2, t)) * (1 - Math.pow(sstep(onset, 1, t), pw) * 0.92);
    };
    const thickAt = (s: number): number => {
      const t = clamp(s / L, 0, 1);
      return g.leafThick * (0.5 + 0.5 * sstep(0, 0.2, t)) * (1 - sstep(0.4, 1, t) * 0.85);
    };
    const lobeAt = (s: number, u: number): number => {
      if (lobe <= 0.02) return 0;
      const t = s / L;
      if (t < 0.08 || t > 0.94) return 0;
      const ph = ((t - 0.08) / 0.86) * nLobes;
      const tri = 1 - Math.abs((ph - Math.floor(ph)) * 2 - 1);
      const env = sstep(0.08, 0.16, t) * (1 - sstep(0.82, 0.94, t));
      return lobe * Math.pow(Math.max(0, tri), 0.6) * env * (0.6 + 0.4 * Math.abs(u));
    };
    const ruffleAt = (s: number, u: number): number => {
      if (ruffle <= 0.01) return 0;
      const t = s / L;
      const env = sstep(0.05, 0.2, t) * (1 - sstep(0.85, 1, t));
      return ruffle * Math.sin(u * Math.PI * rufflePeriod + t * 3) * env * widthAt(s) * 0.4;
    };
    const profile = (s: number, j: number, n: number): { x: number; y: number } => {
      const q = bladePoint(n, j, widthAt(s), thickAt(s), keel, hollow);
      let u = 0;
      if (j <= m) u = 1 - (2 * j) / m;
      else u = -1 + (2 * (j - m)) / m;
      const lobeAmt = lobeAt(s, u);
      const ruffleAmt = ruffleAt(s, u);
      if (Math.abs(lobeAmt) > 1e-5 && Math.abs(u) > 0.85) {
        return { x: q.x - Math.sign(u) * lobeAmt * widthAt(s), y: q.y + ruffleAmt };
      }
      return { x: q.x, y: q.y + ruffleAmt };
    };
    const extra: number[] = [L - 0.001];
    if (lobe > 0.02) {
      for (let k = 0; k <= nLobes; k++) {
        const t = 0.08 + (0.86 * k) / nLobes;
        extra.push(t * L);
      }
    }
    const pivot = exit.pos;
    return {
      level: 1, line, sStart, profile,
      radius: (s) => 0.5 * widthAt(s),
      round: false, extra,
      spacing: Math.max(1e-4, L / Math.max(6, Math.round(g.leafRings))),
      children: [],
      wind: (s, y) => ({
        height: clamp(y / this.plantH, 0, 1),
        limb: clamp(0.1 * (s / L), 0, 1), phase: o.phase,
        detail: clamp((s / L - 0.6) / 0.4, 0, 1) * 0.08,
      }),
      pivot, r0: o.width * 0.3,
    };
  }

  // ---------------------------------------------------------------------------
  // Tubes: the welded window engine (same discipline as the desert mesher)
  // ---------------------------------------------------------------------------

  private meshRoot(o: Organ): void {
    const mesh = this.mesh;
    const L = o.line.length;
    const N = Math.max(10, Math.round(this.g.bodySides));
    const colStep = TAU / N;
    this.stats.organs++;
    this.stats.perLevel[0]++;

    const accepted = this.planWindows(o, N, colStep, L);
    const st = this.stations(o, accepted);
    const K = st.length;
    const occupied = new Uint8Array(Math.max(1, K - 1) * N);
    const rows: Attachment[] = [];
    for (const c of accepted) {
      const row0 = nearestIndex(st, c.s - c.hh);
      const row1 = nearestIndex(st, c.s + c.hh);
      if (row0 < 1 || row1 > K - 1 || row1 - row0 !== c.h) {
        this.drop('no room on parent');
        continue;
      }
      let free = true;
      for (let i = row0; i < row1 && free; i++) for (let j = 0; j < c.w; j++) if (occupied[i * N + mod(c.j0 + j, N)]) free = false;
      if (!free) {
        this.drop('window conflict');
        continue;
      }
      for (let i = row0; i < row1; i++) for (let j = 0; j < c.w; j++) occupied[i * N + mod(c.j0 + j, N)] = 1;
      c.row0 = row0;
      c.row1 = row1;
      c.s = 0.5 * (st[row0] + st[row1]);
      rows.push(c);
    }

    const cellOcc = (i: number, j: number): boolean => i >= 0 && i < K - 1 && occupied[i * N + mod(j, N)] === 1;
    const interior = (i: number, j: number): boolean => cellOcc(i - 1, j - 1) && cellOcc(i - 1, j) && cellOcc(i, j - 1) && cellOcc(i, j);
    const rings: Ring[] = [];
    for (let i = 0; i < K; i++) rings.push(this.buildRing(o, st[i], N, undefined, (j) => interior(i, j)));
    this.cap([...rings[0].idx].reverse());
    for (let i = 0; i < K - 1; i++) {
      const a = rings[i].idx;
      const b = rings[i + 1].idx;
      const va = st[i] / L;
      const vb = st[i + 1] / L;
      for (let j = 0; j < N; j++) {
        if (occupied[i * N + j]) continue;
        const j1 = (j + 1) % N;
        mesh.addQuad(a[j], a[j1], b[j1], b[j], [j / N, va, (j + 1) / N, va, (j + 1) / N, vb, j / N, vb]);
      }
    }
    this.cap(rings[K - 1].idx);
    this.meshChildren(o, rows, rings, N, colStep);
  }

  private meshTube(o: Organ, loop: number[], exit: Exit): void {
    const mesh = this.mesh;
    const N = loop.length;
    const L = o.line.length;
    const colStep = TAU / N;
    this.stats.organs++;
    this.stats.perLevel[Math.min(2, o.level)]++;

    if (o.round) {
      const f0 = o.line.at(o.sStart);
      const ph = this.fitPhase(loop, f0);
      if (Math.abs(ph) > 1e-6) {
        const rs = o.line.rights;
        for (let i = 0; i < rs.length; i++) rs[i] = rotateAxis(rs[i], o.line.dirs[i], ph);
      }
    }

    const accepted = this.planWindows(o, N, colStep, L);
    const st = this.stations(o, accepted);
    const K = st.length;
    const occupied = new Uint8Array(Math.max(1, K - 1) * N);
    const rows: Attachment[] = [];
    for (const c of accepted) {
      const row0 = nearestIndex(st, c.s - c.hh);
      const row1 = nearestIndex(st, c.s + c.hh);
      if (row0 < 1 || row1 > K - 1 || row1 - row0 !== c.h) {
        this.drop('no room on parent');
        continue;
      }
      let free = true;
      for (let i = row0; i < row1 && free; i++) for (let j = 0; j < c.w; j++) if (occupied[i * N + mod(c.j0 + j, N)]) free = false;
      if (!free) {
        this.drop('window conflict');
        continue;
      }
      for (let i = row0; i < row1; i++) for (let j = 0; j < c.w; j++) occupied[i * N + mod(c.j0 + j, N)] = 1;
      c.row0 = row0;
      c.row1 = row1;
      c.s = 0.5 * (st[row0] + st[row1]);
      rows.push(c);
    }

    const cellOcc = (i: number, j: number): boolean => i >= 0 && i < K - 1 && occupied[i * N + mod(j, N)] === 1;
    const interior = (i: number, j: number): boolean => cellOcc(i - 1, j - 1) && cellOcc(i - 1, j) && cellOcc(i, j - 1) && cellOcc(i, j);
    const rings: Ring[] = [];
    for (let i = 0; i < K; i++) rings.push(this.buildRing(o, st[i], N, undefined, (j) => interior(i, j)));

    this.collar(loop, rings[0], exit, o);
    for (let i = 0; i < K - 1; i++) {
      const a = rings[i].idx;
      const b = rings[i + 1].idx;
      const va = st[i] / L;
      const vb = st[i + 1] / L;
      for (let j = 0; j < N; j++) {
        if (occupied[i * N + j]) continue;
        const j1 = (j + 1) % N;
        mesh.addQuad(a[j], a[j1], b[j1], b[j], [j / N, va, (j + 1) / N, va, (j + 1) / N, vb, j / N, vb]);
      }
    }
    this.cap(rings[K - 1].idx);
    this.meshChildren(o, rows, rings, N, colStep);
  }

  private meshChildren(o: Organ, rows: Attachment[], rings: Ring[], N: number, _colStep: number): void {
    for (const c of rows) {
      const childLoop = this.holeLoop(rings, c, N);
      const f = o.line.at(c.s);
      const centroid = this.loopCentroid(childLoop);
      let normal = sub(centroid, f.pos);
      normal = lengthSq(normal) < 1e-18 ? f.dir : normalize(normal);
      const childExit: Exit = { pos: centroid, normal, dir: f.dir, size: this.loopSize(childLoop, centroid), N: childLoop.length };
      this.meshTube(c.make(childExit), childLoop, childExit);
    }
  }

  private planWindows(o: Organ, N: number, colStep: number, L: number): Attachment[] {
    const accepted: Attachment[] = [];
    const pri0 = o.children.filter((c) => c.pri === 0).sort((a, b) => a.s - b.s);
    const rest = o.children.filter((c) => c.pri !== 0).sort((a, b) => a.pri - b.pri || a.s - b.s);
    for (const c of [...pri0, ...rest]) this.placeWindow(o, c, N, colStep, L, accepted);
    return accepted;
  }

  private placeWindow(o: Organ, c: Attachment, N: number, colStep: number, L: number, accepted: Attachment[]): void {
    if (c.w >= N) {
      this.drop('window wider than parent');
      return;
    }
    const jBase = Math.round(c.az / colStep - c.w / 2);
    const sMin = o.sStart + 0.6 * c.hh;
    const sMax = L - 0.6 * c.hh;
    const epsSame = 0.6 * c.hh;
    for (const [dr, dj] of OFFSETS) {
      const s = c.s + dr * 2 * c.hh;
      const lo = s - c.hh;
      const hi = s + c.hh;
      if (lo < sMin || hi > sMax) continue;
      const j0 = mod(jBase + dj, N);
      let ok = true;
      for (const a of accepted) {
        const aLo = a.s - a.hh;
        const aHi = a.s + a.hh;
        if (circularOverlap(j0, c.w, a.j0, a.w, N)) {
          if (lo < aHi + epsSame && aLo < hi + epsSame) {
            ok = false;
            break;
          }
        } else if (circularOverlap(j0 - 1, c.w + 2, a.j0, a.w, N)) {
          if (lo < aHi - 1e-9 && aLo < hi - 1e-9) {
            ok = false;
            break;
          }
        } else if (lo < aHi - 1e-9 && aLo < hi - 1e-9) {
          const identical = c.h === a.h && Math.abs(lo - aLo) < 5e-4 && Math.abs(hi - aHi) < 5e-4;
          if (!identical) {
            ok = false;
            break;
          }
        }
      }
      if (!ok) continue;
      c.s = s;
      c.j0 = j0;
      c.az = (j0 + c.w / 2) * colStep;
      accepted.push(c);
      return;
    }
    this.drop(L - o.sStart < 2.4 * c.hh ? 'organ too short' : 'window conflict');
  }

  private stations(o: Organ, windows: Attachment[]): number[] {
    const L = o.line.length;
    const sStart = o.sStart;
    if (L - sStart < 1e-6) return [sStart];
    type St = { s: number; pri: number };
    const spans: [number, number][] = windows.map((w) => [w.s - w.hh, w.s + w.hh]);
    const inside = (s: number): boolean => spans.some(([a, b]) => s > a + 1e-9 && s < b - 1e-9);
    const mand: St[] = [
      { s: sStart, pri: 3 },
      { s: L, pri: 3 },
    ];
    let minRow = Infinity;
    for (const w of windows) {
      mand.push({ s: w.s - w.hh, pri: 2 }, { s: w.s + w.hh, pri: 2 });
      for (let r = 1; r < w.h; r++) mand.push({ s: w.s - w.hh + (2 * w.hh * r) / w.h, pri: 2 });
      const cell = (2 * w.hh) / w.h;
      if (cell < minRow) minRow = cell;
    }
    for (const s of o.extra) if (s > sStart + 1e-6 && s < L - 1e-6 && !inside(s)) mand.push({ s, pri: 1 });
    const spacing = o.spacing;
    const eps = Math.min(spacing * 0.3, isFinite(minRow) ? minRow * 0.3 : Infinity);
    mand.sort((a, b) => a.s - b.s || b.pri - a.pri);
    const kept: St[] = [];
    for (const st of mand) {
      const last = kept[kept.length - 1];
      if (last && st.s - last.s < eps) {
        if (st.pri > last.pri) kept[kept.length - 1] = st;
        continue;
      }
      kept.push(st);
    }
    kept[kept.length - 1] = { s: L, pri: 3 };
    if (kept.length >= 2 && kept[kept.length - 1].s - kept[kept.length - 2].s < eps * 0.5) kept.splice(kept.length - 2, 1);
    const out: number[] = [];
    for (let i = 0; i < kept.length; i++) {
      out.push(kept[i].s);
      if (i === kept.length - 1) break;
      const gap = kept[i + 1].s - kept[i].s;
      if (inside(kept[i].s + 0.5 * gap)) continue;
      const n = Math.floor(gap / spacing);
      if (n >= 1) {
        const step = gap / (n + 1);
        for (let k = 1; k <= n; k++) out.push(kept[i].s + k * step);
      }
    }
    return out;
  }

  private buildRing(o: Organ, s: number, N: number, tiltNormal: V3 | undefined, skip: (j: number) => boolean): Ring {
    const f = o.line.at(s);
    const idx: number[] = new Array(N);
    const an = tiltNormal ? dot(f.dir, tiltNormal) : 1;
    for (let j = 0; j < N; j++) {
      if (skip(j)) {
        idx[j] = -1;
        continue;
      }
      const q = o.profile(s, j, N);
      const off = { x: q.x * f.right.x + q.y * f.up.x, y: q.x * f.right.y + q.y * f.up.y, z: q.x * f.right.z + q.y * f.up.z };
      if (tiltNormal && an > 0.3) {
        const lambda = -dot(off, tiltNormal) / an;
        off.x += f.dir.x * lambda;
        off.y += f.dir.y * lambda;
        off.z += f.dir.z * lambda;
      }
      const p = add(f.pos, off);
      idx[j] = this.mesh.addVertex(p.x, p.y, p.z, o.wind(s, p.y), o.pivot, o.level, 0, o.accent ?? 0);
    }
    return { idx, s, f };
  }

  private fitPhase(loop: number[], f: Frame): number {
    const M = loop.length;
    const xs: number[] = new Array(M);
    const ys: number[] = new Array(M);
    let cx = 0;
    let cy = 0;
    for (let k = 0; k < M; k++) {
      const v = sub(this.pos(loop[k]), f.pos);
      xs[k] = dot(v, f.right);
      ys[k] = dot(v, f.up);
      cx += xs[k];
      cy += ys[k];
    }
    cx /= M;
    cy /= M;
    let sx = 0;
    let sy = 0;
    for (let k = 0; k < M; k++) {
      const a = Math.atan2(ys[k] - cy, xs[k] - cx) - (TAU * k) / M;
      sx += Math.cos(a);
      sy += Math.sin(a);
    }
    return Math.atan2(sy, sx);
  }

  private collar(loop: number[], first: Ring, exit: Exit, o: Organ): void {
    const mesh = this.mesh;
    const M = loop.length;
    const shift = this.bestShift(loop, first.idx);
    const lp: number[] = new Array(M);
    for (let k = 0; k < M; k++) lp[k] = loop[(k + shift) % M];
    const n = 1;
    const a0 = o.line.dirs[0];
    const radial = exit.normal;
    const cosT = Math.max(0.2, dot(a0, radial));
    const fillet = 0.7;
    let prev = lp;
    for (let q = 0; q < n; q++) {
      const k = (q + 1) / (n + 1);
      const mid: number[] = [];
      for (let i = 0; i < M; i++) {
        const a = this.pos(lp[i]);
        const b = this.pos(first.idx[i]);
        const chord = lerp(a, b, k);
        let mu = dot(sub(b, a), radial) / cosT;
        mu = clamp(mu, 0, 4 * o.r0);
        const c = addScaled(b, a0, -mu);
        const w0 = (1 - k) * (1 - k);
        const w1 = 2 * k * (1 - k);
        const w2 = k * k;
        const bez = { x: a.x * w0 + c.x * w1 + b.x * w2, y: a.y * w0 + c.y * w1 + b.y * w2, z: a.z * w0 + c.z * w1 + b.z * w2 };
        const p = lerp(chord, bez, fillet);
        mid.push(mesh.addVertex(p.x, p.y, p.z, o.wind(first.s * k, p.y), o.pivot, o.level, 1, o.accent ?? 0));
      }
      this.bridge(prev, mid);
      prev = mid;
    }
    this.bridge(prev, first.idx);
    for (const v of loop) mesh.junction[v] = 1;
    for (const v of first.idx) mesh.junction[v] = 1;
    this.stats.junctions++;
  }

  private bestShift(loop: number[], ring: number[]): number {
    const M = loop.length;
    const p = this.mesh.positions;
    let best = 0;
    let bestCost = Infinity;
    for (let sh = 0; sh < M; sh++) {
      let cost = 0;
      for (let k = 0; k < M; k++) {
        const a = loop[(k + sh) % M] * 3;
        const b = ring[k] * 3;
        const dx = p[a] - p[b];
        const dy = p[a + 1] - p[b + 1];
        const dz = p[a + 2] - p[b + 2];
        cost += dx * dx + dy * dy + dz * dz;
      }
      if (cost < bestCost) {
        bestCost = cost;
        best = sh;
      }
    }
    return best;
  }

  private bridge(a: number[], b: number[]): void {
    const M = a.length;
    for (let k = 0; k < M; k++) {
      const k1 = (k + 1) % M;
      this.mesh.addQuad(a[k], a[k1], b[k1], b[k], [k / M, -0.05, (k + 1) / M, -0.05, (k + 1) / M, 0, k / M, 0]);
    }
  }

  private cap(ring: number[]): void {
    const M = ring.length;
    for (let i = 0; 2 * i <= M - 3; i++) {
      this.mesh.addQuad(ring[i], ring[i + 1], ring[M - 2 - i], ring[M - 1 - i], [0, 0, 1, 0, 1, 1, 0, 1]);
    }
  }

  private holeLoop(rings: Ring[], h: Attachment, N: number): number[] {
    const loop: number[] = [];
    const { row0, row1, j0, w } = h;
    for (let j = 0; j <= w; j++) loop.push(rings[row0].idx[mod(j0 + j, N)]);
    for (let i = row0 + 1; i <= row1; i++) loop.push(rings[i].idx[mod(j0 + w, N)]);
    for (let j = w - 1; j >= 0; j--) loop.push(rings[row1].idx[mod(j0 + j, N)]);
    for (let i = row1 - 1; i >= row0 + 1; i--) loop.push(rings[i].idx[mod(j0, N)]);
    for (const v of loop) if (v < 0) throw new Error('holeLoop: window touches a skipped vertex');
    return loop;
  }

  private loopCentroid(loop: number[]): V3 {
    const p = this.mesh.positions;
    let x = 0;
    let y = 0;
    let z = 0;
    for (const v of loop) {
      x += p[v * 3];
      y += p[v * 3 + 1];
      z += p[v * 3 + 2];
    }
    const n = Math.max(1, loop.length);
    return { x: x / n, y: y / n, z: z / n };
  }

  private loopSize(loop: number[], centroid: V3): number {
    const p = this.mesh.positions;
    let d = 0;
    for (const v of loop) {
      const dx = p[v * 3] - centroid.x;
      const dy = p[v * 3 + 1] - centroid.y;
      const dz = p[v * 3 + 2] - centroid.z;
      const q = dx * dx + dy * dy + dz * dz;
      if (q > d) d = q;
    }
    return 2 * Math.sqrt(d);
  }

  private pos(i: number): V3 {
    const p = this.mesh.positions;
    return { x: p[i * 3], y: p[i * 3 + 1], z: p[i * 3 + 2] };
  }

  private drop(reason: string, n = 1): void {
    this.stats.dropped += n;
    this.stats.dropReasons[reason] = (this.stats.dropReasons[reason] ?? 0) + n;
  }
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function windowFor(N: number): { w: number; h: number } {
  switch (N) {
    case 4:
      return { w: 1, h: 1 };
    case 6:
      return { w: 1, h: 2 };
    case 8:
      return { w: 2, h: 2 };
    case 10:
      return { w: 2, h: 3 };
    default:
      return { w: 3, h: 3 };
  }
}

function sstep(a: number, b: number, x: number): number {
  const t = clamp((x - a) / Math.max(1e-9, b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

function lerp1(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function nearestIndex(sorted: number[], v: number): number {
  let lo = 0;
  let hi = sorted.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid] <= v) lo = mid;
    else hi = mid;
  }
  return Math.abs(sorted[lo] - v) <= Math.abs(sorted[hi] - v) ? lo : hi;
}

function circularOverlap(a: number, wa: number, b: number, wb: number, N: number): boolean {
  if (wa >= N || wb >= N) return true;
  a = mod(a, N);
  b = mod(b, N);
  const d = mod(b - a, N);
  if (d < wa) return true;
  const d2 = mod(a - b, N);
  return d2 < wb;
}

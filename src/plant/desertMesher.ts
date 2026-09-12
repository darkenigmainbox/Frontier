/**
 * Desert mesher.
 *
 * Columnar cacti, barrels, prickly pears, chollas, agave rosettes and ocotillo
 * are built with the same discipline as the trees and grasses: ONE closed quad
 * manifold per plant. Arms, pads, leaves and canes leave their parent through
 * rectangular windows cut into the parent's ring grid and are welded to it
 * with collar loops; areole cushions sit on the ribs the same way and carry
 * the spines, glochids, fruits and flowers as a third generation. Nothing is
 * intersected, instanced or merged, so the topology validator reports a single
 * genus-0 surface and the wind deformation is continuous from the soil to the
 * tip of every spine.
 *
 * Organ levels (for the Levels view and the GLB TEXCOORD_1 channel):
 *   0 body / crown / trunk / base · 1 arms, pads, leaves, canes, stalk ·
 *   2 areole cushions, spines, glochids, thorns, fruits, flowers, buds.
 */

import { QuadMesh, VertexWind } from '../tree/mesh';
import { Random } from '../core/random';
import {
  V3, UP, TAU, DEG2RAD, add, addScaled, sub, dot, cross, normalize,
  lengthSq, lerp, lerp1, mod, clamp, rotateTowards, rotateAxis, scale,
} from '../core/math';
import { Line, Frame, growLine } from './line';
import { DesertParams, desertHeight } from './desertParams';
import { bladePoint } from './grassMesher';

export interface DesertStats {
  /** Organs meshed (body, limbs, cushions, spines, fruits …). */
  organs: number;
  /** Windows welded (every organ but the body/crown has one). */
  junctions: number;
  dropped: number;
  dropReasons: Record<string, number>;
  /** body · limbs · details */
  perLevel: [number, number, number];
  arms: number;
  pads: number;
  leaves: number;
  canes: number;
  spines: number;
  fruits: number;
}

export interface DesertBuildResult {
  mesh: QuadMesh;
  stats: DesertStats;
  height: number;
  /** Depth of the plant below the ground (metres). */
  groundDepth: number;
}

/** Where a child leaves its parent: a point on the parent surface with its frame. */
interface Exit {
  pos: V3;
  /** Outward surface normal. */
  normal: V3;
  /** Parent axis direction. */
  dir: V3;
  /** Physical size of the window (longest side), metres. */
  size: number;
  /** Vertices of the window loop = vertices around the child's rings. */
  N: number;
}

interface Attachment {
  /** Arc length of the exit along the parent. */
  s: number;
  /** Azimuth of the exit in the parent's ring frame, radians. */
  az: number;
  /** Window size in cells. */
  w: number;
  h: number;
  /** Half height of the window along the parent, metres. */
  hh: number;
  /** Planning priority: structure (arms, pads, fruits) wins over areoles. */
  pri: number;
  /** Counts against the spine budget. */
  spine: boolean;
  make: (exit: Exit) => Organ;
  // Filled in by the planner.
  j0: number;
  row0: number;
  row1: number;
}

interface Organ {
  level: number;
  line: Line;
  /** Arc length of the first ring (collar length). */
  sStart: number;
  /** Ring vertex j of N at arc length s, in the (right, up) frame of the centreline. */
  profile: (s: number, j: number, N: number) => { x: number; y: number };
  /** Local mean radius (window sizing, exits of children). */
  radius: (s: number) => number;
  /** Round cross-section: the ring phase is fitted to the window. */
  round: boolean;
  /** Extra mandatory ring stations. */
  extra: number[];
  /** Regular ring spacing. */
  spacing: number;
  children: Attachment[];
  wind: (s: number, y: number) => VertexWind;
  pivot: V3;
  /** Nominal radius for the collar fillet clamp. */
  r0: number;
}

interface Ring {
  idx: number[];
  s: number;
  f: Frame;
}

/** (rows, columns) offsets tried when a window does not fit where the child wants it, cheapest first. */
const OFFSETS: [number, number][] = [
  [0, 0],
  [0, 1],
  [0, -1],
  [1, 0],
  [-1, 0],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
  [2, 0],
  [-2, 0],
  [0, 2],
  [0, -2],
  [2, 1],
  [2, -1],
  [-2, 1],
  [-2, -1],
  [3, 0],
  [-3, 0],
  [3, 1],
  [-3, 1],
  [4, 0],
  [-4, 0],
];

const GOLDEN = 2.399963229728653; // 137.5°

export class DesertMesher {
  readonly mesh = new QuadMesh();
  private readonly g: DesertParams;
  private readonly bodyRng: Random;
  private readonly armRng: Random;
  private readonly padRng: Random;
  private readonly leafRng: Random;
  private readonly areoleRng: Random;
  private readonly spineRng: Random;
  private readonly fruitRng: Random;
  private plantH = 1;
  private groundDepth = 0;
  private spineCount = 0;
  private stats: DesertStats = {
    organs: 0, junctions: 0, dropped: 0, dropReasons: {}, perLevel: [0, 0, 0],
    arms: 0, pads: 0, leaves: 0, canes: 0, spines: 0, fruits: 0,
  };

  constructor(g: DesertParams, seed: number) {
    this.g = g;
    const rng = new Random((seed ^ 0x51d3e2a7) >>> 0);
    this.bodyRng = rng.fork();
    this.armRng = rng.fork();
    this.padRng = rng.fork();
    this.leafRng = rng.fork();
    this.areoleRng = rng.fork();
    this.spineRng = rng.fork();
    this.fruitRng = rng.fork();
  }

  build(): DesertBuildResult {
    this.plantH = Math.max(0.05, desertHeight(this.g));
    switch (this.g.habit) {
      case 'columnar':
        if (Math.round(this.g.arms) >= 8 && this.g.armFrom < 0.15) this.meshColumnCluster();
        else this.meshRoot(this.makeColumnarBody());
        break;
      case 'barrel':
        this.meshRoot(this.makeBarrelBody());
        break;
      case 'pads':
        this.meshRoot(this.makePad(0, 0, null));
        break;
      case 'rosette':
        this.meshRosetteCrown();
        break;
      case 'canes':
        this.meshRoot(this.makeCaneBase());
        break;
    }
    // Normalise the sway weight by the real height of the plant.
    let maxY = 1e-3;
    const p = this.mesh.positions;
    for (let i = 1; i < p.length; i += 3) if (p[i] > maxY) maxY = p[i];
    const w = this.mesh.wind;
    for (let i = 0; i < w.length; i += 4) w[i] = clamp(p[(i / 4) * 3 + 1] / maxY, 0, 1);
    return { mesh: this.mesh, stats: this.stats, height: maxY, groundDepth: this.groundDepth };
  }

  // ---------------------------------------------------------------------------
  // Columnar & barrel bodies
  // ---------------------------------------------------------------------------

  /** Vertices around a ribbed stem: a multiple of the rib count with ~1.2 cm cells. */
  private ribbedSides(R: number, ribs: number, targetChord = 0.012): number {
    const cellsPer = clamp(Math.round((TAU * R) / Math.max(1, ribs) / targetChord), 2, 10);
    return Math.max(8, ribs * cellsPer);
  }

  private makeColumnarBody(): Organ {
    const g = this.g;
    const R = Math.max(0.03, g.bodyRadius);
    const H = Math.max(0.3, g.height);
    const depth = Math.max(0.06, 0.5 * R);
    const sink = Math.max(0, g.sink);
    const sGround = sink + depth;
    this.groundDepth = Math.max(this.groundDepth, sGround);
    const L = H + sGround;
    const lean = (g.lean + g.leanV * this.bodyRng.uniform()) * DEG2RAD;
    const az = this.bodyRng.next() * TAU;
    const A = { x: Math.cos(az), y: 0, z: Math.sin(az) };
    const dir0 = normalize(add(scale(UP, Math.cos(lean)), scale(A, Math.sin(lean))));
    const right0 = normalize(cross(UP, A));
    const curve = g.curve * DEG2RAD;
    const steps = Math.max(16, Math.round(g.bodyRings) * 2);
    const line = growLine({ x: 0, y: -(sink + depth), z: 0 }, dir0, right0, L, steps, (t0, t1) => ({
      gravity: curve * (Math.pow(t1, 1.4) - Math.pow(t0, 1.4)),
    }));
    const domeLen = Math.min(0.3 * H, 2.6 * R);
    const taper = clamp(g.bodyTaper, 0, 0.8);
    const radius = (s: number): number => {
      if (s < sGround) return R * (0.86 + 0.14 * (s / sGround));
      const t = (s - sGround) / H;
      let r = R * (1 - taper * t) * (1 + 0.22 * Math.exp(-Math.pow(t / 0.05, 2)));
      if (s > L - domeLen) {
        const u = clamp((s - (L - domeLen)) / domeLen, 0, 1);
        r *= Math.pow(Math.cos((u * Math.PI) / 2), 0.65);
      }
      return Math.max(0.12 * R, r);
    };
    return this.finishStem(line, L, sGround, radius, {
      ribs: Math.max(6, Math.round(g.ribs)),
      sides: this.ribbedSides(R, Math.max(6, Math.round(g.ribs))),
      domeLen,
      arms: Math.max(0, Math.round(g.arms)),
      isBarrel: false,
    });
  }

  private makeBarrelBody(): Organ {
    const g = this.g;
    const R = Math.max(0.05, g.bodyRadius);
    const H = Math.max(0.15, g.height);
    const depth = Math.max(0.05, 0.35 * R);
    const sink = Math.max(0, g.sink);
    const sGround = sink + depth;
    this.groundDepth = Math.max(this.groundDepth, sGround);
    const L = H + sGround;
    const lean = (g.lean + g.leanV * this.bodyRng.uniform()) * DEG2RAD;
    const az = this.bodyRng.next() * TAU;
    const A = { x: Math.cos(az), y: 0, z: Math.sin(az) };
    const dir0 = normalize(add(scale(UP, Math.cos(lean)), scale(A, Math.sin(lean))));
    const right0 = normalize(cross(UP, A));
    const steps = Math.max(16, Math.round(g.bodyRings) * 2);
    const line = growLine({ x: 0, y: -(sink + depth), z: 0 }, dir0, right0, L, steps, (t0, t1) => ({
      gravity: g.curve * DEG2RAD * (t1 - t0),
    }));
    // Squat barrel curve: buried base, widest just below the middle, flat woolly crown.
    const radius = (s: number): number => {
      if (s < sGround) return R * (0.3 + 0.25 * (s / sGround));
      const t = clamp((s - sGround) / H, 0, 1);
      const r = R * Math.pow(Math.sin(Math.PI * (0.1 + 0.8 * t)), 0.75);
      return Math.max(0.28 * R, r);
    };
    return this.finishStem(line, L, sGround, radius, {
      ribs: Math.max(8, Math.round(g.ribs)),
      sides: this.ribbedSides(R, Math.max(8, Math.round(g.ribs))),
      domeLen: 0.12 * H,
      arms: Math.max(0, Math.round(g.arms)),
      isBarrel: true,
    });
  }

  private finishStem(
    line: Line, L: number, sGround: number, radius: (s: number) => number,
    o: { ribs: number; sides: number; domeLen: number; arms: number; isBarrel: boolean },
  ): Organ {
    const g = this.g;
    const N = o.sides;
    const ribs = o.ribs;
    const Labove = L - sGround;
    // Areole stations along the stem, measured from the tip down.
    const zone = clamp(g.spineZone, 0, 1);
    const spacing = Math.max(0.008, g.areoleSpacing);
    const tipMargin = o.isBarrel ? 0.015 : Math.max(0.02, o.domeLen * 0.25);
    const sTop = L - tipMargin;
    const sBot = Math.max(sGround + 0.015, L - zone * Labove);
    const stations: number[] = [];
    for (let s = sTop - spacing * 0.5; s >= sBot; s -= spacing) stations.push(s);
    const children: Attachment[] = [];
    // Arms / pups first (priority), then the fruit ring, then the areoles.
    this.planArms(children, line, L, sGround, radius, N, o);
    this.planStemFruits(children, line, L, sGround, radius, N, ribs, o);
    const zones = this.zonesOf(children, spacing * 0.75 + 0.01);
    const openStations = stations.filter((st) => !this.inZones(st, zones));
    const openKeep = Math.ceil(openStations.length * ribs * clamp(g.spineDensity, 0, 1));
    this.planRibAreoles(children, openStations, ribs, openKeep, radius, N, line, L, 0);
    const crest = TAU / ribs;
    const felt = Math.max(0, g.areoleFelt);
    const ws = spacing * 0.24;
    const wa = crest * 0.2;
    const depth = clamp(g.ribDepth, 0, 0.45);
    const profile = (s: number, j: number, n: number): { x: number; y: number } => {
      const th = (TAU * j) / n;
      const rib = Math.tanh(1.8 * Math.cos(ribs * th)) / 0.9463;
      let r = radius(s) * (1 + depth * rib);
      if (felt > 0 && stations.length > 0) {
        const ds = nearestDist(stations, s);
        const da = Math.abs(th - Math.round(th / crest) * crest);
        if (ds < ws * 3 && da < wa * 3) r += felt * Math.exp(-Math.pow(ds / ws, 2)) * Math.exp(-Math.pow(da / wa, 2));
      }
      return { x: r * Math.cos(th), y: r * Math.sin(th) };
    };
    const extra = [sGround, L - o.domeLen, L - o.domeLen * 0.5, L - 0.004];
    return {
      level: 0, line, sStart: 0, profile, radius, round: true, extra,
      spacing: Math.max(1e-4, Labove / Math.max(8, Math.round(g.bodyRings))),
      children,
      wind: (_s, y) => ({ height: clamp(y / this.plantH, 0, 1), limb: 0, phase: 0, detail: 0 }),
      pivot: { x: 0, y: 0, z: 0 },
      r0: radius(L * 0.5),
    };
  }

  private planArms(
    children: Attachment[], line: Line, L: number, sGround: number,
    radius: (s: number) => number, N: number,
    o: { ribs: number; isBarrel: boolean },
  ): void {
    const g = this.g;
    const count = o.isBarrel ? Math.max(0, Math.round(g.arms)) : Math.max(0, Math.round(g.arms));
    if (count === 0) return;
    const Labove = L - sGround;
    const R = radius(sGround + 0.3 * Labove);
    // Pack the arms in the attach zone so their spans never overlap (which would
    // force planner shifts and stale areole exclusion zones).
    let zLo = sGround + clamp(Math.min(g.armFrom, g.armTo), 0, 0.95) * Labove;
    let zHi = sGround + clamp(Math.max(g.armFrom, g.armTo), 0.01, 0.97) * Labove;
    if (zHi - zLo < 0.05) zHi = zLo + 0.05;
    // Overfull zone: fall back to the whole valid stem so packed spans still fit.
    const needArm = count * 2 * Math.max(0.008, Math.max(0.03, R * Math.max(0.05, g.armRadius) * 2 * 0.62) / 2);
    if (zHi - zLo < needArm) {
      zLo = sGround + 0.05;
      zHi = L - 0.05;
    }
    for (let k = 0; k < count; k++) {
      const armR = Math.max(0.02, R * g.armRadius * (1 + 0.1 * this.armRng.uniform()));
      const armL = Math.max(0.15, g.armLength * (1 + g.armLengthV * this.armRng.uniform()));
      const armRibs = Math.max(6, Math.round(g.armRibs));
      const Na = armRibs * clamp(Math.round((TAU * armR) / armRibs / 0.02), 3, 5);
      // The window matches the arm's constricted base; the collar flare IS the joint.
      const side = Math.max(0.03, armR * 2 * 0.62);
      const hh = Math.max(0.008, side / 2);
      const lo = Math.max(1.7 * hh, zLo);
      const hi = Math.min(L - 1.7 * hh, zHi);
      const span = Math.max(2 * hh + 0.01, hi - lo);
      const s = (lo + hi) / 2 + (count > 1 ? ((k / (count - 1)) * 2 - 1) * (span / 2 - hh) * 0.96 : 0);
      const chord = (TAU * radius(clamp(s, 0, L))) / N;
      let w = clamp(Math.round(side / chord), 1, Na / 2 - 1);
      let h = Na / 2 - w;
      if (h < 1) {
        w = Na / 2 - 1;
        h = 1;
      }
      // Snap the azimuth to a rib crest: arms grow out of the ribs.
      const crest = TAU / o.ribs;
      const azRaw = k * GOLDEN + this.armRng.next() * 1.2;
      const az = Math.round(azRaw / crest) * crest;
      const phase = this.armRng.next();
      children.push({
        s, az, w, h, hh, pri: 0, spine: false, j0: 0, row0: 0, row1: 0,
        make: (exit) => this.makeArm(exit, armR, armL, armRibs, Na, phase),
      });
    }
  }

  private makeArm(exit: Exit, armR: number, armL: number, armRibs: number, Na: number, phase: number): Organ {
    const g = this.g;
    this.stats.arms++;
    const confluent = clamp(g.armOut, 0, armL * 0.7);
    const upturn = clamp(g.armCurve, 0, 120) * DEG2RAD;
    // Out of the rib, then bending up into a J.
    const out = normalize(addScaled(exit.normal, UP, 0.25));
    const dir0 = normalize(out);
    const right0 = normalize(cross(UP, exit.normal));
    const steps = Math.max(12, Math.round(armL / 0.08) * 2);
    const angleAt = (s: number): number => {
      if (s <= confluent || armL - confluent < 1e-6) return 0;
      // Gravity bends down; the arm bends up, hence negative.
      return -upturn * Math.pow((s - confluent) / (armL - confluent), 0.8);
    };
    const line = growLine(exit.pos, dir0, right0, armL, steps, (t0, t1) => ({ gravity: angleAt(t1 * armL) - angleAt(t0 * armL) }));
    const domeLen = Math.min(0.4 * armL, 2.4 * armR);
    const radius = (s: number): number => {
      const t = clamp(s / armL, 0, 1);
      // Constricted at the joint, like a real cactus arm.
      let r = armR * (0.62 + 0.38 * sstep(0, 0.22 * armL, s)) * (1 - 0.12 * t);
      if (s > armL - domeLen) {
        const u = clamp((s - (armL - domeLen)) / domeLen, 0, 1);
        r *= Math.pow(Math.cos((u * Math.PI) / 2), 0.65);
      }
      return Math.max(0.1 * armR, r);
    };
    const sStart = Math.min(0.3 * armL, Math.max(0.45 * exit.size, this.collarLen(armR)));
    const children: Attachment[] = [];
    if (g.fruits > 0) {
      const nf = Math.max(1, Math.round(g.fruits / 3));
      for (let k = 0; k < nf; k++) {
        const s = clamp(armL - domeLen * 0.9 - 0.04 - k * 0.035, sStart + 1.7 * 0.006, armL - 1.7 * 0.006);
        const crest = TAU / armRibs;
        const az = Math.round((k * GOLDEN + this.fruitRng.next()) / crest) * crest;
        children.push(this.fruitAttachment(s, az, 0.006));
      }
    }
    const zone = clamp(Math.max(g.spineZone, 0.18), 0, 1);
    const spacing = Math.max(0.008, g.areoleSpacing * 0.9);
    const tipMargin = Math.max(0.015, domeLen * 0.25);
    const aHH = Math.min(Math.max(0.008, g.areoleSpacing) * 0.3, 0.008);
    const zones = this.zonesOf(children, spacing * 0.75 + 0.01);
    const stations: number[] = [];
    const stHi = Math.min(armL - tipMargin - spacing * 0.5, armL - 1.7 * aHH);
    const stLo = Math.max(0.02, armL - zone * armL, sStart + 1.7 * aHH);
    for (let st = stHi; st >= stLo; st -= spacing) {
      if (!this.inZones(st, zones)) stations.push(st);
    }
    const nKeep = Math.ceil(stations.length * armRibs * clamp(g.spineDensity, 0, 1));
    this.planRibAreoles(children, stations, armRibs, nKeep, radius, Na, line, armL, 1);
    const crest = TAU / armRibs;
    const felt = Math.max(0, g.areoleFelt);
    const ws = spacing * 0.24;
    const wa = crest * 0.2;
    const depth = clamp(g.ribDepth, 0, 0.45);
    const profile = (s: number, j: number, n: number): { x: number; y: number } => {
      const th = (TAU * j) / n;
      const rib = Math.tanh(1.8 * Math.cos(armRibs * th)) / 0.9463;
      let r = radius(s) * (1 + depth * rib);
      if (felt > 0 && stations.length > 0) {
        const ds = nearestDist(stations, s);
        const da = Math.abs(th - Math.round(th / crest) * crest);
        if (ds < ws * 3 && da < wa * 3) r += felt * Math.exp(-Math.pow(ds / ws, 2)) * Math.exp(-Math.pow(da / wa, 2));
      }
      return { x: r * Math.cos(th), y: r * Math.sin(th) };
    };
    const pivot = exit.pos;
    return {
      level: 1, line,
      sStart,
      profile, radius, round: true,
      extra: [armL - domeLen, armL - domeLen * 0.5, armL - 0.004],
      spacing: Math.max(1e-4, armL / 40),
      children,
      wind: (s, y) => ({ height: clamp(y / this.plantH, 0, 1), limb: clamp(0.12 * (s / armL), 0, 1), phase, detail: 0 }),
      pivot,
      r0: armR,
    };
  }

  private planStemFruits(
    children: Attachment[], _line: Line, L: number, _sGround: number,
    _radius: (s: number) => number, _N: number, ribs: number,
    o: { domeLen: number; isBarrel: boolean },
  ): void {
    const g = this.g;
    const count = Math.max(0, Math.round(g.fruits));
    if (count === 0) return;
    const sF = o.isBarrel ? L - 0.16 * (L - 0) : L - o.domeLen * 0.9 - 0.06;
    const crest = TAU / ribs;
    for (let k = 0; k < count; k++) {
      const az = Math.round(((k / count) * TAU + this.fruitRng.uniform() * 0.2) / crest) * crest;
      const s = sF - (k % 2) * 0.03;
      children.push(this.fruitAttachment(s, az, 0.008));
    }
  }

  /** Areole cushions along rib crests; (s desc) priority keeps the tip spiny when thinned. */
  private planRibAreoles(
    children: Attachment[], stations: number[], ribs: number, nKeep: number,
    _radius: (s: number) => number, _N: number, _line: Line, _L: number, _level: number,
  ): void {
    const g = this.g;
    type Site = { s: number; az: number };
    const sites: Site[] = [];
    const crest = TAU / ribs;
    for (const s of stations) {
      const off = (Math.round(s / Math.max(1e-6, g.areoleSpacing)) % 2) * 0.5;
      for (let k = 0; k < ribs; k++) sites.push({ s, az: (k + off) * crest });
    }
    sites.sort((a, b) => b.s - a.s);
    const kept = sites.slice(0, Math.max(0, nKeep));
    const spacing = Math.max(0.008, g.areoleSpacing);
    for (let i = 0; i < kept.length; i++) {
      const st = kept[i];
      // Upper areoles keep full spines; lower ones keep only felt (and glochids on pads).
      const rank = i / Math.max(1, kept.length);
      const spiny = rank < clamp(g.spineDensity, 0, 1) || kept.length <= 1 ? true : rank < clamp(g.spineDensity, 0, 1);
      const hasGlochids = g.glochids > 0;
      if (!spiny && !hasGlochids) continue;
      const T = (spiny ? this.spineTotal() : 0) + (hasGlochids ? Math.round(g.glochids) : 0);
      if (T === 0) continue;
      const win = T <= 4 ? { w: 1, h: 1 } : T <= 6 ? { w: 1, h: 2 } : { w: 2, h: 2 };
      const hh = Math.min(spacing * 0.3, 0.008);
      children.push({
        s: st.s, az: st.az, w: win.w, h: win.h, hh, pri: 1, spine: false, j0: 0, row0: 0, row1: 0,
        make: (exit) => this.makeCushion(exit, spiny, hasGlochids),
      });
    }
  }

  private spineTotal(): number {
    const g = this.g;
    const radials = Math.max(0, Math.round(g.spinesPer));
    const central = g.centralSpine > 0 ? 1 : 0;
    return Math.min(8, radials + central);
  }

  // ---------------------------------------------------------------------------
  // Areole cushions, spines, fruits
  // ---------------------------------------------------------------------------

  private makeCushion(exit: Exit, spiny: boolean, glochids: boolean): Organ {
    const g = this.g;
    interface Spec { len: number; rad: number; angle: number; hook: number; glochid: boolean }
    const specs: Spec[] = [];
    if (spiny) {
      const radials = Math.max(0, Math.round(g.spinesPer));
      for (let k = 0; k < radials && specs.length < 8; k++) {
        specs.push({
          len: Math.max(0.004, g.spineLength * (1 + g.spineLengthV * this.spineRng.uniform())),
          rad: Math.max(0.0002, g.spineRadius * (1 + 0.2 * this.spineRng.uniform())),
          angle: (g.spineAngle + 12 * this.spineRng.uniform()) * DEG2RAD,
          hook: g.spineCurve * 0.35 * DEG2RAD,
          glochid: false,
        });
      }
      if (g.centralSpine > 0 && specs.length < 8) {
        specs.push({
          len: Math.max(0.006, g.spineLength * g.centralSpine * (1 + 0.15 * this.spineRng.uniform())),
          rad: Math.max(0.0002, g.spineRadius * 1.25),
          angle: 8 * DEG2RAD,
          hook: g.spineCurve * DEG2RAD,
          glochid: false,
        });
      }
    }
    if (glochids) {
      for (let k = 0; k < Math.round(g.glochids) && specs.length < 8; k++) {
        specs.push({
          len: Math.max(0.0015, g.glochidLength * (1 + 0.3 * this.spineRng.uniform())),
          rad: 0.00028,
          angle: (22 + 10 * this.spineRng.next()) * DEG2RAD,
          hook: 0,
          glochid: true,
        });
      }
    }
    const N = exit.N;
    const perBand = Math.max(1, Math.floor(N / 2));
    const bands = Math.max(1, Math.ceil(specs.length / perBand));
    const Lc = 0.0022 + bands * 0.0018;
    const dir0 = exit.normal;
    let right0 = cross(exit.dir, exit.normal);
    right0 = lengthSq(right0) < 1e-10 ? { x: 1, y: 0, z: 0 } : normalize(right0);
    const line = growLine(exit.pos, dir0, right0, Lc, 4, () => ({}));
    const rBase = Math.max(0.0012, exit.size * 0.36);
    const rTop = Math.max(0.0012, Math.min(0.0035, exit.size * 0.16));
    const radius = (s: number): number => {
      const t = clamp(s / Lc, 0, 1);
      return lerp1(rBase, rTop, sstep(0, 0.45, t)) * (1 - 0.3 * sstep(0.6, 1, t));
    };
    const children: Attachment[] = [];
    const sStart = Math.min(0.3 * Lc, Math.max(0.4 * exit.size, 0.0008));
    const bandH = (Lc - sStart - 0.0008) / bands;
    const hh = Math.max(0.0004, bandH * 0.3);
    specs.forEach((sp, i) => {
      const b = Math.floor(i / perBand);
      const m = i % perBand;
      const col = (2 * m + (b % 2)) % N;
      const s = sStart + 0.0008 + (b + 0.5) * bandH;
      const az = ((col + 0.5) * TAU) / N;
      children.push({
        s, az, w: 1, h: 1, hh, pri: 2, spine: true, j0: 0, row0: 0, row1: 0,
        make: (ex) => this.makeSpine(ex, sp),
      });
    });
    const pivot = exit.pos;
    return {
      level: 2, line, sStart,
      profile: (s, j, n) => {
        const r = radius(s);
        const th = (TAU * j) / n;
        return { x: r * Math.cos(th), y: r * Math.sin(th) };
      },
      radius, round: true,
      extra: [Lc * 0.45, Lc * 0.7],
      spacing: Math.max(1e-5, Lc / 4),
      children,
      wind: (_s, y) => ({ height: clamp(y / this.plantH, 0, 1), limb: 0, phase: 0, detail: 0 }),
      pivot,
      r0: rTop,
    };
  }

  private makeSpine(exit: Exit, sp: { len: number; rad: number; angle: number; hook: number; glochid: boolean }): Organ {
    const g = this.g;
    this.stats.spines++;
    const L = Math.max(0.0015, sp.len);
    const dir0 = normalize(add(scale(exit.normal, Math.cos(sp.angle)), scale(exit.dir, Math.sin(sp.angle))));
    // Random hook plane per spine.
    let right0 = cross(dir0, Math.abs(dir0.y) < 0.9 ? UP : { x: 1, y: 0, z: 0 });
    right0 = normalize(rotateAxis(right0, dir0, this.spineRng.next() * TAU));
    const hook = sp.hook * (0.7 + 0.6 * this.spineRng.next());
    const segs = Math.max(1, Math.round(g.spineRings));
    const line = growLine(exit.pos, dir0, right0, L, segs * 2 + 2, (t0, t1) => ({ pitch: hook * (t1 - t0) }));
    const R = sp.rad;
    const sheath = sp.glochid ? 0 : clamp(g.sheath, 0, 1.5);
    const radius = (s: number): number => {
      let r = R * (1 - 0.72 * (s / L));
      if (sheath > 0) r += R * sheath * Math.exp(-Math.pow(s / (0.0018 + 0.1 * L), 2));
      return Math.max(0.00012, r);
    };
    const pivot = exit.pos;
    return {
      level: 2, line,
      sStart: Math.min(0.3 * L, Math.max(0.4 * exit.size, this.collarLen(R))),
      profile: (s, j, n) => {
        const r = radius(s);
        const th = (TAU * j) / n;
        return { x: r * Math.cos(th), y: r * Math.sin(th) };
      },
      radius, round: true,
      extra: [L - 0.4 * R],
      spacing: Math.max(1e-5, L / segs),
      children: [],
      wind: (_s, y) => ({ height: clamp(y / this.plantH, 0, 1), limb: 0, phase: 0, detail: 0 }),
      pivot,
      r0: R,
    };
  }

  private fruitAttachment(s: number, az: number, hh: number): Attachment {
    return {
      s, az, w: 1, h: 2, hh, pri: 0, spine: false, j0: 0, row0: 0, row1: 0,
      make: (exit) => this.makeFruit(exit, false),
    };
  }

  /** A fruit (tuna, barrel apple), agave bud or ocotillo flower torch. */
  private makeFruit(exit: Exit, flower: boolean): Organ {
    const g = this.g;
    this.stats.fruits++;
    const L = flower ? Math.max(0.01, g.flowerLength) : Math.max(0.012, g.fruitLength);
    const R = flower ? Math.max(0.002, g.flowerRadius) : Math.max(0.004, g.fruitRadius);
    const tilt = flower ? 12 * DEG2RAD : 32 * DEG2RAD;
    const dir0 = normalize(add(scale(exit.normal, Math.cos(tilt)), scale(exit.dir, Math.sin(tilt))));
    let right0 = cross(exit.dir, exit.normal);
    right0 = lengthSq(right0) < 1e-10 ? { x: 1, y: 0, z: 0 } : normalize(right0);
    const line = growLine(exit.pos, dir0, right0, L, 8, (t0, t1) => ({ gravity: (flower ? 4 : 14) * DEG2RAD * (t1 - t0) }));
    const radius = (s: number): number => {
      const t = clamp(s / L, 0, 1);
      if (flower) return Math.max(0.0012, R * (0.55 + 0.6 * t) * (1 - 0.25 * sstep(0.8, 1, t)));
      const body = 0.4 + 0.6 * Math.pow(Math.sin(Math.PI * clamp(t, 0.02, 0.98)), 0.7);
      return Math.max(0.0012, R * body * (1 - 0.55 * sstep(0.88, 1, t)));
    };
    const pivot = exit.pos;
    return {
      level: 2, line,
      sStart: Math.min(0.3 * L, Math.max(0.4 * exit.size, this.collarLen(R))),
      profile: (s, j, n) => {
        const r = radius(s);
        const th = (TAU * j) / n;
        return { x: r * Math.cos(th), y: r * Math.sin(th) };
      },
      radius, round: true,
      extra: [L * 0.55, L * 0.88],
      spacing: Math.max(1e-5, L / 5),
      children: [],
      wind: (_s, y) => ({ height: clamp(y / this.plantH, 0, 1), limb: 0, phase: 0, detail: 0 }),
      pivot,
      r0: R,
    };
  }

  // ---------------------------------------------------------------------------
  // Pads (prickly pear & cholla)
  // ---------------------------------------------------------------------------

  /**
   * A pad (flat cladode) or cholla segment (round). `depth` counts branching
   * generations; `trunk` counts the stacked trunk pads still to grow (the very
   * first pad is the root organ and starts below ground).
   */
  private makePad(depth: number, trunk: number, exit: Exit | null): Organ {
    const g = this.g;
    this.stats.pads++;
    const round = clamp(g.padRound, 0, 1) > 0.5;
    const N = round ? Math.max(8, Math.round(g.padSides / 2.4)) : Math.max(12, Math.round(g.padSides));
    const baseLen = Math.max(0.05, g.padLength * (1 - 0.05 * depth) * (1 + g.padLengthV * this.padRng.uniform()));
    const W = Math.max(0.02, g.padWidth * (1 - 0.06 * depth) * (1 + 0.12 * this.padRng.uniform()));
    const Th = round ? W : Math.max(0.012, g.padThick * (1 + 0.15 * this.padRng.uniform()));
    const L = trunk > 0 && exit === null ? baseLen + 0.06 : baseLen;
    let line: Line;
    if (exit === null) {
      // Trunk base: rises out of the soil.
      this.groundDepth = Math.max(this.groundDepth, 0.06);
      const lean = 4 * DEG2RAD * this.padRng.uniform();
      const dir0 = normalize(add(scale(UP, Math.cos(lean)), scale({ x: 1, y: 0, z: 0 }, Math.sin(lean))));
      line = growLine({ x: 0, y: -0.06, z: 0 }, dir0, { x: 0, y: 0, z: 1 }, L, 12, () => ({}));
    } else {
      const A = (g.padAngle + g.padAngleV * this.padRng.uniform()) * DEG2RAD;
      const dir0 = normalize(add(scale(exit.dir, Math.cos(A)), scale(exit.normal, Math.sin(A))));
      let right0 = cross(exit.dir, exit.normal);
      right0 = lengthSq(right0) < 1e-10 ? { x: 1, y: 0, z: 0 } : normalize(right0);
      const twist = g.padTwist * DEG2RAD * this.padRng.uniform();
      right0 = rotateAxis(right0, dir0, twist);
      const droop = (g.padDroop + 8 * this.padRng.uniform()) * DEG2RAD;
      line = growLine(exit.pos, dir0, right0, L, 14, (t0, t1) => ({ gravity: droop * (t1 - t0) }));
    }
    const a0 = W / 2;
    const b0 = Th / 2;
    // Tubercle rows for cholla (diamond pattern).
    const spacing = Math.max(0.008, g.areoleSpacing);
    const tubStations: number[] = [];
    if (round) for (let s = L - 0.012; s > 0.015; s -= spacing) tubStations.push(s);
    const profile = (s: number, j: number, n: number): { x: number; y: number } => {
      const t = clamp(s / L, 0, 1);
      const wBase = 0.34 + 0.66 * sstep(0, 0.3, t);
      const wTop = t <= 0.45 ? 1 : Math.sqrt(Math.max(0.02, 1 - Math.pow((t - 0.45) / 0.55, 2)));
      const th = (TAU * j) / n;
      if (round) {
        let r = a0 * wBase * (t <= 0.8 ? 1 : 0.25 + 0.75 * Math.cos(((t - 0.8) / 0.2) * Math.PI * 0.5));
        if (tubStations.length > 0) {
          const k = nearestIndexOf(tubStations, s);
          const ds = Math.abs(tubStations[k] - s);
          const cols = 4;
          const cs = TAU / cols;
          const off = (k % 2) * (Math.PI / cols);
          const da = Math.abs(th - off - Math.round((th - off) / cs) * cs);
          const ws2 = spacing * 0.3;
          const wa2 = cs * 0.22;
          if (ds < ws2 * 2.5 && da < wa2 * 2.5) {
            r += Math.min(0.0022, 0.1 * a0) * Math.exp(-Math.pow(ds / ws2, 2)) * Math.exp(-Math.pow(da / wa2, 2));
          }
        }
        return { x: Math.max(0.0012, r) * Math.cos(th), y: Math.max(0.0012, r) * Math.sin(th) };
      }
      const a = Math.max(0.0012, a0 * wBase * wTop);
      const b = Math.max(0.001, b0 * (0.5 + 0.5 * sstep(0, 0.25, t)) * (t <= 0.5 ? 1 : Math.sqrt(Math.max(0.03, 1 - Math.pow((t - 0.5) / 0.5, 2)))));
      return { x: a * spow(Math.cos(th), 0.62), y: b * spow(Math.sin(th), 0.62) };
    };
    const radius = (s: number): number => {
      const t = clamp(s / L, 0, 1);
      const wBase = 0.34 + 0.66 * sstep(0, 0.3, t);
      return round ? Math.max(0.0012, a0 * wBase) : Math.max(0.0012, a0 * wBase * 0.8);
    };
    const children: Attachment[] = [];
    const maxDepth = Math.max(0, Math.round(g.padDepth));
    const per = Math.max(0, Math.round(g.padsPerPad));
    const sStart = exit === null ? 0 : Math.min(0.3 * L, Math.max(0.4 * exit.size, this.collarLen(a0 * 0.4)));
    const chh = round ? 0.008 : 0.025;
    // Centres must clear both ends; small pads grow fewer children rather than
    // overlapping seeds the planner cannot separate.
    const loC = sStart + 1.7 * chh + 0.002;
    const hiC = L - 1.7 * chh - 0.002;
    if (trunk > 1) {
      // Next trunk pad stacked on the rim near the tip.
      const az = (trunk % 2) * Math.PI + 0.2 * this.padRng.uniform();
      if (hiC > loC) children.push(this.padChildAttachment(clamp(L * 0.86, loC, hiC), az, N, round, 0, trunk - 1));
    } else if (depth < maxDepth) {
      const maxFit = hiC > loC ? Math.floor((hiC - loC) / (2 * chh)) + 1 : 0;
      const perEff = Math.min(per, Math.max(0, maxFit));
      for (let k = 0; k < perEff; k++) {
        const s = perEff > 1 ? loC + (k / (perEff - 1)) * (hiC - loC) : (loC + hiC) / 2;
        const az = round
          ? (k / Math.max(1, perEff)) * TAU + this.padRng.uniform() * 0.6
          : (k % 2) * Math.PI + this.padRng.uniform() * 0.45;
        children.push(this.padChildAttachment(s, az, N, round, depth + 1, 0));
      }
    } else if (depth >= maxDepth && g.fruits > 0 && !round) {
      // Tunas on the rim of the terminal pads.
      const nf = Math.max(0, Math.round(g.fruits));
      for (let k = 0; k < nf; k++) {
        const s = L * (0.72 + 0.16 * ((k + 0.5) / Math.max(1, nf)));
        const az = (k % 2) * Math.PI + this.fruitRng.uniform() * 0.3;
        children.push(this.fruitAttachment(s, az, 0.006));
      }
    }
    const zones = this.zonesOf(children, spacing * 0.75 + 0.008);
    this.planPadAreoles(children, L, N, round, depth, zones, sStart);
    const pivot = exit ? exit.pos : { x: 0, y: 0, z: 0 };
    const phase = this.padRng.next();
    return {
      level: depth === 0 && trunk > 0 ? 0 : 1,
      line,
      sStart,
      profile, radius, round,
      extra: round ? [L * 0.25, L * 0.8, L - 0.003] : [L * 0.3, L * 0.45, L * 0.7, L - 0.003],
      spacing: Math.max(1e-4, L / 22),
      children,
      wind: (s, y) => ({
        height: clamp(y / this.plantH, 0, 1),
        limb: depth === 0 && trunk > 0 ? 0 : clamp(0.1 * (s / L), 0, 1),
        phase, detail: 0,
      }),
      pivot,
      r0: a0 * 0.4,
    };
  }

  private padChildAttachment(s: number, az: number, Nchild: number, round: boolean, depth: number, trunk: number): Attachment {
    let w = 2;
    let h = Nchild / 2 - w;
    if (h < 1) {
      w = 1;
      h = Nchild / 2 - 1;
    }
    if (round) {
      w = 2;
      h = 2;
    }
    const hh = round ? 0.008 : 0.025;
    return {
      s, az, w, h, hh, pri: 0, spine: false, j0: 0, row0: 0, row1: 0,
      make: (exit) => this.makePad(depth, trunk, exit),
    };
  }

  private planPadAreoles(children: Attachment[], L: number, N: number, round: boolean, _depth: number, zones: { s0: number; s1: number }[], sStart: number): void {
    const g = this.g;
    const spacing = Math.max(0.008, g.areoleSpacing);
    type Site = { s: number; az: number };
    const sites: Site[] = [];
    const aHH = Math.min(spacing * 0.3, 0.006);
    if (round) {
      const cols = 4;
      let row = 0;
      for (let s = Math.min(L - 0.012, L - 1.7 * aHH); s > Math.max(0.02, sStart + 1.7 * aHH); s -= spacing, row++) {
        for (let c = 0; c < cols; c++) sites.push({ s, az: ((c + (row % 2) * 0.5) / cols) * TAU });
      }
    } else {
      // A grid of areoles on each face of the cladode.
      const faceCols = [N / 4 - 1, N / 4, N / 4 + 1, (3 * N) / 4 - 1, (3 * N) / 4, (3 * N) / 4 + 1];
      for (let s = Math.min(L * 0.88, L - 1.7 * aHH); s > Math.max(L * 0.14, sStart + 1.7 * aHH); s -= spacing) {
        for (const c of faceCols) sites.push({ s, az: ((c + 0.5) / N) * TAU });
      }
    }
    sites.sort((a, b) => b.s - a.s);
    const open = sites.filter((st) => !this.inZones(st.s, zones));
    const nTotal = Math.ceil(open.length * clamp(g.spineZone, 0, 1));
    const zoned = open.slice(0, Math.max(0, nTotal));
    for (let i = 0; i < zoned.length; i++) {
      const st = zoned[i];
      const rank = i / Math.max(1, zoned.length);
      const spiny = rank < clamp(g.spineDensity, 0, 1);
      const hasGlochids = g.glochids > 0;
      if (!spiny && !hasGlochids) continue;
      const T = (spiny ? this.spineTotal() : 0) + (hasGlochids ? Math.round(g.glochids) : 0);
      if (T === 0) continue;
      const win = round || T <= 6 ? { w: 1, h: 2 } : { w: 2, h: 2 };
      children.push({
        s: st.s, az: st.az, w: win.w, h: win.h, hh: Math.min(spacing * 0.3, 0.006),
        pri: 1, spine: false, j0: 0, row0: 0, row1: 0,
        make: (exit) => this.makeCushion(exit, spiny, hasGlochids),
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Basal column clusters (organ pipe): a buried crown dome with ribbed columns
  // ---------------------------------------------------------------------------

  private meshColumnCluster(): void {
    const g = this.g;
    const mesh = this.mesh;
    const arms = Math.max(8, Math.round(g.arms));
    const armR = Math.max(0.04, g.bodyRadius * g.armRadius);
    const armRibs = Math.max(6, Math.round(g.armRibs));
    const Na = armRibs * 4;
    const side = Na / 4; // square window: 2(side + side) = Na
    const R = clamp(0.11 * Math.sqrt(arms), 0.3, 0.6);
    const H = 0.1;
    const sink = 0.02;
    const prof = 2.5;
    const pitch = side + 1;
    const S = Math.max(3, Math.ceil(Math.sqrt((arms * 1.18) / 0.7)));
    const K = S * pitch + 2;
    const cell = (2 * R) / K;

    const domePoint = (u01: number, v01: number): V3 => {
      const u = 2 * u01 - 1;
      const v = 2 * v01 - 1;
      const x = u * Math.sqrt(Math.max(0, 1 - (v * v) / 2));
      const z = v * Math.sqrt(Math.max(0, 1 - (u * u) / 2));
      const r = Math.min(1, Math.sqrt(x * x + z * z));
      return { x: R * x, y: -sink + H * (1 - Math.pow(r, prof)), z: R * z };
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
    interface CrownWindow { a0: number; b0: number; w: number; h: number; make: (exit: Exit) => Organ }
    const windows: CrownWindow[] = [];
    const free: Site[] = [];
    for (const row of sites) for (const st of row) if (st.free) free.push(st);
    free.sort((a, b) => a.r - b.r);
    const nCols = Math.min(arms, free.length);
    if (nCols < arms) this.drop('no room on crown', arms - nCols);
    for (let n = 0; n < nCols; n++) {
      const st = free[n];
      st.free = false;
      const rFrac = clamp(st.r / 0.955, 0, 1);
      const colH = Math.max(0.5, g.height * (1.02 - 0.22 * rFrac) * (1 + 0.08 * this.armRng.uniform()));
      const colR = armR * (1 + 0.12 * this.armRng.uniform());
      const lean = (3 + 9 * rFrac + 3 * this.armRng.uniform()) * DEG2RAD;
      const leanAz = st.az + this.armRng.uniform() * 0.4;
      const phase = this.armRng.next();
      windows.push({
        a0: 1 + st.i * pitch + Math.floor((pitch - side) / 2),
        b0: 1 + st.k * pitch + Math.floor((pitch - side) / 2),
        w: side, h: side,
        make: (exit) => this.makeClusterColumn(exit, colR, colH, armRibs, lean, leanAz, phase),
      });
    }
    this.stats.arms += nCols;

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
        vid[a * (K + 1) + b] = mesh.addVertex(p.x, p.y, p.z, still, origin, 0, 0);
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
    const depth = Math.max(0.06, 0.4 * R);
    this.groundDepth = sink + depth;
    const rim: number[] = [];
    for (let a = 0; a < K; a++) rim.push(V(a, K));
    for (let b = K; b > 0; b--) rim.push(V(K, b));
    for (let a = K; a > 0; a--) rim.push(V(a, 0));
    for (let b = 0; b < K; b++) rim.push(V(0, b));
    const below: number[] = [];
    for (const v of rim) below.push(mesh.addVertex(mesh.positions[v * 3] * 0.8, -sink - depth, mesh.positions[v * 3 + 2] * 0.8, still, origin, 0, 0));
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
      const exit: Exit = { pos: domePoint(uc, vc), normal: domeNormal(uc, vc), dir: { x: 0, y: 1, z: 0 }, size: Math.max(w, h) * cell, N: loop.length };
      this.meshTube(win.make(exit), loop, exit);
    }
  }

  /** One ribbed column of a basal cluster: straight up with an outward lean, spiny crown. */
  private makeClusterColumn(exit: Exit, colR: number, colH: number, colRibs: number, lean: number, leanAz: number, phase: number): Organ {
    const g = this.g;
    const A = { x: Math.cos(leanAz), y: 0, z: Math.sin(leanAz) };
    const dir0 = normalize(add(scale(UP, Math.cos(lean)), scale(A, Math.sin(lean))));
    const right0 = normalize(cross(UP, A));
    const curve = (g.curve + 4 * this.armRng.uniform()) * DEG2RAD;
    const steps = Math.max(16, Math.round(g.bodyRings));
    const line = growLine(exit.pos, dir0, right0, colH, steps, (t0, t1) => ({
      gravity: curve * (Math.pow(t1, 1.3) - Math.pow(t0, 1.3)),
    }));
    const domeLen = Math.min(0.3 * colH, 2.6 * colR);
    const radius = (s: number): number => {
      const t = clamp(s / colH, 0, 1);
      let r = colR * (0.66 + 0.34 * sstep(0, 0.2 * colH, s)) * (1 - 0.1 * t);
      if (s > colH - domeLen) {
        const u = clamp((s - (colH - domeLen)) / domeLen, 0, 1);
        r *= Math.pow(Math.cos((u * Math.PI) / 2), 0.65);
      }
      return Math.max(0.12 * colR, r);
    };
    const children: Attachment[] = [];
    const zone = clamp(g.spineZone, 0, 1);
    const spacing = Math.max(0.008, g.areoleSpacing);
    const tipMargin = Math.max(0.015, domeLen * 0.25);
    const stations: number[] = [];
    for (let s = colH - tipMargin - spacing * 0.5; s >= Math.max(0.02, colH - zone * colH); s -= spacing) stations.push(s);
    const nKeep = Math.ceil(stations.length * colRibs * clamp(g.spineDensity, 0, 1));
    this.planRibAreoles(children, stations, colRibs, nKeep, radius, exit.N, line, colH, 1);
    const crest = TAU / colRibs;
    const felt = Math.max(0, g.areoleFelt);
    const ws = spacing * 0.24;
    const wa = crest * 0.2;
    const rdepth = clamp(g.ribDepth, 0, 0.45);
    const profile = (s: number, j: number, n: number): { x: number; y: number } => {
      const th = (TAU * j) / n;
      const rib = Math.tanh(1.8 * Math.cos(colRibs * th)) / 0.9463;
      let r = radius(s) * (1 + rdepth * rib);
      if (felt > 0 && stations.length > 0) {
        const ds = nearestDist(stations, s);
        const da = Math.abs(th - Math.round(th / crest) * crest);
        if (ds < ws * 3 && da < wa * 3) r += felt * Math.exp(-Math.pow(ds / ws, 2)) * Math.exp(-Math.pow(da / wa, 2));
      }
      return { x: r * Math.cos(th), y: r * Math.sin(th) };
    };
    const pivot = exit.pos;
    return {
      level: 1, line,
      sStart: Math.min(0.3 * colH, Math.max(0.4 * exit.size, this.collarLen(colR))),
      profile, radius, round: true,
      extra: [colH - domeLen, colH - domeLen * 0.5, colH - 0.004],
      spacing: Math.max(1e-4, colH / Math.max(8, Math.round(g.bodyRings))),
      children,
      wind: (s, y) => ({ height: clamp(y / this.plantH, 0, 1), limb: clamp(0.1 * (s / colH), 0, 1), phase, detail: 0 }),
      pivot,
      r0: colR,
    };
  }

  // ---------------------------------------------------------------------------
  // Rosette crown & leaves
  // ---------------------------------------------------------------------------

  private meshRosetteCrown(): void {
    const g = this.g;
    const mesh = this.mesh;
    const R = Math.max(0.02, g.crownRadius);
    const H = Math.max(0, g.crownHeight);
    const sink = 0.008;
    const prof = 2.2;
    const leafN = clamp(Math.round(g.leafSides / 2) * 2, 8, 16);
    const lw = windowFor(leafN);
    const pitch = Math.max(lw.w, lw.h) + 1;
    const leaves = Math.max(1, Math.round(g.leaves));
    const need = leaves + (g.stalk ? 4 : 0);
    const S = Math.max(3, Math.ceil(Math.sqrt((Math.max(1, need) * 1.18) / 0.7)));
    const K = S * pitch + 2;
    const cell = (2 * R) / K;

    const domePoint = (u01: number, v01: number): V3 => {
      const u = 2 * u01 - 1;
      const v = 2 * v01 - 1;
      const x = u * Math.sqrt(Math.max(0, 1 - (v * v) / 2));
      const z = v * Math.sqrt(Math.max(0, 1 - (u * u) / 2));
      const r = Math.min(1, Math.sqrt(x * x + z * z));
      return { x: R * x, y: -sink + H * (1 - Math.pow(r, prof)), z: R * z };
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
    // Reserve the centre for the flower stalk.
    if (g.stalk) {
      for (const row of sites) for (const s of row) if (s.r < 0.3) s.free = false;
    }
    interface CrownWindow { a0: number; b0: number; w: number; h: number; make: (exit: Exit) => Organ }
    const windows: CrownWindow[] = [];
    const free: Site[] = [];
    for (const row of sites) for (const s of row) if (s.free) free.push(s);
    // Phyllotactic assignment: inner sites become upright young leaves, rim sites the spreading elders.
    free.sort((a, b) => a.r - b.r);
    const nLeaves = Math.min(leaves, free.length);
    if (nLeaves < leaves) this.drop('no room on crown', leaves - nLeaves);
    // Interleave so neighbouring leaves differ in age (golden-angle feeling): take sites in
    // radius order but assign the leaf spiral by striding.
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
      const lean = (12 + (g.rosetteSpread - 12) * Math.pow(rFrac, 0.8) + 6 * rb.uniform()) * DEG2RAD;
      const vals = {
        az,
        lean,
        length: Math.max(0.02, g.leafLength * (0.72 + 0.38 * rFrac) * (1 + g.leafLengthV * rb.uniform())),
        width: Math.max(0.008, g.leafWidth * (0.85 + 0.3 * rFrac) * (1 + 0.1 * rb.uniform())),
        phase: rb.next(),
      };
      windows.push({
        a0: 1 + s.i * pitch + Math.floor((pitch - lw.w) / 2),
        b0: 1 + s.k * pitch + Math.floor((pitch - lw.h) / 2),
        w: lw.w, h: lw.h,
        make: (exit) => this.makeLeaf(exit, vals),
      });
    }
    if (g.stalk) {
      const sw = { w: 2, h: 3 };
      const a0 = Math.floor((K - sw.w) / 2);
      const b0 = Math.floor((K - sw.h) / 2);
      windows.push({ a0, b0, w: sw.w, h: sw.h, make: (exit) => this.makeStalk(exit) });
    }

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
        vid[a * (K + 1) + b] = mesh.addVertex(p.x, p.y, p.z, still, origin, 0, 0);
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
    const depth = Math.max(0.02, 0.4 * R);
    this.groundDepth = sink + depth;
    const rim: number[] = [];
    for (let a = 0; a < K; a++) rim.push(V(a, K));
    for (let b = K; b > 0; b--) rim.push(V(K, b));
    for (let a = K; a > 0; a--) rim.push(V(a, 0));
    for (let b = 0; b < K; b++) rim.push(V(0, b));
    const below: number[] = [];
    for (const v of rim) below.push(mesh.addVertex(mesh.positions[v * 3] * 0.8, -sink - depth, mesh.positions[v * 3 + 2] * 0.8, still, origin, 0, 0));
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
      const exit: Exit = { pos: domePoint(uc, vc), normal: domeNormal(uc, vc), dir: { x: 0, y: 1, z: 0 }, size: Math.max(w, h) * cell, N: loop.length };
      this.meshTube(win.make(exit), loop, exit);
    }
  }

  private makeLeaf(exit: Exit, o: { az: number; lean: number; length: number; width: number; phase: number }): Organ {
    const g = this.g;
    this.stats.leaves++;
    const Lleaf = o.length;
    const Lsp = Math.max(0.002, g.terminalSpine);
    const L = Lleaf + Lsp;
    const A = { x: Math.cos(o.az), y: 0, z: Math.sin(o.az) };
    const dir0 = normalize(add(scale(UP, Math.cos(o.lean)), scale(A, Math.sin(o.lean))));
    const right0 = normalize(cross(UP, A));
    const droop = (g.leafCurve + 10 * this.leafRng.uniform()) * DEG2RAD;
    const steps = Math.max(10, Math.round(g.leafRings));
    const line = growLine(exit.pos, dir0, right0, L, steps, (t0, t1) => ({
      gravity: droop * (Math.pow(t1, 1.5) - Math.pow(t0, 1.5)),
    }));
    const keel = clamp(g.leafKeel, 0, 1);
    const teeth = Math.max(0, g.teeth);
    const nTeeth = Math.max(0, Math.round(g.teethPerSide));
    const sStart = Math.min(0.3 * L, Math.max(1.4 * o.width * 0.3, 1.0 * exit.size, this.collarLen(o.width * 0.2)));
    const N = exit.N;
    const m = N / 2;
    const widthAt = (s: number): number => {
      if (s >= Lleaf) {
        const u = (s - Lleaf) / Lsp;
        return Math.max(0.0008, 0.004 * (1 - u) + 0.0008);
      }
      const t = clamp(s / Lleaf, 0, 1);
      return o.width * (0.3 + 0.7 * sstep(0, 0.25, t)) * (1 - Math.pow(sstep(0.35, 1, t), 1.2) * 0.965);
    };
    const thickAt = (s: number): number => {
      if (s >= Lleaf) {
        const u = (s - Lleaf) / Lsp;
        return Math.max(0.0008, 0.0035 * (1 - u) + 0.0008);
      }
      const t = clamp(s / Lleaf, 0, 1);
      return g.leafThick * (0.5 + 0.5 * sstep(0, 0.2, t)) * (1 - sstep(0.4, 1, t) * 0.9);
    };
    const toothAt = (s: number): number => {
      if (teeth <= 0.0004 || nTeeth === 0 || s >= Lleaf) return 0;
      const t = s / Lleaf;
      if (t < 0.1 || t > 0.92) return 0;
      const ph = ((t - 0.12) / 0.68) * nTeeth;
      const tri = 1 - Math.abs((ph - Math.floor(ph)) * 2 - 1);
      const env = sstep(0.1, 0.2, t) * (1 - sstep(0.75, 0.9, t));
      return teeth * Math.pow(Math.max(0, tri), 0.7) * env;
    };
    const profile = (s: number, j: number, n: number): { x: number; y: number } => {
      const inSpine = s >= Lleaf;
      const q = bladePoint(n, j, widthAt(s), thickAt(s), inSpine ? 0 : keel, 0);
      const tooth = toothAt(s);
      if (tooth > 0) {
        // Margin vertices: j = 0 (right edge) and j = m (left edge), plus their undersides.
        let u = 0;
        if (j <= m) u = 1 - (2 * j) / m;
        else u = -1 + (2 * (j - m)) / m;
        if (Math.abs(u) > 0.99) {
          return { x: q.x + Math.sign(u) * tooth, y: q.y + tooth * 0.35 };
        }
      }
      return q;
    };
    const extra: number[] = [Lleaf, Lleaf + Lsp * 0.5, L - 0.001];
    if (teeth > 0.0004 && nTeeth > 0) {
      for (let k = 0; k <= nTeeth; k++) {
        const t = 0.12 + (0.68 * k) / nTeeth;
        extra.push(t * Lleaf, (t + 0.68 / nTeeth / 2) * Lleaf);
      }
    }
    const pivot = exit.pos;
    return {
      level: 1, line, sStart, profile,
      radius: (s) => 0.5 * widthAt(s),
      round: false,
      extra,
      spacing: Math.max(1e-4, L / Math.max(8, Math.round(g.leafRings))),
      children: [],
      wind: (s, y) => ({
        height: clamp(y / this.plantH, 0, 1),
        limb: clamp(0.06 * (s / L), 0, 1), phase: o.phase,
        detail: clamp((s / L - 0.7) / 0.3, 0, 1) * 0.06,
      }),
      pivot,
      r0: o.width * 0.2,
    };
  }

  private makeStalk(exit: Exit): Organ {
    const g = this.g;
    const L = Math.max(1, g.stalkHeight);
    const R = Math.max(0.015, g.stalkRadius);
    const lean = 3 * DEG2RAD * this.bodyRng.uniform();
    const dir0 = normalize(add(scale(UP, Math.cos(lean)), scale({ x: 1, y: 0, z: 0 }, Math.sin(lean))));
    const line = growLine(exit.pos, dir0, { x: 0, y: 0, z: 1 }, L, 30, (t0, t1) => ({
      gravity: 6 * DEG2RAD * (t1 - t0),
      yaw: 2 * DEG2RAD * (Math.sin(TAU * t1) - Math.sin(TAU * t0)),
    }));
    const radius = (s: number): number => R * (1 - 0.45 * (s / L));
    const children: Attachment[] = [];
    const nb = Math.max(0, Math.round(g.stalkBranches));
    const chord = (TAU * R) / exit.N;
    for (let k = 0; k < nb; k++) {
      const s = L * (0.55 + 0.42 * ((k + 0.5 + 0.4 * this.bodyRng.uniform()) / nb));
      const az = k * GOLDEN + this.bodyRng.uniform() * 0.4;
      const blen = Math.max(0.1, g.stalkBranchLength * (1 - 0.4 * (s / L)) * (1 + 0.2 * this.bodyRng.uniform()));
      children.push({
        s, az, w: 1, h: 1, hh: Math.max(0.004, chord * 0.4), pri: 0, spine: false, j0: 0, row0: 0, row1: 0,
        make: (ex) => this.makeStalkBranch(ex, blen),
      });
    }
    const pivot = exit.pos;
    const phase = this.bodyRng.next();
    return {
      level: 1, line,
      sStart: Math.min(0.3 * L, Math.max(0.4 * exit.size, this.collarLen(R))),
      profile: (s, j, n) => {
        const r = radius(s);
        const th = (TAU * j) / n;
        return { x: r * Math.cos(th), y: r * Math.sin(th) };
      },
      radius, round: true,
      extra: [L * 0.55, L - 0.01],
      spacing: Math.max(1e-4, L / 40),
      children,
      wind: (s, y) => ({ height: clamp(y / this.plantH, 0, 1), limb: clamp(0.35 * (s / L), 0, 1), phase, detail: 0 }),
      pivot,
      r0: R,
    };
  }

  private makeStalkBranch(exit: Exit, blen: number): Organ {
    const g = this.g;
    const A = 68 * DEG2RAD;
    const dir0 = normalize(add(scale(exit.dir, Math.cos(A)), scale(exit.normal, Math.sin(A))));
    let right0 = cross(exit.dir, exit.normal);
    right0 = lengthSq(right0) < 1e-10 ? { x: 1, y: 0, z: 0 } : normalize(right0);
    const L = Math.max(0.08, blen);
    const line = growLine(exit.pos, dir0, right0, L, 8, (t0, t1) => ({ gravity: -25 * DEG2RAD * (t1 - t0) }));
    const R = Math.max(0.004, g.stalkRadius * 0.22);
    const radius = (s: number): number => R * (1 - 0.4 * (s / L));
    const children: Attachment[] = [];
    const buds = Math.max(0, Math.round(g.stalkBuds));
    const budR = Math.max(0.006, g.budSize);
    for (let k = 0; k < buds; k++) {
      const s = L * (0.45 + 0.5 * ((k + 0.5) / Math.max(1, buds)));
      const az = k * GOLDEN;
      children.push({
        s, az, w: 1, h: 1, hh: 0.004, pri: 1, spine: false, j0: 0, row0: 0, row1: 0,
        make: (ex) => this.makeBud(ex, budR),
      });
    }
    const pivot = exit.pos;
    return {
      level: 1, line,
      sStart: Math.min(0.3 * L, Math.max(0.4 * exit.size, this.collarLen(R))),
      profile: (s, j, n) => {
        const r = radius(s);
        const th = (TAU * j) / n;
        return { x: r * Math.cos(th), y: r * Math.sin(th) };
      },
      radius, round: true,
      extra: [L - 0.004],
      spacing: Math.max(1e-5, L / 6),
      children,
      wind: (s, y) => ({ height: clamp(y / this.plantH, 0, 1), limb: clamp(0.35 + 0.3 * (s / L), 0, 1), phase: 0.5, detail: 0 }),
      pivot,
      r0: R,
    };
  }

  private makeBud(exit: Exit, budR: number): Organ {
    this.stats.fruits++;
    const L = budR * 2.2;
    const tilt = 25 * DEG2RAD;
    const dir0 = normalize(add(scale(exit.normal, Math.cos(tilt)), scale(exit.dir, Math.sin(tilt))));
    let right0 = cross(exit.dir, exit.normal);
    right0 = lengthSq(right0) < 1e-10 ? { x: 1, y: 0, z: 0 } : normalize(right0);
    const line = growLine(exit.pos, dir0, right0, L, 4, () => ({}));
    const radius = (s: number): number => {
      const t = clamp(s / L, 0, 1);
      return Math.max(0.001, budR * (0.45 + 0.55 * Math.sin(Math.PI * clamp(t, 0.03, 0.97))) * (1 - 0.5 * sstep(0.85, 1, t)));
    };
    const pivot = exit.pos;
    return {
      level: 2, line,
      sStart: Math.min(0.3 * L, Math.max(0.4 * exit.size, 0.001)),
      profile: (s, j, n) => {
        const r = radius(s);
        const th = (TAU * j) / n;
        return { x: r * Math.cos(th), y: r * Math.sin(th) };
      },
      radius, round: true,
      extra: [L * 0.55],
      spacing: Math.max(1e-6, L / 3),
      children: [],
      wind: (_s, y) => ({ height: clamp(y / this.plantH, 0, 1), limb: 0.65, phase: 0.5, detail: 0 }),
      pivot,
      r0: budR,
    };
  }

  // ---------------------------------------------------------------------------
  // Ocotillo base & canes
  // ---------------------------------------------------------------------------

  private makeCaneBase(): Organ {
    const g = this.g;
    const R = 0.14;
    const H = 0.55;
    const depth = 0.12;
    const sGround = depth;
    this.groundDepth = Math.max(this.groundDepth, sGround);
    const L = H + sGround;
    const N = 32;
    const line = growLine({ x: 0, y: -depth, z: 0 }, { ...UP }, { x: 1, y: 0, z: 0 }, L, 8, () => ({}));
    const radius = (s: number): number => R * (0.8 + 0.2 * (s / L));
    const children: Attachment[] = [];
    const canes = Math.max(1, Math.round(g.canes));
    for (let k = 0; k < canes; k++) {
      const s = sGround + 0.05 + (L - sGround - 0.1) * ((k + 0.5) / canes);
      const az = k * GOLDEN + this.bodyRng.uniform() * 0.5;
      const caneH = Math.max(0.8, g.caneHeight * (1 + g.caneHeightV * this.bodyRng.uniform()));
      const spread = (g.caneSpread + g.caneSpreadV * this.bodyRng.uniform()) * DEG2RAD;
      const phase = this.bodyRng.next();
      children.push({
        s, az, w: 2, h: 2, hh: 0.012, pri: 0, spine: false, j0: 0, row0: 0, row1: 0,
        make: (exit) => this.makeCane(exit, caneH, spread, phase),
      });
    }
    void N;
    void R;
    return {
      level: 0, line, sStart: 0,
      profile: (s, j, n) => {
        const r = radius(s);
        const th = (TAU * j) / n;
        return { x: r * Math.cos(th), y: r * Math.sin(th) };
      },
      radius, round: true,
      extra: [sGround, L - 0.01],
      spacing: Math.max(1e-4, L / 12),
      children,
      wind: (_s, y) => ({ height: clamp(y / this.plantH, 0, 1), limb: 0, phase: 0, detail: 0 }),
      pivot: { x: 0, y: 0, z: 0 },
      r0: R,
    };
  }

  private makeCane(exit: Exit, caneH: number, spread: number, phase: number): Organ {
    const g = this.g;
    this.stats.canes++;
    const L = caneH;
    const R = Math.max(0.006, g.caneRadius);
    const dir0 = normalize(add(scale(UP, Math.cos(spread)), scale(exit.normal, Math.sin(spread))));
    let right0 = cross(UP, exit.normal);
    right0 = lengthSq(right0) < 1e-10 ? { x: 1, y: 0, z: 0 } : normalize(right0);
    const curve = (g.caneCurve + 8 * this.bodyRng.uniform()) * DEG2RAD;
    const steps = Math.max(16, Math.round(g.bodyRings));
    const line = growLine(exit.pos, dir0, right0, L, steps, (t0, t1) => ({
      gravity: curve * (Math.pow(t1, 1.2) - Math.pow(t0, 1.2)),
    }));
    const radius = (s: number): number => {
      const t = clamp(s / L, 0, 1);
      return Math.max(0.003, R * (0.7 + 0.3 * sstep(0, 0.1, t)) * (1 - 0.55 * t));
    };
    const children: Attachment[] = [];
    const spacing = Math.max(0.02, g.areoleSpacing);
    const chord = (TAU * R) / exit.N;
    // Flower torches near the tip (planned first so the thorns keep clear of them).
    if (g.flowers) {
      const nf = Math.max(0, Math.round(g.flowersPerTip));
      for (let k = 0; k < nf; k++) {
        const s = L - 0.04 - k * 0.025;
        if (s < L * 0.7) break;
        children.push({
          s, az: k * GOLDEN + 0.4, w: 1, h: 1, hh: Math.max(0.003, chord * 0.4),
          pri: 0, spine: false, j0: 0, row0: 0, row1: 0,
          make: (ex) => this.makeFruit(ex, true),
        });
      }
    }
    const zones = this.zonesOf(children, spacing * 0.6);
    // Thorns: one per node in a spiral, straight out of the cane skin with a swollen base.
    const nThorns = Math.floor((L * clamp(g.spineZone, 0, 1) - 0.1) / spacing);
    for (let k = 0; k < nThorns; k++) {
      const s = 0.08 + (k + 0.5) * spacing;
      if (s > L - 0.06) break;
      if (this.inZones(s, zones)) continue;
      const az = k * GOLDEN + this.areoleRng.uniform() * 0.3;
      const len = Math.max(0.008, g.spineLength * (1 + g.spineLengthV * this.spineRng.uniform()));
      children.push({
        s, az, w: 1, h: 1, hh: Math.max(0.003, chord * 0.4), pri: 1, spine: true, j0: 0, row0: 0, row1: 0,
        make: (ex) => this.makeThorn(ex, len),
      });
    }
    // Thorn-base felt sites (geometric bumps).
    const feltSites: { s: number; az: number }[] = children.filter((c) => c.spine).map((c) => ({ s: c.s, az: c.az }));
    const felt = Math.max(0, g.areoleFelt);
    const profile = (s: number, j: number, n: number): { x: number; y: number } => {
      const th = (TAU * j) / n;
      let r = radius(s);
      if (felt > 0 && feltSites.length > 0) {
        let best = Infinity;
        for (const fs of feltSites) {
          const ds = Math.abs(fs.s - s);
          if (ds > 0.012) continue;
          let da = Math.abs(th - fs.az) % TAU;
          if (da > Math.PI) da = TAU - da;
          const d = Math.sqrt(ds * ds + Math.pow(da * r, 2));
          if (d < best) best = d;
        }
        if (best < 0.008) r += felt * Math.exp(-Math.pow(best / 0.003, 2));
      }
      return { x: r * Math.cos(th), y: r * Math.sin(th) };
    };
    const pivot = exit.pos;
    return {
      level: 1, line,
      sStart: Math.min(0.3 * L, Math.max(0.4 * exit.size, this.collarLen(R))),
      profile, radius, round: true,
      extra: [L * 0.5, L - 0.03],
      spacing: Math.max(1e-4, L / Math.max(12, Math.round(g.bodyRings))),
      children,
      wind: (s, y) => ({ height: clamp(y / this.plantH, 0, 1), limb: clamp(0.3 * (s / L), 0, 1), phase, detail: clamp((s / L - 0.8) / 0.2, 0, 1) * 0.15 }),
      pivot,
      r0: R,
    };
  }

  private makeThorn(exit: Exit, len: number): Organ {
    const g = this.g;
    this.stats.spines++;
    const L = Math.max(0.006, len);
    const R = Math.max(0.0004, g.spineRadius);
    const A = (g.spineAngle + 10 * this.spineRng.uniform()) * DEG2RAD;
    const dir0 = normalize(add(scale(exit.normal, Math.cos(A)), scale(exit.dir, Math.sin(A))));
    let right0 = cross(dir0, Math.abs(dir0.y) < 0.9 ? UP : { x: 1, y: 0, z: 0 });
    right0 = normalize(rotateAxis(right0, dir0, this.spineRng.next() * TAU));
    const hook = g.spineCurve * DEG2RAD * (0.7 + 0.6 * this.spineRng.next());
    const segs = Math.max(1, Math.round(g.spineRings));
    const line = growLine(exit.pos, dir0, right0, L, segs * 2 + 2, (t0, t1) => ({ pitch: hook * (t1 - t0) }));
    // Swollen woody base flaring out to meet the window, then a sharp thorn.
    const baseR = Math.max(R * 2.5, exit.size * 0.3);
    const radius = (s: number): number => {
      const t = clamp(s / L, 0, 1);
      return Math.max(0.0002, lerp1(baseR, R * 0.28, sstep(0, 0.25, t)) * (1 - 0.3 * t) + R * 0.72 * (1 - t));
    };
    const pivot = exit.pos;
    return {
      level: 2, line,
      sStart: Math.min(0.3 * L, Math.max(0.35 * exit.size, this.collarLen(R))),
      profile: (s, j, n) => {
        const r = radius(s);
        const th = (TAU * j) / n;
        return { x: r * Math.cos(th), y: r * Math.sin(th) };
      },
      radius, round: true,
      extra: [L * 0.25, L - 0.3 * R],
      spacing: Math.max(1e-5, L / segs),
      children: [],
      wind: (_s, y) => ({ height: clamp(y / this.plantH, 0, 1), limb: 0, phase: 0, detail: 0 }),
      pivot,
      r0: R,
    };
  }

  /** Distance from the exit to the first full ring: proportional to the child's size. */
  private collarLen(r: number): number {
    return Math.max(2.2 * r, 0.0012);
  }

  // ---------------------------------------------------------------------------
  // Tubes: the welded window engine (same discipline as the grass mesher)
  // ---------------------------------------------------------------------------

  /** A root organ: capped at the bottom (below ground) instead of welded through a window. */
  private meshRoot(o: Organ): void {
    const mesh = this.mesh;
    const L = o.line.length;
    // Ring vertex count: stems declare it through their planner; infer from a probe child-free default.
    const N = this.rootSides(o);
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
    // Bottom cap (reversed: seen from below) then the tube and the tip cap.
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

  /** Ring count of a root organ: recovered from its own construction parameters. */
  private rootSides(o: Organ): number {
    // The builders size windows against this; probe the profile's intended count via the
    // organ's extra marker: stems store it implicitly, so recompute from the habit.
    const g = this.g;
    if (g.habit === 'columnar' || g.habit === 'barrel') {
      const R = Math.max(0.03, g.bodyRadius);
      const ribs = Math.max(6, Math.round(g.ribs));
      return this.ribbedSides(R, ribs);
    }
    if (g.habit === 'pads') {
      const round = clamp(g.padRound, 0, 1) > 0.5;
      return round ? Math.max(8, Math.round(g.padSides / 2.4)) : Math.max(12, Math.round(g.padSides));
    }
    void o;
    return 32; // ocotillo base
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
    const a0 = o.line.dirs[0];
    const theta = Math.acos(clamp(dot(a0, exit.normal), -1, 1));
    const alpha = theta * 0.5 * clamp(o.sStart / Math.max(1e-6, 2.2 * o.r0), 0, 1);
    const tilt = alpha > 1e-3 ? rotateTowards(a0, exit.normal, alpha) : undefined;
    const rings: Ring[] = [];
    for (let i = 0; i < K; i++) rings.push(this.buildRing(o, st[i], N, i === 0 ? tilt : undefined, (j) => interior(i, j)));

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
      if (c.spine) {
        if (this.spineCount >= Math.max(100, Math.round(this.g.spineBudget))) {
          this.drop('spine budget');
          continue;
        }
        this.spineCount++;
      }
      const childLoop = this.holeLoop(rings, c, N);
      const f = o.line.at(c.s);
      // The exit sits on the true surface (ribs, tubercles, felt): the loop centroid.
      const centroid = this.loopCentroid(childLoop);
      let normal = sub(centroid, f.pos);
      normal = lengthSq(normal) < 1e-18 ? f.dir : normalize(normal);
      const childExit: Exit = { pos: centroid, normal, dir: f.dir, size: this.loopSize(childLoop, centroid), N: childLoop.length };
      this.meshTube(c.make(childExit), childLoop, childExit);
    }
  }

  /** Ring stations shared by a window span must not be split by another window's rows: pri-0
   *  windows (arms, pads, fruits) therefore clear areoles out of their span plus a margin. */
  private zonesOf(children: Attachment[], margin: number): { s0: number; s1: number }[] {
    const zones: { s0: number; s1: number }[] = [];
    for (const c of children) {
      if (c.pri !== 0) continue;
      zones.push({ s0: c.s - c.hh - margin, s1: c.s + c.hh + margin });
    }
    return zones;
  }

  private inZones(s: number, zones: { s0: number; s1: number }[]): boolean {
    for (const z of zones) if (s >= z.s0 && s <= z.s1) return true;
    return false;
  }

  /**
   * Plan the windows of the children in two passes: structure (pri 0) first so
   * limbs claim their spans, then areoles and details. Pair rule: windows in
   * the same or neighbouring columns must not share ring stations with a
   * partial span overlap, and neither may far-apart windows — spans must be
   * disjoint or (near-)identical so the rows are shared exactly. Without this a
   * shifted areole row inside an arm's span splits the arm's row count and the
   * arm is lost.
   */
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
          // Same columns: keep a clear band of tube between the windows.
          if (lo < aHi + epsSame && aLo < hi + epsSame) {
            ok = false;
            break;
          }
        } else if (circularOverlap(j0 - 1, c.w + 2, a.j0, a.w, N)) {
          // Neighbouring columns: the cutter cannot share loop vertices along a
          // common edge, so even identical spans are refused here; windows may
          // only touch corner to corner.
          if (lo < aHi - 1e-9 && aLo < hi - 1e-9) {
            ok = false;
            break;
          }
        } else if (lo < aHi - 1e-9 && aLo < hi - 1e-9) {
          // Far columns: spans must be disjoint or shared exactly (same height
          // shares the rows exactly; mixed heights would split the row count).
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

  /**
   * Ring stations along an organ: the collar ring, the tip, the rows of every
   * window, the organ's own feature stations and regular fill in between.
   * Nothing is ever inserted inside a window span, so a window always gets
   * exactly the rows it was planned with.
   */
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
      idx[j] = this.mesh.addVertex(p.x, p.y, p.z, o.wind(s, p.y), o.pivot, o.level, 0);
    }
    return { idx, s, f };
  }

  /**
   * Fit a regular angular spacing to a closed loop as seen along the organ's
   * axis: the starting angle that best aligns ring vertex k with loop vertex k
   * (angles measured from the projected centroid).
   */
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

  /** Bridge the window loop to the first ring through `collarRings` fillet loops. */
  private collar(loop: number[], first: Ring, exit: Exit, o: Organ): void {
    const mesh = this.mesh;
    const M = loop.length;
    const shift = this.bestShift(loop, first.idx);
    const lp: number[] = new Array(M);
    for (let k = 0; k < M; k++) lp[k] = loop[(k + shift) % M];
    const n = Math.max(0, Math.round(this.g.collarRings));
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
        mid.push(mesh.addVertex(p.x, p.y, p.z, o.wind(first.s * k, p.y), o.pivot, o.level, 1));
      }
      this.bridge(prev, mid);
      prev = mid;
    }
    this.bridge(prev, first.idx);
    for (const v of loop) mesh.junction[v] = 1;
    for (const v of first.idx) mesh.junction[v] = 1;
    this.stats.junctions++;
  }

  /** Cyclic shift of the loop that pairs each loop vertex with the nearest ring vertex (least twisted collar). */
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

  /** Ladder cap of a ring that runs counter-clockwise seen from outside. */
  private cap(ring: number[]): void {
    const M = ring.length;
    for (let i = 0; 2 * i <= M - 3; i++) {
      this.mesh.addQuad(ring[i], ring[i + 1], ring[M - 2 - i], ring[M - 1 - i], [0, 0, 1, 0, 1, 1, 0, 1]);
    }
  }

  /** Closed loop of vertex indices around a window, counter-clockwise seen from outside. */
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

/** Window (w × h cells) whose boundary loop has N vertices: 2(w + h) = N. */
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

function spow(v: number, e: number): number {
  return Math.sign(v) * Math.pow(Math.abs(v), e);
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

function nearestDist(sorted: number[], v: number): number {
  return Math.abs(sorted[nearestIndex(sorted, v)] - v);
}

function nearestIndexOf(arr: number[], v: number): number {
  let best = 0;
  let bd = Infinity;
  for (let i = 0; i < arr.length; i++) {
    const d = Math.abs(arr[i] - v);
    if (d < bd) {
      bd = d;
      best = i;
    }
  }
  return best;
}

/** Do circular integer intervals [a, a+wa) and [b, b+wb) on a ring of N overlap? */
function circularOverlap(a: number, wa: number, b: number, wb: number, N: number): boolean {
  if (wa >= N || wb >= N) return true;
  a = mod(a, N);
  b = mod(b, N);
  const d = mod(b - a, N);
  if (d < wa) return true;
  const d2 = mod(a - b, N);
  return d2 < wb;
}

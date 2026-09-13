/**
 * Jungle mesher.
 *
 * Palms (feather & fan), banana-family plants and ferns are built with the
 * same discipline as the trees, grasses and desert plants: ONE closed quad
 * manifold per plant. The trunk / pseudostem is a tapered tube; fronds leave
 * it through rectangular windows cut into its ring grid and are welded to it
 * with collar loops. Feather-palm and fern fronds carry paired leaflets down
 * a curving rachis the same way; fan-palm fronds fan a cluster of blade
 * segments out of a short petiole; banana-family fronds are themselves one
 * huge paddle blade. Nothing is intersected, instanced or merged, so the
 * topology validator reports a single genus-0 surface and the wind
 * deformation is continuous from the soil to the tip of every leaflet.
 *
 * Organ levels (for the Levels view and the GLB TEXCOORD_1 channel):
 *   0 trunk / pseudostem · 1 fronds, petioles, blades, peduncle ·
 *   2 leaflets, fan segments, fruits, flowers.
 *
 * Colour accent channel (reusing the desert/vegetable convention so the
 * shader needs no changes): 0 = trunk, 1 = frond / leaf, 2 = flower, 3 = fruit.
 */

import { QuadMesh, VertexWind } from '../tree/mesh';
import { Random } from '../core/random';
import {
  V3, UP, TAU, DEG2RAD, add, addScaled, sub, dot, cross, normalize,
  lengthSq, lerp, lerp1, mod, clamp, rotateTowards, rotateAxis, scale,
} from '../core/math';
import { Line, Frame, growLine } from './line';
import { JungleParams, jungleHeight } from './jungleParams';
import { bladePoint } from './grassMesher';

/** Smoothstep helper (0 below a, 1 above b, cubic ease between). */
function sstep(a: number, b: number, x: number): number {
  if (a === b) return x < a ? 0 : 1;
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

export interface JungleStats {
  /** Organs meshed (trunk, fronds, leaflets, fruits …). */
  organs: number;
  /** Windows welded (every organ but the trunk has one). */
  junctions: number;
  dropped: number;
  dropReasons: Record<string, number>;
  /** trunk · fronds/blades/peduncle · leaflets/segments/fruits/flowers */
  perLevel: [number, number, number];
  fronds: number;
  leaflets: number;
  fruits: number;
}

export interface JungleBuildResult {
  mesh: QuadMesh;
  stats: JungleStats;
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
  /** Planning priority: structure (fronds) wins over fruit/flower. */
  pri: number;
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
  /** Colour group for this organ's vertices: 0 = trunk, 1 = frond/leaf, 2 = flower, 3 = fruit. */
  accent?: number;
}

interface Ring {
  idx: number[];
  s: number;
  f: Frame;
}

/** (rows, columns) offsets tried when a window does not fit where the child wants it, cheapest first. */
const OFFSETS: [number, number][] = [
  [0, 0],
  [0, 1], [0, -1],
  [1, 0], [-1, 0],
  [0, 2], [0, -2],
  [1, 1], [1, -1], [-1, 1], [-1, -1],
  [2, 0], [-2, 0],
];

const GOLDEN = 2.399963229728653; // 137.5°

export class JungleMesher {
  readonly mesh = new QuadMesh();
  private readonly g: JungleParams;
  private readonly trunkRng: Random;
  private readonly frondRng: Random;
  private readonly leafRng: Random;
  private readonly fruitRng: Random;
  private plantH = 1;
  private groundDepth = 0;
  private trunkN = 24;
  private stats: JungleStats = {
    organs: 0, junctions: 0, dropped: 0, dropReasons: {}, perLevel: [0, 0, 0],
    fronds: 0, leaflets: 0, fruits: 0,
  };

  constructor(g: JungleParams, seed: number) {
    this.g = g;
    const rng = new Random((seed ^ 0x4a756e67) >>> 0);
    this.trunkRng = rng.fork();
    this.frondRng = rng.fork();
    this.leafRng = rng.fork();
    this.fruitRng = rng.fork();
  }

  build(): JungleBuildResult {
    this.plantH = Math.max(0.05, jungleHeight(this.g));
    this.trunkN = Math.max(8, Math.round(this.g.trunkSides / 2) * 2);
    this.meshRoot(this.makeTrunk());
    // Normalise the sway weight by the real height of the plant.
    let maxY = 1e-3;
    const p = this.mesh.positions;
    for (let i = 1; i < p.length; i += 3) if (p[i] > maxY) maxY = p[i];
    const w = this.mesh.wind;
    for (let i = 0; i < w.length; i += 4) w[i] = clamp(p[(i / 4) * 3 + 1] / maxY, 0, 1);
    return { mesh: this.mesh, stats: this.stats, height: maxY, groundDepth: this.groundDepth };
  }

  // ---------------------------------------------------------------------------
  // Trunk / pseudostem
  // ---------------------------------------------------------------------------

  private makeTrunk(): Organ {
    const g = this.g;
    const R = Math.max(0.02, g.trunkRadius);
    const H = Math.max(0.08, g.trunkHeight);
    const depth = Math.max(0.03, 0.35 * R);
    const sink = Math.max(0, g.sink);
    const sGround = sink + depth;
    this.groundDepth = Math.max(this.groundDepth, sGround);
    const L = H + sGround;
    const lean = (g.trunkLean + g.trunkLeanV * this.trunkRng.uniform()) * DEG2RAD;
    const az = this.trunkRng.next() * TAU;
    const A = { x: Math.cos(az), y: 0, z: Math.sin(az) };
    const dir0 = normalize(add(scale(UP, Math.cos(lean)), scale(A, Math.sin(lean))));
    const right0 = normalize(cross(UP, A));
    const curve = g.trunkCurve * DEG2RAD;
    const steps = Math.max(16, Math.round(g.trunkRings));
    const line = growLine({ x: 0, y: -sGround, z: 0 }, dir0, right0, L, steps, (t0, t1) => ({
      gravity: curve * (Math.pow(t1, 1.3) - Math.pow(t0, 1.3)),
    }));
    const taper = clamp(g.trunkTaper, 0, 0.85);
    const bulgeAt = clamp(g.trunkBulgeAt, 0, 1) * H + sGround;
    const bulge = Math.max(0, g.trunkBulge);
    const scars = Math.max(0, g.ringScars);
    const scarSpacing = Math.max(0.02, g.ringSpacing);
    const tipR = 0.32;
    const radiusBase = (s: number): number => {
      if (s < sGround) return R * (0.85 + 0.15 * (s / sGround));
      const t = clamp((s - sGround) / H, 0, 1);
      let r = R * lerp1(1, tipR, Math.pow(t, 1.4)) * (1 - taper * 0.3 * t);
      if (bulge > 0) {
        const d = (s - bulgeAt) / Math.max(0.05, 0.25 * H);
        r *= 1 + bulge * Math.exp(-d * d);
      }
      return Math.max(0.05 * R, r);
    };
    const profile = (s: number, j: number, n: number): { x: number; y: number } => {
      const th = (TAU * j) / n;
      let r = radiusBase(s);
      if (scars > 0 && s > sGround) {
        r *= 1 + scars * 0.5 * (0.5 + 0.5 * Math.cos((s / scarSpacing) * TAU));
      }
      return { x: r * Math.cos(th), y: r * Math.sin(th) };
    };
    const children: Attachment[] = [];
    this.planFronds(children, L, sGround, radiusBase, H);
    this.planCrownExtras(children, L, sGround, radiusBase, H);
    const extra = [sGround, L - 0.02];
    return {
      level: 0, line, sStart: 0, profile, radius: radiusBase, round: true, extra,
      spacing: Math.max(1e-4, H / Math.max(10, Math.round(g.trunkRings))),
      children,
      wind: (_s, y) => ({ height: clamp(y / this.plantH, 0, 1), limb: 0, phase: 0, detail: 0 }),
      pivot: { x: 0, y: 0, z: 0 },
      r0: radiusBase(sGround + 0.5 * H),
    };
  }

  private planFronds(
    children: Attachment[], L: number, sGround: number,
    radius: (s: number) => number, H: number,
  ): void {
    const g = this.g;
    const count = Math.max(1, Math.round(g.fronds));
    let zLo = sGround + clamp(Math.min(g.frondFrom, g.frondTo), 0, 0.97) * H;
    let zHi = sGround + clamp(Math.max(g.frondFrom, g.frondTo), 0.02, 0.995) * H;
    const minBand = Math.max(0.03, 0.05 * H);
    if (zHi - zLo < minBand) zHi = Math.min(L - 0.01 * H, zLo + minBand);
    // The window floor must scale with the *plant*, not an absolute constant —
    // a fern's trunk can be centimetres tall, and an absolute floor (tuned for
    // metre-scale palm trunks) leaves no room for two dozen fronds to pack
    // around it without colliding, which is exactly what caused ferns to drop
    // ~15% of their fronds. Use the frond-radius-based size as the normal
    // case, but shrink it (never grow it) when the available band genuinely
    // can't fit `count` windows at that size.
    let side = Math.max(0.0015, g.frondRadius * 2 * 0.62);
    let hh = Math.max(0.0006, side / 2);
    let needed = count * 2 * hh;
    const band = zHi - zLo;
    if (needed > band * 0.85 && needed > 1e-9) {
      const shrink = Math.max(0.15, (band * 0.85) / needed);
      side *= shrink;
      hh *= shrink;
      needed = count * 2 * hh;
    }
    if (zHi - zLo < needed * 0.6) {
      zLo = Math.max(sGround + 0.01 * H, zLo - needed * 0.3);
      zHi = Math.min(L - 0.01 * H, zHi + needed * 0.3);
    }
    const Nf = this.frondCrossN();
    for (let k = 0; k < count; k++) {
      const t = count > 1 ? k / (count - 1) : 0.5;
      const s = zLo + t * (zHi - zLo);
      const az = k * GOLDEN + this.frondRng.uniform() * 0.3;
      const chord = (TAU * radius(clamp(s, 0, L))) / this.trunkN;
      let w = clamp(Math.round(side / chord), 1, Math.floor(this.trunkN / 2) - 1);
      let h = Math.floor(this.trunkN / 2) - w;
      if (h < 1) {
        w = Math.floor(this.trunkN / 2) - 1;
        h = 1;
      }
      const phase = this.frondRng.next();
      // Real palm crowns are graded by age: the newest fronds near the very
      // tip of the crown (high t) stand nearly upright (the unopened
      // "spear"), while progressively older fronds lower on the trunk (low
      // t) have bent further out and down under their own weight. Without
      // this gradient every frond gets the same lean/droop and the crown
      // reads as a flat spinning "windmill" of spikes instead of the layered
      // dome/shuttlecock silhouette of a real palm.
      const age = count > 1 ? 1 - t : 0.5;
      children.push({
        s, az, w, h, hh, pri: 0, j0: 0, row0: 0, row1: 0,
        make: (exit) => this.makeFrond(exit, phase, Nf, age),
      });
    }
  }

  private planCrownExtras(
    children: Attachment[], L: number, sGround: number,
    radius: (s: number) => number, H: number,
  ): void {
    const g = this.g;
    if (!g.fruitCluster && !g.flower) return;
    // Real palm fruit bunches (coconuts, dates) hang from a peduncle that
    // emerges *below* the leaf crown, not from inside the same tight band
    // the fronds already pack — placing it there both matches real anatomy
    // and stops it fighting the fronds for the same circumference slice
    // (which was silently dropping the whole fruit cluster).
    const frondLo = Math.min(g.frondFrom, g.frondTo);
    const s = clamp(sGround + (frondLo - 0.06) * H, sGround + 0.02, L - 0.02);
    const az = this.fruitRng.next() * TAU;
    const side = Math.max(0.01, 0.5 * g.trunkRadius);
    const hh = Math.max(0.005, side * 0.5);
    const chord = (TAU * radius(s)) / this.trunkN;
    let w = clamp(Math.round(side / chord), 1, Math.floor(this.trunkN / 2) - 1);
    let h = Math.floor(this.trunkN / 2) - w;
    if (h < 1) {
      w = Math.floor(this.trunkN / 2) - 1;
      h = 1;
    }
    // Lower priority than the fronds (pri 0): the peduncle should slot into
    // whatever gap the frond ring leaves rather than competing with a frond
    // for the same slice of trunk circumference and risking a window
    // conflict that silently drops a frond.
    children.push({
      s, az, w, h, hh, pri: 1, j0: 0, row0: 0, row1: 0,
      make: (exit) => this.makePeduncle(exit),
    });
  }

  /** Cross-section vertex count of a frond / petiole / blade organ. */
  private frondCrossN(): number {
    return Math.max(6, Math.round(this.g.frondRibs / 2) * 2);
  }

  // ---------------------------------------------------------------------------
  // Fronds (dispatch by habit)
  // ---------------------------------------------------------------------------

  private makeFrond(exit: Exit, phase: number, Nf: number, age: number): Organ {
    switch (this.g.habit) {
      case 'palmate':
        return this.makeFanFrond(exit, phase, Nf, age);
      case 'banana':
        return this.makeBladeFrond(exit, phase, age);
      case 'pinnate':
      case 'fern':
      default:
        return this.makeCompoundFrond(exit, phase, Nf, age);
    }
  }

  /**
   * Direction a frond leaves the trunk: blends the trunk's outward normal
   * with straight up. `age` grades the crown from the newest, most upright
   * frond (age 0, near the growing tip) to the oldest, most splayed-out
   * frond (age 1, low on the crown) — real palms hold their fronds in a
   * layered dome/shuttlecock, not a single flat "windmill" plane, because
   * every frond bent a little further outward as it aged.
   */
  private frondDir0(exit: Exit, age: number): { dir0: V3; right0: V3 } {
    const g = this.g;
    const lean = clamp(g.frondLean + age * 22, 0, 89) * DEG2RAD;
    const dir0 = normalize(add(scale(UP, Math.cos(lean)), scale(exit.normal, Math.sin(lean))));
    let right0 = cross(UP, exit.normal);
    right0 = lengthSq(right0) < 1e-10 ? { x: 1, y: 0, z: 0 } : normalize(right0);
    return { dir0, right0 };
  }

  /**
   * Feather-palm / fern frond: a curving rachis carrying paired leaflets
   * (opposite pinnation) down most of its length, the way vegetable compound
   * leaves and grass inflorescences already weld their own children.
   */
  private makeCompoundFrond(exit: Exit, phase: number, Nf: number, age: number): Organ {
    const g = this.g;
    this.stats.fronds++;
    const L = Math.max(0.1, g.frondLength * (1 + g.frondLengthV * this.frondRng.uniform()) * (0.75 + 0.25 * (1 - age)));
    const R = Math.max(0.004, g.frondRadius);
    const { dir0, right0 } = this.frondDir0(exit, age);
    const reachLen = clamp(g.frondReach, 0, 0.92) * L;
    const droopTotal = (g.frondDroop * (0.55 + 0.6 * age) + g.frondDroopV * this.frondRng.uniform()) * DEG2RAD;
    const angleAt = (s: number): number => (s <= reachLen ? 0 : droopTotal * Math.pow((s - reachLen) / Math.max(1e-4, L - reachLen), 0.85));
    const steps = Math.max(14, Math.round(g.frondRibs) + 12);
    const line = growLine(exit.pos, dir0, right0, L, steps, (t0, t1) => ({
      gravity: angleAt(t1 * L) - angleAt(t0 * L),
    }));
    const radius = (s: number): number => {
      const t = clamp(s / L, 0, 1);
      return Math.max(0.06 * R, R * (0.55 + 0.45 * Math.pow(1 - t, 0.6)));
    };
    const sStart = Math.min(0.25 * L, Math.max(0.45 * exit.size, this.collarLen(R)));
    const zoneLo = 0.05;
    const zoneHi = 0.92;
    const pairs = Math.max(2, Math.round(g.leaflets / 2));
    const pairSpacing = pairs > 1 ? ((zoneHi - zoneLo) * L) / (pairs - 1) : (zoneHi - zoneLo) * L;
    // Real pinnate leaflets are strung along the rachis far more densely than
    // their own length would suggest — a coconut frond's leaflets are ~15-20x
    // longer than the gap between consecutive pairs, which is exactly what
    // makes the whole frond read as one continuous feathery blade instead of
    // a row of separated spikes. Unlike a vegetable compound leaf (where the
    // leaflet count is small and leaflets must stay visually distinct), the
    // window only needs room for the *base* of the leaflet, not its full
    // length, so the length is taken directly from the species parameter.
    const hhPair = clamp(pairSpacing * 0.22, 0.0015, 0.04 * L);
    const children: Attachment[] = [];
    for (let k = 0; k < pairs; k++) {
      const t = pairs > 1 ? zoneLo + (k / (pairs - 1)) * (zoneHi - zoneLo) : 0.5 * (zoneLo + zoneHi);
      const s = t * L;
      // Longest around the middle of the rachis, shorter near the base and the tip.
      const envelope = Math.pow(Math.sin(Math.PI * clamp((t - zoneLo) / (zoneHi - zoneLo), 0, 1)), 0.35);
      const len = Math.max(0.02, g.leafletLength * (0.45 + 0.55 * envelope) * (1 + g.leafletLengthV * this.leafRng.uniform()));
      const width = Math.max(0.003, g.leafletWidth * (0.75 + 0.4 * envelope));
      for (const side of [-1, 1]) {
        children.push({
          s, az: side > 0 ? 0 : Math.PI, w: 1, h: 1, hh: hhPair, pri: 1, j0: 0, row0: 0, row1: 0,
          make: (ex) => this.makeLeaflet(ex, { len, width, phase: this.leafRng.next(), tip: false }),
        });
      }
    }
    // Terminal leaflet closes the tip instead of leaving a bare rachis point.
    const sTerm = Math.min(L - 1.8 * hhPair, zoneHi * L + 1.6 * hhPair);
    if (sTerm > zoneHi * L) {
      const termLen = Math.max(0.02, g.leafletLength * 0.5);
      children.push({
        s: sTerm, az: 0, w: 1, h: 1, hh: hhPair, pri: 3, j0: 0, row0: 0, row1: 0,
        make: (ex) => this.makeLeaflet(ex, { len: termLen, width: g.leafletWidth * 0.6, phase: this.leafRng.next(), tip: true }),
      });
    }
    const pivot = exit.pos;
    return {
      level: 1, line, sStart,
      profile: (s, j, n) => {
        const r = radius(s);
        const th = (TAU * j) / n;
        return { x: r * Math.cos(th), y: r * Math.sin(th) };
      },
      radius, round: true,
      extra: [L * 0.5, L - 0.008],
      spacing: Math.max(1e-4, L / Math.max(14, Nf)),
      children,
      wind: (s, y) => ({
        height: clamp(y / this.plantH, 0, 1),
        limb: clamp(0.3 + 0.5 * (s / L), 0, 1), phase, detail: clamp((s / L - 0.4) / 0.6, 0, 1) * 0.15,
      }),
      pivot,
      r0: R,
      accent: 1,
    };
  }

  /** A single leaflet / pinna blade: a flat ovate-to-linear blade, optionally toothed (ferns). */
  private makeLeaflet(exit: Exit, o: { len: number; width: number; phase: number; tip: boolean }): Organ {
    const g = this.g;
    this.stats.leaflets++;
    const L = o.len;
    const tiltFromAxis = clamp(g.leafletAngle, 10, 170) * 0.5 * DEG2RAD;
    const dir0 = normalize(add(scale(exit.dir, Math.cos(tiltFromAxis)), scale(exit.normal, Math.sin(tiltFromAxis) * (o.tip ? 0.15 : 1))));
    let right0 = cross(exit.dir, exit.normal);
    right0 = lengthSq(right0) < 1e-10 ? { x: 1, y: 0, z: 0 } : normalize(right0);
    const droop = (g.leafletCurve + 8 * this.leafRng.uniform()) * DEG2RAD;
    const steps = Math.max(6, Math.round(g.leafletRings));
    const line = growLine(exit.pos, dir0, right0, L, steps, (t0, t1) => ({
      gravity: droop * (Math.pow(t1, 1.4) - Math.pow(t0, 1.4)),
    }));
    const teeth = clamp(g.leafletTeeth, 0, 1);
    const N = exit.N;
    const m = N / 2;
    // Real pinnate leaflets (palm pinnae, fern pinnules) are linear-lanceolate:
    // they widen quickly right at the base, hold a near-constant width for
    // most of their length, then taper to a point only near the very tip —
    // NOT a symmetric spindle/needle that is widest at the middle and zero at
    // both ends (which is what a sin(pi t) belly produces and reads as a
    // sharp spike rather than a blade).
    const widthAt = (s: number): number => {
      const t = clamp(s / L, 0, 1);
      const riseIn = sstep(0, 0.12, t);
      const taperOut = 1 - Math.pow(sstep(0.62, 1, t), 1.3);
      return o.width * riseIn * taperOut;
    };
    const thickAt = (s: number): number => {
      const t = clamp(s / L, 0, 1);
      return Math.max(0.0004, o.width * 0.1 * sstep(0, 0.12, t) * (1 - 0.6 * t));
    };
    const toothAt = (s: number): number => {
      if (teeth <= 0.02) return 0;
      const t = s / L;
      if (t < 0.08 || t > 0.92) return 0;
      const wave = 0.5 + 0.5 * Math.sin(t * 14 * TAU);
      return teeth * 0.12 * widthAt(s) * Math.max(0, wave);
    };
    const profile = (s: number, j: number, n: number): { x: number; y: number } => {
      const q = bladePoint(n, j, widthAt(s), thickAt(s), 0.15, 0);
      const tooth = toothAt(s);
      if (tooth > 0) {
        let u = 0;
        if (j <= m) u = 1 - (2 * j) / m;
        else u = -1 + (2 * (j - m)) / m;
        if (Math.abs(u) > 0.85) return { x: q.x + Math.sign(u) * tooth, y: q.y };
      }
      return q;
    };
    const pivot = exit.pos;
    return {
      level: 2, line, sStart: Math.min(0.3 * L, Math.max(0.85 * exit.size, 0.0012)),
      profile,
      radius: (s) => 0.5 * widthAt(s),
      round: false,
      extra: [L - 0.0015],
      spacing: Math.max(1e-4, L / Math.max(6, Math.round(g.leafletRings))),
      children: [],
      wind: (s, y) => ({
        height: clamp(y / this.plantH, 0, 1),
        limb: 0.55, phase: o.phase, detail: clamp((s / L - 0.4) / 0.6, 0, 1) * 0.1,
      }),
      pivot, r0: o.width * 0.3,
      accent: 1,
    };
  }

  /** Fan-palm frond: a short stiff petiole that fans a cluster of blade segments out near the tip. */
  private makeFanFrond(exit: Exit, phase: number, Nf: number, age: number): Organ {
    const g = this.g;
    this.stats.fronds++;
    const L = Math.max(0.08, g.frondLength * (1 + g.frondLengthV * this.frondRng.uniform()));
    const R = Math.max(0.006, g.frondRadius);
    const { dir0, right0 } = this.frondDir0(exit, age);
    const petioleBend = (6 + age * 30) * DEG2RAD;
    const line = growLine(exit.pos, dir0, right0, L, Math.max(10, steps(g)), (t0, t1) => ({
      gravity: petioleBend * (t1 - t0),
    }));
    const radius = (s: number): number => Math.max(0.08 * R, R * (1 - 0.55 * (s / L)));
    const sStart = Math.min(0.25 * L, Math.max(0.45 * exit.size, this.collarLen(R)));
    const nSeg = Math.max(6, Math.round(g.segments));
    const rows = clamp(Math.ceil(Math.sqrt(nSeg)), 4, 10);
    const perRow = Math.ceil(nSeg / rows);
    const side = Math.max(0.006, g.frondRadius * 2 * 0.6);
    const hh = Math.max(0.003, side / 2);
    // A real fan-palm blade doesn't fan out along a quarter of the petiole's
    // length in separated storeys (which reads as a stack of little pompoms,
    // not one flat fan) — every segment radiates from essentially the same
    // point at the tip, where the pleated blade splits open. Pack the row
    // windows as tightly as the collision rule allows (2*hh apart, exactly)
    // right at the very tip instead of spreading them over 25% of L.
    const bandHeight = rows * 2 * hh * 1.05;
    const zoneHi = Math.min(0.995, 1 - 0.6 * hh / L);
    const zoneLo = Math.max(0.02, zoneHi - bandHeight / L);
    const rowSpacing = rows > 1 ? (zoneHi - zoneLo) * L / rows : (zoneHi - zoneLo) * L;
    const spread = clamp(g.segmentSpread, 30, 340) * DEG2RAD;
    const segLen = Math.max(0.03, g.frondLength * 0.32 * (1 + 0.1 * this.leafRng.uniform()));
    // Real fan-palm leaflets are joined at the base into one continuous
    // pleated web — the visible gaps between them only open up in the outer
    // half to two-thirds of the blade, near the "hastula". Widening each
    // finger's base well past its neighbour's angular spacing (so bases
    // overlap and only the tips fan apart) reads as one fused disc instead
    // of a sparse ring of separate spikes, without needing extra hub geometry.
    const angularStep = perRow > 1 ? spread / (perRow - 1) : spread;
    const baseWidth = Math.max(0.006, angularStep * segLen * 0.95);
    const segWidth = Math.max(baseWidth, g.leafletWidth > 0 ? g.leafletWidth : 0.03);
    const children: Attachment[] = [];
    let made = 0;
    for (let r = 0; r < rows && made < nSeg; r++) {
      const s = zoneLo * L + (r + 0.5) * rowSpacing;
      const jitter = (r % 2) * (spread / (2 * perRow));
      for (let k = 0; k < perRow && made < nSeg; k++) {
        const u = perRow > 1 ? k / (perRow - 1) - 0.5 : 0;
        const az = u * spread + jitter + this.leafRng.uniform() * 0.05;
        const lenHere = segLen * (0.85 + 0.3 * (1 - Math.abs(u) * 0.5));
        children.push({
          s, az, w: 1, h: 1, hh, pri: 1, j0: 0, row0: 0, row1: 0,
          make: (ex) => this.makeSegment(ex, { len: lenHere, width: segWidth, phase: this.leafRng.next() }),
        });
        made++;
      }
    }
    const pivot = exit.pos;
    return {
      level: 1, line, sStart,
      profile: (s, j, n) => {
        const r = radius(s);
        const th = (TAU * j) / n;
        return { x: r * Math.cos(th), y: r * Math.sin(th) };
      },
      radius, round: true,
      extra: [zoneLo * L, L - 0.006],
      spacing: Math.max(1e-4, L / Math.max(14, Nf)),
      children,
      wind: (s, y) => ({ height: clamp(y / this.plantH, 0, 1), limb: clamp(0.4 + 0.5 * (s / L), 0, 1), phase, detail: 0.05 }),

      pivot,
      r0: R,
      accent: 1,
    };
  }

  /** A single blade finger of a fan-palm frond: droops past a hinge partway along its length. */
  private makeSegment(exit: Exit, o: { len: number; width: number; phase: number }): Organ {
    const g = this.g;
    this.stats.leaflets++;
    const L = o.len;
    const dir0 = exit.normal;
    let right0 = cross(exit.dir, exit.normal);
    right0 = lengthSq(right0) < 1e-10 ? { x: 1, y: 0, z: 0 } : normalize(right0);
    const hinge = 0.55;
    const droopTotal = clamp(g.segmentDroop, 0, 89) * DEG2RAD;
    const angleAt = (s: number): number => (s <= hinge * L ? 0 : droopTotal * Math.pow((s - hinge * L) / ((1 - hinge) * L), 0.8));
    const line = growLine(exit.pos, dir0, right0, L, 10, (t0, t1) => ({
      gravity: angleAt(t1 * L) - angleAt(t0 * L),
    }));
    const widthAt = (s: number): number => {
      const t = clamp(s / L, 0, 1);
      return o.width * (0.4 + 0.6 * (1 - t)) * (1 - Math.pow(t, 3) * 0.8);
    };
    const thickAt = (s: number): number => Math.max(0.0004, o.width * 0.1 * (1 - 0.5 * (s / L)));
    const profile = (s: number, j: number, n: number): { x: number; y: number } => bladePoint(n, j, widthAt(s), thickAt(s), 0.35, 0);
    const pivot = exit.pos;
    return {
      level: 2, line, sStart: Math.min(0.3 * L, Math.max(0.85 * exit.size, 0.0012)),
      profile,
      radius: (s) => 0.5 * widthAt(s),
      round: false,
      extra: [hinge * L, L - 0.0015],
      spacing: Math.max(1e-4, L / 10),
      children: [],
      wind: (s, y) => ({ height: clamp(y / this.plantH, 0, 1), limb: 0.65, phase: o.phase, detail: clamp((s / L - 0.5) / 0.5, 0, 1) * 0.12 }),
      pivot, r0: o.width * 0.3,
      accent: 1,
    };
  }

  /** Banana-family frond: the whole frond IS one huge paddle blade (no separate leaflets). */
  private makeBladeFrond(exit: Exit, phase: number, age: number): Organ {
    const g = this.g;
    this.stats.fronds++;
    const L = Math.max(0.15, g.frondLength * (1 + g.frondLengthV * this.frondRng.uniform()));
    const petiole = Math.min(0.22 * L, 0.35);
    const { dir0, right0 } = this.frondDir0(exit, age);
    const droopTotal = (g.frondDroop * (0.6 + 0.6 * age) + g.frondDroopV * this.frondRng.uniform()) * DEG2RAD;
    const angleAt = (s: number): number => (s <= petiole ? 0 : droopTotal * Math.pow((s - petiole) / Math.max(1e-4, L - petiole), 0.7));
    const steps = Math.max(20, Math.round(g.trunkRings * 0.6));
    const line = growLine(exit.pos, dir0, right0, L, steps, (t0, t1) => ({
      gravity: angleAt(t1 * L) - angleAt(t0 * L),
    }));
    const R = Math.max(0.006, g.frondRadius);
    const W = Math.max(0.05, g.bladeWidth);
    const keel = clamp(g.bladeKeel, 0, 1);
    const tearing = clamp(g.bladeTearing, 0, 1);
    const widthAt = (s: number): number => {
      if (s <= petiole) return R * 2.2 * (0.6 + 0.4 * (s / petiole));
      const t = clamp((s - petiole) / (L - petiole), 0, 1);
      // Banana/bird-of-paradise leaves are broad ovate paddles: they widen
      // quickly from the petiole to near-full width, hold that width through
      // the middle, and only round off (not spike) at the very tip.
      const riseIn = sstep(0, 0.14, t);
      const taperOut = 1 - Math.pow(sstep(0.78, 1, t), 1.6);
      return Math.max(0.01, W * riseIn * taperOut * (0.92 + 0.08 * (1 - t)));
    };
    const thickAt = (s: number): number => {
      if (s <= petiole) return R * 1.4;
      const t = clamp((s - petiole) / (L - petiole), 0, 1);
      return Math.max(0.0008, 0.004 * (1 - 0.7 * t));
    };
    // Wind damage on a banana leaf is a series of narrow slits running in
    // from the margin roughly parallel to the side veins — thin V-shaped
    // cuts, not wide rounded scallops eating a quarter of the blade. Model
    // each slit as a sharp, brief spike (high power of a triangle wave) so
    // most of the margin stays smooth and only a thin notch appears wherever
    // a slit lands, independently randomised per side so the tears don't
    // mirror each other.
    const slitFreq = 11;
    const slitAt = (t: number, sideOffset: number): number => {
      const phase = ((t * slitFreq + sideOffset) % 1 + 1) % 1;
      const tri = 1 - Math.abs(phase * 2 - 1);
      return Math.pow(Math.max(0, tri), 9);
    };
    const tearAt = (s: number, side: number): number => {
      if (tearing <= 0.03 || s <= petiole) return 0;
      const t = (s - petiole) / (L - petiole);
      if (t < 0.1 || t > 0.95) return 0;
      const spike = slitAt(t, side > 0 ? 0.13 : 0.62);
      if (spike <= 0.02) return 0;
      return tearing * 0.75 * widthAt(s) * spike;
    };
    const N = exit.N;
    const m = N / 2;
    const profile = (s: number, j: number, n: number): { x: number; y: number } => {
      const q = bladePoint(n, j, widthAt(s), thickAt(s), s <= petiole ? 0 : keel, 0);
      if (s <= petiole) return q;
      let u = 0;
      if (j <= m) u = 1 - (2 * j) / m;
      else u = -1 + (2 * (j - m)) / m;
      if (Math.abs(u) > 0.8) {
        const tear = tearAt(s, Math.sign(u));
        if (tear > 0) return { x: q.x - Math.sign(u) * tear, y: q.y };
      }
      return q;
    };
    const pivot = exit.pos;
    return {
      level: 1, line, sStart: Math.min(0.3 * petiole, Math.max(0.85 * exit.size, 0.006)),
      profile,
      radius: (s) => 0.5 * widthAt(s),
      round: false,
      extra: [petiole, petiole + 0.02, L - 0.01],
      spacing: Math.max(1e-4, L / steps),
      children: [],
      wind: (s, y) => ({
        height: clamp(y / this.plantH, 0, 1),
        limb: clamp(0.3 + 0.6 * (s / L), 0, 1), phase, detail: clamp((s / L - 0.4) / 0.6, 0, 1) * 0.18,
      }),
      pivot, r0: R,
      accent: 1,
    };
  }

  // ---------------------------------------------------------------------------
  // Fruit cluster & flower peduncle
  // ---------------------------------------------------------------------------

  private makePeduncle(exit: Exit): Organ {
    const g = this.g;
    const hang = g.flowerHang;
    const L = Math.max(0.15, (hang ? 0.9 : 0.5) * (this.plantH * 0.22 + 0.3));
    const R = Math.max(0.006, g.trunkRadius * 0.16);
    const dir0 = hang
      ? normalize(add(scale(exit.normal, 0.6), scale(UP, 0.15)))
      : normalize(add(scale(UP, 0.85), scale(exit.normal, 0.3)));
    let right0 = cross(exit.dir, exit.normal);
    right0 = lengthSq(right0) < 1e-10 ? { x: 1, y: 0, z: 0 } : normalize(right0);
    const bendDeg = hang ? 100 : 15;
    const line = growLine(exit.pos, dir0, right0, L, 16, (t0, t1) => ({
      gravity: bendDeg * DEG2RAD * (Math.pow(t1, 1.3) - Math.pow(t0, 1.3)),
    }));
    const radius = (s: number): number => Math.max(0.15 * R, R * (1 - 0.5 * (s / L)));
    const children: Attachment[] = [];
    if (g.fruitCluster) {
      const hands = hang ? Math.min(4, Math.max(1, Math.round(g.fruits / 4))) : 1;
      const perHand = Math.max(1, Math.round(g.fruits / hands));
      const lo = hang ? 0.3 * L : 0.15 * L;
      const hi = hang ? 0.82 * L : 0.7 * L;
      let idx = 0;
      for (let hIdx = 0; hIdx < hands; hIdx++) {
        const s = hands > 1 ? lo + (hIdx / (hands - 1)) * (hi - lo) : 0.5 * (lo + hi);
        for (let k = 0; k < perHand; k++) {
          const az = (idx * TAU) / Math.max(3, perHand) + this.fruitRng.uniform() * 0.3;
          idx++;
          children.push({
            s, az, w: 1, h: 1, hh: Math.max(0.006, g.fruitRadius * 0.4), pri: 1, j0: 0, row0: 0, row1: 0,
            make: (ex) => this.makeJungleFruit(ex),
          });
        }
      }
    }
    if (g.flower) {
      children.push({
        s: L - Math.max(0.02, g.flowerLength * 0.55), az: 0, w: 1, h: 1,
        hh: Math.max(0.008, g.flowerRadius * 0.5), pri: 3, j0: 0, row0: 0, row1: 0,
        make: (ex) => this.makeFlowerBud(ex),
      });
    }
    const pivot = exit.pos;
    return {
      level: 1, line,
      sStart: Math.min(0.3 * L, Math.max(0.5 * exit.size, this.collarLen(R))),
      profile: (s, j, n) => {
        const r = radius(s);
        const th = (TAU * j) / n;
        return { x: r * Math.cos(th), y: r * Math.sin(th) };
      },
      radius, round: true,
      extra: [L - 0.01],
      spacing: Math.max(1e-4, L / 16),
      children,
      wind: (s, y) => ({ height: clamp(y / this.plantH, 0, 1), limb: clamp(0.5 + 0.4 * (s / L), 0, 1), phase: 0.4, detail: 0 }),
      pivot,
      r0: R,
      accent: 1,
    };
  }

  private makeJungleFruit(exit: Exit): Organ {
    const g = this.g;
    this.stats.fruits++;
    const L = Math.max(0.02, g.fruitLength);
    const R = Math.max(0.006, g.fruitRadius);
    const curve = clamp(g.fruitCurve, 0, 90) * DEG2RAD;
    const tilt = 30 * DEG2RAD;
    const dir0 = normalize(add(scale(exit.normal, Math.cos(tilt)), scale(exit.dir, Math.sin(tilt))));
    let right0 = cross(exit.dir, exit.normal);
    right0 = lengthSq(right0) < 1e-10 ? { x: 1, y: 0, z: 0 } : normalize(right0);
    const line = growLine(exit.pos, dir0, right0, L, 10, (t0, t1) => ({
      pitch: curve * (t1 - t0),
    }));
    const radius = (s: number): number => {
      const t = clamp(s / L, 0, 1);
      return Math.max(0.0015, R * (0.35 + 0.65 * Math.sin(Math.PI * clamp(t, 0.03, 0.97))) * (1 - 0.35 * Math.pow(t, 3)));
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
      extra: [L * 0.55, L * 0.85],
      spacing: Math.max(1e-5, L / 6),
      children: [],
      wind: (_s, y) => ({ height: clamp(y / this.plantH, 0, 1), limb: 0.7, phase: 0.5, detail: 0 }),
      pivot,
      r0: R,
      accent: 3,
    };
  }

  private makeFlowerBud(exit: Exit): Organ {
    const g = this.g;
    const L = Math.max(0.02, g.flowerLength);
    const R = Math.max(0.005, g.flowerRadius);
    const tilt = g.flowerHang ? 60 * DEG2RAD : 12 * DEG2RAD;
    const dir0 = normalize(add(scale(exit.normal, Math.cos(tilt)), scale(exit.dir, Math.sin(tilt))));
    let right0 = cross(exit.dir, exit.normal);
    right0 = lengthSq(right0) < 1e-10 ? { x: 1, y: 0, z: 0 } : normalize(right0);
    const line = growLine(exit.pos, dir0, right0, L, 12, () => ({}));
    const radius = (s: number): number => {
      const t = clamp(s / L, 0, 1);
      return Math.max(0.002, R * (0.3 + 0.55 * Math.pow(1 - t, 0.6)));
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
      extra: [L * 0.4, L * 0.8],
      spacing: Math.max(1e-5, L / 8),
      children: [],
      wind: (_s, y) => ({ height: clamp(y / this.plantH, 0, 1), limb: 0.75, phase: 0.5, detail: 0 }),
      pivot,
      r0: R,
      accent: 2,
    };
  }

  private collarLen(r: number): number {
    return Math.max(2.2 * r, 0.0012);
  }

  // ---------------------------------------------------------------------------
  // Tubes: the welded window engine (same discipline as the desert mesher)
  // ---------------------------------------------------------------------------

  /** The trunk: capped at the bottom (below ground) instead of welded through a window. */
  private meshRoot(o: Organ): void {
    const mesh = this.mesh;
    const L = o.line.length;
    const N = this.trunkN;
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

function steps(g: JungleParams): number {
  return Math.max(10, Math.round(g.trunkRings * 0.4));
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

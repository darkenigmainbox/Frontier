/**
 * Vegetable garden parameters and species presets.
 *
 * A vegetable is described botanically with three body plans (habits) sharing
 * one welded-mesh engine, the same discipline as the trees, grasses and
 * desert plants:
 *   - `root`  a swollen taproot or bulb, mostly buried with only its shoulder
 *             and a short neck exposed above the soil, topped with a crown of
 *             leaves (carrot, beetroot, radish, onion — `bulbBulge` tells a
 *             round bulb from a tapered spindle root).
 *   - `leafy` a short stem at ground level carrying a broad rosette of ruffled
 *             leaves (kale, cabbage, lettuce).
 *   - `vine`  a small bushy above-ground stem with branches carrying compound,
 *             lobed leaves, flowers and hanging fruit clusters (tomato, chilli
 *             pepper).
 *
 * Lengths are metres, angles degrees. Every preset builds as ONE closed quad
 * manifold: leaves, branches, flowers and fruit all leave their parent
 * through windows cut into the parent's ring grid and are welded to it with
 * collar loops, exactly like the desert mesher.
 */

export type VegHabit = 'root' | 'leafy' | 'vine';

export const VEG_HABIT_NAMES: Record<VegHabit, string> = {
  root: 'Root / bulb vegetable',
  leafy: 'Leafy rosette',
  vine: 'Fruiting vine / bush',
};

export interface VegParams {
  habit: VegHabit;

  // ---- Root / bulb body (root habit) -----------------------------------------
  /** Total length of the root/bulb body, tip to shoulder. */
  bodyLength: number;
  /** Maximum radius of the body. */
  bodyRadius: number;
  /** 0 = blunt round tip, 1 = sharp tapered point (carrot, radish). */
  bodyTaper: number;
  /** 0 = tapered spindle (carrot), 1 = round bulge near the top (beetroot, onion). */
  bulbBulge: number;
  /** Subtle longitudinal ribs / skin grooves. */
  ribCount: number;
  ribDepth: number;
  /** Length of the narrow neck above the body, below the leaf crown. */
  neckLength: number;
  /** Neck radius as a fraction of the body radius. */
  neckRadius: number;
  /** Fraction of the body length that sits above the soil (0 = fully buried shoulder, 1 = fully exposed). */
  exposure: number;
  /** Thin trailing root hairs near the buried tip. */
  rootHairs: number;
  rootHairLength: number;
  skinColor: string;

  // ---- Leaf crown base (all habits) -------------------------------------------
  /** Radius of the small basal disc the leaves and (for root habit) the taproot spike attach to. */
  crownRadius: number;
  crownHeight: number;

  // ---- Stem (leafy & vine habits) ---------------------------------------------
  stemHeight: number;
  stemRadius: number;
  stemLean: number;
  stemColor: string;

  // ---- Branches (vine habit) ----------------------------------------------------
  branches: number;
  branchFrom: number;
  branchTo: number;
  branchLength: number;
  branchLengthV: number;
  branchAngle: number;
  branchDroop: number;

  // ---- Leaves (all habits) -------------------------------------------------------
  leaves: number;
  leafLength: number;
  leafLengthV: number;
  leafWidth: number;
  leafThick: number;
  /** Arch of the leaf from base to tip. */
  leafCurve: number;
  /** V-fold along the midrib. */
  leafKeel: number;
  /** Wavy / crinkled margin amplitude (kale, cabbage), 0 = smooth. */
  leafRuffle: number;
  /** Waves per leaf edge. */
  leafRufflePeriod: number;
  /** 0 = a single flat blade; 1 = a true compound leaf: a thin petiole
   *  (rachis) carrying paired leaflets plus a terminal leaflet, like a real
   *  carrot top, tomato leaf or radish leaf. Blends between the two. */
  leafCompound: number;
  /** Leaflet pairs along the petiole, compound leaves only. */
  leafLobes: number;
  /** Serration / tooth amplitude of each leaflet's margin (compound leaves)
   *  or of the single blade's margin (simple leaves), 0 = smooth. Also
   *  scales how much bigger the terminal leaflet is on a compound leaf. */
  leafLobe: number;
  /** 0 = flat blade, 1 = round hollow tube (onion / scallion leaves). */
  leafHollow: number;
  /** Lean of the leaves from the vertical. */
  leafSpread: number;
  /** 0 = the blade tapers to a natural point, 1 = a blunt rounded tip
   *  (cabbage / lettuce heads read as blunt overlapping leaves, not spikes). */
  leafTipRound: number;
  leafColor: string;


  // ---- Flowers & fruit (vine habit) ----------------------------------------------
  flowers: boolean;
  flowersPerBranch: number;
  flowerLength: number;
  flowerRadius: number;
  flowerColor: string;
  fruitsPerBranch: number;
  fruitLength: number;
  fruitRadius: number;
  /** 0 = smooth round fruit (tomato), 1 = tapered pod (chilli pepper). */
  fruitTaper: number;
  fruitColor: string;

  // ---- Resolution -------------------------------------------------------------------
  bodySides: number;
  bodyRings: number;
  leafSides: number;
  leafRings: number;
  branchSides: number;
}

export const DEFAULT_VEG: VegParams = {
  habit: 'root',

  bodyLength: 0.18,
  bodyRadius: 0.035,
  bodyTaper: 0.7,
  bulbBulge: 0.2,
  ribCount: 8,
  ribDepth: 0.04,
  neckLength: 0.02,
  neckRadius: 0.55,
  exposure: 0.3,
  rootHairs: 6,
  rootHairLength: 0.03,
  skinColor: '#d9691f',

  crownRadius: 0.02,
  crownHeight: 0.01,

  stemHeight: 0.12,
  stemRadius: 0.012,
  stemLean: 4,
  stemColor: '#5a7a3a',

  branches: 0,
  branchFrom: 0.3,
  branchTo: 0.85,
  branchLength: 0.22,
  branchLengthV: 0.25,
  branchAngle: 55,
  branchDroop: 20,

  leaves: 10,
  leafLength: 0.22,
  leafLengthV: 0.2,
  leafWidth: 0.05,
  leafThick: 0.004,
  leafCurve: 35,
  leafKeel: 0.25,
  leafRuffle: 0,
  leafRufflePeriod: 5,
  leafCompound: 0,
  leafLobes: 5,
  leafLobe: 0,
  leafHollow: 0,
  leafSpread: 45,
  leafTipRound: 0,
  leafColor: '#4c7a34',

  flowers: false,
  flowersPerBranch: 2,
  flowerLength: 0.012,
  flowerRadius: 0.006,
  flowerColor: '#f2e14c',
  fruitsPerBranch: 3,
  fruitLength: 0.05,
  fruitRadius: 0.035,
  fruitTaper: 0,
  fruitColor: '#c9391f',

  bodySides: 24,
  bodyRings: 30,
  leafSides: 10,
  leafRings: 18,
  branchSides: 12,
};

function vegPreset(name: string, veg: Partial<VegParams>): { name: string; veg: Partial<VegParams> } {
  return { name, veg };
}

export const VEG_PRESETS: { name: string; veg: Partial<VegParams> }[] = [
  // ---- root & bulb vegetables --------------------------------------------------
  vegPreset('Carrot', {
    habit: 'root',
    bodyLength: 0.2,
    bodyRadius: 0.028,
    bodyTaper: 0.92,
    bulbBulge: 0.05,
    ribCount: 10,
    ribDepth: 0.02,
    neckLength: 0.012,
    neckRadius: 0.6,
    exposure: 0.28,
    rootHairs: 8,
    rootHairLength: 0.025,
    skinColor: '#e2711d',
    leaves: 10,
    leafLength: 0.24,
    leafLengthV: 0.18,
    leafWidth: 0.09,
    leafThick: 0.0018,
    leafCurve: 18,
    leafKeel: 0.1,
    leafCompound: 1,
    leafLobe: 0.85,
    leafLobes: 7,
    leafSpread: 32,
    leafColor: '#4f8a3d',
    bodySides: 24,
    bodyRings: 26,
    leafSides: 8,
    leafRings: 16,
  }),
  vegPreset('Beetroot', {
    habit: 'root',
    bodyLength: 0.1,
    bodyRadius: 0.05,
    bodyTaper: 0.55,
    bulbBulge: 0.75,
    ribCount: 12,
    ribDepth: 0.025,
    neckLength: 0.02,
    neckRadius: 0.4,
    exposure: 0.45,
    rootHairs: 5,
    rootHairLength: 0.03,
    skinColor: '#6b1530',
    crownRadius: 0.042,
    // 8 leaves at leafWidth 0.1/length 0.22 with only 34deg spread meant
    // just 3-4 giant leaves visibly overlapped into one dark triangular
    // "shield" silhouette instead of a legible cluster of individual
    // leaves. More, slightly narrower leaves fanned out wider reads as an
    // actual beet-leaf rosette instead of a few oversized fins.
    leaves: 12,
    leafLength: 0.21,
    leafLengthV: 0.2,
    leafWidth: 0.075,
    leafThick: 0.0032,
    leafCurve: 16,
    leafKeel: 0.16,
    leafRuffle: 0.26,
    leafRufflePeriod: 6,
    leafTipRound: 0.2,
    leafSpread: 46,
    leafColor: '#3f6b30',
    bodySides: 26,
    bodyRings: 24,
    leafSides: 10,
    leafRings: 16,
  }),
  vegPreset('Radish', {
    habit: 'root',
    bodyLength: 0.055,
    bodyRadius: 0.024,
    bodyTaper: 0.5,
    bulbBulge: 0.85,
    ribCount: 8,
    ribDepth: 0.015,
    neckLength: 0.012,
    neckRadius: 0.45,
    exposure: 0.55,
    rootHairs: 4,
    rootHairLength: 0.018,
    skinColor: '#c8283f',
    leaves: 7,
    leafLength: 0.15,
    leafLengthV: 0.2,
    leafWidth: 0.075,
    leafThick: 0.003,
    leafCurve: 28,
    leafKeel: 0.15,
    leafCompound: 1,
    leafLobe: 0.35,
    leafLobes: 3,
    leafSpread: 42,
    leafColor: '#4d7a38',
    bodySides: 22,
    bodyRings: 18,
    leafSides: 8,
    leafRings: 12,
  }),
  vegPreset('Onion', {
    habit: 'root',
    bodyLength: 0.075,
    bodyRadius: 0.045,
    bodyTaper: 0.3,
    bulbBulge: 0.95,
    ribCount: 14,
    ribDepth: 0.012,
    neckLength: 0.05,
    neckRadius: 0.22,
    exposure: 0.6,
    rootHairs: 10,
    rootHairLength: 0.016,
    skinColor: '#c99a4a',
    leaves: 6,
    leafLength: 0.34,
    leafLengthV: 0.18,
    leafWidth: 0.016,
    leafThick: 0.006,
    leafCurve: 45,
    leafKeel: 0,
    leafHollow: 1,
    leafSpread: 22,
    leafColor: '#5f8a45',
    bodySides: 28,
    bodyRings: 22,
    leafSides: 10,
    leafRings: 14,
  }),
  // ---- leafy vegetables ---------------------------------------------------------
  vegPreset('Kale', {
    habit: 'leafy',
    stemHeight: 0.1,
    stemRadius: 0.016,
    stemColor: '#5c7a4a',
    crownRadius: 0.06,
    leaves: 12,
    leafLength: 0.24,
    leafLengthV: 0.16,
    leafWidth: 0.17,
    leafThick: 0.0032,
    // leafCurve is how much the blade droops/curls along its own length —
    // at 24-32deg (plus up to +10deg jitter) each broad kale leaf arced
    // over into a tight "C", and from directly above a rosette of those
    // reads as overlapping curled balls with hard rib-like shading rather
    // than flat leaves. Kale leaves are fairly stiff and fan outward more
    // than they droop, so cut curl and push spread further.
    leafCurve: 12,
    leafKeel: 0.08,
    leafRuffle: 0.32,
    leafRufflePeriod: 8,
    leafTipRound: 0.3,
    leafSpread: 62,
    leafColor: '#3d5f3a',
    leafSides: 14,
    leafRings: 20,
    bodySides: 20,
    bodyRings: 12,
  }),
  vegPreset('Cabbage', {
    habit: 'leafy',
    stemHeight: 0.05,
    stemRadius: 0.02,
    stemColor: '#6a8a52',
    crownRadius: 0.035,
    leaves: 22,
    leafLength: 0.15,
    leafLengthV: 0.2,
    leafWidth: 0.19,
    leafThick: 0.0035,
    leafCurve: 60,
    leafKeel: 0.12,
    leafRuffle: 0.06,
    leafRufflePeriod: 5,
    leafTipRound: 0.6,
    leafSpread: 22,
    leafColor: '#7fae5c',
    leafSides: 14,
    leafRings: 18,
    bodySides: 20,
    bodyRings: 10,
  }),
  vegPreset('Lettuce', {
    habit: 'leafy',
    stemHeight: 0.035,
    stemRadius: 0.018,
    stemColor: '#7aa25c',
    crownRadius: 0.03,
    leaves: 22,
    leafLength: 0.13,
    leafLengthV: 0.16,
    leafWidth: 0.16,
    leafThick: 0.0025,
    leafCurve: 46,
    leafKeel: 0.06,
    leafRuffle: 0.4,
    leafRufflePeriod: 12,
    leafTipRound: 0.75,
    leafSpread: 34,
    leafColor: '#8fc25f',
    leafSides: 12,
    leafRings: 18,
    bodySides: 20,
    bodyRings: 10,
  }),
  // ---- fruiting vine / bush -------------------------------------------------------
  vegPreset('Tomato', {
    habit: 'vine',
    stemHeight: 0.42,
    stemRadius: 0.013,
    stemLean: 8,
    stemColor: '#5a7a3f',
    branches: 6,
    branchFrom: 0.3,
    branchTo: 0.92,
    branchLength: 0.26,
    branchLengthV: 0.3,
    branchAngle: 58,
    branchDroop: 25,
    leaves: 6,
    leafLength: 0.15,
    leafLengthV: 0.2,
    leafWidth: 0.1,
    leafThick: 0.0025,
    leafCurve: 20,
    leafKeel: 0.1,
    leafCompound: 1,
    leafLobe: 0.5,
    leafLobes: 3,
    leafSpread: 50,
    leafColor: '#4a7a3a',
    flowers: true,
    flowersPerBranch: 2,
    flowerLength: 0.01,
    flowerRadius: 0.006,
    flowerColor: '#f2d93a',
    fruitsPerBranch: 3,
    fruitLength: 0.045,
    fruitRadius: 0.032,
    fruitTaper: 0,
    fruitColor: '#d8321f',
    branchSides: 14,
    leafSides: 10,
    leafRings: 12,
    bodySides: 16,
    bodyRings: 16,
  }),
  vegPreset('Chilli Pepper', {
    habit: 'vine',
    stemHeight: 0.3,
    stemRadius: 0.009,
    stemLean: 5,
    stemColor: '#4f7a3a',
    branches: 5,
    branchFrom: 0.35,
    branchTo: 0.9,
    branchLength: 0.16,
    branchLengthV: 0.25,
    branchAngle: 50,
    branchDroop: 15,
    leaves: 6,
    leafLength: 0.075,
    leafLengthV: 0.2,
    leafWidth: 0.032,
    leafThick: 0.002,
    leafCurve: 15,
    leafKeel: 0.08,
    leafLobe: 0,
    leafSpread: 45,
    leafColor: '#3f7a38',
    flowers: true,
    flowersPerBranch: 2,
    flowerLength: 0.009,
    flowerRadius: 0.005,
    flowerColor: '#f5f5ef',
    fruitsPerBranch: 3,
    fruitLength: 0.07,
    fruitRadius: 0.011,
    fruitTaper: 0.85,
    fruitColor: '#e8391f',
    branchSides: 14,
    leafSides: 8,
    leafRings: 10,
    bodySides: 14,
    bodyRings: 14,
  }),
];

export const VEG_GROUPS: { label: string; names: string[] }[] = [
  { label: 'Vegetables · root & bulb', names: ['Carrot', 'Beetroot', 'Radish', 'Onion'] },
  { label: 'Vegetables · leafy', names: ['Kale', 'Cabbage', 'Lettuce'] },
  { label: 'Vegetables · fruiting', names: ['Tomato', 'Chilli Pepper'] },
];

/** Approximate height of a vegetable (m) above the soil, for the library metadata and framing. */
export function vegHeight(g: VegParams): number {
  switch (g.habit) {
    case 'root': {
      const above = g.bodyLength * g.exposure + g.neckLength;
      return Math.max(0.05, above + g.leafLength * 0.85);
    }
    case 'leafy':
      return Math.max(0.05, g.stemHeight + g.leafLength * 0.75);
    case 'vine':
      return Math.max(0.1, g.stemHeight * 1.05 + g.branchLength * 0.3);
  }
}

/** Habit word used in the species metadata. */
export function vegHabitWord(g: VegParams): string {
  switch (g.habit) {
    case 'root':
      return g.bulbBulge > 0.5 ? 'bulb vegetable' : 'root vegetable';
    case 'leafy':
      return 'leafy vegetable';
    case 'vine':
      return 'fruiting vegetable';
  }
}

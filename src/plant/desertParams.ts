/**
 * Desert plant parameters and species presets.
 *
 * A desert plant is described botanically: five body plans (habits) share one
 * welded-mesh engine. Columnar cacti are ribbed stems with upturned arms,
 * barrels are squat ribbed spheres, prickly pears are chains of pads
 * (flat cladodes or round cholla segments), rosettes are crowns of thick
 * toothed leaves (agave, aloe) with an optional flower stalk, and ocotillo is
 * a cluster of long thorny canes tipped with flower torches.
 *
 * Lengths are metres, angles degrees. Every preset builds as ONE closed quad
 * manifold: arms, pads, leaves, canes, areole cushions, spines, glochids,
 * fruits and flowers all leave their parent through windows cut into the
 * parent's ring grid and are welded to it with collar loops.
 */

export type DesertHabit = 'columnar' | 'barrel' | 'pads' | 'rosette' | 'canes';

export const DESERT_HABIT_NAMES: Record<DesertHabit, string> = {
  columnar: 'Columnar cactus',
  barrel: 'Barrel cactus',
  pads: 'Prickly pear / cholla',
  rosette: 'Rosette succulent',
  canes: 'Ocotillo canes',
};

export interface DesertParams {
  habit: DesertHabit;

  // ---- Body (columnar & barrel) ----------------------------------------------
  /** Height of the main stem above the ground. */
  height: number;
  /** Radius of the main stem. */
  bodyRadius: number;
  /** Vertical ribs around the stem. */
  ribs: number;
  /** Rib amplitude as a fraction of the radius. */
  ribDepth: number;
  /** Taper of the stem from base to tip (0 = column, 1 = cone). */
  bodyTaper: number;
  /** Lean of the stem from the vertical. */
  lean: number;
  leanV: number;
  /** Bend along the stem. */
  curve: number;
  /** How far the stem base is buried. */
  sink: number;

  // ---- Arms (columnar) & offsets (barrel pups, organ-pipe columns) -----------
  arms: number;
  /** Attach zone as a fraction of the above-ground height. */
  armFrom: number;
  armTo: number;
  armLength: number;
  armLengthV: number;
  /** Arm radius as a fraction of the body radius. */
  armRadius: number;
  /** Horizontal reach before the arm turns upward. */
  armOut: number;
  /** Upward turn of the arm (0 = keeps leaving direction, 90 = vertical). */
  armCurve: number;
  /** Ribs on the arms. */
  armRibs: number;

  // ---- Pads (prickly pear & cholla) ------------------------------------------
  /** Stacked pads forming the trunk. */
  trunkPads: number;
  /** Branching generations beyond the trunk. */
  padDepth: number;
  /** Children per pad. */
  padsPerPad: number;
  padLength: number;
  padLengthV: number;
  /** Pad width (flat cladodes) or segment diameter (round cholla). */
  padWidth: number;
  /** Pad thickness (flat cladodes only). */
  padThick: number;
  /** Spread angle of a child pad from its parent's axis. */
  padAngle: number;
  padAngleV: number;
  /** Extra outward nod of the pads. */
  padDroop: number;
  /** 0 = flat cladode, 1 = cylindrical cholla segment. */
  padRound: number;
  /** Random twist of each pad around its own axis, degrees. */
  padTwist: number;

  // ---- Rosette (agave, aloe, echeveria) --------------------------------------
  leaves: number;
  leafLength: number;
  leafLengthV: number;
  leafWidth: number;
  leafThick: number;
  /** Arch of the leaf from base to tip. */
  leafCurve: number;
  /** V-fold along the midrib. */
  leafKeel: number;
  /** Marginal tooth size (0 = smooth). */
  teeth: number;
  /** Teeth per leaf side. */
  teethPerSide: number;
  /** Terminal spine length. */
  terminalSpine: number;
  /** Radius / height of the leaf crown. */
  crownRadius: number;
  crownHeight: number;
  /** Lean of the outer leaves from the vertical. */
  rosetteSpread: number;

  // ---- Flower stalk (agave) ---------------------------------------------------
  stalk: boolean;
  stalkHeight: number;
  stalkRadius: number;
  stalkBranches: number;
  stalkBranchLength: number;
  /** Buds per stalk branch. */
  stalkBuds: number;
  budSize: number;

  // ---- Canes (ocotillo) --------------------------------------------------------
  canes: number;
  caneHeight: number;
  caneHeightV: number;
  caneRadius: number;
  /** Outward bow of the canes. */
  caneCurve: number;
  /** Spread of the canes from the vertical. */
  caneSpread: number;
  caneSpreadV: number;

  // ---- Areoles & spines ---------------------------------------------------------
  /** Distance between areoles along a rib / cane / pad face. */
  areoleSpacing: number;
  /** Fraction of the organ (measured from the tip) that carries areoles. */
  spineZone: number;
  /** Spines per areole (radials; the central is extra). */
  spinesPer: number;
  spineLength: number;
  spineLengthV: number;
  spineRadius: number;
  /** Central spine length as a multiple of the radials (0 = none). */
  centralSpine: number;
  /** Hook of the spines along their length (fishhook barrels). */
  spineCurve: number;
  /** Emergence angle of the radials from the areole axis. */
  spineAngle: number;
  /** Areole felt mound height. */
  areoleFelt: number;
  /** Fraction of the candidate areoles kept (thins from the base up). */
  spineDensity: number;
  /** Glochids (tiny barbed bristles) per areole. */
  glochids: number;
  glochidLength: number;
  /** Sheath flare at the spine base (cholla straw). */
  sheath: number;

  // ---- Fruits & flowers -----------------------------------------------------------
  /**
   * Fruits: a ring below the stem tip (columnar / barrel), tunas per terminal
   * pad (pads). 0 = none.
   */
  fruits: number;
  fruitLength: number;
  fruitRadius: number;
  /** Flower torches at the cane tips (ocotillo). */
  flowers: boolean;
  flowersPerTip: number;
  flowerLength: number;
  flowerRadius: number;

  // ---- Mesh resolution ------------------------------------------------------------
  /** Vertices around the body (rounded to a multiple of the rib count). */
  bodySides: number;
  /** Rings along the body. */
  bodyRings: number;
  /** Vertices around a rosette leaf. */
  leafSides: number;
  /** Rings along a rosette leaf. */
  leafRings: number;
  /** Vertices around a pad / segment. */
  padSides: number;
  /** Rings along a spine / glochid / thorn. */
  spineRings: number;
  /** Intermediate loops between a window and the first ring of the child. */
  collarRings: number;
  /** Safety cap on spine-like organs (deterministic priority from the tips down). */
  spineBudget: number;
}

export const DEFAULT_DESERT: DesertParams = {
  habit: 'columnar',

  height: 4,
  bodyRadius: 0.22,
  ribs: 16,
  ribDepth: 0.1,
  bodyTaper: 0.15,
  lean: 0,
  leanV: 3,
  curve: 4,
  sink: 0.05,

  arms: 3,
  armFrom: 0.35,
  armTo: 0.6,
  armLength: 1.8,
  armLengthV: 0.3,
  armRadius: 0.55,
  armOut: 0.6,
  armCurve: 75,
  armRibs: 12,

  trunkPads: 2,
  padDepth: 3,
  padsPerPad: 2,
  padLength: 0.3,
  padLengthV: 0.2,
  padWidth: 0.2,
  padThick: 0.035,
  padAngle: 35,
  padAngleV: 10,
  padDroop: 8,
  padRound: 0,
  padTwist: 40,

  leaves: 30,
  leafLength: 1.2,
  leafLengthV: 0.15,
  leafWidth: 0.2,
  leafThick: 0.06,
  leafCurve: 35,
  leafKeel: 0.5,
  teeth: 0.01,
  teethPerSide: 14,
  terminalSpine: 0.04,
  crownRadius: 0.28,
  crownHeight: 0.12,
  rosetteSpread: 60,

  stalk: false,
  stalkHeight: 5,
  stalkRadius: 0.04,
  stalkBranches: 14,
  stalkBranchLength: 0.35,
  stalkBuds: 4,
  budSize: 0.02,

  canes: 12,
  caneHeight: 3.2,
  caneHeightV: 0.2,
  caneRadius: 0.016,
  caneCurve: 18,
  caneSpread: 16,
  caneSpreadV: 6,

  areoleSpacing: 0.025,
  spineZone: 0.35,
  spinesPer: 5,
  spineLength: 0.025,
  spineLengthV: 0.3,
  spineRadius: 0.0008,
  centralSpine: 1.4,
  spineCurve: 0,
  spineAngle: 55,
  areoleFelt: 0.002,
  spineDensity: 1,
  glochids: 0,
  glochidLength: 0.003,
  sheath: 0,

  fruits: 0,
  fruitLength: 0.05,
  fruitRadius: 0.018,
  flowers: false,
  flowersPerTip: 4,
  flowerLength: 0.035,
  flowerRadius: 0.005,

  bodySides: 96,
  bodyRings: 70,
  leafSides: 12,
  leafRings: 36,
  padSides: 28,
  spineRings: 2,
  collarRings: 1,
  spineBudget: 12000,
};

/** Approximate height of a desert plant (m), for the library metadata and framing. */
export function desertHeight(g: DesertParams): number {
  switch (g.habit) {
    case 'columnar':
      return Math.max(0.3, g.height * 1.02);
    case 'barrel':
      return Math.max(0.15, g.height * 1.05);
    case 'pads': {
      const tiers = g.trunkPads + g.padDepth;
      return Math.max(0.2, tiers * g.padLength * 0.8);
    }
    case 'rosette': {
      const leafTop = g.crownHeight + g.leafLength * 0.75;
      return g.stalk ? Math.max(leafTop, g.stalkHeight) : Math.max(0.05, leafTop);
    }
    case 'canes':
      return Math.max(0.5, g.caneHeight * (1 + g.caneHeightV * 0.4));
  }
}

/** Habit word used in the species metadata. */
export function desertHabitWord(g: DesertParams): string {
  switch (g.habit) {
    case 'columnar':
      return g.arms >= 8 ? 'multi-column' : 'tree cactus';
    case 'barrel':
      return 'barrel';
    case 'pads':
      return g.padRound > 0.5 ? 'jointed cholla' : 'prickly pear';
    case 'rosette':
      return g.stalk ? 'rosette in bloom' : 'rosette';
    case 'canes':
      return 'cane colony';
  }
}

/** Species presets. Values are typical field measurements of the species. */
export const DESERT_PRESETS: { name: string; desert: Partial<DesertParams> }[] = [
  // ---- columnar cacti ----------------------------------------------------------
  {
    name: 'Saguaro',
    desert: {
      habit: 'columnar',
      height: 6.5,
      bodyRadius: 0.24,
      ribs: 16,
      ribDepth: 0.09,
      bodyTaper: 0.2,
      leanV: 2,
      curve: 3,
      arms: 4,
      armFrom: 0.35,
      armTo: 0.58,
      armLength: 2.4,
      armLengthV: 0.35,
      armRadius: 0.52,
      armOut: 0.7,
      armCurve: 78,
      armRibs: 12,
      areoleSpacing: 0.03,
      spineZone: 0.14,
      spinesPer: 5,
      spineLength: 0.025,
      spineLengthV: 0.3,
      spineRadius: 0.0009,
      centralSpine: 1.3,
      spineAngle: 55,
      areoleFelt: 0.0025,
      fruits: 8,
      fruitLength: 0.06,
      fruitRadius: 0.02,
      bodySides: 112,
      bodyRings: 90,
    },
  },
  {
    name: 'Cardon',
    desert: {
      habit: 'columnar',
      height: 9,
      bodyRadius: 0.5,
      ribs: 18,
      ribDepth: 0.08,
      bodyTaper: 0.12,
      leanV: 2,
      curve: 2,
      arms: 5,
      armFrom: 0.45,
      armTo: 0.7,
      armLength: 3.5,
      armLengthV: 0.35,
      armRadius: 0.42,
      armOut: 1.1,
      armCurve: 80,
      armRibs: 14,
      areoleSpacing: 0.035,
      spineZone: 0.1,
      spinesPer: 5,
      spineLength: 0.02,
      spineRadius: 0.0008,
      centralSpine: 1.2,
      spineAngle: 55,
      areoleFelt: 0.003,
      fruits: 10,
      fruitLength: 0.055,
      fruitRadius: 0.02,
      bodySides: 126,
      bodyRings: 110,
    },
  },
  {
    name: 'Organ Pipe',
    desert: {
      habit: 'columnar',
      height: 3.6,
      bodyRadius: 0.13,
      ribs: 13,
      ribDepth: 0.12,
      bodyTaper: 0.1,
      arms: 12,
      armFrom: 0.0,
      armTo: 0.12,
      armLength: 3.2,
      armLengthV: 0.25,
      armRadius: 0.85,
      armOut: 0.55,
      armCurve: 22,
      armRibs: 12,
      areoleSpacing: 0.035,
      spineZone: 0.3,
      spinesPer: 4,
      spineLength: 0.018,
      spineLengthV: 0.25,
      spineRadius: 0.0007,
      centralSpine: 0,
      spineAngle: 50,
      spineDensity: 0.7,
      areoleFelt: 0.002,
      bodySides: 78,
      bodyRings: 60,
    },
  },
  {
    // Cereus repandus / peruvianus: candelabra-like, few (5-9) rounded ribs,
    // basally branching into several near-vertical trunks, sparse short
    // spines, terminal ring of egg-shaped "Peruvian apple" fruit.
    name: 'Peruvian Apple Cactus',
    desert: {
      habit: 'columnar',
      height: 4.6,
      bodyRadius: 0.11,
      ribs: 8,
      ribDepth: 0.16,
      bodyTaper: 0.03,
      leanV: 2,
      curve: 3,
      arms: 5,
      armFrom: 0.04,
      armTo: 0.16,
      armLength: 3.8,
      armLengthV: 0.2,
      armRadius: 0.92,
      armOut: 0.16,
      armCurve: 82,
      armRibs: 8,
      areoleSpacing: 0.05,
      spineZone: 0.9,
      spinesPer: 5,
      spineLength: 0.013,
      spineLengthV: 0.3,
      spineRadius: 0.0006,
      centralSpine: 1.1,
      spineAngle: 55,
      spineDensity: 0.55,
      areoleFelt: 0.0012,
      fruits: 8,
      fruitLength: 0.045,
      fruitRadius: 0.022,
      bodySides: 64,
      bodyRings: 84,
    },
  },
  {
    // Pachycereus schottii f. monstrosus: spineless, knobby 5-9 ribbed
    // columns clustering from the base — armFrom≈0 turns on organ-pipe mode.
    name: 'Totem Pole Cactus',
    desert: {
      habit: 'columnar',
      height: 2.4,
      bodyRadius: 0.16,
      ribs: 7,
      ribDepth: 0.28,
      bodyTaper: 0.08,
      arms: 12,
      armFrom: 0.0,
      armTo: 0.1,
      armLength: 2.2,
      armLengthV: 0.3,
      armRadius: 0.8,
      armOut: 0.3,
      armCurve: 14,
      armRibs: 7,
      areoleSpacing: 0.04,
      spineZone: 0,
      spinesPer: 0,
      spineLength: 0.006,
      spineRadius: 0.0004,
      centralSpine: 0,
      spineDensity: 0,
      areoleFelt: 0.0035,
      fruits: 0,
      bodySides: 56,
      bodyRings: 50,
    },
  },
  {
    // Cephalocereus senilis: slender unbranched column, 20-30 shallow ribs,
    // areoles crowded with long white hair-like radials over short yellow
    // centrals — modelled as very long, thin, dense radial spines.
    name: 'Old Man Cactus',
    desert: {
      habit: 'columnar',
      height: 1.9,
      bodyRadius: 0.11,
      ribs: 18,
      ribDepth: 0.06,
      bodyTaper: 0.08,
      leanV: 2,
      curve: 2,
      arms: 0,
      areoleSpacing: 0.02,
      spineZone: 1,
      spinesPer: 6,
      spineLength: 0.085,
      spineLengthV: 0.35,
      spineRadius: 0.00028,
      centralSpine: 0.55,
      spineCurve: 25,
      spineAngle: 68,
      spineDensity: 1,
      areoleFelt: 0.0018,
      bodySides: 84,
      bodyRings: 70,
    },
  },

  // ---- barrels ------------------------------------------------------------------
  {
    name: 'Golden Barrel',
    desert: {
      habit: 'barrel',
      height: 0.6,
      bodyRadius: 0.32,
      ribs: 20,
      ribDepth: 0.13,
      arms: 0,
      areoleSpacing: 0.024,
      spineZone: 1,
      spinesPer: 6,
      spineLength: 0.032,
      spineLengthV: 0.2,
      spineRadius: 0.0007,
      centralSpine: 1.5,
      spineAngle: 50,
      spineDensity: 0.9,
      areoleFelt: 0.003,
      bodySides: 120,
      bodyRings: 48,
    },
  },
  {
    name: 'Fishhook Barrel',
    desert: {
      habit: 'barrel',
      height: 1.0,
      bodyRadius: 0.38,
      ribs: 17,
      ribDepth: 0.14,
      arms: 2,
      armFrom: 0.02,
      armTo: 0.35,
      armLength: 0.45,
      armLengthV: 0.3,
      armRadius: 0.32,
      armOut: 0.25,
      armCurve: 45,
      armRibs: 12,
      areoleSpacing: 0.026,
      spineZone: 1,
      spinesPer: 6,
      spineLength: 0.035,
      spineLengthV: 0.25,
      spineRadius: 0.0009,
      centralSpine: 1.8,
      spineCurve: 55,
      spineAngle: 50,
      spineDensity: 0.9,
      areoleFelt: 0.003,
      fruits: 10,
      fruitLength: 0.03,
      fruitRadius: 0.014,
      bodySides: 102,
      bodyRings: 56,
    },
  },
  {
    // Ferocactus cylindraceus: solitary ribbed barrel, 18-30 ribs, one strong
    // hooked/recurved central spine per areole up to 12 cm plus a dense radial
    // fan; the "compass barrel" leans southwest but we keep it upright here.
    name: 'Compass Barrel',
    desert: {
      habit: 'barrel',
      height: 1.35,
      bodyRadius: 0.27,
      ribs: 24,
      ribDepth: 0.15,
      arms: 0,
      areoleSpacing: 0.03,
      spineZone: 1,
      spinesPer: 7,
      spineLength: 0.045,
      spineLengthV: 0.25,
      spineRadius: 0.0009,
      centralSpine: 2.4,
      spineCurve: 65,
      spineAngle: 48,
      spineDensity: 0.95,
      areoleFelt: 0.0028,
      fruits: 12,
      fruitLength: 0.032,
      fruitRadius: 0.014,
      bodySides: 132,
      bodyRings: 60,
    },
  },

  // ---- prickly pears ---------------------------------------------------------------
  {
    name: 'Prickly Pear',
    desert: {
      habit: 'pads',
      trunkPads: 2,
      padDepth: 3,
      padsPerPad: 2,
      padLength: 0.32,
      padLengthV: 0.2,
      padWidth: 0.2,
      padThick: 0.035,
      padAngle: 38,
      padAngleV: 12,
      padDroop: 10,
      padRound: 0,
      padTwist: 45,
      areoleSpacing: 0.035,
      spineZone: 1,
      spinesPer: 1,
      spineLength: 0.02,
      spineLengthV: 0.4,
      spineRadius: 0.0006,
      centralSpine: 0,
      spineAngle: 45,
      spineDensity: 0.5,
      glochids: 4,
      glochidLength: 0.003,
      areoleFelt: 0.0015,
      fruits: 3,
      fruitLength: 0.06,
      fruitRadius: 0.02,
      padSides: 28,
    },
  },
  {
    name: 'Teddy-Bear Cholla',
    desert: {
      habit: 'pads',
      trunkPads: 1,
      padDepth: 3,
      padsPerPad: 3,
      padLength: 0.11,
      padLengthV: 0.15,
      padWidth: 0.04,
      padThick: 0.04,
      padAngle: 42,
      padAngleV: 14,
      padDroop: 12,
      padRound: 1,
      padTwist: 60,
      areoleSpacing: 0.014,
      spineZone: 1,
      spinesPer: 6,
      spineLength: 0.02,
      spineLengthV: 0.25,
      spineRadius: 0.0005,
      centralSpine: 1.2,
      spineAngle: 45,
      spineDensity: 0.85,
      areoleFelt: 0.0015,
      sheath: 0.9,
      padSides: 12,
    },
  },
  {
    // Opuntia basilaris: low, spineless clump of thick blue-grey spatulate
    // pads; only glochid tufts, no spines, small compact habit.
    name: 'Beavertail Prickly Pear',
    desert: {
      habit: 'pads',
      trunkPads: 1,
      padDepth: 2,
      padsPerPad: 3,
      padLength: 0.22,
      padLengthV: 0.18,
      padWidth: 0.15,
      padThick: 0.028,
      padAngle: 44,
      padAngleV: 14,
      padDroop: 14,
      padRound: 0,
      padTwist: 35,
      areoleSpacing: 0.026,
      spineZone: 0,
      spinesPer: 0,
      spineLength: 0.004,
      spineRadius: 0.0004,
      centralSpine: 0,
      spineDensity: 0,
      glochids: 6,
      glochidLength: 0.0035,
      areoleFelt: 0.0012,
      fruits: 2,
      fruitLength: 0.045,
      fruitRadius: 0.016,
      padSides: 24,
    },
  },
  {
    // Cylindropuntia fulgida: arborescent chain-fruit cholla — a low trunk
    // spreading into many drooping, densely spined cylindrical segments,
    // tipped with the long-lived fruit chains that give it its name.
    name: 'Chain-Fruit Cholla',
    desert: {
      habit: 'pads',
      trunkPads: 1,
      padDepth: 4,
      padsPerPad: 3,
      padLength: 0.14,
      padLengthV: 0.2,
      padWidth: 0.032,
      padThick: 0.032,
      padAngle: 48,
      padAngleV: 16,
      padDroop: 26,
      padRound: 1,
      padTwist: 55,
      areoleSpacing: 0.016,
      spineZone: 1,
      spinesPer: 7,
      spineLength: 0.022,
      spineLengthV: 0.2,
      spineRadius: 0.00045,
      centralSpine: 1,
      spineAngle: 48,
      spineDensity: 0.9,
      areoleFelt: 0.0012,
      sheath: 0.5,
      fruits: 1,
      fruitLength: 0.035,
      fruitRadius: 0.015,
      padSides: 14,
    },
  },

  // ---- rosettes ----------------------------------------------------------------------
  {
    name: 'Century Plant',
    desert: {
      habit: 'rosette',
      leaves: 34,
      leafLength: 1.7,
      leafLengthV: 0.15,
      leafWidth: 0.22,
      leafThick: 0.07,
      leafCurve: 32,
      leafKeel: 0.45,
      teeth: 0.012,
      teethPerSide: 14,
      terminalSpine: 0.05,
      crownRadius: 0.3,
      crownHeight: 0.14,
      rosetteSpread: 62,
      leafSides: 12,
      leafRings: 40,
    },
  },
  {
    name: 'Agave in Bloom',
    desert: {
      habit: 'rosette',
      leaves: 30,
      leafLength: 1.5,
      leafLengthV: 0.15,
      leafWidth: 0.2,
      leafThick: 0.065,
      leafCurve: 38,
      leafKeel: 0.45,
      teeth: 0.01,
      teethPerSide: 13,
      terminalSpine: 0.045,
      crownRadius: 0.28,
      crownHeight: 0.12,
      rosetteSpread: 66,
      stalk: true,
      stalkHeight: 5.5,
      stalkRadius: 0.045,
      stalkBranches: 14,
      stalkBranchLength: 0.35,
      stalkBuds: 4,
      budSize: 0.02,
      leafSides: 12,
      leafRings: 40,
    },
  },
  {
    // Agave tequilana: rigid, glaucous blue-grey lance leaves in a tight
    // globe rosette, small brown marginal teeth and a stout terminal spine.
    name: 'Blue Agave',
    desert: {
      habit: 'rosette',
      leaves: 44,
      leafLength: 1.05,
      leafLengthV: 0.14,
      leafWidth: 0.11,
      leafThick: 0.05,
      leafCurve: 26,
      leafKeel: 0.55,
      teeth: 0.006,
      teethPerSide: 22,
      terminalSpine: 0.035,
      crownRadius: 0.22,
      crownHeight: 0.1,
      rosetteSpread: 50,
      leafSides: 12,
      leafRings: 34,
    },
  },
  {
    // Dasylirion wheeleri: a dense sphere of hundreds of thin, flexible,
    // finely serrated grass-like leaves radiating from a short trunk — no
    // keel, small even teeth, no terminal spine (frayed fibrous tip instead).
    name: 'Desert Spoon',
    desert: {
      habit: 'rosette',
      leaves: 130,
      leafLength: 0.62,
      leafLengthV: 0.2,
      leafWidth: 0.018,
      leafThick: 0.0035,
      leafCurve: 55,
      leafKeel: 0.08,
      teeth: 0.0022,
      teethPerSide: 20,
      terminalSpine: 0.004,
      crownRadius: 0.22,
      crownHeight: 0.16,
      rosetteSpread: 78,
      leafSides: 8,
      leafRings: 22,
    },
  },
  {
    name: 'Aloe Vera',
    desert: {
      habit: 'rosette',
      leaves: 20,
      leafLength: 0.55,
      leafLengthV: 0.15,
      leafWidth: 0.09,
      leafThick: 0.035,
      leafCurve: 48,
      leafKeel: 0.35,
      teeth: 0.004,
      teethPerSide: 12,
      terminalSpine: 0.008,
      crownRadius: 0.12,
      crownHeight: 0.05,
      rosetteSpread: 55,
      leafSides: 10,
      leafRings: 28,
    },
  },
  {
    name: 'Echeveria',
    desert: {
      habit: 'rosette',
      leaves: 46,
      leafLength: 0.085,
      leafLengthV: 0.12,
      leafWidth: 0.045,
      leafThick: 0.018,
      leafCurve: 28,
      leafKeel: 0.3,
      teeth: 0,
      teethPerSide: 0,
      terminalSpine: 0.003,
      crownRadius: 0.05,
      crownHeight: 0.02,
      rosetteSpread: 50,
      leafSides: 10,
      leafRings: 16,
    },
  },

  // ---- ocotillo ------------------------------------------------------------------------
  {
    name: 'Ocotillo',
    desert: {
      habit: 'canes',
      canes: 14,
      caneHeight: 3.4,
      caneHeightV: 0.2,
      caneRadius: 0.016,
      caneCurve: 18,
      caneSpread: 16,
      caneSpreadV: 6,
      areoleSpacing: 0.045,
      spineZone: 1,
      spinesPer: 1,
      spineLength: 0.022,
      spineLengthV: 0.2,
      spineRadius: 0.0009,
      centralSpine: 0,
      spineCurve: 12,
      spineAngle: 60,
      spineDensity: 1,
      areoleFelt: 0.001,
      flowers: true,
      flowersPerTip: 4,
      flowerLength: 0.035,
      flowerRadius: 0.005,
      bodySides: 10,
      bodyRings: 40,
    },
  },
];

export const DESERT_GROUPS: { label: string; names: string[] }[] = [
  {
    label: 'Cacti · columnar & barrels',
    names: [
      'Saguaro', 'Cardon', 'Organ Pipe', 'Peruvian Apple Cactus', 'Totem Pole Cactus', 'Old Man Cactus',
      'Golden Barrel', 'Fishhook Barrel', 'Compass Barrel',
    ],
  },
  { label: 'Cacti · prickly pears', names: ['Prickly Pear', 'Beavertail Prickly Pear', 'Teddy-Bear Cholla', 'Chain-Fruit Cholla'] },
  { label: 'Succulents · rosettes', names: ['Century Plant', 'Agave in Bloom', 'Blue Agave', 'Desert Spoon', 'Aloe Vera', 'Echeveria'] },
  { label: 'Succulents · ocotillo', names: ['Ocotillo'] },
];

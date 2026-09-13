/**
 * Jungle plant parameters and species presets: palms (feather & fan),
 * banana-family plants and ferns.
 *
 * All four habits share one trunk/pseudostem + frond-crown engine, welded
 * with the same window/collar discipline as the trees, grasses and desert
 * plants. Feather palms and ferns carry pinnate fronds (a curving rachis with
 * paired leaflets); fan palms carry palmate fronds (blade segments radiating
 * from a short petiole); banana-family plants carry single huge paddle
 * blades stacked up the pseudostem.
 */

export type JungleHabit = 'pinnate' | 'palmate' | 'banana' | 'fern';

export const JUNGLE_HABIT_NAMES: Record<JungleHabit, string> = {
  pinnate: 'Feather palm (pinnate)',
  palmate: 'Fan palm (palmate)',
  banana: 'Banana / bird-of-paradise',
  fern: 'Fern',
};

export interface JungleParams {
  habit: JungleHabit;

  // ---- Trunk / pseudostem ----------------------------------------------------
  trunkHeight: number;
  trunkRadius: number;
  /** Taper of the trunk from base to tip (0 = column, 1 = strong cone). */
  trunkTaper: number;
  /** Extra swell at `trunkBulgeAt`, as a fraction of the radius (0 = none). */
  trunkBulge: number;
  trunkBulgeAt: number;
  trunkLean: number;
  trunkLeanV: number;
  /** Gentle S-bend along the trunk. */
  trunkCurve: number;
  /** Leaf-scar / fibre ring groove amplitude (0 = smooth). */
  ringScars: number;
  ringSpacing: number;
  /** How far the trunk base is buried. */
  sink: number;

  // ---- Frond / leaf crown -----------------------------------------------------
  fronds: number;
  /** Attach band as a fraction of the above-ground trunk height. */
  frondFrom: number;
  frondTo: number;
  frondLength: number;
  frondLengthV: number;
  /** Horizontal reach before the frond bends under its own weight. */
  frondReach: number;
  /** Downward droop of the frond tip, degrees. */
  frondDroop: number;
  frondDroopV: number;
  /** Emergence angle from the trunk axis, degrees (0 = straight up). */
  frondLean: number;
  frondRadius: number;
  /** Cross-section sides of the rachis / petiole. */
  frondRibs: number;

  // ---- Pinnate leaflets (feather palms & ferns) --------------------------------
  /** Leaflets per side of the rachis. */
  leaflets: number;
  leafletLength: number;
  leafletLengthV: number;
  leafletWidth: number;
  /** Droop of an individual leaflet from the rachis plane, degrees. */
  leafletCurve: number;
  /** Splay angle of a leaflet pair from the rachis, degrees. */
  leafletAngle: number;
  /** Marginal serration amplitude (ferns), 0 = smooth. */
  leafletTeeth: number;

  // ---- Palmate segments (fan palms) --------------------------------------------
  /** Blade segments radiating from the petiole tip. */
  segments: number;
  /** Droop of each segment's outer third, degrees. */
  segmentDroop: number;
  /** Angular spread of the whole fan, degrees. */
  segmentSpread: number;

  // ---- Banana / bird-of-paradise blade ------------------------------------------
  bladeWidth: number;
  /** Midrib channel prominence (V-fold depth). */
  bladeKeel: number;
  /** Wind-tear notch amplitude along the margin, 0 = smooth. */
  bladeTearing: number;

  // ---- Fruit cluster ------------------------------------------------------------
  fruitCluster: boolean;
  fruits: number;
  fruitLength: number;
  fruitRadius: number;
  /** Downward curve of each fruit, degrees. */
  fruitCurve: number;

  // ---- Flower / bud ---------------------------------------------------------------
  flower: boolean;
  flowerLength: number;
  flowerRadius: number;
  /** true = hangs down on a drooping peduncle (banana); false = held up near the crown. */
  flowerHang: boolean;

  // ---- Mesh resolution --------------------------------------------------------------
  trunkSides: number;
  trunkRings: number;
  leafletSides: number;
  leafletRings: number;
  collarRings: number;

  // ---- Colour -------------------------------------------------------------------------
  trunkColor: string;
  leafColor: string;
  flowerColor: string;
  fruitColor: string;
}

export const DEFAULT_JUNGLE: JungleParams = {
  habit: 'pinnate',

  trunkHeight: 8,
  trunkRadius: 0.18,
  trunkTaper: 0.25,
  trunkBulge: 0,
  trunkBulgeAt: 0.15,
  trunkLean: 0,
  trunkLeanV: 3,
  trunkCurve: 5,
  ringScars: 0.05,
  ringSpacing: 0.22,
  sink: 0.05,

  fronds: 16,
  frondFrom: 0.9,
  frondTo: 0.99,
  frondLength: 3.2,
  frondLengthV: 0.15,
  frondReach: 0.5,
  frondDroop: 55,
  frondDroopV: 10,
  frondLean: 35,
  frondRadius: 0.03,
  frondRibs: 8,

  leaflets: 45,
  leafletLength: 0.5,
  leafletLengthV: 0.2,
  leafletWidth: 0.03,
  leafletCurve: 25,
  leafletAngle: 100,
  leafletTeeth: 0,

  segments: 40,
  segmentDroop: 35,
  segmentSpread: 200,

  bladeWidth: 0.6,
  bladeKeel: 0.4,
  bladeTearing: 0,

  fruitCluster: false,
  fruits: 6,
  fruitLength: 0.15,
  fruitRadius: 0.08,
  fruitCurve: 20,

  flower: false,
  flowerLength: 0.2,
  flowerRadius: 0.06,
  flowerHang: false,

  trunkSides: 32,
  trunkRings: 48,
  leafletSides: 8,
  leafletRings: 10,
  collarRings: 1,

  trunkColor: '#8a7256',
  leafColor: '#3f7a3a',
  flowerColor: '#caa7e0',
  fruitColor: '#7a5230',
};

/** Approximate overall height of a jungle plant (m), for the library metadata and framing. */
export function jungleHeight(g: JungleParams): number {
  switch (g.habit) {
    case 'palmate':
      return Math.max(0.4, g.trunkHeight + g.frondLength * 0.55);
    case 'banana':
      return Math.max(0.4, g.trunkHeight + g.frondLength * 0.75);
    case 'fern':
      return Math.max(0.15, g.trunkHeight + g.frondLength * 0.7);
    case 'pinnate':
    default:
      return Math.max(0.4, g.trunkHeight + g.frondLength * 0.5);
  }
}

/** Habit word used in the species metadata. */
export function jungleHabitWord(g: JungleParams): string {
  switch (g.habit) {
    case 'pinnate':
      return g.fruitCluster ? 'feather palm in fruit' : 'feather palm';
    case 'palmate':
      return 'fan palm';
    case 'banana':
      return g.flowerHang ? 'banana plant' : 'bird-of-paradise';
    case 'fern':
      return g.trunkHeight > 0.6 ? 'tree fern' : 'ground fern';
  }
}

/** Species presets. Values are typical field measurements of the species. */
export const JUNGLE_PRESETS: { name: string; jungle: Partial<JungleParams> }[] = [
  // ---- feather palms (pinnate) ------------------------------------------------
  {
    name: 'Coconut Palm',
    jungle: {
      habit: 'pinnate',
      trunkHeight: 11,
      trunkRadius: 0.17,
      trunkTaper: 0.3,
      trunkBulge: 0.25,
      trunkBulgeAt: 0.08,
      trunkCurve: 14,
      trunkLeanV: 4,
      ringScars: 0.06,
      ringSpacing: 0.2,
      fronds: 17,
      frondFrom: 0.88,
      frondTo: 0.99,
      frondLength: 4.4,
      frondLengthV: 0.12,
      frondReach: 0.6,
      frondDroop: 60,
      frondLean: 32,
      frondRadius: 0.035,
      leaflets: 100,
      leafletLength: 0.6,
      leafletLengthV: 0.2,
      leafletWidth: 0.028,
      leafletCurve: 20,
      leafletAngle: 96,
      fruitCluster: true,
      fruits: 7,
      fruitLength: 0.17,
      fruitRadius: 0.095,
      fruitCurve: 15,
      fruitColor: '#5b4326',
      trunkColor: '#9c8563',
      leafColor: '#2f6b34',
    },
  },
  {
    name: 'Date Palm',
    jungle: {
      habit: 'pinnate',
      trunkHeight: 8,
      trunkRadius: 0.22,
      trunkTaper: 0.12,
      trunkCurve: 4,
      ringScars: 0.1,
      ringSpacing: 0.13,
      fronds: 26,
      frondFrom: 0.82,
      frondTo: 0.98,
      frondLength: 3,
      frondLengthV: 0.15,
      frondReach: 0.4,
      frondDroop: 35,
      frondLean: 40,
      frondRadius: 0.028,
      leaflets: 70,
      leafletLength: 0.32,
      leafletLengthV: 0.2,
      leafletWidth: 0.016,
      leafletCurve: 15,
      leafletAngle: 70,
      fruitCluster: true,
      fruits: 14,
      fruitLength: 0.028,
      fruitRadius: 0.013,
      fruitCurve: 30,
      fruitColor: '#b5762c',
      trunkColor: '#8b6f4c',
      leafColor: '#6f8a4f',
    },
  },
  {
    name: 'Areca Palm',
    jungle: {
      habit: 'pinnate',
      trunkHeight: 4.5,
      trunkRadius: 0.08,
      trunkTaper: 0.15,
      trunkCurve: 10,
      trunkLeanV: 6,
      ringScars: 0.14,
      ringSpacing: 0.09,
      fronds: 10,
      frondFrom: 0.88,
      frondTo: 0.99,
      frondLength: 2,
      frondLengthV: 0.1,
      frondReach: 0.35,
      frondDroop: 45,
      frondLean: 28,
      frondRadius: 0.016,
      leaflets: 55,
      leafletLength: 0.32,
      leafletLengthV: 0.15,
      leafletWidth: 0.014,
      leafletCurve: 18,
      leafletAngle: 90,
      fruitCluster: false,
      trunkColor: '#a99259',
      leafColor: '#3f8b4a',
    },
  },

  // ---- fan palms (palmate) -----------------------------------------------------
  {
    name: 'Washingtonia Fan Palm',
    jungle: {
      habit: 'palmate',
      trunkHeight: 13,
      trunkRadius: 0.14,
      trunkTaper: 0.08,
      trunkCurve: 3,
      ringScars: 0.16,
      ringSpacing: 0.1,
      fronds: 22,
      frondFrom: 0.86,
      frondTo: 0.99,
      frondLength: 1.1,
      frondLengthV: 0.1,
      frondReach: 0.5,
      frondLean: 34,
      frondRadius: 0.02,
      segments: 44,
      segmentDroop: 40,
      segmentSpread: 210,
      leafletWidth: 0.05,
      trunkColor: '#a89468',
      leafColor: '#63925a',
    },
  },
  {
    name: 'Mediterranean Fan Palm',
    jungle: {
      habit: 'palmate',
      trunkHeight: 2.4,
      trunkRadius: 0.1,
      trunkTaper: 0.1,
      trunkCurve: 6,
      trunkLeanV: 8,
      ringScars: 0.18,
      ringSpacing: 0.08,
      fronds: 14,
      frondFrom: 0.75,
      frondTo: 0.98,
      frondLength: 0.55,
      frondLengthV: 0.12,
      frondReach: 0.35,
      frondLean: 45,
      frondRadius: 0.012,
      segments: 26,
      segmentDroop: 30,
      segmentSpread: 220,
      leafletWidth: 0.03,
      trunkColor: '#8f7c53',
      leafColor: '#6f9450',
    },
  },

  // ---- banana family --------------------------------------------------------------
  {
    name: 'Banana Plant',
    jungle: {
      habit: 'banana',
      trunkHeight: 2.7,
      trunkRadius: 0.2,
      trunkTaper: 0.1,
      trunkCurve: 2,
      ringScars: 0,
      fronds: 9,
      frondFrom: 0.22,
      frondTo: 0.96,
      frondLength: 2.1,
      frondLengthV: 0.15,
      frondReach: 0.3,
      frondDroop: 30,
      frondLean: 20,
      frondRadius: 0.02,
      bladeWidth: 0.62,
      bladeKeel: 0.5,
      bladeTearing: 0.35,
      fruitCluster: true,
      fruits: 5,
      fruitLength: 0.16,
      fruitRadius: 0.028,
      fruitCurve: 60,
      fruitColor: '#c7c24a',
      flower: true,
      flowerLength: 0.16,
      flowerRadius: 0.07,
      flowerHang: true,
      flowerColor: '#7a2e46',
      trunkColor: '#4d6b3a',
      leafColor: '#2f7a3d',
    },
  },
  {
    name: 'Giant Bird-of-Paradise',
    jungle: {
      habit: 'banana',
      trunkHeight: 3.4,
      trunkRadius: 0.13,
      trunkTaper: 0.05,
      trunkCurve: 3,
      ringScars: 0,
      fronds: 9,
      frondFrom: 0.3,
      frondTo: 0.97,
      frondLength: 1.7,
      frondLengthV: 0.12,
      frondReach: 0.25,
      frondDroop: 15,
      frondLean: 15,
      frondRadius: 0.018,
      bladeWidth: 0.55,
      bladeKeel: 0.55,
      bladeTearing: 0.1,
      fruitCluster: false,
      flower: true,
      flowerLength: 0.28,
      flowerRadius: 0.05,
      flowerHang: false,
      flowerColor: '#e8e2d0',
      trunkColor: '#496b3f',
      leafColor: '#356239',
    },
  },

  // ---- ferns -------------------------------------------------------------------------
  {
    name: 'Boston Fern',
    jungle: {
      habit: 'fern',
      trunkHeight: 0.04,
      trunkRadius: 0.05,
      trunkTaper: 0,
      ringScars: 0,
      fronds: 24,
      frondFrom: 0.05,
      frondTo: 0.95,
      frondLength: 0.5,
      frondLengthV: 0.2,
      frondReach: 0.12,
      frondDroop: 70,
      frondLean: 20,
      frondRadius: 0.006,
      leaflets: 30,
      leafletLength: 0.055,
      leafletLengthV: 0.2,
      leafletWidth: 0.01,
      leafletCurve: 10,
      leafletAngle: 85,
      leafletTeeth: 0.15,
      trunkColor: '#5a4530',
      leafColor: '#4a9a4f',
    },
  },
  {
    name: 'Tree Fern',
    jungle: {
      habit: 'fern',
      trunkHeight: 2.6,
      trunkRadius: 0.11,
      trunkTaper: 0.06,
      ringScars: 0.2,
      ringSpacing: 0.07,
      fronds: 16,
      frondFrom: 0.86,
      frondTo: 0.99,
      frondLength: 1.9,
      frondLengthV: 0.12,
      frondReach: 0.3,
      frondDroop: 40,
      frondLean: 22,
      frondRadius: 0.02,
      leaflets: 60,
      leafletLength: 0.16,
      leafletLengthV: 0.2,
      leafletWidth: 0.016,
      leafletCurve: 15,
      leafletAngle: 90,
      leafletTeeth: 0.1,
      trunkColor: '#4a3a2a',
      leafColor: '#3f8a49',
    },
  },
];

export const JUNGLE_GROUPS: { label: string; names: string[] }[] = [
  { label: 'Palms · feather (pinnate)', names: ['Coconut Palm', 'Date Palm', 'Areca Palm'] },
  { label: 'Palms · fan (palmate)', names: ['Washingtonia Fan Palm', 'Mediterranean Fan Palm'] },
  { label: 'Jungle · banana & relatives', names: ['Banana Plant', 'Giant Bird-of-Paradise'] },
  { label: 'Ferns', names: ['Boston Fern', 'Tree Fern'] },
];

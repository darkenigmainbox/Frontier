// ─── Road & rail preset library ──────────────────────────────────────────────
// Widths are meters. Lanes are listed left → right relative to travel direction.

export type LaneKind = 'drive' | 'parking' | 'bike' | 'bus' | 'median' | 'verge';

export interface LaneSpec {
  width: number;
  /** Travel direction of this lane: +1 with stroke direction, -1 against, 0 none. */
  dir: 1 | -1 | 0;
  kind: LaneKind;
}

export type RoadCategory = 'highway' | 'arterial' | 'street' | 'rural' | 'offroad' | 'special';

export type SurfaceKind = 'asphalt' | 'concrete' | 'gravel' | 'dirt' | 'grass' | 'cobble';

export interface MarkingSpec {
  center: 'none' | 'single' | 'double' | 'double-yellow' | 'dashed';
  lane: 'none' | 'dashed' | 'solid';
  edge: boolean;
  crosswalk: boolean;
  stopLine: boolean;
  color: string;
}

export interface PavementSpec {
  width: number;
  height: number;
  /** Curb ramp (dropped curb) at junction entries. */
  ramps: boolean;
}

export interface RoadPreset {
  id: string;
  name: string;
  category: RoadCategory;
  /** Lanes left→right excluding pavements. */
  lanes: LaneSpec[];
  /** Extra width (m) beyond lanes on each side (gravel shoulder / verge). */
  shoulder: number;
  pavement: PavementSpec | null;
  markings: MarkingSpec;
  speed: number;
  surface: SurfaceKind;
  color: string;
  markingColor: string;
  pavementColor: string;
  curbColor: string;
  bridgeRails: boolean;
  description: string;
}

const NO_MARK: MarkingSpec = { center: 'none', lane: 'none', edge: false, crosswalk: false, stopLine: false, color: '#ffffff' };

function road(p: Partial<RoadPreset> & { id: string; name: string; category: RoadCategory; lanes: LaneSpec[]; description: string }): RoadPreset {
  return {
    shoulder: 0,
    pavement: null,
    markings: { center: 'single', lane: 'dashed', edge: true, crosswalk: true, stopLine: true, color: '#e8e8e8' },
    speed: 50,
    surface: 'asphalt',
    color: '#33343a',
    markingColor: '#e8e8e8',
    pavementColor: '#9a9aa0',
    curbColor: '#7c7c82',
    bridgeRails: true,
    ...p,
  };
}

function drive(width: number, dir: 1 | -1 = 1, kind: LaneKind = 'drive'): LaneSpec {
  return { width, dir, kind };
}

export const ROAD_PRESETS: RoadPreset[] = [
  // ── Highways ──────────────────────────────────────────────────────────────
  road({
    id: 'highway-4', name: 'Highway 2+2', category: 'highway',
    lanes: [drive(3.75, -1), drive(3.75, -1), { width: 3, dir: 0, kind: 'median' }, drive(3.75, 1), drive(3.75, 1)],
    shoulder: 2.5,
    markings: { center: 'none', lane: 'dashed', edge: true, crosswalk: false, stopLine: false, color: '#e8e8e8' },
    speed: 110, surface: 'asphalt', color: '#2e3036',
    description: 'Dual carriageway with planted median and hard shoulders.',
  }),
  road({
    id: 'highway-6', name: 'Highway 3+3', category: 'highway',
    lanes: [drive(3.75, -1), drive(3.75, -1), drive(3.75, -1), { width: 3.5, dir: 0, kind: 'median' }, drive(3.75, 1), drive(3.75, 1), drive(3.75, 1)],
    shoulder: 3,
    markings: { center: 'none', lane: 'dashed', edge: true, crosswalk: false, stopLine: false, color: '#e8e8e8' },
    speed: 120, surface: 'asphalt', color: '#2b2d33',
    description: 'Wide motorway, 6 running lanes, emergency shoulders.',
  }),
  road({
    id: 'expressway-4', name: 'Expressway 2+2', category: 'highway',
    lanes: [drive(3.5, -1), drive(3.5, -1), { width: 1.6, dir: 0, kind: 'median' }, drive(3.5, 1), drive(3.5, 1)],
    shoulder: 1.2,
    markings: { center: 'none', lane: 'dashed', edge: true, crosswalk: false, stopLine: false, color: '#f0d24a' },
    speed: 90, surface: 'asphalt', color: '#35363c', markingColor: '#f0d24a',
    description: 'Urban expressway with narrow barrier median.',
  }),

  // ── Arterials ─────────────────────────────────────────────────────────────
  road({
    id: 'avenue-4', name: 'Avenue 2+2', category: 'arterial',
    lanes: [drive(3.25, -1), drive(3.25, -1), drive(3.25, 1), drive(3.25, 1)],
    shoulder: 0,
    pavement: { width: 4.5, height: 0.16, ramps: true },
    markings: { center: 'double-yellow', lane: 'dashed', edge: true, crosswalk: true, stopLine: true, color: '#e8e8e8' },
    speed: 60, color: '#3a3b41',
    description: 'Grand city avenue, on-street parking implied by wide kerb.',
  }),
  road({
    id: 'avenue-bus', name: 'Avenue + Bus lanes', category: 'arterial',
    lanes: [drive(3, -1), { width: 3.2, dir: -1, kind: 'bus' }, drive(3.25, 1), { width: 3.2, dir: 1, kind: 'bus' }],
    pavement: { width: 4, height: 0.16, ramps: true },
    markings: { center: 'double', lane: 'solid', edge: true, crosswalk: true, stopLine: true, color: '#d8d8d8' },
    speed: 50, color: '#3d3e44',
    description: 'Arterial with dedicated bus lanes each side.',
  }),
  road({
    id: 'boulevard-6', name: 'Boulevard 3+3', category: 'arterial',
    lanes: [drive(3.25, -1), drive(3.25, -1), drive(3.25, -1), { width: 4, dir: 0, kind: 'median' }, drive(3.25, 1), drive(3.25, 1), drive(3.25, 1)],
    pavement: { width: 5, height: 0.18, ramps: true },
    markings: { center: 'none', lane: 'dashed', edge: true, crosswalk: true, stopLine: true, color: '#e8e8e8' },
    speed: 70, color: '#37383e',
    description: 'Grand boulevard with landscaped median strip.',
  }),

  // ── Streets ───────────────────────────────────────────────────────────────
  road({
    id: 'street-2', name: 'City Street 1+1', category: 'street',
    lanes: [{ width: 2.75, dir: -1, kind: 'parking' }, drive(3, -1), drive(3, 1), { width: 2.75, dir: 1, kind: 'parking' }],
    pavement: { width: 3.2, height: 0.15, ramps: true },
    markings: { center: 'dashed', lane: 'none', edge: true, crosswalk: true, stopLine: true, color: '#e8e8e8' },
    speed: 40, color: '#3f4046',
    description: 'Everyday city street with parking lanes and pavements.',
  }),
  road({
    id: 'street-1', name: 'Narrow Street', category: 'street',
    lanes: [drive(3.25, 1)],
    pavement: { width: 2.2, height: 0.14, ramps: true },
    markings: { center: 'none', lane: 'none', edge: true, crosswalk: true, stopLine: true, color: '#e8e8e8' },
    speed: 30, color: '#43444a',
    description: 'Quiet one-way local street.',
  }),
  road({
    id: 'street-bike', name: 'Street + Bike lanes', category: 'street',
    lanes: [drive(2.75, -1), { width: 1.6, dir: -1, kind: 'bike' }, { width: 1.6, dir: 1, kind: 'bike' }, drive(2.75, 1)],
    pavement: { width: 2.8, height: 0.14, ramps: true },
    markings: { center: 'single', lane: 'solid', edge: true, crosswalk: true, stopLine: true, color: '#e8e8e8' },
    speed: 35, color: '#3c3d43',
    description: 'Cycle-friendly street with protected bike lanes.',
  }),
  road({
    id: 'residential', name: 'Residential Lane', category: 'street',
    lanes: [drive(2.6, -1), drive(2.6, 1)],
    pavement: { width: 1.6, height: 0.12, ramps: true },
    markings: { center: 'none', lane: 'none', edge: false, crosswalk: true, stopLine: true, color: '#e8e8e8' },
    speed: 25, color: '#48494f',
    description: 'Low-traffic home zone lane.',
  }),
  road({
    id: 'pedestrian', name: 'Pedestrian Zone', category: 'special',
    lanes: [{ width: 6, dir: 0, kind: 'verge' }],
    pavement: null,
    markings: { ...NO_MARK },
    speed: 5, surface: 'cobble', color: '#7a7268', bridgeRails: false,
    description: 'Cobbled shared space — no vehicles, no markings.',
  }),
  road({
    id: 'service', name: 'Service Road', category: 'special',
    lanes: [drive(3.5, 1)],
    pavement: null,
    shoulder: 0.8,
    markings: { center: 'none', lane: 'none', edge: true, crosswalk: false, stopLine: false, color: '#c9c9c9' },
    speed: 20, color: '#4a4b51',
    description: 'One-way service / access road.',
  }),

  // ── Rural ─────────────────────────────────────────────────────────────────
  road({
    id: 'rural-2', name: 'Country Road 1+1', category: 'rural',
    lanes: [drive(3, -1), drive(3, 1)],
    shoulder: 1.2,
    markings: { center: 'dashed', lane: 'none', edge: true, crosswalk: false, stopLine: false, color: '#dcdcdc' },
    speed: 70, color: '#45464c',
    description: 'Two-lane country road with gravel shoulders.',
  }),
  road({
    id: 'rural-gravel', name: 'Gravel Road', category: 'rural',
    lanes: [drive(3.4, -1), drive(3.4, 1)],
    shoulder: 1.5,
    markings: { ...NO_MARK },
    speed: 45, surface: 'gravel', color: '#7d7261', bridgeRails: true,
    description: 'Unsealed farm road.',
  }),
  road({
    id: 'rural-1', name: 'Farm Track', category: 'rural',
    lanes: [drive(3, 1)],
    shoulder: 1.8,
    markings: { ...NO_MARK },
    speed: 30, surface: 'dirt', color: '#8a765d', bridgeRails: false,
    description: 'Single-lane dirt farm track.',
  }),

  // ── Offroad ───────────────────────────────────────────────────────────────
  road({
    id: 'dirt-track', name: 'Dirt Track', category: 'offroad',
    lanes: [drive(3.2, 1)],
    shoulder: 1.2,
    markings: { ...NO_MARK },
    speed: 25, surface: 'dirt', color: '#8f7a5e', bridgeRails: false,
    description: 'Rutted dirt track for offroad vehicles.',
  }),
  road({
    id: 'offroad-trail', name: 'Offroad Trail', category: 'offroad',
    lanes: [drive(2.6, 1)],
    shoulder: 1.0,
    markings: { ...NO_MARK },
    speed: 15, surface: 'grass', color: '#6e7c4c', bridgeRails: false,
    description: 'Grass trail across open country.',
  }),
  road({
    id: 'mountain-pass', name: 'Mountain Pass', category: 'offroad',
    lanes: [drive(3, -1), drive(3, 1)],
    shoulder: 0.6,
    markings: { center: 'none', lane: 'none', edge: true, crosswalk: false, stopLine: false, color: '#d8d8d8' },
    speed: 35, surface: 'gravel', color: '#6f675c', bridgeRails: true,
    description: 'Narrow switchback pass cut into the slope.',
  }),
];

export const ROAD_PRESET_MAP: Map<string, RoadPreset> = new Map(ROAD_PRESETS.map((p) => [p.id, p]));

export function getRoadPreset(id: string): RoadPreset {
  return ROAD_PRESET_MAP.get(id) ?? ROAD_PRESET_MAP.get('street-2')!;
}

/** Total width of the carriageway (lanes + shoulders). */
export function roadWidth(p: RoadPreset): number {
  let w = p.shoulder * 2;
  for (const l of p.lanes) w += l.width;
  return w;
}

/** Half width of carriageway + pavement. */
export function totalHalfWidth(p: RoadPreset): number {
  return roadWidth(p) / 2 + (p.pavement ? p.pavement.width : 0);
}

/** Cumulative lateral offsets of lane edges from centerline, left → right. */
export function laneEdges(p: RoadPreset): number[] {
  const w = roadWidth(p);
  const edges: number[] = [];
  let x = -w / 2 + p.shoulder;
  edges.push(-w / 2);
  for (const l of p.lanes) {
    x += l.width;
    edges.push(x);
  }
  edges.push(w / 2);
  return edges;
}

// ── Rail presets ───────────────────────────────────────────────────────────

export interface RailPreset {
  id: string;
  name: string;
  gauge: number;
  sleeperSpacing: number;
  beamWidth: number;     // ballast / beam width
  elevated: boolean;
  pylonSpacing: number;
  pylonHeight: number;
  color: string;
  railColor: string;
  description: string;
}

export const RAIL_PRESETS: RailPreset[] = [
  {
    id: 'train', name: 'Heavy Rail', gauge: 1.435, sleeperSpacing: 0.65,
    beamWidth: 5.2, elevated: false, pylonSpacing: 0, pylonHeight: 0,
    color: '#5b5347', railColor: '#8d8d92',
    description: 'Ballasted mainline track — level crossings at roads.',
  },
  {
    id: 'monorail', name: 'Monorail (straddle)', gauge: 0.6, sleeperSpacing: 0,
    beamWidth: 2.4, elevated: true, pylonSpacing: 26, pylonHeight: 11,
    color: '#c7ccd4', railColor: '#5a6270',
    description: 'Elevated straddle monorail on pylons — flies over roads and water.',
  },
  {
    id: 'tram', name: 'Tram Track', gauge: 1.435, sleeperSpacing: 0.7,
    beamWidth: 4.2, elevated: false, pylonSpacing: 0, pylonHeight: 0,
    color: '#6a6255', railColor: '#9a9aa0',
    description: 'Light rail / tram track at street grade.',
  },
];

export const RAIL_PRESET_MAP: Map<string, RailPreset> = new Map(RAIL_PRESETS.map((p) => [p.id, p]));

export function getRailPreset(id: string): RailPreset {
  return RAIL_PRESET_MAP.get(id) ?? RAIL_PRESET_MAP.get('train')!;
}

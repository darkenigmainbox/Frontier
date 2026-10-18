// ─── Frontier data model ─────────────────────────────────────────────────────
// The project is stroke-based: roads / rails / rivers are polylines. Topology
// (junction merging, splitting at crossings) is resolved at geometry-build time
// so editing stays simple and robust while output meshes stay clean.

export interface Vec2 { x: number; y: number }

export interface StrokePoint {
  x: number;
  z: number;
  /** Optional authored deck height (meters). When set, terrain smoothing is skipped. */
  y?: number;
}

export type StrokeKind = 'road' | 'rail' | 'river';

export interface StrokeBase {
  id: string;
  kind: StrokeKind;
  points: StrokePoint[];
  name?: string;
}

export interface RoadStroke extends StrokeBase {
  kind: 'road';
  /** Preset id from the road-type library. */
  typeId: string;
  /** Force elevated deck (bridge) along the whole stroke. */
  bridge?: boolean;
  /** Meters added to the computed deck height. */
  elevOffset?: number;
  /** Disable junction merging for this stroke (ramps, loops). */
  noMerge?: boolean;
}

export interface RailStroke extends StrokeBase {
  kind: 'rail';
  /** 'train' | 'monorail' */
  typeId: string;
  elevated?: boolean;
}

export interface RiverStroke extends StrokeBase {
  kind: 'river';
  width: number;
}

export type Stroke = RoadStroke | RailStroke | RiverStroke;

export interface Lake {
  id: string;
  x: number;
  z: number;
  radius: number;
  /** Radial wobble amount (0 = perfect circle). */
  wobble: number;
  seed: number;
}

export type BuildingType = 'block' | 'house' | 'tower' | 'barn' | 'shop';

export interface Building {
  id: string;
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  rot: number;
  color: string;
  roof: 'flat' | 'gable' | 'hip';
  type: BuildingType;
}

export type TreeType = 'pine' | 'oak' | 'palm' | 'dead';

export interface Tree {
  id: string;
  x: number;
  z: number;
  s: number;
  rot: number;
  type: TreeType;
}

export type TerrainBrushMode = 'raise' | 'lower' | 'flatten' | 'smooth' | 'paint';

export interface TerrainEdit {
  x: number;
  z: number;
  r: number;
  /** Strength in meters (for raise/lower) or blend factor. */
  d: number;
  mode: TerrainBrushMode;
  /** Target height for flatten. */
  t?: number;
  /** Surface paint id: 0 grass, 1 rock, 2 sand, 3 dirt. */
  p?: number;
}

export interface TerrainData {
  /** World extent in meters (square, centered on origin). */
  size: number;
  /** Grid vertices per side. */
  res: number;
  seed: number;
  /** Base amplitude of the fbm relief, meters. */
  amplitude: number;
  edits: TerrainEdit[];
}

export interface WaterData {
  level: number;
  lakes: Lake[];
}

export interface ProjectSettings {
  gridSnap: number;
  showGrid: boolean;
  showContours: boolean;
  showMarkings: boolean;
  shadows: boolean;
  autoBridge: boolean;
}

export interface Project {
  version: number;
  name: string;
  terrain: TerrainData;
  water: WaterData;
  strokes: Stroke[];
  buildings: Building[];
  trees: Tree[];
  settings: ProjectSettings;
}

export const PROJECT_VERSION = 3;

export function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export function emptyProject(name = 'Untitled'): Project {
  return {
    version: PROJECT_VERSION,
    name,
    terrain: { size: 2400, res: 193, seed: 7, amplitude: 26, edits: [] },
    water: { level: 6, lakes: [] },
    strokes: [],
    buildings: [],
    trees: [],
    settings: {
      gridSnap: 5,
      showGrid: true,
      showContours: true,
      showMarkings: true,
      shadows: true,
      autoBridge: true,
    },
  };
}

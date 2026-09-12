/**
 * Descriptive controls for xeric plants.  Cacti and succulents keep their
 * silhouette in the welded stem mesh; the extra values below control the
 * species-specific surface treatment and the high-resolution rosette/pad
 * cards that grow from the crown.
 */

export type SucculentForm = 'saguaro' | 'barrel' | 'prickly-pear' | 'agave' | 'aloe';

export interface SucculentParams {
  form: SucculentForm;
  /** Number of longitudinal ribs on ribbed cacti. */
  ribCount: number;
  /** Radial relief of a rib, as a fraction of the local body radius. */
  ribDepth: number;
  /** Slightly softens rib valleys instead of making a gear profile. */
  ribSoftness: number;
  /** Seeded crown organs for pads and fleshy leaves. */
  rosetteCount: number;
  /** Base leaf/pad length in metres. */
  rosetteLength: number;
  /** Base width of a leaf/pad in metres. */
  rosetteWidth: number;
  /** Lean of a rosette organ away from vertical, degrees. */
  rosetteLean: number;
  /** Droop of the outer third, degrees. */
  rosetteDroop: number;
  /** Variation in organ size, 0..1. */
  rosetteVariation: number;
  /** Pad bulge along its outward normal, metres. */
  padBulge: number;
  /** Small areole/spine cards on ribbed cactus bodies. */
  spineCount: number;
  /** Length of an individual spine card in metres. */
  spineLength: number;
}

export const DEFAULT_SUCCULENT: SucculentParams = {
  form: 'barrel',
  ribCount: 12,
  ribDepth: 0.045,
  ribSoftness: 0.28,
  rosetteCount: 0,
  rosetteLength: 0.8,
  rosetteWidth: 0.08,
  rosetteLean: 32,
  rosetteDroop: 14,
  rosetteVariation: 0.18,
  padBulge: 0.06,
  spineCount: 0,
  spineLength: 0.035,
};

/** UI/library metadata for the xeric family. */
export const SUCCULENT_PRESETS: { name: string; form: SucculentForm }[] = [
  { name: 'Saguaro Cactus', form: 'saguaro' },
  { name: 'Golden Barrel Cactus', form: 'barrel' },
  { name: 'Prickly Pear Cactus', form: 'prickly-pear' },
  { name: 'Agave Americana', form: 'agave' },
  { name: 'Aloe Vera', form: 'aloe' },
];

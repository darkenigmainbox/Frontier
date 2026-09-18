// Frontier — single source of truth for volume/atlas geometry.
// These numbers are mirrored into GLSL (src/gl/common.js) — keep both in sync.

export const SIZE = [128, 80, 128];            // volume voxels [nx, ny, nz]
export const MIN = [-22, -4, -20];             // world bounds min [m]
export const MAX = [22, 22, 20];               // world bounds max [m]
export const CELL = [
  (MAX[0] - MIN[0]) / SIZE[0],
  (MAX[1] - MIN[1]) / SIZE[1],
  (MAX[2] - MIN[2]) / SIZE[2],
];
export const BAND = 0.32;                      // signed-distance band half-width [m]
export const VOXEL_VOLUME = CELL[0] * CELL[1] * CELL[2];

// Atlas layout (z slices tiled in a 2D texture, 16 per row)
export const ATLAS_COLS = 16;
export const ATLAS = [
  SIZE[0] * ATLAS_COLS,
  SIZE[1] * Math.ceil(SIZE[2] / ATLAS_COLS),
];

// Particle pool
export const PARTICLE_SIZE = [64, 32];         // 2048 agents
export const MAX_PARTICLES = PARTICLE_SIZE[0] * PARTICLE_SIZE[1];
export const SPLAT_SLICES = 7;                 // z slices touched per splat (-3..+3)

// --- Solver constants (shared CPU/GPU physics) -----------------------------
// Sediment load is measured in *voxel volumes* (vox = 1.0 ≈ one voxel of rock).
export const CAP_MAX = 0.9;        // hard ceiling on transport capacity (anti-runaway #1)
export const DEMAND_MAX_FRAC = 0.12;  // one contact may take ≤12% of the kernel's solid (anti-runaway #2)
export const ARMOR_FLOOR = 0.06;   // fully-armored rock still erodes at 6% rate (integral anti-runaway #3)
export const ARMOR_GAIN = 1.4;     // armor accumulation per removed voxel-volume
export const ARMOR_RELAX = 0.0004; // per-tick armor relaxation (exposure weathers armor)
export const THIN_GUARD = 0.3;     // carving multiplier when there is no rock behind the surface
export const STALL_SPEED = 0.35;   // m/s below which a particle dumps its load (pit self-fill)
export const STALL_DEPOSIT = 0.45; // fraction of load dumped when stalled
export const KERNEL_MAX_R = 1.15;  // max carve kernel radius [m] — crisp carving bound
export const KERNEL_MIN_R = 0.5;

export function carveRadius(footprint) {
  return Math.min(KERNEL_MAX_R, Math.max(KERNEL_MIN_R, footprint * 0.55));
}

export const defaults = {
  // Formation
  preset: 0,
  relief: 12, strata: 0.65, roughness: 0.48,
  canyonWidth: 6.1, canyonMeander: 1, canyonFlare: 0.105,
  seed: 4821,

  // Erosion
  sourceMode: 0,                   // 0 rain, 1 runoff, 2 river, 3 wind, 4 rock, 5 chem
  particleCount: 1024,
  footprint: 1.2,                  // collision/agent scale [m]; carve kernel derives from it
  rainfall: 0.65,                  // spawn intensity
  erosion: 0.62,
  hardness: 0.45,
  deposition: 0.35,
  capacity: 0.65,
  stability: 0.5,                  // 0 = wild (legacy feel), 1 = fully armored; scales ARMOR_FLOOR
  grainSize: 0.25,
  restitution: 0.08,
  wind: 0.25,
  thermal: 0.35,
  chemicalRate: 0.45,
  solubility: 0.6,
  speed: 1,

  // River
  riverEnabled: true,
  riverSpeed: 3.2, riverWidth: 3.5, riverDepth: 0.6, riverOffset: 0,

  // Wind field
  windSpeed: 6.5, windHeight: 7, windSpread: 2, windDirection: 0,

  // Water / render
  waterEnabled: true, waterLevel: 0.7,
  sun: 135, haze: 0.25,
  showParticles: true, showSediment: true,

  // Sculpt
  radius: 1.8, brushStrength: 0.45,

  cameraSpeed: 8,
};

export const presetData = [
  { name: "Desert canyon", relief: 12, strata: 0.65, roughness: 0.48, seed: 4821 },
  { name: "The badlands", relief: 13, strata: 0.8, roughness: 0.72, seed: 7309 },
  { name: "Monument valley", relief: 17, strata: 0.72, roughness: 0.38, seed: 2163 },
  { name: "Land plot", relief: 12, strata: 0.65, roughness: 0.48, seed: 4821 },
];

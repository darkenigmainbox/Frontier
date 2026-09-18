// Frontier — single source of truth for volume/atlas geometry.
// These numbers are mirrored into GLSL (src/gl/common.js) — keep both in sync.
//
// Resolution tiers: the same world extent is simulated at three voxel
// densities. SIZE/CELL/ATLAS arrays are mutated in place by setTier() and
// VOXEL_VOLUME is an ES live binding — JS consumers reading them at runtime
// always see the current tier. GLSL strings are generated lazily at
// program-construction time, so a tier switch only needs a renderer rebuild.

export const WORLD_MIN = [-22, -4, -20];        // world bounds min [m] (tier-independent)
export const WORLD_MAX = [22, 22, 20];          // world bounds max [m] (tier-independent)
export const BAND = 0.32;                       // signed-distance band half-width [m]

export const TIERS = {
  draft:    { name: "Draft",    size: [96, 60, 96]   },
  standard: { name: "Standard", size: [128, 80, 128] },
  high:     { name: "High",     size: [160, 100, 160] },
};

export const ATLAS_COLS = 16;

// Live state (arrays are mutated in place; VOXEL_VOLUME is a live `let`)
export const SIZE = [128, 80, 128];
export const MIN = WORLD_MIN.slice();
export const MAX = WORLD_MAX.slice();
export const CELL = [0, 0, 0];
export const ATLAS = [0, 0];
export let VOXEL_VOLUME = 0;

export function setTier(name) {
  const t = TIERS[name] || TIERS.standard;
  SIZE.splice(0, 3, ...t.size);
  for (let i = 0; i < 3; i++) {
    MIN[i] = WORLD_MIN[i];
    MAX[i] = WORLD_MAX[i];
    CELL[i] = (MAX[i] - MIN[i]) / SIZE[i];
  }
  VOXEL_VOLUME = CELL[0] * CELL[1] * CELL[2];
  ATLAS[0] = SIZE[0] * ATLAS_COLS;
  ATLAS[1] = SIZE[1] * Math.ceil(SIZE[2] / ATLAS_COLS);
}
setTier("standard");

// Particle pool
export const PARTICLE_SIZE = [64, 32];         // 2048 agents
export const MAX_PARTICLES = PARTICLE_SIZE[0] * PARTICLE_SIZE[1];
export const SPLAT_SLICES = 11;                // z slices touched per splat (-5..+5, covers High tier kernels)
export const MAX_SEGMENTS = 5;                 // capsule sub-centers per swept contact

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
  tier: "standard",

  // Erosion
  sourceMode: 0,                   // 0 rain, 1 runoff, 2 river, 3 wind, 4 rock, 5 chem
  particleCount: 1024,
  footprint: 1.2,                  // collision/agent scale [m]; carve kernel derives from it
  rainfall: 0.65,                  // spawn intensity
  erosion: 0.62,
  hardness: 0.45,
  deposition: 0.35,
  capacity: 0.65,
  stability: 0.5,                  // 0 = wild (legacy feel), 1 = fully armored; scales armor floor
  gully: 1.2,                      // wetness-reinforced channel incision gain (0 = off)
  channel: 1,                      // swept (capsule) carving on = channels, off = point pits
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

// One-click erosion scenarios — parameter bundles over the same solver.
export const scenarios = [
  { id: "rain",  name: "Gentle rain",   sourceMode: 0, particleCount: 768,  rainfall: 0.5,  erosion: 0.5,  capacity: 0.55, deposition: 0.4,  stability: 0.6,  thermal: 0.3,  riverEnabled: false, gully: 1.1, wind: 0.2 },
  { id: "storm", name: "Monsoon flood", sourceMode: 0, particleCount: 1536, rainfall: 0.95, erosion: 0.85, capacity: 0.85, deposition: 0.3,  stability: 0.5,  thermal: 0.4,  riverEnabled: true,  gully: 1.6, wind: 0.45 },
  { id: "river", name: "River gorge",   sourceMode: 2, particleCount: 1024, rainfall: 0.35, erosion: 0.9,  capacity: 0.9,  deposition: 0.28, stability: 0.55, thermal: 0.45, riverEnabled: true,  gully: 1.4, wind: 0.15 },
  { id: "arid",  name: "Arid wind",     sourceMode: 3, particleCount: 1024, rainfall: 0.12, erosion: 0.35, capacity: 0.4,  deposition: 0.55, stability: 0.7,  thermal: 0.25, riverEnabled: false, gully: 0.4, wind: 0.35 },
  { id: "mixed", name: "Full mix",      sourceMode: 0, particleCount: 1280, rainfall: 0.75, erosion: 0.68, capacity: 0.7,  deposition: 0.35, stability: 0.55, thermal: 0.38, riverEnabled: true,  gully: 1.3, wind: 0.3 },
];

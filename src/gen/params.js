/* ============================================================
 * Frontier · SDF terrain — the parameter set
 *
 * One flat, serialisable object drives generation, erosion,
 * sculpting defaults, materials and the exporters. It is the
 * "recipe": seed + these numbers reproduce a terrain exactly,
 * in the browser or headless through tools/generate.mjs.
 * ============================================================ */

export const BOUNDS = {
  min: [-22, -4, -20],
  max: [22, 22, 20],
};

/** Grid presets. Dims stay proportional to the 44 × 26 × 40 m box. */
export const RESOLUTIONS = {
  draft: [80, 48, 80],
  standard: [112, 72, 112],
  high: [160, 96, 160],
  ultra: [224, 136, 224],
};

export const BASE_SHAPES = ['island', 'plateau', 'ridges', 'basin', 'mesa', 'dunes'];

export const defaultParams = {
  /* ---------------------------- world ---------------------------- */
  resolution: 'standard',
  seed: 4821,
  shape: 'island',
  seaLevel: 0,
  /** overall vertical exaggeration of the base landform (metres) */
  relief: 7.5,
  /** how far the land extends: island radius in metres */
  radius: 20,
  /** summit / centre offset from the middle of the box */
  peakX: 0,
  peakZ: 0,
  /** flank tilt (long valley side), radians of lean */
  tilt: 0.35,
  /** radial gradient: 0 => dome, 1 => cliff-walled butte */
  peakSharp: 0.42,
  /** flat-topped core size, 0..1 */
  summitPlateau: 0.25,
  /** secondary summits blended into the massif (breaks the volcano look) */
  subPeaks: 3,

  /* ------------------------- fractal noise ----------------------- */
  freq: 0.055,
  octaves: 6,
  gain: 0.5,
  lacunarity: 2.0,
  ridged: 0.6,
  warp: 0.35,
  warpScale: 0.028,
  rough: 0.32,

  /* ------------------------- geology ----------------------------- */
  strata: 0.5,          // horizontal hardness banding strength
  strataFreq: 1.6,      // bands per metre
  hardness: 0.35,       // baseline rock resistance 0..1
  canyon: 0.35,         // guided canyon attractor strength
  canyonWidth: 3.2,     // metres, half-width of the guided channel
  canyonMeander: 0.45,
  soilDepth: 1.2,       // metres of soft cover on top of bedrock

  /* ------------------------- erosion ----------------------------- */
  erosion: {
    enabled: true,
    iterations: 140,
    /** macro stream-power erodibility (m per iteration at A=1 m², S=1) */
    K: 0.008,
    m: 0.45,
    n: 1.05,
    /** max macro incision per iteration, metres (resolution independent) */
    maxCut: 0.06,
    /** hillslope diffusion, per iteration, across / along the slope */
    diffusionAcross: 0.055,
    diffusionAlong: 0.012,
    /** diffusion is suppressed where slope exceeds this (cliffs survive) */
    diffusionSlopeLimit: 0.85,
    /** channels are protected from diffusion above this drainage area (m²) */
    channelProtectA: 12,
    /** angle of repose for thermal talus, tan(angle) */
    talus: 1.15,
    talusRate: 0.3,
    sediment: true,
    deposition: 0.65,
    /** flow concentration exponent: 1 = full MFD spread, 3 = near-D8 */
    flowExponent: 1.35,
    /** meander bias in the routing (0 = pure steepest descent) */
    meander: 0.5,
    /** flow is recomputed every N iterations */
    flowEvery: 4,
    /** guided canyon attractor weight inside the erosion */
    canyonBoost: 0.8,

    /* -------- particle (droplet) stage: the b1/"looks real" half ----- */
    particles: true,
    particleCount: 32000,     // normalised per surface cell, count is scaled
    particleSteps: 48,
    particleInertia: 0.06,
    particleCapacity: 3.2,    // sediment capacity factor
    particleErode: 0.5,       // erode rate (fraction of capacity per step)
    particleDeposit: 0.35,    // deposit rate
    particleEvaporate: 0.02,
    particleMinSlope: 0.012,  // capacity floor — kills the infinite pit
    particleGravity: 6.0,
    particleRadius: 0.9,      // sampling radius for bilinear splats, metres
    /** hard limit on how deep a channel may be cut *in total*, metres */
    maxIncision: 1.6,
    /** incise only above this local slope (channels stop at flat floors) */
    stopSlope: 0.035,
    /** material hardening with depth: 0 = none, 1 = strongly armoured */
    armouring: 0.35,

    /* ----------------------- detail stage ------------------------ */
    detail: true,
    rills: 0.5,             // micro-rill carving strength
    rillScale: 0.9,         // metres, wavelength of the rill modulation
    sharpen: 0.35,          // ridge/cliff crispening (unsharp mask)
    grain: 0.06,            // metres of fractal surface grain
    grainScale: 3.5,
    sand: 0.35,             // alluvial fan/grain smoothing on deposits
    talusDetail: 0.4,
  },

  /* --------------------------- visuals --------------------------- */
  material: 'alpine',
  snowLine: 9.5,
  water: true,
  waterLevel: 0,
  fog: 0.5,
  sunAzimuth: 135,
  wireframe: false,
  showFlow: false,
  channelPreview: 'none',
};

/** Deep-merge a partial recipe (from a JSON file / the URL) onto defaults. */
export function mergeParams(base, patch) {
  if (!patch) return structuredClone(base);
  const out = structuredClone(base);
  const walk = (dst, src) => {
    for (const k of Object.keys(src)) {
      const v = src[k];
      if (v && typeof v === 'object' && !Array.isArray(v) && dst[k] && typeof dst[k] === 'object') walk(dst[k], v);
      else dst[k] = v;
    }
  };
  walk(out, patch);
  return out;
}

/** Stable seed → 32-bit int. */
export function seedOf(p) {
  const s = typeof p.seed === 'string' ? hashString(p.seed) : p.seed | 0;
  return s >>> 0;
}

export function hashString(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

/**
 * Presets, Multi-Agent Particle Modes & Geological / Glacial Parameters for the WebGL2
 * GPU Particle Erosion, Glaciation & Sedimentation Studio.
 */

export const EROSION_LANDSCAPES = {
  'icelandic-highlands': {
    id: 'icelandic-highlands',
    name: 'Icelandic Glacial Highlands',
    subtitle: 'Columnar basalt, rhyolite bands, emerald moss, summit ice cap & black-sand sandur',
    terrainType: 6,
    materialTheme: 1, // Icelandic Volcanic Basalt + Rhyolite + Subarctic Moss + Black Sand Outwash
    defaults: {
      emitterMode: 'glacial-blizzard',
      relief: 168,
      roughness: 0.68,
      rockHardness: 0.56,
      strataStrength: 0.78,
      strataFreq: 10.5,
      strataDip: 8.0,
      faultWeakness: 0.64,
      erosionStrength: 0.70,
      sedimentCapacity: 0.76,
      depositionRate: 0.66,
      talusAngle: 0.58,
      snowline: 0.54,
      snowfallRate: 0.78,
      glacierStrength: 0.74,
      windSpeed: 0.58,
      windAzimuth: 35,
      rockfallRate: 0.45,
    },
  },
  'himalayan-karakoram': {
    id: 'himalayan-karakoram',
    name: 'Himalayan Horn & Glaciers',
    subtitle: 'Towering arêtes, gneiss & leucogranite strata, cirque snowpack & valley glaciers',
    terrainType: 7,
    materialTheme: 2, // Himalayan Dark Gneiss + Leucogranite Veins + Blue Glacier Ice + Moraines
    defaults: {
      emitterMode: 'glacial-blizzard',
      relief: 205,
      roughness: 0.76,
      rockHardness: 0.64,
      strataStrength: 0.68,
      strataFreq: 8.5,
      strataDip: 24.0,
      faultWeakness: 0.58,
      erosionStrength: 0.68,
      sedimentCapacity: 0.74,
      depositionRate: 0.64,
      talusAngle: 0.64,
      snowline: 0.42,
      snowfallRate: 0.88,
      glacierStrength: 0.85,
      windSpeed: 0.70,
      windAzimuth: -25,
      rockfallRate: 0.62,
    },
  },
  'layered-plateau': {
    id: 'layered-plateau',
    name: 'Stratified Canyon Plateau',
    subtitle: 'Utah-style hard sandstone caprocks & soft shale mesa incised by rain & wind',
    terrainType: 1,
    materialTheme: 0, // Utah Desert Terracotta / Navajo Sandstone / Ochre Alluvial Fans
    defaults: {
      emitterMode: 'all-weather',
      relief: 138,
      roughness: 0.62,
      rockHardness: 0.48,
      strataStrength: 0.86,
      strataFreq: 9.0,
      strataDip: 6.0,
      faultWeakness: 0.62,
      erosionStrength: 0.68,
      sedimentCapacity: 0.72,
      depositionRate: 0.60,
      talusAngle: 0.56,
      snowline: 0.96,
      snowfallRate: 0.0,
      glacierStrength: 0.0,
      windSpeed: 0.48,
      windAzimuth: 40,
      rockfallRate: 0.42,
    },
  },
  'alpine-divide': {
    id: 'alpine-divide',
    name: 'Tectonic Alpine Divide',
    subtitle: 'High folded thrust ridge with snow-dusted summits, valleys & alluvial fans',
    terrainType: 0,
    materialTheme: 2,
    defaults: {
      emitterMode: 'all-weather',
      relief: 172,
      roughness: 0.74,
      rockHardness: 0.54,
      strataStrength: 0.54,
      strataFreq: 7.5,
      strataDip: 18.0,
      faultWeakness: 0.55,
      erosionStrength: 0.66,
      sedimentCapacity: 0.72,
      depositionRate: 0.64,
      talusAngle: 0.62,
      snowline: 0.64,
      snowfallRate: 0.52,
      glacierStrength: 0.48,
      windSpeed: 0.45,
      windAzimuth: 15,
      rockfallRate: 0.50,
    },
  },
  'fault-escarpment': {
    id: 'fault-escarpment',
    name: 'Tilted Fault Escarpment',
    subtitle: 'Steep uplifted fault block shedding rockfall scree & braided gravel fans',
    terrainType: 2,
    materialTheme: 0,
    defaults: {
      emitterMode: 'all-weather',
      relief: 150,
      roughness: 0.58,
      rockHardness: 0.46,
      strataStrength: 0.76,
      strataFreq: 8.5,
      strataDip: 14.0,
      faultWeakness: 0.74,
      erosionStrength: 0.72,
      sedimentCapacity: 0.78,
      depositionRate: 0.68,
      talusAngle: 0.54,
      snowline: 0.95,
      snowfallRate: 0.0,
      glacierStrength: 0.0,
      windSpeed: 0.44,
      windAzimuth: 55,
      rockfallRate: 0.58,
    },
  },
  'volcanic-caldera': {
    id: 'volcanic-caldera',
    name: 'Glaciated Stratocone & Rim',
    subtitle: 'Ice-capped volcanic cone with breached crater rim, lahars & black-sand aprons',
    terrainType: 3,
    materialTheme: 1,
    defaults: {
      emitterMode: 'glacial-blizzard',
      relief: 175,
      roughness: 0.58,
      rockHardness: 0.46,
      strataStrength: 0.50,
      strataFreq: 10.0,
      strataDip: 4.0,
      faultWeakness: 0.50,
      erosionStrength: 0.70,
      sedimentCapacity: 0.76,
      depositionRate: 0.66,
      talusAngle: 0.54,
      snowline: 0.58,
      snowfallRate: 0.68,
      glacierStrength: 0.62,
      windSpeed: 0.52,
      windAzimuth: 20,
      rockfallRate: 0.48,
    },
  },
  'badlands-domes': {
    id: 'badlands-domes',
    name: 'Wind-Carved Badlands & Dunes',
    subtitle: 'Soft mudstone badlands sculpted by wind sandblasting, flash rain & sand drifts',
    terrainType: 4,
    materialTheme: 0,
    defaults: {
      emitterMode: 'aeolian-wind',
      relief: 115,
      roughness: 0.68,
      rockHardness: 0.28,
      strataStrength: 0.90,
      strataFreq: 12.0,
      strataDip: 3.0,
      faultWeakness: 0.66,
      erosionStrength: 0.80,
      sedimentCapacity: 0.74,
      depositionRate: 0.64,
      talusAngle: 0.46,
      snowline: 0.98,
      snowfallRate: 0.0,
      glacierStrength: 0.0,
      windSpeed: 0.82,
      windAzimuth: 62,
      rockfallRate: 0.35,
    },
  },
  'coastal-massif': {
    id: 'coastal-massif',
    name: 'Fjord & Coastal Massif',
    subtitle: 'Steep coastal peaks feeding glacial & fluvial river deltas into a low fjord basin',
    terrainType: 5,
    materialTheme: 1,
    defaults: {
      emitterMode: 'all-weather',
      relief: 158,
      roughness: 0.70,
      rockHardness: 0.52,
      strataStrength: 0.62,
      strataFreq: 8.0,
      strataDip: 11.0,
      faultWeakness: 0.58,
      erosionStrength: 0.66,
      sedimentCapacity: 0.76,
      depositionRate: 0.70,
      talusAngle: 0.58,
      snowline: 0.66,
      snowfallRate: 0.48,
      glacierStrength: 0.45,
      windSpeed: 0.50,
      windAzimuth: -40,
      rockfallRate: 0.42,
    },
  },
};

export const EMITTER_MODES = {
  'all-weather': {
    id: 'all-weather',
    name: 'Multi-Agent (Rain + Snow + Wind + Rockfall)',
    code: 0,
    description: 'Simultaneous GPU particle species: raindrops, high-altitude snow, wind saltation & cliff rockfalls.',
  },
  'glacial-blizzard': {
    id: 'glacial-blizzard',
    name: 'Glacial Blizzard (Snow + Ice + Meltwater)',
    code: 1,
    description: 'Swirling snow particles build summit snowpack & creeping valley glaciers that carve U-troughs & moraines.',
  },
  'sky-rain': {
    id: 'sky-rain',
    name: 'Hydraulic Rainstorm (Top-Drop)',
    code: 2,
    description: 'Overhead rainstorm cutting hardness-controlled V-canyons and depositing grain-sorted alluvial fans.',
  },
  'aeolian-wind': {
    id: 'aeolian-wind',
    name: 'Aeolian Wind & Sandblasting',
    code: 3,
    description: 'Saltating sand & dust particles abrade windward rock faces and build lee-slope sand dunes & drifts.',
  },
  'rockfall-avalanche': {
    id: 'rockfall-avalanche',
    name: 'Cliff Rockfall & Scree Avalanches',
    code: 4,
    description: 'Ballistic boulder particles detach from steep cliffs, gouge couloirs, and pile conical talus aprons.',
  },
  'storm-cell': {
    id: 'storm-cell',
    name: 'Focused Storm / Blizzard Cell',
    code: 5,
    description: 'Concentrated steerable overhead cell (use Pour Tool or Shift+Drag on terrain).',
  },
};

// Optional 3D Volumetric SDF Outcrops / Escarpments that can be spawned directly onto the terrain!
export const TERRAIN_SDF_FEATURE_MODES = {
  none: { id: 'none', label: 'None (Pure GPU Terrain)' },
  escarpment: { id: 'escarpment', label: '3D SDF Escarpment & Boulders' },
  'escarpment-arches': { id: 'escarpment-arches', label: 'Escarpment + Natural SDF Arches' },
  'alpine-crags': { id: 'alpine-crags', label: 'Jagged SDF Crags & Spires' },
};

export const DEFAULT_EROSION_PARAMS = {
  landscape: 'icelandic-highlands',
  emitterMode: 'glacial-blizzard',
  materialTheme: 1,       // 0 = Utah Canyon, 1 = Icelandic Basalt/Moss, 2 = Himalayan Gneiss/Granite
  seed: 4029,
  gridSize: 512,
  worldSpan: 500.0,

  // Multi-Species GPU Particle Controls
  particleCount: 26624,   // Up to 32,768 simultaneous GPU particles
  substepsPerFrame: 2,
  rainIntensity: 0.68,
  cloudHeight: 215.0,
  gravity: 9.81,
  particleInertia: 0.28,
  evaporation: 0.14,

  // Glacial, Wind & Rockfall Particle Controls
  snowline: 0.54,         // Normalized elevation of freezing snowline [0.15 .. 1.0]
  snowfallRate: 0.78,     // Blizzard snow accumulation intensity
  glacierStrength: 0.74,  // Glacial ice U-valley plucking & moraine bulldozing
  windSpeed: 0.58,        // Aeolian saltation & snow-drift speed
  windAzimuth: 35,        // Wind direction (degrees)
  rockfallRate: 0.45,     // Ballistic cliff rockfall & scree intensity

  // Rock Hardness & 3D Stratigraphy Controls
  relief: 168.0,
  roughness: 0.68,
  rockHardness: 0.56,
  strataStrength: 0.78,
  strataFreq: 10.5,
  strataDip: 8.0,
  strataStrike: 22.0,
  faultWeakness: 0.64,

  // Detachment, Transport & Sedimentation Controls
  erosionStrength: 0.70,
  sedimentCapacity: 0.76,
  depositionRate: 0.66,
  talusAngle: 0.58,
  pipeFlowBlend: 0.55,

  // Optional 3D Volumetric SDF Terrain Outcrops (Escarpment / Boulders / Custom Arches)
  sdfFeaturePreset: 'escarpment', // Enabled by default so user immediately sees 3D SDF Escarpment + Rocks on terrain!

  // Visuals & Interactive Tool
  viewMode: 'natural',    // 'natural' | 'sediment' | 'hardness' | 'flow' | 'cryo' | 'clay'
  showParticles: true,
  showWater: true,
  particleOpacity: 0.80,
  sunAzimuth: 48,
  sunElevation: 28,
  brushMode: 'orbit',     // 'orbit' | 'cloudburst' | 'raise' | 'carve'
  brushRadius: 34.0,
  brushStrength: 0.65,
};

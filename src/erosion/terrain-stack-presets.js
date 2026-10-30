/**
 * Non-Destructive Geological & SDF Terrain Layer Stack Model and Preset Library.
 *
 * A preset is a SAVED CONFIGURATION OF THE WHOLE STACK (ordered bottom-to-top operations +
 * global lighting/mineral palette), NEVER a layer type or colour layer.
 *
 * UI displays newest/final operations at the TOP (index 0) and base landform at the BOTTOM
 * (index length - 1); evaluation runs strictly from BOTTOM -> TOP through shared terrain data:
 *   height, hardness, 3D vector overhang displacement, SDF cave volume, water, flow,
 *   coarse scree, fine sediment, snow/ice, ambient occlusion & protrusion curvature.
 */

let layerUidCounter = 1;

export function nextLayerId(prefix = 'lyr') {
  return `${prefix}-${layerUidCounter++}`;
}

export const LAYER_CATEGORIES = {
  landform: {
    id: 'landform',
    label: 'Landform & SDF',
    eyebrow: 'LANDFORM / SDF OPERATION',
    color: '#c9b38c',
  },
  simulation: {
    id: 'simulation',
    label: 'Simulation',
    eyebrow: 'SIMULATION PROCESS',
    color: '#8ab49a',
  },
  spline: {
    id: 'spline',
    label: 'Spline Feature',
    eyebrow: 'SPATIAL SPLINE OPERATION',
    color: '#88acc4',
  },
  rocks: {
    id: 'rocks',
    label: 'Rock Placement',
    eyebrow: 'ROCK & BOULDER LAYER',
    color: '#b89f8d',
  },
  vegetation: {
    id: 'vegetation',
    label: 'Vegetation',
    eyebrow: 'PLANT & FOLIAGE LAYER',
    color: '#93b87e',
  },
};

export const DEFAULT_LAYER_MASK = {
  enabled: false,
  mode: 'height', // 'height' | 'slope' | 'flow' | 'concavity' | 'radial' | 'noise'
  min: 0.20,
  max: 0.85,
  feather: 0.15,
  invert: false,
  scale: 2.2,
  seed: 1337,
};

/**
 * Complete registry of composable Terrain Stack Operations.
 * Each operation declares what terrain channels it READS and what it WRITES.
 */
export const LAYER_OPERATION_SPECS = {
  'base-landform': {
    type: 'base-landform',
    category: 'landform',
    defaultName: 'Base landform',
    glyph: 'mountain',
    lockedPosition: false,
    reads: ['Domain XZ'],
    writes: ['Height', 'Hardness'],
    summary: (p) => `${BASE_ARCHETYPES[p.archetype]?.label || 'Alpine Ridge'} · ${Math.round(p.relief)}m`,
    defaults: {
      archetype: 0, // 0=Alpine Ridge, 1=Plateau/Escarpment, 2=Canyon Uplift, 3=Dune Basin, 4=Volcanic Caldera, 5=Coastal Massif, 6=Arid Pediment
      seed: 4029,
      relief: 155,
      scale: 1.85,
      roughness: 0.62,
      ridgeSharpness: 0.68,
      warpStrength: 0.45,
      valleyFloor: 0.22,
      baseHardness: 0.54,
    },
  },

  'mountain-ridges': {
    type: 'mountain-ridges',
    category: 'landform',
    defaultName: 'Procedural landform',
    glyph: 'ridge',
    reads: ['Height', 'Mask'],
    writes: ['Height', 'Hardness', 'FineSed'],
    summary: (p) => `${COMBINE_MODES[p.combineMode]?.label || 'Add'} · ${Math.round(p.amplitude)}m`,
    defaults: {
      generator: 0, // 0=Arête Ridges, 1=Mesa/Plateau, 2=Fault Escarpment, 3=Aeolian Dunes, 4=Impact Craters
      combineMode: 0, // 0=Add, 1=Subtract, 2=Max, 3=Min, 4=Blend
      amplitude: 62,
      scale: 2.2,
      sharpness: 0.64,
      azimuth: 28,
      opacity: 1.0,
      hardnessDelta: 0.15,
      seed: 7104,
    },
  },

  'stratigraphic-beds': {
    type: 'stratigraphic-beds',
    category: 'landform',
    defaultName: 'Stratigraphic beds',
    glyph: 'strata',
    reads: ['Height', 'Hardness'],
    writes: ['Height', 'Hardness', 'Overhang'],
    summary: (p) => `${Math.round(p.bedCount)} beds · dip ${Math.round(p.dipAngle)}°`,
    defaults: {
      bedCount: 9,
      terraceStrength: 0.58,
      hardSoftContrast: 0.78,
      dipAngle: 11,
      strikeAzimuth: 24,
      bedFoldWarp: 0.28,
      ledgeOverhang: 0.35,
      opacity: 1.0,
      seed: 3190,
    },
  },

  'rock-stacks': {
    type: 'rock-stacks',
    category: 'landform',
    defaultName: 'Rock stacks & hoodoos',
    glyph: 'stacks',
    reads: ['Height', 'Slope', 'Mask'],
    writes: ['Height', 'Hardness', 'Overhang'],
    summary: (p) => `${Math.round(p.height)}m · ${Math.round(p.tiers)} tiers`,
    defaults: {
      height: 54,
      spacing: 68,
      radius: 16,
      taper: 0.42,
      tiers: 5,
      lean: 0.30,
      leanAzimuth: 35,
      caprockOverhang: 0.48,
      opacity: 1.0,
      seed: 8821,
    },
  },

  'cliff-push-pull': {
    type: 'cliff-push-pull',
    category: 'landform',
    defaultName: 'Rugged cliff push–pull',
    glyph: 'cliff',
    reads: ['Height', 'Slope', 'Hardness'],
    writes: ['Height', '3D Overhang'],
    summary: (p) => `${Number(p.displacement).toFixed(1)}m · >${Math.round(p.slopeThreshold)}°`,
    defaults: {
      displacement: 11.5,
      featureScale: 2.6,
      slopeThreshold: 28,
      ledgeStrength: 0.62,
      overhangBias: 0.55,
      verticalCrease: 0.58,
      opacity: 1.0,
      seed: 5512,
    },
  },

  'sculpt-layer': {
    type: 'sculpt-layer',
    category: 'landform',
    defaultName: 'SDF sculpt layer',
    glyph: 'sculpt',
    reads: ['Height', 'SDF Caves', 'Brush'],
    writes: ['Height', 'SDF Caves'],
    summary: (p) => `${p.strokeCount || 0} edits · ${Math.round((p.opacity ?? 1) * 100)}%`,
    defaults: {
      opacity: 1.0,
      brushOp: 'add', // 'add' | 'remove' | 'smooth' | 'cave-carve' | 'cave-fill'
      brushRadius: 34,
      brushStrength: 0.72,
      caveHeightOffset: 8.0,
      strokeCount: 0,
    },
  },

  'sdf-caves': {
    type: 'sdf-caves',
    category: 'landform',
    defaultName: 'SDF caves & undercuts',
    glyph: 'cave',
    reads: ['Height', 'Slope', 'Hardness'],
    writes: ['3D SDF Volume', 'Cave Mesh'],
    summary: (p) => `${Math.round(p.carveDepth)}m depth · ${Math.round(p.archHeight)}m arch`,
    defaults: {
      carveDepth: 24,
      archHeight: 16,
      tunnelScale: 2.3,
      elevationCenter: 0.36,
      elevationBand: 0.28,
      slopeMin: 24,
      undercutStrength: 0.68,
      ribRoughness: 0.52,
      opacity: 1.0,
      seed: 6419,
    },
  },

  'spline-feature': {
    type: 'spline-feature',
    category: 'spline',
    defaultName: 'Spline canyon / road',
    glyph: 'spline',
    reads: ['Height', 'Control Path'],
    writes: ['Height', 'Water', 'Hardness'],
    summary: (p) => `${SPLINE_MODES[p.mode]?.label || 'Canyon Cut'} · ${Math.round(p.width)}m`,
    defaults: {
      mode: 0, // 0=Canyon Cut, 1=Graded Mountain Road, 2=Hydrostatic Lake Basin
      width: 44,
      depth: 48,
      wallSteepness: 0.74,
      meanderAmp: 0.32,
      waterFill: 0.28,
      bankFalloff: 0.55,
      opacity: 1.0,
      points: [
        [-190, -145],
        [-72, -38],
        [48, 26],
        [188, 152],
      ],
    },
  },

  'river-incision': {
    type: 'river-incision',
    category: 'simulation',
    defaultName: 'River incision & drainage',
    glyph: 'river',
    reads: ['Height', 'Hardness'],
    writes: ['Height', 'Flow', 'Water'],
    summary: (p) => `${Math.round(p.iterations)} steps · cut ${Math.round(p.incisionStrength * 100)}%`,
    defaults: {
      iterations: 28,
      incisionStrength: 0.68,
      channelWidth: 0.45,
      headwaterRain: 0.58,
      basinPooling: 0.42,
      hardnessRespect: 0.80,
    },
  },

  'hydraulic-erosion': {
    type: 'hydraulic-erosion',
    category: 'simulation',
    defaultName: 'Hydraulic erosion',
    glyph: 'droplet',
    reads: ['Height', 'Hardness', 'Water'],
    writes: ['Height', 'Sediment', 'Flow'],
    summary: (p) => `${Math.round(p.iterations)} iters · cap ${Math.round(p.sedimentCapacity * 100)}%`,
    defaults: {
      iterations: 52,
      erosionStrength: 0.74,
      sedimentCapacity: 0.82,
      depositionRate: 0.58,
      rainRate: 0.65,
      evaporation: 0.16,
      liveParticles: false,
    },
  },

  'thermal-talus': {
    type: 'thermal-talus',
    category: 'simulation',
    defaultName: 'Thermal erosion & talus',
    glyph: 'talus',
    reads: ['Height', 'Hardness'],
    writes: ['Height', 'Coarse Talus'],
    summary: (p) => `${Math.round(p.iterations)} iters · ${Math.round(p.reposeAngle)}° repose`,
    defaults: {
      iterations: 34,
      reposeAngle: 33,
      spallingRate: 0.66,
      talusSpread: 0.58,
      hardnessShield: 0.72,
    },
  },

  'aeolian-glacial': {
    type: 'aeolian-glacial',
    category: 'simulation',
    defaultName: 'Glacial / wind process',
    glyph: 'wind',
    reads: ['Height', 'FineSed'],
    writes: ['Height', 'FineSed', 'SnowIce'],
    summary: (p) => (p.processMode === 1 ? `Aeolian wind · ${Math.round(p.azimuth)}°` : `Glacial snowline ${Math.round(p.snowline * 100)}%`),
    defaults: {
      processMode: 0, // 0=Alpine Snow & Glacier Abrasion, 1=Aeolian Sand Saltation & Ripples
      iterations: 22,
      intensity: 0.68,
      snowline: 0.54,
      glacierCarve: 0.55,
      azimuth: 32,
    },
  },

  'rock-placement': {
    type: 'rock-placement',
    category: 'rocks',
    defaultName: 'Distributed rocks & boulders',
    glyph: 'boulders',
    reads: ['Height', 'Slope', 'Coarse Talus', 'Water'],
    writes: ['3D Rock Instances'],
    summary: (p) => `${Math.round(p.density * 100)}% density · ${p.talusAffinity > 0.5 ? 'Talus toes' : 'Scattered'}`,
    defaults: {
      density: 0.62,
      scaleMin: 0.65,
      scaleMax: 1.55,
      slopeMin: 2,
      slopeMax: 26,
      talusAffinity: 0.72,
      crownOutcrops: 0.55,
      avoidWater: true,
      settleSteps: 28,
      seed: 4410,
    },
  },

  'vegetation-placement': {
    type: 'vegetation-placement',
    category: 'vegetation',
    defaultName: '3D grass & plants',
    glyph: 'grass',
    reads: ['Height', 'Slope', 'Water', 'Sediment', 'SnowIce'],
    writes: ['3D Plant Instances'],
    summary: (p) => `${VEG_SPECIES[p.species]?.label || 'Green Grass'} · ${Math.round(p.density * 100)}%`,
    defaults: {
      species: 0, // 0=Alpine Green Grass, 1=Dry Savanna Grass, 2=Moisture-Driven Blend
      density: 0.58,
      bladeHeight: 1.18,
      slopeMax: 32,
      elevationMin: 0.02,
      elevationMax: 0.62,
      waterAffinity: 0.65,
      patchiness: 0.56,
      windSway: 0.65,
      seed: 9012,
    },
  },
};

export const BASE_ARCHETYPES = {
  0: { id: 0, label: 'Alpine Mountain Divide' },
  1: { id: 1, label: 'Tectonic Fault Escarpment' },
  2: { id: 2, label: 'Dissected Canyon Plateau' },
  3: { id: 3, label: 'Arid Erg & Basin Floor' },
  4: { id: 4, label: 'Volcanic Caldera & Rim' },
  5: { id: 5, label: 'Coastal Headland Massif' },
  6: { id: 6, label: 'Pediment & Inselberg Plain' },
};

export const COMBINE_MODES = {
  0: { id: 0, label: 'Add (Uplift)' },
  1: { id: 1, label: 'Subtract (Excavate)' },
  2: { id: 2, label: 'Max (Union)' },
  3: { id: 3, label: 'Min (Clip)' },
  4: { id: 4, label: 'Blend (Lerp)' },
};

export const SPLINE_MODES = {
  0: { id: 0, label: 'Canyon Gorge Cut' },
  1: { id: 1, label: 'Graded Road / Terrace' },
  2: { id: 2, label: 'Lake Basin Boundary' },
};

export const VEG_SPECIES = {
  0: { id: 0, label: 'Alpine Green Grass' },
  1: { id: 1, label: 'Dry Steppe / Desert Grass' },
  2: { id: 2, label: 'Moisture-Driven Blend' },
};

export const DERIVED_PALETTES = {
  0: { id: 0, label: 'Alpine Granite & Scree', sunAz: 42, sunEl: 34 },
  1: { id: 1, label: 'Colorado Redrock Strata', sunAz: 52, sunEl: 30 },
  2: { id: 2, label: 'Icelandic Basalt & Rhyolite', sunAz: 36, sunEl: 26 },
  3: { id: 3, label: 'Arid Sandstone & Erg', sunAz: 58, sunEl: 28 },
  4: { id: 4, label: 'Limestone Karst & Highland', sunAz: 40, sunEl: 36 },
  5: { id: 5, label: 'Lunar Regolith & Basalt', sunAz: 64, sunEl: 19 },
};

export function createStackLayer(type, overrides = {}) {
  const spec = LAYER_OPERATION_SPECS[type];
  if (!spec) throw new Error(`Unknown terrain layer operation: ${type}`);
  const { name, enabled = true, locked = false, mask, params = {}, ...restParams } = overrides;
  return {
    id: nextLayerId(type.slice(0, 4)),
    type,
    name: name || spec.defaultName,
    enabled,
    locked,
    mask: { ...DEFAULT_LAYER_MASK, ...(mask || {}) },
    params: {
      ...structuredClone(spec.defaults),
      ...structuredClone(restParams),
      ...structuredClone(params),
    },
  };
}

/**
 * Saved Terrain Project Stack Presets.
 * Notice: Every preset is an ordered list of composable geological, SDF, simulation, spline,
 * rock-placement, and vegetation layers (index 0 = TOP / evaluated LAST, last index = BOTTOM / evaluated FIRST).
 */
export const TERRAIN_STACK_PRESETS = {
  'cliff-caves-undercuts': {
    id: 'cliff-caves-undercuts',
    name: 'Overhanging Cliff & Caves',
    subtitle: 'Escarpment + dipping beds + 3D cliff push–pull + hydraulic/talus erosion + SDF caves',
    category: 'Cliff & SDF',
    palette: 4,
    layers: () => [
      createStackLayer('vegetation-placement', {
        name: 'Highland crown turf',
        species: 0, density: 0.56, bladeHeight: 1.15, slopeMax: 27, elevationMin: 0.14, elevationMax: 0.78,
      }),
      createStackLayer('rock-placement', {
        name: 'Cave-mouth & talus boulders',
        density: 0.68, talusAffinity: 0.82, crownOutcrops: 0.50,
      }),
      createStackLayer('sdf-caves', {
        name: 'SDF caves & cliff undercuts',
        carveDepth: 28, archHeight: 18, tunnelScale: 2.1, elevationCenter: 0.34, elevationBand: 0.26, slopeMin: 22, undercutStrength: 0.78,
      }),
      createStackLayer('thermal-talus', {
        name: 'Thermal scree aprons',
        iterations: 38, reposeAngle: 33, spallingRate: 0.72,
      }),
      createStackLayer('hydraulic-erosion', {
        name: 'Gully & waterfall erosion',
        iterations: 54, erosionStrength: 0.76, sedimentCapacity: 0.80, depositionRate: 0.62,
      }),
      createStackLayer('river-incision', {
        name: 'Ravine drainage incision',
        iterations: 24, incisionStrength: 0.62, basinPooling: 0.35,
      }),
      createStackLayer('cliff-push-pull', {
        name: 'Rugged cliff push–pull',
        displacement: 13.5, featureScale: 2.5, slopeThreshold: 25, ledgeStrength: 0.72, overhangBias: 0.68,
      }),
      createStackLayer('sculpt-layer', {
        name: 'SDF sculpt edits',
        opacity: 1.0,
      }),
      createStackLayer('stratigraphic-beds', {
        name: 'Limestone bed packages',
        bedCount: 8, terraceStrength: 0.64, hardSoftContrast: 0.84, dipAngle: 12, strikeAzimuth: 22, ledgeOverhang: 0.45,
      }),
      createStackLayer('base-landform', {
        name: 'Base escarpment landform',
        archetype: 1, seed: 4029, relief: 168, scale: 1.75, roughness: 0.60, ridgeSharpness: 0.70, baseHardness: 0.58,
      }),
    ],
  },

  'canyon-strata-incision': {
    id: 'canyon-strata-incision',
    name: 'Grand Canyon Strata',
    subtitle: 'Kaibab plateau + 11 horizontal strata beds + spline gorge cut + hydraulic & talus passes',
    category: 'Canyon',
    palette: 1,
    layers: () => [
      createStackLayer('vegetation-placement', {
        name: 'Rim dry scrub grass',
        species: 1, density: 0.38, bladeHeight: 0.95, slopeMax: 24, elevationMin: 0.08, elevationMax: 0.86,
      }),
      createStackLayer('rock-placement', {
        name: 'Bench & river boulders',
        density: 0.64, talusAffinity: 0.85, crownOutcrops: 0.45,
      }),
      createStackLayer('thermal-talus', {
        name: 'Shale slope talus cones',
        iterations: 42, reposeAngle: 34, spallingRate: 0.74,
      }),
      createStackLayer('hydraulic-erosion', {
        name: 'Side-canyon tributary cutting',
        iterations: 64, erosionStrength: 0.82, sedimentCapacity: 0.88, depositionRate: 0.56,
      }),
      createStackLayer('river-incision', {
        name: 'Trunk river drainage',
        iterations: 32, incisionStrength: 0.74, basinPooling: 0.48,
      }),
      createStackLayer('cliff-push-pull', {
        name: 'Redwall buttress push–pull',
        displacement: 10.5, featureScale: 2.8, slopeThreshold: 27, ledgeStrength: 0.68, overhangBias: 0.52,
      }),
      createStackLayer('spline-feature', {
        name: 'Colorado gorge spline cut',
        mode: 0, width: 58, depth: 72, wallSteepness: 0.82, meanderAmp: 0.42, waterFill: 0.34,
        points: [[-210, -120], [-75, 34], [64, -28], [212, 118]],
      }),
      createStackLayer('stratigraphic-beds', {
        name: 'Horizontal cliff–bench beds',
        bedCount: 11, terraceStrength: 0.82, hardSoftContrast: 0.92, dipAngle: 3, strikeAzimuth: 14, ledgeOverhang: 0.42,
      }),
      createStackLayer('base-landform', {
        name: 'Uplifted canyon plateau',
        archetype: 2, seed: 5180, relief: 176, scale: 1.55, roughness: 0.52, ridgeSharpness: 0.56, baseHardness: 0.62,
      }),
    ],
  },

  'desert-rock-stacks': {
    id: 'desert-rock-stacks',
    name: 'Desert Rock Stacks',
    subtitle: 'Pediment plain + tiered leaning sandstone stacks + thermal scree + wind-rippled sand apron',
    category: 'Arid & Stacks',
    palette: 3,
    layers: () => [
      createStackLayer('vegetation-placement', {
        name: 'Sparse desert bunchgrass',
        species: 1, density: 0.34, bladeHeight: 0.92, slopeMax: 22, elevationMin: 0.02, elevationMax: 0.34,
      }),
      createStackLayer('rock-placement', {
        name: 'Fallen caprock blocks',
        density: 0.70, talusAffinity: 0.78, crownOutcrops: 0.62,
      }),
      createStackLayer('aeolian-glacial', {
        name: 'Aeolian sand dune drift',
        processMode: 1, iterations: 28, intensity: 0.78, azimuth: 34,
      }),
      createStackLayer('thermal-talus', {
        name: 'Pediment scree cones',
        iterations: 36, reposeAngle: 32, spallingRate: 0.68,
      }),
      createStackLayer('sdf-caves', {
        name: 'Sandstone base alcoves',
        carveDepth: 18, archHeight: 13, tunnelScale: 2.6, elevationCenter: 0.24, elevationBand: 0.20, slopeMin: 28, undercutStrength: 0.62,
      }),
      createStackLayer('cliff-push-pull', {
        name: 'Pillar ledge displacement',
        displacement: 9.0, featureScale: 3.1, slopeThreshold: 26, ledgeStrength: 0.65, overhangBias: 0.60,
      }),
      createStackLayer('rock-stacks', {
        name: 'Tiered sandstone stacks',
        height: 68, spacing: 64, radius: 17, taper: 0.38, tiers: 6, lean: 0.34, leanAzimuth: 38, caprockOverhang: 0.58,
      }),
      createStackLayer('stratigraphic-beds', {
        name: 'Cross-bedded sandstone',
        bedCount: 9, terraceStrength: 0.54, hardSoftContrast: 0.80, dipAngle: 7, strikeAzimuth: -18,
      }),
      createStackLayer('base-landform', {
        name: 'Arid pediment & basin',
        archetype: 6, seed: 8821, relief: 112, scale: 1.65, roughness: 0.48, ridgeSharpness: 0.52, baseHardness: 0.50,
      }),
    ],
  },

  'alpine-glacial-divide': {
    id: 'alpine-glacial-divide',
    name: 'Alpine Divide & Cirques',
    subtitle: 'Arête horns + folded strata + glacial snow/cirque abrasion + river meltwater + alpine meadows',
    category: 'Alpine',
    palette: 0,
    layers: () => [
      createStackLayer('vegetation-placement', {
        name: 'Subalpine valley meadows',
        species: 0, density: 0.66, bladeHeight: 1.12, slopeMax: 30, elevationMin: 0.03, elevationMax: 0.46,
      }),
      createStackLayer('rock-placement', {
        name: 'Moraine & scree boulders',
        density: 0.65, talusAffinity: 0.76, crownOutcrops: 0.58,
      }),
      createStackLayer('aeolian-glacial', {
        name: 'Snowpack & glacier abrasion',
        processMode: 0, iterations: 26, intensity: 0.76, snowline: 0.48, glacierCarve: 0.66,
      }),
      createStackLayer('thermal-talus', {
        name: 'Frost-shatter couloir scree',
        iterations: 32, reposeAngle: 35, spallingRate: 0.64,
      }),
      createStackLayer('hydraulic-erosion', {
        name: 'Meltwater ravine cutting',
        iterations: 48, erosionStrength: 0.72, sedimentCapacity: 0.78, depositionRate: 0.60,
      }),
      createStackLayer('river-incision', {
        name: 'Glacial valley drainage',
        iterations: 26, incisionStrength: 0.64, basinPooling: 0.52,
      }),
      createStackLayer('cliff-push-pull', {
        name: 'Granite arête crags',
        displacement: 10.0, featureScale: 2.4, slopeThreshold: 30, ledgeStrength: 0.52, overhangBias: 0.44,
      }),
      createStackLayer('mountain-ridges', {
        name: 'Cross-cutting horn spurs',
        generator: 0, combineMode: 0, amplitude: 54, scale: 2.3, sharpness: 0.76, azimuth: -34,
        mask: { enabled: true, mode: 'height', min: 0.28, max: 1.0, feather: 0.18, invert: false },
      }),
      createStackLayer('stratigraphic-beds', {
        name: 'Folded gneiss foliation',
        bedCount: 7, terraceStrength: 0.36, hardSoftContrast: 0.68, dipAngle: 26, strikeAzimuth: 32, bedFoldWarp: 0.48,
      }),
      createStackLayer('base-landform', {
        name: 'Alpine mountain range',
        archetype: 0, seed: 4029, relief: 186, scale: 1.90, roughness: 0.68, ridgeSharpness: 0.78, baseHardness: 0.66,
      }),
    ],
  },

  'icelandic-basalt-gorge': {
    id: 'icelandic-basalt-gorge',
    name: 'Icelandic Highlands & Gorge',
    subtitle: 'Basalt flood beds + braided glacial river canyon + emerald moss-grass highlands + snowcaps',
    category: 'Highland',
    palette: 2,
    layers: () => [
      createStackLayer('vegetation-placement', {
        name: 'Emerald highland turf',
        species: 0, density: 0.78, bladeHeight: 1.24, slopeMax: 34, elevationMin: 0.03, elevationMax: 0.58,
      }),
      createStackLayer('rock-placement', {
        name: 'Columnar basalt blocks',
        density: 0.62, talusAffinity: 0.74, crownOutcrops: 0.54,
      }),
      createStackLayer('aeolian-glacial', {
        name: 'Highland snowfields',
        processMode: 0, iterations: 20, intensity: 0.62, snowline: 0.58, glacierCarve: 0.48,
      }),
      createStackLayer('thermal-talus', {
        name: 'Basalt talus slopes',
        iterations: 30, reposeAngle: 34, spallingRate: 0.60,
      }),
      createStackLayer('hydraulic-erosion', {
        name: 'Braided river & gully erosion',
        iterations: 56, erosionStrength: 0.78, sedimentCapacity: 0.84, depositionRate: 0.64,
      }),
      createStackLayer('spline-feature', {
        name: 'Stuðlagil basalt gorge',
        mode: 0, width: 42, depth: 46, wallSteepness: 0.86, meanderAmp: 0.36, waterFill: 0.42,
        points: [[-205, 88], [-62, 18], [72, -32], [206, -96]],
      }),
      createStackLayer('cliff-push-pull', {
        name: 'Columnar wall steps',
        displacement: 8.5, featureScale: 3.4, slopeThreshold: 27, ledgeStrength: 0.70, overhangBias: 0.48,
      }),
      createStackLayer('stratigraphic-beds', {
        name: 'Flood-basalt trap tiers',
        bedCount: 10, terraceStrength: 0.66, hardSoftContrast: 0.84, dipAngle: 6, strikeAzimuth: 18,
      }),
      createStackLayer('base-landform', {
        name: 'Volcanic highland massif',
        archetype: 0, seed: 7714, relief: 158, scale: 1.75, roughness: 0.60, ridgeSharpness: 0.64, baseHardness: 0.60,
      }),
    ],
  },

  'sahara-erg-oasis': {
    id: 'sahara-erg-oasis',
    name: 'Sahara Erg & Spring Oasis',
    subtitle: 'Star/transverse sand dunes + spline spring oasis basin + sandstone tors + shoreline palms/grass',
    category: 'Arid & Stacks',
    palette: 3,
    layers: () => [
      createStackLayer('vegetation-placement', {
        name: 'Oasis shoreline meadow',
        species: 2, density: 0.76, bladeHeight: 1.38, slopeMax: 24, elevationMin: 0.0, elevationMax: 0.32, waterAffinity: 0.95,
      }),
      createStackLayer('rock-placement', {
        name: 'Exhumed sandstone outcrops',
        density: 0.42, talusAffinity: 0.65, crownOutcrops: 0.60,
      }),
      createStackLayer('aeolian-glacial', {
        name: 'Wind saltation & ripples',
        processMode: 1, iterations: 34, intensity: 0.86, azimuth: 28,
      }),
      createStackLayer('spline-feature', {
        name: 'Interdune oasis lake basin',
        mode: 2, width: 82, depth: 26, wallSteepness: 0.45, meanderAmp: 0.15, waterFill: 0.62,
        points: [[-54, -36], [18, -48], [62, 16], [-18, 52]],
      }),
      createStackLayer('rock-stacks', {
        name: 'Rim sandstone inselbergs',
        height: 46, spacing: 92, radius: 18, taper: 0.44, tiers: 4, lean: 0.22, caprockOverhang: 0.42,
        mask: { enabled: true, mode: 'radial', min: 0.48, max: 1.0, feather: 0.20, invert: false },
      }),
      createStackLayer('mountain-ridges', {
        name: 'Transverse dune chains',
        generator: 3, combineMode: 0, amplitude: 66, scale: 2.1, sharpness: 0.78, azimuth: 28,
      }),
      createStackLayer('base-landform', {
        name: 'Desert erg basin',
        archetype: 3, seed: 6204, relief: 118, scale: 1.50, roughness: 0.44, ridgeSharpness: 0.58, baseHardness: 0.42,
      }),
    ],
  },

  'mountain-pass-road': {
    id: 'mountain-pass-road',
    name: 'Alpine Switchback & Lake',
    subtitle: 'Mountain massif + eroded valleys + graded spline mountain road + glacial tarn basin',
    category: 'Spline Demo',
    palette: 0,
    layers: () => [
      createStackLayer('vegetation-placement', {
        name: 'Valley & roadside grass',
        species: 0, density: 0.64, bladeHeight: 1.08, slopeMax: 28, elevationMin: 0.02, elevationMax: 0.55,
      }),
      createStackLayer('rock-placement', {
        name: 'Cut-slope boulders',
        density: 0.54, talusAffinity: 0.72, crownOutcrops: 0.48,
      }),
      createStackLayer('spline-feature', {
        name: 'Graded mountain pass road',
        mode: 1, width: 22, depth: 14, wallSteepness: 0.68, meanderAmp: 0.22, waterFill: 0.0,
        points: [[-205, -155], [-85, -42], [12, 48], [118, -18], [208, 136]],
      }),
      createStackLayer('thermal-talus', {
        name: 'Talus stabilization',
        iterations: 28, reposeAngle: 34, spallingRate: 0.62,
      }),
      createStackLayer('hydraulic-erosion', {
        name: 'Watershed erosion',
        iterations: 46, erosionStrength: 0.70, sedimentCapacity: 0.78, depositionRate: 0.60,
      }),
      createStackLayer('river-incision', {
        name: 'Tarn & stream drainage',
        iterations: 24, incisionStrength: 0.60, basinPooling: 0.58,
      }),
      createStackLayer('stratigraphic-beds', {
        name: 'Tilted alpine strata',
        bedCount: 8, terraceStrength: 0.48, hardSoftContrast: 0.74, dipAngle: 16, strikeAzimuth: -24,
      }),
      createStackLayer('base-landform', {
        name: 'Base alpine massif',
        archetype: 0, seed: 2607, relief: 166, scale: 1.80, roughness: 0.62, ridgeSharpness: 0.70, baseHardness: 0.60,
      }),
    ],
  },

  'lunar-impact-highlands': {
    id: 'lunar-impact-highlands',
    name: 'Lunar Impact Highlands',
    subtitle: 'Basaltic mare + multi-ring crater excavations + thermal regolith slumping + ejecta boulders',
    category: 'Planetary',
    palette: 5,
    layers: () => [
      createStackLayer('rock-placement', {
        name: 'Ejecta blanket boulders',
        density: 0.72, talusAffinity: 0.70, crownOutcrops: 0.65,
      }),
      createStackLayer('thermal-talus', {
        name: 'Crater wall regolith slump',
        iterations: 26, reposeAngle: 31, spallingRate: 0.58,
      }),
      createStackLayer('mountain-ridges', {
        name: 'Secondary crater cluster',
        generator: 4, combineMode: 0, amplitude: 36, scale: 3.6, sharpness: 0.74, seed: 9912,
      }),
      createStackLayer('mountain-ridges', {
        name: 'Primary impact basins',
        generator: 4, combineMode: 0, amplitude: 68, scale: 1.55, sharpness: 0.82, seed: 3318,
      }),
      createStackLayer('base-landform', {
        name: 'Highland regolith crust',
        archetype: 4, seed: 1969, relief: 108, scale: 1.45, roughness: 0.52, ridgeSharpness: 0.48, baseHardness: 0.56,
      }),
    ],
  },
};

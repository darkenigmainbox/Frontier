// Pre-configured AAA Geological Landscape Presets

export const terrainPresets = [
  {
    id: 'alpine-massif',
    name: 'Alpine Glacial Massif',
    category: 'Mountains',
    description: 'Sharp razor ridges, glacial cirque valleys, deep hydraulic gullies & alpine snow',
    waterHeight: 18,
    lighting: 'golden',
    shapeLayers: [
      {
        id: 'shape-base',
        name: 'Alpine Massif Uplift',
        type: 'ridged',
        enabled: true,
        blendMode: 'base',
        opacity: 1.0,
        params: { elevation: 250, scale: 1.15, octaves: 6, sharpness: 2.3, warp: 1.3, seed: 742 }
      },
      {
        id: 'shape-strata',
        name: 'Sedimentary Strata',
        type: 'strata',
        enabled: true,
        blendMode: 'terrace',
        opacity: 0.65,
        params: { frequency: 12, hardness: 0.55, bevel: 0.45, warp: 0.3 }
      },
      {
        id: 'shape-hydraulic',
        name: 'Hydraulic River Erosion',
        type: 'hydraulic',
        enabled: true,
        blendMode: 'carve',
        opacity: 1.0,
        params: { iterations: 55000, capacityFactor: 3.8, erosionRate: 0.4, depositionRate: 0.2, inertia: 0.15, evaporation: 0.02, seed: 104 }
      },
      {
        id: 'shape-thermal',
        name: 'Thermal Scree & Talus',
        type: 'thermal',
        enabled: true,
        blendMode: 'relax',
        opacity: 1.0,
        params: { talusAngle: 35, iterations: 18, talusRate: 0.45 }
      },
      {
        id: 'shape-glacial',
        name: 'Glacial Cirque Carve',
        type: 'glacial',
        enabled: true,
        blendMode: 'carve',
        opacity: 0.85,
        params: { depth: 38, width: 1.3, moraine: 12 }
      }
    ],
    textureLayers: [
      { id: 'tex-cliff', name: 'Bedrock & Cliff Face', enabled: true, color: '#4d4f57', roughness: 0.88, metalness: 0.04, minSlope: 36, maxSlope: 90, slopeFalloff: 8, minElevation: 0, maxElevation: 500, elevationFalloff: 10, useFlowMask: false, useTalusMask: false, useCavityMask: false, opacity: 1.0 },
      { id: 'tex-talus', name: 'Talus & Broken Scree', enabled: true, color: '#73685e', roughness: 0.92, metalness: 0.02, minSlope: 18, maxSlope: 45, slopeFalloff: 6, minElevation: 20, maxElevation: 350, elevationFalloff: 20, useFlowMask: false, useTalusMask: true, useCavityMask: false, opacity: 0.95 },
      { id: 'tex-grass', name: 'Alpine Meadow & Tundra', enabled: true, color: '#566641', roughness: 0.75, metalness: 0.0, minSlope: 0, maxSlope: 32, slopeFalloff: 8, minElevation: 10, maxElevation: 195, elevationFalloff: 25, useFlowMask: false, useTalusMask: false, useCavityMask: false, opacity: 0.9 },
      { id: 'tex-soil', name: 'Valley Soil & Humus', enabled: true, color: '#3a3227', roughness: 0.82, metalness: 0.0, minSlope: 0, maxSlope: 22, slopeFalloff: 6, minElevation: 0, maxElevation: 85, elevationFalloff: 15, useFlowMask: false, useTalusMask: false, useCavityMask: false, opacity: 0.85 },
      { id: 'tex-river', name: 'Stream Channels & Wet Mud', enabled: true, color: '#252924', roughness: 0.15, metalness: 0.08, minSlope: 0, maxSlope: 90, slopeFalloff: 0, minElevation: 0, maxElevation: 500, elevationFalloff: 0, useFlowMask: true, useTalusMask: false, useCavityMask: false, opacity: 1.0 },
      { id: 'tex-snow', name: 'Alpine Snow & Glaciers', enabled: true, color: '#f3f6fa', roughness: 0.42, metalness: 0.05, minSlope: 0, maxSlope: 48, slopeFalloff: 10, minElevation: 165, maxElevation: 500, elevationFalloff: 30, useFlowMask: false, useTalusMask: false, useCavityMask: false, opacity: 1.0 }
    ]
  },
  {
    id: 'grand-canyon',
    name: 'Grand Canyon Terraces',
    category: 'Canyons',
    description: 'Prominent horizontal strata, arid sandstone cliffs, plateau mesas and deep river trenches',
    waterHeight: 12,
    lighting: 'sunset',
    shapeLayers: [
      {
        id: 'shape-base',
        name: 'Mesa Base Uplift',
        type: 'ridged',
        enabled: true,
        blendMode: 'base',
        opacity: 1.0,
        params: { elevation: 210, scale: 0.9, octaves: 5, sharpness: 1.8, warp: 0.8, seed: 331 }
      },
      {
        id: 'shape-strata',
        name: 'Sedimentary Terraces',
        type: 'strata',
        enabled: true,
        blendMode: 'terrace',
        opacity: 0.95,
        params: { frequency: 18, hardness: 0.88, bevel: 0.55, warp: 0.2 }
      },
      {
        id: 'shape-hydraulic',
        name: 'Gully Erosion',
        type: 'hydraulic',
        enabled: true,
        blendMode: 'carve',
        opacity: 0.85,
        params: { iterations: 40000, capacityFactor: 3.2, erosionRate: 0.35, depositionRate: 0.22, inertia: 0.12, evaporation: 0.03, seed: 512 }
      },
      {
        id: 'shape-thermal',
        name: 'Talus Debris Skirts',
        type: 'thermal',
        enabled: true,
        blendMode: 'relax',
        opacity: 1.0,
        params: { talusAngle: 33, iterations: 22, talusRate: 0.5 }
      }
    ],
    textureLayers: [
      { id: 'tex-cliff', name: 'Red Sandstone Strata', enabled: true, color: '#91533c', roughness: 0.85, metalness: 0.05, minSlope: 32, maxSlope: 90, slopeFalloff: 6, minElevation: 0, maxElevation: 500, elevationFalloff: 10, useFlowMask: false, useTalusMask: false, useCavityMask: false, opacity: 1.0 },
      { id: 'tex-talus', name: 'Ochre Scree Slopes', enabled: true, color: '#b57655', roughness: 0.9, metalness: 0.02, minSlope: 15, maxSlope: 42, slopeFalloff: 5, minElevation: 10, maxElevation: 300, elevationFalloff: 15, useFlowMask: false, useTalusMask: true, useCavityMask: false, opacity: 0.95 },
      { id: 'tex-soil', name: 'Arid Valley Clay', enabled: true, color: '#6e4433', roughness: 0.86, metalness: 0.0, minSlope: 0, maxSlope: 25, slopeFalloff: 5, minElevation: 0, maxElevation: 90, elevationFalloff: 10, useFlowMask: false, useTalusMask: false, useCavityMask: false, opacity: 0.9 },
      { id: 'tex-river', name: 'Muddy Colorado Riverbed', enabled: true, color: '#3d2b22', roughness: 0.2, metalness: 0.1, minSlope: 0, maxSlope: 90, slopeFalloff: 0, minElevation: 0, maxElevation: 500, elevationFalloff: 0, useFlowMask: true, useTalusMask: false, useCavityMask: false, opacity: 1.0 }
    ]
  },
  {
    id: 'volcanic-caldera',
    name: 'Volcanic Caldera & Ash',
    category: 'Volcanic',
    description: 'Massive circular caldera rim, central volcanic dome, dark basalt and sulfur deposits',
    waterHeight: 28,
    lighting: 'overcast',
    shapeLayers: [
      {
        id: 'shape-base',
        name: 'Caldera Cone Uplift',
        type: 'ridged',
        enabled: true,
        blendMode: 'base',
        opacity: 1.0,
        params: { elevation: 230, scale: 1.3, octaves: 6, sharpness: 2.1, warp: 1.6, seed: 908 }
      },
      {
        id: 'shape-glacial',
        name: 'Crater Collapse Basin',
        type: 'glacial',
        enabled: true,
        blendMode: 'carve',
        opacity: 0.95,
        params: { depth: 45, width: 1.0, moraine: 20 }
      },
      {
        id: 'shape-hydraulic',
        name: 'Volcanic Rill Erosion',
        type: 'hydraulic',
        enabled: true,
        blendMode: 'carve',
        opacity: 1.0,
        params: { iterations: 48000, capacityFactor: 3.4, erosionRate: 0.42, depositionRate: 0.2, inertia: 0.18, evaporation: 0.025, seed: 671 }
      },
      {
        id: 'shape-thermal',
        name: 'Basalt Scree Slopes',
        type: 'thermal',
        enabled: true,
        blendMode: 'relax',
        opacity: 1.0,
        params: { talusAngle: 36, iterations: 16, talusRate: 0.48 }
      }
    ],
    textureLayers: [
      { id: 'tex-cliff', name: 'Dark Basalt Rock', enabled: true, color: '#2b2c30', roughness: 0.9, metalness: 0.06, minSlope: 35, maxSlope: 90, slopeFalloff: 8, minElevation: 0, maxElevation: 500, elevationFalloff: 10, useFlowMask: false, useTalusMask: false, useCavityMask: false, opacity: 1.0 },
      { id: 'tex-talus', name: 'Volcanic Ash & Scoria', enabled: true, color: '#444247', roughness: 0.94, metalness: 0.03, minSlope: 16, maxSlope: 45, slopeFalloff: 6, minElevation: 20, maxElevation: 350, elevationFalloff: 15, useFlowMask: false, useTalusMask: true, useCavityMask: false, opacity: 0.95 },
      { id: 'tex-grass', name: 'Caldera Lake Moss', enabled: true, color: '#475e3c', roughness: 0.8, metalness: 0.0, minSlope: 0, maxSlope: 26, slopeFalloff: 6, minElevation: 25, maxElevation: 85, elevationFalloff: 12, useFlowMask: false, useTalusMask: false, useCavityMask: false, opacity: 0.85 },
      { id: 'tex-river', name: 'Sulfur & Ash Runoff', enabled: true, color: '#63593a', roughness: 0.35, metalness: 0.05, minSlope: 0, maxSlope: 90, slopeFalloff: 0, minElevation: 0, maxElevation: 500, elevationFalloff: 0, useFlowMask: true, useTalusMask: false, useCavityMask: false, opacity: 1.0 }
    ]
  },
  {
    id: 'coastal-fjord',
    name: 'Nordic Coastal Fjords',
    category: 'Coastal',
    description: 'Dramatic precipitous sea cliffs dropping into deep ocean waters, alpine snow & shoreline shelves',
    waterHeight: 25,
    lighting: 'noon',
    shapeLayers: [
      {
        id: 'shape-base',
        name: 'Fjord Mountain Range',
        type: 'ridged',
        enabled: true,
        blendMode: 'base',
        opacity: 1.0,
        params: { elevation: 260, scale: 1.25, octaves: 6, sharpness: 2.4, warp: 1.4, seed: 442 }
      },
      {
        id: 'shape-glacial',
        name: 'U-Fjord Drowned Valley',
        type: 'glacial',
        enabled: true,
        blendMode: 'carve',
        opacity: 0.9,
        params: { depth: 50, width: 1.4, moraine: 10 }
      },
      {
        id: 'shape-coastal',
        name: 'Sea Cliff Wave Cut',
        type: 'coastal',
        enabled: true,
        blendMode: 'shelf',
        opacity: 0.85,
        params: { waterLevel: 25, waveCut: 0.9, shelfWidth: 0.2 }
      },
      {
        id: 'shape-hydraulic',
        name: 'Waterfall Fluvial Chutes',
        type: 'hydraulic',
        enabled: true,
        blendMode: 'carve',
        opacity: 0.95,
        params: { iterations: 50000, capacityFactor: 3.6, erosionRate: 0.38, depositionRate: 0.16, inertia: 0.16, evaporation: 0.018, seed: 882 }
      }
    ],
    textureLayers: [
      { id: 'tex-cliff', name: 'Granite Sea Cliffs', enabled: true, color: '#41434a', roughness: 0.85, metalness: 0.05, minSlope: 38, maxSlope: 90, slopeFalloff: 6, minElevation: 0, maxElevation: 500, elevationFalloff: 10, useFlowMask: false, useTalusMask: false, useCavityMask: false, opacity: 1.0 },
      { id: 'tex-grass', name: 'Lush Coastal Tundra', enabled: true, color: '#4e693a', roughness: 0.72, metalness: 0.0, minSlope: 0, maxSlope: 34, slopeFalloff: 7, minElevation: 25, maxElevation: 180, elevationFalloff: 20, useFlowMask: false, useTalusMask: false, useCavityMask: false, opacity: 0.95 },
      { id: 'tex-snow', name: 'Fjord Snow Caps', enabled: true, color: '#f6f8fc', roughness: 0.4, metalness: 0.04, minSlope: 0, maxSlope: 50, slopeFalloff: 10, minElevation: 180, maxElevation: 500, elevationFalloff: 25, useFlowMask: false, useTalusMask: false, useCavityMask: false, opacity: 1.0 },
      { id: 'tex-sand', name: 'Pebble Beach Shelf', enabled: true, color: '#8c857b', roughness: 0.88, metalness: 0.02, minSlope: 0, maxSlope: 20, slopeFalloff: 5, minElevation: 22, maxElevation: 28, elevationFalloff: 3, useFlowMask: false, useTalusMask: false, useCavityMask: false, opacity: 0.9 }
    ]
  }
];

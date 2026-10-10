// Frontier AAA Geological Terrain Generator
// Coordinates the Shape Layerstack and Texture Biome Layerstack

import { FastNoise } from './Noise.js';
import { ErosionSimulation } from './ErosionSimulation.js';

export class TerrainGenerator {
  constructor(resolution = 512) {
    this.resolution = resolution;
    this.noise = new FastNoise(1337);
    this.erosion = new ErosionSimulation(resolution);

    this.heightfield = new Float32Array(resolution * resolution);
    this.baseHeightfield = new Float32Array(resolution * resolution);
    this.textureMap = new Float32Array(resolution * resolution * 4); // RGBA output

    this.minHeight = 0;
    this.maxHeight = 1;
    this.meanHeight = 0.5;

    // Default Shape Layerstack
    this.shapeLayers = [
      {
        id: 'shape-base',
        name: 'Alpine Massif Uplift',
        type: 'ridged',
        enabled: true,
        blendMode: 'base',
        opacity: 1.0,
        params: {
          elevation: 240,
          scale: 1.1,
          octaves: 6,
          sharpness: 2.2,
          warp: 1.3,
          seed: 428
        }
      },
      {
        id: 'shape-strata',
        name: 'Sedimentary Strata & Terracing',
        type: 'strata',
        enabled: true,
        blendMode: 'terrace',
        opacity: 0.75,
        params: {
          frequency: 14,
          hardness: 0.65,
          bevel: 0.45,
          warp: 0.35
        }
      },
      {
        id: 'shape-hydraulic',
        name: 'Hydraulic River Erosion',
        type: 'hydraulic',
        enabled: true,
        blendMode: 'carve',
        opacity: 1.0,
        params: {
          iterations: 50000,
          capacityFactor: 3.5,
          erosionRate: 0.38,
          depositionRate: 0.18,
          inertia: 0.15,
          evaporation: 0.02,
          seed: 981
        }
      },
      {
        id: 'shape-thermal',
        name: 'Thermal Scree & Talus Slopes',
        type: 'thermal',
        enabled: true,
        blendMode: 'relax',
        opacity: 1.0,
        params: {
          talusAngle: 35,
          iterations: 16,
          talusRate: 0.45
        }
      },
      {
        id: 'shape-glacial',
        name: 'Glacial Cirque & Valley Carving',
        type: 'glacial',
        enabled: true,
        blendMode: 'carve',
        opacity: 0.85,
        params: {
          depth: 35,
          width: 1.3,
          moraine: 12
        }
      },
      {
        id: 'shape-coastal',
        name: 'Coastal Shelf & Wave Cut',
        type: 'coastal',
        enabled: false,
        blendMode: 'shelf',
        opacity: 0.7,
        params: {
          waterLevel: 22,
          waveCut: 0.8,
          shelfWidth: 0.25
        }
      }
    ];

    // Default Texture / Biome Layerstack
    this.textureLayers = [
      {
        id: 'tex-cliff',
        name: 'Bedrock & Cliff Face',
        enabled: true,
        color: '#4f5059',
        roughness: 0.88,
        metalness: 0.04,
        normalScale: 1.4,
        minSlope: 36,
        maxSlope: 90,
        slopeFalloff: 8,
        minElevation: 0,
        maxElevation: 500,
        elevationFalloff: 10,
        useFlowMask: false,
        useTalusMask: false,
        useCavityMask: false,
        opacity: 1.0
      },
      {
        id: 'tex-talus',
        name: 'Talus & Broken Scree',
        enabled: true,
        color: '#70675c',
        roughness: 0.92,
        metalness: 0.02,
        normalScale: 1.2,
        minSlope: 18,
        maxSlope: 45,
        slopeFalloff: 6,
        minElevation: 20,
        maxElevation: 350,
        elevationFalloff: 20,
        useFlowMask: false,
        useTalusMask: true,
        useCavityMask: false,
        opacity: 0.95
      },
      {
        id: 'tex-grass',
        name: 'Alpine Meadow & Tundra',
        enabled: true,
        color: '#5b6b43',
        roughness: 0.75,
        metalness: 0.0,
        normalScale: 0.7,
        minSlope: 0,
        maxSlope: 32,
        slopeFalloff: 8,
        minElevation: 10,
        maxElevation: 210,
        elevationFalloff: 25,
        useFlowMask: false,
        useTalusMask: false,
        useCavityMask: false,
        opacity: 0.9
      },
      {
        id: 'tex-soil',
        name: 'Valley Soil & Humus',
        enabled: true,
        color: '#3d3429',
        roughness: 0.82,
        metalness: 0.0,
        normalScale: 0.9,
        minSlope: 0,
        maxSlope: 24,
        slopeFalloff: 6,
        minElevation: 0,
        maxElevation: 95,
        elevationFalloff: 15,
        useFlowMask: false,
        useTalusMask: false,
        useCavityMask: false,
        opacity: 0.85
      },
      {
        id: 'tex-river',
        name: 'Stream Channels & Wet Mud',
        enabled: true,
        color: '#282b26',
        roughness: 0.16,
        metalness: 0.08,
        normalScale: 1.5,
        minSlope: 0,
        maxSlope: 90,
        slopeFalloff: 0,
        minElevation: 0,
        maxElevation: 500,
        elevationFalloff: 0,
        useFlowMask: true,
        useTalusMask: false,
        useCavityMask: false,
        opacity: 1.0
      },
      {
        id: 'tex-snow',
        name: 'Alpine Snow & Glacial Drifts',
        enabled: true,
        color: '#f2f4f8',
        roughness: 0.42,
        metalness: 0.05,
        normalScale: 0.5,
        minSlope: 0,
        maxSlope: 48,
        slopeFalloff: 10,
        minElevation: 175,
        maxElevation: 500,
        elevationFalloff: 30,
        useFlowMask: false,
        useTalusMask: false,
        useCavityMask: false,
        opacity: 1.0
      },
      {
        id: 'tex-sand',
        name: 'Lakeside Sand & Gravel',
        enabled: true,
        color: '#bfa780',
        roughness: 0.8,
        metalness: 0.0,
        normalScale: 0.8,
        minSlope: 0,
        maxSlope: 18,
        slopeFalloff: 5,
        minElevation: 0,
        maxElevation: 22,
        elevationFalloff: 4,
        useFlowMask: false,
        useTalusMask: false,
        useCavityMask: false,
        opacity: 0.8
      }
    ];
  }

  setResolution(newRes) {
    if (this.resolution !== newRes) {
      this.resolution = newRes;
      this.heightfield = new Float32Array(newRes * newRes);
      this.baseHeightfield = new Float32Array(newRes * newRes);
      this.textureMap = new Float32Array(newRes * newRes * 4);
      this.erosion.resize(newRes);
    }
  }

  // Generate heightfield from Shape Layerstack
  generateHeightfield() {
    const S = this.resolution;
    this.heightfield.fill(0);
    this.baseHeightfield.fill(0);

    let maxWorldElevation = 200;

    for (const layer of this.shapeLayers) {
      if (!layer.enabled) continue;
      const op = layer.opacity;

      switch (layer.type) {
        case 'base':
        case 'ridged': {
          this.noise.reseed(layer.params.seed || 1337);
          const elev = layer.params.elevation || 200;
          maxWorldElevation = Math.max(maxWorldElevation, elev);
          const sc = (layer.params.scale || 1.0) * 1.8 / S;
          const oct = layer.params.octaves || 6;
          const shp = layer.params.sharpness || 2.0;
          const warp = layer.params.warp || 1.2;

          for (let y = 0; y < S; y++) {
            const yRow = y * S;
            for (let x = 0; x < S; x++) {
              let nx = x * sc;
              let ny = y * sc;
              let val = 0;
              if (warp > 0) {
                val = this.noise.warpedFbm(nx, ny, warp, oct);
              } else {
                val = this.noise.ridgedMF(nx, ny, oct, 2.1, 0.5, shp);
              }

              val = Math.max(0, val) * elev;
              if (layer.blendMode === 'base' || layer.blendMode === 'replace') {
                this.heightfield[yRow + x] = val * op;
              } else if (layer.blendMode === 'add') {
                this.heightfield[yRow + x] += val * op;
              } else if (layer.blendMode === 'max') {
                this.heightfield[yRow + x] = Math.max(this.heightfield[yRow + x], val * op);
              }
            }
          }
          // Copy to base
          this.baseHeightfield.set(this.heightfield);
          break;
        }

        case 'strata': {
          const freq = layer.params.frequency || 12;
          const hard = layer.params.hardness || 0.6;
          const bevel = layer.params.bevel || 0.4;
          const warp = layer.params.warp || 0.3;

          for (let i = 0; i < S * S; i++) {
            const h = this.heightfield[i];
            if (h <= 0) continue;
            // Terracing formula
            const normH = h / maxWorldElevation;
            const phase = normH * freq * Math.PI * 2;
            const step = Math.sin(phase);
            const steppedH = Math.floor(normH * freq) / freq + (Math.sin((normH * freq % 1) * Math.PI - Math.PI * 0.5) * 0.5 + 0.5) / freq * bevel;
            const diff = (steppedH * maxWorldElevation - h) * hard * op;
            this.heightfield[i] = Math.max(0, h + diff);
          }
          break;
        }

        case 'glacial': {
          const depth = (layer.params.depth || 30) * op;
          const width = layer.params.width || 1.2;
          // Valley gouging using inverted ridge
          for (let y = 0; y < S; y++) {
            const yRow = y * S;
            const ny = (y / S - 0.5) * 2.0;
            for (let x = 0; x < S; x++) {
              const nx = (x / S - 0.5) * 2.0;
              const dist = Math.sqrt(nx * nx * width + ny * ny);
              if (dist < 0.6) {
                // U-shaped glacial profile
                const gouge = (1.0 - Math.pow(dist / 0.6, 2.0)) * depth;
                this.heightfield[yRow + x] = Math.max(0, this.heightfield[yRow + x] - gouge);
              }
            }
          }
          break;
        }

        case 'coastal': {
          const wl = layer.params.waterLevel || 20;
          const cut = (layer.params.waveCut || 0.8) * op;
          for (let i = 0; i < S * S; i++) {
            const h = this.heightfield[i];
            if (h < wl + 8) {
              const delta = (wl + 8) - h;
              this.heightfield[i] = Math.max(0, h - delta * cut * 0.5);
            }
          }
          break;
        }

        case 'hydraulic': {
          // Hydraulic Droplet Erosion Pass
          this.erosion.simulateHydraulic(this.heightfield, {
            ...layer.params,
            iterations: Math.floor((layer.params.iterations || 45000) * op)
          });
          break;
        }

        case 'thermal': {
          // Thermal Talus Pass
          this.erosion.simulateThermal(this.heightfield, {
            ...layer.params,
            iterations: Math.floor((layer.params.iterations || 16) * op)
          });
          break;
        }
      }
    }

    // Compute surface derivatives (Normals, Slope, Cavity)
    this.erosion.computeDerivatives(this.heightfield, maxWorldElevation);

    // Compute Min / Max / Mean stats
    let minH = Infinity;
    let maxH = -Infinity;
    let sumH = 0;
    for (let i = 0; i < S * S; i++) {
      const h = this.heightfield[i];
      if (h < minH) minH = h;
      if (h > maxH) maxH = h;
      sumH += h;
    }
    this.minHeight = minH;
    this.maxHeight = maxH;
    this.meanHeight = sumH / (S * S);

    // Now texture the terrain using the Texture Layerstack
    this.generateBiomeTextures();
  }

  // Helper: Hex color to RGB [0..1]
  hexToRgb(hex) {
    const c = parseInt(hex.replace('#', ''), 16);
    return [((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255];
  }

  // Generate Texture / Splatmap from Texture Layerstack
  generateBiomeTextures() {
    const S = this.resolution;
    const rgba = this.textureMap;
    const heights = this.heightfield;
    const slopes = this.erosion.slopeMap;
    const flows = this.erosion.flowMap;
    const talus = this.erosion.talusMap;
    const cavity = this.erosion.cavityMap;

    // Clear to dark bedrock base
    rgba.fill(0);

    for (let i = 0; i < S * S; i++) {
      const h = heights[i];
      const slope = slopes[i];
      const flow = flows[i];
      const tal = talus[i];
      const cav = cavity[i];

      let rAcc = 0.2, gAcc = 0.2, bAcc = 0.22;
      let totalWeight = 0.001;

      for (const layer of this.textureLayers) {
        if (!layer.enabled) continue;

        // Slope mask with smooth falloff
        let slopeWeight = 1.0;
        if (slope < layer.minSlope) {
          slopeWeight = Math.max(0, 1.0 - (layer.minSlope - slope) / (layer.slopeFalloff || 1));
        } else if (slope > layer.maxSlope) {
          slopeWeight = Math.max(0, 1.0 - (slope - layer.maxSlope) / (layer.slopeFalloff || 1));
        }

        // Elevation mask with smooth falloff
        let elevWeight = 1.0;
        if (h < layer.minElevation) {
          elevWeight = Math.max(0, 1.0 - (layer.minElevation - h) / (layer.elevationFalloff || 1));
        } else if (h > layer.maxElevation) {
          elevWeight = Math.max(0, 1.0 - (h - layer.maxElevation) / (layer.elevationFalloff || 1));
        }

        let w = slopeWeight * elevWeight;

        // Apply environmental feature masks
        if (layer.useFlowMask) {
          w *= Math.min(1.0, flow * 2.8);
        }
        if (layer.useTalusMask) {
          w *= Math.min(1.0, tal * 2.2);
        }
        if (layer.useCavityMask) {
          w *= cav;
        }

        w *= (layer.opacity ?? 1.0);

        if (w > 0.001) {
          const [lr, lg, lb] = this.hexToRgb(layer.color);
          rAcc += lr * w;
          gAcc += lg * w;
          bAcc += lb * w;
          totalWeight += w;
        }
      }

      const invW = 1.0 / totalWeight;
      const idx4 = i * 4;
      // Ambient cavity modulation (darkens deep crevices, highlights ridges)
      const aoMod = 0.65 + cav * 0.35;
      rgba[idx4] = Math.min(1.0, (rAcc * invW) * aoMod);
      rgba[idx4 + 1] = Math.min(1.0, (gAcc * invW) * aoMod);
      rgba[idx4 + 2] = Math.min(1.0, (bAcc * invW) * aoMod);
      rgba[idx4 + 3] = 1.0; // Alpha
    }
  }
}

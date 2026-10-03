// Material presets with accurate physical & optical parameters
// Water, Milk, Chocolate, Mud

export const FLUID_PRESETS = {
  water: {
    name: "Pure Water",
    density: 1000.0,
    viscosity: 0.035,
    adhesion: 0.3,
    sticking: 0.15,
    gravity: -9.8,
    // Optical & Shader properties
    baseColor: [0.15, 0.45, 0.85, 0.45], // Crisp translucent azure
    subsurfaceColor: [0.4, 0.8, 1.0, 1.0],
    roughness: 0.05,
    metallic: 0.0,
    ior: 1.333,
    opacity: 0.55,
    stickingColor: [0.25, 0.5, 0.8, 0.6],
    attenuationDistance: 1.5,
    specularPower: 128.0,
    subsurfaceIntensity: 0.4,
    foamIntensity: 0.7
  },
  milk: {
    name: "Whole Milk",
    density: 1030.0,
    viscosity: 0.09,
    adhesion: 0.55,
    sticking: 0.45,
    gravity: -9.8,
    // Optical & Shader properties (Creamy white opaque with heavy SSS)
    baseColor: [0.94, 0.93, 0.89, 1.0],
    subsurfaceColor: [1.0, 0.96, 0.88, 1.0],
    roughness: 0.22,
    metallic: 0.0,
    ior: 1.348,
    opacity: 0.98,
    stickingColor: [0.92, 0.90, 0.82, 0.9],
    attenuationDistance: 0.3,
    specularPower: 48.0,
    subsurfaceIntensity: 0.85,
    foamIntensity: 0.3
  },
  chocolate: {
    name: "Melted Chocolate",
    density: 1320.0,
    viscosity: 0.45,
    adhesion: 0.85,
    sticking: 0.85,
    gravity: -8.5,
    // Optical & Shader properties (Rich dark cocoa brown, glossy specular sheen)
    baseColor: [0.22, 0.11, 0.06, 1.0],
    subsurfaceColor: [0.45, 0.22, 0.12, 1.0],
    roughness: 0.18,
    metallic: 0.0,
    ior: 1.48,
    opacity: 1.0,
    stickingColor: [0.18, 0.08, 0.04, 1.0],
    attenuationDistance: 0.1,
    specularPower: 72.0,
    subsurfaceIntensity: 0.5,
    foamIntensity: 0.1
  },
  mud: {
    name: "Thick Earth Mud",
    density: 1650.0,
    viscosity: 0.85,
    adhesion: 0.95,
    sticking: 0.95,
    gravity: -10.5,
    // Optical & Shader properties (Matte grainy silt, high sticking residue)
    baseColor: [0.28, 0.20, 0.14, 1.0],
    subsurfaceColor: [0.35, 0.25, 0.18, 1.0],
    roughness: 0.75,
    metallic: 0.0,
    ior: 1.54,
    opacity: 1.0,
    stickingColor: [0.22, 0.15, 0.10, 1.0],
    attenuationDistance: 0.05,
    specularPower: 16.0,
    subsurfaceIntensity: 0.15,
    foamIntensity: 0.05
  }
};

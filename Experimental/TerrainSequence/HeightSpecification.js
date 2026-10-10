// HeightSpecification — the parametric schema for both layer stacks.
//
// Every layer kind declares its fields here and nowhere else: the inspector builds itself from this
// table, the uniform packer walks it, and the WGSL kernels read the same slot indices. A field's
// `Slot` is its position in the 24-float parameter block handed to the shader, so the slot numbers
// in this file and the `Par(nu)` reads in ReliefSolver.js / MaterialSolver.js are one contract.
// CheckSpecification.mjs asserts that contract rather than trusting it.

export const Prefix = "Frontier.Terrain.v1:";

// ── Blend modes ───────────────────────────────────────────────────────────────────────────────────
// Shared by both stacks; the ordinal is what the shader switches on.
export const BlendModes = [
  "Replace",
  "Add",
  "Subtract",
  "Multiply",
  "Screen",
  "Overlay",
  "Maximum",
  "Minimum",
  "Difference",
];

export const MaskSources = ["None", "Altitude", "Slope", "Flow", "Deposit", "Curvature"];

// ── Terrain layer kinds ───────────────────────────────────────────────────────────────────────────
// Role "Generator" writes a fresh field and composites it; "Modifier" transforms what is already there.

export const TerrainKinds = {
  Noise: {
    Label: "Fractal noise",
    Role: "Generator",
    Glyph: "noise",
    Blurb:
      "Gradient noise summed over octaves. Derivative damping feeds each octave's slope back into " +
      "the next, which is what stops fractal noise reading as static.",
    Fields: [
      { Key: "Style",     Slot: 4,  Label: "Profile",        Type: "select", Options: ["Smooth", "Ridged", "Billow", "Hybrid"], Default: "Hybrid" },
      { Key: "Scale",     Slot: 0,  Label: "Feature size",   Type: "range", Min: 80,  Max: 16000, Step: 10,   Default: 4200, Unit: "m" },
      { Key: "Height",    Slot: 8,  Label: "Amplitude",      Type: "range", Min: 0,   Max: 1,     Step: 0.001, Default: 0.62 },
      { Key: "Octaves",   Slot: 1,  Label: "Octaves",        Type: "range", Min: 1,   Max: 14,    Step: 1,    Default: 9 },
      { Key: "Lacunarity",Slot: 2,  Label: "Lacunarity",     Type: "range", Min: 1.4, Max: 3.2,   Step: 0.01, Default: 2.04 },
      { Key: "Gain",      Slot: 3,  Label: "Persistence",    Type: "range", Min: 0.2, Max: 0.78,  Step: 0.005, Default: 0.49 },
      { Key: "Erosive",   Slot: 7,  Label: "Slope damping",  Type: "range", Min: 0,   Max: 1,     Step: 0.005, Default: 0.72,
        Hint: "Detail fades where the accumulated gradient is already steep." },
      { Key: "Warp",      Slot: 5,  Label: "Domain warp",    Type: "range", Min: 0,   Max: 1.2,   Step: 0.005, Default: 0.32 },
      { Key: "WarpScale", Slot: 6,  Label: "Warp size",      Type: "range", Min: 0.1, Max: 4,     Step: 0.01, Default: 1.1 },
      { Key: "Rotation",  Slot: 11, Label: "Rotation",       Type: "range", Min: 0,   Max: 360,   Step: 1,    Default: 27, Unit: "°" },
      { Key: "OffsetX",   Slot: 9,  Label: "Offset X",       Type: "range", Min: -20000, Max: 20000, Step: 10, Default: 0, Unit: "m" },
      { Key: "OffsetY",   Slot: 10, Label: "Offset Y",       Type: "range", Min: -20000, Max: 20000, Step: 10, Default: 0, Unit: "m" },
    ],
  },

  Mountain: {
    Label: "Mountain range",
    Role: "Generator",
    Glyph: "mountain",
    Blurb:
      "Ridged multifractal with per-octave weight feedback. Peaks sharpen where the previous octave " +
      "was already high, which produces connected ridge lines instead of isolated spikes.",
    Fields: [
      { Key: "Scale",     Slot: 0, Label: "Range size",     Type: "range", Min: 500, Max: 24000, Step: 50,  Default: 7600, Unit: "m" },
      { Key: "Height",    Slot: 4, Label: "Amplitude",      Type: "range", Min: 0,   Max: 1,     Step: 0.001, Default: 0.9 },
      { Key: "Peaks",     Slot: 1, Label: "Octaves",        Type: "range", Min: 2,   Max: 14,    Step: 1,   Default: 10 },
      { Key: "Sharpness", Slot: 2, Label: "Ridge sharpness",Type: "range", Min: 0.2, Max: 3,     Step: 0.01, Default: 1.35 },
      { Key: "Roughness", Slot: 3, Label: "Roughness",      Type: "range", Min: 0.2, Max: 0.9,   Step: 0.005, Default: 0.52 },
      { Key: "Warp",      Slot: 5, Label: "Domain warp",    Type: "range", Min: 0,   Max: 1.5,   Step: 0.005, Default: 0.55 },
      { Key: "Stratify",  Slot: 6, Label: "Stratification", Type: "range", Min: 0,   Max: 1,     Step: 0.005, Default: 0.18,
        Hint: "Bedding planes. Rock remembers how it was laid down." },
      { Key: "SlopeDamp", Slot: 7, Label: "Slope damping",  Type: "range", Min: 0,   Max: 1,     Step: 0.005, Default: 0.68 },
      { Key: "OffsetX",   Slot: 8, Label: "Offset X",       Type: "range", Min: -20000, Max: 20000, Step: 10, Default: 0, Unit: "m" },
      { Key: "OffsetY",   Slot: 9, Label: "Offset Y",       Type: "range", Min: -20000, Max: 20000, Step: 10, Default: 0, Unit: "m" },
    ],
  },

  Cellular: {
    Label: "Cellular",
    Role: "Generator",
    Glyph: "cell",
    Blurb: "Worley cells. F2−F1 gives fracture walls, plateau quantises the cell to a flat top.",
    Fields: [
      { Key: "Style",  Slot: 2, Label: "Profile",     Type: "select", Options: ["Cell", "Fracture", "Plateau", "Crackle"], Default: "Plateau" },
      { Key: "Scale",  Slot: 0, Label: "Cell size",   Type: "range", Min: 100, Max: 12000, Step: 10, Default: 2400, Unit: "m" },
      { Key: "Height", Slot: 3, Label: "Amplitude",   Type: "range", Min: 0, Max: 1, Step: 0.001, Default: 0.3 },
      { Key: "Jitter", Slot: 1, Label: "Jitter",      Type: "range", Min: 0, Max: 1, Step: 0.005, Default: 0.88 },
      { Key: "Steps",  Slot: 4, Label: "Terrace steps", Type: "range", Min: 1, Max: 24, Step: 1, Default: 5 },
      { Key: "Warp",   Slot: 5, Label: "Domain warp", Type: "range", Min: 0, Max: 1.2, Step: 0.005, Default: 0.22 },
      { Key: "OffsetX",Slot: 6, Label: "Offset X",    Type: "range", Min: -20000, Max: 20000, Step: 10, Default: 0, Unit: "m" },
      { Key: "OffsetY",Slot: 7, Label: "Offset Y",    Type: "range", Min: -20000, Max: 20000, Step: 10, Default: 0, Unit: "m" },
    ],
  },

  Dunes: {
    Label: "Dunes",
    Role: "Generator",
    Glyph: "dune",
    Blurb: "Transverse dune field: a wind-aligned ridge wave, advected along the wind by low noise.",
    Fields: [
      { Key: "Wavelength", Slot: 0, Label: "Wavelength",  Type: "range", Min: 40, Max: 3000, Step: 5, Default: 420, Unit: "m" },
      { Key: "Direction",  Slot: 1, Label: "Wind bearing",Type: "range", Min: 0, Max: 360, Step: 1, Default: 115, Unit: "°" },
      { Key: "Height",     Slot: 3, Label: "Amplitude",   Type: "range", Min: 0, Max: 1, Step: 0.001, Default: 0.11 },
      { Key: "Sharpness",  Slot: 2, Label: "Crest shape", Type: "range", Min: 0, Max: 1, Step: 0.005, Default: 0.62,
        Hint: "Slip face asymmetry — the lee side steepens toward the angle of repose." },
      { Key: "Drift",      Slot: 4, Label: "Drift",       Type: "range", Min: 0, Max: 1.5, Step: 0.005, Default: 0.58 },
      { Key: "Variation",  Slot: 5, Label: "Variation",   Type: "range", Min: 0, Max: 1, Step: 0.005, Default: 0.42 },
    ],
  },

  Crater: {
    Label: "Craters",
    Role: "Generator",
    Glyph: "crater",
    Blurb: "Impact or caldera basins on a jittered lattice, with raised rims and ejecta falloff.",
    Fields: [
      { Key: "Spacing", Slot: 0, Label: "Spacing",    Type: "range", Min: 200, Max: 16000, Step: 50, Default: 5200, Unit: "m" },
      { Key: "Radius",  Slot: 1, Label: "Radius",     Type: "range", Min: 0.05, Max: 0.6, Step: 0.005, Default: 0.3 },
      { Key: "Depth",   Slot: 2, Label: "Depth",      Type: "range", Min: 0, Max: 1, Step: 0.005, Default: 0.42 },
      { Key: "Rim",     Slot: 3, Label: "Rim height", Type: "range", Min: 0, Max: 1, Step: 0.005, Default: 0.34 },
      { Key: "Height",  Slot: 4, Label: "Amplitude",  Type: "range", Min: 0, Max: 1, Step: 0.001, Default: 0.28 },
      { Key: "Density", Slot: 5, Label: "Density",    Type: "range", Min: 0, Max: 1, Step: 0.005, Default: 0.55 },
    ],
  },

  Tilt: {
    Label: "Tilt",
    Role: "Generator",
    Glyph: "tilt",
    Blurb: "A linear ramp. Composite under a range to drop it toward a coast or a valley floor.",
    Fields: [
      { Key: "Direction", Slot: 0, Label: "Bearing",  Type: "range", Min: 0, Max: 360, Step: 1, Default: 215, Unit: "°" },
      { Key: "Rise",      Slot: 1, Label: "Rise",     Type: "range", Min: -1, Max: 1, Step: 0.005, Default: 0.5 },
      { Key: "Curve",     Slot: 2, Label: "Curvature",Type: "range", Min: 0.25, Max: 4, Step: 0.01, Default: 1.4 },
      { Key: "Centre",    Slot: 3, Label: "Centre",   Type: "range", Min: 0, Max: 1, Step: 0.005, Default: 0.5 },
    ],
  },

  Hydraulic: {
    Label: "Hydraulic erosion",
    Role: "Modifier",
    Glyph: "water",
    Blurb:
      "Virtual-pipe shallow water. Rain lands, flows downhill by pressure difference, dissolves rock " +
      "up to a velocity-dependent carrying capacity, and drops it again where the flow slows. The " +
      "river network and the sediment fans are not painted on — they are where the water went.",
    Fields: [
      { Key: "Iterations",  Slot: 0, Label: "Iterations",  Type: "range", Min: 8, Max: 800, Step: 4, Default: 260,
        Host: true, Hint: "Solved progressively — the viewport shows it happening." },
      { Key: "Rain",        Slot: 1, Label: "Rainfall",    Type: "range", Min: 0.002, Max: 0.12, Step: 0.001, Default: 0.028 },
      { Key: "Evaporation", Slot: 2, Label: "Evaporation", Type: "range", Min: 0.002, Max: 0.12, Step: 0.001, Default: 0.022 },
      { Key: "Capacity",    Slot: 3, Label: "Carry capacity", Type: "range", Min: 0.05, Max: 4, Step: 0.01, Default: 1.15 },
      { Key: "Dissolve",    Slot: 4, Label: "Dissolving",  Type: "range", Min: 0.01, Max: 1.2, Step: 0.005, Default: 0.42 },
      { Key: "Deposition",  Slot: 5, Label: "Deposition",  Type: "range", Min: 0.01, Max: 1.2, Step: 0.005, Default: 0.46 },
      { Key: "Talus",       Slot: 6, Label: "Coupled talus", Type: "range", Min: 0, Max: 1, Step: 0.005, Default: 0.35,
        Hint: "Slumping of the banks the water has undercut." },
      { Key: "MinSlope",    Slot: 7, Label: "Minimum slope", Type: "range", Min: 0, Max: 0.2, Step: 0.001, Default: 0.012 },
      { Key: "Inertia",     Slot: 8, Label: "Flow inertia", Type: "range", Min: 0, Max: 0.95, Step: 0.005, Default: 0.72 },
      { Key: "Hardness",    Slot: 9, Label: "Strata hardness", Type: "range", Min: 0, Max: 1, Step: 0.005, Default: 0.3,
        Hint: "Alternating hard and soft beds, so the channels cut in steps." },
    ],
  },

  Thermal: {
    Label: "Thermal erosion",
    Role: "Modifier",
    Glyph: "thermal",
    Blurb:
      "Freeze–thaw and gravity. Any slope above the talus angle sheds material to its lower " +
      "neighbours until the whole field sits at or under the angle of repose.",
    Fields: [
      { Key: "Iterations", Slot: 0, Label: "Iterations", Type: "range", Min: 4, Max: 400, Step: 4, Default: 90, Host: true },
      { Key: "Talus",      Slot: 1, Label: "Talus angle", Type: "range", Min: 12, Max: 62, Step: 0.5, Default: 34, Unit: "°" },
      { Key: "Rate",       Slot: 2, Label: "Rate",       Type: "range", Min: 0.05, Max: 1, Step: 0.005, Default: 0.5 },
      { Key: "Scree",      Slot: 3, Label: "Scree spread", Type: "range", Min: 0, Max: 1, Step: 0.005, Default: 0.45 },
    ],
  },

  Terrace: {
    Label: "Terraces",
    Role: "Modifier",
    Glyph: "terrace",
    Blurb: "Quantises elevation into beds with a controllable tread and riser profile.",
    Fields: [
      { Key: "Steps",     Slot: 0, Label: "Steps",      Type: "range", Min: 2, Max: 64, Step: 1, Default: 14 },
      { Key: "Sharpness", Slot: 1, Label: "Riser edge", Type: "range", Min: 0, Max: 1, Step: 0.005, Default: 0.68 },
      { Key: "Tilt",      Slot: 2, Label: "Tread tilt", Type: "range", Min: 0, Max: 1, Step: 0.005, Default: 0.25 },
      { Key: "Variation", Slot: 3, Label: "Variation",  Type: "range", Min: 0, Max: 1, Step: 0.005, Default: 0.3 },
    ],
  },

  Warp: {
    Label: "Warp",
    Role: "Modifier",
    Glyph: "warp",
    Blurb: "Displaces the field through itself. Small amounts break straight ridges convincingly.",
    Fields: [
      { Key: "Amount",  Slot: 0, Label: "Amount",     Type: "range", Min: 0, Max: 1200, Step: 1, Default: 260, Unit: "m" },
      { Key: "Scale",   Slot: 1, Label: "Warp size",  Type: "range", Min: 100, Max: 12000, Step: 10, Default: 2600, Unit: "m" },
      { Key: "Octaves", Slot: 2, Label: "Octaves",    Type: "range", Min: 1, Max: 8, Step: 1, Default: 4 },
    ],
  },

  Blur: {
    Label: "Smooth",
    Role: "Modifier",
    Glyph: "blur",
    Blurb: "Separable Gaussian. Useful under a slope mask to settle valley floors without softening peaks.",
    Fields: [
      { Key: "Radius",   Slot: 0, Label: "Radius",   Type: "range", Min: 0.5, Max: 24, Step: 0.5, Default: 3, Unit: "px" },
      { Key: "Strength", Slot: 1, Label: "Strength", Type: "range", Min: 0, Max: 1, Step: 0.005, Default: 1 },
    ],
  },

  Curve: {
    Label: "Levels",
    Role: "Modifier",
    Glyph: "curve",
    Blurb: "Remaps elevation. Contrast pivots about the midpoint; gamma biases where the detail sits.",
    Fields: [
      { Key: "InLow",   Slot: 2, Label: "Input floor",  Type: "range", Min: 0, Max: 1, Step: 0.005, Default: 0 },
      { Key: "InHigh",  Slot: 3, Label: "Input ceiling",Type: "range", Min: 0, Max: 1, Step: 0.005, Default: 1 },
      { Key: "Gamma",   Slot: 1, Label: "Gamma",        Type: "range", Min: 0.2, Max: 4, Step: 0.01, Default: 1 },
      { Key: "Contrast",Slot: 0, Label: "Contrast",     Type: "range", Min: -1, Max: 1, Step: 0.005, Default: 0 },
      { Key: "OutLow",  Slot: 4, Label: "Output floor", Type: "range", Min: 0, Max: 1, Step: 0.005, Default: 0 },
      { Key: "OutHigh", Slot: 5, Label: "Output ceiling",Type: "range", Min: 0, Max: 1, Step: 0.005, Default: 1 },
    ],
  },
};

// ── Texture layer kinds ───────────────────────────────────────────────────────────────────────────
// Every texture layer carries a colour, a roughness and a coverage rule. The rule produces a weight
// in 0..1 which is then blended into the running albedo.

export const TextureKinds = {
  Fill: {
    Label: "Base rock",
    Glyph: "fill",
    Blurb: "Covers everything. Keep it as the bottom layer so no pixel is ever unpainted.",
    Fields: [],
  },
  Altitude: {
    Label: "Altitude band",
    Glyph: "altitude",
    Blurb: "Weighted by elevation, with a soft shoulder at each end of the band.",
    Fields: [
      { Key: "Low",     Slot: 0, Label: "Lower edge",  Type: "range", Min: 0, Max: 1, Step: 0.002, Default: 0.3 },
      { Key: "High",    Slot: 1, Label: "Upper edge",  Type: "range", Min: 0, Max: 1, Step: 0.002, Default: 0.75 },
      { Key: "Falloff", Slot: 2, Label: "Shoulder",    Type: "range", Min: 0.002, Max: 0.5, Step: 0.002, Default: 0.11 },
    ],
  },
  Slope: {
    Label: "Slope band",
    Glyph: "slope",
    Blurb: "Weighted by surface angle. Cliff faces take rock, shallow ground takes soil.",
    Fields: [
      { Key: "Low",     Slot: 0, Label: "From",     Type: "range", Min: 0, Max: 90, Step: 0.5, Default: 34, Unit: "°" },
      { Key: "High",    Slot: 1, Label: "To",       Type: "range", Min: 0, Max: 90, Step: 0.5, Default: 90, Unit: "°" },
      { Key: "Falloff", Slot: 2, Label: "Shoulder", Type: "range", Min: 0.5, Max: 30, Step: 0.5, Default: 9, Unit: "°" },
    ],
  },
  Flow: {
    Label: "Water courses",
    Glyph: "flow",
    Blurb: "Follows the accumulated flow recorded by hydraulic erosion. No erosion layer, no rivers.",
    Fields: [
      { Key: "Low",     Slot: 0, Label: "Threshold", Type: "range", Min: 0, Max: 1, Step: 0.002, Default: 0.12 },
      { Key: "Falloff", Slot: 2, Label: "Shoulder",  Type: "range", Min: 0.002, Max: 0.6, Step: 0.002, Default: 0.2 },
      { Key: "Wetness", Slot: 5, Label: "Wetness",   Type: "range", Min: 0, Max: 1, Step: 0.005, Default: 0.75,
        Hint: "Darkens and sharpens the specular response, the way wet rock actually behaves." },
    ],
  },
  Deposit: {
    Label: "Sediment",
    Glyph: "deposit",
    Blurb: "Where the water dropped what it was carrying — fans, bars and valley fill.",
    Fields: [
      { Key: "Low",     Slot: 0, Label: "Threshold", Type: "range", Min: 0, Max: 1, Step: 0.002, Default: 0.08 },
      { Key: "Falloff", Slot: 2, Label: "Shoulder",  Type: "range", Min: 0.002, Max: 0.6, Step: 0.002, Default: 0.25 },
    ],
  },
  Cavity: {
    Label: "Cavity",
    Glyph: "cavity",
    Blurb: "Curvature. Positive picks out ridges and edges, negative picks out crevices.",
    Fields: [
      { Key: "Low",     Slot: 0, Label: "Bias",      Type: "range", Min: -1, Max: 1, Step: 0.005, Default: -0.35 },
      { Key: "Falloff", Slot: 2, Label: "Shoulder",  Type: "range", Min: 0.01, Max: 1, Step: 0.005, Default: 0.4 },
    ],
  },
  Snow: {
    Label: "Snow",
    Glyph: "snow",
    Blurb:
      "Altitude above a wandering snow line, less whatever the slope sheds and the running water " +
      "melts. Cornices build on the lee side of ridges.",
    Fields: [
      { Key: "Low",      Slot: 0, Label: "Snow line",  Type: "range", Min: 0, Max: 1, Step: 0.002, Default: 0.62 },
      { Key: "Falloff",  Slot: 2, Label: "Shoulder",   Type: "range", Min: 0.002, Max: 0.5, Step: 0.002, Default: 0.1 },
      { Key: "SlopeMax", Slot: 5, Label: "Sheds above",Type: "range", Min: 10, Max: 80, Step: 0.5, Default: 42, Unit: "°" },
      { Key: "Drift",    Slot: 6, Label: "Drifting",   Type: "range", Min: 0, Max: 1, Step: 0.005, Default: 0.5 },
    ],
  },
  Scatter: {
    Label: "Patches",
    Glyph: "scatter",
    Blurb: "Free-standing noise. Lichen, mineral staining, vegetation — anything that is not geometric.",
    Fields: [
      { Key: "Low",     Slot: 0, Label: "Coverage",  Type: "range", Min: 0, Max: 1, Step: 0.005, Default: 0.45 },
      { Key: "Falloff", Slot: 2, Label: "Edge",      Type: "range", Min: 0.005, Max: 0.5, Step: 0.005, Default: 0.12 },
    ],
  },
};

// Shared by every texture layer, appended after the kind's own fields.
export const TextureCommonFields = [
  { Key: "NoiseAmount", Slot: 3, Label: "Break-up",   Type: "range", Min: 0, Max: 1, Step: 0.005, Default: 0.35 },
  { Key: "NoiseScale",  Slot: 4, Label: "Break-up size", Type: "range", Min: 20, Max: 4000, Step: 5, Default: 380, Unit: "m" },
];

export function TextureFields(Kind) {
  const Entry = TextureKinds[Kind];
  if (!Entry) return [];
  return Entry.Fields.concat(TextureCommonFields);
}

export function TerrainFields(Kind) {
  const Entry = TerrainKinds[Kind];
  return Entry ? Entry.Fields : [];
}

// ── Layer construction ────────────────────────────────────────────────────────────────────────────

let Counter = 0;
export function FreshIdentifier() {
  Counter += 1;
  return `L${Date.now().toString(36)}${Counter.toString(36)}`;
}

export function DefaultValues(Fields) {
  const Out = {};
  for (const F of Fields) Out[F.Key] = F.Default;
  return Out;
}

export function MakeTerrainLayer(Kind, Overrides = {}) {
  const Entry = TerrainKinds[Kind];
  if (!Entry) throw new Error(`Unknown terrain layer kind: ${Kind}`);
  return {
    Id: FreshIdentifier(),
    Kind,
    Name: Overrides.Name || Entry.Label,
    Enabled: true,
    Blend: Entry.Role === "Generator" ? "Add" : "Replace",
    Opacity: 1,
    Seed: 0,
    Mask: { Source: "None", Low: 0, High: 1, Falloff: 0.12, Invert: false },
    Values: Object.assign(DefaultValues(Entry.Fields), Overrides.Values || {}),
    ...("Blend" in Overrides ? { Blend: Overrides.Blend } : {}),
    ...("Opacity" in Overrides ? { Opacity: Overrides.Opacity } : {}),
    ...("Seed" in Overrides ? { Seed: Overrides.Seed } : {}),
    ...("Mask" in Overrides ? { Mask: Object.assign({ Source: "None", Low: 0, High: 1, Falloff: 0.12, Invert: false }, Overrides.Mask) } : {}),
  };
}

export function MakeTextureLayer(Kind, Overrides = {}) {
  const Entry = TextureKinds[Kind];
  if (!Entry) throw new Error(`Unknown texture layer kind: ${Kind}`);
  return {
    Id: FreshIdentifier(),
    Kind,
    Name: Overrides.Name || Entry.Label,
    Enabled: true,
    Blend: "Mix",
    Opacity: 1,
    Colour: Overrides.Colour || "#8a8278",
    Roughness: "Roughness" in Overrides ? Overrides.Roughness : 0.82,
    Seed: 0,
    Values: Object.assign(DefaultValues(TextureFields(Kind)), Overrides.Values || {}),
    ...("Opacity" in Overrides ? { Opacity: Overrides.Opacity } : {}),
    ...("Seed" in Overrides ? { Seed: Overrides.Seed } : {}),
  };
}

// ── Uniform packing ───────────────────────────────────────────────────────────────────────────────
// 256 bytes per layer (the uniform dynamic-offset alignment): 4 u32 and 8 f32 of framing, then
// 24 f32 of parameters at slots 0..23, then padding.

export const LayerStride = 256;

export function PackTerrainLayer(Layer, Into, ByteOffset, Context) {
  const Words = new Uint32Array(Into, ByteOffset, LayerStride / 4);
  const Reals = new Float32Array(Into, ByteOffset, LayerStride / 4);
  Words.fill(0);

  const Entry = TerrainKinds[Layer.Kind];
  Words[0] = TerrainOrdinal(Layer.Kind);
  Words[1] = Math.max(0, BlendModes.indexOf(Layer.Blend));
  Words[2] = (Context.Seed + (Layer.Seed | 0)) >>> 0;
  Words[3] =
    (Layer.Mask.Invert ? 1 : 0) |
    (Math.max(0, MaskSources.indexOf(Layer.Mask.Source)) << 1) |
    (Entry.Role === "Generator" ? 0 : 1 << 8) |
    (Layer.Kind === "Hydraulic" ? 1 << 9 : 0);

  Reals[4] = Layer.Opacity;
  Reals[5] = Layer.Mask.Low;
  Reals[6] = Layer.Mask.High;
  Reals[7] = Math.max(1e-4, Layer.Mask.Falloff);
  Reals[8] = Context.WorldSize;
  Reals[9] = Context.HeightScale;
  Reals[10] = Context.Size;
  Reals[11] = 0;

  for (const F of Entry.Fields) {
    const V = Layer.Values[F.Key];
    Reals[12 + F.Slot] = F.Type === "select" ? Math.max(0, F.Options.indexOf(V)) : Number(V);
  }
  return LayerStride;
}

export function PackTextureLayer(Layer, Into, ByteOffset, Context) {
  const Words = new Uint32Array(Into, ByteOffset, LayerStride / 4);
  const Reals = new Float32Array(Into, ByteOffset, LayerStride / 4);
  Words.fill(0);

  Words[0] = TextureOrdinal(Layer.Kind);
  Words[1] = 0;
  Words[2] = (Context.Seed + (Layer.Seed | 0) + 7919) >>> 0;
  Words[3] = Layer.Enabled ? 1 : 0;

  const C = ReadColour(Layer.Colour);
  Reals[4] = Layer.Opacity;
  Reals[5] = C[0];
  Reals[6] = C[1];
  Reals[7] = C[2];
  Reals[8] = Layer.Roughness;
  Reals[9] = Context.WorldSize;
  Reals[10] = Context.HeightScale;
  Reals[11] = 0;

  for (const F of TextureFields(Layer.Kind)) {
    const V = Layer.Values[F.Key];
    Reals[12 + F.Slot] = F.Type === "select" ? Math.max(0, F.Options.indexOf(V)) : Number(V);
  }
  return LayerStride;
}

export function TerrainOrdinal(Kind) {
  return Object.keys(TerrainKinds).indexOf(Kind);
}
export function TextureOrdinal(Kind) {
  return Object.keys(TextureKinds).indexOf(Kind);
}

// sRGB hex to linear float triple — the shader works in linear light throughout.
export function ReadColour(Hex) {
  const T = Hex.replace("#", "");
  const N = parseInt(T.length === 3 ? T.split("").map((C) => C + C).join("") : T, 16);
  const S = [(N >> 16) & 255, (N >> 8) & 255, N & 255].map((X) => X / 255);
  return S.map((X) => (X <= 0.04045 ? X / 12.92 : Math.pow((X + 0.055) / 1.055, 2.4)));
}

export function WriteColour(Linear) {
  const S = Linear.map((X) => (X <= 0.0031308 ? X * 12.92 : 1.055 * Math.pow(X, 1 / 2.4) - 0.055));
  return "#" + S.map((X) => Math.round(Math.min(1, Math.max(0, X)) * 255).toString(16).padStart(2, "0")).join("");
}

// ── Scene defaults ────────────────────────────────────────────────────────────────────────────────

export function DefaultWorld() {
  return {
    Resolution: 1024,
    WorldSize: 12000,
    HeightScale: 2400,
    Seed: 20771,
    Sun: { Azimuth: 128, Elevation: 21, Intensity: 5.4, Warmth: 0.46 },
    Sky: { Turbidity: 2.6, Ambient: 1.6, Exposure: 3.4, Haze: 0.42 },
    Water: { Enabled: true, Level: 0.168, Depth: 0.62, Clarity: 0.44 },
    Render: { Mode: "Shaded", Wireframe: false, Contours: false, Quality: "High" },
  };
}

// ── Presets ───────────────────────────────────────────────────────────────────────────────────────
// Each is a complete scene. They exist to prove the stack rather than to decorate it.

export const Presets = {
  "Alpine basin": () => ({
    World: Object.assign(DefaultWorld(), { WorldSize: 14000, HeightScale: 2900, Seed: 20771 }),
    Terrain: [
      MakeTerrainLayer("Mountain", { Blend: "Replace", Values: { Scale: 4200, Height: 0.95, Peaks: 11, Sharpness: 1.42, Roughness: 0.54, Warp: 0.62, Stratify: 0.16, SlopeDamp: 0.7 } }),
      MakeTerrainLayer("Noise", { Name: "Foothill detail", Blend: "Add", Opacity: 0.42, Values: { Scale: 1250, Height: 0.2, Octaves: 8, Style: "Hybrid", Erosive: 0.8, Warp: 0.2 },
        Mask: { Source: "Altitude", Low: 0.0, High: 0.6, Falloff: 0.2, Invert: false } }),
      MakeTerrainLayer("Thermal", { Values: { Iterations: 60, Talus: 37, Rate: 0.45 } }),
      MakeTerrainLayer("Hydraulic", { Values: { Iterations: 320, Rain: 0.03, Capacity: 1.3, Dissolve: 0.44, Deposition: 0.44, Talus: 0.4, Hardness: 0.34 } }),
    ],
    Texture: [
      MakeTextureLayer("Fill", { Name: "Granite", Colour: "#6d6a66", Roughness: 0.86 }),
      MakeTextureLayer("Altitude", { Name: "Alpine meadow", Colour: "#4a5331", Roughness: 0.92, Values: { Low: 0.02, High: 0.4, Falloff: 0.13, NoiseAmount: 0.45, NoiseScale: 520 } }),
      MakeTextureLayer("Slope", { Name: "Cliff rock", Colour: "#5b554f", Roughness: 0.8, Values: { Low: 38, High: 90, Falloff: 10, NoiseAmount: 0.3, NoiseScale: 260 } }),
      MakeTextureLayer("Deposit", { Name: "Moraine", Colour: "#8c8070", Roughness: 0.9, Values: { Low: 0.06, Falloff: 0.28, NoiseAmount: 0.4, NoiseScale: 300 } }),
      MakeTextureLayer("Flow", { Name: "Melt channels", Colour: "#4b5358", Roughness: 0.28, Values: { Low: 0.1, Falloff: 0.18, Wetness: 0.85, NoiseAmount: 0.2, NoiseScale: 160 } }),
      MakeTextureLayer("Snow", { Name: "Snow pack", Colour: "#e8eef5", Roughness: 0.55, Values: { Low: 0.58, Falloff: 0.09, SlopeMax: 44, Drift: 0.6, NoiseAmount: 0.3, NoiseScale: 700 } }),
    ],
  }),

  "Desert mesa": () => ({
    World: Object.assign(DefaultWorld(), { WorldSize: 9000, HeightScale: 1150, Seed: 4421,
      Sun: { Azimuth: 262, Elevation: 14, Intensity: 6.1, Warmth: 0.72 },
      Sky: { Turbidity: 4.1, Ambient: 1.75, Exposure: 3.55, Haze: 0.6 },
      Water: { Enabled: false, Level: 0.08, Depth: 0.5, Clarity: 0.4 } }),
    Terrain: [
      MakeTerrainLayer("Cellular", { Name: "Mesa plateaus", Blend: "Replace", Values: { Style: "Plateau", Scale: 2400, Height: 0.74, Jitter: 0.92, Steps: 4, Warp: 0.3 } }),
      MakeTerrainLayer("Noise", { Name: "Desert floor", Blend: "Add", Opacity: 0.5, Values: { Scale: 2600, Height: 0.16, Octaves: 7, Style: "Smooth", Erosive: 0.5 } }),
      MakeTerrainLayer("Terrace", { Values: { Steps: 18, Sharpness: 0.82, Tilt: 0.2, Variation: 0.35 } }),
      MakeTerrainLayer("Hydraulic", { Name: "Arroyo cutting", Values: { Iterations: 240, Rain: 0.018, Evaporation: 0.05, Capacity: 1.8, Dissolve: 0.5, Deposition: 0.3, Talus: 0.5, Hardness: 0.55 } }),
      MakeTerrainLayer("Dunes", { Blend: "Add", Opacity: 0.6, Values: { Wavelength: 330, Direction: 104, Height: 0.055, Sharpness: 0.7, Drift: 0.7 },
        Mask: { Source: "Altitude", Low: 0, High: 0.3, Falloff: 0.1, Invert: false } }),
    ],
    Texture: [
      MakeTextureLayer("Fill", { Name: "Sandstone", Colour: "#9c6c46", Roughness: 0.9 }),
      MakeTextureLayer("Altitude", { Name: "Upper bed", Colour: "#b8864f", Roughness: 0.88, Values: { Low: 0.45, High: 1, Falloff: 0.05, NoiseAmount: 0.3, NoiseScale: 420 } }),
      MakeTextureLayer("Altitude", { Name: "Iron band", Colour: "#7a3c28", Opacity: 0.85, Roughness: 0.84, Values: { Low: 0.3, High: 0.38, Falloff: 0.02, NoiseAmount: 0.25, NoiseScale: 240 } }),
      MakeTextureLayer("Slope", { Name: "Cliff face", Colour: "#8a5c3b", Roughness: 0.78, Values: { Low: 42, High: 90, Falloff: 7, NoiseAmount: 0.35, NoiseScale: 180 } }),
      MakeTextureLayer("Deposit", { Name: "Wash sand", Colour: "#cfae7d", Roughness: 0.95, Values: { Low: 0.05, Falloff: 0.3, NoiseAmount: 0.3, NoiseScale: 260 } }),
      MakeTextureLayer("Cavity", { Name: "Crevice shade", Colour: "#3a2418", Opacity: 0.6, Roughness: 0.9, Values: { Low: -0.4, Falloff: 0.45, NoiseAmount: 0.2, NoiseScale: 120 } }),
    ],
  }),

  "Volcanic coast": () => ({
    World: Object.assign(DefaultWorld(), { WorldSize: 16000, HeightScale: 2600, Seed: 9931,
      Sun: { Azimuth: 42, Elevation: 11, Intensity: 5.0, Warmth: 0.6 },
      Sky: { Turbidity: 3.2, Ambient: 1.45, Exposure: 3.4, Haze: 0.55 },
      Water: { Enabled: true, Level: 0.2, Depth: 0.75, Clarity: 0.5 } }),
    Terrain: [
      MakeTerrainLayer("Tilt", { Blend: "Replace", Values: { Direction: 220, Rise: 0.46, Curve: 1.9, Centre: 0.42 } }),
      MakeTerrainLayer("Crater", { Name: "Caldera", Blend: "Add", Values: { Spacing: 11000, Radius: 0.34, Depth: 0.5, Rim: 0.52, Height: 0.5, Density: 0.3 } }),
      MakeTerrainLayer("Mountain", { Name: "Flank", Blend: "Add", Opacity: 0.78, Values: { Scale: 6200, Height: 0.6, Peaks: 10, Sharpness: 1.1, Roughness: 0.58, Warp: 0.7, Stratify: 0.3 } }),
      MakeTerrainLayer("Thermal", { Values: { Iterations: 80, Talus: 31, Rate: 0.55 } }),
      MakeTerrainLayer("Hydraulic", { Name: "Ravines", Values: { Iterations: 360, Rain: 0.04, Capacity: 1.1, Dissolve: 0.5, Deposition: 0.52, Talus: 0.45, Hardness: 0.2 } }),
    ],
    Texture: [
      MakeTextureLayer("Fill", { Name: "Basalt", Colour: "#35322f", Roughness: 0.88 }),
      MakeTextureLayer("Slope", { Name: "Fresh rock", Colour: "#232122", Roughness: 0.72, Values: { Low: 36, High: 90, Falloff: 9, NoiseAmount: 0.4, NoiseScale: 220 } }),
      MakeTextureLayer("Altitude", { Name: "Vegetation", Colour: "#2f4423", Roughness: 0.95, Values: { Low: 0.21, High: 0.52, Falloff: 0.1, NoiseAmount: 0.55, NoiseScale: 430 } }),
      MakeTextureLayer("Deposit", { Name: "Ash fall", Colour: "#6b6560", Roughness: 0.93, Values: { Low: 0.07, Falloff: 0.3, NoiseAmount: 0.45, NoiseScale: 340 } }),
      MakeTextureLayer("Flow", { Name: "Streams", Colour: "#3f4a4a", Roughness: 0.2, Values: { Low: 0.09, Falloff: 0.16, Wetness: 0.9, NoiseAmount: 0.15, NoiseScale: 140 } }),
      MakeTextureLayer("Altitude", { Name: "Shore", Colour: "#8b8275", Roughness: 0.9, Values: { Low: 0.19, High: 0.225, Falloff: 0.012, NoiseAmount: 0.3, NoiseScale: 90 } }),
    ],
  }),

  "Badlands": () => ({
    World: Object.assign(DefaultWorld(), { WorldSize: 6000, HeightScale: 820, Seed: 5150,
      Sun: { Azimuth: 318, Elevation: 17, Intensity: 5.6, Warmth: 0.64 },
      Water: { Enabled: false, Level: 0.05, Depth: 0.5, Clarity: 0.4 } }),
    Terrain: [
      MakeTerrainLayer("Noise", { Blend: "Replace", Values: { Scale: 1900, Height: 0.6, Octaves: 10, Style: "Ridged", Erosive: 0.85, Warp: 0.45, Gain: 0.52 } }),
      MakeTerrainLayer("Terrace", { Values: { Steps: 26, Sharpness: 0.55, Tilt: 0.4, Variation: 0.5 } }),
      MakeTerrainLayer("Hydraulic", { Name: "Gully carving", Values: { Iterations: 480, Rain: 0.05, Evaporation: 0.03, Capacity: 2.2, Dissolve: 0.72, Deposition: 0.35, Talus: 0.6, MinSlope: 0.006, Hardness: 0.62 } }),
      MakeTerrainLayer("Thermal", { Values: { Iterations: 40, Talus: 44, Rate: 0.35 } }),
    ],
    Texture: [
      MakeTextureLayer("Fill", { Name: "Mudstone", Colour: "#7d6a55", Roughness: 0.92 }),
      MakeTextureLayer("Altitude", { Name: "Pale bed", Colour: "#b2a68c", Roughness: 0.9, Values: { Low: 0.55, High: 0.72, Falloff: 0.025, NoiseAmount: 0.2, NoiseScale: 200 } }),
      MakeTextureLayer("Altitude", { Name: "Red bed", Colour: "#8a4634", Roughness: 0.88, Values: { Low: 0.3, High: 0.42, Falloff: 0.02, NoiseAmount: 0.25, NoiseScale: 180 } }),
      MakeTextureLayer("Altitude", { Name: "Grey bed", Colour: "#5f6157", Roughness: 0.9, Values: { Low: 0.12, High: 0.21, Falloff: 0.02, NoiseAmount: 0.25, NoiseScale: 160 } }),
      MakeTextureLayer("Cavity", { Name: "Rill shade", Colour: "#4a3a2c", Opacity: 0.7, Roughness: 0.92, Values: { Low: -0.3, Falloff: 0.35, NoiseAmount: 0.2, NoiseScale: 90 } }),
      MakeTextureLayer("Deposit", { Name: "Dry wash", Colour: "#c0ae8e", Roughness: 0.95, Values: { Low: 0.05, Falloff: 0.28, NoiseAmount: 0.35, NoiseScale: 230 } }),
    ],
  }),
};

export function LoadPreset(Name) {
  const Make = Presets[Name];
  if (!Make) throw new Error(`Unknown preset: ${Name}`);
  const Scene = Make();
  Scene.Name = Name;
  return Scene;
}

export const PresetNames = Object.keys(Presets);

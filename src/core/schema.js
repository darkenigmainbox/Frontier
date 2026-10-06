/**
 * FRONTIER — Material parameter schemas
 *
 * One schema per shader family. The schema is the single source of truth:
 *  - it generates the GLSL uniform block (uniform name = "frk" + Key)
 *  - it generates the Inspector UI (groups, sliders, colour wells, toggles)
 *  - it generates the preset defaults
 */

export const GROUPS = {
	base:  'Base Coat',
	flake: 'Metallic Flake',
	coat:  'Clear Coat',
	surf:  'Surface Detail',
	iron:  'Friction Surface',
	heat:  'Thermal',
	glaze: 'Glaze',
	weave: 'Weave & Pile',
	tread: 'Tread',
	optic: 'Optics',
	metal: 'Finish',
	comp:  'Layup',
	layout: 'Layout / Projection',
};

const S = ( key, label, min, max, step, def, group, extra = {} ) => ( {
	type: 'slider', key, label, min, max, step, default: def, group, ...extra,
} );
const C = ( key, label, def, group, extra = {} ) => ( {
	type: 'color', key, label, default: def, group, ...extra,
} );
const T = ( key, label, def, group, extra = {} ) => ( {
	type: 'toggle', key, label, default: def, group, ...extra,
} );
const SEL = ( key, label, options, def, group, extra = {} ) => ( {
	type: 'select', key, label, options, default: def, group, ...extra,
} );

/* Appended to every family — controls how the procedural pattern is laid onto
 * the surface. "Surface" locks patterns to world-space metres (they never swim
 * and stay a constant physical size). "UV" uses the mesh's own UV channels. */
export const LAYOUT_PARAMS = [
	SEL( 'projection', 'Projection', [
		{ id: 'surface', label: 'Surface (world)' },
		{ id: 'uv', label: 'UV' },
	], 'surface', GROUPS.layout ),
	S( 'worldScale', 'World Scale', 0.05, 4, 0.01, 1, GROUPS.layout, {
		hint: 'Metres-to-pattern multiplier. 1 = true 1:1 physical scale.',
	} ),
	S( 'uvScaleX', 'UV Tile Metres X', 0.02, 8, 0.01, 1, GROUPS.layout, {
		hint: 'How many metres of real surface one unit of U covers. Keeps patterns physical in UV mode.',
	} ),
	S( 'uvScaleY', 'UV Tile Metres Y', 0.02, 8, 0.01, 1, GROUPS.layout ),
];


/* ================================================================== */
/*  PAINT — Unreal "Clear Coat" shading model + discrete flake BRDF    */
/* ================================================================== */
export const PAINT_PARAMS = [
	// --- Base Coat ---
	C( 'baseColor', 'Pigment', '#8a1220', GROUPS.base ),
	C( 'edgeColor', 'Flop / Edge Tone', '#2a0509', GROUPS.base, {
		hint: 'Colour the coat shifts to at grazing angles (metallic "travel").',
	} ),
	S( 'metallic', 'Metallic', 0, 1, 0.01, 0.92, GROUPS.base ),
	S( 'roughness', 'Roughness', 0.02, 1, 0.005, 0.28, GROUPS.base, {
		hint: 'Global microsurface roughness of the pigment / flake layer.',
		hero: true,
	} ),
	S( 'flop', 'Colour Flop', 0, 1, 0.01, 0.55, GROUPS.base ),
	S( 'depthFog', 'Depth Fog', 0, 1, 0.01, 0.45, GROUPS.base, {
		hint: 'Light absorbed travelling through the binder between flakes.',
	} ),

	// --- Metallic Flake ---
	S( 'flakeDensity', 'Flake Density', 0, 100, 0.5, 46, GROUPS.flake, {
		hint: 'Flakes per unit of body surface. Higher = finer, denser glitter.',
		hero: true,
	} ),
	S( 'flakeSpread', 'Orientation Spread', 0, 1, 0.01, 0.34, GROUPS.flake, {
		hint: '0 = perfectly flat mirrors (tight glitter), 1 = hemispherical scatter.',
	} ),
	S( 'flakeStrength', 'Coverage', 0, 1, 0.01, 0.85, GROUPS.flake ),
	C( 'flakeColor', 'Flake Tint', '#c8ccd2', GROUPS.flake ),
	C( 'pearlColor', 'Pearl Shift', '#7fd4ff', GROUPS.flake ),
	S( 'pearl', 'Pearlescence', 0, 1, 0.01, 0.18, GROUPS.flake ),
	S( 'sparkle', 'Sparkle Intensity', 0, 3, 0.01, 1.15, GROUPS.flake ),
	S( 'sparkleSharp', 'Sparkle Sharpness', 0.004, 0.2, 0.001, 0.026, GROUPS.flake, {
		hint: 'Micro-lobe width of an individual flake. Lower = pin-point glitter.',
	} ),
	S( 'flakeSeed', 'Flake Seed', 0, 100, 1, 17, GROUPS.flake ),

	// --- Clear Coat ---
	S( 'paintDepth', 'Paint Depth', 0, 100, 0.5, 42, GROUPS.coat, {
		hint: 'Total film build in µm. Deeper coats parallax the flakes, flop harder and read wetter.',
		hero: true,
	} ),
	S( 'coatStrength', 'Coat Intensity', 0, 1, 0.01, 1, GROUPS.coat, { hero: true } ),
	S( 'coatRoughness', 'Coat Roughness', 0, 1, 0.005, 0.035, GROUPS.coat ),
	S( 'coatIOR', 'Coat IOR', 1.2, 2.0, 0.01, 1.52, GROUPS.coat ),
	S( 'orangePeel', 'Orange Peel', 0, 1, 0.01, 0.22, GROUPS.coat, {
		hint: 'Microscopic ripple left by the spray gun.',
	} ),
	S( 'swirl', 'Swirl Marks', 0, 1, 0.01, 0.08, GROUPS.coat ),
	S( 'chip', 'Stone Chips', 0, 1, 0.01, 0, GROUPS.surf ),
];

/* ================================================================== */
/*  BRAKE — cast iron rotor / carbon-ceramic disc                      */
/* ================================================================== */
export const BRAKE_PARAMS = [
	SEL( 'discType', 'Disc Type', [
		{ id: 'iron', label: 'Cast Iron' },
		{ id: 'ceramic', label: 'Carbon Ceramic' },
		{ id: 'steel', label: 'Drilled Steel' },
	], 'iron', GROUPS.iron ),

	C( 'baseColor', 'Base Colour', '#6a6d72', GROUPS.iron ),
	C( 'rustColor', 'Oxide Colour', '#7a3d1c', GROUPS.iron ),
	S( 'metallic', 'Metallic', 0, 1, 0.01, 0.95, GROUPS.iron ),
	S( 'roughness', 'Roughness', 0.02, 1, 0.005, 0.42, GROUPS.iron, { hero: true } ),

	S( 'grooveDensity', 'Machining Density', 0, 100, 0.5, 55, GROUPS.iron, {
		hint: 'Concentric lathe passes left by the final turning operation.',
		hero: true,
	} ),
	S( 'grooveStrength', 'Machining Strength', 0, 1, 0.01, 0.65, GROUPS.iron ),
	S( 'aniso', 'Anisotropy', 0, 1, 0.01, 0.72, GROUPS.iron, {
		hint: 'Turned finish reflects light tangentially — the classic rotor streak.',
	} ),
	S( 'wear', 'Pad Wear / Polishing', 0, 1, 0.01, 0.35, GROUPS.iron ),
	S( 'speckle', 'Cast Speckle', 0, 1, 0.01, 0.5, GROUPS.iron, {
		hint: 'Graphite nodules & sand inclusions in the casting.',
	} ),
	S( 'speckleScale', 'Speckle Scale', 20, 2000, 5, 420, GROUPS.iron, {
		hint: 'Nodules per metre of disc face.',
	} ),

	S( 'drill', 'Drilled Holes', 0, 1, 0.01, 0.0, GROUPS.iron, {
		hint: 'Cross-drilled degassing holes — cut in the shader, so you genuinely see into the vane channel.',
	} ),
	S( 'drillCount', 'Holes per Ring', 4, 40, 1, 18, GROUPS.iron ),
	S( 'drillRings', 'Hole Rings', 1, 4, 1, 3, GROUPS.iron ),
	S( 'drillRadius', 'Hole Radius (mm)', 0.5, 14, 0.1, 4.5, GROUPS.iron ),

	S( 'rust', 'Surface Rust', 0, 1, 0.01, 0.12, GROUPS.heat ),
	S( 'heat', 'Heat / Tempering', 0, 1, 0.01, 0.0, GROUPS.heat, {
		hint: 'Oxide interference colour: straw → bronze → purple → blue → grey.',
		hero: true,
	} ),
	S( 'heatSpread', 'Heat Band Width', 0, 1, 0.01, 0.6, GROUPS.heat ),
	S( 'glow', 'Incandescence', 0, 1, 0.01, 0.0, GROUPS.heat, {
		hint: 'Blackbody emission above ~700 °C.',
	} ),
	S( 'discRadius', 'Disc Radius', 0.02, 1, 0.005, 0.16, GROUPS.iron ),
];

/* ================================================================== */
/*  CERAMIC — glazed / technical ceramic                               */
/* ================================================================== */
export const CERAMIC_PARAMS = [
	C( 'glazeColor', 'Glaze Colour', '#e8e4dc', GROUPS.glaze ),
	C( 'bodyColor', 'Body Colour', '#b9b2a6', GROUPS.glaze ),
	C( 'speckColor', 'Speck Colour', '#4a3f36', GROUPS.glaze ),
	S( 'roughness', 'Roughness', 0, 1, 0.005, 0.09, GROUPS.glaze, { hero: true } ),
	S( 'coatStrength', 'Glaze Depth', 0, 1, 0.01, 1, GROUPS.glaze, { hero: true } ),
	S( 'coatRoughness', 'Glaze Roughness', 0, 1, 0.005, 0.02, GROUPS.glaze ),
	S( 'coatIOR', 'IOR', 1.2, 2.2, 0.01, 1.56, GROUPS.glaze ),
	S( 'speckle', 'Speckle', 0, 1, 0.01, 0.3, GROUPS.glaze ),
	S( 'speckleScale', 'Speckle Scale', 10, 2000, 5, 320, GROUPS.glaze ),
	S( 'crazing', 'Crazing', 0, 1, 0.01, 0.15, GROUPS.glaze, {
		hint: 'Hairline crack network in the glaze.',
		hero: true,
	} ),
	S( 'crazingScale', 'Crazing Scale', 5, 600, 1, 90, GROUPS.glaze ),
	S( 'microBump', 'Surface Waviness', 0, 1, 0.01, 0.25, GROUPS.surf ),
	S( 'subsurface', 'Subsurface', 0, 1, 0.01, 0.3, GROUPS.glaze, {
		hint: 'Light scattering inside thin porcelain.',
	} ),
	S( 'thickness', 'Thickness', 0.001, 0.05, 0.001, 0.008, GROUPS.glaze ),
	S( 'seed', 'Seed', 0, 100, 1, 7, GROUPS.glaze ),
];

/* ================================================================== */
/*  FABRIC — cloth / suede / carpet (Unreal "Cloth" model)             */
/* ================================================================== */
export const FABRIC_PARAMS = [
	SEL( 'weave', 'Weave', [
		{ id: 'plain', label: 'Plain' },
		{ id: 'twill', label: 'Twill 2/2' },
		{ id: 'knit', label: 'Knit' },
		{ id: 'suede', label: 'Suede / Nap' },
	], 'twill', GROUPS.weave ),
	C( 'fiberColor', 'Fibre Colour', '#2c2f36', GROUPS.weave ),
	C( 'sheenColor', 'Sheen Colour', '#9aa4b5', GROUPS.weave ),
	S( 'roughness', 'Roughness', 0.05, 1, 0.005, 0.82, GROUPS.weave, { hero: true } ),
	S( 'weaveScale', 'Weave Scale', 20, 2500, 5, 560, GROUPS.weave, {
		hint: 'Yarn count — threads per metre.',
	} ),
	S( 'weaveStrength', 'Weave Relief', 0, 1, 0.01, 0.65, GROUPS.weave, { hero: true } ),
	S( 'yarnTwist', 'Yarn Twist', 0, 1, 0.01, 0.5, GROUPS.weave ),
	S( 'fuzz', 'Fuzz / Sheen', 0, 1, 0.01, 0.55, GROUPS.weave, { hero: true } ),
	S( 'fuzzRoughness', 'Sheen Roughness', 0, 1, 0.005, 0.4, GROUPS.weave ),
	S( 'nap', 'Nap Direction', 0, 1, 0.01, 0.45, GROUPS.weave, {
		hint: 'Brushed pile — Alcantara / suede read differently with and against the nap.',
	} ),
	S( 'napAngle', 'Nap Angle', 0, 360, 1, 35, GROUPS.weave ),
	S( 'lint', 'Lint Variation', 0, 1, 0.01, 0.3, GROUPS.surf ),
	S( 'backscatter', 'Backscatter', 0, 1, 0.01, 0.25, GROUPS.surf ),
	S( 'seed', 'Seed', 0, 100, 1, 3, GROUPS.weave ),
];

/* ================================================================== */
/*  RUBBER — tyre, weatherstrip, mats                                  */
/* ================================================================== */
export const RUBBER_PARAMS = [
	SEL( 'pattern', 'Pattern', [
		{ id: 'smooth', label: 'Smooth' },
		{ id: 'tread', label: 'Tyre Tread' },
		{ id: 'pebble', label: 'Pebble Grain' },
		{ id: 'ribbed', label: 'Ribbed Seal' },
	], 'tread', GROUPS.tread ),
	C( 'baseColor', 'Base Colour', '#16171a', GROUPS.tread ),
	C( 'sheenColor', 'Sheen Colour', '#4a5058', GROUPS.tread ),
	C( 'dustColor', 'Dust Colour', '#6d6459', GROUPS.tread ),
	S( 'roughness', 'Roughness', 0.05, 1, 0.005, 0.72, GROUPS.tread, { hero: true } ),
	S( 'microBump', 'Micro Texture', 0, 1, 0.01, 0.55, GROUPS.tread, { hero: true } ),
	S( 'microScale', 'Micro Scale', 10, 1500, 5, 520, GROUPS.tread ),
	S( 'treadScale', 'Pattern Scale', 2, 160, 1, 26, GROUPS.tread, {
		hint: 'Tread blocks per metre of circumference.',
	} ),
	S( 'treadDepth', 'Pattern Depth', 0, 1, 0.01, 0.85, GROUPS.tread, { hero: true } ),
	S( 'sipe', 'Sipe Density', 0, 1, 0.01, 0.5, GROUPS.tread ),
	S( 'sheen', 'Sheen', 0, 1, 0.01, 0.35, GROUPS.tread ),
	S( 'sheenRoughness', 'Sheen Roughness', 0, 1, 0.005, 0.55, GROUPS.tread ),
	S( 'subsurface', 'Subsurface', 0, 1, 0.01, 0.18, GROUPS.tread ),
	S( 'dust', 'Dust / Bloom', 0, 1, 0.01, 0.14, GROUPS.surf ),
	S( 'seed', 'Seed', 0, 100, 1, 11, GROUPS.tread ),
];

/* ================================================================== */
/*  GLASS — windshield, privacy, lamp lens                             */
/* ================================================================== */
export const GLASS_PARAMS = [
	C( 'tintColor', 'Tint', '#1d3a2c', GROUPS.optic ),
	C( 'edgeColor', 'Edge Absorption', '#3fa06a', GROUPS.optic, {
		hint: 'Beer-Lambert absorption — visible at the polished edge of the pane.',
	} ),
	S( 'tint', 'Tint Strength', 0, 1, 0.01, 0.35, GROUPS.optic, { hero: true } ),
	S( 'transmission', 'Transmission', 0, 1, 0.01, 1, GROUPS.optic ),
	S( 'roughness', 'Roughness', 0, 1, 0.005, 0.012, GROUPS.optic, { hero: true } ),
	S( 'ior', 'IOR', 1.0, 2.4, 0.01, 1.52, GROUPS.optic ),
	S( 'thickness', 'Thickness', 0.0005, 0.05, 0.0005, 0.006, GROUPS.optic, {
		hint: 'Laminated automotive glass is ~4.76 mm; lamp lenses ~3 mm.',
		hero: true,
	} ),
	S( 'dispersion', 'Dispersion', 0, 12, 0.05, 1.4, GROUPS.optic, {
		hint: 'Abbe-number chromatic split of the specular highlight.',
	} ),
	S( 'absorption', 'Absorption', 0, 20, 0.05, 3.2, GROUPS.optic ),
	S( 'coating', 'AR / Mirror Coating', 0, 1, 0.01, 0.25, GROUPS.optic ),
	S( 'coatThickness', 'Coating Thickness', 40, 900, 1, 320, GROUPS.optic, {
		hint: 'Thin-film stack thickness in nm — drives the interference hue.',
	} ),
	S( 'scratch', 'Scratches', 0, 1, 0.01, 0.12, GROUPS.surf ),
	S( 'wiper', 'Wiper Arcs', 0, 1, 0.01, 0.1, GROUPS.surf ),
	S( 'frost', 'Frost / Etch', 0, 1, 0.01, 0.0, GROUPS.surf ),
	S( 'seed', 'Seed', 0, 100, 1, 5, GROUPS.optic ),
];

/* ================================================================== */
/*  METAL — chrome, brushed alloy, machined, titanium                  */
/* ================================================================== */
export const METAL_PARAMS = [
	SEL( 'finish', 'Finish', [
		{ id: 'mirror', label: 'Mirror / Chrome' },
		{ id: 'brushed', label: 'Brushed' },
		{ id: 'machined', label: 'Concentric Machined' },
		{ id: 'cast', label: 'Cast / As-Cast' },
		{ id: 'bead', label: 'Bead Blasted' },
	], 'brushed', GROUPS.metal ),
	C( 'baseColor', 'Alloy Colour', '#cfd3d8', GROUPS.metal ),
	C( 'patinaColor', 'Patina / Oxide', '#6d5a3a', GROUPS.metal ),
	S( 'metallic', 'Metallic', 0, 1, 0.01, 1, GROUPS.metal ),
	S( 'roughness', 'Roughness', 0.005, 1, 0.005, 0.19, GROUPS.metal, { hero: true } ),
	S( 'brushScale', 'Grain Scale', 2, 900, 1, 320, GROUPS.metal ),
	S( 'brushStrength', 'Grain Strength', 0, 1, 0.01, 0.6, GROUPS.metal, { hero: true } ),
	S( 'brushAngle', 'Grain Angle', 0, 360, 1, 0, GROUPS.metal ),
	S( 'aniso', 'Anisotropy', 0, 1, 0.01, 0.8, GROUPS.metal, { hero: true } ),
	S( 'patina', 'Patina', 0, 1, 0.01, 0.06, GROUPS.metal ),
	S( 'heat', 'Heat Tint', 0, 1, 0.01, 0, GROUPS.metal ),
	S( 'coatStrength', 'Protective Coat', 0, 1, 0.01, 0, GROUPS.metal ),
	S( 'coatRoughness', 'Coat Roughness', 0, 1, 0.005, 0.05, GROUPS.metal ),
	S( 'seed', 'Seed', 0, 100, 1, 9, GROUPS.metal ),
];

/* ================================================================== */
/*  COMPOSITE — carbon fibre / fibreglass / textured polymer           */
/* ================================================================== */
export const COMPOSITE_PARAMS = [
	SEL( 'layup', 'Layup', [
		{ id: 'twill', label: '2×2 Twill Carbon' },
		{ id: 'plain', label: 'Plain Weave Carbon' },
		{ id: 'forged', label: 'Forged Composite' },
		{ id: 'grain', label: 'Textured Polymer' },
	], 'twill', GROUPS.comp ),
	C( 'fiberColor', 'Fibre Colour', '#0d0e11', GROUPS.comp ),
	C( 'resinColor', 'Resin Colour', '#2a2d33', GROUPS.comp ),
	C( 'sheenColor', 'Fibre Sheen', '#7d8794', GROUPS.comp ),
	S( 'metallic', 'Metallic', 0, 1, 0.01, 0.35, GROUPS.comp ),
	S( 'roughness', 'Fibre Roughness', 0.02, 1, 0.005, 0.38, GROUPS.comp, { hero: true } ),
	S( 'weaveScale', 'Tow Scale', 10, 600, 2, 150, GROUPS.comp, {
		hint: 'Tow cells per metre — 150 gives a ~6.7 mm 2×2 twill.',
	} ),
	S( 'weaveStrength', 'Weave Relief', 0, 1, 0.01, 0.9, GROUPS.comp, { hero: true } ),
	S( 'filament', 'Filament Detail', 0, 1, 0.01, 0.6, GROUPS.comp ),
	S( 'resin', 'Resin Richness', 0, 1, 0.01, 0.35, GROUPS.comp ),
	S( 'coatStrength', 'Clear Coat', 0, 1, 0.01, 1, GROUPS.comp, { hero: true } ),
	S( 'coatRoughness', 'Coat Roughness', 0, 1, 0.005, 0.03, GROUPS.comp ),
	S( 'orangePeel', 'Orange Peel', 0, 1, 0.01, 0.12, GROUPS.coat ),
	S( 'sheen', 'Anisotropic Sheen', 0, 1, 0.01, 0.5, GROUPS.comp ),
	S( 'seed', 'Seed', 0, 100, 1, 13, GROUPS.comp ),
];

export const FAMILY_SCHEMAS = {
	paint:     { label: 'Automotive Paint', model: 'Clear Coat + Flake', params: PAINT_PARAMS.concat( LAYOUT_PARAMS ) },
	brake:     { label: 'Brake Disc',       model: 'Anisotropic Metal',  params: BRAKE_PARAMS.concat( LAYOUT_PARAMS ) },
	ceramic:   { label: 'Ceramic',          model: 'Subsurface Gloss',   params: CERAMIC_PARAMS.concat( LAYOUT_PARAMS ) },
	fabric:    { label: 'Fabric',           model: 'Cloth / Sheen',      params: FABRIC_PARAMS.concat( LAYOUT_PARAMS ) },
	rubber:    { label: 'Rubber',           model: 'Sheen Subsurface',   params: RUBBER_PARAMS.concat( LAYOUT_PARAMS ) },
	glass:     { label: 'Glass',            model: 'Thin Translucent',   params: GLASS_PARAMS.concat( LAYOUT_PARAMS ) },
	metal:     { label: 'Metal',            model: 'Anisotropic Metal',  params: METAL_PARAMS.concat( LAYOUT_PARAMS ) },
	composite: { label: 'Composite',        model: 'Clear Coat Weave',   params: COMPOSITE_PARAMS.concat( LAYOUT_PARAMS ) },
};

/* Uniform name for a parameter key */
export const uniformName = ( key ) => 'frk' + key.charAt( 0 ).toUpperCase() + key.slice( 1 );

export function schemaDefaults( family ) {
	const out = {};
	for ( const p of FAMILY_SCHEMAS[ family ].params ) out[ p.key ] = p.default;
	return out;
}

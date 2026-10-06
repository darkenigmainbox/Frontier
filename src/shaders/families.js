/**
 * FRONTIER — Shader families
 *
 * Each family supplies GLSL fragments spliced into three's MeshPhysicalMaterial
 * at well defined points inside main():
 *
 *   PROC    after <metalnessmap_fragment>      -> evaluate the procedural surface
 *   NORMAL  after <clearcoat_normal_*>         -> perturb base / coat normals
 *   MAT     after <lights_physical_fragment>   -> override the PhysicalMaterial struct
 *   EXTRA   after <lights_fragment_end>        -> accumulate extra BRDF lobes
 *
 * All four live in the same function scope, so PROC can hand values to the
 * later stages through plain locals. Uniform names come from the schema
 * ("frk" + Key), so nothing can drift out of sync.
 *
 * Every length in here is METRES. Every high frequency layer is multiplied by
 * a pixel-footprint fade so nothing crawls or fires fly when the camera moves.
 */

/* ------------------------------------------------------------------ */
/* Uniform declarations, generated from the schema                     */
/* ------------------------------------------------------------------ */
import { FAMILY_SCHEMAS, uniformName } from '../core/schema.js';

export function uniformDeclarations( family ) {
	return FAMILY_SCHEMAS[ family ].params.map( ( p ) => {
		const n = uniformName( p.key );
		return p.type === 'color' ? `uniform vec3 ${n};` : `uniform float ${n};`;
	} ).join( '\n' );
}

/* ------------------------------------------------------------------ */
/* Shared context evaluated at the top of every PROC block              */
/* ------------------------------------------------------------------ */
const CTX = /* glsl */ `
	vec3  frkNw    = normalize( frkWorldNormal );
	vec3  frkVw    = normalize( cameraPosition - frkWorldPos );
	mat3  frkTBN   = frkTangentFrame( frkWorldPos, frkNw, frkUv );
	vec3  frkT     = frkTBN[ 0 ];
	vec3  frkB     = frkTBN[ 1 ];
	/* Pattern space: locked to the surface in world metres (never swims, always
	   a true physical size) or driven by the mesh's own UV channels. */
	vec2  frkPlaneW = vec2( dot( frkWorldPos, frkT ), dot( frkWorldPos, frkB ) ) * frkWorldScale;
	vec2  frkPlane  = mix( frkPlaneW, frkUv * vec2( frkUvScaleX, frkUvScaleY ), frkProjection );
	float frkNV    = frkSat( dot( frkNw, frkVw ) );
	vec2  frkVts   = vec2( dot( frkVw, frkT ), dot( frkVw, frkB ) );
	float frkVtsL  = length( frkVts );
	frkVts        /= max( frkVtsL, 1e-5 );
	float frkVtsZ  = max( abs( dot( frkVw, frkNw ) ), 0.02 );

	/* object-space polar frame — discs, rotors, wheels are modelled Y-up */
	float frkR     = length( frkObjPos.xz );
	float frkA     = atan( frkObjPos.z, frkObjPos.x );
`;

const CTX_OUT = /* glsl */ `
	vec3  frkOutNormalW     = frkNw;
	vec3  frkOutCoatNormalW = frkNw;
	float frkFace = 1.0;
	#ifdef DOUBLE_SIDED
		frkFace = gl_FrontFacing ? 1.0 : - 1.0;
	#endif
`;

/* Shared NORMAL stage: world -> view space + double sided handling */
export const SHARED_NORMAL = /* glsl */ `
	normal = normalize( transformDirection( normalize( frkOutNormalW ) * frkFace, viewMatrix ) );
	#ifdef USE_CLEARCOAT
		clearcoatNormal = normalize( transformDirection( normalize( frkOutCoatNormalW ) * frkFace, viewMatrix ) );
	#endif
`;

/* ------------------------------------------------------------------ */
/* Global-scope helpers shared by every family                          */
/* ------------------------------------------------------------------ */
export const FRK_HELPERS = /* glsl */ `
/* Peak-normalised microfacet lobe for a single mirror facet ("flake").
 * D is scaled so its maximum is 1 — this keeps the glitter artist-controllable
 * and free of fireflies while preserving the true GGX falloff shape. */
vec3 frkGlitter( vec3 L, vec3 radiance, vec3 V, vec3 Nf, vec3 Ng, vec3 tint, float intensity, float alpha ) {
	if ( intensity <= 0.0001 ) return vec3( 0.0 );
	float NoL = frkSat( dot( Ng, L ) );
	if ( NoL <= 0.0 ) return vec3( 0.0 );
	vec3  H   = normalize( L + V );
	float NoH = frkSat( dot( Nf, H ) );
	float a2  = alpha * alpha;
	float d   = NoH * NoH * ( a2 - 1.0 ) + 1.0;
	float D   = a2 / ( d * d );
	float NoV = frkSat( dot( Nf, V ) ) + 1e-4;
	float VoL = frkSat( dot( V, L ) );
	float Vis = frkV_GGX_SmithCorrelated( alpha, VoL, NoV );
	vec3  F   = frkF_Schlick( tint, 1.0, VoL );
	return radiance * NoL * D * Vis * F * intensity * 0.4;
}

/* Project a desired anisotropy/stretch direction onto the surface plane.
 * Degenerates gracefully (rotor faces, sphere poles) instead of producing NaN. */
vec3 frkProjectToPlane( vec3 v, vec3 n ) {
	vec3 p = v - dot( v, n ) * n;
	float l2 = dot( p, p );
	if ( l2 > 1e-6 ) return p * inversesqrt( l2 );
	vec3 up = abs( n.y ) > 0.9 ? vec3( 1.0, 0.0, 0.0 ) : vec3( 0.0, 1.0, 0.0 );
	vec3 t = cross( up, n );
	float tl = length( t );
	return tl > 1e-5 ? t / tl : vec3( 1.0, 0.0, 0.0 );
}

/* Tanner Helland blackbody locus — used for glowing rotors and hot exhausts. */
vec3 frkBlackbody( float kelvin ) {
	float t = clamp( kelvin, 1200.0, 12000.0 ) / 100.0;
	vec3 c;
	c.r = ( t <= 66.0 ) ? 1.0 : clamp( 1.2929362 * pow( t - 60.0, - 0.1332047 ), 0.0, 1.0 );
	c.g = ( t <= 66.0 ) ? clamp( 0.3900816 * log( t ) - 0.6318414, 0.0, 1.0 )
	                    : clamp( 1.1298909 * pow( t - 60.0, - 0.0755148 ), 0.0, 1.0 );
	if ( t >= 66.0 ) c.b = 1.0;
	else c.b = ( t <= 19.0 ) ? 0.0 : clamp( 0.5432068 * log( t - 10.0 ) - 1.1962541, 0.0, 1.0 );
	return c;
}
`;

/* ================================================================== */
/*  PAINT — clear coat over a discrete metallic-flake basecoat         */
/* ================================================================== */
const PAINT_PROC = /* glsl */ `
	${CTX}
	${CTX_OUT}

	/* flake layout is locked to the bodywork in WORLD space, so the glitter
	   does not swim across the panel when the camera orbits */
	vec2  frkC0  = frkPlane * 11.0;

	/* PAINT DEPTH — the flake layer sits under the clear. Looking in at an
	   angle you see the flakes displaced, and deeper film build displaces them
	   further. This is the single biggest cue for "wet, deep" paint. */
	float frkDepth01 = frkSat( frkPaintDepth / 100.0 );
	float frkDepthK  = pow( frkDepth01, 1.35 ) * 0.46;
	vec2  frkC       = frkC0 - frkVts * ( frkDepthK / frkVtsZ );

	/* density slider 0..100 -> cells per world unit (non-linear, feels right) */
	float frkDens = 0.4 + pow( frkSat( frkFlakeDensity / 100.0 ), 1.55 ) * 62.0;

	FrkFlakeResult frkF = frkFlakes(
		frkC, frkFlakeSeed, frkDens, frkFlakeSpread, frkFlakeStrength,
		frkFlakeColor, frkPearlColor, frkPearl
	);

	/* ORANGE PEEL — the ripple a spray gun leaves in the clear coat */
	float frkPeelFine = 380.0;
	float frkPeelFade = frkFade2( frkPlane * frkPeelFine, 0.25, 1.4 );
	float frkPeelH = ( ( frkFbm2( frkPlane * 210.0 + frkFlakeSeed * 3.0, 4 ) - 0.5 )
	               + 0.35 * ( frkNoise2( frkPlane * frkPeelFine ) - 0.5 ) )
	               * frkOrangePeel * 0.00042 * frkPeelFade;

	/* SWIRL MARKS — arcuate damage from a rotary polisher */
	float frkSwirlH = 0.0;
	if ( frkSwirl > 0.001 ) {
		float sa = atan( frkPlane.y, frkPlane.x );
		float sr = length( frkPlane );
		vec2  sp = vec2( sa * 7.0, sr * 165.0 ) + frkFbm2( frkPlane * 34.0, 2 ) * 2.4;
		float s  = pow( abs( frkNoise2( sp ) * 2.0 - 1.0 ), 0.55 );
		frkSwirlH = s * frkSwirl * 0.00026 * frkFade2( sp, 0.35, 1.8 );
	}

	/* STONE CHIPS — rare cells punched through the coat down to the primer */
	float frkChipMask = 0.0;
	float frkChipLip  = 0.0;
	if ( frkChip > 0.001 ) {
		vec2  cp = frkPlane * ( 62.0 + 8.0 * frkH11( frkFlakeSeed ) );
		vec3  cv = frkVoronoi2( cp, 0.82 );
		float rn = frkH21( vec2( cv.y, cv.z ) + frkFlakeSeed * 2.71 );
		float pr = step( 1.0 - frkChip * 0.055, rn );
		frkChipMask = pr * ( 1.0 - smoothstep( 0.06, 0.30, cv.x ) ) * frkFade2( cp, 0.3, 1.6 );
		frkChipLip  = pr * smoothstep( 0.06, 0.20, cv.x ) * ( 1.0 - smoothstep( 0.20, 0.40, cv.x ) );
	}

	/* --- basecoat albedo ------------------------------------------- */
	float frkGraz = pow( 1.0 - frkNV, 3.4 );

	/* FLOP / TRAVEL: metallic paint reads lighter face-on and darker at the
	   edges; deeper film build exaggerates the shift. */
	vec3 frkPigment = mix( frkBaseColor, frkEdgeColor,
	                       frkFlop * frkGraz * ( 0.45 + 0.85 * frkDepth01 ) );
	/* DEPTH FOG: light is absorbed crossing the binder between flakes */
	frkPigment *= mix( 1.0, 0.70, frkDepthFog * ( 1.0 - frkF.mask ) * ( 0.5 + 0.5 * frkDepth01 ) );

	vec3 frkSurf = mix( frkPigment, frkF.tint, frkSat( frkF.mask * frkMetallic ) );
	frkSurf = mix( frkSurf, vec3( 0.095, 0.095, 0.10 ), frkChipMask );

	diffuseColor.rgb = frkSurf;
	metalnessFactor  = frkSat( frkMetallic * mix( 0.42, 1.0, frkF.mask ) * ( 1.0 - frkChipMask ) );

	/* Up close the discrete flakes scatter widely; as they collapse to sub-pixel
	   the fade term returns the lobe to its smooth averaged roughness. */
	float frkRgh = frkRoughness
	             * mix( 1.0, 1.45, frkF.fade * frkF.mask * frkMetallic )
	             * mix( 1.0, 1.6, frkChipMask )
	             + frkOrangePeel * 0.020
	             + frkSwirl * 0.035;
	roughnessFactor = frkSat( frkRgh );

	/* --- normals ---------------------------------------------------- */
	vec3 frkPeelN  = frkBumpNormal( frkWorldPos, frkNw,
	                                frkPeelH + frkSwirlH - frkChipLip * 0.00024, frkFace );
	vec3 frkGrainN = normalize( frkTBN * frkF.normalTs );
	vec3 frkBaseN  = normalize( mix( frkPeelN, frkGrainN, frkSat( frkF.mask * 0.55 * frkF.fade ) ) );
	frkBaseN = mix( frkBaseN, frkNw, frkChipMask * 0.55 );

	frkOutNormalW     = normalize( frkBaseN );
	frkOutCoatNormalW = normalize( frkPeelN );
`;

const PAINT_MAT = /* glsl */ `
	#ifdef USE_CLEARCOAT
		material.clearcoat          = frkCoatStrength;
		material.clearcoatRoughness = clamp( frkCoatRoughness + frkOrangePeel * 0.045, 0.0, 1.0 );
		material.clearcoatF0        = vec3( pow( ( frkCoatIOR - 1.0 ) / ( frkCoatIOR + 1.0 ), 2.0 ) );
		material.clearcoatF90       = 1.0;
	#endif
	#ifdef IOR
		material.ior = mix( frkCoatIOR, 1.5, frkMetallic );
		material.specularColor = mix(
			min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * frkF.tint, vec3( 1.0 ) ),
			diffuseColor.rgb, metalnessFactor );
	#endif
`;

const PAINT_EXTRA = /* glsl */ `
	vec3  frkVv   = normalize( vViewPosition );
	vec3  frkNfV  = normalize( transformDirection( normalize( frkTBN * frkF.sparkleTs ) * frkFace, viewMatrix ) );
	vec3  frkNgV  = normalize( transformDirection( frkNw * frkFace, viewMatrix ) );
	float frkAlph = max( frkSparkleSharp, 0.0022 );
	float frkInt  = frkSparkle * frkF.mask * frkF.fade * frkMetallic * ( 1.0 - frkChipMask );

	vec3 frkSparkD = vec3( 0.0 );
	#if NUM_DIR_LIGHTS > 0
		for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
			frkSparkD += frkGlitter( directionalLights[ i ].direction, directionalLights[ i ].color,
			                         frkVv, frkNfV, frkNgV, frkF.tint, frkInt, frkAlph );
		}
	#endif
	#if NUM_POINT_LIGHTS > 0
		for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
			IncidentLight frkIL;
			getPointLightInfo( pointLights[ i ], geometryPosition, frkIL );
			if ( frkIL.visible ) frkSparkD += frkGlitter( frkIL.direction, frkIL.color,
			                                             frkVv, frkNfV, frkNgV, frkF.tint, frkInt, frkAlph );
		}
	#endif
	#if NUM_SPOT_LIGHTS > 0
		for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
			IncidentLight frkIL;
			getSpotLightInfo( spotLights[ i ], geometryPosition, frkIL );
			if ( frkIL.visible ) frkSparkD += frkGlitter( frkIL.direction, frkIL.color,
			                                             frkVv, frkNfV, frkNgV, frkF.tint, frkInt, frkAlph );
		}
	#endif

	vec3 frkSparkI = vec3( 0.0 );
	#if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV )
	{
		vec3 rfl  = reflect( -frkVv, frkNfV );
		vec3 rflW = inverseTransformDirection( rfl, viewMatrix );
		vec4 e    = textureCubeUV( envMap, envMapRotation * rflW, frkAlph );
		vec3 Ff   = frkF_Schlick( frkF.tint, 1.0, frkSat( dot( frkNfV, frkVv ) ) );
		frkSparkI = e.rgb * envMapIntensity * Ff * frkInt * 0.6;
	}
	#endif

	reflectedLight.directSpecular   += frkSparkD;
	reflectedLight.indirectSpecular += frkSparkI;
`;

/* ================================================================== */
/*  BRAKE — cast iron / carbon-ceramic / drilled steel disc            */
/* ================================================================== */
const BRAKE_PROC = /* glsl */ `
	${CTX}
	${CTX_OUT}

	float frkIron    = 1.0 - frkSat( abs( frkDiscType - 0.0 ) * 8.0 );
	float frkCeramic = 1.0 - frkSat( abs( frkDiscType - 1.0 ) * 8.0 );
	float frkSteelD  = 1.0 - frkSat( abs( frkDiscType - 2.0 ) * 8.0 );

	/* --- cross-drilled degassing holes ------------------------------ */
	/* Cut straight in the shader rather than in geometry: fragments inside a
	   hole are DISCARDED, so you genuinely see through the friction face into
	   the vane channel behind it. The chamfer is a procedural conical recess. */
	if ( frkDrill > 0.001 ) {
		float onFace = smoothstep( 0.55, 0.85, abs( frkObjNormal.y ) );
		if ( onFace > 0.01 ) {
			float nH  = max( 4.0, frkDrillCount );
			float nR  = clamp( floor( frkDrillRings + 0.5 ), 1.0, 4.0 );
			float hRe = frkDrillRadius * 0.001 * frkSat( frkDrill * 1.25 );
			float rIn = frkDiscRadius * 0.735;
			float rOu = frkDiscRadius * 0.975;
			vec2  pf  = vec2( cos( frkA ), sin( frkA ) ) * frkR;
			float best = 1e6;
			for ( int k = 0; k < 4; k ++ ) {
				float fk = float( k );
				if ( fk >= nR ) break;
				float rk = mix( rIn + hRe * 1.7, rOu - hRe * 1.7, ( fk + 0.5 ) / nR );
				if ( rk <= hRe * 2.2 ) continue;
				float st = FRK_TAU / nH;
				float off = fk * st * 0.5;
				float aj = round( ( frkA + off ) / st ) * st - off;
				vec2 pc = vec2( cos( aj ), sin( aj ) ) * rk;
				best = min( best, length( pf - pc ) );
			}
			if ( best < hRe ) discard;
			frkHoleChamfer = onFace * ( 1.0 - smoothstep( hRe, hRe * 2.1, best ) );
		}
	}

	/* --- concentric lathe finish (the last turning pass) ------------- */
	float gd  = 180.0 + frkGrooveDensity * 24.0;      /* cycles per metre of radius */
	float gr  = frkR * gd;
	float gph = gr * FRK_TAU + frkNoise2( vec2( frkA * 2.4, gr * 0.05 ) ) * 4.5;
	float rings = pow( 0.5 + 0.5 * sin( gph ), 1.6 );
	float gFade = frkFade2( vec2( gr, frkA * 6.0 ), 0.25, 1.5 );
	rings = mix( 0.5, rings, gFade );
	float micro = frkFbm2( vec2( gr * 0.7, frkA * 26.0 ), 4 );
	float grooveH = ( rings * 0.7 + micro * 0.3 ) * frkGrooveStrength;

	/* --- casting speckle: graphite nodules / chopped carbon ---------- */
	vec2  spC = frkPlane * frkSpeckleScale;
	vec3  sp3 = frkVoronoi2( spC, 0.9 );
	float speckRnd = frkH21( vec2( sp3.y, sp3.z ) );
	float speck = ( 1.0 - smoothstep( 0.05, 0.44, sp3.x ) ) * frkFade2( spC, 0.3, 1.6 );

	/* --- pad wear band: polished where the pad sweeps ---------------- */
	float band0 = frkDiscRadius * 0.30;
	float band1 = frkDiscRadius * 0.99;
	float wearBand = smoothstep( band0, band0 + frkDiscRadius * 0.14, frkR )
	               * ( 1.0 - smoothstep( band1 - frkDiscRadius * 0.07, band1, frkR ) );
	float polish = wearBand * frkWear;

	/* --- flash rust on unmachined / cold areas ----------------------- */
	float rn = frkFbm2( frkPlane * 11.0 + 4.7, 5 ) * frkFbm2( frkPlane * 41.0, 4 );
	float rustMask = frkSat( ( rn - ( 1.0 - frkRust ) * 0.30 ) * ( 2.0 + frkRust * 4.0 ) );
	rustMask *= ( 1.0 - polish * 0.92 );
	rustMask *= ( 1.0 - frkCeramic * 0.85 );

	/* --- thermal: oxide interference temper colours ------------------ */
	float hband = mix( wearBand, 1.0, frkHeatSpread * 0.6 );
	float hn    = frkFbm2( vec2( frkA * 1.6, frkR * 7.0 ), 3 );
	float heatT = frkSat( frkHeat * hband * ( 0.70 + 0.55 * hn ) );

	/* --- compose albedo --------------------------------------------- */
	vec3 albedo = frkBaseColor;
	/* carbon ceramic: near black with lighter chopped-fibre flecks */
	albedo = mix( albedo, mix( vec3( 0.016 ), vec3( 0.075, 0.072, 0.068 ), speckRnd ),
	              frkCeramic * speck * 1.2 );
	albedo = mix( albedo, albedo * ( 0.84 + 0.32 * rings ), frkIron * frkGrooveStrength * 0.6 );
	albedo = mix( albedo, albedo * 1.25, polish * 0.8 );
	albedo = mix( albedo, albedo * ( 0.55 + 0.7 * speckRnd ), speck * frkSpeckle * ( frkIron + frkSteelD ) * 0.7 );
	albedo = mix( albedo, frkRustColor * ( 0.55 + 0.55 * speckRnd ), rustMask );
	albedo = mix( albedo, frkTemperColor( heatT ), heatT * ( frkIron + frkSteelD ) * 0.95 );
	albedo *= mix( 1.0, 0.32, frkHoleChamfer );           /* soot around the hole */
	diffuseColor.rgb = albedo;

	float met = frkMetallic * ( 1.0 - rustMask * 0.92 ) * ( 1.0 - heatT * 0.45 ) * ( 1.0 - speck * frkSpeckle * 0.4 );
	met = mix( met, 0.10, frkCeramic );
	metalnessFactor = frkSat( met );

	float rgh = frkRoughness
	          * mix( 1.0, 0.58 + 0.70 * rings, frkIron * frkGrooveStrength * gFade )
	          * mix( 1.0, 1.45, frkCeramic * 0.75 )
	          * mix( 1.0, 0.42, polish )
	          + rustMask * 0.34
	          + speck * frkSpeckle * 0.10
	          - heatT * 0.12
	          + frkHoleChamfer * 0.22;
	roughnessFactor = frkSat( rgh );

	/* --- normals + anisotropy --------------------------------------- */
	/* Turned grooves run circumferentially, so the specular streak stretches
	   RADIALLY — exactly the spoke-like shimmer you see on a real rotor. */
	vec3 frkObjRad = normalize( vec3( frkObjPos.x, 0.0, frkObjPos.z ) + vec3( 1e-5, 0.0, 1e-5 ) );
	vec3 tanW = normalize( ( modelMatrix * vec4( frkObjRad, 0.0 ) ).xyz );

	float bumpH = grooveH * 0.00030 * gFade
	            + speck * frkSpeckle * 0.00010
	            + rustMask * 0.00048
	            - frkHoleChamfer * 0.00055;               /* conical chamfer */
	vec3 n2 = frkBumpNormal( frkWorldPos, frkNw, bumpH, frkFace );
	frkOutNormalW     = normalize( n2 );
	frkOutCoatNormalW = normalize( frkNw );

	frkAnisoTanW = normalize( mix( frkT, tanW, frkSat( frkIron + frkSteelD ) ) );
	frkAnisoAmt  = frkAniso * ( 1.0 - frkCeramic * 0.85 )
	                        * ( 0.30 + 0.70 * frkGrooveStrength * gFade )
	                        * ( 1.0 - rustMask * 0.75 );

	frkEmissiveExtra = frkBlackbody( mix( 880.0, 1750.0, frkSat( frkGlow ) ) )
	                 * pow( frkSat( frkGlow ), 1.7 ) * 4.0 * max( heatT, frkSat( frkGlow * 0.9 ) );
`;

const BRAKE_MAT = /* glsl */ `
	#ifdef USE_ANISOTROPY
		vec3 frkAT = normalize( transformDirection( frkProjectToPlane( frkAnisoTanW, frkOutNormalW ) * frkFace, viewMatrix ) );
		vec3 frkAB = normalize( cross( normal, frkAT ) );
		material.anisotropy  = frkSat( frkAnisoAmt );
		material.anisotropyT = frkAT;
		material.anisotropyB = frkAB;
		material.alphaT      = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	#endif
`;

const BRAKE_EXTRA = /* glsl */ `
	totalEmissiveRadiance += frkEmissiveExtra;
`;

/* ================================================================== */
/*  CERAMIC                                                            */
/* ================================================================== */
const CERAMIC_PROC = /* glsl */ `
	${CTX}
	${CTX_OUT}

	vec2  cs = frkPlane * frkSpeckleScale;
	vec3  cv = frkVoronoi2( cs + frkSeed, 0.88 );
	float sRnd = frkH21( vec2( cv.y, cv.z ) * 1.7 + frkSeed );
	float speck = ( 1.0 - smoothstep( 0.06, 0.36, cv.x ) ) * frkFade2( cs, 0.3, 1.6 );
	speck *= frkSpeckle * mix( 0.25, 1.0, sRnd );

	/* crazing — the hairline crack network in an over-fired glaze */
	float crack = 0.0;
	if ( frkCrazing > 0.001 ) {
		vec2 kp = frkPlane * frkCrazingScale;
		kp += ( frkFbm2( kp * 0.25, 3 ) - 0.5 ) * 2.2;
		float e = frkVoronoiEdges2( kp, 0.95 );
		crack = ( 1.0 - smoothstep( 0.0, 0.085, e ) ) * frkCrazing * frkFade2( kp, 0.25, 1.5 );
	}

	/* throwing / moulding waviness */
	float wave = ( frkFbm2( frkPlane * 26.0, 4 ) - 0.5 ) * frkMicroBump * 0.00060;

	vec3 body = mix( frkGlazeColor, frkBodyColor, frkSat( speck * 0.85 + crack * 0.55 ) );
	body = mix( body, frkSpeckColor, speck * 0.6 );
	diffuseColor.rgb = body;
	metalnessFactor  = 0.0;
	roughnessFactor  = frkSat( frkRoughness * ( 1.0 + crack * 1.9 + speck * 0.30 ) );

	vec3 n2 = frkBumpNormal( frkWorldPos, frkNw, wave + crack * 0.00018 + speck * 0.00005, frkFace );
	frkOutNormalW     = normalize( n2 );
	frkOutCoatNormalW = normalize( frkBumpNormal( frkWorldPos, frkNw, wave * 0.55, frkFace ) );

	frkCeramicSub = frkSubsurface * frkGlazeColor * frkSat( frkThickness * 90.0 ) * ( 1.0 - crack * 0.5 );
`;

const CERAMIC_MAT = /* glsl */ `
	#ifdef USE_CLEARCOAT
		material.clearcoat          = frkCoatStrength;
		material.clearcoatRoughness = clamp( frkCoatRoughness + frkCrazing * 0.05, 0.0, 1.0 );
		material.clearcoatF0        = vec3( pow( ( frkCoatIOR - 1.0 ) / ( frkCoatIOR + 1.0 ), 2.0 ) );
	#endif
	#ifdef IOR
		material.ior = frkCoatIOR;
	#endif
`;

const CERAMIC_EXTRA = /* glsl */ `
	vec3 frkSub = vec3( 0.0 );
	#if NUM_DIR_LIGHTS > 0
		for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
			vec3  L = directionalLights[ i ].direction;
			vec3  V = normalize( vViewPosition );
			float w = frkSat( ( dot( geometryNormal, L ) + 0.55 ) / 1.55 );
			float b = pow( frkSat( dot( normalize( -L + V * 0.35 ), V ) ), 2.2 );
			frkSub += directionalLights[ i ].color * ( w * 0.55 + b * 0.85 );
		}
	#endif
	reflectedLight.indirectDiffuse += frkSub * frkCeramicSub * 0.4;
`;

/* ================================================================== */
/*  FABRIC — Unreal "Cloth" model: weave relief + fuzz sheen + nap     */
/* ================================================================== */
const FABRIC_PROC = /* glsl */ `
	${CTX}
	${CTX_OUT}

	vec2  wp   = frkPlane * frkWeaveScale;
	vec2  wid  = floor( wp );
	vec2  wf   = fract( wp );
	float wFade = frkFade2( wp, 0.3, 1.5 );

	float h = 0.5;
	float napSel = 0.5;

	if ( frkWeave < 0.5 ) {
		/* plain weave: warp yarn over weft in a 1-alternating check */
		float chk = mod( wid.x + wid.y, 2.0 );
		h = mix( sin( wf.y * FRK_PI ), sin( wf.x * FRK_PI ), chk );
		napSel = chk;
	} else if ( frkWeave < 1.5 ) {
		/* 2x2 twill: two over, two under, stepped diagonally */
		float chk = mod( floor( ( wid.x - wid.y ) * 0.5 ), 2.0 );
		h = mix( sin( wf.y * FRK_PI ), sin( wf.x * FRK_PI ), chk );
		napSel = chk;
	} else if ( frkWeave < 2.5 ) {
		/* knit: interlocking loops */
		float loop = 0.5 + 0.5 * sin( wf.x * FRK_TAU + sin( wf.y * FRK_TAU ) * 1.35 );
		float row  = 0.5 + 0.5 * sin( wid.y * FRK_PI + wf.y * FRK_PI );
		h = loop * 0.72 + row * 0.28;
	} else {
		/* suede / Alcantara: no structure, only nap */
		h = frkFbm2( wp * 0.035, 4 );
	}

	/* yarn twist — fibres spiralling around each yarn */
	float twistPhase = mix( wf.x, wf.y, napSel ) * 14.0 * frkYarnTwist;
	h += 0.16 * frkYarnTwist * sin( twistPhase * FRK_TAU + frkH21( wid ) * FRK_TAU );

	/* lint / slub variation */
	float slub = frkFbm2( wp * 0.02 + frkSeed * 5.0, 3 );
	h *= mix( 1.0, 0.55 + slub * 0.9, frkLint );

	/* relief scales with the yarn pitch so the weave stays physical */
	float relief = ( h - 0.5 ) * frkWeaveStrength * ( 0.42 / max( frkWeaveScale, 1.0 ) ) * wFade;
	if ( frkWeave < 2.5 ) relief = h * frkWeaveStrength * ( 0.42 / max( frkWeaveScale, 1.0 ) ) * wFade;

	float fuzzN = frkFbm2( wp * 0.35, 4 ) * frkFade2( wp * 0.35, 0.3, 1.6 );

	vec3 col = frkFiberColor * mix( 0.70, 1.14, frkSat( h ) * mix( 1.0, 0.55, frkLint ) );
	col = mix( col, col * 1.22 + frkSheenColor * 0.07, fuzzN * frkFuzz * 0.55 );
	diffuseColor.rgb = col;
	metalnessFactor  = 0.0;
	roughnessFactor  = frkSat( frkRoughness * mix( 0.86, 1.18, 1.0 - frkSat( h ) ) + frkLint * 0.05 * slub );

	vec3 n2 = frkBumpNormal( frkWorldPos, frkNw, relief + fuzzN * frkFuzz * 0.00010, frkFace );
	frkOutNormalW     = normalize( n2 );
	frkOutCoatNormalW = normalize( frkNw );

	float na = frkNapAngle * FRK_PI / 180.0;
	frkNapW   = normalize( frkTBN * vec3( cos( na ), sin( na ), 0.0 ) );
	frkNapDot = dot( frkVw, frkNapW ) * 0.5 + 0.5;
	frkFuzzAmt = frkFuzz;
`;

const FABRIC_MAT = /* glsl */ `
	#ifdef USE_SHEEN
		float napShift = mix( 1.0, 0.40 + 1.15 * frkNapDot, frkSat( frkNap * frkFuzzAmt ) );
		material.sheenColor     = frkSheenColor * napShift * frkFuzzAmt;
		material.sheenRoughness = clamp( frkFuzzRoughness, 0.07, 1.0 );
	#endif
`;

const FABRIC_EXTRA = /* glsl */ `
	vec3 frkBS = vec3( 0.0 );
	vec3 frkVV = normalize( vViewPosition );
	#if NUM_DIR_LIGHTS > 0
		for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
			vec3  L = directionalLights[ i ].direction;
			float fwd  = pow( frkSat( dot( -L, frkVV ) ), 3.0 );
			float wrap = frkSat( ( dot( geometryNormal, L ) + 0.6 ) / 1.6 );
			frkBS += directionalLights[ i ].color * ( fwd * 0.75 + wrap * 0.35 );
		}
	#endif
	reflectedLight.indirectDiffuse += frkBS * frkBackscatter * frkSheenColor * 0.9;
`;

/* ================================================================== */
/*  RUBBER                                                             */
/* ================================================================== */
const RUBBER_PROC = /* glsl */ `
	${CTX}
	${CTX_OUT}

	float h = 0.5;
	float crevice = 0.0;

	if ( frkPattern < 0.5 ) {
		/* smooth moulded rubber */
		vec2 mp = frkPlane * frkMicroScale;
		h = frkFbm2( mp, 4 ) * frkFade2( mp, 0.3, 1.6 );
		crevice = 0.25;
	} else if ( frkPattern < 1.5 ) {
		/* directional block tread with sipes */
		vec2  q = frkPlane * frkTreadScale;
		vec2  cid = floor( q );
		vec2  cf  = fract( q );
		float stag = mod( cid.x, 2.0 );
		float fy = fract( cf.y + stag * 0.5 );
		float bx = abs( cf.x - 0.5 );
		float by = abs( fy - 0.5 );
		float block = ( 1.0 - smoothstep( 0.33, 0.48, bx ) ) * ( 1.0 - smoothstep( 0.30, 0.48, by ) );
		block *= 1.0 - smoothstep( 0.30, 0.62, bx * 0.62 + by * 0.62 );
		float sipeC = 1.0 + frkSipe * 4.0;
		float sipe = 1.0 - smoothstep( 0.010, 0.055, abs( fract( fy * sipeC ) - 0.5 ) );
		h = block * ( 1.0 - sipe * frkSipe * 0.94 ) * frkFade2( q, 0.3, 1.6 );
		crevice = 1.0 - frkSat( h );
	} else if ( frkPattern < 2.5 ) {
		/* pebble / leatherette grain */
		vec2 gq = frkPlane * frkTreadScale * 2.6;
		float g = frkGrain( gq, 0.65 ) * frkFade2( gq, 0.3, 1.6 );
		vec2 mq = frkPlane * frkMicroScale;
		h = g * 0.85 + frkFbm2( mq, 3 ) * 0.3 * frkFade2( mq, 0.3, 1.6 );
		crevice = 1.0 - frkSat( h );
	} else {
		/* ribbed weather seal */
		float rib = pow( 0.5 + 0.5 * sin( frkPlane.x * frkTreadScale * FRK_TAU ), 1.4 );
		vec2 mq = frkPlane * frkMicroScale;
		h = rib * 0.9 * frkFade2( vec2( frkPlane.x * frkTreadScale, 0.0 ), 0.3, 1.6 )
		  + frkFbm2( mq, 3 ) * 0.22 * frkFade2( mq, 0.3, 1.6 );
		crevice = 1.0 - frkSat( h );
	}

	vec2  mq2 = frkPlane * frkMicroScale;
	float microV = ( frkFbm2( mq2, 4 ) - 0.5 ) * frkMicroBump * frkFade2( mq2, 0.3, 1.6 );

	float height = ( h - 0.5 ) * frkTreadDepth * 0.0032 + microV * 0.00038;

	/* dust / blooming settles into the crevices */
	float dustN = frkFbm2( frkPlane * 5.5 + 12.3, 4 );
	float dustMask = frkSat( crevice * 0.7 + dustN * 0.55 ) * frkDust;

	vec3 col = frkBaseColor;
	col = mix( col, col * 1.6 + 0.004, frkSat( h ) * 0.30 );
	col = mix( col, frkDustColor, dustMask * 0.7 );
	diffuseColor.rgb = col;
	metalnessFactor  = 0.0;
	roughnessFactor  = frkSat( frkRoughness * mix( 1.14, 0.80, frkSat( h ) ) + dustMask * 0.20 );

	vec3 n2 = frkBumpNormal( frkWorldPos, frkNw, height, frkFace );
	frkOutNormalW     = normalize( n2 );
	frkOutCoatNormalW = normalize( frkNw );
	frkRubberCrevice  = crevice;
`;

const RUBBER_MAT = /* glsl */ `
	#ifdef USE_SHEEN
		material.sheenColor     = frkSheenColor * frkSheen;
		material.sheenRoughness = clamp( frkSheenRoughness, 0.07, 1.0 );
	#endif
`;

const RUBBER_EXTRA = /* glsl */ `
	vec3 frkRB = vec3( 0.0 );
	vec3 frkRV = normalize( vViewPosition );
	#if NUM_DIR_LIGHTS > 0
		for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
			vec3  L = directionalLights[ i ].direction;
			float back = pow( frkSat( dot( -L, frkRV ) ), 4.0 );
			frkRB += directionalLights[ i ].color * back;
		}
	#endif
	reflectedLight.indirectDiffuse +=
		frkRB * frkSubsurface * diffuseColor.rgb * 2.4 * ( 1.0 - frkRubberCrevice * 0.6 );
`;

/* ================================================================== */
/*  GLASS                                                              */
/* ================================================================== */
const GLASS_PROC = /* glsl */ `
	${CTX}
	${CTX_OUT}

	float scratchH = 0.0;
	if ( frkScratch > 0.001 ) {
		vec2  sp = frkPlane * 420.0;
		float warp = frkFbm2( frkPlane * 18.0 + frkSeed, 3 );
		sp += vec2( cos( warp * 9.0 ), sin( warp * 9.0 ) ) * 6.0;
		float s = frkRidge2( sp * 0.35, 2 );
		scratchH = s * frkScratch * 0.00016 * frkFade2( sp * 0.35, 0.3, 1.6 );
	}

	float wiperH = 0.0;
	float wiperMask = 0.0;
	if ( frkWiper > 0.001 ) {
		vec2  c = frkPlane - vec2( 0.0, -0.55 );
		float r = length( c );
		float a = atan( c.y, c.x );
		float sweep = smoothstep( 0.15, 1.05, a ) * ( 1.0 - smoothstep( 1.35, 2.05, a ) );
		float arc = 0.5 + 0.5 * sin( r * 900.0 + frkNoise2( vec2( a * 6.0, r * 40.0 ) ) * 3.0 );
		wiperMask = sweep * arc * frkFade2( vec2( r * 900.0, a * 6.0 ), 0.3, 1.6 );
		wiperH = wiperMask * frkWiper * 0.00010;
	}

	float frostH = 0.0;
	if ( frkFrost > 0.001 ) {
		vec2 fp = frkPlane * 900.0;
		frostH = ( frkFbm2( fp, 4 ) - 0.5 ) * frkFrost * 0.00040 * frkFade2( fp, 0.3, 1.6 );
	}

	float rgh = frkRoughness + frkScratch * 0.030 + wiperMask * frkWiper * 0.10 + frkFrost * 0.55;
	roughnessFactor = frkSat( rgh );
	metalnessFactor = 0.0;

	/* Beer-Lambert: a grazing ray travels much further through the pane,
	   which is exactly why automotive glass reads green at its edges. */
	float path = frkThickness / max( frkNV, 0.055 );
	vec3 absorbed = exp( -vec3( path ) * frkAbsorption * 26.0 );
	diffuseColor.rgb = mix( absorbed, absorbed * frkTintColor * 2.4, frkTint );

	vec3 n2 = frkBumpNormal( frkWorldPos, frkNw, scratchH + wiperH + frostH, frkFace );
	frkOutNormalW     = normalize( n2 );
	frkOutCoatNormalW = normalize( frkNw );

	frkGlassPath = path;
	frkGlassEdge = 1.0 - smoothstep( 0.0, 0.55, frkNV );
`;

const GLASS_MAT = /* glsl */ `
	#ifdef USE_TRANSMISSION
		material.thickness          = frkGlassPath;
		material.attenuationColor   = mix( vec3( 1.0 ), frkEdgeColor, frkSat( frkTint * 1.4 + 0.22 ) );
		material.attenuationDistance = max( 0.006, 1.0 / max( frkAbsorption, 0.001 ) );
	#endif
	#ifdef USE_IRIDESCENCE
		material.iridescence         = frkCoating;
		material.iridescenceIOR      = 1.32;
		material.iridescenceThickness = frkCoatThickness * ( 0.85 + 0.30 * frkGlassEdge );
	#endif
	#ifdef IOR
		material.ior = frkIor;
	#endif
`;

/* ================================================================== */
/*  METAL                                                              */
/* ================================================================== */
const METAL_PROC = /* glsl */ `
	${CTX}
	${CTX_OUT}

	float ang  = frkBrushAngle * FRK_PI / 180.0;
	vec2  dirV = vec2( cos( ang ), sin( ang ) );
	vec2  perp = vec2( -dirV.y, dirV.x );
	vec2  bp   = vec2( dot( frkPlane, dirV ), dot( frkPlane, perp ) );

	float grainH = 0.0;
	float grainR = 0.0;
	/* alphaT is the STRETCH axis of the specular lobe, which for a brushed
	   surface is perpendicular to the grain (horizontal brushing -> vertical streak) */
	vec3  tanDir = normalize( frkTBN * vec3( perp, 0.0 ) );
	float anisoAmt = 0.0;

	if ( frkFinish < 0.5 ) {
		/* mirror / chrome — only long-range polishing waviness */
		grainH = ( frkFbm2( frkPlane * 9.0, 4 ) - 0.5 ) * 0.9;
		grainR = ( frkFbm2( frkPlane * 15.0 + 4.0, 3 ) - 0.5 ) * 0.30;
		anisoAmt = 0.0;
	} else if ( frkFinish < 1.5 ) {
		/* brushed — grain stretched along the brush direction */
		vec2 gq = vec2( bp.x * 1.4, bp.y * frkBrushScale );
		float g  = frkFbm2( gq, 5 );
		float g2 = frkNoise2( vec2( bp.x * 4.0, bp.y * frkBrushScale * 3.2 ) );
		float fd = frkFade2( gq, 0.3, 1.6 );
		grainH = ( g * 0.72 + g2 * 0.28 - 0.5 ) * fd;
		grainR = ( g - 0.5 ) * 1.5 * fd;
		anisoAmt = frkAniso;
	} else if ( frkFinish < 2.5 ) {
		/* concentric machined */
		float gr = frkR * frkBrushScale;
		float rings = pow( 0.5 + 0.5 * sin( gr * FRK_TAU + frkNoise2( vec2( frkA * 2.0, gr * 0.04 ) ) * 3.5 ), 1.7 );
		float fd = frkFade2( vec2( gr, frkA * 6.0 ), 0.25, 1.5 );
		grainH = ( rings - 0.5 ) * fd;
		grainR = ( rings - 0.5 ) * 1.2 * fd;
		anisoAmt = frkAniso;
		vec3 ot = normalize( vec3( frkObjPos.x, 0.0, frkObjPos.z ) + vec3( 1e-5, 0.0, 1e-5 ) );
		tanDir = normalize( ( modelMatrix * vec4( ot, 0.0 ) ).xyz );
	} else if ( frkFinish < 3.5 ) {
		/* cast / as-cast skin */
		vec2 gq = frkPlane * frkBrushScale * 0.30;
		float g = frkGrain( gq, 0.7 ) * frkFade2( gq, 0.3, 1.6 );
		float d = frkFbm2( gq * 2.6, 4 );
		grainH = ( g * 0.6 + d * 0.55 - 0.5 );
		grainR = ( g * 0.8 + d * 0.5 - 0.4 ) * 0.9;
		anisoAmt = frkAniso * 0.2;
	} else {
		/* bead blasted — isotropic dimples */
		vec2 gq = frkPlane * frkBrushScale * 1.4;
		vec3 vv = frkVoronoi2( gq, 0.95 );
		float fd = frkFade2( gq, 0.3, 1.6 );
		float dimple = ( 1.0 - smoothstep( 0.05, 0.5, vv.x ) ) * fd;
		grainH = ( dimple - 0.45 ) * 0.8;
		grainR = ( frkH21( vec2( vv.y, vv.z ) ) - 0.5 ) * 0.8 * fd;
		anisoAmt = 0.0;
	}

	grainH *= frkBrushStrength;
	grainR *= frkBrushStrength;

	float pat = frkFbm2( frkPlane * 7.0 + frkSeed * 2.0, 5 );
	float patMask = frkSat( ( pat - 0.42 ) * 2.4 ) * frkPatina;

	vec3 col = frkBaseColor;
	col = mix( col, col * ( 0.82 + 0.36 * ( grainH + 0.5 ) ), frkSat( frkBrushStrength ) );
	col = mix( col, frkPatinaColor, patMask );
	col = mix( col, frkTemperColor( frkHeat ), frkHeat * 0.92 );
	diffuseColor.rgb = col;

	metalnessFactor = frkSat( frkMetallic * ( 1.0 - patMask * 0.85 ) );
	roughnessFactor = frkSat( frkRoughness + grainR * frkRoughness * 0.9 + patMask * 0.25 );

	vec3 n2 = frkBumpNormal( frkWorldPos, frkNw, grainH * 0.00022, frkFace );
	frkOutNormalW     = normalize( n2 );
	frkOutCoatNormalW = normalize( frkNw );

	frkAnisoTanW = tanDir;
	frkAnisoAmt  = anisoAmt * ( 0.25 + 0.75 * frkBrushStrength );
	frkEmissiveExtra = frkBlackbody( mix( 880.0, 1750.0, frkHeat ) )
	                 * pow( frkSat( frkHeat - 0.5 ) * 2.0, 1.9 ) * 3.2;
`;

const METAL_MAT = /* glsl */ `
	#ifdef USE_ANISOTROPY
		vec3 frkAT = normalize( transformDirection( frkProjectToPlane( frkAnisoTanW, frkOutNormalW ) * frkFace, viewMatrix ) );
		vec3 frkAB = normalize( cross( normal, frkAT ) );
		material.anisotropy  = frkSat( frkAnisoAmt );
		material.anisotropyT = frkAT;
		material.anisotropyB = frkAB;
		material.alphaT      = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	#endif
	#ifdef USE_CLEARCOAT
		material.clearcoat          = frkCoatStrength;
		material.clearcoatRoughness = frkCoatRoughness;
	#endif
`;

const METAL_EXTRA = /* glsl */ `
	totalEmissiveRadiance += frkEmissiveExtra;
`;

/* ================================================================== */
/*  COMPOSITE — carbon fibre / forged composite / textured polymer     */
/* ================================================================== */
const COMPOSITE_PROC = /* glsl */ `
	${CTX}
	${CTX_OUT}

	vec2  q    = frkPlane * frkWeaveScale;
	vec2  cid  = floor( q );
	vec2  cf   = fract( q );
	float qFade = frkFade2( q, 0.3, 1.6 );

	float h = 0.5;
	float over = 0.5;
	float along = 0.5;
	float across = 0.5;

	if ( frkLayup < 0.5 ) {
		/* 2x2 twill carbon */
		over = ( mod( cid.x - cid.y, 4.0 ) < 2.0 ) ? 1.0 : 0.0;
		along  = mix( cf.x, cf.y, over );
		across = mix( cf.y, cf.x, over );
		h = pow( sin( across * FRK_PI ), 0.62 );
	} else if ( frkLayup < 1.5 ) {
		/* plain weave carbon */
		over = 1.0 - mod( cid.x + cid.y, 2.0 );
		along  = mix( cf.x, cf.y, over );
		across = mix( cf.y, cf.x, over );
		h = pow( sin( across * FRK_PI ), 0.70 );
	} else if ( frkLayup < 2.5 ) {
		/* forged composite — randomly oriented chopped fibre chunks */
		vec3  vv = frkVoronoi2( q * 1.7 + frkSeed, 0.95 );
		float rnd = frkH21( vec2( vv.y, vv.z ) );
		h = 1.0 - smoothstep( 0.05, 0.55, vv.x );
		along = rnd; over = rnd; across = rnd;
	} else {
		/* textured polymer grain */
		h = frkGrain( q * 2.4, 0.7 ) * 0.8 + frkFbm2( q * 7.0, 3 ) * 0.35;
		along = 0.5; over = 0.5; across = 0.5;
	}

	/* individual filaments inside a tow */
	float fil = 0.0;
	if ( frkLayup < 2.5 ) {
		fil = 0.5 + 0.5 * sin( across * FRK_PI * ( 6.0 + frkFilament * 26.0 )
		                       + frkH21( cid ) * FRK_TAU + along * 5.0 );
		fil *= frkFilament * qFade;
	}

	float gap = pow( 1.0 - frkSat( h ), 1.6 );
	float peel = ( frkFbm2( frkPlane * 200.0 + frkSeed, 4 ) - 0.5 ) * frkOrangePeel * 0.00038;

	float towRnd = frkH21( cid * 1.31 + frkSeed );
	vec3 col = mix( frkFiberColor, frkResinColor, gap * ( 0.45 + 0.75 * frkResin ) );
	col *= mix( 0.86, 1.16, towRnd );
	col += frkSheenColor * ( fil * 0.10 + h * 0.05 ) * ( 1.0 - gap );
	diffuseColor.rgb = col;

	metalnessFactor = frkSat( frkMetallic * ( 1.0 - gap * 0.5 ) );

	/* fibres are anisotropic: glossy along the tow, rough across it */
	float anisoR = mix( frkRoughness * 0.55, frkRoughness * 1.55, 1.0 - h );
	roughnessFactor = frkSat( anisoR + gap * frkResin * 0.12 );

	vec3 n2 = frkBumpNormal( frkWorldPos, frkNw,
	                         h * frkWeaveStrength * 0.00055 * qFade + fil * 0.00006 + peel, frkFace );
	frkOutNormalW     = normalize( n2 );
	frkOutCoatNormalW = normalize( frkBumpNormal( frkWorldPos, frkNw, peel, frkFace ) );

	vec2 towDirW = mix( vec2( 1.0, 0.0 ), vec2( 0.0, 1.0 ), over );
	if ( frkLayup > 1.5 ) towDirW = frkRot( vec2( 1.0, 0.0 ), towRnd * FRK_TAU );
	/* filaments corrugate ACROSS the tow, so the specular lobe stretches across it */
	vec2 towPerpW = vec2( -towDirW.y, towDirW.x );
	frkAnisoTanW = normalize( frkTBN * vec3( towPerpW, 0.0 ) );
	frkAnisoAmt  = frkSheen * ( 0.25 + 0.75 * h ) * mix( 1.0, 0.3, frkSat( abs( frkLayup - 2.0 ) ) );
`;

const COMPOSITE_MAT = /* glsl */ `
	#ifdef USE_CLEARCOAT
		material.clearcoat          = frkCoatStrength;
		material.clearcoatRoughness = clamp( frkCoatRoughness + frkOrangePeel * 0.05, 0.0, 1.0 );
	#endif
	#ifdef USE_ANISOTROPY
		vec3 frkAT = normalize( transformDirection( frkProjectToPlane( frkAnisoTanW, frkOutNormalW ) * frkFace, viewMatrix ) );
		vec3 frkAB = normalize( cross( normal, frkAT ) );
		material.anisotropy  = frkSat( frkAnisoAmt );
		material.anisotropyT = frkAT;
		material.anisotropyB = frkAB;
		material.alphaT      = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	#endif
`;

/* ================================================================== */
/* Registry                                                             */
/* ================================================================== */
export const FAMILIES = {
	paint: {
		proc: PAINT_PROC, normal: SHARED_NORMAL, mat: PAINT_MAT, extra: PAINT_EXTRA,
		globals: '',
	},
	brake: {
		proc: BRAKE_PROC, normal: SHARED_NORMAL, mat: BRAKE_MAT, extra: BRAKE_EXTRA,
		globals: `vec3 frkAnisoTanW = vec3( 1.0, 0.0, 0.0 );
		          float frkAnisoAmt = 0.0;
		          float frkHoleChamfer = 0.0;
		          vec3 frkEmissiveExtra = vec3( 0.0 );`,
	},
	ceramic: {
		proc: CERAMIC_PROC, normal: SHARED_NORMAL, mat: CERAMIC_MAT, extra: CERAMIC_EXTRA,
		globals: `vec3 frkCeramicSub = vec3( 0.0 );`,
	},
	fabric: {
		proc: FABRIC_PROC, normal: SHARED_NORMAL, mat: FABRIC_MAT, extra: FABRIC_EXTRA,
		globals: `vec3 frkNapW = vec3( 0.0, 0.0, 1.0 );
		          float frkNapDot = 0.5;
		          float frkFuzzAmt = 0.0;`,
	},
	rubber: {
		proc: RUBBER_PROC, normal: SHARED_NORMAL, mat: RUBBER_MAT, extra: RUBBER_EXTRA,
		globals: `float frkRubberCrevice = 0.0;`,
	},
	glass: {
		proc: GLASS_PROC, normal: SHARED_NORMAL, mat: GLASS_MAT, extra: '',
		globals: `float frkGlassPath = 0.006;
		          float frkGlassEdge = 0.0;`,
	},
	metal: {
		proc: METAL_PROC, normal: SHARED_NORMAL, mat: METAL_MAT, extra: METAL_EXTRA,
		globals: `vec3 frkAnisoTanW = vec3( 1.0, 0.0, 0.0 );
		          float frkAnisoAmt = 0.0;
		          vec3 frkEmissiveExtra = vec3( 0.0 );`,
	},
	composite: {
		proc: COMPOSITE_PROC, normal: SHARED_NORMAL, mat: COMPOSITE_MAT, extra: '',
		globals: `vec3 frkAnisoTanW = vec3( 1.0, 0.0, 0.0 );
		          float frkAnisoAmt = 0.0;`,
	},
};

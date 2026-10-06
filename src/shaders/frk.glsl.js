/**
 * FRONTIER — Procedural shading library (GLSL ES 3.00, three.js r180 compatible)
 * ---------------------------------------------------------------------------
 * Everything here is 100% procedural. No texture maps, no image files,
 * no baked lookups. All noise is generated on the GPU from hash functions.
 *
 * The library is injected into three's MeshPhysicalMaterial (Unreal-style
 * "Default Lit" / "Clear Coat" / "Cloth" shading models) via onBeforeCompile,
 * which lets us keep three's physically based IBL, PMREM prefiltering,
 * clear coat, sheen, anisotropy, iridescence and transmission while adding
 * the automotive-specific layers on top.
 */

/* ------------------------------------------------------------------ */
/* 0. Maths / hashing / noise                                          */
/* ------------------------------------------------------------------ */

export const FRK_MATH = /* glsl */ `
#ifndef FRONTIER_MATH
#define FRONTIER_MATH

#define FRK_PI  3.141592653589793
#define FRK_TAU 6.283185307179586

float frkSat ( float x ) { return clamp( x, 0.0, 1.0 ); }

/* Cheap 2D rotation */
vec2 frkRot( vec2 v, float a ) { float s = sin( a ), c = cos( a ); return mat2( c, -s, s, c ) * v; }

/* --- Hash family (Dave Hoskins / "hash without sine") --------------- */
float frkH11( float p ) {
	p = fract( p * 0.1031 );
	p *= p + 33.33;
	p *= p + p;
	return fract( p );
}

float frkH21( vec2 p ) {
	vec3 p3 = fract( vec3( p.xyx ) * 0.1031 );
	p3 += dot( p3, p3.yzx + 33.33 );
	return fract( ( p3.x + p3.y ) * p3.z );
}

vec2 frkH22( vec2 p ) {
	vec3 p3 = fract( vec3( p.xyx ) * vec3( 0.1031, 0.1030, 0.0973 ) );
	p3 += dot( p3, p3.yzx + 33.33 );
	return fract( ( p3.xx + p3.yz ) * p3.zy );
}

vec3 frkH33( vec3 p ) {
	p = fract( p * vec3( 0.1031, 0.1030, 0.0973 ) );
	p += dot( p, p.yxz + 33.33 );
	return fract( ( p.xxy + p.yxx ) * p.zyx );
}

float frkH31( vec3 p ) {
	vec3 q = fract( p * vec3( 0.1031, 0.1030, 0.0973 ) );
	q += dot( q, q.yzx + 33.33 );
	return fract( ( q.x + q.y ) * q.z );
}

/* --- Value noise ---------------------------------------------------- */
float frkNoise2( vec2 x ) {
	vec2 i = floor( x ), f = fract( x );
	f = f * f * ( 3.0 - 2.0 * f );
	float a = frkH21( i );
	float b = frkH21( i + vec2( 1.0, 0.0 ) );
	float c = frkH21( i + vec2( 0.0, 1.0 ) );
	float d = frkH21( i + vec2( 1.0, 1.0 ) );
	return mix( mix( a, b, f.x ), mix( c, d, f.x ), f.y );
}

/* --- Fractal Brownian Motion ---------------------------------------- */
float frkFbm2( vec2 p, int oct ) {
	float s = 0.0, a = 0.5, n = 0.0;
	for ( int i = 0; i < 6; i ++ ) {
		if ( i >= oct ) break;
		s += a * frkNoise2( p );
		n += a; a *= 0.5; p *= 2.03;
	}
	return s / max( n, 1e-5 );
}

float frkRidge2( vec2 p, int oct ) {
	float s = 0.0, a = 0.5, n = 0.0;
	for ( int i = 0; i < 5; i ++ ) {
		if ( i >= oct ) break;
		s += a * ( 1.0 - abs( frkNoise2( p ) * 2.0 - 1.0 ) );
		n += a; a *= 0.5; p *= 2.07;
	}
	return s / max( n, 1e-5 );
}

/* --- Worley / Voronoi ----------------------------------------------- */
/* Returns vec3( F1, cellId.x, cellId.y ). jitter 0..1 controls cell shape. */
vec3 frkVoronoi2( vec2 p, float jitter ) {
	vec2 n = floor( p ), f = fract( p );
	float f1 = 8.0; vec2 id = n;
	for ( int j = -1; j <= 1; j ++ ) {
		for ( int i = -1; i <= 1; i ++ ) {
			vec2 g = vec2( float( i ), float( j ) );
			vec2 c = n + g;
			vec2 o = frkH22( c );
			o = 0.5 + jitter * ( o - 0.5 );
			vec2 r = g + o - f;
			float d = dot( r, r );
			if ( d < f1 ) { f1 = d; id = c; }
		}
	}
	return vec3( sqrt( f1 ), id.x, id.y );
}

/* Voronoi edges (F2-F1) — used for crazing, grain boundaries, cracks. */
float frkVoronoiEdges2( vec2 p, float jitter ) {
	vec2 n = floor( p ), f = fract( p );
	float f1 = 8.0, f2 = 8.0;
	for ( int j = -1; j <= 1; j ++ ) {
		for ( int i = -1; i <= 1; i ++ ) {
			vec2 g = vec2( float( i ), float( j ) );
			vec2 o = frkH22( n + g );
			o = 0.5 + jitter * ( o - 0.5 );
			vec2 r = g + o - f;
			float d = dot( r, r );
			if ( d < f1 ) { f2 = f1; f1 = d; }
			else if ( d < f2 ) { f2 = d; }
		}
	}
	return sqrt( f2 ) - sqrt( f1 );
}

/* --- Pixel-footprint fade ------------------------------------------- */
/* Returns 1 while the pattern is resolved (>= ~lo cells per pixel) and fades
 * to 0 once it collapses to sub-pixel. Every high-frequency procedural layer
 * is multiplied by this so nothing crawls or fires fly in motion. */
float frkFade2( vec2 p, float lo, float hi ) {
	float d = max( length( dFdx( p ) ), length( dFdy( p ) ) );
	return 1.0 - frkSat( ( d - lo ) / max( hi - lo, 1e-5 ) );
}

/* --- Pebble / grain (organic cells, used for plastics & leather) ----- */
float frkGrain( vec2 p, float warp ) {
	vec2 q = p + warp * ( vec2( frkFbm2( p * 0.7, 3 ), frkFbm2( p * 0.7 + 17.3, 3 ) ) - 0.5 );
	return 1.0 - smoothstep( 0.02, 0.5, frkVoronoi2( q, 0.9 ).x );
}

#endif
`;

/* ------------------------------------------------------------------ */
/* 1. Tangent frames & normal perturbation                             */
/* ------------------------------------------------------------------ */

export const FRK_FRAME = /* glsl */ `
#ifndef FRONTIER_FRAME
#define FRONTIER_FRAME

/* Stable analytic tangent frame for any (non-degenerate) normal. */
vec3 frkStableTangent( vec3 n ) {
	vec3 up = abs( n.y ) > 0.985 ? vec3( 1.0, 0.0, 0.0 ) : vec3( 0.0, 1.0, 0.0 );
	vec3 c = cross( up, n );
	float l2 = dot( c, c );
	return l2 > 1e-12 ? c * inversesqrt( l2 ) : vec3( 1.0, 0.0, 0.0 );
}

/* Screen-space-derivative tangent frame, in the same spirit as three's
 * getTangentFrame but hardened: the frame is always strictly orthonormal and
 * collapses to an analytic one when the UV derivatives degenerate (poles,
 * slivers, meshes with no uv channel). normalize( vec3(0) ) would otherwise
 * poison every downstream pattern with NaN on several mobile drivers. */
mat3 frkTangentFrame( vec3 surfPos, vec3 nrmIn, vec2 uv ) {
	vec3 nrm = nrmIn;
	float nl2 = dot( nrm, nrm );
	if ( nl2 < 0.5 || nl2 > 1.5 ) nrm = nl2 > 1e-12 ? nrm * inversesqrt( nl2 ) : vec3( 0.0, 1.0, 0.0 );

	vec3 dp1 = dFdx( surfPos );
	vec3 dp2 = dFdy( surfPos );
	vec2 duv1 = dFdx( uv );
	vec2 duv2 = dFdy( uv );
	vec3 dp2perp = cross( dp2, nrm );
	vec3 dp1perp = cross( nrm, dp1 );
	vec3 t = dp2perp * duv1.x + dp1perp * duv2.x;
	vec3 b = dp2perp * duv1.y + dp1perp * duv2.y;

	float lt2 = dot( t, t );
	float lb2 = dot( b, b );
	if ( lt2 < 1e-14 || lb2 < 1e-14 ) {
		t = frkStableTangent( nrm );
		b = cross( nrm, t );
	}
	vec3 tt = normalize( t );
	vec3 bb = normalize( cross( nrm, tt ) );
	return mat3( tt, bb, nrm );
}

/* Perturb a normal from a scalar height field (three's perturbNormalArb). */
vec3 frkBumpNormal( vec3 surfPos, vec3 surfNorm, float height, float faceDirection ) {
	vec3 vSigmaX = dFdx( surfPos );
	vec3 vSigmaY = dFdy( surfPos );
	float dHx = dFdx( height );
	float dHy = dFdy( height );
	vec3 R1 = cross( vSigmaY, surfNorm );
	vec3 R2 = cross( surfNorm, vSigmaX );
	float fDet = dot( vSigmaX, R1 ) * faceDirection;
	vec3 vGrad = sign( fDet ) * ( dHx * R1 + dHy * R2 );
	return normalize( abs( fDet ) * surfNorm - vGrad );
}

#endif
`;

/* ------------------------------------------------------------------ */
/* 2. Microfacet BRDF helpers                                          */
/* ------------------------------------------------------------------ */

export const FRK_BRDF = /* glsl */ `
#ifndef FRONTIER_BRDF
#define FRONTIER_BRDF

vec3 frkF_Schlick( vec3 f0, float f90, float u ) {
	float m = 1.0 - u;
	float m2 = m * m;
	return f0 + ( f90 - f0 ) * ( m2 * m2 * m );
}

float frkV_GGX_SmithCorrelated( float alpha, float dotNL, float dotNV ) {
	float a2 = alpha * alpha;
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * dotNV * dotNV );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * dotNL * dotNL );
	return 0.5 / max( gv + gl, 1e-5 );
}

#endif
`;

/* ------------------------------------------------------------------ */
/* 3. Metallic flake model                                             */
/* ------------------------------------------------------------------ */
/*
 * Model: a two-octave Worley tiling in tangent space. Every cell carries a
 * randomly oriented mirror facet (a "flake"). A flake only reflects when its
 * own normal is close to the half vector, which is what produces the
 * travelling glitter you see on real metallic / mica basecoats.
 *
 * Anti-aliasing: when the projected cell size drops below roughly one pixel
 * the discrete sparkle is faded out and replaced by an averaged metallic
 * lobe (roughness is raised), so the surface degrades gracefully to a smooth
 * metal in the distance instead of crawling.
 *
 * Paint depth: flakes live *under* the clear coat. The view vector is used to
 * parallax-offset the flake coordinate so deeper paint shows more apparent
 * travel, and the basecoat gets an angular "flop" (face-tone -> edge-tone).
 */

export const FRK_FLAKE = /* glsl */ `
#ifndef FRONTIER_FLAKE
#define FRONTIER_FLAKE

struct FrkFlakeResult {
	vec3  normalTs;      /* blended flake normal in tangent space          */
	vec3  sparkleTs;     /* per-flake mirror normal (tangent space)        */
	float mask;          /* 0..1 fraction of surface covered by flakes     */
	float fade;          /* 1 = discrete sparkle, 0 = averaged metallic    */
	float tilt;          /* average facet tilt, drives roughness response  */
	vec3  tint;          /* per-flake reflectance tint (mica / pearl)      */
	float depth;         /* resolved parallax depth factor                 */
};

/* Random facet normal for a cell. spread = 0 -> perfectly flat mirror,
 * spread = 1 -> hemispherical scatter. */
vec3 frkCellNormal( vec2 cell, float seed, float spread ) {
	vec3 r = frkH33( vec3( cell, seed ) );
	float theta = spread * 1.30 * pow( frkSat( r.z ), 0.6 );
	float phi   = r.x * FRK_TAU;
	float st = sin( theta );
	return normalize( vec3( st * cos( phi ), st * sin( phi ), cos( theta ) ) );
}

FrkFlakeResult frkFlakes( vec2 coord, float seed, float density, float spread,
                          float tiltAmount, vec3 tintA, vec3 tintB, float tintVar ) {

	FrkFlakeResult out_;
	out_.normalTs = vec3( 0.0, 0.0, 1.0 );
	out_.sparkleTs = vec3( 0.0, 0.0, 1.0 );
	out_.mask = 0.0;
	out_.fade = 1.0;
	out_.tilt = 0.0;
	out_.tint = tintA;
	out_.depth = 0.0;

	if ( density <= 0.0 ) return out_;

	vec2 p = coord * density;

	/* --- Pixel-footprint fade ------------------------------------- */
	vec2 dx = dFdx( p );
	vec2 dy = dFdy( p );
	float footprint = max( length( dx ), length( dy ) );
	float fade = 1.0 - frkSat( ( footprint - 0.18 ) / 1.35 );
	fade *= fade;
	out_.fade = fade;

	/* --- Octave 1 (primary flake) ---------------------------------- */
	vec3 v1 = frkVoronoi2( p, 0.86 );
	vec2 c1 = vec2( v1.y, v1.z );
	vec3 n1 = frkCellNormal( c1, seed, spread );
	/* Flakes are discrete islands inside their cell, not a full tiling. */
	float shape1 = 1.0 - frkSat( v1.x * ( 1.55 + 0.55 * frkH21( c1 + seed ) ) );
	shape1 = pow( frkSat( shape1 ), 0.65 );

	/* --- Octave 2 (fine grain, denser & smaller) -------------------- */
	vec3 v2 = frkVoronoi2( p * 2.71 + vec2( seed * 3.1, -seed * 1.7 ), 0.92 );
	vec2 c2 = vec2( v2.y, v2.z );
	vec3 n2 = frkCellNormal( c2, seed + 41.7, spread * 1.25 );
	float shape2 = 1.0 - frkSat( v2.x * 1.75 );
	shape2 = pow( frkSat( shape2 ), 0.8 );

	float w2 = tiltAmount * 0.45;
	/* tiltAmount is the "Coverage" slider: it scales how much of each cell is
	   actually occupied by a flake, so 0 really means a solid non-metallic coat */
	float mask = frkSat( ( shape1 * ( 1.0 - w2 ) + shape2 * w2 ) * tiltAmount );

	/* Blend the two facet normals weighted by their shape. */
	vec3 nBlend = normalize( mix( n1, n2, frkSat( w2 * shape2 / max( mask, 1e-4 ) ) ) );

	out_.mask = mask;
	out_.sparkleTs = nBlend;
	out_.normalTs = normalize( mix( vec3( 0.0, 0.0, 1.0 ), nBlend, mask * ( 0.35 + 0.5 * tiltAmount ) ) );
	out_.tilt = length( nBlend.xy ) * mask;

	/* Per-flake reflectance variation: aluminium chips stay neutral,
	 * mica / xirallic pigments shift hue with facet orientation. */
	float tv = frkH21( c1 + seed * 7.7 );
	vec3 pearl = mix( tintA, tintB, frkSat( 0.5 + 0.5 * cos( ( tv - 0.5 ) * 6.0 + nBlend.z * 3.0 ) ) );
	out_.tint = mix( tintA, pearl, tintVar );

	return out_;
}

#endif
`;

/* ------------------------------------------------------------------ */
/* 4. Shared uniform block + varyings                                  */
/* ------------------------------------------------------------------ */

export const FRK_VARYINGS_VERT = /* glsl */ `
varying vec3 frkWorldPos;
varying vec3 frkWorldNormal;
varying vec3 frkObjPos;
varying vec3 frkObjNormal;
varying vec2 frkUv;
`;

export const FRK_VARYINGS_FRAG = /* glsl */ `
varying vec3 frkWorldPos;
varying vec3 frkWorldNormal;
varying vec3 frkObjPos;
varying vec3 frkObjNormal;
varying vec2 frkUv;
`;

export const FRK_VERTEX_BODY = /* glsl */ `
frkWorldPos    = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;
frkWorldNormal = normalize( mat3( modelMatrix ) * objectNormal );
frkObjPos      = transformed;
frkObjNormal   = normalize( objectNormal );
frkUv          = uv;
`;

/* ------------------------------------------------------------------ */
/* 5. Utility: heat / temper colour ramp (brakes, exhaust)             */
/* ------------------------------------------------------------------ */

export const FRK_TEMPER = /* glsl */ `
#ifndef FRONTIER_TEMPER
#define FRONTIER_TEMPER

/* Oxidation interference colours on steel, from ~200C (straw) to ~800C (grey-blue).
 * Approximates the classic temper sequence: pale yellow -> straw -> bronze ->
 * purple -> deep blue -> grey. */
vec3 frkTemperColor( float t ) {
	t = frkSat( t );
	vec3 c0 = vec3( 0.0, 0.0, 0.0 );                       /* no heat */
	vec3 c1 = vec3( 0.62, 0.52, 0.22 );                    /* pale straw   ~220C */
	vec3 c2 = vec3( 0.72, 0.40, 0.10 );                    /* bronze       ~260C */
	vec3 c3 = vec3( 0.46, 0.20, 0.44 );                    /* purple       ~290C */
	vec3 c4 = vec3( 0.13, 0.22, 0.62 );                    /* deep blue    ~320C */
	vec3 c5 = vec3( 0.24, 0.30, 0.42 );                    /* grey-blue    ~400C */
	vec3 c6 = vec3( 0.34, 0.35, 0.37 );                    /* scale grey   ~700C */
	vec3 c;
	if ( t < 0.16 )      c = mix( c0, c1, frkSat( t / 0.16 ) );
	else if ( t < 0.32 ) c = mix( c1, c2, frkSat( ( t - 0.16 ) / 0.16 ) );
	else if ( t < 0.48 ) c = mix( c2, c3, frkSat( ( t - 0.32 ) / 0.16 ) );
	else if ( t < 0.64 ) c = mix( c3, c4, frkSat( ( t - 0.48 ) / 0.16 ) );
	else if ( t < 0.80 ) c = mix( c4, c5, frkSat( ( t - 0.64 ) / 0.16 ) );
	else                 c = mix( c5, c6, frkSat( ( t - 0.80 ) / 0.20 ) );
	return c;
}

#endif
`;

/* The shared function library. The varyings are appended separately by the
 * material factory so they are declared exactly once. */
export const FRK_LIBRARY = [
	FRK_MATH,
	FRK_FRAME,
	FRK_BRDF,
	FRK_FLAKE,
	FRK_TEMPER,
].join( '\n' );

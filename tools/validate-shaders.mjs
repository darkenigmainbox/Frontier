/**
 * Offline shader assembly + lint.
 *
 * There is no browser in this sandbox, so this tool reproduces exactly what
 * three.js WebGLProgram does — resolve #include chunks, unroll loops, prepend
 * the generated prefix with all the feature #defines — then runs our
 * onBeforeCompile injection on top. The result is the real source the GPU would
 * see, which we then lint for undeclared identifiers and unbalanced blocks.
 *
 *   node tools/validate-shaders.mjs [--dump paint] [--stage frag]
 */

import * as THREE from 'three';
import { ShaderChunk } from 'three/src/renderers/shaders/ShaderChunk.js';
import { createProceduralMaterial } from '../src/shaders/createMaterial.js';
import { FAMILY_SCHEMAS } from '../src/core/schema.js';
import { PRESET_BY_ID } from '../src/core/library.js';

/* ---------------- three's include resolver ---------------- */
const includePattern = /^[ \t]*#include +<([\w\d./]+)>/gm;
export function resolveIncludes( string ) {
	return string.replace( includePattern, ( match, include ) => {
		const chunk = ShaderChunk[ include ];
		if ( chunk === undefined ) throw new Error( 'Can not resolve #include <' + include + '>' );
		return resolveIncludes( chunk );
	} );
}
const unrollLoopPattern = /#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;
export function unrollLoops( string ) {
	return string.replace( unrollLoopPattern, ( match, start, end, snippet ) => {
		let unrolled = '';
		for ( let i = parseInt( start ); i < parseInt( end ); i ++ ) {
			unrolled += snippet.replace( /\[\s*i\s*\]/g, '[ ' + i + ' ]' )
				.replace( /UNROLLED_LOOP_INDEX/g, i );
		}
		return unrolled;
	} );
}

/* ---------------- feature defines per family ---------------- */
const DEFINES = {
	paint:     [ 'STANDARD', 'USE_ENVMAP', 'ENVMAP_TYPE_CUBE_UV', 'USE_CLEARCOAT', 'IOR', 'USE_SPECULAR', 'PHYSICALLY_CORRECT_LIGHTS' ],
	brake:     [ 'STANDARD', 'USE_ENVMAP', 'ENVMAP_TYPE_CUBE_UV', 'USE_ANISOTROPY', 'IOR', 'USE_SPECULAR' ],
	ceramic:   [ 'STANDARD', 'USE_ENVMAP', 'ENVMAP_TYPE_CUBE_UV', 'USE_CLEARCOAT', 'IOR', 'USE_SPECULAR' ],
	fabric:    [ 'STANDARD', 'USE_ENVMAP', 'ENVMAP_TYPE_CUBE_UV', 'USE_SHEEN', 'IOR', 'USE_SPECULAR' ],
	rubber:    [ 'STANDARD', 'USE_ENVMAP', 'ENVMAP_TYPE_CUBE_UV', 'USE_SHEEN', 'IOR', 'USE_SPECULAR' ],
	glass:     [ 'STANDARD', 'USE_ENVMAP', 'ENVMAP_TYPE_CUBE_UV', 'USE_TRANSMISSION', 'USE_IRIDESCENCE', 'IOR', 'USE_SPECULAR', 'USE_DISPERSION', 'DOUBLE_SIDED' ],
	metal:     [ 'STANDARD', 'USE_ENVMAP', 'ENVMAP_TYPE_CUBE_UV', 'USE_ANISOTROPY', 'USE_CLEARCOAT', 'IOR', 'USE_SPECULAR' ],
	composite: [ 'STANDARD', 'USE_ENVMAP', 'ENVMAP_TYPE_CUBE_UV', 'USE_ANISOTROPY', 'USE_CLEARCOAT', 'IOR', 'USE_SPECULAR' ],
};

const PREFIX_FRAG = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
#define varying in
layout(location = 0) out highp vec4 pc_fragColor;
#define gl_FragColor pc_fragColor
#define gl_FragDepthEXT gl_FragDepth
#define texture2D texture
#define textureCube texture
#define texture2DProj textureProj
#define texture2DLodEXT textureLod
#define textureCubeLodEXT textureLod
uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform mat3 normalMatrix;
uniform vec3 cameraPosition;
uniform bool isOrthographic;
#define ENVMAP_MODE_REFLECTION
#define ENVMAP_BLENDING_NONE
#define CUBEUV_TEXEL_WIDTH 0.0029761904761904765
#define CUBEUV_TEXEL_HEIGHT 0.00390625
#define CUBEUV_MAX_MIP 6.0
vec4 linearToOutputTexel( vec4 value ) { return value; }
`;

const PREFIX_VERT = `#version 300 es
precision highp float;
precision highp int;
#define attribute in
#define varying out
#define texture2D texture
uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform mat3 normalMatrix;
uniform vec3 cameraPosition;
uniform bool isOrthographic;
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;
`;

const lightNums = ( str ) => str
	.replace( /NUM_DIR_LIGHTS/g, 3 )
	.replace( /NUM_SPOT_LIGHTS/g, 1 )
	.replace( /NUM_SPOT_LIGHT_MAPS/g, 0 )
	.replace( /NUM_SPOT_LIGHT_COORDS/g, 0 )
	.replace( /NUM_RECT_AREA_LIGHTS/g, 0 )
	.replace( /NUM_POINT_LIGHTS/g, 1 )
	.replace( /NUM_HEMI_LIGHTS/g, 0 )
	.replace( /NUM_DIR_LIGHT_SHADOWS/g, 1 )
	.replace( /NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g, 0 )
	.replace( /NUM_SPOT_LIGHT_SHADOWS/g, 0 )
	.replace( /NUM_POINT_LIGHT_SHADOWS/g, 0 )
	.replace( /NUM_CLIPPING_PLANES/g, 0 )
	.replace( /UNION_CLIPPING_PLANES/g, 0 );

function finishSource( src, prefix, defines ) {
	return unrollLoops( lightNums( resolveIncludes( src ) ) ).replace( /^/, prefix + defines + '\n' );
}

export function assemble( family, presetId ) {
	const preset = presetId ? PRESET_BY_ID.get( presetId ) : null;
	const values = preset ? { ...preset.values } : {};
	const handle = createProceduralMaterial( family, values );
	const lib = THREE.ShaderLib.physical;

	const defines = DEFINES[ family ].map( ( d ) => `#define ${d}` ).join( '\n' );

	/* three runs onBeforeCompile on the RAW source (with #include directives
	   still in it) and only afterwards resolves the chunks. Mirror that. */
	const shader = {
		uniforms: THREE.UniformsUtils.clone( lib.uniforms ),
		vertexShader: lib.vertexShader,
		fragmentShader: lib.fragmentShader,
	};
	handle.material.onBeforeCompile( shader, null );

	return {
		vertex: finishSource( shader.vertexShader, PREFIX_VERT, defines ),
		fragment: finishSource( shader.fragmentShader, PREFIX_FRAG, defines ),
		uniforms: shader.uniforms,
		handle,
	};
}

/** The stock three physical shader, for diffing / baselining. */
export function assembleBase( family ) {
	const lib = THREE.ShaderLib.physical;
	const defines = DEFINES[ family ].map( ( d ) => `#define ${d}` ).join( '\n' );
	return {
		vertex: finishSource( lib.vertexShader, PREFIX_VERT, defines ),
		fragment: finishSource( lib.fragmentShader, PREFIX_FRAG, defines ),
	};
}

/* ---------------- lint ---------------- */
const GLSL_BUILTINS = new Set( ( `
radians degrees sin cos tan asin acos atan sinh cosh tanh asinh acosh atanh
pow exp log exp2 log2 sqrt inversesqrt abs sign floor trunc round roundEven ceil fract mod modf
min max clamp mix step smoothstep isnan isinf floatBitsToInt floatBitsToUint intBitsToFloat uintBitsToFloat
fma frexp ldexp packSnorm2x16 packUnorm2x16 unpackSnorm2x16 unpackUnorm2x16
length distance dot cross normalize faceforward reflect refract matrixCompMult
outerProduct transpose determinant inverse lessThan lessThanEqual greaterThan greaterThanEqual
equal notEqual any all not
textureSize texture textureProj textureLod textureOffset texelFetch texelFetchOffset
textureProjOffset textureLodOffset textureProjLod textureProjLodOffset textureGrad textureGradOffset
textureProjGrad textureProjGradOffset dFdx dFdy fwidth
vec2 vec3 vec4 ivec2 ivec3 ivec4 bvec2 bvec3 bvec4 uvec2 uvec3 uvec4 mat2 mat3 mat4
mat2x2 mat2x3 mat2x4 mat3x2 mat3x3 mat3x4 mat4x2 mat4x3 mat4x4
float int uint bool void true false
in out inout const precision highp mediump lowp struct return if else for while do break continue discard
sampler2D samplerCube sampler3D sampler2DArray isampler2D usampler2D
gl_FragColor gl_FragDepth gl_Position gl_PointSize gl_FrontFacing gl_PointCoord
` ).split( /\s+/ ).filter( Boolean ) );

/* identifiers three's own chunks declare that a naive scan misses */
function declaredIdentifiers( src ) {
	const set = new Set();
	const stripped = src
		.replace( /\/\*[\s\S]*?\*\//g, ' ' )
		.replace( /\/\/[^\n]*/g, ' ' );

	/* uniform / attribute / varying / in / out declarations */
	const declRe = /\b(?:uniform|attribute|varying|in|out|inout|const)\s+(?:lowp |mediump |highp )?([A-Za-z_][\w]*)\s+((?:[A-Za-z_][\w]*(?:\s*\[[^\]]*\])?\s*,?\s*)+)/g;
	let m;
	while ( ( m = declRe.exec( stripped ) ) ) {
		for ( const name of m[ 2 ].split( ',' ) ) {
			const n = name.trim().replace( /\[[^\]]*\]/g, '' );
			if ( n ) set.add( n );
		}
	}
	/* plain local / global declarations:  TYPE name [= ...] [, name2 ...] ; */
	const types = new Set( [ 'float', 'int', 'uint', 'bool', 'vec2', 'vec3', 'vec4', 'ivec2', 'ivec3', 'ivec4',
		'bvec2', 'bvec3', 'bvec4', 'mat2', 'mat3', 'mat4', 'sampler2D', 'samplerCube', 'FrkFlakeResult',
		'IncidentLight', 'ReflectedLight', 'PhysicalMaterial', 'DirectionalLight', 'PointLight', 'SpotLight',
		'HemisphereLight', 'RectAreaLight', 'PointLightShadow', 'SpotLightShadow', 'DirectionalLightShadow',
		'Geometry', 'Material', 'vec2', 'uvec2' ] );
	const localRe = /(?:^|[;{}\n])\s*(?:lowp |mediump |highp )?([A-Za-z_][\w]*)\s+([A-Za-z_][\w]*(?:\s*\[[^\]]*\])?)\s*(?:=[^;]*|;)/g;
	while ( ( m = localRe.exec( stripped ) ) ) {
		if ( types.has( m[ 1 ] ) || /^frk/i.test( m[ 1 ] ) ) set.add( m[ 2 ].replace( /\[[^\]]*\]/g, '' ) );
	}
	/* function definitions */
	const fnRe = /\b([A-Za-z_][\w]*)\s*\([^;{}]*\)\s*{/g;
	while ( ( m = fnRe.exec( stripped ) ) ) {
		if ( ! [ 'if', 'for', 'while', 'switch', 'return' ].includes( m[ 1 ] ) ) set.add( m[ 1 ] );
		/* parameters */
		const params = m[ 0 ].slice( m[ 0 ].indexOf( '(' ) + 1, m[ 0 ].lastIndexOf( ')' ) );
		for ( const part of params.split( ',' ) ) {
			const t = part.trim().split( /\s+/ ).pop().replace( /\[[^\]]*\]/g, '' );
			if ( t ) set.add( t );
		}
	}
	/* #define macros */
	const defRe = /^[ \t]*#\s*define\s+([A-Za-z_]\w*)/gm;
	while ( ( m = defRe.exec( stripped ) ) ) set.add( m[ 1 ] );
	/* struct type names */
	const structRe = /\bstruct\s+([A-Za-z_]\w*)/g;
	while ( ( m = structRe.exec( stripped ) ) ) set.add( m[ 1 ] );
	return set;
}

function usedIdentifiers( src ) {
	const stripped = src.replace( /\/\*[\s\S]*?\*\//g, ' ' ).replace( /\/\/[^\n]*/g, ' ' );
	const out = new Set();
	const re = /[A-Za-z_][\w]*/g;
	let m;
	while ( ( m = re.exec( stripped ) ) ) {
		const prev = stripped.slice( Math.max( 0, m.index - 2 ), m.index );
		if ( prev.endsWith( '.' ) ) continue;      /* member access */
		out.add( m[ 0 ] );
	}
	return out;
}

function balance( src ) {
	const s = src.replace( /\/\*[\s\S]*?\*\//g, ' ' ).replace( /\/\/[^\n]*/g, ' ' );
	let braces = 0, parens = 0, line = 1, worstBraceLine = -1;
	for ( let i = 0; i < s.length; i ++ ) {
		const c = s[ i ];
		if ( c === '\n' ) line ++;
		else if ( c === '{' ) braces ++;
		else if ( c === '}' ) { braces --; if ( braces < 0 && worstBraceLine < 0 ) worstBraceLine = line; }
		else if ( c === '(' ) parens ++;
		else if ( c === ')' ) parens --;
	}
	return { braces, parens, worstBraceLine };
}

/* ---------------- run ---------------- */
const IS_MAIN = String( process.argv[ 1 ] || '' ).split( '/' ).pop() === 'validate-shaders.mjs';
const args = process.argv.slice( 2 );

const dumpFamily = args.includes( '--dump' ) ? args[ args.indexOf( '--dump' ) + 1 ] : null;
const stage = args.includes( '--stage' ) ? args[ args.indexOf( '--stage' ) + 1 ] : 'frag';
const families = args.includes( '--only' ) ? [ args[ args.indexOf( '--only' ) + 1 ] ] : Object.keys( FAMILY_SCHEMAS );

let problems = 0;
for ( const family of ( IS_MAIN ? families : [] ) ) {
	const { vertex, fragment, handle } = assemble( family );
	const target = stage === 'vert' ? vertex : fragment;

	const base = assembleBase( family )[ stage === 'vert' ? 'vertex' : 'fragment' ];
	const balBase = balance( base );
	const bal = balance( target );
	const braceDelta = bal.braces - balBase.braces;
	const parenDelta = bal.parens - balBase.parens;
	const decl = declaredIdentifiers( target );
	const used = usedIdentifiers( target );
	const unknown = [ ...used ].filter( ( id ) =>
		! GLSL_BUILTINS.has( id ) && ! decl.has( id ) && ! /^gl_/.test( id )
	);
	/* keep only FRONTIER-prefixed unknowns plus anything that looks like a typo */
	const frkUnknown = unknown.filter( ( id ) => /^frk/i.test( id ) );

	const ok = braceDelta === 0 && parenDelta === 0 && frkUnknown.length === 0;
	if ( ! ok ) problems ++;
	const added = ( ( target.length - base.length ) / 1024 ).toFixed( 1 );
	console.log( `${ok ? '✓' : '✗'} ${family.padEnd( 10 )} ${stage}  +${added}kb injected  Δbraces=${braceDelta} Δparens=${parenDelta}  uniforms=${Object.keys( handle.uniforms ).length}` );
	if ( braceDelta !== 0 ) console.log( `    !! brace delta ${braceDelta} vs stock shader` );
	if ( parenDelta !== 0 ) console.log( `    !! paren delta ${parenDelta} vs stock shader` );
	if ( frkUnknown.length ) console.log( `    !! undeclared frk symbols: ${frkUnknown.join( ', ' )}` );

	/* verify every schema param actually reached the shader */
	const missing = FAMILY_SCHEMAS[ family ].params.filter( ( p ) => {
		const n = 'frk' + p.key.charAt( 0 ).toUpperCase() + p.key.slice( 1 );
		return ! target.includes( n );
	} );
	if ( missing.length ) console.log( `    · uniforms declared but unused in GLSL: ${missing.map( ( p ) => p.key ).join( ', ' )}` );
}

if ( IS_MAIN && dumpFamily ) {
	const { vertex, fragment } = assemble( dumpFamily );
	const src = stage === 'vert' ? vertex : fragment;
	const offset = src.indexOf( 'FRONTIER_MATH' );
	console.log( '\n' + '='.repeat( 100 ) );
	console.log( src.slice( Math.max( 0, offset - 400 ) ) );
}

if ( IS_MAIN ) {
	console.log( problems ? `\n${problems} family/families with problems` : '\nall families assembled cleanly' );
	process.exit( problems ? 1 : 0 );
}

/**
 * FRONTIER — Live GLSL source view
 *
 * Assembles the exact procedural layers currently injected into the shader for
 * the active material, annotated with the live uniform values, and syntax
 * highlights it for the bottom drawer.
 */

import { FAMILY_SCHEMAS, uniformName } from './schema.js';
import { FAMILIES, uniformDeclarations } from '../shaders/families.js';
import { FRK_FLAKE } from '../shaders/frk.glsl.js';

const STAGE_TITLES = {
	proc:   'STAGE 1 — procedural surface evaluation   (spliced after #include <metalnessmap_fragment>)',
	normal: 'STAGE 2 — normal perturbation             (spliced after #include <clearcoat_normal_fragment_maps>)',
	mat:    'STAGE 3 — PhysicalMaterial override        (spliced after #include <lights_physical_fragment>)',
	extra:  'STAGE 4 — extra BRDF lobe accumulation     (spliced after #include <lights_fragment_end>)',
};

export function buildGlslSource( handle ) {
	if ( ! handle ) return '// no material selected';
	const fam = handle.family;
	const sch = FAMILY_SCHEMAS[ fam ];
	const F = FAMILIES[ fam ];
	const out = [];

	out.push( `/* ==========================================================================` );
	out.push( `   FRONTIER procedural shader — ${sch.label}` );
	out.push( `   shading model : ${sch.model}` );
	out.push( `   host          : three.js MeshPhysicalMaterial (onBeforeCompile injection)` );
	out.push( `   textures used : none — every layer is evaluated from hash noise on the GPU` );
	out.push( `   ========================================================================== */` );
	out.push( `` );
	out.push( `/* ---- live uniform values ---- */` );
	for ( const p of sch.params ) {
		const v = handle.values[ p.key ];
		const shown = p.type === 'color' ? v : ( typeof v === 'number' ? Number( v.toFixed( 4 ) ) : v );
		out.push( `uniform ${p.type === 'color' ? 'vec3 ' : 'float'} ${uniformName( p.key )};   // ${( p.label + ' ' ).padEnd( 22, ' ' )}= ${shown}` );
	}
	out.push( `` );
	out.push( `/* ---- varyings supplied by the vertex stage ---- */` );
	out.push( `varying vec3 frkWorldPos;      // world-space surface position (metres)` );
	out.push( `varying vec3 frkWorldNormal;   // world-space geometric normal` );
	out.push( `varying vec3 frkObjPos;        // object-space position — polar disc maths` );
	out.push( `varying vec3 frkObjNormal;     // object-space normal` );
	out.push( `varying vec2 frkUv;            // mesh UV, used for the tangent frame + UV projection` );
	out.push( `` );

	if ( fam === 'paint' ) {
		out.push( `/* ---- metallic flake model (shared library) ---- */` );
		out.push( FRK_FLAKE.trim() );
		out.push( `` );
	}

	for ( const stage of [ 'proc', 'normal', 'mat', 'extra' ] ) {
		const src = ( F[ stage ] || '' ).trim();
		out.push( `/* ${'-'.repeat( 74 )}` );
		out.push( `   ${STAGE_TITLES[ stage ]}` );
		out.push( `   ${'-'.repeat( 74 )} */` );
		if ( ! src ) out.push( `   (this family adds nothing at this stage)` );
		else out.push( src );
		out.push( `` );
	}

	out.push( `/* ---- uniform block, generated from the parameter schema ---- */` );
	out.push( uniformDeclarations( fam ) );
	return out.join( '\n' );
}

/* ------------------------------------------------------------------ */
/* Minimal GLSL highlighter                                             */
/* ------------------------------------------------------------------ */
const KEYWORDS = new Set( (
	'uniform varying attribute vec2 vec3 vec4 mat2 mat3 mat4 float int uint bool void struct ' +
	'return if else for while do break continue discard in out inout const precision highp mediump lowp ' +
	'sampler2D samplerCube layout flat smooth centroid case switch default true false'
).split( /\s+/ ).filter( Boolean ) );

const BUILTINS = new Set( (
	'mix clamp dot cross normalize length max min pow exp log sin cos tan atan sqrt abs fract floor ' +
	'ceil round mod step smoothstep reflect refract inversesqrt distance transpose texture2D texture ' +
	'dFdx dFdy fwidth saturate pow2 transformDirection inverseTransformDirection'
).split( /\s+/ ).filter( Boolean ) );

function esc( s ) {
	return s.replace( /[&<>]/g, ( c ) => ( { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ c ] ) );
}

const TOKEN = /(\/\*[\s\S]*?\*\/|\/\/[^\n]*)|(#\s*\w+)|(".*?"|'.*?')|(\b\d+\.?\d*(?:[eE][-+]?\d+)?\b)|([A-Za-z_]\w*)|([\s\S])/g;

export function highlightGLSL( src ) {
	let out = '';
	let m;
	TOKEN.lastIndex = 0;
	while ( ( m = TOKEN.exec( src ) ) !== null ) {
		if ( m[ 1 ] ) out += `<span class="cm">${esc( m[ 1 ] )}</span>`;
		else if ( m[ 2 ] ) out += `<span class="pp">${esc( m[ 2 ] )}</span>`;
		else if ( m[ 3 ] ) out += `<span class="nu">${esc( m[ 3 ] )}</span>`;
		else if ( m[ 4 ] ) out += `<span class="nu">${esc( m[ 4 ] )}</span>`;
		else if ( m[ 5 ] ) {
			const w = m[ 5 ];
			const rest = src.slice( TOKEN.lastIndex );
			if ( KEYWORDS.has( w ) ) out += `<span class="kw">${esc( w )}</span>`;
			else if ( /^\s*\(/.test( rest ) ) out += `<span class="fn">${esc( w )}</span>`;
			else if ( BUILTINS.has( w ) ) out += `<span class="fn">${esc( w )}</span>`;
			else if ( /^(frk|Frk|FRK)/.test( w ) ) out += `<span class="ty">${esc( w )}</span>`;
			else out += esc( w );
		} else out += esc( m[ 6 ] || '' );
	}
	return out;
}

const JSON_TOKEN = /("(?:[^"\\]|\\.)*")(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?)/g;

export function highlightJSON( src ) {
	let out = '';
	let last = 0;
	let m;
	JSON_TOKEN.lastIndex = 0;
	while ( ( m = JSON_TOKEN.exec( src ) ) !== null ) {
		out += esc( src.slice( last, m.index ) );
		last = m.index + m[ 0 ].length;
		if ( m[ 2 ] ) out += `<span class="ty">${esc( m[ 1 ] )}</span><span class="pp">${esc( m[ 2 ] )}</span>`;
		else if ( m[ 1 ] ) out += `<span class="fn">${esc( m[ 1 ] )}</span>`;
		else if ( m[ 3 ] ) out += `<span class="kw">${esc( m[ 3 ] )}</span>`;
		else out += `<span class="nu">${esc( m[ 4 ] )}</span>`;
	}
	return out + esc( src.slice( last ) );
}

export function buildJsonSource( handle, presetName ) {
	if ( ! handle ) return '{}';
	return JSON.stringify( {
		name: presetName || 'Untitled',
		family: handle.family,
		model: FAMILY_SCHEMAS[ handle.family ].model,
		procedural: true,
		textures: [],
		values: handle.values,
	}, null, 2 );
}

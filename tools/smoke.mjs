/**
 * Headless smoke test — exercises everything that does not need a GL context:
 * asset construction, material creation, preset/schema consistency and the
 * GLSL preview generator. Run: node tools/smoke.mjs
 */

import * as THREE from 'three';
import { buildAsset, ASSET_ORDER } from '../src/render/assets.js';
import { createProceduralMaterial, selectIndex } from '../src/shaders/createMaterial.js';
import { MATERIAL_LIBRARY, PRESET_BY_ID } from '../src/core/library.js';
import { FAMILY_SCHEMAS, schemaDefaults } from '../src/core/schema.js';
import { buildGlslSource, highlightGLSL, buildJsonSource } from '../src/core/glslPreview.js';

let fails = 0;
const bad = ( msg ) => { fails ++; console.log( '  ✗ ' + msg ); };
const good = ( msg ) => console.log( '  ✓ ' + msg );

console.log( '\n── assets ─────────────────────────────────────────────' );
for ( const id of ASSET_ORDER ) {
	let a;
	try { a = buildAsset( id ); } catch ( e ) { bad( `${id}: build threw ${e.message}` ); continue; }

	let meshes = 0, tris = 0, verts = 0;
	const slotIds = new Set();
	a.group.updateMatrixWorld( true );
	a.group.traverse( ( o ) => {
		if ( ! o.isMesh ) return;
		meshes ++;
		const g = o.geometry;
		if ( ! g.attributes.position ) { bad( `${id}: mesh without positions` ); return; }
		verts += g.attributes.position.count;
		tris += g.index ? g.index.count / 3 : g.attributes.position.count / 3;
		if ( ! g.attributes.normal ) bad( `${id}: mesh without normals` );
		if ( ! g.attributes.uv ) bad( `${id}: mesh without uv (tangent frame will fall back)` );
		if ( ! o.userData.slot ) bad( `${id}: mesh not assigned to a slot` );
		else slotIds.add( o.userData.slot );
		/* NaN scan */
		const p = g.attributes.position.array;
		for ( let i = 0; i < p.length; i += 97 ) {
			if ( ! Number.isFinite( p[ i ] ) ) { bad( `${id}: non-finite vertex` ); break; }
		}
		const n = g.attributes.normal && g.attributes.normal.array;
		if ( n ) for ( let i = 0; i < n.length; i += 97 ) {
			if ( ! Number.isFinite( n[ i ] ) ) { bad( `${id}: non-finite normal` ); break; }
		}
	} );

	const declared = a.slots.map( ( s ) => s.id );
	const orphans = [ ...slotIds ].filter( ( s ) => ! declared.includes( s ) );
	const unused = declared.filter( ( s ) => ! slotIds.has( s ) );
	if ( orphans.length ) bad( `${id}: meshes reference undeclared slots [${orphans}]` );
	if ( unused.length ) bad( `${id}: declared slots have no geometry [${unused}]` );
	for ( const s of a.slots ) {
		if ( ! PRESET_BY_ID.get( s.preset ) ) bad( `${id}: slot "${s.id}" default preset "${s.preset}" does not exist` );
		if ( ! a.camera || ! a.camera.pos || ! a.camera.target ) bad( `${id}: missing camera framing` );
	}
	if ( ! fails ) good( `${id.padEnd( 8 )} ${String( meshes ).padStart( 3 )} meshes  ${Math.round( tris ).toLocaleString().padStart( 9 )} tris  ${declared.length} slots` );
}

console.log( '\n── presets ────────────────────────────────────────────' );
const seen = new Set();
for ( const p of MATERIAL_LIBRARY ) {
	if ( seen.has( p.id ) ) bad( `duplicate preset id ${p.id}` );
	seen.add( p.id );
	if ( ! FAMILY_SCHEMAS[ p.family ] ) { bad( `${p.id}: unknown family "${p.family}"` ); continue; }
	const keys = new Set( FAMILY_SCHEMAS[ p.family ].params.map( ( x ) => x.key ) );
	const unknown = Object.keys( p.values ).filter( ( k ) => ! keys.has( k ) );
	if ( unknown.length ) bad( `${p.id}: unknown parameter(s) ${unknown.join( ', ' )}` );

	/* range validation */
	for ( const param of FAMILY_SCHEMAS[ p.family ].params ) {
		const v = p.values[ param.key ];
		if ( v === undefined ) continue;
		if ( param.type === 'slider' && ( v < param.min || v > param.max ) ) {
			bad( `${p.id}: ${param.key}=${v} outside [${param.min}, ${param.max}]` );
		}
		if ( param.type === 'select' ) {
			const idx = selectIndex( p.family, param.key, v );
			if ( ! param.options.some( ( o ) => o.id === v ) && param.key !== 'projection' ) {
				bad( `${p.id}: select ${param.key}="${v}" is not one of ${param.options.map( ( o ) => o.id )}` );
			}
			if ( idx === 0 && v !== param.options[ 0 ].id ) bad( `${p.id}: select ${param.key}="${v}" did not map` );
		}
		if ( param.type === 'color' && ! /^#[0-9a-fA-F]{6}$/.test( String( v ) ) ) {
			bad( `${p.id}: colour ${param.key}="${v}" is not #rrggbb` );
		}
	}
}
good( `${MATERIAL_LIBRARY.length} presets validated against their schemas` );

console.log( '\n── material handles ───────────────────────────────────' );
let handles = 0;
for ( const p of MATERIAL_LIBRARY ) {
	const values = { ...schemaDefaults( p.family ), ...p.values };
	let hdl;
	try { hdl = createProceduralMaterial( p.family, values ); } catch ( e ) { bad( `${p.id}: ${e.message}` ); continue; }
	handles ++;
	for ( const k in values ) {
		const n = 'frk' + k.charAt( 0 ).toUpperCase() + k.slice( 1 );
		if ( ! hdl.uniforms[ n ] ) bad( `${p.id}: uniform ${n} missing` );
		else {
			const v = hdl.uniforms[ n ].value;
			if ( typeof v === 'number' && ! Number.isFinite( v ) ) bad( `${p.id}: uniform ${n} is not finite` );
			if ( v && v.isColor && ( ! Number.isFinite( v.r ) || ! Number.isFinite( v.g ) || ! Number.isFinite( v.b ) ) ) {
				bad( `${p.id}: colour uniform ${n} is not finite` );
			}
		}
	}
	/* live update path */
	const first = FAMILY_SCHEMAS[ p.family ].params.find( ( x ) => x.type === 'slider' );
	hdl.set( first.key, first.max );
	if ( ! hdl.material.isMeshPhysicalMaterial ) bad( `${p.id}: material broken` );
	hdl.material.dispose();
}
good( `${handles} procedural materials constructed and live-updated` );

console.log( '\n── shader source generation ───────────────────────────' );
for ( const family of Object.keys( FAMILY_SCHEMAS ) ) {
	const values = schemaDefaults( family );
	const hdl = createProceduralMaterial( family, values );
	const src = buildGlslSource( hdl );
	if ( src.length < 3000 ) bad( `${family}: glsl preview too short` );
	const html = highlightGLSL( src );
	if ( html.includes( 'undefined' ) ) bad( `${family}: highlighter emitted undefined` );
	const json = JSON.parse( buildJsonSource( hdl, 'test' ) );
	if ( json.textures.length !== 0 ) bad( `${family}: claims to use textures` );
	hdl.material.dispose();
}
good( `8 families generate GLSL + JSON previews` );

console.log( '\n── no-texture guarantee ───────────────────────────────' );
{
	const values = schemaDefaults( 'paint' );
	const hdl = createProceduralMaterial( 'paint', values );
	const mapKeys = Object.keys( hdl.material ).filter( ( k ) => /Map$/.test( k ) && hdl.material[ k ] );
	if ( mapKeys.length ) bad( `material has texture maps assigned: ${mapKeys}` );
	else good( 'no *Map texture slot is populated on any material' );
	hdl.material.dispose();
}

console.log( fails ? `\n${fails} PROBLEM(S)\n` : '\nall smoke tests passed\n' );
process.exit( fails ? 1 : 0 );

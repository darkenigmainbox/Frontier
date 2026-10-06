/**
 * FRONTIER — Procedural material factory
 *
 * Builds a three.js MeshPhysicalMaterial (Unreal-style Default Lit / Clear Coat /
 * Cloth shading model) and splices the FRONTIER procedural layers into it.
 * Nothing is textured: every parameter is a uniform driven from the schema.
 */

import * as THREE from 'three';
import { FAMILY_SCHEMAS, uniformName } from '../core/schema.js';
import { FRK_LIBRARY, FRK_VARYINGS_VERT, FRK_VARYINGS_FRAG, FRK_VERTEX_BODY } from './frk.glsl.js';
import { FAMILIES, uniformDeclarations, FRK_HELPERS } from './families.js';

/* Base three.js material settings per family. These exist so that the right
 * shader features (clear coat, sheen, anisotropy, transmission, iridescence)
 * are compiled in — the procedural layers then drive them per pixel. */
const FAMILY_BASE = {
	paint: {
		color: 0xffffff, metalness: 1.0, roughness: 0.28,
		clearcoat: 1.0, clearcoatRoughness: 0.035, ior: 1.52,
		envMapIntensity: 1.0,
	},
	brake: {
		color: 0xffffff, metalness: 0.95, roughness: 0.42,
		anisotropy: 0.5, envMapIntensity: 1.0,
	},
	ceramic: {
		color: 0xffffff, metalness: 0.0, roughness: 0.09,
		clearcoat: 1.0, clearcoatRoughness: 0.02, ior: 1.56, envMapIntensity: 1.0,
	},
	fabric: {
		color: 0xffffff, metalness: 0.0, roughness: 0.82,
		sheen: 1.0, sheenRoughness: 0.4, envMapIntensity: 0.85,
	},
	rubber: {
		color: 0xffffff, metalness: 0.0, roughness: 0.72,
		sheen: 0.35, sheenRoughness: 0.55, envMapIntensity: 0.8,
	},
	glass: {
		color: 0xffffff, metalness: 0.0, roughness: 0.012,
		transmission: 1.0, ior: 1.52, thickness: 0.006,
		iridescence: 0.25, iridescenceIOR: 1.32, iridescenceThicknessRange: [ 220, 320 ],
		envMapIntensity: 1.25, side: THREE.DoubleSide,
	},
	metal: {
		color: 0xffffff, metalness: 1.0, roughness: 0.19,
		anisotropy: 0.5, envMapIntensity: 1.0,
	},
	composite: {
		color: 0xffffff, metalness: 0.35, roughness: 0.38,
		clearcoat: 1.0, clearcoatRoughness: 0.03, anisotropy: 0.4, envMapIntensity: 1.0,
	},
};

/* Keep three's own material flags in sync with the schema so the correct
 * #defines stay compiled in. Values are floored above zero where a define
 * depends on them, to avoid recompiling every time a slider hits 0. */
function syncBase( material, v, family ) {
	switch ( family ) {
		case 'paint':
			material.metalness = v.metallic;
			material.roughness = v.roughness;
			material.clearcoat = Math.max( 0.0001, v.coatStrength );
			material.clearcoatRoughness = v.coatRoughness;
			material.ior = v.coatIOR;
			break;
		case 'brake':
			material.metalness = v.metallic;
			material.roughness = v.roughness;
			material.anisotropy = Math.max( 0.0001, v.aniso );
			break;
		case 'ceramic':
			material.roughness = v.roughness;
			material.clearcoat = Math.max( 0.0001, v.coatStrength );
			material.clearcoatRoughness = v.coatRoughness;
			material.ior = v.coatIOR;
			break;
		case 'fabric':
			material.roughness = v.roughness;
			material.sheen = Math.max( 0.0001, v.fuzz );
			material.sheenRoughness = v.fuzzRoughness;
			break;
		case 'rubber':
			material.roughness = v.roughness;
			material.sheen = Math.max( 0.0001, v.sheen );
			material.sheenRoughness = v.sheenRoughness;
			break;
		case 'glass':
			material.roughness = v.roughness;
			material.transmission = v.transmission;
			material.ior = v.ior;
			material.thickness = v.thickness;
			material.dispersion = v.dispersion;
			material.iridescence = Math.max( 0.0001, v.coating );
			material.iridescenceIOR = 1.32;
			material.iridescenceThicknessRange = [ Math.max( 10, v.coatThickness * 0.72 ), Math.max( 20, v.coatThickness ) ];
			material.transparent = false;
			material.opacity = 1.0;
			break;
		case 'metal':
			material.metalness = v.metallic;
			material.roughness = v.roughness;
			material.anisotropy = Math.max( 0.0001, v.aniso );
			material.clearcoat = Math.max( 0.0001, v.coatStrength );
			material.clearcoatRoughness = v.coatRoughness;
			break;
		case 'composite':
			material.metalness = v.metallic;
			material.roughness = v.roughness;
			material.clearcoat = Math.max( 0.0001, v.coatStrength );
			material.clearcoatRoughness = v.coatRoughness;
			material.anisotropy = Math.max( 0.0001, v.sheen );
			break;
	}
}

/* Select-type parameters map to a float index */
const SELECT_INDEX = {
	_all: { projection: { surface: 0, uv: 1 } },
	brake:     { discType: { iron: 0, ceramic: 1, steel: 2 } },
	fabric:    { weave: { plain: 0, twill: 1, knit: 2, suede: 3 } },
	rubber:    { pattern: { smooth: 0, tread: 1, pebble: 2, ribbed: 3 } },
	metal:     { finish: { mirror: 0, brushed: 1, machined: 2, cast: 3, bead: 4 } },
	composite: { layup: { twill: 0, plain: 1, forged: 2, grain: 3 } },
};

export function selectIndex( family, key, id ) {
	const map = ( SELECT_INDEX[ family ] && SELECT_INDEX[ family ][ key ] ) || SELECT_INDEX._all[ key ];
	if ( ! map ) return 0;
	return map[ id ] !== undefined ? map[ id ] : 0;
}

/**
 * Create a procedural material.
 * @param {string} family  one of the FAMILY_SCHEMAS keys
 * @param {object} values  parameter values (schema defaults are filled in)
 * @returns {{material: THREE.MeshPhysicalMaterial, uniforms: object, values: object, family: string}}
 */
export function createProceduralMaterial( family, values = {} ) {
	const schema = FAMILY_SCHEMAS[ family ];
	if ( ! schema ) throw new Error( `Unknown material family: ${family}` );
	const fam = FAMILIES[ family ];

	const material = new THREE.MeshPhysicalMaterial( { ...FAMILY_BASE[ family ] } );
	material.name = `${family}-procedural`;

	/* --- build the uniform set ------------------------------------- */
	const uniforms = {};
	const vals = {};
	for ( const p of schema.params ) {
		const raw = values[ p.key ] !== undefined ? values[ p.key ] : p.default;
		vals[ p.key ] = raw;
		const n = uniformName( p.key );
		if ( p.type === 'color' ) {
			const c = new THREE.Color();
			c.setStyle( raw, THREE.SRGBColorSpace );
			uniforms[ n ] = { value: c };
		} else if ( p.type === 'select' ) {
			uniforms[ n ] = { value: selectIndex( family, p.key, raw ) };
		} else if ( p.type === 'toggle' ) {
			uniforms[ n ] = { value: raw ? 1 : 0 };
		} else {
			uniforms[ n ] = { value: Number( raw ) };
		}
	}

	syncBase( material, vals, family );

	/* --- uniform declarations for the shader ------------------------ */
	const decls = uniformDeclarations( family );

	material.onBeforeCompile = ( shader ) => {
		Object.assign( shader.uniforms, uniforms );

		shader.vertexShader = shader.vertexShader
			.replace( '#include <common>', `#include <common>\n${FRK_VARYINGS_VERT}` )
			.replace( '#include <project_vertex>', `#include <project_vertex>\n${FRK_VERTEX_BODY}` );

		shader.fragmentShader = shader.fragmentShader
			.replace( '#include <common>',
				`#include <common>\n${FRK_LIBRARY}\n${FRK_HELPERS}\n${decls}\n${FRK_VARYINGS_FRAG}` )
			.replace( '#include <metalnessmap_fragment>',
				`#include <metalnessmap_fragment>\n${fam.globals}\n${fam.proc}` )
			.replace( '#include <clearcoat_normal_fragment_maps>',
				`#include <clearcoat_normal_fragment_maps>\n${fam.normal}` )
			.replace( '#include <lights_physical_fragment>',
				`#include <lights_physical_fragment>\n${fam.mat}` )
			.replace( '#include <lights_fragment_end>',
				`#include <lights_fragment_end>\n${fam.extra}` );
	};

	material.customProgramCacheKey = () => `frontier:${family}`;

	const handle = {
		material,
		uniforms,
		values: vals,
		family,
		/** live-update one parameter */
		set( key, value ) {
			const p = schema.params.find( ( x ) => x.key === key );
			if ( ! p ) return;
			vals[ key ] = value;
			const n = uniformName( key );
			if ( p.type === 'color' ) uniforms[ n ].value.setStyle( value, THREE.SRGBColorSpace );
			else if ( p.type === 'select' ) uniforms[ n ].value = selectIndex( family, key, value );
			else if ( p.type === 'toggle' ) uniforms[ n ].value = value ? 1 : 0;
			else uniforms[ n ].value = Number( value );
			syncBase( material, vals, family );
		},
		/** live-update everything */
		setAll( obj ) {
			for ( const k in obj ) handle.set( k, obj[ k ] );
		},
		serialize() {
			return { family, values: { ...vals } };
		},
	};

	return handle;
}

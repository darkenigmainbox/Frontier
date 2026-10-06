/**
 * FRONTIER — Procedural material swatches
 *
 * The thumbnails in the Material Library are not icons and not images: each one
 * is a real (tiny) physically based render of a sphere, evaluated on a 2D canvas
 * with a miniature version of the same shading model the GPU uses. Move a slider
 * and the swatch updates too.
 */

import { FAMILY_SCHEMAS } from '../core/schema.js';

const SIZE = 88;
const PI = Math.PI;

/* ---------------- colour helpers ---------------- */
function srgbToLinear( c ) { return c <= 0.04045 ? c / 12.92 : Math.pow( ( c + 0.055 ) / 1.055, 2.4 ); }
function linearToSrgb( c ) { return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow( c, 1 / 2.4 ) - 0.055; }

function hexToLinearRgb( hex ) {
	let h = String( hex || '#000000' ).replace( '#', '' );
	if ( h.length === 3 ) h = h[ 0 ] + h[ 0 ] + h[ 1 ] + h[ 1 ] + h[ 2 ] + h[ 2 ];
	const n = parseInt( h, 16 );
	return [
		srgbToLinear( ( ( n >> 16 ) & 255 ) / 255 ),
		srgbToLinear( ( ( n >> 8 ) & 255 ) / 255 ),
		srgbToLinear( ( n & 255 ) / 255 ),
	];
}
function cssToLinearRgb( css ) {
	if ( typeof css === 'string' && css[ 0 ] === '#' ) return hexToLinearRgb( css );
	return hexToLinearRgb( '#808080' );
}
export function toCssHex( css ) {
	if ( typeof css === 'string' && css[ 0 ] === '#' ) return css.toLowerCase();
	return '#808080';
}

/* ---------------- hashing / noise (mirrors the GLSL) ---------------- */
function h21( x, y ) {
	let px = ( x * 0.1031 ) % 1; if ( px < 0 ) px += 1;
	let py = ( y * 0.1031 ) % 1; if ( py < 0 ) py += 1;
	let a = px * ( px + 33.33 ); a = ( a % 1 ) * ( ( a % 1 ) + a );
	let b = py * ( py + 33.33 ); b = ( b % 1 ) * ( ( b % 1 ) + b );
	let v = ( a + b ) * ( b % 1 || 0.13 );
	v = v % 1; if ( v < 0 ) v += 1;
	return v;
}
function vnoise( x, y ) {
	const ix = Math.floor( x ), iy = Math.floor( y );
	let fx = x - ix, fy = y - iy;
	fx = fx * fx * ( 3 - 2 * fx ); fy = fy * fy * ( 3 - 2 * fy );
	const a = h21( ix, iy ), b = h21( ix + 1, iy ), c = h21( ix, iy + 1 ), d = h21( ix + 1, iy + 1 );
	return ( a + ( b - a ) * fx ) + ( ( c + ( d - c ) * fx ) - ( a + ( b - a ) * fx ) ) * fy;
}
function fbm( x, y, oct = 4 ) {
	let s = 0, a = 0.5, n = 0;
	for ( let i = 0; i < oct; i ++ ) { s += a * vnoise( x, y ); n += a; a *= 0.5; x *= 2.03; y *= 2.03; }
	return s / n;
}
function voronoiF1( x, y ) {
	const ix = Math.floor( x ), iy = Math.floor( y );
	const fx = x - ix, fy = y - iy;
	let f1 = 8;
	for ( let j = -1; j <= 1; j ++ ) for ( let i = -1; i <= 1; i ++ ) {
		const ox = 0.5 + 0.9 * ( h21( ix + i, iy + j ) - 0.5 );
		const oy = 0.5 + 0.9 * ( h21( ix + i + 71.3, iy + j + 13.7 ) - 0.5 );
		const rx = i + ox - fx, ry = j + oy - fy;
		const d = Math.sqrt( rx * rx + ry * ry );
		if ( d < f1 ) f1 = d;
	}
	return f1;
}

const clamp = ( v, a, b ) => v < a ? a : v > b ? b : v;
const sat = ( v ) => clamp( v, 0, 1 );
const mix = ( a, b, t ) => a + ( b - a ) * t;
function smoothstep( a, b, x ) { const t = sat( ( x - a ) / ( b - a ) ); return t * t * ( 3 - 2 * t ); }

/* ---------------- procedural studio environment ---------------- */
function envSample( dx, dy, dz ) {
	/* gradient dome + two softboxes, in linear HDR */
	const h = dy;
	let r, g, b;
	if ( h > 0 ) {
		const t = Math.pow( h, 0.6 );
		r = mix( 0.055, 0.030, t ); g = mix( 0.058, 0.033, t ); b = mix( 0.064, 0.040, t );
	} else {
		const t = Math.pow( -h, 0.7 );
		r = mix( 0.055, 0.012, t ); g = mix( 0.058, 0.013, t ); b = mix( 0.064, 0.015, t );
	}
	/* key softbox, upper-left-front */
	const k = Math.max( 0, dx * -0.50 + dy * 0.62 + dz * 0.60 );
	const ki = Math.pow( k, 26 ) * 22 + Math.pow( k, 5 ) * 1.5;
	/* fill, right */
	const f = Math.max( 0, dx * 0.80 + dy * 0.25 + dz * 0.42 );
	const fi = Math.pow( f, 14 ) * 5.5;
	/* rim strip behind */
	const m = Math.max( 0, -dz * 0.95 + dy * 0.2 );
	const mi = Math.pow( m, 40 ) * 12;
	const s = ki + fi + mi;
	return [ r + s, g + s * 0.99, b + s * 0.97 ];
}

/* ---------------- BRDF ---------------- */
function D_GGX( a, NoH ) { const a2 = a * a; const d = NoH * NoH * ( a2 - 1 ) + 1; return a2 / ( PI * d * d + 1e-7 ); }
function V_Smith( a, NoL, NoV ) {
	const a2 = a * a;
	const gv = NoL * Math.sqrt( a2 + ( 1 - a2 ) * NoV * NoV );
	const gl = NoV * Math.sqrt( a2 + ( 1 - a2 ) * NoL * NoL );
	return 0.5 / Math.max( gv + gl, 1e-5 );
}
function F_Schlick( f0, u ) { const m = 1 - u, m2 = m * m; return f0 + ( 1 - f0 ) * m2 * m2 * m; }

function aces( x ) {
	const a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
	return sat( ( x * ( a * x + b ) ) / ( x * ( c * x + d ) + e ) );
}

/* ================================================================== */
export function renderSwatch( canvas, preset ) {
	const values = { ...defaultsFor( preset.family ), ...preset.values };
	if ( canvas.width !== SIZE ) { canvas.width = SIZE; canvas.height = SIZE; }
	const ctx = canvas.getContext( '2d', { alpha: false } );
	const img = ctx.createImageData( SIZE, SIZE );
	const data = img.data;

	const fam = preset.family;
	const rough = clamp( values.roughness !== undefined ? values.roughness : 0.4, 0.02, 1 );
	const alpha = rough * rough;

	const base = cssToLinearRgb( values.baseColor || values.glazeColor || values.fiberColor || values.tintColor || values.fiberColor || '#808080' );
	const edge = cssToLinearRgb( values.edgeColor || values.baseColor || '#202020' );
	const flake = cssToLinearRgb( values.flakeColor || '#dfe3e8' );
	const pearl = cssToLinearRgb( values.pearlColor || '#8fd0ff' );
	const sheen = cssToLinearRgb( values.sheenColor || '#9aa4b5' );
	const speck = cssToLinearRgb( values.speckColor || '#4a3f36' );
	const metalness = clamp( values.metallic !== undefined ? values.metallic : 0, 0, 1 );

	const R = 0.395, cx = 0.5, cy = 0.485;
	const L = norm( [ -0.44, 0.62, 0.65 ] );
	const Li = 5.2;

	for ( let py = 0; py < SIZE; py ++ ) {
		for ( let px = 0; px < SIZE; px ++ ) {
			const i = ( py * SIZE + px ) * 4;
			const u = ( px + 0.5 ) / SIZE, v = ( py + 0.5 ) / SIZE;
			const dx = ( u - cx ) / R, dy = -( v - cy ) / R;
			const r2 = dx * dx + dy * dy;

			if ( r2 > 1 ) {
				/* backdrop */
				const vg = 0.55 + 0.45 * ( 1 - Math.min( 1, Math.hypot( u - 0.5, v - 0.5 ) * 1.5 ) );
				const bg = 0.018 * vg;
				/* a faint floor bounce so glass reads as transparent */
				const c = fam === 'glass' ? checker( u, v ) * 0.05 + bg : bg;
				data[ i ] = lin2b( c * 0.9 ); data[ i + 1 ] = lin2b( c ); data[ i + 2 ] = lin2b( c * 1.06 ); data[ i + 3 ] = 255;
				continue;
			}

			const nz = Math.sqrt( 1 - r2 );
			let n = [ dx, dy, nz ];
			const V = [ 0, 0, 1 ];
			const NoV0 = nz;

			/* ---- per-family normal / albedo detail ---- */
			let alb = [ base[ 0 ], base[ 1 ], base[ 2 ] ];
			let met = metalness;
			let a = alpha;
			let sparkleMask = 0;
			let sparkleTint = flake;
			let extra = [ 0, 0, 0 ];
			let transmittance = 0;

			const su = u * SIZE, sv = v * SIZE;

			if ( fam === 'paint' ) {
				const graz = Math.pow( 1 - NoV0, 3.2 );
				const flop = values.flop !== undefined ? values.flop : 0.5;
				alb = [
					mix( base[ 0 ], edge[ 0 ], flop * graz ),
					mix( base[ 1 ], edge[ 1 ], flop * graz ),
					mix( base[ 2 ], edge[ 2 ], flop * graz ),
				];
				const dens = 0.4 + Math.pow( sat( ( values.flakeDensity || 0 ) / 100 ), 1.55 ) * 62;
				const fc = dens * 1.6;
				const cellX = Math.floor( su * fc / SIZE * 3.4 ), cellY = Math.floor( sv * fc / SIZE * 3.4 );
				const d1 = voronoiF1( su * fc / SIZE * 3.4, sv * fc / SIZE * 3.4 );
				const sh = sat( 1 - d1 * 1.7 );
				const cov = ( values.flakeStrength !== undefined ? values.flakeStrength : 0.85 );
				sparkleMask = sh * cov * met;
				const pr = values.pearl || 0;
				const tv = h21( cellX * 1.7, cellY * 3.1 );
				sparkleTint = [
					mix( flake[ 0 ], pearl[ 0 ], pr * ( 0.5 + 0.5 * Math.cos( ( tv - 0.5 ) * 6 ) ) ),
					mix( flake[ 1 ], pearl[ 1 ], pr * ( 0.5 + 0.5 * Math.cos( ( tv - 0.5 ) * 6 + 2 ) ) ),
					mix( flake[ 2 ], pearl[ 2 ], pr * ( 0.5 + 0.5 * Math.cos( ( tv - 0.5 ) * 6 + 4 ) ) ),
				];
				alb = [
					mix( alb[ 0 ], sparkleTint[ 0 ], sat( sh * met ) ),
					mix( alb[ 1 ], sparkleTint[ 1 ], sat( sh * met ) ),
					mix( alb[ 2 ], sparkleTint[ 2 ], sat( sh * met ) ),
				];
				/* orange peel */
				const op = values.orangePeel || 0;
				if ( op > 0 ) {
					const hh = fbm( su * 0.85, sv * 0.85, 4 ) - 0.5;
					n = norm( [ n[ 0 ] + hh * op * 0.28, n[ 1 ] + hh * op * 0.28, n[ 2 ] ] );
					a = clamp( a + op * 0.03, 0.01, 1 );
				}
			} else if ( fam === 'brake' ) {
				const rr = Math.sqrt( r2 );
				const gd = 4 + ( values.grooveDensity || 50 ) * 0.5;
				const rings = Math.pow( 0.5 + 0.5 * Math.sin( rr * gd * 12 + fbm( su * 0.2, sv * 0.2 ) * 4 ), 1.6 );
				alb = [ base[ 0 ] * mix( 0.82, 1.2, rings ), base[ 1 ] * mix( 0.82, 1.2, rings ), base[ 2 ] * mix( 0.82, 1.2, rings ) ];
				n = norm( [ n[ 0 ] + ( rings - 0.5 ) * 0.10 * ( values.grooveStrength || 0.6 ),
				            n[ 1 ], n[ 2 ] ] );
				a = clamp( a * mix( 1, 0.6 + 0.7 * rings, values.grooveStrength || 0.6 ), 0.01, 1 );
				/* rust */
				const rust = values.rust || 0;
				if ( rust > 0.01 ) {
					const rn = fbm( su * 0.09 + 4.7, sv * 0.09, 5 ) * fbm( su * 0.3, sv * 0.3, 4 );
					const rm = sat( ( rn - ( 1 - rust ) * 0.30 ) * ( 2 + rust * 4 ) );
					const rc = cssToLinearRgb( values.rustColor || '#7a3d1c' );
					alb = [ mix( alb[ 0 ], rc[ 0 ], rm ), mix( alb[ 1 ], rc[ 1 ], rm ), mix( alb[ 2 ], rc[ 2 ], rm ) ];
					met *= ( 1 - rm * 0.9 ); a = clamp( a + rm * 0.3, 0.01, 1 );
				}
				/* heat temper */
				const heat = values.heat || 0;
				if ( heat > 0.01 ) {
					const tt = temper( sat( heat * ( 0.7 + 0.5 * fbm( su * 0.05, sv * 0.05, 3 ) ) ) );
					alb = [ mix( alb[ 0 ], tt[ 0 ], heat ), mix( alb[ 1 ], tt[ 1 ], heat ), mix( alb[ 2 ], tt[ 2 ], heat ) ];
				}
				if ( values.discType === 'ceramic' ) {
					const sp = sat( 1 - voronoiF1( su * 0.55, sv * 0.55 ) * 2.2 );
					alb = [ mix( alb[ 0 ], 0.085, sp * 0.7 ), mix( alb[ 1 ], 0.082, sp * 0.7 ), mix( alb[ 2 ], 0.078, sp * 0.7 ) ];
					met = 0.15;
				}
			} else if ( fam === 'ceramic' ) {
				const sc = ( values.speckleScale || 320 ) / 90;
				const sp = sat( 1 - voronoiF1( su * 0.5 * sc, sv * 0.5 * sc ) * 2.6 );
				const body = cssToLinearRgb( values.bodyColor || '#b9b2a6' );
				const sr = h21( Math.floor( su * 0.5 * sc ), Math.floor( sv * 0.5 * sc ) );
				const amt = ( values.speckle || 0.3 ) * sp * mix( 0.3, 1, sr );
				alb = [ mix( base[ 0 ], mix( body[ 0 ], speck[ 0 ], 0.5 ), amt ),
				        mix( base[ 1 ], mix( body[ 1 ], speck[ 1 ], 0.5 ), amt ),
				        mix( base[ 2 ], mix( body[ 2 ], speck[ 2 ], 0.5 ), amt ) ];
				const cz = values.crazing || 0;
				if ( cz > 0.01 ) {
					const e = voronoiF1( su * 0.35, sv * 0.35 );
					const cr = ( 1 - smoothstep( 0.06, 0.22, e ) ) * cz;
					alb = [ alb[ 0 ] * ( 1 - cr * 0.5 ), alb[ 1 ] * ( 1 - cr * 0.5 ), alb[ 2 ] * ( 1 - cr * 0.5 ) ];
					a = clamp( a + cr * 0.25, 0.01, 1 );
				}
				met = 0;
			} else if ( fam === 'fabric' ) {
				const ws = ( values.weaveScale || 560 ) / 60;
				const qx = su * ws * 0.09, qy = sv * ws * 0.09;
				const ix = Math.floor( qx ), iy = Math.floor( qy );
				const fx = qx - ix, fy = qy - iy;
				let hh;
				if ( values.weave === 'suede' ) hh = fbm( qx * 0.4, qy * 0.4, 4 );
				else {
					const chk = ( ( ix + iy ) % 2 + 2 ) % 2;
					hh = mix( Math.sin( fy * PI ), Math.sin( fx * PI ), chk );
				}
				const rel = ( values.weaveStrength || 0.65 ) * 0.30;
				n = norm( [ n[ 0 ] + ( fbm( qx * 2, qy * 2, 3 ) - 0.5 ) * rel,
				            n[ 1 ] + ( hh - 0.5 ) * rel * 1.6, n[ 2 ] ] );
				alb = [ base[ 0 ] * mix( 0.72, 1.14, hh ), base[ 1 ] * mix( 0.72, 1.14, hh ), base[ 2 ] * mix( 0.72, 1.14, hh ) ];
				a = clamp( a * mix( 0.9, 1.15, 1 - sat( hh ) ), 0.05, 1 );
				met = 0;
				/* fuzz rim */
				const rim = Math.pow( 1 - NoV0, 3.4 ) * ( values.fuzz || 0.5 );
				extra = [ sheen[ 0 ] * rim * 0.9, sheen[ 1 ] * rim * 0.9, sheen[ 2 ] * rim * 0.9 ];
			} else if ( fam === 'rubber' ) {
				const ms = ( values.microScale || 600 ) / 90;
				const mh = fbm( su * 0.7 * ms * 0.35, sv * 0.7 * ms * 0.35, 4 ) - 0.5;
				let hh = mh;
				if ( values.pattern === 'tread' ) {
					const ts = ( values.treadScale || 26 ) * 0.16;
					const qx = su * ts, qy = sv * ts;
					const bx = Math.abs( ( qx - Math.floor( qx ) ) - 0.5 );
					const by = Math.abs( ( qy - Math.floor( qy ) ) - 0.5 );
					hh = smoothstep( 0.47, 0.30, bx ) * smoothstep( 0.47, 0.30, by ) - 0.5;
				} else if ( values.pattern === 'pebble' ) {
					hh = sat( 1 - voronoiF1( su * 0.55, sv * 0.55 ) * 2.4 ) - 0.45;
				} else if ( values.pattern === 'ribbed' ) {
					hh = Math.pow( 0.5 + 0.5 * Math.sin( su * 0.9 ), 1.4 ) - 0.45;
				}
				const depth = ( values.treadDepth || 0.6 ) * 0.36;
				n = norm( [ n[ 0 ] + hh * depth * 0.5, n[ 1 ] + hh * depth, n[ 2 ] ] );
				alb = [ base[ 0 ] * mix( 0.85, 1.7, sat( hh + 0.5 ) ), base[ 1 ] * mix( 0.85, 1.7, sat( hh + 0.5 ) ), base[ 2 ] * mix( 0.85, 1.7, sat( hh + 0.5 ) ) ];
				a = clamp( a * mix( 1.12, 0.85, sat( hh + 0.5 ) ), 0.05, 1 );
				met = 0;
				const rim = Math.pow( 1 - NoV0, 3.2 ) * ( values.sheen || 0.3 );
				extra = [ sheen[ 0 ] * rim * 0.5, sheen[ 1 ] * rim * 0.5, sheen[ 2 ] * rim * 0.5 ];
			} else if ( fam === 'glass' ) {
				met = 0;
				a = clamp( alpha, 0.005, 1 );
				transmittance = ( values.transmission !== undefined ? values.transmission : 1 ) * 0.86;
				const tint = cssToLinearRgb( values.edgeColor || '#4fae7d' );
				const pathK = 1 / Math.max( NoV0, 0.14 );
				const ab = Math.exp( -pathK * ( values.absorption || 3 ) * 0.055 );
				alb = [ mix( 1, tint[ 0 ] * 1.7, values.tint || 0.3 ) * ab,
				        mix( 1, tint[ 1 ] * 1.7, values.tint || 0.3 ) * ab,
				        mix( 1, tint[ 2 ] * 1.7, values.tint || 0.3 ) * ab ];
				if ( ( values.scratch || 0 ) > 0.01 ) {
					const s = fbm( su * 1.6, sv * 0.14, 3 );
					a = clamp( a + s * values.scratch * 0.12, 0.004, 1 );
				}
			} else if ( fam === 'metal' ) {
				const bs = ( values.brushScale || 320 ) / 90;
				if ( values.finish === 'brushed' ) {
					const g = fbm( su * 0.06, sv * 1.4 * bs * 0.25, 5 ) - 0.5;
					n = norm( [ n[ 0 ] + g * ( values.brushStrength || 0.6 ) * 0.35, n[ 1 ], n[ 2 ] ] );
					a = clamp( a * ( 1 + g * 1.4 * ( values.brushStrength || 0.6 ) ), 0.005, 1 );
				} else if ( values.finish === 'machined' ) {
					const rings = Math.pow( 0.5 + 0.5 * Math.sin( Math.sqrt( r2 ) * bs * 26 ), 1.7 );
					a = clamp( a * mix( 0.6, 1.7, rings ), 0.005, 1 );
					n = norm( [ n[ 0 ] + ( rings - 0.5 ) * 0.12, n[ 1 ], n[ 2 ] ] );
				} else if ( values.finish === 'cast' || values.finish === 'bead' ) {
					const g = sat( 1 - voronoiF1( su * 0.5 * bs * 0.5, sv * 0.5 * bs * 0.5 ) * 2.2 );
					n = norm( [ n[ 0 ] + ( g - 0.5 ) * 0.22, n[ 1 ] + ( g - 0.5 ) * 0.22, n[ 2 ] ] );
					a = clamp( a * mix( 0.8, 1.4, g ), 0.005, 1 );
				}
				const heat = values.heat || 0;
				if ( heat > 0.01 ) {
					const tt = temper( sat( heat * ( 0.75 + 0.4 * fbm( su * 0.05, sv * 0.05, 3 ) ) ) );
					alb = [ mix( base[ 0 ], tt[ 0 ], heat * 0.9 ), mix( base[ 1 ], tt[ 1 ], heat * 0.9 ), mix( base[ 2 ], tt[ 2 ], heat * 0.9 ) ];
				}
				met = clamp( values.metallic !== undefined ? values.metallic : 1, 0, 1 );
			} else if ( fam === 'composite' ) {
				const ws = ( values.weaveScale || 150 ) / 60;
				const qx = su * ws * 0.22, qy = sv * ws * 0.22;
				const ix = Math.floor( qx ), iy = Math.floor( qy );
				const fx = qx - ix, fy = qy - iy;
				let hh, over;
				if ( values.layup === 'forged' ) {
					hh = sat( 1 - voronoiF1( qx * 1.4, qy * 1.4 ) * 2.0 ); over = h21( ix, iy );
				} else if ( values.layup === 'grain' ) {
					hh = sat( 1 - voronoiF1( qx * 2.0, qy * 2.0 ) * 2.2 ) * 0.8 + fbm( qx * 3, qy * 3, 3 ) * 0.3;
					over = 0.5;
				} else {
					over = ( values.layup === 'twill' )
						? ( ( ( ( ix - iy ) % 4 ) + 4 ) % 4 < 2 ? 1 : 0 )
						: 1 - ( ( ix + iy ) % 2 );
					const across = over ? fy : fx;
					hh = Math.pow( Math.sin( across * PI ), 0.65 );
				}
				const resin = cssToLinearRgb( values.resinColor || '#2a2d33' );
				const gap = Math.pow( 1 - sat( hh ), 1.6 );
				const tr = h21( ix * 1.31, iy * 1.31 );
				alb = [
					mix( base[ 0 ], resin[ 0 ], gap * ( 0.45 + 0.75 * ( values.resin || 0.35 ) ) ) * mix( 0.86, 1.16, tr ),
					mix( base[ 1 ], resin[ 1 ], gap * ( 0.45 + 0.75 * ( values.resin || 0.35 ) ) ) * mix( 0.86, 1.16, tr ),
					mix( base[ 2 ], resin[ 2 ], gap * ( 0.45 + 0.75 * ( values.resin || 0.35 ) ) ) * mix( 0.86, 1.16, tr ),
				];
				alb = [ alb[ 0 ] + sheen[ 0 ] * hh * 0.06, alb[ 1 ] + sheen[ 1 ] * hh * 0.06, alb[ 2 ] + sheen[ 2 ] * hh * 0.06 ];
				const rel = ( values.weaveStrength || 0.9 ) * 0.30;
				n = norm( [ n[ 0 ] + ( hh - 0.5 ) * rel, n[ 1 ] + ( fbm( qx * 3, qy * 3, 3 ) - 0.5 ) * rel * 0.6, n[ 2 ] ] );
				a = clamp( alpha * mix( 0.6, 1.6, 1 - sat( hh ) ), 0.01, 1 );
				met = clamp( values.metallic || 0.3, 0, 1 );
			}

			/* ---- shade ---- */
			const NoL = sat( n[ 0 ] * L[ 0 ] + n[ 1 ] * L[ 1 ] + n[ 2 ] * L[ 2 ] );
			const H = norm( [ L[ 0 ] + V[ 0 ], L[ 1 ] + V[ 1 ], L[ 2 ] + V[ 2 ] ] );
			const NoH = sat( n[ 0 ] * H[ 0 ] + n[ 1 ] * H[ 1 ] + n[ 2 ] * H[ 2 ] );
			const VoH = sat( V[ 0 ] * H[ 0 ] + V[ 1 ] * H[ 1 ] + V[ 2 ] * H[ 2 ] );
			const NoV = sat( n[ 0 ] * V[ 0 ] + n[ 1 ] * V[ 1 ] + n[ 2 ] * V[ 2 ] );

			const f0 = [
				mix( 0.045, alb[ 0 ], met ),
				mix( 0.045, alb[ 1 ], met ),
				mix( 0.045, alb[ 2 ], met ),
			];
			const F = F_Schlick( f0[ 0 ], VoH );
			const Fg = F_Schlick( f0[ 1 ], VoH );
			const Fb = F_Schlick( f0[ 2 ], VoH );

			const D = D_GGX( a, NoH );
			const Vs = V_Smith( a, NoL, NoV );

			let out = [ 0, 0, 0 ];
			/* direct */
			const kd = [ ( 1 - F ) * ( 1 - met ), ( 1 - Fg ) * ( 1 - met ), ( 1 - Fb ) * ( 1 - met ) ];
			out[ 0 ] += Li * NoL * ( kd[ 0 ] * alb[ 0 ] / PI + D * Vs * F );
			out[ 1 ] += Li * NoL * ( kd[ 1 ] * alb[ 1 ] / PI + D * Vs * Fg );
			out[ 2 ] += Li * NoL * ( kd[ 2 ] * alb[ 2 ] / PI + D * Vs * Fb );

			/* image based: rough env along the reflection + irradiance */
			const rr = reflect( V, n );
			const bent = norm( [ mix( rr[ 0 ], n[ 0 ], a * a ), mix( rr[ 1 ], n[ 1 ], a * a ), mix( rr[ 2 ], n[ 2 ], a * a ) ] );
			const e = envSample( bent[ 0 ], bent[ 1 ], bent[ 2 ] );
			const irr = envSample( n[ 0 ], n[ 1 ], n[ 2 ] );
			const Fenv = [
				F_Schlick( f0[ 0 ], NoV ), F_Schlick( f0[ 1 ], NoV ), F_Schlick( f0[ 2 ], NoV ),
			];
			out[ 0 ] += e[ 0 ] * Fenv[ 0 ] * 1.05 + irr[ 0 ] * PI * ( 1 - Fenv[ 0 ] ) * ( 1 - met ) * alb[ 0 ] / PI;
			out[ 1 ] += e[ 1 ] * Fenv[ 1 ] * 1.05 + irr[ 1 ] * PI * ( 1 - Fenv[ 1 ] ) * ( 1 - met ) * alb[ 1 ] / PI;
			out[ 2 ] += e[ 2 ] * Fenv[ 2 ] * 1.05 + irr[ 2 ] * PI * ( 1 - Fenv[ 2 ] ) * ( 1 - met ) * alb[ 2 ] / PI;

			/* clear coat pass */
			const coat = values.coatStrength !== undefined ? values.coatStrength : 0;
			if ( coat > 0.001 ) {
				const ca = clamp( values.coatRoughness !== undefined ? values.coatRoughness : 0.03, 0.01, 1 );
				const ca2 = ca * ca;
				const cD = D_GGX( ca2, NoH ), cV = V_Smith( ca2, NoL, NoV );
				const cF = F_Schlick( 0.045, VoH ) * coat;
				out[ 0 ] += Li * NoL * cD * cV * cF + e[ 0 ] * F_Schlick( 0.045, NoV ) * coat * 0.9;
				out[ 1 ] += Li * NoL * cD * cV * cF + e[ 1 ] * F_Schlick( 0.045, NoV ) * coat * 0.9;
				out[ 2 ] += Li * NoL * cD * cV * cF + e[ 2 ] * F_Schlick( 0.045, NoV ) * coat * 0.9;
				out[ 0 ] *= ( 1 - cF * 0.85 ); out[ 1 ] *= ( 1 - cF * 0.85 ); out[ 2 ] *= ( 1 - cF * 0.85 );
			}

			/* discrete flake glitter */
			if ( sparkleMask > 0.001 ) {
				const fx2 = su * 0.9 + fbm( su * 0.2, sv * 0.2, 2 ) * 2;
				const fy2 = sv * 0.9;
				const gx = Math.floor( fx2 ), gy = Math.floor( fy2 );
				const rnd = h21( gx * 3.7, gy * 9.1 );
				const rnd2 = h21( gx * 12.1, gy * 4.3 );
				const spread = values.flakeSpread !== undefined ? values.flakeSpread : 0.3;
				const theta = spread * 1.3 * Math.pow( rnd, 0.6 );
				const phi = rnd2 * PI * 2;
				const nf = norm( [ n[ 0 ] + Math.sin( theta ) * Math.cos( phi ),
				                   n[ 1 ] + Math.sin( theta ) * Math.sin( phi ),
				                   Math.cos( theta ) ] );
				const nf2 = norm( nf );
				const NoHf = sat( nf2[ 0 ] * H[ 0 ] + nf2[ 1 ] * H[ 1 ] + nf2[ 2 ] * H[ 2 ] );
				const sa = clamp( values.sparkleSharp !== undefined ? values.sparkleSharp : 0.025, 0.004, 0.2 );
				const d = NoHf * NoHf * ( sa * sa - 1 ) + 1;
				const Df = ( sa * sa ) / ( d * d );
				const inten = ( values.sparkle !== undefined ? values.sparkle : 1 ) * sparkleMask;
				const rr2 = reflect( V, nf2 );
				const ef = envSample( rr2[ 0 ], rr2[ 1 ], rr2[ 2 ] );
				out[ 0 ] += ( Li * NoL * Df * 0.05 + ef[ 0 ] * 0.5 ) * sparkleTint[ 0 ] * inten;
				out[ 1 ] += ( Li * NoL * Df * 0.05 + ef[ 1 ] * 0.5 ) * sparkleTint[ 1 ] * inten;
				out[ 2 ] += ( Li * NoL * Df * 0.05 + ef[ 2 ] * 0.5 ) * sparkleTint[ 2 ] * inten;
			}

			out[ 0 ] += extra[ 0 ]; out[ 1 ] += extra[ 1 ]; out[ 2 ] += extra[ 2 ];

			/* glass: composite over the backdrop */
			if ( transmittance > 0 ) {
				const bgc = checker( u, v ) * 0.10 + 0.018;
				out[ 0 ] = mix( bgc * alb[ 0 ], out[ 0 ], 1 - transmittance * 0.86 );
				out[ 1 ] = mix( bgc * alb[ 1 ], out[ 1 ], 1 - transmittance * 0.86 );
				out[ 2 ] = mix( bgc * alb[ 2 ], out[ 2 ], 1 - transmittance * 0.86 );
				out[ 0 ] += bgc * alb[ 0 ] * transmittance * 0.5;
				out[ 1 ] += bgc * alb[ 1 ] * transmittance * 0.5;
				out[ 2 ] += bgc * alb[ 2 ] * transmittance * 0.5;
			}

			/* rim darkening (contact occlusion where the sphere meets the bg) */
			const rimAO = mix( 0.72, 1, smoothstep( 0.86, 1, nz ) );
			out[ 0 ] *= rimAO; out[ 1 ] *= rimAO; out[ 2 ] *= rimAO;

			data[ i ]     = lin2b( aces( out[ 0 ] ) );
			data[ i + 1 ] = lin2b( aces( out[ 1 ] ) );
			data[ i + 2 ] = lin2b( aces( out[ 2 ] ) );
			data[ i + 3 ] = 255;
		}
	}

	ctx.putImageData( img, 0, 0 );

	/* rounded mask + inner ring */
	ctx.globalCompositeOperation = 'destination-in';
	ctx.beginPath();
	roundRect( ctx, 0, 0, SIZE, SIZE, 9 );
	ctx.fill();
	ctx.globalCompositeOperation = 'source-over';

	ctx.strokeStyle = 'rgba(255,255,255,0.09)';
	ctx.lineWidth = 1.5;
	ctx.beginPath();
	roundRect( ctx, 0.75, 0.75, SIZE - 1.5, SIZE - 1.5, 8.5 );
	ctx.stroke();

	/* soft top gloss on the swatch itself */
	const g = ctx.createLinearGradient( 0, 0, 0, SIZE );
	g.addColorStop( 0, 'rgba(255,255,255,0.06)' );
	g.addColorStop( 0.42, 'rgba(255,255,255,0)' );
	g.addColorStop( 1, 'rgba(0,0,0,0.20)' );
	ctx.fillStyle = g;
	ctx.beginPath();
	roundRect( ctx, 0, 0, SIZE, SIZE, 9 );
	ctx.fill();
}

/* ---------------- utils ---------------- */
function lin2b( c ) { return Math.round( clamp( linearToSrgb( clamp( c, 0, 1 ) ), 0, 1 ) * 255 ); }
function norm( v ) { const l = Math.hypot( v[ 0 ], v[ 1 ], v[ 2 ] ) || 1; return [ v[ 0 ] / l, v[ 1 ] / l, v[ 2 ] / l ]; }
function reflect( V, n ) {
	const d = V[ 0 ] * n[ 0 ] + V[ 1 ] * n[ 1 ] + V[ 2 ] * n[ 2 ];
	return [ 2 * d * n[ 0 ] - V[ 0 ], 2 * d * n[ 1 ] - V[ 1 ], 2 * d * n[ 2 ] - V[ 2 ] ];
}
function checker( u, v ) {
	const s = 7;
	const x = Math.floor( u * s ), y = Math.floor( v * s );
	return ( ( x + y ) % 2 === 0 ) ? 1 : 0.35;
}
function roundRect( ctx, x, y, w, h, r ) {
	ctx.moveTo( x + r, y );
	ctx.arcTo( x + w, y, x + w, y + h, r );
	ctx.arcTo( x + w, y + h, x, y + h, r );
	ctx.arcTo( x, y + h, x, y, r );
	ctx.arcTo( x, y, x + w, y, r );
	ctx.closePath();
}
function temper( t ) {
	const stops = [
		[ 0.00, [ 0, 0, 0 ] ], [ 0.16, [ 0.62, 0.52, 0.22 ] ], [ 0.32, [ 0.72, 0.40, 0.10 ] ],
		[ 0.48, [ 0.46, 0.20, 0.44 ] ], [ 0.64, [ 0.13, 0.22, 0.62 ] ], [ 0.80, [ 0.24, 0.30, 0.42 ] ],
		[ 1.00, [ 0.34, 0.35, 0.37 ] ],
	];
	t = sat( t );
	for ( let i = 1; i < stops.length; i ++ ) {
		if ( t <= stops[ i ][ 0 ] ) {
			const a = stops[ i - 1 ], b = stops[ i ];
			const k = ( t - a[ 0 ] ) / Math.max( 1e-6, b[ 0 ] - a[ 0 ] );
			return [
				srgbToLinear( mix( a[ 1 ][ 0 ], b[ 1 ][ 0 ], k ) ),
				srgbToLinear( mix( a[ 1 ][ 1 ], b[ 1 ][ 1 ], k ) ),
				srgbToLinear( mix( a[ 1 ][ 2 ], b[ 1 ][ 2 ], k ) ),
			];
		}
	}
	return [ 0.1, 0.1, 0.1 ];
}

function defaultsFor( family ) {
	const out = {};
	const sch = FAMILY_SCHEMAS[ family ];
	if ( ! sch ) return out;
	for ( const p of sch.params ) out[ p.key ] = p.default;
	return out;
}

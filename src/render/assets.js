/**
 * FRONTIER — Procedural viewport assets
 *
 * Seven automotive "study" objects, all built from code. No meshes, no OBJ, no
 * textures. Every one is broken into named material slots so you can assign a
 * different procedural material to each part (rim vs tyre, rotor vs caliper...).
 */

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const smoothstep = ( a, b, x ) => {
	const t = Math.min( 1, Math.max( 0, ( x - a ) / ( b - a ) ) );
	return t * t * ( 3 - 2 * t );
};

/** mergeGeometries needs every input to agree on indexing. ExtrudeGeometry is
 * non-indexed while Lathe / Cylinder / Sphere are indexed, so normalise them
 * all first. Per-vertex normals are carried across untouched, so shading stays
 * smooth — we only pay a little extra vertex memory. */
function mergeGeos( list ) {
	const norm = list.map( ( g ) => ( g.index ? g.toNonIndexed() : g ) );
	const merged = mergeGeometries( norm, false );
	norm.forEach( ( g, i ) => { if ( g !== list[ i ] ) g.dispose(); } );
	if ( ! merged ) throw new Error( 'mergeGeos: incompatible attribute sets' );
	return merged;
}

const mesh = ( geo, slot ) => {
	const m = new THREE.Mesh( geo );
	m.castShadow = true;
	m.receiveShadow = true;
	m.userData.slot = slot;
	return m;
};

/* ------------------------------------------------------------------ */
/* Shared builders                                                      */
/* ------------------------------------------------------------------ */

/** Revolve a 2D profile (x = radius, y = axial) around Y. */
function lathe( pts, seg = 96 ) {
	return new THREE.LatheGeometry( pts.map( ( p ) => new THREE.Vector2( p[ 0 ], p[ 1 ] ) ), seg );
}

/** Extrude an annular sector lying flat in the XZ plane (axis = Y). */
function annularSector( rIn, rOut, a0, a1, thickness, yCenter, opts = {} ) {
	const bevel = opts.bevel !== undefined ? opts.bevel : Math.min( 0.0012, thickness * 0.22 );
	const spiral = opts.spiral || 0;
	const s = new THREE.Shape();
	s.absarc( 0, 0, rOut, a0, a1, false );
	s.absarc( 0, 0, rIn, a1 + spiral, a0 + spiral, true );
	s.closePath();
	const g = new THREE.ExtrudeGeometry( s, {
		depth: thickness,
		bevelEnabled: bevel > 0.00005,
		bevelSize: bevel,
		bevelThickness: bevel,
		bevelSegments: opts.bevelSegments || 2,
		curveSegments: opts.curveSegments || 26,
		steps: 1,
	} );
	g.rotateX( -Math.PI / 2 );
	g.translate( 0, yCenter - thickness / 2, 0 );
	return g;
}

/** Extrude a full annulus lying flat in the XZ plane (axis = Y). */
function annulus( rIn, rOut, thickness, yCenter, opts = {} ) {
	const bevel = opts.bevel !== undefined ? opts.bevel : Math.min( 0.0012, thickness * 0.22 );
	const s = new THREE.Shape();
	s.absarc( 0, 0, rOut, 0, Math.PI * 2, false );
	const h = new THREE.Path();
	h.absarc( 0, 0, rIn, 0, Math.PI * 2, true );
	s.holes.push( h );
	const g = new THREE.ExtrudeGeometry( s, {
		depth: thickness,
		bevelEnabled: bevel > 0.00005,
		bevelSize: bevel, bevelThickness: bevel,
		bevelSegments: opts.bevelSegments || 2,
		curveSegments: opts.curveSegments || 96,
		steps: 1,
	} );
	g.rotateX( -Math.PI / 2 );
	g.translate( 0, yCenter - thickness / 2, 0 );
	return g;
}

function hexPrism( r, h ) {
	const g = new THREE.CylinderGeometry( r, r, h, 6, 1 );
	return g;
}

/* ================================================================== */
/*  1. BODY PANEL — doubly-curved hood/fender buck with a character    */
/*     line, a shut-line groove and a rolled hem                       */
/* ================================================================== */
function panelHeight( u, v ) {
	let y = 0;
	y += -0.118 * u * u;                                   /* crown across   */
	y += -0.050 * v * v;                                   /* crown along    */
	y += 0.021 * Math.sin( u * 1.9 ) * Math.cos( v * 1.4 );/* soft undulation*/

	let d = Math.abs( u + 0.26 );                          /* primary crease */
	y += 0.060 * Math.pow( Math.max( 0, 1 - d / 0.10 ), 1.8 );

	d = Math.abs( u - 0.46 );                              /* soft shoulder  */
	y -= 0.024 * Math.pow( Math.max( 0, 1 - d / 0.22 ), 2.2 );

	const dv = Math.max( 0, 1 - Math.abs( v - 0.70 ) / 0.44 );   /* arch swell */
	y += 0.040 * dv * dv * Math.max( 0, 1 - Math.abs( u + 0.05 ) / 0.85 );

	const eu = smoothstep( 0.76, 1.0, Math.abs( u ) );     /* rolled hem     */
	const ev = smoothstep( 0.86, 1.0, Math.abs( v ) );
	y -= 0.165 * eu * eu + 0.105 * ev * ev;

	const g = Math.abs( u - 0.735 ) / 0.013;               /* shut line      */
	y -= 0.015 * Math.exp( -g * g );

	return y;
}

function panelSurface( W, L, NX, NZ, yOff, flip ) {
	const pos = [], nor = [], uv = [], idx = [];
	const H = panelHeight, e = 0.0035;
	for ( let iz = 0; iz <= NZ; iz ++ ) {
		const v = ( iz / NZ ) * 2 - 1;
		for ( let ix = 0; ix <= NX; ix ++ ) {
			const u = ( ix / NX ) * 2 - 1;
			pos.push( u * W / 2, H( u, v ) + yOff, v * L / 2 );
			uv.push( ix / NX * ( W / 0.35 ), iz / NZ * ( L / 0.35 ) );
			const hx = ( H( u + e, v ) - H( u - e, v ) ) / ( 2 * e );
			const hz = ( H( u, v + e ) - H( u, v - e ) ) / ( 2 * e );
			let nx = -hx * ( W / 2 ), nz = -hz * ( L / 2 ), ny = ( W / 2 ) * ( L / 2 );
			const l = Math.hypot( nx, ny, nz );
			nx /= l; ny /= l; nz /= l;
			if ( flip ) { nx = -nx; ny = -ny; nz = -nz; }
			nor.push( nx, ny, nz );
		}
	}
	for ( let iz = 0; iz < NZ; iz ++ ) {
		for ( let ix = 0; ix < NX; ix ++ ) {
			const a = iz * ( NX + 1 ) + ix, b = a + 1, c = a + NX + 1, d = c + 1;
			if ( flip ) idx.push( a, c, b, b, c, d );
			else idx.push( a, b, c, b, d, c );
		}
	}
	const g = new THREE.BufferGeometry();
	g.setAttribute( 'position', new THREE.Float32BufferAttribute( pos, 3 ) );
	g.setAttribute( 'normal', new THREE.Float32BufferAttribute( nor, 3 ) );
	g.setAttribute( 'uv', new THREE.Float32BufferAttribute( uv, 2 ) );
	g.setIndex( idx );
	return g;
}

function panelWall( W, L, T, N ) {
	const pos = [], uv = [], idx = [];
	const bp = ( t ) => {
		const s = t * 8;
		if ( s < 2 ) return [ -1 + s, -1 ];
		if ( s < 4 ) return [ 1, -1 + ( s - 2 ) ];
		if ( s < 6 ) return [ 1 - ( s - 4 ), 1 ];
		return [ -1, 1 - ( s - 6 ) ];
	};
	let k = 0;
	for ( let i = 0; i < N; i ++ ) {
		const [ u0, v0 ] = bp( i / N );
		const [ u1, v1 ] = bp( ( i + 1 ) / N );
		const y0 = panelHeight( u0, v0 ), y1 = panelHeight( u1, v1 );
		pos.push(
			u0 * W / 2, y0, v0 * L / 2,
			u1 * W / 2, y1, v1 * L / 2,
			u1 * W / 2, y1 - T, v1 * L / 2,
			u0 * W / 2, y0 - T, v0 * L / 2
		);
		uv.push( 0, 0, 1, 0, 1, 1, 0, 1 );
		idx.push( k, k + 1, k + 2, k, k + 2, k + 3 );
		k += 4;
	}
	const g = new THREE.BufferGeometry();
	g.setAttribute( 'position', new THREE.Float32BufferAttribute( pos, 3 ) );
	g.setAttribute( 'uv', new THREE.Float32BufferAttribute( uv, 2 ) );
	g.setIndex( idx );
	g.computeVertexNormals();
	return g;
}

function buildBodyPanel() {
	const W = 1.52, L = 1.12, T = 0.011;
	const group = new THREE.Group();
	const paint = new THREE.Group();
	paint.add( mesh( panelSurface( W, L, 178, 138, 0, false ), 'paint' ) );
	paint.add( mesh( panelSurface( W, L, 90, 70, -T, true ), 'underside' ) );
	paint.add( mesh( panelWall( W, L, T, 240 ), 'underside' ) );
	group.add( paint );

	/* a chrome brightwork strip following the shoulder line */
	const stripPts = [];
	for ( let i = 0; i <= 90; i ++ ) {
		const v = ( i / 90 ) * 2 - 1;
		const u = 0.455;
		stripPts.push( new THREE.Vector3( u * W / 2, panelHeight( u, v ) + 0.0045, v * L / 2 * 0.94 ) );
	}
	const curve = new THREE.CatmullRomCurve3( stripPts );
	const trim = new THREE.Mesh(
		new THREE.TubeGeometry( curve, 120, 0.0055, 8, false ),
	);
	trim.castShadow = true;
	trim.userData.slot = 'trim';
	group.add( trim );

	/* sealing strip along the hem */
	const sealPts = [];
	for ( let i = 0; i <= 110; i ++ ) {
		const t = i / 110;
		const s = t * 8;
		let u, v;
		if ( s < 2 ) { u = -1 + s; v = -1; } else if ( s < 4 ) { u = 1; v = -1 + ( s - 2 ); }
		else if ( s < 6 ) { u = 1 - ( s - 4 ); v = 1; } else { u = -1; v = 1 - ( s - 6 ); }
		const sc = 0.985;
		sealPts.push( new THREE.Vector3( u * W / 2 * sc, panelHeight( u * sc, v * sc ) - T - 0.006, v * L / 2 * sc ) );
	}
	const seal = new THREE.Mesh( new THREE.TubeGeometry( new THREE.CatmullRomCurve3( sealPts ), 180, 0.0075, 7, false ) );
	seal.castShadow = true;
	seal.userData.slot = 'seal';
	group.add( seal );

	group.rotation.z = 0.13;
	group.rotation.x = -0.16;

	return {
		group,
		slots: [
			{ id: 'paint', label: 'Outer Panel', preset: 'paint-silver-metallic', accepts: [ 'paint', 'composite', 'metal' ], primary: true },
			{ id: 'underside', label: 'Panel Underside', preset: 'comp-bumper', accepts: [ 'composite', 'metal', 'paint' ] },
			{ id: 'trim', label: 'Brightwork Strip', preset: 'metal-chrome', accepts: [ 'metal', 'paint' ] },
			{ id: 'seal', label: 'Hem Seal', preset: 'rubber-epdm', accepts: [ 'rubber', 'composite' ] },
		],
		camera: { pos: [ 1.05, 0.95, 1.45 ], target: [ 0, 0.02, 0 ] },
		label: 'Body Panel',
	};
}

/* ================================================================== */
/*  2. BRAKE ASSEMBLY                                                  */
/* ================================================================== */
function buildBrake() {
	const group = new THREE.Group();
	const R = 0.160, rIn = 0.118, discT = 0.0072, gap = 0.0108;
	const faceY = gap / 2 + discT / 2;          /* friction disc centres     */
	const outerY = gap / 2 + discT;             /* outer friction surface    */
	const padT = 0.0125, calT = 0.030;

	/* --- friction ring: two separate faces so that shader-drilled holes
	       genuinely show through into the vane channel ------------------ */
	const nSlots = 12, slotW = 0.078, spiral = 0.17;
	const faces = [];
	for ( let i = 0; i < nSlots; i ++ ) {
		const a0 = ( i / nSlots ) * Math.PI * 2 + slotW / 2;
		const a1 = ( ( i + 1 ) / nSlots ) * Math.PI * 2 - slotW / 2;
		faces.push( annularSector( rIn, R, a0, a1, discT,  faceY, { spiral, bevel: 0.0006 } ) );
		faces.push( annularSector( rIn, R, a0, a1, discT, -faceY, { spiral, bevel: 0.0006 } ) );
	}
	group.add( mesh( mergeGeos( faces ), 'rotor' ) );

	/* --- internal cooling vanes ---------------------------------------- */
	const vanes = [];
	const nVanes = 38;
	for ( let i = 0; i < nVanes; i ++ ) {
		const sh = new THREE.Shape();
		sh.moveTo( rIn + 0.002, -0.0011 );
		sh.lineTo( R - 0.002, -0.0011 );
		sh.lineTo( R - 0.002, 0.0011 );
		sh.lineTo( rIn + 0.002, 0.0011 );
		sh.closePath();
		const g = new THREE.ExtrudeGeometry( sh, { depth: gap * 0.94, bevelEnabled: false, curveSegments: 2 } );
		g.rotateX( -Math.PI / 2 );
		g.translate( 0, -gap * 0.47, 0 );
		g.rotateY( ( i / nVanes ) * Math.PI * 2 + 0.26 );
		vanes.push( g );
	}
	const vaneMesh = mesh( mergeGeos( vanes ), 'vanes' );
	vaneMesh.castShadow = false;
	group.add( vaneMesh );

	/* --- aluminium hat / bell (closed watertight shell) ---------------- */
	const hat = lathe( [
		[ 0.044,  0.0160 ], [ 0.076, 0.0150 ], [ 0.100, 0.0130 ],
		[ 0.120,  0.0110 ], [ 0.128, 0.0070 ], [ 0.128, -0.0070 ],
		[ 0.120, -0.0110 ], [ 0.104, -0.0165 ], [ 0.088, -0.0265 ],
		[ 0.076, -0.0400 ], [ 0.060, -0.0480 ], [ 0.044, -0.0500 ],
	], 96 );
	group.add( mesh( hat, 'hat' ) );

	/* --- wheel studs + nuts -------------------------------------------- */
	const studs = [];
	for ( let i = 0; i < 5; i ++ ) {
		const a = ( i / 5 ) * Math.PI * 2 + 0.3;
		const x = Math.cos( a ) * 0.072, z = Math.sin( a ) * 0.072;
		const st = new THREE.CylinderGeometry( 0.0060, 0.0060, 0.034, 16 );
		st.translate( x, -0.062, z );
		studs.push( st );
		const nut = hexPrism( 0.0105, 0.014 );
		nut.translate( x, -0.084, z );
		studs.push( nut );
		const cap = new THREE.ConeGeometry( 0.0105, 0.009, 6 );
		cap.rotateX( Math.PI );
		cap.translate( x, -0.0955, z );
		studs.push( cap );
	}
	group.add( mesh( mergeGeos( studs ), 'studs' ) );

	/* --- dust shield ---------------------------------------------------- */
	const shield = lathe( [
		[ 0.058, -0.0560 ], [ 0.118, -0.0560 ], [ 0.164, -0.0500 ],
		[ 0.176, -0.0330 ], [ 0.176, -0.0270 ], [ 0.171, -0.0265 ],
		[ 0.169, -0.0330 ], [ 0.158, -0.0460 ], [ 0.116, -0.0525 ],
		[ 0.058, -0.0525 ],
	], 84 );
	const shieldMesh = mesh( shield, 'shield' );
	shieldMesh.castShadow = false;
	group.add( shieldMesh );

	/* --- caliper + pads, centred at 9 o'clock --------------------------- */
	const cAc = Math.PI, cA0 = cAc - 0.44, cA1 = cAc + 0.44;

	const pads = [];
	for ( const s of [ 1, -1 ] ) {
		const y = s * ( outerY + padT / 2 );
		pads.push( annularSector( rIn + 0.001, R - 0.012, cA0 + 0.02, cA1 - 0.02, padT, y, { bevel: 0.0006, curveSegments: 22 } ) );
		/* pad backing plate */
		pads.push( annularSector( rIn - 0.001, R - 0.008, cA0 + 0.005, cA1 - 0.005, 0.0055,
			s * ( outerY + padT + 0.0028 ), { bevel: 0.0005, curveSegments: 22 } ) );
	}
	group.add( mesh( mergeGeos( pads ), 'pad' ) );

	const calParts = [];
	const calOutY = outerY + padT + 0.0055 + calT / 2;
	calParts.push( annularSector( rIn - 0.006, R - 0.006, cA0, cA1, calT, calOutY,
		{ bevel: 0.0055, bevelSegments: 3, curveSegments: 30 } ) );
	calParts.push( annularSector( rIn - 0.006, R - 0.006, cA0, cA1, calT * 0.82, -calOutY * 0.94,
		{ bevel: 0.0055, bevelSegments: 3, curveSegments: 30 } ) );
	/* bridge over the disc OD */
	calParts.push( annularSector( R - 0.016, R + 0.024, cA0 - 0.04, cA1 + 0.04, 0.086, 0,
		{ bevel: 0.008, bevelSegments: 3, curveSegments: 26 } ) );
	/* mounting ears + bolts */
	for ( const a of [ cA0 - 0.03, cA1 + 0.03 ] ) {
		const ex = Math.cos( a ) * ( rIn + 0.006 ), ez = Math.sin( a ) * ( rIn + 0.006 );
		const ear = new THREE.CylinderGeometry( 0.020, 0.020, 0.034, 22 );
		ear.translate( ex, -calOutY * 0.94, ez );
		calParts.push( ear );
		const bolt = hexPrism( 0.0090, 0.018 );
		bolt.translate( ex, -calOutY * 0.94 - 0.024, ez );
		calParts.push( bolt );
	}
	/* bleeder nipple + banjo fitting */
	const ba = cA1 - 0.10;
	const bleed = new THREE.CylinderGeometry( 0.0050, 0.0064, 0.020, 12 );
	bleed.translate( Math.cos( ba ) * ( rIn + 0.020 ), calOutY + calT / 2 + 0.008, Math.sin( ba ) * ( rIn + 0.020 ) );
	calParts.push( bleed );
	const banjo = new THREE.TorusGeometry( 0.0115, 0.0040, 10, 24 );
	banjo.rotateX( Math.PI / 2 );
	banjo.translate( Math.cos( cA0 + 0.10 ) * ( R + 0.014 ), calOutY + 0.004, Math.sin( cA0 + 0.10 ) * ( R + 0.014 ) );
	calParts.push( banjo );
	group.add( mesh( mergeGeos( calParts ), 'caliper' ) );

	/* --- braided hose --------------------------------------------------- */
	const hosePts = [
		new THREE.Vector3( Math.cos( cA0 + 0.10 ) * ( R + 0.014 ), calOutY + 0.004, Math.sin( cA0 + 0.10 ) * ( R + 0.014 ) ),
		new THREE.Vector3( Math.cos( cA0 + 0.30 ) * ( R + 0.07 ), 0.09, Math.sin( cA0 + 0.30 ) * ( R + 0.07 ) ),
		new THREE.Vector3( -0.34, 0.19, 0.10 ),
	];
	const hose = new THREE.Mesh( new THREE.TubeGeometry( new THREE.CatmullRomCurve3( hosePts ), 44, 0.0052, 9, false ) );
	hose.castShadow = true;
	hose.userData.slot = 'hose';
	group.add( hose );

	group.rotation.x = Math.PI / 2;      /* present the disc upright */
	group.rotation.z = 0.22;

	return {
		group,
		slots: [
			{ id: 'rotor', label: 'Friction Ring', preset: 'brake-cast-iron', accepts: [ 'brake', 'metal', 'ceramic' ], primary: true },
			{ id: 'vanes', label: 'Cooling Vanes', preset: 'brake-cast-iron', accepts: [ 'brake', 'metal' ] },
			{ id: 'hat', label: 'Alloy Hat', preset: 'brake-hat-alloy', accepts: [ 'metal', 'brake' ] },
			{ id: 'studs', label: 'Studs & Nuts', preset: 'metal-chrome', accepts: [ 'metal' ] },
			{ id: 'shield', label: 'Dust Shield', preset: 'metal-cast-alloy', accepts: [ 'metal', 'composite' ] },
			{ id: 'pad', label: 'Brake Pad', preset: 'brake-pad', accepts: [ 'composite', 'ceramic', 'rubber' ] },
			{ id: 'caliper', label: 'Caliper Body', preset: 'paint-caliper-red', accepts: [ 'paint', 'metal', 'composite' ] },
			{ id: 'hose', label: 'Braided Hose', preset: 'rubber-smooth', accepts: [ 'rubber', 'metal' ] },
		],
		camera: { pos: [ 0.36, 0.18, 0.46 ], target: [ 0, 0, 0 ] },
		label: 'Brake Assembly',
	};
}

/* ================================================================== */
/*  3. WHEEL & TYRE                                                    */
/* ================================================================== */
function tyreProfilePts() {
	const RIM = 0.2435, CROWN = 0.3455, HW = 0.108;
	const pts = [];
	const N = 40;
	for ( let i = 0; i <= N; i ++ ) {
		const t = i / N;
		const y = ( t * 2 - 1 ) * HW;
		const ay = Math.min( 1, Math.abs( y ) / HW );
		let r;
		if ( ay > 0.94 ) r = RIM + 0.004;
		else {
			const s = ay / 0.94;
			r = CROWN - ( CROWN - RIM - 0.010 ) * Math.pow( s, 2.05 );
			r += 0.014 * Math.sin( Math.PI * Math.pow( s, 0.75 ) );
		}
		pts.push( [ r, y ] );
	}
	return pts;
}

function buildWheel() {
	const group = new THREE.Group();
	const pts = tyreProfilePts();
	const treadLo = -0.058, treadHi = 0.058;

	const innerSide = pts.filter( ( p ) => p[ 1 ] <= treadLo );
	const tread = pts.filter( ( p ) => p[ 1 ] >= treadLo && p[ 1 ] <= treadHi );
	const outerSide = pts.filter( ( p ) => p[ 1 ] >= treadHi );

	innerSide.push( [ tread[ 0 ][ 0 ], treadLo ] );
	tread.push( [ outerSide[ 0 ][ 0 ], treadHi ] );

	const gTread = lathe( tread, 110 );
	const gIn = lathe( innerSide, 110 );
	const gOut = lathe( outerSide, 110 );

	const mTread = mesh( gTread, 'tread' );
	const mIn = mesh( gIn, 'sidewall' );
	const mOut = mesh( gOut, 'sidewall' );
	group.add( mTread, mIn, mOut );

	/* --- rim barrel ------------------------------------------------ */
	const barrel = lathe( [
		[ 0.2300, 0.1000 ], [ 0.2400, 0.0930 ], [ 0.2440, 0.0820 ],
		[ 0.2410, 0.0700 ], [ 0.2370, 0.0400 ], [ 0.2320, 0.0080 ],
		[ 0.2280, -0.0220 ], [ 0.2320, -0.0560 ], [ 0.2380, -0.0780 ],
		[ 0.2420, -0.0900 ], [ 0.2340, -0.1000 ], [ 0.2280, -0.0990 ],
		[ 0.2340, -0.0880 ], [ 0.2250, -0.0560 ], [ 0.2220, -0.0200 ],
		[ 0.2260, 0.0100 ], [ 0.2310, 0.0420 ], [ 0.2340, 0.0680 ],
		[ 0.2300, 0.0820 ], [ 0.2240, 0.0900 ], [ 0.2130, 0.0900 ],
	], 110 );
	group.add( mesh( barrel, 'rim' ) );

	/* --- front face: hub + 5 twin spokes + lip ring ---------------- */
	const rimParts = [];
	const faceY = 0.074;

	const lip = annulus( 0.2130, 0.2345, 0.010, faceY - 0.004, { bevel: 0.0025, bevelSegments: 3 } );
	rimParts.push( lip );

	const hubOuter = lathe( [
		[ 0.0300, faceY + 0.0140 ], [ 0.0560, faceY + 0.0130 ],
		[ 0.0760, faceY + 0.0080 ], [ 0.0880, faceY - 0.0020 ],
		[ 0.0920, faceY - 0.0140 ], [ 0.0880, faceY - 0.0240 ],
		[ 0.0600, faceY - 0.0300 ], [ 0.0300, faceY - 0.0310 ],
	], 72 );
	rimParts.push( hubOuter );

	for ( let i = 0; i < 5; i ++ ) {
		const a = ( i / 5 ) * Math.PI * 2;
		for ( const off of [ -0.028, 0.028 ] ) {
			const s = new THREE.Shape();
			const r0 = 0.082, r1 = 0.216;
			s.moveTo( r0, off - 0.019 );
			s.lineTo( r1 * 0.62, off - 0.024 );
			s.quadraticCurveTo( r1, off - 0.020, r1, off - 0.008 );
			s.lineTo( r1, off + 0.008 );
			s.quadraticCurveTo( r1, off + 0.020, r1 * 0.62, off + 0.024 );
			s.lineTo( r0, off + 0.019 );
			s.closePath();
			const g = new THREE.ExtrudeGeometry( s, {
				depth: 0.026, bevelEnabled: true, bevelSize: 0.0055,
				bevelThickness: 0.0055, bevelSegments: 3, curveSegments: 14,
			} );
			g.rotateX( -Math.PI / 2 );
			g.translate( 0, faceY - 0.013, 0 );
			g.rotateY( a );
			rimParts.push( g );
		}
	}
	group.add( mesh( mergeGeos( rimParts ), 'rim' ) );

	/* --- centre cap, lugs, valve ------------------------------------ */
	const detail = [];
	const cap = new THREE.CylinderGeometry( 0.0305, 0.0315, 0.010, 40 );
	cap.translate( 0, faceY + 0.017, 0 );
	detail.push( cap );
	const capDome = new THREE.SphereGeometry( 0.0305, 32, 12, 0, Math.PI * 2, 0, Math.PI * 0.34 );
	capDome.translate( 0, faceY + 0.021, 0 );
	detail.push( capDome );
	for ( let i = 0; i < 5; i ++ ) {
		const a = ( i / 5 ) * Math.PI * 2 + Math.PI / 5;
		const x = Math.cos( a ) * 0.058, z = Math.sin( a ) * 0.058;
		const lug = hexPrism( 0.0100, 0.014 );
		lug.translate( x, faceY + 0.018, z );
		detail.push( lug );
	}
	const valve = new THREE.CylinderGeometry( 0.0042, 0.0050, 0.030, 12 );
	valve.rotateX( Math.PI / 2.3 );
	valve.translate( 0.245, 0.036, 0.0 );
	detail.push( valve );
	group.add( mesh( mergeGeos( detail ), 'hub' ) );

	group.rotation.x = Math.PI / 2;   /* stand the wheel up */
	group.rotation.z = 0.18;

	return {
		group,
		slots: [
			{ id: 'rim', label: 'Alloy Rim', preset: 'metal-machined-face', accepts: [ 'metal', 'paint', 'composite' ], primary: true },
			{ id: 'tread', label: 'Tyre Tread', preset: 'rubber-tread', accepts: [ 'rubber' ] },
			{ id: 'sidewall', label: 'Tyre Sidewall', preset: 'rubber-sidewall', accepts: [ 'rubber' ] },
			{ id: 'hub', label: 'Hub & Lugs', preset: 'metal-chrome', accepts: [ 'metal', 'paint' ] },
		],
		camera: { pos: [ 0.62, 0.34, 0.72 ], target: [ 0, 0, 0 ] },
		label: 'Wheel & Tyre',
	};
}

/* ================================================================== */
/*  4. SEAT                                                            */
/* ================================================================== */
function buildSeat() {
	const group = new THREE.Group();

	const cushion = new RoundedBoxGeometry( 0.50, 0.135, 0.48, 6, 0.052 );
	cushion.translate( 0, 0.30, 0.02 );
	group.add( mesh( cushion, 'fabric' ) );

	/* centre insert vs bolsters */
	const insert = new RoundedBoxGeometry( 0.30, 0.055, 0.44, 5, 0.026 );
	insert.translate( 0, 0.372, 0.02 );
	group.add( mesh( insert, 'fabric' ) );

	const bolsterGeo = new RoundedBoxGeometry( 0.105, 0.145, 0.46, 5, 0.05 );
	const bL = mesh( bolsterGeo.clone(), 'bolster' );
	bL.position.set( -0.215, 0.315, 0.02 );
	bL.rotation.z = -0.16;
	const bR = mesh( bolsterGeo.clone(), 'bolster' );
	bR.position.set( 0.215, 0.315, 0.02 );
	bR.rotation.z = 0.16;
	group.add( bL, bR );

	/* backrest */
	const back = new RoundedBoxGeometry( 0.50, 0.56, 0.115, 6, 0.05 );
	const backM = mesh( back, 'fabric' );
	backM.position.set( 0, 0.60, -0.235 );
	backM.rotation.x = -0.19;
	group.add( backM );

	const backInsert = new RoundedBoxGeometry( 0.30, 0.44, 0.05, 5, 0.024 );
	const backInsertM = mesh( backInsert, 'fabric' );
	backInsertM.position.set( 0, 0.615, -0.175 );
	backInsertM.rotation.x = -0.19;
	group.add( backInsertM );

	const backBolsterGeo = new RoundedBoxGeometry( 0.11, 0.50, 0.13, 5, 0.05 );
	for ( const s of [ -1, 1 ] ) {
		const b = mesh( backBolsterGeo.clone(), 'bolster' );
		b.position.set( s * 0.215, 0.60, -0.225 );
		b.rotation.x = -0.19;
		b.rotation.z = s * 0.09;
		group.add( b );
	}

	/* headrest */
	const head = new RoundedBoxGeometry( 0.27, 0.175, 0.095, 5, 0.045 );
	const headM = mesh( head, 'fabric' );
	headM.position.set( 0, 0.955, -0.285 );
	headM.rotation.x = -0.12;
	group.add( headM );

	const stems = [];
	for ( const s of [ -1, 1 ] ) {
		const st = new THREE.CylinderGeometry( 0.0075, 0.0075, 0.10, 14 );
		st.translate( s * 0.075, 0.895, -0.272 );
		stems.push( st );
	}
	group.add( mesh( mergeGeos( stems ), 'frame' ) );

	/* stitch line around the insert */
	const stitchPts = [];
	const rect = ( w, d, y, z, n ) => {
		const pts = [];
		const per = 2 * ( w + d );
		for ( let i = 0; i <= n; i ++ ) {
			const t = ( i / n ) * per;
			let x, zz;
			if ( t < w ) { x = -w / 2 + t; zz = -d / 2; }
			else if ( t < w + d ) { x = w / 2; zz = -d / 2 + ( t - w ); }
			else if ( t < 2 * w + d ) { x = w / 2 - ( t - w - d ); zz = d / 2; }
			else { x = -w / 2; zz = d / 2 - ( t - 2 * w - d ); }
			pts.push( new THREE.Vector3( x, y, zz + z ) );
		}
		return pts;
	};
	stitchPts.push( ...rect( 0.31, 0.45, 0.375, 0.02, 120 ) );
	const stitch = new THREE.Mesh( new THREE.TubeGeometry( new THREE.CatmullRomCurve3( stitchPts, true ), 240, 0.0022, 5, true ) );
	stitch.castShadow = true;
	stitch.userData.slot = 'stitch';
	group.add( stitch );

	/* base / track */
	const base = new RoundedBoxGeometry( 0.44, 0.09, 0.52, 4, 0.02 );
	const baseM = mesh( base, 'shell' );
	baseM.position.set( 0, 0.195, 0.0 );
	group.add( baseM );

	const rails = [];
	for ( const s of [ -1, 1 ] ) {
		const r = new THREE.BoxGeometry( 0.036, 0.028, 0.60 );
		r.translate( s * 0.16, 0.135, 0.0 );
		rails.push( r );
		const feet = new THREE.BoxGeometry( 0.06, 0.02, 0.05 );
		for ( const z of [ -0.26, 0.26 ] ) {
			const f = feet.clone();
			f.translate( s * 0.16, 0.11, z );
			rails.push( f );
		}
	}
	group.add( mesh( mergeGeos( rails ), 'frame' ) );

	const adjuster = new THREE.CylinderGeometry( 0.026, 0.026, 0.014, 22 );
	adjuster.rotateZ( Math.PI / 2 );
	adjuster.translate( -0.245, 0.235, -0.10 );
	group.add( mesh( adjuster, 'frame' ) );

	return {
		group,
		slots: [
			{ id: 'fabric', label: 'Seat Cloth', preset: 'fabric-seatcloth', accepts: [ 'fabric' ], primary: true },
			{ id: 'bolster', label: 'Side Bolster', preset: 'comp-leather', accepts: [ 'composite', 'fabric' ] },
			{ id: 'stitch', label: 'Stitching', preset: 'fabric-belt', accepts: [ 'fabric' ] },
			{ id: 'shell', label: 'Back Shell', preset: 'comp-bumper', accepts: [ 'composite', 'paint' ] },
			{ id: 'frame', label: 'Frame & Rails', preset: 'metal-brushed-alu', accepts: [ 'metal' ] },
		],
		camera: { pos: [ 0.78, 0.86, 0.98 ], target: [ 0, 0.50, -0.05 ] },
		label: 'Seat',
	};
}

/* ================================================================== */
/*  5. HEADLAMP                                                        */
/* ================================================================== */
function buildLamp() {
	const group = new THREE.Group();

	/* housing */
	const housing = new RoundedBoxGeometry( 0.46, 0.19, 0.22, 6, 0.06 );
	housing.translate( 0, 0, -0.03 );
	group.add( mesh( housing, 'housing' ) );

	/* outer lens: shallow scaled dome */
	const lensGeo = new THREE.SphereGeometry( 0.5, 64, 32, 0, Math.PI * 2, 0, Math.PI * 0.30 );
	lensGeo.scale( 0.58, 0.245, 0.245 );
	lensGeo.rotateX( Math.PI / 2 );
	lensGeo.translate( 0, 0, 0.03 );
	const lens = mesh( lensGeo, 'lens' );
	lens.castShadow = false;
	group.add( lens );

	/* bezel ring around the lens */
	const bezelPts = [];
	for ( let i = 0; i <= 90; i ++ ) {
		const t = i / 90;
		const a = t * Math.PI * 2;
		bezelPts.push( new THREE.Vector3( Math.cos( a ) * 0.235, Math.sin( a ) * 0.098, 0.055 + Math.cos( a * 2 ) * 0.004 ) );
	}
	const bezel = new THREE.Mesh( new THREE.TubeGeometry( new THREE.CatmullRomCurve3( bezelPts, true ), 160, 0.0075, 9, true ) );
	bezel.castShadow = true;
	bezel.userData.slot = 'bezel';
	group.add( bezel );

	/* projector reflector bowl (paraboloid) */
	const bowlPts = [];
	for ( let i = 0; i <= 22; i ++ ) {
		const t = i / 22;
		const r = 0.062 * Math.sqrt( t );
		bowlPts.push( [ r, -0.052 * t ] );
	}
	const bowl = lathe( bowlPts, 48 );
	const bowlM = mesh( bowl, 'reflector' );
	bowlM.rotation.x = Math.PI / 2;
	bowlM.position.set( -0.075, -0.005, 0.0 );
	group.add( bowlM );

	/* projector lens */
	const proj = new THREE.SphereGeometry( 0.030, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.55 );
	proj.rotateX( Math.PI / 2 );
	const projM = mesh( proj, 'projector' );
	projM.position.set( -0.075, -0.005, 0.052 );
	projM.castShadow = false;
	group.add( projM );

	const projRing = new THREE.TorusGeometry( 0.0315, 0.0045, 10, 40 );
	const projRingM = mesh( projRing, 'bezel' );
	projRingM.position.set( -0.075, -0.005, 0.050 );
	group.add( projRingM );

	/* secondary reflector (main beam) */
	const bowl2 = lathe( bowlPts, 48 );
	const bowl2M = mesh( bowl2, 'reflector' );
	bowl2M.rotation.x = Math.PI / 2;
	bowl2M.position.set( 0.105, -0.005, 0.0 );
	group.add( bowl2M );

	/* DRL light guide */
	const drlPts = [];
	for ( let i = 0; i <= 60; i ++ ) {
		const t = i / 60;
		drlPts.push( new THREE.Vector3( -0.19 + t * 0.38, 0.058 - t * t * 0.012, 0.062 ) );
	}
	const drl = new THREE.Mesh( new THREE.TubeGeometry( new THREE.CatmullRomCurve3( drlPts ), 90, 0.0068, 8, false ) );
	drl.userData.slot = 'drl';
	group.add( drl );

	/* heatsink fins on the back */
	const fins = [];
	for ( let i = 0; i < 14; i ++ ) {
		const f = new THREE.BoxGeometry( 0.004, 0.13, 0.055 );
		f.translate( -0.16 + i * 0.024, 0, -0.155 );
		fins.push( f );
	}
	const finBack = new THREE.BoxGeometry( 0.35, 0.15, 0.012 );
	finBack.translate( 0, 0, -0.13 );
	fins.push( finBack );
	group.add( mesh( mergeGeos( fins ), 'heatsink' ) );

	return {
		group,
		slots: [
			{ id: 'lens', label: 'Outer Lens', preset: 'glass-lamp', accepts: [ 'glass' ], primary: true },
			{ id: 'projector', label: 'Projector Lens', preset: 'glass-mirror', accepts: [ 'glass', 'metal' ] },
			{ id: 'reflector', label: 'Reflector Bowl', preset: 'metal-chrome', accepts: [ 'metal', 'ceramic' ] },
			{ id: 'bezel', label: 'Bezel Trim', preset: 'metal-brushed-alu', accepts: [ 'metal', 'paint' ] },
			{ id: 'housing', label: 'Housing', preset: 'comp-bumper', accepts: [ 'composite', 'paint' ] },
			{ id: 'heatsink', label: 'Heatsink', preset: 'metal-cast-alloy', accepts: [ 'metal' ] },
			{
				id: 'drl', label: 'DRL Light Guide', preset: 'glass-frosted', accepts: [ 'glass', 'ceramic' ],
				emissive: { color: '#e8f2ff', intensity: 5.5 },
			},
		],
		camera: { pos: [ 0.30, 0.20, 0.68 ], target: [ 0, 0, -0.02 ] },
		label: 'Headlamp',
	};
}

/* ================================================================== */
/*  6. EXHAUST                                                         */
/* ================================================================== */
function buildExhaust() {
	const group = new THREE.Group();

	const tipProfile = [
		[ 0.0300, -0.105 ], [ 0.0395, -0.100 ], [ 0.0430, -0.080 ],
		[ 0.0440, -0.030 ], [ 0.0448, 0.010 ], [ 0.0472, 0.030 ],
		[ 0.0488, 0.036 ], [ 0.0486, 0.042 ], [ 0.0460, 0.0435 ],
		[ 0.0432, 0.0425 ], [ 0.0422, 0.038 ], [ 0.0418, 0.010 ],
		[ 0.0410, -0.030 ], [ 0.0398, -0.075 ], [ 0.0370, -0.095 ],
		[ 0.0320, -0.100 ], [ 0.0300, -0.105 ],
	];
	const tips = [];
	for ( const s of [ -1, 1 ] ) {
		const g = lathe( tipProfile, 64 );
		g.rotateX( Math.PI / 2 );
		g.translate( s * 0.078, 0.052, 0.055 );
		tips.push( g );
	}
	group.add( mesh( mergeGeos( tips ), 'tip' ) );

	/* soot inside the tips */
	const soot = [];
	for ( const s of [ -1, 1 ] ) {
		const g = lathe( [ [ 0.0300, -0.05 ], [ 0.0400, -0.02 ], [ 0.0412, 0.02 ], [ 0.0412, 0.040 ], [ 0.0001, 0.040 ] ], 40 );
		g.rotateX( Math.PI / 2 );
		g.translate( s * 0.078, 0.052, 0.045 );
		soot.push( g );
	}
	group.add( mesh( mergeGeos( soot ), 'soot' ) );

	/* diffuser valance */
	const s = new THREE.Shape();
	s.moveTo( -0.26, -0.05 );
	s.lineTo( 0.26, -0.05 );
	s.lineTo( 0.235, 0.13 );
	s.quadraticCurveTo( 0, 0.155, -0.235, 0.13 );
	s.closePath();
	const holeL = new THREE.Path();
	holeL.absarc( -0.078, 0.052, 0.050, 0, Math.PI * 2, true );
	const holeR = new THREE.Path();
	holeR.absarc( 0.078, 0.052, 0.050, 0, Math.PI * 2, true );
	s.holes.push( holeL, holeR );
	const diff = new THREE.ExtrudeGeometry( s, {
		depth: 0.035, bevelEnabled: true, bevelSize: 0.006,
		bevelThickness: 0.006, bevelSegments: 3, curveSegments: 26,
	} );
	diff.translate( 0, 0, -0.035 );
	group.add( mesh( diff, 'diffuser' ) );

	/* diffuser fins */
	const fins = [];
	for ( const x of [ -0.19, -0.155, 0.155, 0.19 ] ) {
		const f = new THREE.BoxGeometry( 0.006, 0.14, 0.032 );
		f.translate( x, 0.03, -0.016 );
		fins.push( f );
	}
	group.add( mesh( mergeGeos( fins ), 'diffuser' ) );

	return {
		group,
		slots: [
			{ id: 'tip', label: 'Exhaust Tips', preset: 'metal-exhaust-hot', accepts: [ 'metal' ], primary: true },
			{ id: 'soot', label: 'Inner Soot', preset: 'comp-bumper', accepts: [ 'composite', 'metal' ] },
			{ id: 'diffuser', label: 'Rear Valance', preset: 'comp-carbon-twill', accepts: [ 'composite', 'paint' ] },
		],
		camera: { pos: [ 0.26, 0.18, 0.52 ], target: [ 0, 0.045, 0 ] },
		label: 'Exhaust & Valance',
	};
}

/* ================================================================== */
/*  7. SHADER BALL                                                     */
/* ================================================================== */
function buildBall() {
	const group = new THREE.Group();

	const sphere = new THREE.SphereGeometry( 0.135, 96, 64 );
	sphere.translate( 0, 0.20, 0 );
	group.add( mesh( sphere, 'main' ) );

	/* a torus to evaluate anisotropy & curvature falloff */
	const torus = new THREE.TorusGeometry( 0.075, 0.021, 28, 96 );
	torus.rotateX( Math.PI / 2 );
	torus.translate( 0.235, 0.075, 0.02 );
	group.add( mesh( torus, 'accent' ) );

	/* plinth */
	const plinth = lathe( [
		[ 0.0001, 0.000 ], [ 0.205, 0.000 ], [ 0.208, 0.006 ],
		[ 0.200, 0.020 ], [ 0.188, 0.055 ], [ 0.180, 0.064 ],
		[ 0.170, 0.066 ], [ 0.0001, 0.066 ],
	], 96 );
	group.add( mesh( plinth, 'base' ) );

	const baseRing = new THREE.TorusGeometry( 0.1845, 0.0055, 12, 96 );
	baseRing.rotateX( Math.PI / 2 );
	baseRing.translate( 0, 0.0625, 0 );
	group.add( mesh( baseRing, 'accent' ) );

	return {
		group,
		slots: [
			{ id: 'main', label: 'Sphere', preset: 'paint-silver-metallic', accepts: [ 'paint', 'metal', 'composite', 'ceramic', 'fabric', 'rubber', 'glass', 'brake' ], primary: true },
			{ id: 'accent', label: 'Torus & Ring', preset: 'metal-chrome', accepts: [ 'metal', 'paint', 'composite' ] },
			{ id: 'base', label: 'Plinth', preset: 'comp-bumper', accepts: [ 'composite', 'ceramic', 'metal' ] },
		],
		camera: { pos: [ 0.42, 0.36, 0.56 ], target: [ 0.03, 0.14, 0 ] },
		label: 'Shader Ball',
	};
}

/* ------------------------------------------------------------------ */
export const ASSET_BUILDERS = {
	panel:   buildBodyPanel,
	brake:   buildBrake,
	wheel:   buildWheel,
	seat:    buildSeat,
	lamp:    buildLamp,
	exhaust: buildExhaust,
	ball:    buildBall,
};

export const ASSET_ORDER = [ 'panel', 'brake', 'wheel', 'seat', 'lamp', 'exhaust', 'ball' ];

export function buildAsset( id ) {
	const build = ASSET_BUILDERS[ id ] || buildBall;
	const a = build();
	a.id = id;
	/* index every mesh by its slot id */
	a.slotMeshes = {};
	a.group.traverse( ( o ) => {
		if ( o.isMesh && o.userData.slot ) {
			( a.slotMeshes[ o.userData.slot ] = a.slotMeshes[ o.userData.slot ] || [] ).push( o );
		}
	} );
	return a;
}

/**
 * Headless UI smoke test (jsdom).
 *
 * Boots the real Material Library and Inspector panels against real procedural
 * material handles and drives every widget type, so DOM wiring mistakes and
 * control/value plumbing bugs are caught without a browser.
 *
 *   node tools/ui-smoke.mjs
 */

import { JSDOM } from 'jsdom';

/* ---------------- jsdom + a 2D canvas stub ---------------- */
const dom = new JSDOM( `<!doctype html><html><body>
	<div id="app"></div><div id="libraryHost"></div><div id="inspectorHost"></div>
</body></html>`, { pretendToBeVisual: true, url: 'http://localhost/' } );

const { window } = dom;
global.window = window;
global.document = window.document;
try { Object.defineProperty( global, 'navigator', { value: window.navigator, configurable: true } ); } catch ( e ) { /* node >=21 ships a read-only navigator */ }
global.HTMLElement = window.HTMLElement;
global.Element = window.Element;
global.Node = window.Node;
global.Event = window.Event;
global.MouseEvent = window.MouseEvent;
global.getComputedStyle = window.getComputedStyle;
global.requestAnimationFrame = ( cb ) => setTimeout( () => cb( Date.now() ), 0 );
global.cancelAnimationFrame = ( id ) => clearTimeout( id );
global.localStorage = window.localStorage;

/* jsdom has no 2D canvas without node-canvas; give renderSwatch a recorder */
const makeCtx = ( w, h ) => ( {
	canvas: { width: w, height: h },
	createImageData: ( ww, hh ) => ( { width: ww, height: hh, data: new Uint8ClampedArray( ww * hh * 4 ) } ),
	getImageData: ( x, y, ww, hh ) => ( { width: ww, height: hh, data: new Uint8ClampedArray( ww * hh * 4 ) } ),
	putImageData() {},
	createLinearGradient: () => ( { addColorStop() {} } ),
	createRadialGradient: () => ( { addColorStop() {} } ),
	beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, arc() {}, arcTo() {},
	rect() {}, fill() {}, stroke() {}, fillRect() {}, clearRect() {}, save() {}, restore() {},
	translate() {}, scale() {}, rotate() {}, drawImage() {}, fillText() {}, measureText: () => ( { width: 8 } ),
} );
window.HTMLCanvasElement.prototype.getContext = function () {
	this.width = this.width || 88;
	this.height = this.height || 88;
	return makeCtx( this.width, this.height );
};

let fails = 0;
const ok = ( m ) => console.log( '  ✓ ' + m );
const bad = ( m ) => { fails ++; console.log( '  ✗ ' + m ); };
const check = ( cond, m ) => ( cond ? ok( m ) : bad( m ) );

/* ---------------- the real modules ---------------- */
const { LibraryPanel } = await import( '../src/ui/library.js' );
const { InspectorPanel } = await import( '../src/ui/inspector.js' );
const { slider, colorWell, toggle, selectCtl } = await import( '../src/ui/controls.js' );
const { h, icon, initTooltip, toast, fmt } = await import( '../src/ui/dom.js' );
const { renderSwatch } = await import( '../src/ui/swatch.js' );
const { createProceduralMaterial } = await import( '../src/shaders/createMaterial.js' );
const { MATERIAL_LIBRARY, CATEGORIES } = await import( '../src/core/library.js' );
const { FAMILY_SCHEMAS, schemaDefaults } = await import( '../src/core/schema.js' );
const { buildGlslSource, highlightGLSL } = await import( '../src/core/glslPreview.js' );

console.log( '\n── dom helpers ────────────────────────────────────────' );
{
	const el = h( 'div', { class: 'x', data: { id: 'q' } }, h( 'span', { text: 'hi' } ), null, false, 'tail' );
	check( el.className === 'x' && el.dataset.id === 'q', 'h() sets class + data' );
	check( el.children.length === 1 && el.textContent === 'hitail', 'h() skips null/false and appends text' );
	check( icon( 'chev' ).querySelector( 'svg path' ) !== null, 'icon() emits an svg path' );
	check( icon( 'nope' ).tagName === 'SPAN', 'icon() tolerates an unknown name' );
	check( fmt( 1.2345, 0.01 ) === '1.23' && fmt( 5, 1 ) === '5', 'fmt() respects the step' );
	initTooltip();
	check( document.getElementById( 'tip' ) !== null, 'tooltip host mounted' );
	toast( 'hello' );
	check( document.querySelectorAll( '.toast' ).length === 1, 'toast rendered' );
}

console.log( '\n── widgets ────────────────────────────────────────────' );
{
	const param = { type: 'slider', key: 'k', label: 'K', min: 0, max: 100, step: 0.5, default: 40, hint: 'h' };
	let last = null;
	const ctl = slider( param, 40, { onInput: ( v ) => { last = v; } } );
	const track = ctl.el.querySelector( '.ctl-track' );
	check( !! track, 'slider renders a track' );
	/* stub geometry so pointer maths resolves */
	track.getBoundingClientRect = () => ( { left: 0, width: 100, top: 0, height: 14, right: 100, bottom: 14 } );
	track.dispatchEvent( new window.MouseEvent( 'pointerdown', { clientX: 75, bubbles: true } ) );
	check( last !== null && Math.abs( last - 75 ) < 1, `drag sets the value from x (got ${last})` );
	ctl.set( 12 );
	check( ctl.get() === 12, 'set()/get() round-trip' );
	ctl.set( 9999 );
	check( ctl.get() === 100, 'set() clamps to max' );
	const vi = ctl.el.querySelector( '.ctl-value' );
	vi.value = '33';
	vi.dispatchEvent( new window.Event( 'change', { bubbles: true } ) );
	check( ctl.get() === 33, 'typing into the readout applies' );
	check( ctl.el.querySelector( '.ctl-fill' ).style.width === '33%', 'fill width tracks the value' );

	const cw = colorWell( { key: 'c', label: 'C' }, '#ff7a2f', { onInput: ( v ) => { last = v; } } );
	const inp = cw.el.querySelector( 'input[type=color]' );
	inp.value = '#123456';
	inp.dispatchEvent( new window.Event( 'input', { bubbles: true } ) );
	check( last === '#123456', 'colour well reports changes' );
	check( cw.el.querySelector( '.hexval' ).textContent === '#123456', 'colour well shows the hex' );

	let tog = null;
	const tg = toggle( { key: 't', label: 'T' }, false, { onInput: ( v ) => { tog = v; } } );
	tg.el.querySelector( '.switch' ).dispatchEvent( new window.MouseEvent( 'click', { bubbles: true } ) );
	check( tog === true && tg.get() === true, 'toggle flips' );

	let sel = null;
	const sc = selectCtl( { key: 's', label: 'S', options: [ { id: 'a', label: 'A' }, { id: 'b', label: 'B' } ] }, 'a',
		{ onInput: ( v ) => { sel = v; } } );
	const s = sc.el.querySelector( 'select' );
	s.value = 'b';
	s.dispatchEvent( new window.Event( 'change', { bubbles: true } ) );
	check( sel === 'b', 'select reports changes' );
}

console.log( '\n── swatches ───────────────────────────────────────────'
);
{
	let rendered = 0;
	const t0 = Date.now();
	for ( const p of MATERIAL_LIBRARY ) {
		const cvs = document.createElement( 'canvas' );
		cvs.width = 88; cvs.height = 88;
		try { renderSwatch( cvs, p ); rendered ++; } catch ( e ) { bad( `swatch ${p.id}: ${e.message}` ); }
	}
	const dt = Date.now() - t0;
	check( rendered === MATERIAL_LIBRARY.length, `${rendered}/${MATERIAL_LIBRARY.length} swatches rendered` );
	check( dt < 8000, `all swatches in ${dt} ms (budget 8000)` );
}

console.log( '\n── material library panel ─────────────────────────────' );
let applied = null;
const lib = new LibraryPanel( { onApply: ( p ) => { applied = p; }, onRequestSave: () => {} } );
document.getElementById( 'libraryHost' ).replaceWith( lib.root );
{
	check( lib.root.classList.contains( 'panel-left' ), 'root has the left-panel class' );
	const items = lib.root.querySelectorAll( '.mat-item' );
	check( items.length === MATERIAL_LIBRARY.length, `${items.length} library rows rendered` );
	check( lib.root.querySelectorAll( '.lib-group' ).length === CATEGORIES.length,
		`${CATEGORIES.length} category groups rendered` );
	check( lib.root.querySelectorAll( '.chip' ).length === CATEGORIES.length + 1, 'category chips rendered' );

	/* click applies */
	items[ 0 ].dispatchEvent( new window.MouseEvent( 'click', { bubbles: true } ) );
	check( applied && applied.id === items[ 0 ].dataset.id, 'clicking a row fires onApply' );
	check( items[ 0 ].classList.contains( 'sel' ), 'clicked row is selected' );

	/* category filter */
	lib.root.querySelectorAll( '.chip' )[ 2 ].dispatchEvent( new window.MouseEvent( 'click', { bubbles: true } ) );
	const filtered = lib.root.querySelectorAll( '.mat-item' ).length;
	check( filtered > 0 && filtered < MATERIAL_LIBRARY.length, `category filter narrows to ${filtered} rows` );
	lib.root.querySelectorAll( '.chip' )[ 0 ].dispatchEvent( new window.MouseEvent( 'click', { bubbles: true } ) );
	check( lib.root.querySelectorAll( '.mat-item' ).length === MATERIAL_LIBRARY.length, 'All chip restores the list' );

	/* search */
	lib.searchInput.value = 'carbon';
	lib.searchInput.dispatchEvent( new window.Event( 'input', { bubbles: true } ) );
	await new Promise( ( r ) => setTimeout( r, 180 ) );
	const hits = lib.root.querySelectorAll( '.mat-item' ).length;
	check( hits > 0 && hits < 8, `search "carbon" -> ${hits} rows` );
	lib.searchInput.value = '';
	lib.searchInput.dispatchEvent( new window.Event( 'input', { bubbles: true } ) );
	await new Promise( ( r ) => setTimeout( r, 180 ) );

	/* collapse a group */
	const head = lib.root.querySelector( '.lib-group-head' );
	head.dispatchEvent( new window.MouseEvent( 'click', { bubbles: true } ) );
	check( lib.root.querySelector( '.lib-group' ).classList.contains( 'collapsed' ), 'group collapses' );
	head.dispatchEvent( new window.MouseEvent( 'click', { bubbles: true } ) );

	/* custom preset round trip */
	lib.addCustom( {
		id: 'custom-test', name: 'Test Custom', family: 'paint',
		category: 'custom', notes: '', values: schemaDefaults( 'paint' ),
	} );
	check( lib.root.textContent.includes( 'Test Custom' ), 'custom preset appears in the list' );
	check( JSON.parse( localStorage.getItem( 'frontier.customMaterials.v1' ) ).length === 1, 'custom preset persisted' );
	lib.removeCustom( 'custom-test' );
	check( ! lib.root.textContent.includes( 'Test Custom' ), 'custom preset removed' );

	lib.setApplied( 'paint', 'paint-silver-metallic' );
	check( lib.root.querySelectorAll( '.mat-item.applied' ).length === 1, 'applied preset is marked' );
}

console.log( '\n── inspector panel ────────────────────────────────────' );
const paramEvents = [];
const insp = new InspectorPanel( {
	onParam: ( k, v, live ) => paramEvents.push( { k, v, live } ),
	onSave: () => {}, onReset: () => {}, onCopyJson: () => {}, onShowCode: () => {},
	onSlotChange: () => {},
} );
document.getElementById( 'inspectorHost' ).replaceWith( insp.root );
{
	const slots = [
		{ id: 'a', label: 'Part A', accepts: [ 'paint' ] },
		{ id: 'b', label: 'Part B', accepts: [ 'metal' ] },
	];
	for ( const family of Object.keys( FAMILY_SCHEMAS ) ) {
		const handle = createProceduralMaterial( family, schemaDefaults( family ) );
		const preset = MATERIAL_LIBRARY.find( ( p ) => p.family === family );
		paramEvents.length = 0;
		insp.setSlots( slots, 'a' );
		insp.setContext( { assetLabel: 'Test Asset', slot: slots[ 0 ], handle, preset } );

		const heroes = FAMILY_SCHEMAS[ family ].params.filter( ( p ) => p.hero ).length;
		const ctrls = insp.root.querySelectorAll( '.hero-grid .ctl' ).length;
		if ( ctrls !== heroes ) bad( `${family}: ${ctrls} hero controls but schema declares ${heroes}` );

		const secs = insp.root.querySelectorAll( '.sec' ).length;
		const total = insp.root.querySelectorAll( '.ctl' ).length;
		const expected = FAMILY_SCHEMAS[ family ].params.length;
		if ( total !== expected ) bad( `${family}: ${total} controls rendered, schema has ${expected}` );
		if ( secs < 2 ) bad( `${family}: only ${secs} sections` );

		/* drive every slider through its range and confirm the handle follows */
		let driven = 0;
		for ( const p of FAMILY_SCHEMAS[ family ].params ) {
			const ctl = insp.controls[ p.key ];
			if ( ! ctl ) { bad( `${family}.${p.key}: no control` ); continue; }
			if ( p.type === 'slider' ) {
				ctl.set( p.max );
				const u = handle.uniforms[ 'frk' + p.key.charAt( 0 ).toUpperCase() + p.key.slice( 1 ) ];
				if ( Math.abs( u.value - p.max ) > 1e-6 ) bad( `${family}.${p.key}: max did not reach the uniform (${u.value})` );
				ctl.set( p.min );
				if ( Math.abs( u.value - p.min ) > 1e-6 ) bad( `${family}.${p.key}: min did not reach the uniform` );
				driven ++;
			} else if ( p.type === 'color' ) {
				ctl.set( '#0a1b2c' );
				driven ++;
			} else if ( p.type === 'select' ) {
				for ( const o of p.options ) {
					ctl.el.querySelector( 'select' ).value = o.id;
					ctl.el.querySelector( 'select' ).dispatchEvent( new window.Event( 'change', { bubbles: true } ) );
				}
				driven ++;
			}
		}
		if ( paramEvents.length === 0 ) bad( `${family}: no onParam events fired` );
		const readout = insp.readout.textContent;
		if ( readout.length < 20 ) bad( `${family}: readout is empty` );
		ok( `${family.padEnd( 10 )} ${String( total ).padStart( 2 )} controls in ${secs} sections, ${driven} driven, readout ${readout.length} chars` );

		/* section collapse + reset sync */
		insp.root.querySelector( '.sec-head' ).dispatchEvent( new window.MouseEvent( 'click', { bubbles: true } ) );
		if ( ! insp.root.querySelector( '.sec' ).classList.contains( 'collapsed' ) ) bad( `${family}: section did not collapse` );
		insp.syncValues( schemaDefaults( family ) );
		if ( insp.modified ) bad( `${family}: syncValues did not clear the modified flag` );
		handle.material.dispose();
	}

	/* the three headline controls the brief asked for */
	const paintHandle = createProceduralMaterial( 'paint', schemaDefaults( 'paint' ) );
	insp.setContext( { assetLabel: 'Body Panel', slot: slots[ 0 ], handle: paintHandle, preset: PRESET( 'paint-silver-metallic' ) } );
	const heroLabels = [ ...insp.heroGrid.querySelectorAll( '.ctl-label' ) ].map( ( e ) => e.textContent.replace( /[^A-Za-z ]/g, '' ).trim() );
	check( heroLabels.some( ( l ) => /Roughness/.test( l ) ), 'hero: Roughness slider present' );
	check( heroLabels.some( ( l ) => /Flake Density/.test( l ) ), 'hero: Flake Density slider present' );
	check( heroLabels.some( ( l ) => /Paint Depth/.test( l ) ), 'hero: Paint Depth slider present' );
	check( typeof buildGlslSource( paintHandle ) === 'string', 'glsl preview builds for the live handle' );
	check( highlightGLSL( 'uniform vec3 frkBaseColor;' ).includes( 'frkBaseColor' ), 'highlighter keeps identifiers' );
	paintHandle.material.dispose();
}

function PRESET( id ) { return MATERIAL_LIBRARY.find( ( p ) => p.id === id ); }

console.log( fails ? `\n${fails} UI PROBLEM(S)\n` : '\nall UI smoke tests passed\n' );
process.exit( fails ? 1 : 0 );

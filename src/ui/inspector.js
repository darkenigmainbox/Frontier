/**
 * FRONTIER — Inspector panel (right)
 *
 * Auto-generates its controls from the active material family's schema. The
 * three headline controls the brief asked for — Flake Density, Roughness and
 * Paint Depth — are promoted into a pinned "hero" block at the top.
 */

import { h, icon } from './dom.js';
import { slider, colorWell, toggle, selectCtl } from './controls.js';
import { FAMILY_SCHEMAS, GROUPS } from '../core/schema.js';

const COLLAPSE_KEY = 'frontier.inspector.collapsed.v1';

export class InspectorPanel {
	constructor( { onParam, onSave, onReset, onCopyJson, onShowCode, onSlotChange } ) {
		this.cb = { onParam, onSave, onReset, onCopyJson, onShowCode, onSlotChange };
		this.controls = {};
		this.family = null;
		this.preset = null;
		this.modified = false;
		this.collapsed = new Set( JSON.parse( localStorage.getItem( COLLAPSE_KEY ) || '[]' ) );

		this.root = h( 'div', { class: 'panel panel-right' } );

		this.root.append(
			h( 'div', { class: 'panel-head' },
				h( 'span', { class: 'panel-title', text: 'Inspector' } ),
				h( 'span', { class: 'panel-count u-mono', text: 'shader' } ),
				h( 'button', {
					class: 'btn ghost icon', type: 'button',
					'data-tip': 'Reset every parameter to the preset defaults', 'data-tip-title': 'Reset',
					onClick: () => this.cb.onReset && this.cb.onReset(),
				}, icon( 'reset' ) )
			)
		);

		/* hero */
		this.swatch = h( 'span', { class: 'sw' } );
		this.matName = h( 'span', { text: '—' } );
		this.pathEl = h( 'div', { class: 'insp-path' } );
		this.slotSelect = h( 'select', { class: 'sel' } );
		this.slotSelect.addEventListener( 'change', () => this.cb.onSlotChange && this.cb.onSlotChange( this.slotSelect.value ) );
		this.heroGrid = h( 'div', { class: 'hero-grid' } );
		this.heroHead = h( 'div', { class: 'eyebrow', style: { marginBottom: '2px', color: 'var(--text-3)' }, text: 'Primary Controls' } );
		this.readout = h( 'div', { class: 'u-mono u-tiny', style: { color: 'var(--text-4)', marginTop: '8px', lineHeight: '1.6' } } );

		this.root.append(
			h( 'div', { class: 'insp-hero' },
				h( 'div', { class: 'insp-matname' }, this.swatch, this.matName ),
				this.pathEl,
				h( 'div', { class: 'slot-row' }, h( 'label', { text: 'Part' } ), this.slotSelect ),
				this.heroHead,
				this.heroGrid,
				this.readout
			)
		);

		this.body = h( 'div', { class: 'panel-body' } );
		this.root.append( this.body );

		this.root.append(
			h( 'div', { class: 'insp-foot' },
				h( 'button', { class: 'btn', type: 'button', onClick: () => this.cb.onSave && this.cb.onSave() }, icon( 'save' ), 'Save preset' ),
				h( 'button', { class: 'btn', type: 'button', onClick: () => this.cb.onCopyJson && this.cb.onCopyJson() }, icon( 'copy' ), 'JSON' ),
				h( 'button', { class: 'btn', type: 'button', onClick: () => this.cb.onShowCode && this.cb.onShowCode() }, icon( 'code' ), 'GLSL' ),
				h( 'span', { style: { flex: '1 1 auto' } } ),
				h( 'button', {
					class: 'btn ghost icon', type: 'button',
					'data-tip': 'Collapse / expand every section', 'data-tip-title': 'Toggle sections',
					onClick: () => this._toggleAll(),
				}, icon( 'layers' ) )
			)
		);
	}

	_toggleAll() {
		const secs = [ ...this.body.querySelectorAll( '.sec' ) ];
		const anyOpen = secs.some( ( s ) => ! s.classList.contains( 'collapsed' ) );
		secs.forEach( ( s ) => s.classList.toggle( 'collapsed', anyOpen ) );
		this.collapsed = anyOpen ? new Set( secs.map( ( s ) => s.dataset.group ) ) : new Set();
		localStorage.setItem( COLLAPSE_KEY, JSON.stringify( [ ...this.collapsed ] ) );
	}

	setSlots( slots, activeSlot ) {
		const cur = this.slotSelect.value;
		this.slotSelect.innerHTML = '';
		for ( const s of slots ) this.slotSelect.append( h( 'option', { value: s.id, text: s.label } ) );
		this.slotSelect.value = slots.some( ( s ) => s.id === activeSlot ) ? activeSlot : cur;
	}

	/** Rebuild the whole inspector for a material handle. */
	setContext( ctx ) {
		const { assetLabel, slot, handle, preset } = ctx;
		this.handle = handle;
		this.preset = preset;
		this.assetLabel = assetLabel;
		this.slot = slot;
		this.modified = false;

		const sch = FAMILY_SCHEMAS[ handle.family ];
		this.family = handle.family;

		this.matName.textContent = ( preset && preset.name ) || sch.label;
		this.swatch.style.background = this._baseSwatchColor( handle.values );

		this.pathEl.innerHTML = '';
		this.pathEl.append(
			h( 'span', { text: assetLabel } ),
			h( 'span', { class: 'sep', text: '/' } ),
			h( 'span', { text: slot ? slot.label : '—' } ),
			h( 'span', { class: 'sep', text: '·' } ),
			h( 'span', { class: 'model', text: `${sch.label} · ${sch.model}` } )
		);

		this.controls = {};
		this.heroGrid.innerHTML = '';
		this.body.innerHTML = '';

		const heroes = sch.params.filter( ( p ) => p.hero );
		const rest = sch.params.filter( ( p ) => ! p.hero );

		for ( const p of heroes ) this.heroGrid.append( this._control( p, handle.values[ p.key ], true ) );

		/* group the remaining params, preserving schema order */
		const order = [];
		const byGroup = new Map();
		for ( const p of rest ) {
			if ( ! byGroup.has( p.group ) ) { byGroup.set( p.group, [] ); order.push( p.group ); }
			byGroup.get( p.group ).push( p );
		}
		for ( const g of order ) this.body.append( this._section( g, byGroup.get( g ) ) );

		this._updateReadout();
	}

	_baseSwatchColor( values ) {
		const c = values.baseColor || values.glazeColor || values.fiberColor || values.tintColor
			|| values.fiberColor || values.alloyColor || '#888888';
		return c;
	}

	_section( group, params ) {
		const collapsed = this.collapsed.has( group );
		const bodyEl = h( 'div', { class: 'sec-body' } );
		for ( const p of params ) bodyEl.append( this._control( p, this.handle.values[ p.key ], false ) );
		const el = h( 'div', { class: `sec${collapsed ? ' collapsed' : ''}`, data: { group } } );
		const head = h( 'button', { class: 'sec-head', type: 'button' },
			h( 'span', { class: 'chev', html: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>` } ),
			h( 'span', { class: 'name', text: GROUPS[ group ] || group } ),
			h( 'span', { class: 'badge', text: String( params.length ) } )
		);
		head.addEventListener( 'click', () => {
			el.classList.toggle( 'collapsed' );
			if ( el.classList.contains( 'collapsed' ) ) this.collapsed.add( group ); else this.collapsed.delete( group );
			localStorage.setItem( COLLAPSE_KEY, JSON.stringify( [ ...this.collapsed ] ) );
		} );
		el.append( head, bodyEl );
		return el;
	}

	_control( p, value, isHero ) {
		const apply = ( v, live ) => {
			this.handle.set( p.key, v );
			this.modified = true;
			if ( ! isHero ) this.matName.textContent = ( ( this.preset && this.preset.name ) || 'Custom' ) + ' *';
			this._updateReadout();
			this.cb.onParam && this.cb.onParam( p.key, v, live === true );
		};

		let ctl;
		const param = isHero ? { ...p, hero: true } : p;
		if ( p.type === 'slider' ) ctl = slider( param, value, { onInput: ( v ) => apply( v, true ), onCommit: ( v ) => apply( v, false ) } );
		else if ( p.type === 'color' ) ctl = colorWell( param, value, { onInput: ( v ) => apply( v, true ) } );
		else if ( p.type === 'toggle' ) ctl = toggle( param, value, { onInput: ( v ) => apply( v, false ) } );
		else if ( p.type === 'select' ) ctl = selectCtl( param, value, { onInput: ( v ) => apply( v, false ) } );
		else return h( 'div' );

		this.controls[ p.key ] = ctl;
		return ctl.el;
	}

	/** Called after an external change (preset applied / reset). */
	syncValues( values ) {
		this.modified = false;
		this.matName.textContent = ( this.preset && this.preset.name ) || ( FAMILY_SCHEMAS[ this.family ] || {} ).label || '—';
		this.swatch.style.background = this._baseSwatchColor( values );
		/* silent: pushing values back into the widgets must not look like an edit */
		for ( const k in this.controls ) if ( values[ k ] !== undefined ) this.controls[ k ].set( values[ k ], true );
		this._updateReadout();
	}

	_updateReadout() {
		if ( ! this.handle ) return;
		const v = this.handle.values;
		const f = this.handle.family;
		const lines = [];

		if ( f === 'paint' ) {
			const dens = 0.4 + Math.pow( Math.min( 1, Math.max( 0, v.flakeDensity / 100 ) ), 1.55 ) * 62;
			const cellsPerM = dens * 11 * ( v.worldScale || 1 );
			const flakeUm = cellsPerM > 0 ? Math.round( 1e6 / cellsPerM ) : Infinity;
			lines.push( `film build   ${Math.round( v.paintDepth )} µm  ·  clear ${Math.round( ( v.paintDepth || 0 ) * 0.55 )} µm` );
			lines.push( `flake        ${Number.isFinite( flakeUm ) ? flakeUm + ' µm' : '—'}  ·  ${Math.round( cellsPerM ).toLocaleString() } /m` );
			lines.push( `coat F0      ${( ( v.coatIOR - 1 ) / ( v.coatIOR + 1 ) ) ** 2 }  ·  IOR ${v.coatIOR.toFixed( 2 )}` );
		} else if ( f === 'brake' ) {
			const gd = 180 + v.grooveDensity * 24;
			lines.push( `turning      ${( 1000 / gd ).toFixed( 3 )} mm pitch  ·  ${Math.round( gd )} grooves/m` );
			lines.push( `disc Ø       ${( v.discRadius * 2 * 1000 ).toFixed( 0 )} mm  ·  ${v.discType}` );
			if ( v.heat > 0.02 ) lines.push( `temp         ≈ ${Math.round( 200 + v.heat * 700 )} °C` );
		} else if ( f === 'glass' ) {
			lines.push( `pane         ${( v.thickness * 1000 ).toFixed( 2 )} mm  ·  n ${v.ior.toFixed( 3 )}` );
			lines.push( `absorption   ${( v.absorption ).toFixed( 2 )} /m  ·  coat ${Math.round( v.coatThickness )} nm` );
		} else if ( f === 'fabric' ) {
			lines.push( `yarn pitch   ${( 1000 / v.weaveScale ).toFixed( 2 )} mm  ·  ${Math.round( v.weaveScale )}/m` );
			lines.push( `weave        ${v.weave}  ·  nap ${Math.round( v.napAngle )}°` );
		} else if ( f === 'rubber' ) {
			lines.push( `block pitch  ${( 1000 / v.treadScale ).toFixed( 1 )} mm  ·  micro ${( 1000 / v.microScale ).toFixed( 2 )} mm` );
		} else if ( f === 'metal' ) {
			lines.push( `finish       ${v.finish}  ·  anisotropy ${v.aniso.toFixed( 2 )}` );
			lines.push( `grain        ${( 1000 / v.brushScale ).toFixed( 3 )} mm @ ${Math.round( v.brushAngle )}°` );
		} else if ( f === 'composite' ) {
			lines.push( `tow pitch    ${( 1000 / v.weaveScale ).toFixed( 2 )} mm  ·  ${v.layup}` );
			lines.push( `clear coat   ${Math.round( v.coatStrength * 100 )}%  ·  peel ${Math.round( v.orangePeel * 100 )}%` );
		} else if ( f === 'ceramic' ) {
			lines.push( `glaze IOR    ${v.coatIOR.toFixed( 2 )}  ·  wall ${( v.thickness * 1000 ).toFixed( 1 )} mm` );
			lines.push( `speckle      ${( 1000 / v.speckleScale ).toFixed( 2 )} mm  ·  crazing ${Math.round( v.crazing * 100 )}%` );
		}
		lines.push( `projection   ${v.projection || 'surface'}  ·  scale ${( v.worldScale || 1 ).toFixed( 2 )}` );

		this.readout.innerHTML = '';
		for ( const l of lines ) this.readout.append( h( 'div', { text: l } ) );
	}

	values() { return this.handle ? { ...this.handle.values } : {}; }
}

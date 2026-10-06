/**
 * FRONTIER — Material Library panel (left)
 */

import { h, icon, toast } from './dom.js';
import { renderSwatch } from './swatch.js';
import { CATEGORIES, MATERIAL_LIBRARY, PRESET_BY_ID } from '../core/library.js';
import { FAMILY_SCHEMAS } from '../core/schema.js';

const LS_KEY = 'frontier.customMaterials.v1';

export function loadCustom() {
	try {
		const raw = localStorage.getItem( LS_KEY );
		return raw ? JSON.parse( raw ) : [];
	} catch ( e ) { return []; }
}
export function saveCustom( list ) {
	try { localStorage.setItem( LS_KEY, JSON.stringify( list ) ); } catch ( e ) { /* private mode */ }
}

export class LibraryPanel {
	constructor( { onApply, onRequestSave } ) {
		this.onApply = onApply;
		this.onRequestSave = onRequestSave;
		this.custom = loadCustom();
		this.query = '';
		this.cat = 'all';
		this.collapsed = new Set();
		this.selectedId = null;
		this.appliedBySlot = {};
		this.activeSlot = null;
		this._swatchCache = new Map();     /* presetId -> canvas (reused across re-renders) */
		this._swatchQueue = [];            /* [canvas, preset] awaiting a render slot       */
		this._pumpSwatches();

		this.root = h( 'div', { class: 'panel panel-left' } );

		/* head */
		this.countEl = h( 'span', { class: 'panel-count u-mono' } );
		this.root.append(
			h( 'div', { class: 'panel-head' },
				h( 'span', { class: 'panel-title', text: 'Material Library' } ),
				this.countEl,
				h( 'button', {
					class: 'btn ghost icon', type: 'button',
					'data-tip': 'Save the current inspector settings as a new library preset',
					'data-tip-title': 'New preset',
					onClick: () => this.onRequestSave && this.onRequestSave(),
				}, icon( 'plus' ) )
			)
		);

		/* search + category chips */
		this.searchInput = h( 'input', {
			class: 'txt', type: 'search', placeholder: 'Search 40+ materials…', spellcheck: 'false',
		} );
		this.searchWrap = h( 'div', { class: 'search-wrap' },
			h( 'span', { html: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.4 15.4L20 20"/></svg>` } ),
			this.searchInput,
			h( 'button', {
				class: 'search-clear', type: 'button', 'aria-label': 'Clear search',
				onClick: () => { this.searchInput.value = ''; this.query = ''; this._render(); },
			}, '×' )
		);
		let searchTimer = 0;
		this.searchInput.addEventListener( 'input', () => {
			this.searchWrap.classList.toggle( 'has-value', !!this.searchInput.value );
			clearTimeout( searchTimer );
			searchTimer = setTimeout( () => {
				this.query = this.searchInput.value.trim().toLowerCase();
				this._render();
			}, 110 );
		} );

		this.chips = h( 'div', { class: 'chips' } );
		const allChip = h( 'button', { class: 'chip on', type: 'button', text: 'All' } );
		allChip.addEventListener( 'click', () => this._setCat( 'all', allChip ) );
		this.chips.append( allChip );
		this._catChips = [ allChip ];
		for ( const c of CATEGORIES ) {
			const chip = h( 'button', { class: 'chip', type: 'button', text: c.label } );
			chip.addEventListener( 'click', () => this._setCat( c.id, chip ) );
			this.chips.append( chip );
			this._catChips.push( chip );
		}

		this.root.append( h( 'div', { class: 'lib-search' }, this.searchWrap, this.chips ) );

		/* list */
		this.body = h( 'div', { class: 'panel-body' } );
		this.root.append( this.body );

		/* note */
		this.note = h( 'div', { class: 'lib-note' } );
		this.root.append( this.note );

		/* foot */
		this.root.append(
			h( 'div', { class: 'lib-foot' },
				h( 'span', { class: 'u-tiny u-muted', style: { flex: '1 1 auto' }, text: 'Click a part in the viewport, then a material.' } ),
				h( 'button', {
					class: 'btn', type: 'button',
					onClick: () => { this.custom = []; saveCustom( this.custom ); this._render(); toast( 'Custom presets cleared', 'ok' ); },
				}, icon( 'trash' ), 'Clear custom' )
			)
		);

		this._render();
		this._setNote( null );
	}

	_setCat( id, chip ) {
		this.cat = id;
		this._catChips.forEach( ( c ) => c.classList.remove( 'on' ) );
		chip.classList.add( 'on' );
		this._render();
	}

	allPresets() {
		return MATERIAL_LIBRARY.concat( this.custom.map( ( c ) => ( { ...c, category: 'custom' } ) ) );
	}

	addCustom( preset ) {
		this.custom.push( preset );
		saveCustom( this.custom );
		this._render();
		this._invalidateSwatch( preset.id );
	}

	removeCustom( id ) {
		this.custom = this.custom.filter( ( c ) => c.id !== id );
		saveCustom( this.custom );
		this._render();
	}

	_invalidateSwatch( id ) {
		this._swatchCache.delete( id );
		this._swatchQueue = this._swatchQueue.filter( ( j ) => j[ 1 ].id !== id );
	}

	/* Swatches are real mini PBR renders, so they are queued and drawn a few per
	   frame instead of 41 at once on every keystroke. */
	_pumpSwatches() {
		const step = () => {
			let n = 0;
			while ( this._swatchQueue.length && n < 3 ) {
				const [ cvs, preset ] = this._swatchQueue.shift();
				try { renderSwatch( cvs, preset ); } catch ( e ) { console.warn( 'swatch', preset.id, e ); }
				n ++;
			}
			if ( this._swatchQueue.length ) requestAnimationFrame( step );
			else this._pumping = false;
		};
		if ( ! this._pumping && this._swatchQueue.length ) {
			this._pumping = true;
			requestAnimationFrame( step );
		}
	}

	/** Mark which preset is live on which slot. */
	setApplied( slotId, presetId ) {
		this.appliedBySlot[ slotId ] = presetId;
		this.body.querySelectorAll( '.mat-item' ).forEach( ( el ) => {
			const on = Object.values( this.appliedBySlot ).includes( el.dataset.id );
			el.classList.toggle( 'applied', on );
		} );
	}

	select( presetId ) {
		this.selectedId = presetId;
		this.body.querySelectorAll( '.mat-item' ).forEach( ( el ) =>
			el.classList.toggle( 'sel', el.dataset.id === presetId ) );
		const p = PRESET_BY_ID.get( presetId ) || this.custom.find( ( c ) => c.id === presetId );
		this._setNote( p );
	}

	refreshSwatch( presetId, values ) {
		const cvs = this._swatchCache.get( presetId );
		if ( ! cvs ) return;
		const p = PRESET_BY_ID.get( presetId ) || this.custom.find( ( c ) => c.id === presetId );
		if ( ! p ) return;
		/* a swatch is a real mini render, so coalesce drag events into one frame */
		this._livePending = { cvs, preset: { ...p, values: { ...p.values, ...values } } };
		if ( this._liveRaf ) return;
		this._liveRaf = requestAnimationFrame( () => {
			this._liveRaf = 0;
			const job = this._livePending;
			this._livePending = null;
			if ( job ) { try { renderSwatch( job.cvs, job.preset ); } catch ( e ) { /* ignore */ } }
		} );
	}

	_setNote( p ) {
		this.note.innerHTML = '';
		if ( ! p ) {
			this.note.append( h( 'b', { text: 'Frontier' } ), document.createTextNode(
				' — every material here is generated procedurally on the GPU. No textures, no bitmaps, no baked lookups.'
			) );
			return;
		}
		const fam = FAMILY_SCHEMAS[ p.family ];
		this.note.append(
			h( 'b', { text: p.name } ),
			document.createTextNode( p.notes || `${fam.label} · ${fam.model}` )
		);
	}

	_render() {
		this.body.innerHTML = '';
		const all = this.allPresets();
		const q = this.query;
		const filtered = all.filter( ( p ) => {
			if ( this.cat !== 'all' && p.category !== this.cat ) return false;
			if ( ! q ) return true;
			const hay = `${p.name} ${p.family} ${p.notes || ''} ${( p.tags || [] ).join( ' ' )}`.toLowerCase();
			return hay.includes( q );
		} );

		this.countEl.textContent = `${filtered.length}`;

		if ( ! filtered.length ) {
			this.body.append( h( 'div', { class: 'lib-empty', text: 'No materials match that search.' } ) );
			return;
		}

		const groups = new Map();
		for ( const p of filtered ) {
			if ( ! groups.has( p.category ) ) groups.set( p.category, [] );
			groups.get( p.category ).push( p );
		}

		const catLabel = ( id ) => {
			if ( id === 'custom' ) return 'Custom';
			const c = CATEGORIES.find( ( x ) => x.id === id );
			return c ? c.label : id;
		};

		for ( const [ cat, items ] of groups ) {
			const isCollapsed = this.collapsed.has( cat );
			const itemsEl = h( 'div', { class: 'lib-items' } );
			const groupEl = h( 'div', { class: `lib-group${isCollapsed ? ' collapsed' : ''}` } );
			const head = h( 'div', { class: 'lib-group-head' },
				h( 'span', { class: 'chev', html: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>` } ),
				h( 'span', { class: 'name', text: catLabel( cat ) } ),
				h( 'span', { class: 'n', text: String( items.length ) } )
			);
			head.addEventListener( 'click', () => {
				if ( this.collapsed.has( cat ) ) this.collapsed.delete( cat ); else this.collapsed.add( cat );
				groupEl.classList.toggle( 'collapsed' );
			} );
			groupEl.append( head, itemsEl );

			for ( const p of items ) itemsEl.append( this._item( p, cat === 'custom' ) );
			this.body.append( groupEl );
		}

		/* re-apply state classes */
		this.body.querySelectorAll( '.mat-item' ).forEach( ( el ) => {
			if ( el.dataset.id === this.selectedId ) el.classList.add( 'sel' );
			if ( Object.values( this.appliedBySlot ).includes( el.dataset.id ) ) el.classList.add( 'applied' );
		} );
	}

	_item( p, isCustom ) {
		let cvs = this._swatchCache.get( p.id );
		if ( ! cvs ) {
			cvs = h( 'canvas', { width: 88, height: 88 } );
			this._swatchCache.set( p.id, cvs );
			this._swatchQueue.push( [ cvs, p ] );
			this._pumpSwatches();
		}

		const fam = FAMILY_SCHEMAS[ p.family ] || { label: p.family, model: '' };
		const row = h( 'div', {
			class: 'mat-item', data: { id: p.id }, role: 'button', tabindex: '0',
			'data-tip': p.notes || '', 'data-tip-title': p.name,
		},
			h( 'div', { class: 'mat-swatch' }, cvs ),
			h( 'div', { class: 'mat-meta' },
				h( 'div', { class: 'mat-name', text: p.name } ),
				h( 'div', { class: 'mat-sub' },
					h( 'span', { class: `mat-tag ${p.family}`, text: fam.label } ),
					isCustom ? h( 'span', { class: 'u-tiny', style: { color: 'var(--accent-hi)' }, text: 'custom' } ) : null
				)
			)
		);

		const activate = () => {
			this.selectedId = p.id;
			this.select( p.id );
			this.onApply && this.onApply( p );
		};
		row.addEventListener( 'click', activate );
		row.addEventListener( 'keydown', ( e ) => { if ( e.key === 'Enter' || e.key === ' ' ) { e.preventDefault(); activate(); } } );
		row.addEventListener( 'pointerenter', () => this._setNote( p ) );
		row.addEventListener( 'pointerleave', () => {
			const cur = PRESET_BY_ID.get( this.selectedId ) || this.custom.find( ( c ) => c.id === this.selectedId );
			this._setNote( cur );
		} );

		if ( isCustom ) {
			row.addEventListener( 'contextmenu', ( e ) => {
				e.preventDefault();
				if ( confirm( `Delete custom preset "${p.name}"?` ) ) this.removeCustom( p.id );
			} );
		}
		return row;
	}
}

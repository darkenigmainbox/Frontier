/**
 * FRONTIER — Inspector control widgets
 *
 * Slider: drag anywhere on the row, scrub by dragging the label (like a real
 * DCC tool), shift for fine, double-click to reset. The readout is editable.
 */

import { h, fmt } from './dom.js';

const clamp = ( v, a, b ) => v < a ? a : v > b ? b : v;

export function slider( param, value, { onInput, onCommit, gradient } = {} ) {
	const min = param.min, max = param.max, step = param.step || 0.01;
	let cur = Number( value );
	const def = Number( param.default );

	const label = h( 'div', { class: 'ctl-label', 'data-tip': param.hint || param.label, 'data-tip-title': param.label },
		param.hero ? h( 'span', { class: 'hero-star', html: '&#9670;' } ) : null,
		h( 'span', { text: param.label } ),
		param.hint ? h( 'span', { class: 'hintdot' } ) : null
	);
	const valInput = h( 'input', {
		class: 'ctl-value', type: 'text', value: fmt( cur, step ), spellcheck: 'false',
		'aria-label': param.label,
	} );
	const fill = h( 'div', { class: 'ctl-fill' } );
	const rail = h( 'div', { class: `ctl-rail${gradient ? ' grad' : ''}` }, gradient ? null : fill );
	if ( gradient ) rail.style.background = gradient;
	const thumb = h( 'div', { class: 'ctl-thumb' } );
	const track = h( 'div', { class: 'ctl-track' }, rail, thumb );

	const el = h( 'div', { class: `ctl${param.hero ? ' hero' : ''}` }, label, valInput, track );

	let dragging = false;

	const paint = () => {
		const t = ( cur - min ) / ( max - min || 1 );
		if ( ! gradient ) fill.style.width = `${clamp( t, 0, 1 ) * 100}%`;
		thumb.style.left = `${clamp( t, 0, 1 ) * 100}%`;
		if ( document.activeElement !== valInput ) valInput.value = fmt( cur, step );
	};

	const setFromPointer = ( clientX, fine ) => {
		const r = track.getBoundingClientRect();
		let t = ( clientX - r.left ) / ( r.width || 1 );
		t = clamp( t, 0, 1 );
		let v = min + t * ( max - min );
		if ( fine ) v = cur + ( v - cur ) * 0.18;
		v = Math.round( v / step ) * step;
		v = clamp( Number( v.toFixed( 6 ) ), min, max );
		if ( v === cur ) return;
		cur = v;
		paint();
		onInput && onInput( cur );
	};

	const begin = ( e ) => {
		e.preventDefault();
		dragging = true;
		el.classList.add( 'dragging' );
		label.dataset.tip = '';
		setFromPointer( e.clientX, e.shiftKey );
		window.addEventListener( 'pointermove', move );
		window.addEventListener( 'pointerup', end, { once: true } );
	};
	let scrubAnchor = null;
	const scrubMove = ( e ) => {
		const dx = e.clientX - scrubAnchor.x;
		scrubAnchor.x = e.clientX;
		const span = ( max - min ) * ( e.shiftKey ? 0.06 : 0.42 );
		let v = clamp( cur + ( dx / 220 ) * span, min, max );
		v = Math.round( v / step ) * step;
		v = Number( v.toFixed( 6 ) );
		if ( v === cur ) return;
		cur = v; paint(); onInput && onInput( cur );
	};
	const scrubBegin = ( e ) => {
		if ( e.button !== 0 ) return;
		e.preventDefault();
		scrubAnchor = { x: e.clientX };
		el.classList.add( 'dragging' );
		window.addEventListener( 'pointermove', scrubMove );
		window.addEventListener( 'pointerup', () => {
			el.classList.remove( 'dragging' );
			window.removeEventListener( 'pointermove', scrubMove );
			onCommit && onCommit( cur );
		}, { once: true } );
	};

	const move = ( e ) => { if ( dragging ) setFromPointer( e.clientX, e.shiftKey ); };
	const end = () => {
		dragging = false;
		el.classList.remove( 'dragging' );
		label.dataset.tip = param.hint || param.label;
		window.removeEventListener( 'pointermove', move );
		onCommit && onCommit( cur );
	};

	track.addEventListener( 'pointerdown', begin );
	label.addEventListener( 'pointerdown', scrubBegin );
	el.addEventListener( 'dblclick', ( e ) => {
		if ( e.target === valInput ) return;
		cur = def; paint(); onInput && onInput( cur ); onCommit && onCommit( cur );
	} );

	valInput.addEventListener( 'focus', () => valInput.select() );
	valInput.addEventListener( 'keydown', ( e ) => {
		if ( e.key === 'Enter' ) { valInput.blur(); return; }
		if ( e.key === 'ArrowUp' || e.key === 'ArrowDown' ) {
			e.preventDefault();
			const d = ( e.key === 'ArrowUp' ? 1 : -1 ) * step * ( e.shiftKey ? 10 : 1 );
			cur = clamp( Number( ( cur + d ).toFixed( 6 ) ), min, max );
			paint(); onInput && onInput( cur ); onCommit && onCommit( cur );
		}
	} );
	valInput.addEventListener( 'change', () => {
		const v = parseFloat( valInput.value );
		if ( Number.isFinite( v ) ) {
			cur = clamp( Math.round( v / step ) * step, min, max );
			paint(); onInput && onInput( cur ); onCommit && onCommit( cur );
		} else paint();
	} );

	paint();

	return {
		el,
		set( v, silent ) {
			cur = clamp( Number( v ), min, max );
			paint();
			if ( ! silent ) onInput && onInput( cur );
		},
		get: () => cur,
	};
}

export function colorWell( param, value, { onInput } = {} ) {
	let cur = String( value || '#808080' );
	const label = h( 'div', { class: 'ctl-label', 'data-tip': param.hint || param.label, 'data-tip-title': param.label },
		h( 'span', { text: param.label } ),
		param.hint ? h( 'span', { class: 'hintdot' } ) : null
	);
	const input = h( 'input', { type: 'color', value: cur } );
	const btn = h( 'button', { class: 'swatch-btn', type: 'button', 'aria-label': param.label }, input );
	btn.style.background = cur;
	const hex = h( 'span', { class: 'hexval u-mono', text: cur.toUpperCase() } );

	input.addEventListener( 'input', () => {
		cur = input.value;
		btn.style.background = cur;
		hex.textContent = cur.toUpperCase();
		onInput && onInput( cur );
	} );

	const el = h( 'div', { class: 'ctl ctl-color' }, label, hex, btn );
	return {
		el,
		set( v ) { cur = String( v ); input.value = cur; btn.style.background = cur; hex.textContent = cur.toUpperCase(); },
		get: () => cur,
	};
}

export function toggle( param, value, { onInput } = {} ) {
	let cur = !! value;
	const label = h( 'div', { class: 'ctl-label', 'data-tip': param.hint || param.label, 'data-tip-title': param.label },
		h( 'span', { text: param.label } )
	);
	const sw = h( 'button', { class: `switch${cur ? ' on' : ''}`, type: 'button', role: 'switch', 'aria-checked': String( cur ) } );
	sw.addEventListener( 'click', () => {
		cur = ! cur;
		sw.classList.toggle( 'on', cur );
		sw.setAttribute( 'aria-checked', String( cur ) );
		onInput && onInput( cur );
	} );
	const el = h( 'div', { class: 'ctl ctl-toggle' }, label, sw );
	return { el, set( v ) { cur = !! v; sw.classList.toggle( 'on', cur ); }, get: () => cur };
}

export function selectCtl( param, value, { onInput } = {} ) {
	let cur = value;
	const label = h( 'div', { class: 'ctl-label', 'data-tip': param.hint || param.label, 'data-tip-title': param.label },
		h( 'span', { text: param.label } )
	);
	const sel = h( 'select', { class: 'sel' } );
	for ( const o of param.options ) sel.append( h( 'option', { value: o.id, text: o.label } ) );
	sel.value = cur;
	sel.addEventListener( 'change', () => { cur = sel.value; onInput && onInput( cur ); } );
	const el = h( 'div', { class: 'ctl ctl-select' }, label, sel );
	return { el, set( v ) { cur = v; sel.value = v; }, get: () => cur };
}

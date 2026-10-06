/**
 * FRONTIER — Tiny DOM helpers, icon set, tooltip + toast.
 * No framework: this is a tool, it should load instantly.
 */

export function h( tag, props = {}, ...kids ) {
	const el = document.createElement( tag );
	for ( const k in props ) {
		const v = props[ k ];
		if ( v === null || v === undefined || v === false ) continue;
		if ( k === 'class' ) el.className = v;
		else if ( k === 'html' ) el.innerHTML = v;
		else if ( k === 'text' ) el.textContent = v;
		else if ( k === 'style' && typeof v === 'object' ) Object.assign( el.style, v );
		else if ( k.startsWith( 'on' ) && typeof v === 'function' ) el.addEventListener( k.slice( 2 ).toLowerCase(), v );
		else if ( k === 'data' ) { for ( const d in v ) el.dataset[ d ] = v[ d ]; }
		else el.setAttribute( k, v );
	}
	for ( const kid of kids.flat( 4 ) ) {
		if ( kid === null || kid === undefined || kid === false ) continue;
		el.append( kid.nodeType ? kid : document.createTextNode( String( kid ) ) );
	}
	return el;
}

/* ------------------------------------------------------------------ */
/* Icons (stroke SVG, 1.5px, 24 viewBox)                                */
/* ------------------------------------------------------------------ */
const P = {
	chev: 'M6 9l6 6 6-6',
	search: 'M11 4a7 7 0 105.29 11.61L21 20.3M11 4a7 7 0 015.29 11.61',
	reset: 'M3.5 5.5v5h5M3.9 10.5a8 8 0 113 7.4',
	save: 'M5 4h11l3 3v13H5zM8 4v5h7V4M8 20v-6h8v6',
	copy: 'M9 9h10v10H9zM5 15V5h10',
	code: 'M9 7l-5 5 5 5M15 7l5 5-5 5',
	eye: 'M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12zM12 15a3 3 0 100-6 3 3 0 000 6z',
	camera: 'M4 8h3l1.5-2h7L17 8h3v11H4zM12 16.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z',
	cube: 'M12 2.8l8.4 4.6v9.2L12 21.2 3.6 16.6V7.4zM3.6 7.4L12 12l8.4-4.6M12 12v9.2',
	grid: 'M4 4h16v16H4zM4 9.3h16M4 14.6h16M9.3 4v16M14.6 4v16',
	sun: 'M12 7.5a4.5 4.5 0 100 9 4.5 4.5 0 000-9zM12 2v2.4M12 19.6V22M2 12h2.4M19.6 12H22M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M19.1 4.9l-1.7 1.7M6.6 17.4l-1.7 1.7',
	play: 'M7.5 5l11 7-11 7z',
	pause: 'M8.5 5v14M15.5 5v14',
	wire: 'M12 3l8 4.5v9L12 21l-8-4.5v-9zM4 7.5l8 4.5 8-4.5M12 12v9',
	target: 'M12 3v3M12 18v3M3 12h3M18 12h3M12 8.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z',
	layers: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5M3 17.5l9 5 9-5',
	sliders: 'M4 7h10M18 7h2M4 12h4M12 12h8M4 17h12M20 17h0M14 5v4M8 10v4M16 15v4',
	download: 'M12 4v10M8 11l4 4 4-4M5 19h14',
	plus: 'M12 5v14M5 12h14',
	x: 'M6 6l12 12M18 6L6 18',
	trash: 'M5 7h14M9 7V5h6v2M7 7l1 13h8l1-13',
	info: 'M12 8.2v.1M12 11.5V17M12 3a9 9 0 100 18 9 9 0 000-18z',
	droplet: 'M12 3.5s6 6.4 6 10.1a6 6 0 11-12 0C6 9.9 12 3.5 12 3.5z',
	car: 'M4 15.5l1.6-5A3 3 0 018.5 8.4h7a3 3 0 012.9 2.1l1.6 5M4 15.5h16v2.6h-2.6M4 15.5v2.6h2.6M7.5 18.1h9M7 13.4h1.8M15.2 13.4H17',
	wrench: 'M14.7 6.3a3.9 3.9 0 105 5l-8.4 8.4a2.1 2.1 0 01-3-3z',
};

export function icon( name, cls = '' ) {
	const d = P[ name ];
	if ( ! d ) return h( 'span' );
	return h( 'span', {
		class: `ico ${cls}`.trim(),
		html: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
		         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`,
	} );
}

/* ------------------------------------------------------------------ */
/* Tooltip                                                              */
/* ------------------------------------------------------------------ */
let tipEl = null;
export function initTooltip() {
	tipEl = h( 'div', { id: 'tip' } );
	document.body.append( tipEl );
	document.addEventListener( 'pointerover', ( e ) => {
		const t = e.target.closest?.( '[data-tip]' );
		if ( ! t ) return;
		tipEl.innerHTML = '';
		const title = t.dataset.tipTitle;
		if ( title ) tipEl.append( h( 'b', { text: title } ) );
		tipEl.append( document.createTextNode( t.dataset.tip ) );
		const r = t.getBoundingClientRect();
		tipEl.classList.add( 'show' );
		const w = tipEl.offsetWidth, hh = tipEl.offsetHeight;
		let x = r.left + r.width / 2 - w / 2;
		let y = r.top - hh - 8;
		if ( y < 6 ) y = r.bottom + 8;
		x = Math.max( 6, Math.min( window.innerWidth - w - 6, x ) );
		tipEl.style.left = `${x}px`;
		tipEl.style.top = `${y}px`;
	} );
	document.addEventListener( 'pointerout', ( e ) => {
		if ( e.target.closest?.( '[data-tip]' ) ) tipEl.classList.remove( 'show' );
	} );
	document.addEventListener( 'pointerdown', () => tipEl && tipEl.classList.remove( 'show' ), true );
}

/* ------------------------------------------------------------------ */
/* Toast                                                                */
/* ------------------------------------------------------------------ */
let toastHost = null;
export function toast( msg, kind = '' ) {
	if ( ! toastHost ) { toastHost = h( 'div', { id: 'toasts' } ); document.body.append( toastHost ); }
	const el = h( 'div', { class: `toast ${kind}`.trim(), text: msg } );
	toastHost.append( el );
	setTimeout( () => {
		el.style.transition = 'opacity .3s, transform .3s';
		el.style.opacity = '0';
		el.style.transform = 'translateX(14px)';
		setTimeout( () => el.remove(), 320 );
	}, 2400 );
}

/* ------------------------------------------------------------------ */
/* Number formatting                                                    */
/* ------------------------------------------------------------------ */
export function fmt( v, step ) {
	if ( ! Number.isFinite( v ) ) return '—';
	const dec = step >= 1 ? 0 : step >= 0.1 ? 1 : step >= 0.01 ? 2 : 3;
	return v.toFixed( dec );
}

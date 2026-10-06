/**
 * FRONTIER — Automotive Material Studio
 * Application bootstrap and wiring.
 */

import * as THREE from 'three';
import { Viewport } from './render/viewport.js';
import { ENV_PRESETS } from './render/environment.js';
import { ASSET_ORDER } from './render/assets.js';
import { LibraryPanel } from './ui/library.js';
import { InspectorPanel } from './ui/inspector.js';
import { h, icon, initTooltip, toast } from './ui/dom.js';
import { slider } from './ui/controls.js';
import { buildGlslSource, highlightGLSL, highlightJSON, buildJsonSource } from './core/glslPreview.js';
import { PRESET_BY_ID } from './core/library.js';
import { schemaDefaults, FAMILY_SCHEMAS } from './core/schema.js';

/* ------------------------------------------------------------------ */
initTooltip();

const ASSET_LABELS = {
	panel: 'Body Panel', brake: 'Brake Assembly', wheel: 'Wheel & Tyre',
	seat: 'Seat', lamp: 'Headlamp', exhaust: 'Exhaust', ball: 'Shader Ball',
};

const canvas = document.getElementById( 'viewport' );
const viewport = new Viewport( canvas, onViewportChange );

/* ------------------------------------------------------------------ */
/* Panels                                                               */
/* ------------------------------------------------------------------ */
const library = new LibraryPanel( {
	onApply: ( preset ) => applyPreset( preset ),
	onRequestSave: () => saveAsPreset(),
} );
document.getElementById( 'libraryHost' ).replaceWith( library.root );
library.root.classList.add( 'panel-left' );

const inspector = new InspectorPanel( {
	onParam: onParamChange,
	onSave: () => saveAsPreset(),
	onReset: () => resetCurrent(),
	onCopyJson: () => copyJson(),
	onShowCode: () => openDrawer( 'glsl' ),
	onSlotChange: ( slotId ) => { viewport.activeSlot = slotId; refreshInspector(); },
} );
document.getElementById( 'inspectorHost' ).replaceWith( inspector.root );

/* ------------------------------------------------------------------ */
/* Asset rail                                                           */
/* ------------------------------------------------------------------ */
const rail = document.getElementById( 'assetRail' );
const railButtons = new Map();
for ( const id of ASSET_ORDER ) {
	const b = h( 'button', { type: 'button', text: ASSET_LABELS[ id ] || id, data: { asset: id } } );
	b.addEventListener( 'click', () => setAsset( id ) );
	rail.append( b );
	railButtons.set( id, b );
}

function setAsset( id ) {
	viewport.setAsset( id );
	railButtons.forEach( ( b, k ) => b.classList.toggle( 'on', k === id ) );
	document.getElementById( 'hudTitle' ).textContent = ASSET_LABELS[ id ] || id;
	refreshInspector();
}

/* ------------------------------------------------------------------ */
/* Viewport toolbar                                                     */
/* ------------------------------------------------------------------ */
const toolbar = document.getElementById( 'vpToolbar' );

const envSelect = h( 'select', { class: 'vp-select', 'aria-label': 'Lighting environment' } );
for ( const id in ENV_PRESETS ) envSelect.append( h( 'option', { value: id, text: ENV_PRESETS[ id ].label } ) );
envSelect.value = 'studio';
envSelect.addEventListener( 'change', () => viewport.setEnvironment( envSelect.value ) );

function tbtn( name, iconName, tip, tipTitle, onClick, initial ) {
	const b = h( 'button', {
		class: `vp-btn${initial ? ' on' : ''}`, type: 'button',
		'data-tip': tip, 'data-tip-title': tipTitle,
	}, icon( iconName ), name ? h( 'span', { text: name } ) : null );
	b.addEventListener( 'click', () => onClick( b ) );
	return b;
}

toolbar.append(
	envSelect,
	h( 'span', { class: 'vp-sep' } ),
	tbtn( '', 'target', 'Frame the asset in the viewport  (F)', 'Frame', () => {
		viewport._liftToFloor(); viewport.frameAsset();
	} ),
	tbtn( '', 'play', 'Turntable  (T)', 'Turntable', ( b ) => {
		viewport.setSetting( 'turntable', ! viewport.settings.turntable );
		b.classList.toggle( 'on', viewport.settings.turntable );
	} ),
	h( 'span', { class: 'vp-sep' } ),
	tbtn( '', 'grid', 'Ground grid  (G)', 'Grid', ( b ) => {
		viewport.setSetting( 'grid', ! viewport.settings.grid );
		b.classList.toggle( 'on', viewport.settings.grid );
	} ),
	tbtn( '', 'layers', 'Studio floor  (H)', 'Floor', ( b ) => {
		viewport.setSetting( 'floor', ! viewport.settings.floor );
		b.classList.toggle( 'on', viewport.settings.floor );
	}, true ),
	tbtn( '', 'wire', 'Wireframe  (W)', 'Wireframe', ( b ) => {
		viewport.setSetting( 'wireframe', ! viewport.settings.wireframe );
		b.classList.toggle( 'on', viewport.settings.wireframe );
	} ),
	tbtn( '', 'sun', 'Shadows', 'Shadows', ( b ) => {
		viewport.setSetting( 'shadows', ! viewport.settings.shadows );
		b.classList.toggle( 'on', viewport.settings.shadows );
	}, true ),
	tbtn( '', 'eye', 'Show the environment dome as the background  (B)', 'Env dome', ( b ) => {
		viewport.setSetting( 'showEnv', ! viewport.settings.showEnv );
		b.classList.toggle( 'on', viewport.settings.showEnv );
	} ),
	h( 'span', { class: 'vp-sep' } ),
	tbtn( '', 'camera', 'Save a PNG of the viewport  (P)', 'Screenshot', () => screenshot() )
);

/* ------------------------------------------------------------------ */
/* Top-bar actions + render settings popover                            */
/* ------------------------------------------------------------------ */
const topActions = document.getElementById( 'topActions' );
const pop = document.getElementById( 'renderPop' );

const renderBtn = h( 'button', { class: 'btn', type: 'button' }, icon( 'sliders' ), 'Render' );
const codeBtn = h( 'button', { class: 'btn', type: 'button' }, icon( 'code' ), 'Shader' );
const shotBtn = h( 'button', { class: 'btn', type: 'button', 'data-tip': 'Save a PNG (P)', 'data-tip-title': 'Screenshot' }, icon( 'camera' ) );
topActions.append( renderBtn, codeBtn, shotBtn );
shotBtn.addEventListener( 'click', () => screenshot() );
codeBtn.addEventListener( 'click', () => toggleDrawer() );
renderBtn.addEventListener( 'click', ( e ) => {
	e.stopPropagation();
	const open = pop.classList.contains( 'open' );
	buildRenderPop();
	pop.classList.toggle( 'open', ! open );
	if ( ! open ) {
		const r = renderBtn.getBoundingClientRect();
		pop.style.top = `${r.bottom + 6}px`;
		pop.style.left = `${Math.max( 10, r.right - pop.offsetWidth )}px`;
	}
} );
document.addEventListener( 'pointerdown', ( e ) => {
	if ( pop.classList.contains( 'open' ) && ! pop.contains( e.target ) && e.target !== renderBtn ) pop.classList.remove( 'open' );
} );

let popBuilt = false;
function buildRenderPop() {
	if ( popBuilt ) return;
	popBuilt = true;
	pop.innerHTML = '';
	pop.append( h( 'div', { class: 'pop-title', text: 'Render & Grade' } ) );

	const R = ( key, label, min, max, step, def, hint, fmtFn ) => {
		const p = { key, label, min, max, step, default: def, hint };
		const ctl = slider( p, viewport.settings[ key ], {
			onInput: ( v ) => viewport.setSetting( key, v ),
		} );
		if ( fmtFn ) {
			const orig = ctl.set.bind( ctl );
			ctl.set = orig;
		}
		pop.append( ctl.el );
	};

	R( 'exposure', 'Exposure', 0.1, 3, 0.01, 1, 'ACES filmic exposure.' );
	R( 'envIntensity', 'Env Intensity', 0, 4, 0.01, 1, 'Image based light multiplier.' );
	R( 'bloom', 'Bloom', 0, 2, 0.01, 0.36, 'Flake sparkle reads best with a touch of bloom.' );
	R( 'vignette', 'Vignette', 0, 1, 0.01, 0.55, '' );
	R( 'aberration', 'Chromatic Aberration', 0, 2, 0.01, 0.35, '' );
	R( 'grain', 'Film Grain', 0, 1, 0.01, 0.16, 'Procedural, animated.' );
	R( 'saturation', 'Saturation', 0, 2, 0.01, 1, '' );
	R( 'contrast', 'Contrast', 0.5, 1.8, 0.01, 1, '' );

	const tone = h( 'div', { class: 'ctl ctl-select' },
		h( 'div', { class: 'ctl-label' }, h( 'span', { text: 'Tone Mapper' } ) ),
		h( 'select', { class: 'sel' } )
	);
	const sel = tone.querySelector( 'select' );
	for ( const [ id, name ] of [
		[ 'aces', 'ACES Filmic' ], [ 'neutral', 'Neutral (Khronos)' ], [ 'agx', 'AgX' ],
		[ 'cineon', 'Cineon' ], [ 'reinhard', 'Reinhard' ], [ 'linear', 'Linear (off)' ],
	] ) sel.append( h( 'option', { value: id, text: name } ) );
	sel.value = 'aces';
	sel.addEventListener( 'change', () => {
		const map = {
			aces: THREE.ACESFilmicToneMapping, neutral: THREE.NeutralToneMapping,
			agx: THREE.AgXToneMapping, cineon: THREE.CineonToneMapping,
			reinhard: THREE.ReinhardToneMapping, linear: THREE.LinearToneMapping,
		};
		viewport.renderer.toneMapping = map[ sel.value ];
		viewport.scene.traverse( ( o ) => { if ( o.isMesh && o.material ) o.material.needsUpdate = true; } );
	} );
	pop.append( tone );

	pop.append( h( 'div', { class: 'u-tiny u-muted', style: { padding: '8px 4px 2px', lineHeight: '1.6' },
		text: 'MSAA ×4 · HDR half-float · procedural PMREM environment · zero texture fetches.' } ) );
}

/* ------------------------------------------------------------------ */
/* Drawer                                                               */
/* ------------------------------------------------------------------ */
const appEl = document.getElementById( 'app' );
const drawerBody = document.getElementById( 'drawerBody' );
const drawerTabs = document.getElementById( 'drawerTabs' );
let drawerTab = 'glsl';
let drawerOpen = false;

const TABS = [
	{ id: 'glsl', label: 'GLSL' },
	{ id: 'json', label: 'Preset JSON' },
	{ id: 'doc', label: 'Model Notes' },
];

for ( const t of TABS ) {
	const b = h( 'button', { class: 'drawer-tab', type: 'button', text: t.label, data: { tab: t.id } } );
	b.addEventListener( 'click', () => openDrawer( t.id ) );
	drawerTabs.append( b );
}
drawerTabs.append( h( 'span', { style: { flex: '1 1 auto' } } ) );
drawerTabs.append( h( 'button', {
	class: 'btn ghost icon', type: 'button', 'data-tip': 'Close', 'data-tip-title': 'Close',
	onClick: () => closeDrawer(),
}, icon( 'x' ) ) );

const DOC = `FRONTIER — how the shading works
================================

Nothing in this project is textured. Every surface you see is evaluated from
hash noise inside the fragment shader. The host is three.js MeshPhysicalMaterial,
so we inherit a full Unreal-style PBR stack (Default Lit / Clear Coat / Cloth /
Thin Translucent, PMREM image based lighting, anisotropy, iridescence, sheen)
and splice four procedural stages into main():

  STAGE 1  after <metalnessmap_fragment>        evaluate the surface
  STAGE 2  after <clearcoat_normal_fragment_maps> perturb base + coat normals
  STAGE 3  after <lights_physical_fragment>     override the PhysicalMaterial struct
  STAGE 4  after <lights_fragment_end>          accumulate extra BRDF lobes

METALLIC FLAKE PAINT
--------------------
Two octaves of Worley cells tile the tangent plane in WORLD space, so glitter is
welded to the bodywork instead of swimming with the camera. Each cell owns a
randomly oriented mirror facet. A facet only fires when its own normal lines up
with the half vector, which is exactly the travelling sparkle of a real metallic
or mica basecoat:

    D = a^2 / ( (N_f·H)^2 (a^2-1) + 1 )^2        peak-normalised micro lobe
    sparkle += L * NoL * D * V_Smith * F(N_f·V) * mask * fade

  Flake Density   cells per metre of body surface
  Orientation     0 = flat mirrors (tight glitter) -> 1 = hemispherical scatter
  Paint Depth     parallax of the flake layer under the clear coat, plus the
                  face-to-edge colour "flop" and the binder depth fog
  Orange Peel     fbm ripple in the clear coat only — the flakes stay below it
  Sparkle Sharp.  micro-lobe width; lower is a pin-point glitter

Anti-aliasing is the part most flake demos get wrong. The projected cell footprint
is measured with dFdx/dFdy; once a cell drops below roughly one pixel the discrete
sparkle fades out and the base lobe roughness returns to its averaged value, so
the paint degrades to a smooth metal in the distance instead of crawling.

PAINT DEPTH is not a single knob — it drives four coupled effects: parallax
travel of the flake coordinate, the strength of the face-to-edge flop, the
absorption between flakes, and the clear coat Fresnel. Deep film build reads
"wet"; a thin single-stage wrap reads dry and chalky.

BRAKE DISCS
-----------
Concentric lathe grooves are generated in object-space polar coordinates, which
makes them run true to the disc no matter how the assembly is rotated. They feed
both a bump and a per-pixel anisotropy direction, so the turned finish throws the
long tangential streak you see on a real rotor. Cross-drilled holes are cut with
discard in the fragment shader rather than in geometry, so you genuinely see into
the vane channel. Heat drives a physically ordered temper ramp — straw, bronze,
purple, deep blue, grey — and above that a blackbody incandescence term.

CERAMICS / FABRIC / RUBBER / GLASS / METALS / COMPOSITES
--------------------------------------------------------
Ceramic: glaze over body, Worley speckle, F2-F1 crazing, wrapped diffuse + back
transmission for thin porcelain.
Fabric: plain / 2x2 twill / knit / suede relief, yarn twist, Charlie sheen with a
brushed nap direction, and cloth back-scatter.
Rubber: block tread with sipes and chamfers, pebble grain, ribbed seal, dust
settling in the crevices, dark subsurface rim.
Glass: Beer-Lambert absorption scaled by the true path length through the pane
(1 / N·V), which is why car glass reads green at its edges; plus dispersion,
thin-film AR coating, micro-scratches and wiper arcs.
Metals: mirror, brushed, concentric machined, as-cast and bead blasted, each with
its own grain, roughness modulation and anisotropy frame.
Composites: 2x2 twill and plain carbon with per-filament striations and resin
pockets, forged chopped fibre, moulded polymer grain, nappa leather.

LIGHTING
--------
The environment is a procedural HDR rig: a gradient dome plus emissive softbox
and strip panels, rendered into a cube and prefiltered with PMREMGenerator, so
the roughness mips behave exactly like a captured HDRI. Bright, small emitters
matter — a flake needs a hard highlight to catch.`;

function openDrawer( tab ) {
	drawerTab = tab || drawerTab;
	drawerOpen = true;
	appEl.classList.add( 'drawer-open' );
	drawerTabs.querySelectorAll( '.drawer-tab' ).forEach( ( b ) => b.classList.toggle( 'on', b.dataset.tab === drawerTab ) );
	renderDrawer();
	requestAnimationFrame( () => viewport.resize() );
}
function closeDrawer() {
	drawerOpen = false;
	appEl.classList.remove( 'drawer-open' );
	requestAnimationFrame( () => viewport.resize() );
}
function toggleDrawer() { drawerOpen ? closeDrawer() : openDrawer( drawerTab ); }

function renderDrawer() {
	const handle = viewport.activeHandle();
	if ( drawerTab === 'glsl' ) {
		drawerBody.innerHTML = highlightGLSL( buildGlslSource( handle ) );
	} else if ( drawerTab === 'json' ) {
		drawerBody.innerHTML = highlightJSON( buildJsonSource( handle, inspector.preset && inspector.preset.name ) );
	} else {
		drawerBody.textContent = DOC;
	}
	drawerBody.scrollTop = 0;
}

/* ------------------------------------------------------------------ */
/* Status bar                                                           */
/* ------------------------------------------------------------------ */
const statusbar = document.getElementById( 'statusbar' );
const stLed = h( 'span', { class: 'led' } );
const stRenderer = h( 'span' );
const stFps = h( 'b', { text: '—' } );
const stTris = h( 'b', { text: '—' } );
const stCalls = h( 'b', { text: '—' } );
const stSlot = h( 'b', { text: '—' } );
const stMat = h( 'b', { text: '—' } );

statusbar.append(
	h( 'span', { class: 'st' }, stLed, stRenderer ),
	h( 'span', { class: 'st' }, 'fps ', stFps ),
	h( 'span', { class: 'st' }, 'tris ', stTris ),
	h( 'span', { class: 'st' }, 'draws ', stCalls ),
	h( 'span', { class: 'st' }, 'part ', stSlot ),
	h( 'span', { class: 'st' }, 'material ', stMat ),
	h( 'span', { class: 'st-spacer' } ),
	h( 'button', { class: 'st-link', type: 'button', text: 'shader source', onClick: () => openDrawer( 'glsl' ) } ),
	h( 'button', { class: 'st-link', type: 'button', text: 'model notes', onClick: () => openDrawer( 'doc' ) } )
);

const caps = viewport.renderer.capabilities;
stRenderer.textContent = `WebGL${caps.isWebGL2 ? '2' : ''} · three r${THREE.REVISION} · ACES · MSAA×4`;

/* ------------------------------------------------------------------ */
/* Axis gizmo                                                           */
/* ------------------------------------------------------------------ */
const gizmo = document.getElementById( 'gizmo' );
const gctx = gizmo.getContext( '2d' );
function drawGizmo() {
	const S = gizmo.width, c = S / 2, R = S * 0.34;
	gctx.clearRect( 0, 0, S, S );
	const m = viewport.camera.matrixWorldInverse;
	const axes = [
		{ v: new THREE.Vector3( 1, 0, 0 ), l: 'X', col: '#ff6b57' },
		{ v: new THREE.Vector3( 0, 1, 0 ), l: 'Y', col: '#7de08a' },
		{ v: new THREE.Vector3( 0, 0, 1 ), l: 'Z', col: '#5ab4ff' },
	];
	for ( const a of axes ) {
		const d = a.v.clone().transformDirection( m );
		a.x = d.x * R; a.y = -d.y * R; a.z = d.z;
	}
	axes.sort( ( p, q ) => p.z - q.z );
	gctx.lineCap = 'round';
	gctx.font = '600 11px Inter, sans-serif';
	gctx.textAlign = 'center';
	gctx.textBaseline = 'middle';
	for ( const a of axes ) {
		const front = a.z > 0;
		gctx.globalAlpha = front ? 1 : 0.34;
		gctx.strokeStyle = a.col;
		gctx.lineWidth = front ? 3 : 2;
		gctx.beginPath();
		gctx.moveTo( c, c );
		gctx.lineTo( c + a.x, c + a.y );
		gctx.stroke();
		gctx.fillStyle = '#0d0e11';
		gctx.beginPath();
		gctx.arc( c + a.x, c + a.y, 9, 0, Math.PI * 2 );
		gctx.fill();
		gctx.strokeStyle = a.col;
		gctx.lineWidth = 1.6;
		gctx.stroke();
		gctx.fillStyle = a.col;
		gctx.fillText( a.l, c + a.x, c + a.y + 0.5 );
	}
	gctx.globalAlpha = 1;
}

/* ------------------------------------------------------------------ */
/* Wiring                                                               */
/* ------------------------------------------------------------------ */
/**
 * Pick the slot a preset should land on. If the active slot accepts the
 * material family we stay put; otherwise we hop to the part that does, so
 * clicking "Tyre Tread" while the rim is selected does the sensible thing.
 */
function targetSlotFor( preset ) {
	const slots = viewport.asset.slots;
	const active = slots.find( ( s ) => s.id === viewport.activeSlot );
	if ( active && ( ! active.accepts || active.accepts.includes( preset.family ) ) ) return active.id;
	const match = slots.find( ( s ) => s.accepts && s.accepts.includes( preset.family ) );
	if ( match ) return match.id;
	return ( slots.find( ( s ) => s.primary ) || slots[ 0 ] ).id;
}

function applyPreset( preset ) {
	if ( ! viewport.asset ) return;
	const slotId = targetSlotFor( preset );
	const moved = slotId !== viewport.activeSlot;
	if ( moved ) viewport.activeSlot = slotId;
	const handle = viewport.applyPreset( slotId, preset.id );
	if ( ! handle ) return;
	library.select( preset.id );
	library.setApplied( slotId, preset.id );
	refreshInspector();
	updateDrawer();
	toast( `${preset.name} → ${slotLabel( slotId )}`, 'ok' );
}

function slotLabel( id ) {
	const s = viewport.asset && viewport.asset.slots.find( ( x ) => x.id === id );
	return s ? s.label : id;
}

let lastPresetId = null;
function onParamChange( key, value, live ) {
	updateHudValues();
	if ( live ) {
		/* keep the library thumbnail in step while dragging */
		const pid = viewport.activeHandle() && viewport.activeHandle().presetId;
		if ( pid ) library.refreshSwatch( pid, viewport.activeHandle().values );
	} else {
		updateDrawer();
	}
}

function refreshInspector() {
	if ( ! viewport.asset ) return;
	const handle = viewport.activeHandle();
	if ( ! handle ) return;
	const slot = viewport.asset.slots.find( ( s ) => s.id === viewport.activeSlot );
	const preset = PRESET_BY_ID.get( handle.presetId ) || library.custom.find( ( c ) => c.id === handle.presetId );

	inspector.setSlots( viewport.asset.slots, viewport.activeSlot );
	inspector.slotSelect.value = viewport.activeSlot;
	inspector.setContext( { assetLabel: viewport.asset.label, slot, handle, preset } );
	for ( const sid in viewport.slotHandles ) {
		library.setApplied( sid, viewport.slotHandles[ sid ].presetId );
	}
	lastPresetId = handle.presetId;
	if ( preset ) library.select( preset.id );

	document.getElementById( 'hudSlot' ).textContent = slot ? slot.label : '—';
	const sch = FAMILY_SCHEMAS[ handle.family ];
	document.getElementById( 'hudFamily' ).textContent = handle.family;
	document.getElementById( 'hudModel' ).textContent = sch ? sch.model : '';
	stSlot.textContent = slot ? slot.label : '—';
	stMat.textContent = preset ? preset.name : 'custom';
	updateHudValues();
}

function updateHudValues() {
	const handle = viewport.activeHandle();
	if ( ! handle ) return;
	stMat.textContent = ( handle.presetName || 'custom' ) + ( inspector.modified ? ' *' : '' );
}

function onViewportChange( ev ) {
	if ( ev.type === 'slot' ) { refreshInspector(); updateDrawer(); }
	else if ( ev.type === 'hover' ) {
		const chip = document.getElementById( 'hudHoverChip' );
		const el = document.getElementById( 'hudHover' );
		if ( ev.slot ) { chip.style.display = ''; el.textContent = slotLabel( ev.slot ); }
		else chip.style.display = 'none';
	} else if ( ev.type === 'stats' ) {
		stFps.textContent = String( ev.fps );
		document.getElementById( 'hudFps' ).textContent = String( ev.fps );
		stTris.textContent = ( ev.info.triangles / 1000 ).toFixed( 1 ) + 'k';
		document.getElementById( 'hudTris' ).textContent = ( ev.info.triangles / 1000 ).toFixed( 1 ) + 'k';
		stCalls.textContent = String( ev.info.calls );
		document.getElementById( 'hudCalls' ).textContent = String( ev.info.calls );
		stLed.classList.toggle( 'warn', ev.fps < 30 );
		drawGizmo();
	}
}

let drawerRaf = 0;
function updateDrawer() {
	if ( ! drawerOpen ) return;
	cancelAnimationFrame( drawerRaf );
	drawerRaf = requestAnimationFrame( renderDrawer );
}

function resetCurrent() {
	const handle = viewport.activeHandle();
	if ( ! handle ) return;
	const pid = handle.presetId;
	const preset = PRESET_BY_ID.get( pid ) || library.custom.find( ( c ) => c.id === pid );
	if ( ! preset ) return;
	const fresh = { ...schemaDefaults( preset.family ), ...preset.values };
	handle.setAll( fresh );
	inspector.syncValues( handle.values );
	library.refreshSwatch( pid, handle.values );
	updateDrawer();
	toast( `Reset to ${preset.name}`, 'ok' );
}

function copyJson() {
	const handle = viewport.activeHandle();
	if ( ! handle ) return;
	const txt = buildJsonSource( handle, inspector.preset && inspector.preset.name );
	navigator.clipboard?.writeText( txt ).then(
		() => toast( 'Material JSON copied to clipboard', 'ok' ),
		() => { openDrawer( 'json' ); toast( 'Clipboard blocked — shown in the drawer instead' ); }
	);
}

/* ---------------- preset save modal ---------------- */
function saveAsPreset() {
	const handle = viewport.activeHandle();
	if ( ! handle ) return;
	openModal( {
		title: 'Save material preset',
		fields: [
			{ key: 'name', label: 'Name', type: 'text', value: ( handle.presetName || 'Material' ) + ' (edit)' },
			{ key: 'notes', label: 'Notes', type: 'text', value: 'Custom procedural material.' },
		],
	} ).then( ( res ) => {
		if ( ! res ) return;
		const id = 'custom-' + Date.now().toString( 36 );
		const preset = {
			id, name: res.name || 'Untitled', family: handle.family,
			category: 'custom', notes: res.notes || '', values: { ...handle.values },
		};
		library.addCustom( preset );
		handle.presetId = id;
		handle.presetName = preset.name;
		library.setApplied( viewport.activeSlot, id );
		library.select( id );
		inspector.modified = false;
		updateHudValues();
		toast( `Saved "${preset.name}" to your library`, 'ok' );
	} );
}

function openModal( { title, fields } ) {
	return new Promise( ( resolve ) => {
		const inputs = {};
		const body = h( 'div', { style: { display: 'flex', flexDirection: 'column', gap: '10px' } } );
		for ( const f of fields ) {
			const inp = h( 'input', { class: 'txt', type: f.type || 'text', value: f.value || '', spellcheck: 'false' } );
			inp.style.paddingLeft = '8px';
			inp.style.height = '28px';
			inputs[ f.key ] = inp;
			body.append( h( 'label', { style: { display: 'flex', flexDirection: 'column', gap: '4px' } },
				h( 'span', { class: 'u-cap', text: f.label } ), inp ) );
		}
		const scrim = h( 'div', {
			style: {
				position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(6,7,9,0.62)',
				display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(3px)',
			},
		} );
		const close = ( val ) => { scrim.remove(); resolve( val ); };
		const card = h( 'div', {
			style: {
				width: '340px', background: '#171a1e', border: '1px solid var(--line)',
				borderRadius: '11px', boxShadow: 'var(--shadow-pop)', padding: '16px',
			},
		},
			h( 'div', { style: { fontSize: '13px', fontWeight: '640', marginBottom: '13px', color: '#eef1f5' }, text: title } ),
			body,
			h( 'div', { style: { display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '15px' } },
				h( 'button', { class: 'btn', type: 'button', text: 'Cancel', onClick: () => close( null ) } ),
				h( 'button', {
					class: 'btn accent', type: 'button', text: 'Save',
					onClick: () => {
						const out = {};
						for ( const k in inputs ) out[ k ] = inputs[ k ].value;
						close( out );
					},
				} )
			)
		);
		scrim.append( card );
		scrim.addEventListener( 'pointerdown', ( e ) => { if ( e.target === scrim ) close( null ); } );
		document.body.append( scrim );
		setTimeout( () => { inputs[ fields[ 0 ].key ].focus(); inputs[ fields[ 0 ].key ].select(); }, 30 );
		scrim.addEventListener( 'keydown', ( e ) => {
			if ( e.key === 'Escape' ) close( null );
			if ( e.key === 'Enter' ) {
				const out = {};
				for ( const k in inputs ) out[ k ] = inputs[ k ].value;
				close( out );
			}
		} );
	} );
}

/* ---------------- screenshot ---------------- */
function screenshot() {
	try {
		const url = viewport.screenshot();
		const a = document.createElement( 'a' );
		a.href = url;
		a.download = `frontier-${viewport.assetId}-${Date.now()}.png`;
		a.click();
		toast( 'Viewport PNG saved', 'ok' );
	} catch ( e ) {
		toast( 'Screenshot failed: ' + e.message );
	}
}

/* ------------------------------------------------------------------ */
/* Keyboard                                                             */
/* ------------------------------------------------------------------ */
window.addEventListener( 'keydown', ( e ) => {
	const t = e.target;
	if ( t && ( t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA' ) ) return;
	const k = e.key.toLowerCase();
	if ( k >= '1' && k <= '7' ) { setAsset( ASSET_ORDER[ Number( k ) - 1 ] ); return; }
	switch ( k ) {
		case 'f': viewport._liftToFloor(); viewport.frameAsset(); break;
		case 'g': viewport.setSetting( 'grid', ! viewport.settings.grid ); syncToolbar(); break;
		case 'w': viewport.setSetting( 'wireframe', ! viewport.settings.wireframe ); syncToolbar(); break;
		case 't': viewport.setSetting( 'turntable', ! viewport.settings.turntable ); syncToolbar(); break;
		case 'h': viewport.setSetting( 'floor', ! viewport.settings.floor ); syncToolbar(); break;
		case 'b': viewport.setSetting( 'showEnv', ! viewport.settings.showEnv ); syncToolbar(); break;
		case 'p': screenshot(); break;
		case 'e': {
			const ids = Object.keys( ENV_PRESETS );
			const i = ( ids.indexOf( viewport.envId ) + 1 ) % ids.length;
			envSelect.value = ids[ i ];
			viewport.setEnvironment( ids[ i ] );
			toast( ENV_PRESETS[ ids[ i ] ].label );
			break;
		}
		case '`': toggleDrawer(); break;
		case '/': e.preventDefault(); library.searchInput.focus(); break;
	}
} );

/* .vp-btn order: 0 frame, 1 turntable, 2 grid, 3 floor, 4 wireframe,
   5 shadows, 6 env dome, 7 screenshot */
function syncToolbar() {
	const b = [ ...toolbar.querySelectorAll( '.vp-btn' ) ];
	const map = [ null, 'turntable', 'grid', 'floor', 'wireframe', 'shadows', 'showEnv', null ];
	map.forEach( ( key, i ) => {
		if ( key && b[ i ] ) b[ i ].classList.toggle( 'on', !! viewport.settings[ key ] );
	} );
}

/* ------------------------------------------------------------------ */
/* Boot                                                                 */
/* ------------------------------------------------------------------ */
const ro = new ResizeObserver( () => viewport.resize() );
ro.observe( document.getElementById( 'stage' ) );
window.addEventListener( 'resize', () => viewport.resize() );

setAsset( 'panel' );
viewport.setEnvironment( 'studio' );
syncToolbar();
viewport.start();

/* Compile every program up front, then lift the veil — first-paint hitches
   are otherwise very visible with eight procedural families in play. */
const veil = document.getElementById( 'veil' );
( async () => {
	try {
		viewport.resize();
		await viewport.renderer.compileAsync( viewport.scene, viewport.camera );
	} catch ( e ) {
		console.warn( 'precompile', e );
	}
	viewport.render();
	await new Promise( ( r ) => setTimeout( r, 260 ) );
	veil.classList.add( 'hide' );
	viewport.resize();
	drawGizmo();
} )();

console.info(
	'%cFRONTIER %cAutomotive Material Studio',
	'background:#ff7a2f;color:#1a0d04;font-weight:800;padding:2px 6px;border-radius:3px;',
	'color:#9aa1ac;padding:2px 6px;'
);
console.info( 'Every material is procedural — no texture is loaded anywhere in this app.' );

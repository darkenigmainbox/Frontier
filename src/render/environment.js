/**
 * FRONTIER — Procedural environment lighting
 *
 * There are no HDR files anywhere in this project. Every lighting rig is
 * generated on the GPU: a gradient sky dome plus emissive softbox / strip
 * panels, rendered into a cube and prefiltered with three's PMREMGenerator so
 * it behaves exactly like a real image based light (correct roughness mips,
 * correct IBL specular and irradiance).
 *
 * Bright, small emitters matter enormously here — a metallic flake only shows
 * its glitter when there is a hard highlight for it to catch.
 */

import * as THREE from 'three';

export const SKY_VERT = /* glsl */`
varying vec3 vDir;
void main() {
	vDir = normalize( position );
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`;

export const SKY_FRAG = /* glsl */`
uniform vec3  uTop;
uniform vec3  uHorizon;
uniform vec3  uBottom;
uniform vec3  uSunColor;
uniform vec3  uSunDir;
uniform float uSunSize;
uniform float uSunIntensity;
uniform float uExposure;
varying vec3 vDir;
void main() {
	vec3 d = normalize( vDir );
	float h = d.y;
	vec3 c = h > 0.0 ? mix( uHorizon, uTop, pow( h, 0.55 ) )
	                 : mix( uHorizon, uBottom, pow( -h, 0.70 ) );
	float sd = max( dot( d, normalize( uSunDir ) ), 0.0 );
	c += uSunColor * uSunIntensity * pow( sd, 1.0 / max( uSunSize, 1e-4 ) );
	c += uSunColor * uSunIntensity * 0.22
	     * pow( max( 1.0 - abs( h ), 0.0 ), 9.0 ) * pow( sd, 4.0 );
	gl_FragColor = vec4( c * uExposure, 1.0 );
}`;

export const PANEL_FRAG = /* glsl */`
uniform vec3  uColor;
uniform float uIntensity;
uniform float uFalloff;
varying vec2 vP;
void main() {
	vec2 q = abs( vP * 2.0 );
	float d = max( q.x, q.y );
	float a = 1.0 - smoothstep( uFalloff, 1.0, d );
	a = pow( max( a, 0.0 ), 1.35 );
	gl_FragColor = vec4( uColor * uIntensity * a, 1.0 );
}`;

export const PANEL_VERT = /* glsl */`
varying vec2 vP;
void main() {
	vP = uv * 2.0 - 1.0;
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`;

function skyMaterial( cfg ) {
	return new THREE.ShaderMaterial( {
		side: THREE.BackSide,
		depthWrite: false,
		uniforms: {
			uTop:           { value: new THREE.Color().setRGB( cfg.sky.top[ 0 ], cfg.sky.top[ 1 ], cfg.sky.top[ 2 ] ) },
			uHorizon:       { value: new THREE.Color().setRGB( cfg.sky.horizon[ 0 ], cfg.sky.horizon[ 1 ], cfg.sky.horizon[ 2 ] ) },
			uBottom:        { value: new THREE.Color().setRGB( cfg.sky.bottom[ 0 ], cfg.sky.bottom[ 1 ], cfg.sky.bottom[ 2 ] ) },
			uSunColor:      { value: new THREE.Color().setRGB( 1, 1, 1 ) },
			uSunDir:        { value: new THREE.Vector3( 0.4, 0.6, 0.3 ).normalize() },
			uSunSize:       { value: 0.02 },
			uSunIntensity:  { value: 0 },
			uExposure:      { value: cfg.sky.exposure !== undefined ? cfg.sky.exposure : 1 },
		},
		vertexShader: SKY_VERT,
		fragmentShader: SKY_FRAG,
	} );
}

function panel( w, h, color, intensity, falloff = 0.62 ) {
	const m = new THREE.Mesh(
		new THREE.PlaneGeometry( w, h ),
		new THREE.ShaderMaterial( {
			side: THREE.DoubleSide,
			depthWrite: false,
			uniforms: {
				uColor:     { value: new THREE.Color().setRGB( color[ 0 ], color[ 1 ], color[ 2 ] ) },
				uIntensity: { value: intensity },
				uFalloff:   { value: falloff },
			},
			vertexShader: PANEL_VERT,
			fragmentShader: PANEL_FRAG,
		} )
	);
	return m;
}

/* ------------------------------------------------------------------ */
/* Rig presets                                                          */
/* ------------------------------------------------------------------ */
export const ENV_PRESETS = {
	studio: {
		label: 'Studio Softbox',
		hint: 'Neutral dark surround, three large softboxes — the standard paint-evaluation rig.',
		sky: { top: [ 0.030, 0.032, 0.036 ], horizon: [ 0.055, 0.058, 0.063 ], bottom: [ 0.012, 0.013, 0.015 ], exposure: 1 },
		panels: [
			{ p: [ -3.0, 3.4, 2.6 ], r: [ -0.5, -0.7, 0 ], s: [ 3.4, 2.4 ], c: [ 1, 1, 1 ], i: 26 },
			{ p: [ 3.6, 2.2, -1.4 ], r: [ -0.25, 0.9, 0 ], s: [ 2.6, 2.0 ], c: [ 0.86, 0.91, 1.0 ], i: 12 },
			{ p: [ 0.2, 5.2, -0.4 ], r: [ -1.57, 0, 0 ], s: [ 5.0, 3.2 ], c: [ 1, 1, 1 ], i: 16 },
			{ p: [ -0.6, 1.2, -4.6 ], r: [ 0.1, 0, 0 ], s: [ 6.0, 0.5 ], c: [ 1, 0.98, 0.95 ], i: 22 },
			{ p: [ 0.0, -1.6, 0.0 ], r: [ 1.57, 0, 0 ], s: [ 9.0, 9.0 ], c: [ 0.55, 0.57, 0.60 ], i: 0.9, f: 0.05 },
		],
		key: { dir: [ -0.55, 0.72, 0.42 ], color: 0xffffff, intensity: 1.5 },
		fill: { dir: [ 0.75, 0.32, -0.28 ], color: 0xdfe8ff, intensity: 0.55 },
		rim: { dir: [ 0.05, 0.28, -0.96 ], color: 0xfff2e0, intensity: 0.85 },
	},

	lighttent: {
		label: 'Light Tent',
		hint: 'Bright, near-uniform wrap. Best for judging true albedo and colour.',
		sky: { top: [ 0.85, 0.87, 0.9 ], horizon: [ 0.62, 0.64, 0.67 ], bottom: [ 0.28, 0.29, 0.30 ], exposure: 1 },
		panels: [
			{ p: [ 0, 5.4, 0 ], r: [ -1.57, 0, 0 ], s: [ 7, 7 ], c: [ 1, 1, 1 ], i: 9 },
			{ p: [ -4.4, 1.4, 0 ], r: [ 0, 1.57, 0 ], s: [ 6, 4 ], c: [ 1, 1, 1 ], i: 5 },
			{ p: [ 4.4, 1.4, 0 ], r: [ 0, -1.57, 0 ], s: [ 6, 4 ], c: [ 1, 1, 1 ], i: 5 },
			{ p: [ 0, 1.4, -4.4 ], r: [ 0, 0, 0 ], s: [ 6, 4 ], c: [ 1, 1, 1 ], i: 4 },
		],
		key: { dir: [ -0.4, 0.86, 0.32 ], color: 0xffffff, intensity: 0.7 },
		fill: { dir: [ 0.8, 0.3, 0.4 ], color: 0xffffff, intensity: 0.4 },
		rim: { dir: [ 0.1, 0.4, -0.9 ], color: 0xffffff, intensity: 0.3 },
	},

	garage: {
		label: 'Underground Garage',
		hint: 'Long ceiling strips over dark concrete. Long, stretched highlights along the bodywork.',
		sky: { top: [ 0.020, 0.021, 0.024 ], horizon: [ 0.045, 0.045, 0.048 ], bottom: [ 0.018, 0.018, 0.020 ], exposure: 1 },
		panels: [
			{ p: [ -2.2, 4.2, -3.0 ], r: [ -1.57, 0, 0 ], s: [ 0.5, 7.0 ], c: [ 1, 0.97, 0.92 ], i: 42, f: 0.2 },
			{ p: [ 2.2, 4.2, -3.0 ], r: [ -1.57, 0, 0 ], s: [ 0.5, 7.0 ], c: [ 1, 0.97, 0.92 ], i: 42, f: 0.2 },
			{ p: [ -2.2, 4.2, 3.0 ], r: [ -1.57, 0, 0 ], s: [ 0.5, 7.0 ], c: [ 1, 0.97, 0.92 ], i: 34, f: 0.2 },
			{ p: [ 2.2, 4.2, 3.0 ], r: [ -1.57, 0, 0 ], s: [ 0.5, 7.0 ], c: [ 1, 0.97, 0.92 ], i: 34, f: 0.2 },
			{ p: [ 0, 4.6, 0 ], r: [ -1.57, 0, 0 ], s: [ 6, 8 ], c: [ 0.35, 0.36, 0.38 ], i: 1.2, f: 0.1 },
			{ p: [ 0, -1.2, 0 ], r: [ 1.57, 0, 0 ], s: [ 10, 10 ], c: [ 0.16, 0.16, 0.17 ], i: 1.0, f: 0.02 },
		],
		key: { dir: [ -0.2, 0.95, 0.24 ], color: 0xfff4e2, intensity: 1.15 },
		fill: { dir: [ 0.85, 0.2, -0.3 ], color: 0xcfe0ff, intensity: 0.25 },
		rim: { dir: [ 0.0, 0.15, -0.99 ], color: 0xffe9cc, intensity: 0.5 },
	},

	sunset: {
		label: 'Golden Hour',
		hint: 'Low warm sun against a purple-blue sky. Shows off flop and pearl shift.',
		sky: {
			top: [ 0.055, 0.085, 0.20 ], horizon: [ 0.85, 0.38, 0.16 ], bottom: [ 0.05, 0.045, 0.05 ],
			exposure: 1,
		},
		sun: { dir: [ -0.82, 0.13, -0.55 ], color: [ 1.0, 0.62, 0.30 ], size: 0.035, intensity: 26 },
		panels: [
			{ p: [ 0, -1.0, 0 ], r: [ 1.57, 0, 0 ], s: [ 12, 12 ], c: [ 0.10, 0.075, 0.06 ], i: 1.4, f: 0.02 },
			{ p: [ 2.0, 1.0, 5.0 ], r: [ 0, 2.7, 0 ], s: [ 7, 3 ], c: [ 0.55, 0.32, 0.22 ], i: 1.6, f: 0.1 },
		],
		key: { dir: [ -0.82, 0.16, -0.55 ], color: 0xffb066, intensity: 2.6 },
		fill: { dir: [ 0.6, 0.35, 0.7 ], color: 0x6f86c8, intensity: 0.5 },
		rim: { dir: [ 0.3, 0.5, 0.8 ], color: 0xffd9a8, intensity: 0.5 },
	},

	overcast: {
		label: 'Overcast',
		hint: 'Huge soft sky, no hard source. Flattest, most forgiving light.',
		sky: { top: [ 0.30, 0.32, 0.35 ], horizon: [ 0.42, 0.44, 0.47 ], bottom: [ 0.10, 0.105, 0.11 ], exposure: 1 },
		panels: [
			{ p: [ 0, 6.0, 0 ], r: [ -1.57, 0, 0 ], s: [ 12, 12 ], c: [ 0.9, 0.93, 1.0 ], i: 3.2, f: 0.02 },
			{ p: [ 0, -1.0, 0 ], r: [ 1.57, 0, 0 ], s: [ 12, 12 ], c: [ 0.16, 0.17, 0.18 ], i: 1.0, f: 0.02 },
		],
		key: { dir: [ -0.3, 0.95, 0.1 ], color: 0xeaf0ff, intensity: 0.75 },
		fill: { dir: [ 0.7, 0.4, 0.5 ], color: 0xdfe6f2, intensity: 0.45 },
		rim: { dir: [ 0.1, 0.3, -0.95 ], color: 0xffffff, intensity: 0.2 },
	},

	night: {
		label: 'Night City',
		hint: 'Sodium street light plus cold neon strips — the harshest test for flake sparkle.',
		sky: { top: [ 0.006, 0.010, 0.026 ], horizon: [ 0.026, 0.030, 0.052 ], bottom: [ 0.008, 0.009, 0.012 ], exposure: 1 },
		panels: [
			{ p: [ -3.4, 2.4, 1.6 ], r: [ -0.2, -0.9, 0.2 ], s: [ 0.35, 3.4 ], c: [ 1.0, 0.16, 0.42 ], i: 16, f: 0.15 },
			{ p: [ 3.6, 2.8, -0.6 ], r: [ -0.2, 0.95, -0.15 ], s: [ 0.35, 3.0 ], c: [ 0.12, 0.65, 1.0 ], i: 14, f: 0.15 },
			{ p: [ 0.4, 4.4, -3.2 ], r: [ -0.6, 0.1, 0 ], s: [ 2.2, 0.28 ], c: [ 1.0, 0.62, 0.18 ], i: 20, f: 0.2 },
			{ p: [ -1.8, 1.0, 4.2 ], r: [ 0, 2.8, 0 ], s: [ 3.0, 0.22 ], c: [ 0.45, 1.0, 0.75 ], i: 9, f: 0.2 },
			{ p: [ 0, -1.2, 0 ], r: [ 1.57, 0, 0 ], s: [ 11, 11 ], c: [ 0.05, 0.05, 0.06 ], i: 1.2, f: 0.02 },
		],
		key: { dir: [ 0.1, 0.75, -0.65 ], color: 0xffa64d, intensity: 0.85 },
		fill: { dir: [ -0.85, 0.2, 0.4 ], color: 0x3d7dff, intensity: 0.45 },
		rim: { dir: [ 0.9, 0.25, -0.35 ], color: 0xff3d7a, intensity: 0.5 },
	},

	neutral: {
		label: 'Neutral Grey',
		hint: 'Flat 18%-grey surround. Reference lighting for checking colour accuracy.',
		sky: { top: [ 0.18, 0.18, 0.18 ], horizon: [ 0.18, 0.18, 0.18 ], bottom: [ 0.18, 0.18, 0.18 ], exposure: 1 },
		panels: [
			{ p: [ 0, 4.6, 0 ], r: [ -1.57, 0, 0 ], s: [ 6, 6 ], c: [ 1, 1, 1 ], i: 4.5, f: 0.05 },
		],
		key: { dir: [ -0.5, 0.8, 0.35 ], color: 0xffffff, intensity: 1.0 },
		fill: { dir: [ 0.8, 0.3, 0.4 ], color: 0xffffff, intensity: 0.5 },
		rim: { dir: [ 0.1, 0.3, -0.95 ], color: 0xffffff, intensity: 0.3 },
	},
};

/* ------------------------------------------------------------------ */
/* Builder                                                              */
/* ------------------------------------------------------------------ */
export class EnvironmentBuilder {
	constructor( renderer ) {
		this.renderer = renderer;
		this.pmrem = new THREE.PMREMGenerator( renderer );
		this.pmrem.compileEquirectangularShader();
		this._cache = new Map();
		this._scene = new THREE.Scene();
	}

	_buildScene( cfg ) {
		const s = this._scene;
		while ( s.children.length ) {
			const c = s.children.pop();
			c.traverse( ( o ) => {
				if ( o.geometry ) o.geometry.dispose();
				if ( o.material ) o.material.dispose();
			} );
		}

		const skyMat = skyMaterial( cfg );
		if ( cfg.sun ) {
			skyMat.uniforms.uSunDir.value.set( ...cfg.sun.dir ).normalize();
			skyMat.uniforms.uSunColor.value.setRGB( cfg.sun.color[ 0 ], cfg.sun.color[ 1 ], cfg.sun.color[ 2 ] );
			skyMat.uniforms.uSunSize.value = cfg.sun.size;
			skyMat.uniforms.uSunIntensity.value = cfg.sun.intensity;
		}
		const sky = new THREE.Mesh( new THREE.SphereGeometry( 40, 48, 32 ), skyMat );
		sky.renderOrder = -10;
		s.add( sky );

		for ( const p of ( cfg.panels || [] ) ) {
			const m = panel( p.s[ 0 ], p.s[ 1 ], p.c, p.i, p.f !== undefined ? p.f : 0.62 );
			m.position.set( ...p.p );
			m.rotation.set( ...p.r );
			m.renderOrder = 1;
			s.add( m );
		}
		return s;
	}

	/** Build (or fetch from cache) the PMREM environment texture for a rig. */
	get( id ) {
		if ( this._cache.has( id ) ) return this._cache.get( id );
		const cfg = ENV_PRESETS[ id ] || ENV_PRESETS.studio;
		const scene = this._buildScene( cfg );
		const rt = this.pmrem.fromScene( scene, 0.0, 0.1, 100 );
		this._cache.set( id, rt.texture );
		return rt.texture;
	}

	/** The raw (unprefiltered) env scene, used as a visible background. */
	getBackgroundScene( id ) {
		return this._buildScene( ENV_PRESETS[ id ] || ENV_PRESETS.studio );
	}

	applyLights( rig, id ) {
		const cfg = ENV_PRESETS[ id ] || ENV_PRESETS.studio;
		rig.key.color.set( cfg.key.color );
		rig.key.intensity = cfg.key.intensity;
		rig.key.position.set( ...cfg.key.dir ).multiplyScalar( 6 );

		rig.fill.color.set( cfg.fill.color );
		rig.fill.intensity = cfg.fill.intensity;
		rig.fill.position.set( ...cfg.fill.dir ).multiplyScalar( 6 );

		rig.rim.color.set( cfg.rim.color );
		rig.rim.intensity = cfg.rim.intensity;
		rig.rim.position.set( ...cfg.rim.dir ).multiplyScalar( 6 );
	}

	dispose() {
		for ( const tex of this._cache.values() ) tex.dispose();
		this._cache.clear();
		this.pmrem.dispose();
	}
}

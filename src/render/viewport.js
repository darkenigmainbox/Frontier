/**
 * FRONTIER — Viewport
 *
 * WebGL2 renderer, procedural studio environment, orbit camera, MSAA HDR
 * composer with bloom (flake sparkle needs it), a grade pass, and a slot based
 * material assignment system.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { EnvironmentBuilder, ENV_PRESETS } from './environment.js';
import { buildAsset, ASSET_ORDER } from './assets.js';
import { createProceduralMaterial } from '../shaders/createMaterial.js';
import { PRESET_BY_ID, MATERIAL_LIBRARY } from '../core/library.js';
import { schemaDefaults } from '../core/schema.js';

/* ------------------------------------------------------------------ */
/* Procedural backdrop & floor                                          */
/* ------------------------------------------------------------------ */
export const BACKDROP_VERT = /* glsl */`
varying vec3 vDir;
void main() {
	vDir = normalize( position );
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`;

export const BACKDROP_FRAG = /* glsl */`
uniform vec3 uTop;
uniform vec3 uMid;
uniform vec3 uBottom;
uniform float uVignette;
varying vec3 vDir;
void main() {
	float h = vDir.y;
	vec3 c = h > 0.0 ? mix( uMid, uTop, pow( h, 0.7 ) )
	                 : mix( uMid, uBottom, pow( -h, 0.5 ) );
	gl_FragColor = vec4( c, 1.0 );
}`;

export const GradeShader = {
	name: 'FrontierGradeShader',
	uniforms: {
		tDiffuse:    { value: null },
		uTime:       { value: 0 },
		uVignette:   { value: 0.55 },
		uGrain:      { value: 0.16 },
		uAberration: { value: 0.35 },
		uSaturation: { value: 1.0 },
		uContrast:   { value: 1.0 },
	},
	vertexShader: /* glsl */`
		varying vec2 vUvG;
		void main() { vUvG = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }`,
	fragmentShader: /* glsl */`
		uniform sampler2D tDiffuse;
		uniform float uTime, uVignette, uGrain, uAberration, uSaturation, uContrast;
		varying vec2 vUvG;
		float hash21( vec2 p ) {
			vec3 p3 = fract( vec3( p.xyx ) * 0.1031 );
			p3 += dot( p3, p3.yzx + 33.33 );
			return fract( ( p3.x + p3.y ) * p3.z );
		}
		void main() {
			vec2 uv = vUvG;
			vec2 d = uv - 0.5;
			float r2 = dot( d, d );
			/* subtle lens chromatic aberration, scales with radius */
			vec2 off = d * r2 * uAberration * 0.030;
			vec3 col;
			col.r = texture2D( tDiffuse, uv + off ).r;
			col.g = texture2D( tDiffuse, uv ).g;
			col.b = texture2D( tDiffuse, uv - off ).b;
			/* vignette */
			col *= mix( 1.0, smoothstep( 0.92, 0.18, r2 * 1.35 ), uVignette );
			/* saturation + contrast around Rec.709 luma */
			float l = dot( col, vec3( 0.2126, 0.7152, 0.0722 ) );
			col = mix( vec3( l ), col, uSaturation );
			col = ( col - 0.5 ) * uContrast + 0.5;
			/* animated procedural film grain */
			float g = hash21( uv * vec2( 1920.0, 1080.0 ) + fract( uTime ) * 91.7 ) - 0.5;
			col += g * uGrain * 0.055;
			gl_FragColor = vec4( max( col, 0.0 ), 1.0 );
		}`,
};

export const GRID_SHADER = {
	name: 'FrontierGridShader',
	uniforms: {
		uColor:   { value: new THREE.Color().setRGB( 0.35, 0.38, 0.44 ) },
		uOpacity: { value: 0.16 },
	},
	vertexShader: /* glsl */`
		varying vec2 vP;
		void main() {
			vP = position.xy;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		}`,
	fragmentShader: /* glsl */`
		uniform vec3 uColor;
		uniform float uOpacity;
		varying vec2 vP;
		float gridLine( vec2 p, float scale, float w ) {
			vec2 g = abs( fract( p * scale - 0.5 ) - 0.5 ) / fwidth( p * scale );
			return 1.0 - smoothstep( 0.0, w, min( g.x, g.y ) );
		}
		void main() {
			float minor = gridLine( vP, 10.0, 1.2 );
			float major = gridLine( vP, 1.0, 1.6 );
			float r = length( vP );
			float fade = 1.0 - smoothstep( 0.6, 3.4, r );
			float rings = 1.0 - smoothstep( 0.0, 1.4, abs( fract( r - 0.5 ) - 0.5 ) / fwidth( r ) );
			float a = max( minor * 0.45, major ) * fade * uOpacity + rings * fade * uOpacity * 0.5;
			if ( a < 0.002 ) discard;
			gl_FragColor = vec4( uColor, a );
		}`,
};

/** Studio floor: a glossy dark disc whose alpha fades out with radius so it
 *  melts into the backdrop instead of ending in a hard circle. Procedural. */
export function createFloorMaterial() {
	const mat = new THREE.MeshPhysicalMaterial( {
		color: new THREE.Color().setRGB( 0.016, 0.017, 0.020 ),
		roughness: 0.16, metalness: 0.0, clearcoat: 1.0, clearcoatRoughness: 0.10,
		transparent: true, envMapIntensity: 0.9,
	} );
	mat.onBeforeCompile = ( shader ) => {
		shader.uniforms.uFadeStart = { value: 1.5 };
		shader.uniforms.uFadeEnd = { value: 4.6 };
		shader.vertexShader = shader.vertexShader
			.replace( '#include <common>', '#include <common>\nvarying vec3 frkFloorW;' )
			.replace( '#include <project_vertex>',
				'#include <project_vertex>\nfrkFloorW = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;' );
		shader.fragmentShader = shader.fragmentShader
			.replace( '#include <common>',
				'#include <common>\nvarying vec3 frkFloorW;\nuniform float uFadeStart;\nuniform float uFadeEnd;' )
			.replace( '#include <color_fragment>',
				'#include <color_fragment>\ndiffuseColor.a *= 1.0 - smoothstep( uFadeStart, uFadeEnd, length( frkFloorW.xz ) );' );
	};
	mat.customProgramCacheKey = () => 'frontier-floor';
	return mat;
}

/* ------------------------------------------------------------------ */
export class Viewport {
	constructor( canvas, onChange ) {
		this.canvas = canvas;
		this.onChange = onChange || ( () => {} );

		this.renderer = new THREE.WebGLRenderer( {
			canvas, antialias: false, alpha: false, powerPreference: 'high-performance',
			stencil: false, preserveDrawingBuffer: true,
		} );
		this.renderer.setPixelRatio( Math.min( window.devicePixelRatio || 1, 2 ) );
		this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
		this.renderer.toneMappingExposure = 1.0;
		this.renderer.outputColorSpace = THREE.SRGBColorSpace;
		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

		this.scene = new THREE.Scene();
		this.camera = new THREE.PerspectiveCamera( 34, 1, 0.01, 200 );
		this.camera.position.set( 1.2, 0.9, 1.6 );

		this.controls = new OrbitControls( this.camera, canvas );
		this.controls.enableDamping = true;
		this.controls.dampingFactor = 0.075;
		this.controls.minDistance = 0.12;
		this.controls.maxDistance = 12;
		this.controls.maxPolarAngle = Math.PI * 0.93;
		this.controls.target.set( 0, 0.1, 0 );

		this.env = new EnvironmentBuilder( this.renderer );

		/* --- light rig ------------------------------------------------ */
		this.rig = {};
		this.rig.key = new THREE.DirectionalLight( 0xffffff, 1.5 );
		this.rig.key.castShadow = true;
		this.rig.key.shadow.mapSize.set( 2048, 2048 );
		this.rig.key.shadow.camera.near = 0.5;
		this.rig.key.shadow.camera.far = 18;
		this.rig.key.shadow.camera.left = -1.8;
		this.rig.key.shadow.camera.right = 1.8;
		this.rig.key.shadow.camera.top = 1.8;
		this.rig.key.shadow.camera.bottom = -1.8;
		this.rig.key.shadow.bias = -0.0006;
		this.rig.key.shadow.normalBias = 0.012;
		this.rig.key.shadow.radius = 3.2;
		this.scene.add( this.rig.key, this.rig.key.target );

		this.rig.fill = new THREE.DirectionalLight( 0xdfe8ff, 0.55 );
		this.scene.add( this.rig.fill );
		this.rig.rim = new THREE.DirectionalLight( 0xfff2e0, 0.85 );
		this.scene.add( this.rig.rim );
		this.rig.ambient = new THREE.AmbientLight( 0xffffff, 0.04 );
		this.scene.add( this.rig.ambient );

		/* --- backdrop ------------------------------------------------- */
		this.backdrop = new THREE.Mesh(
			new THREE.SphereGeometry( 60, 48, 32 ),
			new THREE.ShaderMaterial( {
				side: THREE.BackSide, depthWrite: false,
				uniforms: {
					uTop:    { value: new THREE.Color().setRGB( 0.020, 0.022, 0.026 ) },
					uMid:    { value: new THREE.Color().setRGB( 0.038, 0.041, 0.046 ) },
					uBottom: { value: new THREE.Color().setRGB( 0.008, 0.009, 0.010 ) },
				},
				vertexShader: BACKDROP_VERT, fragmentShader: BACKDROP_FRAG,
			} )
		);
		this.backdrop.renderOrder = -10;
		this.backdrop.frustumCulled = false;
		this.scene.add( this.backdrop );

		/* --- studio floor --------------------------------------------- */
		this.floorGroup = new THREE.Group();
		this.scene.add( this.floorGroup );

		this.floorMat = createFloorMaterial();

		this.floor = new THREE.Mesh( new THREE.CircleGeometry( 6, 96 ), this.floorMat );
		this.floor.rotation.x = -Math.PI / 2;
		this.floor.receiveShadow = true;
		this.floorGroup.add( this.floor );

		/* procedural grid, drawn on the floor with a shader (no textures) */
		this.grid = new THREE.Mesh(
			new THREE.CircleGeometry( 5, 96 ),
			new THREE.ShaderMaterial( {
				transparent: true,
				depthWrite: false,
				uniforms: THREE.UniformsUtils.clone( GRID_SHADER.uniforms ),
				vertexShader: GRID_SHADER.vertexShader,
				fragmentShader: GRID_SHADER.fragmentShader,
			} )
		);
		this.grid.rotation.x = -Math.PI / 2;
		this.grid.position.y = 0.0012;
		this.grid.visible = false;
		this.floorGroup.add( this.grid );

		/* --- composer --------------------------------------------------- */
		const size = this.renderer.getDrawingBufferSize( new THREE.Vector2() );
		this.rt = new THREE.WebGLRenderTarget( Math.max( 2, size.x ), Math.max( 2, size.y ), {
			type: THREE.HalfFloatType, samples: 4, colorSpace: THREE.LinearSRGBColorSpace,
		} );
		this.composer = new EffectComposer( this.renderer, this.rt );
		this.renderPass = new RenderPass( this.scene, this.camera );
		this.composer.addPass( this.renderPass );

		this.bloomPass = new UnrealBloomPass( new THREE.Vector2( size.x, size.y ), 0.36, 0.55, 0.82 );
		this.composer.addPass( this.bloomPass );

		this.gradePass = new ShaderPass( GradeShader );
		this.composer.addPass( this.gradePass );

		this.outputPass = new OutputPass();
		this.composer.addPass( this.outputPass );

		/* --- state ------------------------------------------------------- */
		this.asset = null;
		this.assetId = null;
		this.slotHandles = {};         /* slotId -> material handle          */
		this.activeSlot = null;
		this.envId = 'studio';
		this.settings = {
			envIntensity: 1.0,
			exposure: 1.0,
			bloom: 0.36,
			vignette: 0.55,
			grain: 0.16,
			aberration: 0.35,
			saturation: 1.0,
			contrast: 1.0,
			shadows: true,
			grid: false,
			floor: true,
			wireframe: false,
			turntable: false,
			turntableSpeed: 0.35,
			showEnv: false,
		};

		this.raycaster = new THREE.Raycaster();
		this.pointer = new THREE.Vector2();
		this.hoverSlot = null;
		this.clock = new THREE.Clock();
		this.frame = 0;
		this.fps = 0;
		this._fpsAcc = 0;
		this._fpsFrames = 0;

		this._bindPointer();
		this.resize();
		this.setEnvironment( 'studio' );
	}

	/* ---------------------------------------------------------------- */
	_bindPointer() {
		const c = this.canvas;
		const toNdc = ( e ) => {
			const r = c.getBoundingClientRect();
			this.pointer.x = ( ( e.clientX - r.left ) / r.width ) * 2 - 1;
			this.pointer.y = -( ( e.clientY - r.top ) / r.height ) * 2 + 1;
		};
		let down = null;
		c.addEventListener( 'pointerdown', ( e ) => { down = { x: e.clientX, y: e.clientY }; } );
		c.addEventListener( 'pointerup', ( e ) => {
			if ( ! down ) return;
			const moved = Math.hypot( e.clientX - down.x, e.clientY - down.y );
			down = null;
			if ( moved > 5 ) return;
			toNdc( e );
			const hit = this._pick();
			if ( hit ) {
				this.activeSlot = hit;
				this.onChange( { type: 'slot', slot: hit } );
			}
		} );
		c.addEventListener( 'pointermove', ( e ) => {
			toNdc( e );
			this._pointerDirty = true;
		} );
		c.addEventListener( 'pointerleave', () => {
			if ( this.hoverSlot ) { this.hoverSlot = null; this.onChange( { type: 'hover', slot: null } ); }
		} );
	}

	_pick() {
		if ( ! this.asset ) return null;
		this.raycaster.setFromCamera( this.pointer, this.camera );
		const hits = this.raycaster.intersectObject( this.asset.group, true );
		for ( const h of hits ) {
			if ( h.object.isMesh && h.object.userData.slot ) return h.object.userData.slot;
		}
		return null;
	}

	/* ---------------------------------------------------------------- */
	setEnvironment( id ) {
		this.envId = id;
		const tex = this.env.get( id );
		this.scene.environment = tex;
		this.env.applyLights( this.rig, id );
		this.backdrop.visible = ! this.settings.showEnv;
		if ( this.settings.showEnv ) {
			this.scene.background = tex;
			this.scene.backgroundIntensity = 0.55;
		} else {
			this.scene.background = null;
		}
		this._tuneBackdrop( id );
		this.onChange( { type: 'env', id } );
	}

	_tuneBackdrop( id ) {
		const cfg = ENV_PRESETS[ id ] || ENV_PRESETS.studio;
		const u = this.backdrop.material.uniforms;
		u.uTop.value.setRGB( cfg.sky.top[ 0 ] * 0.55, cfg.sky.top[ 1 ] * 0.55, cfg.sky.top[ 2 ] * 0.55 );
		u.uMid.value.setRGB( cfg.sky.horizon[ 0 ] * 0.7, cfg.sky.horizon[ 1 ] * 0.7, cfg.sky.horizon[ 2 ] * 0.7 );
		u.uBottom.value.setRGB( cfg.sky.bottom[ 0 ] * 0.5, cfg.sky.bottom[ 1 ] * 0.5, cfg.sky.bottom[ 2 ] * 0.5 );
	}

	/* ---------------------------------------------------------------- */
	setAsset( id ) {
		if ( ! ASSET_ORDER.includes( id ) ) return;
		if ( this.asset ) {
			this.scene.remove( this.asset.group );
			this.asset.group.traverse( ( o ) => { if ( o.isMesh && o.geometry ) o.geometry.dispose(); } );
		}
		for ( const k in this.slotHandles ) {
			this.slotHandles[ k ].material.dispose();
			delete this.slotHandles[ k ];
		}

		this.assetId = id;
		this.asset = buildAsset( id );
		this.scene.add( this.asset.group );

		/* every slot gets its default library preset */
		for ( const slot of this.asset.slots ) {
			this.applyPreset( slot.id, slot.preset, true );
		}
		const primary = this.asset.slots.find( ( s ) => s.primary ) || this.asset.slots[ 0 ];
		this.activeSlot = primary.id;

		this._liftToFloor();
		this.frameAsset();
		this.controls.update();
		this.onChange( { type: 'asset', id } );
	}

	/** Drop the asset so it rests on the studio floor. */
	_liftToFloor() {
		this.asset.group.updateMatrixWorld( true );
		const box = new THREE.Box3().setFromObject( this.asset.group );
		this.liftY = Number.isFinite( box.min.y ) ? -box.min.y : 0;
		this.asset.group.position.y = this.liftY;
		this.assetBounds = box.clone().translate( new THREE.Vector3( 0, this.liftY, 0 ) );
	}

	/** Auto-frame: keep the asset's declared viewing angle but solve the distance
	 *  from the bounding sphere so every asset fits the vertical and horizontal
	 *  field of view with a consistent amount of breathing room. */
	frameAsset( pad = 1.14 ) {
		const c = this.asset.camera;
		const box = this.assetBounds || new THREE.Box3().setFromObject( this.asset.group );
		const sphere = box.getBoundingSphere( new THREE.Sphere() );
		if ( ! Number.isFinite( sphere.radius ) || sphere.radius <= 0 ) return;

		const fov = this.camera.fov * Math.PI / 180;
		const aspect = this.camera.aspect > 0.05 ? this.camera.aspect : 1.6;
		const distV = sphere.radius / Math.sin( fov / 2 );
		const distH = sphere.radius / Math.sin( Math.atan( Math.tan( fov / 2 ) * aspect ) );
		const dist = Math.max( distV, distH ) * pad;

		const dir = new THREE.Vector3( c.pos[ 0 ] - c.target[ 0 ], c.pos[ 1 ] - c.target[ 1 ], c.pos[ 2 ] - c.target[ 2 ] );
		if ( dir.lengthSq() < 1e-8 ) dir.set( 0.7, 0.5, 1.0 );
		dir.normalize();

		this.controls.target.copy( sphere.center );
		this.camera.position.copy( sphere.center ).addScaledVector( dir, dist );
		this.camera.near = Math.max( 0.005, dist / 200 );
		this.camera.far = dist * 120;
		this.camera.updateProjectionMatrix();
		this.controls.minDistance = dist * 0.12;
		this.controls.maxDistance = dist * 8;
		this.controls.update();
	}

	/* ---------------------------------------------------------------- */
	applyPreset( slotId, presetId, quiet ) {
		const preset = PRESET_BY_ID.get( presetId );
		if ( ! preset || ! this.asset ) return null;
		const slot = this.asset.slots.find( ( s ) => s.id === slotId );
		if ( ! slot ) return null;

		const old = this.slotHandles[ slotId ];
		if ( old ) { old.material.dispose(); }

		const values = { ...schemaDefaults( preset.family ), ...preset.values };
		const handle = createProceduralMaterial( preset.family, values );
		handle.presetId = presetId;
		handle.presetName = preset.name;
		this.slotHandles[ slotId ] = handle;

		handle.material.envMapIntensity = this.settings.envIntensity;
		handle.material.wireframe = this.settings.wireframe;
		/* some parts are light sources, not just surfaces */
		if ( slot.emissive ) {
			handle.material.emissive.set( slot.emissive.color || '#ffffff' );
			handle.material.emissiveIntensity = slot.emissive.intensity !== undefined ? slot.emissive.intensity : 1;
		}
		for ( const m of ( this.asset.slotMeshes[ slotId ] || [] ) ) {
			m.material = handle.material;
		}
		if ( ! quiet ) this.onChange( { type: 'preset', slot: slotId, presetId } );
		return handle;
	}

	activeHandle() {
		return this.slotHandles[ this.activeSlot ] || null;
	}

	setParam( key, value ) {
		const h = this.activeHandle();
		if ( h ) h.set( key, value );
	}

	setSetting( key, value ) {
		this.settings[ key ] = value;
		switch ( key ) {
			case 'envIntensity':
				for ( const k in this.slotHandles ) this.slotHandles[ k ].material.envMapIntensity = value;
				this.rig.ambient.intensity = 0.04 * value;
				break;
			case 'exposure': this.renderer.toneMappingExposure = value; break;
			case 'bloom': this.bloomPass.strength = value; break;
			case 'vignette': this.gradePass.uniforms.uVignette.value = value; break;
			case 'grain': this.gradePass.uniforms.uGrain.value = value; break;
			case 'aberration': this.gradePass.uniforms.uAberration.value = value; break;
			case 'saturation': this.gradePass.uniforms.uSaturation.value = value; break;
			case 'contrast': this.gradePass.uniforms.uContrast.value = value; break;
			case 'shadows':
				this.renderer.shadowMap.enabled = value;
				this.rig.key.castShadow = value;
				this.scene.traverse( ( o ) => { if ( o.isMesh && o.material ) o.material.needsUpdate = true; } );
				break;
			case 'grid': this.grid.visible = value; break;
			case 'floor': this.floorGroup.visible = value || this.grid.visible; break;
			case 'wireframe':
				for ( const k in this.slotHandles ) this.slotHandles[ k ].material.wireframe = value;
				break;
			case 'showEnv': this.setEnvironment( this.envId ); break;
		}
	}

	resize() {
		const w = this.canvas.clientWidth || 1;
		const h = this.canvas.clientHeight || 1;
		const pr = this.renderer.getPixelRatio();
		this.renderer.setSize( w, h, false );
		this.composer.setSize( w, h );
		this.composer.setPixelRatio( pr );
		this.bloomPass.setSize( w * pr, h * pr );
		this.camera.aspect = w / h;
		this.camera.updateProjectionMatrix();
	}

	screenshot() {
		this.render();
		return this.renderer.domElement.toDataURL( 'image/png' );
	}

	render() {
		const dt = this.clock.getDelta();
		/* hover picking is throttled: raycasting a 50k-tri asset every mousemove
		   would eat the frame budget */
		if ( this._pointerDirty && ( this.frame % 3 === 0 ) ) {
			this._pointerDirty = false;
			const hit = this._pick();
			if ( hit !== this.hoverSlot ) {
				this.hoverSlot = hit;
				this.canvas.style.cursor = hit ? 'pointer' : 'default';
				this.onChange( { type: 'hover', slot: hit } );
			}
		}
		if ( this.settings.turntable && this.asset ) {
			this.asset.group.rotation.y += dt * this.settings.turntableSpeed;
		}
		this.gradePass.uniforms.uTime.value += dt;
		this.controls.update();
		this.composer.render();

		/* stats */
		this._fpsAcc += dt;
		this._fpsFrames ++;
		if ( this._fpsAcc >= 0.5 ) {
			this.fps = Math.round( this._fpsFrames / this._fpsAcc );
			this._fpsAcc = 0; this._fpsFrames = 0;
			this.onChange( { type: 'stats', fps: this.fps, info: this.renderer.info.render } );
		}
		this.frame ++;
	}

	start() {
		if ( this._raf ) return;
		const loop = () => {
			this._raf = requestAnimationFrame( loop );
			this.render();
		};
		loop();
	}

	stop() {
		if ( this._raf ) cancelAnimationFrame( this._raf );
		this._raf = null;
	}
}

export { ASSET_ORDER, MATERIAL_LIBRARY };

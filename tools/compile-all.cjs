/**
 * FRONTIER — full shader compilation gate.
 *
 * Every GLSL string the app can hand to the GPU is assembled here exactly the
 * way three.js assembles it, rewritten into Vulkan GLSL 4.50, and compiled by a
 * real glslang front end. Covers the eight procedural material families (both
 * stages), the procedural environment rig, the backdrop, the floor injection,
 * the ground grid and the post-processing grade pass.
 *
 *   node tools/compile-all.cjs [--keep]
 */

const path = require( 'path' );
const fs = require( 'fs' );
const { spawnSync } = require( 'child_process' );

const HERE = __dirname;
const OUT = path.join( HERE, '.glsl-out' );
const WORKER = path.join( HERE, 'glslang-worker.cjs' );

const PLAIN_UNIFORM = /^\s*uniform\s+(?!sampler|isampler|usampler|image)([\w]+)\s+([^;]+);/;
const SAMPLER_UNIFORM = /^(\s*)uniform\s+(sampler\w+|isampler\w+|usampler\w+|image\w+)\s+([A-Za-z_]\w*)\s*(\[[^\]]*\])?\s*;/;
const BUILTIN = new Set( ( 'float int uint bool vec2 vec3 vec4 ivec2 ivec3 ivec4 bvec2 bvec3 bvec4 uvec2 uvec3 uvec4 mat2 mat3 mat4' ).split( /\s+/ ) );

function toVulkan( src, stage ) {
	let out = src;

	out = out.replace( '#version 300 es', '#version 450' );
	if ( ! /^#version/m.test( out ) ) out = '#version 450\n' + out;

	/* three's ES-3.00 compatibility defines are meaningless or harmful in 4.50 */
	for ( const d of [
		/^#define varying in$/m, /^#define varying out$/m, /^#define attribute in$/m,
		/^#define gl_FragDepthEXT gl_FragDepth$/m, /^#define texture2DLodEXT textureLod$/m,
		/^#define textureCubeLodEXT textureLod$/m, /^#define texture2DProj textureProj$/m,
		/^#define texture2DProjLodEXT textureProjLod$/m, /^#define texture2DGradEXT textureGrad$/m,
		/^#define texture2DProjGradEXT textureProjGrad$/m, /^#define texture2D texture$/m,
		/^#define textureCube texture$/m,
	] ) out = out.replace( d, '' );

	out = out.replace( /^(\s*)attribute\s+/gm, '$1in ' );
	out = out.replace( /^(\s*)varying\s+/gm, stage === 'vertex' ? '$1out ' : '$1in ' );
	out = out.replace( /\btexture2DProj\s*\(/g, 'textureProj(' );
	out = out.replace( /\btexture2D\s*\(/g, 'texture(' );
	out = out.replace( /\btextureCube\s*\(/g, 'texture(' );
	/* three names a helper parameter "sampler", reserved in GLSL 4.50 but legal in ES 3.00 */
	out = out.replace( /\bsampler\b/g, 'samplerArg' );

	/* loose uniforms -> one std140 block, hoisted above every function so that
	   viewMatrix & friends are visible to the chunk helpers */
	let block = [];
	const kept = [];
	for ( const line of out.split( '\n' ) ) {
		const m = line.trim().match( PLAIN_UNIFORM );
		if ( m ) {
			kept.push( '' );
			/* a comma separated declaration expands to one block member each;
			   arrays whose size is not a literal live inside preprocessor guards
			   we did not enable (morph targets, shadows) so they are dropped */
			for ( let part of m[ 2 ].split( ',' ) ) {
				part = part.trim();
				if ( ! part ) continue;
				const am = part.match( /^([A-Za-z_]\w*)\s*(\[[^\]]*\])?$/ );
				if ( ! am ) continue;
				if ( am[ 2 ] && ! /^\[\s*\d+\s*\]$/.test( am[ 2 ] ) ) continue;
				if ( am[ 2 ] && /^\[\s*0\s*\]$/.test( am[ 2 ] ) ) continue;
				block.push( { type: m[ 1 ], decl: `${m[ 1 ]} ${am[ 1 ]}${am[ 2 ] || ''};` } );
			}
		} else kept.push( line );
	}
	out = kept.join( '\n' );

	const seen = new Set();
	block = block.filter( ( m ) => {
		const name = m.decl.replace( /\[.*$/, '' ).replace( /;$/, '' ).trim().split( /\s+/ ).pop();
		if ( seen.has( name ) ) return false;
		seen.add( name );
		return true;
	} );

	const structTypes = [ ...new Set( block.map( ( m ) => m.type ).filter( ( t ) => ! BUILTIN.has( t ) ) ) ];
	let hoist = '';
	for ( const st of structTypes ) {
		const mm = out.match( new RegExp( '\\bstruct\\s+' + st + '\\s*\\{[\\s\\S]*?\\}\\s*;' ) );
		if ( mm ) { hoist += mm[ 0 ] + '\n'; out = out.replace( mm[ 0 ], '' ); }
	}

	let binding = 1;
	out = out.replace( new RegExp( SAMPLER_UNIFORM.source, 'gm' ),
		( w, indent, type, name, arr ) => `${indent}layout(set = 0, binding = ${binding ++}) uniform ${type} ${name}${arr || ''};` );

	let locIn = 0, locOut = 0;
	out = out.replace( /^(\s*)in\s+(lowp |mediump |highp )?([\w]+)\s+([A-Za-z_]\w*)\s*;/gm,
		( w, ind, prec, type, name ) => `${ind}layout(location = ${locIn ++}) in ${type} ${name};` );
	if ( stage === 'vertex' ) {
		out = out.replace( /^(\s*)out\s+(lowp |mediump |highp )?([\w]+)\s+([A-Za-z_]\w*)\s*;/gm,
			( w, ind, prec, type, name ) => `${ind}layout(location = ${locOut ++}) out ${type} ${name};` );
	}

	const decl = block.length
		? `${hoist}\nlayout(std140, set = 0, binding = 0) uniform FrkValidationBlock {\n${block.map( ( m ) => '\t' + m.decl ).join( '\n' )}\n};\n`
		: hoist;

	const anchor = out.indexOf( '#define STANDARD' ) >= 0 ? out.indexOf( '#define STANDARD' ) : out.search( /^\s*(void|uniform|layout|struct|vec|float|in |out )/m );
	out = out.slice( 0, anchor ) + decl + '\n' + out.slice( anchor );
	return out;
}

const AUX_PREFIX = {
	vertex: `#version 450
precision highp float;
precision highp int;
uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform mat3 normalMatrix;
uniform vec3 cameraPosition;
uniform bool isOrthographic;
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;
`,
	fragment: `#version 450
precision highp float;
precision highp int;
precision highp sampler2D;
uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform mat3 normalMatrix;
uniform vec3 cameraPosition;
uniform bool isOrthographic;
layout(location = 0) out highp vec4 pc_fragColor;
#define gl_FragColor pc_fragColor
`,
};

( async () => {
	const { assemble, resolveIncludes, unrollLoops } = await import( path.join( HERE, 'validate-shaders.mjs' ) );
	const { FAMILY_SCHEMAS } = await import( path.join( HERE, '../src/core/schema.js' ) );
	const env = await import( path.join( HERE, '../src/render/environment.js' ) );
	const vp = await import( path.join( HERE, '../src/render/viewport.js' ) );

	fs.mkdirSync( OUT, { recursive: true } );
	const jobs = [];

	/* --- the eight procedural material families, both stages --- */
	for ( const family of Object.keys( FAMILY_SCHEMAS ) ) {
		const a = assemble( family );
		jobs.push( { name: `material/${family}`, stage: 'fragment', src: a.fragment } );
		jobs.push( { name: `material/${family}`, stage: 'vertex', src: a.vertex } );
	}

	/* --- floor: physical material + our alpha-fade injection --- */
	{
		const THREE = ( await import( 'three' ) );
		const floor = vp.createFloorMaterial();
		const lib = THREE.ShaderLib.physical;
		const sh = { uniforms: THREE.UniformsUtils.clone( lib.uniforms ), vertexShader: lib.vertexShader, fragmentShader: lib.fragmentShader };
		floor.onBeforeCompile( sh, null );
		const defs = [ 'STANDARD', 'PHYSICAL', 'USE_ENVMAP', 'ENVMAP_TYPE_CUBE_UV', 'USE_CLEARCOAT', 'IOR', 'USE_SPECULAR',
			'ENVMAP_MODE_REFLECTION', 'ENVMAP_BLENDING_NONE', 'CUBEUV_TEXEL_WIDTH 0.0029761904761904765',
			'CUBEUV_TEXEL_HEIGHT 0.00390625', 'CUBEUV_MAX_MIP 6.0' ].map( ( d ) => `#define ${d}` ).join( '\n' );
		/* order matters: the longer names must be substituted first */
		const nums = ( s ) => s.replace( /NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g, 0 )
			.replace( /NUM_SPOT_LIGHT_SHADOWS/g, 0 ).replace( /NUM_SPOT_LIGHT_COORDS/g, 0 )
			.replace( /NUM_SPOT_LIGHT_MAPS/g, 0 ).replace( /NUM_SPOT_LIGHTS/g, 1 )
			.replace( /NUM_DIR_LIGHT_SHADOWS/g, 1 ).replace( /NUM_DIR_LIGHTS/g, 3 )
			.replace( /NUM_POINT_LIGHT_SHADOWS/g, 0 ).replace( /NUM_POINT_LIGHTS/g, 1 )
			.replace( /NUM_RECT_AREA_LIGHTS/g, 0 ).replace( /NUM_HEMI_LIGHTS/g, 0 )
			.replace( /NUM_CLIPPING_PLANES/g, 0 ).replace( /UNION_CLIPPING_PLANES/g, 0 );
		const PREFIX_F = AUX_PREFIX.fragment.replace( '#version 450\n', '' ) + defs + '\nvec4 linearToOutputTexel( vec4 value ) { return value; }\n';
		const PREFIX_V = AUX_PREFIX.vertex.replace( '#version 450\n', '' ) + defs + '\n';
		jobs.push( { name: 'floor-injection', stage: 'fragment',
			src: '#version 450\n' + PREFIX_F + unrollLoops( nums( resolveIncludes( sh.fragmentShader ) ) ) } );
		jobs.push( { name: 'floor-injection', stage: 'vertex',
			src: '#version 450\n' + PREFIX_V + unrollLoops( nums( resolveIncludes( sh.vertexShader ) ) ) } );
	}

	/* --- procedural environment rig, backdrop, grid, grade pass --- */
	jobs.push( { name: 'env/sky-dome', stage: 'vertex', src: AUX_PREFIX.vertex + env.SKY_VERT } );
	jobs.push( { name: 'env/sky-dome', stage: 'fragment', src: AUX_PREFIX.fragment + env.SKY_FRAG } );
	jobs.push( { name: 'env/softbox-panel', stage: 'vertex', src: AUX_PREFIX.vertex + env.PANEL_VERT } );
	jobs.push( { name: 'env/softbox-panel', stage: 'fragment', src: AUX_PREFIX.fragment + env.PANEL_FRAG } );
	jobs.push( { name: 'viewport/backdrop', stage: 'vertex', src: AUX_PREFIX.vertex + vp.BACKDROP_VERT } );
	jobs.push( { name: 'viewport/backdrop', stage: 'fragment', src: AUX_PREFIX.fragment + vp.BACKDROP_FRAG } );
	jobs.push( { name: 'viewport/ground-grid', stage: 'vertex', src: AUX_PREFIX.vertex + vp.GRID_SHADER.vertexShader } );
	jobs.push( { name: 'viewport/ground-grid', stage: 'fragment', src: AUX_PREFIX.fragment + vp.GRID_SHADER.fragmentShader } );
	jobs.push( { name: 'post/grade-pass', stage: 'vertex', src: AUX_PREFIX.vertex + vp.GradeShader.vertexShader } );
	jobs.push( { name: 'post/grade-pass', stage: 'fragment', src: AUX_PREFIX.fragment + vp.GradeShader.fragmentShader } );

	let failed = 0;
	for ( const job of jobs ) {
		const vulkan = toVulkan( job.src, job.stage );
		const file = path.join( OUT, `${job.name.replace( /\//g, '__' )}.${job.stage}.glsl` );
		fs.writeFileSync( file, vulkan );
		const r = spawnSync( process.execPath, [ WORKER, file, job.stage ],
			{ encoding: 'utf8', stdio: [ 'ignore', 'pipe', 'pipe' ], timeout: 180000 } );
		const out = `${r.stdout || ''}\n${r.stderr || ''}`;
		const diags = out.split( '\n' ).map( ( l ) => l.trim() )
			.filter( ( l ) => /^ERROR:|^WARNING:/.test( l ) )
			.filter( ( l ) => ! /deprecated, may be removed/.test( l ) );
		const ok = /@@RESULT@@ OK/.test( out ) && diags.length === 0;
		if ( ok ) console.log( `✓ ${job.name.padEnd( 26 )} ${job.stage.padEnd( 9 )} clean` );
		else {
			failed ++;
			console.log( `✗ ${job.name.padEnd( 26 )} ${job.stage.padEnd( 9 )} ${diags.length} diagnostic(s)` );
			diags.slice( 0, 14 ).forEach( ( d ) => console.log( '     ' + d ) );
			console.log( `     -> tools/.glsl-out/${path.basename( file )}` );
		}
	}

	if ( ! process.argv.includes( '--keep' ) ) fs.rmSync( OUT, { recursive: true, force: true } );
	console.log( failed
		? `\n${failed} of ${jobs.length} shaders FAILED`
		: `\nall ${jobs.length} shaders compile with a real glslang front end` );
	process.exit( failed ? 1 : 0 );
} )().catch( ( e ) => { console.error( e ); process.exit( 2 ); } );

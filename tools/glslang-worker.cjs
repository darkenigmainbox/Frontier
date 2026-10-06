/* Compiles one rewritten shader with glslang and prints the diagnostics. */
const fs = require( 'fs' );
const createGlslang = require( '@webgpu/glslang' );
const file = process.argv[ 2 ];
const stage = process.argv[ 3 ] || 'fragment';
const src = fs.readFileSync( file, 'utf8' );
createGlslang().then( ( g ) => {
	let ok = true;
	try { g.compileGLSL( src, stage, false ); } catch ( e ) { ok = false; }
	console.log( ok ? '@@RESULT@@ OK' : '@@RESULT@@ FAIL' );
	process.exit( 0 );
} ).catch( ( e ) => { console.log( '@@RESULT@@ ERROR ' + e.message ); process.exit( 0 ); } );

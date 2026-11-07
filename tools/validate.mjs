// Validates every WGSL file with naga (the same compiler wgpu/Chrome uses).
// Usage: npm i naga-wasm --no-save && node tools/validate.mjs
import { readFile } from 'node:fs/promises';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

let naga;
try {
  naga = await import('naga-wasm');
} catch {
  console.error('naga-wasm not installed. Run: npm i naga-wasm --no-save');
  process.exit(2);
}

const dir = new URL('../src/', import.meta.url).pathname;
const files = readdirSync(dir).filter((f) => f.endsWith('.wgsl'));
let failed = 0;

for (const file of files) {
  const src = await readFile(join(dir, file), 'utf8');
  process.stdout.write(`• ${file} ... `);
  try {
    const module = naga.parseWgsl(src);
    const info = naga.validate(module);
    // Also exercise the backend writers, which catch a few extra issues.
    naga.writeWgsl(module, info);
    console.log('OK');
  } catch (err) {
    failed++;
    console.log('FAILED');
    console.log(err.formatted || err.message);
  }
}

console.log(failed === 0 ? '\nAll shaders valid.' : `\n${failed} shader(s) failed.`);
process.exit(failed === 0 ? 0 : 1);

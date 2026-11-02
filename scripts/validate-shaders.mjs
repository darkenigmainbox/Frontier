// Offline GLSL ES 3.00 validation of every RawShaderMaterial in the project.
// Mirrors what three.js prepends for RawShaderMaterial + GLSL3:
//   #version 300 es / #define SHADER_TYPE / #define SHADER_NAME / material defines
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { createRequire } from 'node:module';
import { allShaders } from '../src/shaders/index.js';

const require = createRequire(import.meta.url);
const pkgDir = dirname(require.resolve('glslang-validator-prebuilt-predownloaded/package.json'));
const bin = join(pkgDir, 'bin', process.platform === 'darwin' ? 'glslangValidator.darwin' : process.platform === 'win32' ? 'glslangValidator.exe' : 'glslangValidator.linux');
try { chmodSync(bin, 0o755); } catch { /* ignore */ }

const dir = mkdtempSync(join(tmpdir(), 'glsl-'));
let failed = 0, count = 0;
for (const [name, vs, fs, defines = {}] of allShaders()) {
  const defs = Object.entries(defines).map(([k, v]) => `#define ${k} ${v}`).join('\n');
  for (const [stage, src] of [['vert', vs], ['frag', fs]]) {
    const full = `#version 300 es\n#define SHADER_TYPE ${stage}\n#define SHADER_NAME ${name}\n${defs}\n${src}`;
    const file = join(dir, `${name}.${stage}`);
    writeFileSync(file, full);
    count++;
    try {
      execFileSync(bin, [file], { stdio: 'pipe' });
    } catch (e) {
      failed++;
      console.error(`\n✗ ${name}.${stage}\n${(e.stdout || '').toString()}${(e.stderr || '').toString()}`);
    }
  }
}
console.log(`${count - failed}/${count} shader stages valid`);
process.exit(failed ? 1 : 0);

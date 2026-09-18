import { defaultParams } from '../../src/gen/params.js';
import { buildBase } from '../../src/gen/pipeline.js';
import { erodeParticles } from '../../src/gen/erosion-particles.js';

const p = structuredClone(defaultParams);
p.resolution = 'draft';
const b = buildBase(p);
const hf = b.hf;
const e = structuredClone(p.erosion);
console.log('count param', e.particleCount, 'grid', hf.nx, hf.nz, 'cell', hf.cellX.toFixed(3));
e.particleCount = 2000;
e.particleSteps = 8;
const t = Date.now();
const rp = await erodeParticles(hf, e, { seed: 4821, seaLevel: 0, floorY: -4 });
console.log('particles ms', Date.now() - t, JSON.stringify(rp));

import { defaultParams } from '../../src/gen/params.js';
import { buildBase } from '../../src/gen/pipeline.js';
import { erodeFluvial } from '../../src/gen/erosion-fluvial.js';
import { erodeParticles } from '../../src/gen/erosion-particles.js';
import { erodeDetail } from '../../src/gen/erosion-detail.js';

const p = structuredClone(defaultParams);
p.resolution = 'draft';
const b = buildBase(p);
const hf = b.hf;
const e = structuredClone(p.erosion);
e.iterations = 90;

let t = Date.now();
const rf = await erodeFluvial(hf, e, { seaLevel: 0 });
console.log('fluvial 90 ms', Date.now() - t, JSON.stringify(rf).slice(0,200));

t = Date.now();
const rp = await erodeParticles(hf, e, { seed: 4821, seaLevel: 0, floorY: -4 });
console.log('particles ms', Date.now() - t, JSON.stringify(rp).slice(0,200));

t = Date.now();
const rd = erodeDetail(hf, e, { seed: 4821, seaLevel: 0 });
console.log('detail ms', Date.now() - t, JSON.stringify(rd).slice(0,200));

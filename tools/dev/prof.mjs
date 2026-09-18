import { defaultParams } from '../../src/gen/params.js';
import { buildBase, erode, analyse } from '../../src/gen/pipeline.js';
import { heightfieldForVolume } from '../../src/gen/base-terrain.js';
import { hydrology } from '../../src/gen/flow.js';

const p = structuredClone(defaultParams);
p.resolution = 'draft';
let t = Date.now();
console.log('bounds', JSON.stringify(p.erosion));
const b = buildBase(p);
console.log('base ms', Date.now() - t);
const hf = b.hf;
t = Date.now();
const hyp = hydrology(hf, { exponent: p.erosion.flowExponent, seaLevel: 0 });
console.log('hydrology ms', Date.now() - t, 'lakeCount', hyp.lakeCount, 'flowMax', Math.max(...hyp.flow).toFixed(1));

const e = structuredClone(p.erosion);
e.iterations = 10;
e.particles = false;
t = Date.now();
const r = await erode(hf, { ...p, erosion: e });
console.log('erode fluvial 10 iters ms', Date.now() - t, JSON.stringify(r.stages));

t = Date.now();
const r2 = await erode(hf, p, { passes: ['particles'] });
console.log('particles ms', Date.now() - t, JSON.stringify(r2.stages));

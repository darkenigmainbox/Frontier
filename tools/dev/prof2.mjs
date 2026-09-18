import { defaultParams } from '../../src/gen/params.js';
import { buildBase } from '../../src/gen/pipeline.js';
import { erodeFluvial } from '../../src/gen/erosion-fluvial.js';

const p = structuredClone(defaultParams);
p.resolution = 'draft';
const b = buildBase(p);
const hf = b.hf;
const e = structuredClone(p.erosion);
for (const it of [1, 2, 5]) {
  e.iterations = it;
  const hf2 = Object.create(Object.getPrototypeOf(hf));
  Object.assign(hf2, hf);
  hf2.h = Float32Array.from(hf.h);
  const t = Date.now();
  const r = await erodeFluvial(hf2, e, { seaLevel: 0 });
  console.log('iters', it, 'ms', Date.now() - t, JSON.stringify(r));
}

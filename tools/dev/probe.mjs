import { defaultParams, mergeParams } from '../../src/gen/params.js';
import { buildBase, erode } from '../../src/gen/pipeline.js';
const p = mergeParams(defaultParams, JSON.parse(process.argv[2] || '{}'));
const b = buildBase(p);
const hf = b.hf;
await erode(hf, p, { passes: ['fluvial'] });
const h1 = Float32Array.from(hf.h);
await erode(hf, p, { passes: ['particles'] });
let rms = 0, mx = 0, n = 0, cells = 0, maxK = -1;
for (let k = 0; k < hf.h.length; k++) {
  const d = hf.h[k] - h1[k];
  rms += d * d; n++;
  if (Math.abs(d) > Math.abs(mx)) { mx = d; maxK = k; }
  if (Math.abs(d) > 0.05) cells++;
}
console.log(`particle delta: rms=${Math.sqrt(rms/n).toFixed(3)} max=${mx.toFixed(2)} at k=${maxK} (h=${h1[maxK].toFixed(2)}, flow=${hf.flow[maxK].toFixed(1)}, slope=${hf.slope[maxK].toFixed(2)}) cells>5cm=${cells}/${n}`);
await erode(hf, p, { passes: ['detail'] });
let rms2 = 0, dmax = 0;
for (let k = 0; k < hf.h.length; k++) { const d = hf.h[k] - h1[k]; rms2 += d*d; if (Math.abs(d) > Math.abs(dmax)) dmax = d; }
console.log(`detail total delta: rms=${Math.sqrt(rms2/n).toFixed(3)} max=${dmax.toFixed(2)}`);
// trail coverage
let trail = 0; for (let k=0;k<hf.trail.length;k++) if (hf.trail[k] > 0) trail++;
console.log(`trail cells=${trail}/${hf.trail.length} avgTrail=${(hf.trail.reduce((a,v)=>a+v,0)/hf.trail.length).toFixed(2)}`);

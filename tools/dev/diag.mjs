import { defaultParams, mergeParams } from '../../src/gen/params.js';
import { buildBase, erode, analyse } from '../../src/gen/pipeline.js';
const p = mergeParams(defaultParams, JSON.parse(process.argv[2] || '{}'));
const b = buildBase(p);
const hf = b.hf;
const stat = (label) => {
  let mn=Infinity,mx=-Infinity,sum=0,n=0,sl=0,smax=0;
  for (let k=0;k<hf.h.length;k++){const v=hf.h[k];if(v<mn)mn=v;if(v>mx)mx=v;sum+=v;n++;sl+=hf.slope[k];if(hf.slope[k]>smax)smax=hf.slope[k];}
  console.log(`${label.padEnd(10)} min=${mn.toFixed(2)} max=${mx.toFixed(2)} mean=${(sum/n).toFixed(2)} slopeMean=${(sl/n).toFixed(3)} max=${smax.toFixed(2)} rough=${hf.roughness().toFixed(3)}`);
};
stat('base');
await erode(hf, p, { passes: ['fluvial'] }); stat('fluvial');
await erode(hf, p, { passes: ['particles'] }); stat('particles');
await erode(hf, p, { passes: ['detail'] }); stat('detail');

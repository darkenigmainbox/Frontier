import { DesertMesher } from '../src/plant/desertMesher';
import { DESERT_PRESETS, DEFAULT_DESERT } from '../src/plant/desertParams';
const preset = DESERT_PRESETS.find((p) => p.name === 'Echeveria')!;
const g = { ...DEFAULT_DESERT, ...preset.desert };
const built = new DesertMesher(g, 1).build();
const p = built.mesh.positions;
const lv = built.mesh.levels;
// find level0 quads and their radius from center
const q = built.mesh.quads;
let minR=Infinity, maxR=-Infinity, count=0;
for (let f=0; f<q.length; f+=4) {
  const a=q[f];
  if (lv[a]!==0) continue;
  const x=p[a*3], z=p[a*3+2];
  const r = Math.hypot(x,z);
  if (r<minR) minR=r;
  if (r>maxR) maxR=r;
  count++;
}
console.log('level0 quads:', count, 'r range', minR, maxR);

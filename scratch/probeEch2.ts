import { DesertMesher } from '../src/plant/desertMesher';
import { DESERT_PRESETS, DEFAULT_DESERT } from '../src/plant/desertParams';
const preset = DESERT_PRESETS.find((p) => p.name === 'Echeveria')!;
const g = { ...DEFAULT_DESERT, ...preset.desert };
const built = new DesertMesher(g, 1).build();
const p = built.mesh.positions;
const lv = built.mesh.levels;
let minY0=Infinity, maxY0=-Infinity, minYleaf=Infinity, maxYleaf=-Infinity;
for (let i=0;i<p.length/3;i++){
  const y = p[i*3+1];
  if (lv[i]===0) { if(y<minY0)minY0=y; if(y>maxY0)maxY0=y; }
  if (lv[i]===1) { if(y<minYleaf)minYleaf=y; if(y>maxYleaf)maxYleaf=y; }
}
console.log('level0 y range', minY0, maxY0);
console.log('level1(leaf) y range', minYleaf, maxYleaf);

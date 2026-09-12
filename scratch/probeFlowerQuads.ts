import { DesertMesher } from '../src/plant/desertMesher';
import { DESERT_PRESETS, DEFAULT_DESERT } from '../src/plant/desertParams';
const preset = DESERT_PRESETS.find((p) => p.name === 'Golden Barrel')!;
const g = { ...DEFAULT_DESERT, ...preset.desert, spinesPer: 0, centralSpine: 0, spineDensity: 0 };
const built = new DesertMesher(g, 1).build();
const q = built.mesh.quads;
const lv = built.mesh.levels;
let count2=0;
for (let f=0; f<q.length; f+=4) {
  if (lv[q[f]] === 2) count2++;
}
console.log('level2 quads', count2, 'total quads', q.length/4);

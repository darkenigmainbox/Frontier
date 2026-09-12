import { DesertMesher } from '../src/plant/desertMesher';
import { DESERT_PRESETS, DEFAULT_DESERT } from '../src/plant/desertParams';
const preset = DESERT_PRESETS.find((p) => p.name === 'Golden Barrel')!;
const g = { ...DEFAULT_DESERT, ...preset.desert, spinesPer: 0, centralSpine: 0, spineDensity: 0 };
const built = new DesertMesher(g, 1).build();
const p = built.mesh.positions;
const lv = built.mesh.levels;
let maxY=-Infinity;
for (let i=0;i<p.length/3;i++) if (lv[i]===0 && p[i*3+1]>maxY) maxY=p[i*3+1];
console.log('maxY level0', maxY);
let count=0;
for (let i=0;i<p.length/3;i++){
  if (lv[i]!==2) continue;
  count++;
  if (count<20) console.log(p[i*3].toFixed(4), p[i*3+1].toFixed(4), p[i*3+2].toFixed(4));
}
console.log('total level2 verts', count);

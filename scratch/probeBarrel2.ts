import { DesertMesher } from '../src/plant/desertMesher';
import { DESERT_PRESETS, DEFAULT_DESERT } from '../src/plant/desertParams';

const preset = DESERT_PRESETS.find((p) => p.name === 'Golden Barrel')!;
const g = { ...DEFAULT_DESERT, ...preset.desert };
const built = new DesertMesher(g, 1).build();
const p = built.mesh.positions;
const lv = built.mesh.levels;
let maxY = -Infinity;
for (let i = 1; i < p.length; i += 3) if (p[i] > maxY) maxY = p[i];
// count level-2 (spine) vertices by height band
const bands = new Array(20).fill(0);
for (let i = 0; i < p.length/3; i++) {
  const y = p[i*3+1];
  const l = lv[i];
  if (l !== 2) continue;
  const b = Math.min(19, Math.floor((y/maxY)*20));
  if (b>=0) bands[b]++;
}
console.log('maxY', maxY);
console.log(bands.map((v,i)=>`${(i*5)}%-${(i+1)*5}%: ${v}`).join('\n'));

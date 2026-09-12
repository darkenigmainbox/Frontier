import { DesertMesher } from '../src/plant/desertMesher';
import { DESERT_PRESETS, DEFAULT_DESERT } from '../src/plant/desertParams';

const preset = DESERT_PRESETS.find((p) => p.name === 'Golden Barrel')!;
const g = { ...DEFAULT_DESERT, ...preset.desert };
console.log('height', g.height, 'bodyRadius', g.bodyRadius, 'spineZone', g.spineZone, 'ribs', g.ribs);
const built = new DesertMesher(g, 1).build();
console.log('height built', built.height, 'groundDepth', built.groundDepth);
// find max Y in mesh
const p = built.mesh.positions;
let maxY = -Infinity;
for (let i = 1; i < p.length; i += 3) if (p[i] > maxY) maxY = p[i];
console.log('maxY', maxY);

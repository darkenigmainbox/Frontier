import { DesertMesher } from '../src/plant/desertMesher';
import { DESERT_PRESETS, DEFAULT_DESERT } from '../src/plant/desertParams';
const preset = DESERT_PRESETS.find((p) => p.name === 'Echeveria')!;
const g = { ...DEFAULT_DESERT, ...preset.desert };
console.log(JSON.stringify(g, null, 2));
const built = new DesertMesher(g, 1).build();
console.log('height', built.height, 'groundDepth', built.groundDepth);

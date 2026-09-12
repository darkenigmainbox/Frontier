import { DesertMesher } from '../src/plant/desertMesher';
import { DESERT_PRESETS, DEFAULT_DESERT } from '../src/plant/desertParams';

const preset = DESERT_PRESETS.find((p) => p.name === 'Golden Barrel')!;
const g = { ...DEFAULT_DESERT, ...preset.desert };
const built = new DesertMesher(g, 1).build();
console.log(JSON.stringify(built.stats.dropReasons, null, 2));
console.log('dropped', built.stats.dropped);

import { writeFileSync } from 'node:fs';
import { DesertMesher } from '../src/plant/desertMesher';
import { DESERT_PRESETS, DEFAULT_DESERT } from '../src/plant/desertParams';
const preset = DESERT_PRESETS.find((p) => p.name === 'Golden Barrel')!;
const g = { ...DEFAULT_DESERT, ...preset.desert, spinesPer: 0, centralSpine: 0, spineDensity: 0, flowerLength: 0.08, flowerRadius: 0.03 };
const built = new DesertMesher(g, 1).build();
console.log(JSON.stringify(built.stats));

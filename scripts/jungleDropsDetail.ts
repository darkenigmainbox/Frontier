import { JUNGLE_PRESETS, DEFAULT_JUNGLE } from '../src/plant/jungleParams';
import { JungleMesher } from '../src/plant/jungleMesher';
const preset = JUNGLE_PRESETS.find(p => p.name === 'Boston Fern')!;
const g = { ...DEFAULT_JUNGLE, ...preset.jungle };
const built = new JungleMesher(g, 1).build();
console.log(built.stats);

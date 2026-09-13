import { JUNGLE_PRESETS, DEFAULT_JUNGLE } from '../src/plant/jungleParams';
import { JungleMesher } from '../src/plant/jungleMesher';
for (const name of ['Coconut Palm', 'Date Palm']) {
  const preset = JUNGLE_PRESETS.find(p => p.name === name)!;
  const g = { ...DEFAULT_JUNGLE, ...preset.jungle };
  const built = new JungleMesher(g, 1).build();
  console.log(name, built.stats);
}

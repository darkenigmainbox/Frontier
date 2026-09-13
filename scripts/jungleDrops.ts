import { JUNGLE_PRESETS, DEFAULT_JUNGLE } from '../src/plant/jungleParams';
import { JungleMesher } from '../src/plant/jungleMesher';
for (const preset of JUNGLE_PRESETS) {
  for (const seed of [1, 7, 42]) {
    const g = { ...DEFAULT_JUNGLE, ...preset.jungle };
    const built = new JungleMesher(g, seed).build();
    if (built.stats.dropped > 0) {
      console.log(preset.name, seed, built.stats.dropped, built.stats.dropReasons);
    }
  }
}
console.log('done');

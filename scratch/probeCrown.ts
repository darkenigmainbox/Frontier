import { DesertMesher } from '../src/plant/desertMesher';
import { DESERT_PRESETS, DEFAULT_DESERT } from '../src/plant/desertParams';
for (const name of ['Aloe Vera', 'Echeveria']) {
  const preset = DESERT_PRESETS.find((p) => p.name === name)!;
  const g = { ...DEFAULT_DESERT, ...preset.desert };
  const built = new DesertMesher(g, 1).build();
  console.log(name, JSON.stringify(built.stats.dropReasons), 'dropped', built.stats.dropped, 'leaves', built.stats.leaves);
}

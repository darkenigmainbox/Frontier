import { DEFAULT_DESERT, DESERT_PRESETS } from '../src/plant/desertParams';
import { DesertMesher } from '../src/plant/desertMesher';
import { validateTopology } from '../src/tree/validate';

const argv: string[] = (globalThis as unknown as { process: { argv: string[] } }).process.argv;
const only = argv[2];
const seeds = (argv[3] ?? '1,2,3').split(',').map(Number);

for (const preset of DESERT_PRESETS) {
  if (only && !preset.name.toLowerCase().includes(only.toLowerCase())) continue;
  for (const seed of seeds) {
    const g = { ...DEFAULT_DESERT, ...preset.desert };
    const t0 = performance.now();
    const r = new DesertMesher(g, seed).build();
    const t1 = performance.now();
    const rep = validateTopology(r.mesh);
    const t2 = performance.now();
    console.log(
      `${preset.name.padEnd(20)} seed=${seed} organs=${r.stats.organs} lvl=${r.stats.perLevel.join('/')} arms=${r.stats.arms} pads=${r.stats.pads} leaves=${r.stats.leaves} canes=${r.stats.canes} spines=${r.stats.spines} fruits=${r.stats.fruits} V=${rep.vertices} F=${rep.faces} quads=${(rep.quadRatio * 100).toFixed(1)}% ` +
        `bnd=${rep.boundaryEdges} nm=${rep.nonManifoldEdges} inc=${rep.inconsistentEdges} deg=${rep.degenerateFaces} chi=${rep.eulerCharacteristic} comp=${rep.components} genus=${rep.genus} h=${r.height.toFixed(2)} dropped=${r.stats.dropped} ${JSON.stringify(r.stats.dropReasons)} ` +
        `t=${(t1 - t0).toFixed(0)}/${(t2 - t1).toFixed(0)}ms`,
    );
  }
}

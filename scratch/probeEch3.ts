import { DesertMesher } from '../src/plant/desertMesher';
import { DESERT_PRESETS, DEFAULT_DESERT } from '../src/plant/desertParams';
const preset = DESERT_PRESETS.find((p) => p.name === 'Echeveria')!;
const g = { ...DEFAULT_DESERT, ...preset.desert };
const built = new DesertMesher(g, 1).build();
const p = built.mesh.positions;
const lv = built.mesh.levels;
// print level0 vertices sorted by radius from center (x,z)
const pts: {r:number,y:number}[] = [];
for (let i=0;i<p.length/3;i++){
  if (lv[i]!==0) continue;
  const x=p[i*3], y=p[i*3+1], z=p[i*3+2];
  const r = Math.hypot(x,z);
  pts.push({r,y});
}
pts.sort((a,b)=>a.r-b.r);
for (let i=0;i<pts.length; i+=Math.max(1,Math.floor(pts.length/30))) console.log(pts[i].r.toFixed(4), pts[i].y.toFixed(4));

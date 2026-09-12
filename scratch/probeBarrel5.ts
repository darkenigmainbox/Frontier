import { DesertMesher } from '../src/plant/desertMesher';
import { DESERT_PRESETS, DEFAULT_DESERT } from '../src/plant/desertParams';
const preset = DESERT_PRESETS.find((p) => p.name === 'Golden Barrel')!;
const g = { ...DEFAULT_DESERT, ...preset.desert };
const built = new DesertMesher(g, 1).build();
const p = built.mesh.positions;
let maxY=-Infinity;
for (let i=1;i<p.length;i+=3) if (p[i]>maxY) maxY=p[i];
console.log('maxY', maxY, 'height', built.height);
// find topmost quad ring's radius from axis
const lv = built.mesh.levels;
let topR = -Infinity, atY=-Infinity;
for (let i=0;i<p.length/3;i++){
  if (lv[i]!==0) continue;
  const y=p[i*3+1];
  if (y>maxY-0.02) {
    const r = Math.hypot(p[i*3], p[i*3+2]);
    if (y>atY) { atY=y; }
  }
}
// print level0 top vertices ordered by y desc
const pts: {y:number,r:number}[]=[];
for (let i=0;i<p.length/3;i++){ if (lv[i]!==0) continue; pts.push({y:p[i*3+1], r:Math.hypot(p[i*3],p[i*3+2])}); }
pts.sort((a,b)=>b.y-a.y);
for (let i=0;i<20;i++) console.log(pts[i].y.toFixed(4), pts[i].r.toFixed(4));

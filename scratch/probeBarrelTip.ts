import { DESERT_PRESETS, DEFAULT_DESERT } from '../src/plant/desertParams';
const preset = DESERT_PRESETS.find((p) => p.name === 'Golden Barrel')!;
const g = { ...DEFAULT_DESERT, ...preset.desert };
const R = g.bodyRadius, H = g.height;
const depth = Math.max(0.05, 0.35*R);
const sink = Math.max(0, g.sink);
const sGround = sink+depth;
const L = H+sGround;
function radius(s:number){
  if (s<sGround) return R*(0.3+0.25*(s/sGround));
  const t = Math.max(0,Math.min(1,(s-sGround)/H));
  let r = R*Math.pow(Math.sin(Math.PI*(0.1+0.8*t)),0.75);
  if (t>0.86) {
    const u = Math.max(0,Math.min(1,(t-0.86)/0.14));
    r *= Math.cos(u*Math.PI*0.5*0.82);
  }
  return Math.max(0.05*R, r);
}
const domeLen = 0.12*H;
console.log('domeLen', domeLen);
for (const s of [L-domeLen, L-domeLen*0.5, L-0.004, L]) {
  console.log('s',s.toFixed(4), 't', ((s-sGround)/H).toFixed(4), 'r', radius(s).toFixed(4));
}

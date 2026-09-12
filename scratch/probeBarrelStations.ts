import { DESERT_PRESETS, DEFAULT_DESERT } from '../src/plant/desertParams';
const preset = DESERT_PRESETS.find((p) => p.name === 'Golden Barrel')!;
const g = { ...DEFAULT_DESERT, ...preset.desert };
const R = g.bodyRadius, H = g.height;
const depth = Math.max(0.05, 0.35*R);
const sink = Math.max(0, g.sink);
const sGround = sink+depth;
const L = H+sGround;
const radius = (s:number)=>{
  if (s<sGround) return R*(0.3+0.25*(s/sGround));
  const t = Math.max(0,Math.min(1,(s-sGround)/H));
  const r = R*Math.pow(Math.sin(Math.PI*(0.1+0.8*t)),0.75);
  return Math.max(0.28*R, r);
};
const tipMargin=0.015;
const sTop = L - tipMargin;
console.log('L', L, 'sTop', sTop, 'radius at sTop', radius(sTop), 'radius at tip', radius(L));
// spineZone = 1 means areoles span full body; areoleSpacing=0.024
const spacing = 0.024;
const sBot = Math.max(sGround+0.015, L - 1*(L-sGround));
console.log('sBot', sBot);

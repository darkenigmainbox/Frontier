import {settings} from './scene.js';
export const densityPresets=[
 {name:'Low',dims:[[8,4,8],[4,2,4],[2,1,2]]},
 {name:'Standard',dims:[[12,6,12],[6,3,6],[3,2,3]]},
 {name:'High',dims:[[16,8,16],[8,4,8],[4,2,4]]},
 {name:'Ultra',dims:[[24,12,24],[12,6,12],[6,3,6]]},
];
export function getProbeConfig(){
 const preset=densityPresets[settings.probeDensity];const large=settings.scene==='large';
 const min=large?[-12,0,-11]:[-6,0,-5.5],size=large?[24,10,22]:[12,7,11];
 const sides=[4,8,16].map(n=>n*(settings.probeAngular?2:1));
 const counts=preset.dims.map(d=>d[0]*d[1]*d[2]),rayWork=counts.map((n,i)=>n*sides[i]**2);
 const spacing=Math.max(...size.map((n,i)=>n/preset.dims[0][i]));
 return {name:preset.name,dims:preset.dims,sides,counts,rayWork,min,size,
  intervals:[spacing*.9,spacing*3,Math.max(...size)*2],totalProbes:counts.reduce((a,b)=>a+b),totalRays:rayWork.reduce((a,b)=>a+b),
  key:`${settings.probeDensity}:${settings.probeAngular}:${large}`};
}

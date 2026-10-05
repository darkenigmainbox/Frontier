// Object-space surface brush stamps: independent of triangulation and formation placement.
export const DetailPatterns={Fractal:'Fractal · irregular relief',Ridges:'Ridges · sharp creases',Pits:'Cellular · isolated pits'};
const clamp=x=>Math.max(0,Math.min(1,x));
export function ReadDetailPaint(stamps=[]){
 if(!Array.isArray(stamps)||stamps.length>3000)throw Error('Paint mask supports up to 3,000 brush stamps.');
 return stamps.map(s=>{
  if(!s||!Array.isArray(s.p)||!Array.isArray(s.n)||s.p.length!==3||s.n.length!==3||![...s.p,...s.n,s.radius,s.strength,s.softness,s.target,s.stroke].every(Number.isFinite)||s.radius<.2||s.radius>12||s.strength<0||s.strength>1||s.softness<0||s.softness>1||![0,1].includes(s.target)||!Number.isSafeInteger(s.stroke)||s.stroke<0||s.stroke>1000000)throw Error('Invalid detail paint stamp.');
  const length=Math.hypot(...s.n);if(length<.9||length>1.1)throw Error('Invalid paint surface normal.');
  return {p:s.p.slice(),n:Math.abs(length-1)>1e-12?s.n.map(x=>x/length):s.n.slice(),radius:s.radius,strength:s.strength,softness:s.softness,target:s.target,stroke:s.stroke};
 });
}
export const DetailMaskModes={Auto:'Auto · procedural patches',Paint:'Paint · manual mask',AutoPaint:'Auto + paint · local corrections'};
// Seeded smooth 3D patches, evaluated in the same object space as painted stamps.
// Coverage is a threshold control, not a promise of an exact surface-area percentage.
export function AutoDetailMask(p,s){
 const coverage=s.DetailAutoCoverage??.45;
 if(coverage<=0)return 0;if(coverage>=1)return 1;
 const size=s.DetailAutoSize??6,seed=s.DetailAutoSeed??42;
 const q=p.map(v=>v/size),cell=q.map(Math.floor),fade=t=>t*t*(3-2*t),f=q.map((v,k)=>fade(v-cell[k]));
 const hash=(x,y,z)=>{let h=Math.imul(x,374761393)^Math.imul(y,668265263)^Math.imul(z,2147483647)^Math.imul(seed,1274126177);h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967295;};
 let signal=0;
 for(let x=0;x<2;x++)for(let y=0;y<2;y++)for(let z=0;z<2;z++)signal+=hash(cell[0]+x,cell[1]+y,cell[2]+z)*(x?f[0]:1-f[0])*(y?f[1]:1-f[1])*(z?f[2]:1-f[2]);
 signal+=(s.DetailAutoHeightBias??0)*(clamp(p[1]/Math.max(1,s.Height??18))-.5);
 const width=s.DetailAutoFalloff??.3,threshold=1-coverage;
 if(width===0)return signal>=threshold?1:0;
 return fade(clamp((signal-threshold)/width+.5));
}
export function DetailMask(p,normal,s){
 const mode=s.DetailMaskMode??'Paint';
 let weight=mode==='Paint'?(s.DetailMaskBase??1):AutoDetailMask(p,s);
 if(mode==='Auto')return weight;
 for(const stamp of s.DetailPaint||[]){
  const dx=p[0]-stamp.p[0],dy=p[1]-stamp.p[1],dz=p[2]-stamp.p[2],distance2=dx*dx+dy*dy+dz*dz;
  if(distance2>=stamp.radius*stamp.radius)continue;
  const d=Math.sqrt(distance2)/stamp.radius;
  // Surface-oriented brush avoids painting the opposite side of a thin formation.
  const facing=clamp(((normal[0]*stamp.n[0]+normal[1]*stamp.n[1]+normal[2]*stamp.n[2])-.1)/.4);if(!facing)continue;
  const t=stamp.softness?clamp((1-d)/stamp.softness):1;
  const alpha=t*t*(3-2*t)*stamp.strength*facing;
  weight+=(stamp.target-weight)*alpha;
 }
 const coverage=s.DetailCoverage??1;
 return coverage<=0?0:clamp((weight-(1-coverage))/coverage);
}

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
export function DetailMask(p,normal,s){
 let weight=s.DetailMaskBase??1;
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

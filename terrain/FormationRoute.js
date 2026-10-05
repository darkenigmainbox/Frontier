// Editable plan-view guide. Coordinates are fractions of the width/depth envelope.
export const RoutePresets={
 Sweep:[[-.85,.55],[-.3,-.5],[.3,.5],[.85,-.55]],
 Bend:[[-.85,.5],[-.7,-.55],[.15,-.6],[.85,.4]],
 Straight:[[-.85,0],[.85,0]]
};
export function ReadRoute(input){
 if(!Array.isArray(input)||input.length<2||input.length>8)throw Error('A route needs 2–8 control points.');
 const points=input.map(p=>{
  if(!Array.isArray(p)||p.length!==2||!p.every(v=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=1))throw Error('Route coordinates must be finite numbers between -1 and 1.');
  return p.map(v=>Math.round(v*10000)/10000);
 });
 if(points.some((p,i)=>i&&Math.hypot(p[0]-points[i-1][0],p[1]-points[i-1][1])<.06))throw Error('Neighbouring route points are too close.');
 return points;
}
// Cubic Hermite (Catmull–Rom tangents), then arc-length resampling in world units.
export function SampleRoute(points,segments,width,depth,smooth=1){
 const dense=[];
 for(let i=0;i<points.length-1;i++)for(let j=0;j<40;j++){
  const t=j/40,a=points[Math.max(0,i-1)],b=points[i],c=points[i+1],d=points[Math.min(points.length-1,i+2)];
  dense.push([0,1].map(k=>{
   const linear=b[k]+(c[k]-b[k])*t;
   const curve=(2*t**3-3*t*t+1)*b[k]+(t**3-2*t*t+t)*(c[k]-a[k])*.5+(-2*t**3+3*t*t)*c[k]+(t**3-t*t)*(d[k]-b[k])*.5;
   return (linear+(curve-linear)*smooth)*(k===0?width:depth)*.5;
  }));
 }
 dense.push([points.at(-1)[0]*width*.5,points.at(-1)[1]*depth*.5]);
 const lengths=[0];for(let i=1;i<dense.length;i++)lengths.push(lengths.at(-1)+Math.hypot(dense[i][0]-dense[i-1][0],dense[i][1]-dense[i-1][1]));
 let j=1;
 return Array.from({length:segments+1},(_,i)=>{
  const target=lengths.at(-1)*i/segments;while(j<lengths.length-1&&lengths[j]<target)j++;
  const t=(target-lengths[j-1])/(lengths[j]-lengths[j-1]||1);
  return dense[j].map((v,k)=>dense[j-1][k]+(v-dense[j-1][k])*t);
 });
}
export const RouteProfiles=['RouteCliff','Canyon','RockArch'];

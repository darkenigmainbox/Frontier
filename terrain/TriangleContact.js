// Same SAT axes/tolerances as TriangleSolver.TriangleOverlap, with reusable
// triangle data and allocation-free projection tests for the erosion hot loop.
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export function PrepareContactTriangle(indices,vertices,contract=false){
 let p=indices.map(i=>vertices[i]);
 const lo=[0,1,2].map(k=>Math.min(...p.map(v=>v[k]))),hi=[0,1,2].map(k=>Math.max(...p.map(v=>v[k])));
 if(contract){const c=[0,1,2].map(k=>(p[0][k]+p[1][k]+p[2][k])/3);p=p.map(v=>v.map((x,k)=>x+(c[k]-x)*1e-5));}
 let minimum=Infinity,scale=1;
 const edges=p.map((v,i)=>{const e=p[(i+1)%3].map((x,k)=>x-v[k]),length=Math.sqrt(e[0]*e[0]+e[1]*e[1]+e[2]*e[2]);minimum=Math.min(minimum,length);return e.map(x=>x/Math.max(length,1e-30));});
 for(const v of p)for(const x of v)scale=Math.max(scale,Math.abs(x));
 return {p,lo,hi,edges,normal:cross(edges[0],edges[1]),minimum,scale};
}
export function ContactTrianglesOverlap(a,b){
 for(let k=0;k<3;k++)if(a.hi[k]<b.lo[k]-1e-8||b.hi[k]<a.lo[k]-1e-8)return false;
 const tolerance=Math.max(Number.EPSILON*Math.max(a.scale,b.scale)*8,Math.min(1e-8,Math.min(a.minimum,b.minimum)*1e-8)),origin=a.p[0];
 function separated(x,y,z){
  const length=Math.sqrt(x*x+y*y+z*z);if(length<1e-12)return false;
  let amin=Infinity,amax=-Infinity,bmin=Infinity,bmax=-Infinity;
  for(let i=0;i<3;i++){
   const ap=a.p[i],bp=b.p[i];
   const u=((ap[0]-origin[0])*x+(ap[1]-origin[1])*y+(ap[2]-origin[2])*z)/length;
   const v=((bp[0]-origin[0])*x+(bp[1]-origin[1])*y+(bp[2]-origin[2])*z)/length;
   amin=Math.min(amin,u);amax=Math.max(amax,u);bmin=Math.min(bmin,v);bmax=Math.max(bmax,v);
  }
  return amax<bmin-tolerance||bmax<amin-tolerance;
 }
 function crossSeparates(e,f){return separated(e[1]*f[2]-e[2]*f[1],e[2]*f[0]-e[0]*f[2],e[0]*f[1]-e[1]*f[0]);}
 if(separated(...a.normal)||separated(...b.normal))return false;
 for(const e of a.edges)for(const f of b.edges)if(crossSeparates(e,f))return false;
 for(const e of a.edges)if(crossSeparates(e,a.normal))return false;
 for(const e of b.edges)if(crossSeparates(e,b.normal))return false;
 return true;
}

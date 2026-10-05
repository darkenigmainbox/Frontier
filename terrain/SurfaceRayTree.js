// Deterministic triangle BVH for short-range occlusion queries. No implicit surfaces.
export function BuildRayTree(positions,triangles){
 const records=triangles.map((t,id)=>{const p=t.map(i=>positions[i]);return {id,t,lo:[0,1,2].map(k=>Math.min(...p.map(v=>v[k]))),hi:[0,1,2].map(k=>Math.max(...p.map(v=>v[k])))};});
 function build(items){
  const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
  for(const r of items)for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],r.lo[k]);hi[k]=Math.max(hi[k],r.hi[k]);}
  if(items.length<=10)return {lo,hi,items};
  const axis=[0,1,2].sort((a,b)=>(hi[b]-lo[b])-(hi[a]-lo[a]))[0];
  items.sort((a,b)=>a.lo[axis]+a.hi[axis]-b.lo[axis]-b.hi[axis]||a.id-b.id);
  const middle=items.length>>1;return {lo,hi,left:build(items.slice(0,middle)),right:build(items.slice(middle))};
 }
 const root=build(records);
 return (o,d,maxDistance,skip=-1)=>{
  let closest=maxDistance;const stack=[root];
  while(stack.length){
   const n=stack.pop();let near=0,far=closest;
   for(let k=0;k<3;k++){
    if(Math.abs(d[k])<1e-12){if(o[k]<n.lo[k]||o[k]>n.hi[k]){far=-1;break;}}
    else{let a=(n.lo[k]-o[k])/d[k],b=(n.hi[k]-o[k])/d[k];if(a>b)[a,b]=[b,a];near=Math.max(near,a);far=Math.min(far,b);}
   }
   if(far<near)continue;
   if(!n.items){stack.push(n.left,n.right);continue;}
   for(const r of n.items){
    if(r.id===skip)continue;
    const [a,b,c]=r.t.map(i=>positions[i]),ex=b[0]-a[0],ey=b[1]-a[1],ez=b[2]-a[2],fx=c[0]-a[0],fy=c[1]-a[1],fz=c[2]-a[2];
    const px=d[1]*fz-d[2]*fy,py=d[2]*fx-d[0]*fz,pz=d[0]*fy-d[1]*fx,det=ex*px+ey*py+ez*pz;
    if(Math.abs(det)<1e-12)continue;
    const inv=1/det,tx=o[0]-a[0],ty=o[1]-a[1],tz=o[2]-a[2],u=(tx*px+ty*py+tz*pz)*inv;
    if(u<0||u>1)continue;
    const qx=ty*ez-tz*ey,qy=tz*ex-tx*ez,qz=tx*ey-ty*ex,v=(d[0]*qx+d[1]*qy+d[2]*qz)*inv;
    if(v<0||u+v>1)continue;
    const distance=(fx*qx+fy*qy+fz*qz)*inv;
    if(distance>1e-7&&distance<closest)closest=distance;
   }
  }
  return closest;
 };
}

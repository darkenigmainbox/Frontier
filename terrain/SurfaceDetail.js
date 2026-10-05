// Stage 6: indexed, seam-conforming mesh relief. Not a grain/particle simulation.
import {MeshMetrics} from './PolyhedronSolver.js';
const sub=(a,b)=>a.map((x,i)=>x-b[i]);
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const length=a=>Math.hypot(...a);
const unit=a=>{const l=length(a);return l?a.map(x=>x/l):[0,0,0];};
const key=(a,b)=>a<b?`${a}/${b}`:`${b}/${a}`;
const clamp=x=>Math.max(0,Math.min(1,x));
const normal=(v,t)=>cross(sub(v[t[1]],v[t[0]]),sub(v[t[2]],v[t[0]]));
const defects=m=>m.OpenEdges+m.NonmanifoldEdges+m.NonmanifoldVertices+m.ZeroArea+m.WindingErrors+m.DuplicateTriangles;

function noise(x,y,z,seed){
 const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z);
 const smooth=t=>t*t*(3-2*t),u=smooth(x-ix),v=smooth(y-iy),w=smooth(z-iz);
 const hash=(a,b,c)=>{let h=Math.imul(a,374761393)^Math.imul(b,668265263)^Math.imul(c,1442695041)^seed;h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967295;};
 let value=0;
 for(let a=0;a<2;a++)for(let b=0;b<2;b++)for(let c=0;c<2;c++)value+=hash(ix+a,iy+b,iz+c)*(a?u:1-u)*(b?v:1-v)*(c?w:1-w);
 return value;
}
function relief(p,s,spacing){
 const [x,y,z]=p.map(v=>v/s.DetailScale),n=(a,b,c)=>noise(a,b,c,s.DetailSeed);
 const broad=n(x*1.7,y*1.7,z*1.7),fine=n(x*5,y*5,z*5);
 // Attenuate frequencies the local triangulation cannot resolve.
 const fineWeight=clamp(1-spacing*8/s.DetailScale);
 if(s.DetailRock==='Granite')return .12+.55*Math.pow(1-Math.abs(2*broad-1),3)+.25*fine*fineWeight;
 const warp=n(x*.6,y*.4,z*.6)-.5;
 const band=.5+.5*Math.sin((y+(s.DetailRock==='Slate'?x*.22:x*.065)+warp*.32)*Math.PI*2);
 return s.DetailRock==='Slate'?.1+.65*Math.pow(band,7)*(.4+.6*broad)+.15*fine*fineWeight:
  .12+.48*Math.pow(band,3)+.25*broad+.15*fine*fineWeight;
}

// Small per-body triangle BVH used only for inward thickness guards, never SDFs.
function tree(mesh,ids=mesh.Triangles.map((_,i)=>i)){
 const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
 for(const id of ids)for(const vi of mesh.Triangles[id])for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],mesh.Vertices[vi][k]);hi[k]=Math.max(hi[k],mesh.Vertices[vi][k]);}
 if(ids.length<=12)return {lo,hi,ids};
 const axis=hi.map((v,k)=>v-lo[k]).indexOf(Math.max(...hi.map((v,k)=>v-lo[k])));
 const centre=id=>mesh.Triangles[id].reduce((sum,i)=>sum+mesh.Vertices[i][axis],0);
 ids.sort((a,b)=>centre(a)-centre(b));const mid=ids.length>>1;
 return {lo,hi,left:tree(mesh,ids.slice(0,mid)),right:tree(mesh,ids.slice(mid))};
}
function clearance(root,mesh,o,d,limit){
 let nearest=limit;
 function visit(node){
  let near=0,far=nearest;
  for(let k=0;k<3;k++){
   if(Math.abs(d[k])<1e-12){if(o[k]<node.lo[k]-1e-8||o[k]>node.hi[k]+1e-8)return;continue;}
   const a=(node.lo[k]-o[k])/d[k],b=(node.hi[k]-o[k])/d[k];near=Math.max(near,Math.min(a,b));far=Math.min(far,Math.max(a,b));if(near>far+1e-8)return;
  }
  if(node.left){visit(node.left);visit(node.right);return;}
  for(const id of node.ids){
   const [a,b,c]=mesh.Triangles[id].map(i=>mesh.Vertices[i]);
   const e1=sub(b,a),e2=sub(c,a),h=cross(d,e2),det=dot(e1,h);
   if(Math.abs(det)<1e-12)continue;
   const q=sub(o,a),u=dot(q,h)/det;if(u< -1e-8||u>1+1e-8)continue;
   const r=cross(q,e1),v=dot(d,r)/det;if(v< -1e-8||u+v>1+1e-8)continue;
   const t=dot(e2,r)/det;if(t>1e-6&&t<nearest)nearest=t;
  }
 }
 visit(root);return nearest;
}

export function DetailMesh(source,s,budget){
 let vertices=source.Vertices.map(v=>v.slice()),triangles=source.Triangles.map(t=>t.slice()),tags=source.Tags.slice();
 let protectedEdges=new Set();const locked=new Set(),initialEdges=new Map();
 const normals=triangles.map(t=>unit(normal(vertices,t)));
 triangles.forEach((t,i)=>{
  if(['Crack','Base','Termination'].includes(tags[i]))t.forEach(v=>locked.add(v));
  for(let j=0;j<3;j++){
   const a=t[j],b=t[(j+1)%3],k=key(a,b),other=initialEdges.get(k);
   if(other!==undefined&&(tags[i]!==tags[other]||dot(normals[i],normals[other])<Math.cos(3*Math.PI/180))){protectedEdges.add(k);locked.add(a);locked.add(b);}
   else if(other===undefined)initialEdges.set(k,i);
  }
 });
 // Every selected shared edge gets one midpoint and is split on BOTH incident faces.
 let budgetLimited=false;
 for(let pass=0;pass<6;pass++){
  const edges=new Map();
  for(const t of triangles)for(let j=0;j<3;j++){
   const a=t[j],b=t[(j+1)%3],k=key(a,b);if(edges.has(k))continue;
   const len=length(sub(vertices[a],vertices[b]));if(len>s.DetailSpan*1.25)edges.set(k,{a,b,len,k});
  }
  if(!edges.size)break;
  const allowance=Math.floor((budget-triangles.length)/2);if(allowance<=0){budgetLimited=true;break;}
  const candidates=[...edges.values()].sort((a,b)=>b.len-a.len||a.a-b.a||a.b-b.b);
  if(candidates.length>allowance)budgetLimited=true;
  const selected=candidates.slice(0,allowance),midpoints=new Map(),nextProtected=new Set(protectedEdges);
  for(const {a,b,k} of selected){
   const m=vertices.length;vertices.push(vertices[a].map((v,j)=>(v+vertices[b][j])*.5));midpoints.set(k,m);
   if(protectedEdges.has(k)){locked.add(m);nextProtected.delete(k);nextProtected.add(key(a,m));nextProtected.add(key(m,b));}
  }
  protectedEdges=nextProtected;
  const next=[],nextTags=[];
  triangles.forEach(([a,b,c],i)=>{
   const m=midpoints.get(key(a,b)),n=midpoints.get(key(b,c)),p=midpoints.get(key(c,a));
   const mask=(m!==undefined?1:0)|(n!==undefined?2:0)|(p!==undefined?4:0);
   const parts=[[[a,b,c]],[[a,m,c],[m,b,c]],[[b,n,a],[n,c,a]],[[b,n,m],[a,m,c],[m,n,c]],
    [[c,p,b],[p,a,b]],[[a,m,p],[m,b,c],[m,c,p]],[[c,p,n],[a,b,n],[a,n,p]],[[a,m,p],[m,b,n],[p,n,c],[m,n,p]]][mask];
   for(const t of parts){next.push(t);nextTags.push(tags[i]);if(['Crack','Base','Termination'].includes(tags[i]))t.forEach(v=>locked.add(v));}
  });
  triangles=next;tags=nextTags;
 }
 const original=vertices.map(v=>v.slice()),summed=vertices.map(()=>[0,0,0]),spans=vertices.map(()=>0);
 const faceNormals=triangles.map(t=>normal(vertices,t));
 triangles.forEach((t,i)=>t.forEach((v,j)=>{
  summed[v]=summed[v].map((x,k)=>x+faceNormals[i][k]);spans[v]=Math.max(spans[v],length(sub(vertices[v],vertices[t[(j+1)%3]])),length(sub(vertices[v],vertices[t[(j+2)%3]])));
 }));
 const bvh=tree(source),amounts=new Float64Array(vertices.length);
 vertices.forEach((p,i)=>{
  if(locked.has(i)||!s.DetailDepth)return;
  const inward=unit(summed[i]).map(x=>-x);
  const requested=s.DetailDepth*relief(p,s,spans[i]);
  const depth=Math.min(requested,clearance(bvh,source,p,inward,requested/.12)*.12);
  amounts[i]=depth;vertices[i]=p.map((x,k)=>x+inward[k]*depth);
 });
 // Fade into pinned creases and thin regions without exposing the source tessellation.
 for(let pass=0;pass<8;pass++)for(const t of triangles)for(let j=0;j<3;j++){
  const a=t[j],b=t[(j+1)%3],slope=length(sub(original[a],original[b]))*.35;
  if(amounts[a]>amounts[b]+slope)amounts[a]=amounts[b]+slope;
  if(amounts[b]>amounts[a]+slope)amounts[b]=amounts[a]+slope;
 }
 vertices=original.map((p,i)=>{const n=unit(summed[i]);return p.map((x,k)=>x-n[k]*amounts[i]);});
 // Transactionally reduce displacement when a local triangle approaches inversion.
 let reductions=0;
 for(let pass=0;pass<8;pass++){
  const bad=new Set();
  triangles.forEach((t,i)=>{if(dot(normal(vertices,t),faceNormals[i])<dot(faceNormals[i],faceNormals[i])*.2)t.forEach(v=>bad.add(v));});
  if(!bad.size)break;
  for(const i of bad){amounts[i]*=.5;vertices[i]=vertices[i].map((x,k)=>(x+original[i][k])*.5);reductions++;}
 }
 const mesh={...source,Vertices:vertices,Triangles:triangles,Tags:tags};
 let metrics=MeshMetrics(mesh);
 if(defects(metrics)||!Number.isFinite(metrics.Volume)||metrics.Volume<=0||triangles.some((t,i)=>dot(normal(vertices,t),faceNormals[i])<=0))throw new Error(`Stage 6 rejected invalid detail on ${source.Name}`);
 const smooth=vertices.map(()=>[0,0,0]);
 for(const t of triangles){const n=normal(vertices,t);for(const i of t)for(let k=0;k<3;k++)smooth[i][k]+=n[k];}
 mesh.DetailDepths=Array.from(amounts);
 mesh.DetailNormals=smooth.map((n,i)=>locked.has(i)?null:unit(n));
 mesh.Detail={MovedVertices:Array.from(amounts).filter(x=>x>1e-10).length,MaxDisplacement:amounts.reduce((a,b)=>Math.max(a,b),0),BudgetLimited:budgetLimited,Reductions:reductions};
 return {mesh,metrics};
}

export function GenerateSurfaceDetail(previous,s){
 const inputCount=previous.Metrics.Triangles;
 const budget=Math.max(inputCount,Math.round(s.DetailBudget));
 const meshes=[],records=[];
 const areas=previous.Meshes.map(m=>m.Triangles.reduce((a,t)=>a+length(normal(m.Vertices,t)),0));
 const totalArea=areas.reduce((a,b)=>a+b,0);
 for(const [index,source] of previous.Meshes.entries()){
  const share=source.Triangles.length+Math.floor((budget-inputCount)*areas[index]/totalArea);
  const {mesh,metrics}=DetailMesh(source,s,share);meshes.push(mesh);records.push({...metrics,Name:mesh.Name});
 }
 const sum=k=>records.reduce((a,m)=>a+m[k],0);
 const metrics={...previous.Metrics,Stage:6};
 for(const k of ['Vertices','Triangles','OpenEdges','NonmanifoldEdges','WindingErrors','ZeroArea','NonmanifoldVertices','DuplicateTriangles','ThinTriangles','Volume'])metrics[k]=sum(k);
 metrics.MinimumAngle=Math.min(...records.map(m=>m.MinimumAngle));
 metrics.MovedVertices=meshes.reduce((n,m)=>n+m.Detail.MovedVertices,0);
 metrics.MaxDisplacement=Math.max(...meshes.map(m=>m.Detail.MaxDisplacement));
 metrics.BudgetLimited=meshes.some(m=>m.Detail.BudgetLimited);
 metrics.InputOverBudget=inputCount>s.DetailBudget;
 return {Number:6,Meshes:meshes,Metrics:metrics,Records:records};
}

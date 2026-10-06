import {PrepareContactTriangle,ContactTrianglesOverlap} from './TriangleContact.js';
// Stage 5.1: deform connected rock surfaces without changing their indexed topology.
import {MeshMetrics,Subtract,Cross,Dot,Length,InsideMesh} from './PolyhedronSolver.js';
import {TriangleOverlap} from './TriangleSolver.js';
const defects=['OpenEdges','NonmanifoldEdges','NonmanifoldVertices','WindingErrors','ZeroArea','DuplicateTriangles'];
const clamp=x=>Math.max(0,Math.min(1,x));
function random(seed){let x=seed|0;return ()=>{x=(Math.imul(x,1664525)+1013904223)|0;return (x>>>0)/4294967296;};}
function bounds(points){const lo=[Infinity,Infinity,Infinity],hi=lo.map(()=>-Infinity);for(const p of points)for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],p[k]);hi[k]=Math.max(hi[k],p[k]);}return {lo,hi};}
const overlap=(a,b)=>a.lo.every((v,k)=>v<=b.hi[k]+1e-8&&b.lo[k]<=a.hi[k]+1e-8);
function tree(items,check){
 check('building triangle tree',true);
 const box=bounds(items.flatMap(t=>[t.lo,t.hi]));if(items.length<=8)return {...box,items};
 const axis=box.hi.map((v,k)=>v-box.lo[k]).indexOf(Math.max(...box.hi.map((v,k)=>v-box.lo[k])));
 items.sort((a,b)=>(a.lo[axis]+a.hi[axis])-(b.lo[axis]+b.hi[axis]));const half=items.length>>1;
 return {...box,left:tree(items.slice(0,half),check),right:tree(items.slice(half),check)};
}
// Compare candidate intersections against the unchanged input, including contacts
// between different rocks. Existing input contacts are not counted as new damage.
export function NewErosionIntersections(source,meshes,options={}){
 const check=options.check||(()=>{});
 const original=[],vertices=[],items=[];let offset=0;
 meshes.forEach((m,body)=>{check('preparing triangle bounds',true);original.push(...source[body].Vertices);vertices.push(...m.Vertices);m.Triangles.forEach(t=>{const tri=t.map(i=>i+offset);items.push({...bounds(tri.map(i=>vertices[i])),tri,body,id:items.length});});offset+=m.Vertices.length;});
 const bad=new Set();let count=0;
 function prepared(item,old,contract){const key=(old?'old':'next')+(contract?'Contract':'');return item[key]??=PrepareContactTriangle(item.tri,old?original:vertices,contract);}
 function test(a,b){
  check('triangle contacts');
  // Once both bodies are already rejected, further contacts cannot change the
  // rejection set. The final accepted pass still checks all candidate pairs.
  if((bad.has(a.body)&&bad.has(b.body))||!overlap(a,b))return;
  const shared=a.tri.some(i=>b.tri.includes(i));
  const hit=options.reference?TriangleOverlap(a.tri,b.tri,vertices):ContactTrianglesOverlap(prepared(a,false,shared),prepared(b,false,shared));
  if(hit){const before=options.reference?TriangleOverlap(a.tri,b.tri,original):ContactTrianglesOverlap(prepared(a,true,shared),prepared(b,true,shared));if(!before){bad.add(a.body);bad.add(b.body);count++;}}
 }
 function pairs(a,b){check('tree traversal');if(!overlap(a,b))return;if(a.items&&b.items){for(const x of a.items)for(const y of b.items)test(x,y);return;}if(!a.items){pairs(a.left,b);pairs(a.right,b);}else{pairs(a,b.left);pairs(a,b.right);}}
 function self(n){if(n.items){for(let i=0;i<n.items.length;i++)for(let j=i+1;j<n.items.length;j++)test(n.items[i],n.items[j]);}else{self(n.left);self(n.right);pairs(n.left,n.right);}}
 if(items.length)self(tree(items,check));
 // Surface intersections alone miss an entire small component swallowed by another.
 const components=[];
 meshes.forEach((m,body)=>{
  check('connected components',true);
  const parent=m.Vertices.map((_,i)=>i),root=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};
  for(const t of m.Triangles){parent[root(t[1])]=root(t[0]);parent[root(t[2])]=root(t[0]);}
  const groups=new Map();for(const t of m.Triangles){const id=root(t[0]);if(!groups.has(id))groups.set(id,[]);groups.get(id).push(t);}
  for(const triangles of groups.values()){const ids=[...new Set(triangles.flat())];components.push({body,probe:ids[0],...bounds(ids.map(i=>m.Vertices[i])),next:{Vertices:m.Vertices,Triangles:triangles},old:{Vertices:source[body].Vertices,Triangles:triangles}});}
 });
 for(let i=0;i<components.length;i++)for(let j=0;j<components.length;j++){
  check('containment');if(i===j)continue;const a=components[i],b=components[j];if((bad.has(a.body)&&bad.has(b.body))||!overlap(a,b))continue;
  const p=a.next.Vertices[a.probe];if(!p.every((v,k)=>v>b.lo[k]+1e-7&&v<b.hi[k]-1e-7))continue;
  if(InsideMesh(p,b.next)&&!InsideMesh(a.old.Vertices[a.probe],b.old)){bad.add(a.body);bad.add(b.body);count++;}
 }
 return {bad,count};
}
export function BuildFaceErosion(stage,s,progress=()=>{},limits={}){
 const start=performance.now(),source=stage.Meshes;
 if(s.ErosionInward===0&&s.ErosionOutward===0)return {...stage,Number:5.1,Metrics:{...stage.Metrics,Stage:5.1},Erosion:{milliseconds:performance.now()-start,changedRocks:0,limitedRocks:0,rejectedRocks:0,maximumDisplacement:0,safetyPasses:0,detectedIntersections:0,inwardVertices:0,outwardVertices:0,factors:source.map(()=>1)}};
 const now=limits.now||(()=>performance.now()),budgetStart=now(),budgetMs=limits.milliseconds??20000,maxWork=limits.work??8000000;
 let work=0,lastReport=budgetStart,attemptNumber=0,checks=0,collisionCount=0;
 class BudgetExceeded extends Error {}
 const check=(phase,force=false)=>{
  work++;
  if(!force&&work%256!==0)return;
  const time=now();
  if(time-budgetStart>=budgetMs||work>=maxWork)throw new BudgetExceeded(phase);
  if(time-lastReport>=250){lastReport=time;progress(`Validating face erosion · safety pass ${attemptNumber} · ${phase} · ${((time-budgetStart)/1000).toFixed(1)} s / ${(budgetMs/1000).toFixed(0)} s budget`);}
 };
 try{
 check('starting validation',true);
 const floor=Math.min(...source.map(m=>Math.min(...m.Vertices.map(p=>p[1]))));
 const deformations=source.map((m,body)=>{
  check('deformation field',true);
  // Each disconnected component gets its own centre, even inside a combined mesh.
  const parent=m.Vertices.map((_,i)=>i),root=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};
  for(const t of m.Triangles){parent[root(t[1])]=root(t[0]);parent[root(t[2])]=root(t[0]);}
  const groups=new Map();m.Vertices.forEach((p,i)=>{const r=root(i);if(!groups.has(r))groups.set(r,[]);groups.get(r).push(p);});
  const fields=new Map();for(const [id,points]of groups){const b=bounds(points),rng=random(s.ErosionSeed+body*104729+id*197);fields.set(id,{centre:b.lo.map((v,k)=>(v+b.hi[k])*.5),axis:[rng()*2-1,rng()*2-1,rng()*2-1],phase:rng()*Math.PI*2});}
  return m.Vertices.map((p,i)=>{
   const f=fields.get(root(i)),r=Subtract(p,f.centre),length=Length(r);if(length<1e-9)return [0,0,0];
   const direction=r.map(v=>v/length),wave=(Math.sin(Dot(direction,f.axis)*4+f.phase)+.4*Math.sin(direction[1]*5-f.phase))/1.4;
   const u=(wave+1)*.5,split=1-s.ErosionOutwardShare;
   const displacement=u>split&&split<1?s.ErosionOutward*(u-split)/(1-split):-s.ErosionInward*(1-u/Math.max(split,1e-9));
   const amount=(-s.ErosionInward*.35*(1-s.ErosionVariation)+displacement*s.ErosionVariation)*clamp((p[1]-floor)/.5);
   const delta=direction.map(v=>v*amount);delta.signed=amount;return delta;
  });
 });
 let factors=source.map(()=>1),meshes,records;
 const construct=()=>source.map((m,b)=>({...m,Vertices:m.Vertices.map((p,i)=>p.map((v,k)=>v+deformations[b][i][k]*factors[b]))}));
 for(let attempt=0;attempt<12;attempt++){
  attemptNumber=attempt+1;check('starting safety pass',true);
  progress(`Validating face erosion · safety pass ${attempt+1}`);meshes=construct();const unsafe=new Set();
  records=meshes.map((m,b)=>{
   check('indexed topology',true);
   const metric={...MeshMetrics(m),Name:m.Name};
   if(defects.some(k=>metric[k])||!Number.isFinite(metric.Volume)||metric.Volume<=0)unsafe.add(b);
   m.Triangles.forEach(t=>{const old=t.map(i=>source[b].Vertices[i]),next=t.map(i=>m.Vertices[i]),a=Cross(Subtract(old[1],old[0]),Subtract(old[2],old[0])),n=Cross(Subtract(next[1],next[0]),Subtract(next[2],next[0]));if(Dot(a,n)<.5*Length(a)*Length(n))unsafe.add(b);});return metric;
  });
  const hits=NewErosionIntersections(source,meshes,{check});checks++;collisionCount+=hits.count;for(const b of hits.bad)unsafe.add(b);
  if(!unsafe.size)break;
  for(const b of unsafe)factors[b]=attempt>=8?0:factors[b]*.5;
  if(attempt===11){factors=source.map(()=>0);meshes=construct();records=stage.Records;}
 }
 const sum=k=>records.reduce((n,r)=>n+r[k],0);
 const metrics={...stage.Metrics,Stage:5.1,Volume:sum('Volume'),ThinTriangles:sum('ThinTriangles'),MinimumAngle:Math.min(...records.map(r=>r.MinimumAngle))};
 for(const k of defects)metrics[k]=sum(k);
 let maxMove=0,inwardVertices=0,outwardVertices=0;
 deformations.forEach((ds,b)=>ds.forEach(d=>{const move=Length(d)*factors[b];maxMove=Math.max(maxMove,move);if(move>1e-8){if(d.signed>0)outwardVertices++;else inwardVertices++;}}));
 const changed=meshes.filter((m,b)=>m.Vertices.some((p,i)=>p.some((v,k)=>v!==source[b].Vertices[i][k]))).length;
 return {Number:5.1,Meshes:meshes,Records:records,Metrics:metrics,Erosion:{milliseconds:performance.now()-start,changedRocks:changed,limitedRocks:factors.filter(f=>f<1&&f>0).length,rejectedRocks:factors.filter(f=>f===0).length,maximumDisplacement:maxMove,inwardVertices,outwardVertices,safetyPasses:checks,detectedIntersections:collisionCount,validationWork:work,budgetExceeded:false,factors}};
 }catch(error){
  if(!(error instanceof BudgetExceeded))throw error;
  const warning=`Face erosion skipped: validation budget reached during ${error.message}. Current stage 5 retained unchanged; no unvalidated deformation accepted.`;
  progress(warning);
  return {...stage,Number:5.1,Metrics:{...stage.Metrics,Stage:5.1},Erosion:{milliseconds:performance.now()-start,changedRocks:0,limitedRocks:0,rejectedRocks:source.length,maximumDisplacement:0,safetyPasses:checks,detectedIntersections:collisionCount,inwardVertices:0,outwardVertices:0,factors:source.map(()=>0),validationWork:work,budgetExceeded:true,warning}};
 }

}

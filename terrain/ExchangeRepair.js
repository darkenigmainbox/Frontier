// Float32 exchange can make an extremely thin triangle exactly collinear.
// Repair only those triangles: a link-safe microscopic edge collapse, or a
// midpoint collapse, or diagonal flip across a collinear corner. Never delete a face on its own.
import {Cross,Subtract,Dot,Length} from './PolyhedronSolver.js';
import {TriangleOverlap} from './TriangleSolver.js';
const normal=(t,v)=>Cross(Subtract(v[t[1]],v[t[0]]),Subtract(v[t[2]],v[t[0]]));
const key=(a,b)=>a<b?`${a}/${b}`:`${b}/${a}`;
export function RepairExchange(mesh,tolerance=1e-5,normalCosine=.99){
 let repairs=0;const blocked=new Set();
 for(let pass=0;pass<64;pass++){
  const bad=mesh.Triangles.findIndex((t,i)=>!blocked.has(i)&&Length(normal(t,mesh.Vertices))<2e-10);
  if(bad<0)break;
  const edges=new Map(),neighbours=new Map();
  mesh.Triangles.forEach((t,i)=>t.forEach((a,k)=>{
   const b=t[(k+1)%3],id=key(a,b);if(!edges.has(id))edges.set(id,[]);edges.get(id).push(i);
   if(!neighbours.has(a))neighbours.set(a,new Set());for(const v of t)if(v!==a)neighbours.get(a).add(v);
  }));
  const t=mesh.Triangles[bad],v=mesh.Vertices;
  const sides=t.map((a,k)=>({a,b:t[(k+1)%3],c:t[(k+2)%3],length:Length(Subtract(v[a],v[t[(k+1)%3]]))})).sort((a,b)=>a.length-b.length);
  let repaired=false;
  for(const {a,b,length}of sides){
   if(length>tolerance||edges.get(key(a,b)).length!==2)continue;
   if([...neighbours.get(a)].filter(x=>neighbours.get(b).has(x)).length!==2)continue;
   // Endpoints first; a quantized midpoint can distribute the normal change
   // across both sides of a microscopic corner rather than rotating one side too far.
   const midpoint=v[a].map((x,k)=>Math.fround((x+v[b][k])*.5));
   for(const [keep,drop,target]of [[a,b,v[a]],[b,a,v[b]],[a,b,midpoint]]){
    const moved=target!==v[keep];
    if(Length(Subtract(target,v[keep]))>tolerance||Length(Subtract(target,v[drop]))>tolerance)continue;
    const proposed=moved?v.slice():v;if(moved)proposed[keep]=target;
    const changed=[];
    const next=[],tags=[];let valid=true;
    mesh.Triangles.forEach((old,i)=>{
     if(old.includes(keep)&&old.includes(drop))return;
     const triangle=old.map(x=>x===drop?keep:x);
     if(old.includes(drop)||(moved&&old.includes(keep))){
      changed.push({old,triangle});
      const n=normal(triangle,proposed),previous=normal(old,v);
      // A cluster of already-degenerate faces may need several link-safe collapses.
      // Never turn a previously valid face into a degenerate or inverted one.
      if(Length(previous)>=2e-10&&(Length(n)<2e-10||Dot(n,previous)<normalCosine*Length(n)*Length(previous)))valid=false;
     }
     next.push(triangle);tags.push(mesh.Tags[i]);
    });
    if(!valid)continue;
    if(moved||normalCosine<.99){
     // Check all altered faces against the complete candidate surface. Tolerate
     // existing input contacts, but do not introduce newly detected intersections.
     const originals=mesh.Triangles.filter(t=>!(t.includes(keep)&&t.includes(drop)));
     for(const entry of changed){
      for(let i=0;i<next.length;i++){
       if(next[i]===entry.triangle)continue;
       if(TriangleOverlap(entry.triangle,next[i],proposed)&&!TriangleOverlap(entry.old,originals[i],v)){valid=false;break;}
      }
      if(!valid)break;
     }
     if(!valid)continue;
     if(moved)v[keep]=target;
    }
    mesh.Triangles=next;mesh.Tags=tags;repaired=true;break;
   }
   if(repaired)break;
  }
  if(!repaired)for(const {a,b,c,length}of sides.slice().reverse()){
   const pair=edges.get(key(a,b));if(pair.length!==2||!length)continue;
   const other=pair.find(i=>i!==bad),old=mesh.Triangles[other],d=old.find(x=>x!==a&&x!==b);
   if(d===c||edges.has(key(c,d)))continue;
   const edge=Subtract(v[b],v[a]),corner=Subtract(v[c],v[a]),fraction=Dot(corner,edge)/Dot(edge,edge);
   if(fraction<=0||fraction>=1||Length(Cross(corner,edge))/length>tolerance)continue;
   const next=[[c,a,d],[c,d,b]],reference=normal(old,v);
   if(next.some(triangle=>{const n=normal(triangle,v);return Length(n)<2e-10||Dot(n,reference)<.99*Length(n)*Length(reference);}))continue;
   mesh.Triangles[bad]=next[0];mesh.Triangles[other]=next[1];repaired=true;break;
  }
  if(!repaired){blocked.add(bad);continue;}
  blocked.clear();repairs++;
 }
 // Remove unreferenced vertices without welding any additional points.
 const ids=new Map(),vertices=[];
 mesh.Triangles=mesh.Triangles.map(t=>t.map(i=>{if(!ids.has(i)){ids.set(i,vertices.length);vertices.push(mesh.Vertices[i]);}return ids.get(i);}));
 mesh.Vertices=vertices;return repairs;
}

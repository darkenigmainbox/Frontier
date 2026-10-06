import {DetailMask} from './DetailMask.js';
// Stage 6: explicit triangle-mesh CSG. No SDF, voxel remeshing, textures or displacement of stage 5.
import {RepairExchange} from './ExchangeRepair.js';
import {MeshMetrics} from './PolyhedronSolver.js';
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const subtract=(a,b)=>a.map((v,k)=>v-b[k]);
function noise(x,y,z,seed){
 const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z),fade=t=>t*t*t*(t*(t*6-15)+10),f=[fade(x-ix),fade(y-iy),fade(z-iz)];
 const hash=(a,b,c)=>{let h=Math.imul(a,374761393)^Math.imul(b,668265263)^Math.imul(c,2147483647)^Math.imul(seed,1274126177);h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967295*2-1;};
 let result=0;for(let a=0;a<2;a++)for(let b=0;b<2;b++)for(let c=0;c<2;c++)result+=hash(ix+a,iy+b,iz+c)*(a?f[0]:1-f[0])*(b?f[1]:1-f[1])*(c?f[2]:1-f[2]);return result;
}
export function DetailSignal(p,s){
 let value=0,weight=0;for(let octave=0;octave<3;octave++){
  const f=2**octave/s.DetailScale,w=.52**octave;
  value+=noise(p[0]*f+11.3,p[1]*f*s.DetailAnisotropy-7.1,p[2]*f+3.7,s.DetailSeed+octave*197)*w;weight+=w;
 }
 value/=weight;
 if(s.DetailPattern==='Ridges')return Math.max(-1,1-4*Math.abs(value));
 if(s.DetailPattern==='Pits'){
  const q=[p[0]/s.DetailScale,p[1]*s.DetailAnisotropy/s.DetailScale,p[2]/s.DetailScale],cell=q.map(Math.floor);let nearest=2;
  for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++){
   const c=cell.map((v,k)=>v+[x,y,z][k]);
   const centre=c.map((v,k)=>v+.5+.35*noise(c[0]+k*13,c[1]-k*7,c[2]+k*19,s.DetailSeed));
   nearest=Math.min(nearest,Math.hypot(...q.map((v,k)=>v-centre[k])));
  }
  return Math.max(-1,Math.min(1,1-nearest*2.5));
 }
 return value;
}
export function BuildMouldDetail(baseStage,cutStage,s,lib,progress=()=>{}){
 const started=performance.now(),{Manifold,Mesh}=lib,owned=[],keep=m=>(owned.push(m),m);
 const provenance=new Map();
 function input(meshes,tag){
  const positions=[],triangles=[],ids=[],tags=[];let offset=0;
  for(const mesh of meshes){for(const p of mesh.Vertices)positions.push(...p);mesh.Triangles.forEach((t,i)=>{triangles.push(...t.map(v=>v+offset));const label=mesh.Tags[i]||tag;let face=tags.indexOf(label);if(face<0){face=tags.length;tags.push(label);}ids.push(face);});offset+=mesh.Vertices.length;}
  const id=Manifold.reserveIDs(1);provenance.set(id,tags);
  return keep(new Manifold(new Mesh({numProp:3,vertProperties:new Float32Array(positions),triVerts:new Uint32Array(triangles),...(tag==='BaseSource'?{}:{faceID:new Uint32Array(ids)}),runIndex:new Uint32Array([0,triangles.length]),runOriginalID:new Uint32Array([id])})));
 }
 function output(solid,name,forceTag=null){
  const raw=solid.getMesh(),vertices=[],triangles=[],tags=[];

  // Merge property seams by their explicit topological merge mapping, never by a distance weld.
  const parent=Array.from({length:raw.vertProperties.length/raw.numProp},(_,i)=>i),root=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};
  for(let i=0;i<raw.mergeFromVert.length;i++)parent[root(raw.mergeFromVert[i])]=root(raw.mergeToVert[i]);
  const map=new Map(),index=i=>{const r=root(i);if(!map.has(r)){map.set(r,vertices.length);vertices.push(Array.from(raw.vertProperties.slice(r*raw.numProp,r*raw.numProp+3)));}return map.get(r);};
  let run=0;for(let i=0;i<raw.triVerts.length;i+=3){while(run+1<raw.runOriginalID.length&&i>=raw.runIndex[run+1])run++;triangles.push([index(raw.triVerts[i]),index(raw.triVerts[i+1]),index(raw.triVerts[i+2])]);tags.push(forceTag||provenance.get(raw.runOriginalID[run])?.[raw.faceID[i/3]]||'Detail');}
  return {Name:name,Vertices:vertices,Triangles:triangles,Tags:tags,Spalls:[],Cracks:[],RejectedSpalls:0,RejectedCracks:0};
 }
 try{
  progress('Box minus the original stage-1 mesh');
  const base=input(baseStage.Meshes,'BaseSource'),rock=input(cutStage.Meshes,'Cliff');
  const bounds=base.boundingBox(),margin=Math.max(2,s.DetailAmplitude*4+s.DetailBias*2),low=bounds.min.map(v=>v-margin),high=bounds.max.map(v=>v+margin);
  const box=keep(keep(Manifold.cube(high.map((v,k)=>v-low[k]))).translate(low));
  const hollow=keep(box.subtract(base));
  if(hollow.status()!=='NoError')throw Error('Base mould boolean failed: '+hollow.status());
  progress('Subdividing the hollow mould');
  // Collapse redundant coplanar tessellation before uniform linear refinement. No smoothing.
  const clean=keep(hollow.simplify(.00002));
  if(clean.surfaceArea()/s.DetailSpacing**2*4>220000)throw Error('Estimated mould budget exceeded. Increase mould triangle spacing.');
  const refined=keep(clean.refineToLength(s.DetailSpacing));
  if(refined.numTri()>220000)throw Error('Mould exceeds 220,000 triangles. Increase Detail spacing for this prototype.');
  const raw=refined.getMesh(),n=raw.vertProperties.length/raw.numProp,normals=Array.from({length:n},()=>[0,0,0]),points=Array.from({length:n},(_,i)=>Array.from(raw.vertProperties.slice(i*raw.numProp,i*raw.numProp+3)));
  for(let i=0;i<raw.triVerts.length;i+=3){const t=Array.from(raw.triVerts.slice(i,i+3)),normal=cross(subtract(points[t[1]],points[t[0]]),subtract(points[t[2]],points[t[0]]));for(const j of t)for(let k=0;k<3;k++)normals[j][k]+=normal[k];}
  progress('Pushing and pulling the inner mould wall with 3D noise');
  const lookup=new Map();let moved=0,minOffset=Infinity,maxOffset=-Infinity,affected=0;
  for(let i=0;i<n;i++){
   const p=points[i],outer=p.some((v,k)=>Math.abs(v-low[k])<1e-4||Math.abs(v-high[k])<1e-4);
   if(outer)continue;
   const length=Math.hypot(...normals[i])||1,ground=clamp((p[1]-bounds.min[1])/(s.DetailSpacing*1.5));
   const mask=DetailMask(p,normals[i].map(v=>-v/length),s);if(mask>0)affected++;
   const offset=mask*(s.DetailBias+s.DetailAmplitude*DetailSignal(p,s))*ground*ground*(3-2*ground);
   lookup.set(p.map(v=>v.toPrecision(10)).join(','),normals[i].map(v=>v/length*offset));moved++;minOffset=Math.min(minOffset,offset);maxOffset=Math.max(maxOffset,offset);
  }
  let applied=0;
  const noisy=keep(refined.warp(p=>{const d=lookup.get(p.map(v=>Math.fround(v).toPrecision(10)).join(','));if(d){applied++;for(let k=0;k<3;k++)p[k]+=d[k];}}));
  if(noisy.status()!=='NoError')throw Error('Displaced mould is invalid: '+noisy.status());
  // Fresh cutter identity. Final exchange cleanup consolidates face tags, not geometry.
  const cutter=keep(noisy.asOriginal());
  progress(`Stage ${cutStage.Number} minus the noisy mould · triangle boolean`);
  // A fully protected mask is exactly stage 5, not a numerically recut approximation.
  if(!affected)return {Number:6,Meshes:cutStage.Meshes,Records:cutStage.Records,Metrics:{...cutStage.Metrics,Stage:6},
   Detail:{operation:`Protected mask — unchanged stage ${cutStage.Number}`,refinedTriangles:refined.numTri(),mouldVerticesMoved:moved,appliedVertices:applied,affectedVertices:0,minimumOffset:0,maximumOffset:0,stage5Volume:cutStage.Metrics.Volume,finalVolume:cutStage.Metrics.Volume,removedVolume:0,outputTriangles:cutStage.Metrics.Triangles,sourceSpalls:cutStage.Metrics.Spalls,sourceCracks:cutStage.Metrics.Cracks,milliseconds:performance.now()-started},
   Study:{Base:baseStage.Meshes,Before:cutStage.Meshes,Hollow:[output(hollow,'Box minus base','Mould')],Noisy:[output(noisy,'Protected mould','Mould')]}};
  const difference=keep(rock.subtract(cutter));
  if(difference.status()!=='NoError'||difference.isEmpty())throw Error('Detail boolean failed: '+difference.status());
  // Reimport the actual Float32 exchange geometry before simplifying again. The kernel works
  // in doubles; export rounding can otherwise turn microscopic slivers into collinear faces.
  // No triangle is silently dropped. Recheck indexed topology and area after every round trip.
  const defects=['OpenEdges','NonmanifoldEdges','NonmanifoldVertices','WindingErrors','ZeroArea','DuplicateTriangles'];
  let candidate=keep(difference.asOriginal()),mesh,record,cleanupTolerance,cleanupPasses,exchangeRepairs=0;
  for(let pass=0;pass<3;pass++){
   cleanupPasses=pass+1;cleanupTolerance=Math.min(.003,.001*(pass+1));
   const result=keep(candidate.setTolerance(cleanupTolerance));
   mesh=output(result,'Mould-detailed cliff','Cliff');record={...MeshMetrics(mesh),Name:mesh.Name};
   if(!defects.some(k=>record[k])&&Number.isFinite(record.Volume)&&record.Volume>0)break;
   if(pass===2){exchangeRepairs=RepairExchange(mesh);record={...MeshMetrics(mesh),Name:mesh.Name};if(!defects.some(k=>record[k])&&record.Volume>0)break;throw Error('Stage 6 validation failed: '+defects.filter(k=>record[k]).map(k=>`${k}=${record[k]}`).join(', '));}
   const r=result.getMesh();
   const reconstructed=keep(new Manifold(new Mesh({numProp:3,vertProperties:r.vertProperties,triVerts:r.triVerts,mergeFromVert:r.mergeFromVert,mergeToVert:r.mergeToVert,tolerance:.0003})));
   if(reconstructed.status()!=='NoError')throw Error('Float32 exchange validation failed: '+reconstructed.status());
   candidate=keep(reconstructed.asOriginal());
  }
  const before=rock.volume();if(record.Volume>before+Math.max(.001,before*.00001))throw Error('Subtraction unexpectedly increased rock volume.');
  const stats={operation:`Stage${cutStage.Number} − noisy(Box − Stage1)`,inputStage:cutStage.Number,pattern:s.DetailPattern,affectedVertices:affected,spacing:s.DetailSpacing,amplitude:s.DetailAmplitude,bias:s.DetailBias,refinedTriangles:refined.numTri(),mouldVerticesMoved:moved,minimumOffset:minOffset,maximumOffset:maxOffset,stage5Volume:before,finalVolume:record.Volume,removedVolume:before-record.Volume,outputTriangles:mesh.Triangles.length,cleanupTolerance,cleanupPasses,exchangeRepairs,appliedVertices:applied,sourceSpalls:cutStage.Metrics.Spalls,sourceCracks:cutStage.Metrics.Cracks,milliseconds:performance.now()-started};
  return {Number:6,Meshes:[mesh],Records:[record],Metrics:{Stage:6,Bodies:1,...record,Spalls:0,Cracks:0,RejectedSpalls:0,RejectedCracks:0},Detail:stats,Study:{Base:baseStage.Meshes,Before:cutStage.Meshes,Hollow:[output(hollow,'Box minus base','Mould')],Noisy:[output(noisy,'Displaced hollow mould','Mould')]}};
 }finally{for(const m of owned.reverse())m.delete();}
}

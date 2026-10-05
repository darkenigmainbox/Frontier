// Polygon-only 3D mass assembly. Convex rocks are unioned into disjoint cells;
// no paired front/back profile, height-map extrusion, voxel field or SDF.
import {Face,ClipCell,Dot,Scale,Subtract,Centre,Cross} from './PolyhedronSolver.js';

export const SolidLabels={Headland:'Compact outcrop',Escarpment:'Terraced mesa',Spire:'Thick monolith',Needles:'Tower cluster',WideWall:'Curved ridge',Amphitheatre:'Horseshoe cliff'};
export const SolidCountRanges={Headland:[2,7],Escarpment:[2,5],Spire:[1,1],Needles:[2,7],WideWall:[3,7],Amphitheatre:[5,7]};
export const SolidPresets={
 Headland:{Width:26,Height:18,Depth:22,PeakCount:0,PeakSpread:.65,PeakSharpness:.35,Lean:.1,Taper:.3,Terraces:.45,BayDepth:.8},
 Escarpment:{Width:36,Height:20,Depth:24,PeakCount:3,PeakSpread:.3,PeakSharpness:.15,Lean:0,Taper:.25,Terraces:.85,BayDepth:.3},
 Spire:{Width:12,Height:36,Depth:12,PeakCount:1,PeakSpread:.65,PeakSharpness:.45,Lean:.15,Taper:.4,Terraces:.4,BayDepth:.4},
 Needles:{Width:32,Height:28,Depth:24,PeakCount:4,PeakSpread:.8,PeakSharpness:.65,Lean:.05,Taper:.35,Terraces:.25,BayDepth:.7},
 WideWall:{Width:56,Height:18,Depth:22,PeakCount:5,PeakSpread:.5,PeakSharpness:.25,Lean:0,Taper:.2,Terraces:.5,BayDepth:.7},
 Amphitheatre:{Width:36,Height:23,Depth:24,PeakCount:5,PeakSpread:.5,PeakSharpness:.2,Lean:0,Taper:.2,Terraces:.3,BayDepth:1.1}
};
function Random(seed){let s=(seed^0x835cab1d)>>>0;s=Math.imul(s^(s>>>16),0x7feb352d)>>>0;s=Math.imul(s^(s>>>15),0x846ca68b)>>>0;return ()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}
const bounds=cell=>{
 const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
 for(const f of cell)for(const p of f.Loop)for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],p[k]);hi[k]=Math.max(hi[k],p[k]);}
 return {lo,hi};
};
const overlap=(a,b)=>a.lo.every((v,k)=>v<b.hi[k]-1e-7&&a.hi[k]>b.lo[k]+1e-7);
function box(w,h,d){
 const p=[[-w/2,0,-d/2],[w/2,0,-d/2],[w/2,0,d/2],[-w/2,0,d/2],[-w/2,h,-d/2],[w/2,h,-d/2],[w/2,h,d/2],[-w/2,h,d/2]];
 const centre=[0,h/2,0];
 return [[0,1,2,3],[4,7,6,5],[0,4,5,1],[1,5,6,2],[2,6,7,3],[3,7,4,0]].map((indices,i)=>{const loop=indices.map(j=>p[j]);return Face(loop,i===0?'Base':i===1?'Crown':'Cliff',Subtract(Centre(loop),centre));});
}
function rock(w,h,d,x,y,z,yaw,bevel,random){
 let cell=box(w,h,d);
 const phase=(random()-.5)*.28;
 // A closed polygon footprint and an area-bearing cap, never a knife-edge crown.
 for(let i=0;i<8;i++){
  const a=i*Math.PI/4+phase+(random()-.5)*.38,cs=Math.cos(a),sn=Math.sin(a);
  const tilt=(random()-.5)*.16;
  cell=ClipCell(cell,[cs/w,tilt/h,sn/d],.40+random()*.13+Math.max(0,tilt)*.5,'Cliff');
  cell=ClipCell(cell,[cs/w,(.16+bevel*.38+random()*.07)/h,sn/d],.54+bevel*.20+random()*.06,'Cliff');
 }
 cell=ClipCell(cell,[(random()-.5)*.3/w,1/h,(random()-.5)*.3/d],.96,'Crown');
 const c=Math.cos(yaw),s=Math.sin(yaw);
 const transform=p=>[x+p[0]*c-p[2]*s,y+p[1],z+p[0]*s+p[2]*c];
 const middle=transform(Centre(cell.flatMap(f=>f.Loop)));
 return cell.map(f=>{const points=f.Loop.map(transform);return Face(points,f.Tag==='Base'&&y>0?'Cliff':f.Tag,Subtract(Centre(points),middle));});
}
// A \ B = successive outside half-spaces; retained pieces have disjoint interiors.
function subtractCell(a,b){
 if(!overlap(bounds(a),bounds(b)))return [a];
 let inside=a;const pieces=[];
 for(const plane of b){
  const offset=Dot(plane.Normal,plane.Loop[0]);
  const outside=ClipCell(inside,Scale(plane.Normal,-1),-offset,'Construction');
  if(outside)pieces.push(outside);
  inside=ClipCell(inside,plane.Normal,offset,'Construction');
  if(!inside)break;
 }
 return pieces;
}
export function ConstructSolidCells(s){
 const random=Random(s.Seed),W=s.Width,H=s.Height,D=s.Depth,primitives=[];
 const add=(w,h,d,x=0,y=0,z=0,yaw=0,bevel=s.PeakSharpness)=>primitives.push(rock(w,h,d,x,y,z,yaw,bevel,random));
 const count=s.PeakCount||3+Math.floor(random()*3),phase=random()*Math.PI*2;
 switch(s.Profile){
 case 'Headland':{
  add(W*.66,H,D*.68,-W*.06,0,-D*.05,(random()-.5)*.45,.12+s.Taper*.35+s.PeakSharpness*.45);
  const n=Math.max(2,count);
  for(let i=0;i<n;i++){
   const angle=phase+i*Math.PI*2/n;
   const h=H*(.30+random()*.35*s.PeakSpread+s.Terraces*.12);
   add(W*(.34+random()*.12),h,D*(.36+random()*.12),Math.cos(angle)*W*(.16+s.BayDepth*.075),0,Math.sin(angle)*D*(.16+s.BayDepth*.075),angle+(random()-.5)*.4,.15+s.PeakSharpness*.5);
  }
  break;
 }
 case 'Escarpment':{
  const tiers=Math.max(2,Math.min(5,count)),rise=H/tiers;
  for(let i=0;i<tiers;i++){
   const t=i/(tiers-1),inset=1-t*(.14+s.Terraces*.30+s.Taper*.12);
   add(W*inset,rise*(i?1.22:1.1),D*inset,(random()-.5)*W*.045,i*rise*.86,(random()-.5)*D*.06,(random()-.5)*.08,.1+s.PeakSharpness*.3);
  }
  break;
 }
 case 'Spire':{
  add(W,H*(.15+.18*s.Terraces),D,0,0,0,phase,.25);
  add(W*(.78-s.Taper*.22),H*.80,D*(.80-s.Taper*.22),W*(random()-.5)*.08,H*(.08+.1*s.Terraces),D*(random()-.5)*.08,phase+.12,.15+s.PeakSharpness*.45);
  // A broad fractured crown above a waist, not a pyramid ending in a flat blade.
  add(W*.66,H*.38,D*.65,W*.055,H*.28,-D*.05,phase+.35,.25);
  add(W*(.62+random()*.17),H*.20,D*(.64+random()*.14),W*(random()-.5)*.13,H*.77,D*(random()-.5)*.1,phase-.14,.35+s.PeakSharpness*.2);
  break;
 }
 case 'Needles':{
  const n=Math.max(2,count);
  add(W*.94,H*(.08+.18*s.Terraces),D*.90,0,0,0,0,.2);
  for(let i=0;i<n;i++){
   const a=phase+i*Math.PI*2/n+(random()-.5)*.24;
   const height=H*(1-s.PeakSpread*.45*random());
   add(W*(.26+random()*.055),height,D*(.34+random()*.055),Math.cos(a)*W*(.20+s.BayDepth*.08),H*(.025+.04*s.Terraces),Math.sin(a)*D*(.20+s.BayDepth*.08),(random()-.5)*.7,.25+s.PeakSharpness*.5);
  }
  break;
 }
 case 'WideWall':{
  const n=Math.max(3,count);
  for(let i=0;i<n;i++){
   const t=i/(n-1)-.5;
   const x=t*W*.85,z=Math.sin(t*Math.PI*1.65+phase*.2)*D*(.22+s.BayDepth*.08);
   const derivative=Math.cos(t*Math.PI*1.65+phase*.2)*D*(.22+s.BayDepth*.08)*Math.PI*1.65/(W*.85);
   add(W/(n-1)*1.65,H*(1-s.PeakSpread*.5*random()),D*.58,x,0,z,Math.atan(derivative),.2+s.PeakSharpness*.4);
  }
  break;
 }
 case 'Amphitheatre':{
  const n=Math.max(5,count),arc=Math.PI*(.95+s.BayDepth*.12),start=(Math.PI-arc)/2;
  const rx=W*.34,rz=D*.34;
  for(let i=0;i<n;i++){
   const a=start+arc*i/(n-1),tangent=Math.atan2(-rz*Math.cos(a),-rx*Math.sin(a));
   const span=arc/(n-1)*Math.hypot(rx*Math.sin(a),rz*Math.cos(a))*1.65;
   add(span,H*(1-.4*s.PeakSpread*(1-random())),D*(.30+(1-s.BayDepth/1.5)*.08),Math.cos(a)*rx,0,-Math.sin(a)*rz,tangent,.15+s.PeakSharpness*.35);
  }
  break;
 }
 default:throw Error('Unknown solid formation');
 }
 // Seeded structural cuts, global lean and proportions operate on complete 3D masses.
 // A single affine transform preserves convexity and matching construction interfaces.
 const all=primitives.flatMap(c=>c.flatMap(f=>f.Loop)),lo=[0,1,2].map(k=>Math.min(...all.map(p=>p[k]))),hi=[0,1,2].map(k=>Math.max(...all.map(p=>p[k])));
 const transform=p=>{
  const t=(p[1]-lo[1])/(hi[1]-lo[1]);
  return [(p[0]-(hi[0]+lo[0])*.5)*W/(hi[0]-lo[0])+s.Lean*W*.18*t,t*H,(p[2]-lo[2])*D/(hi[2]-lo[2])-D];
 };
 const transformed=primitives.map(cell=>{
  const middle=transform(Centre(cell.flatMap(f=>f.Loop)));
  return cell.map(f=>{const p=f.Loop.map(transform);return Face(p,f.Tag,Subtract(Centre(p),middle));});
 });
 let cells=[];
 for(let i=0;i<transformed.length;i++){
  let fragments=[transformed[i]];
  for(let j=0;j<i&&fragments.length;j++)fragments=fragments.flatMap(piece=>subtractCell(piece,transformed[j]));
  cells.push(...fragments);
  if(cells.length>1800)throw Error('Formation cell budget exceeded; reduce the mass count.');
 }
 // Remove numerical zero-volume remnants from polygon Boolean intersections.
 cells=cells.filter(cell=>{
  let volume=0;for(const f of cell)for(let i=1;i<f.Loop.length-1;i++)volume+=Dot(f.Loop[0],Cross(f.Loop[i],f.Loop[i+1]))/6;
  return Number.isFinite(volume)&&volume>1e-8;
 });
 return cells;
}

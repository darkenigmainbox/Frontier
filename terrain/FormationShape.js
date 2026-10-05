// Seeded macro structure, independent of the small surface-relief noise controls.
// A closed paired loft is retained so the existing polygon fracture stages can consume it.
export function ConstructFormation(s){
 let state=(s.Seed^0x72af917b)>>>0;
 state=Math.imul(state^(state>>>16),0x7feb352d)>>>0;state=Math.imul(state^(state>>>15),0x846ca68b)>>>0;state^=state>>>16;
 const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 const count=s.PeakCount||1+Math.floor(random()*5),peaks=[];
 for(let i=0;i<count;i++)peaks.push({x:(i+.22+random()*.56)/count,height:.45+random()*.55,depth:random()*2-1});
 const tallest=Math.max(...peaks.map(p=>p.height));peaks.forEach(p=>p.height/=tallest);
 const points=[{x:0,h:.12+random()*.18,d:random()-.5}];
 for(let i=0;i<count;i++){
  const p=peaks[i],previous=i?peaks[i-1].x:0,next=i+1<count?peaks[i+1].x:1;
  const valley=.18+(1-s.PeakSpread)*.46;
  if(i)points.push({x:(previous+p.x)*.5,h:valley*(.8+random()*.4),d:-(.25+random()*.75)});
  const shoulder=(1-s.PeakSharpness)*.3+.035;
  points.push({x:p.x-(p.x-previous)*shoulder,h:p.height*(.62+(1-s.PeakSharpness)*.28),d:p.depth*.6});
  points.push({x:p.x,h:p.height,d:p.depth});
  points.push({x:p.x+(next-p.x)*shoulder,h:p.height*(.62+(1-s.PeakSharpness)*.28),d:p.depth*.6});
 }
 points.push({x:1,h:.12+random()*.18,d:random()-.5});points.sort((a,b)=>a.x-b.x);
 for(const p of points){
  p.h=.25*(1-s.PeakSpread)+p.h*(.75+.25*s.PeakSpread);
  if(s.Profile==='Amphitheatre')p.h*=.4+.6*Math.abs(p.x*2-1);
  if(s.Profile==='WideWall')p.h=.48+p.h*.52;
  if(s.Profile==='Escarpment')p.h=.22+Math.round(p.h*6)/8;
  if(s.Profile==='Spire')p.h*=.65+.35*Math.sin(p.x*Math.PI);
  if(s.Profile==='Needles')p.h=Math.pow(p.h,1.25);
 }
 const maximum=Math.max(...points.map(p=>p.h));points.forEach(p=>p.h/=maximum);
 const sections=[[0,0],[.19,0],[.43,0],[.7,0],[1,0]];
 const shelf=[0,random()*.06,.12+random()*.15,.28+random()*.15,.37+random()*.16];
 const frontSeeds=points.map(()=>random()),rearSeeds=points.map(()=>random());
 let rows;
 const valid=grid=>{
  for(let i=0;i<grid.length-1;i++)for(let j=0;j<4;j++){
   const p=[grid[i][j],grid[i+1][j],grid[i+1][j+1],grid[i][j+1]];
   for(const [a,b,c]of [[0,1,2],[0,2,3]])if((p[b][0]-p[a][0])*(p[c][1]-p[a][1])-(p[b][1]-p[a][1])*(p[c][0]-p[a][0])<1e-5)return false;
  }return true;
 };
 let guard=1;
 for(const factor of [1,.5,.25,0]){
  guard=factor;
  rows=points.map((p,i)=>sections.map(([t],j)=>[
   (p.x-.5)*s.Width*(1-s.Taper*t*p.h*factor)+s.Lean*s.Width*.3*t*p.h*factor,
   t*p.h*s.Height,
   s.Depth*(p.d*s.BayDepth*.27*s.Relief*(.55+.45*t)-s.Terraces*shelf[j]*s.Retreat/.48+Math.sin(t*Math.PI)*(.04+frontSeeds[i]*.07))
  ]));
  if(valid(rows))break;
 }
 const rear=points.map((p,i)=>sections.map(([t],j)=>{
  const f=rows[i][j];
  // Both flanks vary independently; the mass narrows towards the crown, not to a zero-thickness sheet.
  const thickness=s.Depth*(.68+.26*rearSeeds[i])*(1-s.Taper*t*.65);
  return [f[0],f[1],f[2]-Math.max(s.Depth*.18,thickness)];
 }));
 return {Rows:rows,RearRows:rear,Sections:sections,Stations:points.map(p=>[p.x,p.h,p.d]),Macro:{peaks,guard}};
}

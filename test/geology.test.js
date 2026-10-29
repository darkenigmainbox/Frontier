import test from 'node:test';
import assert from 'node:assert/strict';
import {createFormation,meshFormation} from '../src/geology.js';
const base={type:'rock',seed:18472,complexity:.65,angularity:.62,erosion:.48,resolution:24};
test('seeded fields are deterministic and respond to seed and type',()=>{
 const a=createFormation(base).field,b=createFormation(base).field,c=createFormation({...base,seed:42}).field,d=createFormation({...base,type:'cliff'}).field;
 const points=[[0,1,0],[1.3,1.4,.2],[2,2,0],[-.5,.4,1.4]];
 assert.deepEqual(points.map(p=>a(...p)),points.map(p=>b(...p)));
 assert.notDeepEqual(points.map(p=>a(...p)),points.map(p=>c(...p)));
 assert.notDeepEqual(points.map(p=>a(...p)),points.map(p=>d(...p)));
});
test('produces valid indexed triangles for both formation types',()=>{
 for(const type of ['rock','cliff']){
  const {positions,indices}=meshFormation({...base,type});
  assert.ok(positions.length>300);assert.ok(indices.length>300);assert.equal(indices.length%3,0);
  assert.ok(positions.every(Number.isFinite));assert.ok(indices.every(i=>i<positions.length/3));
  assert.ok(positions.filter((_,i)=>i%3===1).every(y=>y>=-0.00001));
 }
});
test('same settings produce identical meshes',()=>{
 const a=meshFormation(base),b=meshFormation(base);
 assert.deepEqual(a.positions,b.positions);assert.deepEqual(a.indices,b.indices);
});
test('rock types alter geometry and remain deterministic',()=>{
 for(const type of ['rock','cliff']) {
  const meshes=['granite','basalt','limestone'].map(rockType=>meshFormation({...base,type,rockType}));
  assert.notDeepEqual(meshes[0].positions,meshes[1].positions);
  assert.notDeepEqual(meshes[1].positions,meshes[2].positions);
  assert.deepEqual(meshes[1].positions,meshFormation({...base,type,rockType:'basalt'}).positions);
 }
});
test('representative formations are closed two-manifold meshes',()=>{
 for(const type of ['rock','cliff']) for(const rockType of ['granite','basalt','limestone']) {
  const {indices}=meshFormation({...base,type,rockType});
  const edges=new Map();
  for(let i=0;i<indices.length;i+=3) for(const [a,b] of [[indices[i],indices[i+1]],[indices[i+1],indices[i+2]],[indices[i+2],indices[i]]]) {
   const key=a<b?`${a},${b}`:`${b},${a}`;
   edges.set(key,(edges.get(key)||0)+1);
  }
  assert.ok([...edges.values()].every(count=>count===2),`${type} ${rockType} has an open or non-manifold edge`);
 }
});
test('limestone cuts deep solution recesses into the cliff, independent of material',()=>{
 const settings={...base,type:'cliff'};
 function recessCount(rockType) {
  const field=createFormation({...settings,rockType}).field;
  let count=0;
  // Count cross-sections where a point deep in the wall remains solid but
  // the point nearer the face is carved away. No material or color is involved.
  for(let x=-3;x<=3;x+=.1) for(let y=.5;y<=3.6;y+=.1)
   if(field(x,y,-.6)<0 && field(x,y,.6)>0) count++;
  return count;
 }
 const granite=recessCount('granite'), limestone=recessCount('limestone');
 assert.ok(limestone>granite*3,`expected limestone recesses to differ substantially: ${limestone} vs ${granite}`);
});

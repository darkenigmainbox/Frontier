import assert from 'node:assert/strict';
import {TriangleOverlap} from '../terrain/TriangleSolver.js';
import {PrepareContactTriangle,ContactTrianglesOverlap} from '../terrain/TriangleContact.js';
import {BuildFaceErosion,NewErosionIntersections} from '../terrain/FaceErosion.js';
import {GenerateCliff} from '../terrain/FractureSequence.js';
import {ReadSpecification} from '../terrain/CliffSpecification.js';
import {SolidPresets} from '../terrain/SolidFormation.js';
let seed=123;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return (seed>>>0)/4294967296;};
for(let i=0;i<15000;i++){
 const scale=10**((i%10)-6),vertices=Array.from({length:6},()=>[0,1,2].map(()=>12.3+(random()-.5)*scale));
 const a=[0,1,2],b=i%3===0?[0,1,5]:i%3===1?[0,4,5]:[3,4,5];
 if(i%4===0)for(const p of vertices)p[2]=0;
 const shared=a.some(v=>b.includes(v));
 const fast=ContactTrianglesOverlap(PrepareContactTriangle(a,vertices,shared),PrepareContactTriangle(b,vertices,shared));
 assert.equal(fast,TriangleOverlap(a,b,vertices),`SAT parity case ${i}`);
}
const specification=ReadSpecification(SolidPresets.Headland),stage=GenerateCliff(specification).Stages[4],messages=[];
const result=BuildFaceErosion(stage,specification,m=>messages.push(m));
assert.equal(result.Erosion.budgetExceeded,false);assert.equal(result.Erosion.changedRocks,48);
assert(messages.some(m=>m.includes('budget')),'progress within safety passes');
assert.equal(NewErosionIntersections(stage.Meshes,result.Meshes).count,0);
assert.equal(NewErosionIntersections(stage.Meshes,result.Meshes,{reference:true}).count,0,'original SAT agrees on accepted output');
for(const limits of [{milliseconds:0},{work:2000000}]){
 const fallback=BuildFaceErosion(stage,specification,()=>{},limits);
 assert.equal(fallback.Erosion.budgetExceeded,true);assert.equal(fallback.Erosion.changedRocks,0);
 assert.strictEqual(fallback.Meshes,stage.Meshes);assert.strictEqual(fallback.Records,stage.Records);
 assert.match(fallback.Erosion.warning,/Current stage 5 retained unchanged/);
}
console.log(JSON.stringify({passed:true,satParityCases:15000,referenceCheck:true,defaultMilliseconds:result.Erosion.milliseconds,progressMessages:messages.length,deadlineFallback:true,midValidationWorkFallback:true},null,2));

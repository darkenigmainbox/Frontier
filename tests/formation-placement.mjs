import assert from 'node:assert/strict';
import {ReadPlacement} from '../terrain/FormationPlacement.js';
import {ReadRecipe,ReadSpecification,EarliestStage} from '../terrain/CliffSpecification.js';
import {CliffSequence} from '../terrain/FractureSequence.js';
const identity={TransformPosition:[0,0,0],TransformRotation:[0,0,0],TransformScale:[1,1,1]};
assert.deepEqual(ReadPlacement(),identity);
for(const bad of [{TransformScale:[0,1,1]},{TransformScale:[-1,1,1]},{TransformScale:[11,1,1]},{TransformPosition:[Infinity,0,0]},{TransformRotation:[NaN,0,0]},{TransformPosition:[0,0]},{TransformPosition:['1',0,0]}])assert.throws(()=>ReadSpecification(bad));
const a=ReadSpecification(),b=ReadSpecification({...a,TransformPosition:[5,2,-7],TransformRotation:[.2,.4,.1],TransformScale:[1.2,.8,2]});
assert.equal(EarliestStage(a,b),6,'placement must not invalidate geometry');
const seq=new CliffSequence(),before=seq.Generate(a,()=>{},1);const after=seq.Generate(b,()=>{},1);
assert.deepEqual(after.ExecutedStages,[]);assert.deepEqual(after.Stages[0].Meshes,before.Stages[0].Meshes);
assert.deepEqual(ReadRecipe({Format:'Frontier.PolygonCliff',Version:7,Specification:b}),b);
for(const Version of [1,2,3,4,5,6]){
 const recipe=ReadRecipe({Format:'Frontier.PolygonCliff',Version,Specification:{}});assert.deepEqual(ReadPlacement(recipe),identity);
}
const copy=ReadPlacement(identity);copy.TransformScale[0]=2;assert.equal(identity.TransformScale[0],1);
console.log(JSON.stringify({passed:true,identity:true,validation:true,geometryCachePreserved:true,recipe7:true,legacyRecipes:6}));

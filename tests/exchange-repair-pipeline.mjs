import assert from 'node:assert/strict';
import init from 'manifold-3d';
import {MouldSequence} from '../terrain/MouldSequence.js';
import {ReadSpecification} from '../terrain/CliffSpecification.js';
import {SolidPresets} from '../terrain/SolidFormation.js';
const lib=await init();lib.setup();const seq=new MouldSequence(async()=>lib),base=ReadSpecification(SolidPresets.Headland);
const cases=[{DetailMaskMode:'Paint',DetailBias:.5},{DetailMaskMode:'Paint',DetailBias:1.5},{},...Array.from({length:6},(_,i)=>({DetailSeed:40+i,DetailBias:.5})),{DetailScale:4.6,DetailMaskMode:'Paint',DetailBias:.5},{DetailSpacing:.4,DetailBias:.5},{DetailPattern:'Pits',DetailBias:.5},{DetailPattern:'Ridges',DetailBias:.5}];
for(const [index,settings]of cases.entries()){
 const r=await seq.Generate({...base,...settings}),d=r.Stages[5];
 for(const key of ['ZeroArea','OpenEdges','NonmanifoldEdges','NonmanifoldVertices','WindingErrors','DuplicateTriangles'])assert.equal(d.Metrics[key],0,key);
 assert(Number.isFinite(d.Metrics.Volume)&&d.Metrics.Volume>0);assert(d.Detail.removedVolume>=0);
 if(index)assert.deepEqual(r.ExecutedStages,[6]);
 console.log(JSON.stringify({settings,triangles:d.Metrics.Triangles,repairs:d.Detail.exchangeRepairs,passed:true}));
}
console.log(`PASS: ${cases.length} eroded-cliff boolean cases, including both previously failing depths.`);

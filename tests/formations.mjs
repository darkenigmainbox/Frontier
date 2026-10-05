import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {ConstructFormation} from '../terrain/FormationShape.js';
import {ConstructRelief} from '../terrain/ReliefProjection.js';
import {GenerateCliff,CliffSequence} from '../terrain/FractureSequence.js';
import {ReadSpecification,ReadRecipe,FormationPresets,EarliestStage} from '../terrain/CliffSpecification.js';
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const valid=s=>{for(const m of s.Records){for(const k of ['OpenEdges','NonmanifoldEdges','NonmanifoldVertices','WindingErrors','ZeroArea','DuplicateTriangles'])assert.equal(m[k],0,`${m.Name}: ${k}`);assert(Number.isFinite(m.Volume)&&m.Volume>0);}};
const report={cases:[],parameters:[],fullPipelines:[]};
for(const Seed of [1,2,17,42,73,913]){
 const input=ReadSpecification({Seed,NoiseMode:'None',Variation:0}),shape=ConstructRelief(input),stage=GenerateCliff(input,()=>{},1).Stages[0];valid(stage);
 assert.equal(shape.Macro.guard,1);assert.deepEqual(ConstructRelief(input),shape);
 report.cases.push({name:`Seed ${Seed}`,peaks:shape.Macro.peaks.length,triangles:stage.Metrics.Triangles,volume:stage.Metrics.Volume,thinTriangles:stage.Metrics.ThinTriangles,digest:hash(stage.Meshes)});
}
assert(new Set(report.cases.map(x=>x.peaks)).size>=3,'seed must change macro structure without surface noise');
assert.equal(new Set(report.cases.map(x=>x.digest)).size,report.cases.length);
for(const [Profile,preset]of Object.entries(FormationPresets)){
 const s=ReadSpecification({Profile,...preset}),stage=GenerateCliff(s,()=>{},1).Stages[0];valid(stage);
 report.cases.push({name:Profile,triangles:stage.Metrics.Triangles,volume:stage.Metrics.Volume,thinTriangles:stage.Metrics.ThinTriangles});
}
for(const [name,low,high]of [['PeakCount',1,7],['PeakSpread',0,1],['PeakSharpness',0,1],['Lean',-1,1],['Taper',0,.75],['Terraces',0,1],['BayDepth',0,1.5]]){
 const a=ReadSpecification({[name]:low,NoiseMode:'None'}),b=ReadSpecification({[name]:high,NoiseMode:'None'});
 assert.notEqual(hash(ConstructRelief(a).Rows),hash(ConstructRelief(b).Rows),`${name} does not change structure`);
 assert.equal(ConstructFormation(a).Macro.guard,1);assert.equal(ConstructFormation(b).Macro.guard,1);
 for(const s of [a,b])valid(GenerateCliff(s,()=>{},1).Stages[0]);
 assert.equal(EarliestStage(a,b),1);report.parameters.push(name);
}
// Single peaks must still respond to valley/shoulder contrast.
assert.notEqual(hash(ConstructFormation(ReadSpecification({PeakCount:1,PeakSpread:0}))),hash(ConstructFormation(ReadSpecification({PeakCount:1,PeakSpread:1}))));
for(const specification of [{},{Seed:73},{Profile:'Escarpment',...FormationPresets.Escarpment}]){
 const result=GenerateCliff(specification);result.Stages.forEach(valid);
 report.fullPipelines.push({specification,triangles:result.Stages.map(s=>s.Metrics.Triangles),thin:result.Stages.map(s=>s.Metrics.ThinTriangles)});
}
const seq=new CliffSequence();seq.Generate({},()=>{},1);assert.deepEqual(seq.Generate({},()=>{},1).ExecutedStages,[]);assert.deepEqual(seq.Generate({Lean:-.5},()=>{},1).ExecutedStages,[1]);
for(const Version of [1,2,3])assert.equal(ReadRecipe({Format:'Frontier.PolygonCliff',Version,Specification:{}}).ShapeMode,'Authored');
const v4=ReadSpecification({Seed:913,PeakCount:5,Lean:-.5});assert.deepEqual(ReadRecipe({Format:'Frontier.PolygonCliff',Version:4,Specification:v4}),v4);
assert.throws(()=>ReadSpecification({ShapeMode:'Unknown'}));assert.throws(()=>ReadSpecification({Lean:NaN}));
fs.mkdirSync('docs/terrain',{recursive:true});fs.writeFileSync('docs/terrain/formation-checks.json',JSON.stringify({passed:true,...report},null,2)+'\n');console.log(JSON.stringify(report,null,2));

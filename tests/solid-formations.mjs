import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {SolidPresets,SolidCountRanges,ConstructSolidCells} from '../terrain/SolidFormation.js';
import {GenerateCliff,CliffSequence} from '../terrain/FractureSequence.js';
import {ReadSpecification,ReadRecipe} from '../terrain/CliffSpecification.js';
import {InsideMesh} from '../terrain/PolyhedronSolver.js';
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
function components(mesh){
 const parent=mesh.Vertices.map((_,i)=>i);const root=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};
 for(const t of mesh.Triangles){parent[root(t[1])]=root(t[0]);parent[root(t[2])]=root(t[0]);}
 return new Set(mesh.Triangles.flat().map(root)).size;
}
function valid(stage){
 for(const r of stage.Records){for(const k of ['OpenEdges','NonmanifoldEdges','NonmanifoldVertices','WindingErrors','ZeroArea','DuplicateTriangles'])assert.equal(r[k],0,`${r.Name}: ${k}`);assert(Number.isFinite(r.Volume)&&r.Volume>0);}
 for(const m of stage.Meshes)assert(m.Vertices.every(p=>p.every(Number.isFinite)));
}
const make=(Profile,changes={})=>ReadSpecification({...SolidPresets[Profile],ShapeMode:'Solid',Profile,...changes});
const report={passed:false,corpus:[],parameters:[],pipelines:[]};const defaults={};
for(const Profile of Object.keys(SolidPresets))for(const Seed of [1,17,42,73,913]){
 const stage=GenerateCliff(make(Profile,{Seed}),()=>{},1).Stages[0];valid(stage);assert.equal(components(stage.Meshes[0]),1,`${Profile}/${Seed}: unjoined mass or retained internal cap`);
 if(Seed===42)defaults[Profile]=stage.Meshes[0];
 report.corpus.push({Profile,Seed,triangles:stage.Metrics.Triangles,thinTriangles:stage.Metrics.ThinTriangles,volume:stage.Metrics.Volume,components:1});
}
assert.equal(InsideMesh([0,5,-8],defaults.Amphitheatre),false,'horseshoe courtyard must be empty, not a dipped roof');
assert.equal(InsideMesh([0,5,-8],defaults.Escarpment),true,'mesa must be a broad solid platform');
const y=SolidPresets.Spire.Height*.88,cut=[];
for(const t of defaults.Spire.Triangles)for(let j=0;j<3;j++){
 const a=defaults.Spire.Vertices[t[j]],b=defaults.Spire.Vertices[t[(j+1)%3]];
 if((a[1]-y)*(b[1]-y)<0){const f=(y-a[1])/(b[1]-a[1]);cut.push(a.map((x,k)=>x+(b[k]-x)*f));}
}
const span=k=>Math.max(...cut.map(p=>p[k]))-Math.min(...cut.map(p=>p[k]));
assert(span(0)>SolidPresets.Spire.Width*.2&&span(2)>SolidPresets.Spire.Depth*.2,'monolith crown must have width AND depth, not be a blade');
report.crownSection={height:y,width:span(0),depth:span(2)};
const supports={Headland:['PeakCount','PeakSpread','PeakSharpness','Lean','Taper','Terraces','BayDepth'],Escarpment:['PeakCount','PeakSharpness','Lean','Taper','Terraces'],Spire:['PeakSharpness','Lean','Taper','Terraces'],Needles:['PeakCount','PeakSpread','PeakSharpness','Lean','Terraces','BayDepth'],WideWall:['PeakCount','PeakSpread','PeakSharpness','Lean','BayDepth'],Amphitheatre:['PeakCount','PeakSpread','PeakSharpness','Lean','BayDepth']};
const ranges={PeakSpread:[0,1],PeakSharpness:[0,1],Lean:[-1,1],Taper:[0,.75],Terraces:[0,1],BayDepth:[0,1.5]};
for(const [Profile,names]of Object.entries(supports))for(const name of names){
 const [low,high]=name==='PeakCount'?SolidCountRanges[Profile]:ranges[name];
 const a=make(Profile,{[name]:low}),b=make(Profile,{[name]:high});
 assert.notEqual(hash(ConstructSolidCells(a)),hash(ConstructSolidCells(b)),`${Profile}/${name}: inactive visible control`);
 for(const spec of [a,b]){const stage=GenerateCliff(spec,()=>{},1).Stages[0];valid(stage);assert.equal(components(stage.Meshes[0]),1,`${Profile}/${name}: disconnected endpoint`);}
 report.parameters.push({Profile,name,low,high});
}
for(const Profile of Object.keys(SolidPresets)){
 const result=GenerateCliff(make(Profile));result.Stages.forEach(valid);
 report.pipelines.push({Profile,triangles:result.Stages.map(s=>s.Metrics.Triangles),thinTriangles:result.Stages.map(s=>s.Metrics.ThinTriangles)});
}
const source=make('Headland');assert.equal(hash(ConstructSolidCells(source)),hash(ConstructSolidCells(source)));
assert.notEqual(hash(ConstructSolidCells(source)),hash(ConstructSolidCells({...source,Seed:73})));
const seq=new CliffSequence();seq.Generate(source,()=>{},1);assert.deepEqual(seq.Generate(source,()=>{},1).ExecutedStages,[]);assert.deepEqual(seq.Generate({...source,Lean:-.5},()=>{},1).ExecutedStages,[1]);
assert.deepEqual(ReadRecipe({Format:'Frontier.PolygonCliff',Version:5,Specification:source}),source);
assert.equal(ReadRecipe({Format:'Frontier.PolygonCliff',Version:4,Specification:{}}).ShapeMode,'Procedural');
for(const Version of [1,2,3])assert.equal(ReadRecipe({Format:'Frontier.PolygonCliff',Version,Specification:{}}).ShapeMode,'Authored');
report.passed=true;fs.writeFileSync('docs/terrain/solid-formation-checks.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));

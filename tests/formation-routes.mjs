import assert from 'node:assert/strict';
import fs from 'node:fs';
import {GenerateCliff,CliffSequence} from '../terrain/FractureSequence.js';
import {ReadSpecification,ReadRecipe} from '../terrain/CliffSpecification.js';
import {SolidPresets} from '../terrain/SolidFormation.js';
import {RoutePresets,ReadRoute} from '../terrain/FormationRoute.js';
import {InsideMesh} from '../terrain/PolyhedronSolver.js';
const make=(Profile,rest={})=>ReadSpecification({...SolidPresets[Profile],Profile,...rest});
const components=mesh=>{
 const p=mesh.Vertices.map((_,i)=>i);const root=i=>{while(p[i]!==i){p[i]=p[p[i]];i=p[i];}return i;};
 for(const t of mesh.Triangles){p[root(t[1])]=root(t[0]);p[root(t[2])]=root(t[0]);}
 return new Set(mesh.Triangles.flat().map(root)).size;
};
function valid(stage){
 for(const r of stage.Records){for(const k of ['OpenEdges','NonmanifoldEdges','NonmanifoldVertices','WindingErrors','ZeroArea','DuplicateTriangles'])assert.equal(r[k],0,`${r.Name}: ${k}`);assert(r.Volume>0);}
 assert(stage.Meshes.every(m=>m.Vertices.every(p=>p.every(Number.isFinite))));
}
const report={passed:false,corpus:[],parameters:[],pipelines:[]};
for(const Profile of ['RouteCliff','Canyon','RockArch'])for(const pattern of ['Straight','Sweep','Bend'])for(const Seed of [1,42,73]){
 const stage=GenerateCliff(make(Profile,{RoutePoints:RoutePresets[pattern],Seed}),()=>{},1).Stages[0];valid(stage);
 const count=components(stage.Meshes[0]);
 if(Profile!=='Canyon')assert.equal(count,1,`${Profile}/${pattern}/${Seed} disconnected`);
 else if(pattern==='Straight')assert.equal(count,2,'two separate canyon walls');
 report.corpus.push({Profile,pattern,Seed,components:count,triangles:stage.Metrics.Triangles,thin:stage.Metrics.ThinTriangles});
}
for(const Profile of ['RouteCliff','Canyon','RockArch'])for(const [name,values]of Object.entries({RouteSegments:[4,12],RouteWidth:[3,10],RouteSmooth:[0,1],...(Profile==='RockArch'?{ArchThickness:[3,9]}:Profile==='Canyon'?{CanyonGap:[5,16]}:{})})){
 for(const value of values){
  const stage=GenerateCliff(make(Profile,{[name]:value}),()=>{},1).Stages[0];valid(stage);
  if(Profile!=='Canyon')assert.equal(components(stage.Meshes[0]),1,`${Profile}/${name}/${value}`);
 }
 report.parameters.push({Profile,name,values});
}
for(const Profile of ['RouteCliff','Canyon','RockArch']){
 const result=GenerateCliff(make(Profile));result.Stages.forEach(valid);
 report.pipelines.push({Profile,triangles:result.Stages.map(s=>s.Metrics.Triangles),thin:result.Stages.map(s=>s.Metrics.ThinTriangles)});
}
const arch=GenerateCliff(make('RockArch'),()=>{},1).Stages[0].Meshes[0];
assert(!InsideMesh([0,8,-8],arch),'arch must have a real opening');
assert(InsideMesh([0,22,-8],arch),'arch must bridge the opening');
for(const bad of [[],[[0,0]],[[0,0],[0,0]],[[0,0],[Infinity,0]],[[0,0],[2,0]]])assert.throws(()=>ReadRoute(bad));
const source=make('RouteCliff'),seq=new CliffSequence();seq.Generate(source,()=>{},1);
assert.deepEqual(seq.Generate(structuredClone(source),()=>{},1).ExecutedStages,[]);
assert.deepEqual(seq.Generate({...source,RoutePoints:RoutePresets.Bend},()=>{},1).ExecutedStages,[1]);
assert.deepEqual(ReadRecipe({Format:'Frontier.PolygonCliff',Version:6,Specification:source}),source);
report.passed=true;fs.writeFileSync('docs/terrain/route-checks.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));

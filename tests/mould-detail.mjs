import assert from 'node:assert/strict';
import fs from 'node:fs';
import init from 'manifold-3d';
import {MouldSequence} from '../terrain/MouldSequence.js';
import {SolidPresets} from '../terrain/SolidFormation.js';
import {ReadSpecification,ReadRecipe,EarliestStage} from '../terrain/CliffSpecification.js';
import {RepairExchange} from '../terrain/ExchangeRepair.js';
import {MeshMetrics} from '../terrain/PolyhedronSolver.js';
const lib=await init();lib.setup();
// Closed cube with a deliberately collinear inserted face: exercise both repair paths.
for(const fraction of [.5,1e-7]){
 const cube=lib.Manifold.cube([2,2,2]),raw=cube.getMesh();cube.delete();
 const mesh={Vertices:Array.from({length:raw.vertProperties.length/3},(_,i)=>Array.from(raw.vertProperties.slice(i*3,i*3+3))),Triangles:Array.from({length:raw.triVerts.length/3},(_,i)=>Array.from(raw.triVerts.slice(i*3,i*3+3)))};
 const [a,b,c]=mesh.Triangles.shift(),mid=mesh.Vertices.length;
 mesh.Vertices.push(mesh.Vertices[a].map((v,k)=>v+(mesh.Vertices[b][k]-v)*fraction));
 mesh.Triangles.push([a,mid,c],[mid,b,c],[mid,a,b]);mesh.Tags=mesh.Triangles.map(()=>'Cliff');
 assert.equal(MeshMetrics(mesh).OpenEdges,0);assert.equal(MeshMetrics(mesh).ZeroArea,1);
 assert(RepairExchange(mesh)>0);const m=MeshMetrics(mesh);
 for(const key of ['OpenEdges','NonmanifoldEdges','NonmanifoldVertices','WindingErrors','ZeroArea','DuplicateTriangles'])assert.equal(m[key],0,key);
 assert(Math.abs(m.Volume-8)<1e-8);
}
const sequence=new MouldSequence(async()=>lib), reports=[];
function solid(meshes){const p=[],t=[];let n=0;for(const m of meshes){for(const v of m.Vertices)p.push(...v);for(const tri of m.Triangles)t.push(...tri.map(i=>i+n));n+=m.Vertices.length;}return new lib.Manifold(new lib.Mesh({numProp:3,vertProperties:new Float32Array(p),triVerts:new Uint32Array(t)}));}
function check(r){
 const d=r.Stages[5],s=d.Detail;
 for(const key of ['OpenEdges','NonmanifoldEdges','NonmanifoldVertices','WindingErrors','ZeroArea','DuplicateTriangles'])assert.equal(d.Metrics[key],0,key);
 if(s.amplitude>0){assert(s.minimumOffset<0);assert(s.maximumOffset>0);assert(s.appliedVertices>0);}
 assert(s.removedVolume>=-.02);assert.equal(s.appliedVertices,s.mouldVerticesMoved);
 assert(s.refinedTriangles<=220000);assert(s.cleanupTolerance<=.003);
 const before=solid(r.Stages[4].Meshes),after=solid(d.Meshes),outside=after.subtract(before);
 const excess=Math.abs(outside.volume());assert(excess<.05,`numeric excess outside stage 5: ${excess}`);
 outside.delete();after.delete();before.delete();
 reports.push({profile:r.Specification.Profile,seed:r.Specification.DetailSeed,...s,numericalExcessVolume:excess,thinTriangles:d.Metrics.ThinTriangles});
 console.log(JSON.stringify(reports.at(-1)));
}
let spec=ReadSpecification({...SolidPresets.Headland,Profile:'Headland'});
let r=await sequence.Generate(spec);check(r);
const source=JSON.stringify(r.Stages.slice(0,5));
assert.strictEqual((await sequence.Generate(spec)).Stages[5],r.Stages[5]);
assert.deepEqual((await sequence.Generate({...spec,TransformPosition:[2,3,4]})).ExecutedStages,[]);
const changed=await sequence.Generate({...spec,DetailSeed:43});check(changed);
assert.deepEqual(changed.ExecutedStages,[6]);assert.deepEqual(changed.ReusedStages,[1,2,3,4,5]);
assert.equal(JSON.stringify(changed.Stages.slice(0,5)),source,'stages 1–5 stay untouched');
assert.notDeepEqual(changed.Stages[5].Meshes,r.Stages[5].Meshes);
const neutral=await sequence.Generate({...spec,DetailAmplitude:0,DetailBias:0});check(neutral);
assert(Math.abs(neutral.Stages[5].Detail.removedVolume)<.1,'neutral mould should preserve stage 5 within exchange precision');
assert.equal(EarliestStage(spec,{...spec,DetailSeed:43}),6);
assert.deepEqual(ReadRecipe({Format:'Frontier.PolygonCliff',Version:9,Specification:spec}),spec);
for(const Profile of ['WideWall','RockArch','Canyon','Spire','RouteCliff']){
 r=await sequence.Generate({...SolidPresets[Profile],Profile});check(r);
}
fs.mkdirSync('.arena',{recursive:true});fs.writeFileSync('.arena/mould-results.json',JSON.stringify({passed:true,reports},null,2));
console.log('PASS: topology, conservative subtraction, signed warp, cache, placement, neutral control, recipe round-trip and six formations.');

import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import {CliffSequence} from '../terrain/FractureSequence.js';
import {ReadSpecification,ReadRecipe,EarliestStage} from '../terrain/CliffSpecification.js';
import {DetailMesh} from '../terrain/SurfaceDetail.js';

const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const valid=m=>{
 for(const k of ['OpenEdges','NonmanifoldEdges','NonmanifoldVertices','ZeroArea','WindingErrors','DuplicateTriangles'])assert.equal(m[k],0,k);
 assert(Number.isFinite(m.Volume)&&m.Volume>0);
};
const baseline=JSON.parse(fs.readFileSync(new URL('./fixtures/terrain-baseline.json',import.meta.url)));
const sequence=new CliffSequence(),start=performance.now();
const result=sequence.Generate({});
for(const fixture of baseline.checks){
 const stage=result.Stages[fixture.stage-1];
 assert.equal(hash(stage.Meshes),fixture.digest,`stage ${fixture.stage} changed from rollback baseline`);
 valid(stage.Metrics);
}
const originalHash=hash(result.Stages.slice(0,5));
const detail=result.Stages[5];valid(detail.Metrics);
assert(detail.Metrics.Triangles>result.Stages[4].Metrics.Triangles);
assert(detail.Metrics.Triangles<=result.Specification.DetailBudget);
assert(detail.Metrics.MovedVertices>1000);
assert(detail.Metrics.MaxDisplacement>0&&detail.Metrics.MaxDisplacement<=result.Specification.DetailDepth);
for(const mesh of detail.Meshes){
 assert(mesh.Vertices.every(v=>v.every(Number.isFinite)));
 assert.equal(mesh.Tags.length,mesh.Triangles.length);
 assert.equal(mesh.DetailNormals.length,mesh.Vertices.length);
 assert(mesh.Triangles.every(t=>t.length===3&&t.every(i=>Number.isInteger(i)&&i>=0&&i<mesh.Vertices.length)));
}
assert.deepEqual(sequence.Generate({}).ExecutedStages,[]);
for(const changes of [{DetailRock:'Granite'},{DetailRock:'Slate'},{DetailSeed:789}]){
 const r=sequence.Generate(changes);valid(r.Stages[5].Metrics);
 assert.deepEqual(r.ExecutedStages,[6]);assert.deepEqual(r.ReusedStages,[1,2,3,4,5]);
 assert.notEqual(hash(r.Stages[5].Meshes),hash(detail.Meshes));
 assert.equal(hash(r.Stages.slice(0,5)),originalHash);
}
const replay=sequence.Generate({});assert.equal(hash(replay.Stages[5].Meshes),hash(detail.Meshes),'deterministic stage-6 replay');
const disabled=sequence.Generate({DetailDepth:0});valid(disabled.Stages[5].Metrics);
assert.equal(disabled.Stages[5].Metrics.MovedVertices,0);
assert.equal(disabled.Stages[5].Metrics.MaxDisplacement,0);
assert(Math.abs(disabled.Stages[5].Metrics.Volume-result.Stages[4].Metrics.Volume)<1e-7,'refinement alone preserves volume');
assert.equal(hash(disabled.Stages.slice(0,5)),originalHash,'stage 5 was not modified');

// A closed cube forces shared-edge refinement across face boundaries.
const cube={Name:'Fixture cube',Vertices:[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]],
 Triangles:[[0,2,1],[0,3,2],[4,5,6],[4,6,7],[0,1,5],[0,5,4],[3,7,6],[3,6,2],[0,4,7],[0,7,3],[1,2,6],[1,6,5]],Tags:Array(12).fill('Cliff'),Spalls:[],Cracks:[]};
const inputHash=hash(cube);
for(const budget of [12,40,256,2000]){
 const r=DetailMesh(cube,ReadSpecification({DetailDepth:.3,DetailSpan:.15}),budget);valid(r.metrics);
 assert(r.mesh.Triangles.length<=budget);
 assert.equal(hash(cube),inputHash);
 for(let i=0;i<8;i++)assert.deepEqual(r.mesh.Vertices[i],cube.Vertices[i],'protected cube corners moved');
}
// Isolate the two broad faces; side-face inward rays legitimately have a 2m clearance.
const slab={...cube,Name:'Thin slab',Tags:cube.Tags.map((t,i)=>i<4?t:'Base'),Vertices:cube.Vertices.map(([x,y,z])=>[x,y,z*.00002])};
const thin=DetailMesh(slab,ReadSpecification({DetailDepth:.3,DetailSpan:.15}),2000);valid(thin.metrics);
assert(thin.mesh.Detail.MaxDisplacement<=.0000048+1e-10,'opposing wall limits inward displacement');
for(const mesh of detail.Meshes)mesh.Triangles.forEach((t,i)=>{
 if(['Crack','Base','Termination'].includes(mesh.Tags[i]))for(const v of t)assert.equal(mesh.DetailDepths[v],0,'protected feature moved');
});
assert.equal(EarliestStage(ReadSpecification(),ReadSpecification({DetailDepth:.05})),6);
assert.equal(EarliestStage(ReadSpecification(),ReadSpecification()),7);
assert.equal(EarliestStage(ReadSpecification(),ReadSpecification({Seed:17})),1);
for(const Version of [1,2,3])assert(ReadRecipe({Format:'Frontier.PolygonCliff',Version,Specification:{}}));
assert.throws(()=>ReadSpecification({DetailDepth:NaN}));assert.throws(()=>ReadSpecification({DetailRock:'Unknown'}));
console.log(JSON.stringify({passed:true,defaultStage6:detail.Metrics,seconds:(performance.now()-start)/1000},null,2));

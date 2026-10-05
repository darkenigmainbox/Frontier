import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import {GenerateCliff} from '../terrain/FractureSequence.js';
import {ParticleSimulation,ReadParticles,Minerals} from '../terrain/ParticleSimulation.js';
const hash=s=>createHash('sha256').update(Buffer.from(s.snapshot().attributes.buffer)).digest('hex');
const check=s=>{const m=s.metrics();assert(Math.abs(m.massResidual)<1e-12);assert(Object.values(m).every(Number.isFinite));assert.equal(m.bound+m.loose+m.removed,m.particles);for(const p of s.particles){assert(p.r>=0&&p.mass>=0);assert(p.water>=0&&p.water<=1&&p.oxide>=0&&p.oxide<=1&&p.bond>=0&&p.bond<=1);assert([p.x,p.y,p.z,p.vx,p.vy,p.vz,p.r].every(Number.isFinite));if(!Minerals[p.type].iron)assert.equal(p.oxide,0);}};
const baseline=JSON.parse(fs.readFileSync(new URL('./fixtures/terrain-baseline.json',import.meta.url)));
const cliff=GenerateCliff({ShapeMode:'Authored'});assert.equal(cliff.Stages.length,5);for(const fixture of baseline.checks)assert.equal(createHash('sha256').update(JSON.stringify(cliff.Stages[fixture.stage-1].Meshes)).digest('hex'),fixture.digest,'original cliff stage changed');
const small={Count:800,Size:.02,Thickness:.001,Radius:.0004};
const a=new ParticleSimulation(small),b=new ParticleSimulation(small);assert.equal(hash(a),hash(b));assert.notEqual(hash(a),hash(new ParticleSimulation({...small,Seed:99})));
// Packing occupies continuous 3D coordinates, not columns or a regular layered lattice.
assert(new Set(a.particles.map(p=>p.z.toFixed(9))).size>a.particles.length*.95);
for(let i=0;i<a.particles.length;i++)for(let j=i+1;j<a.particles.length;j++){const p=a.particles[i],q=a.particles[j];assert(Math.hypot(p.x-q.x,p.y-q.y,p.z-q.z)+1e-12>=p.r+q.r);}
const initialPositions=a.particles.map(p=>[p.x,p.y,p.z]);
for(let i=0;i<250;i++){a.step();b.step();if(i%25===0)check(a);}assert.equal(hash(a),hash(b));check(a);
assert(a.metrics().dissolved>0&&a.metrics().oxidation>0);
assert(a.particles.some((p,i)=>p.mode!==0&&Math.hypot(p.x-initialPositions[i][0],p.y-initialPositions[i][1],p.z-initialPositions[i][2])>1e-6));
assert(a.particles.some(p=>p.r<p.initialR*.95),'chemical attack changes real grain size');
const dry=new ParticleSimulation({...small,Rain:0});const anoxic=new ParticleSimulation({...small,Oxygen:0});
for(let i=0;i<120;i++){dry.step();anoxic.step();}check(dry);check(anoxic);assert.equal(dry.metrics().dissolved,0);assert.equal(dry.metrics().oxidation,0);assert.equal(anoxic.metrics().oxidation,0);
const acid=new ParticleSimulation({...small,Preset:'Limestone',Acidity:1}),neutral=new ParticleSimulation({...small,Preset:'Limestone',Acidity:0});
for(let i=0;i<120;i++){acid.step();neutral.step();}check(acid);assert(acid.metrics().dissolved>neutral.metrics().dissolved*2);
const quartzLoss=a.particles.filter(p=>p.type===0&&p.mode<2).map(p=>1-p.mass/p.initialMass),calciteLoss=a.particles.filter(p=>p.type===2&&p.mode<2).map(p=>1-p.mass/p.initialMass);
const mean=v=>v.reduce((a,b)=>a+b,0)/v.length;assert(mean(calciteLoss)>mean(quartzLoss)*10);
const changed=new ParticleSimulation(small),replay=new ParticleSimulation(small);for(let i=0;i<60;i++){const setting=i<20?{Rain:.2}:i<40?{Rain:.9,Acidity:.8}:{Oxygen:0};changed.step(setting);replay.step(setting);}assert.equal(hash(changed),hash(replay));
assert.throws(()=>a.step({Radius:.001}),/rebuild/);assert.throws(()=>ReadParticles({Rain:NaN}));assert.throws(()=>ReadParticles({Preset:'Fake'}));
const defaultCase=new ParticleSimulation();const fresh=defaultCase.metrics();for(let i=0;i<200;i++)defaultCase.step();check(defaultCase);
console.log(JSON.stringify({passed:true,fresh,weathered200:defaultCase.metrics(),acidDissolutionRatio:acid.metrics().dissolved/neutral.metrics().dissolved,calciteVsQuartzFractionalLoss:mean(calciteLoss)/mean(quartzLoss),checks:['packing separation','continuous 3D positions','determinism','mineral selectivity','dry/anoxic controls','particle motion','radius loss','mass ledger','parameter validation','parameter-event replay']},null,2));

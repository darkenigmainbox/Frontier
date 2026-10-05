import assert from 'node:assert/strict';import fs from 'node:fs';import {createHash} from 'node:crypto';import {inflateSync} from 'node:zlib';
import {BuildRayTree} from '../terrain/SurfaceRayTree.js';import {AnalyseSurface,WeatherSurface,BakeSurface,ReadSurfaceSettings} from '../terrain/SurfaceBake.js';import {EncodePNG,CRC32,ZipFiles,SurfaceOBJ} from '../terrain/SurfaceExport.js';import {GenerateCliff} from '../terrain/FractureSequence.js';
const hash=a=>createHash('sha256').update(a).digest('hex');
const box={Name:'Cube',Vertices:[[-1,0,-1],[1,0,-1],[1,0,1],[-1,0,1],[-1,2,-1],[1,2,-1],[1,2,1],[-1,2,1]],Triangles:[[0,1,2],[0,2,3],[4,6,5],[4,7,6],[0,4,5],[0,5,1],[3,2,6],[3,6,7],[1,5,6],[1,6,2],[0,3,7],[0,7,4]],Tags:Array(12).fill('Cliff')};
const roof={Name:'Roof',Vertices:[[-5,3,-5],[5,3,-5],[5,3,5],[-5,3,5]],Triangles:[[0,2,1],[0,3,2]],Tags:['Cliff','Cliff']};
const ray=BuildRayTree(box.Vertices,box.Triangles);assert(Math.abs(ray([0,4,0],[0,-1,0],10)-2)<1e-6);assert.equal(ray([0,4,0],[0,1,0],10),10);
const clear=AnalyseSurface([box],{}),covered=AnalyseSurface([box,roof],{});
assert(clear.faces[2].ao>covered.faces[2].ao+.15,'roof casts actual AO');assert(Math.max(...clear.point)>0,'convex cube pointiness');assert(Math.max(...clear.cavity)<1e-6,'convex cube has no concave edges');
const dry=WeatherSurface(clear,{Rain:0}),wet=WeatherSurface(clear,{}),anoxic=WeatherSurface(clear,{Oxygen:0}),neutral=WeatherSurface(clear,{Acidity:0});
assert(wet.oxide.some(v=>v>0));assert(wet.loss.some(v=>v>0));assert(dry.water.every(v=>v===0)&&dry.oxide.every(v=>v===0)&&dry.loss.every(v=>v===0));assert(anoxic.oxide.every(v=>v===0));assert(neutral.loss.every(v=>v===0));assert(Math.abs(wet.ledger.residual)<1e-8);
const fresh=BakeSurface([box],{Resolution:512,Cycles:0}),aged=BakeSurface([box],{Resolution:512}),replay=BakeSurface([box],{Resolution:512});
assert.deepEqual(fresh.maps.Albedo,fresh.maps.Fresh);assert.notEqual(hash(aged.maps.Albedo),hash(fresh.maps.Albedo));assert.equal(hash(aged.maps.Albedo),hash(replay.maps.Albedo));
for(let i=0;i<aged.maps.Splat.length;i+=4){const sum=aged.maps.Splat[i]+aged.maps.Splat[i+1]+aged.maps.Splat[i+2]+aged.maps.Splat[i+3];if(sum)assert(Math.abs(sum-255)<=2,'normalised RGBA material weights');}
for(const bad of [{Resolution:100},{Cycles:NaN},{Rock:'Fake'},{Rain:-1},{AOSamples:0}])assert.throws(()=>ReadSurfaceSettings(bad));
assert.equal(CRC32(new TextEncoder().encode('123456789')),0xcbf43926);
const rgba=new Uint8Array([255,128,64,0,64,255,128,128]),png=await EncodePNG(2,1,rgba);let pos=8,idat=[];while(pos<png.length){let size=new DataView(png.buffer).getUint32(pos),name=new TextDecoder().decode(png.slice(pos+4,pos+8));if(name==='IDAT')idat.push(png.slice(pos+8,pos+8+size));pos+=12+size;}
assert.deepEqual(new Uint8Array(inflateSync(Buffer.concat(idat)).subarray(1)),rgba,'PNG must preserve splat RGB even at zero alpha');
const zip=ZipFiles([{name:'test.png',data:png}]);assert.equal(new DataView(await zip.arrayBuffer()).getUint32(0,true),0x04034b50);
const text=SurfaceOBJ([box],aged.uvs,p=>p.map(v=>v+2));assert(text.includes('v 1.00000000 2.00000000 1.00000000'));assert.equal(text.split('\n').filter(l=>l.startsWith('vt ')).length,36);
const cliff=GenerateCliff({ShapeMode:'Solid',Profile:'Headland',Width:26,Height:18,Depth:22}),stage=cliff.Stages[4],before=hash(JSON.stringify(stage.Meshes));
const baked=BakeSurface(stage.Meshes,{Resolution:1024});assert.equal(hash(JSON.stringify(stage.Meshes)),before,'bake must not alter geometry');assert(Math.abs(baked.stats.waterLedger.residual)<1e-6);assert(baked.maps.Cracks.some((v,i)=>i%4===0&&v>0),'actual stage-5 fracture/fissure masks');
assert(baked.uvs.every(uv=>uv.every(v=>Number.isFinite(v)&&v>=0&&v<=1)));
const report={passed:true,occlusion:{clear:clear.faces[2].ao,covered:covered.faces[2].ao},waterLedger:wet.ledger,deterministic:true,noRainControl:true,anoxicControl:true,neutralControl:true,losslessRGBA:true,stage5:baked.stats,geometryUnchanged:true};
fs.writeFileSync('docs/terrain/surface-checks.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));

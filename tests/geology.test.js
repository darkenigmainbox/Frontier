import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateRock,rng} from '../src/geology.js';
const base={seed:28471,formation:'cliff',height:65,fracture:58,erosion:36,preview:true};
test('seeded RNG is deterministic and seed-sensitive',()=>{
 const a=rng(11),b=rng(11),c=rng(12);
 const aa=Array.from({length:20},a),bb=Array.from({length:20},b),cc=Array.from({length:20},c);
 assert.deepEqual(aa,bb);assert.notDeepEqual(aa,cc);assert.ok(aa.every(n=>n>=0&&n<1));
});
test('same parameters reproduce the complete mesh',()=>{
 const a=generateRock(base),b=generateRock(base);assert.deepEqual(a.positions,b.positions);assert.deepEqual(a.indices,b.indices);assert.deepEqual(a.normals,b.normals);
});
test('seeds change the silhouette rather than only the color',()=>{
 const a=generateRock(base),b=generateRock({...base,seed:582});assert.notDeepEqual(a.positions,b.positions);
});
for(const formation of ['cliff','outcrop','spire','arch'])test(`${formation}: finite indexed geometry with valid normals and closed edges`,()=>{
 const m=generateRock({...base,formation});const count=m.positions.length/3;
 assert.ok(count>100);assert.equal(m.normals.length,m.positions.length);assert.equal(m.colors.length,m.positions.length);assert.equal(m.indices.length%3,0);
 assert.ok(m.positions.every(Number.isFinite));assert.ok(m.normals.every(Number.isFinite));assert.ok(m.indices.every(i=>i<count));
 for(let i=0;i<m.normals.length;i+=3)assert.ok(Math.abs(Math.hypot(...m.normals.slice(i,i+3))-1)<.001);
 const edges=new Map();for(let i=0;i<m.indices.length;i+=3){for(let e=0;e<3;e++){let a=m.indices[i+e],b=m.indices[i+(e+1)%3];if(a>b)[a,b]=[b,a];const key=a*count+b;edges.set(key,(edges.get(key)||0)+1);}}
 assert.ok([...edges.values()].every(n=>n===2),'surface must be closed at grid bounds');
});
test('weathering and fracture parameters change geometry',()=>{
 const a=generateRock(base),b=generateRock({...base,erosion:0}),c=generateRock({...base,fracture:90});assert.notDeepEqual(a.positions,b.positions);assert.notDeepEqual(a.positions,c.positions);
});

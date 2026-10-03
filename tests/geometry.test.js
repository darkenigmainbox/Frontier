import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import pc from 'polygon-clipping';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';
import { OBJExporter } from 'three/addons/exporters/OBJExporter.js';
import { DEFAULTS, buildTreads, buildCasing, validateSettings } from '../src/geometry.js';
import { PATTERNS, MUD_MIRROR_AXIS, patternBlocks, patternSVG } from '../src/patterns.js';

const area=multi=>multi.reduce((acc,poly)=>acc+poly.reduce((a,r,j)=>a+(j?-1:1)*Math.abs(r.reduce((s,p,i)=>{const q=r[(i+1)%r.length];return s+p[0]*q[1]-q[0]*p[1]},0)/2),0),0);
const preset=p=>({...DEFAULTS,pattern:p.id,width:p.width,depth:p.depth,repeats:p.repeats});
function checkGeometry(g) {
  assert.ok(g.attributes.position.count>0);
  for(const attribute of ['position','normal']) for(const v of g.attributes[attribute].array) assert.ok(Number.isFinite(v),`${attribute} must be finite`);
  assert.equal(g.attributes.uv,undefined,'No texture coordinates required');
  g.computeBoundingBox();assert.ok(g.boundingBox.max.x>g.boundingBox.min.x);
}

for(const p of PATTERNS) {
  test(`${p.name}: polygon outlines keep grooves open across repeat seams`,()=>{
    const blocks=Array.from({length:4},(_,i)=>patternBlocks(p.id,i%2).map(b=>b.points.map(([x,y])=>[x,y+i]))).flat();
    for(let i=0;i<blocks.length;i++) for(let j=i+1;j<blocks.length;j++) assert.ok(area(pc.intersection([blocks[i]],[blocks[j]]))<1e-7,`Lugs ${i} and ${j} intersect`);
    assert.ok(patternSVG(p.id).includes('<path'));
  });
  for(const view of ['flat','tire']) test(`${p.name}: ${view} extruded mesh has finite vertices, normals, depth and counts`,()=>{
    const settings={...preset(p),view};const {geometry,blocks,ejectors,count}=buildTreads(settings);checkGeometry(geometry);
    assert.equal(count,view==='flat'?6:p.repeats);
    const features=Array.from({length:count},(_,i)=>patternBlocks(p.id,i%2)).flat();
    assert.equal(blocks,features.filter(b=>b.role!=='ejector').length);
    assert.equal(ejectors,features.filter(b=>b.role==='ejector').length);
    if(view==='flat'){
      assert.ok(Math.abs(geometry.boundingBox.max.y-p.depth)<.01);
      // A true recessed sipe floor exists at 70% of the lug height.
      const pos=geometry.attributes.position;let floorVertices=0;
      for(let i=0;i<pos.count;i++)if(Math.abs(pos.getY(i)-p.depth*.70)<.01)floorVertices++;
      assert.ok(floorVertices>100,'Missing modeled sipe floor');
    } else {
      assert.ok(geometry.boundingBox.max.y<settings.radius+p.depth+.1);
      assert.ok(geometry.boundingBox.max.z>settings.radius+p.depth-1);
    }
    geometry.dispose();
  });
  test(`${p.name}: removing sipes reduces topology, not just appearance`,()=>{
    const a=buildTreads({...preset(p),view:'flat',sipes:true}).geometry;
    const b=buildTreads({...preset(p),view:'flat',sipes:false}).geometry;
    assert.ok(a.attributes.position.count>b.attributes.position.count);a.dispose();b.dispose();
  });
  test(`${p.name}: parameter limits generate valid geometry`,()=>{
    for(const overrides of [ {radius:250,width:360,depth:26,repeats:20,gap:.65}, {radius:500,width:180,depth:4,repeats:72,gap:1.6} ]){
      const {geometry}=buildTreads({...preset(p),...overrides,view:'flat'});checkGeometry(geometry);geometry.dispose();
    }
  });
}

test('Tire casing is a closed indexed manifold with outward-facing crown normals',()=>{
  const g=buildCasing(DEFAULTS);checkGeometry(g);
  const indices=g.index.array,edges=new Map();
  for(let i=0;i<indices.length;i+=3)for(let j=0;j<3;j++){
    const a=indices[i+j],b=indices[i+(j+1)%3],key=a<b?`${a},${b}`:`${b},${a}`;
    edges.set(key,(edges.get(key)??0)+1);
  }
  for(const count of edges.values())assert.equal(count,2);
  assert.ok(g.attributes.normal.getZ(0)>.99);g.dispose();
});

test('Invalid dimensions, odd repeat counts and unknown patterns are rejected',()=>{
  for(const patch of [{radius:NaN},{width:0},{depth:-2},{repeats:31},{gap:9},{view:'invalid'}])assert.throws(()=>validateSettings({...DEFAULTS,...patch}));
  assert.throws(()=>buildTreads({...DEFAULTS,pattern:'invalid'}));
});

test('STL and OBJ contain the generated geometry with no material-map dependency',()=>{
  const {geometry}=buildTreads({...DEFAULTS,view:'flat'});
  const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial());mesh.name='Tread';mesh.updateMatrixWorld(true);
  const stl=new STLExporter().parse(mesh,{binary:true});
  assert.equal(stl.getUint32(80,true),geometry.attributes.position.count/3);
  assert.equal(stl.byteLength,84+50*stl.getUint32(80,true));
  const obj=new OBJExporter().parse(mesh);
  assert.ok(obj.includes('o Tread'));assert.ok(obj.includes('\nv '));assert.ok(obj.includes('\nf '));
  assert.ok(!obj.includes('map_'));assert.ok(!obj.includes('NaN'));
  mesh.geometry.dispose();mesh.material.dispose();
});

test('Revision 2: highway has four persistent channels and a connected narrow rib',()=>{
  const blocks=patternBlocks('highway');
  assert.equal(blocks.length,5);
  const rib=blocks.find(b=>b.continuous);
  assert.ok(rib);assert.equal(rib.role,'rib');
  const ys=rib.points.map(p=>p[1]);assert.equal(Math.min(...ys),0);assert.equal(Math.max(...ys),1);
  assert.ok(blocks[0].points.length>15,'Swept shoulder must be sampled geometry');
  for(let i=1;i<blocks.length;i++)assert.ok(Math.min(...blocks[i].points.map(p=>p[0]))>Math.max(...blocks[i-1].points.map(p=>p[0])));
});

test('Revision 2: rugged center changes between pitches, shoulders keep their phase',()=>{
  const even=patternBlocks('rugged',0),odd=patternBlocks('rugged',1);
  assert.deepEqual(even.slice(0,2),odd.slice(0,2));
  assert.equal(even.length,4);assert.equal(odd.length,5);
  assert.notDeepEqual(even.slice(2),odd.slice(2));
  assert.deepEqual(patternBlocks('rugged',2),even);
});

test('Revision 2: all-terrain center crosses pitch boundaries rather than forming horizontal rows',()=>{
  const centers=patternBlocks('all-terrain').filter(b=>b.role==='lug');
  assert.equal(centers.length,2);
  for(const b of centers)assert.ok(Math.max(...b.points.map(p=>p[1]))>1);
});

test('Revision 2: mud ejectors are separate low geometry, not full-height tread lugs',()=>{
  const p=PATTERNS.find(p=>p.id==='mud');
  const source=patternBlocks('mud'),bars=source.filter(b=>b.role==='ejector');
  assert.equal(bars.length,4);assert.ok(bars.every(b=>b.heightRatio===.24));
  const {geometry,blocks,ejectors}=buildTreads({...preset(p),view:'flat'});
  assert.equal(blocks,24);assert.equal(ejectors,24);
  const pos=geometry.attributes.position;let barTops=0;
  for(let i=0;i<pos.count;i++)if(Math.abs(pos.getY(i)-p.depth*.24)<.001)barTops++;
  assert.ok(barTops>50,'Ejector tops must exist at 24% of tread depth');
  geometry.dispose();
});

// Every colored pair in the annotated reference is produced from one source.
// A point mirror reverses both in-plane axes and therefore preserves winding.
test('Revision 3: rugged paired outlines AND sipes are exact point mirrors',()=>{
  const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-12,`${a} != ${b}`);
  const check=(source,opposed)=>{
    assert.equal(source.length,opposed.length);
    source.forEach(([x,y],i)=>{close(opposed[i][0],-x);close(opposed[i][1],1-y);});
  };
  const winding=points=>points.reduce((sum,[x,y],i)=>{const q=points[(i+1)%points.length];return sum+x*q[1]-q[0]*y;},0);
  for(const parity of [0,1]){
    const blocks=patternBlocks('rugged',parity);
    for(const source of blocks.filter(b=>b.instance==='source')){
      const mate=blocks.find(b=>b.family===source.family&&b.instance==='opposed');
      assert.ok(mate,`Missing mirrored ${source.family}`);
      check(source.points,mate.points);
      assert.equal(source.sipes.length,mate.sipes.length);
      source.sipes.forEach((s,i)=>check(s,mate.sipes[i]));
      assert.equal(Math.sign(winding(source.points)),Math.sign(winding(mate.points)));
      assert.equal(source.heightRatio,mate.heightRatio);
    }
  }
});

test('Revision 3: green center lug has mirrored perimeter halves, opposing notches and matching sipes',()=>{
  const center=patternBlocks('rugged',1).find(b=>b.family==='center');
  assert.ok(center);assert.equal(center.instance,'self-mirrored');
  const half=center.points.length/2;
  for(let i=0;i<half;i++){
    assert.ok(Math.abs(center.points[i][0]+center.points[i+half][0])<1e-12);
    assert.ok(Math.abs(center.points[i][1]+center.points[i+half][1]-1)<1e-12);
  }
  center.sipes[0].forEach(([x,y],i)=>{
    assert.ok(Math.abs(x+center.sipes[1][i][0])<1e-12);
    assert.ok(Math.abs(y+center.sipes[1][i][1]-1)<1e-12);
  });
  const svg=patternSVG('rugged',6,{annotate:true});
  for(const family of ['shoulder','upright','center','diagonal'])assert.ok(svg.includes(`data-family="${family}"`));
  for(const color of ['#e64943','#fff2c1','#58b94a','#e69a36'])assert.ok(svg.includes(color));
});

test('Revision 5 leaves highway, all-terrain and the corrected rugged pattern unchanged',async()=>{
  const { createHash }=await import('node:crypto');
  const baseline={
    highway:'14706e9d04798b2deacb0651f7cb05ebbb3b2653bead4d29ed5b4c691237890e',
    'all-terrain':'e32d0d4b47bd655c1d39703de454e972dce5edf313f365fd323cb5449048df56',
    rugged:'d9bf8cf0fb119f9fd6cabd0b033d849215de40c1657be651d17fc22a6e608454',
  };
  for(const [id,hash] of Object.entries(baseline)){
    const actual=createHash('sha256').update(JSON.stringify([patternBlocks(id,0),patternBlocks(id,1)])).digest('hex');
    assert.equal(actual,hash,`${id} changed during the mud-only correction`);
  }
});

test('Mud pairs share a point mirror, including sipes and ejector placement',()=>{
  const features=patternBlocks('mud');
  const mirrored=(a,b)=>{
    assert.equal(a.length,b.length);
    a.forEach(([x,y],i)=>{
      assert.ok(Math.abs(x+b[i][0])<1e-12);
      assert.ok(Math.abs(y+b[i][1]-2*MUD_MIRROR_AXIS)<1e-12);
    });
  };
  for(const source of features.filter(b=>b.instance==='source')){
    const mate=features.find(b=>b.instance==='opposed'&&b.family===source.family);
    assert.ok(mate);mirrored(source.points,mate.points);
    assert.equal(source.sipes.length,mate.sipes.length);
    source.sipes.forEach((s,i)=>mirrored(s,mate.sipes[i]));
    assert.equal(source.heightRatio,mate.heightRatio);
  }
});

test('Revision 5: mud uses convex flat-ended bars, steep shoulder hooks and four low ejectors',()=>{
  const features=patternBlocks('mud');
  const preset=PATTERNS.find(p=>p.id==='mud');
  assert.equal(preset.repeats,32);
  const centers=features.filter(b=>b.family==='center');
  assert.equal(centers.length,2);
  for(const b of centers){
    assert.equal(b.points.length,5,'Center should be a broad pentagonal block, not a serrated spear');
    const ys=b.points.map(p=>p[1]);
    assert.ok(Math.max(...ys)-Math.min(...ys)<1,'Do not stretch the block back into the old long spear');
    // Both end caps must be broad in physical millimeters.
    const pitch=2*Math.PI*340/preset.repeats;
    const length=(a,z)=>Math.hypot((z[0]-a[0])*preset.width,(z[1]-a[1])*pitch);
    assert.ok(length(b.points[0],b.points[1])>30);
    assert.ok(length(b.points[2],b.points[3])>30);
    const turns=b.points.map((a,i)=>{const z=b.points[(i+1)%5],c=b.points[(i+2)%5];return Math.sign((z[0]-a[0])*(c[1]-z[1])-(z[1]-a[1])*(c[0]-z[0]));});
    assert.ok(turns.every(t=>t===turns[0]),'No invented side-entry shark-fin notch');
  }
  const shoulders=features.filter(b=>b.role==='shoulder');
  assert.ok(shoulders.every(b=>b.points.length>=20));
  assert.ok(shoulders.every(b=>Math.max(...b.points.map(p=>p[1]))-Math.min(...b.points.map(p=>p[1]))>1.3));
  assert.equal(features.filter(b=>b.role==='ejector'&&b.heightRatio===.24).length,4);
  const svg=patternSVG('mud',6,{annotate:true});
  for(const family of ['shoulder','center','outer-ejector','inner-ejector'])assert.ok(svg.includes(`data-family="${family}"`));
});

test('Mud flat backing supports all six staggered repeats, including the end lugs',()=>{
  const p=PATTERNS.find(p=>p.id==='mud');
  for(const gap of [.65,1,1.6]){
    const settings={...preset(p),view:'flat',gap};
    const {geometry}=buildTreads(settings);
    const backing=buildCasing(settings);backing.computeBoundingBox();
    assert.ok(backing.boundingBox.min.z<geometry.boundingBox.min.z);
    assert.ok(backing.boundingBox.max.z>geometry.boundingBox.max.z);
    geometry.dispose();backing.dispose();
  }
});

test('Revision 6 preserves the corrected revision-5 mud outlines and sipes',async()=>{
  const {createHash}=await import('node:crypto');
  const actual=createHash('sha256').update(JSON.stringify([patternBlocks('mud',0),patternBlocks('mud',1)])).digest('hex');
  assert.equal(actual,'11cd847073ee92a1889ba969a560a531152f2622f007c678f20aa2f7f7cd2b36');
});

test('Revision 6: four distinct new studies have explicit provenance and two-pitch periodicity',async()=>{
  const fs=await import('node:fs/promises');
  assert.equal(PATTERNS.length,8);
  const studies=PATTERNS.filter(p=>p.reference);
  assert.equal(studies.length,4);
  assert.equal(new Set(studies.map(p=>JSON.stringify(patternBlocks(p.id)))).size,4);
  for(const p of studies){
    assert.match(p.reference.url,/^https:\/\//);
    assert.match(p.reference.photoSource,/^https:\/\//);
    assert.ok(p.reference.note.length>40);
    assert.ok((await fs.stat(new URL(`../public${p.reference.image}`,import.meta.url))).size>1000);
    assert.deepEqual(patternBlocks(p.id,0),patternBlocks(p.id,2));
    assert.deepEqual(patternBlocks(p.id,1),patternBlocks(p.id,3));
  }
});

for(const p of PATTERNS.filter(p=>p.reference))test(`${p.name}: flat backing supports the full stagger at every groove-spacing extreme`,()=>{
  for(const gap of [.65,1,1.6]){
    const settings={...preset(p),view:'flat',gap};
    const {geometry}=buildTreads(settings);
    const backing=buildCasing(settings);backing.computeBoundingBox();
    assert.ok(backing.boundingBox.min.z<geometry.boundingBox.min.z);
    assert.ok(backing.boundingBox.max.z>geometry.boundingBox.max.z);
    geometry.dispose();backing.dispose();
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { PATTERNS, patternBlocks } from '../src/patterns.js';
import { DEFAULTS, buildTreads, buildCasing } from '../src/geometry.js';
import { designFromPreset, designBlocks, expandShape, newShape, validateDesign, validPolygon, blankDesign, designSVG } from '../src/design.js';

const polygonKey=points=>points.map(p=>p.map(v=>v.toFixed(6)).join(',')).sort().join(';');
const key=b=>JSON.stringify([polygonKey(b.points),b.sipes.map(polygonKey).sort(),b.role,b.heightRatio,!!b.continuous]);
for(const p of PATTERNS)test(`${p.name}: editable preset preserves every source contour, sipe, phase and height`,()=>{
  const design=designFromPreset(p.id);validateDesign(design,{geometry:true});
  for(const parity of [0,1])assert.deepEqual(designBlocks(design,parity).map(key).sort(),patternBlocks(p.id,parity).map(key).sort());
});

test('Width, travel, point and four-way mirrors transform both polygons and sipes around custom axes',()=>{
  const shape=newShape();shape.sipes=[[[-.2,.3],[-.1,.4]]];shape.mirror={mode:'both',axisX:.05,axisY:.7,stagger:.2};
  const copies=expandShape(shape);assert.equal(copies.length,4);
  const point=shape.sipes[0][0],transforms={source:point,width:[.1-point[0],point[1]+.2],travel:[point[0],1.4-point[1]+.2],point:[.1-point[0],1.4-point[1]+.2]};
  for(const copy of copies)assert.deepEqual(copy.sipes[0][0],transforms[copy.instance]);
  for(const mode of ['width','travel','point']){shape.mirror.mode=mode;assert.equal(expandShape(shape).length,2);}
  shape.mirror.mode='none';assert.equal(expandShape(shape).length,1);
});

test('Self-symmetric mirrors are not duplicated, phase membership and hidden shapes affect the array',()=>{
  const design=blankDesign(),s=newShape();s.points=[[-.1,0],[.1,0],[.1,1],[-.1,1]];s.mirror={mode:'both',axisX:0,axisY:.5,stagger:0};design.shapes=[s];
  assert.equal(expandShape(s).length,1);
  s.phase='1';assert.equal(designBlocks(design,0).length,0);assert.equal(designBlocks(design,1).length,1);
  s.enabled=false;assert.equal(designBlocks(design,1).length,0);
});

test('Custom designs build real arrays, empty phases, sipe floors and a supported backing',()=>{
  const design=blankDesign(),s=newShape();s.phase='1';s.sipes=[[[-.23,.4],[-.1,.4]]];s.mirror.mode='width';design.shapes=[s];
  for(const view of ['flat','tire']){
    const settings={...DEFAULTS,view,design};const built=buildTreads(settings);
    assert.equal(built.blocks,view==='flat'?6:32);
    assert.ok(built.geometry.attributes.position.count>0);
    assert.equal(built.geometry.attributes.uv,undefined);
    for(const x of built.geometry.attributes.position.array)assert.ok(Number.isFinite(x));
    if(view==='flat'){
      let floors=0;const positions=built.geometry.attributes.position;for(let i=0;i<positions.count;i++)if(Math.abs(positions.getY(i)-DEFAULTS.depth*.7)<.001)floors++;
      assert.ok(floors>0);const backing=buildCasing(settings);backing.computeBoundingBox();assert.ok(backing.boundingBox.min.z<built.geometry.boundingBox.min.z);backing.dispose();
    }
    built.geometry.dispose();
  }
  design.shapes=[];const empty=buildTreads({...DEFAULTS,design});assert.equal(empty.blocks,0);assert.equal(empty.geometry.attributes.position.count,0);empty.geometry.dispose();
});

test('Malformed projects and invalid polygons fail clearly, while editable invalid drafts can be retained',()=>{
  const design=blankDesign();design.shapes=[newShape()];validateDesign(design);
  assert.throws(()=>validateDesign({...design,version:999}));
  assert.throws(()=>validateDesign({...design,shapes:[design.shapes[0],design.shapes[0]]}));
  const bad=structuredClone(design);bad.shapes[0].points[0][0]=Infinity;assert.throws(()=>validateDesign(bad));
  assert.equal(validPolygon([[0,0],[1,1],[0,1],[1,0]]),false);
  assert.equal(validPolygon([[0,0],[1,0],[1,0],[0,1]]),false);
  assert.equal(validPolygon([[0,0],[1,0],[.5,.3],[1,1],[0,1]]),true);
  design.shapes[0].points=[[0,0],[1,1],[0,1],[1,0]];validateDesign(design);
  assert.throws(()=>buildTreads({...DEFAULTS,design}),/outline crosses/);
});

test('SVG export escapes names and exports actual source/copy paths, not an image',()=>{
  const design=designFromPreset('rugged');design.name='<script>alert(1)</script>';
  const svg=designSVG(design,DEFAULTS);assert.ok(svg.includes('&lt;script&gt;'));assert.ok(!svg.includes('<script>'));assert.ok(!svg.includes('<image'));assert.ok(svg.includes('<path'));
});

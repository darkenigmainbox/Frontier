import test from 'node:test';
import assert from 'node:assert/strict';
import { restoreSettings } from '../src/settings.js';
import { DEFAULTS } from '../src/geometry.js';

const legacy = {...DEFAULTS,pattern:'mud',width:305,depth:20,repeats:28,view:'flat'};
test('Untouched old mud preset adopts the revised pitch while retaining view and visibility',()=>{
  assert.equal(restoreSettings(legacy).repeats,32);
  assert.equal(restoreSettings({...legacy,patternRevision:4}).repeats,32);
  const saved=restoreSettings({...legacy,casing:false,sipes:false});
  assert.equal(saved.view,'flat');assert.equal(saved.casing,false);assert.equal(saved.sipes,false);
});
test('Custom dimensions and explicit revision-5 repeat adjustments are preserved',()=>{
  for(const patch of [{width:320},{radius:360},{depth:18},{gap:1.15}])assert.equal(restoreSettings({...legacy,...patch}).repeats,28);
  assert.equal(restoreSettings({...legacy,patternRevision:5}).repeats,28);
  assert.deepEqual(restoreSettings(DEFAULTS),DEFAULTS);
});
test('Missing saved settings fall back, invalid values and unknown patterns are rejected',()=>{
  assert.deepEqual(restoreSettings(null),DEFAULTS);
  assert.throws(()=>restoreSettings({...legacy,repeats:33}));
  assert.throws(()=>restoreSettings({...legacy,pattern:'unknown'}));
  assert.ok(!('patternRevision' in restoreSettings({...legacy,patternRevision:4})));
});

test('New off-road presets and custom parameters survive restoration',async()=>{
  const {PATTERNS}=await import('../src/patterns.js');
  for(const p of PATTERNS.filter(p=>p.reference)){
    const saved={...DEFAULTS,pattern:p.id,width:p.width,depth:p.depth,repeats:p.repeats,view:'flat',radius:375,gap:1.15};
    assert.deepEqual(restoreSettings({...saved,patternRevision:6}),saved);
  }
});

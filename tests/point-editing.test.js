import test from 'node:test';
import assert from 'node:assert/strict';
import { nearestEdge, constrainPoint, midpointInsertion } from '../src/point-editing.js';

const shape={points:[[0,0],[1,0],[1,1],[0,1]],sipes:[[[.2,.2],[.6,.2],[.6,.8]]]};
const units={w:200,p:50};
test('Edge insertion includes the polygon closing edge and projects onto it',()=>{
  const found=nearestEdge(shape,[-.01,.5],units,3);
  assert.equal(found.sipe,null);assert.equal(found.index,4);assert.deepEqual(found.point,[0,.5]);
  assert.equal(nearestEdge(shape,[-.1,.5],units,3),null);
});
test('Cut line insertion finds the correct open segment, without a phantom closing edge',()=>{
  const found=nearestEdge(shape,[.4,.2],units,.1);
  assert.equal(found.sipe,0);assert.equal(found.index,1);assert.deepEqual(found.point,[.4,.2]);
  assert.equal(nearestEdge(shape,[.4,.5],units,.1),null);
  assert.equal(nearestEdge(shape,[.2,.2],units,.001),null,'Do not duplicate a cut endpoint');
});
test('Midpoint toolbar insertion does not close a sipe at its last endpoint',()=>{
  const line=[[0,0],[1,0],[1,1]];
  assert.deepEqual(midpointInsertion(line,2,false),{index:2,point:[1,.5]});
  assert.deepEqual(midpointInsertion(line,2,true),{index:3,point:[.5,.5]});
});
test('Shift constraints compare physical displacement, preserve exact fixed coordinates, and do not mutate points',()=>{
  const point=[.1,.2],start=[0,0];
  assert.deepEqual(constrainPoint(point,start,units),[.1,0]);
  assert.deepEqual(constrainPoint([.01,.2],start,units),[0,.2]);
  assert.deepEqual(point,[.1,.2]);assert.deepEqual(start,[0,0]);
  assert.deepEqual(constrainPoint([.5,.31],[.123456789,.3],units),[.5,.3]);
});

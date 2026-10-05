import * as THREE from 'three';
export const settings = {
 running:true, gi:true, emission:2.8, bounce:1, speed:1, resolution:.75, view:0,
 probes:true, probeLevel:1, probeMode:0, wireframe:false, scene:'chamber', time:0,
 cameraYaw:0, cameraPitch:0, distance:14.8, stressCount:256,
 shadowSamples:4, emitterSize:1, bvh:true, reflections:true, waveAmplitude:1, probeVisibility:false, probeDensity:1, probeAngular:0, largeCount:500, orbPower:1, orbSamples:16, orbOnly:false, temporal:true, spatialFilter:true, probeBudget:4,
};
export const objects=[];
export const lights=[];
export let sceneVersion=0;
export const sceneInfo={
 chamber:['The light chamber','Warm and cool panels, a moving emissive orb, and deforming triangles.'],
 deform:['Deforming mesh','A connected 3,072-triangle sheet: vertices bend every frame while its object transform stays fixed. No SDF.'],
 windows:['Window / penumbra lab','Real window openings and mullions. An exterior area emitter casts soft shadows through the room.'],
 primitives:['Triangle playground','Spheres, capsules, boxes and the emissive ball are tessellated meshes. Every ray intersects their triangles.'],
 large:['Grand hall · 10K','A 24 × 22 × 10 m room with 10,008 triangles at 500 crates, 15 pillars and a connected deforming sheet.'],
 stress:['Geometry stress test','A seeded field of animated triangle meshes. Change object count and compare BVH vs brute force.'],
 swarm:['Triangle swarm','64 orbiting, deforming triangles around an emissive orb.'],
 cornell:['Stack study','Tall blocks, reflective surfaces, and contrasting emissive materials.'],
};
const material=(color,emission=0,metal=0)=>({color,emission,baseEmission:emission,metal});
const concrete=material([.46,.48,.46]);
const graphite=material([.16,.19,.19],0,.1);
const p=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3();
function add(kind,geometry,mat,pos,scale=[1,1,1],motion=null){
 const o={kind,geometry,mat,pos,scale,motion,matrix:new THREE.Matrix4(),rotation:new THREE.Euler()};objects.push(o);return o;
}
function box(kind,size,pos,mat=concrete,motion=null){return add(kind,new THREE.BoxGeometry(...size),mat,pos,[1,1,1],motion);}
function plane(kind,size,pos,mat,angle=0){const o=add(kind,new THREE.PlaneGeometry(...size),mat,pos);o.rotation.y=angle;return o;}
function sphere(kind,r,pos,mat,motion){return add(kind,new THREE.SphereGeometry(r,24,16),mat,pos,[1,1,1],motion);}
function meshBox(size,pos,mat){return box('mesh-box',size,pos,mat);}
function capsule(radius,halfSegment,pos,mat){return add('capsule',new THREE.CapsuleGeometry(radius,halfSegment*2,6,16),mat,pos);}
function panel(kind,width,height,pos,color,emission,angle=0){
 const o=plane(kind,[width,height],pos,material(color,emission),angle);o.areaEmitter=true;
 lights.push({object:o});return o;
}
export function makeScene(){
 const disposed=new Set();for(const o of objects)if(!disposed.has(o.geometry)){disposed.add(o.geometry);o.geometry.dispose();}
 objects.length=0;lights.length=0;sceneVersion++;
 const large=settings.scene==='large',width=large?24:12,depth=large?22:11,height=large?10:7;
 const floor=plane('floor',[width,depth],[0,0,0],material([.32,.34,.32]));floor.rotation.x=-Math.PI/2;
 plane('left',[depth,height],[-width/2,height/2,0],material([.27,.28,.26]),Math.PI/2);
 plane('right',[depth,height],[width/2,height/2,0],material([.24,.29,.29]),-Math.PI/2);
 if(settings.scene==='windows'){
  // The back wall is genuinely open, not a bright decal on an opaque plane.
  box('sill',[12,1.8,.25],[0,.9,-5.5]);box('lintel',[12,1.8,.25],[0,6.1,-5.5]);
  box('jamb',[1.5,3.4,.25],[-5.25,3.5,-5.5]);box('jamb',[1.5,3.4,.25],[5.25,3.5,-5.5]);
  for(const x of [-1.5,1.5])box('mullion',[.16,3.4,.4],[x,3.5,-5.4],graphite);
  box('crossbar',[9,.13,.4],[0,3.55,-5.4],graphite);
  const ceiling=plane('ceiling',[12,11],[0,7,0],concrete);ceiling.rotation.x=Math.PI/2;
  panel('daylight',7,4,[-2,7,-10],[1,.82,.53],9);
  plane('sky-backdrop',[25,16],[0,5,-12],material([.24,.45,.72],.65));
  box('occluder',[.7,2.1,.7],[-2.3,1.05,-1.8],material([.72,.65,.48]));
  box('occluder',[1.1,1.1,1.1],[.2,.55,-.2],material([.45,.56,.55]));
  sphere('sphere',.85,[2,1,-1.7],material([.65,.71,.72],0,.8),'sphere');
  capsule(.32,.7,[-.3,1.02,-3.3],material([.68,.4,.23],0,.1));
 }else{
  plane('back',[width,height],[0,height/2,-depth/2],concrete);
  box('warm-frame',[.14,3.9,2.4],[-width/2+.12,large?4:2.7,-1.2],graphite);
  panel('warm-light',1.9,3.4,[-width/2+.21,large?4:2.7,-1.2],[1,.29,.045],4,Math.PI/2);
  box('cool-frame',[2.5,3.7,.15],[large?7:3.1,large?4:2.7,-depth/2+.11],graphite);
  panel('cool-light',2.1,3.3,[large?7:3.1,large?4:2.7,-depth/2+.21],[.06,.68,.78],3);
 }
 if(large){
  const cubeGeometry=new THREE.BoxGeometry(1,1,1);let seed=723;
  const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const rows=Math.max(1,Math.ceil(settings.largeCount/20));
  for(let i=0;i<settings.largeCount;i++){
   const h=.35+rand()*1.5;
   add('hall-crate',cubeGeometry,material([.3+rand()*.35,.34+rand()*.3,.29+rand()*.3]),[-10+(i%20+.5),h/2+.1,-9+(Math.floor(i/20)+.5)*17/rows],[.45+rand()*.3,h,.45+rand()*.3],`stress${i}`);
  }
  for(let i=0;i<15;i++)box('hall-column',[.32,5.5,.32],[-10+(i%5)*5,2.75,-8+Math.floor(i/5)*6],graphite);
  const sheet=add('wavy-sheet',new THREE.PlaneGeometry(9,4.2,48,32),material([.44,.62,.59]),[0,5.1,-2],[1,1,1],'wave');sheet.restPositions=sheet.geometry.attributes.position.array.slice();
 }else if(settings.scene==='stress'){
  const geo=new THREE.BoxGeometry(1,1,1);let seed=237;
  const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<settings.stressCount;i++){
   const size=.18+rand()*.38;
   add('stress-cube',geo,material([.25+rand()*.55,.3+rand()*.45,.25+rand()*.55],0,i%7===0?.6:0),[-5+rand()*10,.4+rand()*5.4,-4.5+rand()*8.5],[size,size,size],`stress${i}`);
  }
 }else if(settings.scene==='deform'){
  const mesh=add('wavy-sheet',new THREE.PlaneGeometry(6,4.2,48,32),material([.48,.65,.57],0,.08),[0,2.8,-1],[1,1,1],'wave');
  // Store rest-space coordinates. Only vertices deform; topology and transform stay fixed.
  mesh.restPositions=mesh.geometry.attributes.position.array.slice();
  box('cloth-rail',[6.5,.12,.15],[0,4.94,-1],graphite);
  box('cloth-post',[.13,5,.13],[-3.25,2.5,-1],graphite);
  box('cloth-post',[.13,5,.13],[3.25,2.5,-1],graphite);
  sphere('sphere',.64,[3.7,.66,1.3],material([.63,.71,.68],0,.85));
 }else if(settings.scene==='primitives'){
  sphere('sphere',.85,[-2.4,.9,.2],material([.7,.74,.72],0,.95),'sphere');
  sphere('matte-sphere',.7,[0,.7,-2.2],material([.68,.28,.12]));
  capsule(.45,.95,[2.6,1.4,-1.4],material([.22,.58,.51],0,.65));
  capsule(.28,.55,[-3.7,.83,-3.2],material([.45,.24,.7]));
  meshBox([1.3,1.8,1.3],[.1,.9,.5],material([.65,.68,.54],0,.3));
  meshBox([.8,.8,.8],[2.7,.4,1.6],material([.38,.55,.74]));
 }else if(settings.scene!=='windows'){
  box('platform',[4.8,.28,3.5],[0,.14,-.4],graphite);
  box('plinth',[2,1.25,2],[-1.15,.9,-.8],material([.55,.56,.50]));
  box('cube',[1.35,1.35,1.35],[-1.15,2.32,-.8],material([.61,.64,.56],0,.22),'cube');
  sphere('sphere',.91,[1.5,1.23,.25],material([.63,.71,.68],0,.82),'sphere');
  capsule(.3,.6,[3.8,.9,-3.8],graphite);
  meshBox([.6,1.8,.6],[-4.4,.9,-3.6],graphite);
  for(let i=0;i<(settings.scene==='swarm'?64:5);i++){
   const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute([-.55,-.35,0,.6,-.25,.08,0,.72,0],3));geo.computeVertexNormals();
   add('shard',geo,material(i%2?[.63,.79,.73]:[.8,.51,.25],0,.45),[.3,3.2+i*.25,-1],[1,1,1],`shard${i}`);
  }
 }
 const orb=sphere('emissive-orb',.38,[0,1.2,1],material([1,.15,.035],12),'orb');
 orb.directEmitter=true;
 lights.push({object:orb});
 updateScene(settings.time);return objects;
}
export let updateMs=0;let updateKey;
export function invalidateSceneUpdate(){updateKey=undefined;}
export function updateScene(time){
 const begin=performance.now(),key=`${sceneVersion}:${time}:${settings.waveAmplitude}:${settings.emitterSize}:${settings.orbPower}:${settings.orbOnly}`;if(key===updateKey){updateMs=0;return;}updateKey=key;
 lightCache=null;
 for(const o of objects){
  if(o.initialized&&!o.motion&&!o.areaEmitter&&!o.mat.baseEmission)continue;
  p.fromArray(o.pos);s.fromArray(o.scale);
  if(o.mat.baseEmission>0)o.mat.emission=o.kind==='emissive-orb'?o.mat.baseEmission*settings.orbPower:settings.orbOnly?0:o.mat.baseEmission;
  if(o.motion==='wave'){
   const vertices=o.geometry.attributes.position,rest=o.restPositions;
   for(let i=0;i<vertices.count;i++){
    const x=rest[i*3],y=rest[i*3+1],free=(rest[1]-y)/4.2;
    const z=settings.waveAmplitude*free*(.62*Math.sin(x*1.7-time*2.1)+.24*Math.sin(y*2.3+time*1.4));
    vertices.setXYZ(i,x,y,z);
   }
   vertices.needsUpdate=true;o.geometry.computeVertexNormals();
  }
  if(o.motion==='cube'){o.rotation.set(.13+Math.sin(time*.55)*.12,time*.27,.08);p.y+=Math.sin(time*.8)*.15;}
  if(o.motion==='sphere'){p.x+=Math.sin(time*.6)*.5;p.z+=Math.cos(time*.6)*.35;}
  if(o.motion==='orb'){const large=settings.scene==='large';p.set(Math.sin(time*.65)*(large?7:2.8),(large?3:1.15)+Math.sin(time*.9)*.35,(large?4:1.6)+Math.cos(time*.65)*(large?2:.8));}
  if(o.motion?.startsWith('stress')){const i=Number(o.motion.slice(6));o.rotation.set(time*.16+i,time*.21+i*.17,0);p.y+=Math.sin(time*.6+i)*.1;}
  if(o.motion?.startsWith('shard')){const i=Number(o.motion.slice(5)),a=time*.35+i*1.256;
   const radius=settings.scene==='swarm'?1.3+(i%5)*.6:1.9;
   p.set(Math.cos(a)*radius,3.5+Math.sin(time*.8+i)*.5,Math.sin(a)*radius*.65-1);o.rotation.set(time*.2+i,a,-.3+i*.5);
   const v=o.geometry.attributes.position;v.setZ(1,.08+Math.sin(time+i)*.18);v.setY(2,.72+Math.cos(time*.9+i)*.14);v.needsUpdate=true;o.geometry.computeVertexNormals();if(settings.scene==='swarm')s.setScalar(.55);
  }
  if(settings.scene==='cornell'&&o.kind==='cube'){s.set(1,1.7,1);p.y+=.6;}
  if(o.areaEmitter){s.x*=settings.emitterSize;s.y*=settings.emitterSize;}
  q.setFromEuler(o.rotation);o.matrix.compose(p,q,s);o.initialized=true;
 }
 updateMs=performance.now()-begin;
}
const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
export function triangleData(){
 const data=[];
 for(const o of objects){const positions=o.geometry.attributes.position,index=o.geometry.index,n=index?index.count:positions.count;
  for(let i=0;i<n;i+=3){a.fromBufferAttribute(positions,index?index.getX(i):i).applyMatrix4(o.matrix);b.fromBufferAttribute(positions,index?index.getX(i+1):i+1).applyMatrix4(o.matrix);c.fromBufferAttribute(positions,index?index.getX(i+2):i+2).applyMatrix4(o.matrix);
   data.push(a.x,a.y,a.z,0,b.x,b.y,b.z,0,c.x,c.y,c.z,0,...o.mat.color,o.mat.emission,o.mat.metal,o.kind==='floor'?1:0,(o.areaEmitter||o.directEmitter)?1:0,0);
  }
 }
 return new Float32Array(data);
}
// Direct lighting samples the ACTUAL emitter triangles, not a sphere/disk or
// rectangle proxy. The same world-space vertices also enter the scene BVH.
let lightCache=null;
const ab=new THREE.Vector3(),ac=new THREE.Vector3();
// Six direction-biased area distributions, with a nonzero uniform floor.
// The PDF is corrected at shading time; all samples remain actual mesh points.
// This is directional importance sampling, not an analytic sphere light.
// Morton ordering of the unfolded mesh normals keeps nearby faces together.
// Stratified CDF samples then cover distinct regions instead of correlated
// latitude strips or randomly scattered patches. This only orders triangles.
function normalMorton(n){
 const scale=1/(Math.abs(n.x)+Math.abs(n.y)+Math.abs(n.z));let x=n.x*scale,y=n.y*scale;
 if(n.z<0){const ox=x;x=(1-Math.abs(y))*(ox<0?-1:1);y=(1-Math.abs(ox))*(y<0?-1:1);}
 const ix=Math.min(1023,Math.floor((x*.5+.5)*1024)),iy=Math.min(1023,Math.floor((y*.5+.5)*1024));let key=0;
 for(let b=0;b<10;b++)key|=((ix>>b)&1)<<(b*2)|((iy>>b)&1)<<(b*2+1);return key;
}
function packEmitterMeshes(){
 if(lightCache)return lightCache;
 const data=[],samples=[];
 for(const light of lights){
  const o=light.object,positions=o.geometry.attributes.position,index=o.geometry.index;
  const list=[],boundsMin=[Infinity,Infinity,Infinity],boundsMax=[-Infinity,-Infinity,-Infinity];
  const n=index?index.count:positions.count;
  for(let i=0;i<n;i+=3){
   a.fromBufferAttribute(positions,index?index.getX(i):i).applyMatrix4(o.matrix);
   b.fromBufferAttribute(positions,index?index.getX(i+1):i+1).applyMatrix4(o.matrix);
   c.fromBufferAttribute(positions,index?index.getX(i+2):i+2).applyMatrix4(o.matrix);
   const normal=ab.subVectors(b,a).cross(ac.subVectors(c,a)),area=normal.length()*.5;if(area<1e-10)continue;normal.normalize();
   for(const v of [a,b,c])for(let k=0;k<3;k++){boundsMin[k]=Math.min(boundsMin[k],v.getComponent(k));boundsMax[k]=Math.max(boundsMax[k],v.getComponent(k));}
   list.push({vertices:[...a,...b,...c],normal:[...normal],area,hash:normalMorton(normal)});
  }
  // Preserve 2D normal-space locality, rather than procedural index strips.
  list.sort((a,b)=>a.hash-b.hash);
  const start=samples.length/20,totals=Array(6).fill(0);let totalArea=0;
  for(const t of list){totalArea+=t.area;const w=Array.from({length:6},(_,axis)=>{const cosine=t.normal[axis>>1]*(axis%2?-1:1);return t.area*(.02+(o.areaEmitter?Math.abs(cosine):Math.max(0,cosine)));});w.forEach((v,i)=>totals[i]+=v);t.cumulative=totals.slice();t.uniform=totalArea;}
  for(const t of list){const v=t.vertices;const cdf=t.cumulative.map((x,i)=>x/totals[i]);samples.push(...v.slice(0,3),t.uniform/totalArea,...v.slice(3,6),t.area,...v.slice(6,9),0,...cdf,0,0);}
  const center=boundsMin.map((x,i)=>(x+boundsMax[i])*.5);
  data.push(start,list.length,totalArea,o.areaEmitter?1:0,...o.mat.color,o.mat.emission,...center,.02,...totals,0,0);
 }
 lightCache={lights:new Float32Array(data),triangles:new Float32Array(samples)};return lightCache;
}
export function lightData(){return packEmitterMeshes().lights;}
export function emitterTriangleData(){return packEmitterMeshes().triangles;}
export function cameraState(aspect){
 const target=new THREE.Vector3(0,settings.scene==='large'?3:1.65,settings.scene==='large'?-1.6:-.8),yaw=settings.cameraYaw,pitch=.27+settings.cameraPitch;
 const eye=new THREE.Vector3(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)).multiplyScalar(settings.distance).add(target);
 const forward=target.clone().sub(eye).normalize(),right=forward.clone().cross(new THREE.Vector3(0,1,0)).normalize(),up=right.clone().cross(forward).normalize();return {eye,forward,right,up,target,aspect};
}
makeScene();

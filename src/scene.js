import * as THREE from 'three';
export const settings = {
 running:true, gi:true, emission:2.8, bounce:1, speed:1, resolution:.75, view:0,
 probes:true, probeLevel:1, probeMode:0, wireframe:false, scene:'chamber', time:0,
 cameraYaw:0, cameraPitch:0, distance:14.8, stressCount:256,
 shadowSamples:4, emitterSize:1, bvh:true, reflections:true, waveAmplitude:1,
};
export const objects=[];
export const lights=[];
export let sceneVersion=0;
export const sceneInfo={
 chamber:['The light chamber','Warm and cool panels, a moving emissive orb, and deforming triangles.'],
 deform:['Deforming mesh','A connected 3,072-triangle sheet: vertices bend every frame while its object transform stays fixed. No SDF.'],
 windows:['Window / penumbra lab','Real window openings and mullions. An exterior area emitter casts soft shadows through the room.'],
 primitives:['Analytic playground','Exact sphere, axis-aligned box, and capsule intersections. No triangle tessellation on WebGPU.'],
 stress:['Geometry stress test','A seeded field of animated triangle meshes. Change object count and compare BVH vs brute force.'],
 swarm:['Triangle swarm','64 orbiting, deforming triangles around an emissive orb.'],
 cornell:['Stack study','Tall blocks, reflective surfaces, and contrasting emissive materials.'],
};
const material=(color,emission=0,metal=0)=>({color,emission,metal});
const concrete=material([.46,.48,.46]);
const graphite=material([.16,.19,.19],0,.1);
const p=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3();
function add(kind,geometry,mat,pos,scale=[1,1,1],motion=null,analytic=null){
 const o={kind,geometry,mat,pos,scale,motion,analytic,matrix:new THREE.Matrix4(),rotation:new THREE.Euler()};objects.push(o);return o;
}
function box(kind,size,pos,mat=concrete,motion=null){return add(kind,new THREE.BoxGeometry(...size),mat,pos,[1,1,1],motion);}
function plane(kind,size,pos,mat,angle=0){const o=add(kind,new THREE.PlaneGeometry(...size),mat,pos);o.rotation.y=angle;return o;}
function sphere(kind,r,pos,mat,motion){return add(kind,new THREE.SphereGeometry(r,24,16),mat,pos,[1,1,1],motion,{type:0,size:[r,r,r]});}
function analyticBox(size,pos,mat){return add('analytic-box',new THREE.BoxGeometry(...size),mat,pos,[1,1,1],null,{type:1,size:size.map(v=>v/2)});}
function capsule(radius,halfSegment,pos,mat){return add('capsule',new THREE.CapsuleGeometry(radius,halfSegment*2,6,16),mat,pos,[1,1,1],null,{type:2,size:[radius,halfSegment,0]});}
function panel(kind,width,height,pos,color,emission,angle=0){
 const o=plane(kind,[width,height],pos,material(color,emission),angle);o.areaEmitter=true;
 lights.push({object:o,u:[Math.cos(angle)*width/2,0,-Math.sin(angle)*width/2],v:[0,height/2,0],radius:0});return o;
}
export function makeScene(){
 const disposed=new Set();for(const o of objects)if(!disposed.has(o.geometry)){disposed.add(o.geometry);o.geometry.dispose();}
 objects.length=0;lights.length=0;sceneVersion++;
 const floor=plane('floor',[12,11],[0,0,0],material([.32,.34,.32]));floor.rotation.x=-Math.PI/2;
 plane('left',[11,7],[-6,3.5,0],material([.27,.28,.26]),Math.PI/2);
 plane('right',[11,7],[6,3.5,0],material([.24,.29,.29]),-Math.PI/2);
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
  plane('back',[12,7],[0,3.5,-5.5],concrete);
  box('warm-frame',[.14,3.9,2.4],[-5.88,2.7,-1.2],graphite);
  panel('warm-light',1.9,3.4,[-5.79,2.7,-1.2],[1,.29,.045],4,Math.PI/2);
  box('cool-frame',[2.5,3.7,.15],[3.1,2.7,-5.39],graphite);
  panel('cool-light',2.1,3.3,[3.1,2.7,-5.29],[.06,.68,.78],3);
 }
 if(settings.scene==='stress'){
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
  analyticBox([1.3,1.8,1.3],[.1,.9,.5],material([.65,.68,.54],0,.3));
  analyticBox([.8,.8,.8],[2.7,.4,1.6],material([.38,.55,.74]));
 }else if(settings.scene!=='windows'){
  box('platform',[4.8,.28,3.5],[0,.14,-.4],graphite);
  box('plinth',[2,1.25,2],[-1.15,.9,-.8],material([.55,.56,.50]));
  box('cube',[1.35,1.35,1.35],[-1.15,2.32,-.8],material([.61,.64,.56],0,.22),'cube');
  sphere('sphere',.91,[1.5,1.23,.25],material([.63,.71,.68],0,.82),'sphere');
  capsule(.3,.6,[3.8,.9,-3.8],graphite);
  analyticBox([.6,1.8,.6],[-4.4,.9,-3.6],graphite);
  for(let i=0;i<(settings.scene==='swarm'?64:5);i++){
   const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute([-.55,-.35,0,.6,-.25,.08,0,.72,0],3));geo.computeVertexNormals();
   add('shard',geo,material(i%2?[.63,.79,.73]:[.8,.51,.25],0,.45),[.3,3.2+i*.25,-1],[1,1,1],`shard${i}`);
  }
 }
 const orb=sphere('emissive-orb',.38,[0,1.2,1],material([1,.15,.035],12),'orb');
 lights.push({object:orb,u:[.38,0,0],v:[0,.38,0],radius:.38});
 updateScene(settings.time);return objects;
}
export function updateScene(time){
 for(const o of objects){
  p.fromArray(o.pos);s.fromArray(o.scale);
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
  if(o.motion==='orb')p.set(Math.sin(time*.65)*2.8,1.15+Math.sin(time*.9)*.35,1.6+Math.cos(time*.65)*.8);
  if(o.motion?.startsWith('stress')){const i=Number(o.motion.slice(6));o.rotation.set(time*.16+i,time*.21+i*.17,0);p.y+=Math.sin(time*.6+i)*.1;}
  if(o.motion?.startsWith('shard')){const i=Number(o.motion.slice(5)),a=time*.35+i*1.256;
   const radius=settings.scene==='swarm'?1.3+(i%5)*.6:1.9;
   p.set(Math.cos(a)*radius,3.5+Math.sin(time*.8+i)*.5,Math.sin(a)*radius*.65-1);o.rotation.set(time*.2+i,a,-.3+i*.5);
   const v=o.geometry.attributes.position;v.setZ(1,.08+Math.sin(time+i)*.18);v.setY(2,.72+Math.cos(time*.9+i)*.14);v.needsUpdate=true;o.geometry.computeVertexNormals();if(settings.scene==='swarm')s.setScalar(.55);
  }
  if(settings.scene==='cornell'&&o.kind==='cube'){s.set(1,1.7,1);p.y+=.6;}
  if(o.areaEmitter){s.x*=settings.emitterSize;s.y*=settings.emitterSize;}
  q.setFromEuler(o.rotation);o.matrix.compose(p,q,s);
 }
}
const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
export function triangleData(){
 const data=[];
 for(const o of objects){if(o.analytic)continue;const positions=o.geometry.attributes.position,index=o.geometry.index,n=index?index.count:positions.count;
  for(let i=0;i<n;i+=3){a.fromBufferAttribute(positions,index?index.getX(i):i).applyMatrix4(o.matrix);b.fromBufferAttribute(positions,index?index.getX(i+1):i+1).applyMatrix4(o.matrix);c.fromBufferAttribute(positions,index?index.getX(i+2):i+2).applyMatrix4(o.matrix);
   data.push(a.x,a.y,a.z,0,b.x,b.y,b.z,0,c.x,c.y,c.z,0,...o.mat.color,o.mat.emission,o.mat.metal,o.kind==='floor'?1:0,0,0);
  }
 }
 return new Float32Array(data);
}
export function analyticData(){
 const data=[];for(const o of objects){if(!o.analytic)continue;const m=o.matrix.elements;
  data.push(m[12],m[13],m[14],o.analytic.type,...o.analytic.size,0,...o.mat.color,o.mat.emission,o.mat.metal,0,0,0);
 }return new Float32Array(data);
}
export function lightData(){
 const data=[];for(const l of lights){const o=l.object,m=o.matrix.elements,size=l.radius?1:settings.emitterSize;
  data.push(m[12],m[13],m[14],l.radius,...l.u.map(x=>x*size),0,...l.v.map(x=>x*size),0,...o.mat.color,o.mat.emission);
 }return new Float32Array(data);
}
export function cameraState(aspect){
 const target=new THREE.Vector3(0,1.65,-.8),yaw=settings.cameraYaw,pitch=.27+settings.cameraPitch;
 const eye=new THREE.Vector3(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)).multiplyScalar(settings.distance).add(target);
 const forward=target.clone().sub(eye).normalize(),right=forward.clone().cross(new THREE.Vector3(0,1,0)).normalize(),up=right.clone().cross(forward).normalize();return {eye,forward,right,up,target,aspect};
}
makeScene();

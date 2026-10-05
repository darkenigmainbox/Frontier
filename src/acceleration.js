import {Matrix4} from 'three';
import {TriangleBVH} from './bvh.js';
import {objects,sceneVersion,settings} from './scene.js';
// Shared local-space triangle BLASes + a world-space instance TLAS. Bounds only
// cull candidates: all surface intersections still use actual mesh triangles.
export class InstancedScene {
 constructor(){this.inverse=new Matrix4();this.version=-1;}
 pack(mesh){const pos=mesh.geometry.attributes.position,idx=mesh.geometry.index;const out=mesh.source;for(let t=0;t<mesh.count;t++)for(let v=0;v<3;v++){const i=idx?idx.getX(t*3+v):t*3+v,j=t*20+v*4;out[j]=pos.getX(i);out[j+1]=pos.getY(i);out[j+2]=pos.getZ(i);}mesh.positionVersion=pos.version;}
 build(){
  this.version=sceneVersion;this.nodes=null;this.meshes=[];const byGeometry=new Map();
  for(const object of objects){let mesh=byGeometry.get(object.geometry);if(!mesh){mesh={geometry:object.geometry,count:(object.geometry.index?.count??object.geometry.attributes.position.count)/3,objects:[],bvh:new TriangleBVH()};mesh.source=new Float32Array(mesh.count*20);this.pack(mesh);mesh.bvh.build(mesh.source);this.meshes.push(mesh);byGeometry.set(object.geometry,mesh);}mesh.objects.push(object);}
  this.instances=[];for(const mesh of this.meshes){mesh.instanceFirst=this.instances.length;for(const object of mesh.objects)this.instances.push({object,mesh,matrix:new Float64Array(16).fill(NaN),bounds:new Float32Array(6)});}
  this.tree=[];this.bounds=new Float32Array(this.instances.length*6);
  this.instances.forEach((instance,i)=>this.updateInstance(instance,i,true));
  const build=ids=>{const index=this.tree.length,node={left:-1,right:-1,instance:-1,end:0};this.tree.push(node);if(ids.length===1)node.instance=ids[0];else{let axis=0,extent=-1;for(let a=0;a<3;a++){let lo=Infinity,hi=-Infinity;for(const i of ids){const c=this.bounds[i*6+a]+this.bounds[i*6+3+a];lo=Math.min(lo,c);hi=Math.max(hi,c);}if(hi-lo>extent){axis=a;extent=hi-lo;}}ids.sort((a,b)=>this.bounds[a*6+axis]+this.bounds[a*6+axis+3]-this.bounds[b*6+axis]-this.bounds[b*6+axis+3]);const mid=ids.length>>1;node.left=build(ids.slice(0,mid));node.right=build(ids.slice(mid));}node.end=this.tree.length;return index;};
  build(this.instances.map((_,i)=>i));let nodeCount=this.tree.length,triCount=0;
  for(const mesh of this.meshes){mesh.nodeStart=nodeCount;mesh.triStart=triCount;nodeCount+=mesh.bvh.nodes.length;triCount+=mesh.count;}
  this.instanceBase=nodeCount*3;this.scheduleBase=this.instanceBase+this.instances.length*11;
  this.nodes=new Float32Array((this.scheduleBase+8192)*4);this.triangles=new Float32Array(triCount*20);
  this.triangleCount=this.instances.reduce((n,i)=>n+i.mesh.count,0);this.localTriangleCount=triCount;this.dirtyTriangles=[];this.dirtyNodes=[];
  for(const mesh of this.meshes)this.writeMesh(mesh);
  this.instances.forEach((instance,i)=>this.updateInstance(instance,i,true));this.refitTLAS();
 }
 updateInstance(instance,index,force=false){
  const {object,mesh}=instance,m=object.matrix.elements;let changed=force||mesh.changed;
  for(let i=0;i<16;i++)if(instance.matrix[i]!==m[i])changed=true;
  const base=(this.instanceBase+index*11)*4;
  if(this.nodes){this.nodes[base+39]=changed?1:0;this.nodes.set(object.mat.color,base+32);this.nodes[base+35]=object.mat.emission;this.nodes[base+36]=object.mat.metal;this.nodes[base+37]=object.kind==='floor'?1:0;this.nodes[base+38]=(object.areaEmitter||object.directEmitter)?1:0;}
  if(!changed)return false;
  instance.matrix.set(m);const b=mesh.bvh.data;
  for(let axis=0;axis<3;axis++){let center=m[12+axis],radius=0;for(let k=0;k<3;k++){center+=m[k*4+axis]*(b[k]+b[k+4])*.5;radius+=Math.abs(m[k*4+axis])*(b[k+4]-b[k])*.5;}this.bounds[index*6+axis]=center-radius;this.bounds[index*6+axis+3]=center+radius;}
  if(this.nodes){this.nodes.set(m,base);this.nodes.set(this.inverse.copy(object.matrix).invert().elements,base+16);this.nodes.set([mesh.nodeStart,mesh.triStart,mesh.count,index+1],base+40);}
  return true;
 }
 writeMesh(mesh){
  this.triangles.set(mesh.bvh.triangles,mesh.triStart*20);const start=mesh.nodeStart*12;this.nodes.set(mesh.bvh.data,start);
  for(let i=0;i<mesh.bvh.nodes.length;i++){this.nodes[start+i*12+3]+=mesh.nodeStart;this.nodes[start+i*12+7]+=mesh.triStart;}
  this.dirtyTriangles.push([mesh.triStart*20,mesh.count*20]);this.dirtyNodes.push([start,mesh.bvh.data.length]);
 }
 refitTLAS(){for(let i=this.tree.length-1;i>=0;i--){const n=this.tree[i],j=i*12,d=this.nodes;if(n.instance>=0){const b=n.instance*6;for(let a=0;a<3;a++){d[j+a]=this.bounds[b+a];d[j+4+a]=this.bounds[b+3+a];}d[j+7]=this.instanceBase+n.instance*11;d[j+8]=1;d[j+9]=1;}else{for(let a=0;a<3;a++){d[j+a]=Math.min(d[n.left*12+a],d[n.right*12+a]);d[j+4+a]=Math.max(d[n.left*12+4+a],d[n.right*12+4+a]);}d[j+8]=0;d[j+9]=0;}d[j+3]=n.end;}}
 update(){
  this.refitMs=0;const reenable=this.enabled===false&&settings.bvh;this.enabled=settings.bvh;
  this.dirtyBounds=[Infinity,Infinity,Infinity,-Infinity,-Infinity,-Infinity];
  if(this.version!==sceneVersion){const start=performance.now();this.build();this.refitMs=performance.now()-start;this.rebuilt=true;this.changed=true;return;}
  this.rebuilt=false;this.changed=false;this.dirtyTriangles.length=0;this.dirtyNodes.length=0;
  for(const mesh of this.meshes){mesh.changed=reenable||mesh.positionVersion!==mesh.geometry.attributes.position.version;if(mesh.changed){this.pack(mesh);if(settings.bvh){const start=performance.now();mesh.bvh.refit(mesh.source);this.refitMs+=performance.now()-start;}else{for(let i=0;i<mesh.bvh.order.length;i++)for(let k=0;k<20;k++)mesh.bvh.triangles[i*20+k]=mesh.source[mesh.bvh.order[i]*20+k];}this.writeMesh(mesh);}}
  this.instances.forEach((instance,i)=>{const old=instance.bounds;if(this.updateInstance(instance,i)){this.changed=true;for(let a=0;a<3;a++){this.dirtyBounds[a]=Math.min(this.dirtyBounds[a],old[a],this.bounds[i*6+a]);this.dirtyBounds[a+3]=Math.max(this.dirtyBounds[a+3],old[a+3],this.bounds[i*6+a+3]);}}old.set(this.bounds.subarray(i*6,i*6+6));});
  if(this.changed&&settings.bvh){const start=performance.now();this.refitTLAS();this.refitMs+=performance.now()-start;}
 }
}

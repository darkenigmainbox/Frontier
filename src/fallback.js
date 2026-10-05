import {getProbeConfig} from './probes.js';
import * as THREE from 'three';
import {settings,objects,lights,lightData,cameraState,sceneVersion} from './scene.js';
export class FallbackRenderer {
 async init(canvas){
  this.canvas=canvas;this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.05;
  this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#161e21');this.camera=new THREE.PerspectiveCamera(41.6,1,.1,100);
  this.fill=new THREE.HemisphereLight('#c9e2e1','#29271d',.4);this.scene.add(this.fill);
  const grid=new THREE.GridHelper(12,12,'#242a28','#252c2c');grid.position.y=.008;this.scene.add(grid);this.grid=grid;
  this.probes=[];this.syncProbes();
  this.name='WebGL2 preview';this.gpuMs=null;this.syncScene();return this;
 }
 syncProbes(){
  const config=getProbeConfig();if(this.probeKey===config.key)return;this.probeKey=config.key;
  for(const p of this.probes){this.scene.remove(p);p.geometry.dispose();p.material.dispose();p.dispose();}
  this.probes=config.dims.map((dims,level)=>{
   const [dx,dy,dz]=dims;const mesh=new THREE.InstancedMesh(new THREE.SphereGeometry(.045,6,4),new THREE.MeshBasicMaterial({color:['#c6f578','#50dbe0','#e28ff2'][level],transparent:true,opacity:.8,depthTest:false}),dx*dy*dz);let i=0;const matrix=new THREE.Matrix4();
   for(let z=0;z<dz;z++)for(let y=0;y<dy;y++)for(let x=0;x<dx;x++){matrix.makeTranslation(config.min[0]+(x+.5)*config.size[0]/dx,config.min[1]+(y+.5)*config.size[1]/dy,config.min[2]+(z+.5)*config.size[2]/dz);mesh.setMatrixAt(i++,matrix);}this.scene.add(mesh);return mesh;
  });
 }
 syncScene(){
  for(const mesh of this.meshes||[]){this.scene.remove(mesh);mesh.material.dispose();}
  for(const light of this.sceneLights||[]){this.scene.remove(light);light.dispose();}
  this.meshes=objects.map(o=>{const material=new THREE.MeshStandardMaterial({color:new THREE.Color(...o.mat.color),emissive:new THREE.Color(...o.mat.color),emissiveIntensity:o.mat.emission,metalness:o.mat.metal,roughness:o.mat.metal>.7?.2:.47,side:THREE.DoubleSide});const mesh=new THREE.Mesh(o.geometry,material);mesh.matrixAutoUpdate=false;mesh.castShadow=!o.mat.emission;mesh.receiveShadow=true;this.scene.add(mesh);return mesh;});
  this.sceneLights=lights.map(l=>{const light=new THREE.PointLight(new THREE.Color(...l.object.mat.color),10,40,2);light.castShadow=true;light.shadow.mapSize.set(512,512);light.shadow.camera.near=.1;light.shadow.camera.far=40;light.shadow.normalBias=.035;light.shadow.bias=-.0003;light.shadow.radius=3;this.scene.add(light);return light;});
  this.sceneVersion=sceneVersion;this.triangleCount=objects.reduce((n,o)=>n+(o.geometry.index?.count??o.geometry.attributes.position.count)/3,0);this.meshCount=objects.length;
 }
 render(){
  if(this.sceneVersion!==sceneVersion)this.syncScene();this.syncProbes();
  const w=this.canvas.clientWidth,h=this.canvas.clientHeight;
  if(this.width!==w||this.height!==h||this.scale!==settings.resolution){this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5)*settings.resolution);this.renderer.setSize(w,h,false);this.width=w;this.height=h;this.scale=settings.resolution;}
  const cam=cameraState(w/h);this.camera.aspect=w/h;this.camera.position.copy(cam.eye);this.camera.lookAt(cam.target);this.camera.updateProjectionMatrix();
  this.meshes.forEach((m,i)=>{m.matrix.copy(objects[i].matrix);m.material.wireframe=settings.wireframe;m.material.emissiveIntensity=objects[i].mat.emission*settings.emission*.65;m.material.metalness=settings.reflections?objects[i].mat.metal:0;});
  const emitterMetadata=lightData();
  this.sceneLights.forEach((light,i)=>{const l=lights[i],m=l.object.matrix.elements;light.position.set(m[12],m[13],m[14]);const area=emitterMetadata[i*20+2];light.intensity=settings.view===2?0:settings.emission*l.object.mat.emission*area*(l.object.areaEmitter?.5:.25);});
  this.fill.intensity=settings.gi?.18+settings.bounce*.18:.05;if(settings.view===1)this.fill.intensity=.05;if(settings.view===2)this.fill.intensity=.7*settings.bounce;
  this.probes.forEach((p,i)=>{p.visible=settings.probes&&settings.probeLevel===i;});
  this.scene.overrideMaterial=settings.view===3?(this.normalMat??=new THREE.MeshNormalMaterial({side:THREE.DoubleSide})):null;
  this.renderer.render(this.scene,this.camera);
 }
 async capture(){this.render();return new Promise(resolve=>this.canvas.toBlob(resolve,'image/png'));}
 destroy(){for(const m of this.meshes||[])m.material.dispose();for(const l of this.sceneLights||[])l.dispose();for(const p of this.probes||[]){p.geometry.dispose();p.material.dispose();p.dispose();}this.grid.geometry.dispose();this.grid.material.dispose();this.normalMat?.dispose();this.renderer.dispose();}
}

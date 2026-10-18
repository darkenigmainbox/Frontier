import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoadMeshBuilder } from './mesh/RoadMeshBuilder.js';
import { BuildingSystem } from './mesh/BuildingSystem.js';
import { VegetationSystem } from './mesh/VegetationSystem.js';
import { RailSystem } from './mesh/RailSystem.js';

export class RoadEditor3D{
  constructor(canvas, network){
    this.canvas=canvas; this.network=network;
    this.scene=new THREE.Scene();
    this.scene.background=new THREE.Color(0x87b7e6); // sky
    this.scene.fog=new THREE.Fog(0x9ac3ea, 650, 1450);

    this.renderer=new THREE.WebGLRenderer({canvas, antialias:true});
    this.renderer.shadowMap.enabled=true;
    this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure=1.08;
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;

    this.camera=new THREE.PerspectiveCamera(58,1,0.1,4000);
    this.camera.position.set(160, -420, 210);
    this.camera.up.set(0,0,1); // Z is up (matches terrain)

    this.controls=new OrbitControls(this.camera, canvas);
    this.controls.enableDamping=true;
    this.controls.dampingFactor=0.06;
    this.controls.target.set(0,20,0);
    this.controls.maxPolarAngle=Math.PI*0.48;
    this.controls.minDistance=18;
    this.controls.maxDistance=900;

    this.setupLights();
    this.roadBuilder=new RoadMeshBuilder(network, this.scene);
    this.buildings=new BuildingSystem(network, this.scene);
    this.vegetation=new VegetationSystem(network, this.scene);
    this.rails=new RailSystem(network, this.scene);

    this.raycaster=new THREE.Raycaster(); this.pointer=new THREE.Vector2();
    this.hoverObj=null;

    this.network.on('change', ()=> this.scheduleRebuild());
    this.network.on('select', ()=> this.highlightSelection());

    this.resize();
    window.addEventListener('resize', ()=>this.resize());
    this.canvas.addEventListener('pointermove', e=>this.onPointer(e));
    this.canvas.addEventListener('click', e=>this.onClick(e));
    this.canvas.addEventListener('dblclick', e=>this.onDblClick(e));

    this._pendingRebuild=false;
    this.rebuild();
    this.animate();
  }
  setupLights(){
    const hemi=new THREE.HemisphereLight(0xffffff, 0x334155, 1.0);
    hemi.position.set(0,0,200);
    this.scene.add(hemi);
    const sun=new THREE.DirectionalLight(0xfff6e8, 1.35);
    sun.position.set(300, 180, 320);
    sun.castShadow=true;
    sun.shadow.mapSize.set(2048,2048);
    const d=600;
    sun.shadow.camera.left=-d; sun.shadow.camera.right=d; sun.shadow.camera.top=d; sun.shadow.camera.bottom=-d;
    sun.shadow.camera.near=1; sun.shadow.camera.far=1200;
    sun.shadow.bias=-0.0006;
    this.scene.add(sun);
    this.sun=sun;
    // ambient fill
    const fill=new THREE.DirectionalLight(0xcfe4ff, 0.35);
    fill.position.set(-200,-300,120);
    this.scene.add(fill);
  }
  resize(){
    const rect=this.canvas.getBoundingClientRect();
    if(!rect.width) return;
    const dpr=Math.min(2, window.devicePixelRatio||1);
    this.renderer.setSize(rect.width, rect.height, false);
    this.renderer.setPixelRatio(dpr);
    this.camera.aspect=rect.width/rect.height;
    this.camera.updateProjectionMatrix();
  }
  scheduleRebuild(){
    if(this._pendingRebuild) return;
    this._pendingRebuild=true;
    requestAnimationFrame(()=>{ this._pendingRebuild=false; this.rebuild(); });
  }
  rebuild(){
    this.roadBuilder.rebuildAll();
    this.buildings.rebuild();
    this.vegetation.rebuild();
    this.rails.rebuild();
    this.highlightSelection();
  }
  highlightSelection(){
    // highlight selected roads via emissive pulse: implemented as overlay?
    // For now outline via extra line
  }
  onPointer(e){
    const rect=this.canvas.getBoundingClientRect();
    this.pointer.x=((e.clientX-rect.left)/rect.width)*2-1;
    this.pointer.y=-((e.clientY-rect.top)/rect.height)*2+1;
  }
  onClick(e){
    // pick road/rail/nodes
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits=this.raycaster.intersectObjects(this.scene.children, true);
    if(hits.length){
      // find userData
      let obj=hits[0].object;
      while(obj && !obj.userData.segmentId && obj.parent) obj=obj.parent;
      if(obj && obj.userData.segmentId){
        this.network.select('segment', obj.userData.segmentId);
      }
    }
  }
  onDblClick(e){
    // focus
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits=this.raycaster.intersectObject(this.roadBuilder.group, true);
    if(hits.length){
      const p=hits[0].point;
      this.controls.target.set(p.x,p.y,p.z);
      this.controls.update();
    }
  }
  setViewPreset(name){
    if(name==='city'){
      this.camera.position.set(40,-180,140); this.controls.target.set(20,40,0);
    } else if(name==='country'){
      this.camera.position.set(-260,120,160); this.controls.target.set(-320,160,12);
    } else if(name==='offroad'){
      this.camera.position.set(420,-40,80); this.controls.target.set(400,20,0);
    } else if(name==='overview'){
      this.camera.position.set(120,-520,380); this.controls.target.set(0,0,0);
    } else if(name==='river'){
      this.camera.position.set(0,-140,90); this.controls.target.set(0,-40,2);
    }
    this.controls.update();
  }
  animate(){
    requestAnimationFrame(()=>this.animate());
    this.controls.update();
    // subtle sun movement
    // this.sun.position.x = 300 + Math.sin(Date.now()*0.00005)*20;
    this.renderer.render(this.scene, this.camera);
  }
}

import * as THREE from 'three';
export class VegetationSystem{
  constructor(network, scene){
    this.network=network; this.scene=scene;
    this.group=new THREE.Group(); this.group.name='Vegetation'; scene.add(this.group);
  }
  rebuild(){
    this.group.clear();
    // instanced low-poly trees
    const treeCount= 420;
    const trunkGeo=new THREE.CylinderGeometry(0.22,0.32,2.2,6);
    const trunkMat=new THREE.MeshStandardMaterial({color:0x5a3f2a, roughness:0.95});
    const foliageGeo=new THREE.ConeGeometry(1.6,3.2,7);
    const foliageMat=new THREE.MeshStandardMaterial({color:0x3a5a2e, roughness:0.85});
    const foliageMat2=new THREE.MeshStandardMaterial({color:0x4a6a3a, roughness:0.85});
    const foliageMat3=new THREE.MeshStandardMaterial({color:0x6a7a3a, roughness:0.9}); // rural

    const positions=[];
    for(let i=0;i<treeCount;i++){
      let x,y;
      const r=Math.random();
      if(r<0.25){ // countryside forest NW
        x= -360 + (Math.random()-0.5)*220; y= 180 + (Math.random()-0.5)*260;
      } else if(r<0.5){ // roadside urban trees
        // pick random segment and offset
        const segs=[...this.network.segments.values()]; const s=segs[Math.floor(Math.random()*segs.length)];
        const pt=s.points[Math.floor(Math.random()*s.points.length)];
        const ang=Math.random()*Math.PI*2; const dist= s.width/2 + 3 + Math.random()*4;
        x=pt.x + Math.cos(ang)*dist; y=pt.y+Math.sin(ang)*dist;
      } else if(r<0.75){ // offroad forest east
        x= 400 + (Math.random()-0.5)*140; y= (Math.random()-0.5)*260;
      } else {
        x= (Math.random()-0.5)*900; y= (Math.random()-0.5)*900;
      }
      const onRoad=this.isOnRoad(x,y, 9);
      const inWater=this.network.sampleWater(x,y)!=null;
      if(onRoad||inWater) continue;
      const h=this.network.sampleTerrain(x,y);
      // skip city dense interior too many trees? allow some
      positions.push({x,y,z:h, scale: 0.85+Math.random()*0.55, mat: r<0.25? foliageMat3 : Math.random()>0.5? foliageMat: foliageMat2});
    }
    // Create merged instanced via individual meshes for simplicity (400 is ok)
    for(const p of positions){
      const g=new THREE.Group();
      const trunk=new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.set(p.x,p.y,p.z+1.1); trunk.castShadow=true;
      g.add(trunk);
      const foliage=new THREE.Mesh(foliageGeo, p.mat);
      foliage.position.set(p.x,p.y,p.z+3.0 * p.scale);
      foliage.scale.set(p.scale,p.scale,p.scale);
      foliage.castShadow=true;
      g.add(foliage);
      // second layer for variety
      if(Math.random()>0.6){
        const foliage2=new THREE.Mesh(foliageGeo, p.mat);
        foliage2.position.set(p.x,p.y,p.z+2.5*p.scale);
        foliage2.scale.set(p.scale*0.78,p.scale*0.78,p.scale*0.78);
        g.add(foliage2);
      }
      this.group.add(g);
    }
    // shrubs / grass patches as small planes
    for(let i=0;i<90;i++){
      const x=(Math.random()-0.5)*1000, y=(Math.random()-0.5)*1000;
      if(this.isOnRoad(x,y,5)) continue;
      if(this.network.sampleWater(x,y)!=null) continue;
      const z=this.network.sampleTerrain(x,y);
      const geo=new THREE.PlaneGeometry(1+Math.random()*1.2, 1+Math.random()*0.8);
      const mat=new THREE.MeshStandardMaterial({color:0x5a6e3a, roughness:1, side:THREE.DoubleSide, transparent:true, opacity:0.9});
      const m=new THREE.Mesh(geo, mat);
      m.position.set(x,y,z+0.06);
      m.rotation.z=Math.random()*Math.PI;
      this.group.add(m);
    }
  }
  isOnRoad(x,y,thresh){
    for(const seg of this.network.segments.values()){
      for(let i=0;i<seg.points.length-1;i++){
        const a=seg.points[i], b=seg.points[i+1];
        const d=pointToSeg({x,y},a,b);
        if(d<thresh) return true;
      }
    }
    return false;
  }
}
function pointToSeg(p,a,b){ const l2=(b.x-a.x)*(b.x-a.x)+(b.y-a.y)*(b.y-a.y); if(l2===0) return Math.hypot(p.x-a.x,p.y-a.y); let t=((p.x-a.x)*(b.x-a.x)+(p.y-a.y)*(b.y-a.y))/l2; t=Math.max(0,Math.min(1,t)); return Math.hypot(p.x-(a.x+t*(b.x-a.x)), p.y-(a.y+t*(b.y-a.y))); }

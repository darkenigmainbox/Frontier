import * as THREE from 'three';
export class RailSystem{
  constructor(network, scene){
    this.network=network; this.scene=scene;
    this.group=new THREE.Group(); this.group.name='Rails'; scene.add(this.group);
  }
  rebuild(){
    this.group.clear();
    for(const rail of this.network.rails.values()){
      const pts=rail.points.map(p=>{
        const z=this.network.sampleTerrain(p.x,p.y);
        const elev = rail.kind==='monorail'? z+8.5 : z+0.22;
        return new THREE.Vector3(p.x,p.y,elev);
      });
      const curve=new THREE.CatmullRomCurve3(pts);
      const divisions=Math.max(20, Math.floor(curve.getLength()/5));
      const spine=curve.getPoints(divisions);

      if(rail.kind==='monorail'){
        // elevated beam
        const beamMat=new THREE.MeshStandardMaterial({color:0x7a7f8a, roughness:0.5, metalness:0.15});
        const beamGeo=buildRailRibbon(spine, 1.2);
        const beam=new THREE.Mesh(beamGeo, beamMat);
        this.group.add(beam);
        // rails on top
        const railMat=new THREE.MeshStandardMaterial({color:0x3a3e44, roughness:0.45, metalness:0.6});
        for(const off of [-0.45,0.45]){
          const railPts=spine.map(p=>{
            const idx=spine.indexOf(p);
            const t= idx/Math.max(1,spine.length-1);
            const tang=curve.getTangentAt(t);
            const n=new THREE.Vector3(-tang.y,tang.x,0);
            return new THREE.Vector3(p.x+n.x*off, p.y+n.y*off, p.z+0.18);
          });
          const rc=new THREE.CatmullRomCurve3(railPts);
          const tube=new THREE.TubeGeometry(rc, divisions*2, 0.05, 8,false);
          const mesh=new THREE.Mesh(tube, railMat);
          this.group.add(mesh);
        }
        // pillars every ~30m
        const pillarMat=new THREE.MeshStandardMaterial({color:0x6e737b, roughness:0.8});
        for(let i=0;i<spine.length;i+=6){
          const p=spine[i];
          const ground=this.network.sampleTerrain(p.x,p.y);
          const h=p.z-ground;
          if(h<1) continue;
          const geo=new THREE.CylinderGeometry(0.6,0.7,h,8);
          const pillar=new THREE.Mesh(geo, pillarMat);
          pillar.position.set(p.x,p.y, ground+h/2);
          pillar.castShadow=true;
          this.group.add(pillar);
        }
        // stations
        for(let i=0;i<spine.length;i+=Math.floor(spine.length/3)){
          const p=spine[i];
          const platGeo=new THREE.BoxGeometry(10,4,0.4);
          const platMat=new THREE.MeshStandardMaterial({color:0xcbd2dd, roughness:0.6});
          const plat=new THREE.Mesh(platGeo, platMat);
          plat.position.set(p.x,p.y,p.z-0.35);
          this.group.add(plat);
        }
      } else {
        // ground train: ballast + sleepers + rails
        const ballastGeo=buildRailRibbon(spine, 3.0);
        const ballastMat=new THREE.MeshStandardMaterial({color:0x5a5b5e, roughness:0.95});
        const ballast=new THREE.Mesh(ballastGeo, ballastMat);
        ballast.position.z-=0.06;
        this.group.add(ballast);
        // sleepers
        const sleeperMat=new THREE.MeshStandardMaterial({color:0x4a3a2a, roughness:0.95});
        for(let i=0;i<spine.length;i+=2){
          const p=spine[i];
          const t= i/Math.max(1,spine.length-1);
          const tang=curve.getTangentAt(t);
          const ang=Math.atan2(tang.y,tang.x);
          const sleeperGeo=new THREE.BoxGeometry(2.6,0.22,0.14);
          const sleeper=new THREE.Mesh(sleeperGeo, sleeperMat);
          sleeper.position.set(p.x,p.y,p.z-0.02);
          sleeper.rotation.z=ang;
          this.group.add(sleeper);
        }
        // rails
        const railMat=new THREE.MeshStandardMaterial({color:0x2b2e33, roughness:0.35, metalness:0.7});
        for(const off of [-0.55,0.55]){
          const railPts=spine.map(p=>{
            const idx=spine.indexOf(p);
            const t= idx/Math.max(1,spine.length-1);
            const tang=curve.getTangentAt(t);
            const n=new THREE.Vector3(-tang.y,tang.x,0);
            return new THREE.Vector3(p.x+n.x*off, p.y+n.y*off, p.z+0.12);
          });
          const rc=new THREE.CatmullRomCurve3(railPts);
          const tube=new THREE.TubeGeometry(rc, divisions*2, 0.06, 6,false);
          const mesh=new THREE.Mesh(tube, railMat);
          this.group.add(mesh);
        }
        // trench walls in city center where road density high
        // (visual only, not physics)
      }
    }
  }
}

function buildRailRibbon(vectors, width){
  const verts=[], uvs=[], indices=[];
  // vectors: Vector3[]
  for(let i=0;i<vectors.length;i++){
    const p=vectors[i];
    const prev=vectors[i-1]||p, next=vectors[i+1]||p;
    const tx=((p.x-prev.x)+(next.x-p.x))*0.5, ty=((p.y-prev.y)+(next.y-p.y))*0.5;
    const len=Math.hypot(tx,ty)||1; const nx=-ty/len, ny=tx/len;
    verts.push(p.x+nx*width/2, p.y+ny*width/2, p.z);
    verts.push(p.x-nx*width/2, p.y-ny*width/2, p.z);
    uvs.push(i/(vectors.length-1),0); uvs.push(i/(vectors.length-1),1);
  }
  for(let i=0;i<vectors.length-1;i++){
    const a=i*2,b=i*2+1,c=(i+1)*2,d=(i+1)*2+1;
    indices.push(a,c,b, b,c,d);
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts,3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs,2));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

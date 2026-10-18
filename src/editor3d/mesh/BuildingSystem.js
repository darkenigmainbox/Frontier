import * as THREE from 'three';
export class BuildingSystem{
  constructor(network, scene){
    this.network=network; this.scene=scene;
    this.group=new THREE.Group(); this.group.name='Buildings'; scene.add(this.group);
  }
  rebuild(){
    this.group.clear();
    // Generate blocks along city grid by finding road-enclosed cells
    // For demo, place blocks procedurally based on distance to city center
    const blocks = this.generateBlocks();
    const matA=new THREE.MeshStandardMaterial({color:0x9aa2ad, roughness:0.75, metalness:0.05});
    const matB=new THREE.MeshStandardMaterial({color:0xb8bdc4, roughness:0.8});
    const matGlass=new THREE.MeshStandardMaterial({color:0x6a8ab8, roughness:0.15, metalness:0.5, transparent:true, opacity:0.78});
    const matBrick=new THREE.MeshStandardMaterial({color:0x7a5a4a, roughness:0.92});
    for(const b of blocks){
      const h=b.height;
      const geo=new THREE.BoxGeometry(b.w, b.d, h);
      const mats=[matA,matA,matA,matA,matGlass,matA]; // top glass
      let mesh;
      if(b.style==='modern'){
        mesh=new THREE.Mesh(geo, new THREE.MeshStandardMaterial({color: b.color, roughness:0.55, metalness:0.1}));
      } else if(b.style==='brick'){
        mesh=new THREE.Mesh(geo, matBrick);
      } else {
        mesh=new THREE.Mesh(geo, matA);
      }
      mesh.position.set(b.x,b.y, b.z + h/2);
      mesh.castShadow=true; mesh.receiveShadow=true;
      this.group.add(mesh);
      // rooftop details
      if(Math.random()>0.45){
        const topGeo=new THREE.BoxGeometry(b.w*0.5, b.d*0.5, 1.2);
        const top=new THREE.Mesh(topGeo, matB);
        top.position.set(b.x,b.y, b.z + h +0.6);
        this.group.add(top);
      }
      // windows emissive at night simulation via small planes
      if(h>20 && Math.random()>0.3){
        for(let f=0;f<4;f++){
          const winGeo=new THREE.PlaneGeometry(b.w*0.6, h*0.5);
          const win=new THREE.Mesh(winGeo, matGlass);
          win.position.set(b.x, b.y + b.d/2+0.02, b.z+h*0.55);
          win.rotation.y=0; // orient - but plane orientation
          // adjust side
          // Just add one side for brevity
          this.group.add(win); break;
        }
      }
    }
  }
  generateBlocks(){
    const out=[];
    // City center dense, suburbs sparse, industrial sheds, country farmhouses
    const rnd=(a,b)=> a+Math.random()*(b-a);
    // CBD 15 blocks
    for(let i=0;i<28;i++){
      const ang=Math.random()*Math.PI*2, rad=rnd(10,120);
      const x= Math.cos(ang)*rad*0.9 + rnd(-12,12);
      const y= 60 + Math.sin(ang)*rad*0.6 + rnd(-10,10);
      // avoid overlapping roads? simple distance check to roads
      if(this.isOnRoad(x,y, 22)) continue;
      out.push({x,y, z:this.network.sampleTerrain(x,y)+0.2, w:rnd(10,18), d:rnd(12,20), height:rnd(22,68), style:'modern', color: new THREE.Color().setHSL(0.58+rnd(-0.04,0.04),0.12,0.62) });
    }
    // Residential
    for(let i=0;i<40;i++){
      const x=rnd(-140,180), y=rnd(-10,150);
      if(Math.hypot(x,y-60)<34) continue;
      if(this.isOnRoad(x,y,14)) continue;
      out.push({x,y, z:this.network.sampleTerrain(x,y)+0.15, w:rnd(8,12), d:rnd(9,14), height:rnd(6,13), style: Math.random()>0.5?'modern':'brick', color:0xcfd5de});
    }
    // Suburb detached
    for(let i=0;i<26;i++){
      const x=rnd(220,340), y=rnd(-15,95);
      if(this.isOnRoad(x,y,12)) continue;
      out.push({x,y, z:this.network.sampleTerrain(x,y)+0.15, w:rnd(7,10), d:rnd(7,11), height:rnd(5,8), style:'brick', color:0xd8c9b8});
    }
    // Industrial sheds south
    for(let i=0;i<14;i++){
      const x=rnd(-120,140), y=rnd(-360,-200);
      if(this.isOnRoad(x,y,16)) continue;
      out.push({x,y, z:this.network.sampleTerrain(x,y)+0.2, w:rnd(18,30), d:rnd(14,24), height:rnd(8,14), style:'industrial', color:0x9aa0a8});
    }
    // Country farmsteads
    for(let i=0;i<10;i++){
      const x=rnd(-460,-260), y=rnd(120,340);
      out.push({x,y, z:this.network.sampleTerrain(x,y)+0.2, w:rnd(7,11), d:rnd(8,12), height:rnd(5,7), style:'brick', color:0xc9b9a2});
    }
    // Offroad cabins
    for(let i=0;i<8;i++){
      const x=rnd(360,480), y=rnd(-60,200);
      out.push({x,y, z:this.network.sampleTerrain(x,y)+0.2, w:rnd(5,8), d:rnd(5,8), height:rnd(3.5,5), style:'brick', color:0x8a7a65});
    }
    // Sort by height for transparency
    return out;
  }
  isOnRoad(x,y, thresh){
    for(const seg of this.network.segments.values()){
      for(let i=0;i<seg.points.length-1;i++){
        const a=seg.points[i], b=seg.points[i+1];
        const d=pointToSegment({x,y},a,b);
        if(d < thresh) return true;
      }
    }
    return false;
  }
}
function pointToSegment(p,a,b){
  const l2=(b.x-a.x)*(b.x-a.x)+(b.y-a.y)*(b.y-a.y);
  if(l2===0) return Math.hypot(p.x-a.x,p.y-a.y);
  let t=((p.x-a.x)*(b.x-a.x)+(p.y-a.y)*(b.y-a.y))/l2; t=Math.max(0,Math.min(1,t));
  const proj={x:a.x+t*(b.x-a.x), y:a.y+t*(b.y-a.y)};
  return Math.hypot(p.x-proj.x, p.y-proj.y);
}

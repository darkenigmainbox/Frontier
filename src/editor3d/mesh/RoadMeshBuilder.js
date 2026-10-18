import * as THREE from 'three';
import { getPreset } from '../../core/RoadTypes.js';
import { polyOffsetLine } from '../../utils/geometry.js';

export class RoadMeshBuilder{
  constructor(network, scene){
    this.network=network; this.scene=scene;
    this.group=new THREE.Group(); this.group.name='Roads';
    scene.add(this.group);
    this.meshes=new Map();
    this.markingMeshes=new Map();
    this.sidewalkMeshes=new Map();
    this.terrainMesh=null;
    this.terrainHeightMap=null;
  }
  clear(){
    this.group.clear();
    this.meshes.clear(); this.markingMeshes.clear(); this.sidewalkMeshes.clear();
  }
  rebuildAll(){
    this.clear();
    this.updateTerrain();
    for(const seg of this.network.segments.values()) this.buildSegment(seg);
    this.buildIntersections();
  }
  updateTerrain(){
    if(this.terrainMesh) { this.scene.remove(this.terrainMesh); this.terrainMesh=null; }
    const {data,res,size}= this.network.buildHeightMap(160, 1200);
    this.terrainHeightMap={data,res,size};
    const geo=new THREE.PlaneGeometry(size,size,res-1,res-1);
    const pos=geo.attributes.position;
    for(let i=0;i<pos.count;i++){
      const x=pos.getX(i), y=pos.getY(i);
      const wx=x, wy=y;
      const h=this.network.sampleTerrain(wx,wy);
      pos.setZ(i, h );
    }
    geo.computeVertexNormals();
    // vertex color based on height/slope
    const colors=[];
    for(let i=0;i<pos.count;i++){
      const h=pos.getZ(i);
      const wcol = h<2? new THREE.Color(0x3c4a2e) : h<6? new THREE.Color(0x556b3a) : h<18? new THREE.Color(0x5a6e3a) : h<30? new THREE.Color(0x6b7d4a) : new THREE.Color(0x7a8b5e);
      // darker valley
      colors.push(wcol.r,wcol.g,wcol.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors,3));
    const mat=new THREE.MeshStandardMaterial({vertexColors:true, roughness:0.9, metalness:0.02, side:THREE.DoubleSide});
    const mesh=new THREE.Mesh(geo, mat);
    mesh.receiveShadow=true; mesh.rotation.x=0; // plane is XY, we used Z up? plane geometry is XY plane with Z as height? Actually PlaneGeometry creates XY with Z=0. We set Z as height, but orientation: we want horizontal ground X-Y, Z up. PlaneGeometry default is XY plane. So rotation not needed. But THREE up is Y by default? We'll treat Z up by rotating scene? Easier: keep ground as XY with Z height, camera orbit will handle. Use Z up renderer.
    mesh.name='Terrain';
    this.scene.add(mesh);
    this.terrainMesh=mesh;

    // water planes
    if(this.waterGroup) this.scene.remove(this.waterGroup);
    this.waterGroup=new THREE.Group(); this.waterGroup.name='Water';
    this.scene.add(this.waterGroup);
    // river mesh strip
    const riverPoints=[]; for(let x=-600;x<=600;x+=8){ const y=-35 + Math.sin(x*0.008)*24 + Math.sin(x*0.021)*8; const w=28+ Math.sin(x*0.015)*8; riverPoints.push({x,y,w}); }
    const riverGeo=new THREE.PlaneGeometry(1200, 60, 100, 1); // placeholder, we will deform
    // Actually build custom river mesh as ribbon
    const ribbonGeom=buildRibbon(riverPoints.map(p=>({x:p.x,y:p.y})), riverPoints.map(p=>p.w*2), 1.1);
    const waterMat=new THREE.MeshStandardMaterial({color:0x3a7fb8, roughness:0.15, metalness:0.05, transparent:true, opacity:0.78, side:THREE.DoubleSide});
    const riverMesh=new THREE.Mesh(ribbonGeom, waterMat);
    riverMesh.position.z=1.3; riverMesh.receiveShadow=false;
    this.waterGroup.add(riverMesh);
    // lake
    const lakeGeo=new THREE.CircleGeometry(70,48); const lakeMesh=new THREE.Mesh(lakeGeo, waterMat); lakeMesh.position.set(280,-180,1.2); this.waterGroup.add(lakeMesh);
    const pondGeo=new THREE.CircleGeometry(34,32); const pondMesh=new THREE.Mesh(pondGeo, waterMat.clone()); pondMesh.material.color.set(0x4a7fb8); pondMesh.position.set(-310,240,18.3); this.waterGroup.add(pondMesh);
  }

  buildSegment(seg){
    const preset=getPreset(seg.type);
    // Build centerline with elevation sampling
    const center=seg.points.map(p=>{
      const z=this.network.sampleTerrain(p.x,p.y);
      const water=this.network.sampleWater(p.x,p.y);
      let elev=z;
      if(seg.bridge && water!=null) elev=Math.max(z, water+7); // deck height
      else if(seg.bridge) elev=z+6;
      return new THREE.Vector3(p.x, p.y, elev + 0.18); // slight lift to avoid z-fighting except bridges higher
    });
    // smooth center via catmull
    const curve=new THREE.CatmullRomCurve3(center);
    const divisions=Math.max(12, Math.floor(curve.getLength()/6));
    const points=curve.getPoints(divisions);
    // compute road width
    const width=preset.width;
    const roadGeom=buildRibbonFromVectors(points, width, preset);
    const asphaltMat=new THREE.MeshStandardMaterial({
      color: preset.dirt? 0x5a4a30 : preset.gravel? 0x6b6b60 : new THREE.Color(preset.color),
      roughness: preset.dirt? 1.0 : preset.cobble? 0.85 : 0.78,
      metalness:0.02,
    });
    if(preset.cobble){
      asphaltMat.roughness=0.95;
    }
    const mesh=new THREE.Mesh(roadGeom, asphaltMat);
    mesh.castShadow=false; mesh.receiveShadow=true;
    mesh.userData={segmentId: seg.id};
    this.group.add(mesh);
    this.meshes.set(seg.id, mesh);

    // sidewalks
    if(preset.sidewalk){
      const sw=preset.sidewalkWidth||2.4;
      const curbH=0.14;
      const leftGeom=buildRibbonFromVectors(points, sw, null, width/2 + sw/2, curbH);
      const rightGeom=buildRibbonFromVectors(points, sw, null, -(width/2 + sw/2), curbH);
      const swMat=new THREE.MeshStandardMaterial({color:0x9ea7b3, roughness:0.92});
      const lm=new THREE.Mesh(leftGeom, swMat); lm.receiveShadow=true; this.group.add(lm);
      const rm=new THREE.Mesh(rightGeom, swMat); rm.receiveShadow=true; this.group.add(rm);
      this.sidewalkMeshes.set(seg.id, [lm,rm]);
      // ramps at intersections will be handled in intersection builder
    }

    // markings
    this.buildMarkings(seg, points, preset);

    // bridge structure
    if(seg.bridge){
      this.buildBridge(seg, points, width);
    }
    // guard rails for highway
    if(preset.highway || seg.bridge){
      this.buildGuardRails(points, width);
    }
  }

  buildMarkings(seg, points, preset){
    if(preset.marking==='none' || preset.dirt || preset.gravel) return;
    const group=new THREE.Group();
    // center line as thin planes
    const curve=new THREE.CatmullRomCurve3(points);
    const total=curve.getLength();
    const isHighway=preset.highway;
    // dashed logic
    const dashLen= isHighway? 6 : 3.5, gap= isHighway? 4 : 4.5;
    const count=Math.floor(total/(dashLen+gap));
    const markingMat=new THREE.MeshStandardMaterial({color: isHighway? 0xfff0a0 : 0xffffff, roughness:0.6, emissive:0x111111, emissiveIntensity:0.02});
    const yellowMat=new THREE.MeshStandardMaterial({color:0xffe066, roughness:0.6});
    const isDouble = preset.marking.includes('double');
    const useYellow = isHighway;
    const mat = useYellow? yellowMat : markingMat;
    for(let i=0;i<count;i++){
      const t0=(i*(dashLen+gap))/total, t1=(i*(dashLen+gap)+dashLen)/total;
      if(t1>1) break;
      const p0=curve.getPointAt(t0), p1=curve.getPointAt(t1);
      const dir=new THREE.Vector3().subVectors(p1,p0).normalize();
      const len=p0.distanceTo(p1);
      const w=0.18;
      const geom=new THREE.PlaneGeometry(len,w);
      const mesh=new THREE.Mesh(geom, mat);
      const mid=new THREE.Vector3().addVectors(p0,p1).multiplyScalar(0.5);
      mid.z+=0.06;
      mesh.position.copy(mid);
      mesh.lookAt(p1);
      // PlaneGeometry faces +Z, lookAt orients -Z? adjust
      mesh.rotateX(Math.PI/2); // lay flat
      mesh.rotateZ(Math.PI/2);
      // align
      group.add(mesh);
      if(isDouble){
        const m2=mesh.clone();
        // offset sideways by 0.22
        const perp=new THREE.Vector3(-dir.y, dir.x,0).multiplyScalar(0.22);
        m2.position.add(perp);
        mesh.position.sub(perp);
        group.add(m2);
      }
    }
    // lane dividers for >2 lanes
    if(preset.lanes>2){
      for(let lane=1; lane<preset.lanes-1; lane++){
        // offset not needed center only for demo
      }
    }
    // stop lines / arrows at intersections would go in intersection builder
    this.group.add(group);
    this.markingMeshes.set(seg.id, group);
  }

  buildBridge(seg, points, width){
    // piers
    const pierMat=new THREE.MeshStandardMaterial({color:0x6e737b, roughness:0.85});
    const pierCount=Math.max(1, Math.floor(points.length/4));
    for(let i=1;i<pierCount;i++){
      const p=points[Math.floor(points.length/pierCount*i)];
      const groundZ=this.network.sampleTerrain(p.x,p.y);
      const deckZ=p.z;
      const h=Math.max(1.2, deckZ-groundZ);
      if(h<1) continue;
      const pierGeo=new THREE.BoxGeometry(1.6,1.6,h);
      const pier=new THREE.Mesh(pierGeo, pierMat);
      pier.position.set(p.x,p.y, groundZ + h/2);
      pier.castShadow=true; pier.receiveShadow=true;
      this.group.add(pier);
      // cross beam
      const beamGeo=new THREE.BoxGeometry(width+1.2, 0.5,0.4);
      const beam=new THREE.Mesh(beamGeo, pierMat);
      beam.position.set(p.x,p.y, deckZ-0.35);
      // orient beam perpendicular to road
      if(i>0){
        const prev=points[Math.floor(points.length/pierCount*i)-1];
        const dir=new THREE.Vector2(p.x-prev.x, p.y-prev.y).normalize();
        const ang=Math.atan2(dir.y,dir.x);
        beam.rotation.z=ang;
      }
      this.group.add(beam);
    }
    // bridge railings
    const railMat=new THREE.MeshStandardMaterial({color:0x8a909a, roughness:0.5, metalness:0.18});
    const curve=new THREE.CatmullRomCurve3(points);
    const divisions=points.length;
    // simple railing as tube along edges
    [ -width/2-0.15, width/2+0.15 ].forEach(off=>{
      const railPoints=[];
      for(const p of points){
        // offset perpendicular
        // approximate offset using curve tangent
        const t=points.indexOf(p)/Math.max(1,points.length-1);
        const tang=curve.getTangentAt(t);
        const norm=new THREE.Vector3(-tang.y, tang.x,0);
        railPoints.push(new THREE.Vector3(p.x+norm.x*off, p.y+norm.y*off, p.z+0.55));
      }
      const rc=new THREE.CatmullRomCurve3(railPoints);
      const tube=new THREE.TubeGeometry(rc, divisions*2, 0.06, 8, false);
      const mesh=new THREE.Mesh(tube, railMat);
      this.group.add(mesh);
      // posts every 6m
      for(let i=0;i<railPoints.length;i+=4){
        const rp=railPoints[i];
        const postGeo=new THREE.BoxGeometry(0.08,0.08,0.9);
        const post=new THREE.Mesh(postGeo, railMat);
        post.position.set(rp.x,rp.y,rp.z-0.35);
        this.group.add(post);
      }
    });
  }

  buildGuardRails(points, width){
    // minimal
  }

  buildIntersections(){
    // find nodes with degree >=3
    const degree=new Map();
    for(const s of this.network.segments.values()){
      degree.set(s.a, (degree.get(s.a)||0)+1);
      degree.set(s.b, (degree.get(s.b)||0)+1);
    }
    for(const [nid,deg] of degree.entries()){
      if(deg<3) continue;
      const node=this.network.nodes.get(nid);
      if(!node) continue;
      const connSegs=[...this.network.segments.values()].filter(s=>s.a===nid||s.b===nid);
      // build simple intersection cap: polygon fan using road half-widths
      // For robust quad flow, create a rounded intersection mesh that blends asphalt
      const z=this.network.sampleTerrain(node.x,node.y)+0.22;
      // compute approach points
      const radials=[];
      for(const seg of connSegs){
        const pts=seg.points;
        const isA=seg.a===nid;
        const dirPt=isA? pts[1]||pts[0] : pts[pts.length-2]||pts[pts.length-1];
        const v={x: dirPt.x-node.x, y: dirPt.y-node.y};
        const len=Math.hypot(v.x,v.y)||1; v.x/=len; v.y/=len;
        const halfW=seg.width/2;
        radials.push({seg, dir:v, halfW, angle: Math.atan2(v.y,v.x)});
      }
      radials.sort((a,b)=>a.angle-b.angle);
      // Build polygon around node
      const poly=[];
      for(let i=0;i<radials.length;i++){
        const cur=radials[i], nxt=radials[(i+1)%radials.length];
        // Compute miter between cur and nxt
        const aAngle=cur.angle, bAngle=nxt.angle;
        let delta=bAngle-aAngle; if(delta<0) delta+=Math.PI*2;
        const miterLen= 1/Math.max(0.28, Math.sin(delta/2));
        // bisector
        const bis={x: cur.dir.x + nxt.dir.x, y: cur.dir.y + nxt.dir.y};
        let blen=Math.hypot(bis.x,bis.y)||1; bis.x/=blen; bis.y/=blen;
        const radius= Math.max(cur.halfW, nxt.halfW)*1.25;
        // push two points per radial edge with curb radius
        const p1={ x: node.x + cur.dir.x*cur.halfW*0.35 + (-cur.dir.y)*cur.halfW*1.0, y: node.y + cur.dir.y*cur.halfW*0.35 + cur.dir.x*cur.halfW*1.0 };
        const p2={ x: node.x + cur.dir.x*cur.halfW*0.35 + cur.dir.y*cur.halfW*1.0, y: node.y + cur.dir.y*cur.halfW*0.35 - cur.dir.x*cur.halfW*1.0 };
        poly.push(p1); poly.push(p2);
        // Actually better to generate smooth corner arc
      }
      // Simplify: create a circle intersection with radius based on max width
      const maxW=Math.max(...connSegs.map(s=>s.width));
      const r= maxW*0.8 + 1.2;
      const capGeo=new THREE.CircleGeometry(r, Math.max(16, radials.length*4));
      const capMat=new THREE.MeshStandardMaterial({color:0x2f333a, roughness:0.78});
      const cap=new THREE.Mesh(capGeo, capMat);
      cap.position.set(node.x,node.y,z+0.02); cap.receiveShadow=true;
      this.group.add(cap);
      // crosswalk
      if(connSegs.some(s=>getPreset(s.type).sidewalk)){
        this.buildCrosswalks(node, radials, z);
      }
      // curb ramps: small sloped planes at each corner
      for(const rad of radials){
        const preset=getPreset(rad.seg.type);
        if(!preset.sidewalk) continue;
        const rampGroup=new THREE.Group();
        // ADA ramp: 1.2m wide, slope 8%
        // Place at edge of intersection
        const offDist=r+0.4;
        const cx=node.x + rad.dir.x*offDist, cy=node.y + rad.dir.y*offDist;
        // tactile pad
        const padGeo=new THREE.PlaneGeometry(1.0,0.9);
        const padMat=new THREE.MeshStandardMaterial({color:0xb89a3a, roughness:0.9});
        const pad=new THREE.Mesh(padGeo, padMat);
        pad.position.set(cx,cy,z+0.04);
        pad.rotation.z=rad.angle;
        this.group.add(pad);
      }
    }
  }

  buildCrosswalks(node, radials, z){
    const mat=new THREE.MeshStandardMaterial({color:0xffffff, roughness:0.9});
    const stripeW=0.42, stripeGap=0.42, stripeLen=3.2;
    for(const rad of radials){
      const count=7;
      for(let i=0;i<count;i++){
        const offset=(i-(count-1)/2)*(stripeW+stripeGap);
        const perp={x:-rad.dir.y, y:rad.dir.x};
        const cx=node.x + rad.dir.x* (6) + perp.x*offset;
        const cy=node.y + rad.dir.y* (6) + perp.y*offset;
        const geom=new THREE.PlaneGeometry(stripeLen, stripeW);
        const mesh=new THREE.Mesh(geom, mat);
        mesh.position.set(cx,cy,z+0.08);
        // orient along road direction
        const ang=Math.atan2(rad.dir.y, rad.dir.x);
        mesh.rotation.z=ang;
        // keep flat
        this.group.add(mesh);
      }
    }
  }
}

function buildRibbon(points, widths, elevationOffset=0.08){
  // points [{x,y}], widths array or single
  const geom=new THREE.BufferGeometry();
  const verts=[], uvs=[], indices=[];
  const getW=i=> Array.isArray(widths)? widths[i] : widths;
  for(let i=0;i<points.length;i++){
    const p=points[i];
    const prev=points[i-1]||p, next=points[i+1]||p;
    const t1={x:p.x-prev.x, y:p.y-prev.y}, t2={x:next.x-p.x, y:next.y-p.y};
    let tx=(t1.x+t2.x)*0.5, ty=(t1.y+t2.y)*0.5;
    const len=Math.hypot(tx,ty)||1; tx/=len; ty/=len;
    const nx=-ty, ny=tx;
    const w=getW(i)*0.5;
    verts.push(p.x+nx*w, p.y+ny*w, elevationOffset);
    verts.push(p.x-nx*w, p.y-ny*w, elevationOffset);
    uvs.push(i/(points.length-1),0); uvs.push(i/(points.length-1),1);
  }
  for(let i=0;i<points.length-1;i++){
    const a=i*2, b=i*2+1, c=(i+1)*2, d=(i+1)*2+1;
    indices.push(a,c,b, b,c,d);
  }
  geom.setAttribute('position', new THREE.Float32BufferAttribute(verts,3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs,2));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}
function buildRibbonFromVectors(vectors, width, preset, lateralOffset=0, zOffset=0){
  // vectors: Vector3[]
  const verts=[], uvs=[], indices=[];
  for(let i=0;i<vectors.length;i++){
    const p=vectors[i];
    const prev=vectors[i-1]||p, next=vectors[i+1]||p;
    const tx=( (p.x-prev.x)+(next.x-p.x) )*0.5, ty=( (p.y-prev.y)+(next.y-p.y) )*0.5;
    const len=Math.hypot(tx,ty)||1;
    const nx=-ty/len, ny=tx/len;
    // apply lateral offset
    const cx=p.x + nx*lateralOffset, cy=p.y + ny*lateralOffset;
    const half=width/2;
    verts.push(cx+nx*half, cy+ny*half, p.z+zOffset);
    verts.push(cx-nx*half, cy-ny*half, p.z+zOffset);
    uvs.push(i/(vectors.length-1),0); uvs.push(i/(vectors.length-1),1);
  }
  for(let i=0;i<vectors.length-1;i++){
    const a=i*2, b=i*2+1, c=(i+1)*2, d=(i+1)*2+1;
    indices.push(a,c,b, b,c,d);
  }
  const geom=new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(verts,3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs,2));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

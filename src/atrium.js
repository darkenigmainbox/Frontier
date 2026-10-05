import * as THREE from 'three';

// Original procedural architecture. Everything, including the curved columns,
// foliage, sculpture and luminous surfaces, is an indexed triangle mesh.
export function buildAtrium({add,material,lights}){
 const cube=new THREE.BoxGeometry(1,1,1);
 const cylinder=new THREE.CylinderGeometry(1,1,1,20,1);
 const leaf=new THREE.IcosahedronGeometry(1,0);
 const stone=material([.69,.68,.61]),ivory=material([.83,.79,.68]);
 const charcoal=material([.085,.105,.115],0,.18),bronze=material([.35,.23,.12],0,.48);
 const wood=material([.44,.25,.12]),teal=material([.055,.30,.29]),terracotta=material([.56,.16,.075]);
 const box=(kind,size,pos,mat=stone)=>add(kind,cube,mat,pos,size);
 const round=(kind,radius,height,pos,mat)=>add(kind,cylinder,mat,pos,[radius,height,radius]);
 const emitter=(kind,size,pos,color,power,rotation)=>{
  const object=add(kind,new THREE.PlaneGeometry(...size),material(color,power),pos);
  object.rotation.set(...rotation);object.areaEmitter=true;lights.push({object});return object;
 };
 // Open-front cutaway, with a real roof aperture and a long central nave.
 box('atrium-floor',[24,.24,22],[0,-.12,0],stone);
 box('central-inlay',[7.5,.012,21],[0,.008,0],material([.22,.28,.28],0,.12));
 for(const x of [-3.85,3.85])box('brass-floor-inlay',[.045,.016,21],[x,.014,0],bronze);
 for(let z=-10;z<=10;z+=2){box('floor-joint',[24,.006,.025],[0,.008,z],charcoal);}
 for(const x of [-10,-8,-6,6,8,10])box('floor-joint',[.025,.006,22],[x,.008,0],charcoal);
 box('rear-wall',[24,10,.3],[0,5,-10.9],ivory);
 // Two-storey side walls, window recesses and repeated facade bays.
 for(const sign of [-1,1]){
  box('side-plinth',[.28,.55,22],[sign*11.85,.275,0],charcoal);
  box('side-spandrel',[.3,1.05,22],[sign*11.85,4.55,0],stone);
  box('roof-edge',[.4,.6,22],[sign*11.8,9.7,0],ivory);
  for(const z of [-9,-5,-1,3,7]){
   box('wall-pier',[.55,9.4,.55],[sign*11.7,4.7,z],stone);
   for(const y of [2.2,7.2]){
    box('recess-backing',[.12,3.35,3.35],[sign*11.98,y,z+1.8],teal);
    for(const offset of [-1.1,0,1.1])box('window-mullion',[.16,3.5,.045],[sign*11.78,y,z+1.8+offset],bronze);
   }
  }
  // Galleries are solid floors, not unoccluded decorative outlines.
  // Four deck pieces leave an actual stairwell, rather than a slab through the stairs.
  box('gallery-deck',[3.375,.3,21.5],[sign*6.9125,4.4,-.2],stone);
  box('gallery-deck',[.775,.3,21.5],[sign*11.3875,4.4,-.2],stone);
  box('gallery-landing',[2.4,.3,12.45],[sign*9.8,4.4,-4.725],stone);
  box('gallery-landing',[2.4,.3,1.55],[sign*9.8,4.4,9.775],stone);
  box('gallery-fascia',[.2,.44,21.5],[sign*5.23,4.38,-.2],ivory);
  box('gallery-handrail',[.09,.09,21.4],[sign*5.17,5.55,-.2],bronze);
  box('gallery-lower-rail',[.055,.055,21.4],[sign*5.17,4.75,-.2],bronze);
  for(let z=-10.5;z<=10.5;z+=.7)box('balustrade',[.05,.95,.05],[sign*5.17,5.07,z],bronze);
  // Structural columns and capitals on both levels.
  for(const z of [-8,-3,2,7]){
   round('column-base',.63,.22,[sign*5.65,.11,z],charcoal);
   round('column',.43,4.08,[sign*5.65,2.24,z],ivory);
   round('column-capital',.59,.17,[sign*5.65,4.24,z],bronze);
   round('upper-column',.32,4.8,[sign*5.65,6.95,z],ivory);
   round('upper-capital',.48,.18,[sign*5.65,9.38,z],bronze);
   box('ceiling-crossbeam',[7,.34,.32],[sign*8.5,9.38,z],stone);
  }
  box('roof-wing',[7.75,.22,22],[sign*8.125,9.88,0],charcoal);
  // Timber soffit fins give the side aisles readable, repeated shadow detail.
  for(let z=-10;z<=10;z+=.8){const stairwell=z>1.5&&z<9;box('soffit-fin',[stairwell?2.85:5.8,.22,.065],[sign*(stairwell?7.125:8.6),3.99,z],wood);}
  // Rear stair flights: twenty-two real solid treads each.
  for(let i=0;i<22;i++){const h=(i+1)*.2;box('stair-tread',[2.1,h,.31],[sign*9.8,h/2,8.5-i*.31],stone);}
  // Benches and low planted islands leave the central axis unobstructed.
  for(const z of [-6.5,-2.5]){
   box('bench-seat',[1.7,.17,2.7],[sign*7.9,.55,z],wood);
   for(const dz of [-.9,.9])box('bench-leg',[1.4,.47,.12],[sign*7.9,.235,z+dz],charcoal);
   box('planter',[1.35,.65,2.65],[sign*10.5,.325,z],charcoal);
   box('soil',[1.18,.025,2.48],[sign*10.5,.66,z],material([.10,.095,.055]));
   for(let i=0;i<7;i++){
    const zLeaf=z-1+i*.33;
    const o=add('foliage',leaf,material([.09+i*.012,.21+i*.008,.105]),[sign*(10.5+Math.sin(i*2)*.3),.95+(i%3)*.17,zLeaf],[.37,.5+(i%3)*.1,.35]);o.rotation.y=i*.7;
   }
  }
 }
 // Open skylight lattice. Only one registered daylight mesh serves the roof;
 // frames actually occlude it, producing a structured penumbra pattern.
 for(const x of [-4.25,4.25])box('skylight-longitudinal',[.16,.28,22],[x,9.72,0],bronze);
 for(let z=-10;z<=10;z+=2.5)box('skylight-transom',[8.5,.2,.10],[0,9.76,z],bronze);
 emitter('skylight',[8.1,20],[0,9.96,0],[.83,.92,1],2.4,[Math.PI/2,0,0]);
 // Warm recessed backdrop; contrast against daylight rather than many costly lights.
 box('feature-recess',[7.6,7.6,.18],[0,4.6,-10.67],charcoal);
 for(let x=-3.5;x<=3.5;x+=.35)box('feature-flute',[.12,7.2,.2],[x,4.6,-10.5],wood);
 emitter('warm-backdrop',[2.5,5.5],[0,4.1,-10.32],[1,.58,.24],3.2,[0,0,0]);
 // A sculptural twisted ribbon: connected, two-sided triangle surface.
 const vertices=[],indices=[],segments=64;
 for(let i=0;i<=segments;i++){
  const t=i/segments,angle=t*Math.PI*3.1;
  for(const side of [-1,1]){const radius=.9+side*.24;vertices.push(Math.cos(angle)*radius,1.05+t*4.6,Math.sin(angle)*radius-5.5);}
  if(i<segments){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
 }
 const sculpture=new THREE.BufferGeometry();sculpture.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));sculpture.setIndex(indices);sculpture.computeVertexNormals();
 add('ribbon-sculpture',sculpture,material([.56,.32,.12],0,.7),[0,0,0]);
 round('sculpture-plinth',1.55,.65,[0,.325,-5.5],charcoal);
 round('plinth-cap',1.6,.12,[0,.71,-5.5],ivory);
 // Two connected cloth banners provide vertex deformation within architecture.
 for(const sign of [-1,1]){
  const banner=add('atrium-banner',new THREE.PlaneGeometry(1.25,4.2,6,20),sign<0?terracotta:teal,[sign*4.35,7.15,-1.5],[1,1,1],'wave');banner.restPositions=banner.geometry.attributes.position.array.slice();banner.wavePhase=sign*1.2;
  box('banner-rail',[1.5,.07,.07],[sign*4.35,9.3,-1.5],bronze);
 }
}

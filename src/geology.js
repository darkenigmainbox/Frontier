// Geometry-first rock synthesis. No textures, noise maps or fixed rock meshes.
// An accreted anisotropic mass is cut by geological joint families and finite
// weathering volumes, then polygonised with a shared-edge marching tetrahedra mesh.
export function rng(seed) {
  let a = seed >>> 0;
  return () => { a += 0x6D2B79F5; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export function generateRock(config) {
  const random = rng(config.seed), range = (a,b) => a + random() * (b-a);
  const height = 5.5 + config.height / 100 * 8, type = config.formation;
  const masses = [], joints = [], bites = [];
  function mass(x,y,z,rx,ry,rz) {
    const angle = range(-.6,.6), tilt = range(-.25,.25);
    const planes = Array.from({length:8}, () => { const az=range(0,Math.PI*2), ny=range(-.8,.9), len=Math.sqrt(1+ny*ny); return [Math.cos(az)/len,ny/len,Math.sin(az)/len,range(.70,1.02)]; });
    masses.push({x,y,z,rx,ry,rz,c:Math.cos(angle),s:Math.sin(angle),ct:Math.cos(tilt),st:Math.sin(tilt),p:range(4.0,7.5),planes});
  }
  // Ridge topology is grown as a correlated walk, with unequal buttresses and
  // branch masses. Each seed changes the silhouette, not only surface detail.
  if(type === 'cliff') {
    let z=0, y=0;
    const count=9+Math.floor(random()*4);
    for(let i=0;i<count;i++) {
      const x=-9+i*18/(count-1); z=Math.max(-1.8,Math.min(1.8,z+range(-1.1,1.1))); y=Math.max(-1.5,Math.min(1.4,y+range(-1.1,1.1)));
      const h=height*range(.68,1.04)+y;
      mass(x,h*.45-.4,z,range(1.7,3.1),h*.55,range(2.1,3.6));
      if(random()>.24) mass(x+range(-1,1),h*.22,z+range(1.6,2.8),range(1.1,2.3),h*range(.24,.42),range(1.3,2.3));
      if(random()>.4) mass(x+range(-.8,.8),h*.78,z+range(-.5,.5),range(1,1.8),h*.26,range(1.3,2.2));
    }
  } else if(type==='outcrop') {
    const branches=5+Math.floor(random()*4);
    mass(0,height*.19,0,4,height*.32,3.5);
    for(let b=0;b<branches;b++) {
      const angle=range(0,Math.PI*2), length=range(3,7), steps=3+Math.floor(random()*3);
      for(let i=0;i<steps;i++) {const t=i/(steps-1), h=height*range(.3,.62)*(1-t*.55);mass(Math.cos(angle)*length*t+range(-.7,.7),h*.39-.3,Math.sin(angle)*length*t+range(-.6,.6),range(1.5,2.8),h*.65,range(1.4,2.7));}
    }
  } else if(type==='spire') {
    for(let i=0;i<8;i++) {
      const x=-7.5+i*2.1+range(-.6,.6), z=range(-2,1.8), h=height*range(.55,1.3), w=range(.9,1.6);
      mass(x,h*.4,z,w*1.5,h*.5,w*1.3);
      mass(x+range(-.5,.5),h*.75,z+range(-.5,.5),w*.85,h*.3,w*.9);
      mass(x+range(-.5,.5),h*.1,z+1,w*1.6,h*.25,w*1.9);
    }
  } else {
    const radius=6.2, h=height*.85;
    for(let i=0;i<17;i++) {const a=Math.PI*i/16, x=Math.cos(a)*radius, y=Math.sin(a)*h;mass(x+range(-.35,.35),y-.2,range(-.4,.4),range(1.5,2.1),range(1.6,2.5),range(2,2.9));}
    for(const side of [-1,1]) mass(side*6,1,0,2.7,3.4,3.2);
  }
  // Joint sets: near-vertical tectonic joints, cross joints, and oblique shears.
  const density=config.fracture/100, jointCount=Math.floor(10+density*24);
  const strike=range(-.27,.27);
  for(let i=0;i<jointCount;i++) {
    const family=i%3; let nx,ny,nz,offset;
    if(family===0){ nx=1;ny=range(-.25,.25);nz=strike+range(-.16,.16);offset=range(-10,10); }
    else if(family===1){nx=range(.18,.5);ny=1;nz=range(-.25,.25);offset=range(1,height*1.13);}
    else{nx=range(-.6,.6);ny=range(.25,.65);nz=1;offset=range(-1,6);}
    const l=Math.hypot(nx,ny,nz);nx/=l;ny/=l;nz/=l;offset/=l;
    joints.push([nx,ny,nz,offset,range(.045,.13)*( .65+density),range(-2.8,1.4),range(-.14,.14),range(-8,8),family===1?range(3.5,8):30]);
  }
  // Localised spalling removes convex pieces rather than displacing vertices.
  const erosion=config.erosion/100;
  for(let i=0;i<Math.floor(45+erosion*170);i++) {
    const m=masses[Math.floor(random()*masses.length)], a=range(0,Math.PI*2), v=range(-.7,.9), r=range(.18,1.05)*( .4+erosion);
    const angle=range(-3.14,3.14);
    bites.push([m.x+Math.cos(a)*m.rx*.92,m.y+v*m.ry,m.z+Math.sin(a)*m.rz*.95,r,range(.7,1.5),range(.7,1.6),Math.cos(angle),Math.sin(angle),m.x,m.y,m.z]);
  }
  function envelope(x,y,z) {
    let d=1e6;
    for(let i=0;i<masses.length;i++) {
      const m=masses[i], dx=x-m.x,dy=y-m.y,dz=z-m.z;
      const u=(dx*m.c+dz*m.s)/m.rx, yy=(dy*m.ct-dz*m.st)/m.ry, w=(-dx*m.s+dz*m.c)/m.rz;
      // Rounded convex polyhedra with independent crystal-face cuts.
      let v=(Math.pow(Math.abs(u),m.p)+Math.pow(Math.abs(yy),m.p)+Math.pow(Math.abs(w),m.p)-1)*Math.min(m.rx,m.ry,m.rz)/m.p;
      for(let j=0;j<8;j++){const p=m.planes[j];v=Math.max(v,(u*p[0]+yy*p[1]+w*p[2]-p[3])*Math.min(m.rx,m.ry,m.rz));}
      // A narrow polynomial blend welds buttresses without melting the facets.
      const k=.24, h=Math.max(k-Math.abs(d-v),0)/k;d=Math.min(d,v)-h*h*k*.25;
    }
    return d;
  }
  function field(x,y,z) {
    let d=envelope(x,y,z);
    if(d>1) return d;
    for(let i=0;i<joints.length;i++) {
      const j=joints[i], plane=x*j[0]+y*j[1]+z*j[2]-j[3];
      const width=j[4]*(1+erosion*.7)+Math.max(0,z-1.5)*.018;
      // Fractures taper and terminate in the mass, leaving structural bridges.
      const cut=Math.min(width-Math.abs(plane), (z-j[5]+y*j[6])*.36, (j[8]-Math.abs(x-j[7]))*.45);
      d=Math.max(d,cut);
    }
    for(let i=0;i<bites.length;i++) {
      const b=bites[i], dx=x-b[0],dy=Math.abs((y-b[1])*b[4]),dz=z-b[2];
      if(Math.abs(dx)>b[3]*2||dy>b[3]||Math.abs(dz)>b[3]*2)continue;
      const u=Math.abs(dx*b[6]+dz*b[7]),w=Math.abs((-dx*b[7]+dz*b[6])*b[5]);
      // A rotated, bevelled convex spall: irregular broken faces, not round pores.
      const shape=Math.max(u,dy,w,(u+dy+w)*.59);
      d=Math.max(d,b[3]-shape);
    }
    return Math.max(d,-y-.12);
  }
  // Place the spalls on the *combined* exposed envelope. Hidden primitive
  // surfaces must not receive most of the detail budget.
  for(const b of bites){
    let dx=b[0]-b[8],dy=b[1]-b[9],dz=b[2]-b[10];
    const len=Math.hypot(dx,dy,dz)||1;dx/=len;dy/=len;dz/=len;
    let lo=0,hi=30;
    for(let k=0;k<16;k++){const t=(lo+hi)*.5;if(envelope(b[8]+dx*t,b[9]+dy*t,b[10]+dz*t)<0)lo=t;else hi=t;}
    const t=(lo+hi)*.5+b[3]*.35;b[0]=b[8]+dx*t;b[1]=b[9]+dy*t;b[2]=b[10]+dz*t;
  }
  const step=config.preview?.52:(config.quality?.145:.225);
  const min=[Infinity,-.45,Infinity],max=[-Infinity,-Infinity,-Infinity];
  for(const m of masses){
    const ex=m.rx*Math.abs(m.c)+m.rz*Math.abs(m.s),ez=m.rx*Math.abs(m.s)+m.rz*Math.abs(m.c),ey=(m.ry+ez*Math.abs(m.st))/m.ct;
    min[0]=Math.min(min[0],m.x-ex-.6);min[2]=Math.min(min[2],m.z-ez-.6);
    max[0]=Math.max(max[0],m.x+ex+.6);max[1]=Math.max(max[1],m.y+ey+.6);max[2]=Math.max(max[2],m.z+ez+.6);
  }
  const nx=Math.ceil((max[0]-min[0])/step)+1,ny=Math.ceil((max[1]-min[1])/step)+1,nz=Math.ceil((max[2]-min[2])/step)+1;
  const n=nx*ny*nz, values=new Float32Array(n), gradients=new Float32Array(n*3), stride=nx*ny;
  for(let z=0;z<nz;z++)for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){values[x+nx*y+stride*z]=field(min[0]+x*step,min[1]+y*step,min[2]+z*step);}
  for(let z=0;z<nz;z++)for(let y=0;y<ny;y++)for(let x=0;x<nx;x++) {
    const i=x+nx*y+stride*z;
    gradients[i*3]=(values[i+(x<nx-1?1:0)]-values[i-(x>0?1:0)]);
    gradients[i*3+1]=(values[i+(y<ny-1?nx:0)]-values[i-(y>0?nx:0)]);
    gradients[i*3+2]=(values[i+(z<nz-1?stride:0)]-values[i-(z>0?stride:0)]);
  }
  const positions=[],normals=[],indices=[],colors=[],edgeCache=new Map();
  const corners=[0,1,1+nx,nx,stride,stride+1,stride+1+nx,stride+nx];
  const tets=[[0,5,1,6],[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6]];
  function vertex(a,b) {
    if(a>b){const tmp=a;a=b;b=tmp;}
    const key=a*n+b; const cached=edgeCache.get(key);if(cached!==undefined)return cached;
    const t=values[a]/(values[a]-values[b]);
    const ax=a%nx, ay=Math.floor(a/nx)%ny,az=Math.floor(a/stride),bx=b%nx,by=Math.floor(b/nx)%ny,bz=Math.floor(b/stride);
    const x=min[0]+(ax+(bx-ax)*t)*step,y=min[1]+(ay+(by-ay)*t)*step,z=min[2]+(az+(bz-az)*t)*step;
    const id=positions.length/3;positions.push(x,y,z);
    let gx=gradients[a*3]+(gradients[b*3]-gradients[a*3])*t,gy=gradients[a*3+1]+(gradients[b*3+1]-gradients[a*3+1])*t,gz=gradients[a*3+2]+(gradients[b*3+2]-gradients[a*3+2])*t;
    if(!config.preview){const e=.11;gx=field(x+e,y,z)-field(x-e,y,z);gy=field(x,y+e,z)-field(x,y-e,z);gz=field(x,y,z+e)-field(x,y,z-e);}
    const l=Math.hypot(gx,gy,gz)||1;gx/=l;gy/=l;gz/=l;normals.push(gx,gy,gz);
    // Restrained, low-frequency mineral tint; all relief comes from geometry.
    const mineral=.90+.045*Math.sin(x*.7+y*.32)+.025*Math.cos(z*.8-y*.4);const base=Math.min(1,Math.max(.6,y*.14+.68));
    colors.push(mineral*base,mineral*base,mineral*base);edgeCache.set(key,id);return id;
  }
  function triangle(a,b,c){
    const ax=positions[b*3]-positions[a*3],ay=positions[b*3+1]-positions[a*3+1],az=positions[b*3+2]-positions[a*3+2],bx=positions[c*3]-positions[a*3],by=positions[c*3+1]-positions[a*3+1],bz=positions[c*3+2]-positions[a*3+2];
    const dot=(ay*bz-az*by)*normals[a*3]+(az*bx-ax*bz)*normals[a*3+1]+(ax*by-ay*bx)*normals[a*3+2];
    if(dot>0)indices.push(a,b,c);else indices.push(a,c,b);
  }
  for(let z=0;z<nz-1;z++)for(let y=0;y<ny-1;y++)for(let x=0;x<nx-1;x++) {
    const base=x+nx*y+stride*z;let inside=0;for(let c=0;c<8;c++)if(values[base+corners[c]]<0)inside++;
    if(inside===0||inside===8)continue;
    for(let ti=0;ti<6;ti++) {
      const t=tets[ti],ins=[],out=[];
      for(let k=0;k<4;k++){const id=base+corners[t[k]];(values[id]<0?ins:out).push(id);}
      if(ins.length===1)triangle(vertex(ins[0],out[0]),vertex(ins[0],out[1]),vertex(ins[0],out[2]));
      else if(ins.length===3)triangle(vertex(out[0],ins[0]),vertex(out[0],ins[1]),vertex(out[0],ins[2]));
      else if(ins.length===2){const a=vertex(ins[0],out[0]),b=vertex(ins[0],out[1]),c=vertex(ins[1],out[0]),d=vertex(ins[1],out[1]);triangle(a,b,c);triangle(b,d,c);}
    }
  }
  return {positions:new Float32Array(positions),normals:new Float32Array(normals),colors:new Float32Array(colors),indices:new Uint32Array(indices),massCount:masses.length,jointCount};
}

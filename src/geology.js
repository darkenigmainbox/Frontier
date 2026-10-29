// Stoneforge's formations are made from intersecting fracture planes, not a
// displaced sphere or a heightmap. All random choices are seeded so an asset
// can be regenerated exactly in a build pipeline.
export function random(seed) {
  let a = (Number(seed) >>> 0) || 1;
  return () => { a += 0x6D2B79F5; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const mix = (a,b,t) => a + (b-a)*t;
const clamp = (x,a,b) => Math.max(a,Math.min(b,x));
function smoothMin(a,b,k) { if (k <= 0) return Math.min(a,b); const h = Math.max(k-Math.abs(a-b),0)/k; return Math.min(a,b)-h*h*k*.25; }
function smoothMax(a,b,k) { return -smoothMin(-a,-b,k); }

// Signed distance approximation for a solution cavity. Nonuniform radii,
// oblique axes and bounded deformation create irregular rock, not spheres.
function solutionCavity(x,y,z,c) {
  const dx=x-c.x, dy=y-c.y, dz=z-c.z;
  const X=(dx+c.slant*dy+.12*Math.sin(dy*2.8+c.phase)*Math.sin(dz*2))/c.rx;
  const Y=(dy+.1*Math.sin(dx*3+c.phase)*Math.sin(dz*2.2))/c.ry;
  const Z=(dz+.1*Math.sin(dx*2.4+c.phase)*Math.sin(dy*2.5))/c.rz;
  return (Math.sqrt(X*X+Y*Y+Z*Z)-1)*Math.min(c.rx,c.ry,c.rz);
}

function body(rng, center, radii, roughness, angularity, phase) {
  const planes = [];
  // A randomized Fibonacci distribution avoids repeated template silhouettes.
  // Support distances are independent, producing different fracture faces.
  const count = Math.round(mix(20, 11, angularity));
  for (let i=0;i<count;i++) {
    const y = 1 - 2*(i+.5)/count;
    const a = i * 2.399963 + rng()*.42;
    const r = Math.sqrt(1-y*y);
    planes.push([Math.cos(a)*r, y, Math.sin(a)*r, mix(.78,1.11,rng())]);
  }
  return {center,radii,planes,phase,roughness};
}

// A cliff is a coherent wall, carved into individual, irregular fracture
// domains. Each domain has its own tilted plane; the boundaries become deep,
// tapered joints in the actual mesh. The face varies in X and Y, so it can
// form ledges and overhangs instead of a simple terrain height field.
function createCliff(options, rng, complexity, angularity, erosion, style) {
  const basalt = style === 'basalt', limestone = style === 'limestone';
  const cells=[];
  const cols=basalt ? 10+Math.round(complexity*5) : 5+Math.round(complexity*3);
  const rows=basalt ? 2 : 3+Math.round(complexity*2);
  for(let j=0;j<rows;j++) for(let i=0;i<cols;i++) {
    cells.push({x:-4.1+(i+.5+(rng()-.5)*1.15)*8.2/cols,
      y:(j+.5+(rng()-.5)*1.05)*4.8/rows,
      depth:(rng()-.5)*(basalt?.65:1.15),
      sx:(rng()-.5)*(basalt?.4:1.05),
      sy:(rng()-.5)*(basalt?.2:.8),
      tilt:(rng()-.5)*(basalt?.14:.5)});
  }
  const peaks=Array.from({length:9},(_,i)=>({x:-4.8+i*1.2,h:3.15+rng()*1.55}));
  const ledges=Array.from({length:3+Math.round(complexity*4)},()=>({
    x:(rng()-.5)*7, y:.5+rng()*3.6, width:.45+rng()*.8, height:.25+rng()*.7,
    depth:.18+rng()*.45, tilt:(rng()-.5)*.8
  }));
  // Limestone gets a separate, seeded karst process. The chambers intersect
  // the front and top of the wall, creating real undercuts and notches.
  const cavities=limestone ? Array.from({length:5+Math.round(complexity*3)},(_,i)=>({
    x:-3.05+(i%5)*1.5+(rng()-.5)*.55,
    y:(i<5 ? 1.0 : 2.8)+(rng()-.5)*.65,
    z:1.0+(rng()-.5)*.25,
    rx:mix(.5,1.05,rng()), ry:mix(.42,.85,rng()), rz:mix(1.0,1.45,rng()),
    slant:(rng()-.5)*.8, phase:rng()*10
  })) : [];
  for(const c of cavities) { const strength=.72+erosion*.45; c.rx*=strength; c.ry*=strength; }
  const channels=limestone ? Array.from({length:2+Math.round(complexity*2)},()=>({
    x:(rng()-.5)*6.2, y:1.6+rng()*1.4, z:1.05,
    rx:mix(.16,.32,rng()), ry:mix(1.0,2.0,rng()), rz:mix(.55,.95,rng()),
    slant:(rng()-.5)*.65, phase:rng()*10
  })) : [];
  // Fallen blocks at the toe and partial buttresses break up the outline and
  // join smoothly into the wall. Their positions and fracture planes are seeded.
  const toe=Array.from({length:3+Math.round(complexity*4)},()=>body(rng,
    [(rng()-.5)*6.8,.22+rng()*.22,.85+rng()*.3],
    [.35+rng()*.55,.4+rng()*.55,.4+rng()*.45],erosion,angularity,rng()*20));
  // Embedded inclined buttresses add large-scale relief instead of relying on
  // surface joints alone. Their varying size and position change the silhouette.
  const spurs=Array.from({length:3+Math.round(complexity*2)},()=>body(rng,
    [(rng()-.5)*6.6,1.45+rng()*1.35,.45+rng()*.25],
    [.6+rng()*.65,.8+rng()*1.2,.85+rng()*.5],erosion,angularity,rng()*20));
  const fragments=spurs.concat(toe);
  function field(x,y,z) {
    let first=Infinity,second=Infinity,c1=null,c2=null;
    for(const c of cells) {
      const dx=x-c.x+(y-c.y)*c.tilt;
      const dy=(y-c.y)*(basalt?.24:1.05);
      const distance=Math.sqrt(dx*dx+dy*dy);
      if(distance<first){second=first;c2=c1;first=distance;c1=c;}
      else if(distance<second){second=distance;c2=c;}
    }
    const plane=c=>c.depth+c.sx*(x-c.x)+c.sy*(y-c.y);
    const blend=clamp((second-first)/(basalt?.16:.3),0,1);
    // Blend across the interface to keep the field continuous. The narrow
    // crease is deepest at the interface and cuts into the wall, not its color.
    let face=1.0+mix((plane(c1)+plane(c2))*.5,plane(c1),blend);
    const jointWidth=basalt?.17:.12+angularity*.08;
    face-=Math.exp(-(second-first)/jointWidth)*(basalt?.32:.18+complexity*.3);
    // Broken shelves and protruding blocks, each localized rather than stripes.
    for(const l of ledges) {
      const dx=Math.abs(x-l.x+(y-l.y)*l.tilt)/l.width;
      const dy=Math.abs(y-l.y)/l.height;
      const shape=Math.max(dx,dy);
      face+=l.depth*Math.max(0,1-shape)*(.55+angularity*.45);
    }
    face+=erosion*.09*Math.sin(x*3.1+y*1.7)*Math.sin(y*2.3-x*.8);
    // Rounded, irregular silhouette with a broken skyline and a thick back.
    const pi=clamp(Math.floor((x+4.8)/1.2),0,7);
    const t=clamp((x-peaks[pi].x)/1.2,0,1);
    const top=mix(peaks[pi].h,peaks[pi+1].h,t)-.12*Math.abs(z);
    const side=3.8-.22*Math.max(0,y-1.8)-.13*Math.abs(z)+.2*Math.sin(y*1.25+z*.9);
    const back=-1.35+.12*Math.sin(x*1.3+y*.8);
    let wall=Math.max(z-face,back-z,Math.abs(x)-side,y-top);
    for(const b of fragments) {
      const [cx,cy,cz]=b.center,[rx,ry,rz]=b.radii;
      const X=(x-cx)/rx,Y=(y-cy)/ry,Z=(z-cz)/rz;
      let fragment=-Infinity;
      for(const q of b.planes) fragment=Math.max(fragment,X*q[0]+Y*q[1]+Z*q[2]-q[3]);
      wall=smoothMin(wall,fragment*Math.min(rx,ry,rz),.12);
    }
    if(limestone) {
      // The cuts happen after joining the buttresses, so they remain visible
      // even where a buttress overlaps a chamber. CSG alters the exported mesh.
      for(const c of cavities) wall=smoothMax(wall,-solutionCavity(x,y,z,c),.12);
      for(const c of channels) wall=smoothMax(wall,-solutionCavity(x,y,z,c),.09);
    }
    return Math.max(wall,-y);
  }
  return {field,bounds:[[-4.8,-.15,-2.2],[4.8,5.2,2.8]]};
}

export function createFormation(options) {
  const rng = random(options.seed), cliff = options.type === 'cliff';
  const complexity = clamp(Number(options.complexity), 0, 1);
  const angularity = clamp(Number(options.angularity), 0, 1);
  const erosion = clamp(Number(options.erosion), 0, 1);
  const style = ['granite','basalt','limestone'].includes(options.rockType) ? options.rockType : 'granite';
  if(cliff) return createCliff(options,rng,complexity,angularity,erosion,style);
  const bodies=[];
  const add = (c,r) => bodies.push(body(rng,c,r,erosion,angularity,rng()*20));
  // Rock types use different proportions and fracture systems, not just colors.
  if(style==='basalt') {
    add([0,1.05,0],[1.45,1.65,1.25]);
    const n=4+Math.round(complexity*6);
    for(let i=0;i<n;i++) {
      const a=rng()*Math.PI*2,d=mix(.5,1.55,rng());
      add([Math.cos(a)*d,mix(.45,1.15,rng()),Math.sin(a)*d],
        [mix(.35,.7,rng()),mix(.8,1.55,rng()),mix(.35,.7,rng())]);
    }
  } else {
    const limestone=style==='limestone';
    add([0,1.05,0],limestone?[1.9,1.25,1.65]:[1.85,1.6,1.55]);
    const n=2+Math.round(complexity*5);
    for(let i=0;i<n;i++) {
      const a=rng()*Math.PI*2, d=mix(.45,1.55,rng());
      add([Math.cos(a)*d,mix(.45,1.35,rng()),Math.sin(a)*d],
        [mix(.55,1.35,rng()),mix(.55,limestone?1.0:1.4,rng()),mix(.55,1.2,rng())]);
    }
  }
  const cracks = Array.from({length: 3+Math.round(complexity*6)},()=>({
    a: rng()*Math.PI*2, tilt: (rng()-.5)*.7, offset: (rng()-.5)*3,
    y: mix(.3,2.7,rng()), z:(rng()-.5)*2, length:mix(.45,1.5,rng()), width:mix(.025,.075,rng()), depth:mix(.08,.25,rng())
  }));
  const pits=Array.from({length:style==='limestone'?7:0},(_,i)=>{
    const a=i*Math.PI*2/7+(rng()-.5)*.45, distance=mix(1.15,1.65,rng());
    return {x:Math.cos(a)*distance,y:mix(.6,1.9,rng()),z:Math.sin(a)*distance,
      rx:mix(.4,.7,rng()),ry:mix(.3,.6,rng()),rz:mix(.4,.7,rng()),slant:(rng()-.5)*.6,phase:rng()*10};
  });
  function field(x,y,z) {
    let d=1e6;
    for(const b of bodies) {
      const [cx,cy,cz]=b.center, [rx,ry,rz]=b.radii, p=b.phase;
      const w=b.roughness*(style==='limestone'?.28:.17);
      const X=(x-cx + w*(Math.sin(y*1.7+p)*Math.sin(z*1.15+p*.4)))/rx;
      const Y=(y-cy + w*(Math.sin(z*1.5+p)*Math.sin(x*1.2-p)))/ry;
      const Z=(z-cz + w*(Math.sin(x*1.4-p)*Math.sin(y*1.3+p)))/rz;
      let plane=-1e6;
      for(const q of b.planes) plane=Math.max(plane,(X*q[0]+Y*q[1]+Z*q[2]-q[3]));
      const bd=plane*Math.min(rx,ry,rz);
      d=smoothMin(d,bd,style==='limestone'?.5:mix(.38,.12,angularity));
    }
    for(const c of cracks) {
      const u=x*Math.cos(c.a)+z*Math.sin(c.a)+y*c.tilt-c.offset;
      const along=-x*Math.sin(c.a)+z*Math.cos(c.a)-c.z;
      const fade=Math.max(0,1-Math.sqrt((y-c.y)**2+along**2)/c.length);
      if(fade>0 && Math.abs(u)<c.width*2.5 && d<.12) d += c.depth*fade*Math.exp(-Math.abs(u)/c.width);
    }
    for(const p of pits) d=smoothMax(d,-solutionCavity(x,y,z,p),.08);
    return Math.max(d,-y);
  }
  return {field, bounds:[[-3.8,-.15,-3.6],[3.8,4.3,3.6]]};
}

// Marching tetrahedra works on a closed 3D field, including overhangs and
// undercuts. Edge vertices are shared so normals and exports are watertight.
export function meshFormation(options, onProgress=()=>{}) {
  const {field,bounds}=createFormation(options);
  const quality=clamp(Math.round(Number(options.resolution)||55),24,100);
  const size=bounds[1].map((v,i)=>v-bounds[0][i]);
  const step=Math.max(...size)/quality;
  const dims=size.map(v=>Math.ceil(v/step)+1);
  const [nx,ny,nz]=dims, total=nx*ny*nz;
  const values=new Float32Array(total);
  const id=(x,y,z)=>x+nx*(y+ny*z);
  for(let z=0;z<nz;z++) { for(let y=0;y<ny;y++) for(let x=0;x<nx;x++) values[id(x,y,z)]=field(bounds[0][0]+x*step,bounds[0][1]+y*step,bounds[0][2]+z*step); onProgress(z/nz*.45); }
  const positions=[], indices=[], edges=new Map();
  const offsets=[[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]];
  const tets=[[0,5,1,6],[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6]];
  function vertex(a,b) {
    const key=a.id<b.id ? a.id+','+b.id : b.id+','+a.id;
    if(edges.has(key)) return edges.get(key);
    const t=a.v/(a.v-b.v); const idx=positions.length/3;
    positions.push(mix(a.x,b.x,t),mix(a.y,b.y,t),mix(a.z,b.z,t)); edges.set(key,idx); return idx;
  }
  function tri(a,b,c,inside,outside) {
    const ax=positions[a*3],ay=positions[a*3+1],az=positions[a*3+2];
    const ux=positions[b*3]-ax,uy=positions[b*3+1]-ay,uz=positions[b*3+2]-az;
    const vx=positions[c*3]-ax,vy=positions[c*3+1]-ay,vz=positions[c*3+2]-az;
    const dot=(uy*vz-uz*vy)*(outside.x-inside.x)+(uz*vx-ux*vz)*(outside.y-inside.y)+(ux*vy-uy*vx)*(outside.z-inside.z);
    if(dot<0) indices.push(a,c,b); else indices.push(a,b,c);
  }
  for(let z=0;z<nz-1;z++) { for(let y=0;y<ny-1;y++) for(let x=0;x<nx-1;x++) {
    const c=offsets.map(o=>{const xx=x+o[0],yy=y+o[1],zz=z+o[2], i=id(xx,yy,zz);return {id:i,x:bounds[0][0]+xx*step,y:bounds[0][1]+yy*step,z:bounds[0][2]+zz*step,v:values[i]};});
    for(const tet of tets) {
      const ins=tet.map(i=>c[i]).filter(p=>p.v<0), out=tet.map(i=>c[i]).filter(p=>p.v>=0);
      if(!ins.length||!out.length) continue;
      if(ins.length===1) tri(vertex(ins[0],out[0]),vertex(ins[0],out[1]),vertex(ins[0],out[2]),ins[0],out[0]);
      else if(out.length===1) tri(vertex(out[0],ins[0]),vertex(out[0],ins[1]),vertex(out[0],ins[2]),ins[0],out[0]);
      else {
        const a=vertex(ins[0],out[0]),b=vertex(ins[0],out[1]),cc=vertex(ins[1],out[0]),dd=vertex(ins[1],out[1]);
        tri(a,b,cc,ins[0],out[0]); tri(b,dd,cc,ins[1],out[1]);
      }
    }
  } onProgress(.45+z/(nz-1)*.55); }
  return {positions:new Float32Array(positions),indices:new Uint32Array(indices)};
}

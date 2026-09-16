// Frontier - Own SDF terrain generator (rewritten, not copied)
// Implements hydraulic-ready terrain with strata, canyon carving, towers
export const SIZE = [112, 72, 112];
export const MIN = [-22, -4, -20];
export const MAX = [22, 22, 20];
export const CELL = [
  (MAX[0]-MIN[0])/SIZE[0],
  (MAX[1]-MIN[1])/SIZE[1],
  (MAX[2]-MIN[2])/SIZE[2],
];
export const BAND = 0.32;
export const defaults = {
  relief: 12,
  strata: 0.65,
  roughness: 0.48,
  canyonWidth: 6.1,
  canyonMeander: 1,
  canyonFlare: 0.105,
  seed: 4821,
  preset: 0,
  rainfall: 0.65,
  erosion: 0.62,
  hardness: 0.45,
  deposition: 0.35,
  capacity: 0.65,
  wind: 0.25,
  thermal: 0.35,
  speed: 1,
  waterLevel: 0.7,
  sun: 135,
  haze: 0.25,
  radius: 1.8,
  brushStrength: 0.45,
  particleCount: 1024,
  footprint: 1.2,
  grainSize: 0.25,
  restitution: 0.08,
  sourceMode: 0,
  showParticles: true,
  showSediment: true,
  agentDiameter: 5,
  riverSpeed: 3.2,
  riverWidth: 3.5,
  riverDepth: 0.6,
  riverOffset: 0,
  windSpeed: 6.5,
  windHeight: 7,
  windSpread: 2,
  windDirection: 0,
  chemicalRate: 0.45,
  solubility: 0.6,
  riverEnabled: true,
  waterEnabled: true,
  cameraSpeed: 8,
};

function hash(x,y,z,seed){
  let n = Math.imul(x,374761393) ^ Math.imul(y,668265263) ^ Math.imul(z,2147483647) ^ Math.imul(seed,1274126177);
  n = Math.imul(n ^ (n>>>13),1274126177);
  return ((n ^ (n>>>16))>>>0)/4294967295;
}
function smooth(t){ t=Math.max(0,Math.min(1,t)); return t*t*(3-2*t); }
function lerp(a,b,t){ return a+(b-a)*t; }
export function noise3(x,y,z,seed=0){
  const ix=Math.floor(x), iy=Math.floor(y), iz=Math.floor(z);
  const fx=x-ix, fy=y-iy, fz=z-iz;
  const u=smooth(fx), v=smooth(fy), w=smooth(fz);
  const h000=hash(ix,iy,iz,seed), h100=hash(ix+1,iy,iz,seed);
  const h010=hash(ix,iy+1,iz,seed), h110=hash(ix+1,iy+1,iz,seed);
  const h001=hash(ix,iy,iz+1,seed), h101=hash(ix+1,iy,iz+1,seed);
  const h011=hash(ix,iy+1,iz+1,seed), h111=hash(ix+1,iy+1,iz+1,seed);
  const x00=lerp(h000,h100,u), x10=lerp(h010,h110,u), x01=lerp(h001,h101,u), x11=lerp(h011,h111,u);
  const y0=lerp(x00,x10,v), y1=lerp(x01,x11,v);
  return lerp(y0,y1,w);
}
function fbm(x,y,z,seed,octaves=4, lac=2, gain=0.5){
  let v=0, amp=1, freq=1, sum=0;
  for(let i=0;i<octaves;i++){
    v+=noise3(x*freq,y*freq,z*freq,seed+i*19)*amp;
    sum+=amp;
    freq*=lac;
    amp*=gain;
  }
  return v/sum;
}
function boxSDF(px,py,pz, bx,by,bz, r=0){
  const qx=Math.abs(px)-bx, qy=Math.abs(py)-by, qz=Math.abs(pz)-bz;
  const ax=Math.max(qx,0), ay=Math.max(qy,0), az=Math.max(qz,0);
  return Math.hypot(ax,ay,az)+Math.min(Math.max(qx,qy,qz),0)-r;
}
function sphereSDF(px,py,pz, r){ return Math.hypot(px,py,pz)-r; }

function canyonCenter(z,p){
  return p.canyonMeander*(2.5*Math.sin(z*0.15)+Math.sin(z*0.36+1))*1.0 + (p.riverOffset||0);
}
function canyonHalfWidth(y,p, noiseVal){
  return p.canyonWidth + y*p.canyonFlare*2.2 + noiseVal*0.9;
}

export function baseSDF(x,y,z, params=defaults){
  const p=params;
  const s=p.seed|0;
  // Common noise
  const n1=fbm(x*0.18, y*0.09, z*0.18, s, 4, 2, 0.5);
  const n2=fbm(x*0.55, y*0.32, z*0.55, s+31, 3, 2, 0.5);
  const n3=fbm(x*0.85, y*0.07, z*0.85, s+45, 2, 2, 0.6);

  if(p.preset===3){
    // Land plot: flat box with noise
    const top = p.plotHeight ?? 2.5;
    const bottom = Math.min(p.plotBase ?? -2, top-0.8);
    const wx = 19, wz=17;
    let d = boxSDF(x, y-(top+bottom)*0.5, z, wx-0.3, (top-bottom)*0.5-0.3, wz-0.3, 0.3);
    d -= (p.plotNoiseAmount||0)*fbm(x*0.25,y*0.25,z*0.25,s,3,2,0.5);
    return Math.max(d, Math.abs(x)-21, Math.abs(z)-19, Math.abs(y-8)-12);
  }

  if(p.preset===2){
    // Monument valley: towers + ground
    let d=100;
    const towers=[
      [-9,-4, 3.8,3.6, 0.95],
      [7,1, 4.0,3.9, 1.0],
      [-3,8, 3.0,3.5, 0.78],
      [10,-9, 2.6,2.8, 0.82],
      [-12,8, 2.0,2.2, 0.62],
      [0,-10,2.2,2.4,0.55],
    ];
    const ground = boxSDF(x, y+2, z, 18, 3, 16, 1.2);
    d = ground;
    for(const [cx,cz,bx,bz,h] of towers){
      const top = p.relief*h;
      const taper = Math.max(0,y)*0.08;
      const tower = boxSDF(x-cx, y-top*0.5, z-cz, bx-taper, top*0.5-0.6, bz-taper, 0.7)
        + (n1-0.5)*p.roughness*2.2 + (n2-0.5)*0.6
        + p.strata*(0.12*Math.sin(y*3.5+ n1*0.8));
      d = Math.min(d, tower);
    }
    // Add some small hoodoos via noise
    const hoodooNoise = fbm(x*0.6,0,z*0.6,s+9,2,2,0.5);
    if(hoodooNoise>0.72){
      const hx = Math.round(x), hz=Math.round(z);
      const hd = sphereSDF(x-hx, y- (p.relief*0.3), z-hz, 1.2) + (n1-0.5)*0.5;
      d = Math.min(d, hd);
    }
    return d;
  }

  if(p.preset===1){
    // Badlands: ridges
    const ridge = 2.2*Math.abs(Math.sin(x*0.22 + z*0.18)) + 1.6*Math.abs(Math.sin(z*0.26 - x*0.11));
    const top = 2.5 + p.relief*(0.3+0.5*fbm(x*0.14,0,z*0.14,s,3,2,0.5)) - ridge;
    let d = Math.max(boxSDF(x,y-2,z,17,7,14,1.2), y-top);
    d += p.roughness*((n1-0.5)*3.2 + (n2-0.5)*1.0 + (n3-0.5)*1.2);
    d += p.strata*(0.14*Math.sin(y*3.5) + 0.22*Math.sin(y*1.7));
    // pockets
    const hollow = Math.hypot((x+6)*0.7,(y-2.2)*1.5,(z-1)*0.9)-2.4;
    d = Math.max(d, -hollow);
    return d;
  }

  // Desert canyon (default)
  // Ground box
  let ground = boxSDF(x, y-5, z, 15.5 - Math.max(y,0)*0.1, 10, 12.9 - Math.max(y,0)*0.055, 2.0);
  ground += (n1-0.5)*1.8;

  // Canyon carving via height reduction
  const center = canyonCenter(z,p);
  const halfW = canyonHalfWidth(y,p, fbm(0,y*0.4,z*0.5,s,2,2,0.5));
  const distToCenter = Math.abs(x-center);
  // Canyon as trench: if inside width, lower top
  // Compute top height before canyon
  let top = p.relief + 3.0*fbm(x*0.21,0,z*0.21,s+10,3,2,0.5) + 0.9*fbm(x*0.65,0,z*0.65,s,2,2,0.5);
  // Carve canyon: depth factor
  const canyonFactor = 1 - Math.min(1, Math.max(0, distToCenter / Math.max(0.5,halfW)));
  // smooth canyon profile
  const smoothFactor = canyonFactor*canyonFactor*(3-2*canyonFactor);
  top -= smoothFactor*(9 + 2.5*Math.sin(z*0.5) + 1.5*fbm(x*0.3,0,z*0.6,s+7,2,2,0.5));

  let d = Math.max(ground, y - top);

  // Strata layers affect SDF
  d += p.strata*(0.16*Math.sin(y*3.5+0.35*n1) + 0.22*Math.sin(y*1.7) + 0.1*Math.sin(y*8));
  d += p.roughness*((n1-0.5)*3.5 + (n2-0.5)*1.1 + (n3-0.5)*1.4);

  // Caves / alcoves for 3D
  const cave = Math.hypot((x+5.8)*0.7,(y-3.2)*1.2,(z-7)*0.6)-2.8;
  d = Math.max(d, -cave);
  const alcove = Math.hypot((x-5)*0.8,(y-5)*1.4,(z+5)*0.65)-2.0;
  d = Math.max(d, -alcove);

  // Thin sandstone bed
  const bed = boxSDF(x, y+0.9, z, 18.5, 0.45, 16.5, 1.0) + 0.14*fbm(x*0.8,0,z*0.8,s,2,2,0.5);
  d = Math.min(d, bed);

  return d;
}

export function generateVolume(params){
  const [nx,ny,nz]=SIZE;
  const arr=new Float32Array(nx*ny*nz*4);
  for(let z=0;z<nz;z++){
    for(let y=0;y<ny;y++){
      for(let x=0;x<nx;x++){
        const i=((z*ny+y)*nx+x)*4;
        const wx=MIN[0]+(x+0.5)*CELL[0];
        const wy=MIN[1]+(y+0.5)*CELL[1];
        const wz=MIN[2]+(z+0.5)*CELL[2];
        const d=baseSDF(wx,wy,wz,params);
        arr[i]=d;
        arr[i+1]=0; // moisture
        arr[i+2]=0; // sediment
        arr[i+3]=Math.max(0,Math.min(1,0.5 - d/(2*BAND)));
      }
    }
  }
  return arr;
}
export function sampleVolume(vol, pos){
  const q=[
    Math.max(0,Math.min(SIZE[0]-1.001,(pos[0]-MIN[0])/CELL[0]-0.5)),
    Math.max(0,Math.min(SIZE[1]-1.001,(pos[1]-MIN[1])/CELL[1]-0.5)),
    Math.max(0,Math.min(SIZE[2]-1.001,(pos[2]-MIN[2])/CELL[2]-0.5)),
  ];
  const lo=q.map(Math.floor), f=q.map((v,k)=>v-lo[k]);
  let v=0;
  for(let dz=0;dz<2;dz++)for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++){
    const idx=((lo[2]+dz)*SIZE[1]+lo[1]+dy)*SIZE[0]+lo[0]+dx;
    v+=vol[idx*4]* (dx?f[0]:1-f[0])*(dy?f[1]:1-f[1])*(dz?f[2]:1-f[2]);
  }
  const outside=Math.hypot(...pos.map((p,k)=>Math.max(MIN[k]-p, p-MAX[k],0)));
  return v+outside;
}
export function raycastVolume(vol, origin, dir){
  let near=0, far=150;
  for(let k=0;k<3;k++){
    if(Math.abs(dir[k])<1e-7){
      if(origin[k]<MIN[k]||origin[k]>MAX[k])return null;
      continue;
    }
    let t1=(MIN[k]-origin[k])/dir[k], t2=(MAX[k]-origin[k])/dir[k];
    near=Math.max(near,Math.min(t1,t2));
    far=Math.min(far,Math.max(t1,t2));
  }
  if(near>far)return null;
  let t=near;
  for(let i=0;i<240 && t<far;i++){
    const p=origin.map((v,k)=>v+dir[k]*t);
    const d=sampleVolume(vol,p);
    if(d<0.075)return p;
    t+=Math.max(0.04,d*0.6);
  }
  return null;
}

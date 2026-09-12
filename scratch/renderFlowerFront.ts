import { writeFileSync } from 'node:fs';
import { DesertMesher } from '../src/plant/desertMesher';
import { DESERT_PRESETS, DEFAULT_DESERT } from '../src/plant/desertParams';
import type { QuadMesh } from '../src/tree/mesh';

const W = 480, H = 480;
function render(mesh: QuadMesh, elevDeg: number): Uint8Array {
  const p = mesh.positions;
  const n = mesh.vertexCount;
  const elev = (elevDeg * Math.PI) / 180;
  const cy = Math.sin(elev), cz = Math.cos(elev);
  const fwd = { x: 0, y: -cy, z: -cz };
  const upWorld = { x: 0, y: 0, z: 1 };
  let rx = fwd.y*upWorld.z - fwd.z*upWorld.y, ry = fwd.z*upWorld.x - fwd.x*upWorld.z, rz = fwd.x*upWorld.y - fwd.y*upWorld.x;
  const rl = Math.hypot(rx,ry,rz)||1; rx/=rl; ry/=rl; rz/=rl;
  const ux = ry*fwd.z-rz*fwd.y, uy = rz*fwd.x-rx*fwd.z, uz = rx*fwd.y-ry*fwd.x;
  const px=new Float64Array(n), py=new Float64Array(n), pz=new Float64Array(n);
  let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
  for (let i=0;i<n;i++){
    const x=p[i*3],y=p[i*3+1],z=p[i*3+2];
    const sx=x*rx+y*ry+z*rz, sy=x*ux+y*uy+z*uz, sz=x*fwd.x+y*fwd.y+z*fwd.z;
    px[i]=sx; py[i]=sy; pz[i]=sz;
    if (y<-0.01) continue;
    if(sx<minX)minX=sx; if(sx>maxX)maxX=sx; if(sy<minY)minY=sy; if(sy>maxY)maxY=sy;
  }
  const spanX=Math.max(1e-6,maxX-minX), spanY=Math.max(1e-6,maxY-minY);
  const sc=Math.min((W-30)/spanX,(H-30)/spanY);
  const ox=(W-sc*spanX)/2-sc*minX, oy=(H-sc*spanY)/2+sc*maxY;
  const sx2=new Float64Array(n), sy2=new Float64Array(n);
  for(let i=0;i<n;i++){ sx2[i]=ox+sc*px[i]; sy2[i]=oy-sc*py[i]; }
  const img=new Uint8Array(W*H*3).fill(18);
  const zbuf=new Float64Array(W*H).fill(-Infinity);
  const lx=0.35, ly=0.6, lz=0.7;
  const cols=[[46,110,58],[74,148,74],[224,158,60]];
  const tri=(a:number,b:number,c:number,lvl:number):void=>{
    const ax=p[a*3],ay=p[a*3+1],az=p[a*3+2];
    const e1x=p[b*3]-ax,e1y=p[b*3+1]-ay,e1z=p[b*3+2]-az;
    const e2x=p[c*3]-ax,e2y=p[c*3+1]-ay,e2z=p[c*3+2]-az;
    const nx=e1y*e2z-e1z*e2y, ny=e1z*e2x-e1x*e2z, nz=e1x*e2y-e1y*e2x;
    const cnx=nx*rx+ny*ry+nz*rz, cny=nx*ux+ny*uy+nz*uz, cnz=nx*fwd.x+ny*fwd.y+nz*fwd.z;
    if (cnz<=0) return;
    const nl=Math.hypot(cnx,cny,cnz)||1;
    const shade=0.32+0.68*Math.max(0,(cnx*lx+cny*ly+cnz*lz)/nl);
    const base=cols[Math.min(2,lvl)]??cols[0];
    const R=Math.min(255,Math.round(base[0]*shade)), G=Math.min(255,Math.round(base[1]*shade)), B=Math.min(255,Math.round(base[2]*shade));
    const x0=sx2[a],y0=sy2[a],x1=sx2[b],y1=sy2[b],x2=sx2[c],y2=sy2[c];
    const minPx=Math.max(0,Math.floor(Math.min(x0,x1,x2))), maxPx=Math.min(W-1,Math.ceil(Math.max(x0,x1,x2)));
    const minPy=Math.max(0,Math.floor(Math.min(y0,y1,y2))), maxPy=Math.min(H-1,Math.ceil(Math.max(y0,y1,y2)));
    const d=(x1-x0)*(y2-y0)-(x2-x0)*(y1-y0);
    if (Math.abs(d)<1e-9) return;
    const z0=pz[a],z1=pz[b],z2=pz[c];
    for(let y=minPy;y<=maxPy;y++){
      for(let x=minPx;x<=maxPx;x++){
        const w1=((x-x0)*(y2-y0)-(y-y0)*(x2-x0))/d;
        const w2=((x1-x0)*(y-y0)-(y1-y0)*(x-x0))/d;
        const w0=1-w1-w2;
        if(w0<0||w1<0||w2<0) continue;
        const z=w0*z0+w1*z1+w2*z2;
        const k=y*W+x;
        if(z>zbuf[k]){ zbuf[k]=z; img[k*3]=R; img[k*3+1]=G; img[k*3+2]=B; }
      }
    }
  };
  const lv=mesh.levels;
  for(let f=0;f<mesh.quads.length;f+=4){
    const a=mesh.quads[f],b=mesh.quads[f+1],c=mesh.quads[f+2],d=mesh.quads[f+3];
    const l=lv[a]??0; tri(a,b,c,l); tri(a,c,d,l);
  }
  for(let f=0;f<mesh.tris.length;f+=3){ const a=mesh.tris[f]; tri(a,mesh.tris[f+1],mesh.tris[f+2],lv[a]??0); }
  const row=Math.ceil((W*3)/4)*4;
  const out=new Uint8Array(54+row*H);
  const dv=new DataView(out.buffer);
  out[0]=0x42; out[1]=0x4d;
  dv.setUint32(2,out.length,true); dv.setUint32(10,54,true); dv.setUint32(14,40,true);
  dv.setInt32(18,W,true); dv.setInt32(22,H,true); dv.setUint16(26,1,true); dv.setUint16(28,24,true);
  for(let y=0;y<H;y++){
    const src=(H-1-y)*W*3;
    for(let x=0;x<W;x++){
      out[54+y*row+x*3]=img[src+x*3+2]; out[54+y*row+x*3+1]=img[src+x*3+1]; out[54+y*row+x*3+2]=img[src+x*3];
    }
  }
  return out;
}

const preset = DESERT_PRESETS.find((p) => p.name === 'Golden Barrel')!;
const g = { ...DEFAULT_DESERT, ...preset.desert };
const built = new DesertMesher(g, 1).build();
writeFileSync('renders/golden_barrel_flowers_front.bmp', render(built.mesh, 18));
console.log('done');

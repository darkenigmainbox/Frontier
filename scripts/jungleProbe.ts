/**
 * Close-up single-organ probe for jungle plants: builds one frond/leaflet in
 * isolation (bypassing the trunk) and rasterises a zoomed-in view so leaflet
 * / blade shape defects are visible without the whole plant's silhouette
 * hiding them.
 *
 * Usage: npx vite-node scripts/jungleProbe.ts <preset-name-substring>
 */
// @ts-ignore
import { writeFileSync, mkdirSync } from 'node:fs';
import { JUNGLE_PRESETS, DEFAULT_JUNGLE } from '../src/plant/jungleParams';
import { QuadMesh } from '../src/tree/mesh';

const filter = ((globalThis as any).process.argv[2] ?? 'coconut').toLowerCase();
const preset = JUNGLE_PRESETS.find((p) => p.name.toLowerCase().includes(filter)) ?? JUNGLE_PRESETS[0];
const g = { ...DEFAULT_JUNGLE, ...preset.jungle };
console.log('Probing', preset.name);

// Reach into the private makeFrond/makeCompoundFrond via a minimal harness:
// build a full plant then re-render just its highest quad-index region near
// one frond tip isn't trivial without internals, so instead we import the
// mesher module and monkeypatch a tiny standalone trunk of height ~0 with a
// single frond by temporarily overriding fronds=1 and a tiny attach band.
import { JungleMesher } from '../src/plant/jungleMesher';
const solo = { ...g, fronds: 1, frondFrom: 0.5, frondTo: 0.5, trunkHeight: Math.max(0.1, g.trunkHeight * 0.15), fruitCluster: false, flower: false };
const built = new JungleMesher(solo, 3).build();
console.log('organs', built.stats.organs, 'dropped', built.stats.dropped, built.stats.dropReasons);

const W = 900, H = 900;
function render(mesh: QuadMesh, camAz: number, focusY0: number, focusY1: number): Uint8Array {
  const p = mesh.positions;
  const n = mesh.vertexCount;
  const ca = Math.cos(camAz), sa = Math.sin(camAz);
  const px = new Float64Array(n), py = new Float64Array(n), pz = new Float64Array(n);
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < n; i++) {
    const x = p[i*3], y = p[i*3+1], z = p[i*3+2];
    if (y < focusY0 || y > focusY1) { px[i]=1e9; py[i]=1e9; pz[i]=-1e9; continue; }
    const rx = x*ca - z*sa, rz = x*sa + z*ca;
    px[i]=rx; py[i]=y; pz[i]=rz;
    if (rx<minX) minX=rx; if (rx>maxX) maxX=rx;
    if (y<minY) minY=y; if (y>maxY) maxY=y;
  }
  if (!isFinite(minX)) { minX=-1; maxX=1; minY=0; maxY=1; }
  const spanX = Math.max(1e-6, maxX-minX), spanY = Math.max(1e-6, maxY-minY);
  const sc = Math.min((W-40)/spanX, (H-40)/spanY);
  const ox = (W - sc*spanX)/2 - sc*minX;
  const oy = (H + sc*spanY)/2 + sc*minY;
  const sx = new Float64Array(n), sy = new Float64Array(n);
  for (let i=0;i<n;i++){ sx[i]=ox+sc*px[i]; sy[i]=oy-sc*py[i]; }
  const img = new Uint8Array(W*H*3).fill(20);
  const zbuf = new Float64Array(W*H).fill(-Infinity);
  const lx=0.4, ly=0.8, lz=0.5;
  const cols = [[120,96,64],[60,140,64],[200,170,220],[150,110,60]];
  const accent = mesh.accent;
  const tri = (a:number,b:number,c:number)=>{
    if (px[a]>1e8||px[b]>1e8||px[c]>1e8) return;
    const ax=p[a*3],ay=p[a*3+1],az=p[a*3+2];
    const e1x=p[b*3]-ax,e1y=p[b*3+1]-ay,e1z=p[b*3+2]-az;
    const e2x=p[c*3]-ax,e2y=p[c*3+1]-ay,e2z=p[c*3+2]-az;
    let nx=e1y*e2z-e1z*e2y, ny=e1z*e2x-e1x*e2z, nz=e1x*e2y-e1y*e2x;
    const cnx=nx*ca-nz*sa, cnz=nx*sa+nz*ca, cny=ny;
    if (cnz<=0) return;
    const nl=Math.hypot(cnx,cny,cnz)||1;
    const shade=0.32+0.68*Math.max(0,(cnx*lx+cny*ly+cnz*lz)/nl);
    const ai=accent[a]??0;
    const base=cols[ai]??cols[0];
    const R=Math.min(255,Math.round(base[0]*shade)), G=Math.min(255,Math.round(base[1]*shade)), B=Math.min(255,Math.round(base[2]*shade));
    const x0=sx[a],y0=sy[a],x1=sx[b],y1=sy[b],x2=sx[c],y2=sy[c];
    const minPx=Math.max(0,Math.floor(Math.min(x0,x1,x2))), maxPx=Math.min(W-1,Math.ceil(Math.max(x0,x1,x2)));
    const minPy=Math.max(0,Math.floor(Math.min(y0,y1,y2))), maxPy=Math.min(H-1,Math.ceil(Math.max(y0,y1,y2)));
    const d=(x1-x0)*(y2-y0)-(x2-x0)*(y1-y0);
    if (Math.abs(d)<1e-9) return;
    const z0=pz[a],z1=pz[b],z2=pz[c];
    for (let y=minPy;y<=maxPy;y++) for (let x=minPx;x<=maxPx;x++) {
      const w1=((x-x0)*(y2-y0)-(y-y0)*(x2-x0))/d, w2=((x1-x0)*(y-y0)-(y1-y0)*(x-x0))/d, w0=1-w1-w2;
      if (w0<0||w1<0||w2<0) continue;
      const z=w0*z0+w1*z1+w2*z2;
      const k=y*W+x;
      if (z>zbuf[k]) { zbuf[k]=z; img[k*3]=R; img[k*3+1]=G; img[k*3+2]=B; }
    }
  };
  for (let f=0; f<mesh.quads.length; f+=4) {
    const a=mesh.quads[f],b=mesh.quads[f+1],c=mesh.quads[f+2],d=mesh.quads[f+3];
    tri(a,b,c); tri(a,c,d);
  }
  for (let f=0; f<mesh.tris.length; f+=3) tri(mesh.tris[f],mesh.tris[f+1],mesh.tris[f+2]);
  const row=Math.ceil((W*3)/4)*4;
  const out=new Uint8Array(54+row*H);
  const dv=new DataView(out.buffer);
  out[0]=0x42; out[1]=0x4d;
  dv.setUint32(2,out.length,true); dv.setUint32(10,54,true); dv.setUint32(14,40,true);
  dv.setInt32(18,W,true); dv.setInt32(22,H,true); dv.setUint16(26,1,true); dv.setUint16(28,24,true);
  for (let y=0;y<H;y++){ const src=(H-1-y)*W*3; for (let x=0;x<W;x++){ out[54+y*row+x*3]=img[src+x*3+2]; out[54+y*row+x*3+1]=img[src+x*3+1]; out[54+y*row+x*3+2]=img[src+x*3]; } }
  return out;
}

// Find the vertical extent so we can frame the crown (top region) tightly.
let maxY = 0;
for (let i = 1; i < built.mesh.positions.length; i += 3) if (built.mesh.positions[i] > maxY) maxY = built.mesh.positions[i];
mkdirSync('renders', { recursive: true });
const focusLo = maxY * 0.55;
for (const [label, az] of [['front', 0], ['side', Math.PI*0.5], ['s1', Math.PI*0.28]] as [string, number][]) {
  const buf = render(built.mesh, az, focusLo, maxY + 0.1);
  writeFileSync(`renders/probe_${preset.name.toLowerCase().replace(/[^a-z0-9]+/g,'_')}_${label}.bmp`, buf);
}
console.log('done, maxY=', maxY.toFixed(3));

export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const lerp=(a,b,t)=>a+(b-a)*t;
export const lerp2=(a,b,t)=>({x:lerp(a.x,b.x,t), y:lerp(a.y,b.y,t)});
export const dist=(a,b)=>Math.hypot(a.x-b.x, a.y-b.y);
export const dist2=(a,b)=> (a.x-b.x)*(a.x-b.x)+(a.y-b.y)*(a.y-b.y);
export function catmullRom(p0,p1,p2,p3,t){
  const t2=t*t, t3=t2*t;
  const x=0.5*((2*p1.x)+(-p0.x+p2.x)*t+(2*p0.x-5*p1.x+4*p2.x-p3.x)*t2+(-p0.x+3*p1.x-3*p2.x+p3.x)*t3);
  const y=0.5*((2*p1.y)+(-p0.y+p2.y)*t+(2*p0.y-5*p1.y+4*p2.y-p3.y)*t2+(-p0.y+3*p1.y-3*p2.y+p3.y)*t3);
  return {x,y};
}
export function bezierQuad(p0,p1,p2,t){
  const it=1-t;
  return {x: it*it*p0.x + 2*it*t*p1.x + t*t*p2.x, y: it*it*p0.y + 2*it*t*p1.y + t*t*p2.y};
}
export function bezierCubic(p0,p1,p2,p3,t){
  const it=1-t;
  return {x: it*it*it*p0.x + 3*it*it*t*p1.x + 3*it*t*t*p2.x + t*t*t*p3.x,
          y: it*it*it*p0.y + 3*it*it*t*p1.y + 3*it*t*t*p2.y + t*t*t*p3.y};
}
export function polylineLength(pts){
  let l=0; for(let i=1;i<pts.length;i++) l+=dist(pts[i-1],pts[i]); return l;
}
export function resamplePolyline(pts, step){
  if(pts.length<2) return pts.slice();
  const out=[pts[0]];
  let acc=0;
  for(let i=1;i<pts.length;i++){
    const a=pts[i-1], b=pts[i];
    const d=dist(a,b);
    acc+=d;
    // simple: add points; if want uniform, interpolate
    out.push(b);
  }
  return out;
}
export function getPolylineAt(pts, t){ // t 0..1 by length
  if(t<=0) return pts[0];
  if(t>=1) return pts[pts.length-1];
  const total=polylineLength(pts);
  const target=total*t;
  let cur=0;
  for(let i=1;i<pts.length;i++){
    const d=dist(pts[i-1], pts[i]);
    if(cur+d >= target){
      const lt=(target-cur)/Math.max(1e-9,d);
      return lerp2(pts[i-1], pts[i], lt);
    }
    cur+=d;
  }
  return pts[pts.length-1];
}
export function getTangent(pts, t){
  const eps=0.001;
  const a=getPolylineAt(pts, clamp(t-eps,0,1));
  const b=getPolylineAt(pts, clamp(t+eps,0,1));
  const dx=b.x-a.x, dy=b.y-a.y;
  const len=Math.hypot(dx,dy)||1;
  return {x:dx/len, y:dy/len};
}
export function getNormal(tangent){ return {x:-tangent.y, y:tangent.x}; }

// Simple deterministic pseudo-noise for terrain
export function hash2(x,y){
  let n = x*374761393 + y*668265263;
  n = (n ^ (n >> 13)) * 1274126177;
  return ((n ^ (n >> 16)) & 0xffffffff) / 0xffffffff;
}
export function smoothNoise(x,y){
  const xi=Math.floor(x), yi=Math.floor(y);
  const xf=x-xi, yf=y-yi;
  const u= xf*xf*(3-2*xf), v= yf*yf*(3-2*yf);
  const n00=hash2(xi,yi), n10=hash2(xi+1,yi), n01=hash2(xi,yi+1), n11=hash2(xi+1,yi+1);
  const nx0= lerp(n00,n10,u), nx1= lerp(n01,n11,u);
  return lerp(nx0,nx1,v);
}
export function fbm(x,y, oct=4){
  let v=0, a=1, f=1, max=0;
  for(let i=0;i<oct;i++){ v+= smoothNoise(x*f, y*f)*a; max+=a; a*=0.5; f*=2; }
  return v/max;
}

import { dist } from './math.js';
export function segIntersect(a,b,c,d){
  // return intersection point or null
  const denom = (a.x-b.x)*(c.y-d.y) - (a.y-b.y)*(c.x-d.x);
  if(Math.abs(denom) < 1e-9) return null;
  const t = ((a.x-c.x)*(c.y-d.y) - (a.y-c.y)*(c.x-d.x))/denom;
  const u = -((a.x-b.x)*(a.y-c.y) - (a.y-b.y)*(a.x-c.x))/denom;
  if(t>=0 && t<=1 && u>=0 && u<=1){
    return { x: a.x + t*(b.x-a.x), y: a.y + t*(b.y-a.y), tA: t, tB: u };
  }
  return null;
}
export function pointToSegmentDist(p,a,b){
  const l2 = (b.x-a.x)*(b.x-a.x)+(b.y-a.y)*(b.y-a.y);
  if(l2===0) return Math.hypot(p.x-a.x,p.y-a.y);
  let t = ((p.x-a.x)*(b.x-a.x)+(p.y-a.y)*(b.y-a.y))/l2;
  t=Math.max(0,Math.min(1,t));
  const proj={x:a.x+t*(b.x-a.x), y:a.y+t*(b.y-a.y)};
  return Math.hypot(p.x-proj.x,p.y-proj.y);
}
export function expandPolyline(pts, width){
  // not used for final quad topology, but helper
  return pts;
}
export function polyOffsetLine(pts, offset){
  // offset polyline to left side (normal). For road edges
  // Compute miter joins
  const out=[];
  for(let i=0;i<pts.length;i++){
    const prev=pts[i-1], cur=pts[i], next=pts[i+1];
    let n={x:0,y:0};
    if(!prev){
      const t={x:next.x-cur.x, y:next.y-cur.y}; const len=Math.hypot(t.x,t.y)||1;
      n={x:-t.y/len, y:t.x/len};
    } else if(!next){
      const t={x:cur.x-prev.x, y:cur.y-prev.y}; const len=Math.hypot(t.x,t.y)||1;
      n={x:-t.y/len, y:t.x/len};
    } else {
      const t1={x:cur.x-prev.x, y:cur.y-prev.y}; const l1=Math.hypot(t1.x,t1.y)||1;
      const n1={x:-t1.y/l1, y:t1.x/l1};
      const t2={x:next.x-cur.x, y:next.y-cur.y}; const l2=Math.hypot(t2.x,t2.y)||1;
      const n2={x:-t2.y/l2, y:t2.x/l2};
      n={x:(n1.x+n2.x)*0.5, y:(n1.y+n2.y)*0.5};
      const len=Math.hypot(n.x,n.y)||1; n.x/=len; n.y/=len;
      // miter scale
      const dot = n1.x*n2.x + n1.y*n2.y;
      const miter = 1/Math.max(0.35, Math.sqrt((1+dot)*0.5));
      n.x*=miter; n.y*=miter;
    }
    out.push({x:cur.x + n.x*offset, y:cur.y + n.y*offset});
  }
  return out;
}
export function earClipPolygon(polygon){
  // polygon: [{x,y}] CCW, returns indices triplets
  // Simple ear clipping for convex/concave polygons with no holes
  const n=polygon.length;
  if(n<3) return [];
  const idx=[...Array(n).keys()];
  const tris=[];
  const isConvex=(a,b,c)=> (b.x-a.x)*(c.y-a.y) - (b.y-a.y)*(c.x-a.x) >=0;
  const pointInTri=(p,a,b,c)=>{
    const s = (a.y-c.y)*(p.x-c.x) + (c.x-a.x)*(p.y-c.y);
    const t = (c.y-b.y)*(p.x-c.x) + (b.x-c.x)*(p.y-c.y);
    const u = 1 - s - t; // barycentric via area signs not accurate; use winding
    // Use sign method
    const d1 = (p.x - a.x)*(a.y - b.y) - (a.x - b.x)*(p.y - a.y);
    return false;
  };
  const inTriangle=(p,a,b,c)=>{
    const d1=(p.x - c.x)*(a.y - c.y) - (a.x - c.x)*(p.y - c.y);
    const d2=(p.x - a.x)*(b.y - a.y) - (b.x - a.x)*(p.y - a.y);
    const d3=(p.x - b.x)*(c.y - b.y) - (b.x - c.x)*(p.y - b.y);
    const hasNeg=(d1<0)||(d2<0)||(d3<0);
    const hasPos=(d1>0)||(d2>0)||(d3>0);
    return !(hasNeg && hasPos);
  };
  let guard=0;
  while(idx.length>3 && guard<200){
    guard++;
    let earFound=false;
    for(let i=0;i<idx.length;i++){
      const i0=idx[(i-1+idx.length)%idx.length], i1=idx[i], i2=idx[(i+1)%idx.length];
      const a=polygon[i0], b=polygon[i1], c=polygon[i2];
      if(!isConvex(a,b,c)) continue;
      let contains=false;
      for(let j=0;j<idx.length;j++){
        const k=idx[j];
        if(k===i0||k===i1||k===i2) continue;
        if(inTriangle(polygon[k],a,b,c)){ contains=true; break; }
      }
      if(contains) continue;
      tris.push([i0,i1,i2]);
      idx.splice(i,1);
      earFound=true; break;
    }
    if(!earFound) break;
  }
  if(idx.length===3) tris.push([idx[0],idx[1],idx[2]]);
  return tris;
}

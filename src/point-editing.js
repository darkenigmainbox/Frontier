// Distances and constraints use physical millimeters, not the unequal
// normalized width/pitch axes. Polygon edges close; sipe polylines do not.
export function nearestEdge(shape, point, {w,p}, maxDistance=Infinity) {
  let best=null;
  const inspect=(line,sipe)=>{
    const count=sipe===null?line.length:line.length-1;
    for(let i=0;i<count;i++){
      const a=line[i],b=line[(i+1)%line.length];
      const dx=(b[0]-a[0])*w,dy=(b[1]-a[1])*p,length2=dx*dx+dy*dy;
      if(length2<1e-12)continue;
      const t=Math.max(0,Math.min(1,((point[0]-a[0])*w*dx+(point[1]-a[1])*p*dy)/length2));
      // Never insert a duplicate endpoint (including a near-endpoint click).
      if(t*Math.sqrt(length2)<.001||(1-t)*Math.sqrt(length2)<.001)continue;
      const projected=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
      const distance=Math.hypot((projected[0]-point[0])*w,(projected[1]-point[1])*p);
      if(distance<=maxDistance&&(!best||distance<best.distance))best={sipe,index:i+1,point:projected,distance};
    }
  };
  inspect(shape.points,null);shape.sipes.forEach(inspect);
  return best;
}
export function constrainPoint(point, start, {w,p}) {
  return Math.abs((point[0]-start[0])*w)>=Math.abs((point[1]-start[1])*p)
    ? [point[0],start[1]] : [start[0],point[1]];
}
export function midpointInsertion(line,index,closed) {
  // At the last point of a cut line, split the last real segment; don't
  // invent a closing segment from the final endpoint back to the first.
  const edge=closed?index:Math.min(index,line.length-2);
  const a=line[edge],b=line[(edge+1)%line.length];
  return {index:edge+1,point:[(a[0]+b[0])/2,(a[1]+b[1])/2]};
}

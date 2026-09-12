const R=0.32;
function radiusOld(t:number){
  const r = R*Math.pow(Math.sin(Math.PI*(0.1+0.8*t)),0.75);
  return Math.max(0.28*R, r);
}
function radiusNew(t:number){
  let r = R*Math.pow(Math.sin(Math.PI*(0.1+0.8*t)),0.75);
  // extra dome taper very near the tip so the crown rounds off instead of staying flat
  if (t>0.88) {
    const u = (t-0.88)/0.12;
    r *= Math.cos(u*Math.PI*0.5*0.85);
  }
  return Math.max(0.06*R, r);
}
for (let t=0.7;t<=1;t+=0.02) console.log(t.toFixed(2), radiusOld(t).toFixed(4), radiusNew(t).toFixed(4));

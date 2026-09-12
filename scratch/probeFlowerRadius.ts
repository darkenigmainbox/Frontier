const R=0.32, H=0.6;
const depth = Math.max(0.05, 0.35*R);
const sink = 0.05;
const sGround = sink+depth;
const L = H+sGround;
function radius(s:number){
  if (s<sGround) return R*(0.3+0.25*(s/sGround));
  const t = Math.max(0,Math.min(1,(s-sGround)/H));
  let r = R*Math.pow(Math.sin(Math.PI*(0.1+0.8*t)),0.75);
  if (t>0.86) {
    const u = Math.max(0,Math.min(1,(t-0.86)/0.14));
    r *= Math.cos(u*Math.PI*0.5*0.82);
  }
  return Math.max(0.05*R, r);
}
const domeLen=0.12*H;
const sF = L - 0.32*domeLen;
console.log('sF', sF, 'L', L, 't', (sF-sGround)/H, 'radius', radius(sF));

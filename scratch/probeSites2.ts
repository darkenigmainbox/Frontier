const g: any = { crownRadius: 0.014, leafSides: 12, leaves: 68, stalk: false };
const R = Math.max(0.02, g.crownRadius);
function windowFor(N:number){ switch(N){case 4:return{w:1,h:1};case 6:return{w:1,h:2};case 8:return{w:2,h:2};case 10:return{w:2,h:3};default:return{w:3,h:3};} }
const leafN = Math.max(8, Math.min(16, Math.round(g.leafSides/2)*2));
const lw = windowFor(leafN);
const pitch = Math.max(lw.w, lw.h) + 1;
const leaves = Math.max(1, Math.round(g.leaves));
const need = leaves + (g.stalk?4:0);
const S = Math.max(3, Math.ceil(Math.sqrt((Math.max(1,need)*1.18)/0.7)));
const K = S*pitch+2;
console.log({leafN, lw, pitch, S, K});
// approximate free sites: fraction inside circle radius 0.955 of S*S grid
let free=0;
for (let i=0;i<S;i++) for (let k=0;k<S;k++) {
  const u = ( (1+i*pitch+pitch/2) / K )*2-1;
  const v = ( (1+k*pitch+pitch/2) / K )*2-1;
  const x = u*Math.sqrt(Math.max(0,1-(v*v)/2));
  const z = v*Math.sqrt(Math.max(0,1-(u*u)/2));
  const r = Math.min(1, Math.sqrt(x*x+z*z));
  if (r<=0.955) free++;
}
console.log('free', free, 'leaves', leaves);

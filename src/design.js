import { PATTERNS, PATTERN_REVISION, patternBlocks } from './patterns.js';

export const MIRRORS = ['none', 'width', 'travel', 'point', 'both'];
export const clone = value => structuredClone(value);
export const uid = () => `shape-${crypto.randomUUID()}`;
export const escapeHTML = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const blankDesign = () => ({ version:1, name:'Untitled tread', preset:'rugged', modified:true, shapes:[] });
const pointKey = points => points.map(p=>p.map(v=>v.toFixed(7)).join(',')).sort().join(';');
const signature = b => JSON.stringify([pointKey(b.points), b.sipes.map(pointKey).sort(),b.role,b.heightRatio,!!b.continuous]);
const mean = (points,k) => points.reduce((s,p)=>s+p[k],0)/points.length;
export const defaultMirror = () => ({mode:'none',axisX:0,axisY:.5,stagger:0});

export function transformBlock(block, fn) {
  return {...block,points:block.points.map(fn),sipes:block.sipes.map(line=>line.map(fn))};
}

// Mirroring applies to the complete feature: outline AND every sipe.
// Axes are in normalized width / pitch coordinates. Stagger affects copies only.
export function expandShape(shape) {
  const {mode,axisX,axisY,stagger}=shape.mirror;
  const transforms=[['source',([x,y])=>[x,y]]];
  if(mode==='width'||mode==='both')transforms.push(['width',([x,y])=>[2*axisX-x,y+stagger]]);
  if(mode==='travel'||mode==='both')transforms.push(['travel',([x,y])=>[x,2*axisY-y+stagger]]);
  if(mode==='point'||mode==='both')transforms.push(['point',([x,y])=>[2*axisX-x,2*axisY-y+stagger]]);
  const seen=new Set();
  return transforms.map(([instance,fn])=>({...transformBlock(shape,fn),instance,sourceId:shape.id})).filter(b=>{
    const key=signature(b);if(seen.has(key))return false;seen.add(key);return true;
  });
}
export function designBlocks(design, parity=0) {
  return design.shapes.filter(s=>s.enabled && (s.phase==='both'||Number(s.phase)===parity%2)).flatMap(expandShape);
}

export function designFromPreset(id) {
  const preset=PATTERNS.find(p=>p.id===id);if(!preset)throw new Error('Unknown preset');
  const shapes=[];
  for(const parity of [0,1])for(const b of patternBlocks(id,parity)){
    const match=shapes.find(s=>s.phase==='0' && parity===1 && signature(s)===signature(b));
    if(match){match.phase='both';continue;}
    shapes.push({...clone(b),id:`shape-${shapes.length+1}`,name:`${b.family||b.role} ${shapes.length+1}`,phase:String(parity),enabled:true,mirror:defaultMirror()});
  }
  // Recover exact paired geometry, rather than making independent left/right edits.
  for(let i=0;i<shapes.length;i++){
    const a=shapes[i];
    for(let j=i+1;j<shapes.length;j++){
      const b=shapes[j];if(a.phase!==b.phase||a.points.length!==b.points.length)continue;
      const axisX=(mean(a.points,0)+mean(b.points,0))/2;
      if(Math.abs(axisX)>.000001)continue;
      const candidates=[
        {mode:'point',axisX:0,axisY:(mean(a.points,1)+mean(b.points,1))/2,stagger:0},
        {mode:'width',axisX:0,axisY:.5,stagger:mean(b.points,1)-mean(a.points,1)},
      ];
      const mirror=candidates.find(m=>expandShape({...a,mirror:m}).some(s=>s.instance!=='source'&&signature(s)===signature(b)));
      if(mirror){a.mirror=mirror;shapes.splice(j,1);break;}
    }
  }
  return {version:1,presetRevision:PATTERN_REVISION,name:preset.name,preset:id,modified:false,shapes};
}

export function newShape(kind='block') {
  const points=kind==='chevron'?[[-.22,.15],[-.07,.05],[.08,.35],[-.07,.65],[-.22,.55],[-.07,.35]]:
    kind==='triangle'?[[-.22,.10],[-.03,.35],[-.22,.65]]:[[-.24,.10],[-.07,.10],[-.07,.70],[-.24,.70]];
  return {id:uid(),name:kind==='ejector'?'Ejector':'New '+kind,points,sipes:[],role:kind==='ejector'?'ejector':'lug',heightRatio:kind==='ejector'?.24:1,enabled:true,phase:'both',mirror:defaultMirror()};
}
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
const between=(a,b,p)=>Math.abs(cross(a,b,p))<1e-10&&p[0]>=Math.min(a[0],b[0])-1e-10&&p[0]<=Math.max(a[0],b[0])+1e-10&&p[1]>=Math.min(a[1],b[1])-1e-10&&p[1]<=Math.max(a[1],b[1])+1e-10;
export function validPolygon(points) {
  const area=points.reduce((s,p,i)=>{const q=points[(i+1)%points.length];return s+p[0]*q[1]-p[1]*q[0]},0);
  if(Math.abs(area)<1e-9)return false;
  for(let i=0;i<points.length;i++){
    const a=points[i],b=points[(i+1)%points.length];
    if(Math.hypot(a[0]-b[0],a[1]-b[1])<1e-8)return false;
    for(let j=i+2;j<points.length;j++){
      if(i===0&&j===points.length-1)continue;
      const c=points[j],d=points[(j+1)%points.length];
      if((cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0)||between(a,b,c)||between(a,b,d)||between(c,d,a)||between(c,d,b))return false;
    }
  }
  return true;
}
export function validateDesign(design,{geometry=false}={}) {
  if(!design||design.version!==1||typeof design.name!=='string'||design.name.length>100||!Array.isArray(design.shapes)||!PATTERNS.some(p=>p.id===design.preset))throw new Error('Invalid version-1 tread project');
  const ids=new Set();
  const point=p=>Array.isArray(p)&&p.length===2&&p.every(v=>Number.isFinite(v)&&Math.abs(v)<=100);
  for(const s of design.shapes){
    if(typeof s.id!=='string'||!/^[-\w]{1,80}$/.test(s.id)||ids.has(s.id)||typeof s.name!=='string'||s.name.length>100)throw new Error('Invalid or duplicate shape ID / name');ids.add(s.id);
    if(!Array.isArray(s.points)||s.points.length<3||!s.points.every(point)||!Array.isArray(s.sipes)||!s.sipes.every(l=>Array.isArray(l)&&l.length>=2&&l.every(point)))throw new Error(`Invalid points in ${s.name}`);
    if(!['both','0','1'].includes(s.phase)||typeof s.enabled!=='boolean'||!['lug','shoulder','rib','ejector'].includes(s.role)||!Number.isFinite(s.heightRatio)||s.heightRatio<.05||s.heightRatio>1)throw new Error(`Invalid shape settings: ${s.name}`);
    if(!s.mirror||!MIRRORS.includes(s.mirror.mode)||!['axisX','axisY','stagger'].every(k=>Number.isFinite(s.mirror[k])&&Math.abs(s.mirror[k])<=100))throw new Error('Invalid mirror settings');
    if(geometry&&s.enabled&&!validPolygon(s.points))throw new Error(`${s.name}: outline crosses itself or has duplicate/collinear vertices. Edit or undo to repair.`);
  }
  return design;
}
export function designSVG(design,settings,{repeats=2}={}) {
  const w=settings.width,pitch=2*Math.PI*settings.radius/settings.repeats;
  const profile=PATTERNS.find(p=>p.id===design.preset);
  const sipeWidth=profile.sipeWidth*w/profile.width;
  const path=points=>points.map(([x,y],i)=>`${i?'L':'M'}${x*w+w/2},${y*pitch}`).join(' ');
  let content='';
  for(let i=-2;i<repeats+2;i++)for(const b of designBlocks(design,(i%2+2)%2)){
    const shifted=transformBlock(b,([x,y])=>[x,y+i]);
    content+=`<path d="${path(shifted.points)}Z" fill="${b.role==='ejector'?'#586574':'#c3ccd4'}"/>`;
    for(const line of shifted.sipes)content+=`<path d="${path(line)}" fill="none" stroke="#11151a" stroke-width="${sipeWidth}"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${repeats*pitch}"><title>${escapeHTML(design.name)} — construction outlines, millimeters</title>${content}</svg>`;
}

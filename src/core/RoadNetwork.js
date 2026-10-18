import { ROAD_PRESETS, getPreset } from './RoadTypes.js';
import { clamp, fbm } from '../utils/math.js';

// Event emitter simplified
class Emitter{
  constructor(){ this.map=new Map(); }
  on(e,fn){ if(!this.map.has(e)) this.map.set(e,[]); this.map.get(e).push(fn); return ()=>this.off(e,fn); }
  off(e,fn){ const a=this.map.get(e); if(a){ const i=a.indexOf(fn); if(i>=0) a.splice(i,1);} }
  emit(e,p){ (this.map.get(e)||[]).forEach(fn=>fn(p)); }
}

let _gid=1; const gid=()=>String(_gid++);
export function makeId(){ return gid(); }

export class RoadNetwork extends Emitter{
  constructor(){
    super();
    this.nodes = new Map(); // id -> {id,x,y,z, type, connections}
    this.segments = new Map(); // id -> {id,a,b, type, points, width, ...}
    this.rails = new Map(); // monorail/train
    this.history=[]; this.future=[];
    this.selection = { type:null, id:null };
    this.terrainSeed = Math.floor(Math.random()*9999);
    this.waterBodies = []; // {polygon, type}
  }
  snapshot(){
    return JSON.stringify({
      nodes: [...this.nodes.entries()],
      segments: [...this.segments.entries()],
      rails: [...this.rails.entries()],
      waterBodies: this.waterBodies
    });
  }
  restore(str){
    const o=JSON.parse(str);
    this.nodes = new Map(o.nodes);
    this.segments = new Map(o.segments);
    this.rails = new Map(o.rails||[]);
    this.waterBodies = o.waterBodies||[];
    this.emit('change',{type:'restore'});
  }
  pushHistory(){
    this.history.push(this.snapshot());
    if(this.history.length>80) this.history.shift();
    this.future=[];
  }
  undo(){
    if(!this.history.length) return;
    const cur=this.snapshot();
    this.future.push(cur);
    const prev=this.history.pop();
    this.restore(prev);
  }
  redo(){
    if(!this.future.length) return;
    const cur=this.snapshot();
    this.history.push(cur);
    const nxt=this.future.pop();
    this.restore(nxt);
  }

  addNode(x,y, type='junction'){
    const id=gid();
    const z = this.sampleTerrain(x,y);
    const n={id,x,y,z, type, locked:false};
    this.nodes.set(id,n);
    this.emit('change',{type:'node', id});
    return n;
  }
  getNode(id){ return this.nodes.get(id); }

  sampleTerrain(x,y){
    // x,y in world units -500..500 -> map to noise
    const s=0.004; // scale
    const h = fbm((x+800)*s, (y+800)*s, 5);
    // country hills in NW, city flat in centre, lower south
    const nx = x/600, ny=y/600;
    const centreFall = Math.exp(-(nx*nx+ny*ny)*2.2)*0.35; // plateau flat
    const northHill = Math.max(0, -ny) * 0.55 * Math.max(0, 1 - Math.abs(nx)*0.8);
    const riverValley = Math.exp(-Math.pow((y+40)/80,2)) * 0.15 * (Math.sin(x*0.012)*0.5+0.5);
    let h2 = h*85 - 12; // -12..~73
    h2 += centreFall* -28; // flatten city
    h2 += northHill * 55;
    h2 -= riverValley*18;
    // offroad east rises slightly
    h2 += Math.max(0, nx-0.2)*18;
    return h2;
  }
  sampleWater(x,y){
    // check inside water bodies (polygon)
    for(const w of this.waterBodies){
      if(pointInPoly({x,y}, w.polygon)) return w.level ?? 2;
    }
    // procedural river: centerline y=-35 with meandering
    const riverY = -35 + Math.sin(x*0.008)*24 + Math.sin(x*0.021)*8;
    const d=Math.abs(y - riverY);
    const riverWidth = 28 + Math.sin(x*0.015)*8;
    if(d < riverWidth) return 1.2;
    // lake in SE
    const lx=280, ly=-180, lr=70;
    if(Math.hypot(x-lx, y-ly) < lr) return 1.0;
    // country pond NW
    if(Math.hypot(x+310, y+240) < 34) return 18;
    return null;
  }

  addSegment(aNodeId, bNodeId, presetId='street', opts={}){
    const a=this.nodes.get(aNodeId), b=this.nodes.get(bNodeId);
    if(!a||!b) return null;
    const preset=getPreset(presetId);
    const sId=gid();
    // generate curve points: straight or curved
    const points = this.generateCurve(a,b, opts.curveHandle);
    const seg={
      id:sId, a:aNodeId, b:bNodeId, type:presetId,
      preset: {...preset},
      points, // array {x,y}
      elev: opts.elev || 0,
      bridge:false, tunnel:false,
      oneWay:false, markings: preset.marking,
      lanes: preset.lanes, width: preset.width,
      curbHeight:0.12,
      created:Date.now()
    };
    this.segments.set(sId, seg);
    this.emit('change',{type:'segment', id:sId});
    return seg;
  }
  addRail(aNodeId,bNodeId, kind='monorail'){
    const a=this.nodes.get(aNodeId), b=this.nodes.get(bNodeId);
    if(!a||!b) return;
    const rId=gid();
    const pts=this.generateCurve(a,b);
    this.rails.set(rId,{id:rId,a:aNodeId,b:bNodeId,kind,points:pts, elevated: kind==='monorail'});
    this.emit('change',{type:'rail'});
    return rId;
  }
  generateCurve(a,b, handle){
    if(handle){
      // quadratic bezier
      const steps=24;
      const pts=[];
      for(let i=0;i<=steps;i++){ const t=i/steps; const it=1-t;
        const x= it*it*a.x + 2*it*t*handle.x + t*t*b.x;
        const y= it*it*a.y + 2*it*t*handle.y + t*t*b.y;
        pts.push({x,y});
      }
      return pts;
    }
    // straight with slight smoothing
    const dx=b.x-a.x, dy=b.y-a.y; const len=Math.hypot(dx,dy);
    if(len < 60){
      return [{x:a.x,y:a.y},{x:b.x,y:b.y}];
    }
    // add one midpoint for long roads to allow gentle curve via catmull if terrain
    return [{x:a.x,y:a.y},{x:b.x,y:b.y}];
  }
  deleteSelection(){
    const s=this.selection;
    if(!s.type) return;
    this.pushHistory();
    if(s.type==='node'){
      // delete connected segments
      for(const [sid,seg] of this.segments.entries()){
        if(seg.a===s.id || seg.b===s.id) this.segments.delete(sid);
      }
      // rails
      for(const [rid,r] of this.rails.entries()) if(r.a===s.id||r.b===s.id) this.rails.delete(rid);
      this.nodes.delete(s.id);
    } else if(s.type==='segment'){
      this.segments.delete(s.id);
    } else if(s.type==='rail'){
      this.rails.delete(s.id);
    }
    this.selection={type:null,id:null};
    this.emit('change',{type:'delete'});
  }
  select(type,id){ this.selection={type,id}; this.emit('select',{type,id}); this.emit('change',{type:'select'}); }

  // Auto-detect bridges and update
  updateDerivedFlags(){
    for(const seg of this.segments.values()){
      let needsBridge=false;
      for(const p of seg.points){
        const water=this.sampleWater(p.x,p.y);
        if(water!=null){
          const terrain=this.sampleTerrain(p.x,p.y);
          if(terrain < water+3) needsBridge=true;
        }
        // steep valley gap? terrain dip > 8m below endpoints average
        // simplified
      }
      // also if spanning river (endpoints opposite banks)
      seg.bridge = needsBridge || seg.elev>5;
      seg.needsPiers = needsBridge;
    }
  }

  // Topology: split intersecting segments -> create node at intersection
  autoIntersect(){
    // naive O(n^2) for demo; in real use spatial hash
    const segs=[...this.segments.values()];
    for(let i=0;i<segs.length;i++){
      for(let j=i+1;j<segs.length;j++){
        const s1=segs[i], s2=segs[j];
        if(s1.a===s2.a||s1.a===s2.b||s1.b===s2.a||s1.b===s2.b) continue; // share node
        // only check straight segments (first to last)
        // For polyline, check each subsegment
        for(let k=0;k<s1.points.length-1;k++){
          for(let l=0;l<s2.points.length-1;l++){
            const a=s1.points[k], b=s1.points[k+1], c=s2.points[l], d=s2.points[l+1];
            const inter = segIntersect(a,b,c,d);
            if(inter){
              // split: create node, rewire
              const n=this.addNode(inter.x, inter.y, 'intersection');
              // split s1
              const s1a = this.addSegment(s1.a, n.id, s1.type);
              const s1b = this.addSegment(n.id, s1.b, s1.type);
              // split s2
              const s2a = this.addSegment(s2.a, n.id, s2.type);
              const s2b = this.addSegment(n.id, s2.b, s2.type);
              // remove originals
              this.segments.delete(s1.id); this.segments.delete(s2.id);
              this.emit('change',{type:'intersect'});
              return true; // one at a time, re-run
            }
          }
        }
      }
    }
    return false;
  }

  // Procedural rebuild for demo
  clear(){
    this.nodes.clear(); this.segments.clear(); this.rails.clear(); this.waterBodies=[];
    this.emit('change',{type:'clear'});
  }

  exportJSON(){
    return JSON.stringify({
      nodes:[...this.nodes.values()],
      segments:[...this.segments.values()],
      rails:[...this.rails.values()],
      waterBodies:this.waterBodies
    },null,2);
  }
  importJSON(str){
    const o=JSON.parse(str);
    this.nodes=new Map(o.nodes.map(n=>[n.id,n]));
    this.segments=new Map(o.segments.map(s=>[s.id,s]));
    this.rails=new Map((o.rails||[]).map(r=>[r.id,r]));
    this.waterBodies=o.waterBodies||[];
    this.emit('change',{type:'import'});
  }

  // Terrain helpers for mesh
  buildHeightMap(res=256, size=1200){
    // returns Float32Array size res*res
    const data=new Float32Array(res*res);
    const half=size/2;
    for(let y=0;y<res;y++){
      for(let x=0;x<res;x++){
        const wx = (x/res*size - half);
        const wy = (half - y/res*size);
        data[y*res+x]= this.sampleTerrain(wx,wy);
      }
    }
    return {data,res,size};
  }
}

function segIntersect(a,b,c,d){
  const denom=(a.x-b.x)*(c.y-d.y)-(a.y-b.y)*(c.x-d.x);
  if(Math.abs(denom)<1e-9) return null;
  const t=((a.x-c.x)*(c.y-d.y)-(a.y-c.y)*(c.x-d.x))/denom;
  const u=-((a.x-b.x)*(a.y-c.y)-(a.y-b.y)*(a.x-c.x))/denom;
  if(t>=0 && t<=1 && u>=0 && u<=1){
    return {x: a.x+t*(b.x-a.x), y:a.y+t*(b.y-a.y)};
  }
  return null;
}
function pointInPoly(pt, poly){
  let inside=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){
    const xi=poly[i].x, yi=poly[i].y, xj=poly[j].x, yj=poly[j].y;
    const intersect=((yi>pt.y)!=(yj>pt.y)) && (pt.x < (xj-xi)*(pt.y-yi)/(yj-yi+0.00001)+xi);
    if(intersect) inside=!inside;
  }
  return inside;
}

import { dist } from '../utils/math.js';
export class RoadEditor2D{
  constructor(canvas, network){
    this.canvas=canvas; this.ctx=canvas.getContext('2d');
    this.network=network;
    this.tool='select'; // select, draw, curve, terrain, delete
    this.preset='avenue';
    this.view={ x:0, y:0, scale:1.1 }; // world center
    this.drag=null;
    this.hover=null;
    this.pending=null; // first node for drawing
    this.snapDist=14;
    this.listen();
    this.network.on('change',()=>this.draw());
    this.resize();
    window.addEventListener('resize',()=>this.resize());
    this.draw();
    this._anim=()=>{ this.draw(); requestAnimationFrame(this._anim); };
    requestAnimationFrame(this._anim);
  }
  resize(){
    const dpr=Math.max(1, window.devicePixelRatio||1);
    const rect=this.canvas.getBoundingClientRect();
    if(!rect.width) return;
    this.canvas.width= rect.width*dpr;
    this.canvas.height= rect.height*dpr;
    this.ctx.setTransform(dpr,0,0,dpr,0,0);
    this.w=rect.width; this.h=rect.height;
    this.draw();
  }
  setTool(t){ this.tool=t; this.canvas.style.cursor = t==='draw'?'crosshair': t==='terrain'?'cell':'default'; this.pending=null; this.draw(); }
  setPreset(p){ this.preset=p; }
  worldToScreen(p){ return { x: (p.x - this.view.x)*this.view.scale + this.w/2, y: (this.view.y - p.y)*this.view.scale + this.h/2 }; }
  screenToWorld(s){ return { x: (s.x - this.w/2)/this.view.scale + this.view.x, y: this.view.y - (s.y - this.h/2)/this.view.scale }; }
  listen(){
    this.canvas.addEventListener('pointerdown', e=> this.onDown(e));
    this.canvas.addEventListener('pointermove', e=> this.onMove(e));
    this.canvas.addEventListener('pointerup', e=> this.onUp(e));
    this.canvas.addEventListener('wheel', e=> this.onWheel(e), {passive:false});
    this.canvas.addEventListener('pointerleave', ()=>{ this.hover=null; });
    // keyboard
    window.addEventListener('keydown', e=>{
      if(e.key==='Delete' || e.key==='Backspace') this.network.deleteSelection();
      if(e.key==='z' && (e.ctrlKey||e.metaKey)) { e.preventDefault(); this.network.undo(); }
      if(e.key==='y' && (e.ctrlKey||e.metaKey)) { e.preventDefault(); this.network.redo(); }
      if(e.key==='Escape') { this.pending=null; this.drag=null; this.draw(); }
    });
  }
  hitTest(world){
    // nodes first
    let best=null, bestD= this.snapDist/this.view.scale;
    for(const n of this.network.nodes.values()){
      const d=Math.hypot(n.x-world.x, n.y-world.y);
      if(d < bestD){ bestD=d; best={type:'node', id:n.id, dist:d}; }
    }
    if(best) return best;
    // segments
    for(const s of this.network.segments.values()){
      for(let i=0;i<s.points.length-1;i++){
        const a=s.points[i], b=s.points[i+1];
        const d=pointToSegDist(world,a,b);
        if(d < Math.max(6/this.view.scale, s.width*0.4) && d < bestD){
          best={type:'segment', id:s.id, dist:d}; bestD=d;
        }
      }
    }
    for(const r of this.network.rails.values()){
      for(let i=0;i<r.points.length-1;i++){
        const a=r.points[i], b=r.points[i+1];
        const d=pointToSegDist(world,a,b);
        if(d < 10/this.view.scale && d < bestD){ best={type:'rail', id:r.id, dist:d}; bestD=d; }
      }
    }
    return best;
  }
  onDown(e){
    const rect=this.canvas.getBoundingClientRect();
    const s={x:e.clientX-rect.left, y:e.clientY-rect.top};
    const w=this.screenToWorld(s);
    if(e.button===1 || (e.button===0 && e.altKey)){
      this.drag={mode:'pan', start:{x:e.clientX,y:e.clientY}, view:{...this.view}};
      this.canvas.setPointerCapture(e.pointerId);
      return;
    }
    if(this.tool==='select'){
      if(e.button===2){
        // pan
        this.drag={mode:'pan', start:{x:e.clientX,y:e.clientY}, view:{...this.view}};
        return;
      }
      const hit=this.hitTest(w);
      if(hit){ this.network.select(hit.type, hit.id); }
      else { this.network.select(null,null); }
      // drag node?
      if(hit && hit.type==='node'){
        this.drag={mode:'moveNode', id:hit.id, startW:w };
        this.network.pushHistory();
        this.canvas.setPointerCapture(e.pointerId);
      } else if(!hit){
        // drag to pan with left+drag after delay? also allow box select later
        this.drag={mode:'pan', start:{x:e.clientX,y:e.clientY}, view:{...this.view}};
        this.canvas.setPointerCapture(e.pointerId);
      }
    } else if(this.tool==='draw'){
      const hit=this.hitTest(w);
      let targetId=null;
      if(hit && hit.type==='node'){ targetId=hit.id; }
      else {
        // create new node
        this.network.pushHistory();
        const n=this.network.addNode(w.x,w.y);
        targetId=n.id;
      }
      if(!this.pending){
        this.pending=targetId;
        // highlight
        this.network.select('node', targetId);
      } else {
        if(targetId!==this.pending){
          this.network.pushHistory();
          this.network.addSegment(this.pending, targetId, this.preset);
          // auto intersect cleanup
          for(let i=0;i<4;i++) if(!this.network.autoIntersect()) break;
          this.network.updateDerivedFlags();
          this.pending=targetId;
          this.network.select('node', targetId);
        }
      }
      this.draw();
    } else if(this.tool==='terrain'){
      this.drag={mode:'terrain', add: e.shiftKey ? -1 : 1 };
      this.sculpt(w, e.shiftKey?-1:1);
    }
  }
  onMove(e){
    const rect=this.canvas.getBoundingClientRect();
    const s={x:e.clientX-rect.left, y:e.clientY-rect.top};
    const w=this.screenToWorld(s);
    this.hover=w;
    if(this.drag){
      if(this.drag.mode==='pan'){
        const dx=e.clientX - this.drag.start.x, dy=e.clientY - this.drag.start.y;
        this.view.x = this.drag.view.x - dx/this.view.scale;
        this.view.y = this.drag.view.y + dy/this.view.scale;
        this.draw();
        return;
      }
      if(this.drag.mode==='moveNode'){
        const n=this.network.getNode(this.drag.id);
        if(n){ n.x=w.x; n.y=w.y; n.z=this.network.sampleTerrain(w.x,w.y); // keep z synced
          // update segments points that reference this node (endpoints)
          for(const seg of this.network.segments.values()){
            if(seg.a===n.id) seg.points[0]={x:n.x,y:n.y};
            if(seg.b===n.id) seg.points[seg.points.length-1]={x:n.x,y:n.y};
          }
          for(const rail of this.network.rails.values()){
            if(rail.a===n.id) rail.points[0]={x:n.x,y:n.y};
            if(rail.b===n.id) rail.points[rail.points.length-1]={x:n.x,y:n.y};
          }
          this.network.updateDerivedFlags();
          this.network.emit('change',{type:'move'});
        }
      }
      if(this.drag.mode==='terrain'){
        this.sculpt(w, this.drag.add);
      }
      return;
    }
    // hover feedback
    const hit=this.hitTest(w);
    this.canvas.style.cursor = hit ? 'pointer' : (this.tool==='draw'?'crosshair':'default');
    this.draw();
  }
  onUp(e){
    if(this.drag && this.drag.mode==='pan' && this.drag.start){
      // if tiny movement, treat as deselect? already handled
    }
    this.drag=null;
  }
  onWheel(e){
    e.preventDefault();
    const rect=this.canvas.getBoundingClientRect();
    const s={x:e.clientX-rect.left, y:e.clientY-rect.top};
    const before=this.screenToWorld(s);
    const delta = -e.deltaY * 0.0012;
    const ns= Math.max(0.35, Math.min(6, this.view.scale * (1+delta)));
    this.view.scale=ns;
    const after=this.screenToWorld(s);
    this.view.x += before.x - after.x;
    this.view.y += before.y - after.y;
    this.draw();
  }
  sculpt(center, dir){
    // adjust terrain by painting: we store terrainSeed offset? For demo, we don't have mutable heightmap;
    // Instead we emulate by adding temporary terrainBumps stored in network._sculpts
    if(!this.network._sculpts) this.network._sculpts=[];
    this.network._sculpts.push({x:center.x, y:center.y, r:36, h:dir*6});
    if(this.network._sculpts.length>400) this.network._sculpts.shift();
    // override sampleTerrain via wrapper if needed - simple: patch network.sampleTerrain
    if(!this.network._origTerrain){
      this.network._origTerrain=this.network.sampleTerrain.bind(this.network);
      this.network.sampleTerrain=(x,y)=>{
        let h=this.network._origTerrain(x,y);
        for(const sc of this.network._sculpts){
          const d=Math.hypot(x-sc.x, y-sc.y);
          if(d<sc.r) h+= sc.h * Math.pow(1-d/sc.r,2);
        }
        return h;
      };
    }
    this.network.emit('change',{type:'terrain'});
  }

  draw(){
    const ctx=this.ctx;
    if(!this.w) return;
    ctx.clearRect(0,0,this.w,this.h);
    // grid
    this.drawGrid();
    // terrain heatmap underlay (low cost)
    this.drawTerrain();
    // water
    this.drawWater();
    // rails first (under roads?)
    this.drawRails();
    // road segments
    this.drawRoads();
    // nodes
    this.drawNodes();
    // pending preview
    if(this.pending && this.hover && this.tool==='draw'){
      const n=this.network.getNode(this.pending);
      if(n){
        const a=this.worldToScreen(n), b=this.worldToScreen(this.hover);
        ctx.save();
        ctx.strokeStyle='rgba(94,225,255,0.9)'; ctx.lineWidth=2; ctx.setLineDash([6,6]);
        ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
        ctx.restore();
      }
    }
    // crosshair
    // status
  }
  drawGrid(){
    const ctx=this.ctx;
    const step = 50 * this.view.scale;
    // we draw via transformed world: simpler draw lines in world then to screen
    // Instead draw screen grid stepping
    // draw faint world grid every 100 units
    const rangeX = this.w/this.view.scale, rangeY=this.h/this.view.scale;
    const minX=this.view.x - rangeX/2, maxX=this.view.x + rangeX/2;
    const minY=this.view.y - rangeY/2, maxY=this.view.y + rangeY/2;
    const gridStep=100;
    ctx.save();
    ctx.strokeStyle='rgba(36,47,66,0.35)'; ctx.lineWidth=1;
    for(let x=Math.floor(minX/gridStep)*gridStep; x<maxX; x+=gridStep){
      const sx=this.worldToScreen({x,y:0}).x;
      ctx.beginPath(); ctx.moveTo(sx,0); ctx.lineTo(sx,this.h); ctx.stroke();
      if(Math.abs(x)<1) { ctx.strokeStyle='rgba(94,225,255,0.22)'; ctx.beginPath(); ctx.moveTo(sx,0); ctx.lineTo(sx,this.h); ctx.stroke(); ctx.strokeStyle='rgba(36,47,66,0.35)';}
    }
    for(let y=Math.floor(minY/gridStep)*gridStep; y<maxY; y+=gridStep){
      const sy=this.worldToScreen({x:0,y}).y;
      ctx.beginPath(); ctx.moveTo(0,sy); ctx.lineTo(this.w,sy); ctx.stroke();
      if(Math.abs(y)<1) { ctx.strokeStyle='rgba(94,225,255,0.22)'; ctx.beginPath(); ctx.moveTo(0,sy); ctx.lineTo(this.w,sy); ctx.stroke(); ctx.strokeStyle='rgba(36,47,66,0.35)';}
    }
    ctx.restore();
  }
  drawTerrain(){
    // cheap height contour visualization: sample in screen steps
    const ctx=this.ctx; const step=18;
    for(let sx=0; sx<this.w; sx+=step){
      for(let sy=0; sy<this.h; sy+=step){
        const w=this.screenToWorld({x:sx,y:sy});
        const h=this.network.sampleTerrain(w.x,w.y);
        // color by height
        const t= (h+20)/90; // 0..1
        const alpha= 0.08 + Math.min(0.18, Math.max(0, t)*0.18);
        // hills greenish, lowland sand, water blue already overpaint
        let col;
        if(h<2) col=`rgba(96,110,86,${alpha})`;
        else if(h<18) col=`rgba(86,98,72,${alpha})`;
        else col=`rgba(70,85,62,${alpha*0.9})`;
        if(alpha>0.08){
          ctx.fillStyle=col;
          ctx.fillRect(sx,sy,step-1,step-1);
        }
      }
    }
    // contour lines
    ctx.save();
    ctx.strokeStyle='rgba(255,255,255,0.03)'; ctx.lineWidth=1;
    for(let sx=0; sx<this.w; sx+=22){
      for(let sy=0; sy<this.h; sy+=22){
        // not needed
      }
    }
    ctx.restore();
  }
  drawWater(){
    const ctx=this.ctx;
    const polys=[];
    // procedural river + lake
    // draw river as thick stroke using many points
    const pts=[];
    for(let x=-600;x<=600;x+=6){
      const y=-35 + Math.sin(x*0.008)*24 + Math.sin(x*0.021)*8;
      const w=28+ Math.sin(x*0.015)*8;
      // convert to screen poly for filling: build upper/lower
      pts.push({x,y});
    }
    if(pts.length>1){
      ctx.save();
      ctx.strokeStyle='rgba(64,128,180,0.55)'; ctx.lineWidth= (56*this.view.scale);
      ctx.lineCap='round'; ctx.lineJoin='round';
      ctx.beginPath();
      const s0=this.worldToScreen(pts[0]); ctx.moveTo(s0.x,s0.y);
      for(let i=1;i<pts.length;i++){ const s=this.worldToScreen(pts[i]); ctx.lineTo(s.x,s.y); }
      ctx.stroke();
      // inner highlight
      ctx.strokeStyle='rgba(92,168,214,0.38)'; ctx.lineWidth= (34*this.view.scale);
      ctx.beginPath(); ctx.moveTo(s0.x,s0.y); for(let i=1;i<pts.length;i++){ const s=this.worldToScreen(pts[i]); ctx.lineTo(s.x,s.y);} ctx.stroke();
      ctx.restore();
    }
    // lake
    const drawLake=(cx,cy,r, col)=>{
      const sc=this.worldToScreen({x:cx,y:cy}); const sr=r*this.view.scale;
      ctx.save(); ctx.fillStyle=col; ctx.beginPath(); ctx.arc(sc.x,sc.y,sr,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='rgba(92,168,214,0.35)'; ctx.lineWidth=2; ctx.stroke();
      ctx.restore();
    };
    drawLake(280,-180,70,'rgba(64,128,180,0.42)');
    drawLake(-310,240,34,'rgba(64,128,180,0.44)');
    // water bodies polygon if any
    ctx.save();
    for(const w of this.network.waterBodies||[]){
      ctx.fillStyle='rgba(64,128,180,0.18)'; ctx.strokeStyle='rgba(92,168,214,0.32)'; ctx.lineWidth=1.2;
      ctx.beginPath(); w.polygon.forEach((p,i)=>{
        const s=this.worldToScreen(p); if(i===0) ctx.moveTo(s.x,s.y); else ctx.lineTo(s.x,s.y);
      }); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  }
  drawRails(){
    const ctx=this.ctx;
    for(const r of this.network.rails.values()){
      const isMono=r.kind==='monorail';
      ctx.save();
      // shadow
      ctx.strokeStyle= isMono?'rgba(120,90,255,0.9)':'rgba(180,80,40,0.85)';
      ctx.lineWidth= isMono? 5*this.view.scale *0.7 : 4*this.view.scale*0.7;
      ctx.lineCap='round'; ctx.lineJoin='round';
      if(isMono) ctx.setLineDash([10,8]);
      ctx.beginPath();
      r.points.forEach((p,i)=>{ const s=this.worldToScreen(p); if(i===0) ctx.moveTo(s.x,s.y); else ctx.lineTo(s.x,s.y); });
      ctx.stroke();
      // ties
      if(!isMono){
        ctx.strokeStyle='rgba(60,40,20,0.6)'; ctx.lineWidth=1; ctx.setLineDash([]);
        for(let k=0;k<r.points.length-1;k++){
          const a=r.points[k], b=r.points[k+1];
          const mid={x:(a.x+b.x)/2, y:(a.y+b.y)/2};
          const s=this.worldToScreen(mid);
          ctx.beginPath(); ctx.moveTo(s.x-6,s.y-3); ctx.lineTo(s.x+6,s.y+3); ctx.stroke();
        }
      }
      // highlight selection
      if(this.network.selection.type==='rail' && this.network.selection.id===r.id){
        ctx.strokeStyle='rgba(94,225,255,0.95)'; ctx.lineWidth=8; ctx.globalAlpha=0.35; ctx.stroke();
      }
      ctx.restore();
    }
  }
  drawRoads(){
    const ctx=this.ctx;
    // draw in order: widest first to avoid overlap artifacts; but we need proper layering
    const segs=[...this.network.segments.values()].sort((a,b)=>b.width-a.width);
    for(const seg of segs){
      const pts=seg.points.map(p=>this.worldToScreen(p));
      if(pts.length<2) continue;
      const selected = this.network.selection.type==='segment' && this.network.selection.id===seg.id;
      // shadow / curb
      ctx.save();
      ctx.lineCap='round'; ctx.lineJoin='round';
      const lineWidth = seg.width * this.view.scale;
      // asphalt base with slight darken
      ctx.strokeStyle= selected? 'rgba(94,225,255,0.9)' : seg.bridge? 'rgba(42,44,48,1)' : hexToRgba(seg.preset.color,1);
      if(seg.preset.dirt) ctx.strokeStyle= selected? 'rgba(120,90,40,1)' : 'rgba(74,63,46,1)';
      if(seg.preset.gravel) ctx.strokeStyle='rgba(90,90,82,1)';
      ctx.lineWidth= lineWidth+2;
      ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
      for(let i=1;i<pts.length;i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
      // lane markings
      if(seg.lanes>1 && seg.preset.marking!=='none'){
        // center line
        ctx.strokeStyle= seg.preset.highway? 'rgba(255,240,110,0.95)' : 'rgba(255,255,255,0.92)';
        ctx.lineWidth= Math.max(1, 1.4*this.view.scale);
        if(seg.preset.marking.includes('dashed')){
          ctx.setLineDash([9*this.view.scale, 9*this.view.scale]);
        } else if(seg.preset.marking.includes('double')){
          ctx.setLineDash([]);
          // draw double
          const off=2.2*this.view.scale;
          // we approximate by drawing two parallel lines offset perpendicular
          // simplified: just draw solid for now double
          ctx.lineWidth=2.2*this.view.scale;
        } else ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
        for(let i=1;i<pts.length;i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();
        // lane dividers for >2 lanes
        if(seg.lanes>2){
          ctx.strokeStyle='rgba(255,255,255,0.85)'; ctx.lineWidth=1.0*this.view.scale;
          ctx.setLineDash([6*this.view.scale,6*this.view.scale]);
          ctx.beginPath(); ctx.moveTo(pts[0].x,pts[0].y);
          for(let i=1;i<pts.length;i++) ctx.lineTo(pts[i].x,pts[i].y);
          ctx.stroke();
        }
      }
      // sidewalks
      if(seg.preset.sidewalk && this.view.scale>0.6){
        ctx.strokeStyle='rgba(165,172,185,0.95)'; ctx.lineWidth= Math.max(1, (seg.preset.sidewalkWidth||2)*this.view.scale*0.6);
        // we fake by not drawing, just edge highlight
        ctx.globalAlpha=0.0; // we will draw via offset later if needed
      }
      // bridge piers indicator
      if(seg.bridge){
        ctx.setLineDash([]); ctx.globalAlpha=1;
        ctx.strokeStyle='rgba(90,95,110,0.9)'; ctx.lineWidth= lineWidth+4;
        // already drawn, add pier dots
        for(let i=1;i<pts.length;i++){
          const mid={x:(pts[i-1].x+pts[i].x)/2, y:(pts[i-1].y+pts[i].y)/2};
          ctx.fillStyle='rgba(70,75,85,1)'; ctx.beginPath(); ctx.arc(mid.x,mid.y,3,0,Math.PI*2); ctx.fill();
        }
      }
      // outline for selection
      if(selected){
        ctx.globalAlpha=0.28; ctx.strokeStyle='#5ee1ff'; ctx.lineWidth= lineWidth+10; ctx.setLineDash([]); ctx.stroke();
      }
      ctx.restore();
      // road edge lines
      ctx.save();
      ctx.strokeStyle='rgba(255,255,255,0.88)'; ctx.lineWidth= Math.max(1, 1.2*this.view.scale);
      ctx.globalAlpha=0.85;
      ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
      for(let i=1;i<pts.length;i++) ctx.lineTo(pts[i].x, pts[i].y);
      // we don't stroke edge, instead inset: Skip. For clarity, we keep minimal.
      ctx.restore();
      // label
      if(this.view.scale>0.9 && seg.lanes>1){
        const midIdx=Math.floor(pts.length/2);
        const mid=pts[midIdx];
        ctx.save(); ctx.fillStyle='rgba(232,238,246,0.78)'; ctx.font=`600 ${10*this.view.scale}px Inter, sans-serif`;
        ctx.fillText(seg.preset.name, mid.x+6, mid.y-6);
        ctx.restore();
      }
    }
  }
  drawNodes(){
    const ctx=this.ctx;
    for(const n of this.network.nodes.values()){
      const s=this.worldToScreen(n);
      const isSel = this.network.selection.type==='node' && this.network.selection.id===n.id;
      const isPending = this.pending===n.id;
      const size = n.type==='intersection' ? 6 : 5;
      ctx.save();
      // halo
      if(isSel||isPending){
        ctx.fillStyle='rgba(94,225,255,0.22)'; ctx.beginPath(); ctx.arc(s.x,s.y,size*3.2,0,Math.PI*2); ctx.fill();
      }
      // node
      ctx.fillStyle= isSel? '#5ee1ff' : n.type==='intersection'? '#8ea0b8' : '#e8eef6';
      ctx.strokeStyle='rgba(0,0,0,0.6)'; ctx.lineWidth=1.2;
      ctx.beginPath(); ctx.arc(s.x,s.y,size,0,Math.PI*2); ctx.fill(); ctx.stroke();
      // elevation hint
      const h=n.z; const t=(h+10)/70;
      ctx.fillStyle=`rgba(${Math.floor(120+t*120)},${Math.floor(180-t*40)},${Math.floor(255-t*80)},0.9)`;
      ctx.beginPath(); ctx.arc(s.x,s.y,2.2,0,Math.PI*2); ctx.fill();
      ctx.restore();
    }
  }
}

function pointToSegDist(p,a,b){
  const l2=(b.x-a.x)*(b.x-a.x)+(b.y-a.y)*(b.y-a.y);
  if(l2===0) return Math.hypot(p.x-a.x,p.y-a.y);
  let t=((p.x-a.x)*(b.x-a.x)+(p.y-a.y)*(b.y-a.y))/l2;
  t=Math.max(0,Math.min(1,t));
  return Math.hypot(p.x-(a.x+t*(b.x-a.x)), p.y-(a.y+t*(b.y-a.y)));
}
function hexToRgba(hex,a){
  const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${a})`;
}

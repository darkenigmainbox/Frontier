import { RoadNetwork } from './core/RoadNetwork.js';
import { ROAD_PRESETS } from './core/RoadTypes.js';
import { RoadEditor2D } from './editor2d/RoadEditor2D.js';
import { RoadEditor3D } from './editor3d/RoadEditor3D.js';
import { buildDemoCity } from './data/DemoCity.js';

const network=new RoadNetwork();
const canvas2d=document.getElementById('editor2d');
const canvas3d=document.getElementById('three-canvas');
const editor2d=new RoadEditor2D(canvas2d, network);
const editor3d=new RoadEditor3D(canvas3d, network);

// UI wiring
const toolButtons=document.querySelectorAll('[data-tool]');
toolButtons.forEach(b=>{
  b.addEventListener('click',()=>{
    toolButtons.forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    editor2d.setTool(b.dataset.tool);
    document.getElementById('status-tool').textContent=b.dataset.tool;
  });
});
document.querySelectorAll('[data-preset]').forEach(el=>{
  el.addEventListener('click',()=>{
    document.querySelectorAll('.preset').forEach(p=>p.classList.remove('active'));
    el.classList.add('active');
    editor2d.setPreset(el.dataset.preset);
    document.getElementById('status-preset').textContent=el.dataset.preset;
  });
});

// preset grid generation
const presetGrid=document.getElementById('presetGrid');
presetGrid.innerHTML='';
for(const p of ROAD_PRESETS){
  const div=document.createElement('div');
  div.className='preset' + (p.id==='avenue'?' active':'');
  div.dataset.preset=p.id;
  div.innerHTML=`<strong>${p.name}</strong><span>${p.category} • ${p.lanes} lanes • ${p.width}m</span><div class="swatch" style="background:${p.color}"></div><span style="font-size:10px;opacity:.7">${p.desc}</span>`;
  div.addEventListener('click',()=>{
    document.querySelectorAll('.preset').forEach(x=>x.classList.remove('active'));
    div.classList.add('active');
    editor2d.setPreset(p.id);
    document.getElementById('status-preset').textContent=p.id;
    // update inspector
    updateInspector();
  });
  presetGrid.appendChild(div);
}

function updateInspector(){
  const sel=network.selection;
  const box=document.getElementById('inspectorContent');
  if(!sel.type){
    box.innerHTML=`<div class="help">No selection. Click a road or node in the 2D plan to inspect. Use <span class="kbd">Draw</span> to create new segments, then click again to extend. Bridges auto-generate over water/valleys.</div>`;
    return;
  }
  if(sel.type==='segment'){
    const seg=network.segments.get(sel.id);
    if(!seg){ box.innerHTML='Invalid selection'; return; }
    box.innerHTML=`
      <div class="card">
        <h3>Road Segment — ${seg.preset.name}</h3>
        <div class="row"><label>Type</label><select class="select" id="segType">${ROAD_PRESETS.map(p=>`<option value="${p.id}" ${p.id===seg.type?'selected':''}>${p.name}</option>`).join('')}</select></div>
        <div class="row"><label>Width</label><span>${seg.width.toFixed(1)} m</span></div>
        <div class="row"><label>Lanes</label><span>${seg.lanes}</span></div>
        <div class="row"><label>Bridge</label><span>${seg.bridge? 'Yes — auto' : 'No'}</span></div>
        <div class="row"><label>Marking</label><span>${seg.markings}</span></div>
        <div class="help">Changing type rebuilds mesh with clean quad flow, sidewalks, markings and bridge piers.</div>
        <hr class="sep">
        <div class="row"><button class="btn small" id="btnDeleteSeg">Delete Segment</button><button class="btn small" id="btnSplit">Split at Midpoint</button></div>
      </div>
    `;
    box.querySelector('#segType').addEventListener('change', e=>{
      network.pushHistory();
      const np=ROAD_PRESETS.find(p=>p.id===e.target.value);
      seg.type=np.id; seg.preset={...np}; seg.width=np.width; seg.lanes=np.lanes; seg.markings=np.marking;
      network.updateDerivedFlags();
      network.emit('change',{type:'edit'});
      updateInspector();
    });
    box.querySelector('#btnDeleteSeg').addEventListener('click',()=> network.deleteSelection());
    box.querySelector('#btnSplit').addEventListener('click',()=>{
      network.pushHistory();
      const midIdx=Math.floor(seg.points.length/2);
      const mid=seg.points[midIdx]||seg.points[0];
      const n=network.addNode(mid.x, mid.y);
      network.addSegment(seg.a, n.id, seg.type); network.addSegment(n.id, seg.b, seg.type);
      network.segments.delete(seg.id);
      network.emit('change',{type:'split'});
    });
  } else if(sel.type==='node'){
    const n=network.nodes.get(sel.id);
    box.innerHTML=`
      <div class="card">
        <h3>Node — ${n.type}</h3>
        <div class="row"><label>X</label><input class="input" id="nx" type="number" value="${n.x.toFixed(1)}"></div>
        <div class="row"><label>Y</label><input class="input" id="ny" type="number" value="${n.y.toFixed(1)}"></div>
        <div class="row"><label>Elev</label><span>${n.z.toFixed(1)} m</span></div>
        <div class="row"><button class="btn small" id="btnDelNode">Delete Node</button><button class="btn small" id="btnFix">Fix Topology</button></div>
        <div class="help">Drag node in 2D plan to move. Terrain height is sampled automatically. Pavement ramps generate at intersections.</div>
      </div>
    `;
    box.querySelector('#nx').addEventListener('change', e=>{ n.x=parseFloat(e.target.value); syncNode(n); });
    box.querySelector('#ny').addEventListener('change', e=>{ n.y=parseFloat(e.target.value); syncNode(n); });
    box.querySelector('#btnDelNode').addEventListener('click',()=> network.deleteSelection());
    box.querySelector('#btnFix').addEventListener('click',()=>{
      network.autoIntersect();
      network.updateDerivedFlags();
      network.emit('change',{type:'fix'});
    });
  } else if(sel.type==='rail'){
    const r=network.rails.get(sel.id);
    box.innerHTML=`<div class="card"><h3>Rail — ${r.kind}</h3><div class="row"><button class="btn small" id="delRail">Delete</button></div></div>`;
    box.querySelector('#delRail').addEventListener('click',()=> network.deleteSelection());
  }
  function syncNode(node){
    for(const s of network.segments.values()){
      if(s.a===node.id) s.points[0]={x:node.x,y:node.y};
      if(s.b===node.id) s.points[s.points.length-1]={x:node.x,y:node.y};
    }
    network.emit('change',{type:'nodeMove'});
  }
}
network.on('select', updateInspector);
network.on('change', updateInspector);

// Topbar actions
document.getElementById('btnDemo').addEventListener('click',()=>{
  network.pushHistory();
  buildDemoCity(network);
  document.getElementById('status-msg').textContent='Demo city built — countryside → city → offroad with bridges & rails';
});
document.getElementById('btnClear').addEventListener('click',()=>{
  if(confirm('Clear entire network?')){ network.pushHistory(); network.clear(); network.emit('change',{type:'clear'}); }
});
document.getElementById('btnUndo').addEventListener('click',()=> network.undo());
document.getElementById('btnRedo').addEventListener('click',()=> network.redo());
document.getElementById('btnExport').addEventListener('click',()=>{
  const data=network.exportJSON();
  const blob=new Blob([data],{type:'application/json'}); const url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download='frontier-city.json'; a.click();
  URL.revokeObjectURL(url);
});
document.getElementById('btnImport').addEventListener('click',()=>{
  const inp=document.createElement('input'); inp.type='file'; inp.accept='.json';
  inp.onchange=async()=>{
    const text=await inp.files[0].text(); network.pushHistory(); network.importJSON(text);
  }; inp.click();
});
document.getElementById('btnSnap').addEventListener('click',()=>{
  network.pushHistory();
  let c=0; for(let i=0;i<20;i++){ if(network.autoIntersect()) c++; else break; }
  network.updateDerivedFlags(); network.emit('change',{type:'snap'});
  document.getElementById('status-msg').textContent=`Topology cleaned — ${c} intersections merged`;
});

// View presets
document.querySelectorAll('[data-view]').forEach(b=>{
  b.addEventListener('click',()=> editor3d.setViewPreset(b.dataset.view));
});

// Terrain sculpt toggle
let sculpt=false;
document.getElementById('btnTerrain').addEventListener('click',()=>{
  sculpt=!sculpt; editor2d.setTool(sculpt?'terrain':'select');
  document.getElementById('btnTerrain').classList.toggle('primary', sculpt);
  toolButtons.forEach(x=>x.classList.remove('active'));
  if(sculpt) document.getElementById('btnTerrain').classList.add('active');
});

// Stats
setInterval(()=>{
  document.getElementById('statNodes').textContent=network.nodes.size;
  document.getElementById('statSegs').textContent=network.segments.size;
  document.getElementById('statRails').textContent=network.rails.size;
}, 300);

// Initial demo
buildDemoCity(network);
updateInspector();
requestAnimationFrame(()=>{ editor2d.resize(); editor3d.resize(); });
window.addEventListener('resize',()=>{ editor2d.resize(); editor3d.resize(); });

// keyboard shortcuts overlay
document.addEventListener('keydown', e=>{
  if(e.key==='1') document.querySelector('[data-tool="select"]').click();
  if(e.key==='2') document.querySelector('[data-tool="draw"]').click();
  if(e.key==='3') document.querySelector('[data-tool="delete"]').click();
});

// double click to focus 3d handled in RoadEditor3D

// expose for debug
window.network=network; window.editor2d=editor2d; window.editor3d=editor3d;

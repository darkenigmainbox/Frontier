import { PATTERNS, PATTERN_REVISION } from './patterns.js';
import { clone, uid, escapeHTML as esc, designFromPreset, designBlocks, expandShape, newShape, transformBlock, validateDesign, validPolygon, defaultMirror, designSVG } from './design.js';
import { validateSettings } from './geometry.js';
import pc from 'polygon-clipping';
import { nearestEdge, constrainPoint, midpointInsertion } from './point-editing.js';

const colors=['#f39862','#83b9cf','#b4c987','#c0a2de','#dab773','#75b9a6'];
const fmt=n=>Number(n.toFixed(4));
export function createDesigner({getSettings,onChange,onPreset,onImport,onMessage}) {
  const $=s=>document.querySelector(s);
  let design=getSettings().design ? clone(getSettings().design) : designFromPreset(getSettings().pattern);
  try{const saved=JSON.parse(localStorage.getItem('frontier-draft-v1'));if(saved)design=validateDesign(saved);}catch{}
  if(!design.modified&&design.presetRevision!==PATTERN_REVISION)design=designFromPreset(design.preset);
  let selected=design.shapes[0]?.id,vertex=null,activeSipe=null,tool='select',draft=[],drag=null,view=null,snap=false;
  const undo=[],redo=[];
  const sidebar=document.createElement('div');sidebar.className='designer-sidebar';$('.library').prepend(sidebar);
  sidebar.innerHTML=`<div class="section-eyebrow">01 / BASE SHAPES</div><h1>Your tread. Your rules.</h1>
    <label class="designer-label" for="design-name">Project name</label><input id="design-name" maxlength="100"/>
    <label class="designer-label" for="design-preset">Start from a preset</label><div class="editor-row"><select id="design-preset">${PATTERNS.map(p=>`<option value="${p.id}">${esc(p.name)}${p.reference?' · revised draft':''}</option>`).join('')}</select><button id="load-preset">Load</button></div>
    <div class="editor-row project-actions"><button id="save-design">Save JSON ↓</button><button id="load-design">Open JSON ↑</button><button id="blank-design">Blank</button></div><input id="design-file" type="file" accept=".json,application/json" hidden/>
    <div class="shape-heading"><span class="section-eyebrow">SHAPE TYPES <b id="shape-total"></b></span><span id="draft-status">Autosaved locally</span></div>
    <div class="editor-row"><select id="new-kind" aria-label="New shape type"><option value="block">Rectangle</option><option value="chevron">Chevron</option><option value="triangle">Triangle</option><option value="ejector">Low ejector</option></select><button id="add-shape">＋ Add</button></div>
    <div id="shape-list" aria-label="Shape types"></div><div class="editor-row"><button id="duplicate-shape">Duplicate</button><button id="delete-shape">Delete shape</button></div>
    <div id="shape-properties"></div>
    <button id="designer-reference" class="editor-reference">Preset blueprint & reference ↗</button>
    <p class="editor-help">Solid = editable source. Dashed = linked mirror. Drag a shape to move it, or a handle to edit a vertex. Orange handles shape blocks; blue handles shape cut lines. No limit on the number of shape types.</p>`;
  const pane=document.createElement('section');pane.className='editor-pane';pane.setAttribute('aria-label','2D tread polygon designer');$('.stage').before(pane);
  pane.innerHTML=`<div class="editor-heading"><div><div class="section-eyebrow">02 / POLYGON DESIGNER</div><h2>Shape the contact patch.</h2></div><span class="small-tag">SVG → MESH</span></div>
    <div class="editor-toolbar"><button data-tool="select" aria-pressed="true">↖ Select</button><button data-tool="polygon">＋ Polygon</button><button data-tool="sipe">＋ Cut line</button><button id="undo-design" title="Undo (Ctrl/Cmd Z)">↶ Undo</button><button id="redo-design" title="Redo (Ctrl/Cmd Shift Z)">↷</button></div>
    <div class="editor-context"><span id="editor-instruction">Ctrl/Cmd + click: add · Alt + point: remove · Shift + drag: straight</span><button id="finish-draw" hidden>Finish ↵</button><button id="cancel-draw" hidden>Cancel</button></div>
    <svg id="design-canvas" tabindex="0" role="img" aria-label="Editable tread polygons. Use the vertex fields for precise coordinates." xmlns="http://www.w3.org/2000/svg"></svg>
    <div class="editor-bottom"><label><input id="editor-snap" type="checkbox"/> Snap 0.025</label><span>Wheel: zoom · middle/right drag: pan</span><button id="fit-editor">Fit 2D</button><button id="export-svg">SVG ↓</button></div>
    <div id="design-warnings" role="status"></div>
    <details class="editor-guide"><summary>Point & cut-line shortcuts</summary><p><strong>Ctrl/Cmd + click</strong> near a solid outline or cut-line segment inserts a point. <strong>Alt + click</strong> a handle removes it. Polygons keep at least 3 points; removing a point from a 2-point cut deletes that cut. Drag blue handles to reshape cut lines; drag a line to move it independently. <strong>Shift + drag</strong> locks horizontal/vertical movement. <strong>Ctrl/Cmd + Shift + click</strong> extends the selected cut-line endpoint (select the first endpoint to prepend; otherwise extends the end). Double-click inserts too. Middle/right drag pans. Undo/redo covers all these edits.</p></details>
    <details class="editor-guide"><summary>How mirroring & repeats work</summary><p>X runs across the tyre width; Y runs along travel in pitch units. Width mirroring reflects X; travel mirroring reflects Y; point mirroring reverses both; four-way makes all combinations. The copy stagger shifts mirrored copies along travel. Axes are local to each pitch. Edit A, B or every pitch; the two-pitch cell repeats around an even circumference. Sipes mirror with their block. The SVG shows source outlines; groove spacing and bevels are applied in 3D. Overlapping blocks remain separate solids, not a union.</p></details>`;
  const svg=$('#design-canvas');
  const shape=()=>design.shapes.find(s=>s.id===selected);
  const units=()=>{const s=getSettings();return {w:s.width,p:2*Math.PI*s.radius/s.repeats};};
  const sourceRow=s=>s.phase==='1'?1:0;
  function saveDraft(){try{localStorage.setItem('frontier-draft-v1',JSON.stringify(design));$('#draft-status').textContent='Autosaved locally';}catch{$('#draft-status').textContent='Save JSON to keep edits';}}
  function frame(){const {design:ignored,...settings}=getSettings();return {design:clone(design),settings:clone(settings)};}
  function remember(){undo.push(frame());if(undo.length>80)undo.shift();redo.length=0;$('#undo-design').disabled=false;$('#redo-design').disabled=true;}
  function notify(){design.modified=true;saveDraft();onChange(clone(design));warnings();}
  function edit(fn,nextVertex=null){remember();fn();vertex=nextVertex;activeSipe=nextVertex?.sipe??null;render();notify();}
  function fit(){const {w,p}=units();view=[-.64*w,-.5*p,1.28*w,3*p];renderCanvas();}
  function download(content,filename,type){const a=document.createElement('a'),url=URL.createObjectURL(new Blob([content],{type}));a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
  function warnings(){
    const invalid=design.shapes.filter(s=>s.enabled&&!validPolygon(s.points));
    if(invalid.length){$('#design-warnings').textContent=`Repair outline: ${invalid.map(s=>s.name).join(', ')}. Self-intersections / duplicate vertices cannot be extruded; last valid mesh remains visible.`;return;}
    // Normalize distant travel offsets into the two-pitch periodic cell first.
    const features=[];
    for(const parity of [0,1])for(const b of designBlocks(design,parity)){
      const center=b.points.reduce((n,p)=>n+p[1],0)/b.points.length+parity;
      const offset=parity-2*Math.floor(center/2);
      for(const cycle of [-1,0,1])features.push(b.points.map(([x,y])=>[x,y+offset+cycle*2]));
    }
    let overlaps=0;
    // Stop after the first collision: this is a warning, not a costly union of the mesh.
    outer:for(let i=0;i<features.length;i++)for(let j=i+1;j<features.length;j++){
      const a=features[i],b=features[j];
      if(Math.max(...a.map(p=>p[0]))<Math.min(...b.map(p=>p[0]))||Math.min(...a.map(p=>p[0]))>Math.max(...b.map(p=>p[0]))||Math.max(...a.map(p=>p[1]))<Math.min(...b.map(p=>p[1]))||Math.min(...a.map(p=>p[1]))>Math.max(...b.map(p=>p[1])))continue;
      try{const intersection=pc.intersection([a],[b]);if(intersection.some(poly=>Math.abs(poly[0].reduce((sum,p,k)=>{const q=poly[0][(k+1)%poly[0].length];return sum+p[0]*q[1]-p[1]*q[0]},0))>1e-7)){overlaps++;break outer;}}catch{}
    }
    const outside=features.some(points=>points.some(([x])=>Math.abs(x)>.501));
    $('#design-warnings').textContent=overlaps?'Overlapping shapes across the repeat. Adjust vertices, mirror axes or stagger to open the grooves.':outside?'Some shapes extend beyond the tread width. Check the casing support in 3D.':design.shapes.some(s=>s.enabled)?'Two-pitch cell → full circumference. Source grooves are open.':'Empty design. Add a polygon or load a preset to begin.';
    $('#design-warnings').classList.toggle('warning',!!overlaps||outside);
  }
  function render(){
    $('#design-name').value=design.name;$('#design-preset').value=design.preset;$('#shape-total').textContent=design.shapes.length;
    $('#shape-list').innerHTML=design.shapes.map((s,i)=>`<div class="shape-item ${s.id===selected?'selected':''}"><button data-select-shape="${s.id}" aria-pressed="${s.id===selected}"><i style="background:${colors[i%colors.length]}"></i><span>${esc(s.name)}<small>${s.points.length} vertices · ${s.phase==='both'?'A + B':s.phase==='0'?'A only':'B only'} · ${s.mirror.mode}</small></span></button><input type="checkbox" data-enable-shape="${s.id}" aria-label="Show ${esc(s.name)}" ${s.enabled?'checked':''}/></div>`).join('');
    $('#undo-design').disabled=!undo.length;$('#redo-design').disabled=!redo.length;
    $('#duplicate-shape').disabled=$('#delete-shape').disabled=!shape();
    renderProperties();renderCanvas();
  }
  function renderProperties(){
    const s=shape();if(!s){$('#shape-properties').innerHTML='<p class="editor-help">Select or add a shape to edit its mirrors.</p>';return;}
    const {w}=units();
    $('#shape-properties').innerHTML=`<div class="section-eyebrow">SELECTED SHAPE</div><label class="designer-label" for="shape-name">Name</label><input id="shape-name" maxlength="100" value="${esc(s.name)}"/>
      <div class="field-pair"><label>Pitch membership<select id="shape-phase"><option value="both">Every pitch (A + B)</option><option value="0">A only</option><option value="1">B only</option></select></label><label>Height / depth %<input id="shape-height" type="number" min="5" max="100" value="${fmt(s.heightRatio*100)}"/></label></div>
      <label class="designer-label" for="mirror-mode">Linked mirrors</label><select id="mirror-mode"><option value="none">None — source only</option><option value="width">Across tyre width (X)</option><option value="travel">Along tread / travel (Y)</option><option value="point">Point mirror (X + Y)</option><option value="both">Four-way (both axes)</option></select>
      <div class="field-pair"><label>X axis / mm<input id="mirror-x" type="number" step="1" value="${fmt(s.mirror.axisX*w)}"/></label><label>Y axis / pitch<input id="mirror-y" type="number" step=".05" value="${fmt(s.mirror.axisY)}"/></label></div>
      <label class="designer-label" for="mirror-stagger">Copy stagger / pitch</label><input id="mirror-stagger" type="number" step=".05" value="${fmt(s.mirror.stagger)}"/>
      <button id="bake-mirrors" ${s.mirror.mode==='none'?'disabled':''}>Make mirror copies independent</button>
      <div class="editor-row"><input id="shape-angle" type="number" value="15" step="15" aria-label="Rotation angle in degrees"/><button id="rotate-shape">Rotate °</button></div>
      <div id="vertex-fields"></div><div class="editor-row"><button id="add-vertex">＋ Point</button><button id="delete-vertex" ${vertex?'':'disabled'}>− Point</button></div><button id="delete-sipes" ${s.sipes.length?'':'disabled'}>Clear sipes (${s.sipes.length})</button>`;
    $('#shape-phase').value=s.phase;$('#mirror-mode').value=s.mirror.mode;
    if(activeSipe!==null&&!s.sipes[activeSipe])activeSipe=null;
    $('#shape-properties').insertAdjacentHTML('beforeend',`<div class="sipe-list"><div class="section-eyebrow">CUT LINES / SIPES</div>${s.sipes.map((line,i)=>`<button data-select-sipe="${i}" aria-pressed="${activeSipe===i}">Cut ${i+1} · ${line.length} points</button>`).join('')}<button id="delete-cut" ${activeSipe===null?'disabled':''}>Delete selected cut</button></div>`);
    renderVertexFields();
  }
  function renderVertexFields(){
    const s=shape();if(!s||!$('#vertex-fields'))return;
    const point=vertex&&(vertex.sipe===null?s.points:s.sipes[vertex.sipe])?.[vertex.index];
    $('#vertex-fields').innerHTML=point?`<div class="section-eyebrow">${vertex.sipe===null?'OUTLINE':'SIPE'} VERTEX ${vertex.index+1}</div><div class="field-pair"><label>X / mm<input id="vertex-x" type="number" step=".5" value="${fmt(point[0]*units().w)}"/></label><label>Y / pitch (local)<input id="vertex-y" type="number" step=".025" value="${fmt(point[1])}"/></label></div>`:'<p class="editor-help">Select a circular handle for precise vertex coordinates.</p>';
    if($('#delete-vertex'))$('#delete-vertex').disabled=!point;
  }
  function renderCanvas(){
    if(!view)return;svg.setAttribute('viewBox',view.join(' '));
    const {w,p}=units(),s=shape();const path=(points,row=0)=>points.map(([x,y],i)=>`${i?'L':'M'}${x*w},${(y+row)*p}`).join(' ');
    let body=`<defs><pattern id="editor-grid" width="${w*.05}" height="${p*.25}" patternUnits="userSpaceOnUse"><path d="M ${w*.05} 0 L 0 0 0 ${p*.25}" fill="none" stroke="#272b30" stroke-width=".35"/></pattern></defs><rect x="-100000" y="-100000" width="200000" height="200000" fill="#101215"/><rect x="${-.5*w}" y="0" width="${w}" height="${2*p}" fill="url(#editor-grid)" stroke="#727b84" stroke-width=".6"/><path d="M ${-.5*w} ${p} H ${.5*w}" stroke="#606870" stroke-dasharray="2 2" stroke-width=".5"/><text x="${-.5*w}" y="${-p*.1}" fill="#929ca6" font-size="${w*.022}">← TYRE WIDTH / ${w} mm →</text><text x="${.52*w}" y="${p*.5}" fill="#65717e" font-size="${w*.025}">A</text><text x="${.52*w}" y="${p*1.5}" fill="#65717e" font-size="${w*.025}">B</text>`;
    for(let row=-2;row<4;row++)for(const b of designBlocks(design,(row%2+2)%2)){
      const index=design.shapes.findIndex(s=>s.id===b.sourceId),owner=design.shapes[index],ghost=row<0||row>1,isSource=b.instance==='source'&&row===sourceRow(owner);
      body+=`<g opacity="${ghost?.12:!isSource?.55:1}"><path d="${path(b.points,row)}Z" fill="${colors[index%colors.length]}" fill-opacity="${b.sourceId===selected?.28:.12}" stroke="${colors[index%colors.length]}" stroke-width="${b.sourceId===selected?1.1:.55}" ${isSource?'':'stroke-dasharray="2 1.3"'} ${ghost?'':`data-shape="${b.sourceId}" data-source="${isSource}"`}><title>${esc(b.name)} / ${b.instance}${isSource?' — drag to move':' — linked copy'}</title></path>`;
      for(const line of b.sipes)body+=`<path d="${path(line,row)}" fill="none" stroke="${colors[index%colors.length]}" stroke-width=".75" pointer-events="none"/>`;
      body+='</g>';
    }
    if(s&&s.enabled){
      const row=sourceRow(s),m=s.mirror;
      if(['width','point','both'].includes(m.mode))body+=`<path d="M ${m.axisX*w} ${-p*.4} V ${2.4*p}" stroke="#e79761" stroke-width=".7" stroke-dasharray="4 2" pointer-events="none"/>`;
      if(['travel','point','both'].includes(m.mode))body+=`<path d="M ${-.6*w} ${(m.axisY+row)*p} H ${.6*w}" stroke="#91b6d7" stroke-width=".7" stroke-dasharray="4 2" pointer-events="none"/>`;
      // Wider, invisible hit strokes make thin cut lines selectable at any zoom.
      s.sipes.forEach((line,si)=>{
        body+=`<path d="${path(line,row)}" fill="none" stroke="${activeSipe===si?'#d7f2ff':'#91c5dd'}" stroke-width="${activeSipe===si?1.3:.75}" pointer-events="none"/><path d="${path(line,row)}" fill="none" stroke="transparent" stroke-width="12" vector-effect="non-scaling-stroke" pointer-events="stroke" data-line="${si}"><title>Cut ${si+1}: drag line or blue points; Ctrl/Cmd-click to add a point</title></path>`;
      });
      const handle=(point,i,si)=>`<circle cx="${point[0]*w}" cy="${(point[1]+row)*p}" r="${view[2]*.006}" fill="${vertex?.index===i&&vertex?.sipe===si?'#fff':'#101215'}" stroke="${si===null?'#f4b284':'#91c5dd'}" stroke-width=".8" data-vertex="${i}" data-sipe="${si===null?'':si}"/>`;
      body+=s.points.map((pt,i)=>handle(pt,i,null)).join('');
      s.sipes.forEach((line,si)=>{body+=line.map((pt,i)=>handle(pt,i,si)).join('');});
    }
    if(draft.length)body+=`<path d="${path(draft)}" fill="none" stroke="#fff" stroke-width="1"/>${draft.map(([x,y])=>`<circle cx="${x*w}" cy="${y*p}" r="${view[2]*.005}" fill="#fff"/>`).join('')}`;
    svg.innerHTML=body;
    $('#finish-draw').hidden=$('#cancel-draw').hidden=tool==='select';$('#finish-draw').disabled=draft.length<(tool==='sipe'?2:3);
    $('#editor-instruction').textContent=tool==='select'?'Ctrl/Cmd + click: add · Alt + point: remove · Shift + drag: straight':`${tool==='sipe'?'Sipe':'Polygon'}: click points, then Finish or Enter · Escape cancels`;
    document.querySelectorAll('[data-tool]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.tool===tool));
  }
  const position=e=>{const point=new DOMPoint(e.clientX,e.clientY).matrixTransform(svg.getScreenCTM().inverse());return [point.x,point.y];};
  const normalized=e=>{const [x,y]=position(e),{w,p}=units();return [x/w,y/p].map(v=>fmt(snap?Math.round(v/.025)*.025:v));};
  function finish(){
    if(draft.length<(tool==='sipe'?2:3))return;
    if(tool==='polygon'&&!validPolygon(draft)){onMessage('Outline crosses itself. Cancel and draw a simple polygon.');return;}
    edit(()=>{if(tool==='sipe'){const s=shape();s.sipes.push(draft.map(([x,y])=>[x,y-sourceRow(s)]));}else{const s=newShape();s.name='Drawn polygon';s.points=clone(draft);s.phase='0';design.shapes.push(s);selected=s.id;}tool='select';draft=[];});
  }
  pane.addEventListener('click',e=>{
    const t=e.target.closest('[data-tool]');if(!t)return;
    if(t.dataset.tool==='sipe'&&!shape()){onMessage('Select a shape before drawing a sipe.');return;}tool=t.dataset.tool;draft=[];vertex=null;activeSipe=null;render();
  });
  svg.addEventListener('contextmenu',e=>e.preventDefault());
  function removeVertex(v=vertex){
    const s=shape();if(!s||!v)return;
    if(v.sipe===null&&s.points.length<=3){onMessage('A polygon needs at least three vertices.');return;}
    const removesCut=v.sipe!==null&&s.sipes[v.sipe].length<=2;
    edit(()=>{if(removesCut)s.sipes.splice(v.sipe,1);else(v.sipe===null?s.points:s.sipes[v.sipe]).splice(v.index,1);});
    if(removesCut)onMessage('Cut line removed — a line needs at least two points. Undo restores it.');
  }
  function insertAt(e){
    const hit=e.target.closest('[data-shape]');
    if(hit?.dataset.source==='false'){onMessage('That is a linked copy. Insert points on the solid source outline.');return;}
    if(hit?.dataset.source==='true'&&hit.dataset.shape!==selected){selected=hit.dataset.shape;vertex=null;activeSipe=null;}
    if(!shape()||!shape().enabled)return;
    if(e.target.closest('[data-vertex]'))return; // A handle is already a point.
    const point=normalized(e);point[1]-=sourceRow(shape());
    const scale=Math.hypot(svg.getScreenCTM().a,svg.getScreenCTM().b);
    const edge=nearestEdge(shape(),point,units(),10/scale);
    if(!edge){onMessage('Click closer to a solid outline or cut-line segment to insert a point.');render();return;}
    const s=shape();edit(()=>{(edge.sipe===null?s.points:s.sipes[edge.sipe]).splice(edge.index,0,edge.point);},{index:edge.index,sipe:edge.sipe});
  }
  function extendCut(e){
    const s=shape(),si=vertex?.sipe??activeSipe;
    if(si===null||!s?.sipes[si]){onMessage('Select a cut line or its endpoint before Ctrl/Cmd + Shift + click.');return;}
    const line=s.sipes[si],point=normalized(e);point[1]-=sourceRow(s);
    const prepend=vertex?.sipe===si&&vertex.index===0,index=prepend?0:line.length;
    const end=line[prepend?0:line.length-1];
    if(Math.hypot((point[0]-end[0])*units().w,(point[1]-end[1])*units().p)<.001)return;
    edit(()=>line.splice(index,0,point),{sipe:si,index});
  }
  svg.addEventListener('pointerdown',e=>{
    if(e.button===1||e.button===2){e.preventDefault();drag={type:'pan',start:position(e)};svg.setPointerCapture(e.pointerId);return;}
    if(e.button!==0)return;
    svg.focus();
    if(tool!=='select'){
      // Alt never pans/deletes the wrong object while drawing a new contour.
      if(e.altKey)return;
      let point=normalized(e);if(e.shiftKey&&draft.length)point=constrainPoint(point,draft.at(-1),units());
      if(!draft.length||Math.hypot(point[0]-draft.at(-1)[0],point[1]-draft.at(-1)[1])>1e-7)draft.push(point);
      renderCanvas();return;
    }
    const handle=e.target.closest('[data-vertex]');
    const handleVertex=handle?{index:Number(handle.dataset.vertex),sipe:handle.dataset.sipe===''?null:Number(handle.dataset.sipe)}:null;
    if(e.altKey){e.preventDefault();if(handleVertex)removeVertex(handleVertex);return;}
    if(e.ctrlKey||e.metaKey){e.preventDefault();if(e.shiftKey)extendCut(e);else insertAt(e);return;}
    const startClient=[e.clientX,e.clientY];
    if(handleVertex&&shape()){
      vertex=handleVertex;activeSipe=vertex.sipe;
      const line=vertex.sipe===null?shape().points:shape().sipes[vertex.sipe];
      drag={type:'vertex',start:[...line[vertex.index]],startClient,changed:false};
      renderProperties();svg.setPointerCapture(e.pointerId);renderCanvas();return;
    }
    const cut=e.target.closest('[data-line]');
    if(cut&&shape()){
      activeSipe=Number(cut.dataset.line);vertex=null;
      drag={type:'sipe',sipe:activeSipe,start:normalized(e),original:clone(shape().sipes[activeSipe]),startClient,changed:false};
      renderProperties();renderCanvas();svg.setPointerCapture(e.pointerId);return;
    }
    const hit=e.target.closest('[data-shape]');
    if(hit){selected=hit.dataset.shape;vertex=null;activeSipe=null;render();if(hit.dataset.source==='true'){drag={type:'shape',start:normalized(e),original:clone(shape()),startClient,changed:false};svg.setPointerCapture(e.pointerId);}}
    else{vertex=null;activeSipe=null;renderProperties();renderCanvas();}
  });
  svg.addEventListener('pointermove',e=>{
    if(!drag)return;
    if(drag.type==='pan'){
      const now=position(e);view[0]+=drag.start[0]-now[0];view[1]+=drag.start[1]-now[1];renderCanvas();return;
    }
    if(!drag.changed){
      if(Math.hypot(e.clientX-drag.startClient[0],e.clientY-drag.startClient[1])<2)return;
      remember();drag.changed=true;
    }
    const s=shape();let point=normalized(e);
    if(drag.type==='vertex'){
      point[1]-=sourceRow(s);if(e.shiftKey)point=constrainPoint(point,drag.start,units());
      const line=vertex.sipe===null?s.points:s.sipes[vertex.sipe];line[vertex.index]=point;renderVertexFields();
    }else{
      if(e.shiftKey)point=constrainPoint(point,drag.start,units());
      const dx=point[0]-drag.start[0],dy=point[1]-drag.start[1];
      if(drag.type==='sipe')s.sipes[drag.sipe]=drag.original.map(([x,y])=>[x+dx,y+dy]);
      else Object.assign(s,transformBlock(drag.original,([x,y])=>[x+dx,y+dy]));
    }
    renderCanvas();$('#editor-instruction').textContent=e.shiftKey?'Axis locked · release to rebuild the mesh':'Release to rebuild the 3D mesh';
  });
  function endDrag(){if(!drag)return;const changed=drag.changed;drag=null;if(changed){render();notify();}}
  svg.addEventListener('pointerup',endDrag);svg.addEventListener('pointercancel',endDrag);
  svg.addEventListener('wheel',e=>{e.preventDefault();const at=position(e),factor=e.deltaY>0?1.12:1/1.12;const width=view[2]*factor;if(width<units().w*.12||width>units().w*6)return;view=[at[0]+(view[0]-at[0])*factor,at[1]+(view[1]-at[1])*factor,width,view[3]*factor];renderCanvas();},{passive:false});
  svg.addEventListener('dblclick',e=>{
    if(tool!=='select'||e.altKey||e.ctrlKey||e.metaKey)return;
    e.preventDefault();insertAt(e);
  });
  sidebar.addEventListener('click',e=>{
    const select=e.target.closest('[data-select-shape]');if(select){selected=select.dataset.selectShape;vertex=null;activeSipe=null;tool='select';draft=[];render();}
  });
  sidebar.addEventListener('change',e=>{
    const target=e.target,s=shape();
    if(target.dataset.enableShape){edit(()=>design.shapes.find(s=>s.id===target.dataset.enableShape).enabled=target.checked);return;}
    if(target.id==='design-name'){edit(()=>design.name=target.value.trim()||'Untitled tread');return;}
    if(!s)return;
    if(target.id==='shape-name')edit(()=>s.name=target.value.trim()||'Shape');
    else if(target.id==='shape-phase')edit(()=>s.phase=target.value);
    else if(target.id==='mirror-mode')edit(()=>s.mirror.mode=target.value);
    else if(['shape-height','mirror-x','mirror-y','mirror-stagger','vertex-x','vertex-y'].includes(target.id)){
      const n=Number(target.value);if(!Number.isFinite(n)||target.value===''){renderProperties();return;}
      if(target.id==='shape-height')edit(()=>s.heightRatio=Math.max(.05,Math.min(1,n/100)));
      else if(target.id.startsWith('mirror-'))edit(()=>s.mirror[{'mirror-x':'axisX','mirror-y':'axisY','mirror-stagger':'stagger'}[target.id]]=Math.max(-50,Math.min(50,target.id==='mirror-x'?n/units().w:n)));
      else if(vertex){const v={...vertex};remember();const line=v.sipe===null?s.points:s.sipes[v.sipe];line[v.index][target.id==='vertex-x'?0:1]=Math.max(-50,Math.min(50,target.id==='vertex-x'?n/units().w:n));renderCanvas();notify();}
    }
  });
  sidebar.addEventListener('click',e=>{
    const id=e.target.closest('button')?.id,s=shape();
    const cut=e.target.closest('[data-select-sipe]');
    if(cut&&s){activeSipe=Number(cut.dataset.selectSipe);vertex=null;renderProperties();renderCanvas();}
    if(id==='delete-cut'&&s&&activeSipe!==null){const si=activeSipe;edit(()=>s.sipes.splice(si,1));}
    if(id==='add-shape')edit(()=>{const b=newShape($('#new-kind').value);b.name+=` ${design.shapes.length+1}`;design.shapes.push(b);selected=b.id;});
    if(id==='duplicate-shape'&&s)edit(()=>{const copy=transformBlock(clone(s),([x,y])=>[x+.025,y+.10]);copy.id=uid();copy.name=s.name.slice(0,90)+' copy';design.shapes.push(copy);selected=copy.id;});
    if(id==='delete-shape'&&s)edit(()=>{design.shapes=design.shapes.filter(b=>b.id!==s.id);selected=design.shapes[0]?.id;});
    if(id==='delete-sipes'&&s)edit(()=>s.sipes=[]);
    if(id==='bake-mirrors'&&s)edit(()=>{const copies=expandShape(s);s.mirror=defaultMirror();for(const b of copies.filter(b=>b.instance!=='source'))design.shapes.push({...b,id:uid(),name:(s.name+' '+b.instance).slice(0,100),mirror:defaultMirror()});});
    if(id==='rotate-shape'&&s){const angle=Number($('#shape-angle').value)*Math.PI/180;if(!Number.isFinite(angle))return;edit(()=>{const {w,p}=units(),cx=s.points.reduce((n,a)=>n+a[0],0)/s.points.length,cy=s.points.reduce((n,a)=>n+a[1],0)/s.points.length;Object.assign(s,transformBlock(s,([x,y])=>[cx+((x-cx)*w*Math.cos(angle)-(y-cy)*p*Math.sin(angle))/w,cy+((x-cx)*w*Math.sin(angle)+(y-cy)*p*Math.cos(angle))/p]));});}
    if(id==='add-vertex'&&s){
      const si=vertex?.sipe??activeSipe,line=si!==null?s.sipes[si]:s.points;
      const next=midpointInsertion(line,vertex?.index??0,si===null);
      edit(()=>line.splice(next.index,0,next.point),{sipe:si,index:next.index});
    }
    if(id==='delete-vertex'&&s&&vertex)removeVertex();
  });
  $('#finish-draw').onclick=finish;$('#cancel-draw').onclick=()=>{tool='select';draft=[];renderCanvas();};
  $('#editor-snap').onchange=e=>snap=e.target.checked;$('#fit-editor').onclick=fit;
  function history(from,to){if(!from.length)return;to.push(frame());const previous=from.pop();design=previous.design;onImport(previous.settings);selected=design.shapes.some(s=>s.id===selected)?selected:design.shapes[0]?.id;vertex=null;activeSipe=null;tool='select';draft=[];render();saveDraft();onChange(clone(design));warnings();}
  $('#undo-design').onclick=()=>history(undo,redo);$('#redo-design').onclick=()=>history(redo,undo);
  document.addEventListener('keydown',e=>{
    if(!document.body.classList.contains('designer-mode')||$('#info-dialog').open||['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName))return;
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();history(e.shiftKey?redo:undo,e.shiftKey?undo:redo);}
    if(e.key==='Escape'){$('#cancel-draw').click();}
    if(e.key==='Enter'&&tool!=='select'){e.preventDefault();finish();}
    if((e.key==='Delete'||e.key==='Backspace')&&document.activeElement===svg){e.preventDefault();$(vertex?'#delete-vertex':activeSipe!==null?'#delete-cut':'#delete-shape').click();}
  });
  function replace(next,record=true){if(record)remember();design=clone(next);selected=design.shapes[0]?.id;vertex=null;activeSipe=null;tool='select';draft=[];render();fit();saveDraft();onChange(clone(design));warnings();}
  $('#load-preset').onclick=()=>{if(design.modified&&!confirm('Replace the current design with this preset? You can undo, or save JSON first.'))return;onPreset($('#design-preset').value);};
  $('#blank-design').onclick=()=>{if(design.shapes.length&&!confirm('Start a blank tread? You can undo this.'))return;replace({...design,name:'Untitled tread',modified:true,shapes:[]});};
  $('#save-design').onclick=()=>{const {design:ignored,...settings}=getSettings();download(JSON.stringify({format:'frontier-tread',version:1,design,settings},null,2),'frontier-tread-project.json','application/json');};
  $('#load-design').onclick=()=>$('#design-file').click();
  $('#design-file').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>5*1024*1024)throw new Error('Project exceeds 5 MB');const data=JSON.parse(await file.text());if(data.format!=='frontier-tread'||data.version!==1)throw new Error('Choose a Frontier version-1 JSON project');validateDesign(data.design);const settings={...getSettings(),...data.settings,pattern:data.design.preset};delete settings.design;validateSettings(settings);if(design.modified&&!confirm('Replace the current design with this project?'))return;remember();onImport(settings);replace(data.design,false);onMessage('Project loaded — mirrors and dimensions restored');}catch(error){onMessage(`Cannot open project: ${error.message}`);}finally{e.target.value='';}};
  $('#export-svg').onclick=()=>download(designSVG(design,getSettings()),'frontier-tread-outlines.svg','image/svg+xml');
  $('#designer-reference').onclick=()=>$('#blueprint').dispatchEvent(new CustomEvent('click',{detail:{presetOnly:true}}));
  render();fit();warnings();
  let dimensions=JSON.stringify(units());
  return {getDesign:()=>clone(design),loadPreset:id=>{const p=PATTERNS.find(p=>p.id===id);remember();onImport({...getSettings(),pattern:id,width:p.width,depth:p.depth,repeats:p.repeats});replace(designFromPreset(id),false);},refresh:()=>{const next=JSON.stringify(units());if(dimensions!==next){dimensions=next;fit();renderProperties();}else renderCanvas();}};
}

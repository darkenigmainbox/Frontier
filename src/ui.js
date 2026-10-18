// Frontier UI panels — presets, properties, layers, validation, terrain, stats.
import { presetList, getPreset, drawPresetThumb, asphaltHalfWidth } from './presets.js';
import { validateProject, splitRoadAtNode, autoMergeIntersections, roadPoints } from './topology.js';
import { dist2D } from './geometry.js';
import { exportProjectJSON, importProjectJSON, exportOBJ } from './exporters.js';
import { buildDemoProject } from './demoCity.js';
import { createEmptyProject } from './state.js';

export function initUI(store, editor, view) {
  const $ = (id) => document.getElementById(id);
  const status = (l, m = '', r = '') => {
    if (l !== undefined) $('statusLeft').textContent = l;
    if (m !== undefined) $('statusMid').textContent = m;
    if (r !== undefined) $('statusRight').textContent = r;
  };

  // ---------- presets ----------
  let catFilter = 'all';
  document.querySelectorAll('.preset-filter button').forEach((b) => {
    b.onclick = () => {
      document.querySelectorAll('.preset-filter button').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
      catFilter = b.dataset.cat;
      renderPresets();
    };
  });
  function renderPresets() {
    const list = $('presetList');
    list.innerHTML = '';
    for (const p of presetList()) {
      if (catFilter !== 'all' && p.cat !== catFilter) continue;
      const card = document.createElement('div');
      card.className = 'preset-card' + (store.activePresetId === p.id ? ' active' : '');
      const cv = document.createElement('canvas');
      drawPresetThumb(cv, p);
      const info = document.createElement('div');
      info.className = 'pinfo';
      info.innerHTML = `<strong>${p.name}</strong><span>${p.desc}</span>`;
      card.appendChild(cv); card.appendChild(info);
      card.onclick = (e) => {
        if (e.shiftKey && store.selection) {
          // apply to selection
          store.pushUndo('apply preset');
          const sel = store.selection;
          if (sel.type === 'road') {
            const r = store.project.roads.find((x) => x.id === sel.id);
            if (r && p.kind === 'road') { r.presetId = p.id; if (p.defaultBridge) r.bridge = { enabled: true, height: p.bridgeHeight || 6, type: 'beam' }; }
          } else if (sel.type === 'rail') {
            const r = store.project.rails.find((x) => x.id === sel.id);
            if (r && (p.kind === 'rail' || p.kind === 'monorail')) { r.presetId = p.id; r.kind = p.kind; }
          }
          store.emit('roads'); renderProps(); renderPresets();
          return;
        }
        store.setPreset(p.id);
        if (p.kind === 'rail') store.setTool('rail');
        else if (p.kind === 'monorail') store.setTool('monorail');
        else if (p.cat === 'bridge') store.setTool('bridge');
        else store.setTool('road');
        syncToolbar(); renderPresets(); renderActive();
      };
      list.appendChild(card);
    }
    renderActive();
  }
  function renderActive() {
    const p = getPreset(store.activePresetId);
    const lanes = p.kind === 'road' ? `${p.lanesFwd || 0}↑ ${p.lanesBwd || 0}↓ · ${(p.laneWidth || 0).toFixed(1)}m` : p.kind === 'rail' ? `${p.tracks} track${p.tracks > 1 ? 's' : ''}` : `+${p.elevation}m beam`;
    $('activePreset').innerHTML = `<div class="ap">
      <div class="ap-row"><span>Preset</span><b>${p.name}</b></div>
      <div class="ap-row"><span>Layout</span><b>${lanes}</b></div>
      <div class="ap-row"><span>Half-width</span><b>${asphaltHalfWidth(p).toFixed(1)} m</b></div>
      <div class="ap-row"><span>Design speed</span><b>${p.designSpeed} km/h</b></div>
    </div>`;
  }

  // ---------- layers ----------
  const layerDefs = [
    ['terrain', 'Terrain'], ['water', 'Water'], ['roads', 'Roads'], ['markings', 'Markings'],
    ['sidewalks', 'Pavements'], ['rails', 'Rails'], ['junctions', 'Junctions'],
    ['buildings', 'Buildings'], ['trees', 'Trees'], ['grid', 'Grid'],
  ];
  function renderLayers() {
    const el = $('layerList');
    el.innerHTML = '';
    for (const [key, label] of layerDefs) {
      const lab = document.createElement('label');
      const cb = document.createElement('input');
      cb.type = 'checkbox'; cb.checked = !!store.layers[key];
      cb.onchange = () => { store.layers[key] = cb.checked; editor.dirty = true; };
      lab.appendChild(cb); lab.appendChild(document.createTextNode(label));
      el.appendChild(lab);
    }
  }

  // ---------- props ----------
  function roadLength(road) {
    const pts = roadPoints(store.project, road);
    let L = 0;
    const n = road.closed ? pts.length : pts.length - 1;
    for (let i = 0; i < n; i++) L += dist2D(pts[i % pts.length].x, pts[i % pts.length].z, pts[(i + 1) % pts.length].x, pts[(i + 1) % pts.length].z);
    return L;
  }
  function zoomToRoad(road) {
    const pts = roadPoints(store.project, road);
    if (!pts.length) return;
    const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const cz = pts.reduce((s, p) => s + p.z, 0) / pts.length;
    editor.focus(cx, cz, Math.max(editor.cam.scale, 1.6));
  }

  function renderProps() {
    const el = $('propsPanel');
    const sel = store.selection;
    el.innerHTML = '';
    const mkBtn = (label, fn) => { const b = document.createElement('button'); b.className = 'mini'; b.textContent = label; b.onclick = fn; return b; };
    if (!sel) {
      const p = store.project;
      el.innerHTML = `<div class="prop"><label>Project name</label><input id="projName" value="${(p.name || '').replace(/"/g, '&quot;')}" /></div>
        <div class="stat-row"><span>Roads</span><b>${p.roads.length}</b></div>
        <div class="stat-row"><span>Rails / monorails</span><b>${(p.rails || []).length}</b></div>
        <div class="stat-row"><span>Nodes</span><b>${Object.keys(p.nodes).length}</b></div>
        <div class="stat-row"><span>Roundabouts</span><b>${(p.roundabouts || []).length}</b></div>`;
      el.querySelector('#projName').onchange = (e) => { p.name = e.target.value; };
      const row = document.createElement('div'); row.className = 'prop-row';
      row.appendChild(mkBtn('🔗 Merge now', () => {
        store.pushUndo('auto-merge');
        const r = autoMergeIntersections(p);
        store.emit('roads'); renderValidation();
        status(`Merged ${r.merged} crossings`, '', '');
      }));
      row.appendChild(mkBtn('⌖ Fit city', () => editor.focus(0, 60, 0.85)));
      el.appendChild(row);
      return;
    }
    if (sel.type === 'road') {
      const r = store.project.roads.find((x) => x.id === sel.id);
      if (!r) { store.selection = null; renderProps(); return; }
      const preset = getPreset(r.presetId);
      el.innerHTML = `
        <div class="prop"><label>Name</label><input id="pName" value="${r.name.replace(/"/g, '&quot;')}" /></div>
        <div class="prop"><label>Preset</label><select id="pPreset">${presetList().filter((x) => x.kind === 'road').map((x) => `<option value="${x.id}" ${x.id === r.presetId ? 'selected' : ''}>${x.name}</option>`).join('')}</select></div>
        <div class="stat-row"><span>Length</span><b>${roadLength(r).toFixed(0)} m</b></div>
        <div class="stat-row"><span>Width</span><b>${(asphaltHalfWidth(preset) * 2).toFixed(1)} m</b></div>
        <div class="prop-grid">
          <div class="prop"><label>Bridge?</label><input id="pBridge" type="checkbox" ${r.bridge?.enabled ? 'checked' : ''} /></div>
          <div class="prop"><label>Clearance (m)</label><input id="pBH" type="number" step="0.5" min="0" max="30" value="${r.bridge?.height ?? 6}" /></div>
          <div class="prop"><label>Bridge type</label><select id="pBT"><option value="beam" ${r.bridge?.type === 'beam' ? 'selected' : ''}>beam</option><option value="arch" ${r.bridge?.type === 'arch' ? 'selected' : ''}>arch</option></select></div>
          <div class="prop"><label>Smooth curve</label><input id="pSmooth" type="checkbox" ${r.smooth !== false ? 'checked' : ''} /></div>
        </div>`;
      const upd = () => { store.pushUndo('edit road'); };
      el.querySelector('#pName').onchange = (e) => { upd(); r.name = e.target.value; store.emit('roads'); };
      el.querySelector('#pPreset').onchange = (e) => { upd(); r.presetId = e.target.value; const np = getPreset(r.presetId); if (np.defaultBridge) r.bridge = { enabled: true, height: np.bridgeHeight || 6, type: 'beam' }; store.emit('roads'); renderProps(); };
      el.querySelector('#pBridge').onchange = (e) => { upd(); r.bridge = { ...(r.bridge || {}), enabled: e.target.checked, height: r.bridge?.height ?? 6, type: r.bridge?.type || 'beam' }; store.emit('roads'); renderValidation(); };
      el.querySelector('#pBH').onchange = (e) => { upd(); r.bridge = { ...(r.bridge || {}), height: Number(e.target.value) }; store.emit('roads'); };
      el.querySelector('#pBT').onchange = (e) => { upd(); r.bridge = { ...(r.bridge || {}), type: e.target.value }; store.emit('roads'); };
      el.querySelector('#pSmooth').onchange = (e) => { upd(); r.smooth = e.target.checked; store.emit('roads'); };
      const row = document.createElement('div'); row.className = 'prop-row';
      row.appendChild(mkBtn('✂ Split mid', () => {
        if (r.nodeIds.length < 3 || r.closed) return;
        store.pushUndo('split road');
        splitRoadAtNode(store.project, r.id, Math.floor(r.nodeIds.length / 2));
        store.emit('roads'); renderProps();
      }));
      row.appendChild(mkBtn('⌖ Zoom', () => zoomToRoad(r)));
      row.appendChild(mkBtn('🗑 Delete', () => { store.pushUndo('delete road'); store.deleteRoad(r.id); store.emit('roads'); renderProps(); }));
      el.appendChild(row);
      return;
    }
    if (sel.type === 'rail') {
      const r = store.project.rails.find((x) => x.id === sel.id);
      if (!r) { store.selection = null; renderProps(); return; }
      el.innerHTML = `
        <div class="prop"><label>Name</label><input id="pName" value="${r.name.replace(/"/g, '&quot;')}" /></div>
        <div class="prop"><label>Preset</label><select id="pPreset">${presetList().filter((x) => x.kind !== 'road').map((x) => `<option value="${x.id}" ${x.id === r.presetId ? 'selected' : ''}>${x.name}</option>`).join('')}</select></div>
        <div class="stat-row"><span>Type</span><b>${r.kind}</b></div>
        <div class="prop-grid">
          <div class="prop"><label>Viaduct?</label><input id="pBridge" type="checkbox" ${r.bridge?.enabled ? 'checked' : ''} /></div>
          <div class="prop"><label>Clearance</label><input id="pBH" type="number" step="0.5" min="0" max="20" value="${r.bridge?.height ?? 4}" /></div>
        </div>`;
      el.querySelector('#pName').onchange = (e) => { store.pushUndo('edit rail'); r.name = e.target.value; store.emit('roads'); };
      el.querySelector('#pPreset').onchange = (e) => { store.pushUndo('edit rail'); r.presetId = e.target.value; r.kind = getPreset(r.presetId).kind; store.emit('roads'); renderProps(); };
      el.querySelector('#pBridge').onchange = (e) => { store.pushUndo('edit rail'); r.bridge = { enabled: e.target.checked, height: r.bridge?.height ?? 4, type: 'beam' }; store.emit('roads'); };
      el.querySelector('#pBH').onchange = (e) => { store.pushUndo('edit rail'); r.bridge = { ...(r.bridge || {}), height: Number(e.target.value) }; store.emit('roads'); };
      const row = document.createElement('div'); row.className = 'prop-row';
      row.appendChild(mkBtn('⌖ Zoom', () => {
        const pts = r.nodeIds.map((id) => store.project.nodes[id]).filter(Boolean);
        if (pts.length) editor.focus(pts[0].x, pts[0].z, 1.4);
      }));
      row.appendChild(mkBtn('🗑 Delete', () => { store.pushUndo('delete rail'); store.deleteRail(r.id); store.emit('roads'); renderProps(); }));
      el.appendChild(row);
      return;
    }
    if (sel.type === 'node') {
      const n = store.project.nodes[sel.nodeId];
      if (!n) { store.selection = null; renderProps(); return; }
      const linked = store.project.roads.filter((r) => r.nodeIds.includes(n.id)).map((r) => r.name);
      el.innerHTML = `
        <div class="prop-grid">
          <div class="prop"><label>X</label><input id="pX" type="number" step="1" value="${n.x.toFixed(1)}" /></div>
          <div class="prop"><label>Z</label><input id="pZ" type="number" step="1" value="${n.z.toFixed(1)}" /></div>
          <div class="prop"><label>Lift h (m)</label><input id="pH" type="number" step="0.5" value="${(n.h || 0).toFixed(1)}" /></div>
        </div>
        <div class="stat-row"><span>On roads</span><b>${linked.length}</b></div>
        <p class="muted" style="font-size:11px;margin:4px 0">Lift raises the road here — use for overpasses, ramps & interchanges.</p>`;
      const apply = () => {
        store.pushUndo('edit node');
        n.x = Number(el.querySelector('#pX').value); n.z = Number(el.querySelector('#pZ').value); n.h = Number(el.querySelector('#pH').value);
        store.emit('roads');
      };
      el.querySelector('#pX').onchange = apply; el.querySelector('#pZ').onchange = apply; el.querySelector('#pH').onchange = apply;
      const row = document.createElement('div'); row.className = 'prop-row';
      row.appendChild(mkBtn('⌖ Zoom', () => editor.focus(n.x, n.z, 3)));
      row.appendChild(mkBtn('🗑 Delete', () => { store.pushUndo('delete node'); store.deleteNode(n.id); store.selection = null; store.emit('roads'); renderProps(); }));
      el.appendChild(row);
      return;
    }
    if (sel.type === 'roundabout') {
      const rb = store.project.roundabouts.find((x) => x.id === sel.id);
      if (!rb) { store.selection = null; renderProps(); return; }
      el.innerHTML = `
        <div class="stat-row"><span>Position</span><b>${rb.x.toFixed(0)}, ${rb.z.toFixed(0)}</b></div>
        <div class="prop"><label>Radius (m)</label><input id="pR" type="number" step="1" min="9" max="30" value="${rb.radius}" /></div>
        <p class="muted" style="font-size:11px">Draw roads snapping to the 4 edge nodes to connect streets.</p>`;
      el.querySelector('#pR').onchange = (e) => {
        store.pushUndo('edit roundabout');
        const nr = Number(e.target.value);
        const k = nr / rb.radius;
        rb.radius = nr;
        for (const nid of rb.nodeIds || []) {
          const n = store.project.nodes[nid];
          if (n) { n.x = rb.x + (n.x - rb.x) * k; n.z = rb.z + (n.z - rb.z) * k; }
        }
        store.emit('roads');
      };
      const row = document.createElement('div'); row.className = 'prop-row';
      row.appendChild(mkBtn('⌖ Zoom', () => editor.focus(rb.x, rb.z, 3)));
      row.appendChild(mkBtn('🗑 Delete', () => {
        store.pushUndo('delete roundabout');
        store.project.roundabouts = store.project.roundabouts.filter((x) => x.id !== rb.id);
        store.selection = null; store.emit('roads'); renderProps();
      }));
      el.appendChild(row);
      return;
    }
  }

  // ---------- validation ----------
  let valTimer = null;
  function renderValidation() {
    const el = $('validationList');
    let res;
    try { res = validateProject(store.project); } catch (e) { el.innerHTML = '<p class="muted">—</p>'; return; }
    el.innerHTML = '';
    for (const issue of res.issues.slice(0, 30)) {
      const d = document.createElement('div');
      d.className = 'issue ' + (issue.level === 'err' ? 'err' : issue.level === 'warn' ? 'warn' : 'ok');
      d.textContent = issue.msg;
      if (issue.x !== undefined) d.onclick = () => editor.focus(issue.x, issue.z, 2.2);
      else if (issue.roadId) d.onclick = () => { store.selection = { type: 'road', id: issue.roadId }; renderProps(); };
      el.appendChild(d);
    }
    status(undefined, `${res.junctions.length} junctions · ${res.crossings} open crossings`, `${store.project.roads.length} roads · ${(store.project.rails || []).length} rails`);
  }
  function scheduleValidation() { clearTimeout(valTimer); valTimer = setTimeout(renderValidation, 400); }

  // ---------- terrain ----------
  function renderTerrainPanel() {
    const el = $('terrainPanel');
    const s = store.project.settings;
    el.innerHTML = `
      <div class="prop"><label>Water level: <b id="wlVal">${(s.waterLevel ?? 1.25).toFixed(2)} m</b></label>
      <input id="wl" type="range" min="-1" max="5" step="0.05" value="${s.waterLevel ?? 1.25}" /></div>
      <div class="prop"><label>Brush size: <b id="bsVal">${store.brush.size} m</b></label>
      <input id="bs" type="range" min="10" max="130" step="2" value="${store.brush.size}" /></div>
      <div class="prop"><label>Brush strength: <b id="btVal">${store.brush.strength}</b></label>
      <input id="bt" type="range" min="1" max="10" step="1" value="${store.brush.strength}" /></div>
      <div class="prop-row"><button class="mini" id="btnClearEdits">Clear sculpting (${(store.project.terrainEdits || []).length})</button></div>`;
    el.querySelector('#wl').oninput = (e) => {
      s.waterLevel = Number(e.target.value);
      el.querySelector('#wlVal').textContent = s.waterLevel.toFixed(2) + ' m';
      scheduleTerrainEmit();
    };
    el.querySelector('#bs').oninput = (e) => { store.brush.size = Number(e.target.value); el.querySelector('#bsVal').textContent = store.brush.size + ' m'; };
    el.querySelector('#bt').oninput = (e) => { store.brush.strength = Number(e.target.value); el.querySelector('#btVal').textContent = store.brush.strength; };
    el.querySelector('#btnClearEdits').onclick = () => { store.pushUndo('clear sculpting'); store.project.terrainEdits = []; store.emit('terrain'); renderTerrainPanel(); };
  }
  let terrTimer = null;
  function scheduleTerrainEmit() { clearTimeout(terrTimer); terrTimer = setTimeout(() => store.emit('terrain'), 200); }

  // ---------- mesh stats ----------
  function updateMeshStats(stats, info) {
    const t = stats._total;
    $('meshStats').innerHTML = `
      <div class="stat-row"><span>Quads</span><b>${t.quads.toLocaleString()}</b></div>
      <div class="stat-row"><span>Tris</span><b>${t.tris.toLocaleString()}</b></div>
      <div class="stat-row"><span>Verts</span><b>${t.verts.toLocaleString()}</b></div>
      <div class="stat-row"><span>Road / junction quads</span><b>${(stats.asphalt.quads + stats.junction.quads).toLocaleString()}</b></div>
      <div class="stat-row"><span>Marking quads</span><b>${stats.marking.quads.toLocaleString()}</b></div>
      <div class="stat-row"><span>Buildings / trees</span><b>${info.buildings} / ${info.trees}</b></div>
      <div class="stat-row"><span>Build time</span><b>${info.ms} ms</b></div>`;
    const s3 = document.getElementById('stats3d');
    s3.textContent = `${t.quads.toLocaleString()} quads · ${info.junctions} junctions · ${info.crossings} level crossings · drag = orbit`;
    s3.classList.add('show');
    clearTimeout(s3._t);
    s3._t = setTimeout(() => s3.classList.remove('show'), 5000);
  }

  // ---------- toolbar ----------
  function syncToolbar() {
    document.querySelectorAll('#toolGroup .tool-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.tool === store.tool);
    });
    const names = { select: 'Select — click road/node · drag = pan · dbl-click road = insert node', road: 'Road — click points · snap to green rings · dbl-click/Enter = done', rail: 'Rail — click points · dbl-click/Enter = done', monorail: 'Monorail — click points · dbl-click/Enter = done', bridge: 'Bridge — draws elevated road with piers', roundabout: 'Roundabout — click to place', terrainUp: 'Raise — drag to sculpt hills', terrainDown: 'Lower — drag to dig', water: 'Water — drag to carve lakes', erase: 'Erase — click road / node / rail' };
    $('toolStatus').textContent = names[store.tool] || store.tool;
    status(`${store.tool} · ${getPreset(store.activePresetId).name}`);
  }
  document.querySelectorAll('#toolGroup .tool-btn').forEach((b) => {
    b.onclick = () => { store.setTool(b.dataset.tool); syncToolbar(); };
  });
  $('btnUndo').onclick = () => { store.undo(); renderProps(); renderValidation(); renderTerrainPanel(); };
  $('btnRedo').onclick = () => { store.redo(); renderProps(); renderValidation(); renderTerrainPanel(); };
  $('btnSnap').onclick = (e) => { store.snap = !store.snap; e.target.classList.toggle('active', store.snap); };
  $('btnAutoMerge').onclick = (e) => {
    store.project.settings.autoMerge = !(store.project.settings.autoMerge !== false);
    e.target.classList.toggle('active', store.project.settings.autoMerge !== false);
    if (store.project.settings.autoMerge) { store.pushUndo('auto-merge'); autoMergeIntersections(store.project); store.emit('roads'); }
  };
  $('btnFollowTerrain').onclick = (e) => {
    store.project.settings.followTerrain = !(store.project.settings.followTerrain !== false);
    e.target.classList.toggle('active', store.project.settings.followTerrain !== false);
    store.emit('terrain');
  };
  $('btnDemo').onclick = () => {
    if (!confirm('Load the demo city? Current work will be replaced.')) return;
    store.pushUndo('load demo');
    store.project = buildDemoProject();
    try { autoMergeIntersections(store.project); autoMergeIntersections(store.project); } catch (err) { /* ignore */ }
    store.selection = null;
    editor.focus(0, 60, 0.85);
    store.emit('all'); renderProps(); renderValidation(); renderTerrainPanel();
  };
  $('btnClear').onclick = () => {
    if (!confirm('Start a new empty project?')) return;
    store.pushUndo('new project');
    store.project = createEmptyProject('Untitled network');
    store.selection = null;
    store.emit('all'); renderProps(); renderValidation(); renderTerrainPanel();
  };
  $('btnSave').onclick = () => exportProjectJSON(store.project);
  $('btnLoad').onclick = () => $('fileInput').click();
  $('fileInput').onchange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const p = await importProjectJSON(f);
      store.pushUndo('load project');
      store.project = p;
      store.selection = null;
      store.emit('all'); renderProps(); renderValidation(); renderTerrainPanel();
      status(`Loaded ${f.name}`);
    } catch (err) { alert('Could not load project: ' + err.message); }
    e.target.value = '';
  };
  $('btnOBJ').onclick = () => exportOBJ(store.project, (m) => status(m));
  $('btnValidate').onclick = renderValidation;
  $('tglCars').onchange = (e) => { view.showCars = e.target.checked; };
  $('tglTrains').onchange = (e) => { view.showTrains = e.target.checked; };
  $('tglWire').onchange = (e) => { view.setWireframe(e.target.checked); };
  $('btnFlyover').onclick = (e) => {
    view.flyover = !view.flyover;
    view.controls.enabled = !view.flyover;
    e.target.textContent = view.flyover ? '⏹ Stop' : '✈ Flyover';
  };

  // keyboard
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    const k = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && k === 'z' && !e.shiftKey) { e.preventDefault(); store.undo(); renderProps(); renderValidation(); return; }
    if ((e.ctrlKey || e.metaKey) && (k === 'y' || (k === 'z' && e.shiftKey))) { e.preventDefault(); store.redo(); renderProps(); renderValidation(); return; }
    const toolKeys = { v: 'select', r: 'road', t: 'rail', m: 'monorail', b: 'bridge', o: 'roundabout', u: 'terrainUp', j: 'terrainDown', w: 'water' };
    if (toolKeys[k]) { store.setTool(toolKeys[k]); syncToolbar(); }
    else if (k === 'enter') editor.finishDraft();
    else if (k === 'escape') editor.cancelDraft();
    else if ((k === 'delete' || k === 'backspace') && store.selection) {
      const sel = store.selection;
      store.pushUndo('delete');
      if (sel.type === 'road') store.deleteRoad(sel.id);
      else if (sel.type === 'rail') store.deleteRail(sel.id);
      else if (sel.type === 'node') store.deleteNode(sel.nodeId);
      else if (sel.type === 'roundabout') store.project.roundabouts = store.project.roundabouts.filter((x) => x.id !== sel.id);
      store.selection = null;
      store.emit('roads'); renderProps();
    }
  });

  store.subscribe((what) => {
    if (what === 'all' || what === 'roads') { renderProps(); scheduleValidation(); }
    if (what === 'tool' || what === 'preset') syncToolbar();
    if (what === 'all') renderTerrainPanel();
  });

  renderPresets(); renderLayers(); renderProps(); renderValidation(); renderTerrainPanel(); syncToolbar();
  return { renderProps, renderValidation, renderTerrainPanel, updateMeshStats, status };
}

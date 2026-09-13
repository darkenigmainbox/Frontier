// Frontier — app wiring: graph <-> sim loop <-> viewport <-> paint.

import { Graph, buildDefaultGraph, makeNode, NODE_DEFS } from './nodes.js';
import { Renderer } from './gl.js';
import { NodeEditor, ParamPanel, fmtInt, fmtM3 } from './ui.js';

const $ = (id) => document.getElementById(id);

const WORLDS = {
  draft: { nx: 160, ny: 40, nz: 160, minY: -140, sizeY: 640 },
  standard: { nx: 256, ny: 64, nz: 256, minY: -140, sizeY: 640 },
};

const app = {
  graph: buildDefaultGraph(),
  renderer: null,
  editor: null,
  panel: null,
  simulating: true,
  paintMode: false,
  painting: false,
  erase: false,
  lastMeshVersion: -1,
  lastMeshTime: 0,
  regenTimer: 0,
  fps: 60,
};

function status(html) { $('status').innerHTML = html; }

function selectedPaint() {
  const id = app.editor && app.editor.selected;
  const n = id && app.graph.nodes.get(id);
  if (n && n.type === 'PaintMask') return n;
  for (const x of app.graph.nodes.values()) if (x.type === 'PaintMask') return x;
  return null;
}

function paintChannelArray(vol, ch) {
  return ch === 0 ? vol.paintRain : ch === 1 ? vol.paintHard : vol.paintMoist;
}

// CPU sphere-trace pick against the live SDF.
function pickTerrain(px, py) {
  const vol = app.graph.ctx.vol;
  if (!vol) return null;
  const ray = app.renderer.pickRay(px, py);
  let t = 0;
  const vox = vol.voxel;
  for (let i = 0; i < 160; i++) {
    const x = ray.origin[0] + ray.dir[0] * t;
    const y = ray.origin[1] + ray.dir[1] * t;
    const z = ray.origin[2] + ray.dir[2] * t;
    if (t > 8000) return null;
    if (!vol.inside(x, y, z)) { t += vox * 2; continue; }
    const d = vol.sample(x, y, z);
    if (d < vox * 0.2) {
      // refine
      let lo = Math.max(0, t - vox * 2), hi = t;
      for (let b = 0; b < 8; b++) {
        const mid = (lo + hi) / 2;
        const dd = vol.sample(ray.origin[0] + ray.dir[0] * mid, ray.origin[1] + ray.dir[1] * mid, ray.origin[2] + ray.dir[2] * mid);
        if (dd < 0) hi = mid; else lo = mid;
      }
      const ht = (lo + hi) / 2;
      return { x: ray.origin[0] + ray.dir[0] * ht, y: ray.origin[1] + ray.dir[1] * ht, z: ray.origin[2] + ray.dir[2] * ht };
    }
    t += Math.max(d * 0.85, vox * 0.3);
  }
  return null;
}

let paintTexTimer = 0;
function doPaint(e) {
  const vol = app.graph.ctx.vol;
  const pn = selectedPaint();
  if (!vol || !pn) return;
  const hit = pickTerrain(e.clientX, e.clientY);
  if (!hit) return;
  const ch = Math.round(pn.params.channel);
  vol.paint2D(paintChannelArray(vol, ch), hit.x, hit.z, pn.params.brush, pn.params.flow * pn.params.value, app.erase ? 'sub' : 'add');
  const now = Date.now();
  if (now - paintTexTimer > 90) {
    paintTexTimer = now;
    app.renderer.updatePaint(vol);
  }
  status(`painting <b>${['rain', 'hardness', 'moisture'][ch]}</b> @ (${hit.x.toFixed(0)}, ${hit.z.toFixed(0)}) — Alt+drag erases`);
}

async function regenerate(reason) {
  const q = $('quality').value;
  const world = WORLDS[q] || WORLDS.standard;
  $('progress').style.display = 'flex';
  const bar = $('progress-bar'), lab = $('progress-label');
  try {
    await app.graph.evaluate(world, (f, stage) => {
      bar.style.width = (f * 100).toFixed(0) + '%';
      lab.textContent = `${reason}: ${stage} ${(f * 100).toFixed(0)}%`;
    });
    afterMesh(true);
    status(`generated <b>${q}</b> island — ${fmtInt(app.graph.ctx.mesh.verts)} verts, ${fmtInt(app.graph.ctx.mesh.tris)} tris, mesh ${app.graph.ctx.mesh.ms.toFixed(0)} ms`);
  } catch (err) {
    status('generate failed: ' + err.message);
  }
  $('progress').style.display = 'none';
}

function afterMesh(full) {
  const { vol, mesh } = app.graph.ctx;
  if (!vol || !mesh) return;
  app.renderer.setMesh(mesh);
  app.renderer.updatePaint(vol);
  app.renderer.updateShore(vol, app.graph.seaLevel());
  app.lastMeshVersion = vol.version;
  app.lastMeshTime = Date.now();
  if (full) applyShade();
}

function applyShade() {
  const shade = [...app.graph.nodes.values()].find((n) => n.type === 'SatmapShade');
  if (shade) {
    const r = app.renderer;
    r.shade.mode = Math.round(shade.params.mode);
    r.shade.sunAzim = shade.params.sunAzim;
    r.shade.sunElev = shade.params.sunElev;
    r.shade.snowline = shade.params.snowline;
    r.shade.saturation = shade.params.saturation;
    r.shade.seaLevel = shade.params.seaLevel;
    r.shade.showPaint = app.paintMode ? 1 : 0;
    const pn = selectedPaint();
    r.shade.paintCh = pn ? Math.round(pn.params.channel) : 0;
    const vm = $('viewmode');
    if (vm && +vm.value !== r.shade.mode) vm.value = String(r.shade.mode);
  }
}

function scheduleRegen(reason, ms = 350) {
  clearTimeout(app.regenTimer);
  app.regenTimer = setTimeout(() => regenerate(reason), ms);
}

function onParam(node, p, committed) {
  const def = NODE_DEFS[node.type];
  if (node.type === 'SatmapShade') { applyShade(); return; }
  if (node.type === 'MaskBake') {
    if (committed) { app.graph.remesh(); afterMesh(false); }
    return;
  }
  if (node.type === 'PaintMask') { applyShade(); return; }
  if (def.eroder) {
    const sim = node.sim;
    if (sim) sim.setParams(app.graph.eroderParams(node));
    if (p.name === 'seed' && committed) {
      const s = app.graph.bindSim(node, true);
      if (s) s.reset();
    }
    app.editor.refresh();
    return;
  }
  // generator param -> structural regen (debounced)
  scheduleRegen('regenerate');
}

function onEroderButton(id, btn) {
  const n = app.graph.nodes.get(id);
  if (!n) return;
  const sim = app.graph.bindSim(n);
  if (btn === 'play' && sim) {
    sim.p.active = !sim.p.active;
  }
  if (btn === 'reset') {
    const s = app.graph.bindSim(n, true);
    if (s) { s.reset(); }
  }
  app.editor.refresh();
  refreshPanelStats();
}

function refreshPanelStats() {
  const id = app.editor.selected;
  const n = id && app.graph.nodes.get(id);
  if (!n || !NODE_DEFS[n.type].eroder || !n.sim) return;
  const s = n.sim;
  app.panel.updateStats(
    `carved <b>${fmtM3(s.carved || 0)}</b> · deposited <b>${fmtM3(s.deposited || 0)}</b><br>` +
    (s.pool ? `alive <b>${fmtInt(s.pool.alive)}</b> · retired <b>${fmtInt(s.retired)}</b>` : `iterations <b>${fmtInt(s.iters || 0)}</b>`)
  );
}

function exportOBJ() {
  const mesh = app.graph.ctx.mesh;
  if (!mesh) return;
  const P = mesh.positions, N = mesh.normals, I = mesh.indices;
  let s = '# Frontier SDF island export\n# verts ' + mesh.verts + ' tris ' + mesh.tris + '\n';
  const CH = 20000;
  const parts = [s];
  for (let v = 0; v < mesh.verts; v++) parts.push(`v ${P[v * 3].toFixed(2)} ${P[v * 3 + 1].toFixed(2)} ${P[v * 3 + 2].toFixed(2)}\n`);
  for (let v = 0; v < mesh.verts; v++) parts.push(`vn ${N[v * 3].toFixed(4)} ${N[v * 3 + 1].toFixed(4)} ${N[v * 3 + 2].toFixed(4)}\n`);
  for (let t = 0; t < I.length; t += 3) parts.push(`f ${I[t] + 1}//${I[t] + 1} ${I[t + 1] + 1}//${I[t + 1] + 1} ${I[t + 2] + 1}//${I[t + 2] + 1}\n`);
  void CH;
  const blob = new Blob(parts, { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'frontier-island.obj';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  status('exported <b>frontier-island.obj</b>');
}

// ---------- frame loop ----------
let lastT = 0, statT = 0;
function frame(t) {
  requestAnimationFrame(frame);
  const dt = t - lastT; lastT = t;
  if (dt > 0) app.fps = app.fps * 0.95 + (1000 / dt) * 0.05;
  const g = app.graph;
  // simulate
  if (app.simulating && g.ctx.vol) {
    const active = g.simulateTick(9);
    // upload rain viz points (rain preferred, else wind)
    const chain = g.eroderChain();
    const rain = chain.find((n) => n.type === 'RainSDF' && n.sim && n.sim.pool.posCount > 0);
    const wind = chain.find((n) => n.type === 'WindSDF' && n.sim && n.sim.pool.posCount > 0);
    const src = rain || wind;
    if (src) app.renderer.setRainPositions(src.sim.pool.positions, src.sim.pool.posCount);
    // progressive remesh
    const vol = g.ctx.vol;
    if (vol.version !== app.lastMeshVersion && (Date.now() - app.lastMeshTime > 2600 || !active)) {
      g.remesh();
      afterMesh(false);
    }
    if (t - statT > 600) {
      statT = t;
      app.editor.refresh();
      refreshPanelStats();
      let carved = 0, dep = 0;
      for (const n of chain) {
        if (n.sim) { carved += n.sim.carved || 0; dep += n.sim.deposited || 0; }
      }
      const m = g.ctx.mesh;
      $('simstats').innerHTML =
        `carved <b>${fmtM3(carved)}</b> · deposited <b>${fmtM3(dep)}</b> · ` +
        (m ? `${fmtInt(m.verts)}v/${fmtInt(m.tris)}t` : 'no mesh') +
        ` · ${app.fps.toFixed(0)} fps` + (active ? '' : ' · <span class="idle">sim idle</span>');
    }
  }
  app.renderer.frame(t / 1000);
}

// ---------- boot ----------
function boot() {
  const canvas = $('view');
  app.renderer = new Renderer(canvas);
  app.editor = new NodeEditor($('nodes'), app.graph, {
    onSelect: (id) => {
      const n = id && app.graph.nodes.get(id);
      app.panel.show(n);
      applyShade();
    },
    onStructure: () => scheduleRegen('regenerate', 500),
    onEroderButton,
    onAddMenu: (cx, cy, wx, wy) => showAddMenu(cx, cy, wx, wy),
  });
  app.panel = new ParamPanel($('params'), { onParam, onEroderButton });
  app.panel.show(null);

  // toolbar
  $('generate').onclick = () => regenerate('generate');
  $('simtoggle').onclick = () => {
    app.simulating = !app.simulating;
    $('simtoggle').textContent = app.simulating ? '⏸ Pause sim' : '▶ Resume sim';
    $('simtoggle').classList.toggle('off', !app.simulating);
  };
  $('resetero').onclick = () => { scheduleRegen('reset + regenerate', 10); };
  $('remesh').onclick = () => { app.graph.remesh(); afterMesh(false); status('remeshed'); };
  $('export').onclick = exportOBJ;
  $('quality').onchange = () => scheduleRegen('regenerate', 10);
  $('painttoggle').onclick = () => setPaint(!app.paintMode);
  $('seashow').onchange = (e) => (app.renderer.showSea = e.target.checked);
  $('rainshow').onchange = (e) => (app.renderer.showRain = e.target.checked);
  $('viewmode').onchange = (e) => {
    const shade = [...app.graph.nodes.values()].find((n) => n.type === 'SatmapShade');
    if (shade) { shade.params.mode = +e.target.value; applyShade(); }
  };

  // paint interactions on 3D canvas
  canvas.addEventListener('pointerdown', (e) => {
    if (!app.paintMode) return;
    app.painting = true;
    app.erase = e.altKey || e.button === 2;
    app.renderer.pickMode = true;
    doPaint(e);
    e.preventDefault();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (app.painting && app.paintMode) { app.erase = e.altKey; doPaint(e); }
  });
  const stopPaint = () => { app.painting = false; app.renderer.pickMode = false; if (app.graph.ctx.vol) app.renderer.updatePaint(app.graph.ctx.vol); };
  canvas.addEventListener('pointerup', stopPaint);
  canvas.addEventListener('pointerleave', stopPaint);
  canvas.addEventListener('contextmenu', (e) => { if (app.paintMode) e.preventDefault(); });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'b' || e.key === 'B') setPaint(true);
    if (e.key === ' ' && e.target === document.body) { $('simtoggle').click(); e.preventDefault(); }
  });
  window.addEventListener('keyup', (e) => { if (e.key === 'b' || e.key === 'B') setPaint(false); });

  window.addEventListener('resize', () => app.editor.refresh());
  requestAnimationFrame(frame);
  regenerate('generate');
}

function setPaint(on) {
  app.paintMode = on;
  $('painttoggle').classList.toggle('on', on);
  $('painttoggle').textContent = on ? '🖌 Painting (B)' : '🖌 Paint (B)';
  $('view').style.cursor = on ? 'crosshair' : 'default';
  applyShade();
}

function showAddMenu(cx, cy, wx, wy) {
  document.querySelectorAll('.addmenu').forEach((m) => m.remove());
  const div = document.createElement('div');
  div.className = 'addmenu';
  div.style.left = cx + 'px';
  div.style.top = cy + 'px';
  const cats = {};
  for (const [type, def] of Object.entries(NODE_DEFS)) {
    if (type === 'Output') continue;
    (cats[def.category] = cats[def.category] || []).push([type, def]);
  }
  for (const [cat, list] of Object.entries(cats)) {
    const h = document.createElement('div');
    h.className = 'addmenu-cat';
    h.textContent = cat;
    div.appendChild(h);
    for (const [type, def] of list) {
      const b = document.createElement('button');
      b.innerHTML = `<span class="pp-dot" style="background:${def.color}"></span>${def.title}`;
      b.onclick = () => {
        const n = makeNode(type, wx, wy);
        app.graph.addNode(n);
        if (NODE_DEFS[type].eroder && app.graph.ctx.vol) { app.graph.bindSim(n, true); }
        div.remove();
        app.editor.refresh();
      };
      div.appendChild(b);
    }
  }
  document.body.appendChild(div);
  const close = (e) => { if (!div.contains(e.target)) { div.remove(); window.removeEventListener('pointerdown', close); } };
  setTimeout(() => window.addEventListener('pointerdown', close), 10);
}

window.addEventListener('DOMContentLoaded', () => {
  try { boot(); }
  catch (err) {
    document.body.innerHTML = '<div style="color:#fff;padding:40px;font-family:system-ui"><h2>Frontier failed to start</h2><pre>' + err.stack + '</pre></div>';
  }
});

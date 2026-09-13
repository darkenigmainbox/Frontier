// Frontier — node-editor canvas + parameter panel (DOM).

import { NODE_DEFS } from './nodes.js';

// roundRect fallback (older canvas implementations).
if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h) { this.rect(x, y, w, h); return this; };
}

export const fmtInt = (n) => Math.round(n).toLocaleString('en-US');
export const fmtM3 = (n) => n > 1e6 ? (n / 1e6).toFixed(2) + 'M m³' : n > 1e3 ? (n / 1e3).toFixed(1) + 'k m³' : n.toFixed(0) + ' m³';

const NW = 176, NH_HEAD = 26, ROW_H = 20;

export class NodeEditor {
  constructor(canvas, graph, cb = {}) {
    this.cv = canvas;
    this.graph = graph;
    this.cb = cb;
    this.view = { x: 0, y: 0, s: 1 };
    this.selected = null;
    this.hover = null;
    this.dragNode = null;
    this.dragLink = null; // {from, fromSocket, x, y} or unlinking
    this.pan = null;
    this.geom = new Map(); // id -> {x,y,w,h,ins:{},outs:{}}
    this.ctx2d = canvas.getContext('2d');
    this.bind();
    this.refresh();
  }
  toScreen(x, y) { return [(x + this.view.x) * this.view.s, (y + this.view.y) * this.view.s]; }
  toWorld(x, y) { const r = this.cv.getBoundingClientRect(); return [(x - r.left) / this.view.s - this.view.x, (y - r.top) / this.view.s - this.view.y]; }

  bind() {
    const cv = this.cv;
    cv.addEventListener('pointerdown', (e) => {
      cv.setPointerCapture(e.pointerId);
      const [wx, wy] = this.toWorld(e.clientX, e.clientY);
      // eroder header buttons?
      const hitBtn = this.hitButton(wx, wy);
      if (hitBtn) { this.cb.onEroderButton && this.cb.onEroderButton(hitBtn.id, hitBtn.btn); return; }
      const hitSock = this.hitSocket(wx, wy);
      if (hitSock) {
        const n = this.graph.nodes.get(hitSock.id);
        if (hitSock.kind === 'out') {
          this.dragLink = { from: hitSock.id, socket: hitSock.socket, x: wx, y: wy };
        } else {
          // drag existing link away to unlink, else start reverse drag
          if (n.inputs[hitSock.socket]) {
            const src = n.inputs[hitSock.socket].node;
            this.graph.unlink(n.id, hitSock.socket);
            this.dragLink = { from: src, socket: '__any', x: wx, y: wy };
            this.cb.onStructure && this.cb.onStructure();
          } else {
            this.dragLink = { to: hitSock.id, socket: hitSock.socket, x: wx, y: wy };
          }
        }
        return;
      }
      const hitNode = this.hitNode(wx, wy);
      if (hitNode) {
        this.selected = hitNode;
        this.dragNode = { id: hitNode, dx: wx - this.graph.nodes.get(hitNode).x, dy: wy - this.graph.nodes.get(hitNode).y };
        this.cb.onSelect && this.cb.onSelect(hitNode);
      } else {
        this.selected = null;
        this.pan = { x: e.clientX, y: e.clientY, vx: this.view.x, vy: this.view.y };
        this.cb.onSelect && this.cb.onSelect(null);
      }
      this.refresh();
    });
    cv.addEventListener('pointermove', (e) => {
      const [wx, wy] = this.toWorld(e.clientX, e.clientY);
      if (this.dragLink) { this.dragLink.x = wx; this.dragLink.y = wy; this.refresh(); return; }
      if (this.dragNode) {
        const n = this.graph.nodes.get(this.dragNode.id);
        n.x = wx - this.dragNode.dx; n.y = wy - this.dragNode.dy;
        this.refresh(); return;
      }
      if (this.pan) {
        this.view.x = this.pan.vx + (e.clientX - this.pan.x) / this.view.s;
        this.view.y = this.pan.vy + (e.clientY - this.pan.y) / this.view.s;
        this.refresh(); return;
      }
      this.hover = this.hitNode(wx, wy);
      cv.style.cursor = this.hover ? 'move' : (this.hitSocket(wx, wy) ? 'crosshair' : 'default');
    });
    cv.addEventListener('pointerup', (e) => {
      if (this.dragLink) {
        const [wx, wy] = this.toWorld(e.clientX, e.clientY);
        const hs = this.hitSocket(wx, wy);
        if (hs) {
          if (this.dragLink.from && hs.kind === 'in') this.tryLink(hs.id, hs.socket, this.dragLink.from);
          else if (this.dragLink.to && hs.kind === 'out') this.tryLink(this.dragLink.to, this.dragLink.socket, hs.id);
        }
        this.dragLink = null;
        this.refresh();
      }
      this.dragNode = null;
      this.pan = null;
    });
    cv.addEventListener('wheel', (e) => {
      e.preventDefault();
      const f = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      const [wx, wy] = this.toWorld(e.clientX, e.clientY);
      this.view.s = Math.min(2.2, Math.max(0.35, this.view.s * f));
      const r = cv.getBoundingClientRect();
      this.view.x = (e.clientX - r.left) / this.view.s - wx;
      this.view.y = (e.clientY - r.top) / this.view.s - wy;
      this.refresh();
    }, { passive: false });
    cv.addEventListener('dblclick', (e) => {
      const [wx, wy] = this.toWorld(e.clientX, e.clientY);
      if (!this.hitNode(wx, wy)) this.cb.onAddMenu && this.cb.onAddMenu(e.clientX, e.clientY, wx, wy);
    });
    window.addEventListener('keydown', (e) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && this.selected && document.activeElement.tagName !== 'INPUT') {
        this.graph.removeNode(this.selected);
        this.selected = null;
        this.cb.onStructure && this.cb.onStructure();
        this.refresh();
      }
    });
  }

  tryLink(dstId, socket, srcId) {
    const dst = this.graph.nodes.get(dstId), src = this.graph.nodes.get(srcId);
    if (!dst || !src || dstId === srcId) return;
    const dd = NODE_DEFS[dst.type], sd = NODE_DEFS[src.type];
    if (!dd.inputs.includes(socket) || !sd.outputs.includes(socket)) return; // socket kinds must match
    // single link per input
    this.graph.link(dstId, socket, srcId);
    this.cb.onStructure && this.cb.onStructure();
  }

  nodeHeight(n) {
    const def = NODE_DEFS[n.type];
    const rows = Math.max(def.inputs.length, def.outputs.length, 1);
    let h = NH_HEAD + rows * ROW_H + 8;
    if (def.eroder) h += 30;
    return h;
  }
  layout() {
    this.geom.clear();
    for (const n of this.graph.nodes.values()) {
      const def = NODE_DEFS[n.type];
      const h = this.nodeHeight(n);
      const g = { x: n.x, y: n.y, w: NW, h, ins: {}, outs: {} };
      def.inputs.forEach((s, i) => (g.ins[s] = { x: n.x, y: n.y + NH_HEAD + i * ROW_H + ROW_H / 2 }));
      def.outputs.forEach((s, i) => (g.outs[s] = { x: n.x + NW, y: n.y + NH_HEAD + i * ROW_H + ROW_H / 2 }));
      this.geom.set(n.id, g);
    }
  }
  hitNode(wx, wy) {
    for (const [id, g] of this.geom)
      if (wx >= g.x && wx <= g.x + g.w && wy >= g.y && wy <= g.y + g.h) return id;
    return null;
  }
  hitSocket(wx, wy) {
    for (const [id, g] of this.geom) {
      for (const s of Object.keys(g.ins)) {
        const p = g.ins[s];
        if (Math.hypot(wx - p.x, wy - p.y) < 10) return { id, kind: 'in', socket: s };
      }
      for (const s of Object.keys(g.outs)) {
        const p = g.outs[s];
        if (Math.hypot(wx - p.x, wy - p.y) < 10) return { id, kind: 'out', socket: s };
      }
    }
    return null;
  }
  hitButton(wx, wy) {
    for (const [id, g] of this.geom) {
      const n = this.graph.nodes.get(id);
      if (!NODE_DEFS[n.type].eroder) continue;
      // play/pause rect + reset rect in header right
      if (wy >= g.y + 4 && wy <= g.y + NH_HEAD - 4) {
        if (wx >= g.x + g.w - 30 && wx <= g.x + g.w - 4) return { id, btn: 'play' };
      }
      if (wy >= g.y + g.h - 26 && wy <= g.y + g.h - 6) {
        if (wx >= g.x + 8 && wx <= g.x + 60) return { id, btn: 'reset' };
      }
    }
    return null;
  }

  refresh() {
    const cv = this.cv, ctx = this.ctx2d;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = cv.clientWidth * dpr, h = cv.clientHeight * dpr;
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const W = cv.clientWidth, H = cv.clientHeight;
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, W, H);
    // grid
    ctx.strokeStyle = '#161d27';
    ctx.lineWidth = 1;
    const gs = 28 * this.view.s;
    const ox = (this.view.x * this.view.s) % gs, oy = (this.view.y * this.view.s) % gs;
    ctx.beginPath();
    for (let x = ox; x < W; x += gs) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
    for (let y = oy; y < H; y += gs) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
    ctx.stroke();
    this.layout();
    ctx.save();
    ctx.scale(this.view.s, this.view.s);
    ctx.translate(this.view.x, this.view.y);
    // links
    for (const n of this.graph.nodes.values()) {
      const g = this.geom.get(n.id);
      for (const s of Object.keys(n.inputs)) {
        const src = n.inputs[s] && n.inputs[s].node;
        const sg = src && this.geom.get(src);
        if (!sg || !sg.outs[s] || !g.ins[s]) continue;
        const a = sg.outs[s], b = g.ins[s];
        const col = s === 'mask' ? '#ffd166' : s === 'mesh' ? '#9dffa8' : '#4da3ff';
        ctx.strokeStyle = col;
        ctx.lineWidth = 2 / this.view.s + 1;
        ctx.beginPath();
        const mx = (a.x + b.x) / 2;
        ctx.moveTo(a.x, a.y);
        ctx.bezierCurveTo(mx, a.y, mx, b.y, b.x, b.y);
        ctx.stroke();
      }
    }
    if (this.dragLink) {
      const dl = this.dragLink;
      let a;
      if (dl.from) { const g = this.geom.get(dl.from); a = g ? { x: g.x + g.w, y: g.y + NH_HEAD + 10 } : { x: dl.x, y: dl.y }; }
      else { const g = this.geom.get(dl.to); a = g ? { x: g.x, y: g.y + NH_HEAD + 10 } : { x: dl.x, y: dl.y }; }
      ctx.strokeStyle = '#fff';
      ctx.setLineDash([6, 4]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.bezierCurveTo((a.x + dl.x) / 2, a.y, (a.x + dl.x) / 2, dl.y, dl.x, dl.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    // nodes
    ctx.font = '12px system-ui, sans-serif';
    for (const n of this.graph.nodes.values()) {
      const def = NODE_DEFS[n.type];
      const g = this.geom.get(n.id);
      const sel = n.id === this.selected;
      ctx.fillStyle = sel ? '#1c2530' : '#141b24';
      ctx.strokeStyle = sel ? '#fff' : def.color;
      ctx.lineWidth = sel ? 2 : 1.5;
      ctx.beginPath();
      ctx.roundRect(g.x, g.y, g.w, g.h, 8);
      ctx.fill(); ctx.stroke();
      // header
      ctx.fillStyle = def.color + '33';
      ctx.beginPath();
      ctx.roundRect(g.x + 1, g.y + 1, g.w - 2, NH_HEAD - 2, [8, 8, 0, 0]);
      ctx.fill();
      ctx.fillStyle = '#e8eef5';
      ctx.fillText(def.title, g.x + 10, g.y + 17);
      // sockets
      ctx.textAlign = 'left';
      for (const s of Object.keys(g.ins)) {
        const p = g.ins[s];
        ctx.fillStyle = s === 'mask' ? '#ffd166' : s === 'mesh' ? '#9dffa8' : '#4da3ff';
        ctx.beginPath(); ctx.arc(p.x, p.y, 4.5, 0, 7); ctx.fill();
        ctx.fillStyle = '#9fb0c3';
        ctx.fillText(s, p.x + 9, p.y + 4);
      }
      ctx.textAlign = 'right';
      for (const s of Object.keys(g.outs)) {
        const p = g.outs[s];
        ctx.fillStyle = s === 'mask' ? '#ffd166' : s === 'mesh' ? '#9dffa8' : '#4da3ff';
        ctx.beginPath(); ctx.arc(p.x, p.y, 4.5, 0, 7); ctx.fill();
        ctx.fillStyle = '#9fb0c3';
        ctx.fillText(s, p.x - 9, p.y + 4);
      }
      ctx.textAlign = 'left';
      // eroder extras: play button + status
      if (def.eroder) {
        const sim = n.sim;
        const playing = sim ? !!sim.p.active : true;
        ctx.fillStyle = playing ? '#123f33' : '#3f2a12';
        ctx.beginPath(); ctx.roundRect(g.x + g.w - 30, g.y + 4, 26, NH_HEAD - 8, 4); ctx.fill();
        ctx.fillStyle = playing ? '#5eead4' : '#ffd166';
        ctx.fillText(playing ? '❚❚' : '▶', g.x + g.w - 23, g.y + 17);
        // progress
        let frac = 0, label = 'idle';
        if (sim) {
          if (sim.pool) { frac = Math.min(1, sim.retired / Math.max(1, sim.p.targetDrops)); label = `${fmtInt(sim.retired)}/${fmtInt(sim.p.targetDrops)}`; }
          else { label = `${fmtInt(sim.iters || 0)}/${fmtInt(sim.p.targetOps || 1)}`; frac = Math.min(1, (sim.iters || 0) / Math.max(1, sim.p.targetOps || 1)); }
        }
        ctx.fillStyle = '#0a0e13';
        ctx.fillRect(g.x + 8, g.y + g.h - 24, g.w - 16, 5);
        ctx.fillStyle = def.color;
        ctx.fillRect(g.x + 8, g.y + g.h - 24, (g.w - 16) * frac, 5);
        ctx.fillStyle = '#8b98a9';
        ctx.font = '10px system-ui, sans-serif';
        ctx.fillText(label, g.x + 66, g.y + g.h - 8);
        ctx.fillStyle = '#5eead4';
        ctx.fillText('⟲ reset', g.x + 8, g.y + g.h - 8);
        ctx.font = '12px system-ui, sans-serif';
      }
    }
    ctx.restore();
  }
}

// ---------------- parameter panel ----------------
export class ParamPanel {
  constructor(el, cb = {}) {
    this.el = el;
    this.cb = cb;
    this.node = null;
  }
  show(node) {
    this.node = node;
    const el = this.el;
    el.innerHTML = '';
    if (!node) {
      el.innerHTML = '<div class="pp-empty">Select a node to edit its parameters.<br><br>Double-click the canvas to add nodes.<br>Drag from an output ○ to an input ○ to connect.</div>';
      return;
    }
    const def = NODE_DEFS[node.type];
    const head = document.createElement('div');
    head.className = 'pp-head';
    head.innerHTML = `<span class="pp-dot" style="background:${def.color}"></span><b>${def.title}</b><span class="pp-cat">${def.category}</span>`;
    el.appendChild(head);
    if (def.eroder) {
      const row = document.createElement('div');
      row.className = 'pp-erode-btns';
      row.innerHTML = `<button data-a="play">▶ / ❚❚ Simulate</button><button data-a="reset">⟲ Reset</button>`;
      row.querySelector('[data-a=play]').onclick = () => this.cb.onEroderButton && this.cb.onEroderButton(node.id, 'play');
      row.querySelector('[data-a=reset]').onclick = () => this.cb.onEroderButton && this.cb.onEroderButton(node.id, 'reset');
      el.appendChild(row);
      const stats = document.createElement('div');
      stats.className = 'pp-stats';
      stats.id = 'pp-stats';
      el.appendChild(stats);
    }
    for (const p of def.params) {
      const wrap = document.createElement('div');
      wrap.className = 'pp-row';
      const lab = document.createElement('label');
      lab.innerHTML = `<span>${p.label}</span><span class="pp-val"></span>`;
      const valEl = lab.querySelector('.pp-val');
      const showVal = () => {
        valEl.textContent = p.labels ? p.labels[Math.round(node.params[p.name])] : (+node.params[p.name]).toFixed(p.step && p.step < 1 ? 2 : 0);
      };
      showVal();
      wrap.appendChild(lab);
      const inp = document.createElement('input');
      inp.type = 'range';
      inp.min = p.min; inp.max = p.max; inp.step = p.step || 'any';
      inp.value = node.params[p.name];
      inp.oninput = () => {
        node.params[p.name] = +inp.value;
        showVal();
        this.cb.onParam && this.cb.onParam(node, p, false);
      };
      inp.onchange = () => this.cb.onParam && this.cb.onParam(node, p, true);
      wrap.appendChild(inp);
      el.appendChild(wrap);
    }
    if (node.type === 'PaintMask') {
      const hint = document.createElement('div');
      hint.className = 'pp-hint';
      hint.textContent = 'Pick a channel above, then hold [B] + drag on the 3D island to paint. Rain spawns where the Rain channel is painted.';
      el.appendChild(hint);
    }
  }
  updateStats(html) {
    const s = document.getElementById('pp-stats');
    if (s) s.innerHTML = html;
  }
}

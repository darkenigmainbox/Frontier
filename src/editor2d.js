// Frontier 2D road editor — top-down CAD-style canvas: draw, snap, merge, sculpt.
import { getPreset, asphaltHalfWidth } from './presets.js';
import { getJunctions, findRailRoadCrossings, roadPoints, autoMergeIntersections, insertNodeIntoRoad } from './topology.js';
import { samplePolyline, pointToSegment, dist2D, uid } from './geometry.js';
import { buildHeightGrid, terrainColor, waterLevel, WORLD_SIZE } from './terrain.js';
import { generateDressing } from './buildings.js';

export class Editor2D {
  constructor(canvas, store, opts = {}) {
    this.canvas = canvas;
    this.store = store;
    this.ctx = canvas.getContext('2d');
    this.onHint = opts.onHint || (() => {});
    this.onSelect = opts.onSelect || (() => {});
    this.cache = { roads: [], rails: [], junctions: [], crossings: [], dressing: { buildings: [], trees: [] }, terrain: null };
    this.draft = null;      // {tool, presetId, kind, points:[{x,z}], snappedNode, snappedRoad}
    this.hover = null;      // {type,id}
    this.snapMark = null;
    this.drag = null;       // {mode:'pan'|'node', ...}
    this.stroke = null;     // terrain stroke
    this.dirty = true;
    this._cacheTimer = null;
    this._emitTimer = null;
    this._bind();
    this.scheduleCache();
    const loop = () => { this.resize(); if (this.dirty) { this.render(); this.dirty = false; } requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
    store.subscribe((what) => {
      if (what === 'all' || what === 'roads' || what === 'terrain') this.scheduleCache();
      if (what === 'tool' || what === 'preset') this.cancelDraft();
      this.dirty = true;
    });
  }

  // ---------- cache ----------
  scheduleCache() {
    clearTimeout(this._cacheTimer);
    this._cacheTimer = setTimeout(() => this.rebuildCache(), 160);
  }
  rebuildCache() {
    const p = this.store.project;
    const roads = [];
    for (const road of p.roads) {
      const pts = roadPoints(project, road);
      if (pts.length < 2) continue;
      const preset = getPreset(road.presetId);
      const samples = samplePolyline(pts, { closed: !!road.closed, smooth: road.smooth !== false, step: 3 });
      roads.push({ road, preset, samples, hw: asphaltHalfWidth(preset) });
    }
    const rails = [];
    for (const rail of p.rails || []) {
      const pts = rail.nodeIds.map((id) => p.nodes[id]).filter(Boolean);
      if (pts.length < 2) continue;
      const samples = samplePolyline(pts, { closed: !!rail.closed, smooth: true, step: 3 });
      rails.push({ rail, samples, preset: getPreset(rail.presetId) });
    }
    let junctions = [], crossings = [];
    try { junctions = getJunctions(p); } catch (e) { /* ignore */ }
    try { crossings = findRailRoadCrossings(p); } catch (e) { /* ignore */ }
    let dressing = { buildings: [], trees: [] };
    try { dressing = generateDressing(p); } catch (e) { /* ignore */ }
    this.cache.roads = roads; this.cache.rails = rails;
    this.cache.junctions = junctions; this.cache.crossings = crossings;
    this.cache.dressing = dressing;
    this.rebuildTerrainImage();
    this.dirty = true;
  }
  rebuildTerrainImage() {
    const p = this.store.project;
    const N = 120, S = WORLD_SIZE, half = S / 2;
    const grid = buildHeightGrid(p, N, []); // raw (fast); roads drawn vectorially
    const wl = waterLevel(p);
    const cv = document.createElement('canvas');
    cv.width = N; cv.height = N;
    const ctx = cv.getContext('2d');
    const img = ctx.createImageData(N, N);
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const h = grid[j * N + i];
        const hx = grid[j * N + Math.min(N - 1, i + 1)] - grid[j * N + Math.max(0, i - 1)];
        const hz = grid[Math.min(N - 1, j + 1) * N + i] - grid[Math.max(0, j - 1) * N + i];
        const slope = Math.hypot(hx, hz) / (2 * (S / N));
        const shade = Math.max(0.72, Math.min(1.1, 1 - (hx * 0.9 + hz * 0.6) * 0.35));
        const x = -half + (i / (N - 1)) * S, z = -half + (j / (N - 1)) * S;
        let [r, g, b] = terrainColor(h, wl, slope, x, z);
        if (h < wl) { const t = Math.min(1, (wl - h) / 3); r = r * (1 - t) + 0.13 * t; g = g * (1 - t) + 0.35 * t; b = b * (1 - t) + 0.55 * t; }
        const o = (j * N + i) * 4;
        img.data[o] = Math.min(255, r * 255 * shade);
        img.data[o + 1] = Math.min(255, g * 255 * shade);
        img.data[o + 2] = Math.min(255, b * 255 * shade);
        img.data[o + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    this.cache.terrain = cv;
  }

  // ---------- transforms ----------
  get cam() { return this.store.cam2d; }
  w2s(x, z) {
    const { cx, cz, scale } = this.cam;
    const r = this.canvas.getBoundingClientRect();
    return [(x - cx) * scale + r.width / 2, (z - cz) * scale + r.height / 2];
  }
  s2w(sx, sy) {
    const { cx, cz, scale } = this.cam;
    const r = this.canvas.getBoundingClientRect();
    return { x: (sx - r.width / 2) / scale + cx, z: (sy - r.height / 2) / scale + cz };
  }
  resize() {
    const r = this.canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = Math.max(1, Math.round(r.width * dpr)), H = Math.max(1, Math.round(r.height * dpr));
    if (this.canvas.width !== W || this.canvas.height !== H) {
      this.canvas.width = W; this.canvas.height = H; this.dirty = true;
    }
  }

  // ---------- render ----------
  render() {
    const ctx = this.ctx, store = this.store;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = this.canvas.width, H = this.canvas.height;
    const { cx, cz, scale } = this.cam;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const vw = W / dpr, vh = H / dpr;
    const X = (x) => (x - cx) * scale + vw / 2;
    const Y = (z) => (z - cz) * scale + vh / 2;
    ctx.fillStyle = '#0a0e14'; ctx.fillRect(0, 0, vw, vh);
    const L = store.layers;
    // terrain
    if (L.terrain && this.cache.terrain) {
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(this.cache.terrain, X(-WORLD_SIZE / 2), Y(-WORLD_SIZE / 2), WORLD_SIZE * scale, WORLD_SIZE * scale);
    }
    // world border
    ctx.strokeStyle = '#3a4658'; ctx.lineWidth = 1.5;
    ctx.strokeRect(X(-WORLD_SIZE / 2), Y(-WORLD_SIZE / 2), WORLD_SIZE * scale, WORLD_SIZE * scale);
    // grid
    if (L.grid) {
      const stepMin = scale > 0.5 ? 10 : 50;
      ctx.lineWidth = 1;
      for (let gx = -600; gx <= 600; gx += stepMin) {
        const major = gx % 50 === 0;
        ctx.strokeStyle = major ? 'rgba(140,170,210,0.16)' : 'rgba(140,170,210,0.05)';
        ctx.beginPath(); ctx.moveTo(X(gx), Y(-600)); ctx.lineTo(X(gx), Y(600)); ctx.stroke();
      }
      for (let gz = -600; gz <= 600; gz += stepMin) {
        const major = gz % 50 === 0;
        ctx.strokeStyle = major ? 'rgba(140,170,210,0.16)' : 'rgba(140,170,210,0.05)';
        ctx.beginPath(); ctx.moveTo(X(-600), Y(gz)); ctx.lineTo(X(gz), Y(gz)); ctx.stroke();
      }
    }
    // buildings + trees
    if (L.buildings) {
      for (const b of this.cache.dressing.buildings) {
        const [sx, sy] = [X(b.x), Y(b.z)];
        if (sx < -40 || sy < -40 || sx > vw + 40 || sy > vh + 40) continue;
        ctx.save(); ctx.translate(sx, sy); ctx.rotate(-(b.rot || 0));
        ctx.fillStyle = (b.color || '#8b93a1') + 'cc';
        ctx.fillRect(-b.w * scale / 2, -b.d * scale / 2, Math.max(2, b.w * scale), Math.max(2, b.d * scale));
        ctx.restore();
      }
    }
    if (L.trees && scale > 0.55) {
      ctx.fillStyle = 'rgba(74,140,80,0.85)';
      for (const t of this.cache.dressing.trees) {
        const [sx, sy] = [X(t.x), Y(t.z)];
        if (sx < -4 || sy < -4 || sx > vw + 4 || sy > vh + 4) continue;
        ctx.beginPath(); ctx.arc(sx, sy, Math.max(1, 1.6 * (t.s || 1) * Math.min(2, scale)), 0, 7); ctx.fill();
      }
    }
    // roads (ground first, bridges on top)
    if (L.roads) {
      const sorted = [...this.cache.roads].sort((a, b) => (a.road.bridge?.enabled ? 1 : 0) - (b.road.bridge?.enabled ? 1 : 0));
      for (const r of sorted) this.drawRoad(ctx, X, Y, scale, r);
    }
    // rails
    if (L.rails) for (const r of this.cache.rails) this.drawRail(ctx, X, Y, scale, r);
    // crossings
    if (L.rails) {
      for (const c of this.cache.crossings) {
        const [sx, sy] = [X(c.x), Y(c.z)];
        ctx.strokeStyle = '#ffd75e'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(sx, sy, 7, 0, 7); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(sx - 4, sy - 4); ctx.lineTo(sx + 4, sy + 4);
        ctx.moveTo(sx + 4, sy - 4); ctx.lineTo(sx - 4, sy + 4);
        ctx.stroke();
      }
    }
    // roundabouts
    if (L.roads) for (const rb of store.project.roundabouts || []) this.drawRoundabout(ctx, X, Y, scale, rb);
    // junctions
    if (L.junctions) {
      for (const j of this.cache.junctions) {
        const [sx, sy] = [X(j.x), Y(j.z)];
        ctx.strokeStyle = 'rgba(255,180,84,0.8)'; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(sx, sy, Math.max(3, j.radius * scale), 0, 7); ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    // nodes
    this.drawNodes(ctx, X, Y, scale, vw, vh);
    // draft
    if (this.draft) this.drawDraft(ctx, X, Y, scale);
    // snap mark
    if (this.snapMark) {
      const [sx, sy] = [X(this.snapMark.x), Y(this.snapMark.z)];
      ctx.strokeStyle = '#4cc38a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(sx, sy, 9, 0, 7); ctx.stroke();
    }
    // hover
    if (this.hover && store.tool === 'select') {
      const r = this.cache.roads.find((x) => x.road.id === this.hover.id);
      if (r) {
        ctx.strokeStyle = 'rgba(90,169,255,0.55)'; ctx.lineWidth = (r.hw * 2 + 3) * scale;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath();
        r.samples.forEach((s, i) => (i ? ctx.lineTo(X(s.x), Y(s.z)) : ctx.moveTo(X(s.x), Y(s.z))));
        ctx.stroke();
      }
    }
  }

  pathOf(ctx, X, Y, samples, closed) {
    ctx.beginPath();
    samples.forEach((s, i) => (i ? ctx.lineTo(X(s.x), Y(s.z)) : ctx.moveTo(X(s.x), Y(s.z))));
    if (closed) ctx.closePath();
  }

  drawRoad(ctx, X, Y, scale, { road, preset, samples, hw }) {
    const sel = this.store.selection?.id === road.id;
    const w = Math.max(1.5, hw * 2 * scale);
    const isBridge = road.bridge?.enabled;
    if (isBridge) {
      // shadow
      ctx.save(); ctx.translate(5, 6);
      ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      this.pathOf(ctx, X, Y, samples, road.closed); ctx.stroke(); ctx.restore();
    }
    // casing
    ctx.strokeStyle = sel ? '#4cc38a' : '#101216'; ctx.lineWidth = w + (sel ? 5 : 2.5);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    this.pathOf(ctx, X, Y, samples, road.closed); ctx.stroke();
    // fill
    ctx.strokeStyle = preset.asphalt || '#3a3d43'; ctx.lineWidth = w;
    this.pathOf(ctx, X, Y, samples, road.closed); ctx.stroke();
    if (!this.store.layers.markings) return;
    // center marking schematic
    const c = preset.center;
    if (c === 'doubleYellow' || c === 'dashedYellow') ctx.strokeStyle = '#d8a83c';
    else if (c === 'dashedWhite' || c === 'solidWhite') ctx.strokeStyle = 'rgba(230,235,242,0.85)';
    else if (c === 'barrier') ctx.strokeStyle = '#c9cfd8';
    else if (c === 'turnLane') ctx.strokeStyle = '#d8a83c';
    else ctx.strokeStyle = 'transparent';
    if (c && c !== 'none') {
      ctx.lineWidth = Math.max(1, 0.28 * scale);
      if (c.startsWith('dashed')) ctx.setLineDash([Math.max(2, 3 * scale), Math.max(2, 4.5 * scale)]);
      this.pathOf(ctx, X, Y, samples, road.closed); ctx.stroke();
      ctx.setLineDash([]);
    }
    // sidewalks
    if (this.store.layers.sidewalks && (preset.sidewalkL || preset.sidewalkR) && scale > 1.6) {
      ctx.strokeStyle = 'rgba(160,166,175,0.7)'; ctx.lineWidth = Math.max(1, (preset.sidewalkWidth || 2) * scale * 0.5);
      for (const side of [1, -1]) {
        if ((side > 0 && !preset.sidewalkL) || (side < 0 && !preset.sidewalkR)) continue;
        ctx.beginPath();
        samples.forEach((s, i) => {
          const off = side * (hw + 0.12 + (preset.sidewalkWidth || 2) / 2);
          const px = s.x + -s.dirz * off, pz = s.z + s.dirx * off;
          i ? ctx.lineTo(X(px), Y(pz)) : ctx.moveTo(X(px), Y(pz));
        });
        ctx.stroke();
      }
    }
    // one-way arrows
    if ((preset.oneWay || road.oneWayOverride) && scale > 1.8) {
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      for (let i = 10; i < samples.length - 10; i += Math.max(8, Math.floor(24 / Math.max(0.5, scale * 0.4)))) {
        const s = samples[i];
        const [sx, sy] = [X(s.x), Y(s.z)];
        const a = Math.atan2(s.dirz, s.dirx);
        ctx.save(); ctx.translate(sx, sy); ctx.rotate(a);
        ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-3, -4); ctx.lineTo(-3, 4); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
    }
    if (isBridge) {
      // railing ticks + piers
      ctx.strokeStyle = 'rgba(200,210,220,0.6)'; ctx.lineWidth = 1;
      for (let i = 0; i < samples.length; i += 4) {
        const s = samples[i];
        const [sx, sy] = [X(s.x), Y(s.z)];
        ctx.beginPath(); ctx.arc(sx, sy, 1.4, 0, 7); ctx.stroke();
      }
    }
  }

  drawRail(ctx, X, Y, scale, { rail, samples, preset }) {
    const sel = this.store.selection?.id === rail.id;
    if (rail.kind === 'monorail') {
      ctx.strokeStyle = sel ? '#4cc38a' : '#20262e'; ctx.lineWidth = Math.max(3, 2.4 * scale) + 2;
      this.pathOf(ctx, X, Y, samples, rail.closed); ctx.stroke();
      ctx.strokeStyle = '#b9c4d0'; ctx.lineWidth = Math.max(2, 1.1 * scale);
      this.pathOf(ctx, X, Y, samples, rail.closed); ctx.stroke();
      // pillars
      ctx.fillStyle = 'rgba(150,160,172,0.9)';
      for (let i = 0; i < samples.length; i += 8) {
        const [sx, sy] = [X(samples[i].x), Y(samples[i].z)];
        ctx.fillRect(sx - 1.5, sy - 1.5, 3, 3);
      }
      return;
    }
    const bw = Math.max(2, (preset.ballastWidth || 8) * scale);
    ctx.strokeStyle = sel ? '#4cc38a' : '#2b2119'; ctx.lineWidth = bw + (sel ? 4 : 2);
    this.pathOf(ctx, X, Y, samples, rail.closed); ctx.stroke();
    ctx.strokeStyle = '#5a4f44'; ctx.lineWidth = bw;
    this.pathOf(ctx, X, Y, samples, rail.closed); ctx.stroke();
    // steel pairs
    const tracks = preset.tracks || 1, spacing = preset.trackSpacing || 0;
    ctx.strokeStyle = '#c9cfd8'; ctx.lineWidth = Math.max(1, 0.14 * scale);
    for (let t = 0; t < tracks; t++) {
      const off = tracks === 1 ? 0 : (t - (tracks - 1) / 2) * spacing;
      for (const g of [-0.72, 0.72]) {
        ctx.beginPath();
        samples.forEach((s, i) => {
          const o = off + g;
          const px = s.x + -s.dirz * o, pz = s.z + s.dirx * o;
          i ? ctx.lineTo(X(px), Y(pz)) : ctx.moveTo(X(px), Y(pz));
        });
        ctx.stroke();
      }
    }
  }

  drawRoundabout(ctx, X, Y, scale, rb) {
    const [sx, sy] = [X(rb.x), Y(rb.z)];
    const sel = this.store.selection?.id === rb.id;
    ctx.fillStyle = '#33363c';
    ctx.beginPath(); ctx.arc(sx, sy, rb.radius * scale, 0, 7); ctx.fill();
    ctx.strokeStyle = sel ? '#4cc38a' : '#101216'; ctx.lineWidth = sel ? 4 : 2;
    ctx.beginPath(); ctx.arc(sx, sy, rb.radius * scale, 0, 7); ctx.stroke();
    ctx.fillStyle = '#3f7a44';
    ctx.beginPath(); ctx.arc(sx, sy, (rb.radius - 7.5) * scale, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(230,235,242,0.7)'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(sx, sy, (rb.radius - 3.7) * scale, 0, 7); ctx.stroke();
    ctx.setLineDash([]);
  }

  drawNodes(ctx, X, Y, scale, vw, vh) {
    const p = this.store.project;
    const junctionIds = new Set(this.cache.junctions.map((j) => j.nodeId));
    const sel = this.store.selection;
    for (const id of Object.keys(p.nodes)) {
      const n = p.nodes[id];
      const [sx, sy] = [X(n.x), Y(n.z)];
      if (sx < -20 || sy < -20 || sx > vw + 20 || sy > vh + 20) continue;
      const isJ = junctionIds.has(id);
      const isSel = sel?.type === 'node' && sel.nodeId === id;
      const s = isJ ? 7 : 5;
      ctx.fillStyle = isSel ? '#4cc38a' : isJ ? '#ff9a3c' : 'rgba(240,244,250,0.92)';
      ctx.strokeStyle = '#101216'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.rect(sx - s / 2, sy - s / 2, s, s); ctx.fill(); ctx.stroke();
      if ((n.h || 0) > 0.4 && scale > 2) {
        ctx.fillStyle = '#5aa9ff'; ctx.font = '10px sans-serif';
        ctx.fillText(`+${Number(n.h).toFixed(1)}`, sx + 6, sy - 6);
      }
    }
  }

  drawDraft(ctx, X, Y, scale) {
    const d = this.draft;
    if (!d || !d.points.length) return;
    ctx.strokeStyle = '#4cc38a'; ctx.lineWidth = 2.5; ctx.setLineDash([7, 5]);
    ctx.beginPath();
    d.points.forEach((pt, i) => (i ? ctx.lineTo(X(pt.x), Y(pt.z)) : ctx.moveTo(X(pt.x), Y(pt.z))));
    if (d.cursor) ctx.lineTo(X(d.cursor.x), Y(d.cursor.z));
    ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#4cc38a';
    for (const pt of d.points) {
      const [sx, sy] = [X(pt.x), Y(pt.z)];
      ctx.beginPath(); ctx.arc(sx, sy, 4, 0, 7); ctx.fill();
    }
  }

  // ---------- picking ----------
  pickNode(sx, sy, tol = 12) {
    const r = this.canvas.getBoundingClientRect();
    let best = null, bd = tol;
    for (const id of Object.keys(this.store.project.nodes)) {
      const n = this.store.project.nodes[id];
      const [px, py] = this.w2s(n.x, n.z);
      const d = Math.hypot(px - (sx - r.left), py - (sy - r.top));
      if (d < bd) { bd = d; best = n; }
    }
    return best;
  }
  pickRoad(wx, wz) {
    let best = null, bd = 1e9;
    for (const r of this.cache.roads) {
      for (const s of r.samples) {
        const d = Math.hypot(s.x - wx, s.z - wz) - r.hw;
        if (d < bd) { bd = d; best = { type: 'road', id: r.road.id, road: r.road }; }
      }
    }
    const tol = 4 / this.cam.scale;
    return bd < tol ? best : null;
  }
  pickRail(wx, wz) {
    let best = null, bd = 1e9;
    for (const r of this.cache.rails) {
      const hw = r.rail.kind === 'monorail' ? 2.5 : 5;
      for (const s of r.samples) {
        const d = Math.hypot(s.x - wx, s.z - wz) - hw;
        if (d < bd) { bd = d; best = { type: 'rail', id: r.rail.id, rail: r.rail }; }
      }
    }
    return bd < 5 / this.cam.scale ? best : null;
  }
  pickRoundabout(wx, wz) {
    for (const rb of this.store.project.roundabouts || []) {
      if (Math.hypot(wx - rb.x, wz - rb.z) < rb.radius + 2) return { type: 'roundabout', id: rb.id, rb };
    }
    return null;
  }
  snapPoint(wx, wz) {
    if (!this.store.snap) return { x: wx, z: wz, node: null };
    // nodes first
    let bestN = null, bd = 14 / this.cam.scale;
    for (const id of Object.keys(this.store.project.nodes)) {
      const n = this.store.project.nodes[id];
      const d = Math.hypot(n.x - wx, n.z - wz);
      if (d < bd) { bd = d; bestN = n; }
    }
    if (bestN) return { x: bestN.x, z: bestN.z, node: bestN };
    // then road interior
    let best = null, bd2 = 9 / this.cam.scale;
    for (const r of this.cache.roads) {
      for (let i = 0; i < r.samples.length - 1; i++) {
        const a = r.samples[i], b = r.samples[i + 1];
        const q = pointToSegment(wx, wz, a.x, a.z, b.x, b.z);
        if (q.d < bd2) { bd2 = q.d; best = { x: q.x, z: q.z, road: r.road }; }
      }
    }
    if (best) return { ...best, node: null };
    return { x: wx, z: wz, node: null };
  }

  // ---------- input ----------
  _bind() {
    const cv = this.canvas;
    cv.addEventListener('pointerdown', (e) => this.onDown(e));
    cv.addEventListener('pointermove', (e) => this.onMove(e));
    cv.addEventListener('pointerup', (e) => this.onUp(e));
    cv.addEventListener('pointerleave', () => { this.snapMark = null; this.dirty = true; });
    cv.addEventListener('dblclick', (e) => this.onDbl(e));
    cv.addEventListener('wheel', (e) => {
      e.preventDefault();
      const { scale } = this.cam;
      const ns = Math.max(0.12, Math.min(60, scale * Math.exp(-e.deltaY * 0.0012)));
      const before = this.s2w(e.clientX, e.clientY);
      this.cam.scale = ns;
      const after = this.s2w(e.clientX, e.clientY);
      this.cam.cx += before.x - after.x;
      this.cam.cz += before.z - after.z;
      this.dirty = true;
    }, { passive: false });
    cv.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  onDown(e) {
    this.canvas.setPointerCapture?.(e.pointerId);
    const r = this.canvas.getBoundingClientRect();
    const { x: wx, z: wz } = this.s2w(e.clientX, e.clientY);
    const tool = this.store.tool;
    // pan: middle button, or space, or select-drag on empty
    if (e.button === 1 || (tool === 'select' && e.button === 0 && !this.pickNode(e.clientX, e.clientY) && !this.pickRoad(wx, wz) && !this.pickRail(wx, wz) && !this.pickRoundabout(wx, wz))) {
      this.drag = { mode: 'pan', sx: e.clientX, sy: e.clientY, cx: this.cam.cx, cz: this.cam.cz, moved: false };
      return;
    }
    if (tool === 'select') {
      if (e.button !== 0) return;
      const n = this.pickNode(e.clientX, e.clientY);
      if (n) {
        this.store.pushUndo('move node');
        this.drag = { mode: 'node', id: n.id, moved: false };
        this.store.selection = { type: 'node', id: n.id, nodeId: n.id };
        this.onSelect();
        return;
      }
      const hit = this.pickRoundabout(wx, wz) || this.pickRail(wx, wz) || this.pickRoad(wx, wz);
      if (hit) { this.store.selection = hit; this.onSelect(); }
      else { this.store.selection = null; this.onSelect(); }
      // empty handled above (pan)
      this.dirty = true;
      return;
    }
    if (tool === 'erase') {
      if (e.button !== 0) return;
      this.eraseAt(e.clientX, e.clientY, wx, wz);
      return;
    }
    if (tool === 'roundabout') {
      if (e.button !== 0) return;
      this.store.pushUndo('add roundabout');
      const id = uid('rb');
      const radius = 13;
      const mk = (x, z) => { const nid = uid('n'); this.store.project.nodes[nid] = { id: nid, x, z, h: 0 }; return nid; };
      const nodeIds = [mk(wx, wz - radius), mk(wx + radius, wz), mk(wx, wz + radius), mk(wx - radius, wz)];
      this.store.project.roundabouts.push({ id, x: wx, z: wz, radius, nodeIds });
      this.store.selection = { type: 'roundabout', id };
      this.store.emit('roads'); this.onSelect();
      return;
    }
    if (tool === 'terrainUp' || tool === 'terrainDown' || tool === 'water') {
      if (e.button !== 0) return;
      this.store.pushUndo('sculpt terrain');
      this.stroke = { tool, last: 0 };
      this.applyBrush(wx, wz);
      return;
    }
    // draw tools
    if (e.button !== 0) return;
    if (!this.draft) {
      const presetId = this.store.activePresetId;
      const preset = getPreset(presetId);
      let kind = 'road', pid = presetId;
      if (tool === 'rail') { kind = 'rail'; pid = preset.kind === 'rail' ? presetId : 'railDouble'; }
      if (tool === 'monorail') { kind = 'monorail'; pid = 'monorail'; }
      if (tool === 'bridge') { kind = 'road'; pid = preset.cat === 'bridge' ? presetId : 'bridge2'; }
      if (tool === 'road' && preset.kind !== 'road') pid = 'street2';
      this.draft = { tool, kind, presetId: pid, points: [] };
      this.onHint(`${tool === 'road' ? 'Road' : tool} · click to place points · double-click / Enter to finish · Esc to cancel`);
    }
    const s = this.snapPoint(wx, wz);
    this.draft.points.push({ x: s.x, z: s.z, nodeId: s.node?.id || null, roadSnap: s.road || null });
    this.dirty = true;
  }

  onMove(e) {
    const r = this.canvas.getBoundingClientRect();
    const { x: wx, z: wz } = this.s2w(e.clientX, e.clientY);
    if (this.drag?.mode === 'pan') {
      const dx = (e.clientX - this.drag.sx) / this.cam.scale;
      const dz = (e.clientY - this.drag.sy) / this.cam.scale;
      if (Math.abs(e.clientX - this.drag.sx) + Math.abs(e.clientY - this.drag.sy) > 3) this.drag.moved = true;
      this.cam.cx = this.drag.cx - dx;
      this.cam.cz = this.drag.cz - dz;
      this.dirty = true;
      return;
    }
    if (this.drag?.mode === 'node') {
      const s = this.snapPoint(wx, wz);
      // don't snap onto itself
      const n = this.store.project.nodes[this.drag.id];
      if (n) {
        if (s.node && s.node.id !== this.drag.id) { n.x = s.node.x; n.z = s.node.z; }
        else { n.x = wx; n.z = wz; }
        this.drag.moved = true;
        this.dirty = true;
        clearTimeout(this._emitTimer);
        this._emitTimer = setTimeout(() => { this.store.emit('roads'); this.scheduleCache(); }, 90);
      }
      return;
    }
    if (this.stroke) { this.applyBrush(wx, wz); return; }
    if (this.draft) {
      const s = this.snapPoint(wx, wz);
      this.draft.cursor = { x: s.x, z: s.z };
      this.snapMark = s.node ? { x: s.x, z: s.z } : null;
      this.dirty = true;
      return;
    }
    if (this.store.tool === 'select') {
      this.hover = this.pickRoad(wx, wz);
      this.dirty = true;
    } else if (['road', 'rail', 'monorail', 'bridge'].includes(this.store.tool)) {
      const s = this.snapPoint(wx, wz);
      this.snapMark = s.node ? { x: s.x, z: s.z } : null;
      this.dirty = true;
    }
  }

  onUp(e) {
    if (this.drag?.mode === 'pan' && !this.drag.moved && this.store.tool === 'select' && e.button === 0) {
      this.store.selection = null; this.onSelect();
    }
    if (this.drag?.mode === 'node' && this.drag.moved) {
      if (this.store.project.settings.autoMerge) {
        try { autoMergeIntersections(this.store.project); } catch (err) { /* ignore */ }
      }
      this.store.emit('roads');
    }
    if (this.drag?.mode === 'node' && !this.drag.moved) this.store.undoStack.pop();
    this.drag = null;
    if (this.stroke) { this.stroke = null; this.store.emit('terrain'); }
    this.dirty = true;
  }

  onDbl(e) {
    const r = this.canvas.getBoundingClientRect();
    const { x: wx, z: wz } = this.s2w(e.clientX, e.clientY);
    if (this.draft) { this.finishDraft(); return; }
    if (this.store.tool === 'select') {
      // double-click road → insert node
      const hit = this.pickRoad(wx, wz);
      if (hit?.road) {
        this.store.pushUndo('insert node');
        const pts = roadPoints(this.store.project, hit.road);
        let bi = 0, bd = 1e18, bx = wx, bz = wz;
        const segs = hit.road.closed ? pts.length : pts.length - 1;
        for (let i = 0; i < segs; i++) {
          const a = pts[i % pts.length], b = pts[(i + 1) % pts.length];
          const q = pointToSegment(wx, wz, a.x, a.z, b.x, b.z);
          if (q.d < bd) { bd = q.d; bi = i; bx = q.x; bz = q.z; }
        }
        const nid = uid('n');
        this.store.project.nodes[nid] = { id: nid, x: bx, z: bz, h: 0 };
        insertNodeIntoRoad(this.store.project, hit.road, bi, nid);
        this.store.selection = { type: 'node', id: nid, nodeId: nid };
        this.store.emit('roads'); this.onSelect();
      }
    }
  }

  eraseAt(cx, cy, wx, wz) {
    const store = this.store;
    const n = this.pickNode(cx, cy);
    store.pushUndo('erase');
    if (n) {
      // delete node (and prune broken roads)
      store.deleteNode(n.id);
    } else {
      const hit = this.pickRoundabout(wx, wz) || this.pickRail(wx, wz) || this.pickRoad(wx, wz);
      if (!hit) { store.undoStack.pop(); return; }
      if (hit.type === 'road') store.deleteRoad(hit.id);
      else if (hit.type === 'rail') store.deleteRail(hit.id);
      else if (hit.type === 'roundabout') {
        store.project.roundabouts = store.project.roundabouts.filter((x) => x.id !== hit.id);
      }
    }
    store.selection = null;
    store.emit('roads'); this.onSelect();
  }

  finishDraft() {
    const d = this.draft;
    if (!d) return;
    // drop consecutive duplicates (double-click adds a repeated point)
    const pts = [];
    for (const pt of d.points) {
      const last = pts[pts.length - 1];
      if (!last || Math.hypot(pt.x - last.x, pt.z - last.z) > 0.6) pts.push(pt);
    }
    d.points = pts;
    if (d.points.length < 2) { this.draft = null; this.onHint(''); this.dirty = true; return; }
    const store = this.store;
    store.pushUndo(`add ${d.kind}`);
    const p = store.project;
    // resolve points → nodes (reuse snapped, split roads for interior snaps)
    const nodeIds = [];
    for (const pt of d.points) {
      if (pt.nodeId && p.nodes[pt.nodeId]) { nodeIds.push(pt.nodeId); continue; }
      const nid = uid('n');
      p.nodes[nid] = { id: nid, x: pt.x, z: pt.z, h: 0 };
      nodeIds.push(nid);
      // interior road snap → split that road too (shared junction)
      if (pt.roadSnap && p.settings.autoMerge !== false && d.kind === 'road') {
        const target = p.roads.find((x) => x.id === pt.roadSnap.id);
        if (target) {
          const pts = roadPoints(p, target);
          let bi = 0, bd = 1e18;
          const segs = target.closed ? pts.length : pts.length - 1;
          for (let i = 0; i < segs; i++) {
            const a = pts[i % pts.length], b = pts[(i + 1) % pts.length];
            const q = pointToSegment(pt.x, pt.z, a.x, a.z, b.x, b.z);
            if (q.d < bd) { bd = q.d; bi = i; }
          }
          if (bd < 6) insertNodeIntoRoad(p, target, bi, nid);
        }
      }
    }
    if (d.kind === 'road') {
      const preset = getPreset(d.presetId);
      const bridge = d.tool === 'bridge'
        ? { enabled: true, height: preset.bridgeHeight || 5.5, type: 'beam' }
        : (preset.defaultBridge ? { enabled: true, height: preset.bridgeHeight || 6, type: 'beam' } : { enabled: false, height: 6, type: 'beam' });
      const id = store.addRoad(nodeIds, d.presetId, { bridge });
      store.selection = { type: 'road', id };
    } else {
      const id = store.addRail(nodeIds, d.kind, d.presetId);
      store.selection = { type: 'rail', id };
    }
    if (p.settings.autoMerge !== false && d.kind === 'road') {
      try { autoMergeIntersections(p); } catch (err) { /* ignore */ }
    }
    this.draft = null;
    this.onHint('');
    store.emit('roads'); this.onSelect();
  }

  cancelDraft() { if (this.draft) { this.draft = null; this.onHint(''); this.dirty = true; } }

  applyBrush(wx, wz) {
    const now = performance.now();
    if (now - (this.stroke?.last || 0) < 28) return;
    if (this.stroke) this.stroke.last = now;
    const { size, strength } = this.store.brush;
    const tool = this.stroke.tool;
    this.store.project.terrainEdits.push({
      x: wx, z: wz, radius: size,
      delta: tool === 'terrainUp' ? strength * 0.32 : tool === 'terrainDown' ? -strength * 0.32 : 0,
      type: tool === 'water' ? 'water' : tool === 'terrainUp' ? 'raise' : 'lower',
      strength: tool === 'water' ? 7 : strength * 0.32,
    });
    if (this.store.project.terrainEdits.length > 600) {
      this.store.project.terrainEdits.splice(0, this.store.project.terrainEdits.length - 600);
    }
    this.dirty = true;
    this.scheduleCache();
    clearTimeout(this._emitTimer);
    this._emitTimer = setTimeout(() => this.store.emit('terrain'), 220);
  }

  focus(x, z, scale) {
    this.cam.cx = x; this.cam.cz = z;
    if (scale) this.cam.scale = scale;
    this.dirty = true;
  }
}

// ─── 2D top-down editor: canvas renderer + drawing/editing tools ─────────────

import { clamp, dist, dist2, pointPolyline, type Pt } from '../core/math.ts';
import { getRailPreset, getRoadPreset, roadWidth, totalHalfWidth } from '../core/presets.ts';
import type { ProjectStore } from '../core/project.ts';
import {
  newId, type Building, type Lake, type Project, type StrokePoint,
  type TerrainBrushMode, type Tree, type TreeType,
} from '../core/types.ts';
import type { WorldBuild } from '../gen/build.ts';

export type Tool = 'select' | 'road' | 'rail' | 'river' | 'lake' | 'building' | 'tree' | 'terrain' | 'erase';

export type Selection =
  | { kind: 'stroke'; id: string }
  | { kind: 'building'; id: string }
  | { kind: 'tree'; id: string }
  | { kind: 'lake'; id: string };

export interface DraftState {
  kind: 'road' | 'rail' | 'river';
  points: StrokePoint[];
  typeId: string;
  width: number;
}

interface HitResult { sel: Selection | null; vertexIndex: number; strokeId: string | null }

const CATEGORY_COLORS: Record<string, string> = {
  highway: '#4c525e',
  arterial: '#5a5f6a',
  street: '#646a75',
  rural: '#7a6f5c',
  offroad: '#7d6b51',
  special: '#6e7263',
};

export class Editor2D {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  tool: Tool = 'select';
  selection: Selection | null = null;
  draft: DraftState | null = null;

  // view transform
  viewX = 0;
  viewZ = 0;
  scale = 0.5; // px per meter

  // tool params
  activeRoadPreset = 'street-2';
  activeRailPreset = 'train';
  riverWidth = 42;
  lakeRadius = 160;
  buildingH = 22;
  treeType: TreeType = 'oak';
  brushMode: TerrainBrushMode = 'raise';
  brushRadius = 60;
  brushStrength = 2.2;
  snapEnabled = true;

  // interaction state
  private panning = false;
  private panLast = { x: 0, y: 0 };
  private draggingVertex = -1;
  private dragMoved = false;
  private drawingBuilding: { x0: number; z0: number; x1: number; z1: number } | null = null;
  private terrainDragging = false;
  private mouseWorld = { x: 0, z: 0 };
  private mouseIn = false;
  private dpr = 1;
  private terrainRaster: HTMLCanvasElement | null = null;
  private terrainRasterKey = '';

  onChange: (label: string) => void = () => {};
  onSelect: (sel: Selection | null) => void = () => {};
  onStatus: (msg: string) => void = () => {};

  constructor(
    canvas: HTMLCanvasElement,
    public store: ProjectStore,
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.bind();
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  get project(): Project { return this.store.project; }

  resize(): void {
    const parent = this.canvas.parentElement;
    const w = parent?.clientWidth ?? 800;
    const h = parent?.clientHeight ?? 600;
    this.dpr = Math.min(window.devicePixelRatio, 2);
    this.canvas.width = Math.max(1, Math.floor(w * this.dpr));
    this.canvas.height = Math.max(1, Math.floor(h * this.dpr));
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.render();
  }

  // ── coordinate transforms ──────────────────────────────────────────────────
  worldToScreen(x: number, z: number): { x: number; y: number } {
    const w = this.canvas.width / this.dpr, h = this.canvas.height / this.dpr;
    return {
      x: (x - this.viewX) * this.scale + w / 2,
      y: (z - this.viewZ) * this.scale + h / 2,
    };
  }

  screenToWorld(x: number, y: number): { x: number; z: number } {
    const w = this.canvas.width / this.dpr, h = this.canvas.height / this.dpr;
    return {
      x: (x - w / 2) / this.scale + this.viewX,
      z: (y - h / 2) / this.scale + this.viewZ,
    };
  }

  zoomAt(sx: number, sy: number, factor: number): void {
    const before = this.screenToWorld(sx, sy);
    this.scale = clamp(this.scale * factor, 0.02, 6);
    const after = this.screenToWorld(sx, sy);
    this.viewX += before.x - after.x;
    this.viewZ += before.z - after.z;
    this.render();
  }

  frameAll(): void {
    const s = this.project.terrain.size;
    const w = this.canvas.width / this.dpr, h = this.canvas.height / this.dpr;
    this.viewX = 0;
    this.viewZ = 0;
    this.scale = Math.min(w, h) / (s * 1.12);
    this.render();
  }

  // ── input binding ──────────────────────────────────────────────────────────
  private bind(): void {
    const c = this.canvas;
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      const r = c.getBoundingClientRect();
      const f = e.deltaY < 0 ? 1.16 : 1 / 1.16;
      this.zoomAt(e.clientX - r.left, e.clientY - r.top, f);
    }, { passive: false });

    c.addEventListener('pointerdown', (e) => this.pointerDown(e));
    c.addEventListener('pointermove', (e) => this.pointerMove(e));
    c.addEventListener('pointerup', (e) => this.pointerUp(e));
    c.addEventListener('pointerleave', () => { this.mouseIn = false; this.render(); });
    c.addEventListener('dblclick', (e) => this.doubleClick(e));

    window.addEventListener('keydown', (e) => this.keyDown(e));
  }

  private evWorld(e: PointerEvent | MouseEvent | KeyboardEvent): { x: number; z: number } {
    const r = this.canvas.getBoundingClientRect();
    return this.screenToWorld((e as MouseEvent).clientX - r.left, (e as MouseEvent).clientY - r.top);
  }

  snapPoint(x: number, z: number): { x: number; z: number } {
    if (!this.snapEnabled) return { x, z };
    const g = this.project.settings.gridSnap;
    let sx = Math.round(x / g) * g;
    let sz = Math.round(z / g) * g;
    // endpoint / vertex snap (stronger)
    const snapR = 14 / this.scale;
    let best = snapR * snapR;
    let found = false;
    for (const st of this.project.strokes) {
      for (const p of st.points) {
        const d2 = dist2(x, z, p.x, p.z);
        if (d2 < best) { best = d2; sx = p.x; sz = p.z; found = true; }
      }
    }
    if (!found) {
      for (const l of this.project.water.lakes) {
        const d2 = dist2(x, z, l.x, l.z);
        if (d2 < best) { best = d2; sx = l.x; sz = l.z; }
      }
    }
    return { x: sx, z: sz };
  }

  private hitTest(x: number, z: number): HitResult {
    const tol = Math.max(10 / this.scale, 6);
    // vertices of selection first
    if (this.selection?.kind === 'stroke') {
      const st = this.project.strokes.find((s) => s.id === this.selection!.id);
      if (st) {
        for (let i = 0; i < st.points.length; i++) {
          if (dist2(x, z, st.points[i].x, st.points[i].z) < (12 / this.scale) ** 2) {
            return { sel: this.selection, vertexIndex: i, strokeId: st.id };
          }
        }
      }
    }
    // strokes
    let bestD = Infinity;
    let bestSel: Selection | null = null;
    for (const st of this.project.strokes) {
      const pts = st.points.map((p) => ({ x: p.x, y: p.z }));
      const hit = pointPolyline(x, z, pts);
      let halfW = tol;
      if (st.kind === 'road') halfW = Math.max(tol, totalHalfWidth(getRoadPreset(st.typeId)));
      else if (st.kind === 'river') halfW = Math.max(tol, st.width / 2);
      else if (st.kind === 'rail') halfW = Math.max(tol, getRailPreset(st.typeId).beamWidth / 2 + 4);
      if (hit.d < halfW && hit.d < bestD) {
        bestD = hit.d;
        bestSel = { kind: 'stroke', id: st.id };
      }
    }
    if (bestSel) return { sel: bestSel, vertexIndex: -1, strokeId: bestSel.id };

    // buildings
    for (const b of this.project.buildings) {
      const cos = Math.cos(-b.rot), sin = Math.sin(-b.rot);
      const dx = x - b.x, dz = z - b.z;
      const lx = dx * cos + dz * sin, lz = -dx * sin + dz * cos;
      if (Math.abs(lx) < b.w / 2 + 2 && Math.abs(lz) < b.d / 2 + 2) {
        return { sel: { kind: 'building', id: b.id }, vertexIndex: -1, strokeId: null };
      }
    }
    // trees
    for (const t of this.project.trees) {
      if (dist2(x, z, t.x, t.z) < (4 + t.s * 3) ** 2) {
        return { sel: { kind: 'tree', id: t.id }, vertexIndex: -1, strokeId: null };
      }
    }
    // lakes
    for (const l of this.project.water.lakes) {
      if (dist2(x, z, l.x, l.z) < l.radius * l.radius) {
        return { sel: { kind: 'lake', id: l.id }, vertexIndex: -1, strokeId: null };
      }
    }
    return { sel: null, vertexIndex: -1, strokeId: null };
  }

  private pointerDown(e: PointerEvent): void {
    this.canvas.setPointerCapture(e.pointerId);
    const w = this.evWorld(e);
    this.mouseWorld = w;

    if (e.button === 1 || e.button === 2) {
      this.panning = true;
      this.panLast = { x: e.clientX, y: e.clientY };
      return;
    }

    switch (this.tool) {
      case 'select': {
        const hit = this.hitTest(w.x, w.z);
        if (hit.vertexIndex >= 0 && hit.strokeId) {
          if (e.altKey) {
            // Alt-click a vertex removes it
            const st = this.project.strokes.find((s) => s.id === hit.strokeId);
            if (st && st.points.length > 2) {
              this.store.transact('remove vertex', () => {
                st.points.splice(hit.vertexIndex, 1);
              });
            }
            this.render();
            return;
          }
          this.draggingVertex = hit.vertexIndex;
          this.dragMoved = false;
          this.store.beginDrag();
          return;
        }
        if (hit.sel) {
          this.setSelection(hit.sel);
          // drag whole stroke/building/tree/lake
          this.draggingVertex = -2;
          this.dragMoved = false;
          this.store.beginDrag();
          this.panLast = { x: e.clientX, y: e.clientY };
          return;
        }
        this.setSelection(null);
        this.panning = true;
        this.panLast = { x: e.clientX, y: e.clientY };
        break;
      }
      case 'road':
      case 'rail':
      case 'river': {
        const p = this.snapPoint(w.x, w.z);
        if (!this.draft) {
          this.draft = {
            kind: this.tool,
            points: [{ x: p.x, z: p.z }],
            typeId: this.tool === 'rail' ? this.activeRailPreset : this.activeRoadPreset,
            width: this.riverWidth,
          };
        } else {
          this.draft.points.push({ x: p.x, z: p.z });
        }
        this.render();
        break;
      }
      case 'lake': {
        const p = this.snapPoint(w.x, w.z);
        this.store.transact('add lake', (proj) => {
          const lake: Lake = {
            id: newId('lake'), x: p.x, z: p.z,
            radius: this.lakeRadius, wobble: 0.16, seed: Math.floor(Math.random() * 1000),
          };
          proj.water.lakes.push(lake);
        });
        this.setSelection({ kind: 'lake', id: this.project.water.lakes[this.project.water.lakes.length - 1].id });
        break;
      }
      case 'building': {
        const p = this.snapPoint(w.x, w.z);
        this.drawingBuilding = { x0: p.x, z0: p.z, x1: p.x, z1: p.z };
        break;
      }
      case 'tree': {
        const p = this.snapPoint(w.x, w.z);
        this.store.transact('plant tree', (proj) => {
          const tree: Tree = {
            id: newId('tree'), x: p.x, z: p.z,
            s: 0.9 + Math.random() * 0.5, rot: Math.random() * Math.PI * 2, type: this.treeType,
          };
          proj.trees.push(tree);
        });
        this.setSelection({ kind: 'tree', id: this.project.trees[this.project.trees.length - 1].id });
        break;
      }
      case 'terrain': {
        this.terrainDragging = true;
        this.store.beginDrag();
        this.applyBrush(w.x, w.z);
        break;
      }
      case 'erase': {
        const hit = this.hitTest(w.x, w.z);
        if (hit.sel) this.deleteSelection(hit.sel);
        break;
      }
    }
    this.render();
  }

  private pointerMove(e: PointerEvent): void {
    const w = this.evWorld(e);
    this.mouseWorld = w;
    this.mouseIn = true;

    if (this.panning) {
      this.viewX -= (e.clientX - this.panLast.x) / this.scale;
      this.viewZ -= (e.clientY - this.panLast.y) / this.scale;
      this.panLast = { x: e.clientX, y: e.clientY };
      this.render();
      return;
    }

    if (this.draggingVertex >= 0 && this.selection?.kind === 'stroke') {
      const st = this.project.strokes.find((s) => s.id === this.selection!.id);
      if (st) {
        const p = this.snapPoint(w.x, w.z);
        st.points[this.draggingVertex].x = p.x;
        st.points[this.draggingVertex].z = p.z;
        this.dragMoved = true;
        this.onChange('move vertex');
      }
      this.render();
      return;
    }

    if (this.draggingVertex === -2 && this.selection && !e.altKey) {
      const dx = (e.clientX - this.panLast.x) / this.scale;
      const dz = (e.clientY - this.panLast.y) / this.scale;
      if (Math.abs(dx) + Math.abs(dz) > 0) this.dragMoved = true;
      this.panLast = { x: e.clientX, y: e.clientY };
      this.moveSelection(this.selection, dx, dz);
      this.render();
      return;
    }

    if (this.drawingBuilding) {
      const p = this.snapPoint(w.x, w.z);
      this.drawingBuilding.x1 = p.x;
      this.drawingBuilding.z1 = p.z;
      this.render();
      return;
    }

    if (this.terrainDragging && this.tool === 'terrain') {
      this.applyBrush(w.x, w.z);
      this.render();
      return;
    }

    if (this.draft || this.tool === 'terrain' || this.tool === 'lake') this.render();
    else if (this.tool === 'select') this.render();
  }

  private pointerUp(e: PointerEvent): void {
    if (this.terrainDragging) {
      this.terrainDragging = false;
      this.onChange('terrain brush');
    }
    if (this.draggingVertex === -2 && this.dragMoved) {
      this.onChange('move object');
    }
    if (this.drawingBuilding) {
      const { x0, z0, x1, z1 } = this.drawingBuilding;
      const w = Math.abs(x1 - x0), d = Math.abs(z1 - z0);
      if (w > 4 && d > 4) {
        this.store.transact('add building', (proj) => {
          const b: Building = {
            id: newId('bld'),
            x: (x0 + x1) / 2, z: (z0 + z1) / 2,
            w, d, h: this.buildingH, rot: 0,
            color: '#a2907c',
            roof: this.buildingH > 26 ? 'flat' : 'gable',
            type: this.buildingH > 40 ? 'tower' : this.buildingH > 18 ? 'block' : 'house',
          };
          proj.buildings.push(b);
        });
        this.setSelection({ kind: 'building', id: this.project.buildings[this.project.buildings.length - 1].id });
      }
      this.drawingBuilding = null;
      this.render();
    }
    this.draggingVertex = -1;
    void e;
    this.render();
  }

  private doubleClick(e: MouseEvent): void {
    const w = this.evWorld(e);
    if (this.draft) {
      // double-click finishes a stroke being drawn
      if (this.draft.points.length >= 2) {
        const last = this.draft.points[this.draft.points.length - 1];
        const prev = this.draft.points[this.draft.points.length - 2];
        if (dist2(last.x, last.z, prev.x, prev.z) < 1) this.draft.points.pop();
      }
      this.commitDraft();
      return;
    }
    if (this.tool === 'select' && this.selection?.kind === 'stroke') {
      const st = this.project.strokes.find((s) => s.id === this.selection!.id);
      if (st) {
        const pts = st.points.map((p) => ({ x: p.x, y: p.z }));
        const hit = pointPolyline(w.x, w.z, pts);
        const p = this.snapPoint(w.x, w.z);
        this.store.transact('insert vertex', () => {
          st.points.splice(hit.seg + 1, 0, { x: p.x, z: p.z });
        });
      }
    }
    this.render();
  }

  private keyDown(e: KeyboardEvent): void {
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    if (e.key === 'Enter' && this.draft) {
      this.commitDraft();
      return;
    }
    if (e.key === 'Escape') {
      if (this.draft) { this.draft = null; this.render(); return; }
      this.setSelection(null);
      return;
    }
    if (e.key === 'Backspace' && this.draft && this.draft.points.length > 1) {
      this.draft.points.pop();
      this.render();
      e.preventDefault();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) this.store.redo(); else this.store.undo();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      this.store.redo();
      return;
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (this.selection) { this.deleteSelection(this.selection); e.preventDefault(); }
      return;
    }
    if (e.key.toLowerCase() === 'f') { this.frameAll(); return; }
    if (e.key.toLowerCase() === 'g') {
      this.project.settings.showGrid = !this.project.settings.showGrid;
      this.store.touch('toggle grid');
      this.render();
      return;
    }
    const toolKeys: Record<string, Tool> = {
      '1': 'select', '2': 'road', '3': 'rail', '4': 'river', '5': 'lake',
      '6': 'building', '7': 'tree', '8': 'terrain', '9': 'erase',
    };
    if (toolKeys[e.key]) {
      this.setTool(toolKeys[e.key]);
    }
  }

  setTool(t: Tool): void {
    if (this.draft && t !== this.draft.kind) this.commitDraft();
    this.tool = t;
    this.onStatus(toolHint(t));
    this.render();
  }

  commitDraft(): void {
    if (!this.draft) return;
    const d = this.draft;
    this.draft = null;
    // drop consecutive duplicate points (double-click etc.)
    const pts = d.points.filter((p, i) =>
      i === 0 || dist2(p.x, p.z, d.points[i - 1].x, d.points[i - 1].z) > 0.25);
    if (pts.length >= 2) {
      this.store.transact(`add ${d.kind}`, (proj) => {
        proj.strokes.push({
          id: newId(d.kind),
          kind: d.kind,
          points: pts.map((p) => ({ ...p })),
          ...(d.kind === 'road' ? { typeId: d.typeId } : {}),
          ...(d.kind === 'rail' ? { typeId: d.typeId } : {}),
          ...(d.kind === 'river' ? { width: d.width } : {}),
        } as Project['strokes'][number]);
        const nid = proj.strokes[proj.strokes.length - 1].id;
        setTimeout(() => this.setSelection({ kind: 'stroke', id: nid }), 0);
      });
    }
    this.render();
  }

  setSelection(sel: Selection | null): void {
    this.selection = sel;
    this.onSelect(sel);
    this.render();
  }

  deleteSelection(sel: Selection): void {
    this.store.transact('delete', (proj) => {
      switch (sel.kind) {
        case 'stroke':
          proj.strokes = proj.strokes.filter((s) => s.id !== sel.id);
          break;
        case 'building':
          proj.buildings = proj.buildings.filter((b) => b.id !== sel.id);
          break;
        case 'tree':
          proj.trees = proj.trees.filter((t) => t.id !== sel.id);
          break;
        case 'lake':
          proj.water.lakes = proj.water.lakes.filter((l) => l.id !== sel.id);
          break;
      }
    });
    if (this.selection && this.selection.id === sel.id) this.setSelection(null);
  }

  moveSelection(sel: Selection, dx: number, dz: number): void {
    const proj = this.project;
    switch (sel.kind) {
      case 'stroke': {
        const st = proj.strokes.find((s) => s.id === sel.id);
        if (st) for (const p of st.points) { p.x += dx; p.z += dz; }
        break;
      }
      case 'building': {
        const b = proj.buildings.find((x) => x.id === sel.id);
        if (b) { b.x += dx; b.z += dz; }
        break;
      }
      case 'tree': {
        const t = proj.trees.find((x) => x.id === sel.id);
        if (t) { t.x += dx; t.z += dz; }
        break;
      }
      case 'lake': {
        const l = proj.water.lakes.find((x) => x.id === sel.id);
        if (l) { l.x += dx; l.z += dz; }
        break;
      }
    }
  }

  private lastBrush = { x: 1e9, z: 1e9 };

  applyBrush(x: number, z: number): void {
    // throttle: one edit per r/4 of mouse travel keeps the edit list sane
    const minStep = this.brushRadius * 0.25;
    if (dist2(x, z, this.lastBrush.x, this.lastBrush.z) < minStep * minStep) return;
    this.lastBrush = { x, z };
    const proj = this.project;
    let target: number | undefined;
    if (this.brushMode === 'flatten' && this.worldRef) {
      target = this.worldRef.terrain.sample(x, z);
    }
    proj.terrain.edits.push({
      x, z, r: this.brushRadius,
      d: this.brushMode === 'raise' || this.brushMode === 'lower' ? this.brushStrength : 1,
      mode: this.brushMode,
      t: target,
      p: this.brushMode === 'paint' ? 2 : undefined,
    });
    // keep the edit list from exploding
    if (proj.terrain.edits.length > 4000) proj.terrain.edits.splice(0, 200);
  }

  // ── rendering ──────────────────────────────────────────────────────────────
  render(world?: WorldBuild): void {
    if (world) this.worldRef = world;
    const ctx = this.ctx;
    const w = this.canvas.width / this.dpr, h = this.canvas.height / this.dpr;
    ctx.save();
    ctx.scale(this.dpr, this.dpr);
    ctx.fillStyle = '#20242c';
    ctx.fillRect(0, 0, w, h);

    this.drawTerrainRaster();
    this.drawGrid(ctx);
    this.drawWater(ctx);
    this.drawStrokes(ctx);
    this.drawCity(ctx);
    this.drawDraft(ctx);
    this.drawSelection(ctx);
    this.drawBrush(ctx);

    ctx.restore();
    this.onStatus(`${toolHint(this.tool)}  ·  zoom ${(this.scale * 100).toFixed(0)}%  ·  x ${this.mouseWorld.x.toFixed(0)}  z ${this.mouseWorld.z.toFixed(0)}`);
  }

  private worldRef: WorldBuild | null = null;

  private drawTerrainRaster(): void {
    const proj = this.project;
    const half = proj.terrain.size / 2;
    const key = `${proj.terrain.seed}|${proj.terrain.edits.length}|${proj.terrain.res}`;
    // raster is drawn directly (no cache invalidation complexity): cheap res
    const res = Math.min(proj.terrain.res, 129);
    const cv = this.terrainRaster && this.terrainRasterKey === key
      ? this.terrainRaster
      : (() => {
        const c = document.createElement('canvas');
        c.width = res; c.height = res;
        return c;
      })();
    if (this.terrainRasterKey !== key || !this.terrainRaster) {
      const rctx = cv.getContext('2d')!;
      const img = rctx.createImageData(res, res);
      const world = this.worldRef;
      const half = proj.terrain.size / 2;
      for (let j = 0; j < res; j++) {
        for (let i = 0; i < res; i++) {
          const x = -half + (i / (res - 1)) * proj.terrain.size;
          const z = -half + (j / (res - 1)) * proj.terrain.size;
          let hVal = 0, paint = 0, slope = 0;
          if (world) {
            hVal = world.terrain.sample(x, z);
            const gx = Math.max(0, Math.min(world.terrain.res - 1, Math.round((x + half) / world.terrain.cell)));
            const gz = Math.max(0, Math.min(world.terrain.res - 1, Math.round((z + half) / world.terrain.cell)));
            paint = world.terrain.paint[gz * world.terrain.res + gx] ?? 0;
            slope = world.terrain.slope(x, z);
          }
          const colors = [
            [0x4f, 0x63, 0x3c], [0x5c, 0x57, 0x50], [0x8f, 0x84, 0x60], [0x6b, 0x57, 0x3e],
          ];
          const c = colors[paint] ?? colors[0];
          const sh = clamp(0.75 + hVal * 0.008 + slope * 0.5, 0.55, 1.25);
          const k = (j * res + i) * 4;
          img.data[k] = c[0] * sh;
          img.data[k + 1] = c[1] * sh;
          img.data[k + 2] = c[2] * sh;
          img.data[k + 3] = 255;
        }
      }
      rctx.putImageData(img, 0, 0);
      this.terrainRaster = cv;
      this.terrainRasterKey = key;
    }
    const p0 = this.worldToScreen(-half, -half);
    const p1 = this.worldToScreen(half, half);
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.globalAlpha = 0.95;
    this.ctx.drawImage(cv, p0.x, p0.y, p1.x - p0.x, p1.y - p0.y);
    this.ctx.globalAlpha = 1;
    void dist;
  }

  private drawGrid(ctx: CanvasRenderingContext2D): void {
    if (!this.project.settings.showGrid) return;
    const g = this.project.settings.gridSnap;
    const step = this.scale > 1.2 ? g : this.scale > 0.35 ? g * 5 : g * 20;
    const w = this.canvas.width / this.dpr, h = this.canvas.height / this.dpr;
    const tl = this.screenToWorld(0, 0);
    const br = this.screenToWorld(w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = Math.floor(tl.x / step) * step; x < br.x; x += step) {
      const s = this.worldToScreen(x, 0);
      ctx.moveTo(s.x, 0); ctx.lineTo(s.x, h);
    }
    for (let z = Math.floor(tl.z / step) * step; z < br.z; z += step) {
      const s = this.worldToScreen(0, z);
      ctx.moveTo(0, s.y); ctx.lineTo(w, s.y);
    }
    ctx.stroke();
  }

  private drawWater(ctx: CanvasRenderingContext2D): void {
    const proj = this.project;
    ctx.fillStyle = 'rgba(46,111,174,0.78)';
    for (const lake of proj.water.lakes) {
      const c = this.worldToScreen(lake.x, lake.z);
      ctx.beginPath();
      const segs = 40;
      for (let i = 0; i <= segs; i++) {
        const a = (i / segs) * Math.PI * 2;
        const wob = 1 + 0.14 * Math.sin(a * 3 + lake.seed) * lake.wobble * 6;
        const r = lake.radius * wob * this.scale;
        const x = c.x + Math.cos(a) * r, y = c.y + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      if (this.selection?.kind === 'lake' && this.selection.id === lake.id) {
        ctx.strokeStyle = '#ffb02e';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
    for (const st of proj.strokes) {
      if (st.kind !== 'river') continue;
      this.strokePolyline(ctx, st.points, 'rgba(46,111,174,0.85)', st.width * this.scale);
    }
  }

  private strokePolyline(ctx: CanvasRenderingContext2D, pts: StrokePoint[], color: string, widthPx: number): void {
    if (pts.length < 2) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.5, widthPx);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    const s0 = this.worldToScreen(pts[0].x, pts[0].z);
    ctx.moveTo(s0.x, s0.y);
    for (let i = 1; i < pts.length; i++) {
      const s = this.worldToScreen(pts[i].x, pts[i].z);
      ctx.lineTo(s.x, s.y);
    }
    ctx.stroke();
  }

  private drawStrokes(ctx: CanvasRenderingContext2D): void {
    const proj = this.project;
    // rails first (under roads)
    for (const st of proj.strokes) {
      if (st.kind !== 'rail') continue;
      const rp = getRailPreset(st.typeId);
      const col = rp.id === 'monorail' ? '#b9c2cc' : '#3d3a33';
      this.strokePolyline(ctx, st.points, col, (rp.beamWidth + 1.4) * this.scale);
      this.strokePolyline(ctx, st.points, rp.id === 'monorail' ? '#7c8794' : '#8d8d92', Math.max(1, 0.5 * this.scale));
    }
    // roads
    for (const st of proj.strokes) {
      if (st.kind !== 'road') continue;
      const preset = getRoadPreset(st.typeId);
      const totalW = totalHalfWidth(preset) * 2;
      const catCol = CATEGORY_COLORS[preset.category] ?? '#5a5f6a';
      // pavement halo
      if (preset.pavement) {
        this.strokePolyline(ctx, st.points, '#7e8288', (totalW + preset.pavement.width * 2) * this.scale);
      }
      this.strokePolyline(ctx, st.points, catCol, totalW * this.scale);
      // center line
      if (preset.markings.center !== 'none') {
        this.strokePolyline(ctx, st.points,
          preset.markings.center === 'double-yellow' ? '#d8b13a' : 'rgba(232,232,232,0.75)',
          Math.max(1, 0.18 * this.scale));
      }
    }
  }

  private drawCity(ctx: CanvasRenderingContext2D): void {
    for (const b of this.project.buildings) {
      const s = this.worldToScreen(b.x, b.z);
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(b.rot);
      const w = b.w * this.scale, d = b.d * this.scale;
      ctx.fillStyle = this.selection?.kind === 'building' && this.selection.id === b.id ? '#ffb02e' : '#8d7f6c';
      ctx.fillRect(-w / 2, -d / 2, w, d);
      ctx.strokeStyle = 'rgba(0,0,0,0.45)';
      ctx.lineWidth = 1;
      ctx.strokeRect(-w / 2, -d / 2, w, d);
      ctx.restore();
    }
    for (const t of this.project.trees) {
      const s = this.worldToScreen(t.x, t.z);
      const r = Math.max(1.6, t.s * 2.6 * this.scale);
      const selected = this.selection?.kind === 'tree' && this.selection.id === t.id;
      ctx.fillStyle = selected ? '#ffb02e' : t.type === 'pine' ? '#2e5c33' : t.type === 'palm' ? '#5c8f42' : '#4e7c37';
      ctx.beginPath();
      ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawDraft(ctx: CanvasRenderingContext2D): void {
    if (this.draft) {
      const d = this.draft;
      const pts = [...d.points];
      const snapped = this.snapPoint(this.mouseWorld.x, this.mouseWorld.z);
      pts.push(snapped);
      let color = '#e8e8e8', width = 8;
      if (d.kind === 'road') {
        width = totalHalfWidth(getRoadPreset(d.typeId)) * 2;
        color = 'rgba(255,176,46,0.42)';
      } else if (d.kind === 'rail') {
        width = getRailPreset(d.typeId).beamWidth + 1;
        color = 'rgba(255,176,46,0.42)';
      } else {
        width = d.width;
        color = 'rgba(80,150,220,0.55)';
      }
      this.strokePolyline(ctx, pts, color, width * this.scale);
      // vertices
      for (const p of pts) {
        const s = this.worldToScreen(p.x, p.z);
        ctx.fillStyle = '#ffb02e';
        ctx.beginPath();
        ctx.arc(s.x, s.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      // snap cursor
      const cur = this.worldToScreen(snapped.x, snapped.z);
      ctx.strokeStyle = '#ffb02e';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cur.x, cur.y, 9, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (this.drawingBuilding) {
      const b = this.drawingBuilding;
      const p0 = this.worldToScreen(b.x0, b.z0);
      const p1 = this.worldToScreen(b.x1, b.z1);
      ctx.fillStyle = 'rgba(255,176,46,0.35)';
      ctx.fillRect(Math.min(p0.x, p1.x), Math.min(p0.y, p1.y), Math.abs(p1.x - p0.x), Math.abs(p1.y - p0.y));
      ctx.strokeStyle = '#ffb02e';
      ctx.strokeRect(Math.min(p0.x, p1.x), Math.min(p0.y, p1.y), Math.abs(p1.x - p0.x), Math.abs(p1.y - p0.y));
    }
  }

  private drawSelection(ctx: CanvasRenderingContext2D): void {
    const sel = this.selection;
    if (!sel) return;
    if (sel.kind === 'stroke') {
      const st = this.project.strokes.find((s) => s.id === sel.id);
      if (!st) return;
      this.strokePolyline(ctx, st.points, 'rgba(255,176,46,0.9)', Math.max(3, 2.2 / Math.sqrt(this.scale)));
      for (const p of st.points) {
        const s = this.worldToScreen(p.x, p.z);
        ctx.fillStyle = '#ffb02e';
        ctx.strokeStyle = '#20242c';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.rect(s.x - 4.5, s.y - 4.5, 9, 9);
        ctx.fill();
        ctx.stroke();
      }
    }
  }

  private drawBrush(ctx: CanvasRenderingContext2D): void {
    if (this.tool !== 'terrain' || !this.mouseIn) return;
    const s = this.worldToScreen(this.mouseWorld.x, this.mouseWorld.z);
    ctx.strokeStyle = this.brushMode === 'raise' ? '#7dde7d' : this.brushMode === 'lower' ? '#de7d7d' : '#dede7d';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.arc(s.x, s.y, this.brushRadius * this.scale, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

export function toolHint(tool: Tool): string {
  switch (tool) {
    case 'select': return 'Select — click to select, drag vertices / objects, double-click stroke to insert vertex, Alt-click vertex removes it';
    case 'road': return 'Draw road — click to add points, Enter/double-click to finish, Backspace removes last, Esc cancels';
    case 'rail': return 'Draw rail — click to add points, Enter to finish';
    case 'river': return 'Draw river — click to add points, Enter to finish';
    case 'lake': return 'Place lake — click on the terrain';
    case 'building': return 'Place building — drag a rectangle';
    case 'tree': return 'Plant tree — click to place';
    case 'terrain': return 'Terrain brush — hold and drag to sculpt';
    case 'erase': return 'Erase — click an object to delete it';
  }
}

export type { Pt };

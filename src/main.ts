// ─── Frontier bootstrap: 2D editor + live 3D view + build pipeline ───────────

import { ProjectStore } from './core/project.ts';
import { buildWorld, type WorldBuild } from './gen/build.ts';
import { createDemoProject } from './demo/demo.ts';
import { Editor2D, type Selection } from './editor/editor2d.ts';
import { UI, mountShell } from './editor/ui.ts';
import { Scene3D } from './three/scene3d.ts';

const store = new ProjectStore(createDemoProject());

// Build the DOM shell first so the canvases exist.
mountShell();
const canvas2d = document.getElementById('canvas-2d') as HTMLCanvasElement;
const canvas3d = document.getElementById('canvas-3d') as HTMLCanvasElement;

const editor = new Editor2D(canvas2d, store);
const scene = new Scene3D(canvas3d);

let world: WorldBuild | null = null;
let rebuildTimer: number | null = null;
let needsRebuild = true;
let buildMs = 0;

function rebuild(): void {
  const t0 = performance.now();
  try {
    world = buildWorld(store.project);
    buildMs = performance.now() - t0;
    scene.rebuild(store.project, world);
    scene.showNodeHandles(store.project, editor.selection?.kind === 'stroke' ? editor.selection.id : null, world);
    editor.render(world);
    document.getElementById('statusbar')!.textContent =
      `Rebuilt in ${buildMs.toFixed(0)} ms  ·  ${store.project.strokes.length} strokes  ·  ${store.project.trees.length} trees`;
  } catch (err) {
    console.error('Rebuild failed', err);
    document.getElementById('statusbar')!.textContent = `Rebuild error: ${err}`;
  }
  needsRebuild = false;
}

function scheduleRebuild(): void {
  needsRebuild = true;
  if (rebuildTimer !== null) window.clearTimeout(rebuildTimer);
  rebuildTimer = window.setTimeout(() => {
    rebuildTimer = null;
    rebuild();
  }, 180);
}

// ── view mode switching ──────────────────────────────────────────────────────
function setViewMode(mode: '2d' | '3d' | 'split'): void {
  const vp = document.getElementById('viewport')!;
  vp.className = `view-${mode}`;
  requestAnimationFrame(() => {
    editor.resize();
    scene.resize();
    editor.render(world ?? undefined);
  });
}

// ── UI wiring ────────────────────────────────────────────────────────────────
const ui = new UI({
  editor,
  store,
  setViewMode,
  rebuild3D: scheduleRebuild,
  loadDemo: () => {
    store.transact('load demo', (p) => {
      const demo = createDemoProject();
      Object.assign(p, demo);
    });
    onProjectLoaded();
  },
  onProjectLoaded,
});

function onProjectLoaded(): void {
  scheduleRebuild();
  ui.refreshProperties();
  ui.refreshSettings();
  ui.refreshStats();
  editor.frameAll();
}

// editor changes → debounced rebuild
editor.onChange = () => scheduleRebuild();
store.subscribe((_p, label) => {
  if (label === 'load' || label === 'undo' || label === 'redo' || label === 'terrain brush' ||
      label === 'move vertex' || label === 'move object' || label === 'add road' || label === 'add rail' ||
      label === 'add river' || label === 'add lake' || label === 'add building' || label === 'plant tree' ||
      label === 'delete' || label === 'apply preset' || label === 'change type' || label === 'toggle bridge' ||
      label === 'elevation' || label === 'insert vertex' || label === 'edit building' || label === 'load demo' ||
      label === 'new project' || label === 'river width' || label === 'lake radius' || label === 'apply rail type' ||
      label === 'rename') {
    scheduleRebuild();
  }
});

editor.onSelect = (sel: Selection | null) => {
  ui.refreshProperties();
  if (world) {
    scene.showNodeHandles(store.project, sel?.kind === 'stroke' ? sel.id : null, world);
  }
};

// ── 3D interaction: click-select + drag nodes ────────────────────────────────
let dragging3D: { strokeId: string; index: number; planeY: number } | null = null;

canvas3d.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;
  const hit = scene.pick(e.clientX, e.clientY);
  if (!hit) return;
  if (hit.kind === 'node' && hit.id) {
    const st = store.project.strokes.find((s) => s.id === hit.id);
    editor.setSelection({ kind: 'stroke', id: hit.id });
    if (st && world) {
      // grab nearest vertex of that stroke
      let best = 0, bestD = Infinity;
      st.points.forEach((pt, i) => {
        const d = (pt.x - hit.point.x) ** 2 + (pt.z - hit.point.z) ** 2;
        if (d < bestD) { bestD = d; best = i; }
      });
      dragging3D = { strokeId: hit.id, index: best, planeY: hit.point.y };
      store.beginDrag();
      scene.controls.enabled = false;
      canvas3d.style.cursor = 'grabbing';
    }
  } else if (hit.kind === 'stroke' && hit.id) {
    editor.setSelection({ kind: 'stroke', id: hit.id });
  } else if (hit.kind === 'building' && hit.id) {
    editor.setSelection({ kind: 'building', id: hit.id });
  } else if (hit.kind === 'ground') {
    if (!e.altKey) editor.setSelection(null);
  }
});

canvas3d.addEventListener('pointermove', (e) => {
  if (!dragging3D) return;
  const pt = scene.rayToGround(e.clientX, e.clientY, dragging3D.planeY);
  if (!pt) return;
  const st = store.project.strokes.find((s) => s.id === dragging3D!.strokeId);
  if (!st) return;
  st.points[dragging3D.index].x = pt.x;
  st.points[dragging3D.index].z = pt.z;
  editor.render(world ?? undefined);
  scheduleRebuild();
});

window.addEventListener('pointerup', () => {
  if (dragging3D) {
    dragging3D = null;
    canvas3d.style.cursor = '';
    scene.controls.enabled = true;
    scheduleRebuild();
  }
});

// ── render loop ──────────────────────────────────────────────────────────────
let lastT = performance.now();
function frame(): void {
  const now = performance.now();
  const dt = Math.min(0.1, (now - lastT) / 1000);
  lastT = now;
  scene.render(dt);
  requestAnimationFrame(frame);
}

// ── boot ─────────────────────────────────────────────────────────────────────
setViewMode('split');
rebuild();
editor.frameAll();
scene.frameAll(store.project);
frame();

// expose for debugging
(window as unknown as Record<string, unknown>).__frontier = { store, editor, scene, rebuild };
void needsRebuild;
void ui;

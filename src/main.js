// Frontier Road Studio — app entry: 2D editor + live 3D preview.
import { createStore } from './state.js';
import { Editor2D } from './editor2d.js';
import { View3D } from './view3d.js';
import { initUI } from './ui.js';
import { buildDemoProject } from './demoCity.js';
import { autoMergeIntersections } from './topology.js';

const store = createStore();

// Load demo city on first run
try {
  store.project = buildDemoProject();
  autoMergeIntersections(store.project);
  autoMergeIntersections(store.project);
} catch (e) {
  console.error('Demo build failed', e);
}
store.cam2d = { cx: 0, cz: 60, scale: 0.85 };

const hint2d = document.getElementById('hint2d');
const editor = new Editor2D(document.getElementById('canvas2d'), store, {
  onHint: (t) => {
    hint2d.textContent = t;
    hint2d.classList.toggle('show', !!t);
  },
  onSelect: () => ui.renderProps(),
});

const view = new View3D(document.getElementById('viewport3d'), store, {
  onStats: (stats, info) => ui.updateMeshStats(stats, info),
});

const ui = initUI(store, editor, view);

// splitter
{
  const split = document.getElementById('splitter');
  const pane2d = document.getElementById('pane2d');
  let drag = null;
  split.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, w: pane2d.getBoundingClientRect().width };
    split.setPointerCapture(e.pointerId);
  });
  split.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const total = document.getElementById('viewports').getBoundingClientRect().width;
    const w = Math.max(280, Math.min(total - 280, drag.w + e.clientX - drag.x));
    pane2d.style.width = `${(w / total) * 100}%`;
  });
  split.addEventListener('pointerup', () => { drag = null; });
}

store.emit('all');
ui.status('Ready — 2D left · 3D right · pick a preset and draw', 'Demo city loaded: countryside → city → offroad', '');

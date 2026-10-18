// ─── UI shell: toolbar, preset library, properties panel, settings ───────────

import { ROAD_PRESETS, RAIL_PRESETS, getRoadPreset, getRailPreset, type RoadPreset } from '../core/presets.ts';
import type { ProjectStore } from '../core/project.ts';
import { PROJECT_VERSION, emptyProject, type Project, type TerrainBrushMode } from '../core/types.ts';
import type { Editor2D, Selection, Tool } from './editor2d.ts';

export interface UIHooks {
  editor: Editor2D;
  store: ProjectStore;
  setViewMode: (mode: '2d' | '3d' | 'split') => void;
  rebuild3D: () => void;
  loadDemo: () => void;
  onProjectLoaded: () => void;
}

const TOOL_DEFS: { id: Tool; label: string; key: string; icon: string }[] = [
  { id: 'select', label: 'Select / Move', key: '1', icon: '⬚' },
  { id: 'road', label: 'Draw Road', key: '2', icon: '═' },
  { id: 'rail', label: 'Draw Rail / Monorail', key: '3', icon: '‖' },
  { id: 'river', label: 'Draw River', key: '4', icon: '≈' },
  { id: 'lake', label: 'Place Lake', key: '5', icon: '◉' },
  { id: 'building', label: 'Place Building', key: '6', icon: '▣' },
  { id: 'tree', label: 'Plant Trees', key: '7', icon: '♣' },
  { id: 'terrain', label: 'Terrain Brush', key: '8', icon: '⛰' },
  { id: 'erase', label: 'Erase', key: '9', icon: '⌫' },
];

/** Build the DOM shell (must run before the editor/scene constructors). */
export function mountShell(): void {
  const app = document.getElementById('app')!;
  app.innerHTML = `
      <header id="topbar">
        <div class="brand">🗺️ <b>FRONTIER</b> <span class="sub">Road & City Network Editor</span></div>
        <div class="tb-group">
          <button data-view="2d">2D</button>
          <button data-view="3d">3D</button>
          <button data-view="split" class="active">Split</button>
        </div>
        <div class="tb-group">
          <button id="btn-undo" title="Ctrl+Z">⤺ Undo</button>
          <button id="btn-redo" title="Ctrl+Y">⤻ Redo</button>
        </div>
        <div class="tb-group">
          <button id="btn-demo">Demo City</button>
          <button id="btn-new">New</button>
          <button id="btn-save">Save JSON</button>
          <button id="btn-load">Load JSON</button>
          <input type="file" id="file-input" accept=".json,application/json" hidden>
        </div>
        <input id="proj-name" class="proj-name" value="Frontier City" spellcheck="false">
      </header>
      <div id="main">
        <aside id="toolbar"></aside>
        <section id="viewport">
          <div id="pane-2d" class="pane"><canvas id="canvas-2d"></canvas></div>
          <div id="pane-3d" class="pane"><canvas id="canvas-3d"></canvas></div>
        </section>
        <aside id="sidebar">
          <section class="panel">
            <h3>Presets & Properties</h3>
            <div id="props"></div>
          </section>
          <section class="panel">
            <h3>Road Type Library</h3>
            <div id="preset-lib"></div>
          </section>
          <section class="panel">
            <h3>Rail Library</h3>
            <div id="rail-lib"></div>
          </section>
          <section class="panel">
            <h3>Scene Settings</h3>
            <div id="settings"></div>
          </section>
          <section class="panel">
            <h3>Stats</h3>
            <div id="stats" class="stats"></div>
          </section>
        </aside>
      </div>
      <footer id="statusbar">Ready</footer>
    `;

  // toolbar buttons
  const tb = document.getElementById('toolbar')!;
  for (const t of TOOL_DEFS) {
    const b = document.createElement('button');
    b.className = 'tool-btn' + (t.id === 'select' ? ' active' : '');
    b.dataset.tool = t.id;
    b.title = `${t.label} (${t.key})`;
    b.innerHTML = `<span class="icon">${t.icon}</span><span class="label">${t.label}</span><span class="key">${t.key}</span>`;
    tb.appendChild(b);
  }
  const params = document.createElement('div');
  params.className = 'tool-params';
  params.innerHTML = `
      <label>Active road preset
        <select id="sel-road-preset">${ROAD_PRESETS.map((p) => `<option value="${p.id}">${p.name}</option>`).join('')}</select>
      </label>
      <label>Active rail type
        <select id="sel-rail-preset">${RAIL_PRESETS.map((p) => `<option value="${p.id}">${p.name}</option>`).join('')}</select>
      </label>
      <label>River width <span id="val-river">42</span> m
        <input type="range" id="rng-river" min="8" max="140" value="42">
      </label>
      <label>Lake radius <span id="val-lake">160</span> m
        <input type="range" id="rng-lake" min="40" max="500" value="160">
      </label>
      <label>Building height <span id="val-bh">22</span> m
        <input type="range" id="rng-bh" min="6" max="110" value="22">
      </label>
      <label>Tree type
        <select id="sel-tree">
          <option value="oak">Oak</option>
          <option value="pine">Pine</option>
          <option value="palm">Palm</option>
          <option value="dead">Dead</option>
        </select>
      </label>
      <label>Brush mode
        <select id="sel-brush">
          <option value="raise">Raise</option>
          <option value="lower">Lower</option>
          <option value="flatten">Flatten</option>
          <option value="smooth">Smooth</option>
        </select>
      </label>
      <label>Brush radius <span id="val-br">60</span> m
        <input type="range" id="rng-br" min="15" max="300" value="60">
      </label>
      <label>Brush strength <span id="val-bs">2.2</span>
        <input type="range" id="rng-bs" min="0.4" max="12" step="0.2" value="2.2">
      </label>
    `;
  tb.appendChild(params);
}

export class UI {
  private els: Record<string, HTMLElement> = {};
  private viewMode: '2d' | '3d' | 'split' = 'split';

  constructor(private hooks: UIHooks) {
    this.wire();
    this.refreshPresets();
    this.refreshProperties();
    this.refreshSettings();
    this.refreshStats();
  }

  private wire(): void {
    const { editor, store } = this.hooks;

    document.querySelectorAll<HTMLButtonElement>('#toolbar .tool-btn').forEach((b) => {
      b.addEventListener('click', () => {
        document.querySelectorAll('#toolbar .tool-btn').forEach((x) => x.classList.remove('active'));
        b.classList.add('active');
        editor.setTool(b.dataset.tool as Tool);
      });
    });

    const bindRange = (id: string, valId: string, fn: (v: number) => void) => {
      const el = document.getElementById(id) as HTMLInputElement;
      el.addEventListener('input', () => {
        document.getElementById(valId)!.textContent = el.value;
        fn(parseFloat(el.value));
        editor.render();
      });
    };
    bindRange('rng-river', 'val-river', (v) => { editor.riverWidth = v; if (editor.draft && editor.draft.kind === 'river') editor.draft.width = v; });
    bindRange('rng-lake', 'val-lake', (v) => { editor.lakeRadius = v; });
    bindRange('rng-bh', 'val-bh', (v) => { editor.buildingH = v; });
    bindRange('rng-br', 'val-br', (v) => { editor.brushRadius = v; });
    bindRange('rng-bs', 'val-bs', (v) => { editor.brushStrength = v; });

    (document.getElementById('sel-road-preset') as HTMLSelectElement).addEventListener('change', (e) => {
      editor.activeRoadPreset = (e.target as HTMLSelectElement).value;
    });
    (document.getElementById('sel-rail-preset') as HTMLSelectElement).addEventListener('change', (e) => {
      editor.activeRailPreset = (e.target as HTMLSelectElement).value;
    });
    (document.getElementById('sel-tree') as HTMLSelectElement).addEventListener('change', (e) => {
      editor.treeType = (e.target as HTMLSelectElement).value as 'oak';
    });
    (document.getElementById('sel-brush') as HTMLSelectElement).addEventListener('change', (e) => {
      editor.brushMode = (e.target as HTMLSelectElement).value as TerrainBrushMode;
    });

    document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach((b) => {
      b.addEventListener('click', () => {
        document.querySelectorAll('[data-view]').forEach((x) => x.classList.remove('active'));
        b.classList.add('active');
        this.viewMode = b.dataset.view as '2d' | '3d' | 'split';
        this.hooks.setViewMode(this.viewMode);
      });
    });

    document.getElementById('btn-undo')!.addEventListener('click', () => store.undo());
    document.getElementById('btn-redo')!.addEventListener('click', () => store.redo());
    document.getElementById('btn-demo')!.addEventListener('click', () => this.hooks.loadDemo());
    document.getElementById('btn-new')!.addEventListener('click', () => {
      if (confirm('Start a new empty project? Unsaved changes are kept in history only.')) {
        store.transact('new project', () => {
          const p = emptyProject('Untitled');
          Object.assign(store.project, p);
        });
        this.hooks.onProjectLoaded();
      }
    });
    document.getElementById('btn-save')!.addEventListener('click', () => store.download());
    document.getElementById('btn-load')!.addEventListener('click', () => document.getElementById('file-input')!.click());
    document.getElementById('file-input')!.addEventListener('change', async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        store.load(await file.text());
        (document.getElementById('proj-name') as HTMLInputElement).value = store.project.name;
        this.hooks.onProjectLoaded();
      } catch (err) {
        alert(`Could not load project: ${err}`);
      }
    });

    (document.getElementById('proj-name') as HTMLInputElement).addEventListener('change', (e) => {
      store.project.name = (e.target as HTMLInputElement).value;
    });

    editor.onStatus = (msg) => {
      document.getElementById('statusbar')!.textContent = msg;
    };
    editor.onSelect = () => this.refreshProperties();

    store.subscribe(() => {
      this.refreshProperties();
      this.refreshSettings();
      this.refreshStats();
    });
  }

  refreshStats(): void {
    const p = this.hooks.store.project;
    const roads = p.strokes.filter((s) => s.kind === 'road').length;
    const rails = p.strokes.filter((s) => s.kind === 'rail').length;
    const rivers = p.strokes.filter((s) => s.kind === 'river').length;
    const el = document.getElementById('stats');
    if (el) {
      el.innerHTML = `
        <div>🛣️ Roads: <b>${roads}</b> · 🚆 Rail: <b>${rails}</b> · 🌊 Rivers: <b>${rivers}</b></div>
        <div>🏞️ Lakes: <b>${p.water.lakes.length}</b> · 🏢 Buildings: <b>${p.buildings.length}</b> · 🌲 Trees: <b>${p.trees.length}</b></div>
        <div>⛰️ Terrain edits: <b>${p.terrain.edits.length}</b> · v${PROJECT_VERSION}</div>
      `;
    }
  }

  refreshPresets(): void {
    const lib = document.getElementById('preset-lib')!;
    const cats = ['highway', 'arterial', 'street', 'rural', 'offroad', 'special'];
    lib.innerHTML = cats.map((cat) => `
      <div class="cat">${cat}</div>
      ${ROAD_PRESETS.filter((p) => p.category === cat).map((p) => `
        <div class="preset-item" data-preset="${p.id}" title="${p.description}">
          <span class="swatch" style="background:${p.color}"></span>
          <span class="pname">${p.name}</span>
          <span class="pdesc">${p.description}</span>
        </div>`).join('')}
    `).join('');

    lib.querySelectorAll<HTMLElement>('.preset-item').forEach((item) => {
      item.addEventListener('click', () => {
        const id = item.dataset.preset!;
        this.hooks.editor.activeRoadPreset = id;
        (document.getElementById('sel-road-preset') as HTMLSelectElement).value = id;
        const sel = this.hooks.editor.selection;
        if (sel?.kind === 'stroke') {
          const st = this.hooks.store.project.strokes.find((s) => s.id === sel.id);
          if (st && st.kind === 'road') {
            this.hooks.store.transact('apply preset', () => { (st as { typeId: string }).typeId = id; });
          }
        }
        this.refreshProperties();
      });
    });

    const rlib = document.getElementById('rail-lib')!;
    rlib.innerHTML = RAIL_PRESETS.map((p) => `
      <div class="preset-item" data-rail="${p.id}" title="${p.description}">
        <span class="swatch" style="background:${p.color}"></span>
        <span class="pname">${p.name}</span>
        <span class="pdesc">${p.description}</span>
      </div>`).join('');
    rlib.querySelectorAll<HTMLElement>('.preset-item').forEach((item) => {
      item.addEventListener('click', () => {
        const id = item.dataset.rail!;
        this.hooks.editor.activeRailPreset = id;
        (document.getElementById('sel-rail-preset') as HTMLSelectElement).value = id;
        const sel = this.hooks.editor.selection;
        if (sel?.kind === 'stroke') {
          const st = this.hooks.store.project.strokes.find((s) => s.id === sel.id);
          if (st && st.kind === 'rail') {
            this.hooks.store.transact('apply rail type', () => { (st as { typeId: string }).typeId = id; });
          }
        }
      });
    });
  }

  refreshProperties(): void {
    const el = document.getElementById('props');
    if (!el) return;
    const sel = this.hooks.editor.selection;
    const p = this.hooks.store.project;
    if (!sel) {
      el.innerHTML = `<div class="hint">Nothing selected.<br><br>
        • Pick a tool on the left and draw.<br>
        • Click a road to edit it.<br>
        • Road presets below apply to a selected road.<br>
        • <b>Ctrl+Z</b> undo · <b>F</b> frame all · <b>G</b> grid.</div>`;
      return;
    }
    if (sel.kind === 'stroke') {
      const st = p.strokes.find((s) => s.id === sel.id);
      if (!st) return;
      const isRoad = st.kind === 'road', isRail = st.kind === 'rail', isRiver = st.kind === 'river';
      el.innerHTML = `
        <label>Name <input id="pr-name" value="${(st.name ?? '').replace(/"/g, '&quot;')}" placeholder="${st.kind}"></label>
        ${isRoad ? `<label>Road type
          <select id="pr-type">${ROAD_PRESETS.map((x) => `<option value="${x.id}" ${x.id === (st as { typeId: string }).typeId ? 'selected' : ''}>${x.name}</option>`).join('')}</select>
        </label>
        <label class="row"><input type="checkbox" id="pr-bridge" ${(st as { bridge?: boolean }).bridge ? 'checked' : ''}> Force bridge / viaduct</label>
        <label>Elevation offset <span id="val-elev">${(st as { elevOffset?: number }).elevOffset ?? 0}</span> m
          <input type="range" id="pr-elev" min="-20" max="40" step="0.5" value="${(st as { elevOffset?: number }).elevOffset ?? 0}">
        </label>` : ''}
        ${isRail ? `<label>Rail type
          <select id="pr-type">${RAIL_PRESETS.map((x) => `<option value="${x.id}" ${x.id === (st as { typeId: string }).typeId ? 'selected' : ''}>${x.name}</option>`).join('')}</select>
        </label>
        <label class="row"><input type="checkbox" id="pr-bridge" ${(st as { elevated?: boolean }).elevated ? 'checked' : ''}> Elevated</label>` : ''}
        ${isRiver ? `<label>Width <span id="val-rw">${(st as { width: number }).width}</span> m
          <input type="range" id="pr-width" min="8" max="160" value="${(st as { width: number }).width}">
        </label>` : ''}
        <div class="row gap">
          <button id="pr-delete" class="danger">Delete</button>
        </div>
        <div class="hint">${isRoad ? getRoadPreset((st as { typeId: string }).typeId).description : isRail ? getRailPreset((st as { typeId: string }).typeId).description : 'Waterway — carve terrain and render water.'}</div>
      `;
      (document.getElementById('pr-name') as HTMLInputElement).addEventListener('change', (e) => {
        this.hooks.store.transact('rename', () => { st.name = (e.target as HTMLInputElement).value; });
      });
      const typeSel = document.getElementById('pr-type') as HTMLSelectElement | null;
      typeSel?.addEventListener('change', () => {
        this.hooks.store.transact('change type', () => { (st as { typeId: string }).typeId = typeSel.value; });
        this.refreshProperties();
      });
      const bridge = document.getElementById('pr-bridge') as HTMLInputElement | null;
      bridge?.addEventListener('change', () => {
        this.hooks.store.transact('toggle bridge', () => {
          if (st.kind === 'road') st.bridge = bridge.checked;
          else if (st.kind === 'rail') st.elevated = bridge.checked;
        });
      });
      const elev = document.getElementById('pr-elev') as HTMLInputElement | null;
      elev?.addEventListener('input', () => {
        document.getElementById('val-elev')!.textContent = elev.value;
        this.hooks.store.transact('elevation', () => { (st as { elevOffset?: number }).elevOffset = parseFloat(elev.value); });
      });
      const width = document.getElementById('pr-width') as HTMLInputElement | null;
      width?.addEventListener('input', () => {
        document.getElementById('val-rw')!.textContent = width.value;
        this.hooks.store.transact('river width', () => { (st as { width: number }).width = parseFloat(width.value); });
      });
      document.getElementById('pr-delete')!.addEventListener('click', () => {
        this.hooks.editor.deleteSelection(sel);
      });
      return;
    }
    if (sel.kind === 'building') {
      const b = p.buildings.find((x) => x.id === sel.id)!;
      el.innerHTML = `
        <label>Width <input id="pr-w" type="number" value="${b.w.toFixed(1)}"></label>
        <label>Depth <input id="pr-d" type="number" value="${b.d.toFixed(1)}"></label>
        <label>Height <input id="pr-h" type="number" value="${b.h.toFixed(1)}"></label>
        <label>Roof
          <select id="pr-roof">
            <option value="flat" ${b.roof === 'flat' ? 'selected' : ''}>Flat</option>
            <option value="gable" ${b.roof === 'gable' ? 'selected' : ''}>Gable</option>
            <option value="hip" ${b.roof === 'hip' ? 'selected' : ''}>Stepped</option>
          </select>
        </label>
        <div class="row gap"><button id="pr-delete" class="danger">Delete</button></div>
      `;
      const upd = () => this.hooks.store.transact('edit building', () => {
        b.w = parseFloat((document.getElementById('pr-w') as HTMLInputElement).value) || b.w;
        b.d = parseFloat((document.getElementById('pr-d') as HTMLInputElement).value) || b.d;
        b.h = parseFloat((document.getElementById('pr-h') as HTMLInputElement).value) || b.h;
        b.roof = (document.getElementById('pr-roof') as HTMLSelectElement).value as 'flat';
      });
      ['pr-w', 'pr-d', 'pr-h', 'pr-roof'].forEach((id) => document.getElementById(id)!.addEventListener('change', upd));
      document.getElementById('pr-delete')!.addEventListener('click', () => this.hooks.editor.deleteSelection(sel));
      return;
    }
    if (sel.kind === 'tree') {
      const t = p.trees.find((x) => x.id === sel.id)!;
      el.innerHTML = `
        <label>Type
          <select id="pr-tt">
            ${['oak', 'pine', 'palm', 'dead'].map((v) => `<option value="${v}" ${t.type === v ? 'selected' : ''}>${v}</option>`).join('')}
          </select>
        </label>
        <label>Scale <input id="pr-ts" type="number" step="0.1" value="${t.s.toFixed(2)}"></label>
        <div class="row gap"><button id="pr-delete" class="danger">Delete</button></div>
      `;
      document.getElementById('pr-tt')!.addEventListener('change', (e) => {
        this.hooks.store.transact('tree type', () => { t.type = (e.target as HTMLSelectElement).value as 'oak'; });
      });
      document.getElementById('pr-ts')!.addEventListener('change', (e) => {
        this.hooks.store.transact('tree scale', () => { t.s = parseFloat((e.target as HTMLInputElement).value) || t.s; });
      });
      document.getElementById('pr-delete')!.addEventListener('click', () => this.hooks.editor.deleteSelection(sel));
      return;
    }
    if (sel.kind === 'lake') {
      const l = p.water.lakes.find((x) => x.id === sel.id)!;
      el.innerHTML = `
        <label>Radius <span id="val-lr">${l.radius.toFixed(0)}</span> m
          <input type="range" id="pr-lr" min="30" max="600" value="${l.radius}">
        </label>
        <label>Wobble <span id="val-lw">${l.wobble.toFixed(2)}</span>
          <input type="range" id="pr-lw" min="0" max="0.5" step="0.01" value="${l.wobble}">
        </label>
        <div class="row gap"><button id="pr-delete" class="danger">Delete</button></div>
      `;
      document.getElementById('pr-lr')!.addEventListener('input', (e) => {
        const v = parseFloat((e.target as HTMLInputElement).value);
        document.getElementById('val-lr')!.textContent = String(v);
        this.hooks.store.transact('lake radius', () => { l.radius = v; });
      });
      document.getElementById('pr-lw')!.addEventListener('input', (e) => {
        const v = parseFloat((e.target as HTMLInputElement).value);
        document.getElementById('val-lw')!.textContent = v.toFixed(2);
        this.hooks.store.transact('lake wobble', () => { l.wobble = v; });
      });
      document.getElementById('pr-delete')!.addEventListener('click', () => this.hooks.editor.deleteSelection(sel));
    }
  }

  refreshSettings(): void {
    const el = document.getElementById('settings');
    if (!el) return;
    const s = this.hooks.store.project.settings;
    const w = this.hooks.store.project.water;
    if (el.dataset.init === '1') {
      // just sync values
      (el.querySelector('#st-snap') as HTMLInputElement).value = String(s.gridSnap);
      (el.querySelector('#st-water') as HTMLInputElement).value = String(w.level);
      return;
    }
    el.dataset.init = '1';
    el.innerHTML = `
      <label>Grid snap <span id="val-snap">${s.gridSnap}</span> m
        <input type="range" id="st-snap" min="1" max="25" value="${s.gridSnap}">
      </label>
      <label>Water level <span id="val-water">${w.level}</span> m
        <input type="range" id="st-water" min="-5" max="40" step="0.5" value="${w.level}">
      </label>
      <label class="row"><input type="checkbox" id="st-grid" ${s.showGrid ? 'checked' : ''}> Show grid</label>
      <label class="row"><input type="checkbox" id="st-marks" ${s.showMarkings ? 'checked' : ''}> Show markings (3D)</label>
      <label class="row"><input type="checkbox" id="st-shadows" ${s.shadows ? 'checked' : ''}> Shadows (3D)</label>
      <label class="row"><input type="checkbox" id="st-autob" ${s.autoBridge ? 'checked' : ''}> Auto-bridge over water</label>
    `;
    (el.querySelector('#st-snap') as HTMLInputElement).addEventListener('input', (e) => {
      s.gridSnap = parseFloat((e.target as HTMLInputElement).value);
      document.getElementById('val-snap')!.textContent = String(s.gridSnap);
    });
    (el.querySelector('#st-water') as HTMLInputElement).addEventListener('input', (e) => {
      w.level = parseFloat((e.target as HTMLInputElement).value);
      document.getElementById('val-water')!.textContent = String(w.level);
      this.hooks.rebuild3D();
      this.hooks.editor.render();
    });
    (el.querySelector('#st-grid') as HTMLInputElement).addEventListener('change', (e) => {
      s.showGrid = (e.target as HTMLInputElement).checked;
      this.hooks.editor.render();
    });
    (el.querySelector('#st-marks') as HTMLInputElement).addEventListener('change', (e) => {
      s.showMarkings = (e.target as HTMLInputElement).checked;
      this.hooks.rebuild3D();
    });
    (el.querySelector('#st-shadows') as HTMLInputElement).addEventListener('change', (e) => {
      s.shadows = (e.target as HTMLInputElement).checked;
      this.hooks.rebuild3D();
    });
    (el.querySelector('#st-autob') as HTMLInputElement).addEventListener('change', (e) => {
      s.autoBridge = (e.target as HTMLInputElement).checked;
      this.hooks.rebuild3D();
    });
  }
}

export type { Selection, RoadPreset, Project };

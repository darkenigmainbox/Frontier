/**
 * Frontier Layer Stack Inspector UI (extracted & adapted from c7egoist/Frontier TerrainStudio).
 *
 * Organizes Base Terrain Shape, 3D Stratigraphy, Procedural Shape Modifiers, Texturing Layers,
 * Independent/Simultaneous Simulation Layers (Hydraulic, Cryosphere, Aeolian Wind, Rockfall),
 * Visual Layers (2.5D Water, Snow & Glaciers, 3D Outcrops), and Real 3D Grass Vegetation
 * into a unified non-destructive Layer Stack where each layer has its own properties card.
 */

import {
  EMITTER_MODES,
  EROSION_LANDSCAPES,
  MATERIAL_THEMES,
  ROCK_FABRIC_MODES,
} from './erosion-presets.js';

const GLYPH_PATHS = {
  layers:  '<path d="m12 3 10 6-10 6L2 9l10-6Zm-10 9 10 6 10-6M2 15l10 6 10-6"/>',
  plus:    '<path d="M12 5v14M5 12h14"/>',
  reset:   '<path d="M3 12a9 9 0 1 0 2.6-6.4L3 8"/><path d="M3 3v5h5"/>',
  sliders: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2.2"/><circle cx="9" cy="17" r="2.2"/>',
  grip:    '<circle cx="9" cy="6" r="1.1" fill="currentColor" stroke="none"/><circle cx="15" cy="6" r="1.1" fill="currentColor" stroke="none"/><circle cx="9" cy="12" r="1.1" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1.1" fill="currentColor" stroke="none"/><circle cx="9" cy="18" r="1.1" fill="currentColor" stroke="none"/><circle cx="15" cy="18" r="1.1" fill="currentColor" stroke="none"/>',
  trash:   '<path d="M4 7h16M9 7V4h6v3M6.5 7l1 13h9l1-13M10 11v6M14 11v6"/>',
  brush:   '<path d="m14.5 4.5 5 5L9 20H4v-5Z"/><path d="m12.5 6.5 5 5M4 20c2.8.3 4.8-.7 5.6-2.9"/>',
  sun:     '<circle cx="12" cy="12" r="4"/><path d="M12 2.5V5M12 19v2.5M2.5 12H5M19 12h2.5M5 5l1.8 1.8M17.2 17.2 19 19M19 5l-1.8 1.8M6.8 17.2 5 19"/>',
  strata:  '<path d="M3 7h18M3 12h18M3 17h18"/><path d="M7 7v5M14 12v5M10 17v2"/>',
  droplet: '<path d="M12 3.5s6 6.3 6 10.4a6 6 0 0 1-12 0C6 9.8 12 3.5 12 3.5Z"/>',
  massif:  '<path d="M3 19 9 7l4 6 3-4 5 10Z"/><path d="M9 7 7.8 9.2M9 7l1.2 2.2"/>',
  ridge:   '<path d="M3 19 7.5 8 11 14l3-7 7 12"/><path d="M7.5 8 6.2 10.4M14 7l-1.2 2.6"/>',
  front:   '<path d="M3 19c5-1 5-9 10-11 3.5-1.4 6 .5 8-.5"/><path d="M12 8l-1.5 3M16.5 6 15 9.5"/>',
  mesa:    '<path d="M4 19 7 9h10l3 10Z"/><path d="M7 9h10"/>',
  river:   '<path d="M12 3v4c0 4-7 4.5-7 9v5"/><path d="M12 7c0 4 7 4.5 7 9"/><path d="M5 21h14"/>',
  glacier: '<path d="M3 20c4-9 8-13 12-13 2 0 4 1 6 3"/><path d="M8 13c2 1.6 2 4.4 0 7M13.5 10c2 2.4 2 6.6 0 10"/>',
  talus:   '<path d="M4 20 15 5l1 15"/><circle cx="9" cy="17.5" r="0.5" fill="currentColor"/><circle cx="11.5" cy="14.5" r="0.5" fill="currentColor"/><circle cx="13" cy="18.5" r="0.5" fill="currentColor"/>',
  wind:    '<path d="M3 8h11a3 3 0 1 0-3-3"/><path d="M3 12.5h15a3 3 0 1 1-3 3"/><path d="M3 17h7"/>',
  snow:    '<path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9"/><path d="M12 3l-2 2.5M12 3l2 2.5M12 21l-2-2.5M12 21l2-2.5"/>',
  shuffle: '<path d="M4 6h4l10 12h2M20 6h-4l-2.5 3M4 18h4l2.5-3"/><path d="m17.5 3.5 2.5 2.5-2.5 2.5M17.5 15.5 20 18l-2.5 2.5"/>',
  crag:    '<circle cx="9" cy="14" r="4.5"/><circle cx="15.5" cy="11" r="4"/><circle cx="14" cy="16.5" r="3.6"/>',
  grass:   '<path d="M12 20V9c0-3 2-5.5 4.5-6.5M12 20c-0.5-5-2.5-8.5-6-10.5M12 20c0.8-4.2 3-7.2 6.5-8.8M7 20c0-3.2-1.4-5.6-3.5-7M17 20c0-2.8 1.2-5 3.2-6.2"/><path d="M4 20h16"/>',
  crater:  '<ellipse cx="12" cy="13" rx="8.5" ry="4.5"/><path d="M6.5 14.5c2 1.8 9 1.8 11 0M3.5 13l-1 4.5M20.5 13l1 4.5"/>',
  play:    '<polygon points="7,5 19,12 7,19" fill="currentColor" stroke="none"/>',
  pause:   '<rect x="6.5" y="5" width="3.8" height="14" rx="1" fill="currentColor" stroke="none"/><rect x="13.7" y="5" width="3.8" height="14" rx="1" fill="currentColor" stroke="none"/>',
  solo:    '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3" fill="currentColor"/>',
};

export function glyphSvg(name) {
  const paths = GLYPH_PATHS[name] || GLYPH_PATHS.layers;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
}

export const PROCEDURAL_MODIFIER_CATALOG = [
  {
    kind: 0,
    typeId: 'mod-ridge',
    label: 'Ridge & Horn Uplift',
    sub: 'Formation · Generator',
    glyph: 'ridge',
    blurb: 'Sharp domain-warped arête spines and pyramidal horn intersections stacked onto the terrain.',
    defaults: { amplitude: 56, scale: 2.2, detail: 0.56, angle: 28, strength: 0.85, blendMode: 0, maskType: 0, maskLow: 0.0, maskHigh: 1.0, maskInvert: false },
  },
  {
    kind: 1,
    typeId: 'mod-massif',
    label: 'Continental Massif & Plateau',
    sub: 'Formation · Generator',
    glyph: 'mesa',
    blurb: 'Broad tectonic uplift with adjustable flat-topped plateau shaping and fractal warp.',
    defaults: { amplitude: 48, scale: 1.6, detail: 0.65, angle: 0, strength: 0.80, blendMode: 0, maskType: 0, maskLow: 0.0, maskHigh: 1.0, maskInvert: false },
  },
  {
    kind: 2,
    typeId: 'mod-escarpment',
    label: 'Tectonic Fault Escarpment',
    sub: 'Formation · Generator',
    glyph: 'front',
    blurb: 'Tilted fault-block step and steep scarp wall cutting across the domain.',
    defaults: { amplitude: 52, scale: 2.0, detail: 0.62, angle: 35, strength: 0.85, blendMode: 0, maskType: 0, maskLow: 0.0, maskHigh: 1.0, maskInvert: false },
  },
  {
    kind: 3,
    typeId: 'mod-terrace',
    label: 'Strata Terrace Package',
    sub: 'Formation · Modifier',
    glyph: 'strata',
    blurb: 'Dipping cliff-and-bench stratigraphic terrace steps carved into bedrock.',
    defaults: { amplitude: 60, scale: 2.4, detail: 0.55, angle: 22, strength: 0.75, blendMode: 0, maskType: 0, maskLow: 0.0, maskHigh: 1.0, maskInvert: false },
  },
  {
    kind: 4,
    typeId: 'mod-dunes',
    label: 'Aeolian Sand Dune Stamp',
    sub: 'Formation · Sand',
    glyph: 'wind',
    blurb: 'Deposits asymmetric wind-rippled sand dune chains directly into the fine sediment layer.',
    defaults: { amplitude: 42, scale: 2.5, detail: 0.50, angle: 32, strength: 0.85, blendMode: 0, maskType: 1, maskLow: 0.0, maskHigh: 0.45, maskInvert: true },
  },
  {
    kind: 5,
    typeId: 'mod-craters',
    label: 'Impact Crater Field',
    sub: 'Formation · Planetary',
    glyph: 'crater',
    blurb: 'Excavates bowl craters with raised overturned ejecta rims across the terrain.',
    defaults: { amplitude: 44, scale: 2.0, detail: 0.65, angle: 0, strength: 0.90, blendMode: 0, maskType: 0, maskLow: 0.0, maskHigh: 1.0, maskInvert: false },
  },
];

let modSerialCounter = 1;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export class ErosionLayerStackUI {
  constructor(engine, callbacks = {}) {
    this.engine = engine;
    this.callbacks = callbacks;
    this.selectedLayerId = 'vis-vegetation';
    this.activeTab = 'layers';
    this._popoverEl = null;
    this._rebuildTimer = null;

    this._bindInspectorChrome();
    this.refreshAll();
  }

  _bindInspectorChrome() {
    document.querySelectorAll('#er-inspector-tabs button').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.activeTab = btn.dataset.tab;
        document.querySelectorAll('#er-inspector-tabs button').forEach((b) => {
          b.classList.toggle('active', b === btn);
        });
        document.getElementById('er-page-layers')?.classList.toggle('hidden-panel', this.activeTab !== 'layers');
        document.getElementById('er-page-brush')?.classList.toggle('hidden-panel', this.activeTab !== 'brush');
        document.getElementById('er-page-scene')?.classList.toggle('hidden-panel', this.activeTab !== 'scene');
      });
    });

    const addBtn = document.getElementById('er-add-layer-btn');
    if (addBtn) {
      addBtn.innerHTML = `<span class="ls-glyph">${glyphSvg('plus')}</span><span>Add Procedural Shape Layer</span>`;
      addBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._toggleAddLayerMenu(addBtn);
      });
    }

    const playAllBtn = document.getElementById('er-sim-play-all');
    if (playAllBtn) {
      playAllBtn.addEventListener('click', () => {
        const p = this.engine.params;
        p.simHydraulicPlaying = true;
        p.simCryoPlaying = true;
        p.simWindPlaying = true;
        p.simRockfallPlaying = true;
        this.engine.playing = true;
        this.callbacks.onTransportSync?.();
        this.renderStack();
        this.renderProperties();
      });
    }

    const pauseAllBtn = document.getElementById('er-sim-pause-all');
    if (pauseAllBtn) {
      pauseAllBtn.addEventListener('click', () => {
        const p = this.engine.params;
        p.simHydraulicPlaying = false;
        p.simCryoPlaying = false;
        p.simWindPlaying = false;
        p.simRockfallPlaying = false;
        this.renderStack();
        this.renderProperties();
      });
    }

    document.addEventListener('click', () => this._closeMenu());
  }

  _scheduleTerrainRebuild(immediate = false) {
    const badge = document.getElementById('er-stack-badge');
    if (badge) {
      badge.textContent = 'Rebuilding';
      badge.classList.add('stale');
    }
    if (this._rebuildTimer) clearTimeout(this._rebuildTimer);
    this._rebuildTimer = setTimeout(() => {
      this.engine.resetSimulation();
      if (badge) {
        badge.textContent = 'Ready';
        badge.classList.remove('stale');
      }
    }, immediate ? 16 : 140);
  }

  getBuiltInStackEntries() {
    const p = this.engine.params;
    const mods = Array.isArray(p.proceduralModifiers) ? p.proceduralModifiers : [];

    // Ordered from top of stack (Vegetation, Visuals & Simulations) down to Basement Formation!
    const topLayers = [
      {
        id: 'vis-vegetation',
        label: 'Vegetation · 3D Grass',
        sub: p.grassMode === 1 ? 'Foliage · Dry Grass' : p.grassMode === 2 ? 'Foliage · Biome Blend' : 'Foliage · Green Grass',
        glyph: 'grass',
        group: 'Visual',
        isEnabled: () => Boolean(p.grassEnabled),
        setEnabled: (on) => { p.grassEnabled = on; },
      },
      {
        id: 'vis-snow',
        label: 'Snow & Glacier Layer',
        sub: 'Visual · Cryosphere',
        glyph: 'snow',
        group: 'Visual',
        isEnabled: () => p.snowLayerEnabled !== false,
        setEnabled: (on) => { p.snowLayerEnabled = on; },
      },
      {
        id: 'vis-water',
        label: '2.5D Water, Rivers & Lakes',
        sub: 'Visual · Hydrology',
        glyph: 'river',
        group: 'Visual',
        isEnabled: () => Boolean(p.showWater && p.waterLayerEnabled !== false),
        setEnabled: (on) => {
          p.waterLayerEnabled = on;
          p.showWater = on;
          this.callbacks.onExternalSync?.();
        },
      },
      {
        id: 'vis-rocks',
        label: '3D Outcrops & Boulders',
        sub: 'Visual · 3D Mesh',
        glyph: 'crag',
        group: 'Visual',
        isEnabled: () => p.showOutcrops !== false,
        setEnabled: (on) => {
          p.showOutcrops = on;
          this.callbacks.onExternalSync?.();
        },
      },
      {
        id: 'sim-rockfall',
        label: 'Cliff Talus & Rockfall',
        sub: 'Simulation · Gravity',
        glyph: 'talus',
        group: 'Simulation',
        isSim: true,
        isPlaying: () => p.simRockfallPlaying !== false,
        setPlaying: (on) => {
          p.simRockfallPlaying = on;
          if (on && !this.engine.playing) {
            this.engine.playing = true;
            this.callbacks.onTransportSync?.();
          }
        },
      },
      {
        id: 'sim-wind',
        label: 'Aeolian Wind & Dunes',
        sub: 'Simulation · Saltation',
        glyph: 'wind',
        group: 'Simulation',
        isSim: true,
        isPlaying: () => p.simWindPlaying !== false,
        setPlaying: (on) => {
          p.simWindPlaying = on;
          if (on && !this.engine.playing) {
            this.engine.playing = true;
            this.callbacks.onTransportSync?.();
          }
        },
      },
      {
        id: 'sim-cryo',
        label: 'Snowfall & Glacier Sim',
        sub: 'Simulation · Blizzard',
        glyph: 'glacier',
        group: 'Simulation',
        isSim: true,
        isPlaying: () => p.simCryoPlaying !== false,
        setPlaying: (on) => {
          p.simCryoPlaying = on;
          if (on && !this.engine.playing) {
            this.engine.playing = true;
            this.callbacks.onTransportSync?.();
          }
        },
      },
      {
        id: 'sim-hydraulic',
        label: 'Hydraulic Rain & Rivers',
        sub: 'Simulation · Fluvial',
        glyph: 'droplet',
        group: 'Simulation',
        isSim: true,
        isPlaying: () => p.simHydraulicPlaying !== false,
        setPlaying: (on) => {
          p.simHydraulicPlaying = on;
          if (on && !this.engine.playing) {
            this.engine.playing = true;
            this.callbacks.onTransportSync?.();
          }
        },
      },
      {
        id: 'tex-fabric',
        label: 'Stone Fabric & Sand Ripples',
        sub: 'Texturing · Micro-Detail',
        glyph: 'strata',
        group: 'Texturing',
        isEnabled: () => p.fabricLayerEnabled !== false,
        setEnabled: (on) => { p.fabricLayerEnabled = on; },
      },
      {
        id: 'tex-lithology',
        label: 'Rock Palette & Lithology',
        sub: 'Texturing · Albedo',
        glyph: 'layers',
        group: 'Texturing',
        isEnabled: () => p.lithologyLayerEnabled !== false,
        setEnabled: (on) => { p.lithologyLayerEnabled = on; },
      },
    ];

    // User-added Procedural Modifier Layers rendered newest-on-top right above Base Formation!
    const modEntries = [];
    for (let i = mods.length - 1; i >= 0; i--) {
      const m = mods[i];
      const spec = PROCEDURAL_MODIFIER_CATALOG.find((c) => c.kind === m.kind) || PROCEDURAL_MODIFIER_CATALOG[0];
      modEntries.push({
        id: m.id,
        label: m.label || spec.label,
        sub: spec.sub,
        glyph: spec.glyph,
        group: 'Formation',
        isModifier: true,
        modIndex: i,
        modRef: m,
        isEnabled: () => m.enabled !== false,
        setEnabled: (on) => {
          m.enabled = on;
          this._scheduleTerrainRebuild(true);
        },
      });
    }

    const baseLayers = [
      {
        id: 'shape-strata',
        label: '3D Stratigraphy & Faults',
        sub: 'Formation · Structure',
        glyph: 'strata',
        group: 'Formation',
        isEnabled: () => p.strataLayerEnabled !== false,
        setEnabled: (on) => { p.strataLayerEnabled = on; },
      },
      {
        id: 'shape-base',
        label: 'Base Terrain Shape',
        sub: 'Formation · Basement',
        glyph: 'massif',
        group: 'Formation',
        lockedOn: true,
        isEnabled: () => true,
        setEnabled: () => {},
      },
    ];

    return [...topLayers, ...modEntries, ...baseLayers];
  }

  refreshAll() {
    this._updateIdentityHeader();
    this.renderStack();
    this.renderProperties();
  }

  _updateIdentityHeader() {
    const preset = EROSION_LANDSCAPES[this.engine.params.landscape];
    const nameEl = document.getElementById('er-identity-name');
    const kindEl = document.getElementById('er-identity-kind');
    if (nameEl && preset) nameEl.textContent = preset.name;
    if (kindEl) kindEl.textContent = `512² GPGPU · ${this.getBuiltInStackEntries().length} Layers`;
  }

  renderStack() {
    const host = document.getElementById('er-layer-stack');
    if (!host) return;
    host.textContent = '';

    const entries = this.getBuiltInStackEntries();
    const countEl = document.getElementById('er-layer-count');
    if (countEl) countEl.textContent = String(entries.length);
    this._updateIdentityHeader();

    // Update active simulation count badge
    const p = this.engine.params;
    const activeSims = [p.simHydraulicPlaying !== false, p.simCryoPlaying !== false, p.simWindPlaying !== false, p.simRockfallPlaying !== false].filter(Boolean).length;
    const simBadge = document.getElementById('er-sim-count-pill');
    if (simBadge) simBadge.textContent = `${activeSims}/4 Simulating`;

    let lastGroup = '';
    for (const item of entries) {
      if (item.group !== lastGroup) {
        lastGroup = item.group;
        const grp = el('div', 'ls-group-divider', item.group);
        host.appendChild(grp);
      }

      const card = el('div', 'ls-layer-card');
      const activeState = item.isSim ? item.isPlaying() : item.isEnabled();
      if (item.id === this.selectedLayerId) card.classList.add('selected');
      if (!activeState) card.classList.add('disabled');

      if (item.isModifier) {
        const grip = el('span', 'ls-layer-grip');
        grip.innerHTML = glyphSvg('grip');
        grip.title = 'Drag to reorder procedural generator';
        card.appendChild(grip);
        this._attachModifierDrag(card, grip, item.modIndex);
      }

      const glyphBox = el('span', `ls-layer-glyph grp-${item.group.toLowerCase()}`);
      glyphBox.innerHTML = glyphSvg(item.glyph);
      card.appendChild(glyphBox);

      const textBox = el('span', 'ls-layer-text');
      textBox.appendChild(el('div', 'ls-layer-name', item.label));
      const subRow = el('div', 'ls-layer-sub', item.sub);
      if (item.isModifier && item.modRef.maskType > 0) {
        subRow.appendChild(el('span', 'ls-mask-chip', item.modRef.maskType === 1 ? 'Height' : 'Slope'));
      }
      textBox.appendChild(subRow);
      card.appendChild(textBox);

      if (item.isSim) {
        // Simulation Layers have Solo button + Play/Pause chip button!
        const soloBtn = el('button', 'ls-sim-solo', 'Solo');
        soloBtn.title = 'Run ONLY this simulation layer (pause the other 3)';
        soloBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          p.simHydraulicPlaying = item.id === 'sim-hydraulic';
          p.simCryoPlaying = item.id === 'sim-cryo';
          p.simWindPlaying = item.id === 'sim-wind';
          p.simRockfallPlaying = item.id === 'sim-rockfall';
          this.engine.playing = true;
          this.selectedLayerId = item.id;
          this.callbacks.onTransportSync?.();
          this.renderStack();
          this.renderProperties();
        });
        card.appendChild(soloBtn);

        const playBtn = el('button', `ls-sim-btn ${activeState ? 'playing' : 'paused'}`);
        playBtn.innerHTML = glyphSvg(activeState ? 'pause' : 'play');
        playBtn.title = activeState ? 'Pause this simulation layer' : 'Play this simulation layer';
        playBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          item.setPlaying(!item.isPlaying());
          this.renderStack();
          this.renderProperties();
        });
        card.appendChild(playBtn);
      } else if (!item.lockedOn) {
        card.appendChild(this._buildMiniToggle(activeState, (nextOn) => {
          item.setEnabled(nextOn);
          this.renderStack();
          this.renderProperties();
        }));
      } else {
        card.appendChild(el('span', 'ls-base-lock', 'Base'));
      }

      if (item.isModifier) {
        const delBtn = el('button', 'ls-layer-delete');
        delBtn.innerHTML = glyphSvg('trash');
        delBtn.title = 'Remove procedural layer';
        delBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.engine.params.proceduralModifiers.splice(item.modIndex, 1);
          if (this.selectedLayerId === item.id) this.selectedLayerId = 'shape-base';
          this.renderStack();
          this.renderProperties();
          this._scheduleTerrainRebuild(true);
        });
        card.appendChild(delBtn);
      }

      card.addEventListener('click', () => {
        this.selectedLayerId = item.id;
        this.renderStack();
        this.renderProperties();
      });

      host.appendChild(card);
    }
  }

  _attachModifierDrag(card, grip, modIndex) {
    grip.addEventListener('pointerdown', () => { card.draggable = true; });
    card.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', String(modIndex));
      e.dataTransfer.effectAllowed = 'move';
    });
    card.addEventListener('dragend', () => { card.draggable = false; });
    card.addEventListener('dragover', (e) => {
      e.preventDefault();
      card.classList.add('drag-over');
    });
    card.addEventListener('dragleave', () => card.classList.remove('drag-over'));
    card.addEventListener('drop', (e) => {
      e.preventDefault();
      card.classList.remove('drag-over');
      const from = parseInt(e.dataTransfer.getData('text/plain'), 10);
      const mods = this.engine.params.proceduralModifiers;
      if (!Number.isFinite(from) || from === modIndex || !mods[from]) return;
      const [moved] = mods.splice(from, 1);
      mods.splice(modIndex, 0, moved);
      this.renderStack();
      this._scheduleTerrainRebuild(true);
    });
  }

  _buildMiniToggle(isOn, onChange) {
    const t = el('span', `ls-toggle mini ${isOn ? 'on' : ''}`);
    t.appendChild(el('span', 'ls-toggle-knob'));
    t.title = isOn ? 'Disable layer' : 'Enable layer';
    t.addEventListener('click', (e) => {
      e.stopPropagation();
      onChange(!isOn);
    });
    return t;
  }

  _toggleAddLayerMenu(anchor) {
    if (this._popoverEl) {
      this._closeMenu();
      return;
    }
    const menu = el('div', 'ls-popover-menu');
    menu.addEventListener('click', (e) => e.stopPropagation());
    menu.appendChild(el('div', 'ls-popover-head', 'Add Procedural Terrain Generator'));

    for (const spec of PROCEDURAL_MODIFIER_CATALOG) {
      const row = el('button', 'ls-popover-item');
      const ic = el('span', 'ls-layer-glyph');
      ic.innerHTML = glyphSvg(spec.glyph);
      row.appendChild(ic);
      const txt = el('span', 'ls-popover-text');
      txt.appendChild(el('div', 'ls-popover-title', spec.label));
      txt.appendChild(el('div', 'ls-popover-sub', spec.blurb));
      row.appendChild(txt);
      row.addEventListener('click', () => {
        const newMod = {
          id: `mod-${modSerialCounter++}`,
          kind: spec.kind,
          label: spec.label,
          enabled: true,
          seed: Math.floor(1000 + Math.random() * 89999),
          ...spec.defaults,
        };
        if (!Array.isArray(this.engine.params.proceduralModifiers)) {
          this.engine.params.proceduralModifiers = [];
        }
        this.engine.params.proceduralModifiers.push(newMod);
        this.selectedLayerId = newMod.id;
        this._closeMenu();
        this.renderStack();
        this.renderProperties();
        this._scheduleTerrainRebuild(true);
      });
      menu.appendChild(row);
    }

    const rect = anchor.getBoundingClientRect();
    menu.style.top = `${Math.min(window.innerHeight - 360, rect.bottom + 6)}px`;
    menu.style.right = `${Math.max(12, window.innerWidth - rect.right)}px`;
    document.body.appendChild(menu);
    this._popoverEl = menu;
  }

  _closeMenu() {
    if (this._popoverEl) {
      this._popoverEl.remove();
      this._popoverEl = null;
    }
  }

  _makeCard(title, glyph, subtitle) {
    const card = el('div', 'ls-prop-card');
    const head = el('div', 'ls-prop-head');
    const left = el('span', 'ls-prop-title');
    const ic = el('span', 'ls-prop-icon');
    ic.innerHTML = glyphSvg(glyph);
    left.appendChild(ic);
    left.appendChild(document.createTextNode(title));
    head.appendChild(left);
    card.appendChild(head);
    if (subtitle) {
      card.appendChild(el('div', 'ls-prop-sub', subtitle));
    }
    const content = el('div', 'ls-prop-body');
    card.appendChild(content);
    return { card, content };
  }

  _makePillSlider({ label, min, max, step, unit = '', get, set, fmt }) {
    const wrap = el('div', 'ls-control');
    const head = el('div', 'ls-control-head');
    head.appendChild(el('span', 'ls-control-label', label));

    const pill = el('span', 'ls-value-pill');
    const valSpan = el('span', 'ls-value-num');
    const unitSpan = el('span', 'ls-value-unit', unit);
    pill.appendChild(valSpan);
    if (unit) pill.appendChild(unitSpan);
    head.appendChild(pill);
    wrap.appendChild(head);

    const range = document.createElement('input');
    range.type = 'range';
    range.className = 'ls-pill-slider';
    range.min = String(min);
    range.max = String(max);
    range.step = String(step);

    const updateVisual = (v) => {
      range.value = String(v);
      const pct = Math.max(0, Math.min(100, ((v - min) / Math.max(1e-6, max - min)) * 100));
      range.style.setProperty('--fill', `${pct.toFixed(1)}%`);
      valSpan.textContent = fmt ? fmt(v) : (step >= 1 ? String(Math.round(v)) : Number(v).toFixed(2));
    };
    updateVisual(get());

    range.addEventListener('input', () => {
      const v = Number(range.value);
      updateVisual(v);
      set(v, false);
    });
    range.addEventListener('change', () => {
      const v = Number(range.value);
      updateVisual(v);
      set(v, true);
    });

    wrap.appendChild(range);
    return wrap;
  }

  _makeSelect({ label, options, get, set }) {
    const row = el('div', 'ls-select-row');
    row.appendChild(el('span', 'ls-control-label', label));
    const sel = document.createElement('select');
    sel.className = 'ls-select';
    for (const opt of options) {
      const o = document.createElement('option');
      o.value = String(opt.value);
      o.textContent = opt.label;
      sel.appendChild(o);
    }
    sel.value = String(get());
    sel.addEventListener('change', () => set(sel.value));
    row.appendChild(sel);
    return row;
  }

  _makeSwitchRow(label, get, set) {
    const row = el('div', 'ls-switch-row');
    row.appendChild(el('span', '', label));
    const toggle = this._buildMiniToggle(get(), (next) => {
      set(next);
      this.renderStack();
      this.renderProperties();
    });
    row.appendChild(toggle);
    row.addEventListener('click', () => {
      set(!get());
      this.renderStack();
      this.renderProperties();
    });
    return row;
  }

  renderProperties() {
    const host = document.getElementById('er-layer-properties');
    if (!host) return;
    host.textContent = '';

    const p = this.engine.params;
    const id = this.selectedLayerId;

    // Check if user selected one of the dynamic Procedural Modifier Layers
    const mods = Array.isArray(p.proceduralModifiers) ? p.proceduralModifiers : [];
    const modLayer = mods.find((m) => m.id === id);
    if (modLayer) {
      this._renderModifierProperties(host, modLayer);
      return;
    }

    if (id === 'vis-vegetation') {
      const { card, content } = this._makeCard('Vegetation · 3D Grass', 'grass', 'GPU-instanced 3D curved grass tufts (Green / Dry)');
      content.appendChild(this._makeSwitchRow('Enable 3D Grass Layer', () => Boolean(p.grassEnabled), (on) => { p.grassEnabled = on; }));
      content.appendChild(this._makeSelect({
        label: 'Grass Species',
        options: [
          { value: 0, label: 'Green Highland Grass' },
          { value: 1, label: 'Dry Savanna / Desert Grass' },
          { value: 2, label: 'Biome Auto-Blend (Green + Dry)' },
        ],
        get: () => p.grassMode ?? 0,
        set: (v) => { p.grassMode = Number(v); this.renderStack(); },
      }));
      content.appendChild(this._makePillSlider({
        label: 'Grass Tuft Density', min: 0.02, max: 1.0, step: 0.02, unit: '%',
        fmt: (v) => `${Math.round(v * 100)}`,
        get: () => p.grassDensity ?? 0.55,
        set: (v) => { p.grassDensity = v; },
      }));
      content.appendChild(this._makePillSlider({
        label: 'Blade Height', min: 0.40, max: 2.80, step: 0.05, unit: 'm',
        get: () => p.grassHeight ?? 1.15,
        set: (v) => { p.grassHeight = v; },
      }));
      content.appendChild(this._makePillSlider({
        label: 'Green ↔ Dry Tint', min: 0.0, max: 1.0, step: 0.02, unit: '%',
        fmt: (v) => `${Math.round(v * 100)}`,
        get: () => p.grassDryBlend ?? 0.15,
        set: (v) => { p.grassDryBlend = v; },
      }));
      content.appendChild(this._makePillSlider({
        label: 'Max Holding Slope', min: 0.20, max: 1.25, step: 0.02, unit: '°',
        fmt: (v) => `${Math.round((Math.atan(v) * 180) / Math.PI)}`,
        get: () => p.grassSlopeMax ?? 0.62,
        set: (v) => { p.grassSlopeMax = v; },
      }));
      content.appendChild(this._makePillSlider({
        label: 'Alpine Treeline Limit', min: 0.12, max: 1.0, step: 0.02, unit: '%',
        fmt: (v) => `${Math.round(v * 100)}`,
        get: () => p.grassElevMax ?? 0.52,
        set: (v) => { p.grassElevMax = v; },
      }));
      content.appendChild(this._makePillSlider({
        label: 'Wind Gust Sway', min: 0.0, max: 1.5, step: 0.05, unit: '×',
        get: () => p.grassWindSway ?? 0.65,
        set: (v) => { p.grassWindSway = v; },
      }));
      content.appendChild(this._makePillSlider({
        label: 'Meadow Clumping', min: 0.0, max: 1.0, step: 0.02, unit: '%',
        fmt: (v) => `${Math.round(v * 100)}`,
        get: () => p.grassPatchiness ?? 0.58,
        set: (v) => { p.grassPatchiness = v; },
      }));
      host.appendChild(card);
    } else if (id === 'vis-snow') {
      const { card, content } = this._makeCard('Snow & Glacier Layer', 'snow', 'Visual cryosphere snowpack & crevassed glacier ice');
      content.appendChild(this._makeSwitchRow('Show Snow & Glacier Cover', () => p.snowLayerEnabled !== false, (on) => { p.snowLayerEnabled = on; }));
      content.appendChild(this._makePillSlider({
        label: 'Snow & Ice Opacity', min: 0.0, max: 1.0, step: 0.02, unit: '%',
        fmt: (v) => `${Math.round(v * 100)}`,
        get: () => p.snowVisOpacity ?? 1.0,
        set: (v) => { p.snowVisOpacity = v; },
      }));
      content.appendChild(this._makePillSlider({
        label: 'Freezing Snowline', min: 0.12, max: 1.0, step: 0.01, unit: '%',
        fmt: (v) => `${Math.round(v * 100)}`,
        get: () => p.snowline,
        set: (v) => { p.snowline = v; },
      }));
      host.appendChild(card);
    } else if (id === 'vis-water') {
      const { card, content } = this._makeCard('2.5D Water, Rivers & Lakes', 'river', 'Shallow-water river surface & hydrostatic lake pools');
      content.appendChild(this._makeSwitchRow('Show 2.5D Water Surface', () => Boolean(p.showWater && p.waterLayerEnabled !== false), (on) => {
        p.waterLayerEnabled = on;
        p.showWater = on;
        this.callbacks.onExternalSync?.();
      }));
      content.appendChild(this._makePillSlider({
        label: 'Water Layer Opacity', min: 0.0, max: 1.0, step: 0.02, unit: '%',
        fmt: (v) => `${Math.round(v * 100)}`,
        get: () => p.waterVisOpacity ?? 1.0,
        set: (v) => { p.waterVisOpacity = v; },
      }));
      content.appendChild(this._makePillSlider({
        label: 'Lake Basin Retention', min: 0.0, max: 1.0, step: 0.02, unit: '%',
        fmt: (v) => `${Math.round(v * 100)}`,
        get: () => p.lakeRetention ?? 0.40,
        set: (v) => { p.lakeRetention = v; },
      }));
      content.appendChild(this._makePillSlider({
        label: 'Spring / Oasis Inflow', min: 0.0, max: 1.0, step: 0.02, unit: '%',
        fmt: (v) => `${Math.round(v * 100)}`,
        get: () => p.headwaterFlow ?? 0.0,
        set: (v) => { p.headwaterFlow = v; },
      }));
      host.appendChild(card);
    } else if (id === 'vis-rocks') {
      const { card, content } = this._makeCard('3D Outcrops & Boulders', 'crag', '512² surface-locked crown tors & cliff-toe talus fans');
      content.appendChild(this._makeSwitchRow('Show 3D Rocks & Outcrops', () => p.showOutcrops !== false, (on) => {
        p.showOutcrops = on;
        this.callbacks.onExternalSync?.();
      }));
      content.appendChild(this._makePillSlider({
        label: 'Outcrop & Talus Density', min: 0.0, max: 1.0, step: 0.05, unit: '%',
        fmt: (v) => `${Math.round(v * 100)}`,
        get: () => p.boulderDensity ?? 0.65,
        set: (v, committed) => {
          p.boulderDensity = v;
          if (committed) this.engine.rockCalving.seedForLandscape(p);
        },
      }));
      const calveBtn = el('button', 'btn-secondary ls-action-btn', '🪨 Calve Cliff Boulders Now');
      calveBtn.addEventListener('click', () => this.engine.triggerBoulderCalving(28));
      content.appendChild(calveBtn);
      host.appendChild(card);
    } else if (id === 'sim-hydraulic') {
      const { card, content } = this._makeCard('Hydraulic Rain & Rivers', 'droplet', 'Pause or play fluvial rain & 2.5D river cutting independently');
      content.appendChild(this._makeSwitchRow('Simulation Playing', () => p.simHydraulicPlaying !== false, (on) => { p.simHydraulicPlaying = on; }));
      content.appendChild(this._makeSelect({
        label: 'Emitter Mode',
        options: Object.values(EMITTER_MODES).map((m) => ({ value: m.id, label: m.name })),
        get: () => p.emitterMode,
        set: (v) => { p.emitterMode = v; this.callbacks.onExternalSync?.(); },
      }));
      content.appendChild(this._makePillSlider({
        label: 'Active GPU Particles', min: 4096, max: 32768, step: 2048, unit: '',
        fmt: (v) => `${(v / 1000).toFixed(1)}k`,
        get: () => p.particleCount,
        set: (v) => { p.particleCount = v; },
      }));
      content.appendChild(this._makePillSlider({
        label: 'Rainstorm Intensity', min: 0.0, max: 1.6, step: 0.05, unit: '%',
        fmt: (v) => `${Math.round(v * 100)}`,
        get: () => p.rainIntensity,
        set: (v) => { p.rainIntensity = v; },
      }));
      content.appendChild(this._makePillSlider({
        label: 'Hydraulic Cutting Power', min: 0.10, max: 1.40, step: 0.02, unit: '%',
        fmt: (v) => `${Math.round(v * 100)}`,
        get: () => p.erosionStrength,
        set: (v) => { p.erosionStrength = v; },
      }));
      content.appendChild(this._makePillSlider({
        label: 'Sediment Capacity', min: 0.10, max: 1.50, step: 0.02, unit: '%',
        fmt: (v) => `${Math.round(v * 100)}`,
        get: () => p.sedimentCapacity,
        set: (v) => { p.sedimentCapacity = v; },
      }));
      content.appendChild(this._makePillSlider({
        label: 'Alluvial Deposition', min: 0.08, max: 1.20, step: 0.02, unit: '%',
        fmt: (v) => `${Math.round(v * 100)}`,
        get: () => p.depositionRate,
        set: (v) => { p.depositionRate = v; },
      }));
      content.appendChild(this._makePillSlider({
        label: '2.5D River Convergence', min: 0.0, max: 1.0, step: 0.02, unit: '%',
        fmt: (v) => `${Math.round(v * 100)}`,
        get: () => p.pipeFlowBlend,
        set: (v) => { p.pipeFlowBlend = v; },
      }));
      content.appendChild(this._makePillSlider({
        label: 'Evaporation Rate', min: 0.01, max: 0.85, step: 0.01, unit: '%',
        fmt: (v) => `${Math.round(v * 100)}`,
        get: () => p.evaporation,
        set: (v) => { p.evaporation = v; },
      }));
      host.appendChild(card);
    } else if (id === 'sim-cryo') {
      const { card, content } = this._makeCard('Snowfall & Glacier Sim', 'glacier', 'Blizzard snow accumulation, avalanche chutes & U-valley ice creep');
      content.appendChild(this._makeSwitchRow('Simulation Playing', () => p.simCryoPlaying !== false, (on) => { p.simCryoPlaying = on; }));
      content.appendChild(this._makePillSlider({
        label: 'Snowfall / Blizzard Rate', min: 0.0, max: 1.4, step: 0.02, unit: '%',
        fmt: (v) => `${Math.round(v * 100)}`,
        get: () => p.snowfallRate,
        set: (v) => { p.snowfallRate = v; },
      }));
      content.appendChild(this._makePillSlider({
        label: 'Snowline Elevation', min: 0.12, max: 1.0, step: 0.01, unit: '%',
        fmt: (v) => `${Math.round(v * 100)}`,
        get: () => p.snowline,
        set: (v) => { p.snowline = v; },
      }));
      content.appendChild(this._makePillSlider({
        label: 'Glacier Pluck & Grind', min: 0.0, max: 1.0, step: 0.02, unit: '%',
        fmt: (v) => `${Math.round(v * 100)}`,
        get: () => p.glacierStrength,
        set: (v) => { p.glacierStrength = v; },
      }));
      content.appendChild(this._makePillSlider({
        label: 'Ice Melt → Rivers/Lakes', min: 0.0, max: 1.0, step: 0.02, unit: '%',
        fmt: (v) => `${Math.round(v * 100)}`,
        get: () => p.iceMeltRate ?? 0.24,
        set: (v) => { p.iceMeltRate = v; },
      }));
      host.appendChild(card);
    } else if (id === 'sim-wind') {
      const { card, content } = this._makeCard('Aeolian Wind & Dunes', 'wind', 'Stoss-to-lee sand saltation, dune migration & rock sandblasting');
      content.appendChild(this._makeSwitchRow('Simulation Playing', () => p.simWindPlaying !== false, (on) => { p.simWindPlaying = on; }));
      content.appendChild(this._makePillSlider({
        label: 'Aeolian Wind Speed', min: 0.0, max: 1.0, step: 0.02, unit: '%',
        fmt: (v) => `${Math.round(v * 100)}`,
        get: () => p.windSpeed,
        set: (v) => { p.windSpeed = v; },
      }));
      content.appendChild(this._makePillSlider({
        label: 'Wind Azimuth', min: -180, max: 180, step: 1, unit: '°',
        get: () => p.windAzimuth,
        set: (v) => { p.windAzimuth = v; },
      }));
      content.appendChild(this._makePillSlider({
        label: 'Dry Aeolian Dune Mode', min: 0.0, max: 1.0, step: 0.05, unit: '%',
        fmt: (v) => `${Math.round(v * 100)}`,
        get: () => p.dryAeolianMode ?? 0.0,
        set: (v) => { p.dryAeolianMode = v; },
      }));
      host.appendChild(card);
    } else if (id === 'sim-rockfall') {
      const { card, content } = this._makeCard('Cliff Talus & Rockfall', 'talus', 'Cliff spalling, angle-of-repose scree & brisk 3D boulder sliding');
      content.appendChild(this._makeSwitchRow('Simulation Playing', () => p.simRockfallPlaying !== false, (on) => { p.simRockfallPlaying = on; }));
      content.appendChild(this._makePillSlider({
        label: 'Cliff Rockfall Intensity', min: 0.0, max: 1.0, step: 0.02, unit: '%',
        fmt: (v) => `${Math.round(v * 100)}`,
        get: () => p.rockfallRate,
        set: (v) => { p.rockfallRate = v; },
      }));
      content.appendChild(this._makePillSlider({
        label: 'Talus Repose Angle', min: 0.10, max: 1.0, step: 0.02, unit: '°',
        fmt: (v) => `${Math.round(24 + v * 16)}`,
        get: () => p.talusAngle,
        set: (v) => { p.talusAngle = v; },
      }));
      const calveBtn = el('button', 'btn-secondary ls-action-btn', '🪨 Trigger Cliff Rockfall Batch');
      calveBtn.addEventListener('click', () => this.engine.triggerBoulderCalving(28));
      content.appendChild(calveBtn);
      host.appendChild(card);
    } else if (id === 'tex-fabric') {
      const { card, content } = this._makeCard('Stone Fabric & Sand Ripples', 'strata', 'Procedural columnar basalt, cross-bedding, tafoni & windward sand ripples');
      content.appendChild(this._makeSwitchRow('Enable Fabric & Ripples', () => p.fabricLayerEnabled !== false, (on) => { p.fabricLayerEnabled = on; }));
      content.appendChild(this._makeSelect({
        label: 'Stone Fabric',
        options: Object.values(ROCK_FABRIC_MODES).map((m) => ({ value: m.id, label: m.label })),
        get: () => p.fabricMode ?? 0,
        set: (v) => { p.fabricMode = Number(v); this.callbacks.onExternalSync?.(); },
      }));
      content.appendChild(this._makePillSlider({
        label: 'Fabric & Ripple Strength', min: 0.0, max: 1.4, step: 0.02, unit: '%',
        fmt: (v) => `${Math.round(v * 100)}`,
        get: () => p.fabricStrength ?? 1.0,
        set: (v) => { p.fabricStrength = v; },
      }));
      host.appendChild(card);
    } else if (id === 'tex-lithology') {
      const { card, content } = this._makeCard('Rock Palette & Lithology', 'layers', 'Regional bedrock, scree & alluvial material palette');
      content.appendChild(this._makeSwitchRow('Enable Lithology Albedo', () => p.lithologyLayerEnabled !== false, (on) => { p.lithologyLayerEnabled = on; }));
      content.appendChild(this._makeSelect({
        label: 'Rock Palette',
        options: Object.values(MATERIAL_THEMES).map((m) => ({ value: m.id, label: m.label })),
        get: () => p.materialTheme ?? 0,
        set: (v) => { p.materialTheme = Number(v); this.callbacks.onExternalSync?.(); },
      }));
      content.appendChild(this._makePillSlider({
        label: 'Lithology Opacity', min: 0.0, max: 1.0, step: 0.02, unit: '%',
        fmt: (v) => `${Math.round(v * 100)}`,
        get: () => p.lithologyOpacity ?? 1.0,
        set: (v) => { p.lithologyOpacity = v; },
      }));
      content.appendChild(this._makeSelect({
        label: 'Diagnostic View',
        options: [
          { value: 'natural', label: 'Natural Strata & Sediment' },
          { value: 'hydro', label: '2.5D Rivers, Lakes & Melt' },
          { value: 'sediment', label: 'Cut vs Sedimentation Map' },
          { value: 'hardness', label: '3D Rock Hardness & Faults' },
          { value: 'flow', label: 'Hydraulic Discharge' },
          { value: 'cryo', label: 'Cryosphere (Snow & Ice)' },
          { value: 'clay', label: 'Sculptor Matte Clay' },
        ],
        get: () => p.viewMode,
        set: (v) => { p.viewMode = v; this.callbacks.onExternalSync?.(); },
      }));
      host.appendChild(card);
    } else if (id === 'shape-strata') {
      const { card, content } = this._makeCard('3D Stratigraphy & Faults', 'strata', 'Controls differential cliff/bench hardness & conjugate fault zones');
      content.appendChild(this._makeSwitchRow('Enable 3D Strata Bedding', () => p.strataLayerEnabled !== false, (on) => { p.strataLayerEnabled = on; }));
      content.appendChild(this._makePillSlider({
        label: 'Base Bedrock Hardness', min: 0.06, max: 0.96, step: 0.02, unit: '%',
        fmt: (v) => `${Math.round(v * 100)}`,
        get: () => p.rockHardness,
        set: (v) => { p.rockHardness = v; },
      }));
      content.appendChild(this._makePillSlider({
        label: 'Hard/Soft Strata Contrast', min: 0.0, max: 1.0, step: 0.02, unit: '%',
        fmt: (v) => `${Math.round(v * 100)}`,
        get: () => p.strataStrength,
        set: (v) => { p.strataStrength = v; },
      }));
      content.appendChild(this._makePillSlider({
        label: 'Stratigraphic Bed Count', min: 2.0, max: 18.0, step: 0.5, unit: '',
        fmt: (v) => Number(v).toFixed(1),
        get: () => p.strataFreq,
        set: (v) => { p.strataFreq = v; },
      }));
      content.appendChild(this._makePillSlider({
        label: 'Geological Dip Angle', min: 0, max: 42, step: 1, unit: '°',
        get: () => p.strataDip,
        set: (v) => { p.strataDip = v; },
      }));
      content.appendChild(this._makePillSlider({
        label: 'Strike Bearing', min: -180, max: 180, step: 2, unit: '°',
        get: () => p.strataStrike ?? 0,
        set: (v) => { p.strataStrike = v; },
      }));
      content.appendChild(this._makePillSlider({
        label: 'Fault Zone Weakness', min: 0.0, max: 1.0, step: 0.02, unit: '%',
        fmt: (v) => `${Math.round(v * 100)}`,
        get: () => p.faultWeakness,
        set: (v) => { p.faultWeakness = v; },
      }));
      host.appendChild(card);
    } else {
      // 'shape-base' — Basement Terrain Generator Layer
      const { card, content } = this._makeCard('Base Terrain Shape', 'massif', 'Primary procedural tectonic & geomorphological heightfield generator');
      content.appendChild(this._makeSelect({
        label: 'Base Generator',
        options: Object.values(EROSION_LANDSCAPES).map((l) => ({ value: l.id, label: l.name })),
        get: () => p.landscape,
        set: (val) => {
          this.engine.applyLandscapePreset(val);
          this.callbacks.onPresetChanged?.(val);
          this.refreshAll();
        },
      }));
      content.appendChild(this._makePillSlider({
        label: 'Vertical Relief', min: 70, max: 245, step: 2, unit: 'm',
        get: () => p.relief,
        set: (v, committed) => {
          p.relief = v;
          if (committed) this._scheduleTerrainRebuild(true);
        },
      }));
      content.appendChild(this._makePillSlider({
        label: 'Macro Roughness', min: 0.25, max: 0.88, step: 0.02, unit: '%',
        fmt: (v) => `${Math.round(v * 100)}`,
        get: () => p.roughness,
        set: (v, committed) => {
          p.roughness = v;
          if (committed) this._scheduleTerrainRebuild(true);
        },
      }));

      const seedRow = el('div', 'ls-seed-row');
      seedRow.appendChild(el('span', 'ls-control-label', 'Domain Seed'));
      const seedInput = document.createElement('input');
      seedInput.type = 'number';
      seedInput.className = 'ls-seed-input';
      seedInput.value = String(p.seed);
      seedInput.addEventListener('change', () => {
        p.seed = Math.max(1, Math.floor(Number(seedInput.value) || 1));
        this.callbacks.onExternalSync?.();
        this._scheduleTerrainRebuild(true);
      });
      seedRow.appendChild(seedInput);

      const shuf = el('button', 'ls-icon-btn');
      shuf.innerHTML = glyphSvg('shuffle');
      shuf.title = 'Randomize terrain seed';
      shuf.addEventListener('click', () => {
        p.seed = Math.floor(1000 + Math.random() * 8999);
        seedInput.value = String(p.seed);
        this.callbacks.onExternalSync?.();
        this._scheduleTerrainRebuild(true);
      });
      seedRow.appendChild(shuf);
      content.appendChild(seedRow);
      host.appendChild(card);
    }
  }

  _renderModifierProperties(host, mod) {
    const spec = PROCEDURAL_MODIFIER_CATALOG.find((c) => c.kind === mod.kind) || PROCEDURAL_MODIFIER_CATALOG[0];
    const { card, content } = this._makeCard(mod.label, spec.glyph, spec.blurb);

    content.appendChild(this._makePillSlider({
      label: 'Amplitude', min: 5, max: 140, step: 1, unit: 'm',
      get: () => mod.amplitude,
      set: (v, committed) => { mod.amplitude = v; this._scheduleTerrainRebuild(committed); },
    }));
    content.appendChild(this._makePillSlider({
      label: 'Feature Frequency', min: 0.6, max: 6.0, step: 0.1, unit: '×',
      get: () => mod.scale,
      set: (v, committed) => { mod.scale = v; this._scheduleTerrainRebuild(committed); },
    }));
    content.appendChild(this._makePillSlider({
      label: 'Sharpness / Detail', min: 0.10, max: 0.95, step: 0.02, unit: '%',
      fmt: (v) => `${Math.round(v * 100)}`,
      get: () => mod.detail,
      set: (v, committed) => { mod.detail = v; this._scheduleTerrainRebuild(committed); },
    }));
    content.appendChild(this._makePillSlider({
      label: 'Strike / Bearing', min: -180, max: 180, step: 2, unit: '°',
      get: () => mod.angle,
      set: (v, committed) => { mod.angle = v; this._scheduleTerrainRebuild(committed); },
    }));
    host.appendChild(card);

    const blend = this._makeCard('Blend & Channel Mask', 'layers', 'Non-destructive stack composition & slope/height masking');
    blend.content.appendChild(this._makeSelect({
      label: 'Blend Operation',
      options: [
        { value: 0, label: 'Add (Uplift)' },
        { value: 1, label: 'Subtract (Carve)' },
        { value: 2, label: 'Maximum' },
        { value: 3, label: 'Replace' },
      ],
      get: () => mod.blendMode ?? 0,
      set: (v) => { mod.blendMode = Number(v); this._scheduleTerrainRebuild(true); },
    }));
    blend.content.appendChild(this._makePillSlider({
      label: 'Layer Strength', min: 0.0, max: 1.5, step: 0.02, unit: '×',
      get: () => mod.strength ?? 0.85,
      set: (v, committed) => { mod.strength = v; this._scheduleTerrainRebuild(committed); },
    }));
    blend.content.appendChild(this._makeSelect({
      label: 'Mask Channel',
      options: [
        { value: 0, label: 'No Mask (Full Domain)' },
        { value: 1, label: 'Height (Normalized)' },
        { value: 2, label: 'Slope Steepness' },
      ],
      get: () => mod.maskType ?? 0,
      set: (v) => { mod.maskType = Number(v); this.renderStack(); this._scheduleTerrainRebuild(true); },
    }));
    if ((mod.maskType ?? 0) > 0) {
      blend.content.appendChild(this._makePillSlider({
        label: 'Mask Low', min: 0.0, max: 1.0, step: 0.02, unit: '',
        get: () => mod.maskLow ?? 0.0,
        set: (v, committed) => { mod.maskLow = v; this._scheduleTerrainRebuild(committed); },
      }));
      blend.content.appendChild(this._makePillSlider({
        label: 'Mask High', min: 0.0, max: 1.0, step: 0.02, unit: '',
        get: () => mod.maskHigh ?? 1.0,
        set: (v, committed) => { mod.maskHigh = v; this._scheduleTerrainRebuild(committed); },
      }));
      blend.content.appendChild(this._makeSwitchRow('Invert Mask', () => Boolean(mod.maskInvert), (on) => {
        mod.maskInvert = on;
        this._scheduleTerrainRebuild(true);
      }));
    }

    const seedRow = el('div', 'ls-seed-row');
    seedRow.appendChild(el('span', 'ls-control-label', 'Layer Seed'));
    const seedInput = document.createElement('input');
    seedInput.type = 'number';
    seedInput.className = 'ls-seed-input';
    seedInput.value = String(mod.seed);
    seedInput.addEventListener('change', () => {
      mod.seed = Math.max(1, Math.floor(Number(seedInput.value) || 1));
      this._scheduleTerrainRebuild(true);
    });
    seedRow.appendChild(seedInput);
    const shuf = el('button', 'ls-icon-btn');
    shuf.innerHTML = glyphSvg('shuffle');
    shuf.addEventListener('click', () => {
      mod.seed = Math.floor(1000 + Math.random() * 89999);
      seedInput.value = String(mod.seed);
      this._scheduleTerrainRebuild(true);
    });
    seedRow.appendChild(shuf);
    blend.content.appendChild(seedRow);

    host.appendChild(blend.card);
  }
}

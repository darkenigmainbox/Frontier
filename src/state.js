// Frontier central store — project model, selection, undo/redo, pub/sub.
import { uid, deepClone } from './geometry.js';
import { WORLD_SIZE, WATER_LEVEL_DEFAULT } from './terrain.js';

export function createEmptyProject(name = 'Untitled network') {
  return {
    version: 1,
    name,
    settings: {
      worldSize: WORLD_SIZE,
      waterLevel: WATER_LEVEL_DEFAULT,
      followTerrain: true,
      autoMerge: true,
    },
    nodes: {},       // id -> {id,x,z}
    roads: [],       // {id,name,presetId,nodeIds[],closed,bridge{enabled,height,type},smooth,oneWayOverride}
    rails: [],       // {id,kind:'rail'|'monorail',presetId,nodeIds[],closed}
    roundabouts: [], // {id,x,z,radius,presetId,nodeIds[]}
    rivers: [],      // {id,points:[{x,z}],width,depth}
    terrainEdits: [],// {x,z,radius,delta,type:'raise'|'lower'|'water',strength}
    buildingsManual: [],
  };
}

export function createStore() {
  const store = {
    project: createEmptyProject('Frontier demo'),
    tool: 'select',
    activePresetId: 'street2',
    selection: null, // {type:'road'|'rail'|'node'|'roundabout', id, nodeId?}
    layers: {
      terrain: true, water: true, roads: true, markings: true, sidewalks: true,
      rails: true, junctions: true, buildings: true, trees: true, grid: true,
    },
    cam2d: { cx: 0, cz: 60, scale: 1.1 },
    snap: true,
    brush: { size: 46, strength: 4 },
    undoStack: [],
    redoStack: [],
    listeners: new Set(),
    _terrainDirty: true,
    _roadsDirty: true,

    subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); },
    emit(what = 'all') {
      if (what === 'all' || what === 'terrain') this._terrainDirty = true;
      if (what === 'all' || what === 'roads') this._roadsDirty = true;
      for (const fn of this.listeners) { try { fn(what, this); } catch (e) { console.error(e); } }
    },

    pushUndo(label = 'edit') {
      this.undoStack.push({ label, snapshot: deepClone(this.project) });
      if (this.undoStack.length > 80) this.undoStack.shift();
      this.redoStack.length = 0;
    },
    undo() {
      if (!this.undoStack.length) return false;
      this.redoStack.push(deepClone(this.project));
      this.project = this.undoStack.pop().snapshot;
      this.selection = null;
      this.emit('all');
      return true;
    },
    redo() {
      if (!this.redoStack.length) return false;
      this.undoStack.push({ label: 'redo', snapshot: deepClone(this.project) });
      this.project = this.redoStack.pop();
      this.selection = null;
      this.emit('all');
      return true;
    },

    setTool(t) { this.tool = t; this.emit('tool'); },
    setPreset(id) { this.activePresetId = id; this.emit('preset'); },

    addNode(x, z) {
      const id = uid('n');
      this.project.nodes[id] = { id, x, z };
      return id;
    },
    moveNode(id, x, z) {
      const n = this.project.nodes[id];
      if (n) { n.x = x; n.z = z; }
    },
    deleteNode(id) {
      // remove from roads/rails; drop empties
      const p = this.project;
      delete p.nodes[id];
      for (const r of [...p.roads]) {
        r.nodeIds = r.nodeIds.filter((n) => n !== id);
        if (r.nodeIds.length < 2 && !r.closed) this.deleteRoad(r.id, true);
      }
      for (const r of [...p.rails]) {
        r.nodeIds = r.nodeIds.filter((n) => n !== id);
        if (r.nodeIds.length < 2) p.rails = p.rails.filter((x) => x.id !== r.id);
      }
    },
    addRoad(nodeIds, presetId, opts = {}) {
      const id = uid('rd');
      const road = {
        id, name: opts.name || `Road ${this.project.roads.length + 1}`,
        presetId, nodeIds: [...nodeIds],
        closed: !!opts.closed,
        bridge: opts.bridge || { enabled: false, height: 6, type: 'beam' },
        smooth: opts.smooth ?? true,
        oneWayOverride: opts.oneWayOverride ?? null,
      };
      this.project.roads.push(road);
      return id;
    },
    updateRoad(id, patch) {
      const r = this.project.roads.find((x) => x.id === id);
      if (r) Object.assign(r, patch);
    },
    deleteRoad(id, silent = false) {
      const p = this.project;
      const road = p.roads.find((x) => x.id === id);
      p.roads = p.roads.filter((x) => x.id !== id);
      if (!silent) {
        // prune orphan nodes
        const used = new Set();
        for (const r of p.roads) r.nodeIds.forEach((n) => used.add(n));
        for (const r of p.rails) r.nodeIds.forEach((n) => used.add(n));
        for (const rb of p.roundabouts) (rb.nodeIds || []).forEach((n) => used.add(n));
        for (const nid of Object.keys(p.nodes)) if (!used.has(nid)) delete p.nodes[nid];
      }
      if (this.selection?.id === id) this.selection = null;
      return road;
    },
    addRail(nodeIds, kind, presetId, opts = {}) {
      const id = uid('rl');
      this.project.rails.push({ id, kind, presetId, nodeIds: [...nodeIds], closed: !!opts.closed, name: opts.name || (kind === 'monorail' ? `Monorail ${this.project.rails.length + 1}` : `Rail ${this.project.rails.length + 1}`) });
      return id;
    },
    deleteRail(id) {
      this.project.rails = this.project.rails.filter((x) => x.id !== id);
      if (this.selection?.id === id) this.selection = null;
    },
  };
  return store;
}

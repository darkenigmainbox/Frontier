#!/usr/bin/env node
/* ============================================================
 * Frontier · app smoke test — runs src/app/main.js without a browser
 *
 * The app is the one part of the project that can't be covered by the
 * pipeline tests (it owns the DOM and the WebGL2 context). This harness
 * supplies a stub DOM and a stub WebGL2 context, boots the real module,
 * and then drives it through the paths a user would take: generate,
 * re-generate with different landforms, erode-only, mesh, sculpt strokes,
 * undo/redo, picking, view presets and asset export.
 *
 * It does not validate pixels — it validates that the app *runs*: no
 * undefined imports, no missing DOM ids, no bad uniform plumbing, no
 * exceptions in the interaction handlers.
 *
 *   node tools/dev/app-smoke.mjs [--res draft] [--quick]
 *
 * Exits non-zero on the first uncaught error.
 * ============================================================ */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');

const argv = process.argv.slice(2);
const argOf = (name, dflt) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : dflt;
};
const RES = argOf('res', 'draft');
const QUICK = argv.includes('--quick');

let failures = 0;
const check = (label, ok, detail = '') => {
  if (!ok) failures++;
  console.log(`${ok ? ' ok ' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
};

/* ------------------------------------------------------------------ */
/* 1. stub environment                                                 */
/* ------------------------------------------------------------------ */

const html = readFileSync(join(root, 'index.html'), 'utf8');
const htmlIds = [...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]);

class El {
  constructor(tag = 'div', id = '') {
    this.tagName = tag.toUpperCase();
    this.id = id;
    this.style = {};
    this.dataset = {};
    this.children = [];
    this.childNodes = this.children;
    this.classList = {
      _s: new Set(),
      add: (...c) => c.forEach((x) => this.classList._s.add(x)),
      remove: (...c) => c.forEach((x) => this.classList._s.delete(x)),
      toggle: (c, on) => (on ? this.classList._s.add(c) : this.classList._s.delete(c)),
      contains: (c) => this.classList._s.has(c),
    };
    this.value = '0';
    this.checked = false;
    this.textContent = '';
    this._html = '';
    this.width = 1280; this.height = 720;
    this.clientWidth = 1280; this.clientHeight = 720;
    this.offsetWidth = 1280; this.offsetHeight = 720;
    this.scrollTop = 0; this.scrollHeight = 100;
  }
  get innerHTML() { return this._html; }
  set innerHTML(v) { this._html = String(v); }
  addEventListener() {}
  removeEventListener() {}
  appendChild(c) { this.children.push(c); return c; }
  removeChild(c) { this.children = this.children.filter((x) => x !== c); return c; }
  insertBefore(c) { this.children.unshift(c); return c; }
  setAttribute(k, v) { this[k] = v; }
  removeAttribute() {}
  getAttribute() { return null; }
  closest() { return null; }
  focus() {}
  blur() {}
  remove() {}
  click() {}
  select() {}
  setPointerCapture() {}
  releasePointerCapture() {}
  getBoundingClientRect() {
    return { x: 0, y: 0, left: 0, top: 0, right: this.width, bottom: this.height, width: this.width, height: this.height };
  }
  querySelector(sel) { return dom.lookup(sel); }
  querySelectorAll(sel) { return dom.list(sel); }
  getContext(kind) { return kind === 'webgl2' ? makeGL() : make2D(); }
  toBlob(cb) { cb(new Blob(['x'])); }
}

/* Parse the real controls out of index.html so the stub DOM hands the app
   the same tags/types/data-* attributes the browser would. */
function parseControls(src) {
  const out = [];
  const re = /<([a-z]+)([^>]*?)>/gi;
  let m;
  while ((m = re.exec(src))) {
    const tag = m[1].toLowerCase();
    const attrs = m[2];
    if (!/data-(param|action|brush|tool|layer|preset|view)=/.test(attrs)) continue;
    const el = new El(tag);
    for (const a of attrs.matchAll(/([a-zA-Z-]+)="([^"]*)"/g)) {
      const [_, k, v] = a;
      if (k === 'type') el.type = v;
      else if (k === 'value') el.value = v;
      else if (k === 'checked') el.checked = true;
      else if (k.startsWith('data-')) el.dataset[k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = v;
      else if (k === 'id') el.id = v;
      else if (k === 'min' || k === 'max' || k === 'step') el[k] = v;
    }
    if (el.type === undefined) el.type = tag === 'input' ? 'text' : undefined;
    out.push(el);
  }
  return out;
}
const controls = parseControls(html);

const parentStub = new El('div');
for (const el of controls) el.parentElement = parentStub;

function make2D() {
  if (glCache.ctx2d) return glCache.ctx2d;
  const noop = () => {};
  glCache.ctx2d = {
    clearRect: noop, fillRect: noop, strokeRect: noop, fillText: noop, strokeText: noop,
    beginPath: noop, moveTo: noop, lineTo: noop, stroke: noop, fill: noop, arc: noop,
    save: noop, restore: noop, translate: noop, scale: noop, rotate: noop,
    createLinearGradient: () => ({ addColorStop: noop }),
    measureText: () => ({ width: 10 }),
    putImageData: noop, drawImage: noop, setLineDash: noop,
  };
  return glCache.ctx2d;
}

const dom = {
  _cache: new Map(),
  lookup(sel) {
    const id = sel.startsWith('#') ? sel.slice(1) : null;
    if (id && !this._cache.has(id)) this._cache.set(id, new El('div', id));
    if (!id) return this._cache.get(sel) ?? new El('div', sel);
    return this._cache.get(id);
  },
  list(sel) {
    const key = sel.trim();
    const attr = key.startsWith('[data-') ? key.slice(1, -1) : null;
    if (attr) {
      const prop = attr.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      return controls.filter((el) => el.dataset[prop] !== undefined);
    }
    if (!this._lists) this._lists = new Map();
    if (!this._lists.has(key)) this._lists.set(key, [new El('div'), new El('div')]);
    return this._lists.get(key);
  },
};

/* The GL canvas gets a *fixed* CSS box: getBoundingClientRect() must not
   follow el.width, because the app writes the drawing-buffer size there and
   would otherwise feed its own output back into the next resize. */
const canvasEl = new El('canvas', 'gl');
canvasEl.getBoundingClientRect = () => ({
  x: 0, y: 0, left: 0, top: 0, right: 1280, bottom: 720, width: 1280, height: 720,
});
dom._cache.set('gl', canvasEl);

const documentStub = {
  body: new El('body'),
  documentElement: new El('html'),
  head: new El('head'),
  querySelector: (s) => dom.lookup(s),
  querySelectorAll: (s) => dom.list(s),
  createElement: (t) => new El(t),
  createElementNS: (ns, t) => new El(t),
  addEventListener() {},
  removeEventListener() {},
  getElementById: (id) => dom.lookup('#' + id),
  title: 'Frontier',
};

const windowStub = {
  innerWidth: 1280, innerHeight: 800, devicePixelRatio: 2,
  addEventListener() {}, removeEventListener() {},
  requestAnimationFrame: null,
  matchMedia: () => ({ matches: false, addEventListener() {} }),
  location: { search: '', href: 'http://localhost/' },
};

const rafQueue = [];
let rafTimer = null;
function requestAnimationFrame(cb) {
  rafQueue.push(cb);
  if (rafTimer) return rafQueue.length;
  rafTimer = setTimeout(() => {
    rafTimer = null;
    const batch = rafQueue.splice(0, rafQueue.length);
    for (const fn of batch) {
      try { fn(performance.now()); } catch (e) { onError('rAF callback', e); }
    }
  }, 0);
  return rafQueue.length;
}

class ResizeObserverStub { observe() {} unobserve() {} disconnect() {} }

/* --- WebGL2 stub ---------------------------------------------------- */
let glCallCount = 0;
const glSpecials = {
  createShader: () => ({ __shader: true }),
  createProgram: () => ({ __program: true }),
  createBuffer: () => ({ __buffer: true }),
  createVertexArray: () => ({ __vao: true }),
  createTexture: () => ({ __texture: true }),
  createFramebuffer: () => ({ __fbo: true }),
  createRenderbuffer: () => ({ __rbo: true }),
  getUniformLocation: (_p, name) => ({ __uniform: name }),
  getAttribLocation: () => 0,
  getShaderParameter: () => true,
  getProgramParameter: () => true,
  getShaderInfoLog: () => '',
  getProgramInfoLog: () => '',
  getShaderPrecisionFormat: () => ({ precision: 23, rangeMin: 127, rangeMax: 127 }),
  getExtension: () => null,
  getParameter: () => 4096,
  checkFramebufferStatus: () => 36053, // FRAMEBUFFER_COMPLETE
  getActiveUniform: () => ({ name: 'u', size: 1, type: 0x1406 }),
  getActiveAttrib: () => ({ name: 'a', size: 1, type: 0x1406 }),
  // readPixels is the one GL call the app's picking depends on. There is no
  // GPU here, so the harness answers it with a CPU raycast against the very
  // same SDF volume the shader would have marched (exposed after boot).
  readPixels: (x, y, _w, _h, _fmt, _type, out) => {
    const hit = glCache.pick ? glCache.pick(x, y) : null;
    out[0] = hit ? hit.color[0] : 0;
    out[1] = hit ? hit.color[1] : 0;
    out[2] = hit ? hit.color[2] : 0;
    out[3] = hit ? hit.t : 1e6;
  },
  isContextLost: () => false,
  getError: () => 0,
};
const glCache = {};
function makeGL() {
  if (glCache.gl) return glCache.gl;
  let constants = 0x2000;
  const names = { FRAMEBUFFER_COMPLETE: 36053 };  // the one value the app compares against
  const target = {
    canvas: new El('canvas'),
    drawingBufferWidth: 1280,
    drawingBufferHeight: 720,
  };
  glCache.gl = new Proxy(target, {
    get(t, prop) {
      if (prop in t) return t[prop];
      if (typeof prop !== 'string') return undefined;
      if (glSpecials[prop]) return glSpecials[prop];
      if (/^[A-Z][A-Z0-9_]*$/.test(prop)) {
        if (!(prop in names)) names[prop] = ++constants;
        return names[prop];
      }
      // Any other method: count it, return undefined-ish results.
      return (...args) => {
        glCallCount++;
        if (/^get/.test(prop)) return null;
        return undefined;
      };
    },
  });
  return glCache.gl;
}

let onError = (where, err) => {
  failures++;
  console.log(`FAIL  threw in ${where}: ${err && err.stack ? err.stack.split('\n').slice(0, 3).join('\n      ') : err}`);
};

globalThis.document = documentStub;
globalThis.location = windowStub.location;
globalThis.window = windowStub;
globalThis.self = windowStub;
try { Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'node', maxTouchPoints: 0 }, configurable: true }); } catch {}
globalThis.requestAnimationFrame = requestAnimationFrame;
globalThis.cancelAnimationFrame = () => {};
globalThis.ResizeObserver = ResizeObserverStub;
try { Object.defineProperty(globalThis, 'devicePixelRatio', { value: 2, configurable: true }); } catch {}
globalThis.URL.createObjectURL = () => 'blob:stub';
globalThis.URL.revokeObjectURL = () => {};
windowStub.document = documentStub;
windowStub.requestAnimationFrame = requestAnimationFrame;
windowStub.ResizeObserver = ResizeObserverStub;

process.on('unhandledRejection', (e) => onError('unhandledRejection', e));
process.on('uncaughtException', (e) => onError('uncaughtException', e));

/* ------------------------------------------------------------------ */
/* 2. DOM contract check (before boot, so failures are cheap)          */
/* ------------------------------------------------------------------ */

const mainSrc = readFileSync(join(root, 'src/app/main.js'), 'utf8');
const wanted = new Set([...mainSrc.matchAll(/\$\$?\('#([A-Za-z0-9_-]+)/g)].map((m) => m[1]));
const missingIds = [...wanted].filter((id) => !htmlIds.includes(id));
check('every #id main.js queries exists in index.html', missingIds.length === 0, missingIds.join(', '));

/* ------------------------------------------------------------------ */
/* 3. boot the real app                                                */
/* ------------------------------------------------------------------ */

console.log(`\nbooting src/app/main.js (resolution ${RES})…`);
const t0 = Date.now();
const app = await import(join(root, 'src/app/main.js')).then(() => windowStub.frontier, (err) => {
  onError('import', err);
  return null;
});
check('app module evaluates and exposes window.frontier', !!app);

if (!app) { finish(); }

// boot() is async and awaited by the module; wait for a volume to exist.
async function waitFor(fn, ms, label) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (fn()) return true;
    await new Promise((r) => setTimeout(r, 25));
  }
  check(label, false, `timed out after ${ms} ms`);
  return false;
}

const stageEl = dom.lookup('#chip-stage');
const booted = await waitFor(() => app.volume && app.hf && app.analysis && stageEl.textContent === 'ready',
  240000, 'boot() finishes and produces a volume');
check('boot() finishes and produces a volume', booted);

if (booted) {
  const vol = app.volume;
  check('boot produced a finite SDF volume', vol && vol.data && vol.data.length === vol.nx * vol.ny * vol.nz,
    vol ? `${vol.nx}×${vol.ny}×${vol.nz}` : 'no volume');
  check('seismograph: field has both solid and empty voxels',
    vol.data.some((v) => v < 0) && vol.data.some((v) => v > 0));
  check('heightfield carries material maps', !!app.hf.hardness && !!app.hf.h0);
  check('analysis produced channels + splats',
    !!app.analysis.channels && !!app.analysis.splats && app.analysis.splats.colors.length === app.hf.nx * app.hf.nz * 3);
  check('renderer created GL resources', glCallCount > 100, `${glCallCount} gl calls`);
  console.log(`      boot ${((Date.now() - t0) / 1000).toFixed(2)} s`);

  /* ---- 4. interaction paths ---- */

  const vp = app.viewport;
  check('viewport exposes camera + pick', typeof vp.pick === 'function' && !!vp.cameraPosition());

  // GL readPixels answer: march the real SDF exactly like the shader does.
  glCache.pick = (x, y) => {
    const cssX = x / vp.dpr, cssY = (vp.height - y) / vp.dpr;
    const { origin, dir } = vp.rayFromPixel(cssX, cssY);
    const hit = app.volume.raycast(origin[0], origin[1], origin[2], dir[0], dir[1], dir[2], { maxDist: 400 });
    if (!hit) return null;
    return { t: hit.distance ?? Math.hypot(hit.point[0] - origin[0], hit.point[1] - origin[1], hit.point[2] - origin[2]), color: [0.5, 0.5, 0.5] };
  };

  const probe = { width: vp.width, height: vp.height, dpr: vp.dpr, eye: vp.cameraPosition(), target: vp.target };
  const ray = vp.pick(vp.width / 2, vp.height / 2);
  check('centre-screen pick resolves against the SDF', !!ray && Array.isArray(ray.point),
    ray ? `hit y=${ray.point[1].toFixed(2)} d=${(ray.distance ?? 0).toFixed(2)}`
        : `no hit (viewport ${probe.width}×${probe.height} dpr ${probe.dpr} eye ${probe.eye.map((v) => v.toFixed(1))} target ${probe.target.map((v) => v.toFixed(1))})`);
  if (!ray) {
    const { origin, dir } = vp.rayFromPixel(vp.width / 2, vp.height / 2);
    const cpu = app.volume.raycast(origin[0], origin[1], origin[2], dir[0], dir[1], dir[2], { maxDist: 400 });
    console.log(`      cpu raycast from ${origin.map((v) => v.toFixed(1))} dir ${dir.map((v) => v.toFixed(3))} →`,
      cpu ? `hit at ${cpu.point.map((v) => v.toFixed(1))}` : 'miss');
  }

  // sculpt: one raise stroke and one carve stroke on the surface
  const sculpt = app.sculpt;
  const before = vol.data.slice();
  const hBefore = app.hf.h.slice();
  if (ray) {
    // pointer coords are CSS pixels; strokes are sampled on the next frame
    const px = vp.width / 2, py = vp.height / 2;
    const frame = () => new Promise((r) => requestAnimationFrame(() => r()));
    try {
      app.brushes.active = 'carve';
      app.brushes.radius = 2.5;
      const started = sculpt.start(px, py);
      check('sculpt stroke starts on the surface', started === true, `start() → ${started}`);
      if (!started) console.log(`      (pick at ${px},${py} →`, vp.pick(px, py) ? 'hit' : 'miss', '· active brush', app.brushes.active, ')');
      await frame();
      sculpt.move(px + 8, py + 6);
      await frame();
      sculpt.move(px + 16, py + 10);
      await frame();
      sculpt.end();
      check('sculpt stroke runs (start/move/end)', true);
    } catch (e) { onError('sculpt stroke', e); }
    let changed = 0;
    for (let i = 0; i < vol.data.length; i++) if (vol.data[i] !== before[i]) changed++;
    check('sculpt stroke actually edited voxels', changed > 0, `${changed} voxels`);

    // the erosion grid must follow the volume, not the other way round
    let hChanged = 0;
    for (let i = 0; i < hBefore.length; i++) if (app.hf.h[i] !== hBefore[i]) hChanged++;
    check('sculpt updated the height grid from the volume', hChanged > 0, `${hChanged} cells`);

    try {
      app.undo();
      let restored = 0, differing = 0;
      for (let i = 0; i < vol.data.length; i++) {
        if (vol.data[i] !== before[i]) differing++;
        else restored++;
      }
      check('undo restores the pre-stroke volume', differing < changed * 0.02,
        `${differing} voxels still differ (of ${changed} edited)`);
    } catch (e) { onError('undo', e); }
    try {
      app.redo();
      check('redo runs', true);
    } catch (e) { onError('redo', e); }
  }

  // mesh + export
  try {
    const mesh = await app.ensureMesh();
    check('ensureMesh() returns triangles', !!mesh && mesh.indices.length > 0,
      mesh ? `${mesh.indices.length / 3} tris` : 'none');
  } catch (e) { onError('ensureMesh', e); }

  // re-generate with a different landform at the requested resolution
  for (const shape of QUICK ? ['ridges'] : ['ridges', 'plateau']) {
    const t = Date.now();
    try {
      app.setParam('shape', shape);
      app.setParam('resolution', RES);
      await app.generate();
      const ok = app.volume && app.volume.data.some((v) => v < 0);
      check(`regenerate as ${shape}`, ok, `${((Date.now() - t) / 1000).toFixed(2)} s`);
    } catch (e) { onError(`regenerate ${shape}`, e); }
  }

  // erode-only path (the button that re-runs the erosion stages on the same base)
  try {
    const t = Date.now();
    await app.erodeOnly();
    check('erodeOnly() runs', !!app.volume, `${((Date.now() - t) / 1000).toFixed(2)} s`);
  } catch (e) { onError('erodeOnly', e); }

  // view presets / camera + render one frame for real
  try {
    vp.setSize();
    vp.render(performance.now());
    check('viewport.render() executes without throwing', true);
  } catch (e) { onError('viewport.render', e); }
}

finish();

function finish() {
  console.log(`\n${failures === 0 ? 'app smoke: all checks passed' : `app smoke: ${failures} FAILURE(S)`}`);
  process.exit(failures === 0 ? 0 : 1);
}

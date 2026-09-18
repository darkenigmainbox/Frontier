// Frontier — hybrid SDF terrain studio: UI wiring.

import { generateVolume, Volume } from "./core/field.js";
import { defaults, presetData, SIZE } from "./core/constants.js";
import { createRenderer } from "./renderer.js";
import { cameraEye, flyLook, flyMove, FLIGHT_KEYS } from "./camera.js";

const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const params = { ...defaults };
const state = { running: false, iterations: 0, tool: "orbit", ready: false, rebuilding: false, busy: false, brush: null, renderedFrames: 0, dirty: false, stamp: null, stampMode: 2, stampScale: 1.2 };
const camera = { yaw: 0.39, pitch: 0.65, distance: 46, target: [0, 4, 0] };
let renderer, canvas = $("#scene"), lastTime = 0, lastSim = 0, scale = 0.7, toastTimer, operation = Promise.resolve();
let navigation = { mode: "orbit", looking: false, locked: false, lockPending: false };
let flightKeys = new Set(), navTime = 0;

function eye() { return cameraEye(camera); }
function toast(text, d = 3500) {
  const el = $("#toast"); el.textContent = text; el.classList.remove("hidden");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.add("hidden"), d);
}
function format(id, v) {
  if (id === "particleCount") return String(v);
  if (["canyonWidth", "riverWidth", "riverDepth", "riverOffset", "windHeight", "windSpread"].includes(id)) return Number(v).toFixed(1) + " m";
  if (id === "footprint") return Number(v).toFixed(2) + " m";
  if (id === "grainSize") return Number(v).toFixed(2) + " mm";
  if (id === "agentDiameter") return Number(v).toFixed(1) + " mm";
  if (["relief", "radius", "waterLevel", "stampScale"].includes(id)) return Number(v).toFixed(1) + " m";
  if (["riverSpeed", "windSpeed"].includes(id)) return Number(v).toFixed(1) + " m/s";
  if (id === "windDirection" || id === "sun") return v + "°";
  if (id === "speed") return v + "×";
  return Number(v).toFixed(2);
}
function syncControls() {
  for (const input of $$("input[type=range]")) {
    const v = params[input.id]; if (v === undefined) continue;
    input.value = v;
    const pct = ((v - input.min) / (input.max - input.min)) * 100;
    input.style.setProperty("--range-progress", `${pct}%`);
    const out = $(`#${input.id}-value`); if (out) out.textContent = format(input.id, v);
  }
  const se = $("#seed"); if (se) se.value = params.seed;
}
function activateTab(name) {
  $("#scene-properties").dataset.panel = name;
  $("#inspector-mode-label").textContent = { terrain: "Terrain", sculpt: "Sculpt", erosion: "Erosion", water: "Water" }[name] || name;
  if (name !== "sculpt" && state.tool !== "orbit" && !state.stamp) selectTool("orbit");
  $$(".tab").forEach(el => { const a = el.dataset.tab === name; el.classList.toggle("active", a); el.setAttribute("aria-checked", a); });
  $$(".panel").forEach(el => el.classList.toggle("hidden", el.id !== `panel-${name}`));
}
$$(".tab").forEach(el => el.addEventListener("click", () => activateTab(el.dataset.tab)));
$("#inspector-switch").onclick = () => $("#inspector-menu").togglePopover?.();

$("#stampMode").addEventListener("change", e => { state.stampMode = Number(e.target.value); });
$$("input[type=range]").forEach(input => input.addEventListener("input", () => {
  params[input.id] = Number(input.value);
  syncControls();
  if (["relief", "strata", "roughness", "canyonWidth", "canyonMeander", "canyonFlare"].includes(input.id)) queueRebuild();
}));
function queueRebuild(d = 250) { clearTimeout(window._regen); state.running = false; updateSim(); window._regen = setTimeout(rebuild, d); }
async function rebuild() {
  if (!state.ready || state.rebuilding) return;
  state.rebuilding = true;
  $("#simulation-label").textContent = "Reforming…";
  try {
    const vol = new Volume(SIZE);
    generateVolume(vol, params);
    renderer.upload(vol.data);
    state.iterations = 0;
    $("#erosion-audit")?.classList.add("hidden");
    state.dirty = true; updateSim();
    toast("Fresh formation. Hybrid erosion ready — budgeted carve, no runaway holes.");
  } catch (e) { fatal(e.message); } finally { state.rebuilding = false; }
}
function changeSeed() { params.seed = 1 + Math.floor(Math.random() * 99998); syncControls(); rebuild(); }
$("#reseed").onclick = changeSeed;
$("#randomize").onclick = changeSeed;
$("#seed")?.addEventListener("change", () => { params.seed = Math.max(1, Math.min(99999, Math.round(Number($("#seed").value) || 4821))); syncControls(); rebuild(); });
function choosePreset(i) {
  if (!state.ready) return;
  const p = presetData[i]; params.preset = i;
  Object.assign(params, { relief: p.relief, strata: p.strata, roughness: p.roughness, seed: p.seed });
  $$(".preset").forEach(el => el.classList.toggle("active", Number(el.dataset.preset) === i));
  $("#inspector-title").textContent = p.name;
  syncControls(); resetCamera(); rebuild();
}
$$(".preset").forEach(el => el.onclick = () => choosePreset(Number(el.dataset.preset)));

function selectTool(tool) {
  state.tool = tool; state.brush = null; state.stamp = null;
  $$(".sculpt-tool").forEach(el => el.classList.toggle("active", el.dataset.tool === tool));
  $("#viewport").classList.toggle("sculpting", tool !== "orbit");
  $("#brush-hint").classList.toggle("hidden", tool === "orbit");
  $("#brush-hint").innerHTML = `${tool.toUpperCase()} <span>Click + drag</span>`;
  $("#inspector-title").textContent = presetData[params.preset].name;
  const sn = $("#sculpt-note"); if (sn) sn.textContent = tool === "orbit" ? "Drag to orbit. Select brush to shape." : "Click + drag to sculpt. Alt to orbit.";
}
$$(".sculpt-tools .sculpt-tool").forEach(el => el.onclick = () => { state.stamp = null; selectTool(el.dataset.tool); });
$$(".stamp").forEach(el => el.onclick = () => {
  state.stamp = Number(el.dataset.stamp);
  state.tool = "stamp";
  $$(".sculpt-tool").forEach(b => b.classList.toggle("active", b === el));
  $("#viewport").classList.add("sculpting");
  $("#brush-hint").classList.remove("hidden");
  $("#brush-hint").innerHTML = `STAMP <span>Click to place (${["", "Dome", "Arch", "Spire", "Butte", "Trench", "Cavern", "Crater", "Boulder"][state.stamp]})</span>`;
});

function setRun(v) { if (!state.ready || state.rebuilding || !renderer?.gpu) return; state.running = v; updateSim(); }
function updateSim() {
  $("#run-label").textContent = state.running ? "Pause erosion" : "Run erosion";
  $("#run-label2").textContent = state.running ? "Pause" : "Run";
  $(".play-icon").textContent = state.running ? "Ⅱ" : "▶";
  $("#simulation-label").textContent = state.running ? "Hybrid erosion running" : state.iterations ? "Landscape at rest" : "Erosion ready";
  $("#sim-detail").textContent = state.running ? `${["Rain", "Runoff", "River", "Wind", "Rock", "Chem"][params.sourceMode]} · GPU · budgeted` : state.iterations ? "Paused" : "Ready · stable carve";
  $("#iterations").textContent = state.iterations.toLocaleString();
  const bar = document.querySelector(".simulation-bar"); if (bar) bar.classList.toggle("running", state.running);
  $("#renderer-label").textContent = renderer?.gpu ? "WebGL2 · hybrid GPU" : "WebGL2";
}
$("#run").onclick = () => setRun(!state.running);
$("#run2").onclick = () => setRun(!state.running);
$("#particle-toggle").onclick = () => {
  params.showParticles = !params.showParticles;
  if (renderer) renderer.showParticles = params.showParticles;
  $("#particle-toggle").classList.toggle("on", params.showParticles);
};
$("#sediment-toggle").onclick = () => {
  params.showSediment = !params.showSediment;
  if (renderer) renderer.showSediment = params.showSediment;
  $("#sediment-toggle").classList.toggle("on", params.showSediment);
};
$("#water-toggle").onclick = () => {
  params.waterEnabled = !params.waterEnabled;
  $("#water-toggle").classList.toggle("on", params.waterEnabled);
};
$$("[data-source]").forEach(btn => btn.onclick = () => {
  params.sourceMode = Number(btn.dataset.source);
  $$("[data-source]").forEach(b => b.classList.toggle("active", b === btn));
  $("#weather-description").textContent = ["Rain → runoff → river. Wind carves spires.", "Concentrated runoff — gullies.", "River carves bed & banks.", "Wind abrasion → spires & hoodoos.", "Rockfall — impact craters & scree.", "Chemical dissolution — karst."][params.sourceMode];
  updateSim();
});
$("#audit-erosion").onclick = async () => {
  if (!state.ready || !renderer.gpu) return;
  setRun(false);
  const out = $("#erosion-audit"); out.classList.remove("hidden"); out.textContent = "Reading GPU ledger…";
  try {
    await operation;
    const a = await renderer.auditErosion();
    out.textContent = `Active particles ${a.active}
Solid rock ${a.solid.toFixed(1)} m³
Ticks ${a.steps}
Sculpted ${a.sculpted ? "yes (mass ledger open)" : "no"}
Budget: erosion ≤ free capacity · armor on · stall-deposit on
Stability ${(params.stability ?? 0.5).toFixed(2)} · footprint ${params.footprint} m → carve r ${Math.min(1.15, Math.max(0.5, params.footprint * 0.55)).toFixed(2)} m`;
  } catch (e) { out.textContent = e.message; }
};
async function step(count = 1) {
  if (!state.ready || state.busy || state.rebuilding) return;
  state.busy = true;
  operation = renderer.step({ ...params }, count);
  try { await operation; state.iterations += count; state.dirty = true; updateSim(); }
  catch (e) { fatal(e.message); } finally { state.busy = false; }
}
$("#step").onclick = () => { setRun(false); step(1); };
$("#reset-erosion").onclick = () => rebuild();
$("#view-mode").onclick = () => {
  state.clay = !state.clay;
  $("#view-mode span").textContent = state.clay ? "Clay" : "Lit";
};
function resetCamera() {
  camera.yaw = 0.39; camera.pitch = 0.65;
  const bounds = canvas.getBoundingClientRect();
  camera.distance = 46 * Math.min(1.6, Math.max(1, (1.12 * bounds.height) / Math.max(1, bounds.width)));
  camera.target = [0, params.preset === 1 ? 2 : 4, 0];
}
$("#reset-camera").onclick = resetCamera;
$("#fullscreen").onclick = async () => {
  try { if (document.fullscreenElement) await document.exitFullscreen(); else await $("#viewport").requestFullscreen(); } catch { toast("Fullscreen not available"); }
};
$("#help").onclick = () => $("#help-dialog").showModal();
$("#close-help").onclick = () => $("#help-dialog").close();

$("#export").onclick = async () => {
  if (!state.ready) { toast("Not ready"); return; }
  const btn = $("#export"); btn.disabled = true;
  state.running = false; updateSim();
  toast("Packing SDF…", 15000);
  try {
    await operation;
    const vol = await renderer.readVolume();
    const header = { format: "frontier-sdf", version: 3, dimensions: SIZE, settings: { ...params }, camera: { ...camera }, iterations: state.iterations, model: "hybrid-stable-csg-v1" };
    const json = new TextEncoder().encode(JSON.stringify(header));
    const prefix = new Uint32Array([0x46534446, json.length]);
    const blob = new Blob([prefix, json, vol], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `frontier-hybrid-${params.seed}.frontier`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    toast("Exported SDF + settings (.frontier)");
  } catch (e) { toast("Export failed: " + e.message, 8000); } finally { btn.disabled = false; }
};

function fatal(msg) {
  state.running = false; state.ready = false;
  $("#loading").classList.remove("hidden");
  $("#loading strong").textContent = "Renderer stopped";
  const sp = $("#loading>span"); if (sp) sp.textContent = msg;
  $("#renderer-label").textContent = "Error";
}
function rayAt(x, y) {
  const rect = canvas.getBoundingClientRect(), uv = [((x - rect.left) / rect.width) * 2 - 1, 1 - ((y - rect.top) / rect.height) * 2];
  const origin = eye();
  const forward = ((t) => { const l = Math.hypot(...t) || 1; return t.map(v => v / l); })(camera.target.map((v, k) => v - origin[k]));
  const right = ((a, b) => { const c = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; const l = Math.hypot(...c) || 1; return c.map(v => v / l); })(forward, [0, 1, 0]);
  const up = [right[1] * forward[2] - right[2] * forward[1], right[2] * forward[0] - right[0] * forward[2], right[0] * forward[1] - right[1] * forward[0]];
  return { origin, direction: ((f, r, u, uv) => { const v = f.map((_, k) => f[k] + r[k] * uv[0] * rect.width / rect.height * 0.62 + u[k] * uv[1] * 0.62); const l = Math.hypot(...v) || 1; return v.map(x => x / l); })(forward, right, up, uv) };
}
function bindCanvas() {
  let pointer = null, picking = false, queued = null, lastPick = 0, lastStroke = null, strokeVer = 0;
  const touches = new Map();
  const pick = async (x, y, apply, ver = strokeVer) => {
    if (state.rebuilding || !state.ready || (state.tool === "orbit" && !state.stamp)) return;
    if (picking) { queued = { x, y, apply, ver }; return; }
    picking = true;
    try {
      const ray = rayAt(x, y);
      const pt = await renderer.pick(ray.origin, ray.direction);
      state.brush = pt;
      if (apply && pt && !state.busy && !state.rebuilding) {
        state.busy = true;
        const isStamp = !!state.stamp;
        const spacing = params.radius * 0.25, dist = lastStroke ? Math.hypot(...pt.map((v, k) => v - lastStroke[k])) : 0;
        const count = isStamp ? 1 : (lastStroke ? Math.min(8, Math.max(1, Math.ceil(dist / spacing))) : 1);
        const from = lastStroke || pt;
        operation = (async () => {
          if (isStamp) {
            await renderer.sculpt(pt, params.stampScale * params.radius * 1.4, "stamp", params.brushStrength, state.stamp, state.stampMode, 8);
            toast(`${["", "Dome", "Arch", "Spire", "Butte", "Trench", "Cavern", "Crater", "Boulder"][state.stamp]} stamped + re-distanced`, 1800);
          } else {
            if (dist < spacing && lastStroke) return;
            for (let i = 1; i <= count; i++) {
              const dab = from.map((v, k) => v + (pt[k] - v) * i / count);
              await renderer.sculpt(dab, params.radius, state.tool, params.brushStrength, 0, 0, count >= 8 ? 2 : 6);
            }
          }
          if (ver === strokeVer) lastStroke = [...pt];
        })();
        try { await operation; state.dirty = true; } finally { state.busy = false; }
      } else if (apply && !pt) toast("Aim at rock", 1600);
    } catch (e) { console.error(e); toast("Brush miss"); }
    finally { picking = false; if (queued) { const n = queued; queued = null; pick(n.x, n.y, n.apply, n.ver); } }
  };
  canvas.addEventListener("contextmenu", e => e.preventDefault());
  canvas.addEventListener("pointerdown", e => {
    if (!state.ready || (e.pointerType !== "touch" && (pointer || navigation.looking))) return;
    canvas.focus(); canvas.setPointerCapture(e.pointerId);
    touches.set(e.pointerId, [e.clientX, e.clientY]);
    if (touches.size === 2) return;
    strokeVer++; lastStroke = null;
    pointer = { x: e.clientX, y: e.clientY, button: e.button, alt: e.altKey };
    if (e.button === 2) {
      flightKeys.clear(); navigation.looking = true; navigation.lockPending = true;
      try { const lk = canvas.requestPointerLock?.(); Promise.resolve(lk).catch(() => {}).finally(() => { navigation.lockPending = false; }); } catch { navigation.lockPending = false; }
    }
    if (e.button === 0 && !e.altKey && (state.tool !== "orbit" || state.stamp)) pick(e.clientX, e.clientY, true);
  });
  canvas.addEventListener("pointermove", e => {
    if (touches.has(e.pointerId)) touches.set(e.pointerId, [e.clientX, e.clientY]);
    if (touches.size === 2) return;
    if (pointer) {
      const dx = document.pointerLockElement === canvas ? e.movementX : e.clientX - pointer.x;
      const dy = document.pointerLockElement === canvas ? e.movementY : e.clientY - pointer.y;
      pointer.x = e.clientX; pointer.y = e.clientY;
      if (pointer.button === 2 || (pointer.button === 0 && navigation.mode === "fly" && state.tool === "orbit" && !e.altKey)) {
        flyLook(camera, dx, dy);
      } else if (pointer.button === 1) {
        const right = [Math.cos(camera.yaw), 0, -Math.sin(camera.yaw)], factor = camera.distance * 0.0015;
        camera.target[0] -= right[0] * dx * factor; camera.target[2] -= right[2] * dx * factor; camera.target[1] += dy * factor;
      } else if ((state.tool === "orbit" && !state.stamp) || e.altKey || pointer.alt) {
        camera.yaw -= dx * 0.006; camera.pitch = Math.max(0.08, Math.min(1.35, camera.pitch + dy * 0.005));
      } else if (performance.now() - lastPick > 55) { lastPick = performance.now(); pick(e.clientX, e.clientY, true); }
    } else if ((state.tool !== "orbit" || state.stamp) && performance.now() - lastPick > 80) { lastPick = performance.now(); pick(e.clientX, e.clientY, false); }
  });
  const end = e => {
    if (e.type === "lostpointercapture" && (navigation.lockPending || document.pointerLockElement === canvas)) return;
    touches.delete(e.pointerId); lastStroke = null; pointer = null; navigation.looking = false; flightKeys.clear();
    if (document.pointerLockElement === canvas) document.exitPointerLock();
  };
  canvas.addEventListener("pointerup", end); canvas.addEventListener("pointercancel", end); canvas.addEventListener("lostpointercapture", end);
  canvas.addEventListener("pointerleave", () => { if (!pointer) state.brush = null; });
  canvas.addEventListener("wheel", e => {
    e.preventDefault();
    if ((navigation.mode === "fly" || navigation.looking) && !e.altKey) {
      params.cameraSpeed = Math.max(0.5, Math.min(40, params.cameraSpeed * Math.exp(-e.deltaY * 0.001)));
      syncControls(); return;
    }
    camera.distance = Math.max(12, Math.min(90, camera.distance * Math.exp(e.deltaY * 0.001)));
  }, { passive: false });
}
function resize() {
  const rect = canvas.getBoundingClientRect();
  const maxPix = 650000;
  const ratio = Math.min(Math.min(window.devicePixelRatio || 1, 1.3) * scale, Math.sqrt(maxPix / Math.max(1, rect.width * rect.height)), 4096 / Math.max(1, rect.width, rect.height));
  const w = Math.max(1, Math.round(rect.width * ratio)), h = Math.max(1, Math.round(rect.height * ratio));
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
}
function uniforms(now) {
  const pos = eye(), rect = canvas.getBoundingClientRect();
  return new Float32Array([
    ...pos, now * 0.001,
    ...camera.target, Math.max(1, rect.width) / Math.max(1, rect.height),
    canvas.width, canvas.height, state.iterations, 0,
    params.sun, params.haze, params.waterLevel, params.waterEnabled ? 1 : 0,
    params.strata, params.roughness, 0.65, 0.25,
    ...(state.brush || [0, 0, 0]), state.brush ? params.radius : -1,
    state.clay ? 1 : 0, params.preset, 0, 0,
  ]);
}
function frame(now) {
  requestAnimationFrame(frame);
  const dt = (now - navTime) * 0.001; navTime = now;
  if (state.ready && !document.hidden && navigation.looking && document.activeElement === canvas) flyMove(camera, flightKeys, dt, params.cameraSpeed);
  if (!state.ready || document.hidden) return;
  if (now - lastTime < 15) return;
  lastTime = now;
  try {
    resize();
    const rect = canvas.getBoundingClientRect(); if (rect.width < 1 || rect.height < 1) return;
    renderer.draw(uniforms(now));
    state.renderedFrames++;
  } catch (e) { state.ready = false; fatal(e.message); return; }
  if (state.running && !state.busy && !state.rebuilding && now - lastSim > 40) { lastSim = now; step(params.speed); }
}
async function init() {
  syncControls(); updateSim();
  try {
    const vol = new Volume(SIZE);
    generateVolume(vol, params);
    $("#loading strong").textContent = "Checking renderer";
    const span = $("#loading>span"); if (span) span.textContent = "Raymarching SDF…";
    resetCamera();
    renderer = await createRenderer(canvas, vol.data, fatal);
    bindCanvas();
    state.ready = true;
    $("#loading").classList.add("hidden");
    $("#renderer-label").textContent = renderer.gpu ? "WebGL2 · hybrid GPU" : "WebGL2";
    if (!renderer.gpu) { $("#run").disabled = true; $("#step").disabled = true; toast(renderer.erosionError, 12000); }
    requestAnimationFrame(frame);
    window.frontier = {
      get backend() { return renderer.gpu ? "webgl2-hybrid" : "none"; },
      get iterations() { return state.iterations; },
      get settings() { return structuredClone(params); },
      readVolume: () => renderer.readVolume(),
      auditErosion: () => renderer.auditErosion(),
    };
    toast("Hybrid SDF terrain ready: budgeted particle erosion + CSG sculpt. Space to run.", 6000);
  } catch (e) { console.error(e); fatal(e.message); }
}
window.addEventListener("keydown", e => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.code === "Space") { e.preventDefault(); setRun(!state.running); }
  if (e.code === "Home") { e.preventDefault(); resetCamera(); }
  if (["1", "2", "3", "4", "5", "6"].includes(e.key)) selectTool(["orbit", "carve", "build", "smooth", "flatten", "paint"][Number(e.key) - 1]);
});
window.addEventListener("keyup", e => flightKeys.delete(e.code));
window.addEventListener("keydown", e => {
  if (navigation.looking && FLIGHT_KEYS.has(e.code) && !e.ctrlKey && !e.metaKey && !e.altKey && document.activeElement === canvas && !document.querySelector("dialog[open]")) {
    flightKeys.add(e.code); e.preventDefault();
  }
  if (e.code === "Escape") { flightKeys.clear(); navigation.looking = false; if (document.pointerLockElement === canvas) document.exitPointerLock(); }
});
init();

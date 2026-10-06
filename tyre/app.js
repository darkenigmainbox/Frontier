import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  clone,
  grid,
  rectangle,
  boundary,
  validateGrid,
  refine,
  transform,
  dimensions,
  build,
  blockMesh,
  audit,
  obj,
  preset,
  readRecipe,
} from "./QuadMesh.js";
const $ = (id) => document.getElementById(id),
  svg = $("editor"),
  NS = "http://www.w3.org/2000/svg";
let state = preset(),
  selected = 0,
  history = [],
  future = [],
  meshes = [],
  drawPoints = null,
  drag = null,
  view = null,
  buildTimer;
const status = (text, warn = false) => {
  $("status").textContent = text;
  $("status").classList.toggle("warning", warn);
};
function checkpoint() {
  history.push(JSON.stringify(state));
  if (history.length > 80) history.shift();
  future = [];
}
function undo() {
  if (!history.length) return;
  future.push(JSON.stringify(state));
  state = JSON.parse(history.pop());
  selected = Math.min(selected, state.blocks.length - 1);
  sync();
}
function redo() {
  if (!future.length) return;
  history.push(JSON.stringify(state));
  state = JSON.parse(future.pop());
  selected = Math.min(selected, state.blocks.length - 1);
  sync();
}
function change(fn) {
  const old = clone(state);
  try {
    fn();
    if (state.blocks.some((b) => !validateGrid(b.grid)))
      throw Error("Edit rejected: a quad would fold or collapse.");
    for (const b of state.blocks) blockMesh(b.grid, state);
    history.push(JSON.stringify(old));
    if (history.length > 80) history.shift();
    future = [];
    sync();
    status("Pattern updated");
  } catch (e) {
    state = old;
    sync();
    status(e.message, true);
  }
}
const specs = [
  ["width", "Section width · mm", 150, 400, 5],
  ["aspect", "Aspect ratio · %", 30, 85, 1],
  ["rim", "Rim diameter · inches", 12, 24, 1],
  ["repeat", "Repeats around tyre", 12, 64, 1],
  ["depth", "Block height · mm", 3, 25, 0.5],
  ["crown", "Crown · mm", 0, 8, 0.5],
  ["bevel", "Top inset · fraction", 0.02, 0.2, 0.01],
];
for (const [key, label, min, max, step] of specs) {
  const l = document.createElement("label");
  l.innerHTML = `${label}<output id="value-${key}"></output><input id="param-${key}" type="range" min="${min}" max="${max}" step="${step}">`;
  $("parameters").append(l);
  const el = $("param-" + key);
  el.onchange = () =>
    change(() => {
      const old = dimensions(state);
      state[key] = Number(el.value);
      const next = dimensions(state);
      if (["width", "aspect", "rim", "repeat"].includes(key)) {
        state.blocks.forEach(
          (b) =>
            (b.grid = b.grid.map((row) =>
              row.map((p) => [
                p[0] * (key === "width" ? state.width / oldWidth : 1),
                (p[1] * next.pitch) / old.pitch,
              ]),
            )),
        );
        view = null;
      }
    });
  let oldWidth = state.width;
  el.onpointerdown = () => (oldWidth = state.width);
  el.onkeydown = () => (oldWidth = state.width);
  el.oninput = () => ($("value-" + key).textContent = el.value);
}
function sync() {
  selected = Math.max(0, Math.min(selected, state.blocks.length - 1));
  for (const [key] of specs) {
    $("param-" + key).value = state[key];
    $("value-" + key).textContent = state[key];
  }
  $("blocks").replaceChildren();
  state.blocks.forEach((b, i) => {
    const button = document.createElement("button");
    button.textContent = `${String(i + 1).padStart(2, "0")}  ${b.name}`;
    button.className = i === selected ? "active" : "";
    button.onclick = () => {
      selected = i;
      sync();
      if ($("isolate").checked) frame();
    };
    $("blocks").append(button);
  });
  $("name").value = state.blocks[selected]?.name || "";
  $("undo").disabled = !history.length;
  $("redo").disabled = !future.length;
  drawEditor();
  rebuild();
}
function element(tag, attrs, parent = svg) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  parent.append(e);
  return e;
}
function fit() {
  const { pitch } = dimensions(state),
    rect = svg.getBoundingClientRect(),
    aspect = rect.width / Math.max(rect.height, 1);
  let w = state.width * 1.25,
    h = pitch * 1.85;
  if (w / h < aspect) w = h * aspect;
  else h = w / aspect;
  view = { x: -w / 2, y: pitch / 2 - h / 2, w, h };
}
function drawEditor() {
  if (!view) fit();
  svg.setAttribute("viewBox", `${view.x} ${view.y} ${view.w} ${view.h}`);
  svg.replaceChildren();
  const { pitch } = dimensions(state),
    px = view.w / Math.max(svg.clientWidth, 1);
  const defs = element("defs", {}),
    pattern = element(
      "pattern",
      { id: "grid", width: 10, height: 10, patternUnits: "userSpaceOnUse" },
      defs,
    );
  element(
    "path",
    {
      d: "M 10 0 H 0 V 10",
      fill: "none",
      stroke: "#28383e",
      "stroke-width": px * 0.5,
    },
    pattern,
  );
  element("rect", {
    x: view.x,
    y: view.y,
    width: view.w,
    height: view.h,
    fill: "url(#grid)",
  });
  element("rect", {
    x: -state.width * 0.46,
    y: 0,
    width: state.width * 0.92,
    height: pitch,
    fill: "#a1e9bd",
    "fill-opacity": 0.025,
    stroke: "#526a73",
    "stroke-width": px,
    "stroke-dasharray": `${px * 5} ${px * 5}`,
  });
  element("line", {
    x1: 0,
    x2: 0,
    y1: view.y,
    y2: view.y + view.h,
    stroke: "#3e595a",
    "stroke-width": px,
    "stroke-dasharray": `${px * 4} ${px * 5}`,
  });
  for (const offset of [-pitch, 0, pitch])
    state.blocks.forEach((b, index) => {
      const active = index === selected && offset === 0,
        group = element("g", {
          opacity: offset === 0 ? 1 : 0.15,
          transform: `translate(0 ${offset})`,
        });
      const outline = boundary(b.grid)
        .map(([j, i]) => b.grid[j][i].join(","))
        .join(" ");
      element(
        "polygon",
        {
          points: outline,
          fill: active ? "#326956" : "#30414a",
          stroke: active ? "#bcf1d0" : "#6b8995",
          "stroke-width": px * 1.4,
          "data-block": index,
        },
        group,
      );
      for (let j = 0; j < b.grid.length; j++)
        element(
          "polyline",
          {
            points: b.grid[j].map((p) => p.join(",")).join(" "),
            fill: "none",
            stroke: active ? "#7bc29d" : "#536c76",
            "stroke-width": px * 0.75,
            "pointer-events": "none",
          },
          group,
        );
      for (let i = 0; i < b.grid[0].length; i++)
        element(
          "polyline",
          {
            points: b.grid.map((r) => r[i].join(",")).join(" "),
            fill: "none",
            stroke: active ? "#7bc29d" : "#536c76",
            "stroke-width": px * 0.75,
            "pointer-events": "none",
          },
          group,
        );
      if (active)
        b.grid.forEach((row, j) =>
          row.forEach((p, i) =>
            element(
              "circle",
              {
                cx: p[0],
                cy: p[1],
                r:
                  px *
                  (j === 0 ||
                  i === 0 ||
                  j === b.grid.length - 1 ||
                  i === row.length - 1
                    ? 3.6
                    : 2.4),
                fill: "#18272a",
                stroke: "#c9f4d5",
                "stroke-width": px,
                "data-j": j,
                "data-i": i,
                "data-block": index,
              },
              group,
            ),
          ),
        );
      if (offset !== 0) group.setAttribute("pointer-events", "none");
    });
  const label = element("text", {
    x: -state.width * 0.46,
    y: -5,
    fill: "#7f9da5",
    "font-size": px * 10,
    "font-family": "monospace",
    "pointer-events": "none",
  });
  label.textContent = `ACROSS ${state.width.toFixed(0)} mm / PITCH ${pitch.toFixed(1)} mm`;
  if (drawPoints) {
    element("polyline", {
      points: drawPoints.map((p) => p.join(",")).join(" "),
      fill: "none",
      stroke: "#edc985",
      "stroke-width": px * 2,
    });
    for (const p of drawPoints)
      element("circle", { cx: p[0], cy: p[1], r: px * 4, fill: "#edc985" });
  }
}
function point(e) {
  const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(
    svg.getScreenCTM().inverse(),
  );
  return [p.x, p.y];
}
const snap = (p) => ($("snap").checked ? p.map(Math.round) : p);
svg.oncontextmenu = (e) => e.preventDefault();
svg.onpointerdown = (e) => {
  if (e.button === 2 || e.button === 1) {
    drag = { pan: true, start: point(e), view: { ...view } };
    svg.setPointerCapture(e.pointerId);
    return;
  }
  if (e.button !== 0) return;
  svg.focus();
  const p = snap(point(e));
  if (drawPoints) {
    drawPoints.push(p);
    if (drawPoints.length === 4) {
      let corners = drawPoints;
      if (!validateGrid(grid(corners))) {
        corners = [...corners].reverse();
      }
      if (!validateGrid(grid(corners))) {
        drawPoints = [];
        status(
          "Draw four convex corners around the outline, not crossing diagonals.",
          true,
        );
      } else {
        change(() => {
          if (state.blocks.length >= 32) throw Error("Maximum 32 blocks");
          state.blocks.push({ name: "Custom patch", grid: grid(corners) });
          selected = state.blocks.length - 1;
        });
        drawPoints = null;
        $("draw").classList.remove("active");
      }
    }
    drawEditor();
    return;
  }
  const id = e.target.getAttribute("data-block");
  if (id === null) return;
  selected = Number(id);
  const j = e.target.getAttribute("data-j"),
    i = e.target.getAttribute("data-i");
  drag = {
    start: p,
    original: clone(state.blocks[selected].grid),
    before: JSON.stringify(state),
    j: j === null ? null : Number(j),
    i: i === null ? null : Number(i),
  };
  svg.setPointerCapture(e.pointerId);
  drawEditor();
};
svg.onpointermove = (e) => {
  if (!drag) return;
  if (drag.pan) {
    const p = point(e);
    view.x += drag.start[0] - p[0];
    view.y += drag.start[1] - p[1];
    drawEditor();
    return;
  }
  const p = snap(point(e)),
    dx = p[0] - drag.start[0],
    dy = p[1] - drag.start[1];
  let candidate = clone(drag.original);
  if (drag.j === null) candidate = transform(candidate, { dx, dy });
  else
    candidate[drag.j][drag.i] = [
      drag.original[drag.j][drag.i][0] + dx,
      drag.original[drag.j][drag.i][1] + dy,
    ];
  let valid = true,
    error = "";
  try {
    blockMesh(candidate, state);
  } catch (e) {
    valid = false;
    error = e.message;
  }
  if (valid) {
    state.blocks[selected].grid = candidate;
    drawEditor();
    clearTimeout(buildTimer);
    buildTimer = setTimeout(rebuild, 100);
    status("Editing quad patch");
  } else status(error, true);
};
function endDrag(cancel = false) {
  if (!drag) return;
  if (drag.pan) {
    drag = null;
    return;
  }
  if (cancel) state = JSON.parse(drag.before);
  else if (JSON.stringify(state) !== drag.before) {
    history.push(drag.before);
    future = [];
  }
  drag = null;
  sync();
}
svg.onpointerup = () => endDrag();
svg.onpointercancel = () => endDrag(true);
svg.onwheel = (e) => {
  e.preventDefault();
  const p = point(e),
    factor = Math.exp(Math.max(-0.3, Math.min(0.3, e.deltaY * 0.001)));
  if (view.w * factor < 30 || view.w * factor > 2000) return;
  view = {
    x: p[0] + (view.x - p[0]) * factor,
    y: p[1] + (view.y - p[1]) * factor,
    w: view.w * factor,
    h: view.h * factor,
  };
  drawEditor();
};
$("fit2d").onclick = () => {
  view = null;
  drawEditor();
};
$("undo").onclick = undo;
$("redo").onclick = redo;
$("name").onchange = () =>
  change(() => (state.blocks[selected].name = $("name").value || "Tread"));
$("preset").onchange = () => {
  checkpoint();
  state = preset($("preset").value);
  selected = 0;
  view = null;
  sync();
  frame();
};
$("add").onclick = () =>
  change(() => {
    if (state.blocks.length >= 32) throw Error("Maximum 32 blocks");
    state.blocks.push({
      name: "Custom block",
      grid: rectangle(0, dimensions(state).pitch / 2, 40, 30),
    });
    selected = state.blocks.length - 1;
  });
$("draw").onclick = () => {
  drawPoints = drawPoints ? null : [];
  $("draw").classList.toggle("active", !!drawPoints);
  status(
    drawPoints
      ? "Click four corners around a block outline. Escape cancels."
      : "Draw cancelled",
  );
  drawEditor();
};
$("duplicate").onclick = () =>
  change(() => {
    if (state.blocks.length >= 32) throw Error("Maximum 32 blocks");
    const b = state.blocks[selected];
    state.blocks.push({
      name: b.name + " copy",
      grid: transform(b.grid, { dx: 12, dy: 8 }),
    });
    selected = state.blocks.length - 1;
  });
$("mirror").onclick = () =>
  change(() => {
    if (state.blocks.length >= 32) throw Error("Maximum 32 blocks");
    const b = state.blocks[selected];
    state.blocks.push({
      name: b.name + " mirrored",
      grid: transform(b.grid, { mirror: true }, [0, 0]),
    });
    selected = state.blocks.length - 1;
  });
$("delete").onclick = () =>
  change(() => {
    if (state.blocks.length === 1) throw Error("Keep at least one tread block");
    state.blocks.splice(selected, 1);
  });
for (const [id, axis] of [
  ["columns", "columns"],
  ["rows", "rows"],
])
  $(id).onclick = () =>
    change(() => {
      const b = state.blocks[selected];
      if ((axis === "columns" ? b.grid[0].length : b.grid.length) > 16)
        throw Error("Maximum 32 cells per direction");
      b.grid = refine(b.grid, axis);
    });
for (const [id, t] of [
  ["rotateLeft", { angle: -5 }],
  ["rotateRight", { angle: 5 }],
  ["shrink", { scale: 0.9 }],
  ["grow", { scale: 1.1 }],
])
  $(id).onclick = () =>
    change(
      () =>
        (state.blocks[selected].grid = transform(
          state.blocks[selected].grid,
          t,
        )),
    );
window.addEventListener("keydown", (e) => {
  if (["INPUT", "SELECT", "TEXTAREA"].includes(e.target.tagName)) return;
  if (e.key === "Escape") {
    drawPoints = null;
    $("draw").classList.remove("active");
    endDrag(true);
    drawEditor();
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
    e.preventDefault();
    e.shiftKey ? redo() : undo();
  }
  if (e.key === "Delete") $("delete").click();
  if (e.key.startsWith("Arrow")) {
    e.preventDefault();
    const d = e.shiftKey ? 5 : 1;
    change(
      () =>
        (state.blocks[selected].grid = transform(state.blocks[selected].grid, {
          dx: e.key === "ArrowLeft" ? -d : e.key === "ArrowRight" ? d : 0,
          dy: e.key === "ArrowUp" ? -d : e.key === "ArrowDown" ? d : 0,
        })),
    );
  }
});
function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type })),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$("save").onclick = () =>
  download(
    "quad-tyre.json",
    JSON.stringify(state, null, 2),
    "application/json",
  );
$("export").onclick = () => {
  rebuild();
  if (!$("export").disabled)
    download("quad-tyre.obj", obj(meshes), "text/plain");
};
$("load").onclick = () => $("file").click();
$("file").onchange = async () => {
  try {
    const file = $("file").files[0];
    if (!file) return;
    if (file.size > 2e6) throw Error("Recipe too large");
    const next = readRecipe(JSON.parse(await file.text()));
    checkpoint();
    state = next;
    selected = 0;
    view = null;
    sync();
    frame();
    status("Recipe loaded");
  } catch (e) {
    status(e.message, true);
  } finally {
    $("file").value = "";
  }
};
// WebGL triangulates ONLY for rasterization; never save these indices as the mesh.
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setClearColor("#192326");
$("viewport").append(renderer.domElement);
const scene = new THREE.Scene(),
  camera = new THREE.PerspectiveCamera(35, 1, 1, 10000),
  controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
scene.add(new THREE.HemisphereLight(0xd8efff, 0x35483c, 2.8));
const light = new THREE.DirectionalLight(0xffead3, 4);
light.position.set(800, 1000, 800);
scene.add(light);
const fill = new THREE.DirectionalLight(0x8ce4d6, 2);
fill.position.set(-700, 100, -600);
scene.add(fill);
const group = new THREE.Group();
scene.add(group);
let wire;
const casingMaterial = new THREE.MeshStandardMaterial({
    color: 0x292f30,
    roughness: 0.86,
    metalness: 0.03,
  }),
  treadMaterial = new THREE.MeshStandardMaterial({
    color: 0x465350,
    roughness: 0.78,
    metalness: 0.02,
  }),
  lineMaterial = new THREE.LineBasicMaterial({
    color: 0x92dcb6,
    transparent: true,
    opacity: 0.48,
    depthTest: true,
  });
function frame() {
  if ($("isolate").checked && meshes[1 + selected]) {
    const box = new THREE.Box3().setFromPoints(
        meshes[1 + selected].vertices.map((p) => new THREE.Vector3(...p)),
      ),
      c = box.getCenter(new THREE.Vector3()),
      size = box.getSize(new THREE.Vector3()),
      d = Math.max(size.x, size.y, size.z) * 2.2;
    controls.target.copy(c);
    camera.position.copy(c).add(new THREE.Vector3(d * 0.5, d, d * 0.7));
    controls.update();
    return;
  }
  const { radius } = dimensions(state);
  camera.position.set(radius * 2.1, radius * 1.3, radius * 3.0);
  controls.target.set(0, 0, 0);
  controls.update();
}
frame();
function rebuild() {
  clearTimeout(buildTimer);
  try {
    meshes = build(state);
    const reports = meshes.map(audit),
      totals = reports.reduce((o, r) => {
        for (const k of [
          "vertices",
          "quads",
          "nonQuad",
          "degenerate",
          "openEdges",
          "nonmanifold",
          "windingErrors",
        ])
          o[k] = (o[k] || 0) + r[k];
        return o;
      }, {}),
      bad =
        reports.filter((r) => r.volume <= 0 || !Number.isFinite(r.volume))
          .length +
        totals.nonQuad +
        totals.degenerate +
        totals.openEdges +
        totals.nonmanifold +
        totals.windingErrors;
    $("export").disabled = !!bad;
    $("stats").textContent =
      `${totals.quads.toLocaleString()} quads · ${state.blocks.length} blocks × ${state.repeat} repeats`;
    const report = $("report");
    report.replaceChildren();
    const dl = document.createElement("dl");
    report.append(dl);
    for (const [name, value] of [
      ["Quad faces", totals.quads.toLocaleString()],
      ["Non-quad faces", totals.nonQuad],
      ["Open edges", totals.openEdges],
      ["Non-manifold edges", totals.nonmanifold],
      ["Winding conflicts", totals.windingErrors],
      ["Degenerate faces", totals.degenerate],
      ["Inside-out solids", reports.filter((r) => r.volume <= 0).length],
      ["Closed solids", meshes.length],
      ["Maximum valence", Math.max(...reports.map((r) => r.maxValence))],
    ]) {
      const dt = document.createElement("dt"),
        dd = document.createElement("dd");
      dt.textContent = name;
      dd.textContent = value;
      dl.append(dt, dd);
    }
    while (group.children.length) {
      const c = group.children[0];
      c.geometry.dispose();
      group.remove(c);
    }
    const display = $("isolate").checked ? [meshes[1 + selected]] : meshes;
    const linePoints = [];
    for (let type = 0; type < 2; type++) {
      const positions = [],
        indices = [];
      let base = 0;
      for (const m of display.filter((m) =>
        type === 0 ? m.name === "Casing" : m.name !== "Casing",
      )) {
        for (const p of m.vertices) positions.push(...p);
        const edges = new Set();
        for (const q of m.quads) {
          indices.push(
            base + q[0],
            base + q[1],
            base + q[2],
            base + q[0],
            base + q[2],
            base + q[3],
          );
          for (let k = 0; k < 4; k++) {
            const a = q[k],
              b = q[(k + 1) % 4],
              key = a < b ? `${a},${b}` : `${b},${a}`;
            if (!edges.has(key)) {
              edges.add(key);
              linePoints.push(...m.vertices[a], ...m.vertices[b]);
            }
          }
        }
        base += m.vertices.length;
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3),
      );
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      const mesh = new THREE.Mesh(
        geometry,
        type === 0 ? casingMaterial : treadMaterial,
      );
      mesh.material.polygonOffset = true;
      mesh.material.polygonOffsetFactor = 1;
      mesh.material.polygonOffsetUnits = 1;
      group.add(mesh);
    }
    const lg = new THREE.BufferGeometry();
    lg.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(linePoints, 3),
    );
    wire = new THREE.LineSegments(lg, lineMaterial);
    wire.visible = $("wire").checked;
    group.add(wire);
    patternWarnings();
    if (bad) status("Invalid topology: export disabled", true);
  } catch (e) {
    $("export").disabled = true;
    status(e.message + " Preview unchanged; export disabled.", true);
  }
}
// Explicit warnings, not an undocumented automatic boolean/triangle conversion.
function patternWarnings() {
  const { pitch } = dimensions(state),
    warnings = [];
  if (
    state.blocks.some((b) =>
      b.grid.flat().some((p) => Math.abs(p[0]) > state.width * 0.46),
    )
  )
    warnings.push(
      "A block extends past the supported crown; move it inside the dashed width.",
    );
  const boxes = state.blocks.map((b) => {
    const ps = b.grid.flat();
    const middle =
      (Math.min(...ps.map((p) => p[1])) + Math.max(...ps.map((p) => p[1]))) / 2;
    const shift = Math.floor(middle / pitch) * pitch;
    for (let i = 0; i < ps.length; i++) ps[i] = [ps[i][0], ps[i][1] - shift];
    return {
      lo: [0, 1].map((k) => Math.min(...ps.map((p) => p[k]))),
      hi: [0, 1].map((k) => Math.max(...ps.map((p) => p[k]))),
    };
  });
  let possible = false;
  for (let i = 0; i < boxes.length; i++)
    for (let j = i; j < boxes.length; j++)
      for (const shift of [-pitch, 0, pitch]) {
        if (i === j && shift === 0) continue;
        const a = boxes[i],
          b = boxes[j];
        if (
          a.lo[0] < b.hi[0] &&
          b.lo[0] < a.hi[0] &&
          a.lo[1] < b.hi[1] + shift &&
          b.lo[1] + shift < a.hi[1]
        )
          possible = true;
      }
  if (possible)
    warnings.push(
      "Some block bounding boxes overlap, including repeat seams. Inspect the pattern: blocks are not automatically fused.",
    );
  $("warnings").textContent = warnings.length
    ? warnings.join(" ")
    : "No crown-boundary or repeat-overlap bounding-box warnings. This is not an exact surface-intersection certificate.";
  $("warnings").classList.toggle("warning", !!warnings.length);
}
$("isolate").onchange = () => {
  rebuild();
  frame();
};
$("wire").onchange = () => {
  if (wire) wire.visible = $("wire").checked;
};
$("frame").onclick = frame;
new ResizeObserver(() => {
  const w = $("viewport").clientWidth,
    h = $("viewport").clientHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  view = null;
  drawEditor();
}).observe($("viewport"));
renderer.setAnimationLoop(() => {
  controls.update();
  renderer.render(scene, camera);
});
window.TyreApp = {
  get state() {
    return clone(state);
  },
  get meshes() {
    return meshes;
  },
  setState(next) {
    state = readRecipe(next);
    sync();
  },
  audit: () => meshes.map(audit),
  obj: () => obj(meshes),
};
sync();

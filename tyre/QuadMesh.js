// Authoring and export remain indexed quads. Rendering triangulation lives in app.js only.
export const clone = (x) => JSON.parse(JSON.stringify(x));
export function grid(corners, cols = 4, rows = 4) {
  const mix = (a, b, t) => a.map((v, k) => v + (b[k] - v) * t);
  return Array.from({ length: rows + 1 }, (_, j) =>
    Array.from({ length: cols + 1 }, (_, i) =>
      mix(
        mix(corners[0], corners[1], i / cols),
        mix(corners[3], corners[2], i / cols),
        j / rows,
      ),
    ),
  );
}
export function rectangle(x, y, w, h, lean = 0) {
  return grid([
    [x - w / 2 - lean, y - h / 2],
    [x + w / 2 - lean, y - h / 2],
    [x + w / 2 + lean, y + h / 2],
    [x - w / 2 + lean, y + h / 2],
  ]);
}
const cross = (a, b, c) =>
  (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
export function validateGrid(g) {
  if (
    !Array.isArray(g) ||
    g.length < 2 ||
    g.length > 33 ||
    !Array.isArray(g[0]) ||
    g[0].length < 2 ||
    g[0].length > 33
  )
    return false;
  if (
    !g.every(
      (r) =>
        r.length === g[0].length &&
        r.every(
          (p) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite),
        ),
    )
  )
    return false;
  for (let j = 0; j < g.length - 1; j++)
    for (let i = 0; i < g[0].length - 1; i++) {
      const q = [g[j][i], g[j][i + 1], g[j + 1][i + 1], g[j + 1][i]];
      if (!q.every((p, k) => cross(p, q[(k + 1) % 4], q[(k + 2) % 4]) > 0.02))
        return false;
    }
  // A positive local Jacobian is not enough if the entire outline crosses itself.
  const b = boundary(g).map(([j, i]) => g[j][i]);
  for (let i = 0; i < b.length; i++)
    for (let j = i + 2; j < b.length; j++) {
      if (i === 0 && j === b.length - 1) continue;
      const a = b[i],
        c = b[(i + 1) % b.length],
        d = b[j],
        e = b[(j + 1) % b.length];
      if (
        cross(a, c, d) * cross(a, c, e) <= 0 &&
        cross(d, e, a) * cross(d, e, c) <= 0 &&
        Math.max(Math.min(a[0], c[0]), Math.min(d[0], e[0])) <=
          Math.min(Math.max(a[0], c[0]), Math.max(d[0], e[0])) &&
        Math.max(Math.min(a[1], c[1]), Math.min(d[1], e[1])) <=
          Math.min(Math.max(a[1], c[1]), Math.max(d[1], e[1]))
      )
        return false;
    }
  return true;
}
export function boundary(g) {
  const h = g.length - 1,
    w = g[0].length - 1,
    b = [];
  for (let i = 0; i < w; i++) b.push([0, i]);
  for (let j = 0; j < h; j++) b.push([j, w]);
  for (let i = w; i > 0; i--) b.push([h, i]);
  for (let j = h; j > 0; j--) b.push([j, 0]);
  return b;
}
export function refine(g, axis) {
  if (axis === "columns")
    return g.map((row) =>
      row.flatMap((p, i) =>
        i === row.length - 1
          ? [p]
          : [p, p.map((v, k) => (v + row[i + 1][k]) / 2)],
      ),
    );
  return g.flatMap((row, j) =>
    j === g.length - 1
      ? [row]
      : [row, row.map((p, i) => p.map((v, k) => (v + g[j + 1][i][k]) / 2))],
  );
}
export function transform(
  g,
  { dx = 0, dy = 0, angle = 0, scale = 1, mirror = false },
  pivot,
) {
  const flat = g.flat(),
    c =
      pivot ||
      [0, 1].map((k) => flat.reduce((a, p) => a + p[k], 0) / flat.length),
    a = (angle * Math.PI) / 180;
  let result = g.map((row) =>
    row.map((p) => {
      const x = (p[0] - c[0]) * scale * (mirror ? -1 : 1),
        y = (p[1] - c[1]) * scale;
      return [
        c[0] + x * Math.cos(a) - y * Math.sin(a) + dx,
        c[1] + x * Math.sin(a) + y * Math.cos(a) + dy,
      ];
    }),
  );
  if (mirror) result = result.map((row) => row.reverse());
  return result;
}
export function dimensions(s) {
  const rim = (s.rim * 25.4) / 2,
    radius = rim + (s.width * s.aspect) / 100;
  return { rim, radius, pitch: (2 * Math.PI * radius) / s.repeat };
}
export function wrap(p, z, s, phase = 0) {
  const { radius } = dimensions(s),
    a = (p[1] + phase) / radius,
    r = radius - s.crown * (p[0] / (s.width * 0.46)) ** 2 + z;
  return [p[0], r * Math.cos(a), r * Math.sin(a)];
}
export function blockMesh(g, s, phase = 0) {
  if (!validateGrid(g)) throw Error("Folded or degenerate quad patch");
  const points = g.flat(),
    ys = points.map((p) => p[1]);
  if (points.some((p) => Math.abs(p[0]) > s.width * 0.46 + 1e-7))
    throw Error("Keep the patch inside the dashed crown width.");
  if (Math.max(...ys) - Math.min(...ys) >= dimensions(s).pitch - 0.05)
    throw Error(
      "Patch spans a full repeat. Reduce its length or use fewer repeats.",
    );
  const vertices = [],
    quads = [],
    w = g[0].length,
    h = g.length,
    edge = boundary(g),
    flat = g.flat(),
    center = [0, 1].map(
      (k) => flat.reduce((a, p) => a + p[k], 0) / flat.length,
    );
  // Small affine inset keeps a valid grid valid. It is a proportional chamfer,
  // not a claimed constant-width polygon offset on complex concave outlines.
  const inset = (p, extra = 0) =>
    p.map((v, k) => center[k] + (v - center[k]) * (1 - s.bevel - extra));
  const outline = edge.map(([j, i]) => g[j][i]);
  for (let k = 0; k < outline.length; k++)
    if (cross(outline[k], outline[(k + 1) % outline.length], center) <= 0.02)
      throw Error(
        "Chamfer would fold at a deep concavity. Split this shape into simpler patches.",
      );
  for (const row of g)
    for (const p of row)
      vertices.push(wrap(inset(p, 0.025), s.depth, s, phase));
  for (let j = 0; j < h - 1; j++)
    for (let i = 0; i < w - 1; i++) {
      const a = j * w + i;
      quads.push([a, a + w, a + w + 1, a + 1]);
    }
  let previous = edge.map(([j, i]) => j * w + i);
  for (const z of [
    s.depth,
    s.depth - Math.min(s.depth * 0.3, 1.8),
    0.5,
    -0.6,
  ]) {
    const next = edge.map(([j, i]) => {
      vertices.push(
        wrap(z === s.depth ? inset(g[j][i]) : g[j][i], z, s, phase),
      );
      return vertices.length - 1;
    });
    for (let k = 0; k < edge.length; k++) {
      const n = (k + 1) % edge.length;
      quads.push([previous[k], previous[n], next[n], next[k]]);
    }
    previous = next;
  }
  const bottom = Array.from({ length: h }, () => Array(w));
  edge.forEach(([j, i], k) => (bottom[j][i] = previous[k]));
  for (let j = 1; j < h - 1; j++)
    for (let i = 1; i < w - 1; i++) {
      bottom[j][i] = vertices.length;
      vertices.push(wrap(g[j][i], -0.6, s, phase));
    }
  for (let j = 0; j < h - 1; j++)
    for (let i = 0; i < w - 1; i++)
      quads.push([
        bottom[j][i],
        bottom[j][i + 1],
        bottom[j + 1][i + 1],
        bottom[j + 1][i],
      ]);
  return { name: "Tread", vertices, quads };
}
export function casingMesh(s) {
  const { rim, radius } = dimensions(s),
    w = s.width / 2,
    profile = [];
  // Closed cross section, revolved without duplicating the angular seam.
  for (let i = 0; i <= 16; i++) {
    const x = -w * 0.92 + (i / 16) * w * 1.84;
    profile.push([x, radius - s.crown * (x / (w * 0.92)) ** 2]);
  }
  profile.push(
    [w * 0.97, radius - 8],
    [w, radius - 22],
    [w * 0.98, radius - (radius - rim) * 0.42],
    [w * 0.88, rim + 18],
    [w * 0.78, rim + 3],
    [w * 0.7, rim + 3],
    [w * 0.7, rim + 15],
    [w * 0.79, rim + 30],
    [w * 0.87, radius - 30],
    [w * 0.84, radius - 12],
    [-w * 0.84, radius - 12],
    [-w * 0.87, radius - 30],
    [-w * 0.79, rim + 30],
    [-w * 0.7, rim + 15],
    [-w * 0.7, rim + 3],
    [-w * 0.78, rim + 3],
    [-w * 0.88, rim + 18],
    [-w * 0.98, radius - (radius - rim) * 0.42],
    [-w, radius - 22],
    [-w * 0.97, radius - 8],
  );
  const n = s.repeat * 8,
    vertices = [],
    quads = [];
  for (const [x, r] of profile)
    for (let k = 0; k < n; k++)
      vertices.push([
        x,
        r * Math.cos((k / n) * Math.PI * 2),
        r * Math.sin((k / n) * Math.PI * 2),
      ]);
  for (let j = 0; j < profile.length; j++)
    for (let k = 0; k < n; k++) {
      const next = (j + 1) % profile.length,
        a = j * n + k,
        b = j * n + ((k + 1) % n),
        c = next * n + ((k + 1) % n),
        d = next * n + k;
      quads.push([a, b, c, d]);
    }
  return { name: "Casing", vertices, quads };
}
export function build(s) {
  if (!s.blocks.length) throw Error("Add at least one tread block");
  if (s.blocks.length > 32) throw Error("Maximum 32 blocks per tile");
  const cost =
    s.repeat *
    (296 +
      s.blocks.reduce((sum, b) => {
        const h = b.grid.length - 1,
          w = b.grid[0].length - 1;
        return sum + 2 * w * h + 8 * (w + h);
      }, 0));
  if (cost > 150000)
    throw Error(
      "Mesh budget exceeded (150,000 quads). Reduce repeats, patches or grid density.",
    );
  const { pitch } = dimensions(s),
    meshes = [casingMesh(s)];
  for (let r = 0; r < s.repeat; r++)
    for (let b = 0; b < s.blocks.length; b++)
      meshes.push({
        ...blockMesh(s.blocks[b].grid, s, r * pitch),
        name: `Tread_${b + 1}_${r + 1}`,
      });
  return meshes;
}
export function audit(mesh) {
  const edges = new Map();
  let degenerate = 0,
    nonQuad = 0,
    volume = 0;
  const valence = Array(mesh.vertices.length).fill(0);
  for (const q of mesh.quads) {
    if (q.length !== 4) nonQuad++;
    if (new Set(q).size !== 4) degenerate++;
    const a = mesh.vertices[q[0]],
      b = mesh.vertices[q[1]],
      c = mesh.vertices[q[2]],
      d = mesh.vertices[q[3]];
    for (const [p, q, r] of [
      [a, b, c],
      [a, c, d],
    ])
      volume +=
        (p[0] * (q[1] * r[2] - q[2] * r[1]) +
          p[1] * (q[2] * r[0] - q[0] * r[2]) +
          p[2] * (q[0] * r[1] - q[1] * r[0])) /
        6;
    const area = (p, q, r) =>
      Math.hypot(
        ...[0, 1, 2].map(
          (k) =>
            (q[(k + 1) % 3] - p[(k + 1) % 3]) *
              (r[(k + 2) % 3] - p[(k + 2) % 3]) -
            (q[(k + 2) % 3] - p[(k + 2) % 3]) *
              (r[(k + 1) % 3] - p[(k + 1) % 3]),
        ),
      );
    if (area(a, b, c) < 1e-7 || area(a, c, d) < 1e-7) degenerate++;
    for (let k = 0; k < 4; k++) {
      valence[q[k]]++;
      const a = q[k],
        b = q[(k + 1) % 4],
        key = a < b ? `${a},${b}` : `${b},${a}`;
      const e = edges.get(key) || [0, 0];
      e[0]++;
      e[1] += a < b ? 1 : -1;
      edges.set(key, e);
    }
  }
  return {
    volume,
    vertices: mesh.vertices.length,
    quads: mesh.quads.length,
    nonQuad,
    degenerate,
    openEdges: [...edges.values()].filter((e) => e[0] === 1).length,
    nonmanifold: [...edges.values()].filter((e) => e[0] > 2).length,
    windingErrors: [...edges.values()].filter((e) => e[1] !== 0).length,
    maxValence: Math.max(...valence),
  };
}
export function obj(meshes) {
  let offset = 1;
  const out = [
    "# Frontier quad tyre editor — millimetres; separate closed casing and tread solids",
  ];
  for (const m of meshes) {
    out.push(
      `o ${m.name}`,
      ...m.vertices.map((p) => "v " + p.map((v) => v.toFixed(6)).join(" ")),
      ...m.quads.map((q) => "f " + q.map((i) => i + offset).join(" ")),
    );
    offset += m.vertices.length;
  }
  return out.join("\n");
}
export function preset(name = "Trail") {
  const s = {
      version: 1,
      width: 285,
      aspect: 70,
      rim: 17,
      repeat: 32,
      depth: 14,
      crown: 3,
      bevel: 0.09,
      blocks: [],
    },
    p = dimensions(s).pitch;
  const add = (name, g) => s.blocks.push({ name, grid: g });
  if (name === "Chevron") {
    for (const side of [-1, 1]) {
      let g = rectangle(side * 64, p * 0.5, 92, p * 0.55, side * 14);
      add("Chevron", g);
    }
  } else if (name === "Touring") {
    s.depth = 8;
    s.repeat = 40;
    const p = dimensions(s).pitch;
    for (let i = 0; i < 5; i++)
      add(
        "Rib " + (i + 1),
        rectangle((i - 2) * 48, p * 0.5, 39, p * 0.75, i % 2 ? 5 : -5),
      );
  } else {
    const lug = (x, y, w, h, lean, notch) =>
      rectangle(x, y, w, h, lean).map((row, j) => {
        const centre = (row[0][0] + row.at(-1)[0]) / 2,
          factor = j === 2 ? notch : 1;
        return row.map(([px, py]) => [centre + (px - centre) * factor, py]);
      });
    add("Left shoulder", lug(-103, p * 0.33, 42, p * 0.6, 5, 0.84));
    add("Left centre", lug(-36, p * 0.57, 50, p * 0.54, -7, 0.88));
    add("Right centre", lug(32, p * 0.36, 50, p * 0.54, 7, 0.88));
    add("Right shoulder", lug(103, p * 0.66, 42, p * 0.59, -5, 0.84));
  }
  return s;
}
export function readRecipe(input) {
  const s = clone(input);
  if (s.version !== 1) throw Error("Unsupported recipe version");
  for (const [key, min, max] of [
    ["width", 150, 400],
    ["aspect", 30, 85],
    ["rim", 12, 24],
    ["repeat", 12, 64],
    ["depth", 3, 25],
    ["crown", 0, 8],
    ["bevel", 0.02, 0.2],
  ])
    if (!Number.isFinite(s[key]) || s[key] < min || s[key] > max)
      throw Error(`Invalid ${key}`);
  if (
    !Number.isInteger(s.repeat) ||
    !Array.isArray(s.blocks) ||
    s.blocks.length < 1 ||
    s.blocks.length > 32 ||
    s.blocks.some((b) => typeof b.name !== "string" || !validateGrid(b.grid))
  )
    throw Error("Invalid tread patches");
  return s;
}

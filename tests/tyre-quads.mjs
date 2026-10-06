import assert from "node:assert/strict";
import {
  clone,
  grid,
  rectangle,
  validateGrid,
  transform,
  refine,
  blockMesh,
  preset,
  build,
  audit,
  obj,
  readRecipe,
} from "../tyre/QuadMesh.js";
function verify(m) {
  const r = audit(m);
  for (const k of [
    "nonQuad",
    "degenerate",
    "openEdges",
    "nonmanifold",
    "windingErrors",
  ])
    assert.equal(r[k], 0, `${m.name}: ${k}`);
  assert(r.volume > 0);
  assert(r.maxValence <= 4);
  assert(m.vertices.every((p) => p.every(Number.isFinite)));
  return r;
}
for (const name of ["Trail", "Chevron", "Touring"]) {
  const s = preset(name),
    meshes = build(s);
  meshes.forEach(verify);
  assert.deepEqual(readRecipe(JSON.parse(JSON.stringify(s))), s);
  const text = obj(meshes),
    faces = text.split("\n").filter((l) => l.startsWith("f "));
  assert.equal(
    faces.length,
    meshes.reduce((n, m) => n + m.quads.length, 0),
  );
  assert(faces.every((l) => l.trim().split(/\s+/).length === 5));
  console.log(
    name,
    meshes.length,
    "closed solids;",
    faces.length,
    "quad faces",
  );
}
const s = preset(),
  g = rectangle(0, 20, 50, 40, 7);
assert(validateGrid(g));
for (const candidate of [
  g,
  transform(g, { mirror: true }),
  transform(g, { angle: 35, scale: 0.8, dx: 20 }),
  refine(g, "columns"),
  refine(g, "rows"),
]) {
  assert(validateGrid(candidate));
  verify(blockMesh(candidate, s));
}
const folded = clone(g);
folded[1][1] = [500, 100];
assert(!validateGrid(folded));
assert.throws(() => blockMesh(folded, s));
assert(
  !validateGrid(
    grid([
      [0, 0],
      [20, 20],
      [0, 20],
      [20, 0],
    ]),
  ),
);
// Mild concavity remains a valid patch, with actual closed quad walls.
const notch = clone(g);
notch[2][0][0] += 3;
assert(validateGrid(notch));
verify(blockMesh(notch, s));
const mirrored = transform(g, { mirror: true }, [0, 0]);
assert.deepEqual(transform(mirrored, { mirror: true }, [0, 0]), g);
// Representative smooth deformation retains faces, adjacency and positive volumes.
const m = blockMesh(g, s),
  deformed = {
    ...m,
    vertices: m.vertices.map(([x, y, z]) => [x + 0.00005 * z * z, y * 0.98, z]),
  };
verify(deformed);
assert.strictEqual(deformed.quads, m.quads);
const invalid = preset();
invalid.repeat = 200;
assert.throws(() => readRecipe(invalid));
const oversized = preset();
oversized.repeat = 64;
oversized.blocks = Array.from({ length: 32 }, () => ({
  name: "Dense",
  grid: grid(
    [
      [-20, 0],
      [20, 0],
      [20, 40],
      [-20, 40],
    ],
    32,
    32,
  ),
}));
assert.throws(() => build(oversized), /budget/);
console.log(
  "PASS: indexed closed all-quad solids, outward volume, valence ≤4, custom/concave/refined/mirrored patches, deformation, OBJ and rejected invalid grids.",
);

import { Vector3 } from 'three';
import { SimplexNoise } from 'three/addons/math/SimplexNoise.js';
import { between, createRandom, deriveSeed } from './random.js';
import { normalizeSettings } from './presets.js';

const EPSILON = 1e-7;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const vector = (x, y, z) => new Vector3(x, y, z);

// Polygon winding is outward. The convex solid is subsequently cut by half-spaces.
function unitBox() {
  return [
    { normal: vector(-1, 0, 0), vertices: [vector(-1,-1,-1), vector(-1,-1,1), vector(-1,1,1), vector(-1,1,-1)] },
    { normal: vector(1, 0, 0), vertices: [vector(1,-1,1), vector(1,-1,-1), vector(1,1,-1), vector(1,1,1)] },
    { normal: vector(0, -1, 0), vertices: [vector(-1,-1,1), vector(-1,-1,-1), vector(1,-1,-1), vector(1,-1,1)] },
    { normal: vector(0, 1, 0), vertices: [vector(-1,1,-1), vector(-1,1,1), vector(1,1,1), vector(1,1,-1)] },
    { normal: vector(0, 0, -1), vertices: [vector(1,-1,-1), vector(-1,-1,-1), vector(-1,1,-1), vector(1,1,-1)] },
    { normal: vector(0, 0, 1), vertices: [vector(-1,-1,1), vector(1,-1,1), vector(1,1,1), vector(-1,1,1)] },
  ];
}

function cleanPolygon(vertices) {
  const result = [];
  for (const vertex of vertices) {
    if (!result.length || vertex.distanceToSquared(result[result.length - 1]) > 1e-14) result.push(vertex);
  }
  if (result.length > 1 && result[0].distanceToSquared(result[result.length - 1]) < 1e-14) result.pop();
  return result;
}

/** Clip a convex polyhedron to n·p <= distance, capping the newly exposed cut. */
function clipSolid(faces, normal, distance, kind = 'joint') {
  const clipped = [];
  const intersections = [];
  let anyInside = false;
  let anyOutside = false;

  for (const face of faces) {
    const polygon = [];
    for (let i = 0; i < face.vertices.length; i++) {
      const a = face.vertices[i];
      const b = face.vertices[(i + 1) % face.vertices.length];
      const da = normal.dot(a) - distance;
      const db = normal.dot(b) - distance;
      const insideA = da <= EPSILON;
      const insideB = db <= EPSILON;
      if (insideA) {
        polygon.push(a);
        anyInside = true;
      } else {
        anyOutside = true;
      }
      if (insideA !== insideB) {
        const point = a.clone().lerp(b, da / (da - db));
        polygon.push(point);
        intersections.push(point);
      }
    }
    const clean = cleanPolygon(polygon);
    if (clean.length >= 3) clipped.push({ ...face, vertices: clean });
  }

  if (!anyInside) return [];
  if (!anyOutside) return faces;

  const unique = [];
  for (const point of intersections) {
    if (!unique.some((other) => other.distanceToSquared(point) < 1e-12)) unique.push(point);
  }
  if (unique.length >= 3) {
    const center = unique.reduce((sum, point) => sum.add(point), vector(0, 0, 0)).multiplyScalar(1 / unique.length);
    const reference = Math.abs(normal.y) < 0.85 ? vector(0, 1, 0) : vector(1, 0, 0);
    const u = reference.clone().cross(normal).normalize();
    const v = normal.clone().cross(u).normalize();
    unique.sort((a, b) => {
      const aRelative = a.clone().sub(center);
      const bRelative = b.clone().sub(center);
      return Math.atan2(aRelative.dot(v), aRelative.dot(u)) - Math.atan2(bRelative.dot(v), bRelative.dot(u));
    });
    clipped.push({ normal: normal.clone(), vertices: unique, kind });
  }
  return clipped;
}

function randomDirection(random) {
  const y = between(random, -1, 1);
  const angle = random() * Math.PI * 2;
  const radius = Math.sqrt(Math.max(0, 1 - y * y));
  return vector(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
}

/** Build an irregular parent volume from individually sampled geological cutting planes. */
function makeParent(random) {
  let faces = unitBox();
  const count = 15 + Math.floor(random() * 8);
  const rotation = random() * Math.PI * 2;
  const offset = between(random, -0.08, 0.08);
  for (let i = 0; i < count; i++) {
    // A jittered spherical distribution avoids a regular, crystalline silhouette.
    const y = clamp(1 - 2 * (i + 0.5) / count + between(random, -0.13, 0.13), -0.98, 0.98);
    const angle = i * 2.399963 + rotation + between(random, -0.24, 0.24);
    const radius = Math.sqrt(1 - y * y);
    const normal = vector(Math.cos(angle) * radius, y, Math.sin(angle) * radius).normalize();
    faces = clipSolid(faces, normal, between(random, 0.83, 1.17) + offset, 'outer');
  }
  return faces;
}

function isInside(point, faces) {
  return faces.every((face) => face.normal.dot(point.clone().sub(face.vertices[0])) <= 1e-5);
}

/** Sites are irregular in 3D; bisectors form real mating fracture planes, not a texture. */
function fractureSites(random, parent, count) {
  const sites = [];
  for (let attempt = 0; attempt < count * 80 && sites.length < count; attempt++) {
    const point = vector(between(random, -0.82, 0.82), between(random, -0.82, 0.82), between(random, -0.82, 0.82));
    if (isInside(point, parent) && sites.every((other) => other.distanceToSquared(point) > 0.075)) sites.push(point);
  }
  if (!sites.length) sites.push(vector(0, 0, 0));
  return sites;
}

function allVertices(faces) {
  return faces.flatMap((face) => face.vertices);
}

function chipCorners(faces, random, weathering) {
  const count = weathering > 0 ? 1 + Math.floor(weathering * 4 + random() * 2) : 0;
  for (let i = 0; i < count && faces.length; i++) {
    const normal = randomDirection(random);
    let low = Infinity;
    let high = -Infinity;
    for (const point of allVertices(faces)) {
      const projection = normal.dot(point);
      low = Math.min(low, projection);
      high = Math.max(high, projection);
    }
    // Remove irregular corners, rather than painting on simulated chips.
    const depth = (high - low) * between(random, 0.025, 0.095) * (0.35 + weathering);
    faces = clipSolid(faces, normal, high - depth, 'chip');
  }
  return faces;
}

function makeLayout(settings, random) {
  const bodies = [];
  const { kind, width, height } = settings;
  let span;
  let depth;

  if (kind === 'cliff') {
    span = 7.2 * width;
    depth = 3.3 * width;
    const count = 4 + Math.floor(random() * 2);
    for (let i = 0; i < count; i++) {
      const x = ((i + 0.5) / count - 0.5) * span + between(random, -0.15, 0.15) * width;
      const sy = 2.55 * height * between(random, 0.77, 1.13);
      bodies.push({
        center: vector(x, sy * between(random, 0.74, 0.85), between(random, -0.35, 0.3) * width),
        scale: vector(span / count * between(random, 0.72, 0.96), sy, depth * between(random, 0.37, 0.49)),
        rotation: between(random, -0.24, 0.24),
        fractured: true,
      });
    }
    // Projecting foothills break the straight edge of the wall.
    for (let i = 0; i < 2; i++) {
      const sy = height * between(random, 0.65, 1.1);
      bodies.push({
        center: vector(between(random, -span * 0.3, span * 0.3), sy * 0.72, depth * between(random, 0.22, 0.35)),
        scale: vector(width * between(random, 0.85, 1.3), sy, width * between(random, 0.62, 1.05)),
        rotation: between(random, -0.8, 0.8), fractured: true,
      });
    }
  } else if (kind === 'boulder') {
    span = 4.0 * width;
    depth = 3.1 * width;
    const sy = 1.48 * height;
    bodies.push({
      center: vector(0, sy * 0.76, 0),
      scale: vector(1.9 * width, sy, 1.45 * width),
      rotation: between(random, -0.5, 0.5), fractured: true,
    });
    const satelliteHeight = 0.68 * height;
    bodies.push({
      center: vector(between(random, -1.25, 1.25) * width, satelliteHeight * 0.7, between(random, 0.55, 0.9) * width),
      scale: vector(0.8 * width, satelliteHeight, 0.64 * width),
      rotation: between(random, -0.9, 0.9), fractured: true, small: true,
    });
  } else {
    span = 5.8 * width;
    depth = 3.8 * width;
    const count = 4 + Math.floor(random() * 2);
    const startAngle = random() * Math.PI * 2;
    for (let i = 0; i < count; i++) {
      const angle = startAngle + (i / count) * Math.PI * 2 + between(random, -0.28, 0.28);
      const radius = i === 0 ? 0.18 : between(random, 0.52, 1.0);
      const sy = height * between(random, 1.0, 1.58);
      bodies.push({
        center: vector(Math.cos(angle) * radius * span * 0.22, sy * between(random, 0.7, 0.82), Math.sin(angle) * radius * depth * 0.22),
        scale: vector(width * between(random, 1.18, 1.7), sy, width * between(random, 0.92, 1.42)),
        rotation: between(random, -Math.PI, Math.PI), fractured: true,
      });
    }
  }

  // A small talus apron grounds the formation. Every stone is independently cut.
  const debrisCount = kind === 'boulder' ? 4 : 7 + Math.floor(random() * 4);
  for (let i = 0; i < debrisCount; i++) {
    const angle = between(random, -Math.PI * 0.12, Math.PI * 1.12);
    const distance = between(random, 0.36, 0.6);
    const size = between(random, 0.14, 0.38) * width;
    const sy = size * between(random, 0.5, 1.15) * Math.sqrt(height);
    bodies.push({
      center: vector(Math.cos(angle) * span * distance, sy * 0.67, Math.sin(angle) * depth * distance),
      scale: vector(size * between(random, 0.8, 1.5), sy, size * between(random, 0.75, 1.25)),
      rotation: between(random, -Math.PI, Math.PI), fractured: false, small: true,
    });
  }
  return bodies;
}

function toWorld(point, body) {
  const x = point.x * body.scale.x;
  const z = point.z * body.scale.z;
  const cos = Math.cos(body.rotation);
  const sin = Math.sin(body.rotation);
  return vector(body.center.x + x * cos + z * sin, body.center.y + point.y * body.scale.y, body.center.z - x * sin + z * cos);
}

function normalToWorld(normal, body) {
  const x = normal.x / body.scale.x;
  const z = normal.z / body.scale.z;
  const cos = Math.cos(body.rotation);
  const sin = Math.sin(body.rotation);
  return vector(x * cos + z * sin, normal.y / body.scale.y, -x * sin + z * cos).normalize();
}

function distanceToEdges(point, vertices) {
  let nearest = Infinity;
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i];
    const b = vertices[(i + 1) % vertices.length];
    const edge = b.clone().sub(a);
    const t = clamp(point.clone().sub(a).dot(edge) / Math.max(edge.lengthSq(), EPSILON), 0, 1);
    nearest = Math.min(nearest, point.distanceTo(a.clone().addScaledVector(edge, t)));
  }
  return nearest;
}

function pushFace(face, body, cellCenter, settings, random, noise, buffers, subdivisions) {
  const vertices = face.vertices;
  const centroid = vertices.reduce((sum, p) => sum.add(p), vector(0, 0, 0)).multiplyScalar(1 / vertices.length);
  const normal = normalToWorld(face.normal, body);
  const worldCellCenter = toWorld(cellCenter, body);
  const reference = Math.abs(normal.y) < 0.9 ? vector(0, 1, 0) : vector(1, 0, 0);
  const tangent = reference.clone().cross(normal).normalize();
  const bitangent = normal.clone().cross(tangent).normalize();
  const map = new Map();
  const faceTint = between(random, -0.045, 0.045) + (face.kind === 'joint' ? -0.035 : 0);
  const minScale = Math.min(body.scale.x, body.scale.y, body.scale.z);
  const weather = settings.weathering / 100;
  const detail = settings.detail / 100;
  const pits = [];
  const scars = [];
  if (face.kind !== 'ground' && !body.small && weather > 0) {
    // Localised spalls and short, crooked fracture scars give exposed faces
    // their own history. These are depressions in the mesh, not painted bands.
    const pitCount = 1 + Math.floor(random() * (1 + weather * 4));
    for (let i = 0; i < pitCount; i++) {
      const edgeVertex = vertices[Math.floor(random() * vertices.length)];
      pits.push({
        center: toWorld(centroid.clone().lerp(edgeVertex, between(random, 0.03, 0.9)), body),
        radius: minScale * between(random, 0.1, 0.32),
        depth: minScale * between(random, 0.025, 0.085) * (0.25 + weather * 0.9),
        stretch: between(random, 0.55, 1.4),
      });
    }
    const scarCount = 1 + Math.floor(random() * (1 + weather * 2));
    for (let i = 0; i < scarCount; i++) {
      const edgeVertex = vertices[Math.floor(random() * vertices.length)];
      const angle = random() * Math.PI * 2;
      scars.push({
        center: toWorld(centroid.clone().lerp(edgeVertex, between(random, 0.1, 0.8)), body),
        along: tangent.clone().multiplyScalar(Math.cos(angle)).addScaledVector(bitangent, Math.sin(angle)),
        across: tangent.clone().multiplyScalar(-Math.sin(angle)).addScaledVector(bitangent, Math.cos(angle)),
        length: minScale * between(random, 0.18, 0.55),
        width: minScale * between(random, 0.025, 0.075),
        depth: minScale * between(random, 0.025, 0.075) * (0.2 + weather),
      });
    }
  }

  function addVertex(point) {
    const key = `${Math.round(point.x * 1e6)},${Math.round(point.y * 1e6)},${Math.round(point.z * 1e6)}`;
    const existing = map.get(key);
    if (existing !== undefined) return existing;

    let position = toWorld(point, body);
    const distance = distanceToEdges(point, vertices);
    const edgeFactor = clamp(distance / 0.13, 0, 1);
    // The same warp is evaluated on both sides of each polygon edge, so joints
    // bend and meander without opening the faces of an individual fragment.
    const original = position.clone();
    const warpSize = minScale * (0.022 + detail * 0.035) * (body.small ? 0.6 : 1);
    const frequency = 2.1;
    position.x += noise.noise3d(original.x * frequency + 31, original.y * frequency, original.z * frequency) * warpSize;
    position.y += noise.noise3d(original.x * frequency, original.y * frequency + 17, original.z * frequency) * warpSize;
    position.z += noise.noise3d(original.x * frequency, original.y * frequency, original.z * frequency + 53) * warpSize;

    // Shared edges move toward the fragment's center, forming worn bevels.
    const towardCenter = worldCellCenter.clone().sub(position).normalize();
    const bevel = (1 - edgeFactor) * minScale * (0.004 + 0.022 * weather);
    position.addScaledVector(towardCenter, bevel);
    let erosionShade = 0;
    if (face.kind !== 'ground') {
      const coarse = noise.noise3d(original.x * 1.9, original.y * 1.9, original.z * 1.9);
      const fine = noise.noise3d(original.x * 5.1 + 13.1, original.y * 5.1, original.z * 5.1 - 4.7);
      const ridge = 1 - Math.abs(noise.noise3d(original.x * 3.3 - 6, original.y * 3.3 + 3, original.z * 3.3));
      const relief = minScale * (coarse * 0.085 + fine * 0.035 + (ridge - 0.55) * 0.032) * (0.35 + detail * 0.95) * edgeFactor;
      position.addScaledVector(normal, relief);
      for (const pit of pits) {
        const delta = position.clone().sub(pit.center);
        const u = delta.dot(tangent);
        const v = delta.dot(bitangent) * pit.stretch;
        const amount = Math.max(0, 1 - (u * u + v * v) / (pit.radius * pit.radius));
        const depression = amount * amount * edgeFactor;
        position.addScaledVector(normal, -pit.depth * depression);
        erosionShade += depression * 0.025;
      }
      for (const scar of scars) {
        const delta = position.clone().sub(scar.center);
        const along = delta.dot(scar.along);
        const wobble = noise.noise3d(original.x * 5 + 9, original.y * 5, original.z * 5) * scar.width * 0.4;
        const across = delta.dot(scar.across) + wobble;
        const lengthFade = clamp(1 - Math.abs(along) / scar.length, 0, 1);
        const widthFade = clamp(1 - Math.abs(across) / scar.width, 0, 1);
        const depression = lengthFade * widthFade * edgeFactor;
        position.addScaledVector(normal, -scar.depth * depression);
        erosionShade += depression * 0.055;
      }
    }
    position.y = face.kind === 'ground' || original.y < 1e-6 ? 0 : Math.max(0, position.y);
    const variation = noise.noise3d(position.x * 2.15 + 3, position.y * 2.15 + 19, position.z * 2.15) * 0.085;
    const tint = clamp(0.91 + faceTint + variation - erosionShade + Math.max(0, normal.y) * 0.025, 0.65, 1);
    const index = buffers.positions.length / 3;
    buffers.positions.push(position.x, position.y, position.z);
    buffers.colors.push(tint, tint, tint * 0.99);
    buffers.uvs.push(position.dot(tangent) * 0.8, position.dot(bitangent) * 0.8);
    buffers.edgeKeys.push(distance < 1e-5 && face.kind !== 'ground' ? `${Math.round(position.x * 1e5)},${Math.round(position.y * 1e5)},${Math.round(position.z * 1e5)}` : null);
    map.set(key, index);
    return index;
  }

  // Each polygon is subdivided, retaining its planar fracture boundary while allowing
  // actual relief, erosion pits and worn edges to modify the surface geometry.
  for (let edge = 0; edge < vertices.length; edge++) {
    const a = centroid;
    const b = vertices[edge];
    const c = vertices[(edge + 1) % vertices.length];
    if (b.clone().sub(a).cross(c.clone().sub(a)).lengthSq() < 1e-14) continue;
    const rows = [];
    for (let i = 0; i <= subdivisions; i++) {
      rows[i] = [];
      for (let j = 0; j <= subdivisions - i; j++) {
        const point = a.clone().multiplyScalar(1 - (i + j) / subdivisions)
          .addScaledVector(b, i / subdivisions).addScaledVector(c, j / subdivisions);
        rows[i][j] = addVertex(point);
      }
    }
    for (let i = 0; i < subdivisions; i++) {
      for (let j = 0; j < subdivisions - i; j++) {
        buffers.indices.push(rows[i][j], rows[i + 1][j], rows[i][j + 1]);
        if (j < subdivisions - i - 1) buffers.indices.push(rows[i + 1][j], rows[i + 1][j + 1], rows[i][j + 1]);
      }
    }
  }
}

function calculateNormals(positions, indices, edgeKeys, weathering) {
  const normals = new Float32Array(positions.length);
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i] * 3;
    const b = indices[i + 1] * 3;
    const c = indices[i + 2] * 3;
    const abx = positions[b] - positions[a], aby = positions[b + 1] - positions[a + 1], abz = positions[b + 2] - positions[a + 2];
    const acx = positions[c] - positions[a], acy = positions[c + 1] - positions[a + 1], acz = positions[c + 2] - positions[a + 2];
    const nx = aby * acz - abz * acy, ny = abz * acx - abx * acz, nz = abx * acy - aby * acx;
    for (const offset of [a, b, c]) {
      normals[offset] += nx;
      normals[offset + 1] += ny;
      normals[offset + 2] += nz;
    }
  }
  for (let i = 0; i < normals.length; i += 3) {
    const length = Math.hypot(normals[i], normals[i + 1], normals[i + 2]) || 1;
    normals[i] /= length;
    normals[i + 1] /= length;
    normals[i + 2] /= length;
  }
  // Blend the normals of coincident face edges, while retaining the large
  // planar breaks. More weathered rock has a softer, more abraded edge.
  const edges = new Map();
  for (let i = 0; i < edgeKeys.length; i++) {
    const key = edgeKeys[i];
    if (!key) continue;
    if (!edges.has(key)) edges.set(key, []);
    edges.get(key).push(i);
  }
  const blend = 0.2 + weathering * 0.4;
  for (const members of edges.values()) {
    if (members.length < 2) continue;
    let x = 0, y = 0, z = 0;
    for (const index of members) {
      x += normals[index * 3]; y += normals[index * 3 + 1]; z += normals[index * 3 + 2];
    }
    const magnitude = Math.hypot(x, y, z) || 1;
    x /= magnitude; y /= magnitude; z /= magnitude;
    for (const index of members) {
      const offset = index * 3;
      const nx = normals[offset] * (1 - blend) + x * blend;
      const ny = normals[offset + 1] * (1 - blend) + y * blend;
      const nz = normals[offset + 2] * (1 - blend) + z * blend;
      const length = Math.hypot(nx, ny, nz) || 1;
      normals[offset] = nx / length; normals[offset + 1] = ny / length; normals[offset + 2] = nz / length;
    }
  }
  return normals;
}

/** Explicit tangents keep the exported normal map's tangent space portable. */
function calculateTangents(positions, normals, uvs, indices) {
  const tangentU = new Float32Array(positions.length);
  const tangentV = new Float32Array(positions.length);
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i], b = indices[i + 1], c = indices[i + 2];
    const ap = a * 3, bp = b * 3, cp = c * 3;
    const edge1x = positions[bp] - positions[ap], edge1y = positions[bp + 1] - positions[ap + 1], edge1z = positions[bp + 2] - positions[ap + 2];
    const edge2x = positions[cp] - positions[ap], edge2y = positions[cp + 1] - positions[ap + 1], edge2z = positions[cp + 2] - positions[ap + 2];
    const du1 = uvs[b * 2] - uvs[a * 2], dv1 = uvs[b * 2 + 1] - uvs[a * 2 + 1];
    const du2 = uvs[c * 2] - uvs[a * 2], dv2 = uvs[c * 2 + 1] - uvs[a * 2 + 1];
    const determinant = du1 * dv2 - du2 * dv1;
    if (Math.abs(determinant) < 1e-12) continue;
    const inverse = 1 / determinant;
    const ux = (edge1x * dv2 - edge2x * dv1) * inverse;
    const uy = (edge1y * dv2 - edge2y * dv1) * inverse;
    const uz = (edge1z * dv2 - edge2z * dv1) * inverse;
    const vx = (edge2x * du1 - edge1x * du2) * inverse;
    const vy = (edge2y * du1 - edge1y * du2) * inverse;
    const vz = (edge2z * du1 - edge1z * du2) * inverse;
    for (const offset of [ap, bp, cp]) {
      tangentU[offset] += ux; tangentU[offset + 1] += uy; tangentU[offset + 2] += uz;
      tangentV[offset] += vx; tangentV[offset + 1] += vy; tangentV[offset + 2] += vz;
    }
  }
  const tangents = new Float32Array((positions.length / 3) * 4);
  for (let vertex = 0; vertex < positions.length / 3; vertex++) {
    const p = vertex * 3, t = vertex * 4;
    const nx = normals[p], ny = normals[p + 1], nz = normals[p + 2];
    const projection = nx * tangentU[p] + ny * tangentU[p + 1] + nz * tangentU[p + 2];
    let x = tangentU[p] - nx * projection, y = tangentU[p + 1] - ny * projection, z = tangentU[p + 2] - nz * projection;
    let length = Math.hypot(x, y, z);
    if (length < 1e-8) {
      // Degenerate UV triangles still need a finite tangent perpendicular to N.
      if (Math.abs(ny) < 0.9) { x = nz; y = 0; z = -nx; }
      else { x = 0; y = -nz; z = ny; }
      length = Math.hypot(x, y, z) || 1;
    }
    x /= length; y /= length; z /= length;
    const crossX = ny * z - nz * y, crossY = nz * x - nx * z, crossZ = nx * y - ny * x;
    const handedness = crossX * tangentV[p] + crossY * tangentV[p + 1] + crossZ * tangentV[p + 2] < 0 ? -1 : 1;
    tangents[t] = x; tangents[t + 1] = y; tangents[t + 2] = z; tangents[t + 3] = handedness;
  }
  return tangents;
}

/** Build the same mesh incrementally, so a main-thread fallback can yield. */
function* generateRockSteps(input) {
  const settings = normalizeSettings(input);
  const random = createRandom(settings.seed);
  const noise = new SimplexNoise({ random: createRandom(settings.seed ^ 0x9e3779b9) });
  const buffers = { positions: [], colors: [], uvs: [], indices: [], edgeKeys: [] };
  const bodies = makeLayout(settings, random);
  let fragments = 0;
  const subdivisions = 5 + Math.round(settings.detail / 25); // 5–9 per polygon triangle
  const kindId = { outcrop: 1, cliff: 2, boulder: 3 }[settings.kind];

  for (let bodyIndex = 0; bodyIndex < bodies.length; bodyIndex++) {
    const body = bodies[bodyIndex];
    const parent = makeParent(createRandom(deriveSeed(settings.seed, kindId, bodyIndex, 1)));
    const cellCount = body.fractured ? (body.small ? 1 + Math.round(settings.fracture / 30) : 1 + Math.round(settings.fracture / 6.5)) : 1;
    const sites = fractureSites(createRandom(deriveSeed(settings.seed, kindId, bodyIndex, 2)), parent, cellCount);
    for (let i = 0; i < sites.length; i++) {
      let faces = parent;
      for (let j = 0; j < sites.length && faces.length; j++) {
        if (i === j) continue;
        const normal = sites[j].clone().sub(sites[i]);
        // An anisotropic distance metric biases joint planes toward vertical
        // without imposing repeated layers or selecting a prebuilt shape.
        normal.y *= 1 - settings.joints / 100 * 0.8;
        normal.normalize();
        const midpoint = sites[i].clone().add(sites[j]).multiplyScalar(0.5);
        const gap = 0.0015 + settings.fracture / 100 * 0.005;
        faces = clipSolid(faces, normal, normal.dot(midpoint) - gap, 'joint');
      }
      if (!faces.length) continue;
      faces = chipCorners(faces, createRandom(deriveSeed(settings.seed, kindId, bodyIndex, i, 3)), settings.weathering / 100);
      // Slice submerged geometry at the ground plane so the exported asset has a usable base.
      faces = clipSolid(faces, vector(0, -1, 0), body.center.y / body.scale.y, 'ground');
      if (faces.length < 4) continue;
      const points = allVertices(faces);
      const center = points.reduce((sum, point) => sum.add(point), vector(0, 0, 0)).multiplyScalar(1 / points.length);
      const before = buffers.indices.length;
      for (let faceIndex = 0; faceIndex < faces.length; faceIndex++) {
        const faceRandom = createRandom(deriveSeed(settings.seed, kindId, bodyIndex, i, faceIndex, 4));
        pushFace(faces[faceIndex], body, center, settings, faceRandom, noise, buffers, body.small ? Math.max(4, subdivisions - 2) : subdivisions);
        yield;
      }
      if (buffers.indices.length > before) fragments++;
    }
  }

  const positions = new Float32Array(buffers.positions);
  const indices = new Uint32Array(buffers.indices);
  const normals = calculateNormals(positions, indices, buffers.edgeKeys, settings.weathering / 100);
  const uvs = new Float32Array(buffers.uvs);
  const tangents = calculateTangents(positions, normals, uvs, indices);
  const bounds = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
  for (let i = 0; i < positions.length; i += 3) {
    for (let axis = 0; axis < 3; axis++) {
      bounds.min[axis] = Math.min(bounds.min[axis], positions[i + axis]);
      bounds.max[axis] = Math.max(bounds.max[axis], positions[i + axis]);
    }
  }
  return {
    positions,
    normals,
    tangents,
    colors: new Float32Array(buffers.colors),
    uvs,
    indices,
    stats: {
      fragments,
      vertices: positions.length / 3,
      triangles: indices.length / 3,
      dimensions: bounds.max.map((value, axis) => value - bounds.min[axis]),
      bounds,
    },
    settings,
  };
}

/**
 * Generate a reproducible, exportable rock mesh in meters (Y-up, base at Y=0).
 * The macro silhouette is constructed from random clipped volumes; Voronoi
 * fracture cells, corner chips and surface erosion are all actual geometry.
 */
export function generateRock(input) {
  const steps = generateRockSteps(input);
  let step = steps.next();
  while (!step.done) step = steps.next();
  return step.value;
}

/**
 * Compatibility path for browsers where module workers are blocked or fail to
 * load. It uses the exact same geometry as the worker, but yields between faces
 * to keep the interface responsive and allow a superseded job to be cancelled.
 */
export async function generateRockAsync(input, {
  signal,
  budgetMs = 12,
  yieldControl = () => new Promise((resolve) => setTimeout(resolve, 0)),
} = {}) {
  const steps = generateRockSteps(input);
  const now = () => globalThis.performance?.now?.() ?? Date.now();
  let lastYield = now();
  try {
    while (true) {
      if (signal?.aborted) {
        const error = new Error('Generation was cancelled.');
        error.name = 'AbortError';
        throw error;
      }
      const step = steps.next();
      if (step.done) return step.value;
      if (now() - lastYield >= budgetMs) {
        await yieldControl();
        lastYield = now();
      }
    }
  } finally {
    if (signal?.aborted) steps.return();
  }
}

// Geometry generator for 3D Colliders (Spheres, Boxes, Cylinders)

export function createSphereGeometry(radius = 1.0, segments = 24, rings = 16) {
  const positions = [];
  const normals = [];
  const indices = [];

  for (let ring = 0; ring <= rings; ++ring) {
    const theta = (ring * Math.PI) / rings;
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);

    for (let seg = 0; seg <= segments; ++seg) {
      const phi = (seg * 2 * Math.PI) / segments;
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);

      const x = cosPhi * sinTheta;
      const y = cosTheta;
      const z = sinPhi * sinTheta;

      positions.push(x * radius, y * radius, z * radius);
      normals.push(x, y, z);
    }
  }

  for (let ring = 0; ring < rings; ++ring) {
    for (let seg = 0; seg < segments; ++seg) {
      const first = ring * (segments + 1) + seg;
      const second = first + segments + 1;

      indices.push(first, second, first + 1);
      indices.push(second, second + 1, first + 1);
    }
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    indices: new Uint16Array(indices),
  };
}

export function createBoxGeometry() {
  // 24 vertices for 6 faces
  const p = [
    // Front
    -1, -1,  1,   1, -1,  1,   1,  1,  1,  -1,  1,  1,
    // Back
    -1, -1, -1,  -1,  1, -1,   1,  1, -1,   1, -1, -1,
    // Top
    -1,  1, -1,  -1,  1,  1,   1,  1,  1,   1,  1, -1,
    // Bottom
    -1, -1, -1,   1, -1, -1,   1, -1,  1,  -1, -1,  1,
    // Right
     1, -1, -1,   1,  1, -1,   1,  1,  1,   1, -1,  1,
    // Left
    -1, -1, -1,  -1, -1,  1,  -1,  1,  1,  -1,  1, -1
  ];

  const n = [
    // Front
    0, 0, 1,  0, 0, 1,  0, 0, 1,  0, 0, 1,
    // Back
    0, 0, -1,  0, 0, -1,  0, 0, -1,  0, 0, -1,
    // Top
    0, 1, 0,  0, 1, 0,  0, 1, 0,  0, 1, 0,
    // Bottom
    0, -1, 0,  0, -1, 0,  0, -1, 0,  0, -1, 0,
    // Right
    1, 0, 0,  1, 0, 0,  1, 0, 0,  1, 0, 0,
    // Left
    -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0
  ];

  const ind = [];
  for (let i = 0; i < 6; i++) {
    const base = i * 4;
    ind.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }

  return {
    positions: new Float32Array(p),
    normals: new Float32Array(n),
    indices: new Uint16Array(ind)
  };
}

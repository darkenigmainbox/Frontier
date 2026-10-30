import { generateRockFormation } from '../geology/generator.js';

/**
 * Bakes a small library of low-poly volumetric SDF boulders for the GPU erosion terrain scatter.
 * Each variant is a real dual-contoured rock (crisp facets, baked AO/cavity), just decimated.
 */
function bakeScatterBoulders(specs) {
  return specs.map((spec) => {
    const res = generateRockFormation({
      archetype: spec.archetype,
      seed: spec.seed,
      quality: 'fast',
      scale: spec.scale ?? 6.0,
      decimation: spec.decimation ?? 0.055,
    });
    const m = res.mesh;
    return {
      archetype: spec.archetype,
      positions: m.positions,
      normals: m.normals,
      colors: m.colors,
      indices: m.indices,
      triangles: res.stats.triangles,
      dimensions: res.stats.dimensions,
    };
  });
}

self.onmessage = (event) => {
  const { id, params, boulders } = event.data;

  if (boulders) {
    try {
      const meshes = bakeScatterBoulders(boulders);
      const transfer = [];
      for (const m of meshes) {
        transfer.push(m.positions.buffer, m.normals.buffer, m.colors.buffer, m.indices.buffer);
      }
      self.postMessage({ type: 'boulders', id, meshes }, transfer);
    } catch (err) {
      self.postMessage({ type: 'error', id, message: err?.message || String(err) });
    }
    return;
  }

  try {
    const result = generateRockFormation(params, (progress, stage) => {
      self.postMessage({ type: 'progress', id, progress, stage });
    });

    const { mesh, stats, lithology } = result;
    const transferList = [
      mesh.positions.buffer,
      mesh.normals.buffer,
      mesh.uvs.buffer,
      mesh.colors.buffer,
      mesh.indices.buffer,
    ];
    if (mesh.albedos) transferList.push(mesh.albedos.buffer);

    self.postMessage(
      {
        type: 'done',
        id,
        params: result.params,
        lithology,
        stats,
        mesh: {
          positions: mesh.positions,
          normals: mesh.normals,
          uvs: mesh.uvs,
          colors: mesh.colors,
          albedos: mesh.albedos || null,
          hasCustomAlbedo: !!mesh.hasCustomAlbedo,
          indices: mesh.indices,
        },
      },
      transferList
    );
  } catch (err) {
    self.postMessage({
      type: 'error',
      id,
      message: err?.message || String(err),
    });
  }
};

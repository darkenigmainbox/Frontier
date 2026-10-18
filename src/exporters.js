// Frontier exporters — project JSON + game-ready OBJ (true quad faces).
import { buildWorld } from './world.js';

export function download(filename, text) {
  const blob = new Blob([text], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

export function exportProjectJSON(project) {
  download(`${(project.name || 'frontier').replace(/[^\w\-]+/g, '_')}.json`, JSON.stringify(project, null, 1));
}

export function importProjectJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const p = JSON.parse(reader.result);
        if (!p.nodes || !p.roads) throw new Error('Not a Frontier project (missing nodes/roads)');
        p.rails = p.rails || []; p.roundabouts = p.roundabouts || [];
        p.rivers = p.rivers || []; p.terrainEdits = p.terrainEdits || [];
        p.buildingsManual = p.buildingsManual || [];
        p.settings = { waterLevel: 1.25, followTerrain: true, autoMerge: true, ...(p.settings || {}) };
        resolve(p);
      } catch (e) { reject(e); }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

const MTL_COLORS = {
  asphalt: [0.23, 0.24, 0.26], junction: [0.23, 0.24, 0.26], marking: [0.9, 0.9, 0.9],
  sidewalk: [0.62, 0.63, 0.65], curb: [0.5, 0.5, 0.52], grassMed: [0.32, 0.52, 0.3],
  bridge: [0.6, 0.6, 0.62], ballast: [0.32, 0.28, 0.25], sleeper: [0.36, 0.28, 0.19],
  steel: [0.78, 0.8, 0.83], beam: [0.66, 0.69, 0.72], pillar: [0.58, 0.59, 0.6],
  terrain: [0.4, 0.5, 0.32], water: [0.2, 0.45, 0.62], building: [0.6, 0.62, 0.66],
  trunk: [0.4, 0.3, 0.2], leaf: [0.28, 0.48, 0.24], wood: [0.42, 0.33, 0.22],
};

export function exportOBJ(project, onProgress) {
  onProgress?.('Building meshes…');
  setTimeout(() => {
    const world = buildWorld(project, { terrainN: 130, roadStep: 2.2 });
    const B = world.buckets;
    let quads = 0, tris = 0;
    const lines = [];
    lines.push('# Frontier road network — game-ready, quad-flow topology');
    lines.push(`# exported ${new Date().toISOString()} · project: ${project.name}`);
    lines.push('mtllib frontier.mtl');
    let offset = 1;
    for (const [name, b] of Object.entries(B)) {
      if (!b.vertCount()) continue;
      lines.push(`\ng ${name}`);
      lines.push(`usemtl ${name}`);
      for (let i = 0; i < b.n; i++) {
        lines.push(`v ${b.pos[i * 3].toFixed(3)} ${b.pos[i * 3 + 1].toFixed(3)} ${b.pos[i * 3 + 2].toFixed(3)} ${b.col[i * 3].toFixed(3)} ${b.col[i * 3 + 1].toFixed(3)} ${b.col[i * 3 + 2].toFixed(3)}`);
      }
      for (let i = 0; i < b.quad.length; i += 4) {
        lines.push(`f ${b.quad[i] + offset} ${b.quad[i + 1] + offset} ${b.quad[i + 2] + offset} ${b.quad[i + 3] + offset}`);
        quads++;
      }
      for (let i = 0; i < b.tri.length; i += 3) {
        lines.push(`f ${b.tri[i] + offset} ${b.tri[i + 1] + offset} ${b.tri[i + 2] + offset}`);
        tris++;
      }
      offset += b.n;
    }
    lines.unshift(`# quads: ${quads} · tris(extra): ${tris} · verts: ${offset - 1}`);
    download('frontier_network.obj', lines.join('\n'));
    const mtl = ['# Frontier materials'];
    for (const [k, c] of Object.entries(MTL_COLORS)) {
      mtl.push(`\nnewmtl ${k}`, `Kd ${c[0]} ${c[1]} ${c[2]}`, 'Ka 0.2 0.2 0.2', 'Ks 0.05 0.05 0.05', 'Ns 10', 'd 1.0', 'illum 2');
    }
    download('frontier.mtl', mtl.join('\n'));
    onProgress?.(`Exported OBJ · ${quads.toLocaleString()} quads · ${(quads * 2 + tris).toLocaleString()} tris`);
  }, 30);
}

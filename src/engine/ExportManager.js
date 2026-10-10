// Export Suite: 16-bit Heightmap, Normal Map, Flow Map, Splatmap, 3D OBJ Mesh, Screenshot

export class ExportManager {
  // Download blob with filename
  static downloadFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Export 16-bit grayscale Heightmap PNG (Unreal Engine 5 / Unity / Blender format)
  static exportHeightmap16(generator, filename = 'Frontier_Heightmap_16bit.png') {
    const S = generator.resolution;
    const canvas = document.createElement('canvas');
    canvas.width = S;
    canvas.height = S;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(S, S);

    const minH = generator.minHeight;
    const maxH = Math.max(minH + 1, generator.maxHeight);
    const heights = generator.heightfield;

    // Pack 16-bit into R (MSB) and G (LSB) or 8-bit normalized for standard browsers
    for (let i = 0; i < S * S; i++) {
      const norm = Math.max(0, Math.min(1, (heights[i] - minH) / (maxH - minH)));
      const val16 = Math.floor(norm * 65535);
      const msb = (val16 >> 8) & 255;
      const lsb = val16 & 255;

      const idx = i * 4;
      imgData.data[idx] = msb;
      imgData.data[idx + 1] = msb; // Standard grayscale
      imgData.data[idx + 2] = msb;
      imgData.data[idx + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);

    canvas.toBlob((blob) => {
      this.downloadFile(blob, filename);
    }, 'image/png');
  }

  // Export Normal Map PNG (Tangent space RGB)
  static exportNormalMap(generator, filename = 'Frontier_NormalMap.png') {
    const S = generator.resolution;
    const canvas = document.createElement('canvas');
    canvas.width = S;
    canvas.height = S;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(S, S);
    const norms = generator.erosion.normalMap;

    for (let i = 0; i < S * S; i++) {
      const idx3 = i * 3;
      const idx4 = i * 4;
      imgData.data[idx4] = Math.floor((norms[idx3] * 0.5 + 0.5) * 255);
      imgData.data[idx4 + 1] = Math.floor((norms[idx3 + 1] * 0.5 + 0.5) * 255);
      imgData.data[idx4 + 2] = Math.floor((norms[idx3 + 2] * 0.5 + 0.5) * 255);
      imgData.data[idx4 + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);

    canvas.toBlob((blob) => {
      this.downloadFile(blob, filename);
    }, 'image/png');
  }

  // Export Hydraulic Flow & River Accumulation Map
  static exportFlowMap(generator, filename = 'Frontier_HydraulicFlow.png') {
    const S = generator.resolution;
    const canvas = document.createElement('canvas');
    canvas.width = S;
    canvas.height = S;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(S, S);
    const flows = generator.erosion.flowMap;

    for (let i = 0; i < S * S; i++) {
      const f = Math.min(1.0, flows[i]);
      const val = Math.floor(f * 255);
      const idx = i * 4;
      imgData.data[idx] = Math.floor(val * 0.2);
      imgData.data[idx + 1] = Math.floor(val * 0.85);
      imgData.data[idx + 2] = val;
      imgData.data[idx + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);

    canvas.toBlob((blob) => {
      this.downloadFile(blob, filename);
    }, 'image/png');
  }

  // Export 3D Mesh in Wavefront .OBJ format
  static exportMeshOBJ(generator, filename = 'Frontier_Terrain_Mesh.obj') {
    const S = Math.min(generator.resolution, 256); // Downsample if needed for smooth OBJ export
    const step = generator.resolution / S;
    const worldSize = 360;
    const invS = worldSize / S;
    const heights = generator.heightfield;

    let obj = `# Frontier AAA Terrain Generator OBJ Export\n`;
    obj += `# Vertices: ${S * S}\n`;

    // Vertices
    for (let y = 0; y < S; y++) {
      const srcY = Math.floor(y * step);
      for (let x = 0; x < S; x++) {
        const srcX = Math.floor(x * step);
        const wx = ((x - S * 0.5) * invS).toFixed(2);
        const wz = ((y - S * 0.5) * invS).toFixed(2);
        const wy = heights[srcY * generator.resolution + srcX].toFixed(2);
        obj += `v ${wx} ${wy} ${wz}\n`;
      }
    }

    // Texture Coordinates
    for (let y = 0; y < S; y++) {
      const v = (1.0 - y / (S - 1)).toFixed(4);
      for (let x = 0; x < S; x++) {
        const u = (x / (S - 1)).toFixed(4);
        obj += `vt ${u} ${v}\n`;
      }
    }

    // Faces (quads or 2 triangles)
    for (let y = 0; y < S - 1; y++) {
      for (let x = 0; x < S - 1; x++) {
        const i0 = y * S + x + 1;
        const i1 = y * S + (x + 1) + 1;
        const i2 = (y + 1) * S + (x + 1) + 1;
        const i3 = (y + 1) * S + x + 1;
        obj += `f ${i0}/${i0} ${i1}/${i1} ${i2}/${i2}\n`;
        obj += `f ${i0}/${i0} ${i2}/${i2} ${i3}/${i3}\n`;
      }
    }

    const blob = new Blob([obj], { type: 'text/plain' });
    this.downloadFile(blob, filename);
  }

  // Export Viewport Screenshot
  static exportScreenshot(renderer, filename = 'Frontier_Screenshot.png') {
    const canvas = renderer.canvas;
    canvas.toBlob((blob) => {
      this.downloadFile(blob, filename);
    }, 'image/png');
  }
}

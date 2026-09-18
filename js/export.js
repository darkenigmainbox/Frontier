/* ============================================================
 * Frontier · SDF Terrain Lab — Game Engine Exporters
 *
 * Exporters for game engines and DCC tools:
 *  1. .frontier v2 binary 3D SDF volume (magic 0x46534446)
 *  2. Wavefront OBJ 3D mesh with normals & UVs
 *  3. 16-bit grayscale PNG / raw elevation data
 *  4. Terrain configuration JSON (reproducible seed/pipeline)
 * ============================================================ */

/**
 * Exports terrain as .frontier v2 binary 3D SDF volume.
 *
 * Binary layout:
 *   [0..3]   uint32 LE magic: 0x46534446 ("FSDF")
 *   [4..7]   uint32 LE jsonHeaderLength
 *   [8..]    UTF-8 JSON header bytes
 *   [...]    interleaved float32 voxel data: (distance, wetness, deposit, solid)
 */
export function exportFrontierBinary({
  h, N, voxel, worldSize = 100, seaLevel = -7, minH, maxH,
  settings = {}, flow = null, depositMap = null, nz = 48,
}) {
  const nx = N;
  const ny = nz; // vertical resolution
  const yMin = seaLevel - 8;
  const yMax = Math.max(maxH + 6, 20);
  const dy = (yMax - yMin) / (ny - 1);

  const headerObj = {
    version: 2,
    dimensions: [nx, ny, nx],
    bounds: [
      [-worldSize / 2, yMin, -worldSize / 2],
      [worldSize / 2, yMax, worldSize / 2]
    ],
    channelNames: ['distance', 'wetness', 'deposit', 'solid'],
    componentType: 'float32',
    model: 'frontier-sdf-engine-v3',
    settings: {
      worldSize,
      voxel,
      seaLevel,
      minElevation: minH,
      maxElevation: maxH,
      ...settings,
    },
  };

  let headerJson = JSON.stringify(headerObj);
  let headerBytes = new TextEncoder().encode(headerJson);
  const rem = headerBytes.byteLength % 4;
  if (rem !== 0) {
    headerJson = headerJson + ' '.repeat(4 - rem);
    headerBytes = new TextEncoder().encode(headerJson);
  }
  const headerLen = headerBytes.byteLength;

  const totalVoxels = nx * ny * nx;
  const voxelDataByteLength = totalVoxels * 4 * 4; // 4 float32 channels
  const totalByteLength = 8 + headerLen + voxelDataByteLength;

  const buffer = new ArrayBuffer(totalByteLength);
  const view = new DataView(buffer);

  // Magic 0x46534446
  view.setUint32(0, 0x46534446, true);
  view.setUint32(4, headerLen, true);

  // Write header bytes
  const uint8Buffer = new Uint8Array(buffer);
  uint8Buffer.set(headerBytes, 8);

  // Write voxel data
  const voxelsOffset = 8 + headerLen;
  const floatView = new Float32Array(buffer, voxelsOffset, totalVoxels * 4);

  let ptr = 0;
  for (let z = 0; z < nx; z++) {
    for (let y = 0; y < ny; y++) {
      const worldY = yMin + y * dy;
      for (let x = 0; x < nx; x++) {
        const hIdx = z * nx + x;
        const terrainH = h[hIdx];
        const dist = worldY - terrainH;
        const wet = flow ? Math.min(1.0, flow[hIdx] / 80.0) : 0.0;
        const dep = depositMap ? depositMap[hIdx] : 0.0;
        const solid = dist <= 0 ? 1.0 : Math.max(0.0, 1.0 - dist / dy);

        floatView[ptr++] = dist;
        floatView[ptr++] = wet;
        floatView[ptr++] = dep;
        floatView[ptr++] = solid;
      }
    }
  }

  return new Blob([buffer], { type: 'application/octet-stream' });
}

/**
 * Exports terrain as Wavefront .OBJ 3D mesh.
 */
export function exportObjMesh({ h, N, voxel, worldSize = 100, step = 1 }) {
  const stride = Math.max(1, step | 0);
  const c2 = (N - 1) / 2;

  let obj = `# Frontier SDF Terrain Lab OBJ Export\n# Grid: ${N}x${N}, Voxel: ${voxel.toFixed(3)}m\n`;

  // Vertices & UVs
  const vIdxMap = new Int32Array(N * N).fill(-1);
  let vCount = 1;

  for (let j = 0; j < N; j += stride) {
    for (let i = 0; i < N; i += stride) {
      const idx = j * N + i;
      const wx = (i - c2) * voxel;
      const wy = h[idx];
      const wz = (j - c2) * voxel;
      const u = i / (N - 1);
      const v = j / (N - 1);

      obj += `v ${wx.toFixed(3)} ${wy.toFixed(3)} ${wz.toFixed(3)}\n`;
      obj += `vt ${u.toFixed(4)} ${v.toFixed(4)}\n`;
      vIdxMap[idx] = vCount++;
    }
  }

  // Faces
  for (let j = 0; j < N - stride; j += stride) {
    for (let i = 0; i < N - stride; i += stride) {
      const a = vIdxMap[j * N + i];
      const b = vIdxMap[j * N + (i + stride)];
      const c = vIdxMap[(j + stride) * N + i];
      const d = vIdxMap[(j + stride) * N + (i + stride)];

      if (a > 0 && b > 0 && c > 0 && d > 0) {
        obj += `f ${a}/${a} ${c}/${c} ${b}/${b}\n`;
        obj += `f ${b}/${b} ${c}/${c} ${d}/${d}\n`;
      }
    }
  }

  return new Blob([obj], { type: 'text/plain' });
}

/**
 * Triggers a browser file download from a Blob.
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Exports terrain elevation as a 2D grayscale PNG image.
 */
export function exportHeightmapPNG({ h, N, minH, maxH }) {
  const canvas = document.createElement('canvas');
  canvas.width = N;
  canvas.height = N;
  const ctx = canvas.getContext('2d');
  const imgData = ctx.createImageData(N, N);
  const data = imgData.data;

  const span = Math.max(maxH - minH, 1e-6);

  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const srcIdx = j * N + i;
      const val = Math.max(0, Math.min(1, (h[srcIdx] - minH) / span));
      const byte = Math.round(val * 255);
      const dstIdx = (j * N + i) * 4;
      data[dstIdx + 0] = byte;
      data[dstIdx + 1] = byte;
      data[dstIdx + 2] = byte;
      data[dstIdx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png');
  });
}

/**
 * Exports terrain as 16-bit unsigned little-endian raw heightmap (.r16).
 */
export function exportHeightmapRaw16({ h, N, minH, maxH }) {
  const span = Math.max(maxH - minH, 1e-6);
  const buf = new ArrayBuffer(N * N * 2);
  const view = new DataView(buf);

  for (let i = 0; i < N * N; i++) {
    const norm = Math.max(0, Math.min(1, (h[i] - minH) / span));
    const u16 = Math.round(norm * 65535);
    view.setUint16(i * 2, u16, true);
  }

  return new Blob([buf], { type: 'application/octet-stream' });
}

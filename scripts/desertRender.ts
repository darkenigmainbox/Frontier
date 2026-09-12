/**
 * Headless shape preview for desert plants: builds each preset with the
 * DesertMesher and rasterises a flat-shaded orthographic side view with a
 * tiny software renderer (no browser / GL needed). Level 0 = deep green,
 * level 1 = green, level 2 (spines, fruits) = straw.
 *
 * Usage: npx vite-node scripts/desertRender.ts [name-filter] [seed]
 */
// @ts-ignore - node:fs has no types in this repo by design; vite-node provides it at runtime.
import { writeFileSync, mkdirSync } from 'node:fs';
import { DesertMesher } from '../src/plant/desertMesher';
import { DESERT_PRESETS, DEFAULT_DESERT } from '../src/plant/desertParams';
import type { QuadMesh } from '../src/tree/mesh';

const W = 420;
const H = 560;

function render(mesh: QuadMesh, camAz: number): Uint8Array {
  const p = mesh.positions;
  const n = mesh.vertexCount;
  // Bounds (above ground only for framing).
  let minX = Infinity;
  let maxX = -Infinity;
  let maxY = 0.001;
  const ca = Math.cos(camAz);
  const sa = Math.sin(camAz);
  const px = new Float64Array(n);
  const py = new Float64Array(n);
  const pz = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const x = p[i * 3];
    const y = p[i * 3 + 1];
    const z = p[i * 3 + 2];
    // Orbit around Y, camera looks along -Z... project: right = x*ca - z*sa.
    const rx = x * ca - z * sa;
    const rz = x * sa + z * ca;
    px[i] = rx;
    py[i] = y;
    pz[i] = rz;
    if (rx < minX) minX = rx;
    if (rx > maxX) maxX = rx;
    if (y > maxY) maxY = y;
  }
  const spanX = Math.max(1e-6, maxX - minX);
  const sc = Math.min((W - 30) / spanX, (H - 30) / maxY);
  const ox = (W - sc * spanX) / 2 - sc * minX;
  const oy = H - 14;
  const sx = new Float64Array(n);
  const sy = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    sx[i] = ox + sc * px[i];
    sy[i] = oy - sc * py[i];
  }
  const img = new Uint8Array(W * H * 3).fill(22);
  const zbuf = new Float64Array(W * H).fill(-Infinity);
  // Sky gradient + ground line.
  for (let y = 0; y < H; y++) {
    const t = y / H;
    const r = Math.round(16 + 26 * t);
    const gg = Math.round(20 + 30 * t);
    const b = Math.round(30 + 34 * t);
    for (let x = 0; x < W; x++) {
      img[(y * W + x) * 3] = r;
      img[(y * W + x) * 3 + 1] = gg;
      img[(y * W + x) * 3 + 2] = b;
    }
  }
  const gy = Math.round(oy);
  if (gy >= 0 && gy < H) for (let x = 0; x < W; x++) { img[(gy * W + x) * 3] = 90; img[(gy * W + x) * 3 + 1] = 80; img[(gy * W + x) * 3 + 2] = 60; }

  const lx = 0.45;
  const ly = 0.75;
  const lz = 0.55;
  const cols = [
    [46, 110, 58],
    [74, 148, 74],
    [216, 196, 110],
  ];
  const tri = (a: number, b: number, c: number, lvl: number): void => {
    // Face normal in world space.
    const ax = p[a * 3];
    const ay = p[a * 3 + 1];
    const az = p[a * 3 + 2];
    const e1x = p[b * 3] - ax;
    const e1y = p[b * 3 + 1] - ay;
    const e1z = p[b * 3 + 2] - az;
    const e2x = p[c * 3] - ax;
    const e2y = p[c * 3 + 1] - ay;
    const e2z = p[c * 3 + 2] - az;
    let nx = e1y * e2z - e1z * e2y;
    let ny = e1z * e2x - e1x * e2z;
    let nz = e1x * e2y - e1y * e2x;
    // To camera space (orbit around Y).
    const cnx = nx * ca - nz * sa;
    const cny = ny;
    const cnz = nx * sa + nz * ca;
    if (cnz <= 0) return; // backface
    const nl = Math.hypot(cnx, cny, cnz) || 1;
    const shade = 0.32 + 0.68 * Math.max(0, (cnx * lx + cny * ly + cnz * lz) / nl);
    const base = cols[Math.min(2, lvl)] ?? cols[0];
    const R = Math.min(255, Math.round(base[0] * shade));
    const G = Math.min(255, Math.round(base[1] * shade));
    const B = Math.min(255, Math.round(base[2] * shade));
    const x0 = sx[a];
    const y0 = sy[a];
    const x1 = sx[b];
    const y1 = sy[b];
    const x2 = sx[c];
    const y2 = sy[c];
    const minPx = Math.max(0, Math.floor(Math.min(x0, x1, x2)));
    const maxPx = Math.min(W - 1, Math.ceil(Math.max(x0, x1, x2)));
    const minPy = Math.max(0, Math.floor(Math.min(y0, y1, y2)));
    const maxPy = Math.min(H - 1, Math.ceil(Math.max(y0, y1, y2)));
    const d = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
    if (Math.abs(d) < 1e-9) return;
    const z0 = pz[a];
    const z1 = pz[b];
    const z2 = pz[c];
    for (let y = minPy; y <= maxPy; y++) {
      for (let x = minPx; x <= maxPx; x++) {
        const w1 = ((x - x0) * (y2 - y0) - (y - y0) * (x2 - x0)) / d;
        const w2 = ((x1 - x0) * (y - y0) - (y1 - y0) * (x - x0)) / d;
        const w0 = 1 - w1 - w2;
        if (w0 < 0 || w1 < 0 || w2 < 0) continue;
        const z = w0 * z0 + w1 * z1 + w2 * z2;
        const k = y * W + x;
        if (z > zbuf[k]) {
          zbuf[k] = z;
          img[k * 3] = R;
          img[k * 3 + 1] = G;
          img[k * 3 + 2] = B;
        }
      }
    }
  };
  const lv = mesh.levels;
  for (let f = 0; f < mesh.quads.length; f += 4) {
    const a = mesh.quads[f];
    const b = mesh.quads[f + 1];
    const c = mesh.quads[f + 2];
    const d = mesh.quads[f + 3];
    const l = lv[a] ?? 0;
    tri(a, b, c, l);
    tri(a, c, d, l);
  }
  for (let f = 0; f < mesh.tris.length; f += 3) {
    const a = mesh.tris[f];
    tri(a, mesh.tris[f + 1], mesh.tris[f + 2], lv[a] ?? 0);
  }
  // BMP (24-bit, bottom-up).
  const row = Math.ceil((W * 3) / 4) * 4;
  const out = new Uint8Array(54 + row * H);
  const dv = new DataView(out.buffer);
  out[0] = 0x42;
  out[1] = 0x4d;
  dv.setUint32(2, out.length, true);
  dv.setUint32(10, 54, true);
  dv.setUint32(14, 40, true);
  dv.setInt32(18, W, true);
  dv.setInt32(22, H, true);
  dv.setUint16(26, 1, true);
  dv.setUint16(28, 24, true);
  for (let y = 0; y < H; y++) {
    const src = (H - 1 - y) * W * 3;
    for (let x = 0; x < W; x++) {
      out[54 + y * row + x * 3] = img[src + x * 3 + 2];
      out[54 + y * row + x * 3 + 1] = img[src + x * 3 + 1];
      out[54 + y * row + x * 3 + 2] = img[src + x * 3];
    }
  }
  return out;
}

const argv: string[] = (globalThis as unknown as { process: { argv: string[] } }).process.argv;
const filter = (argv[2] ?? '').toLowerCase();
const seed = Number(argv[3] ?? 1) || 1;
mkdirSync('renders', { recursive: true });
for (const preset of DESERT_PRESETS) {
  if (filter && !preset.name.toLowerCase().includes(filter)) continue;
  const g = { ...DEFAULT_DESERT, ...preset.desert };
  const t0 = Date.now();
  const built = new DesertMesher(g, seed).build();
  const buf = render(built.mesh, Math.PI * 0.12);
  const file = `renders/${preset.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_s${seed}.bmp`;
  writeFileSync(file, buf);
  console.log(`${preset.name}: ${file} (${Date.now() - t0} ms)`);
}

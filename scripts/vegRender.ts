/**
 * Headless shape preview for garden vegetables: builds each preset with the
 * VegMesher and rasterises flat-shaded orthographic views with a tiny
 * software renderer (no browser / GL needed). Accent 0 = leaf/stem, accent 1
 * = skin (root/bulb body), accent 2 = flower, accent 3 = fruit.
 *
 * Usage: npx vite-node scripts/vegRender.ts [name-filter] [seed]
 * Writes both a 3/4 side view (_s1.bmp) and a top-down view (_top.bmp).
 */
// @ts-ignore - node:fs has no types in this repo by design; vite-node provides it at runtime.
import { writeFileSync, mkdirSync } from 'node:fs';
import { VegMesher } from '../src/plant/vegMesher';
import { VEG_PRESETS, DEFAULT_VEG } from '../src/plant/vegParams';
import type { QuadMesh } from '../src/tree/mesh';

const W = 480;
const H = 620;

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function render(mesh: QuadMesh, camAz: number, accentCols: [number, number, number][], camEl = 0.28): Uint8Array {
  const p = mesh.positions;
  const n = mesh.vertexCount;
  let minX = Infinity;
  let maxX = -Infinity;
  let maxY = 0.001;
  let minY = 0;
  const ca = Math.cos(camAz);
  const sa = Math.sin(camAz);
  const ce = Math.cos(camEl);
  const se = Math.sin(camEl);
  const px = new Float64Array(n);
  const py = new Float64Array(n);
  const pz = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const x = p[i * 3];
    const y = p[i * 3 + 1];
    const z = p[i * 3 + 2];
    // Yaw around Y, then pitch (elevation) around the new right axis.
    const rx = x * ca - z * sa;
    const rz0 = x * sa + z * ca;
    const ry = y * ce - rz0 * se;
    const rz = y * se + rz0 * ce;
    px[i] = rx;
    py[i] = ry;
    pz[i] = rz;
    if (rx < minX) minX = rx;
    if (rx > maxX) maxX = rx;
    if (ry > maxY) maxY = ry;
    if (ry < minY) minY = ry;
  }
  const spanX = Math.max(1e-6, maxX - minX);
  const spanY = Math.max(1e-6, maxY - minY);
  const pad = 18;
  const sc = Math.min((W - 2 * pad) / spanX, (H - 2 * pad) / spanY);
  const ox = (W - sc * spanX) / 2 - sc * minX;
  // Anchor the world ground plane (y=0) so the whole bounding box (above AND
  // below ground) fits with equal padding top and bottom.
  const oy = pad + sc * maxY;
  const sx = new Float64Array(n);
  const sy = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    sx[i] = ox + sc * px[i];
    sy[i] = oy - sc * py[i];
  }
  const img = new Uint8Array(W * H * 3).fill(22);
  const zbuf = new Float64Array(W * H).fill(-Infinity);
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
  const accent = mesh.accent;
  const tri = (a: number, b: number, c: number): void => {
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
    const cnx = nx * ca - nz * sa;
    const cnz0 = nx * sa + nz * ca;
    const cny = ny * ce - cnz0 * se;
    const cnz = ny * se + cnz0 * ce;
    if (cnz <= 0) return;
    const nl = Math.hypot(cnx, cny, cnz) || 1;
    const shade = 0.32 + 0.68 * Math.max(0, (cnx * lx + cny * ly + cnz * lz) / nl);
    const base = accentCols[accent[a] ?? 0] ?? accentCols[0];
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
  for (let f = 0; f < mesh.quads.length; f += 4) {
    const a = mesh.quads[f];
    const b = mesh.quads[f + 1];
    const c = mesh.quads[f + 2];
    const d = mesh.quads[f + 3];
    tri(a, b, c);
    tri(a, c, d);
  }
  for (let f = 0; f < mesh.tris.length; f += 3) {
    tri(mesh.tris[f], mesh.tris[f + 1], mesh.tris[f + 2]);
  }
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
for (const preset of VEG_PRESETS) {
  if (filter && !preset.name.toLowerCase().includes(filter)) continue;
  const g = { ...DEFAULT_VEG, ...preset.veg };
  const t0 = Date.now();
  const built = new VegMesher(g, seed).build();
  const accentCols: [number, number, number][] = [
    hexToRgb(g.leafColor),
    hexToRgb(g.skinColor),
    hexToRgb(g.flowerColor),
    hexToRgb(g.fruitColor),
  ];
  const slug = preset.name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  const buf34 = render(built.mesh, Math.PI * 0.22, accentCols, 0.34);
  writeFileSync(`renders/${slug}_s${seed}.bmp`, buf34);
  const bufTop = render(built.mesh, Math.PI * 0.15, accentCols, 1.5);
  writeFileSync(`renders/${slug}_top.bmp`, bufTop);
  console.log(`${preset.name}: (${Date.now() - t0} ms) verts=${built.mesh.vertexCount} dropped=${built.stats.dropped}`);
}

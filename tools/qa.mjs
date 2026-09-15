/* QA: rasterize every icon chunk into labelled contact sheets for visual review.
 * usage: node tools/qa.mjs [outDir] [cols] [cellPx]
 */
const { Resvg } = await import(process.env.RESVG_PATH || '@resvg/resvg-js');
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = process.argv[2] || '/tmp/qa/sheets';
const COLS = +(process.argv[3] || 6);
const CW = +(process.argv[4] || 132), CH = CW + 26, S = CW - 56;
const ACCENT = process.env.FX_ACCENT || '#d94f2b';
const BG = process.env.FX_BG || '#ffffff';
const INK = process.env.FX_INK || '#191d23';
const MONO = process.env.FX_MONO === '1';

function loadIcons() {
  const files = readdirSync(join(root, 'icons')).filter(f => f.endsWith('.js')).sort();
  const icons = [];
  for (const f of files) {
    const code = readFileSync(join(root, 'icons', f), 'utf8');
    const w = { FrontierIcons: icons };
    new Function('window', code)(w);
  }
  return icons;
}

function styleBody(body, mono) {
  return body
    .replaceAll('class="fx-a"', mono ? '' : `stroke="${ACCENT}"`)
    .replaceAll('class="fx-f"', mono ? 'fill="currentColor" stroke="none"' : `fill="${ACCENT}" stroke="none"`)
    .replaceAll('class="fx-t"', mono ? 'fill="currentColor" stroke="none" opacity=".16"' : `fill="${ACCENT}" stroke="none" opacity=".22"`);
}

function esc(s) { return s.replaceAll('&', '&amp;').replaceAll('<', '&lt;'); }

function sheet(icons, idx) {
  const rows = Math.ceil(icons.length / COLS);
  let inner = `<rect width="100%" height="100%" fill="${BG}"/>`;
  icons.forEach((ic, i) => {
    const x = (i % COLS) * CW, y = Math.floor(i / COLS) * CH;
    inner += `<g transform="translate(${x + 28},${y + 18}) scale(${S / 24})" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${styleBody(ic.body, MONO)}</g>`;
    inner += `<text x="${x + CW / 2}" y="${y + CH - 8}" text-anchor="middle" font-family="DejaVu Sans Mono" font-size="11.5" fill="#5b6470">${esc(ic.id)}</text>`;
    inner += `<rect x="${x + .5}" y="${y + .5}" width="${CW - 1}" height="${CH - 1}" fill="none" stroke="#e4e7ec"/>`;
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${COLS * CW}" height="${rows * CH}">${inner}</svg>`;
  mkdirSync(outDir, { recursive: true });
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: COLS * CW * 2 }, font: { fontDirs: ['/usr/share/fonts/truetype/dejavu'] } }).render().asPng();
  const file = join(outDir, `${MONO ? 'mono-' : ''}sheet-${String(idx).padStart(2, '0')}.png`);
  writeFileSync(file, png);
  console.log(file, icons.length, 'icons');
}

const all = loadIcons();
console.log('total icons:', all.length);
for (let i = 0; i * 24 < all.length; i++) sheet(all.slice(i * 24, i * 24 + 24), i);

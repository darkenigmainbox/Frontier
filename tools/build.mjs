/* Build distributables from the icon source chunks:
 *   icons/svg/<id>.svg        standalone, accent wired to --fx-accent
 *   icons/sprite.svg          <symbol> sprite
 *   icons/frontier-icons.css  presentation classes
 *   icons/frontier-icons.json metadata index
 * usage: node tools/build.mjs
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const iconsDir = join(root, 'icons');

const icons = [];
for (const f of readdirSync(iconsDir).filter(f => f.endsWith('.js')).sort()) {
  new Function('window', readFileSync(join(iconsDir, f), 'utf8'))({ FrontierIcons: icons });
}
if (!icons.length) throw new Error('no icons loaded');
const ids = new Set(icons.map(i => i.id));
if (ids.size !== icons.length) throw new Error('duplicate icon ids');

const wrap = b => b
  .replaceAll('class="fx-a"', 'stroke="var(--fx-accent, currentColor)"')
  .replaceAll('class="fx-f"', 'fill="var(--fx-accent, currentColor)" stroke="none"')
  .replaceAll('class="fx-t"', 'fill="var(--fx-accent, currentColor)" stroke="none" opacity=".2"');

const standalone = i =>
`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  ${wrap(i.body)}
</svg>
`;

const svgOut = join(iconsDir, 'svg');
rmSync(svgOut, { recursive: true, force: true });
mkdirSync(svgOut, { recursive: true });
for (const i of icons) writeFileSync(join(svgOut, `${i.id}.svg`), standalone(i));

writeFileSync(join(iconsDir, 'sprite.svg'),
`<svg xmlns="http://www.w3.org/2000/svg" style="display:none">
${icons.map(i => `  <symbol id="fx-${i.id}" viewBox="0 0 24 24">${i.body}</symbol>`).join('\n')}
</svg>
`);

writeFileSync(join(iconsDir, 'frontier-icons.css'),
`/* Frontier Icons — presentation layer.
 * Usage: <svg class="fx-icon"><use href="sprite.svg#fx-file-new"/></svg>
 * Multicolour: set --fx-accent on any ancestor. Tint strength: --fx-tint (0–1). */
.fx-icon{fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.fx-icon .fx-a{stroke:var(--fx-accent,currentColor)}
.fx-icon .fx-f{fill:var(--fx-accent,currentColor);stroke:none}
.fx-icon .fx-t{fill:var(--fx-accent,currentColor);stroke:none;opacity:var(--fx-tint,.2)}
`);

writeFileSync(join(iconsDir, 'frontier-icons.json'), JSON.stringify({
  name: 'frontier-icons',
  version: 1,
  grid: '24x24',
  stroke: 2,
  license: 'Project-internal',
  generated: new Date().toISOString(),
  count: icons.length,
  icons: icons.map(({ id, name, cat, tags, risk, note }) => ({ id, name, cat, tags, risk, note }))
}, null, 2) + '\n');

console.log(`built ${icons.length} icons → icons/svg/, icons/sprite.svg, icons/frontier-icons.css, icons/frontier-icons.json`);

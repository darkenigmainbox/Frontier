import { DESERT_PRESETS, DEFAULT_DESERT } from '../src/plant/desertParams';
const preset = DESERT_PRESETS.find((p) => p.name === 'Golden Barrel')!;
const g = { ...DEFAULT_DESERT, ...preset.desert };
const R = g.bodyRadius;
const H = g.height;
for (let t = 0.8; t <= 1; t += 0.02) {
  const r = R * Math.pow(Math.sin(Math.PI * (0.1 + 0.8 * t)), 0.75);
  console.log(t.toFixed(2), (r/R).toFixed(3));
}

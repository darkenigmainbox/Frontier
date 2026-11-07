// Day/night model: sun direction, colour of the light and the sky gradient.
import { normalize3, lerp, smoothstep } from './math.js';

export function gradient(stops, t) {
  if (t <= stops[0].t) return stops[0].v.slice();
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i], b = stops[i + 1];
    if (t <= b.t) {
      const k = smoothstep(a.t, b.t, t);
      return a.v.map((x, j) => x + (b.v[j] - x) * k);
    }
  }
  return stops[stops.length - 1].v.slice();
}

const SUN_COLOR = [
  { t: -0.40, v: [0.34, 0.42, 0.72] },
  { t: -0.08, v: [0.52, 0.44, 0.62] },
  { t: 0.00, v: [1.00, 0.40, 0.24] },
  { t: 0.13, v: [1.00, 0.58, 0.31] },
  { t: 0.30, v: [1.00, 0.82, 0.62] },
  { t: 0.65, v: [1.00, 0.96, 0.90] },
];
const SKY_TOP = [
  { t: -0.40, v: [0.010, 0.014, 0.048] },
  { t: -0.06, v: [0.040, 0.050, 0.145] },
  { t: 0.02, v: [0.125, 0.110, 0.330] },
  { t: 0.14, v: [0.150, 0.290, 0.650] },
  { t: 0.38, v: [0.165, 0.430, 0.885] },
  { t: 0.90, v: [0.130, 0.380, 0.850] },
];
const SKY_HORIZON = [
  { t: -0.40, v: [0.045, 0.060, 0.150] },
  { t: -0.07, v: [0.130, 0.105, 0.255] },
  { t: 0.01, v: [0.680, 0.265, 0.350] },
  { t: 0.10, v: [0.900, 0.435, 0.360] },
  { t: 0.24, v: [0.880, 0.520, 0.430] },
  { t: 0.48, v: [0.760, 0.700, 0.740] },
  { t: 0.75, v: [0.620, 0.800, 0.980] },
];
const SKY_GROUND = [
  { t: -0.40, v: [0.026, 0.032, 0.070] },
  { t: -0.05, v: [0.075, 0.070, 0.130] },
  { t: 0.02, v: [0.330, 0.215, 0.265] },
  { t: 0.14, v: [0.520, 0.430, 0.415] },
  { t: 0.40, v: [0.620, 0.640, 0.700] },
  { t: 0.90, v: [0.660, 0.700, 0.780] },
];

export function computeSky(hour) {
  const h = ((hour - 12) / 24) * Math.PI * 2;
  const sunDir = normalize3([Math.sin(h) * 0.95, Math.cos(h), Math.sin(h) * 0.32 + 0.26]);
  const elev = sunDir[1];
  const dayness = smoothstep(-0.10, 0.10, elev);
  const sunIntensity = elev > 0
    ? lerp(0.7, 2.25, smoothstep(0.0, 0.42, elev))
    : lerp(0.22, 0.78, smoothstep(-0.34, 0.0, elev));
  return {
    sunDir,
    sunColor: gradient(SUN_COLOR, elev),
    sunIntensity,
    skyTop: gradient(SKY_TOP, elev),
    skyHorizon: gradient(SKY_HORIZON, elev),
    skyGround: gradient(SKY_GROUND, elev),
    night: 1 - smoothstep(-0.16, 0.06, elev),
    dayness,
  };
}


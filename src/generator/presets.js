export const DEFAULT_SETTINGS = Object.freeze({
  kind: 'outcrop',
  seed: 483721,
  width: 1,
  height: 1,
  fracture: 58,
  joints: 30,
  weathering: 52,
  detail: 56,
});

export const FORMATIONS = [
  { id: 'outcrop', label: 'Outcrop', description: 'A clustered exposed rock formation' },
  { id: 'cliff', label: 'Cliff', description: 'A tall, fractured rock face' },
  { id: 'boulder', label: 'Boulder', description: 'A single weathered rock mass' },
];

export const MATERIALS = [
  { id: 'granite', label: 'Granite', color: '#898d87', description: 'Neutral grey' },
  { id: 'basalt', label: 'Basalt', color: '#555e5c', description: 'Deep charcoal' },
  { id: 'limestone', label: 'Limestone', color: '#a8a596', description: 'Pale stone' },
];

export function normalizeSettings(input = {}) {
  const numeric = (value, fallback, min, max) => {
    if (value == null || (typeof value === 'string' && value.trim() === '')) return fallback;
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
  };
  return {
    kind: FORMATIONS.some((option) => option.id === input.kind) ? input.kind : DEFAULT_SETTINGS.kind,
    seed: Math.floor(numeric(input.seed, DEFAULT_SETTINGS.seed, 0, 4294967295)),
    width: numeric(input.width, DEFAULT_SETTINGS.width, 0.6, 1.6),
    height: numeric(input.height, DEFAULT_SETTINGS.height, 0.6, 1.6),
    fracture: numeric(input.fracture, DEFAULT_SETTINGS.fracture, 0, 100),
    joints: numeric(input.joints, DEFAULT_SETTINGS.joints, 0, 100),
    weathering: numeric(input.weathering, DEFAULT_SETTINGS.weathering, 0, 100),
    detail: numeric(input.detail, DEFAULT_SETTINGS.detail, 0, 100),
  };
}

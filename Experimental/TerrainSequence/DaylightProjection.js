// DaylightProjection — sun and sky colour as a function of solar elevation.
//
// Sunlight reddens and dims as it crosses more atmosphere. These are fits to the usual clear-sky
// values rather than a transmittance integral: a full one would need a lookup table to produce a
// result no eye could separate from this.

const Stops = [
  [-4, [1.0, 0.26, 0.09]],
  [0,  [1.0, 0.40, 0.17]],
  [6,  [1.0, 0.63, 0.36]],
  [14, [1.0, 0.80, 0.60]],
  [28, [1.0, 0.92, 0.82]],
  [60, [1.0, 0.98, 0.96]],
  [90, [1.0, 1.00, 1.00]],
];

export function SunColour(Elevation, Warmth) {
  const Held = Math.max(-4, Math.min(90, Elevation));
  let Tint = Stops[Stops.length - 1][1];
  for (let K = 0; K < Stops.length - 1; K += 1) {
    const [A, Ca] = Stops[K];
    const [B, Cb] = Stops[K + 1];
    if (Held >= A && Held <= B) {
      const T = (Held - A) / (B - A);
      Tint = Ca.map((V, I) => V + (Cb[I] - V) * T);
      break;
    }
  }
  const Mixed = Tint.map((V) => 1 + (V - 1) * Warmth);
  // Air mass: the disc at the horizon is far dimmer than the one overhead.
  const Mass = 1 / Math.max(0.055, Math.sin((Held * Math.PI) / 180) + 0.15);
  const Loss = Math.exp(-0.17 * (Mass - 1));
  return Mixed.map((V) => V * Loss);
}

export function SkyColour(Elevation) {
  const Day = Math.max(0, Math.min(1, (Elevation + 5) / 26));
  const Night = [0.030, 0.044, 0.078];
  const Noon = [0.235, 0.340, 0.520];
  return Noon.map((V, I) => Night[I] + (V - Night[I]) * Day);
}

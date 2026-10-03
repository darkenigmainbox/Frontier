import { DEFAULTS, validateSettings } from './geometry.js';
import { PATTERNS } from './patterns.js';
import { validateDesign } from './design.js';

// Retain user adjustments. Only the untouched old mud dimension preset needs
// its repeat count migrated, otherwise a cached 28-repeat preset would keep
// stretching the rebuilt revision-5 contours after the app refreshes.
export function restoreSettings(saved) {
  if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return { ...DEFAULTS };
  const { patternRevision = 0, ...values } = saved;
  const candidate = { ...DEFAULTS, ...values };
  validateSettings(candidate);
  if(candidate.design)validateDesign(candidate.design);
  if (!PATTERNS.some(p => p.id === candidate.pattern)) throw new Error('Unknown saved pattern');
  const oldMudDimensions = { radius: 340, width: 305, depth: 20, repeats: 28, gap: 1 };
  if (patternRevision < 5 && candidate.pattern === 'mud' &&
      Object.entries(oldMudDimensions).every(([key, value]) => candidate[key] === value)) {
    candidate.repeats = PATTERNS.find(p => p.id === 'mud').repeats;
  }
  return candidate;
}

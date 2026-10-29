/** A small, deterministic 32-bit PRNG. A seed produces the same mesh on every visit. */
export function createRandom(seed) {
  let state = seed >>> 0;
  return function random() {
    state = (state + 0x6d2b79f5) | 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function between(random, min, max) {
  return min + (max - min) * random();
}

/** Independent deterministic streams keep unrelated parameters from reshuffling the layout. */
export function deriveSeed(seed, ...parts) {
  let value = (seed ^ 0x9e3779b9) >>> 0;
  for (const part of parts) {
    value = Math.imul(value ^ (part >>> 0), 0x85ebca6b);
    value ^= value >>> 13;
    value = Math.imul(value, 0xc2b2ae35);
    value ^= value >>> 16;
  }
  return value >>> 0;
}

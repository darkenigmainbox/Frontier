// Material ids (must match the switch in scene.wgsl) + the candy palette.
export const MAT = {
  SNOW: 0,
  GINGER: 1,
  ICING: 2,
  CHOC: 3,
  CANE: 4,
  LOLLI: 5,
  JELLY: 6,
  MALLOW: 7,
  GUMDROP: 8,
  PEPPERMINT: 9,
  GLASS: 10,
  LICORICE: 11,
  SPRINKLE: 12,
  RIVER: 13,
};

/** #rrggbb (sRGB) -> linear rgb triple. The composite pass re-applies gamma. */
export function hex(h) {
  const v = parseInt(h.replace('#', ''), 16);
  const srgb = [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
  return srgb.map((c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
}

export const PAL = {
  gingerLight: hex('#c0844a'),
  gingerMid: hex('#a2673a'),
  gingerDark: hex('#6b3f1e'),
  icing: hex('#fffdf7'),
  icingCream: hex('#ffe9cf'),
  chocLight: hex('#5c3620'),
  chocDark: hex('#33190f'),
  chocBlack: hex('#1d0e08'),
  caneRed: hex('#e02a45'),
  caneMint: hex('#4fd6b4'),
  lolliPink: hex('#ff3d78'),
  lolliPurple: hex('#9b3fd4'),
  lolliBlue: hex('#2fb8ff'),
  lolliYellow: hex('#ffd23f'),
  peppermint: hex('#e8334a'),
  glass: hex('#bfe9ff'),
  licorice: hex('#171014'),
  riverLight: hex('#7a4a2a'),
  riverDark: hex('#3a1d10'),
  jelly: [
    hex('#ff4d7a'), // raspberry
    hex('#ffae3c'), // tangerine
    hex('#59d2ff'), // blue raspberry
    hex('#8fe04a'), // apple
    hex('#c46bff'), // grape
    hex('#ff6a3d'), // cherry
    hex('#ffe45c'), // lemon
    hex('#38d9c4'), // lime mint
  ],
  gumdrop: [
    hex('#ff8fb8'),
    hex('#8ce0c8'),
    hex('#b6a6ff'),
    hex('#ffd166'),
    hex('#7ecbff'),
    hex('#ffa07a'),
  ],
  sprinkle: [
    hex('#ff3d6e'),
    hex('#ffd23f'),
    hex('#4dd2ff'),
    hex('#8ef05a'),
    hex('#ffffff'),
    hex('#c86bff'),
    hex('#ff9f1c'),
  ],
  cane: [hex('#e02a45'), hex('#4fd6b4'), hex('#ffb03a'), hex('#8f6bff')],
};

/** Build a draw material descriptor. */
export function mat(id, o = {}) {
  return {
    id,
    rough: o.rough ?? 0.5,
    emissive: o.em ?? 0,
    color1: o.c1 ? [...o.c1, 1] : [1, 1, 1, 1],
    color2: o.c2 ? [...o.c2, 1] : [0, 0, 0, 1],
    p: o.p ?? [1, 0, 0, 0],
    castShadow: o.cast !== false,
  };
}

export const pick = (arr, r) => arr[Math.floor(r() * arr.length) % arr.length];

/** Deterministic PRNG (mulberry32). */
export function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

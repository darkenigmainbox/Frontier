import { OFFROAD_PATTERNS, offroadBlocks } from './offroad-patterns.js';

// Reference study, revision 6. Explicit vector outlines, not image displacement.
// x: fraction of tread width, y: fraction of circumferential pitch.
// Main lugs, continuous ribs and low ejector bars are deliberately distinguished.
const block = (points, sipes = [], options = {}) => ({ points, sipes, role: 'lug', heightRatio: 1, ...options });
const mapBlock = (b, fn) => ({ ...b, points: b.points.map(fn), sipes: b.sipes.map(p => p.map(fn)) });
const mirror = (b, phase = 0) => {
  const result = mapBlock(b, ([x, y]) => [-x, y + phase]);
  result.points.reverse();
  return result;
};
const shift = (b, phase) => mapBlock(b, ([x, y]) => [x, y + phase]);

// Sampled quadratic edges retain the shoulder sweep in the exported mesh.
function curve(a, c, b, steps = 5) {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps, u = 1 - t;
    return [u*u*a[0] + 2*u*t*c[0] + t*t*b[0], u*u*a[1] + 2*u*t*c[1] + t*t*b[1]];
  });
}
function band(edge, thickness, sipes, options) {
  return block([...edge, ...edge.map(([x,y]) => [x,y + thickness]).reverse()], sipes, options);
}

export const PATTERN_REVISION = 7;
export const PATTERNS = [
  { id: 'highway', name: 'Highway', code: 'HT / 01', terrain: 'ROAD', description: 'Asymmetric five-rib road pattern, four straight channels, fine diagonal cuts and swept shoulders.', repeats: 56, depth: 8, width: 235, source: 1, sipeWidth: .75 },
  { id: 'all-terrain', name: 'All-terrain', code: 'AT / 02', terrain: 'MIXED', description: 'Dense stepped shoulder blocks and broad, interlocking diagonal center lugs.', repeats: 40, depth: 12, width: 265, source: 2, sipeWidth: .9 },
  { id: 'rugged', name: 'Rugged terrain', code: 'RT / 03', terrain: 'OFF-ROAD', description: 'Mirrored shoulder, diagonal and upright lug pairs around a symmetric double-notched center block.', repeats: 32, depth: 16, width: 285, source: 3, sipeWidth: 1 },
  { id: 'mud', name: 'Mud terrain', code: 'MT / 04', terrain: 'DEEP MUD', description: 'Hooked shoulder paddles, broad flat-ended center blocks and open staggered channels with low ejector bars.', repeats: 32, depth: 20, width: 305, source: 4, sipeWidth: 1.1 },
  ...OFFROAD_PATTERNS,
];

function highway() {
  // Reference 1 is asymmetric: the narrow second rib stays connected, rather
  // than becoming a fifth row of isolated off-road blocks.
  const leftEdge = [
    ...curve([-.5,.56],[-.435,.58],[-.37,.46]),
    ...curve([-.37,.46],[-.31,.24],[-.253,.035]).slice(1),
  ];
  const rightEdge = [
    ...curve([.263,.17],[.33,.11],[.39,.25]),
    ...curve([.39,.25],[.46,.49],[.5,.48]).slice(1),
  ];
  return [
    band(leftEdge,.86,[
      [...curve([-.501,1.06],[-.43,1.06],[-.369,.87]),[-.304,.64]],
      [[-.473,.71],[-.420,.67],[-.378,.55]],
    ],{ role:'shoulder' }),
    block([[-.219,0],[-.107,0],[-.107,.20],[-.137,.38],[-.107,.28],[-.107,.75],[-.134,.88],[-.107,.81],[-.107,1],[-.219,1],[-.219,.67],[-.185,.46],[-.219,.59]],[
      [[-.22,.27],[-.19,.13]],
      [[-.109,.57],[-.149,.77]],
    ],{role:'rib', continuous:true}),
    band([[-.074,.45],[.01,.17],[.070,-.07]],.95,[
      [[-.075,.89],[-.019,.66],[.071,.40]],
    ],{role:'rib'}),
    band([[.105,.16],[.158,.02],[.225,-.26]],.90,[
      [[.104,.60],[.162,.43],[.224,.24]],
    ],{role:'rib'}),
    band(rightEdge,.85,[
      [[.262,.64],[.323,.61],[.365,.44],[.400,.27],[.448,.23]],
      [[.400,1.01],[.443,.86],[.501,.86]],
    ],{role:'shoulder'}),
  ];
}

function allTerrain() {
  const shoulder = block([
    [-.5,.04],[-.352,.04],[-.300,.13],[-.284,.29],[-.300,.51],[-.285,.70],[-.319,.92],[-.472,.88],
    [-.5,.79],[-.5,.65],[-.481,.62],[-.481,.28],[-.5,.25],
  ],[
    [[-.5,.30],[-.401,.30],[-.347,.34],[-.304,.39]],
    [[-.5,.65],[-.403,.65],[-.351,.69],[-.292,.75]],
  ],{role:'shoulder'});
  // Diagonal boundaries continue into the next pitch. Offsetting the two
  // center lanes removes the artificial horizontal gutter of the first draft.
  const left = block([
    [-.270,.03],[-.166,.26],[-.142,.36],[-.118,.31],[-.028,.61],[-.005,.74],
    [-.005,1.42],[-.069,1.29],[-.071,1.10],[-.112,1.05],[-.111,1.17],[-.178,.99],[-.270,.84],
  ],[
    [[-.250,.29],[-.199,.42],[-.179,.39],[-.087,.68],[-.028,.79]],
    [[-.252,.64],[-.192,.75],[-.174,.71],[-.103,.93],[-.035,1.07]],
  ]);
  const right = block([
    [.025,.08],[.101,.20],[.151,.34],[.168,.30],[.271,.54],
    [.271,1.31],[.190,1.17],[.160,1.23],[.100,1.02],[.120,.96],[.063,.80],[.025,.81],
  ],[
    [[.033,.36],[.099,.44],[.125,.41],[.232,.69]],
    [[.060,.64],[.124,.79],[.150,.75],[.249,1.03]],
  ]);
  // A periodic zig in the medial channel, not a straight central strip.
  const weave = b => {
    const warp=([x,y])=>[x+.021*(1-Math.abs(x)/.28)*Math.sin(2*Math.PI*y),y];
    const outline=[];
    b.points.forEach((a,i)=>{
      const z=b.points[(i+1)%b.points.length],n=Math.max(1,Math.ceil(Math.abs(z[1]-a[1])/.10));
      for(let j=0;j<n;j++)outline.push(warp([a[0]+(z[0]-a[0])*j/n,a[1]+(z[1]-a[1])*j/n]));
    });
    return {...b,points:outline,sipes:b.sipes.map(p=>p.map(warp))};
  };
  return [shoulder, mirror(shoulder,.32), weave(left), weave(right)];
}

// The marked reference pairs are point mirrors: both axial and travel
// coordinates are reversed (a half-turn in the flat tread plane). A width-only
// reflection gives the wrong notch handedness. Two reversals preserve winding.
const oppose = (b, axisY = .5) => ({
  ...mapBlock(b, ([x,y]) => [-x, 2*axisY-y]),
  instance: 'opposed',
});

function rugged(parity) {
  // Four canonical families from the user's color annotations. Never redraw
  // a right-hand partner independently: outlines AND sipes share a transform.
  // Coordinates below are a proportional study of the marked screenshot,
  // with curvature/perspective regularized to a periodic 316 x 80 working grid.
  const fromReference = (points, sipes, originY, family, options = {}) =>
    mapBlock(block(points,sipes,{family,instance:'source',...options}),
      ([x,y]) => [(x-188)/316,(y-originY)/80]);

  // RED: broad shoulder, outer chamfers and the small inward-facing step.
  // Its mate has the same outline turned end-for-end, not merely reflected X.
  const shoulder = fromReference([
    [30,205],[73,204],[93,210],[97,224],[95,241],[89,242],
    [87,263],[65,261],[32,259],[30,245],
  ],[
    [[41,218],[54,218],[64,222],[69,220],[83,224]],
    [[40,237],[51,238],[62,242],[67,240],[80,244]],
  ],195,'shoulder',{role:'shoulder'});

  // ORANGE: one diagonal cranked lug and its exact point-mirrored partner.
  // The side-entry notch is in the outline, so it remains a full-depth void.
  const diagonal = fromReference([
    [113,241],[144,234],[150,261],[136,271],[142,274],[158,265],
    [173,282],[184,301],[157,310],[137,288],[111,274],
  ],[
    [[116,252],[132,252],[136,258],[144,256]],
    [[137,281],[152,292],[158,288],[173,297]],
  ],243,'diagonal');
  const shoulders = [shoulder,oppose(shoulder)];
  if (!(parity % 2)) return [...shoulders,diagonal,oppose(diagonal)];

  // WHITE: the upright cranked lug flanking the green center block. The
  // opposite copy automatically gets the matching lean, step, notch and sipes.
  const upright = fromReference([
    [110,288],[132,302],[151,324],[148,344],[138,377],[120,386],
    [117,359],[102,352],[101,333],[124,342],[126,333],[108,321],[104,309],
  ],[
    [[113,302],[126,312],[128,317],[140,327]],
    [[109,346],[129,355],[132,365]],
  ],320,'upright');

  // GREEN: a centrally symmetric, double-notched S lug. Draw one half of the
  // perimeter and point-mirror it to make the second half, including the sipes.
  // This prevents the previous one-sided slot / mismatched end shapes.
  const half = [[-14,-39],[20,-50],[34,-16],[25,13],[16,-10],[8,-8]];
  const sipe = [[23,-34],[8,-23],[1,-26],[-8,-18]];
  const center = mapBlock(block(
    [...half,...half.map(([x,y])=>[-x,-y])],
    [sipe,sipe.map(([x,y])=>[-x,-y])],
    {family:'center',instance:'self-mirrored'},
  ),([x,y])=>[x/316,.5+y/80]);
  return [...shoulders,upright,center,oppose(upright)];
}

// Reference 4: broad, flat-ended oblique center blocks between hooked shoulder
// paddles. The previous long pointed spears were a wrong interpretation.
export const MUD_MIRROR_AXIS = .825;
function mud() {
  const shoulder = block([
    ...curve([-.5,.79],[-.455,.85],[-.35,.535]),
    ...curve([-.35,.535],[-.278,.245],[-.207,.06]).slice(1),
    [-.170,.115],[-.140,.30],[-.160,.51],[-.210,.64],
    ...curve([-.210,.64],[-.285,.88],[-.390,1.30]).slice(1),
    ...curve([-.390,1.30],[-.470,1.51],[-.5,1.36]).slice(1),
  ],[
    [...curve([-.480,1.055],[-.431,1.166],[-.350,.88]),[-.261,.532],[-.213,.435],[-.178,.506]],
  ],{role:'shoulder',family:'shoulder',instance:'source'});

  // A broad pentagonal bar with two flat ends: no narrow leading needle,
  // trailing spear point, shark-fin notch, or thin zigzag center spine.
  const center = shift(block([
    [-.200,.015],[-.083,.170],[.031,.960],[-.094,.850],[-.160,.410],
  ],[
    [[-.172,.18],[-.120,.32],[-.063,.61],[-.088,.663]],
  ],{family:'center',instance:'source'}),.65);

  const ejector = block([
    [-.476,1.515],[-.385,1.345],[-.381,1.395],[-.472,1.565],
  ],[],{role:'ejector',family:'outer-ejector',instance:'source',heightRatio:.24});
  const innerEjector = block([
    [-.365,1.24],[-.285,.94],[-.280,.99],[-.360,1.29],
  ],[],{role:'ejector',family:'inner-ejector',instance:'source',heightRatio:.24});
  return [shoulder,oppose(shoulder,MUD_MIRROR_AXIS),center,oppose(center,MUD_MIRROR_AXIS),
    ejector,oppose(ejector,MUD_MIRROR_AXIS),innerEjector,oppose(innerEjector,MUD_MIRROR_AXIS)];
}

export function patternBlocks(id, parity = 0) {
  if (id === 'highway') return highway();
  if (id === 'all-terrain') return allTerrain();
  if (id === 'rugged') return rugged(parity);
  if (id === 'mud') return mud();
  return offroadBlocks(id, parity);
}

export const RUGGED_FAMILY_COLORS = { shoulder: '#e64943', upright: '#fff2c1', center: '#58b94a', diagonal: '#e69a36' };
export const MUD_FAMILY_COLORS = { shoulder: '#e69a36', center: '#58b94a', 'outer-ejector': '#fff2c1', 'inner-ejector': '#92cdd8' };

export function patternSVG(id, repeats = 4, { annotate = false } = {}) {
  const p = PATTERNS.find(p => p.id === id);
  if (!p) throw new Error(`Unknown pattern: ${id}`);
  // Show the same aspect ratio as the default physical mesh, not one generic
  // artificially stretched pitch for all four photographs.
  const pitch = 160 * (2*Math.PI*340/p.repeats) / p.width;
  const familyColors = id === 'rugged' ? RUGGED_FAMILY_COLORS : id === 'mud' ? MUD_FAMILY_COLORS : null;
  let paths = '';
  const path = points => points.map(([x,y], j) => `${j?'L':'M'}${(x+.5)*160},${y*pitch}`).join(' ');
  for (let i = -2; i < repeats + 2; i++) {
    for (const source of patternBlocks(id, (i%2+2)%2)) {
      const b = shift(source,i);
      paths += `<path d="${path(b.points)}Z" data-family="${b.family ?? b.role}" fill="currentColor" opacity="${b.role==='ejector'?.4:1}"/>`;
      for (const sipe of b.sipes) paths += `<path d="${path(sipe)}" fill="none" stroke="var(--diagram-bg, #eceeea)" stroke-width="${160*p.sipeWidth/p.width}" stroke-linejoin="round"/>`;
      if (annotate && familyColors) paths += `<path d="${path(b.points)}Z" fill="none" stroke="${familyColors[b.family]}" stroke-width=".7" stroke-linejoin="round"/>`;
    }
  }
  return `<svg viewBox="0 0 160 ${repeats*pitch}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${paths}</svg>`;
}

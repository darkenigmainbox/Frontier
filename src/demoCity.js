// Frontier demo project — full city road network: countryside → city → offroad.
import { createEmptyProject } from './state.js';
import { uid } from './geometry.js';

export function buildDemoProject() {
  const p = createEmptyProject('Frontier — Countryside · City · Offroad');
  p.settings.waterLevel = 1.25;
  p.settings.followTerrain = true;
  p.settings.autoMerge = true;

  // Main river: north → Lake Serene (east of downtown)
  p.rivers.push({
    id: uid('rv'), width: 18, depth: 3.4,
    points: [
      { x: 260, z: -600 }, { x: 275, z: -420 }, { x: 295, z: -250 },
      { x: 308, z: -80 }, { x: 312, z: 80 }, { x: 302, z: 220 },
      { x: 292, z: 320 }, { x: 285, z: 395 },
    ],
  });

  const nodeMap = new Map();
  const key = (x, z) => `${Math.round(x * 10)},${Math.round(z * 10)}`;
  function N(x, z, h = 0) {
    const k = key(x, z);
    if (nodeMap.has(k)) {
      const id = nodeMap.get(k);
      if (h !== 0) p.nodes[id].h = h;
      return id;
    }
    const id = uid('n');
    p.nodes[id] = { id, x, z, h };
    nodeMap.set(k, id);
    return id;
  }
  function road(name, presetId, pts, opts = {}) {
    const nodeIds = pts.map((pt) => N(pt[0], pt[1], pt[2] || 0));
    const id = uid('rd');
    p.roads.push({
      id, name, presetId, nodeIds,
      closed: !!opts.closed,
      bridge: opts.bridge || { enabled: false, height: 6, type: 'beam' },
      smooth: opts.smooth ?? true,
      oneWayOverride: null,
    });
    return id;
  }
  function rail(name, kind, presetId, pts, opts = {}) {
    const nodeIds = pts.map((pt) => N(pt[0], pt[1], pt[2] || 0));
    const id = uid('rl');
    p.rails.push({ id, name, kind, presetId, nodeIds, closed: !!opts.closed, bridge: opts.bridge || null });
    return id;
  }
  function roundabout(x, z, radius = 12) {
    const id = uid('rb');
    const nN = N(x, z - radius), nE = N(x + radius, z), nS = N(x, z + radius), nW = N(x - radius, z);
    p.roundabouts.push({ id, x, z, radius, nodeIds: [nN, nE, nS, nW] });
    return { id, N: nN, E: nE, S: nS, W: nW };
  }
  const at = (id) => { const n = p.nodes[id]; return [n.x, n.z, n.h || 0]; };

  // ================= DOWNTOWN GRID + RING =================
  const G = [-140, -70, 0, 70, 140];
  const R = [-245, ...G, 245];
  const nsPreset = (x) => (x === 0 ? 'arterial4' : (Math.abs(x) === 70 ? 'oneway2' : 'street2'));
  const ewPreset = (z) => (z === 0 ? 'arterial4' : (Math.abs(z) === 70 ? 'street2' : 'oneway2'));
  for (const x of G) road(x === 0 ? 'Central Ave N' : `Downtown St W${x}`, nsPreset(x), R.map((z) => [x, z]));
  for (const z of G) road(z === 0 ? 'Central Ave E' : `Downtown St S${z}`, ewPreset(z), R.map((x) => [x, z]));
  road('Ring N', 'arterial4', R.map((x) => [x, -245]));
  road('Ring S', 'arterial4', R.map((x) => [x, 245]));
  road('Ring W', 'arterial4', R.map((z) => [-245, z]));
  road('Ring E', 'arterial4', R.map((z) => [245, z]));

  // ================= EAST CONNECTORS over river → Frontage =================
  for (const z of [-70, 0, 70]) {
    road(`River Rd approach W z${z}`, 'bridge2', [[245, z], [265, z], [285, z]]);
    road(`River Bridge z${z}`, 'bridge2', [[285, z], [315, z], [345, z]], { bridge: { enabled: true, height: 4.6, type: 'beam' } });
    road(`River Rd approach E z${z}`, 'bridge2', [[345, z], [365, z], [385, z]]);
  }
  // Frontage Ave
  const frontZ = [-320, -240, -150, -70, 0, 70, 150, 240, 320];
  road('Frontage Ave', 'arterialTurn', frontZ.map((z) => [385, z]));

  // ================= HIGHWAY with 2 grade-separated interchanges =================
  const hwNodes = [
    [430, -600, 0], [430, -520, 0], [430, -440, 0], [430, -360, 0], [430, -280, 0],
    [430, -230, 0], [430, -195, 2.5], [430, -168, 5.5], [430, -150, 6.5], [430, -132, 5.5], [430, -105, 2.5],
    [430, -70, 0], [430, 0, 0], [430, 70, 0],
    [430, 105, 2.5], [430, 132, 5.5], [430, 150, 6.5], [430, 168, 5.5], [430, 195, 2.5],
    [430, 230, 0], [430, 280, 0], [430, 360, 0], [430, 440, 0], [430, 520, 0], [430, 600, 0],
  ];
  road('Frontier Freeway', 'freeway6', hwNodes, { bridge: { enabled: true, height: 0, type: 'beam' } });

  // Interchanges at z=±150: cross streets + roundabouts + ramps
  for (const zc of [-150, 150]) {
    const s = Math.sign(zc);
    const rbW = roundabout(412, zc, 12);
    const rbE = roundabout(468, zc, 12);
    const wW = at(rbW.W), wE = at(rbW.E), eW = at(rbE.W), eE = at(rbE.E);
    road(`Xchange W z${zc}`, 'arterialTurn', [[385, zc], wW]);
    road(`Xchange underpass z${zc}`, 'arterialTurn', [wE, eW]);
    road(`Xchange E z${zc}`, 'arterialTurn', [eE, [510, zc], [545, zc]]);
    // ramps: roundabout N/S → highway flanks (shared nodes, lifts climb)
    const flankN = [430, zc - s * 45, 2.5]; // toward center? no—away
    const flankS = [430, zc + s * 45, 2.5];
    // NOTE: flanks are the h=2.5 highway nodes: zc±45 → -195/-105 ✓
    const ramps = [
      [at(rbW.N), [421, zc - s * 26, 1.2], flankN],
      [at(rbW.S), [421, zc + s * 26, 1.2], flankS],
      [at(rbE.N), [449, zc - s * 26, 1.2], flankN],
      [at(rbE.S), [449, zc + s * 26, 1.2], flankS],
    ];
    ramps.forEach((pts, i) => road(`Ramp ${zc}·${i + 1}`, 'alley', pts,
      // south interchange ramps hop over the rail cutting on short bridges
      (zc > 0 && i % 2 === 1) ? { bridge: { enabled: true, height: 3.2, type: 'beam' } } : {}));
  }

  // ================= SOUTH SUBURBS (curvy residential) =================
  for (const z of [300, 365, 430]) {
    const pts = [];
    const xEnd = z === 430 ? 120 : 180;
    for (let x = -280; x <= xEnd; x += 46) pts.push([x, z + Math.sin(x * 0.02 + z) * 10]);
    road(`Suburb Ln z${z}`, 'residential', pts);
  }
  for (const x of [-220, -120, -20]) {
    const pts = [];
    for (let z = 245; z <= 500; z += 44) pts.push([x + Math.cos(z * 0.025 + x) * 9, z]);
    road(`Suburb Ave x${x}`, 'residential', pts);
  }

  // ================= WEST COUNTRYSIDE =================
  for (const x of [-320, -400, -540]) {
    road(`Farm Rd x${x}`, 'rural2', [[x, -520], [x + 8, -320], [x - 6, -120], [x + 6, 120], [x - 4, 320], [x, 520]]);
  }
  for (const z of [-260, -60, 160, 360]) {
    road(`Country Ln z${z}`, 'rural2', [[-580, z], [-460, z + 6], [-340, z - 6], [-245, z]]);
  }
  // scenic dirt loop around tarn + connector
  const tarnLoop = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    tarnLoop.push([-470 + Math.cos(a) * 82, -420 + Math.sin(a) * 82]);
  }
  road('Tarn Loop', 'dirt', tarnLoop, { closed: true });
  road('Tarn connector', 'dirt', [[-540, -420], [-552, -420]]);
  road('Farm track N', 'dirt', [[-400, -520], [-430, -560], [-480, -585]]);
  road('Farm track S', 'dirt', [[-320, 520], [-300, 565], [-260, 590]]);

  // ================= EAST OFFROAD =================
  road('Ridge dirt', 'dirt', [[545, 150], [560, 120], [575, 90]]);
  road('Ridgeline Trail', 'trail', [
    [560, 120], [585, 40], [575, -80], [540, -180], [495, -140], [490, -20], [505, 90],
  ], { closed: true });
  road('Summit spur', 'trail', [[540, -180], [560, -230], [575, -290]]);
  road('Lakeshore trail', 'trail', [[505, 90], [470, 160], [430, 230], [400, 290]]);

  // ================= HEAVY RAIL (E–W, level crossings + river bridge) =================
  rail('Valley Line W', 'rail', 'railDouble', [[-600, 175], [-400, 175], [-200, 175], [0, 175], [250, 175]]);
  rail('Valley Viaduct', 'rail', 'railDouble', [[250, 175], [305, 175], [360, 175]], { bridge: { enabled: true, height: 4.2, type: 'beam' } });
  rail('Valley Line E', 'rail', 'railDouble', [[360, 175], [430, 175], [520, 175], [600, 175]]);

  // ================= MONORAIL (downtown loop + lakeside spur) =================
  rail('Skyloop', 'monorail', 'monorail', [
    [150, -150], [0, -150], [-150, -150], [-150, 0], [-150, 150], [0, 150], [150, 150], [150, 0],
  ], { closed: true });
  rail('Lakeshore Shuttle', 'monorail', 'monorail', [[150, 0], [240, 60], [300, 180], [285, 250], [272, 305]]);

  // station hall landmark
  p.buildingsManual.push({ x: 28, z: 208, w: 34, d: 15, h: 9, rot: 0, color: '#7d8ca3', type: 'station', windows: true });
  p.buildingsManual.push({ x: -28, z: 208, w: 20, d: 12, h: 6, rot: 0, color: '#a8b0bd', type: 'block', windows: true });

  return p;
}

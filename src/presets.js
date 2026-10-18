// Frontier preset library — road / rail / monorail cross-sections.
// Widths in meters. Lanes counted per direction.
export const ROAD_PRESETS = {
  freeway6: {
    id: 'freeway6', kind: 'road', cat: 'highway', name: 'Freeway 2×3',
    desc: '6-lane divided freeway · barrier median',
    lanesFwd: 3, lanesBwd: 3, laneWidth: 3.6, medianWidth: 4.0, medianType: 'barrier',
    shoulder: 3.0, sidewalkL: false, sidewalkR: false, sidewalkWidth: 0,
    parking: false, center: 'barrier', laneMark: 'dashedWhite', edgeMark: true,
    crosswalk: false, asphalt: '#33373d', designSpeed: 120, oneWay: false,
  },
  highway4: {
    id: 'highway4', kind: 'road', cat: 'highway', name: 'Highway 2×2',
    desc: '4-lane divided highway · grass median',
    lanesFwd: 2, lanesBwd: 2, laneWidth: 3.5, medianWidth: 5.0, medianType: 'grass',
    shoulder: 2.5, sidewalkL: false, sidewalkR: false, sidewalkWidth: 0,
    parking: false, center: 'none', laneMark: 'dashedWhite', edgeMark: true,
    crosswalk: false, asphalt: '#36393f', designSpeed: 100, oneWay: false,
  },
  arterial4: {
    id: 'arterial4', kind: 'road', cat: 'urban', name: 'Arterial 2×2',
    desc: 'City arterial · double-yellow · sidewalks',
    lanesFwd: 2, lanesBwd: 2, laneWidth: 3.3, medianWidth: 0, medianType: 'none',
    shoulder: 0.5, sidewalkL: true, sidewalkR: true, sidewalkWidth: 2.6,
    parking: false, center: 'doubleYellow', laneMark: 'dashedWhite', edgeMark: true,
    crosswalk: true, asphalt: '#3a3d43', designSpeed: 60, oneWay: false,
  },
  arterialTurn: {
    id: 'arterialTurn', kind: 'road', cat: 'urban', name: 'Arterial + turn lane',
    desc: '2 lanes + center turn lane · sidewalks',
    lanesFwd: 1, lanesBwd: 1, laneWidth: 3.3, medianWidth: 3.0, medianType: 'paint',
    shoulder: 0.5, sidewalkL: true, sidewalkR: true, sidewalkWidth: 2.4,
    parking: false, center: 'turnLane', laneMark: 'dashedWhite', edgeMark: true,
    crosswalk: true, asphalt: '#3a3d43', designSpeed: 50, oneWay: false,
  },
  street2: {
    id: 'street2', kind: 'road', cat: 'urban', name: 'Urban street',
    desc: '1×1 + parking both sides · sidewalks',
    lanesFwd: 1, lanesBwd: 1, laneWidth: 3.1, medianWidth: 0, medianType: 'none',
    shoulder: 2.2, sidewalkL: true, sidewalkR: true, sidewalkWidth: 2.2,
    parking: true, center: 'dashedYellow', laneMark: 'none', edgeMark: false,
    crosswalk: true, asphalt: '#3c4046', designSpeed: 40, oneWay: false,
  },
  oneway2: {
    id: 'oneway2', kind: 'road', cat: 'urban', name: 'One-way 2-lane',
    desc: 'One-way pair · parking · wide sidewalks',
    lanesFwd: 2, lanesBwd: 0, laneWidth: 3.1, medianWidth: 0, medianType: 'none',
    shoulder: 2.0, sidewalkL: true, sidewalkR: true, sidewalkWidth: 3.0,
    parking: true, center: 'none', laneMark: 'dashedWhite', edgeMark: false,
    crosswalk: true, asphalt: '#3c4046', designSpeed: 40, oneWay: true,
  },
  alley: {
    id: 'alley', kind: 'road', cat: 'urban', name: 'Alley',
    desc: 'Narrow service lane · no markings',
    lanesFwd: 1, lanesBwd: 0, laneWidth: 3.4, medianWidth: 0, medianType: 'none',
    shoulder: 0.3, sidewalkL: false, sidewalkR: false, sidewalkWidth: 0,
    parking: false, center: 'none', laneMark: 'none', edgeMark: false,
    crosswalk: false, asphalt: '#43464c', designSpeed: 15, oneWay: true,
  },
  residential: {
    id: 'residential', kind: 'road', cat: 'urban', name: 'Residential lane',
    desc: 'Quiet street · driveways + ramps',
    lanesFwd: 1, lanesBwd: 1, laneWidth: 2.9, medianWidth: 0, medianType: 'none',
    shoulder: 1.2, sidewalkL: true, sidewalkR: true, sidewalkWidth: 1.8,
    parking: false, center: 'none', laneMark: 'none', edgeMark: false,
    crosswalk: true, driveways: true, asphalt: '#3e4247', designSpeed: 30, oneWay: false,
  },
  rural2: {
    id: 'rural2', kind: 'road', cat: 'rural', name: 'Rural two-lane',
    desc: 'Country road · gravel shoulders',
    lanesFwd: 1, lanesBwd: 1, laneWidth: 3.4, medianWidth: 0, medianType: 'none',
    shoulder: 1.5, sidewalkL: false, sidewalkR: false, sidewalkWidth: 0,
    parking: false, center: 'dashedWhite', laneMark: 'none', edgeMark: true,
    crosswalk: false, asphalt: '#3f434a', designSpeed: 80, oneWay: false,
  },
  scenic: {
    id: 'scenic', kind: 'road', cat: 'rural', name: 'Scenic lane',
    desc: 'Narrow countryside lane · grass verge',
    lanesFwd: 1, lanesBwd: 1, laneWidth: 2.7, medianWidth: 0, medianType: 'none',
    shoulder: 0.8, sidewalkL: false, sidewalkR: false, sidewalkWidth: 0,
    parking: false, center: 'none', laneMark: 'none', edgeMark: false,
    crosswalk: false, asphalt: '#4a4c4b', designSpeed: 50, oneWay: false,
  },
  dirt: {
    id: 'dirt', kind: 'road', cat: 'rural', name: 'Dirt / gravel',
    desc: 'Unpaved · dusty twin-track',
    lanesFwd: 1, lanesBwd: 1, laneWidth: 2.6, medianWidth: 0, medianType: 'none',
    shoulder: 0.6, sidewalkL: false, sidewalkR: false, sidewalkWidth: 0,
    parking: false, center: 'none', laneMark: 'none', edgeMark: false,
    crosswalk: false, asphalt: '#7a6748', unpaved: true, designSpeed: 40, oneWay: false,
  },
  trail: {
    id: 'trail', kind: 'road', cat: 'rural', name: 'Offroad trail',
    desc: 'Single-track · 4×4 / hiking',
    lanesFwd: 1, lanesBwd: 0, laneWidth: 2.4, medianWidth: 0, medianType: 'none',
    shoulder: 0.4, sidewalkL: false, sidewalkR: false, sidewalkWidth: 0,
    parking: false, center: 'none', laneMark: 'none', edgeMark: false,
    crosswalk: false, asphalt: '#6e5f45', unpaved: true, designSpeed: 20, oneWay: false, narrow: true,
  },
  promenade: {
    id: 'promenade', kind: 'road', cat: 'urban', name: 'Promenade',
    desc: 'Pedestrian + bike · pavers',
    lanesFwd: 0, lanesBwd: 0, laneWidth: 0, medianWidth: 8.0, medianType: 'paver',
    shoulder: 0, sidewalkL: true, sidewalkR: true, sidewalkWidth: 3.0,
    parking: false, center: 'none', laneMark: 'none', edgeMark: false,
    crosswalk: false, asphalt: '#8f8a7c', designSpeed: 5, oneWay: false, pedestrian: true,
  },
  viaduct4: {
    id: 'viaduct4', kind: 'road', cat: 'bridge', name: 'Viaduct 2×2',
    desc: 'Elevated bridge · railings + piers',
    lanesFwd: 2, lanesBwd: 2, laneWidth: 3.4, medianWidth: 2.0, medianType: 'barrier',
    shoulder: 1.5, sidewalkL: true, sidewalkR: true, sidewalkWidth: 1.6,
    parking: false, center: 'barrier', laneMark: 'dashedWhite', edgeMark: true,
    crosswalk: false, asphalt: '#383b41', designSpeed: 80, oneWay: false,
    defaultBridge: true, bridgeHeight: 7,
  },
  bridge2: {
    id: 'bridge2', kind: 'road', cat: 'bridge', name: 'Bridge 1×1',
    desc: 'Two-lane beam bridge · walkways',
    lanesFwd: 1, lanesBwd: 1, laneWidth: 3.4, medianWidth: 0, medianType: 'none',
    shoulder: 1.0, sidewalkL: true, sidewalkR: true, sidewalkWidth: 1.6,
    parking: false, center: 'doubleYellow', laneMark: 'none', edgeMark: true,
    crosswalk: false, asphalt: '#383b41', designSpeed: 60, oneWay: false,
    defaultBridge: true, bridgeHeight: 6,
  },
  causeway: {
    id: 'causeway', kind: 'road', cat: 'bridge', name: 'Causeway',
    desc: 'Low lake crossing · guardrails',
    lanesFwd: 1, lanesBwd: 1, laneWidth: 3.2, medianWidth: 0, medianType: 'none',
    shoulder: 1.2, sidewalkL: false, sidewalkR: false, sidewalkWidth: 0,
    parking: false, center: 'dashedWhite', laneMark: 'none', edgeMark: true,
    crosswalk: false, asphalt: '#3a3d43', designSpeed: 60, oneWay: false,
    defaultBridge: true, bridgeHeight: 3,
  },
  railDouble: {
    id: 'railDouble', kind: 'rail', cat: 'rail', name: 'Heavy rail ×2',
    desc: 'Double-track main line · ballast',
    tracks: 2, trackGauge: 1.435, trackSpacing: 4.2, ballastWidth: 10.5,
    asphalt: '#4a4038', designSpeed: 120,
  },
  railSingle: {
    id: 'railSingle', kind: 'rail', cat: 'rail', name: 'Branch line ×1',
    desc: 'Single-track branch · level crossings',
    tracks: 1, trackGauge: 1.435, trackSpacing: 0, ballastWidth: 5.5,
    asphalt: '#4a4038', designSpeed: 80,
  },
  monorail: {
    id: 'monorail', kind: 'monorail', cat: 'rail', name: 'Monorail beam',
    desc: 'Elevated straddle beam · pillars',
    beamWidth: 0.9, beamHeight: 1.4, elevation: 6.8, pillarEvery: 20,
    asphalt: '#9aa3ad', designSpeed: 90,
  },
};

export function presetList() { return Object.values(ROAD_PRESETS); }

export function getPreset(id) { return ROAD_PRESETS[id] || ROAD_PRESETS.street2; }

// Total asphalt half-width (one side from centerline)
export function asphaltHalfWidth(preset) {
  if (preset.kind === 'rail') return (preset.ballastWidth || 8) / 2;
  if (preset.kind === 'monorail') return 2.2;
  const lanes = (preset.lanesFwd || 0) + (preset.lanesBwd || 0);
  if (preset.pedestrian) return (preset.medianWidth || 8) / 2;
  const laneSpan = lanes * (preset.laneWidth || 3.2);
  const median = preset.medianWidth || 0;
  const sh = (preset.shoulder || 0) * 2;
  return (laneSpan + median + sh) / 2;
}

export function corridorHalfWidth(preset) {
  let hw = asphaltHalfWidth(preset);
  if (preset.sidewalkL || preset.sidewalkR) hw += (preset.sidewalkWidth || 2) + 0.5;
  return hw + 1.0;
}

// Lane boundary offsets from center (for markings), + = left side
export function laneBoundaries(preset) {
  const out = [];
  if (preset.kind !== 'road' || preset.pedestrian) return out;
  const lf = preset.lanesFwd || 0, lb = preset.lanesBwd || 0;
  const w = preset.laneWidth || 3.2;
  const med = preset.medianWidth || 0;
  // forward lanes occupy +med/2 .. +med/2+lf*w ; backward mirrored
  for (let i = 1; i < lf; i++) out.push(med / 2 + i * w);
  for (let i = 1; i < lb; i++) out.push(-(med / 2 + i * w));
  return out;
}

// Draw cross-section thumbnail
export function drawPresetThumb(canvas, preset) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width = 152, H = canvas.height = 68;
  ctx.fillStyle = '#0b0e13'; ctx.fillRect(0, 0, W, H);
  // ground
  ctx.fillStyle = '#2f6b3c'; ctx.fillRect(0, H - 14, W, 14);
  const cx = W / 2, baseY = H - 14;
  const pxPerM = 3.4;
  if (preset.kind === 'monorail') {
    // pillar + beam + train
    ctx.fillStyle = '#7c8592';
    ctx.fillRect(cx - 3, baseY - 44, 6, 44);
    ctx.fillStyle = '#c7ced6';
    ctx.fillRect(cx - 26, baseY - 52, 52, 8);
    ctx.fillStyle = '#5aa9ff';
    ctx.fillRect(cx - 30, baseY - 70, 60, 18);
    ctx.fillStyle = '#dfe9f5';
    for (let i = 0; i < 4; i++) ctx.fillRect(cx - 25 + i * 14, baseY - 66, 10, 8);
    return;
  }
  if (preset.kind === 'rail') {
    const bw = (preset.ballastWidth || 8) * pxPerM;
    ctx.fillStyle = '#5a4f44'; ctx.fillRect(cx - bw / 2, baseY - 8, bw, 8);
    const tracks = preset.tracks || 1;
    for (let t = 0; t < tracks; t++) {
      const off = tracks === 1 ? 0 : (t === 0 ? -1 : 1) * (preset.trackSpacing || 4.2) * pxPerM / 2;
      ctx.fillStyle = '#6e5b45';
      for (let i = 0; i < 9; i++) ctx.fillRect(cx + off - 12 + i * 3, baseY - 11, 2, 3);
      ctx.fillStyle = '#c9cfd8';
      ctx.fillRect(cx + off - 5, baseY - 14, 2, 4);
      ctx.fillRect(cx + off + 3, baseY - 14, 2, 4);
    }
    return;
  }
  const hw = asphaltHalfWidth(preset);
  const sw = preset.sidewalkWidth || 0;
  const totHW = hw + ((preset.sidewalkL || preset.sidewalkR) ? sw * pxPerM * 0.28 : 0);
  const scale = Math.min(1, 66 / (totHW * 2 + 8));
  const ax0 = cx - hw * pxPerM * scale, ax1 = cx + hw * pxPerM * scale;
  // sidewalks
  if (preset.sidewalkL) { ctx.fillStyle = '#9aa0a8'; ctx.fillRect(ax0 - sw * 4 * scale, baseY - 10, sw * 4 * scale, 10); }
  if (preset.sidewalkR) { ctx.fillStyle = '#9aa0a8'; ctx.fillRect(ax1, baseY - 10, sw * 4 * scale, 10); }
  // asphalt
  ctx.fillStyle = preset.unpaved ? '#7a6748' : (preset.pedestrian ? '#8f8a7c' : '#41454c');
  ctx.fillRect(ax0, baseY - 7, ax1 - ax0, 7);
  // median
  const med = (preset.medianWidth || 0) * pxPerM * scale;
  if (med > 1) {
    ctx.fillStyle = preset.medianType === 'grass' ? '#3f7a44' : preset.medianType === 'barrier' ? '#c9cfd8' : '#d8b13c';
    ctx.fillRect(cx - med / 2, baseY - 9, med, 2.5);
  }
  // center marking
  if (preset.center === 'doubleYellow') { ctx.fillStyle = '#e8b93c'; ctx.fillRect(cx - 2, baseY - 7, 1.6, 7); ctx.fillRect(cx + 0.6, baseY - 7, 1.6, 7); }
  else if (preset.center === 'dashedYellow' || preset.center === 'dashedWhite') { ctx.fillStyle = preset.center === 'dashedYellow' ? '#e8b93c' : '#e8ecf2'; for (let i = 0; i < 3; i++) ctx.fillRect(cx - 1, baseY - 7 + i * 2.6, 2, 1.4); }
  // lane marks
  ctx.fillStyle = '#dfe4ec';
  const bounds = laneBoundaries(preset);
  for (const b of bounds) {
    const x = cx + b * pxPerM * scale;
    for (let i = 0; i < 3; i++) ctx.fillRect(x - 0.8, baseY - 7 + i * 2.6, 1.6, 1.4);
  }
}

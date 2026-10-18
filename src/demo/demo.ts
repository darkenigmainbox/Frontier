// ─── Demo project: "Frontier City" — countryside → city → offroad ───────────
// A complete road network with highway, boulevards, streets, suburbs, farms,
// mountain trails, a river + lake, bridges, heavy rail with level crossings,
// an elevated monorail, block buildings and low-poly forest.

import { hash2, spline, type Pt } from '../core/math.ts';
import {
  emptyProject, newId, type Building, type Lake, type Project,
  type RailStroke, type RiverStroke, type RoadStroke, type TerrainEdit, type Tree,
} from '../core/types.ts';
import { buildingColorFor, scatterTrees } from '../gen/city.ts';
import { HeightField } from '../gen/terrain.ts';

function road(id: string, typeId: string, pts: Pt[], opts: Partial<RoadStroke> = {}): RoadStroke {
  return {
    id,
    kind: 'road',
    typeId,
    points: pts.map((p) => ({ x: p.x, z: p.y })),
    ...opts,
  };
}

function sp(waypoints: [number, number][], samples = 7): Pt[] {
  return spline(waypoints.map(([x, y]) => ({ x, y })), samples);
}

function rail(id: string, typeId: string, pts: Pt[], opts: Partial<RailStroke> = {}): RailStroke {
  return {
    id,
    kind: 'rail',
    typeId,
    points: pts.map((p) => ({ x: p.x, z: p.y })),
    ...opts,
  };
}

function river(id: string, width: number, pts: Pt[]): RiverStroke {
  return {
    id,
    kind: 'river',
    width,
    points: pts.map((p) => ({ x: p.x, z: p.y })),
    name: 'Frontier River',
  };
}

export function createDemoProject(): Project {
  const p = emptyProject('Frontier City');
  p.terrain.size = 2400;
  p.terrain.res = 193;
  p.terrain.seed = 11;
  p.terrain.amplitude = 14;
  p.water.level = 6;
  p.settings.gridSnap = 5;

  // ── Terrain shaping ────────────────────────────────────────────────────────
  const edits: TerrainEdit[] = [
    // City plain (east-centre) — flat for the street grid
    { x: 430, z: 190, r: 640, d: 1, mode: 'flatten', t: 11 },
    // Suburb shelf (west of city)
    { x: -180, z: 240, r: 460, d: 0.85, mode: 'flatten', t: 13 },
    // Farm meadows (south-west)
    { x: -560, z: 480, r: 420, d: 0.7, mode: 'flatten', t: 15 },
    // NW mountains
    { x: -820, z: -820, r: 560, d: 62, mode: 'raise' },
    { x: -520, z: -1020, r: 420, d: 44, mode: 'raise' },
    { x: -1080, z: -480, r: 380, d: 38, mode: 'raise' },
    // North ridge
    { x: -80, z: -1040, r: 480, d: 34, mode: 'raise' },
    // East hills behind the lake
    { x: 1080, z: -420, r: 420, d: 30, mode: 'raise' },
    { x: 1120, z: 40, r: 340, d: 22, mode: 'raise' },
    // SE offroad hills
    { x: 860, z: 820, r: 520, d: 36, mode: 'raise' },
    { x: 520, z: 1040, r: 380, d: 26, mode: 'raise' },
    // Lake basin
    { x: 780, z: -350, r: 215, d: 20, mode: 'lower' },
    // River valley (carved wide, detailed carve happens at build time)
    { x: -560, z: -780, r: 220, d: 18, mode: 'lower' },
    { x: -380, z: -520, r: 200, d: 14, mode: 'lower' },
    { x: -240, z: -300, r: 180, d: 12, mode: 'lower' },
    { x: -40, z: -140, r: 190, d: 10, mode: 'lower' },
    { x: 220, z: -160, r: 180, d: 8, mode: 'lower' },
    { x: 460, z: -230, r: 200, d: 8, mode: 'lower' },
    // Offroad valley floor
    { x: 620, z: 640, r: 300, d: 0.8, mode: 'flatten', t: 16 },
    // Smooth the mountain-to-plain transition
    { x: -200, z: -620, r: 320, d: 1, mode: 'smooth' },
    { x: 300, z: -560, r: 300, d: 1, mode: 'smooth' },
    { x: 900, z: 480, r: 320, d: 1, mode: 'smooth' },
    // Sandy beach ring around the lake
    { x: 780, z: -350, r: 200, d: 1, mode: 'paint', p: 2 },
  ];
  p.terrain.edits = edits;

  // ── Water ─────────────────────────────────────────────────────────────────
  const silverLake: Lake = {
    id: 'lake_silver', x: 780, z: -350, radius: 150, wobble: 0.18, seed: 41,
  };
  p.water.lakes = [silverLake];

  const frontierRiver = river('river_frontier', 52, sp([
    [-980, -1180], [-820, -960], [-680, -760], [-540, -560], [-420, -380],
    [-280, -250], [-90, -150], [120, -150], [330, -210], [530, -280], [680, -320],
  ], 6));

  // ── Highways & intercity roads ────────────────────────────────────────────
  const highwayA1 = road('hwy_a1', 'highway-4', sp([
    [-1180, -560], [-880, -470], [-600, -380], [-340, -280], [-60, -200],
    [220, -230], [520, -330], [820, -430], [1120, -520],
  ], 8), { name: 'A1 Frontier Highway' });

  const expresswayE4 = road('exp_e4', 'expressway-4', sp([
    [-1150, 180], [-820, 120], [-520, 60], [-240, 20], [40, 60],
    [300, 140], [520, 260], [700, 420], [900, 620], [1080, 840],
  ], 8), { name: 'E4 Foothill Expressway' });

  // ── City grid (east-centre) ───────────────────────────────────────────────
  const city: RoadStroke[] = [];
  // Grand Avenue (N–S, 2+2)
  city.push(road('av_grand', 'avenue-4', [
    { x: 300, y: -120 }, { x: 300, y: 200 }, { x: 300, y: 560 },
  ], { name: 'Grand Avenue' }));
  // Harbour Avenue (N–S)
  city.push(road('av_harbour', 'avenue-4', [
    { x: 560, y: -160 }, { x: 560, y: 220 }, { x: 560, y: 580 },
  ], { name: 'Harbour Avenue' }));
  // Market Boulevard (E–W, 3+3 with median)
  city.push(road('blvd_market', 'boulevard-6', [
    { x: 40, y: 140 }, { x: 380, y: 140 }, { x: 820, y: 140 }, { x: 980, y: 120 },
  ], { name: 'Market Boulevard' }));
  // Station Boulevard (E–W)
  city.push(road('blvd_station', 'boulevard-6', [
    { x: 60, y: 380 }, { x: 420, y: 380 }, { x: 820, y: 380 },
  ], { name: 'Station Boulevard' }));
  // Streets N–S
  for (const [id, x] of [['st_n1', 180], ['st_n2', 420], ['st_n3', 680], ['st_n4', 820]] as const) {
    city.push(road(id, 'street-2', [
      { x, y: -80 }, { x, y: 140 }, { x, y: 380 }, { x, y: 540 },
    ]));
  }
  // Streets E–W
  for (const [id, z] of [['st_e1', 20], ['st_e2', 260], ['st_e3', 500]] as const) {
    city.push(road(id, 'street-2', [
      { x: 60, y: z }, { x: 300, y: z }, { x: 560, y: z }, { x: 820, y: z },
    ]));
  }
  // Cycle street along the waterfront
  city.push(road('st_cycle', 'street-bike', [
    { x: 420, y: -110 }, { x: 560, y: -150 }, { x: 720, y: -120 }, { x: 900, y: -60 },
  ], { name: 'Lakeview Cycleway' }));

  // ── Suburbs (curvy residential west of the city) ──────────────────────────
  const suburb: RoadStroke[] = [
    road('sub_loop_a', 'residential', sp([
      [40, 300], [-90, 330], [-210, 300], [-300, 220], [-330, 120], [-260, 60], [-140, 60], [-40, 110],
    ], 6), { name: 'Maple Loop' }),
    road('sub_loop_b', 'residential', sp([
      [-60, 470], [-180, 500], [-300, 470], [-380, 390], [-390, 290],
    ], 6), { name: 'Cedar Close' }),
    road('sub_link', 'residential', sp([
      [-210, 300], [-180, 400], [-120, 470], [-60, 470],
    ], 6)),
    road('sub_link_b', 'street-2', [
      { x: -40, y: 110 }, { x: 60, y: 80 }, { x: 60, y: 20 },
    ]),
  ];

  // ── Countryside lanes ─────────────────────────────────────────────────────
  const rural: RoadStroke[] = [
    road('rural_farm', 'rural-2', sp([
      [-600, -370], [-640, -180], [-700, 40], [-720, 280], [-640, 480], [-520, 620], [-360, 700],
    ], 7), { name: 'Mill Road' }),
    road('rural_north', 'rural-gravel', sp([
      [-340, -280], [-380, -480], [-300, -680], [-120, -820], [120, -880], [340, -820],
    ], 7), { name: 'North Ridge Road' }),
    road('rural_lake', 'rural-2', sp([
      [60, -60], [240, -48], [430, -42], [640, -52], [820, -78], [980, -140], [1080, -230],
    ], 7), { name: 'Lake Road' }),
    road('farm_track', 'rural-1', sp([
      [-720, 280], [-860, 360], [-980, 520], [-1040, 720],
    ], 6), { name: 'Farm Track' }),
  ];

  // ── Offroad trails (SE hills) ─────────────────────────────────────────────
  const offroad: RoadStroke[] = [
    road('off_switchback', 'mountain-pass', sp([
      [560, 600], [700, 660], [620, 740], [760, 800], [680, 880], [820, 940], [760, 1040], [900, 1100],
    ], 6), { name: 'Dustdevil Switchbacks' }),
    road('off_trail_s', 'dirt-track', sp([
      [900, 520], [1020, 620], [1080, 780], [1020, 940], [1120, 1060],
    ], 6), { name: 'East Ridge Trail' }),
    road('off_trail_w', 'offroad-trail', sp([
      [-360, 700], [-260, 820], [-80, 900], [140, 920], [360, 860], [560, 600],
    ], 6), { name: 'Meadow Trail' }),
  ];

  // ── Pedestrian plaza in the city core (block between Harbour Ave & St N3) ──
  const plaza = road('plaza_core', 'pedestrian', [
    { x: 455, y: 295 }, { x: 535, y: 295 }, { x: 535, y: 355 }, { x: 455, y: 355 }, { x: 455, y: 295 },
  ], { name: 'Foundry Plaza' });

  // ── Heavy rail: cuts through countryside and city streets ─────────────────
  const mainline = rail('rail_main', 'train', sp([
    [-1180, -700], [-900, -620], [-620, -520], [-380, -360], [-200, -140],
    [-20, 120], [180, 340], [420, 520], [720, 660], [1020, 780], [1180, 860],
  ], 8), { name: 'Frontier Mainline' });

  const freightSpur = rail('rail_spur', 'train', sp([
    [-200, -140], [-420, -80], [-680, -40], [-940, -80],
  ], 7), { name: 'Quarry Spur' });

  // ── Monorail: elevated line from suburbs through downtown, over the lake ──
  const monorailLine = rail('rail_mono', 'monorail', sp([
    [-520, 210], [-280, 150], [-20, 110], [220, 150], [420, 210],
    [620, 280], [820, 330], [980, 250], [1040, 60], [960, -140],
    [780, -230], [620, -180], [560, -60],
  ], 8), { name: 'Skyline Monorail', elevated: true });

  const monoSpur = rail('rail_mono_spur', 'monorail', [
    { x: 300, y: -120 }, { x: 320, y: 140 }, { x: 340, y: 380 }, { x: 350, y: 560 },
  ], { name: 'Monorail Grand Spur', elevated: true });

  // ── Service roads ─────────────────────────────────────────────────────────
  const service = [
    road('svc_dock', 'service', [
      { x: 900, y: -60 }, { x: 980, y: -180 }, { x: 1040, y: -320 },
    ], { name: 'Dock Service Road' }),
    road('svc_quarry', 'service', sp([
      [-940, -80], [-1020, 140], [-980, 320],
    ], 6)),
  ];

  p.strokes = [
    frontierRiver,
    highwayA1, expresswayE4,
    ...city, ...suburb, ...rural, ...offroad, plaza,
    mainline, freightSpur, monorailLine, monoSpur,
    ...service,
  ];

  // ── Buildings ─────────────────────────────────────────────────────────────
  const buildings: Building[] = [];
  // Downtown blocks: x lines [60..820], z lines [-80..540] avoiding the road corridors
  const blockX = [60, 180, 300, 420, 560, 680, 820];
  const blockZ = [-80, 20, 140, 260, 380, 500, 560];
  for (let bi = 0; bi < blockX.length - 1; bi++) {
    for (let bj = 0; bj < blockZ.length - 1; bj++) {
      const x0 = blockX[bi] + 14, x1 = blockX[bi + 1] - 14;
      const z0 = blockZ[bj] + 14, z1 = blockZ[bj + 1] - 14;
      if (x1 - x0 < 30 || z1 - z0 < 30) continue;
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      // plaza block stays open
      if (cx > 430 && cx < 560 && cz > 270 && cz < 380) continue;
      const dens = 1 - Math.min(1, Math.hypot(cx - 430, cz - 220) / 700);
      const count = 2 + Math.floor(hash2(bi, bj, 3) * 3 + dens * 2);
      for (let k = 0; k < count; k++) {
        const r1 = hash2(bi * 7 + k, bj * 13 + k, 21);
        const r2 = hash2(bi * 3 + k, bj * 5 + k, 55);
        const r3 = hash2(bi + k * 11, bj + k * 17, 77);
        const w = 18 + r1 * 34, d = 18 + r2 * 30;
        const px = x0 + w / 2 + r3 * Math.max(1, x1 - x0 - w);
        const pz = z0 + d / 2 + r2 * Math.max(1, z1 - z0 - d);
        const h = 8 + dens * dens * 60 + r1 * 18;
        const type = h > 44 ? 'tower' : h > 18 ? 'block' : 'shop';
        buildings.push({
          id: newId('bld'), x: px, z: pz, w, d, h,
          rot: 0,
          color: buildingColorFor(type, h, r3),
          roof: h > 30 ? 'flat' : r3 > 0.5 ? 'gable' : 'hip',
          type,
        });
      }
    }
  }
  // Landmark towers
  buildings.push(
    { id: 'bld_tower_a', x: 430, z: 250, w: 42, d: 42, h: 88, rot: 0, color: '#8d98a8', roof: 'flat', type: 'tower' },
    { id: 'bld_tower_b', x: 520, z: 300, w: 36, d: 36, h: 72, rot: 0, color: '#7e8894', roof: 'flat', type: 'tower' },
  );
  // Suburb houses along the loops
  const housePts: [number, number][] = [
    [-90, 280], [-180, 260], [-260, 190], [-290, 120], [-200, 90], [-110, 95],
    [-140, 430], [-240, 440], [-330, 400], [-350, 330], [-120, 520], [-220, 530],
  ];
  for (const [hx, hz] of housePts) {
    buildings.push({
      id: newId('house'), x: hx + hash2(hx, hz, 9) * 24, z: hz + hash2(hz, hx, 4) * 24,
      w: 12 + hash2(hx, hz, 2) * 8, d: 10 + hash2(hz, hx, 3) * 7,
      h: 6.5 + hash2(hx, hz, 6) * 3.5,
      rot: hash2(hx, hz, 8) * Math.PI,
      color: buildingColorFor('house', 8, hash2(hx, hz, 11)),
      roof: hash2(hx, hz, 12) > 0.35 ? 'gable' : 'hip',
      type: 'house',
    });
  }
  // Farms & barns
  const farms: [number, number][] = [[-640, 480], [-720, 300], [-980, 520], [-420, -100], [140, -820]];
  for (const [fx, fz] of farms) {
    buildings.push({
      id: newId('barn'), x: fx, z: fz, w: 26, d: 16, h: 9,
      rot: hash2(fx, fz, 15) * 1.2,
      color: buildingColorFor('barn', 9, hash2(fx, fz, 16)),
      roof: 'gable', type: 'barn',
    });
    buildings.push({
      id: newId('farmhouse'), x: fx + 28, z: fz + 18, w: 13, d: 11, h: 7,
      rot: 0.4, color: buildingColorFor('house', 7, 0.8), roof: 'gable', type: 'house',
    });
  }
  // Station hall next to the mainline
  buildings.push({
    id: 'bld_station', x: 210, z: 360, w: 46, d: 20, h: 14, rot: 0,
    color: '#a89078', roof: 'flat', type: 'shop',
  });
  p.buildings = buildings;

  // ── Trees ─────────────────────────────────────────────────────────────────
  // Quick heightfield for scattering (cheap version: same generator)
  const scatterField = new HeightField(p.terrain);
  const riverPts = frontierRiver.points.map((q) => ({ x: q.x, y: q.z }));
  const scatterCtx = {
    terrain: scatterField,
    lakes: p.water.lakes,
    rivers: [{ pts: riverPts, width: frontierRiver.width }],
    strokes: p.strokes,
    waterLevel: p.water.level,
  };

  // Forests: mountains + countryside + hills
  const trees: Tree[] = [];
  trees.push(...scatterTrees(scatterCtx, 340, { x0: -1150, z0: -1150, x1: 200, z1: -350 }, (x, z, g, slope) => {
    if (g > 34 || slope > 0.5) return 'pine';
    return hash2(Math.round(x), Math.round(z), 31) > 0.55 ? 'pine' : 'oak';
  }, 3, 12));
  trees.push(...scatterTrees(scatterCtx, 260, { x0: -1150, z0: -350, x1: 250, z1: 900 }, (x, z) => {
    return hash2(Math.round(x), Math.round(z), 32) > 0.8 ? 'dead' : 'oak';
  }, 4, 13));
  trees.push(...scatterTrees(scatterCtx, 180, { x0: 250, z0: 500, x1: 1150, z1: 1150 }, (x, z, g, slope) => {
    if (slope > 0.5) return 'pine';
    return hash2(Math.round(x), Math.round(z), 33) > 0.7 ? 'pine' : 'oak';
  }, 5, 12));
  trees.push(...scatterTrees(scatterCtx, 120, { x0: 350, z0: -700, x1: 1150, z1: 200 }, (x, z, g) => {
    if (g < 14) return 'palm';
    return hash2(Math.round(x), Math.round(z), 34) > 0.5 ? 'oak' : 'palm';
  }, 6, 14));
  // Park trees inside two city blocks
  const parkBlocks: [number, number, number, number][] = [
    [600, 400, 660, 470], [100, 160, 165, 235],
  ];
  for (const [x0, z0, x1, z1] of parkBlocks) {
    for (let i = 0; i < 16; i++) {
      const r1 = hash2(i, x0, 41), r2 = hash2(i, z0, 42);
      trees.push({
        id: newId('tree'), x: x0 + r1 * (x1 - x0), z: z0 + r2 * (z1 - z0),
        s: 0.7 + r1 * 0.5, rot: r2 * Math.PI * 2, type: 'oak',
      });
    }
  }
  p.trees = trees;

  return p;
}

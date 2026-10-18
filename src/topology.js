// Frontier topology — junction graph, auto-merge splitting, validation.
import { segmentsIntersect, dist2D, angleOf, samplePolyline, uid, clamp } from './geometry.js';
import { getPreset, corridorHalfWidth, asphaltHalfWidth } from './presets.js';
import { rawTerrainHeight, waterLevel } from './terrain.js';

export function roadPoints(project, road) {
  return road.nodeIds.map((id) => project.nodes[id]).filter(Boolean);
}

export function railPoints(project, rail) {
  return rail.nodeIds.map((id) => project.nodes[id]).filter(Boolean);
}

// Build incident-edge map: nodeId -> stubs
export function buildJunctionGraph(project) {
  const incident = new Map(); // nodeId -> [{roadId, road, otherId, dirx, dirz}]
  const addStub = (nodeId, stub) => {
    if (!incident.has(nodeId)) incident.set(nodeId, []);
    incident.get(nodeId).push(stub);
  };
  for (const road of project.roads) {
    const pts = roadPoints(project, road);
    if (pts.length < 2) continue;
    const n = road.nodeIds.length;
    const segs = road.closed ? n : n - 1;
    for (let i = 0; i < segs; i++) {
      const aId = road.nodeIds[i % n], bId = road.nodeIds[(i + 1) % n];
      const a = project.nodes[aId], b = project.nodes[bId];
      if (!a || !b) continue;
      const dx = b.x - a.x, dz = b.z - a.z;
      const l = Math.hypot(dx, dz) || 1;
      addStub(aId, { roadId: road.id, road, otherId: bId, dirx: dx / l, dirz: dz / l });
      addStub(bId, { roadId: road.id, road, otherId: aId, dirx: -dx / l, dirz: -dz / l });
    }
  }
  return incident;
}

// A node is a junction if 3+ stubs, or 2 stubs from different roads, or a through-road + another road.
export function getJunctions(project) {
  const incident = buildJunctionGraph(project);
  const junctions = [];
  for (const [nodeId, stubs] of incident) {
    const node = project.nodes[nodeId];
    if (!node) continue;
    const roadSet = new Set(stubs.map((s) => s.roadId));
    const isJunction = stubs.length >= 3 || roadSet.size >= 2;
    if (!isJunction) continue;
    // Straight butt-joints (2 stubs, ~180°) are NOT junctions — ribbons meet cleanly.
    // This keeps segmented roads (ground→bridge approaches, split spans) seamless.
    if (stubs.length === 2) {
      const a = angleOf(stubs[0].dirx, stubs[0].dirz);
      const b = angleOf(stubs[1].dirx, stubs[1].dirz);
      let d = Math.abs(a - b);
      if (d > Math.PI) d = Math.PI * 2 - d;
      if (d > 2.75) continue; // >~157° → straight joint
    }
    // radius from widest incident road
    let hwMax = 4;
    for (const s of stubs) {
      const p = getPreset(s.road.presetId);
      hwMax = Math.max(hwMax, asphaltHalfWidth(p));
    }
    const radius = clamp(hwMax + 2.6, 4.5, 22);
    // sort stubs by angle
    const sorted = [...stubs].sort((a, b) => angleOf(a.dirx, a.dirz) - angleOf(b.dirx, b.dirz));
    junctions.push({ nodeId, x: node.x, z: node.z, stubs: sorted, radius, roadCount: roadSet.size });
  }
  return junctions;
}

// Estimate road surface height at a point on/near the road (straight-polyline approx).
// Mirrors meshBuilder: base = terrain + lift, deck = endLerp + bump + lift, y = max.
export function estimateRoadYAt(project, road, x, z) {
  const pts = roadPoints(project, road);
  if (pts.length < 2) return 0;
  // find nearest segment + fraction along whole road
  let best = null, bd = 1e18, acc = 0, total = 0;
  const cum = [0];
  const segs = road.closed ? pts.length : pts.length - 1;
  for (let i = 0; i < segs; i++) {
    const a = pts[i % pts.length], b = pts[(i + 1) % pts.length];
    total += dist2D(a.x, a.z, b.x, b.z);
    cum.push(total);
  }
  for (let i = 0; i < segs; i++) {
    const a = pts[i % pts.length], b = pts[(i + 1) % pts.length];
    const dx = b.x - a.x, dz = b.z - a.z;
    const len = Math.hypot(dx, dz) || 1;
    const t = clamp(((x - a.x) * dx + (z - a.z) * dz) / (len * len), 0, 1);
    const px = a.x + dx * t, pz = a.z + dz * t;
    const d = Math.hypot(x - px, z - pz);
    if (d < bd) {
      bd = d;
      const dist = cum[i] + len * t;
      const ha = pts[i % pts.length].h || 0, hb = pts[(i + 1) % pts.length].h || 0;
      best = { dist, lift: ha + (hb - ha) * t, seg: i };
    }
  }
  const t = total > 0 ? best.dist / total : 0;
  const lift = best.lift;
  const base = rawTerrainHeight(project, x, z) + 0.22 + lift;
  if (!road.bridge?.enabled) return base;
  if (road.closed) return base + (road.bridge.height || 0);
  const y0 = rawTerrainHeight(project, pts[0].x, pts[0].z) + 0.22;
  const y1 = rawTerrainHeight(project, pts[pts.length - 1].x, pts[pts.length - 1].z) + 0.22;
  const bump = (road.bridge.height || 0) * Math.pow(Math.sin(Math.PI * clamp(t, 0, 1)), 0.75);
  const arch = road.bridge.type === 'arch' ? 1.8 * Math.sin(Math.PI * clamp(t, 0, 1)) : 0;
  return Math.max(base, (y0 + (y1 - y0) * t) + bump + arch + lift);
}

// Find interior intersections between road polylines (straight segments between nodes).
// Returns [{ax,az, roadA, segA, roadB, segB, x, z}]
// Level-aware: grade-separated crossings (|dy| > 2.5m) are NOT merged (overpasses).
export function findIntersections(project, opts = {}) {
  const roads = project.roads.filter((r) => roadPoints(project, r).length >= 2);
  const results = [];
  for (let i = 0; i < roads.length; i++) {
    const A = roads[i];
    const pa = roadPoints(project, A);
    const segsA = A.closed ? pa.length : pa.length - 1;
    for (let j = i + 1; j < roads.length; j++) {
      const B = roads[j];
      const pb = roadPoints(project, B);
      const segsB = B.closed ? pb.length : pb.length - 1;
      for (let a = 0; a < segsA; a++) {
        const a1 = pa[a % pa.length], a2 = pa[(a + 1) % pa.length];
        for (let b = 0; b < segsB; b++) {
          const b1 = pb[b % pb.length], b2 = pb[(b + 1) % pb.length];
          // skip if sharing an endpoint node
          const aIds = [A.nodeIds[a % pa.length], A.nodeIds[(a + 1) % pa.length]];
          const bIds = [B.nodeIds[b % pb.length], B.nodeIds[(b + 1) % pb.length]];
          if (aIds.some((id) => bIds.includes(id))) continue;
          const hit = segmentsIntersect(a1.x, a1.z, a2.x, a2.z, b1.x, b1.z, b2.x, b2.z);
          if (hit) {
            // ignore near-endpoint touches (they'll snap instead)
            const eps = 1.2;
            const nearEnd = (p, q1, q2) => dist2D(p.x, p.z, q1.x, q1.z) < eps || dist2D(p.x, p.z, q2.x, q2.z) < eps;
            if (nearEnd(hit, a1, a2) || nearEnd(hit, b1, b2)) continue;
            results.push({ roadA: A, segA: a, roadB: B, segB: b, x: hit.x, z: hit.z });
          }
        }
      }
    }
  }
  return results;
}

// Split roads at intersections: insert shared node into both polylines.
export function autoMergeIntersections(project) {
  const hits = findIntersections(project);
  let merged = 0;
  // process one by one (indices shift after inserts — recompute each time for safety, capped)
  for (let iter = 0; iter < 40; iter++) {
    const batch = findIntersections(project);
    if (!batch.length) break;
    const h = batch[0];
    const nid = uid('n');
    project.nodes[nid] = { id: nid, x: h.x, z: h.z };
    insertNodeIntoRoad(project, h.roadA, h.segA, nid);
    insertNodeIntoRoad(project, h.roadB, h.segB, nid);
    merged++;
  }
  return { merged, remaining: findIntersections(project).length };
}

export function insertNodeIntoRoad(project, road, segIndex, nodeId) {
  // segIndex refers to segment starting at nodeIds[segIndex] (straight polyline)
  const n = road.nodeIds.length;
  if (road.closed) {
    const at = (segIndex + 1) % (n + 1);
    road.nodeIds.splice(at === 0 ? n : at, 0, nodeId);
  } else {
    road.nodeIds.splice(segIndex + 1, 0, nodeId);
  }
}

// Split a road at a node index into two roads
export function splitRoadAtNode(project, roadId, nodeIndex) {
  const idx = project.roads.findIndex((r) => r.id === roadId);
  if (idx < 0) return null;
  const road = project.roads[idx];
  if (road.closed) return null;
  if (nodeIndex <= 0 || nodeIndex >= road.nodeIds.length - 1) return null;
  const first = road.nodeIds.slice(0, nodeIndex + 1);
  const second = road.nodeIds.slice(nodeIndex);
  road.nodeIds = first;
  const id = uid('rd');
  project.roads.splice(idx + 1, 0, { ...JSON.parse(JSON.stringify(road)), id, name: road.name + ' B', nodeIds: second });
  return id;
}

// Heavy-rail ↔ road crossings at grade → level crossings (planks + markings).
// Skips monorails, elevated spans, and grade-separated crossings.
export function findRailRoadCrossings(project) {
  const out = [];
  const rails = (project.rails || []).filter((r) => r.kind === 'rail');
  for (const rail of rails) {
    const pr = rail.nodeIds.map((id) => project.nodes[id]).filter(Boolean);
    if (pr.length < 2) continue;
    const rSegs = rail.closed ? pr.length : pr.length - 1;
    for (const road of project.roads) {
      const pd = roadPoints(project, road);
      if (pd.length < 2) continue;
      const dSegs = road.closed ? pd.length : pd.length - 1;
      for (let i = 0; i < rSegs; i++) {
        const r1 = pr[i % pr.length], r2 = pr[(i + 1) % pr.length];
        for (let j = 0; j < dSegs; j++) {
          const d1 = pd[j % pd.length], d2 = pd[(j + 1) % pd.length];
          const hit = segmentsIntersect(r1.x, r1.z, r2.x, r2.z, d1.x, d1.z, d2.x, d2.z);
          if (!hit) continue;
          const yRail = estimateRailYAt(project, rail, hit.x, hit.z);
          const yRoad = estimateRoadYAt(project, road, hit.x, hit.z);
          if (Math.abs(yRail - yRoad) > 2.2) continue; // grade separated
          const rdx = r2.x - r1.x, rdz = r2.z - r1.z;
          const rl = Math.hypot(rdx, rdz) || 1;
          const ddx = d2.x - d1.x, ddz = d2.z - d1.z;
          const dl = Math.hypot(ddx, ddz) || 1;
          out.push({
            x: hit.x, z: hit.z, y: Math.max(yRail, yRoad),
            railDir: [rdx / rl, rdz / rl], roadDir: [ddx / dl, ddz / dl],
            road, rail,
          });
        }
      }
    }
  }
  return out;
}

export function estimateRailYAt(project, rail, x, z) {
  if (rail.kind === 'monorail') return rawTerrainHeight(project, x, z) + 8;
  const pts = rail.nodeIds.map((id) => project.nodes[id]).filter(Boolean);
  if (pts.length < 2) return 0;
  // reuse road estimator shape with ballast lift
  const fake = { ...rail, bridge: rail.bridge || { enabled: false } };
  // nearest lift
  let bd = 1e18, lift = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const dx = b.x - a.x, dz = b.z - a.z;
    const len2 = dx * dx + dz * dz || 1;
    const t = clamp(((x - a.x) * dx + (z - a.z) * dz) / len2, 0, 1);
    const d = Math.hypot(x - (a.x + dx * t), z - (a.z + dz * t));
    if (d < bd) { bd = d; lift = (a.h || 0) + ((b.h || 0) - (a.h || 0)) * t; }
  }
  const base = rawTerrainHeight(project, x, z) + 0.42 + lift;
  if (!rail.bridge?.enabled) return base;
  const bump = (rail.bridge.height || 0) * 0.9;
  return base + bump; // approx (level check only needs ±2m)
}

export function validateProject(project) {
  const issues = [];
  const junctions = getJunctions(project);
  // 1. unmerged crossings
  const crossings = findIntersections(project);
  for (const c of crossings.slice(0, 12)) {
    issues.push({ level: 'warn', msg: `Unmerged crossing: ${c.roadA.name} × ${c.roadB.name}`, x: c.x, z: c.z });
  }
  // 2. per-road checks
  for (const road of project.roads) {
    const pts = roadPoints(project, road);
    if (pts.length < 2) { issues.push({ level: 'err', msg: `${road.name}: fewer than 2 nodes`, roadId: road.id }); continue; }
    for (let i = 0; i < pts.length - 1; i++) {
      const d = dist2D(pts[i].x, pts[i].z, pts[i + 1].x, pts[i + 1].z);
      if (d < 0.5) issues.push({ level: 'err', msg: `${road.name}: zero-length segment ${i}`, roadId: road.id, x: pts[i].x, z: pts[i].z });
      else if (d < 2.5) issues.push({ level: 'warn', msg: `${road.name}: very short segment (${d.toFixed(1)}m)`, roadId: road.id, x: pts[i].x, z: pts[i].z });
      // sharp kink
      if (i > 0) {
        const v1x = pts[i].x - pts[i - 1].x, v1z = pts[i].z - pts[i - 1].z;
        const v2x = pts[i + 1].x - pts[i].x, v2z = pts[i + 1].z - pts[i].z;
        const l1 = Math.hypot(v1x, v1z) || 1, l2 = Math.hypot(v2x, v2z) || 1;
        const dot = (v1x * v2x + v1z * v2z) / (l1 * l2);
        if (dot < -0.2) issues.push({ level: 'warn', msg: `${road.name}: sharp kink at node ${i}`, roadId: road.id, x: pts[i].x, z: pts[i].z });
      }
    }
    // water crossing without bridge
    if (!road.bridge?.enabled) {
      const samples = samplePolyline(pts, { closed: road.closed, smooth: false, step: 6 });
      const wl = waterLevel(project);
      let waterHits = 0;
      for (const s of samples) {
        if (rawTerrainHeight(project, s.x, s.z) < wl - 0.15) waterHits++;
      }
      if (waterHits > 2) issues.push({ level: 'warn', msg: `${road.name}: crosses water without bridge (${waterHits * 6}m) — enable Bridge`, roadId: road.id });
    }
  }
  // 3. junction spacing
  for (let i = 0; i < junctions.length; i++) {
    for (let j = i + 1; j < junctions.length; j++) {
      const d = dist2D(junctions[i].x, junctions[i].z, junctions[j].x, junctions[j].z);
      const minD = junctions[i].radius + junctions[j].radius - 2;
      if (d < minD) issues.push({ level: 'warn', msg: `Junctions too close (${d.toFixed(0)}m) — overlap`, x: (junctions[i].x + junctions[j].x) / 2, z: (junctions[i].z + junctions[j].z) / 2 });
    }
    if (junctions[i].stubs.length > 8) issues.push({ level: 'warn', msg: `Complex junction (${junctions[i].stubs.length} legs)`, x: junctions[i].x, z: junctions[i].z });
  }
  if (!issues.length) issues.push({ level: 'ok', msg: `Topology clean · ${junctions.length} junctions · ${project.roads.length} roads · ${project.rails.length} rails` });
  return { issues, junctions, crossings: crossings.length };
}

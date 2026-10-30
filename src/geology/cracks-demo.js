/**
 * Dedicated 3D Fracture-Mechanics & Crack Simulation Demo (`cracked-monolith` ONLY).
 *
 * Strictly isolated to the single `'cracked-monolith'` preset ("Cracked Monolith (3D Cracks)")
 * so NO other rock formation in the studio is modified or affected.
 *
 * Constructs genuine, razor-sharp, 100% alias-free 3D rock cracks via:
 * 1. Craggy, Asymmetric Split Rock Massif (`splitPolyByPlane` + frost-heave slip/rotation):
 *    Pitched multi-ridged granite/quartzite peaks (zero flat octagonal tabletop caps!) heaved apart
 *    across a deep through-going zig-zagging fault chasm.
 * 2. Articulated Zig-Zagging Primary Chasm + Kinked Y-Branching 3D V-Wedge Crack Chains (`cuts`):
 *    Multi-segment kinking & branching 3D polyhedral V-blades (`compilePolyBlock`) that slice cleanly
 *    through summit crests and broad rock faces, tapering in aperture and depth with zero voxel zippering.
 * 3. Jammed Angular Chockstones (`isBoulder: true`) wedged inside the open chasm + spalled fracture debris.
 */

import {
  DEG2RAD,
  buildStrikeDipFrame,
  perturbNormal,
  vnorm,
  vdot,
  vcross,
  clamp,
} from '../core/vec3.js';
import { scalarField3D } from '../core/spatial-noise.js';
import {
  createBoxPoly,
  clipPolyByHalfSpace,
  splitPolyByPlane,
  transformPoly,
  sculptGeologicalParentPoly,
  compilePolyBlock,
} from './polyhedron.js';

/**
 * Exact 3D V-tapered polyhedral fracture blade segment from `pA` to `pB` penetrating along `inDir`.
 */
function buildVWedgeCrackSegment(pA, pB, inDir, halfW0, halfW1, depth, outExtend, frame, rng, bevel) {
  const seg = [pB[0] - pA[0], pB[1] - pA[1], pB[2] - pA[2]];
  const segLen = Math.hypot(seg[0], seg[1], seg[2]);
  if (segLen < 1e-3) return null;

  const tDir = [seg[0] / segLen, seg[1] / segLen, seg[2] / segLen];
  const dDir = vnorm(inDir);
  let lat = vcross(tDir, dDir);
  const latLen = Math.hypot(lat[0], lat[1], lat[2]);
  if (latLen < 1e-4) return null;
  lat = [lat[0] / latLen, lat[1] / latLen, lat[2] / latLen];

  const mid = [
    0.5 * (pA[0] + pB[0]),
    0.5 * (pA[1] + pB[1]),
    0.5 * (pA[2] + pB[2]),
  ];

  const R = segLen * 0.65 + Math.max(depth, outExtend) * 1.35 + Math.max(halfW0, halfW1) * 3.2;
  let poly = createBoxPoly(
    mid[0] - R, mid[1] - R, mid[2] - R,
    mid[0] + R, mid[1] + R, mid[2] + R,
    'crackBound'
  );

  const overlap = Math.max(halfW0, halfW1) * 1.45;
  const nStart = [-tDir[0], -tDir[1], -tDir[2]];
  const nEnd = [tDir[0], tDir[1], tDir[2]];
  poly = clipPolyByHalfSpace(poly, nStart, vdot(nStart, pA) + overlap, 'crackSegStart') || poly;
  poly = clipPolyByHalfSpace(poly, nEnd, vdot(nEnd, pB) + overlap, 'crackSegEnd') || poly;

  // Extend far outside the rock surface (`outExtend`) so every crack opens cleanly to sky/air!
  const outPt = [
    mid[0] - dDir[0] * outExtend,
    mid[1] - dDir[1] * outExtend,
    mid[2] - dDir[2] * outExtend,
  ];
  const nOut = [-dDir[0], -dDir[1], -dDir[2]];
  poly = clipPolyByHalfSpace(poly, nOut, vdot(nOut, outPt), 'crackOut') || poly;

  const rootPt = [
    mid[0] + dDir[0] * depth,
    mid[1] + dDir[1] * depth,
    mid[2] + dDir[2] * depth,
  ];
  poly = clipPolyByHalfSpace(poly, dDir, vdot(dDir, rootPt), 'crackRoot') || poly;

  const avgHalfW = 0.5 * (halfW0 + halfW1);
  const taperAlong = (halfW1 - halfW0) / segLen;
  const vSlope = (avgHalfW * 0.85) / Math.max(0.05, depth);

  const nWallPos = perturbNormal(
    vnorm([
      lat[0] - tDir[0] * taperAlong + dDir[0] * vSlope,
      lat[1] - tDir[1] * taperAlong + dDir[1] * vSlope,
      lat[2] - tDir[2] * taperAlong + dDir[2] * vSlope,
    ]),
    rng,
    0.04
  );
  poly = clipPolyByHalfSpace(
    poly,
    nWallPos,
    vdot(nWallPos, [mid[0] + lat[0] * avgHalfW, mid[1] + lat[1] * avgHalfW, mid[2] + lat[2] * avgHalfW]),
    'crackWallL'
  ) || poly;

  const nWallNeg = perturbNormal(
    vnorm([
      -lat[0] - tDir[0] * taperAlong + dDir[0] * vSlope,
      -lat[1] - tDir[1] * taperAlong + dDir[1] * vSlope,
      -lat[2] - tDir[2] * taperAlong + dDir[2] * vSlope,
    ]),
    rng,
    0.04
  );
  poly = clipPolyByHalfSpace(
    poly,
    nWallNeg,
    vdot(nWallNeg, [mid[0] - lat[0] * avgHalfW, mid[1] - lat[1] * avgHalfW, mid[2] - lat[2] * avgHalfW]),
    'crackWallR'
  ) || poly;

  if (!poly) return null;
  return compilePolyBlock(poly, frame, { edgeBevel: bevel });
}

function addArticulatedCrackChain(cuts, waypoints, inDir, rootHalfW, tipHalfW, rootDepth, tipDepth, outExtend, frame, rng, bevel) {
  const nSegs = waypoints.length - 1;
  for (let i = 0; i < nSegs; i++) {
    const f0 = i / nSegs;
    const f1 = (i + 1) / nSegs;
    const hw0 = rootHalfW * (1 - f0) + tipHalfW * f0;
    const hw1 = rootHalfW * (1 - f1) + tipHalfW * f1;
    const dep = rootDepth * (1 - 0.5 * (f0 + f1)) + tipDepth * (0.5 * (f0 + f1));
    const comp = buildVWedgeCrackSegment(waypoints[i], waypoints[i + 1], inDir, hw0, hw1, dep, outExtend, frame, rng, bevel);
    if (comp) cuts.push(comp);
  }
}

export function buildCrackedMonolith(params, tectonics, rng) {
  const S = params.scale;
  const groundY = 0;
  const blocks = [];
  const cuts = [];

  const aperture = params.jointAperture ?? 0.58;
  const overhang = params.overhangStrength ?? 0.56;
  const bevel = S * (0.0013 + 0.0024 * (params.edgeWear ?? 0.28));
  const cutBevel = S * 0.0012;
  const strikeRad = (params.strikeAngle ?? 18) * DEG2RAD;
  const dipRad = clamp((params.dipAngle ?? 34), 20, 56) * DEG2RAD;
  const mainFrame = buildStrikeDipFrame(strikeRad, dipRad);
  const crackSalt = rng.int(1000, 999999);

  const chasmAz = 0.44;
  const masterT = [Math.sin(chasmAz), 0, Math.cos(chasmAz)];  // Back-left -> Front-right
  const masterN = [Math.cos(chasmAz), 0, -Math.sin(chasmAz)]; // Left half -> Right half

  const toWorld = (across, yFrac, along) => [
    masterN[0] * (across * S) + masterT[0] * (along * S),
    groundY + yFrac * S,
    masterN[2] * (across * S) + masterT[2] * (along * S),
  ];

  // 1. Craggy Asymmetric Multi-Ridged Monolith Halves (NO flat dinner-plate tops & NO ground puddle!)
  const lobeSpecs = [
    // Left Commanding Summit Crag (`side = -1`)
    { across: -0.17, y: 0.42, along: -0.02, rx: 0.23, ry: 0.45, rz: 0.31, side: -1, peakAz:  0.25, splitSub: true },
    { across: -0.14, y: 0.54, along: -0.08, rx: 0.17, ry: 0.30, rz: 0.22, side: -1, peakAz:  0.90, splitSub: false },
    { across: -0.26, y: 0.26, along:  0.12, rx: 0.19, ry: 0.27, rz: 0.23, side: -1, peakAz: -0.45, splitSub: true },
    { across: -0.28, y: 0.20, along: -0.15, rx: 0.18, ry: 0.22, rz: 0.22, side: -1, peakAz:  1.40, splitSub: false },
    // Right Frost-Heaved / Outward-Tilted Massif (`side = +1`)
    { across:  0.18, y: 0.36, along:  0.01, rx: 0.23, ry: 0.38, rz: 0.30, side:  1, peakAz: -0.40, splitSub: true },
    { across:  0.15, y: 0.46, along: -0.07, rx: 0.17, ry: 0.27, rz: 0.22, side:  1, peakAz: -1.10, splitSub: false },
    { across:  0.27, y: 0.22, along:  0.13, rx: 0.18, ry: 0.23, rz: 0.22, side:  1, peakAz:  0.55, splitSub: true },
    // Compact Recessed Basal Root Bridge hidden strictly inside the chasm floor (NO spilled ground puddle!)
    { across:  0.00, y: 0.065, along: -0.03, rx: 0.16, ry: 0.075, rz: 0.18, side: 0, peakAz:  0.00, splitSub: false },
  ];

  for (let i = 0; i < lobeSpecs.length; i++) {
    const lb = lobeSpecs[i];
    const heaveY = lb.side > 0 ? -S * 0.035 : 0;
    const splay = lb.across + lb.side * 0.020 * (0.6 + 0.7 * aperture);
    const center = toWorld(splay, lb.y, lb.along);
    center[1] += heaveY;

    const lf = buildStrikeDipFrame(
      strikeRad + lb.side * 0.15 + rng.signed() * 0.10,
      dipRad + lb.side * 0.09 + rng.signed() * 0.07
    );

    let poly = sculptGeologicalParentPoly(
      center,
      [lb.rx * S, lb.ry * S, lb.rz * S],
      lf,
      rng,
      {
        jointDispersion: 0.21,
        cornerBlunt: 0.73,
        flatBaseY: (lb.y - lb.ry) <= 0.04 ? groundY : undefined,
        extraBevelCuts: 7,
      }
    );

    if (lb.side !== 0) {
      const cAz = strikeRad + lb.peakAz;
      const cN1 = vnorm([Math.cos(cAz) * 0.66, 0.75, Math.sin(cAz) * 0.66]);
      const cN2 = vnorm([-Math.cos(cAz + 0.55) * 0.62, 0.78, -Math.sin(cAz + 0.55) * 0.62]);
      const topPt = [center[0], center[1] + lb.ry * 0.74 * S, center[2]];
      poly = clipPolyByHalfSpace(poly, cN1, vdot(cN1, topPt), 'cragPeak') || poly;
      poly = clipPolyByHalfSpace(poly, cN2, vdot(cN2, topPt) + lb.rx * 0.20 * S, 'cragPeak') || poly;

      const underN = vnorm([masterT[0] * 0.82 + lb.side * 0.24, -0.40 * (0.6 + 0.5 * overhang), masterT[2] * 0.82]);
      const browPt = [center[0] + masterT[0] * lb.rz * 0.80 * S, groundY + S * 0.10, center[2] + masterT[2] * lb.rz * 0.80 * S];
      poly = clipPolyByHalfSpace(poly, underN, vdot(underN, browPt), 'frontBrow') || poly;
    }

    poly = clipPolyByHalfSpace(poly, [0, -1, 0], -groundY, 'base') || poly;

    // Physically split major lobes along a conjugate fracture plane and heave/slide the upper block!
    // Note `transformPoly(poly, translation, axis, angleRad, pivot)` argument order!
    if (lb.splitSub && poly) {
      const splitN = vnorm([
        lb.side * masterN[0] * 0.42 + masterT[0] * 0.34,
        0.80,
        lb.side * masterN[2] * 0.42 + masterT[2] * 0.34,
      ]);
      const splitGap = S * (0.008 + 0.009 * aperture);
      const [upperPiece, lowerPiece] = splitPolyByPlane(poly, splitN, vdot(splitN, center), -splitGap, 'conjugateCrack');
      if (upperPiece && lowerPiece) {
        const shiftedUpper = transformPoly(
          upperPiece,
          [
            lb.side * masterN[0] * S * 0.014 + masterT[0] * S * 0.010,
            -S * 0.008,
            lb.side * masterN[2] * S * 0.014 + masterT[2] * S * 0.010,
          ],
          vnorm([masterT[0], 0.25, masterT[2]]),
          lb.side * 0.045,
          center
        );
        for (const subP of [lowerPiece, shiftedUpper]) {
          const clipped = clipPolyByHalfSpace(subP, [0, -1, 0], -groundY, 'base') || subP;
          const compSub = compilePolyBlock(clipped, lf, {
            edgeBevel: bevel * 0.85,
            smoothUnionR: 0,
            detailScale: 0.96,
            seedSalt: rng.int(1, 999999),
          });
          if (compSub) blocks.push(compSub);
        }
        continue;
      }
    }

    const comp = compilePolyBlock(poly, lf, {
      edgeBevel: bevel,
      smoothUnionR: S * 0.0038,
      detailScale: 0.94,
      seedSalt: rng.int(1, 999999),
    });
    if (comp) blocks.push(comp);
  }

  // 2. Primary Through-Going Zig-Zagging Master Chasm (`4` articulated kinked polyhedral chasm wedges!)
  const chasmWaypoints = [
    [-0.018, 0.36, -0.48],
    [ 0.024, 0.36, -0.20],
    [-0.026, 0.36,  0.04],
    [ 0.022, 0.36,  0.26],
    [-0.015, 0.36,  0.48],
  ];
  const topW = S * (0.026 + 0.018 * aperture);
  const botW = S * (0.009 + 0.006 * aperture);
  const outExt = S * 0.85;
  for (let s = 0; s < chasmWaypoints.length - 1; s++) {
    const a = chasmWaypoints[s];
    const b = chasmWaypoints[s + 1];
    const segCut = buildVWedgeCrackSegment(
      toWorld(a[0], 0.82, a[2]),
      toWorld(b[0], 0.82, b[2]),
      [0.12 * masterN[0], -0.99, 0.12 * masterN[2]],
      topW * rng.range(0.92, 1.08),
      topW * rng.range(0.92, 1.08),
      S * 0.74,
      outExt,
      mainFrame,
      rng,
      cutBevel
    );
    if (segCut) cuts.push(segCut);

    const pMidA = toWorld(a[0] + (s % 2 === 0 ? 0.015 : -0.015), 0.54, a[2]);
    const pMidB = toWorld(b[0] + (s % 2 === 0 ? -0.015 : 0.015), 0.54, b[2]);
    const jogCut = buildVWedgeCrackSegment(
      pMidA, pMidB,
      [-0.12 * masterN[0], -0.99, -0.12 * masterN[2]],
      botW * 1.65, botW * 1.55,
      S * 0.44,
      outExt,
      mainFrame, rng, cutBevel
    );
    if (jogCut) cuts.push(jogCut);
  }

  // 3. Kinked, Y-Branching 3D Cracks Slicing Through Summit Peaks, Front Faces & Flanks!
  // Kept above Nyquist voxel width (`tipW >= 0.0085*S ~ 0.10m`) so EVERY crack lip is 100% crisp & pinhole-free!
  const rootW = S * (0.016 + 0.008 * aperture);
  const midW  = S * (0.011 + 0.005 * aperture);
  const tipW  = S * (0.0085 + 0.003 * aperture);

  // 3A. Left Summit Peak Deep Kinked Cleavage Crack (visibly notches the upper-left skyline peak!)
  const inCrownDown = [0.06, -0.97, -0.22];
  addArticulatedCrackChain(
    cuts,
    [
      toWorld(-0.02, 0.68, -0.04),
      toWorld(-0.14, 0.65, -0.06),
      toWorld(-0.24, 0.58,  0.02),
      toWorld(-0.32, 0.48,  0.10),
    ],
    inCrownDown, rootW * 1.05, tipW, S * 0.24, S * 0.09, outExt, mainFrame, rng, cutBevel
  );

  // 3B. Right Summit Peak Deep Kinked Cleavage Crack (visibly notches the upper-right skyline peak!)
  addArticulatedCrackChain(
    cuts,
    [
      toWorld( 0.02, 0.60, -0.03),
      toWorld( 0.15, 0.56, -0.05),
      toWorld( 0.25, 0.49,  0.03),
      toWorld( 0.33, 0.39,  0.11),
    ],
    inCrownDown, rootW * 1.00, tipW, S * 0.22, S * 0.09, outExt, mainFrame, rng, cutBevel
  );

  // 3C. Left Front Wing Crack + Y-Fork Branch!
  const inFrontLeft = vnorm([0.32 * masterN[0] - 0.88 * masterT[0], -0.18, 0.32 * masterN[2] - 0.88 * masterT[2]]);
  addArticulatedCrackChain(
    cuts,
    [
      toWorld(-0.02, 0.54, 0.22),
      toWorld(-0.13, 0.46, 0.28),
      toWorld(-0.23, 0.36, 0.29),
      toWorld(-0.31, 0.25, 0.25),
    ],
    inFrontLeft, rootW, tipW, S * 0.22, S * 0.10, outExt, mainFrame, rng, cutBevel
  );
  addArticulatedCrackChain(
    cuts,
    [
      toWorld(-0.13, 0.46, 0.28),
      toWorld(-0.21, 0.54, 0.24),
      toWorld(-0.28, 0.60, 0.17),
    ],
    inFrontLeft, midW, tipW, S * 0.16, S * 0.08, outExt, mainFrame, rng, cutBevel
  );

  // 3D. Right Front Wing Crack + Y-Fork Branch!
  const inFrontRight = vnorm([-0.34 * masterN[0] - 0.88 * masterT[0], -0.18, -0.34 * masterN[2] - 0.88 * masterT[2]]);
  addArticulatedCrackChain(
    cuts,
    [
      toWorld( 0.02, 0.46, 0.22),
      toWorld( 0.14, 0.39, 0.29),
      toWorld( 0.25, 0.30, 0.29),
      toWorld( 0.34, 0.20, 0.24),
    ],
    inFrontRight, rootW, tipW, S * 0.22, S * 0.10, outExt, mainFrame, rng, cutBevel
  );
  addArticulatedCrackChain(
    cuts,
    [
      toWorld( 0.14, 0.39, 0.29),
      toWorld( 0.18, 0.26, 0.30),
      toWorld( 0.22, 0.14, 0.27),
    ],
    inFrontRight, midW, tipW, S * 0.16, S * 0.08, outExt, mainFrame, rng, cutBevel
  );

  // 3E. Rear Face Conjugate Cracks (360-degree asset inspection!)
  const inBack = vnorm([0.0, -0.22, 0.96 * masterT[2]]);
  addArticulatedCrackChain(
    cuts,
    [
      toWorld(-0.02, 0.48, -0.23),
      toWorld(-0.15, 0.39, -0.29),
      toWorld(-0.27, 0.27, -0.26),
    ],
    inBack, rootW * 0.95, tipW, S * 0.18, S * 0.08, outExt, mainFrame, rng, cutBevel
  );
  addArticulatedCrackChain(
    cuts,
    [
      toWorld( 0.02, 0.42, -0.22),
      toWorld( 0.15, 0.33, -0.28),
      toWorld( 0.27, 0.22, -0.25),
    ],
    inBack, rootW * 0.95, tipW, S * 0.18, S * 0.08, outExt, mainFrame, rng, cutBevel
  );

  // 4. Two Angular Wedged Chockstones Jammed Tight Inside the Open Split Chasm!
  const chockSpecs = [
    { across:  0.002, y: 0.48, along:  0.05, r: 0.056 },
    { across: -0.004, y: 0.27, along: -0.06, r: 0.046 },
  ];
  for (const cs of chockSpecs) {
    const cPos = toWorld(cs.across, cs.y, cs.along);
    const cf = buildStrikeDipFrame(rng.float() * Math.PI * 2, rng.range(28, 60) * DEG2RAD);
    const cPoly = sculptGeologicalParentPoly(
      cPos,
      [cs.r * 1.22 * S, cs.r * 0.90 * S, cs.r * 1.15 * S],
      cf,
      rng,
      { jointDispersion: 0.24, cornerBlunt: 0.62, extraBevelCuts: 5 }
    );
    const compC = compilePolyBlock(cPoly, cf, {
      edgeBevel: bevel * 0.72,
      detailScale: 0.95,
      isBoulder: true,
      seedSalt: rng.int(1, 999999),
    });
    if (compC) blocks.push(compC);
  }

  // 5. Freshly Calved Angular Fracture Debris Around the Base & Chasm Mouth
  const spallClusters = [
    { across: -0.06, along:  0.34, r: 0.052 },
    { across:  0.08, along:  0.37, r: 0.044 },
    { across: -0.22, along:  0.38, r: 0.060 },
    { across:  0.24, along:  0.36, r: 0.055 },
    { across: -0.38, along:  0.22, r: 0.066 },
    { across:  0.39, along:  0.18, r: 0.058 },
    { across: -0.35, along: -0.26, r: 0.062 },
    { across:  0.34, along: -0.28, r: 0.056 },
    { across:  0.02, along: -0.36, r: 0.050 },
  ];
  for (const sc of spallClusters) {
    const pos = toWorld(sc.across + rng.signed() * 0.02, 0, sc.along + rng.signed() * 0.02);
    const rS = sc.r * S * rng.range(0.88, 1.16);
    const sf = buildStrikeDipFrame(rng.float() * Math.PI * 2, rng.range(24, 62) * DEG2RAD);
    let sPoly = sculptGeologicalParentPoly(
      [pos[0], groundY + rS * 0.54, pos[2]],
      [rS * rng.range(0.95, 1.38), rS * rng.range(0.60, 0.88), rS * rng.range(0.85, 1.25)],
      sf,
      rng,
      { jointDispersion: 0.24, cornerBlunt: 0.62, flatBaseY: groundY, extraBevelCuts: 5 }
    );
    sPoly = clipPolyByHalfSpace(sPoly, [0, -1, 0], -groundY, 'base') || sPoly;
    const compS = compilePolyBlock(sPoly, sf, {
      edgeBevel: bevel * 0.80,
      detailScale: 0.95,
      isBoulder: true,
      seedSalt: rng.int(1, 999999),
    });
    if (compS) blocks.push(compS);
  }

  const crackNetwork = { S, groundY, crackSalt };
  return { blocks, cuts, groundY, crackNetwork };
}

/**
 * Realistic PBR Sierra/Alpine Granite with iron-oxide fracture staining & dark crack roots
 * (strictly isolated to `'cracked-monolith'`).
 */
export function evalCrackedMonolithColor(crackNet, wx, wy, wz, nx, ny, nz, ao, cav, outRgb) {
  const S = crackNet.S;
  const m1 = scalarField3D(wx / (S * 0.22), wy / (S * 0.22), wz / (S * 0.22), crackNet.crackSalt + 401);
  const m2 = scalarField3D(wx / (S * 0.065), wy / (S * 0.065), wz / (S * 0.065), crackNet.crackSalt + 509);

  let sR = 0.48 + 0.038 * m1 + 0.018 * m2;
  let sG = 0.45 + 0.034 * m1 + 0.016 * m2;
  let sB = 0.42 + 0.030 * m1 + 0.015 * m2;

  const ironPatch = clamp(m1 * 0.85 + 0.25, 0, 1) * clamp((1.0 - ao) * 1.1 + cav * 0.5, 0, 1);
  sR = sR * (1 - ironPatch * 0.42) + 0.47 * (ironPatch * 0.42);
  sG = sG * (1 - ironPatch * 0.42) + 0.30 * (ironPatch * 0.42);
  sB = sB * (1 - ironPatch * 0.42) + 0.19 * (ironPatch * 0.42);

  const crevice = clamp((1.0 - ao) * 0.95 + cav * 0.72 - 0.16, 0, 1);
  const darkMul = 1.0 - 0.64 * crevice;
  sR *= darkMul;
  sG *= darkMul * 0.96;
  sB *= darkMul * 0.93;

  outRgb[0] = Math.pow(clamp(sR, 0.025, 0.85), 2.2);
  outRgb[1] = Math.pow(clamp(sG, 0.025, 0.85), 2.2);
  outRgb[2] = Math.pow(clamp(sB, 0.025, 0.85), 2.2);
}

// Stamp library for volumetric SDF placement:
// Canyons, natural arches, rock needles, spires, craters, cliff alcoves, overhangs.

export const STAMP_TYPES = {
  ARCH: "arch",
  SPIRE: "spire",
  CANYON_CUT: "canyon_cut",
  CAVE_ALCOVE: "cave_alcove",
  CRATER: "crater",
  BOULDER: "boulder"
};

// Returns analytical signed distance for stamps
export function sampleStampSDF(type, p, params = {}) {
  const [x, y, z] = p;

  switch (type) {
    case STAMP_TYPES.ARCH: {
      // Natural rock arch: curved bridge with a carved-out hole underneath
      const span = params.span || 6.0;
      const height = params.height || 5.0;
      const thickness = params.thickness || 2.2;
      const depth = params.depth || 3.0;

      // Outer arch body (box or cylinder)
      const dy = y - height * 0.5;
      const outerBox = Math.max(
        Math.abs(x) - span * 0.6,
        Math.abs(dy) - height * 0.6,
        Math.abs(z) - depth * 0.5
      );

      // Hollow hole under arch (elliptical cylinder along Z)
      const holeRadiusX = span * 0.42;
      const holeRadiusY = height * 0.65;
      const hole = Math.hypot(x / holeRadiusX, (y - height * 0.25) / holeRadiusY) - 1.0;

      // The arch is outer minus the hole
      return Math.max(outerBox, -hole * Math.min(holeRadiusX, holeRadiusY));
    }

    case STAMP_TYPES.SPIRE: {
      // Slender weathered rock spire/hoodoo with stepped strata rings
      const h = params.height || 8.0;
      const r = params.radius || 1.8;
      const taper = Math.max(0.1, 1.0 - (y / h) * 0.45);
      const rad = r * taper;
      
      const distXZ = Math.hypot(x, z) - rad;
      const distY = Math.max(-y, y - h);

      // Strata rings on the spire
      const rings = Math.sin(y * 4.0) * 0.12;

      return Math.max(distXZ + rings, distY);
    }

    case STAMP_TYPES.CANYON_CUT: {
      // Volumetric canyon gorge or trench cut (subtractive CSG stamp)
      const width = params.width || 4.5;
      const depth = params.depth || 10.0;
      const length = params.length || 14.0;

      const qx = Math.abs(x) - width * 0.5;
      const qz = Math.abs(z) - length * 0.5;
      const qy = y - depth * 0.5;

      return Math.max(qx, qz, -qy);
    }

    case STAMP_TYPES.CAVE_ALCOVE: {
      // Hollow cave cavity / cliff alcove (subtractive CSG sphere or ellipsoid)
      const rx = params.rx || 3.5;
      const ry = params.ry || 2.5;
      const rz = params.rz || 4.0;
      return Math.hypot(x / rx, y / ry, z / rz) - 1.0;
    }

    case STAMP_TYPES.CRATER: {
      // Volumetric impact crater or sinkhole
      const r = params.radius || 5.0;
      const rim = params.rim || 1.2;
      const distXZ = Math.hypot(x, z);
      const bowl = Math.hypot(distXZ, y) - r;
      const rimHeight = Math.exp(-Math.pow((distXZ - r) / 1.5, 2)) * rim;
      return bowl - rimHeight;
    }

    case STAMP_TYPES.BOULDER: {
      // Weathered rock boulder
      const r = params.radius || 2.5;
      const d = Math.hypot(x, y, z) - r;
      return d;
    }

    default:
      return 999.0;
  }
}

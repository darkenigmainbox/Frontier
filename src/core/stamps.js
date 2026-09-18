// Frontier — CSG stamp library for volumetric SDF sculpting (from the algorithmic
// branch, hardened). Every stamp is an analytic SDF in local space.
// JS implementations here are mirrored in GLSL inside src/gl/erosion-shaders.js
// (sculpt stamp tool) — keep both in sync.

export const STAMP_TYPES = {
  NONE: 0,
  SPHERE: 1,
  ARCH: 2,
  SPIRE: 3,
  BUTTE: 4,
  CANYON: 5,
  CAVE: 6,
  CRATER: 7,
  BOULDER: 8,
};

export const STAMP_NAMES = {
  [STAMP_TYPES.SPHERE]: "Dome",
  [STAMP_TYPES.ARCH]: "Arch",
  [STAMP_TYPES.SPIRE]: "Spire",
  [STAMP_TYPES.BUTTE]: "Butte",
  [STAMP_TYPES.CANYON]: "Trench",
  [STAMP_TYPES.CAVE]: "Cavern",
  [STAMP_TYPES.CRATER]: "Crater",
  [STAMP_TYPES.BOULDER]: "Boulder",
};

// p is in normalized local space (already divided by scale).
// Returns signed distance in local units; caller multiplies by min(scale).
export function sampleStampSDF(type, p, params = {}) {
  const [x, y, z] = p;

  switch (type) {
    case STAMP_TYPES.SPHERE:
      return Math.hypot(x, y, z) - (params.radius ?? 1.0);

    case STAMP_TYPES.ARCH: {
      const span = params.span ?? 2.2;
      const height = params.height ?? 2.4;
      const depth = params.depth ?? 1.2;
      const dy = y - height * 0.35;
      let outer = Math.max(
        Math.abs(x) - span * 0.62,
        Math.abs(dy) - height * 0.55,
        Math.abs(z) - depth * 0.5
      );
      const hr = Math.min(span * 0.42, height * 0.62);
      const hole = Math.hypot(x / Math.max(hr, 0.4), (y - height * 0.22) / Math.max(height * 0.62, 0.4)) - 1.0;
      return Math.max(outer, -hole * hr);
    }

    case STAMP_TYPES.SPIRE: {
      const h = params.height ?? 3.2;
      const r = params.radius ?? 0.7;
      const taper = Math.max(0.1, 1.0 - (y / h) * 0.45);
      const rings = Math.sin(y * 3.4) * 0.09;
      return Math.max(Math.hypot(x, z) - r * taper + rings, Math.max(-y - 0.4, y - h));
    }

    case STAMP_TYPES.BUTTE: {
      // Flat-topped mesa with strata-terraced skirt
      const h = params.height ?? 2.6;
      const r = params.radius ?? 1.8;
      const skirt = 1.0 + Math.max(0, -y / h) * 0.55;
      const rings = 0.06 * Math.sin(y * 5.0);
      const body = Math.max(Math.hypot(x, z) - r * skirt + rings, Math.max(-y, y - h * 0.42));
      return body;
    }

    case STAMP_TYPES.CANYON: {
      const width = params.width ?? 1.6;
      const length = params.length ?? 5.0;
      const depth = params.depth ?? 3.0;
      const top = params.top ?? 1.5;
      const qx = Math.abs(x) - width * 0.5;
      const qz = Math.abs(z) - length * 0.5;
      return Math.max(qx, qz, -y - depth, y - top);
    }

    case STAMP_TYPES.CAVE: {
      const rx = params.rx ?? 1.6, ry = params.ry ?? 1.2, rz = params.rz ?? 1.8;
      return Math.hypot(x / rx, y / ry, z / rz) - 1.0;
    }

    case STAMP_TYPES.CRATER: {
      const r = params.radius ?? 2.2;
      const rim = params.rim ?? 0.5;
      const dXZ = Math.hypot(x, z);
      const bowl = Math.hypot(dXZ, y * 1.4) - r;
      const rimH = Math.exp(-Math.pow((dXZ - r) / 1.4, 2)) * rim;
      return bowl - rimH;
    }

    case STAMP_TYPES.BOULDER: {
      const r = params.radius ?? 1.0;
      // Slightly irregular boulder: radial noise via cheap trig hash
      const lump = 0.12 * (Math.sin(x * 2.7 + z * 1.3) * Math.cos(y * 2.1 - z * 0.7));
      return Math.hypot(x, y, z) - r * (1 + lump);
    }

    default:
      return 999.0;
  }
}

// GLSL translation of sampleStampSDF — used by the sculpt stamp shader.
export const stampGLSL = /* glsl */ `
float stampSDF(int type, vec3 p, vec4 prm){ // prm: radius/primary, height/secondary, k, unused
  float x=p.x, y=p.y, z=p.z;
  if(type==1) return length(p)-prm.x;
  if(type==2){
    float span=prm.x*2.2, h=prm.x*2.4, depth=prm.x*1.2;
    float dy=y-h*0.35;
    float outer=max(max(abs(x)-span*0.62, abs(dy)-h*0.55), abs(z)-depth*0.5);
    float hr=min(span*0.42, h*0.62);
    float hole=length(vec2(x/max(hr,0.4), (y-h*0.22)/max(h*0.62,0.4)))-1.0;
    return max(outer, -hole*hr);
  }
  if(type==3){
    float h=prm.x*3.2, r=max(0.25,prm.x*0.7);
    float taper=max(0.1, 1.0-(y/h)*0.45);
    float rings=sin(y*3.4)*0.09;
    return max(length(vec2(x,z))-r*taper+rings, max(-y-0.4, y-h));
  }
  if(type==4){
    float h=prm.x*2.6, r=prm.x*1.8;
    float skirt=1.0+max(0.0,-y/h)*0.55;
    float rings=0.06*sin(y*5.0);
    return max(length(vec2(x,z))-r*skirt+rings, max(-y, y-h*0.42));
  }
  if(type==5){
    float width=prm.x*1.6, len=prm.x*5.0, depth=prm.x*3.0, top=prm.x*1.5;
    return max(max(abs(x)-width*0.5, abs(z)-len*0.5), max(-y-depth, y-top));
  }
  if(type==6){
    float rx=prm.x*1.6, ry=prm.x*1.2, rz=prm.x*1.8;
    return length(vec3(x/rx, y/ry, z/rz))-1.0;
  }
  if(type==7){
    float r=prm.x*2.2, rim=prm.x*0.5;
    float dXZ=length(vec2(x,z));
    float bowl=length(vec2(dXZ, y*1.4))-r;
    float rimH=exp(-pow((dXZ-r)/1.4, 2.0))*rim;
    return bowl-rimH;
  }
  if(type==8){
    float r=prm.x;
    float lump=0.12*(sin(x*2.7+z*1.3)*cos(y*2.1-z*0.7));
    return length(p)-r*(1.0+lump);
  }
  return 999.0;
}
`;

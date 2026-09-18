// Frontier — shared GLSL prelude: volume atlas addressing + SDF sampling.
// Mirrors src/core/constants.js — keep in sync (SIZE/MIN/MAX/CELL/BAND).

import { SIZE, MIN, MAX, CELL, BAND, VOXEL_VOLUME, ATLAS_COLS, ATLAS, PARTICLE_SIZE } from "../core/constants.js";

const f = (v) => (Number.isInteger(v) ? v.toFixed(1) : String(v));

export const atlasGLSL = /* glsl */ `
const ivec3 DIM=ivec3(${SIZE[0]},${SIZE[1]},${SIZE[2]});
const vec3 LO=vec3(${f(MIN[0])},${f(MIN[1])},${f(MIN[2])});
const vec3 HI=vec3(${f(MAX[0])},${f(MAX[1])},${f(MAX[2])});
const vec3 CELL=vec3(${f(CELL[0])},${f(CELL[1])},${f(CELL[2])});
const ivec2 ATLAS=ivec2(${ATLAS[0]},${ATLAS[1]});
const float BAND=${BAND};
const float VOXEL_VOLUME=${VOXEL_VOLUME};
ivec2 addr(ivec3 q){ q=clamp(q,ivec3(0),DIM-1); return ivec2((q.z%${ATLAS_COLS})*${SIZE[0]}+q.x, (q.z/${ATLAS_COLS})*${SIZE[1]}+q.y); }
ivec3 voxelAt(ivec2 uv){ ivec2 tile=uv/ivec2(${SIZE[0]},${SIZE[1]}); return ivec3(uv.x%${SIZE[0]}, uv.y%${SIZE[1]}, tile.y*${ATLAS_COLS}+tile.x); }
vec3 worldAt(ivec3 q){ return LO+(vec3(q)+0.5)*CELL; }
vec4 fetchVoxel(sampler2D tex, ivec3 q){ return texelFetch(tex, addr(q), 0); }
vec4 sampleVolume(sampler2D tex, vec3 p){
  vec3 q=clamp((p-LO)/CELL-0.5, vec3(0), vec3(DIM)-1.001);
  ivec3 i=ivec3(floor(q)); vec3 f=fract(q);
  #ifdef LINEAR_VOLUME
    vec2 uv0=(vec2((i.z%${ATLAS_COLS})*${SIZE[0]},(i.z/${ATLAS_COLS})*${SIZE[1]})+q.xy+0.5)/vec2(ATLAS);
    int z1=i.z+1; vec2 uv1=(vec2((z1%${ATLAS_COLS})*${SIZE[0]},(z1/${ATLAS_COLS})*${SIZE[1]})+q.xy+0.5)/vec2(ATLAS);
    return mix(textureLod(tex,uv0,0.), textureLod(tex,uv1,0.), f.z);
  #else
    return mix(
      mix(mix(fetchVoxel(tex,i), fetchVoxel(tex,i+ivec3(1,0,0)), f.x),
          mix(fetchVoxel(tex,i+ivec3(0,1,0)), fetchVoxel(tex,i+ivec3(1,1,0)), f.x), f.y),
      mix(mix(fetchVoxel(tex,i+ivec3(0,0,1)), fetchVoxel(tex,i+ivec3(1,0,1)), f.x),
          mix(fetchVoxel(tex,i+ivec3(0,1,1)), fetchVoxel(tex,i+ivec3(1,1,1)), f.x), f.y), f.z);
  #endif
}
float sdfAt(sampler2D tex, vec3 p){ return sampleVolume(tex,p).r + length(max(max(LO-p,p-HI),vec3(0))); }
vec3 normalAt(sampler2D tex, vec3 p, float e){
  vec3 g=vec3(sdfAt(tex,p+vec3(e,0,0))-sdfAt(tex,p-vec3(e,0,0)),
              sdfAt(tex,p+vec3(0,e,0))-sdfAt(tex,p-vec3(0,e,0)),
              sdfAt(tex,p+vec3(0,0,e))-sdfAt(tex,p-vec3(0,0,e)));
  return length(g)>1e-6 ? normalize(g) : vec3(0,1,0);
}
// compact ellipsoidal kernel, squashed along the surface normal (gouges, not bowls)
float kernelWeight(vec3 p, vec3 c, vec3 n, float r){
  vec3 q=p-c; float qn=dot(q,n); float qt=length(q-n*qn);
  float d=length(vec2(qt, qn*1.8));
  float a=max(0., 1.-d/r);
  return a*a;
}
float grainW(ivec3 q, int id, int tick){
  float s=float(q.x*374761393 + q.y*668265263 + q.z*1274126177 + id*69069 + tick*131);
  return 0.55+0.9*fract(sin(s)*43758.5453);
}
int grainId(vec3 c){ return int(fract(sin(dot(c, vec3(12.9898,78.233,37.719)))*43758.5453)*4096.); }
float bandW(float d){ return 1.0-clamp((abs(d)-BAND)/(2.0*BAND), 0.0, 1.0); }
vec2 exchangeW(vec4 v, float k){ return k*bandW(v.r)*vec2(v.a, 1.0-v.a); }
ivec2 particleUV(int id){ return ivec2(id%${PARTICLE_SIZE[0]}, id/${PARTICLE_SIZE[0]}); }
float carveRadius(float footprint){ return clamp(footprint*0.55, 0.5, 1.15); }
float hash1(vec3 p){ vec3 q=fract(p*0.1031); q+=dot(q,q.yzx+33.33); return fract((q.x+q.y)*q.z); }
float vnoise(vec3 p){
  vec3 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(mix(hash1(i),hash1(i+vec3(1,0,0)),f.x),mix(hash1(i+vec3(0,1,0)),hash1(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash1(i+vec3(0,0,1)),hash1(i+vec3(1,0,1)),f.x),mix(hash1(i+vec3(0,1,1)),hash1(i+vec3(1,1,1)),f.x),f.z),f.z);
}
float riverCenter(float z, float meander, float offset){ return meander*(2.5*sin(z*0.15)+sin(z*0.36+1.))+offset; }
vec3 riverCurrent(vec3 p, vec4 river, float meander){
  float deriv=meander*(0.375*cos(p.z*0.15)+0.36*cos(p.z*0.36+1.));
  vec3 tangent=normalize(vec3(deriv,0,1));
  float lateral=clamp(riverCenter(p.z,meander,river.w)-p.x, -river.y, river.y)*0.65;
  return vec3(tangent.x*river.x, -0.25, tangent.z*river.x + lateral*0.0);
}
`;

export const fullscreenVertex = /* glsl */ `#version 300 es
void main(){ vec2 p=vec2((gl_VertexID<<1)&2, gl_VertexID&2); gl_Position=vec4(p*2.-1.,0,1); }`;

export function header(atlasGLSL) {
  return `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
${atlasGLSL}
`;
}

// Uniform block shared by simulation passes (mirrors Solver.params)
export const uniformsGLSL = `
uniform sampler2D terrain, positions, velocities, cargo, metadata, species, materials, impacts, normalsTex;
uniform vec4 physics;      // dt, rainfall, restitution, wind
uniform vec4 process;      // erosion, hardness, deposition, capacity
uniform vec4 config;       // footprint, grainSize, activeCount, sourceMode
uniform vec4 environment;  // waterLevel, strata, seed, tick
uniform vec4 canyonShape;  // width, meander, flare, unused
uniform vec4 river;        // speed, width, depth, offset
uniform vec4 windField;    // speed, height, spread, dirRad
uniform vec4 weather;      // agentDiameter, chemRate, solubility, riverEnabled
uniform vec4 extra;        // thermal, stability, unused, unused
`;

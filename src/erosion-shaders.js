// Frontier - Fixed hydraulic SDF erosion shaders (rewritten, not copied)
// Fixes: larger footprint, larger erosion cap, Gaea-like flow, wind spires

export const ATLAS_COLS = 16;
export const PARTICLE_SIZE = [64, 32];
export const MAX_PARTICLES = 2048;
export const SUPPORT_CELLS = 5; // larger kernel
export const SLICE_COUNT = 11; // -5..+5
export const BAND = 0.32;

export const fullscreenVertex = `#version 300 es
void main(){ vec2 p=vec2((gl_VertexID<<1)&2, gl_VertexID&2); gl_Position=vec4(p*2.-1.,0,1); }`;

export const atlasGLSL = `
const ivec3 DIM=ivec3(112,72,112);
const vec3 LO=vec3(-22,-4,-20);
const vec3 HI=vec3(22,22,20);
const vec3 CELL=(HI-LO)/vec3(DIM);
const ivec2 ATLAS=ivec2(1792,504);
const float BAND=0.32;
const float VOXEL_VOLUME=(44./112.)*(26./72.)*(40./112.);
ivec2 addr(ivec3 q){ q=clamp(q,ivec3(0),DIM-1); return ivec2((q.z%16)*112+q.x, (q.z/16)*72+q.y); }
ivec3 voxelAt(ivec2 uv){ ivec2 tile=uv/ivec2(112,72); return ivec3(uv.x%112, uv.y%72, tile.y*16+tile.x); }
vec3 worldAt(ivec3 q){ return LO+(vec3(q)+0.5)*CELL; }
vec4 fetchVoxel(sampler2D tex, ivec3 q){ return texelFetch(tex, addr(q), 0); }
vec4 sampleVolume(sampler2D tex, vec3 p){
  vec3 q=clamp((p-LO)/CELL-0.5, vec3(0), vec3(DIM)-1.001);
  ivec3 i=ivec3(floor(q)); vec3 f=fract(q);
  #ifdef LINEAR_VOLUME
    vec2 uv0=(vec2((i.z%16)*112,(i.z/16)*72)+q.xy+0.5)/vec2(ATLAS);
    int z1=i.z+1; vec2 uv1=(vec2((z1%16)*112,(z1/16)*72)+q.xy+0.5)/vec2(ATLAS);
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
vec3 normalAt(sampler2D tex, vec3 p){
  vec3 g=vec3(sdfAt(tex,p+vec3(0.18,0,0))-sdfAt(tex,p-vec3(0.18,0,0)),
              sdfAt(tex,p+vec3(0,0.18,0))-sdfAt(tex,p-vec3(0,0.18,0)),
              sdfAt(tex,p+vec3(0,0,0.18))-sdfAt(tex,p-vec3(0,0,0.18)));
  return length(g)>1e-6 ? normalize(g) : vec3(0,1,0);
}
float kernelWeight(vec3 p, vec3 c, float r){ float d=length(p-c); float a=max(0.,1.-d/r); return a*a*a; }
vec2 exchangeW(vec4 v, float k){ float band=1.-smoothstep(BAND,2.*BAND,abs(v.r)); return k*band*vec2(v.a,1.-v.a); }
ivec2 particleUV(int id){ return ivec2(id%64, id/64); }
`;

const header = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
${atlasGLSL}
`;

const uniforms = `
uniform sampler2D terrain, positions, velocities, cargo, metadata, species, materials, impacts;
uniform vec4 physics; // dt, rainfall, restitution, wind
uniform vec4 process; // erosion, hardness, deposition, capacity
uniform vec4 config; // footprint, grainSize, activeCount, sourceMode
uniform vec4 environment; // waterLevel, strata, seed, tick
uniform vec4 canyonShape; // width, meander, flare, unused
uniform vec4 river; // speed, width, depth, offset
uniform vec4 windField; // speed, height, spread, dirRad
uniform vec4 weather; // agentDiameter, chemRate, solubility, riverEnabled
uniform vec4 extra; // thermal, unused, unused, unused
float total4(vec4 a){ return dot(a,vec4(1)); }
float riverCenter(float z){ return canyonShape.y*(2.5*sin(z*0.15)+sin(z*0.36+1.))+river.w; }
float riverMask(vec3 p){
  return weather.w * (1.-smoothstep(river.y, river.y+2.5, abs(p.x-riverCenter(p.z)))) * (1.-smoothstep(environment.x+0.3, environment.x+1.3, p.y));
}
vec3 riverCurrent(vec3 p){
  float deriv=canyonShape.y*(0.375*cos(p.z*0.15)+0.36*cos(p.z*0.36+1.));
  vec3 tangent=normalize(vec3(deriv,0,1));
  float lateral=clamp(riverCenter(p.z)-p.x, -river.y, river.y)*0.65;
  return tangent*river.x + vec3(lateral, -0.25, 0);
}
vec4 depositedMix(vec4 a){ vec4 w=a*vec4(0.4,0.07,1.,0); return w/max(total4(w),1e-10); }
`;

export const motionFragment = header + uniforms + `
layout(location=0) out vec4 nextPosition;
layout(location=1) out vec4 nextVelocity;
layout(location=2) out vec4 nextMetadata;
layout(location=3) out vec4 impact;
float rand(float x){ return fract(sin(x*12.9898+environment.z*0.17)*43758.5453); }
void main(){
  ivec2 uv=ivec2(gl_FragCoord.xy);
  int id=uv.y*64+uv.x;
  vec4 oldP=texelFetch(positions,uv,0), oldV=texelFetch(velocities,uv,0), meta=texelFetch(metadata,uv,0);
  nextPosition=oldP; nextVelocity=oldV; nextMetadata=meta; impact=vec4(0);
  if(float(id)>=config.z) return;
  vec3 p=oldP.xyz, v=oldV.xyz;
  float age=oldP.w, water=oldV.w, dt=physics.x;
  float kind=meta.x;
  vec4 load=texelFetch(species,uv,0);
  float life = kind==2. ? 35. : kind==4. ? 50. : 25.;
  bool expired = age<0. || age>life || water<0.008 || any(lessThan(p,LO+vec3(0.25))) || any(greaterThan(p,HI-vec3(0.25))) || total4(load)>12.;
  if(expired){
    if(physics.y<=0. || rand(float(id)+environment.w*3.17)>=physics.y*1.2){ nextPosition.w=-1.; nextVelocity=vec4(0); return; }
    float seed=float(id)*7.13+environment.w*1.77;
    kind=config.w;
    nextMetadata=vec4(kind, config.x, weather.x, physics.z);
    impact.w=1.;
    vec2 xz=vec2(rand(seed),rand(seed+31.1))*vec2(36,30)-vec2(18,15);
    if(kind==2.){
      float z=environment.w<0.5 ? mix(-14.,14.,rand(seed+3.)) : -14.5;
      float x=riverCenter(z)+(rand(seed+8.)-0.5)*river.y*1.6;
      p=vec3(x, environment.x - river.z*rand(seed+12.), z);
      for(int j=0;j<8;j++){ float d=sdfAt(terrain,p); if(d>=0.12) break; p+=normalAt(terrain,p)*min(0.8,0.12-d); }
      v=riverCurrent(p);
    } else if(kind==3.){
      vec2 dir=vec2(cos(windField.w), sin(windField.w)), side=vec2(-dir.y, dir.x);
      vec2 horiz=side*(rand(seed+5.)-0.5)*28.;
      float extent=min((20.8+sign(dir.x)*horiz.x)/max(abs(dir.x),0.0001), (18.8+sign(dir.y)*horiz.y)/max(abs(dir.y),0.0001));
      horiz-=dir*max(0.,extent);
      p=vec3(horiz.x, clamp(windField.y+(rand(seed+9.)-0.5)*windField.z, -1., 20.), horiz.y);
      v=vec3(dir.x,0,dir.y)*windField.x;
    } else {
      if(kind==1.) xz=vec2(-10,-7)+(vec2(rand(seed+3.),rand(seed+8.))-0.5)*3.;
      p=vec3(xz.x,21.,xz.y);
      for(int j=0;j<100;j++){ float d=sdfAt(terrain,p); if(d<0.08 || p.y<-1.4) break; p.y-=clamp(d*0.6,0.04,1.); }
      vec3 n=normalAt(terrain,p); p+=n*(kind==4.?0.38:0.12);
      v=vec3(physics.w*0.7, kind==4.?-5.5:-2.8, kind==1.?1.8:0.3);
      impact.x=kind==4.?6.:2.8;
    }
    nextPosition=vec4(p,0); nextVelocity=vec4(v,1); return;
  }
  float solidLoad=total4(load), coarse=load.z/max(solidLoad,0.0001);
  float collisionR=max(0.38, min(0.65, meta.y*0.45 + meta.z*0.0004));
  for(int i=0;i<4;i++){
    float h=dt*0.25;
    float flow=riverMask(p);
    float depth=environment.x-p.y;
    bool wet=flow>0.05 || depth>0.;
    if(kind==3. && !wet){
      vec3 air=vec3(cos(windField.w),0,sin(windField.w))*windField.x;
      float settling=clamp(meta.z*meta.z*0.1, 0.015, 1.2);
      air.y=(windField.y-p.y)*0.45 + sin(p.z*0.65+environment.w*0.08)*0.4 - settling;
      v=mix(v,air,1.-exp(-h*2.6));
    } else {
      float grav=wet? mix(0.1,0.8,coarse):1.;
      v+=vec3(physics.w*0.35, -9.81*grav, physics.w*0.08)*h;
      v*=exp(-h*(wet?0.42:0.12));
      if(flow>0.01){ vec3 cur=riverCurrent(p); float drag=(kind==4.?1.6:3.2)*(1.-coarse*0.6); v=mix(v,cur,1.-exp(-h*drag*flow)); }
    }
    v*=min(1., 12./max(length(v),0.001));
    vec3 q=p+v*h;
    float d=sdfAt(terrain,q);
    if(d<collisionR){ vec3 n=normalAt(terrain,q); q+=n*(collisionR-d); float inward=min(dot(v,n),0.); impact.x=max(impact.x,-inward); impact.y=1.; v-=(1.+meta.w)*inward*n; v*=exp(-h*(kind==4.?0.9:0.45)); }
    p=q; impact.z=max(impact.z,flow);
  }
  water*=exp(-dt*((kind==2.||kind==3.||kind==4.)?0.003:0.028));
  nextPosition=vec4(p,age+dt); nextVelocity=vec4(v,water);
}
`;

export const eventFragment = header + uniforms + `
layout(location=0) out vec4 contactEvent;
layout(location=1) out vec4 exchangeEvent;
void main(){
  ivec2 uv=ivec2(gl_FragCoord.xy);
  int id=uv.y*64+uv.x;
  contactEvent=vec4(0); exchangeEvent=vec4(0);
  vec4 pos=texelFetch(positions,uv,0), vel=texelFetch(velocities,uv,0), meta=texelFetch(metadata,uv,0), hit=texelFetch(impacts,uv,0);
  if(float(id)>=config.z || pos.w<0.) return;
  float d=sdfAt(terrain,pos.xyz);
  if(d>1.2 || d<-0.8) return;
  vec3 n=normalAt(terrain,pos.xyz);
  vec3 c=pos.xyz - n*d;
  float radius=meta.y;
  vec2 sums=vec2(0);
  ivec3 center=ivec3(floor((c-LO)/CELL));
  for(int z=-5;z<=5;z++)for(int y=-5;y<=5;y++)for(int x=-5;x<=5;x++){
    ivec3 q=center+ivec3(x,y,z); if(any(lessThan(q,ivec3(0)))||any(greaterThanEqual(q,DIM))) continue;
    float k=kernelWeight(worldAt(q),c,radius); if(k<=0.) continue; sums+=exchangeW(fetchVoxel(terrain,q),k);
  }
  vec4 mixture=hit.w>0.5?vec4(0):texelFetch(species,uv,0);
  float load=total4(mixture), speed=length(vel.xyz), water=vel.w, dt=physics.x;
  float layer=0.5+0.5*sin(c.y*3.5);
  float hard=clamp(process.y*0.7 + environment.y*layer*0.45, 0.05, 0.95);
  float loose=clamp(total4(sampleVolume(materials,c))/(VOXEL_VOLUME*0.5),0.,1.);
  float resist=mix(1.,0.22,loose);
  float slope=1.-clamp(dot(n,vec3(0,1,0)),0.,1.);
  float capacityBase = (0.08 + process.w*0.55) * water * (0.25 + speed*0.45) * (0.35 + slope*1.2);
  float capacity = max(0.015, capacityBase);
  float erosion=0., deposition=0.;
  float kind=meta.x;

  // --- Hydraulic (rain/runoff/river) : Gaea-like capacity model ---
  if(kind==0. || kind==1. || kind==2.){
    float stress = sqrt(speed / max(0.18, radius*0.5));
    float critical = 0.06 + hard*0.75 + environment.y*layer*0.28;
    critical *= resist;
    float hemisphere = 2.094*pow(radius,3.); // affected volume
    // FIXED: larger coefficient, not tiny
    float detach = process.x * max(0., stress - critical) * hemisphere * 1.8 * dt * (0.6+water) * (0.6+slope);
    // Ensure minimum visible erosion when flowing
    if(detach>0.0005) detach=max(detach, 0.012);
    // Thermal component for steep slopes
    float thermal = extra.x * max(0., slope-0.55) * 0.04 * dt;
    detach += thermal;
    float deficit = capacity - load;
    if(deficit>0.) erosion = min(detach, deficit);
    else deposition = min(-deficit*process.z, load*0.6);
  }
  // --- Wind : abrasion for spires ---
  else if(kind==3.){
    vec2 windDir=vec2(cos(windField.w), sin(windField.w));
    vec3 windVec=vec3(windDir.x,0,windDir.y);
    float exposure = max(0., dot(n, -windVec)) * (0.4 + slope*1.1);
    // Higher exposure on ridges, less in valleys
    float ridgeBoost = 1. + slope*0.8;
    erosion = process.x * windField.x * exposure * ridgeBoost * 0.12 * dt;
    if(erosion>0.0003) erosion=max(erosion, 0.008);
    // Wind deposits in sheltered lee
    if(exposure<0.08 && speed<1.2) deposition = load*0.25*process.z;
    capacity = windField.x*0.12 + speed*0.06;
  }
  // --- Rockfall : impact ---
  else if(kind==4.){
    float mass=2650.*0.5236*pow(meta.z*0.001,3.);
    float energy=0.5*mass*hit.x*hit.x;
    erosion = process.x * pow(max(0.,energy),0.55) * 0.08 * dt;
    if(erosion>0.0005) erosion=max(erosion,0.015);
  }
  // --- Chemical : dissolution ---
  else if(kind==5.){
    float unsat=max(0.,1.-load/max(capacity,0.0001));
    erosion = process.x*weather.y*unsat*water*0.25*dt/(0.3+hard);
    if(erosion>0.0004) erosion=max(erosion,0.006);
  }

  // Cap by available solid/empty with FIXED larger factor (0.5 not 0.06)
  erosion = min(erosion, sums.x*VOXEL_VOLUME*0.55);
  deposition = min(deposition, sums.y*VOXEL_VOLUME*0.55);
  // Prevent zero erosion due to tiny cap
  if(erosion>0. && sums.x*VOXEL_VOLUME<0.001) erosion=0.;

  contactEvent=vec4(c,radius);
  exchangeEvent=vec4(erosion,deposition,sums);
}
`;

// Splat: scatter erosion/deposition demands to atlas
export const splatVertex = header + `
uniform sampler2D contacts, exchanges, species, metadata, positions;
uniform float waterLevel;
flat out float wet;
flat out vec4 spec;
flat out vec4 contact;
flat out vec4 exchange;
flat out int slice;
void main(){
  int id=gl_InstanceID/11;
  int off=gl_InstanceID%11-5;
  contact=texelFetch(contacts, particleUV(id),0);
  exchange=texelFetch(exchanges, particleUV(id),0);
  vec4 mix=texelFetch(species, particleUV(id),0)*vec4(0.4,0.07,1.,0);
  spec=mix/max(dot(mix,vec4(1)),1e-10);
  float kind=texelFetch(metadata, particleUV(id),0).x;
  wet=(kind==3.||kind==4.)? step(texelFetch(positions, particleUV(id),0).y, waterLevel) : 1.;
  int z=int(floor((contact.z-LO.z)/CELL.z))+off;
  slice=z;
  if(contact.w<=0. || z<0 || z>=DIM.z){ gl_Position=vec4(-2,-2,0,1); return; }
  vec2 corner=vec2((gl_VertexID==1||gl_VertexID==2||gl_VertexID==4)?1.:-1., (gl_VertexID>=2&&gl_VertexID<=4)?1.:-1.);
  vec2 q=(contact.xy-LO.xy)/CELL.xy + corner*(contact.w/CELL.xy + 1.2);
  q=clamp(q, vec2(0), vec2(DIM.x,DIM.y));
  vec2 pixel=q+vec2((z%16)*112, (z/16)*72);
  gl_Position=vec4(pixel/vec2(ATLAS)*2.-1.,0,1);
}
`;
export const splatFragment = header + `
uniform sampler2D terrain;
flat in vec4 contact, exchange, spec;
flat in float wet;
flat in int slice;
layout(location=0) out vec4 request;
layout(location=1) out vec4 reqSpecies;
void main(){
  ivec2 pix=ivec2(gl_FragCoord.xy);
  ivec3 q=voxelAt(pix);
  if(q.z!=slice) discard;
  float k=kernelWeight(worldAt(q), contact.xyz, contact.w);
  if(k<=0.) discard;
  vec2 w=exchangeW(fetchVoxel(terrain,q),k);
  vec2 demand=exchange.xy * w / max(exchange.zw, vec2(1e-9));
  request=vec4(demand, k*0.04*wet, 0);
  reqSpecies=spec*demand.y;
}
`;

export const applyFragment = header + `
uniform sampler2D terrain, requests, materials, speciesRequests;
layout(location=0) out vec4 nextTerrain;
layout(location=1) out vec4 acceptance;
layout(location=2) out vec4 nextMaterials;
void main(){
  ivec2 uv=ivec2(gl_FragCoord.xy);
  vec4 v=fetchVoxel(terrain, ivec3(0)); // dummy to avoid unused, actual fetch below
  vec4 cur=texelFetch(terrain,uv,0);
  vec4 req=texelFetch(requests,uv,0);
  vec4 mat=texelFetch(materials,uv,0);
  float erodeVol=min(req.x, cur.a*VOXEL_VOLUME);
  float depositVol=min(req.y, (1.-cur.a)*VOXEL_VOLUME + erodeVol);
  float solid=clamp(cur.a + (depositVol - erodeVol)/VOXEL_VOLUME, 0., 1.);
  float dist=cur.r;
  if(erodeVol+depositVol>0.) dist=BAND*(1.-2.*solid);
  nextTerrain=vec4(dist, min(1.,cur.g*0.995+req.z), cur.b+depositVol, solid);
  float er=req.x>0.? erodeVol/req.x : 0.;
  float dr=req.y>0.? depositVol/req.y : 0.;
  acceptance=vec4(er,dr,erodeVol,depositVol);
  vec4 speciesReq=texelFetch(speciesRequests,uv,0);
  float oldSolid=max(cur.a*VOXEL_VOLUME,1e-10);
  nextMaterials = mat*max(0.,1.-erodeVol/oldSolid) + speciesReq*dr;
}
`;

export const cargoFragment = header + uniforms + `
uniform sampler2D contacts, exchanges, acceptance, previousPositions, impacts;
layout(location=0) out vec4 nextCargo;
layout(location=1) out vec4 nextSpecies;
void main(){
  ivec2 uv=ivec2(gl_FragCoord.xy);
  vec4 old=texelFetch(cargo,uv,0), p=texelFetch(positions,uv,0), prev=texelFetch(previousPositions,uv,0), hit=texelFetch(impacts,uv,0);
  vec4 mix=texelFetch(species,uv,0);
  float kind=texelFetch(metadata,uv,0).x;
  if(float(uv.y*64+uv.x)>=config.z){ nextCargo=old; nextSpecies=mix; return; }
  bool retired=(p.w<0. && prev.w>=0.) || hit.w>0.5;
  if(retired){ old.w+=old.x; old.x=0.; mix=vec4(0); }
  vec4 c=texelFetch(contacts,uv,0), e=texelFetch(exchanges,uv,0);
  vec2 accepted=vec2(0);
  vec4 newMat=vec4(0);
  if(c.w>0. && e.x+e.y>0.){
    ivec3 center=ivec3(floor((c.xyz-LO)/CELL));
    for(int z=-5;z<=5;z++)for(int y=-5;y<=5;y++)for(int x=-5;x<=5;x++){
      ivec3 q=center+ivec3(x,y,z); if(any(lessThan(q,ivec3(0)))||any(greaterThanEqual(q,DIM))) continue;
      float k=kernelWeight(worldAt(q),c.xyz,c.w); if(k<=0.) continue;
      vec4 ground=fetchVoxel(terrain,q);
      vec2 w=exchangeW(ground,k);
      vec2 amt=e.xy*w/max(e.zw,vec2(1e-9))*texelFetch(acceptance, addr(q),0).xy;
      accepted+=amt;
      vec4 loose=texelFetch(materials,uv,0); // simplified
      // rock product: coarse from rockfall, sand from water, fines etc
      vec4 product;
      if(kind==4.) product=vec4(0.15,0.05,0.8,0);
      else if(kind==3.) product=vec4(0.6,0.3,0.1,0);
      else if(kind==5.) product=vec4(0,0,0,1);
      else product=vec4(0.5,0.3,0.2,0);
      newMat+=amt.x*product;
    }
  }
  mix=max(vec4(0), mix+newMat - depositedMix(mix)*accepted.y);
  float carried=max(0., old.x+accepted.x-accepted.y);
  mix*=carried/max(total4(mix),1e-12);
  nextSpecies=mix;
  nextCargo=vec4(carried, old.y+accepted.x, old.z+accepted.y, old.w);
}
`;

export const distanceFragment = header + `
uniform sampler2D terrain;
out vec4 nextTerrain;
void main(){
  ivec3 q=voxelAt(ivec2(gl_FragCoord.xy));
  vec4 v=fetchVoxel(terrain,q);
  if(v.a>0.0001 && v.a<0.9999){ v.r=BAND*(1.-2.*v.a); nextTerrain=v; return; }
  // propagate distance from neighbors (simple Eikonal)
  vec3 a=vec3(
    min(abs(fetchVoxel(terrain,q-ivec3(1,0,0)).r), abs(fetchVoxel(terrain,q+ivec3(1,0,0)).r)),
    min(abs(fetchVoxel(terrain,q-ivec3(0,1,0)).r), abs(fetchVoxel(terrain,q-ivec3(0,1,0)).r)),
    min(abs(fetchVoxel(terrain,q-ivec3(0,0,1)).r), abs(fetchVoxel(terrain,q+ivec3(0,0,1)).r))
  );
  float best=min(min(a.x+CELL.x, a.y+CELL.y), a.z+CELL.z);
  float h=min(min(CELL.x,CELL.y),CELL.z);
  // sort
  if(a.x>a.y){ float t=a.x;a.x=a.y;a.y=t; } if(a.y>a.z){ float t=a.y;a.y=a.z;a.z=t; } if(a.x>a.y){ float t=a.x;a.x=a.y;a.y=t; }
  float t=a.x+h;
  if(t>a.y) t=(a.x+a.y+sqrt(max(0.,2.*h*h-(a.x-a.y)*(a.x-a.y))))*0.5;
  if(t>a.z){ float sum=a.x+a.y+a.z; t=(sum+sqrt(max(0.,sum*sum-3.*(dot(a,a)-h*h))))/3.; }
  best=min(best,t);
  v.r=(v.a>=0.5?-1.:1.)*max(BAND,best);
  nextTerrain=v;
}
`;

export const sculptFragment = header + `
uniform sampler2D terrain, materials;
uniform vec4 brush;
uniform int tool;
layout(location=0) out vec4 nextTerrain;
layout(location=1) out vec4 nextMaterials;
void main(){
  ivec3 q=voxelAt(ivec2(gl_FragCoord.xy));
  vec4 v=fetchVoxel(terrain,q);
  vec3 p=worldAt(q);
  float r=distance(p,brush.xyz);
  float d=v.r;
  if(tool==1) d=max(d, brush.w - r);
  else if(tool==2) d=min(d, r - brush.w);
  else if(r<brush.w){
    float avg=(fetchVoxel(terrain,q+ivec3(1,0,0)).r + fetchVoxel(terrain,q-ivec3(1,0,0)).r +
               fetchVoxel(terrain,q+ivec3(0,1,0)).r + fetchVoxel(terrain,q-ivec3(0,1,0)).r +
               fetchVoxel(terrain,q+ivec3(0,0,1)).r + fetchVoxel(terrain,q-ivec3(0,0,1)).r)/6.;
    d=mix(d,avg,0.7*(1.-r/brush.w));
  }
  float oldSolid=v.a;
  if(d!=v.r){ v.r=d; v.a=clamp(0.5-d/(2.*BAND),0.,1.); }
  nextTerrain=v;
  nextMaterials=fetchVoxel(materials,q)*min(1., v.a/max(oldSolid,1e-9));
}
`;

export const pickFragment = header + `
uniform sampler2D terrain;
uniform vec3 origin, direction;
out vec4 hit;
void main(){
  hit=vec4(0);
  vec3 safe=sign(direction+vec3(1e-12))*max(abs(direction),vec3(1e-6));
  vec3 a=(LO-origin)/safe, b=(HI-origin)/safe, n=min(a,b), f=max(a,b);
  float t=max(0., max(max(n.x,n.y),n.z)), end=min(min(f.x,f.y),f.z);
  for(int i=0;i<240;i++){ if(t>end) return; vec3 p=origin+direction*t; float d=sdfAt(terrain,p); if(d<0.075){ hit=vec4(p,1); return; } t+=max(0.035,d*0.6); }
}
`;

export const grainVertex = header + `
uniform sampler2D terrain, positions, cargo, exchanges, metadata, species;
uniform vec4 eye, target;
uniform float activeCount, visualMode, waterLevel;
out vec4 grainColor;
void main(){
  ivec2 uv=particleUV(gl_VertexID);
  vec4 p=texelFetch(positions,uv,0), load=texelFetch(cargo,uv,0), ev=texelFetch(exchanges,uv,0), meta=texelFetch(metadata,uv,0), s=texelFetch(species,uv,0);
  grainColor=vec4(0); gl_Position=vec4(-2,-2,0,1); gl_PointSize=1.;
  if(float(gl_VertexID)>=activeCount || p.w<0.) return;
  bool plume=visualMode>0.5;
  float partic=s.x+s.y+s.z;
  if(plume && (partic<0.002 || p.y>waterLevel+0.6)) return;
  vec3 forward=normalize(target.xyz-eye.xyz), right=normalize(cross(forward,vec3(0,1,0))), up=cross(right,forward), rel=p.xyz-eye.xyz;
  float z=dot(rel,forward); if(z<0.1) return;
  float lenRay=length(rel); vec3 ray=rel/lenRay; float t=0.;
  for(int i=0;i<90;i++){ if(t>lenRay-0.25) break; float d=sdfAt(terrain, eye.xyz+ray*t); if(d<0.06) return; t+=clamp(d*0.65,0.05,2.); }
  if(t<lenRay-0.25) return;
  gl_Position=vec4(dot(rel,right)/(0.62*target.w), dot(rel,up)/0.62, 0, z);
  vec3 matCol=(s.x*vec3(0.85,0.59,0.26)+s.y*vec3(0.46,0.44,0.32)+s.z*vec3(0.58,0.52,0.44)+s.w*vec3(0.74,0.55,0.94))/max(load.x,0.00001);
  vec3 fresh=meta.x==3.?vec3(0.9,0.78,0.43):meta.x==4.?vec3(0.67,0.62,0.55):meta.x==5.?vec3(0.65,0.52,1.):vec3(0.3,0.8,1.);
  vec3 col=mix(fresh,matCol,clamp(load.x*12.,0.,1.));
  if(ev.y>ev.x && !plume) col=mix(col,vec3(0.53,1.,0.45),0.5);
  gl_PointSize=plume? clamp(650./z,6.,28.) : clamp((120.+log(1.+meta.z)*24.)/z,2.2,12.);
  grainColor=vec4(plume?matCol:col, plume?min(0.22,partic*2.):0.88);
}
`;
export const grainFragment = `#version 300 es
precision highp float;
in vec4 grainColor;
out vec4 color;
void main(){ float r=length(gl_PointCoord-0.5)*2.; if(r>1. || grainColor.a==0.) discard; color=vec4(grainColor.rgb, grainColor.a*(1.-smoothstep(0.15,1.,r))); }`;

// Thermal erosion: slump steep slopes
export const thermalFragment = header + `
uniform sampler2D terrain, materials;
uniform float thermalRate;
layout(location=0) out vec4 nextTerrain;
layout(location=1) out vec4 nextMaterials;
void main(){
  ivec3 q=voxelAt(ivec2(gl_FragCoord.xy));
  vec4 v=fetchVoxel(terrain,q);
  if(v.a<0.01 || v.a>0.99){ nextTerrain=v; nextMaterials=fetchVoxel(materials,q); return; }
  // Check 4 horizontal neighbors for height difference
  float solid=v.a;
  vec4 mat=fetchVoxel(materials,q);
  float transfer=0.;
  ivec3 dirs[4]=ivec3[4](ivec3(1,0,0),ivec3(-1,0,0),ivec3(0,0,1),ivec3(0,0,-1));
  for(int i=0;i<4;i++){
    ivec3 nb=q+dirs[i];
    if(any(lessThan(nb,ivec3(0)))||any(greaterThanEqual(nb,DIM))) continue;
    vec4 n=fetchVoxel(terrain,nb);
    float diff=solid - n.a;
    // If slope steep (difference large) and current higher than neighbor
    if(diff>0.35){
      float amount=thermalRate*diff*0.15;
      transfer-=amount;
      // deposit will be handled in neighbor? For simplicity, just erode here and let deposition happen via global? We'll just reduce solid here
    }
  }
  float newSolid=clamp(solid+transfer,0.,1.);
  v.r=BAND*(1.-2.*newSolid);
  v.a=newSolid;
  nextTerrain=v;
  nextMaterials=mat* (newSolid/max(solid,1e-9));
}
`;

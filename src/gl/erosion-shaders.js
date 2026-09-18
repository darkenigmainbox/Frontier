// Frontier — GPU erosion solver shaders (WebGL2, MRT ping-pong).
// 1:1 mirror of the validated CPU solver (src/core/solver.js):
//   motion → event → splat → apply → cargo → redistance(+Lipschitz clamp) → thermal
// Anti-runaway: strict sediment budget + armor feedback + stall deposition +
// thin-wall guard. Anti-blur: compact normal-squashed shell kernels with grain
// modulation + redistancing.

import { atlasGLSL, fullscreenVertex, header, uniformsGLSL } from "./common.js";
import { stampGLSL } from "../core/stamps.js";
import { SPLAT_SLICES, PARTICLE_SIZE, ATLAS_COLS, SIZE } from "../core/constants.js";

const H = () => header(atlasGLSL);
const U = uniformsGLSL;

// ---------------------------------------------------------------- motion ----
export const motionFragment = H() + U + `
layout(location=0) out vec4 nextPosition;
layout(location=1) out vec4 nextVelocity;
layout(location=2) out vec4 nextMetadata;
layout(location=3) out vec4 impact;
float rand(float x){ return fract(sin(x*12.9898+environment.z*0.17)*43758.5453); }
void main(){
  ivec2 uv=ivec2(gl_FragCoord.xy);
  int id=uv.y*${PARTICLE_SIZE[0]}+uv.x;
  vec4 oldP=texelFetch(positions,uv,0), oldV=texelFetch(velocities,uv,0), meta=texelFetch(metadata,uv,0);
  nextPosition=oldP; nextVelocity=oldV; nextMetadata=meta; impact=vec4(0);
  if(float(id)>=config.z) return;
  vec3 p=oldP.xyz, v=oldV.xyz;
  float age=oldP.w, water=oldV.w, dt=physics.x;
  float kind=meta.x;
  vec4 load=texelFetch(species,uv,0);
  float life = kind==2. ? 35. : kind==4. ? 50. : 25.;
  bool expired = age<0. || age>life || water<0.008 || dot(load,vec4(1))>12.
    || any(lessThan(p,LO+vec3(0.25))) || any(greaterThan(p,HI-vec3(0.25)));
  if(expired){
    if(physics.y<=0. || rand(float(id)+environment.w*3.17)>=physics.y*1.2){ nextPosition.w=-1.; nextVelocity=vec4(0); return; }
    float seed=float(id)*7.13+environment.w*1.77;
    float kindN=config.w;
    nextMetadata=vec4(kindN, config.x, config.y*1000.+rand(seed+4.)*4., physics.z);
    impact.w=1.;
    vec2 xz=vec2(rand(seed),rand(seed+31.1))*vec2(HI.x-LO.x-2.,HI.z-LO.z-2.)+vec2(LO.x+1.,LO.z+1.);
    vec3 q=p; vec3 nv=vec3(0);
    if(kindN==2.){
      float z=LO.z+0.6;
      float x=riverCenter(z,canyonShape.y,river.w)+(rand(seed+8.)-0.5)*river.y*1.4;
      q=vec3(x, environment.x - river.z*rand(seed+12.), z);
      nv=riverCurrent(q,river,canyonShape.y);
    } else if(kindN==3.){
      vec2 dir=vec2(cos(windField.w), sin(windField.w)), side=vec2(-dir.y, dir.x);
      vec2 horiz=side*(rand(seed+5.)-0.5)*(HI.x-LO.x-6.);
      float extent=min((HI.x-0.8-sign(dir.x)*horiz.x)/max(abs(dir.x),0.0001), (HI.z-0.8-sign(dir.y)*horiz.y)/max(abs(dir.y),0.0001));
      horiz-=dir*max(0.,extent);
      q=vec3(horiz.x, clamp(windField.y+(rand(seed+9.)-0.5)*windField.z, LO.y+1., HI.y-2.), horiz.y);
      nv=vec3(dir.x,0,dir.y)*windField.x;
    } else if(kindN==4.){
      q=vec3(mix(LO.x+2.,HI.x-2.,rand(seed+1.)), HI.y-2., mix(LO.z+2.,HI.z-2.,rand(seed+2.)));
      for(int j=0;j<60;j++){ float d=sdfAt(terrain,q); if(d<0.1 || q.y<LO.y+1.5) break; q.y-=clamp(d*0.6,0.05,1.2); }
      nv=vec3(0,-5.5,0);
    } else {
      q=vec3(xz.x, HI.y-1., xz.y);
      for(int j=0;j<90;j++){ float d=sdfAt(terrain,q); if(d<0.1 || q.y<LO.y+1.5) break; q.y-=clamp(d*0.6,0.04,1.0); }
      nv=vec3(physics.w*0.7*(rand(seed+6.)-0.2), kindN==4.?-5.5:-2.8, 0.3*rand(seed+7.));
    }
    vec3 n=normalAt(terrain,q,0.18);
    float d0=sdfAt(terrain,q);
    if(d0<0.15) q+=n*(0.15-d0);
    nextPosition=vec4(q,0); nextVelocity=vec4(nv,1);
    return;
  }
  float solidLoad=dot(load,vec4(1)), coarse=clamp(load.z/max(solidLoad,0.0001),0.,1.);
  float collisionR=clamp(0.38+0.15*meta.y, 0.38, 0.7);
  for(int i=0;i<4;i++){
    float h=dt*0.25;
    if(kind==3.){
      vec2 dir=vec2(cos(windField.w), sin(windField.w));
      float settling=clamp(meta.z*meta.z*0.0001, 0.015, 1.2);
      vec3 air=vec3(dir.x*windField.x, (windField.y-p.y)*0.45 - settling, dir.y*windField.x);
      v=mix(v,air,1.-exp(-h*2.6));
    } else {
      float depth=environment.x-p.y;
      bool wet=depth>0.;
      float grav=wet? mix(0.1,0.8,coarse):1.;
      v+=vec3(physics.w*0.35, -9.81*grav, 0.)*h;
      v*=exp(-h*(wet?0.42:0.12));
      if((kind==2. || (wet && weather.w>0.5))){
        vec3 cur=riverCurrent(p,river,canyonShape.y);
        float drag=(kind==4.?1.6:3.2)*(1.-coarse*0.6);
        v=mix(v,cur,1.-exp(-h*drag));
      }
    }
    float sp=length(v);
    if(sp>12.) v*=12./sp;
    vec3 q=p+v*h;
    float d=sdfAt(terrain,q);
    if(d<collisionR){
      vec3 n=normalAt(terrain,q,0.18);
      q+=n*(collisionR-d);
      float inward=min(dot(v,n),0.);
      impact.x=max(impact.x,-inward); impact.y=1.;
      v-=(1.+meta.w)*inward*n;
      v*=exp(-h*(kind==4.?0.9:0.45));
    }
    p=q;
  }
  float evap=(kind==2.||kind==3.)?0.003:0.028;
  water*=exp(-dt*evap);
  nextPosition=vec4(p,age+dt);
  nextVelocity=vec4(v,water);
}
`;

// ----------------------------------------------------------------- event ----
// Per-particle contact + demand computation. The anti-runaway controller and
// the resolution-independent retreat-depth demand live here.
export const eventFragment = H() + U + `
layout(location=0) out vec4 contactEvent;   // xyz contact, w kernel radius
layout(location=1) out vec4 exchangeEvent;  // erodeM3, depositM3, sumSolid, sumAir
layout(location=2) out vec4 contactNormal;  // xyz normal, w wet flag
void main(){
  ivec2 uv=ivec2(gl_FragCoord.xy);
  int id=uv.y*${PARTICLE_SIZE[0]}+uv.x;
  contactEvent=vec4(0); exchangeEvent=vec4(0); contactNormal=vec4(0,1,0,0);
  vec4 pos=texelFetch(positions,uv,0), vel=texelFetch(velocities,uv,0), meta=texelFetch(metadata,uv,0), hit=texelFetch(impacts,uv,0);
  if(float(id)>=config.z || pos.w<0.) return;
  vec3 p=pos.xyz;
  float d=sdfAt(terrain,p);
  if(d>1.2 || d<-0.8) return;
  float r=carveRadius(meta.y);
  vec3 n=normalAt(terrain,p,0.18);
  vec3 c=p-n*d;
  float speed=length(vel.xyz), water=vel.w, dt=physics.x;
  float load=texelFetch(cargo,uv,0).x;
  float slope=1.-clamp(n.y,0.,1.);
  float layer=0.5+0.5*sin(c.y*3.5);
  float hard=clamp(process.y*0.7 + environment.y*layer*0.45, 0.05, 0.95);
  vec4 mat=sampleVolume(materials,c);
  float armor=mat.a;
  float kind=meta.x;
  float cap=0., phi=0., dtScale=3.0;

  if(kind==3.){ // wind abrasion
    vec2 wd=vec2(cos(windField.w), sin(windField.w));
    float exposure=max(0., n.x*-wd.x + n.z*-wd.y)*(0.4+slope*1.1);
    cap=min(0.3, (0.05*windField.x + 0.03*speed)*(1.-0.5*hard));
    phi=0.028*windField.x*exposure*dt*dtScale;
  } else if(kind==4.){ // rockfall impact
    float impactV=max(0., -dot(vel.xyz,n));
    float energy=0.5*2650.*0.02*impactV*impactV;
    cap=min(0.8, 0.05*pow(max(energy,1e-6),0.45)*(1.-0.6*hard));
    phi=0.14*pow(max(energy,1e-6),0.45)*dt*dtScale;
  } else if(kind==5.){ // chemical dissolution
    cap=0.5*(1.-0.4*hard);
    phi=process.w*weather.y*max(0.,1.-load/max(cap,1e-4))*water*0.25*dt*dtScale/(0.3+hard);
  } else { // hydraulic: rain / runoff / river
    float satV=clamp(speed/2.2, 0., 1.);
    cap=min(0.9, process.w*1.35*water*(0.22+0.78*satV)*(0.35+slope)*(1.-0.45*hard));
    float stress=sqrt(speed/max(0.18, meta.y*0.5));
    float critical=0.06 + hard*0.75 + environment.y*layer*0.28;
    phi=process.x*max(0., stress-critical*0.6)*dt*dtScale*(0.6+water)*(0.6+slope);
  }

  // retreat depth [m] → demand volume [m³]; resolution independent
  float area=3.14159*r*r;
  float demand=phi*0.005*area;
  // anti-runaway controller
  float stability=clamp(extra.y,0.,1.);
  float armorFloor=mix(0.22, 0.03, stability);
  demand*=mix(1.0, armorFloor, armor);
  float probe=2.2*r;
  float dDeep=sdfAt(terrain, c-n*probe);
  float thin=clamp(-dDeep/probe, 0., 1.);
  demand*=mix(0.3, 1.0, thin);
  // universal sediment budget: never exceed free capacity
  demand=min(demand, max(0., cap-load)*VOXEL_VOLUME);

  // deposition: capacity excess + stall dump (pits self-fill)
  float e=r*0.8;
  float lap=(sdfAt(terrain,c+vec3(e,0,0))+sdfAt(terrain,c-vec3(e,0,0))
            +sdfAt(terrain,c+vec3(0,e,0))+sdfAt(terrain,c-vec3(0,e,0))
            +sdfAt(terrain,c+vec3(0,0,e))+sdfAt(terrain,c-vec3(0,0,e))
            -6.0*sdfAt(terrain,c))/(e*e);
  float concave=clamp(-lap/6.0, 0., 1.);
  float depVox=process.z*max(0.,load-cap)*dt*dtScale*(0.6+1.2*concave);
  if(speed<0.35 && kind!=3.) depVox+=load*0.45*dt*6.0;
  float deposit=depVox*VOXEL_VOLUME;

  // kernel sums (same squashed ellipsoid + grain as the splat)
  float sumSolid=0., sumAir=0.;
  ivec3 center=ivec3(floor((c-LO)/CELL));
  for(int z=-3;z<=3;z++)for(int y=-3;y<=3;y++)for(int x=-3;x<=3;x++){
    ivec3 q=center+ivec3(x,y,z);
    if(any(lessThan(q,ivec3(0)))||any(greaterThanEqual(q,DIM))) continue;
    float k=kernelWeight(worldAt(q),c,n,r)*grainW(q,grainId(c),int(environment.w));
    if(k<=0.) continue;
    vec2 w=exchangeW(fetchVoxel(terrain,q),k);
    sumSolid+=w.x; sumAir+=w.y;
  }
  demand=min(demand, sumSolid*VOXEL_VOLUME*0.12); // hard per-contact area cap
  deposit=min(deposit, sumAir*VOXEL_VOLUME*0.36);

  float wet=(kind==2.||kind==4.)? step(p.y, environment.x) : (kind==3.?0.:1.);
  contactEvent=vec4(c, r);
  exchangeEvent=vec4(demand, deposit, sumSolid, sumAir);
  contactNormal=vec4(n, wet);
}
`;

// ----------------------------------------------------------------- splat ----
// Scatter demands to the volume atlas (additive), one instanced quad per
// particle × z-slice, restricted to the squashed kernel footprint.
export const splatVertex = H() + `
uniform sampler2D contacts, exchanges, normalsTex, species;
uniform vec4 environment;
flat out float wet;
flat out vec4 spec;
flat out vec4 contact;
flat out vec4 exchange;
flat out vec4 nrm;
flat out int slice;
void main(){
  int id=gl_InstanceID/${SPLAT_SLICES};
  int off=gl_InstanceID%${SPLAT_SLICES}-(${SPLAT_SLICES-1}/2);
  contact=texelFetch(contacts, particleUV(id),0);
  exchange=texelFetch(exchanges, particleUV(id),0);
  nrm=texelFetch(normalsTex, particleUV(id),0);
  vec4 mixv=texelFetch(species, particleUV(id),0)*vec4(0.4,0.07,1.,0);
  spec=mixv/max(dot(mixv,vec4(1)),1e-10);
  wet=nrm.w;
  int z=int(floor((contact.z-LO.z)/CELL.z))+off;
  slice=z;
  if(contact.w<=0. || exchange.x+exchange.y<=0. || z<0 || z>=DIM.z){ gl_Position=vec4(-2,-2,0,1); return; }
  vec2 corner=vec2((gl_VertexID==1||gl_VertexID==2||gl_VertexID==4)?1.:-1., (gl_VertexID>=2&&gl_VertexID<=4)?1.:-1.);
  vec2 q=(contact.xy-LO.xy)/CELL.xy + corner*(contact.w/CELL.xy + 1.2);
  q=clamp(q, vec2(0), vec2(DIM.x,DIM.y));
  vec2 pixel=q+vec2((z%${ATLAS_COLS})*${SIZE[0]}, (z/${ATLAS_COLS})*${SIZE[1]});
  gl_Position=vec4(pixel/vec2(ATLAS)*2.-1.,0,1);
}
`;
export const splatFragment = H() + `
uniform sampler2D terrain;
uniform vec4 environment;
flat in vec4 contact, exchange, spec, nrm;
flat in float wet;
flat in int slice;
layout(location=0) out vec4 request;
layout(location=1) out vec4 reqSpecies;
void main(){
  ivec2 pix=ivec2(gl_FragCoord.xy);
  ivec3 q=voxelAt(pix);
  if(q.z!=slice) discard;
  float k=kernelWeight(worldAt(q), contact.xyz, nrm.xyz, contact.w)*grainW(q, grainId(contact.xyz), int(environment.w));
  if(k<=0.) discard;
  vec2 w=exchangeW(fetchVoxel(terrain,q),k);
  vec2 demand=vec2(
    exchange.x * (w.x>0. ? w.x/max(exchange.z,1e-9) : 0.),
    exchange.y * (w.y>0. ? w.y/max(exchange.w,1e-9) : 0.));
  request=vec4(demand, k*0.02*wet, 0);
  reqSpecies=spec*demand.y;
}
`;

// ----------------------------------------------------------------- apply ----
// Materialize requests with hard per-voxel area caps + armor accumulation.
export const applyFragment = H() + `
uniform sampler2D terrain, requests, materials, speciesRequests;
layout(location=0) out vec4 nextTerrain;
layout(location=1) out vec4 acceptance;
layout(location=2) out vec4 nextMaterials;
void main(){
  ivec2 uv=ivec2(gl_FragCoord.xy);
  vec4 cur=texelFetch(terrain,uv,0);
  vec4 req=texelFetch(requests,uv,0);
  vec4 mat=texelFetch(materials,uv,0);
  // hard caps (anti-runaway): ≤12% of a voxel's solid per tick, ≤36% fill
  float erodeVol=min(req.x, cur.a*VOXEL_VOLUME*0.12);
  float depositVol=min(req.y, (1.-cur.a)*VOXEL_VOLUME*0.36 + erodeVol);
  float solid=clamp(cur.a + (depositVol - erodeVol)/VOXEL_VOLUME, 0., 1.);
  float dist=cur.r;
  if(erodeVol+depositVol>0.){
    if(solid>0.0001 && solid<0.9999) dist=BAND*(1.-2.*solid);
    else if(solid>=0.9999) dist=min(cur.r, -BAND);
    else dist=max(cur.r, BAND);
  }
  nextTerrain=vec4(dist, min(1., cur.g*0.995 + req.z), cur.b + depositVol, solid);
  float er=req.x>0.? erodeVol/req.x : 0.;
  float dr=req.y>0.? depositVol/req.y : 0.;
  acceptance=vec4(er, dr, erodeVol, depositVol);
  vec4 speciesReq=texelFetch(speciesRequests,uv,0);
  vec3 species=mat.rgb*max(0., 1.-erodeVol/max(cur.a*VOXEL_VOLUME,1e-10)) + speciesReq*min(1.,dr);
  // armor: integral of cumulative removal (worn rock resists further carving)
  float armor=clamp(mat.a + erodeVol/VOXEL_VOLUME*1.4 - 0.0004, 0., 1.);
  nextMaterials=vec4(clamp(species,0.,1.), armor);
}
`;

// ----------------------------------------------------------------- cargo ----
// Settle accepted erosion/deposition into the particles' sediment cargo.
export const cargoFragment = H() + U + `
uniform sampler2D contacts, exchanges, acceptance, previousPositions, materials;
layout(location=0) out vec4 nextCargo;
layout(location=1) out vec4 nextSpecies;
void main(){
  ivec2 uv=ivec2(gl_FragCoord.xy);
  vec4 old=texelFetch(cargo,uv,0), p=texelFetch(positions,uv,0), prev=texelFetch(previousPositions,uv,0), hit=texelFetch(impacts,uv,0);
  vec4 mixv=texelFetch(species,uv,0);
  float kind=texelFetch(metadata,uv,0).x;
  if(float(uv.y*${PARTICLE_SIZE[0]}+uv.x)>=config.z){ nextCargo=old; nextSpecies=mixv; return; }
  bool retired=(p.w<0. && prev.w>=0.) || hit.w>0.5;
  if(retired){ old.w+=old.x; old.x=0.; mixv=vec4(0); }
  vec4 c=texelFetch(contacts,uv,0), e=texelFetch(exchanges,uv,0), nrm=texelFetch(normalsTex,uv,0);
  float accepted=0., acceptedDep=0.;
  vec4 newMat=vec4(0);
  if(c.w>0. && e.x+e.y>0.){
    ivec3 center=ivec3(floor((c.xyz-LO)/CELL));
    for(int z=-3;z<=3;z++)for(int y=-3;y<=3;y++)for(int x=-3;x<=3;x++){
      ivec3 q=center+ivec3(x,y,z);
      if(any(lessThan(q,ivec3(0)))||any(greaterThanEqual(q,DIM))) continue;
      float k=kernelWeight(worldAt(q),c.xyz,nrm.xyz,c.w)*grainW(q, grainId(c.xyz), int(environment.w));
      if(k<=0.) continue;
      vec4 ground=fetchVoxel(terrain,q);
      vec2 w=exchangeW(ground,k);
      vec4 acc=texelFetch(acceptance, addr(q),0);
      accepted += e.x*(w.x>0.? w.x/max(e.z,1e-9):0.)*acc.x;
      acceptedDep += e.y*(w.y>0.? w.y/max(e.w,1e-9):0.)*acc.y;
      vec4 product;
      if(kind==4.) product=vec4(0.15,0.05,0.8,0);
      else if(kind==3.) product=vec4(0.6,0.3,0.1,0);
      else if(kind==5.) product=vec4(0,0,0,1);
      else product=vec4(0.5,0.3,0.2,0);
      newMat+=e.x*acc.x*product;
    }
  }
  vec4 depositedMix=mixv*vec4(0.4,0.07,1.,0);
  depositedMix/=max(dot(depositedMix,vec4(1)),1e-10);
  mixv=max(vec4(0), mixv + newMat - depositedMix*min(acceptedDep, old.x));
  float carried=max(0., old.x + accepted - min(acceptedDep, old.x));
  mixv*=carried/max(dot(mixv,vec4(1)),1e-12);
  nextSpecies=mixv;
  nextCargo=vec4(carried, old.y+accepted, old.z+acceptedDep, old.w);
}
`;

// ------------------------------------------------------------ redistancing ---
// Band voxels are exact (d = BAND·(1-2a)); everything else solved by Eikonal
// sweeps, finished with a Lipschitz clamp so the volume stays a valid SDF.
export const distanceFragment = H() + `
uniform sampler2D terrain;
uniform float sweepSign;
out vec4 nextTerrain;
void main(){
  ivec3 q=voxelAt(ivec2(gl_FragCoord.xy));
  vec4 v=fetchVoxel(terrain,q);
  if(v.a>0.0001 && v.a<0.9999){ v.r=BAND*(1.-2.*v.a); nextTerrain=v; return; }
  float sgn=v.a>=0.5?-1.:1.;
  float xm=abs(fetchVoxel(terrain,q-ivec3(1,0,0)).r);
  float xp=abs(fetchVoxel(terrain,q+ivec3(1,0,0)).r);
  float ym=abs(fetchVoxel(terrain,q-ivec3(0,1,0)).r);
  float yp=abs(fetchVoxel(terrain,q+ivec3(0,1,0)).r);
  float zm=abs(fetchVoxel(terrain,q-ivec3(0,0,1)).r);
  float zp=abs(fetchVoxel(terrain,q+ivec3(0,0,1)).r);
  float a1=min(xm,xp), a2=min(ym,yp), a3=min(zm,zp);
  if(a1>a2){ float t=a1;a1=a2;a2=t; } if(a2>a3){ float t=a2;a2=a3;a3=t; } if(a1>a2){ float t=a1;a1=a2;a2=t; }
  float h=min(min(CELL.x,CELL.y),CELL.z);
  float t=a1+h;
  if(t>a2) t=(a1+a2+sqrt(max(0.,2.*h*h-(a1-a2)*(a1-a2))))*0.5;
  if(t>a3){ float sum=a1+a2+a3; t=(sum+sqrt(max(0.,sum*sum-3.*(dot(vec3(a1,a2,a3),vec3(a1,a2,a3))-h*h))))/3.; }
  float cand=sgn*max(BAND,t);
  v.r=(sweepSign>0.5 || abs(cand)<abs(v.r)) ? cand : v.r;
  nextTerrain=v;
}
`;

// Lipschitz clamp: adjacent jumps ≤ 2·BAND + h — final SDF validity guarantee.
export const clampFragment = H() + `
uniform sampler2D terrain;
out vec4 nextTerrain;
void main(){
  ivec2 uv=ivec2(gl_FragCoord.xy);
  ivec3 q=voxelAt(uv);
  vec4 v=texelFetch(terrain,uv,0);
  float h=max(max(CELL.x,CELL.y),CELL.z);
  float L=2.*BAND + h;
  float lo=v.r-L, hi=v.r+L;
  lo=max(lo, fetchVoxel(terrain,q-ivec3(1,0,0)).r-L);
  lo=max(lo, fetchVoxel(terrain,q+ivec3(1,0,0)).r-L);
  lo=max(lo, fetchVoxel(terrain,q-ivec3(0,1,0)).r-L);
  lo=max(lo, fetchVoxel(terrain,q+ivec3(0,1,0)).r-L);
  lo=max(lo, fetchVoxel(terrain,q-ivec3(0,0,1)).r-L);
  lo=max(lo, fetchVoxel(terrain,q+ivec3(0,0,1)).r-L);
  hi=min(hi, fetchVoxel(terrain,q-ivec3(1,0,0)).r+L);
  hi=min(hi, fetchVoxel(terrain,q+ivec3(1,0,0)).r+L);
  hi=min(hi, fetchVoxel(terrain,q-ivec3(0,1,0)).r+L);
  hi=min(hi, fetchVoxel(terrain,q+ivec3(0,1,0)).r+L);
  hi=min(hi, fetchVoxel(terrain,q-ivec3(0,0,1)).r+L);
  hi=min(hi, fetchVoxel(terrain,q+ivec3(0,0,1)).r+L);
  v.r=clamp(v.r, lo, hi);
  nextTerrain=v;
}
`;

// --------------------------------------------------------------- thermal ----
// Column talus, single mass-conserving pass: every top-of-column voxel pushes
// to lower neighbor columns; every air voxel above a column top pulls from
// higher neighbor tops. Both sides compute the same deterministic transfers,
// so sum(alpha) is exactly preserved. Hardness scales the repose angle.
export const thermalFragment = H() + `
uniform sampler2D terrain, materials;
uniform float thermalRate;
layout(location=0) out vec4 nextTerrain;
layout(location=1) out vec4 nextMaterials;
float amtFor(float drop, float repose, float srcAlpha){
  return min(thermalRate*(drop-repose)*0.06, srcAlpha*0.25);
}
bool groundedTop(ivec3 q){
  for(int g=1;g<=4;g++){
    ivec3 gb=q-ivec3(0,g,0);
    if(gb.y<0) break;
    if(fetchVoxel(terrain,gb).a>=0.5) return true;
  }
  return false;
}
void main(){
  ivec3 q=voxelAt(ivec2(gl_FragCoord.xy));
  vec4 v=fetchVoxel(terrain,q);
  vec4 mat=fetchVoxel(materials,q);
  ivec3 dirs[4]=ivec3[4](ivec3(1,0,0),ivec3(-1,0,0),ivec3(0,0,1),ivec3(0,0,-1));
  float delta=0.;
  if(v.a>=0.5 && fetchVoxel(terrain,q+ivec3(0,1,0)).a<0.5 && groundedTop(q)){
    // I am a grounded column top: push down to lower neighbors
    float hard=clamp(0.45+mat.a, 0., 1.);
    float repose=1.45+hard*1.2;
    for(int i=0;i<4;i++){
      ivec3 nb=q+dirs[i];
      if(any(lessThan(nb,ivec3(0)))||any(greaterThanEqual(nb,DIM))) continue;
      for(int k=0;k<=4;k++){
        ivec3 t=nb-ivec3(0,k,0);
        if(t.y<0) break;
        if(fetchVoxel(terrain,t).a>=0.5){
          float drop=float(q.y-t.y);
          if(drop>repose) delta-=amtFor(drop, repose, v.a);
          break;
        }
      }
    }
  } else if(v.a<0.5 && q.y>0 && fetchVoxel(terrain,q-ivec3(0,1,0)).a>=0.5){
    // I am the fill slot above a column top: pull from higher neighbor tops
    for(int i=0;i<4;i++){
      ivec3 nb=q+dirs[i];
      if(any(lessThan(nb,ivec3(0)))||any(greaterThanEqual(nb,DIM))) continue;
      for(int k=0;k<=5;k++){
        ivec3 t=nb+ivec3(0,k,0);
        if(t.y>=DIM.y) break;
        if(fetchVoxel(terrain,t).a>=0.5){
          if(fetchVoxel(terrain,t+ivec3(0,1,0)).a<0.5 && groundedTop(t)){
            vec4 tv=fetchVoxel(terrain,t);
            float hard=clamp(0.45+fetchVoxel(materials,t).a, 0., 1.);
            float repose=1.45+hard*1.2;
            float drop=float(t.y-(q.y-1));
            if(drop>repose) delta+=amtFor(drop, repose, tv.a);
          }
          break;
        }
      }
    }
  }
  float a=clamp(v.a+delta, 0., 1.);
  if(a!=v.a){
    if(a>0.0001 && a<0.9999) v.r=BAND*(1.-2.*a);
    else if(a<=0.0001){ v.a=0.; v.r=max(v.r,BAND); }
    else { v.a=1.; v.r=min(v.r,-BAND); }
  }
  nextTerrain=vec4(v.r, v.g, v.b, a);
  nextMaterials=mat*clamp(a/max(v.a,1e-6),0.,1.);
}
`;

// --------------------------------------------------------------- sculpt -----
// Proper SDF sculpting: CSG carve/build with falloff blending, Laplacian
// smooth, tangent-plane flatten, CSG library stamps, hardness paint.
export const sculptFragment = H() + stampGLSL + `
uniform sampler2D terrain, materials;
uniform vec4 brush;        // xyz, radius
uniform vec4 brushParams;  // strength, stampType, stampMode(0 union,1 subtract,2 smUnion,3 smSub), tool
layout(location=0) out vec4 nextTerrain;
layout(location=1) out vec4 nextMaterials;
float smin(float a, float b, float k){
  float h=clamp(0.5+0.5*(b-a)/k, 0., 1.);
  return mix(b,a,h)-k*h*(1.-h);
}
float smax(float a, float b, float k){
  float h=clamp(0.5-0.5*(b-a)/k, 0., 1.);
  return mix(b,a,h)+k*h*(1.-h);
}
void main(){
  ivec2 uv=ivec2(gl_FragCoord.xy);
  ivec3 q=voxelAt(uv);
  vec4 v=texelFetch(terrain,uv,0);
  vec3 p=worldAt(q);
  float r=brush.w;
  vec3 d3=p-brush.xyz;
  float dist=length(d3);
  int tool=int(brushParams.w+0.5);
  if(tool==5){ if(dist>r*2.6){ nextTerrain=v; nextMaterials=texelFetch(materials,q); return; } }
  else if(dist>r){ nextTerrain=v; nextMaterials=texelFetch(materials,q); return; }
  float fall=pow(1.-min(1.,dist/r),2.);
  float strength=brushParams.x;
  float d=v.r;
  if(tool==1){ // carve
    float k=min(0.35*r, max(0.12, strength*r));
    float carved=smax(d, r-dist, k);
    d=d+(carved-d)*min(1., fall*(0.35+strength));
  } else if(tool==2){ // build
    float k=min(0.35*r, max(0.12, strength*r));
    float built=smin(d, dist-r, k);
    d=d+(built-d)*min(1., fall*(0.35+strength));
  } else if(tool==3){ // smooth (Laplacian)
    float avg=(fetchVoxel(terrain,q+ivec3(1,0,0)).r + fetchVoxel(terrain,q-ivec3(1,0,0)).r +
               fetchVoxel(terrain,q+ivec3(0,1,0)).r + fetchVoxel(terrain,q-ivec3(0,1,0)).r +
               fetchVoxel(terrain,q+ivec3(0,0,1)).r + fetchVoxel(terrain,q-ivec3(0,0,1)).r)/6.;
    d=d+(avg-d)*min(1., 0.85*strength)*fall;
  } else if(tool==4){ // flatten to tangent plane
    vec3 n=normalAt(terrain, brush.xyz, r*0.35);
    float plane=dot(p-brush.xyz, n);
    d=d+(plane-d)*min(1., 0.8*strength)*fall;
  } else if(tool==5){ // library stamp (CSG)
    float sd=stampSDF(int(brushParams.y+0.5), d3/r, vec4(0.7,0,0,0))*r;
    float k=max(0.1, 0.3*r);
    int mode=int(brushParams.z+0.5);
    if(mode==0) d=smin(d, sd, k);
    else if(mode==1) d=smax(d, -sd, k);
    else if(mode==2) d=smin(d, sd, k*2.2);
    else d=smax(d, -sd, k*2.2);
  } else if(tool==6){ // paint hardness
    nextMaterials=vec4(texelFetch(materials,q).rgb*(1.-fall*0.4), texelFetch(materials,q).a);
    nextTerrain=v;
    return;
  }
  d=clamp(d, -BAND*24., BAND*24.);
  float a=clamp(0.5-d/(2.*BAND), 0., 1.);
  nextTerrain=vec4(d, v.g, v.b, a);
  vec4 mat=texelFetch(materials,q);
  nextMaterials=vec4(mat.rgb*clamp(a/max(v.a,1e-6),0.,1.), mat.a);
}
`;

// ----------------------------------------------------------------- pick -----
export const pickFragment = H() + `
uniform vec3 origin, direction;
out vec4 hit;
void main(){
  hit=vec4(0);
  vec3 safe=sign(direction+vec3(1e-12))*max(abs(direction),vec3(1e-6));
  vec3 a=(LO-origin)/safe, b=(HI-origin)/safe, nmin=min(a,b), nmax=max(a,b);
  float t=max(0., max(max(nmin.x,nmin.y),nmin.z)), end=min(min(nmax.x,nmax.y),nmax.z);
  for(int i=0;i<240;i++){
    if(t>end) return;
    vec3 p=origin+direction*t;
    float d=sdfAt(terrain,p);
    if(d<0.075){ hit=vec4(p,1); return; }
    t+=max(0.035,d*0.6);
  }
}
`;

export { fullscreenVertex, SPLAT_SLICES, PARTICLE_SIZE };

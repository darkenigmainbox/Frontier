import {common as original, render as oldRender, gather, probeOverlay as oldOverlay, blit} from './shaders.js';
export {blit};
const extra='previousEye:vec4f,previousForward:vec4f,previousRight:vec4f,previousUp:vec4f,temporal:vec4f,accel:vec4f,reconstruction:vec4f,';
const params=code=>code.replace(/intervals:vec4f,?\s*}/,`intervals:vec4f,${extra}}`);
let common=params(original).replace('@group(0) @binding(7) var<storage,read> nodes:array<BVHNode>;',`@group(0) @binding(7) var<storage,read> nodeData:array<vec4f>;
fn node(i:u32)->BVHNode{return BVHNode(nodeData[i*3u],nodeData[i*3u+1u],nodeData[i*3u+2u]);}
fn worldMatrix(i:u32)->mat4x4f{return mat4x4f(nodeData[i],nodeData[i+1u],nodeData[i+2u],nodeData[i+3u]);}
fn inverseMatrix(i:u32)->mat4x4f{return mat4x4f(nodeData[i+4u],nodeData[i+5u],nodeData[i+6u],nodeData[i+7u]);}
fn surfaceNormal(i:u32,n:vec3f)->vec3f{let m=inverseMatrix(i);return normalize(vec3f(dot(m[0].xyz,n),dot(m[1].xyz,n),dot(m[2].xyz,n)));}
fn instanceHit(i:u32,h:Hit)->Hit{var r=h;r.normal=surfaceNormal(i,h.normal);r.color=nodeData[i+8u].xyz;r.emission=nodeData[i+8u].w;r.metal=nodeData[i+9u].x;r.floor=nodeData[i+9u].y;r.directEmitter=nodeData[i+9u].z;return r;}
`);
common=common.replace('if(dot(n,rd)>0.){n=-n;}','');
const start=common.indexOf('fn trace('),end=common.indexOf('fn direction(',start);
common=common.slice(0,start)+`
fn meshTrace(instance:u32,ro:vec3f,rd:vec3f,tmin:f32,previous:Hit,anyHit:bool)->Hit{
 let inverse=inverseMatrix(instance);let origin=(inverse*vec4f(ro,1)).xyz;let ray=(inverse*vec4f(rd,0)).xyz;let inv=invDir(ray);var hit=previous;let info=nodeData[instance+10u];
 if(u.light.w>.5){var i=u32(info.x);let end=u32(node(i).lo.w);loop{if(i>=end){break;}let b=node(i);let range=slab(origin,inv,b.lo.xyz,b.hi.xyz);if(range.y<max(tmin,range.x)||range.x>hit.t){i=u32(b.lo.w);continue;}for(var j=0u;j<u32(b.leafInfo.x);j++){hit=triangleHit(u32(b.hi.w)+j,origin,ray,tmin,hit);if(anyHit&&hit.t<previous.t){return instanceHit(instance,hit);}}i++;}}
 else{for(var j=0u;j<u32(info.z);j++){hit=triangleHit(u32(info.y)+j,origin,ray,tmin,hit);if(anyHit&&hit.t<previous.t){return instanceHit(instance,hit);}}}
 if(hit.t<previous.t){return instanceHit(instance,hit);}return previous;
}
fn traceRaw(ro:vec3f,rd:vec3f,tmin:f32,tmax:f32,anyHit:bool)->Hit{
 var hit=Hit(tmax,vec3f(0),vec3f(0),0.,0.,0.,1.,0.);
 if(u.light.w>.5){let inv=invDir(rd);var i=0u;loop{if(i>=u32(u.counts.y)){break;}let b=node(i);let range=slab(ro,inv,b.lo.xyz,b.hi.xyz);if(range.y<max(tmin,range.x)||range.x>hit.t){i=u32(b.lo.w);continue;}if(b.leafInfo.x>0.){hit=meshTrace(u32(b.hi.w),ro,rd,tmin,hit,anyHit);if(anyHit&&hit.t<tmax){return hit;}}i++;}}
 else{for(var i=0u;i<u32(u.counts.x);i++){hit=meshTrace(u32(u.accel.x)+i*11u,ro,rd,tmin,hit,anyHit);if(anyHit&&hit.t<tmax){return hit;}}}return hit;
}
fn trace(ro:vec3f,rd:vec3f,tmin:f32,tmax:f32)->Hit{var h=traceRaw(ro,rd,tmin,tmax,false);if(dot(h.normal,rd)>0.){h.normal=-h.normal;}return h;}
fn occluded(ro:vec3f,rd:vec3f,tmin:f32,tmax:f32)->bool{return traceRaw(ro,rd,tmin,tmax,true).t<tmax;}
fn hash(v:f32)->f32{return fract(sin(v*12.9898+78.233)*43758.5453);}
fn stateOffset(level:u32)->u32{let d=dims(0u);let base=d.x*d.y*d.z;var offset=base*6u;if(level>0u){offset+=base;}if(level>1u){let m=dims(1u);offset+=m.x*m.y*m.z;}return offset;}
fn validProbe(level:u32,index:u32)->bool{return irradiance[stateOffset(level)+index].x>.5;}
`+common.slice(end);
// Rotate stratified emitter samples between frames only when reconstruction is enabled.
common=common.replace('let pick=(f32(j)+.5)/f32(sampleCount);','let shift=select(0.,fract(u.temporal.x*.618033989),u.reconstruction.x>.5);let pick=fract((f32(j)+.5)/f32(sampleCount)+shift);');
const cstart=common.indexOf('fn coarseRadiance('),cend=common.indexOf('fn axisCDF',cstart);
common=common.slice(0,cstart)+`
// Stochastically integrate the eight spatial neighbours and four angular child
// bins over time. Reconnect endpoints, rather than assuming displaced rays are
// the same ray. Blocked connectors contribute zero (conservative/dark bias).
fn coarseRadiance(level:u32,pos:vec3f,uv:vec2f)->vec3f{
 let d=dims(level);let side=raySide(level);let coord=(pos-u.boundsMin.xyz)/u.boundsSize.xyz*vec3f(d)-.5;let f=fract(coord);let seed=dot(pos,vec3f(3.1,17.7,43.9))+dot(uv,vec2f(113,59))+select(0.,u.temporal.x*7.13,u.reconstruction.x>.5);
 let choose=vec3i(select(0,1,hash(seed)<f.x),select(0,1,hash(seed+11.)<f.y),select(0,1,hash(seed+23.)<f.z));let c=vec3u(clamp(vec3i(floor(coord))+choose,vec3i(0),vec3i(d)-1));let pi=c.x+c.y*d.x+c.z*d.x*d.y;
 if(!validProbe(level,pi)){return vec3f(0);}
 let child=vec2u(u32(hash(seed+37.)*2.),u32(hash(seed+53.)*2.));let bin=min(vec2u(uv*f32(side/2u))*2u+child,vec2u(side-1u));let childUV=(vec2f(bin)+.5)/f32(side);
 let boundary=u.intervals[level-1u];var begin=.02;if(level>1u){begin=u.intervals[level-2u];}
 let a=pos+direction(uv)*begin;let b=probePos(pi,d)+direction(childUV)*boundary;let delta=b-a;let distance=length(delta);
 if(distance>.01&&occluded(a,delta/distance,.004,distance-.004)){return vec3f(0);}
 return loadRadiance(level,pi*side*side+bin.x+bin.y*side).xyz;
}
`+common.slice(cend);
const istart=common.indexOf('fn sampleIrradiance(');
common=common.slice(0,istart)+`
fn irradianceAt(pi:u32,n:vec3f)->vec3f{let base=pi*6u;return irradiance[base+select(1u,0u,n.x>=0.)].xyz*n.x*n.x+irradiance[base+select(3u,2u,n.y>=0.)].xyz*n.y*n.y+irradiance[base+select(5u,4u,n.z>=0.)].xyz*n.z*n.z;}
fn sampleIrradiance(p:vec3f,n:vec3f)->vec3f{
 let d=dims(0u);let coord=(p-u.boundsMin.xyz)/u.boundsSize.xyz*vec3f(d)-.5;let f=fract(coord);let base=vec3i(floor(coord));var result=vec3f(0);
 // One visibility-tested neighbour per shaded sample with reconstruction; full
 // eight-neighbour quadrature when reconstruction is disabled for diagnostics.
 let stochastic=u.reconstruction.x>.5;let seed=dot(p,vec3f(37,113,59))+u.temporal.x*17.1;
 let chosen=vec3i(select(0,1,hash(seed)<f.x),select(0,1,hash(seed+7.)<f.y),select(0,1,hash(seed+19.)<f.z));
 for(var z=0;z<2;z++){for(var y=0;y<2;y++){for(var x=0;x<2;x++){
 let offset=vec3i(x,y,z);if(stochastic&&any(offset!=chosen)){continue;}let c=vec3u(clamp(base+offset,vec3i(0),vec3i(d)-1));let pi=c.x+c.y*d.x+c.z*d.x*d.y;if(!validProbe(0u,pi)){continue;}
 let probe=probePos(pi,d);let delta=probe-p;let distance=length(delta);if(dot(delta,n)<-.02){continue;}if(distance>.025&&occluded(p,delta/distance,.003,distance-.01)){continue;}
 let w=mix(1.-f,f,vec3f(offset));result+=irradianceAt(pi,n)*select(w.x*w.y*w.z,1.,stochastic);
 }}}return result;
}
`;
common+=`fn suitableProbe(p:vec3f,nearReach:f32)->f32{let reach=max(nearReach,2.);var valid=1.; for(var axis=0u;axis<3u;axis++){var dir=vec3f(0);dir[axis]=1.;let a=traceRaw(p-dir*.01,dir,.00001,reach,false);let b=traceRaw(p+dir*.01,-dir,.00001,reach,false);if((a.t<reach&&b.t<reach&&dot(a.normal,dir)>0.&&dot(b.normal,-dir)>0.)||min(abs(a.t-.01),abs(b.t-.01))<.025){valid=0.;}}return valid;}`;
export const instancedCommon=common;
const levelCode=`struct Level {index:u32,count:u32,schedule:u32,pad:u32};@group(0) @binding(6) var<uniform> level:Level;
fn selectedProbe(index:u32)->u32{return u32(nodeData[level.schedule+index/4u][index%4u]);}`;
export const classify=common+levelCode+`
@compute @workgroup_size(64) fn main(@builtin(global_invocation_id) id:vec3u){if(id.x>=level.count){return;}let pi=selectedProbe(id.x);let d=dims(level.index);let p=probePos(pi,d);let size=u.boundsSize.xyz/vec3f(d);let reach=max(size.x,max(size.y,size.z))*.7;var valid=1.;
 valid=suitableProbe(p,reach);
 let address=stateOffset(level.index)+pi;let old=irradiance[address];irradiance[address]=vec4f(valid,select(old.y,0.,old.x!=valid||u.temporal.y>.5),0,0);
}`;
export const cascade=common+levelCode+`
@compute @workgroup_size(64) fn main(@builtin(global_invocation_id) id:vec3u){let l=level.index;let side=raySide(l);let rays=side*side;if(id.x>=level.count*rays){return;}let pi=selectedProbe(id.x/rays);let ri=id.x%rays;let index=pi*rays+ri;var value=vec4f(0);
 if(validProbe(l,pi)){let uv=(vec2f(f32(ri%side),f32(ri/side))+.5)/f32(side);let dir=direction(uv);let pos=probePos(pi,dims(l));var begin=.02;if(l>0u){begin=u.intervals[l-1u];}let end=u.intervals[l];let hit=trace(pos,dir,begin,end);var rad=vec3f(0);var visibility=1.;
 if(hit.t<end){visibility=0.;rad=hit.color*hit.emission*u.light.x*(1.-hit.directEmitter);if(hit.emission==0.){rad=hit.color*lightAt(pos+dir*hit.t,hit.normal,1u,2u)*.32;}}else if(l<2u){rad=coarseRadiance(l+1u,pos,uv);}
 let previous=loadRadiance(l,index);let age=irradiance[stateOffset(l)+pi].y;let blend=select(select(.2,.65,u.accel.z>.5),1.,age<.5||u.reconstruction.x<.5);value=vec4f(mix(previous.xyz,min(rad,vec3f(12)),blend),visibility);
 }if(l==0u){nearField[index]=value;}else if(l==1u){midField[index]=value;}else{farField[index]=value;}
}`;
export const age=common+levelCode+`@compute @workgroup_size(64) fn main(@builtin(global_invocation_id) id:vec3u){if(id.x>=level.count){return;}let address=stateOffset(level.index)+selectedProbe(id.x);irradiance[address].y+=1.;}`;
export const gatherShader=common+gather.slice(gather.indexOf('@compute'));
export const probeOverlay=params(oldOverlay);
export const visibilityHelpers=`
@group(0) @binding(10) var visibility:texture_2d<u32>;
// Visibility raster chooses the primitive. Reconstruct barycentrics at the
// exact pixel center from that one triangle (no scene traversal), avoiding
// fixed-function subpixel interpolation error and saving two buffer channels.
fn loadVisibility(p:vec2i)->vec4f{let v=textureLoad(visibility,p,0);if(v.y==0u){return vec4f(0);}let t=tris[v.y-1u];let inverse=inverseMatrix(v.x);let xy=(vec2f(p)+.5)/u.screen.xy*2.-1.;let ray=u.forward.xyz+u.right.xyz*xy.x*u.screen.x/u.screen.y*.38-u.up.xyz*xy.y*.38;let ro=(inverse*vec4f(u.eye.xyz,1)).xyz;let rd=(inverse*vec4f(ray,0)).xyz;let e1=t.b.xyz-t.a.xyz;let e2=t.c.xyz-t.a.xyz;let h=cross(rd,e2);let rawDeterminant=dot(e1,h);let determinant=select(select(-1e-8,1e-8,rawDeterminant>=0.),rawDeterminant,abs(rawDeterminant)>1e-8);let offset=ro-t.a.xyz;let q=cross(offset,e1);let bary=vec2f(dot(offset,h),dot(rd,q))/determinant;return vec4f(f32(v.x),f32(v.y),bary);}
fn visiblePosition(v:vec4f)->vec3f{let t=tris[u32(v.y)-1u];let local=t.a.xyz*(1.-v.z-v.w)+t.b.xyz*v.z+t.c.xyz*v.w;return (worldMatrix(u32(v.x))*vec4f(local,1)).xyz;}
fn visibleHit(v:vec4f,ro:vec3f,rd:vec3f)->Hit{let t=tris[u32(v.y)-1u];let p=visiblePosition(v);var h=instanceHit(u32(v.x),Hit(length(p-ro),normalize(cross(t.b.xyz-t.a.xyz,t.c.xyz-t.a.xyz)),vec3f(0),0.,0.,0.,min(v.z,min(v.w,1.-v.z-v.w)),0.));if(dot(h.normal,rd)>0.){h.normal=-h.normal;}return h;}
`;
export const visibilityRaster=common+`
struct VOut{@builtin(position) position:vec4f,@location(0) bary:vec2f,@location(1) @interpolate(flat) instance:u32,@location(2) @interpolate(flat) triangle:u32};
@vertex fn vs(@builtin(vertex_index) vertex:u32,@builtin(instance_index) instanceIndex:u32)->VOut{
 let instance=u32(u.accel.x)+instanceIndex*11u;
 let t=tris[vertex/3u];var local=t.a.xyz;var bary=vec2f(0);if(vertex%3u==1u){local=t.b.xyz;bary.x=1.;}if(vertex%3u==2u){local=t.c.xyz;bary.y=1.;}
 let p=(worldMatrix(instance)*vec4f(local,1)).xyz;let delta=p-u.eye.xyz;let depth=dot(delta,u.forward.xyz);var out:VOut;out.position=vec4f(dot(delta,u.right.xyz)/(u.screen.x/u.screen.y*.38),dot(delta,u.up.xyz)/.38,depth*(500./499.97)-.03*500./499.97,depth);out.bary=bary;out.instance=instance;out.triangle=vertex/3u;return out;
}
@fragment fn fs(v:VOut)->@location(0) vec2u{return vec2u(v.instance,v.triangle+1u);}
`;
let shade=oldRender.slice(oldRender.indexOf('@group(0) @binding(6) var outputTex'));
shade=shade.replace('rgba8unorm','rgba16float').replace('fn shade(ro:vec3f,rd:vec3f)', 'fn shade(ro:vec3f,rd:vec3f,pixel:vec2i)');
shade=shade.replace('let far=max(60.,u.intervals.z*3.);let hit=trace(ro,rd,.03,far);\n if(hit.t>=far)', 'let v=loadVisibility(pixel);let far=max(60.,u.intervals.z*3.);\n if(v.y<.5)').replace(' let p=ro+rd*hit.t;', ' let hit=visibleHit(v,ro,rd);let p=visiblePosition(v);');
shade=shade.replaceAll('u32(u.counts.z)','select(u32(u.counts.z),min(8u,u32(u.counts.z)),u.reconstruction.x>.5)').replaceAll('u32(u.debug.w)','select(u32(u.debug.w),min(8u,u32(u.debug.w)),u.reconstruction.x>.5)');
shade=shade.replace('shade(u.eye.xyz,rd);col=col/(col+vec3f(1.));col=pow(col,vec3f(1./2.2));','shade(u.eye.xyz,rd,vec2i(id.xy));').replace('let vignette=1.-.19*dot(xy*.65,xy*.65);col*=vignette;','');
export const render=common+visibilityHelpers+shade;
export const temporal=common+visibilityHelpers+`
@group(0) @binding(11) var fresh:texture_2d<f32>;
@group(0) @binding(12) var history:texture_2d<f32>;
@group(0) @binding(13) var previousPosition:texture_2d<f32>;
@group(0) @binding(14) var previousNormal:texture_2d<f32>;
@group(0) @binding(15) var result:texture_storage_2d<rgba16float,write>;
@group(0) @binding(16) var positions:texture_storage_2d<rgba16float,write>;
@group(0) @binding(17) var normals:texture_storage_2d<rgba16float,write>;
@compute @workgroup_size(8,8) fn main(@builtin(global_invocation_id) id:vec3u){if(any(id.xy>=vec2u(u.screen.xy))){return;}let pixel=vec2i(id.xy);let v=loadVisibility(pixel);let color=textureLoad(fresh,pixel,0).xyz;var accumulated=color;var count=1.;var position=vec3f(0);var normal=vec3f(0);var identity=0.;
 if(v.y>.5){position=visiblePosition(v);let ray=normalize(position-u.eye.xyz);let h=visibleHit(v,u.eye.xyz,ray);normal=h.normal;identity=nodeData[u32(v.x)+10u].w;let relative=position-u.previousEye.xyz;let depth=dot(relative,u.previousForward.xyz);let oldUV=vec2f(dot(relative,u.previousRight.xyz)/(depth*u.previousEye.w*.38),-dot(relative,u.previousUp.xyz)/(depth*.38))*.5+.5;let oldPixel=vec2i(oldUV*u.screen.xy);
 if(u.reconstruction.x>.5&&u.temporal.y<.5&&u.flags.y<3.&&depth>0.&&all(oldUV>=vec2f(0))&&all(oldUV<vec2f(1))&&nodeData[u32(v.x)+9u].w<.5){let oldP=textureLoad(previousPosition,oldPixel,0);let oldN=textureLoad(previousNormal,oldPixel,0);let old=textureLoad(history,oldPixel,0);
 if(oldP.w==identity&&distance(oldP.xyz,position)<max(.03,length(relative)*.004)&&dot(oldN.xyz,normal)>.95&&!(h.metal>.1&&u.reconstruction.w>.5)){
 var lo=color;var hi=color;for(var y=-1;y<=1;y++){for(var x=-1;x<=1;x++){let q=clamp(pixel+vec2i(x,y),vec2i(0),vec2i(u.screen.xy)-1);let qv=loadVisibility(q);if(qv.x!=v.x||qv.y<.5){continue;}let sample=textureLoad(fresh,q,0).xyz;lo=min(lo,sample);hi=max(hi,sample);}}
 let maximum=select(16.,4.,u.accel.z>.5);count=min(old.w+1.,maximum);accumulated=mix(clamp(old.xyz,lo,hi),color,1./count);
 }}}
 textureStore(result,pixel,vec4f(accumulated,count));textureStore(positions,pixel,vec4f(position,identity));textureStore(normals,pixel,vec4f(normal,1));
}`;
export const filter=common+`
@group(0) @binding(11) var image:texture_2d<f32>;
@group(0) @binding(13) var positions:texture_2d<f32>;
@group(0) @binding(14) var normals:texture_2d<f32>;
@group(0) @binding(6) var output:texture_storage_2d<rgba8unorm,write>;
@compute @workgroup_size(8,8) fn main(@builtin(global_invocation_id) id:vec3u){if(any(id.xy>=vec2u(u.screen.xy))){return;}let pixel=vec2i(id.xy);let center=textureLoad(image,pixel,0).xyz;let p=textureLoad(positions,pixel,0);let n=textureLoad(normals,pixel,0).xyz;var color=center;var weight=1.;
 if(u.reconstruction.y>.5&&u.flags.y<3.&&p.w>0.){let radius=max(.04,distance(p.xyz,u.eye.xyz)*.008);for(var y=-1;y<=1;y++){for(var x=-1;x<=1;x++){if(x==0&&y==0){continue;}let q=clamp(pixel+vec2i(x,y),vec2i(0),vec2i(u.screen.xy)-1);let qp=textureLoad(positions,q,0);let qn=textureLoad(normals,q,0).xyz;if(qp.w!=p.w||dot(n,qn)<.95||abs(dot(qp.xyz-p.xyz,n))>.025){continue;}let w=exp(-distance(p.xyz,qp.xyz)/radius)*pow(max(dot(n,qn),0.),16.);color+=textureLoad(image,q,0).xyz*w;weight+=w;}}}color/=weight;
 if(u.flags.y!=4.){color=pow(max(color,vec3f(0))/(1.+max(color,vec3f(0))),vec3f(1./2.2));let xy=(vec2f(id.xy)+.5)/u.screen.xy*2.-1.;color*=1.-.19*dot(xy*.65,xy*.65);}
 textureStore(output,pixel,vec4f(color,1));
}`;

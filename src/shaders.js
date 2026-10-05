export const common = /* wgsl */`
struct Params {
 eye:vec4f, forward:vec4f, right:vec4f, up:vec4f,
 screen:vec4f, light:vec4f, flags:vec4f, counts:vec4f, debug:vec4f, boundsMin:vec4f, boundsSize:vec4f, grid0:vec4f, grid1:vec4f, grid2:vec4f, intervals:vec4f,
};
struct Triangle {a:vec4f,b:vec4f,c:vec4f,color:vec4f,info:vec4f};
struct Hit {t:f32, normal:vec3f, color:vec3f, emission:f32, metal:f32, floor:f32, edge:f32, directEmitter:f32};
@group(0) @binding(0) var<uniform> u:Params;
@group(0) @binding(1) var<storage,read> tris:array<Triangle>;
@group(0) @binding(2) var<storage,read_write> nearField:array<vec4f>;
@group(0) @binding(3) var<storage,read_write> midField:array<vec4f>;
@group(0) @binding(4) var<storage,read_write> farField:array<vec4f>;
@group(0) @binding(5) var<storage,read_write> irradiance:array<vec4f>;
struct BVHNode { lo:vec4f, hi:vec4f, leafInfo:vec4f };
struct EmitterTriangle {a:vec4f,b:vec4f,c:vec4f,cdf0:vec4f,cdf1:vec4f};
struct Emitter {range:vec4f,color:vec4f,center:vec4f,weights0:vec4f,weights1:vec4f};
@group(0) @binding(7) var<storage,read> nodes:array<BVHNode>;
@group(0) @binding(8) var<storage,read> emitterTriangles:array<EmitterTriangle>;
@group(0) @binding(9) var<storage,read> emitters:array<Emitter>;
fn invDir(rd:vec3f)->vec3f {return select(vec3f(-1),vec3f(1),rd>=vec3f(0))/max(abs(rd),vec3f(.00000001));}
fn slab(ro:vec3f,inv:vec3f,lo:vec3f,hi:vec3f)->vec2f {
 let a=(lo-ro)*inv;let b=(hi-ro)*inv;let mn=min(a,b);let mx=max(a,b);
 return vec2f(max(mn.x,max(mn.y,mn.z)),min(mx.x,min(mx.y,mx.z)));
}
fn triangleHit(index:u32,ro:vec3f,rd:vec3f,tmin:f32,previous:Hit)->Hit {
 let t=tris[index];let e1=t.b.xyz-t.a.xyz;let e2=t.c.xyz-t.a.xyz;let h=cross(rd,e2);let det=dot(e1,h);
 if(abs(det)<.000001){return previous;}
 let inv=1./det;let offset=ro-t.a.xyz;let v=dot(offset,h)*inv;if(v<0. || v>1.){return previous;}
 let q=cross(offset,e1);let w=dot(rd,q)*inv;if(w<0. || v+w>1.){return previous;}
 let dist=dot(e2,q)*inv;if(dist<=tmin || dist>=previous.t){return previous;}
 var n=normalize(cross(e1,e2));if(dot(n,rd)>0.){n=-n;}
 return Hit(dist,n,t.color.xyz,t.color.w,t.info.x,t.info.y,min(v,min(w,1.-v-w)),t.info.z);
}
fn trace(ro:vec3f,rd:vec3f,tmin:f32,tmax:f32)->Hit {
 var hit=Hit(tmax,vec3f(0),vec3f(0),0.,0.,0.,1.,0.);let inv=invDir(rd);
 if(u.light.w>.5){
  var index=0u;
  loop {
   if(index>=u32(u.counts.y)){break;}let node=nodes[index];let range=slab(ro,inv,node.lo.xyz,node.hi.xyz);
   if(range.y<max(tmin,range.x)||range.x>hit.t){index=u32(node.lo.w);continue;}
   let first=u32(node.hi.w);for(var j=0u;j<u32(node.leafInfo.x);j++){hit=triangleHit(first+j,ro,rd,tmin,hit);}index++;
  }
 }else{for(var i=0u;i<u32(u.screen.z);i++){hit=triangleHit(i,ro,rd,tmin,hit);}}
 return hit;
}
fn occluded(ro:vec3f,rd:vec3f,tmin:f32,tmax:f32)->bool{
 let empty=Hit(tmax,vec3f(0),vec3f(0),0.,0.,0.,1.,0.);
 if(u.light.w>.5){let inv=invDir(rd);var index=0u;
  loop{if(index>=u32(u.counts.y)){break;}let node=nodes[index];let range=slab(ro,inv,node.lo.xyz,node.hi.xyz);
   if(range.y<max(tmin,range.x)||range.x>tmax){index=u32(node.lo.w);continue;}
   for(var j=0u;j<u32(node.leafInfo.x);j++){if(triangleHit(u32(node.hi.w)+j,ro,rd,tmin,empty).t<tmax){return true;}}index++;
  }
 }else{for(var i=0u;i<u32(u.screen.z);i++){if(triangleHit(i,ro,rd,tmin,empty).t<tmax){return true;}}}
 return false;
}
fn direction(uv:vec2f)->vec3f {
 // Equal-area spherical parameterization. Uniform samples carry equal solid angle.
 let y=1.-2.*uv.y;let r=sqrt(max(0.,1.-y*y));let phi=uv.x*6.2831853;
 return vec3f(cos(phi)*r,y,sin(phi)*r);
}
fn dims(level:u32)->vec3u {if(level==0u){return vec3u(u.grid0.xyz);}if(level==1u){return vec3u(u.grid1.xyz);}return vec3u(u.grid2.xyz);}
fn raySide(level:u32)->u32 {if(level==0u){return u32(u.grid0.w);}if(level==1u){return u32(u.grid1.w);}return u32(u.grid2.w);}
fn probePos(idx:u32,d:vec3u)->vec3f {let c=vec3u(idx%d.x,(idx/d.x)%d.y,idx/(d.x*d.y));return u.boundsMin.xyz+(vec3f(c)+.5)/vec3f(d)*u.boundsSize.xyz;}
fn loadRadiance(level:u32,index:u32)->vec4f {if(level==0u){return nearField[index];}if(level==1u){return midField[index];}return farField[index];}
fn coarseRadiance(level:u32,pos:vec3f,uv:vec2f)->vec3f {
 let d=dims(level);let n=raySide(level);let r=vec2u(clamp(uv* f32(n),vec2f(0),vec2f(f32(n)-1.)));
 let coord=(pos-u.boundsMin.xyz)/u.boundsSize.xyz*vec3f(d)-.5;let base=vec3i(floor(coord));let f=fract(coord);var result=vec3f(0);
 for(var z=0;z<2;z++){for(var y=0;y<2;y++){for(var x=0;x<2;x++){
 let c=vec3u(clamp(base+vec3i(x,y,z),vec3i(0),vec3i(d)-1));let w=mix(1.-f,f,vec3f(f32(x),f32(y),f32(z)));let index=(c.x+c.y*d.x+c.z*d.x*d.y)*n*n+r.x+r.y*n;
 result+=loadRadiance(level,index).xyz*w.x*w.y*w.z;
 }}}
 return result;
}
fn axisCDF(t:EmitterTriangle,axis:u32)->f32{if(axis<4u){return t.cdf0[axis];}return t.cdf1[axis-4u];}
fn axisTotal(light:Emitter,axis:u32)->f32{if(axis<4u){return light.weights0[axis];}return light.weights1[axis-4u];}
fn lightAt(p:vec3f,n:vec3f,samples:u32,closedSamples:u32)->vec3f {
 var sum=vec3f(0);
 for(var i=0u;i<u32(u.light.z);i++){
  let light=emitters[i];let first=u32(light.range.x);let count=u32(light.range.y);
  if(count==0u||light.range.z<=0.||light.color.w<=0.){continue;}
  let toward=p-light.center.xyz;let magnitudes=abs(toward);let extent=dot(magnitudes,vec3f(1));
  let blend=select(vec3f(1./3.),magnitudes/max(extent,.0001),extent>.0001);
  let axes=vec3u(select(0u,1u,toward.x<0.),select(2u,3u,toward.y<0.),select(4u,5u,toward.z<0.));
  let signs=select(vec3f(1),vec3f(-1),toward<vec3f(0));
  let totals=blend*vec3f(axisTotal(light,axes.x),axisTotal(light,axes.y),axisTotal(light,axes.z));
  let normalization=dot(totals,vec3f(1));
  let sampleCount=select(max(1u,closedSamples),samples,light.range.w>.5);
  for(var j=0u;j<sampleCount;j++){
   let pick=(f32(j)+.5)/f32(sampleCount);var lo=first;var hi=first+count-1u;
   loop{if(lo>=hi){break;}let mid=(lo+hi)/2u;let t=emitterTriangles[mid];let cdf=dot(totals,vec3f(axisCDF(t,axes.x),axisCDF(t,axes.y),axisCDF(t,axes.z)))/normalization;if(pick<=cdf){hi=mid;}else{lo=mid+1u;}}
   let t=emitterTriangles[lo];let root=sqrt(fract((f32(j)+.5)*.754877666));let v=fract((f32(j)+.5)*.569840296);
   let lp=t.a.xyz*(1.-root)+t.b.xyz*(root*(1.-v))+t.c.xyz*(root*v);
   let delta=lp-p;let dist=length(delta);let dir=delta/max(dist,.0001);let nd=max(dot(n,dir),0.);
   let emitterNormal=normalize(cross(t.b.xyz-t.a.xyz,t.c.xyz-t.a.xyz));let cosine=dot(emitterNormal,-dir);
   let sourceCos=select(max(cosine,0.),abs(cosine),light.range.w>.5);
   let axisCos=emitterNormal*signs;let selectionWeight=light.center.w+dot(blend,select(max(axisCos,vec3f(0)),abs(axisCos),light.range.w>.5));
   if(nd>0.&&sourceCos>0.&&dist>.03){
    let ro=p+n*.01;let ray=lp-ro;let lengthToSample=length(ray);let end=lengthToSample-.003;
    if(!occluded(ro,ray/lengthToSample,.002,end)){
     // Divide by the actual area PDF. Every emitter face retains support via
     // the small uniform floor; no analytic light or proxy geometry is used.
     sum+=light.color.xyz*light.color.w*u.light.x*nd*sourceCos*normalization/(selectionWeight*3.14159265*(.05+dist*dist)*f32(sampleCount));
    }
   }
  }
 }
 return sum+vec3f(.025,.032,.04)*max(n.y*.5+.5,0.);
}
fn sampleIrradiance(p:vec3f,n:vec3f)->vec3f{
 let d=dims(0u);let coord=(p-u.boundsMin.xyz)/u.boundsSize.xyz*vec3f(d)-.5;let base=vec3i(floor(coord));let f=fract(coord);var result=vec3f(0);var totalWeight=0.;
 for(var z=0;z<2;z++){for(var y=0;y<2;y++){for(var x=0;x<2;x++){
 let c=vec3u(clamp(base+vec3i(x,y,z),vec3i(0),vec3i(d)-1));let w=mix(1.-f,f,vec3f(f32(x),f32(y),f32(z)));let probe=c.x+c.y*d.x+c.z*d.x*d.y;let idx=probe*6u;let weight=w.x*w.y*w.z;
 if(weight<.00001){continue;}
 if(u.counts.w>.5){
  // Optional, costly surface-to-probe visibility guard. It cannot repair errors
  // already introduced by coarse directional merging, so this is not a full cure.
  let delta=probePos(probe,d)-p;let dist=length(delta);
  if(dot(delta,n)<-.015){continue;}
  if(dist>.035){if(occluded(p,delta/dist,.005,dist-.015)){continue;}}
 }
 let value=irradiance[idx+select(1u,0u,n.x>=0.)].xyz*n.x*n.x+irradiance[idx+select(3u,2u,n.y>=0.)].xyz*n.y*n.y+irradiance[idx+select(5u,4u,n.z>=0.)].xyz*n.z*n.z;
 result+=value*weight;totalWeight+=weight;
 }}}
 return result/max(totalWeight,.00001);
}
`;
export const cascade = common + /* wgsl */`
struct Level {index:u32,pad0:u32,pad1:u32,pad2:u32};
@group(0) @binding(6) var<uniform> level:Level;
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id:vec3u){
 let l=level.index;let d=dims(l);let n=raySide(l);let rays=n*n;let count=d.x*d.y*d.z*rays;if(id.x>=count){return;}
 let pi=id.x/rays;let ri=id.x%rays;let uv=(vec2f(f32(ri%n),f32(ri/n))+.5)/f32(n);let dir=direction(uv);let pos=probePos(pi,d);
 var start=.02;if(l>0u){start=u.intervals[l-1u];}let end=u.intervals[l];
 let hit=trace(pos,dir,start,end);var rad=vec3f(0);var visibility=1.;
 if(hit.t<end){visibility=0.;let p=pos+dir*hit.t;// Registered emitters are already integrated by lightAt at the shaded surface.
 // Do not inject that same direct contribution through the coarse GI field again.
 rad=hit.color*hit.emission*u.light.x*(1.-hit.directEmitter);if(hit.emission==0.){rad=hit.color*lightAt(p,hit.normal,1u,min(4u,u32(u.debug.w)))*.32;}}
 else if(l<2u){rad=coarseRadiance(l+1u,pos,uv);}else{rad=vec3f(0);}
 let value=vec4f(min(rad,vec3f(12)),visibility);
 if(l==0u){nearField[id.x]=value;}else if(l==1u){midField[id.x]=value;}else{farField[id.x]=value;}
}
`;
export const gather = common + /* wgsl */`
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id:vec3u){
 let d=dims(0u);if(id.x>=d.x*d.y*d.z*6u){return;}let probe=id.x/6u;let axis=id.x%6u;
 var normal=vec3f(0);normal[axis/2u]=select(-1.,1.,axis%2u==0u);var sum=vec3f(0);var weight=0.;
 let side=raySide(0u);let rays=side*side;for(var i=0u;i<rays;i++){let uv=(vec2f(f32(i%side),f32(i/side))+.5)/f32(side);let w=max(dot(normal,direction(uv)),0.);sum+=nearField[probe*rays+i].xyz*w;weight+=w;}
 irradiance[id.x]=vec4f(sum/max(weight,.001),1);
}
`;
export const render = common + /* wgsl */`
@group(0) @binding(6) var outputTex:texture_storage_2d<rgba8unorm,write>;
fn shade(ro:vec3f,rd:vec3f)->vec3f{
 let far=max(60.,u.intervals.z*3.);let hit=trace(ro,rd,.03,far);
 if(hit.t>=far){return vec3f(.033,.042,.047);}
 let p=ro+rd*hit.t;var color=hit.color;
 if(hit.floor>0.){
  let grid=abs(fract(p.xz*.5+.5)-.5);let seam=1.-smoothstep(.008,.023,min(grid.x,grid.y));color*=1.-seam*.5;
 }
 var direct=vec3f(0);var indirect=vec3f(0);
 if(u.flags.y==0.||u.flags.y==1.){direct=lightAt(p,hit.normal,u32(u.counts.z),u32(u.debug.w));}
 if((u.flags.y==0.&&u.flags.x>.5)||u.flags.y==2.){indirect=sampleIrradiance(p+hit.normal*.025,hit.normal)*u.light.y;}
 var lit=color*(direct+indirect*u.flags.x)*.65+color*hit.emission*u.light.x;
 if(hit.metal>.1 && u.flags.y==0. && u.debug.z>.5){
  let reflectedDir=reflect(rd,hit.normal);let rh=trace(p+hit.normal*.035,reflectedDir,.02,u.intervals.z*1.5);var reflection=vec3f(.04,.055,.065);
  if(rh.t<u.intervals.z*1.5){let rp=p+hit.normal*.035+reflectedDir*rh.t;reflection=rh.color*(rh.emission*u.light.x+lightAt(rp,rh.normal,u32(u.counts.z),u32(u.debug.w))*.5+sampleIrradiance(rp+rh.normal*.025,rh.normal)*u.flags.x*.4);}
  let fresnel=.12+.88*pow(1.-max(dot(-rd,hit.normal),0.),5.);lit=mix(lit,reflection,hit.metal*(.45+fresnel*.55));
 }
 if(u.flags.y==1.){lit=color*direct*.65+color*hit.emission*u.light.x;}
 if(u.flags.y==2.){lit=indirect;}
 if(u.flags.y==3.){lit=hit.normal*.5+.5;}
 if(u.flags.w>0.){let edge=1.-smoothstep(.015,.065,hit.edge);lit=mix(lit,vec3f(.45,.95,.4),edge*.85);}
 return lit;
}
@compute @workgroup_size(8,8)
fn main(@builtin(global_invocation_id) id:vec3u){
 if(id.x>=u32(u.screen.x)||id.y>=u32(u.screen.y)){return;}
 let uv=(vec2f(id.xy)+.5)/u.screen.xy;
 if(u.flags.y==4.){
  let level=u32(u.debug.x);let d=dims(level);let count=d.x*d.y*d.z;let columns=u32(ceil(sqrt(f32(count)*u.screen.x/u.screen.y)));let rows=(count+columns-1u)/columns;
  let cell=vec2u(uv*vec2f(f32(columns),f32(rows)));let local=fract(uv*vec2f(f32(columns),f32(rows)));if(cell.x+cell.y*columns>=count){textureStore(outputTex,vec2i(id.xy),vec4f(.02,.025,.02,1));return;}let side=raySide(level);let bin=min(vec2u(local*f32(side)),vec2u(side-1u));
  let value=loadRadiance(level,(cell.x+cell.y*columns)*side*side+bin.x+bin.y*side);var color=pow(value.xyz/(1.+value.xyz),vec3f(1./2.2));
  if(u.debug.y==2.){color=vec3f(value.w);}if(min(local.x,local.y)<.045){color=vec3f(.035,.045,.04);}
  textureStore(outputTex,vec2i(id.xy),vec4f(color,1));return;
 }
 let xy=uv*2.-1.;let rd=normalize(u.forward.xyz+u.right.xyz*xy.x*u.screen.x/u.screen.y*.38-u.up.xyz*xy.y*.38);
 var col=shade(u.eye.xyz,rd);col=col/(col+vec3f(1.));col=pow(col,vec3f(1./2.2));
 let vignette=1.-.19*dot(xy*.65,xy*.65);col*=vignette;
 textureStore(outputTex,vec2i(id.xy),vec4f(col,1));
}
`;
export const blit = /* wgsl */`
@group(0) @binding(0) var image:texture_2d<f32>;
@group(0) @binding(1) var samp:sampler;
struct VOut{@builtin(position) position:vec4f,@location(0) uv:vec2f};
@vertex fn vs(@builtin(vertex_index) i:u32)->VOut{var p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));var o:VOut;o.position=vec4f(p[i],0,1);o.uv=p[i]*vec2f(.5,-.5)+.5;return o;}
@fragment fn fs(i:VOut)->@location(0) vec4f{return textureSample(image,samp,i.uv);}
`;
// A transparent, instanced point-cloud overlay. This intentionally shows probes
// through geometry; it visualizes allocation, not visibility or surface depth.
export const probeOverlay = /* wgsl */`
struct Params {eye:vec4f,forward:vec4f,right:vec4f,up:vec4f,screen:vec4f,light:vec4f,flags:vec4f,counts:vec4f,debug:vec4f,boundsMin:vec4f,boundsSize:vec4f,grid0:vec4f,grid1:vec4f,grid2:vec4f,intervals:vec4f};
@group(0) @binding(0) var<uniform> u:Params;
@group(0) @binding(1) var<storage,read> nearField:array<vec4f>;
@group(0) @binding(2) var<storage,read> midField:array<vec4f>;
@group(0) @binding(3) var<storage,read> farField:array<vec4f>;
struct Out {@builtin(position) pos:vec4f,@location(0) local:vec2f,@location(1) color:vec3f};
@vertex fn vs(@builtin(vertex_index) vi:u32,@builtin(instance_index) pi:u32)->Out{
 let level=u32(u.debug.x);var grid=u.grid0;if(level==1u){grid=u.grid1;}if(level==2u){grid=u.grid2;}let d=vec3u(grid.xyz);
 let c=vec3u(pi%d.x,(pi/d.x)%d.y,pi/(d.x*d.y));let world=u.boundsMin.xyz+(vec3f(c)+.5)/vec3f(d)*u.boundsSize.xyz;
 let rel=world-u.eye.xyz;let depth=dot(rel,u.forward.xyz);
 var corners=array<vec2f,6>(vec2f(-1,-1),vec2f(1,-1),vec2f(-1,1),vec2f(-1,1),vec2f(1,-1),vec2f(1,1));
 let clip=vec2f(dot(rel,u.right.xyz)/(u.screen.x/u.screen.y*.38),dot(rel,u.up.xyz)/.38);
 var out:Out;out.pos=vec4f(clip+corners[vi]*vec2f(6.+f32(level)*3.)/u.screen.xy*depth,depth*.5,depth);out.local=corners[vi];
 let count=u32(grid.w*grid.w);var radiance=vec3f(0);var visibility=0.;
 for(var i=0u;i<count;i++){var value=vec4f(0);if(level==0u){value=nearField[pi*count+i];}else if(level==1u){value=midField[pi*count+i];}else{value=farField[pi*count+i];}radiance+=value.xyz;visibility+=value.w;}
 radiance/=f32(count);out.color=pow(radiance/(1.+radiance),vec3f(1./2.2));
 if(u.debug.y==1.){out.color=select(select(vec3f(.74,.92,.46),vec3f(.25,.85,.88),level==1u),vec3f(.9,.48,.95),level==2u);}
 if(u.debug.y==2.){out.color=vec3f(visibility/f32(count));}
 return out;
}
@fragment fn fs(v:Out)->@location(0) vec4f {let radius=length(v.local);if(radius>1.){discard;}let edge=smoothstep(.7,1.,radius);return vec4f(mix(v.color,vec3f(.8,.88,.76),edge*.55),.88);}
`;

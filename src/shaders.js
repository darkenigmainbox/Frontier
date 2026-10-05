export const common = /* wgsl */`
struct Params {
 eye:vec4f, forward:vec4f, right:vec4f, up:vec4f,
 screen:vec4f, light:vec4f, flags:vec4f, counts:vec4f, debug:vec4f,
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
struct Shape { center:vec4f, size:vec4f, color:vec4f, info:vec4f };
struct Emitter { center:vec4f, axisU:vec4f, axisV:vec4f, color:vec4f };
@group(0) @binding(7) var<storage,read> nodes:array<BVHNode>;
@group(0) @binding(8) var<storage,read> shapes:array<Shape>;
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
fn sphereRoots(oc:vec3f,rd:vec3f,r:f32)->vec2f {
 let b=dot(oc,rd);let disc=b*b-dot(oc,oc)+r*r;if(disc<0.){return vec2f(-1);}
 let root=sqrt(disc);return vec2f(-b-root,-b+root);
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
 for(var i=0u;i<u32(u.counts.x);i++){
  let shape=shapes[i];let local=ro-shape.center.xyz;var distance=hit.t;var normal=vec3f(0);
  if(shape.center.w<.5){
   let roots=sphereRoots(local,rd,shape.size.x);for(var j=0u;j<2u;j++){let t=roots[j];if(t>tmin&&t<distance){distance=t;normal=normalize(local+rd*t);}}
  }else if(shape.center.w<1.5){
   let roots=slab(local,inv,-shape.size.xyz,shape.size.xyz);
   if(roots.x<=roots.y){for(var j=0u;j<2u;j++){let t=roots[j];if(t>tmin&&t<distance){distance=t;let pos=local+rd*t;let ratio=abs(pos/shape.size.xyz);normal=vec3f(0);if(ratio.x>=ratio.y&&ratio.x>=ratio.z){normal.x=sign(pos.x);}else if(ratio.y>=ratio.z){normal.y=sign(pos.y);}else{normal.z=sign(pos.z);}}}}
  }else{
   // Vertical capsule: finite cylinder plus two hemispherical caps, exact intersections.
   let radius=shape.size.x;let halfLength=shape.size.y;let aa=dot(rd.xz,rd.xz);let bb=dot(local.xz,rd.xz);let cc=dot(local.xz,local.xz)-radius*radius;let disc=bb*bb-aa*cc;
   if(aa>.000001&&disc>=0.){let roots=vec2f(-bb-sqrt(disc),-bb+sqrt(disc))/aa;
    for(var j=0u;j<2u;j++){let t=roots[j];let pos=local+rd*t;if(t>tmin&&t<distance&&abs(pos.y)<=halfLength){distance=t;normal=normalize(vec3f(pos.x,0,pos.z));}}
   }
   for(var cap=0u;cap<2u;cap++){let signY=select(-1.,1.,cap==1u);let center=vec3f(0,signY*halfLength,0);let roots=sphereRoots(local-center,rd,radius);
    for(var j=0u;j<2u;j++){let t=roots[j];let pos=local+rd*t;if(t>tmin&&t<distance&&pos.y*signY>=halfLength){distance=t;normal=normalize(pos-center);}}
   }
  }
  if(distance<hit.t){if(dot(normal,rd)>0.){normal=-normal;}hit=Hit(distance,normal,shape.color.xyz,shape.color.w,shape.info.x,0.,1.,shape.info.y);}
 }
 return hit;
}
fn direction(uv:vec2f)->vec3f {
 // Equal-area spherical parameterization. Uniform samples carry equal solid angle.
 let y=1.-2.*uv.y;let r=sqrt(max(0.,1.-y*y));let phi=uv.x*6.2831853;
 return vec3f(cos(phi)*r,y,sin(phi)*r);
}
fn dims(level:u32)->vec3u {if(level==0u){return vec3u(12,6,12);}if(level==1u){return vec3u(6,3,6);}return vec3u(3,2,3);}
fn probePos(idx:u32,d:vec3u)->vec3f {let c=vec3u(idx%d.x,(idx/d.x)%d.y,idx/(d.x*d.y));return vec3f(-6,0,-5.5)+(vec3f(c)+.5)/vec3f(d)*vec3f(12,6,11);}
fn loadRadiance(level:u32,index:u32)->vec4f {if(level==0u){return nearField[index];}if(level==1u){return midField[index];}return farField[index];}
fn coarseRadiance(level:u32,pos:vec3f,uv:vec2f)->vec3f {
 let d=dims(level);let n=select(8u,16u,level==2u);let r=vec2u(clamp(uv* f32(n),vec2f(0),vec2f(f32(n)-1.)));
 let coord=(pos-vec3f(-6,0,-5.5))/vec3f(12,6,11)*vec3f(d)-.5;let base=vec3i(floor(coord));let f=fract(coord);var result=vec3f(0);
 for(var z=0;z<2;z++){for(var y=0;y<2;y++){for(var x=0;x<2;x++){
 let c=vec3u(clamp(base+vec3i(x,y,z),vec3i(0),vec3i(d)-1));let w=mix(1.-f,f,vec3f(f32(x),f32(y),f32(z)));let index=(c.x+c.y*d.x+c.z*d.x*d.y)*n*n+r.x+r.y*n;
 result+=loadRadiance(level,index).xyz*w.x*w.y*w.z;
 }}}
 return result;
}
fn lightAt(p:vec3f,n:vec3f,samples:u32)->vec3f {
 var sum=vec3f(0);let side=u32(sqrt(f32(samples)));
 for(var i=0u;i<u32(u.light.z);i++){
  let light=emitters[i];let toSurface=normalize(p-light.center.xyz);var axisU=light.axisU.xyz;var axisV=light.axisV.xyz;let radius=light.center.w;
  var area=4.*length(axisU)*length(axisV);var sourceNormal=normalize(cross(axisU,axisV));
  if(radius>0.){axisU=normalize(cross(toSurface,select(vec3f(0,1,0),vec3f(1,0,0),abs(toSurface.y)>.95)))*radius;axisV=normalize(cross(toSurface,axisU))*radius;area=3.14159265*radius*radius;sourceNormal=toSurface;}
  for(var j=0u;j<samples;j++){
   let uv=(vec2f(f32(j%side),f32(j/side))+.5)/f32(side);var sampleXY=uv*2.-1.;
   if(radius>0.){sampleXY=sqrt(uv.x)*vec2f(cos(uv.y*6.2831853),sin(uv.y*6.2831853));}
   let lp=light.center.xyz+axisU*sampleXY.x+axisV*sampleXY.y;let delta=lp-p;let dist=length(delta);let dir=delta/max(dist,.0001);let nd=max(dot(n,dir),0.);let sourceCos=abs(dot(sourceNormal,-dir));
   if(nd>0. && dist>radius+.05){let end=dist-radius-.045;let shadow=trace(p+n*.02,dir,.015,end);
    if(shadow.t>=end){sum+=light.color.xyz*light.color.w*u.light.x*nd*sourceCos*area/(3.14159265*(.05+dist*dist)*f32(samples));}
   }
  }
 }
 // Small, explicit non-GI fill; not a baked lightmap or volumetric scattering.
 return sum+vec3f(.025,.032,.04)*max(n.y*.5+.5,0.);
}
fn sampleIrradiance(p:vec3f,n:vec3f)->vec3f{
 let d=vec3u(12,6,12);let coord=(p-vec3f(-6,0,-5.5))/vec3f(12,6,11)*vec3f(d)-.5;let base=vec3i(floor(coord));let f=fract(coord);var result=vec3f(0);var totalWeight=0.;
 for(var z=0;z<2;z++){for(var y=0;y<2;y++){for(var x=0;x<2;x++){
 let c=vec3u(clamp(base+vec3i(x,y,z),vec3i(0),vec3i(d)-1));let w=mix(1.-f,f,vec3f(f32(x),f32(y),f32(z)));let probe=c.x+c.y*d.x+c.z*d.x*d.y;let idx=probe*6u;let weight=w.x*w.y*w.z;
 if(weight<.00001){continue;}
 if(u.counts.w>.5){
  // Optional, costly surface-to-probe visibility guard. It cannot repair errors
  // already introduced by coarse directional merging, so this is not a full cure.
  let delta=probePos(probe,d)-p;let dist=length(delta);
  if(dot(delta,n)<-.015){continue;}
  if(dist>.035){let visibility=trace(p,delta/dist,.005,dist-.015);if(visibility.t<dist-.015){continue;}}
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
 let l=level.index;let d=dims(l);let n=4u<<l;let rays=n*n;let count=d.x*d.y*d.z*rays;if(id.x>=count){return;}
 let pi=id.x/rays;let ri=id.x%rays;let uv=(vec2f(f32(ri%n),f32(ri/n))+.5)/f32(n);let dir=direction(uv);let pos=probePos(pi,d);
 var start=0.02;var end=.9;if(l==1u){start=.9;end=3.;}if(l==2u){start=3.;end=24.;}
 let hit=trace(pos,dir,start,end);var rad=vec3f(0);var visibility=1.;
 if(hit.t<end){visibility=0.;let p=pos+dir*hit.t;// Registered emitters are already integrated by lightAt at the shaded surface.
 // Do not inject that same direct contribution through the coarse GI field again.
 rad=hit.color*hit.emission*u.light.x*(1.-hit.directEmitter);if(hit.emission==0.){rad=hit.color*lightAt(p,hit.normal,1u)*.32;}}
 else if(l<2u){rad=coarseRadiance(l+1u,pos,uv);}else{rad=vec3f(0);}
 let value=vec4f(min(rad,vec3f(12)),visibility);
 if(l==0u){nearField[id.x]=value;}else if(l==1u){midField[id.x]=value;}else{farField[id.x]=value;}
}
`;
export const gather = common + /* wgsl */`
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id:vec3u){
 if(id.x>=864u*6u){return;}let probe=id.x/6u;let axis=id.x%6u;
 var normal=vec3f(0);normal[axis/2u]=select(-1.,1.,axis%2u==0u);var sum=vec3f(0);var weight=0.;
 for(var i=0u;i<16u;i++){let uv=(vec2f(f32(i%4u),f32(i/4u))+.5)/4.;let w=max(dot(normal,direction(uv)),0.);sum+=nearField[probe*16u+i].xyz*w;weight+=w;}
 irradiance[id.x]=vec4f(sum/max(weight,.001),1);
}
`;
export const render = common + /* wgsl */`
@group(0) @binding(6) var outputTex:texture_storage_2d<rgba8unorm,write>;
fn shade(ro:vec3f,rd:vec3f)->vec3f{
 let hit=trace(ro,rd,.03,60.);
 if(hit.t>=60.){return vec3f(.033,.042,.047);}
 let p=ro+rd*hit.t;var color=hit.color;
 if(hit.floor>0.){
  let grid=abs(fract(p.xz*.5+.5)-.5);let seam=1.-smoothstep(.008,.023,min(grid.x,grid.y));color*=1.-seam*.5;
 }
 var direct=vec3f(0);var indirect=vec3f(0);
 if(u.flags.y==0.||u.flags.y==1.){direct=lightAt(p,hit.normal,u32(u.counts.z));}
 if((u.flags.y==0.&&u.flags.x>.5)||u.flags.y==2.){indirect=sampleIrradiance(p+hit.normal*.025,hit.normal)*u.light.y;}
 var lit=color*(direct+indirect*u.flags.x)*.65+color*hit.emission*u.light.x;
 if(hit.metal>.1 && u.flags.y==0. && u.debug.z>.5){
  let reflectedDir=reflect(rd,hit.normal);let rh=trace(p+hit.normal*.035,reflectedDir,.02,35.);var reflection=vec3f(.04,.055,.065);
  if(rh.t<35.){let rp=p+hit.normal*.035+reflectedDir*rh.t;reflection=rh.color*(rh.emission*u.light.x+lightAt(rp,rh.normal,u32(u.counts.z))*.5+sampleIrradiance(rp+rh.normal*.025,rh.normal)*u.flags.x*.4);}
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
  let level=u32(u.debug.x);let columns=select(select(36u,12u,level==1u),6u,level==2u);let d=dims(level);let rows=d.x*d.y*d.z/columns;
  let cell=vec2u(uv*vec2f(f32(columns),f32(rows)));let local=fract(uv*vec2f(f32(columns),f32(rows)));let side=4u<<level;let bin=min(vec2u(local*f32(side)),vec2u(side-1u));
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
struct Params {eye:vec4f,forward:vec4f,right:vec4f,up:vec4f,screen:vec4f,light:vec4f,flags:vec4f,counts:vec4f,debug:vec4f};
@group(0) @binding(0) var<uniform> u:Params;
@group(0) @binding(1) var<storage,read> nearField:array<vec4f>;
@group(0) @binding(2) var<storage,read> midField:array<vec4f>;
@group(0) @binding(3) var<storage,read> farField:array<vec4f>;
struct Out {@builtin(position) pos:vec4f,@location(0) local:vec2f,@location(1) color:vec3f};
@vertex fn vs(@builtin(vertex_index) vi:u32,@builtin(instance_index) pi:u32)->Out{
 let level=u32(u.debug.x);var d=vec3u(12,6,12);if(level==1u){d=vec3u(6,3,6);}if(level==2u){d=vec3u(3,2,3);}
 let c=vec3u(pi%d.x,(pi/d.x)%d.y,pi/(d.x*d.y));let world=vec3f(-6,0,-5.5)+(vec3f(c)+.5)/vec3f(d)*vec3f(12,6,11);
 let rel=world-u.eye.xyz;let depth=dot(rel,u.forward.xyz);
 var corners=array<vec2f,6>(vec2f(-1,-1),vec2f(1,-1),vec2f(-1,1),vec2f(-1,1),vec2f(1,-1),vec2f(1,1));
 let clip=vec2f(dot(rel,u.right.xyz)/(u.screen.x/u.screen.y*.38),dot(rel,u.up.xyz)/.38);
 var out:Out;out.pos=vec4f(clip+corners[vi]*vec2f(6.+f32(level)*3.)/u.screen.xy*depth,depth*.5,depth);out.local=corners[vi];
 let count=16u<<(level*2u);var radiance=vec3f(0);var visibility=0.;
 for(var i=0u;i<count;i++){var value=vec4f(0);if(level==0u){value=nearField[pi*count+i];}else if(level==1u){value=midField[pi*count+i];}else{value=farField[pi*count+i];}radiance+=value.xyz;visibility+=value.w;}
 radiance/=f32(count);out.color=pow(radiance/(1.+radiance),vec3f(1./2.2));
 if(u.debug.y==1.){out.color=select(select(vec3f(.74,.92,.46),vec3f(.25,.85,.88),level==1u),vec3f(.9,.48,.95),level==2u);}
 if(u.debug.y==2.){out.color=vec3f(visibility/f32(count));}
 return out;
}
@fragment fn fs(v:Out)->@location(0) vec4f {let radius=length(v.local);if(radius>1.){discard;}let edge=smoothstep(.7,1.,radius);return vec4f(mix(v.color,vec3f(.8,.88,.76),edge*.55),.88);}
`;

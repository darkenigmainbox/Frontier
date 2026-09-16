// Frontier - SDF raymarch renderer shaders (rewritten)
import { atlasGLSL } from "./erosion-shaders.js";

export const vertexGLSL = `#version 300 es
precision highp float;
out vec2 vUv;
void main(){ vec2 p=vec2((gl_VertexID<<1)&2, gl_VertexID&2); vUv=p*2.-1.; gl_Position=vec4(vUv,0,1); }`;

export const fragmentGLSL = `#version 300 es
precision highp float;
${atlasGLSL}
uniform sampler2D volume;
uniform sampler2D materialAtlas;
uniform vec4 eye, target, viewport, light, surface, brush, extra;
uniform float terrainShown;
in vec2 vUv;
out vec4 fragColor;

float field(vec3 p){ return sdfAt(volume,p); }

float hash(vec3 p){ vec3 q=fract(p*0.1031); q+=dot(q,q.yzx+33.33); return fract((q.x+q.y)*q.z); }
float noise(vec3 p){
  vec3 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
}
vec3 normalAt(vec3 p){ float e=0.13; return normalize(vec3(field(p+vec3(e,0,0))-field(p-vec3(e,0,0)), field(p+vec3(0,e,0))-field(p-vec3(0,e,0)), field(p+vec3(0,0,e))-field(p-vec3(0,0,e)))); }
vec3 matNormal(vec3 p, vec3 n){
  vec3 q=p*5.; float e=0.12;
  vec3 g=vec3(noise(q+vec3(e,0,0))-noise(q-vec3(e,0,0)), noise(q+vec3(0,e,0))-noise(q-vec3(0,e,0)), noise(q+vec3(0,0,e))-noise(q-vec3(0,0,e)))/0.24;
  return normalize(n - (g - n*dot(n,g))*surface.y*0.72);
}
vec2 boxRange(vec3 ro, vec3 rd){
  vec3 a=(LO-ro)/rd, b=(HI-ro)/rd, n=min(a,b), f=max(a,b);
  return vec2(max(max(n.x,n.y),n.z), min(min(f.x,f.y),f.z));
}
float trace(vec3 ro, vec3 rd){
  vec2 range=boxRange(ro,rd);
  float t=max(0.,range.x);
  if(t>range.y) return 200.;
  for(int i=0;i<190;i++){
    float d=field(ro+rd*t);
    if(d<0.065) return t;
    t+=max(0.035,d*0.65);
    if(t>range.y) break;
  }
  return 200.;
}
float shadow(vec3 p, vec3 l){
  if(terrainShown<0.5) return 1.;
  float t=0.18, s=1.;
  for(int i=0;i<32;i++){ float h=field(p+l*t); s=min(s,9.*h/t); t+=clamp(h,0.16,1.6); if(h<0.04||t>29.) break; }
  return clamp(s,0.,1.);
}
float ambient(vec3 p, vec3 n){
  float a=0., w=1.;
  for(int i=1;i<=4;i++){ float h=float(i)*0.48; a+=(h-field(p+n*h))*w; w*=0.55; }
  return clamp(1.-a*0.38,0.25,1.);
}
vec3 rockColor(vec3 p, vec3 n){
  float grain=noise(p*8.), broad=noise(p*0.43)+0.45*noise(p*1.8);
  float bedding=p.y+noise(vec3(p.x*0.12,0,p.z*0.12))*0.4;
  float bands=0.5+0.5*sin(bedding*3.4+0.4*sin(bedding*1.1));
  float thin=pow(0.5+0.5*sin(bedding*17.+noise(p*2.)*1.7),12.);
  vec3 c=mix(vec3(0.37,0.135,0.064), vec3(0.72,0.33,0.14), 0.37+broad*0.31);
  c=mix(c,c*vec3(0.74,0.70,0.65), bands*surface.x*0.35);
  c*=1.-thin*0.20*surface.x;
  c+=vec3(0.055,0.04,0.028)*(grain-0.5)*surface.y;
  float top=smoothstep(0.55,0.96,n.y);
  c=mix(c, vec3(0.64,0.37,0.185)*(0.9+broad*0.12), top*0.67);
  float streak=noise(vec3(p.x*3.3,p.y*0.13,p.z*3.3));
  c*=0.79+0.28*streak;
  // material overlay from erosion
  vec4 layer=sampleVolume(materialAtlas,p);
  float lm=dot(layer,vec4(1));
  if(lm>0.0001){
    vec3 loose=(layer.x*vec3(0.66,0.45,0.23)+layer.y*vec3(0.38,0.34,0.25)+layer.z*vec3(0.45,0.39,0.31))/max(lm,0.000001);
    c=mix(c, loose, clamp(lm/(VOXEL_VOLUME*0.45),0.,0.85));
  }
  if(extra.x>0.5) c=vec3(0.58,0.55,0.47);
  return c;
}
vec3 sky(vec3 rd){ return mix(vec3(0.58,0.60,0.53), vec3(0.31,0.40,0.39), smoothstep(-0.1,0.8,rd.y)); }

void main(){
  vec2 uv=vUv;
  vec3 forward=normalize(target.xyz-eye.xyz), right=normalize(cross(forward,vec3(0,1,0))), up=cross(right,forward);
  vec3 rd=normalize(forward+right*uv.x*target.w*0.62+up*uv.y*0.62), ro=eye.xyz;
  float angle=light.x*0.0174533;
  vec3 sun=normalize(vec3(cos(angle),0.85,sin(angle)));
  float t=terrainShown>0.5? trace(ro,rd):200.;
  float floorT=(-1.6-ro.y)/rd.y;
  vec3 color=sky(rd);
  bool hit=false;
  if(t<150.){
    hit=true;
    vec3 p=ro+rd*t, geo=normalAt(p), n=matNormal(p,geo);
    float sh=shadow(p+geo*0.17,sun), ao=ambient(p,geo), diffuse=max(dot(n,sun),0.);
    vec3 bounce=max(-n.y,0.)*vec3(0.13,0.075,0.035);
    color=rockColor(p,n)*(vec3(0.25,0.28,0.27)*ao + vec3(1.05,0.91,0.70)*diffuse*sh + bounce);
    color+=rockColor(p,n)*pow(1.-max(dot(n,-rd),0.),3.)*0.09;
    if(brush.w>0.){
      float d=distance(p,brush.xyz), ring=1.-smoothstep(0.04,0.12,abs(d-brush.w));
      color=mix(color, vec3(1.,0.62,0.28), ring*0.8);
      color+=vec3(0.07,0.025,0.006)*(1.-smoothstep(0.,brush.w,d));
    }
  } else if(floorT>0.){
    t=floorT; hit=true;
    vec3 p=ro+rd*t;
    float tex=noise(p*2.)*0.025+noise(p*0.15)*0.045, sh=shadow(p+vec3(0,0.12,0),sun);
    color=(vec3(0.49,0.445,0.345)+tex)*(0.56+0.44*sh);
    float grid=min(abs(fract(p.x*0.1+0.5)-0.5), abs(fract(p.z*0.1+0.5)-0.5));
    float outside=smoothstep(18.,26., max(abs(p.x),abs(p.z)));
    color*=1.-(1.-smoothstep(0.001,0.012,grid))*0.09*outside;
  }
  // water plane simple
  if(light.w>0.5 && rd.y<-0.001){
    float tw=(light.z-ro.y)/rd.y;
    vec3 p=ro+rd*tw;
    float center=2.5*sin(p.z*0.15)+sin(p.z*0.36+1.);
    bool wet=abs(p.x-center)<4.6+light.z*0.12 && abs(p.z)<16.7;
    if(tw>0. && tw<t && wet && field(p)>0.015){
      float time=eye.w;
      float ripple=surface.w;
      float wave=sin(p.x*3.1+p.z*1.4+time*0.8)+0.45*sin(p.z*6.3-p.x*2.-time*0.7);
      vec3 n=normalize(vec3(cos(p.x*3.1+p.z*1.4+time*0.8)*ripple*0.10,1., cos(p.z*6.3-p.x*2.-time*0.7)*ripple*0.07));
      float fresnel=0.035+0.55*pow(1.-max(dot(n,-rd),0.),5.);
      float depth=min(max(t-tw,0.),8.);
      float trans=exp(-depth*(0.35+(1.-surface.z)*1.4));
      float sh=shadow(p+vec3(0,0.1,0),sun);
      vec3 water=vec3(0.12,0.26,0.23)*(0.65+0.35*sh);
      color=mix(water,color,trans*0.6);
      color=mix(color, sky(reflect(rd,n)), fresnel);
      float spec=pow(max(dot(reflect(-sun,n),-rd),0.),140.);
      color+=vec3(1,0.88,0.64)*spec*sh*0.7;
      color+=wave*0.004*ripple;
      float shore=1.-smoothstep(0.03,0.22,field(p));
      color=mix(color, vec3(0.64,0.65,0.48), shore*0.20);
      t=tw; hit=true;
    }
  }
  if(hit){ float fog=1.-exp(-t*t*(0.000016+light.y*0.000023)); color=mix(color, vec3(0.58,0.60,0.52), min(0.83,fog)); }
  color=color/(color+vec3(0.78)); color=pow(color, vec3(0.4545));
  float vignette=1.-0.13*dot(uv*0.65,uv*0.65); color*=vignette;
  float dither=(hash(vec3(gl_FragCoord.xy,eye.w))-0.5)/255.;
  fragColor=vec4(color+dither,1);
}
`;

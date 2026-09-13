// Frontier — dependency-free WebGL2 renderer: satmap terrain, sea, rain points.
// Minimal mat4 + orbit camera included (no three.js, works offline).

// ---------- tiny mat4 ----------
export function mPerspective(out, fovy, aspect, near, far) {
  const f = 1 / Math.tan(fovy / 2);
  out.fill(0);
  out[0] = f / aspect; out[5] = f;
  out[10] = (far + near) / (near - far);
  out[11] = -1;
  out[14] = (2 * far * near) / (near - far);
  return out;
}
export function mLookAt(out, eye, c, up) {
  let zx = eye[0] - c[0], zy = eye[1] - c[1], zz = eye[2] - c[2];
  let l = Math.hypot(zx, zy, zz) || 1; zx /= l; zy /= l; zz /= l;
  let xx = up[1] * zz - up[2] * zy, xy = up[2] * zx - up[0] * zz, xz = up[0] * zy - up[1] * zx;
  l = Math.hypot(xx, xy, xz) || 1; xx /= l; xy /= l; xz /= l;
  const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
  out[0] = xx; out[1] = yx; out[2] = zx; out[3] = 0;
  out[4] = xy; out[5] = yy; out[6] = zy; out[7] = 0;
  out[8] = xz; out[9] = yz; out[10] = zz; out[11] = 0;
  out[12] = -(xx * eye[0] + xy * eye[1] + xz * eye[2]);
  out[13] = -(yx * eye[0] + yy * eye[1] + yz * eye[2]);
  out[14] = -(zx * eye[0] + zy * eye[1] + zz * eye[2]);
  out[15] = 1;
  return out;
}
export function mMul(out, a, b) {
  const o = new Float32Array(16);
  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 4; r++)
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
  out.set(o);
  return out;
}
export function mInvert(out, m) {
  // gl-matrix style inversion.
  const a00 = m[0], a01 = m[1], a02 = m[2], a03 = m[3];
  const a10 = m[4], a11 = m[5], a12 = m[6], a13 = m[7];
  const a20 = m[8], a21 = m[9], a22 = m[10], a23 = m[11];
  const a30 = m[12], a31 = m[13], a32 = m[14], a33 = m[15];
  const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10;
  const b03 = a01 * a12 - a02 * a11, b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12;
  const b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30, b08 = a20 * a33 - a23 * a30;
  const b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
  let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
  if (!det) return out;
  det = 1 / det;
  out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
  out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
  out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
  out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
  out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
  out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
  out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
  out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
  out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
  out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
  out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
  out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
  out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
  out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
  out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
  out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
  return out;
}

// ---------- shaders ----------
const TERRAIN_VERT = `#version 300 es
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNrm;
layout(location=2) in vec4 aM1; // ao, curv, sed, moist
layout(location=3) in vec4 aM2; // flow, erode, hard, strata
uniform mat4 uVP;
out vec3 vPos; out vec3 vNrm;
out vec4 vM1; out vec4 vM2;
void main(){
  vPos=aPos; vNrm=aNrm; vM1=aM1; vM2=aM2;
  gl_Position = uVP * vec4(aPos,1.0);
}`;

const TERRAIN_FRAG = `#version 300 es
precision highp float;
in vec3 vPos; in vec3 vNrm; in vec4 vM1; in vec4 vM2;
uniform vec3 uCamPos, uSunDir;
uniform float uSea, uSnow, uSat, uTime;
uniform int uMode;
uniform sampler2D uPaint;
uniform vec4 uWorld; // minX, sizeX, minZ, sizeZ
uniform int uShowPaint, uPaintCh;
out vec4 oCol;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float vnoise(vec2 p){
  vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),u.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x), u.y);
}
vec3 sat(vec3 c, float s){ float g=dot(c, vec3(.299,.587,.114)); return mix(vec3(g), c, s); }

void main(){
  float ao=vM1.x, curv=vM1.y, sed=vM1.z, moist=clamp(vM1.w,0.,1.);
  float flow=vM2.x, erode=vM2.y, hard=vM2.z, strata=vM2.w;
  vec3 N = normalize(vNrm);
  float slope = 1.0 - N.y; // 0 flat
  float elev = vPos.y;

  // ---- biome base (satellite-like anchors) ----
  vec3 sand   = vec3(0.76,0.70,0.55);
  vec3 grass  = vec3(0.36,0.46,0.24);
  vec3 forest = vec3(0.16,0.30,0.14);
  vec3 alpine = vec3(0.45,0.44,0.33);
  vec3 rock   = vec3(0.42,0.38,0.34);
  vec3 rockD  = vec3(0.30,0.27,0.25);
  vec3 snow   = vec3(0.92,0.94,0.97);
  float m = moist;
  vec3 veg = mix(grass, forest, smoothstep(0.35,0.8,m));
  vec3 alb = mix(sand, veg, smoothstep(uSea+2.0, uSea+26.0, elev));
  alb = mix(alb, alpine, smoothstep(150.0, 260.0, elev));
  // slope rock
  float rockW = smoothstep(0.18, 0.42, slope);
  // strata banding on cliffs
  float band = 0.5+0.5*sin(strata*6.2831);
  vec3 cliff = mix(rockD, rock, band*0.7+0.15);
  cliff *= 0.9+0.2*band;
  alb = mix(alb, cliff, rockW);
  // sediment fans / dunes / talus
  vec3 sedC = mix(vec3(0.72,0.64,0.47), vec3(0.55,0.48,0.36), smoothstep(0.0,0.6,flow));
  alb = mix(alb, sedC, clamp(sed*1.2,0.,0.85));
  // fresh erosion -> raw rock
  alb = mix(alb, rockD*1.1, clamp(erode*0.9,0.,0.7)*(1.0-rockW*0.5));
  // moisture darken + saturate
  alb *= (1.0-0.32*moist);
  alb = mix(alb, alb*vec3(0.9,1.05,0.85), moist*0.5);
  // flow streaks
  alb *= (1.0-0.25*flow*smoothstep(0.05,0.3,slope+0.1));
  // micro detail: 2-scale grain + patchiness
  float g1 = vnoise(vPos.xz*0.11);
  float g2 = vnoise(vPos.xz*0.013+7.0);
  alb *= 0.88+0.24*g1;
  alb *= 0.92+0.16*g2;
  // slope streaks
  float streak = vnoise(vec2((vPos.x+vPos.z)*0.05, elev*0.15));
  alb *= 1.0 - 0.10*streak*smoothstep(0.25,0.5,slope);
  // underwater sand/rock
  if(elev < uSea){
    float dd = clamp((uSea-elev)/60.0, 0.0, 1.0);
    alb = mix(sand*0.9, vec3(0.16,0.24,0.26), dd);
  }
  // snow
  float snowW = smoothstep(uSnow, uSnow+60.0, elev) * (1.0-smoothstep(0.35,0.6,slope)) * (0.7+0.3*clamp(curv*2.0+0.5,0.,1.));
  float sparkle = step(0.985, hash(floor(vPos.xz*2.0)+floor(uTime*2.0)*0.13));
  alb = mix(alb, snow + sparkle*0.3, clamp(snowW,0.,1.));
  alb = sat(alb, uSat);

  // ---- lighting ----
  float ndl = dot(N, uSunDir);
  float diff = clamp(ndl*0.5+0.5, 0.0, 1.0);
  diff = pow(diff, 1.4);
  vec3 skyAmb = mix(vec3(0.32,0.38,0.48), vec3(0.55,0.62,0.72), N.y*0.5+0.5);
  float wrap = clamp((ndl+0.25)/1.25, 0.0, 1.0);
  vec3 col = alb * vec3(1.15,1.08,0.98) * (wrap*diff+0.12);
  col += alb * skyAmb * 0.55;
  // ridge light-catch / cavity depth
  col *= 1.0 + clamp(curv,-1.,1.)*0.18;
  col *= 0.25+0.75*ao;
  // wet spec
  vec3 V = normalize(uCamPos - vPos);
  vec3 Hv = normalize(V+uSunDir);
  float spec = pow(max(dot(N,Hv),0.0), 60.0) * (0.15+0.6*moist+0.3*smoothstep(uSnow,uSnow+40.,elev)*0.0+0.25*smoothstep(0.02,0.0,abs(elev-uSea)));
  col += vec3(1.0,0.98,0.9)*spec*0.6;
  // height fog
  float dist = length(uCamPos - vPos);
  float fog = 1.0 - exp(-dist*0.00016);
  vec3 fogC = vec3(0.62,0.70,0.80);
  col = mix(col, fogC, clamp(fog,0.,1.));

  // ---- debug / mask modes ----
  if(uMode==1) col = vec3(ao);
  else if(uMode==2) col = curv>0.0 ? mix(vec3(0.5),vec3(1.0,0.85,0.4),clamp(curv*2.,0.,1.)) : mix(vec3(0.5),vec3(0.2,0.4,1.0),clamp(-curv*2.,0.,1.));
  else if(uMode==3) col = mix(vec3(0.1,0.08,0.05), vec3(0.1,0.5,0.9), moist);
  else if(uMode==4) col = mix(vec3(0.05), vec3(0.2,0.7,1.0), flow);
  else if(uMode==5) col = mix(vec3(0.08,0.06,0.03), vec3(0.95,0.8,0.4), clamp(sed*1.5,0.,1.));
  else if(uMode==6) col = mix(vec3(0.05), vec3(1.0,0.3,0.1), clamp(erode*1.5,0.,1.));
  else if(uMode==7){ float b=0.5+0.5*sin(strata*6.2831); col = mix(vec3(0.2,0.12,0.08), vec3(0.9,0.75,0.5), b*hard); }
  else if(uMode==8) col = N*0.5+0.5;

  // paint overlay
  if(uShowPaint==1){
    vec2 uv = vec2((vPos.x-uWorld.x)/uWorld.y, (vPos.z-uWorld.z)/uWorld.w);
    vec4 pm = texture(uPaint, uv);
    float ch = uPaintCh==0?pm.r:(uPaintCh==1?pm.g:pm.b);
    vec3 pc = uPaintCh==0?vec3(0.2,0.6,1.0):(uPaintCh==1?vec3(1.0,0.6,0.1):vec3(0.2,0.9,0.5));
    col = mix(col, pc, clamp(ch,0.,1.)*0.55);
  }
  oCol = vec4(col, 1.0);
}`;

const SEA_VERT = `#version 300 es
layout(location=0) in vec2 aXY;
uniform mat4 uVP; uniform float uSea;
out vec3 vPos;
void main(){
  vPos = vec3(aXY.x, uSea, aXY.y);
  gl_Position = uVP * vec4(vPos,1.0);
}`;
const SEA_FRAG = `#version 300 es
precision highp float;
in vec3 vPos;
uniform vec3 uCamPos, uSunDir;
uniform float uTime;
uniform sampler2D uShore;
uniform vec4 uWorld;
out vec4 oCol;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
void main(){
  vec2 uv = vec2((vPos.x-uWorld.x)/uWorld.y, (vPos.z-uWorld.z)/uWorld.w);
  vec4 sh = texture(uShore, uv);
  float depth = sh.r; // 0 shore -> 1 deep
  vec3 shallow = vec3(0.25,0.62,0.66);
  vec3 deep = vec3(0.03,0.19,0.32);
  vec3 col = mix(shallow, deep, pow(depth,0.6));
  vec3 V = normalize(uCamPos - vPos);
  float fres = pow(1.0-max(V.y,0.0), 3.0);
  col = mix(col, vec3(0.62,0.70,0.80), fres*0.7);
  // sun glint
  vec2 wob = vec2(hash(floor(vPos.xz*0.5)+floor(uTime*3.0)), hash(floor(vPos.zx*0.5)-floor(uTime*2.0)))-0.5;
  vec3 N = normalize(vec3(wob.x*0.25, 1.0, wob.y*0.25));
  vec3 Hv = normalize(V+uSunDir);
  col += vec3(1.0,0.95,0.85)*pow(max(dot(N,Hv),0.0),240.0)*2.0;
  col += vec3(1.0)*pow(max(dot(N,Hv),0.0),36.0)*0.12;
  // foam
  float foamBand = smoothstep(0.06,0.0,depth)* (0.6+0.4*sin(uTime*1.5 + (vPos.x+vPos.z)*0.05));
  float fn = hash(floor(vPos.xz*0.8));
  col = mix(col, vec3(0.9,0.95,0.95), clamp(foamBand*(0.4+0.6*fn),0.,0.85));
  float dist = length(uCamPos - vPos);
  float fog = 1.0 - exp(-dist*0.00016);
  col = mix(col, vec3(0.62,0.70,0.80), clamp(fog,0.,1.));
  oCol = vec4(col, 0.92);
}`;

const PTS_VERT = `#version 300 es
layout(location=0) in vec3 aPos;
uniform mat4 uVP; uniform float uSize;
void main(){
  gl_Position = uVP * vec4(aPos,1.0);
  float d = max(1.0, gl_Position.w);
  gl_PointSize = clamp(uSize*900.0/d, 1.0, 7.0);
}`;
const PTS_FRAG = `#version 300 es
precision highp float;
uniform vec3 uColor; uniform float uAlpha;
out vec4 oCol;
void main(){
  vec2 c = gl_PointCoord-0.5;
  if(dot(c,c)>0.25) discard;
  oCol = vec4(uColor, uAlpha);
}`;

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(s) + '\n' + src.slice(0, 500));
  }
  return s;
}
function program(gl, vs, fs) {
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  return p;
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl2', { antialias: true });
    if (!gl) throw new Error('WebGL2 not available');
    this.gl = gl;
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    this.progT = program(gl, TERRAIN_VERT, TERRAIN_FRAG);
    this.progS = program(gl, SEA_VERT, SEA_FRAG);
    this.progP = program(gl, PTS_VERT, PTS_FRAG);
    this.uT = this.uniforms(this.progT);
    this.uS = this.uniforms(this.progS);
    this.uP = this.uniforms(this.progP);
    // mesh buffers
    this.vao = gl.createVertexArray();
    this.vbos = [];
    for (let i = 0; i < 4; i++) this.vbos.push(gl.createBuffer());
    this.ebo = gl.createBuffer();
    this.indexCount = 0;
    this.indexType = gl.UNSIGNED_INT;
    // sea quad
    this.seaVao = gl.createVertexArray();
    gl.bindVertexArray(this.seaVao);
    const sq = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sq);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1050, -1050, 1050, -1050, -1050, 1050, 1050, 1050]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    // rain points
    this.ptsVao = gl.createVertexArray();
    gl.bindVertexArray(this.ptsVao);
    this.ptsVbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.ptsVbo);
    gl.bufferData(gl.ARRAY_BUFFER, 24000 * 3 * 4, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    this.ptsCount = 0;
    gl.bindVertexArray(null);
    // paint + shore textures
    this.paintTex = gl.createTexture();
    this.shoreTex = gl.createTexture();
    for (const t of [this.paintTex, this.shoreTex]) {
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
    // camera
    this.cam = { tx: 0, ty: 130, tz: 0, r: 2500, theta: 0.7, phi: 1.02 };
    this.vp = new Float32Array(16);
    this.invVp = new Float32Array(16);
    this.eye = [0, 0, 0];
    this.shade = { mode: 0, sunAzim: 135, sunElev: 42, snowline: 300, saturation: 1, seaLevel: 0, showPaint: 0, paintCh: 0 };
    this.world = [-1000, 2000, -1000, 2000];
    this.showSea = true;
    this.showRain = true;
    this.bindControls();
    this.resize();
  }
  uniforms(p) {
    const gl = this.gl, u = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) {
      const info = gl.getActiveUniform(p, i);
      u[info.name] = gl.getUniformLocation(p, info.name);
    }
    return u;
  }
  resize() {
    const c = this.canvas, dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(2, Math.floor(c.clientWidth * dpr)), h = Math.max(2, Math.floor(c.clientHeight * dpr));
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    this.gl.viewport(0, 0, c.width, c.height);
  }
  bindControls() {
    const c = this.canvas, cam = this.cam;
    let drag = null;
    c.style.touchAction = 'none';
    c.addEventListener('pointerdown', (e) => {
      if (this.pickMode) return; // app handles painting
      c.setPointerCapture(e.pointerId);
      drag = { x: e.clientX, y: e.clientY, b: e.button, shift: e.shiftKey };
    });
    c.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      drag.x = e.clientX; drag.y = e.clientY;
      if (drag.b === 2 || drag.shift) {
        const s = cam.r * 0.0011;
        const fx = -Math.sin(cam.theta), fz = -Math.cos(cam.theta);
        const rx = -fz, rz = fx;
        cam.tx -= (rx * dx - fx * dy) * s;
        cam.tz -= (rz * dx - fz * dy) * s;
        cam.ty = Math.max(-50, Math.min(800, cam.ty + dy * s));
      } else {
        cam.theta -= dx * 0.005;
        cam.phi = Math.min(1.52, Math.max(0.12, cam.phi - dy * 0.004));
      }
    });
    c.addEventListener('pointerup', () => (drag = null));
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      cam.r = Math.min(6000, Math.max(150, cam.r * (1 + Math.sign(e.deltaY) * 0.09)));
    }, { passive: false });
  }
  sunDir() {
    const az = (this.shade.sunAzim * Math.PI) / 180, el = (this.shade.sunElev * Math.PI) / 180;
    return [Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)];
  }
  setMesh(m) {
    const gl = this.gl;
    gl.bindVertexArray(this.vao);
    const load = (i, arr, size) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbos[i]);
      gl.bufferData(gl.ARRAY_BUFFER, arr, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(i);
      gl.vertexAttribPointer(i, size, gl.FLOAT, false, 0, 0);
    };
    load(0, m.positions, 3);
    load(1, m.normals, 3);
    const m1 = new Float32Array(m.verts * 4), m2 = new Float32Array(m.verts * 4);
    for (let v = 0; v < m.verts; v++) {
      m1[v * 4] = m.ao[v]; m1[v * 4 + 1] = m.curv[v]; m1[v * 4 + 2] = m.sed[v]; m1[v * 4 + 3] = m.moist[v];
      m2[v * 4] = m.flow[v]; m2[v * 4 + 1] = m.erode[v]; m2[v * 4 + 2] = m.hard[v]; m2[v * 4 + 3] = m.strata[v];
    }
    load(2, m1, 4);
    load(3, m2, 4);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ebo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, m.indices, gl.STATIC_DRAW);
    this.indexCount = m.indices.length;
    this.indexType = m.indices instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;
    gl.bindVertexArray(null);
  }
  setRainPositions(arr, count) {
    const gl = this.gl;
    const n = Math.min(count, 24000);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.ptsVbo);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, arr.subarray(0, n * 3));
    this.ptsCount = n;
  }
  updatePaint(vol) {
    const gl = this.gl;
    const w = vol.nx, h = vol.nz;
    const px = new Uint8Array(w * h * 4);
    for (let k = 0; k < h; k++)
      for (let i = 0; i < w; i++) {
        const id = vol.idx2(i, k), o = (k * w + i) * 4;
        px[o] = Math.min(255, vol.paintRain[id] * 255);
        px[o + 1] = Math.min(255, vol.paintHard[id] * 255);
        px[o + 2] = Math.min(255, vol.paintMoist[id] * 255);
        px[o + 3] = 255;
      }
    gl.bindTexture(gl.TEXTURE_2D, this.paintTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, px);
  }
  updateShore(vol, sea) {
    // 128x128 shore/depth texture from column scans.
    const gl = this.gl, S = 128;
    const px = new Uint8Array(S * S * 4);
    const { nx, ny, nz, dist } = vol;
    for (let k = 0; k < S; k++) {
      for (let i = 0; i < S; i++) {
        const gi = Math.round((i / (S - 1)) * (nx - 1));
        const gk = Math.round((k / (S - 1)) * (nz - 1));
        let sy = null;
        const base = gk * ny * nx;
        for (let j = ny - 1; j > 0; j--) {
          if (dist[base + j * nx + gi] > 0 && dist[base + (j - 1) * nx + gi] <= 0) {
            sy = vol.minY + (j / (ny - 1)) * vol.sizeY;
            break;
          }
        }
        const o = (k * S + i) * 4;
        if (sy === null || sy >= sea) { px[o] = 0; px[o + 3] = 255; continue; }
        px[o] = Math.min(255, ((sea - sy) / 90) * 255);
        px[o + 3] = 255;
      }
    }
    gl.bindTexture(gl.TEXTURE_2D, this.shoreTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, S, S, 0, gl.RGBA, gl.UNSIGNED_BYTE, px);
  }
  pickRay(clientX, clientY) {
    const c = this.canvas, r = c.getBoundingClientRect();
    const nx = ((clientX - r.left) / r.width) * 2 - 1;
    const ny = 1 - ((clientY - r.top) / r.height) * 2;
    const inv = this.invVp;
    const p0 = [nx, ny, -1, 1], p1 = [nx, ny, 1, 1];
    const t = (p) => {
      const x = inv[0] * p[0] + inv[4] * p[1] + inv[8] * p[2] + inv[12] * p[3];
      const y = inv[1] * p[0] + inv[5] * p[1] + inv[9] * p[2] + inv[13] * p[3];
      const z = inv[2] * p[0] + inv[6] * p[1] + inv[10] * p[2] + inv[14] * p[3];
      const w = inv[3] * p[0] + inv[7] * p[1] + inv[11] * p[2] + inv[15] * p[3];
      return [x / w, y / w, z / w];
    };
    const a = t(p0), b = t(p1);
    const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const l = Math.hypot(d[0], d[1], d[2]) || 1;
    return { origin: a, dir: [d[0] / l, d[1] / l, d[2] / l] };
  }
  frame(time) {
    const gl = this.gl, cam = this.cam;
    this.resize();
    const eye = [
      cam.tx + cam.r * Math.sin(cam.phi) * Math.sin(cam.theta),
      cam.ty + cam.r * Math.cos(cam.phi),
      cam.tz + cam.r * Math.sin(cam.phi) * Math.cos(cam.theta),
    ];
    this.eye = eye;
    const proj = new Float32Array(16), view = new Float32Array(16);
    mPerspective(proj, 0.9, this.canvas.width / this.canvas.height, 2, 20000);
    mLookAt(view, eye, [cam.tx, cam.ty, cam.tz], [0, 1, 0]);
    mMul(this.vp, proj, view);
    mInvert(this.invVp, this.vp);
    gl.clearColor(0.62, 0.70, 0.80, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const sun = this.sunDir();
    // terrain
    if (this.indexCount) {
      gl.useProgram(this.progT);
      gl.bindVertexArray(this.vao);
      gl.uniformMatrix4fv(this.uT.uVP, false, this.vp);
      gl.uniform3fv(this.uT.uCamPos, eye);
      gl.uniform3fv(this.uT.uSunDir, sun);
      gl.uniform1f(this.uT.uSea, this.shade.seaLevel);
      gl.uniform1f(this.uT.uSnow, this.shade.snowline);
      gl.uniform1f(this.uT.uSat, this.shade.saturation);
      gl.uniform1f(this.uT.uTime, time);
      gl.uniform1i(this.uT.uMode, this.shade.mode);
      gl.uniform4f(this.uT.uWorld, this.world[0], this.world[1], this.world[2], this.world[3]);
      gl.uniform1i(this.uT.uShowPaint, this.shade.showPaint);
      gl.uniform1i(this.uT.uPaintCh, this.shade.paintCh);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.paintTex);
      gl.uniform1i(this.uT.uPaint, 0);
      gl.drawElements(gl.TRIANGLES, this.indexCount, this.indexType, 0);
    }
    // sea
    if (this.showSea) {
      gl.useProgram(this.progS);
      gl.bindVertexArray(this.seaVao);
      gl.uniformMatrix4fv(this.uS.uVP, false, this.vp);
      gl.uniform1f(this.uS.uSea, this.shade.seaLevel);
      gl.uniform3fv(this.uS.uCamPos, eye);
      gl.uniform3fv(this.uS.uSunDir, sun);
      gl.uniform1f(this.uS.uTime, time);
      gl.uniform4f(this.uS.uWorld, this.world[0], this.world[1], this.world[2], this.world[3]);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.shoreTex);
      gl.uniform1i(this.uS.uShore, 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    // rain points
    if (this.showRain && this.ptsCount > 1) {
      gl.useProgram(this.progP);
      gl.bindVertexArray(this.ptsVao);
      gl.uniformMatrix4fv(this.uP.uVP, false, this.vp);
      gl.uniform1f(this.uP.uSize, 2.2);
      gl.uniform3f(this.uP.uColor, 0.65, 0.8, 1.0);
      gl.uniform1f(this.uP.uAlpha, 0.55);
      gl.drawArrays(gl.POINTS, 0, this.ptsCount);
    }
    gl.bindVertexArray(null);
  }
}

// ---------------------------------------------------------------------------
// GPU particles — 100% GPU, texture ping-pong, zero per-particle CPU work.
//
//  * SPLASH system : ballistic droplets (gravity, drag, surface kill).
//                    Emitters = boat stern/bow + up to 4 burst points
//                    (mouse splashes, boulder impacts, rock hits).
//  * FOAM3D system : floating foam flecks that ride the exact simulated
//                    surface, advected by the solver velocity grid, and only
//                    VISIBLE where the foam grid says there is foam.
//                    Spawn zones: boat wake, shoreline ring, breaking crests.
//
// Both sample the unified solver OUTPUT texture, so they follow whichever of
// the 3 solvers is live. Max 16 384 particles per system (128x128 textures).
// ---------------------------------------------------------------------------
import * as THREE from 'three';
import { WORLD, ISLAND_CENTER, ISLAND_RADIUS, gerstnerUniforms } from './config.js';
import { FS_VERT } from './shaders.js';

const TEX = 128;
export const MAX_PARTICLES = TEX * TEX;

const HASH = /* glsl */ `
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec3 hash33(vec3 p){ p = fract(p * vec3(0.1031, 0.1030, 0.0973)); p += dot(p, p.yxz + 33.33); return fract((p.xxy + p.yxx) * p.zyx); }
uniform float uWorld;
vec2 worldToUvXZ(vec2 xz){ return vec2(xz.x / uWorld + 0.5, 0.5 - xz.y / uWorld); }
`;

const GERSTNER_Y = /* glsl */ `
uniform vec4 uWavesA[6];
uniform vec4 uWavesB[6];
uniform float uWaveAmpP;
uniform float uWavesOnP;
uniform float uModeP;
float gerstnerY(vec2 xz, float time){
  if(uWavesOnP < 0.5) return 0.0;
  float y = 0.0;
  for(int i = 0; i < 6; i++){
    float f = uWavesA[i].z * dot(uWavesA[i].xy, xz) - uWavesA[i].w * time + uWavesB[i].z;
    y += uWavesB[i].x * sin(f);
  }
  float take = (uModeP > 1.5) ? 0.18 : 1.0;
  return y * uWaveAmpP * take;
}
`;

function makeRT() {
  return new THREE.WebGLRenderTarget(TEX, TEX, {
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
    depthBuffer: false, stencilBuffer: false,
  });
}

const INIT_POS_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
${HASH}
void main(){
  vec3 r = hash33(vec3(vUv * 913.7, 4.2));
  vec2 xz = (r.xy - 0.5) * uWorld * 0.9;
  gl_FragColor = vec4(xz.x, -60.0, xz.y, -r.z * 3.0);   // dead, staggered
}
`;
const INIT_VEL_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
${HASH}
void main(){
  float seed = hash12(vUv * 1713.3 + 7.7);
  gl_FragColor = vec4(0.0, 0.0, 0.0, seed);
}
`;

// shared spawn logic for splash vel+pos passes (must agree exactly)
const SPLASH_SPAWN = /* glsl */ `
uniform vec4 uEmitters[6];    // x, z, strength, radius  (world)
uniform float uEmitterTotal;
uniform float uSpawnTick;
uniform float uSpawnRate;
// returns: xyz = spawn pos, w = emitter strength (<=0 means "stay dead")
vec4 pickSpawn(float seed, out vec3 rnd){
  rnd = hash33(vec3(seed * 977.0, uSpawnTick, seed * 131.0));
  if(uEmitterTotal <= 0.001 || rnd.x > uSpawnRate) return vec4(0.0, -60.0, 0.0, -1.0);
  float pick = hash12(vec2(seed * 331.0, uSpawnTick * 1.7)) * uEmitterTotal;
  vec4 e = uEmitters[5];
  float acc = 0.0;
  for(int i = 0; i < 6; i++){
    acc += max(uEmitters[i].z, 0.0);
    if(pick <= acc){ e = uEmitters[i]; break; }
  }
  vec3 r2 = hash33(vec3(uSpawnTick * 0.61, seed * 571.0, 9.3));
  float ang = r2.x * 6.2831853;
  float rad = sqrt(r2.y) * e.w;
  return vec4(e.x + cos(ang) * rad, 0.0, e.y + sin(ang) * rad, e.z);
}
`;

const SPLASH_VEL_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uPos;
uniform sampler2D uVel;
uniform float uDt;
uniform vec2 uBoatVelXZ;
${HASH}
${SPLASH_SPAWN}
void main(){
  vec4 pos = texture2D(uPos, vUv);
  vec4 vel = texture2D(uVel, vUv);
  float seed = vel.w;
  if(pos.w <= 0.0){
    vec3 rnd;
    vec4 sp = pickSpawn(seed, rnd);
    if(sp.w <= 0.0){ gl_FragColor = vec4(0.0, 0.0, 0.0, seed); return; }
    vec3 r3 = hash33(vec3(seed * 719.0, 3.1, uSpawnTick));
    float ang = r3.x * 6.2831853;
    float up = sp.w * (0.95 + r3.y * 1.7);
    float outR = sp.w * (0.3 + r3.z * 1.15);
    vec3 v = vec3(cos(ang) * outR, up, sin(ang) * outR);
    v.xz += uBoatVelXZ * 0.35 * step(0.5, sp.w) * 0.4;
    gl_FragColor = vec4(v, seed);
    return;
  }
  vec3 v = vel.xyz;
  v.y -= 9.81 * uDt;
  v.xz *= (1.0 - 0.25 * uDt);
  v.y *= (1.0 - 0.05 * uDt);
  gl_FragColor = vec4(v, seed);
}
`;

const SPLASH_POS_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uPos;
uniform sampler2D uVel;     // freshly updated velocity
uniform sampler2D uSim;
uniform float uDt;
uniform float uTimeP;
${HASH}
${GERSTNER_Y}
${SPLASH_SPAWN}
void main(){
  vec4 pos = texture2D(uPos, vUv);
  vec4 vel = texture2D(uVel, vUv);
  float seed = vel.w;
  if(pos.w <= 0.0){
    vec3 rnd;
    vec4 sp = pickSpawn(seed, rnd);
    if(sp.w <= 0.0){ gl_FragColor = vec4(pos.x, -60.0, pos.z, -0.02); return; }
    float surf = texture2D(uSim, worldToUvXZ(sp.xz)).r + gerstnerY(sp.xz, uTimeP);
    float life = 0.55 + rnd.z * 0.95;
    gl_FragColor = vec4(sp.x, surf + 0.08, sp.z, life);
    return;
  }
  float life = pos.w - uDt;
  vec3 p = pos.xyz + vel.xyz * uDt;
  float surf = texture2D(uSim, worldToUvXZ(p.xz)).r + gerstnerY(p.xz, uTimeP);
  if(p.y < surf - 0.05 && vel.y < 0.0) life = 0.0;
  if(life <= 0.0){ gl_FragColor = vec4(p.x, -60.0, p.z, 0.0); return; }
  gl_FragColor = vec4(p, life);
}
`;

const FOAM_POS_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uPos;
uniform sampler2D uVel;      // static seed texture (w = seed)
uniform sampler2D uSim;
uniform sampler2D uFoamTex;
uniform sampler2D uTerrainP;
uniform sampler2D uNoiseP;
uniform float uDt;
uniform float uTimeP;
uniform float uSpawnTick;
uniform vec2 uBoatPosXZ;
uniform vec2 uBoatDirXZ;
uniform float uBoatSpeed;
uniform vec2 uWindXZ;
uniform vec2 uIslandC;
uniform float uIslandR;
${HASH}
${GERSTNER_Y}
void main(){
  vec4 pos = texture2D(uPos, vUv);
  float seed = texture2D(uVel, vUv).w;
  float life = pos.w - uDt;

  if(life <= 0.0){
    vec3 r = hash33(vec3(seed * 1543.0, uSpawnTick, 5.5));
    vec3 r2 = hash33(vec3(2.2, seed * 887.0, uSpawnTick * 1.31));
    vec2 xz;
    if(r.x < 0.42 && uBoatSpeed > 0.4){
      // boat wake trail (V widening behind the stern)
      float back = r2.x * (6.0 + uBoatSpeed * 2.2);
      float side = (r2.y - 0.5) * (1.6 + back * 0.38);
      vec2 sdir = vec2(-uBoatDirXZ.y, uBoatDirXZ.x);
      xz = uBoatPosXZ - uBoatDirXZ * back + sdir * side;
    } else if(r.x < 0.72){
      // shoreline ring around the island (+ jitter so it hugs the beach)
      float ang = r2.x * 6.2831853;
      float rad = uIslandR * (0.80 + r2.y * 0.38);
      xz = uIslandC + vec2(cos(ang) * rad, sin(ang) * rad * 0.78);
    } else {
      // anywhere - visibility is gated by the foam grid in the render pass
      xz = (r2.xy - 0.5) * uWorld * 0.92;
    }
    float surf = texture2D(uSim, worldToUvXZ(xz)).r + gerstnerY(xz, uTimeP);
    float newLife = 3.0 + r2.z * 8.0;
    gl_FragColor = vec4(xz.x, surf + 0.06, xz.y, newLife);
    return;
  }

  vec2 uv = worldToUvXZ(pos.xz);
  vec4 sim = texture2D(uSim, uv);
  vec2 vel = sim.gb * 0.75 + uWindXZ * 0.22;
  // lazy curl drift from the noise grid so flecks meander like real scum lines
  vec2 ng = texture2D(uNoiseP, pos.xz * 0.01 + vec2(uTimeP * 0.004, 0.0)).rg * 2.0 - 1.0;
  vel += vec2(-ng.y, ng.x) * 0.35;
  vec2 xz = pos.xz + vel * uDt;
  float surf = texture2D(uSim, worldToUvXZ(xz)).r + gerstnerY(xz, uTimeP);
  float bob = sin(uTimeP * (1.5 + seed * 2.0) + seed * 40.0) * 0.03;
  float terrain = texture2D(uTerrainP, worldToUvXZ(xz)).r;
  if(surf - terrain < -0.25) life = min(life, 0.35);            // beached -> die off
  if(terrain > 0.12 && surf - terrain < 0.10) life = min(life, 0.20); // on land (SWE wet cells ride terrain)
  if(abs(xz.x) > uWorld * 0.49 || abs(xz.y) > uWorld * 0.49) life = 0.0;
  gl_FragColor = vec4(xz.x, surf + 0.06 + bob, xz.y, life);
}
`;

const RENDER_VERT = /* glsl */ `
uniform sampler2D uPos;
uniform sampler2D uFoamTex;
uniform sampler2D uSim;
uniform float uSize;
uniform float uHeightScale;   // drawingbuffer height / 2 / tan(fov/2) ish
uniform float uWorld;
uniform float uKind;          // 0 splash, 1 foam3d
uniform float uTimeP;
varying float vFade;
varying float vSeed;
varying float vFoam;
void main(){
  vec2 ref = position.xy;                       // texel centre uv
  float seed = position.z;
  vec4 P = texture2D(uPos, ref);
  vSeed = seed;
  float life = P.w;
  vFoam = 1.0;
  if(uKind > 0.5){
    vec2 wuv = vec2(P.x / uWorld + 0.5, 0.5 - P.z / uWorld);
    vec2 fg = texture2D(uFoamTex, wuv).rg;
    vFoam = clamp((fg.r + fg.g) * 1.5, 0.0, 1.0);
  }
  // fade in/out over life
  float age = (uKind > 0.5) ? clamp(life, 0.0, 1.0) : clamp(life * 2.2, 0.0, 1.0);
  vFade = (life <= 0.0) ? 0.0 : age;
  if(uKind > 0.5 && vFoam < 0.10) vFade = 0.0;

  vec4 mv = viewMatrix * vec4(P.xyz, 1.0);
  float sizeW = uSize * (0.6 + seed * 0.8) * (uKind > 0.5 ? (0.55 + vFoam * 0.6) : 1.0);
  gl_PointSize = (vFade <= 0.0) ? 0.0 : clamp(sizeW * uHeightScale / max(-mv.z, 0.1), 0.0, 32.0);
  gl_Position = projectionMatrix * mv;
  if(vFade <= 0.0) gl_Position = vec4(0.0, 0.0, -10.0, 1.0);
}
`;

const SPLASH_RENDER_FRAG = /* glsl */ `
precision highp float;
varying float vFade;
varying float vSeed;
varying float vFoam;
uniform vec3 uSunColorP;
uniform float uNightP;
void main(){
  vec2 pc = gl_PointCoord - 0.5;
  float d = length(pc);
  float a = smoothstep(0.5, 0.12, d) * vFade * 0.62;
  if(a < 0.004) discard;
  // fake spherical droplet shading: bright top-left, blue-grey belly
  float shade = clamp(0.75 - pc.y * 0.9 + pc.x * 0.25, 0.35, 1.25);
  vec3 col = mix(vec3(0.75, 0.85, 0.92), vec3(1.05), shade * 0.6) * (0.55 + uSunColorP.g * 0.5);
  col = mix(col, col * vec3(0.4, 0.45, 0.6), uNightP * 0.65);
  gl_FragColor = vec4(col, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

const FOAM_RENDER_FRAG = /* glsl */ `
precision highp float;
varying float vFade;
varying float vSeed;
varying float vFoam;
uniform sampler2D uNoiseP;
uniform vec3 uSunColorP;
uniform float uNightP;
void main(){
  vec2 pc = gl_PointCoord - 0.5;
  float d = length(pc * vec2(1.0, 1.25)) * 2.0;      // 0 centre -> 1 at edge midpoint
  float n = texture2D(uNoiseP, gl_PointCoord * 0.8 + vSeed * 7.31).b;
  float n2 = texture2D(uNoiseP, gl_PointCoord * 2.2 - vSeed * 3.17).a;
  float blotch = smoothstep(1.0, 0.30, d + (n - 0.5) * 0.45);
  float a = blotch * (0.30 + n2 * 0.70) * vFade * vFoam * 0.62;
  if(a < 0.004) discard;
  vec3 col = vec3(0.93, 0.96, 0.97) * (0.55 + uSunColorP.g * 0.5) * (0.8 + n * 0.35);
  col = mix(col, col * vec3(0.35, 0.4, 0.55), uNightP * 0.7);
  gl_FragColor = vec4(col, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export class GPUParticles {
  constructor(renderer, { noiseTex, terrainTex }) {
    this.renderer = renderer;
    this.noiseTex = noiseTex;
    this.terrainTex = terrainTex;
    this.spawnTick = 0;
    this.burstSlot = 2;
    this.bursts = Array.from({ length: 6 }, () => ({ x: 0, z: 0, strength: 0, radius: 1 }));
    this.boat = { x: 0, z: 0, dirX: 0, dirZ: 1, speed: 0, velX: 0, velZ: 0, bowX: 0, bowZ: 0, bowSpray: 0 };

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null);
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);

    const worldU = { value: WORLD };
    this.worldU = worldU;
    const waveUniforms = {
      ...gerstnerUniforms,
      uWaveAmpP: { value: 0.55 },
      uWavesOnP: { value: 1 },
      uModeP: { value: 0 },
    };
    this.waveUniforms = waveUniforms;
    const emitters = { value: Array.from({ length: 6 }, () => new THREE.Vector4(0, 0, 0, 1)) };
    this.emitterUniform = emitters;
    const spawnShared = {
      uEmitters: emitters,
      uEmitterTotal: { value: 0 },
      uSpawnTick: { value: 0 },
      uSpawnRate: { value: 0.55 },
    };
    this.spawnShared = spawnShared;

    const mat = (frag, extra) => new THREE.ShaderMaterial({
      vertexShader: FS_VERT, fragmentShader: frag,
      uniforms: { uWorld: worldU, ...extra },
      depthTest: false, depthWrite: false,
    });

    this.initPosMat = mat(INIT_POS_FRAG, {});
    this.initVelMat = mat(INIT_VEL_FRAG, {});
    this.splashVelMat = mat(SPLASH_VEL_FRAG, {
      uPos: { value: null }, uVel: { value: null }, uDt: { value: 1 / 60 },
      uBoatVelXZ: { value: new THREE.Vector2() }, ...spawnShared,
    });
    this.splashPosMat = mat(SPLASH_POS_FRAG, {
      uPos: { value: null }, uVel: { value: null }, uSim: { value: null },
      uDt: { value: 1 / 60 }, uTimeP: { value: 0 }, ...waveUniforms, ...spawnShared,
    });
    this.foamPosMat = mat(FOAM_POS_FRAG, {
      uPos: { value: null }, uVel: { value: null }, uSim: { value: null },
      uFoamTex: { value: null }, uTerrainP: { value: terrainTex }, uNoiseP: { value: noiseTex },
      uDt: { value: 1 / 60 }, uTimeP: { value: 0 }, uSpawnTick: spawnShared.uSpawnTick,
      uBoatPosXZ: { value: new THREE.Vector2() }, uBoatDirXZ: { value: new THREE.Vector2(0, 1) },
      uBoatSpeed: { value: 0 }, uWindXZ: { value: new THREE.Vector2(1, 0) },
      uIslandC: { value: ISLAND_CENTER.clone() }, uIslandR: { value: ISLAND_RADIUS },
      ...waveUniforms,
    });

    // targets
    this.splashPosA = makeRT(); this.splashPosB = makeRT();
    this.splashVelA = makeRT(); this.splashVelB = makeRT();
    this.foamPosA = makeRT(); this.foamPosB = makeRT();
    this.seedRT = makeRT();

    this.pass(this.initVelMat, this.seedRT);
    for (const rt of [this.splashPosA, this.splashPosB, this.foamPosA, this.foamPosB]) this.pass(this.initPosMat, rt);
    for (const rt of [this.splashVelA, this.splashVelB]) this.pass(this.initVelMat, rt);

    // render points
    const geo = this.buildGeometry();
    const renderMat = (frag, kind) => new THREE.ShaderMaterial({
      vertexShader: RENDER_VERT, fragmentShader: frag,
      uniforms: {
        uPos: { value: null }, uFoamTex: { value: null }, uSim: { value: null },
        uSize: { value: kind === 0 ? 0.16 : 0.85 },
        uHeightScale: { value: 600 },
        uWorld: worldU, uKind: { value: kind }, uTimeP: { value: 0 },
        uNoiseP: { value: noiseTex },
        uSunColorP: { value: new THREE.Color(1, 0.95, 0.85) },
        uNightP: { value: 0 },
      },
      transparent: true, depthWrite: false, depthTest: true,
    });
    this.splashMat = renderMat(SPLASH_RENDER_FRAG, 0);
    this.foamMat = renderMat(FOAM_RENDER_FRAG, 1);
    this.splashPoints = new THREE.Points(geo, this.splashMat);
    this.foamPoints = new THREE.Points(geo.clone(), this.foamMat);
    this.splashPoints.frustumCulled = false;
    this.foamPoints.frustumCulled = false;
    this.splashPoints.renderOrder = 12;
    this.foamPoints.renderOrder = 11;
    this.setCounts(MAX_PARTICLES, MAX_PARTICLES);
  }

  buildGeometry() {
    const pos = new Float32Array(MAX_PARTICLES * 3);
    let p = 0;
    for (let j = 0; j < TEX; j++) {
      for (let i = 0; i < TEX; i++) {
        pos[p++] = (i + 0.5) / TEX;
        pos[p++] = (j + 0.5) / TEX;
        pos[p++] = Math.random();
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return g;
  }

  pass(material, target) {
    this.quad.material = material;
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(null);
  }

  addTo(scene) { scene.add(this.splashPoints, this.foamPoints); }

  setCounts(splash, foam) {
    this.splashPoints.geometry.setDrawRange(0, Math.min(splash, MAX_PARTICLES));
    this.foamPoints.geometry.setDrawRange(0, Math.min(foam, MAX_PARTICLES));
  }

  setBoat({ x, z, dirX, dirZ, speed, velX, velZ, bowX, bowZ, bowSpray }) {
    Object.assign(this.boat, { x, z, dirX, dirZ, speed, velX, velZ, bowX, bowZ, bowSpray });
  }

  /** One-shot splash burst at a world position (click, boulder, rock). */
  burst(x, z, strength, radius = 1.2) {
    const b = this.bursts[this.burstSlot];
    b.x = x; b.z = z; b.strength = strength; b.radius = radius;
    this.burstSlot = 2 + ((this.burstSlot - 1) % 4); // cycle 2..5
  }

  /**
   * opts: { simTex, foamTex, time, windVector, waveAmp, wavesOn, mode,
   *         splashOn, foamOn, spawnRate, sunColor, night }
   */
  update(dt, o) {
    this.spawnTick += 1;
    this.spawnShared.uSpawnTick.value = this.spawnTick % 100000;
    this.spawnShared.uSpawnRate.value = o.spawnRate;
    this.waveUniforms.uWaveAmpP.value = o.waveAmp;
    this.waveUniforms.uWavesOnP.value = o.wavesOn ? 1 : 0;
    this.waveUniforms.uModeP.value = o.mode;
    const cdt = Math.min(dt, 1 / 30);

    // emitters 0/1 = boat stern + bow spray, 2..5 = decaying bursts
    const B = this.boat;
    this.bursts[0] = { x: B.x - B.dirX * 3.4, z: B.z - B.dirZ * 3.4, strength: Math.min(Math.abs(B.speed) * 0.14, 1.5), radius: 1.5 };
    this.bursts[1] = { x: B.bowX, z: B.bowZ, strength: B.bowSpray, radius: 1.1 };
    for (let i = 2; i < 6; i++) this.bursts[i].strength *= Math.exp(-dt * 4.5);
    let total = 0;
    for (let i = 0; i < 6; i++) {
      const b = this.bursts[i];
      this.emitterUniform.value[i].set(b.x, b.z, Math.max(b.strength, 0), b.radius);
      total += Math.max(b.strength, 0);
    }
    this.spawnShared.uEmitterTotal.value = total;

    // --- splash system ---
    this.splashPoints.visible = o.splashOn;
    if (o.splashOn) {
      const vm = this.splashVelMat.uniforms;
      vm.uPos.value = this.splashPosA.texture;
      vm.uVel.value = this.splashVelA.texture;
      vm.uDt.value = cdt;
      vm.uBoatVelXZ.value.set(B.velX, B.velZ);
      this.pass(this.splashVelMat, this.splashVelB);

      const pm = this.splashPosMat.uniforms;
      pm.uPos.value = this.splashPosA.texture;
      pm.uVel.value = this.splashVelB.texture;
      pm.uSim.value = o.simTex;
      pm.uDt.value = cdt;
      pm.uTimeP.value = o.time;
      this.pass(this.splashPosMat, this.splashPosB);

      [this.splashPosA, this.splashPosB] = [this.splashPosB, this.splashPosA];
      [this.splashVelA, this.splashVelB] = [this.splashVelB, this.splashVelA];
    }

    // --- foam3d system ---
    this.foamPoints.visible = o.foamOn;
    if (o.foamOn) {
      const fm = this.foamPosMat.uniforms;
      fm.uPos.value = this.foamPosA.texture;
      fm.uVel.value = this.seedRT.texture;
      fm.uSim.value = o.simTex;
      fm.uFoamTex.value = o.foamTex;
      fm.uDt.value = cdt;
      fm.uTimeP.value = o.time;
      fm.uBoatPosXZ.value.set(B.x, B.z);
      fm.uBoatDirXZ.value.set(B.dirX, B.dirZ);
      fm.uBoatSpeed.value = Math.abs(B.speed);
      fm.uWindXZ.value.copy(o.windVector);
      this.pass(this.foamPosMat, this.foamPosB);
      [this.foamPosA, this.foamPosB] = [this.foamPosB, this.foamPosA];
    }

    // --- render uniforms ---
    for (const [mat, tex] of [[this.splashMat, this.splashPosA.texture], [this.foamMat, this.foamPosA.texture]]) {
      mat.uniforms.uPos.value = tex;
      mat.uniforms.uFoamTex.value = o.foamTex;
      mat.uniforms.uSim.value = o.simTex;
      mat.uniforms.uTimeP.value = o.time;
      mat.uniforms.uSunColorP.value.copy(o.sunColor);
      mat.uniforms.uNightP.value = o.night;
    }
  }

  setViewport(heightPx, fovDeg) {
    const s = heightPx / (2 * Math.tan(THREE.MathUtils.degToRad(fovDeg) / 2));
    this.splashMat.uniforms.uHeightScale.value = s;
    this.foamMat.uniforms.uHeightScale.value = s;
  }

  setSizes(splashSize, foamSize) {
    this.splashMat.uniforms.uSize.value = splashSize;
    this.foamMat.uniforms.uSize.value = foamSize;
  }
}

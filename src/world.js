// ---------------------------------------------------------------------------
// World: island terrain (with underwater caustics), sky dome + far ocean,
// the water surface mesh, props (trees, rocks, lighthouse, dock, buoys),
// lights and environment presets. The water/sky/far-ocean all sample the
// SAME analytic sky function, so reflections always match the sky you see.
// ---------------------------------------------------------------------------
import * as THREE from 'three';
import {
  WORLD, terrainHeight, makeTerrainTexture, makeNoiseTexture,
  ISLAND_CENTER, gerstnerUniforms, fbm,
} from './config.js';
import { WATER_VERT, WATER_FRAG, SKY_VERT, SKY_FRAG, FAR_FRAG, WORLD_VERT } from './shaders.js';

export const ENV_PRESETS = {
  midday: {
    label: 'Midday', elev: 52, azim: 135,
    zenith: 0x2a6db4, horizon: 0xc4e6f4, sunColor: 0xfff1d6, sunI: 3.0,
    hemiSky: 0xbfe3ff, hemiGround: 0x4a6a55, hemiI: 0.85,
    fog: 0xcfe8f2, fogNear: 115, fogFar: 620,
    deep: 0x073d5e, shallow: 0x35b8bd, sss: 0x2fd39a,
    night: 0, cloud: 0.38, exposure: 1.05,
  },
  golden: {
    label: 'Golden hour', elev: 16, azim: 112,
    zenith: 0x3a5f9e, horizon: 0xffc98a, sunColor: 0xffb36b, sunI: 2.6,
    hemiSky: 0xffd9b0, hemiGround: 0x44503e, hemiI: 0.6,
    fog: 0xf2cda4, fogNear: 105, fogFar: 600,
    deep: 0x0a3a56, shallow: 0x2fa8a6, sss: 0x3fd68f,
    night: 0, cloud: 0.32, exposure: 1.1,
  },
  dusk: {
    label: 'Dusk', elev: 4.5, azim: 100,
    zenith: 0x27356e, horizon: 0xf28a5e, sunColor: 0xff7a45, sunI: 1.9,
    hemiSky: 0x8a7ab8, hemiGround: 0x2c3440, hemiI: 0.42,
    fog: 0xd99a7e, fogNear: 95, fogFar: 540,
    deep: 0x0a2f4c, shallow: 0x25808e, sss: 0x2aa87f,
    night: 0.25, cloud: 0.3, exposure: 1.08,
  },
  storm: {
    label: 'Storm', elev: 28, azim: 60,
    zenith: 0x54626e, horizon: 0x9fb0ba, sunColor: 0xc7d2d9, sunI: 1.15,
    hemiSky: 0xaebfc9, hemiGround: 0x3c4642, hemiI: 0.75,
    fog: 0xa7b6c0, fogNear: 70, fogFar: 430,
    deep: 0x0b3547, shallow: 0x2e7f8c, sss: 0x2a9d84,
    night: 0, cloud: 0.85, exposure: 0.98,
  },
  moonlit: {
    label: 'Moonlit', elev: 34, azim: 200,
    zenith: 0x060d24, horizon: 0x16283f, sunColor: 0xaac4ff, sunI: 0.85,
    hemiSky: 0x33507e, hemiGround: 0x0c1420, hemiI: 0.35,
    fog: 0x101f33, fogNear: 90, fogFar: 520,
    deep: 0x04182c, shallow: 0x11506a, sss: 0x0f6a72,
    night: 1, cloud: 0.22, exposure: 1.15,
  },
};

export function buildWorld(scene) {
  const terrainTex = makeTerrainTexture(256);
  const noiseTex = makeNoiseTexture(256);

  // ---- shared environment uniforms (one object, many materials) ----
  const env = {
    uSunDir: { value: new THREE.Vector3(0.5, 0.8, 0.3).normalize() },
    uSkyZenith: { value: new THREE.Color(0x2a6db4) },
    uSkyHorizon: { value: new THREE.Color(0xc4e6f4) },
    uSunColor: { value: new THREE.Color(0xfff1d6) },
    uNight: { value: 0 },
    uTimeSky: { value: 0 },
    uFogColor: { value: new THREE.Color(0xcfe8f2) },
    uFogNear: { value: 115 },
    uFogFar: { value: 660 },
    current: ENV_PRESETS.midday,
    name: 'midday',
  };

  scene.fog = new THREE.Fog(0xcfe8f2, 115, 620);

  // ---- lights ----
  const sun = new THREE.DirectionalLight(0xfff1d6, 3.0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -105; sun.shadow.camera.right = 105;
  sun.shadow.camera.top = 105; sun.shadow.camera.bottom = -105;
  sun.shadow.camera.near = 20; sun.shadow.camera.far = 420;
  sun.shadow.bias = -0.0006;
  sun.target.position.set(-10, 0, -5);
  scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight(0xbfe3ff, 0x4a6a55, 0.85);
  scene.add(hemi);

  // ---- sky dome + far ocean ----
  const skyMat = new THREE.ShaderMaterial({
    vertexShader: SKY_VERT, fragmentShader: SKY_FRAG,
    uniforms: {
      uSunDir: env.uSunDir, uSkyZenith: env.uSkyZenith, uSkyHorizon: env.uSkyHorizon,
      uSunColor: env.uSunColor, uNight: env.uNight, uTimeSky: env.uTimeSky,
      uNoise: { value: noiseTex }, uCloudiness: { value: 0.38 },
    },
    side: THREE.BackSide, depthWrite: false,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 40, 20), skyMat);
  sky.frustumCulled = false;
  scene.add(sky);

  const farMat = new THREE.ShaderMaterial({
    vertexShader: WORLD_VERT, fragmentShader: FAR_FRAG,
    uniforms: {
      uSunDir: env.uSunDir, uSkyZenith: env.uSkyZenith, uSkyHorizon: env.uSkyHorizon,
      uSunColor: env.uSunColor, uNight: env.uNight, uTimeSky: env.uTimeSky,
      uFogColor: env.uFogColor, uFogNear: env.uFogNear, uFogFar: env.uFogFar,
      uTime: { value: 0 }, uNoise: { value: noiseTex },
      uWorldHalf: { value: WORLD / 2 - 2 },
      uDeepColor: { value: new THREE.Color(0x073d5e) },
    },
  });
  const far = new THREE.Mesh(new THREE.CircleGeometry(880, 48), farMat);
  far.rotation.x = -Math.PI / 2;
  far.position.y = -0.22;
  scene.add(far);

  // ---- terrain ----
  const SEG = 220;
  const tGeo = new THREE.PlaneGeometry(WORLD, WORLD, SEG, SEG);
  tGeo.rotateX(-Math.PI / 2);
  {
    const pos = tGeo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const cSand = new THREE.Color(0xd9c08a), cSandWet = new THREE.Color(0xa68d5f);
    const cGrass = new THREE.Color(0x5d8f4e), cGrass2 = new THREE.Color(0x3e6b3a);
    const cRock = new THREE.Color(0x7b7f85), cDeep = new THREE.Color(0x6f6a4e);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const h = terrainHeight(x, z);
      pos.setY(i, h);
    }
    tGeo.computeVertexNormals();
    const nrm = tGeo.attributes.normal;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), h = pos.getY(i);
      const slope = 1 - nrm.getY(i);
      const n = fbm(x * 0.08 + 4, z * 0.08, 3);
      if (h < -1.2) c.copy(cDeep).lerp(cSand, THREE.MathUtils.clamp((h + 6) / 5, 0, 1) * 0.5);
      else if (h < 0.35) c.copy(cSandWet).lerp(cSand, (h + 1.2) / 1.55);
      else if (h < 1.1) c.copy(cSand).lerp(cGrass, THREE.MathUtils.smoothstep(h, 0.5, 1.1) * (0.5 + n * 0.5));
      else c.copy(cGrass).lerp(cGrass2, n);
      if (slope > 0.16 || h > 8.5) c.lerp(cRock, THREE.MathUtils.clamp((slope - 0.1) * 3.2 + (h - 8.5) * 0.12, 0, 0.9));
      if (Math.abs(h) < 0.28) c.multiplyScalar(0.78);            // wet band
      const v = 0.92 + n * 0.16;
      colors[i * 3] = c.r * v; colors[i * 3 + 1] = c.g * v; colors[i * 3 + 2] = c.b * v;
    }
    tGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  }
  const causticUniforms = {
    uTimeC: { value: 0 },
    uCausticsOn: { value: 1 },
    uNoiseC: { value: noiseTex },
    uSunTintC: { value: new THREE.Color(0xfff1d6) },
  };
  const terrainMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96, metalness: 0.0 });
  terrainMat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, causticUniforms);
    shader.vertexShader = 'varying vec3 vWorldPosC;\n' + shader.vertexShader.replace(
      '#include <worldpos_vertex>',
      '#include <worldpos_vertex>\n vWorldPosC = (modelMatrix * vec4(transformed, 1.0)).xyz;',
    );
    shader.fragmentShader = ('varying vec3 vWorldPosC;\nuniform float uTimeC;\nuniform float uCausticsOn;\nuniform sampler2D uNoiseC;\nuniform vec3 uSunTintC;\n'
      + shader.fragmentShader).replace(
      '#include <color_fragment>',
      `#include <color_fragment>
      if(uCausticsOn > 0.5 && vWorldPosC.y < 0.35){
        vec2 cuv = vWorldPosC.xz * 0.055;
        float n1 = texture2D(uNoiseC, cuv + vec2(uTimeC * 0.021, uTimeC * 0.013)).b;
        float n2 = texture2D(uNoiseC, cuv * 1.7 - vec2(uTimeC * 0.017, -uTimeC * 0.011)).b;
        float n3 = texture2D(uNoiseC, cuv * 0.6 + vec2(-uTimeC * 0.009, uTimeC * 0.019) + n1 * 0.08).b;
        float ca = pow(clamp(n1 * n2 * 2.6, 0.0, 1.0), 2.4) + pow(clamp(n3 * n1 * 2.2, 0.0, 1.0), 3.0) * 0.7;
        float fade = exp(vWorldPosC.y * 0.55) * smoothstep(0.35, -0.15, vWorldPosC.y);
        diffuseColor.rgb += uSunTintC * ca * fade * 0.55;
      }`,
    );
  };
  const terrain = new THREE.Mesh(tGeo, terrainMat);
  terrain.receiveShadow = true;
  scene.add(terrain);

  // ---- water surface ----
  const waterUniforms = {
    uSim: { value: null },
    uFoamTex: { value: null },
    uNoise: { value: noiseTex },
    uTerrain: { value: terrainTex },
    uTexel: { value: 1 / 256 },
    uTexelW: { value: WORLD / 256 },
    uTime: { value: 0 },
    uTimeSky: env.uTimeSky,
    uWorld: { value: WORLD },
    uSimBlend: { value: 1 },
    uMode: { value: 0 },
    uWavesOn: { value: 1 },
    uWaveAmp: { value: 0.55 },
    uChop: { value: 0.65 },
    ...gerstnerUniforms,
    uSunDir: env.uSunDir, uSkyZenith: env.uSkyZenith, uSkyHorizon: env.uSkyHorizon,
    uSunColor: env.uSunColor, uNight: env.uNight,
    uFogColor: env.uFogColor, uFogNear: env.uFogNear, uFogFar: env.uFogFar,
    uDeepColor: { value: new THREE.Color(0x073d5e) },
    uShallowColor: { value: new THREE.Color(0x35b8bd) },
    uSSSColor: { value: new THREE.Color(0x2fd39a) },
    uClarity: { value: 0.55 },
    uFoamGridOn: { value: 1 },
    uFoamAmount: { value: 1 },
    uDetailStrength: { value: 0.55 },
    uWindXZ: { value: new THREE.Vector2(1, 0) },
    uDebug: { value: 0 },
  };
  const waterMat = new THREE.ShaderMaterial({
    vertexShader: WATER_VERT, fragmentShader: WATER_FRAG,
    uniforms: waterUniforms,
    transparent: true, depthWrite: false,
  });
  const waterGeo = new THREE.PlaneGeometry(WORLD, WORLD, 320, 320);
  waterGeo.rotateX(-Math.PI / 2);
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.renderOrder = 4;
  water.frustumCulled = false;
  scene.add(water);

  // ---- props ----
  const shoreRocks = [];
  {
    // trees (instanced)
    const trunkGeo = new THREE.CylinderGeometry(0.14, 0.24, 2.2, 6);
    const folGeo = new THREE.IcosahedronGeometry(1.5, 0);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 0.95 });
    const folMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, flatShading: true });
    const COUNT = 90;
    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, COUNT);
    const fols = new THREE.InstancedMesh(folGeo, folMat, COUNT * 2);
    trunks.castShadow = fols.castShadow = true;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), pv = new THREE.Vector3();
    const col = new THREE.Color();
    let placed = 0, folI = 0, guard = 0;
    while (placed < COUNT && guard++ < 4000) {
      const x = ISLAND_CENTER.x + (Math.random() - 0.5) * 105;
      const z = ISLAND_CENTER.y + (Math.random() - 0.5) * 85;
      const h = terrainHeight(x, z);
      if (h < 1.3 || h > 7.5) continue;
      const slope = Math.abs(terrainHeight(x + 1.5, z) - h) + Math.abs(terrainHeight(x, z + 1.5) - h);
      if (slope > 1.1) continue;
      const sc = 0.8 + Math.random() * 0.9;
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.random() * Math.PI * 2);
      m.compose(pv.set(x, h + 1.0 * sc, z), q, s.set(sc, sc, sc));
      trunks.setMatrixAt(placed, m);
      for (let k = 0; k < 2; k++) {
        const fs = sc * (k === 0 ? 1.15 : 0.8);
        m.compose(
          pv.set(x + (Math.random() - 0.5) * 0.9, h + (2.4 + k * 1.1) * sc, z + (Math.random() - 0.5) * 0.9),
          q, s.set(fs, fs * 0.85, fs),
        );
        fols.setMatrixAt(folI, m);
        fols.setColorAt(folI, col.setHSL(0.29 + Math.random() * 0.06, 0.45, 0.26 + Math.random() * 0.14));
        folI++;
      }
      placed++;
    }
    trunks.count = placed; fols.count = folI;
    scene.add(trunks, fols);

    // rocks (instanced) — shoreline ones become foam/splash emitters
    const rockGeo = new THREE.DodecahedronGeometry(1, 0);
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x82868c, roughness: 0.92, flatShading: true });
    const ROCKS = 46;
    const rocks = new THREE.InstancedMesh(rockGeo, rockMat, ROCKS);
    rocks.castShadow = true; rocks.receiveShadow = true;
    let rp = 0; guard = 0;
    while (rp < ROCKS && guard++ < 4000) {
      const ang = Math.random() * Math.PI * 2;
      const rad = 44 + Math.random() * 26;
      const x = ISLAND_CENTER.x + Math.cos(ang) * rad;
      const z = ISLAND_CENTER.y + Math.sin(ang) * rad * 0.78;
      const h = terrainHeight(x, z);
      if (h < -2.2 || h > 1.4) continue;
      const sc = 0.5 + Math.random() * 1.7;
      q.setFromEuler(new THREE.Euler(Math.random() * 3, Math.random() * 3, Math.random() * 3));
      m.compose(pv.set(x, h + sc * 0.35, z), q, s.set(sc, sc * 0.72, sc));
      rocks.setMatrixAt(rp, m);
      if (h > -1.3 && h < 0.3) shoreRocks.push({ x, z, phase: Math.random() * 10 });
      rp++;
    }
    rocks.count = rp;
    scene.add(rocks);
  }

  // lighthouse on the NW point
  const lighthouse = new THREE.Group();
  let lampLight, beamGroup;
  {
    const lx = -66, lz = -44;
    const ly = Math.max(terrainHeight(lx, lz), 0.4);
    const white = new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.6 });
    const red = new THREE.MeshStandardMaterial({ color: 0xc23b2e, roughness: 0.6 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x23272c, roughness: 0.5, metalness: 0.3 });
    for (let i = 0; i < 4; i++) {
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(1.15 - i * 0.14, 1.3 - i * 0.14, 2.1, 14), i % 2 ? red : white);
      seg.position.y = 1.05 + i * 2.1;
      seg.castShadow = true;
      lighthouse.add(seg);
    }
    const gallery = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.25, 14), dark);
    gallery.position.y = 8.6;
    lighthouse.add(gallery);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xffe9b0, emissive: 0xffd97a, emissiveIntensity: 0.4 }));
    lamp.position.y = 9.35;
    lighthouse.add(lamp);
    lighthouse.userData.lamp = lamp;
    const cap = new THREE.Mesh(new THREE.ConeGeometry(1.05, 1.1, 14), dark);
    cap.position.y = 10.3;
    lighthouse.add(cap);
    lampLight = new THREE.PointLight(0xffd97a, 0, 90, 1.6);
    lampLight.position.y = 9.35;
    lighthouse.add(lampLight);
    beamGroup = new THREE.Group();
    const beamMat = new THREE.MeshBasicMaterial({ color: 0xffe9b0, transparent: true, opacity: 0.10, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
    for (const sgn of [1, -1]) {
      const beam = new THREE.Mesh(new THREE.ConeGeometry(3.2, 42, 12, 1, true), beamMat);
      beam.rotation.z = sgn * Math.PI / 2;
      beam.position.x = sgn * 21;
      beamGroup.add(beam);
    }
    beamGroup.position.y = 9.35;
    beamGroup.visible = false;
    lighthouse.add(beamGroup);
    lighthouse.position.set(lx, ly - 0.2, lz);
    scene.add(lighthouse);
  }

  // wooden dock reaching from the E shore toward open water
  {
    const dirA = 0.5; // angle from island centre
    const dir = new THREE.Vector2(Math.cos(dirA), Math.sin(dirA));
    let shoreX = ISLAND_CENTER.x, shoreZ = ISLAND_CENTER.y;
    for (let d = 10; d < 80; d += 1) {
      const x = ISLAND_CENTER.x + dir.x * d, z = ISLAND_CENTER.y + dir.y * d;
      if (terrainHeight(x, z) < -0.4) { shoreX = x; shoreZ = z; break; }
    }
    const dock = new THREE.Group();
    const wood = new THREE.MeshStandardMaterial({ color: 0x8a6844, roughness: 0.9 });
    const woodD = new THREE.MeshStandardMaterial({ color: 0x64482c, roughness: 0.95 });
    const deckM = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.18, 13), wood);
    deckM.position.y = 0.9; deckM.castShadow = true; deckM.receiveShadow = true;
    dock.add(deckM);
    for (let i = 0; i < 6; i++) {
      for (const sgn of [-1, 1]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 2.6, 6), woodD);
        post.position.set(sgn * 1.05, 0, -5.8 + i * 2.3);
        dock.add(post);
      }
    }
    dock.position.set(shoreX + dir.x * 3.5, 0, shoreZ + dir.y * 3.5);
    dock.rotation.y = Math.atan2(dir.x, dir.y);
    scene.add(dock);
  }

  // buoys marking a little slalom course for the boat
  const buoys = [];
  {
    const positions = [[44, 8], [22, -18], [52, -38], [8, 44], [70, 26]];
    for (const [bx, bz] of positions) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 1.1, 10),
        new THREE.MeshStandardMaterial({ color: 0xe8542f, roughness: 0.55 }));
      body.castShadow = true;
      const top = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.7, 10),
        new THREE.MeshStandardMaterial({ color: 0xf2f0e9, roughness: 0.5 }));
      top.position.y = 0.9;
      const lightM = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xffcc55, emissive: 0xffaa22, emissiveIntensity: 1.6 }));
      lightM.position.y = 1.35;
      g.add(body, top, lightM);
      g.position.set(bx, 0, bz);
      scene.add(g);
      buoys.push({ group: g, x: bx, z: bz, phase: Math.random() * 10 });
    }
  }

  // ---- environment ----
  function setEnvironment(name) {
    const p = ENV_PRESETS[name] || ENV_PRESETS.midday;
    env.current = p; env.name = name;
    const el = THREE.MathUtils.degToRad(p.elev), az = THREE.MathUtils.degToRad(p.azim);
    env.uSunDir.value.set(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)).normalize();
    env.uSkyZenith.value.set(p.zenith);
    env.uSkyHorizon.value.set(p.horizon);
    env.uSunColor.value.set(p.sunColor);
    env.uNight.value = p.night;
    env.uFogColor.value.set(p.fog);
    env.uFogNear.value = p.fogNear;
    env.uFogFar.value = p.fogFar;
    scene.fog.color.set(p.fog); scene.fog.near = p.fogNear; scene.fog.far = p.fogFar;
    sun.color.set(p.sunColor); sun.intensity = p.sunI;
    sun.position.copy(env.uSunDir.value).multiplyScalar(190).add(new THREE.Vector3(-10, 0, -5));
    hemi.color.set(p.hemiSky); hemi.groundColor.set(p.hemiGround); hemi.intensity = p.hemiI;
    waterUniforms.uDeepColor.value.set(p.deep);
    waterUniforms.uShallowColor.value.set(p.shallow);
    waterUniforms.uSSSColor.value.set(p.sss);
    farMat.uniforms.uDeepColor.value.set(p.deep);
    skyMat.uniforms.uCloudiness.value = p.cloud;
    causticUniforms.uSunTintC.value.set(p.sunColor);
    const nightF = p.night;
    lampLight.intensity = nightF * 260;
    beamGroup.visible = nightF > 0.25;
    lighthouse.userData.lamp.material.emissiveIntensity = 0.4 + nightF * 3.4;
    return p;
  }

  function update(dt, t, sampleHeight) {
    env.uTimeSky.value = t;
    causticUniforms.uTimeC.value = t;
    farMat.uniforms.uTime.value = t;
    waterUniforms.uTime.value = t;
    if (beamGroup.visible) beamGroup.rotation.y = t * 0.45;
    if (sampleHeight) {
      for (const b of buoys) {
        const h = sampleHeight(b.x, b.z);
        const hx = sampleHeight(b.x + 1.2, b.z) - sampleHeight(b.x - 1.2, b.z);
        const hz = sampleHeight(b.x, b.z + 1.2) - sampleHeight(b.x, b.z - 1.2);
        b.group.position.y = h - 0.15;
        b.group.rotation.set(hz * 0.22, b.phase, -hx * 0.22);
      }
    }
  }

  return {
    terrainTex, noiseTex, env, waterUniforms, waterMat, skyMat,
    causticUniforms, setEnvironment, update, buoys, shoreRocks,
    terrainAt: terrainHeight,
  };
}

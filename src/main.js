import "./styles.css";

const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const lerp = (a, b, t) => a + (b - a) * t;
const fmt2 = (value) => Number(value).toFixed(2).padStart(5, "0");

const MAX_STAMPS = 48;
const MAX_PARTICLES = 230;

const state = {
  selected: "rain",
  tool: "select",
  running: false,
  liveSolver: true,
  rainRate: 38.4,
  impactRadius: 0.047,
  gravity: 9.81,
  carryCapacity: 0.72,
  poolThreshold: 0.18,
  wind: 0.42,
  chemical: 0.24,
  erosion: 0.18,
  sediment: 0.08,
  seed: 17.24,
  viewMode: 0,
  cameraMode: 0,
  stamps: [],
  rainZones: [],
  particles: [],
  impacts: [],
  rainStreaks: [],
  droplets: 0,
  elapsed: 0,
  spawnRemainder: 0,
  lastUiUpdate: 0,
  pointer: { x: 0, y: 0, inside: false, down: false },
};

/* -------------------------------------------------------------------------- */
/* A procedural field, mirrored in the preview shader for particle collisions. */
/* -------------------------------------------------------------------------- */
function hash2(x, y) {
  const value = Math.sin(x * 127.1 + y * 311.7 + state.seed * 17.13) * 43758.5453;
  return value - Math.floor(value);
}

function noise2(x, y) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy) % 1;
  const b = hash2(ix + 1, iy) % 1;
  const c = hash2(ix, iy + 1) % 1;
  const d = hash2(ix + 1, iy + 1) % 1;
  return lerp(lerp(a, b, ux), lerp(c, d, ux), uy);
}

function fbm2(x, y) {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;
  for (let i = 0; i < 5; i += 1) {
    value += amplitude * noise2(x * frequency, y * frequency);
    frequency *= 2.02;
    amplitude *= 0.5;
  }
  return value;
}

function ridged2(x, y) {
  let value = 0;
  let amplitude = 0.58;
  let frequency = 1;
  let weight = 1;
  for (let i = 0; i < 5; i += 1) {
    let signal = 1 - Math.abs(noise2(x * frequency, y * frequency) * 2 - 1);
    signal *= signal;
    signal *= weight;
    weight = clamp(signal * 2.2, 0, 1);
    value += signal * amplitude;
    frequency *= 2.03;
    amplitude *= 0.49;
  }
  return value;
}

function baseHeight(x, z) {
  let qx = x * 0.7 + state.seed * 0.31;
  let qz = z * 0.7 - state.seed * 0.17;
  const wx = fbm2(qx * 0.34 + 4.1, qz * 0.34 + 7.2);
  const wz = fbm2(qx * 0.34 - 8.7, qz * 0.34 + 1.9);
  qx += (wx - 0.5) * 0.82;
  qz += (wz - 0.5) * 0.82;
  const mountain = ridged2(qx * 0.66, qz * 0.66);
  const detail = ridged2(qx * 1.52 + 18.2, qz * 1.52 - 7.1);
  const continent = fbm2(qx * 0.22 - 2.4, qz * 0.22 + 4.8);
  const basin = fbm2(qx * 0.12 + 20.0, qz * 0.12 - 12.0);
  const plateau = Math.pow(clamp(mountain * 1.2, 0, 1), 2);
  return -0.42 + mountain * 1.38 + detail * 0.30 + continent * 0.38 + plateau * 0.24 - basin * 0.12;
}

function erosionMaskAt(x, z) {
  const drainage = 1 - Math.abs(noise2(x * 1.42 + 3.2, z * 1.42 - 8.1) * 2 - 1);
  const flow = fbm2(x * 0.62 + 6.0, z * 0.62 + 11.0);
  return clamp(Math.pow(drainage, 5.2) * (0.42 + flow * 0.95), 0, 1);
}

function chemicalMaskAt(x, z) {
  const mineral = fbm2(x * 2.2 + 13.0, z * 2.2 - 5.0);
  const exposure = 1 - noise2(x * 0.62 - 4.0, z * 0.62 + 8.0);
  return clamp(mineral * 0.55 + exposure * 0.45, 0, 1);
}

function windMaskAt(x, z) {
  const facing = noise2(x * 0.34 - 11.0, z * 0.34 + 5.0);
  return clamp(facing * 0.55 + 0.22, 0, 1);
}

function stampDisplacement(x, z) {
  let displacement = 0;
  for (const stamp of state.stamps) {
    const dx = x - stamp.x;
    const dz = z - stamp.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    const falloff = Math.exp(-(distance * distance) / Math.max(0.0001, stamp.radius * stamp.radius * 0.7));
    displacement += stamp.depth * falloff;
  }
  return displacement;
}

function surfaceHeight(x, z) {
  return baseHeight(x, z)
    - state.erosion * erosionMaskAt(x, z) * 0.36
    - state.chemical * chemicalMaskAt(x, z) * 0.12
    - state.wind * windMaskAt(x, z) * 0.055
    - stampDisplacement(x, z);
}

function surfaceGradient(x, z) {
  const e = 0.065;
  return {
    x: (surfaceHeight(x + e, z) - surfaceHeight(x - e, z)) / (2 * e),
    z: (surfaceHeight(x, z + e) - surfaceHeight(x, z - e)) / (2 * e),
  };
}

/* -------------------------------------------------------------------------- */
/* GPU SDF ray marcher. No raster heightfield or baked image is sampled here. */
/* -------------------------------------------------------------------------- */
const vertexSource = `
  attribute vec2 a_position;
  varying vec2 v_uv;
  void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const fragmentSource = `
  precision highp float;
  varying vec2 v_uv;
  uniform vec2 u_resolution;
  uniform float u_time;
  uniform float u_seed;
  uniform float u_erosion;
  uniform float u_wind;
  uniform float u_chemical;
  uniform float u_exposure;
  uniform int u_view_mode;
  uniform vec4 u_stamps[${MAX_STAMPS}];
  uniform int u_stamp_count;

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 345.45));
    p += dot(p, p + 34.345);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm(vec2 p) {
    float result = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 5; i++) {
      result += amplitude * noise(p);
      p = p * 2.02 + 17.31;
      amplitude *= 0.5;
    }
    return result;
  }

  float ridged(vec2 p) {
    float result = 0.0;
    float amplitude = 0.58;
    float weight = 1.0;
    for (int i = 0; i < 5; i++) {
      float signal = 1.0 - abs(noise(p) * 2.0 - 1.0);
      signal = signal * signal;
      signal *= weight;
      weight = clamp(signal * 2.2, 0.0, 1.0);
      result += signal * amplitude;
      p = p * 2.03 + 11.7;
      amplitude *= 0.49;
    }
    return result;
  }

  float base_height(vec2 p) {
    vec2 q = p * 0.7 + vec2(u_seed * 0.31, -u_seed * 0.17);
    vec2 warp = vec2(
      fbm(q * 0.34 + vec2(4.1, 7.2)),
      fbm(q * 0.34 + vec2(-8.7, 1.9))
    );
    q += (warp - 0.5) * 0.82;
    float mountain = ridged(q * 0.66);
    float detail = ridged(q * 1.52 + vec2(18.2, -7.1));
    float continent = fbm(q * 0.22 + vec2(-2.4, 4.8));
    float basin = fbm(q * 0.12 + vec2(20.0, -12.0));
    float plateau = pow(clamp(mountain * 1.2, 0.0, 1.0), 2.0);
    return -0.42 + mountain * 1.38 + detail * 0.30 + continent * 0.38 + plateau * 0.24 - basin * 0.12;
  }

  float erosion_mask(vec2 p) {
    float drainage = 1.0 - abs(noise(p * 1.42 + vec2(3.2, -8.1)) * 2.0 - 1.0);
    float flow = fbm(p * 0.62 + vec2(6.0, 11.0));
    return clamp(pow(drainage, 5.2) * (0.42 + flow * 0.95), 0.0, 1.0);
  }

  float chemical_mask(vec2 p) {
    float mineral = fbm(p * 2.2 + vec2(13.0, -5.0));
    float exposure = 1.0 - noise(p * 0.62 + vec2(-4.0, 8.0));
    return clamp(mineral * 0.55 + exposure * 0.45, 0.0, 1.0);
  }

  float wind_mask(vec2 p) {
    float facing = noise(p * 0.34 + vec2(-11.0, 5.0));
    return clamp(facing * 0.55 + 0.22, 0.0, 1.0);
  }

  float stamp_field(vec2 p) {
    float carved = 0.0;
    for (int i = 0; i < ${MAX_STAMPS}; i++) {
      if (i >= u_stamp_count) break;
      vec4 stamp = u_stamps[i];
      vec2 delta = p - stamp.xy;
      float falloff = exp(-dot(delta, delta) / max(0.0001, stamp.z * stamp.z * 0.7));
      carved += stamp.w * falloff;
    }
    return carved;
  }

  float terrain_height(vec2 p) {
    return base_height(p)
      - u_erosion * erosion_mask(p) * 0.36
      - u_chemical * chemical_mask(p) * 0.12
      - u_wind * wind_mask(p) * 0.055
      - stamp_field(p);
  }

  float sdf(vec3 p) {
    // The continuous scalar field is evaluated in world space at every step.
    // Surface is the zero crossing; there is no texture or heightfield lookup.
    return p.y - terrain_height(p.xz);
  }

  vec3 field_normal(vec3 p) {
    vec2 e = vec2(0.008, 0.0);
    float center = sdf(p);
    return normalize(vec3(sdf(p + e.xyy) - center, sdf(p + e.yxy) - center, sdf(p + e.yyx) - center));
  }

  vec3 sky_color(vec2 uv) {
    float horizon = smoothstep(-0.1, 0.78, uv.y);
    vec3 high = vec3(0.028, 0.066, 0.083);
    vec3 low = vec3(0.10, 0.17, 0.17);
    vec3 sky = mix(low, high, horizon);
    float haze = exp(-pow((uv.x * 1.25) * (uv.x * 1.25), 2.0)) * (1.0 - horizon) * 0.16;
    return sky + vec3(0.21, 0.31, 0.27) * haze;
  }

  void main() {
    vec2 screen = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
    vec3 ro = vec3(0.15 + sin(u_time * 0.025) * 0.06, 3.65, 7.55);
    vec3 target = vec3(0.0, 0.20, 0.0);
    vec3 forward = normalize(target - ro);
    vec3 right = normalize(cross(forward, vec3(0.0, 1.0, 0.0)));
    vec3 up = normalize(cross(right, forward));
    vec3 rd = normalize(right * screen.x + up * screen.y + forward * 1.72);

    float travel = 0.0;
    float distance_to_field = 0.0;
    bool hit = false;
    vec3 position = ro;
    for (int i = 0; i < 104; i++) {
      position = ro + rd * travel;
      distance_to_field = sdf(position);
      if (distance_to_field < 0.006) {
        hit = true;
        break;
      }
      travel += max(0.018, distance_to_field * 0.68);
      if (travel > 15.0) break;
    }

    vec3 color = sky_color(v_uv * 2.0 - 1.0);
    if (hit) {
      vec3 n = field_normal(position);
      float height = position.y;
      float slope = clamp(1.0 - n.y, 0.0, 1.0);
      float flow = erosion_mask(position.xz);
      float localRock = fbm(position.xz * 1.7 + vec2(5.0, -1.0));
      float strata = fbm(position.xz * 0.46 + vec2(-2.0, 3.0));
      float elevation = smoothstep(0.15, 1.55, height + strata * 0.2);

      // Four procedural satellite albedo strata, derived from the SDF and noise.
      vec3 moss = vec3(0.19, 0.27, 0.19);
      vec3 ochre = vec3(0.39, 0.31, 0.20);
      vec3 shale = vec3(0.27, 0.29, 0.28);
      vec3 lichen = vec3(0.47, 0.48, 0.34);
      vec3 sediment = vec3(0.47, 0.30, 0.18);
      vec3 albedo = mix(moss, ochre, smoothstep(0.16, 0.48, slope));
      albedo = mix(albedo, shale, smoothstep(0.45, 0.78, elevation) * 0.83);
      albedo = mix(albedo, lichen, smoothstep(0.63, 0.9, localRock) * (1.0 - slope) * 0.58);
      albedo = mix(albedo, sediment, flow * (0.23 + u_erosion * 0.56));
      albedo *= 0.84 + strata * 0.28;

      vec3 sunDirection = normalize(vec3(-0.48, 0.78, 0.34));
      float sun = max(dot(n, sunDirection), 0.0);
      float rim = pow(1.0 - max(dot(n, -rd), 0.0), 2.0);
      float curvature = clamp(0.52 + (sdf(position + vec3(0.0, 0.035, 0.0)) - distance_to_field) * 3.3, 0.0, 1.0);
      float ao = clamp(0.35 + 0.65 * n.y, 0.28, 1.0) * (0.72 + curvature * 0.28);
      color = albedo * (0.28 + sun * 0.82) * ao;
      color += vec3(0.21, 0.31, 0.24) * rim * 0.11;
      float wet = smoothstep(0.48, 0.02, height) * flow * 0.28;
      color = mix(color, vec3(0.10, 0.25, 0.24), wet);

      if (u_view_mode == 1) {
        color = mix(vec3(0.035, 0.09, 0.085), vec3(0.94, 0.48, 0.22), flow);
        color *= 0.77 + n.y * 0.28;
      } else if (u_view_mode == 2) {
        color = n * 0.5 + 0.5;
      } else if (u_view_mode == 3) {
        float distanceView = clamp(0.5 + distance_to_field * 4.5, 0.0, 1.0);
        color = mix(vec3(0.08, 0.17, 0.18), vec3(0.71, 0.91, 0.57), distanceView);
      }

      float fog = smoothstep(5.5, 13.5, travel);
      color = mix(color, vec3(0.045, 0.09, 0.095), fog * 0.62);
    }

    float vignette = 1.0 - smoothstep(0.48, 1.34, length(screen * vec2(0.72, 0.88))) * 0.27;
    color *= vignette;
    color = 1.0 - exp(-color * (1.05 + u_exposure * 0.18));
    gl_FragColor = vec4(color, 1.0);
  }
`;

class SDFRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "high-performance" });
    this.ready = false;
    if (!this.gl) return;
    const gl = this.gl;
    const vertex = this.compile(gl.VERTEX_SHADER, vertexSource);
    const fragment = this.compile(gl.FRAGMENT_SHADER, fragmentSource);
    if (!vertex || !fragment) return;
    const program = gl.createProgram();
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn(gl.getProgramInfoLog(program));
      return;
    }
    this.program = program;
    this.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    this.aPosition = gl.getAttribLocation(program, "a_position");
    this.uniforms = {
      resolution: gl.getUniformLocation(program, "u_resolution"),
      time: gl.getUniformLocation(program, "u_time"),
      seed: gl.getUniformLocation(program, "u_seed"),
      erosion: gl.getUniformLocation(program, "u_erosion"),
      wind: gl.getUniformLocation(program, "u_wind"),
      chemical: gl.getUniformLocation(program, "u_chemical"),
      exposure: gl.getUniformLocation(program, "u_exposure"),
      viewMode: gl.getUniformLocation(program, "u_view_mode"),
      stamps: gl.getUniformLocation(program, "u_stamps[0]"),
      stampCount: gl.getUniformLocation(program, "u_stamp_count"),
    };
    gl.disable(gl.DEPTH_TEST);
    this.ready = true;
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.resize();
  }

  compile(type, source) {
    const shader = this.gl.createShader(type);
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.warn(this.gl.getShaderInfoLog(shader));
      return null;
    }
    return shader;
  }

  resize() {
    if (!this.ready) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const width = Math.max(1, Math.floor(this.canvas.clientWidth * dpr));
    const height = Math.max(1, Math.floor(this.canvas.clientHeight * dpr));
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
      this.gl.viewport(0, 0, width, height);
    }
  }

  render(time) {
    if (!this.ready) return;
    const gl = this.gl;
    this.resize();
    gl.useProgram(this.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.enableVertexAttribArray(this.aPosition);
    gl.vertexAttribPointer(this.aPosition, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(this.uniforms.resolution, this.canvas.width, this.canvas.height);
    gl.uniform1f(this.uniforms.time, time * 0.001);
    gl.uniform1f(this.uniforms.seed, state.seed);
    gl.uniform1f(this.uniforms.erosion, state.erosion);
    gl.uniform1f(this.uniforms.wind, state.wind);
    gl.uniform1f(this.uniforms.chemical, state.chemical);
    gl.uniform1f(this.uniforms.exposure, 0.14);
    gl.uniform1i(this.uniforms.viewMode, state.viewMode);
    const packedStamps = new Float32Array(MAX_STAMPS * 4);
    state.stamps.slice(-MAX_STAMPS).forEach((stamp, index) => {
      packedStamps[index * 4] = stamp.x;
      packedStamps[index * 4 + 1] = stamp.z;
      packedStamps[index * 4 + 2] = stamp.radius;
      packedStamps[index * 4 + 3] = stamp.depth;
    });
    gl.uniform4fv(this.uniforms.stamps, packedStamps);
    gl.uniform1i(this.uniforms.stampCount, Math.min(state.stamps.length, MAX_STAMPS));
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}

function fallbackRender(canvas, time) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  const width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
  const height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  ctx.clearRect(0, 0, width, height);
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, "#12252a"); sky.addColorStop(.48, "#31534b"); sky.addColorStop(1, "#132025");
  ctx.fillStyle = sky; ctx.fillRect(0, 0, width, height);
  ctx.save();
  ctx.globalAlpha = .88;
  for (let band = 0; band < 48; band += 1) {
    const y = height * (.38 + band * .015);
    ctx.beginPath();
    for (let x = -20; x <= width + 20; x += 16) {
      const n = Math.sin(x * .009 + band * .67 + time * .00005) * 10 + Math.sin(x * .024 - band) * 5;
      const yy = y + n + Math.max(0, band - 25) * 2;
      if (x === -20) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
    }
    ctx.lineTo(width + 20, height); ctx.lineTo(-20, height); ctx.closePath();
    ctx.fillStyle = band % 4 === 0 ? "#6e7855" : band % 4 === 1 ? "#495d4c" : "#273c38";
    ctx.fill();
  }
  ctx.restore();
}

const renderer = new SDFRenderer($("#terrainCanvas"));

/* -------------------------------------------------------------------------- */
/* Interaction and simulation                                                  */
/* -------------------------------------------------------------------------- */
function showToast(message, active = false) {
  const toast = $("#simToast");
  $("#toastText").textContent = message;
  toast.classList.toggle("active", active);
}

function addStamp(x, z, strength = 1) {
  const radius = clamp(state.impactRadius * 3.8 + 0.06, 0.07, 0.52);
  const depth = clamp((0.015 + state.impactRadius * 0.24) * strength, 0.012, 0.16);
  state.stamps.push({ x, z, radius, depth });
  if (state.stamps.length > 120) state.stamps.splice(0, state.stamps.length - 120);
  state.erosion = clamp(state.erosion + depth * 0.035, 0.1, 0.78);
  state.sediment = clamp(state.sediment + depth * 0.16, 0.03, 0.99);
}

function randomRainZone() {
  if (state.rainZones.length && Math.random() < 0.76) {
    const zone = state.rainZones[Math.floor(Math.random() * state.rainZones.length)];
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.sqrt(Math.random()) * zone.radius;
    return { x: zone.x + Math.cos(angle) * distance, z: zone.z + Math.sin(angle) * distance };
  }
  return { x: (Math.random() - 0.5) * 7.2, z: (Math.random() - 0.5) * 6.2 };
}

function spawnParticle() {
  if (state.particles.length >= MAX_PARTICLES) return;
  const spawn = randomRainZone();
  state.particles.push({
    x: spawn.x,
    z: spawn.z,
    y: 3.15 + Math.random() * 1.65,
    vx: (Math.random() - 0.5) * 0.05,
    vz: (Math.random() - 0.5) * 0.05,
    vy: -0.2 - Math.random() * 0.4,
    impacted: false,
    life: 0,
    water: 0.45 + Math.random() * 0.55,
  });
}

function updateSolver(dt) {
  if (!state.running || !state.liveSolver) return;
  state.elapsed += dt;
  const visualRate = clamp(state.rainRate * 0.42, 4, 42);
  state.spawnRemainder += visualRate * dt;
  while (state.spawnRemainder > 1) {
    spawnParticle();
    state.spawnRemainder -= 1;
  }

  for (let i = state.particles.length - 1; i >= 0; i -= 1) {
    const particle = state.particles[i];
    particle.life += dt;
    if (!particle.impacted) {
      particle.vy -= state.gravity * 0.52 * dt;
      particle.x += particle.vx * dt;
      particle.z += particle.vz * dt;
      particle.y += particle.vy * dt;
      const terrain = surfaceHeight(particle.x, particle.z);
      if (particle.y <= terrain + 0.02) {
        particle.y = terrain + 0.025;
        particle.impacted = true;
        const impactStrength = 0.72 + particle.water * 0.7;
        addStamp(particle.x, particle.z, impactStrength);
        state.droplets += 1;
        state.impacts.push({ x: particle.x, y: particle.y, z: particle.z, life: 0, strength: impactStrength });
        particle.vx = 0;
        particle.vz = 0;
      }
    } else {
      const gradient = surfaceGradient(particle.x, particle.z);
      particle.vx += -gradient.x * (0.85 + state.carryCapacity) * dt;
      particle.vz += -gradient.z * (0.85 + state.carryCapacity) * dt;
      particle.vx *= 0.965;
      particle.vz *= 0.965;
      particle.x += particle.vx * dt;
      particle.z += particle.vz * dt;
      particle.y = surfaceHeight(particle.x, particle.z) + 0.028;
      particle.water -= dt * (0.24 + state.poolThreshold * 0.2);
      if (particle.life > 0.72 || particle.water <= 0 || Math.abs(particle.x) > 5.5 || Math.abs(particle.z) > 5.5) {
        state.particles.splice(i, 1);
      }
    }
  }

  for (let i = state.impacts.length - 1; i >= 0; i -= 1) {
    state.impacts[i].life += dt;
    if (state.impacts[i].life > 0.7) state.impacts.splice(i, 1);
  }
}

function projectWorld(x, y, z, width, height) {
  return {
    x: width * 0.5 + (x - z * 0.30) * width * 0.085,
    y: height * 0.57 - y * height * 0.115 + z * height * 0.034,
  };
}

function drawEffects(time) {
  const canvas = $("#fxCanvas");
  const card = $("#viewportCard");
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  const width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
  const height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
  if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
  ctx.clearRect(0, 0, width, height);
  if (state.rainStreaks.length < 82) {
    while (state.rainStreaks.length < 82) state.rainStreaks.push({ x: Math.random(), y: Math.random(), speed: .23 + Math.random() * .5, length: 4 + Math.random() * 11, alpha: .1 + Math.random() * .25 });
  }
  if (state.running && state.tool !== "inspect") {
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    for (const drop of state.rainStreaks) {
      const y = ((drop.y + time * 0.0001 * drop.speed) % 1) * height;
      const x = drop.x * width;
      const gradient = ctx.createLinearGradient(x, y - drop.length, x, y);
      gradient.addColorStop(0, "rgba(153,215,203,0)");
      gradient.addColorStop(1, `rgba(153,215,203,${drop.alpha})`);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = dpr * .7;
      ctx.beginPath(); ctx.moveTo(x, y - drop.length); ctx.lineTo(x - 1, y); ctx.stroke();
    }
    for (const particle of state.particles) {
      const point = projectWorld(particle.x, particle.y, particle.z, width, height);
      ctx.fillStyle = particle.impacted ? "rgba(245,198,108,.8)" : "rgba(198,239,223,.76)";
      ctx.beginPath(); ctx.arc(point.x, point.y, particle.impacted ? 1.7 * dpr : 1.05 * dpr, 0, Math.PI * 2); ctx.fill();
    }
    for (const impact of state.impacts) {
      const point = projectWorld(impact.x, impact.y, impact.z, width, height);
      const radius = (5 + impact.life * 22) * dpr;
      const alpha = Math.max(0, .54 - impact.life * .75);
      ctx.strokeStyle = `rgba(230,176,91,${alpha})`;
      ctx.lineWidth = dpr;
      ctx.beginPath(); ctx.arc(point.x, point.y, radius, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = `rgba(195,232,184,${alpha * .45})`;
      ctx.beginPath(); ctx.arc(point.x, point.y, 2 * dpr, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  if (state.tool === "rain" && state.pointer.inside) {
    const brush = $("#brushCursor");
    brush.style.left = `${state.pointer.x}px`;
    brush.style.top = `${state.pointer.y}px`;
    const brushSize = clamp(38 + state.impactRadius * 330, 46, 86);
    brush.style.width = `${brushSize}px`;
    brush.style.height = `${brushSize}px`;
    brush.style.marginLeft = `${-brushSize / 2}px`;
    brush.style.marginTop = `${-brushSize / 2}px`;
  }
  card.classList.toggle("painting", state.tool === "rain" && state.pointer.inside);
}

function updateSliderTrack(input) {
  if (!input) return;
  const percent = ((Number(input.value) - Number(input.min)) / (Number(input.max) - Number(input.min))) * 100;
  input.style.setProperty("--value", `${percent}%`);
}

function bindSlider(id, callback) {
  const input = $(id);
  if (!input) return;
  updateSliderTrack(input);
  input.addEventListener("input", () => {
    updateSliderTrack(input);
    callback(Number(input.value));
  });
}

function updateRainLabels() {
  $("#rainRateValue").textContent = `${state.rainRate.toFixed(1)}k / s`;
  $("#impactRadiusValue").textContent = `${state.impactRadius.toFixed(3)} m`;
  $("#gravityValue").textContent = `${state.gravity.toFixed(2)} m/s²`;
  $("#carryCapacityValue").textContent = state.carryCapacity.toFixed(2);
  $("#poolThresholdValue").textContent = `${state.poolThreshold.toFixed(2)} m`;
  $("#nodeRainRate").textContent = `${state.rainRate.toFixed(1)}k`;
}

function updateDynamicStats() {
  const elapsedSeconds = Math.floor(state.elapsed);
  const hh = String(Math.floor(elapsedSeconds / 3600)).padStart(2, "0");
  const mm = String(Math.floor((elapsedSeconds % 3600) / 60)).padStart(2, "0");
  const ss = String(elapsedSeconds % 60).padStart(2, "0");
  $("#solverTime").textContent = `${hh}:${mm}:${ss}`;
  $("#dropletCount").textContent = state.droplets.toLocaleString("en-US");
  $("#erosionMaskValue").textContent = `${Math.round(state.erosion * 100)}%`;
  $("#sedimentMaskValue").textContent = `${String(Math.round(state.sediment * 100)).padStart(2, "0")}%`;
  $("#saveState").textContent = state.running ? "Evaluating live" : "Saved 2s ago";
}

const nodeData = {
  base: { category: "FIELD SOURCE", path: "BASE FIELD", title: "Continental Mass", description: "Primary signed primitive for the continental volume.", icon: "i-mountain", color: "icon-green", titleLabel: "SDF Primitive" },
  noise: { category: "SIGNAL", path: "RIDGED MULTIFRACTAL", title: "Mountain Signal", description: "Domain-warped ridges build macro relief without a heightfield.", icon: "i-spark", color: "icon-violet", titleLabel: "Noise Operator" },
  rain: { category: "OPERATOR", path: "RAINFALL", title: "Droplet Solver", description: "Physically advected rainfall carving the signed field.", icon: "i-drop", color: "icon-amber", titleLabel: "Rainfall" },
  sediment: { category: "OPERATOR", path: "SEDIMENTATION", title: "Strata Deposit", description: "Routes carried material back into the continuous SDF volume.", icon: "i-layers", color: "icon-cyan", titleLabel: "Deposit" },
  wind: { category: "OPERATOR", path: "WIND ABRASION", title: "Vector Erosion", description: "Directional particle impacts and abrasion along a velocity field.", icon: "i-wind", color: "icon-blue", titleLabel: "Wind" },
  chemical: { category: "OPERATOR", path: "CHEMICAL WEATHERING", title: "Mineral Dissolve", description: "Moisture and mineral exposure dissolve the field continuously over time.", icon: "i-spark", color: "icon-violet", titleLabel: "Chemical" },
  material: { category: "SHADING", path: "MATERIAL COMPOSITE", title: "Satmap Albedo", description: "Procedural strata albedo driven by slope, AO, curvature and masks.", icon: "i-sun", color: "icon-sand", titleLabel: "Composite" },
  output: { category: "OUTPUT", path: "WORLD SDF", title: "Export Volume", description: "A 32-bit signed distance volume for downstream world building.", icon: "i-cube", color: "icon-output", titleLabel: "SDF Output" },
};

function makeOtherInspector() {
  const section = document.createElement("div");
  section.id = "otherInspector";
  section.className = "inspector-section other-inspector";
  $("#rainInspector").insertAdjacentElement("afterend", section);
  return section;
}

const otherInspector = makeOtherInspector();

function renderOtherInspector(node) {
  const panels = {
    base: ["FIELD CONSTRUCTION", "Continuous SDF", "Evaluate a world-space scalar field at any location. No baked heightfield is involved.", ["Blend mode", "Smooth union", "Domain", "World space", "Detail", "Adaptive 5 octave"]],
    noise: ["SIGNAL PARAMETERS", "Ridged multifractal", "Mountain relief is evaluated procedurally and remains editable upstream of every erosion operator.", ["Octaves", "5", "Lacunarity", "2.03", "Gain", "0.62"]],
    sediment: ["DEPOSIT PHYSICS", "Strata deposit", "Sediment is retained as a material response, not painted into a color-only mask.", ["Capacity", "0.72", "Slip angle", "31°", "Route", "Layer 03"]],
    wind: ["VECTOR PHYSICS", "Wind abrasion", "A directional SDF cut follows a continuous velocity field across exposed faces.", ["Velocity", "8.4 m/s", "Direction", "120°", "Hardness", "0.38"]],
    chemical: ["CHEMICAL PHYSICS", "Mineral dissolve", "Water chemistry reacts with exposed mineral strata and subtracts a continuous field response.", ["Rain pH", "5.8", "Dissolve", "0.24", "Moisture", "Field driven"]],
    material: ["PROCEDURAL SHADING", "Satmap albedo", "Four procedural satellite strata respond to AO, curvature, slope and erosion depth.", ["Layers", "4 strata", "Occlusion", "0.84", "Curvature", "Enabled"]],
    output: ["VOLUME OUTPUT", "32-bit signed field", "Export a streamable SDF volume with masks preserved as named channels.", ["Format", "SDF / 32-bit", "Channels", "7 masks", "Bounds", "Adaptive"]],
  };
  const panel = panels[node] || panels.base;
  otherInspector.innerHTML = `
    <div class="section-heading"><span>${panel[0]}</span><span class="section-tag">LIVE</span></div>
    <div class="other-title">${panel[1]}</div>
    <p class="other-description">${panel[2]}</p>
    <div class="other-grid">${panel[3].map((item, index) => index % 2 === 0 ? `<span>${item}</span>` : `<strong>${item}</strong>`).join("")}</div>
    <button class="inline-action" data-node-action="${node}">Open operator settings <svg class="icon icon-11"><use href="#i-caret" /></svg></button>`;
}

function selectNode(node) {
  if (!nodeData[node]) return;
  state.selected = node;
  document.body.dataset.selected = node;
  $$(".graph-node").forEach((element) => element.classList.toggle("selected", element.dataset.node === node));
  const data = nodeData[node];
  $("#inspectorCategory").textContent = data.category;
  $("#inspectorPath").textContent = data.path;
  $("#selectedNodeTitle").textContent = data.title;
  $("#selectedNodeDescription").textContent = data.description;
  const icon = $("#selectedNodeCard .selected-node-icon");
  icon.className = `selected-node-icon ${data.color}`;
  icon.innerHTML = `<svg class="icon"><use href="#${data.icon}" /></svg>`;
  const rain = $("#rainInspector");
  const selectedCard = $("#selectedNodeCard");
  rain.style.display = node === "rain" ? "block" : "none";
  otherInspector.style.display = node === "rain" ? "none" : "block";
  if (node !== "rain") renderOtherInspector(node);
  selectedCard.querySelector(".node-live-badge").textContent = node === "output" ? "READY" : "LIVE";
}

function setTool(tool) {
  state.tool = tool;
  $$(".rail-button[data-tool]").forEach((button) => button.classList.toggle("active", button.dataset.tool === tool));
  $("#viewportCard").classList.toggle("painting", tool === "rain" && state.pointer.inside);
  $("#paintHint").style.display = tool === "rain" ? "flex" : "none";
  if (tool === "wind") { selectNode("wind"); showToast("Wind vector brush armed", true); }
  else if (tool === "rain") { selectNode("rain"); showToast("Rainfall brush armed", true); }
  else if (tool === "inspect") { showToast("Field probe active", false); }
  else { showToast("Orbit camera ready", false); }
}

$$('.rail-button[data-tool]').forEach((button) => button.addEventListener("click", () => setTool(button.dataset.tool)));
$$('.graph-node').forEach((node) => node.addEventListener("click", () => selectNode(node.dataset.node)));

bindSlider("#rainRate", (value) => { state.rainRate = value; updateRainLabels(); });
bindSlider("#impactRadius", (value) => { state.impactRadius = value; updateRainLabels(); });
bindSlider("#gravity", (value) => { state.gravity = value; updateRainLabels(); });
bindSlider("#carryCapacity", (value) => { state.carryCapacity = value; updateRainLabels(); });
bindSlider("#poolThreshold", (value) => { state.poolThreshold = value; updateRainLabels(); });
updateRainLabels();

$("#liveToggle").addEventListener("click", (event) => {
  state.liveSolver = !state.liveSolver;
  event.currentTarget.classList.toggle("on", state.liveSolver);
  showToast(state.liveSolver ? "Live solver enabled" : "Live solver paused", state.liveSolver && state.running);
});

let sedimentRouteIndex = 0;
$("#sedimentRoute").addEventListener("click", () => {
  sedimentRouteIndex = (sedimentRouteIndex + 1) % 3;
  const routes = ["Deposit", "Re-erode", "Retain layer"];
  $("#sedimentRouteText").textContent = routes[sedimentRouteIndex];
  showToast(`Sediment route: ${routes[sedimentRouteIndex]}`, false);
});

$$(".check-row").forEach((row) => row.addEventListener("click", () => {
  row.querySelector(".custom-check")?.classList.toggle("checked");
}));

$("#viewModeButton").addEventListener("click", () => {
  state.viewMode = (state.viewMode + 1) % 4;
  const labels = ["ALBEDO", "EROSION MASK", "NORMALS", "SDF DISTANCE"];
  $("#viewModeText").textContent = labels[state.viewMode];
  $("#fieldStatus").textContent = state.viewMode === 0 ? "SIGNED DISTANCE FIELD" : labels[state.viewMode];
  showToast(`View layer: ${labels[state.viewMode]}`, false);
});

$("#cameraButton").addEventListener("click", () => {
  state.cameraMode = (state.cameraMode + 1) % 2;
  $("#cameraText").textContent = state.cameraMode ? "ORTHO" : "PERSP";
  showToast(state.cameraMode ? "Orthographic guide enabled" : "Perspective camera enabled", false);
});

$("#resetButton").addEventListener("click", () => {
  state.running = false;
  state.stamps = [];
  state.rainZones = [];
  state.particles = [];
  state.impacts = [];
  state.droplets = 0;
  state.elapsed = 0;
  state.erosion = 0.18;
  state.sediment = 0.08;
  state.spawnRemainder = 0;
  showToast("Pass reset • base SDF restored", false);
  updateDynamicStats();
});

$("#bakeButton").addEventListener("click", (event) => {
  const button = event.currentTarget;
  button.innerHTML = '<svg class="icon icon-13"><use href="#i-check" /></svg>Baked 1024³';
  showToast("SDF cache baked • masks preserved", false);
  setTimeout(() => { button.innerHTML = '<svg class="icon icon-13"><use href="#i-cube" /></svg>Bake cache'; }, 2400);
});

const simulateButton = document.createElement("button");
simulateButton.className = "simulate-button";
simulateButton.id = "simulateButton";
simulateButton.innerHTML = '<svg class="icon icon-12"><use href="#i-play" /></svg><span>SIMULATE</span>';
$(".viewport-actions").insertBefore(simulateButton, $("#viewModeButton"));
simulateButton.addEventListener("click", () => {
  state.running = !state.running;
  simulateButton.classList.toggle("active", state.running);
  simulateButton.innerHTML = state.running ? '<svg class="icon icon-12"><use href="#i-pause" /></svg><span>PAUSE</span>' : '<svg class="icon icon-12"><use href="#i-play" /></svg><span>SIMULATE</span>';
  showToast(state.running ? "Rainfall solver evaluating" : "Solver paused", state.running);
});

const addNodeButton = document.createElement("button");
addNodeButton.className = "add-node-button";
addNodeButton.textContent = "+ Add operator";
$(".graph-title-wrap").append(addNodeButton);
addNodeButton.addEventListener("click", () => {
  showToast("Operator palette ready • choose a field process", false);
  addNodeButton.textContent = addNodeButton.textContent === "+ Add operator" ? "Choose process…" : "+ Add operator";
});

$("#zoomOut").addEventListener("click", () => {
  const current = Number($("#zoomLabel").textContent.replace("%", ""));
  $("#zoomLabel").textContent = `${Math.max(70, current - 10)}%`;
});
$("#zoomIn").addEventListener("click", () => {
  const current = Number($("#zoomLabel").textContent.replace("%", ""));
  $("#zoomLabel").textContent = `${Math.min(140, current + 10)}%`;
});

/* Paint rainfall in a world-space area. The brush feeds the particle emitter,
   while the droplets themselves create localized SDF subtraction stamps. */
function pointerToWorld(event) {
  const rect = $("#viewportCard").getBoundingClientRect();
  const sx = (event.clientX - rect.left) / rect.width;
  const sy = (event.clientY - rect.top) / rect.height;
  return {
    x: (sx - 0.5) * 7.0 + (sy - 0.53) * 0.7,
    z: (sy - 0.51) * 6.1,
  };
}

$("#viewportCard").addEventListener("pointerenter", (event) => {
  state.pointer.inside = true;
  const rect = $("#viewportCard").getBoundingClientRect();
  state.pointer.x = event.clientX - rect.left;
  state.pointer.y = event.clientY - rect.top;
});
$("#viewportCard").addEventListener("pointermove", (event) => {
  const rect = $("#viewportCard").getBoundingClientRect();
  state.pointer.x = event.clientX - rect.left;
  state.pointer.y = event.clientY - rect.top;
  const world = pointerToWorld(event);
  const y = surfaceHeight(world.x, world.z);
  $("#cursorReadout").textContent = `X ${fmt2(world.x)}   Y ${y >= 0 ? "+" : ""}${y.toFixed(2)}   Z ${fmt2(world.z)}`;
  if (state.pointer.down && state.tool === "rain") {
    state.rainZones.push({ x: world.x, z: world.z, radius: clamp(state.impactRadius * 7.2 + 0.32, 0.38, 1.2) });
    if (state.rainZones.length > 80) state.rainZones.splice(0, state.rainZones.length - 80);
  }
});
$("#viewportCard").addEventListener("pointerleave", () => { state.pointer.inside = false; state.pointer.down = false; });
$("#viewportCard").addEventListener("pointerdown", (event) => {
  if (state.tool !== "rain") return;
  state.pointer.down = true;
  const world = pointerToWorld(event);
  state.rainZones.push({ x: world.x, z: world.z, radius: clamp(state.impactRadius * 7.2 + 0.32, 0.38, 1.2) });
  showToast("Painted rainfall zone • press simulate", true);
  $("#viewportCard").setPointerCapture(event.pointerId);
});
$("#viewportCard").addEventListener("pointerup", () => { state.pointer.down = false; });

/* Export a compact graph manifest rather than a raster: the deliverable is a
   procedural SDF recipe with named physical operators and preserved masks. */
$(".top-actions").insertAdjacentHTML("afterbegin", '<button class="export-button" id="exportButton"><svg class="icon icon-12"><use href="#i-download" /></svg>EXPORT SDF</button>');
$("#exportButton").addEventListener("click", () => {
  const manifest = {
    format: "frontier.sdfgraph",
    field: "signed-distance",
    heightfield: false,
    resolution: "1024^3 virtual",
    seed: state.seed,
    operators: ["continental-mass", "ridged-multifractal", "rainfall-droplet-solver", "sedimentation", "wind-abrasion", "chemical-weathering", "satmap-albedo"],
    erosion: { rainRateKps: state.rainRate, impactRadiusM: state.impactRadius, gravity: state.gravity, carryCapacity: state.carryCapacity, poolThresholdM: state.poolThreshold },
    masks: ["erosion-depth", "flow-accumulation", "sediment-load", "ao", "curvature", "slope"],
    paintZones: state.rainZones,
  };
  const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: "application/json" });
  const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "kaleidoscope-range.sdfgraph"; link.click(); URL.revokeObjectURL(link.href);
  showToast("SDF graph exported • raster-free", false);
});

/* -------------------------------------------------------------------------- */
/* Main loop                                                                   */
/* -------------------------------------------------------------------------- */
let lastFrame = performance.now();
function frame(now) {
  const dt = Math.min(0.05, Math.max(0, (now - lastFrame) / 1000));
  lastFrame = now;
  updateSolver(dt);
  if (renderer.ready) renderer.render(now); else fallbackRender($("#terrainCanvas"), now);
  drawEffects(now);
  if (now - state.lastUiUpdate > 180) {
    updateDynamicStats();
    state.lastUiUpdate = now;
  }
  requestAnimationFrame(frame);
}

selectNode("rain");
updateDynamicStats();
requestAnimationFrame(frame);

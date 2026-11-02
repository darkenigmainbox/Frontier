import GUI from 'lil-gui';
import { SIM_MODES, GRID_QUALITY, PARTICLE_BUDGET } from '../fluid/particles.js';
import { WAVE_PRESETS } from '../water/waves.js';

export function buildGUI(app) {
  const { particles, fluid, ripple, water, waves, sky, pipeline, effects, boat, terrain, shared } = app;
  const gui = new GUI({ title: 'Frontier Water — Controls', width: 330 });

  // ---------------- 3D splash simulation ----------------
  const fs = gui.addFolder('3D Splash Simulation (GPU)');
  fs.add(particles.params, 'enabled').name('Enable 3D particles');
  fs.add(particles.params, 'mode', Object.keys(SIM_MODES)).name('Solver').onChange(() => app.onModeChange());
  fs.add(particles.params, 'budget', Object.keys(PARTICLE_BUDGET)).name('Particle budget').onChange((v) => particles.setBudget(v));
  fs.add(particles.params, 'grid', Object.keys(GRID_QUALITY)).name('Global grid quality').onChange((v) => { particles.setGrid(v); app.updateOverlay(); });
  fs.add(particles.params, 'substeps', 1, 4, 1).name('Substeps');
  const flip = fs.addFolder('FLIP');
  flip.add(particles.params, 'flipRatio', 0.0, 1.0, 0.01).name('FLIP / PIC ratio');
  flip.add(particles.params, 'pressureIters', 5, 80, 1).name('Pressure iterations');
  flip.add(particles.params, 'densityCorrection', 0, 1, 0.01).name('Density correction');
  const sph = fs.addFolder('SPH');
  sph.add(particles.params, 'sphStiffness', 0.5, 25, 0.1).name('Stiffness (EOS)');
  sph.add(particles.params, 'sphViscosity', 0, 0.5, 0.005).name('Viscosity');
  sph.add(particles.params, 'xsph', 0, 0.4, 0.005).name('XSPH smoothing');
  const ww = fs.addFolder('Whitewater');
  ww.add(particles.params, 'turbulence', 0, 20, 0.1).name('Air turbulence');
  ww.add(particles.params, 'bubbleChance', 0, 1, 0.01).name('Bubble chance');
  fs.add(particles.params, 'restDensity', 1, 8, 0.1).name('Rest density (ppc)');
  fs.add(particles.params, 'airDrag', 0, 3, 0.01).name('Air drag');
  fs.add({ reset: () => particles.reset() }, 'reset').name('Clear particles');
  [flip, sph, ww].forEach((f) => f.close());

  // ---------------- Splash sources ----------------
  const sp = gui.addFolder('Splash');
  sp.add(effects.params, 'clickSplash').name('Click water to splash');
  sp.add(effects.params, 'splashScale', 0.2, 3, 0.05).name('Splash size');
  sp.add(boat.params, 'spray').name('Boat spray / wake');
  sp.add(effects.params, 'crestSpray').name('Whitecap spray');
  sp.add(effects.params, 'shoreSpray').name('Shore-break spray');
  sp.add(effects.params, 'rockSize', 0.2, 2, 0.05).name('Rock size');
  sp.add({ rock: () => effects.dropRock(boat.position) }, 'rock').name('Drop rock  [R]');
  sp.add({ big: () => { for (let i = 0; i < 5; i++) setTimeout(() => effects.dropRock(boat.position), i * 180); } }, 'big').name('Rock barrage');

  // ---------------- Foam ----------------
  const fo = gui.addFolder('Foam');
  fo.add(particles.params, 'foamParticles').name('3D particle foam');
  fo.add(particles.params, 'foamChance', 0, 1, 0.01).name('Spray → foam chance');
  fo.add(particles.params, 'foamLife', 1, 25, 0.5).name('Particle foam life (s)');
  fo.add(particles.params, 'cohesion', 0, 3, 0.05).name('Foam clumping');
  fo.add(fluid.params, 'foamSize', 0.03, 0.5, 0.01).name('Foam particle size');
  fo.add(fluid.params, 'foamOpacity', 0, 1, 0.01).name('Foam particle opacity');
  fo.add(ripple.params, 'foamGrid').name('Foam grid (2.5D)');
  fo.add(ripple.params, 'foamDecay', 1, 30, 0.5).name('Grid foam life (s)');
  fo.add(ripple.params, 'steepFoam', 0, 10, 0.1).name('Ripple crest foam');
  fo.add(ripple.params, 'boatFoam', 0, 4, 0.05).name('Boat wake foam');
  fo.add(ripple.params, 'foamFlow', 0, 3, 0.05).name('Foam advection');
  fo.add(water.params, 'crestFoam', 0, 2, 0.01).name('Whitecaps (global)');
  fo.add(water.params, 'crestThreshold', 0.2, 1.1, 0.01).name('Whitecap threshold').onChange((v) => { effects.crestThreshold = v; });
  fo.add(water.params, 'shoreFoam', 0, 2, 0.01).name('Shoreline foam');
  fo.add(water.params, 'foamScale', 0.3, 5, 0.05).name('Foam pattern scale');

  // ---------------- 2.5D ripples ----------------
  const rp = gui.addFolder('2.5D Water (ripples)');
  rp.add(ripple.params, 'enabled').name('Interactive height field');
  rp.add(ripple.params, 'solver', ['iWave (dispersive)', 'Wave equation']).name('Solver');
  rp.add(ripple.params, 'size', [48, 64, 96, 128, 192]).name('Grid size (m)').onChange((v) => { ripple.resize(Number(v)); app.updateOverlay(); });
  rp.add(ripple.params, 'damping', 0, 1.5, 0.01).name('Damping');
  rp.add(ripple.params, 'waveSpeed', 0.5, 8, 0.1).name('Wave speed (wave eq.)');
  rp.add(ripple.params, 'boatWake', 0, 3, 0.05).name('Boat wake strength');
  rp.add(ripple.params, 'impactStrength', 0, 4, 0.05).name('Particle impact strength');

  // ---------------- Waves ----------------
  const wv = gui.addFolder('Waves');
  const rebuild = () => waves.rebuild();
  wv.add(waves.params, 'preset', Object.keys(WAVE_PRESETS)).name('Sea state').onChange((v) => { waves.applyPreset(v); gui.controllersRecursive().forEach((c) => c.updateDisplay()); });
  wv.add(waves.params, 'height', 0, 6, 0.05).name('Wave height').onChange(rebuild);
  wv.add(waves.params, 'wavelength', 8, 160, 1).name('Wavelength (m)').onChange(rebuild);
  wv.add(waves.params, 'choppiness', 0, 1, 0.01).name('Choppiness').onChange(rebuild);
  wv.add(waves.params, 'windDir', 0, 360, 1).name('Wind direction').onChange(rebuild);
  wv.add(waves.params, 'spread', 0, 2, 0.01).name('Directional spread').onChange(rebuild);
  wv.add(waves.params, 'speed', 0, 2, 0.01).name('Time scale').onChange(rebuild);
  wv.add(waves.params, 'shoreWaves').name('Shore breakers').onChange(rebuild);
  wv.add(waves.params, 'shoreAmp', 0, 2.5, 0.01).name('Breaker height').onChange(rebuild);

  // ---------------- Rendering ----------------
  const rn = gui.addFolder('Rendering');
  rn.add(fluid.params, 'ssf').name('Screen-space fluid (splash)');
  rn.add(fluid.params, 'particleRadius', 0.03, 0.3, 0.005).name('Fluid particle radius');
  rn.add(fluid.params, 'smoothing', 0.02, 0.6, 0.01).name('Fluid smoothing');
  rn.add(fluid.params, 'whiteness', 0, 1, 0.01).name('Spray aeration (white)');
  rn.add(water.params, 'planarReflections').name('Planar reflections');
  rn.add(water.params, 'refraction').name('Refraction + absorption');
  rn.add(water.params, 'sss').name('Subsurface scattering');
  rn.add(water.params, 'detailNormals').name('Capillary detail normals');
  rn.add(water.params, 'detailStrength', 0, 3, 0.01).name('Detail strength');
  rn.add(water.params, 'roughness', 0.01, 0.4, 0.005).name('Surface roughness');
  const clarity = { clarity: 1.0 };
  rn.add(clarity, 'clarity', 0.2, 4, 0.01).name('Water clarity').onChange((v) => shared.water.uAbsorb.value.set(0.42, 0.075, 0.055).multiplyScalar(1 / v));
  rn.add(app.shared.caustics.uCaustics, 'value', 0, 3, 0.01).name('Caustics');
  rn.add(shared.fog.uFogDensity, 'value', 0, 0.002, 0.00001).name('Haze');
  rn.add(pipeline.params, 'bloom').name('Bloom');
  rn.add(pipeline.params, 'bloomStrength', 0, 1.5, 0.01).name('Bloom strength');
  rn.add(pipeline.params, 'exposure', 0.1, 3, 0.01).name('Exposure');
  rn.add(pipeline.params, 'fxaa').name('FXAA');
  rn.add(app.settings, 'resolution', 0.5, 2, 0.05).name('Resolution scale').onChange(() => app.resize());
  rn.add(app.settings, 'showGrid').name('Show simulation grids').onChange((v) => { app.overlay.visible = v; });

  // ---------------- Sky ----------------
  const sk = gui.addFolder('Sky & Sun');
  const skyChange = () => { sky.apply(); terrain.bakeShadows(sky.sunDir); };
  sk.add(sky.params, 'elevation', -2, 85, 0.1).name('Sun elevation').onFinishChange(skyChange).onChange(() => sky.apply());
  sk.add(sky.params, 'azimuth', 0, 360, 0.5).name('Sun azimuth').onFinishChange(skyChange).onChange(() => sky.apply());
  sk.add(sky.params, 'clouds', 0, 1, 0.01).name('Clouds').onChange(() => sky.apply());
  sk.add(sky.params, 'turbidity', 1, 12, 0.1).name('Turbidity').onChange(() => sky.apply());
  sk.add(sky.params, 'sunIntensity', 0.5, 8, 0.1).name('Sun intensity').onChange(() => sky.apply());

  // ---------------- Boat ----------------
  const bt = gui.addFolder('Boat & Camera');
  bt.add(app.settings, 'follow').name('Camera follows boat');
  bt.add(boat.params, 'thrust', 0.2, 2.5, 0.05).name('Engine power');
  bt.add({ reset: () => app.resetBoat() }, 'reset').name('Reset boat  [Backspace]');
  bt.add({ shore: () => app.jumpToShore() }, 'shore').name('Go to shoreline view');

  [rp, wv, rn, sk, bt].forEach((f) => f.close());
  if (window.innerWidth < 1100) gui.close(); // keep the view clear on small screens
  return gui;
}

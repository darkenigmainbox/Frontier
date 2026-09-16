import { PureVolumetricSDF } from "./pure-sdf.js";
import { VolumetricErosion } from "./volumetric-erosion.js";
import { PureSDFRaymarcher } from "./pure-sdf-renderer.js";
import { STAMP_TYPES } from "./stamps.js";

// Pure 100% Volumetric 3D Signed Distance Field (No mesh geometry)
const container = document.getElementById("canvas-container");
const sdf = new PureVolumetricSDF([160, 96, 160]);
const erosion = new VolumetricErosion(sdf);
const renderer = new PureSDFRaymarcher(container, sdf);

let isSimulating = false;
let totalCycles = 0;
let lastParticles = [];

// UI Bindings
const btnPlay = document.getElementById("btn-play");
const btnStep = document.getElementById("btn-step");
const btnBurst = document.getElementById("btn-burst");
const btnReset = document.getElementById("btn-reset");
const statCycles = document.getElementById("stat-cycles");
const presetSelect = document.getElementById("preset-select");

// Hydraulic Sliders
const sliderErosion = document.getElementById("slider-erosion");
const sliderDeposition = document.getElementById("slider-deposition");
const sliderCapacity = document.getElementById("slider-capacity");
const sliderRadius = document.getElementById("slider-radius");

// Micro-Erosion Sliders
const sliderMicroScale = document.getElementById("slider-micro-scale");
const sliderMicroStrength = document.getElementById("slider-micro-strength");

// Wind Sliders
const sliderWind = document.getElementById("slider-wind");
const sliderWindAngle = document.getElementById("slider-wind-angle");

// Water & Droplets
const checkWater = document.getElementById("check-water");
const sliderWaterLevel = document.getElementById("slider-water");
const checkParticles = document.getElementById("check-particles");

// Volumetric Stamp UI
const stampSelect = document.getElementById("stamp-select");
const stampModeSelect = document.getElementById("stamp-mode-select");
const btnApplyStamp = document.getElementById("btn-apply-stamp");

function updateStats() {
  statCycles.innerText = `${totalCycles} passes`;
}

function runOnePass(drops = 2200) {
  lastParticles = erosion.simulateCycle(drops);
  totalCycles++;
  updateStats();
  renderer.updateVolumeTexture();
  if (checkParticles.checked) {
    renderer.updateParticles(lastParticles);
  }
}

btnPlay.addEventListener("click", () => {
  isSimulating = !isSimulating;
  btnPlay.innerText = isSimulating ? "⏸ Pause Simulation" : "▶ Start Continuous Erosion";
  btnPlay.classList.toggle("active", isSimulating);
});

btnStep.addEventListener("click", () => {
  runOnePass(2800);
});

btnBurst.addEventListener("click", () => {
  for (let i = 0; i < 5; i++) {
    lastParticles = erosion.simulateCycle(2000);
    totalCycles++;
  }
  updateStats();
  renderer.updateVolumeTexture();
  if (checkParticles.checked) {
    renderer.updateParticles(lastParticles);
  }
});

btnReset.addEventListener("click", () => {
  sdf.stamps = [];
  sdf.initTerrain(presetSelect.value);
  totalCycles = 0;
  updateStats();
  renderer.updateVolumeTexture();
  renderer.updateParticles([]);
});

presetSelect.addEventListener("change", (e) => {
  sdf.stamps = [];
  sdf.initTerrain(e.target.value);
  totalCycles = 0;
  updateStats();
  renderer.updateVolumeTexture();
  renderer.updateParticles([]);
});

function syncParams() {
  const angleRad = (parseFloat(sliderWindAngle.value) * Math.PI) / 180;
  erosion.setParameters({
    erosionRate: parseFloat(sliderErosion.value),
    depositionRate: parseFloat(sliderDeposition.value),
    capacityFactor: parseFloat(sliderCapacity.value),
    carveRadius: parseFloat(sliderRadius.value),
    microErosionScale: parseFloat(sliderMicroScale.value),
    microCarveStrength: parseFloat(sliderMicroStrength.value),
    windAbrasion: parseFloat(sliderWind.value) * 0.1,
    windDirection: [Math.cos(angleRad), 0.1, Math.sin(angleRad)],
  });
}

[
  sliderErosion,
  sliderDeposition,
  sliderCapacity,
  sliderRadius,
  sliderMicroScale,
  sliderMicroStrength,
  sliderWind,
  sliderWindAngle,
].forEach((el) => el.addEventListener("input", syncParams));

btnApplyStamp.addEventListener("click", () => {
  const type = stampSelect.value;
  const mode = stampModeSelect.value;

  const posX = (Math.random() - 0.5) * 8.0;
  const posZ = (Math.random() - 0.5) * 8.0;
  const posY = type === STAMP_TYPES.ARCH || type === STAMP_TYPES.SPIRE ? 4.5 : 7.0;

  sdf.addStamp(type, [posX, posY, posZ], [1.3, 1.3, 1.3], mode);
  renderer.updateVolumeTexture();
});

checkWater.addEventListener("change", (e) => {
  renderer.setWaterVisible(e.target.checked);
});

sliderWaterLevel.addEventListener("input", (e) => {
  renderer.setWaterLevel(parseFloat(e.target.value));
});

checkParticles.addEventListener("change", (e) => {
  renderer.particleMesh.visible = e.target.checked;
});

// Render Loop
let lastTime = performance.now();
function animate() {
  requestAnimationFrame(animate);

  const now = performance.now();
  if (isSimulating && now - lastTime > 75) {
    lastTime = now;
    runOnePass(1500);
  }

  renderer.render();
}

animate();

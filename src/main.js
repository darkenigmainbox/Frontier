import { HybridSDFTerrain } from "./hybrid-terrain.js";
import { RealisticGaeaErosion } from "./gaea-erosion.js";
import { HighDefTerrainRenderer } from "./highdef-renderer.js";

// Initialize system with 256x256 high-res crisp terrain
const container = document.getElementById("canvas-container");
const terrain = new HybridSDFTerrain(256);
const erosion = new RealisticGaeaErosion(terrain);
const renderer = new HighDefTerrainRenderer(container, terrain);

let isSimulating = false;
let totalCycles = 0;
let lastParticles = [];

// UI Elements
const btnPlay = document.getElementById("btn-play");
const btnStep = document.getElementById("btn-step");
const btnBurst = document.getElementById("btn-burst");
const btnReset = document.getElementById("btn-reset");
const statCycles = document.getElementById("stat-cycles");
const presetSelect = document.getElementById("preset-select");

// Hydraulic Controls
const sliderErosion = document.getElementById("slider-erosion");
const sliderDeposition = document.getElementById("slider-deposition");
const sliderCapacity = document.getElementById("slider-capacity");
const sliderRadius = document.getElementById("slider-radius");

// Micro-Erosion Detail
const sliderMicroScale = document.getElementById("slider-micro-scale");
const sliderMicroStrength = document.getElementById("slider-micro-strength");

// Wind Abrasion & Direction
const sliderWind = document.getElementById("slider-wind");
const sliderWindAngle = document.getElementById("slider-wind-angle");

// Water & Particles
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

function runOnePass(drops = 3000) {
  lastParticles = erosion.simulateCycle(drops);
  totalCycles++;
  updateStats();
  renderer.updateGeometry();
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
  runOnePass(3500);
});

btnBurst.addEventListener("click", () => {
  for (let i = 0; i < 6; i++) {
    lastParticles = erosion.simulateCycle(3000);
    totalCycles++;
  }
  updateStats();
  renderer.updateGeometry();
  if (checkParticles.checked) {
    renderer.updateParticles(lastParticles);
  }
});

btnReset.addEventListener("click", () => {
  terrain.stamps = [];
  terrain.initTerrain(presetSelect.value);
  totalCycles = 0;
  updateStats();
  renderer.updateGeometry();
  renderer.updateParticles([]);
});

presetSelect.addEventListener("change", (e) => {
  terrain.stamps = [];
  terrain.initTerrain(e.target.value);
  totalCycles = 0;
  updateStats();
  renderer.updateGeometry();
  renderer.updateParticles([]);
});

function syncParams() {
  erosion.setParameters({
    erosionRate: parseFloat(sliderErosion.value),
    depositionRate: parseFloat(sliderDeposition.value),
    capacityFactor: parseFloat(sliderCapacity.value),
    erosionRadius: parseInt(sliderRadius.value, 10),
    microDetailFreq: parseFloat(sliderMicroScale.value),
    microDetailStrength: parseFloat(sliderMicroStrength.value),
    windStrength: parseFloat(sliderWind.value),
    windAngle: (parseFloat(sliderWindAngle.value) * Math.PI) / 180,
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

// Stamp Tool application
btnApplyStamp.addEventListener("click", () => {
  const type = stampSelect.value;
  const mode = stampModeSelect.value;

  const posX = (Math.random() - 0.5) * 12.0;
  const posZ = (Math.random() - 0.5) * 12.0;
  const posY = 5.0;

  terrain.addStamp(type, [posX, posY, posZ], [1.4, 1.4, 1.4], mode, {
    height: 8.0,
    span: 7.0,
    radius: 3.5,
  });

  renderer.updateGeometry();
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
  if (isSimulating && now - lastTime > 65) {
    lastTime = now;
    runOnePass(2000);
  }

  renderer.render();
}

animate();

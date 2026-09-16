import { TerrainSDF } from "./terrain.js";
import { ErosionSimulator } from "./erosion.js";
import { TerrainRenderer } from "./renderer.js";

// Initialize system
const container = document.getElementById("canvas-container");
const terrain = new TerrainSDF(160);
const erosion = new ErosionSimulator(terrain);
const renderer = new TerrainRenderer(container, terrain);

let isSimulating = false;
let simulationSpeed = 1;
let totalCycles = 0;
let lastParticles = [];

// UI Elements
const btnPlay = document.getElementById("btn-play");
const btnStep = document.getElementById("btn-step");
const btnReset = document.getElementById("btn-reset");
const statCycles = document.getElementById("stat-cycles");
const presetSelect = document.getElementById("preset-select");

// Hydraulic sliders
const sliderErosion = document.getElementById("slider-erosion");
const sliderDeposition = document.getElementById("slider-deposition");
const sliderCapacity = document.getElementById("slider-capacity");
const sliderRadius = document.getElementById("slider-radius");

// Wind & Thermal sliders
const sliderWind = document.getElementById("slider-wind");
const sliderWindAngle = document.getElementById("slider-wind-angle");
const sliderTalus = document.getElementById("slider-talus");

// Water & Particles
const checkWater = document.getElementById("check-water");
const sliderWaterLevel = document.getElementById("slider-water");
const checkParticles = document.getElementById("check-particles");

function updateStats() {
  statCycles.innerText = `${totalCycles} passes`;
}

function runOnePass(drops = 2500) {
  lastParticles = erosion.simulateCycle(drops);
  totalCycles++;
  updateStats();
  renderer.updateGeometry();
  if (checkParticles.checked) {
    renderer.updateParticles(lastParticles);
  }
}

// Bind controls
btnPlay.addEventListener("click", () => {
  isSimulating = !isSimulating;
  btnPlay.innerText = isSimulating ? "⏸ Pause Simulation" : "▶ Start Continuous Erosion";
  btnPlay.classList.toggle("active", isSimulating);
});

btnStep.addEventListener("click", () => {
  runOnePass(3500);
});

btnReset.addEventListener("click", () => {
  terrain.initTerrain(presetSelect.value);
  totalCycles = 0;
  updateStats();
  renderer.updateGeometry();
  renderer.updateParticles([]);
});

presetSelect.addEventListener("change", (e) => {
  terrain.initTerrain(e.target.value);
  totalCycles = 0;
  updateStats();
  renderer.updateGeometry();
  renderer.updateParticles([]);
});

// Update simulator parameters on change
function syncParams() {
  erosion.setParameters({
    erosionRate: parseFloat(sliderErosion.value),
    depositionRate: parseFloat(sliderDeposition.value),
    capacityFactor: parseFloat(sliderCapacity.value),
    erosionRadius: parseInt(sliderRadius.value, 10),
    windStrength: parseFloat(sliderWind.value),
    windAngle: (parseFloat(sliderWindAngle.value) * Math.PI) / 180,
    talusRate: parseFloat(sliderTalus.value),
  });
}

[sliderErosion, sliderDeposition, sliderCapacity, sliderRadius, sliderWind, sliderWindAngle, sliderTalus].forEach(
  (el) => el.addEventListener("input", syncParams)
);

checkWater.addEventListener("change", (e) => {
  renderer.setWaterVisible(e.target.checked);
});

sliderWaterLevel.addEventListener("input", (e) => {
  renderer.setWaterLevel(parseFloat(e.target.value));
});

checkParticles.addEventListener("change", (e) => {
  renderer.particleMesh.visible = e.target.checked;
});

// 10-Pass Burst
document.getElementById("btn-burst").addEventListener("click", () => {
  for (let i = 0; i < 6; i++) {
    lastParticles = erosion.simulateCycle(2500);
    totalCycles++;
  }
  updateStats();
  renderer.updateGeometry();
  if (checkParticles.checked) {
    renderer.updateParticles(lastParticles);
  }
});

// Animation Loop
let lastTime = performance.now();
function animate() {
  requestAnimationFrame(animate);

  const now = performance.now();
  if (isSimulating && now - lastTime > 60) {
    lastTime = now;
    runOnePass(1800);
  }

  renderer.render();
}

animate();

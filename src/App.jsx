// Frontier AAA WebGPU Geological Terrain Generator - Main Application
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TerrainGenerator } from './engine/TerrainGenerator.js';
import { WebGPUCompute } from './engine/WebGPUCompute.js';
import { ExportManager } from './engine/ExportManager.js';
import { terrainPresets } from './presets/terrainPresets.js';
import TopBar from './components/TopBar.jsx';
import Outliner from './components/Outliner.jsx';
import Viewport3D from './components/Viewport3D.jsx';
import RightPanel from './components/RightPanel.jsx';
import './style.css';

export default function App() {
  // Engine instances
  const [resolution, setResolution] = useState(512);
  const generatorRef = useRef(new TerrainGenerator(512));
  const webGpuRef = useRef(new WebGPUCompute());
  const [webGpuStatus, setWebGpuStatus] = useState('Initializing WebGPU...');

  // Presets and Project state
  const [currentPresetId, setCurrentPresetId] = useState('alpine-massif');
  const [projectName, setProjectName] = useState('AlpineMassif');

  // Layerstack states
  const [shapeLayers, setShapeLayers] = useState(generatorRef.current.shapeLayers);
  const [textureLayers, setTextureLayers] = useState(generatorRef.current.textureLayers);
  const [activeTab, setActiveTab] = useState('shape'); // 'shape' | 'texture' | 'environment'
  const [selectedLayerId, setSelectedLayerId] = useState('shape-base');

  // Viewport & Shading states
  const [viewMode, setViewMode] = useState('pbr');
  const [wireframe, setWireframe] = useState(false);
  const [lightingPreset, setLightingPreset] = useState('golden');
  const [waterHeight, setWaterHeight] = useState(18);
  const [waterVisible, setWaterVisible] = useState(true);

  // Environment lighting parameters
  const [environmentState, setEnvironmentState] = useState({
    sunEnabled: true,
    sunAzimuth: 135,
    sunElevation: 38,
    sunIntensity: 2.8,
    fogDensity: 0.0012,
    waterHeight: 18,
    waterVisible: true
  });

  // Telemetry stats
  const [stats, setStats] = useState({
    minHeight: 0,
    maxHeight: 250,
    meanHeight: 120,
    vertices: 512 * 512
  });

  // Simulation execution flag
  const [isComputing, setIsComputing] = useState(false);
  const [generationTrigger, setGenerationTrigger] = useState(0);

  // Initialize WebGPU on mount
  useEffect(() => {
    webGpuRef.current.init().then((supported) => {
      setWebGpuStatus(webGpuRef.current.statusText);
    });
  }, []);

  // Compute terrain pipeline
  const runGeneration = useCallback((onlyTextures = false) => {
    setIsComputing(true);
    const gen = generatorRef.current;
    gen.shapeLayers = shapeLayers;
    gen.textureLayers = textureLayers;

    // Use requestAnimationFrame / timeout for non-blocking UI
    setTimeout(() => {
      if (!onlyTextures) {
        gen.generateHeightfield();
      } else {
        gen.generateBiomeTextures();
      }

      setStats({
        minHeight: gen.minHeight,
        maxHeight: gen.maxHeight,
        meanHeight: gen.meanHeight,
        vertices: gen.resolution * gen.resolution
      });

      setIsComputing(false);
      setGenerationTrigger((n) => n + 1);
    }, 10);
  }, [shapeLayers, textureLayers]);

  // Initial generation
  useEffect(() => {
    runGeneration(false);
  }, []);

  // Debounced update when Shape Layers change
  const shapeTimeoutRef = useRef(null);
  const updateShapeLayers = (newLayers) => {
    setShapeLayers(newLayers);
    generatorRef.current.shapeLayers = newLayers;
    if (shapeTimeoutRef.current) clearTimeout(shapeTimeoutRef.current);
    shapeTimeoutRef.current = setTimeout(() => {
      runGeneration(false);
    }, 60);
  };

  // Debounced update when Texture Layers change
  const texTimeoutRef = useRef(null);
  const updateTextureLayers = (newLayers) => {
    setTextureLayers(newLayers);
    generatorRef.current.textureLayers = newLayers;
    if (texTimeoutRef.current) clearTimeout(texTimeoutRef.current);
    texTimeoutRef.current = setTimeout(() => {
      runGeneration(true);
    }, 40);
  };

  // Update specific Shape layer
  const handleUpdateShapeLayer = (id, updates) => {
    const next = shapeLayers.map((l) => (l.id === id ? { ...l, ...updates } : l));
    updateShapeLayers(next);
  };

  // Update specific Texture layer
  const handleUpdateTextureLayer = (id, updates) => {
    const next = textureLayers.map((l) => (l.id === id ? { ...l, ...updates } : l));
    updateTextureLayers(next);
  };

  // Add new Shape layer
  const handleAddShapeLayer = (type) => {
    const newId = `shape-${type}-${Date.now()}`;
    const newLayer = {
      id: newId,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} Pass`,
      type: type,
      enabled: true,
      blendMode: type === 'hydraulic' ? 'carve' : type === 'thermal' ? 'relax' : 'add',
      opacity: 0.8,
      params:
        type === 'hydraulic'
          ? { iterations: 40000, capacityFactor: 3.5, erosionRate: 0.35, depositionRate: 0.2, inertia: 0.15, evaporation: 0.02 }
          : type === 'thermal'
          ? { talusAngle: 36, iterations: 16, talusRate: 0.45 }
          : type === 'strata'
          ? { frequency: 12, hardness: 0.6, bevel: 0.4, warp: 0.3 }
          : { elevation: 180, scale: 1.2, octaves: 5, sharpness: 2.0, warp: 1.0, seed: Math.floor(Math.random() * 9999) }
    };
    const next = [...shapeLayers, newLayer];
    updateShapeLayers(next);
    setSelectedLayerId(newId);
  };

  // Add new Texture layer
  const handleAddTextureLayer = (type) => {
    const newId = `tex-${type}-${Date.now()}`;
    const newLayer = {
      id: newId,
      name: `Custom ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      enabled: true,
      color: type === 'snow' ? '#ffffff' : type === 'grass' ? '#5a7842' : '#6b5e52',
      roughness: 0.8,
      metalness: 0.02,
      normalScale: 1.0,
      minSlope: 0,
      maxSlope: 90,
      slopeFalloff: 8,
      minElevation: 0,
      maxElevation: 500,
      elevationFalloff: 20,
      useFlowMask: type === 'river',
      useTalusMask: type === 'talus',
      useCavityMask: false,
      opacity: 0.85
    };
    const next = [...textureLayers, newLayer];
    updateTextureLayers(next);
    setSelectedLayerId(newId);
  };

  // Delete Layer
  const handleDeleteLayer = (id, isShape) => {
    if (isShape) {
      const next = shapeLayers.filter((l) => l.id !== id);
      updateShapeLayers(next);
      if (selectedLayerId === id && next.length > 0) setSelectedLayerId(next[0].id);
    } else {
      const next = textureLayers.filter((l) => l.id !== id);
      updateTextureLayers(next);
      if (selectedLayerId === id && next.length > 0) setSelectedLayerId(next[0].id);
    }
  };

  // Move layer order (Up/Down)
  const handleMoveLayer = (id, delta, isShape) => {
    const list = isShape ? [...shapeLayers] : [...textureLayers];
    const idx = list.findIndex((l) => l.id === id);
    if (idx < 0) return;
    const targetIdx = idx + delta;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const temp = list[idx];
    list[idx] = list[targetIdx];
    list[targetIdx] = temp;
    if (isShape) updateShapeLayers(list);
    else updateTextureLayers(list);
  };

  // Preset Selection
  const handleSelectPreset = (presetId) => {
    const preset = terrainPresets.find((p) => p.id === presetId);
    if (!preset) return;
    setCurrentPresetId(presetId);
    setProjectName(preset.name.replace(/\s+/g, ''));
    setWaterHeight(preset.waterHeight);
    setLightingPreset(preset.lighting);

    // Deep clone preset layers
    const nextShape = JSON.parse(JSON.stringify(preset.shapeLayers));
    const nextTex = JSON.parse(JSON.stringify(preset.textureLayers));
    setShapeLayers(nextShape);
    setTextureLayers(nextTex);
    generatorRef.current.shapeLayers = nextShape;
    generatorRef.current.textureLayers = nextTex;
    setSelectedLayerId(nextShape[0].id);

    setTimeout(() => {
      runGeneration(false);
    }, 20);
  };

  // Resolution Change
  const handleChangeResolution = (newRes) => {
    setResolution(newRes);
    generatorRef.current.setResolution(newRes);
    runGeneration(false);
  };

  // Update Environment
  const handleUpdateEnvironment = (updates) => {
    setEnvironmentState((prev) => {
      const next = { ...prev, ...updates };
      if (updates.waterHeight !== undefined) setWaterHeight(updates.waterHeight);
      if (updates.waterVisible !== undefined) setWaterVisible(updates.waterVisible);
      return next;
    });
  };

  // Rain FX Simulation Trigger
  const handleTriggerRain = () => {
    // Add extra rain carving iterations to current hydraulic layer if available
    const hydraulicLayer = shapeLayers.find((l) => l.type === 'hydraulic');
    if (hydraulicLayer) {
      handleUpdateShapeLayer(hydraulicLayer.id, {
        params: {
          ...hydraulicLayer.params,
          iterations: (hydraulicLayer.params.iterations || 45000) + 15000
        }
      });
    }
  };

  return (
    <div className="frontier-app">
      {/* 1. TOP HEADER BAR */}
      <TopBar
        presets={terrainPresets}
        currentPresetId={currentPresetId}
        onSelectPreset={handleSelectPreset}
        resolution={resolution}
        onChangeResolution={handleChangeResolution}
        viewMode={viewMode}
        onChangeViewMode={setViewMode}
        isComputing={isComputing}
        onRecompute={() => runGeneration(false)}
        webGpuStatus={webGpuStatus}
      />

      {/* 2. WORKSPACE THREE-COLUMN LAYOUT */}
      <div className="frontier-workspace">
        {/* LEFT COLUMN: OUTLINER & EXPORTS */}
        <Outliner
          projectName={projectName}
          presets={terrainPresets}
          currentPresetId={currentPresetId}
          onSelectPreset={handleSelectPreset}
          stats={stats}
          waterVisible={waterVisible}
          onToggleWater={() => setWaterVisible(!waterVisible)}
          wireframe={wireframe}
          onToggleWireframe={() => setWireframe(!wireframe)}
          onExportHeightmap={() => ExportManager.exportHeightmap16(generatorRef.current, `${projectName}_Heightmap_16bit.png`)}
          onExportNormalMap={() => ExportManager.exportNormalMap(generatorRef.current, `${projectName}_NormalMap.png`)}
          onExportFlowMap={() => ExportManager.exportFlowMap(generatorRef.current, `${projectName}_FlowMap.png`)}
          onExportOBJ={() => ExportManager.exportMeshOBJ(generatorRef.current, `${projectName}_Terrain.obj`)}
          onExportScreenshot={() => {
            const canvas = document.querySelector('.viewport-canvas');
            if (canvas) {
              canvas.toBlob((b) => ExportManager.downloadFile(b, `${projectName}_4K_Capture.png`));
            }
          }}
        />

        {/* CENTER COLUMN: 3D INTERACTIVE VIEWPORT */}
        <main className="frontier-center-viewport">
          <Viewport3D
            generator={generatorRef.current}
            viewMode={viewMode}
            wireframe={wireframe}
            waterHeight={waterHeight}
            waterVisible={waterVisible}
            lightingPreset={lightingPreset}
            onSelectLighting={setLightingPreset}
            onTriggerRain={handleTriggerRain}
            isComputing={isComputing}
          />
        </main>

        {/* RIGHT COLUMN: LAYERSTACK + INSPECTOR */}
        <RightPanel
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
            if (tab === 'shape' && shapeLayers.length > 0) setSelectedLayerId(shapeLayers[0].id);
            if (tab === 'texture' && textureLayers.length > 0) setSelectedLayerId(textureLayers[0].id);
          }}
          shapeLayers={shapeLayers}
          textureLayers={textureLayers}
          selectedLayerId={selectedLayerId}
          onSelectLayer={setSelectedLayerId}
          onUpdateShapeLayer={handleUpdateShapeLayer}
          onUpdateTextureLayer={handleUpdateTextureLayer}
          onAddShapeLayer={handleAddShapeLayer}
          onAddTextureLayer={handleAddTextureLayer}
          onDeleteLayer={handleDeleteLayer}
          onMoveLayer={handleMoveLayer}
          onResetLayer={() => {}}
          environmentState={environmentState}
          onUpdateEnvironment={handleUpdateEnvironment}
          onTriggerRain={handleTriggerRain}
        />
      </div>
    </div>
  );
}

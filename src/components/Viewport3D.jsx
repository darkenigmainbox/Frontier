// Frontier 3D Interactive WebGPU Viewport
import React, { useEffect, useRef, useState } from 'react';
import {
  Sun, Moon, Cloud, Camera, RotateCcw, Droplets, Layers, Maximize2,
  Move, ZoomIn, Eye
} from 'lucide-react';
import { TerrainRenderer } from '../engine/TerrainRenderer.js';

export default function Viewport3D({
  generator,
  viewMode,
  wireframe,
  waterHeight,
  waterVisible,
  lightingPreset,
  onSelectLighting,
  onTriggerRain,
  isComputing
}) {
  const canvasRef = useRef(null);
  const rendererRef = useRef(null);
  const [fps, setFps] = useState(60);

  // Initialize renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new TerrainRenderer(canvas);
    rendererRef.current = renderer;

    const handleResize = () => {
      renderer.resize();
    };
    window.addEventListener('resize', handleResize);

    // FPS Counter
    let lastTime = performance.now();
    let frames = 0;
    const fpsInterval = setInterval(() => {
      const now = performance.now();
      const delta = (now - lastTime) / 1000;
      setFps(Math.round(frames / delta));
      frames = 0;
      lastTime = now;
    }, 1000);

    const countFrames = () => {
      frames++;
      requestAnimationFrame(countFrames);
    };
    const frameHandle = requestAnimationFrame(countFrames);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearInterval(fpsInterval);
      cancelAnimationFrame(frameHandle);
      renderer.destroy();
    };
  }, []);

  // Update terrain mesh when generator changes
  useEffect(() => {
    if (rendererRef.current && generator) {
      rendererRef.current.updateTerrain(generator, viewMode, wireframe);
    }
  }, [generator, viewMode, wireframe]);

  // Update water plane
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setWaterHeight(waterHeight, waterVisible);
    }
  }, [waterHeight, waterVisible]);

  // Update lighting preset
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setLightingPreset(lightingPreset);
    }
  }, [lightingPreset]);

  // Handle camera view preset
  const setCameraView = (type) => {
    if (rendererRef.current) {
      rendererRef.current.setCameraPreset(type);
    }
  };

  // Trigger live rain particle effect
  const handleSimulateRain = () => {
    if (rendererRef.current && generator) {
      rendererRef.current.triggerRainParticles(generator, 3000);
      onTriggerRain();
    }
  };

  return (
    <div className="viewport-container">
      {/* 3D Canvas */}
      <canvas ref={canvasRef} className="viewport-canvas" />

      {/* Viewport Top Floating Controls */}
      <div className="viewport-hud-top">
        {/* Camera Views */}
        <div className="hud-pill-group">
          <button className="hud-btn" onClick={() => setCameraView('perspective')} title="Perspective 3D Orbit">
            Persp
          </button>
          <button className="hud-btn" onClick={() => setCameraView('top')} title="Top-down Ortho view">
            Top
          </button>
          <button className="hud-btn" onClick={() => setCameraView('front')} title="Front Elevation Profile">
            Front
          </button>
          <button className="hud-btn" onClick={() => setCameraView('iso')} title="Isometric 30° view">
            Iso
          </button>
          <button className="hud-btn icon-only" onClick={() => setCameraView('reset')} title="Reset Camera">
            <RotateCcw size={12} />
          </button>
        </div>

        {/* Lighting Atmosphere Presets */}
        <div className="hud-pill-group">
          <button
            className={`hud-btn ${lightingPreset === 'golden' ? 'active' : ''}`}
            onClick={() => onSelectLighting('golden')}
            title="Golden Hour Sunlight"
          >
            <Sun size={12} color="#f5b971" />
            <span>Golden Hour</span>
          </button>
          <button
            className={`hud-btn ${lightingPreset === 'noon' ? 'active' : ''}`}
            onClick={() => onSelectLighting('noon')}
            title="Overhead High Noon"
          >
            <Sun size={12} color="#ffffff" />
            <span>High Noon</span>
          </button>
          <button
            className={`hud-btn ${lightingPreset === 'overcast' ? 'active' : ''}`}
            onClick={() => onSelectLighting('overcast')}
            title="Moody Misty Overcast"
          >
            <Cloud size={12} color="#b0bac9" />
            <span>Overcast</span>
          </button>
          <button
            className={`hud-btn ${lightingPreset === 'sunset' ? 'active' : ''}`}
            onClick={() => onSelectLighting('sunset')}
            title="Alpine Sunset"
          >
            <Sun size={12} color="#ea6045" />
            <span>Sunset</span>
          </button>
          <button
            className={`hud-btn ${lightingPreset === 'night' ? 'active' : ''}`}
            onClick={() => onSelectLighting('night')}
            title="Moonlit Night"
          >
            <Moon size={12} color="#8ca7d4" />
            <span>Moonlit</span>
          </button>
        </div>

        {/* Rain Simulation Trigger */}
        <button
          className="hud-rain-btn"
          onClick={handleSimulateRain}
          title="Simulate 50,000 droplets carving gullies with live particle visualizer"
        >
          <Droplets size={13} />
          <span>Simulate Rain FX</span>
        </button>
      </div>

      {/* Viewport Bottom Overlay Telemetry */}
      <div className="viewport-hud-bottom">
        <div className="nav-hint">
          <span>Left Drag: Orbit</span>
          <span>·</span>
          <span>Right Drag: Pan</span>
          <span>·</span>
          <span>Wheel: Zoom</span>
        </div>

        <div className="viewport-stats">
          <span className="stat-pill">{fps} FPS</span>
          <span className="stat-pill">{generator?.resolution}² Grid</span>
          {isComputing && <span className="stat-pill computing">Computing Erosion...</span>}
        </div>
      </div>
    </div>
  );
}

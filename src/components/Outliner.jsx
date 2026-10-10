// Frontier Outliner & Export Hub Left Panel
import React from 'react';
import {
  Box, Mountain, Droplets, Waves, Sun, Sparkles, Download, Camera,
  Layers, Check, Eye, EyeOff, Shield, Activity
} from 'lucide-react';

export default function Outliner({
  projectName = 'AlpineMassif',
  presets,
  currentPresetId,
  onSelectPreset,
  stats,
  waterVisible,
  onToggleWater,
  wireframe,
  onToggleWireframe,
  onExportHeightmap,
  onExportNormalMap,
  onExportFlowMap,
  onExportOBJ,
  onExportScreenshot
}) {
  return (
    <aside className="frontier-outliner">
      {/* Workspace Header */}
      <div className="scene-label">
        <span>PROJECT WORKSPACE</span>
        <span className="status-dot" />
      </div>

      <div className="scene-title">
        <span>{projectName}</span>
        <span className="scene-extension">.terrain</span>
      </div>

      {/* Outliner Presets */}
      <div className="outliner-group">
        <div className="group-label">
          <span>GEOLOGICAL ARCHETYPES</span>
          <span className="group-count">{presets.length}</span>
        </div>
        <div className="preset-list">
          {presets.map((preset) => (
            <div
              key={preset.id}
              className={`tree-row ${currentPresetId === preset.id ? 'selected' : ''}`}
              onClick={() => onSelectPreset(preset.id)}
            >
              <button className="object-button">
                <Mountain size={14} color="#d6a078" />
                <span>{preset.name}</span>
                {currentPresetId === preset.id && <span className="selected-dot" />}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Live Heightfield Telemetry */}
      <div className="outliner-group">
        <div className="group-label">
          <span>GEOLOGICAL TELEMETRY</span>
          <Activity size={12} color="#757575" />
        </div>
        <div className="telemetry-grid">
          <div className="telemetry-box">
            <span className="telemetry-label">SUMMIT PEAK</span>
            <span className="telemetry-val">{Math.round(stats.maxHeight || 250)}<small>m</small></span>
          </div>
          <div className="telemetry-box">
            <span className="telemetry-label">VALLEY DATUM</span>
            <span className="telemetry-val">{Math.round(stats.minHeight || 10)}<small>m</small></span>
          </div>
          <div className="telemetry-box">
            <span className="telemetry-label">MEAN ALTITUDE</span>
            <span className="telemetry-val">{Math.round(stats.meanHeight || 120)}<small>m</small></span>
          </div>
          <div className="telemetry-box">
            <span className="telemetry-label">TRIANGLES</span>
            <span className="telemetry-val">{((stats.vertices || 262144) * 2).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Scene Elements & Quick Toggles */}
      <div className="outliner-group">
        <div className="group-label">
          <span>SCENE OBJECTS</span>
        </div>
        <div className="tree-row">
          <button className="object-button" onClick={onToggleWater}>
            <Waves size={14} color="#74bdd4" />
            <span>Water Basin / Lake</span>
          </button>
          <button className="visibility" onClick={onToggleWater} title="Toggle Water">
            {waterVisible ? <Eye size={14} /> : <EyeOff size={14} />}
          </button>
        </div>
        <div className="tree-row">
          <button className="object-button" onClick={onToggleWireframe}>
            <Layers size={14} color="#a5b8c7" />
            <span>Mesh Wireframe Topology</span>
          </button>
          <button className="visibility" onClick={onToggleWireframe} title="Toggle Wireframe">
            {wireframe ? <Eye size={14} /> : <EyeOff size={14} />}
          </button>
        </div>
      </div>

      {/* Export Suite */}
      <div className="outliner-group export-hub">
        <div className="group-label">
          <span>EXPORT SUITE (AAA VFX & ENGINES)</span>
          <Download size={12} color="#757575" />
        </div>
        <div className="export-buttons">
          <button className="export-btn" onClick={onExportHeightmap} title="Export 16-bit Grayscale Heightmap for Unreal 5 / Unity">
            <Download size={13} />
            <span>16-bit Heightmap PNG</span>
          </button>
          <button className="export-btn" onClick={onExportNormalMap} title="Export Tangent Normal Map">
            <Download size={13} />
            <span>Normal Map PNG</span>
          </button>
          <button className="export-btn" onClick={onExportFlowMap} title="Export River Drainage Flow Map">
            <Download size={13} />
            <span>Flow Rivers Map PNG</span>
          </button>
          <button className="export-btn" onClick={onExportOBJ} title="Export 3D Mesh in Wavefront .OBJ format">
            <Download size={13} />
            <span>3D Mesh (.OBJ)</span>
          </button>
          <button className="export-btn screenshot-btn" onClick={onExportScreenshot} title="Capture Viewport Screenshot">
            <Camera size={13} />
            <span>Capture 4K Screenshot</span>
          </button>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="outliner-bottom">
        <div className="world-icon">
          <Box size={18} />
        </div>
        <div>
          <strong>Frontier Geological Engine</strong>
          <span>High Fidelity Terrain Authoring</span>
        </div>
        <span className="little-dot" />
      </div>
    </aside>
  );
}

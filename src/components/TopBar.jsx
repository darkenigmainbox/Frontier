// Frontier Top Header Bar
import React from 'react';
import {
  Layers, Mountain, Eye, Droplets, Sun, Download, Cpu, RefreshCw,
  Box, Camera, Sparkles, Check
} from 'lucide-react';

export default function TopBar({
  presets,
  currentPresetId,
  onSelectPreset,
  resolution,
  onChangeResolution,
  viewMode,
  onChangeViewMode,
  isComputing,
  onRecompute,
  webGpuStatus,
  onExportMenu
}) {
  return (
    <header className="frontier-topbar">
      {/* Brand */}
      <div className="brand-group">
        <div className="brand-symbol">
          <Layers size={22} strokeWidth={1.6} />
        </div>
        <div className="brand-text">
          <span className="brand-title">frontier<span className="brand-dot">.</span></span>
          <span className="brand-sub">TERRAIN / GAEA PRO</span>
        </div>
      </div>

      {/* Preset Selector */}
      <div className="topbar-section">
        <label className="topbar-label">LANDSCAPE PRESET</label>
        <select
          className="frontier-top-select"
          value={currentPresetId}
          onChange={(e) => onSelectPreset(e.target.value)}
        >
          {presets.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.category})
            </option>
          ))}
        </select>
      </div>

      {/* Resolution Selector */}
      <div className="topbar-section">
        <label className="topbar-label">GRID RESOLUTION</label>
        <div className="res-toggle-group">
          {[256, 512, 1024].map((res) => (
            <button
              key={res}
              className={`res-btn ${resolution === res ? 'active' : ''}`}
              onClick={() => onChangeResolution(res)}
            >
              {res}²
            </button>
          ))}
        </div>
      </div>

      {/* View Mode Switcher */}
      <div className="topbar-section modes-section">
        <label className="topbar-label">SHADING VIEW MODE</label>
        <div className="view-mode-pills">
          {[
            { id: 'pbr', label: 'PBR Shaded' },
            { id: 'albedo', label: 'Albedo' },
            { id: 'heightmap', label: 'Heightmap' },
            { id: 'slope', label: 'Slope' },
            { id: 'flow', label: 'Flow Rivers' },
            { id: 'talus', label: 'Talus Scree' },
            { id: 'cavity', label: 'Cavity AO' },
            { id: 'normal', label: 'Normal Map' }
          ].map((mode) => (
            <button
              key={mode.id}
              className={`view-mode-pill ${viewMode === mode.id ? 'active' : ''}`}
              onClick={() => onChangeViewMode(mode.id)}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* WebGPU Hardware Status & Recompute */}
      <div className="topbar-right">
        <div className={`gpu-badge ${webGpuStatus.includes('WebGPU') ? 'webgpu' : 'webgl'}`} title={webGpuStatus}>
          <span className="gpu-dot" />
          <span>{webGpuStatus.includes('WebGPU') ? 'WebGPU COMPUTE' : 'WebGL2 ACCELERATED'}</span>
        </div>

        <button
          className={`recompute-btn ${isComputing ? 'spinning' : ''}`}
          onClick={onRecompute}
          title="Recompute geological erosion pass"
        >
          <RefreshCw size={14} />
          <span>{isComputing ? 'Simulating...' : 'Recompute'}</span>
        </button>
      </div>
    </header>
  );
}

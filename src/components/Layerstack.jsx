// Frontier Layerstack Component (Terrain Shape & Texture Biomes)
import React, { useState } from 'react';
import {
  Layers, Mountain, Droplets, Waves, Sparkles, Eye, EyeOff, Plus, Trash2,
  ChevronUp, ChevronDown, SlidersHorizontal, Palette, Shield, Wind, MoveUpRight
} from 'lucide-react';

export const shapeTypeIcons = {
  base: Mountain,
  ridged: Mountain,
  strata: Layers,
  hydraulic: Droplets,
  thermal: Sparkles,
  glacial: Waves,
  coastal: Waves,
  canyon: MoveUpRight
};

export const textureTypeIcons = {
  cliff: Mountain,
  talus: Sparkles,
  grass: Wind,
  soil: Layers,
  river: Droplets,
  snow: Sparkles,
  sand: Waves
};

export default function Layerstack({
  activeTab,
  onTabChange,
  shapeLayers,
  textureLayers,
  selectedLayerId,
  onSelectLayer,
  onUpdateShapeLayer,
  onUpdateTextureLayer,
  onAddShapeLayer,
  onAddTextureLayer,
  onDeleteLayer,
  onMoveLayer
}) {
  const [showAddMenu, setShowAddMenu] = useState(false);

  const currentLayers = activeTab === 'shape' ? shapeLayers : textureLayers;

  const handleToggleVisible = (e, layer, isShape) => {
    e.stopPropagation();
    if (isShape) {
      onUpdateShapeLayer(layer.id, { enabled: !layer.enabled });
    } else {
      onUpdateTextureLayer(layer.id, { enabled: !layer.enabled });
    }
  };

  return (
    <div className="layerstack-container">
      {/* Top Stack Category Tabs */}
      <div className="layerstack-tabs">
        <button
          className={`layerstack-tab ${activeTab === 'shape' ? 'active' : ''}`}
          onClick={() => onTabChange('shape')}
        >
          <Mountain size={14} />
          <span>1. Terrain Shape</span>
          <span className="badge">{shapeLayers.filter(l => l.enabled).length}/{shapeLayers.length}</span>
        </button>

        <button
          className={`layerstack-tab ${activeTab === 'texture' ? 'active' : ''}`}
          onClick={() => onTabChange('texture')}
        >
          <Palette size={14} />
          <span>2. Textures & Biome</span>
          <span className="badge">{textureLayers.filter(l => l.enabled).length}/{textureLayers.length}</span>
        </button>

        <button
          className={`layerstack-tab ${activeTab === 'environment' ? 'active' : ''}`}
          onClick={() => onTabChange('environment')}
        >
          <Sparkles size={14} />
          <span>3. Atmosphere</span>
        </button>
      </div>

      {activeTab !== 'environment' && (
        <>
          {/* Layerstack Header Bar */}
          <div className="layerstack-header">
            <div className="layerstack-title">
              <span className="eyebrow-mini">
                {activeTab === 'shape' ? 'GEOLOGICAL LAYERSTACK' : 'PBR BIOME STACK'}
              </span>
              <span className="layerstack-count">{currentLayers.length} Layers</span>
            </div>

            <div style={{ position: 'relative' }}>
              <button
                className="layerstack-add-btn"
                onClick={() => setShowAddMenu(!showAddMenu)}
                title="Add new layer"
              >
                <Plus size={14} />
                <span>Add Layer</span>
              </button>

              {/* Add Layer Dropdown Menu */}
              {showAddMenu && (
                <div className="add-layer-dropdown">
                  {activeTab === 'shape' ? (
                    <>
                      <div className="dropdown-category">GEOLOGICAL PASSES</div>
                      <button onClick={() => { onAddShapeLayer('ridged'); setShowAddMenu(false); }}>
                        <Mountain size={13} color="#d6a078" /> Alpine Ridge Uplift
                      </button>
                      <button onClick={() => { onAddShapeLayer('strata'); setShowAddMenu(false); }}>
                        <Layers size={13} color="#c29583" /> Sedimentary Terracing
                      </button>
                      <button onClick={() => { onAddShapeLayer('hydraulic'); setShowAddMenu(false); }}>
                        <Droplets size={13} color="#81b8c8" /> Hydraulic Rain Erosion
                      </button>
                      <button onClick={() => { onAddShapeLayer('thermal'); setShowAddMenu(false); }}>
                        <Sparkles size={13} color="#e8b65f" /> Thermal Talus Scree
                      </button>
                      <button onClick={() => { onAddShapeLayer('glacial'); setShowAddMenu(false); }}>
                        <Waves size={13} color="#99aafa" /> Glacial U-Valley
                      </button>
                      <button onClick={() => { onAddShapeLayer('coastal'); setShowAddMenu(false); }}>
                        <Waves size={13} color="#74bdd4" /> Coastal Sea Shelf
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="dropdown-category">BIOME MATERIALS</div>
                      <button onClick={() => { onAddTextureLayer('cliff'); setShowAddMenu(false); }}>
                        <Mountain size={13} color="#7f8391" /> Bedrock & Cliff Face
                      </button>
                      <button onClick={() => { onAddTextureLayer('talus'); setShowAddMenu(false); }}>
                        <Sparkles size={13} color="#b5876d" /> Talus Scree Gravel
                      </button>
                      <button onClick={() => { onAddTextureLayer('grass'); setShowAddMenu(false); }}>
                        <Wind size={13} color="#72c8b3" /> Alpine Meadow / Tundra
                      </button>
                      <button onClick={() => { onAddTextureLayer('soil'); setShowAddMenu(false); }}>
                        <Layers size={13} color="#8a6f53" /> Lowland Fertile Soil
                      </button>
                      <button onClick={() => { onAddTextureLayer('river'); setShowAddMenu(false); }}>
                        <Droplets size={13} color="#5ba8c2" /> Stream Bed & Wet Mud
                      </button>
                      <button onClick={() => { onAddTextureLayer('snow'); setShowAddMenu(false); }}>
                        <Sparkles size={13} color="#f0f4f8" /> Alpine Glacial Snow
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* List of Stack Rows */}
          <div className="layerstack-list">
            {currentLayers.map((layer, index) => {
              const isSelected = selectedLayerId === layer.id;
              const LayerIcon = activeTab === 'shape'
                ? (shapeTypeIcons[layer.type] || Mountain)
                : (textureTypeIcons[layer.id.replace('tex-', '')] || Palette);

              const colorChip = layer.color || (
                layer.type === 'hydraulic' ? '#81b8c8' :
                layer.type === 'strata' ? '#c29583' :
                layer.type === 'thermal' ? '#e8b65f' :
                layer.type === 'glacial' ? '#99aafa' : '#d6a078'
              );

              return (
                <div
                  key={layer.id}
                  className={`layer-row ${isSelected ? 'selected' : ''} ${!layer.enabled ? 'disabled' : ''}`}
                  onClick={() => onSelectLayer(layer.id)}
                >
                  {/* Eye Toggle */}
                  <button
                    className="layer-eye-btn"
                    onClick={(e) => handleToggleVisible(e, layer, activeTab === 'shape')}
                    title={layer.enabled ? 'Mute layer' : 'Enable layer'}
                  >
                    {layer.enabled ? <Eye size={14} /> : <EyeOff size={14} opacity={0.4} />}
                  </button>

                  {/* Icon & Color Indicator */}
                  <div className="layer-icon-chip" style={{ color: colorChip }}>
                    <LayerIcon size={14} />
                  </div>

                  {/* Layer Meta */}
                  <div className="layer-info">
                    <div className="layer-name">{layer.name}</div>
                    <div className="layer-meta">
                      {activeTab === 'shape' ? (
                        <span>{layer.blendMode?.toUpperCase()} · {Math.round((layer.opacity ?? 1.0) * 100)}%</span>
                      ) : (
                        <span>
                          {layer.useFlowMask ? 'FLOW MASK' : layer.useTalusMask ? 'TALUS MASK' : `${layer.minSlope}°-${layer.maxSlope}°`} · {Math.round((layer.opacity ?? 1.0) * 100)}%
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Reorder and Delete controls */}
                  <div className="layer-actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="layer-action-btn"
                      disabled={index === 0}
                      onClick={() => onMoveLayer(layer.id, -1, activeTab === 'shape')}
                      title="Move up"
                    >
                      <ChevronUp size={13} />
                    </button>
                    <button
                      className="layer-action-btn"
                      disabled={index === currentLayers.length - 1}
                      onClick={() => onMoveLayer(layer.id, 1, activeTab === 'shape')}
                      title="Move down"
                    >
                      <ChevronDown size={13} />
                    </button>
                    {currentLayers.length > 1 && (
                      <button
                        className="layer-action-btn delete"
                        onClick={() => onDeleteLayer(layer.id, activeTab === 'shape')}
                        title="Delete layer"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

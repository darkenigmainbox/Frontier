// Frontier Right Panel: Layerstack + Inspector
import React from 'react';
import Layerstack from './Layerstack.jsx';
import Inspector from './Inspector.jsx';

export default function RightPanel({
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
  onMoveLayer,
  onResetLayer,
  environmentState,
  onUpdateEnvironment,
  onTriggerRain
}) {
  const currentLayers = activeTab === 'shape' ? shapeLayers : textureLayers;
  const selectedLayer = currentLayers.find(l => l.id === selectedLayerId) || currentLayers[0];

  const handleUpdateActiveLayer = (id, updates) => {
    if (activeTab === 'shape') {
      onUpdateShapeLayer(id, updates);
    } else {
      onUpdateTextureLayer(id, updates);
    }
  };

  return (
    <aside className="frontier-right-panel">
      {/* 1. LAYERSTACK AT TOP OF RIGHT PANEL */}
      <Layerstack
        activeTab={activeTab}
        onTabChange={onTabChange}
        shapeLayers={shapeLayers}
        textureLayers={textureLayers}
        selectedLayerId={selectedLayerId}
        onSelectLayer={onSelectLayer}
        onUpdateShapeLayer={onUpdateShapeLayer}
        onUpdateTextureLayer={onUpdateTextureLayer}
        onAddShapeLayer={onAddShapeLayer}
        onAddTextureLayer={onAddTextureLayer}
        onDeleteLayer={onDeleteLayer}
        onMoveLayer={onMoveLayer}
      />

      <div className="right-panel-divider" />

      {/* 2. INSPECTOR BELOW LAYERSTACK */}
      <Inspector
        activeTab={activeTab}
        selectedLayer={selectedLayer}
        onUpdateLayer={handleUpdateActiveLayer}
        onResetLayer={onResetLayer}
        environmentState={environmentState}
        onUpdateEnvironment={onUpdateEnvironment}
        onTriggerRain={onTriggerRain}
      />
    </aside>
  );
}

// Frontier Detailed Inspector Panel
import React from 'react';
import {
  Mountain, Droplets, Waves, Sparkles, Orbit, Sun, Layers, RotateCcw,
  SlidersHorizontal, Check, Wind, Palette, Sliders, ArrowUpRight, MoveUpRight, Eye
} from 'lucide-react';
import ContourCanvas from './Diagrams/ContourCanvas.jsx';
import SlopeGauge from './Diagrams/SlopeGauge.jsx';
import DrainageGraph from './Diagrams/DrainageGraph.jsx';
import StrataProfile from './Diagrams/StrataProfile.jsx';
import PBRSwatch from './Diagrams/PBRSwatch.jsx';
import SunGizmo from './Diagrams/SunGizmo.jsx';

export default function Inspector({
  activeTab,
  selectedLayer,
  onUpdateLayer,
  onResetLayer,
  environmentState,
  onUpdateEnvironment,
  onTriggerRain
}) {
  // Helper for sliders
  const renderSlider = (val, min, max, step, onChange, unit = '') => {
    const progress = Math.min(100, Math.max(0, ((val - min) / (max - min)) * 100));
    return (
      <div className="frontier-slider-wrapper">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={val}
          style={{ '--progress': `${progress}%` }}
          onChange={(e) => onChange(parseFloat(e.target.value))}
        />
      </div>
    );
  };

  // Helper for metric numbers
  const renderMetric = (val, unit) => (
    <div className="metric">
      {val}<small>{unit}</small>
    </div>
  );

  // Helper for card wrapper
  const renderCard = (title, Icon, content, extraClass = '') => (
    <div className={`card ${extraClass}`}>
      <div className="card-heading">
        <span>
          <Icon size={16} />
          {title}
        </span>
      </div>
      <div className="card-body">
        {content}
      </div>
    </div>
  );

  // RENDER ATMOSPHERE & SUN ENVIRONMENT INSPECTOR
  if (activeTab === 'environment') {
    const env = environmentState;
    return (
      <div className="inspector-panel">
        <div className="object-header">
          <div className="object-title">
            <div className="object-icon" style={{ color: '#e8b65f' }}>
              <Sun size={28} />
            </div>
            <div>
              <div className="eyebrow">ENVIRONMENT / LIGHTING</div>
              <h1>Atmosphere & Sun</h1>
            </div>
          </div>
          <div className="object-actions">
            <button
              className={`enabled-pill ${env.sunEnabled ? '' : 'disabled'}`}
              onClick={() => onUpdateEnvironment({ sunEnabled: !env.sunEnabled })}
            >
              <span />
              {env.sunEnabled ? 'SUNLIGHT ACTIVE' : 'MUTED'}
            </button>
          </div>
        </div>

        <div className="cards sun">
          {renderCard('Sun Direction & Celestial Compass', Orbit, (
            <>
              <div className="direction-top">
                <div className="metric">{env.sunElevation}°<small>elev</small></div>
                <span className="metric-caption">{env.sunAzimuth}° azimuth</span>
              </div>
              <SunGizmo
                azimuth={env.sunAzimuth}
                elevation={env.sunElevation}
                onChange={(az, el) => onUpdateEnvironment({ sunAzimuth: az, sunElevation: el })}
              />
              <div className="range-labels">
                <span>Azimuth: {env.sunAzimuth}°</span>
                <span>Elevation: {env.sunElevation}°</span>
              </div>
            </>
          ), 'direction-card')}

          {renderCard('Direct Sunlight Illuminance', Sun, (
            <>
              {renderMetric(env.sunIntensity.toFixed(1), 'klux')}
              <p className="muted">Sunlight radiant intensity</p>
              {renderSlider(env.sunIntensity, 0.5, 5.0, 0.1, (v) => onUpdateEnvironment({ sunIntensity: v }))}
              <div className="range-labels">
                <span>0.5 klux · Dim Twilight</span>
                <span>5.0 klux · Glare</span>
              </div>
            </>
          ))}

          {renderCard('Water Basin / Sea Level', Waves, (
            <>
              <div className="direction-top">
                {renderMetric(env.waterHeight.toFixed(1), 'm')}
                <button
                  className={`small-pill ${env.waterVisible ? 'active' : ''}`}
                  onClick={() => onUpdateEnvironment({ waterVisible: !env.waterVisible })}
                >
                  {env.waterVisible ? 'Water Basin ON' : 'Water Basin OFF'}
                </button>
              </div>
              <p className="muted">Lake & ocean surface datum plane</p>
              {renderSlider(env.waterHeight, 0, 80, 0.5, (v) => onUpdateEnvironment({ waterHeight: v }))}
              <div className="range-labels">
                <span>0 m (Dry Basin)</span>
                <span>80 m (Deep Ocean)</span>
              </div>
            </>
          ))}

          {renderCard('Atmospheric Aerial Haze', Wind, (
            <>
              {renderMetric(Math.round(env.fogDensity * 10000), 'haze')}
              <p className="muted">Rayleigh scattering & distance fog density</p>
              {renderSlider(env.fogDensity, 0.0002, 0.004, 0.0001, (v) => onUpdateEnvironment({ fogDensity: v }))}
              <div className="range-labels">
                <span>Clear Alpine Air</span>
                <span>Misty Valley Haze</span>
              </div>
            </>
          ))}
        </div>
      </div>
    );
  }

  if (!selectedLayer) {
    return (
      <div className="inspector-panel empty">
        <p className="muted">Select a layer in the layerstack above to inspect its parameters.</p>
      </div>
    );
  }

  // RENDER TERRAIN SHAPE LAYER INSPECTOR
  if (activeTab === 'shape') {
    const layer = selectedLayer;
    const p = layer.params || {};

    const updateParam = (key, val) => {
      onUpdateLayer(layer.id, {
        params: { ...layer.params, [key]: val }
      });
    };

    return (
      <div className="inspector-panel">
        <div className="object-header">
          <div className="object-title">
            <div className="object-icon" style={{ color: '#d6a078' }}>
              <Mountain size={28} />
            </div>
            <div>
              <div className="eyebrow">GEOLOGICAL SHAPE PASS · {layer.type?.toUpperCase()}</div>
              <h1>{layer.name}</h1>
            </div>
          </div>
          <div className="object-actions">
            <button
              className={`enabled-pill ${layer.enabled ? '' : 'disabled'}`}
              onClick={() => onUpdateLayer(layer.id, { enabled: !layer.enabled })}
            >
              <span />
              {layer.enabled ? 'ACTIVE' : 'BYPASSED'}
            </button>
          </div>
        </div>

        {/* Global Layer Blend & Opacity */}
        <div className="card layer-blend-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#c0c5d0' }}>Layer Opacity & Blend Mode</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select
                className="frontier-select"
                value={layer.blendMode}
                onChange={(e) => onUpdateLayer(layer.id, { blendMode: e.target.value })}
              >
                <option value="base">Base</option>
                <option value="add">Add (+)</option>
                <option value="max">Max (Peak)</option>
                <option value="terrace">Terrace</option>
                <option value="carve">Carve (-)</option>
                <option value="relax">Relax</option>
              </select>
              <span style={{ fontSize: 13, fontWeight: 300, color: '#e0e4ee' }}>
                {Math.round((layer.opacity ?? 1.0) * 100)}%
              </span>
            </div>
          </div>
          {renderSlider(layer.opacity ?? 1.0, 0.0, 1.0, 0.02, (v) => onUpdateLayer(layer.id, { opacity: v }))}
        </div>

        {/* LAYER-SPECIFIC CARDS */}
        <div className="cards">
          {(layer.type === 'ridged' || layer.type === 'base') && (
            <>
              {renderCard('Peak Elevation & Topography', Mountain, (
                <>
                  <div className="direction-top">
                    {renderMetric(Math.round(p.elevation || 240), 'm')}
                    <span className="small-pill">Topography</span>
                  </div>
                  <p className="muted">Maximum vertical mountain relief</p>
                  <ContourCanvas
                    altitude={p.elevation || 240}
                    roughness={Math.round((p.sharpness || 2.0) * 30)}
                    erosion={40}
                  />
                  {renderSlider(p.elevation || 240, 50, 500, 5, (v) => updateParam('elevation', v))}
                  <div className="range-labels">
                    <span>Lowlands (50m)</span>
                    <span>High Alpine Summit (500m)</span>
                  </div>
                </>
              ), 'wide-card')}

              {renderCard('Ridge Crest Sharpness', Sparkles, (
                <>
                  {renderMetric((p.sharpness || 2.0).toFixed(1), '×')}
                  <p className="muted">Gaea razor ridge multifractal power</p>
                  {renderSlider(p.sharpness || 2.0, 1.0, 4.0, 0.1, (v) => updateParam('sharpness', v))}
                  <div className="range-labels">
                    <span>Rounded Dome</span>
                    <span>Razor Arete</span>
                  </div>
                </>
              ))}

              {renderCard('Domain Tectonic Warping', Wind, (
                <>
                  {renderMetric((p.warp || 1.2).toFixed(1), 'fold')}
                  <p className="muted">Tectonic fold distortion and fault slip</p>
                  {renderSlider(p.warp || 1.2, 0.0, 3.0, 0.1, (v) => updateParam('warp', v))}
                  <div className="range-labels">
                    <span>Uniform Range</span>
                    <span>Twisted Tectonics</span>
                  </div>
                </>
              ))}

              {renderCard('Fractal Frequency & Octaves', Sliders, (
                <>
                  <div className="direction-top">
                    {renderMetric(p.octaves || 6, 'oct')}
                    <button
                      className="reset"
                      onClick={() => updateParam('seed', Math.floor(Math.random() * 99999))}
                      title="Regenerate Seed"
                    >
                      Seed {p.seed || 1337} <RotateCcw size={12} />
                    </button>
                  </div>
                  <p className="muted">Detail frequency levels</p>
                  {renderSlider(p.scale || 1.1, 0.4, 2.5, 0.05, (v) => updateParam('scale', v))}
                  <div className="range-labels">
                    <span>Broad Masses (0.4)</span>
                    <span>Tight Peaks (2.5)</span>
                  </div>
                </>
              ))}
            </>
          )}

          {layer.type === 'strata' && (
            <>
              {renderCard('Strata Frequency & Terracing', Layers, (
                <>
                  <div className="direction-top">
                    {renderMetric(p.frequency || 14, 'strata')}
                    <span className="small-pill">Sedimentary</span>
                  </div>
                  <p className="muted">Number of geological step shelves</p>
                  <StrataProfile
                    frequency={p.frequency || 14}
                    hardness={p.hardness || 0.65}
                    bevel={p.bevel || 0.45}
                  />
                  {renderSlider(p.frequency || 14, 4, 32, 1, (v) => updateParam('frequency', v))}
                  <div className="range-labels">
                    <span>4 Massive Cliffs</span>
                    <span>32 Thin Shales</span>
                  </div>
                </>
              ), 'wide-card')}

              {renderCard('Rock Hardness Differential', Mountain, (
                <>
                  {renderMetric(Math.round((p.hardness || 0.65) * 100), '%')}
                  <p className="muted">Contrast between hard caprock and soft beds</p>
                  {renderSlider(p.hardness || 0.65, 0.1, 1.0, 0.02, (v) => updateParam('hardness', v))}
                  <div className="range-labels">
                    <span>Soft Slope</span>
                    <span>Sheer Mesa Drop</span>
                  </div>
                </>
              ))}

              {renderCard('Terrace Shelf Bevel', Sliders, (
                <>
                  {renderMetric(Math.round((p.bevel || 0.45) * 100), '%')}
                  <p className="muted">Smooth rounding of ledge edges</p>
                  {renderSlider(p.bevel || 0.45, 0.0, 1.0, 0.02, (v) => updateParam('bevel', v))}
                  <div className="range-labels">
                    <span>Step Sharpness</span>
                    <span>Weathered Ledge</span>
                  </div>
                </>
              ))}
            </>
          )}

          {layer.type === 'hydraulic' && (
            <>
              {renderCard('Droplet Rainfall Cycles', Droplets, (
                <>
                  <div className="direction-top">
                    {renderMetric(Math.round((p.iterations || 50000) / 1000), 'k drops')}
                    <button
                      className="layerstack-add-btn"
                      onClick={onTriggerRain}
                      title="Trigger interactive rain droplet particles in viewport"
                    >
                      <Droplets size={13} />
                      Simulate Rain Particle FX
                    </button>
                  </div>
                  <p className="muted">Physical raindrops simulated downhill</p>
                  <DrainageGraph
                    erosionRate={p.erosionRate || 0.38}
                    capacity={p.capacityFactor || 3.5}
                  />
                  {renderSlider(p.iterations || 50000, 10000, 100000, 2000, (v) => updateParam('iterations', v))}
                  <div className="range-labels">
                    <span>10k Mild Rain</span>
                    <span>100k Ancient Monsoons</span>
                  </div>
                </>
              ), 'wide-card')}

              {renderCard('Sediment Capacity Factor', Waves, (
                <>
                  {renderMetric((p.capacityFactor || 3.5).toFixed(1), 'Kc')}
                  <p className="muted">Volume of rock water carries before deposition</p>
                  {renderSlider(p.capacityFactor || 3.5, 1.0, 8.0, 0.2, (v) => updateParam('capacityFactor', v))}
                  <div className="range-labels">
                    <span>Light Carving</span>
                    <span>Heavy Canyon Gouge</span>
                  </div>
                </>
              ))}

              {renderCard('Rock Dissolution Rate', Mountain, (
                <>
                  {renderMetric(Math.round((p.erosionRate || 0.38) * 100), '%')}
                  <p className="muted">Gully depth and riverbed carve speed</p>
                  {renderSlider(p.erosionRate || 0.38, 0.1, 0.8, 0.02, (v) => updateParam('erosionRate', v))}
                  <div className="range-labels">
                    <span>Granite Hardness</span>
                    <span>Friable Sandstone</span>
                  </div>
                </>
              ))}
            </>
          )}

          {layer.type === 'thermal' && (
            <>
              {renderCard('Angle of Repose & Talus Scree', Sparkles, (
                <>
                  <div className="direction-top">
                    {renderMetric(p.talusAngle || 35, '° repose')}
                    <span className="small-pill">Thermal Gravity</span>
                  </div>
                  <p className="muted">Critical angle where rock breaks and rolls downhill</p>
                  <SlopeGauge angle={p.talusAngle || 35} />
                  {renderSlider(p.talusAngle || 35, 25, 50, 1, (v) => updateParam('talusAngle', v))}
                  <div className="range-labels">
                    <span>Fine Sand (25°)</span>
                    <span>Coarse Boulders (50°)</span>
                  </div>
                </>
              ), 'wide-card')}

              {renderCard('Talus Weathering Iterations', RotateCcw, (
                <>
                  {renderMetric(p.iterations || 16, 'passes')}
                  <p className="muted">Duration of freeze-thaw cliff breakdown</p>
                  {renderSlider(p.iterations || 16, 4, 32, 1, (v) => updateParam('iterations', v))}
                  <div className="range-labels">
                    <span>Recent Rockfall</span>
                    <span>Mature Scree Apron</span>
                  </div>
                </>
              ))}

              {renderCard('Scree Transfer Rate', Mountain, (
                <>
                  {renderMetric(Math.round((p.talusRate || 0.45) * 100), '%')}
                  <p className="muted">Volume of rock transferred to lower cells</p>
                  {renderSlider(p.talusRate || 0.45, 0.1, 0.9, 0.05, (v) => updateParam('talusRate', v))}
                  <div className="range-labels">
                    <span>Sparse Scree</span>
                    <span>Deep Debris Cones</span>
                  </div>
                </>
              ))}
            </>
          )}

          {layer.type === 'glacial' && (
            <>
              {renderCard('Glacial Gouge Depth', Waves, (
                <>
                  {renderMetric(p.depth || 35, 'm')}
                  <p className="muted">U-valley floor excavation depth</p>
                  {renderSlider(p.depth || 35, 10, 80, 2, (v) => updateParam('depth', v))}
                  <div className="range-labels">
                    <span>Shallow Cirque</span>
                    <span>Deep Fjord Chasm</span>
                  </div>
                </>
              ))}
              {renderCard('Valley Width & Profile', Sliders, (
                <>
                  {renderMetric((p.width || 1.3).toFixed(1), '×')}
                  <p className="muted">U-shaped glacial parabolic width</p>
                  {renderSlider(p.width || 1.3, 0.5, 3.0, 0.1, (v) => updateParam('width', v))}
                  <div className="range-labels">
                    <span>Narrow Gorge</span>
                    <span>Expansive Trough</span>
                  </div>
                </>
              ))}
            </>
          )}

          {layer.type === 'coastal' && (
            <>
              {renderCard('Wave Cut Sea Cliff Depth', Waves, (
                <>
                  {renderMetric(Math.round((p.waveCut || 0.8) * 100), '%')}
                  <p className="muted">Erosion along the sea level datum</p>
                  {renderSlider(p.waveCut || 0.8, 0.2, 1.0, 0.05, (v) => updateParam('waveCut', v))}
                </>
              ))}
              {renderCard('Waterline Elevation', Mountain, (
                <>
                  {renderMetric(p.waterLevel || 22, 'm')}
                  <p className="muted">Tidal sea level cut point</p>
                  {renderSlider(p.waterLevel || 22, 5, 60, 1, (v) => updateParam('waterLevel', v))}
                </>
              ))}
            </>
          )}
        </div>
      </div>
    );
  }

  // RENDER TEXTURE / BIOME LAYER INSPECTOR
  if (activeTab === 'texture') {
    const layer = selectedLayer;

    return (
      <div className="inspector-panel">
        <div className="object-header">
          <div className="object-title">
            <div className="object-icon" style={{ color: layer.color || '#99aafa' }}>
              <Palette size={28} />
            </div>
            <div>
              <div className="eyebrow">PBR BIOME MATERIAL LAYER</div>
              <h1>{layer.name}</h1>
            </div>
          </div>
          <div className="object-actions">
            <button
              className={`enabled-pill ${layer.enabled ? '' : 'disabled'}`}
              onClick={() => onUpdateLayer(layer.id, { enabled: !layer.enabled })}
            >
              <span />
              {layer.enabled ? 'ACTIVE' : 'MUTED'}
            </button>
          </div>
        </div>

        {/* PBR MATERIAL SWATCH CARD */}
        {renderCard('PBR Material Response & Color', Palette, (
          <>
            <PBRSwatch
              color={layer.color || '#4f5059'}
              roughness={layer.roughness ?? 0.85}
              metalness={layer.metalness ?? 0.04}
              normalScale={layer.normalScale ?? 1.0}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 12 }}>
              <div>
                <label style={{ fontSize: 10, color: '#9fa5b5', display: 'block', marginBottom: 6 }}>
                  Hex Color Tint
                </label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="color"
                    value={layer.color || '#4f5059'}
                    onChange={(e) => onUpdateLayer(layer.id, { color: e.target.value })}
                    style={{
                      width: 36,
                      height: 32,
                      border: '1px solid #373b47',
                      borderRadius: 6,
                      background: 'none',
                      cursor: 'pointer'
                    }}
                  />
                  <input
                    type="text"
                    value={layer.color || '#4f5059'}
                    onChange={(e) => onUpdateLayer(layer.id, { color: e.target.value })}
                    className="frontier-text-input"
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 10, color: '#9fa5b5', display: 'block', marginBottom: 6 }}>
                  Roughness: {Math.round((layer.roughness ?? 0.85) * 100)}%
                </label>
                {renderSlider(layer.roughness ?? 0.85, 0.05, 1.0, 0.02, (v) => onUpdateLayer(layer.id, { roughness: v }))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
              <div>
                <label style={{ fontSize: 10, color: '#9fa5b5', display: 'block', marginBottom: 6 }}>
                  Micro-Normal Bump: {(layer.normalScale ?? 1.0).toFixed(1)}×
                </label>
                {renderSlider(layer.normalScale ?? 1.0, 0.0, 2.5, 0.1, (v) => onUpdateLayer(layer.id, { normalScale: v }))}
              </div>
              <div>
                <label style={{ fontSize: 10, color: '#9fa5b5', display: 'block', marginBottom: 6 }}>
                  Layer Opacity: {Math.round((layer.opacity ?? 1.0) * 100)}%
                </label>
                {renderSlider(layer.opacity ?? 1.0, 0.0, 1.0, 0.02, (v) => onUpdateLayer(layer.id, { opacity: v }))}
              </div>
            </div>
          </>
        ), 'wide-card')}

        {/* SLOPE MASK CARD */}
        <div className="cards">
          {renderCard('Slope Angle Masking', Mountain, (
            <>
              <div className="direction-top">
                <div className="metric">{layer.minSlope}° - {layer.maxSlope}°</div>
                <span className="small-pill">Incline</span>
              </div>
              <p className="muted">Angles where this biome clings vs sheds</p>
              <SlopeGauge angle={layer.minSlope || 30} />
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 10, color: '#999ea9', marginBottom: 4 }}>Minimum Slope: {layer.minSlope}°</div>
                {renderSlider(layer.minSlope, 0, 90, 1, (v) => onUpdateLayer(layer.id, { minSlope: v }))}
              </div>
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 10, color: '#999ea9', marginBottom: 4 }}>Maximum Slope: {layer.maxSlope}°</div>
                {renderSlider(layer.maxSlope, 0, 90, 1, (v) => onUpdateLayer(layer.id, { maxSlope: v }))}
              </div>
            </>
          ))}

          {/* ELEVATION MASK CARD */}
          {renderCard('Altitude Elevation Range', Layers, (
            <>
              <div className="direction-top">
                <div className="metric">{layer.minElevation}m - {layer.maxElevation}m</div>
                <span className="small-pill">Altitude</span>
              </div>
              <p className="muted">Elevation boundary (snowline, treeline, beaches)</p>
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 10, color: '#999ea9', marginBottom: 4 }}>Min Altitude: {layer.minElevation}m</div>
                {renderSlider(layer.minElevation, 0, 500, 5, (v) => onUpdateLayer(layer.id, { minElevation: v }))}
              </div>
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 10, color: '#999ea9', marginBottom: 4 }}>Max Altitude: {layer.maxElevation}m</div>
                {renderSlider(layer.maxElevation, 0, 500, 5, (v) => onUpdateLayer(layer.id, { maxElevation: v }))}
              </div>
            </>
          ))}
        </div>

        {/* ENVIRONMENTAL FEATURE MASKS */}
        {renderCard('Dynamic Geological Feature Masks', Sparkles, (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            <button
              className={`property-switch ${layer.useFlowMask ? 'is-on' : 'is-off'}`}
              onClick={() => onUpdateLayer(layer.id, { useFlowMask: !layer.useFlowMask })}
            >
              <span className="switch-icon">
                <Droplets size={16} />
              </span>
              <span className="switch-name">Flow Mask</span>
              <span className="switch-state">{layer.useFlowMask ? 'APPLIED' : 'OFF'}</span>
            </button>

            <button
              className={`property-switch ${layer.useTalusMask ? 'is-on' : 'is-off'}`}
              onClick={() => onUpdateLayer(layer.id, { useTalusMask: !layer.useTalusMask })}
            >
              <span className="switch-icon">
                <Sparkles size={16} />
              </span>
              <span className="switch-name">Talus Scree</span>
              <span className="switch-state">{layer.useTalusMask ? 'APPLIED' : 'OFF'}</span>
            </button>

            <button
              className={`property-switch ${layer.useCavityMask ? 'is-on' : 'is-off'}`}
              onClick={() => onUpdateLayer(layer.id, { useCavityMask: !layer.useCavityMask })}
            >
              <span className="switch-icon">
                <Layers size={16} />
              </span>
              <span className="switch-name">Cavity AO</span>
              <span className="switch-state">{layer.useCavityMask ? 'APPLIED' : 'OFF'}</span>
            </button>
          </div>
        ), 'wide-card')}
      </div>
    );
  }

  return null;
}

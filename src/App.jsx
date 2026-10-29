import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowDownToLine, ArrowRight, Check, ChevronDown, CircleHelp, Copy, Dice5,
  Focus, Grid2X2, Layers3, Maximize2, Mouse, Move, Rotate3D, RotateCcw,
  ScanLine, Sparkles, Sun, Sunrise, X,
} from 'lucide-react';
import RockViewport from './components/RockViewport.jsx';
import { DEFAULT_SETTINGS, FORMATIONS, MATERIALS, normalizeSettings } from './generator/presets.js';

const numberFormatter = new Intl.NumberFormat('en-US');

function FrontierMark() {
  return <svg className="frontier-mark" viewBox="0 0 28 28" aria-hidden="true"><path d="M3 22.5 12.8 4l3.7 6.8 3-5.4L25 16h-5.4l-3-5.2-6.1 11.7H3Z" fill="currentColor"/><path d="M15.1 22.5 19 15l4.2 7.5h-8.1Z" fill="currentColor" opacity=".5"/></svg>;
}

function FormationIcon({ kind }) {
  if (kind === 'cliff') return <svg viewBox="0 0 54 31" fill="none" aria-hidden="true"><path d="M4 25.5h46M9 25V14l6-7 8 2 5-5 8 5 7 1 2 15M15 7l2 8-4 5m10-11-1 8 5 8m1-21 1 12 6 4m1-11-1 8 5 8" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round"/></svg>;
  if (kind === 'boulder') return <svg viewBox="0 0 54 31" fill="none" aria-hidden="true"><path d="M5 25.5h44M11 24l-1-7 5-8 10-4 10 3 7 7 1 9M15 9l6 6-2 9m6-19 1 10 9 7m0-14-4 7 11 2" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round"/></svg>;
  return <svg viewBox="0 0 54 31" fill="none" aria-hidden="true"><path d="M4 25.5h46M7 24l3-9 7-4 5 3 6-9 7 2 5 9 5 2 2 6M10 15l6 3 1 6m5-10-1 7m7-16 1 9 7 5m-1-12-2 8m7 1-3 8" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

function SectionHeading({ number, children, action }) {
  return <div className="section-heading"><div><span className="section-number">{number}</span><span>{children}</span></div>{action}</div>;
}

function RangeControl({ id, label, value, min, max, step, format, onChange, description }) {
  const progress = (value - min) / (max - min) * 100;
  return <div className="range-control">
    <div className="range-label"><label htmlFor={id} title={description}>{label}</label><span>{format(value)}</span></div>
    <input id={id} aria-label={label} title={description} type="range" min={min} max={max} step={step} value={value} style={{ '--range-progress': `${progress}%` }} onChange={(event) => onChange(Number(event.target.value))} />
  </div>;
}

function Toggle({ label, icon: Icon, checked, onChange }) {
  return <label className="toggle-row"><span className="toggle-label"><Icon size={15} strokeWidth={1.6} />{label}</span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><span className="switch" aria-hidden="true" /></label>;
}

function App() {
  const [settings, setSettings] = useState({ ...DEFAULT_SETTINGS });
  const [seedDraft, setSeedDraft] = useState(String(DEFAULT_SETTINGS.seed));
  const [materialId, setMaterialId] = useState('granite');
  const [wireframe, setWireframe] = useState(false);
  const [grid, setGrid] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [lighting, setLighting] = useState('studio');
  const [stats, setStats] = useState(null);
  const [status, setStatus] = useState({ state: 'generating', message: '' });
  const [retryKey, setRetryKey] = useState(0);
  const [exportOpen, setExportOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState('');
  const viewportRef = useRef(null);
  const exportRef = useRef(null);
  const material = MATERIALS.find((item) => item.id === materialId) || MATERIALS[0];
  const formation = FORMATIONS.find((item) => item.id === settings.kind) || FORMATIONS[0];
  const ready = status.state === 'ready';
  const reloadRequired = status.action === 'reload' || status.message.startsWith('WebGL');

  useEffect(() => setSeedDraft(String(settings.seed)), [settings.seed]);
  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (!showHelp) return undefined;
    const handleKey = (event) => { if (event.key === 'Escape') setShowHelp(false); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [showHelp]);
  useEffect(() => {
    if (!exportOpen) return undefined;
    const handleClick = (event) => {
      if (exportRef.current && !exportRef.current.contains(event.target)) setExportOpen(false);
    };
    const handleKey = (event) => { if (event.key === 'Escape') setExportOpen(false); };
    document.addEventListener('pointerdown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('pointerdown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [exportOpen]);

  const patch = (update) => setSettings((previous) => normalizeSettings({ ...previous, ...update }));
  const randomize = () => {
    const values = new Uint32Array(1);
    if (window.crypto?.getRandomValues) window.crypto.getRandomValues(values);
    else values[0] = Math.floor(Math.random() * 4294967296);
    patch({ seed: values[0] });
  };
  const commitSeed = () => {
    if (!/^\d+$/.test(seedDraft)) {
      setSeedDraft(String(settings.seed));
      return;
    }
    const value = Math.min(4294967295, Math.max(0, Number(seedDraft)));
    patch({ seed: value });
    setSeedDraft(String(value));
  };
  const reset = () => {
    setSettings({ ...DEFAULT_SETTINGS });
    setMaterialId('granite');
    setWireframe(false);
    setGrid(false);
    setAutoRotate(false);
    setLighting('studio');
    setToast('Generator settings reset');
  };
  const handleExport = async (format) => {
    setExportOpen(false);
    setExporting(true);
    try {
      await viewportRef.current.exportMesh(format);
      setToast(`${format.toUpperCase()} downloaded`);
    } catch (error) {
      console.error(error);
      setToast(`Export failed: ${error.message}`);
    } finally {
      setExporting(false);
    }
  };
  const copySeed = async () => {
    try {
      await navigator.clipboard.writeText(String(settings.seed));
      setToast('Seed copied to clipboard');
    } catch {
      setToast('Select the seed field to copy it');
    }
  };
  const handleStats = useCallback((value) => setStats(value), []);
  const handleStatus = useCallback((value) => setStatus(value), []);

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand"><FrontierMark /><span>FRONTIER</span></div>
      <div className="topbar-divider" />
      <div className="product-name">Rock Lab <span className="product-version">/ GENERATOR</span></div>
      <div className="topbar-spacer" />
      <div className="project-indicator"><span className="project-dot" /> <span>PROCEDURAL TOOLKIT</span><span className="project-version">V 1.0</span></div>
      <div className="topbar-actions">
        <button className="icon-button help-button" aria-label="Open guide" title="How to use Rock Lab" aria-haspopup="dialog" onClick={() => setShowHelp(true)}><CircleHelp size={18} strokeWidth={1.6} /></button>
        <div className="export-wrapper" ref={exportRef}>
          <button className="export-button" disabled={!ready || exporting} onClick={() => setExportOpen((open) => !open)} aria-haspopup="menu" aria-expanded={exportOpen}><ArrowDownToLine size={16} strokeWidth={1.8} /><span>{exporting ? 'Exporting...' : 'Export mesh'}</span><ChevronDown size={14} className={exportOpen ? 'chevron-open' : ''} /></button>
          {exportOpen && <div className="export-menu" role="menu">
            <div className="export-menu-title">EXPORT FORMATION</div>
            <button role="menuitem" onClick={() => handleExport('glb')}><span className="format-icon">3D</span><span><strong>GLB mesh</strong><small>Mesh, material &amp; normals</small></span><ArrowRight size={15} /></button>
            <button role="menuitem" onClick={() => handleExport('obj')}><span className="format-icon">OBJ</span><span><strong>Wavefront OBJ</strong><small>Geometry &amp; normals only</small></span><ArrowRight size={15} /></button>
            <p>Exports the formation only, in meters.</p>
          </div>}
        </div>
      </div>
    </header>

    <main className="workspace">
      <aside className="left-panel panel-scroll" aria-label="Generator settings">
        <div className="panel-intro">
          <div className="eyebrow"><span className="eyebrow-line" /> PROCEDURAL ASSET TOOL <span className="tiny-index">01 / 03</span></div>
          <h1>Rock generator<span className="heading-period">.</span></h1>
          <p>Build a little piece of the wild.</p>
        </div>

        <div className="control-section formation-section">
          <SectionHeading number="01">FORMATION TYPE</SectionHeading>
          <div className="formation-options" role="group" aria-label="Formation type">
            {FORMATIONS.map((option) => <button key={option.id} className={`formation-option ${settings.kind === option.id ? 'selected' : ''}`} onClick={() => patch({ kind: option.id })} aria-pressed={settings.kind === option.id} title={option.description}>
              <FormationIcon kind={option.id} /><span>{option.label}</span>{settings.kind === option.id && <span className="option-indicator" />}
            </button>)}
          </div>
        </div>

        <div className="control-section seed-section">
          <SectionHeading number="02" action={<button className="text-action" onClick={reset} title="Reset all settings"><RotateCcw size={12} /> Reset</button>}>GENERATION SEED</SectionHeading>
          <div className="seed-input-wrap"><span className="seed-hash">#</span><input aria-label="Generation seed" inputMode="numeric" value={seedDraft} onChange={(event) => setSeedDraft(event.target.value.replace(/\D/g, '').slice(0, 10))} onBlur={commitSeed} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); if (event.key === 'Escape') { setSeedDraft(String(settings.seed)); event.currentTarget.blur(); } }} /><button onClick={copySeed} aria-label="Copy seed" title="Copy seed"><Copy size={14} /></button><span className="seed-divider"/><button onClick={randomize} aria-label="Randomize seed" title="Randomize seed"><Dice5 size={16} /></button></div>
          <p className="field-hint">Press Enter to apply · repeatable with settings.</p>
        </div>

        <div className="control-section shape-section">
          <SectionHeading number="03">SHAPE &amp; STRUCTURE</SectionHeading>
          <RangeControl id="width" label="Width" value={settings.width} min={0.6} max={1.6} step={0.05} format={(value) => `${value.toFixed(2)}×`} onChange={(value) => patch({ width: value })} description="Scale the horizontal footprint of the formation." />
          <RangeControl id="height" label="Height" value={settings.height} min={0.6} max={1.6} step={0.05} format={(value) => `${value.toFixed(2)}×`} onChange={(value) => patch({ height: value })} description="Scale the height of the rock masses." />
          <RangeControl id="fracture" label="Fracture density" value={settings.fracture} min={0} max={100} step={1} format={(value) => `${value}%`} onChange={(value) => patch({ fracture: value })} description="Change the number and spacing of real fracture cells." />
          <RangeControl id="joints" label="Vertical joint bias" value={settings.joints} min={0} max={100} step={1} format={(value) => `${value}%`} onChange={(value) => patch({ joints: value })} description="Bias the fracture planes toward taller, more vertical joints." />
          <RangeControl id="weathering" label="Weathering" value={settings.weathering} min={0} max={100} step={1} format={(value) => `${value}%`} onChange={(value) => patch({ weathering: value })} description="Chip corners and erode the exposed faces." />
          <RangeControl id="detail" label="Surface detail" value={settings.detail} min={0} max={100} step={1} format={(value) => `${value}%`} onChange={(value) => patch({ detail: value })} description="Adjust geometric surface relief and mesh subdivision." />
        </div>

        <div className="left-bottom">
          <button className="generate-button" onClick={randomize}><Sparkles size={15} strokeWidth={1.7} /><span>Generate new formation</span><ArrowRight size={15} className="generate-arrow" /></button>
          <div className="generate-caption"><span className="live-dot" /> PARAMETERS UPDATE LIVE <span>✳</span></div>
        </div>
      </aside>

      <section className="viewport" aria-label="3D formation preview">
        <RockViewport ref={viewportRef} settings={settings} retryKey={retryKey} material={material} wireframe={wireframe} grid={grid} autoRotate={autoRotate} lighting={lighting} onStats={handleStats} onStatus={handleStatus} />
        <div className="viewport-top-left">
          <div className="viewport-kicker"><span className="view-dot" /> LIVE FORMATION <span className="kicker-line" /> {String(FORMATIONS.findIndex((item) => item.id === settings.kind) + 1).padStart(2, '0')} / 03</div>
          <div className="viewport-title">{formation.label}<span> formation</span></div>
          <div className="viewport-subtitle">PROCEDURALLY GENERATED <span>/</span> SEED {settings.seed}</div>
        </div>
        <div className="viewport-top-right"><span className="perspective-indicator"><span className="perspective-square" /> PERSPECTIVE</span><button onClick={() => viewportRef.current?.resetCamera()} title="Frame formation" aria-label="Frame formation"><Focus size={16} strokeWidth={1.7} /></button></div>
        {status.state === 'generating' && <div className="building-indicator"><span className="spinner" /> {status.message || 'Generating geometry'}</div>}
        {status.state === 'error' && <div className="viewport-error" role="alert"><strong>{status.message.startsWith('WebGL') ? '3D preview unavailable.' : 'Couldn’t generate this formation.'}</strong><span>{status.message}</span><button onClick={reloadRequired ? () => window.location.reload() : () => setRetryKey((key) => key + 1)}>{reloadRequired ? 'Reload preview' : 'Try again'}</button></div>}
        <div className="viewport-bottom">
          <div className="viewport-hints"><span><Mouse size={14} /> <b>DRAG</b> ORBIT</span><i /><span><Move size={14} /> <b>RIGHT DRAG</b> PAN</span><i /><span><ScanLine size={14} /> <b>SCROLL</b> ZOOM</span></div>
          <button className="frame-button" onClick={() => viewportRef.current?.resetCamera()} title="Reset camera"><Maximize2 size={14} /> <span>FRAME</span></button>
        </div>
        <div className="viewport-edge-label">FRONTIER <span> / </span> ROCK LAB</div>
      </section>

      <aside className="right-panel panel-scroll" aria-label="Asset inspector">
        <div className="inspector-heading"><div><span className="panel-overline">THE DETAILS</span><h2>Asset inspector</h2></div><span className={`ready-badge ${ready ? '' : status.state === 'error' ? 'failed' : 'pending'}`}><span />{ready ? 'READY' : status.state === 'error' ? 'ERROR' : 'BUILDING'}</span></div>
        <div className="inspector-content">
          <div className="asset-summary">
            <div className="summary-top"><div className="summary-icon"><Layers3 size={17} strokeWidth={1.5}/></div><div><strong>{formation.label} formation</strong><span>PROCEDURAL MESH</span></div><span className="summary-index">01</span></div>
            <div className="summary-rule" />
            <div className="summary-metrics"><div><span>FRAGMENTS</span><strong>{stats ? numberFormatter.format(stats.fragments) : '—'}</strong></div><div><span>TRIANGLES</span><strong>{stats ? numberFormatter.format(stats.triangles) : '—'}</strong></div></div>
            <div className="summary-dimensions"><span>DIMENSIONS</span><strong>{stats ? stats.dimensions.map((value) => value.toFixed(1)).join(' × ') : '—'} <small>m</small></strong></div>
          </div>

          <div className="inspector-section material-section">
            <SectionHeading number="04">STONE MATERIAL</SectionHeading>
            <p className="section-description">Choose a natural stone tone.</p>
            <div className="material-options" role="group" aria-label="Stone material">
              {MATERIALS.map((item) => <button key={item.id} className={`material-option ${materialId === item.id ? 'selected' : ''}`} onClick={() => setMaterialId(item.id)} aria-pressed={materialId === item.id} title={item.description}>
                <span className={`material-swatch ${item.id}`} style={{ '--swatch': item.color }}>{materialId === item.id && <Check size={14} strokeWidth={2} />}</span><span>{item.label}</span>
              </button>)}
            </div>
            <div className="material-property"><span>FINISH</span><strong>Natural / rough</strong></div>
          </div>

          <div className="inspector-section view-section">
            <SectionHeading number="05">VIEW SETTINGS</SectionHeading>
            <Toggle icon={Grid2X2} label="Ground grid" checked={grid} onChange={setGrid} />
            <Toggle icon={Layers3} label="Wireframe" checked={wireframe} onChange={setWireframe} />
            <Toggle icon={Rotate3D} label="Auto rotate" checked={autoRotate} onChange={setAutoRotate} />
            <div className="lighting-heading">LIGHTING</div>
            <div className="lighting-options" role="group" aria-label="Lighting">
              <button className={lighting === 'studio' ? 'selected' : ''} onClick={() => setLighting('studio')} aria-pressed={lighting === 'studio'}><Sun size={14} /> Neutral</button>
              <button className={lighting === 'warm' ? 'selected' : ''} onClick={() => setLighting('warm')} aria-pressed={lighting === 'warm'}><Sunrise size={14} /> Warm</button>
            </div>
          </div>

          <div className="export-card">
            <div className="export-card-top"><span className="export-card-icon"><ArrowDownToLine size={17}/></span><span className="export-card-number">01 — 03</span></div>
            <h3>Made for your world.</h3>
            <p>Take your formation from here into your creative pipeline.</p>
            <button onClick={() => handleExport('glb')} disabled={!ready || exporting}>Export as GLB <ArrowRight size={15} /></button>
          </div>
          <div className="inspector-footer"><span>FRONTIER / ROCK LAB</span><span>✳</span></div>
        </div>
      </aside>
    </main>
    {showHelp && <div className="modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) setShowHelp(false); }}>
      <section className="help-modal" role="dialog" aria-modal="true" aria-labelledby="help-title" aria-describedby="help-description">
        <div className="help-modal-top"><span className="panel-overline">FRONTIER / FIELD GUIDE</span><button className="icon-button" onClick={() => setShowHelp(false)} aria-label="Close guide" autoFocus><X size={17} /></button></div>
        <h2 id="help-title">Make it your own<span className="heading-period">.</span></h2>
        <p id="help-description" className="help-lede">A quick guide to building formations in Rock Lab.</p>
        <div className="help-step"><span>01</span><div><strong>Choose a formation</strong><p>Start with an outcrop, cliff or boulder. These are procedural layouts, not fixed models.</p></div></div>
        <div className="help-step"><span>02</span><div><strong>Explore the details</strong><p>Adjust the shape, fracture density and weathering. A seed and the same settings recreate the same mesh. Drag to orbit, right-drag to pan and scroll to zoom. With the preview focused, use arrow keys to pan, Shift + arrows to orbit, and + / − to zoom.</p></div></div>
        <div className="help-step"><span>03</span><div><strong>Bring it into your world</strong><p>Export GLB for geometry, stone material, UVs and normals; OBJ includes geometry and normals only. The mesh uses meters and is Y-up.</p></div></div>
        <div className="help-note">These are high-detail source meshes. Prepare LODs, collision and any engine-specific optimization in your game pipeline.</div>
        <button className="help-done" onClick={() => setShowHelp(false)}>Got it <ArrowRight size={15} /></button>
      </section>
    </div>}
    {toast && <div className="toast" role="status"><Check size={15} />{toast}<button onClick={() => setToast('')} aria-label="Dismiss notification"><X size={14} /></button></div>}
  </div>;
}

export default App;

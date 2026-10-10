// Frontier Sedimentary Strata Layering Profile
import React from 'react';

export default function StrataProfile({ frequency = 14, hardness = 0.65, bevel = 0.45 }) {
  const bands = Math.max(4, Math.min(18, Math.round(frequency)));
  const layers = [];
  for (let i = 0; i < bands; i++) {
    const isHard = i % 2 === 0;
    const thickness = isHard ? 12 : 7;
    const color = isHard ? '#5e5449' : '#453f37';
    layers.push({ isHard, thickness, color, name: isHard ? 'Resistant Sandstone' : 'Erodible Shale' });
  }

  return (
    <div style={{ margin: '14px 0 16px', background: '#18191f', borderRadius: 14, border: '1px solid #282a33', padding: '14px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 9, letterSpacing: '1px', color: '#c29583', textTransform: 'uppercase', fontWeight: 600 }}>Geological Stratum Column</span>
        <span style={{ fontSize: 9, color: '#918b84' }}>{bands} Sedimentary Units</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, borderRadius: 8, overflow: 'hidden', border: '1px solid #32302c' }}>
        {layers.map((layer, idx) => (
          <div
            key={idx}
            style={{
              height: layer.thickness,
              background: layer.color,
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              padding: '0 8px',
              borderLeft: layer.isHard ? `4px solid #c29583` : '4px solid #4a443c'
            }}
          >
            {idx === 0 && <span style={{ fontSize: 8, color: '#d9c7b8', marginLeft: 'auto' }}>Caprock</span>}
            {idx === bands - 1 && <span style={{ fontSize: 8, color: '#8f887f', marginLeft: 'auto' }}>Basement Bedrock</span>}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#7a8190', marginTop: 8 }}>
        <span>Hardness Differential: {Math.round(hardness * 100)}%</span>
        <span>Terrace Bevel: {Math.round(bevel * 100)}%</span>
      </div>
    </div>
  );
}

// Frontier Slope & Repose Angle Gauge
import React from 'react';

export default function SlopeGauge({ angle = 36, maxAngle = 90 }) {
  const rad = (angle * Math.PI) / 180;
  const isCliff = angle > 45;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '14px 0 16px', padding: '14px 18px', background: '#191a20', borderRadius: 14, border: '1px solid #282a33' }}>
      <svg width={100} height={70} viewBox="0 0 100 70" style={{ flexShrink: 0 }}>
        {/* Base line */}
        <line x1={10} y1={60} x2={90} y2={60} stroke="#3b3e4a" strokeWidth={2} />
        {/* Angle arc */}
        <path
          d={`M 35 60 A 25 25 0 0 0 ${10 + 25 * Math.cos(rad)} ${60 - 25 * Math.sin(rad)}`}
          fill="none"
          stroke={isCliff ? '#e0796b' : '#d6a078'}
          strokeWidth={1.5}
          strokeDasharray="2 2"
        />
        {/* Incline slope face */}
        <line
          x1={10}
          y1={60}
          x2={10 + 75 * Math.cos(rad)}
          y2={60 - 75 * Math.sin(rad)}
          stroke={isCliff ? '#f28e80' : '#e6b591'}
          strokeWidth={3}
          strokeLinecap="round"
        />
        {/* Talus wedge / scree debris */}
        <polygon
          points={`10,60 ${10 + 50 * Math.cos(rad)},${60 - 50 * Math.sin(rad)} ${10 + 50 * Math.cos(rad)},60`}
          fill="rgba(214, 160, 120, 0.12)"
        />
      </svg>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 24, fontWeight: 300, color: '#e2e5eb', display: 'flex', alignItems: 'baseline', gap: 4 }}>
          {angle}<span style={{ fontSize: 13, color: '#888d99' }}>° SLOPE</span>
        </div>
        <div style={{ fontSize: 10, color: isCliff ? '#e0796b' : '#9ea3b0', marginTop: 3 }}>
          {angle < 25 ? 'Gentle valley floor · soil deposition' : angle < 45 ? 'Talus scree boundary · angle of repose' : 'Sheer rock precipice · vertical cliff'}
        </div>
        <div style={{ display: 'flex', gap: 4, height: 4, borderRadius: 2, background: '#262832', marginTop: 10, overflow: 'hidden' }}>
          <div style={{ width: `${(Math.min(angle, 35) / maxAngle) * 100}%`, background: '#72c8b3' }} />
          <div style={{ width: `${(Math.max(0, Math.min(angle, 45) - 35) / maxAngle) * 100}%`, background: '#d6a078' }} />
          <div style={{ width: `${(Math.max(0, angle - 45) / maxAngle) * 100}%`, background: '#e0796b' }} />
        </div>
      </div>
    </div>
  );
}

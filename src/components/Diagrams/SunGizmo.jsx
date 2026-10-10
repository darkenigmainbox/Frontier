// Frontier Interactive Sun Azimuth / Elevation Celestial Compass
import React, { useRef } from 'react';

export default function SunGizmo({ azimuth = 135, elevation = 38, onChange }) {
  const svgRef = useRef(null);

  const radAz = ((azimuth - 90) * Math.PI) / 180;
  const radius = 60;
  const cx = 80;
  const cy = 80;

  // Sun position on projection plane
  const elevNorm = Math.max(0, elevation) / 90;
  const sunR = radius * (1.0 - elevNorm * 0.7);
  const sx = cx + Math.cos(radAz) * sunR;
  const sy = cy + Math.sin(radAz) * sunR;

  const handlePointer = (e) => {
    if (!svgRef.current || !onChange) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - cx;
    const y = e.clientY - rect.top - cy;
    const dist = Math.sqrt(x * x + y * y);
    let newAz = (Math.atan2(y, x) * 180) / Math.PI + 90;
    if (newAz < 0) newAz += 360;
    const newElev = Math.max(5, Math.min(85, Math.round((1.0 - Math.min(1.0, dist / radius)) * 90)));
    onChange(Math.round(newAz), newElev);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 0', margin: '10px 0' }}>
      <svg
        ref={svgRef}
        width={160}
        height={160}
        viewBox="0 0 160 160"
        onMouseDown={(e) => {
          handlePointer(e);
          const move = (ev) => handlePointer(ev);
          const up = () => {
            window.removeEventListener('mousemove', move);
            window.removeEventListener('mouseup', up);
          };
          window.addEventListener('mousemove', move);
          window.addEventListener('mouseup', up);
        }}
        style={{ cursor: 'crosshair', userSelect: 'none' }}
      >
        {/* Outer compass ring */}
        <circle cx={cx} cy={cy} r={radius} fill="#181a20" stroke="#2c303c" strokeWidth={1.5} />
        <circle cx={cx} cy={cy} r={radius * 0.65} fill="none" stroke="#262933" strokeDasharray="2 3" />
        <circle cx={cx} cy={cy} r={radius * 0.3} fill="none" stroke="#262933" strokeDasharray="2 3" />

        {/* Cardinal crosshairs */}
        <line x1={cx - radius} y1={cy} x2={cx + radius} y2={cy} stroke="#2c303c" strokeWidth={1} />
        <line x1={cx} y1={cy - radius} x2={cx} y2={cy + radius} stroke="#2c303c" strokeWidth={1} />

        {/* Cardinal labels */}
        <text x={cx} y={cy - radius + 11} fill="#6e7482" fontSize={8} textAnchor="middle">N</text>
        <text x={cx + radius - 9} y={cy + 3} fill="#6e7482" fontSize={8} textAnchor="middle">E</text>
        <text x={cx} y={cy + radius - 4} fill="#6e7482" fontSize={8} textAnchor="middle">S</text>
        <text x={cx - radius + 9} y={cy + 3} fill="#6e7482" fontSize={8} textAnchor="middle">W</text>

        {/* Sun ray to center */}
        <line x1={cx} y1={cy} x2={sx} y2={sy} stroke="#e8b65f" strokeWidth={1.5} opacity={0.6} strokeDasharray="3 2" />

        {/* Sun marker */}
        <circle cx={sx} cy={sy} r={7} fill="#e8b65f" />
        <circle cx={sx} cy={sy} r={12} fill="none" stroke="#e8b65f" strokeWidth={1} opacity={0.5} />
      </svg>
    </div>
  );
}

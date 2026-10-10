// Frontier Live Topographic Contour Diagram
import React, { useEffect, useRef } from 'react';

export default function ContourCanvas({ altitude = 240, roughness = 65, erosion = 40 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Dark slate background
    ctx.fillStyle = '#181a1f';
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = '#23262f';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Concentric elevation contour lines
    const cx = w * 0.52;
    const cy = h * 0.48;
    const numRings = 7;
    const maxRadius = Math.min(w, h) * 0.44;

    for (let r = 1; r <= numRings; r++) {
      const radius = (r / numRings) * maxRadius;
      ctx.beginPath();
      const points = 48;
      for (let i = 0; i <= points; i++) {
        const theta = (i / points) * Math.PI * 2;
        // Perturb radius with roughness & erosion
        const warp1 = Math.sin(theta * 3 + r * 1.5) * (roughness * 0.12);
        const warp2 = Math.cos(theta * 5 - r * 0.8) * (erosion * 0.08);
        const currentR = radius + warp1 + warp2;
        const px = cx + Math.cos(theta) * currentR;
        const py = cy + Math.sin(theta) * (currentR * 0.75); // Perspective slant

        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();

      // Color from deep bronze to bright summit
      const progress = r / numRings;
      ctx.strokeStyle = r === numRings ? '#d6a078' : `rgba(214, 160, 120, ${0.2 + progress * 0.6})`;
      ctx.lineWidth = r % 2 === 0 ? 1.5 : 1.0;
      ctx.stroke();

      // Elevation label on outer ring
      if (r === numRings || r === Math.floor(numRings * 0.5)) {
        ctx.fillStyle = '#9e7960';
        ctx.font = '9px "DM Sans", sans-serif';
        const labelText = `${Math.round((altitude * (numRings - r + 1)) / numRings)}m`;
        ctx.fillText(labelText, cx - 12, cy - radius * 0.75 - 4);
      }
    }

    // Peak marker
    ctx.fillStyle = '#f0c7a5';
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();
  }, [altitude, roughness, erosion]);

  return (
    <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1px solid #2a2d36', margin: '14px 0 16px' }}>
      <canvas ref={canvasRef} width={380} height={140} style={{ width: '100%', height: 140, display: 'block' }} />
      <div style={{ position: 'absolute', bottom: 8, right: 10, fontSize: 9, color: '#8c919d', display: 'flex', gap: 6, alignItems: 'center' }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#d6a078', display: 'inline-block' }} />
        <span>CONTOUR INTERVAL: 25m</span>
      </div>
    </div>
  );
}

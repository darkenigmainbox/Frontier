// Frontier PBR Material Preview Swatch Sphere
import React, { useEffect, useRef } from 'react';

export default function PBRSwatch({ color = '#4f5059', roughness = 0.85, metalness = 0.04, normalScale = 1.0 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const size = canvas.width;
    const r = size * 0.44;
    const cx = size * 0.5;
    const cy = size * 0.5;

    ctx.clearRect(0, 0, size, size);

    // Parse base color
    const hex = color.replace('#', '');
    const cr = parseInt(hex.substring(0, 2), 16) || 120;
    const cg = parseInt(hex.substring(2, 4), 16) || 120;
    const cb = parseInt(hex.substring(4, 6), 16) || 120;

    // Light direction (top-left towards sphere)
    const lx = -0.577, ly = -0.577, lz = 0.577;

    const imgData = ctx.createImageData(size, size);
    const data = imgData.data;

    for (let y = 0; y < size; y++) {
      const dy = (y - cy) / r;
      for (let x = 0; x < size; x++) {
        const dx = (x - cx) / r;
        const d2 = dx * dx + dy * dy;

        if (d2 <= 1.0) {
          const dz = Math.sqrt(1.0 - d2);

          // Normal perturbation based on normalScale
          let nx = dx;
          let ny = dy;
          let nz = dz;
          if (normalScale > 0) {
            const noise = (Math.sin(x * 0.3) * Math.cos(y * 0.3)) * normalScale * 0.12;
            nx += noise;
            ny += noise;
            const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
            nx /= len; ny /= len; nz /= len;
          }

          // Diffuse N dot L
          const nDotL = Math.max(0, -(nx * lx + ny * ly - nz * lz));

          // Specular (Blinn-Phong / GGX approximation)
          const vx = 0, vy = 0, vz = 1;
          const hx = -lx + vx, hy = -ly + vy, hz = lz + vz;
          const hLen = Math.sqrt(hx * hx + hy * hy + hz * hz);
          const nDotH = Math.max(0, (nx * hx + ny * hy + nz * hz) / hLen);
          const specPower = Math.max(2, Math.pow(1.0 - roughness, 3) * 128);
          const spec = Math.pow(nDotH, specPower) * (1.0 - roughness);

          // Ambient Fresnel rim
          const fresnel = Math.pow(1.0 - nz, 3) * 0.4;

          const idx = (y * size + x) * 4;
          const finalR = Math.min(255, cr * (0.2 + nDotL * 0.8) + spec * 220 + fresnel * 60);
          const finalG = Math.min(255, cg * (0.2 + nDotL * 0.8) + spec * 220 + fresnel * 60);
          const finalB = Math.min(255, cb * (0.2 + nDotL * 0.8) + spec * 220 + fresnel * 60);

          data[idx] = finalR;
          data[idx + 1] = finalG;
          data[idx + 2] = finalB;
          data[idx + 3] = 255;
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);

    // Subtle rim ring
    ctx.strokeStyle = '#343844';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }, [color, roughness, metalness, normalScale]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '14px 0 16px', padding: '12px 16px', background: '#191b22', borderRadius: 14, border: '1px solid #292d38' }}>
      <canvas ref={canvasRef} width={90} height={90} style={{ borderRadius: '50%', background: '#121316', flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#e0e4ed' }}>PBR Physical Response</div>
        <div style={{ fontSize: 10, color: '#8c92a2', marginTop: 3 }}>
          Roughness: <strong style={{ color: '#d0d5e2' }}>{Math.round(roughness * 100)}%</strong> · Metallic: <strong style={{ color: '#d0d5e2' }}>{Math.round(metalness * 100)}%</strong>
        </div>
        <div style={{ fontSize: 10, color: '#8c92a2', marginTop: 2 }}>
          Micro-relief: <strong style={{ color: '#d0d5e2' }}>{normalScale.toFixed(1)}× Normal</strong>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 8 }}>
          <span style={{ width: 14, height: 14, borderRadius: 4, background: color, border: '1px solid #4a5060', display: 'inline-block' }} />
          <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#b2b9c7' }}>{color.toUpperCase()}</span>
        </div>
      </div>
    </div>
  );
}

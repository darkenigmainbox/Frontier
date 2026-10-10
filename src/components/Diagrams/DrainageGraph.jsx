// Frontier Hydraulic Drainage Channel Graph
import React from 'react';

export default function DrainageGraph({ erosionRate = 0.4, capacity = 3.5, branches = 8 }) {
  return (
    <div style={{ position: 'relative', margin: '14px 0 16px', background: '#17191e', borderRadius: 14, border: '1px solid #272a33', padding: '14px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 9, letterSpacing: '1px', color: '#81b8c8', textTransform: 'uppercase', fontWeight: 600 }}>Hydraulic Stream Flow Density</span>
        <span style={{ fontSize: 10, color: '#6bb8cb' }}>{Math.round(erosionRate * capacity * 35)} tributaries</span>
      </div>
      <svg width="100%" height={90} viewBox="0 0 340 90" style={{ display: 'block' }}>
        {/* River main trunks and tributaries */}
        <path d="M 40,10 Q 70,35 110,45 T 180,50 T 260,65 T 330,75" fill="none" stroke="#6eb6cb" strokeWidth={3.5} strokeLinecap="round" />
        <path d="M 80,15 Q 100,28 110,45" fill="none" stroke="#5299ad" strokeWidth={2.0} strokeLinecap="round" />
        <path d="M 130,12 Q 155,30 180,50" fill="none" stroke="#5299ad" strokeWidth={2.2} strokeLinecap="round" />
        <path d="M 200,20 Q 230,35 260,65" fill="none" stroke="#417c8e" strokeWidth={1.8} strokeLinecap="round" />
        <path d="M 120,80 Q 150,65 180,50" fill="none" stroke="#5299ad" strokeWidth={2.0} strokeLinecap="round" />
        <path d="M 210,85 Q 235,78 260,65" fill="none" stroke="#417c8e" strokeWidth={1.8} strokeLinecap="round" />
        {/* Fine rill splines */}
        <path d="M 25,25 Q 50,30 70,35" fill="none" stroke="#33616f" strokeWidth={1.2} />
        <path d="M 95,8 Q 115,20 130,28" fill="none" stroke="#33616f" strokeWidth={1.2} />
        <path d="M 160,8 Q 175,22 190,32" fill="none" stroke="#33616f" strokeWidth={1.2} />
        <path d="M 230,10 Q 245,22 260,40" fill="none" stroke="#33616f" strokeWidth={1.2} />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#7a8190', marginTop: 4 }}>
        <span>UPSTREAM HEADWATERS</span>
        <span>ALLUVIAL DELTA OUTFLOW</span>
      </div>
    </div>
  );
}

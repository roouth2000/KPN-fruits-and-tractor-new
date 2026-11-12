import React, { useState, useMemo } from 'react';
import { MoreHorizontalIcon } from './icons';

interface HexBin {
  id: string;
  x: number;
  y: number;
  status: 'full' | 'partly' | 'empty';
  sku?: string;
  fillPct: number;
}

export const BinOccupancy: React.FC = () => {
  const [hoveredBin, setHoveredBin] = useState<HexBin | null>(null);

  // Generate an authentic honeycomb hex cluster matching the visual in the video
  const bins = useMemo(() => {
    const list: HexBin[] = [];
    const hexRadius = 11;
    const originX = 175;
    const originY = 110;

    // A hexagonal grid with radius ~ 5
    const R = 5;
    for (let q = -R; q <= R; q++) {
      const r1 = Math.max(-R, -q - R);
      const r2 = Math.min(R, -q + R);
      for (let r = r1; r <= r2; r++) {
        // Skip some corners to produce the organic organic shape seen in the video
        if (Math.abs(q) + Math.abs(r) + Math.abs(-q - r) > 2 * R + 1) continue;

        const x = originX + hexRadius * Math.sqrt(3) * (q + r / 2);
        const y = originY + hexRadius * (3 / 2) * r;

        // Realistic distribution: 52% full, 36% partly full, 12% empty
        const hash = Math.sin(q * 12.9898 + r * 78.233) * 43758.5453;
        const rand = hash - Math.floor(hash);

        let status: 'full' | 'partly' | 'empty' = 'full';
        let fillPct = 100;
        if (rand < 0.12) {
          status = 'empty';
          fillPct = 0;
        } else if (rand < 0.48) {
          status = 'partly';
          fillPct = Math.round(30 + rand * 100);
        }

        const binId = `B-${String.fromCharCode(65 + Math.abs(q % 6))}${Math.abs(r) + 10}`;
        const skus = ['SKU-2051 Matte Cup', 'SKU-2048 Stoneware Mug', 'SKU-1082 Ceramic Plate', 'SKU-3091 Glass Bowl'];
        const sku = status !== 'empty' ? skus[Math.abs(q + r) % skus.length] : undefined;

        list.push({ id: binId, x, y, status, sku, fillPct });
      }
    }
    return list;
  }, []);

  // Helper to generate hexagon points
  const getHexPoints = (cx: number, cy: number, r: number) => {
    const points: string[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 180) * (60 * i - 30);
      const px = cx + r * Math.cos(angle);
      const py = cy + r * Math.sin(angle);
      points.push(`${px.toFixed(1)},${py.toFixed(1)}`);
    }
    return points.join(' ');
  };

  const getColor = (status: 'full' | 'partly' | 'empty', isHovered: boolean) => {
    if (isHovered) return '#1d4ed8'; // Darker vivid blue on hover
    switch (status) {
      case 'full':
        return '#2563eb'; // Royal vivid blue
      case 'partly':
        return '#93c5fd'; // Soft sky blue
      case 'empty':
        return '#e2e8f0'; // Clean slate light gray
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-xs font-semibold text-slate-800">Bin occupancy</h3>
          <p className="text-[11px] text-slate-400">Dallas, TX · 792 bins</p>
        </div>
        <button className="text-slate-400 hover:text-slate-600 transition-colors">
          <MoreHorizontalIcon className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Honeycomb Canvas */}
      <div className="relative w-full h-48 flex items-center justify-center my-1 select-none">
        <svg
          viewBox="0 0 350 220"
          className="w-full h-full max-h-48 overflow-visible"
        >
          {bins.map((bin) => {
            const isHovered = hoveredBin?.id === bin.id;
            return (
              <polygon
                key={bin.id}
                points={getHexPoints(bin.x, bin.y, 9.8)}
                fill={getColor(bin.status, isHovered)}
                stroke="#ffffff"
                strokeWidth="1.2"
                className="transition-all duration-150 cursor-pointer"
                onMouseEnter={() => setHoveredBin(bin)}
                onMouseLeave={() => setHoveredBin(null)}
              />
            );
          })}
        </svg>

        {/* Floating Tooltip */}
        {hoveredBin && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-xs text-white text-[11px] px-2.5 py-1.5 rounded-lg shadow-lg pointer-events-none z-20 whitespace-nowrap">
            <div className="font-semibold flex items-center gap-1.5">
              <span>{hoveredBin.id}</span>
              <span className="capitalize opacity-80">({hoveredBin.status})</span>
            </div>
            {hoveredBin.sku ? (
              <div className="text-[10px] text-slate-300">
                {hoveredBin.sku} · {hoveredBin.fillPct}% full
              </div>
            ) : (
              <div className="text-[10px] text-slate-400">Empty bin · Ready for intake</div>
            )}
          </div>
        )}
      </div>

      {/* Legend & Stats matching screenshot */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
          <span>Full bins</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-800">412</span>
          <span className="text-[11px] text-slate-400">52%</span>
        </div>
      </div>

      <div className="pt-1.5 flex items-center justify-between text-xs text-slate-600">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-300" />
          <span>Partly full</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-800">286</span>
          <span className="text-[11px] text-slate-400">36%</span>
        </div>
      </div>

      <div className="pt-1.5 flex items-center justify-between text-xs text-slate-600">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-200" />
          <span>Empty</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-800">94</span>
          <span className="text-[11px] text-slate-400">12%</span>
        </div>
      </div>
    </div>
  );
};

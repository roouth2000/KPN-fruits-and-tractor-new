import React, { useState } from 'react';
import { ChevronDownIcon } from './icons';
import { formatNumber } from '../utils/helpers';

interface MonthData {
  month: string;
  year: number;
  received: number;
  shipped: number;
  netChange: number;
}

export const UnitsChart: React.FC = () => {
  const [selectedRange, setSelectedRange] = useState('Last 6 months');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(3); // Default Sep selected like video

  const data: MonthData[] = [
    { month: 'Jun', year: 2026, received: 42000, shipped: 48500, netChange: -6500 },
    { month: 'Jul', year: 2026, received: 47800, shipped: 43200, netChange: 4600 },
    { month: 'Aug', year: 2026, received: 44100, shipped: 51200, netChange: -7100 },
    { month: 'Sep', year: 2026, received: 54600, shipped: 46800, netChange: 7800 },
    { month: 'Oct', year: 2026, received: 49200, shipped: 52100, netChange: -2900 },
    { month: 'Nov', year: 2026, received: 51940, shipped: 47840, netChange: 4100 },
  ];

  // SVG Chart dimensions
  const svgWidth = 600;
  const svgHeight = 220;
  const paddingX = 40;
  const paddingY = 30;
  const width = svgWidth - paddingX * 2;
  const height = svgHeight - paddingY * 2;

  // Max and min value for chart scaling (range 35,000 to 65,000)
  const minVal = 35000;
  const maxVal = 62000;

  const getX = (idx: number) => paddingX + (idx / (data.length - 1)) * width;
  const getY = (val: number) => paddingY + height - ((val - minVal) / (maxVal - minVal)) * height;

  // Build smooth bezier curves
  const buildSmoothPath = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return '';
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i === 0 ? i : i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return d;
  };

  const receivedPts = data.map((d, i) => ({ x: getX(i), y: getY(d.received) }));
  const shippedPts = data.map((d, i) => ({ x: getX(i), y: getY(d.shipped) }));

  const receivedPath = buildSmoothPath(receivedPts);
  const shippedPath = buildSmoothPath(shippedPts);

  const activeData = hoveredIdx !== null ? data[hoveredIdx] : data[3];

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-shadow relative">
      {/* Top Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <div className="text-xs font-medium text-slate-500">Units received vs shipped</div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-slate-900 tracking-tight font-sans">
              289,640 units
            </span>
            <span className="inline-flex items-center text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
              -5.2%
            </span>
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            Shipped since June across 4 warehouses
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Legend */}
          <div className="hidden sm:flex items-center gap-3 text-xs text-slate-600 font-medium">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-slate-900" />
              Received
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-sky-500" />
              Shipped
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-emerald-400" />
              Net change
            </span>
          </div>

          {/* Time range selector */}
          <div className="relative">
            <select
              value={selectedRange}
              onChange={(e) => setSelectedRange(e.target.value)}
              className="text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1 appearance-none pr-6 cursor-pointer focus:outline-none"
            >
              <option value="Last 6 months">Last 6 months</option>
              <option value="Last 3 months">Last 3 months</option>
              <option value="Year to date">Year to date</option>
            </select>
            <ChevronDownIcon className="w-3.5 h-3.5 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* SVG Chart Area */}
      <div className="relative w-full h-56 select-none">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="gradientReceived" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1e293b" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#1e293b" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="gradientShipped" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.0" />
            </linearGradient>
            {/* Pattern for net surplus */}
            <pattern id="hatchNet" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="8" stroke="#10b981" strokeWidth="1.2" strokeOpacity="0.3" />
            </pattern>
          </defs>

          {/* Horizontal Grid lines */}
          {[40000, 50000, 60000, 70000].map((val) => {
            const y = getY(val);
            if (y < 10 || y > svgHeight - 20) return null;
            return (
              <g key={val}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={svgWidth - paddingX}
                  y2={y}
                  stroke="#f1f5f9"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                <text
                  x={paddingX - 10}
                  y={y + 3}
                  textAnchor="end"
                  fontSize="10"
                  fill="#94a3b8"
                >
                  {val >= 1000 ? `${val / 1000}k` : val}
                </text>
              </g>
            );
          })}

          {/* Active Month Column Highlight */}
          {hoveredIdx !== null && (
            <rect
              x={getX(hoveredIdx) - 18}
              y={paddingY - 10}
              width="36"
              height={height + 20}
              fill="#f1f5f9"
              fillOpacity="0.6"
              rx="6"
            />
          )}

          {/* Lines */}
          <path
            d={shippedPath}
            fill="none"
            stroke="#0ea5e9"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d={receivedPath}
            fill="none"
            stroke="#0f172a"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Points on lines */}
          {data.map((_, i) => (
            <g key={i}>
              <circle
                cx={receivedPts[i].x}
                cy={receivedPts[i].y}
                r={hoveredIdx === i ? 5 : 3}
                fill="#0f172a"
                stroke="#ffffff"
                strokeWidth="2"
                className="transition-all duration-150 cursor-pointer"
                onMouseEnter={() => setHoveredIdx(i)}
              />
              <circle
                cx={shippedPts[i].x}
                cy={shippedPts[i].y}
                r={hoveredIdx === i ? 5 : 3}
                fill="#0ea5e9"
                stroke="#ffffff"
                strokeWidth="2"
                className="transition-all duration-150 cursor-pointer"
                onMouseEnter={() => setHoveredIdx(i)}
              />
            </g>
          ))}

          {/* X Axis Months */}
          {data.map((d, i) => (
            <text
              key={d.month}
              x={getX(i)}
              y={svgHeight - 10}
              textAnchor="middle"
              fontSize="11"
              fontWeight={hoveredIdx === i ? '600' : '400'}
              fill={hoveredIdx === i ? '#0f172a' : '#64748b'}
              className="cursor-pointer transition-colors"
              onClick={() => setHoveredIdx(i)}
            >
              {d.month}
            </text>
          ))}
        </svg>

        {/* Floating Tooltip Box matching video snapshot */}
        {hoveredIdx !== null && (
          <div
            className="absolute -top-3 z-20 pointer-events-none transition-all duration-200"
            style={{
              left: `${(getX(hoveredIdx) / svgWidth) * 100}%`,
              transform: 'translateX(-50%)',
            }}
          >
            <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-slate-200/90 p-2.5 text-xs w-40">
              <div className="text-[11px] font-semibold text-slate-800 pb-1.5 border-b border-slate-100 flex items-center justify-between">
                <span>{activeData.month} {activeData.year}</span>
              </div>
              <div className="mt-1.5 space-y-1">
                <div className="flex items-center justify-between text-slate-600 text-[11px]">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-2xs bg-slate-900" />
                    Received
                  </span>
                  <span className="font-semibold text-slate-900 font-mono">
                    {formatNumber(activeData.received)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600 text-[11px]">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-2xs bg-sky-500" />
                    Shipped
                  </span>
                  <span className="font-semibold text-slate-900 font-mono">
                    {formatNumber(activeData.shipped)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600 text-[11px] pt-1 border-t border-slate-100/80">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-2xs bg-emerald-400" />
                    Net change
                  </span>
                  <span className="font-semibold text-emerald-700 font-mono">
                    {activeData.netChange > 0 ? `+${formatNumber(activeData.netChange)}` : formatNumber(activeData.netChange)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

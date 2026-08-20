import React, { useState, useMemo } from 'react';
import { TrendUp } from './Icon';

const ScoreTrendChart = ({ data = [], width = 800, height = 300 }) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const padding = { top: 30, right: 30, bottom: 50, left: 50 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[d.getMonth()]} ${d.getDate()}`;
  };

  const getScoreColor = (score) => {
    if (score >= 4) return 'var(--success)';
    if (score >= 3) return 'var(--warning)';
    return 'var(--error)';
  };

  const points = useMemo(() => {
    if (!data || data.length < 2) return [];
    return data.map((d, i) => ({
      x: padding.left + (i / (data.length - 1)) * chartW,
      y: padding.top + chartH - (d.score / 5) * chartH,
      score: d.score,
      date: d.date,
      persona: d.persona,
    }));
  }, [data, chartW, chartH, padding.left, padding.top]);

  // Catmull-Rom to cubic bezier conversion
  const catmullRomPath = useMemo(() => {
    if (points.length < 2) return '';
    if (points.length === 2) {
      return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
    }

    let path = `M ${points[0].x} ${points[0].y}`;
    const tension = 0.3;

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[Math.min(points.length - 1, i + 1)];
      const p3 = points[Math.min(points.length - 1, i + 2)];

      const cp1x = p1.x + (p2.x - p0.x) * tension;
      const cp1y = p1.y + (p2.y - p0.y) * tension;
      const cp2x = p2.x - (p3.x - p1.x) * tension;
      const cp2y = p2.y - (p3.y - p1.y) * tension;

      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return path;
  }, [points]);

  // Area path for gradient fill under line
  const areaPath = useMemo(() => {
    if (!catmullRomPath) return '';
    const baseline = padding.top + chartH;
    return `${catmullRomPath} L ${points[points.length - 1].x} ${baseline} L ${points[0].x} ${baseline} Z`;
  }, [catmullRomPath, points, padding.top, chartH]);

  // Empty state
  if (!data || data.length < 2) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '200px',
        color: 'var(--ink-secondary)',
        fontSize: '0.95rem',
        textAlign: 'center',
        padding: '2rem',
      }}>
        <div>
          <TrendUp size={28} style={{ color: 'var(--ink-muted)', marginBottom: '0.75rem' }} />
          <p>Complete more sessions to see your progress trend</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', marginTop: '0.5rem' }}>
            At least 2 completed sessions are needed for the chart
          </p>
        </div>
      </div>
    );
  }

  const gridLines = [1, 2, 3, 4, 5];

  return (
    <div style={{ width: '100%', position: 'relative' }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height="auto"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.16" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* Y-axis gridlines */}
        {gridLines.map((val) => {
          const y = padding.top + chartH - (val / 5) * chartH;
          return (
            <g key={`grid-${val}`}>
              <line
                x1={padding.left}
                y1={y}
                x2={padding.left + chartW}
                y2={y}
                stroke="var(--border-color)"
                strokeWidth="1"
                strokeDasharray="4 4"
                opacity="0.5"
              />
              <text
                x={padding.left - 12}
                y={y + 4}
                textAnchor="end"
                fill="var(--ink-muted)"
                fontSize="11"
                fontFamily="var(--font-sans)"
              >
                {val}
              </text>
            </g>
          );
        })}

        {/* X-axis labels */}
        {points.map((p, i) => {
          // Show every label if <= 8 points, otherwise skip some
          if (data.length > 8 && i % Math.ceil(data.length / 8) !== 0 && i !== data.length - 1) return null;
          return (
            <text
              key={`xlabel-${i}`}
              x={p.x}
              y={padding.top + chartH + 25}
              textAnchor="middle"
              fill="var(--ink-muted)"
              fontSize="11"
              fontFamily="var(--font-sans)"
            >
              {formatDate(p.date)}
            </text>
          );
        })}

        {/* Gradient fill area */}
        <path
          d={areaPath}
          fill="url(#chartGradient)"
          className="chart-area-path"
        />

        {/* Line path */}
        <path
          d={catmullRomPath}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="chart-line-path"
        />

        {/* Data point dots */}
        {points.map((p, i) => (
          <g key={`dot-${i}`}>
            {/* Hover target (larger invisible circle) */}
            <circle
              cx={p.x}
              cy={p.y}
              r="16"
              fill="transparent"
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              style={{ cursor: 'pointer' }}
            />
            {/* Outer glow on hover */}
            {hoveredIndex === i && (
              <circle
                cx={p.x}
                cy={p.y}
                r="10"
                fill={getScoreColor(p.score)}
                opacity="0.2"
              />
            )}
            {/* Visible dot */}
            <circle
              cx={p.x}
              cy={p.y}
              r={hoveredIndex === i ? 6 : 5}
              fill={getScoreColor(p.score)}
              stroke="var(--bg-surface)"
              strokeWidth="2"
              style={{ transition: 'r 0.15s ease' }}
            />
          </g>
        ))}

        {/* Hover tooltip */}
        {hoveredIndex !== null && points[hoveredIndex] && (() => {
          const p = points[hoveredIndex];
          const tooltipW = 140;
          const tooltipH = 60;
          let tx = p.x - tooltipW / 2;
          let ty = p.y - tooltipH - 16;
          if (tx < padding.left) tx = padding.left;
          if (tx + tooltipW > width - padding.right) tx = width - padding.right - tooltipW;
          if (ty < 5) ty = p.y + 20;

          return (
            <g>
              <rect
                x={tx}
                y={ty}
                width={tooltipW}
                height={tooltipH}
                rx="8"
                fill="var(--bg-surface)"
                stroke="var(--border-color)"
                strokeWidth="1"
                filter="drop-shadow(0 4px 8px rgba(0,0,0,0.3))"
              />
              <text x={tx + 12} y={ty + 20} fill="var(--ink)" fontSize="12" fontWeight="600" fontFamily="var(--font-sans)">
                {formatDate(p.date)} — {p.persona}
              </text>
              <text x={tx + 12} y={ty + 42} fill={getScoreColor(p.score)} fontSize="14" fontWeight="700" fontFamily="var(--font-sans)">
                Score: {p.score} / 5.0
              </text>
            </g>
          );
        })()}
      </svg>
    </div>
  );
};

export default ScoreTrendChart;

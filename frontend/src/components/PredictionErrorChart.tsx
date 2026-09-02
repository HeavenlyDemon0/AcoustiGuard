import React, { useState } from 'react';
import type { FrameErrorPoint, AnomalyRegion } from '../types';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface PredictionErrorChartProps {
  frameErrors: FrameErrorPoint[];
  threshold: number;
  anomalyRegions: AnomalyRegion[];
  currentTime?: number;
}

export const PredictionErrorChart: React.FC<PredictionErrorChartProps> = ({
  frameErrors,
  threshold,
  anomalyRegions,
  currentTime,
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<FrameErrorPoint | null>(null);

  const maxY = Math.max(0.07, ...frameErrors.map((f) => f.error * 1.15));
  const svgWidth = 800;
  const svgHeight = 220;
  const padding = { top: 20, right: 30, bottom: 35, left: 60 };
  const graphW = svgWidth - padding.left - padding.right;
  const graphH = svgHeight - padding.top - padding.bottom;

  // Coordinate mapping functions
  const getX = (t: number) => padding.left + (t / 10.0) * graphW;
  const getY = (err: number) => padding.top + graphH - (err / maxY) * graphH;

  // Build SVG path points
  const pointsString = frameErrors
    .map((p) => `${getX(p.time)},${getY(p.error)}`)
    .join(' ');

  // Build path for highlighted anomaly fill regions above threshold
  const anomalyPaths: string[] = [];
  let currentSegment: FrameErrorPoint[] = [];

  frameErrors.forEach((pt) => {
    if (pt.error > threshold) {
      currentSegment.push(pt);
    } else {
      if (currentSegment.length > 0) {
        // Close polygon down to threshold line
        const p1 = currentSegment[0];
        const pLast = currentSegment[currentSegment.length - 1];
        const path = `M ${getX(p1.time)} ${getY(threshold)} ` +
          currentSegment.map((p) => `L ${getX(p.time)} ${getY(p.error)}`).join(' ') +
          ` L ${getX(pLast.time)} ${getY(threshold)} Z`;
        anomalyPaths.push(path);
        currentSegment = [];
      }
    }
  });
  if (currentSegment.length > 0) {
    const p1 = currentSegment[0];
    const pLast = currentSegment[currentSegment.length - 1];
    const path = `M ${getX(p1.time)} ${getY(threshold)} ` +
      currentSegment.map((p) => `L ${getX(p.time)} ${getY(p.error)}`).join(' ') +
      ` L ${getX(pLast.time)} ${getY(threshold)} Z`;
    anomalyPaths.push(path);
  }

  const threshY = getY(threshold);
  const isAnomaly = anomalyRegions.length > 0;

  return (
    <div className="panel" style={{ padding: '16px' }}>
      <div className="panel-header">
        <div className="panel-title">TEMPORAL PREDICTION ERROR</div>

        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '3px', backgroundColor: 'var(--text-primary)', display: 'inline-block' }}></span>
            <span style={{ color: 'var(--text-secondary)' }}>Prediction error ||x_t - x̂_t||_2</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '14px', height: '2px', borderTop: '2px dashed var(--status-anomaly)', display: 'inline-block' }}></span>
            <span style={{ color: 'var(--status-anomaly)', fontWeight: 600 }}>Threshold τ_cal ({threshold.toFixed(4)})</span>
          </div>
        </div>
      </div>

      {/* SVG Container */}
      <div style={{ position: 'relative', width: '100%', overflowX: 'auto' }}>
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          style={{ width: '100%', height: 'auto', display: 'block' }}
          onMouseLeave={() => setHoveredPoint(null)}
        >
          {/* Horizontal Grid lines & Y-axis Ticks */}
          {[0.0, 0.02, 0.04, 0.06, 0.08].map((tick) => {
            if (tick > maxY) return null;
            const y = getY(tick);
            return (
              <g key={tick}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={svgWidth - padding.right}
                  y2={y}
                  stroke="var(--border-color-subtle)"
                  strokeDasharray="2,2"
                />
                <text
                  x={padding.left - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontFamily="IBM Plex Mono"
                  fontSize="10"
                  fill="var(--text-secondary)"
                >
                  {tick.toFixed(3)}
                </text>
              </g>
            );
          })}

          {/* X-Axis Ticks (Time in Seconds) */}
          {[0, 2, 4, 6, 8, 10].map((t) => {
            const x = getX(t);
            return (
              <g key={t}>
                <line
                  x1={x}
                  y1={padding.top}
                  x2={x}
                  y2={svgHeight - padding.bottom}
                  stroke="var(--border-color-subtle)"
                />
                <line
                  x1={x}
                  y1={svgHeight - padding.bottom}
                  x2={x}
                  y2={svgHeight - padding.bottom + 5}
                  stroke="var(--border-dark)"
                />
                <text
                  x={x}
                  y={svgHeight - padding.bottom + 18}
                  textAnchor="middle"
                  fontFamily="IBM Plex Mono"
                  fontSize="10"
                  fill="var(--text-secondary)"
                >
                  {t}.0s
                </text>
              </g>
            );
          })}

          {/* Highlight Anomaly Region Polygon Fills (Red tint) */}
          {anomalyPaths.map((path, idx) => (
            <path
              key={idx}
              d={path}
              fill="rgba(220, 38, 38, 0.28)"
              stroke="none"
            />
          ))}

          {/* Calibrated Threshold Line (Dashed Red Line) */}
          <line
            x1={padding.left}
            y1={threshY}
            x2={svgWidth - padding.right}
            y2={threshY}
            stroke="var(--status-anomaly)"
            strokeWidth="1.8"
            strokeDasharray="5,4"
          />

          {/* Main Temporal Prediction Error Curve Line */}
          <polyline
            fill="none"
            stroke="var(--text-primary)"
            strokeWidth="2.2"
            points={pointsString}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Playhead Vertical Line */}
          {currentTime !== undefined && currentTime >= 0 && (
            <line
              x1={getX(currentTime)}
              y1={padding.top}
              x2={getX(currentTime)}
              y2={svgHeight - padding.bottom}
              stroke="#38bdf8"
              strokeWidth="2"
            />
          )}

          {/* Interactive Hover Point Overlay */}
          {frameErrors.map((pt, idx) => {
            const cx = getX(pt.time);
            const cy = getY(pt.error);
            const isHovered = hoveredPoint?.time === pt.time;
            return (
              <circle
                key={idx}
                cx={cx}
                cy={cy}
                r={isHovered ? 5 : pt.error > threshold ? 3 : 0}
                fill={pt.error > threshold ? 'var(--status-anomaly)' : 'var(--text-primary)'}
                stroke="var(--bg-panel)"
                strokeWidth={1.5}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredPoint(pt)}
              />
            );
          })}

          {/* Hover Tooltip Box */}
          {hoveredPoint && (
            <g transform={`translate(${Math.min(svgWidth - 140, Math.max(padding.left, getX(hoveredPoint.time) - 60))}, ${Math.max(10, getY(hoveredPoint.error) - 45)})`}>
              <rect
                width="120"
                height="34"
                fill="var(--bg-panel-subtle)"
                stroke="var(--border-dark)"
                strokeWidth="1"
                rx="3"
                opacity="0.96"
              />
              <text
                x="60"
                y="15"
                textAnchor="middle"
                fill="var(--text-primary)"
                fontFamily="IBM Plex Mono"
                fontSize="10"
                fontWeight="bold"
              >
                t = {hoveredPoint.time.toFixed(1)}s
              </text>
              <text
                x="60"
                y="27"
                textAnchor="middle"
                fill={hoveredPoint.error > threshold ? 'var(--status-anomaly)' : 'var(--status-normal)'}
                fontFamily="IBM Plex Mono"
                fontSize="10"
                fontWeight="bold"
              >
                Err: {hoveredPoint.error.toFixed(4)}
              </text>
            </g>
          )}

          {/* Axis Titles */}
          <text
            x={svgWidth / 2}
            y={svgHeight - 4}
            textAnchor="middle"
            fontFamily="Inter"
            fontSize="11"
            fill="var(--text-secondary)"
            fontWeight="600"
          >
            Time (seconds)
          </text>
          <text
            transform={`rotate(-90) translate(${-svgHeight / 2}, 15)`}
            textAnchor="middle"
            fontFamily="Inter"
            fontSize="11"
            fill="var(--text-secondary)"
            fontWeight="600"
          >
            Prediction Error (L2 norm)
          </text>
        </svg>
      </div>

      {/* Caption & Anomaly Description Callout */}
      <div
        style={{
          marginTop: '12px',
          padding: '10px 14px',
          backgroundColor: isAnomaly ? 'var(--status-anomaly-bg)' : 'var(--status-normal-bg)',
          border: `1px solid ${isAnomaly ? 'var(--status-anomaly-border)' : 'var(--status-normal-border)'}`,
          borderRadius: 'var(--radius-sm)',
          fontSize: '12px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px',
        }}
      >
        {isAnomaly ? (
          <AlertCircle size={16} style={{ color: 'var(--status-anomaly)', flexShrink: 0, marginTop: '2px' }} />
        ) : (
          <CheckCircle2 size={16} style={{ color: 'var(--status-normal)', flexShrink: 0, marginTop: '2px' }} />
        )}
        <div>
          <div style={{ fontWeight: 600, color: isAnomaly ? 'var(--status-anomaly)' : 'var(--status-normal)' }}>
            {isAnomaly ? 'Anomalous Deviation Spike Detected' : 'Normal Predictive Residual Profile'}
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {isAnomaly && anomalyRegions.length > 0
              ? `At t=${anomalyRegions[0].startTime}s–${anomalyRegions[0].endTime}s, observed acoustic behavior deviated significantly from TCN predictions (${anomalyRegions[0].description}).`
              : 'Prediction residual errors remain consistently below calibrated threshold across the entire 10-second recording sequence.'}
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { ROC_CURVES } from '../data/mockEvaluation';
import { Filter } from 'lucide-react';

export const RocChart: React.FC = () => {
  const [selectedCurveKey, setSelectedCurveKey] = useState<string>('all');

  const selectedCurve = ROC_CURVES[selectedCurveKey] || ROC_CURVES['all'];

  const svgW = 520;
  const svgH = 340;
  const pad = { top: 20, right: 30, bottom: 45, left: 55 };
  const graphW = svgW - pad.left - pad.right;
  const graphH = svgH - pad.top - pad.bottom;

  const getX = (fpr: number) => pad.left + fpr * graphW;
  const getY = (tpr: number) => pad.top + graphH - tpr * graphH;

  const pointsString = selectedCurve.points
    .map((p) => `${getX(p.fpr)},${getY(p.tpr)}`)
    .join(' ');

  const opPt = selectedCurve.points.find((p) => p.fpr >= 0.08) || selectedCurve.points[5];
  const opPtX = getX(opPt.fpr);
  const opPtY = getY(opPt.tpr);
  const opPtLabelX = opPtX + 10;
  const opPtLabelY = opPtY + 4;
  const opPtText = `τ_cal Operating Pt (FPR=${opPt.fpr})`;

  const gridValues = [0.0, 0.2, 0.4, 0.6, 0.8, 1.0];

  return (
    <div className="panel" style={{ padding: '16px' }}>
      <div className="panel-header">
        <div className="panel-title">RECEIVER OPERATING CHARACTERISTIC (ROC)</div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={13} style={{ color: 'var(--text-muted)' }} />
          <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            Machine Filter:
          </span>
          <select
            className="select-input"
            style={{ fontSize: '11px', padding: '4px 8px' }}
            value={selectedCurveKey}
            onChange={(e) => setSelectedCurveKey(e.target.value)}
          >
            <option value="all">All Machine IDs (Aggregate Mean)</option>
            <option value="fan_id00">fan_id00 (AUC = 0.94)</option>
            <option value="fan_id02">fan_id02 (AUC = 0.91)</option>
            <option value="valve_id00">valve_id00 (AUC = 0.87)</option>
            <option value="valve_id02">valve_id02 (AUC = 0.89)</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '8px' }}>
        <svg
          viewBox={`0 0 ${svgW} ${svgH}`}
          style={{ width: '100%', maxWidth: '520px', height: 'auto', display: 'block' }}
        >
          {gridValues.map((v) => {
            const y = getY(v);
            const x = getX(v);
            return (
              <g key={v}>
                <line x1={pad.left} y1={y} x2={svgW - pad.right} y2={y} stroke="#e6e6e2" strokeDasharray="2,2" />
                <text x={pad.left - 8} y={y + 4} textAnchor="end" fontFamily="IBM Plex Mono" fontSize="10" fill="#71717a">
                  {v.toFixed(1)}
                </text>
                <line x1={x} y1={pad.top} x2={x} y2={svgH - pad.bottom} stroke="#e6e6e2" strokeDasharray="2,2" />
                <text x={x} y={svgH - pad.bottom + 16} textAnchor="middle" fontFamily="IBM Plex Mono" fontSize="10" fill="#71717a">
                  {v.toFixed(1)}
                </text>
              </g>
            );
          })}

          <line
            x1={getX(0)}
            y1={getY(0)}
            x2={getX(1)}
            y2={getY(1)}
            stroke="#a1a1aa"
            strokeWidth="1.5"
            strokeDasharray="4,4"
          />

          <g>
            <circle
              cx={opPtX}
              cy={opPtY}
              r="5"
              fill="var(--accent-primary)"
              stroke="#ffffff"
              strokeWidth="2"
            />
            <text
              x={opPtLabelX}
              y={opPtLabelY}
              fontFamily="IBM Plex Mono"
              fontSize="10"
              fontWeight="bold"
              fill="var(--accent-primary)"
            >
              {opPtText}
            </text>
          </g>

          <polyline
            fill="none"
            stroke="var(--accent-primary)"
            strokeWidth="2.5"
            points={pointsString}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <text x={svgW / 2} y={svgH - 6} textAnchor="middle" fontFamily="Inter" fontSize="11" fill="#575752" fontWeight="500">
            False Positive Rate (FPR)
          </text>
          <text
            transform={`rotate(-90) translate(${-svgH / 2}, 16)`}
            textAnchor="middle"
            fontFamily="Inter"
            fontSize="11"
            fill="#575752"
            fontWeight="500"
          >
            True Positive Rate (TPR)
          </text>
        </svg>
      </div>

      <div
        style={{
          marginTop: '12px',
          padding: '10px 14px',
          backgroundColor: 'var(--bg-panel-subtle)',
          border: '1px solid var(--border-color-subtle)',
          borderRadius: 'var(--radius-sm)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '11px',
          fontFamily: 'var(--font-mono)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '3px', backgroundColor: 'var(--accent-primary)' }}></span>
            <span>{selectedCurve.name}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '2px', borderTop: '2px dashed #a1a1aa' }}></span>
            <span style={{ color: 'var(--text-muted)' }}>Random baseline (AUC = 0.50)</span>
          </div>
        </div>

        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-primary)' }}>
          AUC = {selectedCurve.auc.toFixed(3)}
        </div>
      </div>
    </div>
  );
};

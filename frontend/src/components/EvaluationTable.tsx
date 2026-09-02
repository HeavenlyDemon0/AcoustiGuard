import React from 'react';
import type { MachineEvaluationItem } from '../types';

interface EvaluationTableProps {
  data: MachineEvaluationItem[];
  isRealData?: boolean;
}

export const EvaluationTable: React.FC<EvaluationTableProps> = ({ data, isRealData = false }) => {
  const avgAuc = (data.reduce((acc, item) => acc + item.auc, 0) / data.length).toFixed(3);
  const avgPauc = (data.reduce((acc, item) => acc + item.pauc, 0) / data.length).toFixed(3);

  return (
    <div className="panel" style={{ padding: '0', overflow: 'hidden' }}>
      <div
        style={{
          padding: '14px 18px',
          backgroundColor: 'var(--bg-panel-subtle)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              fontWeight: 700,
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            MACHINE METRICS BREAKDOWN
          </span>

          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: '2px',
              backgroundColor: isRealData ? 'var(--status-normal-bg)' : 'var(--accent-light)',
              color: isRealData ? 'var(--status-normal)' : 'var(--accent-primary)',
              border: `1px solid ${isRealData ? 'var(--status-normal-border)' : 'var(--accent-primary)'}`,
            }}
          >
            {isRealData ? 'REAL EVALUATION DATA' : 'MOCK FALLBACK DATA'}
          </span>
        </div>

        <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
          Test Benchmark: 1,600 Audio Clips (10.0s @ 16kHz)
        </span>
      </div>

      <table className="tech-table">
        <thead>
          <tr>
            <th>Machine ID</th>
            <th>Machine Type</th>
            <th>AUC</th>
            <th>pAUC (p=0.1)</th>
            <th>Calibrated Threshold (τ_cal)</th>
            <th>Test Clips</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.machineId}>
              <td className="mono-val" style={{ fontWeight: 700 }}>
                {row.machineId}
              </td>
              <td>{row.machineType}</td>
              <td className="mono-val" style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>
                {row.auc.toFixed(2)}
              </td>
              <td className="mono-val" style={{ fontWeight: 600 }}>
                {row.pauc.toFixed(2)}
              </td>
              <td className="mono-val" style={{ color: 'var(--text-secondary)' }}>
                {row.threshold.toFixed(4)}
              </td>
              <td className="mono-val">{row.testClips}</td>
              <td>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 6px',
                    backgroundColor: 'var(--status-normal-bg)',
                    color: 'var(--status-normal)',
                    border: '1px solid var(--status-normal-border)',
                    borderRadius: '2px',
                  }}
                >
                  CALIBRATED
                </span>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ backgroundColor: 'var(--bg-panel-subtle)', fontWeight: 700 }}>
            <td colSpan={2} style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase' }}>
              Overall Mean Performance
            </td>
            <td className="mono-val" style={{ color: 'var(--accent-primary)', fontSize: '14px' }}>
              {avgAuc}
            </td>
            <td className="mono-val" style={{ fontSize: '14px' }}>
              {avgPauc}
            </td>
            <td colSpan={3} style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
              1,600 total evaluated clips
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

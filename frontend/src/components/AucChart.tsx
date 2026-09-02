import React from 'react';
import type { MachineEvaluationItem } from '../types';

interface AucChartProps {
  data: MachineEvaluationItem[];
}

export const AucChart: React.FC<AucChartProps> = ({ data }) => {
  return (
    <div className="panel" style={{ padding: '16px' }}>
      <div className="panel-header">
        <div className="panel-title">AUC BY MACHINE ID</div>
        <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
          Area Under ROC Curve [0.50 – 1.00]
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '12px' }}>
        {data.map((item) => {
          // Map AUC 0.5 to 1.0 to 0% - 100% width
          const barWidth = Math.max(10, ((item.auc - 0.5) / 0.5) * 100);

          return (
            <div key={item.machineId} style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              {/* Machine ID Label */}
              <div
                style={{
                  width: '90px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  textAlign: 'right',
                }}
              >
                {item.machineId}
              </div>

              {/* Bar track container */}
              <div
                style={{
                  flex: 1,
                  height: '24px',
                  backgroundColor: 'var(--bg-panel-subtle)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Benchmark Baseline Line at AUC = 0.80 */}
                <div
                  style={{
                    position: 'absolute',
                    left: '60%', // (0.80 - 0.5)/0.5 = 60%
                    top: 0,
                    bottom: 0,
                    borderLeft: '1px stroke var(--border-dark)',
                    zIndex: 2,
                  }}
                />

                {/* Filled Bar */}
                <div
                  style={{
                    width: `${barWidth}%`,
                    height: '100%',
                    backgroundColor: 'var(--accent-primary)',
                    borderRadius: '2px 0 0 2px',
                    transition: 'width 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                />
              </div>

              {/* Value Label */}
              <div
                style={{
                  width: '50px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: 'var(--accent-primary)',
                }}
              >
                {item.auc.toFixed(2)}
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          marginTop: '16px',
          paddingTop: '10px',
          borderTop: '1px solid var(--border-color-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '10.5px',
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-muted)',
        }}
      >
        <span>Baseline AUC: 0.50</span>
        <span>Target Threshold: 0.80</span>
        <span>Max: 1.00</span>
      </div>
    </div>
  );
};

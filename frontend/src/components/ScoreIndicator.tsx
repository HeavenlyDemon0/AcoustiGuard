import React from 'react';
import type { AnomalyDecision } from '../types';

interface ScoreIndicatorProps {
  score: number;
  threshold: number;
  decision: AnomalyDecision;
  maxScale?: number;
}

export const ScoreIndicator: React.FC<ScoreIndicatorProps> = ({
  score,
  threshold,
  decision,
  maxScale = 0.08,
}) => {
  const threshPercent = Math.min(100, Math.max(0, (threshold / maxScale) * 100));
  const scorePercent = Math.min(100, Math.max(0, (score / maxScale) * 100));
  const isAnomaly = decision === 'ANOMALY';
  const margin = score - threshold;
  const marginStr = margin > 0 ? `+${margin.toFixed(4)}` : margin.toFixed(4);

  const threshPercentStr = `${threshPercent}%`;
  const scorePercentStr = `${scorePercent}%`;
  const invThreshPercentStr = `${100 - threshPercent}%`;

  return (
    <div
      style={{
        padding: '16px 20px',
        backgroundColor: 'var(--bg-panel-subtle)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-sm)',
        marginTop: '16px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            fontWeight: 700,
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Continuous Anomaly Score vs Calibrated Threshold Scale
        </span>

        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'var(--text-muted)',
          }}
        >
          Scale: 0.0000 - {maxScale.toFixed(4)}
        </span>
      </div>

      <div style={{ position: 'relative', height: '36px', width: '100%', margin: '14px 0 28px 0' }}>
        <div
          style={{
            position: 'absolute',
            top: '8px',
            left: 0,
            right: 0,
            height: '20px',
            borderRadius: '2px',
            display: 'flex',
            overflow: 'hidden',
            border: '1px solid var(--border-dark)',
          }}
        >
          <div
            style={{
              width: threshPercentStr,
              backgroundColor: 'var(--status-normal-bg)',
              borderRight: '2px dashed var(--status-normal)',
              display: 'flex',
              alignItems: 'center',
              paddingLeft: '8px',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                fontWeight: 700,
                color: 'var(--status-normal)',
                letterSpacing: '0.06em',
              }}
            >
              NORMAL REGION
            </span>
          </div>

          <div
            style={{
              width: invThreshPercentStr,
              backgroundColor: 'var(--status-anomaly-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              paddingRight: '8px',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                fontWeight: 700,
                color: 'var(--status-anomaly)',
                letterSpacing: '0.06em',
              }}
            >
              ANOMALY REGION
            </span>
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            top: '2px',
            bottom: '2px',
            left: threshPercentStr,
            width: '2px',
            backgroundColor: 'var(--text-primary)',
            zIndex: 3,
            transform: 'translateX(-50%)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              bottom: '-22px',
              left: '50%',
              transform: 'translateX(-50%)',
              whiteSpace: 'nowrap',
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              backgroundColor: 'var(--bg-panel)',
              padding: '1px 5px',
              border: '1px solid var(--border-dark)',
              borderRadius: '2px',
            }}
          >
            THRESHOLD ({threshold.toFixed(4)})
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            top: '0px',
            left: scorePercentStr,
            zIndex: 4,
            transform: 'translateX(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            transition: 'left 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 6px',
              backgroundColor: isAnomaly ? 'var(--status-anomaly)' : 'var(--status-normal)',
              color: '#ffffff',
              borderRadius: '2px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
              whiteSpace: 'nowrap',
              marginBottom: '-2px',
            }}
          >
            SCORE: {score.toFixed(4)}
          </div>
          <div
            style={{
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: isAnomaly ? '7px solid var(--status-anomaly)' : '7px solid var(--status-normal)',
            }}
          />
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '22px',
          paddingTop: '8px',
          borderTop: '1px solid var(--border-color-subtle)',
          fontSize: '11px',
          fontFamily: 'var(--font-mono)',
        }}
      >
        <div>
          <span style={{ color: 'var(--text-muted)' }}>0.0000</span>
        </div>
        <div>
          <span style={{ color: 'var(--text-secondary)' }}>
            Margin: <strong style={{ color: isAnomaly ? 'var(--status-anomaly)' : 'var(--status-normal)' }}>
              {marginStr}
            </strong>
          </span>
        </div>
        <div>
          <span style={{ color: 'var(--text-muted)' }}>{maxScale.toFixed(4)}</span>
        </div>
      </div>
    </div>
  );
};

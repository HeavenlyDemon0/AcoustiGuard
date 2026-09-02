import React from 'react';
import { Header } from '../components/Header';
import type { MachineId, NavScreen } from '../types';
import { Activity, Cpu, ShieldCheck, ArrowRight, ChevronRight } from 'lucide-react';

interface OverviewProps {
  onNavigateToLive: (machineId?: MachineId) => void;
  onNavigateToScreen: (screen: NavScreen) => void;
}

export const Overview: React.FC<OverviewProps> = ({ onNavigateToLive, onNavigateToScreen }) => {
  const pipelineSteps = [
    { id: '1', name: 'AUDIO', desc: 'Raw Waveform (16kHz WAV)' },
    { id: '2', name: 'LOG-MEL', desc: '64-Bin Log-Mel Spectrogram' },
    { id: '3', name: 'TCN PREDICTION', desc: 'Sequence Forecasting' },
    { id: '4', name: 'ERROR', desc: 'Temporal Residual' },
    { id: '5', name: 'CALIBRATION', desc: 'Conformal Quantile' },
    { id: '6', name: 'DECISION', desc: 'NORMAL / ANOMALY' },
  ];

  return (
    <div>
      <Header
        title="Overview"
        subtitle="Detect deviations from learned machine acoustic behavior using temporal predictive coding and machine-specific calibration."
        badge="INDUSTRIAL INSTRUMENTATION"
      />

      {/* System Pipeline Banner */}
      <div className="panel" style={{ padding: '20px' }}>
        <div className="panel-header" style={{ marginBottom: '14px' }}>
          <div className="panel-title">
            <Cpu size={14} style={{ color: 'var(--accent-primary)' }} />
            <span>ACOUSTIC PROCESSING PIPELINE</span>
          </div>
          <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            Architecture: TCN Predictive Coding (TCN-PC v0.1)
          </span>
        </div>

        <div className="pipeline-container">
          {pipelineSteps.map((step, idx) => (
            <React.Fragment key={step.id}>
              <div className="pipeline-step">
                <span className="pipeline-step-title">{step.name}</span>
                <span className="pipeline-step-desc">{step.desc}</span>
              </div>
              {idx < pipelineSteps.length - 1 && <span className="pipeline-arrow">→</span>}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Monitored Machines Grid Section */}
      <div className="panel" style={{ padding: '20px' }}>
        <div className="panel-header">
          <div className="panel-title">
            <Activity size={14} style={{ color: 'var(--accent-primary)' }} />
            <span>MONITORED MACHINES</span>
          </div>
          <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            8 Active Calibrated Machine Models
          </span>
        </div>

        <div className="grid-2col">
          {/* Fan Machine Card */}
          <div
            style={{
              padding: '16px',
              backgroundColor: 'var(--bg-panel-subtle)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  FAN (Industrial Blowers & Condensers)
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Periodic / continuous acoustic behavior
                </div>
              </div>
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
                ONLINE
              </span>
            </div>

            {/* Machine IDs List */}
            <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div
                style={{
                  padding: '8px 12px',
                  backgroundColor: 'var(--bg-panel)',
                  border: '1px solid var(--border-color-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <span className="mono-val" style={{ color: 'var(--text-primary)', fontSize: '12px' }}>fan_id00</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px' }}>HVAC Blower #00 (τ_cal = 0.0210)</span>
                </div>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ fontSize: '11px', padding: '3px 8px' }}
                  onClick={() => onNavigateToLive('fan_id00')}
                >
                  Analyze <ChevronRight size={12} />
                </button>
              </div>

              <div
                style={{
                  padding: '8px 12px',
                  backgroundColor: 'var(--bg-panel)',
                  border: '1px solid var(--border-color-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <span className="mono-val" style={{ color: 'var(--text-primary)', fontSize: '12px' }}>fan_id02</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px' }}>Cooling Tower #02 (τ_cal = 0.0205)</span>
                </div>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ fontSize: '11px', padding: '3px 8px' }}
                  onClick={() => onNavigateToLive('fan_id02')}
                >
                  Analyze <ChevronRight size={12} />
                </button>
              </div>
            </div>
          </div>

          {/* Valve Machine Card */}
          <div
            style={{
              padding: '16px',
              backgroundColor: 'var(--bg-panel-subtle)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  VALVE (Pneumatic & Solenoid)
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Event-driven / burst-like acoustic behavior
                </div>
              </div>
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
                ONLINE
              </span>
            </div>

            {/* Machine IDs List */}
            <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div
                style={{
                  padding: '8px 12px',
                  backgroundColor: 'var(--bg-panel)',
                  border: '1px solid var(--border-color-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <span className="mono-val" style={{ color: 'var(--text-primary)', fontSize: '12px' }}>valve_id00</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px' }}>Solenoid Valve #00 (τ_cal = 0.0305)</span>
                </div>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ fontSize: '11px', padding: '3px 8px' }}
                  onClick={() => onNavigateToLive('valve_id00')}
                >
                  Analyze <ChevronRight size={12} />
                </button>
              </div>

              <div
                style={{
                  padding: '8px 12px',
                  backgroundColor: 'var(--bg-panel)',
                  border: '1px solid var(--border-color-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <span className="mono-val" style={{ color: 'var(--text-primary)', fontSize: '12px' }}>valve_id02</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px' }}>Actuator Valve #02 (τ_cal = 0.0352)</span>
                </div>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ fontSize: '11px', padding: '3px 8px' }}
                  onClick={() => onNavigateToLive('valve_id02')}
                >
                  Analyze <ChevronRight size={12} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Technical How it works Section */}
      <div className="panel" style={{ padding: '20px' }}>
        <div className="panel-header">
          <div className="panel-title">
            <ShieldCheck size={14} style={{ color: 'var(--accent-primary)' }} />
            <span>HOW ACOUSTIGUARD OPERATES</span>
          </div>
          <button
            type="button"
            className="btn-secondary"
            style={{ fontSize: '11px', padding: '4px 10px' }}
            onClick={() => onNavigateToScreen('methodology')}
          >
            Read Methodology Details <ArrowRight size={12} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginTop: '12px' }}>
          {[
            { step: '1', title: 'Log-Mel Spectrogram', desc: 'Convert raw 16kHz audio waveforms into 64-bin log-mel energy representations.' },
            { step: '2', title: 'TCN Predictive Coding', desc: 'Temporal Convolutional Network models temporal dependencies under normal operation.' },
            { step: '3', title: 'Prediction Error', desc: 'Frame-level L2 residual error quantifies departure from expected acoustic dynamics.' },
            { step: '4', title: 'Conformal Calibration', desc: 'Establishes machine-specific non-parametric threshold at target false-positive rate.' },
            { step: '5', title: 'Continuous Score', desc: 'Aggregated anomaly score evaluated against calibrated threshold for final decision.' },
          ].map((item) => (
            <div
              key={item.step}
              style={{
                padding: '14px',
                backgroundColor: 'var(--bg-panel-subtle)',
                border: '1px solid var(--border-color-subtle)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--accent-primary)',
                  marginBottom: '4px',
                }}
              >
                STAGE 0{item.step}
              </div>
              <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)', marginBottom: '4px' }}>
                {item.title}
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                {item.desc}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

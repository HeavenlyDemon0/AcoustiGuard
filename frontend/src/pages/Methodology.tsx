import React from 'react';
import { Header } from '../components/Header';
import { Code, CheckCircle2, AlertTriangle } from 'lucide-react';

export const Methodology: React.FC = () => {
  const steps = [
    {
      num: '1',
      title: 'LOG-MEL REPRESENTATION',
      desc: 'Raw audio waveform (16 kHz, single channel) is transformed into a 64-bin Log-Mel Spectrogram using a 25ms Hanning window with 10ms frame hop size. The logarithmic energy scaling matches industrial perceptual acoustic intensity dynamics.',
      params: 'FFT Size: 1024 • Hop Length: 160 • Mel Channels: 64 • Frequency Range: 50 Hz – 8,000 Hz',
    },
    {
      num: '2',
      title: 'TEMPORAL PREDICTION (TCN-PC)',
      desc: 'A 4-layer Temporal Convolutional Network (TCN) with causal dilated convolutions (dilations 1, 2, 4, 8) learns sequence context of normal machine acoustics. The network acts as a predictive coder forecasting frame x̂_t from historical sequence context x_<t.',
      params: 'Receptive Field: 3.2s • Hidden Dim: 64 • Causal Conv1D • Residual Block Connections',
    },
    {
      num: '3',
      title: 'PREDICTION ERROR CALCULATION',
      desc: 'Frame-level residual error e_t = ||x_t - x̂_t||_2 measures the euclidean distance between the observed log-mel frame and the model\'s temporal prediction. Healthy acoustic patterns yield low residual errors; structural defects produce sudden residual spikes.',
      params: 'Frame Error Metric: L2 Norm • Window Smoothing: 5-frame moving average',
    },
    {
      num: '4',
      title: 'CONFORMAL CALIBRATION',
      desc: 'To eliminate empirical score scale variability across heterogeneous machine types (Fan vs Valve), split-conformal quantile calibration is performed independently for each machine ID using non-anomalous baseline validation recordings at coverage level 1 - α = 0.95.',
      params: 'Quantile Significance α = 0.05 • Per-Machine Threshold τ_cal',
    },
    {
      num: '5',
      title: 'CONTINUOUS ANOMALY DECISION',
      desc: 'An aggregate sequence score S(x) = (1/T) ∑ e_t is evaluated against the machine\'s calibrated threshold τ_cal. If S(x) > τ_cal, the system flags an ANOMALY decision along with localized temporal error timestamps.',
      params: 'Decision Rule: Binary Threshold Test • Output: Decision, Score, Margin, Timestamps',
    },
  ];

  return (
    <div>
      <Header
        title="How AcoustiGuard Decides"
        subtitle="Theoretical foundation, temporal predictive coding architecture, and split-conformal calibration methodology."
        badge="TECHNICAL METHODOLOGY"
      />

      {/* Main 5 Pipeline Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
        {steps.map((step) => (
          <div key={step.num} className="panel" style={{ padding: '18px 20px', margin: 0 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#ffffff',
                  backgroundColor: 'var(--accent-primary)',
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-sm)',
                  flexShrink: 0,
                }}
              >
                0{step.num}
              </div>

              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    letterSpacing: '0.04em',
                    marginBottom: '6px',
                  }}
                >
                  {step.title}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '8px' }}>
                  {step.desc}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    backgroundColor: 'var(--bg-panel-subtle)',
                    padding: '4px 10px',
                    borderRadius: '2px',
                    display: 'inline-block',
                    border: '1px solid var(--border-color-subtle)',
                  }}
                >
                  {step.params}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Decision Logic Matrix Summary */}
      <div className="panel" style={{ padding: '20px', marginBottom: '24px' }}>
        <div className="panel-header">
          <div className="panel-title">DECISION MATRIX SUMMARY</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginTop: '12px' }}>
          {/* Normal Path */}
          <div
            style={{
              padding: '16px',
              backgroundColor: 'var(--status-normal-bg)',
              border: '1px solid var(--status-normal-border)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <CheckCircle2 size={18} style={{ color: 'var(--status-normal)' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 700, color: 'var(--status-normal)' }}>
                NORMAL OPERATING CONDITION
              </span>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>LOW ERROR</span>
              <span>→</span>
              <span>EXPECTED BEHAVIOR</span>
              <span>→</span>
              <strong style={{ color: 'var(--status-normal)' }}>NORMAL</strong>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>
              Residual errors remain below calibrated quantile threshold τ_cal. Machine operates within learned acoustic baseline parameters.
            </p>
          </div>

          {/* Anomaly Path */}
          <div
            style={{
              padding: '16px',
              backgroundColor: 'var(--status-anomaly-bg)',
              border: '1px solid var(--status-anomaly-border)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <AlertTriangle size={18} style={{ color: 'var(--status-anomaly)' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 700, color: 'var(--status-anomaly)' }}>
                ANOMALOUS OPERATING CONDITION
              </span>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>HIGH ERROR</span>
              <span>→</span>
              <span>UNEXPECTED BEHAVIOR</span>
              <span>→</span>
              <strong style={{ color: 'var(--status-anomaly)' }}>ANOMALY</strong>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>
              Residual error exceeds τ_cal. Acoustic spectral patterns depart significantly from expected TCN predictive temporal trajectory.
            </p>
          </div>
        </div>
      </div>

      {/* Backend Integration Code Guide */}
      <div className="panel" style={{ padding: '20px' }}>
        <div className="panel-header">
          <div className="panel-title">
            <Code size={14} style={{ color: 'var(--accent-primary)' }} />
            <span>PYTHON / GRADIO BACKEND INTEGRATION CODE</span>
          </div>
          <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            api/predict contract
          </span>
        </div>

        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
          To connect this React frontend prototype to your Python ML pipeline, implement the following endpoint contract in Gradio/FastAPI:
        </div>

        <pre
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11.5px',
            backgroundColor: '#111827',
            color: '#f3f4f6',
            padding: '16px',
            borderRadius: 'var(--radius-sm)',
            overflowX: 'auto',
            lineHeight: 1.5,
          }}
        >
{`# Python Inference Handler Example (Gradio / FastAPI)
import torchaudio
import numpy as np

def predict(audio_path: str, machine_id: str):
    # 1. Load Audio Waveform
    waveform, sr = torchaudio.load(audio_path)
    
    # 2. Compute Log-Mel Spectrogram
    log_mel = compute_log_mel_spectrogram(waveform, sr)
    
    # 3. Model Forward Pass & Prediction Error
    predicted_mel = tcn_model(log_mel)
    frame_errors = np.mean((log_mel - predicted_mel)**2, axis=0)
    
    # 4. Conformal Calibration Check
    threshold = CALIBRATED_THRESHOLDS[machine_id]
    anomaly_score = float(np.mean(frame_errors))
    decision = "ANOMALY" if anomaly_score > threshold else "NORMAL"
    
    return {
        "score": anomaly_score,
        "threshold": threshold,
        "decision": decision,
        "spectrogram": log_mel.tolist(),
        "frameErrors": frame_errors.tolist()
    }`}
        </pre>
      </div>
    </div>
  );
};

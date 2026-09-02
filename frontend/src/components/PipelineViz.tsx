/**
 * PipelineViz — 7-Stage Animated ML Pipeline Visualizer
 */

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FastForward, RotateCcw } from 'lucide-react';
import type { InferenceResult } from '../types';
import { ResultPanel } from './ResultPanel';

interface PipelineVizProps {
  result: InferenceResult;
  audioFile?: File | null;
  onReset: () => void;
}

const FINAL_STAGE = 7;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return reduced;
}

function useCountUp(target: number, durationMs: number, active: boolean): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) { setValue(0); return; }
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else setValue(target);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs, active]);
  return value;
}

// ---------------------------------------------------------------------------
// Shared StageHeader
// ---------------------------------------------------------------------------

const StageHeader: React.FC<{ chip: string; title: string; sub?: string }> = ({ chip, title, sub }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
    <span className="pipeline-stage-chip">{chip}</span>
    <div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{title}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{sub}</div>}
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Inferno colormap helper
// ---------------------------------------------------------------------------
function infernoColor(v: number): [number, number, number] {
  if (v < 0.25) { const t = v / 0.25; return [Math.round(40*t), Math.round(10*t), Math.round(60*t)]; }
  else if (v < 0.5) { const t = (v-0.25)/0.25; return [Math.round(40+130*t), Math.round(10+20*t), Math.round(60+40*t)]; }
  else if (v < 0.75) { const t = (v-0.5)/0.25; return [Math.round(170+60*t), Math.round(30+90*t), Math.round(100-80*t)]; }
  else { const t = (v-0.75)/0.25; return [Math.round(230+25*t), Math.round(120+125*t), Math.round(20+150*t)]; }
}

// ---------------------------------------------------------------------------
// Stage 1 — Waveform
// ---------------------------------------------------------------------------

function animateWaveform(ctx: CanvasRenderingContext2D, W: number, H: number, samples: number[]) {
  const totalFrames = 40;
  let frame = 0;
  const mid = H / 2;
  const amp = H * 0.42;
  function draw() {
    frame++;
    const revealX = Math.floor((frame / totalFrames) * W);
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = '#1e2230'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, mid); ctx.lineTo(W, mid); ctx.stroke();
    ctx.beginPath(); ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 1.5;
    ctx.shadowColor = '#38bdf8'; ctx.shadowBlur = 4;
    for (let x = 0; x <= revealX && x < samples.length; x++) {
      const y = mid - (samples[x] ?? 0) * amp;
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke(); ctx.shadowBlur = 0;
    if (frame < totalFrames) requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
}

const WaveformStage: React.FC<{ audioFile?: File | null }> = ({ audioFile }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [label, setLabel] = useState('Decoding audio buffer...');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width; const H = canvas.height;

    if (!audioFile) {
      setLabel('No file provided — illustrative mock waveform');
      const mock = Array.from({ length: W }, (_, i) =>
        Math.sin(i * 0.08) * 0.4 + Math.sin(i * 0.031) * 0.25 + (Math.random() - 0.5) * 0.12
      );
      animateWaveform(ctx, W, H, mock);
      return;
    }

    audioFile.arrayBuffer().then((buf) => {
      const audioCtx = new AudioContext();
      audioCtx.decodeAudioData(buf, (decoded) => {
        const raw = decoded.getChannelData(0);
        const step = Math.max(1, Math.floor(raw.length / W));
        const samples = Array.from({ length: W }, (_, i) => raw[i * step] ?? 0);
        setLabel(`${decoded.duration.toFixed(1)}s clip · ${(decoded.sampleRate/1000).toFixed(0)} kHz · mono`);
        animateWaveform(ctx, W, H, samples);
        audioCtx.close();
      }, () => {
        setLabel('Decode failed — illustrative waveform');
        const mock = Array.from({ length: W }, (_, i) => Math.sin(i * 0.07) * 0.35);
        animateWaveform(ctx, W, H, mock);
      });
    }).catch(() => setLabel('Buffer read error'));
  }, [audioFile]);

  return (
    <div className="pipeline-viz-stage">
      <StageHeader chip="STAGE 1" title="Audio Ingestion" sub="WAV file → PCM amplitude buffer via Web Audio API" />
      <div style={{ background: '#000', borderRadius: 3, border: '1px solid var(--border-dark)', overflow: 'hidden', height: 100 }}>
        <canvas ref={canvasRef} width={900} height={100} style={{ width: '100%', height: '100%', display: 'block' }} />
      </div>
      <div style={{ marginTop: 6, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>{label}</div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Stage 2 — Spectrogram reveal
// ---------------------------------------------------------------------------

const SpectrogramStage: React.FC<{ result: InferenceResult }> = ({ result }) => {
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);
  const liveRef = useRef<HTMLCanvasElement>(null);
  const [rendered, setRendered] = useState(false);
  const spec = result.spectrogram;

  useEffect(() => {
    const offscreen = document.createElement('canvas');
    offscreen.width = 700; offscreen.height = 180;
    offscreenRef.current = offscreen;
    const ctx = offscreen.getContext('2d');
    if (!ctx || !spec.data || spec.data.length === 0) return;

    const W = offscreen.width; const H = offscreen.height;
    const nFreq = spec.freqBins; const nTime = spec.timeBins;

    const allVals: number[] = [];
    for (let r = 0; r < spec.data.length; r++) {
      const row = spec.data[r];
      if (row) for (let c = 0; c < row.length; c++) allVals.push(row[c]);
    }
    allVals.sort((a, b) => a - b);
    const minDb = allVals[0] ?? 0;
    const maxDb = allVals[allVals.length - 1] ?? 1;
    const cutoffDb = allVals[Math.floor(allVals.length * 0.68)] ?? 0.5;

    const imgData = ctx.createImageData(W, H);
    for (let py = 0; py < H; py++) {
      const freqIdx = Math.floor(((H - 1 - py) / H) * nFreq);
      for (let px = 0; px < W; px++) {
        const timeIdx = Math.floor((px / W) * nTime);
        const raw = spec.data[freqIdx]?.[timeIdx] ?? minDb;
        let intensity = 0;
        if (raw > cutoffDb && maxDb > cutoffDb) {
          intensity = Math.pow(Math.max(0, Math.min(1, (raw - cutoffDb) / (maxDb - cutoffDb))), 1.15);
        }
        const i = (py * W + px) * 4;
        if (intensity <= 0) {
          imgData.data[i]=0; imgData.data[i+1]=0; imgData.data[i+2]=0;
        } else {
          const [r, g, b] = infernoColor(intensity);
          imgData.data[i]=r; imgData.data[i+1]=g; imgData.data[i+2]=b;
        }
        imgData.data[i+3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
    setRendered(true);
  }, [spec]);

  useEffect(() => {
    if (!rendered) return;
    const live = liveRef.current;
    const offscreen = offscreenRef.current;
    if (!live || !offscreen) return;
    const ctx = live.getContext('2d');
    if (!ctx) return;
    const W = live.width; const H = live.height;
    const totalFrames = 50;
    let frame = 0;
    function draw() {
      frame++;
      const revealW = Math.floor((frame / totalFrames) * W);
      ctx!.clearRect(0, 0, W, H);
      if (revealW > 0) ctx!.drawImage(offscreen!, 0, 0, revealW, H, 0, 0, revealW, H);
      if (revealW < W) {
        const grad = ctx!.createLinearGradient(revealW - 12, 0, revealW + 4, 0);
        grad.addColorStop(0, 'rgba(56, 189, 248, 0)');
        grad.addColorStop(1, 'rgba(56, 189, 248, 0.5)');
        ctx!.fillStyle = grad;
        ctx!.fillRect(revealW - 12, 0, 16, H);
      }
      if (frame < totalFrames) requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
  }, [rendered]);

  const shapeLabel = spec.data?.length ? `${spec.freqBins} mel bins × ${spec.timeBins} frames` : '—';

  return (
    <div className="pipeline-viz-stage">
      <StageHeader chip="STAGE 2" title="Log-Mel Spectrogram Extraction" sub={shapeLabel} />
      <div style={{ background: '#000', borderRadius: 3, border: '1px solid var(--border-dark)', overflow: 'hidden', height: 180 }}>
        {spec.data?.length === 0 ? (
          <div style={{ padding: 20, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>No spectrogram data</div>
        ) : (
          <canvas ref={liveRef} width={700} height={180} style={{ width: '100%', height: '100%', display: 'block' }} />
        )}
      </div>
      <div style={{ marginTop: 6, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
        {shapeLabel} · 64 log-Mel filter banks · hop = 512 / 16 kHz
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Stage 3 — TCN
// ---------------------------------------------------------------------------

const TCN_LAYERS = [
  { label: 'Dil x1', blocks: 4 },
  { label: 'Dil x2', blocks: 4 },
  { label: 'Dil x4', blocks: 4 },
  { label: 'Dil x8', blocks: 4 },
  { label: 'Output',  blocks: 2 },
];

const TCNStage: React.FC<{ inferenceMs: number }> = ({ inferenceMs }) => {
  const pulseDurationMs = Math.min(2500, Math.max(1000, inferenceMs > 0 ? inferenceMs * 3 : 1400));
  const [activeLayer, setActiveLayer] = useState(0);
  const frameMs = pulseDurationMs / TCN_LAYERS.length;

  useEffect(() => {
    let i = 0;
    const iv = setInterval(() => {
      i++;
      if (i < TCN_LAYERS.length) setActiveLayer(i);
      else clearInterval(iv);
    }, frameMs);
    return () => clearInterval(iv);
  }, [frameMs]);

  return (
    <div className="pipeline-viz-stage">
      <StageHeader chip="STAGE 3" title="TCN Forward Pass"
        sub={`Causal TCN — predicts each frame from prior 6 frames — abstract block diagram, not a literal weight visualization`} />
      <div style={{ padding: '16px 0 8px', display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto' }}>
        {TCN_LAYERS.map((layer, li) => (
          <React.Fragment key={li}>
            {li > 0 && (
              <div style={{
                width: 20, height: 2, flexShrink: 0, alignSelf: 'center', margin: '0 2px',
                background: activeLayer >= li ? 'var(--accent-primary)' : 'var(--border-dark)',
                boxShadow: activeLayer >= li ? '0 0 6px rgba(194,94,0,0.5)' : 'none',
                transition: 'background 0.2s, box-shadow 0.2s',
              }} />
            )}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, flexShrink: 0 }}>
              {Array.from({ length: layer.blocks }).map((_, bi) => (
                <div key={bi} className={`tcn-block${activeLayer === li ? ' active' : ''}`} style={{ width: 58, height: 18 }} />
              ))}
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 9, marginTop: 2, transition: 'color 0.2s',
                color: activeLayer >= li ? 'var(--accent-primary)' : 'var(--text-muted)',
              }}>{layer.label}</span>
            </div>
          </React.Fragment>
        ))}
      </div>
      <div style={{ marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
        Measured inference latency: {inferenceMs > 0 ? `${inferenceMs.toFixed(0)} ms` : 'N/A'}
        {' · '}Pulse scaled to {(pulseDurationMs/1000).toFixed(1)}s (clamped 1–2.5s)
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Stage 4 — Per-frame error chart
// ---------------------------------------------------------------------------

const FrameErrorStage: React.FC<{ result: InferenceResult }> = ({ result }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameErrors = result.frameErrors;
  const threshold = result.threshold;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || frameErrors.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width; const H = canvas.height;
    const PAD = { t: 16, r: 16, b: 30, l: 56 };
    const gW = W - PAD.l - PAD.r; const gH = H - PAD.t - PAD.b;
    const maxErr = Math.max(threshold * 1.3, ...frameErrors.map((f) => f.error)) * 1.1;
    const maxTime = frameErrors[frameErrors.length - 1]?.time ?? 10;

    const getX = (t: number) => PAD.l + (t / maxTime) * gW;
    const getY = (e: number) => PAD.t + gH - (e / maxErr) * gH;
    const threshY = getY(threshold);
    const attentionThresh = (result.debugLog?.p95_score ?? threshold) * 0.82;

    const totalFrames = 55;
    let frame = 0;

    function draw() {
      frame++;
      const revealIdx = Math.floor((frame / totalFrames) * frameErrors.length);
      ctx!.clearRect(0, 0, W, H);

      // Axes
      ctx!.strokeStyle = '#2a2f42'; ctx!.lineWidth = 1;
      ctx!.beginPath(); ctx!.moveTo(PAD.l, PAD.t); ctx!.lineTo(PAD.l, PAD.t + gH); ctx!.stroke();
      ctx!.beginPath(); ctx!.moveTo(PAD.l, PAD.t + gH); ctx!.lineTo(PAD.l + gW, PAD.t + gH); ctx!.stroke();

      // Y ticks
      ctx!.fillStyle = '#6b7280'; ctx!.font = '9px monospace'; ctx!.textAlign = 'right';
      [0, threshold, maxErr * 0.5, maxErr].forEach((tick) => {
        ctx!.fillText(tick.toFixed(4), PAD.l - 4, getY(tick) + 3);
      });

      // Normal-region fill
      ctx!.fillStyle = 'rgba(21, 128, 61, 0.05)';
      ctx!.fillRect(PAD.l, threshY, gW, PAD.t + gH - threshY);

      // Threshold dashed line
      ctx!.strokeStyle = 'rgba(185, 28, 28, 0.75)';
      ctx!.lineWidth = 1.5; ctx!.setLineDash([5, 4]);
      ctx!.beginPath(); ctx!.moveTo(PAD.l, threshY); ctx!.lineTo(PAD.l + gW, threshY); ctx!.stroke();
      ctx!.setLineDash([]);
      ctx!.fillStyle = 'rgba(185,28,28,0.85)'; ctx!.font = '9px monospace'; ctx!.textAlign = 'left';
      ctx!.fillText(`tau = ${threshold.toFixed(4)}`, PAD.l + 4, threshY - 4);

      // Error line
      const visible = frameErrors.slice(0, revealIdx);
      if (visible.length > 1) {
        ctx!.beginPath(); ctx!.strokeStyle = '#38bdf8'; ctx!.lineWidth = 1.8;
        ctx!.shadowColor = '#38bdf8'; ctx!.shadowBlur = 3;
        visible.forEach((pt, i) => {
          const x = getX(pt.time); const y = getY(pt.error);
          if (i === 0) ctx!.moveTo(x, y); else ctx!.lineTo(x, y);
        });
        ctx!.stroke(); ctx!.shadowBlur = 0;

        // Orange dots for elevated (attention) frames
        visible.forEach((pt) => {
          if (pt.error > attentionThresh) {
            ctx!.fillStyle = 'rgba(251, 146, 60, 0.85)';
            ctx!.beginPath();
            ctx!.arc(getX(pt.time), getY(pt.error), 2.5, 0, Math.PI * 2);
            ctx!.fill();
          }
        });
      }

      // X ticks
      ctx!.fillStyle = '#6b7280'; ctx!.font = '9px monospace'; ctx!.textAlign = 'center';
      [0, 2, 4, 6, 8, 10].forEach((t) => ctx!.fillText(`${t}s`, getX(t), PAD.t + gH + 18));

      if (frame < totalFrames) requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
  }, [frameErrors, threshold, result.debugLog?.p95_score]);

  return (
    <div className="pipeline-viz-stage">
      <StageHeader chip="STAGE 4" title="Per-Frame Prediction Error"
        sub={`${frameErrors.length} frames · orange = elevated >82% of P95 (visual attention only, not the decision threshold)`} />
      <div style={{ background: '#0a0d12', borderRadius: 3, border: '1px solid var(--border-dark)', overflow: 'hidden' }}>
        {frameErrors.length === 0 ? (
          <div style={{ padding: 24, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
            No per-frame data in response
          </div>
        ) : (
          <canvas ref={canvasRef} width={900} height={200} style={{ width: '100%', height: 200, display: 'block' }} />
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Stage 5 — P95 aggregation
// ---------------------------------------------------------------------------

const P95Stage: React.FC<{ result: InferenceResult }> = ({ result }) => {
  const p95 = result.debugLog?.p95_score ?? result.anomalyScore;
  const [active, setActive] = useState(false);
  const animated = useCountUp(p95, 680, active);

  useEffect(() => {
    const t = setTimeout(() => setActive(true), 120);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="pipeline-viz-stage">
      <StageHeader chip="STAGE 5" title="P95 Score Aggregation"
        sub="95th percentile of all per-frame errors collapses into one clip-level score" />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0 8px', gap: 8 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
          np.percentile(frame_mse, 95)  =
        </div>
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 18 }}
          style={{ fontFamily: 'var(--font-mono)', fontSize: 44, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--accent-primary)' }}
        >
          {animated.toFixed(6)}
        </motion.div>
        <div style={{ display: 'flex', gap: 20, marginTop: 4, fontFamily: 'var(--font-mono)', fontSize: 11 }}>
          <span style={{ color: 'var(--text-muted)' }}>min <strong style={{ color: 'var(--text-secondary)' }}>{(result.debugLog?.frame_error_min ?? 0).toFixed(6)}</strong></span>
          <span style={{ color: 'var(--text-muted)' }}>mean <strong style={{ color: 'var(--text-secondary)' }}>{(result.debugLog?.frame_error_mean ?? 0).toFixed(6)}</strong></span>
          <span style={{ color: 'var(--text-muted)' }}>max <strong style={{ color: 'var(--text-secondary)' }}>{(result.debugLog?.frame_error_max ?? 0).toFixed(6)}</strong></span>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Stage 6 — Threshold comparison
// ---------------------------------------------------------------------------

const ThresholdStage: React.FC<{ result: InferenceResult }> = ({ result }) => {
  const isAnomaly = result.decision === 'ANOMALY';
  const score = result.anomalyScore;
  const threshold = result.threshold;
  const maxScale = Math.max(0.08, score * 1.4, threshold * 1.3);
  const scorePercent = Math.min(100, (score / maxScale) * 100);
  const threshPercent = Math.min(100, (threshold / maxScale) * 100);
  const margin = score - threshold;
  const [glowActive, setGlowActive] = useState(false);
  const [active, setActive] = useState(false);
  const animatedMargin = useCountUp(Math.abs(margin), 600, active);

  useEffect(() => {
    const t1 = setTimeout(() => setActive(true), 100);
    const t2 = setTimeout(() => setGlowActive(true), 700);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div className="pipeline-viz-stage">
      <StageHeader chip="STAGE 6" title="Threshold Comparison"
        sub={`P95 score vs conformal threshold tau = ${threshold.toFixed(6)}`} />
      <div
        className={glowActive ? (isAnomaly ? 'decision-glow-anomaly' : 'decision-glow-normal') : ''}
        style={{ padding: '20px 16px 16px', backgroundColor: 'var(--bg-panel-subtle)', border: `2px solid ${isAnomaly ? 'var(--status-anomaly)' : 'var(--status-normal)'}`, borderRadius: 'var(--radius-sm)', marginTop: 8 }}
      >
        <div style={{ position: 'relative', height: 36, margin: '8px 0 36px' }}>
          <div style={{ position: 'absolute', top: 8, left: 0, right: 0, height: 20, display: 'flex', overflow: 'hidden', borderRadius: 2, border: '1px solid var(--border-dark)' }}>
            <div style={{ width: `${threshPercent}%`, backgroundColor: 'var(--status-normal-bg)', borderRight: '2px dashed var(--status-normal)', display: 'flex', alignItems: 'center', paddingLeft: 8 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: 'var(--status-normal)', letterSpacing: '0.06em' }}>NORMAL</span>
            </div>
            <div style={{ flex: 1, backgroundColor: 'var(--status-anomaly-bg)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 8 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: 'var(--status-anomaly)', letterSpacing: '0.06em' }}>ANOMALY</span>
            </div>
          </div>
          <div style={{ position: 'absolute', top: 2, bottom: 2, left: `${threshPercent}%`, width: 2, backgroundColor: 'var(--text-primary)', transform: 'translateX(-50%)', zIndex: 3 }}>
            <div style={{ position: 'absolute', bottom: -22, left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: 'var(--text-primary)', background: 'var(--bg-panel)', padding: '1px 5px', border: '1px solid var(--border-dark)', borderRadius: 2 }}>
              tau = {threshold.toFixed(6)}
            </div>
          </div>
          <motion.div
            initial={{ left: '0%' }}
            animate={{ left: `${scorePercent}%` }}
            transition={{ type: 'spring', stiffness: 90, damping: 18, delay: 0.2 }}
            style={{ position: 'absolute', top: 0, zIndex: 4, transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
          >
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, padding: '2px 6px', backgroundColor: isAnomaly ? 'var(--status-anomaly)' : 'var(--status-normal)', color: '#fff', borderRadius: 2, whiteSpace: 'nowrap', marginBottom: -2 }}>
              {score.toFixed(6)}
            </div>
            <div style={{ width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: isAnomaly ? '7px solid var(--status-anomaly)' : '7px solid var(--status-normal)' }} />
          </motion.div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 20, alignItems: 'center' }}>
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.6 }}
            className={`status-badge ${isAnomaly ? 'anomaly' : 'normal'}`}
            style={{ fontSize: 16, padding: '8px 24px' }}
          >
            {result.decision}
          </motion.div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>
            margin: <strong style={{ color: isAnomaly ? 'var(--status-anomaly)' : 'var(--status-normal)' }}>
              {margin > 0 ? '+' : '-'}{animatedMargin.toFixed(6)}
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main PipelineViz orchestrator
// ---------------------------------------------------------------------------

export const PipelineViz: React.FC<PipelineVizProps> = ({ result, audioFile, onReset }) => {
  const reducedMotion = useReducedMotion();
  const [currentStage, setCurrentStage] = useState<number>(reducedMotion ? FINAL_STAGE : 1);
  const [skipped, setSkipped] = useState(reducedMotion);

  const inferenceMs = result.debugLog?.inference_time_ms ?? result.inferenceTimeMs ?? 0;

  const holdMs = useMemo<Record<number, number>>(() => {
    const clampedMs = Math.min(2500, Math.max(1000, inferenceMs > 0 ? inferenceMs * 3 : 1400));
    return { 1: 900, 2: 1100, 3: clampedMs + 400, 4: 1000, 5: 900, 6: 1400 };
  }, [inferenceMs]);

  useEffect(() => {
    if (skipped || currentStage >= FINAL_STAGE) return;
    const hold = holdMs[currentStage] ?? 800;
    const t = setTimeout(() => setCurrentStage((s) => s + 1), hold);
    return () => clearTimeout(t);
  }, [currentStage, skipped, holdMs]);

  const handleSkip = useCallback(() => {
    setSkipped(true);
    setCurrentStage(FINAL_STAGE);
  }, []);

  const handleReplay = useCallback(() => {
    if (reducedMotion) return;
    setSkipped(false);
    setCurrentStage(1);
  }, [reducedMotion]);

  if (currentStage >= FINAL_STAGE) {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 10, marginTop: 8 }}>
          {!reducedMotion && (
            <button type="button" className="pipeline-replay-btn" onClick={handleReplay}>
              <RotateCcw size={11} />
              REPLAY ANIMATION
            </button>
          )}
        </div>
        <div className="pipeline-result-card" style={{ animationDelay: skipped ? '0ms' : '60ms' }}>
          <ResultPanel result={result} audioFile={audioFile} onReset={onReset} animated={!skipped && !reducedMotion} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, paddingBottom: 10, borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            PIPELINE WALKTHROUGH
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>
            Stage {currentStage} / {FINAL_STAGE - 1}
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            {[1,2,3,4,5,6].map((s) => (
              <div key={s} style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: s <= currentStage ? 'var(--accent-primary)' : 'var(--border-dark)', transition: 'background 0.2s' }} />
            ))}
          </div>
        </div>
        <button type="button" className="pipeline-skip-btn" onClick={handleSkip}>
          <FastForward size={11} />
          SKIP
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStage}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        >
          {currentStage === 1 && <WaveformStage audioFile={audioFile} />}
          {currentStage === 2 && <SpectrogramStage result={result} />}
          {currentStage === 3 && <TCNStage inferenceMs={inferenceMs} />}
          {currentStage === 4 && <FrameErrorStage result={result} />}
          {currentStage === 5 && <P95Stage result={result} />}
          {currentStage === 6 && <ThresholdStage result={result} />}
        </motion.div>
      </AnimatePresence>

      <div style={{ marginTop: 16, height: 3, backgroundColor: 'var(--border-color)', borderRadius: 2, overflow: 'hidden' }}>
        <motion.div
          animate={{ width: `${((currentStage - 1) / (FINAL_STAGE - 1)) * 100}%` }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          style={{ height: '100%', backgroundColor: 'var(--accent-primary)' }}
        />
      </div>
    </div>
  );
};

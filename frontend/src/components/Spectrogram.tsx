import React, { useEffect, useRef, useState } from 'react';
import type { SpectrogramData, AnomalyRegion, FrameErrorPoint } from '../types';
import { Sliders, AlertTriangle, ShieldCheck } from 'lucide-react';

interface SpectrogramProps {
  spectrogram: SpectrogramData;
  currentTime?: number;
  isAnomaly?: boolean;
  anomalyRegions?: AnomalyRegion[];
  frameErrors?: FrameErrorPoint[];
}

type Colormap = 'inferno' | 'viridis' | 'cividis' | 'thermal';

export const Spectrogram: React.FC<SpectrogramProps> = ({
  spectrogram,
  currentTime,
  isAnomaly = false,
  anomalyRegions = [],
  frameErrors = [],
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [colormap, setColormap] = useState<Colormap>(isAnomaly ? 'thermal' : 'inferno');

  useEffect(() => {
    setColormap(isAnomaly ? 'thermal' : 'inferno');
  }, [isAnomaly]);

  // Scientific Colormap color mappers (returns [r, g, b])
  const getColor = (v: number, cmap: Colormap): [number, number, number] => {
    const val = Math.max(0, Math.min(1, v));

    if (cmap === 'inferno') {
      // Inferno: Black -> Dark Purple -> Crimson Red -> Bright Orange -> Pale Yellow
      if (val < 0.25) {
        const t = val / 0.25;
        return [Math.round(40 * t), Math.round(10 * t), Math.round(60 * t)];
      } else if (val < 0.5) {
        const t = (val - 0.25) / 0.25;
        return [Math.round(40 + 130 * t), Math.round(10 + 20 * t), Math.round(60 + 40 * t)];
      } else if (val < 0.75) {
        const t = (val - 0.5) / 0.25;
        return [Math.round(170 + 60 * t), Math.round(30 + 90 * t), Math.round(100 - 80 * t)];
      } else {
        const t = (val - 0.75) / 0.25;
        return [Math.round(230 + 25 * t), Math.round(120 + 125 * t), Math.round(20 + 150 * t)];
      }
    } else if (cmap === 'viridis') {
      // Viridis: Dark Purple -> Teal -> Emerald Green -> Light Yellow
      const r = Math.round(255 * (0.2 + 0.8 * Math.pow(val, 2)));
      const g = Math.round(255 * Math.sin(val * Math.PI * 0.9));
      const b = Math.round(255 * (0.5 + 0.5 * Math.cos(val * Math.PI)));
      return [Math.max(0, Math.min(255, r)), Math.max(0, Math.min(255, g)), Math.max(0, Math.min(255, b))];
    } else if (cmap === 'cividis') {
      // Cividis: Dark Navy -> Slate -> Gold (colorblind friendly scientific standard)
      const r = Math.round(255 * (0.05 + 0.9 * val));
      const g = Math.round(255 * (0.1 + 0.75 * val));
      const b = Math.round(255 * (0.35 + 0.3 * (1 - val)));
      return [r, g, b];
    } else {
      // Thermal: Deep Navy -> Rust Orange -> White Yellow
      if (val < 0.5) {
        const t = val / 0.5;
        return [Math.round(15 + 160 * t), Math.round(20 + 50 * t), Math.round(40 + 60 * t)];
      } else {
        const t = (val - 0.5) / 0.5;
        return [Math.round(175 + 75 * t), Math.round(70 + 175 * t), Math.round(100 + 145 * t)];
      }
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const numFreq = spectrogram.freqBins;
    const numTime = spectrogram.timeBins;

    // Compute min, max, and 68th percentile cutoff for color gating
    let minDb = 0;
    let maxDb = 1;
    let cutoffDb = 0.5;

    if (spectrogram.data && spectrogram.data.length > 0) {
      const allVals: number[] = [];
      for (let r = 0; r < spectrogram.data.length; r++) {
        const row = spectrogram.data[r];
        if (!row) continue;
        for (let c = 0; c < row.length; c++) {
          allVals.push(row[c]);
        }
      }
      if (allVals.length > 0) {
        allVals.sort((a, b) => a - b);
        minDb = allVals[0];
        maxDb = allVals[allVals.length - 1];
        const cutoffIdx = Math.floor(allVals.length * 0.68);
        cutoffDb = allVals[cutoffIdx];
      }
    }

    const imgData = ctx.createImageData(width, height);

    for (let py = 0; py < height; py++) {
      // Map py (0 at top) to freqIndex (numFreq - 1 at top for high frequencies)
      const freqIdx = Math.floor(((height - 1 - py) / height) * numFreq);

      for (let px = 0; px < width; px++) {
        const timeIdx = Math.floor((px / width) * numTime);
        const rawIntensity = spectrogram.data[freqIdx]?.[timeIdx] ?? minDb;

        // Gate low-energy background below cutoff to black (0)
        let intensity = 0;
        if (rawIntensity > cutoffDb && maxDb > cutoffDb) {
          const rawNorm = (rawIntensity - cutoffDb) / (maxDb - cutoffDb);
          intensity = Math.pow(Math.max(0, Math.min(1, rawNorm)), 1.15);
        }

        const pixelIdx = (py * width + px) * 4;

        if (intensity <= 0) {
          imgData.data[pixelIdx] = 0;
          imgData.data[pixelIdx + 1] = 0;
          imgData.data[pixelIdx + 2] = 0;
          imgData.data[pixelIdx + 3] = 255;
        } else {
          const [r, g, b] = getColor(intensity, colormap);
          imgData.data[pixelIdx] = r;
          imgData.data[pixelIdx + 1] = g;
          imgData.data[pixelIdx + 2] = b;
          imgData.data[pixelIdx + 3] = 255;
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);

    // ============================================================
    // PROMINENT ANOMALY REGION OVERLAYS
    // ============================================================
    const maxTime = spectrogram.timeAxis && spectrogram.timeAxis.length > 0
      ? spectrogram.timeAxis[spectrogram.timeAxis.length - 1]
      : 10.0;

    // 1. Draw structured Anomaly Regions if available
    if (anomalyRegions && anomalyRegions.length > 0) {
      anomalyRegions.forEach((region) => {
        const startX = Math.floor((region.startTime / maxTime) * width);
        const endX = Math.floor((region.endTime / maxTime) * width);
        const regWidth = Math.max(4, endX - startX);

        // Highlight band
        ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
        ctx.fillRect(startX, 0, regWidth, height);

        // Dashed border lines
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 3]);

        ctx.beginPath();
        ctx.moveTo(startX, 0);
        ctx.lineTo(startX, height);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(endX, 0);
        ctx.lineTo(endX, height);
        ctx.stroke();

        ctx.setLineDash([]);

        // Label Tag on canvas
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(startX, 4, Math.min(120, regWidth), 18);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px monospace';
        ctx.fillText('ANOMALY REGION', startX + 4, 17);
      });
    } else if (isAnomaly) {
      // 2. If decision is ANOMALY but no explicit region object, highlight high-error frame clusters
      let anomalyStart: number | null = null;
      frameErrors.forEach((fe) => {
        const isAnomFrame = fe.isAnomaly || fe.error > 0.05;
        if (isAnomFrame && anomalyStart === null) {
          anomalyStart = fe.time;
        } else if (!isAnomFrame && anomalyStart !== null) {
          const startX = Math.floor((anomalyStart / maxTime) * width);
          const endX = Math.floor((fe.time / maxTime) * width);
          ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
          ctx.fillRect(startX, 0, Math.max(6, endX - startX), height);

          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(startX, 0);
          ctx.lineTo(startX, height);
          ctx.stroke();

          anomalyStart = null;
        }
      });
      if (anomalyStart !== null) {
        const startX = Math.floor((anomalyStart / maxTime) * width);
        ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
        ctx.fillRect(startX, 0, width - startX, height);
      }

      // If whole clip is anomalous without frame breakdown, add top warning banner overlay
      ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
      ctx.fillRect(8, 8, 210, 22);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px monospace';
      ctx.fillText('⚠️ HIGH ANOMALY DEVIATION', 14, 23);
    }

    // Draw active playback time line if present
    if (currentTime !== undefined && currentTime >= 0) {
      const timePercent = currentTime / (maxTime || 10.0);
      const cursorX = Math.floor(timePercent * width);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(cursorX, 0);
      ctx.lineTo(cursorX, height);
      ctx.stroke();
    }
  }, [spectrogram, colormap, currentTime, isAnomaly, anomalyRegions, frameErrors]);

  return (
    <div
      className="panel"
      style={{
        padding: '16px',
        border: isAnomaly ? '2px solid var(--status-anomaly)' : '1px solid var(--border-color)',
        boxShadow: isAnomaly ? '0 0 16px rgba(239, 68, 68, 0.25)' : 'none',
        transition: 'all 0.3s ease',
      }}
    >
      <div className="panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="panel-title">LOG-MEL SPECTROGRAM</div>
          {isAnomaly ? (
            <span
              style={{
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                color: '#ffffff',
                backgroundColor: 'var(--status-anomaly)',
                padding: '2px 8px',
                borderRadius: '3px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <AlertTriangle size={12} />
              ANOMALOUS ACOUSTIC PATTERN
            </span>
          ) : (
            <span
              style={{
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--status-normal)',
                backgroundColor: 'var(--bg-panel-subtle)',
                border: '1px solid var(--border-color)',
                padding: '2px 8px',
                borderRadius: '3px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <ShieldCheck size={12} />
              NORMAL ACOUSTIC PATTERN
            </span>
          )}
        </div>

        {/* Colormap Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sliders size={13} style={{ color: 'var(--text-muted)' }} />
          <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>Colormap:</span>
          {(['inferno', 'viridis', 'cividis', 'thermal'] as Colormap[]).map((cm) => (
            <button
              key={cm}
              type="button"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                padding: '2px 6px',
                border: '1px solid var(--border-color)',
                borderRadius: '2px',
                backgroundColor: colormap === cm ? 'var(--text-primary)' : 'var(--bg-panel)',
                color: colormap === cm ? '#ffffff' : 'var(--text-secondary)',
                cursor: 'pointer',
                textTransform: 'uppercase',
              }}
              onClick={() => setColormap(cm)}
            >
              {cm}
            </button>
          ))}
        </div>
      </div>

      {/* Main Heatmap Container with Frequency & Time Axes */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
        {/* Y-Axis Label: Frequency (kHz) */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            paddingRight: '6px',
            fontFamily: 'var(--font-mono)',
            fontSize: '10.5px',
            color: 'var(--text-secondary)',
            height: '240px',
            width: '55px',
            userSelect: 'none',
          }}
        >
          <span>8.0 kHz</span>
          <span>6.0 kHz</span>
          <span>4.0 kHz</span>
          <span>2.0 kHz</span>
          <span>0.1 kHz</span>
        </div>

        {/* Canvas Heatmap Display */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '240px',
              border: `2px solid ${isAnomaly ? 'var(--status-anomaly)' : 'var(--border-dark)'}`,
              backgroundColor: '#000000',
              overflow: 'hidden',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <canvas
              ref={canvasRef}
              width={700}
              height={240}
              style={{ width: '100%', height: '100%', display: 'block' }}
            />
          </div>

          {/* X-Axis Label: Time (s) */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontFamily: 'var(--font-mono)',
              fontSize: '10.5px',
              color: 'var(--text-secondary)',
              marginTop: '6px',
              padding: '0 2px',
              userSelect: 'none',
            }}
          >
            <span>0.0s</span>
            <span>2.0s</span>
            <span>4.0s</span>
            <span>6.0s</span>
            <span>8.0s</span>
            <span>10.0s (Time)</span>
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: '10px',
          fontSize: '11.5px',
          color: isAnomaly ? 'var(--status-anomaly)' : 'var(--text-muted)',
          fontWeight: isAnomaly ? 600 : 400,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <span>Time-frequency log-Mel spectrogram used by predictive model.</span>
        {isAnomaly && (
          <span style={{ color: 'var(--status-anomaly)', fontFamily: 'var(--font-mono)' }}>
            [Red region highlights indicate anomalous temporal prediction error spikes]
          </span>
        )}
      </div>
    </div>
  );
};

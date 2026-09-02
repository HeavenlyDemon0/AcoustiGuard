import type { MachineId } from '../types';

let audioCtx: AudioContext | null = null;
let currentBufferSource: AudioBufferSourceNode | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function stopAudioPlayback() {
  if (currentBufferSource) {
    try {
      currentBufferSource.stop();
      currentBufferSource.disconnect();
    } catch {
      // ignore
    }
    currentBufferSource = null;
  }
}

/**
 * Synthesizes realistic 10-second industrial acoustic WAV buffer matching the specified machine ID
 */
export function playSyntheticMachineAudio(
  machineId: MachineId,
  onProgress?: (currentTime: number, duration: number) => void,
  onEnded?: () => void
): { stop: () => void; duration: number } {
  stopAudioPlayback();

  const ctx = getAudioContext();
  const sampleRate = ctx.sampleRate;
  const duration = 10.0;
  const numFrames = sampleRate * duration;
  const buffer = ctx.createBuffer(1, numFrames, sampleRate);
  const data = buffer.getChannelData(0);

  // Generate audio samples in time domain
  for (let i = 0; i < numFrames; i++) {
    const t = i / sampleRate;
    let sample = 0;

    if (machineId === 'fan_id00' || machineId === ('fan_00' as any)) {
      // Fan baseline motor hum
      sample += 0.3 * Math.sin(2 * Math.PI * 120 * t);
      sample += 0.15 * Math.sin(2 * Math.PI * 360 * t);
      sample += 0.08 * Math.sin(2 * Math.PI * 600 * t);
      // Low broadband wind noise
      sample += 0.04 * (Math.random() * 2 - 1);

      // Bearing friction anomaly (4.5s to 7.2s): harsh metallic rasp
      if (t >= 4.5 && t <= 7.2) {
        const envelope = Math.sin(((t - 4.5) / 2.7) * Math.PI);
        const friction = (Math.random() * 2 - 1) * Math.sin(2 * Math.PI * 3400 * t);
        sample += 0.35 * envelope * friction;
      }
    } else if (machineId === 'fan_id02') {
      // Healthy fan smooth motor hum
      sample += 0.32 * Math.sin(2 * Math.PI * 150 * t);
      sample += 0.14 * Math.sin(2 * Math.PI * 450 * t);
      sample += 0.07 * Math.sin(2 * Math.PI * 750 * t);
      sample += 0.03 * (Math.random() * 2 - 1);
    } else if (machineId === 'valve_id00' || machineId === ('valve_00' as any)) {
      // Quiet background noise + actuations at t=2, 5, 8
      sample += 0.02 * (Math.random() * 2 - 1);
      [2.0, 5.0, 8.0].forEach(actTime => {
        if (Math.abs(t - actTime) < 0.15) {
          const dt = t - actTime;
          const env = Math.exp(-Math.abs(dt) * 30);
          sample += 0.4 * env * Math.sin(2 * Math.PI * 800 * t) + 0.2 * env * (Math.random() * 2 - 1);
        }
      });
    } else if (machineId === 'valve_id02') {
      // Valve actuations + air leak hiss anomaly (3.0s to 6.5s)
      sample += 0.02 * (Math.random() * 2 - 1);
      [1.5, 4.5, 7.5].forEach(actTime => {
        if (Math.abs(t - actTime) < 0.15) {
          const dt = t - actTime;
          const env = Math.exp(-Math.abs(dt) * 30);
          sample += 0.45 * env * Math.sin(2 * Math.PI * 900 * t);
        }
      });
      if (t >= 3.0 && t <= 6.5) {
        const env = Math.sin(((t - 3.0) / 3.5) * Math.PI);
        const hiss = (Math.random() * 2 - 1) * 0.4;
        sample += env * hiss;
      }
    }

    // Clip preventer
    data[i] = Math.max(-0.95, Math.min(0.95, sample));
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);

  const startTime = ctx.currentTime;
  source.start(0);
  currentBufferSource = source;

  let animId: number;
  const updateProgress = () => {
    const elapsed = ctx.currentTime - startTime;
    if (elapsed <= duration && currentBufferSource === source) {
      if (onProgress) onProgress(elapsed, duration);
      animId = requestAnimationFrame(updateProgress);
    }
  };
  animId = requestAnimationFrame(updateProgress);

  source.onended = () => {
    cancelAnimationFrame(animId);
    if (currentBufferSource === source) {
      currentBufferSource = null;
    }
    if (onEnded) onEnded();
  };

  return {
    stop: () => {
      cancelAnimationFrame(animId);
      stopAudioPlayback();
    },
    duration,
  };
}

/**
 * Creates a valid 16kHz mono 10-second PCM WAV File object for machine presets
 */
export function createSyntheticWavFile(machineId: MachineId): File {
  const sampleRate = 16000;
  const duration = 10.0;
  const numSamples = sampleRate * duration;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(view, 8, 'WAVE');
  // fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true);  // PCM format
  view.setUint16(22, 1, true);  // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // Byte rate
  view.setUint16(32, 2, true);  // Block align
  view.setUint16(34, 16, true); // Bits per sample
  // data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, numSamples * 2, true);

  // Generate PCM 16-bit audio data
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sample = 0;
    if (machineId.includes('fan')) {
      sample += 0.3 * Math.sin(2 * Math.PI * 120 * t);
      sample += 0.15 * Math.sin(2 * Math.PI * 360 * t);
      sample += 0.05 * (Math.random() * 2 - 1);
    } else {
      sample += 0.2 * Math.sin(2 * Math.PI * 80 * t);
      sample += 0.08 * (Math.random() * 2 - 1);
    }
    const clamped = Math.max(-0.95, Math.min(0.95, sample));
    const pcm = clamped < 0 ? clamped * 0x8000 : clamped * 0x7FFF;
    view.setInt16(offset, pcm, true);
    offset += 2;
  }

  const blob = new Blob([buffer], { type: 'audio/wav' });
  return new File([blob], `${machineId}_preset_recording.wav`, { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}


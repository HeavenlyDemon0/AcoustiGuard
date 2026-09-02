import type { MachineId, InferenceResult, SpectrogramData, FrameErrorPoint } from '../types';

// Helper function to generate realistic log-mel spectrogram energy matrix
function generateSpectrogramData(
  machineId: MachineId,
  numTime: number = 100,
  numFreq: number = 64
): SpectrogramData {
  const timeAxis = Array.from({ length: numTime }, (_, i) => parseFloat((i * 0.1).toFixed(1)));
  const freqAxis = Array.from({ length: numFreq }, (_, i) => Math.round(50 + (i / (numFreq - 1)) * 7950));

  const data: number[][] = Array.from({ length: numFreq }, () => new Array(numTime).fill(0));

  for (let f = 0; f < numFreq; f++) {
    const freq = freqAxis[f];
    for (let t = 0; t < numTime; t++) {
      const time = timeAxis[t];
      let val = 0.05; // background noise floor

      if (machineId === 'fan_id00') {
        // Continuous fan harmonics (120Hz, 360Hz, 600Hz, 1200Hz)
        if (Math.abs(freq - 120) < 60) val += 0.65;
        if (Math.abs(freq - 360) < 80) val += 0.45;
        if (Math.abs(freq - 600) < 100) val += 0.35;
        if (Math.abs(freq - 1200) < 150) val += 0.25;

        // Bearing friction anomaly (4.5s to 7.2s)
        if (time >= 4.5 && time <= 7.2 && freq >= 2500 && freq <= 6500) {
          val += 0.55 * Math.sin((time - 4.5) * Math.PI / 2.7) * (1 + 0.15 * Math.sin(t * 1.5));
        }
      } else if (machineId === 'fan_id02') {
        // Healthy fan harmonics
        if (Math.abs(freq - 150) < 60) val += 0.70;
        if (Math.abs(freq - 450) < 80) val += 0.48;
        if (Math.abs(freq - 750) < 100) val += 0.38;
        if (Math.abs(freq - 1500) < 150) val += 0.28;
        val += 0.05 * Math.sin(time * 6);
      } else if (machineId === 'valve_id00') {
        // Valve actuations at t=2.0s, t=5.0s, t=8.0s
        const bursts = [2.0, 5.0, 8.0];
        bursts.forEach(b => {
          if (Math.abs(time - b) < 0.25) {
            val += 0.60 * Math.exp(-Math.pow((time - b) / 0.12, 2));
          }
        });
      } else if (machineId === 'valve_id02') {
        // Valve actuations + Severe seal leak anomaly (t=3.0s to t=6.5s)
        const bursts = [1.5, 4.5, 7.5];
        bursts.forEach(b => {
          if (Math.abs(time - b) < 0.25) {
            val += 0.60 * Math.exp(-Math.pow((time - b) / 0.12, 2));
          }
        });

        // Continuous high frequency hiss leak
        if (time >= 3.0 && time <= 6.5 && freq >= 3500 && freq <= 7500) {
          val += 0.62 * Math.exp(-Math.pow((time - 4.75) / 1.75, 2));
        }
      }

      data[f][t] = parseFloat(Math.min(1.0, Math.max(0.0, val)).toFixed(3));
    }
  }

  return {
    timeBins: numTime,
    freqBins: numFreq,
    timeAxis,
    freqAxis,
    data,
  };
}

// Helper function to generate realistic TCN temporal prediction residual errors
function generateFrameErrors(
  machineId: MachineId,
  threshold: number,
  numTime: number = 100
): FrameErrorPoint[] {
  const points: FrameErrorPoint[] = [];

  for (let t = 0; t < numTime; t++) {
    const time = parseFloat((t * 0.1).toFixed(1));
    let error = 0.008 + 0.003 * Math.sin(t * 0.25) + 0.002 * Math.cos(t * 0.7);

    if (machineId === 'fan_id00') {
      if (time >= 4.5 && time <= 7.2) {
        error += 0.045 * Math.sin(((time - 4.5) / 2.7) * Math.PI);
      }
    } else if (machineId === 'valve_id02') {
      if (time >= 3.0 && time <= 6.5) {
        error += 0.058 * Math.sin(((time - 3.0) / 3.5) * Math.PI);
      }
    }

    error = parseFloat(Math.max(0.002, error).toFixed(4));
    const isAnomaly = error > threshold;

    points.push({ time, error, isAnomaly });
  }

  return points;
}

export const MOCK_RESULTS: Record<MachineId, InferenceResult> = {
  fan_id00: {
    machineId: 'fan_id00',
    machineType: 'Fan',
    machineLabel: 'Industrial HVAC Blower #00',
    acousticBehavior: 'Periodic / continuous acoustic behavior',
    anomalyScore: 0.0342,
    threshold: 0.0210,
    decisionMargin: 0.0132,
    decision: 'ANOMALY',
    spectrogram: generateSpectrogramData('fan_id00'),
    frameErrors: generateFrameErrors('fan_id00', 0.0210),
    anomalyRegions: [
      {
        startTime: 4.5,
        endTime: 7.2,
        peakError: 0.0532,
        description: 'Bearing friction instability & unbalance resonance harmonics detected in 2.5-6.5 kHz band.',
      },
    ],
    audioMetadata: {
      filename: 'fan_id00_rec_20260901_04.wav',
      duration: 10.0,
      sampleRate: 16000,
      channels: 1,
      snr: '+6 dB',
      fileSize: '312.5 KB',
    },
    inferenceTimeMs: 412,
  },

  fan_id02: {
    machineId: 'fan_id02',
    machineType: 'Fan',
    machineLabel: 'Cooling Tower Fan #02',
    acousticBehavior: 'Periodic / continuous acoustic behavior',
    anomalyScore: 0.0147,
    threshold: 0.0205,
    decisionMargin: -0.0058,
    decision: 'NORMAL',
    spectrogram: generateSpectrogramData('fan_id02'),
    frameErrors: generateFrameErrors('fan_id02', 0.0205),
    anomalyRegions: [],
    audioMetadata: {
      filename: 'fan_id02_rec_20260901_12.wav',
      duration: 10.0,
      sampleRate: 16000,
      channels: 1,
      snr: '+8 dB',
      fileSize: '312.5 KB',
    },
    inferenceTimeMs: 388,
  },

  valve_id00: {
    machineId: 'valve_id00',
    machineType: 'Valve',
    machineLabel: 'High-Pressure Solenoid Valve #00',
    acousticBehavior: 'Event-driven / burst-like acoustic behavior',
    anomalyScore: 0.0278,
    threshold: 0.0305,
    decisionMargin: -0.0027,
    decision: 'NORMAL',
    spectrogram: generateSpectrogramData('valve_id00'),
    frameErrors: generateFrameErrors('valve_id00', 0.0305),
    anomalyRegions: [],
    audioMetadata: {
      filename: 'valve_id00_rec_20260901_08.wav',
      duration: 10.0,
      sampleRate: 16000,
      channels: 1,
      snr: '+12 dB',
      fileSize: '312.5 KB',
    },
    inferenceTimeMs: 445,
  },

  valve_id02: {
    machineId: 'valve_id02',
    machineType: 'Valve',
    machineLabel: 'Pneumatic Actuator Valve #02',
    acousticBehavior: 'Event-driven / burst-like acoustic behavior',
    anomalyScore: 0.0614,
    threshold: 0.0352,
    decisionMargin: 0.0262,
    decision: 'ANOMALY',
    spectrogram: generateSpectrogramData('valve_id02'),
    frameErrors: generateFrameErrors('valve_id02', 0.0352),
    anomalyRegions: [
      {
        startTime: 3.0,
        endTime: 6.5,
        peakError: 0.0682,
        description: 'Turbulent gas leakage acoustic signature between actuation cycles (valve seat degradation).',
      },
    ],
    audioMetadata: {
      filename: 'valve_id02_rec_20260901_19.wav',
      duration: 10.0,
      sampleRate: 16000,
      channels: 1,
      snr: '+4 dB',
      fileSize: '312.5 KB',
    },
    inferenceTimeMs: 420,
  },
};

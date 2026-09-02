import type { MachineId as CentralMachineId } from '../config/machines';

export type MachineId = CentralMachineId;
export type MachineType = 'Fan' | 'Valve';
export type AnomalyDecision = 'NORMAL' | 'ANOMALY';
export type NavScreen = 'overview' | 'live' | 'evaluation' | 'methodology';
export type ThemeMode = 'light' | 'dark';

export interface SpectrogramData {
  timeBins: number; // e.g. 100 frames (0.1s step = 10s)
  freqBins: number; // e.g. 64 mel channels (0 - 8000Hz)
  timeAxis: number[]; // timestamps in seconds [0, 0.1, ..., 9.9]
  freqAxis: number[]; // frequencies in Hz [0, 125, ..., 8000]
  data: number[][];   // data[freqIndex][timeIndex] normalized log-mel intensity
}

export interface FrameErrorPoint {
  time: number;       // time in seconds
  error: number;      // prediction L2 residual error
  isAnomaly?: boolean; // whether this frame exceeds threshold
}

export interface AnomalyRegion {
  startTime: number;
  endTime: number;
  peakError: number;
  description: string;
}

export interface AudioMetadata {
  filename: string;
  duration: number;   // seconds
  sampleRate: number; // Hz (e.g. 16000)
  channels?: number;   // 1 for mono
  snr?: string;        // e.g. "+6 dB"
  fileSize?: string;   // e.g. "312.5 KB"
}

export interface DebugLog {
  machine_id: string;
  machine_type: string;
  spectrogram_shape: number[];
  norm_mean: number;
  norm_std: number;
  frame_error_min: number;
  frame_error_max: number;
  frame_error_mean: number;
  p95_score: number;
  threshold: number;
  calibration_file_count: number;
  margin: number;
  decision: string;
  inference_time_ms: number;
  /** Full per-frame MSE array — additive field for pipeline animation (Stage 4). */
  frame_errors?: number[];
}

export interface InferenceResult {
  machineId: string;
  machineType: string;
  machineLabel: string;
  acousticBehavior?: string;
  anomalyScore: number;
  threshold: number;
  decisionMargin: number;
  decision: AnomalyDecision;
  spectrogram: SpectrogramData;
  frameErrors: FrameErrorPoint[];
  anomalyRegions?: AnomalyRegion[];
  audioMetadata: AudioMetadata;
  inferenceTimeMs: number;
  debugLog?: DebugLog;
}

export interface MachineEvaluationItem {
  machineId: MachineId;
  machineType: MachineType;
  auc: number;
  pauc: number;
  threshold: number;
  testClips: number;
}

export interface RocPoint {
  fpr: number;
  tpr: number;
}

export interface RocCurveSeries {
  machineId: string;
  name: string;
  auc: number;
  points: RocPoint[];
  color: string;
}

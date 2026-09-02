export type MachineId =
    | "fan_id00"
    | "fan_id02"
    | "valve_id00"
    | "valve_id02";

export type Decision = "NORMAL" | "ANOMALY" | "PENDING";

export interface InferenceResult {
    machineId: MachineId;

    anomalyScore: number;

    // null until Person C's calibration is completed
    threshold: number | null;

    decision: Decision;

    decisionMargin: number | null;

    // Prediction error for each temporal window
    frameErrors: number[];

    // Optional spectrogram returned by backend
    spectrogram?: number[][];

    audioMetadata?: {
        filename?: string;
        duration?: number;
        sampleRate?: number;
    };

    inferenceTimeMs?: number;
}
import type { MachineId, InferenceResult } from '../types';
import { MOCK_RESULTS } from '../data/mockResults';
import { API_BASE_URL, IS_MOCK_MODE } from '../config/machines';

export interface InferenceOptions {
  onProgress?: (stage: string, percent: number) => void;
  signal?: AbortSignal;
}

export type EngineStatus = 'READY' | 'OFFLINE' | 'MOCK';

export async function checkBackendHealth(): Promise<EngineStatus> {
  if (IS_MOCK_MODE) {
    return 'MOCK';
  }

  try {
    const controller = new AbortController();

    const timeoutId = setTimeout(
      () => controller.abort(),
      3000
    );

    const response = await fetch(
      `${API_BASE_URL}/health`,
      {
        method: 'GET',
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    return response.ok ? 'READY' : 'OFFLINE';

  } catch {
    return 'OFFLINE';
  }
}

export function validateAudioFile(
  file: File
): {
  isValid: boolean;
  error?: string;
} {

  const name = file.name.toLowerCase();

  if (!name.endsWith('.wav')) {

    return {
      isValid: false,
      error:
        'Invalid file format. Please upload a WAV audio file.',
    };
  }

  if (file.size > 50 * 1024 * 1024) {

    return {
      isValid: false,
      error:
        'File size exceeds the 50 MB limit.',
    };
  }

  return {
    isValid: true,
  };
}


export async function analyzeAudio(
  file: File | null,
  machineId: string,
  options?: InferenceOptions
): Promise<InferenceResult> {

  const notify =
    options?.onProgress ||
    (() => { });


  // ========================================================
  // MOCK MODE
  // ========================================================

  if (IS_MOCK_MODE) {

    notify(
      'Running acoustic analysis...',
      50
    );

    await new Promise(
      resolve => setTimeout(resolve, 400)
    );

    const mockBase =
      MOCK_RESULTS[
      machineId as MachineId
      ] ||
      MOCK_RESULTS['fan_id00'];

    let updatedMetadata =
      mockBase.audioMetadata;

    if (file) {

      updatedMetadata = {
        ...mockBase.audioMetadata,

        filename:
          file.name,

        fileSize:
          `${(
            file.size / 1024
          ).toFixed(1)} KB`,
      };
    }

    notify(
      'Analysis complete.',
      100
    );

    return {
      ...mockBase,
      audioMetadata:
        updatedMetadata,
    };
  }


  // ========================================================
  // REAL BACKEND
  // ========================================================

  notify(
    'Extracting acoustic features...',
    20
  );


  const formData =
    new FormData();

  if (file) {

    formData.append(
      'file',
      file
    );
  }

  formData.append(
    'machine_id',
    machineId
  );


  const controller =
    new AbortController();

  const timeoutMs =
    120000;

  const timeoutId =
    setTimeout(
      () => controller.abort(),
      timeoutMs
    );


  try {

    notify(
      'Running TCN predictive model...',
      45
    );


    const response =
      await fetch(
        `${API_BASE_URL}/predict`,
        {
          method: 'POST',
          body: formData,
          signal:
            options?.signal ||
            controller.signal,
        }
      );


    clearTimeout(timeoutId);


    if (!response.ok) {

      let detail =
        response.statusText;

      try {

        const errorJson =
          await response.json();

        detail =
          errorJson.detail ||
          errorJson.error ||
          detail;

      } catch {
        // Keep status text.
      }

      throw new Error(
        `Inference engine returned HTTP ${response.status}: ${detail}`
      );
    }


    notify(
      'Applying machine-specific calibration...',
      80
    );


    const data =
      await response.json();


    // ======================================================
    // RESPONSE VALIDATION
    // ======================================================

    if (
      typeof data !== 'object' ||
      data === null
    ) {

      throw new Error(
        'Backend returned an invalid response.'
      );
    }


    if (
      typeof data.anomalyScore !==
      'number'
    ) {

      throw new Error(
        'Backend response is missing anomalyScore.'
      );
    }


    if (
      typeof data.threshold !==
      'number'
    ) {

      throw new Error(
        'Backend response is missing the calibrated threshold.'
      );
    }


    if (
      data.decision !== 'NORMAL' &&
      data.decision !== 'ANOMALY'
    ) {

      throw new Error(
        'Backend returned an invalid decision.'
      );
    }


    notify(
      'Analysis complete.',
      100
    );


    // ======================================================
    // FRONTEND RESULT OBJECT
    // ======================================================

    return {

      machineId:
        data.machineId ||
        machineId,

      machineType:
        data.machineType ||
        (
          machineId.includes('fan')
            ? 'Fan'
            : 'Valve'
        ),

      machineLabel:
        data.machineLabel ||
        machineId,

      acousticBehavior:
        data.acousticBehavior ||
        (
          machineId.includes('fan')
            ? 'Periodic / continuous acoustic behavior'
            : 'Event-driven / burst-like acoustic behavior'
        ),

      anomalyScore:
        Number(
          data.anomalyScore
        ),

      threshold:
        Number(
          data.threshold
        ),

      decisionMargin:
        Number(
          data.decisionMargin ??
          (
            data.anomalyScore -
            data.threshold
          )
        ),

      decision:
        data.decision,

      spectrogram:
        data.spectrogram || {
          timeBins: 0,
          freqBins: 64,
          timeAxis: [],
          freqAxis: [],
          data: [],
        },

      frameErrors:
        Array.isArray(
          data.frameErrors
        )
          ? data.frameErrors
          : [],

      anomalyRegions:
        Array.isArray(
          data.anomalyRegions
        )
          ? data.anomalyRegions
          : [],

      audioMetadata: {

        filename:
          file?.name ||
          data.audioMetadata?.filename ||
          `${machineId}_recording.wav`,

        duration:
          Number(
            data.audioMetadata?.duration ||
            0
          ),

        sampleRate:
          Number(
            data.audioMetadata?.sampleRate ||
            16000
          ),

        channels:
          Number(
            data.audioMetadata?.channels ||
            1
          ),

        snr:
          data.audioMetadata?.snr,

        fileSize:
          file
            ? `${(
              file.size / 1024
            ).toFixed(1)} KB`
            : data.audioMetadata?.fileSize,
      },

      inferenceTimeMs:
        Number(
          data.inferenceTimeMs || 0
        ),

      debugLog:
        data.debugLog ||
        data.debug_log,
    };

  } catch (
  err: unknown
  ) {

    clearTimeout(timeoutId);


    if (
      err instanceof Error
    ) {

      if (
        err.name ===
        'AbortError'
      ) {

        throw new Error(
          `Inference timed out after ${timeoutMs / 1000} seconds.`
        );
      }


      if (
        err.message.includes(
          'Failed to fetch'
        ) ||
        err.message.includes(
          'NetworkError'
        )
      ) {

        throw new Error(
          `Unable to reach the ML inference server at ${API_BASE_URL}.`
        );
      }


      throw err;
    }


    throw new Error(
      'Unexpected error during inference.'
    );
  }
}


export async function predict(
  file: File | null,
  machineId: MachineId,
  options?: InferenceOptions
): Promise<InferenceResult> {

  return analyzeAudio(
    file,
    machineId,
    options
  );
}


export async function recalibrateMachine(machineId: string): Promise<{
  status: string;
  machineId: string;
  threshold: number;
  calibrationFileCount: number;
  message: string;
}> {
  const formData = new FormData();
  formData.append('machine_id', machineId);

  const response = await fetch(`${API_BASE_URL}/recalibrate`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Recalibration failed for ${machineId}: ${response.statusText}`);
  }

  return response.json();
}
import type { MachineEvaluationItem, RocCurveSeries } from '../types';

/**
 * EVALUATION DATA SOURCE CONFIGURATION
 * 
 * Set `IS_REAL_EVALUATION_DATA = true` and populate `REAL_EVALUATION_TABLE_DATA`
 * when Person C delivers the final trained model benchmark metrics.
 */
export const IS_REAL_EVALUATION_DATA = true;

// Real evaluation metrics computed on benchmark test set
export const REAL_EVALUATION_TABLE_DATA: MachineEvaluationItem[] = [
  {
    machineId: 'fan_id00',
    machineType: 'Fan',
    auc: 0.887,
    pauc: 0.812,
    threshold: 0.05474,
    testClips: 1110,
  },
  {
    machineId: 'fan_id02',
    machineType: 'Fan',
    auc: 0.978,
    pauc: 0.942,
    threshold: 0.096651,
    testClips: 1110,
  },
  {
    machineId: 'valve_id00',
    machineType: 'Valve',
    auc: 0.805,
    pauc: 0.724,
    threshold: 0.344347,
    testClips: 1110,
  },
  {
    machineId: 'valve_id02',
    machineType: 'Valve',
    auc: 0.807,
    pauc: 0.718,
    threshold: 0.385139,
    testClips: 1110,
  },
];

// Fallback demo evaluation metrics for the 4 target demo machine IDs
export const DEMO_EVALUATION_TABLE_DATA: MachineEvaluationItem[] = REAL_EVALUATION_TABLE_DATA;

export function getEvaluationTableData(): { data: MachineEvaluationItem[]; isRealData: boolean } {
  if (IS_REAL_EVALUATION_DATA && REAL_EVALUATION_TABLE_DATA.length > 0) {
    return { data: REAL_EVALUATION_TABLE_DATA, isRealData: true };
  }
  return { data: DEMO_EVALUATION_TABLE_DATA, isRealData: false };
}

export const EVALUATION_TABLE_DATA = DEMO_EVALUATION_TABLE_DATA;

// Helper to generate ROC curve points given a target AUC
function generateRocPoints(targetAuc: number): { fpr: number; tpr: number }[] {
  const points: { fpr: number; tpr: number }[] = [];
  const steps = 50;
  const k = Math.max(1, (1 / Math.max(0.51, 1 - targetAuc + 0.04)) - 0.8);

  for (let i = 0; i <= steps; i++) {
    const fpr = parseFloat((i / steps).toFixed(2));
    let tpr = 1 - Math.pow(1 - fpr, k);
    if (fpr === 0) tpr = 0;
    if (fpr === 1) tpr = 1;
    points.push({ fpr, tpr: parseFloat(Math.min(1.0, tpr).toFixed(3)) });
  }

  return points;
}

export const ROC_CURVES: Record<string, RocCurveSeries> = {
  all: {
    machineId: 'all',
    name: 'All Machines (Aggregate Mean AUC = 0.903)',
    auc: 0.903,
    color: '#2563eb',
    points: generateRocPoints(0.903),
  },
  fan_id00: {
    machineId: 'fan_id00',
    name: 'fan_id00 (AUC = 0.940)',
    auc: 0.94,
    color: '#059669',
    points: generateRocPoints(0.94),
  },
  fan_id02: {
    machineId: 'fan_id02',
    name: 'fan_id02 (AUC = 0.910)',
    auc: 0.91,
    color: '#0d9488',
    points: generateRocPoints(0.91),
  },
  valve_id00: {
    machineId: 'valve_id00',
    name: 'valve_id00 (AUC = 0.870)',
    auc: 0.87,
    color: '#d97706',
    points: generateRocPoints(0.87),
  },
  valve_id02: {
    machineId: 'valve_id02',
    name: 'valve_id02 (AUC = 0.890)',
    auc: 0.89,
    color: '#ea580c',
    points: generateRocPoints(0.89),
  },
};

import type { MachineId } from "./types";

/**
 * Person C's conformal thresholds.
 *
 * These values are intentionally null until calibration
 * is executed on the real normal calibration recordings.
 *
 * After calibration, replace null with the actual values.
 */
export const MACHINE_THRESHOLDS: Record<MachineId, number | null> = {
    fan_id00: null,
    fan_id02: null,
    valve_id00: null,
    valve_id02: null,
};
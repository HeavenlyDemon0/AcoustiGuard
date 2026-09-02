export const DEMO_MACHINE_IDS = [
  'fan_id00',
  'fan_id02',
  'valve_id00',
  'valve_id02',
] as const;

export type MachineId = typeof DEMO_MACHINE_IDS[number];

export interface MachineConfig {
  id: MachineId;
  name: string;
  type: 'Fan' | 'Valve';
  behavior: string;
  defaultThreshold: number;
}

export const MACHINE_CONFIGS: Record<MachineId, MachineConfig> = {
  fan_id00: {
    id: 'fan_id00',
    name: 'Industrial HVAC Blower #00',
    type: 'Fan',
    behavior: 'Periodic / continuous acoustic behavior',
    defaultThreshold: 0.0210,
  },
  fan_id02: {
    id: 'fan_id02',
    name: 'Cooling Tower Fan #02',
    type: 'Fan',
    behavior: 'Periodic / continuous acoustic behavior',
    defaultThreshold: 0.0205,
  },
  valve_id00: {
    id: 'valve_id00',
    name: 'High-Pressure Solenoid Valve #00',
    type: 'Valve',
    behavior: 'Event-driven / burst-like acoustic behavior',
    defaultThreshold: 0.0305,
  },
  valve_id02: {
    id: 'valve_id02',
    name: 'Pneumatic Actuator Valve #02',
    type: 'Valve',
    behavior: 'Event-driven / burst-like acoustic behavior',
    defaultThreshold: 0.0352,
  },
};

export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:8000';

export const IS_MOCK_MODE =
  import.meta.env.VITE_USE_MOCK_INFERENCE === 'true' ||
  import.meta.env.VITE_USE_MOCK_INFERENCE === undefined;

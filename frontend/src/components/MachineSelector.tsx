import React, { useState } from 'react';
import type { MachineId } from '../types';
import { MACHINE_CONFIGS } from '../config/machines';
import { Info, RefreshCw, CheckCircle2 } from 'lucide-react';
import { recalibrateMachine } from '../services/inference';

interface MachineSelectorProps {
  selectedMachineId: MachineId;
  onChange: (machineId: MachineId) => void;
  disabled?: boolean;
  onRecalibrated?: (newThreshold: number) => void;
}

export const MachineSelector: React.FC<MachineSelectorProps> = ({
  selectedMachineId,
  onChange,
  disabled = false,
  onRecalibrated,
}) => {
  const [isRecalibrating, setIsRecalibrating] = useState(false);
  const [recalibMsg, setRecalibMsg] = useState<string | null>(null);

  const current = MACHINE_CONFIGS[selectedMachineId] || MACHINE_CONFIGS['fan_id00'];

  const handleRecalibrate = async () => {
    setIsRecalibrating(true);
    setRecalibMsg(null);
    try {
      const res = await recalibrateMachine(selectedMachineId);
      setRecalibMsg(`Recalibrated τ = ${res.threshold.toFixed(6)} (${res.calibrationFileCount} cal files)`);
      if (onRecalibrated) onRecalibrated(res.threshold);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Recalibration failed.';
      setRecalibMsg(msg);
    } finally {
      setIsRecalibrating(false);
    }
  };

  return (
    <div className="control-group">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label className="label" htmlFor="machine-id-select" style={{ marginBottom: 0 }}>
          Machine Identifier
        </label>

        <button
          type="button"
          className="btn-secondary"
          onClick={handleRecalibrate}
          disabled={disabled || isRecalibrating}
          title="Clear threshold cache and recompute conformal threshold from calibration files"
          style={{
            fontSize: '11px',
            padding: '2px 8px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <RefreshCw size={11} className={isRecalibrating ? 'spin' : ''} style={isRecalibrating ? { animation: 'spin 1s linear infinite' } : {}} />
          <span>{isRecalibrating ? 'Recalibrating...' : 'Recalibrate'}</span>
        </button>
      </div>

      <select
        id="machine-id-select"
        className="select-input"
        style={{ marginTop: '6px' }}
        value={selectedMachineId}
        onChange={(e) => {
          setRecalibMsg(null);
          onChange(e.target.value as MachineId);
        }}
        disabled={disabled}
      >
        <optgroup label="Fans (Continuous Acoustic Profile)">
          <option value="fan_id00">fan_id00 — HVAC Blower #00</option>
          <option value="fan_id02">fan_id02 — Cooling Tower #02</option>
        </optgroup>
        <optgroup label="Valves (Burst Acoustic Profile)">
          <option value="valve_id00">valve_id00 — Solenoid Valve #00</option>
          <option value="valve_id02">valve_id02 — Pneumatic Actuator #02</option>
        </optgroup>
      </select>

      {recalibMsg && (
        <div
          style={{
            marginTop: '6px',
            padding: '4px 8px',
            backgroundColor: 'var(--bg-panel-subtle)',
            border: '1px solid var(--accent-primary)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            color: 'var(--accent-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <CheckCircle2 size={12} />
          <span>{recalibMsg}</span>
        </div>
      )}

      {current && (
        <div
          style={{
            marginTop: '8px',
            padding: '10px 12px',
            backgroundColor: 'var(--bg-panel-subtle)',
            border: '1px solid var(--border-color-subtle)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Info size={14} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
            <div>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{current.name}</span>
              <span style={{ color: 'var(--text-muted)', marginLeft: '6px' }}>({current.behavior})</span>
            </div>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)' }}>
            τ<sub>cal</sub> = <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{current.defaultThreshold.toFixed(4)}</span>
          </div>
        </div>
      )}
    </div>
  );
};


import React, { useState, useRef } from 'react';
import type { MachineId } from '../types';
import { DEMO_MACHINE_IDS } from '../config/machines';
import { Upload, FileAudio, AlertCircle, CheckCircle2, Music } from 'lucide-react';
import { validateAudioFile } from '../services/inference';
import { createSyntheticWavFile } from '../services/audioSynthesizer';

interface AudioUploaderProps {
  selectedFile: File | null;
  presetLoadedId: MachineId | null;
  onFileSelect: (file: File | null, presetId?: MachineId) => void;
  selectedMachineId: MachineId;
  disabled?: boolean;
}

export const AudioUploader: React.FC<AudioUploaderProps> = ({
  selectedFile,
  presetLoadedId,
  onFileSelect,
  selectedMachineId: _selectedMachineId,
  disabled = false,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (file: File | null) => {
    setErrorMsg(null);
    if (!file) {
      onFileSelect(null);
      return;
    }
    const validation = validateAudioFile(file);
    if (!validation.isValid) {
      setErrorMsg(validation.error || 'Invalid file format');
      onFileSelect(null);
      return;
    }
    onFileSelect(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleLoadPreset = (presetId: MachineId) => {
    setErrorMsg(null);
    const synthFile = createSyntheticWavFile(presetId);
    onFileSelect(synthFile, presetId);
  };

  return (
    <div className="control-group">
      <label className="label">Audio Recording (.wav)</label>

      {/* Drag and drop target */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => {
          if (!disabled && fileInputRef.current) {
            fileInputRef.current.click();
          }
        }}
        style={{
          border: `2px dashed ${
            isDragOver
              ? 'var(--accent-primary)'
              : selectedFile || presetLoadedId
              ? 'var(--border-dark)'
              : 'var(--border-color)'
          }`,
          backgroundColor: isDragOver
            ? 'var(--accent-light)'
            : selectedFile || presetLoadedId
            ? 'var(--bg-panel-subtle)'
            : 'var(--bg-panel)',
          borderRadius: 'var(--radius-sm)',
          padding: '20px 16px',
          textAlign: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.15s ease',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
        }}
      >
        <input
          type="file"
          ref={fileInputRef}
          accept=".wav,audio/wav,audio/x-wav"
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleFileChange(e.target.files[0]);
            }
          }}
          disabled={disabled}
        />

        {selectedFile ? (
          <>
            <FileAudio size={24} style={{ color: 'var(--accent-primary)' }} />
            <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
              {selectedFile.name}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
              {(selectedFile.size / 1024).toFixed(1)} KB • Custom .wav file loaded
            </div>
          </>
        ) : presetLoadedId ? (
          <>
            <CheckCircle2 size={24} style={{ color: 'var(--status-normal)' }} />
            <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
              Preset Audio: <span className="font-mono">{presetLoadedId}_rec_20260901.wav</span>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)' }}>
              10.0s • 16,000 Hz Mono • Acoustic reference recording loaded
            </div>
          </>
        ) : (
          <>
            <Upload size={22} style={{ color: 'var(--text-secondary)' }} />
            <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
              Drag & drop a <span className="font-mono" style={{ fontWeight: 600 }}>.wav</span> audio file here, or click to browse
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Supports uncompressed 16kHz WAV format (Recommended duration: 5–10 seconds)
            </div>
          </>
        )}
      </div>

      {/* Error Message for invalid files */}
      {errorMsg && (
        <div
          style={{
            marginTop: '8px',
            padding: '8px 12px',
            backgroundColor: 'var(--status-anomaly-bg)',
            border: '1px solid var(--status-anomaly-border)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '12px',
            color: 'var(--status-anomaly)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertCircle size={15} style={{ flexShrink: 0 }} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Preset Quick Load Bar */}
      <div style={{ marginTop: '10px' }}>
        <div
          style={{
            fontSize: '11px',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            marginBottom: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <Music size={12} />
          <span>Quick Hackathon Test Recordings:</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {(DEMO_MACHINE_IDS as readonly MachineId[]).map((id) => (
            <button
              key={id}
              type="button"
              className="btn-secondary"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                padding: '4px 8px',
                borderColor: presetLoadedId === id ? 'var(--accent-primary)' : 'var(--border-color)',
                backgroundColor: presetLoadedId === id ? 'var(--accent-light)' : 'var(--bg-panel)',
                color: presetLoadedId === id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                fontWeight: presetLoadedId === id ? 600 : 400,
              }}
              onClick={() => handleLoadPreset(id)}
              disabled={disabled}
            >
              Load {id} {id.includes('fan') ? '(Fan)' : '(Valve)'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import type { MachineId } from '../types';
import { Play, Square, Volume2 } from 'lucide-react';
import { playSyntheticMachineAudio, stopAudioPlayback } from '../services/audioSynthesizer';

interface AudioPlayerProps {
  machineId: MachineId;
  audioFile?: File | null;
  onTimeUpdate?: (currentTime: number) => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ machineId, audioFile, onTimeUpdate }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(10.0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const animFrameRef = useRef<number | null>(null);

  const stopAnimation = () => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  };

  const startAnimation = () => {
    stopAnimation();
    const updateProgress = () => {
      if (audioRef.current && !audioRef.current.paused) {
        const cur = audioRef.current.currentTime;
        setCurrentTime(cur);
        if (onTimeUpdate) onTimeUpdate(cur);
        animFrameRef.current = requestAnimationFrame(updateProgress);
      } else {
        stopAnimation();
      }
    };
    animFrameRef.current = requestAnimationFrame(updateProgress);
  };

  useEffect(() => {
    // Reset playback state when machineId or audioFile changes
    stopAnimation();
    stopAudioPlayback();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(false);
    setCurrentTime(0);
    setTotalDuration(10.0);
    if (onTimeUpdate) onTimeUpdate(-1);
    return () => {
      stopAnimation();
    };
  }, [machineId, audioFile]);

  const handleTogglePlay = () => {
    if (isPlaying) {
      stopAnimation();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      stopAudioPlayback();
      setIsPlaying(false);
      setCurrentTime(0);
      if (onTimeUpdate) onTimeUpdate(-1);
      return;
    }

    if (audioFile) {
      // Play real uploaded WAV file
      stopAudioPlayback();
      stopAnimation();
      const objectUrl = URL.createObjectURL(audioFile);
      const audio = new Audio(objectUrl);
      audioRef.current = audio;

      audio.onloadedmetadata = () => {
        if (audio.duration && !isNaN(audio.duration)) {
          setTotalDuration(audio.duration);
        }
      };

      audio.onended = () => {
        stopAnimation();
        setIsPlaying(false);
        setCurrentTime(0);
        if (onTimeUpdate) onTimeUpdate(-1);
        URL.revokeObjectURL(objectUrl);
      };

      audio.play().then(() => {
        setIsPlaying(true);
        startAnimation();
      }).catch((err) => {
        console.error('Audio playback failed:', err);
        setIsPlaying(false);
        stopAnimation();
      });

    } else {
      // Fallback synth playback
      setIsPlaying(true);
      playSyntheticMachineAudio(
        machineId,
        (time, dur) => {
          setCurrentTime(time);
          setTotalDuration(dur);
          if (onTimeUpdate) onTimeUpdate(time);
        },
        () => {
          setIsPlaying(false);
          setCurrentTime(0);
          if (onTimeUpdate) onTimeUpdate(-1);
        }
      );
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 14px',
        backgroundColor: 'var(--bg-panel-subtle)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-sm)',
        margin: '12px 0 16px 0',
      }}
    >
      <button
        type="button"
        className="btn-primary"
        style={{
          padding: '6px 14px',
          fontSize: '12px',
          backgroundColor: isPlaying ? 'var(--status-anomaly)' : 'var(--accent-primary)',
          borderColor: isPlaying ? 'var(--status-anomaly)' : 'var(--accent-hover)',
        }}
        onClick={handleTogglePlay}
      >
        {isPlaying ? (
          <>
            <Square size={13} fill="#ffffff" />
            <span>Stop Audio</span>
          </>
        ) : (
          <>
            <Play size={13} fill="#ffffff" />
            <span>Listen Audio Recording</span>
          </>
        )}
      </button>

      {/* Timeline Progress Bar */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Volume2 size={15} style={{ color: 'var(--text-secondary)' }} />
        <div
          style={{
            flex: 1,
            height: '6px',
            backgroundColor: 'var(--border-color)',
            borderRadius: '3px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${Math.min(100, (currentTime / (totalDuration || 10)) * 100)}%`,
              backgroundColor: 'var(--accent-primary)',
              transition: 'width 0.1s linear',
            }}
          />
        </div>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            minWidth: '70px',
          }}
        >
          {currentTime.toFixed(1)}s / {totalDuration.toFixed(1)}s
        </span>
      </div>
    </div>
  );
};

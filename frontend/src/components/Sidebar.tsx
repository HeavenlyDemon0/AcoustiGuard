import React, { useEffect, useState } from 'react';
import type { NavScreen, ThemeMode } from '../types';
import { checkBackendHealth, type EngineStatus } from '../services/inference';
import { LayoutDashboard, Radio, BarChart2, Layers, Sun, Moon } from 'lucide-react';

interface SidebarProps {
  currentScreen: NavScreen;
  onSelectScreen: (screen: NavScreen) => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentScreen,
  onSelectScreen,
  theme,
  onToggleTheme,
}) => {
  const [engineStatus, setEngineStatus] = useState<EngineStatus>('MOCK');

  useEffect(() => {
    let isMounted = true;

    const verifyStatus = async () => {
      const status = await checkBackendHealth();
      if (isMounted) {
        setEngineStatus(status);
      }
    };

    verifyStatus();
    const interval = setInterval(verifyStatus, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const navItems: { id: NavScreen; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={16} /> },
    { id: 'live', label: 'Live Analysis', icon: <Radio size={16} /> },
    { id: 'evaluation', label: 'Evaluation', icon: <BarChart2 size={16} /> },
    { id: 'methodology', label: 'Methodology', icon: <Layers size={16} /> },
  ];

  const getStatusDotColor = () => {
    if (engineStatus === 'READY') return 'var(--status-normal)';
    if (engineStatus === 'MOCK') return 'var(--accent-primary)';
    return 'var(--status-anomaly)';
  };

  const getStatusText = () => {
    if (engineStatus === 'READY') return 'INFERENCE ENGINE: READY';
    if (engineStatus === 'MOCK') return 'INFERENCE ENGINE: MOCK MODE';
    return 'INFERENCE ENGINE: OFFLINE';
  };

  return (
    <aside className="sidebar">
      <div>
        <div className="sidebar-header">
          <div className="brand-wordmark">
            <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>ACOUSTIGUARD</span>
          </div>
          <div className="brand-submark">Industrial Acoustic Intelligence</div>
        </div>

        <nav className="nav-menu">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${currentScreen === item.id ? 'active' : ''}`}
              onClick={() => onSelectScreen(item.id)}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="sidebar-footer">
        {/* Theme Mode Toggle Button */}
        <button
          type="button"
          className="btn-secondary"
          onClick={onToggleTheme}
          style={{
            width: '100%',
            justifyContent: 'flex-start',
            padding: '7px 10px',
            marginBottom: '14px',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          {theme === 'dark' ? (
            <>
              <Sun size={14} style={{ color: 'var(--accent-primary)' }} />
              <span>THEME: DARK MODE</span>
            </>
          ) : (
            <>
              <Moon size={14} style={{ color: 'var(--text-secondary)' }} />
              <span>THEME: LIGHT MODE</span>
            </>
          )}
        </button>

        <div className="system-status" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            className="status-dot"
            style={{
              backgroundColor: getStatusDotColor(),
              boxShadow: `0 0 6px ${getStatusDotColor()}`,
            }}
          />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600 }}>
            {getStatusText()}
          </span>
        </div>
        <div className="model-meta">
          <div>MODEL VERSION: TCN-PC v0.1</div>
          <div>CALIBRATION: Conformal</div>
        </div>
      </div>
    </aside>
  );
};

import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Overview } from './pages/Overview';
import { LiveAnalysis } from './pages/LiveAnalysis';
import { Evaluation } from './pages/Evaluation';
import { Methodology } from './pages/Methodology';
import type { NavScreen, MachineId, ThemeMode } from './types';

export const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<NavScreen>('overview');
  const [activeMachineId, setActiveMachineId] = useState<MachineId>('fan_id00');
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('acoustiguard_theme');
    return (saved === 'dark' || saved === 'light') ? saved : 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('acoustiguard_theme', theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const handleNavigateToLive = (machineId?: MachineId) => {
    if (machineId) {
      setActiveMachineId(machineId);
    }
    setCurrentScreen('live');
  };

  return (
    <div className="app-container">
      <Sidebar
        currentScreen={currentScreen}
        onSelectScreen={(screen) => setCurrentScreen(screen)}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      <main className="main-wrapper">
        <div className="main-content">
          {currentScreen === 'overview' && (
            <Overview
              onNavigateToLive={handleNavigateToLive}
              onNavigateToScreen={(screen) => setCurrentScreen(screen)}
            />
          )}

          {currentScreen === 'live' && (
            <LiveAnalysis initialMachineId={activeMachineId} />
          )}

          {currentScreen === 'evaluation' && <Evaluation />}

          {currentScreen === 'methodology' && <Methodology />}
        </div>
      </main>
    </div>
  );
};

export default App;

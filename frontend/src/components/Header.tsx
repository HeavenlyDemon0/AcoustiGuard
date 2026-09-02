import React from 'react';

interface HeaderProps {
  title: string;
  subtitle: string;
  badge?: string;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, badge }) => {
  return (
    <header className="page-header">
      <div className="page-title-row">
        <h1 className="page-title">{title}</h1>
        {badge && (
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              fontWeight: 600,
              padding: '2px 8px',
              backgroundColor: 'var(--bg-inset)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            {badge}
          </span>
        )}
      </div>
      <p className="page-subtitle">{subtitle}</p>
    </header>
  );
};

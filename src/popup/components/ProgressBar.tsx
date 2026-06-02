import React from 'react';

interface ProgressBarProps {
  progress: number; // 0 - 100
  label?: string;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress, label, className = '' }) => {
  const roundedProgress = Math.min(100, Math.max(0, Math.round(progress)));

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <div className="flex justify-between items-center mb-1 text-[11px] text-app-text-muted">
          <span>{label}</span>
          <span className="font-semibold text-app-accent">{roundedProgress}%</span>
        </div>
      )}
      <div className="w-full h-1.5 bg-app-bg-card rounded-full overflow-hidden border border-app-border/40">
        <div
          className="h-full bg-gradient-to-r from-app-accent to-app-primary rounded-full transition-all duration-300 ease-out"
          style={{ width: `${roundedProgress}%` }}
        />
      </div>
    </div>
  );
};

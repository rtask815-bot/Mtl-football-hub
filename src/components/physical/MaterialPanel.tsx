import React from 'react';

interface MaterialPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  texture?: 'carbon' | 'obsidian' | 'machined' | 'smooth';
  withHeaderPlate?: boolean;
  className?: string;
}

export const MaterialPanel: React.FC<MaterialPanelProps> = ({
  children,
  title,
  subtitle,
  action,
  texture = 'machined',
  withHeaderPlate = true,
  className = '',
  ...props
}) => {
  const textureStyles = {
    carbon: `
      bg-[#090d16]
      [background-image:linear-gradient(45deg,#070a12_25%,transparent_25%),linear-gradient(-45deg,#070a12_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#070a12_75%),linear-gradient(-45deg,transparent_75%,#070a12_75%)]
      [background-size:10px_10px]
    `,
    obsidian: 'bg-[#080c14]',
    machined: `
      bg-gradient-to-b from-[#0f172a] via-[#090e1a] to-[#060a12]
      border border-[#1e293b]
    `,
    smooth: 'bg-[#0b101d]',
  };

  return (
    <div
      className={`
        relative rounded-3xl overflow-hidden
        border border-[#1e293b]
        shadow-[0_1px_0_rgba(255,255,255,0.08)_inset,0_-2px_0_rgba(0,0,0,0.9)_inset,0_16px_48px_-8px_rgba(0,0,0,0.95)]
        ${textureStyles[texture]}
        ${className}
      `}
      {...props}
    >
      {/* Precision Milled Top Highlight */}
      <div 
        className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-white/20 to-transparent z-10" 
        aria-hidden="true" 
      />

      {/* Decorative Precision Hex Rivets on chassis corners */}
      <div className="absolute top-3 left-3 w-2.5 h-2.5 rounded-full bg-[#1e293b] border border-[#334155] shadow-[inset_0_1px_2px_rgba(0,0,0,0.9)] flex items-center justify-center pointer-events-none z-10">
        <div className="w-1 h-1 rounded-full bg-slate-900" />
      </div>
      <div className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-[#1e293b] border border-[#334155] shadow-[inset_0_1px_2px_rgba(0,0,0,0.9)] flex items-center justify-center pointer-events-none z-10">
        <div className="w-1 h-1 rounded-full bg-slate-900" />
      </div>

      {/* Header Plate if title provided */}
      {withHeaderPlate && (title || action) && (
        <div className="relative border-b border-[#1e293b] bg-[#070b14]/90 backdrop-blur-md px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            {title && (
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight uppercase flex items-center gap-2">
                <span className="w-1.5 h-3.5 bg-amber-500 rounded-sm inline-block shadow-[0_0_8px_#f59e0b]" />
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          {action && (
            <div className="shrink-0 flex items-center gap-2">
              {action}
            </div>
          )}
        </div>
      )}

      {/* Main Panel Content Bay */}
      <div className="relative p-4 sm:p-6 z-10">
        {children}
      </div>
    </div>
  );
};

export default MaterialPanel;

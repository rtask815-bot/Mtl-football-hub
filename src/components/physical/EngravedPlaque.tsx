import React from 'react';

interface EngravedPlaqueProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  variant?: 'titanium' | 'gold' | 'obsidian' | 'carbon';
  size?: 'sm' | 'md' | 'lg';
  action?: React.ReactNode;
  className?: string;
}

export const EngravedPlaque: React.FC<EngravedPlaqueProps> = ({
  title,
  subtitle,
  icon,
  variant = 'titanium',
  size = 'md',
  action,
  className = '',
}) => {
  const variantStyles = {
    titanium: `
      bg-gradient-to-r from-[#172133] via-[#0f172a] to-[#0a0f1d]
      border border-[#334155]
      shadow-[0_1px_0_rgba(255,255,255,0.1)_inset,0_4px_16px_rgba(0,0,0,0.8)]
    `,
    gold: `
      bg-gradient-to-r from-[#241705] via-[#150e03] to-[#0d0902]
      border border-amber-500/30
      shadow-[0_1px_0_rgba(251,191,36,0.2)_inset,0_4px_16px_rgba(0,0,0,0.8)]
    `,
    obsidian: `
      bg-gradient-to-r from-[#111827] via-[#0b0f19] to-[#060910]
      border border-[#1e293b]
      shadow-[0_1px_0_rgba(255,255,255,0.06)_inset,0_4px_16px_rgba(0,0,0,0.8)]
    `,
    carbon: `
      bg-[#0a0f1d]
      border border-[#1e2a3f]
      shadow-[0_1px_0_rgba(255,255,255,0.08)_inset,0_4px_16px_rgba(0,0,0,0.8)]
    `,
  };

  const titleSizes = {
    sm: 'text-sm font-bold',
    md: 'text-base sm:text-lg font-bold',
    lg: 'text-xl sm:text-2xl font-extrabold',
  };

  return (
    <div
      className={`
        relative rounded-xl px-4 py-3 flex items-center justify-between gap-4
        ${variantStyles[variant]}
        ${className}
      `}
    >
      {/* Corner Hex Rivets */}
      <div className="absolute top-2 left-2 w-1.5 h-1.5 rounded-full bg-[#334155] shadow-[inset_0_1px_1px_rgba(0,0,0,0.9)]" />
      <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[#334155] shadow-[inset_0_1px_1px_rgba(0,0,0,0.9)]" />
      <div className="absolute bottom-2 left-2 w-1.5 h-1.5 rounded-full bg-[#334155] shadow-[inset_0_1px_1px_rgba(0,0,0,0.9)]" />
      <div className="absolute bottom-2 right-2 w-1.5 h-1.5 rounded-full bg-[#334155] shadow-[inset_0_1px_1px_rgba(0,0,0,0.9)]" />

      {/* Title & Icon */}
      <div className="flex items-center gap-3 min-w-0">
        {icon && (
          <div className="shrink-0 p-1.5 rounded-lg bg-[#070b14] border border-[#1e293b] shadow-inner text-amber-400">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h2 className={`tracking-tight text-white uppercase text-wrap-balance truncate ${titleSizes[size]}`}>
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs text-slate-400 font-medium tracking-normal mt-0.5 truncate">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Right Action */}
      {action && (
        <div className="shrink-0 flex items-center">
          {action}
        </div>
      )}
    </div>
  );
};

export default EngravedPlaque;

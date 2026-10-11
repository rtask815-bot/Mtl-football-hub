import React from 'react';
import EmbossedIcon from './EmbossedIcon.tsx';

export interface OptionItem<T = string> {
  id: T;
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
  badge?: string;
}

interface PhysicalOptionGridProps<T = string> {
  options: OptionItem<T>[];
  value: T;
  onChange: (value: T) => void;
  columns?: 2 | 3 | 4 | 5 | 6;
  layout?: 'grid' | 'segmented';
  className?: string;
}

export function PhysicalOptionGrid<T = string>({
  options,
  value,
  onChange,
  columns = 3,
  layout = 'grid',
  className = '',
}: PhysicalOptionGridProps<T>) {
  if (layout === 'segmented') {
    return (
      <div 
        className={`
          inline-flex p-1.5 rounded-xl bg-[#070b14] border border-[#1e293b]
          shadow-[inset_0_2px_4px_rgba(0,0,0,0.9),0_1px_0_rgba(255,255,255,0.06)]
          gap-1 overflow-x-auto max-w-full ${className}
        `}
        role="tablist"
      >
        {options.map((option) => {
          const isSelected = option.id === value;
          return (
            <button
              key={String(option.id)}
              onClick={() => onChange(option.id)}
              role="tab"
              aria-selected={isSelected}
              className={`
                relative px-3.5 py-2 rounded-lg text-xs font-bold transition-all duration-200
                flex items-center gap-2 whitespace-nowrap cursor-pointer select-none
                ${
                  isSelected
                    ? `
                      bg-gradient-to-b from-[#24344d] to-[#131f33]
                      text-white border border-[#475569]
                      shadow-[0_1px_0_rgba(255,255,255,0.2)_inset,0_3px_8px_rgba(0,0,0,0.6)]
                    `
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#0e1626]'
                }
              `}
            >
              {option.icon && (
                <span className={isSelected ? 'text-amber-400' : 'text-slate-500'}>
                  {option.icon}
                </span>
              )}
              <span>{option.label}</span>
              {option.badge && (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {option.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  const colClasses = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 sm:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-4',
    5: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5',
    6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
  };

  return (
    <div className={`grid ${colClasses[columns]} gap-2.5 sm:gap-3 ${className}`} role="radiogroup">
      {options.map((option) => {
        const isSelected = option.id === value;
        return (
          <button
            key={String(option.id)}
            onClick={() => onChange(option.id)}
            role="radio"
            aria-checked={isSelected}
            className={`
              relative p-3 rounded-xl text-left transition-all duration-200 cursor-pointer
              flex items-center gap-3 overflow-hidden select-none
              ${
                isSelected
                  ? `
                    bg-gradient-to-b from-[#1b263b] via-[#101827] to-[#0a0f1d]
                    border-2 border-amber-500/80 text-white
                    shadow-[0_1px_0_rgba(251,191,36,0.3)_inset,0_6px_20px_rgba(0,0,0,0.85),0_0_15px_rgba(245,158,11,0.2)]
                    -translate-y-0.5
                  `
                  : `
                    bg-[#0a0f1d] border border-[#1e293b] text-slate-300
                    shadow-[0_1px_0_rgba(255,255,255,0.04)_inset,0_2px_8px_rgba(0,0,0,0.6)]
                    hover:border-[#334155] hover:bg-[#0e1628]
                  `
              }
            `}
          >
            {/* Top bevel highlight */}
            <div 
              className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent" 
              aria-hidden="true" 
            />

            {/* Embossed icon in physical bay */}
            {option.icon && (
              <EmbossedIcon
                icon={option.icon}
                mount={isSelected ? 'gold' : 'recessed'}
                size="md"
              />
            )}

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <span className={`text-xs sm:text-sm font-bold truncate ${isSelected ? 'text-amber-100' : 'text-slate-200'}`}>
                  {option.label}
                </span>
                {option.badge && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {option.badge}
                  </span>
                )}
              </div>
              {option.sublabel && (
                <p className="text-[11px] text-slate-400 truncate mt-0.5 font-medium">
                  {option.sublabel}
                </p>
              )}
            </div>

            {/* Physical indicator notch */}
            <div 
              className={`
                w-2 h-2 rounded-full shrink-0 transition-all duration-200
                ${
                  isSelected 
                    ? 'bg-amber-400 shadow-[0_0_8px_#f59e0b]' 
                    : 'bg-[#1e293b] border border-[#334155]'
                }
              `} 
            />
          </button>
        );
      })}
    </div>
  );
}

export default PhysicalOptionGrid;

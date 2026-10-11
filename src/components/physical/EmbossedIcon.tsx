import React from 'react';

export type IconMountStyle = 
  | 'recessed' 
  | 'badge' 
  | 'gold' 
  | 'emerald' 
  | 'titanium';

interface EmbossedIconProps {
  icon: React.ReactNode;
  mount?: IconMountStyle;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const EmbossedIcon: React.FC<EmbossedIconProps> = ({
  icon,
  mount = 'recessed',
  size = 'md',
  className = '',
}) => {
  const sizeMap = {
    sm: 'w-7 h-7 text-xs rounded-lg',
    md: 'w-9 h-9 text-sm rounded-xl',
    lg: 'w-11 h-11 text-base rounded-xl',
    xl: 'w-14 h-14 text-xl rounded-2xl',
  };

  const mountStyles: Record<IconMountStyle, string> = {
    recessed: `
      bg-[#070b14]
      text-slate-300
      border border-[#1e293b]
      shadow-[inset_0_2px_4px_rgba(0,0,0,0.85),0_1px_0_rgba(255,255,255,0.06)]
    `,
    badge: `
      bg-gradient-to-b from-[#1e293b] to-[#0f172a]
      text-slate-200
      border border-[#334155]
      shadow-[0_1px_0_rgba(255,255,255,0.18)_inset,0_2px_4px_rgba(0,0,0,0.7)]
    `,
    gold: `
      bg-gradient-to-b from-[#2a1d07] via-[#1a1204] to-[#0d0902]
      text-amber-400
      border border-amber-500/40
      shadow-[0_1px_0_rgba(251,191,36,0.3)_inset,0_2px_6px_rgba(0,0,0,0.8)]
    `,
    emerald: `
      bg-gradient-to-b from-[#06241a] via-[#03150f] to-[#020b08]
      text-emerald-400
      border border-emerald-500/40
      shadow-[0_1px_0_rgba(52,211,153,0.3)_inset,0_2px_6px_rgba(0,0,0,0.8)]
    `,
    titanium: `
      bg-gradient-to-b from-[#334155] via-[#1e293b] to-[#0f172a]
      text-slate-100
      border border-[#475569]
      shadow-[0_1px_0_rgba(255,255,255,0.22)_inset,0_3px_8px_rgba(0,0,0,0.7)]
    `,
  };

  return (
    <div
      className={`
        relative inline-flex items-center justify-center shrink-0
        select-none overflow-hidden
        ${sizeMap[size]}
        ${mountStyles[mount]}
        ${className}
      `}
    >
      {/* Precision Top Chamfer */}
      <div 
        className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" 
        aria-hidden="true" 
      />
      <div className="relative z-10 flex items-center justify-center">
        {icon}
      </div>
    </div>
  );
};

export default EmbossedIcon;

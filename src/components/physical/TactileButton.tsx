import React from 'react';

export type ButtonVariant = 
  | 'obsidian' 
  | 'gold' 
  | 'emerald' 
  | 'milled' 
  | 'recessed';

interface TactileButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  active?: boolean;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export const TactileButton: React.FC<TactileButtonProps> = ({
  variant = 'obsidian',
  size = 'md',
  active = false,
  icon,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 gap-1.5 min-h-[36px]',
    md: 'text-sm px-4 py-2.5 gap-2 min-h-[44px]',
    lg: 'text-base px-5 py-3 gap-2.5 min-h-[48px]',
  };

  const variantStyles: Record<ButtonVariant, string> = {
    obsidian: `
      bg-gradient-to-b from-[#1e293b] to-[#0f172a]
      text-slate-100 font-semibold
      border border-[#334155]
      shadow-[0_1px_0_rgba(255,255,255,0.15)_inset,0_2px_0_#020617,0_4px_12px_rgba(0,0,0,0.6)]
      hover:from-[#25334a] hover:to-[#131d33] hover:border-[#475569]
      active:translate-y-[2px] active:shadow-[0_0_0_#020617,inset_0_2px_4px_rgba(0,0,0,0.8)]
    `,
    gold: `
      bg-gradient-to-b from-[#f59e0b] via-[#d97706] to-[#b45309]
      text-[#180d00] font-bold tracking-tight
      border border-[#fbbf24]
      shadow-[0_1px_0_rgba(255,255,255,0.4)_inset,0_2px_0_#78350f,0_6px_18px_rgba(180,83,9,0.35)]
      hover:brightness-105 hover:border-[#fde68a]
      active:translate-y-[2px] active:shadow-[0_0_0_#78350f,inset_0_2px_4px_rgba(0,0,0,0.6)]
    `,
    emerald: `
      bg-gradient-to-b from-[#10b981] via-[#059669] to-[#047857]
      text-[#022c22] font-bold tracking-tight
      border border-[#34d399]
      shadow-[0_1px_0_rgba(255,255,255,0.4)_inset,0_2px_0_#064e3b,0_6px_18px_rgba(16,185,129,0.35)]
      hover:brightness-105 hover:border-[#6ee7b7]
      active:translate-y-[2px] active:shadow-[0_0_0_#064e3b,inset_0_2px_4px_rgba(0,0,0,0.6)]
    `,
    milled: `
      bg-gradient-to-b from-[#334155] via-[#1e293b] to-[#0f172a]
      text-slate-200 font-medium
      border border-[#475569]/80
      shadow-[0_1px_0_rgba(255,255,255,0.2)_inset,0_2px_0_#020617,0_4px_10px_rgba(0,0,0,0.5)]
      hover:border-[#64748b]
      active:translate-y-[2px] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]
    `,
    recessed: `
      bg-[#0a0f1d]
      text-slate-300 font-medium
      border border-[#1e293b]
      shadow-[inset_0_2px_4px_rgba(0,0,0,0.8),0_1px_0_rgba(255,255,255,0.05)]
      hover:text-white hover:border-[#334155]
      active:bg-[#070b16]
    `
  };

  const activeStyles = active
    ? 'ring-2 ring-amber-500/60 !border-amber-500/80 !shadow-[0_0_15px_rgba(245,158,11,0.25),inset_0_1px_0_rgba(255,255,255,0.2)]'
    : '';

  return (
    <button
      disabled={disabled}
      className={`
        relative inline-flex items-center justify-center rounded-xl
        select-none whitespace-nowrap shrink-0 cursor-pointer
        transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)]
        disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none
        ${sizeStyles[size]}
        ${variantStyles[variant]}
        ${activeStyles}
        ${className}
      `}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children && <span>{children}</span>}
    </button>
  );
};

export default TactileButton;

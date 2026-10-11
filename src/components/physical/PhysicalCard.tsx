import React, { useRef, useState } from 'react';

export type MaterialVariant = 
  | 'obsidian' 
  | 'carbon' 
  | 'gold' 
  | 'brushed-metal' 
  | 'ceramic' 
  | 'smoked-glass';

interface PhysicalCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: MaterialVariant;
  elevation?: 'subtle' | 'medium' | 'high';
  interactive?: boolean;
  withBolts?: boolean;
  withSpecularEdge?: boolean;
  className?: string;
}

export const PhysicalCard: React.FC<PhysicalCardProps> = ({
  children,
  variant = 'obsidian',
  elevation = 'medium',
  interactive = false,
  withBolts = false,
  withSpecularEdge = true,
  className = '',
  ...props
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [localHover, setLocalHover] = useState(false);
  const [localCoords, setLocalCoords] = useState({ x: 50, y: 50 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setLocalCoords({ x, y });
  };

  // Base material styling
  const variantStyles: Record<MaterialVariant, string> = {
    obsidian: `
      bg-[#0a0e17] 
      border border-[#1e293b]/80 
      text-[#f8fafc]
      shadow-[0_1px_0_rgba(255,255,255,0.06)_inset,0_-1px_0_rgba(0,0,0,0.8)_inset,0_10px_30px_-5px_rgba(0,0,0,0.85),0_25px_50px_-12px_rgba(0,0,0,0.95)]
    `,
    carbon: `
      bg-[#0d121c] 
      border border-[#1e2a3f] 
      text-[#f8fafc]
      [background-image:linear-gradient(45deg,#0a0d14_25%,transparent_25%),linear-gradient(-45deg,#0a0d14_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#0a0d14_75%),linear-gradient(-45deg,transparent_75%,#0a0d14_75%)]
      [background-size:8px_8px]
      shadow-[0_1px_0_rgba(255,255,255,0.08)_inset,0_-2px_0_rgba(0,0,0,0.9)_inset,0_12px_32px_-4px_rgba(0,0,0,0.9)]
    `,
    gold: `
      bg-gradient-to-b from-[#181510] via-[#100d08] to-[#0a0907]
      border border-[#b45309]/30 
      text-[#fef3c7]
      shadow-[0_1px_1px_rgba(251,191,36,0.18)_inset,0_-1px_0_rgba(0,0,0,0.9)_inset,0_12px_36px_-6px_rgba(0,0,0,0.9)]
    `,
    'brushed-metal': `
      bg-gradient-to-b from-[#172033] via-[#111827] to-[#0b1120]
      border border-[#334155]
      text-[#f8fafc]
      shadow-[0_1px_0_rgba(255,255,255,0.12)_inset,0_-1px_0_rgba(0,0,0,0.9)_inset,0_14px_35px_-5px_rgba(0,0,0,0.85)]
    `,
    ceramic: `
      bg-[#0f172a]
      border border-[#1e293b]
      text-[#f8fafc]
      shadow-[0_1px_0_rgba(255,255,255,0.05)_inset,0_-1px_0_rgba(0,0,0,0.7)_inset,0_10px_28px_-6px_rgba(0,0,0,0.75)]
    `,
    'smoked-glass': `
      bg-[#090d16]/90 backdrop-blur-xl
      border border-[#334155]/60
      text-[#f8fafc]
      shadow-[0_1px_1px_rgba(255,255,255,0.15)_inset,0_-1px_0_rgba(0,0,0,0.8)_inset,0_16px_40px_-8px_rgba(0,0,0,0.85)]
    `
  };

  const elevationOffsets = {
    subtle: 'before:h-[1px]',
    medium: 'before:h-[2px]',
    high: 'before:h-[3px]'
  };

  return (
    <div
      ref={cardRef}
      onMouseEnter={() => interactive && setLocalHover(true)}
      onMouseLeave={() => interactive && setLocalHover(false)}
      onMouseMove={handleMouseMove}
      className={`
        relative rounded-2xl overflow-hidden
        transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
        ${variantStyles[variant]}
        ${interactive ? 'hover:-translate-y-1 hover:border-[#475569] cursor-pointer' : ''}
        ${className}
      `}
      style={{
        transformStyle: 'preserve-3d',
      }}
      {...props}
    >
      {/* Precision Milled Top Chamfer Highlight */}
      {withSpecularEdge && (
        <div 
          className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/20 to-transparent z-10"
          aria-hidden="true" 
        />
      )}

      {/* Dynamic Localized Torchlight & Specular Sheen */}
      {interactive && (
        <div
          className="pointer-events-none absolute inset-0 z-10 transition-opacity duration-300"
          style={{
            opacity: localHover ? 0.85 : 0.25,
            background: `radial-gradient(400px circle at ${localCoords.x}% ${localCoords.y}%, ${
              variant === 'gold' 
                ? 'rgba(245, 158, 11, 0.12)' 
                : 'rgba(255, 255, 255, 0.06)'
            }, transparent 65%)`,
          }}
          aria-hidden="true"
        />
      )}

      {/* Precision Hex Bolt Accents */}
      {withBolts && (
        <>
          <div className="absolute top-2.5 left-2.5 w-2 h-2 rounded-full bg-[#1e293b] border border-[#334155] shadow-[inset_0_1px_1px_rgba(0,0,0,0.9),0_1px_0_rgba(255,255,255,0.1)] z-10 pointer-events-none flex items-center justify-center">
            <div className="w-0.5 h-0.5 rounded-full bg-slate-900" />
          </div>
          <div className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#1e293b] border border-[#334155] shadow-[inset_0_1px_1px_rgba(0,0,0,0.9),0_1px_0_rgba(255,255,255,0.1)] z-10 pointer-events-none flex items-center justify-center">
            <div className="w-0.5 h-0.5 rounded-full bg-slate-900" />
          </div>
          <div className="absolute bottom-2.5 left-2.5 w-2 h-2 rounded-full bg-[#1e293b] border border-[#334155] shadow-[inset_0_1px_1px_rgba(0,0,0,0.9),0_1px_0_rgba(255,255,255,0.1)] z-10 pointer-events-none flex items-center justify-center">
            <div className="w-0.5 h-0.5 rounded-full bg-slate-900" />
          </div>
          <div className="absolute bottom-2.5 right-2.5 w-2 h-2 rounded-full bg-[#1e293b] border border-[#334155] shadow-[inset_0_1px_1px_rgba(0,0,0,0.9),0_1px_0_rgba(255,255,255,0.1)] z-10 pointer-events-none flex items-center justify-center">
            <div className="w-0.5 h-0.5 rounded-full bg-slate-900" />
          </div>
        </>
      )}

      {/* Main Surface Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default PhysicalCard;

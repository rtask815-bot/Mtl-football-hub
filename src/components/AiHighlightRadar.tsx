import React from 'react';
import { Sparkles, TrendingUp, Cpu, ShieldCheck } from 'lucide-react';

interface AiHighlightRadarProps {
  label?: string;
  badgeText?: string;
  children: React.ReactNode;
  isHighlighted?: boolean;
  className?: string;
}

export const AiHighlightRadar: React.FC<AiHighlightRadarProps> = ({
  label = 'AI RECOMMENDED SECTION',
  badgeText = '98% CONFIDENCE',
  children,
  isHighlighted = true,
  className = ''
}) => {
  if (!isHighlighted) return <>{children}</>;

  return (
    <div className={`relative group rounded-3xl p-0.5 bg-gradient-to-r from-emerald-500 via-cyan-400 to-indigo-500 shadow-xl shadow-emerald-950/30 transition-all duration-300 ${className}`}>
      
      {/* Floating Futuristic AI Badge */}
      <div className="absolute -top-3 right-6 z-20 px-3 py-0.5 rounded-full bg-[#08101d] border border-cyan-400 text-[9px] font-black uppercase text-cyan-300 font-mono shadow-md flex items-center gap-1.5 animate-pulse">
        <Sparkles className="w-3 h-3 text-cyan-400" />
        <span>{label}</span>
        <span className="text-emerald-400 font-bold">• {badgeText}</span>
      </div>

      <div className="w-full h-full bg-[#08101d] rounded-[22px] overflow-hidden">
        {children}
      </div>
    </div>
  );
};

export default AiHighlightRadar;

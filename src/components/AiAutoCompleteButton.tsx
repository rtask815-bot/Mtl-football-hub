import React, { useState } from 'react';
import { Sparkles, Wand2, Cpu, Brain, Bot, Loader2, Check } from 'lucide-react';
import { AiHelperService, AiAutoCompleteResult } from '../config/aiHelper.ts';

interface AiAutoCompleteButtonProps {
  type: 'match_card' | 'news' | 'fixture' | 'chat' | 'profile';
  contextText?: string;
  onComplete: (result: AiAutoCompleteResult) => void;
  label?: string;
  variant?: 'inline' | 'compact' | 'full';
  className?: string;
}

export const AiAutoCompleteButton: React.FC<AiAutoCompleteButtonProps> = ({
  type,
  contextText = '',
  onComplete,
  label = 'AI Auto-Fill',
  variant = 'compact',
  className = ''
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsLoading(true);

    try {
      const result = await AiHelperService.autoComplete(type, contextText);
      onComplete(result);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (err) {
      console.error('AI AutoComplete Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (variant === 'inline') {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        className={`px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold font-mono flex items-center gap-1.5 transition-all cursor-pointer hover:border-emerald-400 active:scale-95 disabled:opacity-50 ${className}`}
        title="Gemini AI Auto-Suggest"
      >
        {isLoading ? (
          <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
        ) : showSuccess ? (
          <Check className="w-3 h-3 text-emerald-400" />
        ) : (
          <Sparkles className="w-3 h-3 text-cyan-400 animate-pulse" />
        )}
        <span>{isLoading ? 'Thinking...' : showSuccess ? 'Filled!' : label}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      className={`px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500/20 via-cyan-500/20 to-indigo-500/20 hover:from-emerald-500/30 hover:to-indigo-500/30 border border-cyan-400/50 hover:border-cyan-300 text-white font-bold text-xs font-['Orbitron'] tracking-wider shadow-md shadow-emerald-950/40 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 ${className}`}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
      ) : showSuccess ? (
        <Check className="w-4 h-4 text-emerald-400" />
      ) : (
        <Wand2 className="w-4 h-4 text-cyan-400 animate-bounce" />
      )}
      <span>{isLoading ? 'GEMINI THINKING...' : showSuccess ? 'AI AUTO-FILLED ✨' : label}</span>
    </button>
  );
};

export default AiAutoCompleteButton;

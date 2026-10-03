import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { enableSwipeToScroll } from '../utils/touchGestures.ts';

interface HorizontalScrollRowProps {
  children: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: string;
  badgeText?: string;
  actionButton?: React.ReactNode;
  className?: string;
  scrollAmount?: number;
}

export function HorizontalScrollRow({
  children,
  title,
  subtitle,
  badgeText,
  actionButton,
  className = '',
  scrollAmount = 320,
}: HorizontalScrollRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 5);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
  };

  useEffect(() => {
    checkScroll();
    const current = scrollRef.current;
    let cleanupSwipe: (() => void) | null = null;

    if (current) {
      current.addEventListener('scroll', checkScroll, { passive: true });
      window.addEventListener('resize', checkScroll);
      cleanupSwipe = enableSwipeToScroll(current);
    }

    return () => {
      if (current) {
        current.removeEventListener('scroll', checkScroll);
      }
      window.removeEventListener('resize', checkScroll);
      if (cleanupSwipe) cleanupSwipe();
    };
  }, [children]);

  const handleScroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const delta = direction === 'left' ? -scrollAmount : scrollAmount;
    scrollRef.current.scrollBy({ left: delta, behavior: 'smooth' });
  };

  return (
    <div className={`horizontal-scroll-wrapper relative w-full mb-6 ${className}`}>
      {/* Header with Title and Scroll Controls */}
      {(title || badgeText || actionButton) && (
        <div className="flex items-center justify-between gap-3 mb-3 px-1">
          <div className="flex-1 min-w-0">
            {badgeText && (
              <span className="text-[10px] font-extrabold text-emerald-400 tracking-wider uppercase bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-md inline-block mb-1">
                {badgeText}
              </span>
            )}
            {title && typeof title === 'string' ? (
              <h3 className="text-base font-bold text-white tracking-tight truncate flex items-center gap-2">
                {title}
              </h3>
            ) : (
              title
            )}
            {subtitle && (
              <p className="text-xs text-slate-400 mt-0.5 truncate">{subtitle}</p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {actionButton}
            <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-xl border border-slate-800 backdrop-blur-md">
              <button
                type="button"
                onClick={() => handleScroll('left')}
                disabled={!canScrollLeft}
                aria-label="Scroll left"
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                  canScrollLeft
                    ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500 hover:text-black hover:scale-105 active:scale-95 shadow-sm'
                    : 'bg-slate-800/40 text-slate-600 border border-slate-800/50 cursor-not-allowed opacity-50'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleScroll('right')}
                disabled={!canScrollRight}
                aria-label="Scroll right"
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                  canScrollRight
                    ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500 hover:text-black hover:scale-105 active:scale-95 shadow-sm'
                    : 'bg-slate-800/40 text-slate-600 border border-slate-800/50 cursor-not-allowed opacity-50'
                }`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Horizontal Scroll Area */}
      <div className="relative group">
        {/* Floating Gradient Edges for scroll hint */}
        {canScrollLeft && (
          <div className="absolute left-0 top-0 bottom-3 w-8 bg-gradient-to-r from-[#0a1422] to-transparent z-10 pointer-events-none" />
        )}
        {canScrollRight && (
          <div className="absolute right-0 top-0 bottom-3 w-8 bg-gradient-to-l from-[#0a1422] to-transparent z-10 pointer-events-none" />
        )}

        <div
          ref={scrollRef}
          className="horizontal-scroll-container flex flex-row items-stretch gap-3.5 overflow-x-auto scroll-smooth snap-x snap-mandatory py-1 px-0.5 scrollbar-thin scrollbar-thumb-emerald-500/30 scrollbar-track-slate-900/40 touch-pan-x cursor-grab active:cursor-grabbing select-none"
        >
          {React.Children.map(children, (child) => {
            if (!child) return null;
            return <div className="horizontal-scroll-item snap-start shrink-0">{child}</div>;
          })}
        </div>
      </div>
    </div>
  );
}

export default HorizontalScrollRow;

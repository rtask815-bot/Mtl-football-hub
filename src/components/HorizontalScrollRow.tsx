import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { enableSwipeToScroll } from '../utils/touchGestures.ts';
import AnimatedCard from './AnimatedCard.tsx';

interface HorizontalScrollRowProps {
  children: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: string;
  badgeText?: string;
  actionButton?: React.ReactNode;
  className?: string;
  scrollAmount?: number;
  showDots?: boolean;
}

export function HorizontalScrollRow({
  children,
  title,
  subtitle,
  badgeText,
  actionButton,
  className = '',
  scrollAmount = 380,
  showDots = true,
}: HorizontalScrollRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);

  const childrenArray = React.Children.toArray(children).filter(Boolean);
  const itemCount = childrenArray.length;

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    const maxScroll = scrollWidth - clientWidth;
    
    setCanScrollLeft(scrollLeft > 8);
    setCanScrollRight(scrollLeft < maxScroll - 8);

    if (maxScroll > 0) {
      const progress = Math.min(100, Math.max(0, (scrollLeft / maxScroll) * 100));
      setScrollProgress(progress);
    } else {
      setScrollProgress(0);
    }
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

  const scrollToRatio = (ratio: number) => {
    if (!scrollRef.current) return;
    const { scrollWidth, clientWidth } = scrollRef.current;
    const maxScroll = scrollWidth - clientWidth;
    scrollRef.current.scrollTo({ left: maxScroll * ratio, behavior: 'smooth' });
  };

  // Determine dot indicators (max 8 dots)
  const maxDots = Math.min(itemCount, 8);
  const activeDotIndex = maxDots > 1 ? Math.round((scrollProgress / 100) * (maxDots - 1)) : 0;

  return (
    <div className={`horizontal-scroll-wrapper relative w-full mb-6 ${className}`}>
      {/* Header with Title and Scroll Controls */}
      {(title || badgeText || actionButton) && (
        <div className="flex items-center justify-between gap-3 mb-3 px-1">
          <div className="flex-1 min-w-0">
            {badgeText && (
              <span className="text-[11px] font-extrabold text-emerald-400 tracking-wider uppercase bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-md inline-block mb-1">
                {badgeText}
              </span>
            )}
            {title && typeof title === 'string' ? (
              <h3 className="text-lg font-bold text-white tracking-tight truncate flex items-center gap-2">
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
            <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-700/80 backdrop-blur-md shadow-lg">
              <button
                type="button"
                onClick={() => handleScroll('left')}
                disabled={!canScrollLeft}
                aria-label="Scroll left"
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                  canScrollLeft
                    ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 hover:bg-emerald-500 hover:text-black hover:scale-110 active:scale-95 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                    : 'bg-slate-800/40 text-slate-600 border border-slate-800/50 cursor-not-allowed opacity-40'
                }`}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => handleScroll('right')}
                disabled={!canScrollRight}
                aria-label="Scroll right"
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                  canScrollRight
                    ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 hover:bg-emerald-500 hover:text-black hover:scale-110 active:scale-95 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                    : 'bg-slate-800/40 text-slate-600 border border-slate-800/50 cursor-not-allowed opacity-40'
                }`}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Horizontal Scroll Area */}
      <div className="relative group">
        {/* Floating Gradient Edge Overlay - Left */}
        {canScrollLeft && (
          <div
            onClick={() => handleScroll('left')}
            className="absolute left-0 top-0 bottom-3 w-14 bg-gradient-to-r from-[#070a13] via-[#070a13]/80 to-transparent z-10 cursor-pointer flex items-center justify-start pl-1 transition-all duration-300 hover:from-[#070a13] hover:via-[#070a13]"
            title="Scroll left"
          >
            <div className="w-7 h-7 rounded-full bg-emerald-500/30 border border-emerald-400/60 text-emerald-300 flex items-center justify-center backdrop-blur-md shadow-[0_0_12px_rgba(16,185,129,0.5)] animate-pulse hover:scale-110 transition-transform">
              <ChevronLeft className="w-4 h-4" />
            </div>
          </div>
        )}

        {/* Floating Gradient Edge Overlay - Right */}
        {canScrollRight && (
          <div
            onClick={() => handleScroll('right')}
            className="absolute right-0 top-0 bottom-3 w-14 bg-gradient-to-l from-[#070a13] via-[#070a13]/80 to-transparent z-10 cursor-pointer flex items-center justify-end pr-1 transition-all duration-300 hover:from-[#070a13] hover:via-[#070a13]"
            title="Scroll right"
          >
            <div className="w-7 h-7 rounded-full bg-emerald-500/30 border border-emerald-400/60 text-emerald-300 flex items-center justify-center backdrop-blur-md shadow-[0_0_12px_rgba(16,185,129,0.5)] animate-pulse hover:scale-110 transition-transform">
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        )}

        <div
          ref={scrollRef}
          className="horizontal-scroll-container flex flex-row items-stretch gap-4 overflow-x-auto scroll-smooth snap-x snap-proximity py-2 px-1 scrollbar-thin scrollbar-thumb-emerald-500/40 scrollbar-track-slate-900/50 touch-pan-x cursor-grab active:cursor-grabbing select-none"
        >
          {childrenArray.map((child, index) => (
            <AnimatedCard
              key={index}
              delayMs={Math.min(index * 40, 250)}
              className="horizontal-scroll-item snap-start shrink-0"
            >
              {child}
            </AnimatedCard>
          ))}
        </div>

        {/* Dots / Progress Bar Indicator underneath */}
        {showDots && maxDots > 1 && (
          <div className="flex items-center justify-center gap-1.5 mt-2.5">
            {Array.from({ length: maxDots }).map((_, idx) => {
              const isActive = idx === activeDotIndex;
              const dotRatio = idx / (maxDots - 1);
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => scrollToRatio(dotRatio)}
                  aria-label={`Go to slide group ${idx + 1}`}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    isActive
                      ? 'w-6 bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.8)]'
                      : 'w-1.5 bg-slate-700/80 hover:bg-slate-500 hover:w-3'
                  }`}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default HorizontalScrollRow;

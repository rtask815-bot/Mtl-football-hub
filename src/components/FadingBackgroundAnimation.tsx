import React, { useState, useEffect } from 'react';
import { CYBER_FOOTBALL_BACKGROUNDS } from '../assets/visualsRegistry.ts';

interface FadingBackgroundAnimationProps {
  /**
   * Transition interval in milliseconds (default: 6500ms)
   */
  intervalMs?: number;
  /**
   * Fade transition duration in milliseconds (default: 1800ms)
   */
  fadeDurationMs?: number;
  /**
   * Darkness opacity of the translucent overlay (0.0 - 1.0, default: 0.38 for vivid visibility)
   */
  overlayOpacity?: number;
  /**
   * Translucent backdrop blur in pixels (default: 2px)
   */
  blurPx?: number;
  /**
   * Additional custom CSS classes for the container
   */
  className?: string;
  /**
   * Whether to show subtle slide indicator dots
   */
  showIndicators?: boolean;
}

export default function FadingBackgroundAnimation({
  intervalMs = 6500,
  fadeDurationMs = 1800,
  overlayOpacity = 0.38,
  blurPx = 2,
  className = '',
  showIndicators = false,
}: FadingBackgroundAnimationProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [, setImagesLoaded] = useState<boolean[]>(
    new Array(CYBER_FOOTBALL_BACKGROUNDS.length).fill(false)
  );

  // Preload all 4 futuristic football images
  useEffect(() => {
    CYBER_FOOTBALL_BACKGROUNDS.forEach((item, index) => {
      const img = new Image();
      img.src = item.url;
      img.onload = () => {
        setImagesLoaded((prev) => {
          const next = [...prev];
          next[index] = true;
          return next;
        });
      };
      img.onerror = () => {
        const fallbackImg = new Image();
        fallbackImg.src = item.onlineUrl;
        fallbackImg.onload = () => {
          setImagesLoaded((prev) => {
            const next = [...prev];
            next[index] = true;
            return next;
          });
        };
      };
    });
  }, []);

  // Timer loop for fading in and fading out images
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % CYBER_FOOTBALL_BACKGROUNDS.length);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [intervalMs]);

  return (
    <div
      className={`fixed inset-0 pointer-events-none z-0 overflow-hidden select-none ${className}`}
      aria-hidden="true"
    >
      {/* Dynamic Fading Image Layers - Highly Visible Background */}
      {CYBER_FOOTBALL_BACKGROUNDS.map((item, index) => {
        const isActive = index === currentIndex;
        return (
          <div
            key={item.id}
            className="absolute inset-0 w-full h-full transition-opacity ease-in-out pointer-events-none"
            style={{
              opacity: isActive ? 1 : 0,
              transitionDuration: `${fadeDurationMs}ms`,
              zIndex: isActive ? 2 : 1,
            }}
          >
            <img
              src={item.url}
              alt={item.title}
              onError={(e) => {
                const target = e.currentTarget;
                if (target.src !== item.onlineUrl) {
                  target.src = item.onlineUrl;
                }
              }}
              className={`absolute inset-0 w-full h-full object-cover filter contrast-125 brightness-105 saturate-110 transform transition-transform duration-[7500ms] ease-out ${
                isActive ? 'scale-105 translate-y-[-0.5%]' : 'scale-100 translate-y-0'
              }`}
            />
          </div>
        );
      })}

      {/* TRANSLUCENT FILTER LAYERS */}
      {/* 1. Frosted Translucent Diffusion Filter */}
      <div
        className="absolute inset-0 z-3 pointer-events-none"
        style={{
          backdropFilter: `blur(${blurPx}px)`,
          WebkitBackdropFilter: `blur(${blurPx}px)`,
        }}
      />

      {/* 2. Balanced Translucent Tint: Keeps images clearly visible while maintaining text contrast */}
      <div
        className="absolute inset-0 z-4 pointer-events-none transition-colors duration-1000"
        style={{
          backgroundColor: `rgba(4, 9, 22, ${overlayOpacity})`,
        }}
      />

      {/* 3. Cyber Translucent Vignette (soft radial electric cyan & cobalt glow) */}
      <div
        className="absolute inset-0 z-5 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 50% 25%, rgba(0, 245, 212, 0.06) 0%, rgba(59, 130, 246, 0.08) 50%, rgba(2, 6, 18, 0.65) 100%)',
        }}
      />

      {/* 4. Fine Tactical Grid Lines (translucent HUD matrix) */}
      <div
        className="absolute inset-0 z-6 opacity-15 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0, 245, 212, 0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 245, 212, 0.12) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Optional Indicators */}
      {showIndicators && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 pointer-events-auto bg-slate-950/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700/50">
          {CYBER_FOOTBALL_BACKGROUNDS.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                idx === currentIndex
                  ? 'w-6 bg-cyan-400 shadow-[0_0_8px_rgba(0,245,212,0.8)]'
                  : 'w-1.5 bg-slate-500/50 hover:bg-slate-300'
              }`}
              title={`Switch to backdrop ${idx + 1}`}
              aria-label={`Slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

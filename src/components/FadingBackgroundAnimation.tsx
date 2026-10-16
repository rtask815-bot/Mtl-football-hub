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
   * Darkness opacity of the cyberpunk overlay (0.0 - 1.0, default: 0.72)
   */
  overlayOpacity?: number;
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
  overlayOpacity = 0.72,
  className = '',
  showIndicators = false,
}: FadingBackgroundAnimationProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imagesLoaded, setImagesLoaded] = useState<boolean[]>(
    new Array(CYBER_FOOTBALL_BACKGROUNDS.length).fill(false)
  );

  // Preload all 4 futuristic football images
  useEffect(() => {
    CYBER_FOOTBALL_BACKGROUNDS.forEach((item, index) => {
      const img = new Image();
      // Try local path first, if error try online ibb url
      img.src = item.url;
      img.onload = () => {
        setImagesLoaded((prev) => {
          const next = [...prev];
          next[index] = true;
          return next;
        });
      };
      img.onerror = () => {
        // Fallback to online image directly
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
      {/* Dynamic Fading Image Layers */}
      {CYBER_FOOTBALL_BACKGROUNDS.map((item, index) => {
        const isActive = index === currentIndex;
        return (
          <div
            key={item.id}
            className="absolute inset-0 w-full h-full transition-opacity ease-in-out"
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
                // Fallback to remote direct link if local asset path encounters issue
                const target = e.currentTarget;
                if (target.src !== item.onlineUrl) {
                  target.src = item.onlineUrl;
                }
              }}
              className={`absolute inset-0 w-full h-full object-cover filter contrast-110 brightness-95 transform transition-transform duration-[8000ms] ease-out ${
                isActive ? 'scale-105 translate-y-[-1%]' : 'scale-100 translate-y-0'
              }`}
            />
          </div>
        );
      })}

      {/* Cyberpunk Vignette & Atmospheric Overlay Layers */}
      {/* 1. Deep tinted dark vignette to guarantee text and HUD legibility */}
      <div
        className="absolute inset-0 z-3 transition-opacity duration-1000"
        style={{
          backgroundColor: `rgba(2, 6, 23, ${overlayOpacity})`,
        }}
      />

      {/* 2. Cyberpunk radial gradient matching MTL neon theme (cyan & electric blue glow) */}
      <div
        className="absolute inset-0 z-4 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 50% 30%, rgba(0, 245, 212, 0.08) 0%, rgba(59, 130, 246, 0.12) 45%, rgba(1, 3, 7, 0.92) 100%)',
        }}
      />

      {/* 3. Subtle micro-grid mesh overlay for futuristic football tactical feel */}
      <div
        className="absolute inset-0 z-5 opacity-20 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0, 245, 212, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 245, 212, 0.08) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* Optional Indicators */}
      {showIndicators && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 pointer-events-auto">
          {CYBER_FOOTBALL_BACKGROUNDS.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                idx === currentIndex
                  ? 'w-6 bg-cyan-400 shadow-[0_0_8px_rgba(0,245,212,0.8)]'
                  : 'w-1.5 bg-slate-600/60 hover:bg-slate-400'
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

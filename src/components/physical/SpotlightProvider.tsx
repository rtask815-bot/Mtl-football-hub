import React, { useEffect, useRef } from 'react';

interface SpotlightProviderProps {
  children: React.ReactNode;
}

export const SpotlightProvider: React.FC<SpotlightProviderProps> = ({ children }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let rafId: number | null = null;
    let targetX = window.innerWidth / 2;
    let targetY = 300;
    let currentX = targetX;
    let currentY = targetY;

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if ('touches' in e && e.touches.length > 0) {
        targetX = e.touches[0].clientX;
        targetY = e.touches[0].clientY;
      } else if ('clientX' in e) {
        targetX = (e as MouseEvent).clientX;
        targetY = (e as MouseEvent).clientY;
      }

      if (!rafId) {
        rafId = requestAnimationFrame(updateLighting);
      }
    };

    const updateLighting = () => {
      // Smooth interpolation for fluid physical light feel
      currentX += (targetX - currentX) * 0.25;
      currentY += (targetY - currentY) * 0.25;

      const docEl = document.documentElement;
      docEl.style.setProperty('--torch-x', `${currentX.toFixed(1)}px`);
      docEl.style.setProperty('--torch-y', `${currentY.toFixed(1)}px`);

      if (Math.abs(targetX - currentX) > 0.5 || Math.abs(targetY - currentY) > 0.5) {
        rafId = requestAnimationFrame(updateLighting);
      } else {
        rafId = null;
      }
    };

    window.addEventListener('mousemove', handlePointerMove, { passive: true });
    window.addEventListener('touchmove', handlePointerMove, { passive: true });

    // Set initial position
    document.documentElement.style.setProperty('--torch-x', `${targetX}px`);
    document.documentElement.style.setProperty('--torch-y', `${targetY}px`);

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('touchmove', handlePointerMove);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative min-h-screen selection:bg-amber-500/20 selection:text-amber-200">
      {/* Global Ambient Torchlight Layer */}
      <div 
        className="pointer-events-none fixed inset-0 z-30 transition-opacity duration-300 opacity-70"
        style={{
          background: 'radial-gradient(circle 600px at var(--torch-x, 50vw) var(--torch-y, 30vh), rgba(245, 158, 11, 0.04), rgba(59, 130, 246, 0.02) 40%, transparent 75%)',
        }}
        aria-hidden="true"
      />
      {children}
    </div>
  );
};

export default SpotlightProvider;

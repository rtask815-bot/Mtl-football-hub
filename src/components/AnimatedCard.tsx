import React, { useEffect, useRef, useState } from 'react';

interface AnimatedCardProps {
  children: React.ReactNode;
  className?: string;
  delayMs?: number;
  style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  title?: string;
}

export function AnimatedCard({
  children,
  className = '',
  delayMs = 0,
  style = {},
  onClick,
  title,
}: AnimatedCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    if (!('IntersectionObserver' in window)) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (delayMs > 0) {
            setTimeout(() => {
              setIsVisible(true);
            }, delayMs);
          } else {
            setIsVisible(true);
          }
          observer.unobserve(entry.target);
        }
      },
      {
        root: null,
        rootMargin: '20px 40px 20px 40px',
        threshold: 0.1,
      }
    );

    observer.observe(el);

    return () => {
      if (el) observer.unobserve(el);
    };
  }, [delayMs]);

  return (
    <div
      ref={cardRef}
      title={title}
      onClick={onClick}
      style={style}
      className={`animate-on-scroll ${isVisible ? 'is-visible' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

export default AnimatedCard;

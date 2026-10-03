import React from 'react';

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
  style = {},
  onClick,
  title,
}: AnimatedCardProps) {
  return (
    <div
      title={title}
      onClick={onClick}
      style={style}
      className={`is-visible ${className}`}
    >
      {children}
    </div>
  );
}

export default AnimatedCard;

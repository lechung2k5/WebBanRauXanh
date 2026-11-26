'use client';

import React from 'react';
import { useScrollReveal } from '@/hooks/useScrollReveal';

interface RevealSectionProps {
  children: React.ReactNode;
  className?: string;
  delayMs?: number;
}

export const RevealSection: React.FC<RevealSectionProps> = ({
  children,
  className = '',
  delayMs = 0,
}) => {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>();

  return (
    <div
      ref={ref}
      style={delayMs ? { transitionDelay: `${delayMs}ms` } : undefined}
      className={`reveal-base ${isVisible ? 'is-visible' : ''} ${className}`}
    >
      {children}
    </div>
  );
};

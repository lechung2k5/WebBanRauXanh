'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

interface Tilt3DCardProps {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number;
  glowColor?: string;
  onClick?: () => void;
}

export const Tilt3DCard: React.FC<Tilt3DCardProps> = ({
  children,
  className = '',
  maxTilt = 7,
  glowColor = 'rgba(139, 195, 74, 0.28)',
  onClick,
}) => {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [tiltEnabled, setTiltEnabled] = useState(false);
  const [transformStyle, setTransformStyle] = useState(
    'perspective(1200px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
  );
  const [spotPos, setSpotPos] = useState<{ x: number; y: number; active: boolean }>({
    x: 50,
    y: 50,
    active: false,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isCoarse = window.matchMedia('(pointer: coarse)').matches;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setTiltEnabled(!isCoarse && !reducedMotion);
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!tiltEnabled || !cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;

      const rotateY = (px - 0.5) * (maxTilt * 2);
      const rotateX = (0.5 - py) * (maxTilt * 2);

      setTransformStyle(
        `perspective(1200px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.015, 1.015, 1.015)`,
      );
      setSpotPos({ x: px * 100, y: py * 100, active: true });
    },
    [tiltEnabled, maxTilt],
  );

  const handleMouseLeave = useCallback(() => {
    setTransformStyle('perspective(1200px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)');
    setSpotPos((prev) => ({ ...prev, active: false }));
  }, []);

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: transformStyle,
        transition: spotPos.active
          ? 'transform 0.12s cubic-bezier(0.22, 1, 0.36, 1)'
          : 'transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)',
        transformStyle: 'preserve-3d',
      }}
      className={`relative overflow-hidden ${className}`}
    >
      {/* Spotlight radial glow following pointer */}
      {tiltEnabled && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 transition-opacity duration-300"
          style={{
            opacity: spotPos.active ? 1 : 0,
            background: `radial-gradient(360px circle at ${spotPos.x}% ${spotPos.y}%, ${glowColor}, transparent 70%)`,
          }}
        />
      )}
      {children}
    </div>
  );
};

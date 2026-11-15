import React, { useEffect, useState } from 'react';

interface ReadingRulerProps {
  enabled: boolean;
  maskEnabled: boolean;
  height: number;
  color: string;
  opacity: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export const ReadingRuler: React.FC<ReadingRulerProps> = ({
  enabled,
  maskEnabled,
  height,
  color,
  opacity,
  containerRef,
}) => {
  const [topPos, setTopPos] = useState<number>(180);
  const [isVisible, setIsVisible] = useState<boolean>(true);

  useEffect(() => {
    if (!enabled && !maskEnabled) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      if (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      ) {
        setIsVisible(true);
        // Center the ruler on cursor Y relative to the container
        const relativeY = e.clientY - rect.top;
        setTopPos(Math.max(0, Math.min(rect.height - height, relativeY - height / 2)));
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const step = height * 0.75;

      if (e.key === 'ArrowDown' && e.altKey) {
        e.preventDefault();
        setTopPos((prev) => Math.min(rect.height - height, prev + step));
      } else if (e.key === 'ArrowUp' && e.altKey) {
        e.preventDefault();
        setTopPos((prev) => Math.max(0, prev - step));
      }
    };

    const handleTouch = (e: TouchEvent) => {
      if (!containerRef.current || e.touches.length === 0) return;
      const touch = e.touches[0];
      const rect = containerRef.current.getBoundingClientRect();
      if (
        touch.clientX >= rect.left &&
        touch.clientX <= rect.right &&
        touch.clientY >= rect.top &&
        touch.clientY <= rect.bottom
      ) {
        setIsVisible(true);
        const relativeY = touch.clientY - rect.top;
        setTopPos(Math.max(0, Math.min(rect.height - height, relativeY - height / 2)));
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('touchstart', handleTouch, { passive: true });
    window.addEventListener('touchmove', handleTouch, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('touchstart', handleTouch);
      window.removeEventListener('touchmove', handleTouch);
    };
  }, [enabled, maskEnabled, height, containerRef]);

  if (!enabled && !maskEnabled) return null;
  if (!isVisible) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      {/* Reading Mask: Darkens top and bottom when enabled */}
      {maskEnabled && (
        <>
          <div
            className="absolute left-0 right-0 top-0 bg-black/45 backdrop-blur-[0.5px] transition-all duration-75 ease-out"
            style={{ height: `${topPos}px` }}
          />
          <div
            className="absolute bottom-0 left-0 right-0 bg-black/45 backdrop-blur-[0.5px] transition-all duration-75 ease-out"
            style={{ top: `${topPos + height}px` }}
          />
        </>
      )}

      {/* Reading Ruler Strip / Highlight */}
      {enabled && (
        <div
          className="absolute left-4 sm:left-8 right-4 sm:right-8 rounded-2xl transition-transform duration-75 ease-out border pointer-events-none"
          style={{
            top: `${topPos}px`,
            height: `${height}px`,
            backgroundColor: color,
            opacity: opacity,
            borderColor: color,
          }}
        >
          {/* Subtle guide line */}
          <div className="w-full h-[1px] bg-blue-600/25 absolute top-1/2 -translate-y-1/2" />
        </div>
      )}
    </div>
  );
};

import React, { useCallback, useRef } from 'react';
import { Flame } from 'lucide-react';
import type { RoastIntensity } from '../types';

interface FlameSliderProps {
  intensity: RoastIntensity;
  onChange: (intensity: RoastIntensity) => void;
}

const LEVELS: RoastIntensity[] = ['mild', 'medium', 'nuclear'];

const DESCRIPTIONS: Record<RoastIntensity, string> = {
  mild: 'Polite critiques with constructive advice. Minimal ego damage.',
  medium: 'Sarcasm with receipts.',
  nuclear: 'Total emotional annihilation. Unfiltered psychological warfare.',
};

export const FlameSlider: React.FC<FlameSliderProps> = ({ intensity, onChange }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const currentIndex = Math.max(0, LEVELS.indexOf(intensity));

  /** Map a pointer position on the track to the nearest level. */
  const levelFromClientX = useCallback((clientX: number): RoastIntensity => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return intensity;
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return LEVELS[Math.round(ratio * (LEVELS.length - 1))];
  }, [intensity]);

  const setFromPointer = useCallback((clientX: number) => {
    const next = levelFromClientX(clientX);
    if (next !== intensity) onChange(next);
  }, [levelFromClientX, intensity, onChange]);

  // The thumb looks draggable, so it has to actually drag.
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    setFromPointer(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.buttons !== 1) return; // only while the primary button is held
    setFromPointer(e.clientX);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
    if (step !== undefined) {
      e.preventDefault();
      const next = LEVELS[Math.min(LEVELS.length - 1, Math.max(0, currentIndex + step))];
      if (next !== intensity) onChange(next);
      return;
    }
    if (e.key === 'Home') {
      e.preventDefault();
      onChange(LEVELS[0]);
    } else if (e.key === 'End') {
      e.preventDefault();
      onChange(LEVELS[LEVELS.length - 1]);
    }
  };

  const percent = (currentIndex / (LEVELS.length - 1)) * 100;

  return (
    <div className="bg-[#121212] border border-[#242424] p-6 md:p-7 rounded-sm relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="font-mono text-xs tracking-widest text-[#777777] font-semibold uppercase block mb-1">
            ROAST INTENSITY
          </span>
          <span className="font-bebas text-3xl md:text-4xl text-[#FF4400] tracking-wider leading-none">
            {intensity.toUpperCase()}
          </span>
        </div>

        {/* Flame icons indicator */}
        <div className="flex items-center gap-1" aria-hidden="true">
          {[1, 2, 3].map((f) => {
            const isLit = f <= currentIndex + 1;
            return (
              <Flame
                key={f}
                className={`w-5 h-5 transition-all duration-300 ${
                  isLit
                    ? 'text-[#FF4400] fill-[#FF4400] drop-shadow-[0_0_8px_rgba(255,68,0,0.8)] scale-110'
                    : 'text-[#333333]'
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* Slider Bar */}
      <div className="my-6 relative">
        <div
          ref={trackRef}
          className="h-2 w-full bg-[#1E1E1E] rounded-full relative cursor-pointer touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
        >
          {/* Active track fill */}
          <div
            className="h-full bg-gradient-to-r from-[#FF7B00] to-[#FF4400] rounded-full transition-all duration-300 shadow-[0_0_12px_rgba(255,68,0,0.5)] pointer-events-none"
            style={{ width: `${percent}%` }}
          />

          {/* Interactive Thumb: focusable and operable by keyboard. */}
          <div
            role="slider"
            tabIndex={0}
            aria-label="Roast intensity"
            aria-valuemin={1}
            aria-valuemax={LEVELS.length}
            aria-valuenow={currentIndex + 1}
            aria-valuetext={intensity}
            onKeyDown={handleKeyDown}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 bg-[#0A0A0A] border-2 border-white rounded-none shadow-[0_0_15px_rgba(255,68,0,0.8)] transition-all duration-300 flex items-center justify-center cursor-grab active:cursor-grabbing focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4400] focus-visible:ring-offset-2 focus-visible:ring-offset-[#121212]"
            style={{ left: `${percent}%` }}
          >
            <div className="w-1.5 h-1.5 bg-[#FF4400] pointer-events-none" />
          </div>
        </div>

        {/* Labels. type="button" matters: these sit inside the roast <form>, and a
            button with no type defaults to submit, which fired the roast instead
            of changing the setting. */}
        <div className="flex justify-between items-center mt-4">
          {LEVELS.map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => onChange(lvl)}
              aria-pressed={intensity === lvl}
              className={`font-mono text-[11px] md:text-xs uppercase tracking-wider font-semibold transition-colors cursor-pointer rounded px-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4400] ${
                intensity === lvl ? 'text-white' : 'text-[#555555] hover:text-[#999999]'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Dynamic Subtext */}
      <div className="border-t border-[#1E1E1E] pt-4 mt-2">
        <p className="font-mono text-xs md:text-sm text-[#A5A5A5]" aria-live="polite">
          {DESCRIPTIONS[intensity]}
        </p>
      </div>
    </div>
  );
};

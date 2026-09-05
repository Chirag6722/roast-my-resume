import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, AlertTriangle } from 'lucide-react';
import { isSpeechSupported, speakRoast, type SpeechHandle } from '../utils/speech';
import type { RoastIntensity } from '../types';

interface VoiceRoastPlayerProps {
  roastHeadline: string;
  verdict: string;
  paragraphs: string[];
  intensity?: RoastIntensity;
}

// A nuclear roast should not be read in the same voice as a gentle one.
const DELIVERY: Record<RoastIntensity, { rate: number; pitch: number }> = {
  mild: { rate: 0.95, pitch: 1.0 },
  medium: { rate: 1.0, pitch: 0.9 },
  nuclear: { rate: 1.08, pitch: 0.75 },
};

export const VoiceRoastPlayer: React.FC<VoiceRoastPlayerProps> = ({
  roastHeadline,
  verdict,
  paragraphs,
  intensity = 'medium',
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState({ spoken: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const handleRef = useRef<SpeechHandle | null>(null);
  const supported = isSpeechSupported();

  // Stop the audio if the user navigates away or a new roast replaces this one.
  useEffect(() => {
    return () => {
      handleRef.current?.stop();
      handleRef.current = null;
    };
  }, []);

  // A new roast replaces this one. State resets during render (React's supported
  // way to react to a changed prop); the audio itself is stopped in an effect,
  // because touching a ref during render is not safe.
  const [lastVerdict, setLastVerdict] = useState(verdict);
  if (verdict !== lastVerdict) {
    setLastVerdict(verdict);
    setIsPlaying(false);
    setProgress({ spoken: 0, total: 0 });
    setError(null);
  }

  useEffect(() => {
    return () => {
      handleRef.current?.stop();
      handleRef.current = null;
    };
  }, [verdict]);

  const stop = () => {
    handleRef.current?.stop();
    handleRef.current = null;
    setIsPlaying(false);
    setProgress({ spoken: 0, total: 0 });
  };

  const handleToggle = () => {
    if (isPlaying) {
      stop();
      return;
    }
    setError(null);
    setIsPlaying(true);
    const script = [roastHeadline, verdict, ...paragraphs].filter(Boolean).join('. ');
    const { rate, pitch } = DELIVERY[intensity] ?? DELIVERY.medium;

    handleRef.current = speakRoast(script, {
      rate,
      pitch,
      onProgress: (spoken, total) => setProgress({ spoken, total }),
      onEnd: () => {
        handleRef.current = null;
        setIsPlaying(false);
        setProgress({ spoken: 0, total: 0 });
      },
      onError: reason => {
        handleRef.current = null;
        setIsPlaying(false);
        setProgress({ spoken: 0, total: 0 });
        setError(reason);
      },
    });
  };

  if (!supported) {
    return (
      <span
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded font-mono text-xs bg-[#161616] border border-[#2A2A2A] text-[#666666] cursor-not-allowed"
        title="This browser has no speech synthesis, so the roast cannot be read aloud."
      >
        <VolumeX className="w-3.5 h-3.5" />
        <span>VOICE UNAVAILABLE</span>
      </span>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        onClick={handleToggle}
        aria-live="polite"
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded font-mono text-xs transition-all duration-200 cursor-pointer ${
          isPlaying
            ? 'bg-[#FF4400] text-white shadow-[0_0_15px_rgba(255,68,0,0.6)]'
            : 'bg-[#1C1C1C] hover:bg-[#252525] border border-[#333333] text-[#D0D0D0] hover:text-white'
        }`}
        title={isPlaying ? 'Stop reading the roast' : 'Listen to the roast out loud'}
      >
        {isPlaying ? (
          <>
            <VolumeX className="w-3.5 h-3.5" />
            <span>
              STOP
              {progress.total > 0 && ` · ${Math.min(progress.spoken + 1, progress.total)}/${progress.total}`}
            </span>
          </>
        ) : (
          <>
            <Volume2 className="w-3.5 h-3.5 text-[#FF4400]" />
            <span>🎙️ PLAY VOICE ROAST</span>
          </>
        )}
      </button>

      {error && (
        <span className="inline-flex items-center gap-1 font-mono text-[10px] text-red-400">
          <AlertTriangle className="w-3 h-3" />
          {error}
        </span>
      )}
    </div>
  );
};

import React, { useMemo } from 'react';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import type { HistoryItemSummary, RoastIntensity } from '../types';
import { VIEW, buildTrend } from '../utils/scoreTrend';

interface ScoreTrendProps {
  /** Newest first, as the history endpoint returns it. */
  history: HistoryItemSummary[];
}

const INTENSITY_COLOUR: Record<RoastIntensity, string> = {
  mild: '#FFC24B',
  medium: '#FF7B00',
  nuclear: '#FF3B21',
};

/**
 * Scores over time, oldest to newest.
 *
 * The Burn Book already stored every score but only showed totals and an
 * average, so the one thing the product is actually for, watching a resume get
 * better, was invisible.
 *
 * A caveat worth stating rather than hiding: a nuclear roast deliberately
 * scores lower than a mild one for the same resume, so a line drawn across
 * mixed intensities is not a like-for-like comparison. Each point is coloured
 * by intensity and the note below says so.
 */
export const ScoreTrend: React.FC<ScoreTrendProps> = ({ history }) => {
  const points = useMemo(() => [...history].reverse(), [history]); // oldest first

  const coords = useMemo(() => buildTrend(points), [points]);

  if (!coords) return null;

  const first = points[0].ats_score;
  const latest = points[points.length - 1].ats_score;
  const delta = latest - first;
  const line = coords.map(c => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const area = `${VIEW.pad},${VIEW.h - VIEW.pad} ${line} ${VIEW.w - VIEW.pad},${VIEW.h - VIEW.pad}`;

  const mixedIntensities = new Set(points.map(p => p.intensity)).size > 1;
  const summary =
    delta > 0 ? `up ${delta} points since your first roast`
    : delta < 0 ? `down ${Math.abs(delta)} points since your first roast`
    : 'unchanged since your first roast';

  return (
    <div className="bg-[#121212] border border-[#242424] p-5 md:p-6 rounded-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-3 mb-4">
        <div>
          <span className="font-mono text-[10px] text-[#888] uppercase tracking-wider block">
            SCORE OVER TIME
          </span>
          <span className="font-bebas text-2xl md:text-3xl text-white tracking-wide">
            {points.length} ROASTS, OLDEST TO NEWEST
          </span>
        </div>

        <span
          className={`inline-flex items-center gap-1.5 font-mono text-sm font-bold px-2.5 py-1 rounded border ${
            delta > 0 ? 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10'
            : delta < 0 ? 'text-red-400 border-red-500/40 bg-red-500/10'
            : 'text-[#999] border-[#333] bg-[#1A1A1A]'
          }`}
        >
          {delta > 0 ? <TrendingUp className="w-4 h-4" />
            : delta < 0 ? <TrendingDown className="w-4 h-4" />
            : <Minus className="w-4 h-4" />}
          {delta > 0 ? `+${delta}` : delta}
          <span className="font-normal text-[10px] uppercase tracking-wider opacity-80">since first</span>
        </span>
      </div>

      <svg
        viewBox={`0 0 ${VIEW.w} ${VIEW.h}`}
        preserveAspectRatio="none"
        className="w-full h-28 overflow-visible"
        role="img"
        aria-label={`ATS score across ${points.length} roasts, ${summary}. Scores in order: ${points.map(p => p.ats_score).join(', ')}.`}
      >
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FF4400" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#FF4400" stopOpacity="0" />
          </linearGradient>
        </defs>

        <polygon points={area} fill="url(#trendFill)" />
        <polyline
          points={line}
          fill="none"
          stroke="#FF4400"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />

        {coords.map(({ x, y, score, intensity, id }) => (
          <circle
            key={id}
            cx={x}
            cy={y}
            r={4}
            fill="#0A0A0A"
            stroke={INTENSITY_COLOUR[intensity] ?? '#FF7B00'}
            strokeWidth={2.5}
            vectorEffect="non-scaling-stroke"
          >
            <title>{`${score}/100 · ${intensity}`}</title>
          </circle>
        ))}
      </svg>

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 mt-4 pt-3 border-t border-[#1E1E1E]">
        <div className="flex items-center gap-4">
          {(Object.keys(INTENSITY_COLOUR) as RoastIntensity[]).map(level => (
            <span key={level} className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-[#888]">
              <span
                className="w-2.5 h-2.5 rounded-full border-2"
                style={{ borderColor: INTENSITY_COLOUR[level] }}
              />
              {level}
            </span>
          ))}
        </div>
        <span className="font-mono text-[10px] text-[#666]">
          {first} → {latest} / 100
        </span>
      </div>

      {mixedIntensities && (
        <p className="font-mono text-[10px] text-[#666] leading-relaxed mt-2">
          A nuclear roast scores lower than a mild one on the same resume by design, so points at
          different heat levels are not a like-for-like comparison.
        </p>
      )}
    </div>
  );
};

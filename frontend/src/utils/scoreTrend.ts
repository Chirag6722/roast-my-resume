import type { HistoryItemSummary, RoastIntensity } from '../types';

/** The SVG coordinate space the trend is drawn in. */
export const VIEW = { w: 600, h: 120, pad: 14 };

export interface TrendPoint {
  x: number;
  y: number;
  score: number;
  intensity: RoastIntensity;
  id: string;
}

/**
 * Turn scores into plot coordinates, oldest first.
 * Returns null when there is nothing meaningful to draw.
 */
export function buildTrend(oldestFirst: HistoryItemSummary[]): TrendPoint[] | null {
  if (oldestFirst.length < 2) return null;
  const scores = oldestFirst.map(p => p.ats_score);
  const lo = Math.min(...scores);
  const hi = Math.max(...scores);
  // Every score identical would divide by zero, so a flat run gets a band and
  // sits on the mid-line rather than producing NaN coordinates.
  const span = hi - lo || 1;
  const innerW = VIEW.w - VIEW.pad * 2;
  const innerH = VIEW.h - VIEW.pad * 2;

  return oldestFirst.map((p, i) => ({
    x: VIEW.pad + (i / (oldestFirst.length - 1)) * innerW,
    y: VIEW.pad + innerH - ((p.ats_score - lo) / span) * innerH,
    score: p.ats_score,
    intensity: p.intensity,
    id: p.id,
  }));
}

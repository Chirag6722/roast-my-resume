import { describe, expect, it } from 'vitest';
import { VIEW, buildTrend } from '../utils/scoreTrend';
import type { HistoryItemSummary, RoastIntensity } from '../types';

const roast = (score: number, intensity: RoastIntensity = 'medium', id = String(score)): HistoryItemSummary => ({
  id,
  file_name: 'resume.txt',
  created_at: 'Jan 01, 2026',
  intensity,
  ats_score: score,
  overall_verdict: 'a verdict',
});

describe('buildTrend', () => {
  it('draws nothing until there is something to compare', () => {
    expect(buildTrend([])).toBeNull();
    expect(buildTrend([roast(50)])).toBeNull();
  });

  it('spreads points evenly from the left edge to the right', () => {
    const points = buildTrend([roast(50, 'medium', 'a'), roast(60, 'medium', 'b'), roast(84, 'medium', 'c')])!;
    expect(points).toHaveLength(3);
    expect(points[0].x).toBe(VIEW.pad);
    expect(points[2].x).toBe(VIEW.w - VIEW.pad);
    expect(points[1].x).toBeCloseTo(VIEW.w / 2, 5);
  });

  it('puts the highest score at the top and the lowest at the bottom', () => {
    const points = buildTrend([roast(50, 'medium', 'a'), roast(84, 'medium', 'b')])!;
    // Smaller y is higher on screen.
    expect(points[1].y).toBeLessThan(points[0].y);
    expect(points[1].y).toBe(VIEW.pad);
    expect(points[0].y).toBe(VIEW.h - VIEW.pad);
  });

  it('keeps every point inside the drawing area', () => {
    const points = buildTrend([roast(12), roast(95), roast(48), roast(77)].map((p, i) => ({ ...p, id: String(i) })))!;
    for (const p of points) {
      expect(p.x).toBeGreaterThanOrEqual(VIEW.pad);
      expect(p.x).toBeLessThanOrEqual(VIEW.w - VIEW.pad);
      expect(p.y).toBeGreaterThanOrEqual(VIEW.pad);
      expect(p.y).toBeLessThanOrEqual(VIEW.h - VIEW.pad);
    }
  });

  it('handles an unchanged run without dividing by zero', () => {
    const points = buildTrend([roast(55, 'medium', 'a'), roast(55, 'medium', 'b'), roast(55, 'medium', 'c')])!;
    for (const p of points) {
      expect(Number.isFinite(p.x)).toBe(true);
      expect(Number.isFinite(p.y)).toBe(true);
      expect(Number.isNaN(p.y)).toBe(false);
    }
    // A flat run should sit on one horizontal line.
    expect(new Set(points.map(p => p.y)).size).toBe(1);
  });

  it('handles a declining run', () => {
    const points = buildTrend([roast(80, 'medium', 'a'), roast(40, 'medium', 'b')])!;
    expect(points[1].y).toBeGreaterThan(points[0].y);
  });

  it('carries the score and intensity through for the legend and tooltips', () => {
    const points = buildTrend([roast(50, 'mild', 'a'), roast(70, 'nuclear', 'b')])!;
    expect(points.map(p => p.intensity)).toEqual(['mild', 'nuclear']);
    expect(points.map(p => p.score)).toEqual([50, 70]);
  });

  it('keeps the order it was given, oldest first', () => {
    const points = buildTrend([roast(50, 'medium', 'first'), roast(60, 'medium', 'second')])!;
    expect(points.map(p => p.id)).toEqual(['first', 'second']);
  });

  it('copes with the extremes of the scale', () => {
    const points = buildTrend([roast(0, 'medium', 'a'), roast(100, 'medium', 'b')])!;
    expect(points.every(p => Number.isFinite(p.y))).toBe(true);
  });
});

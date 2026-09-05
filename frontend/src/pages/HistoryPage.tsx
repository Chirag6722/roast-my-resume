import React, { useState, useEffect } from 'react';
import { Flame, Trash2, ArrowRight, Loader2, TrendingUp, Award } from 'lucide-react';
import type { HistoryItemSummary, RoastResult } from '../types';
import { api } from '../services/api';

interface HistoryPageProps {
  onNavigate: (page: string) => void;
  onSelectRoast: (roast: RoastResult) => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({ onNavigate, onSelectRoast }) => {
  const [history, setHistory] = useState<HistoryItemSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchingId, setFetchingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = async () => {
    try {
      const items = await api.getHistory();
      setHistory(items);
    } catch (err) {
      console.error('Failed to load history', err);
      setError('Could not load your history. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleViewRoast = async (id: string) => {
    setFetchingId(id);
    try {
      const fullRoast = await api.getRoastById(id);
      if (fullRoast) {
        onSelectRoast(fullRoast);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFetchingId(null);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Delete this burn permanently? This cannot be undone.')) return;

    setError(null);
    setDeletingId(id);
    try {
      // Only drop the row once the server confirms. Removing it optimistically
      // hid failures until a refresh brought the roast back.
      const deleted = await api.deleteRoast(id);
      if (!deleted) {
        setError('That burn could not be deleted. It may already be gone, or the server is unreachable.');
        return;
      }
      setHistory(prev => prev.filter(item => item.id !== id));
      const saved = localStorage.getItem('roast_local_history');
      if (saved) {
        const parsed = JSON.parse(saved).filter((item: HistoryItemSummary) => item.id !== id);
        localStorage.setItem('roast_local_history', JSON.stringify(parsed));
      }
    } catch (err) {
      console.error('Delete failed', err);
      setError('That burn could not be deleted. Check your connection and try again.');
    } finally {
      setDeletingId(null);
    }
  };

  // Stats calculation
  const totalBurns = history.length;
  const avgScore = totalBurns > 0 ? Math.round(history.reduce((acc, curr) => acc + curr.ats_score, 0) / totalBurns) : 0;
  const bestScore = totalBurns > 0 ? Math.max(...history.map(h => h.ats_score)) : 0;

  return (
    <div className="py-12 px-6 max-w-7xl mx-auto w-full min-h-[calc(100vh-80px)] space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#222222] pb-6 gap-4">
        <div className="text-left space-y-2">
          <h1 className="font-bebas text-6xl sm:text-7xl md:text-8xl text-white font-bold leading-none tracking-tight">
            YOUR <span className="text-[#FF4400] glow-ember">BURN BOOK</span>
          </h1>
          <p className="text-[#A0A0A0] text-base md:text-lg">
            Every roast, score and rewrite you&apos;ve survived.
          </p>
        </div>

        <button
          onClick={() => onNavigate('roast')}
          className="bg-[#FF4400] hover:bg-[#E63D00] text-white px-6 py-3 rounded-sm font-bebas text-xl md:text-2xl tracking-wider transition-all duration-200 cursor-pointer shadow-[0_0_20px_rgba(255,68,0,0.3)] self-start sm:self-center"
        >
          NEW ROAST
        </button>
      </div>

      {/* Analytics Counter Cards */}
      {history.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#121212] border border-[#242424] p-5 rounded-sm flex items-center justify-between">
            <div>
              <span className="font-mono text-[10px] text-[#888] uppercase tracking-wider block">TOTAL ROASTS</span>
              <span className="font-bebas text-4xl text-white font-bold">{totalBurns}</span>
            </div>
            <Flame className="w-8 h-8 text-[#FF4400] opacity-80" />
          </div>

          <div className="bg-[#121212] border border-[#242424] p-5 rounded-sm flex items-center justify-between">
            <div>
              <span className="font-mono text-[10px] text-[#888] uppercase tracking-wider block">AVERAGE ATS SCORE</span>
              <span className="font-bebas text-4xl text-[#FF4400] font-bold">{avgScore}<span className="text-xl text-[#666]">/100</span></span>
            </div>
            <TrendingUp className="w-8 h-8 text-yellow-400 opacity-80" />
          </div>

          <div className="bg-[#121212] border border-[#242424] p-5 rounded-sm flex items-center justify-between">
            <div>
              <span className="font-mono text-[10px] text-[#888] uppercase tracking-wider block">BEST SCORE YET</span>
              <span className="font-bebas text-4xl text-emerald-400 font-bold">{bestScore}<span className="text-xl text-[#666]">/100</span></span>
            </div>
            <Award className="w-8 h-8 text-emerald-400 opacity-80" />
          </div>
        </div>
      )}

      {error && (
        <div role="alert" className="bg-[#2A0E0E] border border-red-500/50 text-red-300 font-mono text-xs px-4 py-3 rounded-sm flex items-center justify-between gap-4">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => { setError(null); loadHistory(); }}
            className="underline hover:text-red-200 cursor-pointer shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-[#FF4400] animate-spin mb-4" />
          <p className="font-mono text-xs text-[#777777]">Retrieving your past burns...</p>
        </div>
      ) : history.length === 0 ? (
        /* Empty State */
        <div className="bg-[#101010] border border-[#242424] p-16 md:p-24 rounded-sm text-center flex flex-col items-center justify-center min-h-[350px]">
          <Flame className="w-10 h-10 text-[#444444] mb-4 stroke-1" />
          <h3 className="font-bebas text-3xl md:text-4xl text-white tracking-wider mb-2">
            NOTHING BURNED YET
          </h3>
          <p className="font-mono text-xs md:text-sm text-[#777777]">
            Upload a resume and let the disrespect begin.
          </p>
          <p className="font-mono text-[11px] text-[#555555] mt-3 max-w-md">
            Guest roasts are kept for this browser only. Sign in to keep them across devices.
          </p>
        </div>
      ) : (
        /* History Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {history.map((item) => (
            <div
              key={item.id}
              onClick={() => handleViewRoast(item.id)}
              className="bg-[#121212] border border-[#262626] hover:border-[#FF4400]/60 p-6 rounded-sm transition-all duration-200 cursor-pointer group flex flex-col justify-between hover:shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
            >
              <div>
                <div className="flex items-center justify-between border-b border-[#202020] pb-3 mb-4">
                  <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 bg-[#1C1C1C] text-[#FF4400] border border-[#2F2F2F] rounded">
                    {item.intensity} ROAST
                  </span>
                  <span className="font-mono text-[11px] text-[#777777]">
                    {item.created_at}
                  </span>
                </div>

                <div className="flex items-baseline gap-2 mb-3">
                  <span className="font-bebas text-5xl text-[#FF4400] font-bold leading-none">
                    {item.ats_score}
                  </span>
                  <span className="font-bebas text-2xl text-[#666666]">/100</span>
                  <span className="font-mono text-[10px] text-[#888888] uppercase tracking-wider ml-auto">
                    {item.file_name}
                  </span>
                </div>

                <p className="font-mono text-xs text-[#C0C0C0] line-clamp-3 italic mb-4">
                  &ldquo;{item.overall_verdict}&rdquo;
                </p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[#1C1C1C]">
                <span className="font-mono text-xs text-[#FF4400] group-hover:underline flex items-center gap-1">
                  {fetchingId === item.id ? 'Loading...' : 'View Full Roast'} <ArrowRight className="w-3.5 h-3.5" />
                </span>

                <button
                  type="button"
                  onClick={(e) => handleDelete(e, item.id)}
                  disabled={deletingId === item.id}
                  aria-label={`Delete the roast of ${item.file_name}`}
                  className="text-[#666666] hover:text-red-400 p-1.5 rounded transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Delete from Burn Book"
                >
                  {deletingId === item.id
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

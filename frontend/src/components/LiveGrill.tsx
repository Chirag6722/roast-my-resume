import React, { useState, useEffect } from 'react';
import { Flame, FileText, ArrowRight } from 'lucide-react';
import { API_BASE_URL } from '../services/api';

interface RealLiveRoastItem {
  id: string;
  quote: string;
  /** Format only. The server deliberately never sends the filename. */
  file_kind: string;
  intensity: string;
  ats_score: number;
}

interface LiveGrillProps {
  onStartRoast?: () => void;
}

export const LiveGrill: React.FC<LiveGrillProps> = ({ onStartRoast }) => {
  const [feed, setFeed] = useState<RealLiveRoastItem[]>([]);
  const [totalBurned, setTotalBurned] = useState(0);
  const [unreachable, setUnreachable] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/live-feed`);
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        if (cancelled) return;
        setFeed(data.items ?? []);
        setTotalBurned(data.total_burned ?? 0);
        setUnreachable(false);
      } catch {
        // Say the server is unreachable rather than showing an empty grill,
        // which reads as "nobody has ever used this".
        if (!cancelled) setUnreachable(true);
      }
    };

    load();
    // Every 3 seconds was 1,200 requests an hour per open tab. Poll gently, and
    // not at all while the tab is in the background.
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, 20000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') load();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return (
    <div className="bg-[#121212] border border-[#242424] p-6 md:p-8 rounded-sm shadow-[0_10px_30px_rgba(0,0,0,0.5)] relative overflow-hidden backdrop-blur-sm">
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF4400]/5 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#222222] pb-4 mb-6">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-[#FF4400]" />
          <span className="font-mono text-xs md:text-sm tracking-widest text-white font-bold uppercase">
            LIVE FROM THE GRILL
          </span>
        </div>

        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1A1A1A] border border-[#2E2E2E] text-[#FF4400] text-[10px] font-mono font-bold tracking-wider">
            {totalBurned} {totalBurned === 1 ? 'RESUME BURNED' : 'RESUMES BURNED'}
          </span>
        </div>
      </div>

      {/* Real Feed Content */}
      {feed.length === 0 ? (
        /* Honest Real Zero State */
        <div className="py-8 text-center space-y-3">
          <div className="w-10 h-10 mx-auto rounded-full bg-[#181818] border border-[#2E2E2E] flex items-center justify-center">
            <Flame className="w-5 h-5 text-[#555555]" />
          </div>
          <p className="font-mono text-xs text-[#A0A0A0] max-w-xs mx-auto leading-relaxed">
            {unreachable
              ? 'Cannot reach the server, so the grill cannot be shown right now.'
              : 'The grill is currently empty. Upload your resume to ignite the first live burn!'}
          </p>
          {onStartRoast && (
            <button
              onClick={onStartRoast}
              className="inline-flex items-center gap-1.5 font-mono text-xs text-[#FF4400] hover:underline font-bold pt-2 cursor-pointer"
            >
              <span>Be the first to roast</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ) : (
        /* Real Roasts From Database */
        <div className="space-y-4 max-h-[340px] overflow-y-auto pr-1">
          {feed.map((item) => (
            <div
              key={item.id}
              className="border-l-2 border-[#FF4400] pl-4 py-1.5 transition-all duration-300 hover:border-white hover:translate-x-1"
            >
              <div className="flex items-center justify-between font-mono text-[10px] text-[#777777] mb-1">
                <span className="text-[#999999] flex items-center gap-1">
                  <FileText className="w-3 h-3 text-[#FF4400]" />
                  {item.file_kind}
                </span>
                <span className="text-[#FF4400] font-bold">
                  {item.ats_score}/100 ATS
                </span>
              </div>

              <p className="font-mono text-xs text-[#D8D8D8] leading-relaxed italic">
                &ldquo;{item.quote}&rdquo;
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Footer Info */}
      <div className="mt-4 pt-3 border-t border-[#1C1C1C] flex items-center justify-between font-mono text-[10px] text-[#666]">
        <span>{unreachable ? 'Disconnected' : 'Live from the database'}</span>
        <span>{feed.length} shown of {totalBurned}</span>
      </div>
    </div>
  );
};

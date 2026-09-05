import React, { useRef, useState } from 'react';
import { Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import type { RoastResult } from '../types';

interface ThermalReceiptCardProps {
  roast: RoastResult;
}

export const ThermalReceiptCard: React.FC<ThermalReceiptCardProps> = ({ roast }) => {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleDownload = async () => {
    if (!receiptRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(receiptRef.current, {
        backgroundColor: '#111111',
        scale: 2.5,
        useCORS: true,
      });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `Resume-Receipt-Verdict-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  const ats = roast.ats_analysis;

  // Deductions come from the real sub-scores, so the slip actually adds up to the
  // score printed at the bottom. Each category is out of 25.
  const deductions = [
    { label: 'Formatting & layout', points: 25 - ats.formatting_score },
    { label: 'Keyword match', points: 25 - ats.keyword_score },
    { label: 'Measurable impact', points: 25 - ats.impact_score },
    { label: 'Brevity & density', points: 25 - ats.brevity_score },
  ].filter(d => d.points > 0);

  const subtotal = 100 - deductions.reduce((sum, d) => sum + d.points, 0);
  // Intensity penalty and the score floor are applied after the rubric, so show them.
  const adjustment = subtotal - ats.total_score;

  return (
    <div className="space-y-6 flex flex-col items-center">
      <div className="text-center space-y-1">
        <span className="font-mono text-xs uppercase tracking-widest text-[#FF4400] font-bold">
          VIRAL RECEIPT MODE
        </span>
        <p className="text-xs text-[#888888] font-mono">
          Itemized deduction slip of everything wrong with your application.
        </p>
      </div>

      {/* The Printable Thermal Receipt Slip */}
      <div
        ref={receiptRef}
        className="w-full max-w-sm bg-[#F5F5F0] text-[#1A1A1A] p-6 sm:p-8 font-mono text-xs shadow-[0_20px_50px_rgba(0,0,0,0.8)] border-t-8 border-dashed border-[#DDD] relative select-none"
        style={{
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          backgroundImage: 'radial-gradient(#E8E8E0 10%, transparent 11%)',
          backgroundSize: '10px 10px'
        }}
      >
        {/* Receipt Header */}
        <div className="text-center space-y-1 border-b-2 border-dashed border-[#888] pb-4 mb-4">
          <h3 className="font-black text-lg tracking-wider">ROASTMYRESUME</h3>
          <p className="text-[10px] text-[#555]">DEPARTMENT OF REJECTION & PAIN</p>
          <p className="text-[10px] text-[#777]">{roast.created_at}</p>
          <p className="text-[10px] text-[#777]">CANDIDATE: {roast.shareable_card.candidate_alias}</p>
        </div>

        {/* Itemized Deductions */}
        <div className="space-y-2 mb-4">
          <div className="flex justify-between font-bold border-b border-[#CCC] pb-1 text-[11px]">
            <span>INFRACTION</span>
            <span>PENALTY</span>
          </div>

          <div className="flex justify-between">
            <span className="truncate pr-2">Base Potential Score</span>
            <span>100 PTS</span>
          </div>

          {deductions.map((d) => (
            <div key={d.label} className="flex justify-between text-red-700">
              <span className="truncate pr-2 text-[10px]">⚠️ {d.label}</span>
              <span>-{d.points} PTS</span>
            </div>
          ))}

          {adjustment !== 0 && (
            <div className="flex justify-between text-red-700">
              <span className="truncate pr-2 text-[10px]">
                ⚠️ {adjustment > 0 ? 'Nuclear intensity surcharge' : 'Minimum score adjustment'}
              </span>
              <span>{adjustment > 0 ? `-${adjustment}` : `+${-adjustment}`} PTS</span>
            </div>
          )}
        </div>

        {/* The roast's own findings, listed as notes rather than fake arithmetic. */}
        {ats.red_flags.length > 0 && (
          <div className="border-t border-dashed border-[#BBB] pt-3 mb-4 space-y-1">
            <p className="text-[10px] font-bold text-[#555]">NOTED INFRACTIONS</p>
            {ats.red_flags.slice(0, 4).map((flag, idx) => (
              <p key={idx} className="text-[9px] leading-snug text-[#444]">• {flag}</p>
            ))}
          </div>
        )}

        {/* Total calculation */}
        <div className="border-t-2 border-dashed border-[#888] pt-3 pb-3 space-y-1.5 font-bold">
          <div className="flex justify-between text-sm">
            <span>FINAL ATS SCORE:</span>
            <span className="text-[#D32F2F] text-base">{ats.total_score} / 100</span>
          </div>
          <div className="flex justify-between text-[11px] text-[#555]">
            <span>SEVERITY LEVEL:</span>
            <span>{roast.intensity.toUpperCase()}</span>
          </div>
        </div>

        {/* Punchline */}
        <div className="bg-[#EBEBE0] p-2.5 my-3 border-l-2 border-[#1A1A1A] italic text-[11px] leading-snug">
          &ldquo;{roast.overall_verdict}&rdquo;
        </div>

        {/* Barcode & Footer */}
        <div className="text-center pt-3 border-t border-[#CCC] space-y-2">
          {/* Simulated Barcode */}
          <div className="h-8 flex justify-center items-stretch gap-1 px-4 opacity-80">
            {[4, 2, 6, 1, 5, 2, 4, 1, 7, 3, 2, 5, 1, 4, 2, 6, 3, 2, 5, 1, 4].map((w, i) => (
              <div key={i} className="bg-black" style={{ width: `${w}px` }} />
            ))}
          </div>
          <p className="text-[9px] tracking-widest text-[#666]">#REJECTED-AUTOMATICALLY-BY-ATS</p>
          <p className="text-[10px] font-bold uppercase text-[#333]">THANK YOU FOR APPLYING. WE WILL NOT BE IN TOUCH.</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleDownload}
          disabled={isExporting}
          className="inline-flex items-center gap-2 bg-[#FF4400] hover:bg-[#E63D00] text-white px-5 py-2.5 rounded font-mono text-xs font-bold transition cursor-pointer shadow-[0_0_15px_rgba(255,68,0,0.3)]"
        >
          <Download className="w-4 h-4" />
          {isExporting ? 'EXPORTING...' : 'DOWNLOAD RECEIPT (PNG)'}
        </button>
      </div>
    </div>
  );
};

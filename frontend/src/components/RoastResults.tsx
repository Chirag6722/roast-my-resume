import React, { useState } from 'react';
import { Flame, AlertTriangle, CheckCircle2, Copy, Check, Sparkles, ChevronDown, ChevronUp, SplitSquareVertical } from 'lucide-react';
import type { RoastResult } from '../types';

interface RoastResultsProps {
  result: RoastResult;
}

export const RoastResults: React.FC<RoastResultsProps> = ({ result }) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'standard' | 'diff'>('diff');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    '0': true,
    '1': true,
    '2': true,
    '3': true,
  });

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(id);
    } catch (err) {
      // Saying "COPIED" when the clipboard refused is worse than saying nothing.
      console.warn('Clipboard write blocked', err);
      setCopyError(id);
    }
    setTimeout(() => { setCopiedSection(null); setCopyError(null); }, 2500);
  };

  const ats = result.ats_analysis;

  const getScoreGrade = (score: number) => {
    if (score >= 80) return { grade: 'A', label: 'RECRUITER MAGNET', color: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10' };
    if (score >= 65) return { grade: 'B', label: 'NEEDS POLISH', color: 'text-yellow-400 border-yellow-500/40 bg-yellow-500/10' };
    if (score >= 50) return { grade: 'C', label: 'SCRAPES THROUGH', color: 'text-amber-400 border-amber-500/40 bg-amber-500/10' };
    if (score >= 35) return { grade: 'D', label: 'ATS PURGE ZONE', color: 'text-orange-400 border-orange-500/40 bg-orange-500/10' };
    return { grade: 'F', label: 'BIOLOGICAL HAZARD', color: 'text-red-500 border-red-500/40 bg-red-500/10' };
  };

  const scoreGrade = getScoreGrade(ats.total_score);

  const severityStyle = (severity: string) => {
    if (severity === 'critical') return 'bg-red-500/10 text-red-400 border-red-500/40';
    if (severity === 'danger') return 'bg-[#FF4400]/10 text-[#FF4400] border-[#FF4400]/30';
    return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/40';
  };

  return (
    <div className="space-y-12">
      {/* 1. Main Savage Commentary Header */}
      <div className="bg-[#121212] border border-[#262626] p-6 md:p-10 rounded-sm relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-[#FF4400] animate-bounce" />
            <span className="font-mono text-xs uppercase tracking-widest text-[#FF4400] font-bold">
              {result.headline_roast}
            </span>
          </div>

          <div className={`px-3 py-1 rounded border font-mono text-xs font-bold uppercase tracking-wider ${scoreGrade.color}`}>
            GRADE {scoreGrade.grade} • {scoreGrade.label}
          </div>
        </div>

        <h2 className="font-bebas text-3xl sm:text-4xl md:text-5xl text-white tracking-wide mb-6 leading-tight">
          &ldquo;{result.overall_verdict}&rdquo;
        </h2>

        <div className="space-y-4 border-t border-[#222222] pt-6">
          {result.savage_paragraphs.map((p, idx) => (
            <p key={idx} className="text-[#C0C0C0] text-sm md:text-base leading-relaxed">
              {p}
            </p>
          ))}
        </div>
      </div>

      {/* 2. ATS Score & Robot Analysis Breakdown */}
      <div className="bg-[#121212] border border-[#262626] p-6 md:p-8 rounded-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#222222] pb-6 mb-8 gap-4">
          <div>
            <span className="font-mono text-xs uppercase tracking-widest text-[#888888] font-semibold block mb-1">
              ATS PARSER BENCHMARK
            </span>
            <h3 className="font-bebas text-2xl md:text-3xl text-white tracking-wider">
              AUTOMATED SCREENING SCORE
            </h3>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="font-bebas text-6xl md:text-7xl text-[#FF4400] font-bold leading-none">
              {ats.total_score}
            </span>
            <span className="font-bebas text-3xl text-[#666666]">/100</span>
          </div>
        </div>

        {/* 4 Core Pillars Breakdown */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <ScorePillar label="Formatting & Layout" score={ats.formatting_score} max={25} />
          <ScorePillar label="Keyword Match" score={ats.keyword_score} max={25} />
          <ScorePillar label="Measurable Impact" score={ats.impact_score} max={25} />
          <ScorePillar label="Brevity & Density" score={ats.brevity_score} max={25} />
        </div>

        {/* Red Flags & Missing Keywords */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-[#202020]">
          {/* Red Flags */}
          <div>
            <h4 className="font-mono text-xs uppercase tracking-wider text-red-400 font-bold mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              Critical Red Flags Detected
            </h4>
            <ul className="space-y-2">
              {ats.red_flags.map((flag, idx) => (
                <li key={idx} className="font-mono text-xs text-[#B5B5B5] flex items-start gap-2 bg-[#171717] p-2.5 rounded-sm border border-[#262626]">
                  <span className="text-red-500 font-bold">•</span>
                  <span>{flag}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* What the resume already gets right. The engine works this out from the
              real text, and until now none of it was ever shown to the candidate. */}
          <div>
            <h4 className="font-mono text-xs uppercase tracking-wider text-emerald-400 font-bold mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              What Already Works
            </h4>
            <ul className="space-y-2">
              {ats.green_flags.map((flag, idx) => (
                <li
                  key={idx}
                  className="font-mono text-xs text-[#B5B5B5] flex items-start gap-2 bg-[#101610] p-2.5 rounded-sm border border-emerald-950/70"
                >
                  <span className="text-emerald-500 font-bold">✓</span>
                  <span>{flag}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Detected keywords: proof the parser saw real tools, not just adjectives. */}
          {ats.detected_keywords.length > 0 && (
            <div>
              <h4 className="font-mono text-xs uppercase tracking-wider text-[#9AD1B0] font-bold mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#9AD1B0]" />
                Keywords Found In Your Resume
              </h4>
              <div className="flex flex-wrap gap-2">
                {ats.detected_keywords.map((kw, idx) => (
                  <span
                    key={idx}
                    className="font-mono text-xs px-2.5 py-1.5 bg-[#101610] border border-emerald-900/70 text-[#CFE8D8] rounded-sm"
                  >
                    ✓ {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Missing Keywords */}
          <div>
            <h4 className="font-mono text-xs uppercase tracking-wider text-[#FF7B00] font-bold mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#FF7B00]" />
              Keywords ATS Expects To See
            </h4>
            <div className="flex flex-wrap gap-2">
              {ats.missing_keywords.map((kw, idx) => (
                <span
                  key={idx}
                  className="font-mono text-xs px-2.5 py-1.5 bg-[#171717] border border-[#2B2B2B] text-[#E0E0E0] rounded-sm hover:border-[#FF4400] transition-colors"
                >
                  + {kw}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Section-by-Section Critiques & Improvements */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h3 className="font-bebas text-3xl md:text-4xl text-white tracking-wide">
            SECTION-BY-SECTION AUTOPSY & DIFF
          </h3>

          <div className="flex items-center gap-2 bg-[#141414] p-1 border border-[#262626] rounded">
            <button
              onClick={() => setViewMode('diff')}
              className={`font-mono text-xs px-3 py-1.5 rounded transition cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'diff' ? 'bg-[#FF4400] text-white font-bold' : 'text-[#888] hover:text-white'
              }`}
            >
              <SplitSquareVertical className="w-3.5 h-3.5" />
              Side-by-Side Diff
            </button>
            <button
              onClick={() => setViewMode('standard')}
              className={`font-mono text-xs px-3 py-1.5 rounded transition cursor-pointer ${
                viewMode === 'standard' ? 'bg-[#222222] text-[#FF4400] font-bold' : 'text-[#888] hover:text-white'
              }`}
            >
              List View
            </button>
          </div>
        </div>

        <div className="space-y-5">
          {result.section_critiques.map((sec, idx) => {
            const isExpanded = !!expandedSections[String(idx)];
            return (
              <div
                key={idx}
                className="bg-[#121212] border border-[#242424] rounded-sm overflow-hidden transition-all"
              >
                {/* Accordion Header */}
                <button
                  type="button"
                  aria-expanded={isExpanded}
                  onClick={() => toggleSection(String(idx))}
                  className="w-full flex items-center justify-between p-5 md:p-6 text-left hover:bg-[#161616] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FF4400]" />
                    <span className="font-bebas text-xl md:text-2xl text-white tracking-wider">
                      {sec.section_name}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`font-mono text-[10px] uppercase px-2 py-0.5 border rounded ${severityStyle(sec.severity)}`}>
                      {sec.severity}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-[#888888]" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-[#888888]" />
                    )}
                  </div>
                </button>

                {/* Body */}
                {isExpanded && (
                  <div className="p-5 md:p-6 border-t border-[#202020] space-y-6 bg-[#0F0F0F]">
                    {/* The Burn */}
                    <div className="border-l-2 border-[#FF4400] pl-4 py-1">
                      <span className="font-mono text-[10px] uppercase tracking-widest text-[#FF4400] font-bold block mb-1">
                        THE ROAST
                      </span>
                      <p className="font-mono text-xs md:text-sm text-[#E0E0E0] italic leading-relaxed">
                        {sec.burn}
                      </p>
                    </div>

                    {/* How to Fix */}
                    <div className="bg-[#161616] p-4 rounded-sm border border-[#262626]">
                      <span className="font-mono text-[10px] uppercase tracking-widest text-[#999999] font-bold block mb-1">
                        ACTIONABLE FIX FORMULA
                      </span>
                      <p className="text-xs md:text-sm text-[#BBBBBB]">
                        {sec.fix_advice}
                      </p>
                    </div>

                    {/* Side-by-Side Diff or Standard */}
                    {viewMode === 'diff' && sec.original_snippet ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Original (Red Strike) */}
                        <div className="bg-[#140808] border border-red-950/60 p-4 rounded-sm">
                          <span className="font-mono text-[10px] uppercase tracking-widest text-red-400 font-bold block mb-2">
                            ❌ BEFORE (THE CRIME)
                          </span>
                          <p className="font-mono text-xs text-[#C58080] line-through decoration-red-500/80 leading-relaxed whitespace-pre-wrap">
                            {sec.original_snippet}
                          </p>
                        </div>

                        {/* Rewrite (Green Highlight) */}
                        <div className="bg-[#08140D] border border-emerald-950/60 p-4 rounded-sm relative">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-mono text-[10px] uppercase tracking-widest text-emerald-400 font-bold block">
                              ✓ AFTER (HIGH IMPACT REWRITE)
                            </span>
                            <button
                              onClick={() => handleCopy(sec.rewritten_content, String(idx))}
                              className="font-mono text-[10px] text-[#A0A0A0] hover:text-white flex items-center gap-1 cursor-pointer bg-[#102418] px-2 py-1 rounded"
                            >
                              {copiedSection === String(idx) ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                              {copyError === String(idx) ? 'COPY FAILED' : copiedSection === String(idx) ? 'COPIED' : 'COPY'}
                            </button>
                          </div>
                          <pre className="font-mono text-xs text-emerald-100 whitespace-pre-wrap leading-relaxed">
                            {sec.rewritten_content}
                          </pre>
                        </div>
                      </div>
                    ) : (
                      /* Standard Rewritten Replacement */
                      <div className="bg-[#0A0A0A] p-4 rounded-sm border border-[#2E2E2E] relative">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono text-[10px] uppercase tracking-widest text-emerald-400 font-bold flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            POLISHED REWRITE
                          </span>
                          <button
                            onClick={() => handleCopy(sec.rewritten_content, String(idx))}
                            className="font-mono text-[11px] text-[#A0A0A0] hover:text-white flex items-center gap-1 cursor-pointer bg-[#1A1A1A] px-2 py-1 rounded"
                          >
                            {copiedSection === String(idx) ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                            {copyError === String(idx) ? 'COPY FAILED' : copiedSection === String(idx) ? 'COPIED' : 'COPY'}
                          </button>
                        </div>
                        <pre className="font-mono text-xs text-[#EAEAEA] whitespace-pre-wrap leading-relaxed">
                          {sec.rewritten_content}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const ScorePillar: React.FC<{ label: string; score: number; max: number }> = ({ label, score, max }) => {
  const percentage = Math.min(100, Math.round((score / max) * 100));
  return (
    <div className="bg-[#171717] p-4 rounded-sm border border-[#242424]">
      <div className="flex justify-between items-baseline mb-2">
        <span className="font-mono text-[11px] text-[#888888]">{label}</span>
        <span className="font-mono text-xs font-bold text-white">
          {score}/{max}
        </span>
      </div>
      <div className="w-full bg-[#222222] h-1.5 rounded-full overflow-hidden">
        <div
          className="bg-[#FF4400] h-full rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

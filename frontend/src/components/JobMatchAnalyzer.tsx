import React, { useMemo, useState } from 'react';
import { Target, CheckCircle2, XCircle } from 'lucide-react';
import { extractRequirements, resumeHas } from '../utils/keywords';

interface JobMatchAnalyzerProps {
  targetJobDescription?: string;
  detectedKeywords: string[];
  missingKeywords: string[];
}

export const JobMatchAnalyzer: React.FC<JobMatchAnalyzerProps> = ({
  targetJobDescription,
  detectedKeywords,
  missingKeywords,
}) => {
  const [jobText, setJobText] = useState(targetJobDescription || '');

  // Recomputed as the user edits the posting, from the posting's own wording.
  const { requirements, matched, missing, matchPercentage } = useMemo(() => {
    const reqs = extractRequirements(jobText);
    const hit = reqs.filter(r => resumeHas(r, detectedKeywords));
    return {
      requirements: reqs,
      matched: hit,
      missing: reqs.filter(r => !hit.includes(r)),
      matchPercentage: reqs.length ? Math.round((hit.length / reqs.length) * 100) : 0,
    };
  }, [jobText, detectedKeywords]);

  const hasPosting = requirements.length > 0;

  return (
    <div className="bg-[#121212] border border-[#262626] rounded-sm p-6 md:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#222222] pb-6 gap-4">
        <div>
          <span className="font-mono text-xs uppercase tracking-widest text-[#FF4400] font-bold flex items-center gap-1.5 mb-1">
            <Target className="w-4 h-4 text-[#FF4400]" />
            JOB DESCRIPTION ALIGNMENT
          </span>
          <h3 className="font-bebas text-3xl md:text-4xl text-white tracking-wide">
            TARGET ROLE MATCH ANALYSIS
          </h3>
        </div>

        {hasPosting && (
          <div className="flex items-baseline gap-2 bg-[#181818] px-4 py-2 rounded border border-[#2B2B2B]">
            <span className="font-mono text-xs text-[#888]">MATCH RATE:</span>
            <span className="font-bebas text-4xl text-[#FF4400] leading-none">
              {matchPercentage}%
            </span>
            <span className="font-mono text-[11px] text-[#777]">
              {matched.length}/{requirements.length}
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Job Description Input */}
        <div className="lg:col-span-6 space-y-2">
          <label className="font-mono text-xs uppercase text-[#888] font-bold block">
            TARGET JOB POSTING
          </label>
          <textarea
            value={jobText}
            onChange={(e) => setJobText(e.target.value)}
            rows={8}
            placeholder="Paste the job posting here. The match updates as you type."
            className="w-full bg-[#0A0A0A] border border-[#242424] focus:border-[#FF4400] p-3 font-mono text-xs text-[#C0C0C0] placeholder-[#555555] rounded-none focus:outline-none leading-relaxed resize-y"
          />
          <p className="font-mono text-[10px] text-[#666]">
            Matched against the skills detected in your resume, not a fixed checklist.
          </p>
        </div>

        {/* Breakdown of Skills */}
        <div className="lg:col-span-6 space-y-4">
          {!hasPosting ? (
            <div className="bg-[#181818] border border-[#282828] rounded p-5 space-y-3">
              <p className="font-mono text-xs text-[#BBB] leading-relaxed">
                {jobText.trim()
                  ? 'No recognisable tools or technologies were found in that posting, so there is nothing concrete to match against.'
                  : 'Paste a job posting on the left to see which of its requirements your resume already proves.'}
              </p>
              {missingKeywords.length > 0 && (
                <div>
                  <span className="font-mono text-[10px] uppercase text-[#888] font-bold block mb-2">
                    MEANWHILE, WHAT THIS RESUME IS MISSING
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {missingKeywords.map((m, i) => (
                      <span key={i} className="font-mono text-xs px-2.5 py-1 bg-[#1F1F1F] border border-[#333] text-[#CCC] rounded">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Matched */}
              <div>
                <span className="font-mono text-xs uppercase text-emerald-400 font-bold flex items-center gap-1.5 mb-2">
                  <CheckCircle2 className="w-4 h-4" />
                  MATCHED QUALIFICATIONS ({matched.length})
                </span>
                {matched.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {matched.map((m, i) => (
                      <span key={i} className="font-mono text-xs px-2.5 py-1 bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 rounded">
                        ✓ {m}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="font-mono text-xs text-[#888]">
                    None. Your resume names none of the tools this posting asks for.
                  </p>
                )}
              </div>

              {/* Missing Gaps */}
              <div>
                <span className="font-mono text-xs uppercase text-red-400 font-bold flex items-center gap-1.5 mb-2">
                  <XCircle className="w-4 h-4" />
                  CRITICAL KEYWORD GAPS ({missing.length})
                </span>
                {missing.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {missing.map((m, i) => (
                      <span key={i} className="font-mono text-xs px-2.5 py-1 bg-red-950/40 border border-red-800/60 text-red-300 rounded">
                        + {m}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="font-mono text-xs text-emerald-400">
                    Nothing missing. Every requirement this posting names appears in your resume.
                  </p>
                )}
              </div>

              <div className="bg-[#181818] p-3 rounded text-[11px] font-mono text-[#AAA] border border-[#282828]">
                {missing.length > 0 ? (
                  <>
                    💡 Work the {missing.length} missing {missing.length === 1 ? 'term' : 'terms'} into your
                    experience bullets wherever you have honestly used them. Keyword screens match on the exact
                    words in the posting.
                  </>
                ) : (
                  <>💡 Keywords are covered. Now make sure each one appears inside a bullet with a result attached, not just in the skills list.</>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

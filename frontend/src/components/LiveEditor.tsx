import React, { useState } from 'react';
import { RefreshCw, CheckCircle2, AlertTriangle, Wand2, TrendingUp, TrendingDown } from 'lucide-react';
import { api } from '../services/api';

interface LiveEditorProps {
  initialText: string;
  originalScore: number;
}

export const LiveEditor: React.FC<LiveEditorProps> = ({ initialText, originalScore }) => {
  const [text, setText] = useState(initialText);
  const [currentScore, setCurrentScore] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string[]>([]);
  const [isScoring, setIsScoring] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Scored by the same server-side rubric as the report card, so the two numbers compare.
  const rescore = async (nextText?: string) => {
    setIsScoring(true);
    setError(null);
    try {
      const result = await api.scoreText(nextText ?? text);
      setCurrentScore(result.total_score);
      setFeedback(result.tips);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not score that text.');
    } finally {
      setIsScoring(false);
    }
  };

  const applyFixes = async () => {
    setIsFixing(true);
    setError(null);
    setNotice(null);
    try {
      const result = await api.scoreText(text);
      if (result.improved_text.trim() === text.trim()) {
        setNotice('No weak bullets left to rewrite. The remaining work is wording and real numbers.');
        setCurrentScore(result.total_score);
        setFeedback(result.tips);
      } else {
        setText(result.improved_text);
        await rescore(result.improved_text);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not rewrite that text.');
    } finally {
      setIsFixing(false);
    }
  };

  const shownScore = currentScore ?? originalScore;
  const delta = currentScore === null ? 0 : currentScore - originalScore;

  return (
    <div className="bg-[#121212] border border-[#262626] rounded-sm p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#222222] pb-6 gap-4">
        <div>
          <span className="font-mono text-xs uppercase tracking-widest text-[#FF4400] font-bold block mb-1">
            REAL-TIME WORKSHOP
          </span>
          <h3 className="font-bebas text-3xl md:text-4xl text-white tracking-wide">
            LIVE RESUME TUNER & RE-SCORER
          </h3>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-[#181818] border border-[#2E2E2E] px-4 py-2 rounded flex items-center gap-2">
            <span className="font-mono text-xs text-[#888]">
              {currentScore === null ? 'ORIGINAL:' : 'LIVE SCORE:'}
            </span>
            <span className={`font-bebas text-3xl leading-none font-bold ${
              shownScore >= 75 ? 'text-emerald-400' : shownScore >= 50 ? 'text-yellow-400' : 'text-[#FF4400]'
            }`}>
              {shownScore}/100
            </span>
            {delta !== 0 && (
              <span className={`font-mono text-xs font-bold flex items-center gap-0.5 ${
                delta > 0 ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {delta > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                {delta > 0 ? '+' : ''}{delta}
              </span>
            )}
          </div>

          <button
            onClick={applyFixes}
            disabled={isFixing || isScoring}
            className="inline-flex items-center gap-1.5 bg-[#1F1F1F] hover:bg-[#282828] border border-[#3A3A3A] hover:border-[#FF4400] text-white px-3.5 py-2.5 rounded font-mono text-xs cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Wand2 className={`w-3.5 h-3.5 text-[#FF4400] ${isFixing ? 'animate-pulse' : ''}`} />
            {isFixing ? 'Rewriting...' : 'Rewrite Weak Bullets'}
          </button>
        </div>
      </div>

      {/* Editor & Feedback side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Editor */}
        <div className="lg:col-span-8 space-y-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={14}
            className="w-full bg-[#0A0A0A] border border-[#2A2A2A] focus:border-[#FF4400] p-4 font-mono text-xs text-[#E0E0E0] rounded-none focus:outline-none leading-relaxed resize-y"
            placeholder="Edit your resume lines here..."
          />
          <button
            onClick={() => rescore()}
            disabled={isScoring || isFixing}
            className="w-full bg-[#FF4400] hover:bg-[#E63D00] text-white py-3 rounded-sm font-bebas text-2xl tracking-wider transition cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(255,68,0,0.3)] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${isScoring ? 'animate-spin' : ''}`} />
            {isScoring ? 'RE-CALCULATING ATS BENCHMARK...' : '⚡ RE-SCORE ATS NOW'}
          </button>
        </div>

        {/* Live Diagnostics */}
        <div className="lg:col-span-4 bg-[#0F0F0F] border border-[#222222] p-5 rounded-sm space-y-4">
          <span className="font-mono text-xs uppercase tracking-widest text-[#888] font-bold block">
            LIVE ATS CRITIQUE
          </span>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 p-3 rounded text-red-300 font-mono text-xs">
              {error}
            </div>
          )}

          {notice && (
            <div className="bg-[#1A1A1A] border border-[#333] p-3 rounded text-[#CCC] font-mono text-xs">
              {notice}
            </div>
          )}

          {currentScore === null ? (
            <p className="font-mono text-xs text-[#777]">
              Edit your text on the left, then hit Re-Score. It uses the same rubric as your report
              card, so the numbers are directly comparable.
            </p>
          ) : feedback.length === 0 ? (
            <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded text-emerald-400 font-mono text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Nothing left flagged on this pass.</span>
            </div>
          ) : (
            <div className="space-y-2">
              {feedback.map((item, idx) => (
                <div key={idx} className="bg-red-500/10 border border-red-500/20 p-2.5 rounded text-[#D88] font-mono text-xs flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-[#202020] pt-3 text-[11px] font-mono text-[#666] space-y-1">
            <p>💡 The rewrite fixes weak openers and leaves [bracketed] gaps. Replace those with your real numbers.</p>
            <p>💡 A placeholder you cannot fill honestly is a bullet worth cutting.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

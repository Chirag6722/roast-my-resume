import React, { useState } from 'react';
import { Flame, Loader2, Sparkles, RefreshCw, Share2, Receipt, Edit3, Target, AlertTriangle } from 'lucide-react';
import { ResumeUploader } from '../components/ResumeUploader';
import { FlameSlider } from '../components/FlameSlider';
import { RoastResults } from '../components/RoastResults';
import { PolishedResume } from '../components/PolishedResume';
import { ShareableCard } from '../components/ShareableCard';
import { ThermalReceiptCard } from '../components/ThermalReceiptCard';
import { LiveEditor } from '../components/LiveEditor';
import { JobMatchAnalyzer } from '../components/JobMatchAnalyzer';
import { VoiceRoastPlayer } from '../components/VoiceRoastPlayer';
import { playFlameIgnite } from '../utils/soundEffects';
import { emberBurst } from '../utils/confetti';
import type { RoastIntensity, RoastResult } from '../types';
import { api } from '../services/api';

interface RoastPageProps {
  initialRoastResult?: RoastResult | null;
  onViewHistory?: () => void;
}

export const RoastPage: React.FC<RoastPageProps> = ({ initialRoastResult }) => {
  const [file, setFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState('');
  const [intensity, setIntensity] = useState<RoastIntensity>('medium');
  const [targetJob, setTargetJob] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [roastResult, setRoastResult] = useState<RoastResult | null>(initialRoastResult || null);
  const [activeTab, setActiveTab] = useState<'roast' | 'editor' | 'jobmatch' | 'rewrite' | 'card' | 'receipt'>('roast');
  const [loadingStep, setLoadingStep] = useState('Igniting the roast engine...');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleRoastSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file && !resumeText.trim()) {
      setSubmitError('Add a resume first: upload a file, paste the text, or load one of the demos.');
      return;
    }
    setSubmitError(null);

    playFlameIgnite();
    setIsLoading(true);
    setLoadingStep('Uploading and parsing resume sections...');

    try {
      const stepTimer1 = setTimeout(() => {
        setLoadingStep('Calculating ATS keyword density & flaws...');
      }, 1000);

      const stepTimer2 = setTimeout(() => {
        setLoadingStep(`Generating ${intensity.toUpperCase()} savage roast commentary...`);
      }, 2000);

      const result = await api.createRoast(file, resumeText, intensity, targetJob);
      
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      
      setRoastResult(result);
      setActiveTab('roast');
      emberBurst();
    } catch (err) {
      // The server explains parse failures precisely; show that, not a generic line.
      setSubmitError(err instanceof Error ? err.message : 'Could not roast that resume. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setRoastResult(null);
    setFile(null);
    setResumeText('');
    setTargetJob('');
  };

  return (
    <div className="py-12 px-6 max-w-7xl mx-auto w-full min-h-[calc(100vh-80px)]">
      {!roastResult ? (
        <div className="space-y-10">
          {/* Header */}
          <div className="text-left space-y-2">
            <h1 className="font-bebas text-6xl sm:text-7xl md:text-8xl text-white font-bold leading-none tracking-tight">
              FEED THE <span className="text-[#FF4400] glow-ember">FIRE</span>
            </h1>
            <p className="text-[#A0A0A0] text-base md:text-lg">
              Drop your resume, choose how much it should hurt, and go.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleRoastSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column (Upload & Job description) */}
            <div className="lg:col-span-7 space-y-6">
              <ResumeUploader
                file={file}
                resumeText={resumeText}
                onFileSelect={setFile}
                onTextChange={setResumeText}
              />

              {/* Target Job Description (Optional) */}
              <div className="bg-[#121212] border border-[#242424] p-6 rounded-sm">
                <label className="font-mono text-xs uppercase tracking-wider text-[#888888] font-semibold block mb-2">
                  TARGET JOB DESCRIPTION (OPTIONAL)
                </label>
                <textarea
                  value={targetJob}
                  onChange={(e) => setTargetJob(e.target.value)}
                  placeholder="Paste the job posting to get a match score and keyword gaps..."
                  rows={4}
                  className="w-full bg-[#0A0A0A] border border-[#222222] p-3.5 font-mono text-xs text-[#D0D0D0] placeholder-[#555555] rounded-none focus:outline-none focus:border-[#FF4400] transition-colors resize-y"
                />
              </div>
            </div>

            {/* Right Column (Intensity Picker & Submit) */}
            <div className="lg:col-span-5 space-y-6 flex flex-col justify-between">
              <FlameSlider
                intensity={intensity}
                onChange={setIntensity}
              />

              <div className="space-y-3">
                {submitError && (
                  <div
                    role="alert"
                    className="flex items-start gap-2 bg-[#2A0E0E] border border-red-500/50 text-red-300 font-mono text-xs px-3 py-2.5 rounded-sm"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{submitError}</span>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#FF4400] hover:bg-[#E63D00] text-white py-4 px-6 rounded-sm font-bebas text-3xl tracking-wider transition-all duration-200 transform hover:scale-[1.01] shadow-[0_0_30px_rgba(255,68,0,0.4)] cursor-pointer flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      <span>BURNING...</span>
                    </>
                  ) : (
                    <>
                      <Flame className="w-6 h-6 fill-white animate-pulse" />
                      <span>ROAST IT</span>
                    </>
                  )}
                </button>

                <p className="font-mono text-center text-xs text-[#666666] tracking-wider uppercase">
                  {isLoading ? loadingStep : 'TAKES ABOUT 10-25 SECONDS.'}
                </p>
              </div>
            </div>
          </form>
        </div>
      ) : (
        /* Results View */
        <div className="space-y-8 animate-fadeIn">
          {/* Top Bar with actions & Voice Player */}
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#222222] pb-6 gap-4">
            <div>
              <span className="font-mono text-xs uppercase tracking-widest text-[#FF4400] font-bold block mb-1">
                VERDICT READY • {roastResult.intensity.toUpperCase()} HEAT
                <span
                  className="ml-2 px-1.5 py-0.5 rounded border border-[#3A3A3A] text-[#8A8A8A] text-[10px] tracking-wider"
                  title="Generated locally by the rule-based engine from your resume's own content. No AI API is used."
                >
                  RULE-BASED ROAST
                </span>
              </span>
              <h1 className="font-bebas text-4xl sm:text-5xl text-white tracking-wide">
                YOUR RESUME REPORT CARD
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <VoiceRoastPlayer
                roastHeadline={roastResult.headline_roast}
                verdict={roastResult.overall_verdict}
                paragraphs={roastResult.savage_paragraphs}
                intensity={roastResult.intensity}
              />

              <button
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 bg-[#171717] hover:bg-[#222222] border border-[#2F2F2F] text-white px-4 py-2 rounded font-mono text-xs cursor-pointer transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                ROAST ANOTHER
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-[#222222] gap-1 overflow-x-auto pb-1">
            <TabButton
              active={activeTab === 'roast'}
              onClick={() => setActiveTab('roast')}
              icon={Flame}
              label="THE ROAST & ATS"
            />
            <TabButton
              active={activeTab === 'editor'}
              onClick={() => setActiveTab('editor')}
              icon={Edit3}
              label="LIVE TUNER"
            />
            <TabButton
              active={activeTab === 'jobmatch'}
              onClick={() => setActiveTab('jobmatch')}
              icon={Target}
              label="JOB MATCH"
            />
            <TabButton
              active={activeTab === 'rewrite'}
              onClick={() => setActiveTab('rewrite')}
              icon={Sparkles}
              label="POLISHED REWRITE"
            />
            <TabButton
              active={activeTab === 'card'}
              onClick={() => setActiveTab('card')}
              icon={Share2}
              label="SHARE CARD"
            />
            <TabButton
              active={activeTab === 'receipt'}
              onClick={() => setActiveTab('receipt')}
              icon={Receipt}
              label="RECEIPT SLIP"
            />
          </div>

          {/* Tab Content */}
          <div className="pt-2">
            {activeTab === 'roast' && <RoastResults result={roastResult} />}
            {activeTab === 'editor' && (
              <LiveEditor
                initialText={roastResult.full_rewritten_resume}
                originalScore={roastResult.ats_analysis.total_score}
              />
            )}
            {activeTab === 'jobmatch' && (
              <JobMatchAnalyzer
                targetJobDescription={roastResult.target_job}
                detectedKeywords={roastResult.ats_analysis.detected_keywords}
                missingKeywords={roastResult.ats_analysis.missing_keywords}
              />
            )}
            {activeTab === 'rewrite' && (
              <PolishedResume
                resumeMarkdown={roastResult.full_rewritten_resume}
                candidateName={roastResult.file_name.replace(/\.[^/.]+$/, "")}
              />
            )}
            {activeTab === 'card' && <ShareableCard cardData={roastResult.shareable_card} />}
            {activeTab === 'receipt' && <ThermalReceiptCard roast={roastResult} />}
          </div>
        </div>
      )}
    </div>
  );
};

const TabButton: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: any;
  label: string;
}> = ({ active, onClick, icon: Icon, label }) => (
  <button
    onClick={onClick}
    className={`font-bebas text-lg md:text-xl px-4 py-2.5 tracking-wider transition-colors cursor-pointer border-b-2 -mb-px flex items-center gap-1.5 whitespace-nowrap ${
      active
        ? 'border-[#FF4400] text-[#FF4400]'
        : 'border-transparent text-[#777777] hover:text-[#CCCCCC]'
    }`}
  >
    <Icon className="w-4 h-4" />
    {label}
  </button>
);

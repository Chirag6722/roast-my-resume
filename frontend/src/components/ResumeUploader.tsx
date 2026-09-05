import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, X, Edit3, Sparkles, AlertTriangle } from 'lucide-react';

interface ResumeUploaderProps {
  file: File | null;
  resumeText: string;
  onFileSelect: (file: File | null) => void;
  onTextChange: (text: string) => void;
}

const SAMPLE_RESUMES = [
  {
    name: "Junior Dev (Buzzword Heavy)",
    text: `JOHNATHAN DOE
Software Engineer | john.doe@email.com | 555-0199 | San Francisco, CA

SUMMARY
Hardworking, highly self-motivated and results-driven team player with strong passion for synergizing cross-functional deliverables. Looking for an entry level opportunity to leverage out-of-the-box strategic thinking.

SKILLS
Microsoft Word, Microsoft Excel, PowerPoint, Communication, Problem Solving, HTML, Python, Git, Leadership, Multitasking

EXPERIENCE
Software Intern — TechCorp Solutions (2024 - 2025)
- Responsible for writing code and attending daily standup meetings.
- Assisted senior team members with various technical assignments.
- Helped maintain documentation in Google Docs.
- Participated in brainstorming sessions and demonstrated great attitude.

Customer Support Associate — RetailMart (2022 - 2023)
- Answered customer phone calls and responded to tickets.
- Worked hard to ensure high customer satisfaction.

EDUCATION
B.S. in Computer Science — State University (2020 - 2024)
GPA: 3.4/4.0`
  },
  {
    name: "Corporate VP (Zero Numbers)",
    text: `ELEANOR VANCE
Vice President of Strategic Growth | eleanor.vance@globalcorp.com

PROFILE
Visionary executive leadership expert with proven track record in orchestrating paradigm-shifting initiatives. Master of thought leadership, strategic synergy, and stakeholder alignment.

EXPERIENCE
VP of Innovation & Strategy — Global Enterprise Inc (2021 - Present)
- Spearheaded company-wide ideological transformation across multiple business units.
- Facilitated high-level executive discussions regarding holistic organizational synergy.
- Championed cross-departmental alignment and dynamic workflow optimization.
- Empowered teams to achieve unprecedented milestones and elevated brand prestige.

Senior Strategy Director — Apex Capital (2018 - 2021)
- Managed diverse portfolios of strategic initiatives.
- Pioneered forward-thinking methodologies to maximize stakeholder satisfaction.

EDUCATION
MBA — Prestige Business School (2016 - 2018)`
  }
];

export const ResumeUploader: React.FC<ResumeUploaderProps> = ({
  file,
  resumeText,
  onFileSelect,
  onTextChange,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [mode, setMode] = useState<'upload' | 'paste'>('upload');
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // dragenter/dragleave also fire when the pointer crosses child elements, which
  // made the highlight flicker. Counting enters and leaves keeps it steady.
  const dragDepth = useRef(0);

  const MAX_BYTES = 5 * 1024 * 1024;
  const ACCEPTED = ['.pdf', '.docx', '.txt', '.md'];

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragDepth.current += 1;
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragDepth.current = 0;
    setIsDragging(false);
    const dropped = Array.from(e.dataTransfer.files ?? []);
    if (!dropped.length) return;
    if (dropped.length > 1) {
      setFileError(`Only one resume at a time. Using "${dropped[0].name}".`);
    }
    acceptFile(dropped[0], dropped.length > 1);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) acceptFile(selected);
    // Reset so choosing the same file again still fires a change event.
    e.target.value = '';
  };

  const acceptFile = (f: File, keepExistingMessage = false) => {
    const problem = validateFile(f);
    if (problem) {
      setFileError(problem);
      return;
    }
    if (!keepExistingMessage) setFileError(null);
    onFileSelect(f);
  };

  /** Returns a human explanation, or null when the file is usable. */
  const validateFile = (f: File): string | null => {
    const name = f.name.toLowerCase();
    if (name.endsWith('.doc')) {
      // python-docx cannot read the legacy OLE format, so promising it is a lie.
      return 'Legacy .doc files cannot be read. Save it as .docx or PDF and try again.';
    }
    if (!ACCEPTED.some(ext => name.endsWith(ext))) {
      return `That file type is not supported. Use a PDF, DOCX or TXT file.`;
    }
    if (f.size === 0) {
      return 'That file is empty.';
    }
    if (f.size > MAX_BYTES) {
      return `That file is ${(f.size / 1024 / 1024).toFixed(1)}MB. The limit is 5MB.`;
    }
    return null;
  };

  const loadSample = (sampleText: string) => {
    setFileError(null);
    onFileSelect(null);
    onTextChange(sampleText);
    setMode('paste');
  };

  return (
    <div className="w-full space-y-3">
      {/* Tab toggle and Quick Samples */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-[#777777] uppercase tracking-wider font-semibold">
            TRY DEMO:
          </span>
          {SAMPLE_RESUMES.map((sample, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => loadSample(sample.text)}
              className="font-mono text-[10px] px-2 py-1 bg-[#1A1A1A] hover:bg-[#252525] border border-[#2E2E2E] hover:border-[#FF4400] text-[#D0D0D0] hover:text-[#FF4400] rounded transition-all cursor-pointer flex items-center gap-1"
            >
              <Sparkles className="w-2.5 h-2.5 text-[#FF4400]" />
              {sample.name.split(' ')[0]} Demo
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMode('upload')}
            className={`font-mono text-xs uppercase px-2.5 py-1 rounded transition-colors cursor-pointer flex items-center gap-1.5 ${
              mode === 'upload' ? 'bg-[#222222] text-[#FF4400]' : 'text-[#666666] hover:text-white'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            Upload File
          </button>
          <button
            type="button"
            onClick={() => setMode('paste')}
            className={`font-mono text-xs uppercase px-2.5 py-1 rounded transition-colors cursor-pointer flex items-center gap-1.5 ${
              mode === 'paste' ? 'bg-[#222222] text-[#FF4400]' : 'text-[#666666] hover:text-white'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            Paste Text
          </button>
        </div>
      </div>

      {mode === 'upload' ? (
        <div
          role="button"
          tabIndex={file ? -1 : 0}
          aria-label="Upload your resume. PDF, DOCX or TXT, up to 5MB."
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onKeyDown={(e) => {
            if (!file && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onClick={() => !file && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-sm p-8 md:p-12 text-center transition-all duration-200 cursor-pointer relative min-h-[220px] flex flex-col items-center justify-center ${
            isDragging
              ? 'border-[#FF4400] bg-[#FF4400]/10 scale-[1.01]'
              : file
              ? 'border-[#333333] bg-[#121212]'
              : 'border-[#282828] bg-[#101010] hover:border-[#444444] hover:bg-[#141414]'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt,.md"
            className="hidden"
            onChange={handleFileChange}
          />

          {file ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#FF4400]/10 border border-[#FF4400]/40 flex items-center justify-center">
                <FileText className="w-6 h-6 text-[#FF4400]" />
              </div>
              <div className="text-center">
                <p className="font-mono text-sm text-white font-medium break-all max-w-xs md:max-w-md">
                  {file.name}
                </p>
                <p className="font-mono text-xs text-[#777777] mt-1">
                  {(file.size / 1024).toFixed(1)} KB • Ready to burn
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onFileSelect(null);
                  setFileError(null);
                }}
                className="mt-2 text-xs font-mono text-red-400 hover:text-red-300 flex items-center gap-1 bg-[#1A1A1A] px-3 py-1 rounded border border-[#2D2D2D]"
              >
                <X className="w-3.5 h-3.5" /> Remove file
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <UploadCloud className="w-10 h-10 text-[#666666] group-hover:text-white transition-colors" />
              <h3 className="font-bebas text-3xl md:text-4xl text-white tracking-wider">
                DROP YOUR RESUME
              </h3>
              <p className="font-mono text-xs text-[#777777] tracking-widest uppercase">
                PDF • DOCX • TXT • MAX 5MB
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-[#101010] border border-[#282828] p-4 rounded-sm">
          <textarea
            value={resumeText}
            onChange={(e) => onTextChange(e.target.value)}
            placeholder="Paste your raw resume text here... Every tragic bullet point and buzzword."
            rows={8}
            className="w-full bg-[#0A0A0A] border border-[#222222] p-4 font-mono text-xs text-[#D0D0D0] placeholder-[#555555] rounded-none focus:outline-none focus:border-[#FF4400] transition-colors resize-y"
          />
          <div className="flex items-center justify-between text-[#666666] font-mono text-[10px] mt-2">
            <span>{resumeText.split(/\s+/).filter(Boolean).length} words detected</span>
            {resumeText && (
              <button
                type="button"
                onClick={() => onTextChange('')}
                className="text-red-400 hover:underline"
              >
                Clear Text
              </button>
            )}
          </div>
        </div>
      )}

      {fileError && (
        <div
          role="alert"
          className="flex items-start gap-2 bg-[#2A0E0E] border border-red-500/50 text-red-300 font-mono text-xs px-3 py-2.5 rounded-sm"
        >
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{fileError}</span>
        </div>
      )}
    </div>
  );
};

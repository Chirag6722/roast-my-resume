import React, { useMemo, useState } from 'react';
import { Download, Copy, Check, FileText, CheckCircle2, Printer, Eye, Code } from 'lucide-react';
import { markdownToHtml, parseMarkdown, parseInline } from '../utils/markdown';

/** Renders bold and links inside one line of Markdown. */
const Inline: React.FC<{ text: string }> = ({ text }) => (
  <>
    {parseInline(text).map((span, i) => {
      if (span.kind === 'bold') return <strong key={i}>{span.text}</strong>;
      if (span.kind === 'link') {
        const safe = /^(https?:|mailto:)/i.test(span.href) ? span.href : undefined;
        return safe ? (
          <a key={i} href={safe} target="_blank" rel="noopener noreferrer" className="underline">
            {span.text}
          </a>
        ) : (
          <span key={i}>{span.text}</span>
        );
      }
      return <span key={i}>{span.text}</span>;
    })}
  </>
);

interface PolishedResumeProps {
  resumeMarkdown: string;
  candidateName?: string;
}

export const PolishedResume: React.FC<PolishedResumeProps> = ({
  resumeMarkdown,
  candidateName = 'Polished_Resume',
}) => {
  const [copied, setCopied] = useState(false);
  const [viewStyle, setViewStyle] = useState<'preview' | 'raw'>('preview');
  const blocks = useMemo(() => parseMarkdown(resumeMarkdown), [resumeMarkdown]);

  const handleCopy = () => {
    navigator.clipboard.writeText(resumeMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>${candidateName} - Resume</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #111; line-height: 1.5; font-size: 13px; max-width: 800px; margin: 0 auto; }
            h1 { font-size: 22px; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #333; padding-bottom: 6px; }
            h2 { font-size: 14px; text-transform: uppercase; border-bottom: 1px solid #ccc; padding-bottom: 3px; margin-top: 18px; margin-bottom: 8px; color: #333; letter-spacing: 0.5px; }
            h3 { font-size: 13px; margin-top: 12px; margin-bottom: 2px; font-weight: bold; }
            p, ul { margin-top: 4px; margin-bottom: 6px; }
            ul { padding-left: 20px; }
            li { margin-bottom: 3px; }
            hr { border: none; border-top: 1px solid #ddd; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div id="content">
            ${markdownToHtml(resumeMarkdown)}
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadTxt = () => {
    const blob = new Blob([resumeMarkdown], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${candidateName.replace(/\s+/g, '_')}_Rewritten.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadMd = () => {
    const blob = new Blob([resumeMarkdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${candidateName.replace(/\s+/g, '_')}_Rewritten.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-[#121212] border border-[#262626] rounded-sm p-6 md:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#222222] pb-6 gap-4">
        <div>
          <span className="font-mono text-xs uppercase tracking-widest text-emerald-400 font-bold flex items-center gap-1.5 mb-1">
            <CheckCircle2 className="w-4 h-4" />
            READY TO SEND
          </span>
          <h3 className="font-bebas text-3xl md:text-4xl text-white tracking-wide">
            POLISHED REWRITE
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Toggle View */}
          <div className="flex items-center bg-[#1A1A1A] p-1 border border-[#333] rounded mr-2">
            <button
              onClick={() => setViewStyle('preview')}
              className={`font-mono text-xs px-2.5 py-1 rounded transition flex items-center gap-1 cursor-pointer ${
                viewStyle === 'preview' ? 'bg-[#FF4400] text-white font-bold' : 'text-[#888]'
              }`}
            >
              <Eye className="w-3 h-3" /> Preview
            </button>
            <button
              onClick={() => setViewStyle('raw')}
              className={`font-mono text-xs px-2.5 py-1 rounded transition flex items-center gap-1 cursor-pointer ${
                viewStyle === 'raw' ? 'bg-[#FF4400] text-white font-bold' : 'text-[#888]'
              }`}
            >
              <Code className="w-3 h-3" /> Raw MD
            </button>
          </div>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 bg-[#1C1C1C] hover:bg-[#252525] border border-[#333333] text-white px-3.5 py-2 rounded font-mono text-xs cursor-pointer transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-[#FF4400]" />
            PRINT / PDF
          </button>

          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 bg-[#1C1C1C] hover:bg-[#252525] border border-[#333333] text-white px-3.5 py-2 rounded font-mono text-xs cursor-pointer transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'COPIED' : 'COPY'}
          </button>

          <button
            onClick={handleDownloadMd}
            className="inline-flex items-center gap-1.5 bg-[#1C1C1C] hover:bg-[#252525] border border-[#333333] text-white px-3.5 py-2 rounded font-mono text-xs cursor-pointer transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            .MD
          </button>

          <button
            onClick={handleDownloadTxt}
            className="inline-flex items-center gap-1.5 bg-[#FF4400] hover:bg-[#E63D00] text-white px-4 py-2 rounded font-bebas text-base tracking-wider cursor-pointer transition-colors shadow-[0_0_12px_rgba(255,68,0,0.3)]"
          >
            <FileText className="w-4 h-4" />
            DOWNLOAD .TXT
          </button>
        </div>
      </div>

      {/* Content */}
      {viewStyle === 'preview' ? (
        <div className="bg-white text-[#111111] p-8 md:p-12 rounded-sm shadow-2xl font-sans max-w-4xl mx-auto border border-gray-300">
          <div className="space-y-3">
            {blocks.map((block, idx) => {
              switch (block.type) {
                case 'h1':
                  return (
                    <h1 key={idx} className="text-2xl md:text-3xl font-bold tracking-tight text-black border-b-2 border-black pb-2 uppercase">
                      <Inline text={block.text} />
                    </h1>
                  );
                case 'h2':
                  return (
                    <h2 key={idx} className="text-sm font-bold tracking-wider text-[#333] border-b border-gray-300 pb-1 mt-6 uppercase">
                      <Inline text={block.text} />
                    </h2>
                  );
                case 'h3':
                  return (
                    <h3 key={idx} className="text-xs font-bold text-black mt-3">
                      <Inline text={block.text} />
                    </h3>
                  );
                case 'hr':
                  return <hr key={idx} className="border-gray-300" />;
                case 'ul':
                  return (
                    <ul key={idx} className="list-disc pl-5 space-y-1 text-xs text-gray-800">
                      {block.items.map((item, liIdx) => (
                        <li key={liIdx}><Inline text={item} /></li>
                      ))}
                    </ul>
                  );
                default:
                  return (
                    <p key={idx} className="text-xs text-gray-700 leading-relaxed">
                      <Inline text={block.text} />
                    </p>
                  );
              }
            })}
          </div>
        </div>
      ) : (
        <div className="bg-[#0A0A0A] p-6 md:p-8 rounded-sm border border-[#242424] overflow-x-auto max-h-[600px] overflow-y-auto">
          <pre className="font-mono text-xs md:text-sm text-[#D8D8D8] whitespace-pre-wrap leading-relaxed">
            {resumeMarkdown}
          </pre>
        </div>
      )}
    </div>
  );
};

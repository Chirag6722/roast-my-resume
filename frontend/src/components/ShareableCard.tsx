import React, { useRef, useState } from 'react';
import { Download, Check, Flame, Palette, Image as ImageIcon } from 'lucide-react';
import html2canvas from 'html2canvas';
import type { ShareableCardData } from '../types';

interface ShareableCardProps {
  cardData: ShareableCardData;
}

type CardTheme = 'pitch-black' | 'inferno' | 'terminal';

export const ShareableCard: React.FC<ShareableCardProps> = ({ cardData }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
  const [theme, setTheme] = useState<CardTheme>('pitch-black');
  const [alias, setAlias] = useState(cardData.candidate_alias);
  const [notification, setNotification] = useState<{ message: string; tone: 'ok' | 'error' } | null>(null);

  const showToast = (message: string, tone: 'ok' | 'error' = 'ok') => {
    setNotification({ message, tone });
    window.setTimeout(() => setNotification(null), 4000);
  };

  // Roasts saved before the quotes moved into the UI still carry their own pair.
  const burnLine = cardData.burn_line.replace(/^["“]|["”]$/g, '').trim();
  const shareText = `My resume scored ${cardData.ats_score}/100 on RoastMyResume: "${burnLine}"`;
  // A localhost address is a dead link in a public post, so only share a real one.
  const publicUrl = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])/i.test(window.location.origin)
    ? ''
    : window.location.origin;

  const generateCardBlob = async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;
    const canvas = await html2canvas(cardRef.current, {
      backgroundColor: theme === 'inferno' ? '#7A1D00' : '#0A0A0A',
      scale: 2.5,
      useCORS: true,
    });
    return new Promise(resolve => canvas.toBlob(blob => resolve(blob), 'image/png'));
  };

  const saveBlob = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `RoastMyResume-${cardData.ats_score}-${Date.now()}.png`;
    link.href = url;
    // Firefox needs the anchor in the document, and revoking too early can
    // cancel the download, so the URL is released on the next tick.
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  const handleDownload = async (): Promise<boolean> => {
    setIsExporting(true);
    try {
      const blob = await generateCardBlob();
      if (!blob) throw new Error('The card image could not be rendered.');
      saveBlob(blob);
      showToast('Card image downloaded.');
      return true;
    } catch (err) {
      console.error('Failed to export card image', err);
      showToast('Could not create the image. Try a different card theme or browser.', 'error');
      return false;
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * Copy the PNG so it can be pasted straight into a post. Whenever the clipboard
   * is unavailable (unsupported, blocked, or the window is not focused) the card
   * is downloaded instead, so the user always ends up holding the image.
   */
  const copyImage = async (successMessage: string): Promise<boolean> => {
    setIsExporting(true);
    let blob: Blob | null = null;
    try {
      blob = await generateCardBlob();
      if (!blob) throw new Error('The card image could not be rendered.');
    } catch (err) {
      console.error('Failed to render card image', err);
      showToast('Could not create the image. Try a different card theme or browser.', 'error');
      setIsExporting(false);
      return false;
    }

    try {
      if (!navigator.clipboard || typeof window.ClipboardItem !== 'function') {
        throw new Error('Clipboard images are not supported here.');
      }
      await navigator.clipboard.write([new window.ClipboardItem({ 'image/png': blob })]);
      setCopiedImage(true);
      showToast(successMessage);
      window.setTimeout(() => setCopiedImage(false), 3000);
      return true;
    } catch (err) {
      console.warn('Clipboard copy unavailable, downloading instead', err);
      saveBlob(blob);
      showToast('Copying was blocked, so the card was downloaded. Attach it to your post.');
      return false;
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyImageToClipboard = () =>
    copyImage('Card image copied. Paste it into your post with Ctrl+V.');

  const handleTwitterShare = async () => {
    setIsExporting(true);
    try {
      const blob = await generateCardBlob();
      if (blob) {
        const file = new File([blob], `roast-card-${cardData.ats_score}.png`, { type: 'image/png' });
        // Native share attaches the image directly where it is supported.
        if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
          await navigator.share({ title: 'My Resume Roast Verdict', text: shareText, files: [file] });
          return;
        }
        if (navigator.clipboard && typeof window.ClipboardItem === 'function') {
          try {
            await navigator.clipboard.write([new window.ClipboardItem({ 'image/png': blob })]);
            showToast('Card copied. Press Ctrl+V in the X tab to attach it.');
          } catch (err) {
            console.warn('Could not copy card to clipboard', err);
          }
        }
      }
    } catch (err) {
      // Sharing was cancelled or blocked; the composer still opens below.
      if ((err as Error)?.name !== 'AbortError') console.warn('Share failed', err);
    } finally {
      setIsExporting(false);
    }

    const params = new URLSearchParams({ text: shareText });
    if (publicUrl) params.set('url', publicUrl);
    window.open(`https://twitter.com/intent/tweet?${params}`, '_blank', 'noopener,noreferrer');
  };

  const handleLinkedInShare = async () => {
    // LinkedIn's share-offsite dialog only accepts a scrapable URL and cannot
    // take a pasted image, so we open the post composer instead, where it can.
    await copyImage('Card copied. Paste it into the LinkedIn composer with Ctrl+V.');
    const params = new URLSearchParams({ shareActive: 'true', text: shareText });
    window.open(`https://www.linkedin.com/feed/?${params}`, '_blank', 'noopener,noreferrer');
  };

  const getThemeStyles = () => {
    switch (theme) {
      case 'inferno':
        return 'bg-gradient-to-br from-[#2E0B00] via-[#5C1600] to-[#8F2300] border-2 border-[#FF6A00] text-white';
      case 'terminal':
        return 'bg-[#050B05] border-2 border-[#00FF66] text-[#00FF66]';
      default:
        return 'bg-[#0E0E0E] border-2 border-[#282828] text-white';
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast alert banner */}
      {notification && (
        <div
          role="status"
          className={`font-mono text-xs font-bold py-2.5 px-4 rounded text-center shadow-lg max-w-xl mx-auto ${
            notification.tone === 'error'
              ? 'bg-[#2A0E0E] border border-red-500/60 text-red-300'
              : 'bg-[#FF4400] text-black'
          }`}
        >
          {notification.message}
        </div>
      )}

      {/* Theme & Alias Customizer */}
      <div className="bg-[#121212] border border-[#242424] p-4 rounded-sm flex flex-wrap items-center justify-between gap-4 max-w-xl mx-auto">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-[#FF4400]" />
          <span className="font-mono text-xs text-[#888888] font-bold uppercase">CARD THEME:</span>
          <div className="flex gap-1.5 ml-2">
            <button
              type="button"
              onClick={() => setTheme('pitch-black')}
              className={`px-2 py-1 font-mono text-[10px] rounded uppercase transition cursor-pointer ${
                theme === 'pitch-black' ? 'bg-[#FF4400] text-white font-bold' : 'bg-[#1F1F1F] text-[#888]'
              }`}
            >
              Pitch Black
            </button>
            <button
              type="button"
              onClick={() => setTheme('inferno')}
              className={`px-2 py-1 font-mono text-[10px] rounded uppercase transition cursor-pointer ${
                theme === 'inferno' ? 'bg-[#FF4400] text-white font-bold' : 'bg-[#1F1F1F] text-[#888]'
              }`}
            >
              Inferno
            </button>
            <button
              type="button"
              onClick={() => setTheme('terminal')}
              className={`px-2 py-1 font-mono text-[10px] rounded uppercase transition cursor-pointer ${
                theme === 'terminal' ? 'bg-[#00FF66] text-black font-bold' : 'bg-[#1F1F1F] text-[#888]'
              }`}
            >
              Terminal
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-[#888888] font-bold uppercase">ALIAS:</span>
          <input
            type="text"
            value={alias}
            maxLength={28}
            aria-label="Name shown on the card"
            onChange={(e) => setAlias(e.target.value)}
            onBlur={() => { if (!alias.trim()) setAlias(cardData.candidate_alias); }}
            className="bg-[#0A0A0A] border border-[#2A2A2A] px-2 py-1 text-xs font-mono text-white rounded w-32 focus:outline-none focus:border-[#FF4400]"
          />
        </div>
      </div>

      {/* The Visual Social Card (Capture Target) */}
      <div
        ref={cardRef}
        className={`w-full max-w-xl mx-auto p-8 md:p-10 rounded-sm relative shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden transition-all duration-300 ${getThemeStyles()}`}
      >
        {/* Ember top accent line */}
        <div className={`absolute top-0 left-0 right-0 h-1.5 ${
          theme === 'terminal' ? 'bg-[#00FF66]' : 'bg-gradient-to-r from-[#FF7B00] via-[#FF4400] to-[#CC2900]'
        }`} />

        {/* Ambient glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#FF4400]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top bar with watermark and intensity badge */}
        <div className="flex items-center justify-between border-b border-current/20 pb-5 mb-8">
          <div className="flex items-center gap-2">
            <Flame className={`w-5 h-5 ${theme === 'terminal' ? 'text-[#00FF66]' : 'text-[#FF4400]'}`} />
            <span className="font-bebas text-2xl tracking-wider">
              ROAST<span className={theme === 'terminal' ? 'text-[#00FF66]' : 'text-[#FF4400]'}>MY</span>RESUME
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] uppercase tracking-wider px-2.5 py-1 bg-black/40 border border-current/30 rounded-sm font-semibold">
              {cardData.intensity} ROAST
            </span>
          </div>
        </div>

        {/* Big ATS Score Block */}
        <div className="flex items-baseline gap-2 mb-8">
          <span className={`font-bebas text-8xl md:text-9xl font-bold leading-none tracking-tight ${
            theme === 'terminal' ? 'text-[#00FF66]' : 'text-[#FF4400]'
          }`}>
            {cardData.ats_score}
          </span>
          <span className="font-bebas text-4xl md:text-5xl opacity-40 tracking-tight">
            /100
          </span>
          <span className="font-mono text-xs uppercase tracking-widest ml-4 font-semibold opacity-70">
            ATS ROBOT VERDICT
          </span>
        </div>

        {/* The Punchline Roast */}
        <div className={`p-5 md:p-6 mb-8 border-l-4 ${
          theme === 'terminal' ? 'bg-black/60 border-[#00FF66]' : 'bg-black/40 border-[#FF4400]'
        }`}>
          <p className="font-mono text-sm md:text-base leading-relaxed italic">
            &ldquo;{burnLine}&rdquo;
          </p>
        </div>

        {/* Footer meta */}
        <div className="flex items-center justify-between font-mono text-xs opacity-60 pt-2 border-t border-current/10">
          <span className="truncate max-w-[60%]">{alias}</span>
          <span>{cardData.date_formatted}</span>
        </div>
      </div>

      {/* Action Buttons with 1-Click Copy Image & Share */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        {/* Direct X / Twitter Card Share */}
        <button
          type="button"
          onClick={handleTwitterShare}
          disabled={isExporting}
          className="inline-flex items-center gap-2 bg-[#1DA1F2] hover:bg-[#0C85D0] text-white px-5 py-2.5 rounded-sm font-bebas text-lg tracking-wider transition-all duration-200 cursor-pointer shadow-[0_0_20px_rgba(29,161,242,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
          title="Share Card Image on Twitter/X"
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
          {isExporting ? 'PREPARING CARD...' : 'POST CARD ON X (TWITTER)'}
        </button>

        {/* Copy Image directly to clipboard (for instant paste) */}
        <button
          type="button"
          onClick={handleCopyImageToClipboard}
          disabled={isExporting}
          className="inline-flex items-center gap-2 bg-[#1C1C1C] hover:bg-[#282828] border border-[#3A3A3A] hover:border-[#FF4400] text-white px-4 py-2.5 rounded-sm font-mono text-xs tracking-wider transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {copiedImage ? <Check className="w-4 h-4 text-emerald-400" /> : <ImageIcon className="w-4 h-4 text-[#FF4400]" />}
          {copiedImage ? 'IMAGE COPIED (PASTE WITH CTRL+V)' : 'COPY CARD IMAGE'}
        </button>

        {/* Download PNG */}
        <button
          type="button"
          onClick={handleDownload}
          disabled={isExporting}
          className="inline-flex items-center gap-2 bg-[#FF4400] hover:bg-[#E63D00] text-white px-4 py-2.5 rounded-sm font-bebas text-lg tracking-wider transition-all duration-200 cursor-pointer shadow-[0_0_15px_rgba(255,68,0,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          DOWNLOAD PNG
        </button>

        {/* Share LinkedIn */}
        <button
          type="button"
          onClick={handleLinkedInShare}
          disabled={isExporting}
          className="inline-flex items-center gap-2 bg-[#1A1A1A] hover:bg-[#252525] border border-[#333333] text-white hover:text-[#0A66C2] px-3.5 py-2.5 rounded-sm font-mono text-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          title="Copy the card, then open the LinkedIn composer to paste it"
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.45a1.6 1.6 0 1 0 1.6 1.6 1.6 1.6 0 0 0-1.6-1.6z"/>
          </svg>
        </button>
      </div>

      <p className="text-center font-mono text-[11px] text-[#777777]">
        💡 X and LinkedIn copy the card to your clipboard and open the composer, so you can paste it
        (Ctrl+V) into the post. Download PNG always works if pasting does not.
      </p>
    </div>
  );
};

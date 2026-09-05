/**
 * Speech playback for the roast.
 *
 * Three things the naive implementation gets wrong, all handled here:
 *  1. `getVoices()` is empty until the engine loads, so voice choice silently
 *     fails on a cold page and you get the default robot.
 *  2. Chrome stops a single utterance after roughly 15 seconds with no error.
 *     A full roast runs about 27, so the ending was simply never heard. We
 *     split it into sentence-sized chunks and speak them in sequence.
 *  3. If speech is unavailable the caller was never told, so the UI sat on
 *     "playing" forever. Every path now reports back.
 */

export const isSpeechSupported = (): boolean =>
  typeof window !== 'undefined' && 'speechSynthesis' in window;

/** Voices arrive asynchronously; resolve once they exist (or give up quietly). */
const loadVoices = (): Promise<SpeechSynthesisVoice[]> =>
  new Promise(resolve => {
    if (!isSpeechSupported()) return resolve([]);
    const existing = window.speechSynthesis.getVoices();
    if (existing.length) return resolve(existing);

    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.speechSynthesis.onvoiceschanged = null;
      resolve(window.speechSynthesis.getVoices());
    };
    window.speechSynthesis.onvoiceschanged = finish;
    setTimeout(finish, 1500);
  });

const pickVoice = (voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null => {
  const english = voices.filter(v => v.lang?.toLowerCase().startsWith('en'));
  if (!english.length) return null;
  // Prefer a natural-sounding voice; the roast lands better when it is not a robot.
  const preferred = ['natural', 'google', 'aria', 'guy', 'david', 'mark', 'samantha', 'daniel'];
  for (const name of preferred) {
    const hit = english.find(v => v.name.toLowerCase().includes(name));
    if (hit) return hit;
  }
  return english.find(v => v.default) ?? english[0];
};

/** Make the written roast sound right read aloud. */
export const toSpokenText = (text: string): string =>
  text
    .replace(/(\d+)\s*\/\s*(\d+)/g, '$1 out of $2')   // "51/100" -> "51 out of 100"
    .replace(/\bATS\b/g, 'A.T.S.')                     // spelled out, not "ats"
    .replace(/\bp(\d{2})\b/gi, 'p $1')                 // "p99" -> "p 99"
    .replace(/\[[^\]]*\]/g, '')                        // drop [placeholder] gaps
    .replace(/[*#`_•▪◦]/g, '')                         // markdown and bullet glyphs
    .replace(/["“”]/g, '')                             // quotes read as pauses, not characters
    .replace(/\s+/g, ' ')
    .trim();

/** Sentence-sized chunks, each short enough to survive Chrome's cutoff. */
export const chunkForSpeech = (text: string, max = 160): string[] => {
  const sentences = text.match(/[^.!?]+[.!?]*/g) ?? [text];
  const chunks: string[] = [];
  let current = '';
  for (const raw of sentences) {
    const s = raw.trim();
    if (!s) continue;
    if (!current) current = s;
    else if (current.length + s.length + 1 <= max) current += ' ' + s;
    else {
      chunks.push(current);
      current = s;
    }
  }
  if (current) chunks.push(current);
  return chunks;
};

export interface SpeechHandle {
  stop: () => void;
}

export interface SpeakOptions {
  rate?: number;
  pitch?: number;
  onProgress?: (spoken: number, total: number) => void;
  onEnd?: () => void;
  onError?: (reason: string) => void;
}

export function speakRoast(text: string, opts: SpeakOptions = {}): SpeechHandle {
  const { rate = 1, pitch = 0.9, onProgress, onEnd, onError } = opts;

  if (!isSpeechSupported()) {
    onError?.('Your browser cannot read text aloud.');
    return { stop: () => undefined };
  }

  const chunks = chunkForSpeech(toSpokenText(text));
  if (!chunks.length) {
    onEnd?.();
    return { stop: () => undefined };
  }

  let cancelled = false;
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const cleanup = () => {
    if (heartbeat) clearInterval(heartbeat);
    heartbeat = null;
  };

  const stop = () => {
    cancelled = true;
    cleanup();
    window.speechSynthesis.cancel();
  };

  const speakFrom = (index: number, voice: SpeechSynthesisVoice | null) => {
    if (cancelled) return;
    if (index >= chunks.length) {
      cleanup();
      onEnd?.();
      return;
    }
    const utterance = new SpeechSynthesisUtterance(chunks[index]);
    utterance.rate = rate;
    utterance.pitch = pitch;
    if (voice) utterance.voice = voice;

    utterance.onend = () => {
      if (cancelled) return;
      onProgress?.(index + 1, chunks.length);
      speakFrom(index + 1, voice);
    };
    utterance.onerror = event => {
      if (cancelled) return; // cancel() fires onerror; that is not a failure
      cleanup();
      onError?.(`Speech stopped unexpectedly (${event.error ?? 'unknown'}).`);
    };
    window.speechSynthesis.speak(utterance);
  };

  window.speechSynthesis.cancel(); // clear anything already queued
  loadVoices().then(voices => {
    if (cancelled) return;
    onProgress?.(0, chunks.length);
    // Chrome pauses its own queue on long reads; nudging it keeps playback alive.
    heartbeat = setInterval(() => {
      if (cancelled) return;
      if (window.speechSynthesis.paused) window.speechSynthesis.resume();
    }, 5000);
    speakFrom(0, pickVoice(voices));
  });

  return { stop };
}

export const stopSpeaking = (): void => {
  if (isSpeechSupported()) window.speechSynthesis.cancel();
};

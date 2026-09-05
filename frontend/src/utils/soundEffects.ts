// Web Audio helpers. Speech lives in ./speech.ts.

/**
 * One shared AudioContext for the whole page. Creating a fresh one per roast
 * leaked a running context every time; browsers cap how many may exist, and a
 * running context keeps the audio hardware awake for nothing.
 */
let sharedCtx: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
  try {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    if (!sharedCtx || sharedCtx.state === 'closed') sharedCtx = new Ctor();
    // Browsers start it suspended until a user gesture; a click already happened.
    if (sharedCtx.state === 'suspended') void sharedCtx.resume();
    return sharedCtx;
  } catch (err) {
    console.warn('Audio not available', err);
    return null;
  }
};

export const playFlameIgnite = (): void => {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.6);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.6);
    // Release the nodes once the sound has finished.
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  } catch (err) {
    console.warn('Could not play ignition sound', err);
  }
};

export { speakRoast, stopSpeaking, isSpeechSupported } from './speech';

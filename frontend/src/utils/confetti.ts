import confetti from 'canvas-confetti';

/**
 * Ember burst for a finished roast.
 *
 * The library's global `confetti()` renders into a canvas it manages itself and
 * drives resizing through a web worker. That path throws
 * "canvas.getBoundingClientRect is not a function" in this version, leaving a
 * 0x0 canvas and no confetti. Binding an instance to our own canvas with
 * `useWorker: false` avoids that code path entirely.
 */
let fire: confetti.CreateTypes | null = null;

const getFire = (): confetti.CreateTypes | null => {
  if (fire) return fire;
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, {
    position: 'fixed',
    inset: '0',
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: '60',
  } as Partial<CSSStyleDeclaration>);
  document.body.appendChild(canvas);

  fire = confetti.create(canvas, { resize: true, useWorker: false });
  return fire;
};

export const emberBurst = (): void => {
  try {
    getFire()?.({
      particleCount: 50,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#FF4400', '#FF7B00', '#FF2200', '#FFAA00', '#331100'],
    });
  } catch (err) {
    // A missing celebration must never break the roast that earned it.
    console.error('confetti failed', err);
  }
};

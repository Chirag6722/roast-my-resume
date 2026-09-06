import { describe, expect, it } from 'vitest';
import { PATHS, isUnknownPath, pageFromPath, pathForPage } from './routes';

describe('pageFromPath', () => {
  it('maps every known path to its screen', () => {
    expect(pageFromPath('/')).toBe('landing');
    expect(pageFromPath('/roast')).toBe('roast');
    expect(pageFromPath('/history')).toBe('history');
    expect(pageFromPath('/login')).toBe('login');
    expect(pageFromPath('/register')).toBe('register');
  });

  it('treats a trailing slash as the same screen', () => {
    expect(pageFromPath('/history/')).toBe('history');
    expect(pageFromPath('/roast//')).toBe('roast');
  });

  it('falls back to the landing page for anything unrecognised', () => {
    expect(pageFromPath('/nope')).toBe('landing');
    expect(pageFromPath('/roast/extra')).toBe('landing');
    expect(pageFromPath('')).toBe('landing');
  });
});

describe('pathForPage', () => {
  it('round-trips with pageFromPath for every screen', () => {
    for (const page of Object.keys(PATHS) as (keyof typeof PATHS)[]) {
      expect(pageFromPath(pathForPage(page))).toBe(page);
    }
  });

  it('gives each screen a distinct address', () => {
    const paths = Object.values(PATHS);
    expect(new Set(paths).size).toBe(paths.length);
  });
});

describe('isUnknownPath', () => {
  it('accepts the real screens', () => {
    expect(isUnknownPath('/')).toBe(false);
    expect(isUnknownPath('/history')).toBe(false);
    expect(isUnknownPath('/history/')).toBe(false);
  });

  it('flags anything else so the address bar can be corrected', () => {
    expect(isUnknownPath('/nope')).toBe(true);
    expect(isUnknownPath('/roast/1')).toBe(true);
  });
});

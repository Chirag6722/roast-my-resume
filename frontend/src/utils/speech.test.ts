import { describe, expect, it } from 'vitest';
import { chunkForSpeech, toSpokenText } from './speech';

/**
 * Chrome silently stops a single utterance after roughly 15 seconds. A spoken
 * roast runs about 27, so the ending was simply never heard until it was split
 * into sentence-sized chunks.
 */
// A real roast is the headline, the verdict and two paragraphs, which reads
// aloud in roughly 27 seconds. That length is the whole reason for chunking.
const ROAST =
  'NUMBERS NOT FOUND. 6 bullets and not a single number. You are asking to be ' +
  'believed, not hired. A recruiter gives this six seconds, so let us spend them ' +
  "well. 'Responsible for writing code and attending daily standup meetings.' is " +
  'not an achievement, it is attendance. With 51/100 and 0 measurable results ' +
  'across 6 bullets, the screener is not rejecting you out of spite. It simply has ' +
  'nothing to match on. Listing Microsoft Word as a skill wastes space a real tool ' +
  'could use, and the objective section describes what you want rather than what ' +
  'you deliver.';

describe('toSpokenText', () => {
  it('reads a score as words rather than a slash', () => {
    expect(toSpokenText('You scored 51/100 today.')).toContain('51 out of 100');
  });

  it('spells out ATS and separates p99', () => {
    expect(toSpokenText('An ATS read this.')).toContain('A.T.S.');
    expect(toSpokenText('Reduced p99 latency')).toContain('p 99');
  });

  it('drops placeholder gaps and markdown glyphs', () => {
    expect(toSpokenText('Cut cost by [X%] here')).not.toContain('[');
    expect(toSpokenText('**Bold** and # head and • dot')).not.toMatch(/[*#•]/);
  });

  it('removes quote characters so they are not read aloud', () => {
    expect(toSpokenText('He said "no" and “maybe”')).not.toMatch(/["“”]/);
  });

  it('collapses runs of whitespace', () => {
    expect(toSpokenText('a   b     c')).toBe('a b c');
  });
});

describe('chunkForSpeech', () => {
  const chunks = chunkForSpeech(toSpokenText(ROAST));

  it('splits a full roast into several chunks', () => {
    expect(chunks.length).toBeGreaterThanOrEqual(3);
  });

  it('keeps every chunk short enough to finish before the cutoff', () => {
    for (const chunk of chunks) expect(chunk.length).toBeLessThanOrEqual(160);
  });

  it('loses no words', () => {
    const strip = (s: string) => s.replace(/\s+/g, '');
    expect(strip(chunks.join(' '))).toBe(strip(toSpokenText(ROAST)));
  });

  it('breaks on sentence boundaries', () => {
    for (const chunk of chunks.slice(0, -1)) expect(chunk.trim()).toMatch(/[.!?]$/);
  });

  it('produces no empty chunks', () => {
    for (const chunk of chunks) expect(chunk.trim().length).toBeGreaterThan(0);
  });

  it('handles empty input and a single short line', () => {
    expect(chunkForSpeech('')).toHaveLength(0);
    expect(chunkForSpeech('    ')).toHaveLength(0);
    expect(chunkForSpeech('Short one.')).toHaveLength(1);
  });

  it('still chunks text with no punctuation at all', () => {
    expect(chunkForSpeech('word '.repeat(120)).length).toBeGreaterThanOrEqual(1);
  });
});

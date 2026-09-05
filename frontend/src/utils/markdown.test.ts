import { describe, expect, it } from 'vitest';
import { markdownToHtml, parseInline, parseMarkdown } from './markdown';

/**
 * The rewrite preview used to split on blank lines and read only the first line
 * of each block, so a heading swallowed the paragraph under it and bold markers
 * showed as literal asterisks.
 */
const RESUME = `# JOHNATHAN DOE
Software Engineer | john.doe@email.com

---

## SUMMARY
Software Engineer with experience in HTML, Python, Git.

## SKILLS
- **Languages:** HTML, Python
- **Data & Tools:** Git

### Software Intern — TechCorp (2024 - 2025)
- Wrote code and attended standups for [N users]
`;

describe('parseMarkdown', () => {
  const blocks = parseMarkdown(RESUME);

  it('keeps a heading separate from the line beneath it', () => {
    expect(blocks).toContainEqual({ type: 'h2', text: 'SUMMARY' });
    expect(blocks.some(b => b.type === 'p' && b.text.startsWith('Software Engineer with'))).toBe(true);
  });

  it('reads the name as a heading and the contact line as a paragraph', () => {
    expect(blocks[0]).toEqual({ type: 'h1', text: 'JOHNATHAN DOE' });
    expect(blocks[1].type).toBe('p');
  });

  it('turns a rule into an hr and groups consecutive bullets into one list', () => {
    expect(blocks.some(b => b.type === 'hr')).toBe(true);
    expect(blocks.some(b => b.type === 'ul' && b.items.length === 2)).toBe(true);
  });

  it('handles all three heading levels', () => {
    expect(blocks.some(b => b.type === 'h3' && b.text.includes('Software Intern'))).toBe(true);
  });
});

describe('markdownToHtml', () => {
  const html = markdownToHtml(RESUME);

  it('renders bold instead of leaving asterisks', () => {
    expect(html).toContain('<strong>Languages:</strong>');
    expect(html).not.toContain('**');
  });

  it('wraps list items in a list', () => {
    expect(html).toMatch(/<ul><li>.*<\/li><li>.*<\/li><\/ul>/);
  });

  it('leaves the placeholder gaps intact for the candidate to fill', () => {
    expect(html).toContain('[N users]');
  });

  it('escapes html so resume text cannot inject markup', () => {
    expect(markdownToHtml('- a < b & c')).toContain('a &lt; b &amp; c');
    expect(markdownToHtml('- <img src=x onerror=alert(1)>')).not.toContain('<img');
  });

  it('neutralises a javascript: link but keeps real ones', () => {
    expect(markdownToHtml('[x](javascript:alert(1))')).toContain('href="#"');
    expect(markdownToHtml('[x](https://a.com)')).toContain('href="https://a.com"');
    expect(markdownToHtml('[m](mailto:a@b.com)')).toContain('href="mailto:a@b.com"');
  });
});

describe('parseInline', () => {
  it('splits text around a bold run', () => {
    expect(parseInline('a **b** c')).toEqual([
      { kind: 'text', text: 'a ' },
      { kind: 'bold', text: 'b' },
      { kind: 'text', text: ' c' },
    ]);
  });

  it('returns plain text untouched', () => {
    expect(parseInline('nothing special')).toEqual([{ kind: 'text', text: 'nothing special' }]);
  });
});

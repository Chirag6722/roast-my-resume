/**
 * A deliberately small Markdown subset: exactly what the resume rewriter emits.
 * Headings, horizontal rules, bullet lists, bold, and links. Parsed line by line
 * so a heading never swallows the paragraph beneath it.
 */
export type MdBlock =
  | { type: 'h1' | 'h2' | 'h3' | 'p'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'hr' };

export function parseMarkdown(md: string): MdBlock[] {
  const blocks: MdBlock[] = [];
  let list: string[] | null = null;

  const flushList = () => {
    if (list && list.length) blocks.push({ type: 'ul', items: list });
    list = null;
  };

  for (const rawLine of md.split('\n')) {
    const line = rawLine.trim();

    if (!line) {
      flushList();
      continue;
    }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) {
      flushList();
      blocks.push({ type: 'hr' });
      continue;
    }
    const bullet = line.match(/^[-*•]\s+(.*)$/);
    if (bullet) {
      list = list ?? [];
      list.push(bullet[1]);
      continue;
    }
    flushList();
    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      blocks.push({ type: `h${heading[1].length}` as 'h1' | 'h2' | 'h3', text: heading[2] });
    } else {
      blocks.push({ type: 'p', text: line });
    }
  }
  flushList();
  return blocks;
}

/** Inline pieces: plain text, bold runs, and links. */
export type MdSpan =
  | { kind: 'text'; text: string }
  | { kind: 'bold'; text: string }
  | { kind: 'link'; text: string; href: string };

const INLINE_RE = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)]+)\)/g;

export function parseInline(text: string): MdSpan[] {
  const spans: MdSpan[] = [];
  let last = 0;
  for (const m of text.matchAll(INLINE_RE)) {
    const at = m.index ?? 0;
    if (at > last) spans.push({ kind: 'text', text: text.slice(last, at) });
    if (m[1] !== undefined) {
      spans.push({ kind: 'bold', text: m[1] });
    } else {
      spans.push({ kind: 'link', text: m[2], href: m[3] });
    }
    last = at + m[0].length;
  }
  if (last < text.length) spans.push({ kind: 'text', text: text.slice(last) });
  return spans;
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const inlineToHtml = (text: string): string =>
  parseInline(text)
    .map(span => {
      if (span.kind === 'bold') return `<strong>${escapeHtml(span.text)}</strong>`;
      if (span.kind === 'link') {
        // Only http(s) and mailto survive, so a crafted link cannot become javascript:
        const safe = /^(https?:|mailto:)/i.test(span.href) ? span.href : '#';
        return `<a href="${escapeHtml(safe)}">${escapeHtml(span.text)}</a>`;
      }
      return escapeHtml(span.text);
    })
    .join('');

/** Used for the print / PDF window, which needs a plain HTML string. */
export function markdownToHtml(md: string): string {
  return parseMarkdown(md)
    .map(block => {
      switch (block.type) {
        case 'hr':
          return '<hr/>';
        case 'ul':
          return `<ul>${block.items.map(i => `<li>${inlineToHtml(i)}</li>`).join('')}</ul>`;
        default:
          return `<${block.type}>${inlineToHtml(block.text)}</${block.type}>`;
      }
    })
    .join('\n');
}

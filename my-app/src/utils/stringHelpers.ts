// String & ID helper utilities extracted from utils/index.ts

export const genId = () => 'b' + Math.random().toString(36).slice(2, 7);

export function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function strip(html: string): string {
  const d = document.createElement('div');
  d.innerHTML = html;
  return (d.textContent || '').replace(/\s+/g, ' ').trim();
}

/**
 * Calculates grapheme cluster boundaries for Backspace (backward) and Delete (forward).
 * Handles complex emojis (e.g. skin tones, flag sequences, ZWJ sequences) and combined diacritics.
 */
export function getGraphemeClusterDeletionBounds(
  text: string,
  caretOffset: number,
  direction: 'backward' | 'forward'
): { start: number; end: number } {
  if (!text) return { start: 0, end: 0 };

  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    const segments = Array.from(segmenter.segment(text));

    if (direction === 'backward') {
      for (let i = segments.length - 1; i >= 0; i--) {
        const seg = segments[i];
        const segEnd = seg.index + seg.segment.length;
        if (segEnd <= caretOffset) {
          return { start: seg.index, end: caretOffset };
        }
      }
      return { start: Math.max(0, caretOffset - 1), end: caretOffset };
    } else {
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        if (seg.index >= caretOffset) {
          return { start: caretOffset, end: seg.index + seg.segment.length };
        }
      }
      return { start: caretOffset, end: Math.min(text.length, caretOffset + 1) };
    }
  }

  // Fallback for environments without Intl.Segmenter
  if (direction === 'backward') {
    const codeUnits = Array.from(text.slice(0, caretOffset));
    const lastChar = codeUnits.pop() || '';
    const start = caretOffset - lastChar.length;
    return { start: Math.max(0, start), end: caretOffset };
  } else {
    const codeUnits = Array.from(text.slice(caretOffset));
    const nextChar = codeUnits[0] || '';
    return { start: caretOffset, end: Math.min(text.length, caretOffset + nextChar.length) };
  }
}

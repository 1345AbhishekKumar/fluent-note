import { esc } from '../stringHelpers';

export function renderLinksInContent(content: string): string {
  let html = esc(content);
  html = html.replace(/\[\[(.*?)\]\]/g, (match, title) => {
    return `<span class="wiki-link" data-ref="${title}" contenteditable="false" style="color: var(--accent); text-decoration: underline; cursor: pointer;">[[${title}]]</span>\u200B`;
  });
  html = html.replace(/@([a-zA-Z0-9\s-_]+?)(?=\s+(?:and|or|for|with|is|are|was|were|the|a|an|in|at|on|of|to|from|by|about|as)\s+|[\.,\?\!\;:()]|$)/gi, (match, title) => {
    return `<span class="wiki-link" data-ref="${title}" contenteditable="false" style="color: var(--accent); text-decoration: underline; cursor: pointer;">@${title}</span>\u200B`;
  });
  html = html.replace(/📅\s*(\d{4}-\d{2}-\d{2})/g, (match, dateStr) => {
    return `<span class="date-badge" data-date="${dateStr}" contenteditable="false" style="background: var(--bg3, rgba(0, 120, 212, 0.08)); color: var(--accent); padding: 2px 6px; border-radius: 4px; font-size: 12.5px; border: 1px solid var(--border); display: inline-flex; align-items: center; gap: 4px; cursor: pointer; user-select: none;">📅 ${dateStr}</span>\u200B`;
  });
  html = html.replace(/\$\$(.*?)\$\$/g, (match, texStr) => {
    let renderedTex = '';
    const hasKatex = typeof window !== 'undefined' && (window as any).katex;
    if (hasKatex) {
      try {
        renderedTex = (window as any).katex.renderToString(texStr, {
          throwOnError: false,
          displayMode: false
        });
      } catch (err) {
        renderedTex = `<span style="color:var(--danger)">\$\$${esc(texStr)}\$\$</span>`;
      }
    } else {
      renderedTex = `\$\$${esc(texStr)}\$\$`;
    }
    return `<span class="math-badge" data-tex="${esc(texStr)}" contenteditable="false" style="background: var(--bg3, rgba(0, 120, 212, 0.08)); color: var(--accent); padding: 2px 6px; border-radius: 4px; font-size: 12.5px; border: 1px solid var(--border); display: inline-flex; align-items: cursor: pointer; user-select: none;">${renderedTex}</span>\u200B`;
  });
  return html;
}

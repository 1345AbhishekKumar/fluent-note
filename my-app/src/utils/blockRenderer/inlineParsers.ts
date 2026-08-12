import { esc } from '../stringHelpers';

export function escapeHtmlKeepingSafeTags(str: string): string {
  if (!str) return '';
  const placeholders: string[] = [];
  
  // Match safe open/close tags including br for line breaks
  const tagRegex = /<\/?(b|strong|i|em|u|strike|s|del|mark|code|a|span|br)(?:\s+[^>]*)?\/?>/gi;
  
  let result = str.replace(tagRegex, (match) => {
    placeholders.push(match);
    return `___SAFE_TAG_PLACEHOLDER_${placeholders.length - 1}___`;
  });
  
  // Preserve existing HTML entities from double-escaping
  const entityRegex = /&(?:#\d+|#x[\da-fA-F]+|[a-zA-Z]+);/g;
  result = result.replace(entityRegex, (match) => {
    placeholders.push(match);
    return `___SAFE_TAG_PLACEHOLDER_${placeholders.length - 1}___`;
  });
  
  result = esc(result);
  
  result = result.replace(/___SAFE_TAG_PLACEHOLDER_(\d+)___/g, (match, idx) => {
    return placeholders[parseInt(idx, 10)];
  });
  
  return result;
}

export function renderLinksInContent(content: string, _allNotes?: any[]): string {
  let html = escapeHtmlKeepingSafeTags(content);
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
  // Inline markdown: code backticks (must come first to protect content)
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  // Inline markdown: bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Inline markdown: italic (after bold is replaced)
  html = html.replace(/\*([^*]+?)\*/g, '<em>$1</em>');
  // Inline markdown: strikethrough
  html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');
  return html;
}

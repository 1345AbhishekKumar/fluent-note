import { esc } from '../stringHelpers';
import { parseLinkString } from '../linkParser';

export function sanitizeSafeTag(tagStr: string): string {
  if (/^<\/[a-zA-Z0-9]+>$/.test(tagStr)) return tagStr;

  let sanitized = tagStr.replace(/\s+on[a-zA-Z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');

  sanitized = sanitized.replace(/\s+href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi, (match, q1, q2, q3) => {
    const rawHref = (q1 ?? q2 ?? q3 ?? '').trim();
    const allowed = /^(?:https?:\/\/|mailto:)/i.test(rawHref);
    if (!allowed) {
      return '';
    }
    return ` href="${esc(rawHref)}"`;
  });

  return sanitized;
}

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
    const original = placeholders[parseInt(idx, 10)];
    if (original.startsWith('&')) {
      return original;
    }
    return sanitizeSafeTag(original);
  });
  
  return result;
}

export function renderLinksInContent(content: string, _allNotes?: any[]): string {
  let html = escapeHtmlKeepingSafeTags(content);

  // Match wikilinks and transclusions: ![[...]] and [[...]]
  html = html.replace(/(!?)\[\[(.*?)\]\]/g, (match) => {
    const parsed = parseLinkString(match);
    if (!parsed) {
      return `<span class="wiki-link" data-raw="${esc(match)}" contenteditable="false" style="color: var(--accent); text-decoration: underline; cursor: pointer;">${esc(match)}</span>\u200B`;
    }

    const targetLower = parsed.targetPath.toLowerCase().trim();
    let isGhost = false;
    if (parsed.targetPath) {
      if (_allNotes && _allNotes.length > 0) {
        const found = _allNotes.some(n => (n.title || '').toLowerCase().trim() === targetLower || (n.id || '').toLowerCase() === targetLower);
        if (!found) isGhost = true;
      }
    }

    if (parsed.isEmbed) {
      return `<span class="embedded-transclusion" data-target="${esc(parsed.targetPath)}" data-heading="${esc(parsed.heading || '')}" data-block="${esc(parsed.blockId || '')}" data-raw="${esc(match)}" contenteditable="false" style="background: var(--bg3, rgba(0, 120, 212, 0.08)); color: var(--accent); padding: 2px 6px; border-radius: 4px; font-size: 12.5px; border: 1px solid var(--border); display: inline-flex; align-items: center; gap: 4px; cursor: pointer; user-select: none;">🖼 ${esc(parsed.displayText)}</span>\u200B`;
    }

    if (isGhost) {
      return `<span class="wiki-link ghost-link" data-ref="${esc(parsed.targetPath)}" data-target="${esc(parsed.targetPath)}" data-heading="${esc(parsed.heading || '')}" data-block="${esc(parsed.blockId || '')}" data-alias="${esc(parsed.displayText)}" data-raw="${esc(match)}" data-ghost="true" contenteditable="false" style="color: var(--text3, #888); text-decoration: underline dashed; cursor: pointer;" title="Uncreated note: click to create">${esc(parsed.displayText)}</span>\u200B`;
    }

    return `<span class="wiki-link" data-ref="${esc(parsed.targetPath)}" data-target="${esc(parsed.targetPath)}" data-heading="${esc(parsed.heading || '')}" data-block="${esc(parsed.blockId || '')}" data-alias="${esc(parsed.displayText)}" data-raw="${esc(match)}" contenteditable="false" style="color: var(--accent); text-decoration: underline; cursor: pointer;">${esc(parsed.displayText)}</span>\u200B`;
  });

  html = html.replace(/@([a-zA-Z0-9_\-]+(?:\s+[a-zA-Z0-9_\-]+)*?)(?=[,\.\?\!\;:()\[\]\n\r"]|\s+@|$)/gi, (match, title) => {
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

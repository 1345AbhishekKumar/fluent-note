// Unified link parser and formatting utility for Obsidian-style Wikilinks & Markdown links
import { esc } from './stringHelpers';

export interface ParsedLink {
  raw: string;
  isEmbed: boolean;        // Starts with ! (transclusion)
  isMarkdownLink: boolean; // [text](url) format
  targetPath: string;      // e.g. "Projects/Ideas" or "Ideas" (trimmed, without .md)
  heading?: string;        // e.g. "Architecture" (without leading #)
  blockId?: string;        // e.g. "37066d" (without leading ^)
  displayText: string;     // e.g. "Custom Alias" or fallback display name
}

/**
 * Parses any raw link string ([[...]], ![[...]], [...](...), ![...](...)) into structured parts.
 */
export function parseLinkString(raw: string): ParsedLink | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();

  // 1. Markdown link format: ![alt](url) or [text](url)
  const mdMatch = /^(?<embed>!?)\[(?<text>[^\]]*)\]\((?<url>[^)]+)\)$/.exec(trimmed);
  if (mdMatch && mdMatch.groups) {
    const isEmbed = mdMatch.groups.embed === '!';
    const rawUrl = decodeURIComponent(mdMatch.groups.url).trim();
    const [pathPart, ...anchorParts] = rawUrl.split('#');
    const fullAnchor = anchorParts.join('#');
    const isBlock = fullAnchor.startsWith('^');

    const cleanPath = pathPart.replace(/\.md$/i, '').trim();
    const displayText = mdMatch.groups.text || cleanPath || fullAnchor;

    return {
      raw: trimmed,
      isEmbed,
      isMarkdownLink: true,
      targetPath: cleanPath,
      heading: !isBlock && fullAnchor ? fullAnchor : undefined,
      blockId: isBlock ? fullAnchor.slice(1) : undefined,
      displayText
    };
  }

  // 2. Wikilink format: ![[target#heading|alias]] or [[target#^block|alias]]
  const wikiMatch = /^(?<embed>!?)\[\[(?<content>[^\]]+)\]\]$/.exec(trimmed);
  if (wikiMatch && wikiMatch.groups) {
    const isEmbed = wikiMatch.groups.embed === '!';
    const content = wikiMatch.groups.content.trim();
    
    // Split alias by vertical bar
    const [targetWithAnchor, ...aliasParts] = content.split('|');
    const alias = aliasParts.length > 0 ? aliasParts.join('|').trim() : undefined;

    // Split target and anchor by first #
    const [pathPart, ...anchorParts] = targetWithAnchor.split('#');
    const fullAnchor = anchorParts.length > 0 ? anchorParts.join('#').trim() : undefined;
    const isBlock = !!fullAnchor && fullAnchor.startsWith('^');

    const cleanPath = pathPart ? pathPart.replace(/\.md$/i, '').trim() : '';
    let displayText = alias;
    if (!displayText) {
      if (cleanPath && fullAnchor) {
        displayText = `${cleanPath} > ${fullAnchor.replace(/^\^/, '')}`;
      } else if (cleanPath) {
        displayText = cleanPath;
      } else if (fullAnchor) {
        displayText = fullAnchor.replace(/^\^/, '');
      } else {
        displayText = 'Untitled';
      }
    }

    return {
      raw: trimmed,
      isEmbed,
      isMarkdownLink: false,
      targetPath: cleanPath,
      heading: !isBlock && fullAnchor ? fullAnchor : undefined,
      blockId: isBlock && fullAnchor ? fullAnchor.slice(1) : undefined,
      displayText
    };
  }

  return null;
}

/**
 * Formats structured components into an Obsidian-standard Wikilink string.
 */
export function formatWikilink(
  target: string,
  heading?: string,
  blockId?: string,
  alias?: string,
  isEmbed = false
): string {
  const prefix = isEmbed ? '!' : '';
  let destination = target.trim();

  if (blockId) {
    destination += `#^${blockId.trim()}`;
  } else if (heading) {
    destination += `#${heading.trim()}`;
  }

  if (alias && alias.trim() && alias.trim() !== destination) {
    return `${prefix}[[${destination}|${alias.trim()}]]`;
  }

  return `${prefix}[[${destination}]]`;
}

/**
 * Formats components into a standard Markdown link string.
 */
export function formatMarkdownLink(
  displayText: string,
  targetPath: string,
  anchor?: string,
  isEmbed = false
): string {
  const prefix = isEmbed ? '!' : '';
  let url = encodeURI(targetPath.trim());
  if (!url.toLowerCase().endsWith('.md') && !url.includes('.')) {
    url += '.md';
  }
  if (anchor) {
    url += `#${encodeURIComponent(anchor.trim())}`;
  }
  return `${prefix}[${displayText.trim()}](${url})`;
}

/**
 * Extracts any trailing block identifier (^a1b2c3) from a line or block text.
 */
export function extractBlockIdTag(content: string): { text: string; blockId: string | null } {
  if (!content) return { text: '', blockId: null };
  const match = /\s+\^([a-zA-Z0-9_\-]+)\s*$/.exec(content);
  if (match) {
    return {
      text: content.substring(0, match.index),
      blockId: match[1]
    };
  }
  return { text: content, blockId: null };
}

/**
 * Generates a compact 6-character random alphanumeric block identifier matching Obsidian standard.
 */
export function generateBlockIdentifier(): string {
  return Math.random().toString(36).substring(2, 8);
}

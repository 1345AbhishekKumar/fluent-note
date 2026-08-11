import type { AppContext } from '../../context';
import type { Block, BlockType, Note } from '../../../types';
import { moveCaret, esc } from '../../../utils';
import { rerenderNote, focusNextBlockOrNew } from './pickers/editorPopups';

interface ShortcutEntry {
  prefix: string;
  type: BlockType;
  strip: number;
  extra?: (block: Block) => void;
}

export function tryMarkdownShortcut(
  ctx: AppContext,
  n: Note,
  block: Block,
  blockIndex: number,
  parentList: Block[],
  text: string
): boolean {
  if (block.type === 'paragraph' || block.type === 'bullet' || block.type === 'numbered') {
    const shortcuts: ShortcutEntry[] = [
      { prefix: '### ', type: 'heading3',  strip: 4 },
      { prefix: '## ',  type: 'heading2',  strip: 3 },
      { prefix: '# ',   type: 'heading1',  strip: 2 },
      { prefix: '- [ ] ', type: 'todo',    strip: 6, extra: (b) => { b.checked = false; } },
      { prefix: '- ',   type: 'bullet',    strip: 2 },
      { prefix: '* ',   type: 'bullet',    strip: 2 },
      { prefix: '1. ',  type: 'numbered',  strip: 3 },
      { prefix: '> # ', type: 'toggle_h1', strip: 4 },
      { prefix: '> ## ',type: 'toggle_h2', strip: 5 },
      { prefix: '> ### ',type: 'toggle_h3',strip: 6 },
      { prefix: '> ',   type: 'toggle',    strip: 2 },
      { prefix: '" ',   type: 'quote',     strip: 2 },
      { prefix: '| ',   type: 'quote',     strip: 2 },
      { prefix: '--- ', type: 'divider',   strip: text.length },
      { prefix: '```mermaid ', type: 'mermaid', strip: 11, extra: (b) => {
        b.mermaidMode = 'split';
        if (!b.content || b.content.trim() === '') {
          b.content = `graph TD\n  A[Start] --> B{Is it working?}\n  B -->|Yes| C[Awesome!]\n  B -->|No| D[Debug]`;
        }
      }},
      { prefix: '/mermaid ', type: 'mermaid', strip: 9, extra: (b) => {
        b.mermaidMode = 'split';
        if (!b.content || b.content.trim() === '') {
          b.content = `graph TD\n  A[Start] --> B{Is it working?}\n  B -->|Yes| C[Awesome!]\n  B -->|No| D[Debug]`;
        }
      }},
      { prefix: '``` ', type: 'code',      strip: 4, extra: (b) => { b.language = 'plaintext'; } },
    ];

    for (const s of shortcuts) {
      if (text.startsWith(s.prefix)) {
        block.type = s.type;
        block.content = text.substring(s.strip);
        s.extra?.(block);
        rerenderNote(ctx, n);
        
        const noTextField = ['divider', 'math', 'equation', 'image', 'video', 'audio', 'pdf', 'bookmark', 'file', 'toc', 'breadcrumb'].includes(s.type);
        if (noTextField) {
          focusNextBlockOrNew(ctx, n, blockIndex, parentList);
        } else {
          const newField = ctx.elements.edBody.querySelector(`[data-id="${block.id}"] .block-text-field`) as HTMLElement;
          if (newField) moveCaret(newField);
        }
        return true;
      }
    }
  }

  if (text === '---') {
    block.type = 'divider';
    block.content = '';
    rerenderNote(ctx, n);
    focusNextBlockOrNew(ctx, n, blockIndex, parentList);
    return true;
  }

  return false;
}

export function tryInlineMarkdown(ctx: AppContext, el: HTMLElement): boolean {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return false;
  const range = sel.getRangeAt(0);
  if (!range.collapsed) return false;

  const node = range.startContainer;
  if (node.nodeType !== Node.TEXT_NODE) return false;
  
  const offset = range.startOffset;
  const text = node.textContent || '';
  const preText = text.substring(0, offset);

  const boldRegex = /(?:\s|^)\*\*(.+?)\*\*\s$/;
  const italicRegex = /(?:\s|^)\*(.+?)\*\s$/;
  const strikeRegex = /(?:\s|^)~(.+?)~\s$/;
  const codeRegex = /(?:\s|^)`(.+?)`\s$/;
  const linkRegex = /(?:\s|^)\[(.+?)\]\((.+?)\)\s$/;

  let match = preText.match(boldRegex);
  let html = '';
  if (match) {
    const hasLeadSpace = match[0].startsWith(' ');
    html = (hasLeadSpace ? ' ' : '') + `<strong>${match[1]}</strong>&nbsp;`;
  } else {
    match = preText.match(italicRegex);
    if (match) {
      const hasLeadSpace = match[0].startsWith(' ');
      html = (hasLeadSpace ? ' ' : '') + `<em>${match[1]}</em>&nbsp;`;
    } else {
      match = preText.match(strikeRegex);
      if (match) {
        const hasLeadSpace = match[0].startsWith(' ');
        html = (hasLeadSpace ? ' ' : '') + `<span style="text-decoration: line-through;">${match[1]}</span>&nbsp;`;
      } else {
        match = preText.match(codeRegex);
        if (match) {
          const hasLeadSpace = match[0].startsWith(' ');
          html = (hasLeadSpace ? ' ' : '') + `<code style="background: var(--bg3); padding: 2px 4px; border-radius: 4px; font-family: monospace;">${match[1]}</code>&nbsp;`;
        } else {
          match = preText.match(linkRegex);
          if (match) {
            const hasLeadSpace = match[0].startsWith(' ');
            html = (hasLeadSpace ? ' ' : '') + `<a href="${match[2]}" target="_blank" style="color: var(--accent); text-decoration: underline;">${esc(match[1])}</a>&nbsp;`;
          }
        }
      }
    }
  }

  if (match && html) {
    const startIdx = offset - match[0].length;
    const r = document.createRange();
    r.setStart(node, startIdx);
    r.setEnd(node, offset);
    
    sel.removeAllRanges();
    sel.addRange(r);
    
    document.execCommand('insertHTML', false, html);
    return true;
  }
  return false;
}


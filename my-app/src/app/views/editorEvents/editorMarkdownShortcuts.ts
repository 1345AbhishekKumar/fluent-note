import type { AppContext } from '../../context';
import type { Block, BlockType, Note } from '../../../types';
import { moveCaret } from '../../../utils';
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

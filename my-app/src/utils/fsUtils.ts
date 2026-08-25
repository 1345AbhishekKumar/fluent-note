import type { Note, Block, BlockType } from '../types';

export function deriveDeterministicId(relativePathOrTitle: string): string {
  const clean = relativePathOrTitle.replace(/\\/g, '/').toLowerCase().trim();
  let hash = 5381;
  for (let i = 0; i < clean.length; i++) {
    hash = ((hash << 5) + hash) + clean.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(36);
  return 'n-' + hex.padStart(5, '0').slice(0, 8);
}
import { genId } from './stringHelpers';

export function sanitizeFilename(name: string): string {
  if (!name || !name.trim()) return '';
  return name.replace(/[\\/:*?"<>|]/g, '_').trim();
}

export function blocksToMarkdown(blocks: Block[], depth = 0, maxDepth = 50): string {
  if (!blocks || blocks.length === 0 || depth > maxDepth) return '';
  let md = '';
  const indent = '  '.repeat(depth);
  for (const block of blocks) {
    let line = '';
    switch (block.type) {
      case 'heading1':
        line = `# ${block.content}`;
        break;
      case 'heading2':
        line = `## ${block.content}`;
        break;
      case 'heading3':
        line = `### ${block.content}`;
        break;
      case 'todo':
        line = `- [${block.checked ? 'x' : ' '}] ${block.content}`;
        break;
      case 'bullet':
        line = `- ${block.content}`;
        break;
      case 'numbered':
        line = `1. ${block.content}`;
        break;
      case 'quote': {
        const lines = (block.content || '').split('\n');
        line = lines.map(l => `> ${l}`).join('\n' + indent);
        break;
      }
      case 'divider':
        line = '---';
        break;
      case 'mermaid':
        line = `\`\`\`mermaid\n${block.content || ''}\n\`\`\``;
        break;
      case 'html':
        line = `\`\`\`html-preview\n${block.content || ''}\n\`\`\``;
        break;
      case 'code':
        line = `\`\`\`${block.language || 'plaintext'}\n${block.content || ''}\n\`\`\``;
        break;
      case 'math':
      case 'equation': {
        line = `$$\n${block.content || ''}\n$$`;
        break;
      }
      case 'image':
        line = `![${block.content || 'image'}](${block.url || ''})`;
        break;
      case 'video':
      case 'audio':
      case 'pdf':
        line = `[${block.content || block.type}](${block.url || ''})`;
        break;
      case 'bookmark':
        line = `[${block.bookmarkTitle || block.content || 'bookmark'}](${block.url || ''})`;
        break;
      case 'subpage':
        line = `[subpage:${block.content || 'Untitled'}](${block.url || ''})`;
        break;
      case 'callout': {
        const lines = (block.content || '').split('\n');
        const icon = block.icon || '💡';
        line = lines.map((l, idx) => {
          if (idx === 0) {
            return `> [!NOTE] ${icon} ${l}`;
          }
          return `> ${l}`;
        }).join('\n' + indent);
        break;
      }
      case 'toggle':
      case 'toggle_h1':
      case 'toggle_h2':
      case 'toggle_h3': {
        const collapsedTag = block.collapsed ? ' [collapsed]' : '';
        let prefix = '[!TOGGLE]';
        if (block.type === 'toggle_h1') prefix = '[!TOGGLE-H1]';
        else if (block.type === 'toggle_h2') prefix = '[!TOGGLE-H2]';
        else if (block.type === 'toggle_h3') prefix = '[!TOGGLE-H3]';
        line = `> ${prefix}${collapsedTag} ${block.content}`;
        break;
      }
      case 'table': {
        let grid: string[][] = [];
        try {
          grid = JSON.parse(block.content || '[]');
        } catch {
          grid = [];
        }
        if (Array.isArray(grid) && grid.length > 0) {
          const maxCols = Math.max(...grid.map(row => Array.isArray(row) ? row.length : 0), 1);
          const lines: string[] = [];
          const headerRow = (grid[0] || []).map(cell => String(cell ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' '));
          while (headerRow.length < maxCols) headerRow.push('');
          lines.push(`| ${headerRow.join(' | ')} |`);

          const delimiterRow = Array(maxCols).fill('---');
          lines.push(`| ${delimiterRow.join(' | ')} |`);

          for (let i = 1; i < grid.length; i++) {
            const row = (grid[i] || []).map(cell => String(cell ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' '));
            while (row.length < maxCols) row.push('');
            lines.push(`| ${row.join(' | ')} |`);
          }
          line = lines.join('\n' + indent);
        } else {
          line = '| Column 1 | Column 2 |\n' + indent + '| --- | --- |\n' + indent + '|  |  |';
        }
        break;
      }
      case 'column_list':
        line = `:::column-list`;
        break;
      case 'column': {
        const widthTag = block.columnWidth ? ` [width:${block.columnWidth}]` : '';
        line = `:::column${widthTag}`;
        break;
      }
      case 'template':
        line = `[template:${block.content || ''}]`;
        break;
      case 'toc':
        line = `[toc]`;
        break;
      case 'breadcrumb':
        line = `[breadcrumb]`;
        break;
      case 'subfolder':
        line = `[subfolder:${block.content || ''}](${block.url || ''})`;
        break;
      default:
        line = block.content || '';
        break;
    }

    md += `${indent}${line}\n`;

    if (block.children && block.children.length > 0 && depth < maxDepth) {
      md += blocksToMarkdown(block.children, depth + 1, maxDepth);
    }

    if (block.type === 'column_list' || block.type === 'column') {
      md += `${indent}:::\n`;
    }
  }
  return md;
}

export function markdownToBlocks(markdown: string): Block[] {
  const lines = markdown.split(/\r?\n/);
  const rootBlocks: Block[] = [];
  const levelStack: { level: number; block: Block }[] = [];

  let inCodeBlock = false;
  let codeLang = 'plaintext';
  let codeContent: string[] = [];

  let inMathBlock = false;
  let mathContent: string[] = [];

  let inBqCodeBlock = false;
  let bqCodeLang = 'plaintext';
  let bqCodeContent: string[] = [];
  let bqCodeParent: Block | null = null;

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        const isMermaid = codeLang === 'mermaid';
        const isHtml = codeLang === 'html-preview' || codeLang === 'htmlpreview';
        const blockType: BlockType = isMermaid ? 'mermaid' : (isHtml ? 'html' : 'code');
        const block: Block = {
          id: genId(),
          type: blockType,
          content: codeContent.join('\n'),
          language: blockType === 'code' ? codeLang : undefined,
          htmlMode: isHtml ? 'split' : undefined,
          mermaidMode: isMermaid ? 'split' : undefined,
          children: []
        };
        appendBlock(block, 0);
        inCodeBlock = false;
        codeContent = [];
      } else {
        inCodeBlock = true;
        codeLang = trimmed.slice(3).trim() || 'plaintext';
      }
      continue;
    }

    if (inCodeBlock) {
      codeContent.push(line);
      continue;
    }

    if (inMathBlock) {
      if (trimmed.endsWith('$$')) {
        inMathBlock = false;
        const lastLineContent = line.slice(0, line.lastIndexOf('$$'));
        if (lastLineContent.trim()) {
          mathContent.push(lastLineContent);
        }
        const block: Block = {
          id: genId(),
          type: 'math',
          content: mathContent.join('\n'),
          children: []
        };
        appendBlock(block, 0);
        mathContent = [];
      } else {
        mathContent.push(line);
      }
      continue;
    }

    if (!inCodeBlock && !inMathBlock && trimmed.startsWith('$$') && (trimmed === '$$' || !trimmed.endsWith('$$'))) {
      inMathBlock = true;
      const initialContent = trimmed.slice(2);
      if (initialContent) {
        mathContent.push(initialContent);
      }
      continue;
    }

    if (!trimmed) {
      continue;
    }

    // Handle code fences inside blockquotes (> ```)
    if (inBqCodeBlock) {
      if (trimmed.startsWith('>')) {
        const inner = trimmed.slice(1).replace(/^\s/, '');
        if (inner.startsWith('```')) {
          const isMermaid = bqCodeLang === 'mermaid';
          const isHtml = bqCodeLang === 'html-preview' || bqCodeLang === 'htmlpreview';
          const blockType: BlockType = isMermaid ? 'mermaid' : (isHtml ? 'html' : 'code');
          const codeBlock: Block = {
            id: genId(),
            type: blockType,
            content: bqCodeContent.join('\n'),
            language: blockType === 'code' ? bqCodeLang : undefined,
            htmlMode: isHtml ? 'split' : undefined,
            mermaidMode: isMermaid ? 'split' : undefined,
            children: []
          };
          if (bqCodeParent) {
            if (!bqCodeParent.children) bqCodeParent.children = [];
            bqCodeParent.children.push(codeBlock);
          } else {
            appendBlock(codeBlock, 0);
          }
          inBqCodeBlock = false;
          bqCodeContent = [];
          bqCodeParent = null;
        } else {
          bqCodeContent.push(inner);
        }
      } else {
        // Line doesn't start with >, finalize the code block
        const isMermaid = bqCodeLang === 'mermaid';
        const isHtml = bqCodeLang === 'html-preview' || bqCodeLang === 'htmlpreview';
        const blockType: BlockType = isMermaid ? 'mermaid' : (isHtml ? 'html' : 'code');
        const codeBlock: Block = {
          id: genId(),
          type: blockType,
          content: bqCodeContent.join('\n'),
          language: blockType === 'code' ? bqCodeLang : undefined,
          htmlMode: isHtml ? 'split' : undefined,
          mermaidMode: isMermaid ? 'split' : undefined,
          children: []
        };
        if (bqCodeParent) {
          if (!bqCodeParent.children) bqCodeParent.children = [];
          bqCodeParent.children.push(codeBlock);
        } else {
          appendBlock(codeBlock, 0);
        }
        inBqCodeBlock = false;
        bqCodeContent = [];
        bqCodeParent = null;
        // Don't continue — let the current line be processed normally
      }
      if (inBqCodeBlock || trimmed.startsWith('>')) continue;
    }

    if (trimmed === ':::') {
      continue;
    }

    // Detect markdown tables
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const parseRow = (str: string) => {
        const inner = str.trim().slice(1, -1);
        return inner.split(/(?<!\\)\|/).map(c => c.trim().replace(/\\\|/g, '|'));
      };
      const isDelimiter = (cells: string[]) => {
        return cells.length > 0 && cells.every(c => /^:?-+:?$/.test(c.trim()));
      };

      const headerCells = parseRow(trimmed);
      if (lineIdx + 1 < lines.length && lines[lineIdx + 1].trim().startsWith('|') && lines[lineIdx + 1].trim().endsWith('|')) {
        const nextCells = parseRow(lines[lineIdx + 1].trim());
        if (isDelimiter(nextCells)) {
          const rows: string[][] = [headerCells];
          lineIdx += 2; // skip header and delimiter
          while (lineIdx < lines.length && lines[lineIdx].trim().startsWith('|') && lines[lineIdx].trim().endsWith('|')) {
            rows.push(parseRow(lines[lineIdx].trim()));
            lineIdx++;
          }
          lineIdx--; // compensate for loop increment

          const matchIndent = line.match(/^(\s*)/);
          const indentCount = matchIndent ? matchIndent[1].length : 0;
          const level = Math.floor(indentCount / 2);

          const tableBlock: Block = {
            id: genId(),
            type: 'table',
            content: JSON.stringify(rows),
            children: []
          };
          appendBlock(tableBlock, level);
          continue;
        }
      }
    }

    const matchIndent = line.match(/^(\s*)/);
    const indentCount = matchIndent ? matchIndent[1].length : 0;
    const level = Math.floor(indentCount / 2);

    let block: Block;
    if (trimmed.startsWith(':::column-list')) {
      block = { id: genId(), type: 'column_list', content: '', children: [] };
    } else if (trimmed.startsWith(':::column')) {
      const widthMatch = trimmed.match(/\[width:(\d+)\]/);
      const columnWidth = widthMatch ? parseInt(widthMatch[1]) : undefined;
      block = { id: genId(), type: 'column', content: '', columnWidth, children: [] };
    } else if (trimmed.startsWith('>')) {
      if (trimmed.startsWith('> [!TOGGLE')) {
        const collapsed = trimmed.includes('[collapsed]');
        let type: BlockType = 'toggle';
        if (trimmed.startsWith('> [!TOGGLE-H1]')) type = 'toggle_h1';
        else if (trimmed.startsWith('> [!TOGGLE-H2]')) type = 'toggle_h2';
        else if (trimmed.startsWith('> [!TOGGLE-H3]')) type = 'toggle_h3';
        
        const content = trimmed.replace(/^>\s*\[!TOGGLE(?:-H\d)?\]\s*(?:\[collapsed\])?\s*/, '').trim();
        block = { id: genId(), type, content, collapsed, children: [] };
      } else if (trimmed.startsWith('> [!NOTE]')) {
        const rest = trimmed.replace(/^>\s*\[!NOTE\]\s*/, '').trim();
        let icon = '💡';
        let content = rest;
        const firstSpace = rest.indexOf(' ');
        if (firstSpace !== -1 && rest.length > 0 && !rest.startsWith('http')) {
          const candidateIcon = rest.slice(0, firstSpace).trim();
          if (candidateIcon.length <= 4) {
            icon = candidateIcon;
            content = rest.slice(firstSpace + 1).trim();
          }
        }
        block = { id: genId(), type: 'callout', icon, content, children: [] };
      } else {
        const quoteContent = trimmed.slice(1).replace(/^\s/, '');
        // Detect code fence inside blockquote
        if (quoteContent.startsWith('```')) {
          inBqCodeBlock = true;
          bqCodeLang = quoteContent.slice(3).trim() || 'plaintext';
          bqCodeContent = [];
          const lastAtLevel = levelStack.length > 0 && levelStack[levelStack.length - 1].level === level
            ? levelStack[levelStack.length - 1].block
            : null;
          bqCodeParent = (lastAtLevel && (lastAtLevel.type === 'quote' || lastAtLevel.type === 'callout'))
            ? lastAtLevel : null;
          continue;
        }
        const lastBlockAtLevel = levelStack.length > 0 && levelStack[levelStack.length - 1].level === level
          ? levelStack[levelStack.length - 1].block
          : null;
        if (lastBlockAtLevel && (lastBlockAtLevel.type === 'quote' || lastBlockAtLevel.type === 'callout')) {
          lastBlockAtLevel.content = (lastBlockAtLevel.content || '') + '\n' + quoteContent;
          continue;
        } else {
          block = { id: genId(), type: 'quote', content: quoteContent, children: [] };
        }
      }
    } else if (trimmed === '[toc]' || trimmed === '[[toc]]') {
      block = { id: genId(), type: 'toc', content: '', children: [] };
    } else if (trimmed === '[breadcrumb]') {
      block = { id: genId(), type: 'breadcrumb', content: '', children: [] };
    } else if (trimmed.startsWith('[subfolder:') && trimmed.endsWith(')')) {
      const match = trimmed.match(/^\[subfolder:(.*?)\]\((.*?)\)$/);
      if (match) {
        block = { id: genId(), type: 'subfolder', content: match[1], url: match[2], children: [] };
      } else {
        block = { id: genId(), type: 'paragraph', content: trimmed, children: [] };
      }
    } else if (trimmed.startsWith('[template:') && trimmed.endsWith(']')) {
      const match = trimmed.match(/^\[template:(.*?)\]$/);
      if (match) {
        block = { id: genId(), type: 'template', content: match[1], children: [] };
      } else {
        block = { id: genId(), type: 'paragraph', content: trimmed, children: [] };
      }
    } else if (trimmed.startsWith('# ')) {
      block = { id: genId(), type: 'heading1', content: trimmed.slice(2), children: [] };
    } else if (trimmed.startsWith('## ')) {
      block = { id: genId(), type: 'heading2', content: trimmed.slice(3), children: [] };
    } else if (trimmed.startsWith('### ')) {
      block = { id: genId(), type: 'heading3', content: trimmed.slice(4), children: [] };
    } else if (trimmed.startsWith('- [ ] ')) {
      block = { id: genId(), type: 'todo', content: trimmed.slice(6), checked: false, children: [] };
    } else if (trimmed.startsWith('- [x] ')) {
      block = { id: genId(), type: 'todo', content: trimmed.slice(6), checked: true, children: [] };
    } else if (trimmed.startsWith('- ')) {
      block = { id: genId(), type: 'bullet', content: trimmed.slice(2), children: [] };

    } else if (trimmed.match(/^\d+\.\s/)) {
      const content = trimmed.replace(/^\d+\.\s/, '');
      block = { id: genId(), type: 'numbered', content, children: [] };
    } else if (trimmed === '---') {
      block = { id: genId(), type: 'divider', content: '', children: [] };
    } else if (trimmed.startsWith('$$') && trimmed.endsWith('$$')) {
      block = { id: genId(), type: 'math', content: trimmed.slice(2, -2), children: [] };
    } else if (trimmed.startsWith('![') && trimmed.endsWith(')')) {
      const match = trimmed.match(/^!\[(.*?)\]\((.*?)\)$/);
      if (match) {
        block = {
          id: genId(),
          type: 'image',
          content: match[1],
          url: match[2],
          children: []
        };
      } else {
        block = { id: genId(), type: 'paragraph', content: trimmed, children: [] };
      }
    } else if (trimmed.startsWith('[subpage:') && trimmed.endsWith(')')) {
      const match = trimmed.match(/^\[subpage:(.*?)\]\((.*?)\)$/);
      if (match) {
        block = {
          id: genId(),
          type: 'subpage',
          content: match[1],
          url: match[2],
          children: []
        };
      } else {
        block = { id: genId(), type: 'paragraph', content: trimmed, children: [] };
      }
    } else if (trimmed.startsWith('[') && trimmed.endsWith(')')) {
      const match = trimmed.match(/^\[(.*?)\]\((.*?)\)$/);
      if (match) {
        const content = match[1];
        let url = match[2];
        const lowerUrl = url.toLowerCase();
        const lowerContent = content.toLowerCase();
        
        let blockType: BlockType = 'bookmark';
        let fileName: string | undefined = undefined;

        if (lowerUrl.endsWith('.pdf') || lowerContent.endsWith('.pdf') || lowerUrl.startsWith('data:application/pdf') || lowerContent === 'pdf') {
          blockType = 'pdf';
          fileName = content;
        } else if (
          /\.(mp4|webm|ogg|mov|mkv)$/i.test(lowerUrl) || 
          /\.(mp4|webm|ogg|mov|mkv)$/i.test(lowerContent) ||
          lowerUrl.startsWith('data:video') ||
          lowerContent === 'video'
        ) {
          blockType = 'video';
        } else if (
          /\.(mp3|wav|m4a|ogg|aac|flac)$/i.test(lowerUrl) || 
          /\.(mp3|wav|m4a|ogg|aac|flac)$/i.test(lowerContent) ||
          lowerUrl.startsWith('data:audio') ||
          lowerContent === 'audio'
        ) {
          blockType = 'audio';
        } else if (lowerUrl.startsWith('fluent-file://') || lowerUrl.startsWith('data:') || lowerContent === 'file') {
          blockType = 'file';
          fileName = content;
        }

        if (blockType === 'bookmark' && url && !/^(https?:\/\/|file:\/\/|mailto:|tel:)/i.test(url)) {
          url = 'https://' + url;
        }

        block = {
          id: genId(),
          type: blockType,
          content,
          url,
          fileName,
          children: []
        };
      } else {
        block = { id: genId(), type: 'paragraph', content: trimmed, children: [] };
      }
    } else {
      block = { id: genId(), type: 'paragraph', content: trimmed, children: [] };
    }

    appendBlock(block, level);
  }

  function appendBlock(block: Block, level: number) {
    while (levelStack.length > 0 && levelStack[levelStack.length - 1].level >= level) {
      levelStack.pop();
    }

    if (levelStack.length > 0) {
      const parent = levelStack[levelStack.length - 1].block;
      if (!parent.children) parent.children = [];
      parent.children.push(block);
    } else {
      rootBlocks.push(block);
    }

    levelStack.push({ level, block });
  }

  if (rootBlocks.length === 0) {
    rootBlocks.push({ id: genId(), type: 'paragraph', content: '', children: [] });
  }
  return rootBlocks;
}

export function serializeNoteToMarkdown(note: Note): string {
  const yamlParts = [
    '---',
    `id: ${JSON.stringify(note.id)}`,
    `nb: ${JSON.stringify(note.nb)}`,
    `tags: ${JSON.stringify(note.tags)}`,
    `pinned: ${note.pinned}`,
    `date: ${JSON.stringify(note.date)}`,
    `title: ${JSON.stringify(note.title)}`,
    `authors: ${JSON.stringify(note.authors || '')}`,
    `journal: ${JSON.stringify(note.journal || '')}`,
    `year: ${JSON.stringify(note.year || '')}`,
    `status: ${JSON.stringify(note.status || '')}`,
    `archived: ${note.archived || false}`,
    `parentId: ${JSON.stringify(note.parentId || null)}`,
    `ord: ${note.ord}`,
    '---'
  ];

  const body = blocksToMarkdown(note.blocks);
  return `${yamlParts.join('\n')}\n\n${body}`;
}

export function deserializeMarkdownToNote(content: string, fallbackId?: string): Note {
  const match = content.match(/^---\r?\n([\s\S]+?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    const parsedBlocks = markdownToBlocks(content);
    const resolvedId = fallbackId || deriveDeterministicId(content.slice(0, 100) || 'untitled');
    return {
      id: resolvedId,
      nb: 'design',
      tags: [],
      pinned: false,
      date: 'Just now',
      title: 'Untitled Note',
      body: content,
      blocks: parsedBlocks,
      ord: 0,
      parentId: null
    };
  }

  const frontmatterStr = match[1];
  const markdownBody = match[2].trim();

  const metadata: any = {};
  const lines = frontmatterStr.split(/\r?\n/);
  for (const line of lines) {
    const colonIdx = line.indexOf(':');
    if (colonIdx !== -1) {
      const key = line.slice(0, colonIdx).trim();
      const val = line.slice(colonIdx + 1).trim();
      try {
        metadata[key] = JSON.parse(val);
      } catch (e) {
        metadata[key] = val;
      }
    }
  }

  const noteId = metadata.id || fallbackId || deriveDeterministicId(metadata.title || 'untitled');
  let blocks: Block[] = [];
  if (markdownBody.length > 0) {
    blocks = markdownToBlocks(markdownBody);
  } else if (metadata.blocks) {
    if (typeof metadata.blocks === 'string') {
      try {
        blocks = JSON.parse(metadata.blocks);
      } catch (e) {
        blocks = markdownToBlocks(markdownBody);
      }
    } else if (Array.isArray(metadata.blocks)) {
      blocks = metadata.blocks;
    }
  }

  if (blocks.length === 0) {
    blocks = [{ id: genId(), type: 'paragraph', content: '', children: [] }];
  }

  return {
    id: noteId,
    nb: metadata.nb || 'design',
    tags: Array.isArray(metadata.tags) ? metadata.tags : [],
    pinned: !!metadata.pinned,
    date: metadata.date || 'Just now',
    title: metadata.title || '',
    body: markdownBody,
    blocks: blocks,
    ord: typeof metadata.ord === 'number' ? metadata.ord : 0,
    authors: metadata.authors || '',
    journal: metadata.journal || '',
    year: metadata.year || '',
    status: metadata.status || undefined,
    archived: !!metadata.archived,
    parentId: metadata.parentId || null
  };
}

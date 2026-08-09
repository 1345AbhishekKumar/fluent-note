import type { Note, Block, BlockType } from '../types';

export function sanitizeFilename(name: string): string {
  if (!name || !name.trim()) return '';
  return name.replace(/[\\/:*?"<>|]/g, '_').trim();
}

export function blocksToMarkdown(blocks: Block[], depth = 0): string {
  if (!blocks || blocks.length === 0) return '';
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
      case 'quote':
        line = `> ${block.content}`;
        break;
      case 'divider':
        line = '---';
        break;
      case 'code':
        line = `\`\`\`${block.language || 'plaintext'}\n${block.content || ''}\n\`\`\``;
        break;
      case 'math':
      case 'equation':
        line = `$$${block.content}$$`;
        break;
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
      case 'callout':
        line = `> [!NOTE] ${block.icon || 'ℹ️'}\n${indent}> ${block.content}`;
        break;
      default:
        line = block.content || '';
        break;
    }

    md += `${indent}${line}\n`;

    if (block.children && block.children.length > 0) {
      md += blocksToMarkdown(block.children, depth + 1);
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

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        const block: Block = {
          id: 'b-' + Math.random().toString(36).slice(2, 7),
          type: 'code',
          content: codeContent.join('\n'),
          language: codeLang,
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

    if (!trimmed) {
      continue;
    }

    const matchIndent = line.match(/^(\s*)/);
    const indentCount = matchIndent ? matchIndent[1].length : 0;
    const level = Math.floor(indentCount / 2);

    let block: Block;
    if (trimmed.startsWith('# ')) {
      block = { id: 'b-' + Math.random().toString(36).slice(2, 7), type: 'heading1', content: trimmed.slice(2), children: [] };
    } else if (trimmed.startsWith('## ')) {
      block = { id: 'b-' + Math.random().toString(36).slice(3, 8), type: 'heading2', content: trimmed.slice(3), children: [] };
    } else if (trimmed.startsWith('### ')) {
      block = { id: 'b-' + Math.random().toString(36).slice(4, 9), type: 'heading3', content: trimmed.slice(4), children: [] };
    } else if (trimmed.startsWith('- [ ] ')) {
      block = { id: 'b-' + Math.random().toString(36).slice(6, 11), type: 'todo', content: trimmed.slice(6), checked: false, children: [] };
    } else if (trimmed.startsWith('- [x] ')) {
      block = { id: 'b-' + Math.random().toString(36).slice(6, 11), type: 'todo', content: trimmed.slice(6), checked: true, children: [] };
    } else if (trimmed.startsWith('- ')) {
      block = { id: 'b-' + Math.random().toString(36).slice(2, 7), type: 'bullet', content: trimmed.slice(2), children: [] };
    } else if (trimmed.startsWith('> [!NOTE]')) {
      block = { id: 'b-' + Math.random().toString(36).slice(9, 14), type: 'callout', content: trimmed.replace(/^>\s*\[!NOTE\]\s*/, ''), children: [] };
    } else if (trimmed.startsWith('> ')) {
      block = { id: 'b-' + Math.random().toString(36).slice(2, 7), type: 'quote', content: trimmed.slice(2), children: [] };
    } else if (trimmed.match(/^\d+\.\s/)) {
      const content = trimmed.replace(/^\d+\.\s/, '');
      block = { id: 'b-' + Math.random().toString(36).slice(2, 7), type: 'numbered', content, children: [] };
    } else if (trimmed === '---') {
      block = { id: 'b-' + Math.random().toString(36).slice(2, 7), type: 'divider', content: '', children: [] };
    } else if (trimmed.startsWith('$$') && trimmed.endsWith('$$')) {
      block = { id: 'b-' + Math.random().toString(36).slice(2, 7), type: 'math', content: trimmed.slice(2, -2), children: [] };
    } else if (trimmed.startsWith('![') && trimmed.endsWith(')')) {
      const match = trimmed.match(/^!\[(.*?)\]\((.*?)\)$/);
      if (match) {
        block = {
          id: 'b-' + Math.random().toString(36).slice(2, 7),
          type: 'image',
          content: match[1],
          url: match[2],
          children: []
        };
      } else {
        block = { id: 'b-' + Math.random().toString(36).slice(2, 7), type: 'paragraph', content: trimmed, children: [] };
      }
    } else if (trimmed.startsWith('[subpage:') && trimmed.endsWith(')')) {
      const match = trimmed.match(/^\[subpage:(.*?)\]\((.*?)\)$/);
      if (match) {
        block = {
          id: 'b-' + Math.random().toString(36).slice(2, 7),
          type: 'subpage',
          content: match[1],
          url: match[2],
          children: []
        };
      } else {
        block = { id: 'b-' + Math.random().toString(36).slice(2, 7), type: 'paragraph', content: trimmed, children: [] };
      }
    } else if (trimmed.startsWith('[') && trimmed.endsWith(')')) {
      const match = trimmed.match(/^\[(.*?)\]\((.*?)\)$/);
      if (match) {
        const content = match[1];
        let url = match[2];
        let blockType: BlockType = 'bookmark';
        if (content.toLowerCase() === 'video') blockType = 'video';
        else if (content.toLowerCase() === 'audio') blockType = 'audio';
        else if (content.toLowerCase() === 'pdf') blockType = 'pdf';

        if (blockType === 'bookmark' && url && !/^(https?:\/\/|file:\/\/|mailto:|tel:)/i.test(url)) {
          url = 'https://' + url;
        }

        block = {
          id: 'b-' + Math.random().toString(36).slice(2, 7),
          type: blockType,
          content,
          url,
          children: []
        };
      } else {
        block = { id: 'b-' + Math.random().toString(36).slice(2, 7), type: 'paragraph', content: trimmed, children: [] };
      }
    } else {
      block = { id: 'b-' + Math.random().toString(36).slice(2, 7), type: 'paragraph', content: trimmed, children: [] };
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
    rootBlocks.push({ id: 'b-' + Math.random().toString(36).slice(2, 7), type: 'paragraph', content: '', children: [] });
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
    `blocks: ${JSON.stringify(note.blocks)}`,
    '---'
  ];

  const body = blocksToMarkdown(note.blocks);
  return `${yamlParts.join('\n')}\n\n${body}`;
}

export function deserializeMarkdownToNote(content: string, fallbackId: string): Note {
  const match = content.match(/^---\r?\n([\s\S]+?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    const parsedBlocks = markdownToBlocks(content);
    return {
      id: fallbackId,
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

  const noteId = metadata.id || fallbackId;
  let blocks: Block[] = [];
  if (metadata.blocks) {
    if (typeof metadata.blocks === 'string') {
      try {
        blocks = JSON.parse(metadata.blocks);
      } catch (e) {
        blocks = markdownToBlocks(markdownBody);
      }
    } else if (Array.isArray(metadata.blocks)) {
      blocks = metadata.blocks;
    }
  } else {
    blocks = markdownToBlocks(markdownBody);
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

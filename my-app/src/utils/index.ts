import type { Block, Note, BlockType, Folder } from '../types';
import { sharedNotebooks as NBS } from '../store/notebookStore';

const dragHandleSvg = '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="1.5" class="f"/><circle cx="9" cy="12" r="1.5" class="f"/><circle cx="9" cy="16" r="1.5" class="f"/><circle cx="15" cy="8" r="1.5" class="f"/><circle cx="15" cy="12" r="1.5" class="f"/><circle cx="15" cy="16" r="1.5" class="f"/></svg>';

export const genId = () => 'b' + Math.random().toString(36).slice(2, 7);

export function htmlToBlocks(html: string): Block[] {
  const d = document.createElement('div');
  d.innerHTML = html;
  const blocks: Block[] = [];
  
  function walk(node: Node) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const tag = el.tagName.toLowerCase();
      
      if (tag === 'h2') {
        blocks.push({ id: genId(), type: 'heading1', content: el.textContent || '', children: [] });
      } else if (tag === 'h3') {
        blocks.push({ id: genId(), type: 'heading2', content: el.textContent || '', children: [] });
      } else if (tag === 'li') {
        const isTodo = el.querySelector('input[type="checkbox"]') !== null || el.textContent?.trim().startsWith('[ ]') || el.textContent?.trim().startsWith('[x]');
        const checked = el.querySelector('input[type="checkbox"]') ? (el.querySelector('input[type="checkbox"]') as HTMLInputElement).checked : false;
        let content = el.textContent || '';
        if (content.startsWith('[ ]') || content.startsWith('[x]')) {
          content = content.substring(3).trim();
        }
        blocks.push({
          id: genId(),
          type: isTodo ? 'todo' : 'paragraph',
          content: content,
          checked: isTodo ? checked : undefined,
          children: []
        });
      } else if (tag === 'p' || tag === 'blockquote' || tag === 'div') {
        if (el.children.length === 0 || (el.children.length === 1 && el.children[0].tagName.toLowerCase() === 'br')) {
          blocks.push({ id: genId(), type: 'paragraph', content: el.textContent || '', children: [] });
        } else {
          Array.from(el.childNodes).forEach(child => walk(child));
        }
      } else {
        const isBlockTag = ['ul', 'ol', 'section', 'article'].includes(tag);
        if (isBlockTag) {
          Array.from(el.childNodes).forEach(child => walk(child));
        } else {
          const text = el.textContent || '';
          if (text.trim()) {
            blocks.push({ id: genId(), type: 'paragraph', content: text, children: [] });
          }
        }
      }
    } else if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      if (text.trim()) {
        blocks.push({ id: genId(), type: 'paragraph', content: text.trim(), children: [] });
      }
    }
  }
  
  Array.from(d.childNodes).forEach(child => walk(child));
  
  if (blocks.length === 0) {
    blocks.push({ id: genId(), type: 'paragraph', content: '', children: [] });
  }
  return blocks;
}

export function blocksToHtml(blocks: Block[]): string {
  if (!blocks || blocks.length === 0) return '';
  let html = '';
  for (const block of blocks) {
    if (block.type === 'heading1') {
      html += `<h2>${esc(block.content)}</h2>`;
    } else if (block.type === 'heading2') {
      html += `<h3>${esc(block.content)}</h3>`;
    } else if (block.type === 'todo') {
      const checkedAttr = block.checked ? 'checked' : '';
      html += `<p><input type="checkbox" ${checkedAttr} disabled> ${esc(block.content)}</p>`;
    } else {
      html += `<p>${esc(block.content)}</p>`;
    }
    if (block.children && block.children.length > 0) {
      html += blocksToHtml(block.children);
    }
  }
  return html;
}

export function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function strip(html: string): string {
  const d = document.createElement('div');
  d.innerHTML = html;
  return (d.textContent || '').replace(/\s+/g, ' ').trim();
}

export function renderLinksInContent(content: string): string {
  let html = esc(content);
  html = html.replace(/\[\[(.*?)\]\]/g, (match, title) => {
    return `<span class="wiki-link" data-ref="${title}" contenteditable="false" style="color: var(--accent); text-decoration: underline; cursor: pointer;">[[${title}]]</span>\u200B`;
  });
  html = html.replace(/@([a-zA-Z0-9\s-_]+?)(?=\s+(?:and|or|for|with|is|are|was|were|the|a|an|in|at|on|of|to|from|by|about|as)\s+|[\.,\?!\;:()]|$)/gi, (match, title) => {
    return `<span class="wiki-link" data-ref="${title}" contenteditable="false" style="color: var(--accent); text-decoration: underline; cursor: pointer;">@${title}</span>\u200B`;
  });
  // Render date badges
  html = html.replace(/📅\s*(\d{4}-\d{2}-\d{2})/g, (match, dateStr) => {
    return `<span class="date-badge" data-date="${dateStr}" contenteditable="false" style="background: var(--bg3, rgba(0, 120, 212, 0.08)); color: var(--accent); padding: 2px 6px; border-radius: 4px; font-size: 12.5px; border: 1px solid var(--border); display: inline-flex; align-items: center; gap: 4px; cursor: pointer; user-select: none;">📅 ${dateStr}</span>\u200B`;
  });
  // Render inline equations: $$...$$
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
        renderedTex = `<span style="color:var(--danger)">\$\${esc(texStr)}\$\$</span>`;
      }
    } else {
      renderedTex = `\$\${esc(texStr)}\$\$`;
    }
    return `<span class="math-badge" data-tex="${esc(texStr)}" contenteditable="false" style="background: var(--bg3, rgba(0, 120, 212, 0.08)); color: var(--accent); padding: 2px 6px; border-radius: 4px; font-size: 12.5px; border: 1px solid var(--border); display: inline-flex; align-items: center; cursor: pointer; user-select: none;">${renderedTex}</span>\u200B`;
  });
  return html;
}

export function renderBlockTree(
  blocks: Block[], 
  level: number = 0, 
  rootBlocks?: Block[], 
  contextInfo?: { note: Note; allNotes: Note[] }
): string {
  if (!blocks || blocks.length === 0) return '';
  return blocks.map((block, blockIndex) => {
    const type = block.type;
    const commentHtml = block.comment 
      ? `<div class="block-comment-badge" title="${esc(block.comment)}">💬</div>` 
      : '';
    let textStyle = '';
    if (block.textColor) textStyle += `color:${block.textColor};`;
    const inlineTextStyle = textStyle ? `style="${textStyle}"` : '';

    let bgStyle = '';
    if (block.bgColor) bgStyle += `background-color:${block.bgColor};`;
    const inlineBgStyle = bgStyle ? `style="${bgStyle}"` : '';

    // ── placeholder text per type ──────────────────────────────────────────
    const placeholderMap: Partial<Record<BlockType, string>> = {
      heading1: 'Heading 1', heading2: 'Heading 2', heading3: 'Heading 3',
      todo: 'To-do', bullet: 'Bullet item', numbered: 'Numbered item',
      quote: 'Quote…', toggle: 'Toggle heading…', code: '// code…',
    };
    const placeholder = placeholderMap[type] ?? 'Start writing…';
    const checkedClass = (type === 'todo' && block.checked) ? 'checked' : '';

    const dragHandle = `<div class="block-drag-handle" draggable="true">${dragHandleSvg}</div>`;
    const levelStyle = `style="--level: ${level}"`;

    // ── divider: no text field, no drag ───────────────────────────────────
    if (type === 'divider') {
      return `<div class="block-wrapper block-divider-wrapper" data-id="${block.id}" data-type="divider" ${levelStyle}>
        ${dragHandle}
        <hr class="block-divider" />
      </div>`;
    }

    // ── code block ────────────────────────────────────────────────────────
    if (type === 'code') {
      const lang = block.language || 'plaintext';
      const wrapClass = block.codeWrap ? 'wrap-text' : '';
      const fullWidthClass = block.codeFullWidth ? 'full-width' : '';
      
      const hasPrism = typeof window !== 'undefined' && (window as any).Prism;
      let highlighted = esc(block.content || '');
      if (hasPrism && block.content && lang !== 'plaintext') {
        try {
          const grammar = (window as any).Prism.languages[lang];
          if (grammar) {
            highlighted = (window as any).Prism.highlight(block.content, grammar, lang);
          }
        } catch (e) {
          console.error(e);
        }
      }

      const langOptions = [
        { val: 'plaintext', label: 'Plain Text' },
        { val: 'javascript', label: 'JavaScript' },
        { val: 'typescript', label: 'TypeScript' },
        { val: 'html', label: 'HTML' },
        { val: 'css', label: 'CSS' },
        { val: 'json', label: 'JSON' },
        { val: 'python', label: 'Python' },
        { val: 'sql', label: 'SQL' },
        { val: 'cpp', label: 'C++' },
        { val: 'java', label: 'Java' },
        { val: 'rust', label: 'Rust' }
      ];

      const selectHtml = `<select class="code-lang-select" data-id="${block.id}" style="background: transparent; border: none; font-size: 11px; font-weight: 600; color: var(--text3); cursor: pointer; font-family: monospace; outline: none; text-transform: uppercase; padding-right: 4px;">
        ${langOptions.map(o => `<option value="${o.val}" ${lang === o.val ? 'selected' : ''}>${o.label}</option>`).join('')}
      </select>`;

      return `<div class="block-wrapper block-code-wrapper ${fullWidthClass} ${wrapClass}" data-id="${block.id}" data-type="code" ${levelStyle}>
        ${dragHandle}
        <div class="block-code-wrap" ${inlineBgStyle}>
          <div class="block-code-header">
            ${selectHtml}
            <div style="display: flex; gap: 8px; align-items: center;">
              <button class="code-wrap-btn ${block.codeWrap ? 'active' : ''}" data-id="${block.id}" title="Toggle Wrap text" style="font-size: 11px; font-weight: 500; color: var(--text2); background: none; border: 1px solid var(--border); border-radius: 4px; padding: 2px 8px; cursor: pointer;">Wrap</button>
              <button class="code-fullwidth-btn ${block.codeFullWidth ? 'active' : ''}" data-id="${block.id}" title="Toggle Full width" style="font-size: 11px; font-weight: 500; color: var(--text2); background: none; border: 1px solid var(--border); border-radius: 4px; padding: 2px 8px; cursor: pointer;">↔</button>
              <button class="code-copy-btn" data-id="${block.id}" title="Copy code">Copy</button>
            </div>
          </div>
          <div class="block-text-field block-code-field" ${inlineTextStyle} contenteditable="true" spellcheck="false" data-ph="${placeholder}">${highlighted}</div>
        </div>
      </div>`;
    }

    // ── media / embed blocks ──────────────────────────────────────────────
    if (type === 'image') {
      const inner = block.url
        ? `<img class="block-media-img" src="${block.url}" alt="${esc(block.content || 'image')}" />`
        : `<div class="block-media-placeholder" data-prompt="image" data-id="${block.id}">🖼 Click to add image</div>`;
      return `<div class="block-wrapper" data-id="${block.id}" data-type="image" ${levelStyle}>
        ${dragHandle}<div class="block-media-container">${inner}</div>
      </div>`;
    }
    if (type === 'video') {
      const inner = block.url
        ? `<video class="block-media-video" src="${block.url}" controls></video>`
        : `<div class="block-media-placeholder" data-prompt="video" data-id="${block.id}">🎬 Click to add video</div>`;
      return `<div class="block-wrapper" data-id="${block.id}" data-type="video" ${levelStyle}>
        ${dragHandle}<div class="block-media-container">${inner}</div>
      </div>`;
    }
    if (type === 'audio') {
      const inner = block.url
        ? `<audio class="block-media-audio" src="${block.url}" controls></audio>`
        : `<div class="block-media-placeholder" data-prompt="audio" data-id="${block.id}">🎵 Click to add audio</div>`;
      return `<div class="block-wrapper" data-id="${block.id}" data-type="audio" ${levelStyle}>
        ${dragHandle}<div class="block-media-container">${inner}</div>
      </div>`;
    }
    if (type === 'pdf') {
      const inner = block.url
        ? `<iframe class="block-media-pdf" src="${block.url}" title="PDF"></iframe>`
        : `<div class="block-media-placeholder" data-prompt="pdf" data-id="${block.id}">📄 Click to embed PDF</div>`;
      return `<div class="block-wrapper" data-id="${block.id}" data-type="pdf" ${levelStyle}>
        ${dragHandle}<div class="block-media-container">${inner}</div>
      </div>`;
    }
    if (type === 'bookmark') {
      const inner = block.url
        ? `<a class="block-bookmark-link" href="${block.url}" target="_blank" rel="noopener">
             <span class="bookmark-icon">🔖</span>
             <span class="bookmark-text">${esc(block.content || block.url)}</span>
             <span class="bookmark-url">${esc(block.url)}</span>
           </a>`
        : `<div class="block-media-placeholder" data-prompt="bookmark" data-id="${block.id}">🔖 Click to add web bookmark</div>`;
      return `<div class="block-wrapper" data-id="${block.id}" data-type="bookmark" ${levelStyle}>
        ${dragHandle}<div class="block-bookmark">${inner}</div>
      </div>`;
    }
    if (type === 'file') {
      const inner = block.url
        ? `<a class="block-file-link" href="${block.url}" download="${block.fileName || 'file'}">
             <span class="file-icon">📎</span>
             <span class="file-name">${esc(block.fileName || block.content || 'File')}</span>
           </a>`
        : `<div class="block-media-placeholder" data-prompt="file" data-id="${block.id}">📎 Click to upload file</div>`;
      return `<div class="block-wrapper" data-id="${block.id}" data-type="file" ${levelStyle}>
        ${dragHandle}<div class="block-file">${inner}</div>
      </div>`;
    }

    // ── equation / math blocks ────────────────────────────────────────────
    if (type === 'equation' || type === 'math') {
      let mathHtml = '';
      const isMath = type === 'math';
      const rawContent = block.content || '';
      
      const hasKatex = typeof window !== 'undefined' && (window as any).katex;
      if (rawContent) {
        if (hasKatex) {
          try {
            mathHtml = (window as any).katex.renderToString(rawContent, {
              throwOnError: false,
              displayMode: isMath
            });
          } catch (err) {
            mathHtml = `<span style="color:var(--danger)">${esc(rawContent)}</span>`;
          }
        } else {
          mathHtml = `<div class="block-math-display" style="background: var(--bg2); padding: 12px; border-radius: 6px; font-family: monospace; font-size: 14px;">${esc(rawContent)}</div>`;
        }
      } else {
        mathHtml = `<div class="block-media-placeholder" data-prompt="math" data-id="${block.id}">∫ Click to add equation (TeX)</div>`;
      }

      return `<div class="block-wrapper" data-id="${block.id}" data-type="${type}" ${levelStyle}>
        ${dragHandle}
        <div class="block-math" data-id="${block.id}" style="cursor: pointer;">
          ${mathHtml}
        </div>
      </div>`;
    }

    // ── TOC block ─────────────────────────────────────────────────────────
    if (type === 'toc') {
      const activeRoot = rootBlocks || blocks;
      const headings: { level: number; text: string; id: string }[] = [];
      function walk(list: Block[]) {
        for (const b of list) {
          if (b.type === 'heading1') headings.push({ level: 1, text: b.content, id: b.id });
          else if (b.type === 'heading2') headings.push({ level: 2, text: b.content, id: b.id });
          else if (b.type === 'heading3') headings.push({ level: 3, text: b.content, id: b.id });
          if (b.children?.length) walk(b.children);
        }
      }
      walk(activeRoot);
      const tocHtml = headings.length === 0
        ? '<div style="color:var(--text3);font-size:12.5px;font-style:italic">No headings found</div>'
        : headings.map(h =>
            `<div class="toc-item toc-h${h.level}" style="padding-left:${(h.level - 1) * 12}px">
              <a class="toc-link" href="#" data-blockid="${h.id}" style="color:var(--accent); text-decoration:none; display:block; padding: 2px 0;">${esc(h.text) || '(untitled)'}</a>
            </div>`
          ).join('');

      return `<div class="block-wrapper" data-id="${block.id}" data-type="toc" ${levelStyle}>
        ${dragHandle}
        <div class="block-toc" style="background: var(--bg2); border-radius: 8px; padding: 12px 16px; border: 1px solid var(--border);"><div class="toc-label" style="font-weight:600; font-size: 13.5px; margin-bottom: 6px; color: var(--text1);">📋 Table of Contents</div>${tocHtml}</div>
      </div>`;
    }

    // ── Breadcrumb block ──────────────────────────────────────────────────
    if (type === 'breadcrumb') {
      let crumbHtml = '';
      if (contextInfo) {
        const { note, allNotes } = contextInfo;
        const crumbs: string[] = [];
        let parentId = note.parentId;
        let safety = 0;
        while (parentId && safety++ < 10) {
          const parent = allNotes.find(x => x.id === parentId);
          if (!parent) break;
          crumbs.unshift(`<a class="bc-link" href="#" data-noteid="${parent.id}" style="color: var(--accent); text-decoration: none;">${esc(parent.title || 'Untitled')}</a>`);
          parentId = parent.parentId;
        }
        crumbs.push(`<span class="bc-current" style="color: var(--text2); font-weight: 500;">${esc(note.title || 'Untitled')}</span>`);
        crumbHtml = crumbs.join('<span class="bc-sep" style="margin: 0 4px; color: var(--text3);"> › </span>');
      } else {
        crumbHtml = block.content || '<span style="color:var(--text3);font-size:12px">Breadcrumb</span>';
      }

      return `<div class="block-wrapper" data-id="${block.id}" data-type="breadcrumb" ${levelStyle}>
        ${dragHandle}
        <nav class="block-breadcrumb" style="font-size: 12.5px; background: var(--bg2); padding: 8px 12px; border-radius: 6px; border: 1px solid var(--border);">${crumbHtml}</nav>
      </div>`;
    }

    // ── Template block ────────────────────────────────────────────────────
    if (type === 'template') {
      const childrenHtml = (block.children && block.children.length > 0)
        ? `<div class="block-children-container template-children" style="margin-top: 8px; border-top: 1px solid var(--border); padding-top: 8px;">${renderBlockTree(block.children, level + 1, rootBlocks || blocks, contextInfo)}</div>`
        : `<div class="block-children-container template-children" style="margin-top: 8px; border-top: 1px solid var(--border); padding-top: 8px; min-height: 20px;"></div>`;
      return `<div class="block-wrapper" data-id="${block.id}" data-type="template" ${levelStyle}>
        <div class="block-main-row">
          ${dragHandle}
          <div class="block-template-config" style="border: 1px dashed var(--border); border-radius: 8px; padding: 10px; width: 100%; background: var(--bg2);">
            <div class="template-header-row" style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
              <button class="template-trigger-btn" data-id="${block.id}" style="flex-shrink: 0; background: var(--accent); color: #fff; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 12px;">🔁 Insert Template</button>
              <span class="template-label" style="font-size: 11.5px; color: var(--text3); font-weight: 500; flex-shrink: 0;">Button Label:</span>
              <div class="block-text-field template-button-name" contenteditable="true" spellcheck="false" data-ph="Template button name" style="flex: 1; min-width: 100px; border-bottom: 1px dashed var(--border); padding: 2px 4px; font-size: 12.5px; color: var(--text1); font-weight: 500;">${esc(block.content || 'Template button')}</div>
            </div>
            ${childrenHtml}
          </div>
        </div>
      </div>`;
    }

    // ── toggle block ──────────────────────────────────────────────────────
    if (type === 'toggle' || type === 'toggle_h1' || type === 'toggle_h2' || type === 'toggle_h3') {
      const isCollapsed = block.collapsed ? 'collapsed' : '';
      const children = (!block.collapsed && block.children && block.children.length > 0)
        ? `<div class="block-children-container block-toggle-children">${renderBlockTree(block.children, level + 1, rootBlocks || blocks, contextInfo)}</div>`
        : (block.children && block.children.length > 0
            ? `<div class="block-children-container block-toggle-children" style="display:none">${renderBlockTree(block.children, level + 1, rootBlocks || blocks, contextInfo)}</div>`
            : `<div class="block-children-container block-toggle-children" style="${block.collapsed ? 'display:none' : ''}"></div>`);
      const toggleHeaderClass = (type === 'toggle_h1') ? ' toggle-h1' : (type === 'toggle_h2') ? ' toggle-h2' : (type === 'toggle_h3') ? ' toggle-h3' : '';
      return `<div class="block-wrapper ${isCollapsed}" data-id="${block.id}" data-type="${type}" ${levelStyle}>
        <div class="block-main-row">
          ${dragHandle}
          <div class="block-content-container" ${inlineBgStyle}>
            <button class="toggle-arrow-btn" data-id="${block.id}">▶</button>
            <div class="block-text-field" ${inlineTextStyle} contenteditable="true" spellcheck="false" data-ph="${placeholder}">${renderLinksInContent(block.content)}</div>
            ${commentHtml}
          </div>
        </div>
        ${children}
      </div>`;
    }

    // ── all remaining text-based blocks ───────────────────────────────────
    const childrenHtml = (block.children && block.children.length > 0)
      ? `<div class="block-children-container">${renderBlockTree(block.children, level + 1, rootBlocks || blocks, contextInfo)}</div>`
      : `<div class="block-children-container"></div>`;

    // Bullet list items
    if (type === 'bullet') {
      return `<div class="block-wrapper" data-id="${block.id}" data-type="bullet" ${levelStyle}>
        <div class="block-main-row">
          ${dragHandle}
          <div class="block-content-container" ${inlineBgStyle}>
            <div class="block-list-marker-gutter">
              <span class="block-bullet-marker">•</span>
            </div>
            <div class="block-text-field" ${inlineTextStyle} contenteditable="true" spellcheck="false" data-ph="${placeholder}">${renderLinksInContent(block.content)}</div>
            ${commentHtml}
          </div>
        </div>
        ${childrenHtml}
      </div>`;
    }

    // Numbered list items - compute sequential number from consecutive siblings
    if (type === 'numbered') {
      let num = 1;
      for (let i = blockIndex - 1; i >= 0; i--) {
        if (blocks[i].type === 'numbered') num++;
        else break;
      }
      return `<div class="block-wrapper" data-id="${block.id}" data-type="numbered" ${levelStyle}>
        <div class="block-main-row">
          ${dragHandle}
          <div class="block-content-container" ${inlineBgStyle}>
            <div class="block-list-marker-gutter">
              <span class="block-numbered-marker">${num}.</span>
            </div>
            <div class="block-text-field" ${inlineTextStyle} contenteditable="true" spellcheck="false" data-ph="${placeholder}">${renderLinksInContent(block.content)}</div>
            ${commentHtml}
          </div>
        </div>
        ${childrenHtml}
      </div>`;
    }

    // Quote block
    if (type === 'quote') {
      return `<div class="block-wrapper" data-id="${block.id}" data-type="quote" ${levelStyle}>
        <div class="block-main-row">
          ${dragHandle}
          <div class="block-content-container" ${inlineBgStyle}>
            <div class="block-quote">
              <div class="block-text-field" ${inlineTextStyle} contenteditable="true" spellcheck="false" data-ph="${placeholder}">${renderLinksInContent(block.content)}</div>
              ${commentHtml}
            </div>
          </div>
        </div>
        ${childrenHtml}
      </div>`;
    }

    // Standard text-based blocks: paragraph, heading1, heading2, heading3, todo
    return `<div class="block-wrapper ${checkedClass}" data-id="${block.id}" data-type="${block.type}" ${levelStyle}>
      <div class="block-main-row">
        ${dragHandle}
        <div class="block-content-container" ${inlineBgStyle}>
          ${type === 'todo' ? `
          <div class="block-list-marker-gutter">
            <input type="checkbox" class="block-todo-checkbox" ${block.checked ? 'checked' : ''}>
          </div>` : ''}
          <div class="block-text-field" ${inlineTextStyle} contenteditable="true" spellcheck="false" data-ph="${placeholder}">${renderLinksInContent(block.content)}</div>
          ${commentHtml}
        </div>
      </div>
      ${childrenHtml}
    </div>`;
  }).join('');
}

export function findBlockById(blocks: Block[], id: string, parentList: Block[] = []): { block: Block, parentList: Block[], index: number } | null {
  for (let i = 0; i < blocks.length; i++) {
    if (blocks[i].id === id) {
      return { block: blocks[i], parentList: blocks, index: i };
    }
    const childMatch = findBlockById(blocks[i].children, id, blocks[i].children);
    if (childMatch) return childMatch;
  }
  return null;
}

export function getBlockLevel(rootBlocks: Block[], id: string, currentLevel: number = 0): number {
  for (const block of rootBlocks) {
    if (block.id === id) return currentLevel;
    const childLevel = getBlockLevel(block.children, id, currentLevel + 1);
    if (childLevel !== -1) return childLevel;
  }
  return -1;
}

export function flattenBlocks(blocks: Block[]): Block[] {
  const result: Block[] = [];
  function traverse(list: Block[]) {
    for (const b of list) {
      result.push(b);
      if (b.children && b.children.length > 0) {
        traverse(b.children);
      }
    }
  }
  traverse(blocks);
  return result;
}

export function flattenVisibleBlocks(blocks: Block[]): Block[] {
  const result: Block[] = [];
  function traverse(list: Block[]) {
    for (const b of list) {
      result.push(b);
      if (b.children && b.children.length > 0 && !b.collapsed) {
        traverse(b.children);
      }
    }
  }
  traverse(blocks);
  return result;
}

export function isCaretAtStart(el: HTMLElement): boolean {
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0) {
    const range = sel.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(el);
    preCaretRange.setEnd(range.startContainer, range.startOffset);
    return preCaretRange.toString().length === 0;
  }
  return false;
}

export function moveCaret(el: HTMLElement, toStart: boolean = false) {
  el.focus();
  const range = document.createRange();
  const sel = window.getSelection();
  if (sel) {
    range.selectNodeContents(el);
    range.collapse(toStart);
    sel.removeAllRanges();
    sel.addRange(range);
  }
}

export function extractLinks(text: string): { wiki: string[], at: string[] } {
  const wiki: string[] = [];
  const at: string[] = [];
  
  const wikiRegex = /\[\[(.*?)\]\]/g;
  let match;
  while ((match = wikiRegex.exec(text)) !== null) {
    if (match[1]) {
      wiki.push(match[1].trim());
    }
  }
  
  const atRegex = /@([a-zA-Z0-9\s-_]+?)(?=\s+(?:and|or|for|with|is|are|was|were|the|a|an|in|at|on|of|to|from|by|about|as)\s+|[\.,\?!\;:()]|$)/gi;
  while ((match = atRegex.exec(text)) !== null) {
    if (match[1]) {
      at.push(match[1].trim());
    }
  }
  
  return { wiki, at };
}

export function resolveNoteId(ref: string, allNotes: Note[]): string | null {
  const lowerRef = ref.toLowerCase().trim();
  for (const note of allNotes) {
    if (note.title.toLowerCase().trim() === lowerRef) {
      return note.id;
    }
  }
  for (const note of allNotes) {
    const slugTitle = note.title.toLowerCase().replace(/[^a-z0-9]/g, '');
    const slugRef = lowerRef.replace(/[^a-z0-9]/g, '');
    if (slugTitle === slugRef && slugTitle.length > 0) {
      return note.id;
    }
  }
  return null;
}

export function getBlocksText(blocks: Block[]): string {
  let text = '';
  for (const block of blocks) {
    text += ' ' + block.content;
    if (block.children && block.children.length > 0) {
      text += ' ' + getBlocksText(block.children);
    }
  }
  return text;
}

export function getReferencedNoteIds(note: Note, allNotes: Note[]): Set<string> {
  const referencedIds = new Set<string>();
  const text = getBlocksText(note.blocks || []);
  const { wiki, at } = extractLinks(text);
  
  for (const ref of [...wiki, ...at]) {
    const id = resolveNoteId(ref, allNotes);
    if (id) {
      referencedIds.add(id);
    } else {
      for (const n of allNotes) {
        if (n.title && ref.toLowerCase().startsWith(n.title.toLowerCase().trim())) {
          referencedIds.add(n.id);
        }
      }
    }
  }
  
  return referencedIds;
}

export function calculateSubGraphClosure(
  notes: Note[],
  startNotes: string | string[],
  boundary: { notebook?: string; tag?: string }
): { sharedIds: Set<string>; truncatedIds: Set<string> } {
  const sharedIds = new Set<string>();
  const truncatedIds = new Set<string>();
  
  const allowedNoteIds = new Set<string>();
  for (const n of notes) {
    if (boundary.notebook && n.nb === boundary.notebook) {
      allowedNoteIds.add(n.id);
    } else if (boundary.tag && n.tags.includes(boundary.tag)) {
      allowedNoteIds.add(n.id);
    }
  }
  
  const startIds = typeof startNotes === 'string' ? [startNotes] : startNotes;
  for (const sId of startIds) {
    allowedNoteIds.add(sId);
  }
  
  const visited = new Set<string>();
  const queue = [...startIds];
  
  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);
    
    sharedIds.add(currentId);
    
    const currentNote = notes.find(n => n.id === currentId);
    if (!currentNote) continue;
    
    const refIds = getReferencedNoteIds(currentNote, notes);
    for (const refId of refIds) {
      if (allowedNoteIds.has(refId)) {
        if (!visited.has(refId)) {
          queue.push(refId);
        }
      } else {
        truncatedIds.add(refId);
      }
    }
  }
  
  return { sharedIds, truncatedIds };
}

export function findNotebookForParent(parentId: string, folders: Folder[], notes: Note[]): string {
  let currentId: string | null = parentId;
  while (currentId) {
    const notebook = NBS.find(nb => nb.id === currentId);
    if (notebook) return notebook.id;
    const folder = folders.find(f => f.id === currentId);
    if (folder) {
      currentId = folder.parentId;
      continue;
    }
    const note = notes.find(n => n.id === currentId);
    if (note) {
      return note.nb;
    }
    break;
  }
  return 'design';
}

export function setEdBodyHtml(edBody: HTMLElement, newHtml: string) {
  if (!edBody) return;

  interface PreservedMedia {
    blockId: string;
    mediaEl: HTMLElement;
    currentTime?: number;
    paused?: boolean;
    volume?: number;
    muted?: boolean;
    src: string;
    tagName: string;
  }

  const preserved: PreservedMedia[] = [];

  const wrappers = edBody.querySelectorAll('.block-wrapper');
  wrappers.forEach(wrapper => {
    const blockId = (wrapper as HTMLElement).dataset.id;
    if (!blockId) return;

    const mediaNodes = wrapper.querySelectorAll('video, audio, iframe');
    mediaNodes.forEach(node => {
      const mediaEl = node as HTMLElement;
      const tagName = mediaEl.tagName ? mediaEl.tagName.toLowerCase() : '';
      const src = (mediaEl as any).src || mediaEl.getAttribute('src') || '';

      if (tagName === 'video' || tagName === 'audio') {
        const media = mediaEl as HTMLMediaElement;
        preserved.push({
          blockId,
          mediaEl,
          currentTime: media.currentTime,
          paused: media.paused,
          volume: media.volume,
          muted: media.muted,
          src,
          tagName
        });
      } else if (tagName === 'iframe') {
        preserved.push({
          blockId,
          mediaEl,
          src,
          tagName
        });
      }
    });
  });

  edBody.innerHTML = newHtml;

  preserved.forEach(item => {
    const newWrapper = edBody.querySelector(`[data-id="${item.blockId}"]`);
    if (!newWrapper) return;

    const newMediaNodes = newWrapper.querySelectorAll(item.tagName);
    let targetNewEl: Element | null = null;

    newMediaNodes.forEach(node => {
      const nSrc = (node as any).src || node.getAttribute('src') || '';
      if (nSrc === item.src || newMediaNodes.length === 1) {
        targetNewEl = node;
      }
    });

    if (targetNewEl) {
      (targetNewEl as Element).replaceWith(item.mediaEl);
      if (item.tagName === 'video' || item.tagName === 'audio') {
        const media = item.mediaEl as HTMLMediaElement;
        if (item.currentTime !== undefined && !isNaN(item.currentTime)) {
          try { media.currentTime = item.currentTime; } catch (e) {}
        }
        if (item.volume !== undefined) {
          try { media.volume = item.volume; } catch (e) {}
        }
        if (item.muted !== undefined) {
          try { media.muted = item.muted; } catch (e) {}
        }
        if (item.paused === false && typeof media.play === 'function') {
          try {
            const p = media.play();
            if (p && typeof p.catch === 'function') p.catch(() => {});
          } catch (e) {}
        }
      }
    }
  });
}


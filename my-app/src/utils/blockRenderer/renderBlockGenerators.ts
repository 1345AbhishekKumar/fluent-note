import type { Block, Note, BlockType } from '../../types';
import { esc } from '../stringHelpers';
import { renderLinksInContent } from './inlineParsers';

export const dragHandleSvg = '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="1.5" class="f"/><circle cx="9" cy="12" r="1.5" class="f"/><circle cx="9" cy="16" r="1.5" class="f"/><circle cx="15" cy="8" r="1.5" class="f"/><circle cx="15" cy="12" r="1.5" class="f"/><circle cx="15" cy="16" r="1.5" class="f"/></svg>';
export const addSvg = '<svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor"/></svg>';

export function getDragHandleHtml(blockId: string): string {
  return `<div class="block-actions-container">
    <button class="block-add-btn" data-id="${blockId}" contenteditable="false" title="Click to add a block below">${addSvg}</button>
    <div class="block-drag-handle" draggable="true">${dragHandleSvg}</div>
  </div>`;
}

export function renderCodeBlockHtml(
  block: Block,
  levelStyle: string,
  dragHandle: string,
  inlineBgStyle: string,
  inlineTextStyle: string,
  placeholder: string
): string {
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
    { val: 'rust', label: 'Rust' },
    { val: 'javascript', label: 'React (JSX)' },
    { val: 'typescript', label: 'React (TSX)' },
    { val: 'html', label: 'Vue' },
    { val: 'html', label: 'Angular' },
    { val: 'html', label: 'Svelte' },
    { val: 'c', label: 'C' },
    { val: 'csharp', label: 'C#' },
    { val: 'dart', label: 'Dart' },
    { val: 'docker', label: 'Docker' },
    { val: 'elixir', label: 'Elixir' },
    { val: 'erlang', label: 'Erlang' },
    { val: 'go', label: 'Go' },
    { val: 'graphql', label: 'GraphQL' },
    { val: 'groovy', label: 'Groovy' },
    { val: 'haskell', label: 'Haskell' },
    { val: 'kotlin', label: 'Kotlin' },
    { val: 'latex', label: 'LaTeX' },
    { val: 'lisp', label: 'Lisp' },
    { val: 'lua', label: 'Lua' },
    { val: 'markdown', label: 'Markdown' },
    { val: 'matlab', label: 'Matlab' },
    { val: 'nix', label: 'Nix' },
    { val: 'objectivec', label: 'Objective-C' },
    { val: 'ocaml', label: 'OCaml' },
    { val: 'php', label: 'PHP' },
    { val: 'powershell', label: 'PowerShell' },
    { val: 'ruby', label: 'Ruby' },
    { val: 'scala', label: 'Scala' },
    { val: 'swift', label: 'Swift' },
    { val: 'verilog', label: 'Verilog' },
    { val: 'vhdl', label: 'VHDL' },
    { val: 'xml', label: 'XML' },
    { val: 'yaml', label: 'YAML' }
  ];

  const currentOpt = langOptions.find(o => o.val === lang);
  const currentLabel = currentOpt ? currentOpt.label : lang.toUpperCase();

  return `<div class="block-wrapper block-code-wrapper ${fullWidthClass} ${wrapClass}" data-id="${block.id}" data-type="code" ${levelStyle}>
    ${dragHandle}
    <div class="block-code-wrap" ${inlineBgStyle}>
      <div class="block-code-header-premium">
        <div class="code-lang-container" data-id="${block.id}">
          <span class="code-lang-select-label">${currentLabel}</span>
          <span class="code-lang-arrow">▼</span>
        </div>
        <div class="code-controls-container">
          <button class="code-copy-btn-premium" data-id="${block.id}" title="Copy code">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          </button>
          <button class="code-more-btn-premium" data-id="${block.id}" title="More options">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1.5"></circle><circle cx="19" cy="12" r="1.5"></circle><circle cx="5" cy="12" r="1.5"></circle></svg>
          </button>
        </div>
      </div>
      <div class="block-text-field block-code-field" ${inlineTextStyle} contenteditable="true" spellcheck="false" data-ph="${placeholder}">${highlighted}</div>
    </div>
  </div>`;
}

export function renderMediaBlockHtml(block: Block, levelStyle: string, dragHandle: string): string {
  const type = block.type;
  if (type === 'image') {
    const widthStyle = block.columnWidth ? `width: ${block.columnWidth}%;` : '';
    const captionText = block.comment || '';
    const inner = block.url
      ? `<div class="image-node-container" style="${widthStyle}" data-id="${block.id}">
          <div class="image-node-toolbar" contenteditable="false">
            <button class="image-tb-btn img-align-left" data-id="${block.id}" data-align="left" title="Align Left"><svg viewBox="0 0 24 24"><line x1="17" y1="10" x2="3" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="17" y1="18" x2="3" y2="18"></line></svg></button>
            <button class="image-tb-btn img-align-center" data-id="${block.id}" data-align="center" title="Align Center"><svg viewBox="0 0 24 24"><line x1="18" y1="10" x2="6" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="18" y1="18" x2="6" y2="18"></line></svg></button>
            <button class="image-tb-btn img-align-right" data-id="${block.id}" data-align="right" title="Align Right"><svg viewBox="0 0 24 24"><line x1="21" y1="10" x2="7" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="21" y1="18" x2="7" y2="18"></line></svg></button>
            <button class="image-tb-btn img-replace" data-id="${block.id}" title="Replace Image"><svg viewBox="0 0 24 24"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path></svg></button>
            <button class="image-tb-btn img-delete" data-id="${block.id}" title="Delete Image"><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
          </div>
          <img class="block-media-img" src="${block.url}" alt="${esc(block.content || 'image')}" />
          <div class="image-resize-handle image-resize-left" data-id="${block.id}" data-dir="left"></div>
          <div class="image-resize-handle image-resize-right" data-id="${block.id}" data-dir="right"></div>
          <div class="image-caption-box" contenteditable="false">
            <input class="image-caption-input" type="text" data-id="${block.id}" placeholder="Write a caption..." value="${esc(captionText)}" />
          </div>
        </div>`
      : `<div class="block-media-placeholder" data-prompt="image" data-id="${block.id}">🖼 Click to add image</div>`;
    return `<div class="block-wrapper block-image-node-wrapper" data-id="${block.id}" data-type="image" ${levelStyle}>
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
    if (block.url) {
      if (block.bookmarkTitle) {
        const imageHtml = block.bookmarkImage
          ? `<div class="bookmark-image-container" style="background-image: url('${block.bookmarkImage}')"></div>`
          : '';
        const iconHtml = block.bookmarkIcon
          ? `<img class="bookmark-favicon" src="${block.bookmarkIcon}" alt="favicon" onerror="this.style.display='none'" />`
          : `<span class="bookmark-favicon-placeholder">🔖</span>`;
          
        return `<div class="block-wrapper" data-id="${block.id}" data-type="bookmark" ${levelStyle}>
          ${dragHandle}
          <div class="block-bookmark premium-bookmark">
            <a class="block-bookmark-link-premium" href="${block.url}" target="_blank" rel="noopener" title="Ctrl + Click to open link">
              ${imageHtml}
              <div class="bookmark-info-container">
                <div class="bookmark-header-row">
                  ${iconHtml}
                  <span class="bookmark-site-title">${esc(block.bookmarkTitle)}</span>
                </div>
                <p class="bookmark-desc">${esc(block.bookmarkDesc || 'No description available')}</p>
                <span class="bookmark-url-premium">${esc(block.url)}</span>
              </div>
            </a>
          </div>
        </div>`;
      } else {
        return `<div class="block-wrapper" data-id="${block.id}" data-type="bookmark" ${levelStyle}>
          ${dragHandle}
          <div class="block-bookmark">
            <a class="block-bookmark-link" href="${block.url}" target="_blank" rel="noopener" title="Ctrl + Click to open link">
              <span class="bookmark-icon">🔖</span>
              <span class="bookmark-text">${esc(block.content || block.url)}</span>
              <span class="bookmark-url">${esc(block.url)}</span>
            </a>
          </div>
        </div>`;
      }
    } else {
      return `<div class="block-wrapper" data-id="${block.id}" data-type="bookmark" ${levelStyle}>
        ${dragHandle}
        <div class="block-media-placeholder" data-prompt="bookmark" data-id="${block.id}">🔖 Add a web bookmark</div>
      </div>`;
    }
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
  return '';
}

export function renderMathBlockHtml(block: Block, levelStyle: string, dragHandle: string): string {
  let mathHtml = '';
  const isMath = block.type === 'math';
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

  return `<div class="block-wrapper" data-id="${block.id}" data-type="${block.type}" ${levelStyle}>
    ${dragHandle}
    <div class="block-math" data-id="${block.id}" style="cursor: pointer;">
      ${mathHtml}
    </div>
  </div>`;
}

export function renderTocBlockHtml(block: Block, levelStyle: string, dragHandle: string, rootBlocks?: Block[], blocks?: Block[]): string {
  const activeRoot = rootBlocks || blocks || [];
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

export function renderBreadcrumbBlockHtml(
  block: Block, levelStyle: string, dragHandle: string, contextInfo?: { note: Note; allNotes: Note[] }
): string {
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

export function renderSubpageBlockHtml(
  block: Block,
  levelStyle: string,
  dragHandle: string,
  contextInfo?: { note: Note; allNotes: Note[] }
): string {
  const childNoteId = block.url || '';
  const childNote = contextInfo?.allNotes.find(n => n.id === childNoteId);
  const title = childNote ? childNote.title : (block.content || 'Untitled');

  return `<div class="block-wrapper block-subpage-wrapper" data-id="${block.id}" data-type="subpage" ${levelStyle}>
    ${dragHandle}
    <div class="block-subpage-row" data-subpageid="${childNoteId}">
      <span class="subpage-icon">📄</span>
      <span class="subpage-title">${esc(title || 'Untitled')}</span>
    </div>
  </div>`;
}

export function renderSubfolderBlockHtml(
  block: Block,
  levelStyle: string,
  dragHandle: string
): string {
  const folderId = block.url || '';
  const folderName = block.content || 'Subfolder';

  return `<div class="block-wrapper block-subfolder-wrapper" data-id="${block.id}" data-type="subfolder" ${levelStyle}>
    ${dragHandle}
    <div class="block-subfolder-row" data-subfolderid="${folderId}">
      <span class="subfolder-icon">📁</span>
      <span class="subfolder-title">${esc(folderName)}</span>
    </div>
  </div>`;
}

export function renderMermaidBlockHtml(
  block: Block,
  levelStyle: string,
  dragHandle: string
): string {
  const mode = block.mermaidMode || 'split';
  const rawContent = block.content || `graph TD\n  A[Start] --> B{Is it working?}\n  B -->|Yes| C[Awesome!]\n  B -->|No| D[Debug]`;
  const escContent = esc(rawContent);

  const isDiagramVisible = mode === 'diagram' || mode === 'split';
  const isCodeVisible = mode === 'code' || mode === 'split';

  const codeDisplay = isCodeVisible ? '' : 'style="display:none;"';
  const diagramDisplay = isDiagramVisible ? '' : 'style="display:none;"';
  const splitClass = mode === 'split' ? 'is-split' : '';

  return `<div class="block-wrapper block-mermaid-wrapper ${splitClass}" data-id="${block.id}" data-type="mermaid" ${levelStyle}>
    ${dragHandle}
    <div class="mermaid-block-card">
      <div class="mermaid-header">
        <div class="mermaid-title"><span class="mermaid-icon">📊</span> Mermaid Diagram</div>
        <div class="mermaid-mode-toggle" data-id="${block.id}">
          <button class="mermaid-mode-btn ${mode === 'diagram' ? 'active' : ''}" data-mode="diagram" data-id="${block.id}">Diagram</button>
          <button class="mermaid-mode-btn ${mode === 'code' ? 'active' : ''}" data-mode="code" data-id="${block.id}">Code</button>
          <button class="mermaid-mode-btn ${mode === 'split' ? 'active' : ''}" data-mode="split" data-id="${block.id}">Split</button>
        </div>
        <div class="mermaid-actions">
          <button class="mermaid-copy-btn" data-id="${block.id}" title="Copy Code or SVG">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            <span>Copy</span>
          </button>
        </div>
      </div>
      <div class="mermaid-body">
        <div class="block-text-field block-code-field mermaid-code-field" ${codeDisplay} contenteditable="true" spellcheck="false" data-ph="Enter Mermaid syntax...">${escContent}</div>
        <div class="mermaid-diagram-container" ${diagramDisplay} data-id="${block.id}">
          <div class="mermaid-render-output" data-id="${block.id}"></div>
        </div>
      </div>
    </div>
  </div>`;
}

export function renderTableBlockHtml(
  block: Block,
  levelStyle: string,
  dragHandle: string
): string {
  let rows: string[][] = [];
  try {
    rows = JSON.parse(block.content);
  } catch (e) {
    rows = [['', ''], ['', '']];
  }

  let tableHtml = `<table class="block-table" style="border-collapse: collapse; margin-top: 4px; margin-bottom: 4px;"><tbody>`;
  for (let rIdx = 0; rIdx < rows.length; rIdx++) {
    tableHtml += `<tr data-row="${rIdx}">`;
    for (let cIdx = 0; cIdx < rows[rIdx].length; cIdx++) {
      const cellContent = rows[rIdx][cIdx] || '';
      tableHtml += `
        <td style="border: 1px solid var(--border); padding: 6px 10px; min-width: 100px; position: relative;" data-row="${rIdx}" data-col="${cIdx}">
          <div class="table-cell-field" contenteditable="true" spellcheck="false" data-ph="Cell..." style="outline: none; min-height: 20px; font-size: 13.5px; color: var(--text1);">${cellContent}</div>
        </td>`;
    }
    tableHtml += `</tr>`;
  }
  tableHtml += `</tbody></table>`;

  return `<div class="block-wrapper block-table-wrapper" data-id="${block.id}" data-type="table" ${levelStyle}>
    ${dragHandle}
    <div class="block-table-container" style="width: 100%; display: flex; flex-direction: column; overflow-x: auto; padding: 4px 0;">
      <div class="table-controls-premium" contenteditable="false" style="display: flex; gap: 8px; margin-bottom: 6px; font-size: 11px;">
        <button class="table-ctrl-btn add-row-btn" data-id="${block.id}">➕ Row</button>
        <button class="table-ctrl-btn add-col-btn" data-id="${block.id}">➕ Column</button>
        <button class="table-ctrl-btn del-row-btn" data-id="${block.id}">➖ Row</button>
        <button class="table-ctrl-btn del-col-btn" data-id="${block.id}">➖ Column</button>
      </div>
      ${tableHtml}
    </div>
  </div>`;
}



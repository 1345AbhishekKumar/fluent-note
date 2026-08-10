import type { Block, Note, BlockType } from '../types';
import { esc } from './stringHelpers';
import { htmlToBlocks, blocksToHtml } from './blockRenderer/blockConverters';
import { renderLinksInContent } from './blockRenderer/inlineParsers';
import { 
  getDragHandleHtml, renderCodeBlockHtml, renderMediaBlockHtml, renderMathBlockHtml, 
  renderTocBlockHtml, renderBreadcrumbBlockHtml, renderSubpageBlockHtml, renderSubfolderBlockHtml,
  renderMermaidBlockHtml
} from './blockRenderer/renderBlockGenerators';

export { htmlToBlocks, blocksToHtml, renderLinksInContent };

export function getPlaceholderForType(type: BlockType): string {
  const placeholderMap: Partial<Record<BlockType, string>> = {
    heading1: 'Heading 1', heading2: 'Heading 2', heading3: 'Heading 3',
    todo: 'To-do', bullet: 'Bullet item', numbered: 'Numbered item',
    quote: 'Quote…', toggle: 'Toggle heading…', toggle_h1: 'Toggle Heading 1…',
    toggle_h2: 'Toggle Heading 2…', toggle_h3: 'Toggle Heading 3…', code: '// code…',
    mermaid: 'Enter Mermaid syntax…'
  };
  return placeholderMap[type] ?? 'Start writing…';
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
    const contentHtml = renderLinksInContent(block.content || '', contextInfo?.allNotes);
    const placeholder = getPlaceholderForType(type);
    
    let inlineBgStyle = block.bgColor ? `style="background-color: ${block.bgColor};"` : '';
    let inlineTextStyle = block.textColor ? `style="color: ${block.textColor};"` : '';

    const checkedClass = (type === 'todo' && block.checked) ? 'checked' : '';

    const dragHandle = getDragHandleHtml(block.id);
    const levelStyle = `style="--level: ${level}"`;

    if (type === 'divider') {
      return `<div class="block-wrapper block-divider-wrapper" data-id="${block.id}" data-type="divider" ${levelStyle}>
        ${dragHandle}
        <hr class="block-divider" />
      </div>`;
    }

    if (type === 'column_list') {
      const colsHtml = (block.children && block.children.length > 0)
        ? renderBlockTree(block.children, level, rootBlocks || blocks, contextInfo)
        : '';
      return `<div class="block-wrapper block-column-list-wrapper" data-id="${block.id}" data-type="column_list" ${levelStyle}>
        <div class="block-main-row">
          ${dragHandle}
          <div class="block-column-list-container" style="display: flex; flex-direction: row; gap: 12px; width: 100%; align-items: stretch;">
            ${colsHtml}
          </div>
        </div>
      </div>`;
    }

    if (type === 'column') {
      const colWidthStyle = block.columnWidth ? `flex: ${block.columnWidth};` : 'flex: 1;';
      const colContentHtml = (block.children && block.children.length > 0)
        ? renderBlockTree(block.children, level, rootBlocks || blocks, contextInfo)
        : `<div class="block-children-container empty-column-dropzone" style="min-height: 24px;"></div>`;
      return `<div class="block-wrapper block-column-item" data-id="${block.id}" data-type="column" style="${colWidthStyle} min-width: 0;" ${levelStyle}>
        ${colContentHtml}
      </div>`;
    }

    if (type === 'subpage') {
      return renderSubpageBlockHtml(block, levelStyle, dragHandle, contextInfo);
    }

    if (type === 'subfolder') {
      return renderSubfolderBlockHtml(block, levelStyle, dragHandle);
    }

    if (type === 'mermaid') {
      return renderMermaidBlockHtml(block, levelStyle, dragHandle);
    }

    if (type === 'code') {
      return renderCodeBlockHtml(block, levelStyle, dragHandle, inlineBgStyle, inlineTextStyle, placeholder);
    }

    if (['image', 'video', 'audio', 'pdf', 'bookmark', 'file'].includes(type)) {
      return renderMediaBlockHtml(block, levelStyle, dragHandle);
    }

    if (type === 'equation' || type === 'math') {
      return renderMathBlockHtml(block, levelStyle, dragHandle);
    }

    if (type === 'toc') {
      return renderTocBlockHtml(block, levelStyle, dragHandle, rootBlocks, blocks);
    }

    if (type === 'breadcrumb') {
      return renderBreadcrumbBlockHtml(block, levelStyle, dragHandle, contextInfo);
    }

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

    if (type === 'toggle' || type === 'toggle_h1' || type === 'toggle_h2' || type === 'toggle_h3') {
      const isCollapsed = block.collapsed ? 'collapsed' : '';
      const toggleHeadClass = type === 'toggle_h1' ? 'toggle-h1' : type === 'toggle_h2' ? 'toggle-h2' : type === 'toggle_h3' ? 'toggle-h3' : '';
      const children = (!block.collapsed && block.children && block.children.length > 0)
        ? `<div class="block-children-container block-toggle-children">${renderBlockTree(block.children, level + 1, rootBlocks || blocks, contextInfo)}</div>`
        : (block.children && block.children.length > 0
            ? `<div class="block-children-container block-toggle-children" style="display:none">${renderBlockTree(block.children, level + 1, rootBlocks || blocks, contextInfo)}</div>`
            : `<div class="block-children-container block-toggle-children" style="${block.collapsed ? 'display:none' : ''}"></div>`);
      return `<div class="block-wrapper ${isCollapsed}" data-id="${block.id}" data-type="${type}" ${levelStyle}>
        <div class="block-main-row">
          ${dragHandle}
          <div class="block-content-container" ${inlineBgStyle}>
            <div class="block-list-marker-gutter">
              <button class="toggle-arrow-btn" data-id="${block.id}">▶</button>
            </div>
            <div class="block-text-field ${toggleHeadClass}" ${inlineTextStyle} contenteditable="true" spellcheck="false" data-ph="${placeholder}">${renderLinksInContent(block.content)}</div>
            ${commentHtml}
          </div>
        </div>
        ${children}
      </div>`;
    }

    const childrenHtml = (block.children && block.children.length > 0)
      ? `<div class="block-children-container">${renderBlockTree(block.children, level + 1, rootBlocks || blocks, contextInfo)}</div>`
      : `<div class="block-children-container"></div>`;

    if (type === 'callout') {
      const calloutIcon = block.icon || '💡';
      return `<div class="block-wrapper" data-id="${block.id}" data-type="callout" ${levelStyle} ${inlineBgStyle}>
        <div class="block-main-row">
          ${dragHandle}
          <div class="block-content-container" ${inlineTextStyle}>
            <div class="block-callout-box">
              <button class="callout-icon-btn" data-id="${block.id}" contenteditable="false">${calloutIcon}</button>
              <div class="block-text-field" contenteditable="true" spellcheck="true" data-ph="Callout text...">${renderLinksInContent(block.content)}</div>
              ${commentHtml}
            </div>
          </div>
        </div>
        ${childrenHtml}
      </div>`;
    }

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

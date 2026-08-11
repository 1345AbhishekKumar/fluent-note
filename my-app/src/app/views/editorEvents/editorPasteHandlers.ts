import type { AppContext } from '../../context';
import type { Block, BlockType } from '../../../types';
import { findBlockById, genId, esc, moveCaret } from '../../../utils';
import { saveAndSyncContent } from '../../../store';
import { rerenderNote } from './pickers/editorPopups';
import { pushToUndo } from './editorHistory';
import { parseClipboardContent } from './pasteParser';

export function isNonTextFieldBlock(t: string) {
  return ['divider', 'image', 'video', 'audio', 'pdf', 'bookmark', 'file', 'toc', 'breadcrumb', 'math', 'equation'].includes(t);
}

export function isContainerBlock(t: string) {
  return ['callout', 'quote', 'toggle', 'toggle_h1', 'toggle_h2', 'toggle_h3'].includes(t);
}

function insertHtmlAtCaret(html: string) {
  if (typeof document.execCommand === 'function') {
    document.execCommand('insertHTML', false, html);
  } else {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      const el = document.createElement('div');
      el.innerHTML = html;
      const frag = document.createDocumentFragment();
      let node;
      let lastNode;
      while ((node = el.firstChild)) {
        lastNode = frag.appendChild(node);
      }
      range.insertNode(frag);
      if (lastNode) {
        range.setStartAfter(lastNode);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  }
}

export function handleEditorPaste(ctx: AppContext, e: ClipboardEvent) {
  const clipboardData = e.clipboardData;
  if (!clipboardData) return;

  const files = clipboardData.files;
  if (files && files.length > 0) {
    e.preventDefault();
    const target = e.target as HTMLElement;
    const blockEl = target.closest('.block-wrapper') as HTMLElement;
    if (!blockEl) return;
    const blockId = blockEl.dataset.id!;
    const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
    if (!n) return;
    const match = findBlockById(n.blocks, blockId);
    if (!match) return;

    pushToUndo(ctx, n);

    const { parentList, index, block: currentBlock } = match;

    let insertIndex = index;
    let isFirst = true;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      let blockType: BlockType = 'file';
      if (file.type.startsWith('image/')) blockType = 'image';
      else if (file.type.startsWith('video/')) blockType = 'video';
      else if (file.type.startsWith('audio/')) blockType = 'audio';
      else if (file.type === 'application/pdf') blockType = 'pdf';

      const reader = new FileReader();
      reader.onload = (ev) => {
        const url = ev.target?.result as string;
        const newBlock: Block = {
          id: genId(),
          type: blockType,
          url,
          content: file.name,
          fileName: file.name,
          children: []
        };

        let blockToTrack = newBlock;
        if (isFirst && (currentBlock.type === 'paragraph' || currentBlock.type === 'bullet') && !currentBlock.content.trim()) {
          currentBlock.type = blockType;
          currentBlock.url = url;
          currentBlock.content = file.name;
          currentBlock.fileName = file.name;
          blockToTrack = currentBlock;
          isFirst = false;
        } else {
          parentList.splice(insertIndex + 1, 0, newBlock);
          insertIndex++;
        }

        const targetIndex = parentList.indexOf(blockToTrack);
        if (targetIndex !== -1) {
          const nextBlock = parentList[targetIndex + 1];
          if (!nextBlock || isNonTextFieldBlock(nextBlock.type)) {
            parentList.splice(targetIndex + 1, 0, {
              id: genId(),
              type: 'paragraph',
              content: '',
              children: []
            });
          }
        }

        rerenderNote(ctx, n);
      };
      reader.readAsDataURL(file);
    }
    return;
  }

  const pastedText = clipboardData.getData('text');
  const isUrl = /^(https?:\/\/[^\s]+)$/i.test(pastedText.trim());
  if (isUrl) {
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) {
      e.preventDefault();
      const range = selection.getRangeAt(0);
      const selectedHtml = range.toString();
      const linkHtml = `<a href="${pastedText.trim()}" target="_blank" style="color: var(--accent); text-decoration: underline;">${esc(selectedHtml)}</a>`;
      document.execCommand('insertHTML', false, linkHtml);
      
      const target = e.target as HTMLElement;
      const blockEl = target.closest('.block-wrapper') as HTMLElement;
      if (blockEl) {
        const blockId = blockEl.dataset.id!;
        const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
        if (n) {
          const match = findBlockById(n.blocks, blockId);
          if (match) {
            const textEl = blockEl.querySelector('.block-text-field') as HTMLElement;
            match.block.content = textEl.innerHTML;
            saveAndSyncContent();
            ctx.markSaving();
          }
        }
      }
      return;
    }
  }

  // Handle auto-detect format for standard pastes
  const htmlText = clipboardData.getData('text/html');
  if (!pastedText.trim() && !htmlText.trim()) return;

  e.preventDefault();

  const target = e.target as HTMLElement;
  const blockEl = target.closest('.block-wrapper') as HTMLElement;
  if (!blockEl) return;
  const blockId = blockEl.dataset.id!;
  const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
  if (!n) return;
  const match = findBlockById(n.blocks, blockId);
  if (!match) return;

  const pastedBlocks = parseClipboardContent(clipboardData);
  if (pastedBlocks.length === 0) return;

  pushToUndo(ctx, n);

  const { parentList, index, block: currentBlock } = match;

  const sel = window.getSelection();
  let caretOffset = (target.textContent || '').length;
  if (sel && sel.rangeCount > 0) {
    const range = sel.getRangeAt(0);
    const preRange = document.createRange();
    preRange.selectNodeContents(target);
    preRange.setEnd(range.startContainer, range.startOffset);
    caretOffset = preRange.toString().length;
  }

  const fullText = currentBlock.content || '';
  const textBefore = fullText.slice(0, caretOffset);
  const textAfter = fullText.slice(caretOffset);

  const isContainer = isContainerBlock(currentBlock.type);
  let focusId = '';

  if (isContainer) {
    // Paste inline joined by <br> for all blocks inside a container block (Callout, Quote, Toggle)
    const htmlToInsert = pastedBlocks.map((b, idx) => {
      let prefix = '';
      if (b.type === 'bullet') {
        prefix = '- ';
      } else if (b.type === 'numbered') {
        let num = 1;
        for (let i = idx - 1; i >= 0; i--) {
          if (pastedBlocks[i].type === 'numbered') num++;
          else break;
        }
        prefix = `${num}. `;
      } else if (b.type === 'todo') {
        prefix = b.checked ? '☑ ' : '☐ ';
      } else if (b.type === 'quote') {
        prefix = '> ';
      }
      return prefix + b.content;
    }).join('<br>');
    insertHtmlAtCaret(htmlToInsert);
    currentBlock.content = target.innerHTML;
    saveAndSyncContent();
    ctx.markSaving();
    return;
  }

  if (pastedBlocks.length === 1 && pastedBlocks[0].type === 'paragraph') {
    // Paste inline for a single paragraph block using insertHTML to preserve formatting
    const htmlToInsert = pastedBlocks[0].content;
    insertHtmlAtCaret(htmlToInsert);
    currentBlock.content = target.innerHTML;
    saveAndSyncContent();
    ctx.markSaving();
    return;
  } else if (!fullText.trim()) {
    // If the active block is empty, replace it with the first block
    const firstBlock = pastedBlocks[0];
    currentBlock.type = firstBlock.type;
    currentBlock.content = firstBlock.content;
    if (firstBlock.checked !== undefined) currentBlock.checked = firstBlock.checked;
    if (firstBlock.url !== undefined) currentBlock.url = firstBlock.url;
    if (firstBlock.language !== undefined) currentBlock.language = firstBlock.language;
    if (firstBlock.fileName !== undefined) currentBlock.fileName = firstBlock.fileName;
    if (firstBlock.mermaidMode !== undefined) currentBlock.mermaidMode = firstBlock.mermaidMode;

    const restBlocks = pastedBlocks.slice(1);
    if (restBlocks.length > 0) {
      parentList.splice(index + 1, 0, ...restBlocks);
    }
    focusId = pastedBlocks[pastedBlocks.length - 1].id;
  } else {
    // Split the current block at caret
    currentBlock.content = textBefore;

    const postBlock: Block = {
      id: genId(),
      type: 'paragraph',
      content: textAfter,
      children: []
    };

    const insertBlocks = [...pastedBlocks, postBlock];
    parentList.splice(index + 1, 0, ...insertBlocks);
    focusId = textAfter.length > 0 ? postBlock.id : pastedBlocks[pastedBlocks.length - 1].id;
  }

  rerenderNote(ctx, n);

  setTimeout(() => {
    const field = ctx.elements.edBody.querySelector(`[data-id="${focusId}"] .block-text-field`) as HTMLElement;
    if (field) {
      moveCaret(field, false);
    }
  }, 50);
}

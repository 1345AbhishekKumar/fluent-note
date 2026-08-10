import type { AppContext } from '../../context';
import type { Block, BlockType, Note } from '../../../types';
import { findBlockById, flattenVisibleBlocks, getBlockLevel, isCaretAtStart, isCaretAtEnd, moveCaret, genId, isParentEligibleBlock } from '../../../utils';
import { saveAndSyncContent } from '../../../store';
import { rerenderNote } from './pickers/editorPopups';

export const isToggleType = (t: string) => ['toggle', 'toggle_h1', 'toggle_h2', 'toggle_h3'].includes(t);
export const isContainerBlock = (t: string) => ['callout', 'quote', 'toggle', 'toggle_h1', 'toggle_h2', 'toggle_h3'].includes(t);
export const isNonTextFieldBlock = (t: string) => ['divider', 'image', 'video', 'audio', 'pdf', 'bookmark', 'file', 'subpage', 'toc', 'breadcrumb', 'math', 'equation'].includes(t);

export function findParentContainer(
  blocks: Block[], 
  targetId: string
): { parentList: Block[]; parentBlock: Block | null; index: number } | null {
  for (let i = 0; i < blocks.length; i++) {
    if (blocks[i].id === targetId) {
      return { parentList: blocks, parentBlock: null, index: i };
    }
    if (blocks[i].children && blocks[i].children.length > 0) {
      const match = findParentContainer(blocks[i].children, targetId);
      if (match) {
        if (match.parentBlock === null) {
          return { parentList: blocks[i].children, parentBlock: blocks[i], index: match.index };
        }
        return match;
      }
    }
  }
  return null;
}

function insertTextAtCaret(ctx: AppContext, el: HTMLElement, val: string) {
  el.focus();
  try {
    if (document.execCommand && document.execCommand('insertText', false, val)) {
      return;
    }
  } catch (_) {}

  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0) {
    const range = sel.getRangeAt(0);
    range.deleteContents();
    const node = document.createTextNode(val);
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  } else {
    el.textContent = (el.textContent || '') + val;
  }
}

export function handleBlockEnterKey(
  ctx: AppContext,
  e: KeyboardEvent,
  target: HTMLElement,
  n: Note,
  match: { parentList: Block[]; index: number; block: Block }
) {
  e.preventDefault();
  const { parentList, index, block: currentBlock } = match;
  const currentType = currentBlock.type;
  const listLikeTypes: BlockType[] = ['bullet', 'numbered', 'todo'];
  const isListLike = listLikeTypes.includes(currentType);

  const sel = window.getSelection();
  let caretOffset = (target.textContent || '').length;
  if (sel && sel.rangeCount > 0) {
    const range = sel.getRangeAt(0);
    const preRange = document.createRange();
    preRange.selectNodeContents(target);
    preRange.setEnd(range.startContainer, range.startOffset);
    caretOffset = preRange.toString().length;
  }
  const fullText = currentBlock.content;
  const textBefore = fullText.slice(0, caretOffset);
  const textAfter = fullText.slice(caretOffset);

  if (e.shiftKey) {
    insertTextAtCaret(ctx, target, '\n');
    currentBlock.content = target.textContent || '';
    saveAndSyncContent();
    ctx.markSaving();
    return;
  }

  if (currentType === 'code' || currentType === 'mermaid') {
    insertTextAtCaret(ctx, target, '\n');
    currentBlock.content = target.textContent || '';
    saveAndSyncContent();
    ctx.markSaving();
    return;
  }

  // Handle empty enter inside a container or nested child -> outdent
  if (parentList !== n.blocks && fullText.trim() === '') {
    const currentContainer = findParentContainer(n.blocks, currentBlock.id);
    if (currentContainer && currentContainer.parentBlock) {
      const parentContainer = findParentContainer(n.blocks, currentContainer.parentBlock.id);
      if (parentContainer) {
        currentContainer.parentList.splice(currentContainer.index, 1);
        parentContainer.parentList.splice(parentContainer.index + 1, 0, currentBlock);
        currentBlock.type = 'paragraph';
        rerenderNote(ctx, n);
        saveAndSyncContent();
        ctx.markSaving();
        const field = ctx.elements.edBody.querySelector(`[data-id="${currentBlock.id}"] .block-text-field`) as HTMLElement;
        if (field) field.focus();
        return;
      }
    }
  }

  // Handle Enter inside Container Blocks (Toggle, Callout, Quote)
  if (isContainerBlock(currentType)) {
    currentBlock.content = textBefore;
    if (isToggleType(currentType) && currentBlock.collapsed) {
      currentBlock.collapsed = false;
    }
    if (!currentBlock.children) currentBlock.children = [];
    const newBlockId = genId();
    const newBlock: Block = { id: newBlockId, type: 'paragraph', content: textAfter, children: [] };
    currentBlock.children.unshift(newBlock);
    rerenderNote(ctx, n);
    saveAndSyncContent();
    ctx.markSaving();
    const newField = ctx.elements.edBody.querySelector(`[data-id="${newBlockId}"] .block-text-field`) as HTMLElement;
    if (newField) newField.focus();
    return;
  }

  if (isListLike && fullText.trim() === '') {
    currentBlock.type = 'paragraph';
    currentBlock.content = '';
    rerenderNote(ctx, n);
    saveAndSyncContent();
    ctx.markSaving();
    const field = ctx.elements.edBody.querySelector(`[data-id="${currentBlock.id}"] .block-text-field`) as HTMLElement;
    if (field) field.focus();
    return;
  }

  currentBlock.content = textBefore;
  const newBlockId = genId();
  const newBlock: Block = {
    id: newBlockId,
    type: isListLike ? currentType : 'paragraph',
    content: textAfter,
    children: []
  };
  if (currentType === 'todo') {
    newBlock.checked = false;
  }
  parentList.splice(index + 1, 0, newBlock);

  rerenderNote(ctx, n);
  saveAndSyncContent();
  ctx.markSaving();
  const newField = ctx.elements.edBody.querySelector(`[data-id="${newBlockId}"] .block-text-field`) as HTMLElement;
  if (newField) {
    moveCaret(newField, true);
  }
}

export function selectBlockElement(ctx: AppContext, blockId: string) {
  document.querySelectorAll('.block-wrapper.selected-block').forEach(el => el.classList.remove('selected-block'));
  const targetEl = ctx.elements.edBody.querySelector(`[data-id="${blockId}"]`) as HTMLElement;
  if (targetEl) {
    targetEl.classList.add('selected-block');
    (document.activeElement as HTMLElement)?.blur();
  }
}

export function handleBlockBackspaceKey(
  ctx: AppContext,
  e: KeyboardEvent,
  target: HTMLElement,
  n: Note,
  match: { parentList: Block[]; index: number; block: Block },
  blockId: string
) {
  if (!isCaretAtStart(target)) return;

  e.preventDefault();
  const flat = flattenVisibleBlocks(n.blocks);
  const flatIndex = flat.findIndex(b => b.id === blockId);

  if (flatIndex > 0) {
    const prevBlock = flat[flatIndex - 1];

    if (isNonTextFieldBlock(prevBlock.type)) {
      const prevBlockMatch = findBlockById(n.blocks, prevBlock.id);
      if (prevBlockMatch) {
        prevBlockMatch.parentList.splice(prevBlockMatch.index, 1);
        rerenderNote(ctx, n);
        const field = ctx.elements.edBody.querySelector(`[data-id="${blockId}"] .block-text-field`) as HTMLElement;
        if (field) moveCaret(field, true);
      }
      return;
    }

    const originalLength = prevBlock.content.length;
    prevBlock.content += match.block.content;

    if (match.block.children && match.block.children.length > 0) {
      prevBlock.children = [...prevBlock.children, ...match.block.children];
    }

    const parentIndex = match.parentList.indexOf(match.block);
    if (parentIndex !== -1) {
      match.parentList.splice(parentIndex, 1);
    }

    rerenderNote(ctx, n);
    const prevField = ctx.elements.edBody.querySelector(`[data-id="${prevBlock.id}"] .block-text-field`) as HTMLElement;
    if (prevField) {
      prevField.focus();
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = document.createRange();
        let textNode = prevField.firstChild;
        if (!textNode) {
          textNode = prevField;
        }
        range.setStart(textNode, originalLength);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
  }
}

export function handleBlockDeleteKey(
  ctx: AppContext,
  e: KeyboardEvent,
  target: HTMLElement,
  n: Note,
  match: { parentList: Block[]; index: number; block: Block },
  blockId: string
) {
  if (!isCaretAtEnd(target)) return;

  e.preventDefault();
  const flat = flattenVisibleBlocks(n.blocks);
  const flatIndex = flat.findIndex(b => b.id === blockId);

  if (flatIndex < flat.length - 1) {
    const nextBlock = flat[flatIndex + 1];

    if (isNonTextFieldBlock(nextBlock.type)) {
      const nextBlockMatch = findBlockById(n.blocks, nextBlock.id);
      if (nextBlockMatch) {
        nextBlockMatch.parentList.splice(nextBlockMatch.index, 1);
        rerenderNote(ctx, n);
        const field = ctx.elements.edBody.querySelector(`[data-id="${blockId}"] .block-text-field`) as HTMLElement;
        if (field) moveCaret(field, false);
      }
      return;
    }

    const originalLength = match.block.content.length;
    match.block.content += nextBlock.content;

    if (nextBlock.children && nextBlock.children.length > 0) {
      match.block.children = [...(match.block.children || []), ...nextBlock.children];
    }

    const nextBlockMatch = findBlockById(n.blocks, nextBlock.id);
    if (nextBlockMatch) {
      const nextParentIndex = nextBlockMatch.parentList.indexOf(nextBlockMatch.block);
      if (nextParentIndex !== -1) {
        nextBlockMatch.parentList.splice(nextParentIndex, 1);
      }
    }

    rerenderNote(ctx, n);
    const currField = ctx.elements.edBody.querySelector(`[data-id="${blockId}"] .block-text-field`) as HTMLElement;
    if (currField) {
      currField.focus();
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = document.createRange();
        let textNode = currField.firstChild;
        if (!textNode) {
          textNode = currField;
        }
        range.setStart(textNode, originalLength);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
  }
}


export function handleBlockArrowUp(ctx: AppContext, e: KeyboardEvent, n: Note, blockId: string) {
  const flat = flattenVisibleBlocks(n.blocks);
  const flatIndex = flat.findIndex(b => b.id === blockId);
  for (let i = flatIndex - 1; i >= 0; i--) {
    const prevBlock = flat[i];
    if (!isNonTextFieldBlock(prevBlock.type)) {
      e.preventDefault();
      const prevField = ctx.elements.edBody.querySelector(`[data-id="${prevBlock.id}"] .block-text-field`) as HTMLElement;
      if (prevField) {
        moveCaret(prevField, false);
        break;
      }
    }
  }
}

export function handleBlockArrowDown(ctx: AppContext, e: KeyboardEvent, n: Note, blockId: string) {
  const flat = flattenVisibleBlocks(n.blocks);
  const flatIndex = flat.findIndex(b => b.id === blockId);
  for (let i = flatIndex + 1; i < flat.length; i++) {
    const nextBlock = flat[i];
    if (!isNonTextFieldBlock(nextBlock.type)) {
      e.preventDefault();
      const nextField = ctx.elements.edBody.querySelector(`[data-id="${nextBlock.id}"] .block-text-field`) as HTMLElement;
      if (nextField) {
        moveCaret(nextField, true);
        break;
      }
    }
  }
}

export function handleBlockTabKey(
  ctx: AppContext,
  e: KeyboardEvent,
  n: Note,
  match: { parentList: Block[]; index: number; block: Block },
  blockId: string
) {
  e.preventDefault();
  const target = e.target as HTMLElement;

  if (match.block.type === 'code' || match.block.type === 'mermaid') {
    insertTextAtCaret(ctx, target, '  ');
    match.block.content = target.textContent || '';
    saveAndSyncContent();
    ctx.markSaving();
    return;
  }

  const { parentList, index } = match;
  const level = getBlockLevel(n.blocks, blockId);

  if (e.shiftKey) {
    if (level > 0) {
      const currentContainer = findParentContainer(n.blocks, blockId);
      if (currentContainer && currentContainer.parentBlock) {
        const parentContainer = findParentContainer(n.blocks, currentContainer.parentBlock.id);
        if (parentContainer) {
          currentContainer.parentList.splice(currentContainer.index, 1);
          parentContainer.parentList.splice(parentContainer.index + 1, 0, match.block);

          rerenderNote(ctx, n);
          saveAndSyncContent();
          ctx.markSaving();

          const field = ctx.elements.edBody.querySelector(`[data-id="${blockId}"] .block-text-field`) as HTMLElement;
          if (field) field.focus();
        }
      }
    }
  } else {
    if (index > 0) {
      const precedingSibling = parentList[index - 1];
      if (isParentEligibleBlock(precedingSibling.type)) {
        parentList.splice(index, 1);
        if (!precedingSibling.children) precedingSibling.children = [];
        precedingSibling.children.push(match.block);
        if (isToggleType(precedingSibling.type) && precedingSibling.collapsed) {
          precedingSibling.collapsed = false;
        }

        rerenderNote(ctx, n);
        saveAndSyncContent();
        ctx.markSaving();

        const field = ctx.elements.edBody.querySelector(`[data-id="${blockId}"] .block-text-field`) as HTMLElement;
        if (field) field.focus();
      }
    }
  }
}

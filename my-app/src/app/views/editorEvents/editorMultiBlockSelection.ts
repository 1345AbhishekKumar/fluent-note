import type { AppContext } from '../../context';
import type { Note } from '../../../types';
import { findBlockById, flattenVisibleBlocks, setCaretAtOffset } from '../../../utils';
import { rerenderNote } from './pickers/editorPopups';
import { pushToUndo } from './editorHistory';

function getBlockWrapperFromNode(node: Node, offset: number, isStart: boolean): HTMLElement | null {
  if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as HTMLElement;
    const wrapper = el.closest('.block-wrapper') as HTMLElement | null;
    if (wrapper) return wrapper;

    if (el.childNodes.length > 0) {
      const childIdx = Math.min(Math.max(0, isStart ? offset : offset - 1), el.childNodes.length - 1);
      const childNode = el.childNodes[childIdx];
      if (childNode) {
        const childEl = childNode.nodeType === Node.ELEMENT_NODE
          ? (childNode as HTMLElement)
          : childNode.parentElement;
        const childWrapper = childEl?.closest('.block-wrapper') as HTMLElement | null;
        if (childWrapper) return childWrapper;
      }
    }
  } else if (node.parentElement) {
    return node.parentElement.closest('.block-wrapper') as HTMLElement | null;
  }
  return null;
}

export function handleMultiBlockTextDeletion(ctx: AppContext, e: KeyboardEvent, n: Note): boolean {
  if (e.key !== 'Backspace' && e.key !== 'Delete') return false;

  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return false;

  const range = sel.getRangeAt(0);

  const startWrapper = getBlockWrapperFromNode(range.startContainer, range.startOffset, true);
  const endWrapper = getBlockWrapperFromNode(range.endContainer, range.endOffset, false);

  if (!startWrapper || !endWrapper || startWrapper === endWrapper) {
    return false;
  }

  const startBlockId = startWrapper.dataset.id;
  const endBlockId = endWrapper.dataset.id;
  if (!startBlockId || !endBlockId || startBlockId === endBlockId) {
    return false;
  }

  const flat = flattenVisibleBlocks(n.blocks);
  const startIndex = flat.findIndex(b => b.id === startBlockId);
  const endIndex = flat.findIndex(b => b.id === endBlockId);

  if (startIndex === -1 || endIndex === -1 || startIndex >= endIndex) {
    return false;
  }

  e.preventDefault();
  pushToUndo(ctx, n);

  const startMatch = findBlockById(n.blocks, startBlockId);
  const endMatch = findBlockById(n.blocks, endBlockId);
  if (!startMatch || !endMatch) return false;

  const startField = startWrapper.querySelector('.block-text-field') as HTMLElement | null;
  let startCharOffset = 0;
  if (startField) {
    const startRange = document.createRange();
    startRange.selectNodeContents(startField);
    try {
      startRange.setEnd(range.startContainer, range.startOffset);
      startCharOffset = startRange.toString().length;
    } catch {
      startCharOffset = startMatch.block.content.length;
    }
  }

  const endField = endWrapper.querySelector('.block-text-field') as HTMLElement | null;
  let endCharOffset = 0;
  if (endField) {
    const endRange = document.createRange();
    endRange.selectNodeContents(endField);
    try {
      endRange.setEnd(range.endContainer, range.endOffset);
      endCharOffset = endRange.toString().length;
    } catch {
      endCharOffset = 0;
    }
  }

  const startPrefix = startMatch.block.content.slice(0, startCharOffset);
  const endSuffix = endMatch.block.content.slice(endCharOffset);

  startMatch.block.content = startPrefix + endSuffix;

  if (endMatch.block.children && endMatch.block.children.length > 0) {
    startMatch.block.children = [...(startMatch.block.children || []), ...endMatch.block.children];
  }

  const idsToRemove = flat.slice(startIndex + 1, endIndex + 1).map(b => b.id);
  for (const bId of idsToRemove) {
    const matchToRemove = findBlockById(n.blocks, bId);
    if (matchToRemove) {
      const idx = matchToRemove.parentList.indexOf(matchToRemove.block);
      if (idx !== -1) {
        matchToRemove.parentList.splice(idx, 1);
      }
    }
  }

  rerenderNote(ctx, n);

  const newStartField = ctx.elements.edBody.querySelector(`[data-id="${startBlockId}"] .block-text-field`) as HTMLElement | null;
  if (newStartField) {
    setCaretAtOffset(newStartField, startPrefix.length);
  }

  return true;
}

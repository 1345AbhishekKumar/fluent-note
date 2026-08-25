import type { AppContext } from '../../context';
import type { Block } from '../../../types';
import { findBlockById, genId, moveCaret, flattenVisibleBlocks } from '../../../utils';
import { handleEditorPaste } from './editorPasteHandlers';
import { 
  handleCodeBlockControlsClick, handleCodeFieldFocusIn, handleCodeFieldFocusOut 
} from './editorCodeBlockEvents';
import { 
  handleCheckboxChange, handleDocumentMouseDown, handleEditorBodyClick, handleBlockSelectionClick, focusOrCreateBottomBlock
} from './editorClickDelegation';
import { handleDragHandleClick } from './editorDragFlyout';
import { rerenderNote, rerenderSelectionStyles } from './pickers/editorPopups';

export function initEditorClickHandlers(ctx: AppContext) {
  ctx.elements.edBody.addEventListener('paste', e => handleEditorPaste(ctx, e));

  ctx.elements.edBody.addEventListener('change', e => handleCheckboxChange(ctx, e));

  document.addEventListener('mousedown', e => handleDocumentMouseDown(ctx, e));

  let isMouseDownInEditor = false;
  let dragStartBlockId: string | null = null;
  let isMultiBlockDragSelecting = false;

  ctx.elements.edBody.addEventListener('mousedown', e => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('button, input, textarea, a, .block-drag-handle, .block-add-btn, .table-cell-field, .mermaid-code-field, .html-code-field, .flyout')) {
      return;
    }
    const wrapper = target.closest('.block-wrapper') as HTMLElement | null;
    if (wrapper && wrapper.dataset.id) {
      isMouseDownInEditor = true;
      dragStartBlockId = wrapper.dataset.id;
      isMultiBlockDragSelecting = false;
    }
  });

  document.addEventListener('mousemove', e => {
    if (!isMouseDownInEditor || !dragStartBlockId) return;
    if (e.buttons !== 1) {
      isMouseDownInEditor = false;
      dragStartBlockId = null;
      isMultiBlockDragSelecting = false;
      return;
    }
    const target = e.target as HTMLElement;
    const currentWrapper = target.closest?.('.block-wrapper') as HTMLElement | null;
    if (!currentWrapper || !currentWrapper.dataset.id) return;
    const currentBlockId = currentWrapper.dataset.id;

    if (currentBlockId !== dragStartBlockId) {
      if (!isMultiBlockDragSelecting) {
        isMultiBlockDragSelecting = true;
        (document.activeElement as HTMLElement)?.blur();
        window.getSelection()?.removeAllRanges();
      }

      const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
      if (n) {
        const flat = flattenVisibleBlocks(n.blocks);
        const startIdx = flat.findIndex(b => b.id === dragStartBlockId);
        const curIdx = flat.findIndex(b => b.id === currentBlockId);
        if (startIdx !== -1 && curIdx !== -1) {
          const min = Math.min(startIdx, curIdx);
          const max = Math.max(startIdx, curIdx);
          const rangeIds = flat.slice(min, max + 1).map(b => b.id);
          ctx.st.selectedBlockIds = new Set(rangeIds);
          rerenderSelectionStyles(ctx);
          window.getSelection()?.removeAllRanges();
        }
      }
    }
  });

  document.addEventListener('mouseup', () => {
    if (isMultiBlockDragSelecting) {
      window.getSelection()?.removeAllRanges();
      isMultiBlockDragSelecting = false;
    }
    isMouseDownInEditor = false;
    dragStartBlockId = null;
  });

  let lastFlyoutTime = 0;

  const handleBlockActionClick = (e: MouseEvent): boolean => {
    const target = e.target as HTMLElement;

    // 1. Plus Add Block button
    const addBtn = target.closest('.block-add-btn') as HTMLElement;
    if (addBtn) {
      e.preventDefault();
      e.stopPropagation();
      const blockEl = addBtn.closest('.block-wrapper') as HTMLElement;
      if (!blockEl) return true;
      const bId = blockEl.dataset.id!;
      const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
      if (!n) return true;
      const match = findBlockById(n.blocks, bId);
      if (match) {
        const { parentList, index } = match;
        const newBlockId = genId();
        const newBlock: Block = { id: newBlockId, type: 'paragraph', content: '', children: [] };
        parentList.splice(index + 1, 0, newBlock);
        rerenderNote(ctx, n);
        setTimeout(() => {
          const newField = ctx.elements.edBody.querySelector(`[data-id="${newBlockId}"] .block-text-field`) as HTMLElement;
          if (newField) moveCaret(newField);
        }, 15);
      }
      return true;
    }

    // 2. Drag / Menu Handle (6 dots)
    const dragHandle = (target.closest('.block-drag-handle') || 
      (target.classList.contains('block-actions-container') && !target.closest('.block-add-btn')
        ? target.querySelector('.block-drag-handle')
        : null)) as HTMLElement;

    if (dragHandle) {
      e.preventDefault();
      e.stopPropagation();
      const now = Date.now();
      if (now - lastFlyoutTime > 300) {
        lastFlyoutTime = now;
        handleDragHandleClick(ctx, e, dragHandle);
      }
      return true;
    }

    return false;
  };

  ctx.elements.edBody.addEventListener('click', e => {
    if (handleBlockActionClick(e)) return;
    handleEditorBodyClick(ctx, e);
    handleBlockSelectionClick(ctx, e);
    handleCodeBlockControlsClick(ctx, e, e.target as HTMLElement);
  });

  ctx.elements.edBody.addEventListener('mouseup', e => {
    const target = e.target as HTMLElement;
    const dragHandle = target.closest('.block-drag-handle') as HTMLElement;
    if (dragHandle) {
      e.preventDefault();
      e.stopPropagation();
      const now = Date.now();
      if (now - lastFlyoutTime > 300) {
        lastFlyoutTime = now;
        handleDragHandleClick(ctx, e, dragHandle);
      }
    }
  });

  const handleEmptyClick = (e: Event) => {
    const target = e.target as HTMLElement;
    if (!target.closest('.block-wrapper') && 
        !target.closest('.block-actions-container') &&
        !target.closest('.ed-title') && 
        !target.closest('.ed-meta') && 
        !target.closest('.academic-metadata') && 
        !target.closest('.backlinks-panel') &&
        !target.closest('.flyout') &&
        !target.closest('.slash-menu')) {
      focusOrCreateBottomBlock(ctx);
    }
  };

  const edScroll = ctx.root.querySelector('.ed-scroll');
  if (edScroll) {
    edScroll.addEventListener('click', handleEmptyClick);
    edScroll.addEventListener('dblclick', handleEmptyClick);
  }

  ctx.elements.edBody.addEventListener('focusin', e => handleCodeFieldFocusIn(ctx, e));

  ctx.elements.edBody.addEventListener('focusout', e => handleCodeFieldFocusOut(ctx, e));
}

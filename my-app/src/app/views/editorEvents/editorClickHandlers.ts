import type { AppContext } from '../../context';
import { handleEditorPaste } from './editorPasteHandlers';
import { 
  handleCodeBlockControlsClick, handleCodeFieldFocusIn, handleCodeFieldFocusOut 
} from './editorCodeBlockEvents';
import { 
  handleCheckboxChange, handleDocumentMouseDown, handleEditorBodyClick, handleBlockSelectionClick, focusOrCreateBottomBlock
} from './editorClickDelegation';

export function initEditorClickHandlers(ctx: AppContext) {
  ctx.elements.edBody.addEventListener('paste', e => handleEditorPaste(ctx, e));

  ctx.elements.edBody.addEventListener('change', e => handleCheckboxChange(ctx, e));

  document.addEventListener('mousedown', e => handleDocumentMouseDown(ctx, e));

  ctx.elements.edBody.addEventListener('click', e => {
    handleEditorBodyClick(ctx, e);
    handleBlockSelectionClick(ctx, e);
    handleCodeBlockControlsClick(ctx, e, e.target as HTMLElement);
  });

  const handleEmptyClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest('.block-wrapper') && 
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

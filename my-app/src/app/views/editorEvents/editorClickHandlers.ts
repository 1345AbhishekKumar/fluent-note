import type { AppContext } from '../../context';
import { handleEditorPaste } from './editorPasteHandlers';
import { 
  handleCodeBlockControlsClick, handleCodeFieldFocusIn, handleCodeFieldFocusOut 
} from './editorCodeBlockEvents';
import { 
  handleCheckboxChange, handleDocumentMouseDown, handleEditorBodyClick, handleBlockSelectionClick 
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

  ctx.elements.edBody.addEventListener('focusin', e => handleCodeFieldFocusIn(ctx, e));

  ctx.elements.edBody.addEventListener('focusout', e => handleCodeFieldFocusOut(ctx, e));
}

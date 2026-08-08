import type { AppContext } from '../context';
import type { Block } from '../../types';
import { duplicateBlockWithNewIds, duplicateBlocksWithNewIds } from './editorEvents/editorHelpers';
import { initEditorKeyHandlers } from './editorEvents/editorKeyHandlers';
import { initEditorClickHandlers } from './editorEvents/editorClickHandlers';

export { duplicateBlockWithNewIds, duplicateBlocksWithNewIds };

export function initEditorKeyEvents(ctx: AppContext) {
  initEditorKeyHandlers(ctx);
  initEditorClickHandlers(ctx);
}
